import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  Bell,
  ChevronDown,
  CircleHelp,
  Clock,
  Database,
  Eye,
  FolderOpen,
  Grid3x3,
  House,
  Image as ImageIcon,
  LayoutGrid,
  List,
  MoreHorizontal,
  Search,
  Send,
  Sparkles,
  Star,
  Trash2,
  Users,
} from 'lucide-react'
import { Line, LineChart, ResponsiveContainer } from 'recharts'
import type { AppProps } from '@/os/registry'
import { logoUrl } from '@/os/registry'
import { useDesk, useWin } from '@/os/context'
import { db, uid, useCollection } from '@/db/db'
import { Avatar } from '@/components/Avatar'
import { ME, person } from '@/data/people'
import { computeMetrics, T10, k } from './metrics'
import { WorkbookView } from './Workbook'
import { sheetsFor } from './Dashboards'
import { Dialog, Menu, MenuButton, SidePanel, TabNav, ago, btnPrimary, btnSecondary, field, useTab, useToastState, type MItem, type Page } from './ui'

const HOST = 'https://prod-useast-b.online.tableau.com/#/site/northwind'
const PROJECTS = ['Sales', 'Marketing', 'Finance', 'Operations', 'Customer Success', 'Samples']

export default function Tableau({ win, params }: AppProps) {
  const { setUrl, setTitle } = useWin()
  const [page, setPage] = useState<Page>('home')
  const [wbId, setWbId] = useState('wb-pipeline')
  const [project, setProject] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [panel, setPanel] = useState<null | 'agent'>(null)
  const [modal, setModal] = useState<null | 'project' | 'upload' | 'shortcuts' | 'about' | 'account'>(null)
  const { toast, show } = useToastState()
  const wbs = useCollection<any>('tableau.workbooks')
  useEffect(() => {
    if (!params) return
    if (params.workbookId) {
      setWbId(params.workbookId)
      setPage('workbook')
    } else if (params.page) setPage(params.page)
  }, [win.nonce])
  const wb = wbs.find((w) => w.id === wbId)
  useEffect(() => {
    if (page === 'workbook') {
      setUrl(`${HOST}/views/${(wb?.name ?? '').replace(/\s+/g, '')}/PipelineOverview?:iid=1`)
      setTitle(`${wb?.name ?? 'Workbook'} - Tableau Cloud`)
    } else {
      const label: Record<string, string> = { home: 'Home', explore: 'Explore', favorites: 'Favorites', recents: 'Recents', shared: 'Shared with Me', pulse: 'Tableau Pulse', collections: 'Collections', recommendations: 'Recommendations', external: 'External Assets', search: 'Search' }
      setUrl(`${HOST}/${page === 'home' ? 'home' : page === 'explore' ? 'explore' : page === 'pulse' ? 'pulse' : page}`)
      setTitle(`${label[page] ?? page} - Tableau Cloud`)
    }
  }, [page, wbId, win.id])
  const openWb = (id: string) => {
    setWbId(id)
    setPage('workbook')
    const w = db.find<any>('tableau.workbooks', id)
    if (w) db.update('tableau.workbooks', id, { lastViewed: new Date().toISOString(), viewsCount: (w.viewsCount ?? 0) + 1 })
  }
  const go = (p: Page, opts?: { project?: string | null; q?: string }) => {
    setProject(opts?.project ?? null)
    if (opts?.q != null) setQ(opts.q)
    setPage(p)
  }
  const createWorkbook = () => {
    const id = uid('wb')
    const n = wbs.filter((w) => /^Untitled Workbook/.test(w.name)).length + 1
    db.insert('tableau.workbooks', { id, name: `Untitled Workbook ${n}`, project: 'Sales', owner: ME.id, views: 1, updated: new Date().toISOString(), viewsCount: 0, thumb: 'blank', createdBy: 'user' })
    openWb(id)
  }

  const nav: [Page, any, string][] = [
    ['home', House, 'Home'],
    ['favorites', Star, 'Favorites'],
    ['recents', Clock, 'Recents'],
    ['shared', Users, 'Shared with Me'],
    ['explore', FolderOpen, 'Explore'],
  ]
  const extra: [Page, any, string][] = [
    ['pulse', Activity, 'Tableau Pulse'],
    ['collections', LayoutGrid, 'Collections'],
    ['recommendations', Eye, 'Recommendations'],
    ['external', ImageIcon, 'External Assets'],
  ]

  return (
    <TabNav.Provider value={{ go, openWb, toast: show }}>
      <div className="flex-1 min-h-0 flex flex-col bg-white text-[#1F1F1F] relative" style={{ fontFamily: "'Inter', 'Benton Sans', Arial, sans-serif" }}>
        {/* header */}
        <div className="h-[52px] shrink-0 flex items-center px-3 gap-3 border-b border-[#E6E6E6] bg-white relative z-30">
          <MenuButton
            className="w-8 h-8 flex items-center justify-center text-[#555] rounded hover:bg-[#F0F0F0]"
            label="Menu"
            menuClass="left-0 top-9"
            width={240}
            items={[
              { label: 'Tableau Cloud', header: true },
              { label: 'Home', onClick: () => go('home') },
              { label: 'Tableau Pulse', onClick: () => go('pulse') },
              { label: 'Data Management', onClick: () => go('external') },
              { divider: true, label: '' },
              { label: 'Tableau Prep (web)', onClick: () => show('Tableau Prep opens in a new browser tab.') },
            ]}
          >
            <Grid3x3 size={18} />
          </MenuButton>
          <img src={logoUrl('tableau')} className="h-6" alt="" />
          <span className="text-[16px] font-semibold text-[#333]">Tableau</span>
          <span className="text-[16px] text-[#666] -ml-1">Cloud</span>
          <span className="h-6 w-px bg-[#DDD] mx-1" />
          <MenuButton
            className="flex items-center gap-1 text-[13px] text-[#333] h-8 px-1.5 rounded hover:bg-[#F0F0F0]"
            menuClass="left-0 top-9"
            width={220}
            items={[
              { label: 'Sites', header: true },
              { label: 'Northwind', checked: true },
              { label: 'Northwind Sandbox', checked: false, onClick: () => show('You don’t have a site role on Northwind Sandbox. Ask a site admin for access.') },
            ]}
          >
            Northwind <ChevronDown size={14} />
          </MenuButton>
          <div className="flex-1 flex justify-center">
            <GlobalSearch wbs={wbs} onSubmit={(s) => go('search', { q: s })} />
          </div>
          <button onClick={() => setPanel(panel === 'agent' ? null : 'agent')} className={`h-8 px-3 rounded-full border border-[#1F457E] text-[13px] font-semibold flex items-center gap-1 ${panel === 'agent' ? 'bg-[#1F457E] text-white' : 'text-[#1F457E]'}`}>
            <Sparkles size={14} /> Tableau Agent
          </button>
          <MenuButton
            className="w-8 h-8 flex items-center justify-center text-[#555] rounded hover:bg-[#F0F0F0]"
            label="Help"
            menuClass="right-0 top-9"
            width={220}
            items={[
              { label: 'Help', onClick: () => show('Tableau Help opens in a new browser tab.') },
              { label: 'What’s New', onClick: () => go('pulse') },
              { label: 'Keyboard Shortcuts', onClick: () => setModal('shortcuts') },
              { label: 'About Tableau Cloud', onClick: () => setModal('about') },
            ]}
          >
            <CircleHelp size={18} />
          </MenuButton>
          <Notifications />
          <ProfileMenu onSettings={() => setModal('account')} />
        </div>
        <div className="flex-1 min-h-0 flex relative">
          {page !== 'workbook' && (
            <div className="w-[210px] shrink-0 border-r border-[#E6E6E6] py-3 bg-[#FAFAFA]">
              <div className="mx-3 mb-3 relative">
                <MenuButton
                  className="h-9 w-[186px] rounded-[4px] bg-[#1F457E] text-white text-[13px] font-semibold flex items-center justify-center gap-1"
                  menuClass="left-0 top-10"
                  width={200}
                  agent="tableau-new"
                  items={[
                    { label: 'Workbook', onClick: createWorkbook },
                    { label: 'Upload Workbook', onClick: () => setModal('upload') },
                    { label: 'Project', onClick: () => setModal('project') },
                    { label: 'Metric', onClick: () => go('pulse') },
                    { label: 'Collection', onClick: () => go('collections') },
                  ]}
                >
                  + New <ChevronDown size={13} />
                </MenuButton>
              </div>
              {nav.map(([id, I, l]) => (
                <button key={id} data-agent={`tableau-nav-${id}`} aria-label={l} onClick={() => go(id)} className={`w-full h-9 px-5 flex items-center gap-3 text-[13.5px] ${page === id ? 'bg-[#E1EBF6] text-[#1F457E] font-semibold border-l-[3px] border-[#1F457E]' : 'text-[#333] hover:bg-[#F0F0F0]'}`}>
                  <I size={16} /> {l}
                </button>
              ))}
              <div className="mx-5 my-3 h-px bg-[#E6E6E6]" />
              {extra.map(([id, I, l]) => (
                <button key={id} data-agent={`tableau-nav-${id}`} onClick={() => go(id)} className={`w-full h-9 px-5 flex items-center gap-3 text-[13.5px] ${page === id ? 'bg-[#E1EBF6] text-[#1F457E] font-semibold border-l-[3px] border-[#1F457E]' : 'text-[#333] hover:bg-[#F0F0F0]'}`}>
                  <I size={16} /> {l}
                </button>
              ))}
            </div>
          )}
          <div className="flex-1 min-w-0 overflow-auto">
            {page === 'workbook' && wb ? (
              <WorkbookView key={wb.id} wb={wb} back={() => go('explore')} />
            ) : page === 'pulse' ? (
              <PulsePage />
            ) : page === 'collections' ? (
              <CollectionsPage wbs={wbs} />
            ) : page === 'recommendations' ? (
              <Recommendations wbs={wbs} />
            ) : page === 'external' ? (
              <ExternalAssets wbs={wbs} />
            ) : page === 'search' ? (
              <SearchPage q={q} wbs={wbs} />
            ) : (
              <Browse key={page} page={page} wbs={wbs} open={openWb} project={project} setProject={setProject} />
            )}
          </div>
          {panel === 'agent' && <AgentPanel onClose={() => setPanel(null)} />}
        </div>
        {toast && <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-[4px] bg-[#333] text-white text-[13px] shadow-lg">{toast}</div>}
        {modal === 'project' && <ProjectDialog onClose={() => setModal(null)} onDone={(n) => { show(`Project “${n}” created`); go('explore', { project: n }) }} />}
        {modal === 'upload' && <UploadDialog onClose={() => setModal(null)} onDone={(id) => openWb(id)} />}
        {modal === 'shortcuts' && (
          <Dialog title="Keyboard Shortcuts" onClose={() => setModal(null)} footer={<button className={btnPrimary} onClick={() => setModal(null)}>Close</button>}>
            <table className="w-full text-[13px] m-4" style={{ width: 'calc(100% - 32px)' }}>
              <tbody>{[['Undo', 'Ctrl + Z'], ['Redo', 'Ctrl + Y'], ['Refresh data', 'F5'], ['Full screen', 'F7'], ['Search', '/'], ['Download', 'Ctrl + Shift + D']].map(([a, b]) => <tr key={a} className="border-b border-[#F0F0F0] h-8"><td>{a}</td><td className="text-right font-mono text-[12px]">{b}</td></tr>)}</tbody>
            </table>
          </Dialog>
        )}
        {modal === 'about' && (
          <Dialog title="About Tableau Cloud" onClose={() => setModal(null)} footer={<button className={btnPrimary} onClick={() => setModal(null)}>Close</button>}>
            <div className="p-5 text-[13px] space-y-1"><div>Tableau Cloud 2026.3</div><div>Site: Northwind (prod-useast-b)</div><div>Signed in as {ME.name} · Creator</div></div>
          </Dialog>
        )}
        {modal === 'account' && <AccountDialog onClose={() => setModal(null)} onSaved={() => show('Account settings saved')} />}
      </div>
    </TabNav.Provider>
  )
}

/* ───────────── header widgets ───────────── */
function GlobalSearch({ wbs, onSubmit }: { wbs: any[]; onSubmit: (q: string) => void }) {
  const { openWb, go } = useTab()
  const [q, setQ] = useState('')
  const [focus, setFocus] = useState(false)
  const n = q.trim().toLowerCase()
  const res = n
    ? [
        ...wbs.filter((w) => w.name.toLowerCase().includes(n)).map((w) => ({ k: 'Workbook', t: w.name, s: w.project, run: () => openWb(w.id) })),
        ...wbs.flatMap((w) => (w.id === 'wb-pipeline' ? ['Pipeline Overview', 'Pipeline by Rep', 'Win/Loss', 'Deal Detail'] : sheetsFor(w)).filter((s) => s.toLowerCase().includes(n)).map((s) => ({ k: 'View', t: s, s: w.name, run: () => openWb(w.id) }))),
        ...PULSE.filter((m) => m.name.toLowerCase().includes(n)).map((m) => ({ k: 'Metric', t: m.name, s: 'Tableau Pulse', run: () => go('pulse') })),
      ].slice(0, 8)
    : []
  return (
    <div className="relative">
      <div className={`flex items-center h-9 w-[560px] rounded-full border px-4 gap-2 text-[#777] ${focus ? 'border-[#1F457E]' : 'border-[#CCC]'}`}>
        <Search size={15} />
        <input
          data-agent="tableau-search"
          aria-label="Search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setFocus(true)}
          onBlur={() => setTimeout(() => setFocus(false), 150)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && q.trim()) {
              onSubmit(q.trim())
              setFocus(false)
            }
          }}
          placeholder="Search for views, metrics, workbooks, and more"
          className="flex-1 outline-none text-[13px] text-[#333] bg-transparent placeholder:text-[#777]"
        />
      </div>
      {focus && n && (
        <div className="absolute top-10 left-0 w-[560px] bg-white border border-[#DDD] rounded-[6px] shadow-[0_6px_20px_rgba(0,0,0,0.18)] py-1 z-50">
          {res.map((r, i) => (
            <button key={i} onMouseDown={() => { r.run(); setQ('') }} className="w-full h-10 px-4 flex items-center gap-3 text-left hover:bg-[#F0F4FA]">
              <span className="w-16 text-[11px] font-semibold uppercase text-[#777]">{r.k}</span>
              <span className="flex-1 text-[13px] text-[#1F457E] truncate">{r.t}</span>
              <span className="text-[12px] text-[#777] truncate max-w-[160px]">{r.s}</span>
            </button>
          ))}
          {!res.length && <div className="px-4 py-3 text-[13px] text-[#777]">No suggestions. Press Enter to search everything.</div>}
          <button onMouseDown={() => onSubmit(q.trim())} className="w-full h-9 px-4 text-left text-[13px] text-[#1F457E] border-t border-[#EEE] hover:bg-[#F0F4FA]">See all results for “{q.trim()}”</button>
        </div>
      )}
    </div>
  )
}

function Notifications() {
  const { openWb, go } = useTab()
  const [open, setOpen] = useState(false)
  const subs = useCollection<any>('tableau.subscriptions')
  const alerts = useCollection<any>('tableau.alerts')
  const comments = useCollection<any>('tableau.comments')
  const shares = useCollection<any>('tableau.shares')
  const read = useCollection<any>('tableau.notifRead')
  const wbs = useCollection<any>('tableau.workbooks')
  const name = (id: string) => wbs.find((w) => w.id === id)?.name ?? 'a workbook'
  const items = useMemo(
    () =>
      [
        { id: 'n-extract', title: 'Extract refresh succeeded', body: 'Salesforce (live) — Sales Pipeline Overview data source refreshed.', at: new Date(Date.now() - 3 * 3600_000).toISOString(), run: () => openWb('wb-pipeline') },
        { id: 'n-pulse', title: 'Pulse digest', body: 'Open Pipeline is up 6.2% vs last week.', at: new Date(Date.now() - 20 * 3600_000).toISOString(), run: () => go('pulse') },
        ...comments.filter((c) => c.authorId !== ME.id).map((c) => ({ id: `n-c-${c.id}`, title: `${person(c.authorId).name} commented on ${name(c.wbId)}`, body: c.body, at: c.date, run: () => openWb(c.wbId) })),
        ...subs.map((s) => ({ id: `n-s-${s.id}`, title: 'Subscription created', body: `${s.subject} · ${s.freq}`, at: s.createdAt, run: () => openWb(s.wbId) })),
        ...alerts.map((a) => ({ id: `n-a-${a.id}`, title: 'Data-driven alert created', body: `${a.name} (${a.op.toLowerCase()} ${k(a.threshold)})`, at: a.createdAt, run: () => openWb(a.wbId) })),
        ...shares.map((s) => ({ id: `n-sh-${s.id}`, title: `You shared ${name(s.wbId)}`, body: `With ${s.to.map((t: string) => person(t).name).join(', ')}`, at: s.at, run: () => openWb(s.wbId) })),
      ].sort((a, b) => +new Date(b.at) - +new Date(a.at)),
    [subs, alerts, comments, shares, wbs],
  )
  const unread = items.filter((n) => !read.some((r) => r.id === n.id)).length
  return (
    <span className="relative inline-flex">
      <button aria-label="Notifications" onClick={() => setOpen(!open)} className="relative w-8 h-8 flex items-center justify-center text-[#555] rounded hover:bg-[#F0F0F0]">
        <Bell size={18} />
        {unread > 0 && <span className="absolute top-0.5 right-0.5 min-w-[15px] h-[15px] px-1 rounded-full bg-[#C8102E] text-white text-[10px] font-bold leading-[15px]">{unread}</span>}
      </button>
      {open && (
        <NotifPanel
          items={items}
          read={read}
          onClose={() => setOpen(false)}
          onMarkAll={() => items.forEach((n) => db.upsert('tableau.notifRead', { id: n.id }))}
          onOpen={(n) => {
            db.upsert('tableau.notifRead', { id: n.id })
            setOpen(false)
            n.run()
          }}
        />
      )}
    </span>
  )
}

function NotifPanel({ items, read, onClose, onMarkAll, onOpen }: { items: any[]; read: any[]; onClose: () => void; onMarkAll: () => void; onOpen: (n: any) => void }) {
  return (
    <Menu
      onClose={onClose}
      className="right-0 top-9"
      width={380}
      items={[
        { label: <span className="flex items-center w-[330px]"><span className="flex-1 normal-case text-[13px] text-[#333]">Notifications</span></span>, header: true },
        { label: 'Mark all as read', onClick: onMarkAll },
        { divider: true, label: '' },
        ...items.slice(0, 8).map((n) => ({
          label: (
            <span className="flex flex-col py-1 leading-tight whitespace-normal w-[320px]">
              <span className={`text-[13px] ${read.some((r) => r.id === n.id) ? '' : 'font-semibold'}`}>{n.title}</span>
              <span className="text-[12px] text-[#777] truncate">{n.body}</span>
              <span className="text-[11px] text-[#999]">{ago(n.at)}</span>
            </span>
          ),
          onClick: () => onOpen(n),
        })),
      ].map((x) => ({ ...x, label: x.label })) as MItem[]}
    />
  )
}

function ProfileMenu({ onSettings }: { onSettings: () => void }) {
  const { close } = useWin()
  const { go } = useTab()
  return (
    <MenuButton
      className="rounded-full"
      label="Account"
      menuClass="right-0 top-9"
      width={230}
      items={[
        { label: <span className="flex flex-col leading-tight"><span className="font-semibold">{ME.name}</span><span className="text-[11px] text-[#777]">{ME.email}</span></span>, disabled: true },
        { divider: true, label: '' },
        { label: 'My Content', onClick: () => go('explore') },
        { label: 'My Account Settings', onClick: onSettings },
        { label: 'Favorites', onClick: () => go('favorites') },
        { divider: true, label: '' },
        { label: 'Sign Out', onClick: () => close() },
      ]}
    >
      <Avatar id={ME.id} size={30} />
    </MenuButton>
  )
}

function AccountDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const prefs = useCollection<any>('tableau.prefs').find((p) => p.id === 'account') ?? {}
  const [tz, setTz] = useState(prefs.tz ?? '(GMT-05:00) Eastern Time')
  const [lang, setLang] = useState(prefs.lang ?? 'English (United States)')
  const [mails, setMails] = useState<boolean>(prefs.mails ?? true)
  return (
    <Dialog title="My Account Settings" width={500} onClose={onClose} footer={<><button className={btnSecondary} onClick={onClose}>Cancel</button><button className={btnPrimary} onClick={() => { db.upsert('tableau.prefs', { id: 'account', tz, lang, mails }); onSaved(); onClose() }}>Save Changes</button></>}>
      <div className="p-5 space-y-3 text-[13px]">
        <div><div className="font-semibold mb-1">Display name</div><div className={`${field} flex items-center bg-[#F5F5F5]`}>{ME.name}</div></div>
        <div><div className="font-semibold mb-1">Language</div><select value={lang} onChange={(e) => setLang(e.target.value)} className={field}>{['English (United States)', 'English (United Kingdom)', 'Français', 'Deutsch', '日本語'].map((x) => <option key={x}>{x}</option>)}</select></div>
        <div><div className="font-semibold mb-1">Time zone for subscriptions</div><select value={tz} onChange={(e) => setTz(e.target.value)} className={field}>{['(GMT-08:00) Pacific Time', '(GMT-05:00) Eastern Time', '(GMT+00:00) London', '(GMT+01:00) Paris'].map((x) => <option key={x}>{x}</option>)}</select></div>
        <label className="flex items-center gap-2"><input type="checkbox" checked={mails} onChange={(e) => setMails(e.target.checked)} /> Email me when someone comments or shares content with me</label>
      </div>
    </Dialog>
  )
}

/* ───────────── browse (home / explore / favorites / recents / shared) ───────────── */
function Thumb({ kind }: { kind: string }) {
  const bars = [0.8, 0.55, 0.9, 0.4, 0.65, 0.3]
  return (
    <div className="h-[130px] bg-white border-b border-[#E6E6E6] p-3 flex gap-2">
      <div className="flex-1 flex items-end gap-1">
        {bars.map((b, i) => <div key={i} className="flex-1 rounded-t-[1px]" style={{ height: `${b * 100}%`, background: T10[(i + kind.length) % 10] }} />)}
      </div>
      <div className="w-[38%] flex flex-col gap-1.5">
        <div className="h-5 rounded bg-[#EEF3F8]" />
        <div className="h-5 rounded bg-[#EEF3F8]" />
        <svg viewBox="0 0 60 30" className="flex-1"><polyline fill="none" stroke={T10[kind.length % 10]} strokeWidth="2" points="0,25 10,18 20,21 30,10 40,13 50,5 60,8" /></svg>
      </div>
    </div>
  )
}

type SortKey = 'modified' | 'name' | 'views' | 'owner'
function Browse({ page, wbs, open, project, setProject }: { page: Page; wbs: any[]; open: (id: string) => void; project: string | null; setProject: (p: string | null) => void }) {
  const { go, toast } = useTab()
  const dbProjects = useCollection<any>('tableau.projects')
  const collections = useCollection<any>('tableau.collections')
  const [grid, setGrid] = useState(true)
  const [sort, setSort] = useState<SortKey>('modified')
  const [content, setContent] = useState<'workbooks' | 'views' | 'sources'>('workbooks')
  const [addTo, setAddTo] = useState<any>(null)
  const projects = [...PROJECTS, ...dbProjects.map((p) => p.name).filter((n) => !PROJECTS.includes(n))]
  let list = page === 'favorites' ? wbs.filter((w) => w.favorite) : page === 'shared' ? wbs.filter((w) => w.owner !== 'alex') : wbs
  if (page === 'explore' && project) list = list.filter((w) => w.project === project)
  if (page === 'recents' || page === 'home') list = [...list].sort((a, b) => +new Date(b.lastViewed ?? b.updated) - +new Date(a.lastViewed ?? a.updated))
  else
    list = [...list].sort((a, b) =>
      sort === 'name' ? a.name.localeCompare(b.name) : sort === 'views' ? (b.viewsCount ?? 0) - (a.viewsCount ?? 0) : sort === 'owner' ? person(a.owner).name.localeCompare(person(b.owner).name) : +new Date(b.updated) - +new Date(a.updated),
    )
  const fav = (w: any) => db.update('tableau.workbooks', w.id, { favorite: !w.favorite })
  const cardMenu = (w: any): MItem[] => [
    { label: 'Open', onClick: () => open(w.id) },
    { label: w.favorite ? 'Remove from Favorites' : 'Add to Favorites', onClick: () => fav(w) },
    { label: 'Add to Collection…', onClick: () => setAddTo(w) },
    ...(w.createdBy === 'user'
      ? [{ divider: true, label: '' }, { label: 'Delete…', onClick: () => { db.remove('tableau.workbooks', w.id); toast(`“${w.name}” was deleted`) } }]
      : []),
  ]
  const sortLabel = { modified: 'Last Modified', name: 'Name (A–Z)', views: 'Most Viewed', owner: 'Owner' }[sort]
  const views = list.flatMap((w) => (w.id === 'wb-pipeline' ? ['Pipeline Overview', 'Pipeline by Rep', 'Win/Loss', 'Deal Detail'] : sheetsFor(w)).map((s) => ({ s, w })))
  return (
    <div className="p-7">
      {page === 'home' && (
        <div className="mb-6 rounded-[8px] p-6 text-white flex items-center gap-6" style={{ background: 'linear-gradient(120deg,#1F457E 0%,#2E6DB4 60%,#5FA0E0 100%)' }}>
          <div className="flex-1">
            <div className="text-[22px] font-semibold">Good afternoon, {ME.first}</div>
            <div className="text-[14px] opacity-90 mt-1">3 of your favorite metrics changed this week. Pipeline is up 6.2% vs last week.</div>
          </div>
          <div className="flex gap-3">
            {[['Open Pipeline', 'Sales'], ['Bookings QTD', 'Finance'], ['Win Rate', 'Sales']].map(([m, s]) => <button key={m} onClick={() => go('pulse')} className="text-left bg-white/15 hover:bg-white/25 rounded-[6px] px-4 py-2 text-[12px]"><div className="font-semibold text-[13px]">{m}</div><div className="opacity-80">{s} · Pulse</div></button>)}
          </div>
        </div>
      )}
      <div className="flex items-center gap-3 mb-4">
        <h1 className="text-[22px] font-semibold flex-1 flex items-center gap-2">
          {page === 'home' ? 'Recents' : page === 'explore' ? 'Explore' : page === 'favorites' ? 'Favorites' : page === 'recents' ? 'Recents' : 'Shared with Me'}
          {page === 'explore' && project && (
            <span className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full bg-[#E1EBF6] text-[13px] font-normal text-[#1F457E]">
              <FolderOpen size={13} /> {project}
              <button aria-label="Clear project filter" onClick={() => setProject(null)} className="ml-1">×</button>
            </span>
          )}
        </h1>
        {page === 'explore' && (
          <MenuButton className="h-8 px-3 border border-[#CCC] rounded-[4px] text-[13px] flex items-center gap-1" menuClass="right-0 top-9" width={200} items={[{ label: 'All Workbooks', checked: content === 'workbooks', onClick: () => setContent('workbooks') }, { label: 'All Views', checked: content === 'views', onClick: () => setContent('views') }, { label: 'All Data Sources', checked: content === 'sources', onClick: () => setContent('sources') }]}>
            {content === 'workbooks' ? 'All Workbooks' : content === 'views' ? 'All Views' : 'All Data Sources'} <ChevronDown size={13} />
          </MenuButton>
        )}
        <MenuButton className="h-8 px-3 border border-[#CCC] rounded-[4px] text-[13px] flex items-center gap-1" menuClass="right-0 top-9" width={190} items={(['modified', 'name', 'views', 'owner'] as SortKey[]).map((s) => ({ label: { modified: 'Last Modified', name: 'Name (A–Z)', views: 'Most Viewed', owner: 'Owner' }[s], checked: sort === s, onClick: () => setSort(s) }))}>
          Sort By: {sortLabel} <ChevronDown size={13} />
        </MenuButton>
        <div className="flex border border-[#CCC] rounded-[4px]">
          <button aria-label="Grid view" onClick={() => setGrid(true)} className={`w-8 h-8 flex items-center justify-center ${grid ? 'bg-[#E1EBF6]' : ''}`}><LayoutGrid size={14} /></button>
          <button aria-label="List view" onClick={() => setGrid(false)} className={`w-8 h-8 flex items-center justify-center ${!grid ? 'bg-[#E1EBF6]' : ''}`}><List size={14} /></button>
        </div>
      </div>
      {page === 'explore' && (
        <div className="flex gap-4 mb-5 flex-wrap">
          {projects.map((p) => (
            <button key={p} onClick={() => setProject(project === p ? null : p)} className={`w-[150px] h-[70px] rounded-[6px] border flex items-center gap-2 px-3 text-left ${project === p ? 'border-[#1F457E] bg-[#E1EBF6]' : 'border-[#E6E6E6] bg-[#FAFAFA] hover:border-[#BBB]'}`}>
              <FolderOpen size={22} className="text-[#E8762C]" />
              <div><div className="text-[13px] font-semibold">{p}</div><div className="text-[11px] text-[#777]">{wbs.filter((w) => w.project === p).length} workbooks</div></div>
            </button>
          ))}
        </div>
      )}
      {page === 'explore' && content === 'views' ? (
        <table className="w-full text-[13px]">
          <thead><tr className="text-left text-[#555] border-b border-[#E6E6E6] h-9">{['View', 'Workbook', 'Project', 'Owner'].map((h) => <th key={h} className="font-semibold">{h}</th>)}</tr></thead>
          <tbody>{views.map(({ s, w }) => <tr key={w.id + s} className="h-10 border-b border-[#F0F0F0]"><td><button onClick={() => open(w.id)} className="text-[#1F457E] font-semibold hover:underline">{s}</button></td><td>{w.name}</td><td>{w.project}</td><td>{person(w.owner).name}</td></tr>)}</tbody>
        </table>
      ) : page === 'explore' && content === 'sources' ? (
        <table className="w-full text-[13px]">
          <thead><tr className="text-left text-[#555] border-b border-[#E6E6E6] h-9">{['Data Source', 'Type', 'Connection', 'Used by'].map((h) => <th key={h} className="font-semibold">{h}</th>)}</tr></thead>
          <tbody>{ASSETS.map((a) => <tr key={a.name} className="h-10 border-b border-[#F0F0F0]"><td className="font-semibold text-[#1F457E]"><button className="hover:underline" onClick={() => go('external')}>{a.name}</button></td><td>{a.type}</td><td>{a.db}</td><td>{a.used.length} workbooks</td></tr>)}</tbody>
        </table>
      ) : grid ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-5">
          {list.map((w) => (
            <div key={w.id} className="relative group">
              <button data-agent={`tableau-wb-${w.id}`} aria-label={w.name} onClick={() => open(w.id)} className="w-full text-left rounded-[6px] border border-[#E0E0E0] overflow-hidden hover:shadow-[0_4px_14px_rgba(0,0,0,0.12)] bg-white">
                <Thumb kind={w.thumb} />
                <div className="p-3">
                  <div className="text-[14px] font-semibold text-[#1F457E] flex items-center gap-1 pr-6">{w.name} {w.favorite && <Star size={12} className="fill-[#F2B705] text-[#F2B705]" />}</div>
                  <div className="text-[12px] text-[#777] mt-0.5">{w.project} · {w.views} views · {(w.viewsCount ?? 0).toLocaleString()} views</div>
                  <div className="text-[12px] text-[#777]">Modified {new Date(w.updated).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {person(w.owner).name}</div>
                </div>
              </button>
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                <button aria-label={w.favorite ? `Remove ${w.name} from favorites` : `Add ${w.name} to favorites`} onClick={() => fav(w)} className="w-7 h-7 rounded bg-white/90 border border-[#DDD] flex items-center justify-center">
                  <Star size={13} className={w.favorite ? 'fill-[#F2B705] text-[#F2B705]' : 'text-[#777]'} />
                </button>
              </div>
              <div className="absolute bottom-2 right-2">
                <MenuButton label={`More actions for ${w.name}`} className="w-7 h-7 rounded hover:bg-[#F0F0F0] flex items-center justify-center text-[#555]" menuClass="right-0 bottom-8" width={210} items={() => cardMenu(w)}>
                  <MoreHorizontal size={15} />
                </MenuButton>
              </div>
            </div>
          ))}
          {!list.length && <div className="col-span-full py-16 text-center text-[13px] text-[#777]">{page === 'favorites' ? 'You haven’t added any favorites yet. Click the star on a workbook to add it here.' : 'No content to show.'}</div>}
        </div>
      ) : (
        <table className="w-full text-[13px]">
          <thead><tr className="text-left text-[#555] border-b border-[#E6E6E6] h-9">{['', 'Name', 'Project', 'Owner', 'Views', 'Modified', ''].map((h, i) => <th key={i} className="font-semibold">{h}</th>)}</tr></thead>
          <tbody>
            {list.map((w) => (
              <tr key={w.id} className="h-10 border-b border-[#F0F0F0] hover:bg-[#FAFAFA]">
                <td className="w-8"><button aria-label="Toggle favorite" onClick={() => fav(w)}><Star size={13} className={w.favorite ? 'fill-[#F2B705] text-[#F2B705]' : 'text-[#BBB]'} /></button></td>
                <td><button onClick={() => open(w.id)} className="text-[#1F457E] font-semibold">{w.name}</button></td>
                <td>{w.project}</td>
                <td>{person(w.owner).name}</td>
                <td>{w.viewsCount}</td>
                <td>{new Date(w.updated).toLocaleDateString()}</td>
                <td className="w-10"><MenuButton label={`More actions for ${w.name}`} className="w-7 h-7 rounded hover:bg-[#F0F0F0] flex items-center justify-center text-[#555]" menuClass="right-0 top-8" width={210} items={() => cardMenu(w)}><MoreHorizontal size={15} /></MenuButton></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {addTo && (
        <Dialog title={`Add “${addTo.name}” to a collection`} onClose={() => setAddTo(null)} footer={<button className={btnSecondary} onClick={() => setAddTo(null)}>Close</button>}>
          <div className="p-4 text-[13px]">
            {collections.map((c) => {
              const has = (c.items ?? []).includes(addTo.id)
              return (
                <div key={c.id} className="flex items-center gap-2 h-9 border-b border-[#F0F0F0]">
                  <LayoutGrid size={14} className="text-[#777]" />
                  <span className="flex-1">{c.name}</span>
                  <button className="text-[#1F457E] hover:underline" onClick={() => { db.update('tableau.collections', c.id, { items: has ? c.items.filter((x: string) => x !== addTo.id) : [...(c.items ?? []), addTo.id] }); toast(has ? `Removed from ${c.name}` : `Added to ${c.name}`) }}>{has ? 'Remove' : 'Add'}</button>
                </div>
              )
            })}
            {!collections.length && <div className="text-[#777]">No collections yet. Create one from the Collections page.</div>}
          </div>
        </Dialog>
      )}
    </div>
  )
}

function ProjectDialog({ onClose, onDone }: { onClose: () => void; onDone: (n: string) => void }) {
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  return (
    <Dialog title="New Project" onClose={onClose} footer={<><button className={btnSecondary} onClick={onClose}>Cancel</button><button className={btnPrimary} disabled={!name.trim()} onClick={() => { db.insert('tableau.projects', { id: uid('prj'), name: name.trim(), description: desc, owner: ME.id, createdAt: new Date().toISOString() }); onDone(name.trim()); onClose() }}>Create</button></>}>
      <div className="p-5 space-y-3 text-[13px]">
        <div><div className="font-semibold mb-1">Name</div><input autoFocus value={name} onChange={(e) => setName(e.target.value)} className={field} /></div>
        <div><div className="font-semibold mb-1">Description</div><textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} className="w-full border border-[#CCC] rounded-[3px] px-2 py-1.5 outline-none focus:border-[#1F457E]" /></div>
      </div>
    </Dialog>
  )
}

const LOCAL_TWBX: [string, string][] = [
  ['Regional Ops KPIs.twbx', 'sla'],
  ['Renewal Cohorts.twbx', 'health'],
  ['Q4 Bookings Review.twbx', 'arr'],
]
function UploadDialog({ onClose, onDone }: { onClose: () => void; onDone: (id: string) => void }) {
  const dbProjects = useCollection<any>('tableau.projects')
  const [file, setFile] = useState(LOCAL_TWBX[0][0])
  const [project, setProject] = useState('Sales')
  return (
    <Dialog
      title="Upload Workbook"
      onClose={onClose}
      footer={
        <>
          <button className={btnSecondary} onClick={onClose}>Cancel</button>
          <button
            className={btnPrimary}
            onClick={() => {
              const id = uid('wb')
              db.insert('tableau.workbooks', { id, name: file.replace(/\.twbx$/, ''), project, owner: ME.id, views: sheetsFor({ thumb: LOCAL_TWBX.find(([f]) => f === file)![1] }).length, updated: new Date().toISOString(), viewsCount: 0, thumb: LOCAL_TWBX.find(([f]) => f === file)![1], createdBy: 'user' })
              onClose()
              onDone(id)
            }}
          >
            Upload
          </button>
        </>
      }
    >
      <div className="p-5 space-y-3 text-[13px]">
        <div className="rounded border-2 border-dashed border-[#CCC] p-5 text-center text-[#777]">Drag a .twb or .twbx file here, or choose one below</div>
        <div><div className="font-semibold mb-1">File</div><select value={file} onChange={(e) => setFile(e.target.value)} className={field}>{LOCAL_TWBX.map(([f]) => <option key={f}>{f}</option>)}</select></div>
        <div><div className="font-semibold mb-1">Project</div><select value={project} onChange={(e) => setProject(e.target.value)} className={field}>{[...PROJECTS, ...dbProjects.map((p) => p.name)].map((p) => <option key={p}>{p}</option>)}</select></div>
      </div>
    </Dialog>
  )
}

/* ───────────── Tableau Pulse ───────────── */
type PulseDef = { id: string; name: string; group: string; value: (m: any, x: any) => string; raw: (m: any, x: any) => number; delta: number; good: boolean }
const PULSE: PulseDef[] = [
  { id: 'open-pipeline', name: 'Open Pipeline', group: 'Sales', value: (m) => k(m.openTotal), raw: (m) => m.openTotal, delta: 6.2, good: true },
  { id: 'bookings-qtd', name: 'Bookings QTD', group: 'Finance', value: (m) => k(m.wonQtd), raw: (m) => m.wonQtd, delta: 3.4, good: true },
  { id: 'win-rate', name: 'Win Rate', group: 'Sales', value: (m) => `${m.winRate}%`, raw: (m) => m.winRate, delta: -1.8, good: false },
  { id: 'weighted', name: 'Weighted Pipeline', group: 'Sales', value: (m) => k(m.weighted), raw: (m) => m.weighted, delta: 4.1, good: true },
  { id: 'avg-deal', name: 'Average Deal Size', group: 'Sales', value: (m) => k(m.avgDeal), raw: (m) => m.avgDeal, delta: 2.3, good: true },
  { id: 'mqls', name: 'Marketing Qualified Leads', group: 'Marketing', value: (_m, x) => String(x.mqls), raw: (_m, x) => x.mqls, delta: 12.5, good: true },
  { id: 'open-tickets', name: 'Open Support Tickets', group: 'Customer Success', value: (_m, x) => String(x.tickets), raw: (_m, x) => x.tickets, delta: -8.0, good: true },
]

function usePulseData() {
  const opps = useCollection<any>('salesforce.opportunities')
  const accts = useCollection<any>('salesforce.accounts')
  const hs = useCollection<any>('hubspot.contacts')
  const tickets = useCollection<any>('hubspot.tickets')
  const m = useMemo(() => computeMetrics(opps, accts), [opps, accts])
  return { m, x: { mqls: hs.filter((c) => c.lifecycleStage === 'Marketing Qualified Lead').length, tickets: tickets.length } }
}

function PulsePage() {
  const { toast } = useTab()
  const follows = useCollection<any>('tableau.pulseFollows')
  const { m, x } = usePulseData()
  const [tab, setTab] = useState<'following' | 'all'>(follows.length ? 'following' : 'all')
  const [sel, setSel] = useState<string | null>(null)
  const isF = (id: string) => follows.some((f) => f.id === id)
  const list = tab === 'following' ? PULSE.filter((p) => isF(p.id)) : PULSE
  const spark = (p: PulseDef, i: number) => Array.from({ length: 10 }).map((_, j) => ({ v: p.raw(m, x) * (1 - (p.delta / 100) * ((9 - j) / 9)) + ((j * 37 + i * 11) % 7) * (p.raw(m, x) / 200) }))
  const cur = PULSE.find((p) => p.id === sel)
  return (
    <div className="p-7">
      <div className="flex items-center gap-3 mb-1">
        <Activity size={22} className="text-[#1F457E]" />
        <h1 className="text-[22px] font-semibold flex-1">Tableau Pulse</h1>
      </div>
      <div className="text-[13px] text-[#555] mb-4">Your metrics, with AI-generated insights. Follow metrics to get them in your weekly digest.</div>
      <div className="flex gap-4 border-b border-[#E6E6E6] mb-5 text-[14px]">
        {(['following', 'all'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`h-9 relative ${tab === t ? 'font-semibold text-[#1F457E]' : 'text-[#555]'}`}>
            {t === 'following' ? `Following (${follows.length})` : 'All Metrics'}
            {tab === t && <span className="absolute left-0 right-0 bottom-0 h-[2px] bg-[#1F457E]" />}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
        {list.map((p, i) => (
          <div key={p.id} className={`rounded-[8px] border bg-white p-4 cursor-pointer ${sel === p.id ? 'border-[#1F457E] shadow-[0_0_0_1px_#1F457E]' : 'border-[#E0E0E0] hover:shadow-[0_4px_14px_rgba(0,0,0,0.1)]'}`} onClick={() => setSel(sel === p.id ? null : p.id)}>
            <div className="flex items-start">
              <div className="flex-1">
                <div className="text-[13px] font-semibold text-[#333]">{p.name}</div>
                <div className="text-[11px] text-[#777]">{p.group}</div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (isF(p.id)) db.remove('tableau.pulseFollows', p.id)
                  else db.insert('tableau.pulseFollows', { id: p.id, at: new Date().toISOString() })
                  toast(isF(p.id) ? `Unfollowed ${p.name}` : `Following ${p.name}`)
                }}
                className={`h-7 px-2.5 rounded-full text-[12px] border ${isF(p.id) ? 'bg-[#1F457E] text-white border-[#1F457E]' : 'border-[#1F457E] text-[#1F457E]'}`}
              >
                {isF(p.id) ? 'Following' : 'Follow'}
              </button>
            </div>
            <div className="text-[28px] font-bold text-[#333] mt-2">{p.value(m, x)}</div>
            <div className={`text-[12px] font-semibold ${p.delta >= 0 === p.good ? 'text-[#2F7D32]' : 'text-[#C62828]'}`}>{p.delta >= 0 ? '▲' : '▼'} {Math.abs(p.delta)}% vs last week</div>
            <div className="h-[40px] mt-2"><ResponsiveContainer><LineChart data={spark(p, i)}><Line dataKey="v" stroke={T10[i % 10]} strokeWidth={2} dot={false} isAnimationActive={false} /></LineChart></ResponsiveContainer></div>
          </div>
        ))}
        {!list.length && <div className="col-span-full py-12 text-center text-[13px] text-[#777]">You’re not following any metrics yet. Switch to All Metrics and click Follow.</div>}
      </div>
      {cur && (
        <div className="mt-5 rounded-[8px] border border-[#D9E3FF] bg-gradient-to-b from-[#F4F7FF] to-white p-5">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-[#1F457E]"><Sparkles size={15} /> Insights for {cur.name}</div>
          <ul className="list-disc pl-5 text-[13.5px] leading-[1.7] mt-2">
            <li>{cur.name} is {cur.value(m, x)}, {cur.delta >= 0 ? 'up' : 'down'} {Math.abs(cur.delta)}% compared with the previous week.</li>
            {cur.group === 'Sales' && <li>The largest contributor is {[...m.byStage].sort((a: any, b: any) => b.amount - a.amount)[0].stage} ({k([...m.byStage].sort((a: any, b: any) => b.amount - a.amount)[0].amount)}).</li>}
            {cur.group === 'Sales' && <li>{m.slipping.length} open deals closing this quarter are at 50% probability or lower — watch them for slippage.</li>}
            {cur.id === 'bookings-qtd' && <li>Closed won over the trailing 12 months is {k(m.wonTotal)}.</li>}
            {cur.id === 'mqls' && <li>Most new MQLs came from the AI-Powered Ops Summit webinar.</li>}
            {cur.id === 'open-tickets' && <li>High-priority tickets make up the majority of the backlog this week.</li>}
          </ul>
        </div>
      )}
    </div>
  )
}

/* ───────────── collections ───────────── */
function CollectionsPage({ wbs }: { wbs: any[] }) {
  const { openWb, toast } = useTab()
  const cols = useCollection<any>('tableau.collections')
  const [sel, setSel] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const cur = cols.find((c) => c.id === sel)
  if (cur)
    return (
      <div className="p-7">
        <button onClick={() => setSel(null)} className="text-[13px] text-[#1F457E] hover:underline mb-2">← All collections</button>
        <div className="flex items-center gap-3 mb-1">
          <LayoutGrid size={20} className="text-[#1F457E]" />
          <h1 className="text-[22px] font-semibold flex-1">{cur.name}</h1>
          {cur.owner === ME.id && <button className={btnSecondary} onClick={() => { db.remove('tableau.collections', cur.id); setSel(null); toast(`Collection “${cur.name}” deleted`) }}><Trash2 size={13} className="inline -mt-0.5 mr-1" />Delete</button>}
        </div>
        <div className="text-[13px] text-[#555] mb-5">{cur.description} · Owner: {person(cur.owner).name}</div>
        <table className="w-full text-[13px]">
          <thead><tr className="text-left text-[#555] border-b border-[#E6E6E6] h-9">{['Name', 'Project', 'Owner', ''].map((h, i) => <th key={i} className="font-semibold">{h}</th>)}</tr></thead>
          <tbody>
            {(cur.items ?? []).map((id: string) => wbs.find((w) => w.id === id)).filter(Boolean).map((w: any) => (
              <tr key={w.id} className="h-10 border-b border-[#F0F0F0]">
                <td><button className="text-[#1F457E] font-semibold hover:underline" onClick={() => openWb(w.id)}>{w.name}</button></td>
                <td>{w.project}</td>
                <td>{person(w.owner).name}</td>
                <td className="text-right"><button className="text-[12px] text-[#777] hover:text-[#C00]" onClick={() => db.update('tableau.collections', cur.id, { items: cur.items.filter((x: string) => x !== w.id) })}>Remove</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!(cur.items ?? []).length && <div className="py-10 text-center text-[13px] text-[#777]">This collection is empty. Use “Add to Collection” from a workbook’s menu.</div>}
      </div>
    )
  return (
    <div className="p-7">
      <div className="flex items-center gap-3 mb-4">
        <h1 className="text-[22px] font-semibold flex-1">Collections</h1>
        <button className={btnPrimary} onClick={() => setCreating(true)}>New Collection</button>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
        {cols.map((c) => (
          <button key={c.id} onClick={() => setSel(c.id)} className="text-left rounded-[8px] border border-[#E0E0E0] bg-white p-4 hover:shadow-[0_4px_14px_rgba(0,0,0,0.1)]">
            <div className="flex items-center gap-2"><LayoutGrid size={16} className="text-[#1F457E]" /><span className="text-[14px] font-semibold text-[#1F457E]">{c.name}</span></div>
            <div className="text-[12px] text-[#777] mt-1 line-clamp-2">{c.description}</div>
            <div className="text-[12px] text-[#555] mt-2">{(c.items ?? []).length} items · {person(c.owner).name}</div>
          </button>
        ))}
        {!cols.length && <div className="col-span-full py-12 text-center text-[13px] text-[#777]">No collections yet.</div>}
      </div>
      {creating && (
        <Dialog title="New Collection" onClose={() => setCreating(false)} footer={<><button className={btnSecondary} onClick={() => setCreating(false)}>Cancel</button><button className={btnPrimary} disabled={!name.trim()} onClick={() => { const id = uid('col'); db.insert('tableau.collections', { id, name: name.trim(), description: desc, owner: ME.id, items: [], createdAt: new Date().toISOString() }); setCreating(false); setName(''); setDesc(''); setSel(id) }}>Create</button></>}>
          <div className="p-5 space-y-3 text-[13px]">
            <div><div className="font-semibold mb-1">Name</div><input autoFocus value={name} onChange={(e) => setName(e.target.value)} className={field} /></div>
            <div><div className="font-semibold mb-1">Description</div><textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} className="w-full border border-[#CCC] rounded-[3px] px-2 py-1.5 outline-none focus:border-[#1F457E]" /></div>
          </div>
        </Dialog>
      )}
    </div>
  )
}

/* ───────────── recommendations ───────────── */
function Recommendations({ wbs }: { wbs: any[] }) {
  const { openWb } = useTab()
  const recs = [...wbs].filter((w) => w.owner !== ME.id && !w.lastViewed).sort((a, b) => (b.viewsCount ?? 0) - (a.viewsCount ?? 0))
  const reason = (w: any) => (w.project === 'Sales' ? 'Popular with people in Sales' : w.viewsCount > 500 ? 'Trending on your site' : `Recently updated in ${w.project}`)
  return (
    <div className="p-7">
      <h1 className="text-[22px] font-semibold mb-1">Recommendations</h1>
      <div className="text-[13px] text-[#555] mb-5">Content recommended for you based on what people like you view.</div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-5">
        {recs.map((w) => (
          <button key={w.id} onClick={() => openWb(w.id)} className="text-left rounded-[6px] border border-[#E0E0E0] overflow-hidden bg-white hover:shadow-[0_4px_14px_rgba(0,0,0,0.12)]">
            <Thumb kind={w.thumb} />
            <div className="p-3">
              <div className="text-[14px] font-semibold text-[#1F457E]">{w.name}</div>
              <div className="text-[12px] text-[#777]">{reason(w)}</div>
              <div className="text-[12px] text-[#777]">{(w.viewsCount ?? 0).toLocaleString()} views · {person(w.owner).name}</div>
            </div>
          </button>
        ))}
        {!recs.length && <div className="col-span-full py-12 text-center text-[13px] text-[#777]">You’ve seen everything we’d recommend. Check back later.</div>}
      </div>
    </div>
  )
}

/* ───────────── external assets (lineage) ───────────── */
const ASSETS = [
  { name: 'Opportunity', type: 'Table', db: 'Salesforce (live)', cols: 42, used: ['wb-pipeline', 'wb-forecast', 'wb-winloss', 'wb-finance'] },
  { name: 'Account', type: 'Table', db: 'Salesforce (live)', cols: 36, used: ['wb-pipeline', 'wb-cs'] },
  { name: 'Contacts', type: 'Table', db: 'HubSpot', cols: 58, used: ['wb-marketing'] },
  { name: 'Tickets', type: 'Table', db: 'HubSpot', cols: 24, used: ['wb-ops'] },
  { name: 'ARR_FACT', type: 'Table', db: 'Snowflake · FINANCE_DW', cols: 18, used: ['wb-finance'] },
  { name: 'Orders', type: 'Table', db: 'Sample - Superstore.xlsx', cols: 21, used: ['wb-superstore'] },
]
function ExternalAssets({ wbs }: { wbs: any[] }) {
  const { openWb } = useTab()
  const [sel, setSel] = useState(ASSETS[0].name)
  const cur = ASSETS.find((a) => a.name === sel)!
  return (
    <div className="p-7">
      <h1 className="text-[22px] font-semibold mb-1">External Assets</h1>
      <div className="text-[13px] text-[#555] mb-5">Databases and tables used by content on this site, with lineage.</div>
      <div className="flex gap-5">
        <table className="flex-1 text-[13px] self-start">
          <thead><tr className="text-left text-[#555] border-b border-[#E6E6E6] h-9">{['Name', 'Type', 'Database', 'Columns', 'Used by'].map((h) => <th key={h} className="font-semibold">{h}</th>)}</tr></thead>
          <tbody>{ASSETS.map((a) => <tr key={a.name} onClick={() => setSel(a.name)} className={`h-10 border-b border-[#F0F0F0] cursor-pointer ${sel === a.name ? 'bg-[#E1EBF6]' : 'hover:bg-[#FAFAFA]'}`}><td className="font-semibold text-[#1F457E] flex items-center gap-2 h-10"><Database size={14} /> {a.name}</td><td>{a.type}</td><td>{a.db}</td><td>{a.cols}</td><td>{a.used.length}</td></tr>)}</tbody>
        </table>
        <div className="w-[320px] shrink-0 rounded-[6px] border border-[#E0E0E0] p-4 text-[13px]">
          <div className="text-[15px] font-semibold flex items-center gap-2"><Database size={15} /> {cur.name}</div>
          <div className="text-[#777] mb-3">{cur.db}</div>
          <div className="font-semibold mb-1">Lineage — downstream workbooks</div>
          {cur.used.map((id) => wbs.find((w) => w.id === id)).filter(Boolean).map((w: any) => (
            <button key={w.id} onClick={() => openWb(w.id)} className="w-full text-left h-8 px-2 rounded hover:bg-[#F0F4FA] text-[#1F457E]">{w.name}</button>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ───────────── search results ───────────── */
function SearchPage({ q, wbs }: { q: string; wbs: any[] }) {
  const { openWb, go } = useTab()
  const n = q.toLowerCase()
  const wb = wbs.filter((w) => `${w.name} ${w.project} ${person(w.owner).name}`.toLowerCase().includes(n))
  const views = wbs.flatMap((w) => (w.id === 'wb-pipeline' ? ['Pipeline Overview', 'Pipeline by Rep', 'Win/Loss', 'Deal Detail'] : sheetsFor(w)).filter((s) => s.toLowerCase().includes(n)).map((s) => ({ s, w })))
  const metrics = PULSE.filter((p) => p.name.toLowerCase().includes(n))
  return (
    <div className="p-7">
      <h1 className="text-[22px] font-semibold mb-4">Search results for “{q}”</h1>
      {[['Workbooks', wb.length], ['Views', views.length], ['Metrics', metrics.length]].map(([t, c]) => <span key={t as string} className="inline-block mr-4 text-[13px] text-[#555]">{t}: <b>{c}</b></span>)}
      <div className="mt-4 space-y-1">
        {wb.map((w) => <button key={w.id} onClick={() => openWb(w.id)} className="w-full flex items-center gap-3 h-10 px-3 rounded hover:bg-[#F0F4FA] text-left text-[13px]"><span className="w-20 text-[11px] uppercase text-[#777]">Workbook</span><span className="text-[#1F457E] font-semibold">{w.name}</span><span className="text-[#777]">· {w.project}</span></button>)}
        {views.map(({ s, w }) => <button key={w.id + s} onClick={() => openWb(w.id)} className="w-full flex items-center gap-3 h-10 px-3 rounded hover:bg-[#F0F4FA] text-left text-[13px]"><span className="w-20 text-[11px] uppercase text-[#777]">View</span><span className="text-[#1F457E] font-semibold">{s}</span><span className="text-[#777]">· {w.name}</span></button>)}
        {metrics.map((p) => <button key={p.id} onClick={() => go('pulse')} className="w-full flex items-center gap-3 h-10 px-3 rounded hover:bg-[#F0F4FA] text-left text-[13px]"><span className="w-20 text-[11px] uppercase text-[#777]">Metric</span><span className="text-[#1F457E] font-semibold">{p.name}</span><span className="text-[#777]">· Tableau Pulse</span></button>)}
        {!wb.length && !views.length && !metrics.length && <div className="py-12 text-center text-[13px] text-[#777]">No results. Try a different search term.</div>}
      </div>
    </div>
  )
}

/* ───────────── Tableau Agent ───────────── */
function AgentPanel({ onClose }: { onClose: () => void }) {
  const { openWb } = useTab()
  const { m, x } = usePulseData()
  const [msgs, setMsgs] = useState<{ from: 'me' | 'agent'; text: string; action?: { label: string; run: () => void } }[]>([
    { from: 'agent', text: `Hi ${ME.first}! Ask me about your pipeline, forecast, win rate or deals at risk — I’ll answer from your published data sources.` },
  ])
  const [text, setText] = useState('')
  const answer = (qq: string) => {
    const s = qq.toLowerCase()
    const commit = m.cats.find((c: any) => c.cat === 'Commit')?.amount ?? 0
    const best = m.cats.find((c: any) => c.cat === 'Best Case')?.amount ?? 0
    const top = [...m.byStage].sort((a: any, b: any) => b.amount - a.amount)[0]
    if (/risk|slip/.test(s)) return { text: m.slipping.length ? `${m.slipping.length} open deals close this quarter at ≤50% probability. The biggest: ${m.slipping.slice(0, 3).map((o: any) => `${o.name} (${k(o.amount)}, ${o.stage})`).join('; ')}.` : 'No open deals this quarter are below 50% probability.', action: { label: 'Open Deal Detail', run: () => openWb('wb-pipeline') } }
    if (/forecast|commit|best case/.test(s)) return { text: `This quarter: ${k(commit)} in Commit and ${k(best)} in Best Case, with ${k(m.wonQtd)} already closed won.`, action: { label: 'Open Quarterly Forecast', run: () => openWb('wb-forecast') } }
    if (/win rate|win-rate|winrate/.test(s)) return { text: `Win rate over closed deals is ${m.winRate}%, and the average closed-won deal is ${k(m.avgDeal)}.`, action: { label: 'Open Win/Loss Analysis', run: () => openWb('wb-winloss') } }
    if (/region|emea|east|west/.test(s)) return { text: m.byRegion.map((r: any) => `${r.region}: ${k(r.amount)} open`).join(' · ') }
    if (/mql|marketing|lead/.test(s)) return { text: `There are ${x.mqls} marketing qualified leads in HubSpot right now.`, action: { label: 'Open Marketing Funnel', run: () => openWb('wb-marketing') } }
    if (/ticket|support|sla/.test(s)) return { text: `${x.tickets} support tickets are open in HubSpot Service.`, action: { label: 'Open Operations SLA Dashboard', run: () => openWb('wb-ops') } }
    return { text: `Open pipeline is ${k(m.openTotal)} across ${m.openCount} opportunities (${k(m.weighted)} weighted). The largest stage is ${top.stage} at ${k(top.amount)}.`, action: { label: 'Open Sales Pipeline Overview', run: () => openWb('wb-pipeline') } }
  }
  const send = (qq = text) => {
    if (!qq.trim()) return
    setMsgs((l) => [...l, { from: 'me', text: qq.trim() }, { from: 'agent', ...answer(qq) }])
    setText('')
  }
  return (
    <SidePanel title={<><Sparkles size={16} className="text-[#1F457E]" /> Tableau Agent</>} onClose={onClose} width={360} agent="tableau-agent-panel">
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-auto p-4 space-y-3">
          {msgs.map((mm, i) => (
            <div key={i} className={`flex ${mm.from === 'me' ? 'justify-end' : ''}`}>
              <div className={`max-w-[85%] rounded-[10px] px-3 py-2 text-[13px] leading-[1.45] ${mm.from === 'me' ? 'bg-[#1F457E] text-white' : 'bg-[#F0F4FA] text-[#333]'}`}>
                {mm.text}
                {mm.action && <button onClick={mm.action.run} className="block mt-1.5 text-[12px] font-semibold text-[#1F457E] hover:underline">{mm.action.label} →</button>}
              </div>
            </div>
          ))}
        </div>
        <div className="px-4 pb-2 flex flex-wrap gap-1.5">
          {['What’s our open pipeline?', 'Which deals are at risk?', 'How is the forecast?', 'What is our win rate?'].map((s) => (
            <button key={s} onClick={() => send(s)} className="h-7 px-2.5 rounded-full border border-[#CCC] text-[12px] hover:bg-[#F0F4FA]">{s}</button>
          ))}
        </div>
        <div className="p-3 border-t border-[#E6E6E6] flex gap-2">
          <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder="Ask a question about your data" className={field} aria-label="Ask Tableau Agent" />
          <button className={`${btnPrimary} px-3`} aria-label="Send" onClick={() => send()}><Send size={14} /></button>
        </div>
      </div>
    </SidePanel>
  )
}
