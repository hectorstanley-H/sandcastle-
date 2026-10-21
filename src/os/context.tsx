import { createContext, useContext, useMemo } from 'react'
import { useWM, wm, type Win, type Toast } from './wm'

export interface DeskCtx {
  deskId: string
  isAgent: boolean
}
export const DeskContext = createContext<DeskCtx>({ deskId: 'main', isAgent: false })
export const WinContext = createContext<Win | null>(null)

/** Desktop-level helpers available to any app. */
export function useDesk() {
  const { deskId, isAgent } = useContext(DeskContext)
  return useMemo(
    () => ({
      deskId,
      isAgent,
      /** open (or focus) an app on this desktop, optionally with deep-link params */
      open: (appId: string, params?: any) => wm().open(deskId, appId, params),
      /** open an app on the user's own desktop (used by the agent window / H-Worker results) */
      openOnMain: (appId: string, params?: any) => wm().open('main', appId, params),
      toast: (t: Omit<Toast, 'id' | 'at'>) => wm().toast(deskId, t),
      closeApp: (appId: string) => wm().closeApp(deskId, appId),
    }),
    [deskId, isAgent],
  )
}

/** Window-level helpers for the app rendering inside it. */
export function useWin() {
  const win = useContext(WinContext)
  const { deskId } = useContext(DeskContext)
  return useMemo(
    () => ({
      win,
      deskId,
      setTitle: (title: string) => win && wm().patch(deskId, win.id, { title }),
      /** update the URL shown in the Edge address bar (browser-frame apps) */
      setUrl: (url: string) => win && wm().patch(deskId, win.id, { url }),
      close: () => win && wm().close(deskId, win.id),
      minimize: () => win && wm().minimize(deskId, win.id),
      toggleMax: () => win && wm().toggleMax(deskId, win.id),
    }),
    [win, deskId],
  )
}

export function useDeskState() {
  const { deskId } = useContext(DeskContext)
  return useWM((s) => s.desks[deskId])
}
