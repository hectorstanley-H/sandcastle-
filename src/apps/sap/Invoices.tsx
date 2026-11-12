import { useState } from 'react'
import { ChevronDown, ExternalLink } from 'lucide-react'
import { db, useCollection, useRecord } from '@/db/db'
import { Btn, ObjectStatus, Table, usd, sapDate, HWChip, MessageStrip, Dialog, Field, Select, TextArea, Dropdown, MenuItem, MenuSep } from './ui'
import { ListReport, ObjectPage, Panel, FormGrid } from './ListReport'
import { BLOCK_REASONS, glName, nextId, reverseJournal } from './gl'
import type { Go } from './index'

/** Post a parked supplier invoice: creates its RE journal entry and updates the PO history. */
export function postParkedInvoice(inv: any) {
  const jid = nextId('sap.journals', 100004500)
  const now = new Date().toISOString()
  const items = inv.items ?? []
  const glItems = inv.glItems ?? []
  db.insert(
    'sap.journals',
    {
      id: jid,
      fiscalYear: '2026',
      companyCode: '1010',
      type: 'RE',
      typeText: 'Gross Invoice Receipt',
      postingDate: now,
      docDate: inv.invoiceDate,
      reference: inv.reference,
      header: `${inv.supplierName} invoice`,
      amount: inv.gross,
      currency: inv.currency ?? 'USD',
      sourceInvoiceId: inv.id,
      lines: [
        ...items.map((i: any) => ({ gl: '211100', glName: 'GR/IR Clearing', debit: i.amount, credit: 0, text: `PO ${i.poId}/${i.item}` })),
        ...glItems.map((g: any) => ({ gl: g.gl, glName: glName(g.gl), debit: g.amount, credit: 0, costCenter: g.costCenter, text: g.text })),
        ...(inv.tax ? [{ gl: '154000', glName: 'Input Tax', debit: inv.tax, credit: 0, text: inv.taxCode }] : []),
        { gl: '211000', glName: `Accounts Payable — Domestic · ${inv.supplierName}`, debit: 0, credit: inv.gross, text: inv.supplierId },
      ],
      createdByName: 'Alex Morgan',
    },
    { prepend: true },
  )
  db.update('sap.invoices', inv.id, { status: 'Posted', journalId: jid, postingDate: now })
  for (const poId of new Set<string>(items.map((i: any) => i.poId))) {
    db.update('sap.pos', poId, (p) => ({
      status: 'Completely Invoiced',
      items: p.items.map((it: any) => (items.some((s: any) => s.poId === poId && s.item === it.item) ? { ...it, invQty: it.qty } : it)),
    }))
  }
  return jid
}

/** Cancel (reverse) a posted supplier invoice. */
export function cancelInvoice(inv: any, reason: string) {
  const je = inv.journalId ? db.find<any>('sap.journals', inv.journalId) : undefined
  const rev = je && !je.reversedBy ? reverseJournal(je, reason) : undefined
  db.update('sap.invoices', inv.id, { status: 'Cancelled', paymentBlock: undefined, cancelReason: reason, cancelledOn: new Date().toISOString(), reversalJournalId: rev })
  for (const poId of new Set<string>((inv.items ?? []).map((i: any) => i.poId).filter(Boolean))) {
    const others = db.get<any>('sap.invoices').some((i) => i.id !== inv.id && i.poId === poId && i.status !== 'Cancelled' && i.status !== 'Parked')
    db.update('sap.pos', poId, (p) => ({
      status: others ? 'Partially Invoiced' : p.status === 'Completely Invoiced' || p.status === 'Partially Invoiced' ? 'Sent' : p.status,
      items: p.items.map((it: any) => ((inv.items ?? []).some((s: any) => s.poId === poId && s.item === it.item) ? { ...it, invQty: 0 } : it)),
    }))
  }
  return rev
}

export const setPaymentBlock = (id: string, reason: string | null) =>
  db.update('sap.invoices', id, reason ? { status: 'Blocked for Payment', paymentBlock: reason } : { status: 'Posted', paymentBlock: undefined })

/** Dialog asking for a reversal reason. */
export function CancelDialog({ count, onCancel, onConfirm }: { count: number; onCancel: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState('01 — Reversal in current period')
  return (
    <Dialog
      title={count > 1 ? `Cancel ${count} Supplier Invoices` : 'Cancel Supplier Invoice'}
      width={480}
      footer={<><Btn kind="emph" data-agent="sap-inv-cancel-confirm" onClick={() => onConfirm(reason)}>Cancel Invoice</Btn><Btn kind="transparent" onClick={onCancel}>Close</Btn></>}
    >
      <div className="p-5 space-y-4 text-[14px]">
        <div>The selected supplier invoice{count > 1 ? 's' : ''} will be reversed. A reversal journal entry is posted and the purchase order history is updated.</div>
        <Field label="Reversal Reason" required>
          <Select aria-label="Reversal Reason" value={reason} onChange={(e) => setReason(e.target.value)}>
            <option>01 — Reversal in current period</option>
            <option>02 — Reversal in closed period</option>
            <option>05 — Duplicate invoice</option>
            <option>06 — Incorrect amount</option>
          </Select>
        </Field>
      </div>
    </Dialog>
  )
}

export function BlockDialog({ count, onCancel, onConfirm }: { count: number; onCancel: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState(BLOCK_REASONS[1])
  return (
    <Dialog title="Set Payment Block" width={460} footer={<><Btn kind="emph" data-agent="sap-block-confirm" onClick={() => onConfirm(reason)}>Block</Btn><Btn kind="transparent" onClick={onCancel}>Cancel</Btn></>}>
      <div className="p-5 space-y-4 text-[14px]">
        <div>{count} invoice{count > 1 ? 's' : ''} will be excluded from automatic payment runs until the block is released.</div>
        <Field label="Payment Block Reason" required>
          <Select aria-label="Payment Block Reason" value={reason} onChange={(e) => setReason(e.target.value)}>
            {BLOCK_REASONS.map((r) => <option key={r}>{r}</option>)}
          </Select>
        </Field>
      </div>
    </Dialog>
  )
}

const recent = (r: any) => r.createdBy === 'hworker' && Date.now() - +new Date(r.createdAt) < 10 * 60000

export function InvoiceList({ go, status }: { go: Go; status?: string }) {
  const rows = useCollection<any>('sap.invoices')
  const sorted = [...rows].sort((a, b) => (a.id < b.id ? 1 : -1))
  const [cancel, setCancel] = useState<any[] | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  return (
    <>
    {msg && <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 w-[560px]"><MessageStrip type="success" onClose={() => setMsg(null)}>{msg}</MessageStrip></div>}
    {cancel && (
      <CancelDialog
        count={cancel.length}
        onCancel={() => setCancel(null)}
        onConfirm={(reason) => {
          for (const i of cancel) cancelInvoice(i, reason)
          setMsg(`${cancel.length} supplier invoice${cancel.length > 1 ? 's were' : ' was'} cancelled and reversed.`)
          setCancel(null)
        }}
      />
    )}
    <ListReport
      initialFilters={status ? { status } : undefined}
      title="Manage Supplier Invoices"
      tableTitle="Supplier Invoices"
      agentPrefix="sap-inv"
      rows={sorted}
      searchKeys={(r) => `${r.id} ${r.supplierName} ${r.reference} ${r.poId}`}
      filters={[
        { label: 'Company Code', key: 'companyCode', options: ['1010'] },
        { label: 'Invoicing Party', key: 'supplierName', options: [...new Set(rows.map((r) => r.supplierName))].sort() },
        { label: 'Status', key: 'status', options: ['Posted', 'Paid', 'Parked', 'Blocked for Payment', 'Cancelled'] },
      ]}
      onOpen={(r) => go({ app: 'invoice', id: r.id })}
      flash={recent}
      actions={(sel, clear) => (
        <>
          <Btn kind="transparent" onClick={() => go({ app: 'createInvoice' })} data-agent="sap-inv-create">Create</Btn>
          <Btn kind="transparent" disabled={sel.length !== 1} onClick={() => go({ app: 'createInvoice', poId: sel[0]?.poId })}>Copy</Btn>
          <Btn
            kind="transparent"
            disabled={!sel.length || sel.some((i) => i.status === 'Paid' || i.status === 'Cancelled' || i.status === 'Parked')}
            onClick={() => {
              setCancel(sel)
              clear()
            }}
          >
            Cancel Invoice
          </Btn>
        </>
      )}
      cols={[
        { label: 'Supplier Invoice', render: (r) => <span className="text-[#0064d9] font-semibold">{r.id}</span>, sort: (r) => r.id },
        { label: 'Fiscal Year', render: (r) => r.fiscalYear },
        { label: 'Company Code', render: (r) => r.companyCode },
        { label: 'Invoicing Party', render: (r) => <span>{r.supplierName} <span className="text-[#556b82]">({r.supplierId})</span> {r.createdBy === 'hworker' && <HWChip />}</span>, sort: (r) => r.supplierName },
        { label: 'Reference', render: (r) => r.reference, sort: (r) => r.reference ?? '' },
        { label: 'Purchase Order', render: (r) => r.poId, sort: (r) => r.poId ?? '' },
        { label: 'Document Date', render: (r) => sapDate(r.invoiceDate), sort: (r) => r.invoiceDate ?? '' },
        { label: 'Gross Amount', align: 'right', render: (r) => <span className="font-semibold">{usd(r.gross)} <span className="text-[#556b82] font-normal">USD</span></span>, sort: (r) => r.gross },
        { label: 'Status', render: (r) => <ObjectStatus status={r.status} />, sort: (r) => r.status },
      ]}
    />
    </>
  )
}

export function InvoiceObject({ id, go }: { id: string; go: Go }) {
  const inv = useRecord<any>('sap.invoices', id)
  const sup = useRecord<any>('sap.suppliers', inv?.supplierId)
  const je = useRecord<any>('sap.journals', inv?.journalId)
  const [dlg, setDlg] = useState<null | 'cancel' | 'block'>(null)
  const [note, setNote] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  if (!inv) return <div className="p-8 text-[14px]">Supplier invoice {id} not found.</div>
  const fresh = recent(inv)
  const open = inv.status === 'Posted' || inv.status === 'Blocked for Payment'
  const actions = (
    <>
      {inv.status === 'Parked' && (
        <>
          <Btn kind="emph" data-agent="sap-inv-obj-post" onClick={() => { const j = postParkedInvoice(inv); setNote({ type: 'success', text: `Document ${inv.id} was posted (journal entry ${j}).` }) }}>Post</Btn>
          <Btn kind="default" onClick={() => { db.remove('sap.invoices', inv.id); go({ app: 'invoices' }) }}>Delete</Btn>
        </>
      )}
      {inv.status === 'Posted' && <Btn kind="default" data-agent="sap-inv-obj-block" onClick={() => setDlg('block')}>Block for Payment</Btn>}
      {inv.status === 'Blocked for Payment' && <Btn kind="emph" data-agent="sap-inv-obj-release" onClick={() => { setPaymentBlock(inv.id, null); setNote({ type: 'success', text: `Payment block on ${inv.id} released. The invoice will be included in the next payment run.` }) }}>Release Payment Block</Btn>}
      <Btn kind="default" onClick={() => go({ app: 'createInvoice', poId: inv.poId })}>Copy</Btn>
      <Btn kind="default" disabled={!open} onClick={() => setDlg('cancel')}>Cancel Invoice</Btn>
      <Dropdown
        align="right"
        width={260}
        trigger={(_, toggle) => <Btn kind="transparent" onClick={toggle}>Related Apps <ChevronDown className="w-4 h-4" /></Btn>}
      >
        {(close) => (
          <>
            <MenuItem icon={<ExternalLink className="w-4 h-4" />} disabled={!inv.journalId} onClick={() => { close(); go({ app: 'journal', id: inv.journalId }) }}>Manage Journal Entries</MenuItem>
            <MenuItem icon={<ExternalLink className="w-4 h-4" />} disabled={!inv.poId} onClick={() => { close(); go({ app: 'po', id: inv.poId }) }}>Manage Purchase Orders</MenuItem>
            <MenuItem icon={<ExternalLink className="w-4 h-4" />} onClick={() => { close(); go({ app: 'supplier', id: inv.supplierId }) }}>Supplier Fact Sheet</MenuItem>
            <MenuSep />
            <MenuItem icon={<ExternalLink className="w-4 h-4" />} onClick={() => { close(); go({ app: 'paymentBlocks' }) }}>Manage Payment Blocks</MenuItem>
            <MenuItem icon={<ExternalLink className="w-4 h-4" />} onClick={() => { close(); go({ app: 'supplierBalances' }) }}>Display Supplier Balances</MenuItem>
          </>
        )}
      </Dropdown>
    </>
  )
  return (
    <>
    {dlg === 'cancel' && (
      <CancelDialog
        count={1}
        onCancel={() => setDlg(null)}
        onConfirm={(reason) => {
          const rev = cancelInvoice(inv, reason)
          setDlg(null)
          setNote({ type: 'success', text: `Supplier invoice ${inv.id} was cancelled${rev ? ` with reversal document ${rev}` : ''}.` })
        }}
      />
    )}
    {dlg === 'block' && (
      <BlockDialog
        count={1}
        onCancel={() => setDlg(null)}
        onConfirm={(reason) => {
          setPaymentBlock(inv.id, reason)
          setDlg(null)
          setNote({ type: 'success', text: `Invoice ${inv.id} is blocked for payment (${reason}).` })
        }}
      />
    )}
    <ObjectPage
      crumbs={[{ label: 'Manage Supplier Invoices', onClick: () => go({ app: 'invoices' }) }]}
      title={<span data-agent="sap-invoice-title">Supplier Invoice {inv.id}</span>}
      badge={inv.createdBy === 'hworker' ? <HWChip text="Posted by H-Worker" /> : null}
      subtitle={`${inv.supplierName} (${inv.supplierId}) · Fiscal Year ${inv.fiscalYear}`}
      status={<ObjectStatus status={inv.status} inverted large />}
      actions={actions}
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
              {note && <MessageStrip type={note.type} onClose={() => setNote(null)}>{note.text}</MessageStrip>}
              {inv.status === 'Cancelled' && <MessageStrip type="info">Invoice cancelled{inv.cancelReason ? ` (${inv.cancelReason})` : ''}{inv.reversalJournalId ? <> — reversal document <button className="text-[#0064d9] hover:underline" onClick={() => go({ app: 'journal', id: inv.reversalJournalId })}>{inv.reversalJournalId}</button></> : ''}.</MessageStrip>}
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
                      ...(inv.paidOn ? [['Cleared On', `${sapDate(inv.paidOn)} · ${inv.paymentDoc ?? ''}`] as [string, string]] : []),
                      ...(inv.text ? [['Header Text', inv.text] as [string, string]] : []),
                      ...(inv.note ? [['Note', inv.note] as [string, string]] : []),
                      ...(inv.attachments?.length ? [['Attachments', inv.attachments.join(', ')] as [string, string]] : []),
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
              {[['Purchase Order', inv.poId, 'Released'], ['Goods/Service Receipt', `5000${String(inv.poId ?? '').slice(-6)}`, 'Posted'], ['Supplier Invoice', inv.id, inv.status], ['Payment', inv.status === 'Paid' ? inv.paymentDoc ?? '1500' + inv.id.slice(-6) : `Planned ${sapDate(inv.dueDate)}`, inv.status === 'Paid' ? 'Cleared' : 'Open']].map(([a, b, c], i) => (
                <div key={a} className="flex items-center gap-3">
                  <div
                    onClick={() => (i === 0 && inv.poId ? go({ app: 'po', id: inv.poId }) : i === 3 && inv.paymentJournalId ? go({ app: 'journal', id: inv.paymentJournalId }) : undefined)}
                    className={`w-[200px] rounded-xl border-2 p-3 bg-white ${(i === 0 && inv.poId) || (i === 3 && inv.paymentJournalId) ? 'cursor-pointer hover:bg-[#f5f6f7]' : ''} ${c === 'Open' ? 'border-[#bcc3ca] border-dashed' : c === 'Cancelled' ? 'border-[#aa0808]' : 'border-[#30914c]'}`}
                  >
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
    </>
  )
}
