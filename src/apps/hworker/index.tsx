import { useEffect, useMemo, useRef, useState } from 'react'
import {
  House,
  SquaresFour,
  Robot,
  ClockCounterClockwise,
  PlugsConnected,
  GearSix,
  Plus,
  ArrowUp,
  MagnifyingGlass,
  X,
  CheckCircle,
  CircleNotch,
  ArrowSquareOut,
  Play,
  Sparkle,
  Lightning,
  Clock,
  ShieldCheck,
  ArrowCounterClockwise,
  CaretRight,
  WarningCircle,
  Eye,
  CalendarBlank,
  MagicWand,
  UsersThree,
  Exam,
} from '@phosphor-icons/react'
import type { AppProps } from '@/os/registry'
import { APPS, appIcon, getApp } from '@/os/registry'
import { WindowControls } from '@/os/Window'
import { useDesk } from '@/os/context'
import { db, useCollection } from '@/db/db'
import { ME, COMPANY } from '@/data/people'
import { relative } from '@/data/time'
import { WORKFLOWS, getWorkflow, matchWorkflows } from '@/workflows'
import type { Workflow } from '@/agent/types'
import { startRun } from '@/agent/runtime'
import { useRuns, type Run } from '@/agent/runs'
import { openAgentWindow, PlanList, tileAgentWindows, ViaChip } from '@/agent/AgentWindow'
import { normalizePlan } from '@/agent/execution'
import { requestReset } from '@/os/system'
import { AppStack, HMark, Mono, WorkflowCard } from './shared'
import { BuilderView } from './Builder'
import { WorkforceView } from './Workforce'
import { EvalsView } from './Evals'
import { useFleet } from '@/agent/fleet'

type View = 'home' | 'workflows' | 'builder' | 'workforce' | 'evals' | 'agents' | 'activity' | 'integrations' | 'settings'

const greet = () => {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

/* ───────────────────── Deploy sheet (workflow detail + inputs) ───────────────────── */

function DeploySheet({ wf, prompt, onClose, onDeployed }: { wf: Workflow; prompt?: string; onClose: () => void; onDeployed: (id: string) => void }) {
  const [vals, setVals] = useState<Record<string, any>>(() => Object.fromEntries((wf.inputs ?? []).map((f) => [f.key, f.default ?? ''])))
  const deploy = () => {
    const id = startRun(wf.id, vals, { prompt })
    onDeployed(id)
  }
  return (
    <div className="absolute inset-0 z-50 flex justify-end bg-[#0F0E12]/20 fade-in" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-[520px] h-full bg-white shadow-[-12px_0_40px_rgba(15,14,18,0.12)] flex flex-col slide-up" data-agent="hw-deploy-sheet">
        <div className="flex items-start gap-3 px-7 pt-6 pb-5 border-b border-[#EAE5DD]">
          <div className="flex-1">
            <AppStack apps={wf.apps} size={34} max={6} />
            <div className="mt-4 text-[20px] font-extrabold tracking-tight leading-tight">{wf.title}</div>
            <div className="mt-1.5 text-[13px] text-[#3A3A44] leading-relaxed">{wf.description}</div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-[#F1EEE9] flex items-center justify-center"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-auto px-7 py-5 space-y-6">
          {prompt && (
            <div className="rounded-xl bg-[#F1ECF9] px-4 py-3">
              <Mono className="!text-[#5A0CC0]">Your request</Mono>
              <div className="mt-1 text-[13px] text-[#0F0E12]">“{prompt}”</div>
            </div>
          )}
          {wf.inputs && wf.inputs.length > 0 && (
            <div>
              <Mono>Details</Mono>
              <div className="mt-3 space-y-3">
                {wf.inputs.map((f) => (
                  <label key={f.key} className="block">
                    <div className="text-[12.5px] font-semibold mb-1">{f.label}</div>
                    {f.type === 'select' ? (
                      <select value={vals[f.key]} onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-[#E1DDD6] bg-white text-[13px] outline-none focus:border-[#430693]">
                        {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    ) : f.type === 'textarea' ? (
                      <textarea value={vals[f.key]} onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })} placeholder={f.placeholder} rows={3} className="w-full px-3 py-2 rounded-lg border border-[#E1DDD6] text-[13px] outline-none focus:border-[#430693] resize-none" />
                    ) : (
                      <input type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'} value={vals[f.key]} onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })} placeholder={f.placeholder} className="w-full h-10 px-3 rounded-lg border border-[#E1DDD6] text-[13px] outline-none focus:border-[#430693]" />
                    )}
                    {f.help && <div className="mt-1 text-[11.5px] text-[#7A7A87]">{f.help}</div>}
                  </label>
                ))}
              </div>
            </div>
          )}
          <div>
            <Mono>Plan</Mono>
            <ol className="mt-3 space-y-2.5">
              {normalizePlan(wf.plan).map((p, i) => (
                <li key={i} className="flex gap-3 text-[13px] leading-snug">
                  <span className="w-5 h-5 shrink-0 rounded-full bg-[#F1EEE9] text-[10.5px] font-bold flex items-center justify-center text-[#3A3A44]" style={{ fontFamily: 'var(--font-mono)' }}>{i + 1}</span>
                  <span className="pt-0.5 flex-1 flex flex-wrap items-center gap-x-2 gap-y-1"><span>{p.text}</span><ViaChip step={p} /></span>
                </li>
              ))}
            </ol>
          </div>
          <div>
            <Mono>Applications</Mono>
            <div className="mt-3 flex flex-wrap gap-2">
              {Array.from(new Set(wf.apps)).map((a) => (
                <span key={a} className="inline-flex items-center gap-2 h-8 pl-2 pr-3 rounded-full border border-[#EAE5DD] text-[12.5px]">
                  <img src={appIcon(a)} className="w-4 h-4 object-contain" alt="" /> {getApp(a)?.name}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-xl border border-[#EAE5DD] p-4">
            <ShieldCheck size={18} className="text-[#430693] mt-0.5 shrink-0" />
            <div className="text-[12px] text-[#3A3A44] leading-relaxed">
              Runs in an isolated workspace using your Okta SSO session. You can watch live, take over at any time, and every action is logged for audit.
            </div>
          </div>
        </div>
        <div className="px-7 py-4 border-t border-[#EAE5DD] flex items-center gap-3">
          <div className="flex-1 flex items-center gap-1.5 text-[12px] text-[#7A7A87]"><Clock size={14} /> Usually saves {wf.timeSaved}</div>
          <button className="h-10 px-4 rounded-full border border-[#E1DDD6] text-[13px] font-semibold hover:bg-[#F7F5F1] flex items-center gap-1.5"><CalendarBlank size={15} /> Schedule</button>
          <button data-agent="hw-sheet-deploy" onClick={deploy} className="h-10 pl-4 pr-5 rounded-full bg-[#0F0E12] hover:bg-[#2A2930] text-white text-[13px] font-semibold flex items-center gap-2">
            <Play size={14} weight="fill" /> Deploy H-Worker
          </button>
        </div>
      </div>
    </div>
  )
}

/* ───────────────────── Prompt box with intent matching ───────────────────── */

function PromptBox({ onPick, autoFocus }: { onPick: (wf: Workflow, prompt: string) => void; autoFocus?: boolean }) {
  const [text, setText] = useState('')
  const [phase, setPhase] = useState<'idle' | 'thinking' | 'matched'>('idle')
  const [matches, setMatches] = useState<Workflow[]>([])
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    if (autoFocus) ref.current?.focus({ preventScroll: true })
  }, [autoFocus])

  const submit = () => {
    if (!text.trim()) return
    setPhase('thinking')
    setTimeout(() => {
      const m = matchWorkflows(text).slice(0, 3).map((x) => x.wf)
      setMatches(m.length ? m : WORKFLOWS.filter((w) => w.featured).slice(0, 3))
      setPhase('matched')
    }, 900)
  }

  const suggestions = ['Submit my expense receipts in Concur', 'Reply to Elena with pricing and meeting slots', 'Post the Fabrikam invoice in SAP', 'Onboard Jordan Ellis', 'Triage the IT incident queue']

  return (
    <div>
      <div className="rounded-[20px] bg-white border border-[#E1DDD6] shadow-[0_12px_40px_rgba(15,14,18,0.06)] focus-within:border-[#C2A0EE] transition-colors">
        <textarea
          ref={ref}
          data-agent="hw-prompt"
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setPhase('idle')
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              submit()
            }
          }}
          rows={2}
          placeholder="Describe a task — e.g. “Expense my receipts from the Chicago trip and let Priya know”"
          className="w-full resize-none bg-transparent outline-none px-5 pt-4 text-[15px] leading-relaxed placeholder:text-[#9A97A3]"
        />
        <div className="flex items-center gap-2 px-3 pb-3">
          <button className="h-8 px-3 rounded-full border border-[#EAE5DD] text-[12px] text-[#3A3A44] flex items-center gap-1.5 hover:bg-[#F7F5F1]"><Plus size={13} /> Attach</button>
          <button className="h-8 px-3 rounded-full border border-[#EAE5DD] text-[12px] text-[#3A3A44] flex items-center gap-1.5 hover:bg-[#F7F5F1]"><SquaresFour size={13} /> All apps</button>
          <div className="flex-1" />
          <span className="text-[11px] text-[#9A97A3]" style={{ fontFamily: 'var(--font-mono)' }}>HOLO · COMPUTER USE</span>
          <button data-agent="hw-prompt-submit" onClick={submit} disabled={!text.trim()} className="w-9 h-9 rounded-full bg-[#0F0E12] disabled:bg-[#D8D2C8] text-white flex items-center justify-center hover:bg-[#2A2930]">
            {phase === 'thinking' ? <CircleNotch size={16} className="animate-spin" /> : <ArrowUp size={16} weight="bold" />}
          </button>
        </div>
      </div>
      {phase === 'idle' && (
        <div className="mt-3 flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button key={s} onClick={() => setText(s)} className="h-8 px-3.5 rounded-full bg-white border border-[#EAE5DD] text-[12.5px] text-[#3A3A44] hover:border-[#C9C2B6] hover:text-[#0F0E12]">
              {s}
            </button>
          ))}
        </div>
      )}
      {phase === 'thinking' && (
        <div className="mt-4 rounded-2xl border border-[#EAE5DD] bg-white p-4 flex items-center gap-3 fade-in">
          <Sparkle size={16} weight="fill" className="text-[#5A0CC0] animate-pulse" />
          <span className="text-[13px] text-[#3A3A44]">Understanding your request and matching it to your apps…</span>
        </div>
      )}
      {phase === 'matched' && (
        <div className="mt-4 rounded-2xl border border-[#EAE5DD] bg-white p-4 slide-up">
          <div className="flex items-center gap-2 mb-3">
            <Sparkle size={15} weight="fill" className="text-[#5A0CC0]" />
            <span className="text-[13px] font-semibold">Here’s how H-Worker can do that</span>
          </div>
          <div className="space-y-2">
            {matches.map((wf, i) => (
              <button
                key={wf.id}
                data-agent={`hw-match-${wf.id}`}
                onClick={() => onPick(wf, text)}
                className={`w-full flex items-center gap-4 p-3 rounded-xl text-left border ${i === 0 ? 'border-[#C2A0EE] bg-[#FBF9FE]' : 'border-[#EAE5DD] hover:border-[#D8D2C8]'}`}
              >
                <AppStack apps={wf.apps} size={30} max={4} />
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] font-bold flex items-center gap-2">
                    {wf.title}
                    {i === 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#430693] text-white font-semibold" style={{ fontFamily: 'var(--font-mono)' }}>BEST MATCH</span>}
                  </div>
                  <div className="text-[12px] text-[#3A3A44] truncate">{wf.plan.length} steps · {Array.from(new Set(wf.apps)).map((a) => getApp(a)?.name).join(', ')}</div>
                </div>
                <CaretRight size={16} className="text-[#7A7A87]" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ───────────────────── Views ───────────────────── */

function RunRow({ run, onOpen }: { run: any; onOpen: () => void }) {
  const live = useRuns((s) => s.runs[run.id])
  const r: any = live ?? run
  const status = r.status as Run['status']
  const wf = getWorkflow(r.workflowId)
  return (
    <button data-agent={`hw-run-${r.id}`} onClick={onOpen} className="w-full flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-[#F7F5F1] text-left">
      <span className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: status === 'done' ? '#E8F5E9' : status === 'failed' ? '#FDE7E9' : '#F1ECF9' }}>
        {status === 'done' ? <CheckCircle size={18} weight="fill" className="text-[#0E700E]" /> : status === 'failed' ? <WarningCircle size={18} weight="fill" className="text-[#A4262C]" /> : status === 'cancelled' ? <X size={16} className="text-[#605E5C]" /> : <CircleNotch size={18} className="text-[#430693] animate-spin" />}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[13.5px] font-semibold truncate">{r.title}</div>
        <div className="text-[12px] text-[#7A7A87] truncate">
          {r.name} · {status === 'running' || status === 'booting' ? 'Working now' : status === 'paused' ? 'Paused' : relative(typeof r.startedAt === 'number' ? new Date(r.startedAt).toISOString() : r.startedAt)}
          {r.result?.summary ? ` · ${r.result.summary}` : ''}
        </div>
      </div>
      <AppStack apps={wf?.apps ?? r.apps ?? []} size={24} max={4} />
    </button>
  )
}

function useAllRuns() {
  const hist = useCollection<any>('hworker.runs')
  const live = useRuns((s) => s.runs)
  return useMemo(() => {
    const map = new Map<string, any>()
    hist.forEach((h) => map.set(h.id, h))
    Object.values(live).forEach((l) => map.set(l.id, { ...map.get(l.id), ...l }))
    return Array.from(map.values()).sort((a, b) => +new Date(b.startedAt) - +new Date(a.startedAt))
  }, [hist, live])
}

function Home({ onPick, focusPrompt, go }: { onPick: (wf: Workflow, prompt?: string) => void; focusPrompt?: boolean; go: (v: View, runId?: string) => void }) {
  const all = useAllRuns()
  useCollection('outlook.emails') // re-evaluate nudges when data changes
  const nudges = WORKFLOWS.map((wf) => ({ wf, text: wf.nudge?.() })).filter((n) => n.text).slice(0, 4)
  const featured = WORKFLOWS.filter((w) => w.featured).slice(0, 6)
  const done = all.filter((r) => r.status === 'done')
  const active = all.filter((r) => ['running', 'paused', 'booting', 'awaiting'].includes(r.status))
  const minutes = done.reduce((s, r) => s + (parseInt(getWorkflow(r.workflowId)?.timeSaved ?? '20') || 20), 0)
  return (
    <div className="max-w-[920px] mx-auto px-10 pt-12 pb-16">
      <Mono>{COMPANY.name} · H-Worker</Mono>
      <h1 className="mt-2 text-[34px] font-extrabold tracking-tight leading-tight">
        {greet()}, {ME.first}.
      </h1>
      <p className="mt-1 text-[15px] text-[#3A3A44]">What should your AI coworker take off your plate today?</p>
      <div className="mt-7">
        <PromptBox onPick={(wf, p) => onPick(wf, p)} autoFocus={focusPrompt} />
      </div>

      {active.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-2">
            <Mono>Working now</Mono>
            {active.length > 1 && <button onClick={tileAgentWindows} className="text-[12.5px] font-semibold text-[#430693] hover:underline">Tile agent windows</button>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {active.map((r) => (
              <div key={r.id} className="rounded-2xl border border-[#C2A0EE] bg-white p-4">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#7114EB] animate-pulse" />
                  <span className="text-[13px] font-bold flex-1 truncate">{r.name} · {r.title}</span>
                  <button onClick={() => openAgentWindow(r.id)} className="h-7 px-3 rounded-full bg-[#0F0E12] text-white text-[11.5px] font-semibold flex items-center gap-1"><Eye size={13} /> Watch</button>
                </div>
                <div className="mt-3"><PlanList run={r} compact /></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {nudges.length > 0 && (
        <div className="mt-10">
          <Mono>Suggested for you</Mono>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {nudges.map(({ wf, text }) => (
              <button key={wf.id} data-agent={`hw-nudge-${wf.id}`} onClick={() => onPick(wf)} className="group flex items-center gap-3 p-4 rounded-2xl bg-[#F7F5F1] hover:bg-[#F1EEE9] text-left">
                <AppStack apps={wf.apps} size={28} max={3} />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold leading-snug">{text}</div>
                  <div className="text-[11.5px] text-[#7A7A87] mt-0.5">{wf.title}</div>
                </div>
                <span className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#0F0E12] group-hover:bg-[#0F0E12] group-hover:text-white transition-colors"><Play size={12} weight="fill" /></span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-10">
        <div className="flex items-center justify-between">
          <Mono>Popular workflows</Mono>
          <button className="text-[12.5px] font-semibold text-[#430693] hover:underline" onClick={() => go('workflows')}>Browse all {WORKFLOWS.length}</button>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3">
          {featured.map((wf) => (
            <WorkflowCard key={wf.id} wf={wf} onOpen={() => onPick(wf)} onDeploy={() => onPick(wf)} />
          ))}
        </div>
      </div>

      <div className="mt-10 grid grid-cols-3 gap-3">
        {[
          ['Tasks completed', String(done.length)],
          ['Hours given back', (minutes / 60).toFixed(1)],
          ['Apps connected', String(APPS.filter((a) => !['hworker', 'agent', 'settings', 'notepad', 'calculator', 'explorer'].includes(a.id)).length)],
        ].map(([l, v]) => (
          <div key={l} className="rounded-2xl bg-[#0F0E12] text-white p-5 relative overflow-hidden">
            <div className="absolute inset-0" style={{ background: 'radial-gradient(300px 160px at 100% 0%, rgba(113,20,235,0.45), transparent 70%)' }} />
            <div className="relative text-[30px] font-extrabold tracking-tight">{v}</div>
            <div className="relative mt-1"><Mono className="!text-white/60">{l}</Mono></div>
          </div>
        ))}
      </div>

      {all.length > 0 && (
        <div className="mt-10">
          <div className="flex items-center justify-between mb-1">
            <Mono>Recent activity</Mono>
            <button className="text-[12.5px] font-semibold text-[#430693] hover:underline" onClick={() => go('activity')}>View all</button>
          </div>
          <div className="-mx-4">
            {all.slice(0, 4).map((r) => (
              <RunRow key={r.id} run={r} onOpen={() => go('activity', r.id)} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function WorkflowsView({ onPick }: { onPick: (wf: Workflow) => void }) {
  const [cat, setCat] = useState('All')
  const [q, setQ] = useState('')
  const cats = ['All', ...Array.from(new Set(WORKFLOWS.map((w) => w.category)))]
  const list = WORKFLOWS.filter((w) => (cat === 'All' || w.category === cat) && (w.title + w.description + w.keywords.join(' ')).toLowerCase().includes(q.toLowerCase()))
  return (
    <div className="max-w-[1040px] mx-auto px-10 pt-10 pb-16">
      <Mono>Library</Mono>
      <h1 className="mt-2 text-[28px] font-extrabold tracking-tight">Workflows</h1>
      <p className="mt-1 text-[14px] text-[#3A3A44]">Pre-built processes your H-Worker can run end-to-end across {APPS.length - 6} enterprise apps.</p>
      <div className="mt-6 flex items-center gap-3">
        <div className="flex items-center gap-2 h-10 px-4 rounded-full bg-white border border-[#E1DDD6] w-[300px]">
          <MagnifyingGlass size={15} className="text-[#7A7A87]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search workflows" className="flex-1 outline-none text-[13px] bg-transparent" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {cats.map((c) => (
            <button key={c} onClick={() => setCat(c)} className={`h-8 px-3.5 rounded-full text-[12.5px] font-semibold ${cat === c ? 'bg-[#0F0E12] text-white' : 'bg-white border border-[#EAE5DD] text-[#3A3A44] hover:border-[#D8D2C8]'}`}>
              {c}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-6 grid grid-cols-3 gap-3">
        {list.map((wf) => (
          <WorkflowCard key={wf.id} wf={wf} onOpen={() => onPick(wf)} onDeploy={() => onPick(wf)} />
        ))}
      </div>
    </div>
  )
}

function AgentsView({ go }: { go: (v: View, runId?: string) => void }) {
  const all = useAllRuns()
  const live = all.filter((r) => ['running', 'paused', 'booting', 'awaiting'].includes(r.status))
  return (
    <div className="max-w-[1040px] mx-auto px-10 pt-10 pb-16">
      <div className="flex items-end justify-between">
        <div>
          <Mono>Fleet</Mono>
          <h1 className="mt-2 text-[28px] font-extrabold tracking-tight">Agents</h1>
        </div>
        <div className="flex gap-2">
          {live.length > 1 && <button onClick={tileAgentWindows} className="h-9 px-4 rounded-full border border-[#E1DDD6] text-[12.5px] font-semibold hover:bg-[#F7F5F1]">Tile windows</button>}
          <button
            data-agent="hw-showcase"
            onClick={() => {
              WORKFLOWS.filter((w) => w.featured).slice(0, 3).forEach((w, i) => setTimeout(() => startRun(w.id), i * 700))
              setTimeout(tileAgentWindows, 2400)
            }}
            className="h-9 px-4 rounded-full bg-[#0F0E12] text-white text-[12.5px] font-semibold flex items-center gap-1.5 hover:bg-[#2A2930]"
          >
            <Lightning size={14} weight="fill" /> Deploy 3 in parallel
          </button>
        </div>
      </div>
      <p className="mt-1 text-[14px] text-[#3A3A44]">Every H-Worker runs on its own secure desktop. Watch any of them live or take over.</p>
      {live.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-[#D8D2C8] p-12 text-center">
          <Robot size={36} className="mx-auto text-[#7A7A87]" />
          <div className="mt-3 text-[15px] font-bold">No agents running</div>
          <div className="mt-1 text-[13px] text-[#3A3A44]">Deploy a workflow and it will show up here.</div>
          <button onClick={() => go('home')} className="mt-5 h-9 px-4 rounded-full bg-[#0F0E12] text-white text-[12.5px] font-semibold">Deploy an H-Worker</button>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4">
          {live.map((r) => (
            <div key={r.id} className="rounded-2xl border border-[#EAE5DD] bg-white p-5">
              <div className="flex items-center gap-3">
                <img src={appIcon('hworker')} className="w-9 h-9 rounded-lg" alt="" />
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-bold">{r.name}</div>
                  <div className="text-[12px] text-[#7A7A87] truncate">{r.title}</div>
                </div>
                <button onClick={() => openAgentWindow(r.id)} className="h-8 px-3.5 rounded-full bg-[#0F0E12] text-white text-[12px] font-semibold flex items-center gap-1.5"><Eye size={14} /> Watch live</button>
              </div>
              <div className="mt-4"><PlanList run={r} compact /></div>
            </div>
          ))}
        </div>
      )}
      <div className="mt-10">
        <Mono>Capacity</Mono>
        <div className="mt-3 grid grid-cols-4 gap-3">
          {[['Seats', '10'], ['Running', String(live.length)], ['Available', String(10 - live.length)], ['Region', 'US-East']].map(([k, v]) => (
            <div key={k} className="rounded-2xl bg-[#F7F5F1] p-4">
              <div className="text-[22px] font-extrabold">{v}</div>
              <Mono>{k}</Mono>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ActivityView({ selectedId, setSelected }: { selectedId?: string; setSelected: (id?: string) => void }) {
  const all = useAllRuns()
  const { openOnMain } = useDesk()
  const sel = all.find((r) => r.id === selectedId)
  return (
    <div className="flex h-full">
      <div className="flex-1 min-w-0 overflow-auto">
        <div className="max-w-[860px] mx-auto px-10 pt-10 pb-16">
          <Mono>Audit trail</Mono>
          <h1 className="mt-2 text-[28px] font-extrabold tracking-tight">Activity</h1>
          <p className="mt-1 text-[14px] text-[#3A3A44]">Every task your H-Workers have completed, with results you can open in your own apps.</p>
          <div className="mt-6 rounded-2xl border border-[#EAE5DD] bg-white overflow-hidden">
            <div className="grid grid-cols-[1fr_120px_110px_80px] gap-3 px-5 h-10 items-center bg-[#F7F5F1] text-[11px] text-[#7A7A87]" style={{ fontFamily: 'var(--font-mono)' }}>
              <span>TASK</span><span>STATUS</span><span>WHEN</span><span className="text-right">ACTIONS</span>
            </div>
            {all.map((r) => (
              <button key={r.id} data-agent={`hw-activity-${r.id}`} onClick={() => setSelected(r.id)} className={`w-full grid grid-cols-[1fr_120px_110px_80px] gap-3 px-5 py-3 items-center text-left border-t border-[#F1EEE9] ${selectedId === r.id ? 'bg-[#FBF9FE]' : 'hover:bg-[#FBFAF8]'}`}>
                <div className="flex items-center gap-3 min-w-0">
                  <AppStack apps={getWorkflow(r.workflowId)?.apps ?? r.apps ?? []} size={24} max={3} />
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold truncate">{r.title}</div>
                    <div className="text-[11.5px] text-[#7A7A87] truncate">{r.name}</div>
                  </div>
                </div>
                <StatusBadge status={r.status} />
                <span className="text-[12px] text-[#3A3A44]">{relative(typeof r.startedAt === 'number' ? new Date(r.startedAt).toISOString() : r.startedAt)}</span>
                <span className="text-[12px] text-right tabular-nums" style={{ fontFamily: 'var(--font-mono)' }}>{r.actions ?? r.log?.filter((l: any) => l.kind === 'action' || l.kind === 'open').length ?? 0}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      {sel && (
        <div className="w-[400px] shrink-0 border-l border-[#EAE5DD] bg-white overflow-auto slide-up" data-agent="hw-activity-detail">
          <div className="p-6 border-b border-[#EAE5DD]">
            <div className="flex items-center justify-between">
              <StatusBadge status={sel.status} />
              <button onClick={() => setSelected(undefined)} className="w-7 h-7 rounded-full hover:bg-[#F1EEE9] flex items-center justify-center"><X size={14} /></button>
            </div>
            <div className="mt-3 text-[18px] font-extrabold leading-tight">{sel.title}</div>
            <div className="mt-1 text-[12px] text-[#7A7A87]">{sel.name} · {new Date(sel.startedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</div>
            {sel.result?.summary && <div className="mt-4 p-4 rounded-xl bg-[#F1EEE9] border-l-2 border-[#430693] text-[13px] leading-relaxed">{sel.result.summary}</div>}
            {sel.error && <div className="mt-4 p-4 rounded-xl bg-[#FDE7E9] text-[12.5px] text-[#A4262C]">{sel.error}</div>}
            {sel.result?.metrics && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {sel.result.metrics.map((m: any) => (
                  <div key={m.label} className="rounded-lg bg-[#F7F5F1] px-3 py-2">
                    <div className="text-[15px] font-extrabold text-[#430693]">{m.value}</div>
                    <div className="text-[10.5px] text-[#7A7A87] leading-tight">{m.label}</div>
                  </div>
                ))}
              </div>
            )}
            {sel.result?.outputs?.length > 0 && (
              <div className="mt-5">
                <Mono>Check the results</Mono>
                <div className="mt-2 space-y-2">
                  {sel.result.outputs.map((o: any, i: number) => (
                    <button key={i} data-agent={`hw-output-${i}`} onClick={() => openOnMain(o.appId, o.params)} className="w-full flex items-center gap-3 p-3 rounded-xl border border-[#EAE5DD] hover:border-[#C2A0EE] hover:bg-[#FBF9FE] text-left">
                      <img src={appIcon(o.appId)} className="w-6 h-6 object-contain" alt="" />
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-semibold truncate">{o.label}</div>
                        <div className="text-[11.5px] text-[#7A7A87] truncate">{o.description ?? `Opens in ${getApp(o.appId)?.name}`}</div>
                      </div>
                      <ArrowSquareOut size={15} className="text-[#7A7A87]" />
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-5 flex gap-2">
              {['running', 'paused', 'booting', 'awaiting'].includes(sel.status) ? (
                <button onClick={() => openAgentWindow(sel.id)} className="h-9 px-4 rounded-full bg-[#0F0E12] text-white text-[12.5px] font-semibold flex items-center gap-1.5"><Eye size={14} /> Watch live</button>
              ) : (
                <button onClick={() => startRun(sel.workflowId, sel.inputs ?? {}, { prompt: sel.prompt })} className="h-9 px-4 rounded-full border border-[#E1DDD6] text-[12.5px] font-semibold flex items-center gap-1.5 hover:bg-[#F7F5F1]"><ArrowCounterClockwise size={14} /> Run again</button>
              )}
            </div>
          </div>
          <div className="p-6">
            <Mono>Action log</Mono>
            <div className="mt-3 space-y-2">
              {(sel.log ?? []).filter((l: any) => l.kind !== 'step').map((l: any, i: number) => (
                <div key={i} className="flex gap-2.5 text-[12px] leading-snug">
                  <span className="w-14 shrink-0 text-[10.5px] text-[#9A97A3] pt-[1px]" style={{ fontFamily: 'var(--font-mono)' }}>{new Date(l.t).toLocaleTimeString('en-US', { hour12: false })}</span>
                  {l.appId ? <img src={appIcon(l.appId)} className="w-3.5 h-3.5 mt-[1px] object-contain" alt="" /> : <span className="w-3.5" />}
                  <span className={l.kind === 'think' ? 'italic text-[#3A3A44]' : l.kind === 'error' ? 'text-[#A4262C]' : l.kind === 'api' || l.kind === 'code' ? 'text-[#0B5394]' : ''} style={l.kind === 'api' || l.kind === 'code' ? { fontFamily: 'var(--font-mono)' } : undefined}>{l.kind === 'api' ? 'API · ' : l.kind === 'code' ? 'CODE · ' : ''}{l.text}</span>
                </div>
              ))}
              {!sel.log?.length && <div className="text-[12px] text-[#7A7A87]">Detailed log not retained for this run.</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const m: Record<string, [string, string, string]> = {
    done: ['Completed', '#E8F5E9', '#0E700E'],
    failed: ['Failed', '#FDE7E9', '#A4262C'],
    cancelled: ['Stopped', '#F3F2F1', '#605E5C'],
    running: ['Running', '#F1ECF9', '#430693'],
    booting: ['Starting', '#F1ECF9', '#430693'],
    paused: ['Paused', '#FFF4CE', '#8A5A00'],
    awaiting: ['Needs approval', '#FFF4CE', '#8A5A00'],
  }
  const [l, bg, fg] = m[status] ?? ['—', '#F3F2F1', '#605E5C']
  return <span className="inline-flex w-fit items-center h-6 px-2.5 rounded-full text-[11.5px] font-semibold" style={{ background: bg, color: fg }}>{l}</span>
}

function IntegrationsView() {
  const apps = APPS.filter((a) => !['hworker', 'agent'].includes(a.id))
  return (
    <div className="max-w-[1040px] mx-auto px-10 pt-10 pb-16">
      <Mono>Connected workspace</Mono>
      <h1 className="mt-2 text-[28px] font-extrabold tracking-tight">Applications</h1>
      <p className="mt-1 text-[14px] text-[#3A3A44]">H-Worker operates your apps through their normal interface — no APIs or integrations to build.</p>
      <div className="mt-6 grid grid-cols-4 gap-3">
        {apps.map((a) => (
          <div key={a.id} className="rounded-2xl border border-[#EAE5DD] bg-white p-4">
            <div className="flex items-center gap-3">
              <img src={a.icon} className="w-8 h-8 object-contain" alt="" />
              <div className="min-w-0">
                <div className="text-[13px] font-bold truncate">{a.name}</div>
                <div className="text-[11px] text-[#7A7A87] truncate">{a.publisher}</div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="inline-flex items-center gap-1 text-[11.5px] text-[#0E700E] font-semibold"><CheckCircle size={13} weight="fill" /> Ready</span>
              <Mono>{a.frame === 'browser' ? 'Web' : 'Desktop'}</Mono>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SettingsView() {
  const prefs = useCollection<any>('hworker.settings').find((p) => p.id === 'prefs') ?? { id: 'prefs' }
  const [opts, setLocal] = useState({ confirmSend: !!prefs.confirmExternal, notify: true, record: true })
  const setOpts = (o: typeof opts) => {
    setLocal(o)
    db.upsert('hworker.settings', { ...prefs, id: 'prefs', confirmExternal: o.confirmSend })
  }
  const Toggle = ({ k, label, desc }: { k: keyof typeof opts; label: string; desc: string }) => (
    <div className="flex items-center gap-4 py-4 border-t border-[#F1EEE9]">
      <div className="flex-1">
        <div className="text-[13.5px] font-semibold">{label}</div>
        <div className="text-[12.5px] text-[#7A7A87]">{desc}</div>
      </div>
      <button onClick={() => setOpts({ ...opts, [k]: !opts[k] })} className={`relative w-11 h-6 rounded-full transition-colors ${opts[k] ? 'bg-[#0F0E12]' : 'bg-[#D8D2C8]'}`}>
        <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${opts[k] ? 'left-6' : 'left-1'}`} />
      </button>
    </div>
  )
  return (
    <div className="max-w-[720px] mx-auto px-10 pt-10 pb-16">
      <Mono>Preferences</Mono>
      <h1 className="mt-2 text-[28px] font-extrabold tracking-tight">Settings</h1>
      <div className="mt-6 rounded-2xl border border-[#EAE5DD] bg-white px-6">
        <div className="flex items-center gap-4 py-5">
          <span className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold" style={{ background: ME.color }}>AM</span>
          <div className="flex-1">
            <div className="text-[15px] font-bold">{ME.name}</div>
            <div className="text-[12.5px] text-[#7A7A87]">{ME.title} · {COMPANY.name} · Enterprise plan</div>
          </div>
        </div>
        <Toggle k="confirmSend" label="Ask before sending external email" desc="Agents pause for approval before emailing anyone outside northwind.com" />
        <Toggle k="notify" label="Desktop notifications" desc="Get a Windows notification when an agent finishes" />
        <Toggle k="record" label="Record sessions" desc="Keep a screen recording of each run for audit (30 days)" />
      </div>
      <div className="mt-6 rounded-2xl border border-[#F1B8BE] bg-white p-6">
        <div className="text-[14px] font-bold">Reset demo environment</div>
        <div className="mt-1 text-[12.5px] text-[#3A3A44] leading-relaxed">Restore every app to its original state — emails, expense reports, invoices, tickets, CRM records — and clear agent history. All data in this demo lives only in your browser cache.</div>
        <button data-agent="hw-reset" onClick={requestReset} className="mt-4 h-9 px-4 rounded-full bg-[#A4262C] hover:bg-[#8E1F25] text-white text-[12.5px] font-semibold flex items-center gap-1.5"><ArrowCounterClockwise size={14} /> Reset demo</button>
      </div>
    </div>
  )
}

/* ───────────────────── Shell ───────────────────── */

export default function HWorker({ win, params }: AppProps) {
  const [view, setView] = useState<View>('home')
  const [sheet, setSheet] = useState<{ wf: Workflow; prompt?: string } | null>(null)
  const [selRun, setSelRun] = useState<string | undefined>()
  const [focusPrompt, setFocusPrompt] = useState(false)
  const fleetReviews = useFleet((s) => s.fleet?.agents.filter((a) => a.status === 'review').length ?? 0)
  const liveCount = useRuns((s) => Object.values(s.runs).filter((r) => ['running', 'paused', 'booting', 'awaiting'].includes(r.status)).length)

  useEffect(() => {
    if (params?.view) setView(params.view)
    if (params?.runId) setSelRun(params.runId)
    if (params?.workflowId) {
      const wf = getWorkflow(params.workflowId)
      if (wf) setSheet({ wf })
    }
    if (params?.focusPrompt) setFocusPrompt(true)
  }, [win.nonce])

  const go = (v: View, runId?: string) => {
    setView(v)
    if (runId) setSelRun(runId)
  }

  const nav: [View, any, string, number?][] = [
    ['home', House, 'Home'],
    ['workflows', SquaresFour, 'Workflows'],
    ['builder', MagicWand, 'Builder'],
    ['workforce', UsersThree, 'Workforce', fleetReviews],
    ['evals', Exam, 'Evals'],
    ['agents', Robot, 'Agents', liveCount],
    ['activity', ClockCounterClockwise, 'Activity'],
    ['integrations', PlugsConnected, 'Applications'],
    ['settings', GearSix, 'Settings'],
  ]

  return (
    <div className="relative flex-1 min-h-0 flex flex-col bg-white text-[#0F0E12]" style={{ fontFamily: 'var(--font-brand)' }}>
      <div data-drag-handle className="h-11 shrink-0 flex items-center pl-4 bg-[#FBFAF8] border-b border-[#EAE5DD]">
        <HMark className="h-[14px]" />
        <span className="ml-2.5 text-[13px] font-bold tracking-tight">H-Worker</span>
        <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-[#F1ECF9] text-[#5A0CC0] font-semibold" style={{ fontFamily: 'var(--font-mono)' }}>ENTERPRISE</span>
        <div className="flex-1" />
        <WindowControls height={44} />
      </div>
      <div className="flex-1 min-h-0 flex">
        <aside className="w-[220px] shrink-0 flex flex-col bg-[#FBFAF8] border-r border-[#EAE5DD] px-3 py-4">
          <button
            data-agent="hw-new-task"
            onClick={() => {
              setView('home')
              setFocusPrompt(true)
            }}
            className="h-10 rounded-full bg-[#0F0E12] hover:bg-[#2A2930] text-white text-[13px] font-semibold flex items-center justify-center gap-2"
          >
            <Plus size={15} weight="bold" /> New task
          </button>
          <nav className="mt-5 space-y-0.5">
            {nav.map(([id, Icon, label, badge]) => (
              <button
                key={id}
                data-agent={`hw-nav-${id}`}
                onClick={() => setView(id)}
                className={`w-full flex items-center gap-3 h-9 px-3 rounded-lg text-[13px] ${view === id ? 'bg-white shadow-[0_1px_2px_rgba(15,14,18,0.06)] border border-[#EAE5DD] font-semibold' : 'text-[#3A3A44] hover:bg-[#F1EEE9] border border-transparent'}`}
              >
                <Icon size={17} weight={view === id ? 'fill' : 'regular'} className={view === id ? 'text-[#430693]' : ''} />
                <span className="flex-1 text-left">{label}</span>
                {!!badge && <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-[#430693] text-white text-[10.5px] font-bold flex items-center justify-center">{badge}</span>}
              </button>
            ))}
          </nav>
          <div className="flex-1" />
          <div className="rounded-xl bg-[#0F0E12] text-white p-3.5 relative overflow-hidden">
            <div className="absolute inset-0" style={{ background: 'radial-gradient(200px 120px at 100% 0%, rgba(113,20,235,0.55), transparent 70%)' }} />
            <div className="relative flex items-center gap-1.5 text-[12px] font-bold"><Lightning size={14} weight="fill" className="text-[#C2A0EE]" /> Holo 4 · hybrid execution</div>
            <div className="relative mt-1 text-[11px] text-white/60 leading-snug">Each step runs the cheapest reliable way: API, code, or computer use on screen.</div>
          </div>
          <div className="mt-3 flex items-center gap-2.5 px-1">
            <span className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold" style={{ background: ME.color }}>AM</span>
            <div className="min-w-0">
              <div className="text-[12.5px] font-semibold truncate">{ME.name}</div>
              <div className="text-[11px] text-[#7A7A87] truncate">{COMPANY.name}</div>
            </div>
          </div>
        </aside>
        <main className="flex-1 min-w-0 overflow-auto bg-white" style={{ backgroundImage: view === 'home' ? 'radial-gradient(800px 300px at 100% 0%, rgba(241,236,249,0.9), transparent 70%)' : undefined }}>
          {view === 'home' && <Home onPick={(wf, prompt) => setSheet({ wf, prompt })} focusPrompt={focusPrompt} go={go} />}
          {view === 'workflows' && <WorkflowsView onPick={(wf) => setSheet({ wf })} />}
          {view === 'builder' && <BuilderView />}
          {view === 'workforce' && <WorkforceView />}
          {view === 'evals' && <EvalsView />}
          {view === 'agents' && <AgentsView go={go} />}
          {view === 'activity' && <ActivityView selectedId={selRun} setSelected={setSelRun} />}
          {view === 'integrations' && <IntegrationsView />}
          {view === 'settings' && <SettingsView />}
        </main>
      </div>
      {sheet && <DeploySheet wf={sheet.wf} prompt={sheet.prompt} onClose={() => setSheet(null)} onDeployed={() => setSheet(null)} />}
    </div>
  )
}
