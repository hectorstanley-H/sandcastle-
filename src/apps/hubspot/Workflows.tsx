import { Fragment, useMemo, useState, type ReactNode } from 'react'
import { Bell, ChevronLeft, FlaskConical, Info, Pencil, Plus, Search, SquareCheck, StickyNote, Trash2, X, Zap } from 'lucide-react'
import { db, uid, useCollection, useRecord } from '@/db/db'
import { useDesk } from '@/os/context'
import { ME, person } from '@/data/people'
import { Field, HBtn, HLink, HWTag, Modal, Pill, hsDate, inputH, selectH, useHNav } from './ui'
import { WF_PROPS, WF_TRIGGERS, describeAction, runWorkflows, type WfAction, type WfObject, type WfTriggerKind } from './store'
import { OWNERS } from './owners'

const th = 'text-left text-[12px] font-semibold uppercase tracking-wide px-3 h-10 border-b border-[#DFE3EB] bg-[#F5F8FA] whitespace-nowrap'
const td = 'px-3 h-12 border-b border-[#DFE3EB] text-[13.5px] whitespace-nowrap'

function PageTitle({ title, right, sub }: { title: string; right?: ReactNode; sub?: string }) {
  return (
    <div className="bg-white border-b border-[#DFE3EB] px-6 pt-5 pb-4 flex items-center gap-3">
      <div className="flex-1">
        <h1 className="text-[22px] font-medium">{title}</h1>
        {sub && <div className="text-[13px] text-[#516F90] mt-0.5">{sub}</div>}
      </div>
      {right}
    </div>
  )
}

const OBJECTS: WfObject[] = ['Deal', 'Contact', 'Ticket']
const OBJ_COL: Record<WfObject, string> = { Deal: 'hubspot.deals', Contact: 'hubspot.contacts', Ticket: 'hubspot.tickets' }
const recLabel = (o: WfObject, r: any): string => (o === 'Contact' ? `${r.firstName ?? ''} ${r.lastName ?? ''}`.trim() : o === 'Ticket' ? r.subject : r.name) || r.id

type Trigger = { kind: WfTriggerKind | ''; value?: string }
const trigDef = (kind: string) => WF_TRIGGERS.find((t) => t.kind === kind)
const formName = (forms: any[], id?: string) => forms.find((f) => f.id === id)?.name ?? '(deleted form)'

function triggerSummary(t: Trigger, forms: any[]) {
  const def = trigDef(t.kind)
  if (!def) return 'No enrollment trigger'
  if (!def.values) return def.label
  if (!t.value) return `${def.label} …`
  return t.kind === 'form_submitted' ? `${def.label} “${formName(forms, t.value)}”` : `${def.label} ${t.value}`
}

function Toggle({ on, onChange, agent, label, dark }: { on: boolean; onChange: (on: boolean) => void; agent?: string; label: string; dark?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} data-agent={agent} onClick={() => onChange(!on)} className="inline-flex items-center gap-2">
      <span className={`relative w-[38px] h-[20px] rounded-full transition-colors ${on ? 'bg-[#00BDA5]' : dark ? 'bg-[#516F90]' : 'bg-[#CBD6E2]'}`}>
        <span className={`absolute top-[2px] w-4 h-4 rounded-full bg-white shadow transition-all ${on ? 'left-[20px]' : 'left-[2px]'}`} />
      </span>
      <span className={`text-[13px] font-medium w-6 text-left ${dark ? 'text-white' : on ? 'text-[#00826F]' : 'text-[#516F90]'}`}>{on ? 'On' : 'Off'}</span>
    </button>
  )
}

/* ───────────────────────── index ───────────────────────── */

export function WorkflowsIndex() {
  const { go, open, toast } = useHNav()
  const wfs = useCollection<any>('hubspot.workflows')
  const forms = useCollection<any>('hubspot.forms')
  const [q, setQ] = useState('')
  const [obj, setObj] = useState<'All' | WfObject>('All')
  const rows = wfs
    .filter((w) => (obj === 'All' || w.object === obj) && (!q || w.name.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))
  const toggle = (w: any, on: boolean) => {
    db.update('hubspot.workflows', w.id, { enabled: on, updatedAt: new Date().toISOString() })
    toast(`Workflow turned ${on ? 'on' : 'off'}.`)
  }
  const del = (w: any) =>
    open(
      <Modal
        title="Delete workflow?"
        agent="hs-wf-delete-modal"
        onClose={() => open(null)}
        footer={
          <>
            <HBtn variant="primary" small agent="hs-wf-delete-confirm" onClick={() => { db.remove('hubspot.workflows', w.id); open(null); toast(`Workflow “${w.name}” deleted.`) }}>Delete workflow</HBtn>
            <HBtn variant="secondary" small onClick={() => open(null)}>Cancel</HBtn>
          </>
        }
      >
        <p>
          You’re about to delete <b>{w.name}</b>. {w.enabled ? 'It is currently on, so records will stop being enrolled. ' : ''}Its enrollment history will be lost. This can’t be undone.
        </p>
      </Modal>,
    )
  return (
    <div className="min-h-full bg-white">
      <PageTitle
        title="Workflows"
        sub={`${wfs.length} workflows · ${wfs.filter((w) => w.enabled).length} on`}
        right={<HBtn variant="primary" small agent="hs-wf-create" onClick={() => go({ page: 'workflow', id: 'new' })}><Plus size={14} /> Create workflow</HBtn>}
      />
      <div className="flex items-center gap-2 px-6 py-3 border-b border-[#DFE3EB]">
        <div className="flex items-center h-8 w-[260px] border border-[#CBD6E2] rounded-[3px] px-2 gap-1.5">
          <input data-agent="hs-wf-search" aria-label="Search workflows" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search workflows" className="flex-1 outline-none text-[13px]" />
          <Search size={14} className="text-[#7C98B6]" />
        </div>
        <div className="flex border border-[#CBD6E2] rounded-[3px] overflow-hidden ml-2" role="group" aria-label="Object type">
          {(['All', ...OBJECTS] as const).map((o, i) => (
            <button key={o} data-agent={`hs-wf-filter-${o.toLowerCase()}`} aria-pressed={obj === o} onClick={() => setObj(o)} className={`h-8 px-3 text-[13px] ${i ? 'border-l border-[#CBD6E2]' : ''} ${obj === o ? 'bg-[#EAF0F6] font-semibold' : 'bg-white'}`}>
              {o === 'All' ? 'All objects' : o}
            </button>
          ))}
        </div>
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr>{['Name', 'Object', 'Enrollment trigger', 'Status', 'Total enrolled', 'Last updated', 'Owner', ''].map((h, i) => <th key={i} className={th}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((w) => (
            <tr key={w.id} className={`hover:bg-[#F5F8FA] group ${w.createdBy === 'hworker' ? 'flash-new' : ''}`}>
              <td className={td}>
                <span className="flex items-center gap-2">
                  <HLink agent={`hs-wf-row-${w.id}`} onClick={() => go({ page: 'workflow', id: w.id })}>{w.name}</HLink>
                  {w.createdBy === 'hworker' && <HWTag />}
                </span>
              </td>
              <td className={td}><Pill>{w.object}</Pill></td>
              <td className={`${td} max-w-[340px] truncate`} title={triggerSummary(w.trigger, forms)}>{triggerSummary(w.trigger, forms)}</td>
              <td className={td}><Toggle on={!!w.enabled} onChange={(on) => toggle(w, on)} agent={`hs-wf-toggle-${w.id}`} label={`Turn ${w.name} ${w.enabled ? 'off' : 'on'}`} /></td>
              <td className={td}>{(w.enrolled ?? 0).toLocaleString()}</td>
              <td className={td}>{hsDate(w.updatedAt, true)}</td>
              <td className={td}>{person(w.ownerId).name}</td>
              <td className={`${td} w-10`}>
                <button data-agent={`hs-wf-delete-${w.id}`} aria-label={`Delete ${w.name}`} onClick={() => del(w)} className="text-[#7C98B6] hover:text-[#C93B44] opacity-0 group-hover:opacity-100 focus:opacity-100">
                  <Trash2 size={15} />
                </button>
              </td>
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td colSpan={8} className="p-10 text-center text-[14px] text-[#516F90]">
                {wfs.length ? 'No workflows match your filters.' : 'No workflows yet. Create one to automate tasks, property updates and notifications.'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

/* ───────────────────────── editor ───────────────────────── */

type Draft = { name: string; object: WfObject; trigger: Trigger; actions: WfAction[]; enabled: boolean }
type Panel = { mode: 'action'; index: number } | { mode: 'pick'; at: number } | null

const toDraft = (w: any): Draft =>
  w
    ? { name: w.name ?? '', object: w.object, trigger: { ...w.trigger }, actions: (w.actions ?? []).map((a: WfAction) => ({ ...a })), enabled: !!w.enabled }
    : { name: '', object: 'Deal', trigger: { kind: '' }, actions: [], enabled: false }
const snapshot = (d: Draft) =>
  JSON.stringify({ name: d.name, object: d.object, trigger: { kind: d.trigger.kind, value: trigDef(d.trigger.kind)?.values ? d.trigger.value ?? '' : undefined }, actions: d.actions })

const ACTION_META: Record<WfAction['kind'], { label: string; icon: typeof Bell; color: string; desc: string }> = {
  task: { label: 'Create task', icon: SquareCheck, color: '#00A4BD', desc: 'Create a to-do for the record owner or a teammate.' },
  set_property: { label: 'Set property value', icon: Pencil, color: '#6A78D1', desc: 'Update a property on the enrolled record.' },
  notify: { label: 'Send in-app notification', icon: Bell, color: '#F2547D', desc: 'Alert your team in the HubSpot notification center.' },
  note: { label: 'Log note', icon: StickyNote, color: '#FFB000', desc: 'Add a note to the record’s activity timeline.' },
}

const newAction = (kind: WfAction['kind'], object: WfObject): WfAction =>
  kind === 'task' ? { kind, title: 'Follow up with {name}', dueInDays: 1, priority: 'Medium', assignTo: 'owner' }
  : kind === 'set_property' ? { kind, field: WF_PROPS[object][0].field, value: WF_PROPS[object][0].options[0] }
  : kind === 'notify' ? { kind, title: 'Workflow alert: {name}', body: '' }
  : { kind, body: '' }

function validate(x: Draft) {
  const e: string[] = []
  if (!x.name.trim()) e.push('Give the workflow a name.')
  const def = trigDef(x.trigger.kind)
  if (!def) e.push('Choose an enrollment trigger.')
  else if (def.values && !x.trigger.value) e.push(`Choose a value for “${def.label}”.`)
  if (!x.actions.length) e.push('Add at least one action.')
  x.actions.forEach((a, i) => {
    if (a.kind === 'task' && !a.title.trim()) e.push(`Action ${i + 1}: the task needs a title.`)
    if (a.kind === 'task' && (!Number.isFinite(a.dueInDays) || a.dueInDays < 0)) e.push(`Action ${i + 1}: due date must be 0 days or more.`)
    if (a.kind === 'notify' && !a.title.trim()) e.push(`Action ${i + 1}: the notification needs a title.`)
    if (a.kind === 'note' && !a.body.trim()) e.push(`Action ${i + 1}: the note can’t be empty.`)
  })
  return e
}

/** Remounts per id so the local draft is reloaded when navigating from 'new' to the saved record. */
export function WorkflowEditor({ id }: { id: string }) {
  return <Editor key={id} id={id} />
}

function Editor({ id }: { id: string }) {
  const { go, open, toast } = useHNav()
  const { isAgent } = useDesk()
  const isNew = id === 'new'
  const wf = useRecord<any>('hubspot.workflows', isNew ? null : id)
  const forms = useCollection<any>('hubspot.forms')
  const [d, setD] = useState<Draft>(() => toDraft(isNew ? null : db.find('hubspot.workflows', id)))
  const [tab, setTab] = useState<'actions' | 'history'>('actions')
  const [panel, setPanel] = useState<Panel>(null)
  const [showErrors, setShowErrors] = useState(false)

  if (!isNew && !wf)
    return (
      <div className="p-8 text-[14px]">
        Workflow not found. <HLink onClick={() => go({ page: 'workflows' })}>Back to workflows</HLink>
      </div>
    )

  const dirty = isNew || snapshot(d) !== snapshot(toDraft(wf))
  const enabled = isNew ? d.enabled : !!wf.enabled
  const errors = showErrors ? validate(d) : []
  const triggers = WF_TRIGGERS.filter((t) => t.object === d.object)
  const def = trigDef(d.trigger.kind)

  const setObject = (o: WfObject) => {
    setPanel(null)
    setD((s) => ({
      ...s,
      object: o,
      trigger: { kind: '' },
      actions: s.actions.filter((a) => a.kind === 'task' || a.kind === 'notify' || (a.kind === 'note' && o !== 'Ticket') || (a.kind === 'set_property' && WF_PROPS[o].some((p) => p.field === a.field))),
    }))
  }
  const setTriggerKind = (k: string) => setD((s) => ({ ...s, trigger: k ? { kind: k as WfTriggerKind, value: trigDef(k)?.values ? '' : undefined } : { kind: '' } }))
  const patchAction = (i: number, patch: Record<string, any>) => setD((s) => ({ ...s, actions: s.actions.map((a, j) => (j === i ? ({ ...a, ...patch } as WfAction) : a)) }))
  const insertAction = (at: number, kind: WfAction['kind']) => {
    setD((s) => ({ ...s, actions: [...s.actions.slice(0, at), newAction(kind, s.object), ...s.actions.slice(at)] }))
    setPanel({ mode: 'action', index: at })
  }
  const removeAction = (i: number) => {
    setD((s) => ({ ...s, actions: s.actions.filter((_, j) => j !== i) }))
    setPanel(null)
    toast('Action removed.')
  }

  const setEnabled = (on: boolean) => {
    if (isNew) {
      setD((s) => ({ ...s, enabled: on }))
      return
    }
    db.update('hubspot.workflows', id, { enabled: on, updatedAt: new Date().toISOString() })
    toast(`Workflow turned ${on ? 'on' : 'off'}.`)
  }

  /** returns the saved workflow id, or null when validation failed */
  const save = (): string | null => {
    const e = validate(d)
    setShowErrors(true)
    if (e.length) {
      toast(e.length === 1 ? e[0] : `Fix ${e.length} issues before saving.`)
      return null
    }
    setShowErrors(false)
    const now = new Date().toISOString()
    const trig = trigDef(d.trigger.kind)!
    const body = {
      name: d.name.trim(),
      object: d.object,
      trigger: trig.values ? { kind: d.trigger.kind, value: d.trigger.value } : { kind: d.trigger.kind },
      actions: d.actions,
      updatedAt: now,
    }
    if (isNew) {
      const nid = uid('wf')
      db.insert('hubspot.workflows', { id: nid, ...body, enabled: d.enabled, ownerId: ME.id, createdAt: now, enrolled: 0, history: [], createdBy: isAgent ? 'hworker' : undefined }, { prepend: true })
      toast(d.enabled ? 'Workflow created and turned on.' : 'Workflow created. Turn it on to start enrolling records.')
      go({ page: 'workflow', id: nid })
      return nid
    }
    db.update('hubspot.workflows', id, body)
    toast('Workflow saved.')
    return id
  }

  const test = () => {
    let wid: string | null = id
    if (dirty) wid = save()
    if (!wid) return
    open(<TestWorkflow wfId={wid} />)
  }

  const sel = panel?.mode === 'action' ? d.actions[panel.index] : undefined

  return (
    <div className="h-full min-h-[560px] flex flex-col bg-white">
      {/* header */}
      <div className="h-14 shrink-0 bg-[#213343] text-white flex items-center px-6 gap-4">
        <button onClick={() => go({ page: 'workflows' })} className="flex items-center gap-1 text-[14px]" aria-label="Back to workflows" data-agent="hs-wf-back">
          <ChevronLeft size={16} /> Workflows
        </button>
        <input
          data-agent="hs-wf-name"
          aria-label="Workflow name"
          value={d.name}
          onChange={(e) => setD((s) => ({ ...s, name: e.target.value }))}
          placeholder="Unnamed workflow"
          className="flex-1 min-w-0 h-9 bg-transparent border-b border-dashed border-[#7C98B6] outline-none text-[17px] font-medium placeholder:text-[#CBD6E2]"
        />
        {isNew ? (
          <label className="flex items-center gap-2 text-[13px] text-[#CBD6E2]">
            Object
            <select data-agent="hs-wf-object" aria-label="Workflow object type" value={d.object} onChange={(e) => setObject(e.target.value as WfObject)} className="h-8 px-2 rounded-[3px] bg-[#33475B] border border-[#516F90] text-white text-[13px] outline-none">
              {OBJECTS.map((o) => <option key={o} value={o}>{o}-based</option>)}
            </select>
          </label>
        ) : (
          <span className="text-[13px] text-[#CBD6E2]">{d.object}-based</span>
        )}
        {dirty && !isNew && <span className="text-[12.5px] text-[#FFB000]" data-agent="hs-wf-unsaved">Unsaved changes</span>}
        <Toggle dark on={enabled} onChange={setEnabled} agent="hs-wf-enabled" label={enabled ? 'Turn workflow off' : 'Turn workflow on'} />
        <HBtn variant="ghost" small agent="hs-wf-test" label="Test workflow" onClick={test}><FlaskConical size={14} /> Test</HBtn>
        <HBtn variant="primary" small agent="hs-wf-save" label="Save workflow" onClick={save}>{isNew ? 'Save and review' : 'Save'}</HBtn>
      </div>

      {/* tabs */}
      <div className="shrink-0 flex items-center gap-6 px-6 border-b border-[#DFE3EB] text-[14px] bg-white">
        {(['actions', 'history'] as const).map((t) => (
          <button key={t} data-agent={`hs-wf-tab-${t}`} onClick={() => setTab(t)} className={`h-11 relative capitalize ${tab === t ? 'font-semibold' : 'text-[#516F90]'}`}>
            {t === 'actions' ? 'Actions' : 'History'}
            {tab === t && <span className="absolute left-0 right-0 bottom-0 h-[3px] bg-[#33475B]" />}
          </button>
        ))}
        <div className="flex-1" />
        {!isNew && (
          <span className="text-[13px] text-[#516F90]">
            <b className="text-[#33475B]">{(wf.enrolled ?? 0).toLocaleString()}</b> total enrolled · Last updated {hsDate(wf.updatedAt, true)}
          </span>
        )}
      </div>

      {errors.length > 0 && (
        <div className="shrink-0 px-6 py-3 bg-[#FDEDEE] border-b border-[#F2B8BC] text-[13px] text-[#C93B44]" data-agent="hs-wf-errors" role="alert">
          <b>Fix these issues before saving:</b>
          <ul className="list-disc pl-5 mt-1">{errors.map((e) => <li key={e}>{e}</li>)}</ul>
        </div>
      )}

      {tab === 'actions' ? (
        <div className="flex-1 min-h-0 flex">
          <div className="flex-1 min-w-0 overflow-auto" style={{ backgroundColor: '#F5F8FA', backgroundImage: 'radial-gradient(#CBD6E2 1px, transparent 1px)', backgroundSize: '18px 18px' }}>
            <div className="flex flex-col items-center py-8 px-4">
              {/* trigger */}
              <div data-agent="hs-wf-trigger" className={`w-[420px] bg-white rounded-[4px] border ${showErrors && (!def || (def.values && !d.trigger.value)) ? 'border-[#F2545B]' : 'border-[#CBD6E2]'} shadow-[0_1px_3px_rgba(45,62,80,0.12)]`}>
                <div className="flex items-center gap-2 px-3 h-9 border-b border-[#DFE3EB] text-[12px] font-semibold uppercase tracking-wide rounded-t-[4px]" style={{ borderTop: '3px solid #FF7A59' }}>
                  <Zap size={14} className="text-[#FF7A59]" /> Enrollment trigger
                </div>
                <div className="p-3 space-y-2">
                  <div className="text-[13px] text-[#516F90]">Enroll {d.object.toLowerCase()}s when this happens:</div>
                  <select data-agent="hs-wf-trigger-kind" aria-label="Trigger" value={d.trigger.kind} onChange={(e) => setTriggerKind(e.target.value)} className={`${selectH} w-full`}>
                    <option value="">Choose a trigger…</option>
                    {triggers.map((t) => <option key={t.kind} value={t.kind}>{t.label}</option>)}
                  </select>
                  {def?.values && (
                    <select data-agent="hs-wf-trigger-value" aria-label="Trigger value" value={d.trigger.value ?? ''} onChange={(e) => setD((s) => ({ ...s, trigger: { ...s.trigger, value: e.target.value } }))} className={`${selectH} w-full`}>
                      <option value="">{d.trigger.kind === 'form_submitted' ? 'Choose a form…' : 'Choose a value…'}</option>
                      {def.values().map((v) => <option key={v} value={v}>{d.trigger.kind === 'form_submitted' ? formName(forms, v) : v}</option>)}
                    </select>
                  )}
                  {def && <div className="text-[12.5px] text-[#516F90] pt-1">{triggerSummary(d.trigger, forms)}</div>}
                </div>
              </div>

              {d.actions.map((a, i) => {
                const m = ACTION_META[a.kind]
                const I = m.icon
                const active = panel?.mode === 'action' && panel.index === i
                return (
                  <Fragment key={i}>
                    <Connector onAdd={() => setPanel({ mode: 'pick', at: i })} agent={`hs-wf-add-action-${i}`} active={panel?.mode === 'pick' && panel.at === i} />
                    <div
                      role="button"
                      tabIndex={0}
                      data-agent={`hs-wf-action-${i}`}
                      aria-label={`Edit action ${i + 1}: ${describeAction(a, d.object)}`}
                      onClick={() => setPanel({ mode: 'action', index: i })}
                      onKeyDown={(e) => { if (e.key === 'Enter') setPanel({ mode: 'action', index: i }) }}
                      className={`w-[420px] bg-white rounded-[4px] border cursor-pointer group ${active ? 'border-[#0091AE] shadow-[0_0_0_2px_rgba(0,145,174,0.25)]' : 'border-[#CBD6E2] shadow-[0_1px_3px_rgba(45,62,80,0.12)] hover:shadow-md'}`}
                    >
                      <div className="flex items-center gap-2 px-3 h-9 border-b border-[#DFE3EB] text-[12px] font-semibold uppercase tracking-wide rounded-t-[4px]" style={{ borderTop: `3px solid ${m.color}` }}>
                        <I size={14} style={{ color: m.color }} /> {i + 1}. {m.label}
                        <button
                          data-agent={`hs-wf-action-delete-${i}`}
                          aria-label={`Delete action ${i + 1}`}
                          onClick={(e) => { e.stopPropagation(); removeAction(i) }}
                          className="ml-auto text-[#7C98B6] hover:text-[#C93B44] opacity-0 group-hover:opacity-100 focus:opacity-100"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="px-3 py-3 text-[14px]">
                        <div>{describeAction(a, d.object)}</div>
                        {a.kind === 'task' && <div className="text-[12.5px] text-[#516F90] mt-1">{a.priority} priority · Assigned to {a.assignTo === 'owner' ? `${d.object.toLowerCase()} owner` : person(a.assignTo).name}</div>}
                        {(a.kind === 'notify' || a.kind === 'note') && a.body && <div className="text-[12.5px] text-[#516F90] mt-1 truncate">{a.body}</div>}
                      </div>
                    </div>
                  </Fragment>
                )
              })}

              <Connector onAdd={() => setPanel({ mode: 'pick', at: d.actions.length })} agent="hs-wf-add-action" active={panel?.mode === 'pick' && panel.at === d.actions.length} />
              {!d.actions.length && <div className="text-[12.5px] text-[#516F90] -mt-1 mb-2">Click + to add your first action</div>}
              <div className="px-5 h-8 rounded-full bg-[#EAF0F6] border border-[#CBD6E2] text-[13px] font-semibold flex items-center" data-agent="hs-wf-end">End</div>
            </div>
          </div>

          {panel && (
            <aside className="w-[380px] shrink-0 bg-white border-l border-[#DFE3EB] flex flex-col" data-agent="hs-wf-panel">
              <div className="h-14 shrink-0 px-5 flex items-center bg-[#33475B] text-white text-[16px] font-medium">
                {panel.mode === 'pick' ? 'Choose an action' : sel ? ACTION_META[sel.kind].label : 'Action'}
                <button className="ml-auto" aria-label="Close panel" data-agent="hs-wf-panel-close" onClick={() => setPanel(null)}><X size={18} /></button>
              </div>
              <div className="flex-1 overflow-auto p-5 space-y-4 text-[14px]">
                {panel.mode === 'pick' &&
                  (Object.keys(ACTION_META) as WfAction['kind'][])
                    .filter((k) => !(k === 'note' && d.object === 'Ticket'))
                    .map((k) => {
                      const m = ACTION_META[k]
                      const I = m.icon
                      return (
                        <button key={k} data-agent={`hs-wf-action-kind-${k}`} onClick={() => insertAction(panel.at, k)} className="w-full flex items-start gap-3 p-3 rounded-[4px] border border-[#CBD6E2] hover:border-[#0091AE] hover:bg-[#F5F8FA] text-left">
                          <span className="w-8 h-8 rounded-[4px] flex items-center justify-center shrink-0" style={{ background: `${m.color}1F` }}><I size={16} style={{ color: m.color }} /></span>
                          <span>
                            <span className="block font-semibold">{m.label}</span>
                            <span className="block text-[12.5px] text-[#516F90]">{m.desc}</span>
                          </span>
                        </button>
                      )
                    })}
                {panel.mode === 'action' && sel && <ActionForm a={sel} object={d.object} onChange={(p) => patchAction(panel.index, p)} />}
              </div>
              {panel.mode === 'action' && sel && (
                <div className="shrink-0 px-5 py-4 border-t border-[#DFE3EB] flex gap-2 bg-[#F5F8FA]">
                  <HBtn variant="primary" small agent="hs-wf-panel-done" onClick={() => setPanel(null)}>Done</HBtn>
                  <HBtn variant="secondary" small agent="hs-wf-panel-delete" onClick={() => removeAction(panel.index)}><Trash2 size={13} /> Delete action</HBtn>
                </div>
              )}
            </aside>
          )}
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-auto bg-[#F5F8FA] p-6">
          <div className="bg-white border border-[#DFE3EB] rounded-[4px]" data-agent="hs-wf-history">
            <div className="px-4 py-3 border-b border-[#DFE3EB] flex items-center">
              <span className="text-[15px] font-semibold">Enrollment history</span>
              {!isNew && <span className="ml-auto text-[13px] text-[#516F90]">{(wf.enrolled ?? 0).toLocaleString()} total enrolled · showing the latest {(wf.history ?? []).length}</span>}
            </div>
            {isNew || !(wf.history ?? []).length ? (
              <div className="p-10 text-center text-[14px] text-[#516F90]">
                <div className="text-[16px] font-semibold text-[#33475B] mb-1">No enrollments yet</div>
                {isNew ? 'Save this workflow, turn it on, and records that meet the trigger will appear here.' : 'Records will appear here when they meet the enrollment trigger. Use Test to enroll a record now.'}
              </div>
            ) : (
              <table className="w-full border-collapse">
                <thead><tr>{['Record', 'Enrolled', 'Result'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {(wf.history as any[]).map((h, i) => (
                    <tr key={i} className="hover:bg-[#F5F8FA]">
                      <td className={`${td} font-medium`}>{h.recordName}</td>
                      <td className={td}>{hsDate(h.date, true)}</td>
                      <td className={`${td} whitespace-normal`}>{h.result || <span className="text-[#516F90]">No actions run</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Connector({ onAdd, agent, active }: { onAdd: () => void; agent: string; active?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <span className="w-px h-5 bg-[#7C98B6]" />
      <button
        data-agent={agent}
        aria-label="Add action"
        onClick={onAdd}
        className={`w-6 h-6 rounded-full border flex items-center justify-center ${active ? 'border-[#0091AE] bg-[#0091AE] text-white' : 'border-[#7C98B6] bg-white text-[#33475B] hover:border-[#0091AE] hover:text-[#0091AE]'}`}
      >
        <Plus size={13} />
      </button>
      <span className="w-px h-5 bg-[#7C98B6]" />
    </div>
  )
}

function ActionForm({ a, object, onChange }: { a: WfAction; object: WfObject; onChange: (patch: Record<string, any>) => void }) {
  const area = 'w-full p-3 rounded-[3px] border border-[#CBD6E2] bg-[#F5F8FA] outline-none focus:bg-white focus:border-[#00A4BD] text-[14px]'
  if (a.kind === 'task')
    return (
      <>
        <Field label="Task title" hint="Use {name} to insert the enrolled record’s name.">
          <input data-agent="hs-wf-task-title" aria-label="Task title" value={a.title} onChange={(e) => onChange({ title: e.target.value })} className={`${inputH} w-full`} />
        </Field>
        <Field label="Due in (days)">
          <input data-agent="hs-wf-task-due" aria-label="Due in days" type="number" min={0} value={Number.isFinite(a.dueInDays) ? a.dueInDays : ''} onChange={(e) => onChange({ dueInDays: e.target.value === '' ? NaN : Math.max(0, Math.round(Number(e.target.value))) })} className={`${inputH} w-32`} />
        </Field>
        <Field label="Priority">
          <select data-agent="hs-wf-task-priority" aria-label="Task priority" value={a.priority} onChange={(e) => onChange({ priority: e.target.value })} className={`${selectH} w-full`}>
            {['High', 'Medium', 'Low'].map((p) => <option key={p}>{p}</option>)}
          </select>
        </Field>
        <Field label="Assign to">
          <select data-agent="hs-wf-task-assign" aria-label="Assign task to" value={a.assignTo} onChange={(e) => onChange({ assignTo: e.target.value })} className={`${selectH} w-full`}>
            <option value="owner">{object} owner</option>
            {OWNERS.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </Field>
      </>
    )
  if (a.kind === 'set_property') {
    const prop = WF_PROPS[object].find((p) => p.field === a.field) ?? WF_PROPS[object][0]
    return (
      <>
        <Field label="Property to set">
          <select
            data-agent="hs-wf-prop-field"
            aria-label="Property"
            value={a.field}
            onChange={(e) => onChange({ field: e.target.value, value: WF_PROPS[object].find((p) => p.field === e.target.value)?.options[0] ?? '' })}
            className={`${selectH} w-full`}
          >
            {WF_PROPS[object].map((p) => <option key={p.field} value={p.field}>{p.label}</option>)}
          </select>
        </Field>
        <Field label="Value">
          <select data-agent="hs-wf-prop-value" aria-label="Property value" value={a.value} onChange={(e) => onChange({ value: e.target.value })} className={`${selectH} w-full`}>
            {prop.options.map((o) => <option key={o}>{o}</option>)}
          </select>
        </Field>
        {object === 'Deal' && a.field === 'stage' && (
          <div className="flex gap-2 text-[12.5px] text-[#516F90]"><Info size={14} className="shrink-0 mt-0.5" /> Changing the deal stage logs a stage change on the deal’s timeline.</div>
        )}
      </>
    )
  }
  if (a.kind === 'notify')
    return (
      <>
        <Field label="Notification title" hint="Use {name} to insert the enrolled record’s name.">
          <input data-agent="hs-wf-notify-title" aria-label="Notification title" value={a.title} onChange={(e) => onChange({ title: e.target.value })} className={`${inputH} w-full`} />
        </Field>
        <Field label="Body">
          <textarea data-agent="hs-wf-notify-body" aria-label="Notification body" rows={4} value={a.body} onChange={(e) => onChange({ body: e.target.value })} className={area} />
        </Field>
      </>
    )
  return (
    <Field label="Note" hint="Use {name} to insert the enrolled record’s name.">
      <textarea data-agent="hs-wf-note-body" aria-label="Note body" rows={6} value={a.body} onChange={(e) => onChange({ body: e.target.value })} className={area} />
    </Field>
  )
}

/* ───────────────────────── test modal ───────────────────────── */

function TestWorkflow({ wfId }: { wfId: string }) {
  const { open, toast } = useHNav()
  const wf = useRecord<any>('hubspot.workflows', wfId)
  const object = (wf?.object ?? 'Deal') as WfObject
  const records = useCollection<any>(OBJ_COL[object])
  const forms = useCollection<any>('hubspot.forms')
  const [rid, setRid] = useState('')
  const [temp, setTemp] = useState(true)
  const sorted = useMemo(() => [...records].sort((a, b) => recLabel(object, a).localeCompare(recLabel(object, b))), [records, object])
  if (!wf) return null
  const off = !wf.enabled
  const run = () => {
    const rec = records.find((r) => r.id === rid)
    if (!rec || (off && !temp)) return
    const { kind, value } = wf.trigger as { kind: WfTriggerKind; value?: string }
    const before = wf.enrolled ?? 0
    // only this workflow should run during a test: pause any other live workflow that shares the trigger
    const others = db.get<any>('hubspot.workflows').filter((w) => w.id !== wfId && w.enabled && w.trigger.kind === kind && (!w.trigger.value || w.trigger.value === value))
    for (const w of others) db.update('hubspot.workflows', w.id, { enabled: false })
    if (off) db.update('hubspot.workflows', wfId, { enabled: true })
    try {
      runWorkflows(kind, rid, value)
    } finally {
      if (off) db.update('hubspot.workflows', wfId, { enabled: false })
      for (const w of others) db.update('hubspot.workflows', w.id, { enabled: true })
    }
    const after = db.find<any>('hubspot.workflows', wfId)
    open(null)
    const name = recLabel(object, rec)
    if (after && (after.enrolled ?? 0) > before) toast(`Test complete: ${name} enrolled. ${after.history?.[0]?.result || 'No actions ran.'}`)
    else toast(`Test finished: ${name} was not enrolled.`)
  }
  return (
    <Modal
      title={`Test “${wf.name}”`}
      agent="hs-wf-test-modal"
      onClose={() => open(null)}
      footer={
        <>
          <HBtn variant="primary" small agent="hs-wf-test-run" disabled={!rid || (off && !temp)} onClick={run}>Run test</HBtn>
          <HBtn variant="secondary" small onClick={() => open(null)}>Cancel</HBtn>
        </>
      }
    >
      <div className="text-[13px] text-[#516F90]">
        Trigger: <b className="text-[#33475B]">{triggerSummary(wf.trigger, forms)}</b>
      </div>
      <Field label={`${object} to enroll`} hint="The workflow’s actions run on this record for real: tasks, property updates, notifications and notes are created.">
        <select data-agent="hs-wf-test-record" aria-label={`${object} to test with`} value={rid} onChange={(e) => setRid(e.target.value)} className={`${selectH} w-full`}>
          <option value="">Select a {object.toLowerCase()}…</option>
          {sorted.map((r) => <option key={r.id} value={r.id}>{recLabel(object, r)}{object === 'Contact' && r.email ? ` (${r.email})` : ''}</option>)}
        </select>
      </Field>
      {off && (
        <div className="p-3 rounded-[4px] bg-[#FFF8E5] border border-[#F5C26B] text-[13px] space-y-2">
          <div>This workflow is <b>off</b>. It must be turned on to enroll records automatically.</div>
          <label className="flex items-center gap-2">
            <input type="checkbox" data-agent="hs-wf-test-temp" checked={temp} onChange={(e) => setTemp(e.target.checked)} className="accent-[#FF5C35]" />
            Turn it on just for this test, then switch it back off
          </label>
        </div>
      )}
    </Modal>
  )
}
