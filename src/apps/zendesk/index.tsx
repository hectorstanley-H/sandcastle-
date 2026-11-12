import { useCallback, useEffect, useMemo, useState } from 'react'
import { Home, List, Users, Building2, BarChart3, Settings, LayoutGrid, Search, Plus, X, ChevronDown, Bell, HelpCircle, MoreHorizontal, BookOpen, Ticket as TicketIcon, Play, Square } from 'lucide-react'
import type { AppProps } from '@/os/registry'
import { logoUrl } from '@/os/registry'
import { useDesk, useWin } from '@/os/context'
import { useCollection } from '@/db/db'
import { ME, person } from '@/data/people'
import { Avatar } from '@/components/Avatar'
import { type Ticket, STATUS, FONT, ZFlash, ZPop, ZItem, ago } from './shared'
import { ViewsPage, useAllViews, VIEWS } from './Views'
import { TicketPage, NewTicket } from './Ticket'
import { HomePage, PeoplePage, CustomerProfile, ReportingPage, AdminPage, GuidePage, SearchPage } from './Pages'

type Nav = 'home' | 'views' | 'customers' | 'orgs' | 'reporting' | 'admin' | 'guide' | 'search' | 'new' | 'profile'

export default function Zendesk({ win, params }: AppProps) {
  const { setUrl, setTitle, close } = useWin()
  const desk = useDesk()
  const tickets = useCollection<Ticket>('zendesk.tickets')
  const views = useAllViews()
  const [nav, setNav] = useState<Nav>('views')
  const [view, setView] = useState('unassigned')
  const [ticket, setTicket] = useState<string | null>(null)
  const [tabs, setTabs] = useState<string[]>([])
  const [play, setPlay] = useState<string[] | null>(null)
  const [profile, setProfile] = useState<{ email?: string; org?: string; from: Nav } | null>(null)
  const [searchQ, setSearchQ] = useState('')
  const [menu, setMenu] = useState<null | 'add' | 'status' | 'more' | 'bell' | 'help' | 'tray' | 'me' | 'rail-tray'>(null)
  const [presence, setPresence] = useState<'online' | 'away' | 'offline'>('online')
  const [adminTab, setAdminTab] = useState<'macros' | 'views' | 'team'>('macros')
  const [flag, setFlag] = useState<{ msg: string; at: number } | null>(null)
  const flash = useCallback((msg: string) => setFlag({ msg, at: Date.now() }), [])
  useEffect(() => {
    if (!flag) return
    const t = setTimeout(() => setFlag(null), 4500)
    return () => clearTimeout(t)
  }, [flag])

  const openTicket = (id: string) => {
    setTicket(id)
    setTabs((t) => (t.includes(id) ? t : [...t, id].slice(-5)))
  }
  useEffect(() => {
    if (params?.ticketId) {
      const t = tickets.find((x) => x.id === params.ticketId || String(x.number) === String(params.ticketId))
      if (t) openTicket(t.id)
    } else if (params?.view) {
      setNav('views')
      setView(params.view)
      setTicket(null)
    }
  }, [win.nonce])

  const cur = ticket ? tickets.find((t) => t.id === ticket) : undefined
  useEffect(() => {
    if (cur) {
      setUrl(`https://northwind.zendesk.com/agent/tickets/${cur.number}`)
      setTitle(`${cur.subject} – Ticket #${cur.number} – Northwind Support – Zendesk`)
    } else if (nav === 'views') {
      setUrl(`https://northwind.zendesk.com/agent/filters/${360000 + Math.max(0, VIEWS.findIndex((v) => v.id === view)) * 137}`)
      setTitle(`${views.find((v) => v.id === view)?.name} – Northwind Support – Zendesk`)
    } else if (nav === 'new') {
      setUrl('https://northwind.zendesk.com/agent/tickets/new/1')
      setTitle('New ticket – Northwind Support – Zendesk')
    } else if (nav === 'reporting') {
      setUrl('https://northwind.zendesk.com/explore/dashboard/support-overview')
      setTitle('Explore – Northwind Support – Zendesk')
    } else if (nav === 'admin') {
      setUrl(`https://northwind.zendesk.com/admin/workspaces/agent-workspace/${adminTab}`)
      setTitle('Admin Center – Zendesk')
    } else if (nav === 'guide') {
      setUrl('https://support.northwind.com/hc/en-us')
      setTitle('Northwind Help Center')
    } else if (nav === 'search') {
      setUrl(`https://northwind.zendesk.com/agent/search/1?q=${encodeURIComponent(searchQ)}`)
      setTitle('Search – Northwind Support – Zendesk')
    } else if (nav === 'customers' || nav === 'orgs' || nav === 'profile') {
      setUrl(`https://northwind.zendesk.com/agent/${nav === 'orgs' || profile?.org ? 'organizations' : 'users'}`)
      setTitle(`${nav === 'orgs' ? 'Organizations' : 'Customers'} – Northwind Support – Zendesk`)
    } else {
      setUrl('https://northwind.zendesk.com/agent/dashboard')
      setTitle('Dashboard – Northwind Support – Zendesk')
    }
  }, [cur?.id, nav, view, adminTab, searchQ])

  const closeTab = (id: string) => {
    setTabs((t) => t.filter((x) => x !== id))
    if (ticket === id) setTicket(null)
  }
  const rail: [Nav, any, string][] = [['home', Home, 'Home'], ['views', List, 'Views'], ['customers', Users, 'Customers'], ['orgs', Building2, 'Organizations'], ['reporting', BarChart3, 'Reporting'], ['admin', Settings, 'Admin']]
  const allMine = useMemo(() => tickets.filter((t) => t.assignee === ME.id && !['solved', 'closed'].includes(t.status)).length, [tickets])
  const notifications = useMemo(
    () =>
      tickets
        .filter((t) => t.assignee === ME.id || t.followers?.includes(ME.id))
        .flatMap((t) => t.comments.filter((c) => c.author !== ME.id).slice(-1).map((c) => ({ t, c })))
        .sort((a, b) => +new Date(b.c.date) - +new Date(a.c.date))
        .slice(0, 8),
    [tickets],
  )
  const go = (n: Nav) => {
    setNav(n)
    setTicket(null)
    setMenu(null)
  }
  const openCustomer = (email: string) => {
    setProfile({ email, from: nav })
    setNav('profile')
    setTicket(null)
  }
  const onDone = () => {
    if (!cur) return
    closeTab(cur.id)
    if (play) {
      const rest = play.filter((id) => id !== cur.id && tickets.some((t) => t.id === id && !['solved', 'closed'].includes(t.status)))
      if (rest.length) {
        setPlay(rest)
        openTicket(rest[0])
        return
      }
      setPlay(null)
      flash('You’ve reached the end of the view')
    }
    setNav('views')
  }
  const tray = (
    <>
      <ZItem onClick={() => go('views')}><img src={logoUrl('zendesk')} className="w-5 h-4 object-contain" alt="" /> Support</ZItem>
      <ZItem onClick={() => go('guide')}><BookOpen size={16} /> Guide</ZItem>
      <ZItem onClick={() => go('reporting')}><BarChart3 size={16} /> Explore</ZItem>
      <ZItem onClick={() => go('admin')}><Settings size={16} /> Admin Center</ZItem>
    </>
  )

  return (
    <ZFlash.Provider value={flash}>
      <div className="flex-1 min-h-0 flex relative" style={{ fontFamily: FONT }}>
        <div className="w-[60px] shrink-0 bg-[#03363D] flex flex-col items-center py-3 gap-1 relative z-30">
          <img src={logoUrl('zendesk')} className="w-8 h-6 brightness-0 invert mb-4" alt="Zendesk" />
          {rail.map(([id, I, l]) => (
            <button key={id} data-agent={`zd-nav-${id}`} aria-label={l} title={l} onClick={() => { setNav(id); setTicket(null) }} className={`relative w-10 h-10 rounded-[6px] flex items-center justify-center ${(nav === id || (id === 'customers' && nav === 'profile' && !profile?.org) || (id === 'orgs' && nav === 'profile' && !!profile?.org)) && !ticket ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}>
              {nav === id && !ticket && <span className="absolute -left-[10px] top-2 bottom-2 w-1 rounded-r bg-white" />}
              <I size={20} />
            </button>
          ))}
          <div className="flex-1" />
          <span className="relative">
            <button data-zd-trigger aria-label="Zendesk products" title="Zendesk products" onClick={() => setMenu(menu === 'rail-tray' ? null : 'rail-tray')} className="w-10 h-10 rounded-[6px] flex items-center justify-center text-white/70 hover:bg-white/10"><LayoutGrid size={20} /></button>
            {menu === 'rail-tray' && <ZPop onClose={() => setMenu(null)} className="left-12 bottom-0 w-[200px]">{tray}</ZPop>}
          </span>
        </div>
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="h-[50px] shrink-0 flex items-center border-b border-[#D8DCDE] bg-white pl-3 pr-3 gap-2 relative z-20">
            <span className="relative">
              <button data-zd-trigger data-agent="zd-add" onClick={() => setMenu(menu === 'add' ? null : 'add')} className="h-8 px-3 rounded-[4px] text-[14px] text-[#2F3941] flex items-center gap-1 hover:bg-[#F8F9F9] font-semibold border border-[#C2C8CC]"><Plus size={15} /> Add</button>
              {menu === 'add' && (
                <ZPop onClose={() => setMenu(null)} className="left-0 top-9 w-[180px]">
                  <ZItem agent="zd-add-ticket" onClick={() => go('new')}><TicketIcon size={15} /> Ticket</ZItem>
                  <ZItem onClick={() => { setMenu(null); go('search') }}><Search size={15} /> Search</ZItem>
                </ZPop>
              )}
            </span>
            <div className="flex items-stretch h-full overflow-hidden">
              {tabs.map((id) => {
                const t = tickets.find((x) => x.id === id)
                if (!t) return null
                return (
                  <div key={id} className={`flex items-center gap-2 px-3 min-w-[160px] max-w-[220px] border-r border-[#E9EBED] cursor-pointer ${ticket === id ? 'bg-[#F8F9F9] shadow-[inset_0_-3px_0_#1F73B7]' : 'hover:bg-[#F8F9F9]'}`} onClick={() => setTicket(id)}>
                    <span className="w-5 h-5 rounded-[3px] text-[10px] font-bold flex items-center justify-center shrink-0" style={{ background: STATUS[t.status].bg, color: STATUS[t.status].fg }}>{STATUS[t.status].letter}</span>
                    <div className="min-w-0 leading-tight">
                      <div className="text-[13px] font-semibold truncate">{t.subject}</div>
                      <div className="text-[11px] text-[#68737D]">#{t.number}</div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); closeTab(id) }} className="ml-auto text-[#68737D] hover:text-[#2F3941]" aria-label="Close tab"><X size={14} /></button>
                  </div>
                )
              })}
            </div>
            {play && (
              <span className="h-7 px-2.5 rounded-full bg-[#EDF7FF] text-[#1F73B7] text-[12px] font-semibold flex items-center gap-1.5" data-agent="zd-play-indicator"><Play size={12} /> Playing {views.find((v) => v.id === view)?.name} · {play.length} left<button aria-label="Stop playing" onClick={() => setPlay(null)} className="ml-1"><Square size={11} /></button></span>
            )}
            <div className="flex-1" />
            <button aria-label="Search" onClick={() => go('search')} className={`w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#F8F9F9] ${nav === 'search' && !ticket ? 'text-[#1F73B7]' : 'text-[#68737D]'}`}><Search size={18} /></button>
            <span className="relative">
              <button data-zd-trigger onClick={() => setMenu(menu === 'status' ? null : 'status')} className="h-8 px-3 rounded-full border border-[#C2C8CC] text-[13px] flex items-center gap-1.5"><span className={`w-2.5 h-2.5 rounded-full ${presence === 'online' ? 'bg-[#038153]' : presence === 'away' ? 'bg-[#F79A3E]' : 'bg-[#87929D]'}`} /> {presence === 'online' ? 'Online' : presence === 'away' ? 'Away' : 'Offline'} <ChevronDown size={13} /></button>
              {menu === 'status' && (
                <ZPop onClose={() => setMenu(null)} className="right-0 top-9 w-[180px]">
                  {(['online', 'away', 'offline'] as const).map((p) => <ZItem key={p} onClick={() => { setPresence(p); setMenu(null) }}><span className={`w-2.5 h-2.5 rounded-full ${p === 'online' ? 'bg-[#038153]' : p === 'away' ? 'bg-[#F79A3E]' : 'bg-[#87929D]'}`} /> <span className="capitalize">{p}</span>{presence === p && <span className="ml-auto text-[#1F73B7]">✓</span>}</ZItem>)}
                </ZPop>
              )}
            </span>
            <span className="relative">
              <button data-zd-trigger aria-label="More" onClick={() => setMenu(menu === 'more' ? null : 'more')} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#F8F9F9] text-[#68737D]"><MoreHorizontal size={18} /></button>
              {menu === 'more' && (
                <ZPop onClose={() => setMenu(null)} className="right-0 top-10 w-[200px]">
                  <ZItem disabled={!tabs.length} onClick={() => { setTabs([]); setTicket(null); setMenu(null) }}>Close all tabs</ZItem>
                  <ZItem onClick={() => { setAdminTab('macros'); go('admin') }}>Manage macros</ZItem>
                  <ZItem onClick={() => go('guide')}>Help Center</ZItem>
                </ZPop>
              )}
            </span>
            <span className="relative">
              <button data-zd-trigger aria-label="Notifications" onClick={() => setMenu(menu === 'bell' ? null : 'bell')} className="relative w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#F8F9F9] text-[#68737D]"><Bell size={18} />{notifications.length > 0 && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#CC3340]" />}</button>
              {menu === 'bell' && (
                <ZPop onClose={() => setMenu(null)} className="right-0 top-10 w-[360px] !py-0">
                  <div className="px-4 py-3 font-semibold border-b border-[#E9EBED]">Notifications</div>
                  {notifications.map(({ t, c }) => (
                    <button key={c.id} onClick={() => { setMenu(null); openTicket(t.id) }} className="w-full text-left px-4 py-2.5 border-b border-[#F3F4F5] hover:bg-[#EDF7FF]">
                      <div className="text-[13px]"><b>{c.author === 'requester' ? t.requester.name : person(c.author).name}</b> {c.public ? 'replied on' : 'added a note to'} <b>#{t.number}</b></div>
                      <div className="text-[12px] text-[#68737D] truncate">{c.body}</div>
                      <div className="text-[11px] text-[#87929D]">{ago(c.date)}</div>
                    </button>
                  ))}
                  {!notifications.length && <div className="px-4 py-6 text-center text-[13px] text-[#68737D]">No new notifications</div>}
                </ZPop>
              )}
            </span>
            <span className="relative">
              <button data-zd-trigger aria-label="Help" onClick={() => setMenu(menu === 'help' ? null : 'help')} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#F8F9F9] text-[#68737D]"><HelpCircle size={18} /></button>
              {menu === 'help' && (
                <ZPop onClose={() => setMenu(null)} className="right-0 top-10 w-[220px]">
                  <ZItem onClick={() => go('guide')}>Help Center</ZItem>
                  <ZItem onClick={() => { setMenu(null); desk.open('edge', { q: 'Zendesk agent workspace keyboard shortcuts' }) }}>Keyboard shortcuts</ZItem>
                  <ZItem onClick={() => { setMenu(null); desk.open('edge', { q: 'Zendesk community' }) }}>Community</ZItem>
                </ZPop>
              )}
            </span>
            <span className="relative">
              <button data-zd-trigger aria-label="Zendesk products" onClick={() => setMenu(menu === 'tray' ? null : 'tray')} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#F8F9F9] text-[#68737D]"><LayoutGrid size={18} /></button>
              {menu === 'tray' && <ZPop onClose={() => setMenu(null)} className="right-0 top-10 w-[200px]">{tray}</ZPop>}
            </span>
            <span className="relative">
              <button data-zd-trigger aria-label="Profile" onClick={() => setMenu(menu === 'me' ? null : 'me')} className="relative block"><Avatar id={ME.id} size={32} /><span className={`absolute -right-0.5 -bottom-0.5 w-3 h-3 rounded-full border-2 border-white ${presence === 'online' ? 'bg-[#038153]' : presence === 'away' ? 'bg-[#F79A3E]' : 'bg-[#87929D]'}`} /></button>
              {menu === 'me' && (
                <ZPop onClose={() => setMenu(null)} className="right-0 top-10 w-[240px]">
                  <div className="px-4 py-2 border-b border-[#E9EBED]"><div className="font-semibold">{ME.name}</div><div className="text-[12px] text-[#68737D]">{ME.email}</div></div>
                  <ZItem onClick={() => { setMenu(null); setView('your-unsolved'); go('views') }}>Your unsolved tickets ({allMine})</ZItem>
                  <ZItem onClick={() => close()}>Sign out</ZItem>
                </ZPop>
              )}
            </span>
          </div>
          {cur ? (
            <TicketPage id={cur.id} onDone={onDone} onCustomer={openCustomer} onOpen={openTicket} />
          ) : nav === 'views' ? (
            <ViewsPage
              view={view}
              setView={setView}
              onOpen={openTicket}
              onPlay={(ids) => { setPlay(ids); openTicket(ids[0]) }}
              onManage={() => { setAdminTab('views'); go('admin') }}
            />
          ) : nav === 'home' ? (
            <HomePage onOpen={openTicket} onView={(v) => { setView(v); setNav('views') }} />
          ) : nav === 'customers' || nav === 'orgs' ? (
            <PeoplePage kind={nav} onOpenCustomer={openCustomer} onOpenOrg={(org) => { setProfile({ org, from: nav }); setNav('profile') }} />
          ) : nav === 'profile' && profile ? (
            <CustomerProfile key={profile.email ?? profile.org} email={profile.email} org={profile.org} onOpen={openTicket} onBack={() => setNav(profile.from === 'profile' ? 'customers' : profile.from)} onOpenCustomer={openCustomer} />
          ) : nav === 'reporting' ? (
            <ReportingPage onView={(v) => { setView(v); setNav('views') }} />
          ) : nav === 'admin' ? (
            <AdminPage key={adminTab} initialTab={adminTab} />
          ) : nav === 'guide' ? (
            <GuidePage />
          ) : nav === 'search' ? (
            <SearchPage initial={searchQ} onOpen={openTicket} onCustomer={openCustomer} />
          ) : nav === 'new' ? (
            <NewTicket onCreated={(id) => { setNav('views'); openTicket(id) }} onCancel={() => setNav('views')} />
          ) : (
            <HomePage onOpen={openTicket} onView={(v) => { setView(v); setNav('views') }} />
          )}
        </div>
        {flag && (
          <div className="absolute right-6 top-[62px] z-[70] min-w-[280px] max-w-[420px] bg-white rounded-[8px] border border-[#D8DCDE] shadow-[0_12px_32px_rgba(0,0,0,0.18)] px-4 py-3 flex items-start gap-3 text-[14px]" role="status" data-agent="zd-flash">
            <span className="w-5 h-5 rounded-full bg-[#038153] text-white flex items-center justify-center text-[11px] shrink-0 mt-0.5">✓</span>
            <span className="flex-1">{flag.msg}</span>
            <button aria-label="Dismiss" onClick={() => setFlag(null)} className="text-[#68737D]"><X size={14} /></button>
          </div>
        )}
      </div>
    </ZFlash.Provider>
  )
}

