/**
 * State of H-Worker › Process discovery: recording an operator on the main screen, then turning
 * the captured clicks into a process graph. The driver lives in apps/hworker/discovery/driver.ts.
 */
import { create } from 'zustand'

export type RecPhase = 'idle' | 'arming' | 'recording' | 'analyzing' | 'graph'

export interface CapturedEvent {
  t: number
  text: string
  appId?: string
  /** index into OPERATOR_STEPS (which process step the event belongs to) */
  step: number
  kind: 'action' | 'open' | 'read'
}

interface RecState {
  phase: RecPhase
  runId?: string
  startedAt?: number
  endedAt?: number
  events: CapturedEvent[]
  set: (p: Partial<RecState>) => void
}

export const useRec = create<RecState>()((set) => ({
  phase: 'idle',
  events: [],
  set: (p) => set(p),
}))
