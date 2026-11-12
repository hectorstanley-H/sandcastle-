import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronRight, Search, Globe, HelpCircle, Bell, Star, MessageCircle, Sparkles, X, Pin, PinOff, CheckCircle2, AlertTriangle } from 'lucide-react'
import type { AppProps } from '@/os/registry'
import { useDesk, useWin } from '@/os/context'
import { db, useCollection, useRecord } from '@/db/db'
import { ME, person } from '@/data/people'
import { Avatar } from '@/components/Avatar'
import { IncidentList, FILTERS } from './List'
import { IncidentForm, MultiUpdate, NewIncidentForm } from './Form'
import { CatalogHome, CatalogItem, OrderStatus, RequestList, CartPage, CAT_ITEMS } from './Catalog'
import { ChangeList, ChangeForm, ProblemList, ProblemForm } from './Records'
import { KnowledgeHome, KnowledgeArticle } from './Knowledge'
import { Dashboard, GroupsPage, UsersPage } from './Dashboard'
import { SN_FONT, Wordmark, type Incident, FlashContext, Popover, MenuItem, PRIORITY_LABEL, fmtSN, slaFor } from './shared'

type Page =
  | { kind: 'list'; filter: string; q?: string }
  | { kind: 'form'; id: string }
  | { kind: 'new' }
  | { kind: 'multi'; ids: string[] }
  | { kind: 'catalog' }
  | { kind: 'item'; itemId: string }
  | { kind: 'order'; requestId: string }
  | { kind: 'requests' }
  | { kind: 'cart' }
  | { kind: 'kb'; q?: string }
  | { kind: 'article'; id: string }
  | { kind: 'changes' }
  | { kind: 'change'; id: string }
  | { kind: 'problems' }
  | { kind: 'problem'; id: string }
  | { kind: 'dashboard' }
  | { kind: 'groups' }
  | { kind: 'users' }

const HOST = 'https://northwind.service-now.com'

/** All-menu navigation modules (ids are used by H-Worker workflows — keep them stable). */
const NAV: [string, [string, string, Page][]][] = [
  ['Self-Service', [['sn-nav-catalog', 'Service Catalog', { kind: 'catalog' }], ['sn-nav-requests', 'Requests', { kind: 'requests' }], ['sn-nav-my-incidents', 'Incidents', { kind: 'list', filter: 'mine' }]]],
  ['Incident', [
    ['sn-nav-incident-new', 'Create New', { kind: 'form', id: '__new' }],
    ['sn-nav-incident-assigned', 'Assigned to me', { kind: 'list', filter: 'mine' }],
    ['sn-nav-incident-open', 'Open', { kind: 'list', filter: 'open' }],
    ['sn-nav-incident-unassigned', 'Open - Unassigned', { kind: 'list', filter: 'unassigned' }],
    ['sn-nav-incident-resolved', 'Resolved', { kind: 'list', filter: 'resolved' }],
    ['sn-nav-incident-all', 'All', { kind: 'list', filter: 'all' }],
  ]],
  ['Service Catalog', [['sn-nav-catalog-2', 'Catalog', { kind: 'catalog' }], ['sn-nav-onboarding', 'New Hire Onboarding', { kind: 'item', itemId: 'cat-onboarding' }], ['sn-nav-laptop', 'Standard Laptop', { kind: 'item', itemId: 'cat-laptop' }], ['sn-nav-cart', 'My Cart', { kind: 'cart' }]]],
  ['Problem', [['sn-nav-problem', 'Open Problems', { kind: 'problems' }], ['sn-nav-problem-new', 'Create New', { kind: 'problem', id: '__new' }]]],
  ['Change', [['sn-nav-change', 'All Changes', { kind: 'changes' }], ['sn-nav-change-new', 'Create New', { kind: 'change', id: '__new:Normal' }], ['sn-nav-change-emergency', 'Create New - Emergency', { kind: 'change', id: '__new:Emergency' }]]],
  ['Knowledge', [['sn-nav-kb', 'Knowledge Home', { kind: 'kb' }]]],
  ['Platform Analytics', [['sn-nav-dashboard', 'Incident Overview', { kind: 'dashboard' }]]],
  ['User Administration', [['sn-nav-groups', 'Groups', { kind: 'groups' }], ['sn-nav-users', 'Users', { kind: 'users' }]]],
]
const NAV_BY_ID = Object.fromEntries(NAV.flatMap(([g, items]) => items.map(([id, l, p]) => [id, { group: g, label: l, page: p }])))
const PREFS_ID = 'favorites-alex'

function useFavorites() {
  const pref = useRecord<{ id: string; items: string[] }>('servicenow.prefs', PREFS_ID)
  const items = pref?.items ?? ['sn-nav-incident-unassigned', 'sn-nav-catalog']
  const toggle = (id: string) => db.upsert('servicenow.prefs', { id: PREFS_ID, items: items.includes(id) ? items.filter((x) => x !== id) : [...items, id] })
  return { items, toggle }
}

function AllMenu({ onGo, onClose, pinned, onPin }: { onGo: (p: Page) => void; onClose: () => void; pinned: boolean; onPin: () => void }) {
  const [q, setQ] = useState('')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const fav = useFavorites()
  return (
    <div className="absolute left-0 top-[48px] z-50 w-[360px] max-h-[calc(100%-56px)] bg-white rounded-b-[8px] shadow-[0_12px_32px_rgba(0,0,0,0.25)] flex flex-col" data-agent="sn-all-menu-panel">
      <div className="p-3 border-b border-[#DADDE2] flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#5B616B]" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter" className="w-full h-8 pl-7 pr-2 rounded-[4px] border border-[#8790A1] text-[14px] outline-none" data-agent="sn-all-filter" />
        </div>
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#EDEFF2]" aria-label="Close"><X size={16} /></button>
      </div>
      <div className="flex gap-4 px-4 pt-2 text-[13px] text-[#5B616B]">
        <button onClick={onPin} className="flex items-center gap-1 hover:text-[#1B1D21]" aria-pressed={pinned}>{pinned ? <PinOff size={12} /> : <Pin size={12} />} {pinned ? 'Unpin menu' : 'Pin all'}</button>
        <button onClick={() => setCollapsed(collapsed.size ? new Set() : new Set(NAV.map(([g]) => g)))} className="hover:text-[#1B1D21]">{collapsed.size ? 'Expand all' : 'Collapse all'}</button>
      </div>
      <div className="overflow-auto py-2">
        {NAV.map(([g, items]) => {
          const vis = items.filter(([, l]) => !q || (g + ' ' + l).toLowerCase().includes(q.toLowerCase()))
          if (!vis.length) return null
          const shut = collapsed.has(g) && !q
          return (
            <div key={g} className="mb-1">
              <button onClick={() => setCollapsed((c) => { const n = new Set(c); if (n.has(g)) n.delete(g); else n.add(g); return n })} className="w-full px-4 py-1.5 text-[14px] font-bold text-[#1B1D21] flex items-center gap-1 hover:bg-[#F6F7F8]">{shut ? <ChevronRight size={14} /> : <ChevronDown size={14} />} {g}</button>
              {!shut &&
                vis.map(([id, l, p]) => (
                  <button key={id} data-agent={id} onClick={() => { onGo(p); if (!pinned) onClose() }} className="w-full text-left pl-9 pr-4 h-8 text-[14px] text-[#2E3238] hover:bg-[#EEF4FB] flex items-center group">
                    {l}
                    <span
                      role="button"
                      aria-label={fav.items.includes(id) ? `Remove ${l} from favorites` : `Add ${l} to favorites`}
                      onClick={(e) => { e.stopPropagation(); fav.toggle(id) }}
                      className={`ml-auto ${fav.items.includes(id) ? 'opacity-100 text-[#F2A100]' : 'opacity-0 group-hover:opacity-100 text-[#8A9099]'}`}
                    >
                      <Star size={13} fill={fav.items.includes(id) ? '#F2A100' : 'none'} />
                    </span>
                  </button>
                ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** Now Assist side panel: summarizes the open incident or suggests next steps */
function NowAssist({ page, onClose, onGo }: { page: Page; onClose: () => void; onGo: (p: Page) => void }) {
  const inc = useRecord<Incident>('servicenow.incidents', page.kind === 'form' ? page.id : null)
  const incidents = useCollection<Incident>('servicenow.incidents')
  const kb = useCollection<any>('servicenow.kb')
  const unassigned = incidents.filter((i) => !i.assignmentGroup && !['Resolved', 'Closed', 'Canceled'].includes(i.state))
  const notes = inc?.activity.filter((a) => a.kind === 'work' || a.kind === 'comment') ?? []
  const similar = inc ? incidents.filter((x) => x.id !== inc.id && x.ci === inc.ci && !['Closed', 'Canceled'].includes(x.state)) : []
  const words = inc ? inc.shortDescription.toLowerCase().split(/\W+/).filter((w) => w.length > 3) : []
  const art = inc ? kb.find((a) => words.some((w) => a.title.toLowerCase().includes(w))) : undefined
  return (
    <div className="absolute right-0 top-[48px] bottom-0 z-50 w-[380px] bg-white border-l border-[#DADDE2] shadow-[-8px_0_24px_rgba(0,0,0,0.12)] flex flex-col" data-agent="sn-now-assist">
      <div className="h-12 px-4 flex items-center gap-2 border-b border-[#DADDE2]"><Sparkles size={16} className="text-[#7B4DD8]" /><b className="text-[15px]">Now Assist</b><div className="flex-1" /><button onClick={onClose} aria-label="Close Now Assist" className="w-8 h-8 rounded hover:bg-[#EDEFF2] flex items-center justify-center"><X size={16} /></button></div>
      <div className="flex-1 overflow-auto p-4 text-[14px] leading-[22px] text-[#2E3238]">
        {inc ? (
          <>
            <div className="text-[12px] font-bold text-[#5B616B] uppercase mb-1">Summary · {inc.number}</div>
            <p><b>{person(inc.callerId).name}</b> reported “{inc.shortDescription}” via {inc.channel.toLowerCase()} on {fmtSN(inc.opened)}. It is <b>{inc.state}</b> at {PRIORITY_LABEL[inc.priority]} priority{inc.assignmentGroup ? <>, assigned to <b>{inc.assignmentGroup}</b>{inc.assignedTo ? ` (${inc.assignedTo})` : ''}</> : ', with no assignment group yet'}.</p>
            <p className="mt-2">{notes.length ? <>Latest note ({notes[0].author}): “{notes[0].text.slice(0, 160)}{notes[0].text.length > 160 ? '…' : ''}”</> : 'No work notes or comments have been added yet.'}</p>
            <div className="text-[12px] font-bold text-[#5B616B] uppercase mt-4 mb-1">Suggested next steps</div>
            <ul className="list-disc pl-5 space-y-1">
              {!inc.assignmentGroup && <li>Set an assignment group — {inc.category === 'Network' || /vpn/i.test(inc.ci) ? 'Network' : /sap/i.test(inc.ci) ? 'SAP Basis' : /exchange|outlook/i.test(inc.ci) ? 'Messaging' : 'Service Desk'} looks like the best fit.</li>}
              {similar.length > 0 && <li>{similar.length} other open incident{similar.length === 1 ? '' : 's'} on <b>{inc.ci}</b> — consider linking them to a parent incident.</li>}
              {slaFor(inc).some((s) => s.stage === 'Breached') && <li className="text-[#C9302C]">An SLA on this incident is breached — update the caller.</li>}
              {art && <li>Relevant article: <button className="text-[#1F6FB2] hover:underline" onClick={() => onGo({ kind: 'article', id: art.id })}>{art.title}</button></li>}
            </ul>
          </>
        ) : (
          <>
            <p>Hi {ME.first}, here is what needs attention:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><button className="text-[#1F6FB2] hover:underline" onClick={() => onGo({ kind: 'list', filter: 'unassigned' })}>{unassigned.length} unassigned incidents</button> ({unassigned.filter((i) => i.priority <= 2).length} are P1/P2)</li>
              <li><button className="text-[#1F6FB2] hover:underline" onClick={() => onGo({ kind: 'dashboard' })}>Incident overview dashboard</button></li>
              <li><button className="text-[#1F6FB2] hover:underline" onClick={() => onGo({ kind: 'kb' })}>Search the knowledge base</button></li>
            </ul>
            <p className="mt-3 text-[13px] text-[#5B616B]">Open an incident to get an AI summary and suggested next steps.</p>
          </>
        )}
      </div>
    </div>
  )
}

export default function ServiceNow({ win, params }: AppProps) {
  const { setUrl, setTitle, close } = useWin()
  const desk = useDesk()
  const [page, setPage] = useState<Page>({ kind: 'list', filter: 'open' })
  const [menu, setMenu] = useState<string | null>(null)
  const [pinned, setPinned] = useState(false)
  const [listFilter, setListFilter] = useState('open')
  const [search, setSearch] = useState('')
  const [history, setHistory] = useState<{ label: string; sub: string; page: Page }[]>([])
  const [msg, setMsg] = useState<{ text: string; kind: 'info' | 'error'; at: number } | null>(null)
  const [lang, setLang] = useState('English')
  const msgTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const flash = useCallback((text: string, kind: 'info' | 'error' = 'info') => {
    setMsg({ text, kind, at: Date.now() })
    clearTimeout(msgTimer.current)
    msgTimer.current = setTimeout(() => setMsg(null), 5000)
  }, [])
  useEffect(() => {
    if (page.kind === 'list') setListFilter(page.filter)
  }, [page])
  const incidents = useCollection<Incident>('servicenow.incidents')
  const changes = useCollection<any>('servicenow.changes')
  const problems = useCollection<any>('servicenow.problems')
  const kb = useCollection<any>('servicenow.kb')
  const requests = useCollection<any>('servicenow.requests')
  const fav = useFavorites()

  useEffect(() => {
    if (params?.sysId || params?.incidentId) setPage({ kind: 'form', id: params.sysId ?? params.incidentId })
    else if (params?.requestId) setPage({ kind: 'order', requestId: params.requestId })
    else if (params?.catalogItem) setPage({ kind: 'item', itemId: params.catalogItem })
    else if (params?.view === 'catalog') setPage({ kind: 'catalog' })
    else if (params?.list === 'incident' || params?.filter) setPage({ kind: 'list', filter: params.filter ?? 'open' })
  }, [win.nonce])

  // history of visited records (History menu)
  useEffect(() => {
    let entry: { label: string; sub: string } | null = null
    if (page.kind === 'form') {
      const i = incidents.find((x) => x.id === page.id)
      if (i) entry = { label: i.number, sub: i.shortDescription }
    } else if (page.kind === 'change') {
      const c = changes.find((x) => x.id === page.id)
      if (c) entry = { label: c.number, sub: c.shortDescription }
    } else if (page.kind === 'problem') {
      const p = problems.find((x) => x.id === page.id)
      if (p) entry = { label: p.number, sub: p.shortDescription }
    } else if (page.kind === 'article') {
      const a = kb.find((x) => x.id === page.id)
      if (a) entry = { label: a.number, sub: a.title }
    } else if (page.kind === 'list') entry = { label: 'Incidents', sub: (FILTERS[page.filter]?.crumbs.join(' > ') || 'All') }
    if (entry) setHistory((h) => [{ ...entry!, page }, ...h.filter((x) => x.label !== entry!.label || x.sub !== entry!.sub)].slice(0, 12))
  }, [page])

  useEffect(() => {
    if (page.kind === 'list') {
      setUrl(`${HOST}/now/nav/ui/classic/params/target/incident_list.do%3Fsysparm_query%3D${page.filter === 'unassigned' ? 'active%3Dtrue%5Eassignment_groupISEMPTY' : 'active%3Dtrue'}`)
      setTitle('Incidents | ServiceNow')
    } else if (page.kind === 'form') {
      const inc = incidents.find((i) => i.id === page.id)
      setUrl(`${HOST}/now/nav/ui/classic/params/target/incident.do%3Fsys_id%3D${page.id}`)
      setTitle(`${inc?.number ?? 'Incident'} | Incident | ServiceNow`)
    } else if (page.kind === 'new') {
      setUrl(`${HOST}/now/nav/ui/classic/params/target/incident.do%3Fsys_id%3D-1`)
      setTitle('Create Incident | ServiceNow')
    } else if (page.kind === 'multi') {
      setUrl(`${HOST}/now/nav/ui/classic/params/target/incident_update.do`)
      setTitle('Incident | ServiceNow')
    } else if (page.kind === 'catalog') {
      setUrl(`${HOST}/now/nav/ui/classic/params/target/catalog_home.do`)
      setTitle('Service Catalog | ServiceNow')
    } else if (page.kind === 'item') {
      setUrl(`${HOST}/now/nav/ui/classic/params/target/com.glideapp.servicecatalog_cat_item_view.do%3Fsysparm_id%3D${page.itemId}`)
      setTitle(`${CAT_ITEMS.find((c) => c.id === page.itemId)?.name ?? 'Catalog'} | ServiceNow`)
    } else if (page.kind === 'order') {
      setUrl(`${HOST}/now/nav/ui/classic/params/target/com.glideapp.servicecatalog_checkout_view_v2.do%3Fsysparm_sys_id%3D${page.requestId}`)
      setTitle('Order Status | ServiceNow')
    } else if (page.kind === 'cart') {
      setUrl(`${HOST}/now/nav/ui/classic/params/target/com.glideapp.servicecatalog_cart_view.do`)
      setTitle('Shopping Cart | ServiceNow')
    } else if (page.kind === 'kb' || page.kind === 'article') {
      const a = page.kind === 'article' ? kb.find((x) => x.id === page.id) : undefined
      setUrl(a ? `${HOST}/now/nav/ui/classic/params/target/kb_view.do%3Fsysparm_article%3D${a.number}` : `${HOST}/now/nav/ui/classic/params/target/%24knowledge.do`)
      setTitle(a ? `${a.title} | Knowledge | ServiceNow` : 'Knowledge | ServiceNow')
    } else if (page.kind === 'changes' || page.kind === 'change') {
      const c = page.kind === 'change' ? changes.find((x) => x.id === page.id) : undefined
      setUrl(page.kind === 'change' ? `${HOST}/now/nav/ui/classic/params/target/change_request.do%3Fsys_id%3D${c ? page.id : '-1'}` : `${HOST}/now/nav/ui/classic/params/target/change_request_list.do`)
      setTitle(c ? `${c.number} | Change Request | ServiceNow` : 'Change Requests | ServiceNow')
    } else if (page.kind === 'problems' || page.kind === 'problem') {
      const p = page.kind === 'problem' ? problems.find((x) => x.id === page.id) : undefined
      setUrl(page.kind === 'problem' ? `${HOST}/now/nav/ui/classic/params/target/problem.do%3Fsys_id%3D${p ? page.id : '-1'}` : `${HOST}/now/nav/ui/classic/params/target/problem_list.do`)
      setTitle(p ? `${p.number} | Problem | ServiceNow` : 'Problems | ServiceNow')
    } else if (page.kind === 'dashboard') {
      setUrl(`${HOST}/now/platform-analytics-workspace/dashboards/incident-overview`)
      setTitle('Incident Overview | Platform Analytics | ServiceNow')
    } else if (page.kind === 'groups' || page.kind === 'users') {
      setUrl(`${HOST}/now/nav/ui/classic/params/target/${page.kind === 'groups' ? 'sys_user_group' : 'sys_user'}_list.do`)
      setTitle(`${page.kind === 'groups' ? 'Groups' : 'Users'} | ServiceNow`)
    } else {
      setUrl(`${HOST}/now/nav/ui/classic/params/target/sc_request_list.do`)
      setTitle('Requests | ServiceNow')
    }
  }, [page, incidents.length])

  const pill =
    page.kind === 'list' ? 'Incidents'
    : page.kind === 'form' || page.kind === 'multi' || page.kind === 'new' ? 'Incident'
    : page.kind === 'requests' ? 'Requests'
    : page.kind === 'order' ? 'Order Status'
    : page.kind === 'cart' ? 'Shopping Cart'
    : page.kind === 'kb' || page.kind === 'article' ? 'Knowledge'
    : page.kind === 'changes' || page.kind === 'change' ? 'Change Request'
    : page.kind === 'problems' || page.kind === 'problem' ? 'Problem'
    : page.kind === 'dashboard' ? 'Incident Overview'
    : page.kind === 'groups' ? 'Groups'
    : page.kind === 'users' ? 'Users'
    : 'Service Catalog'
  const pillNav = Object.entries(NAV_BY_ID).find(([, n]) => JSON.stringify(n.page) === JSON.stringify(page))?.[0]
  const navs = ['All', 'Favorites', 'History', 'Workspaces', 'Admin']
  const go = (p: Page) => {
    if (p.kind === 'form' && p.id === '__new') return setPage({ kind: 'new' })
    setPage(p)
  }
  const runSearch = () => {
    const t = search.trim()
    if (!t) return
    const up = t.toUpperCase()
    const inc = incidents.find((i) => i.number === up)
    const chg = changes.find((c) => c.number === up)
    const prb = problems.find((p) => p.number === up)
    const art = kb.find((a) => a.number === up)
    const req = requests.find((r) => r.number === up || r.ritm === up)
    if (inc) setPage({ kind: 'form', id: inc.id })
    else if (chg) setPage({ kind: 'change', id: chg.id })
    else if (prb) setPage({ kind: 'problem', id: prb.id })
    else if (art) setPage({ kind: 'article', id: art.id })
    else if (req) setPage({ kind: 'order', requestId: req.id })
    else if (/^KB/i.test(t)) setPage({ kind: 'kb', q: t })
    else setPage({ kind: 'list', filter: 'all', q: t })
    setSearch('')
  }
  const notifications = incidents
    .filter((i) => (i.followers?.includes(ME.id) || i.assignedTo === ME.name || i.callerId === ME.id) && i.activity.length)
    .map((i) => ({ i, a: i.activity[0] }))
    .sort((x, y) => +new Date(y.a.date) - +new Date(x.a.date))
    .slice(0, 7)
  const breached = incidents.filter((i) => i.assignedTo === ME.name && slaFor(i).some((s) => s.stage === 'Breached')).length

  const iconMenu = (id: string, I: any, label: string) => (
    <span className="relative" key={id}>
      <button data-sn-trigger aria-label={label} title={label} onClick={() => setMenu(menu === id ? null : id)} className={`w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/10 text-white/90 ${menu === id ? 'bg-white/15' : ''}`}><I size={18} /></button>
    </span>
  )

  return (
    <FlashContext.Provider value={flash}>
      <div className="flex-1 min-h-0 flex flex-col relative" style={{ fontFamily: SN_FONT }}>
        {/* unified navigation */}
        <div className="h-[48px] shrink-0 flex items-center bg-[#032D42] text-white px-3 gap-1 relative z-40">
          <button className="pr-4 pl-1" aria-label="ServiceNow home" onClick={() => { setPage({ kind: 'list', filter: 'open' }); setMenu(null) }}><Wordmark /></button>
          {navs.map((n) => (
            <button
              key={n}
              data-agent={`sn-menu-${n.toLowerCase()}`}
              onClick={() => setMenu((m) => (m === n ? null : n))}
              className={`relative h-[48px] px-3 flex items-center gap-1 text-[14px] ${menu === n ? 'bg-white/10' : 'hover:bg-white/10'}`}
            >
              {n} {n !== 'All' && <ChevronDown size={14} />}
              {menu === n && <span className="absolute left-2 right-2 bottom-0 h-[3px] rounded-t bg-[#62D84E]" />}
            </button>
          ))}
          <div className="flex-1 flex justify-center">
            <span className="h-8 px-4 rounded-full bg-white/[0.12] flex items-center gap-2 text-[14px] font-bold">
              {pill}
              <button
                aria-label={pillNav && fav.items.includes(pillNav) ? 'Remove from favorites' : 'Add to favorites'}
                onClick={() => { if (pillNav) { fav.toggle(pillNav); flash(fav.items.includes(pillNav) ? 'Removed from favorites' : `${NAV_BY_ID[pillNav].label} added to favorites`) } else flash('This page cannot be added to favorites', 'error') }}
                className="opacity-80 hover:opacity-100"
              >
                <Star size={14} fill={pillNav && fav.items.includes(pillNav) ? '#F2A100' : 'none'} className={pillNav && fav.items.includes(pillNav) ? 'text-[#F2A100]' : ''} />
              </button>
            </span>
          </div>
          <div className="relative">
            <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/70" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && runSearch()} data-agent="sn-global-search" placeholder="Search" className="h-8 w-[240px] pl-8 pr-3 rounded-full bg-white/[0.08] border border-white/30 text-[14px] text-white placeholder:text-white/60 outline-none focus:bg-white focus:text-[#1B1D21]" />
          </div>
          {iconMenu('assist', Sparkles, 'Now Assist')}
          {iconMenu('scope', Globe, 'Application scope and language')}
          {iconMenu('help', HelpCircle, 'Help')}
          {iconMenu('connect', MessageCircle, 'Connect chat')}
          <button className={`relative w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/10 ${menu === 'bell' ? 'bg-white/15' : ''}`} aria-label="Notifications" data-sn-trigger onClick={() => setMenu(menu === 'bell' ? null : 'bell')}>
            <Bell size={18} />
            {notifications.length > 0 && <span className="absolute top-1 right-1 h-4 min-w-4 px-1 rounded-full bg-[#E3242B] text-[10px] font-bold flex items-center justify-center">{notifications.length}</span>}
          </button>
          <button className="ml-1 rounded-full ring-2 ring-white/40" aria-label="User menu" data-sn-trigger onClick={() => setMenu(menu === 'me' ? null : 'me')}><Avatar id={ME.id} size={30} /></button>
        </div>
        {menu === 'All' && <AllMenu onGo={go} onClose={() => setMenu(null)} pinned={pinned} onPin={() => setPinned((p) => !p)} />}
        {menu && ['Favorites', 'History', 'Workspaces', 'Admin'].includes(menu) && (
          <div className="absolute z-50 top-[48px] bg-white rounded-b-[8px] shadow-[0_12px_32px_rgba(0,0,0,0.25)] w-[300px] py-2 text-[14px] max-h-[70%] overflow-auto" style={{ left: 150 + navs.indexOf(menu) * 80 }}>
            {(menu === 'History'
              ? history.length
                ? history.map((h) => [h.label, h.sub, () => setPage(h.page)] as const)
                : incidents.slice(0, 6).map((i) => [i.number, i.shortDescription, () => setPage({ kind: 'form', id: i.id })] as const)
              : menu === 'Favorites'
                ? fav.items.filter((id) => NAV_BY_ID[id]).map((id) => [NAV_BY_ID[id].label, NAV_BY_ID[id].group, () => go(NAV_BY_ID[id].page)] as const)
                : menu === 'Workspaces'
                  ? ([['Service Operations Workspace', 'Workspace', () => setPage({ kind: 'dashboard' })], ['Employee Center', 'Portal', () => setPage({ kind: 'catalog' })], ['Platform Analytics', 'Workspace', () => setPage({ kind: 'dashboard' })]] as const)
                  : ([['Groups', 'User Administration', () => setPage({ kind: 'groups' })], ['Users', 'User Administration', () => setPage({ kind: 'users' })], ['Knowledge Bases', 'Knowledge', () => setPage({ kind: 'kb' })], ['Change Requests', 'Change', () => setPage({ kind: 'changes' })]] as const)
            ).map(([a, b, fn], n) => (
              <button key={a + n} onClick={() => { fn(); setMenu(null) }} className="w-full text-left px-4 py-1.5 hover:bg-[#EEF4FB]">
                <div className="text-[#1B1D21]">{a}</div>
                <div className="text-[12px] text-[#5B616B] truncate">{b}</div>
              </button>
            ))}
            {menu === 'Favorites' && !fav.items.length && <div className="px-4 py-3 text-[13px] text-[#5B616B]">No favorites yet. Star a module in the All menu to add it here.</div>}
          </div>
        )}
        {menu === 'assist' && <NowAssist page={page} onClose={() => setMenu(null)} onGo={(p) => setPage(p)} />}
        {menu && ['scope', 'help', 'connect', 'bell', 'me'].includes(menu) && (
          <div className="absolute top-0 right-0 z-50">
          <Popover onClose={() => setMenu(null)} className={`top-[50px] ${menu === 'me' ? 'right-2 w-[260px]' : 'right-14 w-[320px]'}`}>
            {menu === 'scope' && (
              <div className="px-4 py-2 space-y-3 text-[13px]">
                <label className="block"><span className="block font-bold mb-1">Language</span><select value={lang} onChange={(e) => { setLang(e.target.value); flash(`Language preference set to ${e.target.value}`) }} className="w-full h-8 px-2 rounded-[4px] border border-[#8790A1]">{['English', 'Deutsch', 'Español', 'Français', '日本語'].map((l) => <option key={l}>{l}</option>)}</select></label>
                <div><span className="block font-bold mb-1">Application scope</span><div className="h-8 px-2 rounded-[4px] border border-[#DADDE2] bg-[#F6F7F8] flex items-center">Global</div></div>
                <div><span className="block font-bold mb-1">Update set</span><div className="h-8 px-2 rounded-[4px] border border-[#DADDE2] bg-[#F6F7F8] flex items-center">Default [Global]</div></div>
              </div>
            )}
            {menu === 'help' && (
              <>
                <div className="px-4 pt-1 pb-1 text-[12px] font-bold text-[#5B616B] uppercase">Help</div>
                <MenuItem onClick={() => { setMenu(null); setPage({ kind: 'kb' }) }}>Knowledge base</MenuItem>
                <MenuItem onClick={() => { setMenu(null); desk.open('edge', { q: 'ServiceNow incident management documentation' }) }}>Product documentation</MenuItem>
                <MenuItem onClick={() => { setMenu(null); setPage({ kind: 'item', itemId: 'cat-share' }) }}>Request access</MenuItem>
                <div className="h-px bg-[#DADDE2] my-1" />
                <div className="px-4 py-1.5 text-[12px] text-[#5B616B]">Instance: northwind · Release: Yokohama Patch 3</div>
              </>
            )}
            {menu === 'connect' && (
              <div className="px-4 py-2 text-[13px]">
                <div className="font-bold text-[14px] mb-2">Connect</div>
                {incidents.filter((i) => i.followers?.includes(ME.id)).slice(0, 5).map((i) => (
                  <button key={i.id} onClick={() => { setMenu(null); setPage({ kind: 'form', id: i.id }) }} className="w-full text-left py-1.5 hover:bg-[#EEF4FB] rounded px-1"><div className="text-[#1F6FB2]">{i.number}</div><div className="text-[12px] text-[#5B616B] truncate">{i.shortDescription}</div></button>
                ))}
                {!incidents.some((i) => i.followers?.includes(ME.id)) && <div className="text-[#5B616B]">No conversations. Follow an incident to chat about it here.</div>}
              </div>
            )}
            {menu === 'bell' && (
              <>
                <div className="px-4 pt-1 pb-2 text-[14px] font-bold flex items-center">Notifications{breached > 0 && <span className="ml-auto text-[12px] text-[#C9302C] font-normal flex items-center gap-1"><AlertTriangle size={12} /> {breached} SLA breached</span>}</div>
                {notifications.map(({ i, a }) => (
                  <button key={i.id} onClick={() => { setMenu(null); setPage({ kind: 'form', id: i.id }) }} className="w-full text-left px-4 py-2 hover:bg-[#EEF4FB] border-t border-[#EDEFF2]">
                    <div className="text-[13px]"><b>{i.number}</b> · {a.author}</div>
                    <div className="text-[12px] text-[#5B616B] truncate">{a.text.split('\n')[0]}</div>
                    <div className="text-[11px] text-[#8A9099]">{fmtSN(a.date)}</div>
                  </button>
                ))}
                {!notifications.length && <div className="px-4 py-3 text-[13px] text-[#5B616B]">You’re all caught up.</div>}
              </>
            )}
            {menu === 'me' && (
              <>
                <div className="px-4 py-2 flex items-center gap-3 border-b border-[#EDEFF2]"><Avatar id={ME.id} size={36} /><div><div className="font-bold">{ME.name}</div><div className="text-[12px] text-[#5B616B]">{ME.email}</div></div></div>
                <MenuItem onClick={() => { setMenu(null); setPage({ kind: 'list', filter: 'mine' }) }}>My work</MenuItem>
                <MenuItem onClick={() => { setMenu(null); setPage({ kind: 'requests' }) }}>My requests</MenuItem>
                <MenuItem onClick={() => { setMenu(null); setPage({ kind: 'list', filter: 'following' }) }}>Followed incidents</MenuItem>
                <div className="h-px bg-[#DADDE2] my-1" />
                <MenuItem onClick={() => close()}>Log out</MenuItem>
              </>
            )}
          </Popover>
          </div>
        )}
        {msg && (
          <div className={`shrink-0 px-4 py-2 text-[14px] border-b flex items-center gap-2 ${msg.kind === 'error' ? 'bg-[#FBE9E9] text-[#A52A2A] border-[#F0C2C2]' : 'bg-[#E1EDFA] text-[#0B4FA6] border-[#B5D0F0]'}`} data-agent="sn-flash" role="status">
            {msg.kind === 'error' ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />} {msg.text}
            <button className="ml-auto" aria-label="Dismiss message" onClick={() => setMsg(null)}><X size={14} /></button>
          </div>
        )}
        <div className="flex-1 min-h-0 flex flex-col" onClick={() => menu && !pinned && menu !== 'assist' && setMenu(null)}>
          {page.kind === 'list' && (
            <IncidentList
              key={page.filter + (page.q ?? '')}
              filter={page.filter}
              initialQuery={page.q}
              onFilter={(f) => setPage({ kind: 'list', filter: f })}
              onOpen={(id) => setPage({ kind: 'form', id })}
              onNew={() => setPage({ kind: 'new' })}
              onUpdateSelected={(ids) => setPage({ kind: 'multi', ids })}
            />
          )}
          {page.kind === 'form' && (
            <IncidentForm
              id={page.id}
              onBack={() => setPage({ kind: 'list', filter: listFilter })}
              onOpen={(id) => setPage({ kind: 'form', id })}
              onOpenKb={(id) => setPage({ kind: 'article', id })}
              onOpenRecord={(k, id) => setPage(k === 'problem' ? { kind: 'problem', id } : { kind: 'change', id })}
            />
          )}
          {page.kind === 'new' && <NewIncidentForm onCreated={(id) => setPage({ kind: 'form', id })} onCancel={() => setPage({ kind: 'list', filter: listFilter })} />}
          {page.kind === 'multi' && <MultiUpdate ids={page.ids} onBack={() => setPage({ kind: 'list', filter: listFilter })} />}
          {page.kind === 'catalog' && <CatalogHome onItem={(itemId) => setPage({ kind: 'item', itemId })} onCart={() => setPage({ kind: 'cart' })} />}
          {page.kind === 'item' && <CatalogItem itemId={page.itemId} onOrdered={(requestId) => setPage({ kind: 'order', requestId })} onBack={() => setPage({ kind: 'catalog' })} onCart={() => setPage({ kind: 'cart' })} />}
          {page.kind === 'order' && <OrderStatus requestId={page.requestId} onRequests={() => setPage({ kind: 'requests' })} />}
          {page.kind === 'requests' && <RequestList onOpen={(requestId) => setPage({ kind: 'order', requestId })} />}
          {page.kind === 'cart' && <CartPage onBack={() => setPage({ kind: 'catalog' })} onCheckedOut={() => setPage({ kind: 'requests' })} />}
          {page.kind === 'kb' && <KnowledgeHome key={page.q ?? ''} initialQuery={page.q} onOpen={(id) => setPage({ kind: 'article', id })} />}
          {page.kind === 'article' && <KnowledgeArticle id={page.id} onBack={() => setPage({ kind: 'kb' })} />}
          {page.kind === 'changes' && <ChangeList onOpen={(id) => setPage({ kind: 'change', id })} onNew={() => setPage({ kind: 'change', id: '__new:Normal' })} />}
          {page.kind === 'change' && <ChangeForm key={page.id} id={page.id} onBack={() => setPage({ kind: 'changes' })} onOpenIncident={(id) => setPage({ kind: 'form', id })} />}
          {page.kind === 'problems' && <ProblemList onOpen={(id) => setPage({ kind: 'problem', id })} onNew={() => setPage({ kind: 'problem', id: '__new' })} />}
          {page.kind === 'problem' && <ProblemForm key={page.id} id={page.id} onBack={() => setPage({ kind: 'problems' })} onOpenIncident={(id) => setPage({ kind: 'form', id })} />}
          {page.kind === 'dashboard' && <Dashboard onList={(f) => setPage({ kind: 'list', filter: f })} onOpen={(id) => setPage({ kind: 'form', id })} />}
          {page.kind === 'groups' && <GroupsPage />}
          {page.kind === 'users' && <UsersPage />}
        </div>
      </div>
    </FlashContext.Provider>
  )
}
