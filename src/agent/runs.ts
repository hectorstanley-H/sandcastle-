/** Live state of agent runs (in-memory). Finished runs are also persisted to db `hworker.runs`. */
import { create } from 'zustand'
import type { PlanStep, WorkflowResult } from './types'
import type { StepUsage } from './execution'

export type RunStatus = 'booting' | 'running' | 'paused' | 'awaiting' | 'done' | 'failed' | 'cancelled'

export interface LogEntry {
  id: number
  t: number
  kind: 'think' | 'action' | 'info' | 'success' | 'warn' | 'error' | 'step' | 'open' | 'api' | 'code'
  text: string
  appId?: string
}

export interface Run {
  id: string
  /** "Agent 03" */
  name: string
  workflowId: string
  title: string
  prompt?: string
  inputs: Record<string, any>
  status: RunStatus
  speed: number
  plan: PlanStep[]
  planIndex: number
  /** usage per plan step (actions, reasoning passes, API calls, time) */
  usage: StepUsage[]
  stepStartedAt?: number
  log: LogEntry[]
  cursor: { x: number; y: number; dur: number; clicks: number; visible: boolean; typing: boolean }
  activeApp?: string
  startedAt: number
  endedAt?: number
  result?: WorkflowResult
  error?: string
  /** where the agent's screen is shown: its own window, or a tile in H-Worker › Cloud agents */
  host?: 'window' | 'cloud'
  /** pending human approval */
  approval?: { question: string; detail?: string; answer?: boolean }
}

interface RunsState {
  runs: Record<string, Run>
  patch: (id: string, p: Partial<Run> | ((r: Run) => Partial<Run>)) => void
  addLog: (id: string, e: Omit<LogEntry, 'id' | 't'>) => void
}

let logId = 0

export const useRuns = create<RunsState>()((set) => ({
  runs: {},
  patch: (id, p) =>
    set((s) => {
      const r = s.runs[id]
      if (!r) return {}
      return { runs: { ...s.runs, [id]: { ...r, ...(typeof p === 'function' ? p(r) : p) } } }
    }),
  addLog: (id, e) =>
    set((s) => {
      const r = s.runs[id]
      if (!r) return {}
      return { runs: { ...s.runs, [id]: { ...r, log: [...r.log, { ...e, id: ++logId, t: Date.now() }] } } }
    }),
}))

export const runs = () => useRuns.getState()

/** cancellation flags read by the runtime */
export const cancelFlags = new Set<string>()
export function cancelRun(id: string) {
  cancelFlags.add(id)
  const r = useRuns.getState().runs[id]
  if (r && (r.status === 'running' || r.status === 'paused' || r.status === 'booting' || r.status === 'awaiting')) {
    useRuns.getState().patch(id, { status: 'cancelled', endedAt: Date.now() })
  }
}
export function cancelAllRuns() {
  Object.keys(useRuns.getState().runs).forEach(cancelRun)
}
