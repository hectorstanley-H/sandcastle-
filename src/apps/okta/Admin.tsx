import { useEffect, useState, type ReactNode } from 'react'
import { MagnifyingGlass, CaretDown, CaretRight, Question, Bell, SquaresFour, ArrowSquareOut, UsersThree } from '@phosphor-icons/react'
import { useCollection } from '@/db/db'
import { useDesk } from '@/os/context'
import { logoUrl } from '@/os/registry'
import { fullName, Menu, type OktaApp, type OktaUser, type Route } from './shared'
import { GroupDetail, AppDetail, Devices, Policies, GlobalSessionPolicy, Networks, Administrators, Reports, Agents, AdminNotifications, GettingStarted, ProfileSources, SettingsPage, ApiIntegrations, EventHooks, WorkflowsConsole, Insights, Downloads } from './AdminMore'
import { Dashboard, Tasks } from './Dashboard'
import { People, Groups, ProfileEditor, DirectoryIntegrations } from './Directory'
import { Applications, SelfService } from './Applications'
import { UserProfile } from './UserProfile'
import { SystemLog } from './SystemLog'
import { Authenticators, Automations, Brands, Account } from './Misc'

type Child = { id: string; label: string; page?: Route['page']; agent: string }
type Section = { id: string; label: string; agent: string; children: Child[]; page?: Route['page'] }

const NAV: Section[] = [
  { id: 'dashboard', label: 'Dashboard', agent: 'okta-nav-dashboard', page: 'dashboard', children: [
    { id: 'dashboard', label: 'Dashboard', page: 'dashboard', agent: 'okta-nav-dashboard-home' },
    { id: 'tasks', label: 'Tasks', page: 'tasks', agent: 'okta-nav-tasks' },
    { id: 'agents', label: 'Agents', page: 'agents', agent: 'okta-nav-agents' },
    { id: 'notifications', label: 'Notifications', page: 'notifications', agent: 'okta-nav-notifications' },
    { id: 'getting-started', label: 'Getting Started', page: 'gettingstarted', agent: 'okta-nav-getting-started' },
  ] },
  { id: 'directory', label: 'Directory', agent: 'okta-nav-directory', children: [
    { id: 'people', label: 'People', page: 'people', agent: 'okta-nav-people' },
    { id: 'groups', label: 'Groups', page: 'groups', agent: 'okta-nav-groups' },
    { id: 'devices', label: 'Devices', page: 'devices', agent: 'okta-nav-devices' },
    { id: 'profiles', label: 'Profile Editor', page: 'profiles', agent: 'okta-nav-profile-editor' },
    { id: 'integrations', label: 'Directory Integrations', page: 'integrations', agent: 'okta-nav-directory-integrations' },
    { id: 'sources', label: 'Profile Sources', page: 'sources', agent: 'okta-nav-profile-sources' },
  ] },
  { id: 'customizations', label: 'Customizations', agent: 'okta-nav-customizations', children: [
    { id: 'brands', label: 'Brands', page: 'customizations', agent: 'okta-nav-brands' },
    { id: 'enduser', label: 'End-User Dashboard', page: 'enduser-settings', agent: 'okta-nav-enduser-settings' },
    { id: 'other', label: 'Other', page: 'custom-other', agent: 'okta-nav-custom-other' },
  ] },
  { id: 'applications', label: 'Applications', agent: 'okta-nav-applications-section', children: [
    { id: 'apps', label: 'Applications', page: 'apps', agent: 'okta-nav-applications' },
    { id: 'selfservice', label: 'Self Service', page: 'selfservice', agent: 'okta-nav-self-service' },
    { id: 'api', label: 'API Service Integrations', page: 'api', agent: 'okta-nav-api-integrations' },
  ] },
  { id: 'security', label: 'Security', agent: 'okta-nav-security', children: [
    { id: 'general', label: 'General', page: 'security-general', agent: 'okta-nav-security-general' },
    { id: 'auth', label: 'Authenticators', page: 'security', agent: 'okta-nav-authenticators' },
    { id: 'policies', label: 'Authentication Policies', page: 'policies', agent: 'okta-nav-auth-policies' },
    { id: 'gsp', label: 'Global Session Policy', page: 'gsp', agent: 'okta-nav-global-session' },
    { id: 'profile', label: 'Profile Enrollment', page: 'profile-enrollment', agent: 'okta-nav-profile-enrollment' },
    { id: 'identity-threat', label: 'Identity Threat Protection', page: 'itp', agent: 'okta-nav-itp' },
    { id: 'zones', label: 'Networks', page: 'networks', agent: 'okta-nav-networks' },
    { id: 'admins', label: 'Administrators', page: 'admins', agent: 'okta-nav-administrators' },
  ] },
  { id: 'workflow', label: 'Workflow', agent: 'okta-nav-workflow', children: [
    { id: 'automations', label: 'Automations', page: 'workflow', agent: 'okta-nav-automations' },
    { id: 'hooks', label: 'Event Hooks', page: 'hooks', agent: 'okta-nav-event-hooks' },
    { id: 'wf', label: 'Workflows console', page: 'wfconsole', agent: 'okta-nav-workflows-console' },
  ] },
  { id: 'reports', label: 'Reports', agent: 'okta-nav-reports', children: [
    { id: 'reports', label: 'Reports', page: 'reports', agent: 'okta-nav-reports-home' },
    { id: 'logs', label: 'System Log', page: 'logs', agent: 'okta-nav-systemlog' },
    { id: 'insights', label: 'Okta Insights', page: 'insights', agent: 'okta-nav-insights' },
  ] },
  { id: 'settings', label: 'Settings', agent: 'okta-nav-settings', children: [
    { id: 'account', label: 'Account', page: 'settings', agent: 'okta-nav-account' },
    { id: 'features', label: 'Features', page: 'features', agent: 'okta-nav-features' },
    { id: 'downloads', label: 'Downloads', page: 'downloads', agent: 'okta-nav-downloads' },
  ] },
]

const sectionOf = (page: Route['page']) => (page === 'user' || page === 'group' ? 'directory' : page === 'app' ? 'applications' : NAV.find((s) => s.children.some((c) => c.page === page))?.id ?? 'dashboard')

export function Admin({ route, go }: { route: Route; go: (r: Route) => void }) {
  const cur = sectionOf(route.page)
  const [open, setOpen] = useState<Record<string, boolean>>({ [cur]: true })
  useEffect(() => setOpen((o) => (o[cur] ? o : { ...o, [cur]: true })), [cur])
  const isOpen = (id: string) => open[id] ?? false
  const nav = (page: Route['page']) => go({ area: 'admin', page })
  const activeChild = route.page === 'user' ? 'people' : route.page === 'group' ? 'groups' : route.page === 'app' ? 'apps' : route.page
  const { toast } = useDesk()
  const users = useCollection<OktaUser>('okta.users')
  const groups = useCollection<any>('okta.groups')
  const apps = useCollection<OktaApp>('okta.apps')
  const [q, setQ] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [pop, setPop] = useState<null | 'help' | 'account'>(null)
  const ql = q.trim().toLowerCase()
  const hits = ql
    ? [
        ...users.filter((u) => `${fullName(u)} ${u.login}`.toLowerCase().includes(ql)).slice(0, 5).map((u) => ({ k: u.id, kind: 'Person', label: fullName(u), sub: u.login, r: { area: 'admin', page: 'user', userId: u.id, tab: 'applications' } as Route })),
        ...groups.filter((g) => g.name.toLowerCase().includes(ql)).slice(0, 3).map((g) => ({ k: g.id, kind: 'Group', label: g.name, sub: g.description, r: { area: 'admin', page: 'group', groupId: g.id } as Route })),
        ...apps.filter((a) => a.label.toLowerCase().includes(ql)).slice(0, 3).map((a) => ({ k: a.id, kind: 'App', label: a.label, sub: a.signOn, r: { area: 'admin', page: 'app', appId: a.id } as Route })),
      ]
    : []
  const pick = (r: Route) => {
    setQ('')
    setSearchOpen(false)
    go(r)
  }

  let body: ReactNode
  switch (route.page) {
    case 'people': body = <People go={go} initialFilter={route.tab} />; break
    case 'user': body = <UserProfile route={route} go={go} />; break
    case 'groups': body = <Groups go={go} />; break
    case 'group': body = <GroupDetail route={route} go={go} />; break
    case 'profiles': body = <ProfileEditor />; break
    case 'integrations': body = <DirectoryIntegrations go={go} />; break
    case 'apps': body = <Applications go={go} />; break
    case 'app': body = <AppDetail route={route} go={go} />; break
    case 'selfservice': body = <SelfService go={go} />; break
    case 'devices': body = <Devices go={go} />; break
    case 'policies': body = <Policies />; break
    case 'gsp': body = <GlobalSessionPolicy />; break
    case 'networks': body = <Networks />; break
    case 'admins': body = <Administrators go={go} />; break
    case 'reports': body = <Reports go={go} />; break
    case 'agents': body = <Agents />; break
    case 'notifications': body = <AdminNotifications go={go} />; break
    case 'gettingstarted': body = <GettingStarted go={go} />; break
    case 'sources': body = <ProfileSources go={go} />; break
    case 'enduser-settings':
    case 'custom-other':
    case 'security-general':
    case 'profile-enrollment':
    case 'itp':
    case 'features':
      body = <SettingsPage page={route.page} />
      break
    case 'api': body = <ApiIntegrations />; break
    case 'hooks': body = <EventHooks />; break
    case 'wfconsole': body = <WorkflowsConsole />; break
    case 'insights': body = <Insights go={go} />; break
    case 'downloads': body = <Downloads />; break
    case 'logs': body = <SystemLog />; break
    case 'tasks': body = <Tasks go={go} />; break
    case 'security': body = <Authenticators />; break
    case 'workflow': body = <Automations />; break
    case 'customizations': body = <Brands />; break
    case 'settings': body = <Account />; break
    default: body = <Dashboard go={go} />
  }

  return (
    <div className="flex-1 min-h-0 flex bg-[#F4F4F4]">
      {/* side nav */}
      <aside className="w-[244px] shrink-0 bg-white border-r border-[#E1E1E6] flex flex-col">
        <div className="h-[60px] shrink-0 flex items-center px-6">
          <img src={logoUrl('okta-wordmark')} alt="okta" className="h-[22px]" />
        </div>
        <nav className="flex-1 overflow-auto px-3 pb-4 text-[14px]">
          {NAV.map((s) => {
            const expanded = isOpen(s.id)
            const hasActive = cur === s.id
            return (
              <div key={s.id} className="mb-0.5">
                <button
                  data-agent={s.agent}
                  aria-label={s.label}
                  aria-expanded={expanded}
                  onClick={() => {
                    setOpen((o) => ({ ...o, [s.id]: !expanded || s.id === 'dashboard' }))
                    if (s.page) nav(s.page)
                  }}
                  className={`w-full flex items-center h-10 px-3 rounded-md text-left ${hasActive && !expanded ? 'bg-[#E6EEFC] text-[#1450B8] font-semibold' : 'text-[#1D1D21] hover:bg-[#F4F4F4]'} ${hasActive ? 'font-semibold' : 'font-medium'}`}
                >
                  <span className="flex-1">{s.label}</span>
                  {expanded ? <CaretDown size={14} /> : <CaretRight size={14} />}
                </button>
                {expanded && (
                  <div className="py-0.5">
                    {s.children.map((c) => {
                      const act = c.page && c.page === activeChild
                      return (
                        <button
                          key={c.id}
                          data-agent={c.agent}
                          aria-label={c.label}
                          onClick={() => c.page && nav(c.page)}
                          className={`relative w-full flex items-center h-9 pl-7 pr-3 rounded-md text-left text-[14px] ${act ? 'bg-[#E6EEFC] text-[#1450B8] font-semibold' : 'text-[#46464F] hover:bg-[#F4F4F4]'}`}
                        >
                          {act && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-[#1662DD]" />}
                          {c.label}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>
        <div className="px-6 py-3 border-t border-[#EBEBED] text-[11px] text-[#6E6E78] leading-[16px]">
          <div>© 2026 Okta, Inc.</div>
          <div className="flex gap-2 text-[#1662DD]"><span>Privacy</span><span>Status site</span><span>OK14 US Cell</span></div>
          <div>Version 2026.10.1 E</div>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        {/* top bar */}
        <header className="h-[60px] shrink-0 bg-white border-b border-[#E1E1E6] flex items-center px-6 gap-3">
          <div className="relative w-full max-w-[440px]">
            <div className="flex items-center gap-2 h-9 w-full rounded-md bg-[#F4F4F4] px-3 text-[#6E6E78] focus-within:bg-white focus-within:shadow-[0_0_0_2px_#C4D7F7]">
              <MagnifyingGlass size={17} />
              <input
                aria-label="Search people, apps and groups"
                placeholder="Search people, apps and groups"
                value={q}
                onChange={(e) => (setQ(e.target.value), setSearchOpen(true))}
                onFocus={() => setSearchOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && hits[0]) pick(hits[0].r)
                  if (e.key === 'Escape') setSearchOpen(false)
                }}
                className="flex-1 bg-transparent outline-none text-[14px] text-[#1D1D21] placeholder:text-[#6E6E78]"
              />
            </div>
            {searchOpen && ql && (
              <>
                <div className="fixed inset-0 z-20" onMouseDown={() => setSearchOpen(false)} />
                <div className="absolute left-0 right-0 top-10 z-30 bg-white rounded-md border border-[#E1E1E6] shadow-[0_8px_24px_rgba(29,29,33,0.16)] py-1">
                  {hits.map((h) => (
                    <button key={h.kind + h.k} onClick={() => pick(h.r)} className="w-full text-left px-4 py-2 hover:bg-[#F4F4F4] flex items-center gap-3">
                      {h.kind === 'App' ? <img src={logoUrl(apps.find((a) => a.id === h.k)?.logo ?? 'okta')} className="w-6 h-6" alt="" /> : h.kind === 'Group' ? <UsersThree size={20} className="text-[#46464F]" /> : <span className="w-6 h-6 rounded-full bg-[#E6EEFC] text-[#1450B8] text-[10px] font-semibold flex items-center justify-center">{String(h.label).split(' ').map((x: string) => x[0]).join('').slice(0, 2)}</span>}
                      <div className="min-w-0 flex-1">
                        <div className="text-[14px] font-medium truncate">{h.label}</div>
                        <div className="text-[12px] text-[#6E6E78] truncate">{h.kind} · {h.sub}</div>
                      </div>
                    </button>
                  ))}
                  {!hits.length && <div className="px-4 py-3 text-[13px] text-[#6E6E78]">No results for “{q}”.</div>}
                </div>
              </>
            )}
          </div>
          <div className="flex-1" />
          <button aria-label="Notifications" onClick={() => go({ area: 'admin', page: 'notifications' })} className="w-9 h-9 rounded-md flex items-center justify-center text-[#46464F] hover:bg-[#F4F4F4] relative">
            <Bell size={20} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#DA372C]" />
          </button>
          <div className="relative">
            <button aria-label="Help" onClick={() => setPop(pop === 'help' ? null : 'help')} className="w-9 h-9 rounded-md flex items-center justify-center text-[#46464F] hover:bg-[#F4F4F4]"><Question size={20} /></button>
            {pop === 'help' && (
              <Menu
                className="right-0 top-11"
                onClose={() => setPop(null)}
                items={[
                  { label: 'Getting Started', onClick: () => go({ area: 'admin', page: 'gettingstarted' }) },
                  { label: 'Okta Help Center', onClick: () => toast({ appId: 'okta', title: 'Okta Help Center', body: 'Opened help.okta.com in a new tab.' }) },
                  { label: 'Okta Status', onClick: () => toast({ appId: 'okta', title: 'Okta Status', body: 'All systems operational · OK14 US Cell' }) },
                  { label: 'Release notes 2026.10.1', onClick: () => toast({ appId: 'okta', title: 'Release notes', body: 'Opened Okta Identity Engine release notes.' }) },
                ]}
              />
            )}
          </div>
          <button
            data-agent="okta-enduser-button"
            aria-label="My Apps"
            onClick={() => go({ area: 'home', page: 'dashboard' })}
            className="flex items-center gap-1.5 h-9 px-2.5 rounded-md text-[14px] font-medium text-[#1D1D21] hover:bg-[#F4F4F4]"
          >
            <SquaresFour size={20} /> My Apps <ArrowSquareOut size={14} className="text-[#6E6E78]" />
          </button>
          <div className="w-px h-7 bg-[#E1E1E6] mx-1" />
          <div className="relative">
          {pop === 'account' && (
            <Menu
              className="right-0 top-12"
              onClose={() => setPop(null)}
              items={[
                { label: 'Account settings', onClick: () => go({ area: 'admin', page: 'settings' }) },
                { label: 'My admin roles', onClick: () => go({ area: 'admin', page: 'user', userId: 'okta-u-alex', tab: 'roles' }) },
                { label: 'My Apps (end-user dashboard)', onClick: () => go({ area: 'home', page: 'dashboard' }) },
              ]}
            />
          )}
          <button aria-label="Account" onClick={() => setPop(pop === 'account' ? null : 'account')} className="flex items-center gap-2.5 h-11 pl-1 pr-2 rounded-md hover:bg-[#F4F4F4] text-left">
            <span className="w-8 h-8 rounded-full bg-[#1662DD] text-white text-[12px] font-semibold flex items-center justify-center">AM</span>
            <span className="leading-[16px]">
              <span className="block text-[13px] font-semibold">Alex Morgan</span>
              <span className="block text-[12px] text-[#6E6E78]">northwind</span>
            </span>
            <CaretDown size={13} />
          </button>
          </div>
        </header>
        <div className="flex-1 min-h-0 overflow-auto" key={route.page + (route.userId ?? '')}>
          {body}
        </div>
      </div>
    </div>
  )
}

/** Page header used by admin pages. */
export function PageHead({ title, sub, actions, crumbs }: { title: string; sub?: ReactNode; actions?: ReactNode; crumbs?: ReactNode }) {
  return (
    <div className="px-8 pt-6 pb-5">
      {crumbs && <div className="text-[13px] text-[#6E6E78] mb-2">{crumbs}</div>}
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-[28px] leading-[36px] font-semibold tracking-[-0.3px] text-[#1D1D21]">{title}</h1>
          {sub && <div className="mt-1 text-[14px] text-[#6E6E78]">{sub}</div>}
        </div>
      </div>
      {actions && <div className="mt-4 flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Card({ title, children, right, className = '', pad = true }: { title?: ReactNode; children: ReactNode; right?: ReactNode; className?: string; pad?: boolean }) {
  return (
    <div className={`bg-white rounded-lg border border-[#E1E1E6] ${className}`}>
      {title && (
        <div className="flex items-center px-5 pt-4 pb-2">
          <div className="text-[16px] font-semibold flex-1">{title}</div>
          {right}
        </div>
      )}
      <div className={pad ? 'px-5 pb-5 pt-1' : ''}>{children}</div>
    </div>
  )
}
