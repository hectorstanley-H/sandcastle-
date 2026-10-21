import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  Bell,
  Bookmark,
  ChevronDown,
  ChevronUp,
  CircleQuestionMark,
  Combine,
  Ellipsis,
  FileOutput,
  FilePen,
  FilePlus,
  Files,
  FileText,
  Highlighter,
  House,
  Layers,
  LayoutGrid,
  Menu as MenuIcon,
  MessageSquare,
  MousePointer2,
  Paperclip,
  Pencil,
  PenLine,
  Printer,
  ScanLine,
  Search,
  Share2,
  Shield,
  Signature,
  Sparkles,
  Star,
  StickyNote,
  Trash,
  Type,
  X,
  ZoomIn,
  ZoomOut,
  Clock,
} from 'lucide-react'
import type { AppProps } from '@/os/registry'
import { logoUrl } from '@/os/registry'
import { WindowControls } from '@/os/Window'
import { useDesk, useWin } from '@/os/context'
import { db, uid, useCollection } from '@/db/db'
import { ME } from '@/data/people'
import { Avatar } from '@/components/Avatar'
import { relative } from '@/data/time'
import { AnnoCtx, getDoc, DOCS } from './docs'

const ZOOMS = [50, 66, 75, 85, 100, 125, 150, 200]
const RED = '#EB1000'

type Tool = 'select' | 'comment' | 'highlight' | 'draw' | 'text' | 'sign'

const keyOf = (p: any) => (p?.doc ? String(p.doc) : p?.file ? `file:${p.file}` : null)
const docOf = (key: string) => (key.startsWith('file:') ? getDoc(key, key.slice(5)) : getDoc(key))

export default function Acrobat({ win, params }: AppProps) {
  const { isAgent } = useDesk()
  const { setTitle } = useWin()
  const [tabs, setTabs] = useState<string[]>(() => {
    const k = keyOf(params)
    return k ? [k] : []
  })
  const [active, setActive] = useState<string>(() => keyOf(params) ?? 'home')

  useEffect(() => {
    const k = keyOf(params)
    if (!k) return
    setTabs((t) => (t.includes(k) ? t : [...t, k]))
    setActive(k)
  }, [win.nonce])

  useEffect(() => {
    setTitle(active === 'home' ? 'Adobe Acrobat' : active === 'tools' ? 'All tools - Adobe Acrobat' : `${docOf(active).name} - Adobe Acrobat`)
  }, [active])

  const openDoc = (k: string) => {
    setTabs((t) => (t.includes(k) ? t : [...t, k]))
    setActive(k)
  }
  const closeDoc = (k: string) => {
    const rest = tabs.filter((t) => t !== k)
    setTabs(rest)
    if (active === k) setActive(rest[rest.length - 1] ?? 'home')
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[#F8F8F8] text-[#222]" style={{ fontFamily: '"Adobe Clean", "Source Sans 3", "Segoe UI", system-ui, sans-serif' }}>
      {/* top bar */}
      <div data-drag-handle className="h-[44px] shrink-0 flex items-end bg-[#2C2C2C] text-white pl-2">
        <div className="h-full flex items-center gap-1 pr-2">
          <button aria-label="Menu" className="h-8 px-2 rounded flex items-center gap-1.5 text-[13px] hover:bg-white/10">
            <MenuIcon size={16} /> Menu
          </button>
          <img src={logoUrl('acrobat')} className="w-6 h-6 mx-1.5" alt="Adobe Acrobat" />
        </div>
        {[
          ['home', 'Home'],
          ['tools', 'All tools'],
        ].map(([k, l]) => (
          <button
            key={k}
            data-agent={`acrobat-tab-${k}`}
            onClick={() => setActive(k)}
            className={`h-[36px] px-4 rounded-t-[6px] text-[13px] font-semibold ${active === k ? 'bg-[#F8F8F8] text-[#222]' : 'text-[#E0E0E0] hover:bg-white/10'}`}
          >
            {l}
          </button>
        ))}
        {tabs.map((k) => {
          const d = docOf(k)
          const on = active === k
          return (
            <div
              key={k}
              data-agent={`acrobat-doctab-${k}`}
              onClick={() => setActive(k)}
              className={`group h-[36px] ml-1 w-[220px] pl-3 pr-1 rounded-t-[6px] flex items-center gap-2 text-[13px] cursor-default ${on ? 'bg-[#F8F8F8] text-[#222]' : 'text-[#E0E0E0] hover:bg-white/10'}`}
            >
              <FileText size={15} className="shrink-0" style={{ color: on ? RED : '#ff8a80' }} />
              <span className="flex-1 truncate">{d.name}</span>
              <button
                data-agent={on ? 'acrobat-close' : `acrobat-close-${k}`}
                aria-label={`Close ${d.name}`}
                onClick={(e) => {
                  e.stopPropagation()
                  closeDoc(k)
                }}
                className={`w-6 h-6 rounded flex items-center justify-center ${on ? 'hover:bg-black/10' : 'hover:bg-white/15'}`}
              >
                <X size={14} />
              </button>
            </div>
          )
        })}
        <button aria-label="Open file" onClick={() => setActive('home')} className="h-8 w-8 mb-0.5 ml-1 rounded flex items-center justify-center hover:bg-white/10 text-[#E0E0E0]">
          <FilePlus size={16} />
        </button>
        <div className="flex-1 h-full" />
        <div className="h-full flex items-center gap-1 pr-2" data-no-drag>
          <button aria-label="Help" className="w-8 h-8 rounded flex items-center justify-center hover:bg-white/10"><CircleQuestionMark size={17} /></button>
          <button aria-label="Notifications" className="relative w-8 h-8 rounded flex items-center justify-center hover:bg-white/10">
            <Bell size={17} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#2680EB]" />
          </button>
          <button aria-label="Account" className="ml-1"><Avatar id={ME.id} size={26} /></button>
        </div>
        <WindowControls dark height={44} />
      </div>

      {active === 'home' && <HomeView openDoc={openDoc} />}
      {active === 'tools' && <ToolsView />}
      {tabs.map((k) => (
        <div key={k} className={active === k ? 'flex-1 min-h-0 flex flex-col' : 'hidden'}>
          {active === k && <DocView docKey={k} isAgent={isAgent} />}
        </div>
      ))}
    </div>
  )
}

/* ───────────────────────── document view ───────────────────────── */

function DocView({ docKey, isAgent }: { docKey: string; isAgent: boolean }) {
  const doc = docOf(docKey)
  const allAnno = useCollection('acrobat.annotations')
  const annos = useMemo(() => allAnno.filter((a) => a.doc === doc.id), [allAnno, doc.id])
  const [zoom, setZoom] = useState(100)
  const [tool, setTool] = useState<Tool>('select')
  const [panel, setPanel] = useState<'comments' | null>(() => (annos.some((a) => a.kind === 'note') ? 'comments' : null))
  const [thumbs, setThumbs] = useState(true)
  const [page, setPage] = useState(1)
  const [pending, setPending] = useState<null | { field?: string; page: number; x?: number; y?: number }>(null)
  const [text, setText] = useState('')
  const [starred, setStarred] = useState(false)
  const canvas = useRef<HTMLDivElement>(null)
  const z = zoom / 100

  // fit width on open
  useLayoutEffect(() => {
    const w = canvas.current?.clientWidth ?? 900
    const fit = Math.floor(((w - 120) / 816) * 100)
    setZoom(ZOOMS.filter((x) => x <= Math.max(50, fit)).pop() ?? 75)
  }, [docKey])

  const highlights = useMemo(() => new Set(annos.filter((a) => a.kind === 'highlight' && a.field).map((a) => a.field as string)), [annos])
  const notes = useMemo(() => {
    const m: Record<string, number> = {}
    annos.filter((a) => a.kind === 'note' && a.field).forEach((a) => (m[a.field] = (m[a.field] ?? 0) + 1))
    return m
  }, [annos])

  const pageOfEl = (el: HTMLElement) => Number((el.closest('[data-page]') as HTMLElement | null)?.dataset.page ?? 1)

  const onField = (k: string, e: React.MouseEvent) => {
    if (tool === 'select') return
    e.stopPropagation()
    const pg = pageOfEl(e.currentTarget as HTMLElement)
    if (tool === 'highlight') {
      if (db.get('acrobat.annotations').some((a) => a.doc === doc.id && a.kind === 'highlight' && a.field === k)) return
      db.insert('acrobat.annotations', { id: uid('an'), doc: doc.id, kind: 'highlight', field: k, page: pg, author: ME.name, date: new Date().toISOString(), createdBy: isAgent ? 'hworker' : undefined })
    } else if (tool === 'comment') {
      setPending({ field: k, page: pg })
      setText('')
      setPanel('comments')
    }
  }

  const onPageClick = (n: number, e: React.MouseEvent<HTMLDivElement>) => {
    if (tool !== 'comment') return
    const r = e.currentTarget.getBoundingClientRect()
    const scale = r.width / e.currentTarget.offsetWidth || 1
    const x = (e.clientX - r.left) / scale / z
    const y = (e.clientY - r.top) / scale / z
    setPending({ page: n, x, y })
    setText('')
    setPanel('comments')
  }

  const post = () => {
    if (!pending || !text.trim()) return
    db.insert('acrobat.annotations', { id: uid('an'), doc: doc.id, kind: 'note', ...pending, text: text.trim(), author: ME.name, date: new Date().toISOString(), createdBy: isAgent ? 'hworker' : undefined })
    setPending(null)
    setText('')
    setTool('select')
  }

  const onScroll = () => {
    const c = canvas.current
    if (!c) return
    const pages = Array.from(c.querySelectorAll<HTMLElement>('[data-page]'))
    const mid = c.scrollTop + c.clientHeight / 3
    let cur = 1
    for (const p of pages) if (p.offsetTop <= mid) cur = Number(p.dataset.page)
    setPage(cur)
  }
  const goPage = (n: number) => {
    const el = canvas.current?.querySelector<HTMLElement>(`[data-page="${n}"]`)
    if (el && canvas.current) canvas.current.scrollTo({ top: el.offsetTop - 24, behavior: 'smooth' })
    setPage(n)
  }
  const zoomBy = (dir: 1 | -1) => {
    const i = ZOOMS.findIndex((x) => x >= zoom)
    const next = ZOOMS[Math.max(0, Math.min(ZOOMS.length - 1, (i < 0 ? ZOOMS.length - 1 : i) + dir))]
    setZoom(next === zoom ? ZOOMS[Math.max(0, Math.min(ZOOMS.length - 1, ZOOMS.indexOf(zoom) + dir))] : next)
  }

  const rail: [string, any, string, () => void][] = [
    ['edit', FilePen, 'Edit', () => {}],
    ['convert', FileOutput, 'Convert', () => {}],
    ['esign', Signature, 'E-Sign', () => {}],
    ['comment', MessageSquare, 'Comment', () => { setPanel(panel === 'comments' ? null : 'comments'); setTool('comment') }],
    ['combine', Combine, 'Combine', () => {}],
    ['organize', Layers, 'Organize', () => {}],
    ['scan', ScanLine, 'Scan & OCR', () => {}],
    ['protect', Shield, 'Protect', () => {}],
    ['more', Ellipsis, 'More', () => {}],
  ]
  const quick: [Tool, any, string][] = [
    ['select', MousePointer2, 'Select'],
    ['comment', StickyNote, 'Add a comment'],
    ['highlight', Highlighter, 'Highlight text'],
    ['draw', Pencil, 'Draw'],
    ['text', Type, 'Add text'],
    ['sign', PenLine, 'Fill & Sign'],
  ]
  const noteList = annos.filter((a) => a.kind === 'note').sort((a, b) => (a.date < b.date ? 1 : -1))

  return (
    <AnnoCtx.Provider value={{ highlights, notes, tool, onField }}>
      {/* doc toolbar */}
      <div className="h-[48px] shrink-0 flex items-center gap-2 px-3 bg-[#F8F8F8] border-b border-[#E1E1E1]">
        <button aria-label="Toggle page thumbnails" onClick={() => setThumbs(!thumbs)} className={`w-8 h-8 rounded flex items-center justify-center ${thumbs ? 'bg-[#E5E5E5]' : 'hover:bg-[#EAEAEA]'}`}>
          <Files size={17} />
        </button>
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[14px] font-semibold truncate max-w-[340px]" data-agent="acrobat-doc-name">{doc.name}</span>
          <button aria-label="Star" onClick={() => setStarred(!starred)} className="w-7 h-7 rounded flex items-center justify-center hover:bg-[#EAEAEA]">
            <Star size={15} fill={starred ? '#F5A623' : 'none'} color={starred ? '#F5A623' : '#555'} />
          </button>
          <span className="text-[12px] text-[#6E6E6E]">{doc.size} · {doc.pages.length} page{doc.pages.length > 1 ? 's' : ''}</span>
        </div>
        <div className="flex-1" />
        <button className="h-8 px-3 rounded-full text-[13px] font-semibold text-white flex items-center gap-1.5 shadow-sm" style={{ background: 'linear-gradient(90deg,#5C2EE6,#C2185B 60%,#EB1000)' }} aria-label="AI Assistant">
          <Sparkles size={15} /> AI Assistant
        </button>
        <button aria-label="Find text" className="w-8 h-8 rounded flex items-center justify-center hover:bg-[#EAEAEA]"><Search size={17} /></button>
        <button aria-label="Print" className="w-8 h-8 rounded flex items-center justify-center hover:bg-[#EAEAEA]"><Printer size={17} /></button>
        <button aria-label="Share" className="h-8 px-4 rounded-full bg-[#1473E6] hover:bg-[#0D66D0] text-white text-[13px] font-semibold flex items-center gap-1.5">
          <Share2 size={14} /> Share
        </button>
      </div>
      <div className="flex-1 min-h-0 flex">
        {/* tools rail */}
        <div className="w-[76px] shrink-0 bg-[#F8F8F8] border-r border-[#E1E1E1] py-2 flex flex-col items-center gap-0.5 overflow-y-auto">
          {rail.map(([id, I, l, fn]) => {
            const on = id === 'comment' && panel === 'comments'
            return (
              <button key={id} data-agent={`acrobat-rail-${id}`} aria-label={l} onClick={fn} className={`w-[64px] py-2 rounded-lg flex flex-col items-center gap-1 text-[11px] ${on ? 'bg-[#E4EEFC] text-[#1473E6]' : 'text-[#333] hover:bg-[#EAEAEA]'}`}>
                <I size={20} strokeWidth={1.6} />
                <span className="leading-tight text-center">{l}</span>
              </button>
            )
          })}
        </div>
        {/* thumbnails */}
        {thumbs && (
          <div className="w-[176px] shrink-0 bg-[#F0F0F0] border-r border-[#E1E1E1] overflow-y-auto py-4 flex flex-col items-center gap-4">
            {doc.pages.map((P, i) => (
              <button key={i} data-agent={`acrobat-thumb-${i + 1}`} aria-label={`Page ${i + 1}`} onClick={() => goPage(i + 1)} className="flex flex-col items-center gap-1.5">
                <div className={`w-[122px] h-[158px] overflow-hidden bg-white shadow-[0_1px_3px_rgba(0,0,0,0.25)] ${page === i + 1 ? 'outline outline-[3px] outline-[#1473E6] outline-offset-2' : ''}`}>
                  <div className="origin-top-left pointer-events-none" style={{ transform: 'scale(0.1495)' }}>
                    {P()}
                  </div>
                </div>
                <span className={`text-[12px] ${page === i + 1 ? 'text-[#1473E6] font-semibold' : 'text-[#555]'}`}>{i + 1}</span>
              </button>
            ))}
          </div>
        )}
        {/* canvas */}
        <div className="relative flex-1 min-w-0 bg-[#E8E8E8]">
          <div ref={canvas} onScroll={onScroll} className="absolute inset-0 overflow-auto" data-agent="acrobat-canvas">
            <div className="flex flex-col items-center gap-5 py-6 px-16 min-w-max">
              {doc.pages.map((P, i) => (
                <div
                  key={i}
                  data-page={i + 1}
                  data-agent={`acrobat-page-${i + 1}`}
                  aria-label={`Page ${i + 1}`}
                  onClick={(e) => onPageClick(i + 1, e)}
                  className={`relative shadow-[0_2px_8px_rgba(0,0,0,0.22)] bg-white ${tool === 'comment' ? 'cursor-crosshair' : ''}`}
                  style={{ width: 816 * z, height: 1056 * z }}
                >
                  <div className="absolute left-0 top-0 origin-top-left" style={{ transform: `scale(${z})` }}>
                    {P()}
                  </div>
                  {/* free-placed sticky notes */}
                  {[...annos.filter((a) => a.kind === 'note' && !a.field && a.page === i + 1), ...(pending && !pending.field && pending.page === i + 1 ? [{ id: 'pending', x: pending.x, y: pending.y }] : [])].map((a: any) => (
                    <span key={a.id} className="absolute w-6 h-6 rounded-[3px] bg-[#FFD02B] border border-[#C9A100] shadow flex items-center justify-center" style={{ left: a.x * z - 12, top: a.y * z - 12 }}>
                      <svg width="14" height="14" viewBox="0 0 16 16"><path d="M2 2h12v9H7l-3 3v-3H2z" fill="#fff" stroke="#6B5300" /></svg>
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
          {/* quick tools */}
          <div className="absolute left-4 top-6 z-10 flex flex-col gap-0.5 p-1 rounded-xl bg-white shadow-[0_2px_10px_rgba(0,0,0,0.18)]">
            {quick.map(([id, I, l]) => (
              <button
                key={id}
                data-agent={`acrobat-tool-${id}`}
                aria-label={l}
                title={l}
                onClick={() => {
                  setTool(id)
                  if (id === 'comment') setPanel('comments')
                }}
                className={`w-9 h-9 rounded-lg flex items-center justify-center ${tool === id ? 'bg-[#E4EEFC] text-[#1473E6]' : 'text-[#333] hover:bg-[#F0F0F0]'}`}
              >
                <I size={18} strokeWidth={1.7} />
              </button>
            ))}
          </div>
          {tool !== 'select' && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 h-9 pl-4 pr-1 rounded-full bg-[#2C2C2C] text-white text-[12.5px] flex items-center gap-3 shadow-lg">
              {tool === 'highlight' ? 'Highlight: click text on the page to highlight it' : tool === 'comment' ? 'Add a comment: click anywhere on the page' : 'Tool selected'}
              <button onClick={() => setTool('select')} className="h-7 px-3 rounded-full hover:bg-white/15 font-semibold">Done</button>
            </div>
          )}
          {/* page nav + zoom */}
          <div className="absolute right-4 bottom-5 z-10 flex flex-col items-center gap-1 p-1 rounded-xl bg-white shadow-[0_2px_10px_rgba(0,0,0,0.18)] text-[12px]">
            <button aria-label="Previous page" onClick={() => goPage(Math.max(1, page - 1))} className="w-8 h-8 rounded-lg hover:bg-[#F0F0F0] flex items-center justify-center"><ChevronUp size={16} /></button>
            <div className="w-10 text-center leading-tight" data-agent="acrobat-page-indicator">
              <div className="font-semibold">{page}</div>
              <div className="text-[#777]">{doc.pages.length}</div>
            </div>
            <button aria-label="Next page" onClick={() => goPage(Math.min(doc.pages.length, page + 1))} className="w-8 h-8 rounded-lg hover:bg-[#F0F0F0] flex items-center justify-center"><ChevronDown size={16} /></button>
            <div className="w-6 h-px bg-[#E1E1E1] my-1" />
            <button data-agent="acrobat-zoom-in" aria-label="Zoom in" onClick={() => zoomBy(1)} className="w-8 h-8 rounded-lg hover:bg-[#F0F0F0] flex items-center justify-center"><ZoomIn size={16} /></button>
            <div data-agent="acrobat-zoom-value" className="text-[11px] font-semibold">{zoom}%</div>
            <button data-agent="acrobat-zoom-out" aria-label="Zoom out" onClick={() => zoomBy(-1)} className="w-8 h-8 rounded-lg hover:bg-[#F0F0F0] flex items-center justify-center"><ZoomOut size={16} /></button>
          </div>
        </div>
        {/* comments panel */}
        {panel === 'comments' && (
          <div className="w-[320px] shrink-0 bg-white border-l border-[#E1E1E1] flex flex-col" data-agent="acrobat-comments-panel">
            <div className="h-12 flex items-center px-4 border-b border-[#EBEBEB]">
              <span className="text-[15px] font-semibold flex-1">Comments</span>
              <span className="text-[12px] text-[#6E6E6E] mr-2">{noteList.length}</span>
              <button aria-label="Close comments" onClick={() => setPanel(null)} className="w-7 h-7 rounded hover:bg-[#F0F0F0] flex items-center justify-center"><X size={15} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {pending && (
                <div className="rounded-lg border-2 border-[#1473E6] p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar id={ME.id} size={26} />
                    <div className="text-[13px] font-semibold">{ME.name}</div>
                  </div>
                  <textarea
                    autoFocus
                    data-agent="acrobat-comment-input"
                    aria-label="Add a comment"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Add a comment…"
                    rows={4}
                    className="w-full resize-none outline-none text-[13px] border border-[#D5D5D5] rounded p-2 focus:border-[#1473E6]"
                  />
                  <div className="flex justify-end gap-2 mt-2">
                    <button onClick={() => setPending(null)} className="h-8 px-3 rounded-full text-[13px] font-semibold hover:bg-[#F0F0F0]">Cancel</button>
                    <button data-agent="acrobat-comment-post" onClick={post} disabled={!text.trim()} className="h-8 px-4 rounded-full bg-[#1473E6] text-white text-[13px] font-semibold disabled:opacity-40">Post</button>
                  </div>
                </div>
              )}
              {noteList.length === 0 && !pending && (
                <div className="text-center text-[13px] text-[#6E6E6E] pt-10">
                  <MessageSquare className="mx-auto mb-2 text-[#B0B0B0]" size={32} />
                  No comments yet.<br />Select <b>Add a comment</b> to start.
                </div>
              )}
              {noteList.map((a) => (
                <div key={a.id} data-agent={`acrobat-comment-${a.id}`} className={`rounded-lg border border-[#E1E1E1] p-3 ${a.createdBy === 'hworker' ? 'flash-new' : ''}`}>
                  <div className="flex items-center gap-2">
                    <Avatar name={a.author} size={26} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-semibold truncate">{a.author}</div>
                      <div className="text-[11.5px] text-[#6E6E6E] flex items-center gap-1"><Clock size={11} /> {relative(a.date)} · Page {a.page}</div>
                    </div>
                    {a.createdBy === 'hworker' && (
                      <span className="inline-flex items-center gap-1 h-5 pl-0.5 pr-2 rounded-full text-[10.5px] font-semibold text-white" style={{ background: '#430693', fontFamily: 'var(--font-brand)' }}>
                        <img src={logoUrl('hworker')} className="w-4 h-4 rounded-full" alt="" /> H-Worker
                      </span>
                    )}
                    <button aria-label="Delete comment" onClick={() => db.remove('acrobat.annotations', a.id)} className="w-6 h-6 rounded hover:bg-[#F0F0F0] flex items-center justify-center text-[#777]"><Trash size={13} /></button>
                  </div>
                  <div className="text-[13px] mt-2 whitespace-pre-wrap leading-snug">{a.text}</div>
                  <div className="mt-2 text-[12px] text-[#1473E6] font-semibold">Reply</div>
                </div>
              ))}
              {annos.filter((a) => a.kind === 'highlight').length > 0 && (
                <div className="text-[12px] text-[#6E6E6E] px-1 flex items-center gap-1.5">
                  <Highlighter size={13} /> {annos.filter((a) => a.kind === 'highlight').length} highlight{annos.filter((a) => a.kind === 'highlight').length > 1 ? 's' : ''} on this document
                </div>
              )}
            </div>
          </div>
        )}
        {/* right mini rail */}
        <div className="w-[48px] shrink-0 bg-[#F8F8F8] border-l border-[#E1E1E1] py-2 flex flex-col items-center gap-1">
          {[
            [MessageSquare, 'Comments', () => setPanel(panel === 'comments' ? null : 'comments'), 'acrobat-panel-comments'],
            [Bookmark, 'Bookmarks', () => {}, undefined],
            [LayoutGrid, 'Page thumbnails', () => setThumbs(!thumbs), undefined],
            [Paperclip, 'Attachments', () => {}, undefined],
          ].map(([I, l, fn, ag]: any) => (
            <button key={l} data-agent={ag} aria-label={l} title={l} onClick={fn} className={`w-9 h-9 rounded-lg flex items-center justify-center ${l === 'Comments' && panel ? 'bg-[#E4EEFC] text-[#1473E6]' : 'text-[#444] hover:bg-[#EAEAEA]'}`}>
              <I size={18} strokeWidth={1.6} />
            </button>
          ))}
        </div>
      </div>
    </AnnoCtx.Provider>
  )
}

/* ───────────────────────── home ───────────────────────── */

function HomeView({ openDoc }: { openDoc: (k: string) => void }) {
  const files = useCollection('files')
  const pdfs = files
    .filter((f) => f.kind === 'pdf' && f.open?.params?.doc)
    .sort((a, b) => (a.modified < b.modified ? 1 : -1))
  const seen = new Set<string>()
  const recent = pdfs.filter((f) => (seen.has(f.open.params.doc) ? false : (seen.add(f.open.params.doc), true)))
  const extra = Object.values(DOCS).filter((d) => !seen.has(d.id))
  const recos: [any, string, string, string][] = [
    [FilePen, 'Edit text & images', 'Fix a typo or add an image.', '#E34850'],
    [Signature, 'Request e-signatures', 'Send a document to anyone to e-sign online fast.', '#B5339E'],
    [Combine, 'Combine files', 'Merge multiple files into a single PDF.', '#6E49CB'],
    [FileOutput, 'Export a PDF', 'Convert to Word, Excel, PowerPoint and more.', '#2D9D78'],
    [PenLine, 'Fill & Sign', 'Complete forms and add your signature.', '#1473E6'],
  ]
  return (
    <div className="flex-1 min-h-0 flex">
      <div className="w-[220px] shrink-0 border-r border-[#E1E1E1] py-3 px-2 text-[13px] bg-[#F8F8F8]">
        {[
          [House, 'Home', true],
          [Star, 'Starred'],
          [Signature, 'Agreements'],
          [ScanLine, 'Scans'],
          [Share2, 'Shared by you'],
          [Files, 'Shared with you'],
        ].map(([I, l, on]: any) => (
          <div key={l} className={`h-9 px-3 rounded-lg flex items-center gap-3 ${on ? 'bg-[#E4E4E4] font-semibold' : 'hover:bg-[#EDEDED]'}`}>
            <I size={17} /> {l}
          </div>
        ))}
        <div className="px-3 mt-5 mb-1 text-[11.5px] font-semibold text-[#6E6E6E] uppercase tracking-wide">Files</div>
        {['Your files', 'Your computer', 'OneDrive - Northwind Global', 'SharePoint'].map((l) => (
          <div key={l} className="h-9 px-3 rounded-lg flex items-center gap-3 hover:bg-[#EDEDED] truncate">{l}</div>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto px-10 py-8 bg-white">
        <div className="text-[26px] font-bold">Welcome to Acrobat, {ME.first}</div>
        <div className="mt-6 text-[15px] font-semibold">Recommended tools for you</div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3 mt-3">
          {recos.map(([I, t, s, c]) => (
            <div key={t} className="rounded-xl border border-[#E1E1E1] p-4 hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white" style={{ background: c }}>
                <I size={20} />
              </div>
              <div className="mt-3 text-[14px] font-semibold">{t}</div>
              <div className="text-[12.5px] text-[#6E6E6E] mt-1">{s}</div>
              <button className="mt-3 h-8 px-4 rounded-full border-2 border-[#4B4B4B] text-[12.5px] font-semibold hover:bg-[#F3F3F3]">Use now</button>
            </div>
          ))}
        </div>
        <div className="flex items-center mt-8">
          <div className="text-[15px] font-semibold flex-1">Recent</div>
          <span className="text-[12.5px] text-[#6E6E6E]">{recent.length + extra.length} files</span>
        </div>
        <div className="mt-2 text-[13px]">
          <div className="flex h-9 items-center border-b border-[#E1E1E1] text-[12px] text-[#6E6E6E] font-semibold">
            <div className="flex-1 pl-2">NAME</div>
            <div className="w-[140px]">SHARING</div>
            <div className="w-[160px]">OPENED</div>
            <div className="w-[90px] text-right pr-3">SIZE</div>
          </div>
          {[...recent.map((f) => ({ k: f.open.params.doc, name: f.name, when: f.modified, size: f.size })), ...extra.map((d, i) => ({ k: d.id, name: d.name, when: new Date(Date.now() - (i + 3) * 86400000 * 2).toISOString(), size: d.size }))].map((r) => (
            <div key={r.k + r.name} data-agent={`acrobat-recent-${r.k}`} role="row" onClick={() => openDoc(r.k)} className="flex h-12 items-center border-b border-[#F0F0F0] hover:bg-[#F5F5F5] cursor-default">
              <div className="flex-1 min-w-0 flex items-center gap-3 pl-2">
                <span className="w-8 h-10 rounded-sm border border-[#DADADA] bg-white flex items-center justify-center">
                  <FileText size={16} color={RED} />
                </span>
                <div className="min-w-0">
                  <div className="truncate">{r.name}</div>
                  <div className="text-[11.5px] text-[#6E6E6E]">PDF</div>
                </div>
              </div>
              <div className="w-[140px] text-[#6E6E6E]">Only you</div>
              <div className="w-[160px] text-[#6E6E6E]">{relative(r.when)}</div>
              <div className="w-[90px] text-right pr-3 text-[#6E6E6E]">{r.size}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ───────────────────────── all tools ───────────────────────── */

function ToolsView() {
  const tools: [any, string, string][] = [
    [FilePlus, 'Create a PDF', '#E34850'],
    [Combine, 'Combine files', '#6E49CB'],
    [FilePen, 'Edit a PDF', '#E34850'],
    [FileOutput, 'Export a PDF', '#2D9D78'],
    [Layers, 'Organize pages', '#2D9D78'],
    [ScanLine, 'Scan & OCR', '#1473E6'],
    [Shield, 'Protect a PDF', '#6E49CB'],
    [Type, 'Redact a PDF', '#B5339E'],
    [Files, 'Compress a PDF', '#E34850'],
    [PenLine, 'Fill & Sign', '#B5339E'],
    [Signature, 'Request e-signatures', '#B5339E'],
    [FileText, 'Prepare a form', '#B5339E'],
    [StickyNote, 'Add comments', '#E68619'],
    [Highlighter, 'Stamp', '#E68619'],
    [Search, 'Compare files', '#E34850'],
    [Sparkles, 'AI Assistant', '#5C2EE6'],
    [Printer, 'Use print production', '#2D9D78'],
    [LayoutGrid, 'Measure', '#1473E6'],
  ]
  return (
    <div className="flex-1 overflow-y-auto px-10 py-8 bg-white">
      <div className="text-[24px] font-bold">All tools</div>
      <div className="text-[13.5px] text-[#6E6E6E] mt-1">Create, edit, convert, share and sign PDFs from one place.</div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-3 mt-6">
        {tools.map(([I, t, c]) => (
          <div key={t} className="flex items-center gap-3 rounded-xl border border-[#E1E1E1] p-4 hover:shadow-md transition-shadow">
            <span className="w-10 h-10 rounded-lg flex items-center justify-center text-white shrink-0" style={{ background: c }}>
              <I size={19} />
            </span>
            <span className="text-[13.5px] font-semibold">{t}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
