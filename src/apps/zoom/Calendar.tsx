import { useState } from 'react'
import { CalendarPlus, ChevronLeft, ChevronRight, Video } from 'lucide-react'
import { useCollection } from '@/db/db'
import { fmtT, useZoom } from './shared'

const H0 = 7
const H1 = 20
const ROW = 44

const startOfWeek = (d: Date) => {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7))
  return x
}

export function CalendarTab() {
  const { openMeeting, schedule } = useZoom()
  const meetings = useCollection<any>('zoom.meetings')
  const events = useCollection<any>('outlook.events')
  const [mode, setMode] = useState<'day' | 'week'>('week')
  const [anchor, setAnchor] = useState(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  })
  const days = mode === 'day' ? [anchor] : Array.from({ length: 5 }).map((_, i) => new Date(+startOfWeek(anchor) + i * 86400000))
  const shift = (n: number) => setAnchor((a) => new Date(+a + n * (mode === 'day' ? 1 : 7) * 86400000))
  const items = [
    ...meetings.map((m) => ({ id: m.id, title: m.topic, start: new Date(m.start), mins: m.durationMins, zoom: true, hw: m.createdBy === 'hworker' })),
    ...events.filter((e) => e.start && e.end).map((e) => ({ id: e.id, title: e.title, start: new Date(e.start), mins: Math.max(15, (+new Date(e.end) - +new Date(e.start)) / 60000), zoom: false, hw: false })),
  ]
  const label = mode === 'day' ? anchor.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : `${days[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${days[4].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
  const now = new Date()
  return (
    <div className="flex-1 min-w-0 flex flex-col" data-agent="zoom-calendar">
      <div className="h-14 shrink-0 px-6 flex items-center gap-3 border-b border-[#E4E4ED]">
        <button data-agent="zoom-cal-today" onClick={() => { const d = new Date(); d.setHours(0, 0, 0, 0); setAnchor(d) }} className="h-8 px-3 rounded-[8px] border border-[#D5D7E0] text-[13px] font-medium">Today</button>
        <button data-agent="zoom-cal-prev" aria-label="Previous" onClick={() => shift(-1)} className="w-8 h-8 rounded-full hover:bg-[#ECECF2] flex items-center justify-center"><ChevronLeft size={16} /></button>
        <button data-agent="zoom-cal-next" aria-label="Next" onClick={() => shift(1)} className="w-8 h-8 rounded-full hover:bg-[#ECECF2] flex items-center justify-center"><ChevronRight size={16} /></button>
        <span className="text-[17px] font-bold">{label}</span>
        <div className="flex-1" />
        <div className="flex p-0.5 rounded-[8px] bg-[#ECECF2] text-[13px] font-medium">
          {(['day', 'week'] as const).map((m) => <button key={m} onClick={() => setMode(m)} className={`h-7 px-3 rounded-[7px] ${mode === m ? 'bg-white shadow-sm' : 'text-[#6E7680]'}`}>{m === 'day' ? 'Day' : 'Work week'}</button>)}
        </div>
        <button data-agent="zoom-cal-schedule" onClick={() => schedule({ date: `${anchor.getFullYear()}-${String(anchor.getMonth() + 1).padStart(2, '0')}-${String(anchor.getDate()).padStart(2, '0')}` })} className="h-8 px-3 rounded-[8px] bg-[#0B5CFF] text-white text-[13px] font-semibold flex items-center gap-1.5"><CalendarPlus size={14} /> Schedule</button>
      </div>
      <div className="flex border-b border-[#E4E4ED] pl-14">
        {days.map((d) => {
          const today = d.toDateString() === now.toDateString()
          return (
            <div key={+d} className="flex-1 h-12 flex flex-col items-center justify-center">
              <span className={`text-[11px] uppercase ${today ? 'text-[#0B5CFF]' : 'text-[#6E7680]'}`}>{d.toLocaleDateString('en-US', { weekday: 'short' })}</span>
              <span className={`text-[16px] font-semibold w-7 h-7 rounded-full flex items-center justify-center ${today ? 'bg-[#0B5CFF] text-white' : ''}`}>{d.getDate()}</span>
            </div>
          )
        })}
      </div>
      <div className="flex-1 overflow-auto">
        <div className="relative flex" style={{ height: (H1 - H0) * ROW }}>
          <div className="w-14 shrink-0">
            {Array.from({ length: H1 - H0 }).map((_, i) => <div key={i} className="text-[11px] text-[#6E7680] text-right pr-2 -mt-1.5" style={{ height: ROW }}>{new Date(2000, 0, 1, H0 + i).toLocaleTimeString('en-US', { hour: 'numeric' })}</div>)}
          </div>
          {days.map((d) => {
            const list = items.filter((x) => x.start.toDateString() === d.toDateString())
            return (
              <div key={+d} className="flex-1 relative border-l border-[#F0F0F5]">
                {Array.from({ length: H1 - H0 }).map((_, i) => <div key={i} className="border-t border-[#F0F0F5]" style={{ height: ROW }} />)}
                {d.toDateString() === now.toDateString() && now.getHours() >= H0 && now.getHours() < H1 && <div className="absolute left-0 right-0 h-[2px] bg-[#E02828] z-10" style={{ top: (now.getHours() - H0 + now.getMinutes() / 60) * ROW }} />}
                {list.map((x) => {
                  const top = (x.start.getHours() - H0 + x.start.getMinutes() / 60) * ROW
                  if (top < 0 || top > (H1 - H0) * ROW) return null
                  const h = Math.max(20, (x.mins / 60) * ROW - 2)
                  return (
                    <button
                      key={x.id}
                      data-agent={x.zoom ? `zoom-cal-event-${x.id}` : undefined}
                      onClick={() => x.zoom && openMeeting(x.id)}
                      className={`absolute left-1 right-1 rounded-[6px] px-2 py-1 text-left overflow-hidden border-l-[3px] ${x.zoom ? 'bg-[#E8EFFF] border-[#0B5CFF] hover:bg-[#DCE8FF]' : 'bg-[#F1F3F7] border-[#9AA0A6] cursor-default'}`}
                      style={{ top, height: h }}
                      title={x.zoom ? 'Open meeting' : 'Outlook calendar event'}
                    >
                      <div className="text-[12px] font-semibold truncate flex items-center gap-1">{x.zoom && <Video size={11} className="text-[#0B5CFF] shrink-0" />}{x.title}</div>
                      {h > 30 && <div className="text-[11px] text-[#6E7680]">{fmtT(x.start.toISOString())}{x.hw ? ' · H-Worker' : ''}</div>}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
