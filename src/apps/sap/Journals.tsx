import { useState } from 'react'
import { useCollection, useRecord } from '@/db/db'
import { Btn, ObjectStatus, Table, usd, sapDate, HWChip, Dialog, Field, Select, MessageStrip } from './ui'
import { ListReport, ObjectPage, Panel, FormGrid } from './ListReport'
import { reverseJournal } from './gl'
import type { Go } from './index'

function ReverseDialog({ count, onCancel, onConfirm }: { count: number; onCancel: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState('01 — Reversal in current period')
  return (
    <Dialog title={count > 1 ? `Reverse ${count} Journal Entries` : 'Reverse Journal Entry'} width={460} footer={<><Btn kind="emph" data-agent="sap-je-reverse-confirm" onClick={() => onConfirm(reason)}>Reverse</Btn><Btn kind="transparent" onClick={onCancel}>Cancel</Btn></>}>
      <div className="p-5 space-y-4 text-[14px]">
        <div>A reversal document with swapped debit and credit amounts will be posted with today’s posting date.</div>
        <Field label="Reversal Reason" required>
          <Select aria-label="Reversal Reason" value={reason} onChange={(e) => setReason(e.target.value)}>
            <option>01 — Reversal in current period</option>
            <option>02 — Reversal in closed period</option>
            <option>04 — Accrual reversal</option>
          </Select>
        </Field>
      </div>
    </Dialog>
  )
}

export function JournalList({ go }: { go: Go }) {
  const rows = useCollection<any>('sap.journals')
  const [rev, setRev] = useState<any[] | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  return (
    <>
    {msg && <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 w-[560px]"><MessageStrip type="success" onClose={() => setMsg(null)}>{msg}</MessageStrip></div>}
    {rev && (
      <ReverseDialog
        count={rev.length}
        onCancel={() => setRev(null)}
        onConfirm={(reason) => {
          const ids = rev.map((j) => reverseJournal(j, reason))
          setMsg(`Reversal document${ids.length > 1 ? 's' : ''} ${ids.join(', ')} posted.`)
          setRev(null)
        }}
      />
    )}
    <ListReport
      title="Manage Journal Entries"
      tableTitle="Journal Entries"
      agentPrefix="sap-je"
      rows={rows}
      searchKeys={(r) => `${r.id} ${r.header} ${r.reference}`}
      filters={[
        { label: 'Journal Entry Type', key: 'type', options: ['RE', 'SA', 'KZ', 'AB', 'AA'] },
        { label: 'Company Code', key: 'companyCode', options: ['1010'] },
      ]}
      onOpen={(r) => go({ app: 'journal', id: r.id })}
      actions={(sel, clear) => (
        <>
          <Btn kind="transparent" data-agent="sap-je-post-new" onClick={() => go({ app: 'postJournal' })}>Post General Journal Entry</Btn>
          <Btn
            kind="transparent"
            disabled={!sel.length || sel.some((j) => j.reversedBy || j.reversalOf)}
            onClick={() => {
              setRev(sel)
              clear()
            }}
          >
            Reverse
          </Btn>
        </>
      )}
      cols={[
        { label: 'Journal Entry', render: (r) => <span className="text-[#0064d9] font-semibold">{r.id}</span>, sort: (r) => r.id },
        { label: 'Type', render: (r) => `${r.type} (${r.typeText})`, sort: (r) => r.type },
        { label: 'Header Text', render: (r) => <span>{r.header} {r.createdBy === 'hworker' && <HWChip />} {r.reversedBy && <ObjectStatus status="Reversed" />}</span>, sort: (r) => r.header ?? '' },
        { label: 'Reference', render: (r) => r.reference, sort: (r) => r.reference ?? '' },
        { label: 'Posting Date', render: (r) => sapDate(r.postingDate), sort: (r) => r.postingDate ?? '' },
        { label: 'Amount', align: 'right', render: (r) => <span className="font-semibold">{usd(r.amount)} <span className="font-normal text-[#556b82]">USD</span></span>, sort: (r) => r.amount },
        { label: 'Created By', render: (r) => r.createdByName, sort: (r) => r.createdByName ?? '' },
      ]}
    />
    </>
  )
}

export function JournalObject({ id, go }: { id: string; go: Go }) {
  const je = useRecord<any>('sap.journals', id)
  const [dlg, setDlg] = useState(false)
  const [taccounts, setTaccounts] = useState(false)
  if (!je) return <div className="p-8 text-[14px]">Journal entry {id} not found.</div>
  const accounts = [...new Set<string>(je.lines.map((l: any) => l.gl))]
  return (
    <>
    {dlg && (
      <ReverseDialog
        count={1}
        onCancel={() => setDlg(false)}
        onConfirm={(reason) => {
          reverseJournal(je, reason)
          setDlg(false)
        }}
      />
    )}
    <ObjectPage
      crumbs={[{ label: 'Manage Journal Entries', onClick: () => go({ app: 'journals' }) }]}
      title={`Journal Entry ${je.id}`}
      subtitle={`${je.type} (${je.typeText}) · Company Code 1010 · Fiscal Year ${je.fiscalYear}`}
      status={<ObjectStatus status={je.reversedBy ? 'Reversed' : 'Posted'} inverted large />}
      actions={
        <>
          <Btn kind="default" data-agent="sap-je-reverse" disabled={!!je.reversedBy || !!je.reversalOf} onClick={() => setDlg(true)}>Reverse</Btn>
          <Btn kind={taccounts ? 'emph' : 'default'} data-agent="sap-je-taccounts" onClick={() => setTaccounts((t) => !t)}>{taccounts ? 'Hide T-Accounts' : 'Display T-Accounts'}</Btn>
        </>
      }
      facets={[
        { label: 'Amount', value: <span className="text-[20px] font-light">{usd(je.amount)} <span className="text-[14px] text-[#556b82]">USD</span></span> },
        { label: 'Posting Date', value: sapDate(je.postingDate) },
        { label: 'Reference', value: je.reference },
        ...(je.reversedBy ? [{ label: 'Reversed By', value: <button className="text-[#0064d9] hover:underline" onClick={() => go({ app: 'journal', id: je.reversedBy })}>{je.reversedBy}</button> }] : []),
        ...(je.reversalOf ? [{ label: 'Reversal Of', value: <button className="text-[#0064d9] hover:underline" onClick={() => go({ app: 'journal', id: je.reversalOf })}>{je.reversalOf}</button> }] : []),
        { label: 'Source Document', value: je.sourceInvoiceId ? <button className="text-[#0064d9] hover:underline" onClick={() => go({ app: 'invoice', id: je.sourceInvoiceId })}>Supplier Invoice {je.sourceInvoiceId}</button> : 'Manual entry' },
      ]}
      sections={[
        ...(taccounts
          ? [{
              title: 'T-Accounts',
              body: (
                <div className="flex flex-wrap gap-5">
                  {accounts.map((gl) => {
                    const ls = je.lines.filter((l: any) => l.gl === gl)
                    const dr = ls.reduce((t: number, l: any) => t + (l.debit || 0), 0)
                    const cr = ls.reduce((t: number, l: any) => t + (l.credit || 0), 0)
                    return (
                      <div key={gl} className="w-[320px] bg-white rounded-xl shadow-[0_0_0.125rem_rgba(34,53,72,0.15),0_0.125rem_0.5rem_rgba(34,53,72,0.15)] p-4 text-[14px]">
                        <button className="font-bold text-[#0064d9] hover:underline" onClick={() => go({ app: 'glAccount', id: gl })}>{gl}</button>
                        <div className="text-[13px] text-[#556b82] truncate mb-2">{ls[0]?.glName}</div>
                        <div className="grid grid-cols-2 border-t-2 border-[#1d2d3e]">
                          <div className="border-r-2 border-[#1d2d3e] pr-2 pt-1 min-h-[48px]">
                            <div className="text-[12px] text-[#556b82]">Debit</div>
                            {ls.filter((l: any) => l.debit).map((l: any, i: number) => <div key={i} className="text-right">{usd(l.debit)}</div>)}
                          </div>
                          <div className="pl-2 pt-1">
                            <div className="text-[12px] text-[#556b82]">Credit</div>
                            {ls.filter((l: any) => l.credit).map((l: any, i: number) => <div key={i} className="text-right">{usd(l.credit)}</div>)}
                          </div>
                        </div>
                        <div className="mt-2 pt-1 border-t border-[#e5e5e5] flex justify-between font-semibold"><span>Balance</span><span>{usd(dr - cr)}</span></div>
                      </div>
                    )
                  })}
                </div>
              ),
            }]
          : []),
        { title: 'Header', body: <Panel><div className="p-5"><FormGrid items={[['Header Text', je.header], ['Document Date', sapDate(je.docDate)], ['Created By', je.createdByName], ['Ledger', '0L (Leading Ledger)'], ['Currency', je.currency], ['Ledger Group', 'All']]} /></div></Panel> },
        {
          title: 'Line Items',
          body: (
            <Panel>
              <Table cols={[{ label: 'Item' }, { label: 'G/L Account' }, { label: 'G/L Account Name' }, { label: 'Debit', align: 'right' }, { label: 'Credit', align: 'right' }, { label: 'Cost Center' }, { label: 'Item Text' }]}>
                {je.lines.map((l: any, i: number) => (
                  <tr key={i} className="h-[33px] border-b border-[#e5e5e5]">
                    <td className="px-2">{String(i + 1).padStart(3, '0')}</td><td className="px-2"><button className="text-[#0064d9] hover:underline" onClick={() => go({ app: 'glAccount', id: l.gl })}>{l.gl}</button></td><td className="px-2">{l.glName}</td>
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
    </>
  )
}
