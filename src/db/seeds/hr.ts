/**
 * HR group seed: Workday, Docusign, Greenhouse, Okta (+ extra Outlook mail/events used by HR workflows).
 * Each app keeps its own seed next to its code (src/apps/<app>/seed.ts); this file merges them.
 */
import type { Collections } from '../db'

const PARTS = import.meta.glob('../../apps/{workday,docusign,greenhouse,okta}/seed.ts', { eager: true }) as Record<string, { seed?: () => Collections }>

export function seed(): Collections {
  const out: Collections = {}
  for (const mod of Object.values(PARTS)) {
    const part = mod.seed?.() ?? {}
    for (const [k, v] of Object.entries(part)) out[k] = out[k] ? [...out[k], ...v] : v
  }
  return out
}
