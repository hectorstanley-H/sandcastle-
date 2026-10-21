import { useEffect, useState } from 'react'
import { HelpCircle, Bell, Grid3x3 } from 'lucide-react'
import type { AppProps } from '@/os/registry'
import { useWin } from '@/os/context'
import { useDB } from '@/db/db'
import { Avatar } from '@/components/Avatar'
import { ME } from '@/data/people'
import { C, FONT, Wordmark } from './shared'
import { Home } from './Home'
import { Agreements, EnvelopeDetails } from './Agreements'
import { Templates } from './Templates'
import { Reports } from './Reports'
import { SendFlow } from './Send'

export type Route =
  | { page: 'home' }
  | { page: 'agreements'; folder: string }
  | { page: 'details'; id: string; justSent?: boolean; from?: string }
  | { page: 'templates' }
  | { page: 'reports' }
  | { page: 'send'; templateId?: string; key: number }

export interface Nav {
  go: (r: Route) => void
  send: (templateId?: string) => void
}

function routeFromParams(params: any): Route | null {
  if (!params) return null
  if (params.envelopeId) return { page: 'details', id: params.envelopeId }
  if (params.page === 'send' || params.templateId) return { page: 'send', templateId: params.templateId, key: Date.now() }
  if (params.page === 'agreements') return { page: 'agreements', folder: params.folder ?? 'inbox' }
  if (params.page === 'templates') return { page: 'templates' }
  if (params.page === 'reports') return { page: 'reports' }
  if (params.page === 'home') return { page: 'home' }
  if (params.folder) return { page: 'agreements', folder: params.folder }
  return null
}

export default function Docusign({ win, params }: AppProps) {
  const { setUrl, setTitle } = useWin()
  const epoch = useDB((s) => s.epoch)
  const [route, setRoute] = useState<Route>(() => routeFromParams(params) ?? { page: 'home' })

  useEffect(() => {
    const r = routeFromParams(params)
    if (r) setRoute(r)
  }, [win.nonce])

  useEffect(() => {
    const base = 'https://apps.docusign.com/send'
    switch (route.page) {
      case 'home':
        setUrl(`${base}/home`)
        setTitle('Home | Docusign')
        break
      case 'agreements':
        setUrl(`${base}/documents?type=envelopes&folder=${route.folder}`)
        setTitle('Agreements | Docusign')
        break
      case 'details':
        setUrl(`${base}/documents/details/${route.id.toLowerCase()}`)
        setTitle('Envelope Details | Docusign')
        break
      case 'templates':
        setUrl(`${base}/templates`)
        setTitle('Templates | Docusign')
        break
      case 'reports':
        setUrl(`${base}/reports`)
        setTitle('Reports | Docusign')
        break
      case 'send':
        setTitle('Prepare | Docusign')
        break
    }
  }, [route])

  const nav: Nav = {
    go: setRoute,
    send: (templateId) => setRoute({ page: 'send', templateId, key: Date.now() }),
  }

  const top = route.page === 'details' || route.page === 'agreements' ? 'agreements' : route.page

  if (route.page === 'send')
    return (
      <div key={`${epoch}-${route.key}`} className="relative flex-1 min-h-0 flex flex-col bg-white" style={{ fontFamily: FONT, color: C.text }}>
        <SendFlow templateId={route.templateId} nav={nav} setUrl={setUrl} />
      </div>
    )

  const tabs: [string, string, Route][] = [
    ['home', 'Home', { page: 'home' }],
    ['agreements', 'Agreements', { page: 'agreements', folder: 'inbox' }],
    ['templates', 'Templates', { page: 'templates' }],
    ['reports', 'Reports', { page: 'reports' }],
    ['admin', 'Admin', { page: 'home' }],
  ]

  return (
    <div key={epoch} className="flex-1 min-h-0 flex flex-col bg-white" style={{ fontFamily: FONT, color: C.text }}>
      <header className="h-[60px] shrink-0 flex items-center px-6 bg-white border-b border-[#E5E1EC] relative z-20">
        <button onClick={() => setRoute({ page: 'home' })} className="mr-8 flex items-center" aria-label="Docusign home">
          <Wordmark height={22} />
        </button>
        <nav className="flex items-stretch h-full">
          {tabs.map(([id, label, r]) => {
            const active = top === id
            return (
              <button
                key={id}
                data-agent={`docusign-nav-${id}`}
                aria-label={label}
                onClick={() => setRoute(r)}
                className={`relative px-4 h-full text-[15px] ${active ? 'font-semibold text-[#130032]' : 'text-[#3D3551] hover:text-[#130032]'}`}
              >
                {label}
                {active && <span className="absolute left-3 right-3 bottom-0 h-[3px] rounded-t bg-[#130032]" />}
              </button>
            )
          })}
        </nav>
        <div className="flex-1" />
        <div className="flex items-center gap-1 text-[#3D3551]">
          <button className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#F2F0F5]" aria-label="Apps">
            <Grid3x3 size={19} />
          </button>
          <button className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#F2F0F5]" aria-label="Notifications">
            <Bell size={19} />
          </button>
          <button className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#F2F0F5]" aria-label="Help">
            <HelpCircle size={20} />
          </button>
          <button className="ml-2 flex items-center" aria-label="Profile">
            <Avatar id={ME.id} size={34} />
          </button>
        </div>
      </header>
      <div className="flex-1 min-h-0 flex flex-col">
        {route.page === 'home' && <Home nav={nav} />}
        {route.page === 'agreements' && <Agreements nav={nav} folder={route.folder} />}
        {route.page === 'details' && <EnvelopeDetails nav={nav} id={route.id} justSent={route.justSent} />}
        {route.page === 'templates' && <Templates nav={nav} />}
        {route.page === 'reports' && <Reports />}
      </div>
    </div>
  )
}
