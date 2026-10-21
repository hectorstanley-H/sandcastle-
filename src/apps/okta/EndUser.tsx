import { useMemo, useState } from 'react'
import { MagnifyingGlass, CaretDown, CaretUp, SquaresFour, Bell, Plus, DotsThreeVertical, Briefcase, ClockCounterClockwise, ShieldCheck, Gear, SignOut, Question, SortAscending } from '@phosphor-icons/react'
import { useCollection } from '@/db/db'
import { useDesk } from '@/os/context'
import { getApp, logoUrl } from '@/os/registry'
import { ME } from '@/data/people'
import { addLog, appTarget, isFresh, HWChip, type OktaApp, type OktaAssignment, type Route } from './shared'

export function NorthwindLogo({ height = 30 }: { height?: number }) {
  return (
    <svg height={height} viewBox="0 0 168 36" aria-label="Northwind Global">
      <g transform="translate(18 18)">
        <circle r="16" fill="#0B3A5B" />
        <path d="M0 -12 L4 0 L0 12 L-4 0 Z" fill="#fff" />
        <path d="M-12 0 L0 -3 L12 0 L0 3 Z" fill="#7FC4E8" />
        <circle r="2" fill="#0B3A5B" />
      </g>
      <text x="42" y="17" fontFamily="Inter, Arial" fontWeight="800" fontSize="15" fill="#0B3A5B" letterSpacing="0.5">NORTHWIND</text>
      <text x="42" y="31" fontFamily="Inter, Arial" fontWeight="500" fontSize="10" fill="#4C7490" letterSpacing="3.2">GLOBAL</text>
    </svg>
  )
}

function Tile({ app, onOpen, small }: { app: OktaApp; onOpen: () => void; small?: boolean }) {
  return (
    <div
      role="button"
      tabIndex={0}
      data-agent={`okta-app-${app.id}`}
      aria-label={`Launch ${app.tile ?? app.label}`}
      onClick={onOpen}
      className={`group relative bg-white rounded-lg border border-[#E1E1E6] hover:shadow-[0_2px_10px_rgba(29,29,33,0.12)] hover:border-[#C8C8CE] cursor-pointer flex flex-col items-center ${small ? 'w-[168px] h-[128px]' : 'w-[184px] h-[148px]'}`}
    >
      <div className="flex-1 flex items-center justify-center w-full px-4 pt-3">
        <img src={logoUrl(app.logo)} alt="" className={small ? 'w-11 h-11' : 'w-[52px] h-[52px]'} />
      </div>
      <div className="h-[44px] w-full px-3 flex items-start justify-center text-center text-[13px] leading-[17px] text-[#1D1D21] font-medium">
        <span className="line-clamp-2">{app.tile ?? app.label}</span>
      </div>
      <button aria-label="App settings" onClick={(e) => e.stopPropagation()} className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full flex items-center justify-center text-[#6E6E78] opacity-0 group-hover:opacity-100 hover:bg-[#F4F4F4]">
        <DotsThreeVertical size={18} weight="bold" />
      </button>
    </div>
  )
}

function Section({ title, icon, children, count }: { title: string; icon: any; children: any; count: number }) {
  const [open, setOpen] = useState(true)
  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        <button onClick={() => setOpen(!open)} className="flex items-center gap-2 text-[17px] font-semibold text-[#1D1D21]">
          {icon}
          {title}
          <span className="text-[13px] font-normal text-[#6E6E78]">({count})</span>
          {open ? <CaretUp size={14} /> : <CaretDown size={14} />}
        </button>
        <div className="flex-1" />
        <button aria-label="Section options" className="w-8 h-8 rounded flex items-center justify-center text-[#6E6E78] hover:bg-[#E9E9EC]">
          <DotsThreeVertical size={18} weight="bold" />
        </button>
      </div>
      {open && <div className="flex flex-wrap gap-4">{children}</div>}
    </section>
  )
}

export function EndUser({ go }: { go: (r: Route) => void }) {
  const { open, isAgent } = useDesk()
  const apps = useCollection<OktaApp>('okta.apps')
  const assigns = useCollection<OktaAssignment>('okta.assignments')
  const [q, setQ] = useState('')
  const [menu, setMenu] = useState(false)
  const [nav, setNav] = useState<'apps' | 'notifications' | 'add'>('apps')

  const mine = useMemo(() => {
    const ids = new Set(assigns.filter((a) => a.userId === 'okta-u-alex').map((a) => a.appId))
    return apps.filter((a) => ids.has(a.id))
  }, [apps, assigns])
  const recentIds = ['outlook', 'salesforce', 'servicenow', 'workday', 'slack', 'sap']
  const recent = recentIds.map((id) => mine.find((a) => a.id === id)).filter(Boolean) as OktaApp[]
  const filtered = q ? mine.filter((a) => (a.tile ?? a.label).toLowerCase().includes(q.toLowerCase())) : mine
  const fresh = assigns.filter((a) => a.userId === 'okta-u-alex' && isFresh(a.assignedAt))

  const launch = (a: OktaApp) => {
    addLog(isAgent, 'user.authentication.sso', 'User single sign on to app', [appTarget(a), { type: 'User', displayName: ME.name, alternateId: ME.email }])
    const target = a.id === 'hworker' ? 'hworker' : a.id
    if (getApp(target)) open(target)
  }

  const NavItem = ({ id, icon, label, badge }: { id: typeof nav; icon: any; label: string; badge?: number }) => (
    <button onClick={() => setNav(id)} className={`w-full flex items-center gap-3 h-10 px-4 rounded-md text-[14px] ${nav === id ? 'bg-[#E6EEFC] text-[#1450B8] font-semibold' : 'text-[#1D1D21] hover:bg-[#F4F4F4]'}`}>
      {icon}
      <span className="flex-1 text-left">{label}</span>
      {badge ? <span className="min-w-5 h-5 px-1.5 rounded-full bg-[#DA372C] text-white text-[11px] font-semibold flex items-center justify-center">{badge}</span> : null}
    </button>
  )

  return (
    <div className="flex-1 min-h-0 flex">
      {/* sidebar */}
      <aside className="w-[248px] shrink-0 bg-white border-r border-[#E1E1E6] flex flex-col">
        <div className="h-[72px] flex items-center px-6 border-b border-[#EBEBED]">
          <NorthwindLogo />
        </div>
        <nav className="flex-1 overflow-auto p-3 space-y-0.5">
          <NavItem id="apps" icon={<SquaresFour size={20} weight={nav === 'apps' ? 'fill' : 'regular'} />} label="My Apps" />
          <div className="pl-[44px] pr-2 py-1 space-y-0.5">
            <a className="block h-8 leading-8 text-[13px] text-[#1D1D21] hover:text-[#1662DD] cursor-pointer">Work</a>
            <a className="block h-8 leading-8 text-[13px] text-[#1D1D21] hover:text-[#1662DD] cursor-pointer">Recently used</a>
            <a className="flex items-center gap-1.5 h-8 text-[13px] text-[#1662DD] font-medium cursor-pointer"><Plus size={14} weight="bold" /> Add section</a>
          </div>
          <div className="h-px bg-[#EBEBED] my-2 mx-2" />
          <NavItem id="notifications" icon={<Bell size={20} />} label="Notifications" badge={2} />
          <NavItem id="add" icon={<Plus size={20} />} label="Add apps" />
        </nav>
        <div className="px-6 py-4 border-t border-[#EBEBED] text-[11px] text-[#6E6E78] flex items-center justify-between">
          <span>© 2026 Okta, Inc.</span>
          <span className="flex items-center gap-1">Powered by <img src={logoUrl('okta-wordmark')} className="h-[11px]" alt="okta" /></span>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        {/* top bar */}
        <header className="h-[72px] shrink-0 bg-white border-b border-[#E1E1E6] flex items-center px-8 gap-4">
          <div className="flex items-center gap-2 h-10 w-full max-w-[520px] rounded-md border border-[#8C8C96] px-3 focus-within:border-[#1662DD] focus-within:shadow-[0_0_0_2px_#C4D7F7]">
            <MagnifyingGlass size={18} className="text-[#6E6E78]" />
            <input data-agent="okta-home-search" aria-label="Search your apps" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your apps" className="flex-1 bg-transparent outline-none text-[14px]" />
          </div>
          <div className="flex-1" />
          <button
            data-agent="okta-admin-button"
            aria-label="Admin"
            onClick={() => go({ area: 'admin', page: 'dashboard' })}
            className="flex items-center gap-2 h-9 px-3.5 rounded-[4px] border border-[#8C8C96] text-[14px] font-semibold hover:bg-[#F4F4F4]"
          >
            <ShieldCheck size={18} /> Admin
          </button>
          <div className="relative">
            <button aria-label="User menu" onClick={() => setMenu(!menu)} className="flex items-center gap-2 h-10 pl-1 pr-2 rounded-md hover:bg-[#F4F4F4]">
              <span className="w-8 h-8 rounded-full bg-[#1662DD] text-white text-[13px] font-semibold flex items-center justify-center">AM</span>
              <span className="text-[14px] font-medium">Alex</span>
              <CaretDown size={14} />
            </button>
            {menu && (
              <div className="absolute right-0 top-12 w-64 bg-white rounded-lg border border-[#E1E1E6] shadow-[0_8px_24px_rgba(29,29,33,0.16)] z-30 py-2 text-[14px]">
                <div className="px-4 py-2">
                  <div className="font-semibold">Alex Morgan</div>
                  <div className="text-[12px] text-[#6E6E78]">{ME.email}</div>
                  <div className="text-[12px] text-[#6E6E78]">northwind.okta.com</div>
                </div>
                <div className="h-px bg-[#EBEBED] my-1" />
                {[[Gear, 'Settings'], [Question, 'Help'], [SignOut, 'Sign out']].map(([I, l]: any) => (
                  <button key={l} className="w-full flex items-center gap-3 px-4 h-9 hover:bg-[#F4F4F4]"><I size={18} /> {l}</button>
                ))}
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 min-h-0 overflow-auto px-8 py-7">
          {nav === 'apps' && (
            <>
              <div className="flex items-center mb-6">
                <h1 className="text-[28px] font-semibold tracking-[-0.2px]">My Apps</h1>
                <div className="flex-1" />
                <button className="flex items-center gap-1.5 h-8 px-2.5 rounded text-[13px] text-[#1D1D21] hover:bg-[#E9E9EC]"><SortAscending size={16} /> Sort</button>
              </div>
              {fresh.length > 0 && (
                <div className="flash-new mb-6 flex items-center gap-3 rounded-md bg-white border border-[#DCCBF0] px-4 py-3 text-[13px]">
                  <HWChip /> {fresh.length} new app{fresh.length > 1 ? 's were' : ' was'} added to your dashboard.
                </div>
              )}
              {!q && (
                <Section title="Recently used" count={recent.length} icon={<ClockCounterClockwise size={18} />}>
                  {recent.map((a) => (
                    <div key={a.id} className="contents" data-agent-skip>
                      <RecentTile app={a} onOpen={() => launch(a)} />
                    </div>
                  ))}
                </Section>
              )}
              <Section title={q ? 'Search results' : 'Work'} count={filtered.length} icon={<Briefcase size={18} />}>
                {filtered.map((a) => (
                  <Tile key={a.id} app={a} onOpen={() => launch(a)} />
                ))}
                {!filtered.length && <div className="text-[14px] text-[#6E6E78] py-6">No apps match “{q}”.</div>}
              </Section>
            </>
          )}
          {nav === 'notifications' && (
            <div className="max-w-[760px]">
              <h1 className="text-[28px] font-semibold mb-6">Notifications</h1>
              {[
                ['New sign-on to your account', 'Edge 130.0 on Windows 11 · Boston, Massachusetts, United States', '4 minutes ago'],
                ['Your password was changed', 'If you did not make this change, contact your administrator.', '3 hours ago'],
              ].map(([t, d, w]) => (
                <div key={t} className="bg-white rounded-lg border border-[#E1E1E6] p-4 mb-3 flex gap-3">
                  <Bell size={20} className="text-[#1662DD] mt-0.5" />
                  <div className="flex-1">
                    <div className="text-[14px] font-semibold">{t}</div>
                    <div className="text-[13px] text-[#6E6E78]">{d}</div>
                  </div>
                  <div className="text-[12px] text-[#6E6E78]">{w}</div>
                </div>
              ))}
            </div>
          )}
          {nav === 'add' && (
            <div>
              <h1 className="text-[28px] font-semibold mb-2">Add apps</h1>
              <p className="text-[14px] text-[#6E6E78] mb-6">Browse apps your organization makes available. Some apps require admin approval.</p>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-3">
                {apps.filter((a) => !mine.includes(a)).map((a) => (
                  <div key={a.id} className="bg-white rounded-lg border border-[#E1E1E6] p-4 flex items-center gap-3">
                    <img src={logoUrl(a.logo)} className="w-9 h-9" alt="" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-semibold truncate">{a.label}</div>
                      <div className="text-[12px] text-[#6E6E78]">Requires approval</div>
                    </div>
                    <button className="h-8 px-3 rounded-[4px] border border-[#8C8C96] text-[13px] font-semibold hover:bg-[#F4F4F4]">Request</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

function RecentTile({ app, onOpen }: { app: OktaApp; onOpen: () => void }) {
  return (
    <div role="button" aria-label={`Launch ${app.tile ?? app.label}`} onClick={onOpen} className="bg-white rounded-lg border border-[#E1E1E6] hover:shadow-[0_2px_10px_rgba(29,29,33,0.12)] cursor-pointer flex items-center gap-3 w-[232px] h-[64px] px-4">
      <img src={logoUrl(app.logo)} alt="" className="w-8 h-8" />
      <span className="text-[13px] font-medium truncate">{app.tile ?? app.label}</span>
    </div>
  )
}
