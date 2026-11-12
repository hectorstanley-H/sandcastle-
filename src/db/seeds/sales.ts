/**
 * Sales group seed: Salesforce, HubSpot, Zoom, Tableau.
 *
 * salesforce.accounts:      { id, name, type, industry, phone, website, city, state, country, employees, annualRevenue, ownerId, rating, accountNumber, site, description, createdDate }
 * salesforce.contacts:      { id, accountId, firstName, lastName, name, title, email, phone, mobile, city, ownerId, leadSource, personId? }
 * salesforce.opportunities: { id, name, accountId, amount, stage, closeDate (YYYY-MM-DD), probability, type, leadSource, ownerId, nextStep, description,
 *                             forecastCategory, seats, pricePerSeat, contractTerm, contractStart, primaryContactId, competitor, createdDate, lastModified,
 *                             updatedBy?: 'hworker', products: {name, code, qty, price}[], contactRoles: {contactId, role, primary}[],
 *                             quotes: {id, name, status, total, expires}[], files: {name, kind, size, date}[], stageHistory: {stage, date, by}[] }
 * salesforce.leads:         { id, firstName, lastName, name, company, title, email, phone, status, leadSource, rating, industry, city, state, ownerId, createdDate, employees, convertedOpportunityId? }
 * salesforce.activities:    { id, type: 'call'|'email'|'event', whatId, whoId?, subject, description, date, ownerId, createdBy? }
 * salesforce.tasks:         { id, subject, whatId?, whoId?, dueDate, status, priority, ownerId, description?, createdBy?, createdDate }
 * salesforce.chatter:       { id, parentId, authorId, body, date, likes: string[], comments: { authorId, body, date }[], createdBy? }
 * hubspot.contacts / companies / deals / lists / sequences, zoom.meetings / recordings / chats, tableau.workbooks
 */
import type { Collections } from '../db'
import { person } from '@/data/people'
import { daysAgo, daysFromNow, hoursAgo, isoDate, minutesAgo, today } from '@/data/time'

/* ───────────────────────── ids used by workflows ───────────────────────── */
export const SF_IDS = {
  OPP_ADATUM: '006Hs00001Q7aDtIAJ',
  OPP_CONTOSO: '006Hs00001Q7cNtIAJ',
  ACC_ADATUM: '001Hs00002AdT8mIAF',
  ACC_CONTOSO: '001Hs00002CnT5oIAF',
  CON_ELENA: '003Hs00003eLrSsIAJ',
  CON_MARCO: '003Hs00003mBcHiIAJ',
  CON_KATE: '003Hs00003kSuLlIAJ',
}
export const HS_IDS = {
  SEQ_WEBINAR: 'seq-webinar-nurture',
  WEBINAR: 'AI-Powered Operations Summit 2026 (Oct 14)',
}
export const ZOOM_IDS = { REC_CONTOSO_QBR: 'zr-contoso-qbr' }

/** deterministic Salesforce-looking id */
const sfid = (prefix: string, n: number) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz0123456789'
  let s = ''
  let x = n * 7919 + 104729
  for (let i = 0; i < 6; i++) {
    s += chars[x % chars.length]
    x = Math.floor(x / chars.length) + i * 31 + n
  }
  return `${prefix}Hs0000${(n % 9) + 1}${s}IA${'ABCDEFGHJ'[n % 9]}`
}

export const STAGES = [
  'Prospecting',
  'Qualification',
  'Needs Analysis',
  'Value Proposition',
  'Id. Decision Makers',
  'Perception Analysis',
  'Proposal/Price Quote',
  'Negotiation/Review',
  'Closed Won',
  'Closed Lost',
]
export const STAGE_PROB: Record<string, number> = {
  Prospecting: 10,
  Qualification: 10,
  'Needs Analysis': 20,
  'Value Proposition': 50,
  'Id. Decision Makers': 60,
  'Perception Analysis': 70,
  'Proposal/Price Quote': 75,
  'Negotiation/Review': 90,
  'Closed Won': 100,
  'Closed Lost': 0,
}
export const forecastFor = (stage: string) =>
  stage === 'Closed Won' ? 'Closed' : stage === 'Closed Lost' ? 'Omitted' : stage === 'Negotiation/Review' ? 'Commit' : stage === 'Proposal/Price Quote' || stage === 'Perception Analysis' ? 'Best Case' : 'Pipeline'

const d = (iso: string) => isoDate(iso)

export function seed(): Collections {
  /* ───────────────────────── Salesforce accounts ───────────────────────── */
  const A: [string, string, string, string, string, string, number, number, string, string][] = [
    // id, name, type, industry, city, state/country, employees, revenue, owner, website
    [SF_IDS.ACC_CONTOSO, 'Contoso Ltd', 'Customer - Direct', 'Technology', 'Seattle', 'WA', 12400, 2_400_000_000, 'alex', 'www.contoso.com'],
    [SF_IDS.ACC_ADATUM, 'Adatum Corporation', 'Prospect', 'Manufacturing', 'Milan', 'Italy', 3800, 910_000_000, 'alex', 'www.adatum.com'],
    [sfid('001', 3), 'Fabrikam, Inc.', 'Customer - Direct', 'Manufacturing', 'Dallas', 'TX', 6200, 1_300_000_000, 'liam', 'www.fabrikam.com'],
    [sfid('001', 4), 'Litware, Inc.', 'Customer - Channel', 'Technology', 'Denver', 'CO', 940, 210_000_000, 'liam', 'www.litware.com'],
    [sfid('001', 5), 'Tailspin Toys', 'Prospect', 'Retail', 'Portland', 'OR', 2100, 480_000_000, 'liam', 'www.tailspintoys.com'],
    [sfid('001', 6), 'Wide World Importers', 'Customer - Direct', 'Transportation', 'Rotterdam', 'Netherlands', 8700, 1_900_000_000, 'rachel', 'www.wideworldimporters.com'],
    [sfid('001', 7), 'Alpine Ski House', 'Prospect', 'Hospitality', 'Denver', 'CO', 640, 95_000_000, 'aisha', 'www.alpineskihouse.com'],
    [sfid('001', 8), 'Woodgrove Bank', 'Customer - Direct', 'Banking', 'New York', 'NY', 21000, 6_800_000_000, 'rachel', 'www.woodgrovebank.com'],
    [sfid('001', 9), 'Proseware, Inc.', 'Prospect', 'Technology', 'Austin', 'TX', 1150, 260_000_000, 'liam', 'www.proseware.com'],
    [sfid('001', 10), 'Coho Winery', 'Customer - Channel', 'Food & Beverage', 'Napa', 'CA', 320, 64_000_000, 'aisha', 'www.cohowinery.com'],
    [sfid('001', 11), 'Lucerne Publishing', 'Customer - Direct', 'Media', 'Boston', 'MA', 1800, 390_000_000, 'alex', 'www.lucernepublishing.com'],
    [sfid('001', 12), 'Fourth Coffee', 'Prospect', 'Food & Beverage', 'Seattle', 'WA', 4300, 720_000_000, 'liam', 'www.fourthcoffee.com'],
    [sfid('001', 13), "Margie's Travel", 'Customer - Direct', 'Hospitality', 'Chicago', 'IL', 1250, 180_000_000, 'aisha', 'www.margiestravel.com'],
    [sfid('001', 14), 'Blue Yonder Airlines', 'Prospect', 'Transportation', 'Atlanta', 'GA', 14800, 3_900_000_000, 'rachel', 'www.blueyonderairlines.com'],
    [sfid('001', 15), 'Trey Research', 'Customer - Direct', 'Healthcare', 'San Diego', 'CA', 2700, 540_000_000, 'liam', 'www.treyresearch.net'],
    [sfid('001', 16), 'Relecloud', 'Prospect', 'Technology', 'San Francisco', 'CA', 980, 150_000_000, 'alex', 'www.relecloud.com'],
    [sfid('001', 17), 'VanArsdel, Ltd.', 'Customer - Direct', 'Retail', 'Toronto', 'Canada', 5600, 1_100_000_000, 'rachel', 'www.vanarsdel.com'],
    [sfid('001', 18), 'Wingtip Toys', 'Prospect', 'Retail', 'Minneapolis', 'MN', 760, 120_000_000, 'aisha', 'www.wingtiptoys.com'],
    [sfid('001', 19), 'Humongous Insurance', 'Customer - Direct', 'Insurance', 'Hartford', 'CT', 9800, 4_200_000_000, 'liam', 'www.humongousinsurance.com'],
    [sfid('001', 20), 'Southridge Video', 'Prospect', 'Media', 'Los Angeles', 'CA', 540, 88_000_000, 'alex', 'www.southridgevideo.com'],
  ]
  const accounts = A.map(([id, name, type, industry, city, st, employees, annualRevenue, ownerId, website], i) => ({
    id,
    name,
    type,
    industry,
    city,
    state: st.length === 2 ? st : '',
    country: st.length === 2 ? (st === 'Canada' ? 'Canada' : 'United States') : st,
    employees,
    annualRevenue,
    ownerId,
    website,
    phone: `(${200 + ((i * 37) % 700)}) 555-${String(1000 + i * 271).slice(-4)}`,
    rating: i % 3 === 0 ? 'Hot' : i % 3 === 1 ? 'Warm' : 'Cold',
    accountNumber: `CD${(655000 + i * 1373).toString()}`,
    site: i % 2 ? 'Headquarters' : 'HQ',
    description:
      id === SF_IDS.ACC_ADATUM
        ? 'European manufacturer (industrial components). Sites in Milan (HQ) and Rotterdam. Evaluating Ops Cloud to replace spreadsheets + legacy MES reporting.'
        : id === SF_IDS.ACC_CONTOSO
          ? 'Strategic customer since 2021. 400 seats of Ops Cloud Enterprise across NA + EMEA. Exec sponsor: Kate Sullivan (Procurement).'
          : `${name} — ${industry.toLowerCase()} company headquartered in ${city}.`,
    createdDate: daysAgo(400 - i * 13),
  }))
  const acc = (name: string) => accounts.find((a) => a.name.startsWith(name))!.id

  /* ───────────────────────── Salesforce contacts ───────────────────────── */
  const C: [string, string, string, string, string, string?][] = [
    // id, first, last, title, account, personId
    [SF_IDS.CON_KATE, 'Kate', 'Sullivan', 'Procurement Director', 'Contoso', 'kate'],
    [sfid('003', 2), 'Daniel', 'Reyes', 'VP, IT Operations', 'Contoso'],
    [sfid('003', 3), 'Priyanka', 'Shah', 'Sr. Manager, Supply Chain', 'Contoso'],
    [SF_IDS.CON_ELENA, 'Elena', 'Rossi', 'Head of Operations', 'Adatum', 'elena'],
    [SF_IDS.CON_MARCO, 'Marco', 'Bianchi', 'Chief Information Officer', 'Adatum'],
    [sfid('003', 6), 'Sanne', 'de Vries', 'Site Director, Rotterdam', 'Adatum'],
    [sfid('003', 7), 'Mike', 'Harrington', 'Accounts Receivable', 'Fabrikam', 'mike'],
    [sfid('003', 8), 'Laura', 'Chen', 'COO', 'Fabrikam'],
    [sfid('003', 9), 'Sam', 'Patel', 'Billing', 'Litware', 'sam'],
    [sfid('003', 10), 'Jonas', 'Weber', 'Director of Engineering', 'Litware'],
    [sfid('003', 11), 'Olivia', 'Grant', 'Head of Store Ops', 'Tailspin'],
    [sfid('003', 12), 'Henrik', 'Larsen', 'Logistics Director', 'Wide World'],
    [sfid('003', 13), 'Fatima', 'Haddad', 'VP Procurement', 'Wide World'],
    [sfid('003', 14), 'Tyler', 'Brooks', 'General Manager', 'Alpine'],
    [sfid('003', 15), 'Rebecca', 'Stone', 'SVP Operations', 'Woodgrove'],
    [sfid('003', 16), 'Arjun', 'Mehta', 'CTO', 'Proseware'],
    [sfid('003', 17), 'Clara', 'Dubois', 'Operations Manager', 'Coho'],
    [sfid('003', 18), 'Nathan', 'Price', 'Managing Editor', 'Lucerne'],
    [sfid('003', 19), 'Grace', 'Holloway', 'Director, Retail Ops', 'Fourth Coffee'],
    [sfid('003', 20), 'Diego', 'Alvarez', 'Head of Partnerships', "Margie's"],
    [sfid('003', 21), 'Aiko', 'Tanaka', 'VP Ground Operations', 'Blue Yonder'],
    [sfid('003', 22), 'Victor', 'Osei', 'Lab Operations Lead', 'Trey'],
    [sfid('003', 23), 'Hailey', 'Morgan', 'Head of RevOps', 'Relecloud'],
    [sfid('003', 24), 'Paul', 'Lefebvre', 'Director, Fulfilment', 'VanArsdel'],
    [sfid('003', 25), 'Megan', 'Fox', 'Operations Analyst', 'Wingtip'],
    [sfid('003', 26), 'Robert', 'King', 'VP Claims Operations', 'Humongous'],
    [sfid('003', 27), 'Isabel', 'Cruz', 'Production Director', 'Southridge'],
    [sfid('003', 28), 'Ethan', 'Wright', 'IT Director', 'Woodgrove'],
  ]
  const accDomain = (accId: string) => accounts.find((a) => a.id === accId)!.website.replace('www.', '')
  const contacts = C.map(([id, first, last, title, accName, personId], i) => {
    const accountId = acc(accName)
    const p = personId ? person(personId) : null
    return {
      id,
      accountId,
      firstName: first,
      lastName: last,
      name: `${first} ${last}`,
      title,
      email: p?.email ?? `${first}.${last}`.toLowerCase().replace(/[^a-z.]/g, '') + '@' + accDomain(accountId),
      phone: `(${300 + ((i * 53) % 600)}) 555-${String(2000 + i * 317).slice(-4)}`,
      mobile: `(${400 + ((i * 29) % 500)}) 555-${String(3000 + i * 211).slice(-4)}`,
      city: accounts.find((a) => a.id === accountId)!.city,
      ownerId: accounts.find((a) => a.id === accountId)!.ownerId,
      leadSource: ['Web', 'Partner Referral', 'Trade Show', 'Webinar', 'Outbound'][i % 5],
      personId,
      createdDate: daysAgo(300 - i * 7),
    }
  })
  const con = (first: string, last: string) => contacts.find((c) => c.firstName === first && c.lastName === last)!.id

  /* ───────────────────────── Salesforce opportunities ───────────────────────── */
  const ENT = { name: 'Ops Cloud Enterprise (per seat / yr)', code: 'OC-ENT-1Y' }
  const PRO = { name: 'Ops Cloud Professional (per seat / yr)', code: 'OC-PRO-1Y' }
  const PREM = { name: 'Premier Success Plan', code: 'SUP-PREM' }
  const IMPL = { name: 'Implementation Services (fixed fee)', code: 'PS-IMPL' }

  type O = [string, string, string, number, string, number, string, string, string, number?]
  // id, account, name suffix, amount, stage, closeInDays, type, owner, leadSource, seats
  const O_: O[] = [
    [SF_IDS.OPP_CONTOSO, 'Contoso', 'Renewal FY27 (3-yr)', 1_120_000, 'Negotiation/Review', 9, 'Existing Business - Renewal', 'alex', 'Existing Customer', 400],
    [SF_IDS.OPP_ADATUM, 'Adatum', 'Ops Cloud Enterprise', 150_000, 'Qualification', 24, 'New Business', 'alex', 'Webinar', 200],
    [sfid('006', 3), 'Fabrikam', 'Expansion - Plant Ops', 312_000, 'Proposal/Price Quote', 18, 'Existing Business - Upgrade', 'liam', 'Existing Customer', 420],
    [sfid('006', 4), 'Litware', 'Professional to Enterprise Upgrade', 86_400, 'Value Proposition', 33, 'Existing Business - Upgrade', 'liam', 'Partner Referral', 120],
    [sfid('006', 5), 'Tailspin', 'Store Operations Pilot', 64_800, 'Needs Analysis', 41, 'New Business', 'liam', 'Trade Show', 90],
    [sfid('006', 6), 'Wide World', 'Global Logistics Rollout', 845_000, 'Id. Decision Makers', 52, 'New Business', 'rachel', 'Outbound', 1050],
    [sfid('006', 7), 'Alpine', 'Resort Ops Starter', 28_800, 'Prospecting', 60, 'New Business', 'aisha', 'Web', 60],
    [sfid('006', 8), 'Woodgrove', 'Back-office Automation', 1_480_000, 'Perception Analysis', 38, 'Existing Business - Upgrade', 'rachel', 'Existing Customer', 1800],
    [sfid('006', 9), 'Proseware', 'Engineering Ops', 118_000, 'Needs Analysis', 47, 'New Business', 'liam', 'Webinar', 150],
    [sfid('006', 10), 'Coho', 'Renewal FY27', 38_400, 'Closed Won', -12, 'Existing Business - Renewal', 'aisha', 'Existing Customer', 80],
    [sfid('006', 11), 'Lucerne', 'Editorial Workflow Add-on', 72_000, 'Closed Won', -26, 'Existing Business - Upgrade', 'alex', 'Existing Customer', 100],
    [sfid('006', 12), 'Fourth Coffee', 'Retail Ops Platform', 268_000, 'Proposal/Price Quote', 27, 'New Business', 'liam', 'Partner Referral', 360],
    [sfid('006', 13), "Margie's", 'Agent Desk Rollout', 96_000, 'Closed Won', -40, 'New Business', 'aisha', 'Web', 160],
    [sfid('006', 14), 'Blue Yonder', 'Ground Ops Transformation', 1_950_000, 'Qualification', 95, 'New Business', 'rachel', 'Outbound', 2600],
    [sfid('006', 15), 'Trey', 'Lab Ops Renewal', 182_000, 'Negotiation/Review', 14, 'Existing Business - Renewal', 'liam', 'Existing Customer', 240],
    [sfid('006', 16), 'Relecloud', 'RevOps Automation', 54_000, 'Prospecting', 70, 'New Business', 'alex', 'Web', 75],
    [sfid('006', 17), 'VanArsdel', 'Fulfilment Centers Phase 2', 410_000, 'Value Proposition', 44, 'Existing Business - Upgrade', 'rachel', 'Existing Customer', 550],
    [sfid('006', 18), 'Wingtip', 'Seasonal Ops Pilot', 22_000, 'Closed Lost', -18, 'New Business', 'aisha', 'Trade Show', 40],
    [sfid('006', 19), 'Humongous', 'Claims Ops Renewal', 640_000, 'Closed Won', -55, 'Existing Business - Renewal', 'liam', 'Existing Customer', 860],
    [sfid('006', 20), 'Southridge', 'Production Scheduling', 47_500, 'Needs Analysis', 58, 'New Business', 'alex', 'Webinar', 65],
    [sfid('006', 21), 'Fabrikam', 'Premier Success Upgrade', 48_000, 'Closed Won', -8, 'Existing Business - Upgrade', 'liam', 'Existing Customer'],
    [sfid('006', 22), 'Woodgrove', 'EMEA Expansion', 520_000, 'Prospecting', 120, 'Existing Business - Upgrade', 'rachel', 'Existing Customer', 700],
    [sfid('006', 23), 'Contoso', 'APAC Add-on Seats', 89_280, 'Value Proposition', 66, 'Existing Business - Upgrade', 'alex', 'Existing Customer', 120],
    [sfid('006', 24), 'Litware', 'Renewal FY26', 74_400, 'Closed Won', -70, 'Existing Business - Renewal', 'liam', 'Existing Customer', 100],
    [sfid('006', 25), 'Tailspin', 'Distribution Center Ops', 156_000, 'Closed Lost', -33, 'New Business', 'liam', 'Outbound', 210],
    [sfid('006', 26), 'Wide World', 'Customs Desk Add-on', 66_000, 'Proposal/Price Quote', 21, 'Existing Business - Upgrade', 'rachel', 'Existing Customer', 90],
    [sfid('006', 27), 'Alpine', 'Ski Patrol Scheduling', 12_000, 'Closed Won', -15, 'New Business', 'aisha', 'Web', 20],
    [sfid('006', 28), 'Trey', 'Clinical Ops Expansion', 228_000, 'Id. Decision Makers', 49, 'Existing Business - Upgrade', 'liam', 'Existing Customer', 300],
    [sfid('006', 29), 'Proseware', 'Implementation Services', 35_000, 'Perception Analysis', 36, 'New Business', 'liam', 'Webinar'],
    [sfid('006', 30), 'Humongous', 'Underwriting Ops', 372_000, 'Needs Analysis', 81, 'Existing Business - Upgrade', 'liam', 'Existing Customer', 500],
    [sfid('006', 31), 'Lucerne', 'Renewal FY27', 133_920, 'Negotiation/Review', 29, 'Existing Business - Renewal', 'alex', 'Existing Customer', 180],
    [sfid('006', 32), "Margie's", 'Partner Portal', 41_000, 'Qualification', 63, 'Existing Business - Upgrade', 'aisha', 'Existing Customer'],
    [sfid('006', 33), 'VanArsdel', 'Renewal FY26', 297_600, 'Closed Won', -48, 'Existing Business - Renewal', 'rachel', 'Existing Customer', 400],
    [sfid('006', 34), 'Fourth Coffee', 'Roastery Pilot', 18_600, 'Closed Lost', -61, 'New Business', 'liam', 'Trade Show', 25],
    [sfid('006', 35), 'Blue Yonder', 'Crew Scheduling POC', 60_000, 'Value Proposition', 34, 'New Business', 'rachel', 'Outbound'],
  ]
  const primaryContact = (accountId: string) => contacts.find((c) => c.accountId === accountId)?.id
  const opportunities = O_.map(([id, accName, suffix, amount, stage, closeIn, type, ownerId, leadSource, seats], i) => {
    const accountId = acc(accName)
    const accRec = accounts.find((a) => a.id === accountId)!
    const closeDate = d(daysFromNow(closeIn))
    let products: any[] = []
    if (id === SF_IDS.OPP_CONTOSO) products = [{ ...ENT, name: 'Ops Cloud Enterprise (3-yr term, per seat)', qty: 400, price: 2400 }, { ...PREM, name: 'Premier Success Plan (3-yr)', qty: 1, price: 160_000 }]
    else if (id === SF_IDS.OPP_ADATUM) products = [{ ...ENT, qty: 200, price: 750 }]
    else if (seats) {
      const isPro = amount / seats < 600
      const unit = Math.round(amount / seats)
      products = [{ ...(isPro ? PRO : ENT), qty: seats, price: unit }]
    } else products = [{ ...(suffix.includes('Implementation') ? IMPL : PREM), qty: 1, price: amount }]
    const createdDaysAgo = 30 + ((i * 17) % 120)
    const stageIdx = STAGES.indexOf(stage)
    const stageHistory = STAGES.slice(0, Math.max(1, Math.min(stageIdx + 1, 8)))
      .map((s, k) => ({ stage: s, date: daysAgo(createdDaysAgo - k * 6), by: ownerId }))
      .concat(stage.startsWith('Closed') ? [{ stage, date: daysAgo(Math.max(1, -closeIn)), by: ownerId }] : [])
    return {
      id,
      name: `${accRec.name} - ${suffix}`,
      accountId,
      amount,
      stage,
      closeDate,
      probability: STAGE_PROB[stage],
      type,
      leadSource,
      ownerId,
      forecastCategory: forecastFor(stage),
      seats: seats ?? null,
      pricePerSeat: seats ? Math.round(amount / seats) : null,
      contractTerm: type.includes('Renewal') ? 36 : 12,
      contractStart: stage === 'Closed Won' ? closeDate : '',
      primaryContactId: primaryContact(accountId),
      competitor: ['ServiceTitan', 'Monday.com', 'In-house build', 'Smartsheet', 'None'][i % 5],
      nextStep:
        id === SF_IDS.OPP_CONTOSO
          ? 'Send order form via Docusign; legal redlines closed'
          : id === SF_IDS.OPP_ADATUM
            ? 'Ops walkthrough with Elena + team'
            : stage.startsWith('Closed')
              ? ''
              : ['Schedule exec sponsor call', 'Send revised proposal', 'Security review with IT', 'Pilot success criteria', 'Pricing approval from Rachel'][i % 5],
      description:
        id === SF_IDS.OPP_CONTOSO
          ? '3-year renewal of 400 Enterprise seats + Premier Success. Customer asked for price lock and multi-year term. Order form v3 approved by Deal Desk.'
          : id === SF_IDS.OPP_ADATUM
            ? 'Inbound from the Q3 webinar. Adatum runs plant operations on spreadsheets and a legacy MES. Initial scope: Milan HQ, then Rotterdam. Champion: Elena Rossi.'
            : `${suffix} for ${accRec.name}.`,
      createdDate: daysAgo(createdDaysAgo),
      lastModified: id === SF_IDS.OPP_ADATUM ? daysAgo(6, 15, 20) : id === SF_IDS.OPP_CONTOSO ? daysAgo(1, 16, 5) : daysAgo((i * 3) % 20, 10 + (i % 7), 15),
      products,
      contactRoles: contacts
        .filter((c) => c.accountId === accountId)
        .slice(0, 3)
        .map((c, k) => ({ contactId: c.id, role: k === 0 ? (c.title.includes('Chief') ? 'Economic Decision Maker' : 'Business User') : ['Technical Buyer', 'Evaluator', 'Influencer'][k % 3], primary: k === 0 })),
      quotes:
        id === SF_IDS.OPP_CONTOSO
          ? [
              { id: 'Q-00218', name: 'Contoso Renewal FY27 — v3 (approved)', status: 'Approved', total: 1_120_000, expires: d(daysFromNow(21)) },
              { id: 'Q-00204', name: 'Contoso Renewal FY27 — v2', status: 'Rejected', total: 1_184_000, expires: d(daysAgo(10)) },
            ]
          : stageIdx >= 6 && stageIdx < 8
            ? [{ id: `Q-00${150 + i}`, name: `${accRec.name} — Proposal v1`, status: 'Presented', total: amount, expires: d(daysFromNow(30)) }]
            : [],
      files:
        id === SF_IDS.OPP_CONTOSO
          ? [
              { name: 'Contoso_OrderForm_FY27_v3.pdf', kind: 'pdf', size: '412 KB', date: daysAgo(2, 14, 0) },
              { name: 'Contoso MSA - Redline.pdf', kind: 'pdf', size: '1.1 MB', date: daysAgo(3, 15, 40) },
              { name: 'Contoso_QBR_Q3.pptx', kind: 'pptx', size: '6.4 MB', date: daysAgo(20, 9, 0) },
            ]
          : id === SF_IDS.OPP_ADATUM
            ? [{ name: 'Adatum_Discovery_Notes.docx', kind: 'docx', size: '64 KB', date: daysAgo(9, 11, 0) }]
            : i % 3 === 0
              ? [{ name: `${accRec.name.split(/[ ,]/)[0]}_Proposal.pdf`, kind: 'pdf', size: '820 KB', date: daysAgo(i % 15) }]
              : [],
      stageHistory,
    }
  })

  /* ───────────────────────── Salesforce leads ───────────────────────── */
  const L: [string, string, string, string, string, string, string][] = [
    ['Hannah', 'Becker', 'Bellows College', 'Director of Facilities', 'Open - Not Contacted', 'Webinar', 'Education'],
    ['Omar', 'Farouk', 'Northwind Traders', 'Supply Chain Manager', 'Working - Contacted', 'Web', 'Retail'],
    ['Lena', 'Kowalski', 'Graphic Design Institute', 'Operations Lead', 'Open - Not Contacted', 'Webinar', 'Education'],
    ['Carlos', 'Mendes', 'First Up Consultants', 'Managing Partner', 'Working - Contacted', 'Partner Referral', 'Consulting'],
    ['Sophie', 'Laurent', 'Datum Logistics', 'VP Operations', 'Open - Not Contacted', 'Trade Show', 'Transportation'],
    ['Kevin', 'Ng', 'A. Datum Robotics', 'Head of Manufacturing', 'Working - Contacted', 'Webinar', 'Manufacturing'],
    ['Amelia', 'Ward', 'School of Fine Art', 'Facilities Manager', 'Closed - Not Converted', 'Web', 'Education'],
    ['Jasper', 'Holt', 'Consolidated Messenger', 'Fleet Director', 'Open - Not Contacted', 'Outbound', 'Transportation'],
    ['Nora', 'Ibrahim', 'Contoso Pharmaceuticals', 'Lab Operations Director', 'Working - Contacted', 'Webinar', 'Healthcare'],
    ['Lucas', 'Silva', 'Tailwind Traders', 'COO', 'Open - Not Contacted', 'Web', 'Retail'],
    ['Emily', 'Carter', 'Munson’s Pickles and Preserves', 'Plant Manager', 'Working - Contacted', 'Trade Show', 'Food & Beverage'],
    ['Ravi', 'Kapoor', 'Woodgrove Insurance', 'Claims Ops Manager', 'Open - Not Contacted', 'Partner Referral', 'Insurance'],
    ['Isla', 'Murphy', 'Lamna Healthcare', 'Director, Patient Ops', 'Working - Contacted', 'Webinar', 'Healthcare'],
    ['Felix', 'Wagner', 'Fabrikam Residences', 'Property Ops Lead', 'Open - Not Contacted', 'Web', 'Real Estate'],
    ['Chloe', 'Bennett', 'Adventure Works Cycles', 'VP Supply Chain', 'Working - Contacted', 'Outbound', 'Manufacturing'],
    ['Mateo', 'Rossi', 'Liberty Delightful Sinful Bakery', 'Owner', 'Closed - Not Converted', 'Web', 'Food & Beverage'],
    ['Zara', 'Hughes', 'City Power & Light', 'Field Ops Director', 'Open - Not Contacted', 'Trade Show', 'Utilities'],
    ['Theo', 'Martin', 'Nod Publishers', 'Operations Manager', 'Working - Contacted', 'Webinar', 'Media'],
  ]
  const leads = L.map(([first, last, company, title, status, leadSource, industry], i) => ({
    id: sfid('00Q', i + 1),
    firstName: first,
    lastName: last,
    name: `${first} ${last}`,
    company,
    title,
    email: `${first}.${last}`.toLowerCase() + '@' + company.toLowerCase().replace(/[^a-z]/g, '').slice(0, 14) + '.com',
    phone: `(${250 + ((i * 41) % 600)}) 555-${String(4000 + i * 233).slice(-4)}`,
    status,
    leadSource,
    rating: ['Hot', 'Warm', 'Cold'][i % 3],
    industry,
    city: ['Boston', 'Chicago', 'Austin', 'Denver', 'Seattle', 'Atlanta'][i % 6],
    state: ['MA', 'IL', 'TX', 'CO', 'WA', 'GA'][i % 6],
    ownerId: ['alex', 'liam', 'aisha', 'liam'][i % 4],
    employees: 200 + ((i * 397) % 5000),
    createdDate: daysAgo(1 + i * 2, 9 + (i % 8), 10),
    description: leadSource === 'Webinar' ? 'Attended the AI-Powered Operations webinar; asked about pricing for multi-site rollout.' : '',
  }))

  /* ───────────────────────── activities, tasks, chatter ───────────────────────── */
  const activities = [
    { id: 'sfa-1', type: 'email', whatId: SF_IDS.OPP_ADATUM, whoId: SF_IDS.CON_ELENA, subject: 'Email: Agenda for the operations walkthrough', description: 'Hi Elena — sharing the agenda for our walkthrough: 1) plant ops dashboards 2) work orders 3) integrations with your MES. Talk soon, Alex', date: daysAgo(2, 15, 12), ownerId: 'alex' },
    { id: 'sfa-2', type: 'call', whatId: SF_IDS.OPP_ADATUM, whoId: SF_IDS.CON_ELENA, subject: 'Discovery call', description: 'Elena runs ops for Milan + Rotterdam (~250 users). Pain: weekly reporting takes 2 days in Excel, no single view of work orders. Budget owner is Marco (CIO). Timeline: decision by end of month.', date: daysAgo(9, 11, 0), ownerId: 'alex' },
    { id: 'sfa-3', type: 'event', whatId: SF_IDS.OPP_ADATUM, whoId: SF_IDS.CON_ELENA, subject: 'Adatum — operations walkthrough', description: 'Microsoft Teams Meeting', date: today(10, 0), ownerId: 'alex' },
    { id: 'sfa-4', type: 'email', whatId: SF_IDS.OPP_ADATUM, whoId: SF_IDS.CON_ELENA, subject: 'Email: Thanks for joining the webinar', description: 'Thanks for joining the AI-Powered Operations webinar! Happy to set up a tailored demo.', date: daysAgo(14, 10, 2), ownerId: 'alex' },
    { id: 'sfa-5', type: 'call', whatId: SF_IDS.OPP_CONTOSO, whoId: SF_IDS.CON_KATE, subject: 'Renewal terms — final pricing', description: 'Kate confirmed 3-year term at 400 seats. Asked for price lock (approved by Deal Desk) and Premier Success included. Legal redlines on MSA closed.', date: daysAgo(3, 14, 0), ownerId: 'alex' },
    { id: 'sfa-6', type: 'email', whatId: SF_IDS.OPP_CONTOSO, whoId: SF_IDS.CON_KATE, subject: 'Email: Contoso renewal — order form v3', description: 'Hi Kate, attached is order form v3 reflecting the 3-year term and price lock.', date: daysAgo(2, 14, 5), ownerId: 'alex' },
    { id: 'sfa-7', type: 'event', whatId: SF_IDS.OPP_CONTOSO, whoId: SF_IDS.CON_KATE, subject: 'Contoso QBR (Q3)', description: 'Zoom meeting', date: daysAgo(20, 15, 0), ownerId: 'alex' },
    { id: 'sfa-8', type: 'call', whatId: SF_IDS.OPP_CONTOSO, whoId: sfid('003', 2), subject: 'Usage review with Daniel', description: '392/400 seats active, 98% adoption. Interested in APAC add-on.', date: daysAgo(27, 11, 30), ownerId: 'alex' },
    ...opportunities
      .filter((o) => o.id !== SF_IDS.OPP_ADATUM && o.id !== SF_IDS.OPP_CONTOSO)
      .flatMap((o, i) => [
        { id: `sfa-o${i}a`, type: 'call', whatId: o.id, whoId: o.primaryContactId, subject: ['Check-in call', 'Pricing discussion', 'Technical deep-dive', 'Exec sponsor call'][i % 4], description: 'Discussed timeline and next steps.', date: daysAgo(2 + (i % 12), 10 + (i % 6), 0), ownerId: o.ownerId },
        { id: `sfa-o${i}b`, type: 'email', whatId: o.id, whoId: o.primaryContactId, subject: 'Email: Follow-up and next steps', description: 'Thanks for the time today — recap and next steps attached.', date: daysAgo(5 + (i % 9), 16, 20), ownerId: o.ownerId },
      ]),
  ]

  const tasks = [
    { id: 'sft-1', subject: 'Send MSA redlines to Contoso legal', whatId: SF_IDS.OPP_CONTOSO, whoId: SF_IDS.CON_KATE, dueDate: d(daysAgo(3)), status: 'Completed', priority: 'High', ownerId: 'alex', createdDate: daysAgo(8) },
    { id: 'sft-2', subject: 'Prep walkthrough demo environment (Adatum)', whatId: SF_IDS.OPP_ADATUM, whoId: SF_IDS.CON_ELENA, dueDate: d(daysAgo(1)), status: 'Completed', priority: 'Normal', ownerId: 'alex', createdDate: daysAgo(5) },
    { id: 'sft-3', subject: 'Call Nathan re: Lucerne renewal quote', whatId: opportunities[30].id, whoId: con('Nathan', 'Price'), dueDate: d(today()), status: 'Not Started', priority: 'High', ownerId: 'alex', createdDate: daysAgo(3) },
    { id: 'sft-4', subject: 'Send case study to Relecloud', whatId: opportunities[15].id, whoId: con('Hailey', 'Morgan'), dueDate: d(today()), status: 'Not Started', priority: 'Normal', ownerId: 'alex', createdDate: daysAgo(2) },
    { id: 'sft-5', subject: 'Update APAC seat forecast with Daniel', whatId: opportunities[22].id, whoId: sfid('003', 2), dueDate: d(daysFromNow(2)), status: 'In Progress', priority: 'Normal', ownerId: 'alex', createdDate: daysAgo(4) },
    { id: 'sft-6', subject: 'Follow up: Southridge security questionnaire', whatId: opportunities[19].id, whoId: con('Isabel', 'Cruz'), dueDate: d(daysAgo(2)), status: 'Not Started', priority: 'High', ownerId: 'alex', createdDate: daysAgo(9) },
    { id: 'sft-7', subject: 'Pricing approval for Fabrikam expansion', whatId: opportunities[2].id, dueDate: d(daysFromNow(1)), status: 'Not Started', priority: 'High', ownerId: 'liam', createdDate: daysAgo(2) },
    { id: 'sft-8', subject: 'Send Woodgrove ROI model', whatId: opportunities[7].id, dueDate: d(daysFromNow(3)), status: 'Not Started', priority: 'Normal', ownerId: 'rachel', createdDate: daysAgo(1) },
    { id: 'sft-9', subject: 'QBR deck for Trey Research', whatId: opportunities[14].id, dueDate: d(daysFromNow(4)), status: 'Not Started', priority: 'Normal', ownerId: 'liam', createdDate: daysAgo(3) },
    { id: 'sft-10', subject: 'Call back Alpine GM', whatId: opportunities[6].id, dueDate: d(today()), status: 'Not Started', priority: 'Low', ownerId: 'aisha', createdDate: daysAgo(1) },
  ]

  const chatter = [
    { id: 'sfc-1', parentId: SF_IDS.OPP_CONTOSO, authorId: 'liam', body: 'Legal redlines on the MSA are closed 🎉 Order form v3 is with Kate for final review.', date: daysAgo(2, 16, 40), likes: ['alex', 'rachel'], comments: [{ authorId: 'rachel', body: 'Great work — let’s get this signed before month end.', date: daysAgo(2, 17, 5) }] },
    { id: 'sfc-2', parentId: SF_IDS.OPP_CONTOSO, authorId: 'alex', body: 'Deal Desk approved the price lock for the 3-year term. Premier Success included at $160K.', date: daysAgo(4, 11, 12), likes: ['liam'], comments: [] },
    { id: 'sfc-3', parentId: SF_IDS.OPP_ADATUM, authorId: 'liam', body: 'Elena confirmed the walkthrough for today 10am. Marco (CIO) might join for the last 15 minutes.', date: daysAgo(1, 14, 30), likes: ['alex'], comments: [] },
  ]

  /* ───────────────────────── HubSpot ───────────────────────── */
  const HC: [string, string, string, string, string, string, string | null][] = [
    // first, last, company, title, lifecycle, status, webinar attendance
    ['Nora', 'Ibrahim', 'Contoso Pharmaceuticals', 'Lab Operations Director', 'Marketing Qualified Lead', 'Open', 'Attended'],
    ['Kevin', 'Ng', 'A. Datum Robotics', 'Head of Manufacturing', 'Marketing Qualified Lead', 'In Progress', 'Attended'],
    ['Hannah', 'Becker', 'Bellows College', 'Director of Facilities', 'Lead', 'New', 'Attended'],
    ['Lena', 'Kowalski', 'Graphic Design Institute', 'Operations Lead', 'Lead', 'New', 'Attended'],
    ['Isla', 'Murphy', 'Lamna Healthcare', 'Director, Patient Ops', 'Marketing Qualified Lead', 'Open', 'Attended'],
    ['Theo', 'Martin', 'Nod Publishers', 'Operations Manager', 'Lead', 'New', 'Attended'],
    ['Priscilla', 'Owens', 'Fabrikam Residences', 'VP Property Ops', 'Lead', 'New', 'Attended'],
    ['Marcus', 'Reid', 'Consolidated Messenger', 'Head of Dispatch', 'Lead', 'Attempted to contact', 'Attended'],
    ['Yuki', 'Sato', 'Tailwind Traders', 'Ops Excellence Lead', 'Marketing Qualified Lead', 'New', 'Attended'],
    ['Samuel', 'Okoro', 'City Power & Light', 'Field Ops Manager', 'Lead', 'New', 'Attended'],
    ['Ines', 'Moreno', 'Adventure Works Cycles', 'Supply Chain Analyst', 'Lead', 'New', 'Attended'],
    ['Liam', 'Fraser', 'Munson’s Pickles and Preserves', 'Plant Manager', 'Lead', 'New', 'Attended'],
    ['Ava', 'Thompson', 'Datum Logistics', 'Operations Director', 'Lead', 'New', 'Registered'],
    ['Noah', 'Kim', 'First Up Consultants', 'Senior Consultant', 'Subscriber', 'New', 'Registered'],
    ['Mia', 'Rodriguez', 'Wingtip Toys', 'Store Ops Manager', 'Lead', 'New', 'Registered'],
    ['Elijah', 'Scott', 'School of Fine Art', 'Facilities Coordinator', 'Subscriber', 'New', 'Registered'],
    ['Harper', 'Lewis', 'Lucerne Publishing', 'Production Lead', 'Lead', 'Open', 'Registered'],
    ['Oscar', 'Nilsson', 'Fourth Coffee', 'Regional Ops Manager', 'Lead', 'Connected', null],
    ['Chloe', 'Bennett', 'Adventure Works Cycles', 'VP Supply Chain', 'Sales Qualified Lead', 'Connected', null],
    ['Jack', 'Turner', 'Proseware, Inc.', 'Engineering Manager', 'Opportunity', 'In Progress', null],
    ['Ella', 'Hughes', 'Trey Research', 'Lab Manager', 'Customer', 'Connected', null],
    ['Benjamin', 'Hall', 'Woodgrove Bank', 'Ops Transformation Lead', 'Opportunity', 'In Progress', null],
    ['Scarlett', 'Young', 'VanArsdel, Ltd.', 'Fulfilment Manager', 'Customer', 'Connected', null],
    ['Henry', 'Allen', 'Blue Yonder Airlines', 'Ground Ops Analyst', 'Lead', 'Attempted to contact', null],
    ['Grace', 'Wright', 'Relecloud', 'RevOps Manager', 'Sales Qualified Lead', 'Open', null],
    ['Leo', 'Baker', 'Southridge Video', 'Studio Operations', 'Lead', 'New', null],
    ['Zoe', 'Adams', 'Alpine Ski House', 'Guest Services Director', 'Lead', 'New', null],
    ['Lucas', 'Nelson', 'Margie’s Travel', 'Contact Center Lead', 'Customer', 'Connected', null],
    ['Aria', 'Carter', 'Coho Winery', 'Operations Coordinator', 'Customer', 'Connected', null],
    ['Daniel', 'Reyes', 'Contoso Ltd', 'VP, IT Operations', 'Customer', 'Connected', null],
    ['Elena', 'Rossi', 'Adatum Corporation', 'Head of Operations', 'Opportunity', 'In Progress', 'Attended'],
    ['Sofia', 'Petrova', 'Humongous Insurance', 'Claims Ops Manager', 'Lead', 'New', 'Registered'],
    ['William', 'Foster', 'Litware, Inc.', 'IT Manager', 'Customer', 'Connected', null],
    ['Amara', 'Diallo', 'Lamna Healthcare', 'Nurse Operations Lead', 'Lead', 'New', 'Attended'],
    ['Finn', 'O’Brien', 'Nod Publishers', 'Distribution Manager', 'Subscriber', 'New', 'Registered'],
    ['Layla', 'Hassan', 'Contoso Pharmaceuticals', 'QA Operations', 'Lead', 'New', 'Attended'],
  ]
  const owners = ['hannah', 'liam', 'alex', 'aisha']
  const hsContacts = HC.map(([first, last, company, jobTitle, lifecycleStage, leadStatus, webinar], i) => {
    const domain = company.toLowerCase().replace(/[^a-z]/g, '').slice(0, 14) + '.com'
    const created = daysAgo(3 + ((i * 11) % 90), 9 + (i % 8), (i * 7) % 60)
    const events: any[] = []
    if (webinar === 'Attended')
      events.push({ type: 'webinar', title: `Attended ${HS_IDS.WEBINAR}`, body: `Watched ${35 + ((i * 7) % 25)} of 60 minutes · asked ${i % 3} question${i % 3 === 1 ? '' : 's'} in Q&A`, date: daysAgo(7, 11, 0) })
    if (webinar) events.push({ type: 'form', title: 'Submitted form: Webinar registration — AI-Powered Operations Summit', body: 'Landing page: /webinars/ai-powered-operations-2026', date: daysAgo(15 + (i % 6), 14, 20) })
    events.push({ type: 'email', title: 'Opened marketing email: “October product newsletter”', body: 'Opened 2 times · Clicked “See what’s new in Ops Cloud”', date: daysAgo(9 + (i % 5), 8, 40) })
    events.push({ type: 'page', title: `Viewed ${2 + (i % 6)} pages on northwind.com`, body: '/pricing · /platform/ops-cloud · /customers', date: daysAgo(4 + (i % 9), 13, 5) })
    if (i % 4 === 0) events.push({ type: 'note', title: 'Note by Hannah Novak', body: 'Good fit — multi-site operations, currently on spreadsheets.', date: daysAgo(11, 16, 30) })
    return {
      id: String(51_204_000 + i * 137),
      firstName: first,
      lastName: last,
      email: `${first}.${last}`.toLowerCase().replace(/[^a-z.]/g, '') + '@' + (company.startsWith('Adatum') ? 'adatum.com' : company.startsWith('Contoso Ltd') ? 'contoso.com' : domain),
      phone: `+1 (${300 + ((i * 47) % 600)}) 555-${String(5000 + i * 157).slice(-4)}`,
      company,
      jobTitle,
      lifecycleStage,
      leadStatus,
      ownerId: owners[i % owners.length],
      createDate: created,
      lastActivity: daysAgo((i * 3) % 14, 10, 0),
      city: ['Boston', 'Chicago', 'Austin', 'Denver', 'Seattle', 'Atlanta', 'Toronto', 'London'][i % 8],
      country: i % 8 === 6 ? 'Canada' : i % 8 === 7 ? 'United Kingdom' : 'United States',
      webinar: webinar ? HS_IDS.WEBINAR : null,
      webinarStatus: webinar,
      leadScore: webinar === 'Attended' ? 62 + ((i * 13) % 35) : 18 + ((i * 17) % 50),
      events: events.sort((a, b) => +new Date(b.date) - +new Date(a.date)),
      sequences: [] as string[],
    }
  })
  const hsCompanies = Array.from(new Set(hsContacts.map((c) => c.company))).map((name, i) => ({
    id: String(18_230_000 + i * 91),
    name,
    domain: name.toLowerCase().replace(/[^a-z]/g, '').slice(0, 14) + '.com',
    industry: ['Pharmaceuticals', 'Machinery', 'Higher Education', 'Design', 'Hospital & Health Care', 'Publishing', 'Real Estate', 'Logistics', 'Retail', 'Utilities'][i % 10],
    city: ['Boston', 'Chicago', 'Austin', 'Denver', 'Seattle', 'Atlanta'][i % 6],
    country: 'United States',
    employees: 120 + ((i * 677) % 9000),
    revenue: 10_000_000 + ((i * 7_300_000) % 900_000_000),
    ownerId: owners[i % owners.length],
    lifecycleStage: hsContacts.find((c) => c.company === name)!.lifecycleStage,
    createDate: daysAgo(10 + i * 4),
    lastActivity: daysAgo(i % 12),
  }))
  const DEAL_STAGES = ['Appointment Scheduled', 'Qualified To Buy', 'Presentation Scheduled', 'Decision Maker Bought-In', 'Contract Sent', 'Closed Won', 'Closed Lost']
  const hsDeals = [
    ['Contoso Pharmaceuticals — Lab Ops', 96_000, 1],
    ['A. Datum Robotics — Plant Pilot', 54_000, 2],
    ['Proseware — Engineering Ops', 118_000, 3],
    ['Woodgrove Bank — Back-office', 210_000, 4],
    ['Relecloud — RevOps Automation', 54_000, 1],
    ['Trey Research — Clinical Ops', 228_000, 4],
    ['VanArsdel — Fulfilment Phase 2', 410_000, 3],
    ['Coho Winery — Renewal', 38_400, 5],
    ['Margie’s Travel — Partner Portal', 41_000, 0],
    ['Adventure Works — Supply Chain', 162_000, 2],
    ['Lamna Healthcare — Patient Ops', 88_000, 0],
    ['Blue Yonder — Crew Scheduling POC', 60_000, 1],
    ['Litware — Upgrade', 86_400, 5],
    ['Fourth Coffee — Roastery Pilot', 18_600, 6],
    ['Datum Logistics — Dispatch', 72_000, 0],
    ['Adatum Corporation — Ops Cloud', 150_000, 2],
    ['City Power & Light — Field Ops', 134_000, 1],
    ['Lucerne Publishing — Renewal', 133_920, 4],
  ].map(([name, amount, s], i) => ({
    id: String(9_812_000 + i * 53),
    name,
    amount,
    stage: DEAL_STAGES[s as number],
    pipeline: 'Sales Pipeline',
    closeDate: d(daysFromNow((s as number) >= 5 ? -5 - i : 10 + i * 4)),
    ownerId: owners[i % owners.length],
    companyName: String(name).split(' — ')[0],
    createDate: daysAgo(20 + i * 3),
    priority: ['High', 'Medium', 'Low'][i % 3],
  }))
  const attended = hsContacts.filter((c) => c.webinarStatus === 'Attended' && c.lifecycleStage !== 'Opportunity')
  const hsLists = [
    { id: 'lst-101', name: 'Newsletter subscribers — Ops Weekly', type: 'Active', objectType: 'Contacts', contactIds: hsContacts.filter((_, i) => i % 2 === 0).map((c) => c.id), filters: 'Subscription type is Ops Weekly', ownerId: 'hannah', createdAt: daysAgo(180), updatedAt: daysAgo(1), folder: 'Newsletters' },
    { id: 'lst-102', name: 'Webinar registrants — AI-Powered Ops Summit', type: 'Active', objectType: 'Contacts', contactIds: hsContacts.filter((c) => c.webinarStatus).map((c) => c.id), filters: 'Webinar is any of AI-Powered Operations Summit 2026', ownerId: 'hannah', createdAt: daysAgo(30), updatedAt: daysAgo(7), folder: 'Events' },
    { id: 'lst-103', name: 'MQLs — last 30 days', type: 'Active', objectType: 'Contacts', contactIds: hsContacts.filter((c) => c.lifecycleStage === 'Marketing Qualified Lead').map((c) => c.id), filters: 'Lifecycle stage is MQL and Create date is in last 30 days', ownerId: 'hannah', createdAt: daysAgo(90), updatedAt: hoursAgo(5), folder: 'Lifecycle' },
    { id: 'lst-104', name: 'Customers — NA', type: 'Active', objectType: 'Contacts', contactIds: hsContacts.filter((c) => c.lifecycleStage === 'Customer').map((c) => c.id), filters: 'Lifecycle stage is Customer', ownerId: 'aisha', createdAt: daysAgo(240), updatedAt: daysAgo(2), folder: 'Lifecycle' },
    { id: 'lst-105', name: 'Trade show — OpsWorld Chicago', type: 'Static', objectType: 'Contacts', contactIds: hsContacts.slice(16, 26).map((c) => c.id), filters: 'Imported from OpsWorld_leads.csv', ownerId: 'liam', createdAt: daysAgo(60), updatedAt: daysAgo(60), folder: 'Events' },
    { id: 'lst-106', name: 'Q3 Pricing page visitors', type: 'Active', objectType: 'Contacts', contactIds: hsContacts.slice(3, 15).map((c) => c.id), filters: 'Page view is /pricing in last 90 days', ownerId: 'hannah', createdAt: daysAgo(70), updatedAt: daysAgo(1), folder: 'Web' },
  ]
  const hsSequences = [
    {
      id: HS_IDS.SEQ_WEBINAR,
      name: 'Webinar follow-up — AI-Powered Ops (5 steps)',
      ownerId: 'hannah',
      createdAt: daysAgo(9),
      steps: [
        { type: 'email', day: 1, subject: 'Thanks for joining — slides + recording inside' },
        { type: 'email', day: 3, subject: 'How Contoso cut weekly reporting from 2 days to 20 minutes' },
        { type: 'task', day: 5, subject: 'LinkedIn: connect and comment on their post' },
        { type: 'email', day: 8, subject: 'Quick question about {{company}}’s operations stack' },
        { type: 'call', day: 10, subject: 'Call: offer a 30-minute tailored walkthrough' },
      ],
      enrolled: [] as any[],
      stats: { sent: 0, openRate: 0, replyRate: 0, meetings: 0 },
    },
    { id: 'seq-inbound-demo', name: 'Inbound demo request — fast track', ownerId: 'liam', createdAt: daysAgo(120), steps: [{ type: 'email', day: 1, subject: 'Your Ops Cloud demo' }, { type: 'call', day: 2, subject: 'Call: qualify' }, { type: 'email', day: 4, subject: 'Following up' }], enrolled: hsContacts.slice(18, 24).map((c) => ({ contactId: c.id, at: daysAgo(12), by: 'liam', status: 'Active' })), stats: { sent: 214, openRate: 61, replyRate: 14, meetings: 19 } },
    { id: 'seq-reengage', name: 'Closed lost — 90-day re-engage', ownerId: 'aisha', createdAt: daysAgo(200), steps: [{ type: 'email', day: 1, subject: 'Checking back in' }, { type: 'email', day: 7, subject: 'New: AI Companion for ops' }, { type: 'task', day: 10, subject: 'Call' }], enrolled: hsContacts.slice(26, 29).map((c) => ({ contactId: c.id, at: daysAgo(30), by: 'aisha', status: 'Finished' })), stats: { sent: 88, openRate: 44, replyRate: 6, meetings: 3 } },
    { id: 'seq-mql-nurture', name: 'MQL nurture — operations leaders', ownerId: 'hannah', createdAt: daysAgo(160), steps: [{ type: 'email', day: 1, subject: 'The 2026 Operations Benchmark' }, { type: 'email', day: 5, subject: 'ROI calculator' }, { type: 'email', day: 12, subject: 'Book time with an expert' }], enrolled: hsContacts.slice(0, 3).map((c) => ({ contactId: c.id, at: daysAgo(20), by: 'hannah', status: 'Active' })), stats: { sent: 1240, openRate: 48, replyRate: 5, meetings: 22 } },
    { id: 'seq-renewal', name: 'Renewal — 120 days out', ownerId: 'aisha', createdAt: daysAgo(300), steps: [{ type: 'email', day: 1, subject: 'Your renewal is coming up' }, { type: 'task', day: 3, subject: 'Prep usage report' }, { type: 'call', day: 5, subject: 'Renewal call' }], enrolled: [], stats: { sent: 64, openRate: 72, replyRate: 31, meetings: 12 } },
  ]

  /* ───────────────────────── HubSpot tasks + tickets ───────────────────────── */
  const hc = (i: number) => hsContacts[i % hsContacts.length]
  const hsTasks = [
    ['Call Elena Rossi about Adatum contract redlines', 'Call', 0, 'High', 'alex', 27, 15],
    ['Send ROI calculator to Benjamin Hall', 'Email', 0, 'Medium', 'alex', 18, 15],
    ['Follow up on webinar Q&A questions', 'To-do', 1, 'Medium', 'hannah', 8, 3],
    ['Prep QBR deck for Contoso Ltd', 'To-do', 2, 'High', 'alex', 24, 0],
    ['LinkedIn: connect with Isla Murphy', 'To-do', 3, 'Low', 'liam', 1, 6],
    ['Intro call with Yuki Sato', 'Call', 4, 'Medium', 'liam', 5, 14],
    ['Renewal check-in — Coho Winery', 'Call', 5, 'High', 'aisha', 25, 7],
    ['Send security questionnaire to Woodgrove', 'Email', 6, 'High', 'alex', 19, 1],
    ['Update deal notes after pricing call', 'To-do', -1, 'Low', 'alex', 16, 0],
    ['Book kickoff with Trey Research', 'To-do', 7, 'Medium', 'aisha', 17, 5],
    ['Review lead scoring for webinar attendees', 'To-do', 2, 'Medium', 'hannah', 3, 9],
  ].map(([title, type, due, priority, ownerId, ci, di], i) => ({
    id: `hst-${i + 1}`,
    title,
    type,
    dueDate: daysFromNow(due as number, 10 + (i % 6), 0),
    priority,
    status: (due as number) === -1 && i === 8 ? 'Completed' : 'Not started',
    ownerId,
    contactId: hc(ci as number).id,
    dealId: hsDeals[(di as number) % hsDeals.length].id,
    notes: '',
    createDate: daysAgo(3 + i),
  }))
  const hsTickets = [
    ['Cannot export shift report to PDF', 'Product issue', 'High', 'New', 25, 'Hi team, the PDF export button spins forever for our weekly shift report. Started happening yesterday.'],
    ['Question about SSO setup for new subsidiary', 'Billing & account', 'Medium', 'Waiting on us', 26, 'We are onboarding a subsidiary with its own Okta tenant. Can both tenants map to a single workspace?'],
    ['Invoice shows wrong seat count', 'Billing & account', 'Medium', 'Waiting on contact', 27, 'Our March invoice lists 420 seats; we are contracted for 400.'],
    ['Feature request: bulk reassign tasks', 'Feature request', 'Low', 'New', 22, 'It would save us a lot of time to reassign dozens of tasks at once when someone leaves.'],
    ['APAC data residency question', 'Product question', 'Medium', 'Waiting on us', 25, 'Does the Singapore region support full data residency for our operations data?'],
    ['Login loop on mobile app', 'Product issue', 'High', 'Waiting on us', 23, 'Several of our field staff are stuck in a login loop on Android since the last update.'],
    ['Renewal paperwork — need W-9', 'Billing & account', 'Low', 'Closed', 21, 'Procurement needs an updated W-9 before they can release the renewal PO.'],
    ['Onboarding checklist missing step', 'Product question', 'Low', 'Closed', 28, 'The onboarding checklist skips role setup. Is that intentional?'],
  ].map(([subject, category, priority, status, ci, content], i) => ({
    id: `hstk-${i + 1}`,
    number: 4100 + i * 7,
    subject,
    category,
    priority,
    status,
    contactId: hc(ci as number).id,
    ownerId: owners[(i + 1) % owners.length],
    source: ['Email', 'Chat', 'Form', 'Email'][i % 4],
    createDate: daysAgo(i + 1, 9 + i, 15),
    lastUpdated: hoursAgo(3 + i * 7),
    replies: [
      { kind: 'customer', by: hc(ci as number).id, body: content, date: daysAgo(i + 1, 9 + i, 15) },
      ...(status !== 'New' ? [{ kind: 'reply', by: 'ryan', body: 'Thanks for reaching out — looking into this now and I will get back to you shortly.', date: daysAgo(i, 11, 5) }] : []),
    ],
  }))

  /* ───────────────────────── Zoom ───────────────────────── */
  const P = (id: string) => person(id).email
  const zm = (id: string, topic: string, start: string, durationMins: number, attendees: string[], extra: any = {}) => ({
    id,
    topic,
    start,
    durationMins,
    attendees,
    host: P('alex'),
    meetingNumber: `8${(41_000_000 + id.length * 1_234_567 + topic.length * 98_765).toString().slice(0, 2)} ${(1000 + topic.length * 137).toString().slice(-4)} ${(1000 + durationMins * 77 + topic.charCodeAt(0)).toString().slice(-4)}`,
    passcode: (100000 + topic.length * 7919).toString().slice(-6),
    waitingRoom: true,
    ...extra,
  })
  const zoomMeetings = [
    zm('zm-1', 'Contoso — renewal sign-off', today(15, 0), 30, [P('kate'), P('liam')]),
    zm('zm-2', 'Pipeline review — weekly', businessDaysFrom(1, 10, 0), 45, [P('rachel'), P('liam'), P('aisha')], { recurring: true }),
    zm('zm-3', 'Fabrikam expansion — pricing', businessDaysFrom(1, 13, 30), 30, [P('liam'), P('mike')]),
    zm('zm-4', 'Woodgrove ROI workshop', businessDaysFrom(2, 11, 0), 60, [P('rachel')]),
    zm('zm-5', 'Litware upgrade — technical review', businessDaysFrom(3, 14, 0), 45, [P('liam'), P('sam')]),
    zm('zm-6', 'Marketing × Sales — webinar debrief', businessDaysFrom(4, 9, 30), 30, [P('hannah'), P('rachel')]),
  ]
  const zoomRecordings = [
    {
      id: ZOOM_IDS.REC_CONTOSO_QBR,
      topic: 'Contoso QBR (Q3)',
      date: daysAgo(20, 15, 0),
      duration: '52:14',
      size: '412.6 MB',
      participants: ['Alex Morgan', 'Kate Sullivan', 'Daniel Reyes', 'Liam O’Connor'],
      summary: {
        quick: 'Contoso reviewed Q3 adoption (392 of 400 seats active, 98%). Kate signalled intent to renew for 3 years if pricing is locked. Daniel asked about APAC expansion (~120 seats) for H1.',
        nextSteps: ['Alex to send 3-year renewal proposal with price lock', 'Liam to share APAC rollout plan', 'Daniel to confirm APAC headcount by end of month'],
        sections: [
          ['Adoption', 'Weekly active users up 14% QoQ; reporting time down from 2 days to 20 minutes.'],
          ['Renewal', 'Preference for a 3-year term; procurement wants Premier Success bundled.'],
          ['Expansion', 'APAC operations team (Singapore, Sydney) evaluating in H1.'],
        ],
      },
      transcript: [
        ['Alex Morgan', '00:01:12', 'Thanks everyone for joining. Let’s start with adoption numbers for the quarter.'],
        ['Daniel Reyes', '00:03:40', 'We’re at 392 active seats out of 400 — basically everyone in ops is in it daily.'],
        ['Kate Sullivan', '00:21:05', 'If we can lock pricing for three years, I think we can get the renewal through quickly.'],
        ['Liam O’Connor', '00:34:18', 'For APAC, we’d suggest a phased rollout starting with Singapore.'],
      ],
    },
    {
      id: 'zr-webinar',
      topic: 'Webinar: AI-Powered Operations Summit 2026',
      date: daysAgo(7, 11, 0),
      duration: '1:01:47',
      size: '1.2 GB',
      participants: ['Hannah Novak', 'Rachel Goldberg', 'Alex Morgan', '+ 214 attendees'],
      summary: {
        quick: '216 attendees (48% of registrants). Strongest interest in multi-site reporting and AI agents for back-office work. 37 questions in Q&A; 12 attendees requested follow-up.',
        nextSteps: ['Hannah to send slides + recording to registrants', 'Sales to follow up with attendees who asked pricing questions', 'Publish Q&A recap on the blog'],
        sections: [
          ['Keynote', 'Rachel presented the 2026 Operations Benchmark: 61% of ops teams still run weekly reporting in spreadsheets.'],
          ['Demo', 'Alex demoed Ops Cloud with an AI coworker closing the loop on work orders.'],
          ['Q&A', 'Most-asked: pricing for multi-site rollouts, SSO, data residency in the EU.'],
        ],
      },
      transcript: [
        ['Hannah Novak', '00:00:30', 'Welcome everyone to the AI-Powered Operations Summit!'],
        ['Rachel Goldberg', '00:05:10', '61% of operations teams still build their weekly report by hand.'],
        ['Alex Morgan', '00:24:02', 'Let me show you what this looks like in a real plant operations workflow.'],
      ],
    },
    {
      id: 'zr-fabrikam',
      topic: 'Fabrikam — plant ops discovery',
      date: daysAgo(11, 13, 0),
      duration: '38:51',
      size: '288.0 MB',
      participants: ['Liam O’Connor', 'Laura Chen', 'Alex Morgan'],
      summary: {
        quick: 'Fabrikam wants to extend Ops Cloud to 3 additional plants (~420 seats). Main requirement is SAP PM integration. Budget approved for FY27 Q1.',
        nextSteps: ['Liam to send expansion proposal', 'Solutions to scope SAP PM connector'],
        sections: [['Scope', '3 plants in Texas and Mexico.'], ['Integration', 'SAP PM work orders must sync bi-directionally.']],
      },
      transcript: [['Laura Chen', '00:02:11', 'We want the same visibility we have in Dallas across all plants.']],
    },
  ]
  const zoomChats = [
    { id: 'zc-1', channel: 'sales-team', name: 'Sales Team', kind: 'channel', messages: [
      { from: 'rachel', text: 'Reminder: forecast calls Thursday. Please update close dates in Salesforce 🙏', at: hoursAgo(26) },
      { from: 'liam', text: 'Fabrikam expansion proposal goes out tomorrow — $312K', at: hoursAgo(5) },
      { from: 'aisha', text: 'Coho renewal is signed ✅', at: hoursAgo(3) },
      { from: 'rachel', text: 'Nice work all. Contoso is the big one — Alex, where are we?', at: minutesAgo(52) },
    ] },
    { id: 'zc-2', channel: 'deal-desk', name: 'Deal Desk', kind: 'channel', messages: [{ from: 'marcus', text: 'Approved: Contoso 3-yr price lock at $2,400/seat for the term.', at: daysAgo(4, 10, 15) }] },
    { id: 'zc-3', channel: 'liam', name: 'Liam O’Connor', kind: 'dm', messages: [{ from: 'liam', text: 'Elena said the walkthrough went great. Want me to update the opp or will you?', at: minutesAgo(25) }] },
    { id: 'zc-4', channel: 'hannah', name: 'Hannah Novak', kind: 'dm', messages: [{ from: 'hannah', text: 'Webinar attendee list is in HubSpot — 12 attendees still need a follow-up sequence', at: hoursAgo(20) }] },
    { id: 'zc-5', channel: 'emea-deals', name: 'EMEA Deals', kind: 'channel', messages: [{ from: 'liam', text: 'Adatum: Milan + Rotterdam, ~250 users. Decision by month end.', at: daysAgo(1, 15, 2) }] },
  ]

  /* ───────────────────────── Tableau ───────────────────────── */
  const tableauWorkbooks = [
    { id: 'wb-pipeline', name: 'Sales Pipeline Overview', project: 'Sales', owner: 'rachel', views: 4, updated: hoursAgo(3), viewsCount: 1284, favorite: true, thumb: 'pipeline' },
    { id: 'wb-forecast', name: 'Quarterly Forecast', project: 'Sales', owner: 'rachel', views: 3, updated: daysAgo(1), viewsCount: 642, favorite: true, thumb: 'forecast' },
    { id: 'wb-winloss', name: 'Win/Loss Analysis', project: 'Sales', owner: 'liam', views: 2, updated: daysAgo(4), viewsCount: 213, thumb: 'winloss' },
    { id: 'wb-marketing', name: 'Marketing Funnel', project: 'Marketing', owner: 'hannah', views: 5, updated: daysAgo(2), viewsCount: 377, thumb: 'funnel' },
    { id: 'wb-ops', name: 'Operations SLA Dashboard', project: 'Operations', owner: 'alex', views: 3, updated: daysAgo(6), viewsCount: 519, thumb: 'sla' },
    { id: 'wb-cs', name: 'Customer Health Scores', project: 'Customer Success', owner: 'aisha', views: 2, updated: daysAgo(3), viewsCount: 188, thumb: 'health' },
    { id: 'wb-finance', name: 'Bookings & ARR', project: 'Finance', owner: 'marcus', views: 4, updated: daysAgo(5), viewsCount: 902, thumb: 'arr' },
    { id: 'wb-superstore', name: 'Superstore', project: 'Samples', owner: 'alex', views: 3, updated: daysAgo(90), viewsCount: 45, thumb: 'superstore' },
  ]

  return {
    'salesforce.accounts': accounts,
    'salesforce.contacts': contacts,
    'salesforce.opportunities': opportunities,
    'salesforce.leads': leads,
    'salesforce.activities': activities,
    'salesforce.tasks': tasks,
    'salesforce.chatter': chatter,
    'hubspot.contacts': hsContacts,
    'hubspot.companies': hsCompanies,
    'hubspot.deals': hsDeals,
    'hubspot.lists': hsLists,
    'hubspot.sequences': hsSequences,
    'hubspot.tasks': hsTasks,
    'hubspot.tickets': hsTickets,
    'zoom.meetings': zoomMeetings,
    'zoom.recordings': zoomRecordings,
    'zoom.chats': zoomChats,
    'tableau.workbooks': tableauWorkbooks,
    'outlook.emails': [
      {
        id: 'em-hannah-webinar',
        folder: 'inbox',
        from: { name: person('hannah').name, email: person('hannah').email },
        to: [person('alex').email],
        subject: 'Webinar attendees — can you get them into a nurture sequence?',
        body: `Hi Alex,\n\nThe AI-Powered Operations Summit went really well — ${attended.length} attendees are still sitting in HubSpot without any follow-up. Could you build a list of everyone who attended (not just registered) and enroll them in the “Webinar follow-up — AI-Powered Ops” sequence? The sequence is ready to go.\n\nThanks!\nHannah`,
        date: hoursAgo(20),
        read: true,
      },
      {
        id: 'em-rachel-pipeline',
        folder: 'inbox',
        from: { name: person('rachel').name, email: person('rachel').email },
        to: [person('alex').email],
        subject: 'Pipeline snapshot for Thursday’s leadership sync?',
        body: `Alex — can you send David and me the latest pipeline dashboard from Tableau (PDF is fine) with your read on the quarter? Mostly interested in what’s in Commit vs Best Case and which deals could slip.\n\nRachel`,
        date: hoursAgo(9),
        read: false,
      },
    ],
  }
}

function businessDaysFrom(n: number, hh: number, mm: number) {
  const x = new Date()
  let left = n
  while (left > 0) {
    x.setDate(x.getDate() + 1)
    if (x.getDay() !== 0 && x.getDay() !== 6) left--
  }
  x.setHours(hh, mm, 0, 0)
  return x.toISOString()
}
