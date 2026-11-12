import { useRef, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { db } from '@/db/db'

export type Sticky = { id: string; x: number; y: number; text: string; color: string }
const COLORS = ['#FFF0B3', '#BAF3DB', '#CFE1FD', '#FFD5D2', '#EED7FC']

/** Minimal Confluence whiteboard: sticky notes you can add, drag, edit, recolor and delete (persisted on the page). */
export function Whiteboard({ pageId, stickies }: { pageId: string; stickies: Sticky[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState<{ id: string; dx: number; dy: number } | null>(null)
  const [pos, setPos] = useState<{ id: string; x: number; y: number } | null>(null)
  const save = (next: Sticky[]) => db.update('confluence.pages', pageId, { stickies: next, updated: new Date().toISOString() })
  const add = (x = 40 + stickies.length * 24, y = 40 + stickies.length * 18) => save([...stickies, { id: `st-${Date.now()}`, x, y, text: '', color: COLORS[stickies.length % COLORS.length] }])
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="h-11 shrink-0 flex items-center gap-2 px-4 border-b border-[#0B120E24]">
        <button onClick={() => add()} className="h-8 px-3 rounded-[4px] bg-[#0515240F] hover:bg-[#0B120E24] text-[14px] font-medium flex items-center gap-1.5"><Plus size={14} /> Sticky note</button>
        <span className="text-[13px] text-[#6B6E76]">Double-click the canvas to add a note · drag notes to move them</span>
      </div>
      <div
        ref={ref}
        className="flex-1 relative overflow-auto"
        style={{ backgroundImage: 'radial-gradient(#DCDFE4 1px, transparent 1px)', backgroundSize: '20px 20px' }}
        onDoubleClick={(e) => {
          if (e.target !== e.currentTarget) return
          const r = e.currentTarget.getBoundingClientRect()
          add(e.clientX - r.left + e.currentTarget.scrollLeft - 80, e.clientY - r.top + e.currentTarget.scrollTop - 50)
        }}
        onMouseMove={(e) => {
          if (!drag || !ref.current) return
          const r = ref.current.getBoundingClientRect()
          setPos({ id: drag.id, x: Math.max(0, e.clientX - r.left + ref.current.scrollLeft - drag.dx), y: Math.max(0, e.clientY - r.top + ref.current.scrollTop - drag.dy) })
        }}
        onMouseUp={() => {
          if (drag && pos) save(stickies.map((s) => (s.id === pos.id ? { ...s, x: pos.x, y: pos.y } : s)))
          setDrag(null)
          setPos(null)
        }}
        data-agent="conf-whiteboard"
      >
        <div style={{ width: 2000, height: 1400 }} />
        {stickies.map((s) => {
          const p = pos?.id === s.id ? pos : s
          return (
            <div key={s.id} className="absolute w-[180px] rounded-[4px] shadow-[0_2px_6px_rgba(0,0,0,0.15)] group" style={{ left: p.x, top: p.y, background: s.color }}>
              <div
                className="h-5 cursor-move flex items-center justify-end gap-1 px-1"
                onMouseDown={(e) => {
                  const r = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect()
                  setDrag({ id: s.id, dx: e.clientX - r.left, dy: e.clientY - r.top })
                }}
              >
                {COLORS.map((c) => <button key={c} aria-label="Change color" onMouseDown={(e) => e.stopPropagation()} onClick={() => save(stickies.map((x) => (x.id === s.id ? { ...x, color: c } : x)))} className="w-3 h-3 rounded-full border border-black/10 opacity-0 group-hover:opacity-100" style={{ background: c }} />)}
                <button aria-label="Delete sticky note" onMouseDown={(e) => e.stopPropagation()} onClick={() => save(stickies.filter((x) => x.id !== s.id))} className="w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 text-[#505258]"><Trash2 size={11} /></button>
              </div>
              <textarea
                defaultValue={s.text}
                onBlur={(e) => e.target.value !== s.text && save(stickies.map((x) => (x.id === s.id ? { ...x, text: e.target.value } : x)))}
                placeholder="Type something…"
                rows={4}
                className="w-full px-2 pb-2 bg-transparent text-[14px] outline-none resize-none placeholder:text-black/30"
                aria-label="Sticky note text"
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
