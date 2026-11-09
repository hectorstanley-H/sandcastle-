/**
 * Eval suite: the test cases each agent is measured against, the rubric (deterministic checks + criteria
 * scored by a judge LLM), and the judge's reasoning per case. Results are staged for the demo.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Play, CheckCircle, XCircle, CircleNotch, Plus, Scales, Code, Gavel, Sparkle, ChartBar, Trash } from '@phosphor-icons/react'
import { appIcon } from '@/os/registry'
import { getWorkflow } from '@/workflows'
import { fmtUsd } from '@/agent/execution'
import { Mono } from './shared'

type Kind = 'check' | 'judge'
interface Criterion { id: string; name: string; kind: Kind; description: string; weight: number }
interface Case { id: string; name: string; input: string; expected: string; tags: string[]; cost: number; seconds: number; scores: Record<string, [number, string]> }
interface Suite { workflowId: string; version: string; criteria: Criterion[]; cases: Case[]; history: [string, number][]; agreement: number; labelled: number }

const JUDGES = ['Holo 4 large', 'Independent judge LLM (external)']

/** default note for a perfect score */
const ok = (c: Criterion) => (c.kind === 'check' ? 'Verified against system of record.' : 'Meets the criterion.')

const SUITES: Suite[] = [
  {
    workflowId: 'sap-post-supplier-invoice',
    version: 'v1.4',
    agreement: 94,
    labelled: 120,
    history: [['v1.0', 62], ['v1.1', 71], ['v1.2', 78], ['v1.3', 84]],
    criteria: [
      { id: 'amount', name: 'Posted with the correct gross amount', kind: 'check', description: 'SAP document gross = invoice gross, to the cent.', weight: 3 },
      { id: 'po', name: 'Posted against the right PO', kind: 'check', description: 'Reference PO and line items match the invoice.', weight: 3 },
      { id: 'limit', name: 'Never posts above limit without approval', kind: 'check', description: 'Any posting > $25,000 has a recorded human approval.', weight: 5 },
      { id: 'escalate', name: 'Escalates exceptions with a clear reason', kind: 'judge', description: 'When it can’t proceed, the reviewer gets enough context to decide in one read.', weight: 3 },
      { id: 'email', name: 'Supplier email is accurate and professional', kind: 'judge', description: 'Correct document number and payment date; tone fits a supplier relationship.', weight: 2 },
      { id: 'cost', name: 'Cost per run under $0.25', kind: 'check', description: 'Total model + API spend for the run.', weight: 1 },
    ],
    cases: [
      { id: 'c1', name: 'Clean 3-way match', input: 'Fabrikam INV-20931 · $14,250 · PO 4500018234', expected: 'Posted, reply sent with Net 30 date', tags: ['happy path'], cost: 0.088, seconds: 74, scores: { email: [0.95, 'Document number and the Net 30 date are correct; friendly, concise. Minor: could reference the PO in the subject.'] } },
      { id: 'c2', name: 'Two invoices in one email', input: 'Litware LW-7781 + LW-7790 in one thread', expected: 'Both posted separately', tags: ['multi-item'], cost: 0.121, seconds: 96, scores: {} },
      { id: 'c3', name: 'Price variance +5.1%', input: 'Proseware · 120 × $12.40 vs PO $11.80', expected: 'Not posted, escalated with variance', tags: ['exception'], cost: 0.061, seconds: 41, scores: { escalate: [0.92, 'States the line, both prices, the tolerance and the total variance. Suggests a credit note. Reviewer can decide without opening SAP.'], email: [1, 'No supplier email expected — correctly withheld until resolved.'] } },
      { id: 'c4', name: 'Amount above $25k limit', input: 'Contoso · $48,900 · clean match', expected: 'Waits for approval, then posts', tags: ['guardrail'], cost: 0.094, seconds: 88, scores: { escalate: [0.88, 'Clear and short. Could state that the match is clean in the first line, not the second.'] } },
      { id: 'c5', name: 'Duplicate invoice', input: 'Trey TR-5521 vs posted TR-5512', expected: 'Flagged as likely duplicate', tags: ['exception'], cost: 0.058, seconds: 39, scores: { escalate: [0.9, 'Links the earlier document and explains the one-character reference difference.'], email: [1, 'Correctly no email sent.'] } },
      { id: 'c6', name: 'Bank details changed', input: 'Remit-to IBAN differs from vendor master', expected: 'Blocked, sent to Treasury', tags: ['fraud', 'guardrail'], cost: 0.055, seconds: 37, scores: { escalate: [0.97, 'Names the risk explicitly (possible payment fraud), shows both IBAN endings, routes to Treasury. Exemplary.'], email: [1, 'No email to the supplier — correct, avoids tipping off a fraudster.'] } },
      { id: 'c7', name: 'Scanned PDF, rotated', input: 'Image-only PDF rotated 90°', expected: 'Fields extracted, posted', tags: ['document'], cost: 0.142, seconds: 112, scores: { email: [0.84, 'Correct facts. Slightly formal; repeats the amount twice.'] } },
      { id: 'c8', name: 'Invoice in EUR', input: 'Alpine Ski House · €1,740 · PO in USD', expected: 'Posted in EUR with SAP rate', tags: ['currency'], cost: 0.097, seconds: 81, scores: { amount: [0, 'Posted $1,740.00 USD — agent kept the number but not the currency. SAP should convert at the daily rate.'], email: [0.55, 'States the wrong amount ($1,740) to the supplier, which would confuse their AR team.'] } },
    ],
  },
  {
    workflowId: 'concur-expense-report',
    version: 'v2.1',
    agreement: 91,
    labelled: 80,
    history: [['v1.8', 70], ['v1.9', 76], ['v2.0', 83]],
    criteria: [
      { id: 'complete', name: 'All card transactions on the report', kind: 'check', description: 'Every transaction in the trip window is included once.', weight: 3 },
      { id: 'policy', name: 'Policy limits respected or justified', kind: 'check', description: 'Over-limit items carry an approved justification.', weight: 4 },
      { id: 'purpose', name: 'Business purpose is specific', kind: 'judge', description: 'A finance reviewer would accept it without asking.', weight: 2 },
      { id: 'attendees', name: 'Meal attendees recorded correctly', kind: 'judge', description: 'Names match the calendar event; client vs employee marked.', weight: 2 },
    ],
    cases: [
      { id: 'e1', name: 'Chicago client trip', input: '4 Amex transactions, hotel + dinner', expected: 'Submitted, hotel itemized', tags: ['happy path'], cost: 0.072, seconds: 66, scores: { purpose: [0.9, 'Names the client and the reason for the visit.'] } },
      { id: 'e2', name: 'Hotel over nightly cap', input: '$412/night, SF', expected: 'Escalated for exception', tags: ['guardrail'], cost: 0.051, seconds: 34, scores: {} },
      { id: 'e3', name: 'Dinner without attendees', input: '$286 business meal', expected: 'Attendees added from calendar', tags: ['exception'], cost: 0.064, seconds: 52, scores: { attendees: [0.62, 'Pulled names from the invite but marked a client attendee as an employee.'] } },
      { id: 'e4', name: 'Duplicate Uber charge', input: 'Two identical $48.20 rides', expected: 'Second one excluded', tags: ['exception'], cost: 0.049, seconds: 31, scores: {} },
      { id: 'e5', name: 'Foreign currency receipts', input: 'London trip, GBP', expected: 'Converted with card rate', tags: ['currency'], cost: 0.083, seconds: 70, scores: {} },
    ],
  },
  {
    workflowId: 'servicenow-triage-incidents',
    version: 'v1.2',
    agreement: 89,
    labelled: 150,
    history: [['v1.0', 74], ['v1.1', 81]],
    criteria: [
      { id: 'group', name: 'Routed to the right assignment group', kind: 'check', description: 'Matches the group a senior analyst chose.', weight: 4 },
      { id: 'priority', name: 'Priority within one level of expert label', kind: 'check', description: 'P1–P4 compared with the human label.', weight: 3 },
      { id: 'cluster', name: 'Related incidents linked', kind: 'judge', description: 'Clusters of the same root cause are linked to a parent.', weight: 2 },
      { id: 'note', name: 'Work note is useful to the next engineer', kind: 'judge', description: 'Says what was checked and why it was routed.', weight: 2 },
    ],
    cases: [
      { id: 'i1', name: 'VPN cluster — Boston', input: '9 incidents, same symptom', expected: 'Parent + 8 children → Network', tags: ['cluster'], cost: 0.067, seconds: 58, scores: {} },
      { id: 'i2', name: 'SAP Fiori login spike', input: '43 users in 20 min', expected: 'P1, SAP Basis, paged', tags: ['guardrail'], cost: 0.059, seconds: 44, scores: {} },
      { id: 'i3', name: 'Ambiguous “laptop slow”', input: 'One-line description', expected: 'Asks user for detail, P4', tags: ['ambiguous'], cost: 0.044, seconds: 29, scores: { note: [0.68, 'Asked for detail but didn’t say what it had already checked.'] } },
      { id: 'i4', name: 'Duplicate of open incident', input: 'Same user, same issue, 2h later', expected: 'Closed as duplicate', tags: ['exception'], cost: 0.038, seconds: 22, scores: {} },
    ],
  },
]

/** deterministic pseudo-score for criteria the user adds during the demo */
function addedScore(caseId: string, critId: string): [number, string] {
  let h = 0
  for (const ch of caseId + critId) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  const s = 0.72 + (h % 28) / 100
  return [Math.round(s * 100) / 100, s > 0.85 ? 'Clearly meets the new criterion.' : 'Mostly meets it; minor gaps noted in the transcript.']
}

const scoreOf = (s: Suite, c: Case, cr: Criterion): [number, string] => c.scores[cr.id] ?? (cr.id.startsWith('new-') ? addedScore(c.id, cr.id) : [1, ok(cr)])
function passes(s: Suite, c: Case, criteria: Criterion[]) {
  return criteria.every((cr) => (cr.kind === 'check' ? scoreOf(s, c, cr)[0] >= 1 : scoreOf(s, c, cr)[0] >= 0.7))
}

const dot = (v: number, kind: Kind) => (v >= (kind === 'check' ? 1 : 0.85) ? '#2E9E4F' : v >= 0.7 ? '#C88A04' : '#C50F1F')

export function EvalsView() {
  const [suiteIdx, setSuiteIdx] = useState(0)
  const base = SUITES[suiteIdx]
  const [extra, setExtra] = useState<Record<string, Criterion[]>>({})
  const [removed, setRemoved] = useState<Record<string, string[]>>({})
  const criteria = useMemo(
    () => [...base.criteria, ...(extra[base.workflowId] ?? [])].filter((c) => !(removed[base.workflowId] ?? []).includes(c.id)),
    [base, extra, removed],
  )
  const suite = base
  const [judge, setJudge] = useState(JUDGES[0])
  const [sel, setSel] = useState<string | null>(null)
  // run state: index of case being run; -1 idle; cases.length = finished
  const [cursor, setCursor] = useState(-1)
  const [phase, setPhase] = useState<'agent' | 'judge'>('agent')
  const [ran, setRan] = useState<Record<string, boolean>>({})
  const timers = useRef<number[]>([])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  useEffect(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
    setCursor(-1)
    setSel(null)
  }, [suiteIdx])

  const run = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
    setSel(null)
    let t = 0
    suite.cases.forEach((_, i) => {
      timers.current.push(window.setTimeout(() => { setCursor(i); setPhase('agent') }, t))
      t += 700
      timers.current.push(window.setTimeout(() => setPhase('judge'), t))
      t += 900
    })
    timers.current.push(window.setTimeout(() => { setCursor(suite.cases.length); setRan((r) => ({ ...r, [suite.workflowId]: true })) }, t))
  }

  const running = cursor >= 0 && cursor < suite.cases.length
  const hasRun = ran[suite.workflowId] || cursor >= suite.cases.length
  const visible = (i: number) => hasRun || (running && (i < cursor || (i === cursor && phase === 'judge')))
  const shownCases = suite.cases.filter((_, i) => visible(i))
  const passed = shownCases.filter((c) => passes(suite, c, criteria)).length
  const rate = shownCases.length ? Math.round((passed / shownCases.length) * 100) : 0
  const wf = getWorkflow(suite.workflowId)
  const selCase = suite.cases.find((c) => c.id === sel)

  return (
    <div className="px-10 py-8" data-agent="hw-evals">
      <div className="flex items-end justify-between gap-6">
        <div>
          <Mono>Evals</Mono>
          <h1 className="mt-1 text-[26px] font-bold tracking-tight">How every agent is measured</h1>
          <p className="mt-1 text-[13.5px] text-[#3A3A44] max-w-[640px]">Each workflow has a suite of test cases. Hard rules are checked by code; judgement calls are scored by a judge LLM that explains every score — calibrated against human reviewers.</p>
        </div>
        <button onClick={run} disabled={running} data-agent="hw-evals-run" className="h-10 px-5 rounded-full bg-[#0F0E12] hover:bg-[#2A2930] text-white text-[13px] font-semibold flex items-center gap-2 disabled:opacity-60">
          {running ? <CircleNotch size={15} className="animate-spin" /> : <Play size={14} weight="fill" />} {running ? `Running ${cursor + 1}/${suite.cases.length}` : 'Run suite'}
        </button>
      </div>

      {/* suite tabs */}
      <div className="mt-6 flex gap-2">
        {SUITES.map((s, i) => {
          const w = getWorkflow(s.workflowId)
          return (
            <button key={s.workflowId} onClick={() => setSuiteIdx(i)} className={`h-10 pl-2.5 pr-4 rounded-full border flex items-center gap-2 text-[12.5px] font-semibold ${i === suiteIdx ? 'border-[#430693] bg-[#FBF9FE] text-[#430693]' : 'border-[#EAE5DD] hover:bg-[#F7F5F1]'}`}>
              <img src={appIcon(w?.apps.slice(-1)[0] ?? 'hworker')} className="w-5 h-5 object-contain" alt="" />
              {w?.title ?? s.workflowId}
              <span className="text-[10.5px] text-[#9A97A3] font-normal" style={{ fontFamily: 'var(--font-mono)' }}>{s.cases.length} cases</span>
            </button>
          )
        })}
      </div>

      {/* KPIs */}
      <div className="mt-5 grid grid-cols-5 gap-3">
        <Kpi label={`Pass rate · ${suite.version}`} value={shownCases.length ? `${rate}%` : '—'} sub={shownCases.length ? `${passed}/${shownCases.length} cases` : 'Run the suite'} accent />
        <Kpi label="Previous version" value={`${suite.history[suite.history.length - 1][1]}%`} sub={suite.history[suite.history.length - 1][0]} />
        <Kpi label="Judge ↔ human agreement" value={`${suite.agreement}%`} sub={`on ${suite.labelled} labelled runs`} />
        <Kpi label="Avg cost per run" value={fmtUsd(suite.cases.reduce((n, c) => n + c.cost, 0) / suite.cases.length)} sub="agent + judge" />
        <Kpi label="Avg time per run" value={`${Math.round(suite.cases.reduce((n, c) => n + c.seconds, 0) / suite.cases.length)}s`} sub={`vs ${wf?.timeSaved ?? '—'} by hand`} />
      </div>

      <div className="mt-5 grid grid-cols-[1fr_360px] gap-5 items-start">
        {/* results table */}
        <div className="rounded-2xl border border-[#EAE5DD] overflow-hidden">
          <div className="grid gap-3 px-4 h-10 items-center bg-[#F7F5F1] text-[11px] text-[#7A7A87]" style={{ gridTemplateColumns: `1fr repeat(${criteria.length}, 26px) 70px`, fontFamily: 'var(--font-mono)' }}>
            <span>TEST CASE</span>
            {criteria.map((c, i) => <span key={c.id} title={c.name} className="text-center">{c.kind === 'check' ? 'C' : 'J'}{i + 1}</span>)}
            <span className="text-right">RESULT</span>
          </div>
          {suite.cases.map((c, i) => {
            const show = visible(i)
            const isCur = running && i === cursor
            const pass = passes(suite, c, criteria)
            return (
              <button
                key={c.id}
                onClick={() => show && setSel(c.id)}
                data-agent={`hw-evals-case-${c.id}`}
                className={`w-full text-left grid gap-3 px-4 py-2.5 items-center border-t border-[#F1EEE9] ${sel === c.id ? 'bg-[#FBF9FE]' : 'hover:bg-[#FBFAF8]'}`}
                style={{ gridTemplateColumns: `1fr repeat(${criteria.length}, 26px) 70px` }}
              >
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold truncate">{c.name}</span>
                  <span className="flex items-center gap-1.5 text-[11px] text-[#7A7A87] truncate">
                    {c.tags.map((t) => <span key={t} className="px-1.5 rounded bg-[#F1EEE9]">{t}</span>)}
                    <span className="truncate">{c.input}</span>
                  </span>
                </span>
                {criteria.map((cr) => {
                  const [v] = scoreOf(suite, c, cr)
                  return (
                    <span key={cr.id} className="flex justify-center">
                      {show ? (
                        <span className="w-3 h-3 rounded-full result-in" style={{ background: dot(v, cr.kind) }} title={`${cr.name}: ${Math.round(v * 100)}%`} />
                      ) : isCur ? (
                        <span className="w-3 h-3 rounded-full bg-[#EAE5DD] animate-pulse" />
                      ) : (
                        <span className="w-3 h-3 rounded-full border border-[#E1DDD6]" />
                      )}
                    </span>
                  )
                })}
                <span className="flex justify-end">
                  {show ? (
                    pass ? <span className="flex items-center gap-1 text-[12px] font-semibold text-[#0E700E]"><CheckCircle size={14} weight="fill" /> Pass</span> : <span className="flex items-center gap-1 text-[12px] font-semibold text-[#C50F1F]"><XCircle size={14} weight="fill" /> Fail</span>
                  ) : isCur ? (
                    <span className="flex items-center gap-1 text-[11px] text-[#430693]"><CircleNotch size={12} className="animate-spin" /> {phase === 'agent' ? 'Agent' : 'Judge'}</span>
                  ) : (
                    <span className="text-[11px] text-[#C9C6CF]">—</span>
                  )}
                </span>
              </button>
            )
          })}
          <div className="px-4 py-2.5 border-t border-[#F1EEE9] flex flex-wrap gap-x-4 gap-y-1 text-[10.5px] text-[#7A7A87]">
            {criteria.map((c, i) => <span key={c.id}><b>{c.kind === 'check' ? 'C' : 'J'}{i + 1}</b> {c.name}</span>)}
          </div>
        </div>

        {/* right rail: case detail or rubric + judge */}
        {selCase ? (
          <CaseDetail suite={suite} c={selCase} criteria={criteria} judge={judge} onClose={() => setSel(null)} />
        ) : (
          <div className="space-y-4">
            <Rubric
              criteria={criteria}
              onAdd={(c) => setExtra((e) => ({ ...e, [suite.workflowId]: [...(e[suite.workflowId] ?? []), c] }))}
              onRemove={(id) => setRemoved((r) => ({ ...r, [suite.workflowId]: [...(r[suite.workflowId] ?? []), id] }))}
            />
            <div className="rounded-2xl border border-[#EAE5DD] p-4">
              <div className="flex items-center gap-1.5"><Gavel size={15} weight="fill" className="text-[#430693]" /><Mono>Judge</Mono></div>
              <select value={judge} onChange={(e) => setJudge(e.target.value)} className="mt-2.5 w-full h-9 px-2.5 rounded-lg border border-[#E1DDD6] bg-white text-[12.5px]" data-agent="hw-evals-judge">
                {JUDGES.map((j) => <option key={j}>{j}</option>)}
              </select>
              <div className="mt-2.5 text-[11px] text-[#7A7A87] leading-snug">The judge sees the task, the agent’s full trajectory (screens, API calls, outputs) and the rubric, and must justify every score. Scores it isn’t sure about go to a human.</div>
              <div className="mt-3 rounded-lg bg-[#FBFAF8] border border-[#EAE5DD] p-2.5 text-[11px] text-[#3A3A44] leading-snug" style={{ fontFamily: 'var(--font-mono)' }}>
                You are reviewing an agent run for “{wf?.title}”. For each criterion, give a score 0–1 and one sentence of evidence from the trajectory. Penalise any unrecorded system change.
              </div>
            </div>
            <History suite={suite} current={hasRun ? rate : null} />
          </div>
        )}
      </div>
    </div>
  )
}

function Kpi({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl px-4 py-3 ${accent ? 'bg-[#0F0E12] text-white' : 'border border-[#EAE5DD]'}`}>
      <div className="text-[22px] font-bold tabular-nums">{value}</div>
      <div className={`text-[11.5px] ${accent ? 'text-white/70' : 'text-[#7A7A87]'}`}>{label}</div>
      <div className={`text-[10.5px] ${accent ? 'text-white/50' : 'text-[#9A97A3]'}`}>{sub}</div>
    </div>
  )
}

function Rubric({ criteria, onAdd, onRemove }: { criteria: Criterion[]; onAdd: (c: Criterion) => void; onRemove: (id: string) => void }) {
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [kind, setKind] = useState<Kind>('judge')
  return (
    <div className="rounded-2xl border border-[#EAE5DD] p-4" data-agent="hw-evals-rubric">
      <div className="flex items-center gap-1.5"><Scales size={15} weight="fill" className="text-[#430693]" /><Mono>Rubric</Mono></div>
      <ul className="mt-2.5 space-y-2">
        {criteria.map((c, i) => (
          <li key={c.id} className="group flex items-start gap-2">
            <span className={`mt-[1px] h-5 px-1.5 rounded text-[10px] font-bold flex items-center gap-1 shrink-0 ${c.kind === 'check' ? 'bg-[#E6F4EA] text-[#0E700E]' : 'bg-[#F1ECF9] text-[#430693]'}`}>
              {c.kind === 'check' ? <Code size={10} weight="bold" /> : <Sparkle size={10} weight="fill" />}{c.kind === 'check' ? 'C' : 'J'}{i + 1}
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-[12.5px] font-semibold leading-snug">{c.name}</span>
              <span className="block text-[11px] text-[#7A7A87] leading-snug">{c.description}</span>
            </span>
            <span className="text-[10.5px] text-[#9A97A3] shrink-0" style={{ fontFamily: 'var(--font-mono)' }}>×{c.weight}</span>
            <button onClick={() => onRemove(c.id)} className="opacity-0 group-hover:opacity-100 text-[#9A97A3] hover:text-[#C50F1F]" title="Remove"><Trash size={13} /></button>
          </li>
        ))}
      </ul>
      {adding ? (
        <div className="mt-3 space-y-2">
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Never emails a supplier before posting" className="w-full h-9 px-2.5 rounded-lg border border-[#E1DDD6] text-[12.5px] outline-none focus:border-[#C2A0EE]" data-agent="hw-evals-new-name" />
          <div className="flex gap-2">
            <select value={kind} onChange={(e) => setKind(e.target.value as Kind)} className="h-8 px-2 rounded-lg border border-[#E1DDD6] bg-white text-[12px]">
              <option value="judge">Judge LLM</option>
              <option value="check">Code check</option>
            </select>
            <button
              onClick={() => {
                if (!name.trim()) return
                onAdd({ id: `new-${Date.now()}`, name: name.trim(), kind, description: kind === 'judge' ? 'Scored by the judge with evidence from the trajectory.' : 'Deterministic check on the run output.', weight: 2 })
                setName('')
                setAdding(false)
              }}
              className="flex-1 h-8 rounded-lg bg-[#0F0E12] text-white text-[12px] font-semibold"
            >
              Add criterion
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="mt-3 h-8 px-3 rounded-full border border-dashed border-[#C2A0EE] text-[#430693] text-[12px] font-semibold flex items-center gap-1.5 hover:bg-[#FBF9FE]" data-agent="hw-evals-add">
          <Plus size={13} weight="bold" /> Add criterion
        </button>
      )}
    </div>
  )
}

function History({ suite, current }: { suite: Suite; current: number | null }) {
  const rows: [string, number, boolean][] = [...suite.history.map(([v, p]) => [v, p, false] as [string, number, boolean]), ...(current !== null ? [[suite.version, current, true] as [string, number, boolean]] : [])]
  return (
    <div className="rounded-2xl border border-[#EAE5DD] p-4">
      <div className="flex items-center gap-1.5"><ChartBar size={15} weight="fill" className="text-[#430693]" /><Mono>Pass rate by agent version</Mono></div>
      <div className="mt-3 space-y-1.5">
        {rows.map(([v, p, cur]) => (
          <div key={v} className="flex items-center gap-2 text-[11.5px]">
            <span className="w-10 text-[#7A7A87]" style={{ fontFamily: 'var(--font-mono)' }}>{v}</span>
            <span className="flex-1 h-2.5 rounded-full bg-[#F1EEE9] overflow-hidden">
              <span className="block h-full rounded-full transition-all duration-700" style={{ width: `${p}%`, background: cur ? '#430693' : '#C2A0EE' }} />
            </span>
            <span className={`w-9 text-right tabular-nums ${cur ? 'font-bold text-[#430693]' : ''}`}>{p}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function CaseDetail({ suite, c, criteria, judge, onClose }: { suite: Suite; c: Case; criteria: Criterion[]; judge: string; onClose: () => void }) {
  const pass = passes(suite, c, criteria)
  return (
    <div className="rounded-2xl border border-[#EAE5DD] p-4 result-in" data-agent="hw-evals-detail">
      <div className="flex items-center gap-2">
        <Mono>Test case</Mono>
        <span className="ml-auto" />
        <button onClick={onClose} className="text-[12px] text-[#7A7A87] hover:text-[#0F0E12]">Back to rubric</button>
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <span className="text-[15px] font-bold">{c.name}</span>
        {pass ? <CheckCircle size={16} weight="fill" className="text-[#0E700E]" /> : <XCircle size={16} weight="fill" className="text-[#C50F1F]" />}
      </div>
      <div className="mt-2 grid grid-cols-[70px_1fr] gap-x-2 gap-y-1 text-[11.5px]">
        <span className="text-[#7A7A87]">Input</span><span>{c.input}</span>
        <span className="text-[#7A7A87]">Expected</span><span>{c.expected}</span>
        <span className="text-[#7A7A87]">Run</span><span>{fmtUsd(c.cost)} · {c.seconds}s</span>
      </div>
      <div className="mt-4 space-y-3">
        {criteria.map((cr, i) => {
          const [v, note] = scoreOf(suite, c, cr)
          return (
            <div key={cr.id} className="rounded-lg border border-[#EAE5DD] p-2.5">
              <div className="flex items-center gap-2">
                <span className={`h-5 px-1.5 rounded text-[10px] font-bold flex items-center ${cr.kind === 'check' ? 'bg-[#E6F4EA] text-[#0E700E]' : 'bg-[#F1ECF9] text-[#430693]'}`}>{cr.kind === 'check' ? 'C' : 'J'}{i + 1}</span>
                <span className="flex-1 text-[12px] font-semibold leading-snug">{cr.name}</span>
                <span className="text-[12px] font-bold tabular-nums" style={{ color: dot(v, cr.kind) }}>{cr.kind === 'check' ? (v >= 1 ? 'PASS' : 'FAIL') : v.toFixed(2)}</span>
              </div>
              <div className="mt-1.5 flex items-start gap-1.5 text-[11.5px] text-[#3A3A44] leading-snug">
                {cr.kind === 'judge' ? <Sparkle size={12} weight="fill" className="text-[#7114EB] mt-[2px] shrink-0" /> : <Code size={12} className="text-[#0E700E] mt-[2px] shrink-0" />}
                <span>{note}{cr.kind === 'judge' && <span className="block mt-0.5 text-[10.5px] text-[#9A97A3]">— {judge}</span>}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
