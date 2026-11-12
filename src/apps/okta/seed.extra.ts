/**
 * Extra Okta records (appended to the base seed by src/db/seeds/extras.ts).
 *
 * okta.requests: self-service app access requests { id, userId, appId, reason, status: 'PENDING'|'APPROVED'|'DENIED', requestedAt }
 * These back the "3 pending access requests · Salesforce.com (2), Tableau Cloud (1)" shown on Self Service.
 */
import type { Collections } from '@/db/db'
import { daysAgo, hoursAgo } from '@/data/time'

export function seed(): Collections {
  return {
    'okta.requests': [
      { id: 'okta-req-1', userId: 'okta-u-maya', appId: 'salesforce', reason: 'Need read access to vendor accounts for the Fabrikam renewal.', status: 'PENDING', requestedAt: hoursAgo(20) },
      { id: 'okta-req-2', userId: 'okta-u-ryan', appId: 'salesforce', reason: 'Escalations team now owns case → opportunity handoffs.', status: 'PENDING', requestedAt: daysAgo(1, 15, 10) },
      { id: 'okta-req-3', userId: 'okta-u-emma', appId: 'tableau', reason: 'AP aging dashboard moved to Tableau Cloud.', status: 'PENDING', requestedAt: daysAgo(2, 9, 40) },
    ],
  }
}
