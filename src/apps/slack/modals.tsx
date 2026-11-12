import { useState } from 'react'
import { Hash, Lock, Search, X, Headphones, MessageSquareText, Mail, Phone, Clock, Star, BellOff, Copy } from 'lucide-react'
import { db, uid } from '@/db/db'
import { useDesk } from '@/os/context'
import { ME, PEOPLE, person } from '@/data/people'
import { Mrkdwn, SlackAvatar, STATUS, nameOf } from './parts'
import { Modal, STATUS_EMOJI, STATUS_PRESETS, copyText, useSlackPrefs, type Msg, type SlackChannel } from './ui'

const INTERNAL = PEOPLE.filter((p) => !p.external)

/* ─────────────────────────── Create channel ─────────────────────────── */

export function CreateChannelModal({ existing, onClose, onCreated }: { existing: SlackChannel[]; onClose: () => void; onCreated: (id: string) => void }) {
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [priv, setPriv] = useState(false)
  const slug = name.toLowerCase().trim().replace(/[^a-z0-9-_]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80)
  const taken = existing.some((c) => c.name === slug || c.id === slug) || slug.startsWith('dm-')
  const create = () => {
    if (!slug || taken) return
    const id = slug
    db.insert('slack.channels', { id, name: slug, topic: desc.trim() || 'Add a topic', description: desc.trim(), members: 1, private: priv, createdBy: ME.id })
    db.insert('slack.messages', { id: uid('sm'), channelId: id, from: ME.id, text: `joined #${slug}.`, date: new Date().toISOString(), system: true })
    onCreated(id)
    onClose()
  }
  return (
    <Modal title="Create a channel" onClose={onClose} agent="slack-create-channel">
      <label className="block text-[15px] font-bold mb-1">Name</label>
      <div className="flex items-center gap-1 h-10 px-3 rounded-lg border border-[#BBBABB] focus-within:border-[#1264A3] focus-within:shadow-[0_0_0_1px_#1264A3]">
        {priv ? <Lock size={15} className="text-[#616061]" /> : <Hash size={16} className="text-[#616061]" />}
        <input autoFocus data-agent="slack-create-channel-name" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && create()} placeholder="e.g. plan-budget" aria-label="Channel name" className="flex-1 outline-none text-[15px]" maxLength={80} />
        <span className="text-[13px] text-[#616061]">{80 - name.length}</span>
      </div>
      {taken && <div className="text-[13px] text-[#E01E5A] mt-1">That name is already taken or reserved.</div>}
      {name && slug !== name && !taken && <div className="text-[13px] text-[#616061] mt-1">Will be created as #{slug}</div>}
      <label className="block text-[15px] font-bold mt-4 mb-1">Description <span className="font-normal text-[#616061]">(optional)</span></label>
      <textarea value={desc} onChange={(e) => setDesc(e.target.value)} aria-label="Description" className="w-full h-20 resize-none rounded-lg border border-[#BBBABB] p-2 text-[15px] outline-none focus:border-[#1264A3]" />
      <div className="text-[13px] text-[#616061] mt-1">What’s this channel about?</div>
      <label className="flex items-start gap-3 mt-4 cursor-pointer">
        <input type="checkbox" checked={priv} onChange={(e) => setPriv(e.target.checked)} className="mt-1 accent-[#007A5A]" />
        <span>
          <span className="block text-[15px] font-bold">Make private</span>
          <span className="block text-[13px] text-[#616061]">When a channel is private, it can only be viewed or joined by invitation.</span>
        </span>
      </label>
      <div className="flex justify-end mt-6">
        <button data-agent="slack-create-channel-submit" disabled={!slug || taken} onClick={create} className="h-9 px-4 rounded-lg bg-[#007A5A] text-white text-[15px] font-bold disabled:bg-[#DDDDDD] disabled:text-[#868686]">Create</button>
      </div>
    </Modal>
  )
}

/* ─────────────────────────── Channel details ─────────────────────────── */

export function ChannelDetailsModal({ channel, all, initialTab, onClose, onProfile, onAddPeople, onNotif }: { channel: SlackChannel; all: Msg[]; initialTab?: 'about' | 'members' | 'settings'; onClose: () => void; onProfile: (id: string) => void; onAddPeople: () => void; onNotif: () => void }) {
  const [prefs, setPrefs] = useSlackPrefs()
  const { toast } = useDesk()
  const [tab, setTab] = useState(initialTab ?? 'about')
  const [editTopic, setEditTopic] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const topic = prefs.topics?.[channel.id] ?? channel.topic
  const extra = prefs.extraMembers?.[channel.id] ?? []
  const members = Array.from(new Set([ME.id, ...all.filter((m) => m.channelId === channel.id && !m.from.startsWith('bot:')).map((m) => m.from), ...extra])).filter((id) => person(id).name.toLowerCase().includes(q.toLowerCase()))
  const starred = (prefs.starred ?? []).includes(channel.id)
  const muted = (prefs.muted ?? []).includes(channel.id)
  return (
    <Modal title={<span className="flex items-center gap-1">{channel.private ? <Lock size={18} /> : <Hash size={20} />} {channel.name}</span>} onClose={onClose} width={620} agent="slack-details-modal">
      <div className="flex gap-2 mb-4">
        <button className={`h-8 px-3 rounded-lg border text-[13px] font-bold flex items-center gap-1.5 ${starred ? 'border-[#E8912D] text-[#E8912D]' : 'border-[#BBBABB] hover:bg-[#F8F8F8]'}`} onClick={() => setPrefs((p) => ({ starred: starred ? (p.starred ?? []).filter((x) => x !== channel.id) : [...(p.starred ?? []), channel.id] }))}><Star size={14} fill={starred ? 'currentColor' : 'none'} /> {starred ? 'Starred' : 'Star'}</button>
        <button className="h-8 px-3 rounded-lg border border-[#BBBABB] text-[13px] font-bold flex items-center gap-1.5 hover:bg-[#F8F8F8]" onClick={onNotif}><BellOff size={14} /> {muted ? 'Muted' : 'Notifications'}</button>
        <button className="h-8 px-3 rounded-lg border border-[#BBBABB] text-[13px] font-bold flex items-center gap-1.5 hover:bg-[#F8F8F8]" onClick={() => { copyText(`https://northwind.slack.com/archives/${channel.id}`); toast({ appId: 'slack', title: 'Link copied', body: `#${channel.name}` }) }}><Copy size={14} /> Copy link</button>
      </div>
      <div className="flex gap-5 border-b border-[#DDDDDD] text-[14px] mb-4">
        {(['about', 'members', 'settings'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`h-9 border-b-2 ${tab === t ? 'border-[#1D1C1D] font-bold' : 'border-transparent text-[#616061]'}`}>
            {t === 'about' ? 'About' : t === 'members' ? `Members ${channel.members + extra.length}` : 'Settings'}
          </button>
        ))}
      </div>
      {tab === 'about' && (
        <div className="rounded-lg border border-[#DDDDDD] divide-y divide-[#DDDDDD]">
          <div className="p-4">
            <div className="flex items-center">
              <span className="text-[15px] font-bold flex-1">Topic</span>
              {editTopic === null && <button className="text-[13px] text-[#1264A3] hover:underline" onClick={() => setEditTopic(topic)}>Edit</button>}
            </div>
            {editTopic !== null ? (
              <div className="mt-2">
                <input autoFocus data-agent="slack-topic-input" value={editTopic} onChange={(e) => setEditTopic(e.target.value)} aria-label="Topic" className="w-full h-9 px-2 rounded-lg border border-[#BBBABB] text-[15px] outline-none focus:border-[#1264A3]" />
                <div className="flex justify-end gap-2 mt-2">
                  <button className="h-8 px-3 rounded-lg border border-[#BBBABB] text-[13px] font-bold" onClick={() => setEditTopic(null)}>Cancel</button>
                  <button
                    className="h-8 px-3 rounded-lg bg-[#007A5A] text-white text-[13px] font-bold"
                    onClick={() => {
                      setPrefs((p) => ({ topics: { ...(p.topics ?? {}), [channel.id]: editTopic.trim() } }))
                      db.insert('slack.messages', { id: uid('sm'), channelId: channel.id, from: ME.id, text: `set the channel topic: ${editTopic.trim()}`, date: new Date().toISOString(), system: true })
                      setEditTopic(null)
                    }}
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-[15px] mt-1">{topic}</div>
            )}
          </div>
          {channel.description && (
            <div className="p-4">
              <div className="text-[15px] font-bold">Description</div>
              <div className="text-[15px] mt-1">{channel.description}</div>
            </div>
          )}
          <div className="p-4">
            <div className="text-[15px] font-bold">Managed by</div>
            <div className="text-[15px] mt-1">{channel.createdBy ? nameOf(channel.createdBy) : 'Workspace admins'}</div>
          </div>
          <div className="p-4 text-[13px] text-[#616061]">{all.filter((m) => m.channelId === channel.id).length} messages · Files: {all.filter((m) => m.channelId === channel.id && m.files?.length).length}</div>
        </div>
      )}
      {tab === 'members' && (
        <div>
          <div className="flex items-center gap-2 h-9 px-3 rounded-lg border border-[#BBBABB] mb-2">
            <Search size={15} className="text-[#616061]" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find members" aria-label="Find members" className="flex-1 outline-none text-[14px]" />
          </div>
          <button className="w-full flex items-center gap-3 px-2 h-11 rounded-lg hover:bg-[#F8F8F8] text-[15px] font-bold" onClick={onAddPeople}>
            <span className="w-9 h-9 rounded-lg bg-[#E8F5FA] text-[#1264A3] flex items-center justify-center text-[20px]">+</span> Add people
          </button>
          {members.map((id) => (
            <button key={id} className="w-full flex items-center gap-3 px-2 h-11 rounded-lg hover:bg-[#F8F8F8] text-left" onClick={() => onProfile(id)}>
              <SlackAvatar id={id} size={36} />
              <span className="text-[15px] font-bold">{person(id).name}{id === ME.id ? ' (you)' : ''}</span>
              <span className="text-[13px] text-[#616061] truncate">{person(id).title}</span>
            </button>
          ))}
          {channel.members > members.length && <div className="text-[13px] text-[#616061] px-2 py-2">and {channel.members - members.length} more members</div>}
        </div>
      )}
      {tab === 'settings' && (
        <div className="rounded-lg border border-[#DDDDDD] divide-y divide-[#DDDDDD] text-[15px]">
          <button className="w-full text-left p-4 hover:bg-[#F8F8F8]" onClick={onNotif}>
            <div className="font-bold">Notifications</div>
            <div className="text-[13px] text-[#616061]">{prefs.notif?.[channel.id] === 'nothing' ? 'Nothing' : prefs.notif?.[channel.id] === 'mentions' ? 'Only @mentions' : 'All new messages'}</div>
          </button>
          <button className="w-full text-left p-4 hover:bg-[#F8F8F8]" onClick={() => setPrefs((p) => ({ muted: muted ? (p.muted ?? []).filter((x) => x !== channel.id) : [...(p.muted ?? []), channel.id] }))}>
            <div className="font-bold">{muted ? 'Unmute channel' : 'Mute channel'}</div>
            <div className="text-[13px] text-[#616061]">Muted channels are greyed out at the bottom of your sidebar.</div>
          </button>
        </div>
      )}
    </Modal>
  )
}

/* ─────────────────────────── Notifications ─────────────────────────── */

export function NotifModal({ channel, onClose }: { channel: SlackChannel; onClose: () => void }) {
  const [prefs, setPrefs] = useSlackPrefs()
  const cur = prefs.notif?.[channel.id] ?? 'all'
  const muted = (prefs.muted ?? []).includes(channel.id)
  return (
    <Modal title="Notifications" onClose={onClose} width={460} agent="slack-notif-modal">
      <div className="text-[15px] mb-3">Send a notification for #{channel.name}</div>
      {([['all', 'All new messages'], ['mentions', 'Mentions'], ['nothing', 'Nothing']] as const).map(([v, l]) => (
        <label key={v} className="flex items-center gap-3 h-9 text-[15px] cursor-pointer">
          <input type="radio" name="notif" checked={cur === v} onChange={() => setPrefs((p) => ({ notif: { ...(p.notif ?? {}), [channel.id]: v } }))} className="accent-[#007A5A]" /> {l}
        </label>
      ))}
      <label className="flex items-center gap-3 h-9 mt-2 text-[15px] cursor-pointer">
        <input type="checkbox" checked={muted} onChange={() => setPrefs((p) => ({ muted: muted ? (p.muted ?? []).filter((x) => x !== channel.id) : [...(p.muted ?? []), channel.id] }))} className="accent-[#007A5A]" /> Mute channel
      </label>
      <div className="flex justify-end mt-4">
        <button className="h-9 px-4 rounded-lg bg-[#007A5A] text-white text-[15px] font-bold" onClick={onClose}>Done</button>
      </div>
    </Modal>
  )
}

/* ─────────────────────────── Add people ─────────────────────────── */

export function AddPeopleModal({ channel, onClose }: { channel: SlackChannel; onClose: () => void }) {
  const [prefs, setPrefs] = useSlackPrefs()
  const [sel, setSel] = useState<string[]>([])
  const [q, setQ] = useState('')
  const extra = prefs.extraMembers?.[channel.id] ?? []
  const list = INTERNAL.filter((p) => p.id !== ME.id && !extra.includes(p.id) && !sel.includes(p.id) && p.name.toLowerCase().includes(q.toLowerCase())).slice(0, 8)
  const add = () => {
    if (!sel.length) return
    setPrefs((p) => ({ extraMembers: { ...(p.extraMembers ?? {}), [channel.id]: [...(p.extraMembers?.[channel.id] ?? []), ...sel] } }))
    db.insert('slack.messages', { id: uid('sm'), channelId: channel.id, from: ME.id, text: `added ${sel.map((id) => '@' + person(id).name).join(', ')} to #${channel.name}.`, date: new Date().toISOString(), system: true })
    onClose()
  }
  return (
    <Modal title={`Add people to #${channel.name}`} onClose={onClose} agent="slack-add-people">
      <div className="flex flex-wrap items-center gap-1 min-h-[40px] px-2 py-1 rounded-lg border border-[#BBBABB] focus-within:border-[#1264A3]">
        {sel.map((id) => (
          <span key={id} className="inline-flex items-center gap-1 h-7 pl-0.5 pr-1.5 rounded bg-[#E8F5FA] text-[14px]">
            <SlackAvatar id={id} size={22} /> {person(id).name}
            <button aria-label={`Remove ${person(id).name}`} onClick={() => setSel((s) => s.filter((x) => x !== id))}><X size={13} /></button>
          </span>
        ))}
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={sel.length ? '' : 'Enter a name or email'} aria-label="Enter a name or email" className="flex-1 min-w-[160px] h-8 outline-none text-[15px]" />
      </div>
      <div className="mt-2 max-h-[260px] overflow-auto">
        {list.map((p) => (
          <button key={p.id} className="w-full flex items-center gap-3 px-2 h-10 rounded-lg hover:bg-[#F8F8F8] text-left" onClick={() => { setSel((s) => [...s, p.id]); setQ('') }}>
            <SlackAvatar id={p.id} size={28} />
            <span className="text-[15px] font-bold">{p.name}</span>
            <span className="text-[13px] text-[#616061] truncate">{p.title}</span>
          </button>
        ))}
      </div>
      <div className="flex justify-end mt-4">
        <button disabled={!sel.length} onClick={add} className="h-9 px-4 rounded-lg bg-[#007A5A] text-white text-[15px] font-bold disabled:bg-[#DDDDDD] disabled:text-[#868686]">Add</button>
      </div>
    </Modal>
  )
}

/* ─────────────────────────── Forward ─────────────────────────── */

export function ForwardModal({ msg, channels, onClose, onSent }: { msg: Msg; channels: SlackChannel[]; onClose: () => void; onSent: (to: string) => void }) {
  const { isAgent } = useDesk()
  const [to, setTo] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [note, setNote] = useState('')
  const opts = [
    ...channels.map((c) => ({ id: c.id, label: `#${c.name}` })),
    ...INTERNAL.map((p) => ({ id: `dm-${p.id}`, label: p.id === ME.id ? `${p.name} (you)` : p.name })),
  ].filter((o) => o.label.toLowerCase().includes(q.toLowerCase().replace(/^#/, '')))
  const send = () => {
    if (!to) return
    db.insert('slack.messages', { id: uid('sm'), channelId: to, from: ME.id, text: note.trim(), date: new Date().toISOString(), forwardedFrom: { channelId: msg.channelId, from: msg.from, text: msg.text, date: msg.date }, createdBy: isAgent ? 'hworker' : undefined })
    onSent(to)
    onClose()
  }
  return (
    <Modal title="Forward this message" onClose={onClose} agent="slack-forward">
      {to ? (
        <div className="flex items-center gap-2 h-10 px-3 rounded-lg border border-[#BBBABB]">
          <span className="inline-flex items-center gap-1 h-7 px-2 rounded bg-[#E8F5FA] text-[#1264A3] font-bold text-[14px]">{opts.find((o) => o.id === to)?.label ?? to} <button aria-label="Change destination" onClick={() => setTo(null)}><X size={13} /></button></span>
        </div>
      ) : (
        <>
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Add by name or channel" aria-label="Add by name or channel" className="w-full h-10 px-3 rounded-lg border border-[#BBBABB] text-[15px] outline-none focus:border-[#1264A3]" />
          <div className="mt-1 max-h-[200px] overflow-auto">
            {opts.slice(0, 20).map((o) => (
              <button key={o.id} className="w-full text-left px-3 h-9 rounded hover:bg-[#1264A3] hover:text-white text-[14px]" onClick={() => setTo(o.id)}>{o.label}</button>
            ))}
          </div>
        </>
      )}
      <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a message, if you’d like." aria-label="Add a message" className="mt-3 w-full h-20 resize-none rounded-lg border border-[#BBBABB] p-2 text-[15px] outline-none focus:border-[#1264A3]" />
      <div className="mt-2 border-l-4 border-[#DDDDDD] pl-3 py-1">
        <div className="flex items-center gap-1.5 text-[13px]"><SlackAvatar id={msg.from} size={16} /> <b>{nameOf(msg.from)}</b></div>
        <div className="text-[14px] line-clamp-3 whitespace-pre-wrap"><Mrkdwn text={msg.text} /></div>
      </div>
      <div className="flex justify-end mt-4">
        <button data-agent="slack-forward-send" disabled={!to} onClick={send} className="h-9 px-4 rounded-lg bg-[#007A5A] text-white text-[15px] font-bold disabled:bg-[#DDDDDD] disabled:text-[#868686]">Forward</button>
      </div>
    </Modal>
  )
}

/* ─────────────────────────── Invite ─────────────────────────── */

export function InviteModal({ onClose }: { onClose: () => void }) {
  const { toast } = useDesk()
  const [emails, setEmails] = useState('')
  const list = emails.split(/[\s,;]+/).filter((e) => /.+@.+\..+/.test(e))
  return (
    <Modal title="Invite people to Northwind Global" onClose={onClose} agent="slack-invite">
      <label className="block text-[15px] font-bold mb-1">To:</label>
      <textarea autoFocus value={emails} onChange={(e) => setEmails(e.target.value)} placeholder="name@gmail.com" aria-label="Email addresses" className="w-full h-24 resize-none rounded-lg border border-[#BBBABB] p-2 text-[15px] outline-none focus:border-[#1264A3]" />
      <div className="flex justify-end mt-4">
        <button
          disabled={!list.length}
          onClick={() => {
            toast({ appId: 'slack', title: `Invitation${list.length > 1 ? 's' : ''} sent`, body: list.join(', ') })
            onClose()
          }}
          className="h-9 px-4 rounded-lg bg-[#007A5A] text-white text-[15px] font-bold disabled:bg-[#DDDDDD] disabled:text-[#868686]"
        >
          Send
        </button>
      </div>
    </Modal>
  )
}

/* ─────────────────────────── Status ─────────────────────────── */

export function StatusModal({ onClose }: { onClose: () => void }) {
  const [prefs, setPrefs] = useSlackPrefs()
  const [emoji, setEmoji] = useState(prefs.statusEmoji ?? 'speech_balloon')
  const [text, setText] = useState(prefs.statusText ?? '')
  return (
    <Modal title="Set a status" onClose={onClose} width={480} agent="slack-status-modal">
      <div className="flex items-center gap-2 h-10 px-3 rounded-lg border border-[#BBBABB] focus-within:border-[#1264A3]">
        <span className="text-[18px]">{STATUS_EMOJI[emoji] ?? '💬'}</span>
        <input autoFocus data-agent="slack-status-text" value={text} onChange={(e) => setText(e.target.value)} placeholder="What’s your status?" aria-label="What’s your status?" className="flex-1 outline-none text-[15px]" />
        {text && <button aria-label="Clear" onClick={() => setText('')}><X size={15} /></button>}
      </div>
      <div className="mt-4 text-[13px] text-[#616061] font-bold">For Northwind Global</div>
      {STATUS_PRESETS.map(([e, t, d]) => (
        <button key={t} className="w-full flex items-center gap-3 h-10 px-2 rounded-lg hover:bg-[#F8F8F8] text-[15px] text-left" onClick={() => { setEmoji(e); setText(t) }}>
          <span className="text-[18px]">{STATUS_EMOJI[e]}</span> <b>{t}</b> <span className="text-[#616061]">— {d}</span>
        </button>
      ))}
      <div className="flex justify-between mt-5">
        <button className="h-9 px-4 rounded-lg border border-[#BBBABB] text-[15px] font-bold" onClick={() => { setPrefs({ statusEmoji: undefined, statusText: undefined }); onClose() }}>Clear status</button>
        <button data-agent="slack-status-save" className="h-9 px-4 rounded-lg bg-[#007A5A] text-white text-[15px] font-bold" onClick={() => { setPrefs({ statusEmoji: text ? emoji : undefined, statusText: text || undefined }); onClose() }}>Save</button>
      </div>
    </Modal>
  )
}

/* ─────────────────────────── Shortcuts ─────────────────────────── */

export function ShortcutsModal({ onClose }: { onClose: () => void }) {
  const rows: [string, string][] = [
    ['Enter', 'Send message'],
    ['Shift + Enter', 'New line'],
    ['Esc', 'Close menus and dialogs'],
    ['Ctrl + K', 'Jump to a conversation'],
    ['/', 'Run a shortcut (e.g. /shrug, /status, /topic)'],
    ['@', 'Mention someone'],
  ]
  return (
    <Modal title="Keyboard shortcuts" onClose={onClose} width={480}>
      {rows.map(([k, d]) => (
        <div key={k} className="flex items-center h-10 border-b border-[#F0F0F0] text-[15px]">
          <span className="flex-1">{d}</span>
          <kbd className="px-2 h-6 rounded border border-[#BBBABB] bg-[#F8F8F8] text-[12px] flex items-center font-mono">{k}</kbd>
        </div>
      ))}
    </Modal>
  )
}

/* ─────────────────────────── Profile panel ─────────────────────────── */

export function ProfilePanel({ id, onClose, onMessage, onHuddle, onStatus }: { id: string; onClose: () => void; onMessage: (id: string) => void; onHuddle: (id: string) => void; onStatus: () => void }) {
  const [prefs] = useSlackPrefs()
  const { toast } = useDesk()
  const p = person(id)
  const isMe = id === ME.id
  const status = isMe ? (prefs.statusText ? `${STATUS_EMOJI[prefs.statusEmoji ?? ''] ?? '💬'} ${prefs.statusText}` : '') : STATUS[id] ? `${STATUS[id]}` : ''
  const local = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  return (
    <div className="w-[360px] shrink-0 border-l border-[#DDDDDD] flex flex-col" data-agent="slack-profile">
      <div className="h-[49px] shrink-0 flex items-center px-4 border-b border-[#DDDDDD]">
        <div className="text-[18px] font-black flex-1">Profile</div>
        <button aria-label="Close profile" onClick={onClose} className="w-8 h-8 rounded-md hover:bg-[#F2F2F2] flex items-center justify-center text-[#616061]"><X size={18} /></button>
      </div>
      <div className="flex-1 overflow-auto p-5">
        <div className="flex justify-center"><SlackAvatar id={id} size={200} /></div>
        <div className="mt-4 text-[22px] font-black">{p.name}</div>
        <div className="text-[15px] text-[#1D1C1D]">{p.title}</div>
        {status && <div className="mt-1 text-[14px]">{status}</div>}
        <div className="mt-2 flex items-center gap-1.5 text-[14px] text-[#616061]"><Clock size={14} /> {local} local time</div>
        <div className="flex gap-2 mt-4">
          {isMe ? (
            <button className="h-8 px-3 rounded-lg border border-[#BBBABB] text-[13px] font-bold hover:bg-[#F8F8F8]" onClick={onStatus}>Set a status</button>
          ) : (
            <>
              <button className="h-8 px-3 rounded-lg border border-[#BBBABB] text-[13px] font-bold hover:bg-[#F8F8F8] flex items-center gap-1.5" onClick={() => onMessage(id)}><MessageSquareText size={14} /> Message</button>
              <button className="h-8 px-3 rounded-lg border border-[#BBBABB] text-[13px] font-bold hover:bg-[#F8F8F8] flex items-center gap-1.5" onClick={() => onHuddle(id)}><Headphones size={14} /> Huddle</button>
            </>
          )}
        </div>
        <div className="mt-6 pt-4 border-t border-[#DDDDDD] space-y-3 text-[14px]">
          <div className="text-[15px] font-black">Contact information</div>
          <button className="flex items-center gap-2 text-[#1264A3] hover:underline" onClick={() => { copyText(p.email); toast({ appId: 'slack', title: 'Email copied', body: p.email }) }}><Mail size={15} /> {p.email}</button>
          <div className="flex items-center gap-2"><Phone size={15} className="text-[#616061]" /> {p.phone}</div>
        </div>
        <div className="mt-6 pt-4 border-t border-[#DDDDDD] text-[14px]">
          <div className="text-[15px] font-black mb-2">About me</div>
          <div><span className="text-[#616061]">Department:</span> {p.dept}</div>
          <div><span className="text-[#616061]">Location:</span> {p.location}</div>
          {p.managerId && <div><span className="text-[#616061]">Reports to:</span> {person(p.managerId).name}</div>}
        </div>
      </div>
    </div>
  )
}
