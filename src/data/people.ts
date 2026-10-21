/**
 * The demo company and its people. Every app uses this shared directory so that the same
 * colleagues show up in Outlook, Teams, Slack, Workday, Salesforce, ServiceNow…
 */
export const COMPANY = {
  name: 'Northwind Global',
  short: 'Northwind',
  domain: 'northwind.com',
  legalEntity: 'Northwind Global Inc.',
  sapCompanyCode: '1010',
  currency: 'USD',
  hq: 'Boston, MA',
}

export interface Person {
  id: string
  name: string
  first: string
  last: string
  email: string
  title: string
  dept: string
  location: string
  phone: string
  managerId?: string
  /** avatar background colour (used for initials avatars) */
  color: string
  employeeId: string
  external?: boolean
  company?: string
}

const mk = (
  id: string,
  first: string,
  last: string,
  title: string,
  dept: string,
  location: string,
  color: string,
  managerId?: string,
  external?: { company: string; domain: string },
): Person => ({
  id,
  first,
  last,
  name: `${first} ${last}`,
  email: `${first}.${last}`.toLowerCase().replace(/[^a-z.]/g, '') + '@' + (external?.domain ?? COMPANY.domain),
  title,
  dept,
  location,
  phone: `+1 (617) 555-0${(100 + id.length * 37 + first.length * 11).toString().slice(-3)}`,
  managerId,
  color,
  employeeId: external ? '' : `E${(21000 + first.charCodeAt(0) * 17 + last.charCodeAt(0) * 3).toString()}`,
  external: !!external,
  company: external?.company ?? COMPANY.name,
})

/** The signed-in user — the person running the demo. */
export const ME = mk('alex', 'Alex', 'Morgan', 'Operations Manager', 'Operations', 'Boston, MA', '#0F6CBD', 'priya')

export const PEOPLE: Person[] = [
  ME,
  mk('priya', 'Priya', 'Raman', 'VP, Operations', 'Operations', 'Boston, MA', '#8764B8', 'david'),
  mk('david', 'David', 'Okafor', 'Chief Operating Officer', 'Executive', 'New York, NY', '#C239B3'),
  mk('sofia', 'Sofia', 'Martinez', 'Finance Manager', 'Finance', 'Boston, MA', '#E3008C', 'marcus'),
  mk('marcus', 'Marcus', 'Lee', 'Chief Financial Officer', 'Finance', 'New York, NY', '#038387', 'david'),
  mk('emma', 'Emma', 'Schultz', 'Accounts Payable Specialist', 'Finance', 'Chicago, IL', '#CA5010', 'sofia'),
  mk('james', 'James', 'Whitaker', 'HR Business Partner', 'People', 'Boston, MA', '#498205', 'nina'),
  mk('nina', 'Nina', 'Patel', 'Chief People Officer', 'People', 'San Francisco, CA', '#986F0B', 'david'),
  mk('oliver', 'Oliver', 'Brooks', 'IT Service Desk Lead', 'IT', 'Austin, TX', '#4F6BED', 'grace'),
  mk('grace', 'Grace', 'Kim', 'Director of IT', 'IT', 'Austin, TX', '#881798', 'david'),
  mk('liam', 'Liam', "O'Connor", 'Account Executive', 'Sales', 'Boston, MA', '#0078D4', 'rachel'),
  mk('rachel', 'Rachel', 'Goldberg', 'VP, Sales', 'Sales', 'New York, NY', '#D13438', 'david'),
  mk('chen', 'Chen', 'Wei', 'Senior Software Engineer', 'Engineering', 'San Francisco, CA', '#00B7C3', 'tom'),
  mk('tom', 'Tom', 'Fischer', 'Engineering Manager', 'Engineering', 'San Francisco, CA', '#5C2E91', 'grace'),
  mk('aisha', 'Aisha', 'Bello', 'Customer Success Manager', 'Customer Success', 'Chicago, IL', '#B146C2', 'rachel'),
  mk('lucas', 'Lucas', 'Moreau', 'Procurement Specialist', 'Finance', 'Chicago, IL', '#7A7574', 'sofia'),
  mk('hannah', 'Hannah', 'Novak', 'Marketing Manager', 'Marketing', 'Boston, MA', '#E81123', 'rachel'),
  mk('ben', 'Ben', 'Carter', 'Operations Analyst', 'Operations', 'Boston, MA', '#107C10', 'alex'),
  mk('maya', 'Maya', 'Johnson', 'Operations Coordinator', 'Operations', 'Boston, MA', '#FF8C00', 'alex'),
  mk('ryan', 'Ryan', 'Tanaka', 'Support Engineer', 'Customer Success', 'Austin, TX', '#2D7D9A', 'aisha'),
  // new hire (shows up in onboarding workflows)
  mk('jordan', 'Jordan', 'Ellis', 'Operations Analyst (starting Monday)', 'Operations', 'Boston, MA', '#69797E', 'alex'),
  // external contacts
  mk('kate', 'Kate', 'Sullivan', 'Procurement Director', 'Procurement', 'Seattle, WA', '#0099BC', undefined, { company: 'Contoso Ltd', domain: 'contoso.com' }),
  mk('mike', 'Mike', 'Harrington', 'Accounts Receivable', 'Finance', 'Dallas, TX', '#8E8CD8', undefined, { company: 'Fabrikam Supplies', domain: 'fabrikam.com' }),
  mk('elena', 'Elena', 'Rossi', 'Head of Operations', 'Operations', 'Milan, IT', '#00CC6A', undefined, { company: 'Adatum Corporation', domain: 'adatum.com' }),
  mk('sam', 'Sam', 'Patel', 'Billing', 'Finance', 'Denver, CO', '#567C73', undefined, { company: 'Litware Inc.', domain: 'litware.com' }),
]

export const person = (id: string): Person => PEOPLE.find((p) => p.id === id) ?? ME
export const personByEmail = (email: string): Person | undefined =>
  PEOPLE.find((p) => p.email.toLowerCase() === email.toLowerCase())
export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('')
