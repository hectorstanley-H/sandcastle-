/** HubSpot data helpers shared by every page: stage model, activity logging and CSV export. */
import { db, uid } from '@/db/db'
import { OWNER_IDS } from './owners'

export const STAGES = ['Appointment Scheduled', 'Qualified To Buy', 'Presentation Scheduled', 'Decision Maker Bought-In', 'Contract Sent', 'Closed Won', 'Closed Lost']
export const STAGE_PROB = [0.1, 0.25, 0.4, 0.6, 0.8, 1, 0]
export const LIFECYCLE = ['Subscriber', 'Lead', 'Marketing Qualified Lead', 'Sales Qualified Lead', 'Opportunity', 'Customer']
export const LEAD_STATUS = ['New', 'Open', 'In Progress', 'Attempted to contact', 'Connected']
export const TICKET_STATUS = ['New', 'Waiting on contact', 'Waiting on us', 'Closed']
export const TICKET_CATEGORY = ['Product issue', 'Product question', 'Billing & account', 'Feature request']

export type Col = 'hubspot.contacts' | 'hubspot.companies' | 'hubspot.deals'
export type ActivityType = 'note' | 'email' | 'call' | 'meeting' | 'task' | 'stage' | 'sequence' | 'ticket'

export const isOpenDeal = (d: { stage: string }) => d.stage !== 'Closed Won' && d.stage !== 'Closed Lost'
export const weighted = (d: { stage: string; amount: number }) => d.amount * STAGE_PROB[Math.max(0, STAGES.indexOf(d.stage))]

/** Prepend an activity to a record's timeline and bump its last-activity date. */
export function logActivity(col: Col, id: string, e: { type: ActivityType; title: string; body: string; by?: string }) {
  const date = new Date().toISOString()
  db.update(col, id, (r) => ({ lastActivity: date, events: [{ ...e, date }, ...(r.events ?? [])] }))
}

export function setDealStage(id: string, stage: string, by?: string) {
  const d = db.find<any>('hubspot.deals', id)
  if (!d || d.stage === stage) return
  const date = new Date().toISOString()
  db.update('hubspot.deals', id, (r) => ({
    stage,
    updatedBy: by,
    lastActivity: date,
    closeDate: stage === 'Closed Won' || stage === 'Closed Lost' ? date.slice(0, 10) : r.closeDate,
    events: [{ type: 'stage', title: `Deal stage changed to ${stage}`, body: `Moved from ${r.stage} to ${stage}`, date, by }, ...(r.events ?? [])],
  }))
  runWorkflows('deal_stage', id, stage)
}

export function createTask(t: { title: string; type: string; dueDate: string; priority: string; ownerId: string; contactId?: string; dealId?: string; companyId?: string; notes?: string }) {
  const id = uid('hst')
  db.insert('hubspot.tasks', { id, status: 'Not started', createDate: new Date().toISOString(), notes: '', ...t }, { prepend: true })
  return id
}

export function csvDownload(name: string, rows: Record<string, any>[]) {
  if (!rows.length) return
  const keys = Object.keys(rows[0])
  const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const csv = [keys.join(','), ...rows.map((r) => keys.map((k) => esc(r[k])).join(','))].join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

export const companyByName = (name: string) => db.get<any>('hubspot.companies').find((c) => c.name === name)
export { OWNER_IDS }

/* ───────────────────────── notifications ───────────────────────── */

export function notify(n: { title: string; body: string; route?: { page: string; id?: string } }) {
  db.insert('hubspot.notifications', { id: uid('ntf'), date: new Date().toISOString(), read: false, ...n }, { prepend: true })
}

/* ───────────────────────── workflows ───────────────────────── */

export type WfObject = 'Deal' | 'Contact' | 'Ticket'
export type WfTriggerKind = 'deal_stage' | 'lifecycle' | 'ticket_created' | 'form_submitted'
export type WfAction =
  | { kind: 'task'; title: string; dueInDays: number; priority: string; assignTo: 'owner' | string }
  | { kind: 'set_property'; field: string; value: string }
  | { kind: 'notify'; title: string; body: string }
  | { kind: 'note'; body: string }

export const WF_TRIGGERS: { kind: WfTriggerKind; object: WfObject; label: string; values?: () => string[] }[] = [
  { kind: 'deal_stage', object: 'Deal', label: 'Deal stage is changed to', values: () => STAGES },
  { kind: 'lifecycle', object: 'Contact', label: 'Lifecycle stage is changed to', values: () => LIFECYCLE },
  { kind: 'form_submitted', object: 'Contact', label: 'Contact submits form', values: () => db.get<any>('hubspot.forms').map((f) => f.id) },
  { kind: 'ticket_created', object: 'Ticket', label: 'Ticket is created' },
]
/** properties a "Set property value" action may write, per object */
export const WF_PROPS: Record<WfObject, { field: string; label: string; options: string[] }[]> = {
  Deal: [{ field: 'priority', label: 'Priority', options: ['High', 'Medium', 'Low'] }, { field: 'stage', label: 'Deal stage', options: STAGES }],
  Contact: [{ field: 'lifecycleStage', label: 'Lifecycle stage', options: LIFECYCLE }, { field: 'leadStatus', label: 'Lead status', options: LEAD_STATUS }],
  Ticket: [{ field: 'priority', label: 'Priority', options: ['High', 'Medium', 'Low'] }, { field: 'status', label: 'Ticket status', options: TICKET_STATUS }],
}
const WF_COL: Record<WfObject, string> = { Deal: 'hubspot.deals', Contact: 'hubspot.contacts', Ticket: 'hubspot.tickets' }
const recName = (o: WfObject, r: any) => (o === 'Contact' ? `${r.firstName} ${r.lastName}` : o === 'Ticket' ? r.subject : r.name)
export const describeAction = (a: WfAction, object: WfObject = 'Deal') =>
  a.kind === 'task' ? `Create task “${a.title}” due in ${a.dueInDays} day${a.dueInDays === 1 ? '' : 's'}`
  : a.kind === 'set_property' ? `Set ${WF_PROPS[object].find((p) => p.field === a.field)?.label ?? a.field} to ${a.value}`
  : a.kind === 'notify' ? `Send in-app notification “${a.title}”`
  : `Log a note on the record`

/**
 * Fire every enabled workflow whose trigger matches. Called from the places that change CRM data
 * (deal stage, lifecycle edits, ticket creation, form submissions). Workflows never re-trigger themselves.
 */
let running = false
export function runWorkflows(kind: WfTriggerKind, recordId: string, value?: string) {
  if (running) return
  running = true
  try {
    for (const wf of db.get<any>('hubspot.workflows')) {
      if (!wf.enabled || wf.trigger.kind !== kind || (wf.trigger.value && wf.trigger.value !== value)) continue
      const object = wf.object as WfObject
      const col = WF_COL[object]
      const r = db.find<any>(col, recordId)
      if (!r) continue
      const name = recName(object, r)
      const fill = (s: string) => s.replace(/\{name\}/g, name)
      const done: string[] = []
      for (const a of wf.actions as WfAction[]) {
        if (a.kind === 'task') {
          createTask({
            title: fill(a.title),
            type: 'To-do',
            dueDate: new Date(Date.now() + a.dueInDays * 86_400_000).toISOString(),
            priority: a.priority,
            ownerId: a.assignTo === 'owner' ? r.ownerId ?? 'alex' : a.assignTo,
            contactId: object === 'Contact' ? r.id : object === 'Ticket' ? r.contactId : undefined,
            dealId: object === 'Deal' ? r.id : undefined,
            notes: `Created by workflow “${wf.name}”`,
          })
          done.push('Created task')
        } else if (a.kind === 'set_property') {
          if (object === 'Deal' && a.field === 'stage') setDealStage(r.id, a.value, 'workflow')
          else db.update(col, r.id, { [a.field]: a.value })
          done.push(`Set ${WF_PROPS[object].find((p) => p.field === a.field)?.label ?? a.field} to ${a.value}`)
        } else if (a.kind === 'notify') {
          notify({ title: fill(a.title), body: fill(a.body), route: { page: object.toLowerCase(), id: r.id } })
          done.push('Sent notification')
        } else if (a.kind === 'note' && object !== 'Ticket') {
          logActivity(col as Col, r.id, { type: 'note', title: `Note from workflow “${wf.name}”`, body: fill(a.body) })
          done.push('Logged note')
        }
      }
      if (object !== 'Ticket') logActivity(col as Col, r.id, { type: 'sequence', title: `Enrolled in workflow “${wf.name}”`, body: done.join(' · ') })
      db.update('hubspot.workflows', wf.id, (w) => ({ enrolled: (w.enrolled ?? 0) + 1, history: [{ recordName: name, date: new Date().toISOString(), result: done.join(' · ') }, ...(w.history ?? [])].slice(0, 50) }))
    }
  } finally {
    running = false
  }
}

/* ───────────────────────── forms ───────────────────────── */

/** Submit a form: creates or updates the contact (matched by email), logs the submission and fires form workflows. */
export function submitForm(formId: string, values: Record<string, string>) {
  const form = db.find<any>('hubspot.forms', formId)
  if (!form || !values.email) return null
  const date = new Date().toISOString()
  const existing = db.get<any>('hubspot.contacts').find((c) => c.email?.toLowerCase() === values.email.toLowerCase())
  const ev = { type: 'form', title: `Submitted form: ${form.name}`, body: Object.entries(values).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(' · '), date }
  let id: string
  if (existing) {
    id = existing.id
    const upgrade = LIFECYCLE.indexOf(form.lifecycleOnSubmit) > LIFECYCLE.indexOf(existing.lifecycleStage)
    db.update('hubspot.contacts', id, (r) => ({ ...Object.fromEntries(Object.entries(values).filter(([k, v]) => v && k !== 'email')), ...(upgrade ? { lifecycleStage: form.lifecycleOnSubmit } : {}), lastActivity: date, events: [ev, ...(r.events ?? [])] }))
  } else {
    id = String(51_300_000 + Math.floor(Math.random() * 90_000))
    db.insert('hubspot.contacts', {
      id, firstName: values.firstName ?? values.email.split('@')[0], lastName: values.lastName ?? '', email: values.email, phone: values.phone ?? '', company: values.company ?? '', jobTitle: values.jobTitle ?? '',
      lifecycleStage: form.lifecycleOnSubmit, leadStatus: 'New', ownerId: form.ownerId, createDate: date, lastActivity: date, city: '', country: '', webinar: null, webinarStatus: null, leadScore: 20, events: [ev], sequences: [],
    }, { prepend: true })
  }
  db.update('hubspot.forms', formId, (f) => ({ submissions: (f.submissions ?? 0) + 1, updatedAt: date, recent: [{ contactId: id, date }, ...(f.recent ?? [])].slice(0, 25) }))
  runWorkflows('form_submitted', id, formId)
  return id
}

/** Lifecycle stage edit (fires lifecycle workflows). */
export function setLifecycle(contactId: string, stage: string) {
  db.update('hubspot.contacts', contactId, { lifecycleStage: stage })
  runWorkflows('lifecycle', contactId, stage)
}

/* ───────────────────────── quotes ───────────────────────── */

export type QuoteLine = { productId: string; name: string; price: number; qty: number; discount: number; billing: string }
/** line total for the contract term: recurring lines are billed for 12 months */
export const lineTotal = (l: QuoteLine) => l.price * l.qty * (1 - (l.discount || 0) / 100) * (l.billing === 'Monthly' ? 12 : 1)
export const quoteTotals = (lines: QuoteLine[]) => {
  const oneTime = lines.filter((l) => l.billing === 'One-time').reduce((t, l) => t + lineTotal(l), 0)
  const recurring = lines.filter((l) => l.billing !== 'One-time').reduce((t, l) => t + lineTotal(l), 0)
  const discount = lines.reduce((t, l) => t + l.price * l.qty * ((l.discount || 0) / 100) * (l.billing === 'Monthly' ? 12 : 1), 0)
  return { oneTime, recurring, discount, total: oneTime + recurring }
}

/* ───────────────────────── calls & meetings ───────────────────────── */

/** Log a call to the calls index and the contact's (and deal's) timeline. */
export function logCall(c: { contactId: string; dealId?: string; ownerId: string; durationSec: number; outcome: string; direction?: string; notes: string; by?: string }) {
  const date = new Date().toISOString()
  db.insert('hubspot.calls', { id: uid('hscall'), date, direction: 'Outbound', recorded: c.durationSec > 60, ...c }, { prepend: true })
  const mins = `${Math.floor(c.durationSec / 60)}m ${c.durationSec % 60}s`
  const ev = { type: 'call' as const, title: `${c.direction ?? 'Outbound'} call — ${c.outcome}`, body: `${mins}${c.notes ? ' · ' + c.notes : ''}`, by: c.by }
  logActivity('hubspot.contacts', c.contactId, ev)
  if (c.dealId) logActivity('hubspot.deals', c.dealId, ev)
}

export function scheduleMeeting(m: { title: string; contactId: string; dealId?: string; ownerId: string; start: string; mins: number; location: string; notes?: string; outcome?: string; by?: string }) {
  const id = uid('hsmtg')
  db.insert('hubspot.meetings', { id, outcome: 'Scheduled', notes: '', ...m }, { prepend: true })
  const ev = { type: 'meeting' as const, title: `${m.outcome === 'Completed' ? 'Meeting' : 'Meeting scheduled'}: ${m.title}`, body: `${new Date(m.start).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} · ${m.mins} min · ${m.location}`, by: m.by }
  logActivity('hubspot.contacts', m.contactId, ev)
  if (m.dealId) logActivity('hubspot.deals', m.dealId, ev)
  return id
}
