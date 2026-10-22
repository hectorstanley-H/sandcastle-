import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ArrowSquareOut, CheckCircle, CircleNotch, Pause, Play, Sparkle, Stop, WarningCircle, XCircle, ArrowCounterClockwise, Lightning, ShieldCheck } from '@phosphor-icons/react'
import type { AppProps } from '@/os/registry'
import { appIcon, getApp, logoUrl } from '@/os/registry'
import { Desktop } from '@/os/Desktop'
import { WindowControls } from '@/os/Window'
import { useDesk, useWin } from '@/os/context'
import { useWM, wm } from '@/os/wm'
import { cancelRun, useRuns, type Run } from './runs'
import { AGENT_SCREEN, startRun } from './runtime'


function useElapsed(run?: Run) {
  const [, force] = useState(0)
  useEffect(() => {
    if (!run || run.endedAt) return
    const t = setInterval(() => force((x) => x + 1), 1000)
    return () => clearInterval(t)
  }, [run?.endedAt, !!run])
  if (!run) return '0:00'
  const s = Math.floor(((run.endedAt ?? Date.now()) - run.startedAt) / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** The agent's mouse pointer, rendered inside the (scaled) agent desktop. */
function AgentCursor({ run }: { run: Run }) {
  const c = run.cursor
  const [ripples, setRipples] = useState<number[]>([])
  useEffect(() => {
    if (!c.clicks) return
    setRipples((r) => [...r.slice(-2), c.clicks])
    const t = setTimeout(() => setRipples((r) => r.filter((x) => x !== c.clicks)), 650)
    return () => clearTimeout(t)
  }, [c.clicks])
  if (!c.visible) return null
  return (
    <div
      className="absolute left-0 top-0 z-[99999] pointer-events-none"
      style={{ transform: `translate(${c.x}px, ${c.y}px)`, transition: `transform ${c.dur}ms cubic-bezier(.35,.75,.25,1)` }}
    >
      {ripples.map((k) => (
        <span key={k} className="absolute -left-5 -top-5 w-10 h-10 rounded-full border-2 border-[#7114EB] agent-ripple" />
      ))}
      <svg width="26" height="30" viewBox="0 0 22 26" className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.45)]" style={{ marginLeft: -3, marginTop: -2 }}>
        <path d="M2 1.5 L2 20.5 L7.2 15.8 L10.6 23.6 L14 22.1 L10.7 14.5 L17.8 14.3 Z" fill="#fff" stroke="#0F0E12" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
      <div
        className="absolute left-5 top-6 w-max flex items-center gap-1.5 pl-1.5 pr-2.5 h-[26px] rounded-full text-white text-[12px] font-semibold whitespace-nowrap shadow-lg"
        style={{ background: '#430693', fontFamily: 'var(--font-brand)' }}
      >
        <img src={logoUrl('hworker')} className="w-[18px] h-[18px] rounded-full" alt="" />
        {run.name}
        {c.typing && <span className="typing-dots ml-0.5"><i /><i /><i /></span>}
      </div>
    </div>
  )
}

function BootOverlay({ run }: { run: Run }) {
  return (
    <div className="absolute inset-0 z-[99998] flex flex-col items-center justify-center text-white" style={{ background: '#0F0E12' }}>
      <div className="absolute inset-0" style={{ background: 'radial-gradient(900px 500px at 100% 0%, rgba(113,20,235,0.5), transparent 70%)' }} />
      <img src={logoUrl('hworker')} className="relative w-24 h-24 mb-8" alt="" />
      <div className="relative text-[30px] font-bold tracking-tight" style={{ fontFamily: 'var(--font-brand)' }}>Starting {run.name}</div>
      <div className="relative mt-3 text-[16px] text-white/60" style={{ fontFamily: 'var(--font-mono)' }}>PROVISIONING SECURE WORKSPACE</div>
      <div className="relative mt-10 w-[360px] h-1 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full bg-[#9A5BEC] boot-bar" />
      </div>
    </div>
  )
}

function ScaledScreen({ run }: { run: Run }) {
  const wrap = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.5)
  useLayoutEffect(() => {
    const el = wrap.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      const s = Math.min((el.clientWidth - 32) / AGENT_SCREEN.w, (el.clientHeight - 32) / AGENT_SCREEN.h)
      setScale(Math.max(0.2, s))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const live = run.status === 'running' || run.status === 'booting'
  return (
    <div ref={wrap} className="relative flex-1 min-w-0 flex items-center justify-center overflow-hidden" style={{ background: '#16151B' }}>
      <div className="absolute inset-0 opacity-[0.25]" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.35) 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
      <div
        className={`relative rounded-[10px] ${live ? 'beam' : ''}`}
        style={{ width: AGENT_SCREEN.w * scale + 4, height: AGENT_SCREEN.h * scale + 4, padding: 2 }}
      >
        <div className="relative overflow-hidden rounded-[8px] bg-black" style={{ width: AGENT_SCREEN.w * scale, height: AGENT_SCREEN.h * scale }}>
          <div style={{ width: AGENT_SCREEN.w, height: AGENT_SCREEN.h, transform: `scale(${scale})`, transformOrigin: '0 0' }} className="relative">
            <Desktop deskId={run.id} isAgent fixedSize={AGENT_SCREEN} />
            <AgentCursor run={run} />
            {run.status === 'booting' && <BootOverlay run={run} />}
            {/* block the user's own mouse from interfering while the agent drives (they can "take over" by pausing) */}
            {run.status === 'running' && <div className="absolute inset-0 z-[99997] cursor-not-allowed" title="H-Worker is in control — pause to take over" />}
          </div>
        </div>
      </div>
      <div className="absolute left-4 bottom-3 flex items-center gap-2 text-[11px] text-white/50" style={{ fontFamily: 'var(--font-mono)' }}>
        <ShieldCheck size={13} /> ISOLATED VM · {AGENT_SCREEN.w}×{AGENT_SCREEN.h} · SSO: ALEX.MORGAN@NORTHWIND.COM
      </div>
    </div>
  )
}

function StatusPill({ status }: { status: Run['status'] }) {
  const map: Record<Run['status'], [string, string, string]> = {
    booting: ['Starting', '#F1ECF9', '#430693'],
    running: ['Working', '#F1ECF9', '#430693'],
    paused: ['Paused — you have control', '#FFF4CE', '#8A5A00'],
    awaiting: ['Waiting for approval', '#FFF4CE', '#8A5A00'],
    done: ['Completed', '#DFF6DD', '#0E700E'],
    failed: ['Needs attention', '#FDE7E9', '#A4262C'],
    cancelled: ['Stopped', '#EDEBE9', '#605E5C'],
  }
  const [label, bg, fg] = map[status]
  return (
    <span className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-[11.5px] font-semibold" style={{ background: bg, color: fg }}>
      {(status === 'running' || status === 'booting') && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
      {label}
    </span>
  )
}

function Feed({ run }: { run: Run }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [run.log.length])
  return (
    <div ref={ref} className="flex-1 min-h-0 overflow-auto px-5 py-3 space-y-1.5">
      {run.log.map((l) => {
        if (l.kind === 'step') return null
        if (l.kind === 'think')
          return (
            <div key={l.id} className="flex gap-2 py-1 text-[12.5px] text-[#3A3A44] feed-in">
              <Sparkle size={14} weight="fill" className="mt-0.5 shrink-0 text-[#5A0CC0]" />
              <span className="italic leading-snug">{l.text}</span>
            </div>
          )
        if (l.kind === 'error')
          return (
            <div key={l.id} className="flex gap-2 p-2 rounded-md bg-[#FDE7E9] text-[12px] text-[#A4262C] feed-in">
              <WarningCircle size={14} className="mt-0.5 shrink-0" /> {l.text}
            </div>
          )
        if (l.kind === 'success')
          return (
            <div key={l.id} className="flex gap-2 py-1 text-[12.5px] text-[#0E700E] font-semibold feed-in">
              <CheckCircle size={14} weight="fill" className="mt-0.5 shrink-0" /> {l.text}
            </div>
          )
        return (
          <div key={l.id} className="flex items-start gap-2 text-[12px] text-[#0F0E12] feed-in">
            {l.appId ? (
              <img src={appIcon(l.appId)} className="w-3.5 h-3.5 mt-[1px] shrink-0 object-contain" alt="" />
            ) : (
              <span className="w-3.5 h-3.5 mt-[1px] shrink-0 flex items-center justify-center">
                <span className="w-1 h-1 rounded-full bg-[#7A7A87]" />
              </span>
            )}
            <span className={`leading-snug ${l.kind === 'info' ? 'text-[#7A7A87]' : ''}`}>{l.text}</span>
          </div>
        )
      })}
    </div>
  )
}

export function PlanList({ run, compact }: { run: Run; compact?: boolean }) {
  return (
    <ol className={compact ? 'space-y-1.5' : 'space-y-2'}>
      {run.plan.map((p, i) => {
        const done = i < run.planIndex || run.status === 'done'
        const active = i === run.planIndex && run.status !== 'done'
        const failed = active && run.status === 'failed'
        return (
          <li key={i} className={`flex items-start gap-2.5 text-[12.5px] leading-snug ${done ? 'text-[#3A3A44]' : active ? 'text-[#0F0E12] font-semibold' : 'text-[#7A7A87]'}`}>
            <span className="mt-[1px] shrink-0">
              {failed ? (
                <XCircle size={16} weight="fill" className="text-[#C50F1F]" />
              ) : done ? (
                <CheckCircle size={16} weight="fill" className="text-[#430693]" />
              ) : active && run.status !== 'cancelled' ? (
                <CircleNotch size={16} weight="bold" className="text-[#430693] animate-spin" />
              ) : (
                <span className="block w-4 h-4 rounded-full border-[1.5px] border-[#C9C6CF]" />
              )}
            </span>
            <span>{p}</span>
          </li>
        )
      })}
    </ol>
  )
}

export default function AgentWindow({ params }: AppProps) {
  const runId = params?.runId as string
  const run = useRuns((s) => s.runs[runId])
  const { toggleMax, win } = useWin()
  const bounds = useWM((s) => s.desks.main?.bounds)
  const width = win?.maximized ? bounds?.w ?? 1400 : win?.w ?? 1260
  const narrow = width < 980
  const { openOnMain } = useDesk()
  const elapsed = useElapsed(run)

  if (!run) {
    return (
      <div className="flex-1 flex flex-col bg-white" style={{ fontFamily: 'var(--font-brand)' }}>
        <div data-drag-handle className="h-11 flex items-center justify-between pl-4 border-b border-[#EAE5DD]">
          <span className="text-[13px] font-semibold">H-Worker Agent</span>
          <WindowControls />
        </div>
        <div className="flex-1 flex items-center justify-center text-[13px] text-[#7A7A87]">This agent session has ended.</div>
      </div>
    )
  }

  const pct = run.status === 'done' ? 100 : Math.round((Math.max(0, run.planIndex) / Math.max(1, run.plan.length)) * 100)
  const activeApp = run.activeApp ? getApp(run.activeApp) : undefined
  const live = run.status === 'running' || run.status === 'paused' || run.status === 'booting' || run.status === 'awaiting'

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white text-[#0F0E12]" style={{ fontFamily: 'var(--font-brand)' }}>
      {/* title bar */}
      <div data-drag-handle className="h-12 shrink-0 flex items-center gap-3 pl-3 border-b border-[#EAE5DD] bg-white" onDoubleClick={toggleMax}>
        <img src={logoUrl('hworker')} className="w-7 h-7 rounded-md" alt="" />
        <div className="flex flex-col leading-tight min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[13.5px] font-bold">{run.name}</span>
            <StatusPill status={run.status} />
          </div>
          <span className="text-[11.5px] text-[#7A7A87] truncate">{run.title}</span>
        </div>
        <div className="flex-1" />
        {activeApp && live && !narrow && (
          <div className="hidden md:flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-[#F1EEE9] text-[11.5px] text-[#3A3A44]">
            <img src={activeApp.icon} className="w-3.5 h-3.5 object-contain" alt="" /> Using {activeApp.name}
          </div>
        )}
        <span className="text-[11.5px] text-[#7A7A87] tabular-nums w-10 text-right" style={{ fontFamily: 'var(--font-mono)' }}>{elapsed}</span>
        {live && (
          <>
            <button
              data-no-drag
              onClick={() => useRuns.getState().patch(run.id, { status: run.status === 'paused' ? 'running' : 'paused' })}
              disabled={run.status === 'booting'}
              className="h-8 px-3 rounded-lg border border-[#E1DDD6] hover:bg-[#F7F5F1] text-[12px] font-semibold flex items-center gap-1.5 disabled:opacity-40"
            >
              {run.status === 'paused' ? <Play size={14} weight="fill" /> : <Pause size={14} weight="fill" />}
              {run.status === 'paused' ? 'Resume' : 'Take over'}
            </button>
            <button data-no-drag onClick={() => cancelRun(run.id)} className="h-8 px-3 rounded-lg border border-[#E1DDD6] hover:bg-[#FDE7E9] hover:border-[#F1B8BE] text-[12px] font-semibold flex items-center gap-1.5">
              <Stop size={14} weight="fill" /> Stop
            </button>
          </>
        )}
        <WindowControls height={48} />
      </div>
      <div className="flex-1 min-h-0 flex">
        <div className="flex-1 min-w-0 flex flex-col">
          <ScaledScreen run={run} />
          {narrow && (
            <div className="shrink-0 h-12 flex items-center gap-3 px-4 border-t border-[#EAE5DD] bg-white">
              {run.status === 'done' ? <CheckCircle size={16} weight="fill" className="text-[#0E700E] shrink-0" /> : <CircleNotch size={16} className="text-[#430693] animate-spin shrink-0" />}
              <span className="text-[12px] font-semibold truncate flex-1">{run.status === 'done' ? run.result?.summary : run.plan[Math.max(0, run.planIndex)] ?? 'Starting…'}</span>
              <span className="text-[11px] text-[#7A7A87] tabular-nums" style={{ fontFamily: 'var(--font-mono)' }}>{pct}%</span>
              {run.status === 'done' && run.result?.outputs[0] && (
                <button onClick={() => openOnMain(run.result!.outputs[0].appId, run.result!.outputs[0].params)} className="h-7 px-2.5 rounded-full bg-[#0F0E12] text-white text-[11px] font-semibold flex items-center gap-1 shrink-0">
                  <ArrowSquareOut size={12} /> View
                </button>
              )}
            </div>
          )}
        </div>
        {/* side panel */}
        {!narrow && <aside className="w-[340px] shrink-0 flex flex-col border-l border-[#EAE5DD] bg-white">
          <div className="px-5 pt-4 pb-3 border-b border-[#EAE5DD]">
            <div className="text-[10.5px] tracking-[0.12em] text-[#7A7A87] mb-1.5" style={{ fontFamily: 'var(--font-mono)' }}>TASK</div>
            <div className="text-[14px] font-bold leading-snug">{run.title}</div>
            {run.prompt && <div className="mt-1.5 text-[12px] text-[#3A3A44] leading-snug">“{run.prompt}”</div>}
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-[#EAE5DD] overflow-hidden">
                <div className="h-full rounded-full bg-[#430693] transition-all duration-700" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-[11px] text-[#7A7A87] tabular-nums" style={{ fontFamily: 'var(--font-mono)' }}>{pct}%</span>
            </div>
          </div>
          <div className="px-5 py-3 border-b border-[#EAE5DD] max-h-[38%] overflow-auto">
            <div className="text-[10.5px] tracking-[0.12em] text-[#7A7A87] mb-2" style={{ fontFamily: 'var(--font-mono)' }}>PLAN</div>
            <PlanList run={run} />
          </div>
          <div className="px-5 pt-3 flex items-center justify-between">
            <span className="text-[10.5px] tracking-[0.12em] text-[#7A7A87]" style={{ fontFamily: 'var(--font-mono)' }}>LIVE ACTIVITY</span>
            <span className="text-[10.5px] text-[#7A7A87]" style={{ fontFamily: 'var(--font-mono)' }}>{run.log.filter((l) => l.kind === 'action' || l.kind === 'open').length} ACTIONS</span>
          </div>
          <Feed run={run} />
          {run.status === 'awaiting' && run.approval && (
            <div className="m-3 mt-0 p-4 rounded-xl border-2 border-[#430693] bg-[#FBF9FE] result-in" data-agent="agent-approval">
              <div className="flex items-center gap-2 text-[13px] font-bold"><ShieldCheck size={16} weight="fill" className="text-[#430693]" /> Approval needed</div>
              <div className="mt-1.5 text-[12.5px] text-[#0F0E12] leading-snug">{run.approval.question}</div>
              {run.approval.detail && <div className="mt-2 p-2.5 rounded-lg bg-white border border-[#EAE5DD] text-[11.5px] text-[#3A3A44] whitespace-pre-wrap max-h-32 overflow-auto">{run.approval.detail}</div>}
              <div className="mt-3 flex gap-2">
                <button onClick={() => useRuns.getState().patch(run.id, (r) => ({ approval: { ...r.approval!, answer: true } }))} className="flex-1 h-9 rounded-lg bg-[#0F0E12] text-white text-[12.5px] font-semibold hover:bg-[#2A2930]">Approve</button>
                <button onClick={() => useRuns.getState().patch(run.id, (r) => ({ approval: { ...r.approval!, answer: false } }))} className="flex-1 h-9 rounded-lg border border-[#E1DDD6] text-[12.5px] font-semibold hover:bg-white">Reject</button>
              </div>
            </div>
          )}
          {run.status === 'done' && run.result && (
            <div className="m-3 mt-0 p-4 rounded-xl bg-[#F1EEE9] border-l-2 border-[#430693] result-in">
              <div className="flex items-center gap-2 text-[13px] font-bold">
                <CheckCircle size={16} weight="fill" className="text-[#0E700E]" /> Done in {elapsed}
              </div>
              <div className="mt-1.5 text-[12px] text-[#3A3A44] leading-snug">{run.result.summary}</div>
              {run.result.metrics && (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {run.result.metrics.slice(0, 3).map((m) => (
                    <div key={m.label} className="rounded-lg bg-white px-2 py-1.5">
                      <div className="text-[14px] font-bold text-[#430693]">{m.value}</div>
                      <div className="text-[10px] text-[#7A7A87] leading-tight">{m.label}</div>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-3 flex flex-col gap-1.5">
                {run.result.outputs.map((o, i) => (
                  <button
                    key={i}
                    onClick={() => openOnMain(o.appId, o.params)}
                    className="flex items-center gap-2 h-9 px-3 rounded-lg bg-white hover:bg-[#FBFAF8] border border-[#E1DDD6] text-[12px] font-semibold text-left"
                  >
                    <img src={appIcon(o.appId)} className="w-4 h-4 object-contain" alt="" />
                    <span className="flex-1 truncate">{o.label}</span>
                    <ArrowSquareOut size={14} className="text-[#7A7A87]" />
                  </button>
                ))}
              </div>
            </div>
          )}
          {(run.status === 'failed' || run.status === 'cancelled') && (
            <div className="m-3 mt-0 p-4 rounded-xl bg-[#F1EEE9]">
              <div className="text-[13px] font-bold">{run.status === 'failed' ? 'The agent hit a problem' : 'Agent stopped'}</div>
              {run.error && <div className="mt-1 text-[12px] text-[#A4262C]">{run.error}</div>}
              <button
                onClick={() => {
                  startRun(run.workflowId, run.inputs, { prompt: run.prompt, speed: run.speed })
                }}
                className="mt-3 h-9 px-3 rounded-lg bg-[#0F0E12] text-white text-[12px] font-semibold flex items-center gap-1.5"
              >
                <ArrowCounterClockwise size={14} /> Run again
              </button>
            </div>
          )}
          {live && (
            <div className="px-5 py-2.5 border-t border-[#EAE5DD] flex items-center gap-2 text-[11px] text-[#7A7A87]">
              <Lightning size={13} weight="fill" className="text-[#5A0CC0]" /> Powered by Holo · computer-use model
            </div>
          )}
        </aside>}
      </div>
    </div>
  )
}

export function openAgentWindow(runId: string) {
  const w = wm().desks.main?.windows.find((x) => x.appId === 'agent' && x.params?.runId === runId)
  if (w) wm().focus('main', w.id)
  else wm().open('main', 'agent', { runId })
}

/** Arrange every agent window on the user's desktop in a grid (multi-agent "mission control"). */
export function tileAgentWindows() {
  const desk = wm().desks.main
  if (!desk) return
  const wins = desk.windows.filter((w) => w.appId === 'agent' && !w.minimized)
  if (!wins.length) return
  const { w: bw, h: bh } = desk.bounds
  const cols = wins.length <= 1 ? 1 : wins.length <= 4 ? 2 : 3
  const rows = Math.ceil(wins.length / cols)
  const gw = Math.floor((bw - 8 * (cols + 1)) / cols)
  const gh = Math.floor((bh - 8 * (rows + 1)) / rows)
  wins.forEach((w, i) => {
    const c = i % cols
    const r = Math.floor(i / cols)
    wm().patch('main', w.id, { maximized: false, x: 8 + c * (gw + 8), y: 8 + r * (gh + 8), w: gw, h: gh })
  })
}
