import type { Workflow } from '@/agent/types'
import { db } from '@/db/db'
import { isoDate } from '@/data/time'
import { person } from '@/data/people'
import { HS_IDS, SF_IDS, ZOOM_IDS } from '@/db/seeds/sales'
import { pipelineMetrics } from '@/apps/tableau/metrics'

const endOfMonth = () => {
  const d = new Date()
  return isoDate(new Date(d.getFullYear(), d.getMonth() + 1, 0))
}
const addBusinessDays = (n: number) => {
  const d = new Date()
  while (n > 0) {
    d.setDate(d.getDate() + 1)
    if (d.getDay() !== 0 && d.getDay() !== 6) n--
  }
  return isoDate(d)
}
const fmtUsd = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const fmtM = (n: number) => (n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : `$${Math.round(n / 1000)}K`)
const newest = (col: string, pred: (r: any) => boolean) =>
  db
    .get<any>(col)
    .filter(pred)
    .sort((a, b) => +new Date(b.date ?? b.createdDate ?? 0) - +new Date(a.date ?? a.createdDate ?? 0))[0]

export const workflows: Workflow[] = [
  /* ───────────────────────── Salesforce: log meeting + update opp ───────────────────────── */
  {
    id: 'salesforce-log-meeting-and-update',
    title: 'Log the Adatum meeting in Salesforce',
    description: 'Reads today’s walkthrough notes and Elena’s follow-up, logs the call, advances the opportunity stage, updates amount and close date, and creates the follow-up task.',
    category: 'Sales',
    apps: ['outlook', 'salesforce'],
    timeSaved: '20 min',
    featured: true,
    keywords: ['salesforce', 'crm', 'log call', 'log meeting', 'update opportunity', 'adatum', 'elena', 'stage', 'pipeline hygiene', 'opportunity'],
    examples: ['Log my Adatum meeting in Salesforce and update the opportunity', 'Update the Adatum opp after today’s call'],
    nudge: () => {
      const o = db.find<any>('salesforce.opportunities', SF_IDS.OPP_ADATUM)
      const logged = db.get<any>('salesforce.activities').some((a) => a.whatId === SF_IDS.OPP_ADATUM && a.createdBy === 'hworker')
      return o && !logged && o.stage === 'Qualification' ? 'Today’s Adatum walkthrough isn’t logged in Salesforce yet' : null
    },
    plan: ['Review the walkthrough and Elena’s follow-up', 'Find the Adatum opportunity in Salesforce', 'Log the call with meeting notes', 'Advance the stage to Value Proposition', 'Update amount, seats and close date', 'Create the follow-up task'],
    async run(a) {
      const opp0 = db.find<any>('salesforce.opportunities', SF_IDS.OPP_ADATUM)!
      a.step(0)
      await a.open('outlook')
      await a.waitFor('@outlook-folder-inbox', 20000)
      await a.click('@outlook-nav-calendar', { label: 'Calendar' })
      if (a.exists('@outlook-cal-today')) await a.click('@outlook-cal-today', { label: 'Today' })
      if (a.exists('@outlook-event-ev-adatum')) await a.click('@outlook-event-ev-adatum', { label: 'Adatum — operations walkthrough' })
      await a.wait(600)
      await a.click('@outlook-nav-mail', { label: 'Mail' })
      await a.click('@outlook-folder-inbox', { label: 'Inbox' })
      await a.click('@outlook-email-em-elena-followup', { label: 'Follow-up from today’s call — Elena Rossi' })
      await a.think('The 10:00 walkthrough with Elena (Adatum) went well: they want 250 Enterprise seats for Milan + Rotterdam, a multi-year option, and a CIO call with Marco next week. Decision before month end.', 1800)

      a.step(1)
      await a.open('salesforce')
      await a.waitFor('@sf-search', 20000)
      await a.type('@sf-search', 'Adatum', { label: 'Salesforce search' })
      await a.click(`@sf-search-result-${SF_IDS.OPP_ADATUM}`, { label: opp0.name })
      await a.think(`Opportunity is still at ${opp0.stage} with ${fmtUsd(opp0.amount)} (200 seats estimated at discovery). It’s out of date after today — needs analysis is done and pricing was requested.`, 1500)

      a.step(2)
      await a.click('@sf-activity-call', { label: 'Log a Call' })
      await a.type('@sf-call-subject', 'Operations walkthrough — Elena Rossi + team', { clear: true })
      await a.select('@sf-call-name', SF_IDS.CON_ELENA, { label: 'Name' })
      await a.type(
        '@sf-call-comments',
        `Attendees: Elena Rossi (Head of Ops), Liam O’Connor, Alex Morgan.\n\n• Demoed plant ops dashboards, work orders and MES integration — strong reaction from the team\n• Scope confirmed: 250 Enterprise seats across Milan (HQ) and Rotterdam\n• Asked for multi-year pricing option (3-yr) and a 10-week rollout plan\n• Economic buyer: Marco Bianchi (CIO) — wants a 30-min follow-up next week\n• Timeline: steering committee next week, decision before end of month\n\nNext: send pricing + rollout plan, book CIO call.`,
        { label: 'Comments' },
      )
      await a.click('@sf-call-save', { label: 'Save' })
      await a.wait(700)

      a.step(3)
      await a.click('@sf-path-action', { label: 'Mark Stage as Complete' })
      await a.wait(900)
      await a.click('@sf-path-action', { label: 'Mark Stage as Complete' })
      await a.wait(700)

      a.step(4)
      const amount = 250 * 744
      await a.think(`250 seats × $744/seat/yr ($62/month) = ${fmtUsd(amount)} ARR. Close date moves to ${new Date(endOfMonth() + 'T12:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} to match their month-end decision.`, 1500)
      await a.click('@sf-opp-tab-details', { label: 'Details' })
      await a.click('@sf-opp-edit-amount', { label: 'Edit Amount' })
      await a.type('@sf-opp-field-amount', String(amount), { clear: true, label: 'Amount' })
      await a.type('@sf-opp-field-closeDate', endOfMonth(), { label: 'Close Date' })
      await a.type('@sf-opp-field-nextStep', 'Send 250-seat pricing + rollout plan; CIO call with Marco', { clear: true, label: 'Next Step' })
      await a.type('@sf-opp-field-seats', '250', { clear: true, label: 'Contract Seats' })
      await a.type('@sf-opp-field-pricePerSeat', '744', { clear: true, label: 'Price per Seat' })
      await a.type('@sf-opp-field-contractTerm', '36', { clear: true, label: 'Contract Term' })
      await a.click('@sf-opp-save', { label: 'Save' })
      await a.wait(800)

      a.step(5)
      await a.click('@sf-opp-tab-activity', { label: 'Activity' })
      await a.click('@sf-activity-task', { label: 'New Task' })
      await a.type('@sf-task-subject', 'Send Adatum pricing (annual + 3-yr) and book CIO call with Marco', { label: 'Subject' })
      await a.type('@sf-task-due', addBusinessDays(1), { label: 'Due Date' })
      await a.select('@sf-task-name', SF_IDS.CON_MARCO, { label: 'Name' })
      await a.select('@sf-task-priority', 'High', { label: 'Priority' })
      await a.type('@sf-task-comments', 'Pricing: $186,000/yr annual or $158,100/yr on a 3-year term. Propose Tue 2:00 PM or Thu 10:00 AM ET for Marco.', { label: 'Comments' })
      await a.click('@sf-task-save', { label: 'Save' })
      await a.wait(900)

      const o = db.find<any>('salesforce.opportunities', SF_IDS.OPP_ADATUM)!
      return {
        summary: `Logged the Adatum walkthrough, moved the opportunity from ${opp0.stage} to ${o.stage} (${o.probability}%), set the amount to ${fmtUsd(o.amount)} for 250 seats with a ${o.closeDate} close date, and created a follow-up task for the CIO call.`,
        outputs: [
          { label: 'Open the Adatum opportunity', appId: 'salesforce', params: { object: 'Opportunity', id: SF_IDS.OPP_ADATUM } },
          { label: 'See it in All Opportunities', appId: 'salesforce', params: { object: 'Opportunity' } },
        ],
        metrics: [
          { label: 'Stage', value: `${o.stage}` },
          { label: 'Amount', value: fmtUsd(o.amount) },
          { label: 'Activities logged', value: '2' },
        ],
      }
    },
  },

  /* ───────────────────────── Salesforce: Contoso closed won ───────────────────────── */
  {
    id: 'salesforce-contoso-closed-won',
    title: 'Close the Contoso renewal as won',
    description: 'Marks the Contoso 3-year renewal Closed Won, fills in the contract fields, announces it in Chatter to Rachel, and sends Kate a thank-you.',
    category: 'Sales',
    apps: ['outlook', 'salesforce'],
    timeSaved: '15 min',
    keywords: ['contoso', 'closed won', 'renewal', 'kate', 'close deal', 'win', 'chatter', 'thank you', 'salesforce'],
    examples: ['Mark the Contoso renewal as closed won', 'Close the Contoso deal and thank Kate'],
    nudge: () => {
      const o = db.find<any>('salesforce.opportunities', SF_IDS.OPP_CONTOSO)
      return o && o.stage !== 'Closed Won' && db.find('outlook.emails', 'em-kate-renewal') ? 'Kate Sullivan confirmed the Contoso renewal — mark it Closed Won' : null
    },
    plan: ['Read Kate’s confirmation', 'Open the Contoso renewal opportunity', 'Mark it Closed Won', 'Update the contract fields', 'Post the win in Chatter for Rachel', 'Email Kate a thank-you'],
    async run(a) {
      const opp0 = db.find<any>('salesforce.opportunities', SF_IDS.OPP_CONTOSO)!
      a.step(0)
      await a.open('outlook')
      await a.waitFor('@outlook-folder-inbox', 20000)
      await a.click('@outlook-folder-inbox', { label: 'Inbox' })
      await a.click('@outlook-email-em-kate-renewal', { label: 'Re: Contoso renewal — next steps' })
      await a.think('Kate confirms Contoso is aligned on the terms: 3 years, 400 seats. That matches order form v3 ($1,120,000 incl. Premier Success) — the deal can be closed.', 1600)

      a.step(1)
      await a.open('salesforce')
      await a.waitFor('@sf-search', 20000)
      await a.click('@sf-nav-opportunities', { label: 'Opportunities' })
      await a.type('@sf-list-search', 'Contoso', { label: 'Search this list' })
      await a.click(`@sf-list-row-${SF_IDS.OPP_CONTOSO}`, { label: opp0.name })

      a.step(2)
      await a.click('@sf-path-closed', { label: 'Closed' })
      await a.click('@sf-path-action', { label: 'Select Closed Stage' })
      await a.select('@sf-close-stage', 'Closed Won', { label: 'Stage' })
      await a.click('@sf-close-save', { label: 'Save' })
      await a.wait(2200)

      a.step(3)
      const start = isoDate(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1))
      await a.think(`Contract starts ${new Date(start + 'T12:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} for 36 months. 400 seats at $2,400 over the term = $960,000 + $160,000 Premier Success = $1,120,000 TCV.`, 1500)
      await a.click('@sf-opp-tab-details', { label: 'Details' })
      await a.click('@sf-opp-edit-contractStart', { label: 'Edit Contract Start Date' })
      await a.type('@sf-opp-field-contractStart', start, { label: 'Contract Start Date' })
      await a.type('@sf-opp-field-contractTerm', '36', { clear: true, label: 'Contract Term' })
      await a.type('@sf-opp-field-seats', '400', { clear: true, label: 'Contract Seats' })
      await a.type('@sf-opp-field-pricePerSeat', '800', { clear: true, label: 'Price per Seat (Annual)' })
      await a.type('@sf-opp-field-closeDate', isoDate(new Date()), { label: 'Close Date' })
      await a.type('@sf-opp-field-nextStep', 'Countersigned order form to Finance; hand-off to CS (Aisha) for FY27 kickoff', { clear: true, label: 'Next Step' })
      await a.click('@sf-opp-save', { label: 'Save' })
      await a.wait(800)

      a.step(4)
      await a.click('@sf-opp-tab-chatter', { label: 'Chatter' })
      await a.type('@sf-chatter-input', '@Rach', { label: 'Share an update' })
      await a.click('@sf-chatter-mention-rachel', { label: 'Rachel Goldberg' })
      await a.type(
        '@sf-chatter-input',
        `Contoso renewal is Closed Won 🎉 3-year term, 400 Enterprise seats + Premier Success — $1.12M TCV, price locked for the term. Kate Sullivan confirmed today; contract starts next month. Thanks @Liam O'Connor for getting the MSA redlines over the line!`,
        { label: 'Share an update' },
      )
      await a.click('@sf-chatter-share', { label: 'Share' })
      await a.wait(700)

      a.step(5)
      await a.focus('outlook')
      await a.click('@outlook-email-em-kate-renewal', { label: 'Re: Contoso renewal — next steps' })
      await a.click('@outlook-reply', { label: 'Reply' })
      await a.type(
        '@outlook-compose-body',
        `Hi Kate,\n\nThank you — this is great news, and thank you for championing the renewal internally.\n\nTo confirm what we’ve booked:\n• 3-year term, 400 Ops Cloud Enterprise seats\n• Premier Success included for the full term\n• Pricing locked through ${new Date(new Date().getFullYear() + 3, new Date().getMonth() + 1, 0).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}\n\nThe order form for signature will come through Docusign shortly. Aisha Bello from our Customer Success team will reach out to plan the FY27 kickoff and the APAC discussion Daniel raised at the QBR.\n\nLooking forward to the next three years together!`,
        { label: 'message body' },
      )
      await a.click('@outlook-send', { label: 'Send' })
      await a.wait(900)
      const mail = newest('outlook.emails', (e) => e.folder === 'sent' && e.replyTo === 'em-kate-renewal')
      return {
        summary: 'Marked “Contoso Ltd - Renewal FY27 (3-yr)” Closed Won ($1.12M), filled in the contract start, term and seats, posted the win in Chatter for Rachel, and emailed Kate a thank-you.',
        outputs: [
          { label: 'Open the Closed Won opportunity', appId: 'salesforce', params: { object: 'Opportunity', id: SF_IDS.OPP_CONTOSO } },
          { label: 'View the thank-you email', appId: 'outlook', params: { view: 'mail', folder: 'sent', emailId: mail?.id } },
        ],
        metrics: [
          { label: 'Deal value', value: '$1.12M' },
          { label: 'Term', value: '36 mo' },
          { label: 'Seats', value: '400' },
        ],
      }
    },
  },
  /* ───────────────────────── HubSpot: webinar attendees → sequence ───────────────────────── */
  {
    id: 'hubspot-enroll-webinar-leads',
    title: 'Enroll webinar attendees in a nurture sequence',
    description: 'Builds an active HubSpot list of everyone who attended the AI-Powered Ops Summit (excluding open opportunities) and enrolls them in the webinar follow-up sequence.',
    category: 'Marketing',
    apps: ['outlook', 'hubspot'],
    timeSaved: '35 min',
    keywords: ['hubspot', 'webinar', 'attendees', 'list', 'sequence', 'nurture', 'enroll', 'leads', 'marketing', 'follow up'],
    examples: ['Enroll the webinar attendees in the nurture sequence', 'Build a HubSpot list of webinar attendees'],
    nudge: () => {
      const s = db.find<any>('hubspot.sequences', HS_IDS.SEQ_WEBINAR)
      const n = db.get<any>('hubspot.contacts').filter((c) => c.webinarStatus === 'Attended' && c.lifecycleStage !== 'Opportunity').length
      return s && s.enrolled.length === 0 ? `${n} webinar attendees in HubSpot haven’t been followed up` : null
    },
    plan: ['Read Hannah’s request', 'Create an active list of webinar attendees', 'Exclude contacts already in an open deal', 'Enroll the list in the follow-up sequence', 'Confirm back to Hannah'],
    async run(a) {
      a.step(0)
      await a.open('outlook')
      await a.waitFor('@outlook-folder-inbox', 20000)
      await a.click('@outlook-folder-inbox', { label: 'Inbox' })
      await a.click('@outlook-email-em-hannah-webinar', { label: 'Webinar attendees — Hannah Novak' })
      const contacts = db.get<any>('hubspot.contacts')
      const attended = contacts.filter((c) => c.webinarStatus === 'Attended')
      const registered = contacts.filter((c) => c.webinarStatus)
      await a.think(`Hannah wants attendees only — ${attended.length} of ${registered.length} registrants actually attended. Elena Rossi (Adatum) attended too, but she’s in an active deal, so she should be excluded from a marketing sequence.`, 1700)

      a.step(1)
      await a.open('hubspot')
      await a.waitFor('@hs-nav-crm', 20000)
      await a.click('@hs-nav-crm', { label: 'CRM' })
      await a.click('@hs-subnav-crm-lists', { label: 'Lists' })
      await a.click('@hs-create-list', { label: 'Create list' })
      await a.type('@hs-list-name', 'AI-Powered Ops Summit — Attended (Oct 14)', { label: 'List name' })
      await a.click('@hs-list-add-filter', { label: 'Add filter' })
      await a.select('@hs-filter-prop-0', 'webinarStatus', { label: 'Property' })
      await a.select('@hs-filter-value-0', 'Attended', { label: 'Value' })

      a.step(2)
      await a.click('@hs-list-add-filter', { label: 'Add filter (AND)' })
      await a.select('@hs-filter-prop-1', 'lifecycleStage', { label: 'Property' })
      await a.select('@hs-filter-op-1', 'is none of', { label: 'Operator' })
      await a.select('@hs-filter-value-1', 'Opportunity', { label: 'Value' })
      const target = attended.filter((c) => c.lifecycleStage !== 'Opportunity')
      const mqls = target.filter((c) => c.lifecycleStage === 'Marketing Qualified Lead').length
      await a.think(`${target.length} contacts match: ${mqls} MQLs and ${target.length - mqls} leads across ${new Set(target.map((c) => c.company)).size} companies. Saving as an active list so late recording-viewers get added automatically.`, 1500)
      await a.click('@hs-list-save', { label: 'Save list' })
      await a.wait(700)
      const list = db.get<any>('hubspot.lists').filter((l) => l.createdBy === 'hworker').sort((x, y) => +new Date(y.createdAt) - +new Date(x.createdAt))[0]

      a.step(3)
      await a.click('@hs-nav-automation', { label: 'Automation' })
      await a.click('@hs-subnav-automation-sequences', { label: 'Sequences' })
      await a.click(`@hs-seq-row-${HS_IDS.SEQ_WEBINAR}`, { label: 'Webinar follow-up — AI-Powered Ops' })
      await a.click('@hs-seq-enroll', { label: 'Enroll' })
      await a.select('@hs-enroll-list', list.id, { label: 'Contact list' })
      await a.wait(600)
      await a.click('@hs-enroll-confirm', { label: `Enroll ${target.length} contacts` })
      await a.wait(900)

      a.step(4)
      await a.focus('outlook')
      await a.click('@outlook-email-em-hannah-webinar')
      await a.click('@outlook-reply', { label: 'Reply' })
      await a.type('@outlook-compose-body', `Hi Hannah,\n\nDone — I built an active list “AI-Powered Ops Summit — Attended (Oct 14)” with the ${target.length} attendees (excluding Elena Rossi, who’s already in an open Adatum deal) and enrolled all of them in “Webinar follow-up — AI-Powered Ops”.\n\nStep 1 (slides + recording) goes out tomorrow at 9:00 AM in each contact’s time zone. ${mqls} of them are MQLs, so Liam should see replies come in this week.`, { label: 'message body' })
      await a.click('@outlook-send', { label: 'Send' })
      await a.wait(800)
      return {
        summary: `Created an active list of ${target.length} webinar attendees (excluding open opportunities) and enrolled them in the 5-step “Webinar follow-up — AI-Powered Ops” sequence. Hannah has been told.`,
        outputs: [
          { label: 'Open the sequence enrollments', appId: 'hubspot', params: { sequenceId: HS_IDS.SEQ_WEBINAR } },
          { label: 'Open the new list', appId: 'hubspot', params: { listId: list.id } },
        ],
        metrics: [
          { label: 'Contacts enrolled', value: String(target.length) },
          { label: 'MQLs', value: String(mqls) },
          { label: 'Sequence steps', value: '5' },
        ],
      }
    },
  },

  /* ───────────────────────── Tableau: pipeline report to leadership ───────────────────────── */
  {
    id: 'tableau-pipeline-report',
    title: 'Send the pipeline dashboard to leadership',
    description: 'Opens the Sales Pipeline Overview in Tableau, exports it to PDF, and emails Rachel and David the PDF with a written read on Commit, Best Case and at-risk deals.',
    category: 'Sales',
    apps: ['outlook', 'tableau'],
    timeSaved: '40 min',
    keywords: ['tableau', 'pipeline', 'dashboard', 'report', 'forecast', 'leadership', 'rachel', 'export', 'pdf', 'commit'],
    examples: ['Send Rachel the pipeline dashboard with insights', 'Export the Tableau pipeline report and email leadership'],
    nudge: () => {
      const replied = db.get<any>('outlook.emails').some((e) => e.folder === 'sent' && /pipeline/i.test(e.subject ?? '') && e.sentBy === 'hworker')
      return db.find('outlook.emails', 'em-rachel-pipeline') && !replied ? 'Rachel is waiting on the pipeline snapshot for Thursday' : null
    },
    plan: ['Read Rachel’s request', 'Open the Sales Pipeline Overview dashboard', 'Analyse Commit, Best Case and slipping deals', 'Export the dashboard to PDF', 'Email Rachel and David with insights'],
    async run(a) {
      a.step(0)
      await a.open('outlook')
      await a.waitFor('@outlook-folder-inbox', 20000)
      await a.click('@outlook-folder-inbox', { label: 'Inbox' })
      await a.click('@outlook-email-em-rachel-pipeline', { label: 'Pipeline snapshot for Thursday’s leadership sync?' })
      await a.think('Rachel wants the dashboard as a PDF plus a read on Commit vs Best Case and which deals could slip — for her and David.', 1200)

      a.step(1)
      await a.open('tableau')
      await a.waitFor('@tableau-nav-explore', 20000)
      await a.click('@tableau-nav-explore', { label: 'Explore' })
      await a.click('@tableau-wb-wb-pipeline', { label: 'Sales Pipeline Overview' })
      await a.wait(1200)
      await a.click('@tableau-refresh', { label: 'Refresh' })
      await a.wait(800)

      a.step(2)
      const m = pipelineMetrics()
      const commit = m.cats.find((c) => c.cat === 'Commit')!.amount
      const best = m.cats.find((c) => c.cat === 'Best Case')!.amount
      const topStage = [...m.byStage].sort((x, y) => y.amount - x.amount)[0]
      const emea = m.byRegion.find((r) => r.region === 'EMEA')!
      const slip = m.slipping.slice(0, 3)
      await a.scrollTo('@tableau-kpis')
      await a.think(`Open pipeline is ${fmtM(m.openTotal)} across ${m.openCount} deals (${fmtM(m.weighted)} weighted). This quarter: ${fmtM(commit)} in Commit and ${fmtM(best)} in Best Case. Biggest concentration is ${topStage.stage} at ${fmtM(topStage.amount)}.`, 1900)
      await a.think(`At risk: ${slip.map((o) => `${o.name.split(' - ')[0]} (${fmtM(o.amount)}, ${o.stage})`).join(', ')} — all close this quarter at ≤50% probability.`, 1700)

      a.step(3)
      await a.click('@tableau-download', { label: 'Download' })
      await a.click('@tableau-download-pdf', { label: 'PDF' })
      await a.click('@tableau-download-confirm', { label: 'Download' })
      await a.wait(1000)

      a.step(4)
      await a.focus('outlook')
      await a.click('@outlook-new-mail', { label: 'New mail' })
      await a.type('@outlook-compose-to', person('rachel').email, { fast: true })
      await a.press('Enter')
      await a.type('@outlook-compose-to', person('david').email, { fast: true })
      await a.press('Enter')
      await a.type('@outlook-compose-subject', `Pipeline snapshot — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} (Sales Pipeline Overview)`)
      await a.click('@outlook-attach', { label: 'Attach file' })
      await a.click('@outlook-attach-file-f-tableau-pipeline-pdf', { label: 'Sales Pipeline Overview.pdf' })
      await a.type(
        '@outlook-compose-body',
        `Hi Rachel, hi David,\n\nAttached is today’s Sales Pipeline Overview from Tableau (live Salesforce data). My read on the quarter:\n\nHEADLINES\n• Open pipeline: ${fmtM(m.openTotal)} across ${m.openCount} opportunities (${fmtM(m.weighted)} weighted)\n• Closed won this quarter: ${fmtM(m.wonQtd)} · win rate ${m.winRate}% · avg deal ${fmtM(m.avgDeal)}\n• This quarter’s forecast: ${fmtM(commit)} Commit, ${fmtM(best)} Best Case\n\nWHERE THE PIPELINE SITS\n• Largest stage: ${topStage.stage} (${fmtM(topStage.amount)}, ${topStage.count} deals)\n• EMEA: ${fmtM(emea.amount)} open — driven by Wide World Importers and Adatum\n\nDEALS THAT COULD SLIP\n${slip.map((o) => `• ${o.name} — ${fmtM(o.amount)}, ${o.stage} (${o.probability}%), closes ${new Date(o.closeDate + 'T12:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`).join('\n')}\n\nSuggest we spend Thursday on the slip list and on pulling the Best Case deals into Commit.`,
        { label: 'message body' },
      )
      await a.click('@outlook-send', { label: 'Send' })
      await a.wait(900)
      const mail = newest('outlook.emails', (e) => e.folder === 'sent' && /Pipeline snapshot/.test(e.subject))
      return {
        summary: `Exported the Sales Pipeline Overview to PDF and emailed Rachel and David: ${fmtM(m.openTotal)} open, ${fmtM(commit)} Commit / ${fmtM(best)} Best Case this quarter, with ${slip.length} deals flagged as slip risks.`,
        outputs: [
          { label: 'View the email to leadership', appId: 'outlook', params: { view: 'mail', folder: 'sent', emailId: mail?.id } },
          { label: 'Open the Tableau dashboard', appId: 'tableau', params: { workbookId: 'wb-pipeline' } },
        ],
        metrics: [
          { label: 'Open pipeline', value: fmtM(m.openTotal) },
          { label: 'Commit (QTD)', value: fmtM(commit) },
          { label: 'Slip risks', value: String(slip.length) },
        ],
      }
    },
  },

  /* ───────────────────────── Zoom: QBR recap → schedule follow-up ───────────────────────── */
  {
    id: 'zoom-schedule-and-summarize',
    title: 'Turn the Contoso QBR recording into a follow-up meeting',
    description: 'Reads the AI Companion summary of the Contoso QBR, schedules the APAC expansion scoping call in Zoom, and posts the recap to the Sales Team chat.',
    category: 'Sales',
    apps: ['zoom'],
    timeSaved: '15 min',
    keywords: ['zoom', 'recording', 'summary', 'ai companion', 'schedule', 'meeting', 'qbr', 'contoso', 'apac', 'recap'],
    examples: ['Schedule the Contoso APAC follow-up from the QBR recording', 'Summarize the Contoso QBR and set up next steps'],
    plan: ['Open the Contoso QBR recording', 'Read the AI Companion summary', 'Schedule the APAC scoping meeting', 'Post the recap in Team Chat'],
    async run(a) {
      a.step(0)
      await a.open('zoom')
      await a.waitFor('@zoom-tab-meetings', 20000)
      await a.click('@zoom-tab-meetings', { label: 'Meetings' })
      await a.click('@zoom-meetings-recorded', { label: 'Recorded' })
      await a.click(`@zoom-recording-${ZOOM_IDS.REC_CONTOSO_QBR}`, { label: 'Contoso QBR (Q3)' })
      a.step(1)
      await a.click('@zoom-rec-tab-summary', { label: 'Meeting summary' })
      await a.scrollTo('@zoom-ai-summary')
      await a.think('AI Companion recap: 392/400 seats active (98%), Kate wants a 3-year renewal with locked pricing, and Daniel is evaluating ~120 APAC seats for H1 — that expansion needs a scoping call.', 1800)
      a.step(2)
      const d = new Date()
      d.setDate(d.getDate() + 5)
      while (d.getDay() !== 2) d.setDate(d.getDate() + 1)
      await a.click('@zoom-meetings-schedule', { label: 'Schedule a meeting' })
      await a.type('@zoom-schedule-topic', 'Contoso × Northwind — APAC expansion scoping', { clear: true, label: 'Topic' })
      await a.type('@zoom-schedule-date', isoDate(d), { label: 'Date' })
      await a.select('@zoom-schedule-time', '11:00', { label: 'Start time' })
      await a.select('@zoom-schedule-duration', '45', { label: 'Duration' })
      await a.type('@zoom-schedule-attendees', `${person('kate').email}, daniel.reyes@contoso.com, ${person('liam').email}`, { fast: true, label: 'Attendees' })
      await a.type('@zoom-schedule-agenda', 'Agenda\n1. APAC ops teams (Singapore, Sydney) — scope & headcount (~120 seats)\n2. Phased rollout plan (Singapore first)\n3. Pricing aligned with the 3-year renewal\n4. Next steps & owners', { label: 'Description' })
      await a.click('@zoom-schedule-save', { label: 'Save' })
      await a.wait(800)
      const mt = db.get<any>('zoom.meetings').filter((x) => x.createdBy === 'hworker').slice(-1)[0]
      a.step(3)
      await a.click('@zoom-tab-chat', { label: 'Team Chat' })
      await a.click('@zoom-chat-zc-1', { label: 'Sales Team' })
      await a.type('@zoom-chat-input', `Contoso QBR recap (via AI Companion): 98% seat adoption (392/400), Kate is ready for a 3-year renewal with price lock, and Daniel is scoping ~120 APAC seats for H1. I’ve booked the APAC scoping call for ${d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} at 11:00 AM ET — Liam, you’re on the invite.`, { label: 'Message' })
      await a.click('@zoom-chat-send', { label: 'Send' })
      await a.wait(700)
      return {
        summary: `Read the Contoso QBR AI summary, scheduled “Contoso × Northwind — APAC expansion scoping” for ${d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} at 11:00 AM, and posted the recap in #Sales Team.`,
        outputs: [
          { label: 'Open the scheduled meeting', appId: 'zoom', params: { meetingId: mt?.id } },
          { label: 'Open the QBR summary', appId: 'zoom', params: { recordingId: ZOOM_IDS.REC_CONTOSO_QBR } },
        ],
        metrics: [
          { label: 'Expansion seats', value: '~120' },
          { label: 'Attendees', value: '4' },
          { label: 'Minutes saved', value: '15' },
        ],
      }
    },
  },
]
