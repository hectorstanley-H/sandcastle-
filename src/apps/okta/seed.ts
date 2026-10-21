import type { Collections, Rec } from '@/db/db'
import { PEOPLE, COMPANY } from '@/data/people'
import { daysAgo, hoursAgo, minutesAgo } from '@/data/time'

/* Okta seed: users, apps, assignments, groups, System Log. Generated relative to now at reset time. */

type Status = 'ACTIVE' | 'STAGED' | 'PROVISIONED' | 'SUSPENDED' | 'DEPROVISIONED' | 'LOCKED_OUT' | 'PASSWORD_EXPIRED'

export const OKTA_APPS: { id: string; label: string; tile?: string; logo: string; signOn: string; provisioning?: boolean }[] = [
  { id: 'outlook', label: 'Microsoft Office 365', tile: 'Microsoft Outlook', logo: 'outlook', signOn: 'WS-Federation', provisioning: true },
  { id: 'teams', label: 'Microsoft Teams', logo: 'teams', signOn: 'WS-Federation', provisioning: true },
  { id: 'word', label: 'Microsoft Word', logo: 'word', signOn: 'WS-Federation' },
  { id: 'excel', label: 'Microsoft Excel', logo: 'excel', signOn: 'WS-Federation' },
  { id: 'powerpoint', label: 'Microsoft PowerPoint', logo: 'powerpoint', signOn: 'WS-Federation' },
  { id: 'slack', label: 'Slack', logo: 'slack', signOn: 'SAML 2.0', provisioning: true },
  { id: 'workday', label: 'Workday', logo: 'workday', signOn: 'SAML 2.0', provisioning: true },
  { id: 'salesforce', label: 'Salesforce.com', logo: 'salesforce', signOn: 'SAML 2.0', provisioning: true },
  { id: 'servicenow', label: 'ServiceNow UD', logo: 'servicenow', signOn: 'SAML 2.0', provisioning: true },
  { id: 'sap', label: 'SAP S/4HANA Cloud', logo: 'sap', signOn: 'SAML 2.0' },
  { id: 'concur', label: 'SAP Concur', logo: 'concur', signOn: 'SAML 2.0', provisioning: true },
  { id: 'coupa', label: 'Coupa', logo: 'coupa', signOn: 'SAML 2.0' },
  { id: 'netsuite', label: 'Oracle NetSuite', logo: 'netsuite', signOn: 'SAML 2.0' },
  { id: 'docusign', label: 'Docusign', logo: 'docusign', signOn: 'SAML 2.0', provisioning: true },
  { id: 'greenhouse', label: 'Greenhouse Recruiting', logo: 'greenhouse', signOn: 'SAML 2.0' },
  { id: 'zendesk', label: 'Zendesk', logo: 'zendesk', signOn: 'SAML 2.0', provisioning: true },
  { id: 'jira', label: 'Atlassian Jira Cloud', tile: 'Jira', logo: 'jira', signOn: 'SAML 2.0', provisioning: true },
  { id: 'confluence', label: 'Atlassian Confluence Cloud', tile: 'Confluence', logo: 'confluence', signOn: 'SAML 2.0', provisioning: true },
  { id: 'zoom', label: 'Zoom', logo: 'zoom', signOn: 'SAML 2.0', provisioning: true },
  { id: 'hubspot', label: 'HubSpot', logo: 'hubspot', signOn: 'SAML 2.0' },
  { id: 'tableau', label: 'Tableau Cloud', logo: 'tableau', signOn: 'SAML 2.0' },
  { id: 'powerbi', label: 'Microsoft Power BI', logo: 'powerbi', signOn: 'WS-Federation' },
  { id: 'hworker', label: 'H-Worker', logo: 'hworker', signOn: 'OIDC' },
]

export const GROUPS: { id: string; name: string; description: string; type: 'BUILT_IN' | 'OKTA_GROUP' | 'APP_GROUP'; source?: string; apps: string[] }[] = [
  { id: 'okta-g-everyone', name: 'Everyone', description: 'All users in your organization', type: 'BUILT_IN', apps: ['outlook', 'teams', 'word', 'excel', 'powerpoint', 'slack', 'workday', 'zoom'] },
  { id: 'okta-g-employees', name: 'All Employees - Workday', description: 'Imported from Workday · Worker type = Employee', type: 'APP_GROUP', source: 'Workday', apps: [] },
  { id: 'okta-g-ops', name: 'Dept - Operations', description: 'Operations department (Workday Supervisory Org)', type: 'APP_GROUP', source: 'Workday', apps: ['servicenow', 'sap', 'concur', 'coupa', 'docusign', 'hworker'] },
  { id: 'okta-g-finance', name: 'Dept - Finance', description: 'Finance & Accounting', type: 'APP_GROUP', source: 'Workday', apps: ['sap', 'concur', 'coupa', 'netsuite', 'docusign', 'powerbi'] },
  { id: 'okta-g-sales', name: 'Dept - Sales', description: 'Sales and Revenue', type: 'APP_GROUP', source: 'Workday', apps: ['salesforce', 'hubspot', 'docusign', 'concur', 'tableau'] },
  { id: 'okta-g-eng', name: 'Dept - Engineering', description: 'Engineering & Product', type: 'APP_GROUP', source: 'Workday', apps: ['jira', 'confluence'] },
  { id: 'okta-g-it', name: 'Dept - IT', description: 'Information Technology', type: 'APP_GROUP', source: 'Workday', apps: ['servicenow', 'jira', 'confluence', 'zendesk', 'powerbi', 'hworker'] },
  { id: 'okta-g-people', name: 'Dept - People', description: 'People / Human Resources', type: 'APP_GROUP', source: 'Workday', apps: ['greenhouse', 'docusign', 'concur'] },
  { id: 'okta-g-cs', name: 'Dept - Customer Success', description: 'Customer Success & Support', type: 'APP_GROUP', source: 'Workday', apps: ['zendesk', 'salesforce', 'jira'] },
  { id: 'okta-g-mkt', name: 'Dept - Marketing', description: 'Marketing', type: 'APP_GROUP', source: 'Workday', apps: ['hubspot', 'salesforce', 'tableau'] },
  { id: 'okta-g-exec', name: 'Executive Leadership', description: 'C-suite and VPs', type: 'OKTA_GROUP', apps: ['salesforce', 'tableau', 'powerbi', 'concur', 'docusign'] },
  { id: 'okta-g-admins', name: 'Okta Super Admins', description: 'Users with Super Administrator role', type: 'OKTA_GROUP', apps: [] },
  { id: 'okta-g-boston', name: 'Location - Boston HQ', description: 'Office = Boston, MA', type: 'OKTA_GROUP', apps: [] },
  { id: 'okta-g-o365', name: 'Microsoft 365 E5 Licensed', description: 'License assignment group for Microsoft 365', type: 'OKTA_GROUP', apps: [] },
  { id: 'okta-g-mfa', name: 'MFA - Phishing Resistant', description: 'Members must use Okta FastPass or FIDO2', type: 'OKTA_GROUP', apps: [] },
  { id: 'okta-g-contractors', name: 'Contractors', description: 'Contingent workers (Workday)', type: 'APP_GROUP', source: 'Workday', apps: ['slack', 'jira'] },
]

const DEPT_GROUP: Record<string, string> = {
  Operations: 'okta-g-ops',
  Finance: 'okta-g-finance',
  Sales: 'okta-g-sales',
  Engineering: 'okta-g-eng',
  IT: 'okta-g-it',
  People: 'okta-g-people',
  'Customer Success': 'okta-g-cs',
  Marketing: 'okta-g-mkt',
  Executive: 'okta-g-exec',
}

/** Okta-style object id (00u…) derived from a record id — stable, no state. */
export function oktaId(id: string, prefix = '00u') {
  let h = 2166136261
  for (const c of id) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0
  let h2 = h ^ 0x5bd1e995
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  let s = ''
  for (let i = 0; i < 17; i++) {
    h2 = Math.imul(h2 ^ (h2 >>> 13), 1274126177) >>> 0
    s += chars[h2 % chars.length]
  }
  return prefix + s
}

const EXTRA: [string, string, string, string, string, Status][] = [
  ['Olivia', 'Grant', 'Senior Accountant', 'Finance', 'sofia', 'ACTIVE'],
  ['Ethan', 'Park', 'Financial Analyst', 'Finance', 'sofia', 'ACTIVE'],
  ['Isabella', 'Cruz', 'Payroll Specialist', 'People', 'james', 'ACTIVE'],
  ['Noah', 'Fitzgerald', 'Sales Development Rep', 'Sales', 'rachel', 'ACTIVE'],
  ['Ava', 'Lindqvist', 'Account Executive', 'Sales', 'rachel', 'PASSWORD_EXPIRED'],
  ['Mateo', 'Alvarez', 'Solutions Engineer', 'Sales', 'rachel', 'ACTIVE'],
  ['Zoe', 'Hartmann', 'Product Designer', 'Engineering', 'tom', 'ACTIVE'],
  ['Arjun', 'Mehta', 'Site Reliability Engineer', 'Engineering', 'tom', 'ACTIVE'],
  ['Chloe', 'Dubois', 'Software Engineer', 'Engineering', 'tom', 'LOCKED_OUT'],
  ['Daniel', 'Osei', 'Software Engineer II', 'Engineering', 'tom', 'ACTIVE'],
  ['Mia', 'Castillo', 'IT Support Specialist', 'IT', 'oliver', 'ACTIVE'],
  ['Kevin', 'Byrne', 'Identity & Access Engineer', 'IT', 'grace', 'ACTIVE'],
  ['Laura', 'Weiss', 'Security Analyst', 'IT', 'grace', 'ACTIVE'],
  ['Samuel', 'Adeyemi', 'Support Engineer', 'Customer Success', 'aisha', 'ACTIVE'],
  ['Hailey', 'Brennan', 'Customer Success Manager', 'Customer Success', 'aisha', 'SUSPENDED'],
  ['Victor', 'Nguyen', 'Content Marketing Lead', 'Marketing', 'hannah', 'ACTIVE'],
  ['Grace', 'Holloway', 'Demand Gen Manager', 'Marketing', 'hannah', 'DEPROVISIONED'],
  ['Omar', 'Haddad', 'Supply Chain Analyst', 'Operations', 'priya', 'ACTIVE'],
  ['Elise', 'Fontaine', 'Recruiter', 'People', 'james', 'PROVISIONED'],
  ['Tyler', 'Brooks', 'Facilities Coordinator', 'Operations', 'priya', 'STAGED'],
  ['Leah', 'Kowalski', 'Revenue Accountant', 'Finance', 'marcus', 'ACTIVE'],
  ['Marco', 'Bianchi', 'Data Analyst', 'Operations', 'priya', 'ACTIVE'],
]

const CLIENTS = ['Chrome 130.0 on Windows 11', 'Edge 130.0 on Windows 11', 'Safari 18.1 on macOS', 'Chrome 130.0 on macOS', 'Okta Verify 9.30 on iOS', 'Edge 129.0 on Windows 11']
const LOC: Record<string, [string, string]> = {
  'Boston, MA': ['Boston, Massachusetts, United States', '73.114.'],
  'New York, NY': ['New York, New York, United States', '68.173.'],
  'Chicago, IL': ['Chicago, Illinois, United States', '98.226.'],
  'San Francisco, CA': ['San Francisco, California, United States', '67.169.'],
  'Austin, TX': ['Austin, Texas, United States', '70.112.'],
}

export function seed(): Collections {
  // deterministic PRNG local to this call (no module state)
  let s = 20251021
  const rnd = () => ((s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 4294967296)
  const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)]

  const users: Rec[] = []
  const internal = PEOPLE.filter((p) => !p.external)
  for (const p of internal) {
    const isJordan = p.id === 'jordan'
    const status: Status = isJordan ? 'STAGED' : 'ACTIVE'
    const groups = isJordan
      ? ['okta-g-everyone', 'okta-g-employees']
      : ['okta-g-everyone', 'okta-g-employees', DEPT_GROUP[p.dept], 'okta-g-o365', ...(p.location === 'Boston, MA' ? ['okta-g-boston'] : []), ...(p.title.match(/Chief|VP/) ? ['okta-g-exec'] : []), ...(p.id === 'grace' || p.id === 'oliver' || p.id === 'alex' ? ['okta-g-admins'] : [])].filter(Boolean)
    const createdDays = isJordan ? 1 : 120 + Math.floor(rnd() * 900)
    users.push({
      id: `okta-u-${p.id}`,
      oktaId: oktaId(p.id),
      personId: p.id,
      firstName: p.first,
      lastName: p.last,
      login: p.email,
      email: p.email,
      secondEmail: '',
      title: isJordan ? 'Operations Analyst' : p.title,
      department: p.dept,
      manager: p.managerId ? PEOPLE.find((m) => m.id === p.managerId)?.name ?? '' : '',
      managerId: p.managerId ? `okta-u-${p.managerId}` : undefined,
      employeeNumber: p.employeeId,
      location: p.location,
      mobilePhone: p.phone,
      status,
      source: isJordan ? 'Workday' : pick(['Workday', 'Workday', 'Active Directory']),
      created: isJordan ? hoursAgo(19) : daysAgo(createdDays, 8, 30),
      activated: isJordan ? undefined : daysAgo(createdDays - 1, 9, 2),
      lastLogin: isJordan ? undefined : p.id === 'alex' ? minutesAgo(4) : hoursAgo(1 + Math.floor(rnd() * 70)),
      passwordChanged: isJordan ? undefined : daysAgo(5 + Math.floor(rnd() * 80), 10, 0),
      mfa: isJordan
        ? []
        : [
            { type: 'Okta Verify', enrolled: daysAgo(createdDays - 1, 9, 6) },
            ...(rnd() > 0.55 ? [{ type: 'FIDO2 (WebAuthn)', enrolled: daysAgo(Math.floor(createdDays / 2), 11, 14) }] : []),
            ...(rnd() > 0.7 ? [{ type: 'SMS', enrolled: daysAgo(createdDays - 2, 13, 40) }] : []),
          ],
      groups,
      startDate: isJordan ? daysAgo(-((8 - new Date().getDay()) % 7 || 7), 9, 0).slice(0, 10) : undefined,
    })
  }
  const locs = Object.keys(LOC)
  for (const [first, last, title, dept, mgr, status] of EXTRA) {
    const key = `${first}${last}`.toLowerCase()
    const email = `${first}.${last}`.toLowerCase() + '@' + COMPANY.domain
    const createdDays = status === 'STAGED' ? 3 : status === 'PROVISIONED' ? 6 : 60 + Math.floor(rnd() * 700)
    const loc = pick(locs)
    const active = status !== 'STAGED' && status !== 'PROVISIONED'
    users.push({
      id: `okta-u-${key}`,
      oktaId: oktaId(key),
      firstName: first,
      lastName: last,
      login: email,
      email,
      title,
      department: dept,
      manager: PEOPLE.find((m) => m.id === mgr)?.name ?? '',
      managerId: `okta-u-${mgr}`,
      employeeNumber: `E${23000 + Math.floor(rnd() * 900)}`,
      location: loc,
      mobilePhone: `+1 (617) 555-0${100 + Math.floor(rnd() * 899)}`,
      status,
      source: 'Workday',
      created: daysAgo(createdDays, 8, 15),
      activated: active ? daysAgo(createdDays - 1, 9, 0) : undefined,
      lastLogin: active && status !== 'DEPROVISIONED' ? hoursAgo(2 + Math.floor(rnd() * 140)) : status === 'DEPROVISIONED' ? daysAgo(34, 17, 2) : undefined,
      passwordChanged: active ? daysAgo(Math.floor(rnd() * 90) + 3, 10, 0) : undefined,
      mfa: active ? [{ type: rnd() > 0.2 ? 'Okta Verify' : 'Google Authenticator', enrolled: daysAgo(createdDays - 1, 9, 5) }, ...(rnd() > 0.6 ? [{ type: 'FIDO2 (WebAuthn)', enrolled: daysAgo(40, 10, 0) }] : [])] : [],
      groups: ['okta-g-everyone', 'okta-g-employees', DEPT_GROUP[dept], ...(loc === 'Boston, MA' ? ['okta-g-boston'] : []), ...(active ? ['okta-g-o365'] : [])],
    })
  }

  /* apps */
  const apps: Rec[] = OKTA_APPS.map((a, i) => ({ ...a, oktaId: oktaId(a.id, '0oa'), status: 'ACTIVE', created: daysAgo(400 + i * 23, 10, 0) }))

  /* assignments */
  const assignments: Rec[] = []
  const add = (u: Rec, appId: string, scope: 'USER' | 'GROUP', at: string, by = 'Workday Provisioning') => {
    if (assignments.some((x) => x.userId === u.id && x.appId === appId)) return
    const g = scope === 'GROUP' ? GROUPS.find((gr) => u.groups.includes(gr.id) && gr.apps.includes(appId)) : undefined
    assignments.push({ id: `okta-as-${u.id.slice(7)}-${appId}`, userId: u.id, appId, assignedAt: at, assignedBy: by, scope, group: g?.name, appUsername: u.login })
  }
  for (const u of users) {
    if (u.status === 'STAGED' || u.status === 'DEPROVISIONED') continue
    const at = u.activated ?? u.created
    for (const g of GROUPS) if (u.groups.includes(g.id)) for (const a of g.apps) add(u, a, 'GROUP', at)
  }
  const alex = users.find((u) => u.id === 'okta-u-alex')!
  for (const a of ['salesforce', 'netsuite', 'powerbi', 'tableau', 'jira', 'confluence']) add(alex, a, 'USER', daysAgo(90, 14, 20), 'Grace Kim')
  const ex = (uid: string, apps: string[]) => {
    const u = users.find((x) => x.id === uid)
    if (u) for (const a of apps) add(u, a, 'USER', daysAgo(60, 11, 0), 'Kevin Byrne')
  }
  ex('okta-u-grace', ['salesforce', 'tableau', 'coupa'])
  ex('okta-u-ben', ['powerbi', 'tableau', 'jira'])
  ex('okta-u-maya', ['jira', 'confluence'])
  ex('okta-u-priya', ['salesforce', 'tableau', 'powerbi'])

  /* groups */
  const groups: Rec[] = GROUPS.map((g, i) => ({ ...g, oktaId: oktaId(g.id, '00g'), created: daysAgo(500 - i * 11, 10, 0) }))

  /* System Log */
  const logs: Rec[] = []
  const userActor = (u: Rec) => ({ id: u.oktaId, type: 'User', displayName: `${u.firstName} ${u.lastName}`, alternateId: u.login })
  const T = (type: string, displayName: string, alternateId: string) => ({ type, displayName, alternateId })
  const appT = (id: string) => {
    const a = OKTA_APPS.find((x) => x.id === id)!
    return T('AppInstance', a.label, id)
  }
  const userT = (u: Rec) => T('User', `${u.firstName} ${u.lastName}`, u.login)
  const geo = (u: Rec) => LOC[u.location] ?? LOC['Boston, MA']
  let n = 0
  const L = (published: string, actor: any, eventType: string, displayMessage: string, target: any[], outcome = 'SUCCESS', u?: Rec, extra: any = {}) => {
    const [location, ipp] = u ? geo(u) : ['Ashburn, Virginia, United States', '52.20.']
    logs.push({
      id: `okta-log-${(n++).toString().padStart(4, '0')}`,
      published,
      actor,
      eventType,
      displayMessage,
      target,
      outcome,
      ip: ipp + Math.floor(rnd() * 255) + '.' + Math.floor(rnd() * 255),
      location,
      client: actor.type === 'User' ? pick(CLIENTS) : 'Okta Workflows / API',
      severity: outcome === 'SUCCESS' ? 'INFO' : 'WARN',
      ...extra,
    })
  }
  const SYS = { id: '0oa1workdayprov', type: 'PublicClientApp', displayName: 'Workday Provisioning', alternateId: 'workday' }
  const OKTA = { id: 'okta-system', type: 'SystemPrincipal', displayName: 'Okta System', alternateId: 'system@okta.com' }

  const active = users.filter((u) => u.status === 'ACTIVE')
  for (let i = 0; i < 70; i++) {
    const u = i % 7 === 0 ? alex : pick(active)
    const mins = Math.floor(rnd() * 60 * 24 * 6.5) + 30
    const at = minutesAgo(mins)
    L(at, userActor(u), 'user.session.start', 'User login to Okta', [userT(u)], 'SUCCESS', u)
    L(minutesAgo(mins - 0.2), userActor(u), 'policy.evaluate_sign_on', 'Evaluation of sign-on policy', [T('PolicyEntity', 'Default Global Session Policy', 'Default Policy'), T('PolicyRule', 'Require MFA', 'Catch-all Rule')], 'SUCCESS', u)
    L(minutesAgo(mins - 0.4), userActor(u), 'user.authentication.auth_via_mfa', 'Authentication of user via MFA', [T('AuthenticatorEnrollment', u.mfa[0]?.type ?? 'Okta Verify', 'okta_verify')], 'SUCCESS', u)
    const ua = assignments.filter((a) => a.userId === u.id)
    if (ua.length) {
      const k = 1 + Math.floor(rnd() * 3)
      for (let j = 0; j < k; j++) {
        const a = pick(ua)
        L(minutesAgo(mins - 1 - j * 7), userActor(u), 'user.authentication.sso', 'User single sign on to app', [appT(a.appId), userT(u)], 'SUCCESS', u)
      }
    }
  }
  // notable events
  const chloe = users.find((u) => u.id === 'okta-u-chloedubois')!
  for (let i = 0; i < 4; i++) L(hoursAgo(5.2 - i * 0.05), userActor(chloe), 'user.session.start', 'User login to Okta', [userT(chloe)], 'FAILURE', chloe, { reason: 'INVALID_CREDENTIALS' })
  L(hoursAgo(5.0), OKTA, 'user.account.lock', 'Max sign in attempts exceeded', [userT(chloe)], 'SUCCESS', chloe)
  const ava = users.find((u) => u.id === 'okta-u-avalindqvist')!
  L(hoursAgo(26), OKTA, 'user.password.expired', 'User password expired', [userT(ava)], 'SUCCESS', ava)
  const hailey = users.find((u) => u.id === 'okta-u-haileybrennan')!
  L(daysAgo(2, 16, 12), userActor(users.find((u) => u.id === 'okta-u-kevinbyrne')!), 'user.lifecycle.suspend', 'Suspend Okta user', [userT(hailey)], 'SUCCESS', hailey)
  const ryan = users.find((u) => u.id === 'okta-u-ryan')!
  L(hoursAgo(14), userActor(ryan), 'policy.evaluate_sign_on', 'Evaluation of sign-on policy', [T('PolicyEntity', 'Default Global Session Policy', 'Default Policy'), T('PolicyRule', 'Block anonymizing proxies', 'Network Zone Rule')], 'DENY', undefined, { location: 'Frankfurt am Main, Hesse, Germany', client: 'Chrome 130.0 on Linux' })
  L(hoursAgo(13.8), OKTA, 'security.threat.detected', 'Request from suspicious actor', [userT(ryan)], 'DENY', undefined, { location: 'Frankfurt am Main, Hesse, Germany', client: 'Unknown' })
  const tyler = users.find((u) => u.id === 'okta-u-tylerbrooks')!
  L(daysAgo(3, 6, 0), SYS, 'system.import.user.create', 'Create Okta user (Workday import)', [userT(tyler), T('AppInstance', 'Workday', 'workday')], 'SUCCESS')
  const elise = users.find((u) => u.id === 'okta-u-elisefontaine')!
  L(daysAgo(6, 6, 0), SYS, 'system.import.user.create', 'Create Okta user (Workday import)', [userT(elise), T('AppInstance', 'Workday', 'workday')], 'SUCCESS')
  L(daysAgo(5, 10, 30), userActor(users.find((u) => u.id === 'okta-u-oliver')!), 'user.lifecycle.activate', 'Activate Okta user', [userT(elise)], 'SUCCESS', elise)
  L(daysAgo(5, 10, 30.3), OKTA, 'system.email.send_factor_verify_message', 'Send user activation email', [userT(elise)], 'SUCCESS')
  const jordan = users.find((u) => u.id === 'okta-u-jordan')!
  L(hoursAgo(19.5), SYS, 'system.import.start', 'Import started: Workday', [T('AppInstance', 'Workday', 'workday')], 'SUCCESS')
  L(hoursAgo(19), SYS, 'system.import.user.create', 'Create Okta user (Workday import)', [userT(jordan), T('AppInstance', 'Workday', 'workday')], 'SUCCESS')
  L(hoursAgo(19), SYS, 'group.user_membership.add', 'Add user to group membership', [userT(jordan), T('UserGroup', 'All Employees - Workday', 'okta-g-employees')], 'SUCCESS')
  L(hoursAgo(18.9), SYS, 'system.import.complete', 'Import complete: Workday (1 created, 3 updated)', [T('AppInstance', 'Workday', 'workday')], 'SUCCESS')
  const kevin = users.find((u) => u.id === 'okta-u-kevinbyrne')!
  const grace = users.find((u) => u.id === 'okta-u-grace')!
  L(daysAgo(4, 15, 2), userActor(kevin), 'application.user_membership.add', 'Add user to application membership', [userT(users.find((u) => u.id === 'okta-u-ben')!), appT('powerbi')], 'SUCCESS', kevin)
  L(daysAgo(4, 15, 3), userActor(kevin), 'application.provision.user.push', 'Push new user to external application', [userT(users.find((u) => u.id === 'okta-u-ben')!), appT('powerbi')], 'SUCCESS', kevin)
  L(daysAgo(3, 11, 40), userActor(grace), 'user.mfa.factor.activate', 'Activate factor or authenticator', [userT(grace), T('AuthenticatorEnrollment', 'FIDO2 (WebAuthn)', 'webauthn')], 'SUCCESS', grace)
  L(daysAgo(2, 9, 15), userActor(kevin), 'user.mfa.factor.reset_all', 'Reset all factors for user', [userT(users.find((u) => u.id === 'okta-u-mateoalvarez')!)], 'SUCCESS', kevin)
  L(daysAgo(1, 14, 22), userActor(users.find((u) => u.id === 'okta-u-mateoalvarez')!), 'user.mfa.factor.activate', 'Activate factor or authenticator', [userT(users.find((u) => u.id === 'okta-u-mateoalvarez')!), T('AuthenticatorEnrollment', 'Okta Verify', 'okta_verify')], 'SUCCESS')
  const gh = users.find((u) => u.id === 'okta-u-graceholloway')!
  L(daysAgo(34, 17, 30), SYS, 'user.lifecycle.deactivate', 'Deactivate Okta user', [userT(gh)], 'SUCCESS')
  L(daysAgo(1, 2, 0), OKTA, 'system.agent.ad.connect', 'AD agent connected', [T('AgentPool', 'northwind.local', 'ad')], 'SUCCESS')
  L(hoursAgo(9), userActor(grace), 'policy.lifecycle.update', 'Update policy', [T('PolicyEntity', 'Phishing-resistant MFA for Admins', 'Authentication Policy')], 'SUCCESS', grace)
  L(hoursAgo(3), userActor(alex), 'user.account.update_password', 'User update password for Okta', [userT(alex)], 'SUCCESS', alex)

  logs.sort((a, b) => (a.published < b.published ? 1 : -1))
  logs.forEach((l, i) => (l.id = `okta-log-${String(logs.length - i).padStart(4, '0')}`))

  return {
    'okta.users': users,
    'okta.apps': apps,
    'okta.assignments': assignments,
    'okta.logs': logs,
    'okta.groups': groups,
  }
}
