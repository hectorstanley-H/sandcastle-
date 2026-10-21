import { useEffect, useState } from 'react'
import { MagnifyingGlass, Plus, Question, GearSix, Bell, CaretDown } from '@phosphor-icons/react'
import type { AppProps } from '@/os/registry'
import { logoUrl } from '@/os/registry'
import { useWin } from '@/os/context'
import { db, useCollection } from '@/db/db'
import { ME } from '@/data/people'
import { FONT, type Route } from './shared'
import type { Candidate, Job } from './types'
import { Dashboard } from './Dashboard'
import { JobsList } from './Jobs'
import { JobPipeline } from './Pipeline'
import { CandidateProfile } from './Candidate'
import { CandidatesList } from './Candidates'
import { Reports, Placeholder } from './Reports'

function routeFromParams(p: any): Route | null {
  if (!p) return null
  if (p.candidateId) return { page: 'candidate', candidateId: p.candidateId }
  if (p.jobId) return { page: 'job', jobId: p.jobId, tab: p.tab ?? 'candidates' }
  if (p.page && ['dashboard', 'jobs', 'candidates', 'reports'].includes(p.page)) return { page: p.page }
  return null
}

export default function Greenhouse({ win, params }: AppProps) {
  const { setUrl, setTitle } = useWin()
  const [route, setRoute] = useState<Route>(() => routeFromParams(params) ?? { page: 'dashboard' })
  const [q, setQ] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const jobs = useCollection<Job>('greenhouse.jobs')
  const cands = useCollection<Candidate>('greenhouse.candidates')

  useEffect(() => {
    const r = routeFromParams(params)
    if (r) setRoute(r)
  }, [win.nonce])

  useEffect(() => {
    const base = 'https://app.greenhouse.io'
    if (route.page === 'dashboard') {
      setUrl(`${base}/dashboard`)
      setTitle('Dashboard | Greenhouse')
    } else if (route.page === 'jobs') {
      setUrl(`${base}/alljobs`)
      setTitle('All Jobs | Greenhouse')
    } else if (route.page === 'job') {
      const j = db.find<Job>('greenhouse.jobs', route.jobId)
      const n = j?.num ?? 0
      setUrl(route.tab === 'dashboard' ? `${base}/sdash/${n}` : route.tab === 'setup' ? `${base}/plans/${n}` : `${base}/sdash/${n}/pipeline`)
      setTitle(`${j?.name ?? 'Job'} | Greenhouse`)
    } else if (route.page === 'candidate') {
      const c = db.find<Candidate>('greenhouse.candidates', route.candidateId)
      setUrl(`${base}/people/${c?.num ?? 0}?application_id=${c?.appNum ?? 0}`)
      setTitle(`${c?.name ?? 'Candidate'} - Greenhouse`)
    } else if (route.page === 'candidates') {
      setUrl(`${base}/people?stage_status_id=2&in_stages=all`)
      setTitle('All Candidates | Greenhouse')
    } else if (route.page === 'reports') {
      setUrl(`${base}/reports`)
      setTitle('Reports | Greenhouse')
    } else {
      setUrl(`${base}/${route.page}`)
      setTitle(`${route.page === 'crm' ? 'CRM' : 'Integrations'} | Greenhouse`)
    }
  }, [route])

  const go = (r: Route) => {
    setRoute(r)
    setSearchOpen(false)
  }

  const active =
    route.page === 'job' || route.page === 'jobs' ? 'jobs' : route.page === 'candidate' || route.page === 'candidates' ? 'candidates' : route.page
  const nav: [string, string, Route][] = [
    ['jobs', 'Jobs', { page: 'jobs' }],
    ['candidates', 'Candidates', { page: 'candidates' }],
    ['crm', 'CRM', { page: 'crm' }],
    ['reports', 'Reports', { page: 'reports' }],
    ['integrations', 'Integrations', { page: 'integrations' }],
  ]
  const ql = q.trim().toLowerCase()
  const hits = ql
    ? [
        ...cands.filter((c) => c.name.toLowerCase().includes(ql)).slice(0, 6).map((c) => ({ k: c.id, label: c.name, sub: `${c.title} at ${c.company}`, r: { page: 'candidate', candidateId: c.id } as Route })),
        ...jobs.filter((j) => j.name.toLowerCase().includes(ql) || j.reqId.toLowerCase().includes(ql)).slice(0, 4).map((j) => ({ k: j.id, label: j.name, sub: `Job · ${j.reqId} · ${j.office}`, r: { page: 'job', jobId: j.id, tab: 'candidates' } as Route })),
      ]
    : []

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[#F7F8F7] text-[#15372C]" style={{ fontFamily: FONT }}>
      <header className="h-[60px] shrink-0 bg-white border-b border-[#E1E4E2] flex items-center px-6 gap-8 relative z-20">
        <button data-agent="greenhouse-nav-dashboard" aria-label="Greenhouse home (Dashboard)" onClick={() => go({ page: 'dashboard' })} className="flex items-center shrink-0">
          <img src={logoUrl('greenhouse-wordmark')} className="h-[26px]" alt="greenhouse" />
        </button>
        <nav className="flex items-stretch h-full gap-1">
          {nav.map(([id, label, r]) => (
            <button
              key={id}
              data-agent={`greenhouse-nav-${id}`}
              aria-label={label}
              onClick={() => go(r)}
              className={`relative px-3 text-[14.5px] h-full flex items-center ${active === id ? 'font-semibold text-[#15372C]' : 'text-[#3E4F49] hover:text-[#15372C]'}`}
            >
              {label}
              {active === id && <span className="absolute left-3 right-3 bottom-0 h-[3px] rounded-t bg-[#24A47F]" />}
            </button>
          ))}
        </nav>
        <div className="flex-1" />
        <div className="relative">
          <div className="flex items-center gap-2 h-9 w-[260px] rounded-full border border-[#C9D0CD] px-3 bg-white focus-within:border-[#15372C]">
            <MagnifyingGlass size={16} className="text-[#5B6B66]" />
            <input
              data-agent="greenhouse-search"
              aria-label="Search"
              value={q}
              onChange={(e) => {
                setQ(e.target.value)
                setSearchOpen(true)
              }}
              onFocus={() => setSearchOpen(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && hits[0]) {
                  go(hits[0].r)
                  setQ('')
                }
                if (e.key === 'Escape') setSearchOpen(false)
              }}
              placeholder="Search"
              className="flex-1 min-w-0 outline-none text-[14px] bg-transparent placeholder:text-[#7A8884]"
            />
          </div>
          {searchOpen && hits.length > 0 && (
            <div className="absolute right-0 top-11 w-[360px] bg-white rounded-lg border border-[#E1E4E2] shadow-[0_8px_24px_rgba(21,55,44,0.14)] py-1">
              {hits.map((h) => (
                <button
                  key={h.k}
                  data-agent={`greenhouse-search-result-${h.k}`}
                  onClick={() => {
                    go(h.r)
                    setQ('')
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-[#F2F4F3]"
                >
                  <div className="text-[13.5px] font-medium">{h.label}</div>
                  <div className="text-[12px] text-[#5B6B66]">{h.sub}</div>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 -ml-4">
          <button aria-label="Add" className="w-9 h-9 rounded-full bg-[#15372C] text-white flex items-center justify-center hover:bg-[#0E271F]">
            <Plus size={18} weight="bold" />
          </button>
          <button aria-label="Notifications" className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#F2F4F3] text-[#15372C] relative">
            <Bell size={20} />
            <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-[#24A47F] border border-white" />
          </button>
          <button aria-label="Help" className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#F2F4F3] text-[#15372C]">
            <Question size={20} />
          </button>
          <button aria-label="Configure" className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#F2F4F3] text-[#15372C]">
            <GearSix size={20} />
          </button>
          <button aria-label="Account" className="flex items-center gap-1 ml-1">
            <span className="w-8 h-8 rounded-full bg-[#DDEFE7] text-[#15372C] text-[12.5px] font-semibold flex items-center justify-center">{ME.first[0]}{ME.last[0]}</span>
            <CaretDown size={12} />
          </button>
        </div>
      </header>
      <div className="flex-1 min-h-0 flex flex-col" onMouseDown={() => searchOpen && setSearchOpen(false)}>
        {route.page === 'dashboard' && <Dashboard go={go} />}
        {route.page === 'jobs' && <JobsList go={go} />}
        {route.page === 'job' && <JobPipeline key={route.jobId} jobId={route.jobId} tab={route.tab ?? 'candidates'} go={go} />}
        {route.page === 'candidates' && <CandidatesList go={go} />}
        {route.page === 'candidate' && <CandidateProfile key={route.candidateId} candidateId={route.candidateId} go={go} />}
        {route.page === 'reports' && <Reports go={go} />}
        {(route.page === 'crm' || route.page === 'integrations') && <Placeholder page={route.page} go={go} />}
      </div>
    </div>
  )
}
