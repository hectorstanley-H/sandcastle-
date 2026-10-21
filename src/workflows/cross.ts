/**
 * Cross-application workflows: one agent, many systems. These are the showcase runs.
 */
import type { Workflow } from '@/agent/types'
import { db } from '@/db/db'
import { isoDate } from '@/data/time'
import { person } from '@/data/people'
import { newestEmail } from './core'

const nextMonday = () => {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  while (d.getDay() !== 1) d.setDate(d.getDate() + 1)
  return d
}
const fmtDay = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

export const workflows: Workflow[] = [
  /* ───────────── New hire: HR → IT → comms ───────────── */
  {
    id: 'cross-new-hire-day-one',
    title: 'Get a new hire ready for day one',
    description: 'One agent across five systems: finishes the Workday hire, orders laptop and access in ServiceNow, welcomes Jordan in Slack, briefs the onboarding buddy in Teams and reports back to HR.',
    category: 'HR',
    apps: ['outlook', 'workday', 'servicenow', 'slack', 'teams'],
    timeSaved: '1 h 30 min',
    featured: true,
    keywords: ['new hire', 'onboard', 'onboarding', 'jordan', 'day one', 'laptop', 'access', 'welcome', 'servicenow', 'buddy', 'starting monday'],
    examples: ['Get Jordan ready for Monday', 'Onboard the new hire across HR and IT', 'Order Jordan’s laptop and accounts'],
    nudge: () => {
      const ordered = db.get<any>('servicenow.requests').some((r) => r.itemId === 'cat-onboarding' && r.variables?.new_hire_name === 'Jordan Ellis')
      return ordered ? null : 'Jordan Ellis starts Monday — no laptop or access request in ServiceNow yet'
    },
    plan: [
      'Read James’s new-hire email',
      'Finish the Hire Employee task in Workday',
      'Order laptop and app access in ServiceNow',
      'Welcome Jordan in Slack #new-hires',
      'Brief the onboarding buddy in Teams',
      'Report back to James',
    ],
    async run(a) {
      const start = nextMonday()
      const startIso = isoDate(start)

      a.step(0)
      await a.open('outlook')
      await a.waitFor('@outlook-folder-inbox', 25000)
      await a.click('@outlook-folder-inbox', { label: 'Inbox' })
      await a.click('@outlook-email-em-james-newhire', { label: 'New hire starting Monday: Jordan Ellis' })
      await a.think(`Jordan Ellis joins ${fmtDay(start)} as an Operations Analyst. Four systems need touching: Workday (hire), ServiceNow (laptop + access), Slack (team welcome) and Teams (buddy). I’ll do them in that order so IT has the hire record.`, 2000)

      a.step(1)
      await a.open('workday')
      await a.waitFor('@workday-home', 25000)
      await a.click('@workday-inbox', { label: 'My Tasks' })
      await a.wait(500)
      if (a.exists('@workday-inbox-item-wt-hire-jordan')) {
        await a.click('@workday-inbox-item-wt-hire-jordan', { label: 'Hire: Jordan Ellis — Operations Analyst' })
        await a.click('@workday-inbox-open', { label: 'Open Task' })
        await a.select('@workday-hire-position', 'P-00487', { label: 'Position: P-00487 Operations Analyst' })
        await a.click('@workday-hire-next', { label: 'Next' })
        await a.type('@workday-hire-start', startIso, { label: 'Hire Date' })
        await a.select('@workday-hire-reason', 'fill', { label: 'Reason: New Hire > Fill Vacancy' })
        await a.click('@workday-hire-next', { label: 'Next' })
        await a.think('The signed offer letter in Docusign says $92,000 base — inside the P3 band.', 1200)
        await a.type('@workday-hire-base', '92000', { label: 'Base Pay Amount' })
        await a.click('@workday-hire-next', { label: 'Next' })
        await a.click('@workday-hire-submit', { label: 'Submit' })
        await a.wait(800)
      } else {
        await a.think('The Workday hire for Jordan is already complete — moving on to IT.', 1000)
      }

      a.step(2)
      await a.open('servicenow')
      await a.waitFor('@sn-menu-all', 25000)
      await a.click('@sn-menu-all', { label: 'All' })
      await a.click('@sn-nav-onboarding', { label: 'New Hire Onboarding' })
      await a.type('@sn-var-new_hire_name', 'Jordan Ellis', { label: 'New hire name' })
      await a.type('@sn-var-start_date', startIso, { label: 'Start date' })
      await a.type('@sn-var-title', 'Operations Analyst', { label: 'Job title' })
      await a.type('@sn-var-manager', 'Alex Morgan', { label: 'Manager' })
      await a.think('Ops analysts live in SAP, Power BI and Jira day to day — adding those to the default Microsoft 365 + Slack access.', 1300)
      for (const sw of ['workday', 'sap-s-4hana', 'power-bi', 'jira', 'servicenow']) await a.click(`@sn-var-sw-${sw}`)
      await a.type('@sn-var-notes', 'Desk near the Ops pod (4th floor). Buddy: Ben Carter. Please have the laptop imaged and at the desk by 8:30 AM Monday.', { label: 'Additional notes' })
      await a.click('@sn-order-now', { label: 'Order Now' })
      await a.wait(900)
      const req = db.get<any>('servicenow.requests').find((r) => r.itemId === 'cat-onboarding' && r.variables?.new_hire_name === 'Jordan Ellis')

      a.step(3)
      await a.open('slack')
      await a.click('@slack-channel-new-hires', { label: '#new-hires', timeout: 25000 })
      await a.type(
        '@slack-compose',
        `:wave: Please welcome *Jordan Ellis*, who joins Operations on ${fmtDay(start)} as an Operations Analyst! Jordan will be working on vendor performance and warehouse SLAs with Ben and Maya. Say hi when you see them on the 4th floor :tada:`,
        { label: 'Message #new-hires' },
      )
      await a.press('Enter')

      a.step(4)
      await a.open('teams')
      await a.waitFor('@teams-nav-chat', 25000)
      await a.click('@teams-nav-chat', { label: 'Chat' })
      await a.click('@teams-chat-ben', { label: 'Ben Carter' })
      await a.type(
        '@teams-compose',
        `Hi Ben — you’re Jordan Ellis’s onboarding buddy starting ${fmtDay(start)}. Laptop + access are ordered in ServiceNow (${req?.number ?? 'request submitted'}). Could you grab lunch with Jordan on day one and walk through the warehouse SLA dashboard on Tuesday? Thanks!`,
        { label: 'Message Ben' },
      )
      await a.press('Enter')

      a.step(5)
      await a.open('outlook')
      await a.click('@outlook-email-em-james-newhire', { label: 'New hire starting Monday: Jordan Ellis', timeout: 20000 })
      await a.click('@outlook-reply', { label: 'Reply' })
      await a.type(
        '@outlook-compose-body',
        `Hi James,\n\nAll set for Jordan’s first day (${fmtDay(start)}):\n\n• Workday — Hire Employee task completed (Operations Analyst, P-00487)\n• ServiceNow — ${req?.number ?? 'New Hire Onboarding request'} for a standard laptop + Microsoft 365, Slack, Workday, SAP, Power BI, Jira and ServiceNow access\n• Slack — welcome posted in #new-hires\n• Buddy — Ben Carter briefed in Teams\n\nLet me know if anything else is needed from my side.`,
        { label: 'message body' },
      )
      await a.click('@outlook-send', { label: 'Send' })
      await a.wait(800)
      const reply = newestEmail((e) => e.folder === 'sent' && e.replyTo === 'em-james-newhire')
      return {
        summary: `Jordan Ellis is ready for ${fmtDay(start)}: Workday hire done, ${req?.number ?? 'onboarding request'} ordered in ServiceNow, welcome posted in Slack, Ben briefed in Teams and James updated.`,
        outputs: [
          { label: 'ServiceNow onboarding request', appId: 'servicenow', params: { requestId: req?.id } },
          { label: 'Jordan’s Workday profile', appId: 'workday', params: { page: 'worker', workerId: 'wd-jordan' } },
          { label: 'Welcome post in #new-hires', appId: 'slack', params: { channelId: 'new-hires' } },
          { label: 'Message to Ben in Teams', appId: 'teams', params: { chatId: 'ben' } },
          { label: 'Reply to James', appId: 'outlook', params: { view: 'mail', folder: 'sent', emailId: reply } },
        ],
        metrics: [
          { label: 'Systems updated', value: '5' },
          { label: 'Apps provisioned', value: '7' },
          { label: 'People informed', value: '3' },
        ],
      }
    },
  },

  /* ───────────── Renewal: CRM → contract → team ───────────── */
  {
    id: 'cross-contoso-renewal-close',
    title: 'Close a renewal end-to-end',
    description: 'Marks the Contoso renewal Closed Won in Salesforce, sends the order form for signature in Docusign, celebrates in Slack #sales and confirms with the customer.',
    category: 'Sales',
    apps: ['outlook', 'salesforce', 'docusign', 'slack'],
    timeSaved: '45 min',
    featured: true,
    keywords: ['renewal', 'contoso', 'close', 'closed won', 'order form', 'docusign', 'kate', 'contract', 'deal', 'salesforce'],
    examples: ['Close out the Contoso renewal', 'Kate is ready to sign — handle it'],
    nudge: () => {
      const opp = db.get<any>('salesforce.opportunities').find((o) => /contoso/i.test(o.name) && /renewal/i.test(o.name))
      return opp && opp.stage !== 'Closed Won' ? 'Contoso said yes to the 3-year renewal — close it everywhere' : null
    },
    plan: ['Read Kate’s confirmation', 'Mark the opportunity Closed Won in Salesforce', 'Send the order form via Docusign', 'Celebrate in Slack #sales', 'Confirm with Kate'],
    async run(a) {
      const kate = person('kate')
      const liam = person('liam')
      const opp = db.get<any>('salesforce.opportunities').find((o) => /contoso/i.test(o.name) && /renewal/i.test(o.name))

      a.step(0)
      await a.open('outlook')
      await a.waitFor('@outlook-folder-inbox', 25000)
      await a.click('@outlook-folder-inbox', { label: 'Inbox' })
      await a.click('@outlook-email-em-kate-renewal', { label: 'Re: Contoso renewal — next steps' })
      await a.think('Kate confirmed 3 years and 400 seats and asked for two things: the order form via Docusign and the opportunity updated. I’ll close the deal in Salesforce first so the contract matches the CRM.', 1800)

      a.step(1)
      await a.open('salesforce')
      await a.waitFor('@sf-search', 25000)
      await a.click('@sf-nav-opportunities', { label: 'Opportunities' })
      await a.type('@sf-list-search', 'Contoso', { label: 'Search this list' })
      if (opp) await a.click(`@sf-list-row-${opp.id}`, { label: opp.name })
      if (opp && opp.stage !== 'Closed Won' && a.exists('@sf-path-closed')) {
        await a.click('@sf-path-closed', { label: 'Closed' })
        await a.click('@sf-path-action', { label: 'Select Closed Stage' })
        await a.select('@sf-close-stage', 'Closed Won', { label: 'Stage' })
        await a.click('@sf-close-save', { label: 'Save' })
        await a.wait(1500)
      } else {
        await a.think('The opportunity is already Closed Won — no change needed.', 900)
      }

      a.step(2)
      await a.open('docusign')
      await a.waitFor('@docusign-nav-home', 25000)
      await a.click('@docusign-nav-home', { label: 'Home' })
      await a.click('@docusign-start', { label: 'Start' })
      await a.click('@docusign-start-envelope', { label: 'Send an Envelope' })
      await a.click('@docusign-use-template', { label: 'Use a Template' })
      await a.click('@docusign-template-tpl-contoso-renewal', { label: 'Contoso Order Form — Renewal' })
      await a.click('@docusign-template-add', { label: 'Add' })
      await a.type('@docusign-recipient-name-0', kate.name, { label: 'Recipient name' })
      await a.type('@docusign-recipient-email-0', kate.email, { label: 'Recipient email' })
      await a.select('@docusign-recipient-role-0', 'signer', { label: 'Needs to Sign' })
      await a.click('@docusign-add-recipient', { label: 'Add Recipient' })
      await a.type('@docusign-recipient-name-1', liam.name, { label: 'Recipient name' })
      await a.type('@docusign-recipient-email-1', liam.email, { label: 'Recipient email' })
      await a.select('@docusign-recipient-role-1', 'cc', { label: 'Receives a Copy' })
      await a.type('@docusign-subject', 'Contoso × Northwind — 3-year renewal Order Form (400 seats)', { clear: true, label: 'Email Subject' })
      await a.click('@docusign-next', { label: 'Next' })
      for (const [f, l] of [['signature', 'Signature'], ['name', 'Name'], ['date', 'Date Signed']] as const) {
        await a.click(`@docusign-field-${f}`, { label: `${l} field` })
        await a.click(`@docusign-drop-${f}`, { label: `Place ${l}` })
      }
      await a.click('@docusign-send', { label: 'Send' })
      await a.waitFor('@docusign-sent-banner')
      await a.wait(600)
      const env = db
        .get<any>('docusign.envelopes')
        .filter((e) => e.templateId === 'tpl-contoso-renewal' && e.createdBy === 'hworker')
        .pop()

      a.step(3)
      await a.open('slack')
      await a.click('@slack-channel-sales', { label: '#sales', timeout: 25000 })
      await a.type('@slack-compose', `:trophy: *Contoso renewal — Closed Won!* 3 years, 400 seats. Order form is out for signature with Kate Sullivan. Huge thanks @Liam and the CS team :tada:`, { label: 'Message #sales' })
      await a.press('Enter')

      a.step(4)
      await a.open('outlook')
      await a.click('@outlook-email-em-kate-renewal', { label: 'Re: Contoso renewal — next steps', timeout: 20000 })
      await a.click('@outlook-reply', { label: 'Reply' })
      await a.type(
        '@outlook-compose-body',
        `Hi Kate,\n\nWonderful news — thank you! The Order Form for the 3-year renewal (400 seats, pricing locked for the term) is in your inbox via Docusign, with Liam in copy.\n\nOnce it’s countersigned, Aisha from our Customer Success team will reach out to plan the FY27 kickoff.`,
        { label: 'message body' },
      )
      await a.click('@outlook-send', { label: 'Send' })
      await a.wait(800)
      const reply = newestEmail((e) => e.folder === 'sent' && e.replyTo === 'em-kate-renewal')
      return {
        summary: 'Closed the Contoso renewal (3 years, 400 seats) in Salesforce, sent the order form to Kate via Docusign with Liam in copy, celebrated in #sales and confirmed with Kate.',
        outputs: [
          { label: 'Opportunity in Salesforce', appId: 'salesforce', params: { object: 'Opportunity', id: opp?.id } },
          { label: 'Envelope in Docusign', appId: 'docusign', params: { envelopeId: env?.id } },
          { label: 'Post in #sales', appId: 'slack', params: { channelId: 'sales' } },
          { label: 'Reply to Kate', appId: 'outlook', params: { view: 'mail', folder: 'sent', emailId: reply } },
        ],
        metrics: [
          { label: 'Systems updated', value: '4' },
          { label: 'Seats', value: '400' },
          { label: 'Term', value: '3 yrs' },
        ],
      }
    },
  },

  /* ───────────── P1 incident: ITSM → engineering → comms ───────────── */
  {
    id: 'cross-p1-incident-bridge',
    title: 'Run a P1 incident bridge',
    description: 'Takes the SAP login P1 in ServiceNow, opens a Jira bug for the SAP Basis team, posts status in Slack #it-help and Teams, and briefs the Director of IT.',
    category: 'IT',
    apps: ['servicenow', 'jira', 'slack', 'teams', 'outlook'],
    timeSaved: '40 min',
    keywords: ['p1', 'incident', 'outage', 'sap login', 'bridge', 'escalate', 'major incident', 'status update', 'jira bug'],
    examples: ['Escalate the SAP login outage', 'Run the incident bridge for the P1'],
    plan: ['Review the SAP Fiori login incident', 'Log a work note and escalate', 'Open a Jira bug for SAP Basis', 'Post status in Slack and Teams', 'Brief Grace by email'],
    async run(a) {
      const inc = db.find<any>('servicenow.incidents', 'inc-new-05') ?? db.get<any>('servicenow.incidents').find((i) => /sap/i.test(i.short ?? i.shortDescription ?? ''))
      const num = inc?.number ?? 'INC0012345'

      a.step(0)
      await a.open('servicenow')
      await a.waitFor('@sn-menu-all', 25000)
      await a.click('@sn-menu-all', { label: 'All' })
      await a.click('@sn-nav-incident-open', { label: 'Incidents › Open' })
      if (inc) await a.click(`@sn-inc-${inc.id}`, { label: num })
      await a.think(`${num}: SAP Fiori logins failing for Chicago AP since 7:40 AM — 3 related tickets, invoice posting is blocked before the payment run. This is a P1 that needs SAP Basis engaged now.`, 2000)

      a.step(1)
      if (a.exists('@sn-f-urgency')) await a.select('@sn-f-urgency', '1', { label: 'Urgency: 1 - High' })
      if (a.exists('@sn-f-impact')) await a.select('@sn-f-impact', '1', { label: 'Impact: 1 - High' })
      await a.type('@sn-f-worknotes', 'Major incident declared. SAP Basis engaged via Jira; status updates every 30 min in #it-help and the IT Service Desk channel. Workaround: AP can post via SAP GUI (transaction MIRO) until Fiori SSO is restored.', { label: 'Work notes' })
      await a.click('@sn-form-update', { label: 'Update' })
      await a.wait(800)

      a.step(2)
      await a.open('jira')
      await a.click('@jira-create', { label: 'Create', timeout: 25000 })
      if (a.exists('@jira-create-type')) await a.select('@jira-create-type', 'Bug', { label: 'Work type: Bug' })
      await a.type('@jira-create-summary', `[${num}] SAP Fiori SSO login failures — Chicago AP blocked`, { label: 'Summary' })
      await a.type('@jira-create-desc', `ServiceNow ${num} (P1).\n\nSymptoms: SAML assertion rejected on Fiori launchpad since 07:40 CT; SAP GUI unaffected.\nSuspected cause: IdP signing certificate rotated overnight; Fiori trust store not updated.\nAsk: SAP Basis to import the new Okta signing cert and restart the ICM.`, { label: 'Description' })
      if (a.exists('@jira-create-priority')) await a.select('@jira-create-priority', 'Highest', { label: 'Priority: Highest' })
      await a.click('@jira-create-submit', { label: 'Create' })
      await a.wait(900)
      const issue = db.get<any>('jira.issues').filter((i) => i.createdBy === 'hworker').pop()
      const key = issue?.key ?? 'OPS-148'

      a.step(3)
      await a.open('slack')
      await a.click('@slack-channel-it-help', { label: '#it-help', timeout: 25000 })
      await a.type('@slack-compose', `:rotating_light: *P1 — SAP Fiori login failures (${num})*. SAP Basis engaged (${key}). Workaround for AP: use SAP GUI / MIRO to post invoices. Next update in 30 min.`, { label: 'Message #it-help' })
      await a.press('Enter')
      await a.open('teams')
      await a.waitFor('@teams-nav-teams', 25000)
      await a.click('@teams-nav-teams', { label: 'Teams' })
      await a.click('@teams-channel-it-service-desk', { label: 'IT Service Desk' })
      await a.type('@teams-compose', `P1 bridge open for ${num} (SAP Fiori SSO). Jira ${key} with SAP Basis. Service desk: tag new SAP login tickets to ${num} as children. Workaround: SAP GUI / MIRO.`, { label: 'Post in IT Service Desk' })
      await a.press('Enter')

      a.step(4)
      await a.open('outlook')
      await a.click('@outlook-new-mail', { label: 'New mail', timeout: 20000 })
      await a.type('@outlook-compose-to', person('grace').email, { fast: true })
      await a.press('Enter')
      await a.type('@outlook-compose-subject', `P1 update: SAP Fiori login failures (${num})`)
      await a.type(
        '@outlook-compose-body',
        `Hi Grace,\n\nQuick brief on the P1:\n\n• Impact: Chicago AP can’t log in to SAP Fiori — invoice posting blocked ahead of Friday’s payment run\n• Likely cause: Okta signing cert rotated overnight, Fiori trust store not updated\n• Actions: ${num} escalated to P1, SAP Basis engaged via Jira ${key}, status posted in #it-help and the IT Service Desk channel\n• Workaround: AP posting via SAP GUI (MIRO)\n\nNext update in 30 minutes.`,
        { label: 'message body' },
      )
      await a.click('@outlook-send', { label: 'Send' })
      await a.wait(800)
      const mail = newestEmail((e) => e.folder === 'sent' && String(e.subject).startsWith('P1 update'))
      return {
        summary: `Escalated ${num} to P1, opened ${key} for SAP Basis, posted status in Slack and Teams, and briefed Grace Kim.`,
        outputs: [
          { label: `${num} in ServiceNow`, appId: 'servicenow', params: { sysId: inc?.id } },
          { label: `${key} in Jira`, appId: 'jira', params: { issueKey: key } },
          { label: 'Status in #it-help', appId: 'slack', params: { channelId: 'it-help' } },
          { label: 'Brief to Grace', appId: 'outlook', params: { view: 'mail', folder: 'sent', emailId: mail } },
        ],
        metrics: [
          { label: 'Systems updated', value: '5' },
          { label: 'Stakeholders informed', value: '3 channels' },
          { label: 'Time to bridge', value: '< 3 min' },
        ],
      }
    },
  },
]
