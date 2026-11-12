/**
 * Extra HubSpot seed data (appended to the DB seed by src/db/seeds/extras.ts) for the pages in Extras.tsx:
 * campaigns, social, ads, events, website/landing pages, blog, videos, playbooks, payments, invoices, chatflows
 * and lead scoring criteria. New records only — never touches the core CRM seed.
 */
import type { Collections } from '@/db/db'
import { daysAgo, daysFromNow, hoursAgo, isoDate } from '@/data/time'

const d = (iso: string) => isoDate(iso)

export function seed(): Collections {
  const campaigns = [
    ['AI-Powered Operations Summit 2026', 'Completed', 'hannah', -40, -7, 38000, 36500, 216, 412000],
    ['Q4 Manufacturing ABM', 'Active', 'hannah', -21, 45, 22000, 9400, 64, 268000],
    ['Renewal Accelerator FY27', 'Active', 'aisha', -14, 60, 5000, 1200, 8, 1120000],
    ['EMEA Roadshow — Milan', 'Planned', 'liam', 25, 32, 31000, 0, 0, 0],
    ['Customer Advisory Board 2026', 'Planned', 'alex', 40, 41, 45000, 0, 0, 0],
    ['Ops Weekly newsletter', 'Active', 'hannah', -180, 180, 3000, 1650, 140, 96000],
  ].map(([name, status, ownerId, s, e, budget, spent, contacts, revenue], i) => ({ id: `hscmp-${i + 1}`, name, status, ownerId, start: d(daysAgo(-(s as number))), end: d(daysAgo(-(e as number))), budget, spent, contacts, revenue, goal: '', createdAt: daysAgo(60 - i), updatedAt: daysAgo(i + 1) }))

  const socialPosts = [
    ['Replay is live: the AI-Powered Operations Summit 🎥 61% of ops teams still build weekly reports by hand — here’s how to stop.', ['LinkedIn', 'X'], 'Published', daysAgo(6, 10, 0), 412, 1280],
    ['How Contoso cut weekly reporting from 2 days to 20 minutes with Ops Cloud. Read the customer story →', ['LinkedIn'], 'Published', daysAgo(3, 9, 30), 238, 640],
    ['Join us in Milan for the EMEA Ops Roadshow — seats are limited.', ['LinkedIn', 'Facebook'], 'Scheduled', daysFromNow(2, 9, 0), 0, 0],
    ['New in Ops Cloud: AI coworkers that close the loop on work orders.', ['LinkedIn', 'X', 'Instagram'], 'Scheduled', daysFromNow(5, 11, 0), 0, 0],
    ['Draft: Q4 benchmark teaser — needs final stat from Rachel', ['LinkedIn'], 'Draft', '', 0, 0],
  ].map(([name, channels, status, scheduledAt, clicks, reactions], i) => ({ id: `hssoc-${i + 1}`, name, channels, status, scheduledAt, clicks, reactions, campaign: i < 2 ? 'AI-Powered Operations Summit 2026' : '', createdAt: daysAgo(10 - i), updatedAt: daysAgo(5 - Math.min(i, 4)) }))

  const ads = [
    ['Ops leaders — Sponsored Content', 'LinkedIn', 'Active', 250, 6120, 184000, 1420, 38],
    ['Search — "operations dashboard software"', 'Google', 'Active', 180, 4310, 96000, 2880, 52],
    ['Retargeting — pricing page visitors', 'Facebook', 'Paused', 60, 820, 61000, 410, 9],
    ['Webinar promo — AI-Powered Ops', 'LinkedIn', 'Paused', 120, 3600, 88000, 960, 71],
  ].map(([name, network, status, budget, spend, impressions, clicks, contacts], i) => ({ id: `hsad-${i + 1}`, name, network, status, budget, spend, impressions, clicks, contacts, audience: '', createdAt: daysAgo(40 - i * 5), updatedAt: hoursAgo(5 + i * 9) }))

  const events = [
    ['AI-Powered Operations Summit 2026', 'Webinar', -7, 'Online', 'Completed', 452, 216],
    ['OpsWorld Chicago', 'Trade show', -45, 'Chicago, IL', 'Completed', 310, 188],
    ['EMEA Roadshow — Milan', 'Roadshow', 28, 'Milan, Italy', 'Upcoming', 96, 0],
    ['Customer Advisory Board', 'Conference', 41, 'Boston, MA', 'Upcoming', 34, 0],
    ['Partner Webinar: Ops + ERP', 'Webinar', 18, 'Online', 'Upcoming', 128, 0],
  ].map(([name, type, offset, location, status, registrants, attended], i) => ({ id: `hsevt-${i + 1}`, name, type, date: d(daysAgo(-(offset as number))), location, status, registrants, attended, description: '', createdAt: daysAgo(70 - i * 6), updatedAt: daysAgo(2 + i) }))

  const page = (prefix: string, rows: [string, string, string, string, number, number?][]) =>
    rows.map(([name, url, status, ownerId, views, submissions], i) => ({ id: `${prefix}-${i + 1}`, name, url, status, ownerId, views, submissions: submissions ?? 0, body: '', form: prefix === 'hslp' ? 'Demo request' : '', createdAt: daysAgo(120 - i * 9), updatedAt: daysAgo(1 + i * 4) }))
  const websitePages = page('hswp', [
    ['Home', '/', 'Published', 'hannah', 48210],
    ['Ops Cloud platform', '/platform/ops-cloud', 'Published', 'hannah', 12840],
    ['Pricing', '/pricing', 'Published', 'alex', 9310],
    ['Customers', '/customers', 'Published', 'hannah', 4120],
    ['Careers', '/careers', 'Draft', 'hannah', 0],
  ])
  const landingPages = page('hslp', [
    ['Webinar registration — AI-Powered Ops Summit', '/webinars/ai-powered-operations-2026', 'Published', 'hannah', 2140, 452],
    ['Request a demo', '/demo', 'Published', 'hannah', 3880, 214],
    ['2026 Operations Benchmark (ebook)', '/lp/ops-benchmark-2026', 'Published', 'hannah', 1720, 389],
    ['EMEA Roadshow — Milan', '/lp/emea-roadshow-milan', 'Draft', 'liam', 0, 0],
  ])
  const blogPosts = page('hsblog', [
    ['61% of ops teams still report in spreadsheets', '/blog/ops-benchmark-2026', 'Published', 'hannah', 3420],
    ['What an AI coworker actually does in plant operations', '/blog/ai-coworker-plant-ops', 'Published', 'alex', 2110],
    ['Multi-site reporting without the Monday scramble', '/blog/multi-site-reporting', 'Scheduled', 'hannah', 0],
    ['Webinar recap: AI-Powered Operations Summit', '/blog/webinar-recap', 'Draft', 'hannah', 0],
  ]).map((p, i) => ({ ...p, tags: ['Benchmark', 'AI', 'Reporting', 'Events'][i] }))

  const videos = [
    ['Ops Cloud in 2 minutes', '02:04', 'Published', 6840, 71],
    ['AI-Powered Operations Summit — full replay', '61:47', 'Published', 1290, 38],
    ['Customer story: Contoso', '03:12', 'Published', 2210, 64],
    ['Work orders walkthrough', '05:40', 'Draft', 0, 0],
  ].map(([name, duration, status, views, watched], i) => ({ id: `hsvid-${i + 1}`, name, duration, status, views, watched, description: '', createdAt: daysAgo(80 - i * 10), updatedAt: daysAgo(3 + i * 7) }))

  const playbooks = [
    ['Discovery call — operations leaders', 'Discovery', 'alex', 42, 'Use on first calls with heads of operations.', 'How do you build your weekly operations report today?\nHow many sites and users would need access?\nWhich systems (MES, ERP) must we integrate with?\nWho else is involved in the decision?\nWhat would success look like in 90 days?'],
    ['BANT qualification', 'Qualification', 'liam', 31, 'Confirm budget, authority, need and timeline before moving to Presentation Scheduled.', 'Is there budget allocated this fiscal year?\nWho signs the contract?\nWhat happens if you do nothing?\nWhen do you need to be live?'],
    ['Handling “we’ll build it in-house”', 'Objection handling', 'rachel', 12, 'Talk track for teams considering an in-house build.', 'What would the in-house team stop working on?\nHow will you maintain integrations long-term?\nWhat is the cost of a 6-month delay?'],
    ['Renewal check-in — 120 days out', 'Renewal', 'aisha', 18, 'Run 120 days before the renewal date.', 'How is adoption across teams?\nAny upcoming org changes or new sites?\nAre there features you are missing?\nWho needs to approve the renewal?'],
  ].map(([name, category, ownerId, uses, description, questions], i) => ({ id: `hspb-${i + 1}`, name, category, ownerId, uses, description, questions, createdAt: daysAgo(150 - i * 20), updatedAt: daysAgo(6 + i * 5) }))

  const payments = [
    ['Coho Winery — annual renewal', 'Coho Winery', 38400, 'ACH', 'Succeeded', 6],
    ['Litware — upgrade (prorated)', 'Litware', 21600, 'Card', 'Succeeded', 12],
    ['Contoso Pharmaceuticals — pilot deposit', 'Contoso Pharmaceuticals', 9600, 'Card', 'Pending', 1],
    ['Nod Publishers — onboarding package', 'Nod Publishers', 4500, 'Card', 'Refunded', 20],
    ['Tailwind Traders — starter seats', 'Tailwind Traders', 7200, 'Wire', 'Succeeded', 30],
  ].map(([name, company, amount, method, status, ago], i) => ({ id: `hspay-${i + 1}`, name, company, amount, method, status, date: d(daysAgo(ago as number)), createdAt: daysAgo(ago as number), updatedAt: daysAgo(ago as number) }))

  const invoices = [
    ['INV-1031', 'Coho Winery', 38400, -36, -6, 'Paid'],
    ['INV-1032', 'Litware', 21600, -20, 10, 'Open'],
    ['INV-1033', 'Lamna Healthcare', 18000, -45, -15, 'Open'],
    ['INV-1034', 'Contoso Pharmaceuticals', 96000, 0, 30, 'Draft'],
    ['INV-1035', 'Bellows College', 12500, -60, -30, 'Paid'],
    ['INV-1036', 'Consolidated Messenger', 8800, -10, 20, 'Open'],
  ].map(([name, company, amount, issued, due, status], i) => ({ id: `hsinv-${i + 1}`, name, company, amount, issued: d(daysAgo(-(issued as number))), dueDate: d(daysAgo(-(due as number))), status, memo: '', createdAt: daysAgo(-(issued as number)), updatedAt: daysAgo(Math.max(0, -(issued as number) - 2)) }))

  const chatflows = [
    ['Website — sales chat', 'Website', 'northwind.com/pricing', 'On', 184, 'Hi there 👋 Looking at pricing? I can answer questions or book a demo.'],
    ['Support bot', 'Website', 'northwind.com/support/*', 'On', 412, 'Hi! Describe your issue and I’ll find an article or open a ticket for you.'],
    ['Demo request concierge', 'Website', 'northwind.com/demo', 'Off', 0, 'Want to see Ops Cloud in action? Pick a time that works for you.'],
    ['Facebook Messenger', 'Facebook Messenger', 'Northwind Global page', 'Off', 9, 'Thanks for reaching out to Northwind Global!'],
  ].map(([name, channel, page, status, conversations, greeting], i) => ({ id: `hschat-${i + 1}`, name, channel, page, status, conversations, greeting, createdAt: daysAgo(200 - i * 30), updatedAt: daysAgo(4 + i * 6) }))

  const scoringRules = [
    ['Attended a webinar', 'Positive', 'webinarStatus', 'Attended', 25],
    ['Registered for a webinar', 'Positive', 'webinarStatus', 'Registered', 10],
    ['Marketing qualified', 'Positive', 'lifecycleStage', 'Marketing Qualified Lead', 20],
    ['Sales qualified', 'Positive', 'lifecycleStage', 'Sales Qualified Lead', 30],
    ['Already a customer', 'Negative', 'lifecycleStage', 'Customer', 15],
    ['Outside core markets', 'Negative', 'country', 'United Kingdom', 5],
  ].map(([name, group, property, value, points], i) => ({ id: `hsr-${i + 1}`, name, group, property, value, points, enabled: true }))

  return {
    'hubspot.campaigns': campaigns,
    'hubspot.socialPosts': socialPosts,
    'hubspot.ads': ads,
    'hubspot.events': events,
    'hubspot.websitePages': websitePages,
    'hubspot.landingPages': landingPages,
    'hubspot.blogPosts': blogPosts,
    'hubspot.videos': videos,
    'hubspot.playbooks': playbooks,
    'hubspot.payments': payments,
    'hubspot.invoices': invoices,
    'hubspot.chatflows': chatflows,
    'hubspot.scoringRules': scoringRules,
  }
}
