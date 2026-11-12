import { useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { ChevronLeft, Eraser, LayoutGrid, Plus, Search, StickyNote, Trash2, Undo2 } from 'lucide-react'
import { db, uid, useCollection } from '@/db/db'
import { useDesk } from '@/os/context'
import { ME, person } from '@/data/people'
import { Confirm, usePrefs, useZoom } from './shared'

/* ───────────────────────── Whiteboards ───────────────────────── */
const PENS = ['#131619', '#0B5CFF', '#E02828', '#00A35C', '#F5A623', '#7B61FF']

export function WhiteboardsTab() {
  const { isAgent } = useDesk()
  const { toast } = useZoom()
  const boards = useCollection<any>('zoom.whiteboards')
  const [sel, setSel] = useState<string | null>(null)
  const [del, setDel] = useState<any>(null)
  const b = boards.find((x) => x.id === sel)
  const create = () => {
    const id = uid('zwb')
    db.insert('zoom.whiteboards', { id, title: 'Untitled whiteboard', strokes: [], ownerId: ME.id, updated: new Date().toISOString(), createdBy: isAgent ? 'hworker' : undefined }, { prepend: true })
    setSel(id)
  }
  if (b) return <Board b={b} back={() => setSel(null)} />
  return (
    <div className="flex-1 min-w-0 overflow-auto p-6" data-agent="zoom-whiteboards">
      <div className="flex items-center gap-3 mb-5">
        <h1 className="text-[20px] font-bold flex-1">Whiteboards</h1>
        <button data-agent="zoom-wb-new" onClick={create} className="h-9 px-4 rounded-[8px] bg-[#0B5CFF] text-white text-[13.5px] font-semibold flex items-center gap-1.5"><Plus size={15} /> New whiteboard</button>
      </div>
      {!boards.length && <div className="py-20 text-center text-[13px] text-[#6E7680]">No whiteboards yet.</div>}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
        {boards.map((w) => (
          <div key={w.id} className="group rounded-[12px] border border-[#E4E4ED] overflow-hidden hover:shadow-md">
            <button onClick={() => setSel(w.id)} className="block w-full text-left">
              <svg viewBox="0 0 800 450" className="w-full h-[120px] bg-[#FAFAFC]">
                {(w.strokes ?? []).map((s: any, i: number) => <polyline key={i} points={s.pts.map((p: number[]) => p.join(',')).join(' ')} fill="none" stroke={s.color} strokeWidth={s.w ?? 4} strokeLinecap="round" strokeLinejoin="round" />)}
              </svg>
              <div className="px-3 py-2"><div className="text-[14px] font-semibold truncate">{w.title}</div><div className="text-[12px] text-[#6E7680]">{person(w.ownerId).name} · {new Date(w.updated).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div></div>
            </button>
            <div className="px-3 pb-2 -mt-1 flex justify-end"><button aria-label="Delete whiteboard" onClick={() => setDel(w)} className="opacity-0 group-hover:opacity-100 text-[#6E7680] hover:text-[#E02828]"><Trash2 size={14} /></button></div>
          </div>
        ))}
      </div>
      {del && <Confirm title="Delete whiteboard?" body={<>“{del.title}” will be deleted for everyone it’s shared with.</>} onCancel={() => setDel(null)} onConfirm={() => { db.remove('zoom.whiteboards', del.id); setDel(null); toast('Whiteboard deleted') }} />}
    </div>
  )
}

function Board({ b, back }: { b: any; back: () => void }) {
  const [color, setColor] = useState(PENS[1])
  const [erase, setErase] = useState(false)
  const [live, setLive] = useState<number[][] | null>(null)
  const svg = useRef<SVGSVGElement>(null)
  const pt = (e: RPointerEvent) => {
    const r = svg.current!.getBoundingClientRect()
    return [Math.round(((e.clientX - r.left) / r.width) * 800), Math.round(((e.clientY - r.top) / r.height) * 450)]
  }
  const save = (strokes: any[]) => db.update('zoom.whiteboards', b.id, { strokes, updated: new Date().toISOString() })
  return (
    <div className="flex-1 min-w-0 flex flex-col" data-agent="zoom-wb-editor">
      <div className="h-12 shrink-0 px-4 flex items-center gap-2 border-b border-[#E4E4ED]">
        <button onClick={back} className="h-8 px-2 rounded-[8px] hover:bg-[#ECECF2] flex items-center gap-1 text-[13px]"><ChevronLeft size={15} /> Whiteboards</button>
        <input aria-label="Whiteboard title" value={b.title} onChange={(e) => db.update('zoom.whiteboards', b.id, { title: e.target.value })} className="ml-2 h-8 px-2 rounded-[6px] text-[14px] font-semibold outline-none hover:bg-[#F7F7FA] focus:bg-[#F7F7FA]" />
        <div className="flex-1" />
        {PENS.map((c) => <button key={c} aria-label={`Pen ${c}`} onClick={() => { setColor(c); setErase(false) }} className={`w-6 h-6 rounded-full border-2 ${!erase && color === c ? 'border-[#131619]' : 'border-white'}`} style={{ background: c }} />)}
        <button aria-label="Eraser" title="Erase strokes" onClick={() => setErase(!erase)} className={`w-8 h-8 rounded-[8px] flex items-center justify-center ${erase ? 'bg-[#DCE8FF] text-[#0B5CFF]' : 'hover:bg-[#ECECF2]'}`}><Eraser size={15} /></button>
        <button aria-label="Undo" title="Undo" onClick={() => save((b.strokes ?? []).slice(0, -1))} className="w-8 h-8 rounded-[8px] hover:bg-[#ECECF2] flex items-center justify-center"><Undo2 size={15} /></button>
        <button aria-label="Clear board" title="Clear" onClick={() => save([])} className="h-8 px-3 rounded-[8px] border border-[#D5D7E0] text-[12.5px] font-medium">Clear</button>
      </div>
      <div className="flex-1 min-h-0 p-4 bg-[#F1F3F7]">
        <svg
          ref={svg}
          viewBox="0 0 800 450"
          preserveAspectRatio="none"
          className="w-full h-full bg-white rounded-[10px] shadow-sm touch-none"
          style={{ cursor: erase ? 'cell' : 'crosshair', backgroundImage: 'radial-gradient(#E4E4ED 1px, transparent 1px)', backgroundSize: '20px 20px' }}
          onPointerDown={(e) => {
            if (erase) return
            ;(e.target as Element).setPointerCapture?.(e.pointerId)
            setLive([pt(e)])
          }}
          onPointerMove={(e) => live && setLive([...live, pt(e)])}
          onPointerUp={() => {
            if (live && live.length > 1) save([...(b.strokes ?? []), { color, w: 4, pts: live }])
            setLive(null)
          }}
        >
          {(b.strokes ?? []).map((s: any, i: number) => (
            <polyline key={i} points={s.pts.map((p: number[]) => p.join(',')).join(' ')} fill="none" stroke={s.color} strokeWidth={s.w ?? 4} strokeLinecap="round" strokeLinejoin="round" onClick={() => erase && save(b.strokes.filter((_: any, j: number) => j !== i))} style={{ cursor: erase ? 'pointer' : undefined }} />
          ))}
          {live && <polyline points={live.map((p) => p.join(',')).join(' ')} fill="none" stroke={color} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />}
        </svg>
      </div>
    </div>
  )
}

/* ───────────────────────── Notes ───────────────────────── */
const NOTE_COLORS = ['#FFF4B8', '#DCE8FF', '#DFF5E3', '#FDE2E2', '#EDE4FF']

export function NotesTab() {
  const { isAgent } = useDesk()
  const notes = useCollection<any>('zoom.notes')
  const [q, setQ] = useState('')
  const list = notes.filter((n) => (n.text ?? '').toLowerCase().includes(q.toLowerCase())).sort((a, b) => +new Date(b.updated) - +new Date(a.updated))
  return (
    <div className="flex-1 min-w-0 overflow-auto p-6" data-agent="zoom-notes">
      <div className="flex items-center gap-3 mb-5">
        <h1 className="text-[20px] font-bold flex-1">Notes</h1>
        <div className="flex items-center h-8 w-[220px] rounded-[8px] border border-[#D5D7E0] px-3 gap-2 text-[#6E7680]"><Search size={14} /><input aria-label="Search notes" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search notes" className="flex-1 outline-none text-[13px] text-[#131619] bg-transparent" /></div>
        <button data-agent="zoom-note-new" onClick={() => db.insert('zoom.notes', { id: uid('zn'), text: '', color: NOTE_COLORS[notes.length % NOTE_COLORS.length], updated: new Date().toISOString(), createdBy: isAgent ? 'hworker' : undefined }, { prepend: true })} className="h-9 px-4 rounded-[8px] bg-[#0B5CFF] text-white text-[13.5px] font-semibold flex items-center gap-1.5"><StickyNote size={15} /> New note</button>
      </div>
      {!list.length && <div className="py-20 text-center text-[13px] text-[#6E7680]">{notes.length ? 'No notes match.' : 'Capture quick thoughts — they sync across your Zoom devices.'}</div>}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
        {list.map((n) => (
          <div key={n.id} className="group rounded-[12px] p-3 flex flex-col min-h-[170px] shadow-sm" style={{ background: n.color }}>
            <textarea aria-label="Note" autoFocus={!n.text} value={n.text} onChange={(e) => db.update('zoom.notes', n.id, { text: e.target.value, updated: new Date().toISOString() })} placeholder="Write a note…" className="flex-1 bg-transparent outline-none resize-none text-[14px] leading-[1.5]" />
            <div className="flex items-center gap-1 pt-2">
              {NOTE_COLORS.map((c) => <button key={c} aria-label="Note colour" onClick={() => db.update('zoom.notes', n.id, { color: c })} className={`w-4 h-4 rounded-full border ${n.color === c ? 'border-[#131619]' : 'border-black/10'}`} style={{ background: c }} />)}
              <span className="flex-1 text-right text-[11px] text-[#6E7680]">{new Date(n.updated).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              <button aria-label="Delete note" onClick={() => db.remove('zoom.notes', n.id)} className="ml-1 opacity-0 group-hover:opacity-100 text-[#6E7680] hover:text-[#E02828]"><Trash2 size={13} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ───────────────────────── Apps ───────────────────────── */
const APPS: [string, string, string, string][] = [
  ['salesforce', 'Salesforce for Zoom', 'Log meetings and calls to Salesforce records automatically.', '#00A1E0'],
  ['hubspot', 'HubSpot', 'Sync Zoom meetings and webinar attendees to HubSpot contacts.', '#FF7A59'],
  ['slack', 'Slack', 'Start Zoom meetings from Slack with /zoom.', '#4A154B'],
  ['outlook', 'Microsoft Outlook', 'Schedule Zoom meetings directly from Outlook.', '#0F6CBD'],
  ['docusign', 'Docusign', 'Send agreements for signature during a meeting.', '#4C00FF'],
  ['jira', 'Jira Cloud', 'Create and update Jira issues while you meet.', '#0052CC'],
  ['miro', 'Miro', 'Collaborate on Miro boards together in meetings.', '#FFD02F'],
  ['otter', 'Polls & Quizzes', 'Run live polls and quizzes with participants.', '#00A35C'],
]

export function AppsTab() {
  const { toast } = useZoom()
  const [prefs, setPrefs] = usePrefs()
  const [q, setQ] = useState('')
  const added = prefs.apps ?? []
  const list = APPS.filter(([, n, d]) => `${n} ${d}`.toLowerCase().includes(q.toLowerCase()))
  return (
    <div className="flex-1 min-w-0 overflow-auto p-6" data-agent="zoom-apps">
      <div className="flex items-center gap-3 mb-5">
        <h1 className="text-[20px] font-bold flex-1">Apps</h1>
        <div className="flex items-center h-8 w-[260px] rounded-[8px] border border-[#D5D7E0] px-3 gap-2 text-[#6E7680]"><Search size={14} /><input aria-label="Search the App Marketplace" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the App Marketplace" className="flex-1 outline-none text-[13px] text-[#131619] bg-transparent" /></div>
      </div>
      <div className="text-[13px] text-[#6E7680] mb-3">{added.length} added · {APPS.length - added.length} available</div>
      <div className="grid grid-cols-2 gap-3">
        {list.map(([id, n, d, c]) => {
          const on = added.includes(id)
          return (
            <div key={id} className="rounded-[12px] border border-[#E4E4ED] p-4 flex items-start gap-3">
              <span className="w-10 h-10 rounded-[10px] flex items-center justify-center text-white shrink-0" style={{ background: c }}><LayoutGrid size={18} /></span>
              <div className="flex-1 min-w-0"><div className="text-[14px] font-semibold">{n}</div><div className="text-[12.5px] text-[#6E7680] leading-[1.45]">{d}</div></div>
              <button data-agent={`zoom-app-${id}`} onClick={() => { setPrefs({ apps: on ? added.filter((x) => x !== id) : [...added, id] }); toast(on ? `${n} removed` : `${n} added to your Zoom account`) }} className={on ? 'h-8 px-3 rounded-[8px] border border-[#D5D7E0] text-[12.5px] font-medium' : 'h-8 px-3 rounded-[8px] bg-[#0B5CFF] text-white text-[12.5px] font-semibold'}>{on ? 'Remove' : 'Add'}</button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
