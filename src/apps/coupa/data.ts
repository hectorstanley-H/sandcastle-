/** Coupa domain logic: approvals, purchase orders, invoices, suppliers, notifications. */
import { db, uid } from '@/db/db'
import { ME, person } from '@/data/people'

export type View =
  | { v: 'home' }
  | { v: 'search'; q: string; supplier?: string }
  | { v: 'item'; id: string }
  | { v: 'cart' }
  | { v: 'checkout' }
  | { v: 'req'; id: string }
  | { v: 'reqs' }
  | { v: 'approvals' }
  | { v: 'invoices' }
  | { v: 'invoice'; id: string }
  | { v: 'orders' }
  | { v: 'po'; id: string }
  | { v: 'suppliers' }
  | { v: 'supplier'; name: string }
  | { v: 'form'; form: string }
  | { v: 'profile' }

export type Go = (v: View) => void

export function approvalChain(commodity: string, total: number) {
  const chain = [{ name: person('priya').name, role: 'Cost Center Owner (6105)', status: 'pending' }]
  if (commodity === 'IT Hardware' || commodity === 'Software') chain.push({ name: person('grace').name, role: 'IT Commodity Approver', status: 'waiting' })
  if (total > 5000) chain.push({ name: person('sofia').name, role: 'Finance (> $5,000)', status: 'waiting' })
  if (total > 25000) chain.push({ name: person('marcus').name, role: 'CFO (> $25,000)', status: 'waiting' })
  return chain
}

const now = () => new Date().toISOString()
const log = (r: any, text: string, who = ME.name) => [...(r.history ?? []), { at: now(), who, text }]

/** the approver whose turn it is */
export const pendingApprover = (r: any) => (r.approvals ?? []).find((a: any) => a.status === 'pending')
export const awaitingMe = (r: any) => r.status === 'Pending Approval' && pendingApprover(r)?.name === ME.name

/* ───────────── requisitions ───────────── */

export function nextPoNumber() {
  const nums = [...db.get<any>('coupa.requisitions').map((r) => r.poNumber), ...db.get<any>('coupa.invoices').map((i) => i.poNumber)]
    .map((p) => Number(String(p ?? '').replace('PO-', '')) || 0)
  return `PO-${Math.max(11850, ...nums) + 3}`
}

export function decideReq(id: string, decision: 'approved' | 'rejected', comment?: string) {
  db.update('coupa.requisitions', id, (r) => {
    const idx = (r.approvals ?? []).findIndex((a: any) => a.status === 'pending')
    if (idx < 0) return {}
    const approvals = r.approvals.map((a: any, i: number) => (i === idx ? { ...a, status: decision, at: now(), comment } : a))
    const who = r.approvals[idx].name
    if (decision === 'rejected') return { approvals, status: 'Rejected', history: log(r, `Rejected${comment ? `: “${comment}”` : ''}`, who) }
    const next = approvals.findIndex((a: any) => a.status === 'waiting')
    if (next >= 0) {
      approvals[next] = { ...approvals[next], status: 'pending' }
      return { approvals, history: log(r, `Approved — routed to ${approvals[next].name}`, who) }
    }
    const poNumber = nextPoNumber()
    return {
      approvals,
      status: 'Ordered',
      poNumber,
      orderedAt: now(),
      history: [...log(r, 'Approved (final approval)', who), { at: now(), who: 'Coupa', text: `Purchase order ${poNumber} issued to ${r.lines?.[0]?.supplier ?? 'supplier'}` }],
    }
  })
}

export function withdrawReq(id: string) {
  db.update('coupa.requisitions', id, (r) => ({
    status: 'Withdrawn',
    approvals: (r.approvals ?? []).map((a: any) => (a.status === 'pending' ? { ...a, status: 'waiting' } : a)),
    history: log(r, 'Withdrawn from approval by requester'),
  }))
}

export function commentReq(id: string, text: string) {
  db.update('coupa.requisitions', id, (r) => ({ comments: [...(r.comments ?? []), { id: uid('cc'), who: ME.name, at: now(), text }] }))
}

/* ───────────── purchase orders (derived from ordered requisitions + persisted state) ───────────── */

export interface PO {
  id: string
  reqId: string
  reqNumber: string
  supplier: string
  lines: any[]
  total: number
  shipTo: string
  needBy: string
  requester: string
  costCenter: string
  createdAt: string
  status: string
  receipts: { at: string; who: string; lines: { name: string; qty: number }[] }[]
  history: any[]
}

export function buildPOs(reqs: any[], state: any[]): PO[] {
  return reqs
    .filter((r) => r.poNumber)
    .map((r) => {
      const st = state.find((s) => s.id === r.poNumber) ?? {}
      const suppliers = [...new Set((r.lines ?? []).map((l: any) => l.supplier))]
      return {
        id: r.poNumber,
        reqId: r.id,
        reqNumber: r.number,
        supplier: (suppliers[0] as string) ?? '—',
        lines: r.lines ?? [],
        total: r.total,
        shipTo: r.shipTo,
        needBy: r.needBy,
        requester: r.requestedBy,
        costCenter: r.costCenter,
        createdAt: r.orderedAt ?? r.submittedAt,
        status: st.status ?? 'Issued',
        receipts: st.receipts ?? [],
        history: st.history ?? [],
      }
    })
    .sort((a, b) => (a.id < b.id ? 1 : -1))
}

export function setPoState(po: PO, patch: any, text: string) {
  const cur = db.get<any>('coupa.orders').find((o) => o.id === po.id)
  db.upsert('coupa.orders', { id: po.id, status: po.status, receipts: po.receipts, ...cur, ...patch, history: [...(cur?.history ?? []), { at: now(), who: ME.name, text }] })
}

export function receivePo(po: PO) {
  const receipt = { at: now(), who: ME.name, lines: po.lines.map((l) => ({ name: l.name, qty: l.qty })) }
  setPoState(po, { status: 'Received', receipts: [...po.receipts, receipt] }, `Received ${po.lines.reduce((t, l) => t + l.qty, 0)} unit(s)`)
  // invoices waiting on this receipt can now be approved
  for (const inv of db.get<any>('coupa.invoices').filter((i) => i.poNumber === po.id && i.status === 'Pending Receipt')) {
    decideInvoiceStatus(inv.id, 'Pending Approval', `Receipt recorded on ${po.id}`)
  }
}

/* ───────────── invoices ───────────── */

export function decideInvoiceStatus(id: string, status: string, text: string, extra: any = {}) {
  db.update('coupa.invoices', id, (i) => ({ status, ...extra, history: log(i, text) }))
}

export function commentInvoice(id: string, text: string) {
  db.update('coupa.invoices', id, (i) => ({ comments: [...(i.comments ?? []), { id: uid('ic'), who: ME.name, at: now(), text }] }))
}

/* ───────────── suppliers ───────────── */

export interface SupplierInfo {
  name: string
  number: string
  contact: string
  email: string
  phone: string
  city: string
  terms: string
  category: string
  rating: number
  since: string
  diversity?: string
  contract?: string
  punchout?: boolean
}

export const SUPPLIERS: SupplierInfo[] = [
  { name: 'Dell Technologies', number: 'S-10021', contact: 'Rachel Moore', email: 'premier-orders@dell.com', phone: '+1 (800) 456-3355', city: 'Round Rock, TX', terms: 'Net 30', category: 'IT Hardware', rating: 4.7, since: '2019', contract: 'NWG-DEL-2026', punchout: true },
  { name: 'CDW', number: 'S-10044', contact: 'Tyler Brandt', email: 'northwind@cdw.com', phone: '+1 (800) 800-4239', city: 'Vernon Hills, IL', terms: 'Net 30', category: 'IT Hardware & Software', rating: 4.5, since: '2020', contract: 'NWG-CDW-2026', punchout: true },
  { name: 'Staples', number: 'S-10007', contact: 'Dana Whitfield', email: 'advantage@staples.com', phone: '+1 (877) 826-7755', city: 'Framingham, MA', terms: 'Net 45', category: 'Office Supplies & Furniture', rating: 4.3, since: '2017', contract: 'NWG-STA-2026', punchout: true },
  { name: 'Amazon Business', number: 'S-10102', contact: 'Account Team', email: 'business-orders@amazon.com', phone: '+1 (888) 281-3847', city: 'Seattle, WA', terms: 'Net 30', category: 'General Merchandise', rating: 4.1, since: '2022', punchout: true },
  { name: 'Grainger', number: 'S-10088', contact: 'Luis Ortega', email: 'kam.northwind@grainger.com', phone: '+1 (800) 472-4643', city: 'Lake Forest, IL', terms: 'Net 30', category: 'MRO & Facilities', rating: 4.4, since: '2021', punchout: true },
  { name: 'Insight', number: 'S-10093', contact: 'Priyanka Shah', email: 'northwind@insight.com', phone: '+1 (800) 467-4448', city: 'Chandler, AZ', terms: 'Net 30', category: 'IT Services', rating: 4.2, since: '2023', punchout: true },
  { name: 'Fourth Coffee', number: 'S-10131', contact: 'Marta Ruiz', email: 'orders@fourthcoffee.com', phone: '+1 (617) 555-0142', city: 'Boston, MA', terms: 'Net 15', category: 'Pantry', rating: 4.8, since: '2021', diversity: 'Woman-owned small business', contract: 'NWG-FOU-2026' },
  { name: 'Northwind Traders', number: 'S-10003', contact: 'Owen Price', email: 'ar@northwindtraders.com', phone: '+1 (206) 555-0177', city: 'Seattle, WA', terms: 'Net 30', category: 'Security & Facilities', rating: 4.0, since: '2016', contract: 'NWG-NOR-2026' },
]

export function supplierInfo(name: string): SupplierInfo {
  return (
    SUPPLIERS.find((s) => s.name === name) ??
    db.get<any>('coupa.supplierRequests').find((s) => s.name === name) ?? { name, number: '—', contact: '—', email: '—', phone: '—', city: '—', terms: 'Net 30', category: '—', rating: 0, since: '—' }
  )
}

/* ───────────── notifications + prefs ───────────── */

export const PREFS_ID = 'me'
export const usePrefsDefaults = { readNotifs: [] as string[], emailApprovals: true, emailOrders: true, emailInvoices: false, delegate: '', language: 'English (US)' }

export function patchPrefs(patch: any) {
  const cur = db.get<any>('coupa.prefs').find((p) => p.id === PREFS_ID)
  db.upsert('coupa.prefs', { ...usePrefsDefaults, ...cur, ...patch, id: PREFS_ID })
}

export interface Notif { id: string; title: string; body: string; at: string; go: View }

export function buildNotifs(reqs: any[], invoices: any[]): Notif[] {
  const out: Notif[] = []
  for (const r of reqs) {
    if (awaitingMe(r)) out.push({ id: `appr-${r.id}`, title: `Requisition #${r.number} needs your approval`, body: `${r.title} · ${r.requestedBy}`, at: r.submittedAt, go: { v: 'req', id: r.id } })
    if (r.requestedBy === ME.name && ['Ordered', 'Approved', 'Rejected'].includes(r.status)) {
      const last = (r.approvals ?? []).filter((a: any) => a.at).map((a: any) => a.at).sort().pop() ?? r.submittedAt
      out.push({ id: `req-${r.id}-${r.status}`, title: `Requisition #${r.number} was ${r.status.toLowerCase()}`, body: r.poNumber ? `${r.title} · ${r.poNumber}` : r.title, at: r.orderedAt ?? last, go: { v: 'req', id: r.id } })
    }
  }
  for (const i of invoices) {
    if (i.status === 'Disputed') out.push({ id: `inv-${i.id}-disp`, title: `Invoice ${i.number} is disputed`, body: `${i.supplier} · ${i.poNumber}`, at: i.date, go: { v: 'invoice', id: i.id } })
    if (i.status === 'Pending Approval') out.push({ id: `inv-${i.id}-appr`, title: `Invoice ${i.number} is waiting for approval`, body: `${i.supplier} · ${i.poNumber}`, at: i.date, go: { v: 'invoice', id: i.id } })
  }
  return out.sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 12)
}

export const FORMS: { id: string; title: string; desc: string; fields: [string, string, 'text' | 'textarea' | 'number' | 'date' | 'select', string[]?][] }[] = [
  { id: 'new-supplier', title: 'Request a new supplier', desc: 'Ask Procurement to onboard a supplier that is not in Coupa yet.', fields: [['name', 'Supplier name', 'text'], ['email', 'Supplier contact email', 'text'], ['category', 'Category', 'select', ['IT Hardware', 'Software', 'Office Supplies', 'Facilities', 'Professional Services', 'Marketing']], ['spend', 'Estimated annual spend (USD)', 'number'], ['reason', 'Why is this supplier needed?', 'textarea']] },
  { id: 'software-access', title: 'Software access request', desc: 'Licenses or seats for a SaaS tool.', fields: [['tool', 'Application', 'text'], ['seats', 'Number of seats', 'number'], ['users', 'Users (names or emails)', 'textarea'], ['reason', 'Business justification', 'textarea']] },
  { id: 'sow', title: 'Professional services SOW', desc: 'Engage a consultancy or agency under a statement of work.', fields: [['vendor', 'Vendor', 'text'], ['amount', 'Not-to-exceed amount (USD)', 'number'], ['start', 'Start date', 'date'], ['scope', 'Scope of work', 'textarea']] },
  { id: 'contractor', title: 'Contractor onboarding', desc: 'Bring a contingent worker on board.', fields: [['name', 'Contractor name', 'text'], ['agency', 'Agency', 'text'], ['start', 'Start date', 'date'], ['rate', 'Hourly rate (USD)', 'number'], ['role', 'Role & responsibilities', 'textarea']] },
  { id: 'event', title: 'Event & sponsorship request', desc: 'Conference booths, sponsorships and offsites.', fields: [['event', 'Event name', 'text'], ['date', 'Event date', 'date'], ['amount', 'Budget (USD)', 'number'], ['reason', 'Expected outcome', 'textarea']] },
]
