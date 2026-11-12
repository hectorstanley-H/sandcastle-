import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronUp, Circle, CircleStop, Hand, MessageCircle, Mic, MicOff, MonitorUp, Send, ShieldCheck, Smile, Users, Video, VideoOff, X } from 'lucide-react'
import { db, uid } from '@/db/db'
import { useDesk } from '@/os/context'
import { Avatar } from '@/components/Avatar'
import { ME, PEOPLE, person, personByEmail } from '@/data/people'
import { ZModal, btnPrimary, btnSecondary, copyText, genRecording, inviteLink, usePrefs, useZoom, type LiveMeeting } from './shared'

const REACTIONS = ['👏', '👍', '❤️', '😂', '😮', '🎉']
const SHARE_TARGETS = ['Screen 1', 'Salesforce — Opportunities', 'Outlook — Inbox', 'Tableau — Sales Pipeline Overview', 'Whiteboard']

/** turns a participant token (person id, email or plain name) into a display name + avatar id */
const resolve = (t: string) => {
  const p = PEOPLE.find((x) => x.id === t) ?? (t.includes('@') ? personByEmail(t) : PEOPLE.find((x) => x.name === t))
  return { key: t, name: p?.name ?? t, id: p?.id }
}

export function InMeeting({ m, onLeave }: { m: LiveMeeting; onLeave: () => void }) {
  const { isAgent } = useDesk()
  const { toast, openRecording } = useZoom()
  const [prefs] = usePrefs()
  const people = useMemo(() => {
    const list = [ME.id, ...m.participants.filter((p) => p !== ME.id && p !== ME.email && p !== ME.name)]
    return list.map(resolve)
  }, [m])
  const [muted, setMuted] = useState(prefs.muteOnJoin ?? true)
  const [video, setVideo] = useState(!(prefs.videoOffOnJoin ?? false))
  const [sharing, setSharing] = useState<string | null>(null)
  const [picker, setPicker] = useState(!!m.shareOnStart)
  const [panel, setPanel] = useState<'participants' | 'chat' | null>(null)
  const [react, setReact] = useState(false)
  const [floating, setFloating] = useState<{ id: number; e: string }[]>([])
  const [hand, setHand] = useState(false)
  const [recStart, setRecStart] = useState<number | null>(null)
  const [recSecs, setRecSecs] = useState(0)
  const [chat, setChat] = useState<{ from: string; text: string; at: string }[]>([])
  const [text, setText] = useState('')
  const [leave, setLeave] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [speaker, setSpeaker] = useState(0)
  const startedAt = useRef(Date.now())
  const recorded = useRef(0)

  useEffect(() => {
    const t = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt.current) / 1000))
      setSpeaker((s) => (people.length > 1 ? (s + 1) % people.length : 0))
    }, 1000)
    return () => clearInterval(t)
  }, [people.length])
  useEffect(() => {
    if (recStart == null) return
    const t = setInterval(() => setRecSecs(recorded.current + Math.floor((Date.now() - recStart) / 1000)), 500)
    return () => clearInterval(t)
  }, [recStart])

  const clock = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  const toggleRec = () => {
    if (recStart == null) {
      setRecStart(Date.now())
      toast('Recording to the cloud…')
    } else {
      recorded.current += Math.floor((Date.now() - recStart) / 1000)
      setRecStart(null)
      toast('Recording stopped. It will be available after the meeting ends.')
    }
  }
  const sendChat = () => {
    if (!text.trim()) return
    setChat((c) => [...c, { from: ME.name, text: text.trim(), at: new Date().toISOString() }])
    setText('')
  }
  const sendReaction = (e: string) => {
    const id = Date.now()
    setFloating((f) => [...f, { id, e }])
    setTimeout(() => setFloating((f) => f.filter((x) => x.id !== id)), 2600)
    setReact(false)
  }
  const finish = () => {
    let secs = recorded.current + (recStart != null ? Math.floor((Date.now() - recStart) / 1000) : 0)
    const hadRecording = recStart != null || recorded.current > 0
    if (hadRecording) {
      secs = Math.max(secs, 5)
      const id = uid('zr')
      const g = genRecording(m.topic, people.map((p) => p.name), chat, secs)
      db.insert('zoom.recordings', { id, topic: m.topic, date: new Date(startedAt.current).toISOString(), participants: people.map((p) => p.name), meetingId: m.meetingId, ...g, createdBy: isAgent ? 'hworker' : undefined }, { prepend: true })
      onLeave()
      toast('Cloud recording is ready — AI Companion summary generated')
      openRecording(id)
      return
    }
    onLeave()
  }

  const ctl = 'w-[76px] h-[56px] rounded-[8px] flex flex-col items-center justify-center gap-0.5 text-[11px] text-white hover:bg-white/10'
  const cols = people.length <= 1 ? 1 : people.length <= 4 ? 2 : 3
  return (
    <div className="absolute inset-0 z-[55] bg-[#1A1A1A] flex flex-col text-white" data-agent="zoom-in-meeting">
      {/* top bar */}
      <div className="h-10 shrink-0 flex items-center px-4 gap-3 text-[12.5px] text-[#C9CDD3]">
        <ShieldCheck size={15} className="text-[#00A35C]" />
        <span className="font-semibold text-white truncate">{m.topic}</span>
        {recStart != null && (
          <span className="flex items-center gap-1 text-[#FF5A5A]">
            <Circle size={9} className="fill-current animate-pulse" /> Recording {clock(recSecs)}
          </span>
        )}
        <div className="flex-1" />
        <span>{clock(elapsed)}</span>
      </div>
      <div className="flex-1 min-h-0 flex">
        <div className="flex-1 min-w-0 p-3 relative">
          {sharing ? (
            <div className="h-full flex gap-3">
              <div className="flex-1 rounded-[8px] bg-[#F3F4F6] text-[#131619] flex flex-col overflow-hidden border-4 border-[#00A35C]">
                <div className="h-8 bg-[#E5E7EB] flex items-center px-3 text-[12px] gap-2">
                  <MonitorUp size={13} /> You are sharing: <b>{sharing}</b>
                  <div className="flex-1" />
                  <button onClick={() => setSharing(null)} className="h-6 px-3 rounded bg-[#E02828] text-white text-[11.5px] font-semibold" data-agent="zoom-live-stop-share">Stop Share</button>
                </div>
                <div className="flex-1 p-6 grid grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="rounded-[6px] bg-white border border-[#E4E4ED] p-3">
                      <div className="h-2.5 w-2/3 rounded bg-[#D5D7E0] mb-2" />
                      <div className="h-2 w-1/2 rounded bg-[#E4E4ED] mb-4" />
                      <div className="flex items-end gap-1 h-16">{[0.4, 0.7, 0.5, 0.9, 0.6].map((h, j) => <div key={j} className="flex-1 bg-[#0B5CFF]/60" style={{ height: `${h * 100}%` }} />)}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="w-[180px] flex flex-col gap-2 overflow-auto">
                {people.map((p, i) => <Tile key={p.key} p={p} me={i === 0} muted={i === 0 ? muted : i % 3 === 2} video={i === 0 ? video : true} speaking={i === speaker && !(i === 0 && muted)} hand={i === 0 && hand} small />)}
              </div>
            </div>
          ) : (
            <div className="h-full grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gridAutoRows: '1fr' }}>
              {people.map((p, i) => <Tile key={p.key} p={p} me={i === 0} muted={i === 0 ? muted : i % 3 === 2} video={i === 0 ? video : true} speaking={i === speaker && !(i === 0 && muted)} hand={i === 0 && hand} />)}
            </div>
          )}
          <div className="pointer-events-none absolute bottom-4 left-6 flex flex-col-reverse gap-1">
            {floating.map((f) => (
              <span key={f.id} className="text-[34px] animate-bounce">{f.e}</span>
            ))}
          </div>
        </div>
        {panel && (
          <div className="w-[300px] shrink-0 bg-white text-[#131619] flex flex-col" data-agent={`zoom-live-panel-${panel}`}>
            <div className="h-11 px-4 flex items-center border-b border-[#E4E4ED]">
              <span className="font-bold text-[14px] flex-1">{panel === 'participants' ? `Participants (${people.length})` : 'Meeting chat'}</span>
              <button onClick={() => setPanel(null)} aria-label="Close panel"><X size={16} /></button>
            </div>
            {panel === 'participants' ? (
              <div className="flex-1 overflow-auto py-2 text-[13.5px]">
                {people.map((p, i) => (
                  <div key={p.key} className="px-4 h-10 flex items-center gap-2">
                    <Avatar id={p.id} name={p.name} size={26} />
                    <span className="flex-1 truncate">{p.name}{i === 0 ? ' (Host, me)' : ''}</span>
                    {i === 0 && hand && <Hand size={14} className="text-[#F5A623]" />}
                    {(i === 0 ? muted : i % 3 === 2) ? <MicOff size={14} className="text-[#E02828]" /> : <Mic size={14} className="text-[#6E7680]" />}
                    {(i === 0 ? video : true) ? <Video size={14} className="text-[#6E7680]" /> : <VideoOff size={14} className="text-[#E02828]" />}
                  </div>
                ))}
                <div className="px-4 pt-3 flex gap-2">
                  <button onClick={() => toast('Everyone except you is muted')} className="h-8 px-3 rounded-[8px] border border-[#D5D7E0] text-[12.5px] font-medium">Mute all</button>
                  <button onClick={() => { const mt = m.meetingId ? db.get<any>('zoom.meetings').find((x) => x.id === m.meetingId) : null; copyText(mt ? inviteLink(mt) : 'https://northwind.zoom.us/j/4820193375'); toast('Invite link copied to clipboard') }} className="h-8 px-3 rounded-[8px] border border-[#D5D7E0] text-[12.5px] font-medium">Invite</button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-auto p-4 space-y-3 text-[13px]">
                  {!chat.length && <div className="text-[#6E7680] text-center pt-8">Messages addressed to “Everyone” will also appear in the meeting summary.</div>}
                  {chat.map((c, i) => (
                    <div key={i}><div className="text-[11.5px] text-[#6E7680]">{c.from} to Everyone · {new Date(c.at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</div><div className="mt-0.5 inline-block rounded-[8px] bg-[#F1F3F7] px-3 py-1.5">{c.text}</div></div>
                  ))}
                </div>
                <div className="m-3 rounded-[8px] border border-[#D5D7E0] flex items-center pr-2">
                  <input data-agent="zoom-live-chat-input" aria-label="Meeting chat message" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendChat()} placeholder="Message Everyone" className="flex-1 h-9 px-3 outline-none text-[13px] bg-transparent" />
                  <button data-agent="zoom-live-chat-send" aria-label="Send meeting chat" onClick={sendChat} className="text-[#0B5CFF]"><Send size={15} /></button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
      {/* control bar */}
      <div className="h-[68px] shrink-0 bg-[#111] flex items-center px-3 gap-1 relative">
        <button data-agent="zoom-live-mute" onClick={() => setMuted(!muted)} className={ctl}>{muted ? <MicOff size={20} className="text-[#E02828]" /> : <Mic size={20} />}{muted ? 'Unmute' : 'Mute'}</button>
        <button data-agent="zoom-live-video" onClick={() => setVideo(!video)} className={ctl}>{video ? <Video size={20} /> : <VideoOff size={20} className="text-[#E02828]" />}{video ? 'Stop Video' : 'Start Video'}</button>
        <div className="flex-1" />
        <button data-agent="zoom-live-participants" onClick={() => setPanel(panel === 'participants' ? null : 'participants')} className={`${ctl} ${panel === 'participants' ? 'bg-white/10' : ''}`}><span className="relative"><Users size={20} /><span className="absolute -top-1.5 -right-3 text-[10px] font-bold">{people.length}</span></span>Participants</button>
        <button data-agent="zoom-live-chat" onClick={() => setPanel(panel === 'chat' ? null : 'chat')} className={`${ctl} ${panel === 'chat' ? 'bg-white/10' : ''}`}><MessageCircle size={20} />Chat</button>
        <div className="relative">
          <button data-agent="zoom-live-react" onClick={() => setReact(!react)} className={ctl}><Smile size={20} />React</button>
          {react && (
            <div className="absolute bottom-[62px] left-1/2 -translate-x-1/2 bg-[#2B2B2B] rounded-[10px] p-2 flex gap-1 shadow-xl">
              {REACTIONS.map((e) => <button key={e} onClick={() => sendReaction(e)} className="w-9 h-9 rounded-[8px] hover:bg-white/10 text-[20px]">{e}</button>)}
              <button onClick={() => { setHand(!hand); setReact(false) }} className="h-9 px-2 rounded-[8px] hover:bg-white/10 text-[12px] flex items-center gap-1"><Hand size={15} /> {hand ? 'Lower' : 'Raise'} hand</button>
            </div>
          )}
        </div>
        <button data-agent="zoom-live-share" onClick={() => (sharing ? setSharing(null) : setPicker(true))} className={`${ctl} ${sharing ? 'text-[#00A35C]' : ''}`}><MonitorUp size={20} className={sharing ? 'text-[#00A35C]' : ''} />{sharing ? 'Stop Share' : 'Share'}</button>
        <button data-agent="zoom-live-record" onClick={toggleRec} className={ctl}>{recStart != null ? <CircleStop size={20} className="text-[#FF5A5A]" /> : <Circle size={20} />}{recStart != null ? 'Stop Recording' : 'Record'}</button>
        <div className="flex-1" />
        <div className="relative">
          <button data-agent="zoom-live-leave" onClick={() => setLeave(!leave)} className="h-9 px-4 rounded-[8px] bg-[#E02828] text-white text-[13px] font-semibold flex items-center gap-1">End <ChevronUp size={13} /></button>
          {leave && (
            <div className="absolute bottom-12 right-0 w-[220px] bg-[#2B2B2B] rounded-[10px] p-2 shadow-xl space-y-1">
              <button data-agent="zoom-live-end-all" onClick={finish} className="w-full h-9 rounded-[8px] bg-[#E02828] text-[13px] font-semibold">End meeting for all</button>
              <button onClick={finish} className="w-full h-9 rounded-[8px] bg-white/10 text-[13px] font-semibold">Leave meeting</button>
            </div>
          )}
        </div>
      </div>
      {picker && (
        <ZModal title="Select a window or an application that you want to share" onClose={() => setPicker(false)} width={600} agent="zoom-share-picker">
          <div className="grid grid-cols-3 gap-3 text-[#131619]">
            {SHARE_TARGETS.map((s) => (
              <button key={s} onClick={() => { setSharing(s); setPicker(false) }} className="rounded-[10px] border border-[#E4E4ED] hover:border-[#0B5CFF] p-2 text-left">
                <div className="h-[70px] rounded-[6px] bg-[#F1F3F7] mb-1.5 flex items-center justify-center text-[#6E7680]"><MonitorUp size={22} /></div>
                <div className="text-[12.5px] font-medium truncate">{s}</div>
              </button>
            ))}
          </div>
        </ZModal>
      )}
    </div>
  )
}

function Tile({ p, me, muted, video, speaking, hand, small }: { p: { name: string; id?: string }; me: boolean; muted: boolean; video: boolean; speaking: boolean; hand: boolean; small?: boolean }) {
  return (
    <div className={`relative rounded-[8px] bg-[#2B2B2B] flex items-center justify-center overflow-hidden ${small ? 'h-[110px] shrink-0' : ''} ${speaking ? 'ring-2 ring-[#00A35C]' : ''}`}>
      {video ? (
        <div className="absolute inset-0" style={{ background: `linear-gradient(160deg, ${p.id ? person(p.id).color : '#3A4A5E'}55, #1E2733 70%)` }} />
      ) : null}
      <Avatar id={p.id} name={p.name} size={small ? 40 : 72} />
      {hand && <span className="absolute top-2 right-2 text-[20px]">✋</span>}
      <span className="absolute bottom-1.5 left-2 flex items-center gap-1 text-[11.5px] bg-black/50 px-1.5 rounded">
        {muted && <MicOff size={11} className="text-[#FF5A5A]" />} {p.name}{me ? ' (me)' : ''}
      </span>
    </div>
  )
}

/** Join a meeting by ID (Home > Join) */
export function JoinModal({ onClose, shareOnly }: { onClose: () => void; shareOnly?: boolean }) {
  const { startMeeting, toast } = useZoom()
  const [id, setId] = useState('')
  const [name, setName] = useState(ME.name)
  const [noAudio, setNoAudio] = useState(false)
  const join = () => {
    const n = id.replace(/\D/g, '')
    if (n.length < 6) {
      toast('Please enter a valid meeting ID or sharing key')
      return
    }
    const mt = db.get<any>('zoom.meetings').find((x) => String(x.meetingNumber ?? '').replace(/\D/g, '') === n)
    onClose()
    startMeeting(mt ? { topic: mt.topic, meetingId: mt.id, participants: mt.attendees ?? [], shareOnStart: shareOnly } : { topic: shareOnly ? 'Screen share' : `Meeting ${id.trim()}`, participants: [], shareOnStart: shareOnly })
    void noAudio
  }
  return (
    <ZModal
      title={shareOnly ? 'Share screen' : 'Join meeting'}
      onClose={onClose}
      width={420}
      agent={shareOnly ? 'zoom-share-modal' : 'zoom-join-modal'}
      footer={
        <>
          <button onClick={onClose} className={btnSecondary}>Cancel</button>
          <button data-agent={shareOnly ? 'zoom-share-confirm' : 'zoom-join-confirm'} disabled={!id.trim()} onClick={join} className={btnPrimary}>{shareOnly ? 'Share' : 'Join'}</button>
        </>
      }
    >
      <div className="space-y-3">
        <input data-agent={shareOnly ? 'zoom-share-key' : 'zoom-join-id'} aria-label={shareOnly ? 'Sharing key or meeting ID' : 'Meeting ID or personal link name'} autoFocus value={id} onChange={(e) => setId(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && join()} placeholder={shareOnly ? 'Enter sharing key or meeting ID' : 'Meeting ID or personal link name'} className="w-full h-10 px-3 rounded-[8px] border border-[#D5D7E0] outline-none focus:border-[#0B5CFF]" />
        {!shareOnly && (
          <>
            <input aria-label="Your name" value={name} onChange={(e) => setName(e.target.value)} className="w-full h-10 px-3 rounded-[8px] border border-[#D5D7E0] outline-none focus:border-[#0B5CFF]" />
            <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={noAudio} onChange={(e) => setNoAudio(e.target.checked)} /> Don’t connect to audio</label>
            <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" /> Turn off my video</label>
          </>
        )}
        <div className="text-[12px] text-[#6E7680]">Tip: paste the meeting ID from an invitation, e.g. one of your upcoming meetings.</div>
      </div>
    </ZModal>
  )
}
