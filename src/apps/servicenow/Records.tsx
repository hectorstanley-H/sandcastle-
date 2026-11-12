import { useMemo, useState } from 'react'
import { ChevronLeft, Search, Check } from 'lucide-react'
import { db, useCollection, useRecord } from '@/db/db'
import { ME, person, PEOPLE } from '@/data/people'
import { Avatar } from '@/components/Avatar'
import { type Incident, FieldRow, inputCls, fmtSN, btnCls, primaryCls, useFlash, PriorityCell, LEVEL, prio, Modal } from './shared'
import { RefInput, useGroupOptions, useUserOptions } from './Form'

type Act = { id: string; author: string; date: string; kind: string; text: string }
export type Change = {
  id: string; number: string; shortDescription: string; description: string; type: string; state: string; risk: string; impact: string; assignmentGroup: string; assignedTo: string
  requestedBy: string; plannedStart: string; plannedEnd: string; ci: string; approval: string; justification: string; implementationPlan: string; backoutPlan: string; testPlan: string
  opened: string; updated: string; activity: Act[]; closeCode?: string; closeNotes?: string
}
export type Problem = {
  id: string; number: string; shortDescription: string; description: string; state: string; impact: number; urgency: number; priority: number; assignmentGroup: string; assignedTo: string
  category: string; ci: string; knownError: boolean; workaround: string; rootCause: string; relatedIncidents: string[]; opened: string; updated: string; activity: Act[]; fixNotes?: string
}

const CHANGE_FLOW: Record<string, string[]> = {
  Normal: ['New', 'Assess', 'Authorize', 'Scheduled', 'Implement', 'Review', 'Closed'],
  Emergency: ['New', 'Authorize', 'Scheduled', 'Implement', 'Review', 'Closed'],
  Standard: ['New', 'Scheduled', 'Implement', 'Review', 'Closed'],
}
const PROBLEM_FLOW = ['New', 'Assess', 'Root Cause Analysis', 'Fix in Progress', 'Resolved', 'Closed']

const toLocal = (iso: string) => {
  if (!iso) return ''
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}
const nextNum = (prefix: string, nums: string[], floor: number) => `${prefix}${String(Math.max(floor, ...nums.map((n) => Number(n.replace(/\D/g, '')) || 0)) + 1).padStart(7, '0')}`

/** chevron state bar like ServiceNow's process flow formatter */
function Flow({ steps, cur }: { steps: string[]; cur: string }) {
  const ci = steps.indexOf(cur)
  return (
    <div className="flex mx-4 mt-4 mb-1 text-[13px]" data-agent="sn-process-flow">
      {steps.map((s, i) => (
        <div key={s} className={`flex-1 h-8 flex items-center justify-center gap-1 relative ${i < ci ? 'bg-[#E1EDFA] text-[#0B4FA6]' : i === ci ? 'bg-[#032D42] text-white font-bold' : 'bg-[#EDEFF2] text-[#5B616B]'} ${i === 0 ? 'rounded-l-[4px]' : ''} ${i === steps.length - 1 ? 'rounded-r-[4px]' : ''}`} style={{ clipPath: i === steps.length - 1 ? undefined : 'polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%, 10px 50%)', marginLeft: i ? -6 : 0 }}>
          {i < ci && <Check size={13} />} {s}
        </div>
      ))}
    </div>
  )
}

function Activity({ items }: { items: Act[] }) {
  return (
    <div className="ml-[16%] pl-3 pr-6">
      <div className="py-2 text-[14px] font-bold">Activities: {items.length}</div>
      {items.map((a) => (
        <div key={a.id} className="flex gap-3 mb-3">
          <div className="pt-1">{a.author === 'System' ? <span className="w-8 h-8 rounded-full bg-[#DADDE2] flex items-center justify-center text-[11px] font-bold text-[#4A5059]">SYS</span> : <Avatar name={a.author} size={32} />}</div>
          <div className={`flex-1 rounded-[6px] border border-[#DADDE2] ${a.kind === 'work' ? 'border-l-[4px] border-l-[#E8A33D]' : ''}`}>
            <div className="flex items-center gap-2 px-3 pt-2 text-[13px]"><b>{a.author}</b><div className="flex-1" /><span className="text-[#5B616B]">{a.kind === 'work' ? 'Work notes' : 'Field changes'} • {fmtSN(a.date)}</span></div>
            <div className="px-3 pb-2 pt-1 text-[14px] whitespace-pre-wrap">{a.text}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ─────────────────────────── generic list ─────────────────────────── */

function RecordList<T extends { id: string; number: string; shortDescription: string; state: string; opened: string }>({ title, rows, cols, states, onOpen, onNew, agent }: { title: string; rows: T[]; cols: [string, (r: T) => React.ReactNode][]; states: string[]; onOpen: (id: string) => void; onNew: () => void; agent: string }) {
  const [q, setQ] = useState('')
  const [st, setSt] = useState('active')
  const [desc, setDesc] = useState(true)
  const list = useMemo(
    () =>
      rows
        .filter((r) => (st === 'all' ? true : st === 'active' ? !['Closed', 'Canceled', 'Resolved'].includes(r.state) : r.state === st))
        .filter((r) => !q || (r.number + ' ' + r.shortDescription).toLowerCase().includes(q.toLowerCase()))
        .sort((a, b) => (a.number < b.number ? -1 : 1) * (desc ? -1 : 1)),
    [rows, q, st, desc],
  )
  return (
    <div className="flex-1 min-h-0 flex flex-col bg-white" data-agent={agent}>
      <div className="h-[52px] shrink-0 flex items-center gap-2 px-3 border-b border-[#DADDE2] bg-[#F6F7F8]">
        <div className="text-[18px] font-bold text-[#1B1D21] px-1">{title}</div>
        <div className="relative ml-3">
          <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#5B616B]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" aria-label={`Search ${title}`} className="h-8 w-[240px] pl-7 pr-2 border border-[#8790A1] rounded-[4px] text-[13px] outline-none focus:border-[#0C66E4]" />
        </div>
        <div className="flex-1" />
        <span className="text-[13px] text-[#5B616B]">{list.length} records</span>
        <button onClick={onNew} className={primaryCls}>New</button>
      </div>
      <div className="h-[38px] shrink-0 flex items-center gap-1 px-3 border-b border-[#DADDE2]">
        {['active', 'all', ...states].map((s) => (
          <button key={s} onClick={() => setSt(s)} className={`h-6 px-2.5 rounded-full text-[12px] border ${st === s ? 'bg-[#E1EDFA] border-[#0C66E4] text-[#0B4FA6] font-bold' : 'border-[#C5CAD3] hover:bg-[#F1F3F5]'}`}>{s === 'active' ? 'Active' : s === 'all' ? 'All' : s}</button>
        ))}
      </div>
      <div className="flex-1 min-h-0 overflow-auto">
        <table className="w-full text-[14px] border-collapse">
          <thead className="sticky top-0 bg-white z-10">
            <tr className="h-10 border-b-2 border-[#C5CAD3] text-left">
              <th className="px-3 font-bold cursor-pointer select-none" onClick={() => setDesc((d) => !d)}>Number {desc ? '↓' : '↑'}</th>
              {cols.map(([h]) => <th key={h} className="px-2 font-bold whitespace-nowrap">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {list.map((r, i) => (
              <tr key={r.id} className={`h-[38px] border-b border-[#E4E7EB] hover:bg-[#EEF4FB] ${i % 2 ? 'bg-[#FAFBFB]' : ''}`}>
                <td className="px-3 whitespace-nowrap"><button data-agent={`${agent}-row-${r.id}`} onClick={() => onOpen(r.id)} className="text-[#1F6FB2] hover:underline">{r.number}</button></td>
                {cols.map(([h, f]) => <td key={h} className="px-2 whitespace-nowrap max-w-[340px] truncate">{f(r)}</td>)}
              </tr>
            ))}
            {!list.length && <tr><td colSpan={cols.length + 1} className="py-10 text-center text-[#5B616B]">No records to display</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function ChangeList({ onOpen, onNew }: { onOpen: (id: string) => void; onNew: () => void }) {
  const rows = useCollection<Change>('servicenow.changes')
  return (
    <RecordList
      title="Change Requests"
      agent="sn-chg"
      rows={rows}
      states={['New', 'Assess', 'Authorize', 'Scheduled', 'Implement', 'Review', 'Closed']}
      onOpen={onOpen}
      onNew={onNew}
      cols={[
        ['Short description', (r) => r.shortDescription],
        ['Type', (r) => r.type],
        ['State', (r) => r.state],
        ['Risk', (r) => r.risk],
        ['Approval', (r) => r.approval],
        ['Assignment group', (r) => r.assignmentGroup || <span className="text-[#8A9099]">(empty)</span>],
        ['Planned start', (r) => (r.plannedStart ? fmtSN(r.plannedStart) : '')],
      ]}
    />
  )
}
export function ProblemList({ onOpen, onNew }: { onOpen: (id: string) => void; onNew: () => void }) {
  const rows = useCollection<Problem>('servicenow.problems')
  return (
    <RecordList
      title="Problems"
      agent="sn-prb"
      rows={rows}
      states={PROBLEM_FLOW}
      onOpen={onOpen}
      onNew={onNew}
      cols={[
        ['Short description', (r) => r.shortDescription],
        ['Priority', (r) => <PriorityCell p={r.priority} />],
        ['State', (r) => r.state],
        ['Known error', (r) => (r.knownError ? 'true' : 'false')],
        ['Assignment group', (r) => r.assignmentGroup || <span className="text-[#8A9099]">(empty)</span>],
        ['Related incidents', (r) => r.relatedIncidents.length],
        ['Opened', (r) => fmtSN(r.opened)],
      ]}
    />
  )
}

/* ─────────────────────────── change form ─────────────────────────── */

const emptyChange = (type: string): Change => ({ id: '__new', number: '', shortDescription: '', description: '', type, state: 'New', risk: 'Moderate', impact: '3 - Low', assignmentGroup: '', assignedTo: '', requestedBy: ME.id, plannedStart: '', plannedEnd: '', ci: '', approval: 'Not Yet Requested', justification: '', implementationPlan: '', backoutPlan: '', testPlan: '', opened: '', updated: '', activity: [] })

export function ChangeForm({ id, onBack, onOpenIncident }: { id: string; onBack: () => void; onOpenIncident?: (id: string) => void }) {
  const flash = useFlash()
  const rec = useRecord<Change>('servicenow.changes', id)
  const all = useCollection<Change>('servicenow.changes')
  const incidents = useCollection<Incident>('servicenow.incidents')
  const groupOpts = useGroupOptions()
  const isNew = id.startsWith('__new')
  const base = rec ?? emptyChange(id.split(':')[1] ?? 'Normal')
  const [d, setD] = useState<Partial<Change> & { note?: string }>({})
  const [tab, setTab] = useState<'planning' | 'schedule' | 'notes' | 'closure'>(isNew ? 'planning' : 'notes')
  const [err, setErr] = useState('')
  const [closing, setClosing] = useState(false)
  const v = { ...base, ...d }
  const userOpts = useUserOptions(v.assignmentGroup)
  if (!rec && !isNew) return <div className="flex-1 p-8 text-[#5B616B]">Record not found</div>
  const set = (p: Partial<Change> & { note?: string }) => setD((x) => ({ ...x, ...p }))
  const flow = CHANGE_FLOW[v.type] ?? CHANGE_FLOW.Normal
  const linked = incidents.filter((i) => i.changeRequest === id)

  const persist = (extra: Partial<Change> = {}, log?: string, back?: boolean) => {
    if (!v.shortDescription.trim()) {
      setErr('The following mandatory fields are not filled in: Short description')
      return false
    }
    const now = new Date().toISOString()
    const { note, ...patch } = { ...d, ...extra }
    const acts: Act[] = []
    if (log) acts.push({ id: `ca-${Date.now()}f`, author: ME.name, date: now, kind: 'field', text: log })
    if (note?.trim()) acts.push({ id: `ca-${Date.now()}n`, author: ME.name, date: now, kind: 'work', text: note.trim() })
    if (isNew) {
      const number = nextNum('CHG', all.map((c) => c.number), 30121)
      const nid = `chg-${Date.now().toString(36)}`
      db.insert('servicenow.changes', { ...base, ...patch, id: nid, number, opened: now, updated: now, activity: [...acts, { id: `ca-${Date.now()}c`, author: 'System', date: now, kind: 'field', text: `Change request created (${v.type})` }] }, { prepend: true })
      flash(`Change request ${number} created`)
      onBack()
      return true
    }
    db.update('servicenow.changes', id, (r) => ({ ...patch, updated: now, activity: [...acts, ...r.activity] }))
    setD({})
    setErr('')
    if (back) onBack()
    return true
  }
  const advance = (to: string, extra: Partial<Change> = {}) => {
    if (persist({ state: to, ...extra }, `State: ${to}${extra.approval ? `\nApproval: ${extra.approval}` : ''}`)) flash(`${v.number} moved to ${to}`)
  }
  const ci = flow.indexOf(v.state)
  const next = flow[ci + 1]
  const actionBtns: React.ReactNode[] = []
  if (!isNew && v.state !== 'Closed' && v.state !== 'Canceled') {
    if (v.state === 'New') actionBtns.push(<button key="ra" data-agent="sn-chg-request-approval" className={primaryCls} onClick={() => advance(next, next === 'Scheduled' ? { approval: 'Approved' } : { approval: next === 'Authorize' ? 'Requested' : v.approval })}>{v.type === 'Standard' ? 'Schedule' : 'Request Approval'}</button>)
    else if (v.state === 'Assess') actionBtns.push(<button key="as" className={primaryCls} onClick={() => advance('Authorize', { approval: 'Requested' })}>Request Approval</button>)
    else if (v.state === 'Authorize') {
      actionBtns.push(<button key="ap" data-agent="sn-chg-approve" className={primaryCls} onClick={() => advance('Scheduled', { approval: 'Approved' })}>Approve</button>)
      actionBtns.push(<button key="rj" className={btnCls} onClick={() => advance('New', { approval: 'Rejected' })}>Reject</button>)
    } else if (v.state === 'Scheduled') actionBtns.push(<button key="im" className={primaryCls} onClick={() => advance('Implement')}>Implement</button>)
    else if (v.state === 'Implement') actionBtns.push(<button key="rv" className={primaryCls} onClick={() => advance('Review')}>Review</button>)
    else if (v.state === 'Review') actionBtns.push(<button key="cl" className={primaryCls} onClick={() => setClosing(true)}>Close</button>)
    actionBtns.push(<button key="cx" className={btnCls} onClick={() => advance('Canceled')}>Cancel Change</button>)
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-white relative" data-agent="sn-chg-form">
      <div className="h-[52px] shrink-0 flex items-center gap-1.5 px-3 border-b border-[#DADDE2] bg-[#F6F7F8]">
        <button onClick={onBack} aria-label="Back" className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#E4E7EB]"><ChevronLeft size={20} /></button>
        <div className="leading-tight ml-1">
          <div className="text-[13px] text-[#5B616B]">Change Request · {v.type}</div>
          <div className="text-[17px] font-bold">{isNew ? 'New record' : v.number}</div>
        </div>
        <div className="flex-1" />
        {isNew ? (
          <button data-agent="sn-chg-submit" className={primaryCls} onClick={() => persist()}>Submit</button>
        ) : (
          <>
            <button className={btnCls} onClick={() => persist({}, undefined, true)}>Update</button>
            {actionBtns}
          </>
        )}
      </div>
      {err && <div className="shrink-0 px-4 py-2 bg-[#FBE9E9] text-[#A52A2A] text-[14px] border-b border-[#F0C2C2]">{err}</div>}
      <div className="flex-1 min-h-0 overflow-auto">
        {!isNew && <Flow steps={v.state === 'Canceled' ? [...flow.slice(0, -1), 'Canceled'] : flow} cur={v.state} />}
        <div className="max-w-[1400px] px-4 pt-4 pb-10">
          <div className="grid grid-cols-2 gap-x-4">
            <div>
              <FieldRow label="Number"><input readOnly value={isNew ? '(assigned on submit)' : v.number} className={inputCls} /></FieldRow>
              <FieldRow label="Requested by">
                <select aria-label="Requested by" value={v.requestedBy} onChange={(e) => set({ requestedBy: e.target.value })} className={inputCls}>{PEOPLE.filter((p) => !p.external).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
              </FieldRow>
              <FieldRow label="Type">
                <select aria-label="Type" value={v.type} disabled={!isNew} onChange={(e) => set({ type: e.target.value })} className={inputCls}>{['Normal', 'Standard', 'Emergency'].map((t) => <option key={t}>{t}</option>)}</select>
              </FieldRow>
              <FieldRow label="Configuration item"><input aria-label="Configuration item" value={v.ci} onChange={(e) => set({ ci: e.target.value })} className={inputCls} /></FieldRow>
              <FieldRow label="Risk">
                <select aria-label="Risk" value={v.risk} onChange={(e) => set({ risk: e.target.value })} className={inputCls}>{['Very High', 'High', 'Moderate', 'Low'].map((t) => <option key={t}>{t}</option>)}</select>
              </FieldRow>
              <FieldRow label="Impact">
                <select aria-label="Impact" value={v.impact} onChange={(e) => set({ impact: e.target.value })} className={inputCls}>{['1 - High', '2 - Medium', '3 - Low'].map((t) => <option key={t}>{t}</option>)}</select>
              </FieldRow>
            </div>
            <div>
              <FieldRow label="State"><input readOnly value={v.state} className={inputCls} /></FieldRow>
              <FieldRow label="Approval"><input readOnly value={v.approval} className={inputCls} /></FieldRow>
              <FieldRow label="Assignment group">
                <RefInput value={v.assignmentGroup} onChange={(g) => set({ assignmentGroup: g, assignedTo: '' })} options={groupOpts} agent="sn-chg-group" label="Assignment group" optionAgent="sn-chg-ac" />
              </FieldRow>
              <FieldRow label="Assigned to">
                <RefInput value={v.assignedTo} onChange={(a) => set({ assignedTo: a })} options={userOpts} agent="sn-chg-assigned" label="Assigned to" optionAgent="sn-chg-ac-user" />
              </FieldRow>
              <FieldRow label="Opened"><input readOnly value={v.opened ? fmtSN(v.opened) : ''} className={inputCls} /></FieldRow>
            </div>
          </div>
          <FieldRow label="Short description" required mandatoryFilled={!!v.shortDescription} wide>
            <input data-agent="sn-chg-short" aria-label="Short description" value={v.shortDescription} onChange={(e) => { set({ shortDescription: e.target.value }); setErr('') }} className={inputCls} />
          </FieldRow>
          <FieldRow label="Description" wide>
            <textarea aria-label="Description" value={v.description} onChange={(e) => set({ description: e.target.value })} rows={3} className={`${inputCls} h-auto py-1.5 resize-y`} />
          </FieldRow>
          <div className="mt-6 border-b border-[#C5CAD3] flex gap-1 px-1">
            {[['planning', 'Planning'], ['schedule', 'Schedule'], ['notes', 'Notes'], ['closure', 'Closure Information']].map(([t, l]) => (
              <button key={t} onClick={() => setTab(t as any)} className={`h-10 px-4 text-[14px] border-b-[3px] -mb-px ${tab === t ? 'border-[#032D42] font-bold' : 'border-transparent text-[#4A5059]'}`}>{l}</button>
            ))}
          </div>
          <div className="pt-4">
            {tab === 'planning' &&
              ([['justification', 'Justification'], ['implementationPlan', 'Implementation plan'], ['backoutPlan', 'Backout plan'], ['testPlan', 'Test plan']] as const).map(([k, l]) => (
                <FieldRow key={k} label={l} wide>
                  <textarea aria-label={l} value={(v as any)[k]} onChange={(e) => set({ [k]: e.target.value })} rows={3} className={`${inputCls} h-auto py-1.5 resize-y`} />
                </FieldRow>
              ))}
            {tab === 'schedule' && (
              <>
                <FieldRow label="Planned start date" wide><input type="datetime-local" aria-label="Planned start date" value={toLocal(v.plannedStart)} onChange={(e) => set({ plannedStart: e.target.value ? new Date(e.target.value).toISOString() : '' })} className={inputCls + ' !w-[260px]'} /></FieldRow>
                <FieldRow label="Planned end date" wide><input type="datetime-local" aria-label="Planned end date" value={toLocal(v.plannedEnd)} onChange={(e) => set({ plannedEnd: e.target.value ? new Date(e.target.value).toISOString() : '' })} className={inputCls + ' !w-[260px]'} /></FieldRow>
                {v.plannedStart && v.plannedEnd && +new Date(v.plannedEnd) < +new Date(v.plannedStart) && <div className="ml-[16%] pl-3 text-[13px] text-[#C9302C]">Planned end date must be after the planned start date.</div>}
                {v.plannedStart && <div className="ml-[16%] pl-3 text-[13px] text-[#5B616B]">Change window: {fmtSN(v.plannedStart)} → {v.plannedEnd ? fmtSN(v.plannedEnd) : '…'}</div>}
              </>
            )}
            {tab === 'notes' && (
              <>
                <FieldRow label="Work notes" wide>
                  <textarea data-agent="sn-chg-worknotes" aria-label="Work notes" value={d.note ?? ''} onChange={(e) => set({ note: e.target.value })} rows={3} placeholder="Work notes" className="w-full px-2 py-1.5 text-[14px] outline-none rounded-[4px] border border-[#8790A1] bg-[#FFF8E5]" />
                  {!isNew && <div className="flex justify-end mt-1.5"><button className="h-7 px-3 rounded-[4px] bg-[#032D42] text-white text-[13px] font-bold" onClick={() => persist()}>Post</button></div>}
                </FieldRow>
                <Activity items={v.activity} />
              </>
            )}
            {tab === 'closure' && (
              <>
                <FieldRow label="Close code" wide><input readOnly value={v.closeCode ?? ''} className={inputCls + ' !w-[300px]'} /></FieldRow>
                <FieldRow label="Close notes" wide><textarea readOnly value={v.closeNotes ?? ''} rows={3} className={`${inputCls} h-auto py-1.5`} /></FieldRow>
              </>
            )}
          </div>
          {!isNew && (
            <div className="mt-8 border border-[#DADDE2] rounded-[6px] overflow-hidden">
              <div className="h-10 px-4 flex items-center bg-[#F6F7F8] border-b border-[#DADDE2] text-[14px] font-bold">Incidents Fixed By Change ({linked.length})</div>
              {linked.length ? (
                <table className="w-full text-[13px]"><tbody>{linked.map((i) => <tr key={i.id} className="border-b border-[#E4E7EB]"><td className="px-3 py-2"><button onClick={() => onOpenIncident?.(i.id)} className="text-[#1F6FB2] hover:underline">{i.number}</button></td><td className="px-3">{i.shortDescription}</td><td className="px-3">{i.state}</td></tr>)}</tbody></table>
              ) : <div className="px-4 py-5 text-center text-[13px] text-[#5B616B]">No records to display</div>}
            </div>
          )}
        </div>
      </div>
      {closing && <CloseChange onCancel={() => setClosing(false)} onClose={(code, notes) => { setClosing(false); advance('Closed', { closeCode: code, closeNotes: notes }) }} />}
    </div>
  )
}

function CloseChange({ onCancel, onClose }: { onCancel: () => void; onClose: (code: string, notes: string) => void }) {
  const [code, setCode] = useState('Successful')
  const [notes, setNotes] = useState('')
  return (
    <Modal title="Close Change Request" onClose={onCancel} footer={<><button className={btnCls} onClick={onCancel}>Cancel</button><button className={primaryCls} disabled={!notes.trim()} onClick={() => onClose(code, notes.trim())}>Close</button></>}>
      <div className="text-[13px] font-bold mb-1">Close code</div>
      <select value={code} onChange={(e) => setCode(e.target.value)} className={inputCls + ' mb-3'} aria-label="Close code">{['Successful', 'Successful with issues', 'Unsuccessful'].map((c) => <option key={c}>{c}</option>)}</select>
      <div className="text-[13px] font-bold mb-1">Close notes <span className="text-[#C9302C]">*</span></div>
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={`${inputCls} h-auto py-1.5`} aria-label="Close notes" />
    </Modal>
  )
}

/* ─────────────────────────── problem form ─────────────────────────── */

const emptyProblem = (): Problem => ({ id: '__new', number: '', shortDescription: '', description: '', state: 'New', impact: 3, urgency: 3, priority: 5, assignmentGroup: '', assignedTo: '', category: 'Software', ci: '', knownError: false, workaround: '', rootCause: '', relatedIncidents: [], opened: '', updated: '', activity: [] })
const PROBLEM_NEXT: Record<string, [string, string]> = { New: ['Assess', 'Assess'], Assess: ['Confirm', 'Root Cause Analysis'], 'Root Cause Analysis': ['Fix', 'Fix in Progress'], 'Fix in Progress': ['Resolve', 'Resolved'], Resolved: ['Close', 'Closed'] }

export function ProblemForm({ id, onBack, onOpenIncident }: { id: string; onBack: () => void; onOpenIncident?: (id: string) => void }) {
  const flash = useFlash()
  const rec = useRecord<Problem>('servicenow.problems', id)
  const all = useCollection<Problem>('servicenow.problems')
  const incidents = useCollection<Incident>('servicenow.incidents')
  const groupOpts = useGroupOptions()
  const isNew = id === '__new'
  const base = rec ?? emptyProblem()
  const [d, setD] = useState<Partial<Problem> & { note?: string }>({})
  const [err, setErr] = useState('')
  const [addInc, setAddInc] = useState('')
  const v = { ...base, ...d }
  const userOpts = useUserOptions(v.assignmentGroup)
  if (!rec && !isNew) return <div className="flex-1 p-8 text-[#5B616B]">Record not found</div>
  const set = (p: Partial<Problem> & { note?: string }) => setD((x) => ({ ...x, ...p }))
  const related = incidents.filter((i) => v.relatedIncidents.includes(i.id) || i.problemId === id)
  const persist = (extra: Partial<Problem> = {}, log?: string, back?: boolean) => {
    if (!v.shortDescription.trim()) {
      setErr('The following mandatory fields are not filled in: Problem statement')
      return false
    }
    if (extra.state === 'Resolved' && !v.rootCause.trim()) {
      setErr('Root cause is required before the problem can be resolved')
      return false
    }
    const now = new Date().toISOString()
    const { note, ...patch } = { ...d, ...extra }
    patch.priority = prio(patch.impact ?? v.impact, patch.urgency ?? v.urgency)
    const acts: Act[] = []
    if (log) acts.push({ id: `pa-${Date.now()}f`, author: ME.name, date: now, kind: 'field', text: log })
    if (note?.trim()) acts.push({ id: `pa-${Date.now()}n`, author: ME.name, date: now, kind: 'work', text: note.trim() })
    if (isNew) {
      const number = nextNum('PRB', all.map((p) => p.number), 40211)
      db.insert('servicenow.problems', { ...base, ...patch, id: `prb-${Date.now().toString(36)}`, number, opened: now, updated: now, activity: acts }, { prepend: true })
      flash(`Problem ${number} created`)
      onBack()
      return true
    }
    db.update('servicenow.problems', id, (r) => ({ ...patch, updated: now, activity: [...acts, ...r.activity] }))
    setD({})
    setErr('')
    if (back) onBack()
    return true
  }
  const nx = PROBLEM_NEXT[v.state]
  return (
    <div className="flex-1 min-h-0 flex flex-col bg-white" data-agent="sn-prb-form">
      <div className="h-[52px] shrink-0 flex items-center gap-1.5 px-3 border-b border-[#DADDE2] bg-[#F6F7F8]">
        <button onClick={onBack} aria-label="Back" className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#E4E7EB]"><ChevronLeft size={20} /></button>
        <div className="leading-tight ml-1"><div className="text-[13px] text-[#5B616B]">Problem</div><div className="text-[17px] font-bold">{isNew ? 'New record' : v.number}</div></div>
        {v.knownError && <span className="ml-2 h-5 px-2 rounded-full bg-[#FFF1D6] text-[#8A5A00] text-[11px] font-bold flex items-center">KNOWN ERROR</span>}
        <div className="flex-1" />
        {isNew ? (
          <button className={primaryCls} onClick={() => persist()}>Submit</button>
        ) : (
          <>
            <button className={btnCls} onClick={() => persist({}, undefined, true)}>Update</button>
            {!v.knownError && v.state !== 'Closed' && <button className={btnCls} onClick={() => { if (persist({ knownError: true }, 'Known error: true')) flash(`${v.number} marked as a known error`) }}>Mark Known Error</button>}
            {nx && <button className={primaryCls} onClick={() => { if (persist({ state: nx[1] }, `State: ${nx[1]}`)) flash(`${v.number} moved to ${nx[1]}`) }}>{nx[0]}</button>}
          </>
        )}
      </div>
      {err && <div className="shrink-0 px-4 py-2 bg-[#FBE9E9] text-[#A52A2A] text-[14px] border-b border-[#F0C2C2]">{err}</div>}
      <div className="flex-1 min-h-0 overflow-auto">
        {!isNew && <Flow steps={PROBLEM_FLOW} cur={v.state} />}
        <div className="max-w-[1400px] px-4 pt-4 pb-10">
          <div className="grid grid-cols-2 gap-x-4">
            <div>
              <FieldRow label="Number"><input readOnly value={isNew ? '(assigned on submit)' : v.number} className={inputCls} /></FieldRow>
              <FieldRow label="Category"><select aria-label="Category" value={v.category} onChange={(e) => set({ category: e.target.value })} className={inputCls}>{['Software', 'Hardware', 'Network', 'Database', 'Inquiry / Help'].map((c) => <option key={c}>{c}</option>)}</select></FieldRow>
              <FieldRow label="Configuration item"><input aria-label="Configuration item" value={v.ci} onChange={(e) => set({ ci: e.target.value })} className={inputCls} /></FieldRow>
              <FieldRow label="Impact"><select aria-label="Impact" value={v.impact} onChange={(e) => set({ impact: Number(e.target.value) })} className={inputCls}>{[1, 2, 3].map((n) => <option key={n} value={n}>{LEVEL[n]}</option>)}</select></FieldRow>
              <FieldRow label="Urgency"><select aria-label="Urgency" value={v.urgency} onChange={(e) => set({ urgency: Number(e.target.value) })} className={inputCls}>{[1, 2, 3].map((n) => <option key={n} value={n}>{LEVEL[n]}</option>)}</select></FieldRow>
              <FieldRow label="Priority"><div className={`${inputCls} flex items-center bg-[#EDEFF2]`}><PriorityCell p={prio(v.impact, v.urgency)} /></div></FieldRow>
            </div>
            <div>
              <FieldRow label="State"><input readOnly value={v.state} className={inputCls} /></FieldRow>
              <FieldRow label="Assignment group"><RefInput value={v.assignmentGroup} onChange={(g) => set({ assignmentGroup: g, assignedTo: '' })} options={groupOpts} agent="sn-prb-group" label="Assignment group" optionAgent="sn-prb-ac" /></FieldRow>
              <FieldRow label="Assigned to"><RefInput value={v.assignedTo} onChange={(a) => set({ assignedTo: a })} options={userOpts} agent="sn-prb-assigned" label="Assigned to" optionAgent="sn-prb-ac-user" /></FieldRow>
              <FieldRow label="Opened"><input readOnly value={v.opened ? fmtSN(v.opened) : ''} className={inputCls} /></FieldRow>
            </div>
          </div>
          <FieldRow label="Problem statement" required mandatoryFilled={!!v.shortDescription} wide><input aria-label="Problem statement" value={v.shortDescription} onChange={(e) => { set({ shortDescription: e.target.value }); setErr('') }} className={inputCls} /></FieldRow>
          <FieldRow label="Description" wide><textarea aria-label="Description" value={v.description} onChange={(e) => set({ description: e.target.value })} rows={3} className={`${inputCls} h-auto py-1.5`} /></FieldRow>
          <FieldRow label="Workaround" wide><textarea aria-label="Workaround" value={v.workaround} onChange={(e) => set({ workaround: e.target.value })} rows={2} className={`${inputCls} h-auto py-1.5`} /></FieldRow>
          <FieldRow label="Cause notes" wide><textarea aria-label="Cause notes" value={v.rootCause} onChange={(e) => { set({ rootCause: e.target.value }); setErr('') }} rows={2} className={`${inputCls} h-auto py-1.5`} /></FieldRow>
          <FieldRow label="Work notes" wide>
            <textarea aria-label="Work notes" value={d.note ?? ''} onChange={(e) => set({ note: e.target.value })} rows={2} placeholder="Work notes" className="w-full px-2 py-1.5 text-[14px] outline-none rounded-[4px] border border-[#8790A1] bg-[#FFF8E5]" />
          </FieldRow>
          {!isNew && (
            <>
              <div className="mt-6 border border-[#DADDE2] rounded-[6px] overflow-hidden">
                <div className="h-10 px-4 flex items-center gap-2 bg-[#F6F7F8] border-b border-[#DADDE2] text-[14px]">
                  <b>Incidents ({related.length})</b>
                  <div className="flex-1" />
                  <select value={addInc} onChange={(e) => setAddInc(e.target.value)} className="h-7 px-1 rounded border border-[#C5CAD3] text-[13px] max-w-[320px]" aria-label="Add related incident">
                    <option value="">Add incident…</option>
                    {incidents.filter((i) => !v.relatedIncidents.includes(i.id) && !['Closed', 'Canceled'].includes(i.state)).map((i) => <option key={i.id} value={i.id}>{i.number} — {i.shortDescription.slice(0, 40)}</option>)}
                  </select>
                  <button className={btnCls} disabled={!addInc} onClick={() => { db.update('servicenow.problems', id, { relatedIncidents: [...v.relatedIncidents, addInc] }); db.update('servicenow.incidents', addInc, { problemId: id }); setAddInc('') }}>Add</button>
                </div>
                {related.length ? (
                  <table className="w-full text-[13px]">
                    <tbody>{related.map((i) => <tr key={i.id} className="border-b border-[#E4E7EB]"><td className="px-3 py-2"><button onClick={() => onOpenIncident?.(i.id)} className="text-[#1F6FB2] hover:underline">{i.number}</button></td><td className="px-3">{i.shortDescription}</td><td className="px-3">{person(i.callerId).name}</td><td className="px-3"><PriorityCell p={i.priority} /></td><td className="px-3">{i.state}</td></tr>)}</tbody>
                  </table>
                ) : <div className="px-4 py-5 text-center text-[13px] text-[#5B616B]">No records to display</div>}
              </div>
              <div className="mt-4"><Activity items={v.activity} /></div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
