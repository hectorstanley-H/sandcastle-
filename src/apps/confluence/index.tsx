import { useEffect, useState, type ReactNode } from 'react'
import {
  ChevronDown, ChevronRight, FileText, Plus, MoreHorizontal, Star, Pencil, Share2, Link2, Clock, Info, AlertTriangle, CheckCircle2, StickyNote, Bold, Italic, Underline,
  List, ListOrdered, Table, Image, AtSign, Smile, Undo2, Redo2, X, Eye, MessageSquare, LayoutTemplate, Users, Search, Home, Settings, BookOpen, Sparkles,
} from 'lucide-react'
import type { AppProps } from '@/os/registry'
import { logoUrl } from '@/os/registry'
import { useDesk, useWin } from '@/os/context'
import { db, useCollection } from '@/db/db'
import { ME, person } from '@/data/people'
import { Avatar } from '@/components/Avatar'
import { ATL_FONT, TopNav, SideItem, Lozenge, HWBadge } from '../jira/atlassian'

type Page = { id: string; space: string; title: string; parentId: string | null; body: string; author: string; created: string; updated: string; emoji?: string; labels?: string[]; createdBy?: string; views?: number }

/* ─────────────────────────── markup renderer ─────────────────────────── */

function inline(text: string, onLink: (id: string) => void): ReactNode[] {
  const out: ReactNode[] = []
  const re = /(\*\*[^*]+\*\*|\{status:[^}]+\}|\[[^\]]+\]\([^)]+\)|`[^`]+`|\bOPS-\d+\b|#[a-z][a-z0-9-]+)/g
  let last = 0
  let m: RegExpExecArray | null
  let k = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const t = m[0]
    if (t.startsWith('**')) out.push(<strong key={k++}>{t.slice(2, -2)}</strong>)
    else if (t.startsWith('{status:')) {
      const [, label, color] = t.slice(1, -1).split(':')
      out.push(<Lozenge key={k++} bold tone={(color as any) || 'grey'}>{label}</Lozenge>)
    } else if (t.startsWith('[')) {
      const mm = /\[([^\]]+)\]\(([^)]+)\)/.exec(t)!
      out.push(<button key={k++} onClick={() => onLink(mm[2])} className="text-[#1868DB] hover:underline">{mm[1]}</button>)
    } else if (t.startsWith('`')) out.push(<code key={k++} className="px-1 rounded bg-[#0515240F] text-[13px] font-mono">{t.slice(1, -1)}</code>)
    else if (t.startsWith('OPS-'))
      out.push(
        <span key={k++} className="inline-flex items-center gap-1 h-5 px-1 rounded-[3px] bg-[#0515240F] text-[#1868DB] text-[13px] align-[1px]">
          <img src={logoUrl('jira')} className="w-3 h-3" alt="" />{t}
        </span>,
      )
    else out.push(<span key={k++} className="text-[#1868DB]">{t}</span>)
    last = m.index + t.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

export function Markup({ body, onLink }: { body: string; onLink: (id: string) => void }) {
  const lines = body.split('\n')
  const out: ReactNode[] = []
  let i = 0
  let key = 0
  const panel: Record<string, [string, string, any]> = { info: ['#E9F2FE', '#1868DB', Info], note: ['#F3F0FF', '#8270DB', StickyNote], warning: ['#FFF7D6', '#B38600', AlertTriangle], success: ['#DCFFF1', '#1F845A', CheckCircle2], error: ['#FFECEB', '#C9372C', AlertTriangle] }
  while (i < lines.length) {
    const l = lines[i]
    if (l.startsWith(':::')) {
      const kind = l.slice(3).trim() || 'info'
      const buf: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith(':::')) buf.push(lines[i++])
      i++
      const [bg, fg, I] = panel[kind] ?? panel.info
      out.push(
        <div key={key++} className="flex gap-3 rounded-[4px] px-4 py-3 my-3" style={{ background: bg }}>
          <I size={18} style={{ color: fg }} className="shrink-0 mt-0.5" />
          <div className="text-[16px] leading-[26px]">{buf.map((b, n) => <div key={n}>{inline(b, onLink)}</div>)}</div>
        </div>,
      )
      continue
    }
    if (l.startsWith('|')) {
      const rows: string[][] = []
      while (i < lines.length && lines[i].startsWith('|')) {
        const cells = lines[i].split('|').slice(1, -1).map((c) => c.trim())
        if (!cells.every((c) => /^-+$/.test(c))) rows.push(cells)
        i++
      }
      out.push(
        <div key={key++} className="my-4 overflow-x-auto">
          <table className="border-collapse text-[14px] min-w-[60%]">
            <thead><tr>{rows[0]?.map((c, n) => <th key={n} className="border border-[#DCDFE4] bg-[#F8F8F8] px-3 py-2 text-left font-semibold">{inline(c, onLink)}</th>)}</tr></thead>
            <tbody>{rows.slice(1).map((r, n) => <tr key={n}>{r.map((c, m) => <td key={m} className="border border-[#DCDFE4] px-3 py-2 align-top">{inline(c, onLink)}</td>)}</tr>)}</tbody>
          </table>
        </div>,
      )
      continue
    }
    if (/^- /.test(l) || /^\d+\. /.test(l)) {
      const ordered = /^\d+\. /.test(l)
      const items: string[] = []
      while (i < lines.length && (ordered ? /^\d+\. /.test(lines[i]) : /^- /.test(lines[i]))) items.push(lines[i++].replace(/^(- |\d+\. )/, ''))
      const Tag = ordered ? 'ol' : 'ul'
      out.push(<Tag key={key++} className={`${ordered ? 'list-decimal' : 'list-disc'} pl-7 my-2 text-[16px] leading-[28px]`}>{items.map((it, n) => <li key={n}>{inline(it, onLink)}</li>)}</Tag>)
      continue
    }
    if (l.startsWith('### ')) out.push(<h3 key={key++} className="text-[18px] font-semibold mt-6 mb-1">{inline(l.slice(4), onLink)}</h3>)
    else if (l.startsWith('## ')) out.push(<h2 key={key++} className="text-[22px] font-semibold mt-8 mb-2 tracking-[-0.2px]">{inline(l.slice(3), onLink)}</h2>)
    else if (l.startsWith('# ')) out.push(<h1 key={key++} className="text-[28px] font-semibold mt-8 mb-2">{inline(l.slice(2), onLink)}</h1>)
    else if (l.trim()) out.push(<p key={key++} className="text-[16px] leading-[28px] my-2">{inline(l, onLink)}</p>)
    i++
  }
  return <>{out}</>
}

/* ─────────────────────────── App ─────────────────────────── */

const ago = (iso: string) => {
  const h = (Date.now() - +new Date(iso)) / 3600_000
  if (h < 1) return h < 0.05 ? 'just now' : `${Math.round(h * 60)} minutes ago`
  if (h < 24) return `${Math.round(h)} hours ago`
  return `${Math.round(h / 24)} days ago`
}

function Tree({ pages, parent, depth, cur, onOpen, expanded, toggle }: { pages: Page[]; parent: string | null; depth: number; cur: string | null; onOpen: (id: string) => void; expanded: Set<string>; toggle: (id: string) => void }) {
  const kids = pages.filter((p) => p.parentId === parent).sort((a, b) => (a.id === 'pg-releases' ? -1 : b.id === 'pg-releases' ? 1 : a.title.localeCompare(b.title)))
  return (
    <>
      {kids.map((p) => {
        const has = pages.some((x) => x.parentId === p.id)
        const open = expanded.has(p.id)
        return (
          <div key={p.id}>
            <div className={`group h-8 flex items-center rounded-[4px] pr-1 ${cur === p.id ? 'bg-[#E9F2FE] text-[#1868DB]' : 'hover:bg-[#0515240F]'}`} style={{ paddingLeft: 4 + depth * 14 }}>
              <button onClick={() => toggle(p.id)} className={`w-5 h-5 flex items-center justify-center rounded hover:bg-[#0B120E24] ${has ? '' : 'invisible'}`}>{open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}</button>
              <button data-agent={`conf-page-${p.id}`} onClick={() => onOpen(p.id)} className="flex-1 min-w-0 flex items-center gap-1.5 text-[14px] text-left">
                {p.emoji ? <span className="text-[13px]">{p.emoji}</span> : <FileText size={14} className="text-[#505258] shrink-0" />}
                <span className="truncate">{p.title}</span>
                {p.createdBy === 'hworker' && <span className="w-1.5 h-1.5 rounded-full bg-[#430693] shrink-0" />}
              </button>
              <MoreHorizontal size={14} className="opacity-0 group-hover:opacity-100 text-[#505258]" />
            </div>
            {has && open && <Tree pages={pages} parent={p.id} depth={depth + 1} cur={cur} onOpen={onOpen} expanded={expanded} toggle={toggle} />}
          </div>
        )
      })}
    </>
  )
}

export default function Confluence({ win, params }: AppProps) {
  const { isAgent } = useDesk()
  const { setUrl, setTitle } = useWin()
  const pages = useCollection<Page>('confluence.pages')
  const [cur, setCur] = useState<string | null>('pg-home')
  const [mode, setMode] = useState<'view' | 'edit' | 'recent' | 'templates'>('view')
  const [draft, setDraft] = useState<{ id?: string; title: string; body: string; parentId: string | null }>({ title: '', body: '', parentId: null })
  const [menu, setMenu] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['pg-home', 'pg-releases']))
  const page = pages.find((p) => p.id === cur)

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
      setUrl(`https://northwind.atlassian.net/wiki/spaces/OPS/pages/edit-v2/${draft.id ? draft.id.replace(/\D/g, '') || '884736' : '884736'}`)
      setTitle(`${draft.title || 'Untitled'} - Operations - Confluence`)
    } else if (page) {
      setUrl(`https://northwind.atlassian.net/wiki/spaces/OPS/pages/${(Math.abs([...page.id].reduce((a, c) => a * 31 + c.charCodeAt(0), 7)) % 900000) + 100000}/${page.title.replace(/[^a-zA-Z0-9]+/g, '+')}`)
      setTitle(`${page.title} - Operations - Confluence`)
    }
  }, [cur, mode, draft.title])

  const openPage = (id: string) => {
    setCur(id)
    setMode('view')
  }
  const newPage = (parentId: string | null) => {
    setDraft({ title: '', body: '', parentId: parentId ?? 'pg-home' })
    setMode('edit')
    setMenu(false)
  }
  const publish = () => {
    const now = new Date().toISOString()
    if (draft.id) {
      db.update('confluence.pages', draft.id, { title: draft.title, body: draft.body, updated: now })
      openPage(draft.id)
      return
    }
    const id = `pg-${Date.now().toString(36)}`
    db.insert('confluence.pages', { id, space: 'OPS', title: draft.title || 'Untitled', parentId: draft.parentId, body: draft.body, author: ME.id, created: now, updated: now, labels: [], createdBy: isAgent ? 'hworker' : undefined, views: 1 })
    if (draft.parentId) setExpanded((e) => new Set([...e, draft.parentId!]))
    openPage(id)
  }
  const crumbs: Page[] = []
  let p = page
  while (p?.parentId) {
    p = pages.find((x) => x.id === p!.parentId)
    if (p) crumbs.unshift(p)
  }
  const children = page ? pages.filter((x) => x.parentId === page.id) : []

  return (
    <div className="flex-1 min-h-0 flex flex-col relative bg-white text-[#292A2E]" style={{ fontFamily: ATL_FONT }}>
      <TopNav product="confluence" onCreate={() => setMenu((m) => !m)} createAgent="conf-create" />
      {menu && (
        <div className="absolute z-50 top-[52px] left-1/2 translate-x-[160px] w-[300px] bg-white rounded-[8px] shadow-[0_8px_12px_#1E1F2126,0_0_1px_#1E1F214F] py-2">
          {[['conf-create-page', FileText, 'Page', 'Collaborate on rich, structured content', '#1868DB'], ['conf-create-whiteboard', LayoutTemplate, 'Whiteboard', 'Brainstorm and plan visually', '#6A9A23'], ['conf-create-database', Table, 'Database', 'Organize and track information', '#AF59E1'], ['conf-create-live', Sparkles, 'Live doc', 'Write and edit together in real time', '#E06C00']].map(([id, I, l, d, c]: any) => (
            <button key={id} data-agent={id} onClick={() => id === 'conf-create-page' && newPage(cur && page?.id === 'pg-releases' ? 'pg-releases' : cur)} className="w-full flex items-start gap-3 px-4 py-2 hover:bg-[#0515240F] text-left">
              <span className="w-8 h-8 rounded-[6px] flex items-center justify-center text-white" style={{ background: c }}><I size={16} /></span>
              <span><span className="block text-[14px] font-medium">{l}</span><span className="block text-[12px] text-[#505258]">{d}</span></span>
            </button>
          ))}
          <div className="border-t border-[#0B120E24] mt-1 pt-1">
            <button onClick={() => { setMode('templates'); setMenu(false) }} className="w-full text-left px-4 py-2 text-[14px] hover:bg-[#0515240F] flex items-center gap-2"><LayoutTemplate size={15} /> Browse templates</button>
          </div>
        </div>
      )}
      <div className="flex-1 min-h-0 flex">
        {/* sidebar */}
        <div className="w-[280px] shrink-0 border-r border-[#0B120E24] flex flex-col">
          <div className="px-2 pt-3 space-y-0.5">
            <SideItem icon={<Home size={16} />} label="For you" />
            <SideItem icon={<Clock size={16} />} label="Recent" agent="conf-nav-recent" active={mode === 'recent'} onClick={() => setMode('recent')} />
            <SideItem icon={<Star size={16} />} label="Starred" />
            <SideItem icon={<LayoutTemplate size={16} />} label="Templates" agent="conf-nav-templates" active={mode === 'templates'} onClick={() => setMode('templates')} />
            <SideItem icon={<Users size={16} />} label="Teams" />
          </div>
          <div className="mx-3 my-3 h-px bg-[#0B120E24]" />
          <div className="px-3 flex items-center gap-2">
            <span className="w-7 h-7 rounded-[6px] bg-[#FCA700] flex items-center justify-center text-white text-[12px] font-bold">OP</span>
            <div className="flex-1 min-w-0"><div className="text-[14px] font-semibold truncate">Operations</div><div className="text-[12px] text-[#505258]">Team space</div></div>
            <MoreHorizontal size={16} className="text-[#505258]" />
          </div>
          <div className="px-2 mt-2 space-y-0.5">
            <SideItem icon={<BookOpen size={16} />} label="Overview" active={mode === 'view' && cur === 'pg-home'} onClick={() => openPage('pg-home')} />
            <SideItem icon={<MessageSquare size={16} />} label="Blogs" />
            <SideItem icon={<Settings size={16} />} label="Space settings" />
          </div>
          <div className="px-4 mt-3 mb-1 flex items-center justify-between text-[12px] font-semibold text-[#6B6E76]">
            Content
            <span className="flex gap-1"><Search size={14} /><button data-agent="conf-tree-add" onClick={() => newPage('pg-home')} aria-label="Create"><Plus size={14} /></button></span>
          </div>
          <div className="flex-1 min-h-0 overflow-auto px-2 pb-3" data-agent="conf-tree">
            <Tree pages={pages.filter((x) => x.id !== 'pg-home')} parent="pg-home" depth={0} cur={cur} onOpen={openPage} expanded={expanded} toggle={(id) => setExpanded((e) => { const n = new Set(e); if (n.has(id)) n.delete(id); else n.add(id); return n })} />
          </div>
        </div>

        {/* main */}
        {mode === 'edit' ? (
          <div className="flex-1 min-w-0 flex flex-col" data-agent="conf-editor">
            <div className="h-[48px] shrink-0 flex items-center gap-0.5 px-4 border-b border-[#0B120E24] text-[#505258]">
              {[Undo2, Redo2].map((I, n) => <button key={n} className="w-8 h-8 rounded-[4px] hover:bg-[#0515240F] flex items-center justify-center"><I size={16} /></button>)}
              <span className="w-px h-5 bg-[#0B120E24] mx-1" />
              <button className="h-8 px-2 rounded-[4px] hover:bg-[#0515240F] text-[14px] flex items-center gap-1">Normal text <ChevronDown size={14} /></button>
              {[Bold, Italic, Underline, List, ListOrdered, Table, Image, Link2, AtSign, Smile, Info].map((I, n) => <button key={n} className="w-8 h-8 rounded-[4px] hover:bg-[#0515240F] flex items-center justify-center"><I size={16} /></button>)}
              <button className="h-8 px-2 rounded-[4px] hover:bg-[#0515240F] text-[14px] flex items-center gap-1"><Plus size={15} /> <ChevronDown size={14} /></button>
              <div className="flex-1" />
              <span className="text-[13px] mr-2">Draft · saved</span>
              <Avatar id={ME.id} size={26} />
              <button data-agent="conf-close-draft" onClick={() => setMode('view')} className="h-8 px-3 rounded-[4px] hover:bg-[#0515240F] text-[14px] font-medium text-[#292A2E] ml-2">Close draft</button>
              <button data-agent="conf-publish" onClick={publish} className="h-8 px-3 rounded-[4px] bg-[#1868DB] hover:bg-[#1558BC] text-white text-[14px] font-medium">{draft.id ? 'Update' : 'Publish'}</button>
              <button className="w-8 h-8 rounded-[4px] hover:bg-[#0515240F] flex items-center justify-center"><MoreHorizontal size={16} /></button>
            </div>
            <div className="flex-1 min-h-0 overflow-auto">
              <div className="max-w-[760px] mx-auto px-6 pt-10 pb-20 flex flex-col">
                <div className="text-[13px] text-[#505258] mb-3 flex items-center gap-1"><span>Operations</span><ChevronRight size={12} /><span>{pages.find((x) => x.id === draft.parentId)?.title}</span></div>
                <input data-agent="conf-title" aria-label="Page title" value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} placeholder="Give this page a title" className="text-[32px] font-semibold outline-none placeholder:text-[#B7B9BE] mb-4" />
                <textarea data-agent="conf-body" aria-label="Page content" value={draft.body} onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))} placeholder="Type / to insert elements, or use markdown: ## heading, | table |, - list, :::info panel" className="min-h-[460px] text-[16px] leading-[28px] outline-none resize-none placeholder:text-[#B7B9BE]" />
              </div>
            </div>
          </div>
        ) : mode === 'recent' || mode === 'templates' ? (
          <div className="flex-1 min-w-0 overflow-auto px-10 py-8">
            <h1 className="text-[24px] font-semibold mb-5">{mode === 'recent' ? 'Recent' : 'Templates'}</h1>
            {mode === 'recent' ? (
              <div className="divide-y divide-[#0B120E14] border-y border-[#0B120E14]">
                {[...pages].sort((a, b) => +new Date(b.updated) - +new Date(a.updated)).map((x) => (
                  <button key={x.id} onClick={() => openPage(x.id)} className="w-full flex items-center gap-3 py-2.5 text-left hover:bg-[#F8F8F8] px-2">
                    <FileText size={16} className="text-[#1868DB]" />
                    <span className="flex-1 text-[14px] font-medium">{x.title}</span>
                    <span className="text-[13px] text-[#505258] w-[120px]">Operations</span>
                    <span className="text-[13px] text-[#505258] w-[140px]">Visited {ago(x.updated)}</span>
                    <Avatar id={x.author} size={22} />
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {[['Release notes', 'Share product updates with your team', '#1868DB'], ['Meeting notes', 'Agenda, notes and action items', '#6A9A23'], ['Retrospective', 'Reflect on what went well', '#AF59E1'], ['How-to article', 'Step-by-step instructions', '#E06C00'], ['Incident postmortem', 'Learn from incidents', '#C9372C'], ['Project plan', 'Goals, scope and milestones', '#FCA700']].map(([t, d, c]) => (
                  <button key={t} onClick={() => { setDraft({ title: t === 'Release notes' ? 'Release notes — ' : '', body: '', parentId: t === 'Release notes' ? 'pg-releases' : 'pg-home' }); setMode('edit') }} className="text-left rounded-[8px] border border-[#0B120E24] overflow-hidden hover:shadow-md">
                    <div className="h-24" style={{ background: `${c}22` }}><div className="m-4 h-16 rounded bg-white shadow-sm p-2 space-y-1.5"><div className="h-2 w-1/2 rounded" style={{ background: c }} /><div className="h-1.5 w-4/5 rounded bg-[#DDDEE1]" /><div className="h-1.5 w-3/5 rounded bg-[#DDDEE1]" /></div></div>
                    <div className="p-3"><div className="text-[14px] font-semibold">{t}</div><div className="text-[13px] text-[#505258]">{d}</div></div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : page ? (
          <div className="flex-1 min-w-0 flex flex-col">
            <div className="h-[48px] shrink-0 flex items-center px-6 gap-1 text-[14px] text-[#505258]">
              <span>Operations</span>
              {crumbs.filter((c) => c.id !== 'pg-home').map((c) => <span key={c.id} className="flex items-center gap-1"><ChevronRight size={13} /><button onClick={() => openPage(c.id)} className="hover:underline">{c.title}</button></span>)}
              <div className="flex-1" />
              <button data-agent="conf-edit" aria-label="Edit" onClick={() => { setDraft({ id: page.id, title: page.title, body: page.body, parentId: page.parentId }); setMode('edit') }} className="w-8 h-8 rounded-[4px] hover:bg-[#0515240F] flex items-center justify-center"><Pencil size={16} /></button>
              {[Star, Eye].map((I, n) => <button key={n} className="w-8 h-8 rounded-[4px] hover:bg-[#0515240F] flex items-center justify-center"><I size={16} /></button>)}
              <button className="h-8 px-3 rounded-[4px] bg-[#0515240F] text-[14px] font-medium text-[#292A2E] flex items-center gap-1.5 mx-1"><Share2 size={14} /> Share</button>
              <button className="w-8 h-8 rounded-[4px] hover:bg-[#0515240F] flex items-center justify-center"><Link2 size={16} /></button>
              <button className="w-8 h-8 rounded-[4px] hover:bg-[#0515240F] flex items-center justify-center"><MoreHorizontal size={16} /></button>
            </div>
            <div className="flex-1 min-h-0 overflow-auto" data-agent="conf-page-view">
              <div className={`max-w-[760px] mx-auto px-6 pt-6 pb-24 ${page.createdBy === 'hworker' && Date.now() - +new Date(page.created) < 90000 ? 'flash-new' : ''}`}>
                {page.emoji && <div className="text-[40px] mb-2">{page.emoji}</div>}
                <h1 className="text-[32px] font-semibold leading-tight tracking-[-0.3px]" data-agent="conf-page-title">{page.title}</h1>
                <div className="flex items-center gap-2 mt-3 mb-6 text-[13px] text-[#505258]">
                  <Avatar id={page.author} size={24} />
                  <span>Owned by <span className="text-[#292A2E]">{person(page.author).name}</span></span>
                  <span>·</span>
                  <span>Last updated {ago(page.updated)}</span>
                  <span>·</span>
                  <span>{Math.max(1, Math.round(page.body.split(/\s+/).length / 200))} min read</span>
                  <span>·</span>
                  <span className="flex items-center gap-1"><Eye size={13} />{page.views ?? 1}</span>
                  {page.createdBy === 'hworker' && <HWBadge />}
                </div>
                <Markup body={page.body} onLink={(id) => pages.some((x) => x.id === id) && openPage(id)} />
                {children.length > 0 && page.id !== 'pg-home' && (
                  <div className="mt-8">
                    <div className="text-[13px] font-semibold text-[#505258] mb-2">Child pages</div>
                    {children.map((c) => <button key={c.id} onClick={() => openPage(c.id)} className="flex items-center gap-2 text-[14px] text-[#1868DB] hover:underline py-0.5"><FileText size={14} />{c.title}</button>)}
                  </div>
                )}
                {!!page.labels?.length && <div className="flex gap-1 mt-8">{page.labels.map((l) => <span key={l} className="h-6 px-2 rounded-[3px] bg-[#0515240F] text-[12px] flex items-center text-[#505258]">{l}</span>)}</div>}
                <div className="mt-10 border-t border-[#0B120E24] pt-5 flex items-center gap-4 text-[14px] text-[#505258]">
                  <span className="flex items-center gap-1.5">👍 Like</span>
                  <span>Be the first to like this</span>
                </div>
                <div className="flex gap-3 mt-5"><Avatar id={ME.id} size={32} /><div className="flex-1 h-9 rounded-[4px] border border-[#8C8F97] px-3 flex items-center text-[14px] text-[#6B6E76]">Add a comment…</div></div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[#505258]">Page not found<X size={14} /></div>
        )}
      </div>
    </div>
  )
}
