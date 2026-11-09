/**
 * Process discovery demo driver. "Play" moves a cursor onto H-Worker's Record button; recording
 * minimizes H-Worker and an operator works a real case on the main screen (Outlook → Acrobat → SAP
 * → Outlook) while every click is captured. Stopping brings H-Worker back to build the graph.
 */
import { uid } from '@/db/db'
import { wm } from '@/os/wm'
import { isoDate, daysAgo } from '@/data/time'
import { createAgent } from '@/agent/runtime'
import { cancelFlags, useRuns, type Run } from '@/agent/runs'
import { emptyUsage } from '@/agent/execution'
import { useRec, type CapturedEvent } from '@/agent/recorder'
import type { AgentAPI } from '@/agent/types'

/** what the operator does, in order — each maps to a node of the process graph */
export const OPERATOR_STEPS = [
  { node: 'intake', text: 'Open the invoice email in the AP inbox' },
  { node: 'extract', text: 'Read the invoice PDF' },
  { node: 'po', text: 'Look up the PO and goods receipt in SAP' },
  { node: 'match', text: 'Compare invoice to PO' },
  { node: 'post', text: 'Post the invoice in SAP' },
  { node: 'confirm', text: 'Confirm the payment date to the supplier' },
]

export const OPERATOR = { name: 'Alex Morgan', role: 'AP specialist', initials: 'AM' }
const READ = 'Reading: '

let agent: AgentAPI | null = null

function newObserverRun() {
  const id = uid('obs')
  const urlSpeed = Number(new URLSearchParams(location.search).get('speed')) || 1
  const b = wm().desks.main?.bounds ?? { w: 1400, h: 820 }
  const plan = OPERATOR_STEPS.map((s) => ({ text: s.text, via: 'cua' as const, model: 'small' as const }))
  const run: Run = {
    id,
    name: OPERATOR.name,
    workflowId: 'process-discovery',
    title: 'AP invoice processing (observed)',
    inputs: {},
    status: 'running',
    speed: 1.25 * urlSpeed,
    plan,
    planIndex: -1,
    usage: plan.map(emptyUsage),
    log: [],
    cursor: { x: b.w * 0.55, y: b.h * 0.62, dur: 0, clicks: 0, visible: true, typing: false },
    startedAt: Date.now(),
    host: 'observer',
  }
  useRuns.setState((s) => ({ runs: { ...s.runs, [id]: run } }))
  agent = createAgent(id, {}, { desk: 'main', maximize: true })
  return id
}

const hworkerWin = () => wm().desks.main?.windows.find((w) => w.appId === 'hworker')

/** ▶ Play: the cursor clicks Record itself, then the recording runs on its own. */
export async function playDiscovery() {
  const { phase } = useRec.getState()
  if (phase === 'arming' || phase === 'recording') return
  const runId = newObserverRun()
  useRec.getState().set({ phase: 'arming', runId, events: [], startedAt: undefined, endedAt: undefined })
  try {
    await agent!.wait(500)
    await agent!.click('@hw-disc-record', { label: 'Record' })
  } catch (e) {
    console.error(e)
    useRec.getState().set({ phase: 'idle' })
  }
}

/** ● Record (clicked by the cursor or by hand). */
export function beginRecording() {
  const s = useRec.getState()
  if (s.phase === 'recording') return
  let runId = s.runId
  if (s.phase !== 'arming' || !runId) runId = newObserverRun()
  useRec.getState().set({ phase: 'recording', runId, startedAt: Date.now(), events: [] })
  const w = hworkerWin()
  if (w) wm().minimize('main', w.id)
  void operate(runId)
}

async function operate(runId: string) {
  const a = agent!
  try {
    await a.wait(1400)
    await operatorScript(a)
    await a.wait(600)
    await a.click('@rec-stop', { label: 'Stop recording' })
  } catch (e) {
    if (!cancelFlags.has(runId)) console.error(e)
    if (useRec.getState().phase === 'recording') stopRecording()
  }
}

export function stopRecording() {
  const s = useRec.getState()
  if (s.phase !== 'recording' || !s.runId) return
  const run = useRuns.getState().runs[s.runId]
  cancelFlags.add(s.runId)
  useRuns.getState().patch(s.runId, (r) => ({ status: 'done', endedAt: Date.now(), cursor: { ...r.cursor, visible: false, typing: false } }))
  useRec.getState().set({ phase: 'analyzing', endedAt: Date.now(), events: captured(run) })
  wm().open('main', 'hworker', { view: 'discovery' })
}

export function resetDiscovery() {
  useRec.getState().set({ phase: 'idle', runId: undefined, events: [], startedAt: undefined, endedAt: undefined })
}

/** turn the run log into the captured event stream, segmented by process step */
export function captured(run?: Run): CapturedEvent[] {
  if (!run) return []
  let step = 0
  const out: CapturedEvent[] = []
  for (const l of run.log) {
    if (l.kind === 'step') {
      const i = run.plan.findIndex((p) => p.text === l.text)
      if (i >= 0) step = i
    } else if (l.kind === 'action' || l.kind === 'open') {
      out.push({ t: l.t, text: l.text, appId: l.appId, step, kind: l.kind })
    } else if (l.kind === 'info' && l.text.startsWith(READ)) {
      out.push({ t: l.t, text: l.text.slice(READ.length), appId: run.activeApp, step, kind: 'read' })
    }
  }
  return out
}

/* ───────────────────────── the observed operator ───────────────────────── */

async function read(a: AgentAPI, text: string, ms: number) {
  a.log(READ + text)
  await a.wait(ms)
}

async function operatorScript(a: AgentAPI) {
  a.step(0)
  await a.open('outlook')
  await a.waitFor('@outlook-search', 20000)
  await a.click('@outlook-folder-inbox', { label: 'Inbox' })
  await a.click('@outlook-email-em-invoice-fabrikam', { label: 'Invoice INV-20931 — Mike Harrington' })
  await read(a, 'email from Fabrikam Supplies', 900)

  a.step(1)
  await a.click('@outlook-attachment-em-invoice-fabrikam-0', { label: 'INV-20931.pdf' })
  await read(a, 'invoice INV-20931 — total, PO number, terms', 2200)
  await a.close('acrobat')

  a.step(2)
  await a.open('sap')
  if (a.exists('@sap-home')) await a.click('@sap-home', { label: 'Home' })
  await a.click('@sap-app-pos', { label: 'Manage Purchase Orders', timeout: 20000 })
  await a.type('@sap-po-search', '4500018234', { label: 'Search', fast: true })
  await a.click('@sap-po-go', { label: 'Go' })
  await a.click('@sap-po-row-4500018234', { label: 'Purchase Order 4500018234' })
  await read(a, 'PO 4500018234 — 3 lines, $14,250.00, service entry sheets posted', 1800)

  a.step(3)
  await read(a, 'compares invoice lines to PO lines by eye', 1300)

  a.step(4)
  await a.click('@sap-home', { label: 'Home' })
  await a.click('@sap-app-create-invoice', { label: 'Create Supplier Invoice' })
  await a.type('@sap-ci-supplier', 'Fabrikam', { label: 'Invoicing Party' })
  await a.click('@sap-ci-supplier-opt-10300045', { label: 'Fabrikam Supplies (10300045)' })
  await a.type('@sap-ci-invoice-date', isoDate(daysAgo(1)), { label: 'Invoice Date' })
  await a.type('@sap-ci-reference', 'INV-20931', { label: 'Reference' })
  await a.type('@sap-ci-gross', '14250.00', { label: 'Gross Invoice Amount' })
  await a.type('@sap-ci-po', '4500018234', { label: 'Purchase Order' })
  await a.press('Enter')
  await read(a, 'balance 0.00 — PO lines loaded', 900)
  await a.click('@sap-ci-post', { label: 'Post' })
  await a.waitFor('@sap-ci-docnum')
  await read(a, `document ${a.text('@sap-ci-docnum')} posted`, 900)

  a.step(5)
  await a.open('outlook')
  await a.click('@outlook-email-em-invoice-fabrikam', { label: 'Invoice INV-20931' })
  await a.click('@outlook-reply', { label: 'Reply' })
  await a.type('@outlook-compose-body', 'Hi Mike,\n\nINV-20931 is posted against PO 4500018234 and scheduled for payment in 30 days (Net 30).\n\nThanks,\nAlex', { label: 'message body', fast: true })
  await a.click('@outlook-send', { label: 'Send' })
  await a.wait(700)
}

// ?discovery=graph jumps straight to the finished graph (handy when rehearsing a demo)
if (typeof window !== 'undefined' && new URLSearchParams(location.search).get('discovery') === 'graph') useRec.setState({ phase: 'graph' })
