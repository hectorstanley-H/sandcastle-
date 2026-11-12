/** Extra Tableau demo data (appended to the DB seed). Only new collections. */
import type { Collections } from '@/db/db'

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString()

export function seed(): Collections {
  return {
    'tableau.collections': [
      { id: 'col-sales-leadership', name: 'Sales Leadership Pack', description: 'Everything Rachel reviews in the Thursday leadership sync.', owner: 'rachel', items: ['wb-pipeline', 'wb-forecast', 'wb-winloss'], createdAt: hoursAgo(24 * 20) },
      { id: 'col-cs-weekly', name: 'Customer Success Weekly', description: 'Health scores, renewals and support SLAs.', owner: 'aisha', items: ['wb-cs', 'wb-ops'], createdAt: hoursAgo(24 * 9) },
    ],
    'tableau.pulseFollows': [
      { id: 'open-pipeline', at: hoursAgo(24 * 30) },
      { id: 'bookings-qtd', at: hoursAgo(24 * 30) },
      { id: 'win-rate', at: hoursAgo(24 * 30) },
    ],
    'tableau.comments': [
      { id: 'cm-seed-1', wbId: 'wb-pipeline', sheet: 'Pipeline Overview', authorId: 'rachel', body: 'Can we get the Best Case deals into Commit before Thursday? EMEA looks light this quarter.', date: hoursAgo(26) },
    ],
  }
}
