/**
 * Window manager. One "desk" per desktop: the user's desktop is `main`, every agent run gets its
 * own desk (id = run id) rendered inside the agent window.
 */
import { create } from 'zustand'
import { getApp } from './registry'

export interface Win {
  id: string
  appId: string
  x: number
  y: number
  w: number
  h: number
  z: number
  minimized: boolean
  maximized: boolean
  /** arbitrary params passed to the app (deep links). `nonce` changes on every re-open. */
  params: any
  nonce: number
  title?: string
  url?: string
}

export interface Toast {
  id: string
  appId: string
  title: string
  body?: string
  /** optional action to run when clicked */
  action?: { label: string; appId: string; params?: any }
  at: number
}

export interface Desk {
  windows: Win[]
  zTop: number
  activeId?: string
  bounds: { w: number; h: number }
  toasts: Toast[]
  startOpen: boolean
  isAgent: boolean
}

interface WMState {
  desks: Record<string, Desk>
  ensureDesk: (desk: string, isAgent?: boolean, bounds?: { w: number; h: number }) => void
  setBounds: (desk: string, bounds: { w: number; h: number }) => void
  open: (desk: string, appId: string, params?: any, opts?: { maximized?: boolean }) => string
  close: (desk: string, winId: string) => void
  closeApp: (desk: string, appId: string) => void
  focus: (desk: string, winId: string) => void
  minimize: (desk: string, winId: string) => void
  toggleMax: (desk: string, winId: string) => void
  patch: (desk: string, winId: string, patch: Partial<Win>) => void
  setStart: (desk: string, open: boolean) => void
  toast: (desk: string, t: Omit<Toast, 'id' | 'at'>) => void
  dismissToast: (desk: string, id: string) => void
  dropDesk: (desk: string) => void
  resetAll: () => void
}

const newDesk = (isAgent = false, bounds = { w: 1440, h: 852 }): Desk => ({
  windows: [],
  zTop: 10,
  bounds,
  toasts: [],
  startOpen: false,
  isAgent,
})

let winCounter = 0

export const useWM = create<WMState>()((set, get) => {
  const mut = (desk: string, fn: (d: Desk) => Partial<Desk>) =>
    set((s) => {
      const d = s.desks[desk] ?? newDesk()
      return { desks: { ...s.desks, [desk]: { ...d, ...fn(d) } } }
    })
  const mutWin = (desk: string, winId: string, fn: (w: Win, d: Desk) => Partial<Win>) =>
    mut(desk, (d) => ({ windows: d.windows.map((w) => (w.id === winId ? { ...w, ...fn(w, d) } : w)) }))

  return {
    desks: { main: newDesk(false) },
    ensureDesk: (desk, isAgent = false, bounds) => {
      if (!get().desks[desk]) set((s) => ({ desks: { ...s.desks, [desk]: newDesk(isAgent, bounds) } }))
    },
    setBounds: (desk, bounds) => mut(desk, () => ({ bounds })),
    open: (desk, appId, params, opts) => {
      const d = get().desks[desk] ?? newDesk()
      const app = getApp(appId)
      const existing = app?.multi
        ? params?.runId
          ? d.windows.find((w) => w.appId === appId && w.params?.runId === params.runId)
          : undefined
        : d.windows.find((w) => w.appId === appId)
      const z = d.zTop + 1
      if (existing) {
        mut(desk, (dd) => ({
          zTop: z,
          activeId: existing.id,
          startOpen: false,
          windows: dd.windows.map((w) =>
            w.id === existing.id
              ? { ...w, z, minimized: false, params: params ?? w.params, nonce: params ? w.nonce + 1 : w.nonce }
              : w,
          ),
        }))
        return existing.id
      }
      const [dw, dh] = app?.size ?? [1000, 680]
      const bw = d.bounds.w
      const bh = d.bounds.h
      const w = Math.min(dw, bw - 40)
      const h = Math.min(dh, bh - 40)
      const n = d.windows.length % 6
      const x = Math.max(10, Math.round((bw - w) / 2) - 60 + n * 28)
      const y = Math.max(10, Math.round((bh - h) / 2) - 40 + n * 24)
      const id = `win-${++winCounter}`
      const maximized = opts?.maximized ?? (d.isAgent ? app?.agentMaximized !== false : false)
      mut(desk, (dd) => ({
        zTop: z,
        activeId: id,
        startOpen: false,
        windows: [
          ...dd.windows,
          { id, appId, x, y, w, h, z, minimized: false, maximized, params: params ?? {}, nonce: 0 },
        ],
      }))
      return id
    },
    close: (desk, winId) => mut(desk, (d) => ({ windows: d.windows.filter((w) => w.id !== winId) })),
    closeApp: (desk, appId) => mut(desk, (d) => ({ windows: d.windows.filter((w) => w.appId !== appId) })),
    focus: (desk, winId) =>
      mut(desk, (d) => {
        const cur = d.windows.find((w) => w.id === winId)
        if (!cur) return {}
        if (d.activeId === winId && cur.z === d.zTop && !cur.minimized) return {}
        const z = d.zTop + 1
        return {
          zTop: z,
          activeId: winId,
          windows: d.windows.map((w) => (w.id === winId ? { ...w, z, minimized: false } : w)),
        }
      }),
    minimize: (desk, winId) =>
      mut(desk, (d) => ({
        activeId: d.activeId === winId ? undefined : d.activeId,
        windows: d.windows.map((w) => (w.id === winId ? { ...w, minimized: true } : w)),
      })),
    toggleMax: (desk, winId) => mutWin(desk, winId, (w) => ({ maximized: !w.maximized })),
    patch: (desk, winId, patch) => {
      const cur = get().desks[desk]?.windows.find((w) => w.id === winId)
      if (!cur) return
      if (Object.entries(patch).every(([k, v]) => (cur as any)[k] === v)) return
      mutWin(desk, winId, () => patch)
    },
    setStart: (desk, open) => mut(desk, () => ({ startOpen: open })),
    toast: (desk, t) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      mut(desk, (d) => ({ toasts: [...d.toasts.slice(-3), { ...t, id, at: Date.now() }] }))
      setTimeout(() => get().dismissToast(desk, id), t.action ? 25000 : 9000)
    },
    dismissToast: (desk, id) => mut(desk, (d) => ({ toasts: d.toasts.filter((t) => t.id !== id) })),
    dropDesk: (desk) =>
      set((s) => {
        const { [desk]: _, ...rest } = s.desks
        return { desks: rest }
      }),
    resetAll: () => set((s) => ({ desks: { main: { ...newDesk(false), bounds: s.desks.main?.bounds ?? newDesk().bounds } } })),
  }
})

export const wm = () => useWM.getState()
