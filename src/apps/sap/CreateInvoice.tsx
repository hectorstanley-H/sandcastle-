import { useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, AlertCircle, Search, CalendarDays, Plus, Paperclip, Settings2, ArrowUpDown, Trash2, FileText, X } from 'lucide-react'
import { db, useCollection } from '@/db/db'
import { useDesk } from '@/os/context'
import { isoDate } from '@/data/time'
import { Btn, Field, Input, Select, Text, MessageStrip, Dialog, Table, usd, sapDate } from './ui'
import { CATEGORY_GL, COST_CENTERS, GL_ACCOUNTS, glName } from './gl'
import type { Go } from './index'

const SECTIONS = ['Basic Data', 'Payment', 'Details', 'Tax', 'Items', 'Notes', 'Attachments']

export function nextSapId(col: string, floor: number) {
  const max = db.get<any>(col).reduce((m, r) => Math.max(m, Number(r.id) || 0), floor)
  return String(max + 1)
}

export function CreateInvoice({ go, initialPo }: { go: Go; initialPo?: string }) {
  const { isAgent } = useDesk()
  const suppliers = useCollection<any>('sap.suppliers')
  const pos = useCollection<any>('sap.pos')
  const [section, setSection] = useState('Basic Data')
  const [supplierText, setSupplierText] = useState('')
  const [supplierId, setSupplierId] = useState<string | null>(null)
  const [suggest, setSuggest] = useState(false)
  const [invoiceDate, setInvoiceDate] = useState('')
  const [postingDate, setPostingDate] = useState(isoDate(new Date()))
  const [reference, setReference] = useState('')
  const [gross, setGross] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [taxAmount, setTaxAmount] = useState('0.00')
  const [taxCode, setTaxCode] = useState('I0')
  const [calcTax, setCalcTax] = useState(false)
  const [text, setText] = useState('')
  const [poText, setPoText] = useState(initialPo ?? '')
  const [items, setItems] = useState<any[]>([])
  const [msg, setMsg] = useState<{ type: 'error' | 'success' | 'warning' | 'info'; text: string } | null>(null)
  const [simulate, setSimulate] = useState(false)
  const [posted, setPosted] = useState<string | null>(null)
  const [parked, setParked] = useState<string | null>(null)
  const [glItems, setGlItems] = useState<{ gl: string; amount: string; costCenter: string; text: string }[]>([])
  const [note, setNote] = useState('')
  const [attachments, setAttachments] = useState<string[]>([])
  const [itemSort, setItemSort] = useState(false)
  const [compact, setCompact] = useState(false)
  const scroller = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const supplier = suppliers.find((s) => s.id === supplierId)
  const matches = useMemo(() => {
    const q = supplierText.trim().toLowerCase()
    if (!q || supplier) return []
    return suppliers.filter((s) => s.name.toLowerCase().includes(q) || s.id.includes(q)).slice(0, 6)
  }, [supplierText, suppliers, supplier])

  const grossNum = Number(String(gross).replace(/,/g, '')) || 0
  const itemSum = items.filter((i) => i.selected).reduce((t, i) => t + i.amount, 0)
  const taxNum = Number(taxAmount) || 0
  const glSum = glItems.reduce((t, g) => t + (Number(String(g.amount).replace(/,/g, '')) || 0), 0)
  const balance = Math.round((grossNum - itemSum - glSum - taxNum) * 100) / 100
  const balanced = grossNum > 0 && balance === 0

  const days = supplier ? Number(String(supplier.paymentTerms).slice(2)) || 0 : 30
  const dueDate = invoiceDate ? isoDate(new Date(new Date(invoiceDate + 'T12:00:00').getTime() + days * 86400000)) : ''

  // "Calculate Tax": derive the tax amount from the gross amount and the tax code (only while ticked)
  useEffect(() => {
    if (!calcTax) return
    const rate = taxCode === 'I1' ? 0.0625 : 0
    setTaxAmount((Math.round((grossNum - grossNum / (1 + rate)) * 100) / 100).toFixed(2))
  }, [calcTax, grossNum, taxCode])

  const pickSupplier = (s: any) => {
    setSupplierId(s.id)
    setSupplierText(`${s.name} (${s.id})`)
    setSuggest(false)
  }

  const addPo = () => {
    const id = poText.trim()
    if (!id) return
    const po = pos.find((p) => p.id === id)
    if (!po) {
      setMsg({ type: 'error', text: `Purchase order ${id} does not exist in company code 1010` })
      return
    }
    if (items.some((i) => i.poId === id)) return
    if (!supplierId) pickSupplier(suppliers.find((s) => s.id === po.supplierId))
    else if (supplierId !== po.supplierId) {
      setMsg({ type: 'error', text: `Purchase order ${id} belongs to supplier ${po.supplierId}; invoicing party is ${supplierId}` })
      return
    }
    setItems((cur) => [
      ...cur,
      ...po.items.map((it: any) => ({ poId: po.id, item: it.item, material: it.material, description: it.description, qty: it.qty, unit: it.unit, amount: it.net, taxCode, selected: true, glAccount: it.glAccount, costCenter: it.costCenter, grQty: it.grQty })),
    ])
    setMsg(null)
    setPoText('')
  }

  useEffect(() => {
    if (initialPo) {
      const t = setTimeout(addPo, 50)
      return () => clearTimeout(t)
    }
  }, [])

  const missing = () => {
    if (!supplier) return 'Enter an invoicing party'
    if (!invoiceDate) return 'Enter an invoice date'
    if (!grossNum) return 'Enter the gross invoice amount'
    if (!items.some((i) => i.selected) && !glSum) return 'Enter at least one purchase order item'
    if (!balanced) return `Balance is not zero: ${usd(balance)} ${currency}`
    return null
  }

  const doSimulate = () => {
    const m = missing()
    if (m && !m.startsWith('Balance')) return setMsg({ type: 'error', text: m })
    setSimulate(true)
  }

  const post = () => {
    const m = missing()
    if (m) return setMsg({ type: 'error', text: m })
    const id = nextSapId('sap.invoices', 5105601233)
    const jid = nextSapId('sap.journals', 100004500)
    const now = new Date().toISOString()
    const sel = items.filter((i) => i.selected)
    const inv = {
      id,
      fiscalYear: '2026',
      companyCode: '1010',
      supplierId: supplier.id,
      supplierName: supplier.name,
      reference,
      invoiceDate: new Date(invoiceDate + 'T12:00:00').toISOString(),
      postingDate: new Date(postingDate + 'T12:00:00').toISOString(),
      gross: grossNum,
      tax: taxNum,
      taxCode,
      currency,
      poId: sel[0]?.poId,
      status: 'Posted',
      paymentTerms: supplier.paymentTerms,
      dueDate: new Date(dueDate + 'T12:00:00').toISOString(),
      items: sel.map((i) => ({ poId: i.poId, item: i.item, description: i.description, qty: i.qty, unit: i.unit, amount: i.amount, taxCode: i.taxCode })),
      journalId: jid,
      createdByName: 'Alex Morgan',
      createdAt: now,
      createdBy: isAgent ? 'hworker' : undefined,
      text,
      ...(glItems.length ? { glItems: glItems.map((g) => ({ ...g, amount: Number(String(g.amount).replace(/,/g, '')) || 0 })) } : {}),
      ...(note ? { note } : {}),
      ...(attachments.length ? { attachments } : {}),
    }
    db.insert('sap.invoices', inv, { prepend: true })
    db.insert(
      'sap.journals',
      {
        id: jid,
        fiscalYear: '2026',
        companyCode: '1010',
        type: 'RE',
        typeText: 'Gross Invoice Receipt',
        postingDate: inv.postingDate,
        docDate: inv.invoiceDate,
        reference,
        header: `${supplier.name} invoice`,
        amount: grossNum,
        currency,
        sourceInvoiceId: id,
        lines: [
          ...sel.map((i) => ({ gl: '211100', glName: 'GR/IR Clearing', debit: i.amount, credit: 0, text: `PO ${i.poId}/${i.item}` })),
          ...glItems.filter((g) => Number(g.amount)).map((g) => ({ gl: g.gl, glName: glName(g.gl), debit: Number(String(g.amount).replace(/,/g, '')) || 0, credit: 0, costCenter: g.costCenter || undefined, text: g.text || undefined })),
          ...(taxNum ? [{ gl: '154000', glName: 'Input Tax', debit: taxNum, credit: 0, text: taxCode }] : []),
          { gl: '211000', glName: `Accounts Payable — Domestic · ${supplier.name}`, debit: 0, credit: grossNum, text: supplier.id },
        ],
        createdByName: 'Alex Morgan',
        createdBy: isAgent ? 'hworker' : undefined,
      },
      { prepend: true },
    )
    for (const poId of new Set(sel.map((i) => i.poId))) {
      db.update('sap.pos', poId, (p) => ({
        status: 'Completely Invoiced',
        items: p.items.map((it: any) => (sel.some((s) => s.poId === poId && s.item === it.item) ? { ...it, invQty: it.qty } : it)),
      }))
    }
    setMsg(null)
    setPosted(id)
  }

  /** Save as Draft / Save as Completed: parks the invoice without an accounting document */
  const park = (complete: boolean) => {
    if (!supplier) return setMsg({ type: 'error', text: 'Enter an invoicing party' })
    if (!invoiceDate) return setMsg({ type: 'error', text: 'Enter an invoice date' })
    if (complete && !balanced) return setMsg({ type: 'error', text: `Balance is not zero: ${usd(balance)} ${currency}` })
    const id = nextSapId('sap.invoices', 5105601233)
    const sel = items.filter((i) => i.selected)
    db.insert(
      'sap.invoices',
      {
        id,
        fiscalYear: '2026',
        companyCode: '1010',
        supplierId: supplier.id,
        supplierName: supplier.name,
        reference,
        invoiceDate: new Date(invoiceDate + 'T12:00:00').toISOString(),
        postingDate: new Date(postingDate + 'T12:00:00').toISOString(),
        gross: grossNum,
        tax: taxNum,
        taxCode,
        currency,
        poId: sel[0]?.poId,
        status: 'Parked',
        parkedAsComplete: complete,
        paymentTerms: supplier.paymentTerms,
        dueDate: new Date((dueDate || invoiceDate) + 'T12:00:00').toISOString(),
        items: sel.map((i) => ({ poId: i.poId, item: i.item, description: i.description, qty: i.qty, unit: i.unit, amount: i.amount, taxCode: i.taxCode })),
        glItems: glItems.map((g) => ({ ...g, amount: Number(String(g.amount).replace(/,/g, '')) || 0 })),
        createdByName: 'Alex Morgan',
        createdAt: new Date().toISOString(),
        createdBy: isAgent ? 'hworker' : undefined,
        text,
        note: note || undefined,
        attachments: attachments.length ? attachments : undefined,
      },
      { prepend: true },
    )
    setMsg(null)
    setParked(id)
  }

  const proposeGl = () => {
    const rest = Math.round((grossNum - itemSum - glSum - taxNum) * 100) / 100
    setGlItems((g) => [...g, { gl: CATEGORY_GL[supplier?.category] ?? '611000', amount: rest > 0 ? rest.toFixed(2) : '', costCenter: '10101301', text: reference ? `Invoice ${reference}` : '' }])
  }

  const shownItems = itemSort ? [...items].sort((a, b) => b.amount - a.amount) : items

  const jump = (s: string) => {
    setSection(s)
    const el = scroller.current?.querySelector(`[data-section="${s}"]`) as HTMLElement | null
    if (el && scroller.current) scroller.current.scrollTo({ top: el.offsetTop - 8, behavior: 'smooth' })
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* dynamic page header */}
      <div className="bg-white shrink-0 px-8 pt-3 shadow-[0_0.125rem_0.25rem_rgba(34,53,72,0.08)] relative z-10">
        <div className="text-[12px] text-[#0064d9] mb-1"><button onClick={() => go({ app: 'home', space: 'Accounts Payable' })} className="hover:underline">Accounts Payable</button></div>
        <div className="flex items-start">
          <div>
            <div className="text-[20px] font-bold leading-tight">Create Supplier Invoice</div>
            <div className="text-[14px] text-[#556b82] mt-0.5">{supplier ? `${supplier.name} · ` : ''}Company Code 1010 (Northwind Global Inc.)</div>
          </div>
          <div className="flex-1" />
          <div className="flex items-start gap-10 pr-2">
            <div>
              <div className="text-[14px] text-[#556b82]">Gross Invoice Amount</div>
              <div className="text-[20px] font-light">{usd(grossNum)} <span className="text-[14px] text-[#556b82]">{currency}</span></div>
            </div>
            <div data-agent="sap-ci-balance" aria-label={`Balance ${usd(balance)}`}>
              <div className="text-[14px] text-[#556b82]">Balance</div>
              <div className="flex items-center gap-1.5 text-[20px] font-light" style={{ color: balanced ? '#256f3a' : grossNum ? '#aa0808' : '#1d2d3e' }}>
                {balanced ? <CheckCircle2 className="w-5 h-5 text-[#30914c]" /> : grossNum ? <AlertCircle className="w-5 h-5" /> : null}
                {usd(balance)} <span className="text-[14px] text-[#556b82]">{currency}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-1 mt-3 -mx-3">
          {SECTIONS.map((s) => (
            <button key={s} onClick={() => jump(s)} className={`relative h-11 px-3 text-[14px] ${section === s ? 'text-[#0064d9] font-bold' : 'text-[#1d2d3e] hover:text-[#0064d9]'}`}>
              {s}
              {section === s && <span className="absolute left-3 right-3 bottom-0 h-[3px] rounded-t bg-[#0064d9]" />}
            </button>
          ))}
        </div>
      </div>

      <div ref={scroller} className="flex-1 overflow-auto px-8 pt-5 pb-20 relative">
        {msg && (
          <div className="mb-4">
            <MessageStrip type={msg.type} onClose={() => setMsg(null)}>{msg.text}</MessageStrip>
          </div>
        )}
        <section data-section="Basic Data" className="mb-8">
          <div className="text-[16px] font-bold mb-4">Basic Data</div>
          <div className="grid grid-cols-3 gap-x-10 gap-y-4 max-w-[1240px]">
            <Field label="Transaction" required>
              <Select defaultValue="Invoice" aria-label="Transaction"><option>Invoice</option><option>Credit Memo</option><option>Subsequent Debit</option><option>Subsequent Credit</option></Select>
            </Field>
            <Field label="Reference">
              <Input data-agent="sap-ci-reference" aria-label="Reference" value={reference} onChange={(e) => setReference(e.target.value)} />
            </Field>
            <div className="row-span-5">
              <div className="rounded-xl border border-[#e5e5e5] bg-[#fafbfc] p-4 min-h-[220px]">
                <div className="text-[14px] font-bold mb-2">Invoicing Party Information</div>
                {supplier ? (
                  <div className="text-[14px] leading-[1.6]">
                    <button onClick={() => go({ app: 'supplier', id: supplier.id })} className="text-[#0064d9] font-semibold hover:underline">{supplier.name}</button>
                    <div>{supplier.street}</div>
                    <div>{supplier.city}, {supplier.region} {supplier.postal}</div>
                    <div>United States</div>
                    <div className="mt-2 text-[#556b82]">Payment Terms: <span className="text-[#1d2d3e]">{supplier.paymentTerms} — {supplier.termsText}</span></div>
                    <div className="text-[#556b82]">Bank: <span className="text-[#1d2d3e]">{supplier.bank}</span></div>
                    <div className="text-[#556b82]">Tax Number: <span className="text-[#1d2d3e]">{supplier.taxNumber}</span></div>
                  </div>
                ) : (
                  <div className="text-[14px] text-[#556b82] italic">Enter an invoicing party to display the supplier address and payment details.</div>
                )}
              </div>
            </div>
            <Field label="Company Code" required>
              <Input value="1010" readOnly aria-label="Company Code" />
            </Field>
            <Field label="Gross Invoice Amount" required>
              <div className="flex gap-2">
                <Input data-agent="sap-ci-gross" aria-label="Gross Invoice Amount" className="text-right" value={gross} onChange={(e) => setGross(e.target.value)} />
                <Select className="w-[90px] shrink-0" value={currency} onChange={(e) => setCurrency(e.target.value)} aria-label="Currency" data-agent="sap-ci-currency">
                  <option>USD</option><option>EUR</option><option>GBP</option><option>CAD</option>
                </Select>
              </div>
            </Field>
            <Field label="Invoicing Party" required>
              <div className="relative">
                <Input
                  data-agent="sap-ci-supplier"
                  aria-label="Invoicing Party"
                  value={supplierText}
                  placeholder="Supplier number or name"
                  onChange={(e) => {
                    setSupplierText(e.target.value)
                    setSupplierId(null)
                    setSuggest(true)
                  }}
                  onFocus={() => setSuggest(true)}
                />
                <Search className="w-4 h-4 absolute right-2 top-[5px] text-[#0064d9]" />
                {suggest && matches.length > 0 && (
                  <div className="absolute left-0 right-0 top-[30px] z-30 bg-white rounded-lg shadow-[0_0_1rem_rgba(34,53,72,0.25)] border border-[#e5e5e5] py-1">
                    {matches.map((s) => (
                      <button key={s.id} data-agent={`sap-ci-supplier-opt-${s.id}`} onClick={() => pickSupplier(s)} className="w-full text-left px-3 py-1.5 hover:bg-[#eaecee]">
                        <div className="text-[14px]">{s.name}</div>
                        <div className="text-[12px] text-[#556b82]">{s.id} · {s.city}, {s.region}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </Field>
            <Field label="Tax Amount">
              <div className="flex gap-3 items-center">
                <Input aria-label="Tax Amount" className="text-right" value={taxAmount} onChange={(e) => setTaxAmount(e.target.value)} />
                <label className="flex items-center gap-1.5 text-[14px] whitespace-nowrap">
                  <input type="checkbox" checked={calcTax} onChange={(e) => setCalcTax(e.target.checked)} className="w-4 h-4 accent-[#0064d9]" /> Calculate Tax
                </label>
              </div>
            </Field>
            <Field label="Invoice Date" required>
              <Input data-agent="sap-ci-invoice-date" type="date" aria-label="Invoice Date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
            </Field>
            <Field label="Tax Code">
              <Select data-agent="sap-ci-taxcode" aria-label="Tax Code" value={taxCode} onChange={(e) => setTaxCode(e.target.value)}>
                <option value="I0">I0 (A/P Tax Exempt — 0%)</option>
                <option value="I1">I1 (A/P Sales Tax, Taxable)</option>
                <option value="U1">U1 (A/P Use Tax)</option>
              </Select>
            </Field>
            <Field label="Posting Date" required>
              <Input data-agent="sap-ci-posting-date" type="date" aria-label="Posting Date" value={postingDate} onChange={(e) => setPostingDate(e.target.value)} />
            </Field>
            <Field label="Invoice Header Text">
              <Input aria-label="Invoice Header Text" value={text} onChange={(e) => setText(e.target.value)} data-agent="sap-ci-text" />
            </Field>
          </div>
        </section>

        <section data-section="Payment" className="mb-8">
          <div className="text-[16px] font-bold mb-4">Payment</div>
          <div className="grid grid-cols-3 gap-x-10 gap-y-4 max-w-[1240px]">
            <Field label="Baseline Date"><Text>{invoiceDate ? sapDate(invoiceDate + 'T12:00:00') : '—'}</Text></Field>
            <Field label="Payment Terms"><Text>{supplier ? `${supplier.paymentTerms} (${supplier.termsText})` : '—'}</Text></Field>
            <Field label="Due Date"><Text>{dueDate ? <span data-agent="sap-ci-due-date">{sapDate(dueDate + 'T12:00:00')}</span> : '—'}</Text></Field>
            <Field label="Payment Method"><Text>T (Bank Transfer — ACH)</Text></Field>
            <Field label="Payment Block"><Text>Free for Payment</Text></Field>
            <Field label="House Bank"><Text>WOOD1 / OPR01 (Woodgrove Operating)</Text></Field>
          </div>
        </section>

        <section data-section="Details" className="mb-8">
          <div className="text-[16px] font-bold mb-4">Details</div>
          <div className="grid grid-cols-3 gap-x-10 gap-y-4 max-w-[1240px]">
            <Field label="Invoice Receipt Date"><Text>{sapDate(new Date().toISOString())}</Text></Field>
            <Field label="Unplanned Delivery Costs"><Text>0.00 {currency}</Text></Field>
            <Field label="Assignment"><Text>{reference || '—'}</Text></Field>
          </div>
        </section>

        <section data-section="Tax" className="mb-8">
          <div className="text-[16px] font-bold mb-4">Tax</div>
          <div className="bg-white rounded-xl border border-[#e5e5e5] max-w-[1240px]">
            <Table cols={[{ label: 'Tax Code' }, { label: 'Tax Jurisdiction' }, { label: 'Tax Base Amount', align: 'right' }, { label: 'Tax Amount', align: 'right' }]}>
              <tr className="h-[33px] border-b border-[#e5e5e5]"><td className="px-2">{taxCode}</td><td className="px-2">MA0000000</td><td className="px-2 text-right">{usd(itemSum)} {currency}</td><td className="px-2 text-right">{usd(taxNum)} {currency}</td></tr>
            </Table>
          </div>
        </section>

        <section data-section="Items" className="mb-8">
          <div className="text-[16px] font-bold mb-4">Items</div>
          <div className="bg-white rounded-xl shadow-[0_0_0.125rem_rgba(34,53,72,0.15),0_0.125rem_0.5rem_rgba(34,53,72,0.15)] max-w-[1240px] mb-5">
            <div className="h-12 px-4 flex items-center gap-3 border-b border-[#e5e5e5]">
              <div className="text-[16px] font-bold">Purchase Order Reference ({items.length})</div>
              <div className="flex-1" />
              <div className="flex items-center gap-2">
                <span className="text-[14px] text-[#556b82] whitespace-nowrap">Purchase Order/Scheduling Agreement:</span>
                <div className="relative w-[200px]">
                  <Input
                    data-agent="sap-ci-po"
                    aria-label="Purchase Order"
                    value={poText}
                    placeholder="Enter PO number"
                    onChange={(e) => setPoText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addPo()}
                  />
                </div>
                <Btn data-agent="sap-ci-po-add" kind="transparent" icon={<Plus className="w-4 h-4" />} onClick={addPo} aria-label="Add purchase order">Add</Btn>
              </div>
              <span className="w-px h-5 bg-[#d9d9d9]" />
              <Btn kind="transparent" onClick={proposeGl} disabled={!supplier}>Propose G/L Item</Btn>
              <Btn kind="transparent" disabled={!items.length} onClick={() => setItems([])}>Delete</Btn>
              <button onClick={() => setItemSort((v) => !v)} aria-label="Sort by amount" title={itemSort ? 'Sorted by amount (descending)' : 'Sort by amount'} className={`w-7 h-7 rounded-lg hover:bg-[#eaecee] flex items-center justify-center text-[#0064d9] ${itemSort ? 'bg-[#e1f4ff]' : ''}`}><ArrowUpDown className="w-4 h-4" /></button>
              <button onClick={() => setCompact((v) => !v)} aria-label="Show or hide account assignment columns" title={compact ? 'Show account assignment' : 'Hide account assignment'} className={`w-7 h-7 rounded-lg hover:bg-[#eaecee] flex items-center justify-center text-[#0064d9] ${compact ? 'bg-[#e1f4ff]' : ''}`}><Settings2 className="w-4 h-4" /></button>
            </div>
            <Table cols={[{ label: '', w: '40px' }, { label: 'Purchase Order' }, { label: 'Item' }, { label: 'Material/Service' }, { label: 'Description' }, { label: 'Quantity', align: 'right' }, { label: 'Order Unit' }, { label: 'Amount', align: 'right' }, { label: 'Tax Code' }, ...(compact ? [] : [{ label: 'G/L Account' }, { label: 'Cost Center' }])]}>
              {items.length === 0 && (
                <tr><td colSpan={11} className="h-16 text-center text-[14px] text-[#556b82]">No purchase order items. Enter a purchase order number to add its items.</td></tr>
              )}
              {shownItems.map((it) => (
                <tr key={it.poId + it.item} data-agent={`sap-ci-po-row-${it.poId}-${it.item}`} className={`h-[33px] border-b border-[#e5e5e5] ${it.selected ? 'bg-[#ebf8ff]' : 'hover:bg-[#f5f6f7]'} flash-new`}>
                  <td className="px-2 text-center"><input type="checkbox" checked={it.selected} onChange={(e) => setItems((c) => c.map((x) => (x === it ? { ...x, selected: e.target.checked } : x)))} className="w-4 h-4 accent-[#0064d9]" aria-label="Select item" /></td>
                  <td className="px-2"><button className="text-[#0064d9] hover:underline" onClick={() => go({ app: 'po', id: it.poId })}>{it.poId}</button></td>
                  <td className="px-2">{it.item}</td>
                  <td className="px-2">{it.material}</td>
                  <td className="px-2">{it.description}</td>
                  <td className="px-2 text-right">{it.qty.toLocaleString('en-US', { minimumFractionDigits: 3 })}</td>
                  <td className="px-2">{it.unit}</td>
                  <td className="px-2 text-right font-semibold">{usd(it.amount)} {currency}</td>
                  <td className="px-2">{taxCode}</td>
                  {!compact && <td className="px-2">{it.glAccount}</td>}
                  {!compact && <td className="px-2">{it.costCenter}</td>}
                </tr>
              ))}
            </Table>
          </div>
          <div className="bg-white rounded-xl shadow-[0_0_0.125rem_rgba(34,53,72,0.15),0_0.125rem_0.5rem_rgba(34,53,72,0.15)] max-w-[1240px]">
            <div className="h-12 px-4 flex items-center border-b border-[#e5e5e5]"><div className="text-[16px] font-bold">G/L Account Items ({glItems.length})</div><div className="flex-1" /><Btn kind="transparent" data-agent="sap-ci-gl-create" onClick={() => setGlItems((g) => [...g, { gl: CATEGORY_GL[supplier?.category] ?? '611000', amount: '', costCenter: '10101301', text: '' }])}>Create</Btn></div>
            {glItems.length === 0 ? (
              <div className="h-14 flex items-center justify-center text-[14px] text-[#556b82]">No data</div>
            ) : (
              <Table cols={[{ label: 'G/L Account' }, { label: 'Amount', align: 'right', w: '160px' }, { label: 'Cost Center' }, { label: 'Item Text' }, { label: '', w: '44px' }]}>
                {glItems.map((g, i) => {
                  const setG = (p: any) => setGlItems((c) => c.map((x, j) => (j === i ? { ...x, ...p } : x)))
                  return (
                    <tr key={i} className="h-[40px] border-b border-[#e5e5e5]">
                      <td className="px-2 min-w-[240px]"><Select aria-label="G/L Account" value={g.gl} onChange={(e) => setG({ gl: e.target.value })}>{GL_ACCOUNTS.map(([id, n]) => <option key={id} value={id}>{id} {n}</option>)}</Select></td>
                      <td className="px-2"><Input aria-label="G/L Amount" className="text-right" value={g.amount} onChange={(e) => setG({ amount: e.target.value })} /></td>
                      <td className="px-2 min-w-[200px]"><Select aria-label="Cost Center" value={g.costCenter} onChange={(e) => setG({ costCenter: e.target.value })}>{COST_CENTERS.map(([id, n]) => <option key={id} value={id}>{id} {n}</option>)}</Select></td>
                      <td className="px-2"><Input aria-label="Item Text" value={g.text} onChange={(e) => setG({ text: e.target.value })} /></td>
                      <td className="px-2"><button aria-label="Delete G/L item" onClick={() => setGlItems((c) => c.filter((_, j) => j !== i))} className="w-7 h-7 rounded-lg hover:bg-[#eaecee] flex items-center justify-center text-[#0064d9]"><Trash2 className="w-4 h-4" /></button></td>
                    </tr>
                  )
                })}
              </Table>
            )}
          </div>
        </section>

        <section data-section="Notes" className="mb-8">
          <div className="text-[16px] font-bold mb-3">Notes</div>
          <textarea aria-label="Notes" value={note} onChange={(e) => setNote(e.target.value)} className="w-full max-w-[1240px] h-20 rounded border border-[#bcc3ca] p-2 text-[14px] outline-none" placeholder="Enter a note" />
        </section>
        <section data-section="Attachments" className="mb-8">
          <div className="text-[16px] font-bold mb-3">Attachments ({attachments.length})</div>
          {attachments.length > 0 && (
            <div className="max-w-[1240px] mb-3 flex flex-wrap gap-2">
              {attachments.map((a) => (
                <span key={a} className="inline-flex items-center gap-1.5 h-8 pl-2 pr-1 rounded-lg border border-[#d9d9d9] bg-white text-[14px]">
                  <FileText className="w-4 h-4 text-[#aa0808]" /> {a}
                  <button aria-label={`Remove ${a}`} onClick={() => setAttachments((c) => c.filter((x) => x !== a))} className="w-6 h-6 rounded hover:bg-[#eaecee] flex items-center justify-center"><X className="w-3.5 h-3.5" /></button>
                </span>
              ))}
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              const names = Array.from(e.target.files ?? []).map((f) => f.name)
              setAttachments((c) => [...new Set([...c, ...names])])
              e.target.value = ''
            }}
          />
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              const names = Array.from(e.dataTransfer.files ?? []).map((f) => f.name)
              setAttachments((c) => [...new Set([...c, ...names])])
            }}
            className="max-w-[1240px] h-24 rounded-xl border-2 border-dashed border-[#bcc3ca] flex items-center justify-center text-[14px] text-[#556b82] gap-2 cursor-pointer hover:border-[#0064d9] hover:text-[#0064d9]"
          >
            <Paperclip className="w-4 h-4" /> Drop files here or browse
          </div>
        </section>
      </div>

      {/* floating footer */}
      <div className="absolute left-4 right-4 bottom-3 h-[44px] bg-white rounded-xl shadow-[0_0_0.125rem_rgba(34,53,72,0.15),0_0.25rem_1rem_rgba(34,53,72,0.25)] flex items-center px-3 gap-2 z-20">
        {msg?.type === 'error' && (
          <button onClick={() => scroller.current?.scrollTo({ top: 0, behavior: 'smooth' })} className="h-[26px] px-2 rounded-lg bg-[#ffeaf4] text-[#aa0808] border border-[#aa0808]/40 flex items-center gap-1 text-[14px] font-semibold"><AlertCircle className="w-4 h-4" /> 1</button>
        )}
        <div className="flex-1" />
        <Btn data-agent="sap-ci-post" kind="emph" onClick={post}>Post</Btn>
        <Btn kind="default" data-agent="sap-ci-save-completed" onClick={() => park(true)}>Save as Completed</Btn>
        <Btn kind="default" data-agent="sap-ci-save-draft" onClick={() => park(false)}>Save as Draft</Btn>
        <Btn data-agent="sap-ci-simulate" kind="default" onClick={doSimulate}>Simulate</Btn>
        <Btn kind="transparent" onClick={() => go({ app: 'home', space: 'Accounts Payable' })}>Cancel</Btn>
      </div>

      {simulate && (
        <Dialog
          title="Simulate Accounting Document"
          width={860}
          agent="sap-ci-simulate-dialog"
          footer={<Btn data-agent="sap-ci-simulate-close" kind="emph" onClick={() => setSimulate(false)}>Close</Btn>}
        >
          <div className="px-4 pt-3 pb-2 grid grid-cols-4 gap-4 text-[14px]">
            <Field label="Document Type"><Text>RE (Gross Invoice Receipt)</Text></Field>
            <Field label="Posting Date"><Text>{sapDate(postingDate + 'T12:00:00')}</Text></Field>
            <Field label="Fiscal Period"><Text>{String(new Date(postingDate).getMonth() + 1).padStart(3, '0')}/2026</Text></Field>
            <Field label="Balance"><Text><span style={{ color: balanced ? '#256f3a' : '#aa0808' }}>{usd(balance)} {currency}</span></Text></Field>
          </div>
          <div className="px-4 pb-4">
            <Table cols={[{ label: 'Item' }, { label: 'PK' }, { label: 'Account' }, { label: 'Account Name' }, { label: 'Debit', align: 'right' }, { label: 'Credit', align: 'right' }, { label: 'Tax Code' }]}>
              <tr className="h-[33px] border-b border-[#e5e5e5]">
                <td className="px-2">1</td><td className="px-2">31</td><td className="px-2">{supplier?.id}</td><td className="px-2">{supplier?.name}</td><td className="px-2 text-right" /><td className="px-2 text-right">{usd(grossNum)}</td><td className="px-2">{taxCode}</td>
              </tr>
              {items.filter((i) => i.selected).map((it, i) => (
                <tr key={i} className="h-[33px] border-b border-[#e5e5e5]">
                  <td className="px-2">{i + 2}</td><td className="px-2">86</td><td className="px-2">211100</td><td className="px-2">GR/IR Clearing · PO {it.poId}/{it.item}</td><td className="px-2 text-right">{usd(it.amount)}</td><td className="px-2 text-right" /><td className="px-2">{taxCode}</td>
                </tr>
              ))}
              {glItems.filter((g) => Number(g.amount)).map((g, i) => (
                <tr key={'gl' + i} className="h-[33px] border-b border-[#e5e5e5]">
                  <td className="px-2">{items.filter((x) => x.selected).length + i + 2}</td><td className="px-2">40</td><td className="px-2">{g.gl}</td><td className="px-2">{glName(g.gl)}{g.costCenter ? ` · ${g.costCenter}` : ''}</td><td className="px-2 text-right">{usd(Number(g.amount) || 0)}</td><td className="px-2 text-right" /><td className="px-2">{taxCode}</td>
                </tr>
              ))}
              {taxNum ? (
                <tr className="h-[33px] border-b border-[#e5e5e5]">
                  <td className="px-2" /><td className="px-2">40</td><td className="px-2">154000</td><td className="px-2">Input Tax</td><td className="px-2 text-right">{usd(taxNum)}</td><td className="px-2 text-right" /><td className="px-2">{taxCode}</td>
                </tr>
              ) : null}
              <tr className="h-[33px] font-bold">
                <td className="px-2" colSpan={4}>Total</td><td className="px-2 text-right">{usd(itemSum + glSum + taxNum)}</td><td className="px-2 text-right">{usd(grossNum)}</td><td />
              </tr>
            </Table>
            {balanced ? (
              <div className="mt-3"><MessageStrip type="success">No errors. The document can be posted.</MessageStrip></div>
            ) : (
              <div className="mt-3"><MessageStrip type="error">Balance is not zero: {usd(balance)} {currency}</MessageStrip></div>
            )}
          </div>
        </Dialog>
      )}

      {posted && (
        <Dialog
          title="Success"
          state="success"
          width={480}
          agent="sap-ci-success"
          footer={
            <>
              <Btn data-agent="sap-ci-display" kind="emph" onClick={() => go({ app: 'invoice', id: posted })}>Display Supplier Invoice</Btn>
              <Btn kind="default" onClick={() => go({ app: 'createInvoice' })}>Create Another Invoice</Btn>
              <Btn data-agent="sap-ci-success-close" kind="transparent" onClick={() => go({ app: 'invoices' })}>Close</Btn>
            </>
          }
        >
          <div className="px-5 py-5 text-[14px] leading-[1.6]">
            Document <b data-agent="sap-ci-docnum">{posted}</b> was posted.
            <div className="text-[#556b82] mt-1">Supplier invoice {posted} / 2026 · {supplier?.name} · {usd(grossNum)} {currency}</div>
            <div className="text-[#556b82]">Due {sapDate(dueDate + 'T12:00:00')} ({supplier?.paymentTerms})</div>
          </div>
        </Dialog>
      )}
      {parked && (
        <Dialog
          title="Success"
          state="success"
          width={480}
          agent="sap-ci-parked"
          footer={
            <>
              <Btn kind="emph" onClick={() => go({ app: 'invoice', id: parked })}>Display Supplier Invoice</Btn>
              <Btn kind="transparent" onClick={() => go({ app: 'invoices' })}>Close</Btn>
            </>
          }
        >
          <div className="px-5 py-5 text-[14px] leading-[1.6]">
            Supplier invoice <b>{parked}</b> was saved as {balanced ? 'completed' : 'draft'} (parked). No accounting document was created.
            <div className="text-[#556b82] mt-1">Post it later from Manage Supplier Invoices.</div>
          </div>
        </Dialog>
      )}
      <CalendarDays className="hidden" />
    </div>
  )
}
