/**
 * H-Worker › Process discovery. H-Worker observes back-office operators doing a process, merges
 * what it saw into a work graph (steps, variants, exceptions), places human checkpoints, decides how
 * each step should run, and deploys an agent on it.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  Record as RecordIcon,
  Play,
  ShieldCheck,
  UserCircle,
  Diamond,
  Lightning,
  CheckCircle,
  CircleNotch,
  ArrowCounterClockwise,
  Cloud,
  Sparkle,
  Eye,
  Plus,
  Lock,
  Graph as GraphIcon,
} from '@phosphor-icons/react'
import { useRec, type CapturedEvent } from '@/agent/recorder'
import { ViaChip } from '@/agent/AgentWindow'
import type { PlanStep } from '@/agent/types'
import { startRun } from '@/agent/runtime'
import { focusCloudAgent, useCloud } from '@/agent/cloud'
import { getApp } from '@/os/registry'
import { Mono } from '../shared'
import { OPERATOR, OPERATOR_STEPS, beginRecording, playDiscovery, resetDiscovery } from './driver'

/* ───────────────────────── team + process data ───────────────────────── */

const TEAM = [
  { name: 'Maria Santos', site: 'Manila delivery center', cases: 52, color: '#B4009E' },
  { name: 'Jakub Nowak', site: 'Kraków delivery center', cases: 44, color: '#0078D4' },
  { name: 'Ana Reyes', site: 'Manila delivery center', cases: 38, color: '#C239B3' },
  { name: 'Piotr Zieliński', site: 'Kraków delivery center', cases: 31, color: '#038387' },
  { name: 'Grace Lim', site: 'Manila delivery center', cases: 27, color: '#CA5010' },
  { name: 'Tomasz Wójcik', site: 'Kraków delivery center', cases: 21, color: '#498205' },
]
const OBSERVED = TEAM.reduce((n, t) => n + t.cases, 0)

const PROCESSES = [
  { name: 'Accounts payable — supplier invoice processing', cases: OBSERVED, ops: 6, state: 'Ready to map', apps: ['outlook', 'acrobat', 'sap'] },
  { name: 'Vendor master data changes', cases: 58, ops: 4, state: 'Collecting', apps: ['outlook', 'sap', 'servicenow'] },
  { name: 'Customer refunds & credit notes', cases: 91, ops: 5, state: 'Collecting', apps: ['zendesk', 'netsuite', 'outlook'] },
  { name: 'Month-end accruals', cases: 12, ops: 2, state: 'Collecting', apps: ['excel', 'netsuite'] },
]

type Kind = 'start' | 'task' | 'decision' | 'hitl'
type Lane = 'outlook' | 'docs' | 'sap' | 'people'
interface PNode {
  id: string
  label: string
  lane: Lane
  col: number
  /** second row inside the People lane, so parallel checkpoints can stack */
  row?: 1
  kind: Kind
  app?: string
  step?: PlanStep
  share: number
  human: string
  agent: string
  notes: string[]
  added?: string
  hitl?: { who: string; rule: string; sla: string }
}

/* Layout: a header strip naming each stage, then one swimlane per system. Columns spread out to fill
   the available width (SP), and the whole canvas only scales down when even the minimum spacing won't fit. */
const HEAD = 34
const LANES: { id: Lane; label: string; sub: string; y: number; h: number }[] = [
  { id: 'outlook', label: 'Outlook', sub: 'AP inbox', y: HEAD, h: 104 },
  { id: 'docs', label: 'Documents', sub: 'Supplier PDFs', y: HEAD + 104, h: 96 },
  { id: 'sap', label: 'SAP S/4HANA', sub: 'Company code 1010', y: HEAD + 200, h: 108 },
  { id: 'people', label: 'People', sub: 'Human in the loop', y: HEAD + 308, h: 196 },
]
const H = HEAD + 504
const NW = 132
const NH = 70
const LANE_COL = 132
const PAD = 26
const COLS = 8
const SP_MIN = 150
const SP_MAX = 230
const STAGES_BY_COL = ['Receive', 'Extract', 'Validate', 'Retrieve', 'Match', 'Exceptions', 'Post', 'Notify']
const canvasW = (sp: number) => LANE_COL + PAD * 2 + NW + (COLS - 1) * sp
const colX = (c: number, sp: number) => LANE_COL + PAD + NW / 2 + c * sp
const rowY = (n: { lane: Lane; row?: 1 }) => {
  const l = LANES.find((z) => z.id === n.lane)!
  if (n.lane !== 'people') return l.y + l.h / 2
  return l.y + 18 + NH / 2 + (n.row ? NH + 20 : 0)
}

const NODES: PNode[] = [
  { id: 'intake', label: 'Invoice email arrives', lane: 'outlook', col: 0, kind: 'start', app: 'outlook', share: 100, human: '0m 40s', agent: 'instant', step: { text: '', via: 'api', why: 'A Microsoft Graph subscription fires on every new mail in the AP inbox — nobody has to watch it.' }, notes: ['Operators triage the shared AP inbox 3× a day — invoices wait 4.2h on average before anyone opens them.'] },
  { id: 'extract', label: 'Read invoice PDF', lane: 'docs', col: 1, kind: 'task', app: 'acrobat', share: 100, human: '2m 15s', agent: '6s', step: { text: '', via: 'cua', model: 'large', why: 'Supplier PDFs have no fixed layout — the large model reads total, PO number, lines and bank details.' }, notes: ['5 of 7 operators re-type the PO number by hand; 3.1% of cases had a keying error caught later.', 'Bank details on the PDF are only compared to the vendor master by 2 of 7 operators.'] },
  { id: 'fraud', label: 'Verify new bank details', lane: 'people', col: 1, kind: 'hitl', share: 2, human: '1 day', agent: '—', notes: ['4 cases in the sample had new bank details. One was a known phishing pattern.'], hitl: { who: 'AP team lead', rule: 'IBAN on invoice ≠ vendor master', sla: 'Payment blocked until verified by phone' } },
  { id: 'dupe', label: 'Duplicate check', lane: 'sap', col: 2, kind: 'task', app: 'sap', share: 100, human: '1m 05s', agent: '0.2s', added: 'Added control', step: { text: '', via: 'code', why: 'Same supplier + reference + amount in the last 18 months — a lookup and a comparison, no model needed.' }, notes: ['Only 2 of 7 operators searched for duplicates. 3 duplicates were paid in the last quarter ($41k recovered late).'] },
  { id: 'po', label: 'Fetch PO + goods receipt', lane: 'sap', col: 3, kind: 'task', app: 'sap', share: 100, human: '1m 50s', agent: '0.4s', step: { text: '', via: 'api', why: 'SAP OData is read-enabled for this tenant — exact PO and receipt data in milliseconds.' }, notes: ['Operators open Manage Purchase Orders and read the lines on screen (you did too).'] },
  { id: 'match', label: '3-way match', lane: 'sap', col: 4, kind: 'decision', app: 'sap', share: 100, human: '1m 20s', agent: '0.1s', step: { text: '', via: 'code', why: 'Comparing amounts and quantities is arithmetic — tolerance ±0.5%, then route by rule.' }, notes: ['Done “by eye” today. Tolerance applied ranged from 0% to 5% depending on the operator.'] },
  { id: 'buyer', label: 'Ask buyer for goods receipt', lane: 'outlook', col: 4, kind: 'task', app: 'outlook', share: 5, human: '3m 30s', agent: '20s', step: { text: '', via: 'cua', model: 'small', why: 'Email to the requester from the PO, inside the supplier thread.' }, notes: ['Missing receipts sit for 6.5 days on average — reminders are manual today.'] },
  { id: 'variance', label: 'Approve price variance', lane: 'people', col: 5, kind: 'hitl', share: 12, human: '1.8 days', agent: '—', notes: ['Today approvals go by email and wait 1.8 days on average.'], hitl: { who: 'AP specialist', rule: 'Invoice ≠ PO by more than 0.5%', sla: 'In-app approval · 4h SLA' } },
  { id: 'controller', label: 'Controller sign-off', lane: 'people', col: 5, row: 1, kind: 'hitl', share: 7, human: '0.9 days', agent: '—', notes: ['Delegation of authority: invoices above $25,000 need the controller.'], hitl: { who: 'Financial controller', rule: 'Gross amount > $25,000', sla: 'In-app approval · same day' } },
  { id: 'post', label: 'Post invoice in SAP', lane: 'sap', col: 6, kind: 'task', app: 'sap', share: 98, human: '3m 10s', agent: '35s', step: { text: '', via: 'cua', model: 'small', why: 'Invoice posting isn’t exposed by API here — the agent uses the Fiori app, same screens as a person.' }, notes: ['4 operators skip Simulate before Post; 2 always simulate. The agent always simulates.'] },
  { id: 'confirm', label: 'Confirm payment date', lane: 'outlook', col: 7, kind: 'task', app: 'outlook', share: 98, human: '1m 45s', agent: '15s', step: { text: '', via: 'cua', model: 'small', why: 'Reply in the supplier’s original thread with the posted document and due date.' }, notes: ['Only 61% of suppliers get a confirmation today — the main reason for “where is my payment” emails.'] },
]

/**
 * route — how the connector is drawn (orthogonal, rounded corners):
 *   h  straight across          v  straight up/down (dx offsets parallel pairs)
 *   hv out the right side, then up/down into the target   vh  out the bottom, then right into the target
 * share — % of cases taking this edge; drives line weight so the main path reads at a glance.
 */
type Route = 'h' | 'v' | 'hv' | 'vh'
interface PEdge { from: string; to: string; share: number; route: Route; label?: string; dashed?: boolean; dx?: number; side?: 'l' | 'r' }
const EDGES: PEdge[] = [
  { from: 'intake', to: 'extract', share: 100, route: 'hv', label: `${OBSERVED + 1} cases` },
  { from: 'extract', to: 'dupe', share: 98, route: 'hv', label: '98%' },
  { from: 'extract', to: 'fraud', share: 2, route: 'v', label: '2% · new IBAN' },
  { from: 'fraud', to: 'dupe', share: 2, route: 'hv', label: 'verified', dashed: true },
  { from: 'dupe', to: 'po', share: 100, route: 'h' },
  { from: 'po', to: 'match', share: 100, route: 'h' },
  { from: 'match', to: 'post', share: 76, route: 'h', label: '76% · clean' },
  { from: 'match', to: 'buyer', share: 5, route: 'v', dx: -18, side: 'l', label: '5% · no GR' },
  { from: 'buyer', to: 'match', share: 5, route: 'v', dx: 18, side: 'r', label: 'GR posted → re-match', dashed: true },
  { from: 'match', to: 'variance', share: 12, route: 'vh', label: '12% · price' },
  { from: 'match', to: 'controller', share: 7, route: 'vh', label: '7% · > $25k' },
  { from: 'variance', to: 'post', share: 12, route: 'hv', label: 'approved' },
  { from: 'controller', to: 'post', share: 7, route: 'hv' },
  { from: 'post', to: 'confirm', share: 98, route: 'hv' },
]

const VARIANTS = [
  { id: 'v1', name: 'Clean match', share: 76, nodes: ['intake', 'extract', 'dupe', 'po', 'match', 'post', 'confirm'] },
  { id: 'v2', name: 'Price variance', share: 12, nodes: ['intake', 'extract', 'dupe', 'po', 'match', 'variance', 'post', 'confirm'] },
  { id: 'v3', name: 'Over $25k', share: 7, nodes: ['intake', 'extract', 'dupe', 'po', 'match', 'controller', 'post', 'confirm'] },
  { id: 'v4', name: 'Missing goods receipt', share: 5, nodes: ['intake', 'extract', 'dupe', 'po', 'match', 'buyer', 'post', 'confirm'] },
  { id: 'v5', name: 'Bank details changed', share: 2, nodes: ['intake', 'extract', 'fraud', 'dupe', 'po', 'match', 'post', 'confirm'] },
]

const nodeById = (id: string) => NODES.find((n) => n.id === id)!
const pos = (n: PNode, sp: number) => ({ x: colX(n.col, sp), y: rowY(n) })

/* ───────────────────────── view ───────────────────────── */

export function DiscoveryView() {
  const phase = useRec((s) => s.phase)
  return (
    <div className="px-8 py-7" data-agent="hw-discovery">
      {phase === 'graph' ? <GraphPhase /> : phase === 'analyzing' ? <Analyzing /> : <Idle busy={phase === 'arming' || phase === 'recording'} />}
    </div>
  )
}

function Header({ right }: { right?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-6">
      <div>
        <Mono>Process discovery</Mono>
        <h1 className="mt-1 text-[26px] font-bold tracking-tight">See how the work really gets done</h1>
        <p className="mt-1 text-[13.5px] text-[#3A3A44] max-w-[700px]">H-Worker observes your operators across every system, merges their cases into one work graph, and turns it into an agent — keeping people in the loop where judgment or risk calls for it.</p>
      </div>
      {right}
    </div>
  )
}

function Avatar({ name, color, size = 30 }: { name: string; color: string; size?: number }) {
  const ini = name.split(' ').map((p) => p[0]).slice(0, 2).join('')
  return (
    <span className="rounded-full flex items-center justify-center text-white font-bold shrink-0" style={{ width: size, height: size, background: color, fontSize: size * 0.36 }}>
      {ini}
    </span>
  )
}

function Idle({ busy }: { busy: boolean }) {
  return (
    <>
      <Header />
      <div className="mt-6 grid grid-cols-[1.25fr_1fr] gap-5">
        {/* record card */}
        <div className="rounded-2xl bg-[#0F0E12] text-white p-6 relative overflow-hidden">
          <div className="absolute inset-0" style={{ background: 'radial-gradient(520px 260px at 100% 0%, rgba(113,20,235,0.55), transparent 70%)' }} />
          <div className="relative">
            <div className="flex items-center gap-2 text-[11px] font-bold tracking-[0.14em] text-[#C2A0EE]" style={{ fontFamily: 'var(--font-mono)' }}>
              <Eye size={14} weight="bold" /> OBSERVE A CASE
            </div>
            <div className="mt-2 text-[22px] font-bold leading-tight tracking-tight">Process one supplier invoice the way you always do.</div>
            <div className="mt-2 text-[13px] text-white/65 leading-relaxed max-w-[480px]">
              H-Worker steps out of the way and captures every click, field and system switch — Outlook, the PDF, SAP. Your case is merged with {OBSERVED} cases from your Manila and Kraków teams.
            </div>
            <div className="mt-5 flex items-center gap-2.5">
              <button
                data-agent="hw-disc-play"
                onClick={playDiscovery}
                disabled={busy}
                className="h-11 pl-4 pr-5 rounded-full bg-white text-[#0F0E12] text-[13.5px] font-bold flex items-center gap-2 hover:bg-white/90 disabled:opacity-50"
              >
                <Play size={16} weight="fill" /> Play demo
              </button>
              <button
                data-agent="hw-disc-record"
                onClick={beginRecording}
                disabled={busy && useRec.getState().phase === 'recording'}
                className="h-11 pl-3.5 pr-5 rounded-full border border-white/25 text-white text-[13.5px] font-semibold flex items-center gap-2 hover:bg-white/10"
              >
                <RecordIcon size={18} weight="fill" className="text-[#FF5A52]" /> Record
              </button>
              {busy && <span className="text-[12px] text-white/60 flex items-center gap-1.5"><CircleNotch size={14} className="animate-spin" /> Starting…</span>}
            </div>
            <div className="mt-5 flex items-center gap-1.5 text-[11.5px] text-white/45">
              <Lock size={12} /> Only allow-listed business apps are captured. Passwords, personal apps and chat are masked.
            </div>
          </div>
        </div>

        {/* team */}
        <div className="rounded-2xl border border-[#EAE5DD] p-5">
          <div className="flex items-center justify-between">
            <Mono>Observed team · AP shared services</Mono>
            <span className="text-[11.5px] text-[#7A7A87]">last 14 days</span>
          </div>
          <div className="mt-3 space-y-2">
            {TEAM.map((t, i) => (
              <div key={t.name} className="flex items-center gap-3">
                <Avatar name={t.name} color={t.color} />
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] font-semibold truncate">{t.name}</div>
                  <div className="text-[11px] text-[#7A7A87] truncate">{t.site}</div>
                </div>
                <span className="text-[11.5px] tabular-nums text-[#3A3A44]"><b>{t.cases}</b> cases</span>
                <span className={`w-2 h-2 rounded-full ${i < 4 ? 'bg-[#0E9F6E] rec-dot' : 'bg-[#D8D2C8]'}`} title={i < 4 ? 'Observing now' : 'Offline'} style={i < 4 ? { boxShadow: 'none' } : undefined} />
              </div>
            ))}
            <div className="flex items-center gap-3 pt-2 border-t border-dashed border-[#EAE5DD]">
              <Avatar name={OPERATOR.name} color="#0B6A6A" />
              <div className="flex-1 min-w-0">
                <div className="text-[12.5px] font-semibold">{OPERATOR.name} <span className="text-[#7A7A87] font-normal">(you)</span></div>
                <div className="text-[11px] text-[#7A7A87]">Not recorded yet</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-[#EAE5DD]">
        <div className="px-5 pt-4 pb-2"><Mono>Processes being discovered</Mono></div>
        {PROCESSES.map((p, i) => (
          <div key={p.name} className={`flex items-center gap-4 px-5 py-3 ${i ? 'border-t border-[#F1EEE9]' : ''}`}>
            <GraphIcon size={18} className={i === 0 ? 'text-[#430693]' : 'text-[#B5B0A8]'} />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold">{p.name}</div>
              <div className="text-[11.5px] text-[#7A7A87]">{p.cases} cases · {p.ops} operators</div>
            </div>
            <div className="flex -space-x-1.5">
              {p.apps.map((a) => <img key={a} src={getApp(a)?.icon} className="w-6 h-6 rounded-md bg-white ring-2 ring-white" alt="" />)}
            </div>
            <span className={`w-[110px] text-center h-6 leading-6 rounded-full text-[11px] font-semibold ${i === 0 ? 'bg-[#F1ECF9] text-[#430693]' : 'bg-[#F7F5F1] text-[#7A7A87]'}`}>{p.state}</span>
          </div>
        ))}
      </div>
    </>
  )
}

/* ───────────────────────── analyzing ───────────────────────── */

const STAGES = (events: number) => [
  `Segmenting ${events} captured events into ${OPERATOR_STEPS.length} steps`,
  `Aligning with ${OBSERVED} cases from 6 operators in Manila and Kraków`,
  'Mining variants and exceptions — 5 variants, 4 exception paths',
  'Placing human checkpoints where risk or judgment is needed',
  'Choosing how each step runs — API, code or computer use',
]

function Analyzing() {
  const events = useRec((s) => s.events)
  const set = useRec((s) => s.set)
  const [stage, setStage] = useState(0)
  const [shown, setShown] = useState(0)
  useEffect(() => {
    const ts: any[] = []
    const n = Math.max(events.length, 1)
    const per = Math.min(110, 1600 / n)
    for (let i = 1; i <= n; i++) ts.push(setTimeout(() => setShown(i), i * per))
    const stages = STAGES(events.length).length
    for (let i = 1; i <= stages; i++) ts.push(setTimeout(() => setStage(i), 600 + i * 1150))
    ts.push(setTimeout(() => set({ phase: 'graph' }), 600 + stages * 1150 + 700))
    return () => ts.forEach(clearTimeout)
  }, [])
  const dur = (() => {
    const s = useRec.getState()
    const sec = Math.round(((s.endedAt ?? 0) - (s.startedAt ?? 0)) / 1000)
    return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
  })()
  const byStep = OPERATOR_STEPS.map((s, i) => ({ ...s, events: events.slice(0, shown).filter((e) => e.step === i) }))
  return (
    <>
      <Header />
      <div className="mt-6 grid grid-cols-[1fr_1fr] gap-5">
        <div className="rounded-2xl border border-[#EAE5DD] p-5 max-h-[520px] overflow-hidden relative">
          <div className="flex items-center justify-between">
            <Mono>Captured from your recording</Mono>
            <span className="text-[11.5px] text-[#7A7A87] tabular-nums">{events.length} events · {dur}</span>
          </div>
          <div className="mt-3 space-y-3">
            {byStep.filter((s) => s.events.length).map((s, i) => (
              <div key={s.node} className="pg-node">
                <div className="flex items-center gap-2 text-[12px] font-bold">
                  <span className="w-5 h-5 rounded-full bg-[#F1ECF9] text-[#430693] text-[10.5px] flex items-center justify-center">{i + 1}</span>
                  {s.text}
                </div>
                <div className="mt-1 ml-7 space-y-0.5">
                  {s.events.map((e, k) => <EventRow key={k} e={e} />)}
                </div>
              </div>
            ))}
          </div>
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent" />
        </div>
        <div className="rounded-2xl bg-[#0F0E12] text-white p-6 relative overflow-hidden">
          <div className="absolute inset-0" style={{ background: 'radial-gradient(420px 240px at 100% 0%, rgba(113,20,235,0.5), transparent 70%)' }} />
          <div className="relative">
            <div className="flex items-center gap-2 text-[11px] font-bold tracking-[0.14em] text-[#C2A0EE]" style={{ fontFamily: 'var(--font-mono)' }}>
              <Sparkle size={14} weight="fill" /> BUILDING THE WORK GRAPH
            </div>
            <div className="mt-2 text-[20px] font-bold tracking-tight">Accounts payable — supplier invoice processing</div>
            <div className="mt-5 space-y-3.5">
              {STAGES(events.length).map((t, i) => (
                <div key={i} className={`flex items-start gap-2.5 text-[13px] transition-opacity ${i <= stage ? 'opacity-100' : 'opacity-30'}`}>
                  {i < stage ? <CheckCircle size={18} weight="fill" className="text-[#7CE0B0] shrink-0" /> : i === stage ? <CircleNotch size={18} className="animate-spin text-[#C2A0EE] shrink-0" /> : <span className="w-[18px] h-[18px] rounded-full border border-white/30 shrink-0" />}
                  <span>{t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function EventRow({ e }: { e: CapturedEvent }) {
  const app = e.appId ? getApp(e.appId) : undefined
  return (
    <div className="flex items-center gap-2 text-[11.5px] text-[#3A3A44] pg-node">
      {app ? <img src={app.icon} className="w-3.5 h-3.5" alt="" /> : <span className="w-3.5 h-3.5" />}
      <span className={`truncate ${e.kind === 'read' ? 'italic text-[#7A7A87]' : ''}`}>{e.kind === 'read' ? `Reads ${e.text}` : e.text}</span>
    </div>
  )
}

/* ───────────────────────── graph ───────────────────────── */

function GraphPhase() {
  const events = useRec((s) => s.events)
  const [sel, setSel] = useState<string>('match')
  const [variant, setVariant] = useState<string | undefined>()
  const [deploying, setDeploying] = useState(false)
  const v = VARIANTS.find((x) => x.id === variant)
  const node = nodeById(sel)
  const recByNode = useMemo(() => {
    const m: Record<string, CapturedEvent[]> = {}
    events.forEach((e) => {
      const id = OPERATOR_STEPS[e.step]?.node
      if (id) (m[id] ??= []).push(e)
    })
    return m
  }, [events])

  const deploy = () => {
    setDeploying(true)
    const id = startRun('sap-post-supplier-invoice', {}, { cloud: true })
    useCloud.getState().add([id])
    setTimeout(() => focusCloudAgent(id), 350)
  }

  return (
    <>
      <Header
        right={
          <button onClick={resetDiscovery} className="h-9 px-3.5 rounded-full border border-[#E1DDD6] text-[12px] font-semibold flex items-center gap-1.5 hover:bg-[#F7F5F1] shrink-0">
            <ArrowCounterClockwise size={14} /> New recording
          </button>
        }
      />

      <div className="mt-5 grid grid-cols-6 gap-3">
        {[
          ['Cases observed', `${OBSERVED + 1}`, '6 operators + you'],
          ['Avg handle time', '11m 35s', 'per invoice, by a person'],
          ['Variants', '5', '76% follow the clean path'],
          ['Steps automated', '8 of 11', 'API · code · computer use'],
          ['Human checkpoints', '3', 'variance · > $25k · new IBAN'],
          ['Projected handle time', '1m 10s', '−90% · 4,100 invoices / mo'],
        ].map(([k, val, sub], i) => (
          <div key={k} className={`rounded-xl border p-3 ${i === 5 ? 'border-[#C2A0EE] bg-[#FBF9FE]' : 'border-[#EAE5DD]'}`}>
            <div className="text-[11px] text-[#7A7A87]">{k}</div>
            <div className={`text-[20px] font-bold tabular-nums ${i === 5 ? 'text-[#430693]' : ''}`}>{val}</div>
            <div className="text-[10.5px] text-[#7A7A87] truncate">{sub}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-[#EAE5DD] overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#F1EEE9] flex-wrap">
          <span className="text-[12.5px] font-bold mr-1">Work graph</span>
          <button onClick={() => setVariant(undefined)} className={`h-7 px-3 rounded-full text-[11.5px] font-semibold border ${!variant ? 'border-[#430693] bg-[#FBF9FE] text-[#430693]' : 'border-[#EAE5DD] text-[#3A3A44] hover:bg-[#F7F5F1]'}`}>All paths</button>
          {VARIANTS.map((x) => (
            <button key={x.id} data-agent={`hw-disc-variant-${x.id}`} onClick={() => setVariant(variant === x.id ? undefined : x.id)} className={`h-7 px-3 rounded-full text-[11.5px] font-semibold border ${variant === x.id ? 'border-[#430693] bg-[#FBF9FE] text-[#430693]' : 'border-[#EAE5DD] text-[#3A3A44] hover:bg-[#F7F5F1]'}`}>
              {x.name} <span className="text-[#7A7A87] font-normal">{x.share}%</span>
            </button>
          ))}
          <span className="flex-1" />
          <Legend />
        </div>
        <Graph sel={sel} onSel={setSel} highlight={v?.nodes} recorded={recByNode} />
      </div>

      <div className="mt-4 grid grid-cols-[1.4fr_1fr] gap-4">
        <NodeDetail node={node} rec={recByNode[node.id] ?? []} />
        <div className="space-y-4">
          <Findings />
          <div className="rounded-2xl bg-[#0F0E12] text-white p-5 relative overflow-hidden">
            <div className="absolute inset-0" style={{ background: 'radial-gradient(360px 200px at 100% 0%, rgba(113,20,235,0.55), transparent 70%)' }} />
            <div className="relative">
              <div className="text-[15px] font-bold">Put an agent on this process</div>
              <div className="mt-1 text-[12px] text-white/65 leading-snug">8 steps run on their own. People approve the 3 checkpoints from H-Worker — every write is logged and reversible.</div>
              <div className="mt-3 space-y-1.5">
                {NODES.filter((n) => n.kind === 'hitl').map((n) => (
                  <div key={n.id} className="flex items-center gap-2 text-[11.5px]">
                    <ShieldCheck size={14} weight="fill" className="text-[#F2C94C] shrink-0" />
                    <span className="font-semibold">{n.label}</span>
                    <span className="text-white/50 truncate">· {n.hitl!.who}</span>
                  </div>
                ))}
              </div>
              <button
                data-agent="hw-disc-deploy"
                onClick={deploy}
                disabled={deploying}
                className="mt-4 w-full h-10 rounded-full bg-white text-[#0F0E12] text-[13px] font-bold flex items-center justify-center gap-2 hover:bg-white/90 disabled:opacity-60"
              >
                <Cloud size={16} weight="fill" /> {deploying ? 'Deploying…' : 'Deploy agent on the AP inbox'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function Legend() {
  return (
    <div className="flex items-center gap-3 text-[10.5px] text-[#7A7A87]">
      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-[3px] border border-[#D8D2C8] bg-white" /> Automated step</span>
      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-[3px] border border-[#E9C46A] bg-[#FFF8E6]" /> Human checkpoint</span>
      <span className="flex items-center gap-1">
        <svg width="20" height="8" aria-hidden><line x1="1" y1="4" x2="19" y2="4" stroke={EDGE_MAIN} strokeWidth="3.5" strokeLinecap="round" /></svg>
        Thicker = more cases
      </span>
      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#E53935]" /> In your recording</span>
    </div>
  )
}

const EDGE_MAIN = '#8E7FB4'
const EDGE_MINOR = '#BDB2D3'
const EDGE_HUMAN = '#D9AE3F'
const EDGE_LIT = '#CDBEF0'
const EDGE_DIM = '#ECE8E1'
const MARKERS = { main: EDGE_MAIN, minor: EDGE_MINOR, human: EDGE_HUMAN, lit: '#7114EB', dim: '#E3DED6' }

/** polyline → SVG path with rounded corners */
function rounded(pts: [number, number][], r = 10) {
  let d = `M ${pts[0][0]} ${pts[0][1]}`
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i - 1]
    const [cx, cy] = pts[i]
    const [nx, ny] = pts[i + 1]
    const l1 = Math.hypot(cx - px, cy - py)
    const l2 = Math.hypot(nx - cx, ny - cy)
    const k = Math.min(r, l1 / 2, l2 / 2)
    if (k < 0.5) {
      d += ` L ${cx} ${cy}`
      continue
    }
    d += ` L ${cx - ((cx - px) / l1) * k} ${cy - ((cy - py) / l1) * k} Q ${cx} ${cy} ${cx + ((nx - cx) / l2) * k} ${cy + ((ny - cy) / l2) * k}`
  }
  const [lx, ly] = pts[pts.length - 1]
  return `${d} L ${lx} ${ly}`
}

function edgeGeom(e: PEdge, sp: number) {
  const p = pos(nodeById(e.from), sp)
  const q = pos(nodeById(e.to), sp)
  const down = q.y > p.y
  const exitY = p.y + (down ? NH / 2 : -NH / 2)
  const enterY = q.y + (down ? -NH / 2 : NH / 2)
  let pts: [number, number][]
  let lx: number
  let ly: number
  switch (e.route) {
    case 'h':
      pts = [[p.x + NW / 2, p.y], [q.x - NW / 2, q.y]]
      lx = (p.x + q.x) / 2
      ly = p.y
      break
    case 'v': {
      const dx = e.dx ?? 0
      pts = [[p.x + dx, exitY], [q.x + dx, enterY]]
      lx = p.x + dx + (e.side === 'l' ? -8 : e.side === 'r' ? 8 : 0)
      ly = (exitY + enterY) / 2
      break
    }
    case 'hv':
      pts = [[p.x + NW / 2, p.y], [q.x, p.y], [q.x, enterY]]
      lx = (p.x + NW / 2 + q.x) / 2
      ly = p.y
      break
    case 'vh':
      pts = [[p.x, exitY], [p.x, q.y], [q.x - NW / 2, q.y]]
      lx = (p.x + q.x - NW / 2) / 2
      ly = q.y
      break
  }
  return { d: rounded(pts), lx, ly }
}

function Graph({ sel, onSel, highlight, recorded }: { sel: string; onSel: (id: string) => void; highlight?: string[]; recorded: Record<string, CapturedEvent[]> }) {
  const wrap = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(1280)
  useLayoutEffect(() => {
    const el = wrap.current
    if (!el) return
    setWidth(el.clientWidth)
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  // spread columns across the available width; only scale down below the minimum spacing
  const sp = Math.max(SP_MIN, Math.min(SP_MAX, (width - LANE_COL - PAD * 2 - NW) / (COLS - 1)))
  const scale = Math.min(1, width / canvasW(sp))
  const innerW = width / scale

  const on = (id: string) => !highlight || highlight.includes(id)
  const edgeOn = (e: PEdge) => !highlight || (highlight.includes(e.from) && highlight.includes(e.to))
  const order = (n: PNode) => n.col * 90 + (n.lane === 'people' ? 40 : 0)
  const tone = (e: PEdge): keyof typeof MARKERS => {
    if (highlight) return edgeOn(e) ? 'lit' : 'dim'
    if (nodeById(e.to).kind === 'hitl' || nodeById(e.from).kind === 'hitl') return 'human'
    return e.share >= 50 ? 'main' : 'minor'
  }
  const stroke = { main: EDGE_MAIN, minor: EDGE_MINOR, human: EDGE_HUMAN, lit: EDGE_LIT, dim: EDGE_DIM }

  return (
    <div ref={wrap} className="relative bg-[#FCFBF9] overflow-hidden" style={{ height: H * scale }}>
      <div className="absolute left-0 top-0" style={{ width: innerW, height: H, transform: `scale(${scale})`, transformOrigin: '0 0' }}>
        {/* stage header */}
        <div className="absolute left-0 right-0 top-0 border-b border-[#EFEBE4] bg-white" style={{ height: HEAD }}>
          {STAGES_BY_COL.map((s, c) => (
            <div
              key={s}
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1.5 whitespace-nowrap text-[10px] tracking-[0.12em] uppercase text-[#7A7A87]"
              style={{ left: colX(c, sp), fontFamily: 'var(--font-mono)' }}
            >
              <span className="text-[#B9AFD0] font-bold">{String(c + 1).padStart(2, '0')}</span>
              {s}
            </div>
          ))}
        </div>

        {/* swimlanes */}
        {LANES.map((l, i) => (
          <div key={l.id} className={`absolute left-0 right-0 ${i ? 'border-t border-[#EFEBE4]' : ''} ${l.id === 'people' ? 'bg-[#FFFCF3]' : ''}`} style={{ top: l.y, height: l.h }}>
            <div className="absolute left-4 top-1/2 -translate-y-1/2" style={{ width: LANE_COL - 24 }}>
              <div className="flex items-center gap-1.5 text-[12px] font-bold text-[#3A3A44]">
                {l.id === 'people' ? <UserCircle size={15} weight="fill" className="text-[#C08A00]" /> : <img src={getApp(l.id === 'docs' ? 'acrobat' : l.id)?.icon} className="w-4 h-4" alt="" />}
                {l.label}
              </div>
              <div className="text-[10.5px] text-[#9A958C] mt-0.5 leading-tight">{l.sub}</div>
            </div>
          </div>
        ))}
        <div className="absolute bottom-0 w-px bg-[#EFEBE4]" style={{ left: LANE_COL, top: HEAD }} />

        {/* edges */}
        <svg className="absolute inset-0 overflow-visible" width={innerW} height={H}>
          <defs>
            {Object.entries(MARKERS).map(([k, c]) => (
              <marker key={k} id={`pg-arrow-${k}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" markerUnits="userSpaceOnUse" orient="auto-start-reverse">
                <path d="M 0 1 L 10 5 L 0 9 z" fill={c} />
              </marker>
            ))}
          </defs>
          {EDGES.map((e, i) => {
            const { d } = edgeGeom(e, sp)
            const t = tone(e)
            const w = 1.4 + (2.6 * e.share) / 100
            return (
              <g key={i}>
                <path
                  d={d}
                  fill="none"
                  stroke={stroke[t]}
                  strokeWidth={t === 'dim' ? 1.4 : t === 'lit' ? Math.max(w, 2.6) : w}
                  strokeDasharray={e.dashed ? '5 5' : undefined}
                  pathLength={e.dashed ? undefined : 400}
                  className={e.dashed ? '' : 'pg-edge'}
                  style={{ animationDelay: `${300 + order(nodeById(e.from)) * 6}ms` }}
                  markerEnd={`url(#pg-arrow-${t})`}
                />
                {t === 'lit' && !e.dashed && <path d={d} fill="none" stroke="#7114EB" strokeWidth={2} className="pg-flow" />}
              </g>
            )
          })}
        </svg>

        {/* edge labels */}
        {EDGES.filter((e) => e.label).map((e, i) => {
          const { lx, ly } = edgeGeom(e, sp)
          const t = tone(e)
          const lit = edgeOn(e)
          const anchor = e.side === 'l' ? '-translate-x-full' : e.side === 'r' ? '' : '-translate-x-1/2'
          return (
            <div
              key={i}
              className={`absolute ${anchor} -translate-y-1/2 h-[18px] px-1.5 flex items-center rounded-full border text-[10px] font-semibold whitespace-nowrap pg-node transition-opacity ${
                !lit ? 'bg-white border-[#F1EEE9] text-[#C9C3BA] opacity-60' : t === 'human' ? 'bg-[#FFFCF3] border-[#F0DDA8] text-[#7A5A00]' : 'bg-white border-[#E4DDF0] text-[#5A4B78]'
              }`}
              style={{ left: lx, top: ly, animationDelay: `${900 + i * 40}ms` }}
            >
              {e.label}
            </div>
          )
        })}

        {/* nodes */}
        {NODES.map((n) => (
          <GraphNode key={n.id} n={n} sp={sp} sel={sel === n.id} dim={!on(n.id)} rec={recorded[n.id]?.length ?? 0} onClick={() => onSel(n.id)} delay={150 + order(n) * 6} />
        ))}
      </div>
    </div>
  )
}

function GraphNode({ n, sp, sel, dim, rec, onClick, delay }: { n: PNode; sp: number; sel: boolean; dim: boolean; rec: number; onClick: () => void; delay: number }) {
  const { x, y } = pos(n, sp)
  const hitl = n.kind === 'hitl'
  const decision = n.kind === 'decision'
  const app = n.app ? getApp(n.app) : undefined
  return (
    <button
      data-agent={`hw-disc-node-${n.id}`}
      onClick={onClick}
      className={`absolute rounded-xl text-left px-2.5 py-2 flex flex-col pg-node transition-[opacity,box-shadow] ${dim ? 'opacity-30' : ''} ${
        hitl ? 'bg-[#FFF8E6] border border-[#E9C46A]' : decision ? 'bg-white border-[1.5px] border-dashed border-[#9A7FD1]' : 'bg-white border border-[#DCD6CC]'
      } ${sel ? 'ring-2 ring-[#7114EB] ring-offset-2 ring-offset-[#FCFBF9] shadow-lg' : 'shadow-[0_1px_2px_rgba(15,14,18,0.06)] hover:shadow-md'}`}
      style={{ left: x - NW / 2, top: y - NH / 2, width: NW, height: NH, animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-1">
        {hitl ? (
          <span className="h-[17px] px-1.5 rounded-full bg-[#F2C94C] text-[#5C4300] text-[9.5px] font-bold flex items-center gap-0.5"><UserCircle size={10} weight="fill" /> Human</span>
        ) : decision ? (
          <span className="h-[17px] px-1.5 rounded-full bg-[#F1ECF9] text-[#430693] text-[9.5px] font-bold flex items-center gap-0.5"><Diamond size={9} weight="fill" /> Decision</span>
        ) : n.step ? (
          <ViaChip step={n.step} compact />
        ) : null}
        {n.added && (
          <span className="h-[17px] px-1.5 rounded-full bg-[#E7F4E7] text-[#0E700E] text-[9.5px] font-bold flex items-center gap-0.5" title={n.added}>
            <Plus size={8} weight="bold" /> New
          </span>
        )}
        <span className="flex-1" />
        {rec > 0 && <span className="w-[7px] h-[7px] rounded-full bg-[#E53935] shrink-0" title={`${rec} events in your recording`} />}
        {app && !hitl && <img src={app.icon} className="w-3.5 h-3.5" alt="" />}
      </div>
      <div className="mt-1 text-[12px] font-bold leading-[1.2] line-clamp-2 text-[#0F0E12]">{n.label}</div>
    </button>
  )
}

function NodeDetail({ node, rec }: { node: PNode; rec: CapturedEvent[] }) {
  const app = node.app ? getApp(node.app) : undefined
  return (
    <div className="rounded-2xl border border-[#EAE5DD] p-5" key={node.id}>
      <div className="flex items-center gap-2">
        {app && <img src={app.icon} className="w-5 h-5" alt="" />}
        {node.kind === 'hitl' && <UserCircle size={20} weight="fill" className="text-[#C08A00]" />}
        <span className="text-[16px] font-bold">{node.label}</span>
        {node.step && <ViaChip step={node.step} />}
        <span className="flex-1" />
        <span className="text-[11.5px] text-[#7A7A87]">{node.share}% of cases</span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-[#F7F5F1] p-2.5">
          <div className="text-[10.5px] text-[#7A7A87]">Person today</div>
          <div className="text-[15px] font-bold tabular-nums">{node.human}</div>
        </div>
        <div className="rounded-lg bg-[#F7F5F1] p-2.5">
          <div className="text-[10.5px] text-[#7A7A87]">{node.kind === 'hitl' ? 'With H-Worker' : 'Agent'}</div>
          <div className="text-[15px] font-bold tabular-nums">{node.kind === 'hitl' ? node.hitl!.sla.split('·').pop()!.trim() : node.agent}</div>
        </div>
        <div className="rounded-lg bg-[#F7F5F1] p-2.5">
          <div className="text-[10.5px] text-[#7A7A87]">Seen in</div>
          <div className="text-[15px] font-bold tabular-nums">{Math.round(((OBSERVED + 1) * node.share) / 100)} cases</div>
        </div>
      </div>

      {node.hitl ? (
        <div className="mt-3 rounded-xl border border-[#E9C46A] bg-[#FFF8E6] p-3">
          <div className="flex items-center gap-1.5 text-[12px] font-bold"><ShieldCheck size={15} weight="fill" className="text-[#C08A00]" /> Human checkpoint</div>
          <div className="mt-1.5 grid grid-cols-[90px_1fr] gap-y-1 text-[12px]">
            <span className="text-[#7A7A87]">Trigger</span><span className="font-semibold">{node.hitl.rule}</span>
            <span className="text-[#7A7A87]">Approver</span><span className="font-semibold">{node.hitl.who}</span>
            <span className="text-[#7A7A87]">How</span><span className="font-semibold">{node.hitl.sla}</span>
          </div>
        </div>
      ) : node.step ? (
        <div className="mt-3 text-[12.5px] text-[#3A3A44] leading-snug"><b className="text-[#0F0E12]">How the agent runs it.</b> {node.step.why}</div>
      ) : null}

      <div className="mt-3">
        <Mono>What H-Worker observed</Mono>
        <ul className="mt-1.5 space-y-1">
          {node.notes.map((t, i) => (
            <li key={i} className="flex gap-2 text-[12px] text-[#3A3A44] leading-snug"><Eye size={13} className="mt-0.5 shrink-0 text-[#7A7A87]" /> {t}</li>
          ))}
        </ul>
      </div>

      {rec.length > 0 && (
        <div className="mt-3">
          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#E53935]" /><Mono>In your recording · {rec.length} events</Mono></div>
          <div className="mt-1.5 rounded-lg border border-[#F1EEE9] p-2 space-y-0.5 max-h-[150px] overflow-auto">
            {rec.map((e, i) => <EventRow key={i} e={e} />)}
          </div>
        </div>
      )}
    </div>
  )
}

function Findings() {
  const items = [
    { icon: Plus, color: '#0E700E', text: 'Duplicate check added — only 2 of 7 operators did one, and 3 duplicates were paid last quarter.' },
    { icon: Lightning, color: '#430693', text: 'PO and receipt lookups move to the SAP API — 1m 50s of screen work becomes 0.4s.' },
    { icon: ShieldCheck, color: '#C08A00', text: 'Variance approvals leave email: in-app with a 4h SLA instead of 1.8 days.' },
  ]
  return (
    <div className="rounded-2xl border border-[#EAE5DD] p-5">
      <Mono>What H-Worker changed vs. today</Mono>
      <div className="mt-2.5 space-y-2.5">
        {items.map((it, i) => (
          <div key={i} className="flex gap-2.5 text-[12px] text-[#3A3A44] leading-snug">
            <span className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${it.color}14` }}><it.icon size={14} weight="bold" style={{ color: it.color }} /></span>
            {it.text}
          </div>
        ))}
      </div>
    </div>
  )
}
