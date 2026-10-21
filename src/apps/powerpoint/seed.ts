/**
 * PowerPoint seed — collection `powerpoint.decks`.
 * Record: { id, name, modified, theme?, author?, slides: Slide[], createdBy?, updatedBy? }
 * Slide:  { id, layout, title, subtitle?, bullets: string[], bullets2?, headings?, notes?, chart?, kpis?, createdBy?, createdAt? }
 */
import { daysAgo, hoursAgo, fmtDate, today } from '@/data/time'

export function pptSeed(): Record<string, any[]> {
  const reviewDate = fmtDate(today(), { month: 'long', day: 'numeric', year: 'numeric' })
  const s = (deck: string, i: number, rest: Record<string, any>) => ({ id: `${deck}-s${i}`, bullets: [], ...rest })
  return {
    'powerpoint.decks': [
      {
        id: 'deck-q3-ops',
        name: 'Q3 Operations Review.pptx',
        theme: 'northwind',
        author: 'Alex Morgan',
        modified: hoursAgo(5),
        footer: 'Northwind Global | Q3 FY25 Operations Review',
        slides: [
          s('deck-q3-ops', 1, {
            layout: 'title',
            title: 'Q3 FY25 Operations Review',
            subtitle: `Operations Leadership · Priya Raman, VP Operations · Alex Morgan, Operations Manager\n${reviewDate}`,
            notes: 'Welcome everyone. Today we will walk through Q3 performance, vendor spend, order volume trends, the risks we are tracking, and our Q4 priorities going into peak season.',
          }),
          s('deck-q3-ops', 2, {
            layout: 'titleContent',
            title: 'Agenda',
            bullets: [
              'Q3 at a glance — KPI scorecard',
              'Vendor spend by category',
              'Monthly order volume vs. prior year',
              'Highlights and wins',
              'Risks and mitigations',
              'Q4 priorities and next steps',
            ],
            notes: 'About 30 minutes, leaving 15 for discussion at the end.',
          }),
          s('deck-q3-ops', 3, {
            layout: 'kpis',
            title: 'Q3 at a glance: service up, cost down',
            kpis: [
              { label: 'On-time delivery', value: '96.2%', delta: '+1.4 pts vs Q2' },
              { label: 'Order cycle time', value: '2.8 days', delta: '−0.3 days vs Q2' },
              { label: 'Warehouse SLA', value: '98.1%', delta: '+0.6 pts vs Q2' },
              { label: 'Cost per order', value: '$4.12', delta: '−$0.21 vs Q2' },
            ],
            bullets: ['All four headline KPIs improved quarter over quarter', 'Chicago DC remains the main drag on cycle time (3.1 days)'],
            notes: 'Every headline KPI moved in the right direction. The cycle-time improvement is mostly Boston and Austin; Chicago is still above target because of the scanner outages in September.',
          }),
          s('deck-q3-ops', 4, {
            layout: 'chart',
            title: 'Vendor spend by category',
            chart: {
              type: 'bar',
              series: ['Q3 spend'],
              data: [
                { name: 'Logistics', value: 1380000 },
                { name: 'IT & Software', value: 684000 },
                { name: 'Facilities', value: 412000 },
                { name: 'Prof. Services', value: 296000 },
                { name: 'Marketing Svcs', value: 241000 },
                { name: 'Office & Supplies', value: 118000 },
              ],
            },
            bullets: ['Total Q3 vendor spend: $3.13M', 'Logistics is 44% of spend — carrier rates renegotiated in August', 'IT & Software up 9% on WMS licence true-up'],
            notes: 'Logistics dominates as expected. The August carrier renegotiation will show up fully in Q4 numbers.',
          }),
          s('deck-q3-ops', 5, {
            layout: 'chart',
            title: 'Monthly order volume vs. prior year',
            chart: {
              type: 'line',
              series: ['FY25', 'FY24'],
              data: [
                { name: 'Apr', value: 182400, value2: 171200 },
                { name: 'May', value: 189900, value2: 176800 },
                { name: 'Jun', value: 194300, value2: 180100 },
                { name: 'Jul', value: 201700, value2: 184600 },
                { name: 'Aug', value: 213500, value2: 190300 },
                { name: 'Sep', value: 226800, value2: 197900 },
              ],
            },
            bullets: ['Q3 orders up 11.8% year over year', 'September was a record month: 226.8K orders', 'Peak forecast: +18% vs. last year'],
            notes: 'Volume growth accelerated through the quarter. We are planning peak capacity against +18%.',
          }),
          s('deck-q3-ops', 6, {
            layout: 'titleContent',
            title: 'Highlights and wins',
            bullets: [
              'Carrier contract renegotiation saves an estimated $310K a year',
              'Austin DC hit 99.2% warehouse SLA, best in the network',
              'Order-exception backlog cut from 1,240 to 310 open items',
              'Zero P1 incidents longer than 4 hours for the second quarter running',
              'Fabrikam corrective plan agreed, with weekly OTD reporting',
            ],
            notes: 'Call out the Austin team: Maya will share their pick-path changes with Chicago.',
          }),
          s('deck-q3-ops', 7, {
            layout: 'twoContent',
            title: 'Risks and mitigations',
            headings: ['Risks', 'Mitigations'],
            bullets: [
              'Peak volume 18% above last year',
              'Fabrikam on-time delivery at 91.4%',
              'Chicago scanner reliability',
              'Temporary labor availability in Austin',
            ],
            bullets2: [
              'Carrier capacity commitments signed by Oct 31',
              'Secondary packaging supplier qualified as backup',
              'Zebra TC58 replacements deployed this month',
              'Two staffing agencies contracted, start Nov 4',
            ],
            notes: 'Each risk has a named owner in the Q4 plan.',
          }),
          s('deck-q3-ops', 8, {
            layout: 'titleContent',
            title: 'Q4 priorities and next steps',
            bullets: [
              'Protect service through peak: on-time delivery ≥ 96%',
              'Automate order-exception triage (pilot in November)',
              'Consolidate packaging vendors from five to three',
              'Roll out the Power BI KPI scorecard to all site managers',
              'Next review: Q4 mid-quarter check-in, first week of December',
            ],
            notes: 'Ask for approval on the exception-triage pilot budget.',
          }),
        ],
      },
      {
        id: 'deck-onboarding',
        name: 'Northwind Ops Onboarding.pptx',
        theme: 'northwind',
        author: 'Maya Johnson',
        modified: daysAgo(3, 10, 20),
        footer: 'Northwind Global | Operations Onboarding',
        slides: [
          s('deck-onboarding', 1, { layout: 'title', title: 'Welcome to Northwind Operations', subtitle: 'New hire orientation · Operations team, Boston HQ' }),
          s('deck-onboarding', 2, {
            layout: 'titleContent',
            title: 'Who we are',
            bullets: ['Three distribution centers: Boston, Chicago, Austin', '~640,000 orders shipped per quarter', '42 people across planning, fulfillment and vendor management'],
          }),
          s('deck-onboarding', 3, {
            layout: 'titleContent',
            title: 'Your first 30 days',
            bullets: ['Week 1: accounts, equipment and orientation', 'Week 2: systems — SAP, ServiceNow, Power BI, Coupa', 'Weeks 3–4: own the weekly vendor-performance report'],
          }),
          s('deck-onboarding', 4, { layout: 'closing', title: 'Questions?', subtitle: 'Alex Morgan · alex.morgan@northwind.com · #ops-team on Teams' }),
        ],
      },
      {
        id: 'deck-fabrikam',
        name: 'Vendor QBR - Fabrikam.pptx',
        theme: 'northwind',
        author: 'Lucas Moreau',
        modified: daysAgo(6, 15, 45),
        footer: 'Northwind Global | Fabrikam Supplies QBR',
        slides: [
          s('deck-fabrikam', 1, { layout: 'title', title: 'Fabrikam Supplies — Quarterly Business Review', subtitle: 'Q3 FY25 · Northwind Procurement & Operations' }),
          s('deck-fabrikam', 2, {
            layout: 'kpis',
            title: 'Q3 performance',
            kpis: [
              { label: 'On-time delivery', value: '91.4%', delta: '−2.8 pts vs Q2' },
              { label: 'Invoice accuracy', value: '97.8%', delta: '−0.9 pts vs Q2' },
              { label: 'Q3 spend', value: '$412.6K', delta: '+6% vs Q2' },
              { label: 'Open credits', value: '$8,240', delta: 'since August' },
            ],
            bullets: ['On-time delivery below the 95% contractual target'],
          }),
          s('deck-fabrikam', 3, {
            layout: 'chart',
            title: 'On-time delivery trend',
            chart: {
              type: 'line',
              series: ['OTD %', 'Target'],
              data: [
                { name: 'Apr', value: 95.1, value2: 95 },
                { name: 'May', value: 94.6, value2: 95 },
                { name: 'Jun', value: 93.0, value2: 95 },
                { name: 'Jul', value: 89.7, value2: 95 },
                { name: 'Aug', value: 90.8, value2: 95 },
                { name: 'Sep', value: 93.6, value2: 95 },
              ],
            },
            bullets: ['July dip caused by carrier change at Dallas facility', 'Recovery under way in September'],
          }),
          s('deck-fabrikam', 4, {
            layout: 'titleContent',
            title: 'Action items',
            bullets: ['Weekly OTD report every Monday until 4 weeks above 95%', 'Corrected invoices for INV-20931, INV-21007, INV-21044', 'Apply $8,240 credit memo by end of month'],
          }),
          s('deck-fabrikam', 5, { layout: 'closing', title: 'Thank you', subtitle: 'Lucas Moreau · Procurement Specialist · lucas.moreau@northwind.com' }),
        ],
      },
    ],
  }
}
