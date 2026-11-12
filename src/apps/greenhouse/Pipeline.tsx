import { useMemo, useState } from 'react'
import { CaretLeft, Funnel, Star, UserPlus, DotsThree, ThumbsUp, ChatCircle, X, Trash, Plus } from '@phosphor-icons/react'
import { db, useCollection, useRecord } from '@/db/db'
import { useDesk } from '@/os/context'
import { ME, PEOPLE, person } from '@/data/people'
import { Avatar } from '@/components/Avatar'
import type { Candidate, Interview, Job, Stage } from './types'
import { PIPELINE, STAGE_LABEL } from './types'
import { Btn, Card, daysSince, fmtActivity, type Go, HWorkerChip, pname, RatingIcon } from './shared'
import { stageCounts } from './data'
import { AddCandidateModal, fieldCls, newPlanItem } from './Modals'

const INTERNAL = PEOPLE.filter((p) => !p.external && p.id !== 'jordan')
export const isStarred = (j: Job) => j.starred ?? j.hiringManager === ME.id
export const postStatusOf = (j: Job) => j.postStatus ?? (j.status === 'open' ? 'live' : 'offline')

export function JobPipeline({ jobId, tab, go }: { jobId: string; tab: string; go: Go }) {
  const job = useRecord<Job>('greenhouse.jobs', jobId)
  const cands = useCollection<Candidate>('greenhouse.candidates')
  const interviews = useCollection<Interview>('greenhouse.interviews')
  const all = useMemo(() => cands.filter((c) => c.jobId === jobId), [cands, jobId])
  const [adding, setAdding] = useState(false)
  const [menu, setMenu] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [fl, setFl] = useState({ q: '', source: 'all', referrals: false, scheduled: false })
  const [notice, setNotice] = useState('')
  const activeFilters = (fl.q ? 1 : 0) + (fl.source !== 'all' ? 1 : 0) + (fl.referrals ? 1 : 0) + (fl.scheduled ? 1 : 0)
  const mine = all.filter(
    (c) =>
      (!fl.q || `${c.name} ${c.company} ${c.title}`.toLowerCase().includes(fl.q.toLowerCase())) &&
      (fl.source === 'all' || c.source === fl.source) &&
      (!fl.referrals || !!c.referrer) &&
      (!fl.scheduled || interviews.some((i) => i.candidateId === c.id && i.status === 'scheduled')),
  )
  if (!job) return <div className="p-10">Job not found.</div>
  const sources = [...new Set(all.map((c) => c.source))].sort()
  const setStatus = (status: Job['status']) => {
    db.update('greenhouse.jobs', job.id, { status, ...(status === 'closed' ? { closedAt: new Date().toISOString(), postStatus: 'offline' } : { closedAt: undefined }), ...(status === 'open' && job.status === 'draft' ? { openedAt: new Date().toISOString() } : {}) })
    setNotice(status === 'closed' ? `${job.name} is closed and its job post was taken down.` : `${job.name} is open.`)
  }
  const counts = stageCounts(jobId, cands)
  const tabs: [string, string][] = [
    ['dashboard', 'Job Dashboard'],
    ['candidates', 'Candidates'],
    ['setup', 'Job Setup'],
  ]
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="bg-white border-b border-[#E1E4E2] px-8 pt-4">
        <button data-agent="greenhouse-back-jobs" onClick={() => go({ page: 'jobs' })} className="text-[13px] text-[#1B7F62] font-medium flex items-center gap-1 hover:underline">
          <CaretLeft size={13} /> All Jobs
        </button>
        <div className="flex items-start gap-4 mt-2">
          <div className="flex-1 min-w-0">
            <h1 className="text-[24px] font-semibold tracking-[-0.01em] flex items-center gap-2">
              {job.name}{' '}
              <button aria-label={isStarred(job) ? 'Unfollow job' : 'Follow job'} onClick={() => db.update('greenhouse.jobs', job.id, { starred: !isStarred(job) })}>
                <Star size={18} weight={isStarred(job) ? 'fill' : 'regular'} className={isStarred(job) ? 'text-[#F0B429]' : 'text-[#C9D0CD] hover:text-[#F0B429]'} />
              </button>
              {job.status !== 'open' && <span className={`text-[12px] font-medium px-2 h-[22px] rounded flex items-center capitalize ${job.status === 'draft' ? 'bg-[#EEF1EF] text-[#3E4F49]' : 'bg-[#F3EEE6] text-[#7A5A24]'}`}>{job.status}</span>}
            </h1>
            <div className="text-[13.5px] text-[#5B6B66] mt-0.5">
              {job.reqId} · {job.department} · {job.office} · Hiring Manager: {person(job.hiringManager).name} · Recruiter: {person(job.recruiter).name}
            </div>
          </div>
          <Btn kind="primary" data-agent="greenhouse-job-add-candidate" onClick={() => setAdding(true)}><UserPlus size={16} /> Add Candidate</Btn>
          <div className="relative">
            <Btn kind="secondary" aria-label="More job actions" data-agent="greenhouse-job-more" onClick={() => setMenu((m) => !m)}><DotsThree size={18} weight="bold" /></Btn>
            {menu && (
              <>
                <div className="fixed inset-0 z-30" onMouseDown={() => setMenu(false)} />
                <div className="absolute right-0 top-10 z-40 w-56 bg-white rounded-md border border-[#E1E4E2] shadow-[0_8px_24px_rgba(21,55,44,0.14)] py-1 text-[13.5px]">
                  {[
                    ['Edit job setup', () => go({ page: 'job', jobId, tab: 'setup' })],
                    ...(job.status === 'draft' ? [['Open job', () => setStatus('open')]] : job.status === 'open' ? [['Close job', () => setStatus('closed')]] : [['Reopen job', () => setStatus('open')]]),
                    [
                      'Copy job post link',
                      () => {
                        const url = `https://boards.greenhouse.io/northwind/jobs/${job.num}`
                        navigator.clipboard?.writeText(url).catch(() => {})
                        setNotice(`Job post link copied: ${url}`)
                      },
                    ],
                    ['Job board & posts', () => go({ page: 'posts' })],
                  ].map(([l, fn]: any) => (
                    <button key={l} role="menuitem" onClick={() => (setMenu(false), fn())} className="w-full text-left px-4 h-9 hover:bg-[#F2F4F3]">
                      {l}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
        <div className="flex gap-6 mt-4">
          {tabs.map(([k, l]) => (
            <button key={k} data-agent={`greenhouse-job-tab-${k}`} onClick={() => go({ page: 'job', jobId, tab: k as any })} className={`relative pb-3 text-[14px] ${tab === k ? 'font-semibold' : 'text-[#5B6B66]'}`}>
              {l}
              {tab === k && <span className="absolute left-0 right-0 bottom-0 h-[3px] rounded-t bg-[#24A47F]" />}
            </button>
          ))}
        </div>
      </div>
      {notice && (
        <div className="mx-8 mt-4 rounded-md bg-[#E3F5EC] border border-[#BFE3D3] px-4 py-2.5 text-[13.5px] text-[#11734B] flex items-center gap-2">
          <span className="flex-1">{notice}</span>
          <button aria-label="Dismiss" onClick={() => setNotice('')}><X size={13} /></button>
        </div>
      )}
      {adding && <AddCandidateModal jobId={jobId} onClose={() => setAdding(false)} onDone={(id) => (setAdding(false), go({ page: 'candidate', candidateId: id }))} />}
      {tab === 'setup' ? (
        <JobSetup job={job} onNotice={setNotice} />
      ) : tab !== 'candidates' ? (
        <div className="flex-1 overflow-auto p-8">
          <div className="grid grid-cols-5 gap-4">
            {PIPELINE.map((s) => (
              <div key={s} className="bg-white rounded-lg border border-[#E1E4E2] p-4">
                <div className="text-[13px] text-[#5B6B66]">{STAGE_LABEL[s]}</div>
                <div className="text-[28px] font-semibold">{counts[s]}</div>
              </div>
            ))}
          </div>
          <div className="mt-6 bg-white rounded-lg border border-[#E1E4E2] p-5 text-[14px] text-[#3E4F49]">
            <div className="font-semibold mb-2">Interview plan</div>
            {(['phone_screen', 'onsite', 'offer'] as const).map((s) => (
              <div key={s} className="py-2 border-t border-[#EDEFEE]">
                <b>{STAGE_LABEL[s]}</b>: {(job.plan[s] ?? []).map((p) => `${p.name} (${p.duration} min)`).join(' · ')}
              </div>
            ))}
          </div>
          <div className="mt-6 grid grid-cols-2 gap-6">
            <Card title="Hiring Team">
              <div className="p-4 space-y-2 text-[13.5px]">
                {[...new Set([job.hiringManager, job.recruiter, job.coordinator, ...job.hiringTeam])].map((p) => (
                  <div key={p} className="flex items-center gap-2">
                    <Avatar id={p} size={26} />
                    <span className="flex-1">{pname(p)}</span>
                    <span className="text-[12px] text-[#5B6B66]">{p === job.hiringManager ? 'Hiring Manager' : p === job.recruiter ? 'Recruiter' : p === job.coordinator ? 'Coordinator' : 'Interviewer'}</span>
                  </div>
                ))}
              </div>
            </Card>
            <Card title="Recent activity">
              {all
                .flatMap((c) => c.activity.slice(0, 2).map((a) => ({ a, c })))
                .sort((x, y) => +new Date(y.a.at) - +new Date(x.a.at))
                .slice(0, 6)
                .map(({ a, c }) => (
                  <button key={a.id} onClick={() => go({ page: 'candidate', candidateId: c.id })} className="w-full text-left px-4 py-2.5 border-b border-[#EDEFEE] last:border-0 hover:bg-[#FAFBFA] text-[13px]">
                    <b>{c.name}</b> <span className="text-[#3E4F49]">· {a.text}</span>
                    <div className="text-[12px] text-[#7A8884]">{fmtActivity(a.at)}</div>
                  </button>
                ))}
              {all.length === 0 && <div className="p-4 text-[13.5px] text-[#5B6B66]">No candidates yet.</div>}
            </Card>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 px-8 py-3 relative">
            <Btn kind="secondary" data-agent="greenhouse-pipeline-filters" onClick={() => setFilterOpen((o) => !o)} className={activeFilters ? '!border-[#15372C] !bg-[#E6F4EE]' : ''}>
              <Funnel size={15} /> Filters{activeFilters ? ` (${activeFilters})` : ''}
            </Btn>
            <span className="text-[13.5px] text-[#5B6B66]">{mine.filter((c) => c.stage !== 'rejected').length} active candidates · {counts.rejected} rejected</span>
            {activeFilters > 0 && (
              <button onClick={() => setFl({ q: '', source: 'all', referrals: false, scheduled: false })} className="text-[13px] text-[#1B7F62] font-medium hover:underline">
                Clear filters
              </button>
            )}
            {filterOpen && (
              <>
                <div className="fixed inset-0 z-30" onMouseDown={() => setFilterOpen(false)} />
                <div className="absolute left-8 top-14 z-40 w-[300px] bg-white rounded-md border border-[#E1E4E2] shadow-[0_8px_24px_rgba(21,55,44,0.14)] p-4 space-y-3 text-[13.5px]">
                  <label className="block">
                    <span className="block font-medium mb-1">Candidate</span>
                    <input aria-label="Filter by candidate name" value={fl.q} onChange={(e) => setFl({ ...fl, q: e.target.value })} placeholder="Name, company or title" className={fieldCls} />
                  </label>
                  <label className="block">
                    <span className="block font-medium mb-1">Source</span>
                    <select aria-label="Filter by source" value={fl.source} onChange={(e) => setFl({ ...fl, source: e.target.value })} className={fieldCls}>
                      <option value="all">All sources</option>
                      {sources.map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={fl.referrals} onChange={(e) => setFl({ ...fl, referrals: e.target.checked })} className="w-4 h-4 accent-[#15372C]" /> Referrals only
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={fl.scheduled} onChange={(e) => setFl({ ...fl, scheduled: e.target.checked })} className="w-4 h-4 accent-[#15372C]" /> Has scheduled interviews
                  </label>
                  <div className="flex justify-end">
                    <Btn kind="primary" onClick={() => setFilterOpen(false)}>Done</Btn>
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="flex-1 min-h-0 overflow-auto px-8 pb-6">
            <div className="flex gap-4 h-full min-w-max">
              {PIPELINE.map((s) => {
                const list = mine.filter((c) => c.stage === s).sort((a, b) => +new Date(b.stageEnteredAt) - +new Date(a.stageEnteredAt))
                return (
                  <div key={s} data-agent={`greenhouse-stage-col-${s}`} className="w-[262px] shrink-0 flex flex-col bg-[#EEF1EF] rounded-lg">
                    <div className="flex items-center justify-between px-3 h-11">
                      <span className="text-[13.5px] font-semibold">{STAGE_LABEL[s]}</span>
                      <span className="text-[12px] font-semibold bg-white rounded-full px-2 h-5 flex items-center">{list.length}</span>
                    </div>
                    <div className="flex-1 overflow-auto px-2 pb-2 space-y-2">
                      {list.map((c) => {
                        const sc = c.scorecards.filter((x) => x.stage === s || s === 'onsite')
                        const ivs = interviews.filter((i) => i.candidateId === c.id && i.stage === c.stage && i.status === 'scheduled')
                        const fresh = c.updatedBy === 'hworker' && daysSince(c.stageEnteredAt) === 0
                        return (
                          <button key={c.id} data-agent={`greenhouse-card-${c.id}`} aria-label={c.name} onClick={() => go({ page: 'candidate', candidateId: c.id })} className={`w-full text-left bg-white rounded-md border border-[#E1E4E2] p-3 hover:shadow-[0_2px_8px_rgba(21,55,44,0.12)] ${fresh ? 'flash-new' : ''}`}>
                            <div className="flex items-start gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="text-[14px] font-semibold text-[#1B7F62] truncate">{c.name}</div>
                                <div className="text-[12.5px] text-[#5B6B66] truncate">{c.title}</div>
                                <div className="text-[12.5px] text-[#5B6B66] truncate">{c.company}</div>
                              </div>
                              {c.referrer && <span title="Referral" className="text-[10.5px] font-semibold text-[#8A5A00] bg-[#FFF3DC] px-1.5 rounded">REF</span>}
                            </div>
                            <div className="flex items-center gap-2 mt-2.5 text-[12px] text-[#5B6B66]">
                              <span>{daysSince(c.stageEnteredAt)}d in stage</span>
                              <span className="flex-1" />
                              {sc.slice(0, 3).map((x) => (
                                <RatingIcon key={x.id} rating={x.rating} size={13} />
                              ))}
                              {sc.length === 0 && <ChatCircle size={13} />}
                            </div>
                            {(ivs.length > 0 || fresh) && (
                              <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                                {ivs.length > 0 && <span className="text-[11.5px] font-medium text-[#11734B] bg-[#E3F5EC] rounded px-1.5 h-5 flex items-center gap-1"><ThumbsUp size={11} /> {ivs.length} scheduled</span>}
                                {fresh && <HWorkerChip text="Moved by H-Worker" />}
                              </div>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}


function JobSetup({ job, onNotice }: { job: Job; onNotice: (m: string) => void }) {
  const { isAgent } = useDesk()
  const [f, setF] = useState({ name: job.name, department: job.department, office: job.office, openings: String(job.openings), salaryRange: job.salaryRange ?? '', employmentType: job.employmentType, hiringManager: job.hiringManager, description: job.description ?? '' })
  const [addFor, setAddFor] = useState<Stage | null>(null)
  const [nf, setNf] = useState({ name: '', duration: '45', who: job.hiringManager })
  const [member, setMember] = useState('')
  const set = (k: keyof typeof f) => (e: any) => setF({ ...f, [k]: e.target.value })
  const dirty = f.name !== job.name || f.department !== job.department || f.office !== job.office || f.openings !== String(job.openings) || f.salaryRange !== (job.salaryRange ?? '') || f.employmentType !== job.employmentType || f.hiringManager !== job.hiringManager || f.description !== (job.description ?? '')
  const saveInfo = () => {
    if (!f.name.trim()) return
    db.update('greenhouse.jobs', job.id, { ...f, name: f.name.trim(), openings: Math.max(1, Number(f.openings) || 1), salaryRange: f.salaryRange.trim() || undefined, hiringTeam: job.hiringTeam.includes(f.hiringManager) ? job.hiringTeam : [...job.hiringTeam, f.hiringManager], updatedBy: isAgent ? 'hworker' : undefined })
    onNotice('Job info saved.')
  }
  const removePlan = (s: Stage, key: string) => db.update('greenhouse.jobs', job.id, (j: any) => ({ plan: { ...j.plan, [s]: (j.plan[s] ?? []).filter((p: any) => p.key !== key) } }))
  const addPlan = (s: Stage) => {
    if (!nf.name.trim()) return
    const item = newPlanItem(nf.name.trim(), Number(nf.duration) || 45, [nf.who])
    db.update('greenhouse.jobs', job.id, (j: any) => ({ plan: { ...j.plan, [s]: [...(j.plan[s] ?? []), item] } }))
    setAddFor(null)
    setNf({ name: '', duration: '45', who: job.hiringManager })
  }
  const post = postStatusOf(job)
  const sel = 'w-full h-9 rounded-md border border-[#C9D0CD] px-2 text-[13.5px] bg-white outline-none focus:border-[#15372C]'
  return (
    <div className="flex-1 overflow-auto p-8">
      <div className="grid grid-cols-[minmax(0,1fr)_380px] gap-6 max-w-[1240px]">
        <div className="space-y-6 min-w-0">
          <Card title="Job Info" action={<Btn kind="primary" disabled={!dirty} data-agent="greenhouse-job-setup-save" onClick={saveInfo}>Save</Btn>}>
            <div className="p-5 grid grid-cols-2 gap-3 text-[13.5px]">
              <label className="col-span-2"><span className="block font-medium mb-1">Job name</span><input aria-label="Job name" value={f.name} onChange={set('name')} className={sel} /></label>
              <label><span className="block font-medium mb-1">Department</span><input aria-label="Department" value={f.department} onChange={set('department')} className={sel} /></label>
              <label><span className="block font-medium mb-1">Office</span><input aria-label="Office" value={f.office} onChange={set('office')} className={sel} /></label>
              <label><span className="block font-medium mb-1">Openings</span><input aria-label="Openings" type="number" min={1} value={f.openings} onChange={set('openings')} className={sel} /></label>
              <label><span className="block font-medium mb-1">Employment type</span><select aria-label="Employment type" value={f.employmentType} onChange={set('employmentType')} className={sel}>{['Full-time', 'Part-time', 'Contract', 'Intern'].map((x) => <option key={x}>{x}</option>)}</select></label>
              <label><span className="block font-medium mb-1">Salary range</span><input aria-label="Salary range" value={f.salaryRange} onChange={set('salaryRange')} className={sel} /></label>
              <label><span className="block font-medium mb-1">Hiring manager</span><select aria-label="Hiring manager" value={f.hiringManager} onChange={set('hiringManager')} className={sel}>{INTERNAL.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
              <label className="col-span-2"><span className="block font-medium mb-1">Job description</span><textarea aria-label="Job description" value={f.description} onChange={set('description')} className="w-full h-24 rounded-md border border-[#C9D0CD] p-2.5 text-[13.5px] outline-none focus:border-[#15372C] resize-none" /></label>
            </div>
          </Card>
          <Card title="Interview Plan">
            {(['application_review', 'phone_screen', 'onsite', 'offer'] as Stage[]).map((s) => (
              <div key={s} className="border-b border-[#EDEFEE] last:border-0 px-5 py-3">
                <div className="flex items-center mb-1">
                  <span className="font-semibold text-[13.5px] flex-1">{STAGE_LABEL[s]}</span>
                  <button onClick={() => setAddFor(addFor === s ? null : s)} className="text-[13px] text-[#1B7F62] font-medium hover:underline flex items-center gap-1"><Plus size={12} /> Add interview</button>
                </div>
                {(job.plan[s] ?? []).map((p) => (
                  <div key={p.key} className="flex items-center gap-3 py-1.5 text-[13.5px]">
                    <span className="flex-1">{p.name}</span>
                    <span className="text-[#5B6B66]">{p.duration} min</span>
                    <span className="text-[#5B6B66] w-[160px] truncate">{p.interviewers.map(pname).join(', ')}</span>
                    <button aria-label={`Remove ${p.name}`} onClick={() => removePlan(s, p.key)} className="w-7 h-7 rounded hover:bg-[#FBEAEA] text-[#A3302A] flex items-center justify-center"><Trash size={14} /></button>
                  </div>
                ))}
                {!(job.plan[s] ?? []).length && <div className="text-[13px] text-[#7A8884] py-1">No interviews in this stage.</div>}
                {addFor === s && (
                  <div className="flex items-end gap-2 mt-2">
                    <label className="flex-1"><span className="block text-[12px] mb-0.5">Interview name</span><input aria-label="Interview name" value={nf.name} onChange={(e) => setNf({ ...nf, name: e.target.value })} className={sel} /></label>
                    <label className="w-[90px]"><span className="block text-[12px] mb-0.5">Minutes</span><select aria-label="Interview minutes" value={nf.duration} onChange={(e) => setNf({ ...nf, duration: e.target.value })} className={sel}>{['30', '45', '60', '90'].map((d) => <option key={d}>{d}</option>)}</select></label>
                    <label className="w-[150px]"><span className="block text-[12px] mb-0.5">Interviewer</span><select aria-label="Interviewer" value={nf.who} onChange={(e) => setNf({ ...nf, who: e.target.value })} className={sel}>{INTERNAL.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
                    <Btn kind="primary" onClick={() => addPlan(s)}>Add</Btn>
                  </div>
                )}
              </div>
            ))}
          </Card>
        </div>
        <div className="space-y-6">
          <Card title="Job Post">
            <div className="p-5 text-[13.5px] space-y-3">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${post === 'live' ? 'bg-[#24A47F]' : 'bg-[#A7B1AD]'}`} />
                <span className="flex-1 font-medium">{post === 'live' ? 'Live on Northwind Careers' : 'Not posted'}</span>
                <Btn disabled={job.status !== 'open'} onClick={() => db.update('greenhouse.jobs', job.id, { postStatus: post === 'live' ? 'offline' : 'live' })}>{post === 'live' ? 'Take Down' : 'Publish'}</Btn>
              </div>
              {job.status !== 'open' && <div className="text-[12.5px] text-[#5B6B66]">Open the job to publish a post.</div>}
              <div className="text-[12.5px] text-[#5B6B66] break-all">boards.greenhouse.io/northwind/jobs/{job.num}</div>
            </div>
          </Card>
          <Card title="Hiring Team">
            <div className="p-5 space-y-2 text-[13.5px]">
              {job.hiringTeam.map((p) => (
                <div key={p} className="flex items-center gap-2">
                  <Avatar id={p} size={24} />
                  <span className="flex-1">{pname(p)}</span>
                  {p !== job.hiringManager && <button aria-label={`Remove ${pname(p)}`} onClick={() => db.update('greenhouse.jobs', job.id, { hiringTeam: job.hiringTeam.filter((x) => x !== p) })} className="text-[#7A8884] hover:text-[#A3302A]"><X size={13} /></button>}
                </div>
              ))}
              <div className="flex gap-2 pt-2">
                <select aria-label="Add hiring team member" value={member} onChange={(e) => setMember(e.target.value)} className={sel}>
                  <option value="">Add a team member…</option>
                  {INTERNAL.filter((p) => !job.hiringTeam.includes(p.id)).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <Btn disabled={!member} onClick={() => (db.update('greenhouse.jobs', job.id, { hiringTeam: [...job.hiringTeam, member] }), setMember(''))}>Add</Btn>
              </div>
            </div>
          </Card>
          <Card title="Status">
            <div className="p-5 text-[13.5px] space-y-2">
              <div className="flex justify-between"><span className="text-[#5B6B66]">Status</span><span className="capitalize font-medium">{job.status}</span></div>
              <div className="flex justify-between"><span className="text-[#5B6B66]">Openings filled</span><span>{job.filled}/{job.openings}</span></div>
              <div className="flex justify-between"><span className="text-[#5B6B66]">Requisition</span><span>{job.reqId}</span></div>
              <div className="pt-2 flex gap-2">
                {job.status !== 'open' ? (
                  <Btn kind="primary" onClick={() => (db.update('greenhouse.jobs', job.id, { status: 'open', closedAt: undefined, openedAt: job.status === 'draft' ? new Date().toISOString() : job.openedAt }), onNotice(`${job.name} is open.`))}>{job.status === 'draft' ? 'Open Job' : 'Reopen Job'}</Btn>
                ) : (
                  <Btn kind="danger" onClick={() => (db.update('greenhouse.jobs', job.id, { status: 'closed', closedAt: new Date().toISOString(), postStatus: 'offline' }), onNotice(`${job.name} is closed.`))}>Close Job</Btn>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
