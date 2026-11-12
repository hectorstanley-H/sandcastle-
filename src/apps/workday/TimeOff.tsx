import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, CheckCircle2, Plane, Paperclip, X, CalendarDays, Clock, ArrowRight, CircleDot } from 'lucide-react'
import { db, uid, useCollection, useRecord } from '@/db/db'
import { useDesk } from '@/os/context'
import { ME, person } from '@/data/people'
import { isoDate } from '@/data/time'
import { Avatar } from '@/components/Avatar'
import { Btn, Card, HWorkerChip, Pill, AppIcon, Modal, Success, inputCls } from './ui'
import type { Nav } from './index'
import { chargeHours, fmtDays, fmtLong, fmtMDY, holidayName, holidays, isWeekend } from './util'

const TYPES = ['Vacation', 'Sick', 'Floating Holiday'] as const
const BAL_KEY: Record<string, 'vacation' | 'sick' | 'floating'> = { Vacation: 'vacation', Sick: 'sick', 'Floating Holiday': 'floating' }

function useMe() {
  return useRecord<any>('workday.workers', 'wd-alex')
}

const toneOf = (st: string) => (st === 'Approved' ? 'green' : st === 'Submitted' ? 'orange' : st === 'Denied' || st === 'Sent Back' ? 'red' : 'gray')

/** cancel a submitted/approved request: status → Canceled, hours go back, open approval task closes */
export function cancelTimeOff(r: any, isAgent: boolean) {
  db.update('workday.timeoff', r.id, { status: 'Canceled', canceledAt: new Date().toISOString(), updatedBy: isAgent ? 'hworker' : undefined })
  const key = BAL_KEY[r.type]
  if (key) db.update('workday.workers', r.workerId, (w) => ({ balances: { ...w.balances, [key]: Math.round(((w.balances?.[key] ?? 0) + r.totalDays) * 10) / 10 } }))
  for (const t of db.get<any>('workday.tasks').filter((x) => x.link?.requestId === r.id && x.status === 'open')) db.update('workday.tasks', t.id, { status: 'done', completedAt: new Date().toISOString(), outcome: 'Canceled' })
}

const cancellable = (r: any) => (r.status === 'Submitted' || r.status === 'Approved') && (r.days[r.days.length - 1]?.date ?? '') >= isoDate(new Date())

export function TimeOffHub({ nav }: { nav: Nav }) {
  const me = useMe()
  const { isAgent } = useDesk()
  const [view, setView] = useState<'overview' | 'balance' | 'holidays' | 'leave'>('overview')
  const [dlg, setDlg] = useState<null | 'cancel' | 'correct' | 'absence'>(null)
  const [msg, setMsg] = useState('')
  const reqs = useCollection<any>('workday.timeoff')
    .filter((r) => r.workerId === 'wd-alex')
    .sort((a, b) => (b.days[0]?.date ?? '').localeCompare(a.days[0]?.date ?? ''))
  const asOf = fmtMDY(isoDate(new Date()))
  return (
    <div className="max-w-[1280px] mx-auto px-10 py-8">
      <div className="flex items-center gap-4 mb-7">
        <AppIcon icon={<Plane size={22} />} color="#0875E1" size={48} />
        <div>
          <h1 className="text-[28px] font-bold leading-tight">Time Off and Leave</h1>
          <div className="text-[14px] text-[#5E6A75]">{ME.name} · {ME.title}</div>
        </div>
      </div>
      <div className="grid grid-cols-[300px_minmax(0,1fr)] gap-6">
        <div className="space-y-6">
          <Card title="Request">
            <div className="px-3 pb-3">
              {(
                [
                  ['Request Time Off', 'workday-timeoff-new', () => nav({ page: 'timeoff-request' })],
                  ['Request Absence', undefined, () => setDlg('absence')],
                  ['Correct My Time Off', undefined, () => setDlg('correct')],
                  ['Cancel Time Off', undefined, () => setDlg('cancel')],
                ] as [string, string | undefined, () => void][]
              ).map(([t, a, fn]) => (
                <button key={t} data-agent={a} onClick={fn} className="w-full text-left px-3 h-10 rounded-lg hover:bg-[#F6F7F8] text-[14px] font-bold text-[#0875E1]">
                  {t}
                </button>
              ))}
            </div>
          </Card>
          <Card title="View">
            <div className="px-3 pb-3">
              {(
                [
                  ['Time Off Balance', 'balance'],
                  ['My Time Off', 'overview'],
                  ['My Leave Results', 'leave'],
                  ['Holiday Calendar', 'holidays'],
                ] as const
              ).map(([t, v]) => (
                <button key={t} onClick={() => setView(v)} className={`w-full text-left px-3 h-10 rounded-lg text-[14px] font-bold text-[#0875E1] ${view === v ? 'bg-[#D7EAFC]' : 'hover:bg-[#F6F7F8]'}`}>
                  {t}
                </button>
              ))}
            </div>
          </Card>
        </div>
        <div className="space-y-6 min-w-0">
          {msg && <Success onClose={() => setMsg('')}>{msg}</Success>}
          {view === 'balance' && <BalanceByPeriod me={me} reqs={reqs} onBack={() => setView('overview')} />}
          {view === 'holidays' && <HolidayCalendar onBack={() => setView('overview')} />}
          {view === 'leave' && (
            <Card title="My Leave Results" action={<Btn size="sm" variant="tertiary" onClick={() => setView('overview')}>Back to Overview</Btn>}>
              <div className="px-6 pb-6 text-[14px] text-[#5E6A75]">You have no leaves of absence on record. To request parental, medical or personal leave, use Request Absence.</div>
            </Card>
          )}
          {view === 'overview' && (
          <>
          <Card title={`Time Off Balance as of ${asOf}`} agent="workday-balance">
            <div className="grid grid-cols-3 gap-4 px-6 pb-6">
              {TYPES.map((t) => (
                <div key={t} className="rounded-xl border border-[#E8EBED] p-4">
                  <div className="text-[13px] text-[#5E6A75] font-medium">{t}</div>
                  <div className="text-[28px] font-bold mt-1" data-agent={`workday-balance-${BAL_KEY[t]}`}>
                    {fmtDays(me?.balances?.[BAL_KEY[t]] ?? 0)}
                  </div>
                  <div className="text-[12px] text-[#5E6A75] mt-1">{t === 'Vacation' ? 'Accrues 1.25 days / month · Carryover max 5' : t === 'Sick' ? 'Annual grant · Resets Jan 1' : 'Resets Jan 1'}</div>
                </div>
              ))}
            </div>
          </Card>
          <Card title="My Time Off" action={<Btn variant="primary" size="sm" agent="workday-timeoff-new-2" onClick={() => nav({ page: 'timeoff-request' })}>Request Time Off</Btn>}>
            <table className="w-full text-[14px]">
              <thead>
                <tr className="text-left text-[12.5px] text-[#5E6A75] bg-[#F6F7F8] border-y border-[#E8EBED]">
                  <th className="font-bold px-6 h-10">Date</th>
                  <th className="font-bold">Type</th>
                  <th className="font-bold">Requested</th>
                  <th className="font-bold">Status</th>
                  <th className="font-bold">Comment</th>
                </tr>
              </thead>
              <tbody>
                {reqs.map((r) => {
                  const first = r.days[0]?.date
                  const last = r.days[r.days.length - 1]?.date
                  return (
                    <tr key={r.id} data-agent={`workday-timeoff-row-${r.id}`} onClick={() => nav({ page: 'timeoff-detail', requestId: r.id })} className={`border-b border-[#F0F1F2] hover:bg-[#F6F7F8] ${r.createdBy === 'hworker' ? 'flash-new' : ''}`}>
                      <td className="px-6 h-12 text-[#0875E1] font-bold">
                        {fmtMDY(first)}
                        {last !== first ? ` – ${fmtMDY(last)}` : ''}
                      </td>
                      <td>{r.type}</td>
                      <td>{fmtDays(r.totalDays)}</td>
                      <td>
                        <Pill tone={toneOf(r.status)}>{r.status === 'Submitted' ? 'Submitted' : r.status}</Pill>
                        {r.createdBy === 'hworker' && <span className="ml-2"><HWorkerChip /></span>}
                      </td>
                      <td className="text-[#5E6A75] truncate max-w-[220px]">{r.comment}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </Card>
          </>
          )}
        </div>
      </div>
      {(dlg === 'cancel' || dlg === 'correct') && (
        <PickRequestModal
          mode={dlg}
          reqs={reqs}
          onClose={() => setDlg(null)}
          onDone={(m) => {
            setDlg(null)
            setMsg(m)
          }}
          isAgent={isAgent}
        />
      )}
      {dlg === 'absence' && (
        <AbsenceModal
          onClose={() => setDlg(null)}
          onDone={(m) => {
            setDlg(null)
            setMsg(m)
          }}
        />
      )}
    </div>
  )
}

function BalanceByPeriod({ me, reqs, onBack }: { me: any; reqs: any[]; onBack: () => void }) {
  const y = new Date().getFullYear()
  const taken = (type: string) => reqs.filter((r) => r.type === type && (r.status === 'Approved' || r.status === 'Submitted') && r.days[0]?.date.startsWith(String(y))).reduce((n, r) => n + r.totalDays, 0)
  return (
    <Card title={`Time Off Balance by Period · ${y}`} action={<Btn size="sm" variant="tertiary" onClick={onBack}>Back to Overview</Btn>}>
      <table className="w-full text-[14px]">
        <thead>
          <tr className="text-left text-[12.5px] text-[#5E6A75] bg-[#F6F7F8] border-y border-[#E8EBED]">
            <th className="px-6 h-10 font-bold">Plan</th>
            <th className="font-bold text-right">Beginning Balance</th>
            <th className="font-bold text-right">Accrued</th>
            <th className="font-bold text-right">Taken / Requested</th>
            <th className="font-bold text-right pr-6">Ending Balance</th>
          </tr>
        </thead>
        <tbody>
          {TYPES.map((t) => {
            const end = me?.balances?.[BAL_KEY[t]] ?? 0
            const used = taken(t)
            const accrued = t === 'Vacation' ? 13.75 : t === 'Sick' ? 7 : 2
            const begin = Math.round((end + used - accrued) * 10) / 10
            return (
              <tr key={t} className="border-b border-[#F0F1F2]">
                <td className="px-6 h-12 font-bold">{t}</td>
                <td className="text-right">{fmtDays(Math.max(0, begin))}</td>
                <td className="text-right">{fmtDays(accrued)}</td>
                <td className="text-right">{fmtDays(used)}</td>
                <td className="text-right pr-6 font-bold">{fmtDays(end)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </Card>
  )
}

function HolidayCalendar({ onBack }: { onBack: () => void }) {
  const [y, setY] = useState(new Date().getFullYear())
  const list = Object.entries(holidays(y)).sort(([a], [b]) => a.localeCompare(b))
  return (
    <Card
      title={`Holiday Calendar · Northwind US ${y}`}
      action={
        <div className="flex items-center gap-1">
          <button aria-label="Previous year" onClick={() => setY(y - 1)} className="w-8 h-8 rounded-full hover:bg-[#F0F1F2] flex items-center justify-center">
            <ChevronLeft size={18} />
          </button>
          <button aria-label="Next year" onClick={() => setY(y + 1)} className="w-8 h-8 rounded-full hover:bg-[#F0F1F2] flex items-center justify-center">
            <ChevronRight size={18} />
          </button>
          <Btn size="sm" variant="tertiary" onClick={onBack}>Back to Overview</Btn>
        </div>
      }
    >
      <table className="w-full text-[14px]">
        <tbody>
          {list.map(([d, n]) => (
            <tr key={d} className={`border-t border-[#F0F1F2] ${d < isoDate(new Date()) ? 'text-[#5E6A75]' : ''}`}>
              <td className="px-6 h-11 w-[160px] font-bold">{fmtMDY(d)}</td>
              <td className="w-[140px]">{new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' })}</td>
              <td>{n}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

function PickRequestModal({ mode, reqs, onClose, onDone, isAgent }: { mode: 'cancel' | 'correct'; reqs: any[]; onClose: () => void; onDone: (m: string) => void; isAgent: boolean }) {
  const list = reqs.filter(cancellable)
  const [sel, setSel] = useState(list[0]?.id ?? '')
  const r = list.find((x) => x.id === sel)
  const [type, setType] = useState(r?.type ?? 'Vacation')
  const [comment, setComment] = useState(r?.comment ?? '')
  const pick = (id: string) => {
    setSel(id)
    const x = list.find((q) => q.id === id)
    setType(x?.type ?? 'Vacation')
    setComment(x?.comment ?? '')
  }
  const go = () => {
    if (!r) return
    if (mode === 'cancel') {
      cancelTimeOff(r, isAgent)
      onDone(`Time off request ${r.id.toUpperCase()} canceled. ${fmtDays(r.totalDays)} returned to your ${r.type} balance.`)
    } else {
      const from = BAL_KEY[r.type]
      const to = BAL_KEY[type]
      if (from !== to) {
        db.update('workday.workers', r.workerId, (w) => ({ balances: { ...w.balances, [from]: Math.round(((w.balances?.[from] ?? 0) + r.totalDays) * 10) / 10, [to]: Math.round(((w.balances?.[to] ?? 0) - r.totalDays) * 10) / 10 } }))
      }
      db.update('workday.timeoff', r.id, { type, comment, correctedAt: new Date().toISOString() })
      onDone(`Time off request ${r.id.toUpperCase()} corrected.`)
    }
  }
  return (
    <Modal
      title={mode === 'cancel' ? 'Cancel Time Off' : 'Correct My Time Off'}
      onClose={onClose}
      footer={
        <>
          <Btn variant="primary" disabled={!r} onClick={go}>
            {mode === 'cancel' ? 'Cancel Request' : 'Submit'}
          </Btn>
          <Btn onClick={onClose}>Close</Btn>
        </>
      }
    >
      {list.length === 0 ? (
        <div className="text-[#5E6A75]">You have no upcoming time off that can be {mode === 'cancel' ? 'canceled' : 'corrected'}.</div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            {list.map((x) => (
              <label key={x.id} className={`flex items-center gap-3 px-4 h-12 rounded-xl border cursor-pointer ${sel === x.id ? 'border-[#0875E1] bg-[#F2F8FE]' : 'border-[#E8EBED]'}`}>
                <input type="radio" name="req" checked={sel === x.id} onChange={() => pick(x.id)} className="accent-[#0875E1]" />
                <span className="flex-1">
                  <b>{x.type}</b> · {fmtMDY(x.days[0].date)}
                  {x.days.length > 1 ? ` – ${fmtMDY(x.days[x.days.length - 1].date)}` : ''} · {fmtDays(x.totalDays)}
                </span>
                <Pill tone={toneOf(x.status)}>{x.status}</Pill>
              </label>
            ))}
          </div>
          {mode === 'correct' && r && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[14px] font-medium mb-1.5">Type</div>
                <select aria-label="Corrected time off type" value={type} onChange={(e) => setType(e.target.value)} className={inputCls}>
                  {TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <div className="text-[14px] font-medium mb-1.5">Comment</div>
                <input aria-label="Corrected comment" value={comment} onChange={(e) => setComment(e.target.value)} className={inputCls} />
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}

const LEAVES = ['Parental Leave', 'Medical Leave (FMLA)', 'Personal Leave', 'Military Leave', 'Bereavement Leave']

function AbsenceModal({ onClose, onDone }: { onClose: () => void; onDone: (m: string) => void }) {
  const { isAgent } = useDesk()
  const [type, setType] = useState('')
  const [first, setFirst] = useState(isoDate(new Date(Date.now() + 14 * 864e5)))
  const [last, setLast] = useState(isoDate(new Date(Date.now() + 28 * 864e5)))
  const [reason, setReason] = useState('')
  const [err, setErr] = useState('')
  const submit = () => {
    if (!type) return setErr('Leave Type is required.')
    if (!first || !last || last < first) return setErr('Enter a valid first and last day of leave.')
    const id = `lv-${Math.floor(1000 + Math.random() * 9000)}`
    db.insert('workday.leaves', { id, workerId: 'wd-alex', type, first, last, reason, status: 'Submitted', submittedAt: new Date().toISOString(), createdBy: isAgent ? 'hworker' : undefined })
    db.insert(
      'workday.tasks',
      { id: uid('wt'), assignee: ME.managerId ?? 'priya', title: `Leave of Absence: ${ME.name} — ${type}`, process: 'Request Leave of Absence', step: 'Approval by Manager', fromId: ME.id, receivedAt: new Date().toISOString(), due: new Date(Date.now() + 3 * 864e5).toISOString(), status: 'open', createdBy: isAgent ? 'hworker' : undefined },
      { prepend: true },
    )
    onDone(`${type} request submitted for ${fmtMDY(first)} – ${fmtMDY(last)}. Up next: approval by ${person(ME.managerId ?? 'priya').name}, then the Leave Partner.`)
  }
  return (
    <Modal
      title="Request Absence"
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
      {err && <div className="rounded-lg border border-[#DE2E21] bg-[#FDE2E0] px-4 py-2.5 text-[13.5px] text-[#A31B12] font-medium mb-3">{err}</div>}
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <div className="text-[14px] font-medium mb-1.5">
            Leave Type<span className="text-[#DE2E21]">*</span>
          </div>
          <select aria-label="Leave type" value={type} onChange={(e) => (setType(e.target.value), setErr(''))} className={inputCls}>
            <option value="">select one</option>
            {LEAVES.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </div>
        <div>
          <div className="text-[14px] font-medium mb-1.5">First Day of Leave</div>
          <input type="date" aria-label="First day of leave" value={first} onChange={(e) => setFirst(e.target.value)} className={inputCls} />
        </div>
        <div>
          <div className="text-[14px] font-medium mb-1.5">Estimated Last Day of Leave</div>
          <input type="date" aria-label="Last day of leave" value={last} onChange={(e) => setLast(e.target.value)} className={inputCls} />
        </div>
        <div className="col-span-2">
          <div className="text-[14px] font-medium mb-1.5">Reason</div>
          <textarea aria-label="Leave reason" value={reason} onChange={(e) => setReason(e.target.value)} className="w-full h-20 px-3 py-2 rounded-md border border-[#A1AAB3] outline-none focus:border-[#0875E1] text-[14px] resize-none" />
        </div>
      </div>
    </Modal>
  )
}

/* ─────────────── Request Time Off (calendar) ─────────────── */

export function RequestTimeOff({ nav }: { nav: Nav }) {
  const me = useMe()
  const { isAgent } = useDesk()
  const reqs = useCollection<any>('workday.timeoff').filter((r) => r.workerId === 'wd-alex')
  const [month, setMonth] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [sel, setSel] = useState<string[]>([])
  const [modal, setModal] = useState(false)
  const [type, setType] = useState('')
  const [comment, setComment] = useState('')
  const [err, setErr] = useState('')
  const [calView, setCalView] = useState<'month' | 'week'>('month')
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - d.getDay())
    return d
  })
  const [byPeriod, setByPeriod] = useState(false)
  const [files, setFiles] = useState<string[]>([])

  const taken = useMemo(() => {
    const m: Record<string, { type: string; status: string }> = {}
    for (const r of reqs) for (const d of r.days) if (d.hours > 0) m[d.date] = { type: r.type, status: r.status }
    return m
  }, [reqs])

  const cells = useMemo(() => {
    if (calView === 'week') return Array.from({ length: 7 }, (_, i) => new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i))
    const start = new Date(month)
    start.setDate(1 - start.getDay())
    return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i))
  }, [month, calView, weekStart])
  const shift = (dir: 1 | -1) => {
    if (calView === 'week') {
      const n = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 7 * dir)
      setWeekStart(n)
      setMonth(new Date(n.getFullYear(), n.getMonth(), 1))
    } else setMonth(new Date(month.getFullYear(), month.getMonth() + dir, 1))
  }
  const hol = holidays(month.getFullYear())

  const toggle = (iso: string) => setSel((s) => (s.includes(iso) ? s.filter((x) => x !== iso) : [...s, iso].sort()))
  const charged = sel.reduce((n, d) => n + chargeHours(d), 0)
  const days = charged / 8
  const bal = type ? me?.balances?.[BAL_KEY[type]] ?? 0 : me?.balances?.vacation ?? 0

  const submit = () => {
    if (!type) {
      setErr('Type is required. Select a time off type.')
      return
    }
    const id = `to-${Math.floor(2000 + Math.random() * 7000)}`
    const rec = {
      id,
      workerId: 'wd-alex',
      type,
      days: sel.map((d) => ({ date: d, hours: chargeHours(d) })),
      totalDays: days,
      comment,
      status: 'Submitted',
      submittedAt: new Date().toISOString(),
      approverId: ME.managerId ?? 'priya',
      createdBy: isAgent ? 'hworker' : undefined,
      ...(files.length ? { attachments: files } : {}),
    }
    db.insert('workday.timeoff', rec)
    db.update('workday.workers', 'wd-alex', (w) => ({ balances: { ...w.balances, [BAL_KEY[type]]: Math.round(((w.balances?.[BAL_KEY[type]] ?? 0) - days) * 10) / 10 } }))
    db.insert(
      'workday.tasks',
      {
        id: uid('wt'),
        assignee: ME.managerId ?? 'priya',
        title: `Time Off Request: ${ME.name} (${fmtDays(days).toLowerCase()})`,
        process: 'Request Time Off',
        step: 'Approval by Manager',
        fromId: ME.id,
        receivedAt: new Date().toISOString(),
        due: new Date(Date.now() + 3 * 864e5).toISOString(),
        status: 'open',
        link: { page: 'timeoff', requestId: id },
        createdBy: isAgent ? 'hworker' : undefined,
      },
      { prepend: true },
    )
    setModal(false)
    nav({ page: 'timeoff-done', requestId: id })
  }

  const range = sel.length ? `${fmtMDY(sel[0])}${sel.length > 1 ? ` - ${fmtMDY(sel[sel.length - 1])}` : ''}` : ''

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 overflow-auto">
        <div className="max-w-[1280px] mx-auto px-10 py-7">
          <div className="flex items-start gap-4 mb-6">
            <div className="flex-1">
              <h1 className="text-[28px] font-bold leading-tight">Request Time Off</h1>
              <div className="text-[14px] text-[#5E6A75] mt-1 flex items-center gap-2">
                <Avatar id={ME.id} size={22} /> {ME.name}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-[280px_minmax(0,1fr)] gap-6">
            <div className="space-y-5">
              <div className="bg-white rounded-2xl border border-[#E8EBED] p-5">
                <div className="text-[15px] font-bold">Balance as of {fmtMDY(isoDate(new Date()))}</div>
                <div className="text-[12.5px] text-[#5E6A75] mt-0.5">Includes submitted and approved requests</div>
                <div className="mt-4 space-y-3">
                  {TYPES.map((t) => (
                    <div key={t} className="flex items-center justify-between">
                      <span className="text-[14px]">{t}</span>
                      <span className="text-[14px] font-bold" data-agent={`workday-req-balance-${BAL_KEY[t]}`}>
                        {fmtDays(me?.balances?.[BAL_KEY[t]] ?? 0)}
                      </span>
                    </div>
                  ))}
                </div>
                <button onClick={() => setByPeriod((b) => !b)} className="mt-4 text-[13px] font-bold text-[#0875E1] hover:underline">
                  {byPeriod ? 'Hide Balance by Period' : 'View Balance by Period'}
                </button>
                {byPeriod && (
                  <div className="mt-3 rounded-lg bg-[#F6F7F8] p-3 text-[12.5px] space-y-1">
                    {[0, 1, 2].map((i) => {
                      const d = new Date(new Date().getFullYear(), new Date().getMonth() + i + 1, 0)
                      const v = (me?.balances?.vacation ?? 0) + 1.25 * i
                      return (
                        <div key={i} className="flex justify-between">
                          <span>Vacation as of {fmtMDY(isoDate(d))}</span>
                          <b>{fmtDays(Math.round(v * 100) / 100)}</b>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
              <div className="bg-white rounded-2xl border border-[#E8EBED] p-5">
                <div className="text-[15px] font-bold mb-3">Legend</div>
                {[
                  ['#0875E1', 'Selected'],
                  ['#F38B00', 'Submitted'],
                  ['#319C4C', 'Approved'],
                  ['#8660D9', 'Holiday'],
                  ['#CED3D9', 'Weekend'],
                ].map(([c, l]) => (
                  <div key={l} className="flex items-center gap-2.5 text-[13.5px] py-1">
                    <span className="w-3.5 h-3.5 rounded" style={{ background: c }} /> {l}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#E8EBED] p-5 min-w-0">
              <div className="flex items-center gap-2 mb-4">
                <Btn
                  size="sm"
                  onClick={() => {
                    const t = new Date()
                    t.setHours(0, 0, 0, 0)
                    setMonth(new Date(t.getFullYear(), t.getMonth(), 1))
                    setWeekStart(new Date(t.getFullYear(), t.getMonth(), t.getDate() - t.getDay()))
                  }}
                >
                  Today
                </Btn>
                <button data-agent="workday-cal-prev" aria-label="Previous month" onClick={() => shift(-1)} className="w-8 h-8 rounded-full hover:bg-[#F0F1F2] flex items-center justify-center">
                  <ChevronLeft size={18} />
                </button>
                <button data-agent="workday-cal-next" aria-label="Next month" onClick={() => shift(1)} className="w-8 h-8 rounded-full hover:bg-[#F0F1F2] flex items-center justify-center">
                  <ChevronRight size={18} />
                </button>
                <div className="text-[20px] font-bold ml-2" data-agent="workday-cal-month">
                  {calView === 'week'
                    ? `${cells[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${cells[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                    : month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </div>
                <div className="flex-1" />
                <div className="flex rounded-full border border-[#A1AAB3] overflow-hidden text-[13px] font-bold">
                  <button
                    onClick={() => setCalView('month')}
                    className={`px-4 h-8 flex items-center ${calView === 'month' ? 'bg-[#333] text-white' : 'hover:bg-[#F0F1F2]'}`}
                  >
                    Month
                  </button>
                  <button
                    onClick={() => {
                      if (calView !== 'week') {
                        const t = new Date()
                        const base = t.getMonth() === month.getMonth() && t.getFullYear() === month.getFullYear() ? t : month
                        setWeekStart(new Date(base.getFullYear(), base.getMonth(), base.getDate() - base.getDay()))
                      }
                      setCalView('week')
                    }}
                    className={`px-4 h-8 flex items-center ${calView === 'week' ? 'bg-[#333] text-white' : 'hover:bg-[#F0F1F2]'}`}
                  >
                    Week
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-7 border-t border-l border-[#E8EBED]">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                  <div key={d} className="h-9 flex items-center justify-center text-[12.5px] font-bold text-[#5E6A75] border-r border-b border-[#E8EBED] bg-[#F6F7F8]">
                    {d}
                  </div>
                ))}
                {cells.map((d) => {
                  const iso = isoDate(d)
                  const inMonth = calView === 'week' || d.getMonth() === month.getMonth()
                  const isSel = sel.includes(iso)
                  const h = hol[iso] ?? holidayName(iso)
                  const wk = isWeekend(iso)
                  const t = taken[iso]
                  const isToday = iso === isoDate(new Date())
                  return (
                    <button
                      key={iso}
                      data-agent={`workday-cal-day-${iso}`}
                      aria-label={d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                      aria-pressed={isSel}
                      onClick={() => toggle(iso)}
                      className={`relative ${calView === 'week' ? 'h-[220px]' : 'h-[92px]'} p-1.5 text-left align-top border-r border-b border-[#E8EBED] flex flex-col ${isSel ? 'bg-[#D7EAFC]' : wk ? 'bg-[#F6F7F8]' : 'bg-white hover:bg-[#F6F7F8]'} ${inMonth ? '' : 'opacity-45'}`}
                    >
                      {isSel && <span className="absolute inset-0 border-2 border-[#0875E1] pointer-events-none" />}
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[13px] ${isToday ? 'bg-[#0875E1] text-white font-bold' : isSel ? 'font-bold text-[#005CB9]' : 'text-[#333]'}`}>{d.getDate()}</span>
                      {h && <span className="mt-auto text-[11px] font-bold rounded px-1.5 py-0.5 bg-[#EEE7FB] text-[#5B3BA8] truncate">{h}</span>}
                      {t && !h && (
                        <span className={`mt-auto text-[11px] font-bold rounded px-1.5 py-0.5 truncate ${t.status === 'Approved' ? 'bg-[#DFF6E3] text-[#1E6F34]' : 'bg-[#FFEFD6] text-[#9C4F00]'}`}>
                          {t.type} · 8 Hours
                        </span>
                      )}
                      {isSel && !h && !t && <span className="mt-auto text-[11px] font-bold rounded px-1.5 py-0.5 bg-[#0875E1] text-white truncate">{wk ? 'Weekend' : 'Selected'}</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* sticky footer */}
      <div className="shrink-0 h-[68px] bg-white border-t border-[#DFE2E6] flex items-center gap-3 px-10 shadow-[0_-2px_8px_rgba(0,0,0,0.04)]">
        <Btn variant="primary" agent="workday-timeoff-request" disabled={!sel.length} onClick={() => setModal(true)}>
          Request Time Off
        </Btn>
        <Btn onClick={() => nav({ page: 'timeoff' })}>Cancel</Btn>
        {sel.length > 0 && (
          <>
            <span className="text-[14px] text-[#5E6A75] ml-3">
              {sel.length} {sel.length === 1 ? 'day' : 'days'} selected · {range}
            </span>
            <button onClick={() => setSel([])} className="text-[14px] font-bold text-[#0875E1] hover:underline ml-2">
              Clear Selection
            </button>
          </>
        )}
      </div>

      {modal && (
        <div className="absolute inset-0 z-30 bg-black/30 flex items-start justify-center pt-10">
          <div className="w-[760px] max-h-[calc(100%-60px)] overflow-auto bg-white rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.3)]" data-agent="workday-timeoff-modal">
            <div className="flex items-center justify-between px-7 pt-6">
              <h2 className="text-[22px] font-bold">Request Time Off</h2>
              <button onClick={() => setModal(false)} aria-label="Close" className="w-9 h-9 rounded-full hover:bg-[#F0F1F2] flex items-center justify-center">
                <X size={20} />
              </button>
            </div>
            <div className="px-7 pt-4 pb-2 space-y-4">
              {err && <div className="rounded-lg border border-[#DE2E21] bg-[#FDE2E0] px-4 py-2.5 text-[13.5px] text-[#A31B12] font-medium">{err}</div>}
              <div className="grid grid-cols-[180px_1fr] gap-y-4 items-center text-[14px]">
                <div className="font-medium">Selected Dates</div>
                <div className="font-bold">{range}</div>
                <div className="font-medium">
                  Type<span className="text-[#DE2E21]">*</span>
                </div>
                <select
                  data-agent="workday-timeoff-type"
                  aria-label="Time off type"
                  value={type}
                  onChange={(e) => {
                    setType(e.target.value)
                    setErr('')
                  }}
                  className={inputCls}
                >
                  <option value="">select one</option>
                  {TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="rounded-xl border border-[#E8EBED] overflow-hidden">
                <table className="w-full text-[13.5px]">
                  <thead>
                    <tr className="bg-[#F6F7F8] text-left text-[12.5px] text-[#5E6A75]">
                      <th className="px-4 h-9 font-bold">Date</th>
                      <th className="font-bold">Day of the Week</th>
                      <th className="font-bold">Type</th>
                      <th className="font-bold text-right pr-4">Quantity</th>
                      <th className="font-bold">Unit of Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sel.map((d) => {
                      const h = chargeHours(d)
                      return (
                        <tr key={d} className="border-t border-[#F0F1F2]">
                          <td className="px-4 h-10">{fmtMDY(d)}</td>
                          <td>{new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' })}</td>
                          <td className="text-[#5E6A75]">{holidayName(d) ? `Holiday — ${holidayName(d)}` : isWeekend(d) ? 'Non-working day' : type || '—'}</td>
                          <td className="text-right pr-4 font-bold">{h}</td>
                          <td>Hours</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center gap-8 rounded-xl bg-[#F6F7F8] px-5 py-3 text-[14px]">
                <div>
                  <div className="text-[12.5px] text-[#5E6A75]">Total</div>
                  <div className="font-bold">
                    {charged} Hours ({fmtDays(days)})
                  </div>
                </div>
                <div>
                  <div className="text-[12.5px] text-[#5E6A75]">{type || 'Vacation'} balance</div>
                  <div className="font-bold">{fmtDays(bal)}</div>
                </div>
                <div>
                  <div className="text-[12.5px] text-[#5E6A75]">Balance after request</div>
                  <div className="font-bold text-[#005CB9]" data-agent="workday-balance-after">
                    {fmtDays(Math.round((bal - days) * 10) / 10)}
                  </div>
                </div>
              </div>
              <div>
                <div className="text-[14px] font-medium mb-1.5">Comment</div>
                <textarea data-agent="workday-timeoff-comment" aria-label="Comment" value={comment} onChange={(e) => setComment(e.target.value)} className="w-full h-24 px-3 py-2 rounded-md border border-[#A1AAB3] outline-none focus:border-[#0875E1] text-[14px] resize-none" />
              </div>
              <div>
                <div className="text-[14px] font-medium mb-1.5">Attachments</div>
                <label
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    const names = Array.from(e.dataTransfer.files).map((f) => f.name)
                    if (names.length) setFiles((fs) => [...fs, ...names])
                  }}
                  className="h-16 rounded-lg border-2 border-dashed border-[#CED3D9] flex items-center justify-center text-[13.5px] text-[#5E6A75] gap-2 cursor-pointer hover:bg-[#F6F7F8]"
                >
                  <Paperclip size={16} /> Drop files here or <span className="text-[#0875E1] font-bold">Select files</span>
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const names = Array.from(e.target.files ?? []).map((f) => f.name)
                      if (names.length) setFiles((fs) => [...fs, ...names])
                      e.target.value = ''
                    }}
                  />
                </label>
                {files.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {files.map((f, i) => (
                      <div key={f + i} className="flex items-center gap-2 text-[13.5px]">
                        <Paperclip size={14} className="text-[#5E6A75]" /> <span className="flex-1">{f}</span>
                        <button aria-label={`Remove ${f}`} onClick={() => setFiles((fs) => fs.filter((_, j) => j !== i))} className="text-[#5E6A75] hover:text-[#DE2E21]">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 px-7 py-5 border-t border-[#E8EBED] mt-3">
              <Btn variant="primary" agent="workday-timeoff-submit" onClick={submit}>
                Submit
              </Btn>
              <Btn onClick={() => setModal(false)}>Cancel</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─────────────── Success page ─────────────── */

export function TimeOffDone({ nav, requestId }: { nav: Nav; requestId: string }) {
  const r = useRecord<any>('workday.timeoff', requestId)
  if (!r) return null
  const mgr = person(r.approverId)
  return (
    <div className="max-w-[920px] mx-auto px-10 py-10">
      <div className="bg-white rounded-2xl border border-[#E8EBED] shadow-[0_1px_4px_rgba(31,38,46,0.08)] overflow-hidden" data-agent="workday-timeoff-success">
        <div className="flex items-center gap-4 px-8 py-7 bg-[#EAF7EE] border-b border-[#CDEBD5]">
          <CheckCircle2 size={44} className="text-[#319C4C]" />
          <div>
            <div className="text-[24px] font-bold text-[#1E6F34]">Successfully submitted</div>
            <div className="text-[14px] text-[#333]">
              Time Off Request: {ME.name} — {fmtDays(r.totalDays)} {r.type}
            </div>
          </div>
          {r.createdBy === 'hworker' && <span className="ml-auto"><HWorkerChip text="Submitted by H-Worker" /></span>}
        </div>
        <div className="px-8 py-6">
          <div className="text-[13px] font-bold text-[#5E6A75] uppercase tracking-wide mb-3">Up Next</div>
          <div className="flex items-center gap-4 p-4 rounded-xl border border-[#E8EBED]">
            <Avatar id={mgr.id} size={44} />
            <div className="flex-1">
              <div className="text-[15px] font-bold">{mgr.name}</div>
              <div className="text-[13px] text-[#5E6A75]">Approval by Manager · {mgr.title}</div>
            </div>
            <Pill tone="orange">Awaiting Action</Pill>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-6 text-[14px]">
            <div>
              <div className="text-[12.5px] text-[#5E6A75]">Dates</div>
              <div className="font-bold">
                {fmtLong(r.days[0].date)} – {fmtLong(r.days[r.days.length - 1].date)}
              </div>
            </div>
            <div>
              <div className="text-[12.5px] text-[#5E6A75]">Total</div>
              <div className="font-bold">
                {r.totalDays * 8} Hours ({fmtDays(r.totalDays)})
              </div>
            </div>
            <div>
              <div className="text-[12.5px] text-[#5E6A75]">Comment</div>
              <div className="font-bold truncate">{r.comment || '—'}</div>
            </div>
          </div>
        </div>
        <div className="flex gap-3 px-8 py-5 border-t border-[#E8EBED]">
          <Btn variant="primary" agent="workday-timeoff-view" onClick={() => nav({ page: 'timeoff-detail', requestId })}>
            View Details
          </Btn>
          <Btn agent="workday-done" onClick={() => nav({ page: 'home' })}>
            Done
          </Btn>
        </div>
      </div>
    </div>
  )
}

/* ─────────────── Request details ─────────────── */

export function TimeOffDetail({ nav, requestId }: { nav: Nav; requestId: string }) {
  const r = useRecord<any>('workday.timeoff', requestId)
  const { isAgent } = useDesk()
  const [confirm, setConfirm] = useState(false)
  if (!r) return <div className="p-10 text-[14px] text-[#5E6A75]">Request not found.</div>
  const w = db.find<any>('workday.workers', r.workerId)
  const mgr = person(r.approverId)
  const approved = r.status === 'Approved'
  const closed = r.status === 'Canceled' || r.status === 'Denied' || r.status === 'Sent Back'
  const steps = [
    { step: 'Initiation', who: w?.name ?? '', status: 'Successfully Completed', at: r.submittedAt, icon: 'done' },
    { step: 'Approval by Manager', who: mgr.name, status: approved ? 'Approved' : closed && r.status !== 'Canceled' ? r.status : r.status === 'Canceled' ? 'Canceled by Worker' : 'Awaiting Action', at: approved ? r.submittedAt : r.decidedAt ?? r.canceledAt ?? null, icon: approved ? 'done' : closed ? 'todo' : 'wait' },
    { step: 'Notification to Time Off Partner', who: 'Time Off Partner — Northwind US', status: approved ? 'Successfully Completed' : closed ? 'Not Required' : 'Not Started', at: null, icon: approved ? 'done' : 'todo' },
  ]
  return (
    <div className="max-w-[1100px] mx-auto px-10 py-8" data-agent="workday-timeoff-detail">
      <button onClick={() => nav({ page: 'timeoff' })} className="text-[14px] font-bold text-[#0875E1] hover:underline mb-3 flex items-center gap-1">
        <ChevronLeft size={16} /> Time Off and Leave
      </button>
      <div className="flex items-start gap-4 mb-6">
        <AppIcon icon={<CalendarDays size={22} />} color="#0875E1" size={48} />
        <div className="flex-1">
          <h1 className="text-[26px] font-bold leading-tight">Time Off Request: {w?.name}</h1>
          <div className="text-[14px] text-[#5E6A75] mt-1 flex items-center gap-2">
            Request ID {r.id.toUpperCase()} · Submitted {new Date(r.submittedAt).toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
            {r.createdBy === 'hworker' && <HWorkerChip text="Submitted via H-Worker" />}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {r.workerId === 'wd-alex' && cancellable(r) && (
            <Btn size="sm" agent="workday-timeoff-cancel" onClick={() => setConfirm(true)}>
              Cancel Request
            </Btn>
          )}
          <Pill tone={approved ? 'green' : closed ? 'gray' : 'orange'}>{approved ? 'Successfully Completed' : closed ? r.status : 'In Progress'}</Pill>
        </div>
      </div>
      {confirm && (
        <Modal
          title="Cancel Time Off Request"
          onClose={() => setConfirm(false)}
          footer={
            <>
              <Btn
                variant="primary"
                onClick={() => {
                  cancelTimeOff(r, isAgent)
                  setConfirm(false)
                }}
              >
                Cancel Request
              </Btn>
              <Btn onClick={() => setConfirm(false)}>Keep Request</Btn>
            </>
          }
        >
          Cancel your {r.type} request for {fmtMDY(r.days[0].date)}
          {r.days.length > 1 ? ` – ${fmtMDY(r.days[r.days.length - 1].date)}` : ''}? {fmtDays(r.totalDays)} will be returned to your balance and {mgr.name} will be notified.
        </Modal>
      )}
      <div className="grid grid-cols-[minmax(0,1fr)_340px] gap-6">
        <Card title="Details">
          <div className="grid grid-cols-2 gap-x-8 gap-y-4 px-6 pb-6 text-[14px]">
            {[
              ['Worker', w?.name],
              ['Time Off Type', r.type],
              ['Dates', `${fmtMDY(r.days[0].date)} – ${fmtMDY(r.days[r.days.length - 1].date)}`],
              ['Total', `${r.totalDays * 8} Hours (${fmtDays(r.totalDays)})`],
              ['Status', r.status],
              ['Comment', r.comment || '—'],
              ...(r.decisionComment ? [['Approver Comment', r.decisionComment]] : []),
              ...(r.attachments?.length ? [['Attachments', r.attachments.join(', ')]] : []),
            ].map(([k, v]) => (
              <div key={k}>
                <div className="text-[12.5px] text-[#5E6A75]">{k}</div>
                <div className="font-medium">{v}</div>
              </div>
            ))}
          </div>
          <table className="w-full text-[13.5px]">
            <thead>
              <tr className="bg-[#F6F7F8] text-left text-[12.5px] text-[#5E6A75] border-y border-[#E8EBED]">
                <th className="px-6 h-9 font-bold">Date</th>
                <th className="font-bold">Day</th>
                <th className="font-bold">Quantity</th>
                <th className="font-bold">Note</th>
              </tr>
            </thead>
            <tbody>
              {r.days.map((d: any) => (
                <tr key={d.date} className="border-b border-[#F0F1F2]">
                  <td className="px-6 h-10">{fmtMDY(d.date)}</td>
                  <td>{new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' })}</td>
                  <td className="font-bold">{d.hours} Hours</td>
                  <td className="text-[#5E6A75]">{holidayName(d.date) ?? (isWeekend(d.date) ? 'Weekend' : '')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card title="Process History">
          <div className="px-6 pb-6">
            {steps.map((s, i) => (
              <div key={s.step} className="flex gap-3 relative pb-5">
                {i < steps.length - 1 && <span className="absolute left-[11px] top-7 bottom-0 w-0.5 bg-[#E8EBED]" />}
                {s.icon === 'done' ? <CheckCircle2 size={24} className="text-[#319C4C] shrink-0" /> : s.icon === 'wait' ? <Clock size={24} className="text-[#F38B00] shrink-0" /> : <CircleDot size={24} className="text-[#CED3D9] shrink-0" />}
                <div className="min-w-0">
                  <div className="text-[14px] font-bold">{s.step}</div>
                  <div className="text-[13px] text-[#5E6A75]">{s.who}</div>
                  <div className={`text-[12.5px] font-bold mt-0.5 ${s.icon === 'wait' ? 'text-[#9C4F00]' : s.icon === 'done' ? 'text-[#1E6F34]' : 'text-[#5E6A75]'}`}>{s.status}</div>
                  {s.at && <div className="text-[12px] text-[#5E6A75]">{new Date(s.at).toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</div>}
                </div>
              </div>
            ))}
            <button onClick={() => nav({ page: 'inbox' })} className="text-[14px] font-bold text-[#0875E1] hover:underline flex items-center gap-1">
              Go to My Tasks <ArrowRight size={16} />
            </button>
          </div>
        </Card>
      </div>
    </div>
  )
}
