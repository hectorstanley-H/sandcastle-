/**
 * Merges every group's seed. Each group owns its own file. Collections are prefixed with the app id
 * (e.g. `concur.reports`). If two groups contribute to the same collection (e.g. extra `outlook.emails`
 * or `files`), the arrays are concatenated.
 */
import type { Collections } from '../db'
import { seed as core } from './core'
import { seed as m365 } from './m365'
import { seed as finance } from './finance'
import { seed as hr } from './hr'
import { seed as sales } from './sales'
import { seed as hubspot } from './hubspot'
import { seed as it } from './it'
import { seed as system } from './system'

export function buildSeed(): Collections {
  const out: Collections = {}
  for (const part of [core(), m365(), finance(), hr(), sales(), hubspot(), it(), system()]) {
    for (const [k, v] of Object.entries(part)) out[k] = out[k] ? [...out[k], ...v] : v
  }
  return out
}
