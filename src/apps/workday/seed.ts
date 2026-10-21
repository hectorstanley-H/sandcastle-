/**
 * Workday seed.
 *
 * workday.workers:   { id: 'wd-<personId>', personId, name, title, positionId, org, managerId (worker id), location,
 *                      hireDate, status: 'Active'|'Pre-Hire', employeeType, timeType, employeeId, email, phone,
 *                      compensation?: { plan, grade, base, frequency, bonusTarget }, balances?: { vacation, sick, floating },
 *                      updatedBy? }
 * workday.timeoff:   { id, workerId, type: 'Vacation'|'Sick'|'Floating Holiday', days: { date, hours }[], totalDays, comment,
 *                      status: 'Submitted'|'Approved'|'Denied', submittedAt, approverId, createdBy? }
 * workday.tasks:     { id, assignee (personId), title, process, step, fromId, receivedAt, due?, status: 'open'|'done',
 *                      link?: { page, workerId?, requestId? }, completedAt? }
 * workday.onboarding:{ id, workerId, status: 'Hire In Progress'|'Onboarding'|'Complete', positionId?, startDate?, base?,
 *                      hireDone: boolean, steps: { position, details, compensation }, tasks: { id, title, desc, category, assignee, due, status }[],
 *                      updatedBy? }
 */
import type { Collections } from '@/db/db'
import { PEOPLE, person } from '@/data/people'
import { daysAgo, daysFromNow, hoursAgo, isoDate } from '@/data/time'
import { nextMonday } from './util'

const GRADES: Record<string, [string, number]> = {
  alex: ['M4', 132000],
  priya: ['E2', 228000],
  david: ['E4', 365000],
  sofia: ['M4', 128000],
  marcus: ['E4', 342000],
  emma: ['P2', 68500],
  james: ['P4', 112000],
  nina: ['E3', 289000],
  oliver: ['M2', 98000],
  grace: ['E1', 186000],
  liam: ['P3', 96000],
  rachel: ['E2', 214000],
  chen: ['P5', 178000],
  tom: ['M5', 196000],
  aisha: ['P4', 104000],
  lucas: ['P2', 72000],
  hannah: ['M3', 118000],
  ben: ['P2', 74500],
  maya: ['P1', 61000],
  ryan: ['P3', 88000],
}

const HIRE: Record<string, string> = {
  alex: '2019-03-11', priya: '2016-08-01', david: '2012-01-09', sofia: '2018-05-14', marcus: '2015-02-02', emma: '2021-09-20',
  james: '2017-11-06', nina: '2014-04-14', oliver: '2019-07-15', grace: '2016-02-29', liam: '2022-01-10', rachel: '2015-09-08',
  chen: '2018-10-01', tom: '2017-06-19', aisha: '2020-03-02', lucas: '2023-04-17', hannah: '2019-12-02', ben: '2022-06-06',
  maya: '2024-02-12', ryan: '2021-05-24',
}

export function seed(): Collections {
  const internal = PEOPLE.filter((p) => !p.external)
  const workers = internal.map((p, i) => {
    const g = GRADES[p.id] ?? ['P2', 70000]
    const isJordan = p.id === 'jordan'
    return {
      id: `wd-${p.id}`,
      personId: p.id,
      name: p.name,
      title: isJordan ? 'Operations Analyst' : p.title,
      positionId: isJordan ? 'P-00487' : `P-00${(210 + i * 13).toString()}`,
      org: `${p.dept} (${p.managerId ? person(p.managerId).name : p.name})`,
      dept: p.dept,
      managerId: p.managerId ? `wd-${p.managerId}` : undefined,
      location: p.location,
      hireDate: isJordan ? undefined : HIRE[p.id],
      status: isJordan ? 'Pre-Hire' : 'Active',
      employeeType: 'Regular',
      timeType: 'Full time',
      employeeId: isJordan ? 'Pending' : p.employeeId.replace('E', '1'),
      email: p.email,
      phone: p.phone,
      compensation: isJordan ? undefined : { plan: 'Base Salary — US', grade: g[0], base: g[1], frequency: 'Annual', bonusTarget: g[0].startsWith('E') ? 30 : g[0].startsWith('M') ? 15 : 8 },
      balances: p.id === 'alex' ? { vacation: 14.5, sick: 6, floating: 1 } : { vacation: 8 + (i % 9) + 0.5, sick: 5, floating: 2 },
    }
  })

  const y = new Date().getFullYear()
  const timeoff = [
    { id: 'to-1001', workerId: 'wd-alex', type: 'Vacation', days: ['08-10', '08-11', '08-12', '08-13', '08-14'].map((d) => ({ date: `${y}-${d}`, hours: 8 })), totalDays: 5, comment: 'Family trip to Cape Cod', status: 'Approved', submittedAt: `${y}-06-18T14:02:00.000Z`, approverId: 'priya' },
    { id: 'to-1002', workerId: 'wd-alex', type: 'Floating Holiday', days: [{ date: `${y}-07-03`, hours: 8 }], totalDays: 1, comment: '', status: 'Approved', submittedAt: `${y}-06-02T10:40:00.000Z`, approverId: 'priya' },
    { id: 'to-1003', workerId: 'wd-alex', type: 'Sick', days: [{ date: isoDate(daysAgo(34)), hours: 8 }], totalDays: 1, comment: 'Flu', status: 'Approved', submittedAt: daysAgo(34, 7, 12), approverId: 'priya' },
    { id: 'to-1004', workerId: 'wd-ben', type: 'Vacation', days: [{ date: `${y}-11-27`, hours: 8 }], totalDays: 1, comment: 'Day after Thanksgiving', status: 'Submitted', submittedAt: daysAgo(1, 16, 5), approverId: 'alex' },
    { id: 'to-1005', workerId: 'wd-maya', type: 'Vacation', days: ['10-05', '10-06'].map((d) => ({ date: `${y}-${d}`, hours: 8 })), totalDays: 2, comment: '', status: 'Approved', submittedAt: `${y}-09-12T09:00:00.000Z`, approverId: 'alex' },
    { id: 'to-1006', workerId: 'wd-alex', type: 'Vacation', days: ['04-14', '04-15', '04-16'].map((d) => ({ date: `${y}-${d}`, hours: 8 })), totalDays: 3, comment: 'Spring break', status: 'Approved', submittedAt: `${y}-03-01T09:00:00.000Z`, approverId: 'priya' },
  ]

  const start = nextMonday()
  const tasks = [
    { id: 'wt-hire-jordan', assignee: 'alex', title: 'Hire: Jordan Ellis — Operations Analyst', process: 'Hire Employee', step: 'Complete Hire Details (Hiring Manager)', fromId: 'james', receivedAt: hoursAgo(20), due: daysFromNow(2), status: 'open', link: { page: 'onboarding', workerId: 'wd-jordan' } },
    { id: 'wt-to-ben', assignee: 'alex', title: 'Time Off Request: Ben Carter (1 day)', process: 'Request Time Off', step: 'Approval by Manager', fromId: 'ben', receivedAt: daysAgo(1, 16, 5), due: daysFromNow(3), status: 'open', link: { page: 'timeoff', requestId: 'to-1004' } },
    { id: 'wt-exp-maya', assignee: 'alex', title: 'Expense Report: EXP-0004817 — Maya Johnson ($412.60)', process: 'Expense Report', step: 'Approval by Manager', fromId: 'maya', receivedAt: daysAgo(2, 11, 22), due: daysFromNow(1), status: 'open' },
    { id: 'wt-perf-ben', assignee: 'alex', title: 'Manager Evaluation: Ben Carter — 2026 Mid-Year Review', process: 'Performance Review', step: 'Manager Evaluation', fromId: 'nina', receivedAt: daysAgo(5, 9, 0), due: daysFromNow(9), status: 'open' },
    { id: 'wt-oe-alex', assignee: 'alex', title: 'Open Enrollment Change: Alex Morgan', process: 'Benefit Change', step: 'Elect Benefits', fromId: 'nina', receivedAt: daysAgo(6, 8, 0), due: daysFromNow(2, 23, 59), status: 'open' },
    { id: 'wt-train-alex', assignee: 'alex', title: 'Complete Learning: Code of Conduct 2026', process: 'Required Learning', step: 'Complete Learning', fromId: 'nina', receivedAt: daysAgo(9, 8, 0), due: daysFromNow(10), status: 'open' },
    { id: 'wt-req-maya', assignee: 'alex', title: 'Review Job Requisition: R-02211 Operations Coordinator II', process: 'Create Job Requisition', step: 'Approval by Manager', fromId: 'james', receivedAt: daysAgo(3, 14, 30), due: daysFromNow(4), status: 'open' },
    { id: 'wt-done-1', assignee: 'alex', title: 'Time Off Request: Maya Johnson (2 days)', process: 'Request Time Off', step: 'Approval by Manager', fromId: 'maya', receivedAt: `${y}-09-12T09:00:00.000Z`, status: 'done', completedAt: `${y}-09-12T15:10:00.000Z` },
    { id: 'wt-done-2', assignee: 'alex', title: 'Expense Report: EXP-0004702 — Ben Carter ($188.20)', process: 'Expense Report', step: 'Approval by Manager', fromId: 'ben', receivedAt: daysAgo(12, 9, 0), status: 'done', completedAt: daysAgo(11, 10, 0) },
    { id: 'wt-done-3', assignee: 'alex', title: 'Time Off Request: Alex Morgan (5 days)', process: 'Request Time Off', step: 'Approval by Manager — Priya Raman', fromId: 'alex', receivedAt: `${y}-06-18T14:02:00.000Z`, status: 'done', completedAt: `${y}-06-18T18:30:00.000Z` },
  ]

  const due = (n: number) => isoDate(new Date(start.getTime() + n * 86400000))
  const onboarding = [
    {
      id: 'onb-jordan',
      workerId: 'wd-jordan',
      status: 'Hire In Progress',
      hireDone: false,
      startDate: isoDate(start),
      steps: { position: false, details: false, compensation: false },
      tasks: [
        { id: 'ot-offer', title: 'Offer accepted & signed', desc: 'Signed offer letter received via Docusign', category: 'Pre-boarding', assignee: 'james', due: isoDate(daysAgo(4)), status: 'Complete' },
        { id: 'ot-bg', title: 'Background check', desc: 'Sterling — cleared', category: 'Pre-boarding', assignee: 'james', due: isoDate(daysAgo(2)), status: 'Complete' },
        { id: 'ot-it', title: 'IT equipment & accounts', desc: 'Laptop (Dell Latitude 7450), monitor, headset, Okta account and core app access', category: 'IT', assignee: null, due: due(-3), status: 'Not Started' },
        { id: 'ot-buddy', title: 'Assign onboarding buddy', desc: 'A peer on the team who helps Jordan navigate the first 30 days', category: 'Team', assignee: null, due: due(-1), status: 'Not Started' },
        { id: 'ot-plan', title: 'First-week plan', desc: 'Welcome meeting, system walkthroughs, 1:1s and shadowing schedule', category: 'Team', assignee: null, due: due(-1), status: 'Not Started' },
        { id: 'ot-i9', title: 'Complete Form I-9', desc: 'Employment eligibility verification (Section 1)', category: 'Compliance', assignee: 'jordan', due: due(0), status: 'Not Started' },
        { id: 'ot-ben', title: 'Benefits enrollment', desc: 'Elect medical, dental, vision and 401(k)', category: 'Benefits', assignee: 'jordan', due: due(30), status: 'Not Started' },
        { id: 'ot-pay', title: 'Set up payment elections', desc: 'Direct deposit account', category: 'Pay', assignee: 'jordan', due: due(4), status: 'Not Started' },
      ],
    },
  ]

  const announcements = [
    { id: 'wa-1', title: 'Open Enrollment closes Friday', body: 'Review your 2027 medical, dental and vision elections before Friday 11:59 PM ET.', tone: 'blue', date: daysAgo(6) },
    { id: 'wa-2', title: 'Welcome to One Federal', body: 'Our new Boston office opens November 3. Find your neighborhood and book a desk.', tone: 'orange', date: daysAgo(3) },
    { id: 'wa-3', title: 'Q4 Town Hall with David Okafor', body: 'Join us Friday at 4 PM ET for priorities, wins and Q&A.', tone: 'teal', date: daysAgo(1) },
  ]

  return {
    'workday.workers': workers,
    'workday.timeoff': timeoff,
    'workday.tasks': tasks,
    'workday.onboarding': onboarding,
    'workday.announcements': announcements,
  }
}
