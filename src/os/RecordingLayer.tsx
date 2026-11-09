/**
 * Drawn over the user's main desktop while H-Worker observes a person doing a process: a red
 * screen-recording frame, the recording pill at the top (timer, live captured events, Stop) and
 * the operator's pointer.
 */
import { useEffect, useState } from 'react'
import { useRec } from '@/agent/recorder'
import { useRuns, type Run } from '@/agent/runs'
import { getApp, logoUrl } from './registry'
import { OPERATOR, stopRecording } from '@/apps/hworker/discovery/driver'

export function RecordingLayer() {
  const phase = useRec((s) => s.phase)
  const runId = useRec((s) => s.runId)
  const run = useRuns((s) => (runId ? s.runs[runId] : undefined))
  if (!run || (phase !== 'arming' && phase !== 'recording')) return null
  const rec = phase === 'recording'
  return (
    <>
      {rec && (
        <>
          <div className="absolute inset-0 z-[99990] cursor-not-allowed" title="Recording — H-Worker is observing this screen" />
          <div className="absolute inset-0 z-[99991] pointer-events-none rec-frame" style={{ boxShadow: 'inset 0 0 0 3px rgba(229,57,53,0.85)' }} />
          <RecPill run={run} />
        </>
      )}
      <OperatorCursor run={run} arming={!rec} />
    </>
  )
}

function useTick() {
  const [, f] = useState(0)
  useEffect(() => {
    const t = setInterval(() => f((x) => x + 1), 500)
    return () => clearInterval(t)
  }, [])
}

function RecPill({ run }: { run: Run }) {
  useTick()
  const startedAt = useRec((s) => s.startedAt) ?? Date.now()
  const s = Math.max(0, Math.floor((Date.now() - startedAt) / 1000))
  const events = run.log.filter((l) => l.kind === 'action' || l.kind === 'open' || (l.kind === 'info' && l.text.startsWith('Reading: ')))
  const apps = new Set(events.map((e) => e.appId).filter(Boolean))
  const recent = events.slice(-3)
  return (
    <div className="absolute top-2.5 inset-x-0 z-[99995] flex flex-col items-center gap-1.5 rec-drop pointer-events-none [&>*]:pointer-events-auto" style={{ fontFamily: 'var(--font-brand)' }}>
      <div className="h-11 pl-3 pr-1.5 rounded-full flex items-center gap-3 text-white shadow-[0_10px_30px_rgba(0,0,0,0.35)]" style={{ background: 'rgba(15,14,18,0.92)', backdropFilter: 'blur(16px)' }}>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#E53935] rec-dot" />
          <span className="text-[11px] font-bold tracking-[0.12em]" style={{ fontFamily: 'var(--font-mono)' }}>REC</span>
          <span className="text-[13px] font-semibold tabular-nums w-[38px]" style={{ fontFamily: 'var(--font-mono)' }}>{Math.floor(s / 60)}:{String(s % 60).padStart(2, '0')}</span>
        </span>
        <span className="w-px h-5 bg-white/15" />
        <span className="flex items-center gap-2 text-[12.5px]">
          <img src={logoUrl('hworker')} className="w-5 h-5 rounded-md" alt="" />
          <span><b>H-Worker is observing</b> <span className="text-white/60">· {OPERATOR.name}, {OPERATOR.role}</span></span>
        </span>
        <span className="w-px h-5 bg-white/15" />
        <span className="text-[12px] text-white/70 tabular-nums"><b className="text-white">{events.length}</b> events · <b className="text-white">{apps.size}</b> apps</span>
        <button
          data-agent="rec-stop"
          aria-label="Stop recording"
          onClick={stopRecording}
          className="h-8 pl-2.5 pr-3.5 rounded-full bg-white text-[#0F0E12] text-[12px] font-bold flex items-center gap-1.5 hover:bg-white/90"
        >
          <span className="w-2.5 h-2.5 rounded-[2px] bg-[#E53935]" /> Stop
        </button>
      </div>
      <div className="flex flex-col items-center gap-1">
        {recent.map((e, i) => {
          const app = e.appId ? getApp(e.appId) : undefined
          return (
            <div
              key={e.id}
              className="h-7 pl-1.5 pr-3 rounded-full flex items-center gap-1.5 text-[11.5px] text-white shadow-lg rec-event"
              style={{ background: 'rgba(15,14,18,0.78)', backdropFilter: 'blur(12px)', opacity: 0.45 + (i / Math.max(1, recent.length - 1)) * 0.55 }}
            >
              {app ? <img src={app.icon} className="w-4 h-4" alt="" /> : <span className="w-4 h-4 rounded-full bg-white/20" />}
              <span className="text-white/55" style={{ fontFamily: 'var(--font-mono)' }}>captured</span>
              <span className="max-w-[420px] truncate">{e.text.replace(/^Reading: /, 'Reads ')}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** the observed person's pointer (purple H-Worker tag while it arms the recorder) */
function OperatorCursor({ run, arming }: { run: Run; arming: boolean }) {
  const c = run.cursor
  const [ripples, setRipples] = useState<number[]>([])
  useEffect(() => {
    if (!c.clicks) return
    setRipples((r) => (r.includes(c.clicks) ? r : [...r.slice(-2), c.clicks]))
    const t = setTimeout(() => setRipples((r) => r.filter((x) => x !== c.clicks)), 650)
    return () => clearTimeout(t)
  }, [c.clicks])
  if (!c.visible) return null
  return (
    <div className="absolute left-0 top-0 z-[99999] pointer-events-none" style={{ transform: `translate(${c.x}px, ${c.y}px)`, transition: `transform ${c.dur}ms cubic-bezier(.35,.75,.25,1)` }}>
      {ripples.map((k) => (
        <span key={k} className={`absolute -left-5 -top-5 w-10 h-10 rounded-full border-2 agent-ripple ${arming ? 'border-[#7114EB]' : 'border-[#E53935]'}`} />
      ))}
      <svg width="24" height="28" viewBox="0 0 22 26" className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.45)]" style={{ marginLeft: -3, marginTop: -2 }}>
        <path d="M2 1.5 L2 20.5 L7.2 15.8 L10.6 23.6 L14 22.1 L10.7 14.5 L17.8 14.3 Z" fill="#fff" stroke="#0F0E12" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
      <div
        className="absolute left-5 top-6 w-max flex items-center gap-1.5 pl-1 pr-2.5 h-[24px] rounded-full text-white text-[11.5px] font-semibold whitespace-nowrap shadow-lg"
        style={{ background: arming ? '#430693' : '#2B2A33', fontFamily: 'var(--font-brand)' }}
      >
        {arming ? (
          <img src={logoUrl('hworker')} className="w-[17px] h-[17px] rounded-full" alt="" />
        ) : (
          <span className="w-[17px] h-[17px] rounded-full bg-[#0B6A6A] text-[8.5px] font-bold flex items-center justify-center">{OPERATOR.initials}</span>
        )}
        {arming ? 'H-Worker' : OPERATOR.name}
        {c.typing && <span className="typing-dots ml-0.5"><i /><i /><i /></span>}
      </div>
    </div>
  )
}
