import { useEffect, useState } from 'react'
import { Users, Mail, Phone, MapPin, ChevronLeft, MoreHorizontal, UserPlus, MessageSquareHeart, Building2, BadgeDollarSign, Plane, Briefcase, Contact, LayoutGrid, Search, Wallet, HeartPulse, TrendingUp, GraduationCap, UserRound, Award, Pencil } from 'lucide-react'
import { useCollection, useRecord } from '@/db/db'
import { useDesk } from '@/os/context'
import { ME, person } from '@/data/people'
import { money } from '@/data/time'
import { Avatar } from '@/components/Avatar'
import { Btn, Card, HWorkerChip, Pill, AppIcon, Menu, Success } from './ui'
import type { Nav, Route } from './index'
import { fmtDays, fmtLong, fmtMDY } from './util'
import { ChangeJobModal, CompChangeModal, EditContactModal, GiveFeedbackModal, JobReqModal, MoveWorkersModal, TeamCalendarModal } from './More'

type TeamDialog = null | 'feedback' | 'comp' | 'job' | 'req' | 'move' | 'calendar'

function OrgCard({ w, onClick, you, agent }: { w: any; onClick: () => void; you?: boolean; agent?: string }) {
  return (
    <button data-agent={agent} onClick={onClick} className={`w-[210px] bg-white rounded-xl border ${you ? 'border-[#0875E1] shadow-[0_0_0_1px_#0875E1]' : 'border-[#DFE2E6]'} hover:shadow-[0_4px_14px_rgba(0,0,0,0.1)] p-4 flex flex-col items-center text-center ${w.updatedBy === 'hworker' ? 'flash-new' : ''}`}>
      <Avatar id={w.personId} size={56} />
      <div className="text-[14.5px] font-bold mt-2 text-[#0875E1]">{w.name}</div>
      <div className="text-[12.5px] text-[#5E6A75] leading-snug">{w.title}</div>
      {w.status === 'Pre-Hire' ? <span className="mt-2"><Pill tone="orange">Pre-Hire</Pill></span> : w.personId === 'jordan' ? <span className="mt-2"><Pill tone="blue">Starts {fmtMDY(w.hireDate)}</Pill></span> : <div className="text-[12px] text-[#5E6A75] mt-1">{w.location}</div>}
    </button>
  )
}

export function MyTeam({ nav }: { nav: Nav }) {
  const workers = useCollection<any>('workday.workers')
  const me = workers.find((w) => w.id === 'wd-alex')
  const mgr = workers.find((w) => w.id === me?.managerId)
  const team = workers.filter((w) => w.managerId === 'wd-alex')
  const reqs = useCollection<any>('workday.timeoff')
  const [dlg, setDlg] = useState<TeamDialog>(null)
  const [msg, setMsg] = useState('')
  const done = (m: string) => {
    setDlg(null)
    setMsg(m)
  }
  const actions: [string, () => void][] = [
    ['Request Compensation Change', () => setDlg('comp')],
    ['Change Job', () => setDlg('job')],
    ['Create Job Requisition', () => setDlg('req')],
    ['Move Workers (By Organization)', () => setDlg('move')],
    ['Assign Onboarding Plan', () => nav({ page: 'onboarding', workerId: 'wd-jordan' })],
    ['Team Absence Calendar', () => setDlg('calendar')],
  ]
  return (
    <div className="max-w-[1280px] mx-auto px-10 py-8">
      {msg && (
        <div className="mb-5">
          <Success onClose={() => setMsg('')}>{msg}</Success>
        </div>
      )}
      <div className="flex items-center gap-4 mb-7">
        <AppIcon icon={<Users size={22} />} color="#00A3A3" size={48} />
        <div className="flex-1">
          <h1 className="text-[28px] font-bold leading-tight">My Team Management</h1>
          <div className="text-[14px] text-[#5E6A75]">Operations (Alex Morgan) · {team.length} direct reports</div>
        </div>
        <Btn icon={<UserPlus size={16} />} agent="workday-team-hire" onClick={() => nav({ page: 'onboarding', workerId: 'wd-jordan' })}>
          Hire
        </Btn>
        <Btn icon={<MessageSquareHeart size={16} />} agent="workday-team-feedback" onClick={() => setDlg('feedback')}>
          Give Feedback
        </Btn>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_320px] gap-6">
        <div className="space-y-6 min-w-0">
          <Card title="Organization Chart" action={<span className="text-[13px] text-[#5E6A75]">Supervisory Organization · Operations (Alex Morgan)</span>}>
            <div className="px-6 pb-8 pt-2 flex flex-col items-center overflow-x-auto">
              {mgr && <OrgCard w={mgr} onClick={() => nav({ page: 'worker', workerId: mgr.id })} agent={`workday-team-worker-${mgr.id}`} />}
              <span className="w-px h-6 bg-[#A1AAB3]" />
              {me && <OrgCard w={me} you onClick={() => nav({ page: 'worker', workerId: me.id })} agent="workday-team-worker-wd-alex" />}
              <span className="w-px h-6 bg-[#A1AAB3]" />
              <div className="relative flex gap-6 pt-6">
                <span className="absolute top-0 left-[105px] right-[105px] h-px bg-[#A1AAB3]" />
                {team.map((w) => (
                  <div key={w.id} className="relative flex flex-col items-center">
                    <span className="absolute -top-6 w-px h-6 bg-[#A1AAB3]" />
                    <OrgCard w={w} onClick={() => nav({ page: 'worker', workerId: w.id })} agent={`workday-team-worker-${w.id}`} />
                  </div>
                ))}
              </div>
            </div>
          </Card>
          <Card title="Team Members">
            <table className="w-full text-[14px]">
              <thead>
                <tr className="text-left text-[12.5px] text-[#5E6A75] bg-[#F6F7F8] border-y border-[#E8EBED]">
                  <th className="px-6 h-10 font-bold">Worker</th>
                  <th className="font-bold">Business Title</th>
                  <th className="font-bold">Location</th>
                  <th className="font-bold">Hire Date</th>
                  <th className="font-bold">Status</th>
                  <th className="font-bold">Vacation Balance</th>
                </tr>
              </thead>
              <tbody>
                {team.map((w) => (
                  <tr key={w.id} className="border-b border-[#F0F1F2] hover:bg-[#F6F7F8]" onClick={() => nav({ page: 'worker', workerId: w.id })}>
                    <td className="px-6 h-14">
                      <div className="flex items-center gap-3">
                        <Avatar id={w.personId} size={32} />
                        <span className="font-bold text-[#0875E1]">{w.name}</span>
                      </div>
                    </td>
                    <td>{w.title}</td>
                    <td>{w.location}</td>
                    <td>{w.hireDate ? fmtMDY(w.hireDate) : '—'}</td>
                    <td>
                      <Pill tone={w.status === 'Active' ? 'green' : w.status === 'Pre-Hire' ? 'orange' : 'blue'}>{w.status}</Pill>
                    </td>
                    <td>{w.status === 'Active' ? fmtDays(w.balances?.vacation ?? 0) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
        <div className="space-y-6">
          <Card title="Team Time Off">
            <div className="px-6 pb-5 space-y-3">
              {reqs
                .filter((r) => team.some((t) => t.id === r.workerId))
                .map((r) => {
                  const w = workers.find((x) => x.id === r.workerId)
                  return (
                    <button key={r.id} onClick={() => nav({ page: 'timeoff-detail', requestId: r.id })} className="w-full text-left flex items-center gap-3 rounded-xl hover:bg-[#F6F7F8] -mx-2 px-2 py-1">
                      <Avatar id={w?.personId} size={32} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[14px] font-medium">{w?.name}</div>
                        <div className="text-[12.5px] text-[#5E6A75]">
                          {r.type} · {fmtMDY(r.days[0].date)}
                          {r.days.length > 1 ? ` – ${fmtMDY(r.days[r.days.length - 1].date)}` : ''}
                        </div>
                      </div>
                      <Pill tone={r.status === 'Approved' ? 'green' : r.status === 'Denied' || r.status === 'Canceled' || r.status === 'Sent Back' ? 'gray' : 'orange'}>{r.status}</Pill>
                    </button>
                  )
                })}
            </div>
          </Card>
          <Card title="Actions">
            <div className="px-3 pb-3">
              {actions.map(([t, fn], i) => (
                <button key={t} data-agent={`workday-team-action-${i}`} onClick={fn} className="w-full text-left px-3 h-10 rounded-lg hover:bg-[#F6F7F8] text-[14px] font-bold text-[#0875E1]">
                  {t}
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
      {dlg === 'feedback' && <GiveFeedbackModal onClose={() => setDlg(null)} onDone={(n) => done(`Feedback sent to ${n}.`)} />}
      {dlg === 'comp' && <CompChangeModal onClose={() => setDlg(null)} onDone={done} />}
      {dlg === 'job' && <ChangeJobModal onClose={() => setDlg(null)} onDone={done} />}
      {dlg === 'req' && <JobReqModal onClose={() => setDlg(null)} onDone={done} />}
      {dlg === 'move' && <MoveWorkersModal onClose={() => setDlg(null)} onDone={done} />}
      {dlg === 'calendar' && <TeamCalendarModal onClose={() => setDlg(null)} nav={nav} />}
    </div>
  )
}

const TABS = [
  ['summary', 'Summary', LayoutGrid],
  ['job', 'Job', Briefcase],
  ['compensation', 'Compensation', BadgeDollarSign],
  ['timeoff', 'Time Off', Plane],
  ['contact', 'Contact', Contact],
] as const

const MORE_TABS = [
  ['pay', 'Pay', Wallet],
  ['benefits', 'Benefits', HeartPulse],
  ['performance', 'Performance', TrendingUp],
  ['career', 'Career', GraduationCap],
  ['feedback', 'Feedback', MessageSquareHeart],
  ['personal', 'Personal', UserRound],
] as const

export function WorkerProfile({ nav, workerId, initialTab }: { nav: Nav; workerId: string; initialTab?: string }) {
  const w = useRecord<any>('workday.workers', workerId)
  const { open } = useDesk()
  const [tab, setTab] = useState(initialTab ?? 'summary')
  const [menu, setMenu] = useState(false)
  const [dlg, setDlg] = useState<null | 'feedback' | 'comp' | 'job' | 'contact'>(null)
  const [msg, setMsg] = useState('')
  const feedback = useCollection<any>('workday.feedback').filter((f) => f.toWorkerId === workerId)
  const goals = useCollection<any>('workday.goals').filter((g) => g.workerId === workerId)
  const reviews = useCollection<any>('workday.reviews').filter((r) => r.workerId === workerId)
  useEffect(() => setTab(initialTab ?? 'summary'), [workerId, initialTab])
  useEffect(() => setMsg(''), [workerId])
  const onb = useCollection<any>('workday.onboarding').find((o) => o.workerId === workerId)
  const reqs = useCollection<any>('workday.timeoff').filter((r) => r.workerId === workerId)
  const allWorkers = useCollection<any>('workday.workers')
  if (!w) return <div className="p-10">Worker not found.</div>
  const p = person(w.personId)
  const mgr = w.managerId ? person(w.managerId.replace('wd-', '')) : null
  const reports = allWorkers.filter((x) => x.managerId === w.id)
  const done = onb ? onb.tasks.filter((t: any) => t.status === 'Complete').length : 0
  const isMe = w.id === 'wd-alex'
  const isReport = w.managerId === 'wd-alex'
  const canEdit = isMe || isReport
  const finish = (m: string) => {
    setDlg(null)
    setMsg(m)
  }
  const menuItems: { label: string; onClick: () => void }[] = [
    ...(isReport && w.status === 'Active' ? [{ label: 'Change Job', onClick: () => setDlg('job') }] : []),
    ...(isReport && w.compensation ? [{ label: 'Request Compensation Change', onClick: () => setDlg('comp') }] : []),
    ...(!isMe && w.status !== 'Pre-Hire' ? [{ label: 'Give Feedback', onClick: () => setDlg('feedback') }] : []),
    ...(canEdit ? [{ label: 'Edit Contact Information', onClick: () => setDlg('contact') }] : []),
    { label: 'View Goals', onClick: () => nav({ page: 'goals', workerId: w.id } as Route) },
    { label: 'View Team', onClick: () => nav({ page: 'team' }) },
  ]

  return (
    <div className="min-h-full" data-agent="workday-worker-profile">
      <div className="h-[120px]" style={{ background: 'linear-gradient(100deg,#005CB9,#0875E1 55%,#5FA9F2)' }} />
      <div className="max-w-[1280px] mx-auto px-10 -mt-[72px] pb-10 grid grid-cols-[280px_minmax(0,1fr)] gap-6">
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-[#E8EBED] shadow-[0_1px_4px_rgba(31,38,46,0.08)] p-6 flex flex-col items-center text-center">
            <Avatar id={w.personId} size={112} ring="#fff" />
            <div className="text-[22px] font-bold mt-3 leading-tight">{w.name}</div>
            <div className="text-[14px] text-[#5E6A75] mt-1">{w.title}</div>
            <div className="mt-2 flex items-center gap-2 flex-wrap justify-center">
              <Pill tone={w.status === 'Active' ? 'green' : w.status === 'Pre-Hire' ? 'orange' : 'blue'}>{w.status}</Pill>
              {w.updatedBy === 'hworker' && <HWorkerChip text="Updated by H-Worker" />}
            </div>
            <div className="flex gap-2 mt-4 relative">
              <Btn size="sm" icon={<Mail size={14} />} agent="workday-worker-email" onClick={() => open('outlook', { compose: { to: [w.email], subject: '' } })}>
                Email
              </Btn>
              <Btn size="sm" icon={<MoreHorizontal size={14} />} agent="workday-worker-actions" onClick={() => setMenu((m) => !m)}>
                Actions
              </Btn>
              {menu && <Menu items={menuItems} onClose={() => setMenu(false)} className="top-10 right-0" />}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-[#E8EBED] p-2">
            {TABS.map(([k, l, I]) => (
              <button key={k} data-agent={`workday-worker-tab-${k}`} onClick={() => setTab(k)} className={`w-full flex items-center gap-3 px-4 h-11 rounded-xl text-[14px] font-bold ${tab === k ? 'bg-[#D7EAFC] text-[#005CB9]' : 'text-[#333] hover:bg-[#F6F7F8]'}`}>
                <I size={18} /> {l}
              </button>
            ))}
            {MORE_TABS.map(([k, l]) => (
              <button key={k} data-agent={`workday-worker-tab-${k}`} onClick={() => setTab(k)} className={`w-full flex items-center gap-3 px-4 h-10 rounded-xl text-[14px] ${tab === k ? 'bg-[#D7EAFC] text-[#005CB9] font-bold' : 'text-[#5E6A75] hover:bg-[#F6F7F8]'}`}>
                <span className="w-[18px]" /> {l}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-[84px] space-y-6 min-w-0">
          {msg && <Success onClose={() => setMsg('')}>{msg}</Success>}
          {tab === 'summary' && (
            <>
              {onb && (
                <Card title="Onboarding" agent="workday-worker-onboarding" action={<Btn size="sm" agent="workday-worker-open-onboarding" onClick={() => nav({ page: 'onboarding', workerId })}>View Onboarding</Btn>}>
                  <div className="px-6 pb-6">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 h-2.5 rounded-full bg-[#E8EBED] overflow-hidden">
                        <div className="h-full bg-[#319C4C]" style={{ width: `${(done / onb.tasks.length) * 100}%` }} />
                      </div>
                      <span className="text-[13px] font-bold">
                        {done} of {onb.tasks.length} complete
                      </span>
                    </div>
                    <div className="text-[13.5px] text-[#5E6A75] mt-2">
                      Status: <b className="text-[#333]">{onb.status}</b> · Start date {fmtLong(onb.startDate)}
                    </div>
                  </div>
                </Card>
              )}
              <div className="grid grid-cols-2 gap-6">
                <Card title="Job Details">
                  <KV rows={[['Business Title', w.title], ['Supervisory Organization', w.org], ['Manager', mgr?.name ?? '—'], ['Location', w.location], ['Hire Date', w.hireDate ? fmtMDY(w.hireDate) : 'Pending'], ['Employee ID', w.employeeId]]} />
                </Card>
                <Card title="Contact">
                  <div className="px-6 pb-6 space-y-3 text-[14px]">
                    <div className="flex items-center gap-3"><Mail size={16} className="text-[#5E6A75]" /> <button onClick={() => open('outlook', { compose: { to: [w.email], subject: '' } })} className="text-[#0875E1] hover:underline">{w.email}</button></div>
                    <div className="flex items-center gap-3"><Phone size={16} className="text-[#5E6A75]" /> {w.phone}</div>
                    <div className="flex items-center gap-3"><MapPin size={16} className="text-[#5E6A75]" /> {w.location}</div>
                    <div className="flex items-center gap-3"><Building2 size={16} className="text-[#5E6A75]" /> {p.company}</div>
                  </div>
                </Card>
              </div>
              {reports.length > 0 && (
                <Card title={`Team (${reports.length})`}>
                  <div className="px-6 pb-6 flex gap-4 flex-wrap">
                    {reports.map((r) => (
                      <button key={r.id} onClick={() => nav({ page: 'worker', workerId: r.id })} className="flex items-center gap-3 p-3 rounded-xl border border-[#E8EBED] hover:bg-[#F6F7F8] w-[240px] text-left">
                        <Avatar id={r.personId} size={36} />
                        <div className="min-w-0">
                          <div className="text-[14px] font-bold text-[#0875E1] truncate">{r.name}</div>
                          <div className="text-[12.5px] text-[#5E6A75] truncate">{r.title}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </Card>
              )}
            </>
          )}
          {tab === 'job' && (
            <Card title="Job">
              <KV
                rows={[
                  ['Position', `${w.positionId} ${w.title}`],
                  ['Job Profile', w.title],
                  ['Business Title', w.title],
                  ['Employee Type', w.employeeType],
                  ['Time Type', w.timeType],
                  ['Supervisory Organization', w.org],
                  ['Manager', mgr?.name ?? '—'],
                  ['Location', w.location],
                  ['Hire Date', w.hireDate ? fmtLong(w.hireDate) : 'Pending'],
                  ['Cost Center', `CC-${w.dept === 'Operations' ? '4100' : '2200'} ${w.dept}`],
                ]}
              />
            </Card>
          )}
          {tab === 'compensation' && (
            <Card title="Compensation">
              {w.compensation ? (
                <>
                  <div className="grid grid-cols-3 gap-4 px-6 pb-4">
                    <Stat label="Total Base Pay" value={money(w.compensation.base).replace('.00', '')} sub={w.compensation.frequency} />
                    <Stat label="Grade" value={w.compensation.grade} sub={w.compensation.plan} />
                    <Stat label="Bonus Target" value={`${w.compensation.bonusTarget}%`} sub="Annual Incentive Plan" />
                  </div>
                  <KV rows={[['Compensation Package', 'Northwind Salaried — US'], ['Effective Date', w.compensation.effective ? fmtMDY(w.compensation.effective) : w.hireDate ? fmtMDY(w.hireDate) : '—'], ['Pay Group', 'US Semi-Monthly'], ['Currency', 'USD']]} />
                </>
              ) : (
                <div className="px-6 pb-6 text-[14px] text-[#5E6A75]">No compensation assigned yet. Complete the Hire business process to assign compensation.</div>
              )}
              {w.pendingComp && (
                <div className="mx-6 mb-6 rounded-xl border border-[#FFD08A] bg-[#FFF7EA] px-4 py-3 text-[14px]">
                  <b>Pending change:</b> {money(w.pendingComp.base).replace('.00', '')} effective {fmtMDY(w.pendingComp.effective)} · {w.pendingComp.reason} · <span className="text-[#9C4F00] font-bold">{w.pendingComp.status}</span>
                </div>
              )}
              {isReport && w.compensation && (
                <div className="px-6 pb-6 -mt-2">
                  <Btn size="sm" onClick={() => setDlg('comp')}>Request Compensation Change</Btn>
                </div>
              )}
            </Card>
          )}
          {tab === 'timeoff' && (
            <>
              <Card title="Time Off Balance">
                <div className="grid grid-cols-3 gap-4 px-6 pb-6">
                  <Stat label="Vacation" value={fmtDays(w.balances?.vacation ?? 0)} />
                  <Stat label="Sick" value={fmtDays(w.balances?.sick ?? 0)} />
                  <Stat label="Floating Holiday" value={fmtDays(w.balances?.floating ?? 0)} />
                </div>
              </Card>
              <Card title="Time Off Requests">
                <div className="px-6 pb-6 space-y-2">
                  {reqs.length === 0 && <div className="text-[14px] text-[#5E6A75]">No time off requested.</div>}
                  {reqs.map((r) => (
                    <button key={r.id} onClick={() => nav({ page: 'timeoff-detail', requestId: r.id })} className="w-full flex items-center gap-4 p-3 rounded-xl border border-[#E8EBED] hover:bg-[#F6F7F8] text-left">
                      <Plane size={18} className="text-[#0875E1]" />
                      <div className="flex-1 text-[14px]">
                        <b>{r.type}</b> · {fmtMDY(r.days[0].date)}
                        {r.days.length > 1 ? ` – ${fmtMDY(r.days[r.days.length - 1].date)}` : ''} · {fmtDays(r.totalDays)}
                      </div>
                      {r.createdBy === 'hworker' && <HWorkerChip />}
                      <Pill tone={r.status === 'Approved' ? 'green' : 'orange'}>{r.status}</Pill>
                    </button>
                  ))}
                </div>
              </Card>
            </>
          )}
          {tab === 'contact' && (
            <Card title="Contact Information" action={canEdit ? <Btn size="sm" agent="workday-contact-edit" icon={<Pencil size={14} />} onClick={() => setDlg('contact')}>Edit</Btn> : undefined}>
              <KV
                rows={[
                  ['Work Email', w.email],
                  ['Work Phone', w.phone],
                  ['Work Address', w.location === 'Boston, MA' ? '1 Federal St, Floor 22, Boston, MA 02110' : w.location],
                  ['Home Email', w.homeEmail ?? (w.personId === 'jordan' ? 'jordan.ellis.home@gmail.com' : `${p.first.toLowerCase()}.${p.last.toLowerCase().replace(/[^a-z]/g, '')}@outlook.com`)],
                  ...(w.homePhone ? [['Home Phone', w.homePhone] as [string, any]] : []),
                  ...(w.homeAddress ? [['Home Address', w.homeAddress] as [string, any]] : []),
                  ['Emergency Contact', w.emergency ? `${w.emergency.name} (${w.emergency.relationship})${w.emergency.phone ? ' · ' + w.emergency.phone : ''}` : 'On file · 1 contact'],
                  ['Preferred Language', 'English (United States)'],
                ]}
              />
            </Card>
          )}
          {tab === 'pay' && (
            <Card title="Pay">
              {isMe ? (
                <div className="px-6 pb-6">
                  <KV rows={[['Pay Group', 'US Semi-Monthly'], ['Payment Election', 'Direct Deposit · Checking ••••4821 (100%)'], ['Most Recent Payslip', '$3,871.42 net']]} />
                  <Btn size="sm" onClick={() => nav({ page: 'pay' })}>View Payslips</Btn>
                </div>
              ) : (
                <div className="px-6 pb-6 text-[14px] text-[#5E6A75]">Pay details are private to {w.name.split(' ')[0]} and Payroll Partners. Managers can view compensation on the Compensation tab.</div>
              )}
            </Card>
          )}
          {tab === 'benefits' && (
            <Card title="Benefits">
              {isMe ? (
                <div className="px-6 pb-6">
                  <div className="text-[14px] mb-3">You are enrolled in 6 benefit plans for 2026. Open Enrollment for 2027 closes Friday.</div>
                  <Btn size="sm" onClick={() => nav({ page: 'benefits' })}>View Benefits</Btn>
                </div>
              ) : (
                <div className="px-6 pb-6 text-[14px] text-[#5E6A75]">Benefit elections are private to {w.name.split(' ')[0]} and Benefits Partners.</div>
              )}
            </Card>
          )}
          {tab === 'performance' && (
            <>
              <Card title="Reviews">
                <div className="px-6 pb-6 space-y-2 text-[14px]">
                  {reviews.map((r) => (
                    <div key={r.id} className="rounded-xl border border-[#E8EBED] p-4">
                      <div className="font-bold">{r.name ?? '2026 Mid-Year Review'} · {r.rating}</div>
                      <div className="text-[#5E6A75] mt-1">{r.comments}</div>
                      <div className="text-[12px] text-[#5E6A75] mt-1">Submitted by {person(r.by ?? ME.id).name} · {fmtMDY(r.submittedAt)}</div>
                    </div>
                  ))}
                  {!reviews.length && <div className="text-[#5E6A75]">No completed reviews this cycle.</div>}
                  {isReport && <Btn size="sm" onClick={() => nav({ page: 'performance' })}>Go to Team Performance</Btn>}
                </div>
              </Card>
              <Card title={`Goals (${goals.length})`} action={<Btn size="sm" onClick={() => nav({ page: 'goals', workerId: w.id } as Route)}>Manage Goals</Btn>}>
                <div className="px-6 pb-6 space-y-3">
                  {goals.map((g) => (
                    <div key={g.id} className="flex items-center gap-3 text-[14px]">
                      <span className="flex-1 min-w-0 truncate font-medium">{g.title}</span>
                      <div className="w-40 h-2 rounded-full bg-[#E8EBED] overflow-hidden"><div className="h-full bg-[#0875E1]" style={{ width: `${g.progress}%` }} /></div>
                      <span className="w-10 text-right font-bold">{g.progress}%</span>
                    </div>
                  ))}
                  {!goals.length && <div className="text-[14px] text-[#5E6A75]">No goals yet.</div>}
                </div>
              </Card>
            </>
          )}
          {tab === 'career' && (
            <Card title="Job History">
              <div className="px-6 pb-6 space-y-3 text-[14px]">
                {[...(w.jobChanges ?? [])].reverse().map((j: any, i: number) => (
                  <div key={i} className="flex gap-3">
                    <Briefcase size={18} className="text-[#0875E1] mt-0.5" />
                    <div>
                      <div className="font-bold">{j.to}</div>
                      <div className="text-[#5E6A75]">{j.reason} · Effective {fmtMDY(j.effective)} · {j.location}</div>
                    </div>
                  </div>
                ))}
                <div className="flex gap-3">
                  <Briefcase size={18} className="text-[#0875E1] mt-0.5" />
                  <div>
                    <div className="font-bold">{w.jobChanges?.[0]?.from ?? w.title}</div>
                    <div className="text-[#5E6A75]">{w.hireDate ? `Hire · ${fmtLong(w.hireDate)}` : 'Pending hire'} · {w.org}</div>
                  </div>
                </div>
              </div>
            </Card>
          )}
          {tab === 'feedback' && (
            <Card title={`Feedback Received (${feedback.length})`} action={!isMe && w.status !== 'Pre-Hire' ? <Btn size="sm" onClick={() => setDlg('feedback')}>Give Feedback</Btn> : undefined}>
              <div className="px-6 pb-6 space-y-3">
                {feedback.map((f) => (
                  <div key={f.id} className="flex gap-3 text-[14px]">
                    <Avatar id={f.fromId} size={32} />
                    <div className="min-w-0">
                      <div>
                        <b>{person(f.fromId).name}</b>
                        {f.badge && <span className="ml-2 inline-flex items-center gap-1 text-[12px] font-bold text-[#9C4F00] bg-[#FFEFD6] rounded px-2 h-5"><Award size={12} /> {f.badge}</span>}
                      </div>
                      <div className="mt-0.5">{f.text}</div>
                      <div className="text-[12px] text-[#5E6A75]">{fmtLong(f.at)}</div>
                    </div>
                  </div>
                ))}
                {!feedback.length && <div className="text-[14px] text-[#5E6A75]">No feedback yet.</div>}
              </div>
            </Card>
          )}
          {tab === 'personal' && (
            <Card title="Personal Information" action={canEdit ? <Btn size="sm" icon={<Pencil size={14} />} onClick={() => setDlg('contact')}>Edit Contact</Btn> : undefined}>
              <KV rows={[['Legal Name', w.name], ['Preferred Name', p.first], ['Employee ID', w.employeeId], ['Primary Work Location', w.location], ['Home Address', canEdit ? w.homeAddress ?? 'On file' : 'Private'], ['Citizenship Status', canEdit ? 'On file' : 'Private']]} />
            </Card>
          )}
        </div>
      </div>
      {dlg === 'feedback' && <GiveFeedbackModal toWorkerId={w.id} onClose={() => setDlg(null)} onDone={(n) => finish(`Feedback sent to ${n}.`)} />}
      {dlg === 'comp' && <CompChangeModal workerId={w.id} onClose={() => setDlg(null)} onDone={finish} />}
      {dlg === 'job' && <ChangeJobModal workerId={w.id} onClose={() => setDlg(null)} onDone={finish} />}
      {dlg === 'contact' && <EditContactModal w={w} onClose={() => setDlg(null)} onDone={finish} />}
    </div>
  )
}

function KV({ rows }: { rows: [string, any][] }) {
  return (
    <div className="px-6 pb-6 divide-y divide-[#F0F1F2]">
      {rows.map(([k, v]) => (
        <div key={k} className="grid grid-cols-[200px_1fr] py-2.5 text-[14px]">
          <span className="text-[#5E6A75]">{k}</span>
          <span className="font-medium">{v}</span>
        </div>
      ))}
    </div>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-[#E8EBED] p-4">
      <div className="text-[13px] text-[#5E6A75] font-medium">{label}</div>
      <div className="text-[24px] font-bold mt-1">{value}</div>
      {sub && <div className="text-[12px] text-[#5E6A75] mt-0.5">{sub}</div>}
    </div>
  )
}

export function SearchResults({ nav, q }: { nav: Nav; q: string }) {
  const workers = useCollection<any>('workday.workers')
  const s = q.toLowerCase()
  const hits = workers.filter((w) => (w.name + ' ' + w.title + ' ' + w.dept).toLowerCase().includes(s))
  const [cat, setCat] = useState('All of Workday')
  const tasks = [
    ['Request Time Off', { page: 'timeoff-request' }],
    ['Hire Employee', { page: 'onboarding', workerId: 'wd-jordan' }],
    ['My Team Management', { page: 'team' }],
    ['Time Off and Leave', { page: 'timeoff' }],
    ['Create Expense Report', { page: 'expenses' }],
    ['My Payslips', { page: 'pay' }],
    ['Benefits', { page: 'benefits' }],
    ['Learning', { page: 'learning' }],
    ['Find Jobs', { page: 'career' }],
    ['Goals', { page: 'goals' }],
    ['Give Feedback', { page: 'feedback' }],
    ['Directory', { page: 'directory' }],
    ['Team Performance', { page: 'performance' }],
  ].filter(([t]) => (t as string).toLowerCase().includes(s))
  const orgs = [...new Set(workers.map((w) => w.org as string).filter(Boolean))].filter((o) => o.toLowerCase().includes(s))
  const showPeople = cat === 'All of Workday' || cat === 'People'
  const showTasks = cat === 'All of Workday' || cat === 'Tasks and Reports'
  const showOrgs = cat === 'All of Workday' || cat === 'Organizations'
  return (
    <div className="max-w-[1100px] mx-auto px-10 py-8">
      <button onClick={() => nav({ page: 'home' })} className="text-[14px] font-bold text-[#0875E1] hover:underline mb-3 flex items-center gap-1">
        <ChevronLeft size={16} /> Home
      </button>
      <h1 className="text-[26px] font-bold mb-5 flex items-center gap-3">
        <Search size={24} /> Search Results for “{q}”
      </h1>
      <div className="grid grid-cols-[220px_minmax(0,1fr)] gap-6">
        <div className="bg-white rounded-2xl border border-[#E8EBED] p-2 h-fit">
          {['All of Workday', 'People', 'Tasks and Reports', 'Organizations', 'Help'].map((c) => (
            <button key={c} onClick={() => (c === 'Help' ? nav({ page: 'help' }) : setCat(c))} className={`w-full text-left px-4 h-10 flex items-center rounded-xl text-[14px] font-bold ${cat === c ? 'bg-[#D7EAFC] text-[#005CB9]' : 'hover:bg-[#F6F7F8]'}`}>
              {c}
            </button>
          ))}
        </div>
        <div className="space-y-4">
          {showPeople && hits.length > 0 && (
            <Card title="People">
              <div className="px-3 pb-3">
                {hits.map((w) => (
                  <button key={w.id} data-agent={`workday-search-result-${w.id}`} onClick={() => nav({ page: 'worker', workerId: w.id })} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#F6F7F8] text-left">
                    <Avatar id={w.personId} size={40} />
                    <div>
                      <div className="text-[14px] font-bold text-[#0875E1]">{w.name}</div>
                      <div className="text-[13px] text-[#5E6A75]">
                        {w.title} · {w.location}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          )}
          {showTasks && tasks.length > 0 && (
            <Card title="Tasks and Reports">
              <div className="px-3 pb-3">
                {tasks.map(([t, r]) => (
                  <button key={t as string} onClick={() => nav(r as any)} className="w-full text-left px-3 h-10 rounded-lg hover:bg-[#F6F7F8] text-[14px] font-bold text-[#0875E1]">
                    {t as string}
                  </button>
                ))}
              </div>
            </Card>
          )}
          {showOrgs && orgs.length > 0 && (
            <Card title="Organizations">
              <div className="px-3 pb-3">
                {orgs.map((o) => (
                  <button key={o} onClick={() => nav({ page: 'directory' })} className="w-full text-left px-3 h-10 rounded-lg hover:bg-[#F6F7F8] text-[14px] font-bold text-[#0875E1] flex items-center gap-2">
                    <Building2 size={16} /> {o}
                  </button>
                ))}
              </div>
            </Card>
          )}
          {!(showPeople && hits.length) && !(showTasks && tasks.length) && !(showOrgs && orgs.length) && <div className="text-[14px] text-[#5E6A75]">No results found.</div>}
        </div>
      </div>
    </div>
  )
}
