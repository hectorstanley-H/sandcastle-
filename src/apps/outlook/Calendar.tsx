import { useEffect, useMemo, useState } from 'react'
import {
  CalendarAdd20Regular,
  ChevronLeft20Regular,
  ChevronRight20Regular,
  ChevronDown16Regular,
  Video20Regular,
  Location20Regular,
  People20Regular,
  Dismiss20Regular,
  Delete20Regular,
  Send20Regular,
  CalendarToday20Regular,
  Share20Regular,
  Print20Regular,
  Clock20Regular,
} from '@fluentui/react-icons'
import { db, uid, useCollection, type Rec } from '@/db/db'
import { useDesk } from '@/os/context'
import { Avatar } from '@/components/Avatar'
import { ME, personByEmail } from '@/data/people'
import { isoDate } from '@/data/time'
import { logoUrl } from '@/os/registry'
import { RecipientInput } from './RecipientInput'

export interface CalEvent extends Rec {
  title: string
  start: string
  end: string
  location?: string
  organizer: string
  attendees: string[]
  teams?: boolean
  category?: string
  body?: string
  showAs?: string
  createdBy?: string
}

const CAT: Record<string, [string, string]> = {
  Blue: ['#DEECF9', '#0F6CBD'],
  Green: ['#DFF6DD', '#107C10'],
  Yellow: ['#FFF4CE', '#C19C00'],
  Orange: ['#FED9CC', '#DA3B01'],
  Purple: ['#EFE0F7', '#8764B8'],
  Red: ['#FDE7E9', '#C50F1F'],
  Gray: ['#F3F2F1', '#8A8886'],
  HWorker: ['#F1ECF9', '#430693'],
}

const HOUR_H = 48
const START_H = 7
const END_H = 20

const startOfWeek = (d: Date) => {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  x.setDate(x.getDate() - x.getDay())
  return x
}

export const TIME_OPTIONS = Array.from({ length: (21 - 7) * 2 }, (_, i) => {
  const h = 7 + Math.floor(i / 2)
  const m = i % 2 ? 30 : 0
  const value = `${String(h).padStart(2, '0')}:${m ? '30' : '00'}`
  const label = new Date(2000, 0, 1, h, m).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  return { value, label }
})

interface Draft {
  title: string
  attendees: string[]
  date: string
  start: string
  end: string
  location: string
  teams: boolean
  body: string
}

function EventEditor({ draft, onChange, onClose }: { draft: Draft; onChange: (d: Draft) => void; onClose: () => void }) {
  const { isAgent } = useDesk()
  const save = () => {
    const [sh, sm] = draft.start.split(':').map(Number)
    const [eh, em] = draft.end.split(':').map(Number)
    const [y, mo, d] = draft.date.split('-').map(Number)
    const start = new Date(y, mo - 1, d, sh, sm).toISOString()
    const end = new Date(y, mo - 1, d, eh, em).toISOString()
    const id = uid('ev')
    db.insert('outlook.events', {
      id,
      title: draft.title || 'Untitled event',
      start,
      end,
      location: draft.teams ? 'Microsoft Teams Meeting' : draft.location,
      organizer: ME.email,
      attendees: draft.attendees,
      teams: draft.teams,
      body: draft.body,
      showAs: 'busy',
      category: isAgent ? 'HWorker' : 'Blue',
      createdBy: isAgent ? 'hworker' : undefined,
    })
    if (draft.attendees.length) {
      db.insert(
        'outlook.emails',
        {
          id: uid('em'),
          folder: 'sent',
          from: { name: ME.name, email: ME.email },
          to: draft.attendees,
          subject: draft.title || 'Untitled event',
          body: `${new Date(start).toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })} – ${new Date(end).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}\n${draft.teams ? 'Microsoft Teams meeting\nJoin: https://teams.microsoft.com/l/meetup-join/19%3ameeting' : draft.location}\n\n${draft.body}`,
          date: new Date().toISOString(),
          read: true,
          sentBy: isAgent ? 'hworker' : undefined,
          invite: id,
        },
        { prepend: true },
      )
    }
    onClose()
  }
  return (
    <div className="absolute inset-0 z-40 flex items-start justify-center pt-6 bg-black/20" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-[720px] max-h-[calc(100%-48px)] overflow-auto bg-white rounded-lg shadow-[0_16px_48px_rgba(0,0,0,0.28)]" data-agent="outlook-event-editor">
        <div className="flex items-center gap-1 px-3 h-12 border-b border-[#EDEBE9]">
          <button data-agent="outlook-event-save" onClick={save} className="flex items-center gap-1.5 h-8 px-3 rounded bg-[#0F6CBD] hover:bg-[#115EA3] text-white text-[13px] font-semibold">
            {draft.attendees.length ? <Send20Regular /> : null} {draft.attendees.length ? 'Send' : 'Save'}
          </button>
          <button className="flex items-center gap-1 h-8 px-2 rounded hover:bg-[#F0F0F0] text-[13px]" onClick={onClose}>
            <Delete20Regular /> Discard
          </button>
          <span className="w-px h-5 bg-[#E1DFDD] mx-1" />
          <button className="flex items-center gap-1 h-8 px-2 rounded hover:bg-[#F0F0F0] text-[13px]"><Clock20Regular className="text-[#0F6CBD]" /> Busy <ChevronDown16Regular /></button>
          <button className="flex items-center gap-1 h-8 px-2 rounded hover:bg-[#F0F0F0] text-[13px]">Reminder: 15 minutes <ChevronDown16Regular /></button>
          <div className="flex-1" />
          <button className="w-8 h-8 rounded hover:bg-[#F0F0F0] flex items-center justify-center" onClick={onClose}><Dismiss20Regular /></button>
        </div>
        <div className="p-5 space-y-3">
          <input
            data-agent="outlook-event-title"
            aria-label="Event title"
            value={draft.title}
            onChange={(e) => onChange({ ...draft, title: e.target.value })}
            placeholder="Add a title"
            className="w-full h-11 text-[20px] outline-none border-b-2 border-[#E1DFDD] focus:border-[#0F6CBD]"
          />
          <div className="flex items-start gap-3">
            <People20Regular className="mt-1.5 text-[#616161]" />
            <div className="flex-1 border-b border-[#EDEBE9]">
              <RecipientInput value={draft.attendees} onChange={(attendees) => onChange({ ...draft, attendees })} agent="outlook-event-attendees" placeholder="Invite required attendees" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Clock20Regular className="text-[#616161]" />
            <input type="date" data-agent="outlook-event-date" aria-label="Date" value={draft.date} onChange={(e) => onChange({ ...draft, date: e.target.value })} className="h-8 px-2 rounded border border-[#D1D1D1] text-[13px]" />
            <select data-agent="outlook-event-start" aria-label="Start time" value={draft.start} onChange={(e) => onChange({ ...draft, start: e.target.value })} className="h-8 px-2 rounded border border-[#D1D1D1] text-[13px] bg-white">
              {TIME_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <span className="text-[13px] text-[#616161]">to</span>
            <select data-agent="outlook-event-end" aria-label="End time" value={draft.end} onChange={(e) => onChange({ ...draft, end: e.target.value })} className="h-8 px-2 rounded border border-[#D1D1D1] text-[13px] bg-white">
              {TIME_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <label className="flex items-center gap-2 text-[13px] ml-2"><input type="checkbox" className="accent-[#0F6CBD]" /> All day</label>
          </div>
          <div className="flex items-center gap-3">
            <img src={logoUrl('teams')} className="w-5 h-5" alt="" />
            <button
              role="checkbox"
              aria-checked={draft.teams}
              data-agent="outlook-event-teams"
              onClick={() => onChange({ ...draft, teams: !draft.teams })}
              className={`relative w-10 h-5 rounded-full transition-colors ${draft.teams ? 'bg-[#0F6CBD]' : 'bg-white border border-[#616161]'}`}
            >
              <span className={`absolute top-[3px] w-3.5 h-3.5 rounded-full transition-all ${draft.teams ? 'left-[22px] bg-white' : 'left-[3px] bg-[#616161]'}`} />
            </button>
            <span className="text-[13px]">Teams meeting</span>
          </div>
          {!draft.teams && (
            <div className="flex items-center gap-3">
              <Location20Regular className="text-[#616161]" />
              <input data-agent="outlook-event-location" aria-label="Location" value={draft.location} onChange={(e) => onChange({ ...draft, location: e.target.value })} placeholder="Add a room or location" className="flex-1 h-8 outline-none border-b border-[#EDEBE9] text-[13px]" />
            </div>
          )}
          <textarea
            data-agent="outlook-event-body"
            aria-label="Event description"
            value={draft.body}
            onChange={(e) => onChange({ ...draft, body: e.target.value })}
            placeholder="Add a description or attach documents"
            className="w-full h-40 resize-none outline-none rounded border border-[#EDEBE9] p-3 text-[13.5px] leading-relaxed"
          />
        </div>
      </div>
    </div>
  )
}

function EventPopover({ ev, onClose }: { ev: CalEvent; onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-30" onMouseDown={onClose}>
      <div className="absolute right-6 top-24 w-[380px] bg-white rounded-lg shadow-[0_8px_32px_rgba(0,0,0,0.24)] p-5" onMouseDown={(e) => e.stopPropagation()} data-agent="outlook-event-details">
        <div className="flex items-start gap-2">
          <span className="w-1 self-stretch rounded" style={{ background: CAT[ev.category ?? 'Blue']?.[1] }} />
          <div className="flex-1">
            <div className="text-[18px] font-semibold leading-snug">{ev.title}</div>
            <div className="text-[13px] text-[#616161] mt-1">
              {new Date(ev.start).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} ·{' '}
              {new Date(ev.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} – {new Date(ev.end).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </div>
          </div>
          <button className="w-7 h-7 rounded hover:bg-[#F0F0F0] flex items-center justify-center" onClick={onClose}><Dismiss20Regular /></button>
        </div>
        {ev.createdBy === 'hworker' && (
          <div className="mt-3 inline-flex items-center gap-1.5 h-6 pl-1 pr-2.5 rounded-full text-[11.5px] text-white" style={{ background: '#430693' }}>
            <img src={logoUrl('hworker')} className="w-4 h-4 rounded-full" alt="" /> Scheduled by H-Worker
          </div>
        )}
        {ev.teams && (
          <button className="mt-4 h-8 px-4 rounded bg-[#5B5FC7] text-white text-[13px] font-semibold flex items-center gap-2"><Video20Regular /> Join</button>
        )}
        {ev.location && !ev.teams && <div className="mt-3 flex items-center gap-2 text-[13px]"><Location20Regular /> {ev.location}</div>}
        <div className="mt-4 text-[12px] font-semibold text-[#616161]">{ev.attendees.length + 1} attendees</div>
        <div className="mt-2 space-y-1.5 max-h-40 overflow-auto">
          {[ev.organizer, ...ev.attendees.filter((a) => a !== ev.organizer)].slice(0, 8).map((a) => (
            <div key={a} className="flex items-center gap-2 text-[13px]">
              <Avatar email={a} name={personByEmail(a)?.name ?? a} size={24} />
              <span className="flex-1 truncate">{personByEmail(a)?.name ?? a}</span>
              {a === ev.organizer && <span className="text-[11px] text-[#616161]">Organizer</span>}
            </div>
          ))}
        </div>
        {ev.body && <div className="mt-3 pt-3 border-t border-[#EDEBE9] text-[12.5px] text-[#424242] whitespace-pre-wrap max-h-32 overflow-auto">{ev.body}</div>}
        <div className="mt-4 flex gap-2">
          <button className="h-8 px-3 rounded border border-[#D1D1D1] text-[13px] hover:bg-[#F5F5F5]" onClick={() => { db.remove('outlook.events', ev.id); onClose() }}>Delete</button>
        </div>
      </div>
    </div>
  )
}

function MiniMonth({ anchor, onPick }: { anchor: Date; onPick: (d: Date) => void }) {
  const [month, setMonth] = useState(new Date(anchor.getFullYear(), anchor.getMonth(), 1))
  const start = startOfWeek(month)
  const days = Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i))
  const today = new Date().toDateString()
  return (
    <div className="px-3 py-2 select-none">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[13px] font-semibold">{month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
        <div className="flex">
          <button className="w-6 h-6 rounded hover:bg-[#E9E9E9] flex items-center justify-center" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft20Regular className="w-4 h-4" /></button>
          <button className="w-6 h-6 rounded hover:bg-[#E9E9E9] flex items-center justify-center" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight20Regular className="w-4 h-4" /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 text-center text-[11px] text-[#616161]">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i} className="h-6 leading-6">{d}</div>)}
        {days.map((d) => (
          <button
            key={d.toISOString()}
            onClick={() => onPick(d)}
            className={`h-7 w-7 mx-auto rounded-full text-[12px] ${d.toDateString() === today ? 'bg-[#0F6CBD] text-white font-semibold' : d.getMonth() !== month.getMonth() ? 'text-[#A19F9D] hover:bg-[#E9E9E9]' : 'text-[#242424] hover:bg-[#E9E9E9]'}`}
          >
            {d.getDate()}
          </button>
        ))}
      </div>
    </div>
  )
}

export function CalendarView({ params, nonce }: { params: any; nonce: number }) {
  const events = useCollection<CalEvent>('outlook.events')
  const [anchor, setAnchor] = useState(() => new Date())
  const [mode, setMode] = useState<'day' | 'workweek' | 'week' | 'month'>('workweek')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [openEv, setOpenEv] = useState<CalEvent | null>(null)
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (params?.eventId) {
      const e = db.find<CalEvent>('outlook.events', params.eventId)
      if (e) {
        setAnchor(new Date(e.start))
        setOpenEv(e)
      }
    }
    if (params?.date) setAnchor(new Date(params.date))
    if (params?.newEvent) newEvent(params.newEvent)
  }, [nonce])

  const newEvent = (prefill?: Partial<Draft>) =>
    setDraft({ title: '', attendees: [], date: isoDate(new Date()), start: '10:00', end: '10:30', location: '', teams: true, body: '', ...prefill })

  const days = useMemo(() => {
    const s = startOfWeek(anchor)
    if (mode === 'day') return [new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate())]
    if (mode === 'workweek') return Array.from({ length: 5 }, (_, i) => new Date(s.getFullYear(), s.getMonth(), s.getDate() + 1 + i))
    return Array.from({ length: 7 }, (_, i) => new Date(s.getFullYear(), s.getMonth(), s.getDate() + i))
  }, [anchor, mode])

  const shift = (dir: number) => {
    const n = new Date(anchor)
    if (mode === 'day') n.setDate(n.getDate() + dir)
    else if (mode === 'month') n.setMonth(n.getMonth() + dir)
    else n.setDate(n.getDate() + 7 * dir)
    setAnchor(n)
  }

  const label = mode === 'day' ? anchor.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : `${days[0].toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} – ${days[days.length - 1].toLocaleDateString('en-US', { day: 'numeric', year: 'numeric' })}`

  return (
    <div className="relative flex-1 min-h-0 flex flex-col">
      <div className="shrink-0 mx-2 mt-1 mb-1 bg-white rounded-lg shadow-[0_0_2px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.14)]">
        <div className="flex items-center gap-4 px-3 h-9 text-[13px]">
          {['Home', 'View', 'Help'].map((t, i) => (
            <button key={t} className={`h-full relative ${i === 0 ? 'font-semibold' : 'text-[#424242]'}`}>
              {t}
              {i === 0 && <span className="absolute left-0 right-0 bottom-0 h-[3px] rounded-full bg-[#0F6CBD]" />}
            </button>
          ))}
        </div>
        <div className="flex items-center px-2 h-11 border-t border-[#F0F0F0] gap-1">
          <div className="flex items-center h-8 rounded bg-[#0F6CBD] text-white mr-1.5 overflow-hidden">
            <button data-agent="outlook-new-event" onClick={() => newEvent()} className="flex items-center gap-1.5 h-full pl-2.5 pr-3 hover:bg-[#115EA3] text-[13px] font-semibold">
              <CalendarAdd20Regular /> New event
            </button>
            <span className="w-px h-5 bg-white/30" />
            <button className="h-full px-1.5 hover:bg-[#115EA3]"><ChevronDown16Regular /></button>
          </div>
          {(['day', 'workweek', 'week', 'month'] as const).map((m) => (
            <button key={m} data-agent={`outlook-cal-mode-${m}`} onClick={() => setMode(m)} className={`h-8 px-2.5 rounded text-[13px] ${mode === m ? 'bg-[#EBF3FC] text-[#0F6CBD] font-semibold' : 'hover:bg-[#F0F0F0]'}`}>
              {m === 'day' ? 'Day' : m === 'workweek' ? 'Work week' : m === 'week' ? 'Week' : 'Month'}
            </button>
          ))}
          <span className="w-px h-5 bg-[#E1DFDD] mx-1" />
          <button className="flex items-center gap-1.5 h-8 px-2 rounded hover:bg-[#F0F0F0] text-[13px]"><Share20Regular className="text-[#0F6CBD]" /> Share</button>
          <button className="flex items-center gap-1.5 h-8 px-2 rounded hover:bg-[#F0F0F0] text-[13px]"><Print20Regular className="text-[#0F6CBD]" /> Print</button>
        </div>
      </div>
      <div className="flex-1 min-h-0 flex">
        <div className="w-[230px] shrink-0 overflow-auto">
          <MiniMonth anchor={anchor} onPick={(d) => setAnchor(d)} />
          <div className="px-3 mt-2 text-[13px]">
            <div className="flex items-center gap-1 h-8 font-semibold"><ChevronDown16Regular /> My calendars</div>
            {[['Calendar', '#0F6CBD'], ['United States holidays', '#107C10'], ['Birthdays', '#8764B8']].map(([n, c]) => (
              <label key={n} className="flex items-center gap-2 h-8 pl-5 hover:bg-[#E9E9E9] rounded">
                <span className="w-3.5 h-3.5 rounded-sm flex items-center justify-center text-white text-[10px]" style={{ background: c }}>✓</span> {n}
              </label>
            ))}
            <div className="flex items-center gap-1 h-8 font-semibold mt-2"><ChevronDown16Regular /> People’s calendars</div>
            {['Priya Raman', 'Ben Carter'].map((n) => (
              <label key={n} className="flex items-center gap-2 h-8 pl-5 hover:bg-[#E9E9E9] rounded">
                <span className="w-3.5 h-3.5 rounded-sm border border-[#616161]" /> {n}
              </label>
            ))}
          </div>
        </div>
        <div className="flex-1 min-w-0 flex flex-col m-2 ml-0 bg-white rounded-lg shadow-[0_0_2px_rgba(0,0,0,0.12),0_2px_4px_rgba(0,0,0,0.14)] overflow-hidden">
          <div className="flex items-center gap-2 px-4 h-12 border-b border-[#EDEBE9] shrink-0">
            <button data-agent="outlook-cal-today" onClick={() => setAnchor(new Date())} className="flex items-center gap-1.5 h-8 px-3 rounded border border-[#D1D1D1] text-[13px] hover:bg-[#F5F5F5]"><CalendarToday20Regular /> Today</button>
            <button data-agent="outlook-cal-prev" aria-label="Previous" onClick={() => shift(-1)} className="w-8 h-8 rounded hover:bg-[#F0F0F0] flex items-center justify-center"><ChevronLeft20Regular /></button>
            <button data-agent="outlook-cal-next" aria-label="Next" onClick={() => shift(1)} className="w-8 h-8 rounded hover:bg-[#F0F0F0] flex items-center justify-center"><ChevronRight20Regular /></button>
            <span className="text-[16px] font-semibold ml-1">{label}</span>
          </div>
          {mode === 'month' ? (
            <MonthGrid anchor={anchor} events={events} onOpen={setOpenEv} />
          ) : (
            <>
              <div className="flex shrink-0 border-b border-[#EDEBE9]" style={{ paddingLeft: 56 }}>
                {days.map((d) => {
                  const isToday = d.toDateString() === now.toDateString()
                  return (
                    <div key={d.toISOString()} className="flex-1 px-2 py-1.5 border-l border-[#EDEBE9]">
                      <div className={`text-[20px] leading-tight ${isToday ? 'text-[#0F6CBD] font-semibold' : 'text-[#242424]'}`}>{d.getDate()}</div>
                      <div className={`text-[12px] ${isToday ? 'text-[#0F6CBD]' : 'text-[#616161]'}`}>{d.toLocaleDateString('en-US', { weekday: 'long' })}</div>
                    </div>
                  )
                })}
              </div>
              <div className="flex-1 overflow-auto" ref={(el) => { if (el && !el.dataset.init) { el.dataset.init = '1'; el.scrollTop = HOUR_H * 1.5 } }}>
                <div className="relative flex" style={{ height: (END_H - START_H) * HOUR_H }}>
                  <div className="w-14 shrink-0">
                    {Array.from({ length: END_H - START_H }, (_, i) => (
                      <div key={i} className="text-[11px] text-[#616161] text-right pr-2 -mt-1.5" style={{ height: HOUR_H }}>
                        {new Date(2000, 0, 1, START_H + i).toLocaleTimeString('en-US', { hour: 'numeric' })}
                      </div>
                    ))}
                  </div>
                  {days.map((d) => {
                    const dayEvents = events.filter((e) => new Date(e.start).toDateString() === d.toDateString())
                    const isToday = d.toDateString() === now.toDateString()
                    return (
                      <div
                        key={d.toISOString()}
                        className="relative flex-1 border-l border-[#EDEBE9]"
                        onDoubleClick={(e) => {
                          const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
                          const scale = r.height / (e.currentTarget as HTMLElement).offsetHeight || 1
                          const h = START_H + Math.floor(((e.clientY - r.top) / scale / HOUR_H) * 2) / 2
                          const v = (x: number) => `${String(Math.floor(x)).padStart(2, '0')}:${x % 1 ? '30' : '00'}`
                          newEvent({ date: isoDate(d), start: v(h), end: v(h + 0.5) })
                        }}
                      >
                        {Array.from({ length: END_H - START_H }, (_, i) => (
                          <div key={i} className="border-b border-[#F3F2F1]" style={{ height: HOUR_H }}>
                            <div className="h-1/2 border-b border-dashed border-[#F8F8F8]" />
                          </div>
                        ))}
                        {isToday && (
                          <div className="absolute left-0 right-0 z-10 flex items-center pointer-events-none" style={{ top: (now.getHours() + now.getMinutes() / 60 - START_H) * HOUR_H }}>
                            <span className="w-2 h-2 -ml-1 rounded-full bg-[#C50F1F]" />
                            <span className="flex-1 h-[2px] bg-[#C50F1F]" />
                          </div>
                        )}
                        {dayEvents.map((e) => {
                          const s = new Date(e.start)
                          const en = new Date(e.end)
                          const top = (s.getHours() + s.getMinutes() / 60 - START_H) * HOUR_H
                          const h = Math.max(20, ((+en - +s) / 3600000) * HOUR_H - 2)
                          const [bg, fg] = CAT[e.category ?? 'Blue'] ?? CAT.Blue
                          return (
                            <button
                              key={e.id}
                              data-agent={`outlook-event-${e.id}`}
                              onClick={() => setOpenEv(e)}
                              className={`absolute left-1 right-1.5 rounded px-1.5 py-0.5 text-left overflow-hidden ${e.createdBy === 'hworker' && Date.now() - +new Date(e.start) < 864e5 * 30 ? 'ring-1 ring-[#430693]/30' : ''}`}
                              style={{ top, height: h, background: bg, borderLeft: `3px solid ${fg}`, opacity: e.showAs === 'free' ? 0.7 : 1 }}
                            >
                              <div className="text-[12px] font-semibold text-[#242424] truncate flex items-center gap-1">
                                {e.createdBy === 'hworker' && <img src={logoUrl('hworker')} className="w-3 h-3 rounded-sm" alt="" />}
                                {e.title}
                              </div>
                              {h > 30 && <div className="text-[11px] text-[#424242] truncate">{e.teams ? 'Microsoft Teams Meeting' : e.location}</div>}
                            </button>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      {draft && <EventEditor draft={draft} onChange={setDraft} onClose={() => setDraft(null)} />}
      {openEv && <EventPopover ev={openEv} onClose={() => setOpenEv(null)} />}
    </div>
  )
}

function MonthGrid({ anchor, events, onOpen }: { anchor: Date; events: CalEvent[]; onOpen: (e: CalEvent) => void }) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  const start = startOfWeek(first)
  const days = Array.from({ length: 35 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i))
  return (
    <div className="flex-1 grid grid-cols-7 grid-rows-[auto_repeat(5,1fr)] min-h-0">
      {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((d) => (
        <div key={d} className="px-2 py-1 text-[12px] text-[#616161] border-b border-[#EDEBE9]">{d}</div>
      ))}
      {days.map((d) => (
        <div key={d.toISOString()} className="border-b border-l border-[#EDEBE9] p-1 overflow-hidden">
          <div className={`text-[12px] mb-0.5 ${d.toDateString() === new Date().toDateString() ? 'text-[#0F6CBD] font-semibold' : d.getMonth() !== anchor.getMonth() ? 'text-[#A19F9D]' : ''}`}>{d.getDate()}</div>
          {events
            .filter((e) => new Date(e.start).toDateString() === d.toDateString())
            .slice(0, 3)
            .map((e) => (
              <button key={e.id} onClick={() => onOpen(e)} className="w-full text-left text-[11px] truncate px-1 rounded mb-0.5" style={{ background: (CAT[e.category ?? 'Blue'] ?? CAT.Blue)[0] }}>
                {new Date(e.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} {e.title}
              </button>
            ))}
        </div>
      ))}
    </div>
  )
}
