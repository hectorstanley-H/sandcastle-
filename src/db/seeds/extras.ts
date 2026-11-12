/**
 * Extra per-app seed data: any `src/apps/<app>/seed.extra.ts` exporting `seed(): Collections` is merged in.
 * Records are appended to collections of the same name, so apps can add data without touching shared seed files.
 */
import type { Collections } from '../db'

const MODS = import.meta.glob('../../apps/*/seed.extra.ts', { eager: true }) as Record<string, { seed?: () => Collections }>

export function seed(): Collections {
  const out: Collections = {}
  for (const mod of Object.values(MODS)) {
    for (const [k, v] of Object.entries(mod.seed?.() ?? {})) out[k] = out[k] ? [...out[k], ...v] : v
  }
  return out
}
