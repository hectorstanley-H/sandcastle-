import { useRef, useState } from 'react'
import { MoreHorizontal, X } from 'lucide-react'
import { db, useCollection } from '@/db/db'
import { useDesk } from '@/os/context'
import { ME, PEOPLE } from '@/data/people'
import { Avatar } from '@/components/Avatar'
import { Pop, PopItem } from './atlassian'
import { type Issue, type Sprint, COLS } from './shared'

export function CreateModal({ onClose, onCreated, defaults }: { onClose: () => void; onCreated: (key: string) => void; defaults?: { sprintId?: string | null; status?: string } }) {
  const { isAgent } = useDesk()
  const issues = useCollection<Issue>('jira.issues')
  const sprints = useCollection<Sprint>('jira.sprints')
  const active = sprints.find((s) => s.state === 'active')
  const blank = { type: 'Task', summary: '', description: '', assignee: '', priority: 'Medium', labels: '', sprintId: defaults?.sprintId !== undefined ? defaults.sprintId ?? '' : active?.id ?? '', points: '', status: defaults?.status ?? 'To Do', epic: '', due: '' }
  const [f, setF] = useState(blank)
  const [err, setErr] = useState(false)
  const [another, setAnother] = useState(false)
  const [menu, setMenu] = useState(false)
  const [created, setCreated] = useState<string[]>([])
  const descRef = useRef<HTMLTextAreaElement>(null)
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }))
  const epics = issues.filter((i) => i.type === 'Epic')
  const create = () => {
    if (!f.summary.trim()) return setErr(true)
    const n = Math.max(...issues.map((i) => Number(i.key.split('-')[1]))) + 1
    const key = `OPS-${n}`
    const now = new Date().toISOString()
    db.insert('jira.issues', {
      id: `ops-${n}`, key, type: f.type, summary: f.summary.trim(), description: f.description, status: f.status, priority: f.priority, assignee: f.assignee, reporter: ME.id,
      labels: f.labels.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean), sprintId: f.sprintId || null, points: f.points ? Number(f.points) : undefined,
      created: now, updated: now, comments: [], createdBy: isAgent ? 'hworker' : undefined,
      ...(f.epic && f.type !== 'Epic' ? { epic: f.epic } : {}),
      ...(f.due ? { due: new Date(f.due + 'T17:00:00').toISOString() } : {}),
    })
    if (another) {
      setCreated((c) => [...c, key])
      setF((x) => ({ ...x, summary: '', description: '' }))
      return
    }
    onCreated(key)
  }
  const L = ({ t, req }: { t: string; req?: boolean }) => <div className="text-[12px] font-semibold text-[#505258] mb-1 mt-4">{t}{req && <span className="text-[#C9372C]"> *</span>}</div>
  const inp = 'w-full h-9 px-2 rounded-[4px] border border-[#8C8F97] text-[14px] outline-none focus:border-[#1868DB] focus:shadow-[0_0_0_1px_#1868DB] bg-white'
  const wrap = (before: string, after = before) => {
    const ta = descRef.current
    if (!ta) return
    const { selectionStart: s, selectionEnd: e } = ta
    const sel = f.description.slice(s, e) || 'text'
    set({ description: f.description.slice(0, s) + before + sel + after + f.description.slice(e) })
  }
  return (
    <div className="absolute inset-0 z-50 bg-[#050C1F]/50 flex items-start justify-center pt-8">
      <div className="w-[720px] max-h-[90%] bg-white rounded-[12px] shadow-xl flex flex-col" data-agent="jira-create-modal">
        <div className="h-[60px] shrink-0 flex items-center px-6">
          <h2 className="text-[20px] font-semibold">Create</h2>
          <div className="flex-1" />
          <span className="relative">
            <button data-atl-trigger onClick={() => setMenu((m) => !m)} aria-label="More options" className="w-8 h-8 rounded-[4px] hover:bg-[#0515240F] flex items-center justify-center"><MoreHorizontal size={16} /></button>
            {menu && (
              <Pop onClose={() => setMenu(false)} className="right-0 top-9 w-[200px]">
                <PopItem onClick={() => { setF(blank); setErr(false); setMenu(false) }}>Clear all fields</PopItem>
                <PopItem onClick={() => { set({ assignee: ME.id }); setMenu(false) }}>Assign to me</PopItem>
              </Pop>
            )}
          </span>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-[4px] hover:bg-[#0515240F] flex items-center justify-center"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-auto px-6 pb-4">
          {created.length > 0 && <div className="mb-3 px-3 py-2 rounded-[4px] bg-[#DCFFF1] text-[14px] text-[#216E4E]">Created {created.join(', ')}. Keep going — the form stays open while “Create another” is checked.</div>}
          <div className="text-[14px] text-[#505258]">Required fields are marked with an asterisk <span className="text-[#C9372C]">*</span></div>
          <L t="Space" req />
          <select className={inp + ' w-[340px]'} defaultValue="OPS"><option value="OPS">Operations Platform (OPS)</option></select>
          <L t="Work type" req />
          <select data-agent="jira-create-type" aria-label="Work type" value={f.type} onChange={(e) => set({ type: e.target.value })} className={inp + ' w-[340px]'}>
            {['Task', 'Story', 'Bug', 'Epic'].map((t) => <option key={t}>{t}</option>)}
          </select>
          <div className="h-px bg-[#0B120E24] my-5" />
          <L t="Status" />
          <select value={f.status} onChange={(e) => set({ status: e.target.value })} className={inp + ' w-[200px]'}>{COLS.map((c) => <option key={c}>{c}</option>)}</select>
          <L t="Summary" req />
          <input data-agent="jira-create-summary" aria-label="Summary" value={f.summary} onChange={(e) => { set({ summary: e.target.value }); setErr(false) }} className={`${inp} ${err ? 'border-[#C9372C]' : ''}`} />
          {err && <div className="text-[12px] text-[#AE2E24] mt-1">Summary is required</div>}
          <L t="Description" />
          <div className="rounded-[4px] border border-[#8C8F97] focus-within:border-[#1868DB]">
            <div className="h-9 flex items-center gap-1 px-1 border-b border-[#0B120E24] text-[13px] text-[#505258]">
              <span className="font-semibold px-1.5">Aa ▾</span>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => wrap('*')} className="w-7 h-7 rounded hover:bg-[#0515240F] font-bold" aria-label="Bold">B</button>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => wrap('_')} className="w-7 h-7 rounded hover:bg-[#0515240F] italic" aria-label="Italic">I</button>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => set({ description: f.description + (f.description && !f.description.endsWith('\n') ? '\n' : '') + '- ' })} className="w-7 h-7 rounded hover:bg-[#0515240F]" aria-label="Bullet list">☰</button>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => wrap('[', '](https://)')} className="w-7 h-7 rounded hover:bg-[#0515240F]" aria-label="Link">🔗</button>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => wrap('{{', '}}')} className="w-7 h-7 rounded hover:bg-[#0515240F] font-mono text-[11px]" aria-label="Code">{'</>'}</button>
            </div>
            <textarea ref={descRef} data-agent="jira-create-desc" aria-label="Description" value={f.description} onChange={(e) => set({ description: e.target.value })} rows={5} className="w-full px-2 py-2 text-[14px] outline-none resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-x-6">
            <div>
              <L t="Assignee" />
              <select data-agent="jira-create-assignee" aria-label="Assignee" value={f.assignee} onChange={(e) => set({ assignee: e.target.value })} className={inp}>
                <option value="">Automatic</option>
                {PEOPLE.filter((p) => !p.external).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <button type="button" className="text-[13px] text-[#1868DB] mt-1 hover:underline" onClick={() => set({ assignee: ME.id })}>Assign to me</button>
            </div>
            <div>
              <L t="Priority" />
              <select data-agent="jira-create-priority" aria-label="Priority" value={f.priority} onChange={(e) => set({ priority: e.target.value })} className={inp}>
                {['Highest', 'High', 'Medium', 'Low', 'Lowest'].map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <L t="Labels" />
              <input data-agent="jira-create-labels" aria-label="Labels" value={f.labels} onChange={(e) => set({ labels: e.target.value })} placeholder="Select label" className={inp} list="jira-create-label-list" />
              <datalist id="jira-create-label-list">{Array.from(new Set(issues.flatMap((i) => i.labels))).sort().map((l) => <option key={l} value={l} />)}</datalist>
            </div>
            <div>
              <L t="Sprint" />
              <select data-agent="jira-create-sprint" aria-label="Sprint" value={f.sprintId} onChange={(e) => set({ sprintId: e.target.value })} className={inp}>
                <option value="">None (backlog)</option>
                {sprints.filter((s) => s.state !== 'closed').map((s) => <option key={s.id} value={s.id}>{s.name}{s.state === 'active' ? ' (active)' : ''}</option>)}
              </select>
            </div>
            <div>
              <L t="Story point estimate" />
              <input data-agent="jira-create-points" aria-label="Story points" value={f.points} onChange={(e) => set({ points: e.target.value.replace(/\D/g, '') })} className={inp} />
            </div>
            <div>
              <L t="Reporter" req />
              <div className={`${inp} flex items-center gap-2`}><Avatar id={ME.id} size={20} /> {ME.name}</div>
            </div>
            {f.type !== 'Epic' && (
              <div>
                <L t="Parent" />
                <select data-agent="jira-create-parent" aria-label="Parent" value={f.epic} onChange={(e) => set({ epic: e.target.value })} className={inp}>
                  <option value="">None</option>
                  {epics.map((e) => <option key={e.id} value={e.summary}>{e.key} {e.summary}</option>)}
                </select>
              </div>
            )}
            <div>
              <L t="Due date" />
              <input data-agent="jira-create-due" type="date" aria-label="Due date" value={f.due} onChange={(e) => set({ due: e.target.value })} className={inp} />
            </div>
          </div>
        </div>
        <div className="h-[64px] shrink-0 flex items-center px-6 gap-2 border-t border-[#0B120E24]">
          <label className="flex items-center gap-2 text-[14px]"><input type="checkbox" className="w-4 h-4" checked={another} onChange={(e) => setAnother(e.target.checked)} /> Create another</label>
          <div className="flex-1" />
          <button data-agent="jira-create-cancel" onClick={() => (created.length ? onCreated(created[created.length - 1]) : onClose())} className="h-8 px-3 rounded-[4px] hover:bg-[#0515240F] text-[14px] font-medium">Cancel</button>
          <button data-agent="jira-create-submit" onClick={create} className="h-8 px-3 rounded-[4px] bg-[#1868DB] hover:bg-[#1558BC] text-white text-[14px] font-medium">Create</button>
        </div>
      </div>
    </div>
  )
}
