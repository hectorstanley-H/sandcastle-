/**
 * Agent builder — "teach by showing". A recorded session of a person doing the task is turned into a
 * plan whose steps each get an execution method (API / code / computer use) and a model, then edited
 * and test-run. The recording and analysis are staged for the demo; the test run is the real agent.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Record,
  Stop,
  ChatText,
  PlugsConnected,
  Sparkle,
  CheckCircle,
  CircleNotch,
  Play,
  RocketLaunch,
  ShieldCheck,
  Lightning,
  EnvelopeSimple,
  ArrowDown,
  Timer,
  UserCircle,
} from '@phosphor-icons/react'
import { appIcon } from '@/os/registry'
import { getWorkflow } from '@/workflows'
import { startRun } from '@/agent/runtime'
import { ViaChip } from '@/agent/AgentWindow'
import { fmtUsd, MODELS, normalizePlan, RATES, VIA_STYLE } from '@/agent/execution'
import type { PlanStep } from '@/agent/types'
import { Mono } from './shared'

const WORKFLOW_ID = 'sap-post-supplier-invoice'

/** what the person did, as captured by the recorder; `step` = plan step it ends up in */
const EVENTS: { t: number; app: string; text: string; step: number }[] = [
  { t: 0, app: 'outlook', text: 'Open Outlook › Inbox', step: 0 },
  { t: 9, app: 'outlook', text: 'Search “invoice” · filter: has attachments', step: 0 },
  { t: 21, app: 'outlook', text: 'Open “Invoice INV-20931 — October facilities services”', step: 1 },
  { t: 27, app: 'acrobat', text: 'Open INV-20931.pdf', step: 1 },
  { t: 44, app: 'acrobat', text: 'Scroll to line items · zoom 150%', step: 1 },
  { t: 63, app: 'excel', text: 'Copy amounts into “AP match — Oct.xlsx”', step: 1 },
  { t: 92, app: 'sap', text: 'SAP › Manage Purchase Orders › search 4500018234', step: 2 },
  { t: 118, app: 'sap', text: 'Open PO items · read net values', step: 2 },
  { t: 141, app: 'sap', text: 'Display goods receipt / service entry sheets', step: 2 },
  { t: 166, app: 'excel', text: 'Type PO and receipt values next to invoice lines', step: 3 },
  { t: 190, app: 'excel', text: '=SUM(C2:C4)-F2 → 0.00', step: 3 },
  { t: 214, app: 'sap', text: 'Create Supplier Invoice › Invoicing Party: Fabrikam', step: 4 },
  { t: 231, app: 'sap', text: 'Type invoice date, reference INV-20931, gross 14,250.00', step: 4 },
  { t: 252, app: 'sap', text: 'Reference PO 4500018234 › Enter', step: 4 },
  { t: 266, app: 'sap', text: 'Simulate › check balance 0.00 › Post', step: 4 },
  { t: 291, app: 'sap', text: 'Create Supplier Invoice › Litware, LW-7781, 3,980.00', step: 5 },
  { t: 318, app: 'sap', text: 'Reference PO 4500018390 › Post', step: 5 },
  { t: 340, app: 'outlook', text: 'Reply to Mike Harrington — posted, payment date', step: 6 },
  { t: 372, app: 'outlook', text: 'Reply to Sam Patel — posted, payment date', step: 6 },
  { t: 402, app: 'outlook', text: 'Send', step: 6 },
]
const RECORDED_S = 402

/** why each step was routed the way it was — shown while the plan is being built */
const DETECTED: string[] = [
  'Mailbox is reachable through Microsoft Graph → no need to drive Outlook.',
  'Unstructured PDF, layout differs per supplier → large computer-use model.',
  'SAP OData read access is enabled → fetch POs and receipts by API.',
  'The Excel step was arithmetic → replaced by deterministic code.',
  'No posting API on this tenant → Fiori app, routine screens → small model.',
  'Same screens as the step before → small model.',
  'Replies belong in the supplier’s thread → Outlook, small model.',
]

const VARIABLES = [
  { name: 'supplier', example: 'Fabrikam Supplies', from: 'invoice PDF' },
  { name: 'invoice_number', example: 'INV-20931', from: 'email subject + PDF' },
  { name: 'gross_amount', example: '14,250.00', from: 'invoice PDF' },
  { name: 'po_number', example: '4500018234', from: 'invoice PDF' },
  { name: 'payment_terms', example: 'Net 30', from: 'supplier master' },
]

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

/** rough per-run estimate from the recorded actions in each step */
function estimate(step: PlanStep, i: number) {
  const actions = EVENTS.filter((e) => e.step === i).length * 2
  if (step.via === 'api') return RATES.api * 2
  if (step.via === 'code') return 0
  const m = step.model ?? 'small'
  return actions * RATES.action[m] + RATES.think[m]
}

type Phase = 'start' | 'recording' | 'analyzing' | 'canvas'

export function BuilderView() {
  const basePlan = useMemo(() => normalizePlan(getWorkflow(WORKFLOW_ID)?.plan ?? []), [])
  const [phase, setPhase] = useState<Phase>('start')
  const [shown, setShown] = useState(0) // recorded events revealed
  const [analyzed, setAnalyzed] = useState(0) // plan steps revealed
  const [steps, setSteps] = useState<(PlanStep & { approve?: boolean })[]>(basePlan)
  const [published, setPublished] = useState(false)
  const [buildStart, setBuildStart] = useState<number | null>(null)
  const [buildEnd, setBuildEnd] = useState<number | null>(null)
  const [, tick] = useState(0)
  const timers = useRef<number[]>([])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  useEffect(() => {
    if (!buildStart || buildEnd) return
    const t = setInterval(() => tick((x) => x + 1), 500)
    return () => clearInterval(t)
  }, [buildStart, buildEnd])

  const later = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms))

  const startRecording = () => {
    setPhase('recording')
    setShown(0)
    setBuildStart(Date.now())
    setBuildEnd(null)
    EVENTS.forEach((_, i) => later(500 + i * 420, () => setShown(i + 1)))
  }

  const stopRecording = () => {
    setPhase('analyzing')
    setAnalyzed(0)
    basePlan.forEach((_, i) => later(900 + i * 1100, () => setAnalyzed(i + 1)))
    later(900 + basePlan.length * 1100 + 1400, () => {
      setSteps(basePlan)
      setPhase('canvas')
    })
  }

  const reset = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
    setPhase('start')
    setPublished(false)
    setBuildStart(null)
    setBuildEnd(null)
  }

  const elapsed = buildStart ? ((buildEnd ?? Date.now()) - buildStart) / 1000 : 0
  const recClock = shown ? EVENTS[shown - 1].t : 0

  return (
    <div className="px-10 py-8 max-w-[1100px]" data-agent="hw-builder">
      <div className="flex items-end justify-between gap-6">
        <div>
          <Mono>Agent builder</Mono>
          <h1 className="mt-1 text-[26px] font-bold tracking-tight">Teach H-Worker by showing it</h1>
          <p className="mt-1 text-[13.5px] text-[#3A3A44] max-w-[620px]">Do the task once. H-Worker turns the recording into an agent, and picks the cheapest reliable way to run each step: API, code, or computer use.</p>
        </div>
        {buildStart && (
          <div className="shrink-0 flex items-center gap-2 h-10 px-4 rounded-full bg-[#0F0E12] text-white" data-agent="hw-builder-clock">
            <Timer size={16} weight="bold" className="text-[#C2A0EE]" />
            <span className="text-[12px] text-white/70">{buildEnd ? 'Agent built in' : 'Building'}</span>
            <span className="text-[15px] font-bold tabular-nums" style={{ fontFamily: 'var(--font-mono)' }}>{mmss(elapsed)}</span>
          </div>
        )}
      </div>

      {phase === 'start' && (
        <div className="mt-8 grid grid-cols-3 gap-4 fade-in">
          <button onClick={startRecording} data-agent="hw-builder-record" className="text-left rounded-2xl p-5 bg-[#0F0E12] text-white relative overflow-hidden hover:shadow-xl transition">
            <div className="absolute inset-0" style={{ background: 'radial-gradient(320px 180px at 100% 0%, rgba(113,20,235,0.6), transparent 70%)' }} />
            <span className="relative w-10 h-10 rounded-xl bg-[#E5484D] flex items-center justify-center"><Record size={20} weight="fill" /></span>
            <div className="relative mt-4 text-[16px] font-bold">Record a task</div>
            <div className="relative mt-1 text-[12.5px] text-white/70 leading-snug">Do it once on your desktop. H-Worker watches the screen, clicks and keystrokes.</div>
            <div className="relative mt-5 inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full bg-white text-[#0F0E12] text-[12px] font-semibold">Start recording</div>
          </button>
          <div className="rounded-2xl p-5 border border-[#EAE5DD] bg-white">
            <span className="w-10 h-10 rounded-xl bg-[#F1ECF9] text-[#430693] flex items-center justify-center"><ChatText size={20} weight="fill" /></span>
            <div className="mt-4 text-[16px] font-bold">Describe it</div>
            <div className="mt-1 text-[12.5px] text-[#3A3A44] leading-snug">Write the procedure in plain language, or paste an existing SOP or runbook.</div>
          </div>
          <div className="rounded-2xl p-5 border border-[#EAE5DD] bg-white">
            <span className="w-10 h-10 rounded-xl bg-[#E5F1FB] text-[#0B5394] flex items-center justify-center"><PlugsConnected size={20} weight="fill" /></span>
            <div className="mt-4 text-[16px] font-bold">From APIs & templates</div>
            <div className="mt-1 text-[12.5px] text-[#3A3A44] leading-snug">Start from a workflow template or the APIs your systems already expose.</div>
          </div>
        </div>
      )}

      {phase === 'recording' && (
        <div className="mt-8 grid grid-cols-[1fr_380px] gap-5 fade-in">
          <div className="rounded-2xl bg-[#16151B] p-4 flex flex-col min-h-[420px]">
            <div className="flex items-center gap-2 text-white">
              <span className="w-2.5 h-2.5 rounded-full bg-[#E5484D] animate-pulse" />
              <span className="text-[12px] font-bold tracking-wide" style={{ fontFamily: 'var(--font-mono)' }}>REC {mmss(recClock)}</span>
              <span className="ml-2 text-[12px] text-white/50">Alex Morgan · posting supplier invoices</span>
            </div>
            <div className="flex-1 mt-4 rounded-xl bg-[#0F0E12] border border-white/10 flex flex-col items-center justify-center text-center px-8">
              {shown > 0 && (
                <div key={shown} className="result-in flex flex-col items-center">
                  <img src={appIcon(EVENTS[shown - 1].app)} className="w-16 h-16 object-contain" alt="" />
                  <div className="mt-4 text-[15px] text-white font-semibold">{EVENTS[shown - 1].text}</div>
                </div>
              )}
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-[11.5px] text-white/50">{shown} actions captured</span>
              <button
                onClick={stopRecording}
                disabled={shown < EVENTS.length}
                data-agent="hw-builder-stop"
                className="h-9 px-4 rounded-full bg-[#E5484D] text-white text-[12.5px] font-semibold flex items-center gap-1.5 disabled:opacity-40"
              >
                <Stop size={14} weight="fill" /> Stop & build agent
              </button>
            </div>
          </div>
          <div className="rounded-2xl border border-[#EAE5DD] p-4 max-h-[460px] overflow-auto">
            <Mono>Captured actions</Mono>
            <ol className="mt-3 space-y-1.5">
              {EVENTS.slice(0, shown).map((e, i) => (
                <li key={i} className="flex items-start gap-2 text-[12px] feed-in">
                  <span className="w-9 shrink-0 text-[10.5px] text-[#9A97A3] pt-[1px] tabular-nums" style={{ fontFamily: 'var(--font-mono)' }}>{mmss(e.t)}</span>
                  <img src={appIcon(e.app)} className="w-3.5 h-3.5 mt-[1px] object-contain shrink-0" alt="" />
                  <span className="leading-snug">{e.text}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {phase === 'analyzing' && (
        <div className="mt-8 grid grid-cols-[1fr_320px] gap-5 fade-in">
          <div className="rounded-2xl border border-[#EAE5DD] p-5">
            <div className="flex items-center gap-2">
              <CircleNotch size={16} weight="bold" className="text-[#430693] animate-spin" />
              <span className="text-[14px] font-bold">Turning {EVENTS.length} recorded actions ({mmss(RECORDED_S)}) into a plan</span>
            </div>
            <ol className="mt-4 space-y-3">
              {basePlan.slice(0, analyzed).map((s, i) => (
                <li key={i} className="flex gap-3 result-in">
                  <span className="w-6 h-6 shrink-0 rounded-full bg-[#F1ECF9] text-[#430693] text-[11px] font-bold flex items-center justify-center" style={{ fontFamily: 'var(--font-mono)' }}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-[13px] font-semibold">{s.text} <ViaChip step={s} /></div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-[#5A5866]">
                      <Sparkle size={12} weight="fill" className="text-[#7114EB] shrink-0" /> {DETECTED[i]}
                      <span className="ml-auto shrink-0 text-[#9A97A3]">{EVENTS.filter((e) => e.step === i).length} recorded actions</span>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div className="rounded-2xl border border-[#EAE5DD] p-5">
            <Mono>Variables detected</Mono>
            <div className="mt-3 space-y-2">
              {VARIABLES.slice(0, Math.min(VARIABLES.length, analyzed)).map((v) => (
                <div key={v.name} className="rounded-lg bg-[#FBFAF8] border border-[#EAE5DD] px-3 py-2 result-in">
                  <div className="text-[12px] font-bold text-[#430693]" style={{ fontFamily: 'var(--font-mono)' }}>{`{${v.name}}`}</div>
                  <div className="text-[11.5px] text-[#3A3A44]">e.g. {v.example} · from {v.from}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {phase === 'canvas' && (
        <Canvas
          steps={steps}
          setSteps={setSteps}
          published={published}
          onPublish={() => {
            setPublished(true)
            if (!buildEnd) setBuildEnd(Date.now())
          }}
          onTest={() => {
            if (!buildEnd) setBuildEnd(Date.now())
            startRun(WORKFLOW_ID)
          }}
          onReset={reset}
        />
      )}
    </div>
  )
}

function Canvas({
  steps,
  setSteps,
  published,
  onPublish,
  onTest,
  onReset,
}: {
  steps: (PlanStep & { approve?: boolean })[]
  setSteps: (s: (PlanStep & { approve?: boolean })[]) => void
  published: boolean
  onPublish: () => void
  onTest: () => void
  onReset: () => void
}) {
  const patch = (i: number, p: Partial<PlanStep & { approve?: boolean }>) => setSteps(steps.map((s, j) => (j === i ? { ...s, ...p } : s)))
  const perRun = steps.reduce((n, s, i) => n + estimate(s, i), 0)
  const person = (parseInt(getWorkflow(WORKFLOW_ID)?.timeSaved ?? '40') || 40) * RATES.personMinute
  const mix = (['api', 'code', 'cua'] as const).map((v) => [v, steps.filter((s) => s.via === v).length] as const)

  return (
    <div className="mt-8 grid grid-cols-[1fr_300px] gap-6 fade-in">
      <div>
        <div className="flex items-center gap-3">
          <input defaultValue="Post supplier invoices in SAP" className="flex-1 text-[18px] font-bold bg-transparent outline-none border-b border-transparent focus:border-[#C2A0EE]" />
          {published ? (
            <span className="h-8 px-3 rounded-full bg-[#DFF6DD] text-[#0E700E] text-[12px] font-semibold flex items-center gap-1.5"><CheckCircle size={14} weight="fill" /> Live</span>
          ) : (
            <span className="h-8 px-3 rounded-full bg-[#F1EEE9] text-[#3A3A44] text-[12px] font-semibold flex items-center">Draft</span>
          )}
        </div>

        {/* trigger */}
        <div className="mt-5 rounded-xl border border-dashed border-[#C2A0EE] bg-[#FBF9FE] px-4 py-3 flex items-center gap-3">
          <span className="w-8 h-8 rounded-lg bg-white border border-[#EAE5DD] flex items-center justify-center"><EnvelopeSimple size={16} className="text-[#430693]" /></span>
          <div className="flex-1">
            <Mono>Trigger</Mono>
            <div className="text-[13px] font-semibold">When an email with an invoice PDF arrives in ap@northwind.com</div>
          </div>
          <Lightning size={16} weight="fill" className="text-[#7114EB]" />
        </div>

        <ol className="mt-1">
          {steps.map((s, i) => (
            <li key={i}>
              <div className="flex justify-center py-1"><ArrowDown size={14} className="text-[#C9C6CF]" /></div>
              <div className="rounded-xl border border-[#EAE5DD] bg-white p-4 hover:border-[#D8D2C8] transition" data-agent={`hw-builder-step-${i}`}>
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 shrink-0 rounded-full text-white text-[11px] font-bold flex items-center justify-center" style={{ background: VIA_STYLE[s.via].dot, fontFamily: 'var(--font-mono)' }}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-[13.5px] font-semibold">{s.text} <ViaChip step={s} /></div>
                    {s.why && <div className="mt-1 text-[11.5px] text-[#5A5866] leading-snug">{s.why}</div>}
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[11.5px]">
                      <select
                        value={s.via}
                        onChange={(e) => patch(i, { via: e.target.value as PlanStep['via'] })}
                        className="h-7 px-2 rounded-md border border-[#E1DDD6] bg-white"
                      >
                        <option value="api">API</option>
                        <option value="code">Code</option>
                        <option value="cua">Computer use</option>
                      </select>
                      {s.via === 'cua' && (
                        <select value={s.model ?? 'small'} onChange={(e) => patch(i, { model: e.target.value as 'small' | 'large' })} className="h-7 px-2 rounded-md border border-[#E1DDD6] bg-white">
                          <option value="small">{MODELS.small.name}</option>
                          <option value="large">{MODELS.large.name}</option>
                        </select>
                      )}
                      <label className="flex items-center gap-1.5 h-7 px-2 rounded-md border border-[#E1DDD6] cursor-pointer select-none">
                        <input type="checkbox" checked={!!s.approve} onChange={(e) => patch(i, { approve: e.target.checked })} className="accent-[#430693]" />
                        <UserCircle size={13} /> Ask a person first
                      </label>
                      <span className="ml-auto text-[10.5px] text-[#9A97A3] tabular-nums" style={{ fontFamily: 'var(--font-mono)' }}>~{fmtUsd(estimate(s, i))} / run</span>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* right rail */}
      <div className="space-y-4">
        <div className="rounded-2xl bg-[#0F0E12] text-white p-4 relative overflow-hidden">
          <div className="absolute inset-0" style={{ background: 'radial-gradient(260px 160px at 100% 0%, rgba(113,20,235,0.55), transparent 70%)' }} />
          <div className="relative">
            <Mono className="!text-white/50">Estimated per run</Mono>
            <div className="mt-1 text-[28px] font-bold tabular-nums">{fmtUsd(perRun)}</div>
            <div className="text-[12px] text-white/60">vs ${person.toFixed(0)} when done by hand</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {mix.map(([v, n]) => n > 0 && (
                <span key={v} className="flex items-center gap-1 text-[11px] text-white/80"><span className="w-1.5 h-1.5 rounded-full" style={{ background: VIA_STYLE[v].dot }} />{n} {VIA_STYLE[v].label.toLowerCase()}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#EAE5DD] p-4">
          <div className="flex items-center gap-1.5"><ShieldCheck size={15} weight="fill" className="text-[#430693]" /><Mono>Permissions</Mono></div>
          <ul className="mt-2.5 space-y-2 text-[12px] text-[#3A3A44]">
            <li><b className="text-[#0F0E12]">Read</b> · AP inbox, SAP purchase orders & receipts</li>
            <li><b className="text-[#0F0E12]">Write</b> · SAP supplier invoices up to $25,000</li>
            <li><b className="text-[#0F0E12]">Send</b> · email to the invoice’s supplier only</li>
            <li><b className="text-[#0F0E12]">Above limit or mismatch</b> · hand back to Emma Schultz (AP)</li>
          </ul>
        </div>

        <div className="rounded-2xl border border-[#EAE5DD] p-4">
          <Mono>Variables</Mono>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {VARIABLES.map((v) => (
              <span key={v.name} className="h-6 px-2 rounded-md bg-[#F1ECF9] text-[#430693] text-[11px] font-semibold flex items-center" style={{ fontFamily: 'var(--font-mono)' }}>{`{${v.name}}`}</span>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button onClick={onTest} data-agent="hw-builder-test" className="h-10 rounded-full border border-[#E1DDD6] hover:bg-[#F7F5F1] text-[13px] font-semibold flex items-center justify-center gap-1.5">
            <Play size={14} weight="fill" /> Test run on Fabrikam invoice
          </button>
          <button onClick={onPublish} disabled={published} data-agent="hw-builder-publish" className="h-10 rounded-full bg-[#0F0E12] hover:bg-[#2A2930] text-white text-[13px] font-semibold flex items-center justify-center gap-1.5 disabled:opacity-60">
            <RocketLaunch size={15} weight="fill" /> {published ? 'Published — watching the AP inbox' : 'Publish agent'}
          </button>
          <button onClick={onReset} className="h-8 text-[12px] text-[#7A7A87] hover:text-[#0F0E12]">Start over</button>
        </div>
      </div>
    </div>
  )
}
