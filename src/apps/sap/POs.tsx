import { useState } from 'react'
import { Printer } from 'lucide-react'
import { db, useCollection, useRecord } from '@/db/db'
import { isoDate } from '@/data/time'
import { useDesk } from '@/os/context'
import { Btn, ObjectStatus, Table, usd, sapDate, Dialog, Input, Select, MessageStrip } from './ui'
import { ListReport, ObjectPage, Panel, FormGrid } from './ListReport'
import type { Go } from './index'

const PURCH_GROUPS = ['001 — Indirect Spend', '002 — IT Procurement']

export function PoList({ go, status }: { go: Go; status?: string }) {
  const rows = useCollection<any>('sap.pos')
  const [del, setDel] = useState<any[] | null>(null)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  return (
    <>
    {msg && <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 w-[560px]"><MessageStrip type={msg.type} onClose={() => setMsg(null)}>{msg.text}</MessageStrip></div>}
    {del && (
      <Dialog
        title="Delete Purchase Orders"
        width={460}
        footer={
          <>
            <Btn
              kind="emph"
              data-agent="sap-po-delete-confirm"
              onClick={() => {
                for (const p of del) db.remove('sap.pos', p.id)
                setMsg({ type: 'success', text: `${del.length} purchase order${del.length > 1 ? 's' : ''} deleted.` })
                setDel(null)
              }}
            >
              Delete
            </Btn>
            <Btn kind="transparent" onClick={() => setDel(null)}>Cancel</Btn>
          </>
        }
      >
        <div className="p-5 text-[14px]">Delete {del.map((p) => p.id).join(', ')}? Purchase orders that are still in approval have not been sent to the supplier and can be deleted.</div>
      </Dialog>
    )}
    <ListReport
      initialFilters={status ? { status } : undefined}
      title="Manage Purchase Orders"
      tableTitle="Purchase Orders"
      agentPrefix="sap-po"
      rows={rows}
      searchKeys={(r) => `${r.id} ${r.supplierName} ${r.items.map((i: any) => i.description).join(' ')}`}
      filters={[
        { label: 'Supplier', key: 'supplierName', options: [...new Set(rows.map((r) => r.supplierName))].sort() },
        { label: 'Status', key: 'status', options: ['In Approval', 'Sent', 'Partially Invoiced', 'Completely Invoiced'] },
        { label: 'Purchasing Group', key: 'purchGroup', options: ['001 — Indirect Spend', '002 — IT Procurement'] },
      ]}
      onOpen={(r) => go({ app: 'po', id: r.id })}
      actions={(sel, clear) => (
        <>
          <Btn kind="transparent" data-agent="sap-po-new" onClick={() => go({ app: 'createPo' })}>Create</Btn>
          <Btn kind="transparent" disabled={sel.length !== 1} onClick={() => go({ app: 'createPo', copyFrom: sel[0]?.id })}>Copy</Btn>
          <Btn
            kind="transparent"
            disabled={!sel.length}
            onClick={() => {
              const bad = sel.filter((p) => p.status !== 'In Approval')
              if (bad.length) setMsg({ type: 'error', text: `${bad.map((p) => p.id).join(', ')} ${bad.length > 1 ? 'have' : 'has'} already been sent to the supplier and cannot be deleted.` })
              else setDel(sel)
              clear()
            }}
          >
            Delete
          </Btn>
        </>
      )}
      cols={[
        { label: 'Purchase Order', render: (r) => <span className="text-[#0064d9] font-semibold">{r.id}</span>, sort: (r) => r.id },
        { label: 'Supplier', render: (r) => <span>{r.supplierName} <span className="text-[#556b82]">({r.supplierId})</span></span>, sort: (r) => r.supplierName },
        { label: 'Short Text', render: (r) => <span className="truncate inline-block max-w-[260px] align-middle">{r.items[0]?.description}{r.items.length > 1 ? ` +${r.items.length - 1}` : ''}</span> },
        { label: 'Purchasing Group', render: (r) => r.purchGroup, sort: (r) => r.purchGroup ?? '' },
        { label: 'Created On', render: (r) => sapDate(r.docDate), sort: (r) => r.docDate ?? '' },
        { label: 'Net Order Value', align: 'right', render: (r) => <span className="font-semibold">{usd(r.netAmount)} <span className="text-[#556b82] font-normal">USD</span></span>, sort: (r) => r.netAmount },
        { label: 'Status', render: (r) => <ObjectStatus status={r.status} />, sort: (r) => r.status },
      ]}
    />
    </>
  )
}

export function PoObject({ id, go }: { id: string; go: Go }) {
  const po = useRecord<any>('sap.pos', id)
  const invoices = useCollection<any>('sap.invoices').filter((i) => i.poId === id)
  const { toast } = useDesk()
  const [edit, setEdit] = useState<null | { deliveryDate: string; purchGroup: string; plant: string }>(null)
  const [print, setPrint] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  if (!po) return <div className="p-8 text-[14px]">Purchase order {id} not found.</div>
  const invoiced = invoices.filter((i) => i.status !== 'Cancelled' && i.status !== 'Parked').reduce((t, i) => t + i.gross, 0)
  const save = () => {
    if (!edit) return
    db.update('sap.pos', po.id, { deliveryDate: new Date(edit.deliveryDate + 'T12:00:00').toISOString(), purchGroup: edit.purchGroup, plant: edit.plant, changedOn: new Date().toISOString() })
    setEdit(null)
    setNote(`Purchase order ${po.id} was saved.`)
  }
  return (
    <>
    {print && (
      <Dialog
        title={`Print Preview — Purchase Order ${po.id}`}
        width={720}
        footer={<><Btn kind="emph" icon={<Printer className="w-4 h-4" />} onClick={() => { setPrint(false); toast({ appId: 'sap', title: 'Output sent', body: `Purchase order ${po.id} sent to printer LP01 (Boston HQ, 3rd floor).` }) }}>Print</Btn><Btn kind="transparent" onClick={() => setPrint(false)}>Close</Btn></>}
      >
        <div className="p-6 bg-[#eff1f2]">
          <div className="bg-white shadow p-8 text-[13px] leading-[1.5] font-[Arial]">
            <div className="flex justify-between">
              <div><div className="text-[18px] font-bold">Northwind Global Inc.</div><div>100 Federal St, Boston, MA 02110</div></div>
              <div className="text-right"><div className="text-[18px] font-bold">PURCHASE ORDER</div><div>No. {po.id}</div><div>Date {sapDate(po.docDate)}</div></div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-6">
              <div><div className="font-bold">Supplier</div><div>{po.supplierName}</div><div>Supplier no. {po.supplierId}</div></div>
              <div><div className="font-bold">Deliver to</div><div>{po.plant}</div><div>Requested delivery {sapDate(po.deliveryDate)}</div></div>
            </div>
            <table className="w-full mt-6 border-collapse">
              <thead><tr className="border-b-2 border-black text-left"><th className="py-1">Item</th><th>Description</th><th className="text-right">Qty</th><th className="text-right">Price</th><th className="text-right">Net Value</th></tr></thead>
              <tbody>
                {po.items.map((it: any) => (
                  <tr key={it.item} className="border-b border-[#ccc]"><td className="py-1">{it.item}</td><td>{it.description}</td><td className="text-right">{it.qty} {it.unit}</td><td className="text-right">{usd(it.price)}</td><td className="text-right">{usd(it.net)}</td></tr>
                ))}
              </tbody>
            </table>
            <div className="text-right mt-3 font-bold">Total net value: {usd(po.netAmount)} USD</div>
            <div className="mt-6 text-[12px] text-[#555]">Payment terms: {po.paymentTerms}. Please quote the PO number on all invoices. Invoices to ap@northwind.com.</div>
          </div>
        </div>
      </Dialog>
    )}
    <ObjectPage
      crumbs={[{ label: 'Manage Purchase Orders', onClick: () => go({ app: 'pos' }) }]}
      title={<span data-agent="sap-po-title">Purchase Order {po.id}</span>}
      subtitle={`${po.docType} · ${po.supplierName} (${po.supplierId})`}
      status={<ObjectStatus status={po.status} inverted large />}
      actions={
        edit ? (
          <><Btn kind="emph" data-agent="sap-po-save" onClick={save}>Save</Btn><Btn kind="transparent" onClick={() => setEdit(null)}>Discard Draft</Btn></>
        ) : (
          <>
            <Btn kind="emph" data-agent="sap-po-create-invoice" onClick={() => go({ app: 'createInvoice', poId: po.id })}>Create Supplier Invoice</Btn>
            {po.status === 'In Approval' && (
              <Btn kind="accept" data-agent="sap-po-release" onClick={() => { db.update('sap.pos', po.id, { status: 'Sent', releasedOn: new Date().toISOString(), releasedBy: 'Alex Morgan' }); setNote(`Purchase order ${po.id} was released and sent to ${po.supplierName}.`) }}>Release</Btn>
            )}
            <Btn kind="default" data-agent="sap-po-edit" onClick={() => setEdit({ deliveryDate: isoDate(new Date(po.deliveryDate)), purchGroup: po.purchGroup, plant: po.plant ?? '1010 — Boston HQ' })}>Edit</Btn>
            <Btn kind="default" onClick={() => setPrint(true)}>Print Preview</Btn>
          </>
        )
      }
      facets={[
        { label: 'Net Order Value', value: <span className="text-[20px] font-light">{usd(po.netAmount)} <span className="text-[14px] text-[#556b82]">USD</span></span> },
        { label: 'Invoiced', value: <span className="text-[20px] font-light">{usd(invoiced)} <span className="text-[14px] text-[#556b82]">USD</span></span> },
        { label: 'Payment Terms', value: po.paymentTerms },
        { label: 'Purchasing Group', value: po.purchGroup },
        { label: 'Created By', value: po.createdByName },
      ]}
      sections={[
        {
          title: 'General Information',
          body: (
            <div className="space-y-4">
            {note && <MessageStrip type="success" onClose={() => setNote(null)}>{note}</MessageStrip>}
            {edit ? (
              <Panel><div className="p-5 grid grid-cols-3 gap-x-10 gap-y-4">
                <div><div className="text-[14px] text-[#556b82] mb-1">Delivery Date:</div><Input type="date" aria-label="Delivery Date" value={edit.deliveryDate} onChange={(e) => setEdit({ ...edit, deliveryDate: e.target.value })} /></div>
                <div><div className="text-[14px] text-[#556b82] mb-1">Purchasing Group:</div><Select aria-label="Purchasing Group" value={edit.purchGroup} onChange={(e) => setEdit({ ...edit, purchGroup: e.target.value })}>{PURCH_GROUPS.map((g) => <option key={g}>{g}</option>)}</Select></div>
                <div><div className="text-[14px] text-[#556b82] mb-1">Plant:</div><Select aria-label="Plant" value={edit.plant} onChange={(e) => setEdit({ ...edit, plant: e.target.value })}><option>1010 — Boston HQ</option><option>1020 — Chicago Office</option><option>1030 — Dallas Warehouse</option></Select></div>
              </div></Panel>
            ) : (
            <Panel><div className="p-5"><FormGrid items={[
              ['Supplier', <button key="s" className="text-[#0064d9] hover:underline" onClick={() => go({ app: 'supplier', id: po.supplierId })}>{po.supplierName} ({po.supplierId})</button>],
              ['Company Code', '1010 (Northwind Global Inc.)'],
              ['Purchasing Organization', '1010 (Purch. Org. US)'],
              ['Document Date', sapDate(po.docDate)],
              ['Delivery Date', sapDate(po.deliveryDate)],
              ['Plant', po.plant],
              ...(po.releasedOn ? [['Released', `${sapDate(po.releasedOn)} by ${po.releasedBy}`] as [string, string]] : []),
            ]} /></div></Panel>
            )}
            </div>
          ),
        },
        {
          title: 'Items',
          body: (
            <Panel>
              <div className="h-12 px-4 flex items-center border-b border-[#e5e5e5] text-[16px] font-bold">Items ({po.items.length})</div>
              <Table cols={[{ label: 'Item' }, { label: 'Material' }, { label: 'Short Text' }, { label: 'Order Qty', align: 'right' }, { label: 'Unit' }, { label: 'Net Price', align: 'right' }, { label: 'Net Value', align: 'right' }, { label: 'Received', align: 'right' }, { label: 'Invoiced', align: 'right' }, { label: 'G/L Account' }, { label: 'Cost Center' }]}>
                {po.items.map((it: any) => (
                  <tr key={it.item} className="h-[33px] border-b border-[#e5e5e5]">
                    <td className="px-2">{it.item}</td><td className="px-2">{it.material}</td><td className="px-2">{it.description}</td>
                    <td className="px-2 text-right">{it.qty}</td><td className="px-2">{it.unit}</td>
                    <td className="px-2 text-right">{usd(it.price)}</td><td className="px-2 text-right font-semibold">{usd(it.net)} USD</td>
                    <td className="px-2 text-right">{it.grQty}</td><td className="px-2 text-right">{it.invQty}</td>
                    <td className="px-2">{it.glAccount}</td><td className="px-2">{it.costCenter}</td>
                  </tr>
                ))}
              </Table>
            </Panel>
          ),
        },
        {
          title: 'Purchase Order History',
          body: (
            <Panel>
              <Table cols={[{ label: 'Transaction' }, { label: 'Document' }, { label: 'Posting Date' }, { label: 'Amount', align: 'right' }, { label: 'Status' }]}>
                <tr className="h-[33px] border-b border-[#e5e5e5]"><td className="px-2">Service Entry Sheet</td><td className="px-2">5000{po.id.slice(-6)}</td><td className="px-2">{sapDate(po.deliveryDate)}</td><td className="px-2 text-right">{usd(po.netAmount)} USD</td><td className="px-2"><ObjectStatus status="Posted" /></td></tr>
                {invoices.map((i) => (
                  <tr key={i.id} className="h-[33px] border-b border-[#e5e5e5] hover:bg-[#eaecee] cursor-pointer" onClick={() => go({ app: 'invoice', id: i.id })}>
                    <td className="px-2">Supplier Invoice</td><td className="px-2 text-[#0064d9]">{i.id}</td><td className="px-2">{sapDate(i.postingDate)}</td><td className="px-2 text-right">{usd(i.gross)} USD</td><td className="px-2"><ObjectStatus status={i.status} /></td>
                  </tr>
                ))}
              </Table>
            </Panel>
          ),
        },
      ]}
    />
    </>
  )
}
