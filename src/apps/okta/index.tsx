import { useEffect, useState } from 'react'
import type { AppProps } from '@/os/registry'
import { useWin } from '@/os/context'
import { useCollection } from '@/db/db'
import { EndUser } from './EndUser'
import { Admin } from './Admin'
import { FONT, fullName, type OktaUser, type Route } from './shared'

const PAGE_MAP: Record<string, Route> = {
  home: { area: 'home', page: 'dashboard' },
  admin: { area: 'admin', page: 'dashboard' },
  dashboard: { area: 'admin', page: 'dashboard' },
  people: { area: 'admin', page: 'people' },
  user: { area: 'admin', page: 'user' },
  groups: { area: 'admin', page: 'groups' },
  apps: { area: 'admin', page: 'apps' },
  logs: { area: 'admin', page: 'logs' },
}

function routeFromParams(params: any): Route {
  if (!params) return { area: 'home', page: 'dashboard' }
  const base = PAGE_MAP[params.page] ?? (params.userId ? PAGE_MAP.user : PAGE_MAP.home)
  return { ...base, userId: params.userId, tab: params.tab ?? (base.page === 'user' ? 'applications' : undefined) }
}

export default function Okta({ win, params }: AppProps) {
  const { setUrl, setTitle } = useWin()
  const [route, setRoute] = useState<Route>(() => routeFromParams(params))
  const users = useCollection<OktaUser>('okta.users')

  useEffect(() => {
    if (win.nonce) setRoute(routeFromParams(params))
  }, [win.nonce])

  const u = route.userId ? users.find((x) => x.id === route.userId) : undefined
  useEffect(() => {
    const A = 'https://northwind-admin.okta.com'
    let url = 'https://northwind.okta.com/app/UserHome'
    let title = 'Okta Dashboard'
    if (route.area === 'admin') {
      const m: Record<string, [string, string]> = {
        dashboard: ['/admin/dashboard', 'Dashboard | Okta'],
        tasks: ['/admin/tasks', 'Tasks | Okta'],
        people: ['/admin/users', 'People | Okta'],
        groups: ['/admin/groups', 'Groups | Okta'],
        profiles: ['/admin/universaldirectory', 'Profile Editor | Okta'],
        integrations: ['/admin/people/directories', 'Directory Integrations | Okta'],
        apps: ['/admin/apps/active', 'Applications | Okta'],
        selfservice: ['/admin/apps/self-service', 'Self Service | Okta'],
        logs: ['/report/system_log_2', 'System Log | Okta'],
        security: ['/admin/access/multifactor', 'Authenticators | Okta'],
        workflow: ['/admin/workflow/automations', 'Automations | Okta'],
        customizations: ['/admin/customizations/brands', 'Brands | Okta'],
        settings: ['/admin/settings/account', 'Account | Okta'],
      }
      if (route.page === 'user' && u) {
        url = `${A}/admin/user/profile/view/${u.oktaId}#tab-${route.tab === 'roles' ? 'roles' : route.tab === 'applications' || !route.tab ? 'apps' : route.tab}`
        title = `${fullName(u)} | Okta`
      } else {
        const [p, t] = m[route.page] ?? m.dashboard
        url = A + p
        title = t
      }
    }
    setUrl(url)
    setTitle(title)
  }, [route.area, route.page, route.tab, u?.id])

  return (
    <div className="flex-1 min-h-0 flex flex-col relative bg-[#F4F4F4] text-[#1D1D21]" style={{ fontFamily: FONT }}>
      {route.area === 'home' ? <EndUser go={setRoute} /> : <Admin route={route} go={setRoute} />}
    </div>
  )
}
