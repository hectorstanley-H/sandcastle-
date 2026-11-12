import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, Menu, Paperclip, MessageSquare, SlidersHorizontal, MoreHorizontal, Search, Info, Lock, Unlock, X, FileText, Plus, BookOpen } from 'lucide-react'
import { db, useCollection, useRecord } from '@/db/db'
import { useDesk } from '@/os/context'
import { ME, person, PEOPLE } from '@/data/people'
import { Avatar } from '@/components/Avatar'
import {
  type Incident, PRIORITY_LABEL, LEVEL, prio, STATES, CATEGORIES, CLOSE_CODES, fmtSN, FieldRow, inputCls, RefButtons, HWChip, PriorityCell,
  Popover, MenuItem, Modal, btnCls, primaryCls, useFlash, copyText, slaFor, fmtDur,
} from './shared'

/** Reference field with type-ahead (like ServiceNow's sys_user_group lookup) */
export function RefInput({ value, onChange, options, agent, label, optionAgent }: { value: string; onChange: (v: string) => void; options: { id: string; name: string; sub?: string }[]; agent: string; label: string; optionAgent: string }) {
  const [text, setText] = useState(value)
  const [open, setOpen] = useState(false)
  const [all, setAll] = useState(false)
  const [preview, setPreview] = useState(false)
  useEffect(() => setText(value), [value])
  const q = text.trim().toLowerCase()
  const matches = open && all ? options.slice(0, 40) : open && q ? options.filter((o) => o.name.toLowerCase().includes(q)).slice(0, 8) : []
  const cur = options.find((o) => o.name === value)
  return (
    <div className="relative flex items-center gap-1">
      <input
        data-agent={agent}
        aria-label={label}
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          setOpen(true)
          setAll(false)
          if (!e.target.value) onChange('')
        }}
        onBlur={() => setTimeout(() => { setOpen(false); setAll(false) }, 200)}
        className={inputCls}
      />
      <RefButtons onLookup={() => { setAll(true); setOpen(true) }} onPreview={() => setPreview((p) => !p)} />
      {matches.length > 0 && (
        <div className="absolute z-30 left-0 top-[33px] w-[calc(100%-60px)] max-h-[300px] overflow-auto bg-white border border-[#8790A1] rounded-[4px] shadow-[0_6px_18px_rgba(0,0,0,0.18)] py-1">
          {matches.map((o) => (
            <button
              key={o.id}
              data-agent={`${optionAgent}-${o.id}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(o.name)
                setText(o.name)
                setOpen(false)
                setAll(false)
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-[#E1EDFA] flex items-baseline gap-3"
            >
              <span className="text-[14px] text-[#1B1D21]">{o.name}</span>
              {o.sub && <span className="text-[12px] text-[#5B616B] truncate">{o.sub}</span>}
            </button>
          ))}
        </div>
      )}
      {preview && (
        <Popover onClose={() => setPreview(false)} className="right-0 top-[34px] w-[300px] !py-0">
          <div className="px-4 py-2 border-b border-[#DADDE2] font-bold text-[13px]">{label}</div>
          <div className="px-4 py-3 text-[13px]">
            {cur ? (
              <>
                <div className="font-bold text-[14px]">{cur.name}</div>
                {cur.sub && <div className="text-[#5B616B] mt-0.5">{cur.sub}</div>}
              </>
            ) : (
              <span className="text-[#5B616B]">No record selected</span>
            )}
          </div>
        </Popover>
      )}
    </div>
  )
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-')

export function useGroupOptions() {
  const groups = useCollection<any>('servicenow.groups')
  return groups.map((g) => ({ id: g.id, name: g.name, sub: g.description }))
}
export function useUserOptions(group: string) {
  const groups = useCollection<any>('servicenow.groups')
  const g = groups.find((x) => x.name === group)
  const names: string[] = g ? g.members : Array.from(new Set(groups.flatMap((x: any) => x.members)))
  return [...names.map((n) => ({ id: slug(n), name: n, sub: g?.name })), ...(g ? [] : [{ id: 'alex-morgan', name: ME.name, sub: 'Operations' }])]
}
const callerOptions = PEOPLE.filter((p) => !p.external).map((p) => ({ id: p.id, name: p.name, sub: `${p.title} · ${p.location}` }))

type Draft = Partial<Incident> & { note?: string }

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <div className="text-[16px] font-bold text-[#1B1D21] mb-3 px-1">{title}</div>
      {children}
    </div>
  )
}
void Section

const HOST = 'https://northwind.service-now.com'
const nextNumber = (prefix: string, nums: string[], floor: number, width = 7) => {
  const max = Math.max(floor, ...nums.map((n) => Number(String(n).replace(/\D/g, '')) || 0))
  return `${prefix}${String(max + 1).padStart(width, '0')}`
}

/** Knowledge search popover used by the short-description "suggestion" button */
function KbSuggest({ text, onClose, onOpenKb }: { text: string; onClose: () => void; onOpenKb?: (id: string) => void }) {
  const kb = useCollection<any>('servicenow.kb')
  const words = text.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3)
  const hits = kb
    .map((a) => ({ a, score: words.filter((w) => (a.title + ' ' + a.body + ' ' + a.category).toLowerCase().includes(w)).length }))
    .filter((x) => x.score > 0)
    .sort((x, y) => y.score - x.score)
    .slice(0, 5)
  return (
    <Popover onClose={onClose} className="right-0 top-[34px] w-[420px] !py-0" agent="sn-kb-suggest">
      <div className="px-4 py-2 border-b border-[#DADDE2] font-bold text-[13px] flex items-center gap-2"><BookOpen size={14} /> Related Search Results</div>
      {hits.length ? (
        hits.map(({ a }) => (
          <button key={a.id} onClick={() => { onOpenKb?.(a.id); onClose() }} className="w-full text-left px-4 py-2 hover:bg-[#EEF4FB] border-b border-[#EDEFF2] last:border-b-0">
            <div className="text-[14px] text-[#1F6FB2]">{a.title}</div>
            <div className="text-[12px] text-[#5B616B]">{a.number} · {a.kb} › {a.category} · {a.views.toLocaleString()} views</div>
          </button>
        ))
      ) : (
        <div className="px-4 py-4 text-[13px] text-[#5B616B]">No knowledge articles match this short description.</div>
      )}
    </Popover>
  )
}

export function IncidentForm({ id, onBack, onOpen, onOpenKb, onOpenRecord }: { id: string; onBack: () => void; onOpen?: (id: string) => void; onOpenKb?: (id: string) => void; onOpenRecord?: (kind: 'problem' | 'change', id: string) => void }) {
  const { isAgent } = useDesk()
  const flash = useFlash()
  const inc = useRecord<Incident>('servicenow.incidents', id)
  const all = useCollection<Incident>('servicenow.incidents')
  const problems = useCollection<any>('servicenow.problems')
  const changes = useCollection<any>('servicenow.changes')
  const groupOpts = useGroupOptions()
  const [d, setD] = useState<Draft>({})
  const [tab, setTab] = useState<'notes' | 'related' | 'resolution'>('notes')
  const [error, setError] = useState('')
  const [rel, setRel] = useState('sla')
  const [workNotes, setWorkNotes] = useState(true)
  const [menu, setMenu] = useState<null | 'ctx' | 'more' | 'kb' | 'actfilter'>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [watchEdit, setWatchEdit] = useState(false)
  const [actKinds, setActKinds] = useState<Set<string>>(new Set(['work', 'comment', 'field']))
  const [hideRelated, setHideRelated] = useState(false)
  const [taskText, setTaskText] = useState('')
  const [, tick] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)
  const notesRef = useRef<HTMLTextAreaElement>(null)
  const v = { ...inc, ...d } as Incident & { note?: string }
  const userOpts = useUserOptions(v.assignmentGroup)
  useEffect(() => {
    setD({})
    setTab('notes')
    setError('')
    setWorkNotes(true)
    setMenu(null)
  }, [id])
  // live SLA timers
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30_000)
    return () => clearInterval(t)
  }, [])
  if (!inc) return <div className="flex-1 p-8 text-[#5B616B]">Record not found</div>
  const set = (p: Draft) => setD((x) => ({ ...x, ...p }))

  const save = (opts: { resolve?: boolean; back?: boolean }) => {
    const patch: Partial<Incident> = { ...d }
    delete (patch as any).note
    if (opts.resolve) {
      if (!v.closeCode || !v.closeNotes) {
        setTab('resolution')
        setError('The following mandatory fields are not filled in: Resolution code, Resolution notes')
        return
      }
      patch.state = 'Resolved'
    }
    patch.priority = prio(v.impact, v.urgency)
    const now = new Date().toISOString()
    if (patch.state && ['Resolved', 'Closed'].includes(patch.state) && patch.state !== inc.state) {
      patch.resolvedAt = now
      patch.resolvedBy = ME.name
    }
    const changes: string[] = []
    const label: Record<string, string> = { category: 'Category', subcategory: 'Subcategory', assignmentGroup: 'Assignment group', assignedTo: 'Assigned to', state: 'State', impact: 'Impact', urgency: 'Urgency', closeCode: 'Resolution code', service: 'Service' }
    for (const k of Object.keys(label)) {
      const nv = (patch as any)[k]
      if (nv !== undefined && nv !== (inc as any)[k]) changes.push(`${label[k]}: ${k === 'impact' || k === 'urgency' ? LEVEL[nv] : nv}`)
    }
    if (patch.callerId && patch.callerId !== inc.callerId) changes.push(`Caller: ${person(patch.callerId).name}`)
    if (patch.priority !== inc.priority) changes.push(`Priority: ${PRIORITY_LABEL[patch.priority]}`)
    const acts = [...inc.activity]
    const via = isAgent ? 'hworker' : undefined
    if (changes.length) acts.unshift({ id: `a-${Date.now()}`, author: ME.name, date: now, kind: 'field', text: changes.join('\n'), via })
    if (d.note?.trim()) acts.unshift({ id: `a-${Date.now()}n`, author: ME.name, date: now, kind: workNotes ? 'work' : 'comment', text: d.note.trim(), via })
    if (opts.resolve && v.closeNotes) acts.unshift({ id: `a-${Date.now()}r`, author: ME.name, date: now, kind: 'field', text: `State: Resolved\nResolution notes: ${v.closeNotes}`, via })
    db.update('servicenow.incidents', id, { ...patch, activity: acts, updated: now, updatedBy: isAgent ? 'hworker' : inc.updatedBy })
    setD({})
    setError('')
    if (opts.back) onBack()
  }

  const logField = (text: string, extra: Partial<Incident> = {}) => {
    const now = new Date().toISOString()
    db.update('servicenow.incidents', id, (r) => ({ ...extra, updated: now, activity: [{ id: `a-${Date.now()}f`, author: ME.name, date: now, kind: 'field', text }, ...r.activity] }))
  }
  const following = !!inc.followers?.includes(ME.id)
  const toggleFollow = () => {
    db.update('servicenow.incidents', id, (r) => ({ followers: following ? (r.followers ?? []).filter((x: string) => x !== ME.id) : [...(r.followers ?? []), ME.id] }))
    flash(following ? `You are no longer following ${inc.number}` : `You are now following ${inc.number}. You will be notified of updates.`)
  }
  const onFiles = (files: FileList | null) => {
    if (!files?.length) return
    const now = new Date().toISOString()
    const add = Array.from(files).map((f, n) => ({ id: `att-${Date.now()}${n}`, name: f.name, size: f.size, by: ME.name, date: now }))
    logField(`Attachment added: ${add.map((a) => a.name).join(', ')}`, { attachments: [...(inc.attachments ?? []), ...add] })
    flash(`${add.length} attachment${add.length === 1 ? '' : 's'} added`)
  }
  const createLinked = (kind: 'problem' | 'change') => {
    const now = new Date().toISOString()
    if (kind === 'problem') {
      const number = nextNumber('PRB', problems.map((p) => p.number), 40211)
      const pid = `prb-${Date.now().toString(36)}`
      db.insert('servicenow.problems', { id: pid, number, shortDescription: inc.shortDescription, description: inc.description, state: 'New', impact: inc.impact, urgency: inc.urgency, priority: inc.priority, assignmentGroup: inc.assignmentGroup, assignedTo: '', category: inc.category, ci: inc.ci, knownError: false, workaround: '', rootCause: '', relatedIncidents: [inc.id], opened: now, updated: now, activity: [{ id: `pa-${Date.now()}`, author: ME.name, date: now, kind: 'work', text: `Problem created from ${inc.number}` }] }, { prepend: true })
      logField(`Problem: ${number}`, { problemId: pid })
      flash(`Problem ${number} created and linked`)
    } else {
      const number = nextNumber('CHG', changes.map((c) => c.number), 30121)
      const cid = `chg-${Date.now().toString(36)}`
      db.insert('servicenow.changes', { id: cid, number, shortDescription: `Fix: ${inc.shortDescription}`, description: `Raised from ${inc.number}.\n\n${inc.description}`, type: 'Normal', state: 'New', risk: 'Moderate', impact: LEVEL[inc.impact], assignmentGroup: inc.assignmentGroup, assignedTo: '', requestedBy: ME.id, plannedStart: '', plannedEnd: '', ci: inc.ci, approval: 'Not Yet Requested', justification: '', implementationPlan: '', backoutPlan: '', testPlan: '', opened: now, updated: now, activity: [] }, { prepend: true })
      logField(`Change Request: ${number}`, { changeRequest: cid })
      flash(`Change request ${number} created and linked`)
    }
  }
  const children = all.filter((x) => x.duplicateOf === id)
  const problem = problems.find((p) => p.id === (v.problemId ?? ''))
  const change = changes.find((c) => c.id === (v.changeRequest ?? ''))
  const slas = slaFor(inc)
  const tasks = inc.tasks ?? []
  const watch = inc.watchList ?? [inc.callerId]

  const caller = person(v.callerId)
  const btn = 'h-8 px-3 rounded-[4px] border border-[#8790A1] bg-white text-[14px] font-bold text-[#1B1D21] hover:bg-[#F1F3F5]'
  const ctxItems = (
    <>
      <MenuItem onClick={() => { save({}); setMenu(null); flash('Record saved') }}>Save</MenuItem>
      <MenuItem onClick={() => { logField(`Assigned to: ${ME.name}`, { assignedTo: ME.name, state: inc.state === 'New' ? 'In Progress' : inc.state }); setMenu(null); flash(`${inc.number} assigned to you`) }}>Assign to me</MenuItem>
      <div className="h-px bg-[#DADDE2] my-1" />
      <MenuItem disabled={!!v.problemId} onClick={() => { createLinked('problem'); setMenu(null) }}>Create Problem</MenuItem>
      <MenuItem disabled={!!v.changeRequest} onClick={() => { createLinked('change'); setMenu(null) }}>Create Normal Change</MenuItem>
      <div className="h-px bg-[#DADDE2] my-1" />
      <MenuItem onClick={() => { copyText(`${HOST}/incident.do?sys_id=${inc.id}`); setMenu(null); flash('URL copied to clipboard') }}>Copy URL</MenuItem>
      <MenuItem onClick={() => { copyText(inc.id); setMenu(null); flash('sys_id copied to clipboard') }}>Copy sys_id</MenuItem>
      <MenuItem onClick={() => { setD({}); setError(''); setMenu(null); flash('Form reloaded — unsaved changes discarded') }}>Reload form</MenuItem>
    </>
  )
  return (
    <div className="flex-1 min-h-0 flex flex-col bg-white relative">
      <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => { onFiles(e.target.files); e.target.value = '' }} />
      <div className="h-[52px] shrink-0 flex items-center gap-1.5 px-3 border-b border-[#DADDE2] bg-[#F6F7F8]">
        <button data-agent="sn-form-back" onClick={onBack} aria-label="Back" className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#E4E7EB]"><ChevronLeft size={20} /></button>
        <span className="relative">
          <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#E4E7EB]" aria-label="Additional actions" onClick={() => setMenu(menu === 'ctx' ? null : 'ctx')}><Menu size={18} /></button>
          {menu === 'ctx' && <Popover onClose={() => setMenu(null)} className="left-0 top-9 w-[230px]" agent="sn-form-context-menu">{ctxItems}</Popover>}
        </span>
        <div className="leading-tight ml-1">
          <div className="text-[13px] text-[#5B616B]">Incident</div>
          <div className="text-[17px] font-bold text-[#1B1D21]" data-agent="sn-form-number">{inc.number}</div>
        </div>
        {inc.updatedBy === 'hworker' && <span className="ml-2"><HWChip /></span>}
        <div className="flex-1" />
        <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#E4E7EB] text-[#2E3238] relative" aria-label="Manage attachments" title="Manage attachments" onClick={() => fileRef.current?.click()}>
          <Paperclip size={17} />
          {!!inc.attachments?.length && <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-[#032D42] text-white text-[10px] font-bold flex items-center justify-center">{inc.attachments.length}</span>}
        </button>
        <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#E4E7EB] text-[#2E3238]" aria-label="Activity stream" title="Activity stream" onClick={() => { setTab('notes'); setTimeout(() => notesRef.current?.focus(), 0) }}><MessageSquare size={17} /></button>
        <button className={`w-8 h-8 flex items-center justify-center rounded hover:bg-[#E4E7EB] ${hideRelated ? 'text-[#0C66E4]' : 'text-[#2E3238]'}`} aria-label="Personalize form" title={hideRelated ? 'Show related lists' : 'Hide related lists'} onClick={() => setHideRelated((h) => !h)}><SlidersHorizontal size={17} /></button>
        <span className="relative">
          <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#E4E7EB] text-[#2E3238]" aria-label="More options" onClick={() => setMenu(menu === 'more' ? null : 'more')}><MoreHorizontal size={17} /></button>
          {menu === 'more' && <Popover onClose={() => setMenu(null)} className="right-0 top-9 w-[230px]">{ctxItems}</Popover>}
        </span>
        <span className="w-px h-6 bg-[#DADDE2] mx-1" />
        <button className={btn} onClick={toggleFollow} aria-pressed={following}>{following ? 'Following' : 'Follow'}</button>
        <button data-agent="sn-form-save" onClick={() => save({})} className={btn}>Save</button>
        <button data-agent="sn-form-update" onClick={() => save({ back: true })} className="h-8 px-4 rounded-[4px] bg-[#032D42] hover:bg-[#0B3F59] text-white text-[14px] font-bold">Update</button>
        <button data-agent="sn-form-resolve" onClick={() => save({ resolve: true, back: true })} className={btn}>Resolve</button>
        <button className={btn} onClick={() => setConfirmDelete(true)}>Delete</button>
      </div>
      {error && <div className="shrink-0 px-4 py-2 bg-[#FBE9E9] text-[#A52A2A] text-[14px] border-b border-[#F0C2C2]">{error}</div>}
      <div className="flex-1 min-h-0 overflow-auto" data-agent="sn-form">
        <div className="max-w-[1400px] px-4 pt-5 pb-10">
          <div className="grid grid-cols-2 gap-x-4">
            <div>
              <FieldRow label="Number"><input readOnly value={inc.number} className={inputCls} /></FieldRow>
              <FieldRow label="Caller" required mandatoryFilled>
                <RefInput value={caller.name} onChange={(name) => { const p = PEOPLE.find((x) => x.name === name); if (p) set({ callerId: p.id }) }} options={callerOptions} agent="sn-f-caller" label="Caller" optionAgent="sn-ac-caller" />
              </FieldRow>
              <FieldRow label="Category">
                <select data-agent="sn-f-category" aria-label="Category" value={v.category} onChange={(e) => set({ category: e.target.value, subcategory: '' })} className={inputCls}>
                  {Object.keys(CATEGORIES).map((c) => <option key={c}>{c}</option>)}
                </select>
              </FieldRow>
              <FieldRow label="Subcategory">
                <select data-agent="sn-f-subcategory" aria-label="Subcategory" value={v.subcategory} onChange={(e) => set({ subcategory: e.target.value })} className={inputCls}>
                  <option value="">-- None --</option>
                  {(CATEGORIES[v.category] ?? []).map((c) => <option key={c}>{c}</option>)}
                </select>
              </FieldRow>
              <FieldRow label="Service">
                <div className="flex items-center gap-1"><input data-agent="sn-f-service" aria-label="Service" value={v.service} onChange={(e) => set({ service: e.target.value })} className={inputCls} /><RefButtons /></div>
              </FieldRow>
              <FieldRow label="Configuration item">
                <div className="flex items-center gap-1"><input aria-label="Configuration item" value={v.ci} onChange={(e) => set({ ci: e.target.value })} className={inputCls} /><RefButtons onPreview={() => setRel('ci')} /></div>
              </FieldRow>
              <FieldRow label="Channel">
                <select value={v.channel} onChange={(e) => set({ channel: e.target.value })} className={inputCls}>
                  {['Chat', 'Email', 'Phone', 'Self-service', 'Virtual Agent', 'Walk-in'].map((c) => <option key={c}>{c}</option>)}
                </select>
              </FieldRow>
            </div>
            <div>
              <FieldRow label="Opened"><input readOnly value={fmtSN(inc.opened)} className={inputCls} /></FieldRow>
              <FieldRow label="State">
                <select data-agent="sn-f-state" aria-label="State" value={v.state} onChange={(e) => set({ state: e.target.value })} className={inputCls}>
                  {STATES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </FieldRow>
              <FieldRow label="Impact">
                <select data-agent="sn-f-impact" aria-label="Impact" value={v.impact} onChange={(e) => set({ impact: Number(e.target.value) })} className={inputCls}>
                  {[1, 2, 3].map((n) => <option key={n} value={n}>{LEVEL[n]}</option>)}
                </select>
              </FieldRow>
              <FieldRow label="Urgency">
                <select data-agent="sn-f-urgency" aria-label="Urgency" value={v.urgency} onChange={(e) => set({ urgency: Number(e.target.value) })} className={inputCls}>
                  {[1, 2, 3].map((n) => <option key={n} value={n}>{LEVEL[n]}</option>)}
                </select>
              </FieldRow>
              <FieldRow label="Priority">
                <div className={`${inputCls} flex items-center bg-[#EDEFF2]`} data-agent="sn-f-priority"><PriorityCell p={prio(v.impact, v.urgency)} /></div>
              </FieldRow>
              <FieldRow label="Assignment group">
                <RefInput value={v.assignmentGroup} onChange={(g) => set({ assignmentGroup: g, assignedTo: '' })} options={groupOpts} agent="sn-f-group" label="Assignment group" optionAgent="sn-ac" />
              </FieldRow>
              <FieldRow label="Assigned to">
                <RefInput value={v.assignedTo} onChange={(a) => set({ assignedTo: a })} options={userOpts} agent="sn-f-assigned" label="Assigned to" optionAgent="sn-ac-user" />
              </FieldRow>
            </div>
          </div>
          <FieldRow label="Short description" required mandatoryFilled={!!v.shortDescription} wide>
            <div className="flex items-center gap-1 relative">
              <input data-agent="sn-f-short" aria-label="Short description" value={v.shortDescription} onChange={(e) => set({ shortDescription: e.target.value })} className={inputCls} />
              <button className="w-8 h-8 shrink-0 rounded-[4px] border border-[#8790A1] flex items-center justify-center text-[#4A5059] hover:bg-[#F1F3F5]" aria-label="Suggestion" onClick={() => setMenu(menu === 'kb' ? null : 'kb')}><Search size={14} /></button>
              {menu === 'kb' && <KbSuggest text={v.shortDescription + ' ' + v.ci} onClose={() => setMenu(null)} onOpenKb={onOpenKb} />}
            </div>
          </FieldRow>
          <FieldRow label="Description" wide>
            <textarea aria-label="Description" value={v.description} onChange={(e) => set({ description: e.target.value })} rows={3} className={`${inputCls} h-auto py-1.5 resize-y`} />
          </FieldRow>
          {!!inc.attachments?.length && (
            <FieldRow label="Attachments" wide>
              <div className="flex flex-wrap gap-2 pt-1">
                {inc.attachments.map((a) => (
                  <span key={a.id} className="inline-flex items-center gap-1.5 h-7 pl-2 pr-1 rounded-[4px] border border-[#DADDE2] bg-[#F6F7F8] text-[13px]">
                    <FileText size={13} className="text-[#5B616B]" /> <span className="text-[#1F6FB2]">{a.name}</span> <span className="text-[#8A9099]">({Math.max(1, Math.round(a.size / 1024))} KB)</span>
                    <button aria-label={`Remove ${a.name}`} onClick={() => logField(`Attachment removed: ${a.name}`, { attachments: (inc.attachments ?? []).filter((x) => x.id !== a.id) })} className="w-5 h-5 rounded hover:bg-[#E4E7EB] flex items-center justify-center"><X size={12} /></button>
                  </span>
                ))}
              </div>
            </FieldRow>
          )}

          {/* tabs */}
          <div className="mt-6 border-b border-[#C5CAD3] flex gap-1 px-1">
            {[['notes', 'Notes'], ['related', 'Related Records'], ['resolution', 'Resolution Information']].map(([t, l]) => (
              <button key={t} data-agent={`sn-tab-${t}`} onClick={() => setTab(t as any)} className={`h-10 px-4 text-[14px] border-b-[3px] -mb-px ${tab === t ? 'border-[#032D42] font-bold text-[#1B1D21]' : 'border-transparent text-[#4A5059] hover:text-[#1B1D21]'}`}>{l}</button>
            ))}
          </div>
          {tab === 'notes' && (
            <div className="pt-4">
              <FieldRow label="Watch list" wide>
                <div className="flex items-start gap-2 pt-1">
                  <button aria-label={watchEdit ? 'Lock watch list' : 'Unlock watch list'} onClick={() => setWatchEdit((w) => !w)} className="text-[#5B616B] hover:text-[#0C66E4] mt-0.5">{watchEdit ? <Unlock size={15} /> : <Lock size={15} />}</button>
                  {watchEdit ? (
                    <div className="flex-1">
                      <div className="flex flex-wrap gap-1 mb-1.5">
                        {watch.map((w) => (
                          <span key={w} className="inline-flex items-center gap-1 h-6 pl-2 pr-1 rounded-full bg-[#E1EDFA] text-[12px] text-[#0B4FA6]">
                            {person(w).name}
                            <button aria-label={`Remove ${person(w).name}`} onClick={() => db.update('servicenow.incidents', id, { watchList: watch.filter((x) => x !== w) })}><X size={11} /></button>
                          </span>
                        ))}
                      </div>
                      <select value="" onChange={(e) => e.target.value && db.update('servicenow.incidents', id, { watchList: Array.from(new Set([...watch, e.target.value])) })} className={inputCls + ' !w-[260px]'} aria-label="Add to watch list">
                        <option value="">Add user…</option>
                        {PEOPLE.filter((p) => !p.external && !watch.includes(p.id)).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                  ) : (
                    <span className="text-[13px] text-[#5B616B]">{watch.map((w) => person(w).name).join(', ') || '(empty)'}</span>
                  )}
                </div>
              </FieldRow>
              <FieldRow label={workNotes ? 'Work notes' : 'Additional comments'} wide>
                <div className="rounded-[4px] border border-[#8790A1] overflow-hidden">
                  <textarea
                    ref={notesRef}
                    data-agent="sn-f-worknotes"
                    aria-label={workNotes ? 'Work notes' : 'Additional comments'}
                    value={d.note ?? ''}
                    onChange={(e) => set({ note: e.target.value })}
                    rows={3}
                    placeholder={workNotes ? 'Work notes' : 'Additional comments (Customer visible)'}
                    className={`w-full px-2 py-1.5 text-[14px] outline-none resize-y block ${workNotes ? 'bg-[#FFF8E5]' : 'bg-white'}`}
                  />
                  <div className="flex items-center gap-3 px-2 h-9 border-t border-[#E4E7EB] bg-white">
                    <label className="flex items-center gap-1.5 text-[13px]"><input type="checkbox" checked={workNotes} onChange={(e) => setWorkNotes(e.target.checked)} className="accent-[#032D42]" /> Work notes <span className="text-[#5B616B]">(Internal)</span></label>
                    {!workNotes && <span className="text-[12px] text-[#A35F00]">Posting as Additional comments — visible to {caller.name}</span>}
                    <div className="flex-1" />
                    <button data-agent="sn-form-post" onClick={() => save({})} className="h-7 px-3 rounded-[4px] bg-[#032D42] text-white text-[13px] font-bold">Post</button>
                  </div>
                </div>
              </FieldRow>
              <div className="ml-[16%] pl-3 pr-6">
                <div className="flex items-center justify-between py-2 text-[14px] relative">
                  <span className="font-bold">Activities: {inc.activity.length}</span>
                  <span className="relative">
                    <button aria-label="Filter activity" onClick={() => setMenu(menu === 'actfilter' ? null : 'actfilter')} className={`w-7 h-7 rounded flex items-center justify-center hover:bg-[#EDEFF2] ${actKinds.size < 3 ? 'text-[#0C66E4]' : 'text-[#5B616B]'}`}><SlidersHorizontal size={15} /></button>
                    {menu === 'actfilter' && (
                      <Popover onClose={() => setMenu(null)} className="right-0 top-8 w-[220px]">
                        <div className="px-4 pt-1 pb-1 text-[12px] font-bold text-[#5B616B] uppercase">Show in activity</div>
                        {[['work', 'Work notes'], ['comment', 'Additional comments'], ['field', 'Field changes']].map(([k, l]) => (
                          <label key={k} className="flex items-center gap-2 px-4 py-1 hover:bg-[#EEF4FB] cursor-pointer">
                            <input type="checkbox" checked={actKinds.has(k)} onChange={() => setActKinds((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n })} className="accent-[#032D42]" /> {l}
                          </label>
                        ))}
                      </Popover>
                    )}
                  </span>
                </div>
                {inc.activity.filter((a) => actKinds.has(a.kind) || !['work', 'comment', 'field'].includes(a.kind)).map((a) => (
                  <div key={a.id} className={`flex gap-3 mb-3 ${a.via === 'hworker' && Date.now() - +new Date(a.date) < 90000 ? 'flash-new' : ''}`}>
                    <div className="pt-1">{a.author === 'System' ? <span className="w-8 h-8 rounded-full bg-[#DADDE2] flex items-center justify-center text-[11px] font-bold text-[#4A5059]">SYS</span> : <Avatar name={a.author} size={32} />}</div>
                    <div className={`flex-1 rounded-[6px] border border-[#DADDE2] bg-white ${a.kind === 'work' ? 'border-l-[4px] border-l-[#E8A33D]' : a.kind === 'comment' ? 'border-l-[4px] border-l-[#7A8594]' : ''}`}>
                      <div className="flex items-center gap-2 px-3 pt-2 text-[13px]">
                        <span className="font-bold text-[#1B1D21]">{a.author}</span>
                        {a.via === 'hworker' && <HWChip small />}
                        <div className="flex-1" />
                        <span className="text-[#5B616B]">{a.kind === 'work' ? 'Work notes' : a.kind === 'comment' ? 'Additional comments' : 'Field changes'} • {fmtSN(a.date)}</span>
                      </div>
                      <div className="px-3 pb-2 pt-1 text-[14px] text-[#2E3238] whitespace-pre-wrap">
                        {a.kind === 'field'
                          ? a.text.split('\n').map((l, i) => {
                              const [k, ...rest] = l.split(': ')
                              return rest.length ? (
                                <div key={i} className="flex gap-4"><span className="w-[150px] text-[#5B616B]">{k}</span><span>{rest.join(': ')}</span></div>
                              ) : (
                                <div key={i}>{l}</div>
                              )
                            })
                          : a.text}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {tab === 'related' && (
            <div className="pt-4">
              <FieldRow label="Parent Incident" wide>
                <div className="flex items-center gap-1">
                  <input readOnly value={v.duplicateOf ? all.find((x) => x.id === v.duplicateOf)?.number ?? '' : ''} className={inputCls} />
                  <RefButtons onLookup={() => setTab('resolution')} onPreview={() => v.duplicateOf && onOpen?.(v.duplicateOf)} />
                </div>
              </FieldRow>
              <FieldRow label="Problem" wide>
                <div className="flex items-center gap-1">
                  <select aria-label="Problem" value={v.problemId ?? ''} onChange={(e) => set({ problemId: e.target.value })} className={inputCls}>
                    <option value="">-- None --</option>
                    {problems.map((p) => <option key={p.id} value={p.id}>{p.number} — {p.shortDescription.slice(0, 60)}</option>)}
                  </select>
                  <RefButtons onLookup={() => setRel('problem')} onPreview={() => problem && onOpenRecord?.('problem', problem.id)} />
                </div>
              </FieldRow>
              <FieldRow label="Change Request" wide>
                <div className="flex items-center gap-1">
                  <select aria-label="Change Request" value={v.changeRequest ?? ''} onChange={(e) => set({ changeRequest: e.target.value })} className={inputCls}>
                    <option value="">-- None --</option>
                    {changes.map((c) => <option key={c.id} value={c.id}>{c.number} — {c.shortDescription.slice(0, 60)}</option>)}
                  </select>
                  <RefButtons onPreview={() => change && onOpenRecord?.('change', change.id)} />
                </div>
              </FieldRow>
            </div>
          )}
          {tab === 'resolution' && (
            <div className="pt-4 grid grid-cols-2 gap-x-4">
              <div>
                <FieldRow label="Resolution code" required={v.state === 'Resolved' || !!error} mandatoryFilled={!!v.closeCode}>
                  <select data-agent="sn-f-close-code" aria-label="Resolution code" value={v.closeCode ?? ''} onChange={(e) => set({ closeCode: e.target.value })} className={inputCls}>
                    <option value="">-- None --</option>
                    {CLOSE_CODES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </FieldRow>
                <FieldRow label="Parent incident">
                  <select data-agent="sn-f-parent" aria-label="Parent incident" value={v.duplicateOf ?? ''} onChange={(e) => set({ duplicateOf: e.target.value })} className={inputCls}>
                    <option value="">-- None --</option>
                    {all.filter((x) => x.id !== id && !['Closed', 'Canceled'].includes(x.state)).slice(0, 40).map((x) => <option key={x.id} value={x.id}>{x.number} — {x.shortDescription.slice(0, 40)}</option>)}
                  </select>
                </FieldRow>
              </div>
              <div>
                <FieldRow label="Resolved by"><input readOnly value={v.state === 'Resolved' || v.state === 'Closed' ? inc.resolvedBy ?? (v.state === 'Resolved' ? ME.name : '') : ''} className={inputCls} /></FieldRow>
                <FieldRow label="Resolved"><input readOnly value={inc.resolvedAt ? fmtSN(inc.resolvedAt) : ''} className={inputCls} /></FieldRow>
              </div>
              <div className="col-span-2">
                <FieldRow label="Resolution notes" required={v.state === 'Resolved' || !!error} mandatoryFilled={!!v.closeNotes} wide>
                  <textarea data-agent="sn-f-close-notes" aria-label="Resolution notes" value={v.closeNotes ?? ''} onChange={(e) => set({ closeNotes: e.target.value })} rows={3} className={`${inputCls} h-auto py-1.5`} />
                </FieldRow>
              </div>
            </div>
          )}

          {/* related lists */}
          {!hideRelated && (
            <div className="mt-8 border border-[#DADDE2] rounded-[6px] overflow-hidden" data-agent="sn-related-lists">
              <div className="flex border-b border-[#DADDE2] bg-[#F6F7F8] text-[14px]">
                {[['sla', `Task SLAs (${slas.length})`], ['ci', 'Affected CIs (1)'], ['child', `Child Incidents${children.length ? ` (${children.length})` : ''}`], ['problem', `Problems${problem ? ' (1)' : ''}`], ['tasks', `Incident Tasks${tasks.length ? ` (${tasks.length})` : ''}`]].map(([k, l]) => (
                  <button key={k} onClick={() => setRel(k)} className={`h-10 px-4 border-b-[3px] ${rel === k ? 'border-[#032D42] font-bold' : 'border-transparent text-[#4A5059]'}`}>{l}</button>
                ))}
              </div>
              {rel === 'sla' ? (
                <table className="w-full text-[13px]">
                  <thead><tr className="border-b border-[#DADDE2] text-left">{['SLA definition', 'Type', 'Target', 'Stage', 'Business time left', 'Business elapsed percentage', 'Start time'].map((h) => <th key={h} className="px-3 py-2 font-bold">{h}</th>)}</tr></thead>
                  <tbody>
                    {slas.map((s) => {
                      const pct = Math.min(100, s.pct)
                      const color = s.breached ? '#E3242B' : s.pct >= 75 ? '#F2A100' : '#2E8540'
                      return (
                        <tr key={s.name} className="border-b border-[#E4E7EB]" data-agent={`sn-sla-${s.target.toLowerCase()}`}>
                          <td className="px-3 py-2 text-[#1F6FB2]">{s.name}</td><td className="px-3">SLA</td><td className="px-3">{s.target}</td>
                          <td className="px-3"><span className={s.stage === 'Breached' ? 'text-[#C9302C] font-bold' : ''}>{s.stage}</span></td>
                          <td className={`px-3 ${s.leftMs < 0 ? 'text-[#C9302C]' : ''}`}>{s.stage === 'Completed' || s.stage === 'Cancelled' ? '0h 0m' : fmtDur(s.leftMs)}</td>
                          <td className="px-3"><div className="flex items-center gap-2"><div className="w-[140px] h-3 rounded bg-[#E4E7EB] overflow-hidden"><div className="h-full" style={{ width: `${pct}%`, background: color }} /></div><span className="text-[12px] text-[#5B616B]">{s.pct}%</span></div></td>
                          <td className="px-3">{fmtSN(s.start)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              ) : rel === 'ci' ? (
                <table className="w-full text-[13px]">
                  <thead><tr className="border-b border-[#DADDE2] text-left">{['Configuration item', 'Class', 'Operational status', 'Support group'].map((h) => <th key={h} className="px-3 py-2 font-bold">{h}</th>)}</tr></thead>
                  <tbody><tr><td className="px-3 py-2 text-[#1F6FB2]">{v.ci || '(empty)'}</td><td className="px-3">{/vpn|gw|fw|ap-/i.test(v.ci) ? 'Network Gear' : /sap|exchange|okta|workday|salesforce|zendesk|jira/i.test(v.ci) ? 'Business Service' : 'Computer'}</td><td className="px-3">Operational</td><td className="px-3">{v.assignmentGroup || '(empty)'}</td></tr></tbody>
                </table>
              ) : rel === 'child' ? (
                children.length ? (
                  <table className="w-full text-[13px]">
                    <thead><tr className="border-b border-[#DADDE2] text-left">{['Number', 'Short description', 'Caller', 'State', 'Resolution code'].map((h) => <th key={h} className="px-3 py-2 font-bold">{h}</th>)}</tr></thead>
                    <tbody>{children.map((c) => <tr key={c.id} className="border-b border-[#E4E7EB]"><td className="px-3 py-2"><button onClick={() => onOpen?.(c.id)} className="text-[#1F6FB2] hover:underline">{c.number}</button></td><td className="px-3">{c.shortDescription}</td><td className="px-3">{person(c.callerId).name}</td><td className="px-3">{c.state}</td><td className="px-3">{c.closeCode ?? ''}</td></tr>)}</tbody>
                  </table>
                ) : <div className="px-4 py-6 text-[13px] text-[#5B616B] text-center">No records to display</div>
              ) : rel === 'problem' ? (
                problem ? (
                  <table className="w-full text-[13px]">
                    <thead><tr className="border-b border-[#DADDE2] text-left">{['Number', 'Short description', 'State', 'Known error', 'Assignment group'].map((h) => <th key={h} className="px-3 py-2 font-bold">{h}</th>)}</tr></thead>
                    <tbody><tr><td className="px-3 py-2"><button onClick={() => onOpenRecord?.('problem', problem.id)} className="text-[#1F6FB2] hover:underline">{problem.number}</button></td><td className="px-3">{problem.shortDescription}</td><td className="px-3">{problem.state}</td><td className="px-3">{problem.knownError ? 'true' : 'false'}</td><td className="px-3">{problem.assignmentGroup}</td></tr></tbody>
                  </table>
                ) : (
                  <div className="px-4 py-6 text-[13px] text-[#5B616B] text-center">No records to display · <button className="text-[#1F6FB2] hover:underline" onClick={() => createLinked('problem')}>Create Problem</button></div>
                )
              ) : (
                <div>
                  <div className="flex items-center gap-2 px-3 py-2 border-b border-[#DADDE2]">
                    <input value={taskText} onChange={(e) => setTaskText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget.nextElementSibling as HTMLButtonElement)?.click()} placeholder="Short description for a new incident task" className={inputCls + ' !w-[420px]'} aria-label="New incident task" />
                    <button
                      className={btnCls}
                      disabled={!taskText.trim()}
                      onClick={() => {
                        const now = new Date().toISOString()
                        const allTasks = all.flatMap((x) => x.tasks ?? [])
                        const number = nextNumber('TASK', allTasks.map((t) => t.number), 1040000)
                        db.update('servicenow.incidents', id, { tasks: [...tasks, { id: `tsk-${Date.now()}`, number, short: taskText.trim(), state: 'Open', assignedTo: v.assignedTo || '', created: now }] })
                        setTaskText('')
                        flash(`Incident task ${number} created`)
                      }}
                    ><Plus size={13} className="inline -mt-0.5" /> New</button>
                  </div>
                  {tasks.length ? (
                    <table className="w-full text-[13px]">
                      <thead><tr className="border-b border-[#DADDE2] text-left">{['Number', 'Short description', 'State', 'Assigned to', 'Created', ''].map((h) => <th key={h} className="px-3 py-2 font-bold">{h}</th>)}</tr></thead>
                      <tbody>
                        {tasks.map((t) => (
                          <tr key={t.id} className="border-b border-[#E4E7EB]">
                            <td className="px-3 py-2 text-[#1F6FB2]">{t.number}</td><td className="px-3">{t.short}</td>
                            <td className="px-3">
                              <select value={t.state} onChange={(e) => db.update('servicenow.incidents', id, { tasks: tasks.map((x) => (x.id === t.id ? { ...x, state: e.target.value } : x)) })} className="h-7 px-1 rounded border border-[#C5CAD3] text-[13px]" aria-label={`State of ${t.number}`}>
                                {['Open', 'Work in Progress', 'Closed Complete', 'Closed Skipped'].map((s) => <option key={s}>{s}</option>)}
                              </select>
                            </td>
                            <td className="px-3">{t.assignedTo || '(empty)'}</td><td className="px-3">{fmtSN(t.created)}</td>
                            <td className="px-3"><button aria-label={`Delete ${t.number}`} onClick={() => db.update('servicenow.incidents', id, { tasks: tasks.filter((x) => x.id !== t.id) })} className="text-[#5B616B] hover:text-[#C9302C]"><X size={14} /></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="px-4 py-6 text-[13px] text-[#5B616B] text-center">No records to display</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {confirmDelete && (
        <Modal
          title="Confirmation"
          onClose={() => setConfirmDelete(false)}
          footer={
            <>
              <button className={btnCls} onClick={() => setConfirmDelete(false)}>Cancel</button>
              <button className="h-8 px-4 rounded-[4px] bg-[#C9302C] hover:bg-[#A52A2A] text-white text-[14px] font-bold" onClick={() => { db.remove('servicenow.incidents', id); setConfirmDelete(false); flash(`${inc.number} deleted`); onBack() }}>Delete</button>
            </>
          }
        >
          Delete incident <b>{inc.number}</b> — {inc.shortDescription}?
          <div className="mt-2 text-[13px] text-[#A52A2A]">This action cannot be undone.</div>
        </Modal>
      )}
    </div>
  )
}

/** "Create New" incident form */
export function NewIncidentForm({ onCreated, onCancel }: { onCreated: (id: string) => void; onCancel: () => void }) {
  const { isAgent } = useDesk()
  const flash = useFlash()
  const all = useCollection<Incident>('servicenow.incidents')
  const groupOpts = useGroupOptions()
  const number = nextNumber('INC', all.map((i) => i.number), 12412)
  const [f, setF] = useState({ callerId: ME.id, category: 'Inquiry / Help', subcategory: '', service: '', ci: '', channel: 'Self-service', state: 'New', impact: 3, urgency: 3, assignmentGroup: '', assignedTo: '', shortDescription: '', description: '' })
  const [err, setErr] = useState('')
  const userOpts = useUserOptions(f.assignmentGroup)
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }))
  const submit = (stay: boolean) => {
    if (!f.shortDescription.trim()) return setErr('The following mandatory fields are not filled in: Short description')
    const now = new Date().toISOString()
    const id = `inc-${Date.now().toString(36)}`
    db.insert('servicenow.incidents', {
      id, number, opened: now, updated: now, ...f, shortDescription: f.shortDescription.trim(), priority: prio(f.impact, f.urgency), location: person(f.callerId).location,
      activity: [{ id: `a-${Date.now()}`, author: 'System', date: now, kind: 'field', text: `Incident created via ${f.channel}` }],
      updatedBy: isAgent ? 'hworker' : undefined,
    }, { prepend: true })
    flash(`Incident ${number} created`)
    if (stay) onCreated(id)
    else onCancel()
  }
  return (
    <div className="flex-1 min-h-0 flex flex-col bg-white">
      <div className="h-[52px] shrink-0 flex items-center gap-1.5 px-3 border-b border-[#DADDE2] bg-[#F6F7F8]">
        <button onClick={onCancel} aria-label="Back" className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#E4E7EB]"><ChevronLeft size={20} /></button>
        <div className="leading-tight ml-1">
          <div className="text-[13px] text-[#5B616B]">Incident</div>
          <div className="text-[17px] font-bold text-[#1B1D21]">New record</div>
        </div>
        <div className="flex-1" />
        <button data-agent="sn-new-save" onClick={() => submit(true)} className={btnCls}>Save</button>
        <button data-agent="sn-new-submit" onClick={() => submit(false)} className={primaryCls}>Submit</button>
      </div>
      {err && <div className="shrink-0 px-4 py-2 bg-[#FBE9E9] text-[#A52A2A] text-[14px] border-b border-[#F0C2C2]">{err}</div>}
      <div className="flex-1 min-h-0 overflow-auto" data-agent="sn-new-form">
        <div className="max-w-[1400px] px-4 pt-5 pb-10">
          <div className="grid grid-cols-2 gap-x-4">
            <div>
              <FieldRow label="Number"><input readOnly value={number} className={inputCls} /></FieldRow>
              <FieldRow label="Caller" required mandatoryFilled={!!f.callerId}>
                <RefInput value={person(f.callerId).name} onChange={(name) => { const p = PEOPLE.find((x) => x.name === name); if (p) set({ callerId: p.id }) }} options={callerOptions} agent="sn-new-caller" label="Caller" optionAgent="sn-new-ac-caller" />
              </FieldRow>
              <FieldRow label="Category">
                <select data-agent="sn-new-category" aria-label="Category" value={f.category} onChange={(e) => set({ category: e.target.value, subcategory: '' })} className={inputCls}>
                  {Object.keys(CATEGORIES).map((c) => <option key={c}>{c}</option>)}
                </select>
              </FieldRow>
              <FieldRow label="Subcategory">
                <select aria-label="Subcategory" value={f.subcategory} onChange={(e) => set({ subcategory: e.target.value })} className={inputCls}>
                  <option value="">-- None --</option>
                  {(CATEGORIES[f.category] ?? []).map((c) => <option key={c}>{c}</option>)}
                </select>
              </FieldRow>
              <FieldRow label="Service"><input aria-label="Service" value={f.service} onChange={(e) => set({ service: e.target.value })} className={inputCls} /></FieldRow>
              <FieldRow label="Configuration item"><input aria-label="Configuration item" value={f.ci} onChange={(e) => set({ ci: e.target.value })} className={inputCls} /></FieldRow>
              <FieldRow label="Channel">
                <select aria-label="Channel" value={f.channel} onChange={(e) => set({ channel: e.target.value })} className={inputCls}>
                  {['Chat', 'Email', 'Phone', 'Self-service', 'Virtual Agent', 'Walk-in'].map((c) => <option key={c}>{c}</option>)}
                </select>
              </FieldRow>
            </div>
            <div>
              <FieldRow label="State">
                <select aria-label="State" value={f.state} onChange={(e) => set({ state: e.target.value })} className={inputCls}>
                  {['New', 'In Progress', 'On Hold'].map((s) => <option key={s}>{s}</option>)}
                </select>
              </FieldRow>
              <FieldRow label="Impact">
                <select data-agent="sn-new-impact" aria-label="Impact" value={f.impact} onChange={(e) => set({ impact: Number(e.target.value) })} className={inputCls}>
                  {[1, 2, 3].map((n) => <option key={n} value={n}>{LEVEL[n]}</option>)}
                </select>
              </FieldRow>
              <FieldRow label="Urgency">
                <select data-agent="sn-new-urgency" aria-label="Urgency" value={f.urgency} onChange={(e) => set({ urgency: Number(e.target.value) })} className={inputCls}>
                  {[1, 2, 3].map((n) => <option key={n} value={n}>{LEVEL[n]}</option>)}
                </select>
              </FieldRow>
              <FieldRow label="Priority"><div className={`${inputCls} flex items-center bg-[#EDEFF2]`}><PriorityCell p={prio(f.impact, f.urgency)} /></div></FieldRow>
              <FieldRow label="Assignment group">
                <RefInput value={f.assignmentGroup} onChange={(g) => set({ assignmentGroup: g, assignedTo: '' })} options={groupOpts} agent="sn-new-group" label="Assignment group" optionAgent="sn-new-ac" />
              </FieldRow>
              <FieldRow label="Assigned to">
                <RefInput value={f.assignedTo} onChange={(a) => set({ assignedTo: a })} options={userOpts} agent="sn-new-assigned" label="Assigned to" optionAgent="sn-new-ac-user" />
              </FieldRow>
            </div>
          </div>
          <FieldRow label="Short description" required mandatoryFilled={!!f.shortDescription} wide>
            <input data-agent="sn-new-short" aria-label="Short description" value={f.shortDescription} onChange={(e) => { set({ shortDescription: e.target.value }); setErr('') }} className={inputCls} />
          </FieldRow>
          <FieldRow label="Description" wide>
            <textarea data-agent="sn-new-description" aria-label="Description" value={f.description} onChange={(e) => set({ description: e.target.value })} rows={4} className={`${inputCls} h-auto py-1.5 resize-y`} />
          </FieldRow>
        </div>
      </div>
    </div>
  )
}

/** "Update Selected" multi-record form */
export function MultiUpdate({ ids, onBack }: { ids: string[]; onBack: () => void }) {
  const { isAgent } = useDesk()
  const groupOpts = useGroupOptions()
  const incs = useCollection<Incident>('servicenow.incidents').filter((i) => ids.includes(i.id))
  const [d, setD] = useState<{ category?: string; subcategory?: string; impact?: number; urgency?: number; state?: string; assignmentGroup?: string; assignedTo?: string; note?: string }>({})
  const userOpts = useUserOptions(d.assignmentGroup ?? '')
  const set = (p: typeof d) => setD((x) => ({ ...x, ...p }))
  const apply = () => {
    const now = new Date().toISOString()
    for (const inc of incs) {
      const patch: any = {}
      for (const k of ['category', 'subcategory', 'impact', 'urgency', 'state', 'assignmentGroup', 'assignedTo'] as const) if (d[k] !== undefined && d[k] !== '') patch[k] = d[k]
      const impact = patch.impact ?? inc.impact
      const urgency = patch.urgency ?? inc.urgency
      patch.priority = prio(impact, urgency)
      const changes = Object.entries(patch)
        .filter(([k, val]) => (inc as any)[k] !== val)
        .map(([k, val]) => `${({ category: 'Category', subcategory: 'Subcategory', impact: 'Impact', urgency: 'Urgency', state: 'State', assignmentGroup: 'Assignment group', assignedTo: 'Assigned to', priority: 'Priority' } as any)[k]}: ${k === 'priority' ? PRIORITY_LABEL[val as number] : k === 'impact' || k === 'urgency' ? LEVEL[val as number] : val}`)
      const via = isAgent ? 'hworker' : undefined
      const acts = [...inc.activity]
      if (changes.length) acts.unshift({ id: `a-${Date.now()}${inc.id}`, author: ME.name, date: now, kind: 'field', text: changes.join('\n'), via })
      if (d.note?.trim()) acts.unshift({ id: `a-${Date.now()}n${inc.id}`, author: ME.name, date: now, kind: 'work', text: d.note.trim(), via })
      db.update('servicenow.incidents', inc.id, { ...patch, activity: acts, updated: now, updatedBy: isAgent ? 'hworker' : inc.updatedBy })
    }
    onBack()
  }
  return (
    <div className="flex-1 min-h-0 flex flex-col bg-white">
      <div className="h-[52px] shrink-0 flex items-center gap-1.5 px-3 border-b border-[#DADDE2] bg-[#F6F7F8]">
        <button data-agent="sn-multi-back" onClick={onBack} aria-label="Back" className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#E4E7EB]"><ChevronLeft size={20} /></button>
        <div className="leading-tight ml-1">
          <div className="text-[13px] text-[#5B616B]">Incident</div>
          <div className="text-[17px] font-bold">Update {incs.length} records</div>
        </div>
        <div className="flex-1" />
        <button data-agent="sn-multi-update" onClick={apply} className="h-8 px-4 rounded-[4px] bg-[#032D42] hover:bg-[#0B3F59] text-white text-[14px] font-bold">Update</button>
      </div>
      <div className="flex-1 min-h-0 overflow-auto px-4 pt-4 pb-10">
        <div className="mb-4 px-4 py-2.5 rounded-[4px] bg-[#E1EDFA] text-[14px] text-[#0B4FA6] border border-[#B5D0F0]">
          Updating {incs.length} records: {incs.map((i) => i.number).join(', ')}. Fields left blank keep their current values.
        </div>
        <div className="grid grid-cols-2 gap-x-4">
          <div>
            <FieldRow label="Category">
              <select data-agent="sn-m-category" aria-label="Category" value={d.category ?? ''} onChange={(e) => set({ category: e.target.value, subcategory: '' })} className={inputCls}>
                <option value="">-- None --</option>
                {Object.keys(CATEGORIES).map((c) => <option key={c}>{c}</option>)}
              </select>
            </FieldRow>
            <FieldRow label="Subcategory">
              <select data-agent="sn-m-subcategory" aria-label="Subcategory" value={d.subcategory ?? ''} onChange={(e) => set({ subcategory: e.target.value })} className={inputCls}>
                <option value="">-- None --</option>
                {(CATEGORIES[d.category ?? ''] ?? []).map((c) => <option key={c}>{c}</option>)}
              </select>
            </FieldRow>
            <FieldRow label="State">
              <select data-agent="sn-m-state" aria-label="State" value={d.state ?? ''} onChange={(e) => set({ state: e.target.value })} className={inputCls}>
                <option value="">-- None --</option>
                {STATES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </FieldRow>
          </div>
          <div>
            <FieldRow label="Impact">
              <select data-agent="sn-m-impact" aria-label="Impact" value={d.impact ?? ''} onChange={(e) => set({ impact: Number(e.target.value) || undefined })} className={inputCls}>
                <option value="">-- None --</option>
                {[1, 2, 3].map((n) => <option key={n} value={n}>{LEVEL[n]}</option>)}
              </select>
            </FieldRow>
            <FieldRow label="Urgency">
              <select data-agent="sn-m-urgency" aria-label="Urgency" value={d.urgency ?? ''} onChange={(e) => set({ urgency: Number(e.target.value) || undefined })} className={inputCls}>
                <option value="">-- None --</option>
                {[1, 2, 3].map((n) => <option key={n} value={n}>{LEVEL[n]}</option>)}
              </select>
            </FieldRow>
            <FieldRow label="Assignment group">
              <RefInput value={d.assignmentGroup ?? ''} onChange={(g) => set({ assignmentGroup: g, assignedTo: '' })} options={groupOpts} agent="sn-m-group" label="Assignment group" optionAgent="sn-ac" />
            </FieldRow>
            <FieldRow label="Assigned to">
              <RefInput value={d.assignedTo ?? ''} onChange={(a) => set({ assignedTo: a })} options={userOpts} agent="sn-m-assigned" label="Assigned to" optionAgent="sn-ac-user" />
            </FieldRow>
          </div>
        </div>
        <FieldRow label="Work notes" wide>
          <textarea data-agent="sn-m-worknotes" aria-label="Work notes" value={d.note ?? ''} onChange={(e) => set({ note: e.target.value })} rows={3} className="w-full px-2 py-1.5 text-[14px] outline-none rounded-[4px] border border-[#8790A1] bg-[#FFF8E5]" />
        </FieldRow>
        <div className="ml-[16%] pl-3 mt-4">
          <table className="text-[13px] w-full max-w-[900px] border border-[#DADDE2]">
            <thead><tr className="bg-[#F6F7F8] text-left">{['Number', 'Short description', 'Caller', 'Priority', 'Assignment group'].map((h) => <th key={h} className="px-3 py-1.5 font-bold">{h}</th>)}</tr></thead>
            <tbody>{incs.map((i) => <tr key={i.id} className="border-t border-[#E4E7EB]"><td className="px-3 py-1.5 text-[#1F6FB2]">{i.number}</td><td className="px-3">{i.shortDescription}</td><td className="px-3">{person(i.callerId).name}</td><td className="px-3"><PriorityCell p={i.priority} /></td><td className="px-3">{i.assignmentGroup || <span className="text-[#8A9099]">(empty)</span>}</td></tr>)}</tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

void PEOPLE
void Info
