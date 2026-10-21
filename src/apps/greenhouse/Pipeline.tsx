import { useMemo } from 'react'
import { CaretLeft, Funnel, Star, UserPlus, DotsThree, ThumbsUp, ChatCircle } from '@phosphor-icons/react'
import { useCollection, useRecord } from '@/db/db'
import { person } from '@/data/people'
import type { Candidate, Interview, Job } from './types'
import { PIPELINE, STAGE_LABEL } from './types'
import { Btn, daysSince, type Go, HWorkerChip, RatingIcon } from './shared'
import { stageCounts } from './data'

export function JobPipeline({ jobId, tab, go }: { jobId: string; tab: string; go: Go }) {
  const job = useRecord<Job>('greenhouse.jobs', jobId)
  const cands = useCollection<Candidate>('greenhouse.candidates')
  const interviews = useCollection<Interview>('greenhouse.interviews')
  const mine = useMemo(() => cands.filter((c) => c.jobId === jobId), [cands, jobId])
  if (!job) return <div className="p-10">Job not found.</div>
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
              {job.name} <Star size={18} className="text-[#C9D0CD]" />
            </h1>
            <div className="text-[13.5px] text-[#5B6B66] mt-0.5">
              {job.reqId} · {job.department} · {job.office} · Hiring Manager: {person(job.hiringManager).name} · Recruiter: {person(job.recruiter).name}
            </div>
          </div>
          <Btn kind="primary"><UserPlus size={16} /> Add Candidate</Btn>
          <Btn kind="secondary"><DotsThree size={18} weight="bold" /></Btn>
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
      {tab !== 'candidates' ? (
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
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 px-8 py-3">
            <Btn kind="secondary"><Funnel size={15} /> Filters</Btn>
            <span className="text-[13.5px] text-[#5B6B66]">{mine.filter((c) => c.stage !== 'rejected').length} active candidates · {counts.rejected} rejected</span>
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

