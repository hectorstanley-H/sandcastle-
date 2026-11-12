import { useEffect, useState } from 'react'
import { MagnifyingGlass, Plus, Question, GearSix, Bell, CaretDown } from '@phosphor-icons/react'
import type { AppProps } from '@/os/registry'
import { logoUrl } from '@/os/registry'
import { useDesk, useWin } from '@/os/context'
import { db, useCollection } from '@/db/db'
import { ME } from '@/data/people'
import { Avatar } from '@/components/Avatar'
import { FONT, type Route } from './shared'
import type { Candidate, Job } from './types'
import { Dashboard } from './Dashboard'
import { JobsList } from './Jobs'
import { JobPipeline } from './Pipeline'
import { CandidateProfile } from './Candidate'
import { CandidatesList } from './Candidates'
import { Reports } from './Reports'
import { JobPosts, Configure, Crm, Integrations } from './Extra'
import { AddCandidateModal, CreateJobModal } from './Modals'

function routeFromParams(p: any): Route | null {
  if (!p) return null
  if (p.candidateId) return { page: 'candidate', candidateId: p.candidateId }
  if (p.jobId) return { page: 'job', jobId: p.jobId, tab: p.tab ?? 'candidates' }
  if (p.page && ['dashboard', 'jobs', 'candidates', 'reports', 'crm', 'integrations', 'posts', 'configure'].includes(p.page)) return { page: p.page }
  return null
}

export default function Greenhouse({ win, params }: AppProps) {
  const { setUrl, setTitle } = useWin()
  const [route, setRoute] = useState<Route>(() => routeFromParams(params) ?? { page: 'dashboard' })
  const [q, setQ] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [pop, setPop] = useState<null | 'add' | 'bell' | 'help' | 'account'>(null)
  const [dlg, setDlg] = useState<null | 'candidate' | 'job'>(null)
  const [seenAt, setSeenAt] = useState(() => Date.now() - 3 * 864e5)
  const { toast } = useDesk()
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
    } else if (route.page === 'posts') {
      setUrl(`${base}/jobboard`)
      setTitle('Job Board | Greenhouse')
    } else if (route.page === 'configure') {
      setUrl(`${base}/configure`)
      setTitle('Configure | Greenhouse')
    } else {
      setUrl(`${base}/${route.page}`)
      setTitle(`${route.page === 'crm' ? 'CRM' : 'Integrations'} | Greenhouse`)
    }
  }, [route])

  const go = (r: Route) => {
    setRoute(r)
    setSearchOpen(false)
    setPop(null)
  }
  const myJobIds = new Set(jobs.filter((j) => j.hiringTeam.includes(ME.id)).map((j) => j.id))
  const feed = cands
    .filter((c) => myJobIds.has(c.jobId))
    .flatMap((c) => c.activity.filter((a) => a.by !== ME.id).slice(0, 2).map((a) => ({ a, c })))
    .sort((x, y) => +new Date(y.a.at) - +new Date(x.a.at))
    .slice(0, 8)
  const unseen = feed.filter((f) => +new Date(f.a.at) > seenAt).length

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
    <div className="flex-1 min-h-0 flex flex-col bg-[#F7F8F7] text-[#15372C] relative" style={{ fontFamily: FONT }}>
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
          <button aria-label="Add" data-agent="greenhouse-header-add" onClick={() => setPop(pop === 'add' ? null : 'add')} className="w-9 h-9 rounded-full bg-[#15372C] text-white flex items-center justify-center hover:bg-[#0E271F]">
            <Plus size={18} weight="bold" />
          </button>
          <button
            aria-label="Notifications"
            data-agent="greenhouse-header-notifications"
            onClick={() => {
              setPop(pop === 'bell' ? null : 'bell')
              if (pop !== 'bell') setSeenAt(Date.now())
            }}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#F2F4F3] text-[#15372C] relative"
          >
            <Bell size={20} />
            {unseen > 0 && <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-[#24A47F] border border-white" />}
          </button>
          <button aria-label="Help" onClick={() => setPop(pop === 'help' ? null : 'help')} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#F2F4F3] text-[#15372C]">
            <Question size={20} />
          </button>
          <button aria-label="Configure" onClick={() => go({ page: 'configure' })} className={`w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#F2F4F3] text-[#15372C] ${route.page === 'configure' ? 'bg-[#E6F4EE]' : ''}`}>
            <GearSix size={20} />
          </button>
          <button aria-label="Account" onClick={() => setPop(pop === 'account' ? null : 'account')} className="flex items-center gap-1 ml-1">
            <span className="w-8 h-8 rounded-full bg-[#DDEFE7] text-[#15372C] text-[12.5px] font-semibold flex items-center justify-center">{ME.first[0]}{ME.last[0]}</span>
            <CaretDown size={12} />
          </button>
        </div>
        {pop && <div className="fixed inset-0 z-10" onMouseDown={() => setPop(null)} />}
        {pop === 'add' && (
          <div className="absolute right-[150px] top-[54px] z-30 w-52 bg-white rounded-lg border border-[#E1E4E2] shadow-[0_8px_24px_rgba(21,55,44,0.14)] py-1 text-[14px]">
            {[
              ['Add a candidate', () => setDlg('candidate')],
              ['Add a referral', () => setDlg('candidate')],
              ['Create a job', () => setDlg('job')],
            ].map(([l, fn]: any) => (
              <button key={l} role="menuitem" onClick={() => (setPop(null), fn())} className="w-full text-left px-4 h-9 hover:bg-[#F2F4F3]">
                {l}
              </button>
            ))}
          </div>
        )}
        {pop === 'bell' && (
          <div className="absolute right-[100px] top-[54px] z-30 w-[380px] bg-white rounded-lg border border-[#E1E4E2] shadow-[0_8px_24px_rgba(21,55,44,0.14)] py-2">
            <div className="px-4 pb-2 text-[14px] font-semibold">Notifications</div>
            {feed.map(({ a, c }) => (
              <button key={a.id} onClick={() => go({ page: 'candidate', candidateId: c.id })} className="w-full text-left px-4 py-2 hover:bg-[#F2F4F3] flex gap-2.5">
                <Avatar id={a.by === 'system' ? 'james' : a.by} size={26} />
                <div className="min-w-0 text-[13px]">
                  <div className="truncate">
                    <b>{c.name}</b> · {a.text}
                  </div>
                  <div className="text-[11.5px] text-[#7A8884]">{new Date(a.at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</div>
                </div>
              </button>
            ))}
            {!feed.length && <div className="px-4 py-3 text-[13px] text-[#5B6B66]">You’re all caught up.</div>}
          </div>
        )}
        {pop === 'help' && (
          <div className="absolute right-[60px] top-[54px] z-30 w-56 bg-white rounded-lg border border-[#E1E4E2] shadow-[0_8px_24px_rgba(21,55,44,0.14)] py-1 text-[14px]">
            {['Help Center', 'Greenhouse University', 'What’s new', 'Contact support'].map((l) => (
              <button key={l} role="menuitem" onClick={() => (setPop(null), toast({ appId: 'greenhouse', title: l, body: 'Opened support.greenhouse.io in a new tab.' }))} className="w-full text-left px-4 h-9 hover:bg-[#F2F4F3]">
                {l}
              </button>
            ))}
          </div>
        )}
        {pop === 'account' && (
          <div className="absolute right-4 top-[54px] z-30 w-60 bg-white rounded-lg border border-[#E1E4E2] shadow-[0_8px_24px_rgba(21,55,44,0.14)] py-1 text-[14px]">
            <div className="px-4 py-2 border-b border-[#EDEFEE]">
              <div className="font-semibold">{ME.name}</div>
              <div className="text-[12px] text-[#5B6B66]">{ME.email}</div>
            </div>
            {[
              ['Account settings', () => go({ page: 'configure' })],
              ['My interviews & scorecards', () => go({ page: 'dashboard' })],
              ['Integrations', () => go({ page: 'integrations' })],
            ].map(([l, fn]: any) => (
              <button key={l} role="menuitem" onClick={() => (setPop(null), fn())} className="w-full text-left px-4 h-9 hover:bg-[#F2F4F3]">
                {l}
              </button>
            ))}
          </div>
        )}
      </header>
      <div className="flex-1 min-h-0 flex flex-col" onMouseDown={() => searchOpen && setSearchOpen(false)}>
        {route.page === 'dashboard' && <Dashboard go={go} />}
        {route.page === 'jobs' && <JobsList go={go} />}
        {route.page === 'job' && <JobPipeline key={route.jobId} jobId={route.jobId} tab={route.tab ?? 'candidates'} go={go} />}
        {route.page === 'candidates' && <CandidatesList go={go} />}
        {route.page === 'candidate' && <CandidateProfile key={route.candidateId} candidateId={route.candidateId} go={go} />}
        {route.page === 'reports' && <Reports go={go} />}
        {route.page === 'crm' && <Crm go={go} />}
        {route.page === 'integrations' && <Integrations />}
        {route.page === 'posts' && <JobPosts go={go} />}
        {route.page === 'configure' && <Configure />}
      </div>
      {dlg === 'candidate' && <AddCandidateModal onClose={() => setDlg(null)} onDone={(id) => (setDlg(null), go({ page: 'candidate', candidateId: id }))} />}
      {dlg === 'job' && <CreateJobModal onClose={() => setDlg(null)} onDone={(id) => (setDlg(null), go({ page: 'job', jobId: id, tab: 'setup' }))} />}
    </div>
  )
}
