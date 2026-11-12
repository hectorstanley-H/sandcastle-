/** Chart of accounts (YCOA, company code 1010) + accounting helpers shared by the SAP apps. */
import { db } from '@/db/db'

export const GL_ACCOUNTS: [string, string, string][] = [
  ['113100', 'Bank — Woodgrove Operating', 'Assets'],
  ['154000', 'Input Tax', 'Assets'],
  ['171900', 'Accumulated Depreciation', 'Assets'],
  ['211000', 'Accounts Payable — Domestic', 'Liabilities'],
  ['211100', 'GR/IR Clearing', 'Liabilities'],
  ['219000', 'Accrued Liabilities', 'Liabilities'],
  ['510000', 'Raw Materials Consumption', 'Expenses'],
  ['611000', 'Office Supplies', 'Expenses'],
  ['612000', 'Facilities Maintenance', 'Expenses'],
  ['613000', 'Utilities', 'Expenses'],
  ['620000', 'Consulting Fees', 'Expenses'],
  ['640100', 'Software Licenses', 'Expenses'],
  ['640300', 'Cloud Hosting', 'Expenses'],
  ['650000', 'Salaries & Wages', 'Expenses'],
  ['651000', 'Insurance Expense', 'Expenses'],
  ['654000', 'Freight Out', 'Expenses'],
  ['660000', 'Marketing & Advertising', 'Expenses'],
  ['670000', 'Travel Expenses', 'Expenses'],
  ['676000', 'Training & Education', 'Expenses'],
  ['690000', 'Depreciation Expense', 'Expenses'],
]

export const glName = (gl: string) => GL_ACCOUNTS.find((a) => a[0] === gl)?.[1] ?? gl

export const COST_CENTERS = [
  ['10101301', 'Finance & Accounting'],
  ['10101501', 'Facilities — Boston HQ'],
  ['10101601', 'IT Operations'],
  ['10101701', 'Marketing'],
  ['10101801', 'Operations'],
]

export const CATEGORY_GL: Record<string, string> = {
  'Facilities Services': '612000',
  'Software & Licenses': '640100',
  'IT Services': '620000',
  Consulting: '620000',
  'Marketing Materials': '660000',
  'Raw Materials': '510000',
  'Office Supplies': '611000',
  'Events & Hospitality': '660000',
  'Financial Services': '113100',
  'Travel Services': '670000',
  Utilities: '613000',
  Insurance: '651000',
  Logistics: '654000',
  'Cloud Services': '640300',
  Training: '676000',
}

export const BLOCK_REASONS = ['R — Invoice verification', 'A — Blocked for payment', 'P — Payment request', 'V — Payment clearing']

export function nextId(col: string, floor: number) {
  const max = db.get<any>(col).reduce((m, r) => Math.max(m, Number(r.id) || 0), floor)
  return String(max + 1)
}

export const round2 = (n: number) => Math.round(n * 100) / 100

/** Creates the reversal journal entry for `je` and flags the original as reversed. Returns the new id. */
export function reverseJournal(je: any, reason: string, by = 'Alex Morgan') {
  const id = nextId('sap.journals', 100004500)
  const now = new Date().toISOString()
  db.insert(
    'sap.journals',
    {
      id,
      fiscalYear: je.fiscalYear ?? '2026',
      companyCode: '1010',
      type: je.type,
      typeText: `${je.typeText} (Reversal)`,
      postingDate: now,
      docDate: now,
      reference: je.reference,
      header: `Reversal of ${je.id} — ${reason}`,
      amount: je.amount,
      currency: je.currency ?? 'USD',
      reversalOf: je.id,
      sourceInvoiceId: je.sourceInvoiceId,
      lines: (je.lines ?? []).map((l: any) => ({ ...l, debit: l.credit, credit: l.debit })),
      createdByName: by,
    },
    { prepend: true },
  )
  db.update('sap.journals', je.id, { reversedBy: id, reversalReason: reason })
  return id
}
