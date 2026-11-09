import { useEffect, useMemo, useRef, useState } from 'react'
import { Bell, ChevronDown, CircleHelp, Cloud, Pencil, Plus, Search, Settings, Star, X } from 'lucide-react'
import type { AppProps } from '@/os/registry'
import { logoUrl } from '@/os/registry'
import { useWin } from '@/os/context'
import { useCollection } from '@/db/db'
import { Avatar } from '@/components/Avatar'
import { ME } from '@/data/people'
import { NavCtx, OBJ, ObjIcon, useNav as useNavLocal, type Route } from './ui'
import { Home } from './Home'
import { ListView } from './ListView'
import { OpportunityPage } from './Opportunity'
import { AccountPage, ContactPage, LeadPage } from './Records'
import { SearchResults, ReportsPage, DashboardsPage, ForecastsPage, ChatterPage, FilesPage } from './Other'

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
    ].slice(0, 8)
  }, [q, opps, accts, contacts, leads])
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
  const scroller = useRef<HTMLDivElement>(null)

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
      const rec = [...opps, ...accts, ...contacts, ...leads].find((x) => x.id === r.id)
      setUrl(`${HOST}/lightning/r/${r.object}/${r.id}/view`)
      setTitle(`${rec?.name ?? r.object} | ${OBJ[r.object]?.label ?? r.object} | Salesforce`)
    } else if (r.page === 'search') {
      setUrl(`${HOST}/one/one.app#${btoa(JSON.stringify({ componentDef: 'forceSearch:searchPageDesktop', attributes: { term: r.q } })).slice(0, 64)}`)
      setTitle(`Search Results | Salesforce`)
    }
  }, [route, win.id, win.url === undefined])

  const activeTab = route.page === 'home' ? 'Home' : route.page === 'list' || route.page === 'record' ? route.object : ''

  return (
    <NavCtx.Provider value={{ go: setRoute, route }}>
      <div className="flex-1 min-h-0 flex flex-col text-[13px] text-[#181818]" style={{ fontFamily: 'var(--font-sf)', background: '#B0C4DF' }}>
        {/* global header */}
        <div className="h-[50px] shrink-0 bg-white flex items-center px-3 gap-4 relative z-30">
          <div className="w-[230px] shrink-0 flex items-center">
            <img src={logoUrl('salesforce')} alt="Salesforce" className="h-[30px]" />
          </div>
          <div className="flex-1 flex justify-center">
            <GlobalSearch />
          </div>
          <div className="w-[300px] shrink-0 flex items-center justify-end gap-1 text-[#747474]">
            <div className="flex items-center">
              <button className="w-7 h-7 rounded flex items-center justify-center hover:bg-[#F3F3F3]" aria-label="Favorites">
                <Star size={18} />
              </button>
              <button className="w-4 h-7 flex items-center justify-center" aria-label="Favorites list">
                <ChevronDown size={12} />
              </button>
            </div>
            <button className="w-7 h-7 rounded flex items-center justify-center hover:bg-[#F3F3F3]" aria-label="Global Actions">
              <span className="w-[18px] h-[18px] rounded-[3px] border-[1.5px] border-[#747474] flex items-center justify-center">
                <Plus size={12} strokeWidth={3} />
              </span>
            </button>
            <button className="w-8 h-8 rounded flex items-center justify-center hover:bg-[#F3F3F3]" aria-label="Guidance Center">
              <Cloud size={19} />
            </button>
            <button className="w-8 h-8 rounded flex items-center justify-center hover:bg-[#F3F3F3]" aria-label="Help">
              <CircleHelp size={19} />
            </button>
            <button className="w-8 h-8 rounded flex items-center justify-center hover:bg-[#F3F3F3]" aria-label="Setup">
              <Settings size={19} />
            </button>
            <button className="relative w-8 h-8 rounded flex items-center justify-center hover:bg-[#F3F3F3]" aria-label="Notifications">
              <Bell size={19} />
              <span className="absolute top-0.5 right-0.5 min-w-[15px] h-[15px] px-1 rounded-full bg-[#BA0517] text-white text-[10px] font-bold leading-[15px]">3</span>
            </button>
            <button className="ml-1" aria-label="View profile">
              <Avatar id={ME.id} size={32} />
            </button>
          </div>
        </div>
        {/* app nav (context bar) */}
        <div className="h-10 shrink-0 bg-white flex items-stretch border-b-[3px] border-[#1B96FF] relative z-20" style={{ boxShadow: '0 2px 3px rgba(0,0,0,0.12)' }}>
          <button data-agent="sf-app-launcher" aria-label="App Launcher" className="w-12 flex items-center justify-center hover:bg-[#F3F3F3]">
            <Waffle />
          </button>
          <div className="flex items-center pr-6 pl-1 text-[18px] text-[#181818] whitespace-nowrap">Sales</div>
          <nav className="flex items-stretch min-w-0 overflow-hidden">
            {TABS.map(([obj, label]) => {
              const active = activeTab === obj
              return (
                <div key={obj} className={`relative flex items-stretch ${active ? 'bg-[#F3F6FB]' : 'hover:bg-[#F3F3F3]'}`}>
                  <button
                    data-agent={`sf-nav-${label.toLowerCase()}`}
                    aria-label={label}
                    onClick={() => setRoute(obj === 'Home' ? { page: 'home' } : { page: 'list', object: obj })}
                    className="px-3 flex items-center text-[13px] text-[#181818] whitespace-nowrap"
                  >
                    {label}
                  </button>
                  {obj !== 'Home' && obj !== 'Chatter' && obj !== 'Forecasts' && (
                    <span className="flex items-center pr-2 pl-0.5 text-[#747474]">
                      <ChevronDown size={13} />
                    </span>
                  )}
                  {active && <span className="absolute left-0 right-0 -bottom-[3px] h-[3px] bg-[#0176D3]" />}
                </div>
              )
            })}
          </nav>
          <div className="flex-1" />
          <button className="w-10 flex items-center justify-center text-[#747474] hover:bg-[#F3F3F3]" aria-label="Edit nav items">
            <Pencil size={14} />
          </button>
        </div>
        {/* page */}
        <div ref={scroller} className="flex-1 min-h-0 overflow-auto relative" style={{ backgroundImage: 'linear-gradient(180deg, #8FB0DB 0px, #A9C1E1 120px, #B0C4DF 260px)' }}>
          {route.page === 'home' && <Home />}
          {route.page === 'list' && (route.object === 'Report' ? <ReportsPage /> : route.object === 'Dashboard' ? <DashboardsPage /> : route.object === 'Forecasts' ? <ForecastsPage /> : route.object === 'Chatter' ? <ChatterPage /> : route.object === 'File' ? <FilesPage /> : <ListView key={route.object} object={route.object} />)}
          {route.page === 'record' && route.object === 'Opportunity' && <OpportunityPage key={route.id} id={route.id} />}
          {route.page === 'record' && route.object === 'Account' && <AccountPage key={route.id} id={route.id} />}
          {route.page === 'record' && route.object === 'Contact' && <ContactPage key={route.id} id={route.id} />}
          {route.page === 'record' && route.object === 'Lead' && <LeadPage key={route.id} id={route.id} />}
          {route.page === 'search' && <SearchResults q={route.q} />}
        </div>
      </div>
    </NavCtx.Provider>
  )
}
