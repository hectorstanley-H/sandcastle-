import { Fragment, useState } from 'react'
import { CaretLeft, EnvelopeSimple, Phone, MapPin, LinkedinLogo, CalendarPlus, ArrowRight, X, Check, FilePdf, VideoCamera, Tag, Clock } from '@phosphor-icons/react'
import { db, uid, useCollection, useRecord } from '@/db/db'
import { useDesk } from '@/os/context'
import { ME, PEOPLE, person } from '@/data/people'
import { isoDate } from '@/data/time'
import { Avatar } from '@/components/Avatar'
import type { Candidate, Interview, Job, Stage } from './types'
import { PIPELINE, STAGE_LABEL } from './types'
import { Btn, Card, fmtActivity, fmtDay, fmtWhen, type Go, HWorkerChip, LOCATION_LABEL, pname, RATING_LABEL, RatingIcon, StagePill } from './shared'
import { planFor, stageIndex } from './data'

const TIMES = Array.from({ length: 21 }, (_, i) => {
  const h = 8 + Math.floor(i / 2)
  const m = i % 2 ? 30 : 0
  return { v: `${String(h).padStart(2, '0')}:${m ? '30' : '00'}`, l: new Date(2000, 0, 1, h, m).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) }
})
const INTERNAL = PEOPLE.filter((p) => !p.external && p.id !== 'jordan')

export function CandidateProfile({ candidateId, go }: { candidateId: string; go: Go }) {
  const { isAgent } = useDesk()
  const c = useRecord<Candidate>('greenhouse.candidates', candidateId)
  const jobs = useCollection<Job>('greenhouse.jobs')
  const interviews = useCollection<Interview>('greenhouse.interviews')
  const [tab, setTab] = useState<'activity' | 'details' | 'scorecards'>('activity')
  const [moveOpen, setMoveOpen] = useState(false)
  const [moveTo, setMoveTo] = useState<Stage | null>(null)
  const [sched, setSched] = useState(false)
  if (!c) return <div className="p-10">Candidate not found.</div>
  const job = jobs.find((j) => j.id === c.jobId)
  const plan = planFor(c, job, interviews)
  const actor = isAgent ? 'alex' : ME.id

  const doMove = () => {
    if (!moveTo) return
    const now = new Date().toISOString()
    db.update('greenhouse.candidates', c.id, (r: any) => ({
      stage: moveTo,
      stageEnteredAt: now,
      lastActivity: now,
      updatedBy: isAgent ? 'hworker' : undefined,
      activity: [{ id: uid('act'), at: now, kind: 'stage', by: actor, text: `Moved from ${STAGE_LABEL[c.stage]} to ${STAGE_LABEL[moveTo]}`, createdBy: isAgent ? 'hworker' : undefined }, ...r.activity],
    }))
    setMoveOpen(false)
    setMoveTo(null)
  }

  return (
    <div className="flex-1 min-h-0 overflow-auto relative">
      <div className="bg-white border-b border-[#E1E4E2]">
        <div className="max-w-[1320px] mx-auto px-8 pt-4 pb-5">
          <button data-agent="greenhouse-back-to-job" onClick={() => go({ page: 'job', jobId: c.jobId, tab: 'candidates' })} className="text-[13px] text-[#1B7F62] font-medium flex items-center gap-1 hover:underline">
            <CaretLeft size={13} /> {job?.name}
          </button>
          <div className="flex items-start gap-5 mt-3">
            <span className="w-16 h-16 rounded-full bg-[#DDEFE7] text-[#15372C] text-[22px] font-semibold flex items-center justify-center shrink-0">
              {c.name.split(' ').map((x) => x[0]).join('')}
            </span>
            <div className="flex-1 min-w-0">
              <h1 className="text-[26px] font-semibold tracking-[-0.01em] flex items-center gap-2">
                {c.name}
                {c.updatedBy === 'hworker' && <HWorkerChip text="Updated by H-Worker" />}
              </h1>
              <div className="text-[14px] text-[#3E4F49]">{c.title} at {c.company}</div>
              <div className="flex items-center gap-4 mt-2 text-[13px] text-[#5B6B66] flex-wrap">
                <span className="flex items-center gap-1"><MapPin size={14} /> {c.location}</span>
                <span className="flex items-center gap-1 text-[#1B7F62]"><EnvelopeSimple size={14} /> {c.email}</span>
                <span className="flex items-center gap-1"><Phone size={14} /> {c.phone}</span>
                <span className="flex items-center gap-1 text-[#1B7F62]"><LinkedinLogo size={14} /> LinkedIn</span>
                {c.tags.map((t) => <span key={t} className="flex items-center gap-1 h-5 px-1.5 rounded bg-[#EEF1EF] text-[12px] text-[#3E4F49]"><Tag size={11} /> {t}</span>)}
              </div>
            </div>
            <div className="flex gap-2 relative">
              <Btn data-agent="greenhouse-send-email"><EnvelopeSimple size={15} /> Send Email</Btn>
              <Btn data-agent="greenhouse-schedule-interview" aria-label="Schedule Interview" onClick={() => setSched(true)}><CalendarPlus size={15} /> Schedule Interview</Btn>
              <Btn kind="primary" data-agent="greenhouse-move-stage" aria-label="Move Stage" onClick={() => setMoveOpen(true)}>Move Stage <ArrowRight size={15} /></Btn>
              <Btn kind="danger">Reject</Btn>
            </div>
          </div>
          {/* stage bar */}
          <div className="mt-5 flex items-center gap-1">
            {PIPELINE.map((s, i) => {
              const cur = c.stage === s
              const past = stageIndex(c.stage) > i
              return (
                <div key={s} className={`flex-1 h-9 flex items-center justify-center text-[12.5px] font-medium ${i === 0 ? 'rounded-l-md' : ''} ${i === PIPELINE.length - 1 ? 'rounded-r-md' : ''} ${cur ? 'bg-[#15372C] text-white' : past ? 'bg-[#BFE3D3] text-[#15372C]' : 'bg-[#EEF1EF] text-[#5B6B66]'}`} style={{ clipPath: i < PIPELINE.length - 1 ? 'polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%, 10px 50%)' : 'polygon(0 0,100% 0,100% 100%,0 100%,10px 50%)' }}>
                  {past && <Check size={13} className="mr-1" />} {STAGE_LABEL[s]}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="max-w-[1320px] mx-auto px-8 py-6 grid grid-cols-[minmax(0,1fr)_380px] gap-6">
        <div className="min-w-0">
          <div className="flex gap-6 border-b border-[#E1E4E2] mb-4">
            {(['activity', 'details', 'scorecards'] as const).map((t) => (
              <button key={t} data-agent={`greenhouse-tab-${t}`} onClick={() => setTab(t)} className={`relative pb-2.5 text-[14px] capitalize ${tab === t ? 'font-semibold' : 'text-[#5B6B66]'}`}>
                {t === 'activity' ? 'Activity Feed' : t === 'scorecards' ? `Scorecards (${c.scorecards.length})` : 'Details'}
                {tab === t && <span className="absolute left-0 right-0 bottom-0 h-[3px] rounded-t bg-[#24A47F]" />}
              </button>
            ))}
          </div>
          {tab === 'activity' && (
            <Card>
              <div className="p-4 border-b border-[#EDEFEE]">
                <textarea aria-label="Add a note" placeholder="Add a note… use @ to mention a colleague" className="w-full h-16 rounded-md border border-[#C9D0CD] p-2.5 text-[13.5px] outline-none resize-none" />
              </div>
              {c.activity.map((a) => (
                <div key={a.id} className={`flex gap-3 px-5 py-3.5 border-b border-[#EDEFEE] last:border-0 ${a.createdBy === 'hworker' && Date.now() - +new Date(a.at) < 120000 ? 'flash-new' : ''}`}>
                  {a.by === 'system' ? <span className="w-8 h-8 rounded-full bg-[#E6F4EE] flex items-center justify-center shrink-0"><Clock size={15} /></span> : <Avatar id={a.by} size={32} />}
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px]"><b>{pname(a.by)}</b> {a.text.charAt(0).toLowerCase() + a.text.slice(1)} {a.createdBy === 'hworker' && <HWorkerChip />}</div>
                    {a.body && <div className="text-[13px] text-[#3E4F49] mt-1 whitespace-pre-wrap">{RATING_LABEL[a.body as keyof typeof RATING_LABEL] ?? a.body}</div>}
                    <div className="text-[12px] text-[#7A8884] mt-1">{fmtActivity(a.at)}</div>
                  </div>
                </div>
              ))}
            </Card>
          )}
          {tab === 'scorecards' && (
            <div className="space-y-4">
              {c.scorecards.length === 0 && <Card><div className="p-6 text-[13.5px] text-[#5B6B66]">No scorecards submitted yet.</div></Card>}
              {c.scorecards.map((s) => (
                <Card key={s.id}>
                  <div className="p-5">
                    <div className="flex items-center gap-3">
                      <Avatar id={s.interviewer} size={34} />
                      <div className="flex-1">
                        <div className="text-[14px] font-semibold">{person(s.interviewer).name} · {s.interview}</div>
                        <div className="text-[12.5px] text-[#5B6B66]">{STAGE_LABEL[s.stage]} · Submitted {fmtDay(s.submittedAt)}</div>
                      </div>
                      <span className="flex items-center gap-2 text-[13.5px] font-semibold"><RatingIcon rating={s.rating} size={18} /> {RATING_LABEL[s.rating]}</span>
                    </div>
                    <div className="text-[12.5px] font-semibold text-[#5B6B66] mt-4 mb-1 uppercase tracking-wide">Key take-aways</div>
                    <div className="text-[13.5px] leading-relaxed text-[#15372C]">{s.notes}</div>
                    {s.attributes.length > 0 && (
                      <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1.5">
                        {s.attributes.map((at) => (
                          <div key={at.name} className="flex items-center gap-2 text-[13px]"><RatingIcon rating={at.rating} size={13} /> {at.name} <span className="text-[#7A8884] text-[12px]">· {at.category}</span></div>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
          {tab === 'details' && (
            <Card>
              <div className="p-5 grid grid-cols-[180px_1fr] gap-y-3 text-[13.5px]">
                {[['Source', c.source + (c.referrer ? ` (referred by ${person(c.referrer).name})` : '')], ['Recruiter', pname(c.recruiter)], ['Coordinator', pname(c.coordinator)], ['Applied', fmtDay(c.appliedAt)], ['Education', c.education], ['Experience', c.experience.map((e) => `${e.title}, ${e.company} (${e.years})`).join(' · ')]].map(([k, v]) => (
                  <Fragment key={k}><div className="text-[#5B6B66]">{k}</div><div>{v}</div></Fragment>
                ))}
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-5">
          <Card title={`Interview Plan · ${STAGE_LABEL[c.stage]}`}>
            {plan.length === 0 && <div className="px-5 py-4 text-[13.5px] text-[#5B6B66]">No interviews in this stage.</div>}
            {plan.map((p) => (
              <div key={p.plan.key} data-agent={`greenhouse-plan-${p.plan.key}`} className={`px-5 py-3 border-b border-[#EDEFEE] last:border-0 ${p.interview?.createdBy === 'hworker' && Date.now() - +new Date(p.interview.createdAt) < 120000 ? 'flash-new' : ''}`}>
                <div className="flex items-center gap-2">
                  <span className="text-[13.5px] font-semibold flex-1">{p.plan.name}</span>
                  {p.scorecards[0] ? <RatingIcon rating={p.scorecards[0].rating} size={15} /> : null}
                </div>
                <div className="text-[12.5px] mt-0.5">
                  {p.interview ? (
                    <span className="text-[#11734B] font-medium flex items-center gap-1.5 flex-wrap">
                      Scheduled for {fmtWhen(p.interview.start)} {p.interview.createdBy === 'hworker' && <HWorkerChip />}
                    </span>
                  ) : p.scorecards.length ? (
                    <span className="text-[#5B6B66]">Completed · {p.scorecards.length} scorecard{p.scorecards.length > 1 ? 's' : ''}</span>
                  ) : (
                    <button onClick={() => setSched(true)} className="text-[#C27C0E] font-medium hover:underline">To be scheduled</button>
                  )}
                </div>
                {p.interview && <div className="text-[12px] text-[#5B6B66] mt-0.5">{p.interview.interviewers.map(pname).join(', ')} · {LOCATION_LABEL[p.interview.location]}</div>}
              </div>
            ))}
          </Card>
          <Card title="Application">
            <div className="p-5 text-[13.5px] space-y-2">
              <div className="flex justify-between"><span className="text-[#5B6B66]">Job</span><span className="font-medium text-right">{job?.name}</span></div>
              <div className="flex justify-between"><span className="text-[#5B6B66]">Stage</span><StagePill stage={c.stage} /></div>
              <div className="flex justify-between"><span className="text-[#5B6B66]">Hiring manager</span><span>{job ? pname(job.hiringManager) : ''}</span></div>
            </div>
          </Card>
          <Card title="Resume">
            <div className="p-5">
              <div className="flex items-center gap-3 p-3 rounded-md border border-[#E1E4E2]">
                <FilePdf size={28} className="text-[#C9302C]" />
                <div className="text-[13.5px]"><div className="font-medium">{c.name.replace(' ', '_')}_Resume.pdf</div><div className="text-[12px] text-[#5B6B66]">Uploaded {fmtDay(c.appliedAt)}</div></div>
              </div>
              <div className="text-[13px] text-[#3E4F49] mt-3 leading-relaxed">{c.resumeSummary}</div>
            </div>
          </Card>
        </div>
      </div>

      {moveOpen && (
        <div className="absolute inset-0 z-30 bg-[#15372C]/30 flex items-start justify-center pt-24">
          <div className="w-[480px] bg-white rounded-lg shadow-[0_16px_40px_rgba(21,55,44,0.3)]" data-agent="greenhouse-move-modal">
            <div className="flex items-center justify-between px-5 h-14 border-b border-[#EDEFEE]">
              <div className="text-[16px] font-semibold">Move {c.name} to stage</div>
              <button aria-label="Close" onClick={() => setMoveOpen(false)} className="w-8 h-8 rounded hover:bg-[#F2F4F3] flex items-center justify-center"><X size={16} /></button>
            </div>
            <div className="p-3">
              {PIPELINE.filter((s) => s !== c.stage).map((s) => (
                <button key={s} data-agent={`greenhouse-stage-option-${s}`} aria-label={STAGE_LABEL[s]} onClick={() => setMoveTo(s)} className={`w-full flex items-center gap-3 px-3 h-11 rounded-md text-left text-[14px] ${moveTo === s ? 'bg-[#E6F4EE] font-semibold' : 'hover:bg-[#F7F8F7]'}`}>
                  <span className={`w-4 h-4 rounded-full border-2 ${moveTo === s ? 'border-[#15372C] bg-[#15372C] shadow-[inset_0_0_0_2px_#fff]' : 'border-[#C9D0CD]'}`} />
                  {STAGE_LABEL[s]}
                  {s === 'onsite' && job?.plan.onsite && <span className="ml-auto text-[12px] text-[#5B6B66]">{job.plan.onsite.length} interviews</span>}
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-[#EDEFEE]">
              <Btn onClick={() => setMoveOpen(false)}>Cancel</Btn>
              <Btn kind="primary" data-agent="greenhouse-move-confirm" aria-label="Move Stage" disabled={!moveTo} onClick={doMove}>Move Stage</Btn>
            </div>
          </div>
        </div>
      )}
      {sched && <ScheduleModal c={c} job={job} onClose={() => setSched(false)} />}
    </div>
  )
}

function ScheduleModal({ c, job, onClose }: { c: Candidate; job?: Job; onClose: () => void }) {
  const { isAgent } = useDesk()
  const items = job?.plan[c.stage] ?? []
  const interviews = useCollection<Interview>('greenhouse.interviews')
  const open = items.filter((p) => !interviews.some((i) => i.candidateId === c.id && i.planKey === p.key && i.stage === c.stage && i.status === 'scheduled'))
  const first = open[0] ?? items[0]
  const tomorrow = new Date(Date.now() + 2 * 864e5)
  const [key, setKey] = useState(first?.key ?? '')
  const [date, setDate] = useState(isoDate(tomorrow))
  const [time, setTime] = useState('10:00')
  const [dur, setDur] = useState(String(first?.duration ?? 60))
  const [who, setWho] = useState<string[]>(first?.interviewers ?? [])
  const [loc, setLoc] = useState('onsite-boston')
  const pick = (k: string) => {
    setKey(k)
    const p = items.find((x) => x.key === k)
    if (p) {
      setDur(String(p.duration))
      setWho(p.interviewers)
    }
  }
  const save = () => {
    const p = items.find((x) => x.key === key)
    const [y, m, d] = date.split('-').map(Number)
    const [hh, mm] = time.split(':').map(Number)
    const start = new Date(y, m - 1, d, hh, mm)
    const end = new Date(start.getTime() + Number(dur) * 60000)
    const now = new Date().toISOString()
    const name = p?.name ?? 'Interview'
    const evId = uid('ev')
    db.insert('outlook.events', {
      id: evId,
      title: `Interview: ${c.name} — ${name}`,
      start: start.toISOString(),
      end: end.toISOString(),
      location: LOCATION_LABEL[loc],
      organizer: ME.email,
      attendees: [...who.map((w) => person(w).email), c.email],
      teams: loc === 'teams',
      category: isAgent ? 'HWorker' : 'Green',
      body: `${c.name} · ${job?.name}\nStage: ${STAGE_LABEL[c.stage]}\nGreenhouse interview kit: https://app.greenhouse.io/guides/${c.appNum}`,
      showAs: 'busy',
      createdBy: isAgent ? 'hworker' : undefined,
    })
    db.insert('greenhouse.interviews', { id: uid('gh-iv'), candidateId: c.id, jobId: c.jobId, stage: c.stage, planKey: key, name, start: start.toISOString(), end: end.toISOString(), durationMin: Number(dur), interviewers: who, location: loc, status: 'scheduled', createdAt: now, createdBy: isAgent ? 'hworker' : undefined, eventId: evId })
    db.update('greenhouse.candidates', c.id, (r: any) => ({
      lastActivity: now,
      activity: [{ id: uid('act'), at: now, kind: 'interview', by: 'alex', text: `Scheduled ${name} for ${fmtWhen(start.toISOString())}`, body: `Interviewers: ${who.map(pname).join(', ')} · ${LOCATION_LABEL[loc]}`, createdBy: isAgent ? 'hworker' : undefined }, ...r.activity],
    }))
    onClose()
  }
  const sel = 'w-full h-9 rounded-md border border-[#C9D0CD] px-2 text-[13.5px] bg-white outline-none focus:border-[#15372C]'
  return (
    <div className="absolute inset-0 z-30 bg-[#15372C]/30 flex items-start justify-center pt-10">
      <div className="w-[640px] max-h-[calc(100%-60px)] overflow-auto bg-white rounded-lg shadow-[0_16px_40px_rgba(21,55,44,0.3)]" data-agent="greenhouse-schedule-modal">
        <div className="flex items-center justify-between px-6 h-14 border-b border-[#EDEFEE]">
          <div className="text-[16px] font-semibold">Schedule Interview · {c.name}</div>
          <button aria-label="Close" onClick={onClose} className="w-8 h-8 rounded hover:bg-[#F2F4F3] flex items-center justify-center"><X size={16} /></button>
        </div>
        <div className="p-6 space-y-4 text-[13.5px]">
          <label className="block">
            <span className="block font-medium mb-1">Interview</span>
            <select data-agent="greenhouse-interview-name" aria-label="Interview" value={key} onChange={(e) => pick(e.target.value)} className={sel}>
              {items.map((p) => <option key={p.key} value={p.key}>{p.name} ({p.duration} min)</option>)}
            </select>
          </label>
          <div className="grid grid-cols-3 gap-3">
            <label><span className="block font-medium mb-1">Date</span><input type="date" data-agent="greenhouse-interview-date" aria-label="Date" value={date} onChange={(e) => setDate(e.target.value)} className={sel} /></label>
            <label><span className="block font-medium mb-1">Start time</span><select data-agent="greenhouse-interview-time" aria-label="Start time" value={time} onChange={(e) => setTime(e.target.value)} className={sel}>{TIMES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}</select></label>
            <label><span className="block font-medium mb-1">Duration</span><select data-agent="greenhouse-interview-duration" aria-label="Duration" value={dur} onChange={(e) => setDur(e.target.value)} className={sel}>{['30', '45', '60', '90', '120', '180', '240'].map((d) => <option key={d} value={d}>{d} min</option>)}</select></label>
          </div>
          <div>
            <span className="block font-medium mb-1">Interviewers</span>
            <div className="grid grid-cols-2 gap-1.5 max-h-[188px] overflow-auto rounded-md border border-[#E1E4E2] p-2">
              {INTERNAL.map((p) => {
                const on = who.includes(p.id)
                return (
                  <button key={p.id} role="checkbox" aria-checked={on} data-agent={`greenhouse-interviewer-${p.id}`} aria-label={p.name} onClick={() => setWho((w) => (on ? w.filter((x) => x !== p.id) : [...w, p.id]))} className={`flex items-center gap-2 px-2 h-9 rounded text-left ${on ? 'bg-[#E6F4EE]' : 'hover:bg-[#F7F8F7]'}`}>
                    <span className={`w-4 h-4 rounded border flex items-center justify-center ${on ? 'bg-[#15372C] border-[#15372C] text-white' : 'border-[#A9B4B0]'}`}>{on && <Check size={11} weight="bold" />}</span>
                    <Avatar id={p.id} size={22} />
                    <span className="truncate">{p.name}</span>
                  </button>
                )
              })}
            </div>
          </div>
          <label className="block">
            <span className="block font-medium mb-1">Location / video conferencing</span>
            <select data-agent="greenhouse-interview-location" aria-label="Location" value={loc} onChange={(e) => setLoc(e.target.value)} className={sel}>
              <option value="onsite-boston">Onsite — Boston HQ, 1 Federal St</option>
              <option value="zoom">Zoom</option>
              <option value="teams">Microsoft Teams</option>
            </select>
          </label>
          <div className="flex items-center gap-2 rounded-md bg-[#F7F8F7] px-3 py-2.5 text-[12.5px] text-[#5B6B66]"><VideoCamera size={15} /> Calendar invites go to interviewers and {c.name.split(' ')[0]} from Alex Morgan’s Outlook calendar.</div>
        </div>
        <div className="flex justify-end gap-2 px-6 py-3 border-t border-[#EDEFEE]">
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn kind="primary" data-agent="greenhouse-interview-send" aria-label="Schedule" disabled={!who.length} onClick={save}>Schedule &amp; Send Invites</Btn>
        </div>
      </div>
    </div>
  )
}
