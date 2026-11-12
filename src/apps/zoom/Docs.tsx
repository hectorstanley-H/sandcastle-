import { useState } from 'react'
import { ChevronLeft, FileText, Plus, Search, Star, Trash2 } from 'lucide-react'
import { db, uid, useCollection } from '@/db/db'
import { useDesk } from '@/os/context'
import { Avatar } from '@/components/Avatar'
import { ME, person } from '@/data/people'
import { Confirm, HWBadge, useZoom } from './shared'

const ago = (iso: string) => {
  const s = (Date.now() - +new Date(iso)) / 1000
  if (s < 60) return 'Just now'
  if (s < 3600) return `${Math.round(s / 60)} min ago`
  if (s < 86400) return `${Math.round(s / 3600)} hr ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function DocsTab() {
  const { isAgent } = useDesk()
  const { toast } = useZoom()
  const docs = useCollection<any>('zoom.docs')
  const [sel, setSel] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<'all' | 'mine' | 'shared' | 'starred'>('all')
  const [del, setDel] = useState<any>(null)
  const doc = docs.find((d) => d.id === sel)
  const create = () => {
    const id = uid('zd')
    db.insert('zoom.docs', { id, title: 'Untitled doc', body: '', ownerId: ME.id, updated: new Date().toISOString(), created: new Date().toISOString(), createdBy: isAgent ? 'hworker' : undefined }, { prepend: true })
    setSel(id)
  }
  const list = docs
    .filter((d) => (filter === 'mine' ? d.ownerId === ME.id : filter === 'shared' ? d.ownerId !== ME.id : filter === 'starred' ? d.starred : true))
    .filter((d) => `${d.title} ${d.body}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => +new Date(b.updated) - +new Date(a.updated))
  const patch = (p: any) => doc && db.update('zoom.docs', doc.id, { ...p, updated: new Date().toISOString() })

  if (doc)
    return (
      <div className="flex-1 min-w-0 flex flex-col" data-agent="zoom-doc-editor">
        <div className="h-12 shrink-0 px-4 flex items-center gap-2 border-b border-[#E4E4ED]">
          <button data-agent="zoom-doc-back" onClick={() => setSel(null)} className="h-8 px-2 rounded-[8px] hover:bg-[#ECECF2] flex items-center gap-1 text-[13px]"><ChevronLeft size={15} /> All docs</button>
          <span className="text-[12px] text-[#6E7680] ml-2">Saved · {ago(doc.updated)}</span>
          <div className="flex-1" />
          <button aria-label={doc.starred ? 'Unstar' : 'Star'} onClick={() => db.update('zoom.docs', doc.id, { starred: !doc.starred })} className="w-8 h-8 rounded-[8px] hover:bg-[#ECECF2] flex items-center justify-center"><Star size={15} className={doc.starred ? 'fill-[#F5A623] text-[#F5A623]' : 'text-[#6E7680]'} /></button>
          <button data-agent="zoom-doc-delete" aria-label="Delete doc" onClick={() => setDel(doc)} className="w-8 h-8 rounded-[8px] hover:bg-[#ECECF2] flex items-center justify-center text-[#6E7680] hover:text-[#E02828]"><Trash2 size={15} /></button>
        </div>
        <div className="flex-1 overflow-auto">
          <div className="max-w-[760px] mx-auto px-10 py-8">
            <input data-agent="zoom-doc-title" aria-label="Doc title" value={doc.title} onChange={(e) => patch({ title: e.target.value })} className="w-full text-[30px] font-bold outline-none" placeholder="Untitled doc" />
            <div className="flex items-center gap-2 text-[12.5px] text-[#6E7680] mt-2 mb-6"><Avatar id={doc.ownerId} size={20} /> {person(doc.ownerId).name} {doc.createdBy === 'hworker' && <HWBadge text="H-Worker" />}</div>
            <textarea data-agent="zoom-doc-body" aria-label="Doc body" value={doc.body} onChange={(e) => patch({ body: e.target.value })} placeholder="Type / for commands, or start writing…" className="w-full min-h-[420px] outline-none resize-none text-[15px] leading-[1.7]" />
          </div>
        </div>
        {del && <Confirm title="Delete doc?" body={<>“{del.title}” will be moved to trash.</>} agent="zoom-doc-delete-dialog" onCancel={() => setDel(null)} onConfirm={() => { db.remove('zoom.docs', del.id); setDel(null); setSel(null); toast('Doc moved to trash') }} />}
      </div>
    )

  return (
    <div className="flex-1 min-w-0 flex">
      <div className="w-[220px] shrink-0 bg-[#F7F7FA] border-r border-[#E4E4ED] p-3 space-y-1 text-[13.5px]">
        <button data-agent="zoom-doc-new" onClick={create} className="w-full h-9 mb-2 rounded-[8px] bg-[#0B5CFF] text-white font-semibold flex items-center justify-center gap-1.5"><Plus size={15} /> New</button>
        {([['all', 'All docs'], ['mine', 'My docs'], ['shared', 'Shared with me'], ['starred', 'Starred']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} className={`w-full h-8 px-3 rounded-[8px] text-left ${filter === k ? 'bg-[#DCE8FF] text-[#0B5CFF] font-semibold' : 'hover:bg-[#ECECF2]'}`}>{l}</button>
        ))}
      </div>
      <div className="flex-1 min-w-0 overflow-auto p-6">
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-[20px] font-bold flex-1">{filter === 'all' ? 'All docs' : filter === 'mine' ? 'My docs' : filter === 'shared' ? 'Shared with me' : 'Starred'}</h1>
          <div className="flex items-center h-8 w-[240px] rounded-[8px] border border-[#D5D7E0] px-3 gap-2 text-[#6E7680]"><Search size={14} /><input aria-label="Search docs" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search docs" className="flex-1 outline-none text-[13px] text-[#131619] bg-transparent" /></div>
        </div>
        {!list.length && <div className="py-20 text-center text-[13px] text-[#6E7680]">{docs.length ? 'No docs match.' : 'No docs yet — create one with New.'}</div>}
        <div className="divide-y divide-[#F0F0F5]">
          {list.map((d) => (
            <div key={d.id} className="group flex items-center gap-3 h-14 px-2 hover:bg-[#F7F7FA] rounded-[8px]">
              <button data-agent={`zoom-doc-${d.id}`} onClick={() => setSel(d.id)} className="flex-1 min-w-0 flex items-center gap-3 text-left">
                <span className="w-8 h-8 rounded-[8px] bg-[#E8EFFF] text-[#0B5CFF] flex items-center justify-center shrink-0"><FileText size={16} /></span>
                <span className="min-w-0"><span className="block text-[14px] font-semibold truncate">{d.title || 'Untitled doc'}</span><span className="block text-[12px] text-[#6E7680] truncate">{person(d.ownerId).name} · Edited {ago(d.updated)}</span></span>
              </button>
              <button aria-label={d.starred ? 'Unstar' : 'Star'} onClick={() => db.update('zoom.docs', d.id, { starred: !d.starred })} className={`w-8 h-8 rounded-[8px] hover:bg-[#ECECF2] flex items-center justify-center ${d.starred ? '' : 'opacity-0 group-hover:opacity-100'}`}><Star size={14} className={d.starred ? 'fill-[#F5A623] text-[#F5A623]' : 'text-[#6E7680]'} /></button>
              <button aria-label="Delete doc" onClick={() => setDel(d)} className="w-8 h-8 rounded-[8px] hover:bg-[#ECECF2] flex items-center justify-center text-[#6E7680] hover:text-[#E02828] opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      </div>
      {del && <Confirm title="Delete doc?" body={<>“{del.title}” will be moved to trash.</>} agent="zoom-doc-delete-dialog" onCancel={() => setDel(null)} onConfirm={() => { db.remove('zoom.docs', del.id); setDel(null); toast('Doc moved to trash') }} />}
    </div>
  )
}
