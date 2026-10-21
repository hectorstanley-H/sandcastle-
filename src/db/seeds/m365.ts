/**
 * Microsoft 365 group seed (Teams, Excel, Word, PowerPoint, Power BI).
 * Each app keeps its own seed in src/apps/<app>/seed.ts exporting a function that returns collections.
 */
import type { Collections } from '../db'

const MODS = import.meta.glob(
  ['../../apps/teams/seed.ts', '../../apps/excel/seed.ts', '../../apps/word/seed.ts', '../../apps/powerpoint/seed.ts', '../../apps/powerbi/seed.ts'],
  { eager: true },
) as Record<string, Record<string, unknown>>

export function seed(): Collections {
  const out: Collections = {}
  for (const mod of Object.values(MODS)) {
    for (const [name, fn] of Object.entries(mod)) {
      if (typeof fn !== 'function' || !/seed$/i.test(name)) continue
      for (const [k, v] of Object.entries((fn as () => Collections)())) out[k] = out[k] ? [...out[k], ...v] : v
    }
  }
  return out
}
