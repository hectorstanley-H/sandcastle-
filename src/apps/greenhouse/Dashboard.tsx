import { useState, type ReactNode } from 'react'
import { CalendarBlank, ClipboardText, CurrencyCircleDollar, UserList, CaretRight, CaretDown, VideoCamera, MapPin, Briefcase, UserPlus, ChartBar, Megaphone, ArrowSquareOut } from '@phosphor-icons/react'
import { db, useCollection } from '@/db/db'
import { useDesk } from '@/os/context'
import { ME, person } from '@/data/people'
import { Avatar } from '@/components/Avatar'
import type { Candidate, Interview, Job } from './types'
import { PIPELINE, STAGE_LABEL } from './types'
import { Card, fmtTimeOnly, type Go, HWorkerChip } from './shared'
import { scorecardsDue, stageCounts, toSchedule, activeCount } from './data'
import { AddCandidateModal, approveOffer, CreateJobModal, InterviewKitModal, ScorecardModal } from './Modals'

function Cust({ id, hidden, customizing, onHide, children }: { id: string; hidden: string[]; customizing: boolean; onHide: (id: string) => void; children: ReactNode }) {
  if (hidden.includes(id)) return null
  return (
    <div className="relative">
      {children}
      {customizing && (
        <button onClick={() => onHide(id)} className="absolute top-2.5 right-3 h-7 px-2.5 rounded-md bg-[#15372C] text-white text-[12px] font-medium z-10">
          Hide
        </button>
      )}
    </div>
  )
}

const CARD_NAMES: Record<string, string> = { interviews: 'My Interviews', jobs: "Jobs I'm hiring for", activity: 'Recent activity on my jobs', tasks: 'My Tasks', approvals: 'Pending approvals', links: 'Quick links' }

export function Dashboard({ go }: { go: Go }) {
  const jobs = useCollection<Job>('greenhouse.jobs')
  const cands = useCollection<Candidate>('greenhouse.candidates')
  const interviews = useCollection<Interview>('greenhouse.interviews')
  const [open, setOpen] = useState<string | null>('schedule')
  const { isAgent, toast } = useDesk()
  const prefs = useCollection<any>('greenhouse.prefs').find((p) => p.id === 'dash-alex')
  const hidden: string[] = prefs?.hidden ?? []
  const [customizing, setCustomizing] = useState(false)
  const [dlg, setDlg] = useState<null | 'candidate' | 'job'>(null)
  const [kit, setKit] = useState<Interview | null>(null)
  const [sc, setSc] = useState<Interview | null>(null)
  const setHidden = (h: string[]) => db.upsert('greenhouse.prefs', { id: 'dash-alex', hidden: h })
  const cp = { hidden, customizing, onHide: (id: string) => setHidden([...hidden, id]) }
  const hour = new Date().getHours()
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const myJobs = jobs.filter((j) => j.hiringManager === ME.id || j.hiringTeam.includes(ME.id)).filter((j) => j.status !== 'draft')
  const sched = toSchedule(ME.id, jobs, cands, interviews)
  const due = scorecardsDue(ME.id, cands, interviews)
  const offers = cands.filter((c) => c.offer?.status === 'pending_approval' && c.offer.approvers.includes(ME.id) && !(c.offer.approvedBy ?? []).includes(ME.id))
  const review = cands.filter((c) => c.stage === 'application_review' && myJobs.some((j) => j.id === c.jobId && j.hiringManager === ME.id))
  const upcoming = interviews
    .filter((i) => i.interviewers.includes(ME.id) && i.status === 'scheduled' && +new Date(i.end) > Date.now())
    .sort((a, b) => +new Date(a.start) - +new Date(b.start))
  const cname = (id: string) => cands.find((c) => c.id === id)
  const jname = (id: string) => jobs.find((j) => j.id === id)

  const tasks = [
    { id: 'schedule', icon: CalendarBlank, label: 'Interviews to schedule', count: sched.length, rows: sched.map(({ c, open }) => ({ id: c.id, title: c.name, sub: `${open.map((o) => o.plan.name).join(', ')} · ${jname(c.jobId)?.name}` })) },
    { id: 'scorecards', icon: ClipboardText, label: 'Scorecards due', count: due.length, rows: due.map((i) => ({ id: i.candidateId, title: cname(i.candidateId)?.name ?? '', sub: `${i.name} · ${new Date(i.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` })) },
    { id: 'offers', icon: CurrencyCircleDollar, label: 'Offers to approve', count: offers.length, rows: offers.map((c) => ({ id: c.id, title: c.name, sub: `${jname(c.jobId)?.name} · ${c.offer?.salary}` })) },
    { id: 'review', icon: UserList, label: 'Candidates to review', count: review.length, rows: review.map((c) => ({ id: c.id, title: c.name, sub: `${c.title} at ${c.company}` })) },
  ]

  return (
    <div className="flex-1 min-h-0 overflow-auto">
      <div className="max-w-[1320px] mx-auto px-8 py-7">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h1 className="text-[28px] font-semibold tracking-[-0.02em]">{greet}, {ME.first}</h1>
            <div className="text-[14px] text-[#5B6B66] mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} · Northwind Global</div>
          </div>
          <button data-agent="greenhouse-customize-dashboard" onClick={() => setCustomizing((c) => !c)} className="text-[13.5px] text-[#1B7F62] font-medium hover:underline">
            {customizing ? 'Done customizing' : 'Customize dashboard'}
          </button>
        </div>
        {customizing && (
          <div className="mb-5 rounded-lg border border-dashed border-[#24A47F] bg-[#F2FAF6] px-5 py-3 text-[13.5px] flex items-center gap-3 flex-wrap">
            <span className="font-medium">Customizing — hide cards you don’t need.</span>
            {hidden.length > 0 && <span className="text-[#5B6B66]">Hidden:</span>}
            {hidden.map((h) => (
              <button key={h} onClick={() => setHidden(hidden.filter((x) => x !== h))} className="h-7 px-2.5 rounded-full border border-[#C9D0CD] bg-white text-[12.5px] hover:bg-[#F2F4F3]">
                + {CARD_NAMES[h]}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-[minmax(0,1fr)_380px] gap-6">
          <div className="space-y-6 min-w-0">
            <Cust id="interviews" {...cp}>
            <Card title="My Interviews" action={<span className="text-[13px] text-[#5B6B66]">{upcoming.length} upcoming</span>}>
              {upcoming.length === 0 && <div className="px-5 py-6 text-[13.5px] text-[#5B6B66]">No upcoming interviews.</div>}
              {upcoming.slice(0, 6).map((i) => {
                const c = cname(i.candidateId)
                const d = new Date(i.start)
                const isToday = d.toDateString() === new Date().toDateString()
                return (
                  <div key={i.id} className={`flex items-center gap-4 px-5 py-3 border-b border-[#EDEFEE] last:border-0 ${i.createdBy === 'hworker' && Date.now() - +new Date(i.createdAt) < 120000 ? 'flash-new' : ''}`}>
                    <div className="w-[52px] shrink-0 text-center rounded-md border border-[#E1E4E2] overflow-hidden">
                      <div className="text-[10.5px] font-semibold uppercase bg-[#15372C] text-white py-0.5">{isToday ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                      <div className="text-[18px] font-semibold leading-7">{d.getDate()}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <button onClick={() => go({ page: 'candidate', candidateId: i.candidateId })} className="text-[14.5px] font-semibold hover:underline text-left">
                        {c?.name}
                      </button>
                      <span className="text-[13.5px] text-[#5B6B66]"> · {i.name}</span>
                      {i.createdBy === 'hworker' && <span className="ml-2"><HWorkerChip text="Scheduled by H-Worker" /></span>}
                      <div className="text-[13px] text-[#5B6B66] mt-0.5 flex items-center gap-3">
                        <span>{fmtTimeOnly(i.start)} – {fmtTimeOnly(i.end)}</span>
                        <span className="flex items-center gap-1">{i.location === 'onsite-boston' ? <MapPin size={14} /> : <VideoCamera size={14} />}{i.location === 'zoom' ? 'Zoom' : i.location === 'teams' ? 'Microsoft Teams' : 'Boston HQ'}</span>
                        <span className="truncate">{jname(i.jobId)?.name}</span>
                      </div>
                    </div>
                    <div className="flex -space-x-1.5">
                      {i.interviewers.map((p) => <Avatar key={p} id={p} size={26} ring="#fff" />)}
                    </div>
                    <button onClick={() => setKit(i)} className="h-8 px-3 rounded-md border border-[#C9D0CD] text-[13px] font-medium hover:bg-[#F2F4F3]">Interview Kit</button>
                  </div>
                )
              })}
            </Card>
            </Cust>

            <Cust id="jobs" {...cp}>
            <Card title="Jobs I'm hiring for" action={<button onClick={() => go({ page: 'jobs' })} className="text-[13px] text-[#1B7F62] font-medium hover:underline">View all jobs</button>}>
              <div className="grid grid-cols-[minmax(0,1fr)_repeat(5,72px)] px-5 h-9 items-center text-[11.5px] uppercase tracking-wide text-[#5B6B66] font-semibold border-b border-[#EDEFEE]">
                <span>Job</span>
                {PIPELINE.map((s) => <span key={s} className="text-center">{s === 'application_review' ? 'App Review' : STAGE_LABEL[s]}</span>)}
              </div>
              {myJobs.map((j) => {
                const m = stageCounts(j.id, cands)
                return (
                  <div key={j.id} className="grid grid-cols-[minmax(0,1fr)_repeat(5,72px)] px-5 py-3 items-center border-b border-[#EDEFEE] last:border-0 hover:bg-[#FAFBFA]">
                    <div className="min-w-0">
                      <button data-agent={`greenhouse-job-${j.id}`} aria-label={`Open job ${j.name}`} onClick={() => go({ page: 'job', jobId: j.id, tab: 'candidates' })} className="text-[14px] font-semibold text-left hover:underline truncate max-w-full">
                        {j.name}
                      </button>
                      <div className="text-[12.5px] text-[#5B6B66]">
                        {j.reqId} · {j.office} · {j.status === 'closed' ? 'Closed' : `${activeCount(j.id, cands)} active`}
                        {j.hiringManager === ME.id && <span className="ml-2 inline-flex h-[18px] px-1.5 items-center rounded bg-[#E6F4EE] text-[#11734B] text-[11px] font-semibold">Hiring Manager</span>}
                      </div>
                    </div>
                    {PIPELINE.map((s) => (
                      <button key={s} onClick={() => go({ page: 'job', jobId: j.id, tab: 'candidates' })} className={`text-center text-[15px] ${m[s] ? 'font-semibold text-[#15372C] hover:underline' : 'text-[#A7B1AD]'}`}>
                        {m[s]}
                      </button>
                    ))}
                  </div>
                )
              })}
            </Card>
            </Cust>

            <Cust id="activity" {...cp}>
            <Card title="Recent activity on my jobs">
              {cands
                .filter((c) => myJobs.some((j) => j.id === c.jobId))
                .flatMap((c) => c.activity.slice(0, 2).map((a) => ({ a, c })))
                .sort((x, y) => +new Date(y.a.at) - +new Date(x.a.at))
                .slice(0, 6)
                .map(({ a, c }) => (
                  <div key={a.id} className="flex items-start gap-3 px-5 py-3 border-b border-[#EDEFEE] last:border-0">
                    {a.by === 'system' ? <span className="w-7 h-7 rounded-full bg-[#E6F4EE] flex items-center justify-center"><UserPlus size={14} /></span> : <Avatar id={a.by} size={28} />}
                    <div className="min-w-0 flex-1 text-[13.5px]">
                      <span className="font-semibold">{a.by === 'system' ? c.name : person(a.by).name}</span> <span className="text-[#3E4F49]">{a.text.charAt(0).toLowerCase() + a.text.slice(1)}</span>
                      {a.by !== 'system' && <> — <button onClick={() => go({ page: 'candidate', candidateId: c.id })} className="font-medium text-[#1B7F62] hover:underline">{c.name}</button></>}
                      {a.createdBy === 'hworker' && <span className="ml-2"><HWorkerChip /></span>}
                      <div className="text-[12px] text-[#7A8884] mt-0.5">{new Date(a.at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</div>
                    </div>
                  </div>
                ))}
            </Card>
            </Cust>
          </div>

          <div className="space-y-6">
            <Cust id="tasks" {...cp}>
            <Card title="My Tasks">
              {tasks.map((t) => (
                <div key={t.id} className="border-b border-[#EDEFEE] last:border-0">
                  <button data-agent={`greenhouse-task-${t.id}`} aria-label={t.label} onClick={() => setOpen(open === t.id ? null : t.id)} className="w-full flex items-center gap-3 px-5 h-[52px] hover:bg-[#FAFBFA]">
                    <span className="w-8 h-8 rounded-full bg-[#E6F4EE] text-[#15372C] flex items-center justify-center"><t.icon size={17} /></span>
                    <span className="flex-1 text-left text-[14px] font-medium">{t.label}</span>
                    <span className={`min-w-[28px] h-6 px-2 rounded-full text-[13px] font-semibold flex items-center justify-center ${t.count ? 'bg-[#15372C] text-white' : 'bg-[#EEF1EF] text-[#7A8884]'}`}>{t.count}</span>
                    {open === t.id ? <CaretDown size={14} /> : <CaretRight size={14} />}
                  </button>
                  {open === t.id && t.rows.length > 0 && (
                    <div className="pb-2">
                      {t.rows.map((r) => (
                        <button key={r.id + r.sub} onClick={() => go({ page: 'candidate', candidateId: r.id })} className="w-full text-left pl-[64px] pr-5 py-1.5 hover:bg-[#F2F4F3]">
                          <div className="text-[13.5px] font-semibold text-[#1B7F62]">{r.title}</div>
                          <div className="text-[12px] text-[#5B6B66] truncate">{r.sub}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </Card>
            </Cust>

            <Cust id="approvals" {...cp}>
            <Card title="Pending approvals">
              {offers.map((c) => (
                <div key={c.id} className="px-5 py-3 border-b border-[#EDEFEE]">
                  <div className="text-[12px] uppercase tracking-wide font-semibold text-[#5B6B66]">Offer</div>
                  <button onClick={() => go({ page: 'candidate', candidateId: c.id })} className="text-[14px] font-semibold hover:underline">{c.name}</button>
                  <div className="text-[13px] text-[#5B6B66]">{jname(c.jobId)?.name} · {c.offer?.salary} base · Start {new Date(c.offer!.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                  <div className="flex gap-2 mt-2">
                    <button data-agent={`greenhouse-approve-offer-${c.id}`} onClick={() => approveOffer(c, isAgent)} className="h-8 px-3 rounded-md bg-[#15372C] text-white text-[13px] font-medium">Approve</button>
                    <button onClick={() => go({ page: 'candidate', candidateId: c.id })} className="h-8 px-3 rounded-md border border-[#C9D0CD] text-[13px] font-medium">Review offer</button>
                  </div>
                </div>
              ))}
              {jobs.filter((j) => j.status === 'draft').map((j) => (
                <div key={j.id} className="px-5 py-3 border-b border-[#EDEFEE] last:border-0">
                  <div className="text-[12px] uppercase tracking-wide font-semibold text-[#5B6B66]">Job approval · Waiting on {person(j.hiringManager).name}</div>
                  <button data-agent={`greenhouse-job-${j.id}`} onClick={() => go({ page: 'job', jobId: j.id, tab: 'setup' })} className="text-[14px] font-semibold hover:underline">{j.name}</button>
                  <div className="text-[13px] text-[#5B6B66]">{j.reqId} · {j.office}</div>
                </div>
              ))}
              {offers.length === 0 && jobs.filter((j) => j.status === 'draft').length === 0 && <div className="px-5 py-4 text-[13.5px] text-[#5B6B66]">Nothing waiting on you.</div>}
            </Card>
            </Cust>

            <Cust id="links" {...cp}>
            <Card title="Quick links">
              <div className="p-2">
                {[
                  [UserPlus, 'Add a candidate'],
                  [Briefcase, 'Create a job'],
                  [Megaphone, 'Job board & posts'],
                  [ChartBar, 'Pipeline report'],
                  [ArrowSquareOut, 'Greenhouse Help Center'],
                ].map(([I, l]: any) => (
                  <button
                    key={l}
                    onClick={() =>
                      l === 'Pipeline report'
                        ? go({ page: 'reports' })
                        : l === 'Add a candidate'
                          ? setDlg('candidate')
                          : l === 'Create a job'
                            ? setDlg('job')
                            : l === 'Job board & posts'
                              ? go({ page: 'posts' })
                              : toast({ appId: 'greenhouse', title: 'Greenhouse Help Center', body: 'Opened support.greenhouse.io in a new tab.' })
                    }
                    className="w-full flex items-center gap-3 px-3 h-10 rounded-md hover:bg-[#F2F4F3] text-[14px]"
                  >
                    <I size={17} className="text-[#1B7F62]" />
                    {l}
                  </button>
                ))}
              </div>
            </Card>
            </Cust>
          </div>
        </div>
      </div>
      {dlg === 'candidate' && <AddCandidateModal onClose={() => setDlg(null)} onDone={(id) => (setDlg(null), go({ page: 'candidate', candidateId: id }))} />}
      {dlg === 'job' && <CreateJobModal onClose={() => setDlg(null)} onDone={(id) => (setDlg(null), go({ page: 'job', jobId: id, tab: 'setup' }))} />}
      {kit && (
        <InterviewKitModal
          iv={kit}
          c={cname(kit.candidateId)}
          onClose={() => setKit(null)}
          onScorecard={() => {
            setSc(kit)
            setKit(null)
          }}
        />
      )}
      {sc && cname(sc.candidateId) && <ScorecardModal c={cname(sc.candidateId)!} job={jname(sc.jobId)} initialKey={{ stage: sc.stage, key: sc.planKey ?? '' }} onClose={() => setSc(null)} />}
    </div>
  )
}
