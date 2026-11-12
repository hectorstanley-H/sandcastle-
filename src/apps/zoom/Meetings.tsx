import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarPlus, CirclePause, CirclePlay, Clock, Copy, Download, FileText, Pencil, Search, Share2, Sparkles, Trash2, Users, X } from 'lucide-react'
import { db, uid, useCollection } from '@/db/db'
import { useDesk } from '@/os/context'
import { Avatar } from '@/components/Avatar'
import { ME, person, personByEmail } from '@/data/people'
import { isoDate } from '@/data/time'
import { Confirm, HWBadge, copyText, dayLabel, fmtT, inviteLink, recLink, useZoom } from './shared'

/* ───────────────────────── Meetings ───────────────────────── */
export function MeetingsTab({ mtab, setMtab, sel, setSel, onSchedule, onEdit }: { mtab: 'upcoming' | 'recorded'; setMtab: (t: any) => void; sel: string | null; setSel: (s: string | null) => void; onSchedule: () => void; onEdit: (m: any) => void }) {
  const meetings = useCollection<any>('zoom.meetings')
  const recs = useCollection<any>('zoom.recordings')
  const up = meetings.filter((m) => +new Date(m.start) + m.durationMins * 60000 > Date.now()).sort((a, b) => +new Date(a.start) - +new Date(b.start))
  const groups = useMemo(() => {
    const g: Record<string, any[]> = {}
    for (const m of up) (g[dayLabel(m.start)] ??= []).push(m)
    return g
  }, [up])
  const m = meetings.find((x) => x.id === sel) ?? (mtab === 'upcoming' ? up[0] : undefined)
  const r = recs.find((x) => x.id === sel) ?? (mtab === 'recorded' ? recs[0] : undefined)
  return (
    <>
      <div className="w-[330px] shrink-0 border-r border-[#E4E4ED] flex flex-col bg-white">
        <div className="h-12 px-4 flex items-center gap-2">
          <span className="text-[16px] font-bold flex-1">Meetings</span>
          <button data-agent="zoom-meetings-schedule" onClick={onSchedule} aria-label="Schedule a meeting" className="w-7 h-7 rounded-full hover:bg-[#ECECF2] flex items-center justify-center"><CalendarPlus size={16} /></button>
        </div>
        <div className="mx-4 mb-2 flex p-0.5 rounded-[8px] bg-[#ECECF2] text-[13px] font-medium">
          {(['upcoming', 'recorded'] as const).map((t) => (
            <button key={t} data-agent={`zoom-meetings-${t}`} onClick={() => { setMtab(t); setSel(null) }} className={`flex-1 h-8 rounded-[7px] ${mtab === t ? 'bg-white shadow-sm' : 'text-[#6E7680]'}`}>{t === 'upcoming' ? 'Upcoming' : 'Recorded'}</button>
          ))}
        </div>
        <div className="flex-1 overflow-auto">
          {mtab === 'upcoming' && up.length === 0 && <div className="p-8 text-center text-[13px] text-[#6E7680]">No upcoming meetings.</div>}
          {mtab === 'upcoming' &&
            Object.entries(groups).map(([d, list]) => (
              <div key={d}>
                <div className="px-4 pt-3 pb-1 text-[12px] font-semibold text-[#6E7680]">{d}</div>
                {list.map((x) => (
                  <button key={x.id} data-agent={`zoom-meeting-${x.id}`} onClick={() => setSel(x.id)} className={`w-full text-left px-4 py-2.5 ${m?.id === x.id ? 'bg-[#DCE8FF]' : 'hover:bg-[#F7F7FA]'} ${x.createdBy ? 'flash-new' : ''}`}>
                    <div className="text-[14px] font-semibold truncate">{x.topic}</div>
                    <div className="text-[12px] text-[#6E7680]">{fmtT(x.start)} - {fmtT(new Date(+new Date(x.start) + x.durationMins * 60000).toISOString())}{x.recurring ? ' · Recurring' : ''}</div>
                  </button>
                ))}
              </div>
            ))}
          {mtab === 'recorded' && recs.length === 0 && <div className="p-8 text-center text-[13px] text-[#6E7680]">No cloud recordings yet.</div>}
          {mtab === 'recorded' &&
            recs.map((x) => (
              <button key={x.id} data-agent={`zoom-recording-${x.id}`} onClick={() => setSel(x.id)} className={`w-full text-left px-4 py-2.5 flex gap-3 ${r?.id === x.id ? 'bg-[#DCE8FF]' : 'hover:bg-[#F7F7FA]'}`}>
                <div className="w-16 h-10 rounded-[6px] bg-[#1F2937] flex items-center justify-center text-white shrink-0"><CirclePlay size={18} /></div>
                <div className="min-w-0">
                  <div className="text-[13.5px] font-semibold truncate">{x.topic}</div>
                  <div className="text-[12px] text-[#6E7680]">{new Date(x.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {x.duration}</div>
                </div>
              </button>
            ))}
        </div>
      </div>
      <div className="flex-1 min-w-0 overflow-auto bg-white">
        {mtab === 'upcoming' && m && <MeetingDetail key={m.id} m={m} onEdit={() => onEdit(m)} onDeleted={() => setSel(null)} />}
        {mtab === 'recorded' && r && <RecordingDetail key={r.id} r={r} onDeleted={() => setSel(null)} />}
      </div>
    </>
  )
}

function MeetingDetail({ m, onEdit, onDeleted }: { m: any; onEdit: () => void; onDeleted: () => void }) {
  const { startMeeting, toast } = useZoom()
  const [copied, setCopied] = useState(false)
  const [del, setDel] = useState(false)
  const invitation = () =>
    `${person('alex').name} is inviting you to a scheduled Zoom meeting.\n\nTopic: ${m.topic}\nTime: ${new Date(m.start).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} Eastern Time (US and Canada)\n\nJoin Zoom Meeting\n${inviteLink(m)}\n\nMeeting ID: ${m.meetingNumber}\nPasscode: ${m.passcode}`
  return (
    <div className="p-8 max-w-[760px]" data-agent="zoom-meeting-detail">
      <div className="flex items-start gap-3">
        <h1 className="text-[24px] font-bold flex-1">{m.topic}</h1>
        {m.createdBy === 'hworker' && <HWBadge />}
      </div>
      <div className="text-[14px] text-[#3F4752] mt-2 flex items-center gap-2"><Clock size={15} /> {new Date(m.start).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} · {fmtT(m.start)} - {fmtT(new Date(+new Date(m.start) + m.durationMins * 60000).toISOString())} (Eastern Time)</div>
      <div className="flex gap-2 mt-5">
        <button data-agent="zoom-mtg-start" onClick={() => startMeeting({ topic: m.topic, meetingId: m.id, participants: m.attendees ?? [] })} className="h-9 px-5 rounded-[8px] bg-[#0B5CFF] text-white text-[14px] font-semibold">Start</button>
        <button onClick={() => { copyText(invitation()); setCopied(true) }} className="h-9 px-4 rounded-[8px] border border-[#D5D7E0] text-[14px] font-medium flex items-center gap-1.5"><Copy size={14} /> {copied ? 'Copied!' : 'Copy invitation'}</button>
        <button data-agent="zoom-mtg-edit" onClick={onEdit} className="h-9 px-4 rounded-[8px] border border-[#D5D7E0] text-[14px] font-medium flex items-center gap-1.5"><Pencil size={14} /> Edit</button>
        <button data-agent="zoom-mtg-delete" aria-label="Delete meeting" title="Delete" onClick={() => setDel(true)} className="h-9 w-9 rounded-[8px] border border-[#D5D7E0] flex items-center justify-center hover:text-[#E02828]"><Trash2 size={14} /></button>
      </div>
      <div className="mt-6 rounded-[12px] border border-[#E4E4ED] divide-y divide-[#E4E4ED] text-[14px]">
        {[
          ['Meeting ID', m.meetingNumber],
          ['Passcode', m.passcode || '—'],
          ['Security', `${m.waitingRoom ? 'Waiting room enabled' : 'Waiting room off'} · Passcode ${m.passcode ? 'on' : 'off'}`],
          ['Invite link', `https://northwind.zoom.us/j/${m.meetingNumber.replace(/\s/g, '')}?pwd=${m.passcode}`],
          ['Host', person('alex').name],
          ['Attendees', (m.attendees ?? []).map((e: string) => personByEmail(e)?.name ?? e).join(', ') || '—'],
        ].map(([k, v]) => (
          <div key={k} className="flex px-5 py-3">
            <div className="w-[130px] text-[#6E7680] shrink-0">{k}</div>
            <div className="break-all">{v}</div>
          </div>
        ))}
      </div>
      {m.agenda && (
        <div className="mt-5">
          <div className="text-[14px] font-semibold mb-1">Description</div>
          <div className="text-[14px] text-[#3F4752] whitespace-pre-wrap leading-[1.55]">{m.agenda}</div>
        </div>
      )}
      {del && (
        <Confirm
          title="Delete meeting?"
          agent="zoom-mtg-delete-dialog"
          body={<>“{m.topic}” on {dayLabel(m.start)} at {fmtT(m.start)} will be deleted{m.recurring ? ', including all occurrences' : ''}. Attendees’ calendar invitations will be cancelled.</>}
          onCancel={() => setDel(false)}
          onConfirm={() => {
            db.remove('zoom.meetings', m.id)
            setDel(false)
            onDeleted()
            toast('Meeting deleted')
          }}
        />
      )}
    </div>
  )
}

/** parse "52:14" / "1:01:47" to seconds */
const toSecs = (d: string) => String(d ?? '0').split(':').map(Number).reduce((t, x) => t * 60 + (x || 0), 0)
const fmtSecs = (s: number) => (s >= 3600 ? `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`)

function RecordingDetail({ r, onDeleted }: { r: any; onDeleted: () => void }) {
  const { isAgent } = useDesk()
  const { toast } = useZoom()
  const [t, setT] = useState<'summary' | 'transcript'>('summary')
  const [playing, setPlaying] = useState(false)
  const [pos, setPos] = useState(0)
  const [shared, setShared] = useState(false)
  const [del, setDel] = useState(false)
  const [q, setQ] = useState('')
  const total = Math.max(1, toSecs(r.duration))
  const timer = useRef<any>(null)
  useEffect(() => {
    if (!playing) return
    timer.current = setInterval(() => setPos((p) => {
      const n = p + Math.max(1, Math.round(total / 120))
      if (n >= total) {
        setPlaying(false)
        return total
      }
      return n
    }), 250)
    return () => clearInterval(timer.current)
  }, [playing, total])
  const transcript: string[][] = r.transcript ?? []
  const caption = [...transcript].reverse().find(([, ts]) => toSecs(ts) <= pos)
  const shown = q ? transcript.filter(([s, , txt]) => `${s} ${txt}`.toLowerCase().includes(q.toLowerCase())) : transcript
  const hl = (s: string) => {
    if (!q) return s
    const i = s.toLowerCase().indexOf(q.toLowerCase())
    if (i < 0) return s
    return <>{s.slice(0, i)}<mark className="bg-[#FFE58F]">{s.slice(i, i + q.length)}</mark>{s.slice(i + q.length)}</>
  }
  const download = () => {
    const id = `f-zoom-${r.id}`
    db.remove('files', id)
    db.insert('files', { id, name: `${r.topic.replace(/[\\/:*?"<>|]/g, '')}.mp4`, folder: 'Downloads', kind: 'mp4', size: r.size, modified: new Date().toISOString(), open: { appId: 'zoom', params: { recordingId: r.id } }, createdBy: isAgent ? 'hworker' : undefined }, { prepend: true })
    toast(`${r.topic}.mp4 downloaded to Downloads`)
  }
  return (
    <div className="p-6" data-agent="zoom-recording-detail">
      <div className="flex gap-6">
        <div className="w-[420px] h-[236px] rounded-[12px] bg-gradient-to-br from-[#111827] to-[#1F3A6B] relative flex items-center justify-center text-white shrink-0 overflow-hidden">
          <div className="absolute inset-3 bottom-10 grid grid-cols-2 gap-2 opacity-90">
            {r.participants.slice(0, 4).map((p: string) => (
              <div key={p} className={`rounded-[8px] bg-[#2B3445] flex items-center justify-center relative ${playing && caption?.[0] === p ? 'ring-2 ring-[#00A35C]' : ''}`}>
                <Avatar name={p} size={44} />
                <span className="absolute bottom-1 left-2 text-[10px]">{p}</span>
              </div>
            ))}
          </div>
          {!playing && (
            <button data-agent="zoom-rec-play" aria-label="Play recording" onClick={() => { if (pos >= total) setPos(0); setPlaying(true) }} className="relative">
              <CirclePlay size={54} className="drop-shadow-lg" />
            </button>
          )}
          {playing && caption && <div className="absolute bottom-11 left-1/2 -translate-x-1/2 max-w-[90%] text-[11.5px] bg-black/70 px-2 py-0.5 rounded text-center truncate">{caption[0]}: {caption[2]}</div>}
          <div className="absolute bottom-0 left-0 right-0 h-9 bg-black/50 flex items-center gap-2 px-3">
            <button aria-label={playing ? 'Pause' : 'Play'} onClick={() => { if (!playing && pos >= total) setPos(0); setPlaying(!playing) }}>{playing ? <CirclePause size={18} /> : <CirclePlay size={18} />}</button>
            <div className="flex-1 h-1.5 rounded bg-white/25 cursor-pointer relative" onClick={(e) => { const b = (e.currentTarget as HTMLDivElement).getBoundingClientRect(); setPos(Math.round(((e.clientX - b.left) / b.width) * total)) }}>
              <div className="absolute left-0 top-0 bottom-0 rounded bg-[#0B5CFF]" style={{ width: `${(pos / total) * 100}%` }} />
            </div>
            <span className="text-[11px] tabular-nums">{fmtSecs(pos)} / {r.duration}</span>
          </div>
        </div>
        <div className="min-w-0">
          <h1 className="text-[22px] font-bold flex items-center gap-2">{r.topic} {r.createdBy === 'hworker' && <HWBadge text="Recorded by H-Worker" />}</h1>
          <div className="text-[13px] text-[#6E7680] mt-1">{new Date(r.date).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} · {r.duration} · {r.size}</div>
          <div className="text-[13px] mt-3"><b>Participants:</b> {r.participants.join(', ')}</div>
          <div className="flex gap-2 mt-4">
            <button data-agent="zoom-rec-share" onClick={() => { copyText(recLink(r)); setShared(true); toast('Shareable link copied to clipboard') }} className="h-8 px-4 rounded-[8px] bg-[#0B5CFF] text-white text-[13px] font-semibold flex items-center gap-1.5"><Share2 size={13} /> {shared ? 'Link copied' : 'Share'}</button>
            <button data-agent="zoom-rec-download" onClick={download} className="h-8 px-4 rounded-[8px] border border-[#D5D7E0] text-[13px] font-medium flex items-center gap-1.5"><Download size={13} /> Download</button>
            <button data-agent="zoom-rec-delete" aria-label="Delete recording" title="Delete" onClick={() => setDel(true)} className="h-8 w-8 rounded-[8px] border border-[#D5D7E0] flex items-center justify-center hover:text-[#E02828]"><Trash2 size={13} /></button>
          </div>
        </div>
      </div>
      <div className="flex gap-1 mt-6 border-b border-[#E4E4ED]">
        {(['summary', 'transcript'] as const).map((x) => (
          <button key={x} data-agent={`zoom-rec-tab-${x}`} onClick={() => setT(x)} className={`h-10 px-3 text-[14px] font-medium relative ${t === x ? 'text-[#0B5CFF]' : 'text-[#6E7680]'}`}>
            {x === 'summary' ? <span className="flex items-center gap-1.5"><Sparkles size={14} /> Meeting summary</span> : 'Transcript'}
            {t === x && <span className="absolute left-0 right-0 bottom-0 h-[2px] bg-[#0B5CFF]" />}
          </button>
        ))}
      </div>
      {t === 'summary' ? (
        <div className="mt-4 rounded-[12px] border border-[#D9E3FF] bg-gradient-to-b from-[#F4F7FF] to-white p-5 max-w-[860px]" data-agent="zoom-ai-summary">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-[#0B5CFF]"><Sparkles size={15} /> Meeting summary with AI Companion</div>
          <div className="text-[15px] font-bold mt-3">Quick recap</div>
          <p className="text-[14px] leading-[1.6] mt-1">{r.summary.quick}</p>
          <div className="text-[15px] font-bold mt-4">Next steps</div>
          <ul className="list-disc pl-5 text-[14px] leading-[1.7] mt-1">{r.summary.nextSteps.map((s: string) => <li key={s}>{s}</li>)}</ul>
          <div className="text-[15px] font-bold mt-4">Summary</div>
          {r.summary.sections.map(([h, b]: [string, string]) => (
            <div key={h} className="mt-2"><div className="text-[14px] font-semibold">{h}</div><div className="text-[14px] text-[#3F4752] leading-[1.6]">{b}</div></div>
          ))}
          <div className="text-[11.5px] text-[#6E7680] mt-4">AI-generated content may be inaccurate or misleading. Always check for accuracy.</div>
        </div>
      ) : (
        <div className="mt-4 space-y-3 max-w-[860px]">
          <div className="flex items-center h-9 w-[320px] rounded-[8px] border border-[#D5D7E0] px-3 gap-2 text-[#6E7680]">
            <Search size={14} />
            <input data-agent="zoom-rec-transcript-search" aria-label="Search transcript" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search transcript" className="flex-1 outline-none text-[13px] text-[#131619] bg-transparent" />
            {q && <button aria-label="Clear search" onClick={() => setQ('')}><X size={13} /></button>}
          </div>
          {q && <div className="text-[12px] text-[#6E7680]">{shown.length} result{shown.length === 1 ? '' : 's'}</div>}
          {shown.map(([s, ts, txt]: string[], i: number) => (
            <div key={i} className="flex gap-3"><Avatar name={s} size={30} /><div><div className="text-[13px]"><b>{s}</b> <button onClick={() => { setPos(toSecs(ts)); setPlaying(false) }} className="text-[#6E7680] hover:text-[#0B5CFF] hover:underline">{ts}</button></div><div className="text-[14px]">{hl(txt)}</div></div></div>
          ))}
        </div>
      )}
      {del && (
        <Confirm
          title="Delete recording?"
          agent="zoom-rec-delete-dialog"
          body={<>“{r.topic}” will be moved to trash and the AI Companion summary and transcript will no longer be available.</>}
          onCancel={() => setDel(false)}
          onConfirm={() => {
            db.remove('zoom.recordings', r.id)
            setDel(false)
            onDeleted()
            toast('Recording deleted')
          }}
        />
      )}
    </div>
  )
}

/* ───────────────────────── Schedule / edit modal ───────────────────────── */
export function ScheduleModal({ onClose, onSaved, meeting, initial }: { onClose: () => void; onSaved: (id: string) => void; meeting?: any; initial?: { attendees?: string; topic?: string; date?: string } }) {
  const { isAgent } = useDesk()
  const tomorrow = new Date(Date.now() + 86400000)
  const start0 = meeting ? new Date(meeting.start) : null
  const hhmm = start0 ? `${String(start0.getHours()).padStart(2, '0')}:${start0.getMinutes() < 30 ? '00' : '30'}` : '10:00'
  const [topic, setTopic] = useState(meeting?.topic ?? initial?.topic ?? `${ME.first} ${ME.last}'s Zoom Meeting`)
  const [date, setDate] = useState(start0 ? isoDate(start0) : initial?.date ?? isoDate(tomorrow))
  const [time, setTime] = useState(hhmm)
  const [dur, setDur] = useState(meeting ? String(meeting.durationMins) : '30')
  const [attendees, setAttendees] = useState(meeting ? (meeting.attendees ?? []).join(', ') : initial?.attendees ?? '')
  const [passcode, setPasscode] = useState(meeting?.passcode ?? String(100000 + Math.floor(Math.random() * 899999)))
  const [waiting, setWaiting] = useState(meeting ? !!meeting.waitingRoom : true)
  const [agenda, setAgenda] = useState(meeting?.agenda ?? '')
  const [recurring, setRecurring] = useState(meeting ? !!meeting.recurring : false)
  const times = Array.from({ length: 48 }).map((_, i) => `${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`)
  const durs = ['15', '30', '45', '60', '90']
  if (meeting && !durs.includes(String(meeting.durationMins))) durs.push(String(meeting.durationMins))
  const p = meeting ? 'zoom-edit' : 'zoom-schedule'
  const save = () => {
    const start = new Date(`${date}T${time}:00`).toISOString()
    if (meeting) {
      db.update('zoom.meetings', meeting.id, { topic, start, durationMins: Number(dur), attendees: attendees.split(/[,;]\s*/).map((x: string) => x.trim()).filter(Boolean), passcode, waitingRoom: waiting, recurring, agenda, ...(isAgent ? { updatedBy: 'hworker' } : {}) })
      onSaved(meeting.id)
      return
    }
    const id = uid('zm')
    const n = Math.floor(80000000000 + Math.random() * 9999999999).toString()
    db.insert('zoom.meetings', {
      id,
      topic,
      start,
      durationMins: Number(dur),
      attendees: attendees.split(/[,;]\s*/).filter(Boolean),
      host: ME.email,
      meetingNumber: `${n.slice(0, 3)} ${n.slice(3, 7)} ${n.slice(7, 11)}`,
      passcode,
      waitingRoom: waiting,
      recurring,
      agenda,
      createdBy: isAgent ? 'hworker' : undefined,
    })
    onSaved(id)
  }
  const field = 'h-9 px-3 rounded-[8px] border border-[#D5D7E0] text-[14px] outline-none focus:border-[#0B5CFF] bg-white'
  return (
    <div className="absolute inset-0 z-50 bg-black/30 flex items-center justify-center" data-agent={`${p}-modal`}>
      <div className="w-[640px] max-h-[92%] overflow-auto bg-white rounded-[14px] shadow-2xl">
        <div className="h-14 px-6 flex items-center border-b border-[#E4E4ED]">
          <span className="text-[17px] font-bold flex-1">{meeting ? 'Edit meeting' : 'Schedule meeting'}</span>
          <button onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4 text-[14px]">
          <input data-agent={`${p}-topic`} aria-label="Topic" value={topic} onChange={(e) => setTopic(e.target.value)} className="w-full h-11 text-[18px] font-semibold outline-none border-b border-[#D5D7E0] focus:border-[#0B5CFF]" />
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-[#6E7680]" />
            <input data-agent={`${p}-date`} aria-label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={field} />
            <select data-agent={`${p}-time`} aria-label="Start time" value={time} onChange={(e) => setTime(e.target.value)} className={field}>
              {times.map((t) => <option key={t} value={t}>{new Date(`2000-01-01T${t}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</option>)}
            </select>
            <select data-agent={`${p}-duration`} aria-label="Duration" value={dur} onChange={(e) => setDur(e.target.value)} className={field}>
              {durs.map((d) => <option key={d} value={d}>{Number(d) >= 60 ? `${Math.floor(Number(d) / 60)} hr${Number(d) % 60 ? ' 30 min' : ''}` : `${d} min`}</option>)}
            </select>
          </div>
          <div className="text-[13px] text-[#6E7680] pl-6">(GMT-4:00) Eastern Time (US and Canada) · <label className="inline-flex items-center gap-1"><input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} /> Recurring meeting</label></div>
          <div className="flex items-start gap-2">
            <Users size={16} className="text-[#6E7680] mt-2.5" />
            <input data-agent={`${p}-attendees`} aria-label="Attendees" value={attendees} onChange={(e) => setAttendees(e.target.value)} placeholder="Add attendees (email, comma separated)" className={`${field} flex-1`} />
          </div>
          <div className="flex items-start gap-2">
            <FileText size={16} className="text-[#6E7680] mt-2.5" />
            <textarea data-agent={`${p}-agenda`} aria-label="Description" value={agenda} onChange={(e) => setAgenda(e.target.value)} rows={4} placeholder="Add description" className="flex-1 px-3 py-2 rounded-[8px] border border-[#D5D7E0] outline-none focus:border-[#0B5CFF] resize-none" />
          </div>
          <div className="rounded-[10px] bg-[#F7F7FA] p-4 space-y-3">
            <div className="font-semibold">Meeting ID</div>
            <label className="flex items-center gap-2"><input type="radio" defaultChecked name="mid" /> Generate automatically</label>
            <label className="flex items-center gap-2 text-[#6E7680]"><input type="radio" name="mid" /> Personal Meeting ID 482 019 3375</label>
            <div className="font-semibold pt-1">Security</div>
            <label className="flex items-center gap-2"><input type="checkbox" checked readOnly /> Passcode <input data-agent={`${p}-passcode`} aria-label="Passcode" value={passcode} onChange={(e) => setPasscode(e.target.value)} className={`${field} h-8 w-[120px] ml-2`} /></label>
            <label className="flex items-center gap-2"><input data-agent={`${p}-waiting`} type="checkbox" checked={waiting} onChange={(e) => setWaiting(e.target.checked)} /> Waiting Room</label>
            <div className="font-semibold pt-1">Calendar</div>
            <div className="flex gap-4"><label className="flex items-center gap-2"><input type="radio" defaultChecked name="cal" /> Outlook</label><label className="flex items-center gap-2"><input type="radio" name="cal" /> Google Calendar</label><label className="flex items-center gap-2"><input type="radio" name="cal" /> Other calendars</label></div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-[#E4E4ED] flex justify-end gap-2">
          <button onClick={onClose} className="h-9 px-5 rounded-[8px] border border-[#D5D7E0] font-medium">Cancel</button>
          <button data-agent={`${p}-save`} onClick={save} className="h-9 px-6 rounded-[8px] bg-[#0B5CFF] text-white font-semibold">Save</button>
        </div>
      </div>
    </div>
  )
}

