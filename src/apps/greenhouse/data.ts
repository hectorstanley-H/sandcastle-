import type { Candidate, Interview, Job, PlanInterview, Scorecard } from './types'
import { PIPELINE } from './types'

export interface PlanItem {
  plan: PlanInterview
  interview?: Interview
  scorecards: Scorecard[]
}

export function planFor(c: Candidate, job: Job | undefined, interviews: Interview[], stage = c.stage): PlanItem[] {
  const items = job?.plan[stage] ?? []
  return items.map((p) => {
    const iv = interviews
      .filter((i) => i.candidateId === c.id && i.stage === stage && i.planKey === p.key && i.status !== 'cancelled')
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))[0]
    return { plan: p, interview: iv, scorecards: c.scorecards.filter((s) => s.stage === stage && s.planKey === p.key) }
  })
}

export function stageCounts(jobId: string, cands: Candidate[]) {
  const m: Record<string, number> = { application_review: 0, phone_screen: 0, onsite: 0, offer: 0, hired: 0, rejected: 0 }
  for (const c of cands) if (c.jobId === jobId) m[c.stage]++
  return m
}

export const activeCount = (jobId: string, cands: Candidate[]) =>
  cands.filter((c) => c.jobId === jobId && c.stage !== 'rejected' && c.stage !== 'hired').length

/** Candidates on my jobs with interviews still to schedule in their current stage. */
export function toSchedule(me: string, jobs: Job[], cands: Candidate[], interviews: Interview[]) {
  const mine = new Set(jobs.filter((j) => j.hiringManager === me && j.status === 'open').map((j) => j.id))
  return cands
    .filter((c) => mine.has(c.jobId) && (c.stage === 'phone_screen' || c.stage === 'onsite'))
    .map((c) => ({ c, open: planFor(c, jobs.find((j) => j.id === c.jobId), interviews).filter((p) => !p.interview) }))
    .filter((x) => x.open.length > 0)
}

export function scorecardsDue(me: string, cands: Candidate[], interviews: Interview[]) {
  const now = Date.now()
  return interviews.filter((i) => {
    if (!i.interviewers.includes(me) || +new Date(i.end) > now || i.status === 'cancelled') return false
    const c = cands.find((x) => x.id === i.candidateId)
    return c && !c.scorecards.some((s) => s.interviewer === me && s.planKey === i.planKey && s.stage === i.stage)
  })
}

export const stageIndex = (s: string) => PIPELINE.indexOf(s as any)
