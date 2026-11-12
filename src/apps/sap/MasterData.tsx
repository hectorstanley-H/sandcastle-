/** Create Purchase Order (Advanced) + Create Business Partner (supplier role). */
import { useState, type ReactNode } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { db, useCollection } from '@/db/db'
import { isoDate } from '@/data/time'
import { Btn, Field, Input, Select, MessageStrip, Dialog, Table, usd, PageHeader, Footer, Card, Text } from './ui'
import { CATEGORY_GL, COST_CENTERS, GL_ACCOUNTS, nextId, round2 } from './gl'
import type { Go } from './index'

type Item = { material: string; description: string; qty: string; unit: string; price: string; glAccount: string; costCenter: string }
const num = (s: string) => Number(String(s).replace(/,/g, '')) || 0
/** POs above this net value need release (approval) before they are sent */
export const PO_RELEASE_LIMIT = 25000

export function CreatePo({ go, copyFrom }: { go: Go; copyFrom?: string }) {
  const suppliers = useCollection<any>('sap.suppliers')
  const src = copyFrom ? db.find<any>('sap.pos', copyFrom) : undefined
  const [supplierId, setSupplierId] = useState<string>(src?.supplierId ?? '')
  const supplier = suppliers.find((s) => s.id === supplierId)
  const defGl = (s?: any) => CATEGORY_GL[s?.category] ?? '611000'
  const blank = (): Item => ({ material: '', description: '', qty: '1', unit: 'EA', price: '', glAccount: defGl(supplier), costCenter: '10101301' })
  const [purchGroup, setPurchGroup] = useState(src?.purchGroup ?? '001 — Indirect Spend')
  const [delivery, setDelivery] = useState(isoDate(new Date(Date.now() + 14 * 86400000)))
  const [plant, setPlant] = useState(src?.plant ?? '1010 — Boston HQ')
  const [items, setItems] = useState<Item[]>(
    src
      ? src.items.map((it: any) => ({ material: it.material, description: it.description, qty: String(it.qty), unit: it.unit, price: String(it.price), glAccount: it.glAccount, costCenter: it.costCenter }))
      : [blank()],
  )
  const [msg, setMsg] = useState<string | null>(null)
  const [done, setDone] = useState<{ id: string; status: string } | null>(null)
  const net = round2(items.reduce((t, i) => t + num(i.qty) * num(i.price), 0))
  const set = (i: number, p: Partial<Item>) => setItems((c) => c.map((x, j) => (j === i ? { ...x, ...p } : x)))

  const order = () => {
    if (!supplier) return setMsg('Enter a supplier')
    if (supplier.blocked) return setMsg(`Supplier ${supplier.id} is blocked for purchasing`)
    const valid = items.filter((i) => i.description.trim() && num(i.qty) > 0 && num(i.price) > 0)
    if (!valid.length) return setMsg('Enter at least one item with a short text, quantity and net price')
    const id = nextId('sap.pos', 4500018400)
    const status = net > PO_RELEASE_LIMIT ? 'In Approval' : 'Sent'
    db.insert(
      'sap.pos',
      {
        id,
        supplierId: supplier.id,
        supplierName: supplier.name,
        companyCode: '1010',
        purchOrg: '1010',
        purchGroup,
        docType: 'NB — Standard PO',
        docDate: new Date().toISOString(),
        deliveryDate: new Date(delivery + 'T12:00:00').toISOString(),
        status,
        netAmount: net,
        currency: 'USD',
        paymentTerms: supplier.paymentTerms,
        createdByName: 'Alex Morgan',
        plant,
        items: valid.map((it, i) => ({
          item: String((i + 1) * 10).padStart(5, '0'),
          material: it.material || `SRV-${String(i + 1).padStart(2, '0')}`,
          description: it.description,
          qty: num(it.qty),
          unit: it.unit,
          price: num(it.price),
          net: round2(num(it.qty) * num(it.price)),
          grQty: 0,
          invQty: 0,
          glAccount: it.glAccount,
          costCenter: it.costCenter,
          taxCode: 'I0',
        })),
      },
      { prepend: true },
    )
    setMsg(null)
    setDone({ id, status })
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col relative">
      <PageHeader
        crumb={{ label: 'Manage Purchase Orders', onClick: () => go({ app: 'pos' }) }}
        title="Create Purchase Order"
        subtitle={src ? `Copy of ${src.id} · NB Standard PO` : 'NB Standard PO · Purchasing Organization 1010'}
        right={<div className="pr-2"><div className="text-[14px] text-[#556b82]">Net Order Value</div><div className="text-[20px] font-light">{usd(net)} <span className="text-[14px] text-[#556b82]">USD</span></div></div>}
      />
      <div className="flex-1 overflow-auto px-8 pt-5 pb-20 space-y-5">
        {msg && <MessageStrip type="error" onClose={() => setMsg(null)}>{msg}</MessageStrip>}
        {net > PO_RELEASE_LIMIT && <MessageStrip type="info">Net value exceeds {usd(PO_RELEASE_LIMIT)} USD — the purchase order will be routed for release before it is sent.</MessageStrip>}
        <Card title="General Information">
          <div className="p-5 grid grid-cols-3 gap-x-10 gap-y-4 max-w-[1240px]">
            <Field label="Supplier" required>
              <Select
                aria-label="Supplier"
                data-agent="sap-cpo-supplier"
                value={supplierId}
                onChange={(e) => {
                  setSupplierId(e.target.value)
                  const s = suppliers.find((x) => x.id === e.target.value)
                  setItems((c) => c.map((i) => (i.description ? i : { ...i, glAccount: defGl(s) })))
                }}
              >
                <option value="" />
                {[...suppliers].sort((a, b) => a.name.localeCompare(b.name)).map((s) => <option key={s.id} value={s.id}>{s.name} ({s.id}){s.blocked ? ' — blocked' : ''}</option>)}
              </Select>
            </Field>
            <Field label="Purchasing Group" required>
              <Select aria-label="Purchasing Group" value={purchGroup} onChange={(e) => setPurchGroup(e.target.value)}><option>001 — Indirect Spend</option><option>002 — IT Procurement</option></Select>
            </Field>
            <Field label="Payment Terms"><Text>{supplier ? `${supplier.paymentTerms} (${supplier.termsText})` : '—'}</Text></Field>
            <Field label="Delivery Date" required><Input type="date" aria-label="Delivery Date" value={delivery} onChange={(e) => setDelivery(e.target.value)} /></Field>
            <Field label="Plant" required>
              <Select aria-label="Plant" value={plant} onChange={(e) => setPlant(e.target.value)}><option>1010 — Boston HQ</option><option>1020 — Chicago Office</option><option>1030 — Dallas Warehouse</option></Select>
            </Field>
            <Field label="Company Code"><Text>1010 (Northwind Global Inc.)</Text></Field>
          </div>
        </Card>
        <Card title={`Items (${items.length})`} toolbar={<Btn kind="transparent" icon={<Plus className="w-4 h-4" />} data-agent="sap-cpo-add-item" onClick={() => setItems((c) => [...c, blank()])}>Add Item</Btn>}>
          <Table cols={[{ label: 'Item', w: '60px' }, { label: 'Material' }, { label: 'Short Text' }, { label: 'Quantity', align: 'right', w: '100px' }, { label: 'Unit', w: '90px' }, { label: 'Net Price', align: 'right', w: '120px' }, { label: 'Net Value', align: 'right' }, { label: 'G/L Account' }, { label: 'Cost Center' }, { label: '', w: '44px' }]}>
            {items.map((it, i) => (
              <tr key={i} className="h-[40px] border-b border-[#e5e5e5]">
                <td className="px-2">{String((i + 1) * 10).padStart(5, '0')}</td>
                <td className="px-2"><Input aria-label={`Material ${i + 1}`} value={it.material} onChange={(e) => set(i, { material: e.target.value })} /></td>
                <td className="px-2 min-w-[220px]"><Input aria-label={`Short Text ${i + 1}`} data-agent={`sap-cpo-desc-${i}`} value={it.description} onChange={(e) => set(i, { description: e.target.value })} /></td>
                <td className="px-2"><Input aria-label={`Quantity ${i + 1}`} data-agent={`sap-cpo-qty-${i}`} className="text-right" value={it.qty} onChange={(e) => set(i, { qty: e.target.value })} /></td>
                <td className="px-2"><Select aria-label={`Unit ${i + 1}`} value={it.unit} onChange={(e) => set(i, { unit: e.target.value })}>{['EA', 'AU', 'H', 'KG', 'BOX', 'PAC', 'TB'].map((u) => <option key={u}>{u}</option>)}</Select></td>
                <td className="px-2"><Input aria-label={`Net Price ${i + 1}`} data-agent={`sap-cpo-price-${i}`} className="text-right" value={it.price} onChange={(e) => set(i, { price: e.target.value })} /></td>
                <td className="px-2 text-right font-semibold whitespace-nowrap">{usd(num(it.qty) * num(it.price))}</td>
                <td className="px-2 min-w-[180px]"><Select aria-label={`G/L Account ${i + 1}`} value={it.glAccount} onChange={(e) => set(i, { glAccount: e.target.value })}>{GL_ACCOUNTS.filter((a) => a[2] === 'Expenses').map(([id, n]) => <option key={id} value={id}>{id} {n}</option>)}</Select></td>
                <td className="px-2 min-w-[180px]"><Select aria-label={`Cost Center ${i + 1}`} value={it.costCenter} onChange={(e) => set(i, { costCenter: e.target.value })}>{COST_CENTERS.map(([id, n]) => <option key={id} value={id}>{id} {n}</option>)}</Select></td>
                <td className="px-2"><button aria-label="Delete item" disabled={items.length <= 1} onClick={() => setItems((c) => c.filter((_, j) => j !== i))} className="w-7 h-7 rounded-lg hover:bg-[#eaecee] flex items-center justify-center text-[#0064d9] disabled:opacity-40"><Trash2 className="w-4 h-4" /></button></td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>
      <Footer>
        <Btn kind="emph" data-agent="sap-cpo-order" onClick={order}>Order</Btn>
        <Btn kind="transparent" onClick={() => go({ app: 'pos' })}>Cancel</Btn>
      </Footer>
      {done && (
        <Dialog
          title="Success"
          state="success"
          width={480}
          agent="sap-cpo-success"
          footer={<><Btn kind="emph" onClick={() => go({ app: 'po', id: done.id })}>Display Purchase Order</Btn><Btn kind="transparent" onClick={() => go({ app: 'pos' })}>Close</Btn></>}
        >
          <div className="px-5 py-5 text-[14px]">
            Standard PO <b>{done.id}</b> created ({usd(net)} USD).
            <div className="text-[#556b82] mt-1">{done.status === 'In Approval' ? 'The purchase order is waiting for release.' : `The purchase order was sent to ${supplier?.name}.`}</div>
          </div>
        </Dialog>
      )}
    </div>
  )
}

/* ───────────── Create Business Partner (Supplier) ───────────── */

const CATEGORIES = Object.keys(CATEGORY_GL).sort()
const TERMS: [string, string][] = [['NT15', 'Net 15 days'], ['NT30', 'Net 30 days'], ['NT45', 'Net 45 days'], ['NT60', 'Net 60 days'], ['2N10', '2% 10, Net 30']]

export function supplierFields(s: any, set: (p: any) => void) {
  return [
    ['Name', <Input key="n" aria-label="Name" data-agent="sap-bp-name" value={s.name} onChange={(e) => set({ name: e.target.value })} />],
    ['Supplier Category', <Select key="c" aria-label="Supplier Category" value={s.category} onChange={(e) => set({ category: e.target.value })}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select>],
    ['Email', <Input key="e" aria-label="Email" value={s.email} onChange={(e) => set({ email: e.target.value })} />],
    ['Street', <Input key="st" aria-label="Street" value={s.street} onChange={(e) => set({ street: e.target.value })} />],
    ['City', <Input key="ci" aria-label="City" value={s.city} onChange={(e) => set({ city: e.target.value })} />],
    ['Region / Postal Code', <div key="r" className="flex gap-2"><Input aria-label="Region" className="w-[70px]" value={s.region} onChange={(e) => set({ region: e.target.value.toUpperCase().slice(0, 2) })} /><Input aria-label="Postal Code" value={s.postal} onChange={(e) => set({ postal: e.target.value })} /></div>],
    ['Telephone', <Input key="t" aria-label="Telephone" value={s.phone} onChange={(e) => set({ phone: e.target.value })} />],
    ['Tax Number (EIN)', <Input key="tx" aria-label="Tax Number" value={s.taxNumber} onChange={(e) => set({ taxNumber: e.target.value })} />],
    ['Payment Terms', <Select key="pt" aria-label="Payment Terms" value={s.paymentTerms} onChange={(e) => set({ paymentTerms: e.target.value, termsText: TERMS.find((t) => t[0] === e.target.value)?.[1] })}>{TERMS.map(([k, v]) => <option key={k} value={k}>{k} — {v}</option>)}</Select>],
    ['Bank Account', <Input key="b" aria-label="Bank Account" value={s.bank} onChange={(e) => set({ bank: e.target.value })} />],
  ] as [string, ReactNode][]
}

export function CreateSupplier({ go }: { go: Go }) {
  const [s, setS] = useState<any>({ name: '', category: 'Office Supplies', email: '', street: '', city: '', region: '', postal: '', phone: '', taxNumber: '', paymentTerms: 'NT30', termsText: 'Net 30 days', bank: '' })
  const [msg, setMsg] = useState<string | null>(null)
  const save = () => {
    if (!s.name.trim()) return setMsg('Enter a name')
    if (!s.city.trim()) return setMsg('Enter a city')
    const id = nextId('sap.suppliers', 10300200)
    db.insert('sap.suppliers', { ...s, id, country: 'US', createdOn: new Date().toISOString(), purchOrg: '1010', accountGroup: 'SUPL', reconAccount: '211000', blocked: false, bank: s.bank || 'Woodgrove Bank ••••0000' })
    go({ app: 'supplier', id })
  }
  return (
    <div className="flex-1 min-h-0 flex flex-col relative">
      <PageHeader crumb={{ label: 'Display Supplier List', onClick: () => go({ app: 'suppliers' }) }} title="New Business Partner" subtitle="Role FLVN00 (FI Supplier) · FLVN01 (Supplier) · Grouping BP02" />
      <div className="flex-1 overflow-auto px-8 pt-5 pb-20 space-y-5">
        {msg && <MessageStrip type="error" onClose={() => setMsg(null)}>{msg}</MessageStrip>}
        <Card title="General Data">
          <div className="p-5 grid grid-cols-3 gap-x-10 gap-y-4 max-w-[1240px]">
            {supplierFields(s, (p) => setS({ ...s, ...p })).map(([k, v]) => (
              <Field key={k} label={k} required={k === 'Name' || k === 'City'}>{v}</Field>
            ))}
          </div>
        </Card>
      </div>
      <Footer>
        <Btn kind="emph" data-agent="sap-bp-save" onClick={save}>Save</Btn>
        <Btn kind="transparent" onClick={() => go({ app: 'suppliers' })}>Cancel</Btn>
      </Footer>
    </div>
  )
}
