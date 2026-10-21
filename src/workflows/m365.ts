import type { Workflow } from '@/agent/types'
import { db } from '@/db/db'
import { person } from '@/data/people'
import { CATEGORY_BUDGET_Q3, VENDORS, VENDOR_CATEGORIES } from '@/apps/excel/seed'

const k = (n: number) => (Math.abs(n) >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : `$${Math.round(n / 1000).toLocaleString('en-US')}K`)
const pct = (n: number) => `${n >= 0 ? '+' : ''}${(n * 100).toFixed(1)}%`
const signed = (n: number) => `${n >= 0 ? '+' : '−'}${k(Math.abs(n))}`

function newestEmail(pred: (e: any) => boolean) {
  return db
    .get<any>('outlook.emails')
    .filter(pred)
    .sort((a, b) => +new Date(b.date) - +new Date(a.date))[0]?.id
}
const isToday = (iso: string) => new Date(iso).toDateString() === new Date().toDateString()

/** Q3 vendor spend summary computed from the seeded workbook data (same numbers the SUMIF formulas produce). */
function spendSummary() {
  const wb = db.find<any>('excel.workbooks', 'wb-vendor-spend')
  const cells = wb?.sheets?.[0]?.cells ?? {}
  // read actuals/budgets per vendor from the live sheet (falls back to seed constants)
  const rows = VENDORS.map((v, i) => {
    const r = i + 2
    const actual = Number(cells[`F${r}`]?.v ?? v.q3)
    const budget = Number(cells[`G${r}`]?.v ?? 0)
    return { ...v, actual, budget }
  })
  const cats = VENDOR_CATEGORIES.map((c) => {
    const vs = rows.filter((r) => r.category === c)
    const actual = vs.reduce((s, r) => s + r.actual, 0)
    const budget = CATEGORY_BUDGET_Q3[c]
    return { cat: c, actual, budget, variance: actual - budget, pct: (actual - budget) / budget }
  })
  const total = cats.reduce((s, c) => s + c.actual, 0)
  const budget = cats.reduce((s, c) => s + c.budget, 0)
  const topVendors = [...rows].sort((a, b) => b.actual - a.actual).slice(0, 3)
  const overrun = [...rows].sort((a, b) => b.actual - b.budget - (a.actual - a.budget))[0]
  return { cats, total, budget, topVendors, overrun }
}

export const workflows: Workflow[] = [
  /* ───────────────────────────── Excel vendor spend ───────────────────────────── */
  {
    id: 'excel-vendor-spend-report',
    title: 'Build the Q3 vendor spend summary',
    description: 'Reads Priya’s request, builds a Q3 summary by category in Excel with live SUMIF formulas, variance vs budget and a chart, then replies with the key insights and the workbook attached.',
    category: 'Finance',
    apps: ['outlook', 'excel'],
    timeSaved: '1 hr 15 min',
    featured: true,
    keywords: ['vendor spend', 'excel', 'spreadsheet', 'q3', 'summary', 'variance', 'budget', 'priya', 'category', 'chart', 'ops review', 'spend report'],
    examples: ['Build the Q3 vendor spend summary for Priya', 'Summarize vendor spend by category in Excel and email it'],
    nudge: () => {
      const replied = db.get<any>('outlook.emails').some((e) => e.replyTo === 'em-priya-vendor-spend')
      return replied ? null : 'Priya needs the Q3 vendor spend summary for Thursday’s ops review'
    },
    plan: [
      'Read Priya’s request in Outlook',
      'Open Vendor Spend FY25.xlsx and review the Q3 data',
      'Build a “Q3 Summary” sheet with SUMIF formulas and variance vs budget',
      'Format the table and insert a chart',
      'Reply to Priya with insights and the workbook attached',
    ],
    async run(a) {
      const s = spendSummary()
      const byCat = Object.fromEntries(s.cats.map((c) => [c.cat, c]))
      const log = byCat['Logistics & Freight']
      const it = byCat['IT & Software']
      const ps = byCat['Professional Services']

      a.step(0)
      await a.open('outlook')
      await a.waitFor('@outlook-folder-inbox', 25000)
      await a.click('@outlook-folder-inbox', { label: 'Inbox' })
      await a.click('@outlook-email-em-priya-vendor-spend', { label: 'Q3 vendor spend summary for the ops review — Priya Raman' })
      await a.think('Priya wants Q3 vendor spend by category for Thursday: top vendors, total, and variance vs budget — as an Excel table plus a few bullets in the reply.', 1600)

      a.step(1)
      await a.open('excel', { workbookId: 'wb-vendor-spend' })
      await a.waitFor('@excel-cell-A1', 25000)
      await a.think(`“Spend by Vendor” has ${VENDORS.length} vendors across ${VENDOR_CATEGORIES.length} categories with Q3 actuals in column F and Q3 budget in column G. I’ll summarize by category with SUMIF so it stays live if the data is refreshed.`, 1700)

      a.step(2)
      await a.click('@excel-new-sheet', { label: 'New sheet' })
      await a.doubleClick('@excel-sheet-1', { label: 'Sheet1 tab' })
      await a.type('@excel-sheet-rename', 'Q3 Summary', { clear: true, label: 'sheet name' })
      await a.press('Enter')

      await a.type('@excel-namebox', 'A1', { label: 'Name Box' })
      await a.press('Enter')
      const headers = ['Category', 'Q3 Actual', 'Q3 Budget', 'Variance', 'Var %']
      for (let i = 0; i < headers.length; i++) {
        await a.type('@excel-formula-bar', headers[i], { fast: true, label: 'formula bar' })
        await a.press(i < headers.length - 1 ? 'Tab' : 'Enter')
      }
      await a.type('@excel-namebox', 'A2', { label: 'Name Box' })
      await a.press('Enter')
      for (const c of [...VENDOR_CATEGORIES, 'Total']) {
        await a.type('@excel-formula-bar', c, { fast: true, label: 'formula bar' })
        await a.press('Enter')
      }
      await a.type('@excel-namebox', 'B2', { label: 'Name Box' })
      await a.press('Enter')
      const row2 = ["=SUMIF('Spend by Vendor'!B:B,A2,'Spend by Vendor'!F:F)", "=SUMIF('Spend by Vendor'!B:B,A2,'Spend by Vendor'!G:G)", '=B2-C2', '=D2/C2']
      for (let i = 0; i < row2.length; i++) {
        await a.type('@excel-formula-bar', row2[i], { fast: true, label: 'formula bar' })
        await a.press(i < row2.length - 1 ? 'Tab' : 'Enter')
      }
      await a.type('@excel-namebox', 'B2:E7', { label: 'Name Box' })
      await a.press('Enter')
      await a.click('@excel-fill', { label: 'Fill' })
      await a.click('@excel-fill-down', { label: 'Fill Down' })
      await a.type('@excel-namebox', 'B2:D7', { label: 'Name Box' })
      await a.press('Enter')
      await a.click('@excel-autosum', { label: 'AutoSum' })
      await a.type('@excel-namebox', 'E7:E8', { label: 'Name Box' })
      await a.press('Enter')
      await a.click('@excel-fill', { label: 'Fill' })
      await a.click('@excel-fill-down', { label: 'Fill Down' })
      await a.think(`Formulas check out: Q3 total ${k(s.total)} against a ${k(s.budget)} budget (${signed(s.total - s.budget)}, ${pct((s.total - s.budget) / s.budget)}). Logistics alone is ${signed(log.variance)} over.`, 1500)

      a.step(3)
      await a.type('@excel-namebox', 'B2:D8', { label: 'Name Box' })
      await a.press('Enter')
      await a.click('@excel-fmt-currency', { label: 'Accounting Number Format' })
      await a.type('@excel-namebox', 'E2:E8', { label: 'Name Box' })
      await a.press('Enter')
      await a.click('@excel-fmt-percent', { label: 'Percent Style' })
      await a.type('@excel-namebox', 'A1:E8', { label: 'Name Box' })
      await a.press('Enter')
      await a.click('@excel-format-table', { label: 'Format as Table' })
      await a.click('@excel-format-menu', { label: 'Format' })
      await a.click('@excel-autofit', { label: 'AutoFit Column Width' })
      await a.type('@excel-namebox', 'A1:C7', { label: 'Name Box' })
      await a.press('Enter')
      await a.click('@excel-tab-insert', { label: 'Insert' })
      await a.click('@excel-insert-chart', { label: 'Recommended Charts' })
      await a.type('[data-agent^="excel-chart-title-"]', 'Q3 Vendor Spend vs Budget by Category', { clear: true, fast: true, label: 'Chart Title' })
      await a.click('@excel-tab-home', { label: 'Home' })
      await a.click('@excel-save', { label: 'Save' })
      await a.wait(700)

      a.step(4)
      await a.open('outlook')
      await a.click('@outlook-email-em-priya-vendor-spend', { label: 'Priya’s email' })
      await a.click('@outlook-reply', { label: 'Reply' })
      const top = s.topVendors.map((v) => `${v.vendor} (${k(v.actual)})`).join(', ')
      await a.type(
        '@outlook-compose-body',
        `Hi Priya,\n\nHere’s the Q3 vendor spend summary for Thursday — the full table and chart are on the new “Q3 Summary” tab of the attached workbook.\n\n• Total Q3 vendor spend was ${k(s.total)} vs a ${k(s.budget)} budget (${signed(s.total - s.budget)}, ${pct((s.total - s.budget) / s.budget)}).\n• Logistics & Freight drove the overrun at ${k(log.actual)} (${signed(log.variance)}, ${pct(log.pct)}) — mostly ${s.overrun.vendor}’s peak-season surcharge from August (${signed(s.overrun.actual - s.overrun.budget)} vs budget).\n• IT & Software is ${signed(it.variance)} over (${pct(it.pct)}) on the Litware license true-up; Professional Services is ${signed(ps.variance)} under (${pct(ps.pct)}) after the Trey Research SOW wound down.\n• Top vendors: ${top} — together ${Math.round((s.topVendors.reduce((x, v) => x + v.actual, 0) / s.total) * 100)}% of Q3 spend.\n\nHappy to walk through it before the review.\n`,
        { label: 'message body' },
      )
      await a.click('@outlook-attach', { label: 'Attach file' })
      await a.click('@outlook-attach-file-f-2', { label: 'Vendor Spend FY25.xlsx' })
      await a.click('@outlook-send', { label: 'Send' })
      await a.wait(900)
      const id = newestEmail((e) => e.folder === 'sent' && e.replyTo === 'em-priya-vendor-spend')
      return {
        summary: `Built a live “Q3 Summary” sheet (SUMIF by category, variance vs budget, table formatting and a column chart) in Vendor Spend FY25.xlsx and replied to Priya with four insights: Q3 spend ${k(s.total)}, ${pct((s.total - s.budget) / s.budget)} vs budget, led by Logistics (${signed(log.variance)}).`,
        outputs: [
          { label: 'Open the Q3 Summary sheet', appId: 'excel', params: { workbookId: 'wb-vendor-spend', sheet: 'Q3 Summary' } },
          { label: 'View the reply to Priya', appId: 'outlook', params: { view: 'mail', folder: 'sent', emailId: id } },
        ],
        metrics: [
          { label: 'Q3 spend', value: k(s.total) },
          { label: 'Vs budget', value: pct((s.total - s.budget) / s.budget) },
          { label: 'Formulas written', value: '27' },
        ],
      }
    },
  },

  /* ───────────────────────────── Teams stand-up ───────────────────────────── */
  {
    id: 'teams-standup-summary',
    title: 'Post the daily stand-up summary in Teams',
    description: 'Reads the Operations Team channel and the morning chats with Ben and Maya, posts a concise stand-up summary to the channel and DMs Priya the highlights.',
    category: 'Operations',
    apps: ['teams'],
    timeSaved: '20 min',
    keywords: ['teams', 'stand-up', 'standup', 'daily', 'summary', 'channel', 'post', 'operations team', 'recap', 'dm priya'],
    examples: ['Post today’s stand-up summary to the Operations Team channel', 'Summarize the ops stand-up and send it to Priya'],
    nudge: () => {
      const done = db.get<any>('teams.messages').some((m) => m.conversationId === 'operations-team' && m.from === 'alex' && isToday(m.date))
      return done ? null : 'Priya asked for today’s stand-up summary in Operations Team'
    },
    plan: ['Check Activity for Priya’s request', 'Read the Operations Team channel updates', 'Read the morning chats with Ben and Maya', 'Post the stand-up summary to the channel', 'DM Priya the highlights'],
    async run(a) {
      a.step(0)
      await a.open('teams')
      await a.waitFor('@teams-nav-activity', 25000)
      await a.click('@teams-nav-activity', { label: 'Activity' })
      await a.click('@teams-activity-ta-1', { label: 'Priya Raman mentioned you' })
      await a.think('Priya mentioned me in Operations Team: she wants today’s stand-up summary posted there. David also asked her how Atlanta is trending.', 1500)

      a.step(1)
      await a.click('@teams-nav-teams', { label: 'Teams' })
      await a.click('@teams-channel-operations-team', { label: 'Operations Team' })
      await a.scrollTo('[data-agent^="teams-post-"]', { index: 0 })
      await a.wait(600)
      await a.think('Three stand-up threads this morning: fulfillment (Ben), warehouse & labor (Maya) and vendors (Lucas). Backorders dropped from 412 to 287; Atlanta is still the weakest DC at 91.8% on-time.', 1700)

      a.step(2)
      await a.click('@teams-nav-chat', { label: 'Chat' })
      await a.click('@teams-chat-ben', { label: 'Ben Carter' })
      await a.wait(700)
      await a.think('Ben adds the root cause: XPO linehaul — two trailers 14h late on Monday, XPO on-time 85.3% vs an 88% target. He has opened a carrier claim.', 1400)
      await a.click('@teams-chat-maya', { label: 'Maya Johnson' })
      await a.wait(700)
      await a.think('Maya: 45 seasonal associates confirmed for Columbus (Nov 3) and 30 for Reno (Nov 10). Blocker is the Reno badge printer, INC0012931, fix promised by Thursday.', 1400)

      a.step(3)
      await a.click('@teams-nav-teams', { label: 'Teams' })
      await a.click('@teams-channel-operations-team', { label: 'Operations Team' })
      await a.type(
        '@teams-compose',
        `**Daily stand-up summary — ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}**\n• Fulfillment: 19,612 orders shipped last week, on-time 96.4%. Atlanta DC lags at 91.8%\n• Backorders down to 287 network-wide (from 412); Atlanta holds 128 of them\n• Root cause: XPO linehaul delays (on-time 85.3% vs 88% target) — Ben opened a carrier claim\n• Labor: 45 seasonal associates confirmed for Columbus (Nov 3), 30 for Reno (Nov 10)\n• Vendors: Fabrikam corrected invoices INV-21007/INV-21044 received; $8,240 credit memo still pending\n• Blocker: Reno badge printer (INC0012931) must be fixed by Thursday or Nov 10 onboarding slips — @Oliver Brooks`,
        { label: 'Post in Operations Team' },
      )
      await a.press('Enter')
      await a.wait(600)

      a.step(4)
      await a.click('@teams-nav-chat', { label: 'Chat' })
      await a.click('@teams-chat-priya', { label: 'Priya Raman' })
      await a.type(
        '@teams-compose',
        'Hi Priya — stand-up summary is posted in Operations Team. Headlines for David: on-time 96.4% network-wide, backorders down 30% (412 → 287). Atlanta is the outlier at 91.8% because of XPO linehaul delays; Ben has a carrier claim open and we’re modelling overflow to UPS if XPO can’t commit for peak. Only blocker is the Reno badge printer before the Nov 10 seasonal start.',
        { label: 'Type a message' },
      )
      await a.click('@teams-send', { label: 'Send' })
      await a.wait(600)
      return {
        summary: 'Read 3 stand-up threads and 2 chats, posted a 6-point stand-up summary in Operations Team and sent Priya the Atlanta / XPO headline for David.',
        outputs: [
          { label: 'Open the Operations Team post', appId: 'teams', params: { channelId: 'operations-team' } },
          { label: 'Open the chat with Priya', appId: 'teams', params: { chatId: 'chat-priya' } },
        ],
        metrics: [
          { label: 'Threads read', value: '5' },
          { label: 'Messages posted', value: '2' },
          { label: 'Blockers flagged', value: '1' },
        ],
      }
    },
  },

  /* ───────────────────────────── PowerPoint deck ───────────────────────────── */
  {
    id: 'powerpoint-ops-review-deck',
    title: 'Add vendor spend slides to the Q3 ops review deck',
    description: 'Pulls Q3 spend vs budget from Excel and adds a variance slide and a “decisions needed” slide with speaker notes to Q3 Operations Review.pptx.',
    category: 'Operations',
    apps: ['excel', 'powerpoint'],
    timeSaved: '45 min',
    keywords: ['powerpoint', 'deck', 'slides', 'presentation', 'ops review', 'q3', 'vendor spend', 'add slide', 'pptx'],
    examples: ['Add a vendor spend variance slide to the Q3 ops review deck', 'Update the ops review presentation'],
    nudge: () => {
      const deck = db.find<any>('powerpoint.decks', 'deck-q3-ops')
      return deck && !deck.slides.some((s: any) => s.createdBy === 'hworker') ? 'The Q3 ops review deck has no budget-variance slide yet' : null
    },
    plan: ['Review Q3 actuals vs budget in Excel', 'Open Q3 Operations Review.pptx', 'Add a spend-vs-budget slide with speaker notes', 'Add a “decisions needed” slide', 'Save and preview the deck'],
    async run(a) {
      const s = spendSummary()
      const sorted = [...s.cats].sort((x, y) => y.variance - x.variance)
      a.step(0)
      await a.open('excel', { workbookId: 'wb-vendor-spend' })
      await a.waitFor('@excel-cell-I2', 25000)
      await a.click('@excel-cell-I2', { label: 'Q3 Variance' })
      await a.type('@excel-namebox', 'I2:I26', { label: 'Name Box' })
      await a.press('Enter')
      await a.think(`Net Q3 variance is ${signed(s.total - s.budget)} on ${k(s.total)}. ${sorted[0].cat} is the biggest overrun (${signed(sorted[0].variance)}), ${sorted.at(-1)!.cat} the biggest underspend (${signed(sorted.at(-1)!.variance)}).`, 1800)

      a.step(1)
      await a.open('powerpoint', { deckId: 'deck-q3-ops' })
      await a.waitFor('@ppt-slide-3', 25000)
      await a.click('@ppt-slide-3', { label: 'Slide 4 — Vendor spend by category' })
      await a.think('Slide 4 shows spend by category but not budget. I’ll add a variance slide right after it, and a decisions slide before the close.', 1200)

      a.step(2)
      await a.click('@ppt-new-slide', { label: 'New Slide' })
      await a.type('@ppt-slide-title', 'Q3 vendor spend vs. budget', { label: 'slide title' })
      await a.type(
        '@ppt-slide-bullets',
        [
          `Total ${k(s.total)} vs ${k(s.budget)} budget: ${signed(s.total - s.budget)} (${pct((s.total - s.budget) / s.budget)})`,
          ...sorted.slice(0, 2).map((c) => `${c.cat}: ${signed(c.variance)} (${pct(c.pct)})`),
          `${sorted.at(-1)!.cat}: ${signed(sorted.at(-1)!.variance)} (${pct(sorted.at(-1)!.pct)})`,
          `Largest single overrun: ${s.overrun.vendor}, ${signed(s.overrun.actual - s.overrun.budget)} (peak surcharge)`,
        ].join('\n'),
        { label: 'slide bullets' },
      )
      await a.type('@ppt-notes', `Logistics overrun is mostly the Wide World Importers peak-season surcharge from August 4. Litware true-up explains IT. Professional services underspend is the Trey Research SOW ending in Q2. Source: Vendor Spend FY25.xlsx, Q3 Summary tab.`, { fast: true, label: 'speaker notes' })

      a.step(3)
      await a.click('@ppt-slide-8', { label: 'Slide 9 — Q4 priorities' })
      await a.click('@ppt-new-slide', { label: 'New Slide' })
      await a.type('@ppt-slide-title', 'Decisions needed today', { label: 'slide title' })
      await a.type(
        '@ppt-slide-bullets',
        'Approve XPO surge-pricing cap or shift overflow volume to UPS for peak\nApprove the order-exception triage pilot budget (November)\nRe-baseline the Q4 logistics budget for the Wide World surcharge\nConfirm owners for the packaging vendor consolidation (5 → 3)',
        { label: 'slide bullets' },
      )
      await a.type('@ppt-notes', 'Ask David and Priya for a decision on each item before we close.', { fast: true, label: 'speaker notes' })

      a.step(4)
      await a.click('@ppt-save', { label: 'Save' })
      await a.click('@ppt-present', { label: 'Present' })
      await a.wait(2200)
      await a.click('@ppt-end-show', { label: 'End Slide Show' })
      return {
        summary: `Added two slides to Q3 Operations Review.pptx: “Q3 vendor spend vs. budget” (${signed(s.total - s.budget)}, ${pct((s.total - s.budget) / s.budget)}) and “Decisions needed today”, both with speaker notes. The deck now has ${db.find<any>('powerpoint.decks', 'deck-q3-ops')?.slides.length ?? 10} slides.`,
        outputs: [
          { label: 'Open the new variance slide', appId: 'powerpoint', params: { deckId: 'deck-q3-ops', slide: 4 } },
          { label: 'Open the decisions slide', appId: 'powerpoint', params: { deckId: 'deck-q3-ops', slide: 9 } },
        ],
        metrics: [
          { label: 'Slides added', value: '2' },
          { label: 'Net variance', value: signed(s.total - s.budget) },
        ],
      }
    },
  },

  /* ───────────────────────────── Power BI KPI share ───────────────────────────── */
  {
    id: 'powerbi-weekly-kpi-share',
    title: 'Refresh and share the weekly KPI report',
    description: 'Refreshes the stale Operations KPI report in Power BI, reads this week’s numbers, shares the report with David and Priya and posts the headline KPIs in the Ops Leadership channel.',
    category: 'Operations',
    apps: ['powerbi', 'teams'],
    timeSaved: '30 min',
    featured: false,
    keywords: ['power bi', 'powerbi', 'kpi', 'dashboard', 'report', 'refresh', 'weekly', 'share', 'leadership', 'metrics', 'on-time'],
    examples: ['Refresh the weekly KPI report and send it to leadership', 'Share this week’s ops KPIs with David'],
    nudge: () => {
      const r = db.find<any>('powerbi.reports', 'rpt-ops-kpi')
      if (!r) return null
      const days = (Date.now() - +new Date(r.lastRefreshed)) / 86400000
      return days > 1 ? `Operations KPI — Weekly hasn’t refreshed in ${Math.floor(days)} days` : null
    },
    plan: ['Open the Operations KPI report in Power BI', 'Refresh the visuals and read this week’s KPIs', 'Share the report with David and Priya', 'Post the headline KPIs in Ops Leadership'],
    async run(a) {
      a.step(0)
      await a.open('powerbi')
      await a.waitFor('@powerbi-nav-workspaces', 25000)
      await a.click('@powerbi-nav-workspaces', { label: 'Workspaces' })
      await a.click('@powerbi-ws-operations-analytics', { label: 'Operations Analytics' })
      await a.click('@powerbi-report-rpt-ops-kpi', { label: 'Operations KPI — Weekly' })
      await a.waitFor('@powerbi-refresh')
      const before = db.find<any>('powerbi.reports', 'rpt-ops-kpi')
      const age = Math.floor((Date.now() - +new Date(before.lastRefreshed)) / 86400000)
      await a.think(`The semantic model was last refreshed ${age} days ago — the last three scheduled refreshes failed on the on-prem gateway. These numbers (on-time ${before.kpis.onTimeDelivery}%) are stale; refreshing before sharing.`, 1800)

      a.step(1)
      await a.click('@powerbi-refresh', { label: 'Refresh visuals' })
      await a.wait(3400)
      const r = db.find<any>('powerbi.reports', 'rpt-ops-kpi')
      const kk = r.kpis
      const p = r.prevKpis
      await a.think(`Fresh week ${r.fiscalWeek}: on-time ${kk.onTimeDelivery}% (was ${p.onTimeDelivery}%), cycle time ${kk.orderCycleTimeDays}d, warehouse SLA ${kk.warehouseSla}%, cost per order $${kk.costPerOrder.toFixed(2)}, ${kk.ordersShipped.toLocaleString('en-US')} orders, backorders ${kk.backorders} (from ${p.backorders}).`, 2000)
      await a.click('@powerbi-page-2', { label: 'Warehouse SLA' })
      await a.wait(900)
      await a.click('@powerbi-page-0', { label: 'Executive Summary' })

      a.step(2)
      await a.click('@powerbi-share', { label: 'Share' })
      for (const id of ['david', 'priya']) {
        await a.type('@powerbi-share-to', person(id).name, { fast: true, label: 'Enter a name, group, or email' })
        await a.press('Enter')
      }
      await a.type('@powerbi-share-message', `Week ${r.fiscalWeek} KPIs are refreshed — on-time ${kk.onTimeDelivery}%, warehouse SLA ${kk.warehouseSla}%, backorders down to ${kk.backorders}.`, { label: 'message' })
      await a.click('@powerbi-share-send', { label: 'Send' })
      await a.wait(1200)

      a.step(3)
      await a.open('teams')
      await a.waitFor('@teams-nav-teams', 25000)
      await a.click('@teams-nav-teams', { label: 'Teams' })
      await a.click('@teams-channel-ops-leadership', { label: 'Ops Leadership › General' })
      const d = (x: number, y: number, unit = '', dec = 1) => `${x - y >= 0 ? '+' : '−'}${Math.abs(x - y).toFixed(dec)}${unit}`
      await a.type(
        '@teams-compose',
        `**Weekly ops KPIs — Week ${r.fiscalWeek}** (Power BI refreshed just now)\n• On-time delivery: ${kk.onTimeDelivery}% (${d(kk.onTimeDelivery, p.onTimeDelivery, ' pts')} WoW, target ${r.targets?.onTimeDelivery ?? 95}%)\n• Order cycle time: ${kk.orderCycleTimeDays} days (${d(kk.orderCycleTimeDays, p.orderCycleTimeDays, 'd')})\n• Warehouse SLA: ${kk.warehouseSla}% (${d(kk.warehouseSla, p.warehouseSla, ' pts')})\n• Cost per order: $${kk.costPerOrder.toFixed(2)} (${d(kk.costPerOrder, p.costPerOrder, '', 2)})\n• Orders shipped: ${kk.ordersShipped.toLocaleString('en-US')} · Backorders: ${kk.backorders} (from ${p.backorders})\nReport link shared with @David Okafor and @Priya Raman. Heads-up: the scheduled refresh has been failing on gateway NW-GW-BOS-01 — IT ticket to follow.`,
        { label: 'Post in Ops Leadership' },
      )
      await a.press('Enter')
      await a.wait(600)
      return {
        summary: `Refreshed Operations KPI — Weekly (data was ${age} days stale), shared it with David Okafor and Priya Raman, and posted week ${r.fiscalWeek} KPIs in Ops Leadership: on-time ${kk.onTimeDelivery}%, SLA ${kk.warehouseSla}%, backorders ${kk.backorders}.`,
        outputs: [
          { label: 'Open the refreshed report', appId: 'powerbi', params: { reportId: 'rpt-ops-kpi' } },
          { label: 'Open the Ops Leadership post', appId: 'teams', params: { channelId: 'ops-leadership' } },
        ],
        metrics: [
          { label: 'On-time delivery', value: `${kk.onTimeDelivery}%` },
          { label: 'Backorders', value: `${p.backorders} → ${kk.backorders}` },
          { label: 'Shared with', value: '2' },
        ],
      }
    },
  },
]
