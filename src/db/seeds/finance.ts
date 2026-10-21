/**
 * Finance group seed: SAP S/4HANA, SAP Concur, Coupa, Oracle NetSuite.
 *
 * sap.suppliers:  { id (BP number), name, city, region, country, street, postal, category, paymentTerms, termsText, email, phone, taxNumber, bank, blocked?, createdOn }
 * sap.pos:        { id (PO number), supplierId, supplierName, companyCode, purchOrg, purchGroup, docDate, deliveryDate, status, netAmount, currency, paymentTerms, createdByName, items: [{ item, material, description, qty, unit, price, net, grQty, invQty, glAccount, costCenter, taxCode }] }
 * sap.invoices:   { id (doc number), fiscalYear, companyCode, supplierId, supplierName, reference, invoiceDate, postingDate, gross, tax, taxCode, currency, poId?, status, paymentTerms, dueDate, items, journalId, createdByName, createdAt, createdBy?: 'hworker', paymentBlock? }
 * sap.journals:   { id, fiscalYear, companyCode, type, typeText, postingDate, docDate, reference, header, amount, currency, sourceInvoiceId?, lines: [{ gl, glName, debit, credit, costCenter?, text? }], createdByName, createdBy? }
 *
 * concur.transactions: { id, date, merchant, city, amount, currency, card, mcc, suggestedType, receiptEmailId?, eReceipt, status: 'available'|'assigned', reportId? }
 * concur.reports:      { id, name, number, purpose, reportDate, policy, status, total, createdAt, submittedAt?, approver, approvalFlow, createdBy? }
 * concur.expenses:     { id, reportId, type, date, vendor, city, paymentType, amount, currency, comment, purpose?, receipt, attendees?, checkIn?, checkOut?, transactionId? }
 *
 * coupa.catalog:       { id, name, supplier, price, unit, partNumber, category, commodity, img, description, leadTime, contract? }
 * coupa.requisitions:  { id, number, title, requestedBy, onBehalfOf?, shipTo, needBy, commodity, costCenter, justification, lines: [{ itemId, name, supplier, qty, price, unit }], total, status, submittedAt, approvals: [{ name, role, status, at? }], createdBy? }
 * coupa.invoices:      { id, number, supplier, date, total, status, poNumber }
 *
 * netsuite.bills:      { id, number, vendor, date, dueDate, amount, memo, status, account, approvalStatus, refNo, lines }
 * netsuite.journals:   { id, number, date, period, memo, status, lines: [{ account, debit, credit, memo, department }], createdBy? }
 * netsuite.bankLines:  { id, date, description, amount, type, status: 'unmatched'|'matched'|'reconciled', matchId? }
 * netsuite.bookTxns:   { id, date, type, number, name, memo, amount, status: 'unmatched'|'matched'|'reconciled', matchId? }
 */
import type { Collections } from '../db'
import { ME, person } from '@/data/people'
import { daysAgo, hoursAgo, isoDate } from '@/data/time'

/* deterministic pseudo random */
function rng(seed: number) {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

const addDays = (iso: string, n: number) => {
  const d = new Date(iso)
  d.setDate(d.getDate() + n)
  return d.toISOString()
}

/* ───────────────────────────── SAP ───────────────────────────── */

const SUPPLIERS = [
  ['10300045', 'Fabrikam Supplies', 'Dallas', 'TX', '2200 Ross Ave', '75201', 'Facilities Services', 'NT30', 'Net 30 days', 'ar@fabrikam.com'],
  ['10300112', 'Litware Inc.', 'Denver', 'CO', '1550 Wewatta St', '80202', 'Software & Licenses', 'NT45', 'Net 45 days', 'billing@litware.com'],
  ['10300007', 'Contoso Ltd', 'Seattle', 'WA', '400 Pine St', '98101', 'IT Services', 'NT30', 'Net 30 days', 'ap@contoso.com'],
  ['10300019', 'Adatum Corporation', 'Chicago', 'IL', '233 S Wacker Dr', '60606', 'Consulting', 'NT30', 'Net 30 days', 'invoices@adatum.com'],
  ['10300023', 'Tailspin Toys', 'Portland', 'OR', '1120 NW Couch St', '97209', 'Marketing Materials', 'NT30', 'Net 30 days', 'ar@tailspintoys.com'],
  ['10300031', 'Wide World Importers', 'San Francisco', 'CA', '1 Market St', '94105', 'Raw Materials', 'NT60', 'Net 60 days', 'finance@wideworldimporters.com'],
  ['10300038', 'Northwind Traders', 'Boston', 'MA', '75 State St', '02109', 'Office Supplies', 'NT30', 'Net 30 days', 'billing@northwindtraders.com'],
  ['10300052', 'Alpine Ski House', 'Salt Lake City', 'UT', '222 S Main St', '84101', 'Events & Hospitality', 'NT15', 'Net 15 days', 'events@alpineskihouse.com'],
  ['10300058', 'Woodgrove Bank', 'New York', 'NY', '300 Park Ave', '10022', 'Financial Services', 'NT00', 'Due immediately', 'treasury@woodgrovebank.com'],
  ['10300064', 'Proseware, Inc.', 'Austin', 'TX', '500 W 2nd St', '78701', 'Software & Licenses', 'NT30', 'Net 30 days', 'ar@proseware.com'],
  ['10300071', 'Coho Winery', 'Napa', 'CA', '1700 Soscol Ave', '94559', 'Events & Hospitality', 'NT30', 'Net 30 days', 'orders@cohowinery.com'],
  ['10300077', 'Lucerne Publishing', 'New York', 'NY', '50 Hudson Yards', '10001', 'Marketing Materials', 'NT30', 'Net 30 days', 'ar@lucernepublishing.com'],
  ['10300083', 'Fourth Coffee', 'Seattle', 'WA', '2000 1st Ave', '98121', 'Office Supplies', 'NT15', 'Net 15 days', 'b2b@fourthcoffee.com'],
  ['10300089', "Margie's Travel", 'Miami', 'FL', '801 Brickell Ave', '33131', 'Travel Services', 'NT30', 'Net 30 days', 'corporate@margiestravel.com'],
  ['10300094', 'Trey Research', 'Raleigh', 'NC', '150 Fayetteville St', '27601', 'Consulting', 'NT45', 'Net 45 days', 'ap@treyresearch.net'],
  ['10300101', 'Blue Yonder Airlines', 'Atlanta', 'GA', '1000 Peachtree St', '30309', 'Travel Services', 'NT30', 'Net 30 days', 'corporate@blueyonderairlines.com'],
  ['10300106', 'Graphic Design Institute', 'Los Angeles', 'CA', '633 W 5th St', '90071', 'Marketing Materials', 'NT30', 'Net 30 days', 'billing@graphicdesigninstitute.com'],
  ['10300118', 'City Power & Light', 'Boston', 'MA', '800 Boylston St', '02199', 'Utilities', 'NT15', 'Net 15 days', 'commercial@cpandl.com'],
  ['10300124', 'Humongous Insurance', 'Hartford', 'CT', '1 American Row', '06103', 'Insurance', 'NT30', 'Net 30 days', 'premiums@humongousinsurance.com'],
  ['10300129', 'A. Datum Logistics', 'Memphis', 'TN', '3000 Airways Blvd', '38116', 'Logistics', 'NT30', 'Net 30 days', 'billing@adatumlogistics.com'],
  ['10300133', 'VanArsdel, Ltd.', 'Minneapolis', 'MN', '80 S 8th St', '55402', 'Raw Materials', 'NT60', 'Net 60 days', 'ar@vanarsdel.com'],
  ['10300138', 'Relecloud', 'San Jose', 'CA', '150 Almaden Blvd', '95113', 'Cloud Services', 'NT30', 'Net 30 days', 'billing@relecloud.com'],
  ['10300142', 'Wingtip Toys', 'Philadelphia', 'PA', '1735 Market St', '19103', 'Marketing Materials', 'NT30', 'Net 30 days', 'ar@wingtiptoys.com'],
  ['10300147', 'Southridge Video', 'Nashville', 'TN', '501 Broadway', '37203', 'Marketing Materials', 'NT30', 'Net 30 days', 'billing@southridgevideo.com'],
  ['10300151', 'Bellows College', 'Providence', 'RI', '10 Dorrance St', '02903', 'Training', 'NT30', 'Net 30 days', 'execed@bellowscollege.edu'],
  ['10300156', 'Consolidated Messenger', 'Chicago', 'IL', '161 N Clark St', '60601', 'Logistics', 'NT15', 'Net 15 days', 'ar@consolidatedmessenger.com'],
] as const

const GL = {
  grir: ['211100', 'GR/IR Clearing'],
  ap: ['211000', 'Accounts Payable — Domestic'],
  facilities: ['612000', 'Facilities Maintenance'],
  software: ['640100', 'Software Licenses'],
  consulting: ['620000', 'Consulting Fees'],
  office: ['611000', 'Office Supplies'],
  marketing: ['660000', 'Marketing & Advertising'],
  travel: ['670000', 'Travel Expenses'],
  utilities: ['613000', 'Utilities'],
  freight: ['654000', 'Freight Out'],
  cloud: ['640300', 'Cloud Hosting'],
  insurance: ['651000', 'Insurance Expense'],
  bank: ['113100', 'Bank — Woodgrove Operating'],
  inputTax: ['154000', 'Input Tax'],
  accrued: ['219000', 'Accrued Liabilities'],
  payroll: ['650000', 'Salaries & Wages'],
  depreciation: ['690000', 'Depreciation Expense'],
  accumDep: ['171900', 'Accumulated Depreciation'],
  materials: ['510000', 'Raw Materials Consumption'],
  training: ['676000', 'Training & Education'],
} as const

const CAT_GL: Record<string, readonly [string, string]> = {
  'Facilities Services': GL.facilities,
  'Software & Licenses': GL.software,
  'IT Services': GL.consulting,
  Consulting: GL.consulting,
  'Marketing Materials': GL.marketing,
  'Raw Materials': GL.materials,
  'Office Supplies': GL.office,
  'Events & Hospitality': GL.marketing,
  'Financial Services': GL.bank,
  'Travel Services': GL.travel,
  Utilities: GL.utilities,
  Insurance: GL.insurance,
  Logistics: GL.freight,
  'Cloud Services': GL.cloud,
  Training: GL.training,
}

const CAT_ITEMS: Record<string, [string, string, string, number][]> = {
  'Facilities Services': [['SRV-FAC-01', 'Facilities maintenance — monthly', 'AU', 9500], ['SRV-HVAC-02', 'HVAC preventive maintenance', 'AU', 3250], ['MAT-JAN-10', 'Janitorial supplies restock', 'EA', 1500]],
  'Software & Licenses': [['LIC-ANL-PRO', 'Analytics Pro named-user license', 'EA', 199], ['LIC-SUP-STD', 'Standard support & maintenance', 'AU', 2400]],
  'IT Services': [['SRV-IT-MSP', 'Managed IT services — monthly', 'AU', 18500], ['SRV-IT-PRJ', 'Network refresh project — milestone', 'AU', 12000]],
  Consulting: [['SRV-CONS-HR', 'Operations consulting (hours)', 'H', 225], ['SRV-CONS-WS', 'Process design workshop', 'AU', 6400]],
  'Marketing Materials': [['MKT-PRT-01', 'Printed brochures (A4, 500 pcs)', 'PAC', 640], ['MKT-BAN-02', 'Trade show banner set', 'EA', 1180]],
  'Raw Materials': [['RM-ALU-6061', 'Aluminium sheet 6061-T6', 'KG', 4.8], ['RM-PLY-ABS', 'ABS polymer pellets', 'KG', 2.65]],
  'Office Supplies': [['OS-PAP-A4', 'Copy paper A4, 80 g (box)', 'BOX', 42], ['OS-TON-HP', 'Toner cartridge HP 58X', 'EA', 189]],
  'Events & Hospitality': [['EVT-VEN-01', 'Venue hire — offsite day', 'AU', 7800], ['EVT-CAT-02', 'Catering per head', 'EA', 68]],
  'Financial Services': [['FIN-SVC-01', 'Treasury management fees', 'AU', 1250]],
  'Travel Services': [['TRV-AGT-01', 'Agency booking fees', 'EA', 35], ['TRV-AIR-02', 'Group airfare — sales kickoff', 'AU', 14200]],
  Utilities: [['UTL-ELC-01', 'Electricity — Boston HQ', 'KWH', 0.21]],
  Insurance: [['INS-GL-01', 'General liability premium — quarterly', 'AU', 22400]],
  Logistics: [['LOG-FRT-01', 'LTL freight — outbound', 'AU', 2860], ['LOG-CUR-02', 'Same-day courier', 'EA', 48]],
  'Cloud Services': [['CLD-CMP-01', 'Compute reserved instances', 'AU', 9800], ['CLD-STO-02', 'Object storage (TB-month)', 'TB', 23]],
  Training: [['TRN-EXE-01', 'Executive education seat', 'EA', 4900]],
}

const BUYERS = ['Lucas Moreau', 'Emma Schultz', 'Lucas Moreau', 'Sofia Martinez']

function sapData() {
  const r = rng(42)
  const suppliers = SUPPLIERS.map(([id, name, city, region, street, postal, category, terms, termsText, email], i) => ({
    id,
    name,
    city,
    region,
    country: 'US',
    street,
    postal,
    category,
    paymentTerms: terms,
    termsText,
    email,
    phone: `+1 (${200 + ((i * 37) % 700)}) 555-${String(1000 + i * 131).slice(-4)}`,
    taxNumber: `${10 + i}-${String(4400000 + i * 7919).slice(0, 7)}`,
    bank: `Woodgrove Bank ••••${String(2000 + i * 77).slice(-4)}`,
    blocked: name === 'VanArsdel, Ltd.',
    createdOn: daysAgo(400 + i * 23),
    purchOrg: '1010',
    accountGroup: 'SUPL',
    reconAccount: '211000',
  }))
  const sup = (id: string) => suppliers.find((s) => s.id === id)!

  const pos: any[] = []
  const mkPo = (id: string, supplierId: string, items: any[], days: number, status: string, extra: any = {}) => {
    const s = sup(supplierId)
    const net = Math.round(items.reduce((t, it) => t + it.qty * it.price, 0) * 100) / 100
    pos.push({
      id,
      supplierId,
      supplierName: s.name,
      companyCode: '1010',
      purchOrg: '1010',
      purchGroup: s.category.includes('Software') || s.category.includes('IT') || s.category.includes('Cloud') ? '002 — IT Procurement' : '001 — Indirect Spend',
      docType: 'NB — Standard PO',
      docDate: daysAgo(days),
      deliveryDate: addDays(daysAgo(days), 14),
      status,
      netAmount: net,
      currency: 'USD',
      paymentTerms: s.paymentTerms,
      createdByName: BUYERS[pos.length % BUYERS.length],
      plant: '1010 — Boston HQ',
      items: items.map((it, i) => ({
        item: String((i + 1) * 10).padStart(5, '0'),
        material: it.material,
        description: it.description,
        qty: it.qty,
        unit: it.unit,
        price: it.price,
        net: Math.round(it.qty * it.price * 100) / 100,
        grQty: it.grQty ?? it.qty,
        invQty: it.invQty ?? (status === 'Completely Invoiced' ? it.qty : 0),
        glAccount: (CAT_GL[s.category] ?? GL.office)[0],
        costCenter: it.costCenter ?? '10101301',
        taxCode: 'I0',
      })),
      ...extra,
    })
  }
  // the two POs the workflows use
  mkPo('4500018234', '10300045', [
    { material: 'SRV-FAC-01', description: 'Facilities maintenance — October', qty: 1, unit: 'AU', price: 9500, costCenter: '10101501' },
    { material: 'SRV-HVAC-02', description: 'HVAC preventive maintenance (Q4 visit)', qty: 1, unit: 'AU', price: 3250, costCenter: '10101501' },
    { material: 'MAT-JAN-10', description: 'Janitorial supplies restock', qty: 1, unit: 'AU', price: 1500, costCenter: '10101501' },
  ], 24, 'Sent', { deliveryDate: daysAgo(2) })
  mkPo('4500018390', '10300112', [
    { material: 'LIC-ANL-PRO', description: 'Analytics Pro license true-up — Q4', qty: 20, unit: 'EA', price: 199, costCenter: '10101301' },
  ], 12, 'Sent', { deliveryDate: daysAgo(5) })
  // plenty of others
  const otherSups = suppliers.filter((s) => !['10300045', '10300112'].includes(s.id))
  let poNum = 4500018120
  for (let i = 0; i < 34; i++) {
    const s = otherSups[i % otherSups.length]
    const opts = CAT_ITEMS[s.category] ?? CAT_ITEMS['Office Supplies']
    const n = 1 + Math.floor(r() * Math.min(3, opts.length))
    const items = opts.slice(0, n).map(([material, description, unit, price]) => {
      const qty = price < 10 ? Math.round(800 + r() * 4000) : price < 300 ? Math.round(5 + r() * 40) : 1 + Math.floor(r() * 2)
      return { material, description, unit, price, qty }
    })
    const st = i < 4 ? 'In Approval' : i < 9 ? 'Sent' : i < 13 ? 'Partially Invoiced' : 'Completely Invoiced'
    poNum += 2 + Math.floor(r() * 6)
    if (poNum === 4500018234 || poNum === 4500018390) poNum++
    mkPo(String(poNum), s.id, items, i < 9 ? 3 + i * 2 : 20 + i * 4, st)
  }
  // Fabrikam history (previous months, completely invoiced)
  mkPo('4500017811', '10300045', [
    { material: 'SRV-FAC-01', description: 'Facilities maintenance — September', qty: 1, unit: 'AU', price: 9500 },
    { material: 'MAT-JAN-10', description: 'Janitorial supplies restock', qty: 1, unit: 'AU', price: 1480 },
  ], 55, 'Completely Invoiced')
  mkPo('4500017502', '10300045', [
    { material: 'SRV-FAC-01', description: 'Facilities maintenance — August', qty: 1, unit: 'AU', price: 9500 },
  ], 84, 'Completely Invoiced')
  mkPo('4500017640', '10300112', [
    { material: 'LIC-SUP-STD', description: 'Standard support & maintenance — FY26', qty: 1, unit: 'AU', price: 2400 },
  ], 70, 'Completely Invoiced')
  pos.sort((a, b) => (a.id < b.id ? 1 : -1))

  // invoices + their journal entries
  const invoices: any[] = []
  const journals: any[] = []
  let doc = 5105601186
  let je = 100004410
  const invoicedPos = pos.filter((p) => p.status === 'Completely Invoiced' || p.status === 'Partially Invoiced')
  for (let i = 0; i < 47; i++) {
    const po = invoicedPos[i % invoicedPos.length]
    const s = sup(po.supplierId)
    const days = 2 + (46 - i) * 2 + Math.floor(r() * 2)
    const partial = po.status === 'Partially Invoiced'
    const gross = Math.round((partial ? po.netAmount * 0.5 : po.netAmount) * (i >= invoicedPos.length ? 0.94 + r() * 0.1 : 1) * 100) / 100
    const status = days > 45 ? (i % 9 === 0 ? 'Blocked for Payment' : 'Paid') : (['Posted', 'Posted', 'Posted', 'Parked', 'Posted', 'Blocked for Payment', 'Posted'] as const)[i % 7]
    const invDate = daysAgo(days + 2)
    const id = String(doc)
    const jid = String(je)
    const gl = CAT_GL[s.category] ?? GL.office
    invoices.push({
      id,
      fiscalYear: '2026',
      companyCode: '1010',
      supplierId: s.id,
      supplierName: s.name,
      reference: `${s.name.split(/[ .,]/)[0].slice(0, 3).toUpperCase()}-${20000 + Math.floor(r() * 9000)}`,
      invoiceDate: invDate,
      postingDate: daysAgo(days),
      gross,
      tax: 0,
      taxCode: 'I0',
      currency: 'USD',
      poId: po.id,
      status,
      paymentTerms: s.paymentTerms,
      dueDate: addDays(invDate, Number(s.paymentTerms.slice(2)) || 0),
      items: po.items.map((it: any) => ({ poId: po.id, item: it.item, description: it.description, qty: it.qty, unit: it.unit, amount: partial ? it.net * 0.5 : it.net, taxCode: 'I0' })),
      journalId: status === 'Parked' ? undefined : jid,
      createdByName: i % 3 === 0 ? 'Emma Schultz' : i % 3 === 1 ? 'Lucas Moreau' : 'Sofia Martinez',
      createdAt: daysAgo(days, 10 + (i % 6), (i * 7) % 60),
      paymentBlock: status === 'Blocked for Payment' ? 'R — Invoice verification' : undefined,
    })
    if (status !== 'Parked') {
      journals.push({
        id: jid,
        fiscalYear: '2026',
        companyCode: '1010',
        type: 'RE',
        typeText: 'Gross Invoice Receipt',
        postingDate: daysAgo(days),
        docDate: invDate,
        reference: invoices[invoices.length - 1].reference,
        header: `${s.name} invoice`,
        amount: gross,
        currency: 'USD',
        sourceInvoiceId: id,
        lines: [
          { gl: GL.grir[0], glName: GL.grir[1], debit: gross, credit: 0, text: `PO ${po.id}` },
          { gl: GL.ap[0], glName: `${GL.ap[1]} · ${s.name}`, debit: 0, credit: gross, text: s.id },
        ],
        createdByName: invoices[invoices.length - 1].createdByName,
      })
      je += 1 + Math.floor(r() * 3)
    }
    doc++
  }
  // a few non-invoice journals
  const manual: [string, string, string, number, readonly [string, string], readonly [string, string], number][] = [
    ['SA', 'G/L Account Document', 'September payroll accrual', 412880.0, GL.payroll, GL.accrued, 30],
    ['SA', 'G/L Account Document', 'Depreciation run — September', 38420.15, GL.depreciation, GL.accumDep, 21],
    ['SA', 'G/L Account Document', 'Reclass consulting to project WBS', 6400.0, GL.consulting, GL.consulting, 17],
    ['KZ', 'Vendor Payment', 'Payment run F110 — 10/07', 186240.32, GL.ap, GL.bank, 14],
    ['KZ', 'Vendor Payment', 'Payment run F110 — 10/14', 142918.7, GL.ap, GL.bank, 7],
    ['SA', 'G/L Account Document', 'Utilities accrual — October', 8650.0, GL.utilities, GL.accrued, 3],
    ['SA', 'G/L Account Document', 'Prepaid insurance amortization', 7466.67, GL.insurance, GL.accrued, 2],
  ]
  for (const [type, typeText, header, amt, dr, cr, days] of manual) {
    journals.push({
      id: String(je),
      fiscalYear: '2026',
      companyCode: '1010',
      type,
      typeText,
      postingDate: daysAgo(days),
      docDate: daysAgo(days),
      reference: header.slice(0, 16).toUpperCase().replace(/\s+/g, '-'),
      header,
      amount: amt,
      currency: 'USD',
      lines: [
        { gl: dr[0], glName: dr[1], debit: amt, credit: 0, costCenter: '10101301' },
        { gl: cr[0], glName: cr[1], debit: 0, credit: amt },
      ],
      createdByName: 'Sofia Martinez',
    })
    je += 2
  }
  invoices.sort((a, b) => (a.id < b.id ? 1 : -1))
  journals.sort((a, b) => +new Date(b.postingDate) - +new Date(a.postingDate))
  return { suppliers, pos, invoices, journals }
}

/* ───────────────────────────── Concur ───────────────────────────── */

function concurData() {
  const transactions = [
    { id: 'ctx-uber', date: daysAgo(2, 19, 19), merchant: 'UBER *TRIP', vendor: 'Uber', city: 'Boston, Massachusetts', amount: 48.2, currency: 'USD', card: 'American Express Corporate ••••1007', mcc: '4121 — Taxicabs/Limousines', suggestedType: 'Taxi/Rideshare', receiptEmailId: 'em-rcpt-uber', eReceipt: true, status: 'available' },
    { id: 'ctx-marriott', date: daysAgo(2, 11, 2), merchant: 'MARRIOTT COPLEY PLACE', vendor: 'Boston Marriott Copley Place', city: 'Boston, Massachusetts', amount: 612.4, currency: 'USD', card: 'American Express Corporate ••••1007', mcc: '3509 — Marriott', suggestedType: 'Hotel', receiptEmailId: 'em-rcpt-marriott', eReceipt: true, status: 'available' },
    { id: 'ctx-delta', date: daysAgo(6, 8, 27), merchant: 'DELTA AIR LINES 0062', vendor: 'Delta Air Lines', city: 'Atlanta, Georgia', amount: 486.9, currency: 'USD', card: 'American Express Corporate ••••1007', mcc: '3058 — Delta', suggestedType: 'Airfare', receiptEmailId: 'em-rcpt-delta', eReceipt: true, status: 'available', ticket: 'GH7Q2K · BOS–ORD–BOS' },
    { id: 'ctx-oak', date: daysAgo(3, 21, 46), merchant: 'TST* OAK LONG BAR KITCHEN', vendor: 'Oak Long Bar + Kitchen', city: 'Boston, Massachusetts', amount: 186.45, currency: 'USD', card: 'American Express Corporate ••••1007', mcc: '5812 — Eating Places, Restaurants', suggestedType: 'Individual Meals', receiptEmailId: 'em-rcpt-dinner', eReceipt: true, status: 'available' },
  ]
  const P = (id: string) => person(id).name
  const flow = (status: 'approved' | 'pending', submitted: string) => [
    { name: ME.name, role: 'Submitted', status: 'done', at: submitted },
    { name: P('priya'), role: 'Manager Approval', status: status === 'approved' ? 'done' : 'pending', at: status === 'approved' ? addDays(submitted, 1) : undefined },
    { name: 'Northwind Expense Processing', role: 'Audit Review', status: status === 'approved' ? 'done' : 'waiting', at: status === 'approved' ? addDays(submitted, 3) : undefined },
  ]
  const past = [
    ['crp-101', 'NYC — Contoso QBR', 'Quarterly business review with Contoso procurement', 35, 'Approved', 1287.64, [['Airfare', 'JetBlue Airways', 'New York, New York', 342.6], ['Hotel', 'The Langham, New York', 'New York, New York', 689.0], ['Taxi/Rideshare', 'Lyft', 'New York, New York', 64.3], ['Business Meals', 'Gramercy Tavern', 'New York, New York', 191.74]]],
    ['crp-102', 'Austin IT Summit', 'Annual IT & operations summit', 58, 'Paid', 2140.18, [['Airfare', 'Southwest Airlines', 'Austin, Texas', 418.4], ['Hotel', 'Hotel Van Zandt', 'Austin, Texas', 1032.0], ['Conference/Seminar Fees', 'Austin IT Summit', 'Austin, Texas', 595.0], ['Taxi/Rideshare', 'Uber', 'Austin, Texas', 94.78]]],
    ['crp-103', 'September Mileage & Parking', 'Local site visits — Boston warehouses', 27, 'Approved', 214.5, [['Parking', 'SP+ Parking', 'Boston, Massachusetts', 62.0], ['Personal Car Mileage', 'Mileage — 228 mi', 'Boston, Massachusetts', 152.5]]],
    ['crp-104', 'Team offsite — Q3 planning', 'Operations team quarterly planning offsite', 44, 'Paid', 868.2, [['Business Meals', 'Coppa Enoteca', 'Boston, Massachusetts', 412.2], ['Office Supplies', 'Staples', 'Boston, Massachusetts', 86.0], ['Meeting Room Rental', 'WeWork', 'Boston, Massachusetts', 370.0]]],
    ['crp-105', 'Fabrikam vendor review — Dallas', 'Annual facilities vendor performance review', 12, 'Submitted & Pending Approval', 954.31, [['Airfare', 'American Airlines', 'Dallas, Texas', 388.9], ['Hotel', 'Hotel ZaZa Dallas', 'Dallas, Texas', 498.0], ['Taxi/Rideshare', 'Uber', 'Dallas, Texas', 67.41]]],
  ] as const
  const reports: any[] = []
  const expenses: any[] = []
  past.forEach(([id, name, purpose, days, status, , items], i) => {
    const submitted = daysAgo(days - 3, 16, 20)
    const total = Math.round(items.reduce((t, x) => t + x[3], 0) * 100) / 100
    reports.push({
      id,
      name,
      number: `7KQ2${(4810 + i * 37).toString(36).toUpperCase()}`,
      purpose,
      reportDate: daysAgo(days),
      policy: 'Northwind US Travel & Expense Policy',
      status,
      total,
      createdAt: daysAgo(days, 9, 0),
      submittedAt: submitted,
      approver: P('priya'),
      approvalFlow: flow(status === 'Submitted & Pending Approval' ? 'pending' : 'approved', submitted),
    })
    items.forEach(([type, vendor, city, amount], j) =>
      expenses.push({
        id: `cex-${id}-${j}`,
        reportId: id,
        type,
        date: daysAgo(days - j, 12, 0),
        vendor,
        city,
        paymentType: type.includes('Mileage') ? 'Cash' : 'American Express Corporate',
        amount,
        currency: 'USD',
        comment: '',
        receipt: !type.includes('Mileage'),
        transactionId: type.includes('Mileage') ? undefined : `seed-${id}-${j}`,
        checkIn: type === 'Hotel' ? isoDate(daysAgo(days)) : undefined,
        checkOut: type === 'Hotel' ? isoDate(daysAgo(days - 2)) : undefined,
        attendees: type === 'Business Meals' ? [{ name: ME.name, type: 'Employee' }, { name: 'Guests', type: 'Business Guest', count: 3 }] : undefined,
      }),
    )
  })
  // one draft report so the "Active Reports" strip has something
  reports.push({
    id: 'crp-106',
    name: 'Boston client lunches — Oct',
    number: '7KQ2BX9',
    purpose: 'Local client entertainment',
    reportDate: daysAgo(9),
    policy: 'Northwind US Travel & Expense Policy',
    status: 'Not Submitted',
    total: 58.4,
    createdAt: daysAgo(9, 15, 0),
    approver: P('priya'),
    approvalFlow: [],
  })
  expenses.push({ id: 'cex-crp-106-0', reportId: 'crp-106', type: 'Business Meals', date: daysAgo(10, 12, 30), vendor: 'Tatte Bakery & Cafe', city: 'Boston, Massachusetts', paymentType: 'American Express Corporate', amount: 58.4, currency: 'USD', comment: 'Lunch with Kate Sullivan (Contoso)', receipt: true, transactionId: 'seed-crp-106-0', attendees: [{ name: ME.name, type: 'Employee' }, { name: 'Kate Sullivan', company: 'Contoso Ltd', type: 'Business Guest' }] })
  return { transactions, reports, expenses }
}

/* ───────────────────────────── Coupa ───────────────────────────── */

function coupaData() {
  const catalog = [
    ['cpi-lat7450', 'Dell Latitude 7450 Laptop — Intel Core Ultra 7, 16GB, 512GB SSD, 14" FHD+', 'Dell Technologies', 1689.0, 'EA', 'LAT7450-U7-16', 'Laptops', 'IT Hardware', 'laptop', '5–7 business days', true],
    ['cpi-lat5450', 'Dell Latitude 5450 Laptop — Intel Core Ultra 5, 16GB, 256GB SSD, 14"', 'Dell Technologies', 1199.0, 'EA', 'LAT5450-U5-16', 'Laptops', 'IT Hardware', 'laptop', '5–7 business days', true],
    ['cpi-xps13', 'Dell XPS 13 9350 — Intel Core Ultra 7, 32GB, 1TB', 'Dell Technologies', 1949.0, 'EA', 'XPS9350-U7-32', 'Laptops', 'IT Hardware', 'laptop', '7–10 business days', false],
    ['cpi-u2724d', 'Dell UltraSharp 27 Monitor — U2724D, QHD, USB-C Hub', 'Dell Technologies', 449.99, 'EA', 'U2724D', 'Monitors', 'IT Hardware', 'monitor', '3–5 business days', true],
    ['cpi-p2425h', 'Dell 24 Monitor — P2425H, FHD, IPS', 'Dell Technologies', 219.99, 'EA', 'P2425H', 'Monitors', 'IT Hardware', 'monitor', '3–5 business days', true],
    ['cpi-wd19s', 'Dell Universal Dock — UD22 (USB-C, 96W)', 'Dell Technologies', 239.0, 'EA', 'UD22', 'Docking Stations', 'IT Hardware', 'dock', '3–5 business days', true],
    ['cpi-km7321', 'Dell Premier Multi-Device Wireless Keyboard and Mouse — KM7321W', 'Dell Technologies', 89.99, 'EA', 'KM7321W', 'Peripherals', 'IT Hardware', 'keyboard', '3–5 business days', true],
    ['cpi-mbp14', 'Apple MacBook Pro 14" M4 Pro, 24GB, 1TB', 'CDW', 2399.0, 'EA', 'MX2H3LL/A', 'Laptops', 'IT Hardware', 'laptop', '5–7 business days', true],
    ['cpi-jabra', 'Jabra Evolve2 65 Flex — UC Stereo Headset', 'CDW', 239.99, 'EA', '26699-989-999', 'Peripherals', 'IT Hardware', 'headset', '2–4 business days', true],
    ['cpi-logi-c', 'Logitech MX Master 3S Wireless Mouse', 'CDW', 99.99, 'EA', '910-006557', 'Peripherals', 'IT Hardware', 'mouse', '2–4 business days', true],
    ['cpi-surface', 'Microsoft Surface Laptop 7 — 15", Snapdragon X Elite, 16GB', 'CDW', 1499.0, 'EA', 'ZYU-00001', 'Laptops', 'IT Hardware', 'laptop', '5–7 business days', false],
    ['cpi-iphone', 'Apple iPhone 16 128GB — Corporate Liable', 'CDW', 799.0, 'EA', 'MYAP3LL/A', 'Mobile Devices', 'IT Hardware', 'phone', '3–5 business days', true],
    ['cpi-paper', 'Hammermill Copy Plus Paper, 8.5" x 11", 20 lb, 10 Reams/Carton', 'Staples', 54.99, 'CT', '122374', 'Paper', 'Office Supplies', 'paper', 'Next business day', true],
    ['cpi-pens', 'Pilot G2 Retractable Gel Pens, Fine Point, Black, 12/Pack', 'Staples', 14.29, 'PK', '381871', 'Writing Instruments', 'Office Supplies', 'pen', 'Next business day', true],
    ['cpi-notebook', 'Moleskine Classic Notebook, Large, Ruled, Black', 'Staples', 22.5, 'EA', '24486', 'Notebooks', 'Office Supplies', 'notebook', 'Next business day', true],
    ['cpi-chair', 'Steelcase Series 2 Office Chair, Graphite', 'Staples', 629.0, 'EA', '2715884', 'Furniture', 'Facilities', 'chair', '10–14 business days', true],
    ['cpi-desk', 'Uplift V2 Standing Desk, 60" x 30", Walnut', 'Staples', 799.0, 'EA', 'UPL-V2-6030', 'Furniture', 'Facilities', 'desk', '10–14 business days', false],
    ['cpi-coffee', 'Fourth Coffee Whole Bean, House Blend, 5 lb', 'Fourth Coffee', 64.0, 'BAG', 'FC-HB-5', 'Pantry', 'Facilities', 'coffee', '2–3 business days', true],
    ['cpi-badge', 'HID Proximity Badge Cards (100 pack)', 'Northwind Traders', 189.0, 'PK', 'HID-1386', 'Security', 'Facilities', 'badge', '5 business days', true],
    ['cpi-toner', 'HP 58X High Yield Black Toner Cartridge', 'Staples', 189.99, 'EA', 'CF258X', 'Printer Supplies', 'Office Supplies', 'toner', 'Next business day', true],
    ['cpi-whiteboard', 'Quartet Glass Whiteboard, 6\' x 4\', Frameless', 'Staples', 449.0, 'EA', 'G7248W', 'Furniture', 'Facilities', 'board', '7 business days', false],
    ['cpi-m365', 'Microsoft 365 E5 — annual subscription (per user)', 'CDW', 684.0, 'EA', 'AAA-51069', 'Software', 'Software', 'software', 'Electronic delivery', true],
  ].map(([id, name, supplier, price, unit, partNumber, category, commodity, img, leadTime, contract]) => ({ id, name, supplier, price, unit, partNumber, category, commodity, img, leadTime, contract, description: `${name}. Contract pricing for Northwind Global. Ships from ${supplier} distribution center.` }))

  const P = (id: string) => person(id).name
  const REQS = [
    ['Dell Latitude 7450 — Ben Carter replacement', 'ben', 'IT Hardware', [['cpi-lat7450', 1]], 'Ordered', 14],
    ['Ergonomic chairs — Boston ops pod', 'maya', 'Facilities', [['cpi-chair', 4]], 'Ordered', 21],
    ['Copy paper + toner — Q4 restock', 'maya', 'Office Supplies', [['cpi-paper', 12], ['cpi-toner', 4]], 'Ordered', 9],
    ['Headsets for support team', 'ryan', 'IT Hardware', [['cpi-jabra', 6]], 'Pending Approval', 2],
    ['Badge cards — new office wing', 'alex', 'Facilities', [['cpi-badge', 3]], 'Approved', 5],
    ['Monitors for analysts', 'ben', 'IT Hardware', [['cpi-u2724d', 2]], 'Ordered', 33],
    ['Pantry coffee — October', 'maya', 'Facilities', [['cpi-coffee', 6]], 'Ordered', 18],
    ['Standing desk — accessibility request', 'alex', 'Facilities', [['cpi-desk', 1]], 'Pending Approval', 1],
    ['MacBook Pro — design contractor', 'hannah', 'IT Hardware', [['cpi-mbp14', 1]], 'Rejected', 26],
    ['Microsoft 365 E5 — 5 seats', 'oliver', 'Software', [['cpi-m365', 5]], 'Ordered', 40],
  ] as const
  const requisitions = REQS.map(([title, who, commodity, lines, status, days], i) => {
    const ls = lines.map(([itemId, qty]) => {
      const c = catalog.find((x) => x.id === itemId)!
      return { itemId, name: c.name, supplier: c.supplier, qty, price: c.price as number, unit: c.unit }
    })
    const total = Math.round(ls.reduce((t, l) => t + l.qty * l.price, 0) * 100) / 100
    const at = daysAgo(days, 10, 15)
    return {
      id: `creq-${4790 + i}`,
      number: String(4790 + i),
      title,
      requestedBy: P(who),
      shipTo: 'Northwind Global — Boston HQ, 1 Federal St, Boston, MA 02110',
      needBy: isoDate(daysAgo(days - 10)),
      commodity,
      costCenter: who === 'oliver' ? '4200 — IT Operations' : who === 'hannah' ? '3100 — Marketing' : who === 'ryan' ? '5200 — Customer Support' : '6105 — Operations',
      justification: '',
      lines: ls,
      total,
      status,
      submittedAt: at,
      approvals: [
        { name: P('priya'), role: 'Cost Center Owner', status: status === 'Pending Approval' ? 'pending' : status === 'Rejected' ? 'rejected' : 'approved', at: status === 'Pending Approval' ? undefined : addDays(at, 0.4) },
        ...(total > 5000 ? [{ name: P('sofia'), role: 'Finance (> $5,000)', status: status === 'Pending Approval' ? 'waiting' : 'approved', at: undefined }] : []),
      ],
      poNumber: status === 'Ordered' ? `PO-${11820 + i * 3}` : undefined,
    }
  }).reverse()

  const invoices = [
    ['Dell Technologies', 1689.0, 'Approved', 12],
    ['Staples', 791.92, 'Approved', 6],
    ['Fourth Coffee', 384.0, 'Pending Approval', 2],
    ['CDW', 3420.0, 'Approved', 35],
    ['Staples', 2516.0, 'Paid', 19],
    ['Dell Technologies', 899.98, 'Disputed', 25],
    ['CDW', 1439.94, 'Pending Receipt', 1],
    ['Northwind Traders', 567.0, 'Paid', 30],
  ].map(([supplier, total, status, days], i) => ({ id: `cinv-${i}`, number: `${String(supplier).slice(0, 3).toUpperCase()}-${88120 + i * 17}`, supplier, total, status, date: daysAgo(days as number), poNumber: `PO-${11820 + i * 3}` }))
  return { catalog, requisitions, invoices }
}

/* ───────────────────────────── NetSuite ───────────────────────────── */

function netsuiteData() {
  const VEND = ['Fabrikam Supplies', 'Litware Inc.', 'Contoso Ltd', 'Relecloud', 'City Power & Light', 'A. Datum Logistics', 'Proseware, Inc.', 'Northwind Traders', 'Humongous Insurance', 'Consolidated Messenger', 'Trey Research', 'Fourth Coffee']
  const ACC = ['6120 Facilities Maintenance', '6401 Software Subscriptions', '6200 Professional Services', '6403 Cloud Hosting', '6130 Utilities', '5400 Freight & Logistics', '6401 Software Subscriptions', '6110 Office Supplies', '6510 Insurance', '5400 Freight & Logistics', '6200 Professional Services', '6110 Office Supplies']
  const r = rng(7)
  const bills = Array.from({ length: 22 }, (_, i) => {
    const v = i % VEND.length
    const amount = Math.round((400 + r() * 18000) * 100) / 100
    const date = daysAgo(1 + i * 2)
    const pend = i < 6
    return {
      id: `nsb-${1180 + i}`,
      number: `BILL${(10480 + i).toString()}`,
      vendor: VEND[v],
      date,
      dueDate: addDays(date, 30),
      amount,
      memo: `${ACC[v].slice(5)} — ${new Date(date).toLocaleDateString('en-US', { month: 'long' })}`,
      status: pend ? 'Pending Approval' : i < 14 ? 'Open' : 'Paid In Full',
      approvalStatus: pend ? 'Pending Approval' : 'Approved',
      account: '2000 Accounts Payable',
      refNo: `${VEND[v].slice(0, 3).toUpperCase()}-${7000 + i * 13}`,
      lines: [{ account: ACC[v], amount, memo: '', department: 'Operations' }],
    }
  })
  const journals = [
    ['JE-2026-1031', 'September revenue deferral', 18, 'Approved', [['2400 Deferred Revenue', 42500, 0], ['4000 Revenue', 0, 42500]]],
    ['JE-2026-1034', 'Prepaid rent amortization — October', 15, 'Approved', [['6100 Rent Expense', 21800, 0], ['1300 Prepaid Expenses', 0, 21800]]],
    ['JE-2026-1036', 'Payroll accrual — period 10A', 9, 'Approved', [['6000 Salaries & Wages', 186420.55, 0], ['2100 Accrued Payroll', 0, 186420.55]]],
    ['JE-2026-1038', 'Reclass marketing to events', 6, 'Pending Approval', [['6610 Events', 7400, 0], ['6600 Marketing', 0, 7400]]],
    ['JE-2026-1039', 'FX revaluation — EUR receivables', 4, 'Pending Approval', [['1200 Accounts Receivable', 1284.12, 0], ['7100 Unrealized FX Gain/Loss', 0, 1284.12]]],
    ['JE-2026-1041', 'Depreciation — October', 2, 'Pending Approval', [['6900 Depreciation Expense', 31206.4, 0], ['1590 Accumulated Depreciation', 0, 31206.4]]],
    ['JE-2026-1027', 'Bonus accrual Q3', 26, 'Approved', [['6010 Bonus Expense', 96000, 0], ['2100 Accrued Payroll', 0, 96000]]],
    ['JE-2026-1022', 'Intercompany recharge — EMEA', 31, 'Approved', [['1800 Intercompany Receivable', 54300, 0], ['6200 Professional Services', 0, 54300]]],
  ].map(([number, memo, days, status, lines]: any) => ({
    id: `nsj-${number.slice(-4)}`,
    number,
    date: daysAgo(days),
    period: new Date(daysAgo(days)).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    memo,
    status,
    subsidiary: 'Northwind Global Inc.',
    currency: 'USD',
    lines: lines.map(([account, debit, credit]: any) => ({ account, debit, credit, memo, department: 'Finance' })),
    createdByName: 'Sofia Martinez',
  }))

  // October bank statement (Woodgrove operating ••••4410) vs. NetSuite register
  const bankLines = [
    ['nbl-1', 19, 'ACH CREDIT CONTOSO LTD REMIT INV-10482', 48600.0],
    ['nbl-2', 18, 'ACH DEBIT FABRIKAM SUPPLIES BILLPAY', -9870.0],
    ['nbl-3', 16, 'WIRE OUT LITWARE INC REF LW-7702', -3120.0],
    ['nbl-4', 15, 'ACH CREDIT ADATUM CORP PMT 88213', 22450.0],
    ['nbl-5', 14, 'ADP PAYROLL 10/15 NWG', -186420.55],
    ['nbl-6', 12, 'CHECK 10231', -1245.0],
    ['nbl-7', 10, 'AMEX EPAYMENT ACH PMT', -14882.16],
    ['nbl-8', 8, 'ACH CREDIT TAILSPIN TOYS INV-10477', 7980.0],
    ['nbl-9', 5, 'RELECLOUD AUTOPAY OCT', -9800.0],
    ['nbl-10', 3, 'MONTHLY ACCOUNT SERVICE FEE', -85.0],
    ['nbl-11', 2, 'INTEREST CREDIT', 312.47],
  ].map(([id, days, description, amount]) => ({ id, date: daysAgo(days as number), description, amount, type: (amount as number) > 0 ? 'Deposit' : 'Payment', status: 'unmatched' }))
  const bookTxns = [
    ['nbt-1', 20, 'Customer Payment', 'PYMT1841', 'Contoso Ltd', 'INV-10482', 48600.0],
    ['nbt-2', 19, 'Bill Payment', 'BP-3320', 'Fabrikam Supplies', 'September facilities', -9870.0],
    ['nbt-3', 17, 'Bill Payment', 'BP-3322', 'Litware Inc.', 'LW-7702 support', -3120.0],
    ['nbt-4', 15, 'Customer Payment', 'PYMT1846', 'Adatum Corporation', 'INV-10479', 22450.0],
    ['nbt-5', 14, 'Journal', 'JE-2026-1036', 'ADP', 'Payroll 10/15', -186420.55],
    ['nbt-6', 13, 'Check', '10231', 'Northwind Traders', 'Office supplies', -1245.0],
    ['nbt-7', 11, 'Bill Payment', 'BP-3329', 'American Express', 'Corporate card — Sept stmt', -14882.16],
    ['nbt-8', 9, 'Customer Payment', 'PYMT1851', 'Tailspin Toys', 'INV-10477', 7890.0],
    ['nbt-9', 6, 'Bill Payment', 'BP-3334', 'Relecloud', 'Cloud hosting — October', -9800.0],
    ['nbt-10', 2, 'Check', '10240', 'City Power & Light', 'Electricity — Sept', -2316.4],
    ['nbt-11', 1, 'Deposit', 'DEP-0921', 'Wide World Importers', 'Deposit in transit', 5400.0],
  ].map(([id, days, type, number, name, memo, amount]) => ({ id, date: daysAgo(days as number), type, number, name, memo, amount, status: 'unmatched' }))

  return { bills, journals, bankLines, bookTxns }
}

export function seed(): Collections {
  const sap = sapData()
  const concur = concurData()
  const coupa = coupaData()
  const ns = netsuiteData()
  const sofia = person('sofia')
  return {
    'sap.suppliers': sap.suppliers,
    'sap.pos': sap.pos,
    'sap.invoices': sap.invoices,
    'sap.journals': sap.journals,
    'concur.transactions': concur.transactions,
    'concur.reports': concur.reports,
    'concur.expenses': concur.expenses,
    'coupa.catalog': coupa.catalog as any,
    'coupa.requisitions': coupa.requisitions,
    'coupa.invoices': coupa.invoices,
    'netsuite.bills': ns.bills,
    'netsuite.journals': ns.journals,
    'netsuite.bankLines': ns.bankLines as any,
    'netsuite.bookTxns': ns.bookTxns as any,
    'outlook.emails': [
      {
        id: 'em-sofia-bankrec',
        folder: 'inbox',
        from: { name: sofia.name, email: sofia.email },
        to: [ME.email],
        subject: 'October close — Woodgrove operating account rec',
        body: `Hi Alex,\n\nAs part of the October soft close, could you reconcile the Woodgrove operating account (••••4410) in NetSuite against the bank feed through yesterday?\n\nPlease book anything that hit the bank but not the books (fees, interest) and flag any variances you can't clear so I can follow up before Friday.\n\nThanks!\nSofia\n\nSofia Martinez | Finance Manager\nNorthwind Global`,
        date: hoursAgo(7),
        read: true,
        category: 'Finance',
      },
      {
        id: 'em-james-laptops',
        folder: 'inbox',
        from: { name: person('james').name, email: person('james').email },
        to: [ME.email],
        cc: [person('oliver').email],
        subject: 'Hardware for the November Ops hires',
        body: `Hi Alex,\n\nBesides Jordan (starting Monday), we have two more Operations Analysts joining on Nov 3. IT confirmed the standard kit is the Dell Latitude 7450 + a 27" UltraSharp monitor.\n\nCould you raise the Coupa requisition for all three so it lands before the start dates?\n\nThanks,\nJames`,
        date: hoursAgo(9),
        read: true,
      },
    ],
  }
}

