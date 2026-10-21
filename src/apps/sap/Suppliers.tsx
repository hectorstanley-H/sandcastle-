import { useCollection, useRecord } from '@/db/db'
import { Btn, ObjectStatus, Table, usd, sapDate } from './ui'
import { ListReport, ObjectPage, Panel, FormGrid } from './ListReport'
import type { Go } from './index'

export function SupplierList({ go }: { go: Go }) {
  const rows = useCollection<any>('sap.suppliers')
  return (
    <ListReport
      title="Display Supplier List"
      tableTitle="Suppliers"
      agentPrefix="sap-sup"
      rows={rows}
      searchKeys={(r) => `${r.id} ${r.name} ${r.city}`}
      filters={[
        { label: 'Supplier Category', key: 'category', options: [...new Set(rows.map((r) => r.category))].sort() },
        { label: 'Region', key: 'region', options: [...new Set(rows.map((r) => r.region))].sort() },
      ]}
      onOpen={(r) => go({ app: 'supplier', id: r.id })}
      actions={<Btn kind="transparent">Create Business Partner</Btn>}
      cols={[
        { label: 'Supplier', render: (r) => <span className="text-[#0064d9] font-semibold">{r.id}</span> },
        { label: 'Name', render: (r) => r.name },
        { label: 'City', render: (r) => `${r.city}, ${r.region}` },
        { label: 'Country', render: () => 'United States' },
        { label: 'Category', render: (r) => r.category },
        { label: 'Payment Terms', render: (r) => r.paymentTerms },
        { label: 'Central Posting Block', render: (r) => <ObjectStatus status={r.blocked ? 'Blocked' : 'Active'} /> },
      ]}
    />
  )
}

export function SupplierObject({ id, go }: { id: string; go: Go }) {
  const s = useRecord<any>('sap.suppliers', id)
  const invoices = useCollection<any>('sap.invoices').filter((i) => i.supplierId === id)
  const pos = useCollection<any>('sap.pos').filter((p) => p.supplierId === id)
  if (!s) return <div className="p-8 text-[14px]">Supplier {id} not found.</div>
  const open = invoices.filter((i) => i.status !== 'Paid').reduce((t, i) => t + i.gross, 0)
  return (
    <ObjectPage
      crumbs={[{ label: 'Display Supplier List', onClick: () => go({ app: 'suppliers' }) }]}
      title={s.name}
      subtitle={`Supplier ${s.id} · ${s.category}`}
      status={<ObjectStatus status={s.blocked ? 'Blocked' : 'Active'} inverted large />}
      actions={<Btn kind="default">Edit Business Partner</Btn>}
      facets={[
        { label: 'Open Payables', value: <span className="text-[20px] font-light">{usd(open)} <span className="text-[14px] text-[#556b82]">USD</span></span> },
        { label: 'Purchase Orders', value: pos.length },
        { label: 'Payment Terms', value: `${s.paymentTerms} (${s.termsText})` },
        { label: 'Email', value: <span className="text-[#0064d9]">{s.email}</span> },
      ]}
      sections={[
        { title: 'Address', body: <Panel><div className="p-5"><FormGrid items={[['Street', s.street], ['City', `${s.city}, ${s.region} ${s.postal}`], ['Country', 'United States'], ['Telephone', s.phone], ['Tax Number (EIN)', s.taxNumber], ['Created On', sapDate(s.createdOn)]]} /></div></Panel> },
        { title: 'Payment Data', body: <Panel><div className="p-5"><FormGrid items={[['Bank Account', s.bank], ['Reconciliation Account', '211000'], ['Payment Methods', 'T (ACH), C (Check)'], ['Account Group', s.accountGroup], ['Purchasing Org.', s.purchOrg], ['Order Currency', 'USD']]} /></div></Panel> },
        {
          title: 'Supplier Invoices',
          body: (
            <Panel>
              <Table cols={[{ label: 'Supplier Invoice' }, { label: 'Reference' }, { label: 'Date' }, { label: 'Gross Amount', align: 'right' }, { label: 'Status' }]}>
                {invoices.slice(0, 12).map((i) => (
                  <tr key={i.id} className="h-[33px] border-b border-[#e5e5e5] hover:bg-[#eaecee]" onClick={() => go({ app: 'invoice', id: i.id })}>
                    <td className="px-2 text-[#0064d9]">{i.id}</td><td className="px-2">{i.reference}</td><td className="px-2">{sapDate(i.invoiceDate)}</td><td className="px-2 text-right">{usd(i.gross)} USD</td><td className="px-2"><ObjectStatus status={i.status} /></td>
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
