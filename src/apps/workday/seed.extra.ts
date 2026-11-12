/**
 * Extra Workday records (appended to the base seed by src/db/seeds/extras.ts).
 *
 * workday.expenses: { id, number, workerId, memo, lines: { date, category, merchant, amount }[], total, status, createdAt, submittedAt? }
 * workday.goals:    { id, workerId, title, desc, category, due, progress, status }
 * workday.feedback: { id, fromId, toWorkerId, badge?, text, visibility, at }
 */
import type { Collections } from '@/db/db'
import { daysAgo, isoDate } from '@/data/time'

export function seed(): Collections {
  const y = new Date().getFullYear()
  const d = (n: number) => isoDate(daysAgo(n))
  return {
    'workday.expenses': [
      {
        id: 'wexp-4817',
        number: 'EXP-0004817',
        workerId: 'wd-maya',
        memo: 'Chicago DC site visit',
        lines: [
          { date: d(5), category: 'Client Entertainment', merchant: 'Gibsons Bar & Steakhouse', amount: 286.4 },
          { date: d(5), category: 'Mileage', merchant: 'Personal vehicle — 112 mi', amount: 78.4 },
          { date: d(4), category: 'Ground Transportation', merchant: 'Uber', amount: 47.8 },
        ],
        total: 412.6,
        status: 'Submitted',
        createdAt: daysAgo(2, 11, 0),
        submittedAt: daysAgo(2, 11, 22),
      },
      {
        id: 'wexp-4761',
        number: 'EXP-0004761',
        workerId: 'wd-alex',
        memo: 'Fabrikam QBR — New York',
        lines: [
          { date: d(21), category: 'Airfare', merchant: 'JetBlue BOS–JFK', amount: 238.2 },
          { date: d(21), category: 'Hotel', merchant: 'Hyatt Centric Times Square', amount: 412.0 },
          { date: d(20), category: 'Meals', merchant: 'Joe’s Pizza', amount: 18.5 },
        ],
        total: 668.7,
        status: 'Paid',
        createdAt: daysAgo(19, 9, 0),
        submittedAt: daysAgo(19, 9, 30),
      },
      {
        id: 'wexp-4802',
        number: 'EXP-0004802',
        workerId: 'wd-alex',
        memo: 'Warehouse safety training supplies',
        lines: [{ date: d(9), category: 'Office Supplies', merchant: 'Staples', amount: 96.34 }],
        total: 96.34,
        status: 'Approved',
        createdAt: daysAgo(8, 14, 0),
        submittedAt: daysAgo(8, 14, 10),
      },
    ],
    'workday.goals': [
      { id: 'wgoal-alex-1', workerId: 'wd-alex', title: 'Raise warehouse SLA attainment to 97%', desc: 'Weekly SLA dashboard with carrier on-time drill-down; root-cause the Chicago DC misses.', category: 'Business', due: `${y}-12-31`, progress: 70, status: 'In Progress' },
      { id: 'wgoal-alex-2', workerId: 'wd-alex', title: 'Cut vendor invoice cycle time by 25%', desc: 'Move the top 20 vendors to PO-backed invoicing and 3-way match.', category: 'Business', due: `${y}-12-15`, progress: 45, status: 'In Progress' },
      { id: 'wgoal-alex-3', workerId: 'wd-alex', title: 'Onboard and ramp Jordan Ellis', desc: '30/60/90-day plan with Ben as onboarding buddy.', category: 'People', due: `${y + 1}-02-28`, progress: 10, status: 'In Progress' },
      { id: 'wgoal-ben-1', workerId: 'wd-ben', title: 'Ship warehouse dashboard v2', desc: 'Shipments-by-region drill-down and carrier performance chart.', category: 'Business', due: `${y}-11-30`, progress: 90, status: 'In Progress' },
      { id: 'wgoal-maya-1', workerId: 'wd-maya', title: 'Clear the vendor exceptions queue weekly', desc: '', category: 'Customer', due: `${y}-12-31`, progress: 60, status: 'In Progress' },
    ],
    'workday.feedback': [
      { id: 'wfb-1', fromId: 'priya', toWorkerId: 'wd-alex', badge: 'Above & Beyond', text: 'Thanks for turning around the peak-season staffing plan in two days — the Chicago team felt the difference immediately.', visibility: 'Public', at: daysAgo(12, 15, 0) },
      { id: 'wfb-2', fromId: 'ben', toWorkerId: 'wd-alex', badge: 'Team Player', text: 'Appreciate you covering the carrier call while I was out. Super clear notes.', visibility: 'Public', at: daysAgo(30, 10, 0) },
      { id: 'wfb-3', fromId: 'alex', toWorkerId: 'wd-maya', badge: 'Problem Solver', text: 'Great work untangling the Fabrikam duplicate invoices before month-end close.', visibility: 'Public', at: daysAgo(18, 11, 0) },
    ],
  }
}
