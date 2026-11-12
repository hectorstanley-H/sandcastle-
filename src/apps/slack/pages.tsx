import { useMemo, useState, type ReactNode } from 'react'
import { Hash, Lock, Search, MessageSquareText, Headphones, SendHorizontal, Layers, FileText, Users, Clock, Trash2, X } from 'lucide-react'
import { db, useCollection } from '@/db/db'
import { useDesk } from '@/os/context'
import { ME, PEOPLE, person } from '@/data/people'
import { logoUrl } from '@/os/registry'
import { Composer, FileChip, Mrkdwn, SlackAvatar, dayLabel, nameOf, relTime, timeOf } from './parts'
import { type Msg, type SlackChannel, type SlackFile } from './ui'

const INTERNAL = PEOPLE.filter((p) => !p.external)

export function PageShell({ title, icon, children, actions }: { title: ReactNode; icon?: ReactNode; children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex-1 min-w-0 flex flex-col">
      <div className="h-[49px] shrink-0 flex items-center px-5 gap-2 border-b border-[#DDDDDD]">
        {icon}
        <span className="text-[18px] font-black flex-1 truncate">{title}</span>
        {actions}
      </div>
      <div className="flex-1 min-h-0 overflow-auto">{children}</div>
    </div>
  )
}

const where = (channelId: string) => (channelId.startsWith('dm-') ? person(channelId.slice(3)).name : `#${channelId}`)

function MiniMsg({ m, onClick, extra }: { m: Msg; onClick?: () => void; extra?: ReactNode }) {
  return (
    <div className="flex gap-2.5 px-5 py-2.5 border-b border-[#F0F0F0] hover:bg-[#F8F8F8]">
      <SlackAvatar id={m.from} size={36} />
      <button className="flex-1 min-w-0 text-left" onClick={onClick}>
        <div className="text-[12.5px] text-[#616061]">{where(m.channelId)} · {dayLabel(m.date)} {timeOf(m.date)}</div>
        <div className="text-[15px] font-black">{nameOf(m.from)}</div>
        <div className="text-[14.5px] whitespace-pre-wrap break-words line-clamp-3"><Mrkdwn text={m.text} /></div>
      </button>
      {extra}
    </div>
  )
}

/* ─────────────────────────── Threads ─────────────────────────── */

export function ThreadsPage({ all, onThread }: { all: Msg[]; onThread: (channelId: string, ts: string) => void }) {
  const threads = useMemo(() => {
    const roots = new Map<string, Msg[]>()
    for (const m of all) if (m.threadTs) roots.set(m.threadTs, [...(roots.get(m.threadTs) ?? []), m])
    return [...roots.entries()]
      .map(([ts, replies]) => ({ root: all.find((x) => x.id === ts), replies: replies.sort((a, b) => +new Date(a.date) - +new Date(b.date)) }))
      .filter((t): t is { root: Msg; replies: Msg[] } => !!t.root && (t.root.from === ME.id || t.replies.some((r) => r.from === ME.id) || /alex/i.test(t.root.text)))
      .sort((a, b) => +new Date(b.replies.at(-1)!.date) - +new Date(a.replies.at(-1)!.date))
  }, [all])
  return (
    <PageShell title="Threads" icon={<MessageSquareText size={18} />}>
      {threads.length === 0 && <div className="p-10 text-center text-[14px] text-[#616061]">Threads you’re part of will show up here.</div>}
      {threads.map(({ root, replies }) => (
        <div key={root.id} className="m-4 rounded-lg border border-[#DDDDDD] overflow-hidden">
          <div className="px-4 py-2 bg-[#F8F8F8] text-[13px] font-bold border-b border-[#DDDDDD]">{where(root.channelId)}</div>
          <MiniMsg m={root} onClick={() => onThread(root.channelId, root.id)} />
          <button className="w-full text-left px-5 py-2 text-[13px] font-bold text-[#1264A3] hover:underline" onClick={() => onThread(root.channelId, root.id)}>
            {replies.length} {replies.length === 1 ? 'reply' : 'replies'} · last {relTime(replies.at(-1)!.date)} — View thread
          </button>
        </div>
      ))}
    </PageShell>
  )
}

/* ─────────────────────────── Huddles ─────────────────────────── */

export function HuddlesPage({ onStart, channels }: { onStart: (conv: string) => void; channels: SlackChannel[] }) {
  const log = useCollection<any>('slack.huddles')
  return (
    <PageShell title="Huddles" icon={<Headphones size={18} />}>
      <div className="p-6 max-w-[720px]">
        <div className="text-[15px] text-[#616061] mb-4">Huddles are lightweight audio and video conversations. Start one from any channel or DM.</div>
        <div className="flex flex-wrap gap-2 mb-8">
          {channels.slice(0, 6).map((c) => (
            <button key={c.id} onClick={() => onStart(c.id)} className="h-8 px-3 rounded-lg border border-[#BBBABB] text-[13px] font-bold hover:bg-[#F8F8F8] flex items-center gap-1.5"><Headphones size={14} /> #{c.name}</button>
          ))}
        </div>
        <div className="text-[15px] font-black mb-2">Recent huddles</div>
        {log.length === 0 && <div className="text-[14px] text-[#616061]">No huddles yet.</div>}
        {[...log].reverse().map((h) => (
          <div key={h.id} className="flex items-center gap-3 h-12 border-b border-[#F0F0F0] text-[14px]">
            <Headphones size={16} className="text-[#616061]" />
            <span className="flex-1">{where(h.conv)}</span>
            <span className="text-[13px] text-[#616061]">{Math.max(1, Math.round(h.seconds / 60))} min · {relTime(h.date)}</span>
          </div>
        ))}
      </div>
    </PageShell>
  )
}

/* ─────────────────────────── Drafts & sent ─────────────────────────── */

export function DraftsPage({ all, onOpen }: { all: Msg[]; onOpen: (id: string) => void }) {
  const scheduled = useCollection<any>('slack.scheduled')
  const [tab, setTab] = useState<'scheduled' | 'sent'>('sent')
  const sent = all.filter((m) => m.from === ME.id && !m.system && !m.deleted).sort((a, b) => +new Date(b.date) - +new Date(a.date))
  return (
    <PageShell title="Drafts & sent" icon={<SendHorizontal size={18} />}>
      <div className="flex gap-5 px-5 border-b border-[#DDDDDD] text-[14px]">
        {(['scheduled', 'sent'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`h-10 border-b-2 ${tab === t ? 'border-[#1D1C1D] font-bold' : 'border-transparent text-[#616061]'}`}>
            {t === 'scheduled' ? `Scheduled ${scheduled.length || ''}` : 'Sent'}
          </button>
        ))}
      </div>
      {tab === 'scheduled' &&
        (scheduled.length === 0 ? (
          <div className="p-10 text-center text-[14px] text-[#616061]">No scheduled messages. Use the arrow next to Send to schedule one.</div>
        ) : (
          [...scheduled].sort((a, b) => +new Date(a.at) - +new Date(b.at)).map((s) => (
            <div key={s.id} className="flex gap-2.5 px-5 py-3 border-b border-[#F0F0F0]">
              <Clock size={18} className="text-[#616061] mt-1" />
              <div className="flex-1 min-w-0">
                <div className="text-[12.5px] text-[#616061]">To {where(s.channelId)} · Sends {new Date(s.at).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</div>
                <div className="text-[14.5px] whitespace-pre-wrap break-words"><Mrkdwn text={s.text} /></div>
              </div>
              <button className="h-7 px-2.5 rounded-md border border-[#BBBABB] text-[12.5px] font-bold hover:bg-[#F8F8F8]" onClick={() => db.update('slack.scheduled', s.id, { at: new Date().toISOString() })}>Send now</button>
              <button aria-label="Delete scheduled message" className="w-7 h-7 rounded-md hover:bg-[#F2F2F2] flex items-center justify-center text-[#616061]" onClick={() => db.remove('slack.scheduled', s.id)}><Trash2 size={15} /></button>
            </div>
          ))
        ))}
      {tab === 'sent' && sent.map((m) => <MiniMsg key={m.id} m={m} onClick={() => onOpen(m.channelId)} />)}
    </PageShell>
  )
}

/* ─────────────────────────── People directory ─────────────────────────── */

export function DirectoryPage({ onProfile, onOpen }: { onProfile: (id: string) => void; onOpen: (id: string) => void }) {
  const [q, setQ] = useState('')
  const list = INTERNAL.filter((p) => (p.name + ' ' + p.title + ' ' + p.dept).toLowerCase().includes(q.toLowerCase()))
  return (
    <PageShell title="People" icon={<Users size={18} />}>
      <div className="p-5">
        <div className="flex items-center gap-2 h-9 px-3 rounded-lg border border-[#BBBABB] focus-within:border-[#1264A3] mb-4">
          <Search size={15} className="text-[#616061]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search for people" aria-label="Search for people" className="flex-1 outline-none text-[14px]" />
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4">
          {list.map((p) => (
            <div key={p.id} className="rounded-lg border border-[#DDDDDD] overflow-hidden hover:shadow-md">
              <button className="w-full" onClick={() => onProfile(p.id)}>
                <div className="h-[150px] flex items-center justify-center" style={{ background: p.color + '22' }}><SlackAvatar id={p.id} size={96} /></div>
                <div className="p-3 text-left">
                  <div className="text-[15px] font-black truncate">{p.name}</div>
                  <div className="text-[13px] text-[#616061] truncate">{p.title}</div>
                </div>
              </button>
              <div className="px-3 pb-3">
                <button className="w-full h-7 rounded-md border border-[#BBBABB] text-[13px] font-bold hover:bg-[#F8F8F8]" onClick={() => onOpen(`dm-${p.id}`)}>Message</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  )
}

/* ─────────────────────────── Browse channels ─────────────────────────── */

export function BrowsePage({ channels, all, onOpen, onCreate }: { channels: SlackChannel[]; all: Msg[]; onOpen: (id: string) => void; onCreate: () => void }) {
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<'name' | 'members' | 'recent'>('name')
  const last = (id: string) => all.filter((m) => m.channelId === id).reduce((a, m) => Math.max(a, +new Date(m.date)), 0)
  const list = channels
    .filter((c) => (c.name + ' ' + c.topic).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (sort === 'name' ? a.name.localeCompare(b.name) : sort === 'members' ? b.members - a.members : last(b.id) - last(a.id)))
  return (
    <PageShell title="All channels" icon={<Hash size={18} />} actions={<button data-agent="slack-browse-create" className="h-8 px-3 rounded-lg bg-[#007A5A] text-white text-[13px] font-bold" onClick={onCreate}>Create channel</button>}>
      <div className="p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 flex items-center gap-2 h-9 px-3 rounded-lg border border-[#BBBABB] focus-within:border-[#1264A3]">
            <Search size={15} className="text-[#616061]" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search for channels" aria-label="Search for channels" className="flex-1 outline-none text-[14px]" />
          </div>
          <select value={sort} onChange={(e) => setSort(e.target.value as any)} aria-label="Sort" className="h-9 px-2 rounded-lg border border-[#BBBABB] text-[13px] bg-white">
            <option value="name">Sort: A to Z</option>
            <option value="members">Sort: Most members</option>
            <option value="recent">Sort: Most recent activity</option>
          </select>
        </div>
        <div className="text-[13px] text-[#616061] mb-2">{list.length} results</div>
        {list.map((c) => (
          <button key={c.id} onClick={() => onOpen(c.id)} className="w-full text-left px-4 py-3 border-t border-[#F0F0F0] hover:bg-[#F8F8F8]">
            <div className="text-[15px] font-bold flex items-center gap-1">{c.private ? <Lock size={14} /> : <Hash size={15} />} {c.name}</div>
            <div className="text-[13px] text-[#616061]"><span className="text-[#007A5A] font-bold">✓ Joined</span> · {c.members} members · {c.topic}</div>
          </button>
        ))}
      </div>
    </PageShell>
  )
}

/* ─────────────────────────── Files ─────────────────────────── */

export function FilesPage({ all, onOpen }: { all: Msg[]; onOpen: (id: string) => void }) {
  const files = useCollection<any>('files')
  const shared = all.filter((m) => m.files?.length && !m.deleted).flatMap((m) => m.files!.map((f) => ({ f, m })))
  const [tab, setTab] = useState<'shared' | 'recent'>('shared')
  return (
    <PageShell title="Files" icon={<Layers size={18} />}>
      <div className="flex gap-5 px-5 border-b border-[#DDDDDD] text-[14px]">
        {(['shared', 'recent'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`h-10 border-b-2 ${tab === t ? 'border-[#1D1C1D] font-bold' : 'border-transparent text-[#616061]'}`}>{t === 'shared' ? 'Shared in Slack' : 'Recent on this computer'}</button>
        ))}
      </div>
      <div className="p-5 flex flex-wrap gap-3">
        {tab === 'shared' && shared.length === 0 && <div className="text-[14px] text-[#616061]">Files shared in channels and DMs will appear here.</div>}
        {tab === 'shared' &&
          shared.map(({ f, m }, i) => (
            <div key={i}>
              <FileChip f={f} />
              <button className="text-[12px] text-[#616061] hover:underline mt-0.5 pl-1" onClick={() => onOpen(m.channelId)}>{nameOf(m.from)} in {where(m.channelId)} · {relTime(m.date)}</button>
            </div>
          ))}
        {tab === 'recent' && files.map((f) => <FileChip key={f.id} f={{ name: f.name, size: f.size, kind: f.kind, open: f.open } as SlackFile} />)}
      </div>
    </PageShell>
  )
}

/* ─────────────────────────── Canvases ─────────────────────────── */

export function CanvasesPage({ onOpen }: { onOpen: (id: string) => void }) {
  const canvases = useCollection<any>('slack.canvases')
  return (
    <PageShell title="Canvases" icon={<FileText size={18} />}>
      <div className="p-5">
        {canvases.length === 0 && <div className="text-[14px] text-[#616061]">No canvases yet. Open the Canvas tab in any channel to start one.</div>}
        {canvases.map((c) => (
          <button key={c.id} onClick={() => onOpen(c.conv)} className="w-full text-left px-4 py-3 rounded-lg border border-[#DDDDDD] mb-2 hover:bg-[#F8F8F8]">
            <div className="text-[15px] font-bold">{c.title || 'Untitled canvas'}</div>
            <div className="text-[13px] text-[#616061]">{where(c.conv)} · edited {relTime(c.updated)}</div>
          </button>
        ))}
      </div>
    </PageShell>
  )
}

/* ─────────────────────────── Apps ─────────────────────────── */

export function AppsPage() {
  const { open } = useDesk()
  const apps: [string, string, string][] = [
    ['jira', 'Jira Cloud', 'Create and track issues from Slack'],
    ['confluence', 'Confluence', 'Share pages and get notifications'],
    ['servicenow', 'ServiceNow', 'Raise and follow IT incidents'],
    ['zendesk', 'Zendesk', 'Support tickets in your channels'],
    ['salesforce', 'Salesforce', 'Deals, accounts and alerts'],
    ['hworker', 'H-Worker', 'AI coworkers for your apps'],
  ]
  return (
    <PageShell title="Apps" icon={<Layers size={18} />}>
      <div className="p-5 grid grid-cols-2 gap-3 max-w-[820px]">
        {apps.map(([id, n, d]) => (
          <div key={id} className="flex items-center gap-3 p-3 rounded-lg border border-[#DDDDDD]">
            <span className="w-11 h-11 rounded-lg bg-[#F8F8F8] flex items-center justify-center"><img src={logoUrl(id)} className="w-7 h-7" alt="" /></span>
            <div className="flex-1 min-w-0">
              <div className="text-[15px] font-bold">{n}</div>
              <div className="text-[13px] text-[#616061] truncate">{d}</div>
            </div>
            <button className="h-8 px-3 rounded-lg border border-[#BBBABB] text-[13px] font-bold hover:bg-[#F8F8F8]" onClick={() => open(id)}>Open</button>
          </div>
        ))}
      </div>
    </PageShell>
  )
}

export function InfoPage({ title, body }: { title: string; body: string }) {
  return (
    <PageShell title={title}>
      <div className="p-10 max-w-[560px] text-[15px] text-[#616061]">{body}</div>
    </PageShell>
  )
}

/* ─────────────────────────── Search ─────────────────────────── */

export function SearchPage({ query, all, channels, onOpen, onThread, onProfile }: { query: string; all: Msg[]; channels: SlackChannel[]; onOpen: (id: string) => void; onThread: (channelId: string, ts: string) => void; onProfile: (id: string) => void }) {
  const [tab, setTab] = useState<'messages' | 'channels' | 'people' | 'files'>('messages')
  const inMatch = /\bin:#?([a-z0-9-]+)/i.exec(query)
  const fromMatch = /\bfrom:@?([a-z]+)/i.exec(query)
  const terms = query.replace(/\b(in|from):\S+/gi, '').trim().toLowerCase()
  const msgs = all
    .filter((m) => !m.deleted && !m.system)
    .filter((m) => (!inMatch || m.channelId === inMatch[1].toLowerCase()) && (!fromMatch || person(m.from).first.toLowerCase() === fromMatch[1].toLowerCase()) && (!terms || m.text.toLowerCase().includes(terms)))
    .sort((a, b) => +new Date(b.date) - +new Date(a.date))
  const chans = channels.filter((c) => (c.name + ' ' + c.topic).toLowerCase().includes(terms))
  const people = INTERNAL.filter((p) => (p.name + ' ' + p.title).toLowerCase().includes(terms))
  const files = all.filter((m) => m.files?.length).flatMap((m) => m.files!.filter((f) => f.name.toLowerCase().includes(terms)).map((f) => ({ f, m })))
  const counts = { messages: msgs.length, channels: chans.length, people: people.length, files: files.length }
  return (
    <PageShell title={<>Search: <span className="font-normal">{query}</span></>} icon={<Search size={18} />}>
      <div className="flex gap-5 px-5 border-b border-[#DDDDDD] text-[14px]">
        {(Object.keys(counts) as (keyof typeof counts)[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`h-10 border-b-2 ${tab === t ? 'border-[#1D1C1D] font-bold' : 'border-transparent text-[#616061]'}`}>
            {t[0].toUpperCase() + t.slice(1)} <span className="text-[12px] text-[#616061]">{counts[t]}</span>
          </button>
        ))}
      </div>
      {tab === 'messages' && (msgs.length ? msgs.slice(0, 60).map((m) => <MiniMsg key={m.id} m={m} onClick={() => (m.threadTs ? onThread(m.channelId, m.threadTs) : onOpen(m.channelId))} />) : <div className="p-10 text-center text-[14px] text-[#616061]">No messages match “{query}”.</div>)}
      {tab === 'channels' &&
        chans.map((c) => (
          <button key={c.id} onClick={() => onOpen(c.id)} className="w-full text-left px-5 py-3 border-b border-[#F0F0F0] hover:bg-[#F8F8F8]">
            <div className="text-[15px] font-bold flex items-center gap-1">{c.private ? <Lock size={14} /> : <Hash size={15} />} {c.name}</div>
            <div className="text-[13px] text-[#616061]">{c.members} members · {c.topic}</div>
          </button>
        ))}
      {tab === 'people' &&
        people.map((p) => (
          <button key={p.id} onClick={() => onProfile(p.id)} className="w-full flex items-center gap-3 px-5 py-2.5 border-b border-[#F0F0F0] hover:bg-[#F8F8F8] text-left">
            <SlackAvatar id={p.id} size={36} />
            <div>
              <div className="text-[15px] font-bold">{p.name}</div>
              <div className="text-[13px] text-[#616061]">{p.title}</div>
            </div>
          </button>
        ))}
      {tab === 'files' && (
        <div className="p-5 flex flex-wrap gap-3">
          {files.map(({ f }, i) => <FileChip key={i} f={f} />)}
          {!files.length && <div className="text-[14px] text-[#616061]">No files match.</div>}
        </div>
      )}
    </PageShell>
  )
}

/* ─────────────────────────── New message ─────────────────────────── */

export function NewMessagePage({ channels, onSend, onClose }: { channels: SlackChannel[]; onSend: (to: string, text: string, files?: SlackFile[]) => void; onClose: () => void }) {
  const [to, setTo] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const opts = [
    ...INTERNAL.filter((p) => p.id !== ME.id).map((p) => ({ id: `dm-${p.id}`, label: p.name, sub: p.title, icon: <SlackAvatar id={p.id} size={20} /> })),
    ...channels.map((c) => ({ id: c.id, label: `#${c.name}`, sub: c.topic, icon: c.private ? <Lock size={14} /> : <Hash size={15} /> })),
  ].filter((o) => o.label.toLowerCase().includes(q.toLowerCase().replace(/^#/, '')))
  const chosen = to ? (to.startsWith('dm-') ? person(to.slice(3)).name : `#${channels.find((c) => c.id === to)?.name ?? to}`) : ''
  return (
    <PageShell title="New message" actions={<button aria-label="Close" className="w-8 h-8 rounded-md hover:bg-[#F2F2F2] flex items-center justify-center text-[#616061]" onClick={onClose}><X size={18} /></button>}>
      <div className="flex flex-col h-full">
        <div className="relative px-5 py-2 border-b border-[#DDDDDD] flex items-center gap-2 text-[15px]">
          <span className="text-[#616061]">To:</span>
          {to ? (
            <span className="inline-flex items-center gap-1 h-7 px-2 rounded bg-[#E8F5FA] text-[#1264A3] font-bold text-[14px]">
              {chosen}
              <button aria-label="Remove recipient" onClick={() => setTo(null)}>×</button>
            </span>
          ) : (
            <input autoFocus data-agent="slack-new-message-to" value={q} onChange={(e) => setQ(e.target.value)} placeholder="#a-channel, @somebody or somebody@example.com" aria-label="To" className="flex-1 outline-none text-[15px] h-8" />
          )}
          {!to && q && (
            <div className="absolute left-12 top-full z-30 w-[380px] max-h-[300px] overflow-auto bg-white rounded-lg border border-[#DDDDDD] shadow-[0_4px_16px_rgba(0,0,0,0.18)] py-1.5">
              {opts.slice(0, 12).map((o) => (
                <button key={o.id} className="w-full flex items-center gap-2 px-4 h-9 hover:bg-[#1264A3] hover:text-white text-left text-[14px]" onClick={() => { setTo(o.id); setQ('') }}>
                  <span className="w-5 flex justify-center">{o.icon}</span> <b>{o.label}</b> <span className="opacity-70 truncate text-[13px]">{o.sub}</span>
                </button>
              ))}
              {!opts.length && <div className="px-4 py-2 text-[13px] text-[#616061]">No matches</div>}
            </div>
          )}
        </div>
        <div className="flex-1" />
        <div className="px-5 pb-5">
          <Composer key={to ?? 'none'} placeholder={to ? `Message ${chosen}` : 'Start a new message'} agent="slack-new-message-compose" sendAgent="slack-new-message-send" onSend={(t, files) => to && onSend(to, t, files)} />
        </div>
      </div>
    </PageShell>
  )
}

