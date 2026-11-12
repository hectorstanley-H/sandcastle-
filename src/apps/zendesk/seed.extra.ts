/**
 * Extra Zendesk data (new collection, so it also appears for users with an existing cache):
 * zendesk.articles — Help Center (Guide) articles { id, title, section, body, author, updated, views, votes }
 */
import type { Collections } from '@/db/db'
import { daysAgo } from '@/data/time'

export function seed(): Collections {
  return {
    'zendesk.articles': [
      { id: 'art-reset', title: 'Resetting your password', section: 'Account & login', author: 'ryan', updated: daysAgo(12), views: 4210, votes: 188, body: 'Click **Forgot password** on the sign-in page and enter your work email. The reset link is valid for 60 minutes and can only be used once.\n\nIf your company uses an email security scanner (for example Outlook Safe Links), copy the link and paste it into a private browser window.' },
      { id: 'art-allowlist', title: 'Our emails are not arriving — allow-list our domains', section: 'Account & login', author: 'ryan', updated: daysAgo(30), views: 1290, votes: 64, body: 'Ask your IT team to allow-list **notifications@northwind.com** and **support@northwind.com**, and to exclude them from link rewriting.' },
      { id: 'art-2fa', title: 'Lost access to your two-factor authentication device', section: 'Account & login', author: 'aisha', updated: daysAgo(20), views: 980, votes: 41, body: 'For your security we verify your identity before removing 2FA: reply from your account email with your company name, the last 4 digits of the card on file and a photo ID. Once verified we disable 2FA so you can enrol a new device.' },
      { id: 'art-invoice', title: 'Download invoices and receipts', section: 'Billing & invoices', author: 'aisha', updated: daysAgo(8), views: 2650, votes: 97, body: 'Go to **Settings › Billing › Invoices** to download any invoice as PDF. Account owners can add a billing contact so invoices are also emailed to accounts payable.' },
      { id: 'art-proration', title: 'How plan changes are prorated', section: 'Billing & invoices', author: 'aisha', updated: daysAgo(45), views: 760, votes: 22, body: 'Upgrades and downgrades take effect immediately and are prorated to the day. Credits for downgrades are applied to your next invoice, or refunded to the card on request.' },
      { id: 'art-duplicate', title: 'I was charged twice', section: 'Billing & invoices', author: 'aisha', updated: daysAgo(15), views: 540, votes: 30, body: 'Duplicate card charges are usually a pending authorization that drops off within 3–5 business days. If both charges settle, contact us and we will refund the duplicate.' },
      { id: 'art-tracking', title: 'Understanding shipment tracking and ETAs', section: 'Shipments', author: 'ryan', updated: daysAgo(10), views: 3380, votes: 120, body: 'ETAs are recalculated every 30 minutes from carrier scans. If an ETA looks wrong, check the latest carrier event on the shipment page.' },
      { id: 'art-damage', title: 'Report damaged or missing items', section: 'Shipments', author: 'ryan', updated: daysAgo(60), views: 690, votes: 18, body: 'Report damage within 7 days of delivery with photos of the cartons and labels. We open a carrier claim and replace or credit the items.' },
      { id: 'art-api', title: 'API rate limits and webhooks', section: 'Developers', author: 'ryan', updated: daysAgo(25), views: 1510, votes: 55, body: 'The REST API allows 400 requests per minute per token. Enterprise plans can request a higher limit. Webhooks are retried for 24 hours with exponential backoff.' },
    ],
  }
}
