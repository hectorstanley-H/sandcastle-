import type { db } from '@/db/db'

export type Category =
  | 'Finance'
  | 'Procurement'
  | 'HR'
  | 'Sales'
  | 'Marketing'
  | 'IT'
  | 'Support'
  | 'Engineering'
  | 'Operations'
  | 'Communication'
  | 'Legal'

export interface WorkflowInputField {
  key: string
  label: string
  type: 'text' | 'textarea' | 'select' | 'number' | 'date'
  options?: { value: string; label: string }[]
  default?: string | number
  placeholder?: string
  help?: string
}

/** A link shown on the finished run that opens the result in the user's own app. */
export interface WorkflowOutput {
  label: string
  appId: string
  params?: any
  description?: string
}

export interface WorkflowResult {
  summary: string
  outputs: WorkflowOutput[]
  metrics?: { label: string; value: string }[]
}

export interface Workflow {
  id: string
  title: string
  /** one-line description shown on cards */
  description: string
  category: Category
  /** app ids used, in order of appearance */
  apps: string[]
  /** e.g. "45 min" — human time this replaces */
  timeSaved: string
  /** for free-text prompt matching */
  keywords: string[]
  /** example natural-language prompts that should map to this workflow */
  examples?: string[]
  inputs?: WorkflowInputField[]
  /** high-level plan shown as a checklist; `agent.step(i)` advances it */
  plan: string[]
  run: (agent: AgentAPI, inputs: Record<string, any>) => Promise<WorkflowResult>
  featured?: boolean
  /**
   * Optional contextual nudge for the H-Worker home screen, computed from current data,
   * e.g. "4 receipts in your inbox haven't been expensed". Return null when not relevant.
   */
  nudge?: () => string | null
}

export interface ActOpts {
  /** human label for the activity log, e.g. 'New mail'. Auto-derived from the element if omitted. */
  label?: string
  /** pick the nth match when the selector matches several elements */
  index?: number
  /** ms to wait for the element to appear (default 8000) */
  timeout?: number
}

/**
 * Target syntax:
 *  - '@name'          → [data-agent="name"]
 *  - 'text=Submit'    → first visible button/link/role=button/menuitem/tab whose text is exactly "Submit"
 *  - anything else    → CSS selector
 * All lookups are scoped to the agent's own desktop.
 */
export type Target = string

export interface AgentAPI {
  /** run id == the agent's desk id */
  readonly id: string
  /** shows a reasoning line in the activity feed (and pauses briefly) */
  think(text: string, ms?: number): Promise<void>
  /** activity feed line without delay */
  log(text: string, kind?: 'info' | 'success' | 'warn'): void
  /** mark plan item i as in-progress (all previous become done) */
  step(i: number): void
  /** open an app the way a person would (taskbar icon, or Start → search) and wait for its window */
  open(appId: string, params?: any): Promise<void>
  /** bring an already open app to front via its taskbar button */
  focus(appId: string): Promise<void>
  click(target: Target, opts?: ActOpts): Promise<void>
  doubleClick(target: Target, opts?: ActOpts): Promise<void>
  hover(target: Target, opts?: ActOpts): Promise<void>
  /** click into an input/textarea and type text character by character (React-safe) */
  type(target: Target, text: string, opts?: ActOpts & { clear?: boolean; fast?: boolean }): Promise<void>
  /** set a <select> value */
  select(target: Target, value: string, opts?: ActOpts): Promise<void>
  /** press a key on the focused element (or target) — Enter, Tab, Escape, ArrowDown… */
  press(key: string, target?: Target): Promise<void>
  /** scroll a target into view (moves cursor there) */
  scrollTo(target: Target, opts?: ActOpts): Promise<void>
  waitFor(target: Target, timeout?: number): Promise<HTMLElement>
  exists(target: Target): boolean
  query(target: Target): HTMLElement[]
  text(target: Target): string
  wait(ms: number): Promise<void>
  /** close the app window via its ✕ button */
  close(appId: string): Promise<void>
  /** direct data access when UI-driving isn't practical (use sparingly) */
  db: typeof db
  inputs: Record<string, any>
}
