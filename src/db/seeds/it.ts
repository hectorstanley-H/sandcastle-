/**
 * IT group seed: ServiceNow, Zendesk, Jira, Confluence, Slack.
 *
 * servicenow.incidents: {
 *   id (sys_id), number 'INC0012401', opened, updated, callerId (person id), shortDescription, description,
 *   category, subcategory, service, ci, impact 1-3, urgency 1-3, priority 1-5 (from impact × urgency),
 *   state 'New'|'In Progress'|'On Hold'|'Resolved'|'Closed'|'Canceled', assignmentGroup ('' = unassigned), assignedTo (name),
 *   channel, location, activity: { id, author, date, kind: 'work'|'comment'|'field', text }[],
 *   closeCode?, closeNotes?, duplicateOf?, updatedBy?: 'hworker'
 * }
 * servicenow.groups: { id, name, manager, members: string[], description, email }
 * servicenow.requests: { id, number 'REQ0010231', ritm 'RITM0010455', item, itemId, requestedFor (person id), openedBy, date,
 *   state, stage, approval, price, quantity, variables: Record<string,string>, createdBy? }
 * zendesk.tickets: { id, number, subject, requester: { name, email, org }, status 'new'|'open'|'pending'|'hold'|'solved'|'closed',
 *   priority 'low'|'normal'|'high'|'urgent'|'', type, group, assignee (person id | ''), tags[], channel, created, updated,
 *   comments: { id, author: 'requester' | personId, public: boolean, body, date, via?: 'hworker' }[], updatedBy? }
 * zendesk.macros: { id, title, body, status?, tags?, category }
 * jira.issues: { id, key 'OPS-142', type 'Story'|'Bug'|'Task'|'Epic', summary, description, status 'To Do'|'In Progress'|'In Review'|'Done',
 *   priority 'Highest'|'High'|'Medium'|'Low'|'Lowest', assignee (person id|''), reporter, labels[], sprintId|null, points?, epic?,
 *   created, updated, comments: { id, author, body, date }[], createdBy? }
 * jira.sprints: { id, name, state 'active'|'future'|'closed', start, end, goal }
 * confluence.pages: { id, space 'OPS', title, parentId|null, body (markup, see apps/confluence/render.tsx), author, created, updated,
 *   emoji?, labels?, createdBy?, views? }
 * slack.messages: { id, channelId, from (person id | 'bot:<name>'), text, date, threadTs?, reactions?: {emoji, users[]}[], createdBy? }
 */
import type { Collections } from '../db'
import { person } from '@/data/people'
import { daysAgo, daysFromNow, hoursAgo, minutesAgo } from '@/data/time'

export const SN_PRIORITY = (impact: number, urgency: number) => Math.min(5, Math.max(1, impact + urgency - 1))


/* ─────────────────────────── ServiceNow ─────────────────────────── */

function servicenow() {
  const groups = [
    { id: 'grp-service-desk', name: 'Service Desk', manager: 'Oliver Brooks', members: ['Oliver Brooks', 'Nadia Petrova', 'Sam Whitfield'], description: 'Tier 1 service desk — first contact and triage', email: 'servicedesk@northwind.com' },
    { id: 'grp-network', name: 'Network', manager: 'Daniel Reyes', members: ['Daniel Reyes', 'Priyanka Shah', 'Marco Bianchi'], description: 'WAN/LAN, VPN concentrators, Wi-Fi and firewalls', email: 'network-ops@northwind.com' },
    { id: 'grp-sap-basis', name: 'SAP Basis', manager: 'Henrik Larsen', members: ['Henrik Larsen', 'Wei Zhang', 'Anita Kowalski'], description: 'SAP S/4HANA, Fiori launchpad, SSO and transports', email: 'sap-basis@northwind.com' },
    { id: 'grp-messaging', name: 'Messaging', manager: 'Fatima Khan', members: ['Fatima Khan', 'Tyler Brooks'], description: 'Exchange Online, Outlook, Teams and mail flow', email: 'messaging@northwind.com' },
    { id: 'grp-iam', name: 'Identity & Access Management', manager: 'Sara Lindqvist', members: ['Sara Lindqvist', 'Omar Haddad'], description: 'Okta, MFA, Active Directory and access requests', email: 'iam@northwind.com' },
    { id: 'grp-euc', name: 'End User Computing', manager: 'Jamal Wright', members: ['Jamal Wright', 'Olivia Chen', 'Lukas Meyer'], description: 'Laptops, imaging, Intune and peripherals', email: 'euc@northwind.com' },
    { id: 'grp-field-bos', name: 'Field Services - Boston', manager: "Kevin O'Brien", members: ["Kevin O'Brien", 'Rosa Alvarez'], description: 'On-site support for 1 Federal St, Boston', email: 'field-bos@northwind.com' },
    { id: 'grp-app-support', name: 'Application Support', manager: 'Grace Kim', members: ['Grace Kim', 'Arjun Mehta'], description: 'Line-of-business applications (Salesforce, Workday, Coupa)', email: 'appsupport@northwind.com' },
    { id: 'grp-database', name: 'Database', manager: 'Yuki Tanaka', members: ['Yuki Tanaka'], description: 'SQL Server, HANA DB and backups', email: 'dba@northwind.com' },
  ]

  type Inc = Record<string, any>
  const act = (author: string, date: string, kind: string, text: string) => ({ id: `a-${Math.random().toString(36).slice(2, 9)}`, author, date, kind, text })

  // ── 12 new, unassigned incidents this morning (Oliver's email) ──
  const fresh: [string, string, string, string, string, number, number, string, number][] = [
    // callerId, short, description, channel, ci, impact, urgency, location, minutesAgo
    ['ben', 'VPN keeps disconnecting every 10–15 minutes', 'GlobalProtect drops the connection every 10–15 min since I got in this morning. Reconnecting works but it drops again. Working from 1 Federal St, Boston (4th floor).', 'Self-service', 'GlobalProtect VPN - BOS-GW01', 1, 2, 'Boston - 1 Federal St', 96],
    ['sofia', 'Unable to log in to SAP Fiori launchpad — "SAML assertion invalid"', 'Getting "SAML 2.0 assertion is invalid" on the Fiori launchpad since ~7:30am. Need to approve invoices before the 11am payment run.', 'Email', 'SAP S/4HANA PRD (S4P)', 2, 1, 'Boston - 1 Federal St', 90],
    ['maya', 'VPN disconnects — cannot reach shared drives', 'VPN connects but drops after a few minutes, and the S: and P: drives disconnect with it. Several people on our floor have the same thing.', 'Phone', 'GlobalProtect VPN - BOS-GW01', 2, 2, 'Boston - 1 Federal St', 84],
    ['rachel', 'Outlook not syncing — inbox stuck since yesterday evening', 'Outlook desktop shows "Updating this folder" forever. Last email received at 6:12pm yesterday. OWA works fine on my phone.', 'Self-service', 'Exchange Online', 2, 2, 'New York - 5th Ave', 81],
    ['emma', 'SAP Fiori login fails for AP team (Chicago)', 'The whole AP team in Chicago cannot sign in to Fiori — same SAML error. We cannot post invoices. Approx. 6 users impacted.', 'Phone', 'SAP S/4HANA PRD (S4P)', 1, 2, 'Chicago - Wacker Dr', 77],
    ['hannah', 'VPN dropping during Teams calls', 'My VPN drops in the middle of every Teams call this morning (Boston office Wi-Fi). Calls reconnect after ~30 sec.', 'Chat', 'GlobalProtect VPN - BOS-GW01', 2, 3, 'Boston - 1 Federal St', 70],
    ['priya', 'Outlook calendar and mail not updating', 'Outlook is not syncing new mail or calendar updates. Shows "Disconnected" in the status bar from time to time.', 'Email', 'Exchange Online', 2, 2, 'Boston - 1 Federal St', 64],
    ['maya', 'Printer BOS-4F-MFP02 jamming and showing offline', '4th floor printer next to the kitchen (BOS-4F-MFP02) is jammed and now shows offline for everyone.', 'Self-service', 'BOS-4F-MFP02 (Xerox AltaLink C8170)', 3, 3, 'Boston - 1 Federal St', 58],
    ['lucas', 'SAP Fiori: "Logon failed" for Coupa-SAP invoice approvals', 'Clicking the approval link from Coupa takes me to Fiori, which says "Logon failed – SAML assertion invalid".', 'Self-service', 'SAP S/4HANA PRD (S4P)', 3, 2, 'Chicago - Wacker Dr', 51],
    ['james', 'GlobalProtect VPN "gateway not responding" — Boston', 'GlobalProtect says "Gateway BOS-GW01 not responding" and falls back to the NYC gateway, which is very slow.', 'Phone', 'GlobalProtect VPN - BOS-GW01', 2, 2, 'Boston - 1 Federal St', 44],
    ['chen', 'Locked out of Okta after MFA reset on new phone', 'I moved to a new phone and Okta Verify no longer works. Account is now locked after too many attempts. Cannot reach GitHub or Jira.', 'Chat', 'Okta Workforce Identity', 3, 1, 'San Francisco - Market St', 32],
    ['priya', 'Outlook not syncing (2nd ticket)', 'Raising again — Outlook still not syncing mail. Same issue as my earlier ticket this morning.', 'Self-service', 'Exchange Online', 2, 2, 'Boston - 1 Federal St', 18],
  ]
  const incidents: Inc[] = fresh.map(([caller, short, desc, channel, ci, impact, urgency, location, mins], i) => {
    const opened = minutesAgo(mins)
    return {
      id: `inc-new-${String(i + 1).padStart(2, '0')}`,
      number: `INC00124${String(i + 1).padStart(2, '0')}`,
      opened,
      updated: opened,
      callerId: caller,
      shortDescription: short,
      description: desc,
      category: 'Inquiry / Help',
      subcategory: '',
      service: '',
      ci,
      impact,
      urgency,
      priority: SN_PRIORITY(impact, urgency),
      state: 'New',
      assignmentGroup: '',
      assignedTo: '',
      channel,
      location,
      activity: [act('System', opened, 'field', `Incident created via ${channel}`)],
    }
  })

  // ── older incidents (lived-in list) ──
  const old: [string, string, string, string, string, string, number, number, string, string, number][] = [
    ['liam', 'Salesforce Lightning very slow loading opportunities', 'Software', 'Application', 'Salesforce Sales Cloud', 'Application Support', 2, 3, 'In Progress', 'Arjun Mehta', 1],
    ['david', 'Laptop battery swelling — needs replacement', 'Hardware', 'Laptop', 'Dell Latitude 7440 - NWG-LT-0412', 'End User Computing', 3, 2, 'In Progress', 'Jamal Wright', 1],
    ['nina', 'Workday mobile app crashes on login', 'Software', 'Mobile application', 'Workday HCM', 'Application Support', 3, 3, 'On Hold', 'Grace Kim', 2],
    ['tom', 'Request: increase mailbox quota to 100 GB', 'Software', 'Email', 'Exchange Online', 'Messaging', 3, 3, 'Resolved', 'Tyler Brooks', 2],
    ['aisha', 'Zendesk SSO intermittently redirects to error page', 'Software', 'Single sign-on', 'Okta Workforce Identity', 'Identity & Access Management', 2, 3, 'In Progress', 'Omar Haddad', 2],
    ['grace', 'Firewall rule change for new SFTP partner (Fabrikam)', 'Network', 'Firewall', 'PAN-FW-BOS-01', 'Network', 3, 3, 'Resolved', 'Priyanka Shah', 3],
    ['marcus', 'Excel crashes when opening FY26 budget model', 'Software', 'Office 365', 'Microsoft 365 Apps', 'End User Computing', 2, 2, 'Resolved', 'Olivia Chen', 3],
    ['ryan', 'Second monitor flickering (USB-C dock)', 'Hardware', 'Monitor', 'Dell WD19TBS Dock', 'End User Computing', 3, 3, 'Closed', 'Lukas Meyer', 4],
    ['james', 'Workday report "Headcount by Cost Center" times out', 'Software', 'Reporting', 'Workday HCM', 'Application Support', 3, 2, 'In Progress', 'Arjun Mehta', 4],
    ['sofia', 'SAP transport request stuck in QA (S4Q)', 'Software', 'SAP', 'SAP S/4HANA QAS (S4Q)', 'SAP Basis', 3, 2, 'Resolved', 'Wei Zhang', 5],
    ['ben', 'Wi-Fi "NWG-Corp" weak signal in Boston conference room 4B', 'Network', 'Wireless', 'BOS-AP-4F-07', 'Network', 3, 3, 'Closed', 'Marco Bianchi', 6],
    ['hannah', 'Adobe Creative Cloud license not activating', 'Software', 'Licensing', 'Adobe Creative Cloud', 'End User Computing', 3, 3, 'Closed', 'Olivia Chen', 6],
    ['emma', 'Coupa invoice approval emails going to junk', 'Software', 'Email', 'Exchange Online', 'Messaging', 3, 2, 'Closed', 'Fatima Khan', 7],
    ['chen', 'GitHub Enterprise SSO group mapping missing for new team', 'Software', 'Single sign-on', 'Okta Workforce Identity', 'Identity & Access Management', 3, 3, 'Closed', 'Sara Lindqvist', 8],
    ['priya', 'Conference room display (Teams Room) not starting meetings', 'Hardware', 'Audio/Visual', 'BOS-MTR-4A', 'Field Services - Boston', 2, 2, 'Closed', "Kevin O'Brien", 8],
    ['lucas', 'Need access to Coupa supplier portal admin', 'Inquiry / Help', 'Access', 'Coupa', 'Identity & Access Management', 3, 3, 'Closed', 'Omar Haddad', 9],
    ['maya', 'Badge reader at Boston lobby not reading badges', 'Hardware', 'Physical security', 'BOS-LOBBY-BR01', 'Field Services - Boston', 2, 2, 'Closed', 'Rosa Alvarez', 10],
    ['oliver', 'ServiceNow email notifications delayed', 'Software', 'Email', 'Exchange Online', 'Messaging', 2, 3, 'Closed', 'Tyler Brooks', 11],
    ['rachel', 'Salesforce dashboard refresh failing', 'Software', 'Application', 'Salesforce Sales Cloud', 'Application Support', 3, 3, 'Closed', 'Arjun Mehta', 12],
    ['tom', 'Database backup job failed on SQL-PRD-02', 'Database', 'SQL Server', 'SQL-PRD-02', 'Database', 1, 2, 'Closed', 'Yuki Tanaka', 13],
    ['alex', 'New hire laptop for Jordan Ellis — imaging', 'Hardware', 'Laptop', 'Dell Latitude 7440', 'End User Computing', 3, 3, 'In Progress', 'Jamal Wright', 1],
    ['david', 'iPhone not receiving company email after iOS update', 'Software', 'Mobile application', 'Microsoft Intune', 'End User Computing', 3, 2, 'Resolved', 'Lukas Meyer', 2],
    ['grace', 'Certificate expiring on vpn.northwind.com in 14 days', 'Network', 'VPN', 'GlobalProtect VPN - BOS-GW01', 'Network', 2, 3, 'On Hold', 'Daniel Reyes', 3],
    ['marcus', 'Power BI workspace access for Finance leadership', 'Inquiry / Help', 'Access', 'Power BI', 'Identity & Access Management', 3, 3, 'Resolved', 'Sara Lindqvist', 4],
    ['aisha', 'Headset microphone not detected in Teams', 'Hardware', 'Peripheral', 'Jabra Evolve2 65', 'End User Computing', 3, 3, 'Closed', 'Olivia Chen', 5],
    ['nina', 'Shared mailbox people-team@ not visible in Outlook', 'Software', 'Email', 'Exchange Online', 'Messaging', 3, 3, 'Closed', 'Fatima Khan', 7],
    ['ryan', 'Zendesk Talk calls dropping after 2 minutes', 'Network', 'Telephony', 'Zendesk Talk', 'Network', 2, 2, 'Closed', 'Priyanka Shah', 9],
    ['sofia', 'SAP GUI crashes when running FBL1N', 'Software', 'SAP', 'SAP S/4HANA PRD (S4P)', 'SAP Basis', 3, 2, 'Closed', 'Henrik Larsen', 10],
    ['liam', 'Docusign envelopes stuck in "Sending"', 'Software', 'Application', 'Docusign eSignature', 'Application Support', 2, 2, 'Closed', 'Grace Kim', 12],
    ['ben', 'Request to install Python 3.12 on analytics laptop', 'Software', 'Installation', 'Software Center', 'End User Computing', 3, 3, 'Closed', 'Lukas Meyer', 14],
    ['hannah', 'HubSpot forms not syncing to Salesforce', 'Software', 'Integration', 'HubSpot Marketing Hub', 'Application Support', 2, 3, 'Closed', 'Arjun Mehta', 15],
    ['james', 'Okta push notifications delayed', 'Software', 'Single sign-on', 'Okta Workforce Identity', 'Identity & Access Management', 3, 2, 'Closed', 'Omar Haddad', 16],
    ['chen', 'Jira Software performance degraded', 'Software', 'Application', 'Jira Software Cloud', 'Application Support', 3, 3, 'Closed', 'Arjun Mehta', 18],
    ['maya', 'Lost laptop charger — replacement request', 'Hardware', 'Peripheral', 'Dell 90W USB-C', 'End User Computing', 3, 3, 'Closed', 'Jamal Wright', 20],
  ]
  old.forEach(([caller, short, cat, sub, ci, group, impact, urgency, state, assignee, days], i) => {
    const opened = daysAgo(days, 8 + (i % 9), (i * 13) % 60)
    const updated = state === 'New' ? opened : daysAgo(Math.max(0, days - 1), 10 + (i % 7), (i * 7) % 60)
    const activity = [act('System', opened, 'field', 'Incident created')]
    activity.push(act(assignee, daysAgo(days, 11, 20), 'work', state === 'On Hold' ? 'Waiting on vendor / user response before proceeding.' : 'Investigating — reproduced the issue and gathering logs.'))
    if (state === 'Resolved' || state === 'Closed') activity.push(act(assignee, updated, 'comment', 'This has been resolved. Please reopen if the issue returns.'))
    incidents.push({
      id: `inc-${String(300 + i)}`,
      number: `INC00${12398 - i * 3}`,
      opened,
      updated,
      callerId: caller,
      shortDescription: short,
      description: `${short}. Reported by ${person(caller).name}.`,
      category: cat,
      subcategory: sub,
      service: ci.split(' - ')[0],
      ci,
      impact,
      urgency,
      priority: SN_PRIORITY(impact, urgency),
      state,
      assignmentGroup: group,
      assignedTo: assignee,
      channel: ['Self-service', 'Email', 'Phone', 'Chat'][i % 4],
      location: person(caller).location,
      activity: activity.reverse(),
      closeCode: state === 'Resolved' || state === 'Closed' ? 'Solved (Permanently)' : undefined,
    })
  })

  const requests = [
    ['req-01', 'REQ0010231', 'RITM0010455', 'Standard Laptop', 'cat-laptop', 'ben', 2, 'Requested', 'Fulfillment', 1450],
    ['req-02', 'REQ0010229', 'RITM0010451', 'Adobe Acrobat Pro', 'cat-acrobat', 'emma', 3, 'Closed Complete', 'Completed', 239.88],
    ['req-03', 'REQ0010226', 'RITM0010447', 'New Hire Onboarding', 'cat-onboarding', 'alex', 6, 'Closed Complete', 'Completed', 0],
    ['req-04', 'REQ0010224', 'RITM0010444', 'Access to shared drive', 'cat-share', 'maya', 7, 'Closed Complete', 'Completed', 0],
    ['req-05', 'REQ0010219', 'RITM0010438', 'Standard Monitor (27")', 'cat-monitor', 'hannah', 9, 'Closed Complete', 'Completed', 329],
    ['req-06', 'REQ0010215', 'RITM0010432', 'Developer Laptop', 'cat-devlaptop', 'chen', 12, 'Closed Complete', 'Completed', 2890],
    ['req-07', 'REQ0010212', 'RITM0010429', 'Mobile phone', 'cat-phone', 'liam', 14, 'Closed Complete', 'Completed', 799],
  ].map(([id, number, ritm, item, itemId, who, days, state, stage, price]) => ({
    id,
    number,
    ritm,
    item,
    itemId,
    requestedFor: who,
    openedBy: who,
    date: daysAgo(days as number, 10, 15),
    state,
    stage,
    approval: 'Approved',
    price,
    quantity: 1,
    variables: {},
  }))

  return { 'servicenow.incidents': incidents, 'servicenow.groups': groups, 'servicenow.requests': requests }
}

/* ─────────────────────────── Zendesk ─────────────────────────── */

function zendesk() {
  const C = (name: string, org: string, domain: string) => ({ name, email: `${name.split(' ')[0].toLowerCase()}.${name.split(' ').slice(-1)[0].toLowerCase().replace(/[^a-z]/g, '')}@${domain}`, org })
  const cust = {
    daniel: C('Daniel Kim', 'Proseware, Inc.', 'proseware.com'),
    laura: C('Laura Chen', 'Fourth Coffee', 'fourthcoffee.com'),
    marta: C('Marta Nowak', 'Wide World Importers', 'wideworldimporters.com'),
    peter: C('Peter Haas', 'Alpine Ski House', 'alpineskihouse.com'),
    grace: C('Grace Liu', 'Tailspin Toys', 'tailspintoys.com'),
    omar: C('Omar Farouk', 'Woodgrove Bank', 'woodgrovebank.com'),
    julia: C('Julia Santos', 'Coho Winery', 'cohowinery.com'),
    ken: C('Ken Watanabe', 'Lucerne Publishing', 'lucernepublishing.com'),
    sara: C('Sara Mitchell', "Margie's Travel", 'margiestravel.com'),
    tom: C('Tom Becker', 'Northwind Traders', 'northwindtraders.com'),
    ines: C('Inès Dubois', 'Fabrikam, Inc.', 'fabrikam.com'),
    raj: C('Raj Malhotra', 'Contoso Ltd', 'contoso.com'),
    amy: C('Amy Ford', 'Adatum Corporation', 'adatum.com'),
    luis: C('Luis Ortega', 'Litware Inc.', 'litware.com'),
    hana: C('Hana Sato', 'Proseware, Inc.', 'proseware.com'),
    nick: C('Nick Reed', 'Tailspin Toys', 'tailspintoys.com'),
  }
  let n = 0
  const cm = (author: string, body: string, date: string, pub = true) => ({ id: `c-${++n}`, author, public: pub, body, date })

  type T = Record<string, any>
  const tickets: T[] = []
  const add = (t: Partial<T> & { number: number; subject: string; requester: any; created: string; body: string }) => {
    const { body, ...rest } = t
    tickets.push({
      id: `zd-${t.number}`,
      status: 'open',
      priority: 'normal',
      type: 'question',
      group: 'Support',
      assignee: '',
      tags: [],
      channel: 'email',
      updated: t.created,
      comments: [cm('requester', body, t.created)],
      ...rest,
    })
  }

  // ── waiting > 24h with no first response (Aisha's escalation) ──
  add({ number: 48211, subject: 'Charged twice for our October invoice', requester: cust.daniel, created: hoursAgo(41), status: 'new', priority: 'high', type: 'problem', group: 'Billing', tags: ['billing', 'double_charge'], body: `Hi,\n\nOur card was charged twice for invoice NWG-INV-10482 ($2,480.00) on the 1st — two identical transactions on our statement. Can you refund the duplicate?\n\nThanks,\nDaniel Kim\nIT Manager, Proseware` })
  add({ number: 48217, subject: 'Password reset email never arrives', requester: cust.laura, created: hoursAgo(38), status: 'new', priority: 'normal', type: 'problem', tags: ['password_reset', 'login'], channel: 'web', body: `I've clicked "Forgot password" four times since yesterday and no email ever arrives (checked spam too). I'm locked out of the portal and need to download our shipping reports.\n\nLaura` })
  add({ number: 48224, subject: 'Need a copy of invoice + W-9 for vendor setup', requester: cust.marta, created: hoursAgo(35), status: 'new', priority: 'normal', type: 'question', group: 'Billing', tags: ['billing', 'invoice_copy'], body: `Hello,\n\nOur AP team needs a PDF copy of invoice NWG-INV-10517 and your company W-9 to finish setting you up as a vendor. Could you send both?\n\nBest regards,\nMarta Nowak\nWide World Importers` })
  add({ number: 48230, subject: 'Locked out — lost phone with authenticator app', requester: cust.peter, created: hoursAgo(31), status: 'new', priority: 'high', type: 'problem', tags: ['password_reset', '2fa'], channel: 'web', body: `My phone was stolen over the weekend and it had my 2FA codes. I can't log in anymore. How do I reset two-factor on my account? Username: phaas` })
  add({ number: 48236, subject: 'Refund for downgrade from Business to Starter plan', requester: cust.grace, created: hoursAgo(29), status: 'new', priority: 'normal', type: 'question', group: 'Billing', tags: ['billing', 'plan_change'], body: `We downgraded from Business to Starter mid-cycle (on the 9th) but were billed the full Business price for October. Is the difference prorated / refunded?\n\nGrace Liu\nOps, Tailspin Toys` })
  add({ number: 48241, subject: "Can't reset my password — link says expired", requester: cust.omar, created: hoursAgo(26), status: 'new', priority: 'normal', type: 'problem', tags: ['password_reset', 'login'], body: `Every time I click the reset link it says "This link has expired". I'm clicking it within a minute of receiving the email. Please help — I need to approve a shipment today.\n\nOmar Farouk, Woodgrove Bank` })

  // ── recent / in-flight ──
  add({ number: 48262, subject: 'API rate limit increase for nightly sync', requester: cust.ken, created: hoursAgo(9), status: 'open', priority: 'normal', type: 'task', group: 'Tier 2', assignee: 'ryan', tags: ['api'], body: 'Our nightly inventory sync hits 429s around 2am ET. Can the limit be raised to 1,200 req/min for our account?' })
  tickets[tickets.length - 1].comments.push(cm('ryan', 'Hi Ken — I have asked our platform team to review. Could you share the client ID you use for the sync?', hoursAgo(7)))
  add({ number: 48265, subject: 'Shipment tracking page shows wrong ETA', requester: cust.julia, created: hoursAgo(8), status: 'open', priority: 'high', type: 'incident', assignee: 'aisha', tags: ['tracking'], channel: 'chat', body: 'Tracking for order NW-558120 says delivered, but the pallet is still at your Rotterdam hub according to the carrier.' })
  add({ number: 48270, subject: 'How do I add a second billing contact?', requester: cust.sara, created: hoursAgo(6), status: 'open', group: 'Billing', assignee: 'aisha', tags: ['billing'], body: 'We want invoices to go to both me and accounts@margiestravel.com. Is that possible?' })
  add({ number: 48273, subject: 'SSO setup with Azure AD — metadata URL', requester: cust.raj, created: hoursAgo(5), status: 'open', priority: 'normal', type: 'task', group: 'Tier 2', assignee: 'ryan', tags: ['sso', 'enterprise'], body: 'Where do I find the SAML metadata URL to configure SSO with Entra ID?' })
  add({ number: 48276, subject: 'Order NW-559004 arrived damaged', requester: cust.tom, created: hoursAgo(4), status: 'new', priority: 'high', type: 'problem', tags: ['damaged', 'claims'], channel: 'web', body: 'Two of the six cartons arrived crushed. Photos attached. We need replacements before Friday.' })
  add({ number: 48279, subject: 'Export of all shipments for audit', requester: cust.ines, created: hoursAgo(3), status: 'new', priority: 'low', type: 'question', tags: ['export'], body: 'Our auditors need a CSV of every shipment for FY25. Is there a bulk export?' })
  add({ number: 48281, subject: 'User seats — add 15 more for Milan team', requester: cust.amy, created: hoursAgo(2), status: 'new', priority: 'normal', type: 'task', group: 'Billing', tags: ['billing', 'seats'], body: 'Please add 15 seats to our Enterprise subscription for the Milan rollout.' })
  add({ number: 48284, subject: 'Webhook payloads missing tracking_number', requester: cust.luis, created: minutesAgo(70), status: 'new', priority: 'normal', type: 'incident', group: 'Tier 2', tags: ['api', 'webhooks'], body: 'Since yesterday shipment.updated webhooks no longer include tracking_number.' })
  add({ number: 48287, subject: 'Change company address on invoices', requester: cust.hana, created: minutesAgo(35), status: 'new', priority: 'low', group: 'Billing', tags: ['billing'], channel: 'web', body: 'We moved offices — new address is 410 Terry Ave N, Seattle WA 98109.' })
  // pending / solved history
  add({ number: 48190, subject: 'Customs documents for Rotterdam shipment', requester: cust.nick, created: daysAgo(3, 10), status: 'pending', assignee: 'aisha', tags: ['customs'], body: 'Need the commercial invoice for shipment NW-551870.' })
  tickets[tickets.length - 1].comments.push(cm('aisha', 'Hi Nick — I have attached the commercial invoice. Could you confirm the consignee EORI number so we can update the packing list?', daysAgo(2, 15)))
  add({ number: 48176, subject: 'Discount for annual prepayment?', requester: cust.marta, created: daysAgo(4, 11), status: 'pending', group: 'Billing', assignee: 'aisha', tags: ['billing', 'pricing'], body: 'Do you offer a discount if we prepay 12 months?' })
  tickets[tickets.length - 1].comments.push(cm('aisha', 'We do — 8% for annual prepay. Shall I send a quote for the 12-month term?', daysAgo(3, 9)))
  add({ number: 48160, subject: 'Login page loads blank in Safari', requester: cust.daniel, created: daysAgo(5, 9), status: 'solved', assignee: 'ryan', tags: ['login', 'browser'], body: 'The login page is blank in Safari 18.' })
  tickets[tickets.length - 1].comments.push(cm('ryan', 'Fixed in today’s release — please clear cache and try again. Closing this out, but reply anytime.', daysAgo(4, 16)))
  add({ number: 48151, subject: 'Invoice currency should be EUR', requester: cust.ines, created: daysAgo(6, 14), status: 'solved', group: 'Billing', assignee: 'aisha', tags: ['billing'], body: 'Our invoices show USD but our contract is in EUR.' })
  tickets[tickets.length - 1].comments.push(cm('aisha', 'Updated — future invoices will be issued in EUR. I have re-issued October as NWG-INV-10433-EU.', daysAgo(5, 11)))
  add({ number: 48142, subject: 'Request: dark mode for the portal', requester: cust.ken, created: daysAgo(7, 10), status: 'solved', type: 'question', assignee: 'ryan', tags: ['feature_request'], body: 'Any plans for dark mode?' })
  tickets[tickets.length - 1].comments.push(cm('ryan', 'It is on our roadmap for Q1 — I have added your vote.', daysAgo(6, 12)))
  add({ number: 48133, subject: 'Pickup scheduled for wrong day', requester: cust.julia, created: daysAgo(8, 9), status: 'closed', assignee: 'aisha', tags: ['pickup'], body: 'Pickup was booked for Saturday instead of Friday.' })
  add({ number: 48120, subject: 'Unable to add new user — seat limit', requester: cust.amy, created: daysAgo(9, 13), status: 'closed', group: 'Billing', assignee: 'aisha', tags: ['billing', 'seats'], body: 'Getting "seat limit reached" when inviting a user.' })
  add({ number: 48118, subject: 'Reset password for shared ops account', requester: cust.tom, created: daysAgo(9, 8), status: 'closed', assignee: 'ryan', tags: ['password_reset'], body: 'We need the password reset for ops@northwindtraders.com.' })
  add({ number: 48101, subject: 'Carrier rates outdated in quote tool', requester: cust.peter, created: daysAgo(11, 15), status: 'closed', assignee: 'ryan', tags: ['quotes'], body: 'Quote tool still shows Q2 rates.' })

  const macros = [
    { id: 'mac-duplicate', category: 'Billing', title: 'Billing::Duplicate charge — refund issued', status: 'solved', tags: ['refund_issued'], body: `Hi {{first_name}},\n\nThanks for flagging this, and sorry for the trouble. I've confirmed the duplicate charge on your account and issued a full refund for the second transaction. You'll see it back on your card within 5–7 business days.\n\nIf anything still looks off on your next statement, just reply here and I'll take care of it.` },
    { id: 'mac-invoice', category: 'Billing', title: 'Billing::Send invoice copy', status: 'solved', tags: ['invoice_sent'], body: `Hi {{first_name}},\n\nHappy to help. I've attached a PDF copy of the requested invoice. You can also download any invoice yourself under Admin → Billing → Invoices.` },
    { id: 'mac-proration', category: 'Billing', title: 'Billing::Plan change proration', status: 'pending', tags: ['proration'], body: `Hi {{first_name}},\n\nPlan changes made mid-cycle are prorated to the day. I've requested a credit for the difference between Business and Starter from the date of your downgrade — it will appear on your next invoice.\n\nCould you confirm whether you'd prefer the credit applied to the next invoice or refunded to the card on file?` },
    { id: 'mac-reset', category: 'Account', title: 'Account::Password reset instructions', status: 'solved', tags: ['password_reset_sent'], body: `Hi {{first_name}},\n\nI've sent a fresh password reset link to your email address. It's valid for 60 minutes, and please open it in the same browser you requested it from.\n\nIf it doesn't arrive within a few minutes, check that no-reply@northwind.com is on your allow-list.` },
    { id: 'mac-reset-missing', category: 'Account', title: 'Account::Reset email not received', status: 'pending', tags: ['email_deliverability'], body: `Hi {{first_name}},\n\nSorry you're stuck. I can see our reset emails are being blocked before they reach your inbox. Could you ask your IT team to allow-list no-reply@northwind.com and mail.northwind.com, then reply here? I'll trigger a new reset link as soon as you confirm.` },
    { id: 'mac-2fa', category: 'Account', title: 'Account::2FA reset — identity verification', status: 'pending', tags: ['2fa_reset'], body: `Hi {{first_name}},\n\nSorry to hear about your phone. To protect your account, we need to verify your identity before removing two-factor authentication. Please reply with:\n\n1. The last 4 digits of the card on file or your most recent invoice number\n2. The approximate date your account was created\n\nOnce verified, I'll reset 2FA and you can enroll your new device at next login.` },
    { id: 'mac-tier2', category: 'Routing', title: 'Escalate to Tier 2', status: 'open', tags: ['escalated'], body: `Hi {{first_name}},\n\nThanks for the details. I've escalated this to our Tier 2 team, who will follow up shortly.` },
    { id: 'mac-close', category: 'General', title: 'General::Close — no response', status: 'solved', tags: ['no_response'], body: `Hi {{first_name}},\n\nWe haven't heard back, so I'm closing this ticket for now. Just reply to reopen it anytime.` },
  ]
  return { 'zendesk.tickets': tickets, 'zendesk.macros': macros }
}

/* ─────────────────────────── Jira ─────────────────────────── */

function jira() {
  const sprints = [
    { id: 'spr-23', name: 'OPS Sprint 23', state: 'closed', start: daysAgo(23), end: daysAgo(9), goal: 'Vendor portal MVP' },
    { id: 'spr-24', name: 'OPS Sprint 24', state: 'active', start: daysAgo(8), end: daysFromNow(6), goal: 'Ship warehouse dashboard v2 and harden SSO for the vendor portal' },
    { id: 'spr-25', name: 'OPS Sprint 25', state: 'future', start: daysFromNow(6), end: daysFromNow(20), goal: '' },
  ]
  type I = Record<string, any>
  const issues: I[] = []
  let k = 112
  const add = (type: string, summary: string, status: string, priority: string, assignee: string, sprintId: string | null, points: number | undefined, epic: string | undefined, labels: string[], days: number, description = '') => {
    k++
    issues.push({
      id: `ops-${k}`,
      key: `OPS-${k}`,
      type,
      summary,
      description: description || `${summary}.\n\nAcceptance criteria\n- Works for all regions (NA, EMEA, APAC)\n- Covered by automated tests\n- Documented in the Operations space`,
      status,
      priority,
      assignee,
      reporter: ['alex', 'tom', 'priya', 'ben'][k % 4],
      labels,
      sprintId,
      points,
      epic,
      created: daysAgo(days, 10, k % 60),
      updated: daysAgo(Math.max(0, Math.min(days, 8) - 2), 15, (k * 7) % 60),
      comments: [],
    })
  }
  // epics
  add('Epic', 'Warehouse dashboard v2', 'In Progress', 'High', 'tom', null, undefined, undefined, [], 40)
  add('Epic', 'Vendor portal SSO hardening', 'In Progress', 'High', 'chen', null, undefined, undefined, [], 38)
  add('Epic', 'Invoice automation', 'To Do', 'Medium', 'ben', null, undefined, undefined, [], 30)
  const E1 = 'Warehouse dashboard v2', E2 = 'Vendor portal SSO hardening', E3 = 'Invoice automation'
  // active sprint 24
  add('Story', 'Shipments-by-region widget with drill-down', 'Done', 'High', 'chen', 'spr-24', 5, E1, ['dashboard'], 9)
  add('Story', 'Carrier on-time performance chart (last 90 days)', 'Done', 'Medium', 'maya', 'spr-24', 3, E1, ['dashboard'], 9)
  add('Bug', 'Dock schedule shows times in UTC instead of local time', 'Done', 'High', 'chen', 'spr-24', 2, E1, ['dashboard', 'timezone'], 7)
  add('Story', 'Enforce Okta MFA for vendor portal admin roles', 'Done', 'Highest', 'chen', 'spr-24', 5, E2, ['security', 'sso'], 9)
  add('Task', 'Rotate SAML signing certificate for vendor portal', 'Done', 'High', 'tom', 'spr-24', 2, E2, ['security'], 6)
  add('Story', 'Export vendor scorecard to PDF', 'Done', 'Medium', 'ben', 'spr-24', 3, undefined, ['vendor-portal'], 8)
  add('Story', 'Inventory aging heatmap by warehouse', 'In Review', 'Medium', 'maya', 'spr-24', 5, E1, ['dashboard'], 8)
  add('Bug', 'Session timeout logs vendors out during long uploads', 'In Review', 'High', 'chen', 'spr-24', 3, E2, ['sso', 'vendor-portal'], 5)
  add('Story', 'SCIM provisioning for vendor users', 'In Progress', 'High', 'tom', 'spr-24', 8, E2, ['sso'], 8)
  add('Task', 'Load test dashboard API (500 concurrent users)', 'In Progress', 'Medium', 'ryan', 'spr-24', 3, E1, ['performance'], 6)
  add('Story', 'Daily digest email of late shipments', 'In Progress', 'Medium', 'ben', 'spr-24', 3, E1, ['notifications'], 7)
  add('Story', 'Audit log for vendor role changes', 'To Do', 'Medium', 'chen', 'spr-24', 3, E2, ['security'], 8)
  add('Task', 'Update runbook: dashboard incident response', 'To Do', 'Low', 'alex', 'spr-24', 1, E1, ['docs'], 6)
  add('Bug', 'Marketing site "Contact us" form returns 500 when phone has +', 'In Review', 'High', 'chen', 'spr-24', 2, undefined, ['website', 'forms'], 2, 'Submitting the Contact Us form with an international phone number (e.g. +44 20 7946 0958) returns HTTP 500. Validation regex rejects "+" and the error is unhandled.\n\nReported in #eng-bugs by Hannah Novak.')
  add('Story', 'Warehouse capacity forecast (next 8 weeks)', 'To Do', 'Medium', 'maya', 'spr-24', 5, E1, ['dashboard', 'forecast'], 8)
  // sprint 25 / backlog
  add('Story', 'Auto-match invoices to POs (3-way match)', 'To Do', 'High', 'ben', 'spr-25', 8, E3, ['invoices'], 12)
  add('Story', 'OCR for PDF invoices from email', 'To Do', 'Medium', '', 'spr-25', 5, E3, ['invoices'], 12)
  add('Task', 'Define approval matrix with Finance', 'To Do', 'Medium', 'alex', 'spr-25', 2, E3, ['invoices'], 11)
  add('Story', 'Slack alert when a shipment is delayed > 24h', 'To Do', 'Medium', '', 'spr-25', 3, E1, ['notifications'], 10)
  add('Bug', 'Vendor list sort by "Last order" is not stable', 'To Do', 'Low', '', 'spr-25', 1, undefined, ['vendor-portal'], 10)
  add('Story', 'Role-based dashboard sharing', 'To Do', 'Medium', '', null, 5, E1, ['dashboard'], 15)
  add('Story', 'Vendor self-service banking details update', 'To Do', 'High', '', null, 8, E2, ['vendor-portal', 'security'], 16)
  add('Task', 'Decommission legacy shipments report (SSRS)', 'To Do', 'Low', '', null, 2, undefined, ['tech-debt'], 20)
  add('Bug', 'Dashboard filters reset when switching tabs', 'To Do', 'Medium', '', null, 2, E1, ['dashboard'], 14)
  add('Story', 'Multi-currency totals in spend dashboard', 'To Do', 'Medium', '', null, 5, E3, ['finance'], 18)
  add('Task', 'Upgrade Node 20 → 22 for ops services', 'To Do', 'Low', '', null, 3, undefined, ['tech-debt'], 22)
  // closed sprint 23
  add('Story', 'Vendor portal login with Okta', 'Done', 'High', 'chen', 'spr-23', 5, E2, ['sso'], 25)
  add('Story', 'Vendor onboarding form', 'Done', 'High', 'ben', 'spr-23', 5, undefined, ['vendor-portal'], 25)
  add('Story', 'Warehouse dashboard skeleton & auth', 'Done', 'Medium', 'maya', 'spr-23', 3, E1, ['dashboard'], 24)

  // a comment on the in-review contact-us bug
  const cu = issues.find((i) => i.summary.startsWith('Marketing site'))!
  cu.comments.push({ id: 'jc-1', author: 'chen', body: 'Fix is up for review: phone validation now accepts E.164 and returns 422 instead of 500.', date: hoursAgo(20) })

  return { 'jira.issues': issues, 'jira.sprints': sprints }
}

/* ─────────────────────────── Confluence ─────────────────────────── */

function confluence() {
  const P = (id: string, title: string, parentId: string | null, author: string, days: number, body: string, emoji?: string, labels: string[] = []) => ({
    id,
    space: 'OPS',
    title,
    parentId,
    author,
    created: daysAgo(days + 20, 10),
    updated: daysAgo(days, 14, 20),
    body,
    emoji,
    labels,
    views: 40 + ((days * 37) % 300),
  })
  const pages = [
    P('pg-home', 'Operations', null, 'priya', 3, `:::info
Welcome to the **Operations** space — runbooks, release notes, vendor processes and team rituals for Northwind Global Operations.
:::
## Quick links
- [Release notes](pg-releases) — what shipped each sprint
- [Runbooks](pg-runbooks) — on-call and incident response
- [Vendor onboarding process](pg-vendor-onboarding)
- [Team directory & rituals](pg-team)

## Current focus (Q4)
| Initiative | Owner | Status |
| --- | --- | --- |
| Warehouse dashboard v2 | Tom Fischer | {status:IN PROGRESS:blue} |
| Vendor portal SSO hardening | Chen Wei | {status:IN PROGRESS:blue} |
| Invoice automation | Ben Carter | {status:PLANNED:grey} |
| FY26 budget | Alex Morgan | {status:ON TRACK:green} |

## Team rituals
- **Daily stand-up** — 9:15 AM ET, #ops-team huddle
- **Sprint review** — every other Thursday, 2:00 PM ET
- **Ops review** — Thursdays with Priya`, '🏠'),
    P('pg-releases', 'Release notes', 'pg-home', 'tom', 9, `Release notes for every Operations Platform sprint. Newest first.

:::note
Release notes are generated from Jira at the end of each sprint and announced in #announcements.
:::
## Archive
- [Release notes — OPS Sprint 23](pg-rn-23)
- [Release notes — OPS Sprint 22](pg-rn-22)`, '🚀', ['release-notes']),
    P('pg-rn-23', 'Release notes — OPS Sprint 23', 'pg-releases', 'tom', 9, `{status:RELEASED:green}  Sprint 23 · ${new Date(daysAgo(23)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date(daysAgo(9)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}

## Highlights
Vendor portal MVP is live for the first 40 vendors.

## What shipped
| Key | Summary | Type | Assignee |
| --- | --- | --- | --- |
| OPS-142 | Vendor portal login with Okta | Story | Chen Wei |
| OPS-143 | Vendor onboarding form | Story | Ben Carter |
| OPS-144 | Warehouse dashboard skeleton & auth | Story | Maya Johnson |

:::success
3 work items · 13 story points delivered
:::`, undefined, ['release-notes']),
    P('pg-rn-22', 'Release notes — OPS Sprint 22', 'pg-releases', 'tom', 23, `{status:RELEASED:green}  Sprint 22

## What shipped
| Key | Summary | Type | Assignee |
| --- | --- | --- | --- |
| OPS-98 | Carrier API integration (DHL, UPS) | Story | Chen Wei |
| OPS-101 | Shipment status webhooks | Story | Ryan Tanaka |`, undefined, ['release-notes']),
    P('pg-runbooks', 'Runbooks', 'pg-home', 'oliver', 12, `## On-call runbooks
| Runbook | Owner | Last reviewed |
| --- | --- | --- |
| [Dashboard incident response](pg-rb-dashboard) | Tom Fischer | {status:CURRENT:green} |
| [VPN outage — Boston](pg-rb-vpn) | Oliver Brooks | {status:CURRENT:green} |
| SAP Fiori SSO failures | Henrik Larsen | {status:NEEDS REVIEW:yellow} |`, '📕'),
    P('pg-rb-dashboard', 'Dashboard incident response', 'pg-runbooks', 'tom', 15, `:::warning
Page the on-call engineer in #ops-team if the dashboard is down for more than 10 minutes.
:::
## Steps
1. Check the status page and Datadog monitor **ops-dashboard-api**
2. Roll back the last deploy if errors started after a release
3. Post an update in #ops-team every 30 minutes`),
    P('pg-rb-vpn', 'VPN outage — Boston', 'pg-runbooks', 'oliver', 20, `## Symptoms
- GlobalProtect drops every 10–15 minutes
- "Gateway BOS-GW01 not responding"

## Triage
1. Route incidents to **Network** with category Network / VPN
2. Link duplicates to the first incident (parent)
3. Post status in #it-help`),
    P('pg-vendor-onboarding', 'Vendor onboarding process', 'pg-home', 'lucas', 6, `## Overview
New vendors are onboarded through Coupa, then created in SAP by AP.

| Step | Team | SLA |
| --- | --- | --- |
| Supplier registration in Coupa | Procurement | 2 days |
| W-9 / bank verification | AP | 3 days |
| SAP vendor master creation | AP | 1 day |`, '🤝'),
    P('pg-team', 'Team directory & rituals', 'pg-home', 'alex', 30, `## Operations team
| Name | Role | Location |
| --- | --- | --- |
| Priya Raman | VP, Operations | Boston |
| Alex Morgan | Operations Manager | Boston |
| Ben Carter | Operations Analyst | Boston |
| Maya Johnson | Operations Coordinator | Boston |`, '👋'),
    P('pg-retro-23', 'Sprint 23 retrospective', 'pg-home', 'tom', 9, `## What went well
- Vendor portal MVP shipped on time
## What to improve
- Too many unplanned bugs from #eng-bugs mid-sprint`, '🔁'),
  ]
  return { 'confluence.pages': pages }
}

/* ─────────────────────────── Slack ─────────────────────────── */

function slack() {
  type M = Record<string, any>
  const msgs: M[] = []
  let n = 0
  const m = (channelId: string, from: string, text: string, date: string, extra: Partial<M> = {}) => {
    const id = `sm-${channelId}-${++n}`
    msgs.push({ id, channelId, from, text, date, ...extra })
    return id
  }
  const R = (emoji: string, ...users: string[]) => ({ emoji, users })

  // #eng-bugs — bug reports (used by the slack-bugs-to-jira workflow)
  m('eng-bugs', 'tom', 'Reminder: please post bugs here with steps to repro + who is impacted. We triage into Jira OPS daily :pray:', daysAgo(6, 9, 2))
  const old = m('eng-bugs', 'hannah', 'The *Contact us* form on the marketing site returns a 500 when the phone number has a `+` in it (e.g. +44 20 7946 0958). We are losing EMEA leads.', hoursAgo(26), { reactions: [R('eyes', 'chen')] })
  m('eng-bugs', 'chen', 'Tracked in OPS-129 — fix is in review, should ship tomorrow.', hoursAgo(20), { threadTs: old })
  m('eng-bugs', 'hannah', 'thank you!! :raised_hands:', hoursAgo(19.5), { threadTs: old })
  m('eng-bugs', 'maya', 'Ops dashboard: the *Shipments by region* widget shows 0 for EMEA since this morning’s deploy. The data is fine in the warehouse tables, so it looks like a filter/regression in the widget. Blocking the 10am regional review.', minutesAgo(95), { id: 'bug-dashboard', reactions: [R('eyes', 'tom'), R('rotating_light', 'ben', 'priya')] })
  m('eng-bugs', 'aisha', 'Customer portal: password reset links expire immediately for some users — they get “This link has expired” within a minute of receiving the email. Woodgrove Bank and Fourth Coffee both reported it in Zendesk. Customers are locked out.', minutesAgo(70), { id: 'bug-reset', reactions: [R('fire', 'ryan')] })
  m('eng-bugs', 'ben', 'Vendor list → *Export CSV* truncates at exactly 1,000 rows. We have 1,380 active vendors and need the full export for Thursday’s Q3 spend review.', minutesAgo(48), { id: 'bug-export' })
  m('eng-bugs', 'ryan', 'Seeing the same reset-link thing on my side — happens when the email client pre-fetches links (Outlook Safe Links?). Might be the token being consumed by the scanner.', minutesAgo(62), { threadTs: 'bug-reset' })

  // #general
  m('general', 'david', 'Huge congrats to the Ops + Eng teams for getting the vendor portal live for the first 40 vendors :tada: Proud of this one.', daysAgo(8, 16, 4), { reactions: [R('tada', 'priya', 'tom', 'chen', 'alex', 'ben', 'maya', 'grace'), R('heart', 'nina', 'rachel')] })
  m('general', 'nina', 'Open enrollment closes this Friday — please review your benefit elections in Workday :point_up:', daysAgo(1, 9, 31))
  m('general', 'hannah', 'The Q4 brand refresh is live on the website. New case studies with Contoso and Adatum are up!', hoursAgo(5), { reactions: [R('fire', 'rachel', 'liam'), R('100', 'david')] })
  m('general', 'grace', 'FYI: we are seeing VPN instability at the Boston office this morning. Network team is on it — updates in #it-help.', minutesAgo(80), { reactions: [R('pray', 'ben', 'maya', 'james')] })
  // #ops-team
  m('ops-team', 'priya', 'Morning team :sunny: Agenda for Thursday’s ops review: Q3 vendor spend, warehouse dashboard v2 demo, FY26 budget status.', hoursAgo(3), { reactions: [R('+1', 'alex', 'ben', 'maya')] })
  m('ops-team', 'ben', 'I’ll have the Q3 vendor spend numbers by Wednesday EOD. Waiting on the full vendor export (bug posted in #eng-bugs).', hoursAgo(2.5))
  m('ops-team', 'maya', 'Dock schedule for Rotterdam is updated for next week — 3 extra inbound slots on Tuesday.', hoursAgo(1.6))
  m('ops-team', 'alex', 'Thanks both! @Maya can you add the Rotterdam slots to the dashboard notes too?', hoursAgo(1.5))
  m('ops-team', 'maya', 'Done :white_check_mark:', hoursAgo(1.3), { reactions: [R('raised_hands', 'alex')] })
  // #it-help
  m('it-help', 'ben', 'Is anyone else’s VPN dropping every 10 minutes? Boston office, 4th floor.', minutesAgo(98), { reactions: [R('heavy_plus_sign', 'maya', 'hannah', 'james')] })
  m('it-help', 'oliver', 'Yes — we are aware. Please raise a ticket in ServiceNow so we can track impact. Network is looking at BOS-GW01.', minutesAgo(92))
  m('it-help', 'emma', 'Fiori is giving us “SAML assertion invalid” in Chicago. Whole AP team is blocked :sweat:', minutesAgo(78))
  m('it-help', 'oliver', 'Thanks Emma, logged. Looks like an expired IdP cert on the SAP side — SAP Basis will take it.', minutesAgo(72))
  // #sales
  m('sales', 'rachel', 'Q4 pipeline review at 3pm. Please make sure your Salesforce opportunities have next steps filled in.', hoursAgo(4))
  m('sales', 'liam', 'Adatum demo went really well this morning — Elena wants pricing for 250 seats + a CIO follow-up :rocket:', minutesAgo(36), { reactions: [R('rocket', 'rachel', 'david'), R('moneybag', 'marcus')] })
  m('sales', 'rachel', 'Nice work Liam! Loop in Alex for the rollout timeline.', minutesAgo(30))
  // #finance
  m('finance', 'sofia', 'Payment run is at 11am today. Please get invoice approvals into SAP before then.', hoursAgo(3.2))
  m('finance', 'emma', 'We can’t log in to Fiori — ticket raised. Might need to push the run to 2pm.', minutesAgo(75))
  m('finance', 'marcus', 'OK to push to 2pm if needed. Keep me posted.', minutesAgo(68))
  // #people-team
  m('people-team', 'james', 'Jordan Ellis starts Monday in Ops (Boston). Laptop request and onboarding checklist are in progress.', hoursAgo(5))
  m('people-team', 'nina', 'Great — let’s make sure accounts are ready day one this time :smile:', hoursAgo(4.8))
  // #random
  m('random', 'chen', 'Someone left a full box of donuts in the 4th floor kitchen in Boston. Godspeed.', hoursAgo(2), { reactions: [R('doughnut', 'ben', 'maya', 'hannah', 'alex')] })
  m('random', 'ryan', 'Austin office has tacos today, just saying :taco:', hoursAgo(1.8), { reactions: [R('taco', 'oliver', 'grace')] })
  m('random', 'maya', 'Photo from the Rotterdam warehouse visit :ship:', daysAgo(1, 15, 20))
  // #announcements
  m('announcements', 'priya', ':mega: Release notes for *OPS Sprint 23* are published in Confluence → Operations / Release notes. Highlights: vendor portal MVP live for 40 vendors.', daysAgo(9, 16, 30), { reactions: [R('tada', 'tom', 'chen', 'ben')] })
  m('announcements', 'grace', ':lock: Reminder: Okta Verify is now required for all admin roles starting November 1.', daysAgo(3, 10, 0))
  m('announcements', 'nina', 'Welcome our new hires starting next week! Say hi in #new-hires :wave:', daysAgo(1, 11, 0))
  // #new-hires
  m('new-hires', 'james', 'Please welcome Jordan Ellis, joining Ops as an Operations Analyst on Monday! :wave:', daysAgo(1, 11, 5), { reactions: [R('wave', 'alex', 'priya', 'ben', 'maya', 'nina')] })
  m('new-hires', 'alex', 'Welcome Jordan! Looking forward to working together.', daysAgo(1, 11, 30))
  // DMs with Alex
  m('dm-priya', 'priya', 'Hey Alex — can you send me the Q3 vendor summary before Thursday? Excel is fine.', hoursAgo(2))
  m('dm-priya', 'alex', 'Yes, on it. Will have it to you by Wednesday.', hoursAgo(1.9))
  m('dm-tom', 'tom', 'Sprint 24 ends next week — want to do release notes together again?', hoursAgo(6))
  m('dm-oliver', 'oliver', 'Queue is getting deep this morning. Any help appreciated :sweat_smile:', minutesAgo(65))
  m('dm-ben', 'ben', 'Vendor export bug is blocking me for Thursday. Posted in #eng-bugs.', minutesAgo(46))
  m('dm-maya', 'maya', 'Can we move our 1:1 to 3pm?', hoursAgo(3))
  m('dm-maya', 'alex', 'Sure, moved.', hoursAgo(2.9))

  return { 'slack.messages': msgs }
}

export function seed(): Collections {
  return { ...servicenow(), ...zendesk(), ...jira(), ...confluence(), ...slack() } as unknown as Collections
}
