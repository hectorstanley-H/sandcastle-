import { useEffect, useMemo, useState } from 'react'
import {
  CalendarAdd20Regular,
  ChevronLeft20Regular,
  ChevronRight20Regular,
  ChevronDown16Regular,
  ChevronRight16Regular,
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
  Edit20Regular,
  CalendarCheckmark20Regular,
  CalendarCancel20Regular,
  QuestionCircle20Regular,
  PersonFeedback20Regular,
  Alert20Regular,
} from '@fluentui/react-icons'
import { db, uid, useCollection, type Rec } from '@/db/db'
import { useDesk } from '@/os/context'
import { Avatar } from '@/components/Avatar'
import { ME, person, personByEmail } from '@/data/people'
import { isoDate } from '@/data/time'
import { logoUrl } from '@/os/registry'
import { RecipientInput } from './RecipientInput'
import { MenuItem, MenuPanel, useMenu } from './ui'

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
  allDay?: boolean
  reminder?: number
  response?: 'accepted' | 'tentative' | 'declined'
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

/** all-day or multi-day events go in the banner row */
const isBanner = (e: CalEvent) => !!e.allDay || +new Date(e.end) - +new Date(e.start) >= 20 * 3600000 || new Date(e.start).toDateString() !== new Date(new Date(e.end).getTime() - 1).toDateString()
const covers = (e: CalEvent, d: Date) => {
  const s = new Date(e.start)
  s.setHours(0, 0, 0, 0)
  const en = new Date(new Date(e.end).getTime() - 1)
  return d >= s && d <= en
}
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

const REMINDERS: [number, string][] = [
  [-1, 'Don’t remind me'],
  [0, 'At time of event'],
  [5, '5 minutes before'],
  [15, '15 minutes before'],
  [30, '30 minutes before'],
  [60, '1 hour before'],
  [1440, '1 day before'],
]
const reminderLabel = (m: number) => REMINDERS.find(([v]) => v === m)?.[1] ?? `${m} minutes before`

/** US federal holidays for a year (observed on the calendar date). */
function usHolidays(year: number): { date: Date; name: string }[] {
  const nth = (month: number, dow: number, n: number) => {
    const d = new Date(year, month, 1)
    const off = (dow - d.getDay() + 7) % 7
    return new Date(year, month, 1 + off + (n - 1) * 7)
  }
  const last = (month: number, dow: number) => {
    const d = new Date(year, month + 1, 0)
    return new Date(year, month, d.getDate() - ((d.getDay() - dow + 7) % 7))
  }
  return [
    { date: new Date(year, 0, 1), name: 'New Year’s Day' },
    { date: nth(0, 1, 3), name: 'Martin Luther King Jr. Day' },
    { date: nth(1, 1, 3), name: 'Presidents’ Day' },
    { date: last(4, 1), name: 'Memorial Day' },
    { date: new Date(year, 5, 19), name: 'Juneteenth' },
    { date: new Date(year, 6, 4), name: 'Independence Day' },
    { date: nth(8, 1, 1), name: 'Labor Day' },
    { date: nth(9, 1, 2), name: 'Columbus Day' },
    { date: new Date(year, 10, 11), name: 'Veterans Day' },
    { date: nth(10, 4, 4), name: 'Thanksgiving Day' },
    { date: new Date(year, 11, 25), name: 'Christmas Day' },
  ]
}
const holidaysOn = (d: Date) => usHolidays(d.getFullYear()).filter((h) => h.date.toDateString() === d.toDateString())

interface Draft {
  title: string
  attendees: string[]
  date: string
  start: string
  end: string
  location: string
  teams: boolean
  body: string
  showAs?: string
  allDay?: boolean
  endDate?: string
  reminder?: number
  /** set when editing an existing event */
  editId?: string
}

const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${d.getMinutes() >= 30 ? '30' : '00'}`

function EventEditor({ draft, onChange, onClose }: { draft: Draft; onChange: (d: Draft) => void; onClose: () => void }) {
  const { isAgent } = useDesk()
  const remMenu = useMenu()
  const save = () => {
    const [sh, sm] = draft.start.split(':').map(Number)
    const [eh, em] = draft.end.split(':').map(Number)
    const [y, mo, d] = draft.date.split('-').map(Number)
    let start = new Date(y, mo - 1, d, sh, sm).toISOString()
    let end = new Date(y, mo - 1, d, eh, em).toISOString()
    if (draft.allDay) {
      const [y2, mo2, d2] = (draft.endDate || draft.date).split('-').map(Number)
      start = new Date(y, mo - 1, d, 0, 0).toISOString()
      end = new Date(y2, mo2 - 1, d2, 23, 59).toISOString()
    }
    if (draft.editId) {
      const prev = db.find<CalEvent>('outlook.events', draft.editId)
      db.update('outlook.events', draft.editId, {
        title: draft.title || 'Untitled event',
        start,
        end,
        location: draft.teams ? 'Microsoft Teams Meeting' : draft.location,
        attendees: draft.attendees,
        teams: draft.teams,
        body: draft.body,
        showAs: draft.showAs ?? 'busy',
        allDay: !!draft.allDay,
        reminder: draft.reminder ?? 15,
        ...(prev && prev.category !== 'HWorker' && !isAgent ? { category: draft.showAs === 'oof' ? 'Purple' : prev.category ?? 'Blue' } : {}),
      })
      if (draft.attendees.length && prev?.organizer === ME.email) {
        db.insert(
          'outlook.emails',
          {
            id: uid('em'),
            folder: 'sent',
            from: { name: ME.name, email: ME.email },
            to: draft.attendees,
            subject: `Updated: ${draft.title || 'Untitled event'}`,
            body: `This meeting has been updated.\n\n${new Date(start).toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })} – ${new Date(end).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}\n${draft.teams ? 'Microsoft Teams meeting' : draft.location}\n\n${draft.body}`,
            date: new Date().toISOString(),
            read: true,
            sentBy: isAgent ? 'hworker' : undefined,
            invite: draft.editId,
          },
          { prepend: true },
        )
      }
      onClose()
      return
    }
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
      showAs: draft.showAs ?? 'busy',
      allDay: !!draft.allDay,
      category: isAgent ? 'HWorker' : draft.showAs === 'oof' ? 'Purple' : 'Blue',
      createdBy: isAgent ? 'hworker' : undefined,
      ...(draft.reminder !== undefined ? { reminder: draft.reminder } : {}),
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
  const rem = draft.reminder ?? 15
  return (
    <div className="absolute inset-0 z-40 flex items-start justify-center pt-6 bg-black/20" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-[720px] max-h-[calc(100%-48px)] overflow-auto bg-white rounded-lg shadow-[0_16px_48px_rgba(0,0,0,0.28)]" data-agent="outlook-event-editor">
        <div className="flex items-center gap-1 px-3 h-12 border-b border-[#EDEBE9]">
          <button data-agent="outlook-event-save" onClick={save} className="flex items-center gap-1.5 h-8 px-3 rounded bg-[#0F6CBD] hover:bg-[#115EA3] text-white text-[13px] font-semibold">
            {draft.attendees.length ? <Send20Regular /> : null} {draft.attendees.length ? (draft.editId ? 'Send update' : 'Send') : 'Save'}
          </button>
          <button className="flex items-center gap-1 h-8 px-2 rounded hover:bg-[#F0F0F0] text-[13px]" onClick={onClose}>
            <Delete20Regular /> Discard
          </button>
          <span className="w-px h-5 bg-[#E1DFDD] mx-1" />
          <label className="flex items-center gap-1 h-8 px-2 rounded hover:bg-[#F0F0F0] text-[13px]">
            <Clock20Regular className="text-[#0F6CBD]" />
            <select data-agent="outlook-event-showas" aria-label="Show as" value={draft.showAs ?? 'busy'} onChange={(e) => onChange({ ...draft, showAs: e.target.value })} className="bg-transparent outline-none text-[13px]">
              <option value="free">Free</option>
              <option value="tentative">Tentative</option>
              <option value="busy">Busy</option>
              <option value="oof">Out of office</option>
              <option value="elsewhere">Working elsewhere</option>
            </select>
          </label>
          <div className="relative" ref={remMenu.ref}>
            <button data-agent="outlook-event-reminder" className="flex items-center gap-1 h-8 px-2 rounded hover:bg-[#F0F0F0] text-[13px]" onClick={remMenu.toggle}>
              {rem < 0 ? 'No reminder' : `Reminder: ${rem === 0 ? 'at start' : rem >= 1440 ? '1 day' : rem >= 60 ? '1 hour' : `${rem} minutes`}`} <ChevronDown16Regular />
            </button>
            {remMenu.open && (
              <MenuPanel className="left-0 top-9 w-[200px]">
                {REMINDERS.map(([v, l]) => (
                  <MenuItem key={v} label={l} checked={rem === v} onClick={() => { onChange({ ...draft, reminder: v }); remMenu.close() }} />
                ))}
              </MenuPanel>
            )}
          </div>
          <div className="flex-1" />
          <button className="w-8 h-8 rounded hover:bg-[#F0F0F0] flex items-center justify-center" aria-label="Close" onClick={onClose}><Dismiss20Regular /></button>
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
            {!draft.allDay && <><select data-agent="outlook-event-start" aria-label="Start time" value={draft.start} onChange={(e) => onChange({ ...draft, start: e.target.value })} className="h-8 px-2 rounded border border-[#D1D1D1] text-[13px] bg-white">
              {TIME_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <span className="text-[13px] text-[#616161]">to</span>
            <select data-agent="outlook-event-end" aria-label="End time" value={draft.end} onChange={(e) => onChange({ ...draft, end: e.target.value })} className="h-8 px-2 rounded border border-[#D1D1D1] text-[13px] bg-white">
              {TIME_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select></>}
            <label className="flex items-center gap-2 text-[13px] ml-2"><input type="checkbox" data-agent="outlook-event-allday" aria-label="All day" checked={!!draft.allDay} onChange={(e) => onChange({ ...draft, allDay: e.target.checked, endDate: draft.endDate || draft.date })} className="accent-[#0F6CBD]" /> All day</label>
            {draft.allDay && (
              <>
                <span className="text-[13px] text-[#616161]">until</span>
                <input type="date" data-agent="outlook-event-end-date" aria-label="End date" value={draft.endDate || draft.date} onChange={(e) => onChange({ ...draft, endDate: e.target.value })} className="h-8 px-2 rounded border border-[#D1D1D1] text-[13px]" />
              </>
            )}
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

function respond(ev: CalEvent, response: 'accepted' | 'tentative' | 'declined', isAgent: boolean) {
  db.update('outlook.events', ev.id, { response })
  const word = response === 'accepted' ? 'Accepted' : response === 'tentative' ? 'Tentative' : 'Declined'
  db.insert(
    'outlook.emails',
    {
      id: uid('em'),
      folder: 'sent',
      from: { name: ME.name, email: ME.email },
      to: [ev.organizer],
      subject: `${word}: ${ev.title}`,
      body: `${ME.name} has ${response === 'tentative' ? 'tentatively accepted' : response} this meeting.\n\n${new Date(ev.start).toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`,
      date: new Date().toISOString(),
      read: true,
      sentBy: isAgent ? 'hworker' : undefined,
    },
    { prepend: true },
  )
  if (response === 'declined') db.remove('outlook.events', ev.id)
}

function EventPopover({ ev, onClose, onEdit }: { ev: CalEvent; onClose: () => void; onEdit: (ev: CalEvent) => void }) {
  const { open, isAgent } = useDesk()
  const mine = ev.organizer === ME.email || !ev.organizer
  const cancel = () => {
    if (mine && ev.attendees.length) {
      db.insert(
        'outlook.emails',
        {
          id: uid('em'),
          folder: 'sent',
          from: { name: ME.name, email: ME.email },
          to: ev.attendees,
          subject: `Canceled: ${ev.title}`,
          body: `This meeting has been canceled.\n\n${new Date(ev.start).toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`,
          date: new Date().toISOString(),
          read: true,
          sentBy: isAgent ? 'hworker' : undefined,
        },
        { prepend: true },
      )
    }
    db.remove('outlook.events', ev.id)
    onClose()
  }
  return (
    <div className="absolute inset-0 z-30" onMouseDown={onClose}>
      <div className="absolute right-6 top-24 w-[380px] bg-white rounded-lg shadow-[0_8px_32px_rgba(0,0,0,0.24)] p-5" onMouseDown={(e) => e.stopPropagation()} data-agent="outlook-event-details">
        <div className="flex items-start gap-2">
          <span className="w-1 self-stretch rounded" style={{ background: CAT[ev.category ?? 'Blue']?.[1] }} />
          <div className="flex-1">
            <div className="text-[18px] font-semibold leading-snug">{ev.title}</div>
            <div className="text-[13px] text-[#616161] mt-1">
              {new Date(ev.start).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} ·{' '}
              {ev.allDay ? 'All day' : `${new Date(ev.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} – ${new Date(ev.end).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`}
            </div>
          </div>
          {mine && (
            <button data-agent="outlook-event-edit" className="w-7 h-7 rounded hover:bg-[#F0F0F0] flex items-center justify-center" aria-label="Edit event" onClick={() => onEdit(ev)}><Edit20Regular /></button>
          )}
          <button className="w-7 h-7 rounded hover:bg-[#F0F0F0] flex items-center justify-center" aria-label="Close" onClick={onClose}><Dismiss20Regular /></button>
        </div>
        {ev.createdBy === 'hworker' && (
          <div className="mt-3 inline-flex items-center gap-1.5 h-6 pl-1 pr-2.5 rounded-full text-[11.5px] text-white" style={{ background: '#430693' }}>
            <img src={logoUrl('hworker')} className="w-4 h-4 rounded-full" alt="" /> Scheduled by H-Worker
          </div>
        )}
        {ev.teams && (
          <button className="mt-4 h-8 px-4 rounded bg-[#5B5FC7] text-white text-[13px] font-semibold flex items-center gap-2" onClick={() => { open('teams', { meetingId: ev.id }); onClose() }}><Video20Regular /> Join</button>
        )}
        {ev.location && !ev.teams && <div className="mt-3 flex items-center gap-2 text-[13px]"><Location20Regular /> {ev.location}</div>}
        {ev.reminder !== undefined && ev.reminder >= 0 && <div className="mt-2 flex items-center gap-2 text-[12.5px] text-[#616161]"><Alert20Regular className="w-4 h-4" /> {reminderLabel(ev.reminder)}</div>}
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
        {!mine && (
          <div className="mt-4">
            <div className="text-[12px] text-[#616161] mb-1.5">{ev.response ? `You ${ev.response === 'tentative' ? 'tentatively accepted' : ev.response} this meeting.` : 'Organizer is waiting for your response.'}</div>
            <div className="flex gap-1.5">
              {([
                ['accepted', 'Accept', CalendarCheckmark20Regular],
                ['tentative', 'Tentative', QuestionCircle20Regular],
                ['declined', 'Decline', CalendarCancel20Regular],
              ] as const).map(([r, l, I]) => (
                <button
                  key={r}
                  data-agent={`outlook-event-rsvp-${r}`}
                  onClick={() => { respond(ev, r, isAgent); if (r === 'declined') onClose() }}
                  className={`h-8 px-2.5 rounded border text-[13px] flex items-center gap-1.5 ${ev.response === r ? 'border-[#0F6CBD] bg-[#EBF3FC] text-[#0F6CBD]' : 'border-[#D1D1D1] hover:bg-[#F5F5F5]'}`}
                >
                  <I className="w-4 h-4" /> {l}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="mt-4 flex gap-2">
          <button className="h-8 px-3 rounded border border-[#D1D1D1] text-[13px] hover:bg-[#F5F5F5]" onClick={() => { db.remove('outlook.events', ev.id); onClose() }}>Delete</button>
          {mine && ev.attendees.length > 0 && (
            <button data-agent="outlook-event-cancel" className="h-8 px-3 rounded border border-[#D1D1D1] text-[13px] hover:bg-[#F5F5F5] text-[#C50F1F]" onClick={cancel}>Cancel meeting</button>
          )}
          {mine && (
            <button className="h-8 px-3 rounded border border-[#D1D1D1] text-[13px] hover:bg-[#F5F5F5] flex items-center gap-1" onClick={() => onEdit(ev)}><Edit20Regular className="w-4 h-4" /> Edit</button>
          )}
        </div>
      </div>
    </div>
  )
}

function MiniMonth({ anchor, onPick }: { anchor: Date; onPick: (d: Date) => void }) {
  const [month, setMonth] = useState(new Date(anchor.getFullYear(), anchor.getMonth(), 1))
  useEffect(() => {
    setMonth(new Date(anchor.getFullYear(), anchor.getMonth(), 1))
  }, [anchor.getFullYear(), anchor.getMonth()])
  const start = startOfWeek(month)
  const days = Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i))
  const today = new Date().toDateString()
  return (
    <div className="px-3 py-2 select-none">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[13px] font-semibold">{month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
        <div className="flex">
          <button className="w-6 h-6 rounded hover:bg-[#E9E9E9] flex items-center justify-center" aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft20Regular className="w-4 h-4" /></button>
          <button className="w-6 h-6 rounded hover:bg-[#E9E9E9] flex items-center justify-center" aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight20Regular className="w-4 h-4" /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 text-center text-[11px] text-[#616161]">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i} className="h-6 leading-6">{d}</div>)}
        {days.map((d) => (
          <button
            key={d.toISOString()}
            onClick={() => onPick(d)}
            className={`h-7 w-7 mx-auto rounded-full text-[12px] ${d.toDateString() === today ? 'bg-[#0F6CBD] text-white font-semibold' : d.toDateString() === anchor.toDateString() ? 'bg-[#CFE4FA] text-[#0F6CBD] font-semibold' : d.getMonth() !== month.getMonth() ? 'text-[#A19F9D] hover:bg-[#E9E9E9]' : 'text-[#242424] hover:bg-[#E9E9E9]'}`}
          >
            {d.getDate()}
          </button>
        ))}
      </div>
    </div>
  )
}

const PERMS = ['Can view when I’m busy', 'Can view titles and locations', 'Can view all details', 'Can edit']

function ShareDialog({ onClose }: { onClose: () => void }) {
  const shares = useCollection<{ id: string; email: string; perm: string }>('outlook.calendarShares')
  const { isAgent } = useDesk()
  const [to, setTo] = useState<string[]>([])
  const [perm, setPerm] = useState(PERMS[2])
  const share = () => {
    for (const email of to) {
      const ex = shares.find((s) => s.email === email)
      if (ex) db.update('outlook.calendarShares', ex.id, { perm })
      else db.insert('outlook.calendarShares', { id: uid('share'), email, perm })
    }
    if (to.length)
      db.insert(
        'outlook.emails',
        {
          id: uid('em'),
          folder: 'sent',
          from: { name: ME.name, email: ME.email },
          to,
          subject: `${ME.name} has shared their calendar with you`,
          body: `${ME.name} (${ME.email}) has invited you to view their Microsoft Outlook calendar.\n\nPermission: ${perm}\n\nAccept and view calendar: https://outlook.office.com/calendar`,
          date: new Date().toISOString(),
          read: true,
          sentBy: isAgent ? 'hworker' : undefined,
        },
        { prepend: true },
      )
    setTo([])
  }
  return (
    <div className="absolute inset-0 z-40 flex items-start justify-center pt-16 bg-black/20" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-[520px] bg-white rounded-lg shadow-[0_16px_48px_rgba(0,0,0,0.28)] p-5" data-agent="outlook-share-dialog">
        <div className="flex items-center">
          <div className="text-[18px] font-semibold flex-1">Sharing and permissions</div>
          <button className="w-8 h-8 rounded hover:bg-[#F0F0F0] flex items-center justify-center" aria-label="Close" onClick={onClose}><Dismiss20Regular /></button>
        </div>
        <div className="text-[13px] text-[#616161] mt-1">Calendar · {ME.email}</div>
        <div className="mt-4 flex items-start gap-2">
          <div className="flex-1 border border-[#D1D1D1] rounded px-2">
            <RecipientInput value={to} onChange={setTo} agent="outlook-share-to" placeholder="Enter an email address or contact name" />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <select aria-label="Permission" value={perm} onChange={(e) => setPerm(e.target.value)} className="h-8 px-2 rounded border border-[#D1D1D1] text-[13px] bg-white flex-1">
            {PERMS.map((p) => <option key={p}>{p}</option>)}
          </select>
          <button data-agent="outlook-share-send" disabled={!to.length} onClick={share} className="h-8 px-4 rounded bg-[#0F6CBD] hover:bg-[#115EA3] disabled:bg-[#C8C6C4] text-white text-[13px] font-semibold">Share</button>
        </div>
        <div className="mt-5 text-[12px] font-semibold text-[#616161]">Inside your organization</div>
        <div className="mt-1 divide-y divide-[#F0F0F0]">
          {shares.length === 0 && <div className="py-3 text-[13px] text-[#616161]">Your calendar isn’t shared with anyone yet.</div>}
          {shares.map((s) => (
            <div key={s.id} className="flex items-center gap-2 py-2">
              <Avatar email={s.email} name={personByEmail(s.email)?.name ?? s.email} size={28} />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] truncate">{personByEmail(s.email)?.name ?? s.email}</div>
                <div className="text-[11.5px] text-[#616161]">{s.perm}</div>
              </div>
              <button className="h-7 px-2 rounded hover:bg-[#F0F0F0] text-[12.5px] text-[#C50F1F]" onClick={() => db.remove('outlook.calendarShares', s.id)}>Remove</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const PEOPLE_CALS: [string, string][] = [['priya', '#8764B8'], ['ben', '#CA5010']]

export function CalendarView({ params, nonce }: { params: any; nonce: number }) {
  const allEvents = useCollection<CalEvent>('outlook.events')
  const { toast, open } = useDesk()
  const [anchor, setAnchor] = useState(() => new Date())
  const [mode, setMode] = useState<'day' | 'workweek' | 'week' | 'month'>('workweek')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [openEv, setOpenEv] = useState<CalEvent | null>(null)
  const [now, setNow] = useState(new Date())
  const [ribbonTab, setRibbonTab] = useState<'Home' | 'View' | 'Help'>('Home')
  const [hidden, setHidden] = useState<string[]>([])
  const [peopleOn, setPeopleOn] = useState<string[]>([])
  const [secs, setSecs] = useState<Record<string, boolean>>({})
  const [sharing, setSharing] = useState(false)
  const newMenu = useMenu()

  const events = hidden.includes('Calendar') ? [] : allEvents
  const showHolidays = !hidden.includes('United States holidays')

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

  const editEvent = (ev: CalEvent) => {
    const s = new Date(ev.start)
    const en = new Date(ev.end)
    setOpenEv(null)
    setDraft({
      title: ev.title,
      attendees: ev.attendees ?? [],
      date: isoDate(s),
      start: hhmm(s),
      end: hhmm(en),
      location: ev.teams ? '' : ev.location ?? '',
      teams: !!ev.teams,
      body: ev.body ?? '',
      showAs: ev.showAs,
      allDay: ev.allDay,
      endDate: isoDate(new Date(en.getTime() - 1)),
      reminder: ev.reminder,
      editId: ev.id,
    })
  }

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

  const label =
    mode === 'day'
      ? anchor.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      : mode === 'month'
        ? anchor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        : `${days[0].toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} – ${days[0].getMonth() === days[days.length - 1].getMonth() ? days[days.length - 1].getDate() : days[days.length - 1].toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}, ${days[days.length - 1].getFullYear()}`

  const toggleCal = (n: string) => setHidden((h) => (h.includes(n) ? h.filter((x) => x !== n) : [...h, n]))
  const peopleDots = (e: CalEvent) =>
    PEOPLE_CALS.filter(([id]) => peopleOn.includes(id) && [e.organizer, ...(e.attendees ?? [])].includes(person(id).email))
  const hasBanners = days.some((d) => events.some((e) => isBanner(e) && covers(e, d)) || (showHolidays && holidaysOn(d).length > 0))

  return (
    <div className="relative flex-1 min-h-0 flex flex-col">
      <div className="shrink-0 mx-2 mt-1 mb-1 bg-white rounded-lg shadow-[0_0_2px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.14)]">
        <div className="flex items-center gap-4 px-3 h-9 text-[13px]">
          {(['Home', 'View', 'Help'] as const).map((t) => (
            <button key={t} onClick={() => setRibbonTab(t)} className={`h-full relative ${ribbonTab === t ? 'font-semibold' : 'text-[#424242]'}`}>
              {t}
              {ribbonTab === t && <span className="absolute left-0 right-0 bottom-0 h-[3px] rounded-full bg-[#0F6CBD]" />}
            </button>
          ))}
        </div>
        {ribbonTab === 'Help' ? (
          <div className="flex items-center px-2 h-11 border-t border-[#F0F0F0] gap-1 text-[13px]">
            <button onClick={() => open('edge', { q: 'Outlook calendar help' })} className="h-8 px-2.5 rounded hover:bg-[#F0F0F0] flex items-center gap-1.5"><QuestionCircle20Regular className="text-[#0F6CBD]" /> Help</button>
            <button onClick={() => toast({ appId: 'outlook', title: 'Thanks for your feedback', body: 'Your feedback was sent to Microsoft.' })} className="h-8 px-2.5 rounded hover:bg-[#F0F0F0] flex items-center gap-1.5"><PersonFeedback20Regular className="text-[#0F6CBD]" /> Feedback</button>
          </div>
        ) : (
          <div className="flex items-center px-2 h-11 border-t border-[#F0F0F0] gap-1">
            {ribbonTab === 'Home' && (
              <div ref={newMenu.ref} className="relative flex items-center h-8 rounded bg-[#0F6CBD] text-white mr-1.5">
                <button data-agent="outlook-new-event" onClick={() => newEvent()} className="flex items-center gap-1.5 h-full pl-2.5 pr-3 rounded-l hover:bg-[#115EA3] text-[13px] font-semibold">
                  <CalendarAdd20Regular /> New event
                </button>
                <span className="w-px h-5 bg-white/30" />
                <button className="h-full px-1.5 rounded-r hover:bg-[#115EA3]" aria-label="New event options" onClick={newMenu.toggle}><ChevronDown16Regular /></button>
                {newMenu.open && (
                  <MenuPanel className="left-0 top-9 w-[200px]">
                    <MenuItem icon={<CalendarAdd20Regular />} label="Event" onClick={() => { newEvent({ teams: false }); newMenu.close() }} />
                    <MenuItem icon={<Video20Regular />} label="Teams meeting" onClick={() => { newEvent({ teams: true }); newMenu.close() }} />
                    <MenuItem icon={<CalendarToday20Regular />} label="All-day event" onClick={() => { newEvent({ teams: false, allDay: true, date: isoDate(anchor), endDate: isoDate(anchor) }); newMenu.close() }} />
                  </MenuPanel>
                )}
              </div>
            )}
            {(['day', 'workweek', 'week', 'month'] as const).map((m) => (
              <button key={m} data-agent={`outlook-cal-mode-${m}`} onClick={() => setMode(m)} className={`h-8 px-2.5 rounded text-[13px] ${mode === m ? 'bg-[#EBF3FC] text-[#0F6CBD] font-semibold' : 'hover:bg-[#F0F0F0]'}`}>
                {m === 'day' ? 'Day' : m === 'workweek' ? 'Work week' : m === 'week' ? 'Week' : 'Month'}
              </button>
            ))}
            <span className="w-px h-5 bg-[#E1DFDD] mx-1" />
            {ribbonTab === 'Home' ? (
              <>
                <button data-agent="outlook-cal-share" onClick={() => setSharing(true)} className="flex items-center gap-1.5 h-8 px-2 rounded hover:bg-[#F0F0F0] text-[13px]"><Share20Regular className="text-[#0F6CBD]" /> Share</button>
                <button data-agent="outlook-cal-print" onClick={() => toast({ appId: 'outlook', title: 'Sent to printer', body: `Calendar · ${label}` })} className="flex items-center gap-1.5 h-8 px-2 rounded hover:bg-[#F0F0F0] text-[13px]"><Print20Regular className="text-[#0F6CBD]" /> Print</button>
              </>
            ) : (
              <>
                <button onClick={() => toggleCal('United States holidays')} className={`h-8 px-2.5 rounded text-[13px] ${showHolidays ? 'bg-[#EBF3FC] text-[#0F6CBD]' : 'hover:bg-[#F0F0F0]'}`}>Holidays</button>
                <button onClick={() => setAnchor(new Date())} className="h-8 px-2.5 rounded text-[13px] hover:bg-[#F0F0F0]">Go to today</button>
              </>
            )}
          </div>
        )}
      </div>
      <div className="flex-1 min-h-0 flex">
        <div className="w-[230px] shrink-0 overflow-auto">
          <MiniMonth anchor={anchor} onPick={(d) => setAnchor(d)} />
          <div className="px-3 mt-2 text-[13px]">
            <button className="flex items-center gap-1 h-8 font-semibold w-full" onClick={() => setSecs((s) => ({ ...s, mine: !s.mine }))}>{secs.mine ? <ChevronRight16Regular /> : <ChevronDown16Regular />} My calendars</button>
            {!secs.mine &&
              [['Calendar', '#0F6CBD'], ['United States holidays', '#107C10'], ['Birthdays', '#8764B8']].map(([n, c]) => {
                const on = !hidden.includes(n)
                return (
                  <label key={n} className="flex items-center gap-2 h-8 pl-5 hover:bg-[#E9E9E9] rounded cursor-pointer" onClick={(e) => { e.preventDefault(); toggleCal(n) }}>
                    <span className="w-3.5 h-3.5 rounded-sm flex items-center justify-center text-white text-[10px]" style={on ? { background: c } : { border: `1px solid ${c}` }}>{on ? '✓' : ''}</span> {n}
                  </label>
                )
              })}
            <button className="flex items-center gap-1 h-8 font-semibold mt-2 w-full" onClick={() => setSecs((s) => ({ ...s, people: !s.people }))}>{secs.people ? <ChevronRight16Regular /> : <ChevronDown16Regular />} People’s calendars</button>
            {!secs.people &&
              PEOPLE_CALS.map(([id, c]) => {
                const on = peopleOn.includes(id)
                return (
                  <label key={id} className="flex items-center gap-2 h-8 pl-5 hover:bg-[#E9E9E9] rounded cursor-pointer" onClick={(e) => { e.preventDefault(); setPeopleOn((p) => (on ? p.filter((x) => x !== id) : [...p, id])) }}>
                    <span className={`w-3.5 h-3.5 rounded-sm flex items-center justify-center text-white text-[10px] ${on ? '' : 'border border-[#616161]'}`} style={on ? { background: c } : undefined}>{on ? '✓' : ''}</span> {person(id).name}
                  </label>
                )
              })}
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
            <MonthGrid
              anchor={anchor}
              events={events}
              holidays={showHolidays}
              onOpen={setOpenEv}
              onDay={(d) => {
                setAnchor(d)
                setMode('day')
              }}
              onNew={(d) => newEvent({ date: isoDate(d) })}
            />
          ) : (
            <>
              <div className="flex shrink-0 border-b border-[#EDEBE9]" style={{ paddingLeft: 56 }}>
                {days.map((d) => {
                  const isToday = d.toDateString() === now.toDateString()
                  return (
                    <div
                      key={d.toISOString()}
                      className="flex-1 px-2 py-1.5 border-l border-[#EDEBE9] cursor-pointer hover:bg-[#FAFAFA]"
                      title="Open this day"
                      onClick={() => {
                        setAnchor(d)
                        setMode('day')
                      }}
                    >
                      <div className={`text-[20px] leading-tight ${isToday ? 'text-[#0F6CBD] font-semibold' : 'text-[#242424]'}`}>{d.getDate()}</div>
                      <div className={`text-[12px] ${isToday ? 'text-[#0F6CBD]' : 'text-[#616161]'}`}>{d.toLocaleDateString('en-US', { weekday: 'long' })}</div>
                    </div>
                  )
                })}
              </div>
              {hasBanners && (
                <div className="flex shrink-0 border-b border-[#EDEBE9] min-h-[28px]" style={{ paddingLeft: 56 }}>
                  {days.map((d) => (
                    <div key={d.toISOString()} className="flex-1 min-w-0 border-l border-[#EDEBE9] p-0.5 space-y-0.5">
                      {showHolidays &&
                        holidaysOn(d).map((h) => (
                          <div key={h.name} data-agent={`outlook-holiday-${isoDate(d)}`} className="w-full h-6 px-1.5 rounded text-left text-[12px] truncate flex items-center" style={{ background: '#DFF6DD', borderLeft: '3px solid #107C10', color: '#0B5A0B' }} title={`${h.name} · United States holidays`}>
                            <span className="truncate">{h.name}</span>
                          </div>
                        ))}
                      {events
                        .filter((e) => isBanner(e) && covers(e, d))
                        .map((e) => {
                          const [bg, fg] = e.showAs === 'oof' ? ['#EFE0F7', '#8764B8'] : (CAT[e.category ?? 'Blue'] ?? CAT.Blue)
                          return (
                            <button key={e.id} data-agent={`outlook-event-${e.id}`} onClick={() => setOpenEv(e)} className="w-full h-6 px-1.5 rounded text-left text-[12px] font-semibold truncate flex items-center gap-1" style={{ background: bg, borderLeft: `3px solid ${fg}`, backgroundImage: e.showAs === 'oof' ? 'repeating-linear-gradient(135deg, transparent 0 6px, rgba(135,100,184,0.12) 6px 12px)' : undefined }}>
                              {e.createdBy === 'hworker' && <img src={logoUrl('hworker')} className="w-3 h-3 rounded-sm" alt="" />}
                              <span className="truncate">{e.title}</span>
                            </button>
                          )
                        })}
                    </div>
                  ))}
                </div>
              )}
              <div className="flex-1 overflow-auto" ref={(el) => { if (el && !el.dataset.init) { el.dataset.init = '1'; el.scrollTop = HOUR_H * 1.5 } }}>
                <div className="relative flex" style={{ height: (END_H - START_H) * HOUR_H }}>
                  <div className="w-14 shrink-0">
                    {Array.from({ length: END_H - START_H }, (_, i) => (
                      <div key={i} className="relative -top-2 text-[11px] text-[#616161] text-right pr-2" style={{ height: HOUR_H }}>
                        {new Date(2000, 0, 1, START_H + i).toLocaleTimeString('en-US', { hour: 'numeric' })}
                      </div>
                    ))}
                  </div>
                  {days.map((d) => {
                    const dayEvents = events.filter((e) => !isBanner(e) && new Date(e.start).toDateString() === d.toDateString())
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
                          const dots = peopleDots(e)
                          return (
                            <button
                              key={e.id}
                              data-agent={`outlook-event-${e.id}`}
                              onClick={() => setOpenEv(e)}
                              className={`absolute left-1 right-1.5 rounded px-1.5 py-0.5 text-left overflow-hidden ${e.createdBy === 'hworker' && Date.now() - +new Date(e.start) < 864e5 * 30 ? 'ring-1 ring-[#430693]/30' : ''}`}
                              style={{ top, height: h, background: bg, borderLeft: `3px solid ${fg}`, opacity: e.showAs === 'free' || e.response === 'tentative' ? 0.7 : 1, backgroundImage: e.response === 'tentative' ? 'repeating-linear-gradient(135deg, transparent 0 5px, rgba(255,255,255,0.6) 5px 10px)' : undefined }}
                            >
                              <div className="text-[12px] font-semibold text-[#242424] truncate flex items-center gap-1">
                                {e.createdBy === 'hworker' && <img src={logoUrl('hworker')} className="w-3 h-3 rounded-sm" alt="" />}
                                {e.title}
                                {dots.map(([id, c]) => <span key={id} className="ml-auto w-2 h-2 rounded-full shrink-0" style={{ background: c }} title={`${person(id).name} is attending`} />)}
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
      {openEv && <EventPopover ev={allEvents.find((x) => x.id === openEv.id) ?? openEv} onClose={() => setOpenEv(null)} onEdit={editEvent} />}
      {sharing && <ShareDialog onClose={() => setSharing(false)} />}
    </div>
  )
}

function MonthGrid({ anchor, events, holidays, onOpen, onDay, onNew }: { anchor: Date; events: CalEvent[]; holidays: boolean; onOpen: (e: CalEvent) => void; onDay: (d: Date) => void; onNew: (d: Date) => void }) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  const start = startOfWeek(first)
  const weeks = Math.ceil((first.getDay() + new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate()) / 7)
  const days = Array.from({ length: Math.max(5, weeks) * 7 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i))
  return (
    <div className="flex-1 grid grid-cols-7 min-h-0" style={{ gridTemplateRows: `auto repeat(${days.length / 7}, 1fr)` }}>
      {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((d) => (
        <div key={d} className="px-2 py-1 text-[12px] text-[#616161] border-b border-[#EDEBE9]">{d}</div>
      ))}
      {days.map((d) => {
        const list = events.filter((e) => (isBanner(e) ? covers(e, d) : new Date(e.start).toDateString() === d.toDateString()))
        const hol = holidays ? holidaysOn(d) : []
        return (
          <div key={d.toISOString()} className="border-b border-l border-[#EDEBE9] p-1 overflow-hidden" onDoubleClick={(e) => e.target === e.currentTarget && onNew(d)}>
            <button onClick={() => onDay(d)} className={`text-[12px] mb-0.5 px-1 rounded hover:bg-[#F0F0F0] ${d.toDateString() === new Date().toDateString() ? 'text-[#0F6CBD] font-semibold' : d.getMonth() !== anchor.getMonth() ? 'text-[#A19F9D]' : ''}`}>{d.getDate()}</button>
            {hol.map((h) => (
              <div key={h.name} className="text-[11px] truncate px-1 rounded mb-0.5 bg-[#DFF6DD] text-[#0B5A0B]">{h.name}</div>
            ))}
            {list.slice(0, 3 - hol.length).map((e) => (
              <button key={e.id} onClick={() => onOpen(e)} className="w-full text-left text-[11px] truncate px-1 rounded mb-0.5" style={{ background: (CAT[e.category ?? 'Blue'] ?? CAT.Blue)[0] }}>
                {e.allDay ? '' : new Date(e.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} {e.title}
              </button>
            ))}
            {list.length > 3 - hol.length && (
              <button onClick={() => onDay(d)} className="text-[11px] text-[#0F6CBD] hover:underline px-1">+{list.length - (3 - hol.length)} more</button>
            )}
          </div>
        )
      })}
    </div>
  )
}
