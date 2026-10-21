/**
 * Merges every group's seed. Each group owns its own file and its own collection names
 * (prefix collections with the app id, e.g. `concur.reports`, `sap.invoices`).
 */
import type { Collections } from '../db'
import { seed as core } from './core'
import { seed as m365 } from './m365'
import { seed as finance } from './finance'
import { seed as hr } from './hr'
import { seed as sales } from './sales'
import { seed as it } from './it'

export function buildSeed(): Collections {
  return { ...core(), ...m365(), ...finance(), ...hr(), ...sales(), ...it() }
}
