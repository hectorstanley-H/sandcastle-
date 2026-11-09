/**
 * Cloud agents: several real agents running side by side, each tile showing the agent's live screen
 * inside H-Worker (no separate windows). The view stays mounted off-screen when another tab is open
 * so the agents keep working; if H-Worker is closed, the runtime moves them to their own windows.
 */
import { useEffect, useState } from 'react'
import { Cloud, Play, Pause, Stop, ArrowsOut, ArrowsIn, CheckCircle, ShieldCheck, ArrowSquareOut, Broom } from '@phosphor-icons/react'
import { WORKFLOWS } from '@/workflows'
import { startRun } from '@/agent/runtime'
import { cancelRun, useRuns, type Run } from '@/agent/runs'
import { ScaledScreen, StatusPill, ViaChip, runCosts } from '@/agent/AgentWindow'
import { fmtUsd } from '@/agent/execution'
import { useCloud } from '@/agent/cloud'
import { useDesk } from '@/os/context'
import { AppStack, Mono } from './shared'

const DEFAULT_PICK = ['sap-post-supplier-invoice', 'concur-expense-report', 'servicenow-triage-incidents', 'salesforce-log-meeting-and-update']
const MAX = 6
const LIVE: Run['status'][] = ['booting', 'running', 'paused', 'awaiting']

function useNow(on: boolean) {
  const [, f] = useState(0)
  useEffect(() => {
    if (!on) return
    const t = setInterval(() => f((x) => x + 1), 1000)
    return () => clearInterval(t)
  }, [on])
}
const clock = (r: Run) => {
  const s = Math.floor(((r.endedAt ?? Date.now()) - r.startedAt) / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function CloudAgentsView({ active }: { active: boolean }) {
  const { ids, focus, add, setFocus, remove } = useCloud()
  const runsById = useRuns((s) => s.runs)
  const runs = ids.map((id) => runsById[id]).filter(Boolean) as Run[]
  const live = runs.filter((r) => LIVE.includes(r.status))
  const [pick, setPick] = useState<string[]>(DEFAULT_PICK)
  const [launching, setLaunching] = useState(false)
  useNow(live.length > 0 && active)

  const featured = WORKFLOWS.filter((w) => w.featured)
  const toggle = (id: string) => setPick((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= MAX ? p : [...p, id]))
  const launch = async () => {
    setLaunching(true)
    for (const wfId of pick) {
      add([startRun(wfId, {}, { cloud: true })])
      // stagger boots so the screens don't all start in lockstep
      await new Promise((r) => setTimeout(r, 450))
    }
    setLaunching(false)
  }
  const finished = runs.filter((r) => !LIVE.includes(r.status)).map((r) => r.id)
  const cost = runs.reduce((n, r) => n + runCosts(r).agent, 0)
  const focused = runs.find((r) => r.id === focus)

  return (
    <div className="px-8 py-7" data-agent="hw-cloud" aria-hidden={!active}>
      <div className="flex items-end justify-between gap-6">
        <div>
          <Mono>Cloud agents</Mono>
          <h1 className="mt-1 text-[26px] font-bold tracking-tight">Watch your agents work, side by side</h1>
          <p className="mt-1 text-[13.5px] text-[#3A3A44] max-w-[640px]">Each agent runs on its own isolated cloud desktop. Watch all of them live, expand one, take over or stop it — without leaving H-Worker.</p>
        </div>
        {runs.length > 0 && (
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <div className="text-[18px] font-bold tabular-nums">{live.length} <span className="text-[12px] font-semibold text-[#7A7A87]">running</span></div>
              <div className="text-[11.5px] text-[#7A7A87] tabular-nums">{runs.length - live.length} finished · {fmtUsd(cost)}</div>
            </div>
            {finished.length > 0 && (
              <button onClick={() => remove(finished)} className="h-9 px-3.5 rounded-full border border-[#E1DDD6] text-[12px] font-semibold flex items-center gap-1.5 hover:bg-[#F7F5F1]"><Broom size={14} /> Clear finished</button>
            )}
          </div>
        )}
      </div>

      {/* launcher */}
      <div className="mt-6 rounded-2xl border border-[#EAE5DD] p-4">
        <div className="flex items-center justify-between">
          <Mono>Launch agents · pick up to {MAX}</Mono>
          <button
            onClick={launch}
            disabled={!pick.length || launching}
            data-agent="hw-cloud-launch"
            className="h-9 px-4 rounded-full bg-[#0F0E12] hover:bg-[#2A2930] text-white text-[12.5px] font-semibold flex items-center gap-1.5 disabled:opacity-50"
          >
            <Cloud size={15} weight="fill" /> Launch {pick.length} cloud agent{pick.length === 1 ? '' : 's'}
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {featured.map((w) => {
            const on = pick.includes(w.id)
            return (
              <button
                key={w.id}
                onClick={() => toggle(w.id)}
                data-agent={`hw-cloud-pick-${w.id}`}
                className={`h-9 pl-1.5 pr-3 rounded-full border flex items-center gap-2 text-[12px] font-semibold transition ${on ? 'border-[#430693] bg-[#FBF9FE] text-[#430693]' : 'border-[#EAE5DD] text-[#3A3A44] hover:bg-[#F7F5F1]'}`}
              >
                <AppStack apps={w.apps} size={22} max={3} />
                {w.title}
              </button>
            )
          })}
        </div>
      </div>

      {runs.length === 0 && (
        <div className="mt-6 rounded-2xl border border-dashed border-[#D8D2C8] h-[260px] flex flex-col items-center justify-center text-center">
          <Cloud size={34} className="text-[#C2A0EE]" />
          <div className="mt-2 text-[14px] font-semibold">No cloud agents yet</div>
          <div className="text-[12.5px] text-[#7A7A87]">Pick a few tasks above and launch them together.</div>
        </div>
      )}

      {/* one stable list: expanding a tile only changes CSS, so the agent's desktop is never remounted mid-task */}
      {runs.length > 0 && (
        <div className={`mt-5 grid gap-4 ${focused ? 'grid-cols-3 xl:grid-cols-4' : runs.length <= 2 ? 'grid-cols-2' : 'grid-cols-2 xl:grid-cols-3'}`}>
          {runs.map((r) => (
            <div key={r.id} className={r.id === focused?.id ? 'col-span-full' : ''} style={{ order: r.id === focused?.id ? -1 : 0 }}>
              <Tile run={r} big={r.id === focused?.id} onFocus={() => setFocus(r.id === focused?.id ? undefined : r.id)} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Tile({ run, big, onFocus }: { run: Run; big?: boolean; onFocus: () => void }) {
  const { openOnMain } = useDesk()
  const step = run.status === 'done' ? undefined : run.plan[run.planIndex]
  const pct = run.status === 'done' ? 100 : Math.round((Math.max(0, run.planIndex) / Math.max(1, run.plan.length)) * 100)
  const live = LIVE.includes(run.status)
  const patch = useRuns.getState().patch
  return (
    <div className={`rounded-2xl border bg-white overflow-hidden flex flex-col ${run.status === 'awaiting' ? 'border-[#F2D58A]' : 'border-[#EAE5DD]'}`} data-agent={`hw-cloud-tile-${run.id}`}>
      <div className="flex items-center gap-2 px-3.5 pt-3">
        <span className="text-[12.5px] font-bold">{run.name}</span>
        <StatusPill status={run.status} />
        <span className="flex-1" />
        <span className="text-[11px] text-[#7A7A87] tabular-nums" style={{ fontFamily: 'var(--font-mono)' }}>{clock(run)} · {fmtUsd(runCosts(run).agent)}</span>
        <button onClick={onFocus} title={big ? 'Shrink' : 'Expand'} className="w-7 h-7 rounded-md hover:bg-[#F1EEE9] flex items-center justify-center text-[#3A3A44]">
          {big ? <ArrowsIn size={15} /> : <ArrowsOut size={15} />}
        </button>
      </div>
      <div className="px-3.5 text-[12px] text-[#3A3A44] truncate">{run.title}</div>

      <div className={`relative mt-2.5 mx-2.5 rounded-xl overflow-hidden flex ${big ? 'h-[560px]' : 'aspect-[16/10]'}`}>
        <ScaledScreen run={run} compact />
        {run.status === 'awaiting' && run.approval && (
          <div className="absolute inset-x-3 bottom-3 z-20 rounded-xl bg-white p-3 shadow-2xl result-in">
            <div className="flex items-center gap-1.5 text-[12px] font-bold"><ShieldCheck size={14} weight="fill" className="text-[#430693]" /> Approval needed</div>
            <div className="mt-0.5 text-[11.5px] text-[#3A3A44] leading-snug line-clamp-2">{run.approval.question}</div>
            <div className="mt-2 flex gap-1.5">
              <button onClick={() => patch(run.id, (r) => ({ approval: { ...r.approval!, answer: true } }))} className="flex-1 h-7 rounded-md bg-[#0F0E12] text-white text-[11.5px] font-semibold">Approve</button>
              <button onClick={() => patch(run.id, (r) => ({ approval: { ...r.approval!, answer: false } }))} className="flex-1 h-7 rounded-md border border-[#E1DDD6] text-[11.5px] font-semibold">Reject</button>
            </div>
          </div>
        )}
      </div>

      <div className="px-3.5 pt-2.5 pb-3">
        <div className="h-1 rounded-full bg-[#EAE5DD] overflow-hidden">
          <div className="h-full rounded-full bg-[#430693] transition-all duration-700" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-2 flex items-center gap-2 min-h-[28px]">
          {run.status === 'done' ? (
            <>
              <CheckCircle size={14} weight="fill" className="text-[#0E700E] shrink-0" />
              <span className="flex-1 text-[11.5px] text-[#3A3A44] truncate" title={run.result?.summary}>{run.result?.summary}</span>
              {run.result?.outputs[0] && (
                <button onClick={() => openOnMain(run.result!.outputs[0].appId, run.result!.outputs[0].params)} className="h-7 px-2.5 rounded-full bg-[#0F0E12] text-white text-[11px] font-semibold flex items-center gap-1 shrink-0">
                  <ArrowSquareOut size={12} /> View
                </button>
              )}
            </>
          ) : (
            <>
              <span className="flex-1 min-w-0 text-[11.5px] font-semibold truncate">{step?.text ?? (run.status === 'booting' ? 'Provisioning cloud desktop…' : run.error ?? 'Stopped')}</span>
              {step && <ViaChip step={step} compact />}
              {live && (
                <>
                  <button
                    onClick={() => patch(run.id, { status: run.status === 'paused' ? 'running' : 'paused' })}
                    disabled={run.status === 'booting' || run.status === 'awaiting'}
                    title={run.status === 'paused' ? 'Resume' : 'Take over'}
                    className="w-7 h-7 rounded-md border border-[#E1DDD6] flex items-center justify-center hover:bg-[#F7F5F1] disabled:opacity-40"
                  >
                    {run.status === 'paused' ? <Play size={12} weight="fill" /> : <Pause size={12} weight="fill" />}
                  </button>
                  <button onClick={() => cancelRun(run.id)} title="Stop" className="w-7 h-7 rounded-md border border-[#E1DDD6] flex items-center justify-center hover:bg-[#FDE7E9]">
                    <Stop size={12} weight="fill" />
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
