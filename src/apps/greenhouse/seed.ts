/**
 * Greenhouse Recruiting seed.
 *
 * greenhouse.jobs:       Job (see ./types.ts) — id, num, reqId, name, department, office, openings, filled, hiringManager,
 *                        recruiter, coordinator, status 'open'|'draft'|'closed', openedAt, plan: { [stage]: PlanInterview[] }
 * greenhouse.candidates: Candidate — id, name, email, phone, company, title, location, source, jobId, stage, appliedAt,
 *                        stageEnteredAt, lastActivity, tags, recruiter, coordinator, scorecards[], activity[], resumeSummary
 * greenhouse.interviews: Interview — id, candidateId, jobId, stage, planKey, name, start, end, durationMin,
 *                        interviewers: personId[], location 'zoom'|'teams'|'onsite-boston', status, createdBy?
 */
import type { Collections } from '@/db/db'
import { daysAgo, daysFromNow, businessDays } from '@/data/time'
import type { Activity, Candidate, Interview, Job, PlanInterview, Rating, Scorecard, Stage } from './types'
import { PIPELINE } from './types'

// ── jobs ──────────────────────────────────────────────────────────────
const screens = (recruiter: string, hm: string): PlanInterview[] => [
  { key: 'recruiter-screen', name: 'Recruiter Phone Screen', duration: 30, interviewers: [recruiter] },
  { key: 'hm-screen', name: 'Hiring Manager Screen', duration: 45, interviewers: [hm] },
]

interface JobSpec {
  id: string
  reqId: string
  name: string
  department: string
  office: string
  openings: number
  filled?: number
  hm: string
  status: Job['status']
  opened: number
  closed?: number
  salary: string
  onsite: PlanInterview[]
  team: string[]
}

const JOBS: JobSpec[] = [
  {
    id: 'gh-job-ops-manager', reqId: 'OPS-1057', name: 'Senior Operations Manager — Fulfillment', department: 'Operations', office: 'Boston, MA', openings: 1, hm: 'alex', status: 'open', opened: 34, salary: '$135,000 – $160,000',
    onsite: [
      { key: 'onsite-panel', name: 'Onsite — Operations Panel', duration: 90, interviewers: ['priya', 'ben', 'maya'] },
      { key: 'case-study', name: 'Case Study Presentation', duration: 60, interviewers: ['alex', 'priya'] },
      { key: 'values', name: 'Values & Collaboration', duration: 45, interviewers: ['james', 'sofia'] },
    ],
    team: ['alex', 'priya', 'james', 'ben', 'maya', 'sofia'],
  },
  {
    id: 'gh-job-ops-analyst', reqId: 'OPS-1042', name: 'Operations Analyst', department: 'Operations', office: 'Boston, MA', openings: 1, filled: 1, hm: 'alex', status: 'closed', opened: 71, closed: 12, salary: '$78,000 – $92,000',
    onsite: [
      { key: 'onsite-panel', name: 'Onsite — Analytics Panel', duration: 90, interviewers: ['ben', 'maya', 'sofia'] },
      { key: 'excel-exercise', name: 'Excel & SQL Exercise', duration: 60, interviewers: ['ben'] },
    ],
    team: ['alex', 'james', 'ben', 'maya', 'sofia'],
  },
  {
    id: 'gh-job-ops-coordinator', reqId: 'OPS-1061', name: 'Operations Coordinator', department: 'Operations', office: 'Chicago, IL', openings: 2, hm: 'alex', status: 'open', opened: 22, salary: '$58,000 – $68,000',
    onsite: [
      { key: 'onsite-panel', name: 'Onsite — Team Interview', duration: 60, interviewers: ['maya', 'ben'] },
      { key: 'hm-final', name: 'Hiring Manager Final', duration: 45, interviewers: ['alex'] },
    ],
    team: ['alex', 'james', 'maya', 'ben'],
  },
  {
    id: 'gh-job-supply-chain', reqId: 'OPS-1064', name: 'Supply Chain Analyst', department: 'Operations', office: 'Chicago, IL', openings: 1, hm: 'priya', status: 'open', opened: 15, salary: '$82,000 – $98,000',
    onsite: [
      { key: 'onsite-panel', name: 'Onsite — Supply Chain Panel', duration: 90, interviewers: ['alex', 'lucas', 'ben'] },
    ],
    team: ['priya', 'alex', 'james', 'lucas'],
  },
  {
    id: 'gh-job-swe-backend', reqId: 'ENG-2210', name: 'Senior Software Engineer, Backend', department: 'Engineering', office: 'San Francisco, CA', openings: 2, hm: 'tom', status: 'open', opened: 48, salary: '$185,000 – $225,000',
    onsite: [
      { key: 'system-design', name: 'System Design', duration: 60, interviewers: ['chen'] },
      { key: 'coding', name: 'Coding Interview', duration: 60, interviewers: ['chen', 'ryan'] },
      { key: 'hm-final', name: 'Hiring Manager Final', duration: 45, interviewers: ['tom'] },
    ],
    team: ['tom', 'chen', 'ryan', 'james'],
  },
  {
    id: 'gh-job-swe-frontend', reqId: 'ENG-2214', name: 'Software Engineer, Frontend', department: 'Engineering', office: 'Remote — US', openings: 1, hm: 'tom', status: 'open', opened: 29, salary: '$150,000 – $180,000',
    onsite: [
      { key: 'coding', name: 'Frontend Pairing', duration: 90, interviewers: ['chen'] },
      { key: 'hm-final', name: 'Hiring Manager Final', duration: 45, interviewers: ['tom'] },
    ],
    team: ['tom', 'chen', 'james'],
  },
  {
    id: 'gh-job-sre', reqId: 'ENG-2219', name: 'Site Reliability Engineer', department: 'Engineering', office: 'Austin, TX', openings: 1, hm: 'grace', status: 'open', opened: 9, salary: '$160,000 – $190,000',
    onsite: [{ key: 'onsite-panel', name: 'Incident Response Panel', duration: 90, interviewers: ['oliver', 'chen'] }],
    team: ['grace', 'oliver', 'chen', 'james'],
  },
  {
    id: 'gh-job-ae', reqId: 'SAL-3105', name: 'Account Executive, Mid-Market', department: 'Sales', office: 'New York, NY', openings: 3, filled: 1, hm: 'rachel', status: 'open', opened: 63, salary: '$95,000 – $110,000 + OTE',
    onsite: [
      { key: 'mock-pitch', name: 'Mock Discovery Call', duration: 60, interviewers: ['liam', 'rachel'] },
      { key: 'values', name: 'Values & Collaboration', duration: 45, interviewers: ['aisha'] },
    ],
    team: ['rachel', 'liam', 'aisha', 'james'],
  },
  {
    id: 'gh-job-sdr', reqId: 'SAL-3108', name: 'Sales Development Representative', department: 'Sales', office: 'Boston, MA', openings: 2, hm: 'rachel', status: 'open', opened: 18, salary: '$55,000 – $62,000 + OTE',
    onsite: [{ key: 'mock-pitch', name: 'Cold Call Role-play', duration: 45, interviewers: ['liam'] }],
    team: ['rachel', 'liam', 'james'],
  },
  {
    id: 'gh-job-mkt-content', reqId: 'MKT-4021', name: 'Content Marketing Manager', department: 'Marketing', office: 'Boston, MA', openings: 1, hm: 'hannah', status: 'open', opened: 26, salary: '$105,000 – $125,000',
    onsite: [
      { key: 'portfolio', name: 'Portfolio Review', duration: 60, interviewers: ['hannah'] },
      { key: 'values', name: 'Cross-functional Interview', duration: 45, interviewers: ['liam', 'aisha'] },
    ],
    team: ['hannah', 'rachel', 'james'],
  },
  {
    id: 'gh-job-csm', reqId: 'CS-5012', name: 'Customer Success Manager', department: 'Customer Success', office: 'Chicago, IL', openings: 1, hm: 'aisha', status: 'open', opened: 40, salary: '$88,000 – $102,000',
    onsite: [{ key: 'onsite-panel', name: 'Customer Scenario Panel', duration: 60, interviewers: ['ryan', 'liam'] }],
    team: ['aisha', 'ryan', 'james'],
  },
  {
    id: 'gh-job-fin-analyst', reqId: 'FIN-6033', name: 'Senior Financial Analyst', department: 'Finance', office: 'New York, NY', openings: 1, hm: 'sofia', status: 'open', opened: 31, salary: '$115,000 – $135,000',
    onsite: [{ key: 'model', name: 'Financial Modeling Exercise', duration: 90, interviewers: ['sofia', 'emma'] }],
    team: ['sofia', 'marcus', 'emma', 'james'],
  },
  {
    id: 'gh-job-it-support', reqId: 'IT-7008', name: 'IT Support Specialist II', department: 'IT', office: 'Austin, TX', openings: 1, hm: 'oliver', status: 'draft', opened: 3, salary: '$64,000 – $74,000',
    onsite: [{ key: 'onsite-panel', name: 'Technical Troubleshooting', duration: 60, interviewers: ['oliver', 'ryan'] }],
    team: ['oliver', 'grace', 'james'],
  },
  {
    id: 'gh-job-people-ops', reqId: 'PPL-8004', name: 'People Operations Generalist', department: 'People', office: 'San Francisco, CA', openings: 1, hm: 'nina', status: 'draft', opened: 1, salary: '$85,000 – $98,000',
    onsite: [{ key: 'onsite-panel', name: 'People Team Panel', duration: 60, interviewers: ['james'] }],
    team: ['nina', 'james'],
  },
]

const buildJob = (s: JobSpec, i: number): Job => ({
  id: s.id,
  num: 4417020 + i * 37,
  reqId: s.reqId,
  name: s.name,
  department: s.department,
  office: s.office,
  openings: s.openings,
  filled: s.filled ?? 0,
  hiringManager: s.hm,
  recruiter: 'james',
  coordinator: 'james',
  status: s.status,
  openedAt: daysAgo(s.opened, 10, 0),
  closedAt: s.closed != null ? daysAgo(s.closed, 16, 0) : undefined,
  employmentType: 'Full-time',
  salaryRange: s.salary,
  plan: {
    application_review: [],
    phone_screen: screens('james', s.hm),
    onsite: s.onsite,
    offer: [{ key: 'reference-check', name: 'Reference Check', duration: 30, interviewers: ['james'] }],
  },
  hiringTeam: s.team,
})

// ── candidates ────────────────────────────────────────────────────────
interface CSpec {
  id: string
  name: string
  company: string
  title: string
  location: string
  source: string
  referrer?: string
  jobId: string
  stage: Stage
  rejectedFrom?: Stage
  rejectReason?: string
  applied: number
  inStage: number
  tags?: string[]
  /** ratings for completed interviews keyed by planKey */
  ratings?: Record<string, Rating>
  notes?: Record<string, string>
  summary?: string
  edu?: string
  prev?: { title: string; company: string; years: string }
  phone?: string
}

const C: CSpec[] = [
  // ─ Senior Operations Manager — Fulfillment (Alex hiring) ─
  {
    id: 'gh-cand-priyanka', name: 'Priyanka Desai', company: 'Wide World Importers', title: 'Fulfillment Operations Manager', location: 'Providence, RI', source: 'Referral', referrer: 'ben', jobId: 'gh-job-ops-manager', stage: 'phone_screen', applied: 16, inStage: 9, tags: ['Referral', 'Multi-site', 'Lean Six Sigma'],
    ratings: { 'recruiter-screen': 'strong_yes', 'hm-screen': 'strong_yes' },
    notes: {
      'recruiter-screen': 'Runs two fulfillment centers (420k sq ft combined, 180 FTEs) for Wide World Importers. Cut order cycle time from 31h to 19h by re-slotting fast movers and moving to wave picking. Comp expectations ($150k base) inside band, open to Boston hybrid, 3 weeks notice. Very crisp communicator — strongly recommend moving forward.',
      'hm-screen': 'Best HM screen I have had for this role. Walked me through a WMS migration (Manhattan → Blue Yonder) she led with zero missed SLAs during peak. Talks in metrics (OTIF 97.8%, cost per order down 14%). Exactly the operator we need for the Q1 3PL consolidation. Strong yes — move to onsite.',
    },
    summary: '11 years in fulfillment and distribution operations. Currently manages two DCs for Wide World Importers (420k sq ft, 180 FTEs, 3 shifts). Lean Six Sigma Black Belt. Led WMS migration and wave-picking redesign that reduced cycle time 39%. Previously Operations Supervisor at Tailspin Toys.',
    edu: 'MBA, Operations Management — Boston University · B.S. Industrial Engineering — Purdue University',
    prev: { title: 'Operations Supervisor', company: 'Tailspin Toys', years: '2014 – 2019' },
  },
  {
    id: 'gh-cand-marcus', name: 'Marcus Bell', company: 'Tailspin Toys', title: 'Senior Operations Manager, Distribution', location: 'Boston, MA', source: 'LinkedIn', jobId: 'gh-job-ops-manager', stage: 'phone_screen', applied: 13, inStage: 7, tags: ['3PL', 'Boston local', 'Peak season'],
    ratings: { 'recruiter-screen': 'strong_yes', 'hm-screen': 'yes' },
    notes: {
      'recruiter-screen': 'Leads the Northeast distribution network for Tailspin Toys (3 sites + 2 3PL partners). Negotiated 3PL contract renewals saving $1.2M/yr. Local to Boston, available in 4 weeks, comp at $155k. Warm, structured answers, clearly motivated by the scope of the role. Strong yes.',
      'hm-screen': 'Deep 3PL and carrier management experience — very relevant for the consolidation project. Slightly less hands-on with WMS configuration than I would like, but strong people leader (built a supervisor bench of 8). Yes — let’s see him with the panel and the case study.',
    },
    summary: '9 years in distribution and logistics. Senior Operations Manager at Tailspin Toys overseeing 3 distribution centers and 2 3PL partners across the Northeast. Led carrier diversification and 3PL renegotiation ($1.2M annual savings). APICS CSCP certified.',
    edu: 'B.S. Supply Chain Management — Northeastern University',
    prev: { title: 'Distribution Center Manager', company: 'Fourth Coffee', years: '2015 – 2020' },
  },
  {
    id: 'gh-cand-kwame', name: 'Kwame Mensah', company: 'Proseware, Inc.', title: 'Operations Manager', location: 'Worcester, MA', source: 'Indeed', jobId: 'gh-job-ops-manager', stage: 'phone_screen', applied: 12, inStage: 6, tags: ['Manufacturing'],
    ratings: { 'recruiter-screen': 'yes', 'hm-screen': 'no' },
    notes: {
      'recruiter-screen': 'Plant operations background (light manufacturing, 60 FTEs). Good culture signals and enthusiastic. Limited fulfillment/e-commerce exposure — worth a HM conversation.',
      'hm-screen': 'Solid manager but single-site manufacturing only; no WMS, 3PL or carrier experience. Would need significant ramp for this scope. Not for this role — maybe keep warm for Ops Coordinator lead in the future.',
    },
  },
  {
    id: 'gh-cand-derek', name: 'Derek Ostrowski', company: 'Alpine Ski House', title: 'Logistics Manager', location: 'Manchester, NH', source: 'Agency', jobId: 'gh-job-ops-manager', stage: 'phone_screen', applied: 10, inStage: 5, tags: ['Agency: Hollis Search'],
    ratings: { 'recruiter-screen': 'mixed' },
    notes: { 'recruiter-screen': 'Seasonal logistics for retail + rentals. Answers were vague on metrics; comp expectation ($175k) above band. Agency fee 20%. Mixed — HM screen to decide.' },
  },
  {
    id: 'gh-cand-lauren', name: 'Lauren Pierce', company: 'Coho Winery', title: 'Warehouse Operations Lead', location: 'Boston, MA', source: 'Company Website', jobId: 'gh-job-ops-manager', stage: 'phone_screen', applied: 6, inStage: 2, tags: [],
    ratings: {},
  },
  {
    id: 'gh-cand-aaliyah', name: 'Aaliyah Washington', company: 'Lucerne Publishing', title: 'Director, Distribution Operations', location: 'Hartford, CT', source: 'LinkedIn', jobId: 'gh-job-ops-manager', stage: 'onsite', applied: 24, inStage: 4, tags: ['Director-level', 'Relocation'],
    ratings: { 'recruiter-screen': 'yes', 'hm-screen': 'yes' },
    notes: {
      'recruiter-screen': 'Director at Lucerne Publishing, runs a 250k sq ft DC. Would relocate from Hartford. Comp at top of band ($160k).',
      'hm-screen': 'Strategic thinker, good with budgets ($18M opex). Want to probe hands-on execution during onsite.',
    },
  },
  { id: 'gh-cand-hiroshi', name: 'Hiroshi Nakamura', company: 'Fabrikam Residences', title: 'Facilities & Operations Manager', location: 'Cambridge, MA', source: 'LinkedIn', jobId: 'gh-job-ops-manager', stage: 'application_review', applied: 3, inStage: 3, tags: [] },
  { id: 'gh-cand-gabriela', name: 'Gabriela Fuentes', company: 'Margie’s Travel', title: 'Operations Program Manager', location: 'Boston, MA', source: 'Indeed', jobId: 'gh-job-ops-manager', stage: 'application_review', applied: 2, inStage: 2, tags: [] },
  { id: 'gh-cand-tyler', name: 'Tyler Brandt', company: 'Contoso Ltd', title: 'Fulfillment Supervisor', location: 'Lowell, MA', source: 'Company Website', jobId: 'gh-job-ops-manager', stage: 'application_review', applied: 1, inStage: 1, tags: [] },
  { id: 'gh-cand-ethan', name: 'Ethan Moore', company: 'Woodgrove Bank', title: 'Branch Operations Manager', location: 'Quincy, MA', source: 'Indeed', jobId: 'gh-job-ops-manager', stage: 'rejected', rejectedFrom: 'phone_screen', rejectReason: 'Lacks required experience', applied: 21, inStage: 14, ratings: { 'recruiter-screen': 'no' }, notes: { 'recruiter-screen': 'Banking ops, no warehouse or fulfillment exposure.' } },
  { id: 'gh-cand-rebecca', name: 'Rebecca Lindqvist', company: 'Adventure Works', title: 'Senior Operations Analyst', location: 'Boston, MA', source: 'LinkedIn', jobId: 'gh-job-ops-manager', stage: 'rejected', rejectedFrom: 'application_review', rejectReason: 'Not enough people management experience', applied: 19, inStage: 17 },

  // ─ Operations Analyst (filled) ─
  {
    id: 'gh-cand-jordan', name: 'Jordan Ellis', company: 'Relecloud', title: 'Business Operations Associate', location: 'Boston, MA', source: 'Referral', referrer: 'maya', jobId: 'gh-job-ops-analyst', stage: 'hired', applied: 58, inStage: 12, tags: ['Hired', 'SQL', 'Power BI'],
    ratings: { 'recruiter-screen': 'strong_yes', 'hm-screen': 'strong_yes', 'onsite-panel': 'strong_yes', 'excel-exercise': 'yes', 'reference-check': 'strong_yes' },
    notes: {
      'recruiter-screen': 'Sharp, curious, great energy. Built the ops KPI dashboard at Relecloud on Power BI. Comp $85k.',
      'hm-screen': 'Exactly what we need — analytical and practical. Asked great questions about our vendor scorecards.',
      'onsite-panel': 'Panel unanimous: clear communicator, strong structured thinking on the warehouse capacity case.',
      'excel-exercise': 'Solid SQL (window functions, CTEs). Pivot work was fast. Minor formatting nits.',
      'reference-check': 'Both references glowing — "the person everyone goes to for data".',
    },
    summary: '3 years in business operations at Relecloud. Owns weekly operations KPI reporting (Power BI, SQL). Automated vendor SLA tracking saving ~6 hrs/week. B.S. Economics.',
    edu: 'B.S. Economics — University of Massachusetts Amherst',
    prev: { title: 'Operations Intern', company: 'Contoso Ltd', years: '2021' },
  },
  { id: 'gh-cand-sana', name: 'Sana Qureshi', company: 'Trey Research', title: 'Data Analyst', location: 'Somerville, MA', source: 'LinkedIn', jobId: 'gh-job-ops-analyst', stage: 'rejected', rejectedFrom: 'offer', rejectReason: 'Candidate accepted another offer', applied: 60, inStage: 20, ratings: { 'recruiter-screen': 'yes', 'hm-screen': 'yes', 'onsite-panel': 'yes', 'excel-exercise': 'strong_yes' } },
  { id: 'gh-cand-michael', name: 'Michael Torres', company: 'Blue Yonder Airlines', title: 'Operations Analyst', location: 'Boston, MA', source: 'Indeed', jobId: 'gh-job-ops-analyst', stage: 'rejected', rejectedFrom: 'onsite', rejectReason: 'Another candidate was a better fit', applied: 55, inStage: 25, ratings: { 'recruiter-screen': 'yes', 'hm-screen': 'mixed', 'onsite-panel': 'no', 'excel-exercise': 'mixed' } },
  { id: 'gh-cand-emily', name: 'Emily Zhang', company: 'Graphic Design Institute', title: 'Program Coordinator', location: 'Boston, MA', source: 'Company Website', jobId: 'gh-job-ops-analyst', stage: 'rejected', rejectedFrom: 'phone_screen', rejectReason: 'Lacks required experience', applied: 62, inStage: 40, ratings: { 'recruiter-screen': 'no' } },
  { id: 'gh-cand-chris', name: 'Chris Adeyemi', company: 'Southridge Video', title: 'Production Assistant', location: 'Providence, RI', source: 'Indeed', jobId: 'gh-job-ops-analyst', stage: 'rejected', rejectedFrom: 'application_review', rejectReason: 'Lacks required experience', applied: 64, inStage: 50 },

  // ─ Operations Coordinator (Alex hiring, 2 openings) ─
  {
    id: 'gh-cand-olivia', name: 'Olivia Grant', company: 'Northwind Traders', title: 'Logistics Coordinator', location: 'Chicago, IL', source: 'Referral', referrer: 'maya', jobId: 'gh-job-ops-coordinator', stage: 'offer', applied: 20, inStage: 2, tags: ['Referral', 'Offer pending approval'],
    ratings: { 'recruiter-screen': 'strong_yes', 'hm-screen': 'yes', 'onsite-panel': 'strong_yes', 'hm-final': 'yes' },
  },
  { id: 'gh-cand-diego', name: 'Diego Ramírez', company: 'Fourth Coffee', title: 'Shift Supervisor', location: 'Evanston, IL', source: 'Indeed', jobId: 'gh-job-ops-coordinator', stage: 'onsite', applied: 17, inStage: 3, tags: ['Bilingual (ES)'], ratings: { 'recruiter-screen': 'yes', 'hm-screen': 'yes' } },
  { id: 'gh-cand-amara', name: 'Amara Okonkwo', company: 'Humongous Insurance', title: 'Operations Assistant', location: 'Chicago, IL', source: 'LinkedIn', jobId: 'gh-job-ops-coordinator', stage: 'phone_screen', applied: 9, inStage: 4, tags: [], ratings: { 'recruiter-screen': 'mixed' }, notes: { 'recruiter-screen': 'Organized, but limited vendor-facing experience. Mixed.' } },
  { id: 'gh-cand-ryan-k', name: 'Ryan Kowalski', company: 'Munson’s Pickles and Preserves', title: 'Inventory Clerk', location: 'Oak Park, IL', source: 'Indeed', jobId: 'gh-job-ops-coordinator', stage: 'phone_screen', applied: 7, inStage: 3, tags: [], ratings: { 'recruiter-screen': 'yes' }, notes: { 'recruiter-screen': 'Reliable, detail-oriented. A bit junior. Yes for a HM conversation.' } },
  { id: 'gh-cand-mei', name: 'Mei Lin', company: 'Bellows College', title: 'Administrative Coordinator', location: 'Chicago, IL', source: 'Company Website', jobId: 'gh-job-ops-coordinator', stage: 'application_review', applied: 2, inStage: 2, tags: [] },
  { id: 'gh-cand-jamal', name: 'Jamal Carter-Hughes', company: 'VanArsdel, Ltd.', title: 'Customer Operations Associate', location: 'Naperville, IL', source: 'LinkedIn', jobId: 'gh-job-ops-coordinator', stage: 'application_review', applied: 1, inStage: 1, tags: [] },

  // ─ Supply Chain Analyst ─
  { id: 'gh-cand-ana', name: 'Ana Sousa', company: 'Wide World Importers', title: 'Demand Planner', location: 'Chicago, IL', source: 'LinkedIn', jobId: 'gh-job-supply-chain', stage: 'onsite', applied: 13, inStage: 2, tags: ['Demand planning'], ratings: { 'recruiter-screen': 'strong_yes', 'hm-screen': 'yes' } },
  { id: 'gh-cand-viktor', name: 'Viktor Petrov', company: 'Contoso Pharmaceuticals', title: 'Supply Chain Analyst', location: 'Milwaukee, WI', source: 'Agency', jobId: 'gh-job-supply-chain', stage: 'phone_screen', applied: 8, inStage: 3, tags: [], ratings: { 'recruiter-screen': 'yes' } },
  { id: 'gh-cand-grace-o', name: 'Grace Oyelaran', company: 'Adventure Works', title: 'Procurement Analyst', location: 'Chicago, IL', source: 'Referral', referrer: 'lucas', jobId: 'gh-job-supply-chain', stage: 'application_review', applied: 4, inStage: 4, tags: ['Referral'] },

  // ─ Engineering ─
  { id: 'gh-cand-arjun', name: 'Arjun Mehta', company: 'Litware, Inc.', title: 'Staff Software Engineer', location: 'San Jose, CA', source: 'LinkedIn', jobId: 'gh-job-swe-backend', stage: 'offer', applied: 35, inStage: 3, tags: ['Go', 'Kafka'], ratings: { 'recruiter-screen': 'strong_yes', 'hm-screen': 'strong_yes', 'system-design': 'strong_yes', coding: 'yes', 'hm-final': 'strong_yes' } },
  { id: 'gh-cand-sophie', name: 'Sophie Laurent', company: 'Trey Research', title: 'Senior Backend Engineer', location: 'Oakland, CA', source: 'Referral', referrer: 'chen', jobId: 'gh-job-swe-backend', stage: 'onsite', applied: 19, inStage: 5, tags: ['Referral', 'Rust'], ratings: { 'recruiter-screen': 'yes', 'hm-screen': 'strong_yes' } },
  { id: 'gh-cand-kevin', name: 'Kevin Osei', company: 'Relecloud', title: 'Software Engineer II', location: 'Seattle, WA', source: 'Company Website', jobId: 'gh-job-swe-backend', stage: 'phone_screen', applied: 9, inStage: 4, tags: [], ratings: { 'recruiter-screen': 'yes' } },
  { id: 'gh-cand-nadia', name: 'Nadia Haddad', company: 'Proseware, Inc.', title: 'Backend Engineer', location: 'Remote — Denver, CO', source: 'LinkedIn', jobId: 'gh-job-swe-backend', stage: 'application_review', applied: 3, inStage: 3, tags: [] },
  { id: 'gh-cand-lucas-b', name: 'Lucas Bergström', company: 'Blue Yonder Airlines', title: 'Platform Engineer', location: 'San Francisco, CA', source: 'Agency', jobId: 'gh-job-swe-backend', stage: 'rejected', rejectedFrom: 'onsite', rejectReason: 'Technical skills not at required level', applied: 40, inStage: 18, ratings: { 'recruiter-screen': 'yes', 'hm-screen': 'yes', 'system-design': 'no', coding: 'mixed' } },
  { id: 'gh-cand-isabella', name: 'Isabella Romano', company: 'Fabrikam, Inc.', title: 'Frontend Engineer', location: 'Remote — Austin, TX', source: 'LinkedIn', jobId: 'gh-job-swe-frontend', stage: 'onsite', applied: 14, inStage: 3, tags: ['React', 'Design systems'], ratings: { 'recruiter-screen': 'strong_yes', 'hm-screen': 'yes' } },
  { id: 'gh-cand-ben-a', name: 'Benjamin Asante', company: 'Southridge Video', title: 'UI Engineer', location: 'Remote — Atlanta, GA', source: 'Indeed', jobId: 'gh-job-swe-frontend', stage: 'phone_screen', applied: 6, inStage: 2, tags: [], ratings: {} },
  { id: 'gh-cand-yuki', name: 'Yuki Tanabe', company: 'Graphic Design Institute', title: 'Web Developer', location: 'Remote — Portland, OR', source: 'Company Website', jobId: 'gh-job-swe-frontend', stage: 'application_review', applied: 2, inStage: 2, tags: [] },
  { id: 'gh-cand-omar', name: 'Omar Farouk', company: 'Litware, Inc.', title: 'DevOps Engineer', location: 'Austin, TX', source: 'LinkedIn', jobId: 'gh-job-sre', stage: 'phone_screen', applied: 6, inStage: 2, tags: ['Kubernetes'], ratings: { 'recruiter-screen': 'strong_yes' } },
  { id: 'gh-cand-claire', name: 'Claire Dubois', company: 'Humongous Insurance', title: 'Systems Engineer', location: 'San Antonio, TX', source: 'Indeed', jobId: 'gh-job-sre', stage: 'application_review', applied: 3, inStage: 3, tags: [] },

  // ─ Sales ─
  { id: 'gh-cand-tasha', name: 'Tasha Reynolds', company: 'Woodgrove Bank', title: 'Account Executive', location: 'Brooklyn, NY', source: 'Referral', referrer: 'liam', jobId: 'gh-job-ae', stage: 'hired', applied: 50, inStage: 21, tags: ['Hired'], ratings: { 'recruiter-screen': 'strong_yes', 'hm-screen': 'strong_yes', 'mock-pitch': 'strong_yes', values: 'yes', 'reference-check': 'strong_yes' } },
  { id: 'gh-cand-patrick', name: 'Patrick O’Neill', company: 'Contoso Ltd', title: 'Senior Account Executive', location: 'Jersey City, NJ', source: 'LinkedIn', jobId: 'gh-job-ae', stage: 'onsite', applied: 16, inStage: 6, tags: ['President’s Club'], ratings: { 'recruiter-screen': 'yes', 'hm-screen': 'yes' } },
  { id: 'gh-cand-fatima', name: 'Fatima Al-Sayed', company: 'Adatum Corporation', title: 'Account Manager', location: 'New York, NY', source: 'Agency', jobId: 'gh-job-ae', stage: 'phone_screen', applied: 8, inStage: 5, tags: [], ratings: { 'recruiter-screen': 'yes' } },
  { id: 'gh-cand-josh', name: 'Josh Whitfield', company: 'Margie’s Travel', title: 'Business Development Rep', location: 'Hoboken, NJ', source: 'Indeed', jobId: 'gh-job-ae', stage: 'application_review', applied: 4, inStage: 4, tags: [] },
  { id: 'gh-cand-carmen', name: 'Carmen Vega', company: 'Fourth Coffee', title: 'Inside Sales Associate', location: 'Boston, MA', source: 'Company Website', jobId: 'gh-job-sdr', stage: 'phone_screen', applied: 5, inStage: 2, tags: [], ratings: { 'recruiter-screen': 'strong_yes' } },
  { id: 'gh-cand-noah', name: 'Noah Fitzgerald', company: 'Bellows College', title: 'Recent Graduate', location: 'Boston, MA', source: 'Handshake', jobId: 'gh-job-sdr', stage: 'application_review', applied: 2, inStage: 2, tags: ['Early career'] },
  { id: 'gh-cand-zara', name: 'Zara Hussain', company: 'Coho Winery', title: 'Sales Associate', location: 'Cambridge, MA', source: 'LinkedIn', jobId: 'gh-job-sdr', stage: 'onsite', applied: 12, inStage: 2, tags: [], ratings: { 'recruiter-screen': 'yes', 'hm-screen': 'yes' } },

  // ─ Marketing / CS / Finance ─
  { id: 'gh-cand-elise', name: 'Elise Marchetti', company: 'Lucerne Publishing', title: 'Senior Content Strategist', location: 'Boston, MA', source: 'LinkedIn', jobId: 'gh-job-mkt-content', stage: 'onsite', applied: 18, inStage: 4, tags: ['B2B SaaS'], ratings: { 'recruiter-screen': 'strong_yes', 'hm-screen': 'yes' } },
  { id: 'gh-cand-owen', name: 'Owen Gallagher', company: 'Alpine Ski House', title: 'Marketing Specialist', location: 'Portland, ME', source: 'Indeed', jobId: 'gh-job-mkt-content', stage: 'phone_screen', applied: 7, inStage: 3, tags: [], ratings: { 'recruiter-screen': 'mixed' } },
  { id: 'gh-cand-renee', name: 'Renée Baptiste', company: 'Tailspin Toys', title: 'Content Manager', location: 'Boston, MA', source: 'Referral', referrer: 'hannah', jobId: 'gh-job-mkt-content', stage: 'application_review', applied: 3, inStage: 3, tags: ['Referral'] },
  { id: 'gh-cand-samir', name: 'Samir Bose', company: 'Relecloud', title: 'Customer Success Manager', location: 'Chicago, IL', source: 'LinkedIn', jobId: 'gh-job-csm', stage: 'offer', applied: 30, inStage: 4, tags: [], ratings: { 'recruiter-screen': 'yes', 'hm-screen': 'strong_yes', 'onsite-panel': 'yes' } },
  { id: 'gh-cand-hailey', name: 'Hailey Brennan', company: 'Proseware, Inc.', title: 'Account Manager', location: 'Milwaukee, WI', source: 'Indeed', jobId: 'gh-job-csm', stage: 'phone_screen', applied: 10, inStage: 6, tags: [], ratings: { 'recruiter-screen': 'yes' } },
  { id: 'gh-cand-liang', name: 'Liang Chen', company: 'Woodgrove Bank', title: 'FP&A Analyst', location: 'New York, NY', source: 'LinkedIn', jobId: 'gh-job-fin-analyst', stage: 'onsite', applied: 21, inStage: 5, tags: ['CFA L2'], ratings: { 'recruiter-screen': 'yes', 'hm-screen': 'strong_yes' } },
  { id: 'gh-cand-maria-k', name: 'Maria Kovacs', company: 'Datum Corporation', title: 'Senior Financial Analyst', location: 'Stamford, CT', source: 'Agency', jobId: 'gh-job-fin-analyst', stage: 'phone_screen', applied: 9, inStage: 4, tags: [], ratings: { 'recruiter-screen': 'yes' } },
  { id: 'gh-cand-david-p', name: 'David Park', company: 'Contoso Pharmaceuticals', title: 'Financial Analyst', location: 'New York, NY', source: 'Company Website', jobId: 'gh-job-fin-analyst', stage: 'application_review', applied: 2, inStage: 2, tags: [] },
]

const ATTRS: Record<string, [string, string][]> = {
  Operations: [['Process improvement', 'Skills'], ['Data-driven decision making', 'Skills'], ['Vendor & 3PL management', 'Skills'], ['People leadership', 'Personality'], ['Communication', 'Personality'], ['Ownership', 'Personality'], ['Relevant industry experience', 'Qualifications']],
  Engineering: [['Technical depth', 'Skills'], ['Problem solving', 'Skills'], ['Code quality', 'Skills'], ['Collaboration', 'Personality'], ['Communication', 'Personality'], ['Relevant experience', 'Qualifications']],
  default: [['Role-specific skills', 'Skills'], ['Problem solving', 'Skills'], ['Communication', 'Personality'], ['Collaboration', 'Personality'], ['Relevant experience', 'Qualifications']],
}

const GENERIC_NOTE: Record<Rating, string> = {
  strong_yes: 'Exceptional conversation. Clear, specific examples with measurable results. Strongly recommend moving forward.',
  yes: 'Good fit overall. Relevant experience and solid communication. Recommend moving forward.',
  mixed: 'Some relevant experience but answers lacked depth in key areas. On the fence — would want more signal.',
  no: 'Not the right level of experience for this role. Gaps in core requirements.',
  strong_no: 'Significant concerns. Do not recommend.',
}

const LADDER: Rating[] = ['strong_no', 'no', 'mixed', 'yes', 'strong_yes']
const shift = (r: Rating, by: number) => LADDER[Math.max(0, Math.min(4, LADDER.indexOf(r) + by))]

const slug = (s: string) => s.normalize('NFD').replace(/[^\w\s-]/g, '').trim().toLowerCase().split(/\s+/)
const EMAIL_DOMAINS = ['gmail.com', 'outlook.com', 'icloud.com', 'gmail.com', 'yahoo.com', 'protonmail.com']

const STAGE_OFFSETS: Record<string, number> = { application_review: 0, phone_screen: 0.25, onsite: 0.55, offer: 0.8, hired: 0.95 }

export function seed(): Collections {
  const jobs = JOBS.map(buildJob)
  const jobById = Object.fromEntries(jobs.map((j) => [j.id, j]))
  const interviews: Interview[] = []
  const candidates: Candidate[] = C.map((s, idx) => {
    const job = jobById[s.jobId]
    const [first, ...rest] = slug(s.name)
    const last = rest[rest.length - 1] ?? 'x'
    const email = `${first}.${last}${idx % 3 === 0 ? '' : idx % 7}@${EMAIL_DOMAINS[idx % EMAIL_DOMAINS.length]}`
    const phone = s.phone ?? `+1 (${[617, 312, 415, 212, 512, 401, 508][idx % 7]}) 555-${String(1200 + idx * 73).slice(-4)}`
    const attrs = ATTRS[job.department] ?? ATTRS.default
    const terminal = s.stage === 'rejected' ? s.rejectedFrom! : s.stage
    const reached = PIPELINE.slice(0, PIPELINE.indexOf(terminal as any) + 1)
    const span = s.applied - s.inStage
    const stageAt = (st: string) => daysAgo(Math.round(s.applied - (span * (STAGE_OFFSETS[st] ?? 0)) / (STAGE_OFFSETS[terminal] || 1)), 10 + (idx % 6), (idx * 7) % 60)
    const stageEnteredAt = daysAgo(s.inStage, 10 + (idx % 5), (idx * 11) % 60)
    const activity: Activity[] = []
    const scorecards: Scorecard[] = []
    let n = 0
    const act = (a: Omit<Activity, 'id'>) => activity.push({ id: `${s.id}-act-${n++}`, ...a })

    act({ at: daysAgo(s.applied, 8 + (idx % 9), (idx * 13) % 60), kind: 'applied', by: 'system', text: s.referrer ? `Referred by ${s.referrer === 'ben' ? 'Ben Carter' : s.referrer === 'maya' ? 'Maya Johnson' : s.referrer === 'chen' ? 'Chen Wei' : s.referrer === 'liam' ? "Liam O'Connor" : s.referrer === 'lucas' ? 'Lucas Moreau' : 'Hannah Novak'} for ${job.name}` : `Applied to ${job.name} via ${s.source}` })

    // completed interviews and their scorecards for every stage passed
    reached.forEach((st, si) => {
      if (si > 0) {
        const prevAt = si === reached.length - 1 ? stageEnteredAt : stageAt(st)
        act({ at: prevAt, kind: st === 'hired' ? 'hired' : 'stage', by: st === 'hired' ? job.hiringManager : 'james', text: st === 'hired' ? `Marked as hired for ${job.name}` : `Moved from ${LBL[reached[si - 1]]} to ${LBL[st]}` })
      }
      const plan = job.plan[st] ?? []
      plan.forEach((p, pi) => {
        const rating = s.ratings?.[p.key]
        if (!rating) return
        const interviewers = p.interviewers.slice(0, st === 'onsite' ? 2 : 1)
        const start = new Date(new Date(si === reached.length - 1 ? stageEnteredAt : stageAt(st)).getTime() + (pi + 1) * 86400000)
        start.setHours(10 + pi * 2, pi % 2 ? 30 : 0, 0, 0)
        if (start.getTime() > Date.now()) start.setTime(Date.now() - (pi + 2) * 3600000)
        const end = new Date(start.getTime() + p.duration * 60000)
        interviews.push({
          id: `${s.id}-iv-${p.key}`,
          candidateId: s.id,
          jobId: job.id,
          stage: st,
          planKey: p.key,
          name: p.name,
          start: start.toISOString(),
          end: end.toISOString(),
          durationMin: p.duration,
          interviewers,
          location: st === 'onsite' && job.office.startsWith('Boston') ? 'onsite-boston' : 'zoom',
          status: 'completed',
          createdAt: new Date(start.getTime() - 3 * 86400000).toISOString(),
        })
        interviewers.forEach((iv, ii) => {
          const r = ii === 0 ? rating : shift(rating, idx % 2 ? 0 : -1)
          const submitted = new Date(end.getTime() + (2 + ii) * 3600000).toISOString()
          scorecards.push({
            id: `${s.id}-sc-${p.key}-${iv}`,
            interviewer: iv,
            stage: st,
            interview: p.name,
            planKey: p.key,
            rating: r,
            submittedAt: submitted,
            notes: (ii === 0 && s.notes?.[p.key]) || GENERIC_NOTE[r],
            attributes: attrs.map(([name, category], ai) => ({ name, category, rating: shift(r, ((idx + ai) % 4 === 0 ? -1 : 0) + ((ai + ii) % 5 === 3 && r !== 'strong_yes' ? 1 : 0)) })),
          })
          act({ at: submitted, kind: 'scorecard', by: iv, text: `Submitted a scorecard for ${p.name}`, body: r })
        })
      })
    })
    if (s.stage === 'rejected') {
      act({ at: stageEnteredAt, kind: 'reject', by: 'james', text: `Rejected from ${LBL[s.rejectedFrom!]}`, body: s.rejectReason })
    }
    if (s.stage === 'phone_screen' && !s.ratings?.['recruiter-screen']) {
      act({ at: daysAgo(s.inStage - 1 > 0 ? s.inStage - 1 : 0, 9, 40), kind: 'email', by: 'james', text: 'Sent email: Next steps with Northwind Global', body: `Hi ${first[0].toUpperCase() + first.slice(1)}, thanks for applying! Could you share a few times that work for a 30-minute call this week?` })
    }
    if (s.id === 'gh-cand-priyanka' || s.id === 'gh-cand-marcus') {
      act({ at: daysAgo(1, 16, 12), kind: 'note', by: 'james', text: 'Left a note', body: `@Alex Morgan both phone screens came back very strong — I’d move ${s.name.split(' ')[0]} to onsite this week before other processes move ahead. Panel availability: Priya Tue/Wed afternoons.` })
    }
    activity.sort((a, b) => +new Date(b.at) - +new Date(a.at))

    const cand: Candidate = {
      id: s.id,
      num: 61820450 + idx * 1291,
      appNum: 88214070 + idx * 977,
      name: s.name,
      email,
      phone,
      company: s.company,
      title: s.title,
      location: s.location,
      source: s.source,
      referrer: s.referrer,
      jobId: s.jobId,
      stage: s.stage,
      rejectedFrom: s.rejectedFrom,
      rejectReason: s.rejectReason,
      appliedAt: daysAgo(s.applied, 8 + (idx % 9), (idx * 13) % 60),
      stageEnteredAt,
      lastActivity: activity[0]?.at ?? stageEnteredAt,
      tags: s.tags ?? [],
      recruiter: 'james',
      coordinator: 'james',
      scorecards: scorecards.sort((a, b) => +new Date(b.submittedAt) - +new Date(a.submittedAt)),
      activity,
      resumeSummary: s.summary ?? `${4 + (idx % 9)} years of experience. Currently ${s.title} at ${s.company}. Background aligned with ${job.department.toLowerCase()} work; see attached resume for details.`,
      experience: [
        { title: s.title, company: s.company, years: `${2026 - 1 - (idx % 4)} – Present` },
        s.prev ?? { title: PREV_TITLE[job.department] ?? 'Associate', company: PREV_CO[idx % PREV_CO.length], years: `${2018 - (idx % 5)} – ${2025 - (idx % 4)}` },
      ],
      education: s.edu ?? EDU[idx % EDU.length],
      linkedin: `linkedin.com/in/${first}-${last}-${(idx * 37 + 100).toString(16)}`,
    }
    if (s.stage === 'offer') {
      cand.offer = { salary: job.salaryRange?.split('–')[1]?.trim().replace(/\s.*$/, '') ?? '$100,000', startDate: businessDays(15), status: s.id === 'gh-cand-olivia' ? 'pending_approval' : 'approved', approvers: [job.hiringManager, 'priya'] }
    }
    return cand
  })

  // ── upcoming (scheduled) interviews ─────────────────────────────────
  const upcoming = (id: string, candId: string, planKey: string, d: number, hh: number, mm: number, interviewers: string[], location: Interview['location'] = 'zoom') => {
    const c = candidates.find((x) => x.id === candId)!
    const job = jobById[c.jobId]
    const p = (job.plan[c.stage] ?? []).find((x) => x.key === planKey)!
    const start = daysFromNow(d, hh, mm)
    const end = new Date(new Date(start).getTime() + p.duration * 60000).toISOString()
    interviews.push({ id, candidateId: candId, jobId: job.id, stage: c.stage, planKey, name: p.name, start, end, durationMin: p.duration, interviewers, location, status: 'scheduled', createdAt: daysAgo(1, 11, 0) })
    c.activity.unshift({ id: `${id}-act`, at: daysAgo(1, 11, 0), kind: 'interview', by: 'james', text: `Scheduled ${p.name}`, body: `${new Date(start).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} with ${interviewers.length} interviewer${interviewers.length > 1 ? 's' : ''}` })
  }
  upcoming('gh-iv-aaliyah-panel', 'gh-cand-aaliyah', 'onsite-panel', 2, 13, 0, ['priya', 'ben', 'maya'], 'onsite-boston')
  upcoming('gh-iv-aaliyah-case', 'gh-cand-aaliyah', 'case-study', 2, 15, 0, ['alex', 'priya'], 'onsite-boston')
  upcoming('gh-iv-lauren-screen', 'gh-cand-lauren', 'recruiter-screen', 1, 11, 30, ['james'])
  upcoming('gh-iv-diego-panel', 'gh-cand-diego', 'onsite-panel', 1, 14, 0, ['maya', 'ben'], 'teams')
  upcoming('gh-iv-diego-final', 'gh-cand-diego', 'hm-final', 3, 10, 0, ['alex'], 'teams')
  upcoming('gh-iv-ryank-hm', 'gh-cand-ryan-k', 'hm-screen', 0, 16, 0, ['alex'])
  upcoming('gh-iv-ana-panel', 'gh-cand-ana', 'onsite-panel', 4, 10, 30, ['alex', 'lucas', 'ben'], 'teams')
  upcoming('gh-iv-sophie-sd', 'gh-cand-sophie', 'system-design', 1, 10, 0, ['chen'])
  upcoming('gh-iv-sophie-coding', 'gh-cand-sophie', 'coding', 1, 11, 30, ['chen', 'ryan'])
  upcoming('gh-iv-isabella', 'gh-cand-isabella', 'coding', 2, 13, 0, ['chen'])
  upcoming('gh-iv-patrick', 'gh-cand-patrick', 'mock-pitch', 3, 14, 0, ['liam', 'rachel'])
  upcoming('gh-iv-elise', 'gh-cand-elise', 'portfolio', 2, 11, 0, ['hannah'])
  upcoming('gh-iv-liang', 'gh-cand-liang', 'model', 5, 9, 30, ['sofia', 'emma'])
  // completed yesterday, Alex still owes the scorecard → "Scorecards due"
  interviews.push({ id: 'gh-iv-amara-hm', candidateId: 'gh-cand-amara', jobId: 'gh-job-ops-coordinator', stage: 'phone_screen', planKey: 'hm-screen', name: 'Hiring Manager Screen', start: daysAgo(1, 14, 0), end: daysAgo(1, 14, 45), durationMin: 45, interviewers: ['alex'], location: 'teams', status: 'completed', createdAt: daysAgo(4, 10, 0) })
  candidates.forEach((c) => {
    c.activity.sort((a, b) => +new Date(b.at) - +new Date(a.at))
    c.lastActivity = c.activity[0]?.at ?? c.lastActivity
  })

  return {
    'greenhouse.jobs': jobs,
    'greenhouse.candidates': candidates,
    'greenhouse.interviews': interviews,
  }
}

const LBL: Record<string, string> = { application_review: 'Application Review', phone_screen: 'Phone Screen', onsite: 'Onsite', offer: 'Offer', hired: 'Hired' }
const PREV_TITLE: Record<string, string> = { Operations: 'Operations Associate', Engineering: 'Software Engineer', Sales: 'Sales Associate', Marketing: 'Marketing Coordinator', Finance: 'Financial Analyst', 'Customer Success': 'Support Specialist' }
const PREV_CO = ['Contoso Ltd', 'Fabrikam, Inc.', 'Northwind Traders', 'Adventure Works', 'Litware, Inc.', 'Trey Research', 'Fourth Coffee', 'Proseware, Inc.']
const EDU = [
  'B.S. Business Administration — Northeastern University',
  'B.A. Economics — University of Illinois Urbana-Champaign',
  'B.S. Computer Science — UC San Diego',
  'B.S. Supply Chain Management — Michigan State University',
  'B.A. Communications — Boston College',
  'M.S. Operations Research — Georgia Tech',
  'B.S. Finance — NYU Stern',
]
