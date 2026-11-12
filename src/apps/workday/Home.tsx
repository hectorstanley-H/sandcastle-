import { useState, type ReactNode } from 'react'
import {
  Plane,
  DollarSign,
  HeartPulse,
  UserRound,
  TrendingUp,
  Users,
  UserPlus,
  ClipboardCheck,
  ChevronRight,
  ArrowRight,
  CalendarDays,
  Inbox as InboxIcon,
  GraduationCap,
  Receipt,
  Megaphone,
  Building2,
  Gift,
  Clock,
  Briefcase,
} from 'lucide-react'
import { useCollection } from '@/db/db'
import { ME, person } from '@/data/people'
import { relative } from '@/data/time'
import { Avatar } from '@/components/Avatar'
import { Btn, Card, AppIcon, Modal } from './ui'
import type { Nav, Route } from './index'
import { fmtDays, fmtMDY } from './util'

export const TOP_APPS: { key: string; name: string; icon: ReactNode; color: string; route: Route }[] = [
  { key: 'timeoff', name: 'Time Off', icon: <Plane size={20} />, color: '#0875E1', route: { page: 'timeoff' } },
  { key: 'pay', name: 'Pay', icon: <DollarSign size={20} />, color: '#319C4C', route: { page: 'pay' } },
  { key: 'benefits', name: 'Benefits', icon: <HeartPulse size={20} />, color: '#DE2E21', route: { page: 'benefits' } },
  { key: 'personal', name: 'Personal Information', icon: <UserRound size={20} />, color: '#8660D9', route: { page: 'worker', workerId: 'wd-alex', tab: 'contact' } },
  { key: 'performance', name: 'Team Performance', icon: <TrendingUp size={20} />, color: '#F38B00', route: { page: 'performance' } },
  { key: 'team', name: 'My Team Management', icon: <Users size={20} />, color: '#00A3A3', route: { page: 'team' } },
  { key: 'hire', name: 'Hire', icon: <UserPlus size={20} />, color: '#005CB9', route: { page: 'onboarding', workerId: 'wd-jordan' } },
  { key: 'onboarding', name: 'Onboarding', icon: <ClipboardCheck size={20} />, color: '#C9227A', route: { page: 'onboarding', workerId: 'wd-jordan' } },
]

const greeting = () => {
  const h = new Date().getHours()
  return h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening'
}

export function Home({ nav }: { nav: Nav }) {
  const tasks = useCollection<any>('workday.tasks')
  const open = tasks.filter((t) => t.assignee === ME.id && t.status === 'open').sort((a, b) => +new Date(b.receivedAt) - +new Date(a.receivedAt))
  const me = useCollection<any>('workday.workers').find((w) => w.id === 'wd-alex')
  const onb = useCollection<any>('workday.onboarding').find((o) => o.id === 'onb-jordan')
  const ann = useCollection<any>('workday.announcements')
  const today = new Date()
  const [annOpen, setAnnOpen] = useState<any | null>(null)
  const recommended: [ReactNode, string, string, string, Route][] = [
    [<GraduationCap size={18} key="a" />, 'Leading Hybrid Teams', 'Course · 45 min', '#8660D9', { page: 'learning' }],
    [<Briefcase size={18} key="b" />, 'Director, Operations — Chicago', 'Internal Job · Posted 3 days ago', '#005CB9', { page: 'career' }],
    [<Clock size={18} key="c" />, 'Review Team Time Off for December', '3 requests pending in your team', '#0875E1', { page: 'team' }],
    [<Gift size={18} key="d" />, 'Give Recognition', 'Thank Ben for the September SLA report', '#F38B00', { page: 'feedback' }],
  ]

  return (
    <div className="min-h-full">
      {/* hero */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(100deg,#E5F0FC 0%,#F2F7FD 45%,#FDF4E8 100%)' }}>
        <svg className="absolute right-0 top-0 h-full opacity-60" viewBox="0 0 600 200" preserveAspectRatio="xMaxYMid slice" aria-hidden>
          <circle cx="520" cy="40" r="140" fill="#FFD89E" opacity=".35" />
          <circle cx="430" cy="210" r="120" fill="#A9D1FA" opacity=".35" />
          <path d="M260 200 C 360 90, 470 90, 600 160" stroke="#F38B00" strokeWidth="3" fill="none" opacity=".35" />
        </svg>
        <div className="relative max-w-[1280px] mx-auto px-10 pt-9 pb-24">
          <h1 className="text-[32px] font-bold text-[#333] tracking-[-0.01em]">
            {greeting()}, {ME.name}
          </h1>
          <div className="text-[16px] text-[#5E6A75] mt-1">It&apos;s {today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div>
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto px-10 -mt-16 pb-10 grid grid-cols-[minmax(0,1fr)_380px] gap-6 relative">
        <div className="space-y-6 min-w-0">
          <Card
            title="Awaiting Your Action"
            agent="workday-awaiting"
          >
            <div className="px-3 pb-2">
              {open.slice(0, 4).map((t) => (
                <button
                  key={t.id}
                  data-agent={`workday-await-${t.id}`}
                  onClick={() => (t.link ? nav(t.link.page === 'onboarding' ? { page: 'onboarding', workerId: t.link.workerId } : { page: 'inbox', taskId: t.id }) : nav({ page: 'inbox', taskId: t.id }))}
                  className="w-full flex items-center gap-4 px-3 py-3 rounded-xl hover:bg-[#F6F7F8] text-left"
                >
                  <span className="w-10 h-10 rounded-full bg-[#D7EAFC] text-[#005CB9] flex items-center justify-center shrink-0">
                    {t.process === 'Hire Employee' ? <UserPlus size={18} /> : t.process === 'Request Time Off' ? <Plane size={18} /> : t.process === 'Expense Report' ? <Receipt size={18} /> : t.process === 'Required Learning' ? <GraduationCap size={18} /> : <InboxIcon size={18} />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-bold text-[#333] truncate">{t.title}</div>
                    <div className="text-[13px] text-[#5E6A75] truncate">
                      {t.step} · {relative(t.receivedAt)}
                    </div>
                  </div>
                  {t.due && (
                    <span className={`text-[12px] font-bold px-2 h-6 rounded flex items-center ${+new Date(t.due) - Date.now() < 2.5 * 864e5 ? 'bg-[#FFEFD6] text-[#9C4F00]' : 'bg-[#F0F1F2] text-[#5E6A75]'}`}>
                      Due {fmtMDY(t.due)}
                    </span>
                  )}
                  <ChevronRight size={18} className="text-[#A1AAB3]" />
                </button>
              ))}
              {!open.length && <div className="px-3 py-6 text-[14px] text-[#5E6A75]">You&apos;re all caught up.</div>}
            </div>
            <div className="border-t border-[#E8EBED] px-6 py-3">
              <button data-agent="workday-goto-inbox" onClick={() => nav({ page: 'inbox' })} className="text-[14px] font-bold text-[#0875E1] hover:underline flex items-center gap-1">
                Go to All Inbox Items ({open.length}) <ArrowRight size={16} />
              </button>
            </div>
          </Card>

          <div>
            <div className="text-[18px] font-bold mb-3">Timely Suggestions</div>
            <div className="grid grid-cols-3 gap-4">
              <Suggestion
                icon={<Plane size={18} />}
                color="#0875E1"
                title="Plan Your Holiday Time Off"
                body={`You have ${fmtDays(me?.balances?.vacation ?? 14.5)} of Vacation available. Unused days above 5 expire Dec 31.`}
                cta="Request Time Off"
                agent="workday-suggest-timeoff"
                onClick={() => nav({ page: 'timeoff-request' })}
              />
              <Suggestion
                icon={<UserPlus size={18} />}
                color="#C9227A"
                title={onb?.hireDone ? 'Jordan Ellis Starts Monday' : 'Complete Hire for Jordan Ellis'}
                body={onb?.hireDone ? 'Review the onboarding plan and say hello before day one.' : 'Position, start date and compensation details are waiting on you as hiring manager.'}
                cta={onb?.hireDone ? 'View Onboarding' : 'Complete Hire'}
                agent="workday-suggest-hire"
                onClick={() => nav({ page: 'onboarding', workerId: 'wd-jordan' })}
              />
              <Suggestion icon={<HeartPulse size={18} />} color="#DE2E21" title="Open Enrollment Ends Soon" body="Review and submit your 2027 benefit elections before Friday 11:59 PM ET." cta="Review Benefits" onClick={() => nav({ page: 'benefits' })} />
            </div>
          </div>

          <Card title="Recommended for You">
            <div className="grid grid-cols-2 gap-3 px-6 pb-6">
              {recommended.map(([i, t, s, c, r], idx) => (
                <button key={t} data-agent={`workday-recommended-${idx}`} onClick={() => nav(r)} className="flex items-center gap-3 p-3 rounded-xl border border-[#E8EBED] hover:bg-[#F6F7F8] text-left">
                  <AppIcon icon={i} color={c} size={36} />
                  <div className="min-w-0">
                    <div className="text-[14px] font-bold truncate">{t}</div>
                    <div className="text-[12.5px] text-[#5E6A75] truncate">{s}</div>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Your Top Apps" agent="workday-top-apps">
            <div className="px-3 pb-2">
              {TOP_APPS.map((a) => (
                <button key={a.key} data-agent={`workday-app-${a.key}`} aria-label={a.name} onClick={() => nav(a.route)} className="w-full flex items-center gap-3.5 px-3 py-2 rounded-xl hover:bg-[#F6F7F8] text-left">
                  <AppIcon icon={a.icon} color={a.color} />
                  <span className="text-[14px] font-medium">{a.name}</span>
                </button>
              ))}
            </div>
            <div className="border-t border-[#E8EBED] px-6 py-3">
              <button data-agent="workday-view-all-apps" onClick={() => nav({ page: 'apps' })} className="text-[14px] font-bold text-[#0875E1] hover:underline flex items-center gap-1">
                View All Apps <ArrowRight size={16} />
              </button>
            </div>
          </Card>

          <Card title="Announcements">
            <div className="px-4 pb-4 space-y-3">
              {ann.map((a) => (
                <button key={a.id} data-agent={`workday-announcement-${a.id}`} onClick={() => setAnnOpen(a)} className="w-full text-left flex gap-3 p-2 rounded-xl hover:bg-[#F6F7F8]">
                  <div
                    className="w-[84px] h-[64px] rounded-lg shrink-0 flex items-center justify-center text-white"
                    style={{ background: a.tone === 'blue' ? 'linear-gradient(135deg,#0875E1,#5FA9F2)' : a.tone === 'orange' ? 'linear-gradient(135deg,#F38B00,#FFC56B)' : 'linear-gradient(135deg,#00A3A3,#6FD3CE)' }}
                  >
                    {a.tone === 'blue' ? <HeartPulse size={26} /> : a.tone === 'orange' ? <Building2 size={26} /> : <Megaphone size={26} />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[14px] font-bold leading-snug">{a.title}</div>
                    <div className="text-[12.5px] text-[#5E6A75] leading-snug mt-0.5 line-clamp-2">{a.body}</div>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          <Card title="Team Time Off">
            <div className="px-6 pb-5 space-y-3">
              {[
                ['ben', 'Vacation · Nov 27', 'Pending'],
                ['maya', 'Vacation · Oct 5 – Oct 6', 'Approved'],
                ['priya', 'Vacation · Dec 28 – Jan 1', 'Approved'],
              ].map(([id, t, s]) => (
                <button key={id} onClick={() => nav({ page: 'worker', workerId: `wd-${id}`, tab: 'timeoff' })} className="w-full text-left flex items-center gap-3 rounded-xl hover:bg-[#F6F7F8] -mx-2 px-2 py-1">
                  <Avatar id={id} size={32} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-medium">{person(id).name}</div>
                    <div className="text-[12.5px] text-[#5E6A75]">{t}</div>
                  </div>
                  <span className={`text-[12px] font-bold ${s === 'Pending' ? 'text-[#9C4F00]' : 'text-[#1E6F34]'}`}>{s}</span>
                </button>
              ))}
              <button onClick={() => nav({ page: 'team' })} className="text-[14px] font-bold text-[#0875E1] hover:underline flex items-center gap-1 pt-1">
                <CalendarDays size={16} /> View Team Calendar
              </button>
            </div>
          </Card>
        </div>
      </div>
      {annOpen && (
        <Modal
          title={annOpen.title}
          onClose={() => setAnnOpen(null)}
          footer={
            <>
              <Btn variant="primary" onClick={() => setAnnOpen(null)}>
                Close
              </Btn>
              {annOpen.tone === 'blue' && (
                <Btn onClick={() => (setAnnOpen(null), nav({ page: 'benefits' }))}>Review Benefits</Btn>
              )}
            </>
          }
        >
          <div className="text-[13px] text-[#5E6A75] mb-3">Posted {annOpen.date ? relative(annOpen.date) : ''} · Northwind Communications</div>
          <div className="text-[15px] leading-relaxed">{annOpen.body}</div>
          <div className="text-[14px] leading-relaxed text-[#5E6A75] mt-3">{ANN_MORE[annOpen.tone] ?? ''}</div>
        </Modal>
      )}
    </div>
  )
}

const ANN_MORE: Record<string, string> = {
  blue: 'New for 2027: the Aetna HDHP now includes a $750 company HSA seed, and Delta Dental raises the annual maximum to $2,000. If you take no action, your current elections roll over (except HSA and FSA contributions).',
  orange: 'One Federal has 22 neighborhoods with bookable desks, 14 focus rooms and a wellness room on every floor. Badge access is activated automatically for Boston-based workers.',
  teal: 'Submit questions in advance via the Q4 Town Hall form. The session will be recorded and posted to the Northwind intranet within 24 hours.',
}

function Suggestion({ icon, color, title, body, cta, onClick, agent }: { icon: ReactNode; color: string; title: string; body: string; cta: string; onClick: () => void; agent?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E8EBED] shadow-[0_1px_4px_rgba(31,38,46,0.08)] p-5 flex flex-col">
      <AppIcon icon={icon} color={color} size={36} />
      <div className="text-[15px] font-bold mt-3 leading-snug">{title}</div>
      <div className="text-[13px] text-[#5E6A75] mt-1 leading-snug flex-1">{body}</div>
      <button data-agent={agent} onClick={onClick} className="mt-4 self-start h-8 px-4 rounded-full border border-[#494949] text-[13px] font-bold hover:bg-[#F0F1F2]">
        {cta}
      </button>
    </div>
  )
}
