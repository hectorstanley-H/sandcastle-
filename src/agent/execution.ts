/**
 * How each plan step is executed, which model it uses, and what it costs.
 * All prices are illustrative demo figures — tune them here in one place.
 */
import type { PlanItem, PlanStep } from './types'

export type Via = PlanStep['via']
export type ModelSize = NonNullable<PlanStep['model']>

export const MODELS: Record<ModelSize, { name: string; short: string }> = {
  small: { name: 'Holo 4 small', short: 'small' },
  large: { name: 'Holo 4 large', short: 'large' },
}

/** USD per unit of work */
export const RATES = {
  /** one on-screen action (click / type / key / open) by a computer-use model */
  action: { small: 0.0011, large: 0.009 } as Record<ModelSize, number>,
  /** one reasoning pass (a `think`) */
  think: { small: 0.0004, large: 0.0045 } as Record<ModelSize, number>,
  /** one API call */
  api: 0.00005,
  /** deterministic code — effectively free */
  code: 0,
  /** fully loaded cost of a person’s minute (≈ $66/h) */
  personMinute: 1.1,
}

export const VIA_STYLE: Record<Via, { label: string; bg: string; fg: string; dot: string }> = {
  api: { label: 'API', bg: '#E5F1FB', fg: '#0B5394', dot: '#2B88D8' },
  code: { label: 'Code', bg: '#E6F4EA', fg: '#0E700E', dot: '#2E9E4F' },
  cua: { label: 'Computer use', bg: '#F1ECF9', fg: '#430693', dot: '#7114EB' },
}

export function viaLabel(s: PlanStep) {
  if (s.via === 'cua') return `${VIA_STYLE.cua.label} · ${MODELS[s.model ?? 'small'].name}`
  return VIA_STYLE[s.via].label
}

/** Plain-string steps are UI-driven by the small computer-use model. */
export function normalizePlan(plan: PlanItem[]): PlanStep[] {
  return plan.map((p) => (typeof p === 'string' ? { text: p, via: 'cua', model: 'small' } : { model: 'small', ...p }))
}

export const stepText = (p: PlanItem | undefined) => (typeof p === 'string' ? p : p?.text)

/** per-step usage counters recorded by the runtime */
export interface StepUsage {
  actions: number
  thinks: number
  apiCalls: number
  ms: number
}
export const emptyUsage = (): StepUsage => ({ actions: 0, thinks: 0, apiCalls: 0, ms: 0 })

export function stepCost(s: PlanStep, u: StepUsage | undefined) {
  if (!u) return 0
  const m = s.model ?? 'small'
  return u.actions * RATES.action[m] + u.thinks * RATES.think[m] + u.apiCalls * RATES.api
}

/** what the same run would cost if every step were done on screen by the large model */
export function allLargeCost(u: StepUsage | undefined) {
  if (!u) return 0
  // an API call or code step replaces roughly 6 on-screen actions
  return (u.actions + u.apiCalls * 6) * RATES.action.large + u.thinks * RATES.think.large
}

export function fmtUsd(n: number) {
  if (n === 0) return '$0'
  if (n < 0.01) return `$${n.toFixed(4)}`
  if (n < 1) return `$${n.toFixed(3)}`
  return `$${n.toFixed(2)}`
}

export function fmtMs(ms: number) {
  return ms < 1000 ? `${Math.max(1, Math.round(ms))}ms` : `${(ms / 1000).toFixed(1)}s`
}
