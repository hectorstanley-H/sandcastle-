/** Extra Teams demo data (appended to the DB seed by src/db/seeds/extras.ts). New collections only. */
import type { Collections } from '@/db/db'
import { daysAgo } from '@/data/time'

export function seed(): Collections {
  return {
    'teams.notes': [
      {
        id: 'note-operations-team',
        text: 'Daily stand-up — running notes\n\n• Fulfillment: on-time %, backorders, Atlanta DC trend\n• Warehouse & labor: seasonal hiring (Columbus Nov 3, Reno Nov 10)\n• Vendors: Fabrikam credit memo, XPO claim\n• Blockers / asks\n\nOwners rotate weekly — Ben (this week), Maya (next week).',
        updated: daysAgo(1, 9, 30),
      },
    ],
  }
}
