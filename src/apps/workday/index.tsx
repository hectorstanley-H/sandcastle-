import { useEffect, useMemo, useState } from 'react'
import { Bell, Inbox, Menu, Search, Sparkles, X } from 'lucide-react'
import type { AppProps } from '@/os/registry'
import { logoUrl } from '@/os/registry'
import { useWin } from '@/os/context'
import { useCollection, useDB } from '@/db/db'
import { Avatar } from '@/components/Avatar'
import { ME, person } from '@/data/people'
import { relative } from '@/data/time'
import { WD } from './ui'
import { Home } from './Home'
import { TimeOffHub, RequestTimeOff, TimeOffDone, TimeOffDetail } from './TimeOff'
import { MyTeam, WorkerProfile, SearchResults } from './Team'
import { InboxPage } from './Inbox'
import { HirePage } from './Hire'
import { PayPage, BenefitsPage, PerformancePage, AllApps } from './Other'
import { ExpensesPage, LearningPage, CareerPage, GoalsPage, FeedbackPage, DirectoryPage, HelpPage } from './More'

export type Page =
  | 'home'
  | 'timeoff'
  | 'timeoff-request'
  | 'timeoff-done'
  | 'timeoff-detail'
  | 'team'
  | 'worker'
  | 'inbox'
  | 'onboarding'
  | 'pay'
  | 'benefits'
  | 'performance'
  | 'apps'
  | 'search'
  | 'expenses'
  | 'learning'
  | 'career'
  | 'goals'
  | 'feedback'
  | 'directory'
  | 'help'

export interface Route {
  page: Page
  workerId?: string
  requestId?: string
  tab?: string
  taskId?: string
  q?: string
}

export type Nav = (r: Route) => void

const TITLES: Record<Page, string> = {
  home: 'Home - Workday',
  timeoff: 'Time Off - Workday',
  'timeoff-request': 'Request Time Off - Workday',
  'timeoff-done': 'Request Time Off - Workday',
  'timeoff-detail': 'Time Off Request - Workday',
  team: 'My Team - Workday',
  worker: 'Worker Profile - Workday',
  inbox: 'My Tasks - Workday',
  onboarding: 'Hire Employee - Workday',
  pay: 'Pay - Workday',
  benefits: 'Benefits - Workday',
  performance: 'Team Performance - Workday',
  apps: 'Apps - Workday',
  search: 'Search Results - Workday',
  expenses: 'Expenses - Workday',
  learning: 'Learning - Workday',
  career: 'Career - Workday',
  goals: 'Goals - Workday',
  feedback: 'Feedback - Workday',
  directory: 'Directory - Workday',
  help: 'Help - Workday',
}

const URLS: Record<Page, string> = {
  home: 'd/home.htmld',
  timeoff: 'd/task/2997$10.htmld',
  'timeoff-request': 'd/task/2997$4.htmld',
  'timeoff-done': 'd/task/2997$4.htmld',
  'timeoff-detail': 'd/inst/1$2124/12874$',
  team: 'd/task/2998$15.htmld',
  worker: 'd/inst/247$',
  inbox: 'd/task/2998$1.htmld',
  onboarding: 'd/task/2997$1256.htmld',
  pay: 'd/task/2997$7.htmld',
  benefits: 'd/task/2997$8.htmld',
  performance: 'd/task/2998$22.htmld',
  apps: 'd/apps.htmld',
  search: 'd/search.htmld',
  expenses: 'd/task/2997$32.htmld',
  learning: 'd/task/2998$41.htmld',
  career: 'd/task/2998$57.htmld',
  goals: 'd/task/2997$61.htmld',
  feedback: 'd/task/2997$66.htmld',
  directory: 'd/task/2998$70.htmld',
  help: 'd/task/2998$90.htmld',
}

function routeFromParams(p: any): Route | null {
  if (!p) return null
  if (p.page === 'timeoff') return p.requestId ? { page: 'timeoff-detail', requestId: p.requestId } : { page: 'timeoff' }
  if (p.page === 'worker' || (p.workerId && !p.page)) return { page: 'worker', workerId: p.workerId ?? 'wd-alex', tab: p.tab }
  if (p.page === 'inbox') return { page: 'inbox', taskId: p.taskId }
  if (p.page === 'onboarding') return { page: 'onboarding', workerId: p.workerId ?? 'wd-jordan' }
  if (p.requestId) return { page: 'timeoff-detail', requestId: p.requestId }
  if (p.page) return { page: p.page }
  return null
}

export default function Workday({ win, params }: AppProps) {
  const { setUrl, setTitle } = useWin()
  const [route, setRoute] = useState<Route>(() => routeFromParams(params) ?? { page: 'home' })
  const [q, setQ] = useState('')
  const [notifOpen, setNotifOpen] = useState(false)
  const [assistOpen, setAssistOpen] = useState(false)
  const [assistQ, setAssistQ] = useState('')
  const [readIds, setReadIds] = useState<string[]>([])
  const epoch = useDB((s) => s.epoch)
  const tasks = useCollection<any>('workday.tasks')
  const myOpen = tasks.filter((t) => t.assignee === ME.id && t.status === 'open')
  const workers = useCollection<any>('workday.workers')

  useEffect(() => {
    const r = routeFromParams(params)
    if (r) setRoute(r)
  }, [win.nonce])

  useEffect(() => {
    let t = TITLES[route.page]
    if (route.page === 'worker') {
      const w = workers.find((x) => x.id === route.workerId)
      if (w) t = `${w.name} - Workday`
    }
    setTitle(t)
    setUrl(`https://wd5.myworkday.com/northwind/${URLS[route.page]}${route.page === "worker" && route.workerId ? "0" + (route.workerId.length * 7919 + 41203) : ""}`)
  }, [route.page, route.workerId])

  const nav: Nav = (r) => {
    setRoute(r)
    setNotifOpen(false)
    setAssistOpen(false)
  }

  const notifications = useMemo(
    () => [
      { id: 'n1', text: 'Your Time Off request for August has been approved by Priya Raman', at: '2026-06-18T18:30:00.000Z', to: { page: 'timeoff' } as Route },
      { id: 'n2', text: 'Jordan Ellis accepted the offer for Operations Analyst', at: new Date(Date.now() - 4 * 864e5).toISOString(), to: { page: 'onboarding', workerId: 'wd-jordan' } as Route },
      { id: 'n3', text: 'Open Enrollment closes Friday at 11:59 PM ET', at: new Date(Date.now() - 6 * 864e5).toISOString(), to: { page: 'benefits' } as Route },
      { id: 'n4', text: 'Your payslip for October 15 is available', at: new Date(Date.now() - 6 * 864e5).toISOString(), to: { page: 'pay' } as Route },
    ],
    [],
  )

  const unread = notifications.filter((n) => !readIds.includes(n.id)).length

  return (
    <div key={epoch} className="flex-1 min-h-0 flex flex-col bg-[#F6F7F8] relative" style={{ fontFamily: WD.font, color: WD.text }}>
      {/* global header */}
      <header className="h-16 shrink-0 bg-white flex items-center px-4 gap-3 border-b border-[#E8EBED] relative z-20">
        <button data-agent="workday-menu" aria-label="Global navigation" onClick={() => nav({ page: 'apps' })} className="h-10 px-3 rounded-full flex items-center gap-2 hover:bg-[#F0F1F2] text-[14px] font-bold text-[#333]">
          <Menu size={20} /> MENU
        </button>
        <button data-agent="workday-home" aria-label="Workday home" onClick={() => nav({ page: 'home' })} className="h-12 flex items-center gap-2 px-1">
          <img src={logoUrl('workday')} className="w-9 h-9" alt="Workday" />
        </button>
        <div className="flex-1 flex justify-center">
          <div className="w-full max-w-[560px] h-10 rounded-full bg-[#F0F1F2] flex items-center px-4 gap-2 border border-transparent focus-within:border-[#0875E1] focus-within:bg-white">
            <Search size={18} className="text-[#5E6A75]" />
            <input
              data-agent="workday-search"
              aria-label="Search"
              placeholder="Search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && q.trim()) nav({ page: 'search', q: q.trim() })
              }}
              className="flex-1 bg-transparent outline-none text-[14px]"
            />
            {q && (
              <button onClick={() => setQ('')} aria-label="Clear search" className="text-[#5E6A75]">
                <X size={16} />
              </button>
            )}
          </div>
        </div>
        <button
          aria-label="Workday Assistant"
          onClick={() => {
            setAssistOpen((o) => !o)
            setNotifOpen(false)
          }}
          className={`w-10 h-10 rounded-full flex items-center justify-center hover:bg-[#F0F1F2] ${assistOpen ? 'bg-[#D7EAFC] text-[#005CB9]' : 'text-[#5E6A75]'}`}
        >
          <Sparkles size={20} />
        </button>
        <button
          data-agent="workday-notifications"
          aria-label="Notifications"
          onClick={() => {
            setNotifOpen((o) => !o)
            setAssistOpen(false)
          }}
          className="relative w-10 h-10 rounded-full flex items-center justify-center hover:bg-[#F0F1F2] text-[#5E6A75]"
        >
          <Bell size={20} />
          {unread > 0 && <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#DE2E21] text-white text-[11px] font-bold flex items-center justify-center">{unread}</span>}
        </button>
        <button data-agent="workday-inbox" aria-label="My Tasks" onClick={() => nav({ page: 'inbox' })} className="relative w-10 h-10 rounded-full flex items-center justify-center hover:bg-[#F0F1F2] text-[#5E6A75]">
          <Inbox size={20} />
          {myOpen.length > 0 && <span className="absolute top-1 right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#DE2E21] text-white text-[11px] font-bold flex items-center justify-center">{myOpen.length}</span>}
        </button>
        <button data-agent="workday-avatar" aria-label="Alex Morgan profile" onClick={() => nav({ page: 'worker', workerId: 'wd-alex' })} className="ml-1 rounded-full">
          <Avatar id={ME.id} size={36} />
        </button>
        {notifOpen && (
          <div className="absolute right-20 top-14 w-[380px] bg-white rounded-xl shadow-[0_8px_28px_rgba(0,0,0,0.18)] border border-[#E8EBED] py-2">
            <div className="px-4 py-2 flex items-center">
              <span className="text-[16px] font-bold flex-1">Notifications</span>
              <button disabled={!unread} onClick={() => setReadIds(notifications.map((n) => n.id))} className="text-[13px] font-bold text-[#0875E1] hover:underline disabled:text-[#A1AAB3] disabled:no-underline">
                Mark All as Read
              </button>
            </div>
            {notifications.map((n) => {
              const read = readIds.includes(n.id)
              return (
                <button
                  key={n.id}
                  data-agent={`workday-notification-${n.id}`}
                  onClick={() => {
                    setReadIds((r) => (r.includes(n.id) ? r : [...r, n.id]))
                    nav(n.to)
                  }}
                  className="w-full text-left px-4 py-2.5 hover:bg-[#F6F7F8] flex gap-3"
                >
                  <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${read ? 'bg-transparent' : 'bg-[#0875E1]'}`} />
                  <div>
                    <div className={`text-[13.5px] leading-snug ${read ? 'text-[#5E6A75]' : ''}`}>{n.text}</div>
                    <div className="text-[12px] text-[#5E6A75] mt-0.5">{relative(n.at)}</div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
        {assistOpen && (
          <div className="absolute right-32 top-14 w-[400px] bg-white rounded-xl shadow-[0_8px_28px_rgba(0,0,0,0.18)] border border-[#E8EBED] p-4" data-agent="workday-assistant">
            <div className="flex items-center gap-2 text-[16px] font-bold">
              <Sparkles size={18} className="text-[#0875E1]" /> Workday Assistant
            </div>
            <div className="text-[13px] text-[#5E6A75] mt-1">Hi {ME.first}, what can I help you with?</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {ASSIST.map(([label, r]) => (
                <button key={label} onClick={() => nav(r)} className="h-8 px-3 rounded-full border border-[#A1AAB3] text-[13px] font-bold hover:bg-[#F0F1F2]">
                  {label}
                </button>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const t = assistQ.trim()
                if (!t) return
                setAssistQ('')
                nav(assistRoute(t))
              }}
              className="mt-3 flex items-center gap-2 h-10 rounded-full border border-[#A1AAB3] px-4 focus-within:border-[#0875E1]"
            >
              <input aria-label="Ask Workday Assistant" value={assistQ} onChange={(e) => setAssistQ(e.target.value)} placeholder="Ask about time off, pay, benefits…" className="flex-1 outline-none text-[14px] bg-transparent" />
            </form>
          </div>
        )}
      </header>
      <main className="flex-1 min-h-0 overflow-auto" data-agent="workday-main" onMouseDown={() => {
          if (notifOpen) setNotifOpen(false)
          if (assistOpen) setAssistOpen(false)
        }}>
        {route.page === 'home' && <Home nav={nav} />}
        {route.page === 'timeoff' && <TimeOffHub nav={nav} />}
        {route.page === 'timeoff-request' && <RequestTimeOff nav={nav} />}
        {route.page === 'timeoff-done' && <TimeOffDone nav={nav} requestId={route.requestId!} />}
        {route.page === 'timeoff-detail' && <TimeOffDetail nav={nav} requestId={route.requestId!} />}
        {route.page === 'team' && <MyTeam nav={nav} />}
        {route.page === 'worker' && <WorkerProfile nav={nav} workerId={route.workerId ?? 'wd-alex'} initialTab={route.tab} />}
        {route.page === 'inbox' && <InboxPage nav={nav} initialTask={route.taskId} />}
        {route.page === 'onboarding' && <HirePage nav={nav} workerId={route.workerId ?? 'wd-jordan'} />}
        {route.page === 'pay' && <PayPage />}
        {route.page === 'benefits' && <BenefitsPage />}
        {route.page === 'performance' && <PerformancePage nav={nav} />}
        {route.page === 'apps' && <AllApps nav={nav} />}
        {route.page === 'search' && <SearchResults nav={nav} q={route.q ?? ''} />}
        {route.page === 'expenses' && <ExpensesPage nav={nav} />}
        {route.page === 'learning' && <LearningPage nav={nav} />}
        {route.page === 'career' && <CareerPage />}
        {route.page === 'goals' && <GoalsPage nav={nav} workerId={route.workerId} />}
        {route.page === 'feedback' && <FeedbackPage nav={nav} />}
        {route.page === 'directory' && <DirectoryPage nav={nav} />}
        {route.page === 'help' && <HelpPage nav={nav} />}
      </main>
    </div>
  )
}

const ASSIST: [string, Route][] = [
  ['Request time off', { page: 'timeoff-request' }],
  ['View my payslip', { page: 'pay' }],
  ['My benefits', { page: 'benefits' }],
  ['Create expense report', { page: 'expenses' }],
  ['Find a course', { page: 'learning' }],
  ['My team', { page: 'team' }],
]

/** keyword routing for the Assistant box; falls back to global search */
function assistRoute(t: string): Route {
  const s = t.toLowerCase()
  const rules: [RegExp, Route][] = [
    [/time ?off|vacation|pto|holiday|leave|sick/, { page: 'timeoff' }],
    [/pay ?slip|payslip|paycheck|salary|pay\b|w-?2/, { page: 'pay' }],
    [/benefit|enrol|medical|dental|vision|401/, { page: 'benefits' }],
    [/expense|receipt|reimburs/, { page: 'expenses' }],
    [/course|learn|training/, { page: 'learning' }],
    [/job|career|opening|apply/, { page: 'career' }],
    [/goal/, { page: 'goals' }],
    [/feedback|recogni|kudos|thank/, { page: 'feedback' }],
    [/team|org ?chart|report/, { page: 'team' }],
    [/task|inbox|approv/, { page: 'inbox' }],
    [/help|policy|how/, { page: 'help' }],
  ]
  return rules.find(([re]) => re.test(s))?.[1] ?? { page: 'search', q: t }
}

export const managerName = (personId: string) => person(person(personId).managerId ?? 'priya').name
