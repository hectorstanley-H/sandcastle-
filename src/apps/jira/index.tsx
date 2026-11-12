import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Clock, Star, LayoutGrid, Map as MapIcon, ListTodo, Columns3, CalendarDays, List, FileText, BarChart2, Code2, Filter, LayoutDashboard, Users, ChevronRight,
  MoreHorizontal, X, Share2, Zap, Plus, Box, Rocket, UserPlus, GitBranch,
} from 'lucide-react'
import type { AppProps } from '@/os/registry'
import { logoUrl } from '@/os/registry'
import { useDesk, useWin } from '@/os/context'
import { db, useCollection } from '@/db/db'
import { ME, person } from '@/data/people'
import { Avatar } from '@/components/Avatar'
import { ATL_FONT, TopNav, SideItem, Pop, PopItem, PopHeading, Flag, copyText, Dialog, btnSubtle, btnPrimary, inputAtl, type AtlNotification } from './atlassian'
import { type Issue, type Sprint, JiraFlash, fmtD, usePrefs, useFilters, TypeIcon, ago } from './shared'
import { Board, Backlog } from './Board'
import { IssueModal } from './Issue'
import { CreateModal } from './Create'
import { ListView, FiltersPage, SummaryView, TimelineView, CalendarView, ReportsPage, ForYouPage, TeamsPage, DashboardPage, PlaceholderSpace, IssueTable } from './Views'

// re-exports kept for compatibility with earlier imports
export type { Issue } from './shared'
export { TypeIcon, PriorityIcon } from './shared'

type Tab = 'summary' | 'timeline' | 'backlog' | 'board' | 'calendar' | 'list'
type Page = 'project' | 'foryou' | 'recent' | 'starred' | 'filters' | 'dashboards' | 'teams' | 'reports' | 'development' | 'apps' | 'vp' | 'it' | `space:${string}`

const AUTOMATION: [string, string][] = [
  ['auto-close-subtasks', 'When all child work items are done → transition parent to Done'],
  ['auto-assign-bugs', 'When a Bug is created → assign to the component lead'],
  ['auto-slack-highest', 'When priority is Highest → send a message to #eng-bugs'],
  ['auto-stale', 'Every Monday → comment on work items with no update in 14 days'],
]

export default function Jira({ win, params }: AppProps) {
  const { setUrl, setTitle } = useWin()
  const desk = useDesk()
  const issues = useCollection<Issue>('jira.issues')
  const sprints = useCollection<Sprint>('jira.sprints')
  const spaces = useCollection<{ id: string; name: string; key: string; color: string }>('jira.spaces')
  const filters = useFilters()
  const { prefs, set: setPrefs } = usePrefs()
  const [tab, setTab] = useState<Tab>('board')
  const [page, setPage] = useState<Page>('project')
  const [open, setOpen] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [flag, setFlag] = useState<{ msg: string; at: number } | null>(null)
  const [sidebar, setSidebar] = useState(true)
  const [recent, setRecent] = useState<string[]>([])
  const [filterInit, setFilterInit] = useState<{ jql?: string; filterId?: string; n: number }>({ n: 0 })
  const [menu, setMenu] = useState<null | 'members' | 'more' | 'automation' | 'tabs' | 'spaces'>(null)
  const [newSpace, setNewSpace] = useState<string | null>(null)
  const active = sprints.find((s) => s.state === 'active')
  const flash = useCallback((msg: string) => setFlag({ msg, at: Date.now() }), [])

  useEffect(() => {
    if (params?.issueKey) setOpen(params.issueKey)
    if (params?.view) {
      setTab(params.view)
      setPage('project')
    }
  }, [win.nonce])
  useEffect(() => {
    if (open) setRecent((r) => [open, ...r.filter((k) => k !== open)].slice(0, 20))
  }, [open])
  useEffect(() => {
    const i = open ? issues.find((x) => x.key === open) : undefined
    if (i) {
      setUrl(`https://northwind.atlassian.net/browse/${i.key}`)
      setTitle(`[${i.key}] ${i.summary} - Jira`)
    } else if (page !== 'project') {
      const names: Record<string, string> = { foryou: 'For you', recent: 'Recent', starred: 'Starred', filters: 'Filters', dashboards: 'Dashboards', teams: 'Teams', reports: 'Reports', development: 'Development', apps: 'Apps', vp: 'Vendor Portal', it: 'IT Service Desk' }
      setUrl(`https://northwind.atlassian.net/jira/${page === 'filters' ? 'filters' : page === 'dashboards' ? 'dashboards' : page === 'foryou' ? 'for-you' : `software/projects/OPS/${page}`}`)
      setTitle(`${names[page] ?? 'Jira'} - Jira`)
    } else {
      setUrl(`https://northwind.atlassian.net/jira/software/projects/OPS/${tab === 'board' ? 'boards/12' : tab === 'backlog' ? 'boards/12/backlog' : tab}`)
      setTitle(`${tab === 'board' ? 'OPS board' : tab[0].toUpperCase() + tab.slice(1)} - Operations Platform - Jira`)
    }
  }, [open, tab, page])
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 9000)
    return () => clearTimeout(t)
  }, [toast])

  const tabs: [Tab, any, string][] = [['summary', LayoutGrid, 'Summary'], ['timeline', MapIcon, 'Timeline'], ['backlog', ListTodo, 'Backlog'], ['board', Columns3, 'Board'], ['calendar', CalendarDays, 'Calendar'], ['list', List, 'List']]
  const goTab = (t: Tab) => {
    setPage('project')
    setTab(t)
  }
  const openFilter = (init: { jql?: string; filterId?: string }) => {
    setFilterInit((f) => ({ ...init, n: f.n + 1 }))
    setPage('filters')
  }
  const onSearch = (q: string) => {
    const k = issues.find((i) => i.key.toLowerCase() === q.toLowerCase())
    if (k) setOpen(k.key)
    else openFilter({ jql: `text ~ "${q.replace(/"/g, '')}" ORDER BY updated DESC` })
  }
  const notifications: AtlNotification[] = useMemo(
    () =>
      issues
        .flatMap((i) =>
          [ME.id === i.assignee || ME.id === i.reporter || (i.watchers ?? []).includes(ME.id) ? i.comments.filter((c) => c.author !== ME.id).map((c) => ({ id: c.id, title: <><b>{person(c.author).name}</b> commented on <span className="text-[#1868DB]">{i.key}</span></>, body: c.body, date: c.date, onClick: () => setOpen(i.key) })) : [],
            (i.history ?? []).filter((h) => h.field === 'Assignee' && h.to === ME.name && h.author !== ME.id).map((h) => ({ id: h.id, title: <><b>{person(h.author).name}</b> assigned <span className="text-[#1868DB]">{i.key}</span> to you</>, body: i.summary, date: h.date, onClick: () => setOpen(i.key) })),
          ].flat(),
        )
        .sort((a, b) => +new Date(b.date) - +new Date(a.date))
        .slice(0, 12),
    [issues],
  )
  const rovo = (q: string) => {
    const words = q.toLowerCase().split(/\W+/).filter((w) => w.length > 2)
    return issues
      .map((i) => ({ i, score: words.filter((w) => `${i.key} ${i.summary} ${i.labels.join(' ')} ${i.status} ${i.type} ${i.epic ?? ''}`.toLowerCase().includes(w)).length }))
      .filter((x) => x.score)
      .sort((a, b) => b.score - a.score)
      .map(({ i }) => ({ id: i.id, title: `${i.key} ${i.summary}`, sub: `${i.type} · ${i.status} · ${i.assignee ? person(i.assignee).name : 'Unassigned'}`, onClick: () => setOpen(i.key) }))
  }
  const members = Array.from(new Set(issues.flatMap((i) => [i.assignee, i.reporter]).filter(Boolean)))
  const starredIssues = issues.filter((i) => prefs.starredIssues.includes(i.key))

  return (
    <JiraFlash.Provider value={flash}>
      <div
        className="flex-1 min-h-0 flex flex-col relative text-[#292A2E] bg-white"
        style={{ fontFamily: ATL_FONT }}
        onKeyDown={(e) => {
          const t = e.target as HTMLElement
          if (['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) || t.isContentEditable || open || creating) return
          if (e.key === 'c' && !e.metaKey && !e.ctrlKey) {
            e.preventDefault()
            setCreating(true)
          }
        }}
      >
        <TopNav
          product="jira"
          onCreate={() => setCreating(true)}
          createAgent="jira-create"
          onSearch={onSearch}
          onToggleSidebar={() => setSidebar((s) => !s)}
          onHome={() => goTab('board')}
          notifications={notifications}
          rovo={rovo}
          helpItems={[{ label: 'Keyboard shortcuts: C to create, M to comment', onClick: () => flash('Press C anywhere to create a work item, M in a work item to comment') }, { label: 'JQL search tips', onClick: () => openFilter({ jql: 'assignee = currentUser() AND status != Done' }) }]}
          settingsItems={[{ label: 'Automation rules', onClick: () => { goTab('board'); setMenu('automation') } }, { label: 'Saved filters', onClick: () => setPage('filters') }, { label: 'Dashboards', onClick: () => setPage('dashboards') }]}
        />
        <div className="flex-1 min-h-0 flex">
          {sidebar && (
            <div className="w-[240px] shrink-0 border-r border-[#0B120E24] overflow-auto px-2 py-3 space-y-0.5" data-agent="jira-sidebar">
              <SideItem icon={<UserPlus size={16} />} label="For you" active={page === 'foryou'} onClick={() => setPage('foryou')} agent="jira-nav-foryou" />
              <SideItem icon={<Clock size={16} />} label="Recent" active={page === 'recent'} onClick={() => setPage('recent')} agent="jira-nav-recent" />
              <SideItem icon={<Star size={16} />} label="Starred" active={page === 'starred'} onClick={() => setPage('starred')} agent="jira-nav-starred" />
              <SideItem icon={<Box size={16} />} label="Apps" active={page === 'apps'} onClick={() => setPage('apps')} agent="jira-nav-apps" />
              <SideItem icon={<Rocket size={16} />} label="Plans" active={page === 'project' && tab === 'timeline'} onClick={() => goTab('timeline')} agent="jira-nav-plans" />
              <div className="pt-3 pb-1 px-2 text-[12px] font-semibold text-[#6B6E76] flex items-center justify-between">Spaces <button aria-label="Create space" onClick={() => setNewSpace('')} className="w-5 h-5 rounded hover:bg-[#0515240F] flex items-center justify-center"><Plus size={14} /></button></div>
              <SideItem icon={<span className="w-5 h-5 rounded-[4px] bg-[#FCA700] text-white text-[10px] font-bold flex items-center justify-center">OP</span>} label={<span className="flex items-center gap-1">Operations Platform</span>} active={page === 'project'} onClick={() => setPage('project')} agent="jira-nav-space-ops" />
              <SideItem icon={<span className="w-5 h-5 rounded-[4px] bg-[#6A9A23] text-white text-[10px] font-bold flex items-center justify-center">VP</span>} label="Vendor Portal" active={page === 'vp'} onClick={() => setPage('vp')} />
              <SideItem icon={<span className="w-5 h-5 rounded-[4px] bg-[#AF59E1] text-white text-[10px] font-bold flex items-center justify-center">IT</span>} label="IT Service Desk" active={page === 'it'} onClick={() => setPage('it')} />
              {spaces.map((s) => <SideItem key={s.id} icon={<span className="w-5 h-5 rounded-[4px] text-white text-[10px] font-bold flex items-center justify-center" style={{ background: s.color }}>{s.key.slice(0, 2)}</span>} label={s.name} active={page === `space:${s.id}`} onClick={() => setPage(`space:${s.id}`)} />)}
              <div className="relative">
                <SideItem icon={<ChevronRight size={14} />} label="More spaces" onClick={() => setMenu(menu === 'spaces' ? null : 'spaces')} />
                {menu === 'spaces' && (
                  <Pop onClose={() => setMenu(null)} className="left-2 top-8 w-[240px]">
                    <PopHeading>All spaces</PopHeading>
                    <PopItem onClick={() => { setMenu(null); setPage('project') }}>Operations Platform (OPS)</PopItem>
                    <PopItem onClick={() => { setMenu(null); setPage('vp') }}>Vendor Portal (VP)</PopItem>
                    <PopItem onClick={() => { setMenu(null); setPage('it') }}>IT Service Desk (IT)</PopItem>
                    {spaces.map((s) => <PopItem key={s.id} onClick={() => { setMenu(null); setPage(`space:${s.id}`) }}>{s.name} ({s.key})</PopItem>)}
                    <div className="h-px bg-[#0B120E24] my-1" />
                    <PopItem onClick={() => { setMenu(null); setNewSpace('') }}><Plus size={14} /> Create space</PopItem>
                  </Pop>
                )}
              </div>
              <div className="pt-3" />
              <SideItem icon={<Filter size={16} />} label="Filters" active={page === 'filters'} onClick={() => setPage('filters')} agent="jira-nav-filters" />
              <SideItem icon={<LayoutDashboard size={16} />} label="Dashboards" active={page === 'dashboards'} onClick={() => setPage('dashboards')} agent="jira-nav-dashboards" />
              <SideItem icon={<Users size={16} />} label="Teams" active={page === 'teams'} onClick={() => setPage('teams')} agent="jira-nav-teams" />
              <SideItem icon={<Code2 size={16} />} label="Development" active={page === 'development'} onClick={() => setPage('development')} agent="jira-nav-development" />
              <SideItem icon={<FileText size={16} />} label="Confluence" onClick={() => desk.open('confluence')} agent="jira-nav-confluence" />
              <SideItem icon={<BarChart2 size={16} />} label="Reports" active={page === 'reports'} onClick={() => setPage('reports')} agent="jira-nav-reports" />
            </div>
          )}
          <div className="flex-1 min-w-0 flex flex-col">
            {page === 'project' && (
              <>
                <div className="px-6 pt-4">
                  <div className="text-[14px] text-[#505258]">Spaces</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="w-6 h-6 rounded-[4px] bg-[#FCA700] text-white text-[11px] font-bold flex items-center justify-center">OP</span>
                    <h1 className="text-[20px] font-semibold">Operations Platform</h1>
                    <span className="relative">
                      <button data-atl-trigger aria-label="Space members" onClick={() => setMenu(menu === 'members' ? null : 'members')} className="w-8 h-8 rounded-[4px] hover:bg-[#0515240F] flex items-center justify-center"><Users size={16} /></button>
                      {menu === 'members' && (
                        <Pop onClose={() => setMenu(null)} className="left-0 top-9 w-[260px] max-h-[320px] overflow-auto">
                          <PopHeading>{members.length} members</PopHeading>
                          {members.map((m) => <div key={m} className="px-3 py-1.5 flex items-center gap-2 text-[14px]"><Avatar id={m} size={24} />{person(m).name}<span className="ml-auto text-[12px] text-[#6B6E76]">{person(m).title.split(',')[0]}</span></div>)}
                        </Pop>
                      )}
                    </span>
                    <span className="relative">
                      <button data-atl-trigger aria-label="Space actions" onClick={() => setMenu(menu === 'more' ? null : 'more')} className="w-8 h-8 rounded-[4px] hover:bg-[#0515240F] flex items-center justify-center"><MoreHorizontal size={16} /></button>
                      {menu === 'more' && (
                        <Pop onClose={() => setMenu(null)} className="left-0 top-9 w-[220px]">
                          <PopItem onClick={() => { setMenu(null); setPage('reports') }}>Reports</PopItem>
                          <PopItem onClick={() => { setMenu(null); desk.open('confluence') }}>Open Confluence space</PopItem>
                          <PopItem onClick={() => { setMenu(null); copyText('https://northwind.atlassian.net/jira/software/projects/OPS'); flash('Space link copied') }}>Copy link</PopItem>
                        </Pop>
                      )}
                    </span>
                    <div className="flex-1" />
                    <button onClick={() => { copyText(`https://northwind.atlassian.net/jira/software/projects/OPS/${tab === 'board' ? 'boards/12' : tab}`); flash('Link copied to clipboard') }} className="h-8 px-3 rounded-[4px] bg-[#0515240F] text-[14px] font-medium flex items-center gap-1.5 hover:bg-[#0B120E24]"><Share2 size={14} /> Share</button>
                    <span className="relative">
                      <button data-atl-trigger onClick={() => setMenu(menu === 'automation' ? null : 'automation')} className="h-8 px-3 rounded-[4px] bg-[#0515240F] text-[14px] font-medium flex items-center gap-1.5 hover:bg-[#0B120E24]"><Zap size={14} /> Automation</button>
                      {menu === 'automation' && (
                        <Pop onClose={() => setMenu(null)} className="right-0 top-9 w-[400px]" agent="jira-automation">
                          <PopHeading>Automation rules · Operations Platform</PopHeading>
                          {AUTOMATION.map(([id, label]) => {
                            const on = prefs.automation?.[id] ?? id !== 'auto-stale'
                            return (
                              <label key={id} className="flex items-center gap-3 px-3 py-2 hover:bg-[#0515240F] cursor-pointer text-[14px]">
                                <span className="flex-1">{label}</span>
                                <button role="switch" aria-checked={on} aria-label={label} onClick={() => { setPrefs({ automation: { ...(prefs.automation ?? {}), [id]: !on } }); flash(`Rule ${on ? 'disabled' : 'enabled'}`) }} className={`w-9 h-5 rounded-full relative shrink-0 transition-colors ${on ? 'bg-[#1868DB]' : 'bg-[#8C8F97]'}`}><span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${on ? 'left-[18px]' : 'left-0.5'}`} /></button>
                              </label>
                            )
                          })}
                        </Pop>
                      )}
                    </span>
                  </div>
                  <div className="flex items-end gap-1 mt-2 border-b-2 border-[#0B120E14]">
                    {tabs.map(([id, I, l]) => (
                      <button key={id} data-agent={`jira-tab-${id}`} onClick={() => goTab(id)} className={`relative h-10 px-2.5 flex items-center gap-1.5 text-[14px] font-medium -mb-[2px] border-b-2 ${tab === id ? 'border-[#1868DB] text-[#1868DB]' : 'border-transparent text-[#505258] hover:text-[#292A2E]'}`}>
                        <I size={15} /> {l}
                      </button>
                    ))}
                    <span className="relative">
                      <button data-atl-trigger aria-label="Add view" onClick={() => setMenu(menu === 'tabs' ? null : 'tabs')} className="h-10 px-2 text-[#505258] hover:text-[#292A2E]"><Plus size={16} /></button>
                      {menu === 'tabs' && (
                        <Pop onClose={() => setMenu(null)} className="left-0 top-10 w-[200px]">
                          <PopHeading>More views</PopHeading>
                          <PopItem onClick={() => { setMenu(null); setPage('reports') }}><BarChart2 size={14} /> Reports</PopItem>
                          <PopItem onClick={() => { setMenu(null); setPage('development') }}><Code2 size={14} /> Development</PopItem>
                          <PopItem onClick={() => { setMenu(null); setPage('filters') }}><Filter size={14} /> Filters</PopItem>
                          <PopItem onClick={() => { setMenu(null); setPage('dashboards') }}><LayoutDashboard size={14} /> Dashboard</PopItem>
                        </Pop>
                      )}
                    </span>
                  </div>
                </div>
                {tab === 'board' && (
                  <>
                    <div className="px-6 pt-3 flex items-baseline gap-3">
                      <h2 className="text-[20px] font-semibold" data-agent="jira-sprint-name">{active?.name ?? 'OPS board'}</h2>
                      <span className="text-[13px] text-[#505258]">{active ? `${fmtD(active.start)} – ${fmtD(active.end)} · Goal: ${active.goal}` : 'No active sprint'}</span>
                    </div>
                    <Board sprint={active} issues={issues} onOpen={setOpen} onBacklog={() => goTab('backlog')} onCreate={() => setCreating(true)} />
                  </>
                )}
                {tab === 'backlog' && <Backlog sprints={sprints} issues={issues} onOpen={setOpen} />}
                {tab === 'list' && <ListView issues={issues.filter((i) => i.type !== 'Epic')} onOpen={setOpen} sprints={sprints} />}
                {tab === 'summary' && <SummaryView issues={issues} sprints={sprints} onOpen={setOpen} onFilter={(jql) => openFilter({ jql })} />}
                {tab === 'timeline' && <TimelineView issues={issues} sprints={sprints} onOpen={setOpen} />}
                {tab === 'calendar' && <CalendarView issues={issues} sprints={sprints} onOpen={setOpen} />}
              </>
            )}
            {page === 'foryou' && <ForYouPage issues={issues} recent={recent} onOpen={setOpen} />}
            {page === 'recent' && (
              <div className="flex-1 overflow-auto px-8 py-6">
                <h1 className="text-[24px] font-semibold mb-4">Recent</h1>
                {recent.length ? <IssueTable rows={recent.map((k) => issues.find((i) => i.key === k)).filter(Boolean) as Issue[]} sprints={sprints} onOpen={setOpen} /> : <div className="text-[14px] text-[#505258]">Work items you view will show up here.</div>}
                <h2 className="text-[16px] font-semibold mt-8 mb-2">Recently updated in Operations Platform</h2>
                {[...issues].sort((a, b) => +new Date(b.updated) - +new Date(a.updated)).slice(0, 8).map((i) => (
                  <button key={i.id} onClick={() => setOpen(i.key)} className="w-full flex items-center gap-3 h-10 px-2 rounded hover:bg-[#F8F8F8] text-left text-[14px]"><TypeIcon type={i.type} /><span className="text-[#1868DB] text-[13px] w-[64px]">{i.key}</span><span className="flex-1 truncate">{i.summary}</span><span className="text-[12px] text-[#6B6E76]">{ago(i.updated)}</span></button>
                ))}
              </div>
            )}
            {page === 'starred' && (
              <div className="flex-1 overflow-auto px-8 py-6">
                <h1 className="text-[24px] font-semibold mb-4">Starred</h1>
                <h2 className="text-[16px] font-semibold mb-2">Work items</h2>
                {starredIssues.length ? <IssueTable rows={starredIssues} sprints={sprints} onOpen={setOpen} /> : <div className="text-[14px] text-[#505258]">Star work items from their ••• menu to keep them handy.</div>}
                <h2 className="text-[16px] font-semibold mt-8 mb-2">Filters</h2>
                {filters.filter((f) => prefs.starredFilters.includes(f.id)).map((f) => <button key={f.id} onClick={() => openFilter({ filterId: f.id })} className="w-full flex items-center gap-2 h-9 px-2 rounded hover:bg-[#F8F8F8] text-left text-[14px]"><Star size={14} fill="#E2B203" className="text-[#E2B203]" />{f.name}</button>)}
              </div>
            )}
            {page === 'filters' && <FiltersPage key={filterInit.n} issues={issues} sprints={sprints} onOpen={setOpen} initial={filterInit} />}
            {page === 'dashboards' && <DashboardPage issues={issues} sprints={sprints} onOpen={setOpen} onFilter={(jql) => openFilter({ jql })} />}
            {page === 'teams' && <TeamsPage issues={issues} onFilter={(jql) => openFilter({ jql })} />}
            {page === 'reports' && <ReportsPage issues={issues} sprints={sprints} />}
            {page === 'development' && (
              <div className="flex-1 overflow-auto px-8 py-6">
                <h1 className="text-[24px] font-semibold mb-1">Development</h1>
                <div className="text-[14px] text-[#505258] mb-4">Branches created from work items in Operations Platform (northwind/ops-platform).</div>
                {issues.filter((i) => i.branch).map((i) => (
                  <div key={i.id} className="flex items-center gap-3 h-11 px-2 border-b border-[#0B120E14] text-[14px]">
                    <GitBranch size={15} className="text-[#505258]" /><code className="text-[13px] flex-1 truncate">{i.branch}</code>
                    <button onClick={() => setOpen(i.key)} className="text-[#1868DB] hover:underline">{i.key}</button>
                    <button className={btnSubtle} onClick={() => { copyText(`git checkout ${i.branch}`); flash('Checkout command copied') }}>Copy checkout</button>
                  </div>
                ))}
                {!issues.some((i) => i.branch) && <div className="text-[14px] text-[#505258] py-8">No branches yet. Open a work item and use <b>Development › Create branch</b>.</div>}
              </div>
            )}
            {page === 'apps' && (
              <div className="flex-1 overflow-auto px-8 py-6">
                <h1 className="text-[24px] font-semibold mb-4">Apps</h1>
                <div className="grid grid-cols-3 gap-4">
                  {[['slack', 'Jira Cloud for Slack', 'Get notified and create work items from Slack'], ['confluence', 'Confluence', 'Link pages and release notes to work items'], ['zendesk', 'Zendesk Support for Jira', 'Escalate support tickets to engineering'], ['servicenow', 'ServiceNow ITSM', 'Sync major incidents with Jira bugs'], ['teams', 'Jira Cloud for Microsoft Teams', 'Collaborate on work items in Teams']].map(([id, n, d]) => (
                    <div key={id} className="rounded-[8px] border border-[#0B120E24] p-4">
                      <img src={logoUrl(id)} className="w-8 h-8 object-contain" alt="" />
                      <div className="font-semibold mt-2">{n}</div>
                      <div className="text-[13px] text-[#505258]">{d}</div>
                      <div className="flex items-center gap-2 mt-3"><span className="text-[12px] text-[#216E4E] bg-[#DCFFF1] rounded px-1.5">Installed</span><button className="text-[13px] text-[#1868DB] hover:underline" onClick={() => desk.open(id)}>Open</button></div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {page === 'vp' && <PlaceholderSpace name="Vendor Portal" color="#6A9A23" abbr="VP" />}
            {page === 'it' && <PlaceholderSpace name="IT Service Desk" color="#AF59E1" abbr="IT" />}
            {page.startsWith('space:') && (() => {
              const s = spaces.find((x) => `space:${x.id}` === page)
              return s ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
                  <span className="w-14 h-14 rounded-[8px] text-white text-[20px] font-bold flex items-center justify-center" style={{ background: s.color }}>{s.key.slice(0, 2)}</span>
                  <div className="text-[20px] font-semibold mt-4">{s.name}</div>
                  <div className="text-[14px] text-[#505258] mt-1">This space doesn’t have any work items yet.</div>
                  <button className={btnSubtle + ' mt-3 text-[#AE2E24]'} onClick={() => { db.remove('jira.spaces', s.id); setPage('project'); flash(`${s.name} moved to trash`) }}>Delete space</button>
                </div>
              ) : null
            })()}
          </div>
        </div>
        {open && <IssueModal issueKey={open} onClose={() => setOpen(null)} onOpenIssue={setOpen} />}
        {creating && <CreateModal onClose={() => setCreating(false)} onCreated={(k) => { setCreating(false); setToast(k) }} />}
        {toast && (
          <div className="absolute left-6 bottom-6 z-50 w-[380px] bg-white rounded-[8px] shadow-[0_8px_12px_#1E1F2126,0_0_1px_#1E1F214F] p-4 flex gap-3" data-agent="jira-toast">
            <span className="w-6 h-6 rounded-full bg-[#22A06B] text-white flex items-center justify-center text-[13px] shrink-0">✓</span>
            <div className="flex-1">
              <div className="text-[14px] font-semibold"><span data-agent="jira-toast-key">{toast}</span> has been created</div>
              <button onClick={() => { setOpen(toast); setToast(null) }} className="text-[14px] text-[#1868DB] mt-1 hover:underline">View work item</button>
            </div>
            <button onClick={() => setToast(null)}><X size={16} /></button>
          </div>
        )}
        {flag && !toast && <Flag key={flag.at} onClose={() => setFlag(null)} agent="jira-flag">{flag.msg}</Flag>}
        {newSpace !== null && (
          <Dialog
            title="Create space"
            onClose={() => setNewSpace(null)}
            footer={<><button className={btnSubtle} onClick={() => setNewSpace(null)}>Cancel</button><button className={btnPrimary} disabled={!newSpace.trim()} onClick={() => {
              const name = newSpace.trim()
              const key = name.split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 4) || 'NEW'
              const id = `sp-${Date.now().toString(36)}`
              db.insert('jira.spaces', { id, name, key, color: ['#1868DB', '#E06C00', '#22A06B', '#C9372C'][name.length % 4] })
              setNewSpace(null)
              setPage(`space:${id}`)
              flash(`${name} (${key}) created`)
            }}>Create</button></>}
          >
            <div className="text-[12px] font-semibold text-[#505258] mb-1">Name <span className="text-[#C9372C]">*</span></div>
            <input autoFocus value={newSpace} onChange={(e) => setNewSpace(e.target.value)} className={inputAtl} aria-label="Space name" placeholder="e.g. Warehouse Automation" />
            <div className="text-[12px] text-[#6B6E76] mt-2">Key: {newSpace.trim() ? newSpace.trim().split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 4) : '—'} · Template: Scrum (team-managed)</div>
          </Dialog>
        )}
      </div>
    </JiraFlash.Provider>
  )
}
