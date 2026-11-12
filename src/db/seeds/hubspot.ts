/**
 * HubSpot extras beyond the CRM core (contacts / companies / deals / lists / sequences / tasks / tickets live in sales.ts).
 * Records point at the sales-seed CRM records by their deterministic ids.
 *
 * hubspot.conversations: { id, channel: 'Chat'|'Email', contactId, subject, status: 'Open'|'Closed', ownerId: string|null, unread, createdAt,
 *                          lastMessageAt, ticketId?, messages: { kind: 'in'|'out'|'note', by: contactId|ownerId, body, date }[] }
 * hubspot.calls:         { id, contactId, dealId?, ownerId, date, durationSec, direction: 'Outbound'|'Inbound', outcome, notes, recorded }
 * hubspot.meetings:      { id, title, contactId, dealId?, ownerId, start, mins, location, outcome: 'Scheduled'|'Completed'|'No show'|'Rescheduled'|'Canceled', notes }
 * hubspot.products:      { id, name, sku, description, price, billing: 'One-time'|'Monthly'|'Annually', createdAt }
 * hubspot.quotes:        { id, number, title, dealId, contactId, ownerId, status: 'Draft'|'Sent'|'Viewed'|'Accepted'|'Declined', expires (YYYY-MM-DD),
 *                          createdAt, updatedAt, lines: { productId, name, price, qty, discount, billing }[], terms, comments }
 * hubspot.workflows:     { id, name, object: 'Deal'|'Contact'|'Ticket', trigger: { kind: 'deal_stage'|'lifecycle'|'ticket_created'|'form_submitted', value? },
 *                          actions: WfAction[] (see apps/hubspot/store.ts), enabled, ownerId, createdAt, updatedAt, enrolled, history: { recordName, date, result }[] }
 * hubspot.forms:         { id, name, type: 'Embedded'|'Pop-up'|'Standalone page', fields: { key, label, required }[], lifecycleOnSubmit, submissions, views,
 *                          ownerId, createdAt, updatedAt, recent: { contactId, date }[] }
 * hubspot.kb:            { id, title, category, status: 'Published'|'Draft', body, authorId, updatedAt, views, helpful }
 * hubspot.goals:         { id, ownerId, month: 'YYYY-MM', target }
 * hubspot.notifications: { id, title, body, date, read, route?: { page, id? } }
 */
import type { Collections } from '../db'
import { daysAgo, daysFromNow, hoursAgo, isoDate, minutesAgo } from '@/data/time'

const cid = (i: number) => String(51_204_000 + i * 137)
const did = (i: number) => String(9_812_000 + i * 53)
const C = { nora: 0, kevin: 1, isla: 4, marcus: 7, yuki: 8, harper: 16, oscar: 17, chloe: 18, jack: 19, ella: 20, ben: 21, scarlett: 22, grace: 24, lucas: 27, aria: 28, daniel: 29, elena: 30, sofia: 31, william: 32 }
const D = { contosoPharma: 0, datumRobotics: 1, proseware: 2, woodgrove: 3, relecloud: 4, trey: 5, vanarsdel: 6, coho: 7, adventure: 9, litware: 12, adatum: 15, cityPower: 16, lucerne: 17 }

const monthKey = (offset = 0) => {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() + offset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function seed(): Collections {
  /* ───────────── conversations inbox ───────────── */
  const conv = (id: string, channel: string, c: number, subject: string, status: string, ownerId: string | null, unread: boolean, msgs: [string, string, string, string][], ticketId?: string) => ({
    id,
    channel,
    contactId: cid(c),
    subject,
    status,
    ownerId,
    unread,
    ticketId,
    createdAt: msgs[0][3],
    lastMessageAt: msgs[msgs.length - 1][3],
    messages: msgs.map(([kind, by, body, date]) => ({ kind, by: by === 'C' ? cid(c) : by, body, date })),
  })
  const conversations = [
    conv('cv-1', 'Chat', C.yuki, 'Pricing for 3 distribution centers', 'Open', null, true, [
      ['in', 'C', 'Hi! We run 3 DCs and are comparing tools. Is pricing per site or per seat?', minutesAgo(18)],
      ['in', 'C', 'Also — do you integrate with Manhattan WMS?', minutesAgo(16)],
    ]),
    conv('cv-2', 'Email', C.ben, 'Re: Security questionnaire', 'Open', 'alex', true, [
      ['out', 'alex', 'Hi Benjamin — attaching our SOC 2 Type II report and the completed SIG Lite. Let me know what else your infosec team needs.', daysAgo(2, 15, 10)],
      ['in', 'C', 'Thanks Alex. Infosec has two follow-ups: (1) data retention for audit logs, (2) whether sub-processors are notified 30 days in advance.', hoursAgo(5)],
    ]),
    conv('cv-3', 'Chat', C.scarlett, 'Can’t add a new warehouse user', 'Open', 'ryan', false, [
      ['in', 'C', 'Hey, I am trying to add a new supervisor but the Invite button is greyed out.', hoursAgo(3)],
      ['out', 'ryan', 'Thanks Scarlett — that usually means the seat limit is reached. Let me check your plan.', hoursAgo(2.8)],
      ['note', 'ryan', 'VanArsdel is at 400/400 seats. Loop in Aisha for an expansion conversation?', hoursAgo(2.7)],
      ['in', 'C', 'Ok, thanks. We need this sorted before Monday’s shift change.', hoursAgo(2.5)],
    ]),
    conv('cv-4', 'Email', C.lucas, 'Partner portal go-live date', 'Open', 'aisha', false, [
      ['in', 'C', 'Hi Aisha, can you confirm the go-live date for the partner portal? Our agents need two weeks notice for training.', daysAgo(1, 10, 20)],
    ]),
    conv('cv-5', 'Chat', C.marcus, 'Demo request', 'Open', null, true, [
      ['in', 'C', 'Saw the webinar. Could someone show us the dispatch board? We have ~200 drivers.', minutesAgo(52)],
    ]),
    conv('cv-6', 'Email', C.william, 'Upgrade invoice question', 'Closed', 'ryan', false, [
      ['in', 'C', 'The upgrade invoice lists a one-time onboarding fee. I thought that was waived?', daysAgo(6, 9, 30)],
      ['out', 'ryan', 'You’re right William — the fee was waived in your order form. A corrected invoice is on its way.', daysAgo(6, 11, 0)],
      ['in', 'C', 'Got it, thank you!', daysAgo(5, 8, 45)],
    ]),
    conv('cv-7', 'Email', C.ella, 'Exporting shift reports', 'Closed', 'ryan', false, [
      ['in', 'C', 'Is there a way to schedule the weekly shift report as a PDF to our lab leads?', daysAgo(9, 14, 0)],
      ['out', 'ryan', 'Yes — Reports › Schedule › PDF. Here is a 2-minute guide: help.northwind.com/schedule-reports', daysAgo(9, 15, 20)],
    ]),
  ]

  /* ───────────── calls & meetings ───────────── */
  const callRows: [number, number | null, string, number, number, string][] = [
    [C.elena, D.adatum, 'alex', 0.2, 1260, 'Walked through redlines on the MSA. Legal wants a 12-month price lock. Sending revised order form tomorrow.'],
    [C.ben, D.woodgrove, 'alex', 1, 0, ''],
    [C.grace, D.relecloud, 'liam', 1.3, 640, 'RevOps team is evaluating us vs. two others. Decision by end of month.'],
    [C.chloe, D.adventure, 'liam', 2, 1820, 'Discovery call. 14 sites, SAP ECC, pain is manual replenishment.'],
    [C.aria, D.coho, 'aisha', 2.4, 0, ''],
    [C.jack, D.proseware, 'alex', 3, 980, 'Champion confirmed budget is approved for Q1.'],
    [C.isla, null, 'hannah', 3.5, 15, ''],
    [C.daniel, null, 'aisha', 4, 1500, 'QBR prep call. Usage up 18% QoQ. Wants to discuss expansion to EMEA.'],
    [C.kevin, D.datumRobotics, 'liam', 5, 420, 'Pilot plant identified (Lyon). Next: technical deep dive.'],
    [C.nora, D.contosoPharma, 'hannah', 6, 0, ''],
    [C.harper, D.lucerne, 'aisha', 7, 760, 'Renewal: wants multi-year discount. Asked for usage report.'],
    [C.oscar, null, 'liam', 8, 0, ''],
  ]
  const calls = callRows.map(([c, d, ownerId, ago, dur, notes], i) => ({
    id: `hscall-${i + 1}`,
    contactId: cid(c),
    dealId: d === null ? undefined : did(d),
    ownerId,
    date: daysAgo(ago, 9 + (i % 7), (i * 13) % 60),
    durationSec: dur,
    direction: i % 5 === 3 ? 'Inbound' : 'Outbound',
    outcome: dur === 0 ? (i % 2 ? 'No answer' : 'Left voicemail') : 'Connected',
    notes,
    recorded: dur > 300,
  }))

  const mt = (i: number, title: string, c: number, d: number | null, ownerId: string, start: string, mins: number, location: string, outcome: string, notes = '') => ({
    id: `hsmtg-${i}`,
    title,
    contactId: cid(c),
    dealId: d === null ? undefined : did(d),
    ownerId,
    start,
    mins,
    location,
    outcome,
    notes,
  })
  const meetings = [
    mt(1, 'Adatum — commercial review', C.elena, D.adatum, 'alex', daysFromNow(0, 15, 0), 45, 'Zoom', 'Scheduled'),
    mt(2, 'Woodgrove — security deep dive', C.ben, D.woodgrove, 'alex', daysFromNow(1, 11, 0), 60, 'Zoom', 'Scheduled'),
    mt(3, 'Adventure Works — solution demo', C.chloe, D.adventure, 'liam', daysFromNow(2, 14, 30), 60, 'Zoom', 'Scheduled'),
    mt(4, 'Contoso Ltd QBR', C.daniel, null, 'aisha', daysFromNow(3, 10, 0), 60, 'Contoso HQ, Seattle', 'Scheduled'),
    mt(5, 'Relecloud — pricing walkthrough', C.grace, D.relecloud, 'liam', daysFromNow(5, 16, 0), 30, 'Phone', 'Scheduled'),
    mt(6, 'Proseware — kickoff planning', C.jack, D.proseware, 'alex', daysAgo(1, 13, 0), 45, 'Zoom', 'Completed', 'Agreed on a 6-week rollout, first site Feb 3.'),
    mt(7, 'Lucerne — renewal options', C.harper, D.lucerne, 'aisha', daysAgo(3, 9, 30), 30, 'Zoom', 'Completed', 'Presented 2- and 3-year options.'),
    mt(8, 'A. Datum Robotics — intro', C.kevin, D.datumRobotics, 'liam', daysAgo(6, 15, 0), 30, 'Phone', 'No show'),
    mt(9, 'Lamna — discovery', C.isla, null, 'hannah', daysAgo(8, 11, 0), 30, 'Zoom', 'Rescheduled'),
  ]

  /* ───────────── products & quotes ───────────── */
  const products = [
    ['Ops Cloud — Professional (per seat)', 'OPS-PRO', 'Core scheduling, task management and dashboards.', 45, 'Monthly'],
    ['Ops Cloud — Enterprise (per seat)', 'OPS-ENT', 'Everything in Pro plus SSO, audit logs, sandbox and advanced permissions.', 72, 'Monthly'],
    ['Site license — additional location', 'SITE-ADD', 'Adds one physical site with its own calendars and devices.', 4_800, 'Annually'],
    ['Implementation — standard', 'IMP-STD', 'Up to 6 weeks of guided onboarding with a solutions engineer.', 18_000, 'One-time'],
    ['Implementation — enterprise', 'IMP-ENT', 'Dedicated implementation team, data migration and custom integrations.', 45_000, 'One-time'],
    ['Premium support', 'SUP-PREM', '24/7 support, 1-hour P1 response, named CSM.', 1_500, 'Monthly'],
    ['Training workshop (on-site)', 'TRN-ONS', 'Full-day on-site workshop for up to 20 people.', 3_500, 'One-time'],
    ['API & integrations add-on', 'API-ADD', 'Higher API limits and premium connectors (SAP, Oracle, Workday).', 900, 'Monthly'],
  ].map(([name, sku, description, price, billing], i) => ({ id: `hsprod-${i + 1}`, name, sku, description, price, billing, createdAt: daysAgo(200 - i * 9) }))
  const P = (i: number, qty: number, discount = 0) => ({ productId: products[i].id, name: products[i].name, price: products[i].price as number, qty, discount, billing: products[i].billing })
  const quotes = [
    { id: 'hsq-1', number: 'Q-1041', title: 'Adatum Corporation — Ops Cloud Enterprise', dealId: did(D.adatum), contactId: cid(C.elena), ownerId: 'alex', status: 'Sent', expires: isoDate(daysFromNow(21)), createdAt: daysAgo(4), updatedAt: daysAgo(3), lines: [P(1, 150, 10), P(4, 1), P(5, 1)], terms: 'Net 30. Prices locked for 12 months from signature.', comments: 'Includes 10% multi-site discount discussed on Oct call.' },
    { id: 'hsq-2', number: 'Q-1038', title: 'Woodgrove Bank — Back-office automation', dealId: did(D.woodgrove), contactId: cid(C.ben), ownerId: 'alex', status: 'Viewed', expires: isoDate(daysFromNow(9)), createdAt: daysAgo(10), updatedAt: daysAgo(1), lines: [P(1, 220, 12), P(4, 1), P(7, 1)], terms: 'Net 45.', comments: '' },
    { id: 'hsq-3', number: 'Q-1035', title: 'Coho Winery — Renewal FY27', dealId: did(D.coho), contactId: cid(C.aria), ownerId: 'aisha', status: 'Accepted', expires: isoDate(daysAgo(2)), createdAt: daysAgo(30), updatedAt: daysAgo(8), lines: [P(0, 60, 5), P(5, 1)], terms: 'Net 30.', comments: '' },
    { id: 'hsq-4', number: 'Q-1044', title: 'Relecloud — RevOps Automation', dealId: did(D.relecloud), contactId: cid(C.grace), ownerId: 'liam', status: 'Draft', expires: isoDate(daysFromNow(30)), createdAt: daysAgo(1), updatedAt: hoursAgo(20), lines: [P(0, 80), P(3, 1)], terms: 'Net 30.', comments: '' },
    { id: 'hsq-5', number: 'Q-1029', title: 'Fourth Coffee — Roastery Pilot', dealId: did(13), contactId: cid(C.oscar), ownerId: 'liam', status: 'Declined', expires: isoDate(daysAgo(12)), createdAt: daysAgo(40), updatedAt: daysAgo(15), lines: [P(0, 25), P(6, 1)], terms: 'Net 30.', comments: 'Customer chose to stay on spreadsheets this year.' },
  ]

  /* ───────────── automation ───────────── */
  const workflows = [
    {
      id: 'wf-1', name: 'Deal won → onboarding handoff', object: 'Deal', trigger: { kind: 'deal_stage', value: 'Closed Won' },
      actions: [
        { kind: 'task', title: 'Schedule kickoff for {name}', dueInDays: 2, priority: 'High', assignTo: 'owner' },
        { kind: 'notify', title: 'Deal won: {name}', body: 'Customer Success has been notified to start onboarding.' },
      ],
      enabled: true, ownerId: 'aisha', createdAt: daysAgo(120), updatedAt: daysAgo(20), enrolled: 14,
      history: [{ recordName: 'Litware — Upgrade', date: daysAgo(5, 16, 2), result: 'Created task · Sent notification' }, { recordName: 'Coho Winery — Renewal', date: daysAgo(8, 10, 40), result: 'Created task · Sent notification' }],
    },
    {
      id: 'wf-2', name: 'Contract sent → follow-up in 3 days', object: 'Deal', trigger: { kind: 'deal_stage', value: 'Contract Sent' },
      actions: [{ kind: 'task', title: 'Follow up on contract for {name}', dueInDays: 3, priority: 'Medium', assignTo: 'owner' }, { kind: 'set_property', field: 'priority', value: 'High' }],
      enabled: true, ownerId: 'alex', createdAt: daysAgo(90), updatedAt: daysAgo(30), enrolled: 22,
      history: [{ recordName: 'Lucerne Publishing — Renewal', date: daysAgo(4, 9, 12), result: 'Created task · Set Priority to High' }],
    },
    {
      id: 'wf-3', name: 'New SQL → assign to sales & notify', object: 'Contact', trigger: { kind: 'lifecycle', value: 'Sales Qualified Lead' },
      actions: [{ kind: 'set_property', field: 'leadStatus', value: 'Open' }, { kind: 'task', title: 'Call {name} within 24h', dueInDays: 1, priority: 'High', assignTo: 'owner' }, { kind: 'notify', title: 'New SQL: {name}', body: 'Lead status set to Open and a call task was created.' }],
      enabled: true, ownerId: 'hannah', createdAt: daysAgo(160), updatedAt: daysAgo(12), enrolled: 37, history: [],
    },
    {
      id: 'wf-4', name: 'High-priority ticket → alert support lead', object: 'Ticket', trigger: { kind: 'ticket_created' },
      actions: [{ kind: 'notify', title: 'New ticket: {name}', body: 'A new ticket was created — triage within 1 hour.' }],
      enabled: false, ownerId: 'ryan', createdAt: daysAgo(60), updatedAt: daysAgo(60), enrolled: 0, history: [],
    },
    {
      id: 'wf-5', name: 'Demo request form → MQL', object: 'Contact', trigger: { kind: 'form_submitted', value: 'form-2' },
      actions: [{ kind: 'set_property', field: 'lifecycleStage', value: 'Marketing Qualified Lead' }, { kind: 'set_property', field: 'leadStatus', value: 'New' }, { kind: 'task', title: 'Book demo with {name}', dueInDays: 1, priority: 'High', assignTo: 'owner' }],
      enabled: true, ownerId: 'hannah', createdAt: daysAgo(75), updatedAt: daysAgo(7), enrolled: 58, history: [],
    },
  ]
  const forms = [
    { id: 'form-1', name: 'Newsletter sign-up — Ops Weekly', type: 'Embedded', fields: [{ key: 'email', label: 'Email', required: true }, { key: 'firstName', label: 'First name', required: false }], lifecycleOnSubmit: 'Subscriber', submissions: 1284, views: 18_940, ownerId: 'hannah', createdAt: daysAgo(400), updatedAt: daysAgo(40), recent: [{ contactId: cid(13), date: daysAgo(2) }, { contactId: cid(15), date: daysAgo(4) }] },
    { id: 'form-2', name: 'Request a demo', type: 'Standalone page', fields: [{ key: 'firstName', label: 'First name', required: true }, { key: 'lastName', label: 'Last name', required: true }, { key: 'email', label: 'Work email', required: true }, { key: 'company', label: 'Company', required: true }, { key: 'jobTitle', label: 'Job title', required: false }, { key: 'phone', label: 'Phone number', required: false }], lifecycleOnSubmit: 'Marketing Qualified Lead', submissions: 312, views: 4_210, ownerId: 'hannah', createdAt: daysAgo(300), updatedAt: daysAgo(7), recent: [{ contactId: cid(C.marcus), date: hoursAgo(1) }, { contactId: cid(C.yuki), date: daysAgo(1) }] },
    { id: 'form-3', name: 'Webinar registration — AI-Powered Operations Summit', type: 'Embedded', fields: [{ key: 'firstName', label: 'First name', required: true }, { key: 'lastName', label: 'Last name', required: true }, { key: 'email', label: 'Email', required: true }, { key: 'company', label: 'Company', required: false }], lifecycleOnSubmit: 'Lead', submissions: 486, views: 6_002, ownerId: 'hannah', createdAt: daysAgo(45), updatedAt: daysAgo(20), recent: [] },
    { id: 'form-4', name: 'Pricing page — talk to sales (pop-up)', type: 'Pop-up', fields: [{ key: 'email', label: 'Work email', required: true }, { key: 'company', label: 'Company', required: false }], lifecycleOnSubmit: 'Lead', submissions: 97, views: 9_870, ownerId: 'liam', createdAt: daysAgo(80), updatedAt: daysAgo(30), recent: [] },
  ]

  /* ───────────── knowledge base ───────────── */
  const kb = [
    ['Schedule a report as a recurring PDF', 'Reports & analytics', 'Published', 'ryan', 1830, 92, 'Any saved report can be emailed on a schedule.\n\n1. Open Reports and select the report.\n2. Click Schedule › Email as PDF.\n3. Pick recipients, frequency and time zone, then Save.\n\nRecipients do not need a Northwind seat to receive scheduled PDFs.'],
    ['Why is the Invite user button disabled?', 'Users & permissions', 'Published', 'ryan', 2410, 88, 'The Invite button is disabled when your workspace has used every paid seat.\n\nTo free a seat, deactivate a user under Settings › Users. To add seats, ask your account owner or contact your Customer Success Manager.'],
    ['Set up SSO with Okta or Entra ID', 'Security', 'Published', 'ryan', 1204, 95, 'Northwind supports SAML 2.0 SSO on the Enterprise plan.\n\n1. In Settings › Security, click Configure SSO.\n2. Copy the ACS URL and Entity ID into your identity provider.\n3. Upload the IdP metadata XML and click Test connection.\n\nMultiple IdP tenants can map to one workspace — contact support to enable this.'],
    ['Data residency regions', 'Security', 'Published', 'aisha', 640, 81, 'Customer data can be hosted in US, EU (Frankfurt) or APAC (Singapore). All primary data, backups and search indices stay in-region. Support access is logged and follows the region you selected.'],
    ['Fixing login loops on Android', 'Mobile app', 'Draft', 'ryan', 0, 0, 'If the app returns to the sign-in screen after you log in:\n\n1. Update to version 6.4.2 or later.\n2. Clear the app cache (Settings › Apps › Northwind › Storage).\n3. Sign in again.\n\nWe are tracking a fix for devices with battery optimisation enabled.'],
    ['Understanding your invoice', 'Billing', 'Published', 'aisha', 980, 77, 'Invoices list seats, add-ons and one-time services separately. Seat counts are taken on the 1st of each month. One-time fees waived in your order form appear with a 100% discount line.'],
    ['Bulk reassign tasks when someone leaves', 'Tasks', 'Draft', 'liam', 0, 0, 'Open Tasks, filter by the departing owner, select all and choose Assign › New owner.'],
  ].map(([title, category, status, authorId, views, helpful, body], i) => ({ id: `kb-${i + 1}`, title, category, status, authorId, views, helpful, body, updatedAt: daysAgo(3 + i * 6) }))

  /* ───────────── goals & notifications ───────────── */
  const goals = ['alex', 'hannah', 'liam', 'aisha'].flatMap((ownerId, i) => [-2, -1, 0, 1].map((m) => ({ id: `goal-${ownerId}-${m + 2}`, ownerId, month: monthKey(m), target: [180_000, 90_000, 140_000, 120_000][i] })))
  const notifications = [
    { id: 'ntf-1', title: 'Yuki Sato started a chat', body: '“Hi! We run 3 DCs and are comparing tools…”', date: minutesAgo(18), read: false, route: { page: 'inbox', id: 'cv-1' } },
    { id: 'ntf-2', title: 'Quote Q-1038 was viewed', body: 'Benjamin Hall opened “Woodgrove Bank — Back-office automation”.', date: daysAgo(1, 16, 5), read: false, route: { page: 'quote', id: 'hsq-2' } },
    { id: 'ntf-3', title: 'Workflow “Deal won → onboarding handoff” ran', body: 'Litware — Upgrade enrolled.', date: daysAgo(5, 16, 2), read: true, route: { page: 'workflow', id: 'wf-1' } },
  ]

  return {
    'hubspot.conversations': conversations,
    'hubspot.calls': calls,
    'hubspot.meetings': meetings,
    'hubspot.products': products,
    'hubspot.quotes': quotes,
    'hubspot.workflows': workflows,
    'hubspot.forms': forms,
    'hubspot.kb': kb,
    'hubspot.goals': goals,
    'hubspot.notifications': notifications,
  }
}
