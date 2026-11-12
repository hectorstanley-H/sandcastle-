import type { Rec } from '@/db/db'

export type Stage = 'application_review' | 'phone_screen' | 'onsite' | 'offer' | 'hired' | 'rejected'
export type Rating = 'strong_yes' | 'yes' | 'mixed' | 'no' | 'strong_no'
export type LocationKind = 'zoom' | 'teams' | 'onsite-boston'

export const PIPELINE: Exclude<Stage, 'rejected'>[] = ['application_review', 'phone_screen', 'onsite', 'offer', 'hired']

export const STAGE_LABEL: Record<Stage, string> = {
  application_review: 'Application Review',
  phone_screen: 'Phone Screen',
  onsite: 'Onsite',
  offer: 'Offer',
  hired: 'Hired',
  rejected: 'Rejected',
}

export interface PlanInterview {
  key: string
  name: string
  duration: number
  /** suggested interviewer person ids */
  interviewers: string[]
}

export interface Job extends Rec {
  num: number
  reqId: string
  name: string
  department: string
  office: string
  openings: number
  filled: number
  hiringManager: string
  recruiter: string
  coordinator: string
  status: 'open' | 'draft' | 'closed'
  openedAt: string
  closedAt?: string
  employmentType: string
  salaryRange?: string
  /** interviews per stage */
  plan: Partial<Record<Stage, PlanInterview[]>>
  hiringTeam: string[]
  /** job board post status (defaults to live for open jobs) */
  postStatus?: 'live' | 'offline'
  /** followed / starred by the current user (defaults to "I'm the hiring manager") */
  starred?: boolean
  description?: string
}

export interface Scorecard {
  id: string
  interviewer: string
  stage: Stage
  interview: string
  planKey?: string
  rating: Rating
  submittedAt: string
  notes: string
  attributes: { name: string; category: string; rating: Rating }[]
}

export interface Activity {
  id: string
  at: string
  kind: 'applied' | 'stage' | 'note' | 'email' | 'interview' | 'scorecard' | 'reject' | 'offer' | 'hired'
  text: string
  /** person id of the actor, or 'system' */
  by: string
  body?: string
  createdBy?: string
}

export interface Candidate extends Rec {
  num: number
  appNum: number
  name: string
  email: string
  phone: string
  company: string
  title: string
  location: string
  source: string
  referrer?: string
  jobId: string
  stage: Stage
  rejectedFrom?: Stage
  rejectReason?: string
  appliedAt: string
  stageEnteredAt: string
  lastActivity: string
  tags: string[]
  recruiter: string
  coordinator: string
  scorecards: Scorecard[]
  activity: Activity[]
  resumeSummary: string
  experience: { title: string; company: string; years: string }[]
  education: string
  linkedin: string
  offer?: {
    salary: string
    startDate: string
    status: 'draft' | 'pending_approval' | 'approved' | 'sent' | 'accepted' | 'declined'
    approvers: string[]
    /** approvers who have signed off (in order) */
    approvedBy?: string[]
    bonus?: string
    equity?: string
    sentAt?: string
    createdAt?: string
  }
  updatedBy?: string
}

export interface Interview extends Rec {
  candidateId: string
  jobId: string
  stage: Stage
  planKey?: string
  name: string
  start: string
  end: string
  durationMin: number
  interviewers: string[]
  location: LocationKind
  status: 'scheduled' | 'completed' | 'cancelled'
  createdAt: string
  createdBy?: string
  eventId?: string
}
