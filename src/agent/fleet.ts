/**
 * Workforce: many headless agents working through a batch of items without showing their screens.
 * Each agent walks the template's plan with simulated timings; some hit planned issues that are either
 * recovered automatically or escalated to a person for review. Every step lands in an audit trail.
 * This is a staged simulation for the demo — single runs with a visible screen use runtime.ts.
 */
import { create } from 'zustand'
import { RATES } from './execution'
import type { PlanStep } from './types'

export type FleetStatus = 'queued' | 'running' | 'review' | 'done' | 'handed_back'

export interface Issue {
  /** step index the issue surfaces at */
  atStep: number
  /** retry = transient failure the agent recovers from itself; approval / exception = needs a person */
  kind: 'retry' | 'approval' | 'exception'
  title: string
  detail: string
  /** what the agent recommends */
  suggestion?: string
}

export interface FleetItem {
  id: string
  label: string
  sub: string
  issue?: Issue
}

export interface AuditEntry {
  t: number
  kind: 'step' | 'api' | 'code' | 'action' | 'write' | 'recover' | 'review' | 'decision' | 'done'
  text: string
  via?: PlanStep['via']
  model?: PlanStep['model']
  cost?: number
}

export interface FleetAgent {
  id: string
  name: string
  item: FleetItem
  status: FleetStatus
  step: number
  log: AuditEntry[]
  cost: number
  startedAt?: number
  endedAt?: number
  nextAt: number
  issueResolved?: boolean
  decision?: 'approved' | 'rejected' | 'taken_over'
}

export interface FleetTemplate {
  id: string
  title: string
  description: string
  apps: string[]
  unit: string
  /** minutes a person spends per item */
  personMinutes: number
  plan: PlanStep[]
  items: (n: number) => FleetItem[]
  /** audit lines produced by step i for an item; `write` lines are changes made in a system */
  detail: (item: FleetItem, i: number) => { text: string; kind?: AuditEntry['kind'] }[]
}

export interface Fleet {
  id: string
  template: FleetTemplate
  agents: FleetAgent[]
  startedAt: number
  endedAt?: number
}

/** seconds a step takes, by method */
function stepMs(s: PlanStep) {
  const r = Math.random()
  if (s.via === 'api') return 500 + r * 700
  if (s.via === 'code') return 250 + r * 350
  return (s.model === 'large' ? 3200 : 2000) + r * 2600
}
function stepCostOf(s: PlanStep) {
  if (s.via === 'api') return RATES.api * 2
  if (s.via === 'code') return 0
  const m = s.model ?? 'small'
  return (5 + Math.round(Math.random() * 6)) * RATES.action[m] + RATES.think[m]
}

interface FleetState {
  fleet?: Fleet
  speed: number
  deploy: (t: FleetTemplate, n: number) => void
  resolve: (agentId: string, decision: 'approved' | 'rejected' | 'taken_over') => void
  clear: () => void
}

let timer: number | undefined
const now = () => Date.now()

export const useFleet = create<FleetState>()((set, get) => {
  const patchAgent = (id: string, fn: (a: FleetAgent) => Partial<FleetAgent>) =>
    set((s) => (s.fleet ? { fleet: { ...s.fleet, agents: s.fleet.agents.map((a) => (a.id === id ? { ...a, ...fn(a) } : a)) } } : {}))

  const push = (a: FleetAgent, e: Omit<AuditEntry, 't'>): AuditEntry[] => [...a.log, { ...e, t: now() }]

  const tick = () => {
    const f = get().fleet
    if (!f) return
    const t = now()
    for (const a of f.agents) {
      if (t < a.nextAt) continue
      if (a.status === 'queued') {
        patchAgent(a.id, (x) => ({ status: 'running', startedAt: t, nextAt: t + 300, log: push(x, { kind: 'step', text: `Picked up ${x.item.label} · signed in via Okta SSO` }) }))
        continue
      }
      if (a.status !== 'running') continue
      const plan = f.template.plan
      // issue surfaces before this step runs
      const iss = a.item.issue
      if (iss && !a.issueResolved && a.step === iss.atStep) {
        if (iss.kind === 'retry') {
          patchAgent(a.id, (x) => ({
            issueResolved: true,
            nextAt: t + 1800 / get().speed,
            log: [...push(x, { kind: 'recover', text: `Detected: ${iss.title}` }), { t: now(), kind: 'recover', text: iss.detail }],
          }))
        } else {
          // surfaced in the Workforce review queue and as a badge on its nav item
          patchAgent(a.id, (x) => ({ status: 'review', log: push(x, { kind: 'review', text: `Escalated to Alex Morgan: ${iss.title}` }) }))
        }
        continue
      }
      if (a.step >= plan.length) {
        patchAgent(a.id, (x) => ({ status: 'done', endedAt: t, log: push(x, { kind: 'done', text: 'Task complete · audit trail sealed' }) }))
        continue
      }
      const s = plan[a.step]
      const c = stepCostOf(s)
      const lines = f.template.detail(a.item, a.step)
      patchAgent(a.id, (x) => {
        let log = push(x, { kind: 'step', text: s.text, via: s.via, model: s.model, cost: c })
        for (const l of lines) log = [...log, { t, kind: l.kind ?? (s.via === 'api' ? 'api' : s.via === 'code' ? 'code' : 'action'), text: l.text }]
        return { step: x.step + 1, cost: x.cost + c, log, nextAt: t + stepMs(s) / get().speed }
      })
    }
    const after = get().fleet!
    if (!after.endedAt && after.agents.every((a) => a.status === 'done' || a.status === 'handed_back')) {
      set({ fleet: { ...after, endedAt: now() } })
    }
  }

  return {
    speed: Number(new URLSearchParams(location.search).get('speed')) || 1,
    deploy(template, n) {
      const t0 = now()
      const agents: FleetAgent[] = template.items(n).map((item, i) => ({
        id: `fa-${t0}-${i}`,
        name: `Agent ${String(i + 1).padStart(2, '0')}`,
        item,
        status: 'queued',
        step: 0,
        log: [],
        cost: 0,
        nextAt: t0 + 400 + i * 350,
      }))
      set({ fleet: { id: `fleet-${t0}`, template, agents, startedAt: t0 } })
      if (timer) clearInterval(timer)
      timer = window.setInterval(tick, 150)
    },
    resolve(agentId, decision) {
      const t = now()
      patchAgent(agentId, (a) => {
        const text =
          decision === 'approved' ? 'Approved by Alex Morgan — agent continues' : decision === 'rejected' ? 'Rejected by Alex Morgan — no changes made, item returned to AP queue' : 'Taken over by Alex Morgan — agent stopped, context handed over'
        const log = push(a, { kind: 'decision', text })
        if (decision === 'approved') return { status: 'running', issueResolved: true, decision, log, nextAt: t + 400 }
        return { status: 'handed_back', decision, log, endedAt: t }
      })
    },
    clear() {
      if (timer) clearInterval(timer)
      timer = undefined
      set({ fleet: undefined })
    },
  }
})

/* ───────────────────────── templates ───────────────────────── */

const SUPPLIERS: [string, number][] = [
  ['Fabrikam Supplies', 14250], ['Litware Inc.', 3980], ['Contoso Logistics', 48900], ['Tailspin Toys', 2215.5], ['Proseware', 7640],
  ['Wide World Importers', 12480], ['Alpine Ski House', 1890], ['Northwind Traders', 22310], ['Coho Winery', 960.4], ['Adventure Works', 18275],
  ['Lucerne Publishing', 4120], ['Margie’s Travel', 6380], ['Trey Research', 9150], ['Woodgrove Bank', 3300], ['Blue Yonder Airlines', 15720],
  ['Humongous Insurance', 27800], ['VanArsdel Ltd.', 5445], ['Relecloud', 11990], ['Wingtip Toys', 2730], ['Bellows College', 8600],
]
const money = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const AP_ISSUES: Record<number, Issue> = {
  2: { atStep: 4, kind: 'approval', title: 'Amount above the $25,000 posting limit', detail: 'The $48,900.00 invoice matches its PO and goods receipt exactly, but the agent may only post up to $25,000 without approval.', suggestion: 'Approve posting — 3-way match is clean' },
  4: { atStep: 3, kind: 'exception', title: 'Price variance above tolerance', detail: 'Invoice line 2: 120 × $12.40 vs PO price $11.80 (+5.1%, tolerance ±0.5%). Total variance $72.00.', suggestion: 'Hand back — needs a credit note or PO change' },
  6: { atStep: 4, kind: 'retry', title: 'SAP session expired mid-posting', detail: 'Recovered: re-authenticated via Okta SSO, checked no document was created, retried — posted cleanly.' },
  9: { atStep: 3, kind: 'exception', title: 'Bank account differs from vendor master', detail: 'Remit-to IBAN on the invoice (…4471) doesn’t match the vendor master (…0932). Possible payment fraud — posting blocked.', suggestion: 'Hand back to Treasury for verification' },
  13: { atStep: 3, kind: 'approval', title: 'Possible duplicate invoice', detail: 'Same supplier, amount and PO as document 5105601188 posted on Oct 12. Reference differs by one character (TR-5512 vs TR-5521).', suggestion: 'Reject — likely duplicate' },
  16: { atStep: 1, kind: 'retry', title: 'Scanned PDF rotated 90°', detail: 'Recovered: large model re-read the page after rotation; all fields extracted with high confidence.' },
}

export function apTemplate(plan: PlanStep[]): FleetTemplate {
  return {
    id: 'ap-invoices',
    title: 'Post supplier invoices',
    description: 'Read each invoice, 3-way match it against SAP and post it — escalate anything off-policy.',
    apps: ['outlook', 'acrobat', 'sap'],
    unit: 'invoices',
    personMinutes: 14,
    // same methods and models as the single-run SAP workflow, with names that fit any invoice
    plan: plan.map((s, i) => ({
      ...s,
      text: ['Pull the invoice from the AP inbox', 'Read the invoice PDF', 'Fetch the PO and goods receipt from SAP', '3-way match invoice ↔ PO ↔ receipt', 'Post the supplier invoice in SAP', 'Check the thread for more invoices', 'Confirm posting and payment date to the supplier'][i] ?? s.text,
    })),
    items: (n) =>
      SUPPLIERS.slice(0, n).map(([name, amt], i) => ({
        id: `inv-${i}`,
        label: `${name.split(' ')[0]} ${['INV', 'LW', 'CL', 'TT', 'PW', 'WWI', 'ASH', 'NT', 'CW', 'AW', 'LP', 'MT', 'TR', 'WB', 'BYA', 'HI', 'VA', 'RC', 'WT', 'BC'][i]}-${20931 + i * 37}`,
        sub: `${name} · ${money(amt)} · PO ${4500018234 + i * 13}`,
        issue: AP_ISSUES[i],
      })),
    detail: (item, i) => {
      const po = item.sub.split('PO ')[1]
      const amt = item.sub.split(' · ')[1]
      return [
        [{ text: `GET /graph/v1.0/…/messages?$filter=… → ${item.label}.pdf` }],
        [{ text: `Extracted supplier, PO ${po}, gross ${amt}, terms, 3 line items` }],
        [{ text: `GET A_PurchaseOrder('${po}')?$expand=to_PurchaseOrderItem → 200 OK` }, { text: `GET A_MaterialDocumentItem?PurchaseOrder=${po} → receipts found` }],
        [{ text: `match(${amt}, po.net, receipt.qty) → variance $0.00 ✓` }],
        [{ text: 'Create Supplier Invoice → Simulate → Post' }, { kind: 'write' as const, text: `SAP · supplier invoice 51056${String(1300 + Number(item.id.split('-')[1])).padStart(5, '0')} posted · reversible via MR8M` }],
        [{ text: 'Second invoice in thread: none' }],
        [{ text: 'Reply in supplier thread with posting and payment date' }, { kind: 'write' as const, text: 'Outlook · reply sent to supplier' }],
      ][i] ?? []
    },
  }
}

const EMPLOYEES = ['Ben Carter', 'Maya Singh', 'Liam Chen', 'Sofia Martinez', 'James Okafor', 'Grace Kim', 'Oliver Brooks', 'Hannah Lee', 'Rachel Adams', 'Kate Sullivan', 'David Park', 'Aisha Bello', 'Elena Rossi', 'Sam Patel', 'Priya Raman']
const EXP_ISSUES: Record<number, Issue> = {
  1: { atStep: 2, kind: 'exception', title: 'Hotel above the $325/night cap', detail: 'Marriott Union Square: $412/night × 3 nights. No pre-approval on file for the SF trip.', suggestion: 'Approve as exception — client event week, rates spiked' },
  5: { atStep: 1, kind: 'retry', title: 'Receipt image too blurry', detail: 'Recovered: found the e-receipt for the same transaction in Outlook and attached it instead.' },
  8: { atStep: 3, kind: 'approval', title: 'Client dinner without attendee list', detail: 'Dinner at Oak Long Bar $286.40 coded as Business Meal, but no attendees recorded. Policy requires names for meals over $75.', suggestion: 'Approve after adding attendees from calendar invite' },
}
export const expenseTemplate: FleetTemplate = {
  id: 'expenses',
  title: 'Audit & submit expense reports',
  description: 'Match card transactions to receipts, check them against travel policy and submit each report.',
  apps: ['concur', 'outlook'],
  unit: 'reports',
  personMinutes: 22,
  plan: [
    { text: 'Fetch card transactions', via: 'api', why: 'Concur Expense API' },
    { text: 'Match receipts from email', via: 'cua', model: 'small' },
    { text: 'Check travel policy limits', via: 'code' },
    { text: 'Code exceptions & attendees', via: 'cua', model: 'large' },
    { text: 'Submit report to manager', via: 'cua', model: 'small' },
  ],
  items: (n) => EMPLOYEES.slice(0, n).map((e, i) => ({ id: `exp-${i}`, label: `${e} · Oct travel`, sub: `${3 + (i % 5)} transactions · ${money(640 + i * 173.35)}`, issue: EXP_ISSUES[i] })),
  detail: (item, i) =>
    [
      [{ text: `GET /expense/v4/users/…/cards/transactions → ${item.sub.split(' · ')[0]}` }],
      [{ text: 'Matched receipts in Outlook and attached them' }],
      [{ text: 'policy.check(items) → within limits ✓' }],
      [{ text: 'Itemized hotel folio, set expense types' }],
      [{ text: 'Submit report' }, { kind: 'write' as const, text: `Concur · report for ${item.label.split(' · ')[0]} submitted · recallable` }],
    ][i] ?? [],
}

const INCIDENTS = ['VPN drops — Boston office', 'SAP Fiori login error', 'Outlook not syncing on iOS', 'Printer offline — 3rd floor', 'Teams audio cuts out', 'Laptop won’t boot', 'Shared drive access denied', 'Password reset loop', 'Slack SSO error', 'Monitor flickering', 'Excel crashes on open', 'Badge reader offline']
const INC_ISSUES: Record<number, Issue> = {
  1: { atStep: 2, kind: 'approval', title: 'Possible P1 — 40+ users affected', detail: 'Same SAP Fiori login error reported by 43 users in 20 minutes. Raising to P1 pages the on-call SAP Basis engineer.', suggestion: 'Approve P1 and page on-call' },
  6: { atStep: 1, kind: 'retry', title: 'ServiceNow form changed layout', detail: 'Recovered: “Assignment group” field moved to a new tab after a ServiceNow update — agent found it and continued.' },
}
export const incidentTemplate: FleetTemplate = {
  id: 'incidents',
  title: 'Triage IT incidents',
  description: 'Read each new incident, set priority and category, route it to the right team and reply.',
  apps: ['servicenow', 'slack'],
  unit: 'incidents',
  personMinutes: 9,
  plan: [
    { text: 'Pull unassigned incidents', via: 'api' },
    { text: 'Read ticket, logs & screenshots', via: 'cua', model: 'large' },
    { text: 'Check for duplicates & clusters', via: 'code' },
    { text: 'Set priority, route to team', via: 'cua', model: 'small' },
  ],
  items: (n) => INCIDENTS.slice(0, n).map((x, i) => ({ id: `inc-${i}`, label: `INC00${48210 + i}`, sub: x, issue: INC_ISSUES[i] })),
  detail: (item, i) =>
    [
      [{ text: `GET /api/now/table/incident?assignment_group=NULL → ${item.label}` }],
      [{ text: `Read description and attachments: “${item.sub}”` }],
      [{ text: 'cluster(similar_incidents, 24h) → no cluster' }],
      [{ text: 'Set P3, category, assignment group' }, { kind: 'write' as const, text: `ServiceNow · ${item.label} routed · reversible` }],
    ][i] ?? [],
}
