/**
 * Extra Concur data (new collections only — nothing here touches the shared finance seed).
 *
 * concur.requests:      { id, ownerId, owner, name, number, purpose, destination, start, end, status, approver, lines: [{ id, type, amount }], comment?, history?, reportId? }
 * concur.teamReports:   { id, employeeId, employee, name, number, purpose, submittedAt, status, total, expenses: [...], exceptions?: string[], history?: [] }
 * concur.trips:         { id, name, kind: 'flight'|'hotel'|'car', detail, start, end, amount, status, conf, requestId? }
 * concur.quickExpenses: { id, manual: true, suggestedType, vendor, city, date, amount, paymentType, receipt, receiptName?, comment }
 * concur.delegates:     { id, personId, name, email, canPrepare, canSubmit, canViewReceipts, canApprove }
 * concur.settings:      { id: 'me' | 'appcenter', ... }
 */
import type { Collections } from '@/db/db'
import { daysAgo, daysFromNow, isoDate } from '@/data/time'

export function seed(): Collections {
  const lines = (a: [string, number][]) => a.map(([type, amount], i) => ({ id: `rl-${i}`, type, amount }))
  return {
    'concur.requests': [
      {
        id: 'creq-201', ownerId: 'alex', owner: 'Alex Morgan', name: 'Q1 Supplier Summit — Dallas', number: '3F7A', purpose: 'Annual facilities supplier summit hosted by Fabrikam',
        destination: 'Dallas, Texas', start: isoDate(daysFromNow(24)), end: isoDate(daysFromNow(26)), status: 'Not Submitted', approver: 'Priya Raman',
        lines: lines([['Airfare', 420], ['Hotel', 540], ['Taxi/Rideshare', 80], ['Business Meals', 150]]), createdAt: daysAgo(1, 10, 0),
      },
      {
        id: 'creq-202', ownerId: 'alex', owner: 'Alex Morgan', name: 'Chicago Client Visit — Oct', number: '3F2C', purpose: 'Adatum Corporation client visit & operations walkthrough',
        destination: 'Chicago, Illinois', start: isoDate(daysAgo(6)), end: isoDate(daysAgo(2)), status: 'Approved', approver: 'Priya Raman',
        lines: lines([['Airfare', 500], ['Hotel', 650], ['Business Meals', 200], ['Taxi/Rideshare', 60]]), createdAt: daysAgo(18, 9, 0),
        history: [{ at: daysAgo(18, 9, 5), by: 'Alex Morgan', text: 'Submitted' }, { at: daysAgo(17, 14, 20), by: 'Priya Raman', text: 'Approved' }],
      },
      {
        id: 'creq-203', ownerId: 'alex', owner: 'Alex Morgan', name: 'Ops leadership offsite — Austin', number: '3F9D', purpose: 'Q1 operations planning offsite',
        destination: 'Austin, Texas', start: isoDate(daysFromNow(40)), end: isoDate(daysFromNow(42)), status: 'Submitted & Pending Approval', approver: 'Priya Raman',
        lines: lines([['Airfare', 380], ['Hotel', 600], ['Meeting Room Rental', 250]]), createdAt: daysAgo(3, 11, 0),
        history: [{ at: daysAgo(3, 11, 10), by: 'Alex Morgan', text: 'Submitted' }],
      },
      {
        id: 'creq-204', ownerId: 'ben', owner: 'Ben Carter', name: 'Atlanta DC site audit', number: '3FB1', purpose: 'Quarterly safety & inventory audit at the Atlanta distribution center',
        destination: 'Atlanta, Georgia', start: isoDate(daysFromNow(10)), end: isoDate(daysFromNow(12)), status: 'Submitted & Pending Approval', approver: 'Alex Morgan',
        lines: lines([['Airfare', 360], ['Hotel', 420], ['Car Rental', 140], ['Individual Meals', 120]]), createdAt: daysAgo(2, 15, 0),
        history: [{ at: daysAgo(2, 15, 5), by: 'Ben Carter', text: 'Submitted' }],
      },
      {
        id: 'creq-205', ownerId: 'maya', owner: 'Maya Johnson', name: 'ProcureCon East — Boston', number: '3FC4', purpose: 'Procurement conference (local, registration only)',
        destination: 'Boston, Massachusetts', start: isoDate(daysFromNow(18)), end: isoDate(daysFromNow(19)), status: 'Submitted & Pending Approval', approver: 'Alex Morgan',
        lines: lines([['Conference/Seminar Fees', 895], ['Parking', 60]]), createdAt: daysAgo(1, 16, 0),
        history: [{ at: daysAgo(1, 16, 2), by: 'Maya Johnson', text: 'Submitted' }],
      },
    ],
    'concur.teamReports': [
      {
        id: 'ctr-301', employeeId: 'ben', employee: 'Ben Carter', name: 'Newark DC audit — Oct', number: '8MZ41Q', purpose: 'Inventory audit at the Newark distribution center',
        submittedAt: daysAgo(2, 17, 40), status: 'Submitted & Pending Approval', total: 1046.83,
        expenses: [
          { id: 'tre-1', type: 'Airfare', vendor: 'United Airlines', city: 'Newark, New Jersey', date: daysAgo(9), amount: 312.4, receipt: true },
          { id: 'tre-2', type: 'Hotel', vendor: 'Hilton Newark Airport', city: 'Newark, New Jersey', date: daysAgo(7), amount: 489.0, receipt: true },
          { id: 'tre-3', type: 'Car Rental', vendor: 'Hertz', city: 'Newark, New Jersey', date: daysAgo(7), amount: 176.23, receipt: true },
          { id: 'tre-4', type: 'Individual Meals', vendor: 'Hudson News & Cafe', city: 'Newark, New Jersey', date: daysAgo(7), amount: 69.2, receipt: false },
        ],
        exceptions: ['Receipt missing for Individual Meals $69.20 (receipt required over $25.00).'],
      },
      {
        id: 'ctr-302', employeeId: 'maya', employee: 'Maya Johnson', name: 'Team lunch & supplies', number: '8MZ47T', purpose: 'Ops team monthly lunch; whiteboard supplies',
        submittedAt: daysAgo(1, 9, 15), status: 'Submitted & Pending Approval', total: 286.75,
        expenses: [
          { id: 'tre-5', type: 'Business Meals', vendor: 'Flour Bakery + Cafe', city: 'Boston, Massachusetts', date: daysAgo(4), amount: 214.5, receipt: true, attendees: 7 },
          { id: 'tre-6', type: 'Office Supplies', vendor: 'Staples', city: 'Boston, Massachusetts', date: daysAgo(5), amount: 72.25, receipt: true },
        ],
      },
      {
        id: 'ctr-303', employeeId: 'ben', employee: 'Ben Carter', name: 'September mileage', number: '8MY90B', purpose: 'Local supplier visits', submittedAt: daysAgo(30, 10, 0),
        status: 'Approved', total: 98.65,
        expenses: [{ id: 'tre-7', type: 'Personal Car Mileage', vendor: 'Mileage — 147 mi', city: 'Boston, Massachusetts', date: daysAgo(33), amount: 98.65, receipt: false }],
        history: [{ at: daysAgo(29, 11, 0), by: 'Alex Morgan', text: 'Approved' }],
      },
    ],
    'concur.trips': [
      { id: 'ctp-401', name: 'Ops leadership offsite — Austin', kind: 'flight', detail: 'Southwest 1452 · BOS → AUS · Wanna Get Away', start: daysFromNow(40, 7, 5), end: daysFromNow(42, 18, 40), amount: 386.4, status: 'Booked', conf: 'SWX4QH', requestId: 'creq-203' },
    ],
    'concur.quickExpenses': [],
    'concur.delegates': [
      { id: 'cdl-1', personId: 'maya', name: 'Maya Johnson', email: 'maya.johnson@northwind.com', canPrepare: true, canSubmit: false, canViewReceipts: true, canApprove: false },
    ],
    'concur.settings': [
      { id: 'me', defaultPayment: 'American Express Corporate', notifyApprover: true, notifyStatus: true, notifyReceipts: true, homeAirport: 'BOS — Boston Logan', seat: 'Aisle', mileageVehicle: 'Personal car — 2022 Subaru Outback' },
      { id: 'appcenter', connected: ['uber', 'tripit'] },
    ],
  }
}
