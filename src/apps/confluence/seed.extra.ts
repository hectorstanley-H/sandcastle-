/**
 * Extra Confluence data (new collection, so it also appears for users with an existing cache):
 * confluence.blogs — blog posts in the Operations space { id, space, title, body, author, created, updated, likes[], comments[] }
 */
import type { Collections } from '@/db/db'
import { daysAgo } from '@/data/time'

export function seed(): Collections {
  return {
    'confluence.blogs': [
      {
        id: 'blog-sso', space: 'OPS', title: 'Vendor portal now enforces Okta MFA for admins', author: 'chen', created: daysAgo(4, 11), updated: daysAgo(4, 11), likes: ['tom', 'priya', 'maya'], comments: [],
        body: `Starting this sprint, every vendor portal **admin** role requires Okta MFA at sign-in.\n\n:::info\nVendors with standard (non-admin) roles are not affected.\n:::\n## What changes for you\n- Admins are prompted to enrol Okta Verify on next login\n- Support can reset a lost factor after an identity check\n\nTracked in OPS-116.`,
      },
      {
        id: 'blog-dashboard', space: 'OPS', title: 'Warehouse dashboard v2: what’s new', author: 'tom', created: daysAgo(9, 15), updated: daysAgo(8, 9), likes: ['alex', 'ben'], comments: [],
        body: `The second version of the warehouse dashboard is rolling out.\n\n## Highlights\n- Shipments by region with drill-down\n- Carrier on-time performance (last 90 days)\n- Dock schedule now in local time\n\nFeedback welcome in #ops-team!`,
      },
      {
        id: 'blog-oncall', space: 'OPS', title: 'New on-call rotation for Q4', author: 'priya', created: daysAgo(16, 10), updated: daysAgo(16, 10), likes: ['alex'], comments: [],
        body: `We’re moving to a weekly on-call rotation for the Operations Platform.\n\n| Week | Primary | Secondary |\n| --- | --- | --- |\n| 1 | Chen Wei | Tom Fischer |\n| 2 | Ryan Tanaka | Maya Johnson |\n| 3 | Ben Carter | Chen Wei |\n\nSee [Runbooks](pg-runbooks) for the escalation steps.`,
      },
    ],
  }
}
