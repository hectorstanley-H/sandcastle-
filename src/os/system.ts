import { create } from 'zustand'
import { useDB } from '@/db/db'
import { useWM } from './wm'
import { cancelAllRuns, useRuns } from '@/agent/runs'

interface SystemState {
  locked: boolean
  resetDialog: boolean
  resetting: boolean
}

const skipLock = typeof window !== 'undefined' && (new URLSearchParams(location.search).has('skipLock') || sessionStorage.getItem('hw-unlocked') === '1')

export const useSystem = create<SystemState>()(() => ({ locked: !skipLock, resetDialog: false, resetting: false }))

export const requestReset = () => useSystem.setState({ resetDialog: true })
export const cancelReset = () => useSystem.setState({ resetDialog: false })
export const requestLock = () => {
  try {
    sessionStorage.removeItem('hw-unlocked')
  } catch {}
  useSystem.setState({ locked: true })
}
export const unlock = () => {
  try {
    sessionStorage.setItem('hw-unlocked', '1')
  } catch {}
  useSystem.setState({ locked: false })
}

/** Wipe everything back to the seed: data, windows, agent runs. */
export async function doReset() {
  useSystem.setState({ resetting: true, resetDialog: false })
  cancelAllRuns()
  await new Promise((r) => setTimeout(r, 900))
  useRuns.setState({ runs: {} })
  useWM.getState().resetAll()
  useDB.getState().reset()
  useSystem.setState({ resetting: false })
}
