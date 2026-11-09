import type { Workflow } from '@/agent/types'
import { db } from '@/db/db'
import { isoDate } from '@/data/time'
import { person } from '@/data/people'

/** next occurrence of weekday (0=Sun) at least `minDays` from today */
export function nextWeekday(dow: number, minDays = 1) {
  const d = new Date()
  d.setDate(d.getDate() + minDays)
  while (d.getDay() !== dow) d.setDate(d.getDate() + 1)
  return d
}
const fmtDay = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

/** id of the newest email in a folder matching a predicate (for result deep links) */
export function newestEmail(pred: (e: any) => boolean) {
  return db
    .get<any>('outlook.emails')
    .filter(pred)
    .sort((a, b) => +new Date(b.date) - +new Date(a.date))[0]?.id
}

export const workflows: Workflow[] = [
  {
    id: 'outlook-meeting-followup',
    title: 'Reply to a customer follow-up',
    description: 'Reads the customer’s request, checks your calendar for open slots, and sends a complete reply with pricing, timeline and meeting options.',
    category: 'Sales',
    apps: ['outlook'],
    timeSaved: '25 min',
    featured: true,
    keywords: ['follow up', 'follow-up', 'reply', 'elena', 'adatum', 'pricing', 'meeting slots', 'respond', 'email', 'customer'],
    examples: ['Reply to Elena with pricing and meeting slots', 'Answer the Adatum follow-up email'],
    nudge: () => {
      const e = db.find<any>('outlook.emails', 'em-elena-followup')
      const replied = db.get<any>('outlook.emails').some((x) => x.replyTo === 'em-elena-followup')
      return e && !replied ? 'Elena Rossi (Adatum) is waiting on pricing and meeting times' : null
    },
    plan: ['Read Elena’s email and extract her three asks', 'Check your calendar for free slots next week', { text: 'Draft a reply with pricing, rollout timeline and times', via: 'cua', model: 'large', why: 'A client-facing reply that has to answer three asks correctly — written by the large model.' }, 'Send the reply and keep Liam in copy'],
    async run(a) {
      a.step(0)
      await a.open('outlook')
      await a.click('@outlook-folder-inbox', { label: 'Inbox' })
      await a.click('@outlook-email-em-elena-followup', { label: 'Follow-up from today’s call — Elena Rossi' })
      await a.think('Elena needs three things: 250-seat Enterprise pricing with a multi-year option, a rollout timeline for Milan and Rotterdam, and two 30-minute slots with her CIO next week.', 1800)

      a.step(1)
      await a.click('@outlook-nav-calendar', { label: 'Calendar' })
      await a.click('@outlook-cal-next', { label: 'Next week' })
      const tue = nextWeekday(2, 5)
      const thu = nextWeekday(4, 5)
      await a.think(`Next week is mostly open. ${fmtDay(tue)} at 2:00 PM and ${fmtDay(thu)} at 10:00 AM are both free for 30 minutes.`, 1500)

      a.step(2)
      await a.click('@outlook-nav-mail', { label: 'Mail' })
      await a.click('@outlook-email-em-elena-followup')
      await a.click('@outlook-reply-all', { label: 'Reply all' })
      await a.type(
        '@outlook-compose-body',
        `Hi Elena,\n\nThank you — it was great to walk your team through the platform this morning. Here is everything for the steering committee:\n\n1. Pricing (250 seats, Enterprise tier)\n   • Annual: $186,000 / year ($62 per seat per month)\n   • 3-year commitment: $158,100 / year (15% multi-year discount, price locked)\n\n2. Proposed rollout\n   • Weeks 1–2: Milan pilot (40 users), SSO + data migration\n   • Weeks 3–6: Milan full rollout, admin training\n   • Weeks 7–10: Rotterdam rollout, go-live review\n\n3. Follow-up with Marco (30 min, Teams)\n   • ${fmtDay(tue)}, 2:00–2:30 PM ET\n   • ${fmtDay(thu)}, 10:00–10:30 AM ET\n\nJust let me know which slot works and I’ll send the invite. Happy to adjust anything ahead of the committee.`,
        { label: 'message body' },
      )

      a.step(3)
      await a.approve('Send this reply to Elena Rossi (adatum.com — external)?', 'To: Elena Rossi <elena.rossi@adatum.com>\nCc: Liam O’Connor\nSubject: RE: Follow-up from today’s call — pricing & rollout timeline')
      await a.click('@outlook-send', { label: 'Send' })
      await a.wait(900)
      const id = newestEmail((e) => e.folder === 'sent' && e.replyTo === 'em-elena-followup')
      return {
        summary: 'Replied to Elena Rossi with 250-seat pricing (annual and 3-year), a 10-week rollout plan, and two meeting slots. Liam was kept in copy.',
        outputs: [
          { label: 'View the sent reply', appId: 'outlook', params: { view: 'mail', folder: 'sent', emailId: id } },
          { label: 'Open the original email', appId: 'outlook', params: { view: 'mail', emailId: 'em-elena-followup' } },
        ],
        metrics: [
          { label: 'Asks answered', value: '3/3' },
          { label: 'Slots proposed', value: '2' },
          { label: 'Minutes saved', value: '25' },
        ],
      }
    },
  },
  {
    id: 'outlook-schedule-meeting',
    title: 'Schedule a meeting with attendees',
    description: 'Finds a free slot, creates a Teams meeting with an agenda, and sends the invitation.',
    category: 'Communication',
    apps: ['outlook', 'teams'],
    timeSaved: '10 min',
    keywords: ['schedule', 'meeting', 'invite', 'calendar', 'book', 'set up a call', 'marco', 'cio'],
    examples: ['Schedule a call with Elena and Marco next Tuesday', 'Book a meeting'],
    inputs: [
      { key: 'title', label: 'Meeting title', type: 'text', default: 'Adatum × Northwind — CIO follow-up' },
      { key: 'attendees', label: 'Attendees (emails, comma-separated)', type: 'text', default: `${person('elena').email}, ${person('liam').email}` },
      { key: 'time', label: 'Start time', type: 'select', default: '14:00', options: [{ value: '10:00', label: '10:00 AM' }, { value: '14:00', label: '2:00 PM' }, { value: '15:30', label: '3:30 PM' }] },
    ],
    plan: ['Open Outlook calendar', 'Pick a free slot next week', 'Create the Teams meeting with agenda', 'Send the invitation'],
    async run(a, inp) {
      a.step(0)
      await a.open('outlook')
      await a.click('@outlook-nav-calendar', { label: 'Calendar' })
      a.step(1)
      await a.click('@outlook-cal-next', { label: 'Next week' })
      const day = nextWeekday(2, 5)
      await a.think(`${fmtDay(day)} has a free block in the afternoon — booking it.`, 1200)
      a.step(2)
      await a.click('@outlook-new-event', { label: 'New event' })
      await a.type('@outlook-event-title', inp.title)
      for (const email of String(inp.attendees).split(',').map((s) => s.trim()).filter(Boolean)) {
        await a.type('@outlook-event-attendees', email, { fast: true })
        await a.press('Enter')
      }
      await a.type('@outlook-event-date', isoDate(day), { label: 'Date' })
      await a.select('@outlook-event-start', inp.time, { label: 'Start time' })
      const [h, m] = String(inp.time).split(':').map(Number)
      const endMins = h * 60 + m + 30
      await a.select('@outlook-event-end', `${String(Math.floor(endMins / 60)).padStart(2, '0')}:${endMins % 60 ? '30' : '00'}`, { label: 'End time' })
      await a.type('@outlook-event-body', 'Agenda\n• Recap of the operations walkthrough\n• Security & SSO requirements\n• Rollout plan for Milan and Rotterdam\n• Commercials and next steps', { label: 'description' })
      a.step(3)
      await a.click('@outlook-event-save', { label: 'Send' })
      await a.wait(800)
      const ev = db.get<any>('outlook.events').filter((e) => e.createdBy === 'hworker').sort((x, y) => (x.id < y.id ? 1 : -1))[0]
      return {
        summary: `Scheduled “${inp.title}” on ${fmtDay(day)} and sent the Teams invitation.`,
        outputs: [{ label: 'Open the meeting in Calendar', appId: 'outlook', params: { view: 'calendar', eventId: ev?.id } }],
        metrics: [{ label: 'Attendees', value: String(String(inp.attendees).split(',').length + 1) }, { label: 'Duration', value: '30m' }],
      }
    },
  },
  {
    id: 'outlook-inbox-triage',
    title: 'Triage my inbox',
    description: 'Goes through unread email, flags what needs you, files receipts, archives newsletters and sends you a one-page digest.',
    category: 'Operations',
    apps: ['outlook'],
    timeSaved: '30 min',
    featured: true,
    keywords: ['inbox', 'triage', 'clean up', 'emails', 'unread', 'digest', 'summarize my email', 'zero'],
    examples: ['Clean up my inbox', 'Summarize my unread email'],
    nudge: () => {
      const n = db.get<any>('outlook.emails').filter((e) => e.folder === 'inbox' && !e.read).length
      return n > 3 ? `You have ${n} unread emails — get a digest` : null
    },
    plan: ['Scan unread messages in Focused and Other', 'Flag the ones that need your decision', 'Archive newsletters and notifications', 'Send yourself a prioritized digest'],
    async run(a) {
      a.step(0)
      await a.open('outlook')
      await a.click('@outlook-folder-inbox', { label: 'Inbox' })
      const unread = db.get<any>('outlook.emails').filter((e) => e.folder === 'inbox' && !e.read && e.focused !== false)
      await a.think(`${unread.length} unread in Focused. Reading each to decide what needs Alex.`, 1200)
      const toFlag = ['em-invoice-fabrikam', 'em-kate-renewal', 'em-oliver-incidents', 'em-elena-followup']
      a.step(1)
      for (const id of toFlag) {
        if (!a.exists(`@outlook-email-${id}`)) continue
        await a.click(`@outlook-email-${id}`)
        await a.wait(500)
        await a.click('@outlook-flag', { label: 'Flag' })
      }
      a.step(2)
      await a.click('@outlook-pivot-other', { label: 'Other' })
      const other = db.get<any>('outlook.emails').filter((e) => e.folder === 'inbox' && e.focused === false)
      for (const e of other.slice(0, 4)) {
        await a.click(`@outlook-email-${e.id}`)
        await a.wait(300)
        await a.click('@outlook-archive', { label: 'Archive' })
      }
      a.step(3)
      await a.click('@outlook-pivot-focused', { label: 'Focused' })
      await a.click('@outlook-new-mail', { label: 'New mail' })
      await a.type('@outlook-compose-to', 'alex.morgan@northwind.com', { fast: true })
      await a.press('Enter')
      await a.type('@outlook-compose-subject', `Inbox digest — ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`)
      await a.type(
        '@outlook-compose-body',
        `Your inbox, prioritized:\n\nNEEDS YOU TODAY\n• Elena Rossi (Adatum) — wants pricing, rollout timeline, and CIO meeting slots\n• Kate Sullivan (Contoso) — ready to sign the 3-year renewal; send Docusign order form\n• Oliver Brooks — 12 unassigned VPN / SAP login incidents\n• Mike Harrington (Fabrikam) — invoice INV-20931 for $14,250 to post against PO 4500018234\n\nTHIS WEEK\n• Priya — Q3 vendor spend summary for Thursday’s ops review\n• James — Jordan Ellis starts Monday; onboarding tasks to kick off\n• Sofia — FY26 budget template (Operations tab) due Wednesday\n\nFILED\n• 4 receipts tagged “Receipts” — ready to expense in Concur\n• ${Math.min(4, other.length)} newsletters and notifications archived`,
        { label: 'message body' },
      )
      await a.click('@outlook-send')
      await a.wait(900)
      const id = newestEmail((e) => e.folder === 'sent' && e.subject.startsWith('Inbox digest'))
      return {
        summary: `Flagged ${toFlag.length} emails that need a decision, archived ${Math.min(4, other.length)} notifications, and sent you a prioritized digest.`,
        outputs: [
          { label: 'Read your inbox digest', appId: 'outlook', params: { view: 'mail', folder: 'sent', emailId: id } },
          { label: 'Open Inbox', appId: 'outlook', params: { view: 'mail', folder: 'inbox' } },
        ],
        metrics: [
          { label: 'Emails reviewed', value: String(unread.length + other.length) },
          { label: 'Flagged', value: String(toFlag.length) },
          { label: 'Archived', value: String(Math.min(4, other.length)) },
        ],
      }
    },
  },
]
