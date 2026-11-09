/** Which runs are shown as tiles in H-Worker › Cloud agents, and which one is expanded. */
import { create } from 'zustand'

interface CloudState {
  ids: string[]
  focus?: string
  /** bumped to ask H-Worker to switch to the Cloud agents tab */
  nonce: number
  add: (ids: string[]) => void
  setFocus: (id?: string) => void
  remove: (ids: string[]) => void
}

export const useCloud = create<CloudState>()((set) => ({
  ids: [],
  nonce: 0,
  add: (ids) => set((s) => ({ ids: [...s.ids, ...ids] })),
  setFocus: (focus) => set({ focus }),
  remove: (ids) => set((s) => ({ ids: s.ids.filter((x) => !ids.includes(x)), focus: s.focus && ids.includes(s.focus) ? undefined : s.focus })),
}))

export function focusCloudAgent(id: string) {
  useCloud.setState((s) => ({ focus: id, nonce: s.nonce + 1 }))
}
