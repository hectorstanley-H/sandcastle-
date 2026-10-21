/**
 * The demo "database". Everything lives in one zustand store persisted to
 * localStorage (no backend). Collections are plain arrays of records with an `id`.
 *
 * - Seeds come from src/db/seeds/*.ts (one file per app group) and are merged in seeds/index.ts
 * - Both the user's desktop and every agent desktop read/write this same store, so whatever an
 *   agent does is immediately visible in the user's own apps.
 * - `resetDemo()` wipes everything back to the seed.
 */
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { useShallow } from 'zustand/react/shallow'
import { buildSeed } from './seeds'

export type Rec = { id: string; [k: string]: any }
export type Collections = Record<string, Rec[]>

interface DBState {
  data: Collections
  /** bumps on reset so components holding local state can remount */
  epoch: number
  insert: (col: string, rec: Rec | Rec[], opts?: { prepend?: boolean }) => void
  update: (col: string, id: string, patch: Partial<Rec> | ((r: Rec) => Partial<Rec>)) => void
  upsert: (col: string, rec: Rec) => void
  remove: (col: string, id: string) => void
  setCollection: (col: string, recs: Rec[]) => void
  reset: () => void
}

export const DB_KEY = 'hworker-demo-db-v1'

export const useDB = create<DBState>()(
  persist(
    (set) => ({
      data: buildSeed(),
      epoch: 0,
      insert: (col, rec, opts) =>
        set((s) => {
          const list = s.data[col] ?? []
          const add = Array.isArray(rec) ? rec : [rec]
          return { data: { ...s.data, [col]: opts?.prepend ? [...add, ...list] : [...list, ...add] } }
        }),
      update: (col, id, patch) =>
        set((s) => ({
          data: {
            ...s.data,
            [col]: (s.data[col] ?? []).map((r) =>
              r.id === id ? { ...r, ...(typeof patch === 'function' ? patch(r) : patch) } : r,
            ),
          },
        })),
      upsert: (col, rec) =>
        set((s) => {
          const list = s.data[col] ?? []
          const exists = list.some((r) => r.id === rec.id)
          return {
            data: {
              ...s.data,
              [col]: exists ? list.map((r) => (r.id === rec.id ? { ...r, ...rec } : r)) : [...list, rec],
            },
          }
        }),
      remove: (col, id) =>
        set((s) => ({ data: { ...s.data, [col]: (s.data[col] ?? []).filter((r) => r.id !== id) } })),
      setCollection: (col, recs) => set((s) => ({ data: { ...s.data, [col]: recs } })),
      reset: () => set((s) => ({ data: buildSeed(), epoch: s.epoch + 1 })),
    }),
    {
      name: DB_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ data: s.data, epoch: s.epoch }),
      // if new seed collections were added since the user's cache was written, fill them in
      merge: (persisted: any, current) => {
        const seed = current.data
        const data = { ...seed, ...(persisted?.data ?? {}) }
        return { ...current, ...persisted, data }
      },
    },
  ),
)

const EMPTY: Rec[] = []

/** Subscribe to a whole collection. */
export function useCollection<T extends Rec = Rec>(col: string): T[] {
  return useDB((s) => (s.data[col] ?? EMPTY) as T[])
}

/** Subscribe to one record. */
export function useRecord<T extends Rec = Rec>(col: string, id: string | undefined | null): T | undefined {
  return useDB((s) => (id ? (s.data[col] ?? EMPTY).find((r) => r.id === id) : undefined) as T | undefined)
}

/** Filtered subscription (shallow compared). */
export function useWhere<T extends Rec = Rec>(col: string, pred: (r: T) => boolean): T[] {
  return useDB(useShallow((s) => ((s.data[col] ?? EMPTY) as T[]).filter(pred)))
}

/** Imperative access (outside React, e.g. in workflows). */
export const db = {
  get: <T extends Rec = Rec>(col: string): T[] => (useDB.getState().data[col] ?? EMPTY) as T[],
  find: <T extends Rec = Rec>(col: string, id: string): T | undefined =>
    (useDB.getState().data[col] ?? EMPTY).find((r) => r.id === id) as T | undefined,
  insert: (col: string, rec: Rec | Rec[], opts?: { prepend?: boolean }) => useDB.getState().insert(col, rec, opts),
  update: (col: string, id: string, patch: Partial<Rec> | ((r: Rec) => Partial<Rec>)) =>
    useDB.getState().update(col, id, patch),
  upsert: (col: string, rec: Rec) => useDB.getState().upsert(col, rec),
  remove: (col: string, id: string) => useDB.getState().remove(col, id),
}

let counter = 0
/** Short unique id with optional prefix. */
export function uid(prefix = 'id') {
  counter = (counter + 1) % 1e6
  return `${prefix}-${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 5)}`
}
