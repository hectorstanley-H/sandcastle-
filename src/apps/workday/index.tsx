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
  }

  const notifications = useMemo(
    () => [
      { id: 'n1', text: 'Your Time Off request for August has been approved by Priya Raman', at: '2026-06-18T18:30:00.000Z' },
      { id: 'n2', text: 'Jordan Ellis accepted the offer for Operations Analyst', at: new Date(Date.now() - 4 * 864e5).toISOString() },
      { id: 'n3', text: 'Open Enrollment closes Friday at 11:59 PM ET', at: new Date(Date.now() - 6 * 864e5).toISOString() },
      { id: 'n4', text: 'Your payslip for October 15 is available', at: new Date(Date.now() - 6 * 864e5).toISOString() },
    ],
    [],
  )

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
        <button aria-label="Workday Assistant" className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-[#F0F1F2] text-[#5E6A75]">
          <Sparkles size={20} />
        </button>
        <button data-agent="workday-notifications" aria-label="Notifications" onClick={() => setNotifOpen((o) => !o)} className="relative w-10 h-10 rounded-full flex items-center justify-center hover:bg-[#F0F1F2] text-[#5E6A75]">
          <Bell size={20} />
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#DE2E21] text-white text-[11px] font-bold flex items-center justify-center">4</span>
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
            <div className="px-4 py-2 text-[16px] font-bold">Notifications</div>
            {notifications.map((n) => (
              <div key={n.id} className="px-4 py-2.5 hover:bg-[#F6F7F8] flex gap-3">
                <span className="mt-1.5 w-2 h-2 rounded-full bg-[#0875E1] shrink-0" />
                <div>
                  <div className="text-[13.5px] leading-snug">{n.text}</div>
                  <div className="text-[12px] text-[#5E6A75] mt-0.5">{relative(n.at)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </header>
      <main className="flex-1 min-h-0 overflow-auto" data-agent="workday-main" onMouseDown={() => notifOpen && setNotifOpen(false)}>
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
      </main>
    </div>
  )
}

export const managerName = (personId: string) => person(person(personId).managerId ?? 'priya').name
