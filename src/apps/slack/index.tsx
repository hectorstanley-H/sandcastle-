import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  ArrowLeft, ArrowRight, Clock, Search, HelpCircle, Home, MessagesSquare, Bell, Bookmark, MoreHorizontal, Plus, ChevronDown,
  SquarePen, SlidersHorizontal, MessageSquareText, Headphones, SendHorizontal, Hash, Lock, X, Layers, FileText, Pin, Users, Star,
  BellOff, CheckCircle2, Mic, MicOff, Link2, Copy, Info, Circle, Keyboard, UserPlus, BookmarkCheck,
} from 'lucide-react'
import type { AppProps } from '@/os/registry'
import { logoUrl } from '@/os/registry'
import { WindowControls } from '@/os/Window'
import { useDesk } from '@/os/context'
import { ME, PEOPLE, person } from '@/data/people'
import { db, uid, useCollection, useRecord } from '@/db/db'
import { Composer, FileChip, Message, MessageList, Mrkdwn, SlackAvatar, STATUS, nameOf, timeOf, type MsgActions } from './parts'
import { AppsPage, BrowsePage, CanvasesPage, DirectoryPage, DraftsPage, FilesPage, HuddlesPage, InfoPage, NewMessagePage, SearchPage, ThreadsPage } from './pages'
import { AddPeopleModal, ChannelDetailsModal, CreateChannelModal, ForwardModal, InviteModal, NotifModal, ProfilePanel, ShortcutsModal, StatusModal } from './modals'
import { MItem, MSep, Pop, STATUS_EMOJI, copyText, useMenu, useSlackPrefs, type Msg, type SlackChannel, type SlackFile } from './ui'

export const SLACK_CHANNELS = [
  { id: 'general', name: 'general', topic: 'Company-wide announcements and work-based matters', members: 214 },
  { id: 'announcements', name: 'announcements', topic: 'Official announcements · posting restricted to team leads', members: 214 },
  { id: 'ops-team', name: 'ops-team', topic: 'Northwind Operations · stand-up 9:15 ET · ops review Thursdays', members: 18 },
  { id: 'it-help', name: 'it-help', topic: 'Ask IT anything · urgent? raise a ServiceNow ticket', members: 187 },
  { id: 'eng-bugs', name: 'eng-bugs', topic: 'Report bugs here with repro steps + impact · triaged daily into Jira OPS', members: 46 },
  { id: 'sales', name: 'sales', topic: 'Pipeline, wins and deal help', members: 39 },
  { id: 'finance', name: 'finance', topic: 'Finance ops · payment runs · close calendar', members: 22, private: true },
  { id: 'people-team', name: 'people-team', topic: 'HR, onboarding and people programs', members: 14, private: true },
  { id: 'new-hires', name: 'new-hires', topic: 'Say hi to the newest Northwinders 👋', members: 201 },
  { id: 'random', name: 'random', topic: 'Non-work banter and water cooler conversation', members: 198 },
]
const INTERNAL = PEOPLE.filter((p) => !p.external)

const presenceOf = (id: string) => (['david', 'marcus', 'nina', 'jordan'].includes(id) ? 'away' : 'available')

/* ─────────────────────────── App ─────────────────────────── */

type Tab = 'home' | 'dms' | 'activity' | 'later' | 'more'
type Page = 'conv' | 'threads' | 'huddles' | 'drafts' | 'directory' | 'browse' | 'files' | 'canvases' | 'apps' | 'search' | 'compose' | 'templates' | 'workflows' | 'lists' | 'external'
type ModalState =
  | { kind: 'create' }
  | { kind: 'details'; tab?: 'about' | 'members' | 'settings' }
  | { kind: 'notif' }
  | { kind: 'add' }
  | { kind: 'forward'; msg: Msg }
  | { kind: 'invite' }
  | { kind: 'status' }
  | { kind: 'shortcuts' }

function CanvasTab({ conv, title }: { conv: string; title: string }) {
  const id = `canvas-${conv}`
  const rec = useRecord<any>('slack.canvases', id)
  const [t, setT] = useState<string>(rec?.title ?? '')
  const [body, setBody] = useState<string>(rec?.text ?? '')
  useEffect(() => {
    setT(rec?.title ?? '')
    setBody(rec?.text ?? '')
  }, [conv])
  const save = (patch: { title?: string; text?: string }) => db.upsert('slack.canvases', { id, conv, title: t, text: body, ...patch, updated: new Date().toISOString() })
  return (
    <div className="flex-1 min-h-0 overflow-auto">
      <div className="max-w-[760px] mx-auto px-8 py-8">
        <input data-agent="slack-canvas-title" value={t} onChange={(e) => { setT(e.target.value); save({ title: e.target.value }) }} placeholder={`${title} canvas`} aria-label="Canvas title" className="w-full text-[30px] font-black outline-none placeholder:text-[#BBBABB]" />
        <div className="text-[13px] text-[#616061] mt-1 mb-4">{rec?.updated ? `Last edited ${new Date(rec.updated).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}` : 'Canvases are shared with everyone in this conversation'}</div>
        <textarea data-agent="slack-canvas-body" value={body} onChange={(e) => { setBody(e.target.value); save({ text: e.target.value }) }} placeholder="Start typing… use it for meeting notes, checklists, project briefs." aria-label="Canvas" className="w-full min-h-[420px] resize-none outline-none text-[15px] leading-[24px]" />
      </div>
    </div>
  )
}

export default function Slack({ win, params }: AppProps) {
  const { isAgent, open: deskOpen, toast } = useDesk()
  const all = useCollection<Msg>('slack.messages')
  const custom = useCollection<SlackChannel>('slack.channels')
  const [prefs, setPrefs] = useSlackPrefs()
  const [tab, setTab] = useState<Tab>('home')
  const [conv, setConv] = useState<string>('eng-bugs')
  const [thread, setThread] = useState<string | null>(null)
  const [profile, setProfile] = useState<string | null>(null)
  const [visited, setVisited] = useState<Set<string>>(() => new Set(['eng-bugs']))
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [page, setPage] = useState<Page>('conv')
  const [convTab, setConvTab] = useState<'messages' | 'canvas' | 'files' | 'pins'>('messages')
  const [modal, setModal] = useState<ModalState | null>(null)
  const [huddle, setHuddle] = useState<{ conv: string; start: number; muted: boolean } | null>(null)
  const [unreadsOnly, setUnreadsOnly] = useState(false)
  const [alsoSend, setAlsoSend] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [searchQ, setSearchQ] = useState('')
  const [actFilter, setActFilter] = useState<'mentions' | 'threads' | 'reactions'>('mentions')
  const [, setTick] = useState(0)
  const hist = useRef<{ stack: string[]; i: number }>({ stack: ['eng-bugs'], i: 0 })
  const searchRef = useRef<HTMLDivElement>(null)
  const wsMenu = useMenu()
  const railWsMenu = useMenu()
  const createMenu = useMenu()
  const meMenu = useMenu()
  const histMenu = useMenu()
  const helpMenu = useMenu()
  const addChMenu = useMenu()
  const huddleMenu = useMenu()
  const headerMore = useMenu()
  const threadMore = useMenu()

  const channels: SlackChannel[] = useMemo(
    () =>
      [...SLACK_CHANNELS, ...custom.filter((c) => !SLACK_CHANNELS.some((s) => s.id === c.id))].map((c) => ({
        ...c,
        topic: prefs.topics?.[c.id] ?? c.topic,
        members: c.members + (prefs.extraMembers?.[c.id]?.length ?? 0),
      })),
    [custom, prefs.topics, prefs.extraMembers],
  )

  useEffect(() => {
    if (params?.channelId) open(params.channelId)
    else if (params?.dmId) open(String(params.dmId).startsWith('dm-') ? params.dmId : `dm-${params.dmId}`)
    if (params?.threadTs) setThread(params.threadTs)
  }, [win.nonce])

  // deliver scheduled messages when due
  useEffect(() => {
    const deliver = () => {
      for (const s of db.get<any>('slack.scheduled')) {
        if (+new Date(s.at) <= Date.now() && db.find('slack.scheduled', s.id)) {
          db.remove('slack.scheduled', s.id)
          db.insert('slack.messages', { id: uid('sm'), channelId: s.channelId, from: ME.id, text: s.text, date: new Date().toISOString(), threadTs: s.threadTs, ...(s.files ? { files: s.files } : {}) })
        }
      }
    }
    deliver()
    const t = setInterval(deliver, 15000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!searchOpen) return
    const onDown = (e: MouseEvent) => searchRef.current && !searchRef.current.contains(e.target as Node) && setSearchOpen(false)
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [searchOpen])

  const open = (id: string, fromHistory = false) => {
    setConv(id)
    setThread(null)
    setProfile(null)
    setTab('home')
    setPage('conv')
    setConvTab('messages')
    setVisited((v) => new Set(v).add(id))
    if (!fromHistory) {
      const h = hist.current
      if (h.stack[h.i] !== id) {
        h.stack = [...h.stack.slice(0, h.i + 1), id].slice(-50)
        h.i = h.stack.length - 1
      }
    }
  }
  const goHist = (dir: number) => {
    const h = hist.current
    const n = h.i + dir
    if (n < 0 || n >= h.stack.length) return
    h.i = n
    open(h.stack[n], true)
    setTick((t) => t + 1)
  }
  const openThread = (channelId: string, ts: string) => {
    open(channelId)
    setTimeout(() => setThread(ts), 0)
  }

  const isDm = conv.startsWith('dm-')
  const dmPerson = isDm ? person(conv.slice(3)) : null
  const channel = channels.find((c) => c.id === conv)
  const top = useMemo(() => all.filter((m) => m.channelId === conv && !m.threadTs).sort((a, b) => +new Date(a.date) - +new Date(b.date)), [all, conv])
  const threadParent = thread ? all.find((m) => m.id === thread) : undefined
  const threadReplies = thread ? all.filter((m) => m.threadTs === thread).sort((a, b) => +new Date(a.date) - +new Date(b.date)) : []
  const starred = prefs.starred ?? []
  const muted = prefs.muted ?? []

  const runCommand = (text: string): boolean => {
    const [cmd, ...rest] = text.split(' ')
    const arg = rest.join(' ').trim()
    if (cmd === '/shrug') {
      db.insert('slack.messages', { id: uid('sm'), channelId: conv, from: ME.id, text: `${arg} ¯\\_(ツ)_/¯`.trim(), date: new Date().toISOString() })
      return true
    }
    if (cmd === '/status') {
      const m = /^:([a-z0-9_+-]+):\s*(.*)$/.exec(arg)
      setPrefs({ statusEmoji: m ? m[1] : 'speech_balloon', statusText: (m ? m[2] : arg) || undefined })
      toast({ appId: 'slack', title: arg ? 'Status updated' : 'Status cleared', body: arg || undefined })
      return true
    }
    if (cmd === '/away') {
      setPrefs({ away: !prefs.away })
      toast({ appId: 'slack', title: prefs.away ? 'You’re now active' : 'You’re now set to away' })
      return true
    }
    if (cmd === '/topic' && channel) {
      setPrefs((p) => ({ topics: { ...(p.topics ?? {}), [channel.id]: arg } }))
      db.insert('slack.messages', { id: uid('sm'), channelId: conv, from: ME.id, text: `set the channel topic: ${arg}`, date: new Date().toISOString(), system: true })
      return true
    }
    if (cmd === '/remind') {
      db.insert('slack.messages', { id: uid('sm'), channelId: `dm-${ME.id}`, from: ME.id, text: `Reminder: ${arg || 'follow up'}`, date: new Date().toISOString(), saved: true })
      toast({ appId: 'slack', title: 'Reminder saved', body: 'You’ll find it in Later.' })
      return true
    }
    toast({ appId: 'slack', title: `${cmd} is not a valid command`, body: 'Type / to see available shortcuts.' })
    return true
  }

  const post = (text: string, threadTs?: string, files?: SlackFile[]) => {
    if (text.startsWith('/') && !files && runCommand(text)) return
    db.insert('slack.messages', { id: uid('sm'), channelId: conv, from: ME.id, text, date: new Date().toISOString(), threadTs, createdBy: isAgent ? 'hworker' : undefined, ...(files ? { files } : {}) })
  }
  const schedule = (text: string, at: Date, files?: SlackFile[], threadTs?: string) => {
    db.insert('slack.scheduled', { id: uid('sch'), channelId: conv, text, at: at.toISOString(), threadTs, files })
    toast({ appId: 'slack', title: 'Message scheduled', body: `Sends ${at.toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' })} · see Drafts & sent` })
  }
  const react = (m: Msg, e: string) => {
    db.update('slack.messages', m.id, (r) => {
      const rs = [...(r.reactions ?? [])]
      const i = rs.findIndex((x: any) => x.emoji === e)
      if (i < 0) rs.push({ emoji: e, users: [ME.id] })
      else {
        const has = rs[i].users.includes(ME.id)
        const users = has ? rs[i].users.filter((u: string) => u !== ME.id) : [...rs[i].users, ME.id]
        if (users.length) rs[i] = { ...rs[i], users }
        else rs.splice(i, 1)
      }
      return { reactions: rs }
    })
  }

  const actions: MsgActions = {
    onReact: react,
    onThread: (m) => {
      setThread(m.id)
      setProfile(null)
    },
    onProfile: (id) => {
      if (id.startsWith('bot:')) return
      setProfile(id)
      setThread(null)
    },
    onForward: (m) => setModal({ kind: 'forward', msg: m }),
    onSave: (m) => db.update('slack.messages', m.id, { saved: !(m.saved && !m.savedDone), savedDone: false }),
    onPin: (m) => db.update('slack.messages', m.id, { pinned: !m.pinned }),
    onEdit: (m, t) => db.update('slack.messages', m.id, { text: t, edited: true }),
    onDelete: (m) => db.update('slack.messages', m.id, { deleted: true }),
    onMarkUnread: (m) =>
      setVisited((v) => {
        const n = new Set(v)
        n.delete(m.channelId)
        return n
      }),
    onCopyLink: (m) => {
      copyText(`https://northwind.slack.com/archives/${m.channelId}/p${+new Date(m.date)}`)
      toast({ appId: 'slack', title: 'Link copied', body: 'Message link copied to clipboard.' })
    },
  }

  const unread = (id: string) => !visited.has(id) && !muted.includes(id) && all.some((m) => m.channelId === id && m.from !== ME.id && Date.now() - +new Date(m.date) < 3 * 3600_000)
  const lastMsg = (id: string) => all.filter((m) => m.channelId === id).sort((a, b) => +new Date(b.date) - +new Date(a.date))[0]
  const dmOrder = [...INTERNAL].sort((a, b) => {
    const la = lastMsg(`dm-${a.id}`)?.date ?? ''
    const lb = lastMsg(`dm-${b.id}`)?.date ?? ''
    if (a.id === ME.id) return 1
    if (b.id === ME.id) return -1
    return lb.localeCompare(la)
  })
  const unreadDms = INTERNAL.filter((p) => unread(`dm-${p.id}`)).length
  const mentions = all.filter((m) => /@Alex|Alex/.test(m.text) && m.from !== ME.id && Date.now() - +new Date(m.date) < 86400_000 && !visited.has(m.channelId)).length

  const title = channel ? `#${channel.name}` : dmPerson?.name ?? ''
  const rail: [Tab, any, string, number?][] = [
    ['home', Home, 'Home'],
    ['dms', MessagesSquare, 'DMs', unreadDms || undefined],
    ['activity', Bell, 'Activity', mentions || undefined],
    ['later', Bookmark, 'Later', all.filter((m) => m.saved && !m.savedDone).length || undefined],
    ['more', MoreHorizontal, 'More'],
  ]

  const startHuddle = (c: string) => {
    if (huddle) endHuddle()
    setHuddle({ conv: c, start: Date.now(), muted: false })
  }
  const endHuddle = () => {
    if (!huddle) return
    const secs = Math.round((Date.now() - huddle.start) / 1000)
    db.insert('slack.huddles', { id: uid('hd'), conv: huddle.conv, seconds: secs, date: new Date().toISOString() })
    db.insert('slack.messages', { id: uid('sm'), channelId: huddle.conv, from: ME.id, text: `A huddle happened · lasted ${Math.max(1, Math.round(secs / 60))} min`, date: new Date().toISOString(), system: true })
    setHuddle(null)
  }

  const SideItem = ({ id, agent, icon, label, bold, active, badge, dim }: { id: string; agent: string; icon: ReactNode; label: ReactNode; bold?: boolean; active?: boolean; badge?: number; dim?: boolean }) => (
    <button
      data-agent={agent}
      aria-label={typeof label === 'string' ? label : id}
      onClick={() => open(id)}
      className={`w-full h-7 flex items-center gap-2 pl-4 pr-3 rounded-md text-[15px] text-left ${active ? 'bg-white/90 text-[#39063A]' : bold ? 'text-white font-bold hover:bg-white/10' : dim ? 'text-[#E3D7E3]/40 hover:bg-white/10' : 'text-[#E3D7E3]/80 hover:bg-white/10'}`}
    >
      <span className="w-5 flex justify-center shrink-0">{icon}</span>
      <span className="truncate flex-1">{label}</span>
      {!!badge && <span className="h-[18px] min-w-[18px] px-1 rounded-full bg-[#CD2553] text-white text-[11px] font-bold flex items-center justify-center">{badge}</span>}
    </button>
  )
  const NavItem = ({ p, icon, label }: { p: Page; icon: any; label: string }) => {
    const I = icon
    const on = tab === 'home' && page === p
    return (
      <button onClick={() => { setPage(p); setThread(null); setProfile(null) }} className={`w-full h-7 flex items-center gap-2 pl-4 pr-3 rounded-md text-[15px] ${on ? 'bg-white/90 text-[#39063A]' : 'text-[#E3D7E3]/80 hover:bg-white/10'}`}>
        <span className="w-5 flex justify-center"><I size={16} /></span>
        {label}
      </button>
    )
  }
  const channelItem = (c: SlackChannel) => {
    const u = unread(c.id)
    if (unreadsOnly && !u && conv !== c.id) return null
    return <SideItem key={c.id} id={c.id} agent={`slack-channel-${c.id}`} icon={c.private ? <Lock size={14} /> : <Hash size={15} />} label={c.name} bold={u} active={tab === 'home' && page === 'conv' && conv === c.id} dim={muted.includes(c.id)} badge={c.id === 'it-help' && u ? 1 : undefined} />
  }

  const workspaceMenuItems = (close: () => void) => (
    <>
      <div className="px-4 pt-1 pb-2">
        <div className="text-[15px] font-black">Northwind Global</div>
        <div className="text-[12.5px] text-[#616061]">northwind.slack.com</div>
      </div>
      <MSep />
      <MItem icon={<UserPlus size={14} />} label="Invite people to Northwind Global" onClick={() => { setModal({ kind: 'invite' }); close() }} />
      <MItem icon={<Plus size={14} />} label="Create a channel" onClick={() => { setModal({ kind: 'create' }); close() }} />
      <MItem icon={<Hash size={14} />} label="Browse channels" onClick={() => { setTab('home'); setPage('browse'); close() }} />
      <MSep />
      <MItem icon={<CheckCircle2 size={14} />} label="Mark all as read" onClick={() => { setVisited(new Set([...channels.map((c) => c.id), ...INTERNAL.map((p) => `dm-${p.id}`)])); close() }} />
      <MItem icon={<BellOff size={14} />} label={prefs.paused ? 'Resume notifications' : 'Pause notifications'} onClick={() => { setPrefs({ paused: !prefs.paused }); close() }} />
    </>
  )

  const sideTitle = page === 'threads' ? 'threads' : page === 'huddles' ? 'huddles' : page === 'drafts' ? 'drafts' : page === 'directory' ? 'directory' : ''
  const mainPage = (() => {
    switch (page) {
      case 'threads': return <ThreadsPage all={all} onThread={openThread} />
      case 'huddles': return <HuddlesPage channels={channels} onStart={(c) => { open(c); startHuddle(c) }} />
      case 'drafts': return <DraftsPage all={all} onOpen={(id) => open(id)} />
      case 'directory': return <DirectoryPage onProfile={(id) => setProfile(id)} onOpen={(id) => open(id)} />
      case 'browse': return <BrowsePage channels={channels} all={all} onOpen={(id) => open(id)} onCreate={() => setModal({ kind: 'create' })} />
      case 'files': return <FilesPage all={all} onOpen={(id) => open(id)} />
      case 'canvases': return <CanvasesPage onOpen={(id) => { open(id); setConvTab('canvas') }} />
      case 'apps': return <AppsPage />
      case 'search': return <SearchPage query={searchQ} all={all} channels={channels} onOpen={(id) => open(id)} onThread={openThread} onProfile={(id) => setProfile(id)} />
      case 'compose': return <NewMessagePage channels={channels} onClose={() => setPage('conv')} onSend={(to, t, files) => { open(to); db.insert('slack.messages', { id: uid('sm'), channelId: to, from: ME.id, text: t, date: new Date().toISOString(), createdBy: isAgent ? 'hworker' : undefined, ...(files ? { files } : {}) }) }} />
      case 'templates': return <InfoPage title="Templates" body="Templates give you a head start on common projects — channels, canvases and lists with everything set up. Your workspace admins haven’t published any templates yet." />
      case 'workflows': return <InfoPage title="Workflows" body="Automate routine tasks with Workflow Builder. No workflows have been shared with you in Northwind Global yet." />
      case 'lists': return <InfoPage title="Lists" body="Track projects and requests in lists. Lists you create or that are shared with you will appear here." />
      case 'external': return <InfoPage title="External connections" body="Northwind Global isn’t connected to any external organizations through Slack Connect." />
      default: return null
    }
  })()

  const pinned = top.filter((m) => m.pinned && !m.deleted)
  const convFiles = all.filter((m) => m.channelId === conv && m.files?.length && !m.deleted).flatMap((m) => m.files!.map((f) => ({ f, m })))
  const meStatus = prefs.statusText ? `${STATUS_EMOJI[prefs.statusEmoji ?? ''] ?? '💬'}` : STATUS[ME.id]
  const searchResults = searchText.trim()
    ? [
        ...channels.filter((c) => c.name.includes(searchText.toLowerCase().replace(/^#/, ''))).slice(0, 4).map((c) => ({ key: c.id, icon: c.private ? <Lock size={14} /> : <Hash size={15} />, label: c.name, go: () => open(c.id) })),
        ...INTERNAL.filter((p) => p.name.toLowerCase().includes(searchText.toLowerCase())).slice(0, 4).map((p) => ({ key: p.id, icon: <SlackAvatar id={p.id} size={18} />, label: p.name, go: () => open(`dm-${p.id}`) })),
      ]
    : []

  return (
    <div
      className="relative flex-1 min-h-0 flex flex-col text-[#1D1C1D] select-none"
      style={{ fontFamily: 'Lato, "Slack-Lato", Helvetica, Arial, sans-serif', background: 'linear-gradient(180deg,#481349 0%,#3F0E40 100%)' }}
      onKeyDown={(e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
          e.preventDefault()
          setSearchOpen(true)
        }
      }}
    >
      {/* top bar */}
      <div data-drag-handle className="h-10 shrink-0 flex items-center text-white">
        <div className="w-[76px]" />
        <div className="flex items-center gap-1 text-white/80" data-no-drag>
          <button className={`w-7 h-7 rounded flex items-center justify-center hover:bg-white/10 ${hist.current.i > 0 ? '' : 'opacity-50'}`} aria-label="Back" onClick={() => goHist(-1)}><ArrowLeft size={17} /></button>
          <button className={`w-7 h-7 rounded flex items-center justify-center hover:bg-white/10 ${hist.current.i < hist.current.stack.length - 1 ? '' : 'opacity-50'}`} aria-label="Forward" onClick={() => goHist(1)}><ArrowRight size={17} /></button>
          <div className="relative" ref={histMenu.ref}>
            <button className="w-7 h-7 rounded flex items-center justify-center hover:bg-white/10" aria-label="History" onClick={histMenu.toggle}><Clock size={16} /></button>
            {histMenu.open && (
              <Pop className="left-0 top-8 w-[280px]">
                <div className="px-4 pb-1 text-[12px] font-bold text-[#616061]">Recent</div>
                {[...new Set([...hist.current.stack].reverse())].slice(0, 10).map((id) => (
                  <MItem key={id} icon={id.startsWith('dm-') ? <SlackAvatar id={id.slice(3)} size={16} /> : <Hash size={14} />} label={id.startsWith('dm-') ? person(id.slice(3)).name : channels.find((c) => c.id === id)?.name ?? id} onClick={() => { open(id); histMenu.close() }} />
                ))}
              </Pop>
            )}
          </div>
        </div>
        <div className="flex-1 flex justify-center px-3" data-no-drag>
          <div className="relative w-full max-w-[680px]" ref={searchRef}>
            <button className="w-full h-[26px] rounded-md bg-white/20 hover:bg-white/25 flex items-center gap-2 px-2.5 text-[13px] text-white/90 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.15)]" onClick={() => setSearchOpen(true)}>
              <Search size={14} /> Search Northwind Global
            </button>
            {searchOpen && (
              <div className="absolute left-0 right-0 -top-1 z-50 bg-white text-[#1D1C1D] rounded-lg shadow-[0_8px_28px_rgba(0,0,0,0.35)] overflow-hidden" data-agent="slack-search-panel">
                <div className="flex items-center gap-2 px-3 h-11 border-b border-[#DDDDDD]">
                  <Search size={16} className="text-[#616061]" />
                  <input
                    autoFocus
                    data-agent="slack-search-input"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && searchText.trim()) {
                        setSearchQ(searchText.trim())
                        setTab('home')
                        setPage('search')
                        setThread(null)
                        setSearchOpen(false)
                      }
                      if (e.key === 'Escape') setSearchOpen(false)
                    }}
                    placeholder="Search for messages, files, people… (try in:#eng-bugs or from:maya)"
                    aria-label="Search"
                    className="flex-1 outline-none text-[15px]"
                  />
                  {searchText && <button aria-label="Clear search" onClick={() => setSearchText('')}><X size={16} /></button>}
                </div>
                <div className="py-1.5 max-h-[340px] overflow-auto">
                  {searchResults.map((r) => (
                    <button key={r.key} className="w-full flex items-center gap-2 px-4 h-9 text-[14px] hover:bg-[#1264A3] hover:text-white text-left" onClick={() => { r.go(); setSearchOpen(false) }}>
                      <span className="w-5 flex justify-center">{r.icon}</span> {r.label}
                    </button>
                  ))}
                  {searchText.trim() && (
                    <button className="w-full flex items-center gap-2 px-4 h-9 text-[14px] hover:bg-[#1264A3] hover:text-white text-left" onClick={() => { setSearchQ(searchText.trim()); setTab('home'); setPage('search'); setThread(null); setSearchOpen(false) }}>
                      <Search size={14} /> Search all messages for “{searchText.trim()}”
                    </button>
                  )}
                  {!searchText.trim() && (
                    <>
                      <div className="px-4 pt-1 pb-1 text-[12px] font-bold text-[#616061]">Recent conversations</div>
                      {[...new Set([...hist.current.stack].reverse())].slice(0, 5).map((id) => (
                        <button key={id} className="w-full flex items-center gap-2 px-4 h-9 text-[14px] hover:bg-[#1264A3] hover:text-white text-left" onClick={() => { open(id); setSearchOpen(false) }}>
                          <span className="w-5 flex justify-center">{id.startsWith('dm-') ? <SlackAvatar id={id.slice(3)} size={18} /> : <Hash size={15} />}</span>
                          {id.startsWith('dm-') ? person(id.slice(3)).name : channels.find((c) => c.id === id)?.name ?? id}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="relative" ref={helpMenu.ref} data-no-drag>
          <button className="w-8 h-7 rounded flex items-center justify-center hover:bg-white/10 text-white/80 mr-1" aria-label="Help" onClick={helpMenu.toggle}><HelpCircle size={17} /></button>
          {helpMenu.open && (
            <Pop className="right-0 top-8 w-[240px]">
              <MItem icon={<HelpCircle size={14} />} label="Help Center" onClick={() => { deskOpen('edge', { q: 'Slack help center' }); helpMenu.close() }} />
              <MItem icon={<Keyboard size={14} />} label="Keyboard shortcuts" onClick={() => { setModal({ kind: 'shortcuts' }); helpMenu.close() }} />
              <MItem icon={<Info size={14} />} label="What’s new" onClick={() => { toast({ appId: 'slack', title: 'What’s new in Slack', body: 'Huddles, canvases and scheduled messages are available in Northwind Global.' }); helpMenu.close() }} />
            </Pop>
          )}
        </div>
        <WindowControls dark height={40} />
      </div>
      <div className="flex-1 min-h-0 flex">
        {/* tab rail */}
        <div className="w-[70px] shrink-0 flex flex-col items-center pt-1 pb-3 gap-3">
          <div className="relative" ref={railWsMenu.ref}>
            <button className="w-9 h-9 rounded-lg bg-white flex items-center justify-center text-[#3F0E40] font-black text-[17px] shadow mb-1" aria-label="Northwind Global" onClick={railWsMenu.toggle}>N</button>
            {railWsMenu.open && <Pop className="left-10 top-0 w-[300px]">{workspaceMenuItems(railWsMenu.close)}</Pop>}
          </div>
          {rail.map(([id, I, label, badge]) => (
            <button key={id} data-agent={`slack-tab-${id}`} onClick={() => setTab(id)} className="flex flex-col items-center gap-0.5 group" aria-label={label}>
              <span className={`relative w-9 h-9 rounded-lg flex items-center justify-center text-white ${tab === id ? 'bg-white/25' : 'group-hover:bg-white/15'}`}>
                <I size={19} strokeWidth={tab === id ? 2.4 : 1.9} />
                {badge && <span className="absolute -top-1 -right-1.5 h-4 min-w-4 px-1 rounded-full bg-[#CD2553] text-[10px] font-bold flex items-center justify-center border-2 border-[#481349]">{badge}</span>}
              </span>
              <span className="text-[11px] font-bold text-white">{label}</span>
            </button>
          ))}
          <div className="flex-1" />
          <div className="relative" ref={createMenu.ref}>
            <button className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center" aria-label="Create new" onClick={createMenu.toggle}><Plus size={20} /></button>
            {createMenu.open && (
              <Pop className="left-10 bottom-0 w-[240px]">
                <div className="px-4 pb-1 text-[12px] font-bold text-[#616061]">Create</div>
                <MItem icon={<SquarePen size={14} />} label="Message" onClick={() => { setTab('home'); setPage('compose'); createMenu.close() }} />
                <MItem icon={<Hash size={14} />} label="Channel" onClick={() => { setModal({ kind: 'create' }); createMenu.close() }} />
                <MItem icon={<Headphones size={14} />} label="Huddle" onClick={() => { startHuddle(conv); createMenu.close() }} />
                <MItem icon={<FileText size={14} />} label="Canvas" onClick={() => { setTab('home'); setPage('conv'); setConvTab('canvas'); createMenu.close() }} />
              </Pop>
            )}
          </div>
          <div className="relative" ref={meMenu.ref}>
            <button className="relative block" aria-label="Your profile" onClick={meMenu.toggle}>
              <SlackAvatar id={ME.id} size={36} />
              <span className={`absolute -right-1 -bottom-1 w-3.5 h-3.5 rounded-full border-[3px] border-[#3F0E40] ${prefs.away ? 'bg-[#3F0E40] shadow-[inset_0_0_0_1.5px_#C9B6C9]' : 'bg-[#2BAC76]'}`} />
            </button>
            {meMenu.open && (
              <Pop className="left-10 bottom-0 w-[280px]">
                <div className="flex items-center gap-3 px-4 pb-2">
                  <SlackAvatar id={ME.id} size={36} />
                  <div className="min-w-0">
                    <div className="text-[15px] font-black truncate">{ME.name}</div>
                    <div className="text-[13px] text-[#616061] flex items-center gap-1"><Circle size={9} fill={prefs.away ? 'none' : '#2BAC76'} stroke={prefs.away ? '#616061' : '#2BAC76'} /> {prefs.away ? 'Away' : 'Active'}</div>
                  </div>
                </div>
                <button className="mx-3 mb-1 w-[calc(100%-24px)] h-8 px-2 rounded-md border border-[#BBBABB] text-[13px] text-left text-[#616061] hover:border-[#1264A3]" onClick={() => { setModal({ kind: 'status' }); meMenu.close() }}>
                  {prefs.statusText ? `${STATUS_EMOJI[prefs.statusEmoji ?? ''] ?? '💬'} ${prefs.statusText}` : '🙂 Update your status'}
                </button>
                <MSep />
                <MItem label={`Set yourself as ${prefs.away ? 'active' : 'away'}`} onClick={() => { setPrefs({ away: !prefs.away }); meMenu.close() }} />
                <MItem label={prefs.paused ? 'Resume notifications' : 'Pause notifications'} hint={prefs.paused ? 'Paused' : undefined} onClick={() => { setPrefs({ paused: !prefs.paused }); meMenu.close() }} />
                <MSep />
                <MItem label="Profile" onClick={() => { setTab('home'); setProfile(ME.id); setThread(null); meMenu.close() }} />
                <MItem icon={<Keyboard size={14} />} label="Keyboard shortcuts" onClick={() => { setModal({ kind: 'shortcuts' }); meMenu.close() }} />
              </Pop>
            )}
          </div>
        </div>

        {/* sidebar + main in one rounded container */}
        <div className="flex-1 min-w-0 flex mr-1 mb-1 rounded-lg overflow-hidden shadow-[0_0_0_1px_rgba(0,0,0,0.2)]">
          <div className="w-[262px] shrink-0 flex flex-col bg-white/[0.07] border-r border-white/10">
            {tab === 'home' && (
              <>
                <div className="h-[50px] shrink-0 flex items-center px-4 gap-1 text-white">
                  <div className="relative" ref={wsMenu.ref}>
                    <button className="flex items-center gap-1 text-[18px] font-black hover:bg-white/10 rounded px-1 -ml-1 whitespace-nowrap" onClick={wsMenu.toggle}>Northwind Global <ChevronDown size={16} /></button>
                    {wsMenu.open && <Pop className="left-0 top-9 w-[300px]">{workspaceMenuItems(wsMenu.close)}</Pop>}
                  </div>
                  <div className="flex-1" />
                  <button className={`w-8 h-8 rounded-md flex items-center justify-center hover:bg-white/10 ${unreadsOnly ? 'bg-white/20' : ''}`} aria-label="Filter" title={unreadsOnly ? 'Showing unreads only' : 'Show unreads only'} onClick={() => setUnreadsOnly((v) => !v)}><SlidersHorizontal size={16} /></button>
                  <button className="w-8 h-8 rounded-md flex items-center justify-center bg-white text-[#3F0E40] hover:bg-white/90" aria-label="New message" onClick={() => { setPage('compose'); setThread(null); setProfile(null) }}><SquarePen size={16} /></button>
                </div>
                <div className="flex-1 min-h-0 overflow-auto px-2 pb-3" data-agent="slack-sidebar">
                  <NavItem p="threads" icon={MessageSquareText} label="Threads" />
                  <NavItem p="huddles" icon={Headphones} label="Huddles" />
                  <NavItem p="drafts" icon={SendHorizontal} label="Drafts & sent" />
                  <NavItem p="directory" icon={Layers} label="Directories" />
                  {starred.length > 0 && (
                    <div className="mt-3">
                      <button onClick={() => setCollapsed((c) => ({ ...c, st: !c.st }))} className="flex items-center gap-1 h-7 pl-2 pr-2 rounded-md text-[15px] text-[#E3D7E3]/80 hover:bg-white/10 w-full">
                        <ChevronDown size={14} className={collapsed.st ? '-rotate-90' : ''} /> Starred
                      </button>
                      {!collapsed.st && channels.filter((c) => starred.includes(c.id)).map(channelItem)}
                    </div>
                  )}
                  <div className="mt-3">
                    <button onClick={() => setCollapsed((c) => ({ ...c, ch: !c.ch }))} className="flex items-center gap-1 h-7 pl-2 pr-2 rounded-md text-[15px] text-[#E3D7E3]/80 hover:bg-white/10 w-full">
                      <ChevronDown size={14} className={collapsed.ch ? '-rotate-90' : ''} /> Channels
                    </button>
                    {!collapsed.ch && channels.filter((c) => !starred.includes(c.id)).map(channelItem)}
                    <div className="relative" ref={addChMenu.ref}>
                      <button className="w-full h-7 flex items-center gap-2 pl-4 pr-3 rounded-md text-[15px] text-[#E3D7E3]/80 hover:bg-white/10" onClick={addChMenu.toggle}>
                        <span className="w-5 h-5 rounded bg-white/15 flex items-center justify-center"><Plus size={13} /></span> Add channels
                      </button>
                      {addChMenu.open && (
                        <Pop className="left-4 top-8 w-[240px]">
                          <MItem label="Create a new channel" onClick={() => { setModal({ kind: 'create' }); addChMenu.close() }} />
                          <MItem label="Browse channels" onClick={() => { setPage('browse'); setThread(null); addChMenu.close() }} />
                        </Pop>
                      )}
                    </div>
                  </div>
                  <div className="mt-3">
                    <button onClick={() => setCollapsed((c) => ({ ...c, dm: !c.dm }))} className="flex items-center gap-1 h-7 pl-2 pr-2 rounded-md text-[15px] text-[#E3D7E3]/80 hover:bg-white/10 w-full">
                      <ChevronDown size={14} className={collapsed.dm ? '-rotate-90' : ''} /> Direct messages
                    </button>
                    {!collapsed.dm &&
                      dmOrder.map((p) => {
                        const id = `dm-${p.id}`
                        const active = tab === 'home' && page === 'conv' && conv === id
                        if (unreadsOnly && !unread(id) && !active) return null
                        const st = p.id === ME.id ? meStatus : STATUS[p.id]
                        return (
                          <SideItem
                            key={p.id}
                            id={id}
                            agent={`slack-dm-${p.id}`}
                            icon={
                              <span className="relative">
                                <SlackAvatar id={p.id} size={20} />
                                <span className={`absolute -right-1 -bottom-1 w-2.5 h-2.5 rounded-full border-2 ${active ? 'border-white' : 'border-[#4F2350]'} ${(p.id === ME.id ? !prefs.away : presenceOf(p.id) === 'available') ? 'bg-[#2BAC76]' : 'bg-transparent shadow-[inset_0_0_0_1.5px_#C9B6C9]'}`} />
                              </span>
                            }
                            label={
                              <span className="flex items-center gap-1.5">
                                {p.name}
                                {p.id === ME.id && <span className={active ? 'text-[#616061]' : 'text-white/50'}>you</span>}
                                {st && <span className="text-[12px]">{st}</span>}
                              </span>
                            }
                            bold={unread(id)}
                            active={active}
                            badge={unread(id) ? all.filter((m) => m.channelId === id && m.from !== ME.id).length : undefined}
                          />
                        )
                      })}
                  </div>
                  <div className="mt-3">
                    <button onClick={() => setCollapsed((c) => ({ ...c, apps: !c.apps }))} className="flex items-center gap-1 h-7 pl-2 text-[15px] text-[#E3D7E3]/80 w-full rounded-md hover:bg-white/10"><ChevronDown size={14} className={collapsed.apps ? '-rotate-90' : ''} /> Apps</button>
                    {!collapsed.apps &&
                      [['jira', 'Jira Cloud'], ['confluence', 'Confluence'], ['servicenow', 'ServiceNow'], ['zendesk', 'Zendesk']].map(([l, n]) => (
                        <button key={l} className="w-full h-7 flex items-center gap-2 pl-4 pr-3 rounded-md text-[15px] text-[#E3D7E3]/80 hover:bg-white/10" onClick={() => deskOpen(l)}>
                          <span className="w-5 h-5 rounded bg-white flex items-center justify-center"><img src={logoUrl(l)} className="w-3.5 h-3.5" alt="" /></span> {n}
                        </button>
                      ))}
                  </div>
                </div>
              </>
            )}
            {tab !== 'home' && (
              <SidePanel
                tab={tab}
                all={all}
                onOpen={open}
                onThread={openThread}
                onCompose={() => { setTab('home'); setPage('compose') }}
                onPage={(p) => { setTab('home'); setPage(p as Page); setThread(null); setProfile(null) }}
                actFilter={actFilter}
                setActFilter={setActFilter}
              />
            )}
            {huddle && (
              <div className="shrink-0 m-2 rounded-lg bg-[#2BAC76]/90 text-white p-3" data-agent="slack-huddle-bar">
                <div className="flex items-center gap-2 text-[13px] font-bold">
                  <Headphones size={15} /> Huddle in {huddle.conv.startsWith('dm-') ? person(huddle.conv.slice(3)).name : `#${huddle.conv}`}
                </div>
                <div className="flex -space-x-1.5 mt-2">
                  {[ME.id, ...(huddle.conv.startsWith('dm-') && huddle.conv !== `dm-${ME.id}` ? [huddle.conv.slice(3)] : [])].map((u) => <span key={u} className="ring-2 ring-[#2BAC76] rounded-[6px]"><SlackAvatar id={u} size={26} /></span>)}
                </div>
                <div className="flex items-center gap-1.5 mt-2">
                  <button aria-label={huddle.muted ? 'Unmute' : 'Mute'} className="w-8 h-8 rounded-md bg-white/20 hover:bg-white/30 flex items-center justify-center" onClick={() => setHuddle({ ...huddle, muted: !huddle.muted })}>{huddle.muted ? <MicOff size={15} /> : <Mic size={15} />}</button>
                  <button aria-label="Copy huddle link" className="w-8 h-8 rounded-md bg-white/20 hover:bg-white/30 flex items-center justify-center" onClick={() => { copyText(`https://northwind.slack.com/huddle/${huddle.conv}`); toast({ appId: 'slack', title: 'Huddle link copied' }) }}><Link2 size={15} /></button>
                  <div className="flex-1" />
                  <button data-agent="slack-huddle-leave" className="h-8 px-3 rounded-md bg-[#E01E5A] hover:bg-[#C21A4E] text-[13px] font-bold" onClick={endHuddle}>Leave</button>
                </div>
              </div>
            )}
          </div>

          {/* main */}
          <div className="flex-1 min-w-0 flex bg-white select-text">
            {page !== 'conv' ? (
              <div className="flex-1 min-w-0 flex flex-col" data-page={sideTitle}>{mainPage}</div>
            ) : (
              <div className="flex-1 min-w-0 flex flex-col">
                <div className="h-[49px] shrink-0 flex items-center px-4 gap-2 border-b border-[#DDDDDD]">
                  <button className="flex items-center gap-1 h-8 px-1.5 -ml-1.5 rounded hover:bg-[#F2F2F2] text-[18px] font-black" data-agent="slack-channel-title" onClick={() => (channel ? setModal({ kind: 'details' }) : dmPerson && (setProfile(dmPerson.id), setThread(null)))}>
                    {channel ? (channel.private ? <Lock size={16} /> : <Hash size={18} strokeWidth={2.5} />) : dmPerson && <SlackAvatar id={dmPerson.id} size={24} />}
                    <span>{channel ? channel.name : dmPerson?.name}</span>
                    <ChevronDown size={16} />
                  </button>
                  {channel && starred.includes(channel.id) && <Star size={14} className="text-[#E8912D]" fill="currentColor" />}
                  {channel && <span className="text-[13px] text-[#616061] truncate flex-1 min-w-0 cursor-pointer hover:text-[#1D1C1D]" onClick={() => setModal({ kind: 'details', tab: 'about' })}>{channel.topic}</span>}
                  {!channel && <div className="flex-1" />}
                  {channel && (
                    <button className="flex items-center h-7 pl-1 pr-2 rounded-md border border-[#DDDDDD] hover:bg-[#F8F8F8]" onClick={() => setModal({ kind: 'details', tab: 'members' })}>
                      <span className="flex -space-x-1.5">{['tom', 'chen', 'maya'].map((u) => <span key={u} className="ring-2 ring-white rounded-[5px]"><SlackAvatar id={u} size={20} /></span>)}</span>
                      <span className="ml-1.5 text-[13px] font-bold text-[#616061]">{channel.members}</span>
                    </button>
                  )}
                  <div className={`relative flex items-center h-7 rounded-md border ${huddle?.conv === conv ? 'border-[#2BAC76] bg-[#2BAC76] text-white' : 'border-[#DDDDDD]'}`} ref={huddleMenu.ref}>
                    <button className={`h-full px-2 flex items-center gap-1 text-[13px] font-bold rounded-l-md ${huddle?.conv === conv ? '' : 'text-[#616061] hover:bg-[#F8F8F8]'}`} onClick={() => (huddle?.conv === conv ? endHuddle() : startHuddle(conv))}><Headphones size={15} /> Huddle</button>
                    <span className={`w-px h-4 ${huddle?.conv === conv ? 'bg-white/40' : 'bg-[#DDDDDD]'}`} />
                    <button className={`h-full px-1 rounded-r-md ${huddle?.conv === conv ? '' : 'hover:bg-[#F8F8F8] text-[#616061]'}`} aria-label="Huddle options" onClick={huddleMenu.toggle}><ChevronDown size={14} /></button>
                    {huddleMenu.open && (
                      <Pop className="right-0 top-8 w-[230px]">
                        <MItem icon={<Headphones size={14} />} label={huddle?.conv === conv ? 'Leave huddle' : 'Start huddle'} onClick={() => { huddle?.conv === conv ? endHuddle() : startHuddle(conv); huddleMenu.close() }} />
                        <MItem icon={<Link2 size={14} />} label="Copy huddle link" onClick={() => { copyText(`https://northwind.slack.com/huddle/${conv}`); toast({ appId: 'slack', title: 'Huddle link copied' }); huddleMenu.close() }} />
                      </Pop>
                    )}
                  </div>
                  <div className="relative" ref={headerMore.ref}>
                    <button className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-[#F2F2F2] text-[#616061]" aria-label="More" onClick={headerMore.toggle}><MoreHorizontal size={17} /></button>
                    {headerMore.open && (
                      <Pop className="right-0 top-8 w-[250px]">
                        {channel && <MItem icon={<Info size={14} />} label="Open channel details" onClick={() => { setModal({ kind: 'details' }); headerMore.close() }} />}
                        {dmPerson && <MItem icon={<Users size={14} />} label="View profile" onClick={() => { setProfile(dmPerson.id); setThread(null); headerMore.close() }} />}
                        {channel && <MItem icon={<Star size={14} />} label={starred.includes(channel.id) ? 'Unstar channel' : 'Star channel'} onClick={() => { setPrefs((p) => ({ starred: starred.includes(channel.id) ? (p.starred ?? []).filter((x) => x !== channel.id) : [...(p.starred ?? []), channel.id] })); headerMore.close() }} />}
                        {channel && <MItem icon={<BellOff size={14} />} label={muted.includes(channel.id) ? 'Unmute channel' : 'Mute channel'} onClick={() => { setPrefs((p) => ({ muted: muted.includes(channel.id) ? (p.muted ?? []).filter((x) => x !== channel.id) : [...(p.muted ?? []), channel.id] })); headerMore.close() }} />}
                        <MItem icon={<Search size={14} />} label={`Search in ${title}`} onClick={() => { setSearchText(channel ? `in:#${channel.name} ` : `from:${dmPerson?.first.toLowerCase()} `); setSearchOpen(true); headerMore.close() }} />
                        <MItem icon={<Copy size={14} />} label="Copy link" onClick={() => { copyText(`https://northwind.slack.com/archives/${conv}`); toast({ appId: 'slack', title: 'Link copied', body: title }); headerMore.close() }} />
                      </Pop>
                    )}
                  </div>
                </div>
                <div className="h-[38px] shrink-0 flex items-end px-4 gap-4 border-b border-[#DDDDDD] text-[13px]">
                  {([[MessageSquareText, 'Messages', 'messages'], [FileText, isDm ? 'Add canvas' : 'Canvas', 'canvas'], [Layers, 'Files', 'files'], [Pin, 'Pins', 'pins']] as const).map(([I, l, id]) => (
                    <button key={l} onClick={() => setConvTab(id)} className={`flex items-center gap-1.5 pb-2 border-b-2 ${convTab === id ? 'border-[#1D1C1D] font-bold' : 'border-transparent text-[#616061] hover:text-[#1D1C1D]'}`}>
                      <I size={14} /> {l}
                    </button>
                  ))}
                  <button className="pb-2 text-[#616061] hover:text-[#1D1C1D]" aria-label="Add a tab" title="Open canvas" onClick={() => setConvTab('canvas')}><Plus size={15} /></button>
                </div>
                {convTab === 'canvas' && <CanvasTab conv={conv} title={title} />}
                {convTab === 'files' && (
                  <div className="flex-1 min-h-0 overflow-auto p-5 flex flex-wrap content-start gap-3">
                    {convFiles.length === 0 && <div className="text-[14px] text-[#616061]">Files shared in {title} will appear here. Use the + in the message box to share one.</div>}
                    {convFiles.map(({ f, m }, i) => (
                      <div key={i}>
                        <FileChip f={f} />
                        <div className="text-[12px] text-[#616061] mt-0.5 pl-1">{nameOf(m.from)} · {timeOf(m.date)}</div>
                      </div>
                    ))}
                  </div>
                )}
                {convTab === 'pins' && (
                  <div className="flex-1 min-h-0 overflow-auto py-3">
                    {pinned.length === 0 && <div className="px-5 py-6 text-[14px] text-[#616061]">No pinned messages yet. Pin important messages from the message’s ⋯ menu.</div>}
                    {pinned.map((m) => (
                      <Message key={m.id} m={m} compact={false} replies={all.filter((r) => r.threadTs === m.id)} actions={actions} />
                    ))}
                  </div>
                )}
                {convTab === 'messages' && (
                  <>
                    <MessageList
                      msgs={top}
                      all={all}
                      actions={actions}
                      intro={
                        channel ? (
                          <div>
                            <div className="text-[26px] font-black flex items-center gap-1"><Hash size={26} strokeWidth={2.6} /> {channel.name}</div>
                            <div className="text-[15px] text-[#616061] mt-1">{channel.topic}. This is the very beginning of the <span className="px-0.5 rounded bg-[#E8F5FA] text-[#1264A3]">#{channel.name}</span> channel.</div>
                            <div className="flex gap-2 mt-3">
                              <button className="h-8 px-3 rounded-lg border border-[#BBBABB] text-[13px] font-bold flex items-center gap-1.5 hover:bg-[#F8F8F8]" onClick={() => setModal({ kind: 'add' })}><Users size={14} /> Add coworkers</button>
                              <button className="h-8 px-3 rounded-lg border border-[#BBBABB] text-[13px] font-bold flex items-center gap-1.5 hover:bg-[#F8F8F8]" onClick={() => setModal({ kind: 'notif' })}><BellOff size={14} /> Edit notifications</button>
                            </div>
                          </div>
                        ) : (
                          dmPerson && (
                            <div>
                              <SlackAvatar id={dmPerson.id} size={72} />
                              <div className="text-[22px] font-black mt-3">{dmPerson.name} {dmPerson.id === ME.id && <span className="font-normal text-[#616061] text-[18px]">(you)</span>}</div>
                              <div className="text-[15px] text-[#616061]">{dmPerson.title}</div>
                              <div className="text-[15px] text-[#616061] mt-2">This conversation is just between you and <span className="px-0.5 rounded bg-[#E8F5FA] text-[#1264A3]">@{dmPerson.name}</span>. Check out their profile to learn more about them.</div>
                              <button className="mt-3 h-8 px-3 rounded-lg border border-[#BBBABB] text-[13px] font-bold hover:bg-[#F8F8F8]" onClick={() => { setProfile(dmPerson.id); setThread(null) }}>View profile</button>
                            </div>
                          )
                        )
                      }
                    />
                    <div className="px-5 pb-5 pt-1 shrink-0">
                      <Composer key={conv} placeholder={`Message ${title}`} agent="slack-compose" sendAgent="slack-send" onSend={(t, files) => post(t, undefined, files)} onSchedule={(t, at, files) => schedule(t, at, files)} />
                    </div>
                  </>
                )}
              </div>
            )}
            {threadParent && (
              <div className="w-[400px] shrink-0 border-l border-[#DDDDDD] flex flex-col" data-agent="slack-thread">
                <div className="h-[49px] shrink-0 flex items-center px-4 border-b border-[#DDDDDD]">
                  <div className="text-[18px] font-black">Thread</div>
                  <div className="ml-2 text-[13px] text-[#616061] flex items-center gap-0.5">{channel ? <><Hash size={12} />{channel.name}</> : dmPerson?.name}</div>
                  <div className="flex-1" />
                  <div className="relative" ref={threadMore.ref}>
                    <button className="w-8 h-8 rounded-md hover:bg-[#F2F2F2] flex items-center justify-center text-[#616061]" aria-label="Thread options" onClick={threadMore.toggle}><MoreHorizontal size={17} /></button>
                    {threadMore.open && (
                      <Pop className="right-0 top-9 w-[260px]">
                        <MItem icon={<Copy size={14} />} label="Copy link" onClick={() => { copyText(`https://northwind.slack.com/archives/${threadParent.channelId}/p${+new Date(threadParent.date)}`); toast({ appId: 'slack', title: 'Link copied' }); threadMore.close() }} />
                        <MItem
                          icon={<BellOff size={14} />}
                          label={(prefs.unfollowed ?? []).includes(threadParent.id) ? 'Get notified about new replies' : 'Turn off notifications for replies'}
                          onClick={() => { setPrefs((p) => ({ unfollowed: (p.unfollowed ?? []).includes(threadParent.id) ? (p.unfollowed ?? []).filter((x) => x !== threadParent.id) : [...(p.unfollowed ?? []), threadParent.id] })); threadMore.close() }}
                        />
                        <MItem icon={threadParent.saved && !threadParent.savedDone ? <BookmarkCheck size={14} /> : <Bookmark size={14} />} label={threadParent.saved && !threadParent.savedDone ? 'Remove from Later' : 'Save for later'} onClick={() => { actions.onSave?.(threadParent); threadMore.close() }} />
                      </Pop>
                    )}
                  </div>
                  <button data-agent="slack-thread-close" aria-label="Close thread" onClick={() => setThread(null)} className="w-8 h-8 rounded-md hover:bg-[#F2F2F2] flex items-center justify-center text-[#616061]"><X size={18} /></button>
                </div>
                <div className="flex-1 min-h-0 overflow-auto py-3">
                  <Message m={threadParent} compact={false} replies={[]} actions={actions} inThread />
                  <div className="flex items-center gap-3 px-5 my-2 text-[13px] text-[#616061]">
                    {threadReplies.length} {threadReplies.length === 1 ? 'reply' : 'replies'} <span className="flex-1 h-px bg-[#DDDDDD]" />
                  </div>
                  {threadReplies.map((m) => (
                    <Message key={m.id} m={m} compact={false} replies={[]} actions={actions} inThread />
                  ))}
                </div>
                <div className="px-4 pb-4 shrink-0">
                  <Composer
                    key={thread}
                    placeholder="Reply…"
                    agent="slack-thread-compose"
                    sendAgent="slack-thread-send"
                    onSend={(t, files) => {
                      post(t, thread!, files)
                      if (alsoSend && !t.startsWith('/')) db.insert('slack.messages', { id: uid('sm'), channelId: conv, from: ME.id, text: t, date: new Date().toISOString(), broadcast: true, createdBy: isAgent ? 'hworker' : undefined, ...(files ? { files } : {}) })
                    }}
                    onSchedule={(t, at, files) => schedule(t, at, files, thread!)}
                    compact
                  />
                  <label className="flex items-center gap-2 mt-2 text-[13px] text-[#616061]"><input type="checkbox" className="accent-[#007A5A]" checked={alsoSend} onChange={(e) => setAlsoSend(e.target.checked)} /> Also send to {channel ? `#${channel.name}` : dmPerson?.name}</label>
                </div>
              </div>
            )}
            {!threadParent && profile && (
              <ProfilePanel
                id={profile}
                onClose={() => setProfile(null)}
                onMessage={(id) => open(`dm-${id}`)}
                onHuddle={(id) => { open(`dm-${id}`); startHuddle(`dm-${id}`) }}
                onStatus={() => setModal({ kind: 'status' })}
              />
            )}
          </div>
        </div>
      </div>
      {modal?.kind === 'create' && <CreateChannelModal existing={channels} onClose={() => setModal(null)} onCreated={(id) => setTimeout(() => open(id), 0)} />}
      {modal?.kind === 'details' && channel && (
        <ChannelDetailsModal
          channel={channel}
          all={all}
          initialTab={modal.tab}
          onClose={() => setModal(null)}
          onProfile={(id) => { setModal(null); setProfile(id); setThread(null) }}
          onAddPeople={() => setModal({ kind: 'add' })}
          onNotif={() => setModal({ kind: 'notif' })}
        />
      )}
      {modal?.kind === 'notif' && channel && <NotifModal channel={channel} onClose={() => setModal(null)} />}
      {modal?.kind === 'add' && channel && <AddPeopleModal channel={channel} onClose={() => setModal(null)} />}
      {modal?.kind === 'forward' && <ForwardModal msg={modal.msg} channels={channels} onClose={() => setModal(null)} onSent={(to) => toast({ appId: 'slack', title: 'Message forwarded', body: to.startsWith('dm-') ? `to ${person(to.slice(3)).name}` : `to #${to}` })} />}
      {modal?.kind === 'invite' && <InviteModal onClose={() => setModal(null)} />}
      {modal?.kind === 'status' && <StatusModal onClose={() => setModal(null)} />}
      {modal?.kind === 'shortcuts' && <ShortcutsModal onClose={() => setModal(null)} />}
    </div>
  )
}

function SidePanel({ tab, all, onOpen, onThread, onCompose, onPage, actFilter, setActFilter }: { tab: Tab; all: Msg[]; onOpen: (id: string) => void; onThread: (channelId: string, ts: string) => void; onCompose: () => void; onPage: (p: string) => void; actFilter: 'mentions' | 'threads' | 'reactions'; setActFilter: (f: 'mentions' | 'threads' | 'reactions') => void }) {
  const titles: Record<string, string> = { dms: 'Direct messages', activity: 'Activity', later: 'Later', more: 'More' }
  const [laterTab, setLaterTab] = useState<'progress' | 'done'>('progress')
  const dms = INTERNAL.filter((p) => p.id !== ME.id)
    .map((p) => ({ p, last: all.filter((m) => m.channelId === `dm-${p.id}`).sort((a, b) => +new Date(b.date) - +new Date(a.date))[0] }))
    .filter((x) => x.last)
  const mentions = all.filter((m) => /@Alex|Alex/.test(m.text) && m.from !== ME.id).slice(-8).reverse()
  const myRoots = new Set(all.filter((m) => m.from === ME.id).map((m) => m.threadTs ?? m.id))
  const threadReplies = all.filter((m) => m.threadTs && myRoots.has(m.threadTs) && m.from !== ME.id).sort((a, b) => +new Date(b.date) - +new Date(a.date)).slice(0, 12)
  const reacted = all.filter((m) => m.from === ME.id && m.reactions?.some((r) => r.users.some((u) => u !== ME.id))).sort((a, b) => +new Date(b.date) - +new Date(a.date)).slice(0, 12)
  const saved = all.filter((m) => m.saved).sort((a, b) => +new Date(b.date) - +new Date(a.date))
  const inProgress = saved.filter((m) => !m.savedDone)
  const done = saved.filter((m) => m.savedDone)
  const moreItems: [string, string][] = [['Templates', 'templates'], ['Workflows', 'workflows'], ['Canvases', 'canvases'], ['Lists', 'lists'], ['Files', 'files'], ['Channels', 'browse'], ['People', 'directory'], ['External connections', 'external'], ['Apps', 'apps']]
  const go = (m: Msg) => (m.threadTs ? onThread(m.channelId, m.threadTs) : onOpen(m.channelId))
  return (
    <div className="flex-1 min-h-0 flex flex-col text-white">
      <div className="h-[50px] shrink-0 flex items-center px-4 text-[18px] font-black">
        {titles[tab]}
        <div className="flex-1" />
        {tab === 'dms' && <button className="w-8 h-8 rounded-md flex items-center justify-center bg-white text-[#3F0E40]" aria-label="New message" onClick={onCompose}><SquarePen size={16} /></button>}
      </div>
      {tab === 'activity' && (
        <div className="flex gap-1.5 px-3 pb-2">
          {(['mentions', 'threads', 'reactions'] as const).map((f) => (
            <button key={f} onClick={() => setActFilter(f)} className={`h-6 px-2.5 rounded-full text-[12px] font-bold ${actFilter === f ? 'bg-white text-[#3F0E40]' : 'bg-white/10 hover:bg-white/20'}`}>{f[0].toUpperCase() + f.slice(1)}</button>
          ))}
        </div>
      )}
      {tab === 'later' && (
        <div className="flex gap-1.5 px-3 pb-2">
          {(['progress', 'done'] as const).map((f) => (
            <button key={f} onClick={() => setLaterTab(f)} className={`h-6 px-2.5 rounded-full text-[12px] font-bold ${laterTab === f ? 'bg-white text-[#3F0E40]' : 'bg-white/10 hover:bg-white/20'}`}>{f === 'progress' ? `In progress · ${inProgress.length}` : `Completed · ${done.length}`}</button>
          ))}
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-auto px-2">
        {tab === 'dms' &&
          dms.map(({ p, last }) => (
            <button key={p.id} onClick={() => onOpen(`dm-${p.id}`)} className="w-full flex gap-2.5 p-2 rounded-md hover:bg-white/10 text-left">
              <SlackAvatar id={p.id} size={36} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline"><span className="font-bold text-[15px] flex-1 truncate">{p.name}</span><span className="text-[12px] text-white/60">{timeOf(last!.date)}</span></div>
                <div className="text-[13px] text-white/70 truncate">{last!.from === ME.id ? 'You: ' : ''}{last!.text}</div>
              </div>
            </button>
          ))}
        {tab === 'activity' &&
          (actFilter === 'mentions' ? mentions : actFilter === 'threads' ? threadReplies : reacted).map((m) => (
            <button key={m.id} onClick={() => go(m)} className="w-full flex gap-2.5 p-2 rounded-md hover:bg-white/10 text-left">
              <SlackAvatar id={m.from} size={36} />
              <div className="min-w-0 flex-1">
                <div className="text-[12px] text-white/60">
                  {actFilter === 'mentions' ? 'Mention in' : actFilter === 'threads' ? 'Thread reply in' : 'Reactions in'} {m.channelId.startsWith('dm-') ? 'DM' : `#${m.channelId}`}
                </div>
                <div className="font-bold text-[14px]">{actFilter === 'reactions' ? m.reactions!.map((r) => `:${r.emoji}: ${r.users.length}`).join('  ') : nameOf(m.from)}</div>
                <div className="text-[13px] text-white/75 line-clamp-2">{m.text}</div>
              </div>
            </button>
          ))}
        {tab === 'activity' && (actFilter === 'mentions' ? mentions : actFilter === 'threads' ? threadReplies : reacted).length === 0 && <div className="p-3 text-[13px] text-white/60">Nothing new here.</div>}
        {tab === 'later' && (
          <div className="pt-1 text-[13px] text-white/75">
            {(laterTab === 'progress' ? inProgress : done).length === 0 && (
              <div className="p-3">{laterTab === 'progress' ? 'Save messages with the bookmark icon to come back to them later.' : 'Nothing completed yet.'}</div>
            )}
            {(laterTab === 'progress' ? inProgress : done).map((m) => (
              <div key={m.id} className="group flex gap-2 p-2 rounded-md hover:bg-white/10 mb-1">
                <button className="flex-1 min-w-0 text-left" onClick={() => go(m)}>
                  <div className="text-[12px] text-white/60">{m.channelId.startsWith('dm-') ? 'Direct message' : `#${m.channelId}`} · {nameOf(m.from)}</div>
                  <div className="line-clamp-2"><Mrkdwn text={m.text} /></div>
                </button>
                <button
                  title={m.savedDone ? 'Move back to In progress' : 'Mark complete'}
                  aria-label={m.savedDone ? 'Move back to In progress' : 'Mark complete'}
                  className="w-7 h-7 rounded-md hover:bg-white/20 flex items-center justify-center shrink-0"
                  onClick={() => db.update('slack.messages', m.id, { savedDone: !m.savedDone })}
                >
                  {m.savedDone ? <Bookmark size={14} /> : <CheckCircle2 size={15} />}
                </button>
              </div>
            ))}
          </div>
        )}
        {tab === 'more' && (
          <div className="p-1">
            {moreItems.map(([l, p]) => (
              <button key={l} onClick={() => onPage(p)} className="w-full h-9 flex items-center px-3 rounded-md hover:bg-white/10 text-[15px] text-left">{l}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
