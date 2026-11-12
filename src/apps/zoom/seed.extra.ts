/** Extra Zoom seed data (Docs, Whiteboards, Notes) — appended to the demo DB by src/db/seeds/extras.ts. */
import type { Collections } from '@/db/db'
import { daysAgo, hoursAgo } from '@/data/time'

export function seed(): Collections {
  return {
    'zoom.docs': [
      {
        id: 'zd-contoso-qbr',
        title: 'Contoso QBR (Q3) — notes',
        ownerId: 'alex',
        updated: daysAgo(20, 16, 10),
        created: daysAgo(20, 16, 0),
        starred: true,
        body: 'Attendees: Kate Sullivan, Daniel Reyes, Liam O’Connor, Alex Morgan\n\nAdoption\n• 392 / 400 seats active (98%)\n• Reporting time down from 2 days to 20 minutes\n\nRenewal\n• Kate prefers a 3-year term with a price lock\n• Wants Premier Success bundled\n\nExpansion\n• Daniel evaluating ~120 APAC seats (Singapore, Sydney) for H1\n\nNext steps\n• Alex — renewal proposal with price lock\n• Liam — APAC rollout plan',
      },
      {
        id: 'zd-pipeline-review',
        title: 'Weekly pipeline review — agenda',
        ownerId: 'rachel',
        updated: hoursAgo(26),
        created: daysAgo(30),
        body: '1. Forecast changes since last week (Commit / Best Case)\n2. Deals slipping out of the quarter\n3. Stuck deals — no activity in 14 days\n4. Help needed / deal desk asks',
      },
      {
        id: 'zd-webinar-runbook',
        title: 'AI-Powered Ops Summit — webinar runbook',
        ownerId: 'hannah',
        updated: daysAgo(8, 15, 0),
        created: daysAgo(21),
        body: 'Run of show\n• 10:55 — panelists join, sound check\n• 11:00 — welcome (Hannah)\n• 11:05 — 2026 Operations Benchmark (Rachel)\n• 11:24 — live demo (Alex)\n• 11:45 — Q&A\n\nAfter the event: send slides + recording to registrants, enroll attendees in the follow-up sequence.',
      },
      {
        id: 'zd-fabrikam-discovery',
        title: 'Fabrikam plant ops discovery',
        ownerId: 'liam',
        updated: daysAgo(11, 14, 0),
        created: daysAgo(11, 13, 45),
        body: 'Scope: 3 additional plants (Texas + Mexico), ~420 seats.\nMust-have: bi-directional SAP PM work-order sync.\nBudget approved for FY27 Q1.',
      },
    ],
    'zoom.whiteboards': [
      {
        id: 'zwb-apac-rollout',
        title: 'APAC rollout — phasing',
        ownerId: 'liam',
        updated: daysAgo(3),
        strokes: [
          { color: '#0B5CFF', w: 4, pts: [[80, 220], [260, 220]] },
          { color: '#0B5CFF', w: 4, pts: [[300, 220], [480, 220]] },
          { color: '#0B5CFF', w: 4, pts: [[520, 220], [700, 220]] },
          { color: '#00A35C', w: 6, pts: [[80, 150], [120, 120], [160, 150], [200, 120], [240, 150]] },
          { color: '#E02828', w: 4, pts: [[600, 300], [650, 350], [700, 300]] },
        ],
      },
    ],
    'zoom.notes': [
      { id: 'zn-1', text: 'Ask Kate about Premier Success renewal date alignment', color: '#FFF4B8', updated: hoursAgo(5) },
      { id: 'zn-2', text: 'Adatum CIO call — prep 250-seat pricing (annual vs 3-yr)', color: '#DCE8FF', updated: hoursAgo(2) },
    ],
  }
}
