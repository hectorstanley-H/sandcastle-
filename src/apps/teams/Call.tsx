import { useEffect, useState } from 'react'
import {
  Mic20Regular,
  MicOff20Regular,
  Video20Regular,
  VideoOff20Regular,
  ShareScreenStart20Regular,
  HandRight20Regular,
  Chat20Regular,
  People20Regular,
  CallEnd20Regular,
} from '@fluentui/react-icons'
import { Avatar } from '@/components/Avatar'
import { ME, person } from '@/data/people'
import { PURPLE, fmtDuration } from './ui'

export interface CallState {
  kind: 'call' | 'meeting'
  title: string
  participants: string[]
  video: boolean
  conversationId?: string
  /** dialed number for PSTN calls */
  number?: string
}

/** Full-surface call / meeting stage with a pre-join step for meetings. */
export function CallStage({ call, onLeave }: { call: CallState; onLeave: (seconds: number, joined: boolean) => void }) {
  const [joined, setJoined] = useState(call.kind === 'call')
  const [mic, setMic] = useState(true)
  const [cam, setCam] = useState(call.video)
  const [sharing, setSharing] = useState(false)
  const [hand, setHand] = useState(false)
  const [side, setSide] = useState<'people' | 'chat' | null>(null)
  const [secs, setSecs] = useState(0)
  const [connected, setConnected] = useState(call.kind === 'meeting')

  useEffect(() => {
    if (!joined) return
    const t = setInterval(() => setSecs((s) => s + 1), 1000)
    const c = setTimeout(() => setConnected(true), 1800)
    return () => {
      clearInterval(t)
      clearTimeout(c)
    }
  }, [joined])

  const others = call.participants.filter((p) => p !== ME.id)

  if (!joined)
    return (
      <div className="absolute inset-0 z-40 bg-[#F5F5F5] flex flex-col items-center justify-center" data-agent="teams-prejoin">
        <div className="text-[20px] font-semibold mb-1">{call.title}</div>
        <div className="text-[13px] text-[#616161] mb-5">Choose your video and audio options</div>
        <div className="w-[520px] h-[290px] rounded-lg bg-[#292929] flex items-center justify-center relative overflow-hidden">
          {cam ? <Avatar id={ME.id} size={110} /> : <div className="text-white/70 text-[14px]">Your camera is turned off</div>}
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-6 text-white text-[13px]">
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={cam} onChange={(e) => setCam(e.target.checked)} className="accent-[#5B5FC7]" /> Camera</label>
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={mic} onChange={(e) => setMic(e.target.checked)} className="accent-[#5B5FC7]" /> Microphone</label>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button className="h-9 px-4 rounded-md border border-[#D1D1D1] bg-white text-[14px] hover:bg-[#F0F0F0]" onClick={() => onLeave(0, false)}>Cancel</button>
          <button data-agent="teams-join-now" className="h-9 px-6 rounded-md text-white text-[14px] font-semibold" style={{ background: PURPLE }} onClick={() => setJoined(true)}>Join now</button>
        </div>
      </div>
    )

  const tiles = [ME.id, ...others]
  const ctl = (on: boolean) => `h-12 w-14 rounded-md flex flex-col items-center justify-center gap-0.5 text-[10.5px] ${on ? 'bg-white/15 text-white' : 'text-white/85 hover:bg-white/10'}`
  return (
    <div className="absolute inset-0 z-40 bg-[#1F1F1F] flex flex-col text-white" data-agent="teams-call">
      <div className="h-14 shrink-0 flex items-center px-4 gap-3 border-b border-white/10">
        <span className="text-[14px] font-semibold truncate">{call.title}</span>
        <span className="text-[13px] text-white/70 tabular-nums">{connected ? fmtDuration(secs).replace('m ', ':').replace('s', '') : 'Calling…'}</span>
        <div className="flex-1" />
        <button className={ctl(side === 'chat')} onClick={() => setSide((s) => (s === 'chat' ? null : 'chat'))} aria-label="Chat"><Chat20Regular />Chat</button>
        <button className={ctl(side === 'people')} onClick={() => setSide((s) => (s === 'people' ? null : 'people'))} aria-label="People"><People20Regular />People</button>
        <button className={ctl(hand)} onClick={() => setHand((h) => !h)} aria-label="Raise hand"><HandRight20Regular />{hand ? 'Lower' : 'Raise'}</button>
        <span className="w-px h-8 bg-white/15 mx-1" />
        <button className={ctl(cam)} onClick={() => setCam((c) => !c)} aria-label={cam ? 'Turn camera off' : 'Turn camera on'}>{cam ? <Video20Regular /> : <VideoOff20Regular />}Camera</button>
        <button className={ctl(mic)} onClick={() => setMic((m) => !m)} aria-label={mic ? 'Mute' : 'Unmute'}>{mic ? <Mic20Regular /> : <MicOff20Regular />}Mic</button>
        <button className={ctl(sharing)} onClick={() => setSharing((s) => !s)} aria-label="Share"><ShareScreenStart20Regular />Share</button>
        <button data-agent="teams-call-leave" className="h-9 px-4 ml-2 rounded-md bg-[#C4314B] hover:bg-[#A72037] text-white text-[13px] font-semibold flex items-center gap-1.5" onClick={() => onLeave(secs, true)}>
          <CallEnd20Regular /> Leave
        </button>
      </div>
      {sharing && <div className="shrink-0 h-8 bg-[#C4314B] text-[12.5px] flex items-center justify-center gap-3">You’re presenting your screen <button className="underline" onClick={() => setSharing(false)}>Stop presenting</button></div>}
      <div className="flex-1 min-h-0 flex">
        <div className="flex-1 p-4 grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(3, Math.max(1, Math.ceil(Math.sqrt(tiles.length))))}, minmax(0, 1fr))` }}>
          {tiles.map((id) => {
            const isMe = id === ME.id
            const label = isMe ? `${ME.name} (You)` : id.startsWith('+') ? id : person(id).name
            const dim = !isMe && !connected
            return (
              <div key={id} className={`relative rounded-lg bg-[#2D2D2D] flex items-center justify-center min-h-[140px] ${dim ? 'opacity-60' : ''}`}>
                {id.startsWith('+') ? <div className="w-20 h-20 rounded-full bg-[#3D3D3D] flex items-center justify-center text-[22px]">☎</div> : <Avatar id={id} size={isMe && cam ? 96 : 80} />}
                <div className="absolute left-2 bottom-2 h-6 px-2 rounded bg-black/50 text-[12px] flex items-center gap-1.5">
                  {isMe && !mic && <MicOff20Regular className="w-3.5 h-3.5" />}
                  {isMe && hand && <span>✋</span>}
                  {label}
                </div>
                {dim && <div className="absolute top-2 right-2 text-[11px] text-white/70">Ringing…</div>}
              </div>
            )
          })}
        </div>
        {side && (
          <div className="w-[300px] shrink-0 bg-[#292929] border-l border-white/10 p-4 overflow-auto">
            <div className="text-[14px] font-semibold mb-3">{side === 'people' ? `Participants (${tiles.length})` : 'Meeting chat'}</div>
            {side === 'people' ? (
              tiles.map((id) => (
                <div key={id} className="flex items-center gap-2 h-10">
                  {id.startsWith('+') ? <span className="w-7 h-7 rounded-full bg-[#3D3D3D] flex items-center justify-center text-[12px]">☎</span> : <Avatar id={id} size={28} />}
                  <span className="text-[13px] flex-1 truncate">{id === ME.id ? `${ME.name} (You)` : id.startsWith('+') ? id : person(id).name}</span>
                  {id === ME.id && !mic && <MicOff20Regular className="w-4 h-4 text-white/60" />}
                </div>
              ))
            ) : (
              <div className="text-[12.5px] text-white/60">Messages sent here are shared with everyone in the {call.kind === 'meeting' ? 'meeting' : 'call'}.</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
