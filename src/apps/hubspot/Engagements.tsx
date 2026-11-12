/** HubSpot › Calls (call log + dialer) and Meetings (schedule + outcomes). */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Calendar, Copy, Mic, Pause, Phone, PhoneIncoming, PhoneOff, PhoneOutgoing, Play, Plus, Search, Video, MapPin } from 'lucide-react'
import { db, useCollection } from '@/db/db'
import { useDesk } from '@/os/context'
import { ME, person } from '@/data/people'
import { Field, HBtn, HLink, Initials, Modal, Pill, hsDate, inputH, useHNav } from './ui'
import { OWNERS } from './owners'
import { logActivity, logCall, scheduleMeeting } from './store'

const th = 'text-left text-[12px] font-semibold uppercase tracking-wide px-3 h-10 border-b border-[#DFE3EB] bg-[#F5F8FA] whitespace-nowrap'
const td = 'px-3 h-12 border-b border-[#DFE3EB] text-[13.5px] whitespace-nowrap'
const OUTCOMES = ['Connected', 'Left voicemail', 'No answer', 'Busy', 'Wrong number']
const outColor: Record<string, [string, string]> = { Connected: ['#E5F8F6', '#00826F'], 'Left voicemail': ['#FFF4DC', '#9B6A00'], 'No answer': ['#EAF0F6', '#516F90'], Busy: ['#EAF0F6', '#516F90'], 'Wrong number': ['#FDEDEE', '#C93B44'] }
const mtgColor: Record<string, [string, string]> = { Scheduled: ['#E5F5F8', '#007A8C'], Completed: ['#E5F8F6', '#00826F'], 'No show': ['#FDEDEE', '#C93B44'], Rescheduled: ['#FFF4DC', '#9B6A00'], Canceled: ['#EAF0F6', '#516F90'] }
const dur = (s: number) => (s ? `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s` : '--')
const fullName = (c?: any) => (c ? `${c.firstName} ${c.lastName}` : 'Unknown contact')

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white border border-[#DFE3EB] rounded-[4px] px-4 py-3">
      <div className="text-[12px] font-semibold uppercase tracking-wide text-[#516F90]">{label}</div>
      <div className="text-[24px] font-light mt-0.5">{value}</div>
      {sub && <div className="text-[12px] text-[#516F90]">{sub}</div>}
    </div>
  )
}

/* ───────────────────────── calls ───────────────────────── */

export function CallsPage() {
  const { open, go } = useHNav()
  const calls = useCollection<any>('hubspot.calls')
  const contacts = useCollection<any>('hubspot.contacts')
  const deals = useCollection<any>('hubspot.deals')
  const [q, setQ] = useState('')
  const [owner, setOwner] = useState('')
  const [outcome, setOutcome] = useState('')
  const [playing, setPlaying] = useState<string | null>(null)
  const cById = useMemo(() => new Map(contacts.map((c) => [c.id, c])), [contacts])
  const dById = useMemo(() => new Map(deals.map((d) => [d.id, d])), [deals])
  const rows = calls
    .filter((c) => (!owner || c.ownerId === owner) && (!outcome || c.outcome === outcome))
    .filter((c) => !q || `${fullName(cById.get(c.contactId))} ${c.notes}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => +new Date(b.date) - +new Date(a.date))
  const week = calls.filter((c) => Date.now() - +new Date(c.date) < 7 * 86_400_000)
  const connected = week.filter((c) => c.outcome === 'Connected')
  const talk = connected.reduce((t, c) => t + c.durationSec, 0)

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-medium">Calls</h1>
          <div className="text-[13px] text-[#516F90]">Every call logged across contacts and deals.</div>
        </div>
        <HBtn variant="primary" agent="hs-call-new" onClick={() => open(<Dialer onClose={() => open(null)} />)}><Phone size={15} /> Make a call</HBtn>
      </div>
      <div className="grid grid-cols-4 gap-3">
        <Kpi label="Calls this week" value={String(week.length)} sub={`${calls.length} all time`} />
        <Kpi label="Connect rate" value={week.length ? `${Math.round((connected.length / week.length) * 100)}%` : '--'} sub="Last 7 days" />
        <Kpi label="Avg. call length" value={connected.length ? dur(Math.round(talk / connected.length)) : '--'} sub="Connected calls" />
        <Kpi label="Talk time" value={`${Math.round(talk / 60)} min`} sub="Last 7 days" />
      </div>
      <div className="bg-white border border-[#DFE3EB] rounded-[4px]">
        <div className="flex items-center gap-2 p-3 border-b border-[#DFE3EB]">
          <div className="flex items-center h-8 w-[260px] border border-[#CBD6E2] rounded-[3px] px-2 gap-1.5"><Search size={14} className="text-[#7C98B6]" /><input aria-label="Search calls" data-agent="hs-calls-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search contact or notes" className="flex-1 outline-none text-[13px]" /></div>
          <select aria-label="Owner" value={owner} onChange={(e) => setOwner(e.target.value)} className={`${inputH} h-8 text-[13px]`}><option value="">All owners</option>{OWNERS.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select>
          <select aria-label="Outcome" value={outcome} onChange={(e) => setOutcome(e.target.value)} className={`${inputH} h-8 text-[13px]`}><option value="">All outcomes</option>{OUTCOMES.map((o) => <option key={o}>{o}</option>)}</select>
          <span className="ml-auto text-[13px] text-[#516F90]">{rows.length} calls</span>
        </div>
        <table className="w-full">
          <thead><tr><th className={th}>Contact</th><th className={th}>Deal</th><th className={th}>Direction</th><th className={th}>Outcome</th><th className={th}>Duration</th><th className={th}>Date</th><th className={th}>Owner</th><th className={th}>Notes</th><th className={th}>Recording</th></tr></thead>
          <tbody>
            {rows.map((c) => {
              const ct = cById.get(c.contactId)
              const d = c.dealId ? dById.get(c.dealId) : undefined
              const [bg, fg] = outColor[c.outcome] ?? outColor['No answer']
              return (
                <tr key={c.id} className="hover:bg-[#F5F8FA]" data-agent={`hs-call-row-${c.id}`}>
                  <td className={td}><div className="flex items-center gap-2"><Initials name={fullName(ct)} size={26} /><HLink onClick={() => ct && go({ page: 'contact', id: ct.id })}>{fullName(ct)}</HLink></div></td>
                  <td className={`${td} max-w-[200px] truncate`}>{d ? <HLink onClick={() => go({ page: 'deal', id: d.id })}>{d.name}</HLink> : '--'}</td>
                  <td className={td}><span className="inline-flex items-center gap-1 text-[#516F90]">{c.direction === 'Inbound' ? <PhoneIncoming size={13} /> : <PhoneOutgoing size={13} />} {c.direction}</span></td>
                  <td className={td}><Pill color={bg} text={fg}>{c.outcome}</Pill></td>
                  <td className={`${td} tabular-nums`}>{dur(c.durationSec)}</td>
                  <td className={td}>{hsDate(c.date, true)}</td>
                  <td className={td}>{person(c.ownerId).name}</td>
                  <td className={`${td} max-w-[280px] truncate text-[#516F90]`} title={c.notes}>{c.notes || '--'}</td>
                  <td className={td}>
                    {c.recorded ? (
                      <button aria-label="Play recording" onClick={() => setPlaying(playing === c.id ? null : c.id)} className="flex items-center gap-1.5 text-[#0091AE] text-[13px] font-medium">
                        {playing === c.id ? <Pause size={13} /> : <Play size={13} />}
                        {playing === c.id ? <Wave /> : 'Play'}
                      </button>
                    ) : <span className="text-[#7C98B6]">--</span>}
                  </td>
                </tr>
              )
            })}
            {!rows.length && <tr><td colSpan={9} className="p-10 text-center text-[#516F90]">No calls match these filters.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Wave() {
  return (
    <span className="flex items-end gap-[2px] h-3.5">
      {Array.from({ length: 14 }, (_, i) => <span key={i} className="w-[2px] bg-[#0091AE] rounded animate-pulse" style={{ height: `${30 + ((i * 37) % 70)}%`, animationDelay: `${i * 70}ms` }} />)}
    </span>
  )
}

/** Simulated softphone: ring → connected timer → hang up → log outcome + notes. */
export function Dialer({ onClose, contactId: initial, dealId }: { onClose: () => void; contactId?: string; dealId?: string }) {
  const { toast } = useHNav()
  const { isAgent } = useDesk()
  const contacts = useCollection<any>('hubspot.contacts')
  const deals = useCollection<any>('hubspot.deals')
  const [contactId, setContactId] = useState(initial ?? '')
  const [state, setState] = useState<'idle' | 'ringing' | 'live' | 'ended'>('idle')
  const [secs, setSecs] = useState(0)
  const [outcome, setOutcome] = useState('Connected')
  const [notes, setNotes] = useState('')
  const [deal, setDeal] = useState(dealId ?? '')
  const [muted, setMuted] = useState(false)
  const timer = useRef<any>(null)
  const c = contacts.find((x) => x.id === contactId)
  const theirDeals = deals.filter((d) => c && (d.companyName === c.company || c.company?.startsWith(d.companyName)))
  useEffect(() => () => clearInterval(timer.current), [])
  useEffect(() => { if (!dealId) setDeal(theirDeals[0]?.id ?? '') }, [contactId])
  const dial = () => {
    setState('ringing')
    setSecs(0)
    setTimeout(() => {
      setState((s) => (s === 'ringing' ? 'live' : s))
      timer.current = setInterval(() => setSecs((x) => x + 1), 1000)
    }, 1800)
  }
  const hangup = () => {
    clearInterval(timer.current)
    setOutcome(state === 'live' ? 'Connected' : 'No answer')
    setState('ended')
  }
  const save = () => {
    logCall({ contactId, dealId: deal || undefined, ownerId: ME.id, durationSec: outcome === 'Connected' ? Math.max(secs, 1) : 0, outcome, notes, by: isAgent ? 'hworker' : undefined })
    toast('Call logged.')
    onClose()
  }
  return (
    <Modal
      title="Call"
      width={480}
      agent="hs-dialer"
      onClose={() => { clearInterval(timer.current); onClose() }}
      footer={state === 'ended' ? <><HBtn variant="primary" small agent="hs-dialer-save" onClick={save}>Log call</HBtn><HBtn variant="secondary" small onClick={onClose}>Discard</HBtn></> : undefined}
    >
      <Field label="Contact">
        <select data-agent="hs-dialer-contact" aria-label="Contact" disabled={state !== 'idle'} value={contactId} onChange={(e) => setContactId(e.target.value)} className={`${inputH} w-full`}>
          <option value="">Select a contact</option>
          {contacts.map((x) => <option key={x.id} value={x.id}>{fullName(x)} — {x.company}</option>)}
        </select>
      </Field>
      <div className="rounded-[4px] bg-[#213343] text-white p-5 flex flex-col items-center">
        <Initials name={c ? fullName(c) : '?'} size={52} />
        <div className="mt-2 text-[16px] font-medium">{c ? fullName(c) : 'No contact selected'}</div>
        <div className="text-[13px] text-[#CBD6E2]">{c?.phone ?? '--'}</div>
        <div className="mt-2 h-5 text-[13px] tabular-nums text-[#7FD1DE]" data-agent="hs-dialer-status">
          {state === 'ringing' ? 'Ringing…' : state === 'live' ? `Connected · ${dur(secs)}` : state === 'ended' ? `Call ended${secs ? ' · ' + dur(secs) : ''}` : ''}
        </div>
        <div className="mt-3 flex items-center gap-3">
          {state === 'idle' && <button data-agent="hs-dialer-call" aria-label="Start call" disabled={!c} onClick={dial} className="w-12 h-12 rounded-full bg-[#00BDA5] flex items-center justify-center disabled:opacity-40"><Phone size={20} /></button>}
          {(state === 'ringing' || state === 'live') && (
            <>
              <button aria-label={muted ? 'Unmute' : 'Mute'} onClick={() => setMuted(!muted)} className={`w-10 h-10 rounded-full flex items-center justify-center ${muted ? 'bg-white text-[#213343]' : 'bg-[#425B76]'}`}><Mic size={17} /></button>
              <button data-agent="hs-dialer-hangup" aria-label="Hang up" onClick={hangup} className="w-12 h-12 rounded-full bg-[#F2545B] flex items-center justify-center"><PhoneOff size={20} /></button>
            </>
          )}
        </div>
      </div>
      {(state === 'live' || state === 'ended') && (
        <Field label="Notes"><textarea data-agent="hs-dialer-notes" aria-label="Call notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full p-3 rounded-[3px] border border-[#CBD6E2] bg-[#F5F8FA] text-[14px] outline-none focus:border-[#00A4BD] focus:bg-white" placeholder="What was discussed?" /></Field>
      )}
      {state === 'ended' && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Call outcome"><select data-agent="hs-dialer-outcome" aria-label="Call outcome" value={outcome} onChange={(e) => setOutcome(e.target.value)} className={`${inputH} w-full`}>{OUTCOMES.map((o) => <option key={o}>{o}</option>)}</select></Field>
          <Field label="Associated deal"><select aria-label="Associated deal" value={deal} onChange={(e) => setDeal(e.target.value)} className={`${inputH} w-full`}><option value="">None</option>{theirDeals.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field>
        </div>
      )}
    </Modal>
  )
}

/* ───────────────────────── meetings ───────────────────────── */

const dayKey = (iso: string) => new Date(iso).toDateString()
const dayLabel = (iso: string) => {
  const d = new Date(iso)
  const t = new Date()
  const diff = Math.round((new Date(d.toDateString()).getTime() - new Date(t.toDateString()).getTime()) / 86_400_000)
  const base = d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
  return diff === 0 ? `Today · ${base}` : diff === 1 ? `Tomorrow · ${base}` : diff === -1 ? `Yesterday · ${base}` : base
}

export function MeetingsPage() {
  const { open, go, toast } = useHNav()
  const meetings = useCollection<any>('hubspot.meetings')
  const contacts = useCollection<any>('hubspot.contacts')
  const deals = useCollection<any>('hubspot.deals')
  const [tab, setTab] = useState<'Upcoming' | 'Past'>('Upcoming')
  const [owner, setOwner] = useState('')
  const now = Date.now()
  const end = (m: any) => +new Date(m.start) + m.mins * 60_000
  const rows = meetings
    .filter((m) => (!owner || m.ownerId === owner) && (tab === 'Upcoming' ? end(m) >= now && m.outcome !== 'Canceled' : end(m) < now || m.outcome === 'Canceled'))
    .sort((a, b) => (tab === 'Upcoming' ? 1 : -1) * (+new Date(a.start) - +new Date(b.start)))
  const groups: [string, any[]][] = []
  rows.forEach((m) => {
    const k = dayKey(m.start)
    const g = groups.find(([x]) => x === k)
    g ? g[1].push(m) : groups.push([k, [m]])
  })
  const thisWeek = meetings.filter((m) => Math.abs(+new Date(m.start) - now) < 7 * 86_400_000)
  const past = meetings.filter((m) => end(m) < now)
  const setOutcome = (m: any, outcome: string) => {
    db.update('hubspot.meetings', m.id, { outcome })
    logActivity('hubspot.contacts', m.contactId, { type: 'meeting', title: `Meeting outcome: ${outcome}`, body: m.title })
    toast(`Meeting marked as ${outcome.toLowerCase()}.`)
  }
  const link = `meetings.hubspot.com/${ME.name.toLowerCase().replace(/\s+/g, '-')}`

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-medium">Meetings</h1>
          <div className="text-[13px] text-[#516F90]">Scheduled and past meetings with contacts.</div>
        </div>
        <HBtn variant="primary" agent="hs-meeting-new" onClick={() => open(<ScheduleMeeting onClose={() => open(null)} />)}><Plus size={15} /> Schedule meeting</HBtn>
      </div>
      <div className="grid grid-cols-4 gap-3">
        <Kpi label="Upcoming" value={String(meetings.filter((m) => end(m) >= now && m.outcome === 'Scheduled').length)} sub="Scheduled meetings" />
        <Kpi label="This week" value={String(thisWeek.length)} sub="±7 days" />
        <Kpi label="Completion rate" value={past.length ? `${Math.round((past.filter((m) => m.outcome === 'Completed').length / past.length) * 100)}%` : '--'} sub="Past meetings held" />
        <div className="bg-white border border-[#DFE3EB] rounded-[4px] px-4 py-3">
          <div className="text-[12px] font-semibold uppercase tracking-wide text-[#516F90]">Your scheduling page</div>
          <div className="mt-1 text-[13px] text-[#0091AE] truncate">{link}</div>
          <button data-agent="hs-meeting-copy-link" onClick={() => { navigator.clipboard?.writeText(`https://${link}`).catch(() => {}); toast('Meeting link copied.') }} className="mt-1 text-[12.5px] font-medium text-[#33475B] flex items-center gap-1 hover:underline"><Copy size={12} /> Copy link</button>
        </div>
      </div>
      <div className="bg-white border border-[#DFE3EB] rounded-[4px]">
        <div className="flex items-center gap-4 px-4 border-b border-[#DFE3EB]">
          {(['Upcoming', 'Past'] as const).map((t) => (
            <button key={t} data-agent={`hs-meetings-tab-${t.toLowerCase()}`} onClick={() => setTab(t)} className={`h-11 text-[14px] font-medium border-b-[3px] ${tab === t ? 'border-[#FF5C35]' : 'border-transparent text-[#516F90]'}`}>{t}</button>
          ))}
          <select aria-label="Owner" value={owner} onChange={(e) => setOwner(e.target.value)} className={`${inputH} h-8 text-[13px] ml-auto`}><option value="">All owners</option>{OWNERS.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select>
        </div>
        {groups.map(([k, ms]) => (
          <div key={k}>
            <div className="px-4 h-9 flex items-center bg-[#F5F8FA] border-b border-[#DFE3EB] text-[12.5px] font-semibold text-[#516F90]">{dayLabel(ms[0].start)}</div>
            {ms.map((m) => {
              const c = contacts.find((x) => x.id === m.contactId)
              const d = m.dealId ? deals.find((x) => x.id === m.dealId) : undefined
              const [bg, fg] = mtgColor[m.outcome] ?? mtgColor.Scheduled
              const Loc = m.location === 'Zoom' ? Video : m.location === 'Phone' ? Phone : MapPin
              return (
                <div key={m.id} className="flex items-center gap-4 px-4 py-3 border-b border-[#DFE3EB]" data-agent={`hs-meeting-row-${m.id}`}>
                  <div className="w-[92px] shrink-0 text-[13px]">
                    <div className="font-semibold">{new Date(m.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</div>
                    <div className="text-[#516F90]">{m.mins} min</div>
                  </div>
                  <div className="w-1 self-stretch rounded bg-[#00A4BD]" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-medium truncate">{m.title}</div>
                    <div className="text-[12.5px] text-[#516F90] flex items-center gap-3 mt-0.5">
                      <span className="flex items-center gap-1"><Loc size={12} /> {m.location}</span>
                      {c && <HLink className="text-[12.5px]" onClick={() => go({ page: 'contact', id: c.id })}>{fullName(c)}</HLink>}
                      {d && <HLink className="text-[12.5px] truncate" onClick={() => go({ page: 'deal', id: d.id })}>{d.name}</HLink>}
                    </div>
                    {m.notes && <div className="text-[12.5px] text-[#516F90] mt-1 truncate">{m.notes}</div>}
                  </div>
                  <div className="flex items-center gap-1.5 text-[12.5px] text-[#516F90] w-[140px]"><Initials name={person(m.ownerId).name} size={20} /> {person(m.ownerId).name}</div>
                  {tab === 'Past' || +new Date(m.start) < now ? (
                    <select aria-label="Meeting outcome" data-agent={`hs-meeting-outcome-${m.id}`} value={m.outcome} onChange={(e) => setOutcome(m, e.target.value)} className="h-7 px-2 rounded-[3px] text-[12px] font-medium border-0 outline-none" style={{ background: bg, color: fg }}>
                      {Object.keys(mtgColor).map((o) => <option key={o}>{o}</option>)}
                    </select>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Pill color={bg} text={fg}>{m.outcome}</Pill>
                      <button aria-label="Cancel meeting" onClick={() => setOutcome(m, 'Canceled')} className="text-[12.5px] text-[#C93B44] hover:underline">Cancel</button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
        {!groups.length && <div className="p-10 text-center text-[#516F90] flex flex-col items-center gap-2"><Calendar size={28} className="text-[#CBD6E2]" />No {tab.toLowerCase()} meetings.</div>}
      </div>
    </div>
  )
}

export function ScheduleMeeting({ onClose, contactId: initial, dealId }: { onClose: () => void; contactId?: string; dealId?: string }) {
  const { toast } = useHNav()
  const { isAgent } = useDesk()
  const contacts = useCollection<any>('hubspot.contacts')
  const deals = useCollection<any>('hubspot.deals')
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)
  const [v, setV] = useState({ title: '', contactId: initial ?? '', dealId: dealId ?? '', date: tomorrow, time: '10:00', mins: '30', location: 'Zoom', notes: '' })
  const set = (k: keyof typeof v, x: string) => setV((s) => ({ ...s, [k]: x }))
  const c = contacts.find((x) => x.id === v.contactId)
  const theirDeals = deals.filter((d) => c && (d.companyName === c.company || c.company?.startsWith(d.companyName)))
  const save = () => {
    scheduleMeeting({ title: v.title, contactId: v.contactId, dealId: v.dealId || undefined, ownerId: ME.id, start: new Date(`${v.date}T${v.time}`).toISOString(), mins: Number(v.mins), location: v.location, notes: v.notes, by: isAgent ? 'hworker' : undefined })
    toast('Meeting scheduled.')
    onClose()
  }
  return (
    <Modal title="Schedule meeting" onClose={onClose} agent="hs-schedule-meeting" footer={<><HBtn variant="primary" small agent="hs-meeting-save" disabled={!v.title.trim() || !v.contactId} onClick={save}>Schedule</HBtn><HBtn variant="secondary" small onClick={onClose}>Cancel</HBtn></>}>
      <Field label="Meeting name"><input data-agent="hs-meeting-title" aria-label="Meeting name" value={v.title} onChange={(e) => set('title', e.target.value)} className={`${inputH} w-full`} placeholder={c ? `${c.company} — intro` : ''} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Contact"><select data-agent="hs-meeting-contact" aria-label="Contact" value={v.contactId} onChange={(e) => setV((s) => ({ ...s, contactId: e.target.value, dealId: '' }))} className={`${inputH} w-full`}><option value="">Select a contact</option>{contacts.map((x) => <option key={x.id} value={x.id}>{fullName(x)}</option>)}</select></Field>
        <Field label="Deal (optional)"><select aria-label="Deal" value={v.dealId} onChange={(e) => set('dealId', e.target.value)} className={`${inputH} w-full`}><option value="">None</option>{theirDeals.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Date"><input data-agent="hs-meeting-date" aria-label="Date" type="date" value={v.date} onChange={(e) => set('date', e.target.value)} className={`${inputH} w-full`} /></Field>
        <Field label="Time"><input aria-label="Time" type="time" value={v.time} onChange={(e) => set('time', e.target.value)} className={`${inputH} w-full`} /></Field>
        <Field label="Duration"><select aria-label="Duration" value={v.mins} onChange={(e) => set('mins', e.target.value)} className={`${inputH} w-full`}>{['15', '30', '45', '60', '90'].map((o) => <option key={o} value={o}>{o} min</option>)}</select></Field>
      </div>
      <Field label="Location"><select aria-label="Location" value={v.location} onChange={(e) => set('location', e.target.value)} className={`${inputH} w-full`}>{['Zoom', 'Phone', 'Microsoft Teams', 'In person'].map((o) => <option key={o}>{o}</option>)}</select></Field>
      <Field label="Description"><textarea aria-label="Description" value={v.notes} onChange={(e) => set('notes', e.target.value)} rows={3} className="w-full p-3 rounded-[3px] border border-[#CBD6E2] bg-[#F5F8FA] text-[14px] outline-none focus:border-[#00A4BD] focus:bg-white" /></Field>
    </Modal>
  )
}
