import { useMemo, useState } from 'react'
import { RefreshCw, Star, ChevronDown, Plus, Trash2, Pencil } from 'lucide-react'
import { db, useCollection, useRecord } from '@/db/db'
import { useDesk } from '@/os/context'
import { ME, person } from '@/data/people'
import { type Ticket, type ViewDef, type CustomView, STATUS, HOURS, waiting, ago, Badge, HW, ZPop, ZItem, ZModal, zBtn, zPrimary, zDanger, zInput, useZFlash, AGENTS, GROUPS } from './shared'

export const VIEWS: ViewDef[] = [
  { id: 'your-unsolved', name: 'Your unsolved tickets', pred: (t) => t.assignee === ME.id && !['solved', 'closed'].includes(t.status) },
  { id: 'unassigned', name: 'Unassigned tickets', pred: (t) => !t.assignee && ['new', 'open'].includes(t.status) },
  { id: 'all-unsolved', name: 'All unsolved tickets', pred: (t) => !['solved', 'closed'].includes(t.status) },
  { id: 'waiting', name: 'SLA: First reply > 24h', pred: waiting },
  { id: 'recent', name: 'Recently updated tickets', pred: (t) => HOURS(t.updated) < 72 },
  { id: 'pending', name: 'Pending tickets', pred: (t) => t.status === 'pending' },
  { id: 'solved', name: 'Recently solved tickets', pred: (t) => t.status === 'solved' },
  { id: 'billing', name: 'Billing queue', pred: (t) => t.group === 'Billing' && !['solved', 'closed'].includes(t.status) },
]

export const customPred = (v: CustomView) => (t: Ticket) =>
  (!v.statuses.length || v.statuses.includes(t.status)) &&
  (!v.group || t.group === v.group) &&
  (!v.priority || t.priority === v.priority) &&
  (v.assignee === '' || (v.assignee === 'me' ? t.assignee === ME.id : !t.assignee)) &&
  (!v.tag || t.tags.some((g) => g.includes(v.tag.toLowerCase())))

export function useAllViews(): ViewDef[] {
  const custom = useCollection<CustomView>('zendesk.views')
  return [...VIEWS, ...custom.map((c) => ({ id: c.id, name: c.name, pred: customPred(c), custom: true }))]
}

export function ViewEditor({ view, onClose }: { view?: CustomView; onClose: (id?: string) => void }) {
  const flash = useZFlash()
  const [v, setV] = useState<CustomView>(view ?? { id: `view-${Date.now().toString(36)}`, name: '', statuses: ['new', 'open'], group: '', assignee: '', priority: '', tag: '', owner: ME.id })
  const tickets = useCollection<Ticket>('zendesk.tickets')
  const n = tickets.filter(customPred(v)).length
  const sel = 'h-9 px-2 rounded-[4px] border border-[#C2C8CC] text-[14px] bg-white w-full'
  return (
    <ZModal
      title={view ? 'Edit view' : 'Add view'}
      onClose={() => onClose()}
      agent="zd-view-editor"
      footer={<><button className={zBtn} onClick={() => onClose()}>Cancel</button><button className={zPrimary} disabled={!v.name.trim()} onClick={() => { db.upsert('zendesk.views', { ...v, name: v.name.trim() }); flash(view ? 'View updated' : `View “${v.name.trim()}” created`); onClose(v.id) }}>Save</button></>}
    >
      <div className="text-[13px] font-semibold mb-1">Title</div>
      <input autoFocus value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} className={zInput} aria-label="View title" placeholder="e.g. Urgent billing tickets" />
      <div className="text-[13px] font-semibold mb-1 mt-4">Tickets must meet all of these conditions</div>
      <div className="text-[12px] text-[#68737D] mb-1">Status is</div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {Object.entries(STATUS).map(([k, s]) => (
          <label key={k} className={`h-7 px-2 rounded-full border text-[13px] flex items-center gap-1.5 cursor-pointer ${v.statuses.includes(k) ? 'border-[#1F73B7] bg-[#EDF7FF]' : 'border-[#C2C8CC]'}`}>
            <input type="checkbox" className="hidden" checked={v.statuses.includes(k)} onChange={() => setV({ ...v, statuses: v.statuses.includes(k) ? v.statuses.filter((x) => x !== k) : [...v.statuses, k] })} />
            <span className="w-2.5 h-2.5 rounded-[2px]" style={{ background: s.bg }} /> {s.label}
          </label>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-[12px] text-[#68737D]">Group<select value={v.group} onChange={(e) => setV({ ...v, group: e.target.value })} className={sel}><option value="">Any</option>{GROUPS.map((g) => <option key={g}>{g}</option>)}</select></label>
        <label className="text-[12px] text-[#68737D]">Assignee<select value={v.assignee} onChange={(e) => setV({ ...v, assignee: e.target.value as any })} className={sel}><option value="">Any</option><option value="me">Current user</option><option value="none">Unassigned</option></select></label>
        <label className="text-[12px] text-[#68737D]">Priority<select value={v.priority} onChange={(e) => setV({ ...v, priority: e.target.value })} className={sel + ' capitalize'}><option value="">Any</option>{['low', 'normal', 'high', 'urgent'].map((p) => <option key={p}>{p}</option>)}</select></label>
        <label className="text-[12px] text-[#68737D]">Tags contain<input value={v.tag} onChange={(e) => setV({ ...v, tag: e.target.value })} className={zInput} /></label>
      </div>
      <div className="mt-3 text-[13px] text-[#68737D]">{n} ticket{n === 1 ? '' : 's'} currently match.</div>
    </ZModal>
  )
}

type SortKey = 'status' | 'id' | 'subject' | 'requester' | 'requested' | 'priority' | 'group' | 'assignee' | 'updated'
const PRI = ['low', 'normal', 'high', 'urgent']
const ST = ['new', 'open', 'pending', 'hold', 'solved', 'closed']

export function ViewsPage({ view, setView, onOpen, onPlay, onManage }: { view: string; setView: (v: string) => void; onOpen: (id: string) => void; onPlay: (ids: string[]) => void; onManage: () => void }) {
  const { isAgent } = useDesk()
  const flash = useZFlash()
  const tickets = useCollection<Ticket>('zendesk.tickets')
  const views = useAllViews()
  const prefs = useRecord<{ id: string; starred: string[] }>('zendesk.prefs', `views-${ME.id}`)
  const starred = prefs?.starred ?? []
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean } | null>(null)
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [spin, setSpin] = useState(false)
  const [menu, setMenu] = useState<null | 'actions'>(null)
  const [dialog, setDialog] = useState<null | 'edit' | 'delete' | 'merge' | 'view-edit'>(null)
  const [bulk, setBulk] = useState({ status: '', priority: '', assignee: '__keep', group: '', type: '', tags: '' })
  const [mergeTarget, setMergeTarget] = useState('')
  const v = views.find((x) => x.id === view) ?? VIEWS[1]
  const base = tickets.filter(v.pred).sort((a, b) => (v.id === 'recent' || v.id === 'solved' ? +new Date(b.updated) - +new Date(a.updated) : +new Date(a.created) - +new Date(b.created)))
  const rows = useMemo(() => {
    if (!sort) return base
    const val = (t: Ticket): any =>
      sort.key === 'status' ? ST.indexOf(t.status) : sort.key === 'id' ? t.number : sort.key === 'subject' ? t.subject.toLowerCase() : sort.key === 'requester' ? t.requester.name : sort.key === 'requested' ? +new Date(t.created) : sort.key === 'priority' ? PRI.indexOf(t.priority) : sort.key === 'group' ? t.group : sort.key === 'assignee' ? (t.assignee ? person(t.assignee).name : '~') : +new Date(t.updated)
    return [...base].sort((a, b) => {
      const x = val(a)
      const y = val(b)
      return (x < y ? -1 : x > y ? 1 : 0) * (sort.desc ? -1 : 1)
    })
  }, [base, sort])
  const selected = tickets.filter((t) => sel.has(t.id))
  const allChecked = rows.length > 0 && rows.every((r) => sel.has(r.id))
  const th = (key: SortKey, label: string, cls = '') => (
    <th className={`font-semibold cursor-pointer select-none hover:text-[#2F3941] ${cls}`} onClick={() => setSort((s) => (s?.key === key ? { key, desc: !s.desc } : { key, desc: false }))}>
      {label}{sort?.key === key ? (sort.desc ? ' ↓' : ' ↑') : key === 'requested' && !sort ? ' ↑' : ''}
    </th>
  )
  const now = () => new Date().toISOString()
  const applyBulk = () => {
    const tags = bulk.tags.split(/[,\s]+/).map((x) => x.trim().toLowerCase()).filter(Boolean)
    for (const t of selected)
      db.update('zendesk.tickets', t.id, {
        ...(bulk.status ? { status: bulk.status } : {}),
        ...(bulk.priority ? { priority: bulk.priority } : {}),
        ...(bulk.assignee !== '__keep' ? { assignee: bulk.assignee } : {}),
        ...(bulk.group ? { group: bulk.group } : {}),
        ...(bulk.type ? { type: bulk.type } : {}),
        ...(tags.length ? { tags: Array.from(new Set([...t.tags, ...tags])) } : {}),
        updated: now(),
        updatedBy: isAgent ? 'hworker' : t.updatedBy,
      })
    flash(`${selected.length} ticket${selected.length === 1 ? '' : 's'} updated`)
    setSel(new Set())
    setDialog(null)
    setBulk({ status: '', priority: '', assignee: '__keep', group: '', type: '', tags: '' })
  }
  const merge = () => {
    const target = tickets.find((t) => String(t.number) === mergeTarget.replace('#', '').trim())
    if (!target) return flash(`Ticket ${mergeTarget} not found`)
    const src = selected.filter((t) => t.id !== target.id)
    const ts = now()
    for (const s of src) {
      db.update('zendesk.tickets', s.id, { status: 'closed', mergedInto: target.id, updated: ts, tags: Array.from(new Set([...s.tags, 'merged'])), comments: [...s.comments, { id: `c-${Date.now()}${s.id}`, author: ME.id, public: false, body: `This ticket was closed and merged into ticket #${target.number} “${target.subject}”.`, date: ts }] })
    }
    db.update('zendesk.tickets', target.id, (r) => ({ updated: ts, comments: [...(r.comments as any[]), { id: `c-${Date.now()}m`, author: ME.id, public: false, body: `Ticket${src.length === 1 ? '' : 's'} ${src.map((s) => `#${s.number}`).join(', ')} ${src.length === 1 ? 'was' : 'were'} merged into this ticket.`, date: ts }] }))
    flash(`Merged ${src.length} ticket${src.length === 1 ? '' : 's'} into #${target.number}`)
    setSel(new Set())
    setDialog(null)
    setMergeTarget('')
  }

  return (
    <div className="flex-1 min-h-0 flex relative">
      <div className="w-[280px] shrink-0 border-r border-[#D8DCDE] bg-[#F8F9F9] flex flex-col">
        <div className="h-[60px] flex items-center px-5 gap-2">
          <h2 className="text-[22px] font-semibold text-[#2F3941]">Views</h2>
          <div className="flex-1" />
          <button className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#E9EBED] text-[#68737D]" aria-label="Refresh" onClick={() => { setSpin(true); setTimeout(() => setSpin(false), 700) }}><RefreshCw size={16} className={spin ? 'animate-spin' : ''} /></button>
        </div>
        <div className="flex-1 overflow-auto px-2">
          {views.map((x) => {
            const n = tickets.filter(x.pred).length
            return (
              <button key={x.id} data-agent={`zd-view-${x.id}`} onClick={() => { setView(x.id); setSel(new Set()); setSort(null) }} className={`w-full h-9 flex items-center px-3 rounded-[4px] text-[14px] text-left ${view === x.id ? 'bg-[#D8DCDE]/70 font-semibold text-[#2F3941]' : 'text-[#2F3941] hover:bg-[#E9EBED]'}`}>
                {starred.includes(x.id) && <Star size={12} className="mr-1.5 text-[#F79A3E] shrink-0" fill="#F79A3E" />}
                <span className="flex-1 truncate">{x.name}</span>
                <span className={`text-[13px] ${x.id === 'waiting' && n ? 'text-[#CC3340] font-semibold' : 'text-[#68737D]'}`}>{n}</span>
              </button>
            )
          })}
          <div className="h-px bg-[#D8DCDE] my-3 mx-2" />
          <button className="w-full h-9 flex items-center px-3 text-[14px] text-[#1F73B7] hover:underline" onClick={onManage}>Manage views</button>
          <button className="w-full h-9 flex items-center gap-1.5 px-3 text-[14px] text-[#1F73B7] hover:underline" onClick={() => setDialog('view-edit')}><Plus size={14} /> Add view</button>
        </div>
      </div>
      <div className="flex-1 min-w-0 flex flex-col bg-white">
        <div className="px-6 pt-5 pb-3 flex items-end gap-3">
          <div>
            <h1 className="text-[22px] font-semibold text-[#2F3941] flex items-center gap-2" data-agent="zd-view-title">
              {v.name}
              <button aria-label={starred.includes(v.id) ? 'Unstar view' : 'Star view'} onClick={() => db.upsert('zendesk.prefs', { id: `views-${ME.id}`, starred: starred.includes(v.id) ? starred.filter((s) => s !== v.id) : [...starred, v.id] })}>
                <Star size={16} className={starred.includes(v.id) ? 'text-[#F79A3E]' : 'text-[#87929D]'} fill={starred.includes(v.id) ? '#F79A3E' : 'none'} />
              </button>
              {v.custom && <button aria-label="Edit view" onClick={() => setDialog('view-edit')} className="text-[#87929D] hover:text-[#2F3941]"><Pencil size={15} /></button>}
            </h1>
            <div className="text-[14px] text-[#68737D] mt-0.5">{rows.length} tickets{sel.size ? ` · ${sel.size} selected` : ''}</div>
          </div>
          <div className="flex-1" />
          <span className="relative">
            <button data-zd-trigger className="h-8 px-3 rounded-[4px] border border-[#C2C8CC] text-[14px] text-[#2F3941] hover:bg-[#F8F9F9] flex items-center gap-1" onClick={() => setMenu(menu ? null : 'actions')}>Actions <ChevronDown size={14} /></button>
            {menu === 'actions' && (
              <ZPop onClose={() => setMenu(null)} className="right-0 top-9 w-[230px]" agent="zd-view-actions">
                <div className="px-4 py-1 text-[12px] text-[#68737D]">{sel.size ? `${sel.size} selected` : 'Select tickets to edit them in bulk'}</div>
                <ZItem disabled={!sel.size} onClick={() => { setMenu(null); setDialog('edit') }}>Edit {sel.size || ''} ticket{sel.size === 1 ? '' : 's'}</ZItem>
                <ZItem disabled={sel.size < 2} onClick={() => { setMenu(null); setDialog('merge') }}>Merge tickets</ZItem>
                <ZItem disabled={!sel.size} onClick={() => { setMenu(null); for (const t of selected) db.update('zendesk.tickets', t.id, { status: 'closed', tags: Array.from(new Set([...t.tags, 'spam'])), updated: now() }); flash(`${selected.length} ticket${selected.length === 1 ? '' : 's'} marked as spam`); setSel(new Set()) }}>Mark as spam</ZItem>
                <div className="h-px bg-[#E9EBED] my-1" />
                <ZItem disabled={!sel.size} danger onClick={() => { setMenu(null); setDialog('delete') }}>Delete</ZItem>
                {v.custom && <><div className="h-px bg-[#E9EBED] my-1" /><ZItem danger onClick={() => { setMenu(null); db.remove('zendesk.views', v.id); setView('unassigned'); flash('View deleted') }}><Trash2 size={14} /> Delete this view</ZItem></>}
              </ZPop>
            )}
          </span>
          <button className="h-8 px-4 rounded-[4px] bg-[#1F73B7] text-white text-[14px] font-semibold hover:bg-[#144A75] disabled:opacity-50" disabled={!rows.length} onClick={() => onPlay(rows.map((r) => r.id))}>Play</button>
        </div>
        <div className="flex-1 overflow-auto px-6" data-agent="zd-ticket-table">
          <table className="w-full text-[14px] text-[#2F3941] [&_td]:px-2 [&_th]:px-2">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="h-10 border-b border-[#D8DCDE] text-left text-[13px] text-[#68737D]">
                <th className="w-8"><input type="checkbox" aria-label="Select all tickets" checked={allChecked} onChange={() => setSel(allChecked ? new Set() : new Set(rows.map((r) => r.id)))} className="w-4 h-4 accent-[#1F73B7]" /></th>
                {th('status', 'Status', 'w-[80px]')}
                {th('id', 'ID', 'w-[80px]')}
                {th('subject', 'Subject')}
                {th('requester', 'Requester')}
                {th('requested', 'Requested')}
                {th('priority', 'Priority')}
                {th('group', 'Group')}
                {th('assignee', 'Assignee')}
                {th('updated', 'Updated')}
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} data-agent={`zd-ticket-row-${t.id}`} onClick={() => onOpen(t.id)} className={`h-[44px] border-b border-[#E9EBED] hover:bg-[#EDF7FF] cursor-pointer ${sel.has(t.id) ? 'bg-[#EDF7FF]' : ''} ${t.updatedBy === 'hworker' && HOURS(t.updated) < 0.03 ? 'flash-new' : ''}`}>
                  <td onClick={(e) => e.stopPropagation()}><input type="checkbox" aria-label={`Select ticket #${t.number}`} checked={sel.has(t.id)} onChange={() => setSel((s) => { const n = new Set(s); if (n.has(t.id)) n.delete(t.id); else n.add(t.id); return n })} className="w-4 h-4 accent-[#1F73B7]" /></td>
                  <td><Badge s={t.status} small /></td>
                  <td className="text-[#68737D]">#{t.number}</td>
                  <td className="max-w-[300px]">
                    <span className="truncate block font-semibold">{t.subject}</span>
                  </td>
                  <td className="whitespace-nowrap">{t.requester.name}</td>
                  <td className={`whitespace-nowrap ${waiting(t) ? 'text-[#CC3340] font-semibold' : ''}`}>{ago(t.created)}</td>
                  <td className="capitalize">{t.priority || '-'}</td>
                  <td className="whitespace-nowrap">{t.group}</td>
                  <td className="whitespace-nowrap">{t.assignee ? person(t.assignee).name : <span className="text-[#87929D]">-</span>}</td>
                  <td className="whitespace-nowrap text-[13px]"><span className="inline-flex items-center gap-1.5">{ago(t.updated)} {t.updatedBy === 'hworker' && <HW />}</span></td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={10} className="py-16 text-center text-[#68737D]">No tickets in this view. Nice work!</td></tr>}
            </tbody>
          </table>
        </div>
        {sel.size > 0 && (
          <div className="shrink-0 h-14 border-t border-[#D8DCDE] bg-white flex items-center gap-3 px-6 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]" data-agent="zd-bulk-bar">
            <span className="text-[14px] font-semibold">{sel.size} ticket{sel.size === 1 ? '' : 's'} selected</span>
            <button className={zBtn} onClick={() => setSel(new Set())}>Clear selection</button>
            <div className="flex-1" />
            {sel.size >= 2 && <button className={zBtn} onClick={() => setDialog('merge')}>Merge</button>}
            <button className={zPrimary} onClick={() => setDialog('edit')}>Edit {sel.size} ticket{sel.size === 1 ? '' : 's'}</button>
          </div>
        )}
      </div>
      {dialog === 'edit' && (
        <ZModal title={`Edit ${selected.length} ticket${selected.length === 1 ? '' : 's'}`} onClose={() => setDialog(null)} agent="zd-bulk-edit" footer={<><button className={zBtn} onClick={() => setDialog(null)}>Cancel</button><button className={zPrimary} onClick={applyBulk}>Update</button></>}>
          <div className="text-[13px] text-[#68737D] mb-3">Fields left as “– No change –” keep their current values.</div>
          <div className="grid grid-cols-2 gap-3 text-[12px] text-[#68737D]">
            <label>Status<select value={bulk.status} onChange={(e) => setBulk({ ...bulk, status: e.target.value })} className={zInput}><option value="">– No change –</option>{Object.entries(STATUS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}</select></label>
            <label>Priority<select value={bulk.priority} onChange={(e) => setBulk({ ...bulk, priority: e.target.value })} className={zInput + ' capitalize'}><option value="">– No change –</option>{PRI.map((p) => <option key={p}>{p}</option>)}</select></label>
            <label>Assignee<select value={bulk.assignee} onChange={(e) => setBulk({ ...bulk, assignee: e.target.value })} className={zInput}><option value="__keep">– No change –</option><option value="">Unassigned</option>{AGENTS.map((a) => <option key={a} value={a}>{person(a).name}</option>)}</select></label>
            <label>Group<select value={bulk.group} onChange={(e) => setBulk({ ...bulk, group: e.target.value })} className={zInput}><option value="">– No change –</option>{GROUPS.map((g) => <option key={g}>{g}</option>)}</select></label>
            <label>Type<select value={bulk.type} onChange={(e) => setBulk({ ...bulk, type: e.target.value })} className={zInput + ' capitalize'}><option value="">– No change –</option>{['question', 'incident', 'problem', 'task'].map((x) => <option key={x}>{x}</option>)}</select></label>
            <label>Add tags<input value={bulk.tags} onChange={(e) => setBulk({ ...bulk, tags: e.target.value })} className={zInput} placeholder="tag1 tag2" /></label>
          </div>
        </ZModal>
      )}
      {dialog === 'delete' && (
        <ZModal title={`Delete ${selected.length} ticket${selected.length === 1 ? '' : 's'}?`} onClose={() => setDialog(null)} footer={<><button className={zBtn} onClick={() => setDialog(null)}>Cancel</button><button className={zDanger} onClick={() => { for (const t of selected) db.remove('zendesk.tickets', t.id); flash(`${selected.length} ticket${selected.length === 1 ? '' : 's'} deleted`); setSel(new Set()); setDialog(null) }}>Delete</button></>}>
          {selected.map((t) => `#${t.number}`).join(', ')} will be deleted. This can’t be undone.
        </ZModal>
      )}
      {dialog === 'merge' && (
        <ZModal title="Merge tickets" onClose={() => setDialog(null)} footer={<><button className={zBtn} onClick={() => setDialog(null)}>Cancel</button><button className={zPrimary} disabled={!mergeTarget} onClick={merge}>Merge</button></>}>
          <div className="mb-2">Merge the selected tickets into:</div>
          <select value={mergeTarget} onChange={(e) => setMergeTarget(e.target.value)} className={zInput} aria-label="Merge into"><option value="">Choose the ticket to keep…</option>{selected.map((t) => <option key={t.id} value={String(t.number)}>#{t.number} {t.subject}</option>)}</select>
          <div className="text-[13px] text-[#68737D] mt-2">The other tickets will be closed with an internal note linking to the ticket you keep.</div>
        </ZModal>
      )}
      {dialog === 'view-edit' && <ViewEditorFor id={v.custom ? v.id : undefined} onClose={(id) => { setDialog(null); if (id) setView(id) }} />}
    </div>
  )
}

function ViewEditorFor({ id, onClose }: { id?: string; onClose: (id?: string) => void }) {
  const rec = useRecord<CustomView>('zendesk.views', id)
  return <ViewEditor view={rec} onClose={onClose} />
}
