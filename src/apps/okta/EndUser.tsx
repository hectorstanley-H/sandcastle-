import { useMemo, useRef, useState } from 'react'
import { MagnifyingGlass, CaretDown, CaretUp, SquaresFour, Bell, Plus, DotsThreeVertical, Briefcase, ClockCounterClockwise, ShieldCheck, Gear, SignOut, Question, SortAscending, FolderSimple, Check, DeviceMobile, Key, Fingerprint } from '@phosphor-icons/react'
import { db, uid, useCollection } from '@/db/db'
import { useDesk } from '@/os/context'
import { getApp, logoUrl } from '@/os/registry'
import { ME } from '@/data/people'
import { addLog, appTarget, Btn, inputCls, isFresh, HWChip, Menu, Modal, useOktaSetting, type OktaApp, type OktaAssignment, type OktaUser, type Route } from './shared'

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

type TileAction = { label: string; onClick: () => void }

function Tile({ app, onOpen, small, actions }: { app: OktaApp; onOpen: () => void; small?: boolean; actions?: TileAction[] }) {
  const [menu, setMenu] = useState(false)
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
      <button
        aria-label="App settings"
        onClick={(e) => {
          e.stopPropagation()
          setMenu(!menu)
        }}
        className={`absolute top-1.5 right-1.5 w-7 h-7 rounded-full flex items-center justify-center text-[#6E6E78] group-hover:opacity-100 hover:bg-[#F4F4F4] ${menu ? 'opacity-100 bg-[#F4F4F4]' : 'opacity-0'}`}
      >
        <DotsThreeVertical size={18} weight="bold" />
      </button>
      {menu && actions && (
        <div onClick={(e) => e.stopPropagation()}>
          <Menu className="right-1 top-9 w-52" onClose={() => setMenu(false)} items={actions} />
        </div>
      )}
    </div>
  )
}

function Section({ title, icon, children, count, menu, anchor }: { title: string; icon: any; children: any; count: number; menu?: TileAction[]; anchor?: (el: HTMLElement | null) => void }) {
  const [open, setOpen] = useState(true)
  const [opts, setOpts] = useState(false)
  return (
    <section className="mb-8" ref={anchor}>
      <div className="flex items-center gap-2 mb-3">
        <button onClick={() => setOpen(!open)} className="flex items-center gap-2 text-[17px] font-semibold text-[#1D1D21]">
          {icon}
          {title}
          <span className="text-[13px] font-normal text-[#6E6E78]">({count})</span>
          {open ? <CaretUp size={14} /> : <CaretDown size={14} />}
        </button>
        <div className="flex-1" />
        <div className="relative">
          <button aria-label="Section options" onClick={() => setOpts(!opts)} className="w-8 h-8 rounded flex items-center justify-center text-[#6E6E78] hover:bg-[#E9E9EC]">
            <DotsThreeVertical size={18} weight="bold" />
          </button>
          {opts && <Menu className="right-0 top-9 w-52" onClose={() => setOpts(false)} items={[{ label: open ? 'Collapse section' : 'Expand section', onClick: () => setOpen(!open) }, ...(menu ?? [])]} />}
        </div>
      </div>
      {open && <div className="flex flex-wrap gap-4">{children}</div>}
    </section>
  )
}

type Prefs = { hidden: string[]; sections: { id: string; name: string; apps: string[] }[]; sort: 'default' | 'az'; readNotifications: boolean; language: string }

export function EndUser({ go }: { go: (r: Route) => void }) {
  const { open, isAgent, toast } = useDesk()
  const apps = useCollection<OktaApp>('okta.apps')
  const assigns = useCollection<OktaAssignment>('okta.assignments')
  const reqs = useCollection<any>('okta.requests')
  const me = useCollection<OktaUser>('okta.users').find((u) => u.id === 'okta-u-alex')
  const [prefs, setPrefs] = useOktaSetting<Prefs>('enduser-alex', { hidden: [], sections: [], sort: 'default', readNotifications: false, language: 'English (US)' })
  const [q, setQ] = useState('')
  const [menu, setMenu] = useState(false)
  const [nav, setNav] = useState<'apps' | 'notifications' | 'add' | 'settings'>('apps')
  const [signedOut, setSignedOut] = useState(false)
  const [dlg, setDlg] = useState<null | { kind: 'section' } | { kind: 'request'; app: OktaApp }>(null)
  const [reason, setReason] = useState('')
  const [secName, setSecName] = useState('')
  const [secApps, setSecApps] = useState<string[]>([])
  const [flash, setFlash] = useState('')
  const workRef = useRef<HTMLElement | null>(null)
  const recentRef = useRef<HTMLElement | null>(null)

  const mine = useMemo(() => {
    const ids = new Set(assigns.filter((a) => a.userId === 'okta-u-alex').map((a) => a.appId))
    return apps.filter((a) => ids.has(a.id) && a.status !== 'INACTIVE')
  }, [apps, assigns])
  const visible = mine.filter((a) => !prefs.hidden.includes(a.id))
  const sorted = prefs.sort === 'az' ? [...visible].sort((a, b) => (a.tile ?? a.label).localeCompare(b.tile ?? b.label)) : visible
  const recentIds = ['outlook', 'salesforce', 'servicenow', 'workday', 'slack', 'sap']
  const recent = recentIds.map((id) => visible.find((a) => a.id === id)).filter(Boolean) as OktaApp[]
  const filtered = q ? mine.filter((a) => (a.tile ?? a.label).toLowerCase().includes(q.toLowerCase())) : sorted
  const fresh = assigns.filter((a) => a.userId === 'okta-u-alex' && isFresh(a.assignedAt))
  const myPending = reqs.filter((r) => r.userId === 'okta-u-alex' && r.status === 'PENDING')

  const launch = (a: OktaApp) => {
    addLog(isAgent, 'user.authentication.sso', 'User single sign on to app', [appTarget(a), { type: 'User', displayName: ME.name, alternateId: ME.email }])
    const target = a.id === 'hworker' ? 'hworker' : a.id
    if (getApp(target)) open(target)
    else toast({ appId: 'okta', title: `Signing in to ${a.label}`, body: `${a.label} opened in a new browser tab via SSO.` })
  }
  const tileActions = (a: OktaApp, sectionId?: string): TileAction[] => [
    { label: 'Launch app', onClick: () => launch(a) },
    {
      label: 'Copy app link',
      onClick: () => {
        navigator.clipboard?.writeText(`https://northwind.okta.com/home/${a.id}/${a.oktaId}`).catch(() => {})
        setFlash(`Link to ${a.tile ?? a.label} copied to clipboard.`)
      },
    },
    ...(sectionId
      ? [{ label: 'Remove from section', onClick: () => setPrefs({ sections: prefs.sections.map((s) => (s.id === sectionId ? { ...s, apps: s.apps.filter((x) => x !== a.id) } : s)) }) }]
      : [{ label: 'Hide from dashboard', onClick: () => (setPrefs({ hidden: [...prefs.hidden, a.id] }), setFlash(`${a.tile ?? a.label} is hidden. You can show it again at the bottom of My Apps.`)) }]),
  ]

  const NavItem = ({ id, icon, label, badge }: { id: typeof nav; icon: any; label: string; badge?: number }) => (
    <button
      onClick={() => {
        setNav(id)
        if (id === 'notifications' && !prefs.readNotifications) setPrefs({ readNotifications: true })
      }}
      className={`w-full flex items-center gap-3 h-10 px-4 rounded-md text-[14px] ${nav === id ? 'bg-[#E6EEFC] text-[#1450B8] font-semibold' : 'text-[#1D1D21] hover:bg-[#F4F4F4]'}`}
    >
      {icon}
      <span className="flex-1 text-left">{label}</span>
      {badge ? <span className="min-w-5 h-5 px-1.5 rounded-full bg-[#DA372C] text-white text-[11px] font-semibold flex items-center justify-center">{badge}</span> : null}
    </button>
  )

  const jump = (ref: React.MutableRefObject<HTMLElement | null>) => {
    setNav('apps')
    setQ('')
    setTimeout(() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30)
  }

  if (signedOut)
    return (
      <div className="flex-1 min-h-0 flex items-center justify-center bg-[#F4F4F4]">
        <div className="w-[400px] bg-white rounded-lg border border-[#E1E1E6] shadow-[0_8px_32px_rgba(29,29,33,0.08)] p-10 flex flex-col items-center text-center">
          <NorthwindLogo height={36} />
          <div className="text-[20px] font-semibold mt-6">You have been signed out</div>
          <div className="text-[14px] text-[#6E6E78] mt-1">Signed in as {ME.email} on this device.</div>
          <Btn primary className="mt-6 w-full" label="Sign in" onClick={() => setSignedOut(false)}>Sign in with Okta FastPass</Btn>
        </div>
      </div>
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
            <a onClick={() => jump(workRef)} className="block h-8 leading-8 text-[13px] text-[#1D1D21] hover:text-[#1662DD] cursor-pointer">Work</a>
            <a onClick={() => jump(recentRef)} className="block h-8 leading-8 text-[13px] text-[#1D1D21] hover:text-[#1662DD] cursor-pointer">Recently used</a>
            {prefs.sections.map((s) => (
              <a key={s.id} onClick={() => (setNav('apps'), setQ(''))} className="block h-8 leading-8 text-[13px] text-[#1D1D21] hover:text-[#1662DD] cursor-pointer truncate">{s.name}</a>
            ))}
            <a
              onClick={() => {
                setSecName('')
                setSecApps([])
                setDlg({ kind: 'section' })
              }}
              className="flex items-center gap-1.5 h-8 text-[13px] text-[#1662DD] font-medium cursor-pointer"
            >
              <Plus size={14} weight="bold" /> Add section
            </a>
          </div>
          <div className="h-px bg-[#EBEBED] my-2 mx-2" />
          <NavItem id="notifications" icon={<Bell size={20} />} label="Notifications" badge={prefs.readNotifications ? 0 : 2} />
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
              <>
                <div className="fixed inset-0 z-20" onMouseDown={() => setMenu(false)} />
                <div className="absolute right-0 top-12 w-64 bg-white rounded-lg border border-[#E1E1E6] shadow-[0_8px_24px_rgba(29,29,33,0.16)] z-30 py-2 text-[14px]">
                  <div className="px-4 py-2">
                    <div className="font-semibold">Alex Morgan</div>
                    <div className="text-[12px] text-[#6E6E78]">{ME.email}</div>
                    <div className="text-[12px] text-[#6E6E78]">northwind.okta.com</div>
                  </div>
                  <div className="h-px bg-[#EBEBED] my-1" />
                  {(
                    [
                      [Gear, 'Settings', () => setNav('settings')],
                      [Question, 'Help', () => toast({ appId: 'okta', title: 'Northwind IT Help', body: 'Opened the IT service portal in a new tab.' })],
                      [SignOut, 'Sign out', () => setSignedOut(true)],
                    ] as [any, string, () => void][]
                  ).map(([I, l, fn]) => (
                    <button key={l} onClick={() => (setMenu(false), fn())} className="w-full flex items-center gap-3 px-4 h-9 hover:bg-[#F4F4F4]"><I size={18} /> {l}</button>
                  ))}
                </div>
              </>
            )}
          </div>
        </header>

        <main className="flex-1 min-h-0 overflow-auto px-8 py-7">
          {nav === 'apps' && (
            <>
              <div className="flex items-center mb-6">
                <h1 className="text-[28px] font-semibold tracking-[-0.2px]">My Apps</h1>
                <div className="flex-1" />
                <button onClick={() => setPrefs({ sort: prefs.sort === 'az' ? 'default' : 'az' })} className={`flex items-center gap-1.5 h-8 px-2.5 rounded text-[13px] hover:bg-[#E9E9EC] ${prefs.sort === 'az' ? 'text-[#1450B8] font-semibold bg-[#E6EEFC]' : 'text-[#1D1D21]'}`}><SortAscending size={16} /> Sort</button>
              </div>
              {fresh.length > 0 && (
                <div className="flash-new mb-6 flex items-center gap-3 rounded-md bg-white border border-[#DCCBF0] px-4 py-3 text-[13px]">
                  <HWChip /> {fresh.length} new app{fresh.length > 1 ? 's were' : ' was'} added to your dashboard.
                </div>
              )}
              {flash && (
                <div className="mb-6 flex items-center gap-3 rounded-md bg-[#E6F4EA] border border-[#B7DEC1] px-4 py-2.5 text-[13px] text-[#1B6E31]">
                  <Check size={16} weight="bold" /> <span className="flex-1">{flash}</span>
                  <button aria-label="Dismiss" onClick={() => setFlash('')}>×</button>
                </div>
              )}
              {!q && (
                <Section title="Recently used" count={recent.length} icon={<ClockCounterClockwise size={18} />} anchor={(el) => { recentRef.current = el }}>
                  {recent.map((a) => (
                    <div key={a.id} className="contents" data-agent-skip>
                      <RecentTile app={a} onOpen={() => launch(a)} />
                    </div>
                  ))}
                </Section>
              )}
              <Section
                title={q ? 'Search results' : 'Work'}
                count={filtered.length}
                icon={<Briefcase size={18} />}
                anchor={(el) => { workRef.current = el }}
                menu={[{ label: prefs.sort === 'az' ? 'Sort: default order' : 'Sort A–Z', onClick: () => setPrefs({ sort: prefs.sort === 'az' ? 'default' : 'az' }) }]}
              >
                {filtered.map((a) => (
                  <Tile key={a.id} app={a} onOpen={() => launch(a)} actions={tileActions(a)} />
                ))}
                {!filtered.length && <div className="text-[14px] text-[#6E6E78] py-6">No apps match “{q}”.</div>}
              </Section>
              {!q &&
                prefs.sections.map((s) => {
                  const list = s.apps.map((id) => mine.find((a) => a.id === id)).filter(Boolean) as OktaApp[]
                  return (
                    <Section key={s.id} title={s.name} count={list.length} icon={<FolderSimple size={18} />} menu={[{ label: 'Delete section', onClick: () => setPrefs({ sections: prefs.sections.filter((x) => x.id !== s.id) }) }]}>
                      {list.map((a) => (
                        <TileNoAgent key={a.id} app={a} onOpen={() => launch(a)} actions={tileActions(a, s.id)} />
                      ))}
                      {!list.length && <div className="text-[14px] text-[#6E6E78] py-4">No apps in this section yet.</div>}
                    </Section>
                  )
                })}
              {!q && prefs.hidden.length > 0 && (
                <div className="text-[13px] text-[#6E6E78]">
                  {prefs.hidden.length} hidden app{prefs.hidden.length === 1 ? '' : 's'} ·{' '}
                  <button onClick={() => setPrefs({ hidden: [] })} className="text-[#1662DD] font-medium hover:underline">
                    Show all
                  </button>
                </div>
              )}
            </>
          )}
          {nav === 'notifications' && (
            <div className="max-w-[760px]">
              <h1 className="text-[28px] font-semibold mb-6">Notifications</h1>
              {[
                ['New sign-on to your account', 'Edge 130.0 on Windows 11 · Boston, Massachusetts, United States', '4 minutes ago'],
                ['Your password was changed', 'If you did not make this change, contact your administrator.', '3 hours ago'],
                ...myPending.map((r) => [`Access request pending: ${apps.find((a) => a.id === r.appId)?.label ?? r.appId}`, 'Waiting on your manager, then the app owner.', 'Pending']),
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
                {apps.filter((a) => !mine.includes(a) && a.status !== 'INACTIVE').map((a) => {
                  const pending = myPending.some((r) => r.appId === a.id)
                  return (
                    <div key={a.id} className="bg-white rounded-lg border border-[#E1E1E6] p-4 flex items-center gap-3">
                      <img src={logoUrl(a.logo)} className="w-9 h-9" alt="" />
                      <div className="flex-1 min-w-0">
                        <div className="text-[14px] font-semibold truncate">{a.label}</div>
                        <div className="text-[12px] text-[#6E6E78]">{pending ? 'Request pending approval' : 'Requires approval'}</div>
                      </div>
                      <button
                        data-agent={`okta-request-app-${a.id}`}
                        disabled={pending}
                        onClick={() => {
                          setReason('')
                          setDlg({ kind: 'request', app: a })
                        }}
                        className={`h-8 px-3 rounded-[4px] border text-[13px] font-semibold ${pending ? 'border-[#D7D7DC] text-[#6E6E78] bg-[#F4F4F4]' : 'border-[#8C8C96] hover:bg-[#F4F4F4]'}`}
                      >
                        {pending ? 'Requested' : 'Request'}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          {nav === 'settings' && (
            <div className="max-w-[760px] space-y-5">
              <h1 className="text-[28px] font-semibold">Settings</h1>
              <div className="bg-white rounded-lg border border-[#E1E1E6] p-5">
                <div className="text-[16px] font-semibold mb-3">Personal information</div>
                <dl className="grid grid-cols-[180px_1fr] gap-y-2 text-[14px]">
                  <dt className="text-[#6E6E78]">Name</dt>
                  <dd>{ME.name}</dd>
                  <dt className="text-[#6E6E78]">Username</dt>
                  <dd>{me?.login ?? ME.email}</dd>
                  <dt className="text-[#6E6E78]">Primary email</dt>
                  <dd>{me?.email ?? ME.email}</dd>
                  <dt className="text-[#6E6E78]">Title</dt>
                  <dd>{me?.title}</dd>
                </dl>
                <div className="text-[12px] text-[#6E6E78] mt-3">Your profile is managed by Workday. Contact HR to change it.</div>
              </div>
              <div className="bg-white rounded-lg border border-[#E1E1E6] p-5">
                <div className="text-[16px] font-semibold mb-3">Security methods</div>
                {(
                  [
                    ['Okta Verify', DeviceMobile],
                    ['FIDO2 (WebAuthn)', Fingerprint],
                    ['Password', Key],
                  ] as [string, any][]
                ).map(([m, I]) => {
                  const enrolled = m === 'Password' || !!me?.mfa.some((x) => x.type === m)
                  return (
                    <div key={m} className="flex items-center gap-3 py-2.5 border-t border-[#EBEBED] first:border-0">
                      <I size={20} className="text-[#1662DD]" />
                      <span className="flex-1 text-[14px] font-medium">{m}</span>
                      <span className={`text-[13px] ${enrolled ? 'text-[#1E8A3A]' : 'text-[#6E6E78]'}`}>{enrolled ? 'Set up' : 'Not set up'}</span>
                      {m !== 'Password' && me && (
                        <Btn
                          small
                          label={enrolled ? `Remove ${m}` : `Set up ${m}`}
                          onClick={() => {
                            const mfa = enrolled ? me.mfa.filter((x) => x.type !== m) : [...me.mfa, { type: m, enrolled: new Date().toISOString() }]
                            db.update('okta.users', me.id, { mfa })
                            addLog(isAgent, enrolled ? 'user.mfa.factor.deactivate' : 'user.mfa.factor.activate', enrolled ? 'Reset factor for user' : 'Activate factor or authenticator', [{ type: 'User', displayName: ME.name, alternateId: ME.email }, { type: 'AuthenticatorEnrollment', displayName: m, alternateId: m }])
                          }}
                        >
                          {enrolled ? 'Remove' : 'Set up'}
                        </Btn>
                      )}
                    </div>
                  )
                })}
              </div>
              <div className="bg-white rounded-lg border border-[#E1E1E6] p-5">
                <div className="text-[16px] font-semibold mb-3">Display language</div>
                <select aria-label="Display language" value={prefs.language} onChange={(e) => setPrefs({ language: e.target.value })} className={inputCls + ' max-w-[260px]'}>
                  {['English (US)', 'English (UK)', 'Français', 'Deutsch', 'Español', '日本語'].map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </main>
      </div>
      {dlg?.kind === 'request' && (
        <Modal
          title={`Request ${dlg.app.label}`}
          onClose={() => setDlg(null)}
          footer={
            <>
              <Btn label="Cancel" onClick={() => setDlg(null)}>Cancel</Btn>
              <Btn
                primary
                agent="okta-request-submit"
                label="Submit request"
                onClick={() => {
                  db.insert('okta.requests', { id: uid('okta-req'), userId: 'okta-u-alex', appId: dlg.app.id, reason: reason.trim(), status: 'PENDING', requestedAt: new Date().toISOString(), createdBy: isAgent ? 'hworker' : undefined })
                  addLog(isAgent, 'app.access_request.request', 'Request app access', [appTarget(dlg.app), { type: 'User', displayName: ME.name, alternateId: ME.email }])
                  setDlg(null)
                }}
              >
                Submit request
              </Btn>
            </>
          }
        >
          <p className="mb-3 text-[14px]">Your request goes to your manager, then the {dlg.app.label} owner. You’ll get an email when it’s approved.</p>
          <label className="block">
            <span className="block text-[13px] font-semibold mb-1">Why do you need access?</span>
            <textarea aria-label="Business justification" value={reason} onChange={(e) => setReason(e.target.value)} className="w-full h-24 rounded-[4px] border border-[#8C8C96] p-2.5 text-[14px] outline-none focus:border-[#1662DD]" />
          </label>
        </Modal>
      )}
      {dlg?.kind === 'section' && (
        <Modal
          title="Add section"
          onClose={() => setDlg(null)}
          footer={
            <>
              <Btn label="Cancel" onClick={() => setDlg(null)}>Cancel</Btn>
              <Btn primary label="Save" disabled={!secName.trim()} onClick={() => (setPrefs({ sections: [...prefs.sections, { id: uid('sec'), name: secName.trim(), apps: secApps }] }), setDlg(null))}>Save</Btn>
            </>
          }
        >
          <label className="block mb-3">
            <span className="block text-[13px] font-semibold mb-1">Section name</span>
            <input aria-label="Section name" value={secName} onChange={(e) => setSecName(e.target.value)} placeholder="e.g. Finance tools" className={inputCls} />
          </label>
          <div className="text-[13px] font-semibold mb-1">Apps</div>
          <div className="grid grid-cols-2 gap-1 max-h-[260px] overflow-auto">
            {mine.map((a) => (
              <label key={a.id} className="flex items-center gap-2 px-2 h-9 rounded hover:bg-[#F4F4F4] cursor-pointer text-[13px]">
                <input type="checkbox" checked={secApps.includes(a.id)} onChange={(e) => setSecApps((s) => (e.target.checked ? [...s, a.id] : s.filter((x) => x !== a.id)))} className="accent-[#1662DD]" />
                <img src={logoUrl(a.logo)} className="w-5 h-5" alt="" /> <span className="truncate">{a.tile ?? a.label}</span>
              </label>
            ))}
          </div>
        </Modal>
      )}
    </div>
  )
}

/** a tile in a user-created section (no data-agent so it never shadows the Work tile of the same app) */
function TileNoAgent(props: { app: OktaApp; onOpen: () => void; actions?: TileAction[] }) {
  const [menu, setMenu] = useState(false)
  const { app, onOpen, actions } = props
  return (
    <div role="button" tabIndex={0} aria-label={`Open ${app.tile ?? app.label}`} onClick={onOpen} className="group relative bg-white rounded-lg border border-[#E1E1E6] hover:shadow-[0_2px_10px_rgba(29,29,33,0.12)] cursor-pointer flex flex-col items-center w-[184px] h-[148px]">
      <div className="flex-1 flex items-center justify-center w-full px-4 pt-3">
        <img src={logoUrl(app.logo)} alt="" className="w-[52px] h-[52px]" />
      </div>
      <div className="h-[44px] w-full px-3 flex items-start justify-center text-center text-[13px] leading-[17px] font-medium">
        <span className="line-clamp-2">{app.tile ?? app.label}</span>
      </div>
      <button aria-label="Section app settings" onClick={(e) => (e.stopPropagation(), setMenu(!menu))} className={`absolute top-1.5 right-1.5 w-7 h-7 rounded-full flex items-center justify-center text-[#6E6E78] group-hover:opacity-100 hover:bg-[#F4F4F4] ${menu ? 'opacity-100' : 'opacity-0'}`}>
        <DotsThreeVertical size={18} weight="bold" />
      </button>
      {menu && actions && (
        <div onClick={(e) => e.stopPropagation()}>
          <Menu className="right-1 top-9 w-52" onClose={() => setMenu(false)} items={actions} />
        </div>
      )}
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
