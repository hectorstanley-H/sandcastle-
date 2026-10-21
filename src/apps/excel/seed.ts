/**
 * Excel seed.
 *
 * excel.workbooks: {
 *   id, name, modified (ISO), author (person id), createdBy?: 'hworker', updatedBy?: 'hworker',
 *   sheets: { name, cells: Record<'A1', Cell>, colWidths?: Record<'A', px>, charts?: Chart[], tables?: { range, style }[], freezeRow?: number, tabColor?: string }[]
 * }
 * Cell: { v?: string|number, f?: '=SUM(B2:B7)', bold?, italic?, fmt?: 'general'|'number'|'int'|'currency'|'currency2'|'percent'|'date', fill?, color?, align?: 'left'|'center'|'right' }
 * Chart: { id, type: 'column', range: 'A1:C7', title, col: number, row: number, w, h, createdBy? }
 */
import { daysAgo, hoursAgo } from '@/data/time'

export type CellFmt = 'general' | 'number' | 'int' | 'currency' | 'currency2' | 'percent' | 'date'
export interface Cell {
  v?: string | number
  f?: string
  bold?: boolean
  italic?: boolean
  fmt?: CellFmt
  fill?: string
  color?: string
  align?: 'left' | 'center' | 'right'
}
export interface Chart {
  id: string
  type: 'column'
  range: string
  title: string
  col: number
  row: number
  w: number
  h: number
  createdBy?: string
}
export interface Sheet {
  name: string
  cells: Record<string, Cell>
  colWidths?: Record<string, number>
  charts?: Chart[]
  tables?: { range: string; style: string }[]
  freezeRow?: number
  tabColor?: string
}
export interface Workbook {
  id: string
  name: string
  modified: string
  author: string
  sheets: Sheet[]
  createdBy?: string
  updatedBy?: string
}

const COLS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const HDR: Cell = { bold: true, fill: '#DDEBF7' }

/** build a sheet from a header row + rows (arrays). Formulas are strings starting with "=". */
function table(
  header: string[],
  rows: (string | number | null)[][],
  opts: { fmts?: (CellFmt | undefined)[]; start?: number; headerStyle?: Cell } = {},
): Record<string, Cell> {
  const cells: Record<string, Cell> = {}
  const start = opts.start ?? 1
  header.forEach((h, c) => (cells[`${COLS[c]}${start}`] = { v: h, ...(opts.headerStyle ?? HDR) }))
  rows.forEach((row, r) =>
    row.forEach((val, c) => {
      if (val === null || val === undefined || val === '') return
      const ref = `${COLS[c]}${start + 1 + r}`
      const fmt = opts.fmts?.[c]
      if (typeof val === 'string' && val.startsWith('=')) cells[ref] = { f: val, ...(fmt ? { fmt } : {}) }
      else cells[ref] = { v: val, ...(fmt ? { fmt } : {}) }
    }),
  )
  return cells
}

/* ───────────── Vendor Spend FY25 ───────────── */

export const VENDOR_CATEGORIES = [
  'Logistics & Freight',
  'IT & Software',
  'Facilities & Maintenance',
  'Professional Services',
  'Marketing Services',
  'Office & Supplies',
] as const

/** Q3 actuals per vendor + Q3 budget per category (vendor budgets are derived). */
export const VENDORS: { vendor: string; category: string; contract: string; q3: number; q1f: number; q2f: number }[] = [
  { vendor: 'Wide World Importers', category: 'Logistics & Freight', contract: 'MSA-2023-014', q3: 486200, q1f: 0.84, q2f: 0.91 },
  { vendor: 'Blue Yonder Airlines', category: 'Logistics & Freight', contract: 'MSA-2022-031', q3: 312450, q1f: 0.9, q2f: 0.95 },
  { vendor: 'Consolidated Messenger', category: 'Logistics & Freight', contract: 'SOW-2024-102', q3: 228900, q1f: 0.93, q2f: 0.97 },
  { vendor: 'Adventure Works Freight', category: 'Logistics & Freight', contract: 'MSA-2024-007', q3: 196300, q1f: 0.88, q2f: 0.92 },
  { vendor: 'Tailspin Freight Co.', category: 'Logistics & Freight', contract: 'PO 4500017720', q3: 156150, q1f: 0.97, q2f: 1.01 },
  { vendor: 'Litware Inc.', category: 'IT & Software', contract: 'EA-2023-448', q3: 214500, q1f: 0.82, q2f: 0.86 },
  { vendor: 'Relecloud', category: 'IT & Software', contract: 'EA-2024-019', q3: 182700, q1f: 0.95, q2f: 0.98 },
  { vendor: 'Proseware, Inc.', category: 'IT & Software', contract: 'SUB-2024-233', q3: 129000, q1f: 1.0, q2f: 1.0 },
  { vendor: 'The Phone Company', category: 'IT & Software', contract: 'MSA-2021-090', q3: 96800, q1f: 1.02, q2f: 0.99 },
  { vendor: 'Coho Data Services', category: 'IT & Software', contract: 'SOW-2025-011', q3: 61000, q1f: 0.7, q2f: 0.85 },
  { vendor: 'Fabrikam Supplies', category: 'Facilities & Maintenance', contract: 'PO 4500018234', q3: 171000, q1f: 0.98, q2f: 1.0 },
  { vendor: 'City Power & Light', category: 'Facilities & Maintenance', contract: 'Utility', q3: 118600, q1f: 0.86, q2f: 0.94 },
  { vendor: 'Wingtip Facility Services', category: 'Facilities & Maintenance', contract: 'MSA-2022-118', q3: 84000, q1f: 1.0, q2f: 1.0 },
  { vendor: 'Fourth Coffee', category: 'Facilities & Maintenance', contract: 'PO 4500017981', q3: 38400, q1f: 0.96, q2f: 1.04 },
  { vendor: 'Trey Research', category: 'Professional Services', contract: 'SOW-2025-004', q3: 118000, q1f: 1.21, q2f: 1.12 },
  { vendor: 'First Up Consultants', category: 'Professional Services', contract: 'SOW-2024-188', q3: 96500, q1f: 1.08, q2f: 1.03 },
  { vendor: "Margie's Travel", category: 'Professional Services', contract: 'MSA-2023-062', q3: 52300, q1f: 0.92, q2f: 1.1 },
  { vendor: 'Humongous Insurance', category: 'Professional Services', contract: 'Policy 77-4410', q3: 29200, q1f: 1.0, q2f: 1.0 },
  { vendor: 'Lucerne Publishing', category: 'Marketing Services', contract: 'SOW-2025-021', q3: 88400, q1f: 0.79, q2f: 0.9 },
  { vendor: 'Southridge Video', category: 'Marketing Services', contract: 'SOW-2025-030', q3: 61000, q1f: 0.64, q2f: 0.88 },
  { vendor: 'Graphic Design Institute', category: 'Marketing Services', contract: 'PO 4500018011', q3: 46600, q1f: 1.05, q2f: 0.97 },
  { vendor: 'Nod Publishers', category: 'Marketing Services', contract: 'PO 4500018102', q3: 45000, q1f: 0.91, q2f: 0.96 },
  { vendor: 'VanArsdel Ltd.', category: 'Office & Supplies', contract: 'PO 4500017655', q3: 54600, q1f: 1.18, q2f: 1.05 },
  { vendor: "Munson's Office Supply", category: 'Office & Supplies', contract: 'PO 4500017902', q3: 38900, q1f: 1.02, q2f: 0.98 },
  { vendor: 'Best For You Organics', category: 'Office & Supplies', contract: 'PO 4500018140', q3: 24500, q1f: 0.95, q2f: 1.0 },
]

export const CATEGORY_BUDGET_Q3: Record<string, number> = {
  'Logistics & Freight': 1273000,
  'IT & Software': 657000,
  'Facilities & Maintenance': 417000,
  'Professional Services': 336000,
  'Marketing Services': 228000,
  'Office & Supplies': 122000,
}

/** vendor-level Q3 budgets that sum exactly to the category budget */
function vendorBudgets() {
  const out = new Map<string, number>()
  for (const cat of VENDOR_CATEGORIES) {
    const vs = VENDORS.filter((v) => v.category === cat)
    const act = vs.reduce((s, v) => s + v.q3, 0)
    const bud = CATEGORY_BUDGET_Q3[cat]
    let used = 0
    vs.forEach((v, i) => {
      // Wide World + Litware are the big overruns; spread the rest proportionally
      const skew = v.vendor === 'Wide World Importers' ? 0.86 : v.vendor === 'Litware Inc.' ? 0.9 : 1
      const b = i === vs.length - 1 ? bud - used : Math.round((v.q3 * (bud / act) * skew) / 100) * 100
      used += b
      out.set(v.vendor, b)
    })
  }
  return out
}

function vendorSpendWorkbook() {
  const budgets = vendorBudgets()
  const rows = VENDORS.map((v, i) => {
    const r = i + 2
    return [
      v.vendor,
      v.category,
      v.contract,
      Math.round((v.q3 * v.q1f) / 10) * 10,
      Math.round((v.q3 * v.q2f) / 10) * 10,
      v.q3,
      budgets.get(v.vendor)!,
      `=SUM(D${r}:F${r})`,
      `=F${r}-G${r}`,
    ] as (string | number)[]
  })
  const last = VENDORS.length + 1
  const totalRow = last + 1
  const detail = table(
    ['Vendor', 'Category', 'Contract / PO', 'Q1 Actual', 'Q2 Actual', 'Q3 Actual', 'Q3 Budget', 'YTD Actual', 'Q3 Variance'],
    rows,
    { fmts: [undefined, undefined, undefined, 'currency', 'currency', 'currency', 'currency', 'currency', 'currency'] },
  )
  detail[`A${totalRow}`] = { v: 'Total', bold: true }
  for (const c of 'DEFGHI') detail[`${c}${totalRow}`] = { f: `=SUM(${c}2:${c}${last})`, fmt: 'currency', bold: true }

  const budgetRows = VENDOR_CATEGORIES.map((cat, i) => {
    const b = CATEGORY_BUDGET_Q3[cat]
    const r = i + 2
    return [cat, Math.round(b * 0.94 / 1000) * 1000, Math.round(b * 0.97 / 1000) * 1000, b, Math.round(b * 1.02 / 1000) * 1000, `=SUM(B${r}:E${r})`]
  })
  const budget = table(['Category', 'Q1 Budget', 'Q2 Budget', 'Q3 Budget', 'Q4 Budget', 'FY25 Budget'], budgetRows, {
    fmts: [undefined, 'currency', 'currency', 'currency', 'currency', 'currency'],
  })
  budget.A8 = { v: 'Total', bold: true }
  for (const c of 'BCDEF') budget[`${c}8`] = { f: `=SUM(${c}2:${c}7)`, fmt: 'currency', bold: true }
  budget.A10 = { v: 'Source: FY25 Operating Plan v4 (approved by Marcus Lee, Jan 14)', italic: true, color: '#595959' }

  const notes: Record<string, Cell> = {
    A1: { v: 'Vendor Spend FY25 — notes', bold: true },
    A3: { v: 'Data source: SAP S/4HANA (company code 1010), posted invoices by vendor, refreshed weekly.' },
    A4: { v: 'Q3 = Jul 1 – Sep 30. Amounts in USD, excluding tax.' },
    A5: { v: 'Wide World Importers: peak-season surcharge (+11%) applied from Aug 4 per contract amendment #3.' },
    A6: { v: 'Litware Inc.: Q3 includes the annual license true-up ($28.4K) invoiced Sep 12.' },
    A7: { v: 'Trey Research SOW-2025-004 wound down in Q2; remaining work moved in-house.' },
    A9: { v: 'Owner: Alex Morgan · Reviewers: Priya Raman, Sofia Martinez' },
  }

  return {
    id: 'wb-vendor-spend',
    name: 'Vendor Spend FY25.xlsx',
    modified: daysAgo(1, 16, 12),
    author: 'alex',
    sheets: [
      { name: 'Spend by Vendor', cells: detail, colWidths: { A: 186, B: 168, C: 112, D: 96, E: 96, F: 96, G: 96, H: 104, I: 100 }, freezeRow: 1 },
      { name: 'Budget', cells: budget, colWidths: { A: 176, B: 100, C: 100, D: 100, E: 100, F: 108 } },
      { name: 'Notes', cells: notes, colWidths: { A: 120 } },
    ],
  }
}

/* ───────────── Q4 Staffing Plan ───────────── */
function staffingWorkbook() {
  const roles: [string, string, string, number, number, number][] = [
    ['Operations Analyst', 'Operations', 'Boston, MA', 4, 5, 78000],
    ['Operations Coordinator', 'Operations', 'Boston, MA', 3, 3, 62000],
    ['Warehouse Associate', 'Fulfillment', 'Columbus, OH', 42, 58, 41500],
    ['Warehouse Lead', 'Fulfillment', 'Columbus, OH', 6, 7, 56000],
    ['Forklift Operator', 'Fulfillment', 'Columbus, OH', 11, 14, 46000],
    ['Warehouse Associate', 'Fulfillment', 'Reno, NV', 28, 36, 43000],
    ['Shift Supervisor', 'Fulfillment', 'Reno, NV', 4, 5, 61000],
    ['Inventory Control Specialist', 'Fulfillment', 'Reno, NV', 3, 4, 52000],
    ['Customer Service Rep', 'Customer Success', 'Chicago, IL', 18, 22, 48000],
    ['Transportation Planner', 'Logistics', 'Boston, MA', 2, 3, 74000],
    ['Procurement Specialist', 'Finance', 'Chicago, IL', 2, 2, 69000],
    ['Seasonal Associate (temp)', 'Fulfillment', 'Columbus, OH', 0, 45, 18500],
    ['Seasonal Associate (temp)', 'Fulfillment', 'Reno, NV', 0, 30, 18500],
  ]
  const rows = roles.map((r, i) => {
    const n = i + 2
    return [r[0], r[1], r[2], r[3], r[4], `=E${n}-D${n}`, r[5], `=E${n}*G${n}/4`]
  })
  const cells = table(['Role', 'Team', 'Location', 'Current HC', 'Q4 Plan', 'Open Reqs', 'Avg Annual Cost', 'Q4 Cost'], rows, {
    fmts: [undefined, undefined, undefined, 'int', 'int', 'int', 'currency', 'currency'],
  })
  const t = roles.length + 2
  cells[`A${t}`] = { v: 'Total', bold: true }
  for (const c of 'DEFH') cells[`${c}${t}`] = { f: `=SUM(${c}2:${c}${t - 1})`, fmt: c === 'H' ? 'currency' : 'int', bold: true }
  cells[`A${t + 2}`] = { v: 'Peak season ramp: seasonal temps start Nov 3 (Columbus) and Nov 10 (Reno).', italic: true, color: '#595959' }
  return {
    id: 'wb-staffing',
    name: 'Q4 Staffing Plan.xlsx',
    modified: daysAgo(1, 11, 15),
    author: 'priya',
    sheets: [
      { name: 'Plan', cells, colWidths: { A: 200, B: 120, C: 112, D: 86, E: 80, F: 80, G: 112, H: 110 }, freezeRow: 1 },
      { name: 'Assumptions', cells: { A1: { v: 'Assumptions', bold: true }, A2: { v: 'Fully loaded cost = base × 1.28' }, A3: { v: 'Temp agency: Margie’s Staffing, $18.50/hr blended' }, A4: { v: 'Attrition assumption: 4.5% / quarter (fulfillment)' } }, colWidths: { A: 120 } },
    ],
  }
}

/* ───────────── Warehouse SLA (September) ───────────── */
export const WAREHOUSE_SLA = [
  ['Columbus, OH (CMH1)', 48210, 47402, 0.98],
  ['Reno, NV (RNO2)', 39880, 38602, 0.98],
  ['Allentown, PA (ABE1)', 31455, 30712, 0.98],
  ['Dallas, TX (DFW3)', 27630, 26442, 0.98],
  ['Atlanta, GA (ATL1)', 22104, 21840, 0.98],
  ['Ontario, CA (ONT2)', 35760, 34118, 0.98],
  ['Joliet, IL (ORD4)', 18920, 18736, 0.98],
] as const

function slaWorkbook() {
  const rows = WAREHOUSE_SLA.map((w, i) => {
    const n = i + 2
    return [w[0], w[1], w[2], `=C${n}/B${n}`, w[3], `=IF(D${n}>=E${n},"Met","Missed")`, `=B${n}-C${n}`]
  })
  const cells = table(['Site', 'Orders', 'Shipped on time', 'SLA %', 'Target', 'Status', 'Late orders'], rows, {
    fmts: [undefined, 'int', 'int', 'percent', 'percent', undefined, 'int'],
  })
  cells.A9 = { v: 'Network', bold: true }
  cells.B9 = { f: '=SUM(B2:B8)', fmt: 'int', bold: true }
  cells.C9 = { f: '=SUM(C2:C8)', fmt: 'int', bold: true }
  cells.D9 = { f: '=C9/B9', fmt: 'percent', bold: true }
  cells.E9 = { v: 0.98, fmt: 'percent', bold: true }
  cells.F9 = { f: '=IF(D9>=E9,"Met","Missed")', bold: true }
  cells.G9 = { f: '=SUM(G2:G8)', fmt: 'int', bold: true }
  cells.A11 = { v: 'September 2025 · Source: WMS (Manhattan Active) export, carrier scans', italic: true, color: '#595959' }
  return {
    id: 'wb-warehouse-sla',
    name: 'Warehouse_SLA_Sep.xlsx',
    modified: daysAgo(2, 16, 45),
    author: 'ben',
    sheets: [{ name: 'Sep SLA', cells, colWidths: { A: 176, B: 84, C: 120, D: 76, E: 70, F: 76, G: 90 }, freezeRow: 1, tabColor: '#107C41' }],
  }
}

/* ───────────── FY26 Budget template ───────────── */
function budgetTemplate() {
  const lines: [string, number, number][] = [
    ['Salaries & wages', 4820000, 5140000],
    ['Benefits & payroll tax', 1302000, 1388000],
    ['Temporary labor', 612000, 640000],
    ['Freight & logistics', 5140000, 5395000],
    ['Facilities & rent', 1668000, 1712000],
    ['Utilities', 462000, 478000],
    ['IT & software', 2604000, 2790000],
    ['Professional services', 1286000, 1100000],
    ['Travel & entertainment', 214000, 205000],
    ['Office & supplies', 468000, 455000],
    ['Training & development', 96000, 132000],
    ['Equipment (opex)', 318000, 360000],
  ]
  const rows = lines.map((l, i) => {
    const n = i + 2
    return [l[0], l[1], l[2], `=C${n}-B${n}`, `=IF(B${n}=0,0,D${n}/B${n})`, '']
  })
  const cells = table(['Operations — cost line', 'FY25 Forecast', 'FY26 Request', '$ Change', '% Change', 'Justification'], rows, {
    fmts: [undefined, 'currency', 'currency', 'currency', 'percent', undefined],
  })
  const t = lines.length + 2
  cells[`A${t}`] = { v: 'Total Operations', bold: true }
  for (const c of 'BCD') cells[`${c}${t}`] = { f: `=SUM(${c}2:${c}${t - 1})`, fmt: 'currency', bold: true }
  cells[`E${t}`] = { f: `=D${t}/B${t}`, fmt: 'percent', bold: true }
  cells.F8 = { v: 'Trey Research SOW ends; analytics moved in-house' }
  cells.F12 = { v: 'Analyst upskilling (SQL / Power BI)' }
  return {
    id: 'wb-fy26-budget',
    name: 'FY26_Budget_Template.xlsx',
    modified: daysAgo(4, 9, 40),
    author: 'sofia',
    sheets: [
      { name: 'Operations', cells, colWidths: { A: 210, B: 112, C: 112, D: 104, E: 84, F: 300 }, freezeRow: 1, tabColor: '#C55A11' },
      { name: 'Finance', cells: table(['Finance — cost line', 'FY25 Forecast', 'FY26 Request'], [['Salaries & wages', 3120000, 3260000], ['Audit & tax', 410000, 425000], ['Software', 388000, 402000]], { fmts: [undefined, 'currency', 'currency'] }), colWidths: { A: 200, B: 112, C: 112 } },
      { name: 'Instructions', cells: { A1: { v: 'FY26 budget submission', bold: true }, A2: { v: 'Fill in the FY26 Request column for your department and add a short justification for any change above 5%.' }, A3: { v: 'Due: Wednesday EOD · Questions: Sofia Martinez (Finance)' } }, colWidths: { A: 120 } },
    ],
  }
}

function opsMetrics() {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep']
  const orders = [52140, 49880, 56210, 55870, 58340, 60120, 61480, 63950, 60318]
  const rows = months.map((m, i) => {
    const n = i + 2
    return [m, orders[i], Math.round(orders[i] * (0.948 + i * 0.0018)), `=C${n}/B${n}`, Math.round(4.62 - i * 0.05 * 100) / 100]
  })
  const cells = table(['Month', 'Orders', 'On-time', 'OTD %', 'Cost / order'], rows, { fmts: [undefined, 'int', 'int', 'percent', 'currency2'] })
  return {
    id: 'wb-ops-metrics',
    name: 'Ops Metrics 2025.xlsx',
    modified: daysAgo(6, 14, 5),
    author: 'ben',
    sheets: [{ name: 'Monthly', cells, colWidths: { A: 80, B: 90, C: 90, D: 80, E: 96 } }],
  }
}

export function excelSeed() {
  return {
    'excel.workbooks': [vendorSpendWorkbook(), staffingWorkbook(), slaWorkbook(), budgetTemplate(), opsMetrics()],
    files: [
      { id: 'f-m365-ops-metrics', name: 'Ops Metrics 2025.xlsx', folder: 'Documents', kind: 'xlsx', size: '96 KB', modified: daysAgo(6, 14, 5), open: { appId: 'excel', params: { workbookId: 'wb-ops-metrics' } } },
      { id: 'f-m365-fy26-budget', name: 'FY26_Budget_Template.xlsx', folder: 'Downloads', kind: 'xlsx', size: '58 KB', modified: hoursAgo(30), open: { appId: 'excel', params: { workbookId: 'wb-fy26-budget' } } },
    ],
  }
}
