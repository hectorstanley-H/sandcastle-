import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useCollection } from '@/db/db'
import { Bell, Bookmark, ChartColumn, ChevronDown, CircleHelp, Database, FileEdit, Headset, LayoutGrid, Megaphone, Phone, Search, Settings, ShoppingCart, Sparkles, TrendingUp, Users, Workflow } from 'lucide-react'
import type { AppProps } from '@/os/registry'
import { logoUrl } from '@/os/registry'
import { useWin } from '@/os/context'
import { Avatar } from '@/components/Avatar'
import { ME } from '@/data/people'
import { HNav, PORTAL, type HRoute } from './ui'
import { ObjectIndex } from './ObjectIndex'
import { ContactRecord, CompanyRecord, DealRecord } from './Records'
import { TasksPage } from './Tasks'
import { TicketsIndex, TicketRecord } from './Tickets'
import { HomeDashboard, ReportsPage } from './Home'
import { ListsIndex, ListBuilder, ListDetail, SequencesIndex, SequenceDetail, EmailsIndex } from './Marketing'
import { InboxPage } from './Inbox'
import { KbIndex, KbArticle } from './KnowledgeBase'
import { ProductsIndex, QuotesIndex, QuoteEditor, QuoteDetail } from './Commerce'
import { WorkflowsIndex, WorkflowEditor } from './Workflows'
import { FormsIndex, FormEditor } from './Forms'
import { CallsPage, MeetingsPage } from './Engagements'
import { GoalsPage, PropertiesPage } from './Data'
import { db } from '@/db/db'
import { hsDate } from './ui'

const NAV: { id: string; icon: any; label: string; items?: [string, HRoute | null][] }[] = [
  { id: 'bookmarks', icon: Bookmark, label: 'Bookmarks', items: [['Contacts', { page: 'contacts' }], ['Inbox', { page: 'inbox' }], ['Lists', { page: 'lists' }], ['Sequences', { page: 'sequences' }], ['Quotes', { page: 'quotes' }]] },
  { id: 'crm', icon: Users, label: 'CRM', items: [['Contacts', { page: 'contacts' }], ['Companies', { page: 'companies' }], ['Deals', { page: 'deals' }], ['Tickets', { page: 'tickets' }], ['Lists', { page: 'lists' }], ['Inbox', { page: 'inbox' }], ['Calls', { page: 'calls' }], ['Tasks', { page: 'tasks' }]] },
  { id: 'marketing', icon: Megaphone, label: 'Marketing', items: [['Campaigns', null], ['Email', { page: 'emails' }], ['Social', null], ['Ads', null], ['Events', null], ['Forms', { page: 'forms' }], ['Lists', { page: 'lists' }], ['Lead Scoring', null]] },
  { id: 'content', icon: FileEdit, label: 'Content', items: [['Website Pages', null], ['Landing Pages', null], ['Blog', null], ['Videos', null]] },
  { id: 'sales', icon: TrendingUp, label: 'Sales', items: [['Sales Workspace', { page: 'home' }], ['Deals', { page: 'deals' }], ['Sequences', { page: 'sequences' }], ['Meetings', { page: 'meetings' }], ['Calls', { page: 'calls' }], ['Quotes', { page: 'quotes' }], ['Forecast', { page: 'reports', tab: 'Forecast' }], ['Playbooks', null]] },
  { id: 'commerce', icon: ShoppingCart, label: 'Commerce', items: [['Quotes', { page: 'quotes' }], ['Products', { page: 'products' }], ['Payments', null], ['Invoices', null]] },
  { id: 'service', icon: Headset, label: 'Service', items: [['Help Desk', { page: 'tickets' }], ['Inbox', { page: 'inbox' }], ['Tickets', { page: 'tickets' }], ['Knowledge Base', { page: 'kb' }]] },
  { id: 'data', icon: Database, label: 'Data Management', items: [['Data Model', null], ['Properties', { page: 'properties' }], ['Data Quality', null]] },
  { id: 'automation', icon: Workflow, label: 'Automation', items: [['Workflows', { page: 'workflows' }], ['Sequences', { page: 'sequences' }], ['Chatflows', null]] },
  { id: 'reporting', icon: ChartColumn, label: 'Reporting', items: [['Dashboards', { page: 'home' }], ['Reports', { page: 'reports', tab: 'Pipeline' }], ['Goals', { page: 'goals' }]] },
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
    case 'home': return [`${H}/reports-dashboard/${PORTAL}/sales`, 'Sales dashboard | HubSpot']
    case 'company': return [`${H}/contacts/${PORTAL}/record/0-2/${r.id}`, 'Company | HubSpot']
    case 'deal': return [`${H}/contacts/${PORTAL}/record/0-3/${r.id}`, 'Deal | HubSpot']
    case 'tasks': return [`${H}/tasks/${PORTAL}/view/all`, 'Tasks | HubSpot']
    case 'tickets': return [`${H}/contacts/${PORTAL}/objects/0-5/views/all/board`, 'Tickets | HubSpot']
    case 'ticket': return [`${H}/contacts/${PORTAL}/record/0-5/${r.id}`, 'Ticket | HubSpot']
    case 'reports': return [`${H}/reports-list/${PORTAL}`, 'Reports | HubSpot']
    case 'emails': return [`${H}/email/${PORTAL}/manage/state/all`, 'Marketing Email | HubSpot']
    case 'inbox': return [`${H}/live-messages/${PORTAL}/inbox${r.id ? '/' + r.id : ''}`, 'Inbox | HubSpot']
    case 'calls': return [`${H}/calls/${PORTAL}/view/all`, 'Calls | HubSpot']
    case 'meetings': return [`${H}/meetings/${PORTAL}`, 'Meetings | HubSpot']
    case 'products': return [`${H}/settings/${PORTAL}/sales/products`, 'Product library | HubSpot']
    case 'quotes': return [`${H}/contacts/${PORTAL}/objects/0-14/views/all/list`, 'Quotes | HubSpot']
    case 'quote': return [`${H}/contacts/${PORTAL}/record/0-14/${r.id}`, 'Quote | HubSpot']
    case 'quote-new': return [`${H}/quotes/${PORTAL}/create`, 'Create quote | HubSpot']
    case 'workflows': return [`${H}/workflows/${PORTAL}/view/all`, 'Workflows | HubSpot']
    case 'workflow': return [`${H}/workflows/${PORTAL}/platform/flow/${r.id}/edit`, 'Workflow | HubSpot']
    case 'forms': return [`${H}/forms/${PORTAL}`, 'Forms | HubSpot']
    case 'form': return [`${H}/forms/${PORTAL}/editor/${r.id}/edit/form`, 'Form | HubSpot']
    case 'kb': return [`${H}/knowledge/${PORTAL}/insights/articles`, 'Knowledge base | HubSpot']
    case 'kb-article': return [`${H}/knowledge/${PORTAL}/edit/${r.id}`, 'Knowledge article | HubSpot']
    case 'goals': return [`${H}/goals/${PORTAL}`, 'Goals | HubSpot']
    case 'properties': return [`${H}/property-settings/${PORTAL}/properties`, 'Properties | HubSpot']
  }
}

export default function HubSpot({ win, params }: AppProps) {
  const { setUrl, setTitle } = useWin()
  const [route, setRoute] = useState<HRoute>({ page: 'contacts' })
  const [fly, setFly] = useState<string | null>(null)
  const [modal, setModal] = useState<ReactNode | null>(null)
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!params) return
    if (params.dealId) setRoute({ page: 'deal', id: params.dealId })
    else if (params.companyId) setRoute({ page: 'company', id: params.companyId })
    else if (params.ticketId) setRoute({ page: 'ticket', id: params.ticketId })
    else if (params.contactId) setRoute({ page: 'contact', id: params.contactId })
    else if (params.listId) setRoute({ page: 'list', id: params.listId })
    else if (params.sequenceId) setRoute({ page: 'sequence', id: params.sequenceId })
    else if (params.quoteId) setRoute({ page: 'quote', id: params.quoteId })
    else if (params.workflowId) setRoute({ page: 'workflow', id: params.workflowId })
    else if (params.conversationId) setRoute({ page: 'inbox', id: params.conversationId })
    else if (params.page) setRoute({ page: params.page } as HRoute)
  }, [win.nonce])
  useEffect(() => {
    const [u, t] = urlFor(route)
    setUrl(u)
    setTitle(t)
  }, [route, win.id])

  const go = (r: HRoute) => {
    setFly(null)
    setModal(null)
    setRoute(r)
  }
  const toast = (m: string) => {
    setToastMsg(m)
    setTimeout(() => setToastMsg((x) => (x === m ? null : x)), 3500)
  }
  const flyItem = NAV.find((n) => n.id === fly)

  return (
    <HNav.Provider value={{ go, open: setModal, toast }}>
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
        {modal}
        {toastMsg && <div className="absolute top-14 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 rounded-[4px] bg-[#00BDA5] text-white text-[14px] font-medium shadow-lg" data-agent="hs-toast">{toastMsg}</div>}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* top bar */}
          <div className="h-12 shrink-0 bg-[#213343] flex items-center px-4 gap-3 text-white">
            <GlobalSearch go={go} />
            <div className="flex-1" />
            <button className="text-[13px] font-semibold text-[#FF8F73] mr-2">Upgrade</button>
            {[Phone, LayoutGrid, CircleHelp, Settings].map((I, i) => (
              <button key={i} className="w-8 h-8 rounded flex items-center justify-center text-[#EAF0F6] hover:bg-[#2D3E50]"><I size={17} /></button>
            ))}
            <Notifications go={go} />
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
            {route.page === 'home' && <HomeDashboard />}
            {route.page === 'company' && <CompanyRecord key={route.id} id={route.id} />}
            {route.page === 'deal' && <DealRecord key={route.id} id={route.id} />}
            {route.page === 'tasks' && <TasksPage />}
            {route.page === 'tickets' && <TicketsIndex />}
            {route.page === 'ticket' && <TicketRecord key={route.id} id={route.id} />}
            {route.page === 'reports' && <ReportsPage key={route.tab ?? 'r'} tab={route.tab} />}
            {route.page === 'inbox' && <InboxPage id={route.id} />}
            {route.page === 'calls' && <CallsPage />}
            {route.page === 'meetings' && <MeetingsPage />}
            {route.page === 'products' && <ProductsIndex />}
            {route.page === 'quotes' && <QuotesIndex />}
            {route.page === 'quote' && <QuoteDetail key={route.id} id={route.id} />}
            {route.page === 'quote-new' && <QuoteEditor key={route.dealId ?? 'new'} dealId={route.dealId} />}
            {route.page === 'workflows' && <WorkflowsIndex />}
            {route.page === 'workflow' && <WorkflowEditor key={route.id} id={route.id} />}
            {route.page === 'forms' && <FormsIndex />}
            {route.page === 'form' && <FormEditor key={route.id} id={route.id} />}
            {route.page === 'kb' && <KbIndex />}
            {route.page === 'kb-article' && <KbArticle key={route.id} id={route.id} />}
            {route.page === 'goals' && <GoalsPage />}
            {route.page === 'properties' && <PropertiesPage />}
          </div>
        </div>
      </div>
    </HNav.Provider>
  )
}

function GlobalSearch({ go }: { go: (r: HRoute) => void }) {
  const [q, setQ] = useState('')
  const [focus, setFocus] = useState(false)
  const contacts = useCollection<any>('hubspot.contacts')
  const companies = useCollection<any>('hubspot.companies')
  const deals = useCollection<any>('hubspot.deals')
  const tickets = useCollection<any>('hubspot.tickets')
  const quotes = useCollection<any>('hubspot.quotes')
  const res = useMemo(() => {
    const n = q.trim().toLowerCase()
    if (!n) return []
    const m = (s: string) => s.toLowerCase().includes(n)
    return [
      ...contacts.filter((c) => m(`${c.firstName} ${c.lastName} ${c.email}`)).slice(0, 4).map((c) => ({ k: 'Contact', t: `${c.firstName} ${c.lastName}`, s: c.company, r: { page: 'contact', id: c.id } as HRoute })),
      ...companies.filter((c) => m(c.name)).slice(0, 3).map((c) => ({ k: 'Company', t: c.name, s: c.industry, r: { page: 'company', id: c.id } as HRoute })),
      ...deals.filter((d) => m(d.name)).slice(0, 3).map((d) => ({ k: 'Deal', t: d.name, s: d.stage, r: { page: 'deal', id: d.id } as HRoute })),
      ...tickets.filter((t) => m(t.subject)).slice(0, 2).map((t) => ({ k: 'Ticket', t: t.subject, s: t.status, r: { page: 'ticket', id: t.id } as HRoute })),
      ...quotes.filter((x) => m(`${x.number} ${x.title}`)).slice(0, 2).map((x) => ({ k: 'Quote', t: `${x.number} · ${x.title}`, s: x.status, r: { page: 'quote', id: x.id } as HRoute })),
    ]
  }, [q, contacts, companies, deals, tickets, quotes])
  return (
    <div className="relative">
      <div className="flex items-center h-8 w-[420px] rounded-[3px] bg-[#2D3E50] border border-[#425B76] px-3 gap-2 text-[#CBD6E2]">
        <Search size={15} />
        <input data-agent="hs-global-search" aria-label="Search HubSpot" value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => setFocus(true)} onBlur={() => setTimeout(() => setFocus(false), 150)} placeholder="Search HubSpot" className="flex-1 bg-transparent outline-none text-[13.5px] text-white placeholder:text-[#CBD6E2]" />
        <span className="text-[11px] border border-[#516F90] rounded px-1">⌘K</span>
      </div>
      {focus && q && (
        <div className="absolute top-9 left-0 w-[420px] bg-white text-[#33475B] rounded shadow-xl border border-[#CBD6E2] z-50 py-1 max-h-[360px] overflow-auto">
          {res.map((x, i) => (
            <button key={i} onMouseDown={() => { go(x.r); setQ('') }} className="w-full flex items-center gap-3 px-3 h-10 hover:bg-[#F5F8FA] text-left">
              <span className="text-[11px] font-semibold uppercase w-16 text-[#516F90]">{x.k}</span><span className="flex-1 truncate text-[13.5px]">{x.t}</span><span className="text-[12px] text-[#516F90] truncate max-w-[120px]">{x.s}</span>
            </button>
          ))}
          {!res.length && <div className="px-3 py-4 text-[13px] text-[#516F90]">No results for “{q}”.</div>}
        </div>
      )}
    </div>
  )
}

function Notifications({ go }: { go: (r: HRoute) => void }) {
  const items = useCollection<any>('hubspot.notifications')
  const [open, setOpen] = useState(false)
  const unread = items.filter((n) => !n.read).length
  const markAll = () => items.forEach((n) => !n.read && db.update('hubspot.notifications', n.id, { read: true }))
  return (
    <div className="relative">
      <button data-agent="hs-notifications" aria-label="Notifications" onClick={() => setOpen(!open)} className="relative w-8 h-8 rounded flex items-center justify-center text-[#EAF0F6] hover:bg-[#2D3E50]">
        <Bell size={17} />
        {unread > 0 && <span className="absolute top-0.5 right-0 min-w-4 h-4 px-1 rounded-full bg-[#F2545B] text-[10px] font-bold flex items-center justify-center">{unread}</span>}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 w-[380px] bg-white text-[#33475B] rounded shadow-xl border border-[#CBD6E2] z-50" data-agent="hs-notifications-panel">
            <div className="flex items-center justify-between px-4 h-11 border-b border-[#DFE3EB]">
              <span className="text-[15px] font-semibold">Notifications</span>
              {unread > 0 && <button onClick={markAll} className="text-[12.5px] text-[#0091AE] font-medium hover:underline">Mark all as read</button>}
            </div>
            <div className="max-h-[420px] overflow-auto">
              {items.slice(0, 30).map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    db.update('hubspot.notifications', n.id, { read: true })
                    setOpen(false)
                    if (n.route?.page) go(n.route as HRoute)
                  }}
                  className={`w-full text-left px-4 py-3 border-b border-[#EAF0F6] hover:bg-[#F5F8FA] flex gap-3 ${n.read ? '' : 'bg-[#F0FAFC]'}`}
                >
                  <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${n.read ? 'bg-transparent' : 'bg-[#00A4BD]'}`} />
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13.5px] font-medium">{n.title}</span>
                    <span className="block text-[12.5px] text-[#516F90] line-clamp-2">{n.body}</span>
                    <span className="block text-[11.5px] text-[#7C98B6] mt-0.5">{hsDate(n.date, true)}</span>
                  </span>
                </button>
              ))}
              {!items.length && <div className="px-4 py-8 text-center text-[13px] text-[#516F90]">You’re all caught up.</div>}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
