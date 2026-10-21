import { useEffect, useState } from 'react'
import { Users, Mail, Phone, MapPin, ChevronLeft, MoreHorizontal, UserPlus, MessageSquareHeart, Building2, BadgeDollarSign, Plane, Briefcase, Contact, LayoutGrid, Search } from 'lucide-react'
import { useCollection, useRecord } from '@/db/db'
import { person } from '@/data/people'
import { money } from '@/data/time'
import { Avatar } from '@/components/Avatar'
import { Btn, Card, HWorkerChip, Pill, AppIcon } from './ui'
import type { Nav } from './index'
import { fmtDays, fmtLong, fmtMDY } from './util'

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
  return (
    <div className="max-w-[1280px] mx-auto px-10 py-8">
      <div className="flex items-center gap-4 mb-7">
        <AppIcon icon={<Users size={22} />} color="#00A3A3" size={48} />
        <div className="flex-1">
          <h1 className="text-[28px] font-bold leading-tight">My Team Management</h1>
          <div className="text-[14px] text-[#5E6A75]">Operations (Alex Morgan) · {team.length} direct reports</div>
        </div>
        <Btn icon={<UserPlus size={16} />} agent="workday-team-hire" onClick={() => nav({ page: 'onboarding', workerId: 'wd-jordan' })}>
          Hire
        </Btn>
        <Btn icon={<MessageSquareHeart size={16} />}>Give Feedback</Btn>
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
                    <div key={r.id} className="flex items-center gap-3">
                      <Avatar id={w?.personId} size={32} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[14px] font-medium">{w?.name}</div>
                        <div className="text-[12.5px] text-[#5E6A75]">
                          {r.type} · {fmtMDY(r.days[0].date)}
                          {r.days.length > 1 ? ` – ${fmtMDY(r.days[r.days.length - 1].date)}` : ''}
                        </div>
                      </div>
                      <Pill tone={r.status === 'Approved' ? 'green' : 'orange'}>{r.status}</Pill>
                    </div>
                  )
                })}
            </div>
          </Card>
          <Card title="Actions">
            <div className="px-3 pb-3">
              {['Request Compensation Change', 'Change Job', 'Create Job Requisition', 'Move Workers (By Organization)', 'Assign Onboarding Plan', 'Team Absence Calendar'].map((t) => (
                <button key={t} className="w-full text-left px-3 h-10 rounded-lg hover:bg-[#F6F7F8] text-[14px] font-bold text-[#0875E1]">
                  {t}
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
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

export function WorkerProfile({ nav, workerId, initialTab }: { nav: Nav; workerId: string; initialTab?: string }) {
  const w = useRecord<any>('workday.workers', workerId)
  const [tab, setTab] = useState(initialTab ?? 'summary')
  useEffect(() => setTab(initialTab ?? 'summary'), [workerId, initialTab])
  const onb = useCollection<any>('workday.onboarding').find((o) => o.workerId === workerId)
  const reqs = useCollection<any>('workday.timeoff').filter((r) => r.workerId === workerId)
  const allWorkers = useCollection<any>('workday.workers')
  if (!w) return <div className="p-10">Worker not found.</div>
  const p = person(w.personId)
  const mgr = w.managerId ? person(w.managerId.replace('wd-', '')) : null
  const reports = allWorkers.filter((x) => x.managerId === w.id)
  const done = onb ? onb.tasks.filter((t: any) => t.status === 'Complete').length : 0

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
            <div className="flex gap-2 mt-4">
              <Btn size="sm" icon={<Mail size={14} />}>Email</Btn>
              <Btn size="sm" icon={<MoreHorizontal size={14} />}>Actions</Btn>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-[#E8EBED] p-2">
            {TABS.map(([k, l, I]) => (
              <button key={k} data-agent={`workday-worker-tab-${k}`} onClick={() => setTab(k)} className={`w-full flex items-center gap-3 px-4 h-11 rounded-xl text-[14px] font-bold ${tab === k ? 'bg-[#D7EAFC] text-[#005CB9]' : 'text-[#333] hover:bg-[#F6F7F8]'}`}>
                <I size={18} /> {l}
              </button>
            ))}
            {['Pay', 'Benefits', 'Performance', 'Career', 'Feedback', 'Personal'].map((l) => (
              <button key={l} className="w-full flex items-center gap-3 px-4 h-10 rounded-xl text-[14px] text-[#5E6A75] hover:bg-[#F6F7F8]">
                <span className="w-[18px]" /> {l}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-[84px] space-y-6 min-w-0">
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
                    <div className="flex items-center gap-3"><Mail size={16} className="text-[#5E6A75]" /> <span className="text-[#0875E1]">{w.email}</span></div>
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
            <Card title="Contact Information">
              <KV rows={[['Work Email', w.email], ['Work Phone', w.phone], ['Work Address', w.location === 'Boston, MA' ? '1 Federal St, Floor 22, Boston, MA 02110' : w.location], ['Home Email', w.personId === 'jordan' ? 'jordan.ellis.home@gmail.com' : `${p.first.toLowerCase()}.${p.last.toLowerCase().replace(/[^a-z]/g, '')}@outlook.com`], ['Emergency Contact', 'On file · 1 contact'], ['Preferred Language', 'English (United States)']]} />
            </Card>
          )}
        </div>
      </div>
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
  const tasks = [
    ['Request Time Off', { page: 'timeoff-request' }],
    ['Hire Employee', { page: 'onboarding', workerId: 'wd-jordan' }],
    ['My Team Management', { page: 'team' }],
    ['Time Off and Leave', { page: 'timeoff' }],
  ].filter(([t]) => (t as string).toLowerCase().includes(s))
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
          {['All of Workday', 'People', 'Tasks and Reports', 'Organizations', 'Help'].map((c, i) => (
            <div key={c} className={`px-4 h-10 flex items-center rounded-xl text-[14px] font-bold ${i === 0 ? 'bg-[#D7EAFC] text-[#005CB9]' : ''}`}>
              {c}
            </div>
          ))}
        </div>
        <div className="space-y-4">
          {hits.length > 0 && (
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
          {tasks.length > 0 && (
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
          {!hits.length && !tasks.length && <div className="text-[14px] text-[#5E6A75]">No results found.</div>}
        </div>
      </div>
    </div>
  )
}
