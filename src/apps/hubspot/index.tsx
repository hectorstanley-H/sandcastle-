import { useEffect, useState } from 'react'
import { Bell, Bookmark, ChartColumn, ChevronDown, CircleHelp, Database, FileEdit, Headset, LayoutGrid, Megaphone, Phone, Search, Settings, ShoppingCart, Sparkles, TrendingUp, Users, Workflow } from 'lucide-react'
import type { AppProps } from '@/os/registry'
import { logoUrl } from '@/os/registry'
import { useWin } from '@/os/context'
import { Avatar } from '@/components/Avatar'
import { ME } from '@/data/people'
import { HNav, PORTAL, type HRoute } from './ui'
import { ObjectIndex, ContactRecord } from './Crm'
import { ListsIndex, ListBuilder, ListDetail, SequencesIndex, SequenceDetail, EmailsIndex } from './Marketing'

const NAV: { id: string; icon: any; label: string; items?: [string, HRoute | null][] }[] = [
  { id: 'bookmarks', icon: Bookmark, label: 'Bookmarks', items: [['Contacts', { page: 'contacts' }], ['Lists', { page: 'lists' }], ['Sequences', { page: 'sequences' }]] },
  { id: 'crm', icon: Users, label: 'CRM', items: [['Contacts', { page: 'contacts' }], ['Companies', { page: 'companies' }], ['Deals', { page: 'deals' }], ['Tickets', null], ['Lists', { page: 'lists' }], ['Inbox', null], ['Calls', null], ['Tasks', null]] },
  { id: 'marketing', icon: Megaphone, label: 'Marketing', items: [['Campaigns', null], ['Email', { page: 'emails' }], ['Social', null], ['Ads', null], ['Events', null], ['Forms', null], ['Lists', { page: 'lists' }], ['Lead Scoring', null]] },
  { id: 'content', icon: FileEdit, label: 'Content', items: [['Website Pages', null], ['Landing Pages', null], ['Blog', null], ['Videos', null]] },
  { id: 'sales', icon: TrendingUp, label: 'Sales', items: [['Sales Workspace', null], ['Deals', { page: 'deals' }], ['Sequences', { page: 'sequences' }], ['Meetings', null], ['Forecast', null], ['Playbooks', null]] },
  { id: 'commerce', icon: ShoppingCart, label: 'Commerce', items: [['Quotes', null], ['Payments', null], ['Invoices', null]] },
  { id: 'service', icon: Headset, label: 'Service', items: [['Help Desk', null], ['Tickets', null], ['Knowledge Base', null]] },
  { id: 'data', icon: Database, label: 'Data Management', items: [['Data Model', null], ['Properties', null], ['Data Quality', null]] },
  { id: 'automation', icon: Workflow, label: 'Automation', items: [['Workflows', null], ['Sequences', { page: 'sequences' }], ['Chatflows', null]] },
  { id: 'reporting', icon: ChartColumn, label: 'Reporting', items: [['Dashboards', null], ['Reports', null], ['Goals', null]] },
]

const H = 'https://app.hubspot.com'
const urlFor = (r: HRoute) => {
  switch (r.page) {
    case 'contacts': return [`${H}/contacts/${PORTAL}/objects/0-1/views/all/list`, 'Contacts | HubSpot']
    case 'companies': return [`${H}/contacts/${PORTAL}/objects/0-2/views/all/list`, 'Companies | HubSpot']
    case 'deals': return [`${H}/contacts/${PORTAL}/objects/0-3/views/all/board`, 'Deals | HubSpot']
    case 'contact': return [`${H}/contacts/${PORTAL}/record/0-1/${r.id}`, 'Contact | HubSpot']
    case 'lists': return [`${H}/contacts/${PORTAL}/objectLists/views/all`, 'Lists | HubSpot']
    case 'list': return [`${H}/contacts/${PORTAL}/objectLists/${r.id.replace(/\D/g, '') || r.id}/filters`, 'List | HubSpot']
    case 'list-new': return [`${H}/contacts/${PORTAL}/objectLists/create`, 'Create list | HubSpot']
    case 'sequences': return [`${H}/sequences/${PORTAL}`, 'Sequences | HubSpot']
    case 'sequence': return [`${H}/sequences/${PORTAL}/sequence/${r.id}`, 'Sequence | HubSpot']
    case 'emails': return [`${H}/email/${PORTAL}/manage/state/all`, 'Marketing Email | HubSpot']
  }
}

export default function HubSpot({ win, params }: AppProps) {
  const { setUrl, setTitle } = useWin()
  const [route, setRoute] = useState<HRoute>({ page: 'contacts' })
  const [fly, setFly] = useState<string | null>(null)

  useEffect(() => {
    if (!params) return
    if (params.contactId) setRoute({ page: 'contact', id: params.contactId })
    else if (params.listId) setRoute({ page: 'list', id: params.listId })
    else if (params.sequenceId) setRoute({ page: 'sequence', id: params.sequenceId })
    else if (params.page) setRoute({ page: params.page } as HRoute)
  }, [win.nonce])
  useEffect(() => {
    const [u, t] = urlFor(route)
    setUrl(u)
    setTitle(t)
  }, [route, win.id])

  const go = (r: HRoute) => {
    setFly(null)
    setRoute(r)
  }
  const flyItem = NAV.find((n) => n.id === fly)

  return (
    <HNav.Provider value={{ go }}>
      <div className="flex-1 min-h-0 flex text-[14px] text-[#33475B] bg-white relative" style={{ fontFamily: "'Lexend Deca', Inter, 'Helvetica Neue', Arial, sans-serif" }}>
        {/* left vertical nav */}
        <div className="w-[56px] shrink-0 bg-[#213343] flex flex-col items-center py-2 gap-0.5 z-30">
          <button className="w-10 h-10 flex items-center justify-center mb-2" aria-label="HubSpot home" onClick={() => go({ page: 'contacts' })}>
            <img src={logoUrl('hubspot-sprocket')} className="w-7 h-7" alt="HubSpot" />
          </button>
          {NAV.map((n) => (
            <button key={n.id} data-agent={`hs-nav-${n.id}`} aria-label={n.label} title={n.label} onClick={() => setFly(fly === n.id ? null : n.id)} className={`w-10 h-10 rounded-[4px] flex items-center justify-center ${fly === n.id ? 'bg-[#425B76] text-white' : 'text-[#CBD6E2] hover:bg-[#2D3E50] hover:text-white'}`}>
              <n.icon size={19} />
            </button>
          ))}
          <div className="flex-1" />
          <button className="w-10 h-10 flex items-center justify-center text-[#CBD6E2]" aria-label="Marketplace"><LayoutGrid size={18} /></button>
          <button className="w-10 h-10 flex items-center justify-center text-[#CBD6E2]" aria-label="Settings"><Settings size={18} /></button>
        </div>
        {flyItem && (
          <div className="absolute left-[56px] top-0 bottom-0 w-[240px] bg-[#2D3E50] text-white z-30 py-4 shadow-[4px_0_12px_rgba(0,0,0,0.2)]">
            <div className="px-5 pb-3 text-[16px] font-semibold">{flyItem.label}</div>
            {flyItem.items?.map(([l, r]) => (
              <button key={l} data-agent={`hs-subnav-${flyItem.id}-${l.toLowerCase().replace(/\s+/g, '-')}`} aria-label={l} onClick={() => r && go(r)} className="w-full text-left px-5 h-9 text-[14px] text-[#EAF0F6] hover:bg-[#425B76]">
                {l}
              </button>
            ))}
          </div>
        )}
        {fly && <div className="absolute inset-0 z-20" onClick={() => setFly(null)} />}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* top bar */}
          <div className="h-12 shrink-0 bg-[#213343] flex items-center px-4 gap-3 text-white">
            <div className="flex items-center h-8 w-[420px] rounded-[3px] bg-[#2D3E50] border border-[#425B76] px-3 gap-2 text-[#CBD6E2]">
              <Search size={15} />
              <span className="text-[13.5px]">Search HubSpot</span>
              <span className="ml-auto text-[11px] border border-[#516F90] rounded px-1">⌘K</span>
            </div>
            <div className="flex-1" />
            <button className="text-[13px] font-semibold text-[#FF8F73] mr-2">Upgrade</button>
            {[Phone, LayoutGrid, CircleHelp, Settings].map((I, i) => (
              <button key={i} className="w-8 h-8 rounded flex items-center justify-center text-[#EAF0F6] hover:bg-[#2D3E50]"><I size={17} /></button>
            ))}
            <button className="relative w-8 h-8 rounded flex items-center justify-center text-[#EAF0F6] hover:bg-[#2D3E50]">
              <Bell size={17} />
              <span className="absolute top-0.5 right-0 w-4 h-4 rounded-full bg-[#F2545B] text-[10px] font-bold flex items-center justify-center">2</span>
            </button>
            <button className="flex items-center gap-1 h-8 px-2 rounded-full bg-[#2D3E50] text-[13px] font-semibold"><Sparkles size={15} className="text-[#FF8F73]" /> Copilot</button>
            <button className="flex items-center gap-2 pl-2 text-[13px]">
              <Avatar id={ME.id} size={28} />
              <span>Northwind Global</span>
              <ChevronDown size={14} />
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-auto bg-[#F5F8FA]">
            {route.page === 'contacts' && <ObjectIndex key="c" object="contacts" />}
            {route.page === 'companies' && <ObjectIndex key="co" object="companies" />}
            {route.page === 'deals' && <ObjectIndex key="d" object="deals" />}
            {route.page === 'contact' && <ContactRecord key={route.id} id={route.id} />}
            {route.page === 'lists' && <ListsIndex />}
            {route.page === 'list-new' && <ListBuilder />}
            {route.page === 'list' && <ListDetail key={route.id} id={route.id} />}
            {route.page === 'sequences' && <SequencesIndex />}
            {route.page === 'sequence' && <SequenceDetail key={route.id} id={route.id} />}
            {route.page === 'emails' && <EmailsIndex />}
          </div>
        </div>
      </div>
    </HNav.Provider>
  )
}
