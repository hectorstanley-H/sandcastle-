import { useCollection, useRecord } from '@/db/db'
import { Btn, ObjectStatus, Table, usd, sapDate, HWChip, MessageStrip } from './ui'
import { ListReport, ObjectPage, Panel, FormGrid } from './ListReport'
import type { Go } from './index'

const recent = (r: any) => r.createdBy === 'hworker' && Date.now() - +new Date(r.createdAt) < 10 * 60000

export function InvoiceList({ go }: { go: Go }) {
  const rows = useCollection<any>('sap.invoices')
  const sorted = [...rows].sort((a, b) => (a.id < b.id ? 1 : -1))
  return (
    <ListReport
      title="Manage Supplier Invoices"
      tableTitle="Supplier Invoices"
      agentPrefix="sap-inv"
      rows={sorted}
      searchKeys={(r) => `${r.id} ${r.supplierName} ${r.reference} ${r.poId}`}
      filters={[
        { label: 'Company Code', key: 'companyCode', options: ['1010'] },
        { label: 'Invoicing Party', key: 'supplierName', options: [...new Set(rows.map((r) => r.supplierName))].sort() },
        { label: 'Status', key: 'status', options: ['Posted', 'Paid', 'Parked', 'Blocked for Payment'] },
      ]}
      onOpen={(r) => go({ app: 'invoice', id: r.id })}
      flash={recent}
      actions={
        <>
          <Btn kind="transparent" onClick={() => go({ app: 'createInvoice' })} data-agent="sap-inv-create">Create</Btn>
          <Btn kind="transparent">Copy</Btn>
          <Btn kind="transparent">Cancel Invoice</Btn>
        </>
      }
      cols={[
        { label: 'Supplier Invoice', render: (r) => <span className="text-[#0064d9] font-semibold">{r.id}</span> },
        { label: 'Fiscal Year', render: (r) => r.fiscalYear },
        { label: 'Company Code', render: (r) => r.companyCode },
        { label: 'Invoicing Party', render: (r) => <span>{r.supplierName} <span className="text-[#556b82]">({r.supplierId})</span> {r.createdBy === 'hworker' && <HWChip />}</span> },
        { label: 'Reference', render: (r) => r.reference },
        { label: 'Purchase Order', render: (r) => r.poId },
        { label: 'Document Date', render: (r) => sapDate(r.invoiceDate) },
        { label: 'Gross Amount', align: 'right', render: (r) => <span className="font-semibold">{usd(r.gross)} <span className="text-[#556b82] font-normal">USD</span></span> },
        { label: 'Status', render: (r) => <ObjectStatus status={r.status} /> },
      ]}
    />
  )
}

export function InvoiceObject({ id, go }: { id: string; go: Go }) {
  const inv = useRecord<any>('sap.invoices', id)
  const sup = useRecord<any>('sap.suppliers', inv?.supplierId)
  const je = useRecord<any>('sap.journals', inv?.journalId)
  if (!inv) return <div className="p-8 text-[14px]">Supplier invoice {id} not found.</div>
  const fresh = recent(inv)
  return (
    <ObjectPage
      crumbs={[{ label: 'Manage Supplier Invoices', onClick: () => go({ app: 'invoices' }) }]}
      title={<span data-agent="sap-invoice-title">Supplier Invoice {inv.id}</span>}
      badge={inv.createdBy === 'hworker' ? <HWChip text="Posted by H-Worker" /> : null}
      subtitle={`${inv.supplierName} (${inv.supplierId}) · Fiscal Year ${inv.fiscalYear}`}
      status={<ObjectStatus status={inv.status} inverted large />}
      actions={<><Btn kind="default">Copy</Btn><Btn kind="default">Cancel Invoice</Btn><Btn kind="transparent">Related Apps</Btn></>}
      facets={[
        { label: 'Gross Invoice Amount', value: <span className="text-[20px] font-light">{usd(inv.gross)} <span className="text-[14px] text-[#556b82]">USD</span></span> },
        { label: 'Due Date', value: <span data-agent="sap-invoice-due">{sapDate(inv.dueDate)}</span> },
        { label: 'Payment Terms', value: `${inv.paymentTerms} (${sup?.termsText ?? ''})` },
        { label: 'Reference', value: inv.reference },
        { label: 'Journal Entry', value: inv.journalId ? <button className="text-[#0064d9] hover:underline" onClick={() => go({ app: 'journal', id: inv.journalId })}>{inv.journalId}</button> : '—' },
      ]}
      sections={[
        {
          title: 'General Information',
          body: (
            <div className="space-y-4">
              {fresh && <MessageStrip type="success">Document {inv.id} was posted by H-Worker on behalf of Alex Morgan at {new Date(inv.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}.</MessageStrip>}
              <Panel>
                <div className="p-5">
                  <FormGrid
                    items={[
                      ['Company Code', '1010 (Northwind Global Inc.)'],
                      ['Invoicing Party', <button key="s" className="text-[#0064d9] hover:underline" onClick={() => go({ app: 'supplier', id: inv.supplierId })}>{inv.supplierName} ({inv.supplierId})</button>],
                      ['Document Type', 'RE (Gross Invoice Receipt)'],
                      ['Invoice Date', sapDate(inv.invoiceDate)],
                      ['Posting Date', sapDate(inv.postingDate)],
                      ['Tax Code', `${inv.taxCode} (0%)`],
                      ['Tax Amount', `${usd(inv.tax)} USD`],
                      ['Payment Block', inv.paymentBlock ?? 'Free for Payment'],
                      ['Created By', `${inv.createdByName}${inv.createdBy === 'hworker' ? ' (via H-Worker)' : ''}`],
                    ]}
                  />
                </div>
              </Panel>
            </div>
          ),
        },
        {
          title: 'Items',
          body: (
            <Panel>
              <div className="h-12 px-4 flex items-center border-b border-[#e5e5e5] text-[16px] font-bold">Purchase Order Reference ({inv.items?.length ?? 0})</div>
              <Table cols={[{ label: 'Purchase Order' }, { label: 'Item' }, { label: 'Description' }, { label: 'Quantity', align: 'right' }, { label: 'Unit' }, { label: 'Amount', align: 'right' }, { label: 'Tax Code' }]}>
                {(inv.items ?? []).map((it: any) => (
                  <tr key={it.poId + it.item} className="h-[33px] border-b border-[#e5e5e5]">
                    <td className="px-2"><button className="text-[#0064d9] hover:underline" onClick={() => go({ app: 'po', id: it.poId })}>{it.poId}</button></td>
                    <td className="px-2">{it.item}</td>
                    <td className="px-2">{it.description}</td>
                    <td className="px-2 text-right">{Number(it.qty).toLocaleString('en-US', { minimumFractionDigits: 3 })}</td>
                    <td className="px-2">{it.unit}</td>
                    <td className="px-2 text-right">{usd(it.amount)} USD</td>
                    <td className="px-2">{it.taxCode}</td>
                  </tr>
                ))}
              </Table>
            </Panel>
          ),
        },
        {
          title: 'Accounting Documents',
          body: je ? (
            <Panel>
              <Table cols={[{ label: 'Journal Entry' }, { label: 'G/L Account' }, { label: 'Account Name' }, { label: 'Debit', align: 'right' }, { label: 'Credit', align: 'right' }]}>
                {je.lines.map((l: any, i: number) => (
                  <tr key={i} className="h-[33px] border-b border-[#e5e5e5]">
                    <td className="px-2">{i === 0 ? <button className="text-[#0064d9] hover:underline" onClick={() => go({ app: 'journal', id: je.id })}>{je.id}</button> : ''}</td>
                    <td className="px-2">{l.gl}</td>
                    <td className="px-2">{l.glName}</td>
                    <td className="px-2 text-right">{l.debit ? usd(l.debit) : ''}</td>
                    <td className="px-2 text-right">{l.credit ? usd(l.credit) : ''}</td>
                  </tr>
                ))}
              </Table>
            </Panel>
          ) : (
            <div className="text-[14px] text-[#556b82]">No accounting document (invoice is parked).</div>
          ),
        },
        {
          title: 'Process Flow',
          body: (
            <div className="flex items-center gap-3">
              {[['Purchase Order', inv.poId, 'Released'], ['Goods/Service Receipt', `5000${String(inv.poId ?? '').slice(-6)}`, 'Posted'], ['Supplier Invoice', inv.id, inv.status], ['Payment', inv.status === 'Paid' ? '1500' + inv.id.slice(-6) : `Planned ${sapDate(inv.dueDate)}`, inv.status === 'Paid' ? 'Cleared' : 'Open']].map(([a, b, c], i) => (
                <div key={a} className="flex items-center gap-3">
                  <div className={`w-[200px] rounded-xl border-2 p-3 bg-white ${c === 'Open' ? 'border-[#bcc3ca] border-dashed' : 'border-[#30914c]'}`}>
                    <div className="text-[14px] font-bold">{a}</div>
                    <div className="text-[13px] text-[#0064d9]">{b}</div>
                    <div className="text-[12px] text-[#556b82] mt-1">{c}</div>
                  </div>
                  {i < 3 && <div className="w-8 h-0.5 bg-[#bcc3ca]" />}
                </div>
              ))}
            </div>
          ),
        },
      ]}
    />
  )
}
