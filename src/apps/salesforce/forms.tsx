/**
 * Record create / edit / delete / change-owner modals shared by every Salesforce page.
 * Pages ask for one through `useActions().run(...)`; the host renders it at the app root.
 */
import { createContext, useContext, useState, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { db, uid, useCollection } from '@/db/db'
import { useDesk } from '@/os/context'
import { ME, PEOPLE, person } from '@/data/people'
import { isoDate } from '@/data/time'
import { Btn, inputCls, labelCls, useNav } from './ui'
import { Modal } from './record'
import { NewOpportunityModal } from './ListView'

export const COL: Record<string, string> = {
  Account: 'salesforce.accounts',
  Contact: 'salesforce.contacts',
  Lead: 'salesforce.leads',
  Opportunity: 'salesforce.opportunities',
  Case: 'salesforce.cases',
  Campaign: 'salesforce.campaigns',
  Task: 'salesforce.tasks',
  Note: 'salesforce.notes',
  Event: 'salesforce.activities',
  Call: 'salesforce.activities',
}

/** internal users that can own records */
export const OWNERS = PEOPLE.filter((p) => !p.external && ['alex', 'liam', 'rachel', 'aisha', 'hannah', 'marcus', 'david'].includes(p.id))

export type ActionReq =
  | { kind: 'new'; object: string; defaults?: Record<string, any>; stay?: boolean }
  | { kind: 'edit'; object: string; id: string }
  | { kind: 'delete'; object: string; id: string; name: string; after?: () => void }
  | { kind: 'owner'; object: string; ids: string[] }
  | { kind: 'clone'; object: string; id: string }

export const ActionsCtx = createContext<{ run: (r: ActionReq) => void; toast: (m: string) => void }>({ run: () => {}, toast: () => {} })
export const useActions = () => useContext(ActionsCtx)

type FF = {
  key: string
  label: string
  type?: 'text' | 'select' | 'date' | 'textarea' | 'number' | 'checkbox' | 'datetime'
  options?: (string | [string, string])[]
  required?: boolean
  full?: boolean
}
type Section = { title: string; fields: FF[] }

const INDUSTRIES = ['Banking', 'Consulting', 'Education', 'Food & Beverage', 'Healthcare', 'Hospitality', 'Insurance', 'Manufacturing', 'Media', 'Real Estate', 'Retail', 'Technology', 'Transportation', 'Utilities']
const SOURCES = ['Web', 'Webinar', 'Trade Show', 'Partner Referral', 'Outbound', 'Existing Customer']

function useLookups() {
  const accounts = useCollection<any>('salesforce.accounts')
  const contacts = useCollection<any>('salesforce.contacts')
  const opps = useCollection<any>('salesforce.opportunities')
  const campaigns = useCollection<any>('salesforce.campaigns')
  return { accounts, contacts, opps, campaigns }
}

function sectionsFor(object: string, f: any, lk: ReturnType<typeof useLookups>): Section[] {
  const owner: FF = { key: 'ownerId', label: `${object === 'Task' ? 'Assigned To' : `${object} Owner`}`, type: 'select', options: OWNERS.map((p) => [p.id, p.name] as [string, string]) }
  const acctOpts = [['', '--None--'] as [string, string], ...lk.accounts.map((a) => [a.id, a.name] as [string, string])]
  const conOpts = [['', '--None--'] as [string, string], ...lk.contacts.filter((c) => !f.accountId || c.accountId === f.accountId).map((c) => [c.id, c.name] as [string, string])]
  const whatOpts = [['', '--None--'] as [string, string], ...lk.opps.map((o) => [o.id, o.name] as [string, string]), ...lk.accounts.map((a) => [a.id, `${a.name} (Account)`] as [string, string])]
  switch (object) {
    case 'Account':
      return [
        { title: 'Account Information', fields: [owner, { key: 'rating', label: 'Rating', type: 'select', options: ['', 'Hot', 'Warm', 'Cold'] }, { key: 'name', label: 'Account Name', required: true }, { key: 'phone', label: 'Phone' }, { key: 'type', label: 'Type', type: 'select', options: ['Prospect', 'Customer - Direct', 'Customer - Channel', 'Partner'] }, { key: 'website', label: 'Website' }, { key: 'industry', label: 'Industry', type: 'select', options: ['', ...INDUSTRIES] }, { key: 'employees', label: 'Employees', type: 'number' }, { key: 'annualRevenue', label: 'Annual Revenue', type: 'number' }, { key: 'site', label: 'Account Site' }] },
        { title: 'Address Information', fields: [{ key: 'city', label: 'Billing City' }, { key: 'state', label: 'Billing State/Province' }, { key: 'country', label: 'Billing Country' }] },
        { title: 'Description Information', fields: [{ key: 'description', label: 'Description', type: 'textarea', full: true }] },
      ]
    case 'Contact':
      return [
        { title: 'Contact Information', fields: [owner, { key: 'phone', label: 'Phone' }, { key: 'firstName', label: 'First Name' }, { key: 'mobile', label: 'Mobile' }, { key: 'lastName', label: 'Last Name', required: true }, { key: 'email', label: 'Email' }, { key: 'accountId', label: 'Account Name', type: 'select', options: acctOpts }, { key: 'title', label: 'Title' }, { key: 'leadSource', label: 'Lead Source', type: 'select', options: ['', ...SOURCES] }, { key: 'city', label: 'Mailing City' }] },
      ]
    case 'Lead':
      return [
        { title: 'Lead Information', fields: [owner, { key: 'phone', label: 'Phone' }, { key: 'firstName', label: 'First Name' }, { key: 'email', label: 'Email' }, { key: 'lastName', label: 'Last Name', required: true }, { key: 'status', label: 'Lead Status', type: 'select', options: ['Open - Not Contacted', 'Working - Contacted', 'Closed - Not Converted'], required: true }, { key: 'company', label: 'Company', required: true }, { key: 'rating', label: 'Rating', type: 'select', options: ['', 'Hot', 'Warm', 'Cold'] }, { key: 'title', label: 'Title' }, { key: 'leadSource', label: 'Lead Source', type: 'select', options: ['', ...SOURCES] }, { key: 'industry', label: 'Industry', type: 'select', options: ['', ...INDUSTRIES] }, { key: 'employees', label: 'No. of Employees', type: 'number' }] },
        { title: 'Address Information', fields: [{ key: 'city', label: 'City' }, { key: 'state', label: 'State/Province' }] },
        { title: 'Additional Information', fields: [{ key: 'description', label: 'Description', type: 'textarea', full: true }] },
      ]
    case 'Case':
      return [
        { title: 'Case Information', fields: [owner, { key: 'status', label: 'Status', type: 'select', options: ['New', 'Working', 'Escalated', 'Closed'], required: true }, { key: 'accountId', label: 'Account Name', type: 'select', options: acctOpts }, { key: 'priority', label: 'Priority', type: 'select', options: ['High', 'Medium', 'Low'] }, { key: 'contactId', label: 'Contact Name', type: 'select', options: conOpts }, { key: 'origin', label: 'Case Origin', type: 'select', options: ['Phone', 'Email', 'Web'], required: true }, { key: 'type', label: 'Type', type: 'select', options: ['', 'Question', 'Problem', 'Feature Request'] }, { key: 'reason', label: 'Case Reason', type: 'select', options: ['', 'Installation', 'Equipment Complexity', 'Performance', 'Breakdown', 'Feedback', 'Other'] }] },
        { title: 'Description Information', fields: [{ key: 'subject', label: 'Subject', full: true, required: true }, { key: 'description', label: 'Description', type: 'textarea', full: true }] },
      ]
    case 'Campaign':
      return [
        { title: 'Campaign Information', fields: [owner, { key: 'active', label: 'Active', type: 'checkbox' }, { key: 'name', label: 'Campaign Name', required: true }, { key: 'type', label: 'Type', type: 'select', options: ['Webinar', 'Trade Show', 'Email', 'Conference', 'Seminar / Conference', 'Advertisement'] }, { key: 'status', label: 'Status', type: 'select', options: ['Planned', 'In Progress', 'Completed', 'Aborted'] }, { key: 'startDate', label: 'Start Date', type: 'date' }, { key: 'endDate', label: 'End Date', type: 'date' }, { key: 'budget', label: 'Budgeted Cost in Campaign', type: 'number' }, { key: 'cost', label: 'Actual Cost in Campaign', type: 'number' }, { key: 'sent', label: 'Num Sent in Campaign', type: 'number' }] },
        { title: 'Description Information', fields: [{ key: 'description', label: 'Description', type: 'textarea', full: true }] },
      ]
    case 'Task':
      return [
        { title: 'Task Information', fields: [{ key: 'subject', label: 'Subject', required: true }, { key: 'dueDate', label: 'Due Date', type: 'date' }, owner, { key: 'whoId', label: 'Name', type: 'select', options: [['', '--None--'], ...lk.contacts.map((c) => [c.id, c.name] as [string, string])] }, { key: 'whatId', label: 'Related To', type: 'select', options: whatOpts }, { key: 'status', label: 'Status', type: 'select', options: ['Not Started', 'In Progress', 'Completed', 'Waiting on someone else', 'Deferred'], required: true }, { key: 'priority', label: 'Priority', type: 'select', options: ['High', 'Normal', 'Low'] }, { key: 'description', label: 'Comments', type: 'textarea', full: true }] },
      ]
    case 'Event':
      return [
        { title: 'Calendar Details', fields: [{ key: 'subject', label: 'Subject', required: true, full: true }, { key: 'start', label: 'Start', type: 'datetime', required: true }, { key: 'location', label: 'Location' }, { key: 'whoId', label: 'Name', type: 'select', options: [['', '--None--'], ...lk.contacts.map((c) => [c.id, c.name] as [string, string])] }, { key: 'whatId', label: 'Related To', type: 'select', options: whatOpts }, { key: 'description', label: 'Description', type: 'textarea', full: true }] },
      ]
    case 'Call':
      return [
        { title: 'Call Details', fields: [{ key: 'subject', label: 'Subject', required: true, full: true }, { key: 'whoId', label: 'Name', type: 'select', options: [['', '--None--'], ...lk.contacts.map((c) => [c.id, c.name] as [string, string])] }, { key: 'whatId', label: 'Related To', type: 'select', options: whatOpts }, { key: 'description', label: 'Comments', type: 'textarea', full: true }] },
      ]
    case 'Note':
      return [{ title: 'Note', fields: [{ key: 'title', label: 'Title', required: true, full: true }, { key: 'parentId', label: 'Related To', type: 'select', options: [...whatOpts, ...lk.contacts.map((c) => [c.id, `${c.name} (Contact)`] as [string, string])], full: true }, { key: 'body', label: 'Body', type: 'textarea', full: true }] }]
  }
  return []
}

function defaultsFor(object: string): Record<string, any> {
  const base = { ownerId: ME.id }
  switch (object) {
    case 'Account':
      return { ...base, type: 'Prospect', country: 'United States' }
    case 'Lead':
      return { ...base, status: 'Open - Not Contacted' }
    case 'Case':
      return { ...base, status: 'New', priority: 'Medium', origin: 'Phone' }
    case 'Campaign':
      return { ...base, active: true, type: 'Webinar', status: 'Planned', startDate: isoDate(new Date()) }
    case 'Task':
      return { ...base, status: 'Not Started', priority: 'Normal', dueDate: isoDate(new Date()) }
    case 'Event': {
      const d = new Date(Date.now() + 86400000)
      d.setHours(10, 0, 0, 0)
      return { ...base, start: `${isoDate(d)}T10:00` }
    }
    case 'Call':
      return { ...base, subject: 'Call' }
  }
  return base
}

const num = (v: any) => (v === '' || v == null ? null : Number(String(v).replace(/[^0-9.-]/g, '')) || 0)

/** write a new record; returns its id */
function create(object: string, f: any, hw: string | undefined): string {
  const now = new Date().toISOString()
  switch (object) {
    case 'Account': {
      const id = uid('001Hs')
      db.insert('salesforce.accounts', { id, name: f.name, type: f.type, industry: f.industry ?? '', phone: f.phone ?? '', website: f.website ?? '', city: f.city ?? '', state: f.state ?? '', country: f.country ?? 'United States', employees: num(f.employees) ?? 0, annualRevenue: num(f.annualRevenue) ?? 0, ownerId: f.ownerId, rating: f.rating ?? '', accountNumber: '', site: f.site ?? '', description: f.description ?? '', createdDate: now, createdBy: hw })
      return id
    }
    case 'Contact': {
      const id = uid('003Hs')
      db.insert('salesforce.contacts', { id, accountId: f.accountId ?? '', firstName: f.firstName ?? '', lastName: f.lastName, name: `${f.firstName ? f.firstName + ' ' : ''}${f.lastName}`, title: f.title ?? '', email: f.email ?? '', phone: f.phone ?? '', mobile: f.mobile ?? '', city: f.city ?? '', ownerId: f.ownerId, leadSource: f.leadSource ?? '', createdDate: now, createdBy: hw })
      return id
    }
    case 'Lead': {
      const id = uid('00QHs')
      db.insert('salesforce.leads', { id, firstName: f.firstName ?? '', lastName: f.lastName, name: `${f.firstName ? f.firstName + ' ' : ''}${f.lastName}`, company: f.company, title: f.title ?? '', email: f.email ?? '', phone: f.phone ?? '', status: f.status, leadSource: f.leadSource ?? '', rating: f.rating ?? '', industry: f.industry ?? '', city: f.city ?? '', state: f.state ?? '', ownerId: f.ownerId, employees: num(f.employees) ?? 0, description: f.description ?? '', createdDate: now, createdBy: hw })
      return id
    }
    case 'Case': {
      const id = uid('500Hs')
      const n = db.get('salesforce.cases').length + 1027
      db.insert('salesforce.cases', { id, caseNumber: String(n).padStart(8, '0'), subject: f.subject, status: f.status, priority: f.priority, origin: f.origin, type: f.type ?? '', reason: f.reason ?? '', accountId: f.accountId ?? '', contactId: f.contactId ?? '', description: f.description ?? '', ownerId: f.ownerId, createdDate: now, createdBy: hw }, { prepend: true })
      return id
    }
    case 'Campaign': {
      const id = uid('701Hs')
      db.insert('salesforce.campaigns', { id, name: f.name, type: f.type, status: f.status, active: !!f.active, startDate: f.startDate ?? '', endDate: f.endDate ?? '', budget: num(f.budget) ?? 0, cost: num(f.cost) ?? 0, sent: num(f.sent) ?? 0, resp: 0, ownerId: f.ownerId, description: f.description ?? '', members: [], createdDate: now, createdBy: hw })
      return id
    }
    case 'Task': {
      const id = uid('00T')
      db.insert('salesforce.tasks', { id, subject: f.subject, whatId: f.whatId || undefined, whoId: f.whoId || undefined, dueDate: f.dueDate || isoDate(new Date()), status: f.status, priority: f.priority, ownerId: f.ownerId, description: f.description ?? '', createdDate: now, createdBy: hw }, { prepend: true })
      return id
    }
    case 'Event':
    case 'Call': {
      const id = uid('00T')
      db.insert('salesforce.activities', { id, type: object === 'Event' ? 'event' : 'call', whatId: f.whatId || undefined, whoId: f.whoId || undefined, subject: f.subject, description: [object === 'Event' && f.location ? `Location: ${f.location}` : '', f.description ?? ''].filter(Boolean).join('\n'), date: object === 'Event' && f.start ? new Date(f.start).toISOString() : now, ownerId: ME.id, createdBy: hw }, { prepend: true })
      return id
    }
    case 'Note': {
      const id = uid('002Hs')
      db.insert('salesforce.notes', { id, title: f.title, body: f.body ?? '', parentId: f.parentId ?? '', ownerId: ME.id, date: now, createdBy: hw }, { prepend: true })
      return id
    }
  }
  return ''
}

const NAVIGABLE = ['Account', 'Contact', 'Lead', 'Opportunity', 'Case']

export function RecordFormModal({ object, defaults, editId, onClose, stay }: { object: string; defaults?: Record<string, any>; editId?: string; onClose: () => void; stay?: boolean }) {
  const { isAgent } = useDesk()
  const { go } = useNav()
  const { toast } = useActions()
  const lk = useLookups()
  const existing = editId ? db.find<any>(COL[object], editId) : undefined
  const init = existing ? { ...existing, ...(object === 'Event' && existing.date ? { start: existing.date.slice(0, 16) } : {}) } : { ...defaultsFor(object), ...(defaults ?? {}) }
  const [f, setF] = useState<any>(init)
  const [err, setErr] = useState<string[]>([])
  const secs = sectionsFor(object, f, lk)
  const set = (k: string, v: any) => setF((x: any) => ({ ...x, [k]: v }))
  const label = object === 'Call' ? 'Log a Call' : `${existing ? 'Edit' : 'New'} ${object}`

  const save = (andNew = false) => {
    const missing = secs.flatMap((s) => s.fields).filter((x) => x.required && !String(f[x.key] ?? '').trim()).map((x) => x.key)
    setErr(missing)
    if (missing.length) return
    const hw = isAgent ? 'hworker' : undefined
    if (existing) {
      const patch: any = { ...f, lastModified: new Date().toISOString(), updatedBy: hw }
      if ('lastName' in f && (object === 'Contact' || object === 'Lead')) patch.name = `${f.firstName ? f.firstName + ' ' : ''}${f.lastName}`
      for (const k of ['employees', 'annualRevenue', 'budget', 'cost', 'sent']) if (k in patch) patch[k] = num(patch[k]) ?? 0
      if (object === 'Event' && f.start) patch.date = new Date(f.start).toISOString()
      db.update(COL[object], existing.id, patch)
      toast(`${object} "${f.name ?? f.subject ?? f.title ?? ''}" was saved.`)
      onClose()
      return
    }
    const id = create(object, f, hw)
    const nm = f.name ?? (f.lastName ? `${f.firstName ?? ''} ${f.lastName}`.trim() : f.subject ?? f.title)
    toast(object === 'Call' ? `Call "${nm}" was logged.` : `${object} "${nm}" was created.`)
    if (andNew) {
      setF({ ...defaultsFor(object), ...(defaults ?? {}) })
      return
    }
    onClose()
    if (!stay && NAVIGABLE.includes(object)) go({ page: 'record', object, id })
  }

  return (
    <Modal
      title={label}
      agent={`sf-form-${object.toLowerCase()}`}
      width={object === 'Note' || object === 'Call' ? 620 : 860}
      onClose={onClose}
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          {!existing && object !== 'Call' && <Btn onClick={() => save(true)}>Save &amp; New</Btn>}
          <Btn variant="brand" agent={`sf-form-${object.toLowerCase()}-save`} onClick={() => save()}>
            Save
          </Btn>
        </>
      }
    >
      <div className="px-6 py-4">
        {err.length > 0 && (
          <div className="mb-3 flex items-center gap-2 rounded bg-[#FEF1EE] border border-[#FE9339] px-3 py-2 text-[13px] text-[#BA0517]">
            <AlertTriangle size={14} /> We hit a snag. Review the errors on this page.
          </div>
        )}
        <div className="text-right text-[12px] text-[#444] mb-2">
          <abbr className="text-[#BA0517] no-underline">*</abbr> = Required Information
        </div>
        {secs.map((s) => (
          <div key={s.title}>
            <div className="h-8 px-3 rounded bg-[#F3F3F3] flex items-center text-[14px] mb-3">{s.title}</div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 px-2 mb-4">
              {s.fields.map((x) => (
                <FormField key={x.key} x={x} v={f[x.key]} set={(v) => set(x.key, v)} error={err.includes(x.key)} agent={`sf-form-${object.toLowerCase()}-${x.key}`} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  )
}

function FormField({ x, v, set, error, agent }: { x: FF; v: any; set: (v: any) => void; error: boolean; agent: string }) {
  const cls = `${inputCls} ${error ? '!border-[#BA0517]' : ''}`
  let input: ReactNode
  if (x.type === 'select')
    input = (
      <select data-agent={agent} aria-label={x.label} value={v ?? ''} onChange={(e) => set(e.target.value)} className={cls}>
        {x.options!.map((o) => {
          const [val, lab] = Array.isArray(o) ? o : [o, o || '--None--']
          return (
            <option key={val} value={val}>
              {lab}
            </option>
          )
        })}
      </select>
    )
  else if (x.type === 'textarea') input = <textarea data-agent={agent} aria-label={x.label} value={v ?? ''} onChange={(e) => set(e.target.value)} rows={4} className={`${cls} h-auto py-1.5 leading-[1.45]`} />
  else if (x.type === 'checkbox') input = <input data-agent={agent} aria-label={x.label} type="checkbox" checked={!!v} onChange={(e) => set(e.target.checked)} className="mt-2 w-4 h-4 accent-[#0176D3]" />
  else input = <input data-agent={agent} aria-label={x.label} type={x.type === 'date' ? 'date' : x.type === 'datetime' ? 'datetime-local' : 'text'} inputMode={x.type === 'number' ? 'decimal' : undefined} value={v ?? ''} onChange={(e) => set(e.target.value)} className={cls} />
  return (
    <div className={x.full ? 'col-span-2' : ''}>
      <label className={labelCls}>
        {x.required && <abbr className="text-[#BA0517] no-underline mr-0.5">*</abbr>}
        {x.label}
      </label>
      {input}
      {error && <div className="text-[12px] text-[#BA0517] mt-0.5">Complete this field.</div>}
    </div>
  )
}

/* ───────────── delete / change owner ───────────── */
function DeleteModal({ object, id, name, onClose, after }: { object: string; id: string; name: string; onClose: () => void; after?: () => void }) {
  const { toast } = useActions()
  return (
    <Modal
      title={`Delete ${object}`}
      agent="sf-delete-modal"
      width={520}
      onClose={onClose}
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn
            variant="brand"
            agent="sf-delete-confirm"
            onClick={() => {
              db.remove(COL[object], id)
              db.remove('salesforce.favorites', id)
              toast(`${object} "${name}" was deleted.`)
              onClose()
              after?.()
            }}
          >
            Delete
          </Btn>
        </>
      }
    >
      <div className="p-6 text-[13px] text-center">Are you sure you want to delete this {object.toLowerCase()}?</div>
    </Modal>
  )
}

function OwnerModal({ object, ids, onClose }: { object: string; ids: string[]; onClose: () => void }) {
  const { toast } = useActions()
  const { isAgent } = useDesk()
  const [owner, setOwner] = useState(ME.id)
  const [notify, setNotify] = useState(true)
  return (
    <Modal
      title={ids.length > 1 ? `Change Owner (${ids.length} records)` : `Change ${object} Owner`}
      agent="sf-owner-modal"
      width={560}
      onClose={onClose}
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn
            variant="brand"
            agent="sf-owner-save"
            onClick={() => {
              for (const id of ids) db.update(COL[object], id, { ownerId: owner, lastModified: new Date().toISOString(), updatedBy: isAgent ? 'hworker' : undefined })
              toast(`${ids.length > 1 ? `${ids.length} records were` : `${object} was`} reassigned to ${person(owner).name}.`)
              onClose()
            }}
          >
            Submit
          </Btn>
        </>
      }
    >
      <div className="p-6 space-y-3 text-[13px]">
        <div>
          <label className={labelCls}>Search Users</label>
          <select data-agent="sf-owner-select" aria-label="Owner" value={owner} onChange={(e) => setOwner(e.target.value)} className={inputCls}>
            {OWNERS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.title}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="accent-[#0176D3]" /> Send notification email
        </label>
        <p className="text-[12px] text-[#444]">The new owner will also own open activities related to this record.</p>
      </div>
    </Modal>
  )
}

/** clone an existing record into the create form */
function cloneDefaults(object: string, id: string) {
  const r = db.find<any>(COL[object], id)
  if (!r) return {}
  const { id: _i, createdDate: _c, createdBy: _b, updatedBy: _u, lastModified: _l, ...rest } = r
  return object === 'Contact' || object === 'Lead' ? rest : { ...rest, name: `${r.name} (Clone)`, subject: r.subject ? `${r.subject} (Clone)` : undefined }
}

export function ActionHost({ req, onClose }: { req: ActionReq | null; onClose: () => void }) {
  if (!req) return null
  if (req.kind === 'delete') return <DeleteModal {...req} onClose={onClose} />
  if (req.kind === 'owner') return <OwnerModal object={req.object} ids={req.ids} onClose={onClose} />
  if (req.object === 'Opportunity') {
    if (req.kind === 'new') return <NewOpportunityModal onClose={onClose} accountId={req.defaults?.accountId} />
    if (req.kind === 'clone') return <NewOpportunityModal onClose={onClose} initial={cloneDefaults('Opportunity', req.id)} />
    return <NewOpportunityModal onClose={onClose} editId={req.id} />
  }
  if (req.kind === 'clone') return <RecordFormModal key={req.id} object={req.object} defaults={cloneDefaults(req.object, req.id)} onClose={onClose} />
  if (req.kind === 'edit') return <RecordFormModal key={req.id} object={req.object} editId={req.id} onClose={onClose} />
  return <RecordFormModal key={req.object} object={req.object} defaults={req.defaults} stay={req.stay} onClose={onClose} />
}
