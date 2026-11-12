import { useState } from 'react'
import { Calendar, FileText, LayoutGrid, Mail, MoreHorizontal, Pencil, Phone, Search, SquareCheck, StickyNote, TicketCheck, Video, Zap, ArrowRightLeft } from 'lucide-react'
import { db } from '@/db/db'
import { useDesk } from '@/os/context'
import { ME, person } from '@/data/people'
import { Field, HBtn, HWTag, Modal, hsDate, inputH, useHNav } from './ui'
import { createTask, logActivity, logCall, scheduleMeeting, setLifecycle, type Col } from './store'
import { OWNERS } from './owners'

const evIcon: Record<string, any> = { webinar: Video, form: FileText, email: Mail, page: LayoutGrid, note: StickyNote, sequence: Zap, call: Phone, meeting: Calendar, task: SquareCheck, stage: ArrowRightLeft, ticket: TicketCheck }

export type Kind = 'note' | 'email' | 'call' | 'task' | 'meeting'

/** the round action buttons at the top of a record */
export function ActionBar({ col, id, name, email, contactId, dealId }: { col: Col; id: string; name: string; email?: string; contactId?: string; dealId?: string }) {
  const { open } = useHNav()
  const close = () => open(null)
  const items: [any, string, Kind][] = [[StickyNote, 'Note', 'note'], [Mail, 'Email', 'email'], [Phone, 'Call', 'call'], [SquareCheck, 'Task', 'task'], [Calendar, 'Meeting', 'meeting']]
  return (
    <div className="flex gap-4 mt-4">
      {items.map(([I, l, k]) => (
        <div key={l} className="flex flex-col items-center gap-1">
          <button data-agent={`hs-action-${k}`} aria-label={l} onClick={() => open(<Composer kind={k} col={col} id={id} name={name} email={email} contactId={contactId} dealId={dealId} onClose={close} />)} className="w-9 h-9 rounded-full border border-[#CBD6E2] bg-[#F5F8FA] flex items-center justify-center text-[#33475B] hover:bg-[#EAF0F6]"><I size={16} /></button>
          <span className="text-[11.5px]">{l}</span>
        </div>
      ))}
      <div className="flex flex-col items-center gap-1">
        <button className="w-9 h-9 rounded-full border border-[#CBD6E2] bg-[#F5F8FA] flex items-center justify-center text-[#33475B]"><MoreHorizontal size={16} /></button>
        <span className="text-[11.5px]">More</span>
      </div>
    </div>
  )
}

function Composer({ kind, col, id, name, email, contactId, dealId, onClose }: { kind: Kind; col: Col; id: string; name: string; email?: string; contactId?: string; dealId?: string; onClose: () => void }) {
  const { isAgent } = useDesk()
  const { toast } = useHNav()
  const by = isAgent ? 'hworker' : undefined
  const [body, setBody] = useState('')
  const [subject, setSubject] = useState('')
  const [outcome, setOutcome] = useState('Connected')
  const [due, setDue] = useState(new Date(Date.now() + 86400000).toISOString().slice(0, 10))
  const [priority, setPriority] = useState('Medium')
  const [taskType, setTaskType] = useState('To-do')
  const [when, setWhen] = useState(new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10))
  const [mins, setMins] = useState('30')
  const [callMins, setCallMins] = useState('5')
  const cId = col === 'hubspot.contacts' ? id : contactId
  const dId = col === 'hubspot.deals' ? id : dealId
  const titles: Record<Kind, string> = { note: 'Create note', email: 'Email', call: 'Log call', task: 'Create task', meeting: 'Log meeting' }
  const valid = kind === 'task' ? !!subject.trim() : kind === 'email' ? !!subject.trim() && !!body.trim() : kind === 'meeting' ? !!subject.trim() : !!body.trim()
  const save = () => {
    if (kind === 'note') logActivity(col, id, { type: 'note', title: `Note by ${ME.name}`, body, by })
    if (kind === 'email') logActivity(col, id, { type: 'email', title: `Email sent: “${subject}”`, body: `To ${email ?? name} · ${body.slice(0, 160)}`, by })
    if (kind === 'call') {
      if (cId) logCall({ contactId: cId, dealId: dId, ownerId: ME.id, durationSec: outcome === 'Connected' ? Math.round(Number(callMins) * 60) : 0, outcome, notes: body, by })
      else logActivity(col, id, { type: 'call', title: `Logged call — ${outcome}`, body: body, by })
    }
    if (kind === 'meeting') {
      const start = new Date(when + 'T10:00').toISOString()
      if (cId) scheduleMeeting({ title: subject, contactId: cId, dealId: dId, ownerId: ME.id, start, mins: Number(mins), location: 'Zoom', notes: body, outcome: new Date(start) < new Date() ? 'Completed' : 'Scheduled', by })
      else logActivity(col, id, { type: 'meeting', title: `Meeting: ${subject}`, body: `${hsDate(when)} · ${mins} min${body ? ' · ' + body : ''}`, by })
    }
    if (kind === 'task') {
      createTask({ title: subject, type: taskType, dueDate: new Date(due + 'T12:00').toISOString(), priority, ownerId: ME.id, contactId, dealId, notes: body })
      logActivity(col, id, { type: 'task', title: `Task created: ${subject}`, body: `Due ${hsDate(due)} · ${priority} priority`, by })
    }
    toast(kind === 'task' ? 'Task created.' : kind === 'note' ? 'Note saved.' : kind === 'email' ? 'Email sent.' : kind === 'call' ? 'Call logged.' : 'Meeting logged.')
    onClose()
  }
  return (
    <Modal title={`${titles[kind]} — ${name}`} onClose={onClose} agent={`hs-composer-${kind}`} footer={<><HBtn variant="primary" small agent="hs-composer-save" disabled={!valid} onClick={save}>{kind === 'email' ? 'Send' : kind === 'note' ? 'Create note' : 'Save'}</HBtn><HBtn variant="secondary" small onClick={onClose}>Cancel</HBtn></>}>
      {kind === 'email' && <div className="text-[13px] text-[#516F90]">From <b className="text-[#33475B]">{ME.email}</b> · To <b className="text-[#33475B]">{email ?? name}</b></div>}
      {(kind === 'email' || kind === 'task' || kind === 'meeting') && (
        <Field label={kind === 'email' ? 'Subject' : kind === 'task' ? 'Task title' : 'Meeting title'}>
          <input data-agent="hs-composer-subject" aria-label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} className={`${inputH} w-full`} />
        </Field>
      )}
      {kind === 'call' && (
        <Field label="Call outcome">
          <select aria-label="Outcome" value={outcome} onChange={(e) => setOutcome(e.target.value)} className={`${inputH} w-full`}>
            {['Connected', 'Left voicemail', 'No answer', 'Busy', 'Wrong number'].map((o) => <option key={o}>{o}</option>)}
          </select>
        </Field>
      )}
      {kind === 'call' && outcome === 'Connected' && (
        <Field label="Duration (minutes)"><input type="number" min={1} aria-label="Call duration" value={callMins} onChange={(e) => setCallMins(e.target.value)} className={`${inputH} w-full`} /></Field>
      )}
      {kind === 'task' && (
        <div className="grid grid-cols-3 gap-3">
          <Field label="Due date"><input type="date" value={due} onChange={(e) => setDue(e.target.value)} className={`${inputH} w-full`} /></Field>
          <Field label="Priority"><select value={priority} onChange={(e) => setPriority(e.target.value)} className={`${inputH} w-full`}>{['High', 'Medium', 'Low'].map((o) => <option key={o}>{o}</option>)}</select></Field>
          <Field label="Type"><select value={taskType} onChange={(e) => setTaskType(e.target.value)} className={`${inputH} w-full`}>{['To-do', 'Call', 'Email'].map((o) => <option key={o}>{o}</option>)}</select></Field>
        </div>
      )}
      {kind === 'meeting' && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date"><input type="date" value={when} onChange={(e) => setWhen(e.target.value)} className={`${inputH} w-full`} /></Field>
          <Field label="Duration"><select value={mins} onChange={(e) => setMins(e.target.value)} className={`${inputH} w-full`}>{['15', '30', '45', '60'].map((o) => <option key={o} value={o}>{o} minutes</option>)}</select></Field>
        </div>
      )}
      <Field label={kind === 'note' ? 'Note' : kind === 'email' ? 'Message' : kind === 'task' ? 'Notes' : 'Notes'}>
        <textarea data-agent="hs-composer-body" aria-label="Body" value={body} onChange={(e) => setBody(e.target.value)} rows={kind === 'email' ? 8 : 5} placeholder={kind === 'note' ? 'Start typing to leave a note…' : ''} className="w-full p-3 rounded-[3px] border border-[#CBD6E2] bg-[#F5F8FA] outline-none focus:border-[#00A4BD] focus:bg-white text-[14px]" />
      </Field>
    </Modal>
  )
}

const FILTERS: [string, string[]][] = [['All activity', []], ['Notes', ['note']], ['Emails', ['email', 'sequence']], ['Calls', ['call']], ['Meetings', ['meeting']], ['Tasks', ['task']], ['Changes', ['stage']]]

export function Timeline({ events, title = 'Recent activities' }: { events: any[]; title?: string }) {
  const [q, setQ] = useState('')
  const [f, setF] = useState(0)
  const [collapsed, setCollapsed] = useState(false)
  const rows = events.filter((e) => (!FILTERS[f][1].length || FILTERS[f][1].includes(e.type)) && (!q || `${e.title} ${e.body}`.toLowerCase().includes(q.toLowerCase())))
  return (
    <div className="bg-white border border-[#DFE3EB] rounded-[4px]">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#DFE3EB]">
        <span className="text-[15px] font-semibold flex-1">{title}</span>
        <div className="flex items-center h-8 w-[200px] border border-[#CBD6E2] rounded-[3px] px-2 gap-1 text-[#7C98B6] text-[13px]">
          <Search size={13} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search activities" className="flex-1 outline-none bg-transparent text-[#33475B] min-w-0" />
        </div>
        <button onClick={() => setCollapsed(!collapsed)} className="text-[13px] text-[#0091AE] font-medium">{collapsed ? 'Expand all' : 'Collapse all'}</button>
      </div>
      <div className="flex gap-1 px-3 pt-2 border-b border-[#DFE3EB] overflow-x-auto">
        {FILTERS.map(([l], i) => (
          <button key={l} onClick={() => setF(i)} className={`h-8 px-3 text-[13px] whitespace-nowrap relative ${f === i ? 'font-semibold text-[#33475B]' : 'text-[#516F90]'}`}>
            {l}{f === i && <span className="absolute left-2 right-2 bottom-0 h-[2px] bg-[#FF5C35]" />}
          </button>
        ))}
      </div>
      <div className="px-4 py-3 space-y-3">
        {rows.map((e, i) => {
          const I = evIcon[e.type] ?? FileText
          return (
            <div key={i} className={`border border-[#DFE3EB] rounded-[4px] p-3 ${e.by === 'hworker' ? 'flash-new' : ''}`}>
              <div className="flex items-center gap-2 text-[13px]">
                <span className="w-7 h-7 rounded-full bg-[#EAF0F6] flex items-center justify-center text-[#516F90]"><I size={14} /></span>
                <span className="font-semibold flex-1">{e.title}</span>
                {e.by === 'hworker' && <HWTag />}
                <span className="text-[12px] text-[#516F90]">{hsDate(e.date, true)}</span>
              </div>
              {!collapsed && <div className="text-[13px] text-[#516F90] mt-1.5 pl-9 whitespace-pre-wrap">{e.body}</div>}
            </div>
          )
        })}
        {!rows.length && <div className="text-[13px] text-[#516F90] py-4 text-center">No activities match. Log a note, email, call or meeting from the actions above.</div>}
      </div>
    </div>
  )
}

/** a property row that turns into an input when clicked and saves on blur/enter */
export function EditableProp({ col, id, field, label, value, options, type = 'text', format, readOnly, number }: { col: string; id: string; field: string; label: string; value: any; options?: string[]; type?: string; format?: (v: any) => string; readOnly?: boolean; number?: boolean }) {
  const [edit, setEdit] = useState(false)
  const [v, setV] = useState('')
  const start = () => {
    if (readOnly) return
    setV(String(value ?? ''))
    setEdit(true)
  }
  const save = (next = v) => {
    setEdit(false)
    const val = number ? Number(next) || 0 : next
    if (val === value) return
    if (col === 'hubspot.contacts' && field === 'lifecycleStage') setLifecycle(id, String(val))
    else db.update(col, id, { [field]: val })
  }
  const shown = format ? format(value) : value
  return (
    <div className="py-2 group" data-agent={`hs-prop-${field}`}>
      <div className="text-[12px] text-[#516F90]">{label}</div>
      {edit ? (
        options ? (
          <select autoFocus value={v} onChange={(e) => save(e.target.value)} onBlur={() => setEdit(false)} className={`${inputH} h-8 w-full`}>
            {options.map((o) => <option key={o}>{o}</option>)}
          </select>
        ) : (
          <input autoFocus type={type} value={v} onChange={(e) => setV(e.target.value)} onBlur={() => save()} onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEdit(false) }} className={`${inputH} h-8 w-full`} />
        )
      ) : (
        <button onClick={start} className={`text-[14px] text-left w-full flex items-center gap-1 border-b border-transparent ${readOnly ? '' : 'hover:border-[#CBD6E2]'}`}>
          <span className="flex-1 min-w-0 truncate">{shown === undefined || shown === null || shown === '' ? '--' : shown}</span>
          {!readOnly && <Pencil size={11} className="text-[#7C98B6] opacity-0 group-hover:opacity-100" />}
        </button>
      )}
    </div>
  )
}

export function OwnerProp({ col, id, ownerId }: { col: string; id: string; ownerId: string }) {
  const [edit, setEdit] = useState(false)
  return (
    <div className="py-2 group">
      <div className="text-[12px] text-[#516F90]">Owner</div>
      {edit ? (
        <select autoFocus value={ownerId} onChange={(e) => { db.update(col, id, { ownerId: e.target.value }); setEdit(false) }} onBlur={() => setEdit(false)} className={`${inputH} h-8 w-full`}>
          {OWNERS.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      ) : (
        <button onClick={() => setEdit(true)} className="text-[14px] text-left w-full flex items-center gap-1 border-b border-transparent hover:border-[#CBD6E2]">{person(ownerId).name}<Pencil size={11} className="text-[#7C98B6] opacity-0 group-hover:opacity-100" /></button>
      )}
    </div>
  )
}
