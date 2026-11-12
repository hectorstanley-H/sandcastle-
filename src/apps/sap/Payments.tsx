/** Accounts payable apps: Manage Payment Blocks, Manage Automatic Payments (F110), Display Supplier Balances. */
import { Fragment, useMemo, useState } from 'react'
import { CalendarClock, Search } from 'lucide-react'
import { db, useCollection } from '@/db/db'
import { isoDate } from '@/data/time'
import { Btn, Field, Input, MessageStrip, ObjectStatus, Table, usd, sapDate, PageHeader, Footer, Card } from './ui'
import { ListReport } from './ListReport'
import { BlockDialog, setPaymentBlock } from './Invoices'
import { nextId, round2 } from './gl'
import type { Go } from './index'

/* ───────────── Manage Payment Blocks ───────────── */

export function PaymentBlocks({ go }: { go: Go }) {
  const all = useCollection<any>('sap.invoices')
  const rows = useMemo(() => all.filter((i) => i.status === 'Posted' || i.status === 'Blocked for Payment'), [all])
  const [block, setBlock] = useState<any[] | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const today = Date.now()
  return (
    <>
      {msg && <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 w-[560px]"><MessageStrip type="success" onClose={() => setMsg(null)}>{msg}</MessageStrip></div>}
      {block && (
        <BlockDialog
          count={block.length}
          onCancel={() => setBlock(null)}
          onConfirm={(reason) => {
            for (const i of block) setPaymentBlock(i.id, reason)
            setMsg(`${block.length} invoice${block.length > 1 ? 's' : ''} blocked for payment.`)
            setBlock(null)
          }}
        />
      )}
      <ListReport
        title="Manage Payment Blocks"
        tableTitle="Supplier Invoices"
        agentPrefix="sap-pb"
        rows={rows}
        initialFilters={{ status: 'Blocked for Payment' }}
        searchKeys={(r) => `${r.id} ${r.supplierName} ${r.reference} ${r.poId}`}
        filters={[
          { label: 'Status', key: 'status', options: ['Posted', 'Blocked for Payment'] },
          { label: 'Invoicing Party', key: 'supplierName', options: [...new Set(rows.map((r) => r.supplierName as string))].sort() },
          { label: 'Payment Block Reason', key: 'paymentBlock', options: [...new Set(rows.map((r) => r.paymentBlock as string).filter(Boolean))].sort() },
        ]}
        onOpen={(r) => go({ app: 'invoice', id: r.id })}
        actions={(sel, clear) => (
          <>
            <Btn
              kind="transparent"
              data-agent="sap-pb-release"
              disabled={!sel.length || sel.some((i) => i.status !== 'Blocked for Payment')}
              onClick={() => {
                for (const i of sel) setPaymentBlock(i.id, null)
                setMsg(`Payment block released for ${sel.length} invoice${sel.length > 1 ? 's' : ''}.`)
                clear()
              }}
            >
              Release
            </Btn>
            <Btn
              kind="transparent"
              data-agent="sap-pb-block"
              disabled={!sel.length || sel.some((i) => i.status !== 'Posted')}
              onClick={() => {
                setBlock(sel)
                clear()
              }}
            >
              Set Payment Block
            </Btn>
          </>
        )}
        cols={[
          { label: 'Supplier Invoice', render: (r) => <span className="text-[#0064d9] font-semibold">{r.id}</span>, sort: (r) => r.id },
          { label: 'Invoicing Party', render: (r) => <span>{r.supplierName} <span className="text-[#556b82]">({r.supplierId})</span></span>, sort: (r) => r.supplierName },
          { label: 'Reference', render: (r) => r.reference },
          { label: 'Due Date', render: (r) => <span style={{ color: +new Date(r.dueDate) < today ? '#aa0808' : undefined }}>{sapDate(r.dueDate)}</span>, sort: (r) => r.dueDate ?? '' },
          { label: 'Gross Amount', align: 'right', render: (r) => <span className="font-semibold">{usd(r.gross)} <span className="text-[#556b82] font-normal">USD</span></span>, sort: (r) => r.gross },
          { label: 'Payment Block', render: (r) => r.paymentBlock ?? <span className="text-[#556b82]">Free for Payment</span>, sort: (r) => r.paymentBlock ?? '' },
          { label: 'Status', render: (r) => <ObjectStatus status={r.status} />, sort: (r) => r.status },
        ]}
      />
    </>
  )
}

/* ───────────── Manage Automatic Payments ───────────── */

function nextFriday() {
  const d = new Date()
  d.setDate(d.getDate() + ((5 - d.getDay() + 7) % 7 || 7))
  return isoDate(d)
}

export function PaymentRun({ go }: { go: Go }) {
  const invoices = useCollection<any>('sap.invoices')
  const journals = useCollection<any>('sap.journals')
  const [runDate, setRunDate] = useState(isoDate(new Date()))
  const [nextDate, setNextDate] = useState(nextFriday())
  const [proposal, setProposal] = useState<string[] | null>(null)
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [msg, setMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)

  const limit = new Date(nextDate + 'T23:59:59').getTime()
  const due = invoices.filter((i) => i.status === 'Posted' && +new Date(i.dueDate) <= limit)
  const exceptions = invoices.filter((i) => i.status === 'Blocked for Payment' && +new Date(i.dueDate) <= limit)
  const items = proposal ? invoices.filter((i) => proposal.includes(i.id) && i.status === 'Posted') : []
  const selItems = items.filter((i) => sel.has(i.id))
  const total = round2(selItems.reduce((t, i) => t + i.gross, 0))
  const bySupplier = useMemo(() => {
    type G = { name: string; id: string; rows: any[] }
    const m = new Map<string, G>()
    for (const i of items) {
      const g: G = m.get(i.supplierId) ?? { name: i.supplierName, id: i.supplierId, rows: [] }
      g.rows.push(i)
      m.set(i.supplierId, g)
    }
    return [...m.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [items])
  const runs = journals.filter((j) => j.type === 'KZ' && !j.reversalOf)

  const createProposal = () => {
    setProposal(due.map((i) => i.id))
    setSel(new Set(due.map((i) => i.id)))
    setMsg(due.length ? { type: 'info', text: `Proposal created: ${due.length} open items due by ${sapDate(nextDate + 'T12:00:00')}${exceptions.length ? `, ${exceptions.length} exceptions (payment block)` : ''}.` } : { type: 'info', text: 'No open items are due for payment in this run.' })
  }

  const schedule = () => {
    if (!selItems.length) return setMsg({ type: 'error', text: 'Select at least one item to pay.' })
    const jid = nextId('sap.journals', 100004500)
    const posting = new Date(runDate + 'T12:00:00').toISOString()
    const groups = new Map<string, { name: string; amount: number }>()
    for (const i of selItems) {
      const g = groups.get(i.supplierId) ?? { name: i.supplierName, amount: 0 }
      g.amount = round2(g.amount + i.gross)
      groups.set(i.supplierId, g)
    }
    const label = `Payment run F110 — ${new Date(posting).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' })}`
    db.insert(
      'sap.journals',
      {
        id: jid,
        fiscalYear: '2026',
        companyCode: '1010',
        type: 'KZ',
        typeText: 'Vendor Payment',
        postingDate: posting,
        docDate: posting,
        reference: `F110-${runDate.replace(/-/g, '')}`,
        header: label,
        amount: total,
        currency: 'USD',
        lines: [
          ...[...groups.entries()].map(([sid, g]) => ({ gl: '211000', glName: `Accounts Payable — Domestic · ${g.name}`, debit: g.amount, credit: 0, text: sid })),
          { gl: '113100', glName: 'Bank — Woodgrove Operating', debit: 0, credit: total, text: `ACH · ${selItems.length} items` },
        ],
        createdByName: 'Alex Morgan',
      },
      { prepend: true },
    )
    for (const i of selItems) db.update('sap.invoices', i.id, { status: 'Paid', paidOn: posting, paymentDoc: jid, paymentJournalId: jid })
    setMsg({ type: 'success', text: `Payment run scheduled: ${selItems.length} invoices to ${groups.size} suppliers, ${usd(total)} USD paid by ACH. Payment document ${jid}.` })
    setProposal(null)
    setSel(new Set())
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col relative">
      <PageHeader
        crumb={{ label: 'Accounts Payable', onClick: () => go({ app: 'home', space: 'Accounts Payable' }) }}
        title="Manage Automatic Payments"
        subtitle="Payment program F110 · Company Code 1010 · House Bank WOOD1 / OPR01"
        right={
          <div className="flex gap-10 pr-2">
            <div><div className="text-[14px] text-[#556b82]">Due for payment</div><div className="text-[20px] font-light">{usd(due.reduce((t, i) => t + i.gross, 0))} <span className="text-[14px] text-[#556b82]">USD</span></div></div>
            <div><div className="text-[14px] text-[#556b82]">Exceptions</div><div className="text-[20px] font-light" style={{ color: exceptions.length ? '#aa0808' : undefined }}>{exceptions.length}</div></div>
          </div>
        }
      />
      <div className="flex-1 overflow-auto px-8 pt-5 pb-20 space-y-5">
        {msg && <MessageStrip type={msg.type} onClose={() => setMsg(null)}>{msg.text}</MessageStrip>}
        <Card title="Parameters">
          <div className="p-5 grid grid-cols-4 gap-x-8 gap-y-4 max-w-[1100px]">
            <Field label="Run Date" required><Input type="date" aria-label="Run Date" data-agent="sap-pay-run-date" value={runDate} onChange={(e) => setRunDate(e.target.value)} /></Field>
            <Field label="Next Payment Date" required><Input type="date" aria-label="Next Payment Date" data-agent="sap-pay-next-date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} /></Field>
            <Field label="Payment Methods"><Input readOnly value="T (ACH), C (Check)" aria-label="Payment Methods" /></Field>
            <Field label="Supplier Range"><Input readOnly value="All suppliers" aria-label="Supplier Range" /></Field>
          </div>
        </Card>

        {proposal && (
          <Card title={`Payment Proposal (${items.length})`} toolbar={<span className="text-[14px] text-[#556b82]">{selItems.length} selected · <b className="text-[#1d2d3e]">{usd(total)} USD</b></span>}>
            {bySupplier.length === 0 ? (
              <div className="h-16 flex items-center justify-center text-[14px] text-[#556b82]">No items in proposal.</div>
            ) : (
              <Table cols={[{ label: '', w: '40px' }, { label: 'Supplier' }, { label: 'Supplier Invoice' }, { label: 'Reference' }, { label: 'Due Date' }, { label: 'Payment Method' }, { label: 'Amount', align: 'right' }]}>
                {bySupplier.map((g) => (
                  <Fragment key={g.id}>
                    <tr className="h-[33px] bg-[#f5f6f7] border-b border-[#e5e5e5] font-bold">
                      <td className="text-center">
                        <input
                          type="checkbox"
                          className="w-4 h-4 accent-[#0064d9]"
                          aria-label={`Select ${g.name}`}
                          checked={g.rows.every((r) => sel.has(r.id))}
                          onChange={(e) => {
                            const n = new Set(sel)
                            for (const r of g.rows) e.target.checked ? n.add(r.id) : n.delete(r.id)
                            setSel(n)
                          }}
                        />
                      </td>
                      <td className="px-2" colSpan={5}><button className="text-[#0064d9] hover:underline" onClick={() => go({ app: 'supplier', id: g.id })}>{g.name} ({g.id})</button></td>
                      <td className="px-2 text-right">{usd(g.rows.reduce((t, r) => t + r.gross, 0))} USD</td>
                    </tr>
                    {g.rows.map((r) => (
                      <tr key={r.id} className={`h-[33px] border-b border-[#e5e5e5] ${sel.has(r.id) ? 'bg-[#ebf8ff]' : ''}`}>
                        <td className="text-center">
                          <input
                            type="checkbox"
                            className="w-4 h-4 accent-[#0064d9]"
                            aria-label={`Select ${r.id}`}
                            checked={sel.has(r.id)}
                            onChange={(e) => {
                              const n = new Set(sel)
                              e.target.checked ? n.add(r.id) : n.delete(r.id)
                              setSel(n)
                            }}
                          />
                        </td>
                        <td className="px-2 text-[#556b82]">{r.supplierId}</td>
                        <td className="px-2"><button className="text-[#0064d9] hover:underline" onClick={() => go({ app: 'invoice', id: r.id })}>{r.id}</button></td>
                        <td className="px-2">{r.reference}</td>
                        <td className="px-2" style={{ color: +new Date(r.dueDate) < Date.now() ? '#aa0808' : undefined }}>{sapDate(r.dueDate)}</td>
                        <td className="px-2">T (ACH)</td>
                        <td className="px-2 text-right">{usd(r.gross)} USD</td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </Table>
            )}
            {exceptions.length > 0 && (
              <div className="p-4 border-t border-[#e5e5e5]">
                <MessageStrip type="warning">
                  {exceptions.length} due invoice{exceptions.length > 1 ? 's are' : ' is'} blocked for payment and excluded:{' '}
                  {exceptions.slice(0, 6).map((e, i) => (
                    <span key={e.id}>{i ? ', ' : ''}<button className="text-[#0064d9] hover:underline" onClick={() => go({ app: 'invoice', id: e.id })}>{e.id}</button></span>
                  ))}
                  {exceptions.length > 6 ? '…' : ''} — <button className="text-[#0064d9] hover:underline" onClick={() => go({ app: 'paymentBlocks' })}>Manage Payment Blocks</button>
                </MessageStrip>
              </div>
            )}
          </Card>
        )}

        <Card title={`Payment Runs (${runs.length})`}>
          <Table cols={[{ label: 'Payment Document' }, { label: 'Identification' }, { label: 'Run Date' }, { label: 'Items' }, { label: 'Amount', align: 'right' }, { label: 'Status' }]}>
            {runs.map((j) => (
              <tr key={j.id} className="h-[33px] border-b border-[#e5e5e5] hover:bg-[#eaecee] cursor-pointer" onClick={() => go({ app: 'journal', id: j.id })}>
                <td className="px-2 text-[#0064d9] font-semibold">{j.id}</td>
                <td className="px-2">{j.header}</td>
                <td className="px-2">{sapDate(j.postingDate)}</td>
                <td className="px-2">{Math.max(1, (j.lines?.length ?? 2) - 1)} supplier{(j.lines?.length ?? 2) > 2 ? 's' : ''}</td>
                <td className="px-2 text-right">{usd(j.amount)} USD</td>
                <td className="px-2"><ObjectStatus status={j.reversedBy ? 'Reversed' : 'Posted'} /></td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>
      <Footer left={<span className="text-[14px] text-[#556b82] flex items-center gap-1.5"><CalendarClock className="w-4 h-4" /> Next scheduled run: {sapDate(nextDate + 'T12:00:00')}</span>}>
        <Btn kind="emph" data-agent="sap-pay-proposal" onClick={createProposal}>Create Proposal</Btn>
        <Btn kind="default" data-agent="sap-pay-schedule" disabled={!proposal || !selItems.length} onClick={schedule}>Schedule Payment Run</Btn>
        <Btn kind="transparent" onClick={() => { setProposal(null); setSel(new Set()); setMsg(null) }}>Delete Proposal</Btn>
      </Footer>
    </div>
  )
}

/* ───────────── Display Supplier Balances ───────────── */

export function SupplierBalances({ go }: { go: Go }) {
  const suppliers = useCollection<any>('sap.suppliers')
  const invoices = useCollection<any>('sap.invoices')
  const [q, setQ] = useState('')
  const [only, setOnly] = useState(false)
  const now = Date.now()
  const rows = useMemo(
    () =>
      suppliers
        .map((s) => {
          const inv = invoices.filter((i) => i.supplierId === s.id)
          const open = inv.filter((i) => i.status === 'Posted' || i.status === 'Blocked for Payment')
          return {
            s,
            open: round2(open.reduce((t, i) => t + i.gross, 0)),
            overdue: round2(open.filter((i) => +new Date(i.dueDate) < now).reduce((t, i) => t + i.gross, 0)),
            blocked: round2(open.filter((i) => i.status === 'Blocked for Payment').reduce((t, i) => t + i.gross, 0)),
            paid: round2(inv.filter((i) => i.status === 'Paid').reduce((t, i) => t + i.gross, 0)),
            count: open.length,
          }
        })
        .filter((r) => (!q || `${r.s.id} ${r.s.name}`.toLowerCase().includes(q.toLowerCase())) && (!only || r.open > 0))
        .sort((a, b) => b.open - a.open),
    [suppliers, invoices, q, only],
  )
  const sum = (k: 'open' | 'overdue' | 'blocked' | 'paid') => usd(rows.reduce((t, r) => t + r[k], 0))
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <PageHeader
        crumb={{ label: 'Accounts Payable', onClick: () => go({ app: 'home', space: 'Accounts Payable' }) }}
        title="Display Supplier Balances"
        subtitle="Company Code 1010 · Reconciliation Account 211000 · Fiscal Year 2026"
        right={
          <div className="flex gap-10 pr-2">
            <div><div className="text-[14px] text-[#556b82]">Open Payables</div><div className="text-[20px] font-light">{sum('open')} <span className="text-[14px] text-[#556b82]">USD</span></div></div>
            <div><div className="text-[14px] text-[#556b82]">Overdue</div><div className="text-[20px] font-light text-[#aa0808]">{sum('overdue')} <span className="text-[14px] text-[#556b82]">USD</span></div></div>
          </div>
        }
      />
      <div className="flex-1 overflow-auto px-8 py-5">
        <Card
          title={`Suppliers (${rows.length})`}
          toolbar={
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-[14px]"><input type="checkbox" className="w-4 h-4 accent-[#0064d9]" checked={only} onChange={(e) => setOnly(e.target.checked)} /> Only with open items</label>
              <div className="relative w-[220px]">
                <Input aria-label="Search suppliers" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} data-agent="sap-bal-search" />
                <Search className="w-4 h-4 absolute right-2 top-[5px] text-[#556b82]" />
              </div>
            </div>
          }
        >
          <Table cols={[{ label: 'Supplier' }, { label: 'Name' }, { label: 'Open Items', align: 'right' }, { label: 'Open Balance', align: 'right' }, { label: 'Overdue', align: 'right' }, { label: 'Blocked', align: 'right' }, { label: 'Paid (FY)', align: 'right' }]}>
            {rows.map((r) => (
              <tr key={r.s.id} className="h-[33px] border-b border-[#e5e5e5] hover:bg-[#eaecee] cursor-pointer" onClick={() => go({ app: 'supplier', id: r.s.id })}>
                <td className="px-2 text-[#0064d9] font-semibold">{r.s.id}</td>
                <td className="px-2">{r.s.name}</td>
                <td className="px-2 text-right">{r.count}</td>
                <td className="px-2 text-right font-semibold">{usd(r.open)}</td>
                <td className="px-2 text-right" style={{ color: r.overdue ? '#aa0808' : undefined }}>{usd(r.overdue)}</td>
                <td className="px-2 text-right" style={{ color: r.blocked ? '#b44f00' : undefined }}>{usd(r.blocked)}</td>
                <td className="px-2 text-right">{usd(r.paid)}</td>
              </tr>
            ))}
            <tr className="h-[33px] font-bold">
              <td className="px-2" colSpan={3}>Total</td>
              <td className="px-2 text-right">{sum('open')}</td>
              <td className="px-2 text-right">{sum('overdue')}</td>
              <td className="px-2 text-right">{sum('blocked')}</td>
              <td className="px-2 text-right">{sum('paid')}</td>
            </tr>
          </Table>
        </Card>
      </div>
    </div>
  )
}
