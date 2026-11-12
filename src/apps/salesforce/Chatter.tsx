import { useMemo, useState, type ReactNode } from 'react'
import { ChevronDown, MessageSquare, Search, Share, ThumbsUp } from 'lucide-react'
import { db, uid, useCollection } from '@/db/db'
import { useDesk } from '@/os/context'
import { Avatar } from '@/components/Avatar'
import { ME, PEOPLE, person } from '@/data/people'
import { Btn, HWChip, Link, MenuButton, useNav } from './ui'
import { PersonLink } from './record'

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

export type FeedFilter = 'all' | 'follow' | 'me' | 'bookmarked' | 'company' | 'muted'

export function ChatterFeed({ parentId, parentName, onToast, filter = 'all' }: { parentId?: string; parentName?: string; onToast?: (t: string) => void; filter?: FeedFilter }) {
  const { isAgent } = useDesk()
  const posts = useCollection<any>('salesforce.chatter')
  const follows = useCollection<any>('salesforce.follows')
  const [text, setText] = useState('')
  const [tab, setTab] = useState('Post')
  const [focused, setFocused] = useState(false)
  const [choices, setChoices] = useState<string[]>(['', ''])
  const [sortBy, setSortBy] = useState<'activity' | 'newest'>('activity')
  const [fq, setFq] = useState('')
  const [commenting, setCommenting] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [editing, setEditing] = useState<{ id: string; body: string } | null>(null)
  const notify = (t: string) => onToast?.(t)
  const { go } = useNav()
  const parentObjs = { opps: useCollection<any>('salesforce.opportunities'), accts: useCollection<any>('salesforce.accounts'), leads: useCollection<any>('salesforce.leads') }
  const openParent = (pid: string) => {
    const object = parentObjs.opps.some((o) => o.id === pid) ? 'Opportunity' : parentObjs.accts.some((a) => a.id === pid) ? 'Account' : parentObjs.leads.some((l) => l.id === pid) ? 'Lead' : null
    if (object) go({ page: 'record', object, id: pid })
  }
  const mention = /(^|\s)@([A-Za-z]*)$/.exec(text)
  const suggestions = useMemo(() => (mention ? internal.filter((p) => p.name.toLowerCase().startsWith(mention[2].toLowerCase()) || p.last.toLowerCase().startsWith(mention[2].toLowerCase())).slice(0, 6) : []), [text])
  const lastAct = (p: any) => Math.max(+new Date(p.date), ...(p.comments ?? []).map((c: any) => +new Date(c.date)))
  const list = posts
    .filter((p) => !parentId || p.parentId === parentId)
    .filter((p) => {
      if (filter === 'muted') return p.muted?.includes(ME.id)
      if (p.muted?.includes(ME.id) && !parentId) return false
      if (filter === 'follow') return p.authorId === ME.id || follows.some((f) => f.id === p.parentId)
      if (filter === 'me') return p.body.includes(`@${ME.name}`) || (p.comments ?? []).some((c: any) => c.body.includes(`@${ME.name}`))
      if (filter === 'bookmarked') return p.bookmarks?.includes(ME.id)
      return true
    })
    .filter((p) => !fq || `${p.body} ${person(p.authorId).name} ${(p.comments ?? []).map((c: any) => c.body).join(' ')}`.toLowerCase().includes(fq.toLowerCase()))
    .sort((a, b) => (sortBy === 'newest' ? +new Date(b.date) - +new Date(a.date) : lastAct(b) - lastAct(a)))
  const toggleIn = (p: any, key: string) => db.update('salesforce.chatter', p.id, { [key]: (p[key] ?? []).includes(ME.id) ? p[key].filter((x: string) => x !== ME.id) : [...(p[key] ?? []), ME.id] })
  const addComment = (p: any) => {
    const body = (drafts[p.id] ?? '').trim()
    if (!body) return
    db.update('salesforce.chatter', p.id, (r) => ({ comments: [...(r.comments ?? []), { authorId: ME.id, body, date: new Date().toISOString() }] }))
    setDrafts((d) => ({ ...d, [p.id]: '' }))
  }
  const vote = (p: any, i: number) => db.update('salesforce.chatter', p.id, (r) => ({ poll: { ...r.poll, votes: { ...(r.poll?.votes ?? {}), [ME.id]: i } } }))

  const share = () => {
    if (!text.trim()) return
    const opts = choices.map((c) => c.trim()).filter(Boolean)
    if (tab === 'Poll' && opts.length < 2) return notify('Add at least two choices to your poll.')
    db.insert(
      'salesforce.chatter',
      {
        id: uid('0D5'),
        parentId: parentId ?? null,
        parentName,
        authorId: ME.id,
        body: text.trim(),
        date: new Date().toISOString(),
        likes: [],
        comments: [],
        ...(tab === 'Question' ? { kind: 'question' } : {}),
        ...(tab === 'Poll' ? { kind: 'poll', poll: { choices: opts, votes: {} } } : {}),
        createdBy: isAgent ? 'hworker' : undefined,
      },
      { prepend: true },
    )
    setText('')
    setChoices(['', ''])
    setFocused(false)
    onToast?.(tab === 'Question' ? 'Question was posted.' : tab === 'Poll' ? 'Poll was posted.' : 'Post was shared.')
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
          placeholder={tab === 'Question' ? 'What would you like to know?' : tab === 'Poll' ? 'What would you like to ask?' : 'Share an update...'}
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
        {tab === 'Poll' && (
          <div className="mt-2 space-y-1.5">
            {choices.map((c, i) => (
              <input key={i} value={c} onChange={(e) => setChoices(choices.map((x, j) => (j === i ? e.target.value : x)))} placeholder={`Choice ${i + 1}`} className="w-full h-8 rounded-[4px] border border-[#C9C9C9] px-3 text-[13px] outline-none focus:border-[#1B96FF]" />
            ))}
            {choices.length < 10 && <Link className="text-[12px]" onClick={() => setChoices([...choices, ''])}>+ Add new choice</Link>}
          </div>
        )}
        {(focused || text) && (
          <div className="flex items-center justify-between mt-1">
            <div className="flex gap-1 text-[#747474] text-[12px]">
              <span className="px-1.5 font-bold">B</span>
              <span className="px-1.5 italic">I</span>
              <span className="px-1.5 underline">U</span>
              <button className="px-1.5 hover:text-[#0176D3]" aria-label="Mention someone" onClick={() => setText((t) => `${t}${t && !t.endsWith(' ') ? ' ' : ''}@`)}>@</button>
            </div>
            <Btn variant="brand" agent="sf-chatter-share" label="Share" onClick={share}>
              Share
            </Btn>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 mt-4 mb-2">
        <span className="text-[12px] text-[#444]">Sort By:</span>
        <MenuButton
          className="h-7 px-2 border border-[#C9C9C9] rounded-[4px] bg-white text-[12px] flex items-center gap-1"
          menuClass="left-0 top-8"
          width={190}
          items={[
            { label: 'Most Recent Activity', checked: sortBy === 'activity', onClick: () => setSortBy('activity') },
            { label: 'Latest Posts', checked: sortBy === 'newest', onClick: () => setSortBy('newest') },
          ]}
        >
          {sortBy === 'activity' ? 'Most Recent Activity' : 'Latest Posts'} <ChevronDown size={12} />
        </MenuButton>
        <div className="flex-1" />
        <div className="flex items-center h-7 w-[200px] border border-[#C9C9C9] rounded-[4px] px-2 gap-1 text-[#747474] bg-white">
          <Search size={12} />
          <input value={fq} onChange={(e) => setFq(e.target.value)} placeholder="Search this feed..." aria-label="Search this feed" className="flex-1 min-w-0 outline-none text-[12px] text-[#181818] bg-transparent" />
        </div>
      </div>
      <div className="divide-y divide-[#E5E5E5]">
        {list.map((p) => (
          <article key={p.id} className={`py-3 ${p.createdBy ? 'flash-new' : ''}`} data-agent={`sf-chatter-post-${p.id}`}>
            <div className="flex gap-3">
              <Avatar id={p.authorId} size={36} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <PersonLink id={p.authorId} className="text-[13px] font-bold" />
                  {!parentId && p.parentName && (
                    <span className="text-[13px] text-[#444]">
                      — <Link className="text-[13px]" onClick={() => openParent(p.parentId)}>{p.parentName}</Link>
                    </span>
                  )}
                  {p.createdBy === 'hworker' && <HWChip text="via H-Worker" />}
                  <div className="flex-1" />
                  <MenuButton
                    label="Post actions"
                    className="w-5 h-5 border border-[#C9C9C9] rounded flex items-center justify-center text-[#747474] hover:bg-[#F3F3F3]"
                    menuClass="right-0 top-6"
                    width={170}
                    items={[
                      { label: p.bookmarks?.includes(ME.id) ? 'Remove Bookmark' : 'Bookmark', onClick: () => toggleIn(p, 'bookmarks') },
                      { label: p.muted?.includes(ME.id) ? 'Unmute' : 'Mute', onClick: () => toggleIn(p, 'muted') },
                      ...(p.authorId === ME.id
                        ? [
                            { label: 'Edit', onClick: () => setEditing({ id: p.id, body: p.body }) },
                            { label: 'Delete', onClick: () => { db.remove('salesforce.chatter', p.id); notify('Post was deleted.') } },
                          ]
                        : []),
                    ]}
                  >
                    <ChevronDown size={11} />
                  </MenuButton>
                </div>
                <div className="text-[12px] text-[#444]">
                  {timeAgo(p.date)}
                  {p.kind === 'question' && <span className="ml-2 px-1.5 rounded bg-[#EEF4FF] text-[#014486] text-[11px]">Question</span>}
                  {p.bookmarks?.includes(ME.id) && <span className="ml-2 text-[11px] text-[#0176D3]">Bookmarked</span>}
                </div>
                {editing?.id === p.id ? (
                  <div className="mt-2">
                    <textarea value={editing!.body} onChange={(e) => setEditing({ id: p.id, body: e.target.value })} rows={3} className="w-full rounded-[4px] border border-[#C9C9C9] px-3 py-2 text-[13px] outline-none focus:border-[#1B96FF]" />
                    <div className="flex justify-end gap-2 mt-1">
                      <Btn onClick={() => setEditing(null)}>Cancel</Btn>
                      <Btn variant="brand" onClick={() => { db.update('salesforce.chatter', p.id, { body: editing!.body, edited: true }); setEditing(null) }}>Save</Btn>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 text-[13px] leading-[1.5] whitespace-pre-wrap">{renderMentions(p.body)}{p.edited && <span className="text-[11px] text-[#747474]"> (Edited)</span>}</div>
                )}
                {p.sharedFrom && <div className="mt-2 border-l-2 border-[#C9C9C9] pl-3 text-[12.5px] text-[#444]"><b>{person(p.sharedFrom.authorId).name}</b>: {p.sharedFrom.body}</div>}
                {p.poll && (
                  <div className="mt-2 space-y-1.5 max-w-[420px]">
                    {p.poll.choices.map((c: string, i: number) => {
                      const votes = Object.values(p.poll.votes ?? {}) as number[]
                      const n = votes.filter((v) => v === i).length
                      const mine = p.poll.votes?.[ME.id] === i
                      return (
                        <button key={i} onClick={() => vote(p, i)} className={`relative w-full h-8 rounded-[4px] border text-left px-3 text-[13px] overflow-hidden ${mine ? 'border-[#0176D3]' : 'border-[#C9C9C9]'}`}>
                          <span className="absolute inset-y-0 left-0 bg-[#EEF4FF]" style={{ width: `${votes.length ? (n / votes.length) * 100 : 0}%` }} />
                          <span className="relative flex justify-between">
                            <span>{mine ? '✓ ' : ''}{c}</span>
                            <span className="text-[#444]">{n} vote{n === 1 ? '' : 's'}</span>
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
                <div className="flex items-center gap-5 mt-3 text-[12px] text-[#444]">
                  <button className={`flex items-center gap-1 ${p.likes.includes(ME.id) ? 'text-[#0176D3]' : ''}`} onClick={() => db.update('salesforce.chatter', p.id, { likes: p.likes.includes(ME.id) ? p.likes.filter((x: string) => x !== ME.id) : [...p.likes, ME.id] })}>
                    <ThumbsUp size={13} /> Like
                  </button>
                  <button className={`flex items-center gap-1 ${commenting === p.id ? 'text-[#0176D3]' : ''}`} onClick={() => setCommenting(commenting === p.id ? null : p.id)}>
                    <MessageSquare size={13} /> {p.kind === 'question' ? 'Answer' : 'Comment'}
                  </button>
                  <button
                    className="flex items-center gap-1"
                    onClick={() => {
                      db.insert('salesforce.chatter', { id: uid('0D5'), parentId: null, authorId: ME.id, body: `Sharing ${person(p.authorId).name}’s post${p.parentName ? ` on ${p.parentName}` : ''}.`, sharedFrom: { authorId: p.authorId, body: p.body }, date: new Date().toISOString(), likes: [], comments: [], createdBy: isAgent ? 'hworker' : undefined }, { prepend: true })
                      notify('Post was shared to your feed.')
                    }}
                  >
                    <Share size={13} /> Share
                  </button>
                </div>
                {(p.likes.length > 0 || p.comments.length > 0 || commenting === p.id) && (
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
                          <PersonLink id={c.authorId} className="text-[12px] font-bold" />
                          <div className="text-[12.5px]">{c.body}</div>
                          <div className="text-[11px] text-[#444]">{timeAgo(c.date)}</div>
                        </div>
                      </div>
                    ))}
                    <input
                      placeholder={p.kind === 'question' ? 'Write an answer...' : 'Write a comment...'}
                      aria-label="Write a comment"
                      value={drafts[p.id] ?? ''}
                      autoFocus={commenting === p.id}
                      onChange={(e) => setDrafts((d) => ({ ...d, [p.id]: e.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && addComment(p)}
                      className="mt-2 w-full h-7 px-2 rounded border border-[#C9C9C9] bg-white text-[12px] outline-none focus:border-[#1B96FF]"
                    />
                    {(drafts[p.id] ?? '').trim() && (
                      <div className="flex justify-end mt-1">
                        <Btn className="h-7 px-3" variant="brand" onClick={() => addComment(p)}>
                          Comment
                        </Btn>
                      </div>
                    )}
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
