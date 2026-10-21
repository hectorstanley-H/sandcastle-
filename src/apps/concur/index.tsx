import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  ChevronDown, Plus, Receipt, CreditCard, AlertTriangle, X, Search, CheckCircle2, Clock, Circle, HelpCircle, Users, Trash2, Copy, Split, Combine,
  FileText, Printer, Paperclip, Plane, Hotel, Car, Utensils, ArrowLeft, Info,
} from 'lucide-react'
import type { AppProps } from '@/os/registry'
import { logoUrl } from '@/os/registry'
import { useDesk, useWin } from '@/os/context'
import { db, uid, useCollection, useRecord } from '@/db/db'
import { ME, PEOPLE } from '@/data/people'
import { isoDate } from '@/data/time'

const BLUE = '#0a6ed1'
const $ = (n: number) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const d = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : '')
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, '')

export const EXPENSE_TYPES: [string, string[]][] = [
  ['Travel', ['Airfare', 'Hotel', 'Car Rental', 'Taxi/Rideshare', 'Parking', 'Train', 'Fuel', 'Personal Car Mileage', 'Tolls']],
  ['Meals & Entertainment', ['Business Meals', 'Individual Meals', 'Entertainment', 'Tips/Gratuities']],
  ['Office & Other', ['Conference/Seminar Fees', 'Office Supplies', 'Meeting Room Rental', 'Mobile/Cellular Phone', 'Internet/Online Fees', 'Training', 'Miscellaneous']],
]

const typeIcon = (t: string) => (t === 'Airfare' ? Plane : t === 'Hotel' ? Hotel : t.includes('Taxi') || t.includes('Car') || t === 'Parking' ? Car : t.includes('Meal') ? Utensils : Receipt)

export function expenseAlerts(e: any): string[] {
  const a: string[] = []
  if (!e.type || e.type === 'Undefined') a.push('Expense Type is required.')
  if (e.type === 'Business Meals' && (e.attendees?.length ?? 0) < 2) a.push('Business Meals require at least one attendee in addition to the employee.')
  if (e.type === 'Hotel' && (!e.checkIn || !e.checkOut)) a.push('Hotel expenses must be itemized: enter the check-in and check-out dates.')
  if (e.type === 'Individual Meals' && e.amount > 75) a.push(`Individual Meals exceed the $75.00 daily limit (${$(e.amount)}). If this was a business meal, change the expense type.`)
  return a
}

function Btn({ primary, children, className = '', ...rest }: any) {
  return (
    <button
      className={`inline-flex items-center gap-1.5 h-8 px-3 rounded text-[14px] font-semibold border disabled:opacity-40 ${primary ? 'text-white border-transparent hover:brightness-95' : 'bg-white border-[#89919a] text-[#0a6ed1] hover:bg-[#ebf5fe]'} ${className}`}
      style={primary ? { background: BLUE } : undefined}
      {...rest}
    >
      {children}
    </button>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[13px] text-[#32363a] mb-1">
        {label}
        {required && <span className="text-[#bb0000]"> *</span>}
      </span>
      {children}
    </label>
  )
}
const inputCls = 'w-full h-9 rounded border border-[#89919a] bg-white px-2.5 text-[14px] text-[#32363a] outline-none focus:border-[#0a6ed1] focus:shadow-[0_0_0_1px_#0a6ed1] read-only:bg-[#f2f2f2] read-only:border-[#d9d9d9]'

function Status({ s }: { s: string }) {
  const m: Record<string, [string, string]> = {
    'Not Submitted': ['#f2f2f2', '#32363a'],
    'Submitted & Pending Approval': ['#fef7f1', '#b44f00'],
    Approved: ['#f1fdf6', '#107e3e'],
    Paid: ['#f1fdf6', '#107e3e'],
    'Sent Back': ['#ffebeb', '#bb0000'],
  }
  const [bg, fg] = m[s] ?? m['Not Submitted']
  return <span className="inline-flex items-center h-6 px-2 rounded text-[12px] font-semibold border" style={{ background: bg, color: fg, borderColor: fg + '40' }}>{s}</span>
}

function HW() {
  return (
    <span className="inline-flex items-center gap-1 h-5 pl-0.5 pr-2 rounded-full text-[11px] font-semibold text-white" style={{ background: '#430693', fontFamily: 'var(--font-brand)' }}>
      <img src={logoUrl('hworker')} className="w-4 h-4 rounded-full" alt="" /> H-Worker
    </span>
  )
}

function Modal({ title, children, footer, width = 640, onClose, agent }: { title: string; children: ReactNode; footer: ReactNode; width?: number; onClose?: () => void; agent?: string }) {
  return (
    <div className="absolute inset-0 z-50 bg-black/40 flex items-center justify-center" data-agent={agent}>
      <div className="bg-white rounded-lg shadow-2xl flex flex-col max-h-[88%]" style={{ width }}>
        <div className="h-14 shrink-0 px-6 flex items-center border-b border-[#e5e5e5]">
          <div className="text-[20px] font-semibold text-[#32363a] flex-1">{title}</div>
          {onClose && <button onClick={onClose} className="w-8 h-8 rounded hover:bg-[#f2f2f2] flex items-center justify-center"><X className="w-5 h-5" /></button>}
        </div>
        <div className="flex-1 overflow-auto">{children}</div>
        <div className="h-16 shrink-0 px-6 flex items-center justify-end gap-2 border-t border-[#e5e5e5]">{footer}</div>
      </div>
    </div>
  )
}

/* ─────────────────────── Home (Manage Expenses) ─────────────────────── */

function Home({ openReport, onCreate }: { openReport: (id: string) => void; onCreate: () => void }) {
  const reports = useCollection<any>('concur.reports')
  const tx = useCollection<any>('concur.transactions')
  const avail = tx.filter((t) => t.status === 'available')
  const active = [...reports].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
  return (
    <div className="flex-1 overflow-auto px-10 py-6">
      <div className="text-[26px] font-light text-[#32363a] mb-5">Manage Expenses</div>
      <div className="flex items-center mb-3">
        <div className="text-[18px] font-semibold text-[#32363a]">Active Reports</div>
        <button className="ml-4 text-[14px] text-[#0a6ed1] hover:underline">View Reports Library</button>
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
          <span className="text-[13px] text-[#6a6d70]">({avail.length})</span>
          <div className="flex-1" />
          <Btn disabled>Move to <ChevronDown className="w-4 h-4" /></Btn>
          <Btn disabled><Trash2 className="w-4 h-4" /> Delete</Btn>
          <Btn primary onClick={onCreate}><Plus className="w-4 h-4" /> Add Expense</Btn>
        </div>
        <TxTable rows={avail} empty="You have no available expenses. Card transactions and e-receipts will appear here." />
      </div>
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
            <td className="px-2"><span className="inline-flex items-center gap-1 text-[12px] text-[#107e3e]"><Receipt className="w-4 h-4" /> e-Receipt</span></td>
            <td className="px-2"><span className="inline-flex items-center gap-1.5"><CreditCard className="w-4 h-4 text-[#0a6ed1]" /> Amex Corporate</span></td>
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

function recalc(reportId: string) {
  const total = db.get<any>('concur.expenses').filter((e) => e.reportId === reportId).reduce((s, e) => s + e.amount, 0)
  db.update('concur.reports', reportId, { total: Math.round(total * 100) / 100 })
}

/* ─────────────────────── Expense form ─────────────────────── */

function ExpenseForm({ exp, onClose, locked }: { exp: any; onClose: () => void; locked: boolean }) {
  const [f, setF] = useState<any>(exp)
  const [typeOpen, setTypeOpen] = useState(false)
  const [att, setAtt] = useState('')
  const [showReceipt, setShowReceipt] = useState(false)
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
        <span className="relative h-10 flex items-center text-[#0a6ed1]">Details<span className="absolute left-0 right-0 bottom-0 h-[3px] bg-[#0a6ed1]" /></span>
        <span className="h-10 flex items-center text-[#32363a]">Itemizations</span>
        <span className="h-10 flex items-center text-[#32363a]">Allocations</span>
      </div>
      <div className="flex-1 overflow-auto p-5 space-y-4">
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
          <Field label="Transaction Date" required><input type="date" className={inputCls} readOnly={card || locked} value={isoDate(f.date)} onChange={(e) => set('date', new Date(e.target.value + 'T12:00:00').toISOString())} aria-label="Transaction Date" /></Field>
          <div className="col-span-2"><Field label="Business Purpose"><input data-agent="concur-exp-purpose" aria-label="Business Purpose" readOnly={locked} className={inputCls} value={f.purpose ?? ''} onChange={(e) => set('purpose', e.target.value)} /></Field></div>
          <Field label="Vendor"><input data-agent="concur-exp-vendor" aria-label="Vendor" readOnly={locked} className={inputCls} value={f.vendor ?? ''} onChange={(e) => set('vendor', e.target.value)} /></Field>
          <Field label="City of Purchase" required><input data-agent="concur-exp-city" aria-label="City of Purchase" readOnly={locked} className={inputCls} value={f.city ?? ''} onChange={(e) => set('city', e.target.value)} /></Field>
          <Field label="Payment Type" required><input readOnly className={inputCls} value={f.paymentType} aria-label="Payment Type" /></Field>
          <Field label="Amount" required>
            <div className="flex gap-2"><input readOnly={card || locked} className={`${inputCls} text-right`} value={f.amount.toFixed(2)} onChange={(e) => set('amount', Number(e.target.value) || 0)} aria-label="Amount" /><input readOnly className={`${inputCls} w-20`} value="USD" /></div>
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
            {f.receipt ? <span className="text-[13px] text-[#107e3e] flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> e-Receipt attached</span> : <Btn>Attach Receipt</Btn>}
          </div>
          {f.receipt && email && (
            <>
              <button onClick={() => setShowReceipt((s) => !s)} className="text-[13px] text-[#0a6ed1] hover:underline mt-2">{showReceipt ? 'Hide receipt' : 'View receipt'}</button>
              {showReceipt && <pre className="mt-2 p-3 bg-[#f7f7f7] rounded text-[12px] whitespace-pre-wrap font-mono text-[#32363a] max-h-[220px] overflow-auto">{email.body}</pre>}
            </>
          )}
        </div>
      </div>
      {!locked && (
        <div className="h-16 shrink-0 px-5 flex items-center justify-end gap-2 border-t border-[#e5e5e5]">
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn primary data-agent="concur-exp-save" onClick={save}>Save Expense</Btn>
        </div>
      )}
    </div>
  )
}

/* ─────────────────────── Report page ─────────────────────── */

function ReportPage({ id, back }: { id: string; back: () => void }) {
  const r = useRecord<any>('concur.reports', id)
  const all = useCollection<any>('concur.expenses')
  const exps = useMemo(() => all.filter((e) => e.reportId === id).sort((a, b) => +new Date(a.date) - +new Date(b.date)), [all, id])
  const [open, setOpen] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [submitStep, setSubmitStep] = useState<0 | 1 | 2>(0)
  const [flowOpen, setFlowOpen] = useState(false)
  const [warn, setWarn] = useState(false)
  const { isAgent } = useDesk()
  if (!r) return <div className="p-10">Report not found.</div>
  const locked = r.status !== 'Not Submitted' && r.status !== 'Sent Back'
  const openExp = exps.find((e) => e.id === open)
  const alertCount = exps.reduce((n, e) => n + expenseAlerts(e).length, 0)

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
          {!locked && <Btn><Trash2 className="w-4 h-4" /> Delete Report</Btn>}
          {!locked && (
            <Btn primary data-agent="concur-submit" disabled={!exps.length} onClick={() => (alertCount ? setWarn(true) : setSubmitStep(1))}>Submit Report</Btn>
          )}
          {locked && <Btn>Recall</Btn>}
        </div>
        <div className="flex items-center gap-5 mt-3 text-[14px]">
          <button className="flex items-center gap-1 text-[#0a6ed1] font-semibold">Report Details <ChevronDown className="w-4 h-4" /></button>
          <button className="flex items-center gap-1 text-[#0a6ed1] font-semibold"><Printer className="w-4 h-4" /> Print/Share <ChevronDown className="w-4 h-4" /></button>
          <button className="flex items-center gap-1 text-[#0a6ed1] font-semibold"><Receipt className="w-4 h-4" /> Manage Receipts <ChevronDown className="w-4 h-4" /></button>
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
          <div className="bg-white rounded-lg border border-[#d9d9d9]">
            <div className="h-14 px-5 flex items-center gap-2 border-b border-[#e5e5e5]">
              <div className="text-[18px] font-semibold mr-3">Expenses</div>
              {!locked && <Btn primary data-agent="concur-add-expense" onClick={() => setAdding(true)}><Plus className="w-4 h-4" /> Add Expense</Btn>}
              <Btn disabled={!open || locked}>Edit</Btn>
              <Btn disabled={locked}><Trash2 className="w-4 h-4" /> Delete</Btn>
              <Btn disabled={locked}><Copy className="w-4 h-4" /> Copy</Btn>
              <Btn disabled={locked}><Split className="w-4 h-4" /> Allocate</Btn>
              <Btn disabled={locked}><Combine className="w-4 h-4" /> Combine Expenses</Btn>
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
                    <tr key={e.id} data-agent={`concur-exp-row-${e.transactionId ?? e.id}`} aria-label={`${e.vendor} ${$(e.amount)}`} onClick={() => setOpen(e.id)} className={`h-[52px] border-b border-[#eeeeee] ${open === e.id ? 'bg-[#ebf5fe]' : 'hover:bg-[#f7f7f7]'}`}>
                      <td className="pl-5"><input type="checkbox" readOnly checked={open === e.id} className="w-4 h-4 accent-[#0a6ed1]" /></td>
                      <td className="px-2">{al.length ? <AlertTriangle className="w-4 h-4 text-[#e9730c]" /> : <CheckCircle2 className="w-4 h-4 text-[#107e3e]" />}</td>
                      <td className="px-2">{e.receipt ? <Receipt className="w-4 h-4 text-[#107e3e]" /> : <span className="text-[#bfbfbf]">—</span>}</td>
                      <td className="px-2">{e.paymentType.replace('American Express Corporate', 'Amex Corporate')}</td>
                      <td className="px-2 font-semibold">{e.type}{e.type === 'Business Meals' && e.attendees?.length ? <span className="ml-1 text-[12px] font-normal text-[#6a6d70]">({e.attendees.length} attendees)</span> : null}</td>
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
        </div>
        {openExp && <ExpenseForm key={openExp.id} exp={openExp} locked={locked} onClose={() => setOpen(null)} />}
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
    </div>
  )
}

function Transactions() {
  const tx = useCollection<any>('concur.transactions')
  const reports = useCollection<any>('concur.reports')
  return (
    <div className="flex-1 overflow-auto px-10 py-6">
      <div className="text-[26px] font-light text-[#32363a] mb-5">View Transactions</div>
      <div className="bg-white rounded-lg border border-[#d9d9d9]">
        <table className="w-full text-[14px] text-[#32363a]">
          <thead><tr className="h-10 text-left text-[13px] text-[#6a6d70] border-b border-[#e5e5e5]"><th className="pl-5 font-semibold">Date</th><th className="px-2 font-semibold">Merchant</th><th className="px-2 font-semibold">MCC</th><th className="px-2 font-semibold">Card</th><th className="px-2 font-semibold">Status</th><th className="px-2 pr-5 font-semibold text-right">Amount</th></tr></thead>
          <tbody>
            {tx.map((t) => (
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

export default function Concur({ win, params }: AppProps) {
  const { setUrl, setTitle } = useWin()
  const [view, setView] = useState<'home' | 'report' | 'tx'>('home')
  const [reportId, setReportId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const report = useRecord<any>('concur.reports', reportId)

  useEffect(() => {
    if (params?.reportId) {
      setReportId(params.reportId)
      setView('report')
    } else if (params?.view) setView(params.view)
  }, [win.nonce])
  useEffect(() => {
    if (view === 'report' && reportId) {
      setUrl(`https://us2.concursolutions.com/nui/expense/report/${reportId.toUpperCase().replace(/[^A-Z0-9]/g, '')}`)
      setTitle(`${report?.name ?? 'Report'} | SAP Concur`)
    } else if (view === 'tx') {
      setUrl('https://us2.concursolutions.com/nui/expense/transactions')
      setTitle('View Transactions | SAP Concur')
    } else {
      setUrl('https://us2.concursolutions.com/nui/expense')
      setTitle('Manage Expenses | SAP Concur')
    }
  }, [view, reportId, report?.name])

  const openReport = (id: string) => {
    setReportId(id)
    setView('report')
  }

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
            <button key={n} data-agent={`concur-nav-${slug(n)}`} onClick={() => n === 'Expense' && setView('home')} className={`relative h-full px-4 text-[15px] ${n === 'Expense' ? 'font-semibold text-[#32363a]' : 'text-[#32363a] hover:text-[#0a6ed1]'}`}>
              {n}
              {n === 'Expense' && <span className="absolute left-3 right-3 bottom-0 h-[4px] rounded-t" style={{ background: BLUE }} />}
            </button>
          ))}
        </nav>
        <div className="flex-1" />
        <button className="flex items-center gap-1 text-[14px] text-[#32363a]"><HelpCircle className="w-5 h-5" /> Help <ChevronDown className="w-4 h-4" /></button>
        <button className="flex items-center gap-2 text-[14px]">
          <span className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[13px] font-semibold" style={{ background: '#354a5f' }}>AM</span>
          <span className="text-left leading-tight"><span className="block text-[12px] text-[#6a6d70]">Profile</span><span className="block font-semibold">Alex Morgan</span></span>
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>
      <div className="h-11 shrink-0 bg-white border-b border-[#d9d9d9] flex items-center px-6 gap-6 text-[14px]">
        {[['home', 'Manage Expenses'], ['tx', 'View Transactions'], ['x', 'Process Reports'], ['y', 'Expense Delegates']].map(([k, l]) => (
          <button key={k} data-agent={`concur-sub-${k}`} onClick={() => (k === 'home' || k === 'tx') && setView(k as any)} className={`relative h-full ${(view === k || (view === 'report' && k === 'home')) ? 'font-semibold text-[#0a6ed1]' : 'text-[#32363a]'}`}>
            {l}
            {(view === k || (view === 'report' && k === 'home')) && <span className="absolute left-0 right-0 bottom-0 h-[3px]" style={{ background: BLUE }} />}
          </button>
        ))}
      </div>
      {view === 'home' && <Home openReport={openReport} onCreate={() => setCreating(true)} />}
      {view === 'tx' && <Transactions />}
      {view === 'report' && reportId && <ReportPage id={reportId} back={() => setView('home')} />}
      {creating && <CreateReport onClose={() => setCreating(false)} onCreated={(id) => { setCreating(false); openReport(id) }} />}
    </div>
  )
}
