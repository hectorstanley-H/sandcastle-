import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Pencil, Search, X } from 'lucide-react'
import type { AppProps } from '@/os/registry'
import { logoUrl } from '@/os/registry'
import { useWin } from '@/os/context'
import { useCollection } from '@/db/db'
import { NavCtx, OBJ, ObjIcon, useNav as useNavLocal, type MenuItem, type Route } from './ui'
import { ActionHost, ActionsCtx, type ActionReq } from './forms'
import { ToastView, useToast } from './record'
import { AppLauncher, EXTRA_NAV, EditNav, Favorites, GlobalActions, Guidance, Help, Notifications, Profile, SetupMenu } from './Header'
import { Home } from './Home'
import { ListView } from './ListView'
import { OpportunityPage } from './Opportunity'
import { AccountPage, CasePage, ContactPage, LeadPage } from './Records'
import { SearchResults, ReportsPage, ReportRun, DashboardsPage, ForecastsPage, ChatterPage, FilesPage, SetupPage } from './Other'

const TABS: [string, string][] = [
  ['Home', 'Home'],
  ['Opportunity', 'Opportunities'],
  ['Lead', 'Leads'],
  ['Task', 'Tasks'],
  ['File', 'Files'],
  ['Account', 'Accounts'],
  ['Contact', 'Contacts'],
  ['Campaign', 'Campaigns'],
  ['Dashboard', 'Dashboards'],
  ['Report', 'Reports'],
  ['Chatter', 'Chatter'],
  ['Forecasts', 'Forecasts'],
]

const HOST = 'https://northwind.lightning.force.com'

function Waffle() {
  return (
    <span className="grid grid-cols-3 gap-[3px]">
      {Array.from({ length: 9 }).map((_, i) => (
        <span key={i} className="w-[5px] h-[5px] rounded-full bg-[#747474]" />
      ))}
    </span>
  )
}

function GlobalSearch() {
  const { go } = useNavLocal()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const opps = useCollection<any>('salesforce.opportunities')
  const accts = useCollection<any>('salesforce.accounts')
  const contacts = useCollection<any>('salesforce.contacts')
  const leads = useCollection<any>('salesforce.leads')
  const cases = useCollection<any>('salesforce.cases')
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => {
      // ignore clicks on other desktops (e.g. another agent working at the same time)
      const desk = ref.current?.closest('[data-desk]')
      if (desk && !desk.contains(e.target as Node)) return
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  const results = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return []
    const acctName = (id: string) => accts.find((a) => a.id === id)?.name ?? ''
    return [
      ...opps.filter((o) => o.name.toLowerCase().includes(s)).map((o) => ({ id: o.id, object: 'Opportunity', name: o.name, sub: `Opportunity • ${acctName(o.accountId)} • ${o.stage}` })),
      ...accts.filter((a) => a.name.toLowerCase().includes(s)).map((a) => ({ id: a.id, object: 'Account', name: a.name, sub: `Account • ${a.city}` })),
      ...contacts.filter((c) => (c.name + ' ' + c.email).toLowerCase().includes(s)).map((c) => ({ id: c.id, object: 'Contact', name: c.name, sub: `Contact • ${acctName(c.accountId)} • ${c.title}` })),
      ...leads.filter((l) => (l.name + ' ' + l.company).toLowerCase().includes(s)).map((l) => ({ id: l.id, object: 'Lead', name: l.name, sub: `Lead • ${l.company}` })),
      ...cases.filter((c) => (c.caseNumber + ' ' + c.subject).toLowerCase().includes(s)).map((c) => ({ id: c.id, object: 'Case', name: `${c.caseNumber} — ${c.subject}`, sub: `Case • ${c.status}` })),
    ].slice(0, 8)
  }, [q, opps, accts, contacts, leads, cases])
  const recent = opps.filter((o) => o.ownerId === 'alex').slice(0, 5)

  return (
    <div ref={ref} className="relative w-full max-w-[708px]">
      <div className={`flex items-center h-8 rounded-[4px] border bg-white ${open ? 'border-[#1B96FF] shadow-[0_0_3px_#0176D3]' : 'border-[#747474]'}`}>
        <Search size={15} className="ml-3 text-[#747474]" />
        <input
          data-agent="sf-search"
          aria-label="Search"
          value={q}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQ(e.target.value)
            setOpen(true)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && q.trim()) {
              setOpen(false)
              go({ page: 'search', q: q.trim() })
            }
            if (e.key === 'Escape') setOpen(false)
          }}
          placeholder="Search..."
          className="flex-1 h-full px-2 bg-transparent outline-none text-[13px] text-[#181818] placeholder:text-[#747474]"
        />
        {q && (
          <button className="mr-2 text-[#747474]" onClick={() => setQ('')} aria-label="Clear">
            <X size={14} />
          </button>
        )}
      </div>
      {open && (
        <div className="absolute left-0 right-0 top-9 z-50 bg-white rounded-[4px] border border-[#E5E5E5] py-2" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.16)' }}>
          {!q && <div className="px-4 py-1 text-[11px] font-bold uppercase tracking-wide text-[#444]">Recent Items</div>}
          {(q ? results : recent.map((o) => ({ id: o.id, object: 'Opportunity', name: o.name, sub: 'Opportunity' }))).map((r) => (
            <button
              key={r.id}
              data-agent={`sf-search-result-${r.id}`}
              onClick={() => {
                setOpen(false)
                setQ('')
                go({ page: 'record', object: r.object, id: r.id })
              }}
              className="w-full flex items-center gap-3 px-4 py-1.5 hover:bg-[#F3F3F3] text-left"
            >
              <ObjIcon type={r.object} size={24} />
              <div className="min-w-0">
                <div className="text-[13px] text-[#181818] truncate">
                  <Highlight text={r.name} q={q} />
                </div>
                <div className="text-[12px] text-[#444] truncate">{r.sub}</div>
              </div>
            </button>
          ))}
          {q && (
            <button onClick={() => go({ page: 'search', q })} className="w-full flex items-center gap-3 px-4 py-2 mt-1 border-t border-[#E5E5E5] hover:bg-[#F3F3F3] text-left text-[13px]">
              <Search size={16} className="text-[#747474]" /> Show more results for "<b>{q}</b>"
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function Highlight({ text, q }: { text: string; q: string }) {
  if (!q) return <>{text}</>
  const i = text.toLowerCase().indexOf(q.toLowerCase())
  if (i < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, i)}
      <mark className="bg-transparent font-bold text-[#181818]">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  )
}


export default function Salesforce({ win, params }: AppProps) {
  const { setUrl, setTitle } = useWin()
  const [route, setRoute] = useState<Route>({ page: 'home' })
  const opps = useCollection<any>('salesforce.opportunities')
  const accts = useCollection<any>('salesforce.accounts')
  const contacts = useCollection<any>('salesforce.contacts')
  const leads = useCollection<any>('salesforce.leads')
  const cases = useCollection<any>('salesforce.cases')
  const prefs = useCollection<any>('salesforce.prefs')
  const scroller = useRef<HTMLDivElement>(null)
  const [action, setAction] = useState<ActionReq | null>(null)
  const { toast, show, hide } = useToast()
  const [launcher, setLauncher] = useState(false)
  const [editNav, setEditNav] = useState(false)
  const [navMenu, setNavMenu] = useState<{ obj: string; left: number } | null>(null)
  const [recent, setRecent] = useState<{ object: string; id: string }[]>([])
  const extraNav = (prefs.find((p) => p.id === 'navExtra')?.items ?? []) as string[]
  const tabs: [string, string][] = [...TABS, ...EXTRA_NAV.filter(([k]) => extraNav.includes(k))]

  useEffect(() => {
    if (!params) return
    if (params.object && params.id) setRoute({ page: 'record', object: params.object, id: params.id })
    else if (params.object) setRoute({ page: 'list', object: params.object })
    else if (params.tab === 'home') setRoute({ page: 'home' })
    else if (params.q) setRoute({ page: 'search', q: params.q })
  }, [win.nonce])

  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 })
    const r = route
    if (r.page === 'home') {
      setUrl(`${HOST}/lightning/page/home`)
      setTitle('Home | Salesforce')
    } else if (r.page === 'list') {
      const o = OBJ[r.object]
      const isObj = !['File', 'Dashboard', 'Report', 'Chatter', 'Forecasts'].includes(r.object)
      setUrl(isObj ? `${HOST}/lightning/o/${r.object}/list?filterName=${r.object === 'Opportunity' ? 'AllOpportunities' : 'Recent'}` : `${HOST}/lightning/${r.object === 'Chatter' ? 'page/chatter' : r.object === 'Forecasts' ? 'n/standard-Forecasting3' : `o/${r.object}/home`}`)
      setTitle(`${r.object === 'Opportunity' ? 'All Opportunities' : 'Recently Viewed'} | ${o?.plural ?? r.object} | Salesforce`)
    } else if (r.page === 'record') {
      const rec = [...opps, ...accts, ...contacts, ...leads, ...cases].find((x) => x.id === r.id)
      setRecent((l) => [{ object: r.object, id: r.id }, ...l.filter((x) => x.id !== r.id)].slice(0, 12))
      setUrl(`${HOST}/lightning/r/${r.object}/${r.id}/view`)
      setTitle(`${rec?.name ?? r.object} | ${OBJ[r.object]?.label ?? r.object} | Salesforce`)
    } else if (r.page === 'search') {
      setUrl(`${HOST}/one/one.app#${btoa(unescape(encodeURIComponent(JSON.stringify({ componentDef: 'forceSearch:searchPageDesktop', attributes: { term: r.q } })))).slice(0, 64)}`)
      setTitle(`Search Results | Salesforce`)
    } else if (r.page === 'report') {
      setUrl(`${HOST}/lightning/r/Report/${r.id}/view`)
      setTitle('Report | Salesforce')
    } else if (r.page === 'setup') {
      setUrl(`${HOST}/lightning/setup/${r.tab === 'users' ? 'ManageUsers' : r.tab === 'objects' ? 'ObjectManager' : r.tab === 'company' ? 'CompanyProfileInfo' : 'SetupOneHome'}/home`)
      setTitle('Setup | Salesforce')
    }
  }, [route, win.id, win.url === undefined])

  const activeTab = route.page === 'home' ? 'Home' : route.page === 'list' || route.page === 'record' ? route.object : route.page === 'report' ? 'Report' : route.page === 'setup' ? 'Setup' : ''
  const recName = (x: { object: string; id: string }) => {
    const r = [...opps, ...accts, ...contacts, ...leads, ...cases].find((y) => y.id === x.id)
    return r ? r.name ?? `${r.caseNumber} — ${r.subject}` : null
  }
  const navItems = (obj: string, label: string) => {
    const canNew = ['Opportunity', 'Lead', 'Task', 'Account', 'Contact', 'Campaign', 'Case'].includes(obj)
    const rec = recent.filter((x) => x.object === obj).map((x) => ({ ...x, name: recName(x) })).filter((x) => x.name).slice(0, 5)
    return [
      ...(canNew ? [{ label: `New ${OBJ[obj]?.label ?? obj}`, icon: <span className="w-[18px] text-center text-[#0176D3] font-bold">+</span>, onClick: () => setAction({ kind: 'new', object: obj, stay: ['Task', 'Campaign'].includes(obj) }) }] : []),
      { label: obj === 'Report' ? 'All Reports' : obj === 'Dashboard' ? 'All Dashboards' : obj === 'File' ? 'Recent Files' : `All ${label}`, onClick: () => setRoute({ page: 'list', object: obj }) },
      ...(rec.length ? [{ label: 'Recent records', header: true }, ...rec.map((x) => ({ label: x.name, icon: <ObjIcon type={obj} size={18} />, onClick: () => setRoute({ page: 'record', object: obj, id: x.id }) }))] : []),
    ]
  }

  return (
    <NavCtx.Provider value={{ go: setRoute, route }}>
     <ActionsCtx.Provider value={{ run: setAction, toast: show }}>
      <div className="flex-1 min-h-0 flex flex-col text-[13px] text-[#181818] relative" style={{ fontFamily: 'var(--font-sf)', background: '#B0C4DF' }}>
        {/* global header */}
        <div className="h-[50px] shrink-0 bg-white flex items-center px-3 gap-4 relative z-30">
          <div className="w-[230px] shrink-0 flex items-center">
            <img src={logoUrl('salesforce')} alt="Salesforce" className="h-[30px]" />
          </div>
          <div className="flex-1 flex justify-center">
            <GlobalSearch />
          </div>
          <div className="w-[300px] shrink-0 flex items-center justify-end gap-1 text-[#747474]">
            <Favorites route={route} />
            <GlobalActions />
            <Guidance />
            <Help />
            <SetupMenu />
            <Notifications />
            <Profile />
          </div>
        </div>
        {/* app nav (context bar) */}
        <div data-sf-bar className="h-10 shrink-0 bg-white flex items-stretch border-b-[3px] border-[#1B96FF] relative z-20" style={{ boxShadow: '0 2px 3px rgba(0,0,0,0.12)' }}>
          <button data-agent="sf-app-launcher" aria-label="App Launcher" onClick={() => setLauncher(true)} className="w-12 flex items-center justify-center hover:bg-[#F3F3F3]">
            <Waffle />
          </button>
          <div className="flex items-center pr-6 pl-1 text-[18px] text-[#181818] whitespace-nowrap">Sales</div>
          <nav className="flex items-stretch min-w-0 overflow-hidden">
            {tabs.map(([obj, label]) => {
              const active = activeTab === obj
              return (
                <div key={obj} className={`relative flex items-stretch ${active ? 'bg-[#F3F6FB]' : 'hover:bg-[#F3F3F3]'}`}>
                  <button
                    data-agent={`sf-nav-${label.toLowerCase()}`}
                    aria-label={label}
                    onClick={() => setRoute(obj === 'Home' ? { page: 'home' } : obj === 'Setup' ? { page: 'setup' } : { page: 'list', object: obj })}
                    className="px-3 flex items-center text-[13px] text-[#181818] whitespace-nowrap"
                  >
                    {label}
                  </button>
                  {obj !== 'Home' && obj !== 'Chatter' && obj !== 'Forecasts' && obj !== 'Setup' && (
                    <button
                      aria-label={`${label} List`}
                      data-sf-navchev
                      onClick={(e) => {
                        const el = e.currentTarget.parentElement as HTMLElement
                        const bar = el.closest('[data-sf-bar]') as HTMLElement
                        setNavMenu(navMenu?.obj === obj ? null : { obj, left: el.getBoundingClientRect().left - bar.getBoundingClientRect().left })
                      }}
                      className="flex items-center pr-2 pl-0.5 text-[#747474]"
                    >
                      <ChevronDown size={13} />
                    </button>
                  )}
                  {active && <span className="absolute left-0 right-0 -bottom-[3px] h-[3px] bg-[#0176D3]" />}
                </div>
              )
            })}
          </nav>
          {navMenu && (() => {
            const t = tabs.find(([o]) => o === navMenu.obj)
            if (!t) return null
            return <NavMenu left={navMenu.left} items={navItems(t[0], t[1])} onClose={() => setNavMenu(null)} />
          })()}
          <div className="flex-1" />
          <button className="w-10 flex items-center justify-center text-[#747474] hover:bg-[#F3F3F3]" aria-label="Edit nav items" onClick={() => setEditNav(true)}>
            <Pencil size={14} />
          </button>
        </div>
        {/* page */}
        <div ref={scroller} className="flex-1 min-h-0 overflow-auto relative" style={{ backgroundImage: 'linear-gradient(180deg, #8FB0DB 0px, #A9C1E1 120px, #B0C4DF 260px)' }}>
          <ToastView toast={toast} hide={hide} />
          {route.page === 'home' && <Home />}
          {route.page === 'list' && (route.object === 'Report' ? <ReportsPage /> : route.object === 'Dashboard' ? <DashboardsPage /> : route.object === 'Forecasts' ? <ForecastsPage /> : route.object === 'Chatter' ? <ChatterPage /> : route.object === 'File' ? <FilesPage /> : <ListView key={route.object} object={route.object} />)}
          {route.page === 'record' && route.object === 'Opportunity' && <OpportunityPage key={route.id} id={route.id} />}
          {route.page === 'record' && route.object === 'Account' && <AccountPage key={route.id} id={route.id} />}
          {route.page === 'record' && route.object === 'Contact' && <ContactPage key={route.id} id={route.id} />}
          {route.page === 'record' && route.object === 'Lead' && <LeadPage key={route.id} id={route.id} />}
          {route.page === 'record' && route.object === 'Case' && <CasePage key={route.id} id={route.id} />}
          {route.page === 'search' && <SearchResults key={route.q} q={route.q} />}
          {route.page === 'report' && <ReportRun key={route.id} id={route.id} />}
          {route.page === 'setup' && <SetupPage key={route.tab ?? 'home'} tab={route.tab} />}
        </div>
        <ActionHost req={action} onClose={() => setAction(null)} />
        {launcher && <AppLauncher onClose={() => setLauncher(false)} />}
        {editNav && <EditNav onClose={() => setEditNav(false)} />}
      </div>
     </ActionsCtx.Provider>
    </NavCtx.Provider>
  )
}

function NavMenu({ items, onClose, left }: { left: number; items: MenuItem[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      const desk = ref.current?.closest('[data-desk]')
      if (desk && !desk.contains(t)) return
      if (t.closest?.('[data-sf-navchev]')) return
      if (ref.current && !ref.current.contains(t)) onClose()
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])
  return (
    <div ref={ref} className="absolute top-full z-40" style={{ left }}>
      <div role="menu" className="mt-[3px] bg-white rounded-[4px] border border-[#E5E5E5] py-1 w-[260px]" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.16)' }}>
        {items.map((it, i) =>
          it.header ? (
            <div key={i} className="px-3 pt-2 pb-1 text-[11px] font-bold uppercase tracking-wide text-[#444]">{it.label}</div>
          ) : (
            <button key={i} role="menuitem" onClick={() => { onClose(); it.onClick?.() }} className="w-full flex items-center gap-2 px-3 h-8 text-[13px] hover:bg-[#F3F3F3] text-left">
              {it.icon}
              <span className="truncate">{it.label}</span>
            </button>
          ),
        )}
      </div>
    </div>
  )
}
