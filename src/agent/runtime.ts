/**
 * The agent runtime: executes a Workflow against a real (scaled) desktop by moving a virtual
 * cursor, clicking real DOM elements and typing into real inputs. Apps don't know they are being
 * driven by an agent — they just receive normal DOM events.
 */
import { db, uid } from '@/db/db'
import { getApp } from '@/os/registry'
import { wm } from '@/os/wm'
import { TASKBAR_H } from '@/os/Taskbar'
import { getWorkflow } from '@/workflows'
import { cancelFlags, runs, useRuns, type Run } from './runs'
import type { ActOpts, AgentAPI, Target, WorkflowResult } from './types'

export const AGENT_SCREEN = { w: 1440, h: 900 }

class Cancelled extends Error {}

const DEBUG = typeof window !== 'undefined' && new URLSearchParams(location.search).has('debug')
const hwlog = (...a: any[]) => {
  // structured console output used by scripts/run-workflow.mjs (headless test harness)
  console.log('[HW]', ...a)
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function rootOf(id: string) {
  return document.querySelector(`[data-desk="${id}"]`) as HTMLElement | null
}

function isVisible(el: HTMLElement) {
  if (!el.isConnected) return false
  const rects = el.getClientRects()
  if (!rects.length) return false
  const r = rects[0]
  return r.width > 0 && r.height > 0
}

const CLICKABLE = 'button, a, [role=button], [role=menuitem], [role=tab], [role=option], [role=row], [role=link], [role=treeitem], [role=checkbox], li, td, th, label, summary, [data-agent]'

function resolve(root: HTMLElement, target: Target): HTMLElement[] {
  let els: HTMLElement[]
  if (target.startsWith('@')) {
    els = Array.from(root.querySelectorAll<HTMLElement>(`[data-agent="${CSS.escape(target.slice(1))}"]`))
  } else if (target.startsWith('text=')) {
    const txt = target.slice(5).trim().toLowerCase()
    const all = Array.from(root.querySelectorAll<HTMLElement>(CLICKABLE)).filter(
      (e) => (e.textContent ?? '').replace(/\s+/g, ' ').trim().toLowerCase() === txt,
    )
    // prefer the innermost match
    els = all.filter((e) => !all.some((o) => o !== e && e.contains(o)))
  } else {
    els = Array.from(root.querySelectorAll<HTMLElement>(target))
  }
  const vis = els.filter((e) => isVisible(e) && (e.closest('[data-win]') as HTMLElement | null)?.dataset.minimized !== 'true')
  // prefer elements in the top-most window
  const zOf = (e: HTMLElement) => {
    const w = e.closest('[data-win]') as HTMLElement | null
    return w ? Number(w.style.zIndex || 0) : 100000
  }
  return vis.sort((a, b) => zOf(b) - zOf(a))
}

function labelOf(el: HTMLElement) {
  const aria = el.getAttribute('aria-label') || el.getAttribute('title')
  if (aria) return aria
  const ph = (el as HTMLInputElement).placeholder
  const txt = (el.textContent ?? '').replace(/\s+/g, ' ').trim()
  if (txt) return txt.length > 48 ? txt.slice(0, 46) + '…' : txt
  if (ph) return ph
  return el.getAttribute('data-agent') ?? el.tagName.toLowerCase()
}

function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string) {
  const proto =
    el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')!.set!
  setter.call(el, value)
}

/** scroll every scrollable ancestor (inside the desk) so that el is visible */
async function bringIntoView(el: HTMLElement, root: HTMLElement) {
  let node = el.parentElement
  let scrolled = false
  while (node && node !== root) {
    const cs = getComputedStyle(node)
    const canY = /(auto|scroll)/.test(cs.overflowY) && node.scrollHeight > node.clientHeight + 1
    const canX = /(auto|scroll)/.test(cs.overflowX) && node.scrollWidth > node.clientWidth + 1
    if (canY || canX) {
      const nr = node.getBoundingClientRect()
      const er = el.getBoundingClientRect()
      const scale = root.getBoundingClientRect().width / root.offsetWidth || 1
      if (canY && (er.top < nr.top + 4 || er.bottom > nr.bottom - 4)) {
        const delta = (er.top - nr.top - nr.height / 2 + er.height / 2) / scale
        node.scrollTo({ top: node.scrollTop + delta, behavior: 'smooth' })
        scrolled = true
      }
      if (canX && (er.left < nr.left || er.right > nr.right)) {
        const delta = (er.left - nr.left - nr.width / 2 + er.width / 2) / scale
        node.scrollTo({ left: node.scrollLeft + delta, behavior: 'smooth' })
        scrolled = true
      }
    }
    node = node.parentElement
  }
  if (scrolled) await sleep(380)
}

function pointOf(el: HTMLElement, root: HTMLElement) {
  const rr = root.getBoundingClientRect()
  const scale = rr.width / root.offsetWidth || 1
  const r = el.getBoundingClientRect()
  const isField = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement
  const x = isField ? r.left + Math.min(r.width / 2, 60) : r.left + r.width / 2
  const y = isField && el instanceof HTMLTextAreaElement ? r.top + Math.min(r.height / 2, 18) : r.top + r.height / 2
  return { x: (x - rr.left) / scale, y: (y - rr.top) / scale }
}

function fire(el: HTMLElement, type: string, init: any = {}) {
  const opts = { bubbles: true, cancelable: true, composed: true, view: window, button: 0, ...init }
  const ev = type.startsWith('pointer')
    ? new PointerEvent(type, { pointerId: 1, pointerType: 'mouse', isPrimary: true, ...opts })
    : type.startsWith('key')
      ? new KeyboardEvent(type, opts)
      : new MouseEvent(type, opts)
  el.dispatchEvent(ev)
}

export function createAgent(runId: string, inputs: Record<string, any>): AgentAPI {
  let lastTyped: HTMLElement | null = null
  const run = () => useRuns.getState().runs[runId] as Run
  const speed = () => run()?.speed ?? 1
  const root = () => {
    const r = rootOf(runId)
    if (!r) throw new Error('Agent desktop not mounted')
    return r
  }
  /** wait (up to 6s) for the agent desktop to be mounted, e.g. after the agent window was re-rendered */
  const ensureRoot = async () => {
    const t0 = Date.now()
    while (!rootOf(runId)) {
      if (cancelFlags.has(runId)) throw new Cancelled()
      if (Date.now() - t0 > 6000) throw new Error('Agent desktop not mounted')
      await sleep(100)
    }
  }

  const gate = async () => {
    for (;;) {
      if (cancelFlags.has(runId)) throw new Cancelled()
      if (run()?.status !== 'paused') return
      await sleep(120)
    }
  }
  const delay = async (ms: number) => {
    let left = ms / speed()
    while (left > 0) {
      await gate()
      const step = Math.min(left, 100)
      await sleep(step)
      left -= step
    }
    await gate()
  }

  const moveTo = async (x: number, y: number) => {
    await gate()
    const c = run().cursor
    const dist = Math.hypot(x - c.x, y - c.y)
    const dur = Math.round(Math.min(900, Math.max(220, 180 + dist * 0.55)) / speed())
    runs().patch(runId, (r) => ({ cursor: { ...r.cursor, x, y, dur, visible: true } }))
    await sleep(dur + 30)
  }

  const find = async (target: Target, opts?: ActOpts): Promise<HTMLElement> => {
    const timeout = opts?.timeout ?? 8000
    const t0 = Date.now()
    for (;;) {
      await gate()
      await ensureRoot()
      const els = resolve(root(), target)
      const el = els[opts?.index ?? 0]
      if (el) return el
      if (Date.now() - t0 > timeout) throw new Error(`Could not find ${target} on screen`)
      await sleep(100)
    }
  }

  const activeAppOf = (el: HTMLElement) => {
    const w = el.closest('[data-win-app]') as HTMLElement | null
    const appId = w?.getAttribute('data-win-app') ?? undefined
    if (appId && appId !== run().activeApp) runs().patch(runId, { activeApp: appId })
    return appId
  }

  const action = (text: string, appId?: string) => {
    runs().addLog(runId, { kind: 'action', text, appId })
    if (DEBUG) hwlog('action', text)
  }

  const clickEl = async (el: HTMLElement, double = false) => {
    const r = root()
    await bringIntoView(el, r)
    const p = pointOf(el, r)
    await moveTo(p.x, p.y)
    await delay(90)
    if (!el.isConnected) return
    runs().patch(runId, (rr) => ({ cursor: { ...rr.cursor, clicks: rr.cursor.clicks + 1 } }))
    fire(el, 'pointerover')
    fire(el, 'mouseover')
    fire(el, 'pointerdown')
    fire(el, 'mousedown')
    fire(el, 'pointerup')
    fire(el, 'mouseup')
    el.click()
    if (double) {
      fire(el, 'mousedown', { detail: 2 })
      fire(el, 'mouseup', { detail: 2 })
      el.click()
      fire(el, 'dblclick', { detail: 2 })
    }
    await delay(260)
  }

  const api: AgentAPI = {
    id: runId,
    inputs,
    db,
    async think(text, ms = 1100) {
      await gate()
      runs().addLog(runId, { kind: 'think', text })
      if (DEBUG) hwlog('think', text)
      await delay(ms)
    },
    log(text, kind = 'info') {
      runs().addLog(runId, { kind, text })
      if (DEBUG) hwlog(kind, text)
    },
    step(i) {
      const r = run()
      if (!r) return
      runs().patch(runId, { planIndex: i })
      runs().addLog(runId, { kind: 'step', text: r.plan[i] ?? `Step ${i + 1}` })
      hwlog('step', i, r.plan[i])
    },
    async open(appId, params) {
      await gate()
      await ensureRoot()
      const app = getApp(appId)
      const desk = wm().desks[runId]
      const existing = desk?.windows.find((w) => w.appId === appId)
      if (existing) {
        await api.focus(appId)
      } else if (resolve(root(), `@taskbar-app-${appId}`).length) {
        const el = await find(`@taskbar-app-${appId}`)
        await clickEl(el)
        runs().addLog(runId, { kind: 'open', text: `Open ${app?.name ?? appId}`, appId })
      } else {
        await clickEl(await find('@taskbar-start'))
        await delay(250)
        const input = (await find('@start-search')) as HTMLInputElement
        await typeInto(input, app?.name ?? appId, { fast: true, clear: true })
        await delay(250)
        await clickEl(await find(`@start-result-${appId}`))
        runs().addLog(runId, { kind: 'open', text: `Search Start for “${app?.name}” and open it`, appId })
      }
      if (params) wm().open(runId, appId, params)
      await find(`[data-win-app="${appId}"]`, { timeout: 10000 })
      runs().patch(runId, { activeApp: appId })
      // let lazy chunks + app splash settle
      await delay(700)
      hwlog('open', appId)
    },
    async focus(appId) {
      const desk = wm().desks[runId]
      const w = desk?.windows.find((x) => x.appId === appId)
      if (!w) return api.open(appId)
      if (desk.activeId === w.id && !w.minimized) return
      const tb = resolve(root(), `@taskbar-app-${appId}`)[0]
      if (tb) await clickEl(tb)
      if (wm().desks[runId]?.activeId !== w.id) wm().focus(runId, w.id)
      runs().patch(runId, { activeApp: appId })
      runs().addLog(runId, { kind: 'open', text: `Switch to ${getApp(appId)?.name ?? appId}`, appId })
      await delay(250)
    },
    async click(target, opts) {
      const el = await find(target, opts)
      const label = opts?.label ?? labelOf(el)
      action(`Click “${label}”`, activeAppOf(el))
      await clickEl(el)
    },
    async doubleClick(target, opts) {
      const el = await find(target, opts)
      action(`Double-click “${opts?.label ?? labelOf(el)}”`, activeAppOf(el))
      await clickEl(el, true)
    },
    async hover(target, opts) {
      const el = await find(target, opts)
      const r = root()
      await bringIntoView(el, r)
      const p = pointOf(el, r)
      await moveTo(p.x, p.y)
      fire(el, 'pointerover')
      fire(el, 'mouseover')
      fire(el, 'pointerenter', { bubbles: false })
      fire(el, 'mouseenter', { bubbles: false })
      await delay(200)
    },
    async type(target, text, opts) {
      const el = (await find(target, opts)) as HTMLInputElement
      const label = opts?.label ?? (el.getAttribute('aria-label') || el.placeholder || labelOf(el))
      const short = text.length > 60 ? text.slice(0, 58).replace(/\n/g, ' ') + '…' : text.replace(/\n/g, ' ')
      action(`Type “${short}”${label ? ` in ${label}` : ''}`, activeAppOf(el))
      await typeInto(el, text, opts)
    },
    async select(target, value, opts) {
      const el = (await find(target, opts)) as HTMLSelectElement
      await clickEl(el)
      setNativeValue(el, value)
      el.dispatchEvent(new Event('change', { bubbles: true }))
      const optText = Array.from(el.options ?? []).find((o) => o.value === value)?.text ?? value
      action(`Select “${optText}”${opts?.label ? ` for ${opts.label}` : ''}`, activeAppOf(el))
      await delay(200)
    },
    async press(key, target) {
      await gate()
      const el = target ? await find(target) : lastTyped ?? (root().querySelector(':focus') as HTMLElement) ?? root()
      fire(el, 'keydown', { key, code: key })
      fire(el, 'keyup', { key, code: key })
      if (key === 'Enter' && el instanceof HTMLInputElement && el.form) el.form.requestSubmit()
      action(`Press ${key}`, activeAppOf(el))
      await delay(220)
    },
    async scrollTo(target, opts) {
      const el = await find(target, opts)
      const r = root()
      await bringIntoView(el, r)
      const p = pointOf(el, r)
      await moveTo(p.x, p.y)
    },
    waitFor: (target, timeout) => find(target, { timeout }),
    exists: (target) => resolve(root(), target).length > 0,
    query: (target) => resolve(root(), target),
    text: (target) => (resolve(root(), target)[0]?.textContent ?? '').trim(),
    wait: (ms) => delay(ms),
    async approve(question, detail) {
      await gate()
      const prefs = db.find<any>('hworker.settings', 'prefs')
      if (!prefs?.confirmExternal) return true
      runs().patch(runId, { status: 'awaiting', approval: { question, detail } })
      runs().addLog(runId, { kind: 'warn', text: `Waiting for your approval: ${question}` })
      hwlog('awaiting', question)
      wm().toast('main', { appId: 'hworker', title: `${run().name} needs your approval`, body: question, action: { label: 'Review', appId: 'agent', params: { runId } } })
      for (;;) {
        if (cancelFlags.has(runId)) throw new Cancelled()
        const a = run()?.approval
        if (a && a.answer !== undefined) {
          runs().patch(runId, { status: 'running', approval: undefined })
          runs().addLog(runId, { kind: a.answer ? 'success' : 'warn', text: a.answer ? 'Approved by Alex Morgan' : 'Rejected by Alex Morgan' })
          if (!a.answer) throw new Cancelled()
          return true
        }
        await sleep(150)
      }
    },
    async close(appId) {
      const el = resolve(root(), `@close-${appId}`)[0]
      if (el) {
        action(`Close ${getApp(appId)?.name ?? appId}`, appId)
        await clickEl(el)
      } else wm().closeApp(runId, appId)
    },
  }

  async function typeInto(el: HTMLInputElement | HTMLTextAreaElement, text: string, opts?: { clear?: boolean; fast?: boolean }) {
    await clickEl(el)
    lastTyped = el
    if (el.isContentEditable) {
      if (opts?.clear) el.textContent = ''
    }
    // inputs marked data-agent-insert="start" (e.g. reply bodies above a quoted thread) get text inserted at the top
    const insertAtStart = el.dataset?.agentInsert === 'start' && !opts?.clear
    const suffix = insertAtStart ? (el.value ?? '') : ''
    let value = opts?.clear || insertAtStart ? '' : (el.value ?? '')
    if (opts?.clear && !el.isContentEditable) {
      setNativeValue(el, '')
      el.dispatchEvent(new Event('input', { bubbles: true }))
    }
    if (el instanceof HTMLInputElement && ['date', 'time', 'datetime-local', 'month', 'color'].includes(el.type)) {
      setNativeValue(el, text)
      el.dispatchEvent(new Event('input', { bubbles: true }))
      el.dispatchEvent(new Event('change', { bubbles: true }))
      await delay(300)
      return
    }
    runs().patch(runId, (r) => ({ cursor: { ...r.cursor, typing: true } }))
    const chunk = text.length > 220 ? 4 : text.length > 90 ? 2 : 1
    const base = opts?.fast ? 14 : 30
    for (let i = 0; i < text.length; i += chunk) {
      await gate()
      const part = text.slice(i, i + chunk)
      value += part
      if (el.isContentEditable) {
        el.textContent = value + suffix
      } else {
        setNativeValue(el, value + suffix)
        if (insertAtStart) el.setSelectionRange?.(value.length, value.length)
      }
      el.dispatchEvent(new InputEvent('input', { bubbles: true, data: part, inputType: 'insertText' }))
      if (el instanceof HTMLTextAreaElement && !insertAtStart) el.scrollTop = el.scrollHeight
      await sleep((base + Math.random() * base * 0.8) / speed())
    }
    runs().patch(runId, (r) => ({ cursor: { ...r.cursor, typing: false } }))
    await delay(120)
  }

  return api
}

let agentCounter = 0

/** Start a workflow on a fresh agent desktop. Returns the run id. */
export function startRun(workflowId: string, inputs: Record<string, any> = {}, opts?: { prompt?: string; speed?: number }) {
  const wf = getWorkflow(workflowId)
  if (!wf) throw new Error(`Unknown workflow ${workflowId}`)
  const id = uid('run')
  const n = ++agentCounter + db.get('hworker.runs').length
  const merged = { ...Object.fromEntries((wf.inputs ?? []).map((f) => [f.key, f.default])), ...inputs }
  const urlSpeed = Number(new URLSearchParams(location.search).get('speed')) || undefined
  const run: Run = {
    id,
    name: `Agent ${String(n).padStart(2, '0')}`,
    workflowId,
    title: wf.title,
    prompt: opts?.prompt,
    inputs: merged,
    status: 'booting',
    speed: opts?.speed ?? urlSpeed ?? 1,
    plan: wf.plan,
    planIndex: -1,
    log: [],
    cursor: { x: AGENT_SCREEN.w / 2, y: AGENT_SCREEN.h / 2 - 40, dur: 0, clicks: 0, visible: false, typing: false },
    startedAt: Date.now(),
  }
  useRuns.setState((s) => ({ runs: { ...s.runs, [id]: run } }))
  wm().ensureDesk(id, true, { w: AGENT_SCREEN.w, h: AGENT_SCREEN.h - TASKBAR_H })
  wm().open('main', 'agent', { runId: id })
  hwlog('start', workflowId, id)

  const agent = createAgent(id, merged)
  ;(async () => {
    try {
      runs().addLog(id, { kind: 'info', text: 'Provisioning secure workspace…' })
      await sleep(1400 / run.speed)
      runs().addLog(id, { kind: 'info', text: 'Signed in as Alex Morgan via Okta SSO' })
      runs().patch(id, { status: 'running' })
      await sleep(600 / run.speed)
      const result: WorkflowResult = await wf.run(agent, merged)
      runs().patch(id, { status: 'done', endedAt: Date.now(), result, planIndex: wf.plan.length, cursor: { ...useRuns.getState().runs[id].cursor, typing: false } })
      runs().addLog(id, { kind: 'success', text: 'Task complete' })
      hwlog('done', workflowId, JSON.stringify(result.summary))
      wm().toast('main', {
        appId: 'hworker',
        title: `${run.name} finished: ${wf.title}`,
        body: result.summary,
        action: { label: 'Review result', appId: 'hworker', params: { view: 'activity', runId: id } },
      })
    } catch (e: any) {
      if (e instanceof Cancelled || cancelFlags.has(id)) {
        runs().patch(id, { status: 'cancelled', endedAt: Date.now() })
        runs().addLog(id, { kind: 'warn', text: 'Stopped by user' })
        hwlog('cancelled', workflowId)
      } else {
        console.error(e)
        runs().patch(id, { status: 'failed', endedAt: Date.now(), error: String(e?.message ?? e) })
        runs().addLog(id, { kind: 'error', text: String(e?.message ?? e) })
        hwlog('error', workflowId, String(e?.message ?? e))
      }
    } finally {
      const r = useRuns.getState().runs[id]
      if (r) {
        db.upsert('hworker.runs', {
          id,
          name: r.name,
          workflowId,
          title: r.title,
          prompt: r.prompt,
          inputs: r.inputs,
          status: r.status,
          startedAt: new Date(r.startedAt).toISOString(),
          endedAt: new Date(r.endedAt ?? Date.now()).toISOString(),
          result: r.result,
          error: r.error,
          actions: r.log.filter((l) => l.kind === 'action' || l.kind === 'open').length,
          apps: Array.from(new Set(r.log.map((l) => l.appId).filter(Boolean))),
          log: r.log.slice(-400),
        })
      }
    }
  })()
  return id
}

if (typeof window !== 'undefined') {
  ;(window as any).__hw = { startRun, runs: () => useRuns.getState().runs }
}
