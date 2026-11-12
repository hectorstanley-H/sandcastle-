/**
 * HubSpot › config-driven pages for the remaining nav items: Campaigns, Social, Ads, Events, Lead Scoring,
 * Website/Landing pages, Blog, Videos, Playbooks, Payments, Invoices, Data Model, Data Quality, Chatflows.
 * Each kind is backed by its own `hubspot.<x>` collection (seeded by ./seed.extra.ts after a demo reset).
 */
import { useMemo, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, Check, CirclePlay, MessageCircle, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { db, uid, useCollection } from '@/db/db'
import { useDesk } from '@/os/context'
import { ME, person } from '@/data/people'
import { isoDate } from '@/data/time'
import { Field, HBtn, HLink, HWTag, Initials, Modal, Pill, hsDate, hsMoney, inputH, useHNav, type HRoute } from './ui'
import { OWNERS } from './owners'
import { createTask, isOpenDeal, logActivity } from './store'

/* ───────────────────────── config ───────────────────────── */

type Fmt = 'money' | 'date' | 'datetime' | 'num' | 'pct' | 'status' | 'owner' | 'list' | 'text'
type ColDef = { key: string; label: string; fmt?: Fmt }
type FieldDef = { key: string; label: string; type?: 'text' | 'number' | 'date' | 'datetime-local' | 'select' | 'textarea' | 'owner' | 'multi' | 'company'; options?: string[]; required?: boolean; hint?: string }
type Ctx = { update: (patch: Record<string, any>, msg?: string) => void; open: (n: ReactNode | null) => void; toast: (m: string) => void; go: (r: HRoute) => void; isAgent: boolean }
type Action = { label: string; run: (r: any, c: Ctx) => void }

interface KindCfg {
  title: string
  sub: string
  col: string
  noun: string
  createLabel: string
  cols: ColDef[]
  fields: FieldDef[]
  statuses?: string[]
  defaults: () => Record<string, any>
  kpis?: (rows: any[]) => [string, string, string?][]
  actions?: (r: any) => Action[]
  /** what clicking the name does (default: edit modal) */
  onOpen?: (r: any, c: Ctx) => void
}

const sum = (rows: any[], k: string) => rows.reduce((t, r) => t + (Number(r[k]) || 0), 0)
const pct = (a: number, b: number) => (b ? `${((a / b) * 100).toFixed(1)}%` : '--')
const nowIso = () => new Date().toISOString()
const PUB = ['Draft', 'Scheduled', 'Published', 'Archived']
const pageActions = (noun: string) => (r: any): Action[] => [
  r.status === 'Published'
    ? { label: 'Unpublish', run: (_, c) => c.update({ status: 'Draft' }, `${noun} unpublished.`) }
    : { label: 'Publish', run: (_, c) => c.update({ status: 'Published', publishedAt: nowIso() }, `${noun} published.`) },
  { label: 'Preview', run: (x, c) => c.open(<PagePreview r={x} onClose={() => c.open(null)} />) },
]

export const KINDS: Record<string, KindCfg> = {
  campaigns: {
    title: 'Campaigns',
    sub: 'Plan, track and report on every asset that drives a marketing initiative.',
    col: 'hubspot.campaigns',
    noun: 'Campaign',
    createLabel: 'Create campaign',
    statuses: ['Planned', 'Active', 'Paused', 'Completed'],
    cols: [{ key: 'name', label: 'Name' }, { key: 'status', label: 'Status', fmt: 'status' }, { key: 'ownerId', label: 'Owner', fmt: 'owner' }, { key: 'start', label: 'Start', fmt: 'date' }, { key: 'end', label: 'End', fmt: 'date' }, { key: 'budget', label: 'Budget', fmt: 'money' }, { key: 'spent', label: 'Spent', fmt: 'money' }, { key: 'contacts', label: 'New contacts', fmt: 'num' }, { key: 'revenue', label: 'Influenced revenue', fmt: 'money' }],
    fields: [{ key: 'name', label: 'Campaign name', required: true }, { key: 'status', label: 'Status', type: 'select', options: ['Planned', 'Active', 'Paused', 'Completed'] }, { key: 'ownerId', label: 'Owner', type: 'owner' }, { key: 'start', label: 'Start date', type: 'date' }, { key: 'end', label: 'End date', type: 'date' }, { key: 'budget', label: 'Budget (USD)', type: 'number' }, { key: 'goal', label: 'Goal', type: 'textarea' }],
    defaults: () => ({ status: 'Planned', ownerId: ME.id, start: isoDate(new Date()), end: isoDate(new Date(Date.now() + 30 * 86400000)), budget: 10000, spent: 0, contacts: 0, revenue: 0, goal: '' }),
    kpis: (r) => [['Active campaigns', String(r.filter((x) => x.status === 'Active').length)], ['Total budget', hsMoney(sum(r, 'budget'))], ['Spent', hsMoney(sum(r, 'spent')), pct(sum(r, 'spent'), sum(r, 'budget')) + ' of budget'], ['Influenced revenue', hsMoney(sum(r, 'revenue'))]],
    actions: (r) =>
      r.status === 'Active'
        ? [{ label: 'Pause', run: (_, c) => c.update({ status: 'Paused' }, 'Campaign paused.') }, { label: 'Complete', run: (_, c) => c.update({ status: 'Completed', end: isoDate(new Date()) }, 'Campaign marked completed.') }]
        : r.status === 'Completed'
          ? []
          : [{ label: r.status === 'Paused' ? 'Resume' : 'Launch', run: (_, c) => c.update({ status: 'Active' }, 'Campaign is now active.') }],
  },
  social: {
    title: 'Social',
    sub: 'Compose, schedule and publish posts to your connected social accounts.',
    col: 'hubspot.socialPosts',
    noun: 'Post',
    createLabel: 'Create social post',
    statuses: ['Draft', 'Scheduled', 'Published'],
    cols: [{ key: 'name', label: 'Post' }, { key: 'channels', label: 'Accounts', fmt: 'list' }, { key: 'status', label: 'Status', fmt: 'status' }, { key: 'scheduledAt', label: 'Publish date', fmt: 'datetime' }, { key: 'clicks', label: 'Clicks', fmt: 'num' }, { key: 'reactions', label: 'Interactions', fmt: 'num' }],
    fields: [{ key: 'name', label: 'Post text', type: 'textarea', required: true }, { key: 'channels', label: 'Publish to', type: 'multi', options: ['LinkedIn', 'X', 'Facebook', 'Instagram'] }, { key: 'scheduledAt', label: 'Schedule for', type: 'datetime-local', hint: 'Leave empty to save as a draft.' }, { key: 'campaign', label: 'Campaign' }],
    defaults: () => ({ status: 'Draft', channels: ['LinkedIn'], scheduledAt: '', clicks: 0, reactions: 0, campaign: '' }),
    kpis: (r) => [['Scheduled', String(r.filter((x) => x.status === 'Scheduled').length)], ['Published', String(r.filter((x) => x.status === 'Published').length)], ['Clicks', sum(r, 'clicks').toLocaleString()], ['Interactions', sum(r, 'reactions').toLocaleString()]],
    actions: (r) =>
      r.status === 'Published'
        ? []
        : [
            { label: 'Publish now', run: (_, c) => c.update({ status: 'Published', scheduledAt: nowIso() }, `Post published to ${(r.channels ?? []).join(', ') || 'LinkedIn'}.`) },
            ...(r.status === 'Scheduled' ? [{ label: 'Unschedule', run: (_: any, c: Ctx) => c.update({ status: 'Draft' }, 'Post moved back to drafts.') }] : []),
          ],
  },
  ads: {
    title: 'Ads',
    sub: 'See which ads turn into contacts and customers across LinkedIn, Google and Facebook.',
    col: 'hubspot.ads',
    noun: 'Ad campaign',
    createLabel: 'Create ad campaign',
    statuses: ['Active', 'Paused', 'Draft'],
    cols: [{ key: 'name', label: 'Name' }, { key: 'network', label: 'Network' }, { key: 'status', label: 'Status', fmt: 'status' }, { key: 'budget', label: 'Daily budget', fmt: 'money' }, { key: 'spend', label: 'Spend', fmt: 'money' }, { key: 'impressions', label: 'Impressions', fmt: 'num' }, { key: 'clicks', label: 'Clicks', fmt: 'num' }, { key: 'contacts', label: 'Contacts', fmt: 'num' }],
    fields: [{ key: 'name', label: 'Ad campaign name', required: true }, { key: 'network', label: 'Network', type: 'select', options: ['LinkedIn', 'Google', 'Facebook'] }, { key: 'budget', label: 'Daily budget (USD)', type: 'number' }, { key: 'audience', label: 'Audience', type: 'textarea' }],
    defaults: () => ({ status: 'Draft', network: 'LinkedIn', budget: 100, spend: 0, impressions: 0, clicks: 0, contacts: 0, audience: '' }),
    kpis: (r) => [['Spend', hsMoney(sum(r, 'spend'))], ['Impressions', sum(r, 'impressions').toLocaleString()], ['CTR', pct(sum(r, 'clicks'), sum(r, 'impressions'))], ['Cost per contact', sum(r, 'contacts') ? hsMoney(sum(r, 'spend') / sum(r, 'contacts')) : '--', `${sum(r, 'contacts')} contacts`]],
    actions: (r) => [r.status === 'Active' ? { label: 'Pause', run: (_, c) => c.update({ status: 'Paused' }, 'Ad campaign paused.') } : { label: r.status === 'Draft' ? 'Launch' : 'Resume', run: (_, c) => c.update({ status: 'Active' }, 'Ad campaign is live.') }],
  },
  events: {
    title: 'Marketing Events',
    sub: 'Track registrations and attendance for webinars, conferences and trade shows.',
    col: 'hubspot.events',
    noun: 'Event',
    createLabel: 'Create event',
    statuses: ['Upcoming', 'Completed', 'Canceled'],
    cols: [{ key: 'name', label: 'Event name' }, { key: 'type', label: 'Type' }, { key: 'date', label: 'Date', fmt: 'date' }, { key: 'location', label: 'Location' }, { key: 'status', label: 'Status', fmt: 'status' }, { key: 'registrants', label: 'Registrants', fmt: 'num' }, { key: 'attended', label: 'Attended', fmt: 'num' }],
    fields: [{ key: 'name', label: 'Event name', required: true }, { key: 'type', label: 'Type', type: 'select', options: ['Webinar', 'Trade show', 'Conference', 'Roadshow', 'Meetup'] }, { key: 'date', label: 'Date', type: 'date' }, { key: 'location', label: 'Location' }, { key: 'description', label: 'Description', type: 'textarea' }],
    defaults: () => ({ status: 'Upcoming', type: 'Webinar', date: isoDate(new Date(Date.now() + 21 * 86400000)), location: 'Online', registrants: 0, attended: 0, description: '' }),
    kpis: (r) => [['Upcoming', String(r.filter((x) => x.status === 'Upcoming').length)], ['Registrants', sum(r, 'registrants').toLocaleString()], ['Attendance rate', pct(sum(r, 'attended'), sum(r.filter((x) => x.status === 'Completed'), 'registrants'))]],
    actions: (r) => (r.status === 'Upcoming' ? [{ label: 'Mark completed', run: (_, c) => c.update({ status: 'Completed', attended: r.attended || Math.round((r.registrants || 0) * 0.46) }, 'Event marked completed.') }, { label: 'Cancel event', run: (_, c) => c.update({ status: 'Canceled' }, 'Event canceled.') }] : []),
  },
  websitePages: {
    title: 'Website Pages',
    sub: 'Create and manage the pages of northwind.com.',
    col: 'hubspot.websitePages',
    noun: 'Page',
    createLabel: 'Create website page',
    statuses: PUB,
    cols: [{ key: 'name', label: 'Name' }, { key: 'url', label: 'URL' }, { key: 'status', label: 'Status', fmt: 'status' }, { key: 'ownerId', label: 'Author', fmt: 'owner' }, { key: 'views', label: 'Page views', fmt: 'num' }, { key: 'updatedAt', label: 'Last updated', fmt: 'date' }],
    fields: [{ key: 'name', label: 'Page title', required: true }, { key: 'url', label: 'URL slug', hint: 'e.g. /platform/ops-cloud' }, { key: 'ownerId', label: 'Author', type: 'owner' }, { key: 'body', label: 'Content', type: 'textarea' }],
    defaults: () => ({ status: 'Draft', url: '/new-page', ownerId: ME.id, views: 0, body: '' }),
    kpis: (r) => [['Published', String(r.filter((x) => x.status === 'Published').length)], ['Drafts', String(r.filter((x) => x.status === 'Draft').length)], ['Page views (30d)', sum(r, 'views').toLocaleString()]],
    actions: pageActions('Page'),
  },
  landingPages: {
    title: 'Landing Pages',
    sub: 'Pages built to convert visitors into leads.',
    col: 'hubspot.landingPages',
    noun: 'Landing page',
    createLabel: 'Create landing page',
    statuses: PUB,
    cols: [{ key: 'name', label: 'Name' }, { key: 'url', label: 'URL' }, { key: 'status', label: 'Status', fmt: 'status' }, { key: 'views', label: 'Views', fmt: 'num' }, { key: 'submissions', label: 'Submissions', fmt: 'num' }, { key: 'updatedAt', label: 'Last updated', fmt: 'date' }],
    fields: [{ key: 'name', label: 'Page title', required: true }, { key: 'url', label: 'URL slug' }, { key: 'form', label: 'Form on page' }, { key: 'body', label: 'Content', type: 'textarea' }],
    defaults: () => ({ status: 'Draft', url: '/lp/new', ownerId: ME.id, views: 0, submissions: 0, form: '', body: '' }),
    kpis: (r) => [['Views', sum(r, 'views').toLocaleString()], ['Submissions', sum(r, 'submissions').toLocaleString()], ['Conversion rate', pct(sum(r, 'submissions'), sum(r, 'views'))]],
    actions: pageActions('Landing page'),
  },
  blog: {
    title: 'Blog',
    sub: 'Write, schedule and publish posts on the Northwind blog.',
    col: 'hubspot.blogPosts',
    noun: 'Blog post',
    createLabel: 'Create blog post',
    statuses: PUB,
    cols: [{ key: 'name', label: 'Title' }, { key: 'status', label: 'Status', fmt: 'status' }, { key: 'ownerId', label: 'Author', fmt: 'owner' }, { key: 'tags', label: 'Tags' }, { key: 'views', label: 'Views', fmt: 'num' }, { key: 'updatedAt', label: 'Last updated', fmt: 'date' }],
    fields: [{ key: 'name', label: 'Title', required: true }, { key: 'ownerId', label: 'Author', type: 'owner' }, { key: 'tags', label: 'Tags' }, { key: 'body', label: 'Post body', type: 'textarea' }],
    defaults: () => ({ status: 'Draft', url: '/blog/new-post', ownerId: ME.id, views: 0, tags: '', body: '' }),
    kpis: (r) => [['Published posts', String(r.filter((x) => x.status === 'Published').length)], ['Drafts', String(r.filter((x) => x.status === 'Draft').length)], ['Views', sum(r, 'views').toLocaleString()]],
    actions: pageActions('Blog post'),
  },
  videos: {
    title: 'Videos',
    sub: 'Host videos and see who watched them.',
    col: 'hubspot.videos',
    noun: 'Video',
    createLabel: 'Upload video',
    statuses: ['Published', 'Draft'],
    cols: [{ key: 'name', label: 'Title' }, { key: 'duration', label: 'Length' }, { key: 'status', label: 'Status', fmt: 'status' }, { key: 'views', label: 'Plays', fmt: 'num' }, { key: 'watched', label: 'Avg. watched', fmt: 'pct' }, { key: 'updatedAt', label: 'Uploaded', fmt: 'date' }],
    fields: [{ key: 'name', label: 'Title', required: true }, { key: 'duration', label: 'Length', hint: 'mm:ss' }, { key: 'description', label: 'Description', type: 'textarea' }],
    defaults: () => ({ status: 'Draft', duration: '02:30', views: 0, watched: 0, description: '' }),
    kpis: (r) => [['Videos', String(r.length)], ['Plays', sum(r, 'views').toLocaleString()], ['Avg. watched', r.length ? `${Math.round(sum(r, 'watched') / r.length)}%` : '--']],
    onOpen: (r, c) => c.open(<VideoPlayer r={r} onClose={() => c.open(null)} />),
    actions: (r) => [{ label: 'Play', run: (x, c) => c.open(<VideoPlayer r={x} onClose={() => c.open(null)} />) }, ...(r.status === 'Draft' ? [{ label: 'Publish', run: (_: any, c: Ctx) => c.update({ status: 'Published' }, 'Video published.') }] : [])],
  },
  playbooks: {
    title: 'Playbooks',
    sub: 'Guided call scripts and question lists your reps can use on any record.',
    col: 'hubspot.playbooks',
    noun: 'Playbook',
    createLabel: 'Create playbook',
    cols: [{ key: 'name', label: 'Name' }, { key: 'category', label: 'Category' }, { key: 'ownerId', label: 'Created by', fmt: 'owner' }, { key: 'uses', label: 'Times used', fmt: 'num' }, { key: 'updatedAt', label: 'Last updated', fmt: 'date' }],
    fields: [{ key: 'name', label: 'Playbook name', required: true }, { key: 'category', label: 'Category', type: 'select', options: ['Discovery', 'Qualification', 'Objection handling', 'Renewal'] }, { key: 'description', label: 'Description', type: 'textarea' }, { key: 'questions', label: 'Questions (one per line)', type: 'textarea' }],
    defaults: () => ({ category: 'Discovery', ownerId: ME.id, uses: 0, description: '', questions: '' }),
    onOpen: (r, c) => c.open(<PlaybookReader r={r} onClose={() => c.open(null)} />),
    actions: () => [{ label: 'Use playbook', run: (x, c) => c.open(<PlaybookReader r={x} onClose={() => c.open(null)} />) }],
  },
  payments: {
    title: 'Payments',
    sub: 'Collect payments by card or ACH and track every transaction.',
    col: 'hubspot.payments',
    noun: 'Payment',
    createLabel: 'Record payment',
    statuses: ['Succeeded', 'Pending', 'Refunded', 'Failed'],
    cols: [{ key: 'name', label: 'Description' }, { key: 'company', label: 'Customer' }, { key: 'amount', label: 'Amount', fmt: 'money' }, { key: 'method', label: 'Method' }, { key: 'status', label: 'Status', fmt: 'status' }, { key: 'date', label: 'Date', fmt: 'date' }],
    fields: [{ key: 'name', label: 'Description', required: true }, { key: 'company', label: 'Customer', type: 'company' }, { key: 'amount', label: 'Amount (USD)', type: 'number' }, { key: 'method', label: 'Method', type: 'select', options: ['Card', 'ACH', 'Wire'] }],
    defaults: () => ({ status: 'Pending', method: 'Card', amount: 0, date: isoDate(new Date()), company: '' }),
    kpis: (r) => [['Collected', hsMoney(sum(r.filter((x) => x.status === 'Succeeded'), 'amount'))], ['Pending', hsMoney(sum(r.filter((x) => x.status === 'Pending'), 'amount'))], ['Refunded', hsMoney(sum(r.filter((x) => x.status === 'Refunded'), 'amount'))]],
    actions: (r) => (r.status === 'Succeeded' ? [{ label: 'Refund', run: (_, c) => c.update({ status: 'Refunded' }, `${hsMoney(r.amount)} refunded to ${r.company || 'customer'}.`) }] : r.status === 'Pending' ? [{ label: 'Mark succeeded', run: (_, c) => c.update({ status: 'Succeeded' }, 'Payment captured.') }] : []),
  },
  invoices: {
    title: 'Invoices',
    sub: 'Create, send and collect on invoices.',
    col: 'hubspot.invoices',
    noun: 'Invoice',
    createLabel: 'Create invoice',
    statuses: ['Draft', 'Open', 'Paid', 'Overdue', 'Void'],
    cols: [{ key: 'name', label: 'Invoice' }, { key: 'company', label: 'Customer' }, { key: 'amount', label: 'Amount', fmt: 'money' }, { key: 'issued', label: 'Issued', fmt: 'date' }, { key: 'dueDate', label: 'Due', fmt: 'date' }, { key: 'status', label: 'Status', fmt: 'status' }],
    fields: [{ key: 'company', label: 'Customer', type: 'company', required: true }, { key: 'amount', label: 'Amount (USD)', type: 'number' }, { key: 'dueDate', label: 'Due date', type: 'date' }, { key: 'memo', label: 'Memo', type: 'textarea' }],
    defaults: () => ({ name: `INV-${1040 + Math.floor(Math.random() * 900)}`, status: 'Draft', amount: 0, issued: isoDate(new Date()), dueDate: isoDate(new Date(Date.now() + 30 * 86400000)), memo: '' }),
    kpis: (r) => [['Outstanding', hsMoney(sum(r.filter((x) => invStatus(x) === 'Open' || invStatus(x) === 'Overdue'), 'amount'))], ['Overdue', hsMoney(sum(r.filter((x) => invStatus(x) === 'Overdue'), 'amount')), `${r.filter((x) => invStatus(x) === 'Overdue').length} invoices`], ['Paid', hsMoney(sum(r.filter((x) => x.status === 'Paid'), 'amount'))]],
    actions: (r) =>
      r.status === 'Draft'
        ? [{ label: 'Send', run: (_, c) => c.update({ status: 'Open', issued: isoDate(new Date()) }, `${r.name} sent to ${r.company}.`) }]
        : r.status === 'Open'
          ? [{ label: 'Mark paid', run: (_, c) => c.update({ status: 'Paid', paidAt: nowIso() }, `${r.name} marked as paid.`) }, { label: 'Void', run: (_, c) => c.update({ status: 'Void' }, `${r.name} voided.`) }]
          : [],
  },
  chatflows: {
    title: 'Chatflows',
    sub: 'Chatbots and live chat widgets that greet visitors on your website.',
    col: 'hubspot.chatflows',
    noun: 'Chatflow',
    createLabel: 'Create chatflow',
    statuses: ['On', 'Off'],
    cols: [{ key: 'name', label: 'Name' }, { key: 'channel', label: 'Channel' }, { key: 'page', label: 'Target page' }, { key: 'status', label: 'Status', fmt: 'status' }, { key: 'conversations', label: 'Conversations (30d)', fmt: 'num' }, { key: 'updatedAt', label: 'Last updated', fmt: 'date' }],
    fields: [{ key: 'name', label: 'Chatflow name', required: true }, { key: 'channel', label: 'Channel', type: 'select', options: ['Website', 'Facebook Messenger', 'WhatsApp'] }, { key: 'page', label: 'Target page', hint: 'URL where the widget appears' }, { key: 'greeting', label: 'Welcome message', type: 'textarea' }],
    defaults: () => ({ status: 'Off', channel: 'Website', page: 'northwind.com/*', conversations: 0, greeting: 'Hi there 👋 Have a question about Ops Cloud? We’re here to help.' }),
    actions: (r) => [{ label: r.status === 'On' ? 'Turn off' : 'Turn on', run: (_, c) => c.update({ status: r.status === 'On' ? 'Off' : 'On' }, `Chatflow turned ${r.status === 'On' ? 'off' : 'on'}.`) }, { label: 'Preview', run: (x, c) => c.open(<ChatPreview r={x} onClose={() => c.open(null)} />) }],
  },
}

const invStatus = (r: any) => (r.status === 'Open' && r.dueDate && r.dueDate < isoDate(new Date()) ? 'Overdue' : r.status)

const STATUS_COLOR: Record<string, [string, string]> = {
  Active: ['#E5F8F6', '#00826F'], Published: ['#E5F8F6', '#00826F'], Succeeded: ['#E5F8F6', '#00826F'], Paid: ['#E5F8F6', '#00826F'], On: ['#E5F8F6', '#00826F'], Completed: ['#EAF0F6', '#33475B'],
  Scheduled: ['#E5F5F8', '#007A8C'], Upcoming: ['#E5F5F8', '#007A8C'], Open: ['#E5F5F8', '#007A8C'], Planned: ['#E5F5F8', '#007A8C'], Pending: ['#FFF4DC', '#9B6A00'], Paused: ['#FFF4DC', '#9B6A00'],
  Draft: ['#EAF0F6', '#516F90'], Off: ['#EAF0F6', '#516F90'], Archived: ['#EAF0F6', '#516F90'], Void: ['#EAF0F6', '#516F90'],
  Overdue: ['#FDEDEE', '#C93B44'], Refunded: ['#FDEDEE', '#C93B44'], Failed: ['#FDEDEE', '#C93B44'], Canceled: ['#FDEDEE', '#C93B44'],
}
export const StatusPill = ({ s }: { s: string }) => {
  const [bg, fg] = STATUS_COLOR[s] ?? STATUS_COLOR.Draft
  return <Pill color={bg} text={fg}>{s}</Pill>
}

const th = 'text-left text-[12px] font-semibold uppercase tracking-wide px-3 h-10 border-b border-[#DFE3EB] bg-[#F5F8FA] whitespace-nowrap'
const td = 'px-3 h-12 border-b border-[#DFE3EB] text-[13.5px] whitespace-nowrap'

function fmt(v: any, f: Fmt | undefined, r: any) {
  if (f === 'status') return <StatusPill s={r.status === 'Open' && r.dueDate ? invStatus(r) : v} />
  if (v == null || v === '') return '--'
  switch (f) {
    case 'money': return hsMoney(Number(v) || 0)
    case 'date': return hsDate(v)
    case 'datetime': return hsDate(v, true)
    case 'num': return Number(v).toLocaleString()
    case 'pct': return `${v}%`
    case 'owner': return person(v).name
    case 'list': return Array.isArray(v) ? v.join(', ') : String(v)
    default: return String(v)
  }
}

function PageHead({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <div className="bg-white border-b border-[#DFE3EB] px-6 pt-5 pb-4 flex items-center gap-3">
      <div className="flex-1">
        <h1 className="text-[22px] font-medium">{title}</h1>
        {sub && <div className="text-[13px] text-[#516F90] mt-0.5">{sub}</div>}
      </div>
      {right}
    </div>
  )
}

function Kpis({ items }: { items: [string, string, string?][] }) {
  return (
    <div className="grid gap-3 px-6 pt-4" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0,1fr))` }}>
      {items.map(([l, v, s]) => (
        <div key={l} className="bg-white border border-[#DFE3EB] rounded-[4px] px-4 py-3">
          <div className="text-[12px] font-semibold uppercase tracking-wide text-[#516F90]">{l}</div>
          <div className="text-[22px] font-light mt-0.5">{v}</div>
          {s && <div className="text-[12px] text-[#516F90]">{s}</div>}
        </div>
      ))}
    </div>
  )
}

/* ───────────────────────── generic index ───────────────────────── */

export function ExtraPage({ kind }: { kind: string }) {
  if (kind === 'dataModel') return <DataModelPage />
  if (kind === 'dataQuality') return <DataQualityPage />
  if (kind === 'leadScoring') return <LeadScoringPage />
  const cfg = KINDS[kind]
  if (!cfg) return <div className="p-8">Page not found.</div>
  return <GenericIndex key={kind} kind={kind} cfg={cfg} />
}

function GenericIndex({ kind, cfg }: { kind: string; cfg: KindCfg }) {
  const { open, toast, go } = useHNav()
  const { isAgent } = useDesk()
  const rows = useCollection<any>(cfg.col)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [sort, setSort] = useState<{ k: string; dir: 1 | -1 } | null>(null)
  const list = useMemo(() => {
    let l = rows.filter((r) => (!status || (r.status === 'Open' && r.dueDate ? invStatus(r) : r.status) === status) && (!q || JSON.stringify(r).toLowerCase().includes(q.toLowerCase())))
    if (sort) l = [...l].sort((a, b) => { const x = a[sort.k], y = b[sort.k]; return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x ?? '').localeCompare(String(y ?? ''))) * sort.dir })
    else l = [...l].sort((a, b) => +new Date(b.updatedAt ?? b.createdAt ?? 0) - +new Date(a.updatedAt ?? a.createdAt ?? 0))
    return l
  }, [rows, q, status, sort])
  const ctxFor = (r: any): Ctx => ({
    open,
    toast,
    go,
    isAgent,
    update: (patch, msg) => {
      db.update(cfg.col, r.id, { ...patch, updatedAt: nowIso(), ...(isAgent ? { updatedBy: 'hworker' } : {}) })
      if (msg) toast(msg)
    },
  })
  const edit = (r?: any) => open(<RecordModal cfg={cfg} kind={kind} rec={r} onClose={() => open(null)} />)
  const del = (r: any) =>
    open(
      <Modal title={`Delete ${cfg.noun.toLowerCase()}?`} onClose={() => open(null)} width={460} footer={<><button data-agent={`hs-x-${kind}-delete-confirm`} onClick={() => { db.remove(cfg.col, r.id); open(null); toast(`${cfg.noun} deleted.`) }} className="h-8 px-3 rounded-[3px] bg-[#F2545B] border border-[#F2545B] text-white text-[13px] font-medium">Delete</button><HBtn small onClick={() => open(null)}>Cancel</HBtn></>}>
        <div>“{String(r.name).slice(0, 80)}” will be permanently deleted.</div>
      </Modal>,
    )
  return (
    <div className="min-h-full bg-[#F5F8FA]" data-agent={`hs-x-page-${kind}`}>
      <PageHead title={cfg.title} sub={cfg.sub} right={<HBtn variant="primary" small agent={`hs-x-${kind}-create`} onClick={() => edit()}><Plus size={14} /> {cfg.createLabel}</HBtn>} />
      {cfg.kpis && <Kpis items={cfg.kpis(rows)} />}
      <div className="m-6 bg-white border border-[#DFE3EB] rounded-[4px]">
        <div className="flex items-center gap-2 p-3 border-b border-[#DFE3EB]">
          <div className="flex items-center h-8 w-[260px] border border-[#CBD6E2] rounded-[3px] px-2 gap-1.5"><Search size={14} className="text-[#7C98B6]" /><input data-agent={`hs-x-${kind}-search`} aria-label={`Search ${cfg.title}`} value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${cfg.title.toLowerCase()}`} className="flex-1 outline-none text-[13px]" /></div>
          {cfg.statuses && (
            <select aria-label="Status" data-agent={`hs-x-${kind}-status-filter`} value={status} onChange={(e) => setStatus(e.target.value)} className={`${inputH} h-8 text-[13px]`}>
              <option value="">All statuses</option>
              {cfg.statuses.map((s) => <option key={s}>{s}</option>)}
            </select>
          )}
          <span className="ml-auto text-[13px] text-[#516F90]">{list.length} {list.length === 1 ? 'record' : 'records'}</span>
        </div>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {cfg.cols.map((c) => (
                <th key={c.key} className={`${th} cursor-pointer hover:bg-[#EAF0F6]`} onClick={() => setSort(sort?.k === c.key ? (sort.dir === 1 ? { k: c.key, dir: -1 } : null) : { k: c.key, dir: 1 })}>
                  <span className="inline-flex items-center gap-1">{c.label}{sort?.k === c.key && (sort.dir === 1 ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}</span>
                </th>
              ))}
              <th className={th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.id} className={`hover:bg-[#F5F8FA] ${r.createdBy === 'hworker' ? 'flash-new' : ''}`}>
                {cfg.cols.map((c, i) => (
                  <td key={c.key} className={`${td} ${i === 0 ? 'max-w-[340px] truncate' : ''}`}>
                    {i === 0 ? (
                      <span className="flex items-center gap-2 min-w-0">
                        <HLink agent={`hs-x-row-${r.id}`} className="truncate" onClick={() => (cfg.onOpen ? cfg.onOpen(r, ctxFor(r)) : edit(r))}>{String(r[c.key] ?? 'Untitled')}</HLink>
                        {(r.createdBy === 'hworker' || r.updatedBy === 'hworker') && <HWTag />}
                      </span>
                    ) : (
                      fmt(r[c.key], c.fmt, r)
                    )}
                  </td>
                ))}
                <td className={td}>
                  <span className="flex items-center gap-1">
                    {(cfg.actions?.(r) ?? []).map((a) => (
                      <button key={a.label} data-agent={`hs-x-action-${r.id}-${a.label.toLowerCase().replace(/\s+/g, '-')}`} onClick={() => a.run(r, ctxFor(r))} className="h-7 px-2 rounded-[3px] border border-[#CBD6E2] bg-white text-[12.5px] font-medium hover:bg-[#EAF0F6]">{a.label}</button>
                    ))}
                    <button aria-label="Edit" title="Edit" data-agent={`hs-x-edit-${r.id}`} onClick={() => edit(r)} className="w-7 h-7 inline-flex items-center justify-center rounded-[3px] text-[#516F90] hover:bg-[#EAF0F6]"><Pencil size={14} /></button>
                    <button aria-label="Delete" title="Delete" data-agent={`hs-x-delete-${r.id}`} onClick={() => del(r)} className="w-7 h-7 inline-flex items-center justify-center rounded-[3px] text-[#516F90] hover:bg-[#FDEDEE] hover:text-[#C93B44]"><Trash2 size={14} /></button>
                  </span>
                </td>
              </tr>
            ))}
            {!list.length && (
              <tr><td colSpan={cfg.cols.length + 1} className="px-3 py-12 text-center text-[13.5px] text-[#516F90]">{rows.length ? 'No records match these filters.' : <>No {cfg.title.toLowerCase()} yet. <HLink onClick={() => edit()}>{cfg.createLabel}</HLink></>}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function RecordModal({ cfg, kind, rec, onClose }: { cfg: KindCfg; kind: string; rec?: any; onClose: () => void }) {
  const { toast } = useHNav()
  const { isAgent } = useDesk()
  const companies = useCollection<any>('hubspot.companies')
  const [v, setV] = useState<Record<string, any>>(() => {
    const base = rec ? { ...rec } : { ...cfg.defaults() }
    if (base.scheduledAt && String(base.scheduledAt).length > 16) base.scheduledAt = toLocalInput(base.scheduledAt)
    return base
  })
  const set = (k: string, x: any) => setV((p) => ({ ...p, [k]: x }))
  const missing = cfg.fields.filter((f) => f.required && !String(v[f.key] ?? '').trim())
  const save = () => {
    const out: Record<string, any> = { ...v }
    for (const f of cfg.fields) if (f.type === 'number') out[f.key] = Number(String(out[f.key] ?? '').replace(/[^0-9.-]/g, '')) || 0
    if (kind === 'social') {
      out.scheduledAt = out.scheduledAt ? new Date(out.scheduledAt).toISOString() : ''
      if (out.status !== 'Published') out.status = out.scheduledAt ? 'Scheduled' : 'Draft'
    }
    if (kind === 'invoices' && !out.name) out.name = `INV-${1040 + Math.floor(Math.random() * 900)}`
    const by = isAgent ? 'hworker' : undefined
    if (rec) {
      db.update(cfg.col, rec.id, { ...out, updatedAt: nowIso(), updatedBy: by })
      toast(`${cfg.noun} saved.`)
    } else {
      db.insert(cfg.col, { ...out, id: uid('hsx'), createdAt: nowIso(), updatedAt: nowIso(), createdBy: by }, { prepend: true })
      toast(`${cfg.noun} created.`)
    }
    onClose()
  }
  return (
    <Modal title={rec ? `Edit ${cfg.noun.toLowerCase()}` : cfg.createLabel} onClose={onClose} width={560} agent={`hs-x-${kind}-modal`} footer={<><HBtn variant="primary" small agent={`hs-x-${kind}-save`} disabled={missing.length > 0} onClick={save}>{rec ? 'Save' : 'Create'}</HBtn><HBtn small onClick={onClose}>Cancel</HBtn></>}>
      {cfg.fields.map((f) => (
        <Field key={f.key} label={`${f.label}${f.required ? ' *' : ''}`} hint={f.hint}>
          {f.type === 'textarea' ? (
            <textarea data-agent={`hs-x-field-${f.key}`} value={v[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)} rows={4} className={`${inputH} h-auto py-2 w-full`} />
          ) : f.type === 'select' || f.type === 'owner' || f.type === 'company' ? (
            <select data-agent={`hs-x-field-${f.key}`} value={v[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)} className={`${inputH} w-full`}>
              {f.type === 'company' && <option value="">Select a company</option>}
              {f.type === 'owner' ? OWNERS.map((o) => <option key={o.id} value={o.id}>{o.name}</option>) : f.type === 'company' ? companies.map((c) => <option key={c.id} value={c.name}>{c.name}</option>) : f.options!.map((o) => <option key={o}>{o}</option>)}
            </select>
          ) : f.type === 'multi' ? (
            <span className="flex flex-wrap gap-3 pt-1">
              {f.options!.map((o) => {
                const arr: string[] = v[f.key] ?? []
                return (
                  <span key={o} className="inline-flex items-center gap-1.5 text-[13.5px]">
                    <input type="checkbox" data-agent={`hs-x-field-${f.key}-${o.toLowerCase()}`} checked={arr.includes(o)} onChange={(e) => set(f.key, e.target.checked ? [...arr, o] : arr.filter((x) => x !== o))} className="accent-[#FF5C35]" /> {o}
                  </span>
                )
              })}
            </span>
          ) : (
            <input data-agent={`hs-x-field-${f.key}`} type={f.type === 'number' ? 'text' : f.type ?? 'text'} inputMode={f.type === 'number' ? 'decimal' : undefined} value={v[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)} className={`${inputH} w-full`} />
          )}
        </Field>
      ))}
      {kind === 'social' && v.name && (
        <div className="rounded-[4px] border border-[#DFE3EB] p-3 bg-[#F5F8FA]">
          <div className="text-[12px] font-semibold uppercase text-[#516F90] mb-2">Preview</div>
          <div className="flex gap-2"><Initials name="Northwind Global" size={32} color="#213343" /><div><div className="text-[13px] font-semibold">Northwind Global</div><div className="text-[13.5px] whitespace-pre-wrap">{v.name}</div><div className="text-[12px] text-[#7C98B6] mt-1">{v.name.length} / 3000 characters</div></div></div>
        </div>
      )}
    </Modal>
  )
}

const toLocalInput = (iso: string) => {
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

/* ───────────────────────── kind-specific modals ───────────────────────── */

function PagePreview({ r, onClose }: { r: any; onClose: () => void }) {
  return (
    <Modal title={`Preview — ${r.name}`} onClose={onClose} width={720} agent="hs-x-preview">
      <div className="rounded-[4px] border border-[#CBD6E2] overflow-hidden">
        <div className="h-8 bg-[#EAF0F6] flex items-center gap-2 px-3 text-[12px] text-[#516F90]"><span className="w-2.5 h-2.5 rounded-full bg-[#F2545B]" /><span className="w-2.5 h-2.5 rounded-full bg-[#FFB000]" /><span className="w-2.5 h-2.5 rounded-full bg-[#00BDA5]" /><span className="ml-2">https://www.northwind.com{r.url ?? ''}</span></div>
        <div className="p-8 bg-white">
          <div className="text-[12px] font-semibold uppercase tracking-wide text-[#FF5C35]">Northwind Global</div>
          <h2 className="text-[26px] font-medium mt-2">{r.name}</h2>
          <p className="text-[14px] leading-[1.7] text-[#516F90] mt-3 whitespace-pre-wrap">{r.body || 'Operations teams use Ops Cloud to replace spreadsheets with live dashboards, work orders and AI coworkers that close the loop.'}</p>
          {r.form && <div className="mt-5 p-4 rounded-[4px] bg-[#F5F8FA] border border-[#DFE3EB] text-[13px]"><b>{r.form}</b><div className="mt-2 h-8 bg-white border border-[#CBD6E2] rounded-[3px]" /><div className="mt-2 h-8 w-28 bg-[#FF5C35] rounded-[3px]" /></div>}
        </div>
      </div>
      <div className="text-[12.5px] text-[#516F90]">Status: {r.status}{r.status === 'Published' ? ` · ${(r.views ?? 0).toLocaleString()} views` : ''}</div>
    </Modal>
  )
}

function VideoPlayer({ r, onClose }: { r: any; onClose: () => void }) {
  const [playing, setPlaying] = useState(false)
  const play = () => {
    if (!playing) db.update('hubspot.videos', r.id, (x) => ({ views: (x.views ?? 0) + 1 }))
    setPlaying(!playing)
  }
  return (
    <Modal title={r.name} onClose={onClose} width={680} agent="hs-x-video">
      <button data-agent="hs-x-video-play" aria-label={playing ? 'Pause' : 'Play'} onClick={play} className="w-full aspect-video rounded-[4px] bg-gradient-to-br from-[#213343] to-[#425B76] flex flex-col items-center justify-center text-white relative overflow-hidden">
        {playing ? <div className="text-[14px] opacity-80">Playing… {r.duration}</div> : <CirclePlay size={64} />}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20"><div className={`h-full bg-[#FF5C35] ${playing ? 'w-1/3' : 'w-0'} transition-all duration-[3000ms]`} /></div>
      </button>
      <div className="text-[13px] text-[#516F90]">{(r.views ?? 0).toLocaleString()} plays · average viewer watched {r.watched ?? 0}%</div>
      {r.description && <div className="text-[13.5px]">{r.description}</div>}
    </Modal>
  )
}

function ChatPreview({ r, onClose }: { r: any; onClose: () => void }) {
  const [msgs, setMsgs] = useState<{ me: boolean; t: string }[]>([{ me: false, t: r.greeting || 'Hi there! How can we help?' }])
  const [t, setT] = useState('')
  const send = () => {
    if (!t.trim()) return
    setMsgs((m) => [...m, { me: true, t }, { me: false, t: /price|pricing|cost/i.test(t) ? 'Ops Cloud starts at $62/seat/month. Want me to connect you with a specialist?' : 'Thanks! A member of our team will reply in a few minutes.' }])
    setT('')
  }
  return (
    <Modal title={`Test chatflow — ${r.name}`} onClose={onClose} width={420} agent="hs-x-chat-preview">
      <div className="rounded-[8px] border border-[#CBD6E2] overflow-hidden">
        <div className="h-11 bg-[#213343] text-white flex items-center gap-2 px-3 text-[13.5px]"><MessageCircle size={16} /> Northwind Global</div>
        <div className="h-[240px] overflow-auto p-3 space-y-2 bg-[#F5F8FA]">
          {msgs.map((m, i) => <div key={i} className={`max-w-[80%] px-3 py-2 rounded-[10px] text-[13px] ${m.me ? 'ml-auto bg-[#FF5C35] text-white' : 'bg-white border border-[#DFE3EB]'}`}>{m.t}</div>)}
        </div>
        <div className="flex gap-2 p-2 border-t border-[#DFE3EB]"><input data-agent="hs-x-chat-input" value={t} onChange={(e) => setT(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder="Type a message" className={`${inputH} flex-1 h-8`} /><HBtn small variant="primary" onClick={send}>Send</HBtn></div>
      </div>
    </Modal>
  )
}

function PlaybookReader({ r, onClose }: { r: any; onClose: () => void }) {
  const { toast } = useHNav()
  const { isAgent } = useDesk()
  const contacts = useCollection<any>('hubspot.contacts')
  const qs: string[] = String(r.questions ?? '').split('\n').map((s) => s.trim()).filter(Boolean)
  const [contactId, setContactId] = useState('')
  const [ans, setAns] = useState<Record<number, string>>({})
  const log = () => {
    const body = qs.map((q, i) => `${q}\n→ ${ans[i] || '—'}`).join('\n\n')
    logActivity('hubspot.contacts', contactId, { type: 'note', title: `Playbook: ${r.name}`, body, by: isAgent ? 'hworker' : undefined })
    db.update('hubspot.playbooks', r.id, (x) => ({ uses: (x.uses ?? 0) + 1, updatedAt: nowIso() }))
    toast('Playbook notes logged to the contact timeline.')
    onClose()
  }
  return (
    <Modal title={r.name} onClose={onClose} width={640} agent="hs-x-playbook" footer={<><HBtn variant="primary" small agent="hs-x-playbook-log" disabled={!contactId} onClick={log}>Log notes to contact</HBtn><HBtn small onClick={onClose}>Close</HBtn></>}>
      {r.description && <div className="text-[13.5px] text-[#516F90]">{r.description}</div>}
      <Field label="Contact">
        <select data-agent="hs-x-playbook-contact" value={contactId} onChange={(e) => setContactId(e.target.value)} className={`${inputH} w-full`}>
          <option value="">Select the contact you’re speaking with</option>
          {contacts.map((c) => <option key={c.id} value={c.id}>{c.firstName} {c.lastName} — {c.company}</option>)}
        </select>
      </Field>
      {qs.map((q, i) => (
        <Field key={i} label={`${i + 1}. ${q}`}>
          <textarea data-agent={`hs-x-playbook-answer-${i}`} rows={2} value={ans[i] ?? ''} onChange={(e) => setAns({ ...ans, [i]: e.target.value })} className={`${inputH} h-auto py-2 w-full`} />
        </Field>
      ))}
      {!qs.length && <div className="text-[13px] text-[#516F90]">This playbook has no questions yet — edit it to add some.</div>}
    </Modal>
  )
}

/* ───────────────────────── lead scoring ───────────────────────── */

const SCORE_PROPS: Record<string, { label: string; values: string[] }> = {
  webinarStatus: { label: 'Webinar attendance status', values: ['Attended', 'Registered'] },
  lifecycleStage: { label: 'Lifecycle stage', values: ['Subscriber', 'Lead', 'Marketing Qualified Lead', 'Sales Qualified Lead', 'Opportunity', 'Customer'] },
  leadStatus: { label: 'Lead status', values: ['New', 'Open', 'In Progress', 'Attempted to contact', 'Connected'] },
  country: { label: 'Country/Region', values: ['United States', 'Canada', 'United Kingdom'] },
}
const scoreOf = (c: any, rules: any[]) => rules.filter((r) => r.enabled && c[r.property] === r.value).reduce((t, r) => t + (r.group === 'Negative' ? -Math.abs(r.points) : Math.abs(r.points)), 0)

function LeadScoringPage() {
  const { open, toast } = useHNav()
  const { isAgent } = useDesk()
  const rules = useCollection<any>('hubspot.scoringRules')
  const contacts = useCollection<any>('hubspot.contacts')
  const scored = useMemo(() => contacts.map((c) => ({ c, s: scoreOf(c, rules) })).sort((a, b) => b.s - a.s), [contacts, rules])
  const edit = (r?: any) => open(<RuleModal rule={r} onClose={() => open(null)} />)
  const apply = () => {
    for (const { c, s } of scored) if (c.leadScore !== s) db.update('hubspot.contacts', c.id, { leadScore: s })
    toast(`Scores recalculated for ${scored.length} contacts.`)
  }
  return (
    <div className="min-h-full bg-[#F5F8FA]" data-agent="hs-x-page-leadScoring">
      <PageHead title="Lead Scoring" sub="Score contacts on fit and engagement so sales works the best leads first." right={<><HBtn small variant="ghost" agent="hs-x-score-apply" disabled={!rules.length} onClick={apply}>Recalculate scores</HBtn><HBtn small variant="primary" agent="hs-x-score-create" onClick={() => edit()}><Plus size={14} /> Add criteria</HBtn></>} />
      <div className="p-6 grid grid-cols-[1.3fr_1fr] gap-4">
        <div className="bg-white border border-[#DFE3EB] rounded-[4px]">
          <div className="px-4 h-11 flex items-center border-b border-[#DFE3EB] font-semibold">Scoring criteria ({rules.length})</div>
          <table className="w-full">
            <thead><tr>{['On', 'Criteria', 'Group', 'Points', ''].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id}>
                  <td className={td}><input type="checkbox" aria-label={`Toggle ${r.name}`} data-agent={`hs-x-score-toggle-${r.id}`} checked={!!r.enabled} onChange={() => db.update('hubspot.scoringRules', r.id, { enabled: !r.enabled, updatedBy: isAgent ? 'hworker' : undefined })} className="accent-[#FF5C35]" /></td>
                  <td className={td}><HLink onClick={() => edit(r)}>{r.name}</HLink><div className="text-[12px] text-[#516F90]">{SCORE_PROPS[r.property]?.label ?? r.property} is {r.value}</div></td>
                  <td className={td}><Pill color={r.group === 'Negative' ? '#FDEDEE' : '#E5F8F6'} text={r.group === 'Negative' ? '#C93B44' : '#00826F'}>{r.group}</Pill></td>
                  <td className={`${td} font-semibold`}>{r.group === 'Negative' ? '−' : '+'}{Math.abs(r.points)}</td>
                  <td className={td}><button aria-label="Delete criteria" onClick={() => db.remove('hubspot.scoringRules', r.id)} className="text-[#7C98B6] hover:text-[#C93B44]"><Trash2 size={14} /></button></td>
                </tr>
              ))}
              {!rules.length && <tr><td colSpan={5} className="px-3 py-10 text-center text-[13px] text-[#516F90]">No scoring criteria yet.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="bg-white border border-[#DFE3EB] rounded-[4px]">
          <div className="px-4 h-11 flex items-center border-b border-[#DFE3EB] font-semibold">Highest scoring contacts</div>
          {scored.slice(0, 10).map(({ c, s }) => (
            <div key={c.id} className="flex items-center gap-3 px-4 h-12 border-b border-[#EAF0F6] last:border-0">
              <Initials name={`${c.firstName} ${c.lastName}`} size={26} />
              <div className="flex-1 min-w-0"><div className="text-[13.5px] font-medium truncate">{c.firstName} {c.lastName}</div><div className="text-[12px] text-[#516F90] truncate">{c.company} · {c.lifecycleStage}</div></div>
              <div className="text-right"><div className="text-[16px] font-semibold">{s}</div><div className="text-[11px] text-[#7C98B6]">was {c.leadScore ?? 0}</div></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function RuleModal({ rule, onClose }: { rule?: any; onClose: () => void }) {
  const [v, setV] = useState<any>(rule ?? { name: '', group: 'Positive', property: 'webinarStatus', value: 'Attended', points: 10, enabled: true })
  const save = () => {
    const rec = { ...v, points: Number(v.points) || 0, name: v.name || `${SCORE_PROPS[v.property].label} is ${v.value}` }
    if (rule) db.update('hubspot.scoringRules', rule.id, rec)
    else db.insert('hubspot.scoringRules', { ...rec, id: uid('hsr') })
    onClose()
  }
  return (
    <Modal title={rule ? 'Edit criteria' : 'Add scoring criteria'} onClose={onClose} width={500} agent="hs-x-score-modal" footer={<><HBtn variant="primary" small agent="hs-x-score-save" onClick={save}>Save</HBtn><HBtn small onClick={onClose}>Cancel</HBtn></>}>
      <Field label="Name"><input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} className={`${inputH} w-full`} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Group"><select value={v.group} onChange={(e) => setV({ ...v, group: e.target.value })} className={`${inputH} w-full`}><option>Positive</option><option>Negative</option></select></Field>
        <Field label="Points"><input inputMode="numeric" value={v.points} onChange={(e) => setV({ ...v, points: e.target.value })} className={`${inputH} w-full`} /></Field>
      </div>
      <Field label="Property"><select value={v.property} onChange={(e) => setV({ ...v, property: e.target.value, value: SCORE_PROPS[e.target.value].values[0] })} className={`${inputH} w-full`}>{Object.entries(SCORE_PROPS).map(([k2, p]) => <option key={k2} value={k2}>{p.label}</option>)}</select></Field>
      <Field label="Is"><select value={v.value} onChange={(e) => setV({ ...v, value: e.target.value })} className={`${inputH} w-full`}>{SCORE_PROPS[v.property].values.map((x) => <option key={x}>{x}</option>)}</select></Field>
    </Modal>
  )
}

/* ───────────────────────── data model ───────────────────────── */

const OBJECTS: { key: string; label: string; col: string; route: HRoute; x: number; y: number; color: string }[] = [
  { key: 'contacts', label: 'Contacts', col: 'hubspot.contacts', route: { page: 'contacts' }, x: 60, y: 40, color: '#FF7A59' },
  { key: 'companies', label: 'Companies', col: 'hubspot.companies', route: { page: 'companies' }, x: 380, y: 40, color: '#6A78D1' },
  { key: 'deals', label: 'Deals', col: 'hubspot.deals', route: { page: 'deals' }, x: 700, y: 40, color: '#00BDA5' },
  { key: 'tickets', label: 'Tickets', col: 'hubspot.tickets', route: { page: 'tickets' }, x: 60, y: 250, color: '#F2547D' },
  { key: 'quotes', label: 'Quotes', col: 'hubspot.quotes', route: { page: 'quotes' }, x: 700, y: 250, color: '#FFB000' },
  { key: 'products', label: 'Products', col: 'hubspot.products', route: { page: 'products' }, x: 380, y: 250, color: '#00A4BD' },
]
const LINKS: [string, string, string][] = [['contacts', 'companies', 'Many to one'], ['companies', 'deals', 'One to many'], ['contacts', 'deals', 'Many to many'], ['contacts', 'tickets', 'Many to many'], ['deals', 'quotes', 'One to many'], ['quotes', 'products', 'Many to many (line items)']]

function DataModelPage() {
  const { go } = useHNav()
  const counts: Record<string, number> = {
    contacts: useCollection('hubspot.contacts').length,
    companies: useCollection('hubspot.companies').length,
    deals: useCollection('hubspot.deals').length,
    tickets: useCollection('hubspot.tickets').length,
    quotes: useCollection('hubspot.quotes').length,
    products: useCollection('hubspot.products').length,
  }
  const [sel, setSel] = useState('contacts')
  const pos = (k2: string) => OBJECTS.find((o) => o.key === k2)!
  const s = pos(sel)
  return (
    <div className="min-h-full bg-[#F5F8FA]" data-agent="hs-x-page-dataModel">
      <PageHead title="Data Model" sub="How your CRM objects relate to each other." />
      <div className="p-6 flex gap-4">
        <div className="flex-1 bg-white border border-[#DFE3EB] rounded-[4px] p-4 overflow-auto">
          <svg width={900} height={360} className="block">
            {LINKS.map(([a, b, lbl]) => {
              const A = pos(a), B = pos(b)
              const x1 = A.x + 70, y1 = A.y + 35, x2 = B.x + 70, y2 = B.y + 35
              const hl = a === sel || b === sel
              return (
                <g key={a + b}>
                  <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={hl ? '#0091AE' : '#CBD6E2'} strokeWidth={hl ? 2.5 : 1.5} />
                  <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 6} textAnchor="middle" fontSize={11} fill={hl ? '#0091AE' : '#7C98B6'}>{lbl}</text>
                </g>
              )
            })}
            {OBJECTS.map((o) => (
              <g key={o.key} onClick={() => setSel(o.key)} style={{ cursor: 'pointer' }} data-agent={`hs-x-object-${o.key}`}>
                <rect x={o.x} y={o.y} width={140} height={70} rx={6} fill="#fff" stroke={sel === o.key ? '#0091AE' : '#CBD6E2'} strokeWidth={sel === o.key ? 2.5 : 1.5} />
                <rect x={o.x} y={o.y} width={140} height={6} rx={3} fill={o.color} />
                <text x={o.x + 70} y={o.y + 34} textAnchor="middle" fontSize={14} fontWeight={600} fill="#33475B">{o.label}</text>
                <text x={o.x + 70} y={o.y + 54} textAnchor="middle" fontSize={12} fill="#516F90">{counts[o.key].toLocaleString()} records</text>
              </g>
            ))}
          </svg>
        </div>
        <div className="w-[280px] shrink-0 bg-white border border-[#DFE3EB] rounded-[4px] p-4 self-start">
          <div className="text-[16px] font-semibold">{s.label}</div>
          <div className="text-[13px] text-[#516F90] mt-1">{counts[sel].toLocaleString()} records</div>
          <div className="text-[12px] font-semibold uppercase text-[#516F90] mt-4 mb-1">Associations</div>
          {LINKS.filter(([a, b]) => a === sel || b === sel).map(([a, b, l]) => <div key={a + b} className="text-[13.5px] py-1">{pos(a === sel ? b : a).label} <span className="text-[#7C98B6]">· {l}</span></div>)}
          <div className="flex gap-2 mt-4">
            <HBtn small variant="primary" agent="hs-x-object-open" onClick={() => go(s.route)}>View records</HBtn>
            <HBtn small onClick={() => go({ page: 'properties' })}>Properties</HBtn>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ───────────────────────── data quality ───────────────────────── */

type Issue = { key: string; type: string; title: string; detail: string; fix: string; run: () => string }

function DataQualityPage() {
  const { toast, go } = useHNav()
  const { isAgent } = useDesk()
  const contacts = useCollection<any>('hubspot.contacts')
  const deals = useCollection<any>('hubspot.deals')
  const companies = useCollection<any>('hubspot.companies')
  const handled = useCollection<any>('hubspot.dataQuality')
  const [tab, setTab] = useState<'open' | 'resolved'>('open')
  const today = isoDate(new Date())
  const done = new Map(handled.map((h) => [h.id, h]))
  const issues: Issue[] = useMemo(() => {
    const out: Issue[] = []
    for (const d of deals.filter((x) => isOpenDeal(x) && x.closeDate && x.closeDate < today))
      out.push({ key: `close-${d.id}`, type: 'Deals', title: `${d.name} has a close date in the past`, detail: `Close date ${hsDate(d.closeDate)} · still in ${d.stage}`, fix: 'Move to end of month', run: () => { const e = new Date(); db.update('hubspot.deals', d.id, { closeDate: isoDate(new Date(e.getFullYear(), e.getMonth() + 1, 0)) }); return `Close date for ${d.name} moved to end of month.` } })
    for (const c of contacts.filter((x) => x.leadStatus === 'New' && !(x.sequences ?? []).length && x.lifecycleStage !== 'Customer'))
      out.push({ key: `unworked-${c.id}`, type: 'Contacts', title: `${c.firstName} ${c.lastName} is a new lead nobody has worked`, detail: `${c.company} · ${c.lifecycleStage} · owner ${person(c.ownerId).name}`, fix: 'Create follow-up task', run: () => { createTask({ title: `Reach out to ${c.firstName} ${c.lastName}`, type: 'Call', dueDate: isoDate(new Date(Date.now() + 86400000)), priority: 'Medium', ownerId: c.ownerId, contactId: c.id }); return `Task created for ${person(c.ownerId).name}.` } })
    for (const co of companies.filter((x) => !x.domain))
      out.push({ key: `domain-${co.id}`, type: 'Companies', title: `${co.name} is missing a domain`, detail: 'Domains are used to auto-associate contacts.', fix: 'Fill from name', run: () => { db.update('hubspot.companies', co.id, { domain: co.name.toLowerCase().replace(/[^a-z]/g, '').slice(0, 14) + '.com' }); return `Domain added to ${co.name}.` } })
    const seen = new Map<string, any>()
    for (const c of contacts) {
      const k2 = `${c.firstName} ${c.lastName}`.toLowerCase()
      if (seen.has(k2)) out.push({ key: `dup-${c.id}`, type: 'Contacts', title: `Possible duplicate: ${c.firstName} ${c.lastName}`, detail: `${seen.get(k2).email} and ${c.email}`, fix: 'Review records', run: () => { go({ page: 'contact', id: c.id }); return '' } })
      else seen.set(k2, c)
    }
    return out
  }, [contacts, deals, companies, today])
  const open = issues.filter((i) => !done.has(i.key))
  const resolved = handled
  const mark = (i: Issue, status: 'Fixed' | 'Dismissed', msg: string) => {
    db.upsert('hubspot.dataQuality', { id: i.key, status, title: i.title, type: i.type, at: nowIso(), by: isAgent ? 'hworker' : ME.id })
    if (msg) toast(msg)
  }
  const types = ['Deals', 'Contacts', 'Companies']
  return (
    <div className="min-h-full bg-[#F5F8FA]" data-agent="hs-x-page-dataQuality">
      <PageHead title="Data Quality" sub="Find and fix issues in your CRM data before they cause problems." right={open.length > 0 ? <HBtn small variant="primary" agent="hs-x-dq-fix-all" onClick={() => { const fixable = open.filter((i) => !i.key.startsWith('dup-')); fixable.forEach((i) => mark(i, 'Fixed', i.run() && '')); toast(`${fixable.length} issues fixed.`) }}>Fix all ({open.filter((i) => !i.key.startsWith('dup-')).length})</HBtn> : undefined} />
      <Kpis items={[['Open issues', String(open.length)], ...types.map((t) => [t, String(open.filter((i) => i.type === t).length), 'issues'] as [string, string, string])]} />
      <div className="m-6 bg-white border border-[#DFE3EB] rounded-[4px]">
        <div className="flex gap-6 px-4 border-b border-[#DFE3EB] text-[14px]">
          {(['open', 'resolved'] as const).map((t) => <button key={t} data-agent={`hs-x-dq-tab-${t}`} onClick={() => setTab(t)} className={`h-11 relative ${tab === t ? 'font-semibold' : 'text-[#516F90]'}`}>{t === 'open' ? `Issues (${open.length})` : `Resolved (${resolved.length})`}{tab === t && <span className="absolute left-0 right-0 bottom-0 h-[3px] bg-[#33475B]" />}</button>)}
        </div>
        {tab === 'open'
          ? open.map((i) => (
              <div key={i.key} className="flex items-center gap-3 px-4 py-3 border-b border-[#EAF0F6]">
                <Pill>{i.type}</Pill>
                <div className="flex-1 min-w-0"><div className="text-[13.5px] font-medium">{i.title}</div><div className="text-[12.5px] text-[#516F90]">{i.detail}</div></div>
                <HBtn small agent={`hs-x-dq-fix-${i.key}`} onClick={() => { const m = i.run(); if (!i.key.startsWith('dup-')) mark(i, 'Fixed', m) }}>{i.fix}</HBtn>
                <button data-agent={`hs-x-dq-dismiss-${i.key}`} onClick={() => mark(i, 'Dismissed', 'Issue dismissed.')} className="text-[13px] text-[#516F90] hover:underline">Dismiss</button>
              </div>
            ))
          : resolved.map((h) => (
              <div key={h.id} className="flex items-center gap-3 px-4 py-3 border-b border-[#EAF0F6]">
                <span className="w-6 h-6 rounded-full bg-[#E5F8F6] text-[#00826F] flex items-center justify-center"><Check size={14} /></span>
                <div className="flex-1 min-w-0"><div className="text-[13.5px]">{h.title}</div><div className="text-[12px] text-[#516F90]">{h.status} · {hsDate(h.at, true)}</div></div>
                <button onClick={() => db.remove('hubspot.dataQuality', h.id)} className="text-[13px] text-[#0091AE] hover:underline">Reopen</button>
              </div>
            ))}
        {tab === 'open' && !open.length && <div className="p-10 text-center text-[13.5px] text-[#516F90]">No data quality issues. Nice work!</div>}
        {tab === 'resolved' && !resolved.length && <div className="p-10 text-center text-[13.5px] text-[#516F90]">Nothing resolved yet.</div>}
      </div>
    </div>
  )
}

