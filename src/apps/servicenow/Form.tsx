import { useEffect, useState } from 'react'
import { ChevronLeft, Menu, Paperclip, MessageSquare, SlidersHorizontal, MoreHorizontal, Search, Info, Lock } from 'lucide-react'
import { db, useCollection, useRecord } from '@/db/db'
import { useDesk } from '@/os/context'
import { ME, person, PEOPLE } from '@/data/people'
import { Avatar } from '@/components/Avatar'
import { type Incident, PRIORITY_LABEL, LEVEL, prio, STATES, CATEGORIES, CLOSE_CODES, fmtSN, FieldRow, inputCls, RefButtons, HWChip, PriorityCell } from './shared'

/** Reference field with type-ahead (like ServiceNow's sys_user_group lookup) */
export function RefInput({ value, onChange, options, agent, label, optionAgent }: { value: string; onChange: (v: string) => void; options: { id: string; name: string; sub?: string }[]; agent: string; label: string; optionAgent: string }) {
  const [text, setText] = useState(value)
  const [open, setOpen] = useState(false)
  useEffect(() => setText(value), [value])
  const q = text.trim().toLowerCase()
  const matches = open && q ? options.filter((o) => o.name.toLowerCase().includes(q)).slice(0, 8) : []
  return (
    <div className="relative flex items-center gap-1">
      <input
        data-agent={agent}
        aria-label={label}
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          setOpen(true)
          if (!e.target.value) onChange('')
        }}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        className={inputCls}
      />
      <RefButtons />
      {matches.length > 0 && (
        <div className="absolute z-30 left-0 top-[33px] w-[calc(100%-60px)] bg-white border border-[#8790A1] rounded-[4px] shadow-[0_6px_18px_rgba(0,0,0,0.18)] py-1">
          {matches.map((o) => (
            <button
              key={o.id}
              data-agent={`${optionAgent}-${o.id}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(o.name)
                setText(o.name)
                setOpen(false)
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-[#E1EDFA] flex items-baseline gap-3"
            >
              <span className="text-[14px] text-[#1B1D21]">{o.name}</span>
              {o.sub && <span className="text-[12px] text-[#5B616B] truncate">{o.sub}</span>}
            </button>
          ))}
        </div>
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

type Draft = Partial<Incident> & { note?: string }

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <div className="text-[16px] font-bold text-[#1B1D21] mb-3 px-1">{title}</div>
      {children}
    </div>
  )
}

export function IncidentForm({ id, onBack }: { id: string; onBack: () => void }) {
  const { isAgent } = useDesk()
  const inc = useRecord<Incident>('servicenow.incidents', id)
  const all = useCollection<Incident>('servicenow.incidents')
  const groupOpts = useGroupOptions()
  const [d, setD] = useState<Draft>({})
  const [tab, setTab] = useState<'notes' | 'related' | 'resolution'>('notes')
  const [error, setError] = useState('')
  const [rel, setRel] = useState('sla')
  const v = { ...inc, ...d } as Incident & { note?: string }
  const userOpts = useUserOptions(v.assignmentGroup)
  useEffect(() => {
    setD({})
    setTab('notes')
    setError('')
  }, [id])
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
    const changes: string[] = []
    const label: Record<string, string> = { category: 'Category', subcategory: 'Subcategory', assignmentGroup: 'Assignment group', assignedTo: 'Assigned to', state: 'State', impact: 'Impact', urgency: 'Urgency', closeCode: 'Resolution code', service: 'Service' }
    for (const k of Object.keys(label)) {
      const nv = (patch as any)[k]
      if (nv !== undefined && nv !== (inc as any)[k]) changes.push(`${label[k]}: ${k === 'impact' || k === 'urgency' ? LEVEL[nv] : nv}`)
    }
    if (patch.priority !== inc.priority) changes.push(`Priority: ${PRIORITY_LABEL[patch.priority]}`)
    const acts = [...inc.activity]
    const via = isAgent ? 'hworker' : undefined
    if (changes.length) acts.unshift({ id: `a-${Date.now()}`, author: ME.name, date: now, kind: 'field', text: changes.join('\n'), via })
    if (d.note?.trim()) acts.unshift({ id: `a-${Date.now()}n`, author: ME.name, date: now, kind: 'work', text: d.note.trim(), via })
    if (opts.resolve && v.closeNotes) acts.unshift({ id: `a-${Date.now()}r`, author: ME.name, date: now, kind: 'field', text: `State: Resolved\nResolution notes: ${v.closeNotes}`, via })
    db.update('servicenow.incidents', id, { ...patch, activity: acts, updated: now, updatedBy: isAgent ? 'hworker' : inc.updatedBy })
    setD({})
    setError('')
    if (opts.back) onBack()
  }

  const caller = person(v.callerId)
  const btn = 'h-8 px-3 rounded-[4px] border border-[#8790A1] bg-white text-[14px] font-bold text-[#1B1D21] hover:bg-[#F1F3F5]'
  return (
    <div className="flex-1 min-h-0 flex flex-col bg-white">
      <div className="h-[52px] shrink-0 flex items-center gap-1.5 px-3 border-b border-[#DADDE2] bg-[#F6F7F8]">
        <button data-agent="sn-form-back" onClick={onBack} aria-label="Back" className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#E4E7EB]"><ChevronLeft size={20} /></button>
        <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#E4E7EB]" aria-label="Additional actions"><Menu size={18} /></button>
        <div className="leading-tight ml-1">
          <div className="text-[13px] text-[#5B616B]">Incident</div>
          <div className="text-[17px] font-bold text-[#1B1D21]" data-agent="sn-form-number">{inc.number}</div>
        </div>
        {inc.updatedBy === 'hworker' && <span className="ml-2"><HWChip /></span>}
        <div className="flex-1" />
        {[Paperclip, MessageSquare, SlidersHorizontal, MoreHorizontal].map((I, i) => (
          <button key={i} className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#E4E7EB] text-[#2E3238]"><I size={17} /></button>
        ))}
        <span className="w-px h-6 bg-[#DADDE2] mx-1" />
        <button className={btn}>Follow</button>
        <button data-agent="sn-form-save" onClick={() => save({})} className={btn}>Save</button>
        <button data-agent="sn-form-update" onClick={() => save({ back: true })} className="h-8 px-4 rounded-[4px] bg-[#032D42] hover:bg-[#0B3F59] text-white text-[14px] font-bold">Update</button>
        <button data-agent="sn-form-resolve" onClick={() => save({ resolve: true, back: true })} className={btn}>Resolve</button>
        <button className={btn}>Delete</button>
      </div>
      {error && <div className="shrink-0 px-4 py-2 bg-[#FBE9E9] text-[#A52A2A] text-[14px] border-b border-[#F0C2C2]">{error}</div>}
      <div className="flex-1 min-h-0 overflow-auto" data-agent="sn-form">
        <div className="max-w-[1400px] px-4 pt-5 pb-10">
          <div className="grid grid-cols-2 gap-x-4">
            <div>
              <FieldRow label="Number"><input readOnly value={inc.number} className={inputCls} /></FieldRow>
              <FieldRow label="Caller" required mandatoryFilled>
                <div className="flex items-center gap-1">
                  <input readOnly value={caller.name} className={inputCls.replace('read-only:bg-[#EDEFF2]', '')} aria-label="Caller" />
                  <RefButtons />
                </div>
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
                <div className="flex items-center gap-1"><input aria-label="Configuration item" value={v.ci} onChange={(e) => set({ ci: e.target.value })} className={inputCls} /><RefButtons /></div>
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
            <div className="flex items-center gap-1">
              <input data-agent="sn-f-short" aria-label="Short description" value={v.shortDescription} onChange={(e) => set({ shortDescription: e.target.value })} className={inputCls} />
              <button className="w-8 h-8 shrink-0 rounded-[4px] border border-[#8790A1] flex items-center justify-center text-[#4A5059]" aria-label="Suggestion"><Search size={14} /></button>
            </div>
          </FieldRow>
          <FieldRow label="Description" wide>
            <textarea aria-label="Description" value={v.description} onChange={(e) => set({ description: e.target.value })} rows={3} className={`${inputCls} h-auto py-1.5 resize-y`} />
          </FieldRow>

          {/* tabs */}
          <div className="mt-6 border-b border-[#C5CAD3] flex gap-1 px-1">
            {[['notes', 'Notes'], ['related', 'Related Records'], ['resolution', 'Resolution Information']].map(([t, l]) => (
              <button key={t} data-agent={`sn-tab-${t}`} onClick={() => setTab(t as any)} className={`h-10 px-4 text-[14px] border-b-[3px] -mb-px ${tab === t ? 'border-[#032D42] font-bold text-[#1B1D21]' : 'border-transparent text-[#4A5059] hover:text-[#1B1D21]'}`}>{l}</button>
            ))}
          </div>
          {tab === 'notes' && (
            <div className="pt-4">
              <FieldRow label="Watch list" wide><div className="flex items-center gap-1"><Lock size={15} className="text-[#5B616B]" /><span className="text-[13px] text-[#5B616B]">{person(v.callerId).name}</span></div></FieldRow>
              <FieldRow label="Work notes" wide>
                <div className="rounded-[4px] border border-[#8790A1] overflow-hidden">
                  <textarea
                    data-agent="sn-f-worknotes"
                    aria-label="Work notes"
                    value={d.note ?? ''}
                    onChange={(e) => set({ note: e.target.value })}
                    rows={3}
                    placeholder="Work notes"
                    className="w-full px-2 py-1.5 text-[14px] outline-none resize-y bg-[#FFF8E5] block"
                  />
                  <div className="flex items-center gap-3 px-2 h-9 border-t border-[#E4E7EB] bg-white">
                    <label className="flex items-center gap-1.5 text-[13px]"><input type="checkbox" defaultChecked className="accent-[#032D42]" /> Work notes <span className="text-[#5B616B]">(Internal)</span></label>
                    <div className="flex-1" />
                    <button data-agent="sn-form-post" onClick={() => save({})} className="h-7 px-3 rounded-[4px] bg-[#032D42] text-white text-[13px] font-bold">Post</button>
                  </div>
                </div>
              </FieldRow>
              <div className="ml-[16%] pl-3 pr-6">
                <div className="flex items-center justify-between py-2 text-[14px]">
                  <span className="font-bold">Activities: {inc.activity.length}</span>
                  <SlidersHorizontal size={15} className="text-[#5B616B]" />
                </div>
                {inc.activity.map((a) => (
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
              <FieldRow label="Parent Incident" wide><div className="flex items-center gap-1"><input readOnly value={v.duplicateOf ? all.find((x) => x.id === v.duplicateOf)?.number ?? '' : ''} className={inputCls} /><RefButtons /></div></FieldRow>
              <FieldRow label="Problem" wide><div className="flex items-center gap-1"><input className={inputCls} /><RefButtons /></div></FieldRow>
              <FieldRow label="Change Request" wide><div className="flex items-center gap-1"><input className={inputCls} /><RefButtons /></div></FieldRow>
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
                <FieldRow label="Resolved by"><input readOnly value={v.state === 'Resolved' ? ME.name : ''} className={inputCls} /></FieldRow>
              </div>
              <div className="col-span-2">
                <FieldRow label="Resolution notes" required={v.state === 'Resolved' || !!error} mandatoryFilled={!!v.closeNotes} wide>
                  <textarea data-agent="sn-f-close-notes" aria-label="Resolution notes" value={v.closeNotes ?? ''} onChange={(e) => set({ closeNotes: e.target.value })} rows={3} className={`${inputCls} h-auto py-1.5`} />
                </FieldRow>
              </div>
            </div>
          )}

          {/* related lists */}
          <div className="mt-8 border border-[#DADDE2] rounded-[6px] overflow-hidden">
            <div className="flex border-b border-[#DADDE2] bg-[#F6F7F8] text-[14px]">
              {[['sla', 'Task SLAs (2)'], ['ci', 'Affected CIs (1)'], ['child', 'Child Incidents'], ['problem', 'Problems'], ['tasks', 'Incident Tasks']].map(([k, l]) => (
                <button key={k} onClick={() => setRel(k)} className={`h-10 px-4 border-b-[3px] ${rel === k ? 'border-[#032D42] font-bold' : 'border-transparent text-[#4A5059]'}`}>{l}</button>
              ))}
            </div>
            {rel === 'sla' ? (
              <table className="w-full text-[13px]">
                <thead><tr className="border-b border-[#DADDE2] text-left">{['SLA definition', 'Type', 'Target', 'Stage', 'Business time left', 'Business elapsed percentage', 'Start time'].map((h) => <th key={h} className="px-3 py-2 font-bold">{h}</th>)}</tr></thead>
                <tbody>
                  {[['P' + v.priority + ' resolution (' + [4, 8, 24, 72, 120][v.priority - 1] + ' hour)', 'SLA', 'Resolution', 34], ['P' + v.priority + ' response (' + [15, 30, 60, 240, 480][v.priority - 1] + ' min)', 'SLA', 'Response', 61]].map(([n, t, tg, pct]) => (
                    <tr key={String(n)} className="border-b border-[#E4E7EB]">
                      <td className="px-3 py-2 text-[#1F6FB2]">{n}</td><td className="px-3">{t}</td><td className="px-3">{tg}</td><td className="px-3">{inc.state === 'Resolved' ? 'Completed' : 'In progress'}</td>
                      <td className="px-3">{(Number(pct) / 10).toFixed(0)}h 12m</td>
                      <td className="px-3"><div className="w-[140px] h-3 rounded bg-[#E4E7EB] overflow-hidden"><div className="h-full" style={{ width: `${pct}%`, background: Number(pct) > 50 ? '#F2A100' : '#2E8540' }} /></div></td>
                      <td className="px-3">{fmtSN(inc.opened)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : rel === 'ci' ? (
              <div className="px-4 py-3 text-[13px]"><span className="text-[#1F6FB2]">{v.ci}</span></div>
            ) : (
              <div className="px-4 py-6 text-[13px] text-[#5B616B] text-center">No records to display</div>
            )}
          </div>
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
