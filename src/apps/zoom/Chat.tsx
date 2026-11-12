import { useMemo, useState, type ReactNode } from 'react'
import { AtSign, Bookmark, ChevronDown, ChevronRight, FileText, Hash, Lock, Paperclip, Plus, Search, Send, Smile, SmilePlus, Star, Users, Video, X } from 'lucide-react'
import { db, uid, useCollection } from '@/db/db'
import { useDesk } from '@/os/context'
import { Avatar } from '@/components/Avatar'
import { ME, PEOPLE, person } from '@/data/people'
import { HWBadge, ZModal, btnPrimary, btnSecondary, fieldCls, fmtT, useZoom } from './shared'

const EMOJI = ['👍', '❤️', '😂', '🎉', '🙏', '👀', '✅', '🔥', '😮', '😢', '🚀', '💯']
const QUICK = ['👍', '🎉', '✅', '❤️', '😂']

/** find (or create) the 1:1 chat with a person; returns the chat id */
export function ensureDm(personId: string, isAgent: boolean) {
  const ex = db.get<any>('zoom.chats').find((c) => c.kind === 'dm' && c.channel === personId)
  if (ex) return ex.id
  const id = uid('zc')
  db.insert('zoom.chats', { id, channel: personId, name: person(personId).name, kind: 'dm', messages: [], members: [ME.id, personId], createdBy: isAgent ? 'hworker' : undefined })
  return id
}

const membersOf = (c: any): string[] => {
  if (!c) return []
  if (c.members?.length) return c.members
  if (c.kind === 'dm') return [ME.id, c.channel]
  return Array.from(new Set([ME.id, ...c.messages.map((m: any) => m.from)]))
}

const mentionNames = PEOPLE.map((p) => p.name).sort((a, b) => b.length - a.length)
function renderText(t: string): ReactNode[] {
  const re = new RegExp(`@(${mentionNames.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g')
  const out: ReactNode[] = []
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(t))) {
    out.push(t.slice(last, m.index))
    out.push(<span key={m.index} className="text-[#0B5CFF] bg-[#E8EFFF] rounded px-0.5">@{m[1]}</span>)
    last = m.index + m[0].length
  }
  out.push(t.slice(last))
  return out
}
const mentionsMe = (m: any) => m.from !== ME.id && (/@?alex\b/i.test(m.text ?? '') || (m.text ?? '').includes(ME.name))

type View = 'chat' | 'mentions' | 'starred' | 'bookmarks'

export function ChatTab({ sel: selProp, setSel }: { sel: string | null; setSel: (id: string) => void }) {
  const chats = useCollection<any>('zoom.chats')
  const files = useCollection<any>('files')
  const sel = selProp ?? chats[0]?.id
  const [text, setText] = useState('')
  const [view, setView] = useState<View>('chat')
  const [closed, setClosed] = useState<Record<string, boolean>>({})
  const [members, setMembers] = useState(false)
  const [pop, setPop] = useState<null | 'emoji' | 'attach' | 'mention'>(null)
  const [att, setAtt] = useState<{ name: string; size: string } | null>(null)
  const [newChat, setNewChat] = useState(false)
  const [reactFor, setReactFor] = useState<number | null>(null)
  const { isAgent } = useDesk()
  const { startMeeting } = useZoom()
  const c = chats.find((x) => x.id === sel)
  const send = () => {
    if ((!text.trim() && !att) || !c) return
    db.update('zoom.chats', c.id, (r) => ({ messages: [...r.messages, { from: ME.id, text, at: new Date().toISOString(), by: isAgent ? 'hworker' : undefined, ...(att ? { attachment: att } : {}) }] }))
    setText('')
    setAtt(null)
    setPop(null)
  }
  const patchMsg = (chatId: string, i: number, f: (m: any) => any) => db.update('zoom.chats', chatId, (r) => ({ messages: r.messages.map((m: any, j: number) => (j === i ? { ...m, ...f(m) } : m)) }))
  const toggleReaction = (chatId: string, i: number, e: string) =>
    patchMsg(chatId, i, (m) => {
      const cur: string[] = m.reactions?.[e] ?? []
      const next = cur.includes(ME.id) ? cur.filter((x) => x !== ME.id) : [...cur, ME.id]
      const reactions = { ...(m.reactions ?? {}), [e]: next }
      if (!next.length) delete reactions[e]
      return { reactions }
    })
  const pick = (id: string) => {
    setView('chat')
    setSel(id)
    setMembers(false)
    setReactFor(null)
  }
  const filtered = useMemo(() => {
    const out: { chat: any; m: any; i: number }[] = []
    for (const ch of chats) ch.messages.forEach((m: any, i: number) => {
      if ((view === 'mentions' && mentionsMe(m)) || (view === 'bookmarks' && m.bookmarked)) out.push({ chat: ch, m, i })
    })
    return out.sort((a, b) => +new Date(b.m.at) - +new Date(a.m.at))
  }, [chats, view])
  const mem = membersOf(c)
  const mentionQ = /(^|\s)@([A-Za-z]*)$/.exec(text)
  const sugg = (pop === 'mention' || mentionQ) ? mem.filter((id) => id !== ME.id).map(person).filter((p) => !mentionQ || p.name.toLowerCase().startsWith(mentionQ[2].toLowerCase()) || p.last.toLowerCase().startsWith(mentionQ[2].toLowerCase())) : []

  return (
    <>
      <div className="w-[270px] shrink-0 bg-[#F7F7FA] border-r border-[#E4E4ED] flex flex-col">
        <div className="h-12 px-4 flex items-center justify-between">
          <span className="text-[16px] font-bold">Team Chat</span>
          <button data-agent="zoom-chat-new" aria-label="New chat or channel" title="New chat or channel" onClick={() => setNewChat(true)} className="w-7 h-7 rounded-full bg-[#0B5CFF] text-white flex items-center justify-center"><Plus size={15} /></button>
        </div>
        <div className="overflow-auto flex-1 text-[13.5px]">
          {([['mentions', 'Mentions', AtSign], ['starred', 'Starred', Star], ['bookmarks', 'Bookmarks', Paperclip]] as const).map(([v, l, I]) => (
            <button key={v} data-agent={`zoom-chatview-${v}`} onClick={() => setView(view === v ? 'chat' : v)} className={`w-full px-4 h-8 flex items-center gap-2 text-left ${view === v ? 'bg-[#DCE8FF] text-[#0B5CFF] font-semibold' : 'text-[#3F4752] hover:bg-[#ECECF2]'}`}>
              <I size={14} /> {l}
              {v === 'mentions' && chats.some((ch) => ch.messages.some(mentionsMe)) && <span className="ml-auto text-[11px] text-[#6E7680]">{chats.reduce((t, ch) => t + ch.messages.filter(mentionsMe).length, 0)}</span>}
            </button>
          ))}
          {(['channel', 'dm'] as const).map((k) => (
            <div key={k} className="mt-2">
              <button onClick={() => setClosed((s) => ({ ...s, [k]: !s[k] }))} className="w-full px-4 h-7 flex items-center gap-1 text-[12px] font-semibold text-[#6E7680] uppercase">{closed[k] ? <ChevronRight size={12} /> : <ChevronDown size={12} />} {k === 'channel' ? 'Channels' : 'Chats'}</button>
              {!closed[k] && chats.filter((x) => x.kind === k).map((x) => (
                <button key={x.id} data-agent={`zoom-chat-${x.id}`} onClick={() => pick(x.id)} className={`w-full px-4 h-9 flex items-center gap-2 text-left ${sel === x.id && view === 'chat' ? 'bg-[#DCE8FF] text-[#0B5CFF] font-semibold' : 'hover:bg-[#ECECF2]'}`}>
                  {k === 'channel' ? (x.private ? <Lock size={13} /> : <Hash size={14} />) : <Avatar id={x.channel} size={22} />}
                  <span className="truncate">{x.name}</span>
                  {x.starred && <Star size={11} className="ml-auto shrink-0 fill-[#F5A623] text-[#F5A623]" />}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
      {view !== 'chat' ? (
        <div className="flex-1 min-w-0 flex flex-col" data-agent={`zoom-chatview-${view}-panel`}>
          <div className="h-12 px-5 flex items-center gap-2 border-b border-[#E4E4ED]">
            <span className="text-[15px] font-bold">{view === 'mentions' ? 'Mentions' : view === 'starred' ? 'Starred' : 'Bookmarks'}</span>
          </div>
          <div className="flex-1 overflow-auto px-5 py-4 space-y-3">
            {view === 'starred' ? (
              <>
                {chats.filter((x) => x.starred).map((x) => (
                  <button key={x.id} data-agent={`zoom-starred-${x.id}`} onClick={() => pick(x.id)} className="w-full text-left rounded-[10px] border border-[#E4E4ED] px-4 py-3 hover:bg-[#F7F7FA] flex items-center gap-3">
                    {x.kind === 'channel' ? <Hash size={16} /> : <Avatar id={x.channel} size={26} />}
                    <div className="min-w-0 flex-1"><div className="font-semibold text-[14px]">{x.name}</div><div className="text-[12.5px] text-[#6E7680] truncate">{x.messages.slice(-1)[0]?.text ?? 'No messages yet'}</div></div>
                    <Star size={14} className="fill-[#F5A623] text-[#F5A623]" />
                  </button>
                ))}
                {!chats.some((x) => x.starred) && <Empty text="Star a chat or channel to find it here quickly." />}
              </>
            ) : (
              <>
                {filtered.map(({ chat, m, i }) => (
                  <button key={`${chat.id}-${i}`} onClick={() => pick(chat.id)} className="w-full text-left rounded-[10px] border border-[#E4E4ED] px-4 py-3 hover:bg-[#F7F7FA]">
                    <div className="text-[12px] text-[#6E7680] mb-1">{chat.kind === 'channel' ? `# ${chat.name}` : chat.name} · {new Date(m.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} {fmtT(m.at)}</div>
                    <div className="flex gap-3"><Avatar id={m.from} size={28} /><div><div className="text-[13px] font-bold">{person(m.from).name}</div><div className="text-[14px]">{renderText(m.text)}</div></div></div>
                  </button>
                ))}
                {!filtered.length && <Empty text={view === 'mentions' ? 'No one has mentioned you yet.' : 'Bookmark a message to save it for later.'} />}
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 min-w-0 flex">
          <div className="flex-1 min-w-0 flex flex-col">
            <div className="h-12 px-5 flex items-center gap-2 border-b border-[#E4E4ED]">
              <span className="text-[15px] font-bold">{c?.kind === 'channel' ? '# ' : ''}{c?.name}</span>
              {c && (
                <button data-agent="zoom-chat-star" aria-label={c.starred ? 'Unstar' : 'Star'} title={c.starred ? 'Unstar' : 'Star'} onClick={() => db.update('zoom.chats', c.id, { starred: !c.starred })}>
                  <Star size={14} className={c.starred ? 'fill-[#F5A623] text-[#F5A623]' : 'text-[#6E7680]'} />
                </button>
              )}
              <div className="flex-1" />
              <button data-agent="zoom-chat-meet" aria-label="Start a meeting" title="Meet" onClick={() => c && startMeeting({ topic: c.kind === 'channel' ? `# ${c.name} — huddle` : `${ME.name} and ${c.name}`, participants: mem })}><Video size={18} className="text-[#3F4752]" /></button>
              <button data-agent="zoom-chat-members" aria-label="Members" title="Members" onClick={() => setMembers(!members)} className="ml-3 flex items-center gap-1 text-[12px] text-[#3F4752]"><Users size={18} className={members ? 'text-[#0B5CFF]' : ''} /> {mem.length}</button>
            </div>
            <div className="flex-1 overflow-auto px-5 py-4 space-y-4">
              {c && <div className="text-[12.5px] text-[#6E7680] pb-2 border-b border-[#F0F0F5]">{c.kind === 'channel' ? <>This is the start of <b>#{c.name}</b>{c.description ? ` — ${c.description}` : ''}.</> : <>This is the beginning of your chat history with <b>{c.name}</b>.</>}</div>}
              {c?.messages.map((m: any, i: number) => (
                <div key={i} className={`group relative flex gap-3 ${m.by ? 'flash-new' : ''}`}>
                  <Avatar id={m.from} size={34} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px]"><b>{person(m.from).name}</b> <span className="text-[#6E7680] text-[12px] ml-1">{fmtT(m.at)}</span> {m.by === 'hworker' && <HWBadge text="H-Worker" />} {m.bookmarked && <Bookmark size={11} className="inline fill-[#0B5CFF] text-[#0B5CFF]" />}</div>
                    {m.text && <div className="text-[14px] leading-[1.5] whitespace-pre-wrap">{renderText(m.text)}</div>}
                    {m.attachment && (
                      <div className="mt-1 inline-flex items-center gap-2 rounded-[8px] border border-[#E4E4ED] px-3 py-2 text-[13px]"><FileText size={16} className="text-[#0B5CFF]" /> <span className="font-medium">{m.attachment.name}</span> <span className="text-[#6E7680] text-[12px]">{m.attachment.size}</span></div>
                    )}
                    {m.reactions && Object.keys(m.reactions).length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {Object.entries(m.reactions as Record<string, string[]>).map(([e, who]) => (
                          <button key={e} title={who.map((w) => person(w).name).join(', ')} onClick={() => toggleReaction(c.id, i, e)} className={`h-6 px-1.5 rounded-full border text-[12px] flex items-center gap-1 ${who.includes(ME.id) ? 'border-[#0B5CFF] bg-[#E8EFFF]' : 'border-[#E4E4ED]'}`}>{e} {who.length}</button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className={`absolute -top-3 right-0 ${reactFor === i ? 'flex' : 'hidden group-hover:flex'} items-center gap-0.5 bg-white border border-[#E4E4ED] rounded-[8px] shadow-sm px-1 h-8`}>
                    {QUICK.map((e) => <button key={e} onClick={() => { toggleReaction(c.id, i, e); setReactFor(null) }} className="w-7 h-7 rounded hover:bg-[#F1F3F7] text-[14px]">{e}</button>)}
                    <button aria-label="More reactions" onClick={() => setReactFor(reactFor === i ? null : i)} className="w-7 h-7 rounded hover:bg-[#F1F3F7] flex items-center justify-center text-[#6E7680]"><SmilePlus size={14} /></button>
                    <button aria-label={m.bookmarked ? 'Remove bookmark' : 'Bookmark'} title={m.bookmarked ? 'Remove bookmark' : 'Bookmark'} onClick={() => patchMsg(c.id, i, (x) => ({ bookmarked: !x.bookmarked }))} className="w-7 h-7 rounded hover:bg-[#F1F3F7] flex items-center justify-center text-[#6E7680]"><Bookmark size={14} className={m.bookmarked ? 'fill-[#0B5CFF] text-[#0B5CFF]' : ''} /></button>
                    {reactFor === i && (
                      <div className="absolute top-9 right-0 z-20 bg-white border border-[#E4E4ED] rounded-[10px] shadow-lg p-2 grid grid-cols-6 gap-1">
                        {EMOJI.map((e) => <button key={e} onClick={() => { toggleReaction(c.id, i, e); setReactFor(null) }} className="w-8 h-8 rounded hover:bg-[#F1F3F7] text-[16px]">{e}</button>)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="m-4 rounded-[10px] border border-[#D5D7E0] relative">
              {sugg.length > 0 && (
                <div className="absolute bottom-full left-2 mb-1 w-[260px] bg-white border border-[#E4E4ED] rounded-[10px] shadow-lg py-1 z-20">
                  <div className="px-3 py-1 text-[11px] text-[#6E7680]">Members</div>
                  {sugg.slice(0, 6).map((p) => (
                    <button key={p.id} onClick={() => { setText((t) => (/(^|\s)@([A-Za-z]*)$/.test(t) ? t.replace(/@([A-Za-z]*)$/, `@${p.name} `) : `${t}@${p.name} `)); setPop(null) }} className="w-full flex items-center gap-2 px-3 h-9 hover:bg-[#F7F7FA] text-left text-[13px]"><Avatar id={p.id} size={22} /> {p.name}</button>
                  ))}
                </div>
              )}
              {pop === 'emoji' && (
                <div className="absolute bottom-full left-2 mb-1 bg-white border border-[#E4E4ED] rounded-[10px] shadow-lg p-2 grid grid-cols-6 gap-1 z-20" data-agent="zoom-chat-emoji-picker">
                  {EMOJI.map((e) => <button key={e} onClick={() => { setText((t) => t + e); setPop(null) }} className="w-8 h-8 rounded hover:bg-[#F1F3F7] text-[16px]">{e}</button>)}
                </div>
              )}
              {pop === 'attach' && (
                <div className="absolute bottom-full left-10 mb-1 w-[300px] bg-white border border-[#E4E4ED] rounded-[10px] shadow-lg py-1 z-20 max-h-[260px] overflow-auto" data-agent="zoom-chat-attach-picker">
                  <div className="px-3 py-1 text-[11px] text-[#6E7680]">Share a file from this PC</div>
                  {files.slice(0, 10).map((f) => (
                    <button key={f.id} onClick={() => { setAtt({ name: f.name, size: f.size ?? '' }); setPop(null) }} className="w-full flex items-center gap-2 px-3 h-9 hover:bg-[#F7F7FA] text-left text-[13px]"><FileText size={14} className="text-[#0B5CFF] shrink-0" /> <span className="truncate flex-1">{f.name}</span> <span className="text-[11px] text-[#6E7680]">{f.size}</span></button>
                  ))}
                  {!files.length && <div className="px-3 py-3 text-[12.5px] text-[#6E7680]">No files found.</div>}
                </div>
              )}
              {att && (
                <div className="mx-3 mt-2 inline-flex items-center gap-2 rounded-[8px] bg-[#F1F3F7] px-2.5 py-1 text-[12.5px]"><FileText size={13} className="text-[#0B5CFF]" /> {att.name} <button aria-label="Remove attachment" onClick={() => setAtt(null)}><X size={12} /></button></div>
              )}
              <textarea data-agent="zoom-chat-input" aria-label="Message" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} rows={2} placeholder={`Message ${c?.name ?? ''}`} className="w-full px-3 pt-2 outline-none resize-none text-[14px]" />
              <div className="flex items-center gap-3 px-3 pb-2 text-[#6E7680]">
                <button aria-label="Emoji" title="Emoji" onClick={() => setPop(pop === 'emoji' ? null : 'emoji')} className={pop === 'emoji' ? 'text-[#0B5CFF]' : 'hover:text-[#131619]'}><Smile size={16} /></button>
                <button aria-label="Attach a file" title="File" onClick={() => setPop(pop === 'attach' ? null : 'attach')} className={pop === 'attach' ? 'text-[#0B5CFF]' : 'hover:text-[#131619]'}><Paperclip size={16} /></button>
                <button aria-label="Mention someone" title="Mention" onClick={() => setPop(pop === 'mention' ? null : 'mention')} className={pop === 'mention' ? 'text-[#0B5CFF]' : 'hover:text-[#131619]'}><AtSign size={16} /></button>
                <div className="flex-1" />
                <button data-agent="zoom-chat-send" onClick={send} className="w-8 h-8 rounded-[8px] bg-[#0B5CFF] text-white flex items-center justify-center"><Send size={15} /></button>
              </div>
            </div>
          </div>
          {members && c && (
            <div className="w-[240px] shrink-0 border-l border-[#E4E4ED] flex flex-col" data-agent="zoom-chat-members-panel">
              <div className="h-12 px-4 flex items-center border-b border-[#E4E4ED]"><span className="font-bold text-[14px] flex-1">Members ({mem.length})</span><button aria-label="Close members" onClick={() => setMembers(false)}><X size={15} /></button></div>
              <div className="flex-1 overflow-auto py-2">
                {mem.map((id) => (
                  <div key={id} className="px-4 h-10 flex items-center gap-2 text-[13px]"><Avatar id={id} size={24} /><div className="min-w-0"><div className="truncate">{person(id).name}{id === ME.id ? ' (you)' : ''}</div><div className="text-[11px] text-[#6E7680] truncate">{person(id).title}</div></div></div>
                ))}
              </div>
              {c.kind === 'channel' && <AddMember chat={c} current={mem} />}
            </div>
          )}
        </div>
      )}
      {newChat && <NewChatModal onClose={() => setNewChat(false)} onCreated={(id) => { setNewChat(false); pick(id) }} />}
    </>
  )
}

function Empty({ text }: { text: string }) {
  return <div className="py-16 text-center text-[13px] text-[#6E7680]">{text}</div>
}

function AddMember({ chat, current }: { chat: any; current: string[] }) {
  const [v, setV] = useState('')
  const opts = PEOPLE.filter((p) => !current.includes(p.id) && !p.external)
  return (
    <div className="p-3 border-t border-[#E4E4ED] flex gap-2">
      <select aria-label="Add member" value={v} onChange={(e) => setV(e.target.value)} className={`${fieldCls} h-8 flex-1 min-w-0 text-[12.5px]`}>
        <option value="">Add member…</option>
        {opts.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <button disabled={!v} onClick={() => { db.update('zoom.chats', chat.id, { members: [...current, v] }); setV('') }} className="h-8 px-3 rounded-[8px] bg-[#0B5CFF] text-white text-[12.5px] font-semibold disabled:opacity-50">Add</button>
    </div>
  )
}

function NewChatModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const { isAgent } = useDesk()
  const [kind, setKind] = useState<'dm' | 'channel'>('dm')
  const [q, setQ] = useState('')
  const [who, setWho] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [priv, setPriv] = useState(false)
  const [mem, setMem] = useState<string[]>([])
  const people = PEOPLE.filter((p) => p.id !== ME.id && `${p.name} ${p.email} ${p.title}`.toLowerCase().includes(q.toLowerCase()))
  const create = () => {
    if (kind === 'dm') {
      if (!who) return
      onCreated(ensureDm(who, isAgent))
      return
    }
    const n = name.trim()
    if (!n) return
    const id = uid('zc')
    db.insert('zoom.chats', { id, channel: n.toLowerCase().replace(/[^a-z0-9]+/g, '-'), name: n, kind: 'channel', private: priv, description: desc.trim(), members: [ME.id, ...mem], messages: [], createdBy: isAgent ? 'hworker' : undefined })
    onCreated(id)
  }
  return (
    <ZModal
      title={kind === 'dm' ? 'New chat' : 'Create channel'}
      onClose={onClose}
      width={480}
      agent="zoom-chat-new-modal"
      footer={
        <>
          <button onClick={onClose} className={btnSecondary}>Cancel</button>
          <button data-agent="zoom-chat-new-create" disabled={kind === 'dm' ? !who : !name.trim()} onClick={create} className={btnPrimary}>{kind === 'dm' ? 'Chat' : 'Create'}</button>
        </>
      }
    >
      <div className="flex p-0.5 rounded-[8px] bg-[#ECECF2] text-[13px] font-medium mb-4">
        {(['dm', 'channel'] as const).map((k) => (
          <button key={k} onClick={() => setKind(k)} className={`flex-1 h-8 rounded-[7px] ${kind === k ? 'bg-white shadow-sm' : 'text-[#6E7680]'}`}>{k === 'dm' ? 'New chat' : 'New channel'}</button>
        ))}
      </div>
      {kind === 'dm' ? (
        <>
          <div className="flex items-center h-9 rounded-[8px] border border-[#D5D7E0] px-3 gap-2 text-[#6E7680]"><Search size={14} /><input data-agent="zoom-chat-new-search" aria-label="Search people" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or email" className="flex-1 outline-none text-[#131619] bg-transparent" /></div>
          <div className="mt-2 max-h-[280px] overflow-auto">
            {people.map((p) => (
              <button key={p.id} onClick={() => setWho(p.id)} className={`w-full flex items-center gap-3 px-2 h-11 rounded-[8px] text-left ${who === p.id ? 'bg-[#DCE8FF]' : 'hover:bg-[#F7F7FA]'}`}>
                <Avatar id={p.id} size={28} /><div className="min-w-0"><div className="text-[13.5px] font-medium">{p.name}</div><div className="text-[12px] text-[#6E7680] truncate">{p.external ? p.company : p.title}</div></div>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="space-y-3">
          <input data-agent="zoom-chat-new-name" aria-label="Channel name" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Channel name" className={`${fieldCls} w-full`} />
          <input aria-label="Description" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description (optional)" className={`${fieldCls} w-full`} />
          <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={priv} onChange={(e) => setPriv(e.target.checked)} /> Private — only invited members can see this channel</label>
          <div className="text-[13px] font-semibold pt-1">Add members</div>
          <div className="max-h-[180px] overflow-auto grid grid-cols-2 gap-1">
            {PEOPLE.filter((p) => p.id !== ME.id && !p.external).map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-[13px] h-8"><input type="checkbox" checked={mem.includes(p.id)} onChange={(e) => setMem(e.target.checked ? [...mem, p.id] : mem.filter((x) => x !== p.id))} /> {p.name}</label>
            ))}
          </div>
        </div>
      )}
    </ZModal>
  )
}
