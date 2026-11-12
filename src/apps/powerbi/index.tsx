import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Home24Regular,
  Home24Filled,
  Add24Regular,
  Folder24Regular,
  Folder24Filled,
  Database24Regular,
  Album24Regular,
  Album24Filled,
  Apps24Regular,
  Apps24Filled,
  Trophy24Regular,
  Desktop24Regular,
  BookOpen24Regular,
  Search16Regular,
  Alert20Regular,
  Settings20Regular,
  ArrowDownload20Regular,
  QuestionCircle20Regular,
  PersonFeedback20Regular,
  ChevronRight12Regular,
  Grid20Regular,
  Dismiss16Regular,
  Add16Regular,
  Search20Regular,
  CheckmarkCircle20Filled,
  Info20Filled,
  Flash24Regular,
  MoreHorizontal20Regular,
} from '@fluentui/react-icons'
import type { AppProps } from '@/os/registry'
import { logoUrl } from '@/os/registry'
import { useDesk, useWin } from '@/os/context'
import { Avatar } from '@/components/Avatar'
import { ME } from '@/data/people'
import { db, useCollection } from '@/db/db'
import { ItemIcon, PbiContext, TYPE_LABEL, fmtDT, itemUrl, type Notice, type PbiCtx } from './shared'
import { HomeView } from './Home'
import { WorkspaceView } from './Workspace'
import { ReportView } from './Report'
import { DashboardView } from './Dashboard'
import { ModelView } from './Model'
import { BrowseView, CreateView, FeedbackDialog, ItemSettingsDialog, LearnView, MetricsView, MonitorView, NewWorkspaceDialog, OneLakeView } from './views'

type Route = { kind: 'home' } | { kind: 'workspace'; name: string } | { kind: 'item'; id: string; page: number } | { kind: 'apps' } | { kind: 'other'; label: string }
type HeaderMenu = null | 'launcher' | 'notifications' | 'settings' | 'download' | 'help' | 'account' | 'more' | 'switch' | 'search'

export default function PowerBI({ win, params }: AppProps) {
  const { setUrl, setTitle } = useWin()
  const { isAgent, open: openApp } = useDesk()
  const [hmenu, setHmenu] = useState<HeaderMenu>(null)
  const [dialog, setDialog] = useState<null | 'newWorkspace' | 'feedback' | { settings: string }>(null)
  const [search, setSearch] = useState('')
  const [seenNotes, setSeenNotes] = useState(false)
  const items = useCollection('powerbi.reports')
  const workspaces = useCollection('powerbi.workspaces')
  const [route, setRoute] = useState<Route>({ kind: 'home' })
  const [wsFlyout, setWsFlyout] = useState(false)
  const [wsSearch, setWsSearch] = useState('')
  const [openIds, setOpenIds] = useState<string[]>([])
  const [currentWs, setCurrentWs] = useState('Operations Analytics')
  const [notices, setNotices] = useState<Notice[]>([])
  const timers = useRef<number[]>([])

  useEffect(() => () => timers.current.forEach((t) => clearTimeout(t)), [])

  const openItem = useCallback((id: string, page = 0) => {
    setRoute({ kind: 'item', id, page })
    setOpenIds((o) => (o.includes(id) ? o : [...o, id].slice(-3)))
    setWsFlyout(false)
  }, [])

  const ctx: PbiCtx = useMemo(
    () => ({
      openItem,
      openWorkspace: (name: string) => {
        setRoute({ kind: 'workspace', name })
        setCurrentWs(name)
        setWsFlyout(false)
      },
      goHome: () => setRoute({ kind: 'home' }),
      notify: (n, ttl = 6000) => {
        const id = Math.random().toString(36).slice(2)
        setNotices((list) => [...list.filter((x) => x.kind !== 'progress' || n.kind === 'progress'), { ...n, id }])
        if (ttl) timers.current.push(window.setTimeout(() => setNotices((l) => l.filter((x) => x.id !== id)), ttl))
        return id
      },
      dismiss: (id: string) => setNotices((l) => l.filter((x) => x.id !== id)),
      navigate: (v: string) => {
        setWsFlyout(false)
        setRoute(v === 'apps' ? { kind: 'apps' } : v === 'home' ? { kind: 'home' } : { kind: 'other', label: v })
      },
      itemSettings: (id: string) => setDialog({ settings: id }),
    }),
    [openItem],
  )

  // deep links
  useEffect(() => {
    if (params?.reportId) {
      const rec = items.find((r) => r.id === params.reportId)
      if (rec) {
        openItem(rec.id, Number(params.page ?? 0))
        setCurrentWs(rec.workspace)
      }
    } else if (params?.workspace) {
      setRoute({ kind: 'workspace', name: params.workspace })
      setCurrentWs(params.workspace)
    } else setRoute({ kind: 'home' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [win.nonce])

  const curItem = route.kind === 'item' ? items.find((r) => r.id === route.id) : undefined

  // Edge tab + address bar
  useEffect(() => {
    if (curItem) {
      setUrl(itemUrl(curItem, route.kind === 'item' ? route.page : 0))
      setTitle(`${curItem.name} - Power BI`)
    } else if (route.kind === 'workspace') {
      const w = workspaces.find((x) => x.name === route.name)
      setUrl(`https://app.powerbi.com/groups/${w?.guid ?? 'me'}/list?experience=power-bi`)
      setTitle(`${route.name} - Power BI`)
    } else if (route.kind === 'apps') {
      setUrl('https://app.powerbi.com/groups/me/apps?experience=power-bi')
      setTitle('Apps - Power BI')
    } else if (route.kind === 'other') {
      setUrl(`https://app.powerbi.com/${route.label}?experience=power-bi`)
      setTitle(`${route.label[0].toUpperCase()}${route.label.slice(1)} - Power BI`)
    } else {
      setUrl('https://app.powerbi.com/home?experience=power-bi')
      setTitle('Home - Power BI')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route, curItem?.id])

  const crumbs: string[] =
    route.kind === 'item' && curItem ? [curItem.workspace, curItem.name] : route.kind === 'workspace' ? [route.name] : route.kind === 'apps' ? ['Apps'] : []

  const go = (label: string) => () => {
    setWsFlyout(false)
    setRoute({ kind: 'other', label })
  }
  const isOther = (l: string) => route.kind === 'other' && route.label === l
  const nav: [string, string, any, any, () => void, boolean][] = [
    ['home', 'Home', Home24Regular, Home24Filled, () => setRoute({ kind: 'home' }), route.kind === 'home'],
    ['create', 'Create', Add24Regular, Add24Regular, go('create'), isOther('create')],
    ['browse', 'Browse', Folder24Regular, Folder24Filled, go('browse'), isOther('browse')],
    ['onelake', 'OneLake', Database24Regular, Database24Regular, go('onelake'), isOther('onelake')],
    ['workspaces', 'Workspaces', Album24Regular, Album24Filled, () => setWsFlyout((v) => !v), wsFlyout],
    ['apps', 'Apps', Apps24Regular, Apps24Filled, () => setRoute({ kind: 'apps' }), route.kind === 'apps'],
    ['metrics', 'Metrics', Trophy24Regular, Trophy24Regular, go('metrics'), isOther('metrics')],
    ['monitor', 'Monitor', Desktop24Regular, Desktop24Regular, go('monitor'), isOther('monitor')],
    ['learn', 'Learn', BookOpen24Regular, BookOpen24Regular, go('learn'), isOther('learn')],
  ]

  // notification centre: failed refreshes, shares and exports derived from the data
  const feed = items
    .flatMap((r) => [
      ...(r.history ?? []).filter((h: any) => h.status === 'Failed').slice(0, 1).map((h: any) => ({ id: `${r.id}-${h.id}`, at: h.start, title: `Refresh failed: ${r.name}`, body: h.error, item: r.id, bad: true })),
      ...(r.exports ?? []).slice(0, 1).map((e: any) => ({ id: `${r.id}-exp-${e.at}`, at: e.at, title: `Export ready: ${r.name}`, body: `${e.format} file downloaded`, item: r.id, bad: false })),
      ...((r.sharedWith ?? []).length ? [{ id: `${r.id}-share`, at: r.lastRefreshed, title: `${r.name} is shared`, body: `With ${(r.sharedWith ?? []).length} people`, item: r.id, bad: false }] : []),
    ])
    .sort((a, b) => +new Date(b.at) - +new Date(a.at))
    .slice(0, 8)
  const unread = seenNotes ? 0 : feed.filter((f) => f.bad).length
  const hits = search.trim() ? items.filter((r) => r.name.toLowerCase().includes(search.trim().toLowerCase())).slice(0, 8) : []
  const menuBox = 'absolute z-50 top-10 bg-white text-[#242424] rounded shadow-[0_6.4px_14.4px_rgba(0,0,0,0.13),0_1.2px_3.6px_rgba(0,0,0,0.11)] py-1 text-[13px]'
  const mItem = (l: string, fn: () => void, sub?: string) => (
    <button key={l} onClick={() => (fn(), setHmenu(null))} className="w-full text-left px-3 py-2 hover:bg-[#F3F2F1]">
      <div>{l}</div>
      {sub && <div className="text-[11.5px] text-[#605E5C]">{sub}</div>}
    </button>
  )

  const wsRec = workspaces.find((w) => w.name === currentWs)

  return (
    <PbiContext.Provider value={ctx}>
      <div className="flex-1 min-h-0 flex flex-col bg-[#F5F5F5] text-[#242424] relative" style={{ fontFamily: 'var(--font-win)' }}>
        {/* ── header ── */}
        <div className="h-10 shrink-0 flex items-center bg-[#252423] text-white text-[13px] relative">
          <div className="relative">
            <button onClick={() => setHmenu((m) => (m === 'launcher' ? null : 'launcher'))} className={`w-12 h-10 flex items-center justify-center hover:bg-white/10 ${hmenu === 'launcher' ? 'bg-white/10' : ''}`} aria-label="App launcher">
              <Grid20Regular />
            </button>
            {hmenu === 'launcher' && (
              <div className={`${menuBox} left-1 w-[300px] p-3`} onMouseLeave={() => setHmenu(null)}>
                <div className="text-[13px] font-semibold mb-2 px-1">Microsoft 365</div>
                <div className="grid grid-cols-3 gap-1">
                  {['outlook', 'teams', 'excel', 'word', 'powerpoint', 'explorer'].map((a) => (
                    <button key={a} onClick={() => (openApp(a), setHmenu(null))} className="flex flex-col items-center gap-1 py-2 rounded hover:bg-[#F3F2F1] text-[12px] capitalize">
                      <img src={logoUrl(a)} className="w-7 h-7" alt="" />
                      {a === 'explorer' ? 'OneDrive' : a === 'powerpoint' ? 'PowerPoint' : a}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button onClick={() => setRoute({ kind: 'home' })} className="flex items-center gap-2 pr-3 h-10 font-semibold text-[14px]" data-agent="powerbi-logo" aria-label="Power BI home">
            <img src={logoUrl('powerbi')} className="w-4 h-5" alt="" />
            Power BI
          </button>
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-2 text-[13px]">
              <ChevronRight12Regular className="text-white/60" />
              <button
                className={`hover:underline truncate max-w-[260px] ${i === crumbs.length - 1 ? 'text-white' : 'text-white/85'}`}
                onClick={() => i === 0 && route.kind === 'item' && ctx.openWorkspace(c)}
              >
                {c}
              </button>
              {i === crumbs.length - 1 && curItem && (
                <span className="flex items-center gap-1 text-white/70 text-[12px] ml-1 border-l border-white/30 pl-2">
                  <span className="w-2 h-2 rounded-[2px] bg-[#6BB700]" /> {curItem.sensitivity ?? 'General'}
                </span>
              )}
            </span>
          ))}
          <div className="absolute left-1/2 -translate-x-1/2 w-[360px] max-w-[30%]">
            <div className="h-7 rounded bg-white flex items-center gap-2 px-2 text-[#605E5C]">
              <Search16Regular />
              <input
                data-agent="powerbi-search"
                aria-label="Search"
                placeholder="Search"
                value={search}
                onChange={(e) => (setSearch(e.target.value), setHmenu('search'))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && hits[0]) {
                    openItem(hits[0].id)
                    setSearch('')
                    setHmenu(null)
                  }
                  if (e.key === 'Escape') (setSearch(''), setHmenu(null))
                }}
                className="flex-1 bg-transparent outline-none text-[13px] text-[#242424] placeholder:text-[#605E5C]"
              />
            </div>
            {hmenu === 'search' && search.trim() && (
              <div className={`${menuBox} top-8 left-0 right-0`} onMouseLeave={() => setHmenu(null)}>
                {hits.map((r) => (
                  <button key={r.id} onClick={() => (openItem(r.id), setSearch(''), setHmenu(null))} className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-[#F3F2F1] text-left">
                    <ItemIcon type={r.type} />
                    <span className="min-w-0">
                      <span className="block truncate">{r.name}</span>
                      <span className="block text-[11.5px] text-[#605E5C]">
                        {TYPE_LABEL[r.type]} · {r.workspace}
                      </span>
                    </span>
                  </button>
                ))}
                {!hits.length && <div className="px-3 py-2 text-[#605E5C]">No results for “{search.trim()}”</div>}
              </div>
            )}
          </div>
          <div className="ml-auto flex items-center h-10">
            <div className="flex flex-col leading-[13px] text-[11px] mr-2 text-white/90 px-2">
              <span>Fabric capacity:</span>
              <span className="font-semibold">F64 · North Central US</span>
            </div>
            {(
              [
                [Alert20Regular, 'Notifications', 'notifications'],
                [Settings20Regular, 'Settings', 'settings'],
                [ArrowDownload20Regular, 'Download', 'download'],
                [QuestionCircle20Regular, 'Help & support', 'help'],
                [PersonFeedback20Regular, 'Feedback', null],
              ] as [any, string, HeaderMenu][]
            ).map(([I, l, m]) => (
              <div key={l} className="relative">
                <button
                  aria-label={l}
                  title={l}
                  onClick={() => {
                    if (!m) return setDialog('feedback')
                    if (m === 'notifications') setSeenNotes(true)
                    setHmenu((x) => (x === m ? null : m))
                  }}
                  className={`relative w-10 h-10 flex items-center justify-center hover:bg-white/10 ${hmenu === m && m ? 'bg-white/10' : ''}`}
                >
                  <I />
                  {m === 'notifications' && unread > 0 && <span className="absolute top-1.5 right-2 min-w-[14px] h-[14px] rounded-full bg-[#C50F1F] text-[9px] font-semibold flex items-center justify-center px-0.5">{unread}</span>}
                </button>
                {hmenu === 'notifications' && m === 'notifications' && (
                  <div className={`${menuBox} right-0 w-[360px] py-0`} data-agent="powerbi-notification-center" onMouseLeave={() => setHmenu(null)}>
                    <div className="px-4 py-3 text-[15px] font-semibold border-b border-[#EDEBE9]">Notifications</div>
                    <div className="max-h-[360px] overflow-auto">
                      {feed.map((f) => (
                        <button key={f.id} onClick={() => (openItem(f.item), setHmenu(null))} className="w-full text-left px-4 py-2.5 border-b border-[#F3F2F1] hover:bg-[#F3F2F1]">
                          <div className={`text-[13px] font-semibold ${f.bad ? 'text-[#A4262C]' : ''}`}>{f.title}</div>
                          {f.body && <div className="text-[12px] text-[#605E5C] line-clamp-2">{f.body}</div>}
                          <div className="text-[11px] text-[#A19F9D] mt-0.5">{fmtDT(f.at)}</div>
                        </button>
                      ))}
                      {!feed.length && <div className="px-4 py-6 text-center text-[#605E5C]">You’re all caught up.</div>}
                    </div>
                  </div>
                )}
                {hmenu === 'settings' && m === 'settings' && (
                  <div className={`${menuBox} right-0 w-[280px]`} onMouseLeave={() => setHmenu(null)}>
                    {mItem('Manage connections and gateways', () => setRoute({ kind: 'other', label: 'monitor' }), 'NW-GW-BOS-01 (on-premises) · Offline')}
                    {mItem('Manage personal storage', () => ctx.notify({ kind: 'info', title: 'Personal storage', body: `${items.filter((r) => r.workspace === 'My workspace').length} items · 1.2 GB of 10 GB used` }))}
                    {mItem('Admin portal', () => ctx.notify({ kind: 'info', title: 'Admin portal', body: 'You need the Fabric administrator role to open the admin portal.' }))}
                    {mItem('General settings', () => ctx.notify({ kind: 'info', title: 'Settings', body: 'Language: English (United States) · Time zone: Eastern Time' }))}
                  </div>
                )}
                {hmenu === 'download' && m === 'download' && (
                  <div className={`${menuBox} right-0 w-[260px]`} onMouseLeave={() => setHmenu(null)}>
                    {['Power BI Desktop', 'Data Gateway', 'Paginated Report Builder', 'Power BI for mobile', 'Analyze in Excel updates'].map((l) => mItem(l, () => ctx.notify({ kind: 'success', title: 'Download started', body: l })))}
                  </div>
                )}
                {hmenu === 'help' && m === 'help' && (
                  <div className={`${menuBox} right-0 w-[240px]`} onMouseLeave={() => setHmenu(null)}>
                    {mItem('Learn', () => setRoute({ kind: 'other', label: 'learn' }))}
                    {mItem('Documentation', () => setRoute({ kind: 'other', label: 'learn' }))}
                    {mItem('Community', () => ctx.notify({ kind: 'info', title: 'Community', body: 'community.fabric.microsoft.com opened in a new tab.' }))}
                    {mItem('About Power BI', () => ctx.notify({ kind: 'info', title: 'About Power BI', body: 'Version 13.0.25000 · Fabric capacity F64 · North Central US' }))}
                  </div>
                )}
              </div>
            ))}
            <div className="relative">
              <button onClick={() => setHmenu((x) => (x === 'account' ? null : 'account'))} className="w-10 h-10 flex items-center justify-center hover:bg-white/10 mr-1" aria-label="Account manager for Alex Morgan">
                <Avatar id={ME.id} size={28} />
              </button>
              {hmenu === 'account' && (
                <div className={`${menuBox} right-1 w-[280px] p-4`} onMouseLeave={() => setHmenu(null)}>
                  <div className="flex items-center gap-3">
                    <Avatar id={ME.id} size={44} />
                    <div>
                      <div className="font-semibold">{ME.name}</div>
                      <div className="text-[12px] text-[#605E5C]">{ME.email}</div>
                      <div className="text-[12px] text-[#605E5C]">Power BI Pro · Northwind Global</div>
                    </div>
                  </div>
                  <button onClick={() => (setRoute({ kind: 'workspace', name: 'My workspace' }), setCurrentWs('My workspace'), setHmenu(null))} className="mt-3 text-[13px] text-[#0F6CBD] hover:underline">
                    Open My workspace
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 flex relative">
          {/* ── left nav ── */}
          <div className="w-[64px] shrink-0 bg-white border-r border-[#E1DFDD] flex flex-col items-center pt-1 z-20">
            {nav.map(([id, label, I, IF, on, active]) => (
              <button
                key={id}
                data-agent={`powerbi-nav-${id}`}
                aria-label={label}
                onClick={on}
                className={`w-[58px] h-[50px] my-[1px] rounded flex flex-col items-center justify-center gap-[2px] text-[10px] leading-[12px] ${active ? 'bg-[#EBEBEB] font-semibold' : 'hover:bg-[#F3F2F1]'}`}
              >
                {active ? <IF style={{ width: 22, height: 22 }} /> : <I style={{ width: 22, height: 22 }} className="text-[#424242]" />}
                <span className="truncate max-w-[56px]">{label}</span>
              </button>
            ))}
            <div className="w-9 h-px bg-[#E1DFDD] my-1" />
            <button
              data-agent="powerbi-ws-ops"
              aria-label={currentWs}
              onClick={() => ctx.openWorkspace(currentWs)}
              className={`w-[58px] py-1.5 rounded flex flex-col items-center gap-1 text-[10px] leading-[12px] ${route.kind === 'workspace' ? 'bg-[#EBEBEB] font-semibold' : 'hover:bg-[#F3F2F1]'}`}
            >
              <span className="w-6 h-6 rounded flex items-center justify-center text-white text-[11px] font-semibold" style={{ background: wsRec?.color ?? '#118DFF' }}>
                {currentWs[0]}
              </span>
              <span className="line-clamp-2 text-center px-0.5">{currentWs}</span>
            </button>
            {openIds.map((id) => {
              const r = items.find((x) => x.id === id)
              if (!r) return null
              const active = route.kind === 'item' && route.id === id
              return (
                <button
                  key={id}
                  data-agent={`powerbi-open-${id}`}
                  aria-label={r.name}
                  onClick={() => openItem(id)}
                  className={`w-[58px] py-1.5 mt-0.5 rounded flex flex-col items-center gap-1 text-[10px] leading-[12px] ${active ? 'bg-[#EBEBEB] font-semibold' : 'hover:bg-[#F3F2F1]'}`}
                >
                  <ItemIcon type={r.type} size={22} />
                  <span className="line-clamp-2 text-center px-0.5">{r.name}</span>
                </button>
              )
            })}
            <div className="relative">
              <button onClick={() => setHmenu((x) => (x === 'more' ? null : 'more'))} className="w-[58px] h-8 rounded flex items-center justify-center hover:bg-[#F3F2F1] text-[#424242]" aria-label="More">
                <MoreHorizontal20Regular />
              </button>
              {hmenu === 'more' && (
                <div className={`${menuBox} left-[60px] top-0 w-[240px]`} onMouseLeave={() => setHmenu(null)}>
                  <div className="px-3 py-1 text-[11.5px] font-semibold text-[#605E5C]">Recent</div>
                  {[...items]
                    .filter((r) => r.lastOpened)
                    .sort((a, b) => +new Date(b.lastOpened) - +new Date(a.lastOpened))
                    .slice(0, 6)
                    .map((r) => (
                      <button key={r.id} onClick={() => (openItem(r.id), setHmenu(null))} className="w-full flex items-center gap-2 px-3 h-9 hover:bg-[#F3F2F1] text-left">
                        <ItemIcon type={r.type} size={16} />
                        <span className="truncate">{r.name}</span>
                      </button>
                    ))}
                </div>
              )}
            </div>
            <div className="mt-auto mb-2 flex flex-col items-center relative">
              <button onClick={() => setHmenu((x) => (x === 'switch' ? null : 'switch'))} className="w-[58px] py-1.5 rounded flex flex-col items-center gap-1 text-[10px] hover:bg-[#F3F2F1]" aria-label="Switch experience">
                <img src={logoUrl('powerbi')} className="w-6 h-7" alt="" />
                <span>Power BI</span>
              </button>
              {hmenu === 'switch' && (
                <div className={`${menuBox} left-[60px] top-auto bottom-0 w-[240px]`} onMouseLeave={() => setHmenu(null)}>
                  <div className="px-3 py-1 text-[11.5px] font-semibold text-[#605E5C]">Experiences</div>
                  <div className="px-3 h-9 flex items-center gap-2 font-semibold">
                    <img src={logoUrl('powerbi')} className="w-4 h-5" alt="" /> Power BI ✓
                  </div>
                  {['Data Factory', 'Data Engineering', 'Real-Time Intelligence'].map((l) => (
                    <div key={l} className="px-3 h-9 flex items-center text-[#A19F9D]" title="Not included in your Fabric license">
                      {l}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* workspaces flyout */}
          {wsFlyout && (
            <>
              <div className="absolute inset-0 left-[64px] z-10" onClick={() => setWsFlyout(false)} />
              <div className="absolute left-[64px] top-0 bottom-0 w-[320px] bg-white z-20 shadow-[4px_0_16px_rgba(0,0,0,0.14)] flex flex-col" data-agent="powerbi-ws-flyout">
                <div className="flex items-center justify-between px-4 pt-4 pb-2">
                  <div className="text-[18px] font-semibold">Workspaces</div>
                  <button onClick={() => setWsFlyout(false)} className="w-7 h-7 rounded hover:bg-[#F3F2F1] flex items-center justify-center" aria-label="Close">
                    <Dismiss16Regular />
                  </button>
                </div>
                <div className="px-4 pb-2">
                  <div className="h-8 rounded border border-[#D1D1D1] flex items-center gap-2 px-2">
                    <Search20Regular className="text-[#605E5C]" />
                    <input value={wsSearch} onChange={(e) => setWsSearch(e.target.value)} placeholder="Search" className="flex-1 outline-none text-[13px]" aria-label="Search workspaces" />
                  </div>
                </div>
                <div className="flex-1 overflow-auto px-2">
                  {workspaces
                    .filter((w) => w.name.toLowerCase().includes(wsSearch.toLowerCase()))
                    .map((w) => (
                      <button
                        key={w.id}
                        data-agent={`powerbi-ws-${w.slug}`}
                        aria-label={w.name}
                        onClick={() => ctx.openWorkspace(w.name)}
                        className={`w-full flex items-center gap-3 h-10 px-2 rounded text-left text-[13px] ${w.name === currentWs ? 'bg-[#F0F0F0] font-semibold' : 'hover:bg-[#F5F5F5]'}`}
                      >
                        {w.slug === 'my-workspace' ? (
                          <Avatar id={ME.id} size={24} square />
                        ) : (
                          <span className="w-6 h-6 rounded flex items-center justify-center text-white text-[11px] font-semibold" style={{ background: w.color }}>
                            {w.name[0]}
                          </span>
                        )}
                        <span className="flex-1 truncate">{w.name}</span>
                        {w.capacity.startsWith('Fabric') && <Flash24Regular style={{ width: 14, height: 14 }} className="text-[#605E5C]" />}
                      </button>
                    ))}
                </div>
                <div className="p-4 border-t border-[#EDEBE9]">
                  <button data-agent="powerbi-new-workspace" onClick={() => (setDialog('newWorkspace'), setWsFlyout(false))} className="h-8 px-3 rounded bg-[#117865] text-white text-[13px] font-semibold flex items-center gap-1.5">
                    <Add16Regular /> New workspace
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ── main ── */}
          <div className="flex-1 min-w-0 min-h-0 flex flex-col">
            {route.kind === 'home' && <HomeView />}
            {route.kind === 'other' &&
              (route.label === 'create' ? (
                <CreateView isAgent={isAgent} />
              ) : route.label === 'browse' ? (
                <BrowseView />
              ) : route.label === 'onelake' ? (
                <OneLakeView />
              ) : route.label === 'metrics' ? (
                <MetricsView />
              ) : route.label === 'monitor' ? (
                <MonitorView />
              ) : route.label === 'learn' ? (
                <LearnView onOpen={(t) => ctx.notify({ kind: 'info', title: 'Microsoft Learn', body: `“${t}” opened in a new tab.` })} />
              ) : (
                <HomeView />
              ))}
            {route.kind === 'apps' && <AppsView onOpen={(ws) => ctx.openWorkspace(ws)} />}
            {route.kind === 'workspace' && <WorkspaceView name={route.name} />}
            {route.kind === 'item' && curItem?.type === 'report' && (
              <ReportView key={curItem.id} rec={curItem} page={route.page} nonce={win.nonce} onPage={(p) => setRoute({ kind: 'item', id: curItem.id, page: p })} />
            )}
            {route.kind === 'item' && curItem?.type === 'dashboard' && <DashboardView rec={curItem} />}
            {route.kind === 'item' && (curItem?.type === 'semanticModel' || curItem?.type === 'dataflow') && <ModelView key={curItem.id} rec={curItem} />}
          </div>
        </div>

        {dialog === 'newWorkspace' && (
          <NewWorkspaceDialog
            onClose={() => setDialog(null)}
            onCreated={(n) => {
              setDialog(null)
              ctx.openWorkspace(n)
              ctx.notify({ kind: 'success', title: 'Workspace created', body: n })
            }}
          />
        )}
        {dialog === 'feedback' && <FeedbackDialog onClose={() => setDialog(null)} onDone={() => ctx.notify({ kind: 'success', title: 'Thank you for your feedback' })} />}
        {dialog && typeof dialog === 'object' && items.find((r) => r.id === dialog.settings) && <ItemSettingsDialog rec={items.find((r) => r.id === dialog.settings)} onClose={() => setDialog(null)} />}

        {/* notifications */}
        <div className="absolute right-3 top-[48px] z-50 flex flex-col gap-2 w-[340px] pointer-events-none">
          {notices.map((n) => (
            <div key={n.id} className="pointer-events-auto bg-white rounded shadow-[0_6.4px_14.4px_rgba(0,0,0,0.13),0_1.2px_3.6px_rgba(0,0,0,0.11)] p-3 flex gap-2.5" data-agent="powerbi-notification" role="status">
              {n.kind === 'progress' ? (
                <span className="w-5 h-5 shrink-0 rounded-full border-2 border-[#C7E0F4] border-t-[#0F6CBD] animate-spin" />
              ) : n.kind === 'success' ? (
                <CheckmarkCircle20Filled className="text-[#107C10] shrink-0" />
              ) : (
                <Info20Filled className="text-[#0F6CBD] shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold">{n.title}</div>
                {n.body && <div className="text-[12px] text-[#605E5C] mt-0.5">{n.body}</div>}
              </div>
              <button onClick={() => ctx.dismiss(n.id)} className="w-5 h-5 flex items-center justify-center text-[#605E5C] hover:bg-[#F3F2F1] rounded" aria-label="Dismiss">
                <Dismiss16Regular />
              </button>
            </div>
          ))}
        </div>
      </div>
    </PbiContext.Provider>
  )
}

function AppsView({ onOpen }: { onOpen: (ws: string) => void }) {
  const apps = [
    ['Operations Hub', 'Operations Analytics', '#118DFF', 'Priya Raman'],
    ['Finance Insights', 'Finance', '#12239E', 'Sofia Martinez'],
    ['Sales Command Center', 'Sales Ops', '#E66C37', 'Rachel Goldberg'],
    ['People Pulse', 'People Analytics', '#6B007B', 'Nina Patel'],
  ]
  return (
    <div className="flex-1 overflow-auto bg-white px-8 py-6">
      <div className="text-[20px] font-semibold mb-4">Apps</div>
      <div className="grid grid-cols-4 gap-4 max-w-[1000px]">
        {apps.map(([n, ws, c, o]) => (
          <button key={n} data-agent={`powerbi-app-${n.toLowerCase().replace(/\s+/g, '-')}`} onClick={() => db.get('powerbi.workspaces').some((w) => w.name === ws) && onOpen(ws)} className="text-left border border-[#E1DFDD] rounded-md overflow-hidden hover:shadow-md">
            <div className="h-24 flex items-center justify-center" style={{ background: c }}>
              <span className="text-white text-[28px] font-semibold">{n[0]}</span>
            </div>
            <div className="p-3">
              <div className="text-[14px] font-semibold">{n}</div>
              <div className="text-[12px] text-[#605E5C]">{ws} · {o}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
