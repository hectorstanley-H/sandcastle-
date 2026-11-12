import { useEffect, useState } from 'react'
import { BookOpen, CheckCircle2, Inbox as InboxIcon, Lock, Mail, MessageCircle, RotateCcw, Search, Send, Ticket, User, Users } from 'lucide-react'
import { db, uid, useCollection, useRecord } from '@/db/db'
import { useDesk } from '@/os/context'
import { ME, person } from '@/data/people'
import { HBtn, HLink, HWTag, Initials, Modal, Pill, hsDate, inputH, useHNav } from './ui'
import { runWorkflows } from './store'
import { OWNERS } from './owners'

type View = 'unassigned' | 'mine' | 'open' | 'closed'
type Channel = 'All' | 'Chat' | 'Email'

const VIEWS: { key: View; label: string; icon: typeof InboxIcon; match: (c: any) => boolean }[] = [
  { key: 'unassigned', label: 'Unassigned', icon: Users, match: (c) => c.status === 'Open' && !c.ownerId },
  { key: 'mine', label: 'Assigned to me', icon: User, match: (c) => c.status === 'Open' && c.ownerId === ME.id },
  { key: 'open', label: 'All open', icon: InboxIcon, match: (c) => c.status === 'Open' },
  { key: 'closed', label: 'Closed', icon: CheckCircle2, match: (c) => c.status === 'Closed' },
]

/* view + channel survive route changes even if the router re-mounts the page per thread id */
let lastView: View = 'open'
let lastChannel: Channel = 'All'

const stColor: Record<string, [string, string]> = { New: ['#E5F5F8', '#007A8C'], 'Waiting on contact': ['#FFF4DC', '#9B6A00'], 'Waiting on us': ['#FDEDEE', '#C93B44'], Closed: ['#E5F8F6', '#00826F'] }

const relTime = (iso?: string) => {
  if (!iso) return ''
  const diff = Date.now() - +new Date(iso)
  const m = Math.round(diff / 60_000)
  if (m < 1) return 'Just now'
  if (m < 60) return `${m}m`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.round(h / 24)
  if (d < 7) return `${d}d`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const ChannelIcon = ({ channel, size = 13 }: { channel: string; size?: number }) => (channel === 'Email' ? <Mail size={size} className="text-[#7C98B6] shrink-0" aria-label="Email" /> : <MessageCircle size={size} className="text-[#7C98B6] shrink-0" aria-label="Chat" />)

const fullName = (c: any) => (c ? `${c.firstName} ${c.lastName}` : 'Unknown visitor')

export function InboxPage({ id }: { id?: string }) {
  const { go } = useHNav()
  const conversations = useCollection<any>('hubspot.conversations')
  const contacts = useCollection<any>('hubspot.contacts')
  const [view, setViewState] = useState<View>(lastView)
  const [channel, setChannelState] = useState<Channel>(lastChannel)
  const [q, setQ] = useState('')
  const setView = (v: View) => { lastView = v; setViewState(v) }
  const setChannel = (c: Channel) => { lastChannel = c; setChannelState(c) }

  const contact = (cid: string) => contacts.find((c) => c.id === cid)
  const inChannel = (c: any) => channel === 'All' || c.channel === channel
  const viewDef = VIEWS.find((v) => v.key === view)!
  const threads = conversations
    .filter((c) => viewDef.match(c) && inChannel(c))
    .filter((c) => !q || `${c.subject} ${fullName(contact(c.contactId))} ${c.messages[c.messages.length - 1]?.body ?? ''}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => +new Date(b.lastMessageAt) - +new Date(a.lastMessageAt))
  const selectedId = id ?? threads[0]?.id

  /* opening a thread by route marks it read */
  useEffect(() => {
    if (!id) return
    const c = db.find<any>('hubspot.conversations', id)
    if (c?.unread) db.update('hubspot.conversations', id, { unread: false })
  }, [id])

  const select = (cid: string) => {
    db.update('hubspot.conversations', cid, { unread: false })
    go({ page: 'inbox', id: cid })
  }

  return (
    <div className="h-full flex bg-white text-[#33475B] min-h-[560px]">
      {/* ── left rail ── */}
      <div className="w-[220px] shrink-0 border-r border-[#DFE3EB] bg-[#F5F8FA] flex flex-col">
        <div className="px-4 pt-4 pb-3 text-[18px] font-medium">Inbox</div>
        <nav className="text-[13.5px]" aria-label="Inbox views">
          {VIEWS.map((v) => {
            const n = conversations.filter((c) => v.match(c) && inChannel(c)).length
            const unread = conversations.filter((c) => v.match(c) && inChannel(c) && c.unread).length
            const active = v.key === view
            const Icon = v.icon
            return (
              <button key={v.key} data-agent={`hs-inbox-view-${v.key}`} aria-label={`${v.label} (${n})`} aria-pressed={active} onClick={() => setView(v.key)} className={`w-full flex items-center gap-2 px-4 h-9 text-left ${active ? 'bg-[#EAF0F6] font-semibold border-l-[3px] border-[#33475B] pl-[13px]' : 'hover:bg-[#EAF0F6]/60'}`}>
                <Icon size={15} className="text-[#516F90]" />
                <span className="flex-1">{v.label}</span>
                {unread > 0 && <span className="w-1.5 h-1.5 rounded-full bg-[#FF5C35]" />}
                <span className="text-[12px] text-[#516F90]">{n}</span>
              </button>
            )
          })}
        </nav>
        <div className="px-4 pt-5 pb-2 text-[12px] font-semibold uppercase tracking-wide text-[#516F90]">Channels</div>
        <div className="px-4 flex flex-wrap gap-1.5">
          {(['All', 'Chat', 'Email'] as Channel[]).map((ch) => (
            <button key={ch} data-agent={`hs-inbox-channel-${ch.toLowerCase()}`} aria-label={`Channel: ${ch}`} aria-pressed={channel === ch} onClick={() => setChannel(ch)} className={`h-7 px-2.5 rounded-full border text-[12.5px] inline-flex items-center gap-1 ${channel === ch ? 'bg-[#33475B] border-[#33475B] text-white' : 'bg-white border-[#CBD6E2] hover:bg-[#EAF0F6]'}`}>
              {ch === 'Chat' && <MessageCircle size={12} />}
              {ch === 'Email' && <Mail size={12} />}
              {ch}
            </button>
          ))}
        </div>
      </div>

      {/* ── thread list ── */}
      <div className="w-[320px] shrink-0 border-r border-[#DFE3EB] flex flex-col min-h-0">
        <div className="px-4 pt-4 pb-3 border-b border-[#DFE3EB]">
          <div className="text-[15px] font-semibold mb-2">{viewDef.label}{channel !== 'All' && <span className="font-normal text-[#516F90]"> · {channel}</span>}</div>
          <div className="flex items-center h-8 border border-[#CBD6E2] rounded-[3px] px-2 gap-1.5 bg-white">
            <input data-agent="hs-inbox-search" aria-label="Search conversations" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search conversations" className="flex-1 outline-none text-[13px] min-w-0" />
            <Search size={14} className="text-[#7C98B6]" />
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-auto">
          {threads.length === 0 ? (
            <div className="p-8 text-center text-[13.5px] text-[#516F90]">
              <InboxIcon size={34} className="mx-auto text-[#CBD6E2] mb-2" />
              <div className="font-semibold text-[#33475B]">{q ? 'No matching conversations' : 'You’re all caught up'}</div>
              <div className="mt-1">{q ? 'Try a different search term.' : `There are no conversations in “${viewDef.label}”${channel !== 'All' ? ` for ${channel}` : ''}.`}</div>
            </div>
          ) : (
            threads.map((c) => {
              const ct = contact(c.contactId)
              const last = c.messages[c.messages.length - 1]
              const active = c.id === selectedId
              return (
                <button key={c.id} data-agent={`hs-inbox-thread-${c.id}`} aria-label={`Conversation with ${fullName(ct)}: ${c.subject}${c.unread ? ' (unread)' : ''}`} aria-current={active} onClick={() => select(c.id)} className={`w-full text-left flex gap-3 px-4 py-3 border-b border-[#DFE3EB] ${active ? 'bg-[#E5F5F8] border-l-[3px] border-l-[#0091AE] pl-[13px]' : 'hover:bg-[#F5F8FA]'}`}>
                  <Initials name={fullName(ct)} size={34} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {c.unread && <span className="w-2 h-2 rounded-full bg-[#0091AE] shrink-0" aria-hidden />}
                      <span className={`truncate text-[13.5px] ${c.unread ? 'font-bold' : 'font-medium'}`}>{fullName(ct)}</span>
                      <ChannelIcon channel={c.channel} />
                      <span className="ml-auto text-[12px] text-[#516F90] shrink-0">{relTime(c.lastMessageAt)}</span>
                    </div>
                    <div className={`truncate text-[13px] mt-0.5 ${c.unread ? 'font-semibold' : ''}`}>{c.subject}</div>
                    <div className="truncate text-[12.5px] text-[#516F90] mt-0.5">
                      {last?.kind === 'note' ? 'Comment: ' : last?.kind === 'out' ? 'You: ' : ''}
                      {last?.body}
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* ── conversation + sidebar ── */}
      {selectedId ? (
        <Thread key={selectedId} id={selectedId} />
      ) : (
        <div className="flex-1 flex items-center justify-center bg-[#F5F8FA] text-[#516F90] text-[14px]">
          <div className="text-center">
            <MessageCircle size={40} className="mx-auto text-[#CBD6E2] mb-2" />
            Select a conversation to read it.
          </div>
        </div>
      )}
    </div>
  )
}

function Thread({ id }: { id: string }) {
  const { go, open, toast } = useHNav()
  const { isAgent } = useDesk()
  const c = useRecord<any>('hubspot.conversations', id)
  const contacts = useCollection<any>('hubspot.contacts')
  const conversations = useCollection<any>('hubspot.conversations')
  const tickets = useCollection<any>('hubspot.tickets')
  const ticket = useRecord<any>('hubspot.tickets', c?.ticketId)
  const [mode, setMode] = useState<'out' | 'note'>('out')
  const [body, setBody] = useState('')
  if (!c) return <div className="flex-1 p-8 text-[14px]">Conversation not found</div>
  const ct = contacts.find((x) => x.id === c.contactId)
  const others = conversations.filter((x) => x.contactId === c.contactId && x.id !== c.id).sort((a, b) => +new Date(b.lastMessageAt) - +new Date(a.lastMessageAt))
  const by = isAgent ? 'hworker' : ME.id

  const send = () => {
    if (!body.trim()) return
    const now = new Date().toISOString()
    db.update('hubspot.conversations', id, (r) => ({
      lastMessageAt: now,
      unread: false,
      ownerId: mode === 'out' && !r.ownerId ? ME.id : r.ownerId,
      messages: [...r.messages, { kind: mode, by, body: body.trim(), date: now }],
    }))
    setBody('')
    toast(mode === 'out' ? (c.ownerId ? 'Reply sent.' : 'Reply sent. Conversation assigned to you.') : 'Comment added.')
  }

  const assign = (ownerId: string) => {
    db.update('hubspot.conversations', id, { ownerId: ownerId || null })
    toast(ownerId ? `Assigned to ${person(ownerId).name}.` : 'Conversation unassigned.')
  }

  const toggleClosed = () => {
    const closing = c.status !== 'Closed'
    db.update('hubspot.conversations', id, { status: closing ? 'Closed' : 'Open', unread: false })
    toast(closing ? 'Conversation closed.' : 'Conversation reopened.')
  }

  const createTicket = () => {
    if (c.ticketId) return
    const tid = uid('hstk')
    const now = new Date().toISOString()
    const firstIn = c.messages.find((m: any) => m.kind === 'in')
    const number = Math.max(4100, ...tickets.map((t) => Number(t.number) || 0)) + 7
    db.insert('hubspot.tickets', {
      id: tid,
      number,
      subject: c.subject,
      category: 'Product question',
      priority: 'Medium',
      status: 'New',
      contactId: c.contactId,
      ownerId: c.ownerId ?? ME.id,
      source: c.channel,
      conversationId: c.id,
      createDate: now,
      lastUpdated: now,
      createdBy: isAgent ? 'hworker' : undefined,
      replies: firstIn ? [{ kind: 'customer', by: c.contactId, body: firstIn.body, date: firstIn.date ?? now }] : [],
    }, { prepend: true })
    db.update('hubspot.conversations', id, { ticketId: tid })
    runWorkflows('ticket_created', tid)
    toast(`Ticket #${number} created.`)
  }

  const insertKb = () =>
    open(
      <KbPicker
        onPick={(a) => {
          setMode('out')
          setBody((b) => `${b}${b && !b.endsWith('\n') ? '\n' : ''}${a.title} — help.northwind.com/kb/${a.id}`)
          open(null)
        }}
      />,
    )

  const who = (m: any) => (m.kind === 'in' ? fullName(ct) : person(m.by === 'hworker' ? 'alex' : m.by).name)

  return (
    <>
      <div className="flex-1 min-w-0 flex flex-col min-h-0 bg-[#F5F8FA]">
        {/* header */}
        <div className="bg-white border-b border-[#DFE3EB] px-5 py-3 flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {ct ? <HLink agent="hs-inbox-contact" onClick={() => go({ page: 'contact', id: ct.id })} className="text-[16px] truncate">{fullName(ct)}</HLink> : <span className="text-[16px] font-medium">Unknown visitor</span>}
              <ChannelIcon channel={c.channel} size={14} />
              {c.status === 'Closed' && <Pill color="#E5F8F6" text="#00826F">Closed</Pill>}
            </div>
            <div className="text-[13px] text-[#516F90] truncate" data-agent="hs-inbox-subject">{c.subject}</div>
          </div>
          <label className="flex items-center gap-2 text-[13px]">
            <span className="text-[#516F90]">Owner</span>
            <select data-agent="hs-inbox-assign" aria-label="Assign conversation" value={c.ownerId ?? ''} onChange={(e) => assign(e.target.value)} className={`${inputH} h-8 text-[13px] w-[160px]`}>
              <option value="">Unassigned</option>
              {OWNERS.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              {c.ownerId && !OWNERS.some((o) => o.id === c.ownerId) && <option value={c.ownerId}>{person(c.ownerId).name}</option>}
            </select>
          </label>
          {ticket ? (
            <HLink agent="hs-inbox-ticket-link" onClick={() => go({ page: 'ticket', id: ticket.id })} className="text-[13px] inline-flex items-center gap-1"><Ticket size={14} /> Ticket #{ticket.number}</HLink>
          ) : (
            <HBtn small variant="secondary" agent="hs-inbox-create-ticket" label="Create ticket from conversation" onClick={createTicket}><Ticket size={14} /> Create ticket</HBtn>
          )}
          <HBtn small variant={c.status === 'Closed' ? 'secondary' : 'primary'} agent="hs-inbox-close" label={c.status === 'Closed' ? 'Reopen conversation' : 'Close conversation'} onClick={toggleClosed}>
            {c.status === 'Closed' ? <><RotateCcw size={14} /> Reopen</> : <><CheckCircle2 size={14} /> Close conversation</>}
          </HBtn>
        </div>

        {/* messages */}
        <div className="flex-1 min-h-0 overflow-auto px-6 py-5 space-y-4" data-agent="hs-inbox-messages">
          <div className="text-center text-[12px] text-[#516F90]">Conversation started {hsDate(c.createdAt, true)} via {c.channel.toLowerCase()}</div>
          {c.messages.map((m: any, i: number) => {
            const inbound = m.kind === 'in'
            const note = m.kind === 'note'
            const name = who(m)
            return (
              <div key={i} className={`flex gap-2.5 ${inbound ? '' : 'flex-row-reverse'} ${m.by === 'hworker' ? 'flash-new' : ''}`}>
                <Initials name={name} size={30} />
                <div className={`max-w-[75%] min-w-[200px] ${inbound ? '' : 'items-end'}`}>
                  <div className={`flex items-center gap-2 text-[12px] text-[#516F90] mb-1 ${inbound ? '' : 'justify-end'}`}>
                    <b className="text-[#33475B] text-[12.5px]">{name}</b>
                    {m.by === 'hworker' && <HWTag />}
                    <span>{hsDate(m.date, true)}</span>
                  </div>
                  <div className={`rounded-[6px] px-3.5 py-2.5 text-[13.5px] whitespace-pre-wrap break-words ${note ? 'bg-[#FEF8F0] border border-[#F5C26B]' : inbound ? 'bg-[#EAF0F6]' : 'bg-white border border-[#7FD1DE] shadow-[0_1px_2px_rgba(45,62,80,0.08)]'}`}>
                    {note && <div className="flex items-center gap-1 text-[11.5px] font-semibold text-[#9B6A00] mb-1"><Lock size={11} /> Internal comment</div>}
                    {m.body}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* composer */}
        <div className="bg-white border-t border-[#DFE3EB] px-5 pt-2 pb-3">
          <div className="flex gap-4 mb-2 text-[13.5px]" role="tablist">
            {(['out', 'note'] as const).map((m) => (
              <button key={m} role="tab" aria-selected={mode === m} data-agent={`hs-inbox-mode-${m === 'out' ? 'reply' : 'comment'}`} onClick={() => setMode(m)} className={`h-8 ${mode === m ? 'font-semibold border-b-2 border-[#FF5C35]' : 'text-[#516F90]'}`}>
                {m === 'out' ? 'Reply' : 'Comment'}
              </button>
            ))}
            {mode === 'out' && <span className="ml-auto self-center text-[12px] text-[#516F90]">{c.channel === 'Email' ? `To: ${ct?.email ?? ''}` : 'Live chat'}</span>}
          </div>
          <textarea
            data-agent="hs-inbox-composer"
            aria-label={mode === 'out' ? 'Reply message' : 'Internal comment'}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send() }}
            rows={3}
            placeholder={mode === 'out' ? `Reply to ${ct?.firstName ?? 'visitor'}…` : 'Comment for your team (only visible internally)…'}
            className={`w-full p-3 rounded-[3px] border outline-none text-[14px] resize-none ${mode === 'note' ? 'bg-[#FEF8F0] border-[#F5C26B]' : 'bg-[#F5F8FA] border-[#CBD6E2] focus:bg-white focus:border-[#00A4BD]'}`}
          />
          <div className="mt-2 flex items-center gap-2">
            {mode === 'out' && (
              <HBtn small variant="ghost" agent="hs-inbox-insert-kb" label="Insert knowledge article" onClick={insertKb}><BookOpen size={14} /> Insert knowledge article</HBtn>
            )}
            <div className="flex-1" />
            {mode === 'out' && !c.ownerId && <span className="text-[12px] text-[#516F90]">Replying assigns this to you</span>}
            <HBtn small variant="primary" agent="hs-inbox-send" label={mode === 'out' ? 'Send reply' : 'Add comment'} disabled={!body.trim()} onClick={send}>
              <Send size={14} /> {mode === 'out' ? 'Send' : 'Add comment'}
            </HBtn>
          </div>
        </div>
      </div>

      {/* ── right sidebar ── */}
      <div className="w-[280px] shrink-0 border-l border-[#DFE3EB] bg-white overflow-auto p-4 space-y-5 text-[13px]">
        <section>
          <div className="text-[14px] font-semibold mb-2">Contact</div>
          {ct ? (
            <div className="border border-[#DFE3EB] rounded-[4px] p-3">
              <div className="flex items-center gap-2">
                <Initials name={fullName(ct)} size={34} />
                <div className="min-w-0">
                  <HLink agent="hs-inbox-sidebar-contact" onClick={() => go({ page: 'contact', id: ct.id })} className="truncate block">{fullName(ct)}</HLink>
                  <div className="text-[#516F90] truncate">{ct.jobTitle}</div>
                </div>
              </div>
              <dl className="mt-3 space-y-1.5">
                <div><dt className="text-[11.5px] uppercase tracking-wide text-[#516F90]">Company</dt><dd>{ct.company || '--'}</dd></div>
                <div><dt className="text-[11.5px] uppercase tracking-wide text-[#516F90]">Email</dt><dd className="text-[#0091AE] break-all">{ct.email || '--'}</dd></div>
                <div><dt className="text-[11.5px] uppercase tracking-wide text-[#516F90]">Lifecycle stage</dt><dd>{ct.lifecycleStage ? <Pill>{ct.lifecycleStage}</Pill> : '--'}</dd></div>
                {ct.ownerId && <div><dt className="text-[11.5px] uppercase tracking-wide text-[#516F90]">Contact owner</dt><dd>{person(ct.ownerId).name}</dd></div>}
              </dl>
            </div>
          ) : (
            <div className="text-[#516F90]">No contact record is associated with this visitor.</div>
          )}
        </section>

        <section>
          <div className="text-[14px] font-semibold mb-2">Other conversations ({others.length})</div>
          {others.length === 0 ? (
            <div className="text-[#516F90]">No other conversations with this contact.</div>
          ) : (
            <div className="space-y-1.5">
              {others.map((o) => (
                <button key={o.id} data-agent={`hs-inbox-other-${o.id}`} aria-label={`Open conversation: ${o.subject}`} onClick={() => go({ page: 'inbox', id: o.id })} className="w-full text-left border border-[#DFE3EB] rounded-[3px] px-2.5 py-2 hover:bg-[#F5F8FA]">
                  <div className="flex items-center gap-1.5"><ChannelIcon channel={o.channel} size={12} /><span className="truncate font-medium text-[#0091AE]">{o.subject}</span></div>
                  <div className="text-[12px] text-[#516F90] mt-0.5">{o.status} · {relTime(o.lastMessageAt)}</div>
                </button>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="text-[14px] font-semibold mb-2">Ticket</div>
          {ticket ? (
            <div className="border border-[#DFE3EB] rounded-[4px] p-3">
              <HLink agent="hs-inbox-sidebar-ticket" onClick={() => go({ page: 'ticket', id: ticket.id })}>{ticket.subject}</HLink>
              <div className="text-[12px] text-[#516F90] mt-1">Ticket #{ticket.number} · {ticket.category}</div>
              <div className="flex items-center gap-2 mt-2">
                <Pill color={stColor[ticket.status]?.[0]} text={stColor[ticket.status]?.[1]}>{ticket.status}</Pill>
                <span className="text-[12px] text-[#516F90]">{person(ticket.ownerId).name}</span>
              </div>
            </div>
          ) : (
            <div className="text-[#516F90]">
              No ticket yet.{' '}
              <HLink onClick={createTicket} className="text-[13px]">Create one</HLink>
            </div>
          )}
        </section>
      </div>
    </>
  )
}

function KbPicker({ onPick }: { onPick: (a: { id: string; title: string }) => void }) {
  const { open } = useHNav()
  const kb = useCollection<any>('hubspot.kb')
  const [q, setQ] = useState('')
  const list = kb.filter((a) => a.status === 'Published' && (!q || `${a.title} ${a.category}`.toLowerCase().includes(q.toLowerCase())))
  return (
    <Modal title="Insert knowledge article" agent="hs-inbox-kb-modal" onClose={() => open(null)} width={520}>
      <div className="flex items-center h-9 border border-[#CBD6E2] rounded-[3px] px-2 gap-1.5">
        <input autoFocus aria-label="Search articles" data-agent="hs-inbox-kb-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search published articles" className="flex-1 outline-none text-[13.5px]" />
        <Search size={14} className="text-[#7C98B6]" />
      </div>
      <div className="border border-[#DFE3EB] rounded-[3px] max-h-[320px] overflow-auto">
        {list.length === 0 && <div className="p-4 text-[#516F90] text-[13.5px]">No published articles match.</div>}
        {list.map((a) => (
          <button key={a.id} data-agent={`hs-inbox-kb-${a.id}`} aria-label={`Insert article ${a.title}`} onClick={() => onPick(a)} className="w-full text-left px-3 py-2.5 border-b border-[#DFE3EB] last:border-b-0 hover:bg-[#F5F8FA]">
            <div className="font-medium text-[#0091AE] text-[13.5px]">{a.title}</div>
            <div className="text-[12px] text-[#516F90]">{a.category} · {a.views.toLocaleString()} views</div>
          </button>
        ))}
      </div>
    </Modal>
  )
}
