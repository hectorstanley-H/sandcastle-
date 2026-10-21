import type { Workflow } from '@/agent/types'
import { db } from '@/db/db'
import { isoDate } from '@/data/time'
import { person } from '@/data/people'
import { newestEmail, nextWeekday } from './core'
import { chargeHours, holidayName, nextMonday } from '@/apps/workday/util'

const fmtDay = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

/** Dec 22–26 of the current year (next year once those days have passed) */
function holidayWeek() {
  const now = new Date()
  const y = now > new Date(now.getFullYear(), 11, 26, 23, 59) ? now.getFullYear() + 1 : now.getFullYear()
  return { year: y, days: [22, 23, 24, 25, 26].map((d) => `${y}-12-${d}`) }
}
const newestEvent = (pred: (e: any) => boolean) => db.get<any>('outlook.events').filter(pred).slice(-1)[0]

export const workflows: Workflow[] = [
  /* ───────────────────────── Workday: holiday time off ───────────────────────── */
  {
    id: 'workday-request-time-off',
    title: 'Request holiday time off',
    description: 'Checks your Vacation balance, books Dec 22–26 in Workday, blocks the days as Out of Office in Outlook and gives your manager a heads-up.',
    category: 'HR',
    apps: ['workday', 'outlook'],
    timeSaved: '15 min',
    featured: true,
    keywords: ['time off', 'vacation', 'pto', 'holiday', 'leave', 'out of office', 'ooo', 'workday', 'christmas', 'days off'],
    examples: ['Book Dec 22–26 off in Workday', 'Request vacation for the holidays and block my calendar', 'Take the week before Christmas off'],
    nudge: () => {
      const { days } = holidayWeek()
      const booked = db.get<any>('workday.timeoff').some((r) => r.workerId === 'wd-alex' && r.days.some((d: any) => days.includes(d.date)))
      const bal = db.find<any>('workday.workers', 'wd-alex')?.balances?.vacation ?? 0
      return booked ? null : `You have ${bal} vacation days left — the holiday week isn’t booked yet`
    },
    plan: ['Open Workday and check your Vacation balance', 'Select Dec 22–26 on the time off calendar', 'Submit the Vacation request to Priya', 'Block the days in Outlook as Out of Office', 'Email Priya a heads-up'],
    async run(a) {
      const { year, days } = holidayWeek()
      const charged = days.filter((d) => chargeHours(d) > 0)
      const bal = db.find<any>('workday.workers', 'wd-alex')?.balances?.vacation ?? 14.5
      const skipped = days.filter((d) => !chargeHours(d)).map((d) => (holidayName(d) ? `Dec ${d.slice(8)} is ${holidayName(d)}` : `Dec ${d.slice(8)} is a ${new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' })}`))

      a.step(0)
      await a.open('workday')
      await a.waitFor('@workday-home', 30000)
      await a.click('@workday-home', { label: 'Workday Home' })
      await a.click('@workday-app-timeoff', { label: 'Time Off' })
      await a.waitFor('@workday-balance-vacation')
      await a.think(`Vacation balance is ${bal} days. ${skipped.join(' and ')}, so Dec 22–26 only costs ${charged.length} days — ${bal - charged.length} days left afterwards.`, 2200)

      a.step(1)
      await a.click('@workday-timeoff-new', { label: 'Request Time Off' })
      const now = new Date()
      const months = year * 12 + 11 - (now.getFullYear() * 12 + now.getMonth())
      for (let i = 0; i < months; i++) await a.click('@workday-cal-next', { label: 'Next month' })
      for (const d of days) await a.click(`@workday-cal-day-${d}`, { label: new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) })

      a.step(2)
      await a.click('@workday-timeoff-request', { label: 'Request Time Off' })
      await a.select('@workday-timeoff-type', 'Vacation', { label: 'Type: Vacation' })
      await a.type('@workday-timeoff-comment', `Holiday break with family. Ben is covering the warehouse SLA dashboard and Maya the vendor queue; reachable by phone for anything urgent.`, { label: 'Comment' })
      await a.click('@workday-timeoff-submit', { label: 'Submit' })
      await a.waitFor('@workday-timeoff-success')
      await a.wait(900)
      const req = db.get<any>('workday.timeoff').filter((r) => r.workerId === 'wd-alex' && r.days.some((d: any) => d.date === days[0])).slice(-1)[0]

      a.step(3)
      await a.open('outlook')
      await a.waitFor('@outlook-nav-mail', 30000)
      await a.click('@outlook-nav-calendar', { label: 'Calendar' })
      await a.click('@outlook-new-event', { label: 'New event' })
      await a.type('@outlook-event-title', 'Out of Office — Vacation (Dec 22–26)')
      await a.click('@outlook-event-teams', { label: 'Teams meeting off' })
      await a.type('@outlook-event-date', days[0], { label: 'Date' })
      await a.select('@outlook-event-start', '08:00', { label: 'Start 8:00 AM' })
      await a.select('@outlook-event-end', '18:00', { label: 'End 6:00 PM' })
      await a.type('@outlook-event-body', `Out of office ${days[0]} → ${days[days.length - 1]} (approved via Workday, request ${req?.id?.toUpperCase() ?? ''}).\nBackup: Ben Carter (SLA dashboard), Maya Johnson (vendor queue).`, { label: 'description' })
      await a.click('@outlook-event-save', { label: 'Save' })
      await a.wait(700)
      // mark the block as Out of Office and mirror it on the other working days of the week
      const ev = newestEvent((e) => e.createdBy === 'hworker' && e.title.startsWith('Out of Office'))
      if (ev) {
        db.update('outlook.events', ev.id, { showAs: 'oof', category: 'Purple' })
        for (const d of charged.slice(1)) {
          const [y, m, dd] = d.split('-').map(Number)
          db.insert('outlook.events', { ...ev, id: `${ev.id}-${dd}`, start: new Date(y, m - 1, dd, 8, 0).toISOString(), end: new Date(y, m - 1, dd, 18, 0).toISOString(), showAs: 'oof', category: 'Purple' })
        }
      }

      a.step(4)
      await a.click('@outlook-nav-mail', { label: 'Mail' })
      await a.click('@outlook-new-mail', { label: 'New mail' })
      await a.type('@outlook-compose-to', person('priya').email, { fast: true })
      await a.press('Enter')
      await a.type('@outlook-compose-subject', `Heads-up: out Dec 22–26 (request in Workday)`)
      await a.type(
        '@outlook-compose-body',
        `Hi Priya,\n\nQuick heads-up that I’ve submitted a Vacation request in Workday for Dec 22–26 — it’s in your inbox for approval. With Christmas Day as a company holiday it only uses ${charged.length} days of my balance.\n\nCoverage while I’m out:\n• Ben — warehouse SLA dashboard and daily stand-up\n• Maya — vendor queue and Fabrikam invoices\n• I’ll be reachable by phone for anything urgent\n\nMy calendar is blocked as Out of Office. Thanks!\n\nAlex`,
        { label: 'message body' },
      )
      await a.click('@outlook-send', { label: 'Send' })
      await a.wait(800)
      const mail = newestEmail((e) => e.folder === 'sent' && e.subject.startsWith('Heads-up: out Dec'))
      return {
        summary: `Submitted a ${charged.length}-day Vacation request for Dec 22–26 (Christmas Day is a holiday) — now awaiting Priya’s approval. Blocked the days as Out of Office in Outlook and emailed Priya the coverage plan.`,
        outputs: [
          { label: 'Open the Workday request', appId: 'workday', params: { page: 'timeoff', requestId: req?.id } },
          { label: 'See the Out of Office block', appId: 'outlook', params: { view: 'calendar', eventId: ev?.id } },
          { label: 'Read the email to Priya', appId: 'outlook', params: { view: 'mail', folder: 'sent', emailId: mail } },
        ],
        metrics: [
          { label: 'Days requested', value: String(charged.length) },
          { label: 'Balance after', value: `${bal - charged.length} days` },
          { label: 'Apps', value: '2' },
        ],
      }
    },
  },

  /* ───────────────────────── Workday + Okta: onboard new hire ───────────────────────── */
  {
    id: 'workday-onboard-new-hire',
    title: 'Onboard a new hire end-to-end',
    description: 'Completes Jordan Ellis’s hire in Workday, assigns the onboarding checklist, activates Okta with the right apps and books a first-week welcome meeting.',
    category: 'HR',
    apps: ['outlook', 'workday', 'okta'],
    timeSaved: '1 h 15 min',
    featured: true,
    keywords: ['onboard', 'onboarding', 'new hire', 'jordan', 'hire', 'okta', 'account', 'provision', 'welcome', 'first week', 'starting monday'],
    examples: ['Onboard Jordan Ellis', 'Get the new hire ready for Monday', 'Set up Jordan’s accounts and first week'],
    nudge: () => {
      const o = db.find<any>('workday.onboarding', 'onb-jordan')
      return o && !o.hireDone ? 'Jordan Ellis starts Monday — hire and onboarding aren’t done yet' : null
    },
    plan: ['Read James’s email about Jordan Ellis', 'Complete the Hire Employee task in Workday', 'Assign the onboarding checklist', 'Activate Jordan in Okta and assign apps', 'Schedule a first-week welcome meeting'],
    async run(a) {
      const start = nextMonday()
      const startIso = isoDate(start)
      const offer = db.get<any>('docusign.envelopes').find((e) => /Jordan Ellis/.test(e.subject))

      a.step(0)
      await a.open('outlook')
      await a.waitFor('@outlook-nav-mail', 30000)
      await a.click('@outlook-folder-inbox', { label: 'Inbox' })
      await a.click('@outlook-email-em-james-newhire', { label: 'New hire starting Monday: Jordan Ellis' })
      await a.think(`Jordan Ellis starts ${fmtDay(start)} as Operations Analyst on Alex’s team. James needs the Workday hire finished, onboarding kicked off, accounts ready and a first-week calendar.`, 2000)

      a.step(1)
      await a.open('workday')
      await a.waitFor('@workday-home', 30000)
      await a.click('@workday-inbox', { label: 'My Tasks' })
      await a.click('@workday-inbox-item-wt-hire-jordan', { label: 'Hire: Jordan Ellis — Operations Analyst' })
      await a.click('@workday-inbox-open', { label: 'Open Task' })
      await a.select('@workday-hire-position', 'P-00487', { label: 'Position: P-00487 Operations Analyst' })
      await a.click('@workday-hire-next', { label: 'Next' })
      await a.type('@workday-hire-start', startIso, { label: 'Hire Date' })
      await a.select('@workday-hire-reason', 'fill', { label: 'Reason: New Hire > Fill Vacancy' })
      await a.click('@workday-hire-next', { label: 'Next' })
      await a.think(`The signed offer letter${offer ? ' in Docusign' : ''} says $92,000 base with a 10% bonus target — inside the P3 band ($78K–$104K).`, 1600)
      await a.type('@workday-hire-base', '92000', { label: 'Base Pay Amount' })
      await a.click('@workday-hire-next', { label: 'Next' })
      await a.click('@workday-hire-submit', { label: 'Submit' })

      a.step(2)
      await a.waitFor('@workday-onboarding')
      await a.select('@workday-onb-assignee-ot-it', 'oliver', { label: 'IT equipment → Oliver Brooks' })
      await a.select('@workday-onb-assignee-ot-buddy', 'ben', { label: 'Buddy → Ben Carter' })
      await a.select('@workday-onb-assignee-ot-plan', 'maya', { label: 'First-week plan → Maya Johnson' })
      await a.click('@workday-onb-save', { label: 'Submit' })
      await a.wait(600)

      a.step(3)
      await a.open('okta')
      await a.waitFor('@okta-admin-button', 30000)
      await a.click('@okta-admin-button', { label: 'Admin' })
      await a.click('@okta-nav-directory', { label: 'Directory' })
      await a.click('@okta-nav-people', { label: 'People' })
      await a.type('@okta-people-search', 'Jordan', { label: 'Search people' })
      await a.click('@okta-user-okta-u-jordan', { label: 'Jordan Ellis' })
      await a.think('Jordan was imported from Workday as Staged with no apps. Activating, then assigning the Operations day-one stack: Microsoft 365, Teams, Slack and Workday.', 1600)
      await a.click('@okta-user-activate', { label: 'Activate' })
      await a.click('@okta-activate-confirm', { label: 'Activate' })
      await a.click('@okta-user-tab-applications', { label: 'Applications' })
      await a.click('@okta-assign-apps', { label: 'Assign Applications' })
      for (const app of ['outlook', 'teams', 'slack', 'workday']) await a.click(`@okta-assign-app-${app}`, { label: `Assign ${app === 'outlook' ? 'Microsoft Office 365' : app[0].toUpperCase() + app.slice(1)}` })
      await a.click('@okta-assign-done', { label: 'Done' })

      a.step(4)
      await a.open('outlook')
      await a.waitFor('@outlook-nav-mail', 30000)
      await a.click('@outlook-nav-calendar', { label: 'Calendar' })
      await a.click('@outlook-new-event', { label: 'New event' })
      await a.type('@outlook-event-title', 'Welcome to Northwind, Jordan! — first-week kickoff')
      for (const id of ['jordan', 'ben', 'maya', 'priya']) {
        await a.type('@outlook-event-attendees', person(id).email, { fast: true })
        await a.press('Enter')
      }
      await a.type('@outlook-event-date', startIso, { label: 'Date' })
      await a.select('@outlook-event-start', '10:00', { label: 'Start 10:00 AM' })
      await a.select('@outlook-event-end', '11:00', { label: 'End 11:00 AM' })
      await a.type(
        '@outlook-event-body',
        `Welcome Jordan!\n\nAgenda\n• Team intros (Ben — your onboarding buddy, Maya, Priya)\n• Your first-week plan: SAP & ServiceNow walkthroughs, warehouse SLA dashboard, vendor review shadowing\n• Laptop & accounts check (Okta is active — Outlook, Teams, Slack, Workday)\n• 30/60/90-day goals`,
        { label: 'description' },
      )
      await a.click('@outlook-event-save', { label: 'Send' })
      await a.wait(800)
      const ev = newestEvent((e) => e.createdBy === 'hworker' && e.title.startsWith('Welcome to Northwind'))
      return {
        summary: `Completed Jordan Ellis’s hire (Operations Analyst, $92,000, starting ${fmtDay(start)}), assigned IT equipment to Oliver, buddy to Ben and the first-week plan to Maya, activated Okta with Office 365, Teams, Slack and Workday, and invited the team to a welcome kickoff.`,
        outputs: [
          { label: 'Jordan’s Workday profile', appId: 'workday', params: { page: 'worker', workerId: 'wd-jordan' } },
          { label: 'Onboarding checklist', appId: 'workday', params: { page: 'onboarding', workerId: 'wd-jordan' } },
          { label: 'Jordan in Okta', appId: 'okta', params: { page: 'user', userId: 'okta-u-jordan' } },
          { label: 'Welcome meeting', appId: 'outlook', params: { view: 'calendar', eventId: ev?.id } },
        ],
        metrics: [
          { label: 'Tasks assigned', value: '3' },
          { label: 'Apps provisioned', value: '4' },
          { label: 'Systems updated', value: '3' },
        ],
      }
    },
  },

  /* ───────────────────────── Docusign: renewal order form ───────────────────────── */
  {
    id: 'docusign-send-order-form',
    title: 'Send the Contoso renewal for signature',
    description: 'Reads Kate’s email, sends the Contoso renewal order form (3 years, 400 seats) via Docusign with Liam in copy, and replies to Kate.',
    category: 'Sales',
    apps: ['outlook', 'docusign'],
    timeSaved: '20 min',
    keywords: ['docusign', 'order form', 'signature', 'sign', 'contoso', 'kate', 'renewal', 'envelope', 'contract', 'e-sign'],
    examples: ['Send Kate the renewal order form in Docusign', 'Get the Contoso renewal signed'],
    nudge: () => {
      const sent = db.get<any>('docusign.envelopes').some((e) => e.templateId === 'tpl-contoso-renewal' && e.status !== 'completed')
      return sent ? null : 'Kate Sullivan (Contoso) is ready to sign the 3-year renewal'
    },
    plan: ['Read Kate’s email and confirm the terms', 'Create the envelope from the renewal template', 'Add Kate as signer and Liam in copy', 'Place signature fields and send', 'Reply to Kate'],
    async run(a) {
      const kate = person('kate')
      const liam = person('liam')
      a.step(0)
      await a.open('outlook')
      await a.waitFor('@outlook-nav-mail', 30000)
      await a.click('@outlook-folder-inbox', { label: 'Inbox' })
      await a.click('@outlook-email-em-kate-renewal', { label: 'Re: Contoso renewal — next steps' })
      await a.think('Kate confirmed 3 years and 400 seats and wants the order form via Docusign. The “Contoso Order Form — Renewal” template already carries those terms ($320,160/yr, $960,480 TCV).', 2000)

      a.step(1)
      await a.open('docusign')
      await a.waitFor('@docusign-nav-home', 30000)
      await a.click('@docusign-nav-home', { label: 'Home' })
      await a.click('@docusign-start', { label: 'Start' })
      await a.click('@docusign-start-envelope', { label: 'Send an Envelope' })
      await a.click('@docusign-use-template', { label: 'Use a Template' })
      await a.click('@docusign-template-tpl-contoso-renewal', { label: 'Contoso Order Form — Renewal' })
      await a.click('@docusign-template-add', { label: 'Add' })

      a.step(2)
      await a.type('@docusign-recipient-name-0', kate.name, { label: 'Recipient name' })
      await a.type('@docusign-recipient-email-0', kate.email, { label: 'Recipient email' })
      await a.select('@docusign-recipient-role-0', 'signer', { label: 'Needs to Sign' })
      await a.click('@docusign-add-recipient', { label: 'Add Recipient' })
      await a.type('@docusign-recipient-name-1', liam.name, { label: 'Recipient name' })
      await a.type('@docusign-recipient-email-1', liam.email, { label: 'Recipient email' })
      await a.select('@docusign-recipient-role-1', 'cc', { label: 'Receives a Copy' })
      await a.type('@docusign-subject', 'Contoso × Northwind — 3-year renewal Order Form (400 seats)', { clear: true, label: 'Email Subject' })
      await a.type('@docusign-message', 'Hi Kate,\n\nAs agreed, here is the Order Form for the 3-year renewal of your Northwind Global Enterprise subscription (400 seats, pricing locked for the term). Please review and sign at your convenience.\n\nThank you!\nAlex', { clear: true, label: 'Email Message' })
      await a.click('@docusign-next', { label: 'Next' })

      a.step(3)
      for (const [f, l] of [['signature', 'Signature'], ['name', 'Name'], ['date', 'Date Signed']] as const) {
        await a.click(`@docusign-field-${f}`, { label: `${l} field` })
        await a.click(`@docusign-drop-${f}`, { label: `Place ${l} on Contoso signature block` })
      }
      await a.click('@docusign-send', { label: 'Send' })
      await a.waitFor('@docusign-sent-banner')
      await a.wait(600)
      const env = db.get<any>('docusign.envelopes').find((e) => e.templateId === 'tpl-contoso-renewal' && e.createdBy === 'hworker' && e.status === 'sent')

      a.step(4)
      await a.open('outlook')
      await a.waitFor('@outlook-nav-mail', 30000)
      await a.click('@outlook-email-em-kate-renewal', { label: 'Re: Contoso renewal — next steps' })
      await a.click('@outlook-reply', { label: 'Reply' })
      await a.type(
        '@outlook-compose-body',
        `Hi Kate,\n\nThank you — the Order Form for the 3-year renewal (400 seats) is on its way via Docusign from dse@docusign.net; Liam is in copy. Pricing is locked for the full term and the start date lines up with your current anniversary.\n\nLet me know if your legal team needs anything before signing.`,
        { label: 'message body' },
      )
      await a.click('@outlook-send', { label: 'Send' })
      await a.wait(800)
      const reply = newestEmail((e) => e.folder === 'sent' && e.replyTo === 'em-kate-renewal')
      return {
        summary: 'Sent the Contoso 3-year renewal Order Form (400 seats, $960,480 TCV) to Kate Sullivan for signature with Liam O’Connor in copy, and replied to Kate.',
        outputs: [
          { label: 'Open the envelope in Docusign', appId: 'docusign', params: { envelopeId: env?.id } },
          { label: 'View the reply to Kate', appId: 'outlook', params: { view: 'mail', folder: 'sent', emailId: reply } },
        ],
        metrics: [
          { label: 'Contract value', value: '$960K' },
          { label: 'Fields placed', value: '3' },
          { label: 'Recipients', value: '2' },
        ],
      }
    },
  },

  /* ───────────────────────── Greenhouse: onsite scheduling ───────────────────────── */
  {
    id: 'greenhouse-schedule-interviews',
    title: 'Advance top candidates to onsite',
    description: 'Reviews phone-screen scorecards for the Senior Operations Manager role, moves the two strongest candidates to Onsite and schedules their panel interviews.',
    category: 'HR',
    apps: ['greenhouse', 'outlook'],
    timeSaved: '40 min',
    keywords: ['greenhouse', 'interview', 'schedule', 'candidate', 'onsite', 'recruiting', 'pipeline', 'hiring', 'panel', 'scorecard'],
    examples: ['Move the best candidates to onsite and schedule interviews', 'Schedule onsites for the ops manager role'],
    nudge: () => {
      const n = db.get<any>('greenhouse.candidates').filter((c) => ['gh-cand-priyanka', 'gh-cand-marcus'].includes(c.id) && c.stage === 'phone_screen').length
      return n ? `${n} strong candidates are waiting to move to onsite` : null
    },
    plan: ['Open the Senior Operations Manager pipeline', 'Compare phone-screen scorecards', 'Move the top two candidates to Onsite', 'Schedule the onsite panels', 'Update James by email'],
    async run(a) {
      const cands = db.get<any>('greenhouse.candidates').filter((c) => c.jobId === 'gh-job-ops-manager' && c.stage === 'phone_screen')
      const score = (c: any) => c.scorecards.reduce((n: number, s: any) => n + ({ strong_yes: 2, yes: 1, mixed: 0, no: -1, strong_no: -2 } as any)[s.rating], 0)
      const ranked = [...cands].sort((x, y) => score(y) - score(x))
      const picks = ['gh-cand-priyanka', 'gh-cand-marcus'].map((id) => db.find<any>('greenhouse.candidates', id)).filter(Boolean)
      const days = [nextWeekday(2, 4), nextWeekday(3, 4)]

      a.step(0)
      await a.open('greenhouse')
      await a.waitFor('@greenhouse-nav-jobs', 30000)
      await a.click('@greenhouse-nav-jobs', { label: 'Jobs' })
      await a.click('@greenhouse-job-gh-job-ops-manager', { label: 'Senior Operations Manager — Fulfillment' })

      a.step(1)
      await a.waitFor('@greenhouse-stage-col-phone_screen')
      await a.think(`${cands.length} candidates in Phone Screen. ${picks.map((p: any) => `${p.name} (${p.scorecards.length} scorecards, net +${score(p)})`).join(' and ')} lead; ${ranked.slice(2).map((c) => c.name.split(' ')[0]).join(', ') || 'the rest'} came back mixed. James suggests Priya’s Tue/Wed afternoons for the panel.`, 2400)

      for (const [i, c] of picks.entries()) {
        a.step(2)
        await a.click(`@greenhouse-card-${c.id}`, { label: c.name })
        await a.click('@greenhouse-move-stage', { label: 'Move Stage' })
        await a.click('@greenhouse-stage-option-onsite', { label: 'Onsite' })
        await a.click('@greenhouse-move-confirm', { label: 'Move Stage' })
        a.step(3)
        await a.click('@greenhouse-schedule-interview', { label: 'Schedule Interview' })
        await a.select('@greenhouse-interview-name', 'onsite-panel', { label: 'Onsite — Operations Panel' })
        await a.type('@greenhouse-interview-date', isoDate(days[i]), { label: 'Date' })
        await a.select('@greenhouse-interview-time', '13:00', { label: '1:00 PM' })
        await a.select('@greenhouse-interview-location', 'onsite-boston', { label: 'Onsite — Boston HQ' })
        await a.click('@greenhouse-interview-send', { label: 'Schedule & Send Invites' })
        await a.wait(500)
        if (i === 0) await a.click('@greenhouse-back-to-job', { label: 'Back to pipeline' })
      }

      a.step(4)
      await a.open('outlook')
      await a.waitFor('@outlook-nav-mail', 30000)
      await a.click('@outlook-nav-mail', { label: 'Mail' })
      await a.click('@outlook-new-mail', { label: 'New mail' })
      await a.type('@outlook-compose-to', person('james').email, { fast: true })
      await a.press('Enter')
      await a.type('@outlook-compose-subject', 'Sr. Ops Manager — Priyanka & Marcus moved to onsite')
      await a.type(
        '@outlook-compose-body',
        `Hi James,\n\nThanks for the nudge — both phone screens were excellent, so I moved them to Onsite and booked the Operations Panel (Priya, Ben, Maya, 90 min, Boston HQ):\n\n• Priyanka Desai — ${fmtDay(days[0])}, 1:00–2:30 PM\n• Marcus Bell — ${fmtDay(days[1])}, 1:00–2:30 PM\n\nInvites are out from Greenhouse. Could you coordinate the case study and values interviews around those slots?\n\nAlex`,
        { label: 'message body' },
      )
      await a.click('@outlook-send', { label: 'Send' })
      await a.wait(800)
      const ivs = db.get<any>('greenhouse.interviews').filter((i) => i.createdBy === 'hworker')
      return {
        summary: `Moved Priyanka Desai and Marcus Bell to Onsite and scheduled their Operations Panels (${fmtDay(days[0])} and ${fmtDay(days[1])}, 1:00 PM) with Priya, Ben and Maya. James has the update.`,
        outputs: [
          { label: 'Priyanka Desai in Greenhouse', appId: 'greenhouse', params: { candidateId: 'gh-cand-priyanka' } },
          { label: 'Marcus Bell in Greenhouse', appId: 'greenhouse', params: { candidateId: 'gh-cand-marcus' } },
          { label: 'Job pipeline', appId: 'greenhouse', params: { jobId: 'gh-job-ops-manager' } },
          { label: 'Panel in Outlook calendar', appId: 'outlook', params: { view: 'calendar', eventId: ivs[ivs.length - 1]?.eventId } },
        ],
        metrics: [
          { label: 'Candidates advanced', value: '2' },
          { label: 'Interviews booked', value: String(ivs.length) },
          { label: 'Interviewers', value: '3' },
        ],
      }
    },
  },
]

