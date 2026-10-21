import { useEffect, useState } from 'react'
import { ChevronDown, Search, Globe, HelpCircle, Bell, Star, MessageCircle, Sparkles, X, Pin } from 'lucide-react'
import type { AppProps } from '@/os/registry'
import { useWin } from '@/os/context'
import { useCollection } from '@/db/db'
import { ME } from '@/data/people'
import { Avatar } from '@/components/Avatar'
import { IncidentList, FILTERS } from './List'
import { IncidentForm, MultiUpdate } from './Form'
import { CatalogHome, CatalogItem, OrderStatus, RequestList, CAT_ITEMS } from './Catalog'
import { SN_FONT, Wordmark, type Incident } from './shared'

type Page =
  | { kind: 'list'; filter: string }
  | { kind: 'form'; id: string }
  | { kind: 'multi'; ids: string[] }
  | { kind: 'catalog' }
  | { kind: 'item'; itemId: string }
  | { kind: 'order'; requestId: string }
  | { kind: 'requests' }

const HOST = 'https://northwind.service-now.com'

function AllMenu({ onGo, onClose }: { onGo: (p: Page) => void; onClose: () => void }) {
  const [q, setQ] = useState('')
  const groups: [string, [string, string, Page][]][] = [
    ['Self-Service', [['sn-nav-catalog', 'Service Catalog', { kind: 'catalog' }], ['sn-nav-requests', 'Requests', { kind: 'requests' }], ['sn-nav-my-incidents', 'Incidents', { kind: 'list', filter: 'mine' }]]],
    ['Incident', [
      ['sn-nav-incident-new', 'Create New', { kind: 'form', id: '__new' }],
      ['sn-nav-incident-assigned', 'Assigned to me', { kind: 'list', filter: 'mine' }],
      ['sn-nav-incident-open', 'Open', { kind: 'list', filter: 'open' }],
      ['sn-nav-incident-unassigned', 'Open - Unassigned', { kind: 'list', filter: 'unassigned' }],
      ['sn-nav-incident-resolved', 'Resolved', { kind: 'list', filter: 'resolved' }],
      ['sn-nav-incident-all', 'All', { kind: 'list', filter: 'all' }],
    ]],
    ['Service Catalog', [['sn-nav-catalog-2', 'Catalog', { kind: 'catalog' }], ['sn-nav-onboarding', 'New Hire Onboarding', { kind: 'item', itemId: 'cat-onboarding' }], ['sn-nav-laptop', 'Standard Laptop', { kind: 'item', itemId: 'cat-laptop' }]]],
    ['Problem', [['sn-nav-problem', 'Open Problems', { kind: 'list', filter: 'open' }]]],
    ['Change', [['sn-nav-change', 'All Changes', { kind: 'list', filter: 'all' }]]],
  ]
  return (
    <div className="absolute left-0 top-[48px] z-50 w-[360px] max-h-[calc(100%-56px)] bg-white rounded-b-[8px] shadow-[0_12px_32px_rgba(0,0,0,0.25)] flex flex-col" data-agent="sn-all-menu-panel">
      <div className="p-3 border-b border-[#DADDE2] flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#5B616B]" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter" className="w-full h-8 pl-7 pr-2 rounded-[4px] border border-[#8790A1] text-[14px] outline-none" data-agent="sn-all-filter" />
        </div>
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#EDEFF2]" aria-label="Close"><X size={16} /></button>
      </div>
      <div className="flex gap-4 px-4 pt-2 text-[13px] text-[#5B616B]"><span className="flex items-center gap-1"><Pin size={12} /> Pin all</span><span>Collapse all</span></div>
      <div className="overflow-auto py-2">
        {groups.map(([g, items]) => {
          const vis = items.filter(([, l]) => !q || (g + ' ' + l).toLowerCase().includes(q.toLowerCase()))
          if (!vis.length) return null
          return (
            <div key={g} className="mb-1">
              <div className="px-4 py-1.5 text-[14px] font-bold text-[#1B1D21] flex items-center gap-1"><ChevronDown size={14} /> {g}</div>
              {vis.map(([id, l, p]) => (
                <button key={id} data-agent={id} onClick={() => { onGo(p); onClose() }} className="w-full text-left pl-9 pr-4 h-8 text-[14px] text-[#2E3238] hover:bg-[#EEF4FB] flex items-center group">
                  {l}
                  <Star size={13} className="ml-auto text-[#8A9099] opacity-0 group-hover:opacity-100" />
                </button>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function ServiceNow({ win, params }: AppProps) {
  const { setUrl, setTitle } = useWin()
  const [page, setPage] = useState<Page>({ kind: 'list', filter: 'open' })
  const [menu, setMenu] = useState<string | null>(null)
  const [listFilter, setListFilter] = useState('open')
  useEffect(() => {
    if (page.kind === 'list') setListFilter(page.filter)
  }, [page])
  const incidents = useCollection<Incident>('servicenow.incidents')

  useEffect(() => {
    if (params?.sysId || params?.incidentId) setPage({ kind: 'form', id: params.sysId ?? params.incidentId })
    else if (params?.requestId) setPage({ kind: 'order', requestId: params.requestId })
    else if (params?.catalogItem) setPage({ kind: 'item', itemId: params.catalogItem })
    else if (params?.view === 'catalog') setPage({ kind: 'catalog' })
    else if (params?.list === 'incident' || params?.filter) setPage({ kind: 'list', filter: params.filter ?? 'open' })
  }, [win.nonce])

  useEffect(() => {
    if (page.kind === 'list') {
      setUrl(`${HOST}/now/nav/ui/classic/params/target/incident_list.do%3Fsysparm_query%3D${page.filter === 'unassigned' ? 'active%3Dtrue%5Eassignment_groupISEMPTY' : 'active%3Dtrue'}`)
      setTitle('Incidents | ServiceNow')
    } else if (page.kind === 'form') {
      const inc = incidents.find((i) => i.id === page.id)
      setUrl(`${HOST}/now/nav/ui/classic/params/target/incident.do%3Fsys_id%3D${page.id}`)
      setTitle(`${inc?.number ?? 'Incident'} | Incident | ServiceNow`)
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
    } else {
      setUrl(`${HOST}/now/nav/ui/classic/params/target/sc_request_list.do`)
      setTitle('Requests | ServiceNow')
    }
  }, [page, incidents.length])

  const pill = page.kind === 'list' ? 'Incidents' : page.kind === 'form' ? 'Incident' : page.kind === 'multi' ? 'Incident' : page.kind === 'requests' ? 'Requests' : page.kind === 'order' ? 'Order Status' : 'Service Catalog'
  const navs = ['All', 'Favorites', 'History', 'Workspaces', 'Admin']
  const go = (p: Page) => {
    if (p.kind === 'form' && p.id === '__new') return setPage({ kind: 'list', filter: 'open' })
    setPage(p)
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col relative" style={{ fontFamily: SN_FONT }}>
      {/* unified navigation */}
      <div className="h-[48px] shrink-0 flex items-center bg-[#032D42] text-white px-3 gap-1 relative z-40">
        <div className="pr-4 pl-1"><Wordmark /></div>
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
            {pill} <Star size={14} className="opacity-80" />
          </span>
        </div>
        <div className="relative">
          <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/70" />
          <input placeholder="Search" className="h-8 w-[240px] pl-8 pr-3 rounded-full bg-white/[0.08] border border-white/30 text-[14px] text-white placeholder:text-white/60 outline-none focus:bg-white focus:text-[#1B1D21]" />
        </div>
        {[Sparkles, Globe, HelpCircle, MessageCircle].map((I, i) => (
          <button key={i} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/10 text-white/90"><I size={18} /></button>
        ))}
        <button className="relative w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/10" aria-label="Notifications">
          <Bell size={18} />
          <span className="absolute top-1 right-1 h-4 min-w-4 px-1 rounded-full bg-[#E3242B] text-[10px] font-bold flex items-center justify-center">7</span>
        </button>
        <button className="ml-1 rounded-full ring-2 ring-white/40"><Avatar id={ME.id} size={30} /></button>
      </div>
      {menu === 'All' && <AllMenu onGo={go} onClose={() => setMenu(null)} />}
      {menu && menu !== 'All' && (
        <div className="absolute z-50 top-[48px] bg-white rounded-b-[8px] shadow-[0_12px_32px_rgba(0,0,0,0.25)] w-[300px] py-2 text-[14px]" style={{ left: 150 + navs.indexOf(menu) * 80 }}>
          {(menu === 'History'
            ? incidents.slice(0, 6).map((i) => [i.number, i.shortDescription, () => setPage({ kind: 'form', id: i.id })] as const)
            : menu === 'Favorites'
              ? ([['Open - Unassigned', 'Incident', () => setPage({ kind: 'list', filter: 'unassigned' })], ['Service Catalog', 'Self-Service', () => setPage({ kind: 'catalog' })]] as const)
              : ([['Service Operations Workspace', 'Workspace', () => {}], ['Employee Center', 'Portal', () => setPage({ kind: 'catalog' })], ['Platform Analytics', 'Workspace', () => {}]] as const)
          ).map(([a, b, fn]) => (
            <button key={a} onClick={() => { fn(); setMenu(null) }} className="w-full text-left px-4 py-1.5 hover:bg-[#EEF4FB]">
              <div className="text-[#1B1D21]">{a}</div>
              <div className="text-[12px] text-[#5B616B] truncate">{b}</div>
            </button>
          ))}
        </div>
      )}
      <div className="flex-1 min-h-0 flex flex-col" onClick={() => menu && setMenu(null)}>
        {page.kind === 'list' && (
          <IncidentList
            key={page.filter}
            filter={page.filter}
            onFilter={(f) => setPage({ kind: 'list', filter: f })}
            onOpen={(id) => setPage({ kind: 'form', id })}
            onNew={() => {}}
            onUpdateSelected={(ids) => setPage({ kind: 'multi', ids })}
          />
        )}
        {page.kind === 'form' && <IncidentForm id={page.id} onBack={() => setPage({ kind: 'list', filter: listFilter })} />}
        {page.kind === 'multi' && <MultiUpdate ids={page.ids} onBack={() => setPage({ kind: 'list', filter: listFilter })} />}
        {page.kind === 'catalog' && <CatalogHome onItem={(itemId) => setPage({ kind: 'item', itemId })} />}
        {page.kind === 'item' && <CatalogItem itemId={page.itemId} onOrdered={(requestId) => setPage({ kind: 'order', requestId })} onBack={() => setPage({ kind: 'catalog' })} />}
        {page.kind === 'order' && <OrderStatus requestId={page.requestId} onRequests={() => setPage({ kind: 'requests' })} />}
        {page.kind === 'requests' && <RequestList onOpen={(requestId) => setPage({ kind: 'order', requestId })} />}
      </div>
    </div>
  )
}

void FILTERS
