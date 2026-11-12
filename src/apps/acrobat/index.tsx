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
  RotateCw,
  RotateCcw,
  Lock,
  Link2,
  Check,
  Send,
} from 'lucide-react'
import type { AppProps } from '@/os/registry'
import { logoUrl } from '@/os/registry'
import { WindowControls } from '@/os/Window'
import { useDesk, useWin } from '@/os/context'
import { db, uid, useCollection, type Rec } from '@/db/db'
import { ME, PEOPLE } from '@/data/people'
import { Avatar } from '@/components/Avatar'
import { relative } from '@/data/time'
import { AnnoCtx, getDoc, DOCS, invoiceFields } from './docs'

/**
 * acrobat.annotations: { id, doc, kind: 'note'|'highlight'|'text'|'ink'|'sign', field?, page, x?, y?, text?, points?, replies?, author, date, createdBy? }
 * acrobat.starred:     { id: <doc id> }
 * acrobat.shares:      { id, doc, with: string[], date }
 * acrobat.protected:   { id: <doc id>, date }
 */

const ZOOMS = [50, 66, 75, 85, 100, 125, 150, 200]
const RED = '#EB1000'
const SCRIPT = '"Segoe Script", "Brush Script MT", "Lucida Handwriting", cursive'

type Tool = 'select' | 'comment' | 'highlight' | 'draw' | 'text' | 'sign'
type Dialog =
  | null
  | { k: 'pick'; title: string; action: string; filter: 'pdf' | 'office'; then: (f: Rec) => void }
  | { k: 'combine' }
  | { k: 'export'; doc: string }
  | { k: 'print'; doc: string }
  | { k: 'share'; doc: string }
  | { k: 'protect'; doc: string }
  | { k: 'props'; doc: string }
  | { k: 'ocr'; doc: string }

const keyOf = (p: any) => (p?.doc ? String(p.doc) : p?.file ? `file:${p.file}` : null)
const docOf = (key: string) => (key.startsWith('file:') ? getDoc(key, key.slice(5)) : getDoc(key))
const keyOfFile = (f: Rec) => (f.open?.params?.doc ? String(f.open.params.doc) : `file:${f.name}`)
const uniqueIn = (folder: string, name: string) => {
  const taken = new Set(db.get('files').filter((f) => f.folder === folder).map((f) => f.name.toLowerCase()))
  const ext = /\.[^.]+$/.exec(name)?.[0] ?? ''
  const stem = ext ? name.slice(0, -ext.length) : name
  let n = name
  for (let i = 2; taken.has(n.toLowerCase()); i++) n = `${stem} (${i})${ext}`
  return n
}
const pdfName = (name: string) => name.replace(/\.[^.]+$/, '') + '.pdf'

export default function Acrobat({ win, params }: AppProps) {
  const { isAgent, open, toast } = useDesk()
  const { setTitle, close } = useWin()
  const [tabs, setTabs] = useState<string[]>(() => {
    const k = keyOf(params)
    return k ? [k] : []
  })
  const [active, setActive] = useState<string>(() => keyOf(params) ?? 'home')
  const [menu, setMenu] = useState<null | 'menu' | 'help' | 'bell' | 'account'>(null)
  const [dialog, setDialog] = useState<Dialog>(null)
  const [startTool, setStartTool] = useState<{ key: string; tool: Tool; n: number } | null>(null)
  const seenNotes = useRef<number>(Date.now())

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
  const openWithTool = (k: string, tool: Tool) => {
    openDoc(k)
    setStartTool({ key: k, tool, n: Date.now() })
  }
  const pick = (title: string, action: string, then: (f: Rec) => void, filter: 'pdf' | 'office' = 'pdf') => setDialog({ k: 'pick', title, action, filter, then })

  /** run a named tool from Home / All tools / the rail */
  const runTool = (name: string, docKey?: string) => {
    const withDoc = (fn: (k: string) => void) => (docKey ? fn(docKey) : pick(`${name} — select a file`, 'Continue', (f) => fn(keyOfFile(f))))
    switch (name) {
      case 'Create a PDF':
        return pick('Create a PDF — select a file', 'Create', (f) => {
          const name = uniqueIn(f.folder, pdfName(f.name))
          db.insert('files', { id: uid('f'), name, folder: f.folder, kind: 'pdf', size: f.size, modified: new Date().toISOString(), open: { appId: 'acrobat', params: { file: name } }, createdBy: isAgent ? 'hworker' : undefined })
          openDoc(`file:${name}`)
          toast({ appId: 'acrobat', title: 'PDF created', body: `${name} was saved next to ${f.name}.` })
        }, 'office')
      case 'Combine files':
        return setDialog({ k: 'combine' })
      case 'Edit a PDF':
      case 'Edit text & images':
        return withDoc((k) => openWithTool(k, 'text'))
      case 'Export a PDF':
        return withDoc((k) => setDialog({ k: 'export', doc: k }))
      case 'Organize pages':
        return withDoc((k) => { openDoc(k); setStartTool({ key: k, tool: 'select', n: -Date.now() }) })
      case 'Scan & OCR':
        return withDoc((k) => { openDoc(k); setDialog({ k: 'ocr', doc: k }) })
      case 'Protect a PDF':
        return withDoc((k) => { openDoc(k); setDialog({ k: 'protect', doc: k }) })
      case 'Fill & Sign':
        return withDoc((k) => openWithTool(k, 'sign'))
      case 'Request e-signatures':
        return open('docusign')
      case 'Add comments':
        return withDoc((k) => openWithTool(k, 'comment'))
      case 'Stamp':
      case 'Redact a PDF':
      case 'Prepare a form':
        return withDoc((k) => openWithTool(k, 'text'))
      case 'Compress a PDF':
        return withDoc((k) => {
          const d = docOf(k)
          const name = uniqueIn('Documents', d.name.replace(/\.pdf$/i, '') + ' (compressed).pdf')
          db.insert('files', { id: uid('f'), name, folder: 'Documents', kind: 'pdf', size: '64 KB', modified: new Date().toISOString(), open: { appId: 'acrobat', params: k.startsWith('file:') ? { file: name } : { doc: k } }, createdBy: isAgent ? 'hworker' : undefined })
          toast({ appId: 'acrobat', title: 'PDF compressed', body: `${name} (${d.size} → 64 KB) saved to Documents.`, action: { label: 'Show in folder', appId: 'explorer', params: { path: 'Documents' } } })
        })
      case 'Compare files':
        return withDoc((k) => openDoc(k))
      case 'AI Assistant':
        return withDoc((k) => { openDoc(k); setStartTool({ key: k, tool: 'select', n: Date.now() + 0.5 }) })
      case 'Use print production':
        return withDoc((k) => setDialog({ k: 'print', doc: k }))
      case 'Measure':
        return withDoc((k) => openDoc(k))
    }
  }

  const annos = useCollection('acrobat.annotations')
  const notifs = useMemo(() => annos.filter((a) => a.kind === 'note' && a.author !== ME.name).sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 6), [annos])
  const docKey = active !== 'home' && active !== 'tools' ? active : null

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[#F8F8F8] text-[#222] relative" style={{ fontFamily: '"Adobe Clean", "Source Sans 3", "Segoe UI", system-ui, sans-serif' }} onPointerDown={() => setMenu(null)}>
      {/* top bar */}
      <div data-drag-handle className="h-[44px] shrink-0 flex items-end bg-[#2C2C2C] text-white pl-2">
        <div className="h-full flex items-center gap-1 pr-2 relative" onPointerDown={(e) => e.stopPropagation()}>
          <button aria-label="Menu" onClick={() => setMenu(menu === 'menu' ? null : 'menu')} className={`h-8 px-2 rounded flex items-center gap-1.5 text-[13px] ${menu === 'menu' ? 'bg-white/15' : 'hover:bg-white/10'}`}>
            <MenuIcon size={16} /> Menu
          </button>
          <img src={logoUrl('acrobat')} className="w-6 h-6 mx-1.5" alt="Adobe Acrobat" />
          {menu === 'menu' && (
            <DropMenu className="left-0 top-10">
              <MI agent="acrobat-menu-open" label="Open…" hint="Ctrl+O" onClick={() => { setMenu(null); pick('Open', 'Open', (f) => openDoc(keyOfFile(f))) }} />
              <MI agent="acrobat-menu-create" label="Create a PDF" onClick={() => { setMenu(null); runTool('Create a PDF') }} />
              <MI label="Combine files" onClick={() => { setMenu(null); runTool('Combine files') }} />
              <Sep />
              <MI agent="acrobat-menu-save-copy" label="Save a copy…" disabled={!docKey} onClick={() => {
                setMenu(null)
                if (!docKey) return
                const d = docOf(docKey)
                const name = uniqueIn('Documents', d.name.replace(/\.pdf$/i, '') + ' - Copy.pdf')
                db.insert('files', { id: uid('f'), name, folder: 'Documents', kind: 'pdf', size: d.size, modified: new Date().toISOString(), open: { appId: 'acrobat', params: docKey.startsWith('file:') ? { file: name } : { doc: docKey } }, createdBy: isAgent ? 'hworker' : undefined })
                toast({ appId: 'acrobat', title: 'Copy saved', body: `${name} was saved to Documents.`, action: { label: 'Show in folder', appId: 'explorer', params: { path: 'Documents' } } })
              }} />
              <MI label="Export a PDF…" disabled={!docKey} onClick={() => { setMenu(null); docKey && setDialog({ k: 'export', doc: docKey }) }} />
              <MI label="Print…" hint="Ctrl+P" disabled={!docKey} onClick={() => { setMenu(null); docKey && setDialog({ k: 'print', doc: docKey }) }} />
              <MI label="Share…" disabled={!docKey} onClick={() => { setMenu(null); docKey && setDialog({ k: 'share', doc: docKey }) }} />
              <MI label="Protect using password…" disabled={!docKey} onClick={() => { setMenu(null); docKey && setDialog({ k: 'protect', doc: docKey }) }} />
              <Sep />
              <MI agent="acrobat-menu-properties" label="Document properties" hint="Ctrl+D" disabled={!docKey} onClick={() => { setMenu(null); docKey && setDialog({ k: 'props', doc: docKey }) }} />
              <MI label="Close tab" hint="Ctrl+W" disabled={!docKey} onClick={() => { setMenu(null); docKey && closeDoc(docKey) }} />
              <MI label="Exit application" hint="Ctrl+Q" onClick={() => { setMenu(null); close() }} />
            </DropMenu>
          )}
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
        <div className="h-full flex items-center gap-1 pr-2 relative" data-no-drag onPointerDown={(e) => e.stopPropagation()}>
          <button aria-label="Help" onClick={() => setMenu(menu === 'help' ? null : 'help')} className="w-8 h-8 rounded flex items-center justify-center hover:bg-white/10"><CircleQuestionMark size={17} /></button>
          <button aria-label="Notifications" onClick={() => { setMenu(menu === 'bell' ? null : 'bell'); seenNotes.current = Date.now() }} className="relative w-8 h-8 rounded flex items-center justify-center hover:bg-white/10">
            <Bell size={17} />
            {notifs.length > 0 && menu !== 'bell' && <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#2680EB]" />}
          </button>
          <button aria-label="Account" onClick={() => setMenu(menu === 'account' ? null : 'account')} className="ml-1"><Avatar id={ME.id} size={26} /></button>
          {menu === 'help' && (
            <DropMenu className="right-0 top-10 text-[#222]">
              <MI label="Acrobat Help" onClick={() => { setMenu(null); open('edge', { q: 'Adobe Acrobat help' }) }} />
              <MI label="Keyboard shortcuts" onClick={() => { setMenu(null); open('edge', { q: 'Adobe Acrobat keyboard shortcuts' }) }} />
              <MI label="What’s new" onClick={() => { setMenu(null); open('edge', { q: 'Adobe Acrobat what’s new' }) }} />
              <Sep />
              <div className="px-4 py-2 text-[12px] text-[#6E6E6E]">Adobe Acrobat · 2025.001.20937 · Managed by Northwind IT</div>
            </DropMenu>
          )}
          {menu === 'bell' && (
            <DropMenu className="right-0 top-10 w-[340px] text-[#222]">
              <div className="px-4 py-2 text-[14px] font-semibold">Notifications</div>
              {notifs.length === 0 && <div className="px-4 py-4 text-[13px] text-[#6E6E6E]">You’re all caught up.</div>}
              {notifs.map((n) => (
                <button key={n.id} onClick={() => { setMenu(null); openDoc(n.doc) }} className="w-full text-left px-4 py-2 hover:bg-[#F0F0F0] flex gap-3">
                  <Avatar name={n.author} size={28} />
                  <div className="min-w-0">
                    <div className="text-[13px]"><b>{n.author}</b> commented on <b>{docOf(n.doc).name}</b></div>
                    <div className="text-[12px] text-[#6E6E6E] truncate">{n.text}</div>
                    <div className="text-[11.5px] text-[#6E6E6E]">{relative(n.date)}</div>
                  </div>
                </button>
              ))}
            </DropMenu>
          )}
          {menu === 'account' && (
            <DropMenu className="right-0 top-10 w-[280px] text-[#222]">
              <div className="px-4 py-3 flex items-center gap-3">
                <Avatar id={ME.id} size={40} />
                <div className="min-w-0"><div className="text-[14px] font-semibold">{ME.name}</div><div className="text-[12px] text-[#6E6E6E] truncate">{ME.email}</div></div>
              </div>
              <div className="px-4 pb-2 text-[12px] text-[#6E6E6E]">Acrobat Pro · Northwind Global (Enterprise ID)</div>
              <Sep />
              <MI label="Preferences" onClick={() => { setMenu(null); setActive('tools') }} />
              <MI label="Sign out" disabled onClick={() => {}} />
            </DropMenu>
          )}
        </div>
        <WindowControls dark height={44} />
      </div>

      {active === 'home' && <HomeView openDoc={openDoc} runTool={runTool} />}
      {active === 'tools' && <ToolsView runTool={runTool} />}
      {tabs.map((k) => (
        <div key={k} className={active === k ? 'flex-1 min-h-0 flex flex-col' : 'hidden'}>
          {active === k && <DocView docKey={k} isAgent={isAgent} start={startTool?.key === k ? startTool : null} setDialog={setDialog} runTool={(n) => runTool(n, k)} />}
        </div>
      ))}

      {dialog && <Dialogs dialog={dialog} close={() => setDialog(null)} openDoc={openDoc} isAgent={isAgent} />}
    </div>
  )
}

/* ───────────────────────── small UI ───────────────────────── */

function DropMenu({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`absolute z-50 min-w-[240px] py-1 rounded-lg bg-white text-[#222] border border-[#E1E1E1] shadow-[0_8px_24px_rgba(0,0,0,0.2)] menu-open ${className}`} onPointerDown={(e) => e.stopPropagation()}>
      {children}
    </div>
  )
}
function MI({ label, hint, onClick, disabled, agent }: { label: string; hint?: string; onClick: () => void; disabled?: boolean; agent?: string }) {
  return (
    <button data-agent={agent} disabled={disabled} onClick={onClick} className="w-full h-9 px-4 flex items-center gap-3 text-[13px] text-left hover:bg-[#F0F0F0] disabled:opacity-40 disabled:hover:bg-transparent">
      <span className="flex-1">{label}</span>
      {hint && <span className="text-[11.5px] text-[#6E6E6E]">{hint}</span>}
    </button>
  )
}
const Sep = () => <div className="h-px bg-[#E8E8E8] my-1" />

/* ───────────────────────── document view ───────────────────────── */

function DocView({ docKey, isAgent, start, setDialog, runTool }: { docKey: string; isAgent: boolean; start: { tool: Tool; n: number } | null; setDialog: (d: Dialog) => void; runTool: (name: string) => void }) {
  const doc = docOf(docKey)
  const allAnno = useCollection('acrobat.annotations')
  const starredList = useCollection('acrobat.starred')
  const protectedList = useCollection('acrobat.protected')
  const annos = useMemo(() => allAnno.filter((a) => a.doc === doc.id), [allAnno, doc.id])
  const [zoom, setZoom] = useState(100)
  const [tool, setTool] = useState<Tool>('select')
  const [panel, setPanel] = useState<'comments' | 'ai' | 'bookmarks' | 'attachments' | null>(() => (annos.some((a) => a.kind === 'note') ? 'comments' : null))
  const [thumbs, setThumbs] = useState(true)
  const [page, setPage] = useState(1)
  const [pending, setPending] = useState<null | { field?: string; page: number; x?: number; y?: number }>(null)
  const [text, setText] = useState('')
  const [organize, setOrganize] = useState(false)
  const [rot, setRot] = useState<Record<number, number>>({})
  const [find, setFind] = useState<null | { q: string; i: number; n: number }>(null)
  const [zoomMenu, setZoomMenu] = useState(false)
  const [editingPage, setEditingPage] = useState<string | null>(null)
  const [editText, setEditText] = useState<string | null>(null)
  const [stroke, setStroke] = useState<null | { page: number; pts: [number, number][] }>(null)
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [reply, setReply] = useState('')
  const canvas = useRef<HTMLDivElement>(null)
  const findInput = useRef<HTMLInputElement>(null)
  const z = zoom / 100
  const starred = starredList.some((s) => s.id === doc.id)
  const isProtected = protectedList.some((s) => s.id === doc.id)

  // fit width on open
  useLayoutEffect(() => {
    const w = canvas.current?.clientWidth ?? 900
    const fit = Math.floor(((w - 120) / 816) * 100)
    setZoom(ZOOMS.filter((x) => x <= Math.max(50, fit)).pop() ?? 75)
  }, [docKey])

  // a tool requested from Home / All tools
  useEffect(() => {
    if (!start) return
    if (start.n < 0) return setOrganize(true)
    if (start.n % 1 !== 0) return setPanel('ai')
    setTool(start.tool)
    if (start.tool === 'comment') setPanel('comments')
  }, [start?.n])

  const highlights = useMemo(() => new Set(annos.filter((a) => a.kind === 'highlight' && a.field).map((a) => a.field as string)), [annos])
  const notes = useMemo(() => {
    const m: Record<string, number> = {}
    annos.filter((a) => a.kind === 'note' && a.field).forEach((a) => (m[a.field] = (m[a.field] ?? 0) + 1))
    return m
  }, [annos])

  const pageOfEl = (el: HTMLElement) => Number((el.closest('[data-page]') as HTMLElement | null)?.dataset.page ?? 1)

  const onField = (k: string, e: React.MouseEvent) => {
    if (tool === 'select') return
    if (tool !== 'highlight' && tool !== 'comment') return
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

  /** page-space (816×1056) coordinates of a pointer event on page n, honoring zoom + rotation */
  const toDoc = (n: number, e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const scale = r.width / e.currentTarget.offsetWidth || 1
    const deg = rot[n] ?? 0
    if (!deg) return { x: (e.clientX - r.left) / scale / z, y: (e.clientY - r.top) / scale / z }
    const dx = (e.clientX - (r.left + r.width / 2)) / scale / z
    const dy = (e.clientY - (r.top + r.height / 2)) / scale / z
    const a = (-deg * Math.PI) / 180
    return { x: dx * Math.cos(a) - dy * Math.sin(a) + 408, y: dx * Math.sin(a) + dy * Math.cos(a) + 528 }
  }

  const onPageClick = (n: number, e: React.MouseEvent<HTMLDivElement>) => {
    if (tool === 'comment') {
      const { x, y } = toDoc(n, e)
      setPending({ page: n, x, y })
      setText('')
      setPanel('comments')
    } else if (tool === 'text') {
      const { x, y } = toDoc(n, e)
      const id = uid('an')
      db.insert('acrobat.annotations', { id, doc: doc.id, kind: 'text', page: n, x, y, text: '', author: ME.name, date: new Date().toISOString(), createdBy: isAgent ? 'hworker' : undefined })
      setEditingPage(id)
      setEditText('')
    } else if (tool === 'sign') {
      const { x, y } = toDoc(n, e)
      db.insert('acrobat.annotations', { id: uid('an'), doc: doc.id, kind: 'sign', page: n, x, y, text: ME.name, author: ME.name, date: new Date().toISOString(), createdBy: isAgent ? 'hworker' : undefined })
      setTool('select')
    }
  }
  const onPageDown = (n: number, e: React.PointerEvent<HTMLDivElement>) => {
    if (tool !== 'draw') return
    e.preventDefault()
    const { x, y } = toDoc(n, e as any)
    setStroke({ page: n, pts: [[x, y]] })
    ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
  }
  const onPageMove = (n: number, e: React.PointerEvent<HTMLDivElement>) => {
    if (!stroke || stroke.page !== n) return
    const { x, y } = toDoc(n, e as any)
    setStroke((s) => (s ? { ...s, pts: [...s.pts, [x, y]] } : s))
  }
  const onPageUp = () => {
    if (!stroke) return
    if (stroke.pts.length > 1) db.insert('acrobat.annotations', { id: uid('an'), doc: doc.id, kind: 'ink', page: stroke.page, points: stroke.pts.map(([x, y]) => [Math.round(x), Math.round(y)]), author: ME.name, date: new Date().toISOString(), createdBy: isAgent ? 'hworker' : undefined })
    setStroke(null)
  }
  const commitText = () => {
    if (!editingPage) return
    const v = (editText ?? '').trim()
    if (v) db.update('acrobat.annotations', editingPage, { text: v })
    else db.remove('acrobat.annotations', editingPage)
    setEditingPage(null)
    setEditText(null)
  }

  const post = () => {
    if (!pending || !text.trim()) return
    db.insert('acrobat.annotations', { id: uid('an'), doc: doc.id, kind: 'note', ...pending, text: text.trim(), author: ME.name, date: new Date().toISOString(), createdBy: isAgent ? 'hworker' : undefined })
    setPending(null)
    setText('')
    setTool('select')
  }
  const postReply = (a: Rec) => {
    if (!reply.trim()) return
    db.update('acrobat.annotations', a.id, { replies: [...(a.replies ?? []), { id: uid('rp'), author: ME.name, text: reply.trim(), date: new Date().toISOString() }] })
    setReply('')
    setReplyTo(null)
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
    setOrganize(false)
    const el = canvas.current?.querySelector<HTMLElement>(`[data-page="${n}"]`)
    if (el && canvas.current) canvas.current.scrollTo({ top: el.offsetTop - 24, behavior: 'smooth' })
    setPage(n)
  }
  const zoomBy = (dir: 1 | -1) => {
    const i = ZOOMS.findIndex((x) => x >= zoom)
    const next = ZOOMS[Math.max(0, Math.min(ZOOMS.length - 1, (i < 0 ? ZOOMS.length - 1 : i) + dir))]
    setZoom(next === zoom ? ZOOMS[Math.max(0, Math.min(ZOOMS.length - 1, ZOOMS.indexOf(zoom) + dir))] : next)
  }
  const fit = (mode: 'width' | 'page') => {
    const c = canvas.current
    if (!c) return
    const zw = ((c.clientWidth - 120) / 816) * 100
    const zh = ((c.clientHeight - 48) / 1056) * 100
    setZoom(Math.max(25, Math.floor(mode === 'width' ? zw : Math.min(zw, zh))))
  }

  /* ── find text (CSS custom highlights over the rendered pages) ── */
  const ranges = useRef<Range[]>([])
  useEffect(() => {
    const H = (window as any).Highlight
    const reg = (CSS as any).highlights
    const clear = () => {
      reg?.delete?.('acrobat-find')
      reg?.delete?.('acrobat-find-cur')
    }
    if (!find || !find.q.trim() || !canvas.current) {
      ranges.current = []
      clear()
      return
    }
    const q = find.q.toLowerCase()
    const out: Range[] = []
    const walker = document.createTreeWalker(canvas.current, NodeFilter.SHOW_TEXT)
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const t = (n.nodeValue ?? '').toLowerCase()
      for (let i = t.indexOf(q); i >= 0 && out.length < 500; i = t.indexOf(q, i + q.length)) {
        const r = document.createRange()
        r.setStart(n, i)
        r.setEnd(n, i + q.length)
        out.push(r)
      }
    }
    ranges.current = out
    if (find.n !== out.length) setFind((f) => (f ? { ...f, n: out.length, i: Math.min(f.i, Math.max(0, out.length - 1)) } : f))
    if (H && reg) {
      reg.set('acrobat-find', new H(...out))
      if (out[find.i]) reg.set('acrobat-find-cur', new H(out[find.i]))
      else reg.delete('acrobat-find-cur')
    }
    const cur = out[find.i]
    const c = canvas.current
    if (cur && c) {
      const rr = cur.getBoundingClientRect()
      const cr = c.getBoundingClientRect()
      if (rr.top < cr.top + 20 || rr.bottom > cr.bottom - 20) c.scrollTo({ top: c.scrollTop + (rr.top - cr.top) - cr.height / 3, behavior: 'smooth' })
    }
    return clear
  }, [find?.q, find?.i, zoom, docKey])
  const findStep = (d: 1 | -1) => setFind((f) => (f && f.n ? { ...f, i: (f.i + d + f.n) % f.n } : f))

  const onKey = (e: React.KeyboardEvent) => {
    const mod = e.ctrlKey || e.metaKey
    const tag = (e.target as HTMLElement).tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA') return
    const k = e.key.toLowerCase()
    if (mod && k === 'f') {
      e.preventDefault()
      setFind((f) => f ?? { q: '', i: 0, n: 0 })
      setTimeout(() => findInput.current?.focus(), 0)
    } else if (mod && k === 'p') {
      e.preventDefault()
      setDialog({ k: 'print', doc: docKey })
    } else if (mod && k === 'd') {
      e.preventDefault()
      setDialog({ k: 'props', doc: docKey })
    } else if (mod && (e.key === '=' || e.key === '+')) {
      e.preventDefault()
      zoomBy(1)
    } else if (mod && e.key === '-') {
      e.preventDefault()
      zoomBy(-1)
    } else if (e.key === 'PageDown' || (e.key === 'ArrowRight' && !mod)) goPage(Math.min(doc.pages.length, page + 1))
    else if (e.key === 'PageUp' || (e.key === 'ArrowLeft' && !mod)) goPage(Math.max(1, page - 1))
    else if (e.key === 'Escape') setTool('select')
  }

  const rail: [string, any, string, () => void][] = [
    ['edit', FilePen, 'Edit', () => { setOrganize(false); setTool(tool === 'text' ? 'select' : 'text') }],
    ['convert', FileOutput, 'Convert', () => setDialog({ k: 'export', doc: docKey })],
    ['esign', Signature, 'E-Sign', () => { setOrganize(false); setTool(tool === 'sign' ? 'select' : 'sign') }],
    ['comment', MessageSquare, 'Comment', () => { setPanel(panel === 'comments' ? null : 'comments'); setTool('comment') }],
    ['combine', Combine, 'Combine', () => runTool('Combine files')],
    ['organize', Layers, 'Organize', () => setOrganize(!organize)],
    ['scan', ScanLine, 'Scan & OCR', () => setDialog({ k: 'ocr', doc: docKey })],
    ['protect', Shield, 'Protect', () => setDialog({ k: 'protect', doc: docKey })],
    ['more', Ellipsis, 'More', () => runTool('Compress a PDF')],
  ]
  const railOn = (id: string) => (id === 'comment' && panel === 'comments') || (id === 'edit' && tool === 'text') || (id === 'esign' && tool === 'sign') || (id === 'organize' && organize)
  const quick: [Tool, any, string][] = [
    ['select', MousePointer2, 'Select'],
    ['comment', StickyNote, 'Add a comment'],
    ['highlight', Highlighter, 'Highlight text'],
    ['draw', Pencil, 'Draw'],
    ['text', Type, 'Add text'],
    ['sign', PenLine, 'Fill & Sign'],
  ]
  const noteList = annos.filter((a) => a.kind === 'note').sort((a, b) => (a.date < b.date ? 1 : -1))
  const markups = annos.filter((a) => a.kind === 'text' || a.kind === 'ink' || a.kind === 'sign')
  const banner =
    tool === 'highlight'
      ? 'Highlight: click text on the page to highlight it'
      : tool === 'comment'
        ? 'Add a comment: click anywhere on the page'
        : tool === 'draw'
          ? 'Draw: drag on the page to draw'
          : tool === 'text'
            ? 'Add text: click on the page where you want to type'
            : tool === 'sign'
              ? `Fill & Sign: click on the page to place your signature (${ME.name})`
              : 'Tool selected'

  /** free-placed markups (text boxes, ink, signatures) in page coordinates */
  const pageMarkups = (n: number) => (
    <>
      {markups.filter((a) => a.page === n).map((a) =>
        a.kind === 'ink' ? (
          <svg key={a.id} className="absolute inset-0 pointer-events-none" width={816} height={1056}>
            <polyline points={(a.points ?? []).map((p: number[]) => p.join(',')).join(' ')} fill="none" stroke="#1473E6" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : a.kind === 'sign' ? (
          <div key={a.id} className="absolute group" style={{ left: a.x - 10, top: a.y - 26 }} onClick={(e) => e.stopPropagation()}>
            <div className="px-2 pt-1 border-b border-[#1473E6]/50 text-[28px] text-[#0B2C80] whitespace-nowrap" style={{ fontFamily: SCRIPT }}>{a.text}</div>
            <button aria-label="Remove signature" onClick={() => db.remove('acrobat.annotations', a.id)} className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-white shadow text-[#555] hidden group-hover:flex items-center justify-center"><X size={11} /></button>
          </div>
        ) : editingPage === a.id ? (
          <input
            key={a.id}
            autoFocus
            data-agent="acrobat-text-input"
            value={editText ?? ''}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={commitText}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitText()
              if (e.key === 'Escape') {
                setEditText('')
                setTimeout(commitText, 0)
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="absolute h-7 min-w-[180px] px-1 border border-dashed border-[#1473E6] bg-white/70 outline-none text-[14px] text-[#111]"
            style={{ left: a.x, top: a.y - 14, fontFamily: 'Helvetica, Arial, sans-serif', fontSize: 14 }}
          />
        ) : (
          <div key={a.id} className="absolute group text-[14px] text-[#111] whitespace-pre" style={{ left: a.x + 4, top: a.y - 10, fontFamily: 'Helvetica, Arial, sans-serif' }} onClick={(e) => e.stopPropagation()} onDoubleClick={() => { setEditingPage(a.id); setEditText(a.text) }}>
            {a.text}
            <button aria-label="Remove text" onClick={() => db.remove('acrobat.annotations', a.id)} className="absolute -top-3 -right-5 w-5 h-5 rounded-full bg-white shadow text-[#555] hidden group-hover:flex items-center justify-center"><X size={11} /></button>
          </div>
        ),
      )}
      {stroke && stroke.page === n && (
        <svg className="absolute inset-0 pointer-events-none" width={816} height={1056}>
          <polyline points={stroke.pts.map((p) => p.join(',')).join(' ')} fill="none" stroke="#1473E6" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </>
  )
  const stickies = (n: number) =>
    [...annos.filter((a) => a.kind === 'note' && !a.field && a.page === n), ...(pending && !pending.field && pending.page === n ? [{ id: 'pending', x: pending.x, y: pending.y }] : [])].map((a: any) => (
      <span key={a.id} className="absolute w-6 h-6 rounded-[3px] bg-[#FFD02B] border border-[#C9A100] shadow flex items-center justify-center" style={{ left: a.x * z - 12, top: a.y * z - 12 }}>
        <svg width="14" height="14" viewBox="0 0 16 16"><path d="M2 2h12v9H7l-3 3v-3H2z" fill="#fff" stroke="#6B5300" /></svg>
      </span>
    ))

  return (
    <AnnoCtx.Provider value={{ highlights, notes, tool, onField }}>
      <style>{'::highlight(acrobat-find){background-color:rgba(255,214,0,0.55)} ::highlight(acrobat-find-cur){background-color:rgba(255,140,0,0.75)}'}</style>
      {/* doc toolbar */}
      <div className="h-[48px] shrink-0 flex items-center gap-2 px-3 bg-[#F8F8F8] border-b border-[#E1E1E1]">
        <button aria-label="Toggle page thumbnails" onClick={() => setThumbs(!thumbs)} className={`w-8 h-8 rounded flex items-center justify-center ${thumbs ? 'bg-[#E5E5E5]' : 'hover:bg-[#EAEAEA]'}`}>
          <Files size={17} />
        </button>
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[14px] font-semibold truncate max-w-[340px]" data-agent="acrobat-doc-name">{doc.name}</span>
          <button aria-label="Star" onClick={() => (starred ? db.remove('acrobat.starred', doc.id) : db.insert('acrobat.starred', { id: doc.id }))} className="w-7 h-7 rounded flex items-center justify-center hover:bg-[#EAEAEA]">
            <Star size={15} fill={starred ? '#F5A623' : 'none'} color={starred ? '#F5A623' : '#555'} />
          </button>
          {isProtected && <span title="Protected with a password" className="text-[#6E49CB]"><Lock size={14} /></span>}
          <span className="text-[12px] text-[#6E6E6E]">{doc.size} · {doc.pages.length} page{doc.pages.length > 1 ? 's' : ''}</span>
        </div>
        <div className="flex-1" />
        <button onClick={() => setPanel(panel === 'ai' ? null : 'ai')} className="h-8 px-3 rounded-full text-[13px] font-semibold text-white flex items-center gap-1.5 shadow-sm" style={{ background: 'linear-gradient(90deg,#5C2EE6,#C2185B 60%,#EB1000)' }} aria-label="AI Assistant">
          <Sparkles size={15} /> AI Assistant
        </button>
        <button aria-label="Find text" onClick={() => { setFind((f) => (f ? null : { q: '', i: 0, n: 0 })); setTimeout(() => findInput.current?.focus(), 0) }} className={`w-8 h-8 rounded flex items-center justify-center ${find ? 'bg-[#E5E5E5]' : 'hover:bg-[#EAEAEA]'}`}><Search size={17} /></button>
        <button aria-label="Print" onClick={() => setDialog({ k: 'print', doc: docKey })} className="w-8 h-8 rounded flex items-center justify-center hover:bg-[#EAEAEA]"><Printer size={17} /></button>
        <button aria-label="Share" onClick={() => setDialog({ k: 'share', doc: docKey })} className="h-8 px-4 rounded-full bg-[#1473E6] hover:bg-[#0D66D0] text-white text-[13px] font-semibold flex items-center gap-1.5">
          <Share2 size={14} /> Share
        </button>
      </div>
      <div className="flex-1 min-h-0 flex outline-none" tabIndex={-1} onKeyDown={onKey}>
        {/* tools rail */}
        <div className="w-[76px] shrink-0 bg-[#F8F8F8] border-r border-[#E1E1E1] py-2 flex flex-col items-center gap-0.5 overflow-y-auto">
          {rail.map(([id, I, l, fn]) => {
            const on = railOn(id)
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
              {doc.pages.map((P, i) => {
                const n = i + 1
                const deg = rot[n] ?? 0
                const side = deg % 180 !== 0
                return (
                  <div
                    key={i}
                    data-page={n}
                    data-agent={`acrobat-page-${n}`}
                    aria-label={`Page ${n}`}
                    onClick={(e) => onPageClick(n, e)}
                    onPointerDown={(e) => onPageDown(n, e)}
                    onPointerMove={(e) => onPageMove(n, e)}
                    onPointerUp={onPageUp}
                    className={`relative shadow-[0_2px_8px_rgba(0,0,0,0.22)] bg-white ${tool === 'comment' || tool === 'sign' ? 'cursor-crosshair' : tool === 'text' ? 'cursor-text' : tool === 'draw' ? 'cursor-crosshair touch-none' : ''}`}
                    style={{ width: (side ? 1056 : 816) * z, height: (side ? 816 : 1056) * z }}
                  >
                    {deg ? (
                      <div className="absolute left-1/2 top-1/2 w-[816px] h-[1056px]" style={{ transform: `translate(-50%, -50%) rotate(${deg}deg) scale(${z})` }}>
                        {P()}
                        {pageMarkups(n)}
                      </div>
                    ) : (
                      <div className="absolute left-0 top-0 origin-top-left" style={{ transform: `scale(${z})` }}>
                        {P()}
                        {pageMarkups(n)}
                      </div>
                    )}
                    {/* free-placed sticky notes */}
                    {!deg && stickies(n)}
                  </div>
                )
              })}
            </div>
          </div>
          {/* organize pages */}
          {organize && (
            <AnnoCtx.Provider value={{ highlights, notes, tool: 'select', onField: () => {}, noAgent: true }}>
              <div className="absolute inset-0 z-20 bg-[#F5F5F5] overflow-auto" data-agent="acrobat-organize">
                <div className="h-12 sticky top-0 z-10 bg-white border-b border-[#E1E1E1] flex items-center gap-2 px-4 text-[13px]">
                  <Layers size={17} /> <b className="mr-3">Organize pages</b>
                  <button onClick={() => setRot(Object.fromEntries(doc.pages.map((_, i) => [i + 1, ((rot[i + 1] ?? 0) + 270) % 360])))} className="h-8 px-3 rounded-full hover:bg-[#F0F0F0] flex items-center gap-1.5"><RotateCcw size={15} /> Rotate all left</button>
                  <button onClick={() => setRot(Object.fromEntries(doc.pages.map((_, i) => [i + 1, ((rot[i + 1] ?? 0) + 90) % 360])))} className="h-8 px-3 rounded-full hover:bg-[#F0F0F0] flex items-center gap-1.5"><RotateCw size={15} /> Rotate all right</button>
                  <div className="flex-1" />
                  <button data-agent="acrobat-organize-close" onClick={() => setOrganize(false)} className="h-8 px-4 rounded-full bg-[#1473E6] text-white font-semibold">Close</button>
                </div>
                <div className="p-8 grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-8">
                  {doc.pages.map((P, i) => {
                    const n = i + 1
                    const deg = rot[n] ?? 0
                    return (
                      <div key={i} className="flex flex-col items-center gap-2 group">
                        <div className="relative w-[180px] h-[180px] flex items-center justify-center">
                          <div className="w-[122px] h-[158px] overflow-hidden bg-white shadow-[0_1px_4px_rgba(0,0,0,0.25)] cursor-pointer transition-transform" style={{ transform: `rotate(${deg}deg)` }} onDoubleClick={() => goPage(n)}>
                            <div className="origin-top-left pointer-events-none" style={{ transform: 'scale(0.1495)' }}>{P()}</div>
                          </div>
                          <div className="absolute top-0 left-1/2 -translate-x-1/2 hidden group-hover:flex gap-1 bg-white rounded-full shadow px-1 py-0.5">
                            <button aria-label={`Rotate page ${n} left`} onClick={() => setRot((r) => ({ ...r, [n]: ((r[n] ?? 0) + 270) % 360 }))} className="w-7 h-7 rounded-full hover:bg-[#F0F0F0] flex items-center justify-center"><RotateCcw size={14} /></button>
                            <button aria-label={`Rotate page ${n} right`} onClick={() => setRot((r) => ({ ...r, [n]: ((r[n] ?? 0) + 90) % 360 }))} className="w-7 h-7 rounded-full hover:bg-[#F0F0F0] flex items-center justify-center"><RotateCw size={14} /></button>
                            <button aria-label={`Extract page ${n}`} title="Extract page" onClick={() => {
                              const name = uniqueIn('Documents', `${doc.name.replace(/\.pdf$/i, '')} - page ${n}.pdf`)
                              db.insert('files', { id: uid('f'), name, folder: 'Documents', kind: 'pdf', size: '96 KB', modified: new Date().toISOString(), open: { appId: 'acrobat', params: { file: name } }, createdBy: isAgent ? 'hworker' : undefined })
                            }} className="w-7 h-7 rounded-full hover:bg-[#F0F0F0] flex items-center justify-center"><FileOutput size={14} /></button>
                          </div>
                        </div>
                        <span className="text-[12px] text-[#555]">{n}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </AnnoCtx.Provider>
          )}
          {/* find bar */}
          {find && !organize && (
            <div className="absolute right-4 top-4 z-10 h-10 pl-3 pr-1 rounded-lg bg-white shadow-[0_2px_10px_rgba(0,0,0,0.18)] flex items-center gap-1 text-[13px]">
              <Search size={15} className="text-[#777]" />
              <input
                ref={findInput}
                data-agent="acrobat-find-input"
                value={find.q}
                placeholder="Find text"
                onChange={(e) => setFind({ q: e.target.value, i: 0, n: find.n })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') findStep(e.shiftKey ? -1 : 1)
                  if (e.key === 'Escape') setFind(null)
                }}
                className="w-[180px] outline-none text-[13px] px-1"
                style={{ fontSize: 13 }}
              />
              <span className="text-[12px] text-[#777] w-[54px] text-right">{find.q ? (find.n ? `${find.i + 1} of ${find.n}` : '0 results') : ''}</span>
              <button aria-label="Previous result" onClick={() => findStep(-1)} className="w-8 h-8 rounded hover:bg-[#F0F0F0] flex items-center justify-center"><ChevronUp size={15} /></button>
              <button aria-label="Next result" onClick={() => findStep(1)} className="w-8 h-8 rounded hover:bg-[#F0F0F0] flex items-center justify-center"><ChevronDown size={15} /></button>
              <button aria-label="Close find" onClick={() => setFind(null)} className="w-8 h-8 rounded hover:bg-[#F0F0F0] flex items-center justify-center"><X size={15} /></button>
            </div>
          )}
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
              {banner}
              <button onClick={() => setTool('select')} className="h-7 px-3 rounded-full hover:bg-white/15 font-semibold">Done</button>
            </div>
          )}
          {/* page nav + zoom */}
          <div className="absolute right-4 bottom-5 z-10 flex flex-col items-center gap-1 p-1 rounded-xl bg-white shadow-[0_2px_10px_rgba(0,0,0,0.18)] text-[12px]">
            <button aria-label="Previous page" onClick={() => goPage(Math.max(1, page - 1))} className="w-8 h-8 rounded-lg hover:bg-[#F0F0F0] flex items-center justify-center"><ChevronUp size={16} /></button>
            <div className="w-10 text-center leading-tight" data-agent="acrobat-page-indicator">
              <input
                aria-label="Page number"
                value={page}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10)
                  if (n >= 1 && n <= doc.pages.length) goPage(n)
                }}
                onFocus={(e) => e.target.select()}
                className="w-8 text-center font-semibold outline-none rounded hover:bg-[#F0F0F0] focus:bg-[#E4EEFC]"
                style={{ fontSize: 12 }}
              />
              <div className="text-[#777]">{doc.pages.length}</div>
            </div>
            <button aria-label="Next page" onClick={() => goPage(Math.min(doc.pages.length, page + 1))} className="w-8 h-8 rounded-lg hover:bg-[#F0F0F0] flex items-center justify-center"><ChevronDown size={16} /></button>
            <div className="w-6 h-px bg-[#E1E1E1] my-1" />
            <button data-agent="acrobat-zoom-in" aria-label="Zoom in" onClick={() => zoomBy(1)} className="w-8 h-8 rounded-lg hover:bg-[#F0F0F0] flex items-center justify-center"><ZoomIn size={16} /></button>
            <div className="relative">
              <div data-agent="acrobat-zoom-value" role="button" onClick={() => setZoomMenu(!zoomMenu)} className="text-[11px] font-semibold px-1 rounded hover:bg-[#F0F0F0] cursor-pointer">{zoom}%</div>
              {zoomMenu && (
                <div className="absolute right-12 bottom-0 w-[150px] py-1 rounded-lg bg-white border border-[#E1E1E1] shadow-lg">
                  {[...ZOOMS].reverse().map((v) => (
                    <button key={v} onClick={() => { setZoom(v); setZoomMenu(false) }} className={`w-full h-8 px-3 text-left text-[12.5px] hover:bg-[#F0F0F0] ${v === zoom ? 'font-semibold text-[#1473E6]' : ''}`}>{v}%</button>
                  ))}
                  <div className="h-px bg-[#EEE] my-1" />
                  <button onClick={() => { fit('width'); setZoomMenu(false) }} className="w-full h-8 px-3 text-left text-[12.5px] hover:bg-[#F0F0F0]">Fit width</button>
                  <button onClick={() => { fit('page'); setZoomMenu(false) }} className="w-full h-8 px-3 text-left text-[12.5px] hover:bg-[#F0F0F0]">Fit page</button>
                </div>
              )}
            </div>
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
                      <div className="text-[11.5px] text-[#6E6E6E] flex items-center gap-1"><Clock size={11} /> {relative(a.date)} · <button onClick={() => goPage(a.page)} className="hover:underline">Page {a.page}</button></div>
                    </div>
                    {a.createdBy === 'hworker' && (
                      <span className="inline-flex items-center gap-1 h-5 pl-0.5 pr-2 rounded-full text-[10.5px] font-semibold text-white" style={{ background: '#430693', fontFamily: 'var(--font-brand)' }}>
                        <img src={logoUrl('hworker')} className="w-4 h-4 rounded-full" alt="" /> H-Worker
                      </span>
                    )}
                    <button aria-label="Delete comment" onClick={() => db.remove('acrobat.annotations', a.id)} className="w-6 h-6 rounded hover:bg-[#F0F0F0] flex items-center justify-center text-[#777]"><Trash size={13} /></button>
                  </div>
                  <div className="text-[13px] mt-2 whitespace-pre-wrap leading-snug">{a.text}</div>
                  {(a.replies ?? []).map((r: any) => (
                    <div key={r.id} className="mt-2 ml-3 pl-3 border-l-2 border-[#E1E1E1]">
                      <div className="text-[12px] font-semibold">{r.author} <span className="font-normal text-[#6E6E6E]">· {relative(r.date)}</span></div>
                      <div className="text-[13px] whitespace-pre-wrap leading-snug">{r.text}</div>
                    </div>
                  ))}
                  {replyTo === a.id ? (
                    <div className="mt-2">
                      <textarea autoFocus data-agent={`acrobat-reply-input-${a.id}`} value={reply} onChange={(e) => setReply(e.target.value)} rows={2} placeholder="Reply…" className="w-full resize-none outline-none text-[13px] border border-[#D5D5D5] rounded p-2 focus:border-[#1473E6]" />
                      <div className="flex justify-end gap-2 mt-1">
                        <button onClick={() => { setReplyTo(null); setReply('') }} className="h-7 px-3 rounded-full text-[12.5px] font-semibold hover:bg-[#F0F0F0]">Cancel</button>
                        <button data-agent={`acrobat-reply-post-${a.id}`} disabled={!reply.trim()} onClick={() => postReply(a)} className="h-7 px-3 rounded-full bg-[#1473E6] text-white text-[12.5px] font-semibold disabled:opacity-40">Reply</button>
                      </div>
                    </div>
                  ) : (
                    <button data-agent={`acrobat-reply-${a.id}`} onClick={() => { setReplyTo(a.id); setReply('') }} className="mt-2 text-[12px] text-[#1473E6] font-semibold hover:underline">Reply</button>
                  )}
                </div>
              ))}
              {annos.filter((a) => a.kind === 'highlight').length > 0 && (
                <div className="text-[12px] text-[#6E6E6E] px-1 flex items-center gap-1.5">
                  <Highlighter size={13} /> {annos.filter((a) => a.kind === 'highlight').length} highlight{annos.filter((a) => a.kind === 'highlight').length > 1 ? 's' : ''} on this document
                </div>
              )}
              {markups.length > 0 && (
                <div className="text-[12px] text-[#6E6E6E] px-1 flex items-center gap-1.5">
                  <Pencil size={13} /> {markups.length} other markup{markups.length > 1 ? 's' : ''} (text, drawings, signatures)
                </div>
              )}
            </div>
          </div>
        )}
        {panel === 'ai' && <AiPanel docId={doc.id} name={doc.name} pages={doc.pages.length} close={() => setPanel(null)} canvas={canvas} />}
        {panel === 'bookmarks' && (
          <SidePanel title="Bookmarks" close={() => setPanel(null)}>
            {doc.pages.map((_, i) => (
              <button key={i} onClick={() => goPage(i + 1)} className={`w-full h-9 px-3 rounded flex items-center gap-2 text-[13px] text-left hover:bg-[#F0F0F0] ${page === i + 1 ? 'text-[#1473E6] font-semibold' : ''}`}>
                <Bookmark size={14} /> {i === 0 ? doc.name.replace(/\.pdf$/i, '') : `Page ${i + 1}`}
              </button>
            ))}
          </SidePanel>
        )}
        {panel === 'attachments' && (
          <SidePanel title="Attachments" close={() => setPanel(null)}>
            <div className="text-center text-[13px] text-[#6E6E6E] pt-10 px-4">
              <Paperclip className="mx-auto mb-2 text-[#B0B0B0]" size={28} />
              This document has no attachments.
            </div>
          </SidePanel>
        )}
        {/* right mini rail */}
        <div className="w-[48px] shrink-0 bg-[#F8F8F8] border-l border-[#E1E1E1] py-2 flex flex-col items-center gap-1">
          {[
            [MessageSquare, 'Comments', () => setPanel(panel === 'comments' ? null : 'comments'), 'acrobat-panel-comments', panel === 'comments'],
            [Bookmark, 'Bookmarks', () => setPanel(panel === 'bookmarks' ? null : 'bookmarks'), undefined, panel === 'bookmarks'],
            [LayoutGrid, 'Page thumbnails', () => setThumbs(!thumbs), undefined, false],
            [Paperclip, 'Attachments', () => setPanel(panel === 'attachments' ? null : 'attachments'), undefined, panel === 'attachments'],
          ].map(([I, l, fn, ag, on]: any) => (
            <button key={l} data-agent={ag} aria-label={l} title={l} onClick={fn} className={`w-9 h-9 rounded-lg flex items-center justify-center ${on ? 'bg-[#E4EEFC] text-[#1473E6]' : 'text-[#444] hover:bg-[#EAEAEA]'}`}>
              <I size={18} strokeWidth={1.6} />
            </button>
          ))}
        </div>
      </div>
    </AnnoCtx.Provider>
  )
}

function SidePanel({ title, close, children }: { title: string; close: () => void; children: React.ReactNode }) {
  return (
    <div className="w-[280px] shrink-0 bg-white border-l border-[#E1E1E1] flex flex-col">
      <div className="h-12 flex items-center px-4 border-b border-[#EBEBEB]">
        <span className="text-[15px] font-semibold flex-1">{title}</span>
        <button aria-label={`Close ${title.toLowerCase()}`} onClick={close} className="w-7 h-7 rounded hover:bg-[#F0F0F0] flex items-center justify-center"><X size={15} /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-2">{children}</div>
    </div>
  )
}

function AiPanel({ docId, name, pages, close, canvas }: { docId: string; name: string; pages: number; close: () => void; canvas: React.RefObject<HTMLDivElement | null> }) {
  const inv = docId === 'inv-fabrikam' || docId === 'inv-litware' ? invoiceFields(docId) : null
  const [qa, setQa] = useState<{ q: string; a: string }[]>([])
  const [q, setQ] = useState('')
  const summary = inv
    ? [`Invoice ${inv.invoiceNo} from ${inv.vendor}, dated ${inv.invoiceDate}.`, `Amount due ${inv.amount} against PO ${inv.po}.`, `Payment terms ${inv.terms} — due ${inv.dueDate}.`]
    : docId === 'contoso-msa'
      ? ['Master Services Agreement between Northwind Global and Contoso Ltd (redline).', 'Open points: limitation of liability cap (12 vs 24 months of fees) and renewal notice.', '3-year term with auto-renewal and 90-day notice.']
      : docId === 'travel-policy'
        ? ['Northwind’s 2025 travel & expense policy.', 'Covers booking, lodging limits, meals per diem and receipts.', 'Expenses must be submitted in Concur within 30 days.']
        : [`${name} — ${pages} page${pages > 1 ? 's' : ''}.`, 'Scanned document; key text has been recognized.', 'Ask a question below to find specific details.']
  const ask = () => {
    const question = q.trim()
    if (!question) return
    const ql = question.toLowerCase()
    let a = ''
    if (inv && /total|amount|owe|due amount|how much/.test(ql)) a = `The amount due is ${inv.amount}.`
    else if (inv && /due|when|date/.test(ql)) a = `It’s due ${inv.dueDate} (${inv.terms} from ${inv.invoiceDate}).`
    else if (inv && /po|purchase/.test(ql)) a = `The purchase order is ${inv.po}.`
    else if (inv && /vendor|who|supplier/.test(ql)) a = `The vendor is ${inv.vendor}.`
    else {
      const words = ql.split(/\W+/).filter((w) => w.length > 3)
      const text = (canvas.current?.innerText ?? '').split(/\n+/).map((l) => l.trim()).filter(Boolean)
      const hit = text.find((l) => words.some((w) => l.toLowerCase().includes(w)))
      a = hit ? `From the document: “${hit.slice(0, 220)}”` : 'I couldn’t find that in this document. Try rephrasing your question.'
    }
    setQa((x) => [...x, { q: question, a }])
    setQ('')
  }
  return (
    <div className="w-[320px] shrink-0 bg-white border-l border-[#E1E1E1] flex flex-col" data-agent="acrobat-ai-panel">
      <div className="h-12 flex items-center px-4 border-b border-[#EBEBEB] gap-2">
        <Sparkles size={16} className="text-[#5C2EE6]" />
        <span className="text-[15px] font-semibold flex-1">AI Assistant</span>
        <button aria-label="Close AI Assistant" onClick={close} className="w-7 h-7 rounded hover:bg-[#F0F0F0] flex items-center justify-center"><X size={15} /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 text-[13px] space-y-3">
        <div className="rounded-lg bg-[#F5F2FF] p-3">
          <div className="font-semibold mb-1.5">Overview</div>
          <ul className="list-disc pl-4 space-y-1">{summary.map((s) => <li key={s}>{s}</li>)}</ul>
        </div>
        {qa.map((x, i) => (
          <div key={i} className="space-y-1.5">
            <div className="ml-8 rounded-lg bg-[#1473E6] text-white px-3 py-2">{x.q}</div>
            <div className="mr-8 rounded-lg bg-[#F0F0F0] px-3 py-2">{x.a}</div>
          </div>
        ))}
        <div className="text-[11.5px] text-[#6E6E6E]">AI-generated content may be incorrect. Check important info.</div>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); ask() }} className="p-3 border-t border-[#EBEBEB] flex gap-2">
        <input data-agent="acrobat-ai-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask about this document" className="flex-1 h-9 px-3 rounded-full border border-[#D5D5D5] outline-none text-[13px] focus:border-[#5C2EE6]" style={{ fontSize: 13 }} />
        <button type="submit" aria-label="Ask" disabled={!q.trim()} className="w-9 h-9 rounded-full bg-[#5C2EE6] text-white flex items-center justify-center disabled:opacity-40"><Send size={15} /></button>
      </form>
    </div>
  )
}

/* ───────────────────────── dialogs ───────────────────────── */

function Modal({ title, children, close, width = 460 }: { title: string; children: React.ReactNode; close: () => void; width?: number }) {
  return (
    <div className="absolute inset-0 z-[60] bg-black/30 flex items-center justify-center" onPointerDown={(e) => e.stopPropagation()}>
      <div className="rounded-xl bg-white shadow-[0_16px_48px_rgba(0,0,0,0.3)] overflow-hidden" style={{ width }}>
        <div className="h-14 flex items-center px-6">
          <span className="text-[18px] font-bold flex-1">{title}</span>
          <button aria-label="Close" onClick={close} className="w-8 h-8 rounded hover:bg-[#F0F0F0] flex items-center justify-center"><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}
const pill = 'h-8 px-4 rounded-full text-[13px] font-semibold border-2 border-[#4B4B4B] hover:bg-[#F3F3F3] disabled:opacity-40'
const pillPrimary = 'h-8 px-4 rounded-full text-[13px] font-semibold bg-[#1473E6] hover:bg-[#0D66D0] text-white disabled:opacity-40'

function Dialogs({ dialog, close, openDoc, isAgent }: { dialog: NonNullable<Dialog>; close: () => void; openDoc: (k: string) => void; isAgent: boolean }) {
  const { toast, open } = useDesk()
  const files = useCollection('files')
  const shares = useCollection('acrobat.shares')
  const prot = useCollection('acrobat.protected')
  const [sel, setSel] = useState<string[]>([])
  const [fmt, setFmt] = useState('Microsoft Word (*.docx)')
  const [printer, setPrinter] = useState('NW-BOS-3F-HP LaserJet')
  const [copies, setCopies] = useState(1)
  const [range, setRange] = useState('All')
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [copied, setCopied] = useState(false)
  const by = isAgent ? 'hworker' : undefined
  const now = () => new Date().toISOString()

  if (dialog.k === 'pick' || dialog.k === 'combine') {
    const filter = dialog.k === 'pick' ? dialog.filter : 'pdf'
    const list = files.filter((f) => (filter === 'pdf' ? f.kind === 'pdf' || /\.pdf$/i.test(f.name) : /\.(docx|xlsx|pptx|txt|csv|png|jpe?g)$/i.test(f.name))).sort((a, b) => (a.modified < b.modified ? 1 : -1))
    const multi = dialog.k === 'combine'
    const go = () => {
      if (dialog.k === 'pick') {
        const f = list.find((x) => x.id === sel[0])
        if (!f) return
        close()
        dialog.then(f)
      } else {
        const chosen = list.filter((f) => sel.includes(f.id))
        if (chosen.length < 2) return
        const name = uniqueIn('Documents', 'Binder1.pdf')
        db.insert('files', { id: uid('f'), name, folder: 'Documents', kind: 'pdf', size: `${chosen.length * 140} KB`, modified: now(), open: { appId: 'acrobat', params: { file: name } }, createdBy: by })
        close()
        openDoc(`file:${name}`)
        toast({ appId: 'acrobat', title: 'Files combined', body: `${chosen.length} files were combined into ${name} (Documents).` })
      }
    }
    return (
      <Modal title={dialog.k === 'pick' ? dialog.title : 'Combine files'} close={close} width={620}>
        <div className="px-6 text-[13px] text-[#6E6E6E] mb-2">{multi ? 'Select two or more PDFs to merge, in the order you want them.' : 'Select a file from your computer or OneDrive.'}</div>
        <div className="mx-6 h-[320px] overflow-y-auto border border-[#E1E1E1] rounded-lg">
          {list.map((f) => {
            const on = sel.includes(f.id)
            return (
              <div key={f.id} role="row" data-agent={`acrobat-pick-${f.id}`} onClick={() => setSel(multi ? (on ? sel.filter((x) => x !== f.id) : [...sel, f.id]) : [f.id])} onDoubleClick={() => !multi && (setSel([f.id]), close(), dialog.k === 'pick' && dialog.then(f))} className={`h-11 flex items-center gap-3 px-3 border-b border-[#F0F0F0] cursor-default ${on ? 'bg-[#E4EEFC]' : 'hover:bg-[#F7F7F7]'}`}>
                {multi && <span className={`w-4 h-4 rounded border flex items-center justify-center ${on ? 'bg-[#1473E6] border-[#1473E6] text-white' : 'border-[#999]'}`}>{on && <Check size={11} />}</span>}
                <FileText size={18} color={/\.pdf$/i.test(f.name) ? RED : '#1473E6'} />
                <div className="flex-1 min-w-0"><div className="text-[13px] truncate">{f.name}</div><div className="text-[11.5px] text-[#6E6E6E] truncate">{f.folder.replace(/\//g, ' › ')}</div></div>
                {multi && on && <span className="text-[12px] text-[#1473E6] font-semibold">{sel.indexOf(f.id) + 1}</span>}
                <span className="text-[12px] text-[#6E6E6E] w-[70px] text-right">{f.size}</span>
              </div>
            )
          })}
          {!list.length && <div className="pt-10 text-center text-[13px] text-[#6E6E6E]">No matching files.</div>}
        </div>
        <div className="px-6 py-4 flex justify-end gap-2">
          <button onClick={close} className={pill}>Cancel</button>
          <button data-agent="acrobat-pick-ok" disabled={multi ? sel.length < 2 : !sel.length} onClick={go} className={pillPrimary}>{dialog.k === 'pick' ? dialog.action : 'Combine'}</button>
        </div>
      </Modal>
    )
  }

  const d = docOf(dialog.doc)
  const base = d.name.replace(/\.pdf$/i, '')
  if (dialog.k === 'export') {
    const FORMATS: [string, string, string, string][] = [
      ['Microsoft Word (*.docx)', 'docx', 'word', 'docx'],
      ['Spreadsheet (*.xlsx)', 'xlsx', 'excel', 'xlsx'],
      ['Microsoft PowerPoint (*.pptx)', 'pptx', 'powerpoint', 'pptx'],
      ['Image (*.png)', 'png', '', 'img'],
      ['Plain text (*.txt)', 'txt', 'notepad', 'txt'],
    ]
    const doExport = () => {
      const [, ext, app, kind] = FORMATS.find((f) => f[0] === fmt)!
      const name = uniqueIn('Documents', `${base}.${ext}`)
      let openSpec: any = app ? { appId: app } : undefined
      if (ext === 'txt') {
        const pageEl = document.querySelector('[data-agent="acrobat-canvas"]') as HTMLElement | null
        const content = (pageEl?.innerText ?? base).replace(/\n{3,}/g, '\n\n').trim() + '\n'
        const nid = uid('n')
        db.insert('notepad.notes', { id: nid, name, content, saved: content, modified: now(), path: 'Documents', createdBy: by })
        openSpec = { appId: 'notepad', params: { noteId: nid } }
      }
      db.insert('files', { id: uid('f'), name, folder: 'Documents', kind, size: d.size, modified: now(), open: openSpec, createdBy: by })
      close()
      toast({ appId: 'acrobat', title: 'Export complete', body: `${name} was saved to Documents.`, action: openSpec ? { label: 'Open', appId: openSpec.appId, params: openSpec.params } : { label: 'Show in folder', appId: 'explorer', params: { path: 'Documents' } } })
    }
    return (
      <Modal title="Export a PDF" close={close}>
        <div className="px-6 text-[13px] text-[#6E6E6E] mb-3">Convert <b className="text-[#222]">{d.name}</b> to an editable file.</div>
        <div className="px-6 space-y-1">
          {FORMATS.map(([l]) => (
            <label key={l} className={`h-10 px-3 rounded-lg flex items-center gap-3 text-[13.5px] cursor-default ${fmt === l ? 'bg-[#E4EEFC]' : 'hover:bg-[#F7F7F7]'}`}>
              <input type="radio" data-agent={`acrobat-export-${l.split(' ')[0].toLowerCase()}`} checked={fmt === l} onChange={() => setFmt(l)} className="accent-[#1473E6]" /> {l}
            </label>
          ))}
        </div>
        <div className="px-6 py-4 flex justify-end gap-2">
          <button onClick={close} className={pill}>Cancel</button>
          <button data-agent="acrobat-export-ok" onClick={doExport} className={pillPrimary}>Convert</button>
        </div>
      </Modal>
    )
  }
  if (dialog.k === 'print') {
    const doPrint = () => {
      close()
      if (printer === 'Microsoft Print to PDF') {
        const name = uniqueIn('Documents', `${base} (printed).pdf`)
        db.insert('files', { id: uid('f'), name, folder: 'Documents', kind: 'pdf', size: d.size, modified: now(), open: { appId: 'acrobat', params: dialog.doc.startsWith('file:') ? { file: name } : { doc: dialog.doc } }, createdBy: by })
        toast({ appId: 'acrobat', title: 'Saved as PDF', body: `${name} was saved to Documents.`, action: { label: 'Show in folder', appId: 'explorer', params: { path: 'Documents' } } })
      } else toast({ appId: 'acrobat', title: `Printing ${d.name}`, body: `${copies} cop${copies > 1 ? 'ies' : 'y'} · ${range === 'All' ? `${d.pages.length} page${d.pages.length > 1 ? 's' : ''}` : 'current page'} → ${printer}` })
    }
    return (
      <Modal title="Print" close={close}>
        <div className="px-6 space-y-3 text-[13px]">
          <label className="block">Printer
            <select data-agent="acrobat-print-printer" value={printer} onChange={(e) => setPrinter(e.target.value)} className="mt-1 w-full h-9 px-2 rounded border border-[#D5D5D5] outline-none" style={{ fontSize: 13 }}>
              {['NW-BOS-3F-HP LaserJet', 'Microsoft Print to PDF', 'OneNote (Desktop)'].map((p) => <option key={p}>{p}</option>)}
            </select>
          </label>
          <div className="flex gap-6">
            <label className="block">Copies<input type="number" min={1} max={99} value={copies} onChange={(e) => setCopies(Math.max(1, Math.min(99, Number(e.target.value) || 1)))} className="mt-1 block w-20 h-9 px-2 rounded border border-[#D5D5D5] outline-none" style={{ fontSize: 13 }} /></label>
            <div>Pages to print
              <div className="flex gap-4 mt-2">{['All', 'Current page'].map((r) => <label key={r} className="flex items-center gap-1.5"><input type="radio" checked={range === r} onChange={() => setRange(r)} className="accent-[#1473E6]" /> {r}</label>)}</div>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 flex justify-end gap-2">
          <button onClick={close} className={pill}>Cancel</button>
          <button data-agent="acrobat-print-ok" onClick={doPrint} className={pillPrimary}>Print</button>
        </div>
      </Modal>
    )
  }
  if (dialog.k === 'share') {
    const existing = shares.find((s) => s.id === d.id)
    const list: string[] = existing?.with ?? []
    const sugg = email.trim() ? PEOPLE.filter((p) => (p.name.toLowerCase().includes(email.toLowerCase()) || p.email.includes(email.toLowerCase())) && !list.includes(p.email)).slice(0, 4) : []
    const add = (addr: string) => {
      const a = addr.trim().toLowerCase()
      if (!/^\S+@\S+\.\S+$/.test(a)) return
      db.upsert('acrobat.shares', { id: d.id, doc: d.id, with: [...new Set([...list, a])], date: now() })
      setEmail('')
    }
    return (
      <Modal title={`Share “${d.name}”`} close={close} width={500}>
        <div className="px-6 text-[13px] space-y-3">
          <div className="relative">
            <input data-agent="acrobat-share-email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add(email)} placeholder="Add names or emails" className="w-full h-9 px-3 rounded border border-[#D5D5D5] outline-none focus:border-[#1473E6]" style={{ fontSize: 13 }} />
            {sugg.length > 0 && (
              <div className="absolute z-10 left-0 right-0 top-10 rounded-lg bg-white border border-[#E1E1E1] shadow-lg py-1">
                {sugg.map((p) => (
                  <button key={p.id} onClick={() => add(p.email)} className="w-full h-10 px-3 flex items-center gap-2 hover:bg-[#F0F0F0] text-left"><Avatar id={p.id} size={24} /> <span>{p.name}</span> <span className="text-[#6E6E6E]">{p.email}</span></button>
                ))}
              </div>
            )}
          </div>
          {list.length > 0 && (
            <div className="space-y-1">
              {list.map((e) => (
                <div key={e} className="h-9 flex items-center gap-2"><Avatar name={e} size={24} /> <span className="flex-1">{e}</span> <span className="text-[#6E6E6E]">Can comment</span>
                  <button aria-label={`Remove ${e}`} onClick={() => db.upsert('acrobat.shares', { id: d.id, doc: d.id, with: list.filter((x) => x !== e), date: now() })} className="w-7 h-7 rounded hover:bg-[#F0F0F0] flex items-center justify-center"><X size={13} /></button>
                </div>
              ))}
            </div>
          )}
          <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={2} placeholder="Add a message (optional)" className="w-full resize-none rounded border border-[#D5D5D5] outline-none p-2 focus:border-[#1473E6]" />
        </div>
        <div className="px-6 py-4 flex items-center gap-2">
          <button onClick={() => { navigator.clipboard?.writeText(`https://acrobat.adobe.com/id/urn:aaid:sc:US:${d.id}`).catch(() => {}); setCopied(true) }} className="h-8 px-3 rounded-full text-[13px] font-semibold text-[#1473E6] hover:bg-[#E4EEFC] flex items-center gap-1.5"><Link2 size={14} /> {copied ? 'Link copied' : 'Copy link'}</button>
          <div className="flex-1" />
          <button onClick={close} className={pill}>Cancel</button>
          <button data-agent="acrobat-share-send" disabled={!list.length} onClick={() => { close(); toast({ appId: 'acrobat', title: 'Invitation sent', body: `${d.name} is shared with ${list.length} ${list.length > 1 ? 'people' : 'person'}.` }) }} className={pillPrimary}>Send</button>
        </div>
      </Modal>
    )
  }
  if (dialog.k === 'protect') {
    const isOn = prot.some((p) => p.id === d.id)
    const ok = pw.length >= 6 && pw === pw2
    return (
      <Modal title="Protect using password" close={close}>
        <div className="px-6 text-[13px] space-y-3">
          {isOn ? (
            <div className="rounded-lg bg-[#F5F2FF] p-3 flex items-center gap-2"><Lock size={15} className="text-[#6E49CB]" /> This document is protected. Viewers need the password to open it.</div>
          ) : (
            <>
              <div className="text-[#6E6E6E]">Require a password to open <b className="text-[#222]">{d.name}</b>.</div>
              <input type="password" data-agent="acrobat-protect-pw" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Type password" className="w-full h-9 px-3 rounded border border-[#D5D5D5] outline-none focus:border-[#1473E6]" style={{ fontSize: 13 }} />
              <input type="password" data-agent="acrobat-protect-pw2" value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="Retype password" className="w-full h-9 px-3 rounded border border-[#D5D5D5] outline-none focus:border-[#1473E6]" style={{ fontSize: 13 }} />
              <div className={`text-[12px] ${pw && !ok ? 'text-[#C9252D]' : 'text-[#6E6E6E]'}`}>{pw && pw.length < 6 ? 'Use at least 6 characters.' : pw2 && pw !== pw2 ? 'Passwords don’t match.' : 'Password strength is checked against your organization’s policy.'}</div>
            </>
          )}
        </div>
        <div className="px-6 py-4 flex justify-end gap-2">
          <button onClick={close} className={pill}>Cancel</button>
          {isOn ? (
            <button data-agent="acrobat-protect-remove" onClick={() => { db.remove('acrobat.protected', d.id); close() }} className={pillPrimary}>Remove protection</button>
          ) : (
            <button data-agent="acrobat-protect-ok" disabled={!ok} onClick={() => { db.upsert('acrobat.protected', { id: d.id, date: now() }); close(); toast({ appId: 'acrobat', title: 'Password protection applied', body: d.name }) }} className={pillPrimary}>Apply</button>
          )}
        </div>
      </Modal>
    )
  }
  if (dialog.k === 'ocr') {
    return (
      <Modal title="Scan & OCR" close={close}>
        <div className="px-6 text-[13px] space-y-2">
          <div className="text-[#6E6E6E]">Recognize text in <b className="text-[#222]">{d.name}</b> so you can search, select and copy it.</div>
          {busy && <div className="h-1.5 rounded-full bg-[#EEE] overflow-hidden"><div className="h-full w-2/3 bg-[#1473E6] animate-pulse" /></div>}
          {done && <div className="rounded-lg bg-[#EAF6EE] text-[#1E7B3E] p-3 flex items-center gap-2"><Check size={15} /> Text recognized on {d.pages.length} page{d.pages.length > 1 ? 's' : ''} (English (US)).</div>}
        </div>
        <div className="px-6 py-4 flex justify-end gap-2">
          <button onClick={close} className={pill}>{done ? 'Close' : 'Cancel'}</button>
          {!done && <button data-agent="acrobat-ocr-run" disabled={busy} onClick={() => { setBusy(true); setTimeout(() => { setBusy(false); setDone(true) }, 1400) }} className={pillPrimary}>{busy ? 'Recognizing…' : 'Recognize text'}</button>}
        </div>
      </Modal>
    )
  }
  // document properties
  const f = files.find((x) => keyOfFile(x) === dialog.doc)
  const rows: [string, string][] = [
    ['File', d.name],
    ['Title', base],
    ['Author', d.id.startsWith('inv-') ? (d.id === 'inv-fabrikam' ? 'Fabrikam Supplies, Inc.' : 'Litware Inc.') : d.id.startsWith('rcpt-') ? 'Receipt' : 'Northwind Global'],
    ['Location', f ? `C:\\Users\\alex.morgan\\${f.folder.replace(/\//g, '\\')}` : 'Cloud (Adobe Document Cloud)'],
    ['File size', d.size],
    ['Page count', String(d.pages.length)],
    ['Page size', '8.50 × 11.00 in'],
    ['PDF producer', 'Adobe PDF Library 23.1'],
    ['Security', prot.some((p) => p.id === d.id) ? 'Password security' : 'No security'],
  ]
  return (
    <Modal title="Document properties" close={close} width={500}>
      <div className="px-6 pb-2 grid grid-cols-[140px_1fr] gap-y-2 text-[13px]">
        {rows.map(([k, v]) => (
          <div key={k} className="contents"><span className="text-[#6E6E6E]">{k}</span><span className="break-words">{v}</span></div>
        ))}
      </div>
      <div className="px-6 py-4 flex justify-end gap-2">
        {f && <button onClick={() => { close(); open('explorer', { path: f.folder, select: f.id }) }} className={pill}>Show in folder</button>}
        <button onClick={close} className={pillPrimary}>OK</button>
      </div>
    </Modal>
  )
}

/* ───────────────────────── home ───────────────────────── */

type HomeNav = 'Home' | 'Starred' | 'Agreements' | 'Scans' | 'Shared by you' | 'Shared with you' | 'Your files' | 'Your computer' | 'OneDrive - Northwind Global' | 'SharePoint'

function HomeView({ openDoc, runTool }: { openDoc: (k: string) => void; runTool: (name: string) => void }) {
  const files = useCollection('files')
  const starred = useCollection('acrobat.starred')
  const shares = useCollection('acrobat.shares')
  const annos = useCollection('acrobat.annotations')
  const [nav, setNav] = useState<HomeNav>('Home')
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
  const shareOf = (k: string) => shares.find((s) => s.id === k)
  type Row = { k: string; name: string; when: string; size: string; where?: string }
  const allRows: Row[] = [...recent.map((f) => ({ k: f.open.params.doc, name: f.name, when: f.modified, size: f.size })), ...extra.map((d, i) => ({ k: d.id, name: d.name, when: new Date(Date.now() - (i + 3) * 86400000 * 2).toISOString(), size: d.size }))]
  const localPdfs = files.filter((f) => f.kind === 'pdf' || /\.pdf$/i.test(f.name)).sort((a, b) => (a.modified < b.modified ? 1 : -1))
  const rowsFor = (n: HomeNav): Row[] => {
    switch (n) {
      case 'Home':
        return allRows
      case 'Starred':
        return allRows.filter((r) => starred.some((s) => s.id === r.k))
      case 'Agreements':
        return allRows.filter((r) => /msa|agreement|nda|lease|order form/i.test(r.name))
      case 'Scans':
        return allRows.filter((r) => /^rcpt-/.test(r.k))
      case 'Shared by you':
        return allRows.filter((r) => shareOf(r.k)?.with?.length)
      case 'Shared with you':
        return allRows.filter((r) => annos.some((a) => a.doc === r.k && a.author !== ME.name))
      case 'Your files':
      case 'Your computer':
        return localPdfs.map((f) => ({ k: keyOfFile(f), name: f.name, when: f.modified, size: f.size, where: f.folder }))
      case 'OneDrive - Northwind Global':
        return localPdfs.filter((f) => f.folder.startsWith('OneDrive')).map((f) => ({ k: keyOfFile(f), name: f.name, when: f.modified, size: f.size, where: f.folder }))
      case 'SharePoint':
        return []
    }
  }
  const rows = rowsFor(nav)
  const navItem = (l: HomeNav, I?: any) => (
    <div key={l} role="button" data-agent={`acrobat-home-nav-${l.toLowerCase().replace(/[^a-z]+/g, '-')}`} onClick={() => setNav(l)} className={`h-9 px-3 rounded-lg flex items-center gap-3 cursor-default truncate ${nav === l ? 'bg-[#E4E4E4] font-semibold' : 'hover:bg-[#EDEDED]'}`}>
      {I && <I size={17} />} {l}
    </div>
  )
  return (
    <div className="flex-1 min-h-0 flex">
      <div className="w-[220px] shrink-0 border-r border-[#E1E1E1] py-3 px-2 text-[13px] bg-[#F8F8F8]">
        {([
          [House, 'Home'],
          [Star, 'Starred'],
          [Signature, 'Agreements'],
          [ScanLine, 'Scans'],
          [Share2, 'Shared by you'],
          [Files, 'Shared with you'],
        ] as [any, HomeNav][]).map(([I, l]) => navItem(l, I))}
        <div className="px-3 mt-5 mb-1 text-[11.5px] font-semibold text-[#6E6E6E] uppercase tracking-wide">Files</div>
        {(['Your files', 'Your computer', 'OneDrive - Northwind Global', 'SharePoint'] as HomeNav[]).map((l) => navItem(l))}
      </div>
      <div className="flex-1 overflow-y-auto px-10 py-8 bg-white">
        {nav === 'Home' ? (
          <>
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
                  <button data-agent={`acrobat-use-${t.toLowerCase().replace(/[^a-z]+/g, '-')}`} onClick={() => runTool(t)} className="mt-3 h-8 px-4 rounded-full border-2 border-[#4B4B4B] text-[12.5px] font-semibold hover:bg-[#F3F3F3]">Use now</button>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-[24px] font-bold">{nav}</div>
        )}
        <div className="flex items-center mt-8">
          <div className="text-[15px] font-semibold flex-1">{nav === 'Home' ? 'Recent' : 'Files'}</div>
          <span className="text-[12.5px] text-[#6E6E6E]">{rows.length} files</span>
        </div>
        <div className="mt-2 text-[13px]">
          <div className="flex h-9 items-center border-b border-[#E1E1E1] text-[12px] text-[#6E6E6E] font-semibold">
            <div className="flex-1 pl-2">NAME</div>
            <div className="w-[140px]">{rows.some((r) => r.where) ? 'LOCATION' : 'SHARING'}</div>
            <div className="w-[160px]">OPENED</div>
            <div className="w-[90px] text-right pr-3">SIZE</div>
          </div>
          {rows.length === 0 && <div className="py-10 text-center text-[13px] text-[#6E6E6E]">{nav === 'SharePoint' ? 'Connect a SharePoint site to see its files here.' : nav === 'Starred' ? 'Star files to find them quickly here.' : 'No files yet.'}</div>}
          {rows.map((r) => (
            <div key={r.k + r.name} data-agent={nav === 'Home' ? `acrobat-recent-${r.k}` : undefined} role="row" onClick={() => openDoc(r.k)} className="flex h-12 items-center border-b border-[#F0F0F0] hover:bg-[#F5F5F5] cursor-default">
              <div className="flex-1 min-w-0 flex items-center gap-3 pl-2">
                <span className="w-8 h-10 rounded-sm border border-[#DADADA] bg-white flex items-center justify-center">
                  <FileText size={16} color={RED} />
                </span>
                <div className="min-w-0">
                  <div className="truncate flex items-center gap-1.5">{r.name}{starred.some((s) => s.id === r.k) && <Star size={12} fill="#F5A623" color="#F5A623" />}</div>
                  <div className="text-[11.5px] text-[#6E6E6E]">PDF</div>
                </div>
              </div>
              <div className="w-[140px] text-[#6E6E6E] truncate pr-2">{r.where ? r.where.replace(/\//g, ' › ') : shareOf(r.k)?.with?.length ? `Shared · ${shareOf(r.k)!.with.length}` : 'Only you'}</div>
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

function ToolsView({ runTool }: { runTool: (name: string) => void }) {
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
          <div key={t} role="button" data-agent={`acrobat-alltools-${t.toLowerCase().replace(/[^a-z]+/g, '-')}`} onClick={() => runTool(t)} className="flex items-center gap-3 rounded-xl border border-[#E1E1E1] p-4 hover:shadow-md transition-shadow cursor-pointer">
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
