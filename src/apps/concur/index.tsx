import { useEffect, useMemo, useState } from 'react'
import {
  ChevronDown, Plus, Receipt, CreditCard, AlertTriangle, X, Search, CheckCircle2, Clock, Circle, HelpCircle, Users, Trash2, Copy, Split, Combine,
  FileText, Printer, Paperclip, ArrowLeft, Info, RotateCcw, Banknote,
} from 'lucide-react'
import type { AppProps } from '@/os/registry'
import { logoUrl } from '@/os/registry'
import { useDesk, useWin } from '@/os/context'
import { db, uid, useCollection, useRecord } from '@/db/db'
import { ME, PEOPLE } from '@/data/people'
import { isoDate } from '@/data/time'
import {
  BLUE, $, d, slug, r2, EXPENSE_TYPES, ALL_TYPES, typeIcon, expenseAlerts, recalc, logHistory, Btn, Field, inputCls, Status, HW, Modal, Confirm, Menu, MenuLabel, Banner,
} from './ui'
import { AttachReceipt } from './Receipts'
import { RequestsView, RequestPage } from './Requests'
import { ApprovalsView } from './Approvals'
import { TravelView } from './Travel'
import { ReportsLibrary, Delegates, AppCenter, ProfileSettings, HelpDialog, PolicyDialog } from './More'

export { EXPENSE_TYPES, expenseAlerts }

/* ─────────────────────── Home (Manage Expenses) ─────────────────────── */

function Home({ openReport, onCreate, onLibrary }: { openReport: (id: string) => void; onCreate: () => void; onLibrary: () => void }) {
  const reports = useCollection<any>('concur.reports')
  const tx = useCollection<any>('concur.transactions')
  const quick = useCollection<any>('concur.quickExpenses')
  const avail = tx.filter((t) => t.status === 'available')
  const rows = [...quick, ...avail]
  const active = [...reports].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
  const open = reports.filter((r) => r.status === 'Not Submitted' || r.status === 'Sent Back')
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [note, setNote] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null)
  const [quickOpen, setQuickOpen] = useState(false)
  const selRows = rows.filter((r) => sel.has(r.id))

  const moveTo = (reportId: string) => {
    const now = Date.now()
    const base = db.get<any>('concur.expenses').filter((e) => e.reportId === reportId).length
    selRows.forEach((t, i) => {
      if (t.manual) {
        db.insert('concur.expenses', { id: uid('cex'), reportId, type: t.suggestedType, date: t.date, vendor: t.vendor, city: t.city, paymentType: t.paymentType, amount: t.amount, currency: 'USD', comment: t.comment ?? '', purpose: '', receipt: !!t.receipt, receiptName: t.receiptName, attendees: [{ name: ME.name, type: 'Employee', company: 'Northwind Global' }], order: base + i })
        db.remove('concur.quickExpenses', t.id)
      } else {
        db.insert('concur.expenses', { id: `cex-${t.id}-${now.toString(36)}`, reportId, type: t.suggestedType, date: t.date, vendor: t.vendor, city: t.city, paymentType: 'American Express Corporate', amount: t.amount, currency: 'USD', comment: '', purpose: '', receipt: true, transactionId: t.id, receiptEmailId: t.receiptEmailId, attendees: [{ name: ME.name, type: 'Employee', company: 'Northwind Global' }], order: base + i })
        db.update('concur.transactions', t.id, { status: 'assigned', reportId })
      }
    })
    recalc(reportId)
    const name = reports.find((r) => r.id === reportId)?.name
    setNote({ type: 'success', text: `${selRows.length} expense${selRows.length === 1 ? '' : 's'} moved to “${name}”.` })
    setSel(new Set())
  }
  const del = () => {
    const card = selRows.filter((r) => !r.manual)
    selRows.filter((r) => r.manual).forEach((r) => db.remove('concur.quickExpenses', r.id))
    setSel(new Set())
    setNote(card.length ? { type: 'error', text: `${card.length} corporate card transaction${card.length === 1 ? '' : 's'} can’t be deleted. Add ${card.length === 1 ? 'it' : 'them'} to a report and mark as personal if needed.` } : { type: 'success', text: 'Expenses deleted.' })
  }

  return (
    <div className="flex-1 overflow-auto px-10 py-6">
      <div className="text-[26px] font-light text-[#32363a] mb-5">Manage Expenses</div>
      {note && <Banner type={note.type} onClose={() => setNote(null)}>{note.text}</Banner>}
      <div className="flex items-center mb-3">
        <div className="text-[18px] font-semibold text-[#32363a]">Active Reports</div>
        <button data-agent="concur-reports-library" onClick={onLibrary} className="ml-4 text-[14px] text-[#0a6ed1] hover:underline">View Reports Library</button>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-3 mb-6">
        <button data-agent="concur-create-report" onClick={onCreate} aria-label="Create New Report" className="w-[220px] h-[150px] shrink-0 rounded-lg border-2 border-dashed border-[#0a6ed1]/50 bg-white hover:bg-[#ebf5fe] flex flex-col items-center justify-center gap-2 text-[#0a6ed1]">
          <span className="w-10 h-10 rounded-full flex items-center justify-center text-white" style={{ background: BLUE }}><Plus className="w-6 h-6" /></span>
          <span className="text-[15px] font-semibold">Create New Report</span>
        </button>
        {active.map((r) => (
          <button key={r.id} data-agent={`concur-report-card-${r.id}`} onClick={() => openReport(r.id)} className={`w-[240px] h-[150px] shrink-0 rounded-lg bg-white border border-[#d9d9d9] hover:shadow-md text-left p-4 flex flex-col ${r.createdBy === 'hworker' ? 'flash-new' : ''}`}>
            <div className="flex items-start gap-2">
              <div className="text-[15px] font-semibold text-[#32363a] leading-tight line-clamp-2 flex-1">{r.name}</div>
            </div>
            <div className="text-[12px] text-[#6a6d70] mt-1">{d(r.reportDate)} · {r.number}</div>
            <div className="flex-1" />
            <div className="text-[22px] font-light text-[#32363a]">{$(r.total)}</div>
            <div className="flex items-center gap-2 mt-1"><Status s={r.status} />{r.createdBy === 'hworker' && <HW />}</div>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-[#d9d9d9]">
        <div className="h-14 px-5 flex items-center gap-3 border-b border-[#e5e5e5]">
          <div className="text-[18px] font-semibold text-[#32363a]">Available Expenses</div>
          <span className="text-[13px] text-[#6a6d70]">({rows.length})</span>
          <div className="flex-1" />
          {sel.size > 0 && open.length > 0 ? (
            <Menu
              agent="concur-avail-move"
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded text-[14px] font-semibold border bg-white border-[#89919a] text-[#0a6ed1] hover:bg-[#ebf5fe]"
              trigger={<>Move to <ChevronDown className="w-4 h-4" /></>}
              items={open.map((r) => ({ label: r.name, onClick: () => moveTo(r.id), agent: `concur-avail-move-${r.id}` }))}
            />
          ) : (
            <Btn disabled>Move to <ChevronDown className="w-4 h-4" /></Btn>
          )}
          <Btn disabled={!sel.size} onClick={del} data-agent="concur-avail-delete"><Trash2 className="w-4 h-4" /> Delete</Btn>
          <Btn data-agent="concur-quick-expense" onClick={() => setQuickOpen(true)}><Receipt className="w-4 h-4" /> Quick Expense</Btn>
          <Btn primary onClick={onCreate}><Plus className="w-4 h-4" /> Add Expense</Btn>
        </div>
        <TxTable rows={rows} selected={sel} onToggle={(id) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })} empty="You have no available expenses. Card transactions and e-receipts will appear here." />
      </div>
      {quickOpen && <QuickExpense onClose={() => setQuickOpen(false)} onSaved={() => { setQuickOpen(false); setNote({ type: 'success', text: 'Quick expense saved to Available Expenses.' }) }} />}
    </div>
  )
}

function TxTable({ rows, selected, onToggle, empty, agentPrefix = 'concur-avail' }: { rows: any[]; selected?: Set<string>; onToggle?: (id: string) => void; empty: string; agentPrefix?: string }) {
  return (
    <table className="w-full text-[14px] text-[#32363a]">
      <thead>
        <tr className="h-10 text-left text-[13px] text-[#6a6d70] border-b border-[#e5e5e5]">
          <th className="w-10 pl-5" />
          <th className="px-2 font-semibold">Receipt</th>
          <th className="px-2 font-semibold">Payment Type</th>
          <th className="px-2 font-semibold">Expense Type</th>
          <th className="px-2 font-semibold">Vendor Details</th>
          <th className="px-2 font-semibold">Date</th>
          <th className="px-2 pr-5 font-semibold text-right">Amount</th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 && <tr><td colSpan={7} className="h-20 text-center text-[#6a6d70]">{empty}</td></tr>}
        {rows.map((t) => (
          <tr key={t.id} data-agent={`${agentPrefix}-${t.id}`} aria-label={`${t.vendor} ${$(t.amount)}`} onClick={() => onToggle?.(t.id)} className={`h-[52px] border-b border-[#eeeeee] ${selected?.has(t.id) ? 'bg-[#ebf5fe]' : 'hover:bg-[#f7f7f7]'}`}>
            <td className="pl-5"><input type="checkbox" readOnly checked={selected?.has(t.id) ?? false} className="w-4 h-4 accent-[#0a6ed1]" aria-label="Select" /></td>
            <td className="px-2">
              {t.manual ? (
                t.receipt ? <span className="inline-flex items-center gap-1 text-[12px] text-[#107e3e]"><Paperclip className="w-4 h-4" /> Receipt</span> : <span className="text-[#bfbfbf]">—</span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[12px] text-[#107e3e]"><Receipt className="w-4 h-4" /> e-Receipt</span>
              )}
            </td>
            <td className="px-2">
              {t.manual ? <span className="inline-flex items-center gap-1.5"><Banknote className="w-4 h-4 text-[#6a6d70]" /> {t.paymentType}</span> : <span className="inline-flex items-center gap-1.5"><CreditCard className="w-4 h-4 text-[#0a6ed1]" /> Amex Corporate</span>}
            </td>
            <td className="px-2">{t.suggestedType}</td>
            <td className="px-2"><div className="font-semibold">{t.vendor}</div><div className="text-[12px] text-[#6a6d70]">{t.city}</div></td>
            <td className="px-2">{d(t.date)}</td>
            <td className="px-2 pr-5 text-right font-semibold">{$(t.amount)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/* ─────────────────────── Quick expense (no report) ─────────────────────── */

function QuickExpense({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<any>({ suggestedType: 'Taxi/Rideshare', date: isoDate(new Date()), vendor: '', city: 'Boston, Massachusetts', amount: '', paymentType: 'Cash', comment: '', receipt: false })
  const [attach, setAttach] = useState(false)
  const set = (k: string, v: any) => setF((x: any) => ({ ...x, [k]: v }))
  const amount = Number(String(f.amount).replace(/[$,]/g, '')) || 0
  const ok = f.vendor.trim() && amount > 0
  const save = () => {
    if (!ok) return
    db.insert('concur.quickExpenses', { id: uid('cqe'), manual: true, ...f, amount: r2(amount), date: new Date(f.date + 'T12:00:00').toISOString() }, { prepend: true })
    onSaved()
  }
  return (
    <Modal title="Quick Expense" width={640} onClose={onClose} agent="concur-quick-modal" footer={<><Btn onClick={onClose}>Cancel</Btn><Btn primary data-agent="concur-quick-save" disabled={!ok} onClick={save}>Save</Btn></>}>
      <div className="p-6 grid grid-cols-2 gap-5">
        <Field label="Expense Type" required>
          <select aria-label="Expense Type" className={inputCls} value={f.suggestedType} onChange={(e) => set('suggestedType', e.target.value)}>
            {EXPENSE_TYPES.map(([g, ts]) => <optgroup key={g} label={g}>{ts.map((t) => <option key={t}>{t}</option>)}</optgroup>)}
          </select>
        </Field>
        <Field label="Transaction Date" required><input type="date" aria-label="Transaction Date" className={inputCls} value={f.date} onChange={(e) => set('date', e.target.value)} /></Field>
        <Field label="Vendor" required><input aria-label="Vendor" className={inputCls} value={f.vendor} onChange={(e) => set('vendor', e.target.value)} /></Field>
        <Field label="City of Purchase"><input aria-label="City of Purchase" className={inputCls} value={f.city} onChange={(e) => set('city', e.target.value)} /></Field>
        <Field label="Amount" required><input aria-label="Amount" className={`${inputCls} text-right`} placeholder="0.00" value={f.amount} onChange={(e) => set('amount', e.target.value)} /></Field>
        <Field label="Payment Type" required>
          <select aria-label="Payment Type" className={inputCls} value={f.paymentType} onChange={(e) => set('paymentType', e.target.value)}><option>Cash</option><option>Personal Card</option></select>
        </Field>
        <div className="col-span-2"><Field label="Comment"><textarea aria-label="Comment" className={`${inputCls} h-16 py-2`} value={f.comment} onChange={(e) => set('comment', e.target.value)} /></Field></div>
        <div className="col-span-2 flex items-center gap-3 text-[14px]">
          <Paperclip className="w-4 h-4 text-[#0a6ed1]" />
          {f.receipt ? <><span className="text-[#107e3e]">{f.receiptName}</span><button className="text-[#0a6ed1] hover:underline" onClick={() => setF((x: any) => ({ ...x, receipt: false, receiptName: undefined }))}>Remove</button></> : <Btn onClick={() => setAttach(true)}>Attach Receipt</Btn>}
        </div>
      </div>
      {attach && <AttachReceipt onClose={() => setAttach(false)} onPick={(name) => { setF((x: any) => ({ ...x, receipt: true, receiptName: name })); setAttach(false) }} />}
    </Modal>
  )
}

/* ─────────────────────── Create report modal ─────────────────────── */

function CreateReport({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const { isAgent } = useDesk()
  const [name, setName] = useState('')
  const [purpose, setPurpose] = useState('')
  const [date, setDate] = useState(isoDate(new Date()))
  const [policy, setPolicy] = useState('Northwind US Travel & Expense Policy')
  const [comment, setComment] = useState('')
  const create = () => {
    if (!name || !purpose) return
    const id = uid('crp')
    db.insert('concur.reports', {
      id,
      name,
      number: Math.random().toString(36).slice(2, 9).toUpperCase(),
      purpose,
      comment,
      reportDate: new Date(date + 'T12:00:00').toISOString(),
      policy,
      status: 'Not Submitted',
      total: 0,
      createdAt: new Date().toISOString(),
      approver: 'Priya Raman',
      approvalFlow: [],
      createdBy: isAgent ? 'hworker' : undefined,
    })
    onCreated(id)
  }
  return (
    <Modal
      title="Create New Report"
      onClose={onClose}
      agent="concur-create-modal"
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn primary data-agent="concur-create-submit" onClick={create} disabled={!name || !purpose}>Create Report</Btn></>}
    >
      <div className="p-6 grid grid-cols-2 gap-5">
        <div className="col-span-2 text-[13px] text-[#6a6d70]"><span className="text-[#bb0000]">*</span> Required field</div>
        <Field label="Report Name" required><input data-agent="concur-report-name" aria-label="Report Name" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Report Date" required><input data-agent="concur-report-date" type="date" aria-label="Report Date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Business Purpose" required><input data-agent="concur-report-purpose" aria-label="Business Purpose" className={inputCls} value={purpose} onChange={(e) => setPurpose(e.target.value)} /></Field>
        <Field label="Policy" required>
          <select className={inputCls} value={policy} onChange={(e) => setPolicy(e.target.value)} aria-label="Policy">
            <option>Northwind US Travel & Expense Policy</option>
            <option>Northwind International Travel Policy</option>
            <option>Non-Travel Expense Policy</option>
          </select>
        </Field>
        <Field label="Department"><input readOnly className={inputCls} value="6105 — Operations" /></Field>
        <Field label="Cost Center"><input readOnly className={inputCls} value="10101301 — Ops Boston" /></Field>
        <div className="col-span-2"><Field label="Comment"><textarea aria-label="Comment" className={`${inputCls} h-20 py-2`} value={comment} onChange={(e) => setComment(e.target.value)} /></Field></div>
      </div>
    </Modal>
  )
}

/* ─────────────────────── Edit report header ─────────────────────── */

function EditHeader({ r, onClose, locked }: { r: any; onClose: () => void; locked: boolean }) {
  const [f, setF] = useState({ name: r.name, purpose: r.purpose, comment: r.comment ?? '', policy: r.policy, reportDate: isoDate(r.reportDate) })
  const set = (k: string, v: string) => setF((x) => ({ ...x, [k]: v }))
  const save = () => {
    db.update('concur.reports', r.id, { ...f, reportDate: new Date(f.reportDate + 'T12:00:00').toISOString() })
    logHistory('concur.reports', r.id, 'Report header edited')
    onClose()
  }
  return (
    <Modal title="Report Header" onClose={onClose} agent="concur-header-modal" footer={locked ? <Btn primary onClick={onClose}>Close</Btn> : <><Btn onClick={onClose}>Cancel</Btn><Btn primary data-agent="concur-header-save" disabled={!f.name || !f.purpose} onClick={save}>Save</Btn></>}>
      <div className="p-6 grid grid-cols-2 gap-5">
        <Field label="Report Name" required><input aria-label="Report Name" readOnly={locked} className={inputCls} value={f.name} onChange={(e) => set('name', e.target.value)} /></Field>
        <Field label="Report Date" required><input type="date" aria-label="Report Date" readOnly={locked} className={inputCls} value={f.reportDate} onChange={(e) => set('reportDate', e.target.value)} /></Field>
        <Field label="Business Purpose" required><input aria-label="Business Purpose" readOnly={locked} className={inputCls} value={f.purpose} onChange={(e) => set('purpose', e.target.value)} /></Field>
        <Field label="Policy" required>
          <select disabled={locked} className={inputCls} value={f.policy} onChange={(e) => set('policy', e.target.value)} aria-label="Policy">
            <option>Northwind US Travel & Expense Policy</option>
            <option>Northwind International Travel Policy</option>
            <option>Non-Travel Expense Policy</option>
          </select>
        </Field>
        <Field label="Report Number"><input readOnly className={inputCls} value={r.number} /></Field>
        <Field label="Approver"><input readOnly className={inputCls} value={r.approver ?? 'Priya Raman'} /></Field>
        <div className="col-span-2"><Field label="Comment"><textarea aria-label="Comment" readOnly={locked} className={`${inputCls} h-20 py-2`} value={f.comment} onChange={(e) => set('comment', e.target.value)} /></Field></div>
      </div>
    </Modal>
  )
}

/* ─────────────────────── Add expense modal ─────────────────────── */

function AddExpense({ reportId, onClose, onNew }: { reportId: string; onClose: () => void; onNew: (type: string) => void }) {
  const tx = useCollection<any>('concur.transactions').filter((t) => t.status === 'available')
  const [tab, setTab] = useState<'avail' | 'new'>('avail')
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [q, setQ] = useState('')
  const add = () => {
    const now = Date.now()
    tx.filter((t) => sel.has(t.id)).forEach((t, i) => {
      db.insert('concur.expenses', {
        id: `cex-${t.id}-${now.toString(36)}`,
        reportId,
        type: t.suggestedType,
        date: t.date,
        vendor: t.vendor,
        city: t.city,
        paymentType: 'American Express Corporate',
        amount: t.amount,
        currency: 'USD',
        comment: '',
        purpose: '',
        receipt: true,
        transactionId: t.id,
        receiptEmailId: t.receiptEmailId,
        attendees: [{ name: ME.name, type: 'Employee', company: 'Northwind Global' }],
        order: i,
      })
      db.update('concur.transactions', t.id, { status: 'assigned', reportId })
    })
    recalc(reportId)
    onClose()
  }
  return (
    <Modal
      title="Add Expense"
      width={980}
      onClose={onClose}
      agent="concur-add-modal"
      footer={tab === 'avail' ? <><Btn onClick={onClose}>Cancel</Btn><Btn primary data-agent="concur-add-to-report" disabled={!sel.size} onClick={add}>Add To Report</Btn></> : <Btn onClick={onClose}>Cancel</Btn>}
    >
      <div className="flex gap-6 px-6 border-b border-[#e5e5e5]">
        {[['avail', `Available Expenses (${tx.length})`], ['new', 'Create New Expense']].map(([k, l]) => (
          <button key={k} data-agent={`concur-add-tab-${k}`} onClick={() => setTab(k as any)} className={`relative h-12 text-[14px] font-semibold ${tab === k ? 'text-[#0a6ed1]' : 'text-[#32363a]'}`}>
            {l}
            {tab === k && <span className="absolute left-0 right-0 bottom-0 h-[3px] bg-[#0a6ed1]" />}
          </button>
        ))}
      </div>
      {tab === 'avail' ? (
        <div>
          <div className="px-6 py-3 flex items-center gap-3 text-[13px] text-[#6a6d70]">
            <label className="flex items-center gap-2"><input type="checkbox" data-agent="concur-add-select-all" aria-label="Select all" checked={sel.size === tx.length && tx.length > 0} onChange={(e) => setSel(e.target.checked ? new Set(tx.map((t) => t.id)) : new Set())} className="w-4 h-4 accent-[#0a6ed1]" /> Select all</label>
            <span>{sel.size} selected · {$(tx.filter((t) => sel.has(t.id)).reduce((s, t) => s + t.amount, 0))}</span>
          </div>
          <TxTable rows={tx} selected={sel} agentPrefix="concur-add-tx" onToggle={(id) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })} empty="No available expenses." />
        </div>
      ) : (
        <div className="p-6">
          <div className="relative mb-4">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#6a6d70]" />
            <input className={`${inputCls} pl-9`} placeholder="Search for an expense type" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-6">
            {EXPENSE_TYPES.map(([g, types]) => (
              <div key={g}>
                <div className="text-[13px] font-semibold text-[#6a6d70] uppercase mb-2">{g}</div>
                {types.filter((t) => t.toLowerCase().includes(q.toLowerCase())).map((t) => (
                  <button key={t} data-agent={`concur-new-type-${slug(t)}`} onClick={() => onNew(t)} className="block w-full text-left text-[14px] text-[#0a6ed1] py-1.5 hover:underline">{t}</button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  )
}

/* ─────────────────────── Expense form ─────────────────────── */

const HOTEL_ITEMS = ['Room Rate', 'Room Tax', 'Hotel Breakfast/Room Service', 'Hotel Internet', 'Hotel Parking', 'Laundry', 'Other Hotel Charges']
const COST_CENTERS = ['10101301 — Ops Boston', '10101501 — Facilities Boston', '10102201 — Ops Chicago', '10103101 — Sales East', '10104001 — IT Shared Services']

function ExpenseForm({ exp, onClose, locked, onDelete }: { exp: any; onClose: () => void; locked: boolean; onDelete: () => void }) {
  const [f, setF] = useState<any>(exp)
  const [typeOpen, setTypeOpen] = useState(false)
  const [att, setAtt] = useState('')
  const [showReceipt, setShowReceipt] = useState(false)
  const [tab, setTab] = useState<'Details' | 'Itemizations' | 'Allocations'>('Details')
  const [amt, setAmt] = useState((exp.amount ?? 0).toFixed(2))
  const [attach, setAttach] = useState(false)
  const email = useRecord<any>('outlook.emails', exp.receiptEmailId)
  useEffect(() => setF(exp), [exp.id])
  const set = (k: string, v: any) => setF((x: any) => ({ ...x, [k]: v }))
  const card = !!exp.transactionId
  const alerts = expenseAlerts(f)
  const matches = att.trim().length >= 2 ? PEOPLE.filter((p) => p.name.toLowerCase().includes(att.trim().toLowerCase()) && !f.attendees?.some((a: any) => a.name === p.name)).slice(0, 4) : []
  const save = () => {
    db.update('concur.expenses', exp.id, { ...f })
    recalc(exp.reportId)
    onClose()
  }
  const addAttendee = (a: any) => {
    set('attendees', [...(f.attendees ?? []), a])
    setAtt('')
  }
  const TI = typeIcon(f.type)
  return (
    <div className="w-[600px] shrink-0 border-l border-[#d9d9d9] bg-white flex flex-col min-h-0" data-agent="concur-expense-form">
      <div className="h-14 shrink-0 px-5 flex items-center gap-2 border-b border-[#e5e5e5]">
        <TI className="w-5 h-5 text-[#0a6ed1]" />
        <div className="text-[18px] font-semibold flex-1 truncate">{f.type === 'Undefined' ? 'Undefined' : f.type} · {$(f.amount)}</div>
        <button onClick={onClose} aria-label="Close expense" className="w-8 h-8 rounded hover:bg-[#f2f2f2] flex items-center justify-center"><X className="w-5 h-5" /></button>
      </div>
      <div className="flex gap-5 px-5 border-b border-[#e5e5e5] text-[14px] font-semibold">
        {(['Details', 'Itemizations', 'Allocations'] as const).map((t) => (
          <button key={t} role="tab" data-agent={`concur-exp-tab-${t.toLowerCase()}`} onClick={() => setTab(t)} className={`relative h-10 flex items-center ${tab === t ? 'text-[#0a6ed1]' : 'text-[#32363a] hover:text-[#0a6ed1]'}`}>
            {t}
            {t === 'Itemizations' && f.itemizations?.length ? ` (${f.itemizations.length})` : ''}
            {t === 'Allocations' && f.allocations?.length ? ` (${f.allocations.length})` : ''}
            {tab === t && <span className="absolute left-0 right-0 bottom-0 h-[3px] bg-[#0a6ed1]" />}
          </button>
        ))}
      </div>
      {tab === 'Itemizations' && <Itemizations f={f} set={set} locked={locked} />}
      {tab === 'Allocations' && <Allocations f={f} set={set} locked={locked} />}
      <div className={`flex-1 overflow-auto p-5 space-y-4 ${tab === 'Details' ? '' : 'hidden'}`}>
        {alerts.length > 0 && (
          <div className="rounded border border-[#e9730c] bg-[#fef7f1] p-3 text-[13px] text-[#32363a]">
            {alerts.map((a) => <div key={a} className="flex gap-2"><AlertTriangle className="w-4 h-4 text-[#e9730c] shrink-0 mt-0.5" /> {a}</div>)}
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div className="relative">
            <Field label="Expense Type" required>
              <button type="button" data-agent="concur-exp-type" aria-label="Expense Type" disabled={locked} onClick={() => setTypeOpen((o) => !o)} className={`${inputCls} flex items-center text-left`}>
                <span className="flex-1">{f.type}</span><ChevronDown className="w-4 h-4 text-[#0a6ed1]" />
              </button>
            </Field>
            {typeOpen && (
              <div className="absolute z-30 left-0 right-0 top-[64px] max-h-[300px] overflow-auto bg-white rounded border border-[#d9d9d9] shadow-lg py-1">
                {EXPENSE_TYPES.map(([g, ts]) => (
                  <div key={g}>
                    <div className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase text-[#6a6d70]">{g}</div>
                    {ts.map((t) => (
                      <button key={t} data-agent={`concur-exp-type-opt-${slug(t)}`} onClick={() => { set('type', t); setTypeOpen(false) }} className={`block w-full text-left px-3 py-1.5 text-[14px] hover:bg-[#ebf5fe] ${f.type === t ? 'text-[#0a6ed1] font-semibold' : ''}`}>{t}</button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
          <Field label="Transaction Date" required><input type="date" className={inputCls} readOnly={card || locked} value={isoDate(f.date)} onChange={(e) => e.target.value && set('date', new Date(e.target.value + 'T12:00:00').toISOString())} aria-label="Transaction Date" /></Field>
          <div className="col-span-2"><Field label="Business Purpose"><input data-agent="concur-exp-purpose" aria-label="Business Purpose" readOnly={locked} className={inputCls} value={f.purpose ?? ''} onChange={(e) => set('purpose', e.target.value)} /></Field></div>
          <Field label="Vendor"><input data-agent="concur-exp-vendor" aria-label="Vendor" readOnly={locked} className={inputCls} value={f.vendor ?? ''} onChange={(e) => set('vendor', e.target.value)} /></Field>
          <Field label="City of Purchase" required><input data-agent="concur-exp-city" aria-label="City of Purchase" readOnly={locked} className={inputCls} value={f.city ?? ''} onChange={(e) => set('city', e.target.value)} /></Field>
          <Field label="Payment Type" required>
            {card || locked ? (
              <input readOnly className={inputCls} value={f.paymentType} aria-label="Payment Type" />
            ) : (
              <select className={inputCls} value={f.paymentType} onChange={(e) => set('paymentType', e.target.value)} aria-label="Payment Type"><option>Cash</option><option>Personal Card</option></select>
            )}
          </Field>
          <Field label="Amount" required>
            <div className="flex gap-2">
              {card || locked ? (
                <input readOnly className={`${inputCls} text-right`} value={f.amount.toFixed(2)} aria-label="Amount" />
              ) : (
                <input data-agent="concur-exp-amount" className={`${inputCls} text-right`} value={amt} onChange={(e) => { setAmt(e.target.value); set('amount', r2(Number(e.target.value.replace(/[$,]/g, '')) || 0)) }} onBlur={() => setAmt(f.amount.toFixed(2))} aria-label="Amount" />
              )}
              <input readOnly className={`${inputCls} w-20`} value="USD" />
            </div>
          </Field>
          {f.type === 'Hotel' && (
            <>
              <Field label="Check-in Date" required><input data-agent="concur-exp-checkin" type="date" aria-label="Check-in Date" className={inputCls} value={f.checkIn ?? ''} onChange={(e) => set('checkIn', e.target.value)} /></Field>
              <Field label="Check-out Date" required><input data-agent="concur-exp-checkout" type="date" aria-label="Check-out Date" className={inputCls} value={f.checkOut ?? ''} onChange={(e) => set('checkOut', e.target.value)} /></Field>
            </>
          )}
          {f.type === 'Airfare' && (
            <>
              <Field label="Ticket Number"><input className={inputCls} value={f.ticket ?? 'GH7Q2K'} onChange={(e) => set('ticket', e.target.value)} aria-label="Ticket Number" /></Field>
              <Field label="Class of Service"><select className={inputCls} value={f.cabin ?? 'Economy/Coach'} onChange={(e) => set('cabin', e.target.value)} aria-label="Class of Service"><option>Economy/Coach</option><option>Premium Economy</option><option>Business</option></select></Field>
            </>
          )}
          {f.type === 'Personal Car Mileage' && !card && (
            <>
              <Field label="Distance (mi)"><input className={inputCls} value={f.miles ?? ''} onChange={(e) => { const m = Number(e.target.value) || 0; setF((x: any) => ({ ...x, miles: e.target.value, amount: r2(m * 0.7) })); setAmt((m * 0.7).toFixed(2)) }} aria-label="Distance" /></Field>
              <Field label="Rate"><input readOnly className={inputCls} value="$0.70 / mi (IRS 2026)" /></Field>
            </>
          )}
          <div className="col-span-2"><Field label="Comment"><textarea data-agent="concur-exp-comment" aria-label="Comment" readOnly={locked} className={`${inputCls} h-20 py-2`} value={f.comment ?? ''} onChange={(e) => set('comment', e.target.value)} /></Field></div>
        </div>

        {(f.type === 'Business Meals' || f.type === 'Entertainment') && (
          <div className="rounded border border-[#d9d9d9]">
            <div className="h-11 px-4 flex items-center gap-2 border-b border-[#e5e5e5]">
              <Users className="w-4 h-4 text-[#0a6ed1]" />
              <div className="text-[15px] font-semibold flex-1">Attendees ({f.attendees?.length ?? 0})</div>
              <span className="text-[12px] text-[#6a6d70]">{f.attendees?.length ? `${$(f.amount / f.attendees.length)} per person` : ''}</span>
            </div>
            {(f.attendees ?? []).map((a: any, i: number) => (
              <div key={i} data-agent={`concur-attendee-${slug(a.name)}`} className="h-10 px-4 flex items-center gap-3 border-b border-[#eeeeee] text-[14px]">
                <div className="w-7 h-7 rounded-full bg-[#ebf5fe] text-[#0a6ed1] flex items-center justify-center text-[11px] font-semibold">{a.name.split(' ').map((s: string) => s[0]).join('').slice(0, 2)}</div>
                <div className="flex-1">{a.name}</div>
                <div className="text-[13px] text-[#6a6d70] w-[170px] truncate">{a.company}</div>
                <div className="text-[13px] text-[#6a6d70] w-[110px]">{a.type}</div>
                <div className="text-[13px] w-[70px] text-right">{$(f.amount / f.attendees.length)}</div>
                {!locked && i > 0 ? (
                  <button aria-label={`Remove ${a.name}`} data-agent={`concur-attendee-remove-${slug(a.name)}`} onClick={() => set('attendees', f.attendees.filter((_: any, j: number) => j !== i))} className="w-6 h-6 rounded hover:bg-[#f2f2f2] flex items-center justify-center text-[#6a6d70]"><X className="w-3.5 h-3.5" /></button>
                ) : <span className="w-6" />}
              </div>
            ))}
            {!locked && (
              <div className="p-3 relative">
                <div className="flex gap-2">
                  <input data-agent="concur-attendee-search" aria-label="Search attendees" className={inputCls} placeholder="Search by name to add an attendee" value={att} onChange={(e) => setAtt(e.target.value)} />
                </div>
                {att.trim().length >= 2 && (
                  <div className="absolute z-20 left-3 right-3 top-[50px] bg-white rounded border border-[#d9d9d9] shadow-lg py-1">
                    {matches.map((p) => (
                      <button key={p.id} data-agent={`concur-attendee-opt-${p.id}`} onClick={() => addAttendee({ name: p.name, company: p.company, title: p.title, type: p.external ? 'Business Guest' : 'Employee' })} className="w-full text-left px-3 py-1.5 hover:bg-[#ebf5fe]">
                        <div className="text-[14px]">{p.name}</div>
                        <div className="text-[12px] text-[#6a6d70]">{p.title} · {p.company}</div>
                      </button>
                    ))}
                    <button data-agent="concur-attendee-new" onClick={() => addAttendee({ name: att.trim(), company: f.guestCompany || 'Adatum Corporation', type: 'Business Guest' })} className="w-full text-left px-3 py-1.5 hover:bg-[#ebf5fe] text-[14px] text-[#0a6ed1] flex items-center gap-1.5">
                      <Plus className="w-4 h-4" /> Create new Business Guest “{att.trim()}”
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="rounded border border-[#d9d9d9] p-4">
          <div className="flex items-center gap-2">
            <Paperclip className="w-4 h-4 text-[#0a6ed1]" />
            <div className="text-[15px] font-semibold flex-1">Receipt</div>
            {f.receipt ? (
              <span className="text-[13px] text-[#107e3e] flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> {f.receiptName ? `${f.receiptName} attached` : 'e-Receipt attached'}</span>
            ) : (
              <Btn data-agent="concur-exp-attach" disabled={locked} onClick={() => setAttach(true)}>Attach Receipt</Btn>
            )}
          </div>
          {f.receipt && email && (
            <>
              <button onClick={() => setShowReceipt((s) => !s)} className="text-[13px] text-[#0a6ed1] hover:underline mt-2">{showReceipt ? 'Hide receipt' : 'View receipt'}</button>
              {showReceipt && <pre className="mt-2 p-3 bg-[#f7f7f7] rounded text-[12px] whitespace-pre-wrap font-mono text-[#32363a] max-h-[220px] overflow-auto">{email.body}</pre>}
            </>
          )}
          {f.receipt && f.receiptName && !card && !locked && (
            <button data-agent="concur-exp-detach" onClick={() => setF((x: any) => ({ ...x, receipt: false, receiptName: undefined }))} className="text-[13px] text-[#0a6ed1] hover:underline mt-2">Detach receipt</button>
          )}
        </div>
      </div>
      {!locked && (
        <div className="h-16 shrink-0 px-5 flex items-center justify-end gap-2 border-t border-[#e5e5e5]">
          <button data-agent="concur-exp-delete" onClick={onDelete} className="mr-auto text-[14px] font-semibold text-[#bb0000] hover:underline flex items-center gap-1"><Trash2 className="w-4 h-4" /> Delete Expense</button>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn primary data-agent="concur-exp-save" onClick={save}>Save Expense</Btn>
        </div>
      )}
      {attach && <AttachReceipt onClose={() => setAttach(false)} onPick={(name) => { setF((x: any) => ({ ...x, receipt: true, receiptName: name })); setAttach(false) }} />}
    </div>
  )
}

function Itemizations({ f, set, locked }: { f: any; set: (k: string, v: any) => void; locked: boolean }) {
  const items: any[] = f.itemizations ?? []
  const used = r2(items.reduce((s, i) => s + i.amount, 0))
  const remaining = r2(f.amount - used)
  const types = f.type === 'Hotel' ? HOTEL_ITEMS : ALL_TYPES
  const [n, setN] = useState({ type: types[0], date: isoDate(f.date), amount: '' })
  const nights = f.checkIn && f.checkOut ? Math.max(0, Math.round((+new Date(f.checkOut) - +new Date(f.checkIn)) / 86400000)) : 0
  const add = () => {
    const a = Number(n.amount) || 0
    if (a <= 0) return
    set('itemizations', [...items, { id: uid('itm'), type: n.type, date: n.date, amount: r2(a) }])
    setN({ ...n, amount: '' })
  }
  const nightly = () => {
    if (!nights) return
    const per = r2(remaining / nights)
    const out = Array.from({ length: nights }, (_, i) => ({ id: uid('itm'), type: 'Room Rate', date: isoDate(new Date(+new Date(f.checkIn + 'T12:00:00') + i * 86400000)), amount: i === nights - 1 ? r2(remaining - per * (nights - 1)) : per }))
    set('itemizations', [...items, ...out])
  }
  return (
    <div className="flex-1 overflow-auto p-5" data-agent="concur-itemizations">
      <div className="flex gap-6 mb-4 text-[14px]">
        <div><div className="text-[12px] text-[#6a6d70]">Transaction Amount</div><div className="text-[18px] font-light">{$(f.amount)}</div></div>
        <div><div className="text-[12px] text-[#6a6d70]">Itemized</div><div className="text-[18px] font-light">{$(used)}</div></div>
        <div><div className="text-[12px] text-[#6a6d70]">Remaining</div><div className={`text-[18px] font-light ${remaining === 0 ? 'text-[#107e3e]' : remaining < 0 ? 'text-[#bb0000]' : ''}`}>{$(remaining)}</div></div>
      </div>
      <div className="rounded border border-[#d9d9d9] mb-4">
        <table className="w-full text-[14px]">
          <thead><tr className="h-9 text-left text-[13px] text-[#6a6d70] border-b border-[#e5e5e5]"><th className="pl-3 font-semibold">Expense Type</th><th className="px-2 font-semibold">Date</th><th className="px-2 font-semibold text-right">Amount</th><th className="w-10" /></tr></thead>
          <tbody>
            {items.length === 0 && <tr><td colSpan={4} className="h-14 text-center text-[13px] text-[#6a6d70]">No itemizations. Split this expense into its parts below.</td></tr>}
            {items.map((i) => (
              <tr key={i.id} className="h-10 border-b border-[#eeeeee]">
                <td className="pl-3">{i.type}</td><td className="px-2">{d(i.date)}</td><td className="px-2 text-right">{$(i.amount)}</td>
                <td className="text-center">{!locked && <button aria-label="Remove itemization" onClick={() => set('itemizations', items.filter((x) => x.id !== i.id))} className="w-6 h-6 rounded hover:bg-[#f2f2f2] inline-flex items-center justify-center text-[#6a6d70]"><Trash2 className="w-3.5 h-3.5" /></button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!locked && (
        <div className="rounded border border-[#d9d9d9] p-4 space-y-3">
          <div className="text-[15px] font-semibold">New Itemization</div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Expense Type"><select className={inputCls} value={n.type} onChange={(e) => setN({ ...n, type: e.target.value })} aria-label="Itemization type">{types.map((t) => <option key={t}>{t}</option>)}</select></Field>
            <Field label="Date"><input type="date" className={inputCls} value={n.date} onChange={(e) => setN({ ...n, date: e.target.value })} aria-label="Itemization date" /></Field>
            <Field label="Amount"><input className={`${inputCls} text-right`} placeholder={remaining.toFixed(2)} value={n.amount} onChange={(e) => setN({ ...n, amount: e.target.value })} aria-label="Itemization amount" /></Field>
          </div>
          <div className="flex gap-2">
            <Btn primary data-agent="concur-itemize-add" onClick={add} disabled={!(Number(n.amount) > 0)}><Plus className="w-4 h-4" /> Add Itemization</Btn>
            {f.type === 'Hotel' && <Btn data-agent="concur-itemize-nightly" onClick={nightly} disabled={!nights || remaining <= 0}>Itemize Nightly ({nights} night{nights === 1 ? '' : 's'})</Btn>}
            {items.length > 0 && <Btn onClick={() => set('itemizations', [])}>Clear All</Btn>}
          </div>
          {f.type === 'Hotel' && !nights && <div className="text-[12px] text-[#6a6d70]">Enter check-in and check-out dates on the Details tab to itemize nightly.</div>}
        </div>
      )}
      <div className="mt-3 text-[12px] text-[#6a6d70]">Itemizations are saved with the expense when you select Save Expense.</div>
    </div>
  )
}

function Allocations({ f, set, locked }: { f: any; set: (k: string, v: any) => void; locked: boolean }) {
  const al: any[] = f.allocations?.length ? f.allocations : [{ id: 'default', costCenter: COST_CENTERS[0], percent: 100 }]
  const total = al.reduce((s, a) => s + (Number(a.percent) || 0), 0)
  const upd = (next: any[]) => set('allocations', next)
  return (
    <div className="flex-1 overflow-auto p-5" data-agent="concur-allocations">
      <div className="text-[13px] text-[#6a6d70] mb-3">Allocate this expense across cost centers. Percentages must total 100%.</div>
      <div className="rounded border border-[#d9d9d9] mb-3">
        <table className="w-full text-[14px]">
          <thead><tr className="h-9 text-left text-[13px] text-[#6a6d70] border-b border-[#e5e5e5]"><th className="pl-3 font-semibold">Cost Center</th><th className="px-2 font-semibold w-24 text-right">Percent</th><th className="px-2 font-semibold w-28 text-right">Amount</th><th className="w-10" /></tr></thead>
          <tbody>
            {al.map((a, i) => (
              <tr key={a.id} className="h-11 border-b border-[#eeeeee]">
                <td className="pl-3 pr-2">
                  <select disabled={locked} className={inputCls} value={a.costCenter} onChange={(e) => upd(al.map((x, j) => (j === i ? { ...x, costCenter: e.target.value } : x)))} aria-label="Cost center">{COST_CENTERS.map((c) => <option key={c}>{c}</option>)}</select>
                </td>
                <td className="px-2"><input readOnly={locked} className={`${inputCls} text-right`} value={a.percent} onChange={(e) => upd(al.map((x, j) => (j === i ? { ...x, percent: e.target.value } : x)))} aria-label="Percent" /></td>
                <td className="px-2 text-right">{$(f.amount * (Number(a.percent) || 0) / 100)}</td>
                <td className="text-center">{!locked && al.length > 1 && <button aria-label="Remove allocation" onClick={() => upd(al.filter((_, j) => j !== i))} className="w-6 h-6 rounded hover:bg-[#f2f2f2] inline-flex items-center justify-center text-[#6a6d70]"><Trash2 className="w-3.5 h-3.5" /></button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-3">
        {!locked && <Btn data-agent="concur-allocate-add" onClick={() => upd([...al, { id: uid('alc'), costCenter: COST_CENTERS[1], percent: Math.max(0, 100 - total) }])}><Plus className="w-4 h-4" /> Add Allocation</Btn>}
        {!locked && <Btn onClick={() => { const n = al.length; upd(al.map((x, i) => ({ ...x, percent: i === n - 1 ? r2(100 - r2(100 / n) * (n - 1)) : r2(100 / n) }))) }}>Split Evenly</Btn>}
        <div className={`ml-auto text-[14px] font-semibold ${Math.abs(total - 100) < 0.01 ? 'text-[#107e3e]' : 'text-[#bb0000]'}`}>Total {r2(total)}%</div>
      </div>
    </div>
  )
}

/* ─────────────────────── Report page ─────────────────────── */

function ReportPage({ id, back, onCopied }: { id: string; back: () => void; onCopied: (id: string) => void }) {
  const r = useRecord<any>('concur.reports', id)
  const all = useCollection<any>('concur.expenses')
  const exps = useMemo(() => all.filter((e) => e.reportId === id).sort((a, b) => +new Date(a.date) - +new Date(b.date)), [all, id])
  const [open, setOpen] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [submitStep, setSubmitStep] = useState<0 | 1 | 2>(0)
  const [flowOpen, setFlowOpen] = useState(false)
  const [warn, setWarn] = useState(false)
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [dlg, setDlg] = useState<null | 'delete-report' | 'recall' | 'delete-exp' | 'header' | 'totals' | 'timeline' | 'print' | 'receipts' | 'allocate' | 'combine-help' | 'attach-report'>(null)
  const [note, setNote] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null)
  const { isAgent } = useDesk()
  if (!r) return <div className="p-10">Report not found.</div>
  const locked = r.status !== 'Not Submitted' && r.status !== 'Sent Back'
  const openExp = exps.find((e) => e.id === open)
  const alertCount = exps.reduce((n, e) => n + expenseAlerts(e).length, 0)
  const targets = sel.size ? exps.filter((e) => sel.has(e.id)) : openExp ? [openExp] : []

  const newExpense = (type: string) => {
    const eid = uid('cex')
    db.insert('concur.expenses', { id: eid, reportId: id, type, date: new Date().toISOString(), vendor: '', city: '', paymentType: 'Cash', amount: 0, currency: 'USD', comment: '', receipt: false, attendees: [{ name: ME.name, type: 'Employee', company: 'Northwind Global' }] })
    setAdding(false)
    setOpen(eid)
  }
  const submit = () => {
    const now = new Date().toISOString()
    db.update('concur.reports', id, {
      status: 'Submitted & Pending Approval',
      submittedAt: now,
      submittedBy: isAgent ? 'hworker' : undefined,
      approvalFlow: [
        { name: ME.name, role: 'Submitted', status: 'done', at: now },
        { name: 'Priya Raman', role: 'Manager Approval', status: 'pending' },
        { name: 'Northwind Expense Processing', role: 'Audit Review', status: 'waiting' },
      ],
    })
    setSubmitStep(2)
  }
  const removeExpenses = (list: any[]) => {
    for (const e of list) {
      db.remove('concur.expenses', e.id)
      if (e.transactionId && db.find('concur.transactions', e.transactionId)) db.update('concur.transactions', e.transactionId, { status: 'available', reportId: undefined })
    }
    recalc(id)
    if (list.some((e) => e.id === open)) setOpen(null)
    setSel(new Set())
    setNote({ type: 'success', text: `${list.length} expense${list.length === 1 ? '' : 's'} deleted. Card transactions were returned to Available Expenses.` })
  }
  const deleteReport = () => {
    removeExpenses(exps)
    db.remove('concur.reports', id)
    back()
  }
  const recall = () => {
    const now = new Date().toISOString()
    db.update('concur.reports', id, (x) => ({
      status: 'Not Submitted',
      recalledAt: now,
      approvalFlow: (x.approvalFlow ?? []).map((s: any) => (s.status === 'pending' ? { ...s, status: 'waiting' } : s)),
    }))
    logHistory('concur.reports', id, 'Report recalled by employee')
    setNote({ type: 'info', text: 'Report recalled. You can edit it and submit it again.' })
  }
  const copyExpenses = () => {
    targets.forEach((e) => {
      const { id: _old, transactionId: _t, receiptEmailId: _r, ...rest } = e
      db.insert('concur.expenses', { ...rest, id: uid('cex'), paymentType: 'Cash', receipt: false, receiptName: undefined })
    })
    recalc(id)
    setNote({ type: 'success', text: `${targets.length} expense${targets.length === 1 ? '' : 's'} copied as out-of-pocket (Cash) expenses.` })
    setSel(new Set())
  }
  const combine = () => {
    const cardE = targets.find((e) => e.transactionId)
    const manual = targets.find((e) => !e.transactionId)
    if (targets.length !== 2 || !cardE || !manual) return setDlg('combine-help')
    db.update('concur.expenses', cardE.id, { type: manual.type, purpose: manual.purpose || cardE.purpose, comment: [cardE.comment, manual.comment].filter(Boolean).join(' '), attendees: manual.attendees?.length > 1 ? manual.attendees : cardE.attendees, itemizations: manual.itemizations ?? cardE.itemizations })
    db.remove('concur.expenses', manual.id)
    recalc(id)
    setSel(new Set())
    setOpen(cardE.id)
    setNote({ type: 'success', text: `Combined the ${manual.type} entry with the ${cardE.vendor} card transaction.` })
  }
  const copyReport = () => {
    const nid = uid('crp')
    db.insert('concur.reports', { id: nid, name: `Copy of ${r.name}`, number: Math.random().toString(36).slice(2, 9).toUpperCase(), purpose: r.purpose, comment: r.comment ?? '', reportDate: new Date().toISOString(), policy: r.policy, status: 'Not Submitted', total: 0, createdAt: new Date().toISOString(), approver: r.approver ?? 'Priya Raman', approvalFlow: [] })
    exps.forEach((e) => {
      const { id: _old, transactionId: _t, receiptEmailId: _r, reportId: _p, ...rest } = e
      db.insert('concur.expenses', { ...rest, id: uid('cex'), reportId: nid, paymentType: 'Cash', receipt: false, date: new Date().toISOString() })
    })
    recalc(nid)
    onCopied(nid)
  }
  const copyLink = () => {
    const url = `https://us2.concursolutions.com/nui/expense/report/${id.toUpperCase().replace(/[^A-Z0-9]/g, '')}`
    navigator.clipboard?.writeText(url).catch(() => {})
    setNote({ type: 'success', text: 'Report link copied to clipboard.' })
  }
  const toggle = (eid: string) => setSel((s) => { const n = new Set(s); n.has(eid) ? n.delete(eid) : n.add(eid); return n })

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="bg-white border-b border-[#d9d9d9] px-8 pt-4 pb-3 shrink-0">
        <button onClick={back} className="text-[13px] text-[#0a6ed1] hover:underline flex items-center gap-1 mb-2"><ArrowLeft className="w-3.5 h-3.5" /> Manage Expenses</button>
        <div className="flex items-start gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="text-[26px] font-light text-[#32363a] truncate" data-agent="concur-report-title">{r.name}</div>
              <Status s={r.status} />
              {r.createdBy === 'hworker' && <HW />}
            </div>
            <div className="text-[13px] text-[#6a6d70] mt-1">Report Number: {r.number} · {d(r.reportDate)} · {r.purpose}</div>
          </div>
          <div className="flex-1" />
          {!locked && <Btn data-agent="concur-delete-report" onClick={() => setDlg('delete-report')}><Trash2 className="w-4 h-4" /> Delete Report</Btn>}
          {!locked && (
            <Btn primary data-agent="concur-submit" disabled={!exps.length} onClick={() => (alertCount ? setWarn(true) : setSubmitStep(1))}>Submit Report</Btn>
          )}
          {locked && <Btn data-agent="concur-copy-report" onClick={copyReport}><Copy className="w-4 h-4" /> Copy Report</Btn>}
          {locked && <Btn data-agent="concur-recall" disabled={r.status !== 'Submitted & Pending Approval'} title={r.status !== 'Submitted & Pending Approval' ? 'Only reports pending approval can be recalled' : undefined} onClick={() => setDlg('recall')}>Recall</Btn>}
        </div>
        <div className="flex items-center gap-5 mt-3 text-[14px]">
          <Menu
            agent="concur-report-details"
            trigger={<MenuLabel>Report Details</MenuLabel>}
            items={[
              { label: 'Report Header', onClick: () => setDlg('header'), agent: 'concur-rd-header' },
              { label: 'Report Totals', onClick: () => setDlg('totals'), agent: 'concur-rd-totals' },
              { label: 'Report Timeline', onClick: () => setDlg('timeline'), agent: 'concur-rd-timeline' },
            ]}
          />
          <Menu
            agent="concur-print-share"
            trigger={<MenuLabel><Printer className="w-4 h-4" /> Print/Share</MenuLabel>}
            items={[
              { label: 'Detailed Report', onClick: () => setDlg('print'), agent: 'concur-ps-detailed' },
              { label: 'Copy Report Link', onClick: copyLink, agent: 'concur-ps-link' },
            ]}
          />
          <Menu
            agent="concur-manage-receipts"
            trigger={<MenuLabel><Receipt className="w-4 h-4" /> Manage Receipts</MenuLabel>}
            items={[
              { label: 'View Receipts', onClick: () => setDlg('receipts'), agent: 'concur-mr-view' },
              { label: 'Attach Receipt Images', onClick: () => setDlg('attach-report'), disabled: locked, agent: 'concur-mr-attach' },
            ]}
          />
          <button data-agent="concur-approval-flow-btn" onClick={() => setFlowOpen((o) => !o)} className="flex items-center gap-1 text-[#0a6ed1] font-semibold"><Users className="w-4 h-4" /> Approval Flow</button>
          <div className="flex-1" />
          <div className="text-right">
            <div className="text-[12px] text-[#6a6d70]">Report Total</div>
            <div className="text-[20px] font-light" data-agent="concur-report-total">{$(r.total)}</div>
          </div>
          <div className="text-right">
            <div className="text-[12px] text-[#6a6d70]">Amount Due Company Card</div>
            <div className="text-[20px] font-light">{$(exps.filter((e) => e.transactionId).reduce((s, e) => s + e.amount, 0))}</div>
          </div>
          <div className="text-right">
            <div className="text-[12px] text-[#6a6d70]">Amount Due Employee</div>
            <div className="text-[20px] font-light">{$(exps.filter((e) => !e.transactionId).reduce((s, e) => s + e.amount, 0))}</div>
          </div>
        </div>
      </div>
      {flowOpen && !(r.approvalFlow?.length > 0) && (
        <div className="bg-white border-b border-[#d9d9d9] px-8 py-4 shrink-0 text-[14px] text-[#6a6d70]" data-agent="concur-approval-flow-empty">
          <span className="font-semibold text-[#32363a]">Approval Flow</span> · When submitted, this report goes to <b className="text-[#32363a]">{r.approver ?? 'Priya Raman'}</b> (Manager Approval), then Northwind Expense Processing (Audit Review).
        </div>
      )}
      {(flowOpen || locked) && r.approvalFlow?.length > 0 && (
        <div className="bg-white border-b border-[#d9d9d9] px-8 py-4 shrink-0" data-agent="concur-approval-flow">
          <div className="text-[15px] font-semibold mb-3">Approval Flow</div>
          <div className="flex items-center">
            {r.approvalFlow.map((s: any, i: number) => (
              <div key={i} className="flex items-center">
                <div className="flex items-center gap-3">
                  {s.status === 'done' ? <CheckCircle2 className="w-7 h-7 text-[#107e3e]" /> : s.status === 'pending' ? <Clock className="w-7 h-7 text-[#e9730c]" /> : <Circle className="w-7 h-7 text-[#bfbfbf]" />}
                  <div>
                    <div className="text-[14px] font-semibold">{s.name}</div>
                    <div className="text-[12px] text-[#6a6d70]">{s.role} · {s.status === 'done' ? (s.at ? new Date(s.at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Done') : s.status === 'pending' ? 'Pending approval' : 'Not started'}</div>
                  </div>
                </div>
                {i < r.approvalFlow.length - 1 && <div className="w-24 h-0.5 mx-4 bg-[#d9d9d9]" />}
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="flex-1 min-h-0 flex">
        <div className="flex-1 min-w-0 overflow-auto p-6">
          {note && <Banner type={note.type} onClose={() => setNote(null)}>{note.text}</Banner>}
          {r.status === 'Sent Back' && r.sendBackComment && <Banner type="error">Sent back by {r.approver ?? 'Priya Raman'}: {r.sendBackComment}</Banner>}
          <div className="bg-white rounded-lg border border-[#d9d9d9]">
            <div className="h-14 px-5 flex items-center gap-2 border-b border-[#e5e5e5]">
              <div className="text-[18px] font-semibold mr-3">Expenses</div>
              {!locked && <Btn primary data-agent="concur-add-expense" onClick={() => setAdding(true)}><Plus className="w-4 h-4" /> Add Expense</Btn>}
              <Btn data-agent="concur-exp-edit" disabled={targets.length !== 1 || locked} onClick={() => { setOpen(targets[0].id); setSel(new Set()) }}>Edit</Btn>
              <Btn data-agent="concur-exp-delete-sel" disabled={locked || !targets.length} onClick={() => setDlg('delete-exp')}><Trash2 className="w-4 h-4" /> Delete</Btn>
              <Btn data-agent="concur-exp-copy" disabled={locked || !targets.length} onClick={copyExpenses}><Copy className="w-4 h-4" /> Copy</Btn>
              <Btn data-agent="concur-exp-allocate" disabled={locked || !targets.length} onClick={() => setDlg('allocate')}><Split className="w-4 h-4" /> Allocate</Btn>
              <Btn data-agent="concur-exp-combine" disabled={locked || !targets.length} onClick={combine}><Combine className="w-4 h-4" /> Combine Expenses</Btn>
            </div>
            <table className="w-full text-[14px] text-[#32363a]">
              <thead>
                <tr className="h-10 text-left text-[13px] text-[#6a6d70] border-b border-[#e5e5e5]">
                  <th className="w-10 pl-5" /><th className="px-2 font-semibold">Alerts</th><th className="px-2 font-semibold">Receipt</th><th className="px-2 font-semibold">Payment Type</th><th className="px-2 font-semibold">Expense Type</th><th className="px-2 font-semibold">Vendor Details</th><th className="px-2 font-semibold">Date</th><th className="px-2 pr-5 font-semibold text-right">Requested</th>
                </tr>
              </thead>
              <tbody>
                {exps.length === 0 && <tr><td colSpan={8} className="h-28 text-center text-[#6a6d70]"><FileText className="w-8 h-8 mx-auto mb-2 text-[#bfbfbf]" />No expenses yet. Select Add Expense to add card transactions or create a new expense.</td></tr>}
                {exps.map((e) => {
                  const al = expenseAlerts(e)
                  return (
                    <tr key={e.id} data-agent={`concur-exp-row-${e.transactionId ?? e.id}`} aria-label={`${e.vendor} ${$(e.amount)}`} onClick={() => setOpen(e.id)} className={`h-[52px] border-b border-[#eeeeee] ${open === e.id || sel.has(e.id) ? 'bg-[#ebf5fe]' : 'hover:bg-[#f7f7f7]'}`}>
                      <td className="pl-5" onClick={(ev) => { ev.stopPropagation(); toggle(e.id) }}><input type="checkbox" readOnly checked={sel.has(e.id) || (!sel.size && open === e.id)} className="w-4 h-4 accent-[#0a6ed1]" aria-label="Select expense" /></td>
                      <td className="px-2">{al.length ? <AlertTriangle className="w-4 h-4 text-[#e9730c]" /> : <CheckCircle2 className="w-4 h-4 text-[#107e3e]" />}</td>
                      <td className="px-2">{e.receipt ? <Receipt className="w-4 h-4 text-[#107e3e]" /> : <span className="text-[#bfbfbf]">—</span>}</td>
                      <td className="px-2">{e.paymentType.replace('American Express Corporate', 'Amex Corporate')}</td>
                      <td className="px-2 font-semibold">{e.type}{e.type === 'Business Meals' && e.attendees?.length ? <span className="ml-1 text-[12px] font-normal text-[#6a6d70]">({e.attendees.length} attendees)</span> : null}{e.itemizations?.length ? <span className="ml-1 text-[12px] font-normal text-[#6a6d70]">(itemized)</span> : null}</td>
                      <td className="px-2"><div>{e.vendor}</div><div className="text-[12px] text-[#6a6d70]">{e.city}</div></td>
                      <td className="px-2">{d(e.date)}</td>
                      <td className="px-2 pr-5 text-right font-semibold">{$(e.amount)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {r.comment && <div className="mt-4 text-[13px] text-[#6a6d70]">Report comment: {r.comment}</div>}
          {r.receipts?.length > 0 && <div className="mt-2 text-[13px] text-[#6a6d70] flex items-center gap-1"><Paperclip className="w-3.5 h-3.5" /> Report-level receipts: {r.receipts.join(', ')}</div>}
        </div>
        {openExp && <ExpenseForm key={openExp.id} exp={openExp} locked={locked} onClose={() => setOpen(null)} onDelete={() => removeExpenses([openExp])} />}
      </div>

      {adding && <AddExpense reportId={id} onClose={() => setAdding(false)} onNew={newExpense} />}
      {warn && (
        <Modal title="Report Alerts" width={520} onClose={() => setWarn(false)} footer={<Btn primary onClick={() => setWarn(false)}>OK</Btn>}>
          <div className="p-6 text-[14px] flex gap-3"><AlertTriangle className="w-5 h-5 text-[#e9730c] shrink-0" /> This report has {alertCount} alert(s) that must be resolved before it can be submitted.</div>
        </Modal>
      )}
      {submitStep === 1 && (
        <Modal
          title="User Electronic Agreement"
          width={600}
          agent="concur-certify"
          onClose={() => setSubmitStep(0)}
          footer={<><Btn onClick={() => setSubmitStep(0)}>Decline</Btn><Btn primary data-agent="concur-accept-submit" onClick={submit}>Accept & Submit</Btn></>}
        >
          <div className="p-6 text-[14px] leading-[1.6] text-[#32363a]">
            By clicking on the "Accept &amp; Submit" button, I certify that:
            <ol className="list-decimal pl-5 mt-2 space-y-1">
              <li>This is a true and accurate accounting of expenses incurred to accomplish official business for Northwind Global and there are no expenses claimed as reimbursable which relate to personal or unallowable expenses.</li>
              <li>All required receipts have been attached and are legible.</li>
              <li>I have not been, and will not be, reimbursed by any other party for these expenses.</li>
            </ol>
            <div className="mt-4 p-3 rounded bg-[#f7f7f7] flex justify-between"><span>Report Total</span><b>{$(r.total)}</b></div>
          </div>
        </Modal>
      )}
      {submitStep === 2 && (
        <Modal title="Report Submitted" width={520} agent="concur-submitted" footer={<Btn primary data-agent="concur-submitted-close" onClick={() => setSubmitStep(0)}>Close</Btn>}>
          <div className="p-6 text-[14px] text-[#32363a]">
            <div className="flex items-center gap-2 text-[16px] font-semibold text-[#107e3e] mb-4"><CheckCircle2 className="w-6 h-6" /> Your report has been submitted.</div>
            {[['Report Total', r.total], ['Amount Due Employee', 0], ['Amount Due Company Card', r.total]].map(([k, v]: any) => (
              <div key={k} className="flex justify-between py-1.5 border-b border-[#eeeeee]"><span>{k}</span><b>{$(v)}</b></div>
            ))}
            <div className="mt-4 flex gap-2 text-[13px] text-[#6a6d70]"><Info className="w-4 h-4 shrink-0" /> Sent to Priya Raman (Manager Approval).</div>
          </div>
        </Modal>
      )}

      {dlg === 'delete-report' && <Confirm title="Delete Report" danger ok="Delete" onClose={() => setDlg(null)} onOk={deleteReport} text={<>Delete “{r.name}”? Its {exps.length} expense{exps.length === 1 ? '' : 's'} will be removed; corporate card transactions return to Available Expenses.</>} />}
      {dlg === 'recall' && <Confirm title="Recall Report" ok="Recall" onClose={() => setDlg(null)} onOk={recall} text={<>Recall “{r.name}” from {r.approver ?? 'Priya Raman'}’s approval queue? The report returns to Not Submitted so you can make changes.</>} />}
      {dlg === 'delete-exp' && <Confirm title="Delete Expenses" danger ok="Delete" onClose={() => setDlg(null)} onOk={() => removeExpenses(targets)} text={<>Delete {targets.length} selected expense{targets.length === 1 ? '' : 's'} ({$(targets.reduce((s, e) => s + e.amount, 0))})?</>} />}
      {dlg === 'combine-help' && (
        <Modal title="Combine Expenses" width={520} onClose={() => setDlg(null)} footer={<Btn primary onClick={() => setDlg(null)}>OK</Btn>}>
          <div className="p-6 text-[14px] flex gap-3"><Info className="w-5 h-5 text-[#0a6ed1] shrink-0" /> Select exactly two expenses to combine: one corporate card transaction and one manually entered expense for the same purchase.</div>
        </Modal>
      )}
      {dlg === 'header' && <EditHeader r={r} locked={locked} onClose={() => setDlg(null)} />}
      {dlg === 'totals' && (
        <Modal title="Report Totals" width={560} onClose={() => setDlg(null)} footer={<Btn primary onClick={() => setDlg(null)}>Close</Btn>}>
          <div className="p-6 text-[14px]">
            {[
              ['Report Total', r.total],
              ['Personal Expenses (do not reimburse)', 0],
              ['Total Amount Claimed', r.total],
              ['Amount Rejected', 0],
              ['Amount Approved', r.status === 'Approved' || r.status === 'Paid' ? r.total : 0],
              ['Amount Due Company Card', exps.filter((e) => e.transactionId).reduce((s, e) => s + e.amount, 0)],
              ['Amount Due Employee', exps.filter((e) => !e.transactionId).reduce((s, e) => s + e.amount, 0)],
            ].map(([k, v]: any) => <div key={k} className="flex justify-between py-2 border-b border-[#eeeeee]"><span>{k}</span><b>{$(v)}</b></div>)}
            <div className="mt-4 text-[13px] font-semibold text-[#6a6d70] uppercase">By expense type</div>
            {Object.entries(exps.reduce((m: Record<string, number>, e) => ({ ...m, [e.type]: (m[e.type] ?? 0) + e.amount }), {})).map(([k, v]) => (
              <div key={k} className="flex justify-between py-1.5 text-[13px]"><span>{k}</span><span>{$(v as number)}</span></div>
            ))}
          </div>
        </Modal>
      )}
      {dlg === 'timeline' && (
        <Modal title="Report Timeline" width={560} onClose={() => setDlg(null)} footer={<Btn primary onClick={() => setDlg(null)}>Close</Btn>}>
          <div className="p-6">
            {[
              { at: r.createdAt, by: r.createdBy === 'hworker' ? 'H-Worker (for Alex Morgan)' : ME.name, text: 'Report created' },
              ...(r.history ?? []),
              ...(r.approvalFlow ?? []).filter((s: any) => s.at).map((s: any) => ({ at: s.at, by: s.name, text: s.role === 'Submitted' ? 'Submitted' : `${s.role} — approved` })),
            ].filter((e) => e.at).sort((a, b) => +new Date(a.at) - +new Date(b.at)).map((e, i) => (
              <div key={i} className="flex gap-3 pb-4">
                <div className="w-2.5 h-2.5 mt-1.5 rounded-full bg-[#0a6ed1] shrink-0" />
                <div><div className="text-[14px] font-semibold">{e.text}</div><div className="text-[12px] text-[#6a6d70]">{e.by} · {new Date(e.at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</div></div>
              </div>
            ))}
          </div>
        </Modal>
      )}
      {dlg === 'print' && (
        <Modal title="Detailed Report" width={820} onClose={() => setDlg(null)} footer={<><Btn onClick={copyLink}>Copy Link</Btn><Btn primary onClick={() => setDlg(null)}>Close</Btn></>}>
          <div className="p-8 text-[13px] text-[#32363a]" data-agent="concur-detailed-report">
            <div className="flex justify-between mb-4">
              <div><div className="text-[18px] font-semibold">{r.name}</div><div className="text-[#6a6d70]">{ME.name} · Employee ID {ME.employeeId} · Northwind Global</div></div>
              <div className="text-right"><div>Report Number {r.number}</div><div>Report Date {d(r.reportDate)}</div><div>{r.status}</div></div>
            </div>
            <div className="mb-3"><b>Business Purpose:</b> {r.purpose} · <b>Policy:</b> {r.policy}</div>
            <table className="w-full border-collapse">
              <thead><tr className="border-b-2 border-[#32363a] text-left"><th className="py-1">Date</th><th>Expense Type</th><th>Vendor</th><th>City</th><th>Payment Type</th><th className="text-right">Amount</th></tr></thead>
              <tbody>
                {exps.map((e) => <tr key={e.id} className="border-b border-[#e5e5e5]"><td className="py-1">{d(e.date)}</td><td>{e.type}</td><td>{e.vendor}</td><td>{e.city}</td><td>{e.paymentType}</td><td className="text-right">{$(e.amount)}</td></tr>)}
                <tr className="font-semibold"><td className="py-2" colSpan={5}>Report Total</td><td className="text-right">{$(r.total)}</td></tr>
              </tbody>
            </table>
          </div>
        </Modal>
      )}
      {dlg === 'receipts' && (
        <Modal title="Receipts" width={760} onClose={() => setDlg(null)} footer={<Btn primary onClick={() => setDlg(null)}>Close</Btn>}>
          <div className="p-6 grid grid-cols-3 gap-4">
            {exps.filter((e) => e.receipt).length === 0 && !r.receipts?.length && <div className="col-span-3 text-center text-[14px] text-[#6a6d70] py-8">No receipts attached to this report.</div>}
            {exps.filter((e) => e.receipt).map((e) => (
              <button key={e.id} onClick={() => { setDlg(null); setOpen(e.id) }} className="rounded border border-[#d9d9d9] p-3 text-left hover:shadow-md">
                <div className="h-28 rounded bg-[#f7f7f7] flex flex-col items-center justify-center text-[#6a6d70] text-[12px] gap-1"><Receipt className="w-8 h-8" />{e.receiptName ?? 'e-Receipt'}</div>
                <div className="text-[13px] font-semibold mt-2 truncate">{e.vendor}</div>
                <div className="text-[12px] text-[#6a6d70]">{e.type} · {$(e.amount)}</div>
              </button>
            ))}
            {(r.receipts ?? []).map((n: string) => (
              <div key={n} className="rounded border border-[#d9d9d9] p-3">
                <div className="h-28 rounded bg-[#f7f7f7] flex flex-col items-center justify-center text-[#6a6d70] text-[12px] gap-1"><Paperclip className="w-8 h-8" />{n}</div>
                <div className="text-[13px] font-semibold mt-2">Report-level receipt</div>
              </div>
            ))}
          </div>
        </Modal>
      )}
      {dlg === 'attach-report' && <AttachReceipt onClose={() => setDlg(null)} onPick={(name) => { db.update('concur.reports', id, (x) => ({ receipts: [...(x.receipts ?? []), name] })); setDlg(null); setNote({ type: 'success', text: `${name} attached to the report.` }) }} />}
      {dlg === 'allocate' && <AllocateDialog exps={targets} onClose={() => setDlg(null)} onDone={(n) => { setNote({ type: 'success', text: `Allocation saved on ${n} expense${n === 1 ? '' : 's'}.` }); setSel(new Set()) }} />}
    </div>
  )
}

function AllocateDialog({ exps, onClose, onDone }: { exps: any[]; onClose: () => void; onDone: (n: number) => void }) {
  const [f, setF] = useState<any>({ amount: exps.reduce((s, e) => s + e.amount, 0), allocations: exps[0]?.allocations })
  const set = (k: string, v: any) => setF((x: any) => ({ ...x, [k]: v }))
  const al = f.allocations?.length ? f.allocations : [{ id: 'default', costCenter: COST_CENTERS[0], percent: 100 }]
  const ok = Math.abs(al.reduce((s: number, a: any) => s + (Number(a.percent) || 0), 0) - 100) < 0.01
  const save = () => {
    exps.forEach((e) => db.update('concur.expenses', e.id, { allocations: al.map((a: any) => ({ ...a, percent: Number(a.percent) })) }))
    onDone(exps.length)
    onClose()
  }
  return (
    <Modal title={`Allocate ${exps.length} Expense${exps.length === 1 ? '' : 's'}`} width={700} onClose={onClose} agent="concur-allocate-modal" footer={<><Btn onClick={onClose}>Cancel</Btn><Btn primary data-agent="concur-allocate-save" disabled={!ok} onClick={save}>Save</Btn></>}>
      <Allocations f={f} set={set} locked={false} />
    </Modal>
  )
}

/* ─────────────────────── Transactions ─────────────────────── */

function Transactions() {
  const tx = useCollection<any>('concur.transactions')
  const reports = useCollection<any>('concur.reports')
  const [filter, setFilter] = useState<'all' | 'available' | 'assigned'>('all')
  const [q, setQ] = useState('')
  const rows = tx.filter((t) => (filter === 'all' || t.status === filter) && (!q || `${t.merchant} ${t.vendor} ${t.city} ${t.amount}`.toLowerCase().includes(q.toLowerCase())))
  return (
    <div className="flex-1 overflow-auto px-10 py-6">
      <div className="text-[26px] font-light text-[#32363a] mb-5">View Transactions</div>
      <div className="flex items-center gap-3 mb-3">
        <select data-agent="concur-tx-filter" aria-label="Show" className={`${inputCls} w-[220px]`} value={filter} onChange={(e) => setFilter(e.target.value as any)}>
          <option value="all">All Transactions</option>
          <option value="available">Available (not on a report)</option>
          <option value="assigned">Assigned to a report</option>
        </select>
        <div className="relative w-[300px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#6a6d70]" />
          <input data-agent="concur-tx-search" aria-label="Search transactions" className={`${inputCls} pl-9`} placeholder="Search merchant, city or amount" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="flex-1" />
        <div className="text-[13px] text-[#6a6d70]">American Express Corporate ••••1007 · {rows.length} transaction{rows.length === 1 ? '' : 's'} · {$(rows.reduce((s, t) => s + t.amount, 0))}</div>
      </div>
      <div className="bg-white rounded-lg border border-[#d9d9d9]">
        <table className="w-full text-[14px] text-[#32363a]">
          <thead><tr className="h-10 text-left text-[13px] text-[#6a6d70] border-b border-[#e5e5e5]"><th className="pl-5 font-semibold">Date</th><th className="px-2 font-semibold">Merchant</th><th className="px-2 font-semibold">MCC</th><th className="px-2 font-semibold">Card</th><th className="px-2 font-semibold">Status</th><th className="px-2 pr-5 font-semibold text-right">Amount</th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={6} className="h-20 text-center text-[#6a6d70]">No transactions match.</td></tr>}
            {rows.map((t) => (
              <tr key={t.id} className="h-12 border-b border-[#eeeeee]">
                <td className="pl-5">{d(t.date)}</td><td className="px-2 font-semibold">{t.merchant}<div className="text-[12px] font-normal text-[#6a6d70]">{t.city}</div></td><td className="px-2 text-[13px]">{t.mcc}</td><td className="px-2 text-[13px]">{t.card}</td>
                <td className="px-2 text-[13px]">{t.status === 'available' ? 'Available' : `Assigned to “${reports.find((r) => r.id === t.reportId)?.name ?? ''}”`}</td>
                <td className="px-2 pr-5 text-right font-semibold">{$(t.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ─────────────────────── Shell ─────────────────────── */

type View = 'home' | 'report' | 'tx' | 'library' | 'delegates' | 'requests' | 'request' | 'travel' | 'approvals' | 'apps' | 'profile'
const SECTION: Record<View, string> = { home: 'Expense', report: 'Expense', tx: 'Expense', library: 'Expense', delegates: 'Expense', profile: 'Expense', requests: 'Requests', request: 'Requests', travel: 'Travel', approvals: 'Approvals', apps: 'App Center' }
const URLS: Partial<Record<View, [string, string]>> = {
  library: ['/nui/expense/reportlibrary', 'Reports Library'],
  delegates: ['/profile/delegates', 'Expense Delegates'],
  requests: ['/nui/request', 'Manage Requests'],
  travel: ['/travel', 'Travel'],
  approvals: ['/approvalsportal', 'Approvals'],
  apps: ['/appcenter', 'App Center'],
  profile: ['/profile/settings', 'Profile Settings'],
}

export default function Concur({ win, params }: AppProps) {
  const { setUrl, setTitle } = useWin()
  const [view, setView] = useState<View>('home')
  const [reportId, setReportId] = useState<string | null>(null)
  const [requestId, setRequestId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [help, setHelp] = useState<null | 'help' | 'policy'>(null)
  const [travelPrefill, setTravelPrefill] = useState<any>(null)
  const report = useRecord<any>('concur.reports', reportId)
  const pendingApprovals = useCollection<any>('concur.teamReports').filter((r) => r.status === 'Submitted & Pending Approval').length + useCollection<any>('concur.requests').filter((r) => r.approver === ME.name && r.status === 'Submitted & Pending Approval').length

  useEffect(() => {
    if (params?.reportId) {
      setReportId(params.reportId)
      setView('report')
    } else if (params?.requestId) {
      setRequestId(params.requestId)
      setView('request')
    } else if (params?.view) setView(params.view)
  }, [win.nonce])
  useEffect(() => {
    const base = 'https://us2.concursolutions.com'
    if (view === 'report' && reportId) {
      setUrl(`${base}/nui/expense/report/${reportId.toUpperCase().replace(/[^A-Z0-9]/g, '')}`)
      setTitle(`${report?.name ?? 'Report'} | SAP Concur`)
    } else if (view === 'request' && requestId) {
      setUrl(`${base}/nui/request/${requestId.toUpperCase().replace(/[^A-Z0-9]/g, '')}`)
      setTitle('Request | SAP Concur')
    } else if (view === 'tx') {
      setUrl(`${base}/nui/expense/transactions`)
      setTitle('View Transactions | SAP Concur')
    } else if (URLS[view]) {
      setUrl(base + URLS[view]![0])
      setTitle(`${URLS[view]![1]} | SAP Concur`)
    } else {
      setUrl(`${base}/nui/expense`)
      setTitle('Manage Expenses | SAP Concur')
    }
  }, [view, reportId, requestId, report?.name])

  const openReport = (id: string) => {
    setReportId(id)
    setView('report')
  }
  const openRequest = (id: string) => {
    setRequestId(id)
    setView('request')
  }
  const section = SECTION[view]
  const navTo = (n: string) => {
    if (n === 'Expense') setView('home')
    else if (n === 'Requests') setView('requests')
    else if (n === 'Travel') { setTravelPrefill(null); setView('travel') }
    else if (n === 'Approvals') setView('approvals')
    else if (n === 'App Center') setView('apps')
  }
  const subActive = (k: string) => (k === 'home' ? view === 'home' || view === 'report' || view === 'profile' : k === 'tx' ? view === 'tx' : k === 'x' ? view === 'library' : view === 'delegates')

  return (
    <div className="flex-1 min-h-0 flex flex-col relative bg-[#f7f7f7]" style={{ fontFamily: 'var(--font-sap)', color: '#32363a' }}>
      <div className="h-[60px] shrink-0 bg-white border-b border-[#d9d9d9] flex items-center px-6 gap-6">
        <div className="flex items-center gap-2">
          <img src={logoUrl('sap')} className="h-[22px]" alt="SAP" />
          <span className="text-[21px] font-semibold tracking-tight text-[#1c2b39]">Concur</span>
          <span className="text-[10px] align-top text-[#6a6d70]">®</span>
        </div>
        <div className="h-8 w-px bg-[#d9d9d9]" />
        <div className="flex items-center gap-1.5">
          <svg width="26" height="26" viewBox="0 0 26 26"><circle cx="13" cy="13" r="12" fill="#0b3a5d" /><path d="M13 4l2.6 8.4L13 22l-2.6-9.6z" fill="#f2c14e" /><path d="M4 13l8.4-2.6L22 13l-9.6 2.6z" fill="#fff" opacity=".85" /></svg>
          <span className="text-[15px] font-bold text-[#0b3a5d] tracking-wide">NORTHWIND</span>
        </div>
        <nav className="flex items-center h-full ml-4">
          {['Requests', 'Travel', 'Expense', 'Approvals', 'App Center'].map((n) => (
            <button key={n} data-agent={`concur-nav-${slug(n)}`} onClick={() => navTo(n)} className={`relative h-full px-4 text-[15px] ${section === n ? 'font-semibold text-[#32363a]' : 'text-[#32363a] hover:text-[#0a6ed1]'}`}>
              {n}
              {n === 'Approvals' && pendingApprovals > 0 && <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[#bb0000] text-white text-[11px] font-semibold align-middle">{pendingApprovals}</span>}
              {section === n && <span className="absolute left-3 right-3 bottom-0 h-[4px] rounded-t" style={{ background: BLUE }} />}
            </button>
          ))}
        </nav>
        <div className="flex-1" />
        <Menu
          agent="concur-help"
          align="right"
          className="flex items-center gap-1 text-[14px] text-[#32363a]"
          trigger={<><HelpCircle className="w-5 h-5" /> Help <ChevronDown className="w-4 h-4" /></>}
          items={[
            { label: 'Help', onClick: () => setHelp('help'), agent: 'concur-help-topics' },
            { label: 'Travel & Expense Policy', onClick: () => setHelp('policy'), agent: 'concur-help-policy' },
          ]}
        />
        <Menu
          agent="concur-profile"
          align="right"
          className="flex items-center gap-2 text-[14px]"
          trigger={
            <>
              <span className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[13px] font-semibold" style={{ background: '#354a5f' }}>AM</span>
              <span className="text-left leading-tight"><span className="block text-[12px] text-[#6a6d70]">Profile</span><span className="block font-semibold">Alex Morgan</span></span>
              <ChevronDown className="w-4 h-4" />
            </>
          }
          items={[
            { label: 'Profile Settings', onClick: () => setView('profile'), agent: 'concur-profile-settings' },
            { label: 'Expense Delegates', onClick: () => setView('delegates'), agent: 'concur-profile-delegates' },
            { label: 'View Transactions', onClick: () => setView('tx'), agent: 'concur-profile-tx' },
          ]}
        />
      </div>
      <div className="h-11 shrink-0 bg-white border-b border-[#d9d9d9] flex items-center px-6 gap-6 text-[14px]">
        {section === 'Expense' &&
          [['home', 'Manage Expenses'], ['tx', 'View Transactions'], ['x', 'Process Reports'], ['y', 'Expense Delegates']].map(([k, l]) => (
            <button key={k} data-agent={`concur-sub-${k}`} onClick={() => setView(k === 'x' ? 'library' : k === 'y' ? 'delegates' : (k as View))} className={`relative h-full ${subActive(k) ? 'font-semibold text-[#0a6ed1]' : 'text-[#32363a]'}`}>
              {l}
              {subActive(k) && <span className="absolute left-0 right-0 bottom-0 h-[3px]" style={{ background: BLUE }} />}
            </button>
          ))}
        {section !== 'Expense' && (
          <span className="relative h-full flex items-center font-semibold text-[#0a6ed1]">
            {section === 'Requests' ? 'Manage Requests' : section === 'Travel' ? 'Trip Search' : section === 'Approvals' ? 'Approvals Home' : 'Apps & Connections'}
            <span className="absolute left-0 right-0 bottom-0 h-[3px]" style={{ background: BLUE }} />
          </span>
        )}
        {section === 'Requests' && view === 'request' && <button onClick={() => setView('requests')} className="text-[#0a6ed1] hover:underline flex items-center gap-1"><RotateCcw className="w-3.5 h-3.5" /> Back to list</button>}
      </div>
      {view === 'home' && <Home openReport={openReport} onCreate={() => setCreating(true)} onLibrary={() => setView('library')} />}
      {view === 'tx' && <Transactions />}
      {view === 'report' && reportId && <ReportPage key={reportId} id={reportId} back={() => setView('home')} onCopied={openReport} />}
      {view === 'library' && <ReportsLibrary openReport={openReport} />}
      {view === 'delegates' && <Delegates />}
      {view === 'profile' && <ProfileSettings />}
      {view === 'apps' && <AppCenter />}
      {view === 'approvals' && <ApprovalsView />}
      {view === 'travel' && <TravelView prefill={travelPrefill} />}
      {view === 'requests' && <RequestsView openRequest={openRequest} />}
      {view === 'request' && requestId && <RequestPage id={requestId} back={() => setView('requests')} openReport={openReport} bookTravel={(p) => { setTravelPrefill(p); setView('travel') }} />}
      {creating && <CreateReport onClose={() => setCreating(false)} onCreated={(id) => { setCreating(false); openReport(id) }} />}
      {help === 'help' && <HelpDialog onClose={() => setHelp(null)} />}
      {help === 'policy' && <PolicyDialog onClose={() => setHelp(null)} />}
    </div>
  )
}
