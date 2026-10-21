import { useCollection, useRecord } from '@/db/db'
import { Btn, ObjectStatus, Table, usd, sapDate } from './ui'
import { ListReport, ObjectPage, Panel, FormGrid } from './ListReport'
import type { Go } from './index'

export function PoList({ go }: { go: Go }) {
  const rows = useCollection<any>('sap.pos')
  return (
    <ListReport
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
      actions={<><Btn kind="transparent">Create</Btn><Btn kind="transparent">Copy</Btn><Btn kind="transparent">Delete</Btn></>}
      cols={[
        { label: 'Purchase Order', render: (r) => <span className="text-[#0064d9] font-semibold">{r.id}</span> },
        { label: 'Supplier', render: (r) => <span>{r.supplierName} <span className="text-[#556b82]">({r.supplierId})</span></span> },
        { label: 'Short Text', render: (r) => <span className="truncate inline-block max-w-[260px] align-middle">{r.items[0]?.description}{r.items.length > 1 ? ` +${r.items.length - 1}` : ''}</span> },
        { label: 'Purchasing Group', render: (r) => r.purchGroup },
        { label: 'Created On', render: (r) => sapDate(r.docDate) },
        { label: 'Net Order Value', align: 'right', render: (r) => <span className="font-semibold">{usd(r.netAmount)} <span className="text-[#556b82] font-normal">USD</span></span> },
        { label: 'Status', render: (r) => <ObjectStatus status={r.status} /> },
      ]}
    />
  )
}

export function PoObject({ id, go }: { id: string; go: Go }) {
  const po = useRecord<any>('sap.pos', id)
  const invoices = useCollection<any>('sap.invoices').filter((i) => i.poId === id)
  if (!po) return <div className="p-8 text-[14px]">Purchase order {id} not found.</div>
  const invoiced = invoices.reduce((t, i) => t + i.gross, 0)
  return (
    <ObjectPage
      crumbs={[{ label: 'Manage Purchase Orders', onClick: () => go({ app: 'pos' }) }]}
      title={<span data-agent="sap-po-title">Purchase Order {po.id}</span>}
      subtitle={`${po.docType} · ${po.supplierName} (${po.supplierId})`}
      status={<ObjectStatus status={po.status} inverted large />}
      actions={<><Btn kind="emph" data-agent="sap-po-create-invoice" onClick={() => go({ app: 'createInvoice', poId: po.id })}>Create Supplier Invoice</Btn><Btn kind="default">Edit</Btn><Btn kind="default">Print Preview</Btn></>}
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
            <Panel><div className="p-5"><FormGrid items={[
              ['Supplier', <button key="s" className="text-[#0064d9] hover:underline" onClick={() => go({ app: 'supplier', id: po.supplierId })}>{po.supplierName} ({po.supplierId})</button>],
              ['Company Code', '1010 (Northwind Global Inc.)'],
              ['Purchasing Organization', '1010 (Purch. Org. US)'],
              ['Document Date', sapDate(po.docDate)],
              ['Delivery Date', sapDate(po.deliveryDate)],
              ['Plant', po.plant],
            ]} /></div></Panel>
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
                  <tr key={i.id} className="h-[33px] border-b border-[#e5e5e5] hover:bg-[#eaecee]" onClick={() => go({ app: 'invoice', id: i.id })}>
                    <td className="px-2">Supplier Invoice</td><td className="px-2 text-[#0064d9]">{i.id}</td><td className="px-2">{sapDate(i.postingDate)}</td><td className="px-2 text-right">{usd(i.gross)} USD</td><td className="px-2"><ObjectStatus status={i.status} /></td>
                  </tr>
                ))}
              </Table>
            </Panel>
          ),
        },
      ]}
    />
  )
}
