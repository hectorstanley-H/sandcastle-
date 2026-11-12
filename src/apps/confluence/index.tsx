import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  ChevronDown, ChevronRight, FileText, Plus, MoreHorizontal, Star, Pencil, Share2, Link2, Clock, Info, Bold, Italic, Underline,
  List, ListOrdered, Table, Image, AtSign, Smile, Undo2, Redo2, X, Eye, MessageSquare, LayoutTemplate, Users, Search, Home, Settings, BookOpen, Sparkles,
  ThumbsUp, History, Trash2, Copy, FolderInput, FileDown, Tag, RotateCcw, Check,
} from 'lucide-react'
import type { AppProps } from '@/os/registry'
import { useDesk, useWin } from '@/os/context'
import { db, useCollection } from '@/db/db'
import { ME, person, PEOPLE } from '@/data/people'
import { Avatar } from '@/components/Avatar'
import { ATL_FONT, TopNav, SideItem, HWBadge, Pop, PopItem, PopHeading, Dialog, Flag, copyText, btnSubtle, btnPrimary, btnDefault, inputAtl, type AtlNotification } from '../jira/atlassian'
import { Markup, TEMPLATES } from './Markup'
import { Whiteboard, type Sticky } from './Whiteboard'

export { Markup } from './Markup'

type PComment = { id: string; author: string; body: string; date: string; parentId?: string; likes?: string[] }
type Version = { version: number; title: string; body: string; author: string; date: string }
type Page = {
  id: string; space: string; title: string; parentId: string | null; body: string; author: string; created: string; updated: string; emoji?: string; labels?: string[]; createdBy?: string; views?: number
  likes?: string[]; comments?: PComment[]; versions?: Version[]; starredBy?: string[]; watchers?: string[]; kind?: 'page' | 'whiteboard' | 'database' | 'live'; stickies?: Sticky[]; lastEditor?: string
}
type Blog = { id: string; space: string; title: string; body: string; author: string; created: string; updated: string; likes?: string[]; comments?: PComment[]; createdBy?: string }
type Mode = 'view' | 'edit' | 'recent' | 'templates' | 'foryou' | 'starred' | 'teams' | 'blogs' | 'blog' | 'settings' | 'search' | 'history' | 'label'
type Draft = { id?: string; title: string; body: string; parentId: string | null; kind?: Page['kind'] | 'blog'; emoji?: string; blogId?: string }

const HOST = 'https://northwind.atlassian.net/wiki'
const pageUrl = (p: { id: string; title: string }) => `${HOST}/spaces/OPS/pages/${(Math.abs([...p.id].reduce((a, c) => a * 31 + c.charCodeAt(0), 7)) % 900000) + 100000}/${p.title.replace(/[^a-zA-Z0-9]+/g, '+')}`
const ago = (iso: string) => {
  const h = (Date.now() - +new Date(iso)) / 3600_000
  if (h < 1) return h < 0.05 ? 'just now' : `${Math.round(h * 60)} minutes ago`
  if (h < 24) return `${Math.round(h)} hours ago`
  return `${Math.round(h / 24)} days ago`
}
const EMOJI = ['😀', '🎉', '🚀', '✅', '⚠️', '📌', '💡', '🔥', '👍', '👀', '📈', '🛠️', '📕', '🤝', '🏠', '🔁', '🧭', '🗓️']

/* ─────────────────────────── page tree ─────────────────────────── */

function Tree({ pages, parent, depth, cur, onOpen, expanded, toggle, onAction }: { pages: Page[]; parent: string | null; depth: number; cur: string | null; onOpen: (id: string) => void; expanded: Set<string>; toggle: (id: string) => void; onAction: (a: 'child' | 'star' | 'link' | 'move' | 'delete', p: Page) => void }) {
  const [menu, setMenu] = useState<string | null>(null)
  const kids = pages.filter((p) => p.parentId === parent).sort((a, b) => (a.id === 'pg-releases' ? -1 : b.id === 'pg-releases' ? 1 : a.title.localeCompare(b.title)))
  return (
    <>
      {kids.map((p) => {
        const has = pages.some((x) => x.parentId === p.id)
        const open = expanded.has(p.id)
        const starred = p.starredBy?.includes(ME.id)
        return (
          <div key={p.id}>
            <div className={`group h-8 flex items-center rounded-[4px] pr-1 relative ${cur === p.id ? 'bg-[#E9F2FE] text-[#1868DB]' : 'hover:bg-[#0515240F]'}`} style={{ paddingLeft: 4 + depth * 14 }}>
              <button onClick={() => toggle(p.id)} aria-label={open ? 'Collapse' : 'Expand'} className={`w-5 h-5 flex items-center justify-center rounded hover:bg-[#0B120E24] ${has ? '' : 'invisible'}`}>{open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}</button>
              <button data-agent={`conf-page-${p.id}`} onClick={() => onOpen(p.id)} className="flex-1 min-w-0 flex items-center gap-1.5 text-[14px] text-left">
                {p.emoji ? <span className="text-[13px]">{p.emoji}</span> : p.kind === 'whiteboard' ? <LayoutTemplate size={14} className="text-[#6A9A23] shrink-0" /> : <FileText size={14} className="text-[#505258] shrink-0" />}
                <span className="truncate">{p.title}</span>
                {p.createdBy === 'hworker' && <span className="w-1.5 h-1.5 rounded-full bg-[#430693] shrink-0" />}
              </button>
              {starred && <Star size={12} className="text-[#E2B203] shrink-0 group-hover:hidden" fill="#E2B203" />}
              <button data-atl-trigger aria-label={`More actions for ${p.title}`} onClick={() => setMenu(menu === p.id ? null : p.id)} className={`w-5 h-5 rounded hover:bg-[#0B120E24] items-center justify-center text-[#505258] ${menu === p.id ? 'flex' : 'hidden group-hover:flex'}`}><MoreHorizontal size={14} /></button>
              <button aria-label={`Create child page of ${p.title}`} onClick={() => onAction('child', p)} className="w-5 h-5 rounded hover:bg-[#0B120E24] items-center justify-center text-[#505258] hidden group-hover:flex"><Plus size={14} /></button>
              {menu === p.id && (
                <Pop onClose={() => setMenu(null)} className="left-6 top-8 w-[220px]">
                  <PopItem onClick={() => { setMenu(null); onAction('child', p) }}><Plus size={14} /> Create child page</PopItem>
                  <PopItem onClick={() => { setMenu(null); onAction('star', p) }}><Star size={14} /> {starred ? 'Unstar' : 'Star'}</PopItem>
                  <PopItem onClick={() => { setMenu(null); onAction('link', p) }}><Link2 size={14} /> Copy link</PopItem>
                  <PopItem onClick={() => { setMenu(null); onAction('move', p) }}><FolderInput size={14} /> Move</PopItem>
                  <div className="h-px bg-[#0B120E24] my-1" />
                  <PopItem danger onClick={() => { setMenu(null); onAction('delete', p) }}><Trash2 size={14} /> Delete</PopItem>
                </Pop>
              )}
            </div>
            {has && open && <Tree pages={pages} parent={p.id} depth={depth + 1} cur={cur} onOpen={onOpen} expanded={expanded} toggle={toggle} onAction={onAction} />}
          </div>
        )
      })}
    </>
  )
}

/* ─────────────────────────── likes + comments (pages and blogs) ─────────────────────────── */

function Engagement({ col, rec }: { col: 'confluence.pages' | 'confluence.blogs'; rec: { id: string; likes?: string[]; comments?: PComment[] } }) {
  const [text, setText] = useState<string | null>(null)
  const [reply, setReply] = useState<{ id: string; text: string } | null>(null)
  const likes = rec.likes ?? []
  const liked = likes.includes(ME.id)
  const comments = rec.comments ?? []
  const add = (body: string, parentId?: string) => db.update(col, rec.id, (r) => ({ comments: [...((r.comments as PComment[]) ?? []), { id: `cc-${Date.now()}`, author: ME.id, body, date: new Date().toISOString(), parentId }] }))
  const others = likes.filter((l) => l !== ME.id)
  const likeText = !likes.length ? 'Be the first to like this' : liked ? (others.length ? `You and ${others.length === 1 ? person(others[0]).name : `${others.length} others`} like this` : 'You like this') : `${others.slice(0, 2).map((o) => person(o).name).join(' and ')}${others.length > 2 ? ` and ${others.length - 2} others` : ''} like${others.length === 1 ? 's' : ''} this`
  const renderC = (c: PComment, depth: number): ReactNode => {
    const cl = c.likes ?? []
    return (
      <div key={c.id} className={depth ? 'ml-11 mt-3' : 'mt-5'}>
        <div className="flex gap-3">
          <Avatar id={c.author} size={32} />
          <div className="flex-1 min-w-0">
            <div className="text-[14px]"><b className="font-semibold">{person(c.author).name}</b> <span className="text-[13px] text-[#6B6E76] ml-1">{ago(c.date)}</span></div>
            <div className="text-[14px] mt-0.5 whitespace-pre-wrap">{c.body}</div>
            <div className="flex gap-3 mt-1 text-[13px] text-[#505258]">
              {!depth && <button className="hover:underline" onClick={() => setReply({ id: c.id, text: '' })}>Reply</button>}
              <button className={`hover:underline ${cl.includes(ME.id) ? 'text-[#1868DB]' : ''}`} onClick={() => db.update(col, rec.id, (r) => ({ comments: ((r.comments as PComment[]) ?? []).map((x) => (x.id === c.id ? { ...x, likes: cl.includes(ME.id) ? cl.filter((l) => l !== ME.id) : [...cl, ME.id] } : x)) }))}>Like{cl.length ? ` (${cl.length})` : ''}</button>
              {c.author === ME.id && <button className="hover:underline" onClick={() => db.update(col, rec.id, (r) => ({ comments: ((r.comments as PComment[]) ?? []).filter((x) => x.id !== c.id && x.parentId !== c.id) }))}>Delete</button>}
            </div>
          </div>
        </div>
        {comments.filter((x) => x.parentId === c.id).map((r) => renderC(r, 1))}
        {reply?.id === c.id && (
          <div className="ml-11 mt-3 flex gap-3">
            <Avatar id={ME.id} size={28} />
            <div className="flex-1">
              <textarea autoFocus value={reply.text} onChange={(e) => setReply({ id: c.id, text: e.target.value })} rows={2} placeholder="Reply…" className="w-full px-3 py-2 rounded-[4px] border border-[#1868DB] text-[14px] outline-none resize-none" aria-label="Reply" />
              <div className="flex gap-2 mt-1"><button className={btnPrimary} disabled={!reply.text.trim()} onClick={() => { add(reply.text.trim(), c.id); setReply(null) }}>Reply</button><button className={btnSubtle} onClick={() => setReply(null)}>Cancel</button></div>
            </div>
          </div>
        )}
      </div>
    )
  }
  return (
    <>
      <div className="mt-10 border-t border-[#0B120E24] pt-5 flex items-center gap-4 text-[14px] text-[#505258]">
        <button data-agent="conf-like" aria-pressed={liked} onClick={() => db.update(col, rec.id, { likes: liked ? likes.filter((l) => l !== ME.id) : [...likes, ME.id] })} className={`h-8 px-2 rounded-[4px] flex items-center gap-1.5 hover:bg-[#0515240F] ${liked ? 'text-[#1868DB] font-medium' : ''}`}><ThumbsUp size={15} fill={liked ? '#1868DB33' : 'none'} /> Like</button>
        <span>{likeText}</span>
      </div>
      <div className="mt-6 text-[16px] font-semibold">{comments.length ? `${comments.length} comment${comments.length === 1 ? '' : 's'}` : 'Comments'}</div>
      {comments.filter((c) => !c.parentId).map((c) => renderC(c, 0))}
      <div className="flex gap-3 mt-5">
        <Avatar id={ME.id} size={32} />
        {text === null ? (
          <button data-agent="conf-comment-open" onClick={() => setText('')} className="flex-1 h-9 rounded-[4px] border border-[#8C8F97] px-3 flex items-center text-[14px] text-[#6B6E76] text-left hover:bg-[#F8F8F8]">Add a comment…</button>
        ) : (
          <div className="flex-1">
            <textarea data-agent="conf-comment-input" autoFocus value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="Add a comment…" className="w-full px-3 py-2 rounded-[4px] border border-[#1868DB] text-[14px] outline-none resize-none" aria-label="Comment" />
            <div className="flex gap-2 mt-1"><button data-agent="conf-comment-save" className={btnPrimary} disabled={!text.trim()} onClick={() => { add(text.trim()); setText(null) }}>Save</button><button className={btnSubtle} onClick={() => setText(null)}>Cancel</button></div>
          </div>
        )}
      </div>
    </>
  )
}

/* ─────────────────────────── App ─────────────────────────── */

export default function Confluence({ win, params }: AppProps) {
  const { isAgent } = useDesk()
  const desk = useDesk()
  const { setUrl, setTitle } = useWin()
  const pages = useCollection<Page>('confluence.pages')
  const blogs = useCollection<Blog>('confluence.blogs')
  const trash = useCollection<Page & { deletedAt: string }>('confluence.trash')
  const [cur, setCur] = useState<string | null>('pg-home')
  const [blogId, setBlogId] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>('view')
  const [draft, setDraft] = useState<Draft>({ title: '', body: '', parentId: null })
  const [menu, setMenu] = useState(false)
  const [pmenu, setPmenu] = useState<null | 'more' | 'space' | 'emoji'>(null)
  const [emenu, setEmenu] = useState<null | 'style' | 'link' | 'mention' | 'emoji' | 'panel' | 'plus' | 'more'>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['pg-home', 'pg-releases']))
  const [sidebar, setSidebar] = useState(true)
  const [treeQ, setTreeQ] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [label, setLabel] = useState('')
  const [newLabel, setNewLabel] = useState<string | null>(null)
  const [preview, setPreview] = useState(false)
  const [viewVersion, setViewVersion] = useState<number | null>(null)
  const [dialog, setDialog] = useState<null | { kind: 'delete' | 'move' | 'share' | 'info'; page: Page }>(null)
  const [moveTo, setMoveTo] = useState('')
  const [share, setShare] = useState<{ to: string[]; msg: string }>({ to: [], msg: '' })
  const [flag, setFlag] = useState<{ msg: string; at: number } | null>(null)
  const [recentTab, setRecentTab] = useState<'visited' | 'created' | 'starred'>('visited')
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const undo = useRef<{ past: string[]; future: string[]; at: number }>({ past: [], future: [], at: 0 })
  const page = pages.find((p) => p.id === cur)
  const blog = blogs.find((b) => b.id === blogId)
  const flash = useCallback((msg: string) => setFlag({ msg, at: Date.now() }), [])

  useEffect(() => {
    if (params?.pageId) {
      setCur(params.pageId)
      setMode('view')
      const p = pages.find((x) => x.id === params.pageId)
      if (p?.parentId) setExpanded((e) => new Set([...e, p.parentId!]))
    } else if (params?.view === 'recent') setMode('recent')
  }, [win.nonce])
  useEffect(() => {
    if (mode === 'edit') {
      setUrl(`${HOST}/spaces/OPS/pages/edit-v2/${draft.id ? draft.id.replace(/\D/g, '') || '884736' : '884736'}`)
      setTitle(`${draft.title || 'Untitled'} - Operations - Confluence`)
    } else if (mode === 'blog' && blog) {
      setUrl(`${HOST}/spaces/OPS/blog/${blog.created.slice(0, 10).replace(/-/g, '/')}/${blog.title.replace(/[^a-zA-Z0-9]+/g, '+')}`)
      setTitle(`${blog.title} - Operations - Confluence`)
    } else if (['recent', 'templates', 'foryou', 'starred', 'teams', 'blogs', 'settings', 'search', 'label'].includes(mode)) {
      const names: Record<string, string> = { recent: 'Recent', templates: 'Templates', foryou: 'For you', starred: 'Starred', teams: 'Teams', blogs: 'Blogs', settings: 'Space settings', search: 'Search', label: `Label: ${label}` }
      setUrl(`${HOST}/${mode === 'search' ? `search?text=${encodeURIComponent(query)}` : mode === 'blogs' ? 'spaces/OPS/blog' : mode === 'settings' ? 'spaces/OPS/settings' : mode === 'label' ? `label/OPS/${label}` : mode}`)
      setTitle(`${names[mode]} - Confluence`)
    } else if (page) {
      setUrl(mode === 'history' ? `${HOST}/spaces/OPS/history/${page.id}` : pageUrl(page))
      setTitle(`${mode === 'history' ? 'Page history: ' : ''}${page.title} - Operations - Confluence`)
    }
  }, [cur, mode, draft.title, blogId, label, query])
  // count views
  useEffect(() => {
    if (mode === 'view' && cur && pages.some((p) => p.id === cur)) db.update('confluence.pages', cur, (r) => ({ views: (r.views ?? 0) + 1 }))
  }, [cur, mode])

  const openPage = (id: string) => {
    setCur(id)
    setMode('view')
    setViewVersion(null)
    const p = pages.find((x) => x.id === id)
    if (p?.parentId) setExpanded((e) => new Set([...e, p.parentId!]))
  }
  const openBlog = (id: string) => {
    setBlogId(id)
    setMode('blog')
  }
  const startEdit = (d: Draft) => {
    undo.current = { past: [], future: [], at: 0 }
    setPreview(false)
    setDraft(d)
    setMode('edit')
  }
  const newPage = (parentId: string | null, kind?: Draft['kind']) => {
    startEdit({ title: '', body: kind === 'database' ? '| Name | Owner | Status | Due date |\n| --- | --- | --- | --- |\n|  |  | {status:TO DO:grey} |  |\n|  |  | {status:TO DO:grey} |  |' : '', parentId: parentId ?? 'pg-home', kind })
    setMenu(false)
  }
  const publish = () => {
    const now = new Date().toISOString()
    if (draft.kind === 'blog') {
      if (draft.blogId) {
        db.update('confluence.blogs', draft.blogId, { title: draft.title || 'Untitled', body: draft.body, updated: now })
        openBlog(draft.blogId)
      } else {
        const id = `blog-${Date.now().toString(36)}`
        db.insert('confluence.blogs', { id, space: 'OPS', title: draft.title || 'Untitled', body: draft.body, author: ME.id, created: now, updated: now, likes: [], comments: [], createdBy: isAgent ? 'hworker' : undefined }, { prepend: true })
        openBlog(id)
      }
      return
    }
    if (draft.id) {
      const prev = pages.find((p) => p.id === draft.id)
      const versions = prev ? [...(prev.versions ?? []), { version: (prev.versions?.length ?? 0) + 1, title: prev.title, body: prev.body, author: prev.lastEditor ?? prev.author, date: prev.updated }] : undefined
      db.update('confluence.pages', draft.id, { title: draft.title, body: draft.body, updated: now, ...(versions ? { versions, lastEditor: ME.id } : {}), ...(draft.emoji !== undefined ? { emoji: draft.emoji || undefined } : {}) })
      openPage(draft.id)
      return
    }
    const id = `pg-${Date.now().toString(36)}`
    db.insert('confluence.pages', { id, space: 'OPS', title: draft.title || 'Untitled', parentId: draft.parentId, body: draft.body, author: ME.id, created: now, updated: now, labels: [], createdBy: isAgent ? 'hworker' : undefined, views: 1, ...(draft.kind && draft.kind !== 'page' ? { kind: draft.kind } : {}), ...(draft.kind === 'whiteboard' ? { stickies: [] } : {}), ...(draft.emoji ? { emoji: draft.emoji } : {}) })
    if (draft.parentId) setExpanded((e) => new Set([...e, draft.parentId!]))
    openPage(id)
  }
  const pageAction = (a: 'child' | 'star' | 'link' | 'move' | 'delete', p: Page) => {
    if (a === 'child') newPage(p.id)
    else if (a === 'star') db.update('confluence.pages', p.id, { starredBy: p.starredBy?.includes(ME.id) ? p.starredBy.filter((x) => x !== ME.id) : [...(p.starredBy ?? []), ME.id] })
    else if (a === 'link') { copyText(pageUrl(p)); flash('Link copied to clipboard') }
    else if (a === 'move') { setMoveTo(p.parentId ?? 'pg-home'); setDialog({ kind: 'move', page: p }) }
    else if (a === 'delete') setDialog({ kind: 'delete', page: p })
  }
  const deletePage = (p: Page) => {
    for (const c of pages.filter((x) => x.parentId === p.id)) db.update('confluence.pages', c.id, { parentId: p.parentId })
    db.insert('confluence.trash', { ...p, deletedAt: new Date().toISOString() })
    db.remove('confluence.pages', p.id)
    flash(`“${p.title}” moved to the space trash`)
    if (cur === p.id) openPage(p.parentId ?? 'pg-home')
  }

  /* editor helpers */
  const setBody = (body: string, sel?: [number, number]) => {
    const u = undo.current
    u.past.push(draft.body)
    if (u.past.length > 100) u.past.shift()
    u.future = []
    setDraft((d) => ({ ...d, body }))
    if (sel) requestAnimationFrame(() => { const ta = bodyRef.current; if (ta) { ta.focus(); ta.setSelectionRange(sel[0], sel[1]) } })
  }
  const wrap = (before: string, after = before, ph = 'text') => {
    const ta = bodyRef.current
    const s = ta?.selectionStart ?? draft.body.length
    const e = ta?.selectionEnd ?? draft.body.length
    const sel = draft.body.slice(s, e) || ph
    setBody(draft.body.slice(0, s) + before + sel + after + draft.body.slice(e), [s + before.length, s + before.length + sel.length])
  }
  const insert = (text: string, block = false) => {
    const ta = bodyRef.current
    const s = ta?.selectionStart ?? draft.body.length
    const e = ta?.selectionEnd ?? draft.body.length
    const pre = draft.body.slice(0, s)
    const lead = block && pre && !pre.endsWith('\n') ? '\n' : ''
    const t = lead + text + (block ? '\n' : '')
    setBody(pre + t + draft.body.slice(e), [s + t.length, s + t.length])
    setEmenu(null)
  }
  const linePrefix = (prefix: string | ((n: number) => string), strip = /^(#{1,3} |- \[[ x]\] |- |\d+\. |> )/) => {
    const ta = bodyRef.current
    const s = ta?.selectionStart ?? 0
    const e = ta?.selectionEnd ?? 0
    const start = draft.body.lastIndexOf('\n', s - 1) + 1
    const endIdx = draft.body.indexOf('\n', e)
    const end = endIdx === -1 ? draft.body.length : endIdx
    const lines = draft.body.slice(start, end).split('\n').map((l, n) => (typeof prefix === 'function' ? prefix(n) : prefix) + l.replace(strip, ''))
    const out = lines.join('\n')
    setBody(draft.body.slice(0, start) + out + draft.body.slice(end), [start + out.length, start + out.length])
    setEmenu(null)
  }
  const doUndo = () => {
    const u = undo.current
    const prev = u.past.pop()
    if (prev === undefined) return
    u.future.push(draft.body)
    setDraft((d) => ({ ...d, body: prev }))
  }
  const doRedo = () => {
    const u = undo.current
    const next = u.future.pop()
    if (next === undefined) return
    u.past.push(draft.body)
    setDraft((d) => ({ ...d, body: next }))
  }

  const crumbs: Page[] = []
  let p = page
  while (p?.parentId) {
    p = pages.find((x) => x.id === p!.parentId)
    if (p) crumbs.unshift(p)
  }
  const children = page ? pages.filter((x) => x.parentId === page.id) : []
  const notifications: AtlNotification[] = useMemo(
    () =>
      [
        ...pages.filter((x) => x.author === ME.id || x.watchers?.includes(ME.id)).flatMap((x) => (x.comments ?? []).filter((c) => c.author !== ME.id).map((c) => ({ id: c.id, title: <><b>{person(c.author).name}</b> commented on <span className="text-[#1868DB]">{x.title}</span></>, body: c.body, date: c.date, onClick: () => openPage(x.id) }))),
        ...pages.filter((x) => x.author !== ME.id && Date.now() - +new Date(x.updated) < 7 * 864e5).map((x) => ({ id: `upd-${x.id}-${x.updated}`, title: <><b>{person(x.lastEditor ?? x.author).name}</b> updated <span className="text-[#1868DB]">{x.title}</span></>, date: x.updated, onClick: () => openPage(x.id) })),
      ].sort((a, b) => +new Date(b.date) - +new Date(a.date)).slice(0, 10),
    [pages],
  )
  const searchAll = (q: string) => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean)
    const score = (t: string) => words.filter((w) => t.toLowerCase().includes(w)).length
    return [
      ...pages.map((x) => ({ kind: 'page' as const, id: x.id, title: x.title, body: x.body, author: x.author, updated: x.updated, labels: x.labels ?? [], s: score(x.title) * 3 + score(x.body) + score((x.labels ?? []).join(' ')) * 2 })),
      ...blogs.map((x) => ({ kind: 'blog' as const, id: x.id, title: x.title, body: x.body, author: x.author, updated: x.updated, labels: [] as string[], s: score(x.title) * 3 + score(x.body) })),
    ].filter((x) => x.s > 0).sort((a, b) => b.s - a.s)
  }
  const hits = mode === 'search' ? searchAll(query) : []
  const snippet = (body: string) => {
    const plain = body.replace(/\{status:([^:}]+):[^}]*\}/g, '$1').replace(/[#*`|:>_-]+/g, ' ').replace(/\s+/g, ' ')
    const i = plain.toLowerCase().indexOf(query.toLowerCase().split(/\s+/)[0] ?? '')
    return (i > 40 ? '…' : '') + plain.slice(Math.max(0, i - 40), Math.max(0, i - 40) + 180) + '…'
  }
  const starredPages = pages.filter((x) => x.starredBy?.includes(ME.id))
  const iconBtn = 'w-8 h-8 rounded-[4px] hover:bg-[#0515240F] flex items-center justify-center'
  const tb = 'w-8 h-8 rounded-[4px] hover:bg-[#0515240F] flex items-center justify-center'
  const pageList = (rows: { id: string; title: string; author: string; updated: string; emoji?: string }[], onClick: (id: string) => void, empty: string, right?: (r: any) => ReactNode) => (
    <div className="divide-y divide-[#0B120E14] border-y border-[#0B120E14]">
      {rows.map((x) => (
        <button key={x.id} onClick={() => onClick(x.id)} className="w-full flex items-center gap-3 py-2.5 text-left hover:bg-[#F8F8F8] px-2">
          {x.emoji ? <span>{x.emoji}</span> : <FileText size={16} className="text-[#1868DB]" />}
          <span className="flex-1 text-[14px] font-medium truncate">{x.title}</span>
          <span className="text-[13px] text-[#505258] w-[120px]">Operations</span>
          <span className="text-[13px] text-[#505258] w-[160px]">{right ? right(x) : `Updated ${ago(x.updated)}`}</span>
          <Avatar id={x.author} size={22} />
        </button>
      ))}
      {!rows.length && <div className="py-10 text-center text-[14px] text-[#505258]">{empty}</div>}
    </div>
  )

  return (
    <div className="flex-1 min-h-0 flex flex-col relative bg-white text-[#292A2E]" style={{ fontFamily: ATL_FONT }}>
      <TopNav
        product="confluence"
        onCreate={() => setMenu((m) => !m)}
        createAgent="conf-create"
        onSearch={(q) => { setQuery(q); setMode('search') }}
        onToggleSidebar={() => setSidebar((s) => !s)}
        onHome={() => openPage('pg-home')}
        notifications={notifications}
        rovo={(q) => searchAll(q).map((h) => ({ id: h.id, title: h.title, sub: `${h.kind === 'blog' ? 'Blog' : 'Page'} · ${person(h.author).name} · updated ${ago(h.updated)}`, onClick: () => (h.kind === 'blog' ? openBlog(h.id) : openPage(h.id)) }))}
        helpItems={[{ label: 'Markdown shortcuts', onClick: () => flash('In the editor use ## for headings, - for lists, | for tables and :::info for panels') }]}
        settingsItems={[{ label: 'Space settings', onClick: () => setMode('settings') }, { label: 'Templates', onClick: () => setMode('templates') }]}
      />
      {menu && (
        <div className="absolute z-50 top-[52px] left-1/2 translate-x-[160px] w-[300px] bg-white rounded-[8px] shadow-[0_8px_12px_#1E1F2126,0_0_1px_#1E1F214F] py-2">
          {[['conf-create-page', FileText, 'Page', 'Collaborate on rich, structured content', '#1868DB'], ['conf-create-whiteboard', LayoutTemplate, 'Whiteboard', 'Brainstorm and plan visually', '#6A9A23'], ['conf-create-database', Table, 'Database', 'Organize and track information', '#AF59E1'], ['conf-create-live', Sparkles, 'Live doc', 'Write and edit together in real time', '#E06C00']].map(([id, I, l, d, c]: any) => (
            <button
              key={id}
              data-agent={id}
              onClick={() => {
                const parent = cur && page?.id === 'pg-releases' ? 'pg-releases' : cur
                if (id === 'conf-create-page') newPage(parent)
                else if (id === 'conf-create-whiteboard') newPage(parent, 'whiteboard')
                else if (id === 'conf-create-database') newPage(parent, 'database')
                else newPage(parent, 'live')
              }}
              className="w-full flex items-start gap-3 px-4 py-2 hover:bg-[#0515240F] text-left"
            >
              <span className="w-8 h-8 rounded-[6px] flex items-center justify-center text-white" style={{ background: c }}><I size={16} /></span>
              <span><span className="block text-[14px] font-medium">{l}</span><span className="block text-[12px] text-[#505258]">{d}</span></span>
            </button>
          ))}
          <div className="border-t border-[#0B120E24] mt-1 pt-1">
            <button onClick={() => { startEdit({ title: '', body: '', parentId: null, kind: 'blog' }); setMenu(false) }} className="w-full text-left px-4 py-2 text-[14px] hover:bg-[#0515240F] flex items-center gap-2"><MessageSquare size={15} /> Blog post</button>
            <button onClick={() => { setMode('templates'); setMenu(false) }} className="w-full text-left px-4 py-2 text-[14px] hover:bg-[#0515240F] flex items-center gap-2"><LayoutTemplate size={15} /> Browse templates</button>
          </div>
        </div>
      )}
      <div className="flex-1 min-h-0 flex" onMouseDown={() => menu && setMenu(false)}>
        {/* sidebar */}
        {sidebar && (
          <div className="w-[280px] shrink-0 border-r border-[#0B120E24] flex flex-col">
            <div className="px-2 pt-3 space-y-0.5">
              <SideItem icon={<Home size={16} />} label="For you" agent="conf-nav-foryou" active={mode === 'foryou'} onClick={() => setMode('foryou')} />
              <SideItem icon={<Clock size={16} />} label="Recent" agent="conf-nav-recent" active={mode === 'recent'} onClick={() => setMode('recent')} />
              <SideItem icon={<Star size={16} />} label="Starred" agent="conf-nav-starred" active={mode === 'starred'} onClick={() => setMode('starred')} />
              <SideItem icon={<LayoutTemplate size={16} />} label="Templates" agent="conf-nav-templates" active={mode === 'templates'} onClick={() => setMode('templates')} />
              <SideItem icon={<Users size={16} />} label="Teams" agent="conf-nav-teams" active={mode === 'teams'} onClick={() => setMode('teams')} />
            </div>
            <div className="mx-3 my-3 h-px bg-[#0B120E24]" />
            <div className="px-3 flex items-center gap-2 relative">
              <span className="w-7 h-7 rounded-[6px] bg-[#FCA700] flex items-center justify-center text-white text-[12px] font-bold">OP</span>
              <div className="flex-1 min-w-0"><div className="text-[14px] font-semibold truncate">Operations</div><div className="text-[12px] text-[#505258]">Team space</div></div>
              <button data-atl-trigger aria-label="Space actions" onClick={() => setPmenu(pmenu === 'space' ? null : 'space')} className="w-7 h-7 rounded hover:bg-[#0515240F] flex items-center justify-center text-[#505258]"><MoreHorizontal size={16} /></button>
              {pmenu === 'space' && (
                <Pop onClose={() => setPmenu(null)} className="right-2 top-8 w-[220px]">
                  <PopItem onClick={() => { setPmenu(null); newPage('pg-home') }}><Plus size={14} /> Create page</PopItem>
                  <PopItem onClick={() => { setPmenu(null); startEdit({ title: '', body: '', parentId: null, kind: 'blog' }) }}><MessageSquare size={14} /> Create blog post</PopItem>
                  <PopItem onClick={() => { setPmenu(null); copyText(`${HOST}/spaces/OPS/overview`); flash('Space link copied') }}><Link2 size={14} /> Copy space link</PopItem>
                  <PopItem onClick={() => { setPmenu(null); setMode('settings') }}><Settings size={14} /> Space settings</PopItem>
                </Pop>
              )}
            </div>
            <div className="px-2 mt-2 space-y-0.5">
              <SideItem icon={<BookOpen size={16} />} label="Overview" active={mode === 'view' && cur === 'pg-home'} onClick={() => openPage('pg-home')} />
              <SideItem icon={<MessageSquare size={16} />} label="Blogs" agent="conf-nav-blogs" active={mode === 'blogs' || mode === 'blog'} onClick={() => setMode('blogs')} />
              <SideItem icon={<Settings size={16} />} label="Space settings" agent="conf-nav-settings" active={mode === 'settings'} onClick={() => setMode('settings')} />
            </div>
            <div className="px-4 mt-3 mb-1 flex items-center justify-between text-[12px] font-semibold text-[#6B6E76]">
              Content
              <span className="flex gap-1">
                <button aria-label="Filter content" onClick={() => setTreeQ(treeQ === null ? '' : null)} className={treeQ !== null ? 'text-[#1868DB]' : ''}><Search size={14} /></button>
                <button data-agent="conf-tree-add" onClick={() => newPage('pg-home')} aria-label="Create"><Plus size={14} /></button>
              </span>
            </div>
            {treeQ !== null && (
              <div className="px-3 mb-1"><input autoFocus value={treeQ} onChange={(e) => setTreeQ(e.target.value)} placeholder="Filter by title" aria-label="Filter by title" className="w-full h-7 px-2 rounded-[4px] border border-[#8C8F97] text-[13px] outline-none focus:border-[#1868DB]" /></div>
            )}
            <div className="flex-1 min-h-0 overflow-auto px-2 pb-3" data-agent="conf-tree">
              {treeQ ? (
                pages.filter((x) => x.id !== 'pg-home' && x.title.toLowerCase().includes(treeQ.toLowerCase())).map((x) => (
                  <button key={x.id} onClick={() => openPage(x.id)} className={`w-full h-8 flex items-center gap-1.5 px-2 rounded-[4px] text-[14px] text-left ${cur === x.id ? 'bg-[#E9F2FE] text-[#1868DB]' : 'hover:bg-[#0515240F]'}`}><FileText size={14} className="text-[#505258] shrink-0" /><span className="truncate">{x.title}</span></button>
                ))
              ) : (
                <Tree pages={pages.filter((x) => x.id !== 'pg-home')} parent="pg-home" depth={0} cur={mode === 'view' || mode === 'history' ? cur : null} onOpen={openPage} expanded={expanded} toggle={(id) => setExpanded((e) => { const n = new Set(e); if (n.has(id)) n.delete(id); else n.add(id); return n })} onAction={pageAction} />
              )}
            </div>
          </div>
        )}

        {/* main */}
        {mode === 'edit' ? (
          <div className="flex-1 min-w-0 flex flex-col relative" data-agent="conf-editor">
            <div className="h-[48px] shrink-0 flex items-center gap-0.5 px-4 border-b border-[#0B120E24] text-[#505258]">
              <button className={tb} aria-label="Undo" onClick={doUndo}><Undo2 size={16} /></button>
              <button className={tb} aria-label="Redo" onClick={doRedo}><Redo2 size={16} /></button>
              <span className="w-px h-5 bg-[#0B120E24] mx-1" />
              <span className="relative">
                <button data-atl-trigger className="h-8 px-2 rounded-[4px] hover:bg-[#0515240F] text-[14px] flex items-center gap-1" onClick={() => setEmenu(emenu === 'style' ? null : 'style')}>Normal text <ChevronDown size={14} /></button>
                {emenu === 'style' && (
                  <Pop onClose={() => setEmenu(null)} className="left-0 top-9 w-[200px]">
                    <PopItem onClick={() => linePrefix('')}>Normal text</PopItem>
                    <PopItem onClick={() => linePrefix('# ')}><span className="text-[22px] font-semibold">Heading 1</span></PopItem>
                    <PopItem onClick={() => linePrefix('## ')}><span className="text-[18px] font-semibold">Heading 2</span></PopItem>
                    <PopItem onClick={() => linePrefix('### ')}><span className="text-[15px] font-semibold">Heading 3</span></PopItem>
                    <PopItem onClick={() => linePrefix('> ')}><span className="border-l-2 border-[#DCDFE4] pl-2">Quote</span></PopItem>
                  </Pop>
                )}
              </span>
              <button className={tb} aria-label="Bold" title="Bold (Ctrl+B)" onClick={() => wrap('**')}><Bold size={16} /></button>
              <button className={tb} aria-label="Italic" title="Italic (Ctrl+I)" onClick={() => wrap('_')}><Italic size={16} /></button>
              <button className={tb} aria-label="Underline" title="Underline (Ctrl+U)" onClick={() => wrap('++')}><Underline size={16} /></button>
              <button className={tb} aria-label="Bullet list" onClick={() => linePrefix('- ')}><List size={16} /></button>
              <button className={tb} aria-label="Numbered list" onClick={() => linePrefix((n) => `${n + 1}. `)}><ListOrdered size={16} /></button>
              <button className={tb} aria-label="Table" onClick={() => insert('| Header | Header | Header |\n| --- | --- | --- |\n|  |  |  |\n|  |  |  |', true)}><Table size={16} /></button>
              <label className={tb + ' cursor-pointer'} aria-label="Image" title="Insert image">
                <Image size={16} />
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) insert(`![${f.name}](${f.name})`, true); e.target.value = '' }} />
              </label>
              <span className="relative">
                <button data-atl-trigger className={tb} aria-label="Link" onClick={() => setEmenu(emenu === 'link' ? null : 'link')}><Link2 size={16} /></button>
                {emenu === 'link' && (
                  <Pop onClose={() => setEmenu(null)} className="left-0 top-9 w-[280px] max-h-[300px] overflow-auto">
                    <PopHeading>Link to a page</PopHeading>
                    {pages.filter((x) => x.id !== draft.id).map((x) => <PopItem key={x.id} onClick={() => { setEmenu(null); wrap('[', `](${x.id})`, x.title) }}><FileText size={14} /> <span className="truncate">{x.title}</span></PopItem>)}
                  </Pop>
                )}
              </span>
              <span className="relative">
                <button data-atl-trigger className={tb} aria-label="Mention" onClick={() => setEmenu(emenu === 'mention' ? null : 'mention')}><AtSign size={16} /></button>
                {emenu === 'mention' && (
                  <Pop onClose={() => setEmenu(null)} className="left-0 top-9 w-[240px] max-h-[300px] overflow-auto">
                    {PEOPLE.filter((x) => !x.external).map((x) => <PopItem key={x.id} onClick={() => insert(`@[${x.name}] `)}><Avatar id={x.id} size={20} /> {x.name}</PopItem>)}
                  </Pop>
                )}
              </span>
              <span className="relative">
                <button data-atl-trigger className={tb} aria-label="Emoji" onClick={() => setEmenu(emenu === 'emoji' ? null : 'emoji')}><Smile size={16} /></button>
                {emenu === 'emoji' && (
                  <Pop onClose={() => setEmenu(null)} className="left-0 top-9 w-[232px] px-2 grid grid-cols-6 gap-1">
                    {EMOJI.map((e) => <button key={e} onClick={() => insert(e)} className="w-8 h-8 rounded hover:bg-[#0515240F] text-[18px]">{e}</button>)}
                  </Pop>
                )}
              </span>
              <span className="relative">
                <button data-atl-trigger className={tb} aria-label="Panel" onClick={() => setEmenu(emenu === 'panel' ? null : 'panel')}><Info size={16} /></button>
                {emenu === 'panel' && (
                  <Pop onClose={() => setEmenu(null)} className="left-0 top-9 w-[200px]">
                    {[['info', 'Info panel', '#1868DB'], ['note', 'Note panel', '#8270DB'], ['success', 'Success panel', '#1F845A'], ['warning', 'Warning panel', '#B38600'], ['error', 'Error panel', '#C9372C']].map(([k, l, c]) => <PopItem key={k} onClick={() => insert(`:::${k}\nType here\n:::`, true)}><span className="w-3 h-3 rounded-sm" style={{ background: c }} /> {l}</PopItem>)}
                  </Pop>
                )}
              </span>
              <span className="relative">
                <button data-atl-trigger className="h-8 px-2 rounded-[4px] hover:bg-[#0515240F] text-[14px] flex items-center gap-1" aria-label="Insert elements" onClick={() => setEmenu(emenu === 'plus' ? null : 'plus')}><Plus size={15} /> <ChevronDown size={14} /></button>
                {emenu === 'plus' && (
                  <Pop onClose={() => setEmenu(null)} className="left-0 top-9 w-[240px]">
                    <PopItem onClick={() => insert('- [ ] ', true)}>Action item</PopItem>
                    <PopItem onClick={() => insert('{status:IN PROGRESS:blue} ')}>Status</PopItem>
                    <PopItem onClick={() => insert('```\ncode\n```', true)}>Code snippet</PopItem>
                    <PopItem onClick={() => insert('---', true)}>Divider</PopItem>
                    <PopItem onClick={() => insert(`📅 ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} `)}>Date</PopItem>
                    <PopItem onClick={() => insert('OPS-')}>Jira work item</PopItem>
                  </Pop>
                )}
              </span>
              <div className="flex-1" />
              <span className="text-[13px] mr-2">{draft.kind === 'blog' ? 'Blog post draft' : 'Draft'} · saved</span>
              <Avatar id={ME.id} size={26} />
              <button data-agent="conf-close-draft" onClick={() => setMode(draft.kind === 'blog' ? (draft.blogId ? 'blog' : 'blogs') : 'view')} className="h-8 px-3 rounded-[4px] hover:bg-[#0515240F] text-[14px] font-medium text-[#292A2E] ml-2">Close draft</button>
              <button data-agent="conf-publish" onClick={publish} className="h-8 px-3 rounded-[4px] bg-[#1868DB] hover:bg-[#1558BC] text-white text-[14px] font-medium">{draft.id || draft.blogId ? 'Update' : 'Publish'}</button>
              <span className="relative">
                <button data-atl-trigger aria-label="More editor options" className={tb} onClick={() => setEmenu(emenu === 'more' ? null : 'more')}><MoreHorizontal size={16} /></button>
                {emenu === 'more' && (
                  <Pop onClose={() => setEmenu(null)} className="right-0 top-9 w-[200px]">
                    <PopItem onClick={() => { setPreview((v) => !v); setEmenu(null) }}><Eye size={14} /> {preview ? 'Back to editing' : 'Preview'}</PopItem>
                    <PopItem onClick={() => { setEmenu(null); setDraft((d) => ({ ...d, body: '' })) }}><RotateCcw size={14} /> Clear content</PopItem>
                    <PopItem danger onClick={() => { setEmenu(null); setMode(draft.kind === 'blog' ? 'blogs' : 'view'); flash('Draft discarded') }}><Trash2 size={14} /> Discard draft</PopItem>
                  </Pop>
                )}
              </span>
            </div>
            <div className="flex-1 min-h-0 overflow-auto">
              <div className="max-w-[760px] mx-auto px-6 pt-10 pb-20 flex flex-col">
                <div className="text-[13px] text-[#505258] mb-3 flex items-center gap-1">
                  <span>Operations</span><ChevronRight size={12} /><span>{draft.kind === 'blog' ? 'Blog' : pages.find((x) => x.id === draft.parentId)?.title}</span>
                  <div className="flex-1" />
                  {draft.kind !== 'blog' && (
                    <span className="relative">
                      <button data-atl-trigger onClick={() => setPmenu(pmenu === 'emoji' ? null : 'emoji')} className="h-7 px-2 rounded hover:bg-[#0515240F] flex items-center gap-1">{draft.emoji ? <span className="text-[16px]">{draft.emoji}</span> : <Smile size={14} />} {draft.emoji ? 'Change emoji' : 'Add emoji'}</button>
                      {pmenu === 'emoji' && (
                        <Pop onClose={() => setPmenu(null)} className="right-0 top-8 w-[232px] px-2">
                          <div className="grid grid-cols-6 gap-1">{EMOJI.map((e) => <button key={e} onClick={() => { setDraft((d) => ({ ...d, emoji: e })); setPmenu(null) }} className="w-8 h-8 rounded hover:bg-[#0515240F] text-[18px]">{e}</button>)}</div>
                          {draft.emoji && <button className="mt-1 w-full text-[13px] text-[#505258] hover:underline" onClick={() => { setDraft((d) => ({ ...d, emoji: '' })); setPmenu(null) }}>Remove emoji</button>}
                        </Pop>
                      )}
                    </span>
                  )}
                </div>
                <input data-agent="conf-title" aria-label="Page title" value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} placeholder={draft.kind === 'blog' ? 'Give this blog post a title' : draft.kind === 'whiteboard' ? 'Give this whiteboard a title' : 'Give this page a title'} className="text-[32px] font-semibold outline-none placeholder:text-[#B7B9BE] mb-4" />
                {preview ? (
                  <div className="min-h-[460px]" data-agent="conf-preview"><Markup body={draft.body} onLink={() => {}} /></div>
                ) : (
                  <textarea
                    ref={bodyRef}
                    data-agent="conf-body"
                    aria-label="Page content"
                    value={draft.body}
                    onChange={(e) => {
                      const u = undo.current
                      if (Date.now() - u.at > 800) {
                        u.past.push(draft.body)
                        u.future = []
                      }
                      u.at = Date.now()
                      setDraft((d) => ({ ...d, body: e.target.value }))
                    }}
                    onKeyDown={(e) => {
                      if (!(e.metaKey || e.ctrlKey)) return
                      const k = e.key.toLowerCase()
                      if (k === 'b') { e.preventDefault(); wrap('**') }
                      else if (k === 'i') { e.preventDefault(); wrap('_') }
                      else if (k === 'u') { e.preventDefault(); wrap('++') }
                      else if (k === 'z') { e.preventDefault(); if (e.shiftKey) doRedo(); else doUndo() }
                    }}
                    placeholder={draft.kind === 'whiteboard' ? 'Optional description — add sticky notes after publishing' : 'Type / to insert elements, or use markdown: ## heading, | table |, - list, :::info panel'}
                    className="min-h-[460px] text-[16px] leading-[28px] outline-none resize-none placeholder:text-[#B7B9BE]"
                  />
                )}
              </div>
            </div>
          </div>
        ) : mode === 'recent' || mode === 'templates' || mode === 'foryou' || mode === 'starred' || mode === 'teams' || mode === 'blogs' || mode === 'search' || mode === 'label' || mode === 'settings' ? (
          <div className="flex-1 min-w-0 overflow-auto px-10 py-8">
            {mode === 'recent' && (
              <>
                <h1 className="text-[24px] font-semibold mb-4">Recent</h1>
                <div className="flex gap-1 mb-4 border-b-2 border-[#0B120E14]">
                  {([['visited', 'Visited'], ['created', 'Created by me'], ['starred', 'Starred']] as const).map(([k, l]) => <button key={k} onClick={() => setRecentTab(k)} className={`h-9 px-3 text-[14px] font-medium -mb-[2px] border-b-2 ${recentTab === k ? 'border-[#1868DB] text-[#1868DB]' : 'border-transparent text-[#505258]'}`}>{l}</button>)}
                </div>
                {pageList(
                  (recentTab === 'visited' ? [...pages].sort((a, b) => +new Date(b.updated) - +new Date(a.updated)) : recentTab === 'created' ? pages.filter((x) => x.author === ME.id) : starredPages),
                  openPage,
                  recentTab === 'created' ? 'You haven’t created any pages yet.' : 'Nothing here yet.',
                  (x) => `Visited ${ago(x.updated)}`,
                )}
              </>
            )}
            {mode === 'templates' && (
              <>
                <h1 className="text-[24px] font-semibold mb-5">Templates</h1>
                <div className="grid grid-cols-3 gap-4">
                  {TEMPLATES.map((t) => (
                    <button key={t.id} data-agent={`conf-template-${t.id}`} onClick={() => startEdit({ title: t.title, body: t.body, parentId: t.parent ?? 'pg-home' })} className="text-left rounded-[8px] border border-[#0B120E24] overflow-hidden hover:shadow-md">
                      <div className="h-24" style={{ background: `${t.color}22` }}><div className="m-4 h-16 rounded bg-white shadow-sm p-2 space-y-1.5"><div className="h-2 w-1/2 rounded" style={{ background: t.color }} /><div className="h-1.5 w-4/5 rounded bg-[#DDDEE1]" /><div className="h-1.5 w-3/5 rounded bg-[#DDDEE1]" /></div></div>
                      <div className="p-3"><div className="text-[14px] font-semibold">{t.name}</div><div className="text-[13px] text-[#505258]">{t.desc}</div></div>
                    </button>
                  ))}
                </div>
              </>
            )}
            {mode === 'foryou' && (
              <>
                <h1 className="text-[24px] font-semibold mb-1">For you</h1>
                <div className="text-[14px] text-[#505258] mb-5">Catch up on what your team is working on in Operations.</div>
                <div className="grid grid-cols-3 gap-4 mb-8">
                  {[...pages].sort((a, b) => (b.views ?? 0) - (a.views ?? 0)).slice(0, 3).map((x) => (
                    <button key={x.id} onClick={() => openPage(x.id)} className="text-left rounded-[8px] border border-[#0B120E24] p-4 hover:shadow-md">
                      <div className="text-[22px]">{x.emoji ?? '📄'}</div>
                      <div className="text-[14px] font-semibold mt-2 truncate">{x.title}</div>
                      <div className="text-[12px] text-[#505258] mt-1 flex items-center gap-1"><Eye size={12} /> {x.views ?? 0} views · {person(x.author).name}</div>
                    </button>
                  ))}
                </div>
                <h2 className="text-[16px] font-semibold mb-2">Recently updated</h2>
                {pageList([...pages].sort((a, b) => +new Date(b.updated) - +new Date(a.updated)).slice(0, 8), openPage, '', (x) => `${person(x.lastEditor ?? x.author).first} · ${ago(x.updated)}`)}
                <h2 className="text-[16px] font-semibold mt-8 mb-2">Latest blog posts</h2>
                {pageList(blogs, openBlog, 'No blog posts yet.', (x) => `Posted ${ago(x.created)}`)}
              </>
            )}
            {mode === 'starred' && (
              <>
                <h1 className="text-[24px] font-semibold mb-4">Starred</h1>
                {pageList(starredPages, openPage, 'Star pages with the ☆ button or the page tree menu to find them here.')}
              </>
            )}
            {mode === 'teams' && (
              <>
                <h1 className="text-[24px] font-semibold mb-5">Teams</h1>
                <div className="rounded-[8px] border border-[#0B120E24] p-5">
                  <div className="text-[16px] font-semibold">Operations</div>
                  <div className="text-[13px] text-[#505258] mb-4">Contributors to the Operations space</div>
                  <div className="grid grid-cols-3 gap-3">
                    {Array.from(new Set([...pages.map((x) => x.author), ...blogs.map((x) => x.author)])).map((a) => (
                      <div key={a} className="flex items-center gap-3 p-2 rounded-[6px] hover:bg-[#F8F8F8]">
                        <Avatar id={a} size={36} />
                        <div className="min-w-0"><div className="text-[14px] font-medium truncate">{person(a).name}</div><div className="text-[12px] text-[#505258]">{pages.filter((x) => x.author === a).length} pages · {blogs.filter((x) => x.author === a).length} blog posts</div></div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
            {mode === 'blogs' && (
              <>
                <div className="flex items-center mb-5"><h1 className="text-[24px] font-semibold flex-1">Blogs</h1><button className={btnPrimary} data-agent="conf-blog-create" onClick={() => startEdit({ title: '', body: '', parentId: null, kind: 'blog' })}>Create blog post</button></div>
                <div className="space-y-4">
                  {[...blogs].sort((a, b) => +new Date(b.created) - +new Date(a.created)).map((b) => (
                    <button key={b.id} onClick={() => openBlog(b.id)} className="w-full text-left rounded-[8px] border border-[#0B120E24] p-5 hover:shadow-md">
                      <div className="flex items-center gap-2 text-[13px] text-[#505258]"><Avatar id={b.author} size={22} />{person(b.author).name} · {new Date(b.created).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}{b.createdBy === 'hworker' && <HWBadge />}</div>
                      <div className="text-[18px] font-semibold mt-2">{b.title}</div>
                      <div className="text-[14px] text-[#505258] mt-1 line-clamp-2">{b.body.replace(/[#*:|>`-]+/g, ' ').slice(0, 220)}</div>
                      <div className="flex gap-4 mt-2 text-[13px] text-[#505258]"><span className="flex items-center gap-1"><ThumbsUp size={13} /> {b.likes?.length ?? 0}</span><span className="flex items-center gap-1"><MessageSquare size={13} /> {b.comments?.length ?? 0}</span></div>
                    </button>
                  ))}
                  {!blogs.length && <div className="text-[14px] text-[#505258]">No blog posts yet.</div>}
                </div>
              </>
            )}
            {mode === 'search' && (
              <>
                <h1 className="text-[24px] font-semibold mb-3">Search</h1>
                <div className="flex gap-2 mb-4">
                  <div className="relative flex-1 max-w-[560px]"><Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#505258]" /><input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} className={inputAtl + ' pl-8'} aria-label="Search Confluence" /></div>
                </div>
                <div className="text-[13px] text-[#505258] mb-2">{hits.length} result{hits.length === 1 ? '' : 's'} for “{query}”</div>
                <div className="space-y-1">
                  {hits.map((h) => (
                    <button key={h.kind + h.id} onClick={() => (h.kind === 'blog' ? openBlog(h.id) : openPage(h.id))} className="w-full text-left p-3 rounded-[6px] hover:bg-[#F8F8F8]">
                      <div className="flex items-center gap-2 text-[16px] text-[#1868DB] font-medium">{h.kind === 'blog' ? <MessageSquare size={15} /> : <FileText size={15} />}{h.title}</div>
                      <div className="text-[13px] text-[#505258] mt-0.5 line-clamp-2">{snippet(h.body)}</div>
                      <div className="text-[12px] text-[#6B6E76] mt-1">Operations · {person(h.author).name} · updated {ago(h.updated)}{h.labels.length ? ` · ${h.labels.join(', ')}` : ''}</div>
                    </button>
                  ))}
                </div>
              </>
            )}
            {mode === 'label' && (
              <>
                <div className="text-[13px] text-[#505258]">Label</div>
                <h1 className="text-[24px] font-semibold mb-4 flex items-center gap-2"><Tag size={20} /> {label}</h1>
                {pageList(pages.filter((x) => x.labels?.includes(label)), openPage, 'No pages with this label.')}
              </>
            )}
            {mode === 'settings' && (
              <>
                <h1 className="text-[24px] font-semibold mb-5">Space settings</h1>
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="rounded-[8px] border border-[#0B120E24] p-5">
                    <div className="text-[16px] font-semibold mb-3">Space details</div>
                    {[['Name', 'Operations'], ['Key', 'OPS'], ['Type', 'Team space'], ['Owner', person('priya').name], ['Created', new Date(pages.find((x) => x.id === 'pg-home')?.created ?? Date.now()).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })]].map(([k, v]) => <div key={k} className="flex text-[14px] py-1"><span className="w-[120px] text-[#505258]">{k}</span><span>{v}</span></div>)}
                  </div>
                  <div className="rounded-[8px] border border-[#0B120E24] p-5">
                    <div className="text-[16px] font-semibold mb-3">Content</div>
                    {[['Pages', pages.length], ['Blog posts', blogs.length], ['Whiteboards', pages.filter((x) => x.kind === 'whiteboard').length], ['Total views', pages.reduce((a, x) => a + (x.views ?? 0), 0)], ['Contributors', new Set(pages.map((x) => x.author)).size]].map(([k, v]) => <div key={k as string} className="flex text-[14px] py-1"><span className="w-[120px] text-[#505258]">{k}</span><span>{v}</span></div>)}
                  </div>
                </div>
                <h2 className="text-[18px] font-semibold mb-2 flex items-center gap-2"><Trash2 size={18} /> Trash</h2>
                <div className="text-[13px] text-[#505258] mb-3">Pages deleted from this space. Restore them to put them back in the page tree.</div>
                <div className="divide-y divide-[#0B120E14] border-y border-[#0B120E14]" data-agent="conf-trash">
                  {trash.map((t) => (
                    <div key={t.id} className="flex items-center gap-3 py-2.5 px-2 text-[14px]">
                      <FileText size={16} className="text-[#505258]" />
                      <span className="flex-1 truncate">{t.title}</span>
                      <span className="text-[13px] text-[#505258]">Deleted {ago(t.deletedAt)}</span>
                      <button className={btnDefault} onClick={() => { const { deletedAt, ...rest } = t; void deletedAt; db.insert('confluence.pages', { ...rest, parentId: rest.parentId && pages.some((x) => x.id === rest.parentId) ? rest.parentId : 'pg-home' }); db.remove('confluence.trash', t.id); flash(`“${t.title}” restored`) }}>Restore</button>
                      <button className={btnSubtle + ' text-[#AE2E24]'} onClick={() => { db.remove('confluence.trash', t.id); flash(`“${t.title}” permanently deleted`) }}>Purge</button>
                    </div>
                  ))}
                  {!trash.length && <div className="py-8 text-center text-[14px] text-[#505258]">Trash is empty.</div>}
                </div>
              </>
            )}
          </div>
        ) : mode === 'blog' && blog ? (
          <div className="flex-1 min-w-0 overflow-auto">
            <div className="h-[48px] flex items-center px-6 gap-1 text-[14px] text-[#505258] sticky top-0 bg-white">
              <button onClick={() => setMode('blogs')} className="hover:underline">Operations</button><ChevronRight size={13} /><button onClick={() => setMode('blogs')} className="hover:underline">Blog</button>
              <div className="flex-1" />
              {blog.author === ME.id && <button aria-label="Edit" onClick={() => startEdit({ title: blog.title, body: blog.body, parentId: null, kind: 'blog', blogId: blog.id })} className={iconBtn}><Pencil size={16} /></button>}
              <button aria-label="Copy link" onClick={() => { copyText(`${HOST}/spaces/OPS/blog/${blog.id}`); flash('Link copied to clipboard') }} className={iconBtn}><Link2 size={16} /></button>
            </div>
            <div className="max-w-[760px] mx-auto px-6 pt-4 pb-24">
              <h1 className="text-[32px] font-semibold leading-tight">{blog.title}</h1>
              <div className="flex items-center gap-2 mt-3 mb-6 text-[13px] text-[#505258]"><Avatar id={blog.author} size={24} />By <span className="text-[#292A2E]">{person(blog.author).name}</span> · {new Date(blog.created).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}{blog.createdBy === 'hworker' && <HWBadge />}</div>
              <Markup body={blog.body} onLink={(id) => pages.some((x) => x.id === id) && openPage(id)} onIssue={(k) => desk.open('jira', { issueKey: k })} />
              <Engagement col="confluence.blogs" rec={blog} />
            </div>
          </div>
        ) : page ? (
          <div className="flex-1 min-w-0 flex flex-col">
            <div className="h-[48px] shrink-0 flex items-center px-6 gap-1 text-[14px] text-[#505258]">
              <span>Operations</span>
              {crumbs.filter((c) => c.id !== 'pg-home').map((c) => <span key={c.id} className="flex items-center gap-1"><ChevronRight size={13} /><button onClick={() => openPage(c.id)} className="hover:underline">{c.title}</button></span>)}
              {mode === 'history' && <span className="flex items-center gap-1"><ChevronRight size={13} /><button onClick={() => openPage(page.id)} className="hover:underline">{page.title}</button><ChevronRight size={13} /><span>Page history</span></span>}
              <div className="flex-1" />
              <button data-agent="conf-edit" aria-label="Edit" onClick={() => startEdit({ id: page.id, title: page.title, body: page.body, parentId: page.parentId, emoji: page.emoji })} className={iconBtn}><Pencil size={16} /></button>
              <button aria-label={page.starredBy?.includes(ME.id) ? 'Unstar' : 'Star'} aria-pressed={!!page.starredBy?.includes(ME.id)} onClick={() => pageAction('star', page)} className={iconBtn}><Star size={16} className={page.starredBy?.includes(ME.id) ? 'text-[#E2B203]' : ''} fill={page.starredBy?.includes(ME.id) ? '#E2B203' : 'none'} /></button>
              <button aria-label={page.watchers?.includes(ME.id) ? 'Stop watching' : 'Watch'} aria-pressed={!!page.watchers?.includes(ME.id)} title={page.watchers?.includes(ME.id) ? 'Watching this page' : 'Watch this page'} onClick={() => { const w = page.watchers ?? []; db.update('confluence.pages', page.id, { watchers: w.includes(ME.id) ? w.filter((x) => x !== ME.id) : [...w, ME.id] }); flash(w.includes(ME.id) ? 'You stopped watching this page' : 'You’re watching this page — you’ll be notified of changes') }} className={iconBtn}><Eye size={16} className={page.watchers?.includes(ME.id) ? 'text-[#1868DB]' : ''} /></button>
              <button onClick={() => { setShare({ to: [], msg: '' }); setDialog({ kind: 'share', page }) }} className="h-8 px-3 rounded-[4px] bg-[#0515240F] hover:bg-[#0B120E24] text-[14px] font-medium text-[#292A2E] flex items-center gap-1.5 mx-1"><Share2 size={14} /> Share</button>
              <button aria-label="Copy link" onClick={() => pageAction('link', page)} className={iconBtn}><Link2 size={16} /></button>
              <span className="relative">
                <button data-atl-trigger aria-label="More actions" onClick={() => setPmenu(pmenu === 'more' ? null : 'more')} className={iconBtn}><MoreHorizontal size={16} /></button>
                {pmenu === 'more' && (
                  <Pop onClose={() => setPmenu(null)} className="right-0 top-9 w-[220px]" agent="conf-page-more">
                    <PopItem onClick={() => { setPmenu(null); setViewVersion(null); setMode('history') }}><History size={14} /> Page history</PopItem>
                    <PopItem onClick={() => { setPmenu(null); setDialog({ kind: 'info', page }) }}><Info size={14} /> Page information</PopItem>
                    <PopItem onClick={() => { setPmenu(null); startEdit({ title: `Copy of ${page.title}`, body: page.body, parentId: page.parentId, emoji: page.emoji }) }}><Copy size={14} /> Copy</PopItem>
                    <PopItem onClick={() => { setPmenu(null); pageAction('move', page) }}><FolderInput size={14} /> Move</PopItem>
                    <PopItem onClick={() => { setPmenu(null); flash(`Exported “${page.title}” to PDF — check your Downloads`) }}><FileDown size={14} /> Export to PDF</PopItem>
                    <div className="h-px bg-[#0B120E24] my-1" />
                    <PopItem danger disabled={page.id === 'pg-home'} onClick={() => { setPmenu(null); pageAction('delete', page) }}><Trash2 size={14} /> Delete</PopItem>
                  </Pop>
                )}
              </span>
            </div>
            {mode === 'history' ? (
              <div className="flex-1 min-h-0 overflow-auto" data-agent="conf-history">
                <div className="max-w-[900px] mx-auto px-6 pt-4 pb-20">
                  <h1 className="text-[24px] font-semibold mb-4">Page history</h1>
                  <table className="w-full text-[14px] border border-[#0B120E24]">
                    <thead><tr className="bg-[#F8F8F8] text-left text-[12px] text-[#505258]">{['Version', 'Published', 'Changed by', 'Title', ''].map((h) => <th key={h} className="px-3 py-2 font-semibold">{h}</th>)}</tr></thead>
                    <tbody>
                      {[{ version: (page.versions?.length ?? 0) + 1, title: page.title, body: page.body, author: page.lastEditor ?? page.author, date: page.updated, current: true }, ...[...(page.versions ?? [])].reverse().map((v) => ({ ...v, current: false }))].map((v) => (
                        <tr key={v.version} className={`border-t border-[#0B120E14] ${viewVersion === v.version ? 'bg-[#E9F2FE]' : ''}`}>
                          <td className="px-3 py-2"><button onClick={() => setViewVersion(v.version)} className="text-[#1868DB] hover:underline">v.{v.version}</button>{v.current && <span className="ml-2 text-[12px] text-[#216E4E]">CURRENT</span>}</td>
                          <td className="px-3 text-[13px]">{new Date(v.date).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</td>
                          <td className="px-3"><span className="flex items-center gap-2"><Avatar id={v.author} size={20} />{person(v.author).name}</span></td>
                          <td className="px-3 truncate max-w-[240px]">{v.title}</td>
                          <td className="px-3 text-right">{!v.current && <button className={btnSubtle + ' !h-7'} onClick={() => {
                            const now = new Date().toISOString()
                            db.update('confluence.pages', page.id, { title: v.title, body: v.body, updated: now, lastEditor: ME.id, versions: [...(page.versions ?? []), { version: (page.versions?.length ?? 0) + 1, title: page.title, body: page.body, author: page.lastEditor ?? page.author, date: page.updated }] })
                            flash(`Restored v.${v.version} as a new version`)
                            openPage(page.id)
                          }}><RotateCcw size={13} className="inline -mt-0.5" /> Restore</button>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!page.versions?.length && <div className="text-[13px] text-[#505258] mt-2">This page has only one version. Edit and update it to create history.</div>}
                  {viewVersion !== null && (() => {
                    const all = [...(page.versions ?? []), { version: (page.versions?.length ?? 0) + 1, title: page.title, body: page.body, author: page.lastEditor ?? page.author, date: page.updated }]
                    const v = all.find((x) => x.version === viewVersion)
                    return v ? (
                      <div className="mt-6 rounded-[8px] border border-[#0B120E24] p-6">
                        <div className="text-[12px] text-[#505258] mb-2">Viewing v.{v.version} · {person(v.author).name}</div>
                        <h2 className="text-[26px] font-semibold mb-3">{v.title}</h2>
                        <Markup body={v.body} onLink={() => {}} />
                      </div>
                    ) : null
                  })()}
                </div>
              </div>
            ) : page.kind === 'whiteboard' ? (
              <div className="flex-1 min-h-0 flex flex-col" data-agent="conf-page-view">
                <div className="px-6 pb-2 flex items-center gap-2"><h1 className="text-[22px] font-semibold" data-agent="conf-page-title">{page.title}</h1><span className="text-[12px] text-[#6B6E76]">Whiteboard · {person(page.author).name} · updated {ago(page.updated)}</span></div>
                <Whiteboard pageId={page.id} stickies={page.stickies ?? []} />
              </div>
            ) : (
              <div className="flex-1 min-h-0 overflow-auto" data-agent="conf-page-view">
                <div className={`max-w-[760px] mx-auto px-6 pt-6 pb-24 ${page.createdBy === 'hworker' && Date.now() - +new Date(page.created) < 90000 ? 'flash-new' : ''}`}>
                  {page.emoji && <div className="text-[40px] mb-2">{page.emoji}</div>}
                  <h1 className="text-[32px] font-semibold leading-tight tracking-[-0.3px]" data-agent="conf-page-title">{page.title}</h1>
                  <div className="flex items-center gap-2 mt-3 mb-6 text-[13px] text-[#505258]">
                    <Avatar id={page.author} size={24} />
                    <span>Owned by <span className="text-[#292A2E]">{person(page.author).name}</span></span>
                    <span>·</span>
                    <button className="hover:underline" onClick={() => setMode('history')}>Last updated {ago(page.updated)}</button>
                    <span>·</span>
                    <span>{Math.max(1, Math.round(page.body.split(/\s+/).length / 200))} min read</span>
                    <span>·</span>
                    <span className="flex items-center gap-1"><Eye size={13} />{page.views ?? 1}</span>
                    {page.kind === 'live' && <span className="h-5 px-1.5 rounded-[3px] bg-[#FFF3EB] text-[#E06C00] text-[11px] font-bold flex items-center">LIVE</span>}
                    {page.createdBy === 'hworker' && <HWBadge />}
                  </div>
                  <Markup body={page.body} onLink={(id) => pages.some((x) => x.id === id) && openPage(id)} onIssue={(k) => desk.open('jira', { issueKey: k })} />
                  {children.length > 0 && page.id !== 'pg-home' && (
                    <div className="mt-8">
                      <div className="text-[13px] font-semibold text-[#505258] mb-2">Child pages</div>
                      {children.map((c) => <button key={c.id} onClick={() => openPage(c.id)} className="flex items-center gap-2 text-[14px] text-[#1868DB] hover:underline py-0.5"><FileText size={14} />{c.title}</button>)}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-1 mt-8" data-agent="conf-labels">
                    {(page.labels ?? []).map((l) => (
                      <span key={l} className="h-6 pl-2 pr-0.5 rounded-[3px] bg-[#0515240F] text-[12px] flex items-center gap-0.5 text-[#505258]">
                        <button onClick={() => { setLabel(l); setMode('label') }} className="hover:underline">{l}</button>
                        <button aria-label={`Remove label ${l}`} onClick={() => db.update('confluence.pages', page.id, { labels: (page.labels ?? []).filter((x) => x !== l) })} className="w-5 h-5 rounded hover:bg-[#0B120E24] flex items-center justify-center"><X size={11} /></button>
                      </span>
                    ))}
                    {newLabel === null ? (
                      <button aria-label="Add label" onClick={() => setNewLabel('')} className="h-6 px-2 rounded-[3px] hover:bg-[#0515240F] text-[12px] text-[#505258] flex items-center gap-1"><Tag size={12} />{page.labels?.length ? <Plus size={12} /> : 'Add label'}</button>
                    ) : (
                      <input autoFocus aria-label="New label" value={newLabel} onChange={(e) => setNewLabel(e.target.value.toLowerCase().replace(/\s+/g, '-'))} onBlur={() => setNewLabel(null)} onKeyDown={(e) => { if (e.key === 'Enter' && newLabel.trim()) { db.update('confluence.pages', page.id, { labels: Array.from(new Set([...(page.labels ?? []), newLabel.trim()])) }); setNewLabel('') } if (e.key === 'Escape') setNewLabel(null) }} placeholder="Type a label and press Enter" className="h-6 w-[200px] px-2 rounded-[3px] border border-[#1868DB] text-[12px] outline-none" />
                    )}
                  </div>
                  <Engagement col="confluence.pages" rec={page} />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[#505258]">Page not found<X size={14} /></div>
        )}
      </div>
      {dialog?.kind === 'delete' && (
        <Dialog title={`Delete “${dialog.page.title}”?`} onClose={() => setDialog(null)} footer={<><button className={btnSubtle} onClick={() => setDialog(null)}>Cancel</button><button className="h-8 px-3 rounded-[4px] bg-[#C9372C] hover:bg-[#AE2E24] text-white text-[14px] font-medium" onClick={() => { deletePage(dialog.page); setDialog(null) }}>Delete</button></>}>
          The page will be moved to the space trash, where a space admin can restore it.{pages.some((x) => x.parentId === dialog.page.id) ? ' Its child pages will move up one level.' : ''}
        </Dialog>
      )}
      {dialog?.kind === 'move' && (
        <Dialog title={`Move “${dialog.page.title}”`} onClose={() => setDialog(null)} footer={<><button className={btnSubtle} onClick={() => setDialog(null)}>Cancel</button><button className={btnPrimary} onClick={() => { db.update('confluence.pages', dialog.page.id, { parentId: moveTo }); setExpanded((e) => new Set([...e, moveTo])); flash(`Moved under “${pages.find((x) => x.id === moveTo)?.title}”`); setDialog(null) }}>Move</button></>}>
          <div className="text-[12px] font-semibold text-[#505258] mb-1">New parent page</div>
          {(() => {
            const desc = new Set<string>([dialog.page.id])
            let grew = true
            while (grew) {
              grew = false
              for (const x of pages) if (x.parentId && desc.has(x.parentId) && !desc.has(x.id)) { desc.add(x.id); grew = true }
            }
            return <select value={moveTo} onChange={(e) => setMoveTo(e.target.value)} className={inputAtl} aria-label="New parent page">{pages.filter((x) => !desc.has(x.id)).map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}</select>
          })()}
        </Dialog>
      )}
      {dialog?.kind === 'share' && (
        <Dialog title={`Share “${dialog.page.title}”`} onClose={() => setDialog(null)} footer={<><button className={btnSubtle + ' mr-auto flex items-center gap-1.5'} onClick={() => { copyText(pageUrl(dialog.page)); flash('Link copied to clipboard') }}><Link2 size={14} /> Copy link</button><button className={btnSubtle} onClick={() => setDialog(null)}>Cancel</button><button className={btnPrimary} disabled={!share.to.length} onClick={() => { db.update('confluence.pages', dialog.page.id, (r) => ({ watchers: Array.from(new Set([...((r.watchers as string[]) ?? []), ...share.to])) })); flash(`Shared with ${share.to.map((x) => person(x).first).join(', ')}`); setDialog(null) }}>Share</button></>}>
          <div className="text-[12px] font-semibold text-[#505258] mb-1">Names or teams</div>
          <div className="flex flex-wrap gap-1 mb-2">{share.to.map((x) => <span key={x} className="h-6 pl-1 pr-1 rounded-full bg-[#E9F2FE] text-[12px] flex items-center gap-1"><Avatar id={x} size={18} />{person(x).name}<button aria-label={`Remove ${person(x).name}`} onClick={() => setShare((s) => ({ ...s, to: s.to.filter((y) => y !== x) }))}><X size={11} /></button></span>)}</div>
          <select value="" onChange={(e) => e.target.value && setShare((s) => ({ ...s, to: [...s.to, e.target.value] }))} className={inputAtl} aria-label="Add people"><option value="">Add people…</option>{PEOPLE.filter((x) => !x.external && x.id !== ME.id && !share.to.includes(x.id)).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
          <div className="text-[12px] font-semibold text-[#505258] mb-1 mt-3">Message (optional)</div>
          <textarea value={share.msg} onChange={(e) => setShare((s) => ({ ...s, msg: e.target.value }))} rows={3} className={inputAtl + ' h-auto py-2'} aria-label="Message" />
        </Dialog>
      )}
      {dialog?.kind === 'info' && (
        <Dialog title="Page information" onClose={() => setDialog(null)} footer={<button className={btnPrimary} onClick={() => setDialog(null)}>Close</button>}>
          {[['Title', dialog.page.title], ['Owner', person(dialog.page.author).name], ['Created', new Date(dialog.page.created).toLocaleString('en-US')], ['Last updated', `${new Date(dialog.page.updated).toLocaleString('en-US')} by ${person(dialog.page.lastEditor ?? dialog.page.author).name}`], ['Versions', String((dialog.page.versions?.length ?? 0) + 1)], ['Views', String(dialog.page.views ?? 0)], ['Likes', String(dialog.page.likes?.length ?? 0)], ['Comments', String(dialog.page.comments?.length ?? 0)], ['Labels', (dialog.page.labels ?? []).join(', ') || 'None'], ['Child pages', String(pages.filter((x) => x.parentId === dialog.page.id).length)]].map(([k, v]) => <div key={k} className="flex py-1"><span className="w-[120px] text-[#505258]">{k}</span><span className="flex-1">{v}</span></div>)}
        </Dialog>
      )}
      {flag && <Flag key={flag.at} onClose={() => setFlag(null)} agent="conf-flag">{flag.msg}</Flag>}
    </div>
  )
}
