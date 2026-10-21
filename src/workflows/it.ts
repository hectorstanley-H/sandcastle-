import type { AgentAPI, Workflow } from '@/agent/types'
import { db } from '@/db/db'
import { person } from '@/data/people'
import { newestEmail } from './core'

const inc = (id: string) => db.find<any>('servicenow.incidents', id)
const num = (id: string) => inc(id)?.number ?? id
const PL: Record<number, string> = { 1: 'P1 Critical', 2: 'P2 High', 3: 'P3 Moderate', 4: 'P4 Low', 5: 'P5 Planning' }

async function openEmail(a: AgentAPI, id: string, label: string) {
  await a.open('outlook')
  await a.click('@outlook-folder-inbox', { label: 'Inbox', timeout: 25000 })
  await a.click(`@outlook-email-${id}`, { label })
}

async function pickGroup(a: AgentAPI, field: string, typed: string, groupId: string, label: string) {
  await a.type(field, typed, { clear: true, fast: true, label: 'Assignment group' })
  await a.click(`@sn-ac-${groupId}`, { label })
}

export const workflows: Workflow[] = [
  /* ─────────────────────────── ServiceNow triage ─────────────────────────── */
  {
    id: 'servicenow-triage-incidents',
    title: 'Triage the incident queue',
    description: 'Reads Oliver’s heads-up, works through every new unassigned incident in ServiceNow — category, priority, assignment group, work notes, duplicates — and replies with a summary.',
    category: 'IT',
    apps: ['outlook', 'servicenow'],
    timeSaved: '50 min',
    featured: true,
    keywords: ['servicenow', 'incident', 'incidents', 'triage', 'queue', 'assign', 'route', 'vpn', 'sap login', 'unassigned', 'it tickets', 'service desk', 'oliver'],
    examples: ['Triage the unassigned ServiceNow incidents', 'Route this morning’s VPN and SAP incidents', 'Help Oliver with the incident queue'],
    nudge: () => {
      const n = db.get<any>('servicenow.incidents').filter((i) => !i.assignmentGroup && i.priority <= 2 && !['Resolved', 'Closed', 'Canceled'].includes(i.state)).length
      const all = db.get<any>('servicenow.incidents').filter((i) => !i.assignmentGroup && !['Resolved', 'Closed', 'Canceled'].includes(i.state)).length
      return n ? `${all} unassigned incidents in ServiceNow — ${n} are P1/P2` : null
    },
    plan: [
      'Read Oliver’s email about the incident spike',
      'Open the Open - Unassigned incident list in ServiceNow',
      'Triage the lead VPN incident and route the Boston VPN cluster to Network',
      'Route SAP Fiori login failures to SAP Basis and Outlook sync to Messaging',
      'Close the duplicate and route the remaining one-offs',
      'Reply to Oliver with a triage summary',
    ],
    async run(a) {
      a.step(0)
      await openEmail(a, 'em-oliver-incidents', 'Heads up: VPN + SAP login incidents piling up')
      await a.think('Oliver says ~12 incidents came in since 7am, mostly Boston VPN disconnects and SAP Fiori login failures, all unassigned. I’ll triage them in ServiceNow and report back.', 1600)

      a.step(1)
      await a.open('servicenow')
      await a.click('@sn-menu-all', { label: 'All', timeout: 25000 })
      await a.click('@sn-nav-incident-unassigned', { label: 'Incident › Open - Unassigned' })
      const queue = db.get<any>('servicenow.incidents').filter((i) => !i.assignmentGroup && !['Resolved', 'Closed', 'Canceled'].includes(i.state))
      const vpn = queue.filter((i) => /vpn|globalprotect/i.test(i.shortDescription))
      const sap = queue.filter((i) => /sap|fiori/i.test(i.shortDescription))
      const outlook = queue.filter((i) => /outlook/i.test(i.shortDescription))
      await a.think(`${queue.length} open unassigned incidents: ${vpn.length} VPN drops all on gateway BOS-GW01 in Boston, ${sap.length} SAP Fiori “SAML assertion invalid” failures (Boston + Chicago AP), ${outlook.length} Outlook sync — two of those are from Priya — plus a printer and an Okta lockout.`, 2200)

      a.step(2)
      await a.click('@sn-inc-inc-new-01', { label: `${num('inc-new-01')} VPN keeps disconnecting` })
      await a.select('@sn-f-category', 'Network', { label: 'Category' })
      await a.select('@sn-f-impact', '1', { label: 'Impact' })
      await pickGroup(a, '@sn-f-group', 'Netw', 'grp-network', 'Network')
      await a.type('@sn-f-worknotes', `Parent incident for Boston VPN instability. ${vpn.length} users on GlobalProtect gateway BOS-GW01 drop every 10–15 min since ~7am; NYC fallback is slow. Impact raised to High (multiple users, whole floor). Related: ${vpn.filter((i) => i.id !== 'inc-new-01').map((i) => i.number).join(', ')}.`, { label: 'Work notes', fast: true })
      await a.click('@sn-form-update', { label: 'Update' })

      const rest = vpn.filter((i) => i.id !== 'inc-new-01')
      for (const i of rest) await a.click(`@sn-row-check-${i.id}`, { label: `Select ${i.number}` })
      await a.select('@sn-list-actions', 'update', { label: 'Actions on selected rows' })
      await a.select('@sn-m-category', 'Network', { label: 'Category' })
      await pickGroup(a, '@sn-m-group', 'Netw', 'grp-network', 'Network')
      await a.type('@sn-m-worknotes', `Same root cause as ${num('inc-new-01')} (BOS-GW01). Routed to Network; please update the parent.`, { label: 'Work notes', fast: true })
      await a.click('@sn-multi-update', { label: 'Update' })

      a.step(3)
      await a.think(`The Chicago AP team can’t post invoices before the 11am payment run — that’s business-critical, so the SAP failures go in as P1 for SAP Basis. Likely an expired SAML signing certificate on the Fiori side.`, 1600)
      for (const i of sap) await a.click(`@sn-row-check-${i.id}`, { label: `Select ${i.number}` })
      await a.select('@sn-list-actions', 'update', { label: 'Actions on selected rows' })
      await a.select('@sn-m-category', 'Software', { label: 'Category' })
      await a.select('@sn-m-impact', '1', { label: 'Impact' })
      await a.select('@sn-m-urgency', '1', { label: 'Urgency' })
      await pickGroup(a, '@sn-m-group', 'SAP', 'grp-sap-basis', 'SAP Basis')
      await a.type('@sn-m-worknotes', 'Fiori launchpad returns "SAML 2.0 assertion invalid" for Boston + Chicago users since ~7:30am. Check IdP signing cert on S4P. AP payment run at 11:00 is blocked.', { label: 'Work notes', fast: true })
      await a.click('@sn-multi-update', { label: 'Update' })

      const dup = outlook.find((i) => /2nd ticket/i.test(i.shortDescription)) ?? outlook[outlook.length - 1]
      const outlookMain = outlook.filter((i) => i.id !== dup?.id)
      const parent = outlookMain.find((i) => i.callerId === dup?.callerId) ?? outlookMain[0]
      for (const i of outlookMain) await a.click(`@sn-row-check-${i.id}`, { label: `Select ${i.number}` })
      await a.select('@sn-list-actions', 'update', { label: 'Actions on selected rows' })
      await a.select('@sn-m-category', 'Software', { label: 'Category' })
      await pickGroup(a, '@sn-m-group', 'Mess', 'grp-messaging', 'Messaging')
      await a.type('@sn-m-worknotes', 'Outlook desktop stuck on "Updating this folder"; OWA works. Possible Exchange Online sync issue — check service health and mailbox replication.', { label: 'Work notes', fast: true })
      await a.click('@sn-multi-update', { label: 'Update' })

      a.step(4)
      if (dup && parent) {
        await a.think(`${dup.number} is Priya raising the same Outlook issue a second time — closing it as a duplicate of ${parent.number} so Messaging works one ticket.`, 1300)
        await a.click(`@sn-inc-${dup.id}`, { label: `${dup.number} Outlook not syncing (2nd ticket)` })
        await a.click('@sn-tab-resolution', { label: 'Resolution Information' })
        await a.select('@sn-f-close-code', 'Duplicate', { label: 'Resolution code' })
        await a.type('@sn-f-close-notes', `Duplicate of ${parent.number} (same caller, same Outlook sync issue). Follow progress there.`, { label: 'Resolution notes', fast: true })
        await a.click('@sn-form-resolve', { label: 'Resolve' })
        a.db.update('servicenow.incidents', dup.id, { duplicateOf: parent.id })
      }
      // printer → Field Services, Okta lockout → IAM
      await a.click('@sn-inc-inc-new-08', { label: `${num('inc-new-08')} Printer BOS-4F-MFP02` })
      await a.select('@sn-f-category', 'Hardware', { label: 'Category' })
      await pickGroup(a, '@sn-f-group', 'Field', 'grp-field-bos', 'Field Services - Boston')
      await a.type('@sn-f-worknotes', 'Paper jam + offline on BOS-4F-MFP02 (4th floor kitchen). On-site visit needed.', { label: 'Work notes', fast: true })
      await a.click('@sn-form-update', { label: 'Update' })
      await a.click('@sn-inc-inc-new-11', { label: `${num('inc-new-11')} Locked out of Okta` })
      await a.select('@sn-f-category', 'Software', { label: 'Category' })
      await pickGroup(a, '@sn-f-group', 'Ident', 'grp-iam', 'Identity & Access Management')
      await a.type('@sn-f-worknotes', 'New phone, Okta Verify not enrolled, account locked. Verify identity, unlock and reset MFA factor.', { label: 'Work notes', fast: true })
      await a.click('@sn-form-update', { label: 'Update' })

      a.step(5)
      const tri = (id: string) => inc(id)
      const rows = [...vpn, ...sap, ...outlookMain, tri('inc-new-08'), tri('inc-new-11')].filter(Boolean).map((i: any) => tri(i.id))
      const line = (i: any) => `${i.number}  ${PL[i.priority].padEnd(12)} ${i.assignmentGroup.padEnd(29)} ${i.shortDescription.slice(0, 48)}`
      await openEmail(a, 'em-oliver-incidents', 'Heads up: VPN + SAP login incidents piling up')
      await a.click('@outlook-reply', { label: 'Reply' })
      await a.type(
        '@outlook-compose-body',
        `Hi Oliver,\n\nThe unassigned queue is cleared — ${rows.length} incidents triaged and 1 duplicate closed:\n\nNumber       Priority     Assignment group              Summary\n${rows.map(line).join('\n')}\n\nDuplicate: ${dup?.number} closed as duplicate of ${parent?.number} (Priya, Outlook sync).\n\nHeadlines\n• VPN: ${vpn.length} tickets, all gateway BOS-GW01 — ${num('inc-new-01')} is the parent (P2) for Network.\n• SAP Fiori SAML failures raised to P1 — Chicago AP is blocked ahead of the 11am payment run. SAP Basis to check the IdP signing certificate.\n• Work notes added to every ticket.\n\nAlex`,
        { label: 'message body', fast: true },
      )
      await a.click('@outlook-send', { label: 'Send' })
      await a.wait(900)
      const id = newestEmail((e) => e.folder === 'sent' && e.replyTo === 'em-oliver-incidents')
      return {
        summary: `Triaged ${rows.length} ServiceNow incidents: ${vpn.length} VPN → Network (parent ${num('inc-new-01')}), ${sap.length} SAP Fiori → SAP Basis as P1, ${outlookMain.length} Outlook → Messaging, printer and Okta lockout routed, 1 duplicate closed. Oliver has the summary.`,
        outputs: [
          { label: 'Incidents triaged by H-Worker', appId: 'servicenow', params: { list: 'incident', filter: 'triaged' } },
          { label: `Open ${num('inc-new-05')} (SAP Fiori — P1)`, appId: 'servicenow', params: { table: 'incident', sysId: 'inc-new-05' } },
          { label: 'Read the reply to Oliver', appId: 'outlook', params: { view: 'mail', folder: 'sent', emailId: id } },
        ],
        metrics: [
          { label: 'Incidents triaged', value: String(rows.length) },
          { label: 'Duplicates closed', value: '1' },
          { label: 'Groups routed', value: '5' },
        ],
      }
    },
  },

  /* ─────────────────────────── Zendesk backlog ─────────────────────────── */
  {
    id: 'zendesk-clear-backlog',
    title: 'Clear the Zendesk backlog',
    description: 'Finds every ticket waiting more than 24h for a first reply, applies the right macro or writes a tailored answer, and sets each to Solved or Pending.',
    category: 'Support',
    apps: ['outlook', 'zendesk'],
    timeSaved: '40 min',
    featured: true,
    keywords: ['zendesk', 'backlog', 'tickets', 'support', 'customers waiting', 'sla', 'first reply', 'macro', 'billing', 'password reset', 'aisha'],
    examples: ['Clear the Zendesk tickets waiting more than a day', 'Reply to the overdue support tickets'],
    nudge: () => {
      const n = db.get<any>('zendesk.tickets').filter((t) => ['new', 'open'].includes(t.status) && Date.now() - +new Date(t.created) > 864e5 && !t.comments.some((c: any) => c.author !== 'requester' && c.public)).length
      return n ? `${n} Zendesk customers have waited more than 24h for a reply` : null
    },
    plan: ['Read Aisha’s escalation', 'Open the “First reply > 24h” view in Zendesk', 'Answer billing tickets with the right macros', 'Answer password-reset and 2FA tickets', 'Set each ticket to Solved or Pending'],
    async run(a) {
      a.step(0)
      await openEmail(a, 'em-aisha-escalations', 'Zendesk backlog — a few customers waiting > 24h')
      a.step(1)
      await a.open('zendesk')
      await a.click('@zd-nav-views', { label: 'Views', timeout: 25000 })
      await a.click('@zd-view-waiting', { label: 'SLA: First reply > 24h' })
      const waiting = db.get<any>('zendesk.tickets').filter((t) => ['new', 'open'].includes(t.status) && Date.now() - +new Date(t.created) > 864e5 && !t.comments.some((c: any) => c.author !== 'requester' && c.public))
      const oldest = Math.round(Math.max(...waiting.map((t) => (Date.now() - +new Date(t.created)) / 3600e3)))
      await a.think(`${waiting.length} customers have waited past the 24h SLA — the oldest is ${oldest}h. ${waiting.filter((t) => t.group === 'Billing').length} are billing and ${waiting.filter((t) => t.tags.some((g: string) => /password|2fa/.test(g))).length} are login / password-reset problems. Most map to existing macros; Omar’s “link expired” needs a custom answer.`, 2000)

      const plan: { id: string; macro?: string; extra?: string; status: 'solved' | 'pending'; step: number; think?: string; custom?: string }[] = [
        { id: 'zd-48211', macro: 'mac-duplicate', extra: '\n\nRefund reference: RF-10482-2 ($2,480.00).', status: 'solved', step: 2 },
        { id: 'zd-48224', macro: 'mac-invoice', extra: ' I’ve also attached our current W-9 (Northwind Global Inc.) for your vendor setup.', status: 'solved', step: 2 },
        { id: 'zd-48236', macro: 'mac-proration', status: 'pending', step: 2, think: 'Tailspin downgraded on the 9th, so the credit is ~22 of 31 days of the price difference — the proration macro covers it, pending their refund-vs-credit choice.' },
        { id: 'zd-48217', macro: 'mac-reset-missing', status: 'pending', step: 3 },
        { id: 'zd-48230', macro: 'mac-2fa', status: 'pending', step: 3 },
        {
          id: 'zd-48241',
          status: 'solved',
          step: 3,
          think: 'Omar’s reset link “expires” within a minute — that matches what Ryan flagged in #eng-bugs: corporate mail scanners (Safe Links) pre-open the link and burn the one-time token. Writing a custom reply with a workaround.',
          custom: `Hi Omar,\n\nThanks for your patience, and sorry for the hassle. Woodgrove’s email security scanner opens links before they reach you, which uses up the one-time reset token — that’s why it shows as expired.\n\nI’ve sent you a fresh link. Please copy it and paste it into a private browser window rather than clicking it in Outlook, and you’ll be able to set a new password. Our engineering team is also shipping a fix so scanners can’t consume the token.\n\nYou should be all set to approve today’s shipment.`,
        },
      ]
      for (const p of plan) {
        const t = db.find<any>('zendesk.tickets', p.id)
        if (!t || !waiting.some((w) => w.id === p.id)) continue
        a.step(p.step)
        await a.click(`@zd-ticket-row-${p.id}`, { label: `#${t.number} ${t.subject}` })
        if (p.think) await a.think(p.think, 1500)
        if (p.macro) {
          await a.click('@zd-macro-btn', { label: 'Apply macro' })
          const m = db.find<any>('zendesk.macros', p.macro)
          await a.click(`@zd-macro-${p.macro}`, { label: m?.title })
          if (p.extra) await a.type('@zd-composer', p.extra, { label: 'Public reply' })
        } else if (p.custom) {
          await a.type('@zd-composer', p.custom, { label: 'Public reply' })
        }
        if (p.step === 3 && p.id === plan[plan.length - 1].id) a.step(4)
        await a.click('@zd-submit-menu', { label: 'Submit options' })
        await a.click(`@zd-submit-as-${p.status}`, { label: `Submit as ${p.status === 'solved' ? 'Solved' : 'Pending'}` })
        await a.wait(400)
      }
      a.step(4)
      await a.click('@zd-view-recent', { label: 'Recently updated tickets' })
      const solved = plan.filter((p) => p.status === 'solved').length
      return {
        summary: `Answered all ${plan.length} tickets waiting more than 24h: ${solved} solved (duplicate-charge refund, invoice + W-9, expired reset link) and ${plan.length - solved} pending on the customer (proration choice, email allow-list, 2FA identity check).`,
        outputs: [
          { label: 'Recently updated tickets', appId: 'zendesk', params: { view: 'recent' } },
          { label: 'Open #48241 (custom reply)', appId: 'zendesk', params: { ticketId: 'zd-48241' } },
          { label: 'SLA view (now empty)', appId: 'zendesk', params: { view: 'waiting' } },
        ],
        metrics: [
          { label: 'Tickets answered', value: String(plan.length) },
          { label: 'Solved', value: String(solved) },
          { label: 'Oldest wait cleared', value: `${oldest}h` },
        ],
      }
    },
  },

  /* ─────────────────────────── Slack bugs → Jira ─────────────────────────── */
  {
    id: 'slack-bugs-to-jira',
    title: 'Turn #eng-bugs reports into Jira issues',
    description: 'Reads new bug reports in Slack, files a Jira bug for each with priority, labels and sprint, and replies in the thread with the issue key.',
    category: 'Engineering',
    apps: ['slack', 'jira'],
    timeSaved: '30 min',
    keywords: ['slack', 'jira', 'bug', 'bugs', 'eng-bugs', 'issue', 'ticket', 'file bugs', 'triage bugs', 'thread'],
    examples: ['Create Jira issues for the bugs in #eng-bugs', 'File the Slack bug reports in Jira'],
    nudge: () => {
      const untracked = ['bug-dashboard', 'bug-reset', 'bug-export'].filter((id) => db.find('slack.messages', id) && !db.get<any>('slack.messages').some((m) => m.threadTs === id && /OPS-\d+/.test(m.text)))
      return untracked.length ? `${untracked.length} bug reports in #eng-bugs aren’t tracked in Jira yet` : null
    },
    plan: ['Read new bug reports in #eng-bugs', 'Skip reports already tracked in Jira', 'Create a Jira bug for each report', 'Reply in each Slack thread with the issue key'],
    async run(a) {
      a.step(0)
      await a.open('slack')
      await a.click('@slack-channel-eng-bugs', { label: '#eng-bugs', timeout: 25000 })
      await a.think('Four bug reports in #eng-bugs. Hannah’s Contact-us 500 already has “Tracked in OPS-129” in its thread, so three need issues: Maya’s EMEA dashboard regression, Aisha’s expiring reset links, and Ben’s 1,000-row CSV export cap.', 2000)
      a.step(1)
      await a.hover('@slack-msg-bug-dashboard')
      const bugs = [
        { msg: 'bug-dashboard', summary: 'Shipments-by-region widget shows 0 for EMEA after latest deploy', priority: 'High', labels: 'dashboard regression', assignee: 'chen', sprint: true, desc: 'Since this morning’s deploy, the Shipments by region widget on the Ops dashboard shows 0 for EMEA. Warehouse tables have the correct data, so this looks like a filter regression in the widget.\n\nImpact: blocks the 10am regional review.\nReported in #eng-bugs by Maya Johnson.' },
        { msg: 'bug-reset', summary: 'Customer portal password-reset links expire immediately (token consumed by mail scanners)', priority: 'Highest', labels: 'auth customer-portal', assignee: 'chen', sprint: true, desc: 'Users get “This link has expired” within a minute of receiving the reset email. Likely cause (Ryan): corporate mail scanners such as Outlook Safe Links pre-fetch the link and consume the one-time token.\n\nImpact: customers locked out — Woodgrove Bank and Fourth Coffee reported it in Zendesk.\nReported in #eng-bugs by Aisha Bello.' },
        { msg: 'bug-export', summary: 'Vendor list CSV export truncates at 1,000 rows', priority: 'Medium', labels: 'export vendor-portal', assignee: 'ben', sprint: false, desc: 'Export CSV on the Vendor list stops at exactly 1,000 rows; there are 1,380 active vendors. Needed for Thursday’s Q3 spend review.\nReported in #eng-bugs by Ben Carter.' },
      ]
      a.step(2)
      await a.open('jira')
      const keys: string[] = []
      for (const b of bugs) {
        await a.click('@jira-create', { label: 'Create', timeout: 25000 })
        await a.select('@jira-create-type', 'Bug', { label: 'Work type' })
        await a.type('@jira-create-summary', b.summary, { label: 'Summary' })
        await a.type('@jira-create-desc', b.desc, { label: 'Description', fast: true })
        await a.select('@jira-create-priority', b.priority, { label: 'Priority' })
        await a.select('@jira-create-assignee', b.assignee, { label: 'Assignee' })
        await a.type('@jira-create-labels', b.labels, { label: 'Labels', fast: true })
        if (!b.sprint) await a.select('@jira-create-sprint', '', { label: 'Sprint' })
        await a.click('@jira-create-submit', { label: 'Create' })
        await a.wait(500)
        const key = db.get<any>('jira.issues').filter((i) => i.createdBy === 'hworker' && i.summary === b.summary).sort((x, y) => (x.created < y.created ? 1 : -1))[0]?.key ?? ''
        keys.push(key)
        a.log(`Created ${key}`, 'success')
      }
      await a.think(`Created ${keys.join(', ')}. The reset-link bug is Highest and pulled into OPS Sprint 24 with the dashboard regression; the CSV export cap goes to the backlog.`, 1400)
      a.step(3)
      await a.focus('slack')
      for (let n = 0; n < bugs.length; n++) {
        const b = bugs[n]
        await a.hover(`@slack-msg-${b.msg}`)
        await a.click(`@slack-reply-${b.msg}`, { label: 'Reply in thread' })
        await a.type('@slack-thread-compose', `Tracked in ${keys[n]} (${b.priority}) — assigned to ${person(b.assignee).name}, ${b.sprint ? 'pulled into OPS Sprint 24' : 'added to the OPS backlog'}. :ticket:`, { label: 'Reply' })
        await a.press('Enter')
      }
      await a.click('@slack-thread-close', { label: 'Close thread' })
      return {
        summary: `Filed ${keys.length} Jira bugs from #eng-bugs (${keys.join(', ')}), skipped the one already tracked (OPS-129), and replied in each Slack thread with the issue key.`,
        outputs: [
          { label: 'Open the OPS board', appId: 'jira', params: { view: 'board' } },
          { label: `Open ${keys[1]} (Highest)`, appId: 'jira', params: { issueKey: keys[1] } },
          { label: 'See the replies in #eng-bugs', appId: 'slack', params: { channelId: 'eng-bugs' } },
        ],
        metrics: [
          { label: 'Bugs filed', value: String(keys.length) },
          { label: 'Duplicates skipped', value: '1' },
          { label: 'Threads replied', value: String(keys.length) },
        ],
      }
    },
  },

  /* ─────────────────────────── Release notes ─────────────────────────── */
  {
    id: 'confluence-release-notes',
    title: 'Publish sprint release notes',
    description: 'Compiles the Done work items of the current Jira sprint into a Confluence release-notes page and announces it in #announcements.',
    category: 'Engineering',
    apps: ['jira', 'confluence', 'slack'],
    timeSaved: '45 min',
    keywords: ['release notes', 'confluence', 'sprint', 'done', 'changelog', 'what shipped', 'announce', 'announcements', 'jira'],
    examples: ['Write the release notes for this sprint', 'Publish what shipped in OPS Sprint 24'],
    nudge: () => {
      const s = db.get<any>('jira.sprints').find((x) => x.state === 'active')
      return s && !db.get<any>('confluence.pages').some((p) => p.title.includes(s.name)) ? `${s.name} has ${db.get<any>('jira.issues').filter((i) => i.sprintId === s.id && i.status === 'Done').length} Done items without release notes` : null
    },
    plan: ['Review Done work items on the Jira sprint board', 'Draft the release notes in Confluence', 'Publish under Operations › Release notes', 'Announce in #announcements on Slack'],
    async run(a) {
      a.step(0)
      await a.open('jira')
      await a.click('@jira-tab-board', { label: 'Board', timeout: 25000 })
      const sprint = db.get<any>('jira.sprints').find((s) => s.state === 'active')!
      const done = db.get<any>('jira.issues').filter((i) => i.sprintId === sprint.id && i.status === 'Done' && i.type !== 'Epic')
      const pts = done.reduce((s, i) => s + (i.points ?? 0), 0)
      await a.scrollTo('@jira-col-done', { label: 'Done column' })
      if (done[0]) {
        await a.click(`@jira-card-${done[0].key}`, { label: done[0].key })
        await a.wait(600)
        await a.click('@jira-issue-close', { label: 'Close' })
      }
      const epics = Array.from(new Set(done.map((i) => i.epic).filter(Boolean)))
      await a.think(`${sprint.name} has ${done.length} Done work items worth ${pts} points, across ${epics.join(' and ')}. Two are security hardening (Okta MFA, SAML cert rotation) — worth calling out for admins.`, 1800)

      a.step(1)
      await a.open('confluence')
      await a.click('@conf-page-pg-releases', { label: 'Release notes', timeout: 25000 })
      await a.click('@conf-create', { label: 'Create' })
      await a.click('@conf-create-page', { label: 'Page' })
      const title = `Release notes — ${sprint.name}`
      await a.type('@conf-title', title, { label: 'Page title' })
      const fmt = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      const body =
        `{status:RELEASED:green}  ${sprint.name} · ${fmt(sprint.start)} – ${fmt(sprint.end)}\n\n` +
        `:::info\nSprint goal: ${sprint.goal}\n:::\n` +
        `## Highlights\n- **Warehouse dashboard v2:** shipments-by-region drill-down and carrier on-time performance are live\n- **Security:** Okta MFA is now enforced for vendor portal admins and the SAML signing certificate was rotated\n- Vendor scorecards can be exported to PDF\n\n` +
        `## What shipped\n| Key | Summary | Type | Assignee | Points |\n| --- | --- | --- | --- | --- |\n` +
        done.map((i) => `| ${i.key} | ${i.summary} | ${i.type} | ${person(i.assignee).name} | ${i.points ?? '-'} |`).join('\n') +
        `\n\n:::success\n${done.length} work items · ${pts} story points delivered\n:::\n` +
        `## Still in progress\n- ${db.get<any>('jira.issues').filter((i) => i.sprintId === sprint.id && ['In Progress', 'In Review'].includes(i.status)).map((i) => `${i.key} ${i.summary}`).slice(0, 4).join('\n- ')}`
      await a.type('@conf-body', body, { label: 'Page content', fast: true })
      a.step(2)
      await a.click('@conf-publish', { label: 'Publish' })
      await a.wait(700)
      const page = db.get<any>('confluence.pages').filter((p) => p.title === title).sort((x, y) => (x.created < y.created ? 1 : -1))[0]

      a.step(3)
      await a.open('slack')
      await a.click('@slack-channel-announcements', { label: '#announcements', timeout: 25000 })
      await a.type('@slack-compose', `:mega: Release notes for *${sprint.name}* are published in Confluence → Operations / Release notes. ${done.length} items shipped (${pts} pts): shipments-by-region drill-down, carrier on-time chart, Okta MFA for vendor admins, SAML cert rotation and PDF vendor scorecards. :rocket:`, { label: 'Message #announcements' })
      await a.press('Enter')
      return {
        summary: `Published “${title}” in Confluence with ${done.length} Done work items (${pts} story points) and announced it in #announcements.`,
        outputs: [
          { label: 'Open the release notes', appId: 'confluence', params: { pageId: page?.id } },
          { label: 'See the announcement', appId: 'slack', params: { channelId: 'announcements' } },
          { label: 'Sprint board', appId: 'jira', params: { view: 'board' } },
        ],
        metrics: [
          { label: 'Work items', value: String(done.length) },
          { label: 'Story points', value: String(pts) },
          { label: 'Channels notified', value: '1' },
        ],
      }
    },
  },
]
