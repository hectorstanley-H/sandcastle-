import { useEffect, useState, type ReactNode } from 'react'
import { MagnifyingGlass, CaretDown, CaretRight, Question, Bell, SquaresFour, ArrowSquareOut } from '@phosphor-icons/react'
import { logoUrl } from '@/os/registry'
import type { Route } from './shared'
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
    { id: 'agents', label: 'Agents', agent: 'okta-nav-agents' },
    { id: 'notifications', label: 'Notifications', agent: 'okta-nav-notifications' },
    { id: 'getting-started', label: 'Getting Started', agent: 'okta-nav-getting-started' },
  ] },
  { id: 'directory', label: 'Directory', agent: 'okta-nav-directory', children: [
    { id: 'people', label: 'People', page: 'people', agent: 'okta-nav-people' },
    { id: 'groups', label: 'Groups', page: 'groups', agent: 'okta-nav-groups' },
    { id: 'devices', label: 'Devices', agent: 'okta-nav-devices' },
    { id: 'profiles', label: 'Profile Editor', page: 'profiles', agent: 'okta-nav-profile-editor' },
    { id: 'integrations', label: 'Directory Integrations', page: 'integrations', agent: 'okta-nav-directory-integrations' },
    { id: 'sources', label: 'Profile Sources', agent: 'okta-nav-profile-sources' },
  ] },
  { id: 'customizations', label: 'Customizations', agent: 'okta-nav-customizations', children: [
    { id: 'brands', label: 'Brands', page: 'customizations', agent: 'okta-nav-brands' },
    { id: 'enduser', label: 'End-User Dashboard', agent: 'okta-nav-enduser-settings' },
    { id: 'other', label: 'Other', agent: 'okta-nav-custom-other' },
  ] },
  { id: 'applications', label: 'Applications', agent: 'okta-nav-applications-section', children: [
    { id: 'apps', label: 'Applications', page: 'apps', agent: 'okta-nav-applications' },
    { id: 'selfservice', label: 'Self Service', page: 'selfservice', agent: 'okta-nav-self-service' },
    { id: 'api', label: 'API Service Integrations', agent: 'okta-nav-api-integrations' },
  ] },
  { id: 'security', label: 'Security', agent: 'okta-nav-security', children: [
    { id: 'general', label: 'General', agent: 'okta-nav-security-general' },
    { id: 'auth', label: 'Authenticators', page: 'security', agent: 'okta-nav-authenticators' },
    { id: 'policies', label: 'Authentication Policies', agent: 'okta-nav-auth-policies' },
    { id: 'gsp', label: 'Global Session Policy', agent: 'okta-nav-global-session' },
    { id: 'profile', label: 'Profile Enrollment', agent: 'okta-nav-profile-enrollment' },
    { id: 'identity-threat', label: 'Identity Threat Protection', agent: 'okta-nav-itp' },
    { id: 'zones', label: 'Networks', agent: 'okta-nav-networks' },
    { id: 'admins', label: 'Administrators', agent: 'okta-nav-administrators' },
  ] },
  { id: 'workflow', label: 'Workflow', agent: 'okta-nav-workflow', children: [
    { id: 'automations', label: 'Automations', page: 'workflow', agent: 'okta-nav-automations' },
    { id: 'hooks', label: 'Event Hooks', agent: 'okta-nav-event-hooks' },
    { id: 'wf', label: 'Workflows console', agent: 'okta-nav-workflows-console' },
  ] },
  { id: 'reports', label: 'Reports', agent: 'okta-nav-reports', children: [
    { id: 'reports', label: 'Reports', agent: 'okta-nav-reports-home' },
    { id: 'logs', label: 'System Log', page: 'logs', agent: 'okta-nav-systemlog' },
    { id: 'insights', label: 'Okta Insights', agent: 'okta-nav-insights' },
  ] },
  { id: 'settings', label: 'Settings', agent: 'okta-nav-settings', children: [
    { id: 'account', label: 'Account', page: 'settings', agent: 'okta-nav-account' },
    { id: 'features', label: 'Features', agent: 'okta-nav-features' },
    { id: 'downloads', label: 'Downloads', agent: 'okta-nav-downloads' },
  ] },
]

const sectionOf = (page: Route['page']) => (page === 'user' ? 'directory' : NAV.find((s) => s.children.some((c) => c.page === page))?.id ?? 'dashboard')

export function Admin({ route, go }: { route: Route; go: (r: Route) => void }) {
  const cur = sectionOf(route.page)
  const [open, setOpen] = useState<Record<string, boolean>>({ [cur]: true })
  useEffect(() => setOpen((o) => (o[cur] ? o : { ...o, [cur]: true })), [cur])
  const isOpen = (id: string) => open[id] ?? false
  const nav = (page: Route['page']) => go({ area: 'admin', page })
  const activeChild = route.page === 'user' ? 'people' : route.page

  let body: ReactNode
  switch (route.page) {
    case 'people': body = <People go={go} />; break
    case 'user': body = <UserProfile route={route} go={go} />; break
    case 'groups': body = <Groups />; break
    case 'profiles': body = <ProfileEditor />; break
    case 'integrations': body = <DirectoryIntegrations />; break
    case 'apps': body = <Applications />; break
    case 'selfservice': body = <SelfService />; break
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
          <div className="flex items-center gap-2 h-9 w-full max-w-[440px] rounded-md bg-[#F4F4F4] px-3 text-[#6E6E78]">
            <MagnifyingGlass size={17} />
            <input aria-label="Search people, apps and groups" placeholder="Search people, apps and groups" className="flex-1 bg-transparent outline-none text-[14px] text-[#1D1D21] placeholder:text-[#6E6E78]" />
          </div>
          <div className="flex-1" />
          <button aria-label="Notifications" className="w-9 h-9 rounded-md flex items-center justify-center text-[#46464F] hover:bg-[#F4F4F4] relative">
            <Bell size={20} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#DA372C]" />
          </button>
          <button aria-label="Help" className="w-9 h-9 rounded-md flex items-center justify-center text-[#46464F] hover:bg-[#F4F4F4]"><Question size={20} /></button>
          <button
            data-agent="okta-enduser-button"
            aria-label="My Apps"
            onClick={() => go({ area: 'home', page: 'dashboard' })}
            className="flex items-center gap-1.5 h-9 px-2.5 rounded-md text-[14px] font-medium text-[#1D1D21] hover:bg-[#F4F4F4]"
          >
            <SquaresFour size={20} /> My Apps <ArrowSquareOut size={14} className="text-[#6E6E78]" />
          </button>
          <div className="w-px h-7 bg-[#E1E1E6] mx-1" />
          <button aria-label="Account" className="flex items-center gap-2.5 h-11 pl-1 pr-2 rounded-md hover:bg-[#F4F4F4] text-left">
            <span className="w-8 h-8 rounded-full bg-[#1662DD] text-white text-[12px] font-semibold flex items-center justify-center">AM</span>
            <span className="leading-[16px]">
              <span className="block text-[13px] font-semibold">Alex Morgan</span>
              <span className="block text-[12px] text-[#6E6E78]">northwind</span>
            </span>
            <CaretDown size={13} />
          </button>
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
