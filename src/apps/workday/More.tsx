/**
 * Extra Workday worklets: Expenses, Learning, Career, Goals, Feedback, Directory, Help,
 * plus the manager action dialogs used from My Team and Worker Profile.
 */
import { useMemo, useState, type ReactNode } from 'react'
import {
  Receipt,
  GraduationCap,
  Briefcase,
  Target,
  MessageSquareHeart,
  BookUser,
  LifeBuoy,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  PlayCircle,
  Search,
  Award,
  ChevronLeft,
} from 'lucide-react'
import { db, uid, useCollection } from '@/db/db'
import { useDesk } from '@/os/context'
import { ME, person } from '@/data/people'
import { isoDate, money } from '@/data/time'
import { Avatar } from '@/components/Avatar'
import { AppIcon, Btn, Card, Modal, Pill, Success, inputCls, textareaCls } from './ui'
import type { Nav } from './index'
import { fmtLong, fmtMDY } from './util'

function Head({ icon, color, title, sub, right }: { icon: ReactNode; color: string; title: string; sub: string; right?: ReactNode }) {
  return (
    <div className="flex items-center gap-4 mb-7">
      <AppIcon icon={icon} color={color} size={48} />
      <div className="flex-1">
        <h1 className="text-[28px] font-bold leading-tight">{title}</h1>
        <div className="text-[14px] text-[#5E6A75]">{sub}</div>
      </div>
      {right}
    </div>
  )
}

function Label({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <div className="text-[14px] font-medium mb-1.5">
      {children}
      {required && <span className="text-[#DE2E21]">*</span>}
    </div>
  )
}

const ErrBox = ({ text }: { text: string }) => (text ? <div className="rounded-lg border border-[#DE2E21] bg-[#FDE2E0] px-4 py-2.5 text-[13.5px] text-[#A31B12] font-medium mb-3">{text}</div> : null)

const nowIso = () => new Date().toISOString()
const mgrOf = () => ME.managerId ?? 'priya'

/* ═════════════════════════════ Expenses ═════════════════════════════ */

const EXP_CATS = ['Meals', 'Airfare', 'Hotel', 'Ground Transportation', 'Mileage', 'Office Supplies', 'Client Entertainment', 'Other']

export function ExpensesPage({ nav }: { nav: Nav }) {
  const all = useCollection<any>('workday.expenses')
  const mine = all.filter((e) => e.workerId === 'wd-alex').sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
  const [creating, setCreating] = useState(false)
  const [open, setOpen] = useState<string | null>(null)
  const [msg, setMsg] = useState('')
  const cur = mine.find((e) => e.id === open)
  const pending = mine.filter((e) => e.status === 'Submitted').reduce((n, e) => n + e.total, 0)
  const paid = mine.filter((e) => e.status === 'Paid' || e.status === 'Approved').reduce((n, e) => n + e.total, 0)
  return (
    <div className="max-w-[1180px] mx-auto px-10 py-8">
      <Head
        icon={<Receipt size={22} />}
        color="#00A3A3"
        title="Expenses"
        sub={`${ME.name} · Cost Center CC-4100 Operations`}
        right={
          <Btn variant="primary" agent="workday-expense-create" onClick={() => setCreating(true)} icon={<Plus size={16} />}>
            Create Expense Report
          </Btn>
        }
      />
      {msg && (
        <div className="mb-5">
          <Success onClose={() => setMsg('')}>{msg}</Success>
        </div>
      )}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          ['Awaiting Approval', money(pending)],
          ['Approved / Paid (YTD)', money(paid)],
          ['Reports', String(mine.length)],
        ].map(([k, v]) => (
          <div key={k} className="bg-white rounded-2xl border border-[#E8EBED] p-5">
            <div className="text-[13px] text-[#5E6A75]">{k}</div>
            <div className="text-[24px] font-bold mt-1">{v}</div>
          </div>
        ))}
      </div>
      <Card title="My Expense Reports">
        <table className="w-full text-[14px]">
          <thead>
            <tr className="text-left text-[12.5px] text-[#5E6A75] bg-[#F6F7F8] border-y border-[#E8EBED]">
              <th className="px-6 h-10 font-bold">Report</th>
              <th className="font-bold">Memo</th>
              <th className="font-bold">Date</th>
              <th className="font-bold text-right">Total</th>
              <th className="font-bold pl-6">Status</th>
            </tr>
          </thead>
          <tbody>
            {mine.map((e) => (
              <tr key={e.id} data-agent={`workday-expense-row-${e.id}`} onClick={() => setOpen(e.id)} className="border-b border-[#F0F1F2] hover:bg-[#F6F7F8] cursor-pointer">
                <td className="px-6 h-12 text-[#0875E1] font-bold">{e.number}</td>
                <td className="truncate max-w-[280px]">{e.memo}</td>
                <td>{fmtMDY(e.createdAt)}</td>
                <td className="text-right font-bold">{money(e.total)}</td>
                <td className="pl-6">
                  <Pill tone={e.status === 'Draft' ? 'gray' : e.status === 'Submitted' ? 'orange' : e.status === 'Sent Back' || e.status === 'Denied' ? 'red' : 'green'}>{e.status}</Pill>
                </td>
              </tr>
            ))}
            {!mine.length && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-[#5E6A75]">
                  No expense reports yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
      <div className="mt-6">
        <button onClick={() => nav({ page: 'inbox' })} className="text-[14px] font-bold text-[#0875E1] hover:underline">
          Review expense reports from your team in My Tasks
        </button>
      </div>
      {creating && (
        <ExpenseModal
          onClose={() => setCreating(false)}
          onDone={(num, submitted) => {
            setCreating(false)
            setMsg(submitted ? `Expense Report ${num} submitted. Up next: Approval by ${person(mgrOf()).name}.` : `Expense Report ${num} saved as draft.`)
          }}
        />
      )}
      {cur && <ExpenseDetail e={cur} onClose={() => setOpen(null)} onMsg={setMsg} />}
    </div>
  )
}

function submitExpense(id: string, number: string, total: number, isAgent: boolean) {
  db.update('workday.expenses', id, { status: 'Submitted', submittedAt: nowIso() })
  db.insert(
    'workday.tasks',
    {
      id: uid('wt'),
      assignee: mgrOf(),
      title: `Expense Report: ${number} — ${ME.name} (${money(total)})`,
      process: 'Expense Report',
      step: 'Approval by Manager',
      fromId: ME.id,
      receivedAt: nowIso(),
      due: new Date(Date.now() + 3 * 864e5).toISOString(),
      status: 'open',
      link: { page: 'expenses', expenseId: id },
      createdBy: isAgent ? 'hworker' : undefined,
    },
    { prepend: true },
  )
}

function ExpenseModal({ onClose, onDone }: { onClose: () => void; onDone: (num: string, submitted: boolean) => void }) {
  const { isAgent } = useDesk()
  const count = useCollection<any>('workday.expenses').length
  const [memo, setMemo] = useState('')
  const [lines, setLines] = useState([{ k: uid('l'), date: isoDate(new Date()), category: 'Meals', merchant: '', amount: '', memo: '' }])
  const [err, setErr] = useState('')
  const total = lines.reduce((n, l) => n + (Number(l.amount) || 0), 0)
  const upd = (k: string, patch: any) => setLines((ls) => ls.map((l) => (l.k === k ? { ...l, ...patch } : l)))
  const save = (submit: boolean) => {
    if (!memo.trim()) return setErr('Memo is required.')
    if (lines.some((l) => !l.merchant.trim() || !(Number(l.amount) > 0))) return setErr('Every expense line needs a merchant and an amount.')
    const id = uid('wexp')
    const number = `EXP-000${4900 + count + 1}`
    db.insert('workday.expenses', {
      id,
      number,
      workerId: 'wd-alex',
      memo: memo.trim(),
      lines: lines.map(({ k: _k, ...l }) => ({ ...l, amount: Number(l.amount) })),
      total: Math.round(total * 100) / 100,
      status: 'Draft',
      createdAt: nowIso(),
      createdBy: isAgent ? 'hworker' : undefined,
    })
    if (submit) submitExpense(id, number, total, isAgent)
    onDone(number, submit)
  }
  return (
    <Modal
      title="Create Expense Report"
      onClose={onClose}
      width={820}
      agent="workday-expense-modal"
      footer={
        <>
          <Btn variant="primary" agent="workday-expense-submit" onClick={() => save(true)}>
            Submit
          </Btn>
          <Btn onClick={() => save(false)}>Save for Later</Btn>
          <Btn variant="tertiary" onClick={onClose}>
            Cancel
          </Btn>
          <span className="ml-auto text-[14px]">
            Total <b>{money(total)}</b>
          </span>
        </>
      }
    >
      <ErrBox text={err} />
      <Label required>Memo</Label>
      <input aria-label="Expense report memo" value={memo} onChange={(e) => (setMemo(e.target.value), setErr(''))} placeholder="e.g. Chicago DC site visit" className={inputCls + ' max-w-none'} />
      <div className="text-[15px] font-bold mt-5 mb-2">Expense Lines</div>
      <div className="rounded-xl border border-[#E8EBED] overflow-hidden">
        <table className="w-full text-[13.5px]">
          <thead>
            <tr className="bg-[#F6F7F8] text-left text-[12.5px] text-[#5E6A75]">
              <th className="px-3 h-9 font-bold">Date</th>
              <th className="font-bold">Expense Item</th>
              <th className="font-bold">Merchant</th>
              <th className="font-bold">Amount (USD)</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.k} className="border-t border-[#F0F1F2]">
                <td className="px-3 py-2">
                  <input type="date" aria-label="Expense date" value={l.date} onChange={(e) => upd(l.k, { date: e.target.value })} className={inputCls + ' h-9'} />
                </td>
                <td className="pr-2">
                  <select aria-label="Expense item" value={l.category} onChange={(e) => upd(l.k, { category: e.target.value })} className={inputCls + ' h-9'}>
                    {EXP_CATS.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </td>
                <td className="pr-2">
                  <input aria-label="Merchant" value={l.merchant} onChange={(e) => (upd(l.k, { merchant: e.target.value }), setErr(''))} className={inputCls + ' h-9'} />
                </td>
                <td className="pr-2">
                  <input aria-label="Amount" inputMode="decimal" value={l.amount} onChange={(e) => (upd(l.k, { amount: e.target.value.replace(/[^0-9.]/g, '') }), setErr(''))} placeholder="0.00" className={inputCls + ' h-9'} />
                </td>
                <td className="pr-3">
                  <button aria-label="Remove line" disabled={lines.length === 1} onClick={() => setLines((ls) => ls.filter((x) => x.k !== l.k))} className="w-8 h-8 rounded-full hover:bg-[#F0F1F2] flex items-center justify-center text-[#5E6A75] disabled:opacity-30">
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button onClick={() => setLines((ls) => [...ls, { k: uid('l'), date: isoDate(new Date()), category: 'Meals', merchant: '', amount: '', memo: '' }])} className="mt-3 text-[14px] font-bold text-[#0875E1] hover:underline flex items-center gap-1">
        <Plus size={15} /> Add Line
      </button>
    </Modal>
  )
}

function ExpenseDetail({ e, onClose, onMsg }: { e: any; onClose: () => void; onMsg: (m: string) => void }) {
  const { isAgent } = useDesk()
  return (
    <Modal
      title={`Expense Report ${e.number}`}
      onClose={onClose}
      width={760}
      footer={
        <>
          {e.status === 'Draft' && (
            <Btn
              variant="primary"
              onClick={() => {
                submitExpense(e.id, e.number, e.total, isAgent)
                onMsg(`Expense Report ${e.number} submitted. Up next: Approval by ${person(mgrOf()).name}.`)
                onClose()
              }}
            >
              Submit
            </Btn>
          )}
          {e.status === 'Submitted' && (
            <Btn
              onClick={() => {
                db.update('workday.expenses', e.id, { status: 'Draft' })
                const t = db.get<any>('workday.tasks').find((x) => x.link?.expenseId === e.id && x.status === 'open')
                if (t) db.update('workday.tasks', t.id, { status: 'done', completedAt: nowIso(), outcome: 'Canceled' })
                onMsg(`Expense Report ${e.number} was recalled to draft.`)
                onClose()
              }}
            >
              Cancel Submission
            </Btn>
          )}
          {e.status === 'Draft' && (
            <Btn
              variant="tertiary"
              onClick={() => {
                db.remove('workday.expenses', e.id)
                onMsg(`Draft ${e.number} deleted.`)
                onClose()
              }}
            >
              Delete Draft
            </Btn>
          )}
          <Btn variant="tertiary" onClick={onClose}>
            Close
          </Btn>
        </>
      }
    >
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <div className="text-[12.5px] text-[#5E6A75]">Memo</div>
          <div className="font-medium">{e.memo}</div>
        </div>
        <div>
          <div className="text-[12.5px] text-[#5E6A75]">Status</div>
          <div className="font-medium">{e.status}</div>
        </div>
        <div>
          <div className="text-[12.5px] text-[#5E6A75]">Total</div>
          <div className="font-bold">{money(e.total)}</div>
        </div>
      </div>
      <table className="w-full text-[13.5px] rounded-xl border border-[#E8EBED]">
        <thead>
          <tr className="bg-[#F6F7F8] text-left text-[12.5px] text-[#5E6A75]">
            <th className="px-4 h-9 font-bold">Date</th>
            <th className="font-bold">Expense Item</th>
            <th className="font-bold">Merchant</th>
            <th className="font-bold text-right pr-4">Amount</th>
          </tr>
        </thead>
        <tbody>
          {(e.lines ?? []).map((l: any, i: number) => (
            <tr key={i} className="border-t border-[#F0F1F2]">
              <td className="px-4 h-10">{fmtMDY(l.date)}</td>
              <td>{l.category}</td>
              <td>{l.merchant}</td>
              <td className="text-right pr-4 font-bold">{money(l.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Modal>
  )
}

/* ═════════════════════════════ Learning ═════════════════════════════ */

export const COURSES = [
  { id: 'crs-coc', title: 'Code of Conduct 2026', kind: 'Required', dur: '30 min', provider: 'Northwind Compliance', taskId: 'wt-train-alex', color: '#DE2E21' },
  { id: 'crs-sec', title: 'Security Awareness: Phishing & MFA', kind: 'Required', dur: '20 min', provider: 'Northwind IT Security', color: '#005CB9' },
  { id: 'crs-hybrid', title: 'Leading Hybrid Teams', kind: 'Recommended', dur: '45 min', provider: 'Workday Learning', color: '#8660D9' },
  { id: 'crs-feedback', title: 'Giving Effective Feedback', kind: 'Recommended', dur: '25 min', provider: 'Workday Learning', color: '#F38B00' },
  { id: 'crs-lean', title: 'Lean Six Sigma — Yellow Belt', kind: 'Recommended', dur: '6 h', provider: 'LinkedIn Learning', color: '#319C4C' },
  { id: 'crs-excel', title: 'Advanced Excel for Operations', kind: 'Recommended', dur: '2 h 15 min', provider: 'LinkedIn Learning', color: '#00A3A3' },
]

export function LearningPage({ nav }: { nav: Nav }) {
  const { isAgent } = useDesk()
  const recs = useCollection<any>('workday.learning')
  const [tab, setTab] = useState<'all' | 'Required' | 'Recommended' | 'done'>('all')
  const stateOf = (cid: string) => recs.find((r) => r.id === `lrn-${cid}`) ?? { status: 'Not Started', progress: 0 }
  const advance = (c: (typeof COURSES)[number]) => {
    const cur = stateOf(c.id)
    const progress = Math.min(100, (cur.progress ?? 0) + (cur.status === 'Not Started' ? 25 : 40))
    const done = progress >= 100
    db.upsert('workday.learning', { id: `lrn-${c.id}`, workerId: 'wd-alex', courseId: c.id, progress, status: done ? 'Completed' : 'In Progress', startedAt: (cur as any).startedAt ?? nowIso(), completedAt: done ? nowIso() : undefined })
    if (done && c.taskId) {
      const t = db.find<any>('workday.tasks', c.taskId)
      if (t && t.status === 'open') db.update('workday.tasks', c.taskId, { status: 'done', completedAt: nowIso(), outcome: 'Completed', updatedBy: isAgent ? 'hworker' : undefined })
    }
  }
  const list = COURSES.filter((c) => (tab === 'all' ? true : tab === 'done' ? stateOf(c.id).status === 'Completed' : c.kind === tab))
  const completed = COURSES.filter((c) => stateOf(c.id).status === 'Completed').length
  return (
    <div className="max-w-[1180px] mx-auto px-10 py-8">
      <Head icon={<GraduationCap size={22} />} color="#8660D9" title="Learning" sub={`${completed} of ${COURSES.length} courses completed this year`} />
      <div className="flex gap-2 mb-5">
        {(
          [
            ['all', 'All'],
            ['Required', 'Required'],
            ['Recommended', 'Recommended for You'],
            ['done', 'Completed'],
          ] as const
        ).map(([k, l]) => (
          <button key={k} data-agent={`workday-learning-tab-${k.toLowerCase()}`} onClick={() => setTab(k)} className={`h-9 px-4 rounded-full text-[13.5px] font-bold border ${tab === k ? 'bg-[#333] text-white border-[#333]' : 'border-[#A1AAB3] hover:bg-[#F0F1F2]'}`}>
            {l}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-5">
        {list.map((c) => {
          const st = stateOf(c.id)
          return (
            <div key={c.id} className="bg-white rounded-2xl border border-[#E8EBED] overflow-hidden flex flex-col">
              <div className="h-[92px] flex items-center justify-center text-white" style={{ background: `linear-gradient(135deg, ${c.color}, ${c.color}99)` }}>
                <GraduationCap size={34} />
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex items-center gap-2">
                  <Pill tone={c.kind === 'Required' ? 'red' : 'blue'}>{c.kind}</Pill>
                  <span className="text-[12.5px] text-[#5E6A75]">{c.dur}</span>
                </div>
                <div className="text-[15px] font-bold mt-2 leading-snug">{c.title}</div>
                <div className="text-[12.5px] text-[#5E6A75] mt-0.5">{c.provider}</div>
                <div className="mt-3 h-2 rounded-full bg-[#E8EBED] overflow-hidden">
                  <div className="h-full bg-[#319C4C]" style={{ width: `${st.progress ?? 0}%` }} />
                </div>
                <div className="text-[12px] text-[#5E6A75] mt-1">{st.status === 'Completed' ? `Completed ${fmtMDY((st as any).completedAt ?? nowIso())}` : st.status === 'In Progress' ? `${st.progress}% complete` : 'Not started'}</div>
                <div className="mt-4">
                  {st.status === 'Completed' ? (
                    <span className="text-[14px] font-bold text-[#1E6F34] flex items-center gap-1.5">
                      <CheckCircle2 size={18} /> Completed
                    </span>
                  ) : (
                    <Btn size="sm" variant={st.status === 'Not Started' ? 'primary' : 'secondary'} agent={`workday-course-${c.id}`} icon={<PlayCircle size={14} />} onClick={() => advance(c)}>
                      {st.status === 'Not Started' ? 'Start' : 'Continue'}
                    </Btn>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      {!list.length && <div className="text-[14px] text-[#5E6A75]">No courses here yet.</div>}
      <button onClick={() => nav({ page: 'inbox' })} className="mt-6 text-[14px] font-bold text-[#0875E1] hover:underline">
        Go to My Tasks
      </button>
    </div>
  )
}

/* ═════════════════════════════ Career ═════════════════════════════ */

export const INTERNAL_JOBS = [
  { id: 'R-02188', title: 'Director, Operations', location: 'Chicago, IL — Fulton Market', org: 'Operations', posted: 3, grade: 'M5', desc: 'Lead Midwest distribution operations (3 DCs, 140 people) and own SLA, cost-to-serve and safety targets.' },
  { id: 'R-02194', title: 'Senior Supply Chain Analyst', location: 'Boston, MA — One Federal', org: 'Operations', posted: 6, grade: 'P4', desc: 'Build demand and capacity models, partner with Finance on landed cost and run S&OP analytics.' },
  { id: 'R-02203', title: 'Operations Program Manager', location: 'Remote — US', org: 'Operations', posted: 9, grade: 'P4', desc: 'Drive cross-functional programs: WMS rollout, carrier consolidation and the warehouse automation pilot.' },
  { id: 'R-02207', title: 'Procurement Manager', location: 'New York, NY — Hudson Yards', org: 'Finance', posted: 12, grade: 'M3', desc: 'Own indirect sourcing events, supplier negotiations and the Coupa catalog strategy.' },
  { id: 'R-02211', title: 'Operations Coordinator II', location: 'Boston, MA — One Federal', org: 'Operations', posted: 1, grade: 'P1', desc: 'Coordinate inbound scheduling, vendor communications and daily SLA reporting.' },
]

export function CareerPage() {
  const { isAgent } = useDesk()
  const apps = useCollection<any>('workday.applications')
  const [q, setQ] = useState('')
  const [applying, setApplying] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [msg, setMsg] = useState('')
  const list = INTERNAL_JOBS.filter((j) => !q || `${j.title} ${j.location} ${j.org}`.toLowerCase().includes(q.toLowerCase()))
  const appOf = (id: string) => apps.find((a) => a.id === `app-${id}` && a.status !== 'Withdrawn')
  const job = INTERNAL_JOBS.find((j) => j.id === applying)
  return (
    <div className="max-w-[1180px] mx-auto px-10 py-8">
      <Head icon={<Briefcase size={22} />} color="#005CB9" title="Career" sub="Find Jobs · Internal postings at Northwind Global" />
      {msg && (
        <div className="mb-5">
          <Success onClose={() => setMsg('')}>{msg}</Success>
        </div>
      )}
      <div className="flex items-center gap-2 h-10 w-[420px] rounded-full bg-white border border-[#A1AAB3] px-4 mb-5 focus-within:border-[#0875E1]">
        <Search size={16} className="text-[#5E6A75]" />
        <input aria-label="Search jobs" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by job title or location" className="flex-1 outline-none text-[14px] bg-transparent" />
      </div>
      <div className="space-y-4">
        {list.map((j) => {
          const a = appOf(j.id)
          return (
            <div key={j.id} className="bg-white rounded-2xl border border-[#E8EBED] p-5 flex items-start gap-4">
              <AppIcon icon={<Briefcase size={18} />} color="#005CB9" />
              <div className="flex-1 min-w-0">
                <div className="text-[16px] font-bold text-[#0875E1]">{j.title}</div>
                <div className="text-[13px] text-[#5E6A75]">
                  {j.id} · {j.location} · {j.org} · Grade {j.grade} · Posted {j.posted} {j.posted === 1 ? 'day' : 'days'} ago
                </div>
                <div className="text-[14px] mt-2 leading-relaxed">{j.desc}</div>
                {a && <div className="mt-2 text-[13px] text-[#1E6F34] font-bold">Applied {fmtMDY(a.appliedAt)} · Status: {a.status}</div>}
              </div>
              {a ? (
                <Btn size="sm" onClick={() => (db.update('workday.applications', a.id, { status: 'Withdrawn' }), setMsg(`Application for ${j.title} withdrawn.`))}>
                  Withdraw
                </Btn>
              ) : (
                <Btn size="sm" variant="primary" agent={`workday-job-apply-${j.id}`} onClick={() => (setApplying(j.id), setNote(''))}>
                  Apply
                </Btn>
              )}
            </div>
          )
        })}
        {!list.length && <div className="text-[14px] text-[#5E6A75]">No jobs match “{q}”.</div>}
      </div>
      {job && (
        <Modal
          title={`Apply: ${job.title}`}
          onClose={() => setApplying(null)}
          footer={
            <>
              <Btn
                variant="primary"
                onClick={() => {
                  db.upsert('workday.applications', { id: `app-${job.id}`, jobId: job.id, workerId: 'wd-alex', note, appliedAt: nowIso(), status: 'Under Review', createdBy: isAgent ? 'hworker' : undefined })
                  setApplying(null)
                  setMsg(`You applied for ${job.title}. ${person(mgrOf()).name} has been notified as your manager.`)
                }}
              >
                Submit
              </Btn>
              <Btn onClick={() => setApplying(null)}>Cancel</Btn>
            </>
          }
        >
          <div className="text-[13.5px] text-[#5E6A75] mb-4">
            {job.location} · Your profile, resume and performance history will be shared with the recruiter. Your manager is notified when you apply.
          </div>
          <Label>Why are you interested?</Label>
          <textarea aria-label="Cover note" value={note} onChange={(e) => setNote(e.target.value)} className={textareaCls} />
        </Modal>
      )}
    </div>
  )
}

/* ═════════════════════════════ Goals ═════════════════════════════ */

export function GoalsPage({ nav, workerId = 'wd-alex' }: { nav: Nav; workerId?: string }) {
  const { isAgent } = useDesk()
  const workers = useCollection<any>('workday.workers')
  const w = workers.find((x) => x.id === workerId)
  const goals = useCollection<any>('workday.goals').filter((g) => g.workerId === workerId)
  const [edit, setEdit] = useState<any | null>(null)
  return (
    <div className="max-w-[1180px] mx-auto px-10 py-8">
      {workerId !== 'wd-alex' && (
        <button onClick={() => nav({ page: 'worker', workerId })} className="text-[14px] font-bold text-[#0875E1] hover:underline mb-3 flex items-center gap-1">
          <ChevronLeft size={16} /> {w?.name}
        </button>
      )}
      <Head
        icon={<Target size={22} />}
        color="#F38B00"
        title="Goals"
        sub={`${w?.name ?? ME.name} · ${goals.filter((g) => g.status === 'Completed').length} of ${goals.length} completed`}
        right={
          <Btn variant="primary" agent="workday-goal-add" icon={<Plus size={16} />} onClick={() => setEdit({ title: '', desc: '', category: 'Business', due: isoDate(new Date(new Date().getFullYear(), 11, 31)), progress: 0 })}>
            Add Goal
          </Btn>
        }
      />
      <div className="space-y-4">
        {goals.map((g) => (
          <div key={g.id} data-agent={`workday-goal-${g.id}`} className="bg-white rounded-2xl border border-[#E8EBED] p-5">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[16px] font-bold">{g.title}</span>
                  <Pill tone={g.status === 'Completed' ? 'green' : g.progress < 30 && +new Date(g.due) - Date.now() < 45 * 864e5 ? 'red' : 'blue'}>{g.status === 'Completed' ? 'Completed' : g.progress < 30 && +new Date(g.due) - Date.now() < 45 * 864e5 ? 'At Risk' : 'On Track'}</Pill>
                </div>
                <div className="text-[13px] text-[#5E6A75] mt-0.5">
                  {g.category} · Due {fmtLong(g.due)}
                </div>
                {g.desc && <div className="text-[14px] mt-2">{g.desc}</div>}
              </div>
              <Btn size="sm" onClick={() => setEdit(g)}>
                Edit
              </Btn>
            </div>
            <div className="flex items-center gap-3 mt-4">
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                aria-label={`Progress for ${g.title}`}
                value={g.progress}
                onChange={(e) => {
                  const p = Number(e.target.value)
                  db.update('workday.goals', g.id, { progress: p, status: p >= 100 ? 'Completed' : 'In Progress', updatedBy: isAgent ? 'hworker' : undefined })
                }}
                className="flex-1 accent-[#0875E1]"
              />
              <span className="w-12 text-right text-[14px] font-bold">{g.progress}%</span>
            </div>
          </div>
        ))}
        {!goals.length && <div className="bg-white rounded-2xl border border-[#E8EBED] p-8 text-[14px] text-[#5E6A75]">No goals yet. Add a goal to track what matters this year.</div>}
      </div>
      {edit && (
        <GoalModal
          goal={edit}
          onClose={() => setEdit(null)}
          onSave={(g) => {
            if (g.id) db.update('workday.goals', g.id, g)
            else db.insert('workday.goals', { ...g, id: uid('wgoal'), workerId, status: g.progress >= 100 ? 'Completed' : 'In Progress', createdAt: nowIso(), createdBy: isAgent ? 'hworker' : undefined })
            setEdit(null)
          }}
          onDelete={
            edit.id
              ? () => {
                  db.remove('workday.goals', edit.id)
                  setEdit(null)
                }
              : undefined
          }
        />
      )}
    </div>
  )
}

function GoalModal({ goal, onClose, onSave, onDelete }: { goal: any; onClose: () => void; onSave: (g: any) => void; onDelete?: () => void }) {
  const [g, setG] = useState(goal)
  const [err, setErr] = useState('')
  return (
    <Modal
      title={goal.id ? 'Edit Goal' : 'Add Goal'}
      onClose={onClose}
      footer={
        <>
          <Btn variant="primary" onClick={() => (g.title.trim() ? onSave({ ...g, title: g.title.trim() }) : setErr('Goal is required.'))}>
            OK
          </Btn>
          <Btn onClick={onClose}>Cancel</Btn>
          {onDelete && (
            <Btn variant="tertiary" className="ml-auto !text-[#DE2E21]" onClick={onDelete}>
              Delete Goal
            </Btn>
          )}
        </>
      }
    >
      <ErrBox text={err} />
      <div className="space-y-4">
        <div>
          <Label required>Goal</Label>
          <input aria-label="Goal" value={g.title} onChange={(e) => (setG({ ...g, title: e.target.value }), setErr(''))} className={inputCls + ' max-w-none'} />
        </div>
        <div>
          <Label>Description</Label>
          <textarea aria-label="Goal description" value={g.desc} onChange={(e) => setG({ ...g, desc: e.target.value })} className={textareaCls} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Category</Label>
            <select aria-label="Goal category" value={g.category} onChange={(e) => setG({ ...g, category: e.target.value })} className={inputCls}>
              {['Business', 'Customer', 'People', 'Development'].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Due Date</Label>
            <input type="date" aria-label="Goal due date" value={g.due} onChange={(e) => setG({ ...g, due: e.target.value })} className={inputCls} />
          </div>
        </div>
      </div>
    </Modal>
  )
}

/* ═════════════════════════════ Feedback ═════════════════════════════ */

const BADGES = ['Above & Beyond', 'Team Player', 'Customer Hero', 'Problem Solver', 'Thank You']

export function FeedbackPage({ nav }: { nav: Nav }) {
  const fb = useCollection<any>('workday.feedback')
  const [tab, setTab] = useState<'received' | 'given'>('received')
  const [giving, setGiving] = useState(false)
  const [msg, setMsg] = useState('')
  const list = fb.filter((f) => (tab === 'received' ? f.toWorkerId === 'wd-alex' : f.fromId === ME.id)).sort((a, b) => (b.at ?? '').localeCompare(a.at ?? ''))
  return (
    <div className="max-w-[1000px] mx-auto px-10 py-8">
      <Head
        icon={<MessageSquareHeart size={22} />}
        color="#C9227A"
        title="Feedback"
        sub="Recognize colleagues and see what others are saying"
        right={
          <Btn variant="primary" agent="workday-feedback-give" onClick={() => setGiving(true)}>
            Give Feedback
          </Btn>
        }
      />
      {msg && (
        <div className="mb-5">
          <Success onClose={() => setMsg('')}>{msg}</Success>
        </div>
      )}
      <div className="flex gap-1 border-b border-[#E8EBED] mb-5">
        {(['received', 'given'] as const).map((k) => (
          <button key={k} onClick={() => setTab(k)} className={`relative h-11 px-3 text-[14px] font-bold ${tab === k ? 'text-[#005CB9]' : 'text-[#5E6A75]'}`}>
            {k === 'received' ? 'Received' : 'Given'} ({fb.filter((f) => (k === 'received' ? f.toWorkerId === 'wd-alex' : f.fromId === ME.id)).length})
            {tab === k && <span className="absolute left-2 right-2 bottom-0 h-[3px] rounded-full bg-[#0875E1]" />}
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {list.map((f) => {
          const to = db.find<any>('workday.workers', f.toWorkerId)
          const who = tab === 'received' ? f.fromId : to?.personId
          return (
            <div key={f.id} className="bg-white rounded-2xl border border-[#E8EBED] p-5 flex gap-4">
              <Avatar id={who} size={40} />
              <div className="flex-1 min-w-0">
                <div className="text-[14px]">
                  {tab === 'received' ? (
                    <>
                      <b>{person(f.fromId).name}</b> gave you feedback
                    </>
                  ) : (
                    <>
                      You gave feedback to{' '}
                      <button onClick={() => to && nav({ page: 'worker', workerId: to.id })} className="font-bold text-[#0875E1] hover:underline">
                        {to?.name}
                      </button>
                    </>
                  )}
                  {f.badge && (
                    <span className="ml-2 inline-flex items-center gap-1 text-[12px] font-bold text-[#9C4F00] bg-[#FFEFD6] rounded px-2 h-6 align-middle">
                      <Award size={13} /> {f.badge}
                    </span>
                  )}
                </div>
                <div className="text-[14px] mt-1.5 leading-relaxed">{f.text}</div>
                <div className="text-[12px] text-[#5E6A75] mt-1.5">
                  {fmtLong(f.at)} · {f.visibility ?? 'Public'}
                </div>
              </div>
            </div>
          )
        })}
        {!list.length && <div className="text-[14px] text-[#5E6A75]">Nothing here yet.</div>}
      </div>
      {giving && (
        <GiveFeedbackModal
          onClose={() => setGiving(false)}
          onDone={(name) => {
            setGiving(false)
            setTab('given')
            setMsg(`Feedback sent to ${name}.`)
          }}
        />
      )}
    </div>
  )
}

export function GiveFeedbackModal({ toWorkerId, onClose, onDone }: { toWorkerId?: string; onClose: () => void; onDone: (name: string) => void }) {
  const { isAgent } = useDesk()
  const workers = useCollection<any>('workday.workers').filter((w) => w.id !== 'wd-alex' && w.status !== 'Pre-Hire')
  const [to, setTo] = useState(toWorkerId ?? '')
  const [badge, setBadge] = useState('')
  const [text, setText] = useState('')
  const [vis, setVis] = useState('Public')
  const [err, setErr] = useState('')
  const send = () => {
    if (!to) return setErr('Select who the feedback is about.')
    if (!text.trim()) return setErr('Feedback is required.')
    db.insert('workday.feedback', { id: uid('wfb'), fromId: ME.id, toWorkerId: to, badge: badge || undefined, text: text.trim(), visibility: vis, at: nowIso(), createdBy: isAgent ? 'hworker' : undefined })
    onDone(workers.find((w) => w.id === to)?.name ?? '')
  }
  return (
    <Modal
      title="Give Feedback"
      onClose={onClose}
      agent="workday-feedback-modal"
      footer={
        <>
          <Btn variant="primary" agent="workday-feedback-send" onClick={send}>
            Submit
          </Btn>
          <Btn onClick={onClose}>Cancel</Btn>
        </>
      }
    >
      <ErrBox text={err} />
      <div className="space-y-4">
        <div>
          <Label required>To</Label>
          <select aria-label="Feedback recipient" value={to} onChange={(e) => (setTo(e.target.value), setErr(''))} className={inputCls}>
            <option value="">select one</option>
            {workers.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} — {w.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>Badge</Label>
          <div className="flex flex-wrap gap-2">
            {BADGES.map((b) => (
              <button key={b} onClick={() => setBadge(badge === b ? '' : b)} className={`h-8 px-3 rounded-full text-[13px] font-bold border ${badge === b ? 'bg-[#FFEFD6] border-[#F38B00] text-[#9C4F00]' : 'border-[#A1AAB3] hover:bg-[#F0F1F2]'}`}>
                {b}
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label required>Feedback</Label>
          <textarea aria-label="Feedback" value={text} onChange={(e) => (setText(e.target.value), setErr(''))} className={textareaCls} />
        </div>
        <div>
          <Label>Visibility</Label>
          <select aria-label="Feedback visibility" value={vis} onChange={(e) => setVis(e.target.value)} className={inputCls}>
            {['Public', 'Private (worker and manager)', 'Private (manager only)'].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </div>
      </div>
    </Modal>
  )
}

/* ═════════════════════════════ Directory ═════════════════════════════ */

export function DirectoryPage({ nav }: { nav: Nav }) {
  const workers = useCollection<any>('workday.workers')
  const [q, setQ] = useState('')
  const [dept, setDept] = useState('all')
  const depts = useMemo(() => [...new Set(workers.map((w) => w.dept).filter(Boolean))].sort(), [workers])
  const list = workers.filter((w) => (dept === 'all' || w.dept === dept) && (!q || `${w.name} ${w.title} ${w.location} ${w.email}`.toLowerCase().includes(q.toLowerCase()))).sort((a, b) => a.name.localeCompare(b.name))
  return (
    <div className="max-w-[1180px] mx-auto px-10 py-8">
      <Head icon={<BookUser size={22} />} color="#5E6A75" title="Directory" sub={`${workers.length} workers · Northwind Global`} />
      <div className="flex items-center gap-3 mb-5">
        <div className="flex items-center gap-2 h-10 w-[380px] rounded-full bg-white border border-[#A1AAB3] px-4 focus-within:border-[#0875E1]">
          <Search size={16} className="text-[#5E6A75]" />
          <input data-agent="workday-directory-search" aria-label="Search directory" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, title or location" className="flex-1 outline-none text-[14px] bg-transparent" />
        </div>
        <select aria-label="Department" value={dept} onChange={(e) => setDept(e.target.value)} className={inputCls + ' max-w-[220px] rounded-full'}>
          <option value="all">All departments</option>
          {depts.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
        <span className="text-[13px] text-[#5E6A75]">{list.length} results</span>
      </div>
      <Card>
        <table className="w-full text-[14px]">
          <thead>
            <tr className="text-left text-[12.5px] text-[#5E6A75] bg-[#F6F7F8] border-b border-[#E8EBED]">
              <th className="px-6 h-10 font-bold rounded-tl-2xl">Name</th>
              <th className="font-bold">Business Title</th>
              <th className="font-bold">Department</th>
              <th className="font-bold">Location</th>
              <th className="font-bold">Phone</th>
            </tr>
          </thead>
          <tbody>
            {list.map((w) => (
              <tr key={w.id} onClick={() => nav({ page: 'worker', workerId: w.id })} className="border-b border-[#F0F1F2] hover:bg-[#F6F7F8] cursor-pointer">
                <td className="px-6 h-12">
                  <div className="flex items-center gap-3">
                    <Avatar id={w.personId} size={30} />
                    <span className="font-bold text-[#0875E1]">{w.name}</span>
                  </div>
                </td>
                <td>{w.title}</td>
                <td>{w.dept}</td>
                <td>{w.location}</td>
                <td className="text-[#5E6A75]">{w.workPhone ?? w.phone}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

/* ═════════════════════════════ Help ═════════════════════════════ */

const FAQ: [string, string][] = [
  ['How do I request time off?', 'Go to Time Off › Request Time Off, select days on the calendar, choose a type and submit. Your manager receives an approval task; you can cancel a request from the request details until the first day starts.'],
  ['When is payday?', 'Northwind pays semi-monthly on the 15th and the last business day of the month. Payslips are available in Pay two business days before payday.'],
  ['How do I change my benefits outside Open Enrollment?', 'Qualifying life events (marriage, birth, loss of coverage) let you change elections within 30 days. Start a Benefit Change from Benefits.'],
  ['How do I submit an expense report?', 'Open Expenses › Create Expense Report, add a line per receipt and submit. Reports under $5,000 need manager approval only.'],
  ['Who do I contact for HR questions?', 'Your HR Partner is James Whitaker (People team). For payroll questions email payroll@northwind.com.'],
]

export function HelpPage({ nav }: { nav: Nav }) {
  const { open } = useDesk()
  const [openIdx, setOpenIdx] = useState<number | null>(0)
  return (
    <div className="max-w-[900px] mx-auto px-10 py-8">
      <Head icon={<LifeBuoy size={22} />} color="#0875E1" title="Help" sub="Answers to common questions about Workday at Northwind" />
      <Card>
        {FAQ.map(([q, a], i) => (
          <div key={q} className="border-b border-[#F0F1F2] last:border-0">
            <button onClick={() => setOpenIdx(openIdx === i ? null : i)} className="w-full flex items-center gap-3 px-6 h-14 text-left text-[15px] font-bold">
              {openIdx === i ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              {q}
            </button>
            {openIdx === i && <div className="px-6 pl-[54px] pb-5 text-[14px] leading-relaxed text-[#333]">{a}</div>}
          </div>
        ))}
      </Card>
      <div className="flex gap-3 mt-6">
        <Btn variant="primary" onClick={() => open('outlook', { compose: { to: [person('james').email], subject: 'Workday question' } })}>
          Contact HR Partner
        </Btn>
        <Btn onClick={() => nav({ page: 'inbox' })}>Go to My Tasks</Btn>
      </div>
    </div>
  )
}

/* ═════════════════════════════ Manager actions ═════════════════════════════ */

function useTeam() {
  return useCollection<any>('workday.workers').filter((w) => w.managerId === 'wd-alex')
}

export function CompChangeModal({ workerId, onClose, onDone }: { workerId?: string; onClose: () => void; onDone: (m: string) => void }) {
  const { isAgent } = useDesk()
  const team = useTeam().filter((w) => w.compensation)
  const [wid, setWid] = useState(workerId && team.some((t) => t.id === workerId) ? workerId : '')
  const w = team.find((x) => x.id === wid)
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [eff, setEff] = useState(isoDate(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)))
  const [err, setErr] = useState('')
  const base = Number(amount.replace(/[^0-9.]/g, ''))
  const pct = w && base ? ((base - w.compensation.base) / w.compensation.base) * 100 : 0
  const submit = () => {
    if (!w) return setErr('Worker is required.')
    if (!base) return setErr('Proposed base pay is required.')
    if (!reason) return setErr('Reason is required.')
    db.update('workday.workers', w.id, { pendingComp: { base, effective: eff, reason, submittedAt: nowIso(), status: 'Awaiting Approval' } })
    db.insert(
      'workday.tasks',
      { id: uid('wt'), assignee: mgrOf(), title: `Request Compensation Change: ${w.name}`, process: 'Request Compensation Change', step: 'Approval by Manager’s Manager', fromId: ME.id, receivedAt: nowIso(), due: new Date(Date.now() + 5 * 864e5).toISOString(), status: 'open', link: { page: 'worker', workerId: w.id }, createdBy: isAgent ? 'hworker' : undefined },
      { prepend: true },
    )
    onDone(`Compensation change for ${w.name} submitted (${money(base).replace('.00', '')}, effective ${fmtMDY(eff)}). Up next: approval by ${person(mgrOf()).name}.`)
  }
  return (
    <Modal
      title="Request Compensation Change"
      onClose={onClose}
      footer={
        <>
          <Btn variant="primary" onClick={submit}>
            Submit
          </Btn>
          <Btn onClick={onClose}>Cancel</Btn>
        </>
      }
    >
      <ErrBox text={err} />
      <div className="space-y-4">
        <div>
          <Label required>Worker</Label>
          <select aria-label="Worker" value={wid} onChange={(e) => (setWid(e.target.value), setErr(''))} className={inputCls}>
            <option value="">select one</option>
            {team.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        {w && (
          <div className="rounded-xl bg-[#F6F7F8] px-4 py-3 text-[13.5px]">
            Current: <b>{money(w.compensation.base).replace('.00', '')}</b> {w.compensation.frequency} · Grade {w.compensation.grade}
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label required>Proposed Base Pay (USD)</Label>
            <input aria-label="Proposed base pay" value={amount} onChange={(e) => (setAmount(e.target.value), setErr(''))} placeholder="0.00" className={inputCls} />
            {w && base > 0 && <div className={`text-[12.5px] mt-1 font-bold ${pct >= 0 ? 'text-[#1E6F34]' : 'text-[#A31B12]'}`}>{pct >= 0 ? '+' : ''}{pct.toFixed(1)}% change</div>}
          </div>
          <div>
            <Label required>Effective Date</Label>
            <input type="date" aria-label="Effective date" value={eff} onChange={(e) => setEff(e.target.value)} className={inputCls} />
          </div>
        </div>
        <div>
          <Label required>Reason</Label>
          <select aria-label="Reason" value={reason} onChange={(e) => (setReason(e.target.value), setErr(''))} className={inputCls}>
            <option value="">select one</option>
            {['Merit > Annual Review', 'Market Adjustment', 'Promotion', 'Equity Adjustment', 'Retention'].map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </div>
      </div>
    </Modal>
  )
}

const LOCATIONS = ['Boston, MA', 'New York, NY', 'Chicago, IL', 'Remote — US']

export function ChangeJobModal({ workerId, onClose, onDone }: { workerId?: string; onClose: () => void; onDone: (m: string) => void }) {
  const { isAgent } = useDesk()
  const team = useTeam().filter((w) => w.status === 'Active')
  const [wid, setWid] = useState(workerId && team.some((t) => t.id === workerId) ? workerId : '')
  const w = team.find((x) => x.id === wid)
  const [title, setTitle] = useState(w?.title ?? '')
  const [loc, setLoc] = useState(w?.location ?? '')
  const [reason, setReason] = useState('')
  const [eff, setEff] = useState(isoDate(new Date()))
  const [err, setErr] = useState('')
  const pick = (id: string) => {
    setWid(id)
    const x = team.find((t) => t.id === id)
    setTitle(x?.title ?? '')
    setLoc(x?.location ?? '')
    setErr('')
  }
  const submit = () => {
    if (!w) return setErr('Worker is required.')
    if (!title.trim()) return setErr('Business Title is required.')
    if (!reason) return setErr('Reason is required.')
    db.update('workday.workers', w.id, { title: title.trim(), location: loc, jobChanges: [...(w.jobChanges ?? []), { from: w.title, to: title.trim(), location: loc, reason, effective: eff, at: nowIso() }], updatedBy: isAgent ? 'hworker' : undefined })
    db.insert('workday.tasks', { id: uid('wt'), assignee: ME.id, title: `Change Job: ${w.name}`, process: 'Change Job', step: 'Successfully Completed', fromId: ME.id, receivedAt: nowIso(), status: 'done', completedAt: nowIso(), outcome: 'Completed', link: { page: 'worker', workerId: w.id } })
    onDone(`Change Job for ${w.name} completed — ${title.trim()}, ${loc}, effective ${fmtMDY(eff)}.`)
  }
  return (
    <Modal
      title="Change Job"
      onClose={onClose}
      footer={
        <>
          <Btn variant="primary" onClick={submit}>
            Submit
          </Btn>
          <Btn onClick={onClose}>Cancel</Btn>
        </>
      }
    >
      <ErrBox text={err} />
      <div className="space-y-4">
        <div>
          <Label required>Worker</Label>
          <select aria-label="Worker" value={wid} onChange={(e) => pick(e.target.value)} className={inputCls}>
            <option value="">select one</option>
            {team.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} — {t.title}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label required>Business Title</Label>
            <input aria-label="Business title" value={title} onChange={(e) => (setTitle(e.target.value), setErr(''))} className={inputCls} />
          </div>
          <div>
            <Label>Location</Label>
            <select aria-label="Location" value={loc} onChange={(e) => setLoc(e.target.value)} className={inputCls}>
              {[...new Set([loc, ...LOCATIONS].filter(Boolean))].map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <Label required>Reason</Label>
            <select aria-label="Reason" value={reason} onChange={(e) => (setReason(e.target.value), setErr(''))} className={inputCls}>
              <option value="">select one</option>
              {['Promotion', 'Lateral Move', 'Title Change', 'Location Change', 'Reorganization'].map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <Label required>Effective Date</Label>
            <input type="date" aria-label="Effective date" value={eff} onChange={(e) => setEff(e.target.value)} className={inputCls} />
          </div>
        </div>
      </div>
    </Modal>
  )
}

export function JobReqModal({ onClose, onDone }: { onClose: () => void; onDone: (m: string) => void }) {
  const { isAgent } = useDesk()
  const reqs = useCollection<any>('workday.requisitions')
  const [f, setF] = useState({ title: '', openings: '1', location: 'Boston, MA', type: 'Regular', time: 'Full time', target: isoDate(new Date(Date.now() + 45 * 864e5)), reason: '', justification: '' })
  const [err, setErr] = useState('')
  const set = (k: keyof typeof f) => (e: any) => (setF({ ...f, [k]: e.target.value }), setErr(''))
  const submit = () => {
    if (!f.title.trim()) return setErr('Job Posting Title is required.')
    if (!f.reason) return setErr('Reason is required.')
    const number = `R-0${2230 + reqs.length}`
    const id = uid('wreq')
    db.insert('workday.requisitions', { id, number, ...f, title: f.title.trim(), openings: Number(f.openings) || 1, org: 'Operations (Alex Morgan)', status: 'Awaiting Approval', createdAt: nowIso(), createdBy: isAgent ? 'hworker' : undefined })
    db.insert(
      'workday.tasks',
      { id: uid('wt'), assignee: mgrOf(), title: `Review Job Requisition: ${number} ${f.title.trim()}`, process: 'Create Job Requisition', step: 'Approval by Manager', fromId: ME.id, receivedAt: nowIso(), due: new Date(Date.now() + 4 * 864e5).toISOString(), status: 'open', link: { page: 'team', reqId: id }, createdBy: isAgent ? 'hworker' : undefined },
      { prepend: true },
    )
    onDone(`Job Requisition ${number} — ${f.title.trim()} submitted. Up next: approval by ${person(mgrOf()).name}, then posting by Recruiting.`)
  }
  return (
    <Modal
      title="Create Job Requisition"
      onClose={onClose}
      footer={
        <>
          <Btn variant="primary" onClick={submit}>
            Submit
          </Btn>
          <Btn onClick={onClose}>Cancel</Btn>
        </>
      }
    >
      <ErrBox text={err} />
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label required>Job Posting Title</Label>
          <input aria-label="Job posting title" value={f.title} onChange={set('title')} className={inputCls + ' max-w-none'} />
        </div>
        <div>
          <Label required>Reason</Label>
          <select aria-label="Reason" value={f.reason} onChange={set('reason')} className={inputCls}>
            <option value="">select one</option>
            {['New Headcount', 'Backfill > Resignation', 'Backfill > Internal Transfer', 'Seasonal'].map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </div>
        <div>
          <Label>Number of Openings</Label>
          <input aria-label="Number of openings" type="number" min={1} value={f.openings} onChange={set('openings')} className={inputCls} />
        </div>
        <div>
          <Label>Location</Label>
          <select aria-label="Location" value={f.location} onChange={set('location')} className={inputCls}>
            {LOCATIONS.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </div>
        <div>
          <Label>Target Hire Date</Label>
          <input type="date" aria-label="Target hire date" value={f.target} onChange={set('target')} className={inputCls} />
        </div>
        <div>
          <Label>Worker Type</Label>
          <select aria-label="Worker type" value={f.type} onChange={set('type')} className={inputCls}>
            {['Regular', 'Temporary', 'Contractor'].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </div>
        <div>
          <Label>Time Type</Label>
          <select aria-label="Time type" value={f.time} onChange={set('time')} className={inputCls}>
            {['Full time', 'Part time'].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </div>
        <div className="col-span-2">
          <Label>Justification</Label>
          <textarea aria-label="Justification" value={f.justification} onChange={set('justification')} className={textareaCls} />
        </div>
      </div>
    </Modal>
  )
}

export function MoveWorkersModal({ onClose, onDone }: { onClose: () => void; onDone: (m: string) => void }) {
  const team = useTeam()
  const workers = useCollection<any>('workday.workers')
  const managers = workers.filter((w) => w.id !== 'wd-alex' && w.status === 'Active' && workers.some((x) => x.managerId === w.id))
  const [sel, setSel] = useState<string[]>([])
  const [to, setTo] = useState('')
  const [err, setErr] = useState('')
  const submit = () => {
    if (!sel.length) return setErr('Select at least one worker.')
    const m = workers.find((w) => w.id === to)
    if (!m) return setErr('Proposed Supervisory Organization is required.')
    for (const id of sel) db.update('workday.workers', id, { managerId: m.id, org: `${m.dept} (${m.name})` })
    onDone(`${sel.length} worker${sel.length > 1 ? 's' : ''} moved to ${m.dept} (${m.name}).`)
  }
  return (
    <Modal
      title="Move Workers (By Organization)"
      onClose={onClose}
      footer={
        <>
          <Btn variant="primary" onClick={submit}>
            Submit
          </Btn>
          <Btn onClick={onClose}>Cancel</Btn>
        </>
      }
    >
      <ErrBox text={err} />
      <div className="text-[13.5px] text-[#5E6A75] mb-3">Current Supervisory Organization: Operations (Alex Morgan)</div>
      <Label required>Workers to Move</Label>
      <div className="rounded-xl border border-[#E8EBED] divide-y divide-[#F0F1F2] mb-4">
        {team.map((w) => (
          <label key={w.id} className="flex items-center gap-3 px-4 h-11 cursor-pointer">
            <input type="checkbox" checked={sel.includes(w.id)} onChange={(e) => (setSel((s) => (e.target.checked ? [...s, w.id] : s.filter((x) => x !== w.id))), setErr(''))} className="w-4 h-4 accent-[#0875E1]" />
            <Avatar id={w.personId} size={24} /> {w.name} <span className="text-[#5E6A75]">· {w.title}</span>
          </label>
        ))}
      </div>
      <Label required>Proposed Supervisory Organization</Label>
      <select aria-label="Proposed supervisory organization" value={to} onChange={(e) => (setTo(e.target.value), setErr(''))} className={inputCls + ' max-w-none'}>
        <option value="">select one</option>
        {managers.map((m) => (
          <option key={m.id} value={m.id}>
            {m.dept} ({m.name})
          </option>
        ))}
      </select>
    </Modal>
  )
}

export function TeamCalendarModal({ onClose, nav }: { onClose: () => void; nav: Nav }) {
  const workers = useCollection<any>('workday.workers')
  const reqs = useCollection<any>('workday.timeoff')
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const ids = new Set(workers.filter((w) => w.managerId === 'wd-alex' || w.id === 'wd-alex').map((w) => w.id))
  const byDay: Record<string, { name: string; type: string; status: string; id: string; personId: string }[]> = {}
  for (const r of reqs)
    if (ids.has(r.workerId) && r.status !== 'Canceled' && r.status !== 'Denied')
      for (const d of r.days)
        if (d.hours > 0) {
          const w = workers.find((x) => x.id === r.workerId)
          ;(byDay[d.date] ??= []).push({ name: w?.name ?? '', personId: w?.personId, type: r.type, status: r.status, id: r.id })
        }
  const start = new Date(month)
  start.setDate(1 - start.getDay())
  const cells = Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i))
  return (
    <Modal
      title="Team Absence Calendar"
      onClose={onClose}
      width={940}
      footer={
        <Btn variant="primary" onClick={onClose}>
          Done
        </Btn>
      }
    >
      <div className="flex items-center gap-2 mb-3">
        <button aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="w-8 h-8 rounded-full hover:bg-[#F0F1F2] flex items-center justify-center">
          <ChevronLeft size={18} />
        </button>
        <button aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="w-8 h-8 rounded-full hover:bg-[#F0F1F2] flex items-center justify-center">
          <ChevronRight size={18} />
        </button>
        <div className="text-[18px] font-bold ml-1">{month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
      </div>
      <div className="grid grid-cols-7 border-t border-l border-[#E8EBED]">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="h-8 flex items-center justify-center text-[12px] font-bold text-[#5E6A75] border-r border-b border-[#E8EBED] bg-[#F6F7F8]">
            {d}
          </div>
        ))}
        {cells.map((d) => {
          const iso = isoDate(d)
          const items = byDay[iso] ?? []
          return (
            <div key={iso} className={`h-[78px] p-1 border-r border-b border-[#E8EBED] overflow-hidden ${d.getMonth() === month.getMonth() ? '' : 'opacity-45'}`}>
              <div className="text-[12px] px-1">{d.getDate()}</div>
              {items.slice(0, 2).map((it) => (
                <button key={it.id + it.name} onClick={() => nav({ page: 'timeoff-detail', requestId: it.id })} className={`w-full text-left text-[11px] font-bold rounded px-1 py-0.5 mt-0.5 truncate ${it.status === 'Approved' ? 'bg-[#DFF6E3] text-[#1E6F34]' : 'bg-[#FFEFD6] text-[#9C4F00]'}`}>
                  {it.name.split(' ')[0]} · {it.type}
                </button>
              ))}
              {items.length > 2 && <div className="text-[11px] text-[#5E6A75] px-1">+{items.length - 2} more</div>}
            </div>
          )
        })}
      </div>
    </Modal>
  )
}

export function EditContactModal({ w, onClose, onDone }: { w: any; onClose: () => void; onDone: (m: string) => void }) {
  const { isAgent } = useDesk()
  const p = person(w.personId)
  const [f, setF] = useState({
    phone: w.phone ?? '',
    homeEmail: w.homeEmail ?? (w.personId === 'jordan' ? 'jordan.ellis.home@gmail.com' : `${p.first.toLowerCase()}.${p.last.toLowerCase().replace(/[^a-z]/g, '')}@outlook.com`),
    homePhone: w.homePhone ?? '',
    address: w.homeAddress ?? '',
    emergencyName: w.emergency?.name ?? '',
    emergencyRel: w.emergency?.relationship ?? 'Spouse',
    emergencyPhone: w.emergency?.phone ?? '',
  })
  const set = (k: keyof typeof f) => (e: any) => setF({ ...f, [k]: e.target.value })
  const save = () => {
    db.update('workday.workers', w.id, {
      phone: f.phone,
      homeEmail: f.homeEmail,
      homePhone: f.homePhone,
      homeAddress: f.address,
      emergency: f.emergencyName ? { name: f.emergencyName, relationship: f.emergencyRel, phone: f.emergencyPhone } : w.emergency,
      updatedBy: isAgent ? 'hworker' : w.updatedBy,
    })
    onDone('Contact information updated.')
  }
  return (
    <Modal
      title={`Change Contact Information: ${w.name}`}
      onClose={onClose}
      footer={
        <>
          <Btn variant="primary" agent="workday-contact-save" onClick={save}>
            Submit
          </Btn>
          <Btn onClick={onClose}>Cancel</Btn>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Work Phone</Label>
          <input aria-label="Work phone" value={f.phone} onChange={set('phone')} className={inputCls} />
        </div>
        <div>
          <Label>Home Phone</Label>
          <input aria-label="Home phone" value={f.homePhone} onChange={set('homePhone')} className={inputCls} />
        </div>
        <div className="col-span-2">
          <Label>Home Email</Label>
          <input aria-label="Home email" value={f.homeEmail} onChange={set('homeEmail')} className={inputCls + ' max-w-none'} />
        </div>
        <div className="col-span-2">
          <Label>Home Address</Label>
          <input aria-label="Home address" value={f.address} onChange={set('address')} placeholder="Street, City, State ZIP" className={inputCls + ' max-w-none'} />
        </div>
        <div className="col-span-2 text-[15px] font-bold pt-2">Primary Emergency Contact</div>
        <div>
          <Label>Name</Label>
          <input aria-label="Emergency contact name" value={f.emergencyName} onChange={set('emergencyName')} className={inputCls} />
        </div>
        <div>
          <Label>Relationship</Label>
          <select aria-label="Emergency contact relationship" value={f.emergencyRel} onChange={set('emergencyRel')} className={inputCls}>
            {['Spouse', 'Partner', 'Parent', 'Sibling', 'Friend', 'Other'].map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </div>
        <div>
          <Label>Phone</Label>
          <input aria-label="Emergency contact phone" value={f.emergencyPhone} onChange={set('emergencyPhone')} className={inputCls} />
        </div>
      </div>
    </Modal>
  )
}
