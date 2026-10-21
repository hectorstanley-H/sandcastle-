import { useMemo, useState, type ReactNode } from 'react'
import { ChevronDown, MessageSquare, Search, Share, ThumbsUp } from 'lucide-react'
import { db, uid, useCollection } from '@/db/db'
import { useDesk } from '@/os/context'
import { Avatar } from '@/components/Avatar'
import { ME, PEOPLE, person } from '@/data/people'
import { Btn, HWChip, Link } from './ui'

const internal = PEOPLE.filter((p) => !p.external)

export function renderMentions(body: string): ReactNode[] {
  const names = internal.map((p) => p.name).sort((a, b) => b.length - a.length)
  const re = new RegExp(`@(${names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g')
  const out: ReactNode[] = []
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(body))) {
    out.push(body.slice(last, m.index))
    out.push(
      <span key={m.index} className="text-[#0176D3] hover:underline cursor-pointer">
        @{m[1]}
      </span>,
    )
    last = m.index + m[0].length
  }
  out.push(body.slice(last))
  return out
}

function timeAgo(iso: string) {
  const s = (Date.now() - +new Date(iso)) / 1000
  if (s < 60) return 'Just now'
  if (s < 3600) return `${Math.round(s / 60)}m ago`
  if (s < 86400) return `${Math.round(s / 3600)}h ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) + ' at ' + new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export function ChatterFeed({ parentId, parentName, onToast }: { parentId?: string; parentName?: string; onToast?: (t: string) => void }) {
  const { isAgent } = useDesk()
  const posts = useCollection<any>('salesforce.chatter')
  const [text, setText] = useState('')
  const [tab, setTab] = useState('Post')
  const [focused, setFocused] = useState(false)
  const mention = /(^|\s)@([A-Za-z]*)$/.exec(text)
  const suggestions = useMemo(() => (mention ? internal.filter((p) => p.name.toLowerCase().startsWith(mention[2].toLowerCase()) || p.last.toLowerCase().startsWith(mention[2].toLowerCase())).slice(0, 6) : []), [text])
  const list = posts.filter((p) => !parentId || p.parentId === parentId).sort((a, b) => +new Date(b.date) - +new Date(a.date))

  const share = () => {
    if (!text.trim()) return
    db.insert('salesforce.chatter', { id: uid('0D5'), parentId: parentId ?? null, parentName, authorId: ME.id, body: text.trim(), date: new Date().toISOString(), likes: [], comments: [], createdBy: isAgent ? 'hworker' : undefined }, { prepend: true })
    setText('')
    setFocused(false)
    onToast?.('Post was shared.')
  }

  return (
    <div className="px-4 py-3">
      <div className="flex gap-4 border-b border-[#E5E5E5] text-[13px]">
        {['Post', 'Poll', 'Question'].map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`relative h-9 ${tab === t ? 'font-bold' : 'text-[#444]'}`}>
            {t}
            {tab === t && <span className="absolute left-0 right-0 -bottom-px h-[3px] bg-[#0176D3]" />}
          </button>
        ))}
      </div>
      <div className="relative mt-3">
        <textarea
          data-agent="sf-chatter-input"
          aria-label="Share an update"
          value={text}
          onFocus={() => setFocused(true)}
          onChange={(e) => setText(e.target.value)}
          placeholder="Share an update..."
          rows={focused || text ? 4 : 1}
          className="w-full rounded-[4px] border border-[#C9C9C9] px-3 py-2 text-[13px] outline-none focus:border-[#1B96FF] focus:shadow-[0_0_3px_#0176D3] resize-none leading-[1.5]"
        />
        {suggestions.length > 0 && (
          <div className="absolute left-3 top-full -mt-1 z-20 w-[300px] bg-white rounded-[4px] border border-[#E5E5E5] py-1" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.16)' }}>
            <div className="px-3 py-1 text-[11px] text-[#444]">People</div>
            {suggestions.map((p) => (
              <button
                key={p.id}
                data-agent={`sf-chatter-mention-${p.id}`}
                aria-label={p.name}
                onClick={() => setText(text.replace(/@([A-Za-z]*)$/, `@${p.name} `))}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[#F3F3F3] text-left"
              >
                <Avatar id={p.id} size={24} />
                <div>
                  <div className="text-[13px]">{p.name}</div>
                  <div className="text-[11px] text-[#444]">{p.title}</div>
                </div>
              </button>
            ))}
          </div>
        )}
        {(focused || text) && (
          <div className="flex items-center justify-between mt-1">
            <div className="flex gap-1 text-[#747474] text-[12px]">
              <span className="px-1.5 font-bold">B</span>
              <span className="px-1.5 italic">I</span>
              <span className="px-1.5 underline">U</span>
              <span className="px-1.5">@</span>
            </div>
            <Btn variant="brand" agent="sf-chatter-share" label="Share" onClick={share}>
              Share
            </Btn>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 mt-4 mb-2">
        <span className="text-[12px] text-[#444]">Sort By:</span>
        <button className="h-7 px-2 border border-[#C9C9C9] rounded-[4px] bg-white text-[12px] flex items-center gap-1">
          Most Recent Activity <ChevronDown size={12} />
        </button>
        <div className="flex-1" />
        <div className="flex items-center h-7 w-[200px] border border-[#C9C9C9] rounded-[4px] px-2 gap-1 text-[#747474]">
          <Search size={12} />
          <span className="text-[12px]">Search this feed...</span>
        </div>
      </div>
      <div className="divide-y divide-[#E5E5E5]">
        {list.map((p) => (
          <article key={p.id} className={`py-3 ${p.createdBy ? 'flash-new' : ''}`} data-agent={`sf-chatter-post-${p.id}`}>
            <div className="flex gap-3">
              <Avatar id={p.authorId} size={36} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Link className="text-[13px] font-bold">{person(p.authorId).name}</Link>
                  {!parentId && p.parentName && (
                    <span className="text-[13px] text-[#444]">
                      — <Link className="text-[13px]">{p.parentName}</Link>
                    </span>
                  )}
                  {p.createdBy === 'hworker' && <HWChip text="via H-Worker" />}
                  <div className="flex-1" />
                  <button className="w-5 h-5 border border-[#C9C9C9] rounded flex items-center justify-center text-[#747474]">
                    <ChevronDown size={11} />
                  </button>
                </div>
                <div className="text-[12px] text-[#444]">{timeAgo(p.date)}</div>
                <div className="mt-2 text-[13px] leading-[1.5] whitespace-pre-wrap">{renderMentions(p.body)}</div>
                <div className="flex items-center gap-5 mt-3 text-[12px] text-[#444]">
                  <button className={`flex items-center gap-1 ${p.likes.includes(ME.id) ? 'text-[#0176D3]' : ''}`} onClick={() => db.update('salesforce.chatter', p.id, { likes: p.likes.includes(ME.id) ? p.likes.filter((x: string) => x !== ME.id) : [...p.likes, ME.id] })}>
                    <ThumbsUp size={13} /> Like
                  </button>
                  <button className="flex items-center gap-1">
                    <MessageSquare size={13} /> Comment
                  </button>
                  <button className="flex items-center gap-1">
                    <Share size={13} /> Share
                  </button>
                </div>
                {(p.likes.length > 0 || p.comments.length > 0) && (
                  <div className="mt-2 bg-[#F3F3F3] rounded p-2 text-[12px]">
                    {p.likes.length > 0 && (
                      <div className="flex items-center gap-1 text-[#444] pb-1">
                        <ThumbsUp size={12} /> {p.likes.map((l: string) => person(l).name).join(', ')} liked this.
                      </div>
                    )}
                    {p.comments.map((c: any, i: number) => (
                      <div key={i} className="flex gap-2 pt-2 border-t border-[#E5E5E5] first:border-0">
                        <Avatar id={c.authorId} size={24} />
                        <div>
                          <Link className="text-[12px] font-bold">{person(c.authorId).name}</Link>
                          <div className="text-[12.5px]">{c.body}</div>
                          <div className="text-[11px] text-[#444]">{timeAgo(c.date)}</div>
                        </div>
                      </div>
                    ))}
                    <input placeholder="Write a comment..." className="mt-2 w-full h-7 px-2 rounded border border-[#C9C9C9] bg-white text-[12px] outline-none" />
                  </div>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
