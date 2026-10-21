import { useCollection, useRecord } from '@/db/db'
import { Btn, ObjectStatus, Table, usd, sapDate, HWChip } from './ui'
import { ListReport, ObjectPage, Panel, FormGrid } from './ListReport'
import type { Go } from './index'

export function JournalList({ go }: { go: Go }) {
  const rows = useCollection<any>('sap.journals')
  return (
    <ListReport
      title="Manage Journal Entries"
      tableTitle="Journal Entries"
      agentPrefix="sap-je"
      rows={rows}
      searchKeys={(r) => `${r.id} ${r.header} ${r.reference}`}
      filters={[
        { label: 'Journal Entry Type', key: 'type', options: ['RE', 'SA', 'KZ'] },
        { label: 'Company Code', key: 'companyCode', options: ['1010'] },
      ]}
      onOpen={(r) => go({ app: 'journal', id: r.id })}
      actions={<><Btn kind="transparent">Post General Journal Entry</Btn><Btn kind="transparent">Reverse</Btn></>}
      cols={[
        { label: 'Journal Entry', render: (r) => <span className="text-[#0064d9] font-semibold">{r.id}</span> },
        { label: 'Type', render: (r) => `${r.type} (${r.typeText})` },
        { label: 'Header Text', render: (r) => <span>{r.header} {r.createdBy === 'hworker' && <HWChip />}</span> },
        { label: 'Reference', render: (r) => r.reference },
        { label: 'Posting Date', render: (r) => sapDate(r.postingDate) },
        { label: 'Amount', align: 'right', render: (r) => <span className="font-semibold">{usd(r.amount)} <span className="font-normal text-[#556b82]">USD</span></span> },
        { label: 'Created By', render: (r) => r.createdByName },
      ]}
    />
  )
}

export function JournalObject({ id, go }: { id: string; go: Go }) {
  const je = useRecord<any>('sap.journals', id)
  if (!je) return <div className="p-8 text-[14px]">Journal entry {id} not found.</div>
  return (
    <ObjectPage
      crumbs={[{ label: 'Manage Journal Entries', onClick: () => go({ app: 'journals' }) }]}
      title={`Journal Entry ${je.id}`}
      subtitle={`${je.type} (${je.typeText}) · Company Code 1010 · Fiscal Year ${je.fiscalYear}`}
      status={<ObjectStatus status="Posted" inverted large />}
      actions={<><Btn kind="default">Reverse</Btn><Btn kind="default">Display T-Accounts</Btn></>}
      facets={[
        { label: 'Amount', value: <span className="text-[20px] font-light">{usd(je.amount)} <span className="text-[14px] text-[#556b82]">USD</span></span> },
        { label: 'Posting Date', value: sapDate(je.postingDate) },
        { label: 'Reference', value: je.reference },
        { label: 'Source Document', value: je.sourceInvoiceId ? <button className="text-[#0064d9] hover:underline" onClick={() => go({ app: 'invoice', id: je.sourceInvoiceId })}>Supplier Invoice {je.sourceInvoiceId}</button> : 'Manual entry' },
      ]}
      sections={[
        { title: 'Header', body: <Panel><div className="p-5"><FormGrid items={[['Header Text', je.header], ['Document Date', sapDate(je.docDate)], ['Created By', je.createdByName], ['Ledger', '0L (Leading Ledger)'], ['Currency', je.currency], ['Ledger Group', 'All']]} /></div></Panel> },
        {
          title: 'Line Items',
          body: (
            <Panel>
              <Table cols={[{ label: 'Item' }, { label: 'G/L Account' }, { label: 'G/L Account Name' }, { label: 'Debit', align: 'right' }, { label: 'Credit', align: 'right' }, { label: 'Cost Center' }, { label: 'Item Text' }]}>
                {je.lines.map((l: any, i: number) => (
                  <tr key={i} className="h-[33px] border-b border-[#e5e5e5]">
                    <td className="px-2">{String(i + 1).padStart(3, '0')}</td><td className="px-2">{l.gl}</td><td className="px-2">{l.glName}</td>
                    <td className="px-2 text-right">{l.debit ? usd(l.debit) : ''}</td><td className="px-2 text-right">{l.credit ? usd(l.credit) : ''}</td>
                    <td className="px-2">{l.costCenter ?? ''}</td><td className="px-2">{l.text ?? ''}</td>
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
