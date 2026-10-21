/**
 * Teams seed.
 *
 * teams.chats:    { id ('chat-<personId>' for 1:1, else any), kind: 'oneOnOne'|'group'|'meeting', members: personId[], title?, pinned?, muted? }
 * teams.teams:    { id, name, color, initials, description, channels: { id, name, pinned? }[] }
 * teams.messages: { id, conversationId (chat id or channel id), from (person id), text, date, createdBy?: 'hworker',
 *                   subject? (channel posts), parentId? (channel replies), reactions?: { emoji, count }[], important? }
 * teams.activity: { id, kind: 'mention'|'reply'|'reaction'|'missed'|'channel'|'assigned', from, text, preview, conversationId, date, read }
 */
import { PEOPLE } from '@/data/people'
import { daysAgo, hoursAgo, minutesAgo, today } from '@/data/time'

export const TEAMS_PRESENCE: Record<string, 'available' | 'busy' | 'away' | 'dnd' | 'offline'> = {
  alex: 'available', priya: 'busy', david: 'dnd', sofia: 'available', marcus: 'away', emma: 'available', james: 'away', nina: 'offline',
  oliver: 'busy', grace: 'available', liam: 'available', rachel: 'busy', chen: 'available', tom: 'away', aisha: 'available', lucas: 'available',
  hannah: 'offline', ben: 'available', maya: 'busy', ryan: 'available', jordan: 'offline',
}

let n = 0
const m = (conversationId: string, from: string, text: string, date: string, extra: Record<string, any> = {}) => ({ id: `tm-${++n}`, conversationId, from, text, date, ...extra })

export function teamsSeed() {
  n = 0
  const internal = PEOPLE.filter((p) => !p.external)
  const chats: any[] = internal.map((p) => ({
    id: `chat-${p.id}`,
    kind: 'oneOnOne',
    members: p.id === 'alex' ? ['alex'] : ['alex', p.id],
    pinned: ['priya', 'ben', 'maya'].includes(p.id),
    unread: ['priya', 'ben', 'oliver', 'liam', 'aisha', 'jordan'].includes(p.id),
  }))
  chats.push(
    { id: 'chat-g-peak', kind: 'group', title: 'Peak season war room', members: ['alex', 'priya', 'ben', 'maya', 'lucas'], pinned: true },
    { id: 'chat-g-budget', kind: 'group', title: 'FY26 budget — Ops', members: ['alex', 'sofia', 'priya'] },
    { id: 'chat-m-opsreview', kind: 'meeting', title: 'Ops review (monthly)', members: ['alex', 'priya', 'david', 'ben', 'sofia'] },
    { id: 'chat-g-onboarding', kind: 'group', title: 'Jordan onboarding', members: ['alex', 'james', 'oliver', 'ben'] },
  )

  const teams = [
    { id: 't-ops', name: 'Northwind Operations', color: '#107C10', initials: 'NO', description: 'Day-to-day operations: fulfillment, warehouses, carriers and vendors.', channels: [{ id: 'operations-team', name: 'Operations Team', pinned: true }, { id: 'ops-general', name: 'General' }, { id: 'warehouse-logistics', name: 'Warehouse & Logistics' }, { id: 'vendor-management', name: 'Vendor Management' }] },
    { id: 't-ops-lead', name: 'Ops Leadership', color: '#8764B8', initials: 'OL', description: 'Private team for the operations leadership group.', channels: [{ id: 'ops-leadership', name: 'General' }, { id: 'ops-lead-planning', name: 'Q4 Planning' }] },
    { id: 't-finance', name: 'Finance', color: '#CA5010', initials: 'FI', description: 'Finance, AP/AR and FP&A.', channels: [{ id: 'finance-general', name: 'General' }, { id: 'finance-ap', name: 'Accounts Payable' }, { id: 'finance-fpa', name: 'FP&A' }] },
    { id: 't-it', name: 'IT', color: '#4F6BED', initials: 'IT', description: 'IT announcements, service desk and change management.', channels: [{ id: 'it-general', name: 'General' }, { id: 'it-service-desk', name: 'IT Service Desk' }, { id: 'it-changes', name: 'Change Advisory Board' }] },
    { id: 't-sales', name: 'Sales', color: '#D13438', initials: 'SA', description: 'Sales team, deals and customer escalations.', channels: [{ id: 'sales-general', name: 'General' }, { id: 'sales-team', name: 'Sales Team' }] },
    { id: 't-northwind', name: 'Northwind Global', color: '#0F6CBD', initials: 'NG', description: 'Org-wide team for everyone at Northwind Global.', channels: [{ id: 'general', name: 'General' }, { id: 'announcements', name: 'Announcements' }] },
  ]

  const msgs: any[] = [
    // ── 1:1 chats ──
    m('chat-priya', 'priya', 'Morning! Are we still good for our 1:1 at 4?', daysAgo(1, 8, 42)),
    m('chat-priya', 'alex', 'Yes — I’ll bring the peak staffing numbers.', daysAgo(1, 8, 50)),
    m('chat-priya', 'priya', 'Perfect. Also sent you a note about the Q3 vendor spend summary for Thursday — table + a few bullets is plenty.', hoursAgo(2.1)),
    m('chat-priya', 'priya', 'And if you can, drop me a quick stand-up recap after the 9:00 — David asked how Atlanta is trending.', hoursAgo(1.6)),
    m('chat-ben', 'ben', 'Atlanta DC backlog is down to 128 backorders from 184 yesterday. Still the worst in the network but moving.', hoursAgo(3.2)),
    m('chat-ben', 'alex', 'Nice. What’s driving it?', hoursAgo(3.1)),
    m('chat-ben', 'ben', 'Mostly the XPO linehaul delays — 2 trailers arrived 14h late Monday. XPO on-time is 85.3% this week vs 88% target. I opened a carrier claim.', hoursAgo(3.0)),
    m('chat-ben', 'ben', 'Also: Warehouse SLA report for September is in Downloads (Warehouse_SLA_Sep.xlsx). Dallas and Ontario missed the 98% target.', hoursAgo(2.4)),
    m('chat-maya', 'maya', 'Temp labor update: Columbus agency confirmed 45 seasonal associates starting Nov 3, Reno 30 starting Nov 10.', hoursAgo(2.8)),
    m('chat-maya', 'maya', 'One blocker — badge printer at Reno is down, IT ticket INC0012931 is open. Oliver says fix by Thursday.', hoursAgo(2.7)),
    m('chat-maya', 'alex', 'Thanks Maya, I’ll flag it in stand-up.', hoursAgo(2.6)),
    m('chat-sofia', 'sofia', 'Reminder: FY26 budget template (Operations tab) is due Wednesday EOD 🙏', daysAgo(1, 15, 10)),
    m('chat-sofia', 'alex', 'On it — will have the justification column filled by tomorrow.', daysAgo(1, 15, 22)),
    m('chat-david', 'david', 'Great work on the carrier renegotiation. Let’s make sure leadership sees the weekly KPI numbers every Monday.', daysAgo(2, 17, 5)),
    m('chat-oliver', 'oliver', 'FYI the VPN issues this morning were the Boston concentrator — failover done, monitoring.', hoursAgo(1.1)),
    m('chat-lucas', 'lucas', 'Fabrikam QBR deck is in the Procurement folder if you want to reuse slides.', daysAgo(3, 11, 30)),
    m('chat-james', 'james', 'Jordan’s Workday hire is complete. Laptop + access requests next!', hoursAgo(19)),
    m('chat-emma', 'emma', 'Got the Fabrikam invoice INV-20931 — waiting on GR before I can post.', hoursAgo(2.9)),
    m('chat-liam', 'liam', 'Elena loved the walkthrough, thanks for jumping on 🙌', hoursAgo(1.4)),
    m('chat-grace', 'grace', 'Can you join CAB on Thursday for the WMS upgrade?', daysAgo(1, 13, 0)),
    m('chat-rachel', 'rachel', 'Contoso renewal needs a delivery SLA commitment from ops — can we talk tomorrow?', daysAgo(2, 10, 15)),
    m('chat-chen', 'chen', 'The order-exception API is ready for the triage pilot in staging.', daysAgo(4, 16, 40)),
    m('chat-tom', 'tom', 'Sprint review moved to Friday 2pm.', daysAgo(5, 9, 5)),
    m('chat-aisha', 'aisha', 'Two Contoso tickets about late deliveries from Atlanta — any ETA I can share?', hoursAgo(4.5)),
    m('chat-hannah', 'hannah', 'Need a quote from ops for the Q4 customer newsletter 📰', daysAgo(6, 12, 0)),
    m('chat-ryan', 'ryan', 'Closed the scanner firmware ticket for Chicago.', daysAgo(3, 15, 0)),
    m('chat-nina', 'nina', 'Thanks for the feedback on the onboarding survey!', daysAgo(8, 10, 0)),
    m('chat-marcus', 'marcus', 'Q3 close looks clean. Thanks for the quick accruals.', daysAgo(7, 17, 30)),
    m('chat-jordan', 'jordan', 'Hi Alex! Really looking forward to Monday. Anything I should read beforehand?', daysAgo(1, 19, 2)),
    m('chat-alex', 'alex', 'Notes to self: confirm Reno badge printer, chase XPO claim, budget template by Wed.', daysAgo(1, 7, 30)),
    // ── group chats ──
    m('chat-g-peak', 'priya', 'Peak forecast is now +18% vs last year. Let’s lock carrier capacity by Oct 31.', daysAgo(1, 10, 0)),
    m('chat-g-peak', 'lucas', 'UPS and FedEx commitments signed. XPO still negotiating surge pricing.', daysAgo(1, 10, 22)),
    m('chat-g-peak', 'ben', 'I’ll model the overflow scenario if XPO can’t commit.', hoursAgo(5)),
    m('chat-g-budget', 'sofia', 'Ops total request is +4.6% vs FY25 forecast — can we get it under 4%?', daysAgo(1, 16, 0)),
    m('chat-m-opsreview', 'priya', 'Agenda for Thursday: KPI scorecard, vendor spend, peak readiness.', daysAgo(2, 9, 0)),
    m('chat-g-onboarding', 'oliver', 'Laptop imaging for Jordan scheduled Friday.', hoursAgo(18)),

    // ── channels ──
    m('operations-team', 'ben', 'Fulfillment status: 19,612 orders shipped last week, on-time 96.4%. Atlanta still lagging at 91.8% because of XPO linehaul delays.', hoursAgo(3.4), { subject: 'Daily stand-up — fulfillment', reactions: [{ emoji: '👍', count: 4 }] }),
    m('operations-team', 'maya', 'Reno badge printer down (INC0012931) — blocks seasonal onboarding on Nov 10 if not fixed by Thursday.', hoursAgo(3.2), { parentId: 'tm-PARENT1' }),
    m('operations-team', 'maya', 'Labor: 45 seasonal associates confirmed for Columbus (Nov 3) and 30 for Reno (Nov 10). Training rooms booked.', hoursAgo(2.9), { subject: 'Daily stand-up — warehouse & labor', reactions: [{ emoji: '🎉', count: 3 }] }),
    m('operations-team', 'ben', 'Backorders down to 287 network-wide (from 412). Atlanta 128 is the biggest bucket.', hoursAgo(2.8), { parentId: 'tm-PARENT2' }),
    m('operations-team', 'lucas', 'Vendor: Fabrikam corrected invoices INV-21007 and INV-21044 received; $8,240 credit memo still pending.', hoursAgo(2.5), { subject: 'Daily stand-up — vendors', reactions: [{ emoji: '👀', count: 2 }] }),
    m('operations-team', 'priya', 'Reminder: ops review Thursday 10:00. Please have Q3 numbers final by Wednesday.', daysAgo(1, 9, 30), { subject: 'Ops review prep', important: true }),
    m('operations-team', 'ben', 'Will do. Warehouse SLA for September: network 97.3%, Dallas and Ontario below target.', daysAgo(1, 9, 48), { parentId: 'tm-PARENT3' }),
    m('ops-general', 'priya', 'Welcome Jordan Ellis who joins us Monday as Operations Analyst! 👋', hoursAgo(20), { subject: 'New team member' }),
    m('warehouse-logistics', 'ben', 'Carrier scorecard week 42: UPS 97.1%, FedEx 96.6%, XPO 85.3%, Old Dominion 93.9%.', daysAgo(1, 14, 0), { subject: 'Carrier scorecard W42' }),
    m('vendor-management', 'lucas', 'Packaging vendor consolidation RFP goes out Friday (5 → 3 suppliers).', daysAgo(2, 11, 0), { subject: 'Packaging RFP' }),
    m('ops-leadership', 'david', 'Leadership — please review the weekly KPI dashboard before Monday staff. I want to see OTD and cost per order trends every week.', daysAgo(3, 8, 0), { subject: 'Weekly KPI cadence', important: true }),
    m('ops-leadership', 'priya', 'Peak readiness: carrier capacity 80% locked, temp labor 100% sourced, WMS upgrade on track for Nov 2.', daysAgo(1, 17, 0), { subject: 'Peak readiness update' }),
    m('ops-lead-planning', 'priya', 'Draft Q4 priorities doc is up in Files — comments by Friday.', daysAgo(4, 10, 0), { subject: 'Q4 priorities draft' }),
    m('finance-ap', 'emma', 'AP run Thursday. 14 invoices pending GR — list in Files. Fabrikam INV-20931 ($14,250) included once GR posts.', hoursAgo(6), { subject: 'Thursday payment run' }),
    m('finance-ap', 'sofia', 'Please make sure all Q3 accruals are reversed by the 25th.', daysAgo(2, 9, 0), { subject: 'Accrual reversals' }),
    m('finance-general', 'marcus', 'Q3 close complete — thanks all. FY26 budget kickoff next week.', daysAgo(5, 16, 0), { subject: 'Q3 close' }),
    m('finance-fpa', 'sofia', 'FY26 budget templates are out; ops due Wednesday.', daysAgo(4, 9, 0), { subject: 'FY26 templates' }),
    m('it-service-desk', 'oliver', 'VPN concentrator in Boston failed over at 7:40am. 12 incidents in the queue — triaging now.', hoursAgo(1.3), { subject: 'VPN disruption — Boston', important: true, reactions: [{ emoji: '😮', count: 5 }] }),
    m('it-service-desk', 'grace', 'Thanks Oliver. Post an all-clear once monitoring is green for 30 min.', hoursAgo(1.2), { parentId: 'tm-PARENT4' }),
    m('it-general', 'grace', 'Windows 11 24H2 rollout wave 3 starts Monday.', daysAgo(3, 12, 0), { subject: 'Windows rollout' }),
    m('it-changes', 'grace', 'CAB Thursday: WMS upgrade (Manhattan Active 2025.10) — ops sign-off required.', daysAgo(1, 13, 5), { subject: 'CAB agenda' }),
    m('sales-team', 'liam', 'Adatum walkthrough went great — pricing + rollout plan going out today.', hoursAgo(1.5), { subject: 'Adatum update', reactions: [{ emoji: '🔥', count: 6 }] }),
    m('sales-team', 'rachel', 'Contoso renewal: 3-year term verbally agreed. Docusign this week.', daysAgo(1, 16, 30), { subject: 'Contoso renewal' }),
    m('sales-general', 'rachel', 'Q4 kickoff deck is in Files.', daysAgo(6, 9, 0), { subject: 'Q4 kickoff' }),
    m('general', 'david', 'Q4 town hall this Friday at 4pm. Bring your questions!', daysAgo(2, 12, 0), { subject: 'Q4 Town hall', important: true, reactions: [{ emoji: '👍', count: 42 }, { emoji: '❤️', count: 11 }] }),
    m('general', 'nina', 'Open enrollment for 2026 benefits starts Nov 1 in Workday.', daysAgo(4, 10, 0), { subject: 'Open enrollment' }),
    m('announcements', 'hannah', 'New brand templates for PowerPoint and Word are available in the Office template picker.', daysAgo(7, 11, 0), { subject: 'New templates' }),
  ]
  // wire replies to their parent posts (the post directly before them in the same channel)
  for (let i = 0; i < msgs.length; i++) {
    if (msgs[i].parentId?.startsWith('tm-PARENT')) {
      for (let j = i - 1; j >= 0; j--) if (msgs[j].conversationId === msgs[i].conversationId && !msgs[j].parentId) {
        msgs[i].parentId = msgs[j].id
        break
      }
    }
  }

  const activity = [
    { id: 'ta-1', kind: 'mention', from: 'priya', text: 'mentioned you in Operations Team', preview: '@Alex can you post the stand-up summary here today?', conversationId: 'operations-team', date: hoursAgo(1.5), read: false },
    { id: 'ta-2', kind: 'reply', from: 'ben', text: 'replied to your message', preview: 'Backorders down to 287 network-wide (from 412).', conversationId: 'operations-team', date: hoursAgo(2.8), read: false },
    { id: 'ta-3', kind: 'reaction', from: 'maya', text: 'reacted 👍 to your message', preview: 'Thanks Maya, I’ll flag it in stand-up.', conversationId: 'chat-maya', date: hoursAgo(2.5), read: false },
    { id: 'ta-4', kind: 'channel', from: 'oliver', text: 'posted in IT Service Desk', preview: 'VPN concentrator in Boston failed over at 7:40am…', conversationId: 'it-service-desk', date: hoursAgo(1.3), read: true },
    { id: 'ta-5', kind: 'missed', from: 'rachel', text: 'Missed call', preview: 'Rachel Goldberg tried to call you', conversationId: 'chat-rachel', date: daysAgo(1, 11, 12), read: true },
    { id: 'ta-6', kind: 'mention', from: 'david', text: 'mentioned you in Ops Leadership', preview: 'Leadership — please review the weekly KPI dashboard before Monday staff…', conversationId: 'ops-leadership', date: daysAgo(3, 8, 0), read: true },
    { id: 'ta-7', kind: 'assigned', from: 'sofia', text: 'assigned you a task in Planner', preview: 'Complete FY26 budget template (Operations)', conversationId: 'chat-sofia', date: daysAgo(1, 15, 12), read: true },
    { id: 'ta-8', kind: 'reply', from: 'emma', text: 'replied in Accounts Payable', preview: 'AP run Thursday. 14 invoices pending GR…', conversationId: 'finance-ap', date: hoursAgo(6), read: true },
  ]
  void today
  void minutesAgo
  return { 'teams.chats': chats, 'teams.teams': teams, 'teams.messages': msgs, 'teams.activity': activity }
}
