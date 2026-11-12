/** Extra Outlook demo data (appended to the DB seed by src/db/seeds/extras.ts). New collections only. */
import type { Collections } from '@/db/db'
import { daysAgo, hoursAgo } from '@/data/time'

export function seed(): Collections {
  return {
    'outlook.tasks': [
      { id: 'task-peak-staffing', title: 'Finalize peak-season staffing plan for Columbus and Reno', createdAt: daysAgo(1, 9, 10), important: true },
      { id: 'task-xpo-claim', title: 'Follow up with XPO on the carrier claim (Atlanta linehaul)', createdAt: hoursAgo(5), list: 'myday' },
      { id: 'task-q3-deck', title: 'Review Q3 Operations Review deck before Thursday', createdAt: daysAgo(2, 15, 0) },
      { id: 'task-badge-printer', title: 'Confirm Reno badge printer fix (INC0012931)', createdAt: daysAgo(3, 11, 30), done: true },
    ],
  }
}
