/** Extra Slack demo data (appended to the DB seed by src/db/seeds/extras.ts). New collections only. */
import type { Collections } from '@/db/db'
import { daysAgo } from '@/data/time'

export function seed(): Collections {
  return {
    'slack.canvases': [
      {
        id: 'canvas-eng-bugs',
        conv: 'eng-bugs',
        title: '#eng-bugs triage guide',
        text: 'How to report a bug\n1. What happened vs. what you expected\n2. Steps to reproduce (links, screenshots)\n3. Impact — who is blocked, which customers\n\nTriage\n• Reviewed daily at 10:00 ET and filed in Jira OPS\n• Highest: customer-facing outage or data loss\n• High: regression blocking a team\n• Reply in the thread with the OPS key once tracked',
        updated: daysAgo(6, 14, 0),
      },
    ],
  }
}
