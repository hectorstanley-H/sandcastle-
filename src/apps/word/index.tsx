import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  ClipboardPaste24Regular,
  Cut20Regular,
  Copy20Regular,
  PaintBrush20Regular,
  TextBold20Regular,
  TextItalic20Regular,
  TextUnderline20Regular,
  TextStrikethrough20Regular,
  TextSubscript20Regular,
  TextSuperscript20Regular,
  TextColor20Regular,
  Highlight20Regular,
  TextClearFormatting20Regular,
  TextChangeCase20Regular,
  TextEffects20Regular,
  TextBulletListLtr20Regular,
  TextNumberListLtr20Regular,
  TextBulletListTree20Regular,
  TextIndentDecreaseLtr20Regular,
  TextIndentIncreaseLtr20Regular,
  TextSortAscending20Regular,
  TextParagraph20Regular,
  TextAlignLeft20Regular,
  TextAlignCenter20Regular,
  TextAlignRight20Regular,
  TextAlignJustify20Regular,
  TextLineSpacing20Regular,
  PaintBucket20Regular,
  BorderBottom20Regular,
  Search20Regular,
  ArrowSwap20Regular,
  Cursor20Regular,
  Mic24Regular,
  TextProofingTools24Regular,
  AppsAddIn24Regular,
  Comment20Regular,
  Edit20Regular,
  Share20Regular,
  ChevronDown12Regular,
  Accessibility16Regular,
  DocumentOnePage16Regular,
  BookOpen16Regular,
  Globe16Regular,
  Add16Regular,
  Subtract16Regular,
  TextGrammarCheckmark20Regular,
  Glasses16Regular,
  Image20Regular,
  Table20Regular,
  Shapes24Regular,
  DocumentAdd24Regular,
  TextColumnTwo20Regular,
  CommentMultiple20Regular,
  DocumentCopy20Regular,
  Textbox20Regular,
  ArrowUp16Regular,
  ArrowDown16Regular,
  DocumentText16Regular,
  CommentAdd20Regular,
  CommentDismiss20Regular,
  ArrowPrevious20Regular,
  ArrowNext20Regular,
  Checkmark20Regular,
  Dismiss20Regular,
  ColorBackground20Regular,
  BorderOutside20Regular,
  CalendarLtr20Regular,
  Symbols20Regular,
  Speaker220Regular,
  Ruler20Regular,
  ZoomFit20Regular,
  Translate20Regular,
  BookAdd20Regular,
  DesignIdeas20Regular,
  Color20Regular,
  TextFont20Regular,
  LockClosed20Regular,
  Mail20Regular,
  QuestionCircle20Regular,
  Link20Regular,
  NumberSymbol20Regular,
  TextboxAlignTop20Regular,
} from '@fluentui/react-icons'
import { logoUrl, type AppProps } from '@/os/registry'
import { useDesk, useWin } from '@/os/context'
import { db, uid, useCollection } from '@/db/db'
import { ME } from '@/data/people'
import { OfficeTitleBar, RibbonTabs, Ribbon, Group, BigBtn, SmBtn, Sep, Backstage, HWorkerChip, CopilotIcon, FONT, OfficeSelect } from './office'
import { Editor, STYLE_CSS, type Para, type PStyle, type EditorOptions } from './Editor'
import { PopMenu, type MenuItem, Modal, Btn, Field, inputCls } from '@/apps/excel/ui'
import { ShareDialog, MessageDialog, PromptDialog } from '@/apps/excel/Dialogs'
import { CopilotPane } from '@/apps/excel/Panes'
import { CommentsPane, EditorPane, NavigationPane, ReplaceDialog, WordCountDialog, proofStats, type WordComment } from './Panes'

const COL = 'word.docs'
const BLUE = '#185ABD'
const ACCENT = '#185ABD'

interface WordDoc {
  id: string
  name: string
  title?: string
  paragraphs: Para[]
  modified: string
  author: string
  createdBy?: string
  updatedBy?: string
  /* optional document settings */
  comments?: WordComment[]
  track?: boolean
  margins?: 'normal' | 'narrow' | 'moderate' | 'wide'
  orientation?: 'portrait' | 'landscape'
  size?: 'letter' | 'legal' | 'a4'
  watermark?: string
  pageColor?: string
  pageBorder?: boolean
  styleSet?: { heading?: string; font?: string; name?: string }
  lineNumbers?: boolean
  sharedWith?: string[]
  pinned?: boolean
}

const TABS = ['Home', 'Insert', 'Draw', 'Design', 'Layout', 'References', 'Mailings', 'Review', 'View', 'Help']

const GALLERY: { key: string; label: string; style?: PStyle; preview: React.CSSProperties; text?: string; fmt?: Partial<Para> }[] = [
  { key: 'normal', label: '¶ Normal', style: 'normal', preview: { fontSize: 13 } },
  { key: 'nospacing', label: '¶ No Spac...', preview: { fontSize: 13 }, fmt: { spaceAfter: 0, lineSpacing: 1 } },
  { key: 'heading1', label: 'Heading 1', style: 'heading1', preview: { fontSize: 15, color: '#0F4761', fontFamily: STYLE_CSS.heading1.font } },
  { key: 'heading2', label: 'Heading 2', style: 'heading2', preview: { fontSize: 13.5, color: '#0F4761', fontFamily: STYLE_CSS.heading2.font } },
  { key: 'title', label: 'Title', style: 'title', preview: { fontSize: 22, fontFamily: STYLE_CSS.title.font, letterSpacing: -0.5 }, text: 'AaBb' },
  { key: 'subtitle', label: 'Subtitle', style: 'subtitle', preview: { fontSize: 13, color: '#595959', letterSpacing: 0.6 } },
  { key: 'subtle', label: 'Subtle Em...', preview: { fontSize: 13, fontStyle: 'italic', color: '#404040' }, fmt: { italic: true, color: '#404040' } },
  { key: 'emphasis', label: 'Emphasis', preview: { fontSize: 13, fontStyle: 'italic' }, fmt: { italic: true } },
  { key: 'intense', label: 'Intense E...', preview: { fontSize: 13, fontStyle: 'italic', color: '#0F4761' }, fmt: { italic: true, color: '#0F4761' } },
  { key: 'strong', label: 'Strong', preview: { fontSize: 13, fontWeight: 700 }, fmt: { bold: true } },
  { key: 'heading3', label: 'Heading 3', style: 'heading3', preview: { fontSize: 13, color: '#0F4761' } },
  { key: 'quote', label: 'Quote', style: 'quote', preview: { fontSize: 13, fontStyle: 'italic', color: '#404040' } },
]

const FONTS = ['Aptos', 'Aptos Display', 'Aptos Narrow', 'Calibri', 'Cambria', 'Arial', 'Georgia', 'Segoe UI', 'Times New Roman', 'Verdana', 'Consolas']
const SIZES = ['8', '9', '10', '11', '12', '14', '16', '18', '20', '24', '28', '36', '48', '72']
const COLORS = ['#000000', '#C00000', '#FF0000', '#FFC000', '#00B050', '#0070C0', '#002060', '#7030A0', '#595959', '#0F4761']
const HIGHLIGHTS = ['#FFFF00', '#00FF00', '#00FFFF', '#FF00FF', '#FFC7CE', '#D9D9D9']
const SUB: Record<string, string> = { '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉', '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎', a: 'ₐ', e: 'ₑ', o: 'ₒ', x: 'ₓ', i: 'ᵢ', n: 'ₙ' }
const SUP: Record<string, string> = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾', n: 'ⁿ', i: 'ⁱ', t: 'ᵗ', h: 'ʰ', s: 'ˢ', d: 'ᵈ', r: 'ʳ' }
const PAGE_SIZES = { letter: [816, 1056], legal: [816, 1344], a4: [794, 1123] } as const
const MARGINS = { normal: 96, narrow: 48, moderate: 72, wide: 192 } as const
const STYLE_SETS: { name: string; heading?: string; font?: string }[] = [
  { name: 'Default' },
  { name: 'Basic (Elegant)', heading: '#262626', font: 'Georgia' },
  { name: 'Lines (Distinctive)', heading: '#7030A0' },
  { name: 'Shaded', heading: '#C55A11', font: 'Calibri' },
  { name: 'Casual', heading: '#2E7D32', font: 'Segoe UI' },
]

function countWords(ps: Para[]) {
  return ps.reduce((n, p) => n + (p.text.trim() ? p.text.trim().split(/\s+/).length : 0), 0)
}
const isTextPara = (p?: Para) => !!p && p.style !== 'table' && p.style !== 'toc' && p.style !== 'pagebreak'

/* ───────────────────────── small ribbon helpers ───────────────────────── */

function MenuBtn({ id, open, setOpen, items, children, width }: { id: string; open: string | null; setOpen: (v: string | null) => void; items: MenuItem[]; children: ReactNode; width?: number }) {
  return (
    <div className="relative">
      {children}
      {open === id && <PopMenu items={items} onClose={() => setOpen(null)} width={width} />}
    </div>
  )
}

/* ───────────────────────── App ───────────────────────── */

export default function Word({ win, params }: AppProps) {
  const { isAgent, toast } = useDesk()
  const { setTitle } = useWin()
  const docs = useCollection<WordDoc>(COL)
  const [docId, setDocId] = useState<string | null>(null)
  const [view, setView] = useState<'doc' | 'backstage'>('doc')
  const [tab, setTab] = useState('Home')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [renaming, setRenaming] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [saveState, setSaveState] = useState<'saved' | 'saving'>('saved')
  const [page, setPage] = useState<[number, number]>([0, 1])
  const [flash, setFlash] = useState(false)
  const saveTimer = useRef<number | undefined>(undefined)
  const [menu, setMenu] = useState<string | null>(null)
  const [pane, setPane] = useState<null | 'comments' | 'editor' | 'copilot'>(null)
  const [nav, setNav] = useState(false)
  const [navQuery, setNavQuery] = useState('')
  const [commentDraft, setCommentDraft] = useState<string | null>(null)
  const [dialog, setDialog] = useState<null | 'replace' | 'share' | 'wordCount' | 'zoom' | 'access' | 'help' | 'table' | 'link'>(null)
  const [marks, setMarks] = useState(false)
  const [layout, setLayout] = useState<'print' | 'web' | 'read' | 'immersive'>('print')
  const [focusMode, setFocusMode] = useState(false)
  const [zoom, setZoom] = useState(100)
  const [ruler, setRuler] = useState(false)
  const [markup, setMarkup] = useState<'simple' | 'all' | 'none'>('simple')
  const [mode, setMode] = useState<'editing' | 'reviewing' | 'viewing'>('editing')
  const [painter, setPainter] = useState<Partial<Para> | null>(null)
  const [selAll, setSelAll] = useState(false)
  const [ribbonHidden, setRibbonHidden] = useState(false)
  const [readPage, setReadPage] = useState(0)
  const [speaking, setSpeaking] = useState(false)
  const [predictions, setPredictions] = useState(true)
  const galleryRef = useRef<HTMLDivElement>(null)
  const clip = useRef<string>('')
  const history = useRef<Para[][]>([])
  const future = useRef<Para[][]>([])
  const lastPush = useRef(0)

  const doc = docs.find((d) => d.id === docId)
  const recents = useMemo(() => [...docs].sort((a, b) => b.modified.localeCompare(a.modified)), [docs])

  const createDoc = (lines?: [PStyle, string][], name?: string) => {
    const names = new Set(db.get<WordDoc>(COL).map((d) => d.name))
    let n = 1
    while (names.has(`Document${n}.docx`)) n++
    let fname = name ? `${name}.docx` : `Document${n}.docx`
    let k = 2
    while (name && names.has(fname)) fname = `${name} ${k++}.docx`
    const id = `doc-${Date.now().toString(36)}`
    const t = `${id}-p1`
    const rec: WordDoc = {
      id,
      name: fname,
      paragraphs: lines
        ? lines.map(([style, text], i) => ({ id: `${id}-p${i + 1}`, style, text }))
        : [
            { id: t, style: 'title', text: '' },
            { id: `${id}-p2`, style: 'normal', text: '' },
          ],
      modified: new Date().toISOString(),
      author: ME.name,
      ...(isAgent ? { createdBy: 'hworker' } : {}),
    }
    db.insert(COL, rec)
    setDocId(id)
    setActiveId(t)
    setView('doc')
    setFlash(true)
  }

  const openDoc = (id: string) => {
    setDocId(id)
    setActiveId(null)
    setView('doc')
    history.current = []
    future.current = []
  }

  // deep links
  useEffect(() => {
    if (params?.newDoc) createDoc()
    else if (params?.docId && db.find(COL, params.docId)) openDoc(params.docId)
    else if (!docId) {
      const latest = [...db.get<WordDoc>(COL)].sort((a, b) => b.modified.localeCompare(a.modified))[0]
      if (latest) openDoc(latest.id)
      else setView('backstage')
    }
  }, [win.nonce])

  useEffect(() => {
    setTitle(doc ? `${doc.name} - Word` : 'Word')
  }, [doc?.name])

  useEffect(() => {
    if (!flash) return
    const t = window.setTimeout(() => setFlash(false), 2400)
    return () => window.clearTimeout(t)
  }, [flash])

  useEffect(() => () => window.clearTimeout(saveTimer.current), [])
  useEffect(() => () => window.speechSynthesis?.cancel(), [])

  const markSaving = () => {
    setSaveState('saving')
    window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => setSaveState('saved'), 900)
  }

  const onParagraphs = (fn: (ps: Para[]) => Para[]) => {
    if (!docId) return
    const cur = db.find<WordDoc>(COL, docId)
    if (!cur) return
    let next = fn(cur.paragraphs)
    if (cur.track) {
      // Track Changes: remember original text / mark inserted paragraphs
      const before = new Map(cur.paragraphs.map((p) => [p.id, p]))
      next = next.map((p) => {
        const old = before.get(p.id)
        if (!old) return p.ins ? p : { ...p, ins: true, insBy: ME.id }
        if (old.text !== p.text && p.orig === undefined && !p.ins) return { ...p, orig: old.text }
        if (p.orig !== undefined && p.orig === p.text) {
          const { orig: _o, ...rest } = p
          return rest
        }
        return p
      })
    }
    const now = Date.now()
    if (now - lastPush.current > 800 || cur.paragraphs.length !== next.length) {
      history.current.push(cur.paragraphs)
      if (history.current.length > 100) history.current.shift()
      future.current = []
    }
    lastPush.current = now
    db.update(COL, docId, { paragraphs: next, modified: new Date().toISOString(), ...(isAgent ? { updatedBy: 'hworker' } : {}) })
    markSaving()
  }
  const patchDoc = (patch: Partial<WordDoc>) => {
    if (!docId) return
    db.update(COL, docId, { ...patch, modified: new Date().toISOString(), ...(isAgent ? { updatedBy: 'hworker' } : {}) })
    markSaving()
  }
  const undo = () => {
    const prev = history.current.pop()
    if (!prev || !docId) return
    future.current.push(db.find<WordDoc>(COL, docId)!.paragraphs)
    lastPush.current = 0
    db.update(COL, docId, { paragraphs: prev, modified: new Date().toISOString() })
  }
  const redo = () => {
    const nxt = future.current.pop()
    if (!nxt || !docId) return
    history.current.push(db.find<WordDoc>(COL, docId)!.paragraphs)
    lastPush.current = 0
    db.update(COL, docId, { paragraphs: nxt, modified: new Date().toISOString() })
  }

  const effActive = doc ? (doc.paragraphs.find((p) => p.id === activeId) ?? doc.paragraphs[doc.paragraphs.length - 1]) : undefined
  const readOnly = mode === 'viewing'

  const apply = (s: PStyle) => {
    if (!effActive || readOnly) return
    onParagraphs((ps) => ps.map((p) => (p.id === effActive.id ? { ...p, style: s } : p)))
  }
  /** apply paragraph formatting to the active paragraph (or every paragraph after Select All) */
  const fmt = (patch: Partial<Para> | ((p: Para) => Partial<Para>)) => {
    if (!effActive || readOnly) return
    onParagraphs((ps) =>
      ps.map((p) => {
        if (!(selAll ? isTextPara(p) : p.id === effActive.id)) return p
        const d = typeof patch === 'function' ? patch(p) : patch
        const n: any = { ...p, ...d }
        for (const k of Object.keys(d)) if (n[k] === undefined) delete n[k]
        return n
      }),
    )
  }
  const toggle = (k: 'bold' | 'italic' | 'underline' | 'strike' | 'caps') => {
    const on = !effActive?.[k]
    fmt({ [k]: on || undefined })
  }

  /** the active textarea and its selection (survives ribbon clicks) */
  const activeTA = () => (effActive ? document.querySelector<HTMLTextAreaElement>(`textarea[data-pid="${effActive.id}"]`) : null)
  const selection = () => {
    const ta = activeTA()
    if (!ta || !effActive) return null
    const a = ta.selectionStart ?? 0
    const b = ta.selectionEnd ?? 0
    return { a, b, text: effActive.text.slice(a, b), ta }
  }
  const transformSel = (fn: (s: string) => string, wholeIfEmpty = true) => {
    if (!effActive || readOnly) return
    const s = selection()
    const [a, b] = s && s.b > s.a ? [s.a, s.b] : wholeIfEmpty ? [0, effActive.text.length] : [0, 0]
    if (a === b) return
    const text = effActive.text.slice(0, a) + fn(effActive.text.slice(a, b)) + effActive.text.slice(b)
    onParagraphs((ps) => ps.map((p) => (p.id === effActive.id ? { ...p, text } : p)))
  }
  const insertAtCaret = (txt: string) => {
    if (!effActive || readOnly || !isTextPara(effActive)) return
    const s = selection()
    const a = s ? s.a : effActive.text.length
    const b = s ? s.b : effActive.text.length
    const text = effActive.text.slice(0, a) + txt + effActive.text.slice(b)
    onParagraphs((ps) => ps.map((p) => (p.id === effActive.id ? { ...p, text } : p)))
    setTimeout(() => {
      const ta = activeTA()
      ta?.focus()
      ta?.setSelectionRange(a + txt.length, a + txt.length)
    })
  }
  const insertBlock = (blocks: Para[], at: 'after' | 'start' = 'after') => {
    if (!doc || readOnly) return
    onParagraphs((ps) => {
      if (at === 'start') {
        const titleIdx = ps[0]?.style === 'title' ? (ps[1]?.style === 'subtitle' ? 2 : 1) : 0
        return [...ps.slice(0, titleIdx), ...blocks, ...ps.slice(titleIdx)]
      }
      const i = ps.findIndex((p) => p.id === effActive?.id)
      const out = [...ps]
      out.splice(i + 1, 0, ...blocks)
      return out
    })
    setActiveId(blocks[blocks.length - 1].id)
  }
  const newPid = () => uid('p')

  const save = () => {
    if (!doc) return
    db.update(COL, doc.id, { modified: new Date().toISOString(), ...(isAgent ? { updatedBy: 'hworker' } : {}) })
    setSaveState('saving')
    window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => setSaveState('saved'), 700)
  }

  const commitRename = () => {
    if (!doc) return
    const v = nameDraft.trim()
    if (v) {
      const name = /\.docx$/i.test(v) ? v : `${v}.docx`
      db.update(COL, doc.id, { name, modified: new Date().toISOString(), ...(isAgent ? { updatedBy: 'hworker' } : {}) })
    }
    setRenaming(false)
  }

  const goTo = (pid: string) => {
    setActiveId(pid)
    setTimeout(() => {
      const ta = document.querySelector<HTMLTextAreaElement>(`textarea[data-pid="${pid}"]`)
      ta?.focus()
      document.querySelector(`[data-para="${pid}"]`)?.scrollIntoView({ block: 'center' })
    })
  }
  const findNext = (q: string) => {
    if (!doc || !q) return false
    const ps = doc.paragraphs
    const start = Math.max(0, ps.findIndex((p) => p.id === effActive?.id))
    for (let k = 1; k <= ps.length; k++) {
      const p = ps[(start + k) % ps.length]
      const i = p.text.toLowerCase().indexOf(q.toLowerCase())
      if (i >= 0) {
        goTo(p.id)
        setTimeout(() => activeTA()?.setSelectionRange(i, i + q.length), 30)
        setTimeout(() => {
          const ta = document.querySelector<HTMLTextAreaElement>(`textarea[data-pid="${p.id}"]`)
          ta?.setSelectionRange(i, i + q.length)
        }, 40)
        return true
      }
    }
    return false
  }
  const replaceAll = (q: string, r: string, mc: boolean) => {
    if (!doc || readOnly) return 0
    const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), mc ? 'g' : 'gi')
    let n = 0
    onParagraphs((ps) =>
      ps.map((p) => {
        const m = p.text.match(re)
        if (!m) return p
        n += m.length
        return { ...p, text: p.text.replace(re, r) }
      }),
    )
    return n
  }

  const speak = (text: string) => {
    const s = window.speechSynthesis
    if (!s) return toast({ appId: 'word', title: 'Read Aloud', body: 'Speech isn’t available in this browser.' })
    if (speaking) {
      s.cancel()
      setSpeaking(false)
      return
    }
    const u = new SpeechSynthesisUtterance(text)
    u.onend = () => setSpeaking(false)
    s.speak(u)
    setSpeaking(true)
  }

  // keyboard shortcuts (capture so they win over the textarea's native behaviour)
  const onKeyCapture = (e: React.KeyboardEvent) => {
    if (view !== 'doc' || !doc) return
    const mod = e.ctrlKey || e.metaKey
    if (e.key === 'Escape') {
      if (layout === 'read' || layout === 'immersive') setLayout('print')
      if (focusMode) setFocusMode(false)
      setPainter(null)
      setSelAll(false)
      return
    }
    if (!mod) return
    const k = e.key.toLowerCase()
    const run = (f: () => void) => {
      e.preventDefault()
      e.stopPropagation()
      f()
    }
    if (k === 'z' && !e.shiftKey) return run(undo)
    if (k === 'y' || (k === 'z' && e.shiftKey)) return run(redo)
    if (k === 'b') return run(() => toggle('bold'))
    if (k === 'i') return run(() => toggle('italic'))
    if (k === 'u') return run(() => toggle('underline'))
    if (k === 'e') return run(() => fmt({ align: effActive?.align === 'center' ? undefined : 'center' }))
    if (k === 'l') return run(() => fmt({ align: undefined }))
    if (k === 'r') return run(() => fmt({ align: 'right' }))
    if (k === 'j') return run(() => fmt({ align: 'justify' }))
    if (k === 's') return run(save)
    if (k === 'f') return run(() => setNav(true))
    if (k === 'h') return run(() => setDialog('replace'))
    if (k === 'k') return run(() => setDialog('link'))
    if (k === 'enter') return run(() => insertBlock([{ id: newPid(), style: 'pagebreak', text: '' }, { id: newPid(), style: 'normal', text: '' }]))
    if (k === 'a' && !(e.target instanceof HTMLTextAreaElement)) return run(() => setSelAll(true))
  }

  const hworker = doc && (doc.createdBy === 'hworker' || doc.updatedBy === 'hworker')
  const words = doc ? countWords(doc.paragraphs) : 0
  const stem = doc?.name.replace(/\.docx$/i, '') ?? ''
  const comments = doc?.comments ?? []
  const [pw0, ph0] = PAGE_SIZES[doc?.size ?? 'letter']
  const landscape = doc?.orientation === 'landscape'
  const pageSetup = { w: landscape ? ph0 : pw0, h: landscape ? pw0 : ph0, margin: MARGINS[doc?.margins ?? 'normal'] }
  const changes = (doc?.paragraphs ?? []).filter((p) => p.orig !== undefined || p.ins)
  const hits = useMemo(() => (nav && navQuery.trim() && doc ? new Set(doc.paragraphs.filter((p) => p.text.toLowerCase().includes(navQuery.trim().toLowerCase())).map((p) => p.id)) : undefined), [nav, navQuery, doc?.paragraphs])
  const commented = useMemo(() => (pane === 'comments' ? new Set(comments.filter((c) => !c.resolved).map((c) => c.pid)) : undefined), [pane, comments])
  const editorOpts: EditorOptions = {
    page: pageSetup,
    marks,
    watermark: doc?.watermark,
    pageColor: doc?.pageColor,
    pageBorder: doc?.pageBorder,
    web: layout === 'web',
    zoom,
    hits,
    commented,
    markup: changes.length && markup !== 'none' ? markup : null,
    readOnly,
    styleSet: doc?.styleSet,
    lineNumbers: doc?.lineNumbers,
  }

  // Format Painter: apply to the next paragraph the user clicks
  useEffect(() => {
    if (!painter || !activeId || !doc) return
    const target = doc.paragraphs.find((p) => p.id === activeId)
    if (!target || target.id === (painter as any).__from) return
    const { __from: _f, ...fm } = painter as any
    onParagraphs((ps) => ps.map((p) => (p.id === target.id ? { ...p, ...fm } : p)))
    setPainter(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId])

  const nextChange = (dir: 1 | -1) => {
    if (!doc || !changes.length) return
    const ids = changes.map((p) => p.id)
    const order = doc.paragraphs.map((p) => p.id)
    const cur = order.indexOf(effActive?.id ?? '')
    const sorted = ids.map((id) => order.indexOf(id)).sort((a, b) => a - b)
    const target = dir > 0 ? (sorted.find((i) => i > cur) ?? sorted[0]) : ([...sorted].reverse().find((i) => i < cur) ?? sorted[sorted.length - 1])
    goTo(order[target])
  }
  const acceptChange = (all: boolean) =>
    onParagraphs((ps) =>
      ps.map((p) => {
        if (!all && p.id !== effActive?.id) return p
        const { orig: _o, ins: _i, insBy: _b, ...rest } = p
        return rest
      }),
    )
  const rejectChange = (all: boolean) =>
    onParagraphs((ps) =>
      ps
        .filter((p) => !(p.ins && (all || p.id === effActive?.id)))
        .map((p) => {
          if (!all && p.id !== effActive?.id) return p
          if (p.orig === undefined) return p
          const { orig, ...rest } = p
          return { ...rest, text: orig }
        }),
    )
  const nextComment = (dir: 1 | -1) => {
    if (!doc || !comments.length) return
    const order = doc.paragraphs.map((p) => p.id)
    const cur = order.indexOf(effActive?.id ?? '')
    const idx = comments.map((c) => order.indexOf(c.pid)).filter((i) => i >= 0).sort((a, b) => a - b)
    const t = dir > 0 ? (idx.find((i) => i > cur) ?? idx[0]) : ([...idx].reverse().find((i) => i < cur) ?? idx[idx.length - 1])
    setPane('comments')
    if (t !== undefined) goTo(order[t])
  }
  const newComment = () => {
    if (!effActive) return
    setPane('comments')
    setCommentDraft(effActive.id)
  }

  const accessibilityIssues = () => {
    if (!doc) return []
    const out: string[] = []
    if (!doc.paragraphs.some((p) => p.style.startsWith('heading'))) out.push('No headings: use Heading styles so people using screen readers can navigate the document.')
    const empties = doc.paragraphs.filter((p, i) => isTextPara(p) && !p.text.trim() && i < doc.paragraphs.length - 1).length
    if (empties > 2) out.push(`${empties} empty paragraphs are used for spacing — use paragraph spacing instead.`)
    if (doc.paragraphs.some((p) => p.style === 'table' && !(p.table?.[0] ?? []).some((c) => c.trim()))) out.push('A table has no header row text.')
    if (doc.paragraphs.some((p) => p.color && ['#FFC000', '#FFFF00', '#00FFFF'].includes(p.color))) out.push('Some text colours may be hard to read (low contrast).')
    return out
  }

  /* ── menus ── */
  const color = (prop: 'color' | 'highlight' | 'shading', list: string[], none: string): MenuItem[] => [
    { label: none, onClick: () => fmt({ [prop]: undefined }) },
    { label: '', sep: true },
    ...list.map((c) => ({ label: c, swatch: c, onClick: () => fmt({ [prop]: c }) })),
  ]
  const tableMenu: MenuItem[] = [2, 3, 4, 5].flatMap((r) =>
    [2, 3, 4].map((c) => ({
      label: `${c} × ${r} table`,
      onClick: () =>
        insertBlock([
          { id: newPid(), style: 'table' as PStyle, text: '', table: Array.from({ length: r }, (_, i) => Array.from({ length: c }, (_, j) => (i === 0 ? `Column ${j + 1}` : ''))) },
          { id: newPid(), style: 'normal' as PStyle, text: '' },
        ]),
    })),
  )
  const menus: Record<string, MenuItem[]> = {
    paste: [
      { label: 'Paste', onClick: () => insertAtCaret(clip.current), disabled: !clip.current },
      { label: 'Keep Text Only', onClick: () => insertAtCaret(clip.current.replace(/\s+/g, ' ')), disabled: !clip.current },
      {
        label: 'Paste from Clipboard',
        onClick: () =>
          navigator.clipboard
            ?.readText()
            .then((t) => t && insertAtCaret(t))
            .catch(() => toast({ appId: 'word', title: 'Paste', body: 'Allow clipboard access to paste from other apps, or press Ctrl+V.' })),
      },
    ],
    case: [
      { label: 'Sentence case.', onClick: () => transformSel((s) => s.toLowerCase().replace(/(^\s*\w|[.!?]\s+\w)/g, (m) => m.toUpperCase())) },
      { label: 'lowercase', onClick: () => transformSel((s) => s.toLowerCase()) },
      { label: 'UPPERCASE', onClick: () => transformSel((s) => s.toUpperCase()) },
      { label: 'Capitalize Each Word', onClick: () => transformSel((s) => s.toLowerCase().replace(/(^|\s)\S/g, (m) => m.toUpperCase())) },
      { label: 'tOGGLE cASE', onClick: () => transformSel((s) => s.replace(/./g, (c) => (c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()))) },
    ],
    effects: [
      { label: 'All Caps', checked: !!effActive?.caps, onClick: () => toggle('caps') },
      { label: 'Strikethrough', checked: !!effActive?.strike, onClick: () => toggle('strike') },
    ],
    underline: [
      { label: 'Underline', checked: !!effActive?.underline, onClick: () => toggle('underline') },
      { label: 'No underline', onClick: () => fmt({ underline: undefined }) },
    ],
    highlight: color('highlight', HIGHLIGHTS, 'No Color'),
    fontColor: color('color', COLORS, 'Automatic'),
    shading: color('shading', ['#F2F2F2', '#D9D9D9', '#DDEBF7', '#E2EFDA', '#FFF2CC', '#FCE4D6'], 'No Color'),
    borders: [
      { label: 'Bottom Border', checked: effActive?.border === 'bottom', onClick: () => fmt({ border: 'bottom' }) },
      { label: 'Outside Borders', checked: effActive?.border === 'box', onClick: () => fmt({ border: 'box' }) },
      { label: 'No Border', onClick: () => fmt({ border: undefined }) },
    ],
    bullets: [
      { label: 'Bullet', checked: effActive?.style === 'bullet', onClick: () => apply('bullet') },
      { label: 'None', onClick: () => apply('normal') },
    ],
    numbering: [
      { label: '1. 2. 3.', checked: effActive?.style === 'number', onClick: () => apply('number') },
      { label: 'Restart at 1', onClick: () => effActive && onParagraphs((ps) => { const i = ps.findIndex((p) => p.id === effActive.id); return ps.flatMap((p, k) => (k === i && i > 0 && ps[i - 1].style === 'number' ? [{ id: newPid(), style: 'normal' as PStyle, text: '' }, p] : [p])) }) },
      { label: 'None', onClick: () => apply('normal') },
    ],
    multilevel: [
      { label: 'Increase List Level', onClick: () => fmt((p) => ({ indent: Math.min(6, (p.indent ?? 0) + 1) })) },
      { label: 'Decrease List Level', onClick: () => fmt((p) => ({ indent: Math.max(0, (p.indent ?? 0) - 1) || undefined })) },
    ],
    spacing: [
      ...[1, 1.15, 1.5, 2, 2.5, 3].map((v) => ({ label: v.toFixed(v === 1.15 ? 2 : 1), checked: (effActive?.lineSpacing ?? 1.15) === v, onClick: () => fmt({ lineSpacing: v === 1.15 ? undefined : v }) })),
      { label: '', sep: true },
      { label: 'Remove Space After Paragraph', onClick: () => fmt({ spaceAfter: 0 }) },
      { label: 'Add Space After Paragraph', onClick: () => fmt({ spaceAfter: undefined }) },
    ],
    select: [
      { label: 'Select All', onClick: () => setSelAll(true) },
      {
        label: 'Select Text with Similar Formatting',
        onClick: () => {
          if (!effActive) return
          setSelAll(true)
          toast({ appId: 'word', title: 'Select', body: `${doc?.paragraphs.filter((p) => p.style === effActive.style).length ?? 0} paragraphs use the “${effActive.style}” style.` })
        },
      },
    ],
    find: [
      { label: 'Find', onClick: () => setNav(true) },
      { label: 'Advanced Find…', onClick: () => setDialog('replace') },
      { label: 'Go To…', onClick: () => setNav(true) },
    ],
    table: [...tableMenu, { label: '', sep: true }, { label: 'Insert Table…', onClick: () => setDialog('table') }],
    symbol: ['©', '®', '™', '€', '£', '¥', '°', '±', '×', '÷', '≤', '≥', '≠', '→', '✓', '•', '§', '¶'].map((s) => ({ label: s, onClick: () => insertAtCaret(s) })),
    date: [
      { label: new Date().toLocaleDateString('en-US'), onClick: () => insertAtCaret(new Date().toLocaleDateString('en-US')) },
      { label: new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }), onClick: () => insertAtCaret(new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })) },
      { label: new Date().toISOString().slice(0, 10), onClick: () => insertAtCaret(new Date().toISOString().slice(0, 10)) },
    ],
    margins: (Object.keys(MARGINS) as (keyof typeof MARGINS)[]).map((m) => ({ label: `${m[0].toUpperCase()}${m.slice(1)} (${MARGINS[m] / 96}")`, checked: (doc?.margins ?? 'normal') === m, onClick: () => patchDoc({ margins: m }) })),
    orientation: (['portrait', 'landscape'] as const).map((o) => ({ label: o[0].toUpperCase() + o.slice(1), checked: (doc?.orientation ?? 'portrait') === o, onClick: () => patchDoc({ orientation: o }) })),
    size: (['letter', 'legal', 'a4'] as const).map((z) => ({ label: z === 'a4' ? 'A4 (8.27" × 11.69")' : z === 'letter' ? 'Letter (8.5" × 11")' : 'Legal (8.5" × 14")', checked: (doc?.size ?? 'letter') === z, onClick: () => patchDoc({ size: z }) })),
    breaks: [
      { label: 'Page Break', onClick: () => insertBlock([{ id: newPid(), style: 'pagebreak', text: '' }, { id: newPid(), style: 'normal', text: '' }]) },
    ],
    lineNumbers: [
      { label: 'None', checked: !doc?.lineNumbers, onClick: () => patchDoc({ lineNumbers: false }) },
      { label: 'Continuous', checked: !!doc?.lineNumbers, onClick: () => patchDoc({ lineNumbers: true }) },
    ],
    watermark: [
      ...['CONFIDENTIAL', 'DO NOT COPY', 'DRAFT', 'SAMPLE', 'URGENT'].map((w) => ({ label: w, checked: doc?.watermark === w, onClick: () => patchDoc({ watermark: w }) })),
      { label: '', sep: true },
      { label: 'Remove Watermark', disabled: !doc?.watermark, onClick: () => patchDoc({ watermark: undefined }) },
    ],
    pageColor: [{ label: 'No Color', onClick: () => patchDoc({ pageColor: undefined }) }, ...['#FFF8E1', '#F1F8E9', '#E3F2FD', '#F3E5F5', '#ECEFF1'].map((c) => ({ label: c, swatch: c, onClick: () => patchDoc({ pageColor: c }) }))],
    styleSets: STYLE_SETS.map((s) => ({ label: s.name, checked: (doc?.styleSet?.name ?? 'Default') === s.name, onClick: () => patchDoc({ styleSet: s.name === 'Default' ? undefined : s }) })),
    colors: [['Office', undefined], ['Blue', '#0F4761'], ['Green', '#2E7D32'], ['Red', '#C00000'], ['Violet', '#7030A0'], ['Grayscale', '#262626']].map(([l, c]) => ({ label: l as string, swatch: c as string | undefined, onClick: () => patchDoc({ styleSet: { ...(doc?.styleSet ?? {}), heading: c as string | undefined, name: 'Custom' } }) })),
    fonts: ['Aptos', 'Calibri', 'Georgia', 'Segoe UI', 'Times New Roman'].map((f) => ({ label: f, checked: (doc?.styleSet?.font ?? 'Aptos') === f, onClick: () => patchDoc({ styleSet: { ...(doc?.styleSet ?? {}), font: f === 'Aptos' ? undefined : f, name: 'Custom' } }) })),
    toc: [
      {
        label: 'Automatic Table 1',
        onClick: () => {
          if (doc?.paragraphs.some((p) => p.style === 'toc')) return toast({ appId: 'word', title: 'Table of Contents', body: 'This document already has a table of contents — it updates automatically.' })
          insertBlock([{ id: newPid(), style: 'toc', text: '' }, { id: newPid(), style: 'pagebreak', text: '' }], 'start')
        },
      },
      { label: 'Remove Table of Contents', disabled: !doc?.paragraphs.some((p) => p.style === 'toc'), onClick: () => onParagraphs((ps) => ps.filter((p) => p.style !== 'toc')) },
    ],
    addText: [
      { label: 'Do Not Show in Table of Contents', onClick: () => apply('normal') },
      { label: 'Level 1', onClick: () => apply('heading1') },
      { label: 'Level 2', onClick: () => apply('heading2') },
      { label: 'Level 3', onClick: () => apply('heading3') },
    ],
    markup: [
      { label: 'Simple Markup', checked: markup === 'simple', onClick: () => setMarkup('simple') },
      { label: 'All Markup', checked: markup === 'all', onClick: () => setMarkup('all') },
      { label: 'No Markup', checked: markup === 'none', onClick: () => setMarkup('none') },
    ],
    accept: [
      { label: 'Accept This Change', onClick: () => acceptChange(false) },
      { label: 'Accept All Changes', onClick: () => acceptChange(true) },
      { label: 'Accept All Changes and Stop Tracking', onClick: () => (acceptChange(true), patchDoc({ track: false })) },
    ],
    reject: [
      { label: 'Reject Change', onClick: () => rejectChange(false) },
      { label: 'Reject All Changes', onClick: () => rejectChange(true) },
    ],
    editing: [
      { label: 'Editing', checked: mode === 'editing', onClick: () => setMode('editing') },
      { label: 'Reviewing', checked: mode === 'reviewing', onClick: () => (setMode('reviewing'), patchDoc({ track: true })) },
      { label: 'Viewing', checked: mode === 'viewing', onClick: () => setMode('viewing') },
    ],
    share: [
      { label: 'Share', onClick: () => setDialog('share') },
      { label: 'Copy link', onClick: () => (navigator.clipboard?.writeText(`https://northwind-my.sharepoint.com/:w:/g/personal/alex/${doc?.id}`).catch(() => {}), toast({ appId: 'word', title: 'Link copied', body: `People in Northwind Global with the link can edit “${doc?.name}”.` })) },
    ],
    ribbon: [
      { label: 'Always show Ribbon', checked: !ribbonHidden, onClick: () => setRibbonHidden(false) },
      { label: 'Show tabs only', checked: ribbonHidden, onClick: () => setRibbonHidden(true) },
      { label: 'Focus mode', checked: focusMode, onClick: () => setFocusMode(true) },
    ],
    zoomMenu: [200, 150, 125, 100, 75, 50].map((z) => ({ label: `${z}%`, checked: zoom === z, onClick: () => setZoom(z) })),
  }
  const mb = (id: string, items: MenuItem[], node: ReactNode, width?: number) => (
    <MenuBtn key={id} id={id} open={menu} setOpen={setMenu} items={items} width={width}>
      {node}
    </MenuBtn>
  )
  const open = (id: string) => () => setMenu((m) => (m === id ? null : id))
  const big = (I: any, cls = '') => <I className={`w-7 h-7 ${cls}`} />

  /* ── ribbons ── */
  const homeRibbon = (
    <Ribbon>
      <Group label="Clipboard">
        {mb('paste', menus.paste, <BigBtn icon={<ClipboardPaste24Regular className="w-8 h-8" />} label="Paste" dropdown agent="word-paste" onClick={open('paste')} />)}
        <div className="flex flex-col gap-0.5 pt-0.5">
          <SmBtn icon={<Cut20Regular />} label="Cut" agent="word-cut" onClick={() => {
            const s = selection()
            if (!s || s.b <= s.a || !effActive) return
            clip.current = s.text
            navigator.clipboard?.writeText(s.text).catch(() => {})
            transformSel(() => '', false)
          }} />
          <SmBtn icon={<Copy20Regular />} label="Copy" agent="word-copy" onClick={() => {
            const s = selection()
            const t = s && s.b > s.a ? s.text : (effActive?.text ?? '')
            clip.current = t
            navigator.clipboard?.writeText(t).catch(() => {})
          }} />
          <SmBtn icon={<PaintBrush20Regular />} label="Format Painter" agent="word-format-painter" active={!!painter} onClick={() => {
            if (painter || !effActive) return setPainter(null)
            const { id, style: _s, text: _t, table: _tb, orig: _o, ins: _i, insBy: _b, ...fm } = effActive
            setPainter({ ...fm, __from: id } as any)
          }} />
        </div>
      </Group>
      <Group label="Font">
        <div className="flex flex-col gap-1.5 pt-1">
          <div className="flex items-center gap-1">
            <OfficeSelect agent="word-font" value={effActive?.font ?? doc?.styleSet?.font ?? (effActive?.style === 'title' || effActive?.style?.startsWith('heading') ? 'Aptos Display (Headings)' : 'Aptos (Body)')} width={150} title="Font" options={FONTS} onChange={(v) => fmt({ font: v })} />
            <OfficeSelect agent="word-font-size" value={String(effActive?.size ?? Math.round((STYLE_CSS[effActive?.style ?? 'normal'].size * 3) / 4))} width={46} title="Font Size" options={SIZES} onChange={(v) => fmt({ size: Number(v) })} />
            <SmBtn title="Increase Font Size" onClick={() => fmt((p) => ({ size: Math.min(96, (p.size ?? Math.round((STYLE_CSS[p.style].size * 3) / 4)) + 2) }))} icon={<span className="text-[14px] font-medium">A<sup className="text-[8px]">^</sup></span>} />
            <SmBtn title="Decrease Font Size" onClick={() => fmt((p) => ({ size: Math.max(6, (p.size ?? Math.round((STYLE_CSS[p.style].size * 3) / 4)) - 2) }))} icon={<span className="text-[12px] font-medium">A<sup className="text-[8px]">˅</sup></span>} />
            {mb('case', menus.case, <SmBtn title="Change Case" icon={<TextChangeCase20Regular />} dropdown onClick={open('case')} />, 200)}
            <SmBtn title="Clear All Formatting" onClick={() => fmt({ bold: undefined, italic: undefined, underline: undefined, strike: undefined, caps: undefined, color: undefined, highlight: undefined, shading: undefined, size: undefined, font: undefined, align: undefined, lineSpacing: undefined, spaceAfter: undefined, border: undefined })} icon={<TextClearFormatting20Regular />} />
          </div>
          <div className="flex items-center gap-[1px]">
            <SmBtn agent="word-bold" title="Bold (Ctrl+B)" icon={<TextBold20Regular />} active={!!effActive?.bold} onClick={() => toggle('bold')} />
            <SmBtn agent="word-italic" title="Italic (Ctrl+I)" icon={<TextItalic20Regular />} active={!!effActive?.italic} onClick={() => toggle('italic')} />
            {mb('underline', menus.underline, <SmBtn agent="word-underline" title="Underline (Ctrl+U)" icon={<TextUnderline20Regular />} dropdown active={!!effActive?.underline} onClick={() => toggle('underline')} />)}
            <SmBtn title="Strikethrough" icon={<TextStrikethrough20Regular />} active={!!effActive?.strike} onClick={() => toggle('strike')} />
            <SmBtn title="Subscript" icon={<TextSubscript20Regular />} onClick={() => transformSel((s) => s.replace(/./g, (c) => SUB[c] ?? c), false)} />
            <SmBtn title="Superscript" icon={<TextSuperscript20Regular />} onClick={() => transformSel((s) => s.replace(/./g, (c) => SUP[c] ?? c), false)} />
            <Sep />
            {mb('effects', menus.effects, <SmBtn title="Text Effects and Typography" icon={<TextEffects20Regular className="text-[#2B7CD3]" />} dropdown onClick={open('effects')} />)}
            {mb('highlight', menus.highlight, <SmBtn title="Text Highlight Color" onClick={open('highlight')} icon={<span className="relative"><Highlight20Regular /><span className="absolute left-0.5 right-0.5 -bottom-0.5 h-[3px] bg-[#FFFF00]" /></span>} dropdown />, 180)}
            {mb('fontColor', menus.fontColor, <SmBtn title="Font Color" onClick={open('fontColor')} icon={<span className="relative"><TextColor20Regular /><span className="absolute left-0.5 right-0.5 -bottom-0.5 h-[3px] bg-[#C00000]" /></span>} dropdown />, 180)}
          </div>
        </div>
      </Group>
      <Group label="Paragraph">
        <div className="flex flex-col gap-1.5 pt-1">
          <div className="flex items-center gap-[1px]">
            <SmBtn agent="word-style-bullet" title="Bullets" icon={<TextBulletListLtr20Regular />} dropdown active={effActive?.style === 'bullet'} onClick={() => apply(effActive?.style === 'bullet' ? 'normal' : 'bullet')} />
            <SmBtn agent="word-style-number" title="Numbering" icon={<TextNumberListLtr20Regular />} dropdown active={effActive?.style === 'number'} onClick={() => apply(effActive?.style === 'number' ? 'normal' : 'number')} />
            {mb('multilevel', menus.multilevel, <SmBtn title="Multilevel List" icon={<TextBulletListTree20Regular />} dropdown onClick={open('multilevel')} />, 200)}
            <Sep />
            <SmBtn title="Decrease Indent" icon={<TextIndentDecreaseLtr20Regular />} onClick={() => fmt((p) => ({ indent: Math.max(0, (p.indent ?? 0) - 1) || undefined }))} />
            <SmBtn title="Increase Indent" icon={<TextIndentIncreaseLtr20Regular />} onClick={() => fmt((p) => ({ indent: Math.min(6, (p.indent ?? 0) + 1) }))} />
            <Sep />
            <SmBtn
              title="Sort"
              icon={<TextSortAscending20Regular />}
              onClick={() => {
                if (!doc || !effActive || readOnly) return
                // sort the contiguous block of same-style paragraphs around the cursor (e.g. a list) A→Z
                const ps = doc.paragraphs
                const i = ps.findIndex((p) => p.id === effActive.id)
                let a = i
                let b = i
                while (a > 0 && ps[a - 1].style === effActive.style && ps[a - 1].text) a--
                while (b < ps.length - 1 && ps[b + 1].style === effActive.style && ps[b + 1].text) b++
                const block = ps.slice(a, b + 1).sort((x, y) => x.text.localeCompare(y.text, 'en', { numeric: true }))
                onParagraphs((all) => [...all.slice(0, a), ...block, ...all.slice(b + 1)])
              }}
            />
            <SmBtn title="Show/Hide ¶" agent="word-show-marks" icon={<TextParagraph20Regular />} active={marks} onClick={() => setMarks((m) => !m)} />
          </div>
          <div className="flex items-center gap-[1px]">
            <SmBtn title="Align Left" icon={<TextAlignLeft20Regular />} active={!effActive?.align || effActive.align === 'left'} onClick={() => fmt({ align: undefined })} />
            <SmBtn title="Center" agent="word-align-center" icon={<TextAlignCenter20Regular />} active={effActive?.align === 'center'} onClick={() => fmt({ align: 'center' })} />
            <SmBtn title="Align Right" icon={<TextAlignRight20Regular />} active={effActive?.align === 'right'} onClick={() => fmt({ align: 'right' })} />
            <SmBtn title="Justify" icon={<TextAlignJustify20Regular />} active={effActive?.align === 'justify'} onClick={() => fmt({ align: 'justify' })} />
            <Sep />
            {mb('spacing', menus.spacing, <SmBtn title="Line and Paragraph Spacing" icon={<TextLineSpacing20Regular />} dropdown onClick={open('spacing')} />, 240)}
            <Sep />
            {mb('shading', menus.shading, <SmBtn title="Shading" icon={<PaintBucket20Regular />} dropdown onClick={open('shading')} />, 180)}
            {mb('borders', menus.borders, <SmBtn title="Borders" icon={<BorderBottom20Regular />} dropdown onClick={open('borders')} />)}
          </div>
        </div>
      </Group>
      <Group label="Styles" className="flex-1 min-w-[200px]">
        <div className="flex items-stretch h-[68px] min-w-0 w-full">
          <div ref={galleryRef} className="flex-1 min-w-0 flex overflow-hidden border border-[#E0E0E0] rounded-[4px] scroll-smooth">
            {GALLERY.map((g) => {
              const on = g.style && g.style === (effActive?.style === 'bullet' || effActive?.style === 'number' ? 'normal' : effActive?.style)
              return (
                <button
                  key={g.key}
                  data-agent={g.style ? `word-style-${g.style}` : `word-style-${g.key}`}
                  aria-label={`Style: ${g.label.replace('¶ ', '')}`}
                  title={g.label.replace('¶ ', '')}
                  onClick={() => (g.style ? apply(g.style) : g.fmt && fmt(g.fmt))}
                  className={`shrink-0 w-[74px] h-full flex flex-col items-center justify-center gap-1.5 border ${on ? 'border-[#8A8A8A] bg-[#EBEBEB]' : 'border-transparent hover:bg-[#F0F0F0] hover:border-[#D1D1D1]'}`}
                >
                  <span className="h-[26px] flex items-end leading-none whitespace-nowrap text-[#000]" style={{ fontFamily: STYLE_CSS.normal.font, ...g.preview }}>
                    {g.text ?? 'AaBbCcDd'}
                  </span>
                  <span className="text-[11px] text-[#242424] leading-none whitespace-nowrap">{g.label}</span>
                </button>
              )
            })}
          </div>
          <div className="w-[18px] flex flex-col border border-l-0 border-[#E0E0E0] rounded-r-[4px] text-[#616161]">
            <button aria-label="Previous styles" onClick={() => galleryRef.current?.scrollBy({ left: -222 })} className="flex-1 flex items-center justify-center hover:bg-[#F0F0F0]"><ArrowUp16Regular className="w-3 h-3" /></button>
            <button aria-label="More styles" onClick={() => galleryRef.current?.scrollBy({ left: 222 })} className="flex-1 flex items-center justify-center hover:bg-[#F0F0F0]"><ArrowDown16Regular className="w-3 h-3" /></button>
            {mb(
              'stylesAll',
              GALLERY.map((g) => ({ label: g.label.replace('¶ ', '').replace('...', ''), checked: !!g.style && g.style === effActive?.style, onClick: () => (g.style ? apply(g.style) : g.fmt && fmt(g.fmt)) })),
              <button aria-label="All styles" onClick={open('stylesAll')} className="flex-1 w-full flex items-center justify-center hover:bg-[#F0F0F0]"><ChevronDown12Regular className="w-3 h-3" /></button>,
              180,
            )}
          </div>
        </div>
      </Group>
      <Group label="Editing">
        <div className="flex flex-col gap-0.5 pt-0.5">
          {mb('find', menus.find, <SmBtn icon={<Search20Regular />} label="Find" agent="word-find" dropdown onClick={() => setNav((n) => !n)} />)}
          <SmBtn icon={<ArrowSwap20Regular />} label="Replace" agent="word-replace" onClick={() => setDialog('replace')} />
          {mb('select', menus.select, <SmBtn icon={<Cursor20Regular />} label="Select" dropdown onClick={open('select')} />, 260)}
        </div>
      </Group>
      <Group label="Voice">
        <BigBtn icon={<Mic24Regular className="w-7 h-7" />} label="Dictate" dropdown />
      </Group>
      <Group label="Editor">
        <BigBtn icon={<TextProofingTools24Regular className="w-7 h-7 text-[#185ABD]" />} label="Editor" agent="word-editor" active={pane === 'editor'} onClick={() => setPane((p) => (p === 'editor' ? null : 'editor'))} />
      </Group>
      <Group label="Add-ins">
        <BigBtn icon={<AppsAddIn24Regular className="w-7 h-7" />} label="Add-ins" />
      </Group>
      <Group label="Copilot" last>
        <BigBtn icon={<CopilotIcon size={30} />} label="Copilot" agent="word-copilot" active={pane === 'copilot'} onClick={() => setPane((p) => (p === 'copilot' ? null : 'copilot'))} />
      </Group>
    </Ribbon>
  )

  const g = (label: string, items: ReactNode[], last?: boolean) => (
    <Group key={label} label={label} last={last}>
      {items}
    </Group>
  )
  const B = (I: any, l: string, onClick?: () => void, opts: { agent?: string; active?: boolean; menuId?: string; items?: MenuItem[]; cls?: string } = {}) => {
    const btn = <BigBtn key={l} icon={big(I, opts.cls)} label={l} aria={l.replace('\n', ' ')} dropdown={!!opts.menuId || l.includes('▾')} agent={opts.agent} active={opts.active} onClick={opts.menuId ? open(opts.menuId) : onClick} />
    return opts.menuId && opts.items ? mb(opts.menuId, opts.items, btn, 230) : btn
  }
  const sets: Record<string, ReactNode[]> = {
    Insert: [
      g('Pages', [
        B(DocumentAdd24Regular, 'Cover\nPage', () =>
          doc && !readOnly &&
          onParagraphs((ps) => [
            { id: newPid(), style: 'title', text: doc.title ?? stem },
            { id: newPid(), style: 'subtitle', text: `${ME.name} · ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}` },
            { id: newPid(), style: 'pagebreak', text: '' },
            ...ps,
          ]),
        ),
        B(DocumentOnePage16Regular, 'Blank\nPage', () => insertBlock([{ id: newPid(), style: 'pagebreak', text: '' }, { id: newPid(), style: 'normal', text: '' }, { id: newPid(), style: 'pagebreak', text: '' }])),
        B(DocumentText16Regular, 'Page\nBreak', () => insertBlock([{ id: newPid(), style: 'pagebreak', text: '' }, { id: newPid(), style: 'normal', text: '' }])),
      ]),
      g('Tables', [B(Table20Regular, 'Table', undefined, { menuId: 'table', items: menus.table, agent: 'word-insert-table' })]),
      g('Illustrations', [B(Image20Regular, 'Pictures'), B(Shapes24Regular, 'Shapes'), B(TextColumnTwo20Regular, 'Chart')]),
      g('Links', [B(Link20Regular, 'Link', () => setDialog('link'))]),
      g('Comments', [B(CommentAdd20Regular, 'Comment', newComment, { agent: 'word-insert-comment' })]),
      g('Text', [B(Textbox20Regular, 'Text\nBox'), B(TextEffects20Regular, 'WordArt'), B(CalendarLtr20Regular, 'Date &\nTime', undefined, { menuId: 'date', items: menus.date })]),
      g('Symbols', [B(Symbols20Regular, 'Symbol', undefined, { menuId: 'symbol', items: menus.symbol })], true),
    ],
    Design: [
      g('Document Formatting', [B(DesignIdeas20Regular, 'Style\nSets', undefined, { menuId: 'styleSets', items: menus.styleSets }), B(Color20Regular, 'Colors', undefined, { menuId: 'colors', items: menus.colors }), B(TextFont20Regular, 'Fonts', undefined, { menuId: 'fonts', items: menus.fonts })]),
      g(
        'Page Background',
        [
          B(TextboxAlignTop20Regular, 'Watermark', undefined, { menuId: 'watermark', items: menus.watermark, agent: 'word-watermark' }),
          B(ColorBackground20Regular, 'Page\nColor', undefined, { menuId: 'pageColor', items: menus.pageColor }),
          B(BorderOutside20Regular, 'Page\nBorders', () => patchDoc({ pageBorder: !doc?.pageBorder }), { active: !!doc?.pageBorder }),
        ],
        true,
      ),
    ],
    Layout: [
      g('Page Setup', [
        B(DocumentOnePage16Regular, 'Margins', undefined, { menuId: 'margins', items: menus.margins }),
        B(DocumentText16Regular, 'Orientation', undefined, { menuId: 'orientation', items: menus.orientation, agent: 'word-orientation' }),
        B(DocumentCopy20Regular, 'Size', undefined, { menuId: 'size', items: menus.size }),
        B(TextColumnTwo20Regular, 'Columns'),
        B(DocumentAdd24Regular, 'Breaks', undefined, { menuId: 'breaks', items: menus.breaks }),
        B(NumberSymbol20Regular, 'Line\nNumbers', undefined, { menuId: 'lineNumbers', items: menus.lineNumbers }),
      ]),
      g('Paragraph', [B(TextLineSpacing20Regular, 'Spacing', undefined, { menuId: 'spacing2', items: menus.spacing }), B(TextIndentIncreaseLtr20Regular, 'Indent', () => fmt((p) => ({ indent: Math.min(6, (p.indent ?? 0) + 1) })))]),
      g('Arrange', [B(Image20Regular, 'Position'), B(TextAlignJustify20Regular, 'Wrap\nText')], true),
    ],
    References: [
      g('Table of Contents', [
        B(BookOpen16Regular, 'Table of\nContents', undefined, { menuId: 'toc', items: menus.toc, agent: 'word-toc' }),
        B(TextBulletListTree20Regular, 'Add Text', undefined, { menuId: 'addText', items: menus.addText }),
        B(ArrowSwap20Regular, 'Update\nTable', () => toast({ appId: 'word', title: 'Table of Contents', body: doc?.paragraphs.some((p) => p.style === 'toc') ? 'Table of contents updated — page numbers are current.' : 'Insert a table of contents first.' })),
      ]),
      g('Footnotes', [B(BookAdd20Regular, 'Insert\nFootnote')]),
      g('Citations & Bibliography', [B(BookOpen16Regular, 'Insert\nCitation')], true),
    ],
    Mailings: [
      g('Create', [B(Mail20Regular, 'Envelopes'), B(DocumentText16Regular, 'Labels')]),
      g('Start Mail Merge', [B(Mail20Regular, 'Start Mail\nMerge'), B(Edit20Regular, 'Select\nRecipients')], true),
    ],
    Review: [
      g('Proofing', [
        B(TextGrammarCheckmark20Regular, 'Spelling &\nGrammar', () => setPane('editor')),
        B(TextProofingTools24Regular, 'Editor', () => setPane((p) => (p === 'editor' ? null : 'editor')), { cls: 'text-[#185ABD]', active: pane === 'editor' }),
        B(NumberSymbol20Regular, 'Word\nCount', () => setDialog('wordCount'), { agent: 'word-word-count' }),
      ]),
      g('Speech', [B(Speaker220Regular, 'Read\nAloud', () => speak(effActive?.text || doc?.paragraphs.map((p) => p.text).join('. ') || ''), { active: speaking })]),
      g('Accessibility', [B(Accessibility16Regular, 'Check\nAccessibility', () => setDialog('access'))]),
      g('Language', [B(Translate20Regular, 'Translate')]),
      g('Comments', [
        B(CommentAdd20Regular, 'New\nComment', newComment, { agent: 'word-new-comment' }),
        B(CommentDismiss20Regular, 'Delete', () => effActive && patchDoc({ comments: comments.filter((c) => c.pid !== effActive.id) })),
        B(ArrowPrevious20Regular, 'Previous', () => nextComment(-1)),
        B(ArrowNext20Regular, 'Next', () => nextComment(1)),
        B(CommentMultiple20Regular, 'Show\nComments', () => setPane((p) => (p === 'comments' ? null : 'comments')), { active: pane === 'comments' }),
      ]),
      g('Tracking', [B(Edit20Regular, 'Track\nChanges', () => patchDoc({ track: !doc?.track }), { active: !!doc?.track, agent: 'word-track-changes' }), B(DocumentText16Regular, 'Display for\nReview', undefined, { menuId: 'markup', items: menus.markup })]),
      g(
        'Changes',
        [
          B(Checkmark20Regular, 'Accept', undefined, { menuId: 'accept', items: menus.accept }),
          B(Dismiss20Regular, 'Reject', undefined, { menuId: 'reject', items: menus.reject }),
          B(ArrowPrevious20Regular, 'Previous\nChange', () => nextChange(-1)),
          B(ArrowNext20Regular, 'Next\nChange', () => nextChange(1)),
        ],
        true,
      ),
    ],
    View: [
      g('Views', [
        B(BookOpen16Regular, 'Read\nMode', () => (setLayout('read'), setReadPage(0))),
        B(DocumentOnePage16Regular, 'Print\nLayout', () => setLayout('print'), { active: layout === 'print' }),
        B(Globe16Regular, 'Web\nLayout', () => setLayout('web'), { active: layout === 'web' }),
      ]),
      g('Immersive', [B(Glasses16Regular, 'Focus', () => setFocusMode(true)), B(BookOpen16Regular, 'Immersive\nReader', () => setLayout('immersive'))]),
      g('Show', [B(Ruler20Regular, 'Ruler', () => setRuler((r) => !r), { active: ruler }), B(Search20Regular, 'Navigation\nPane', () => setNav((n) => !n), { active: nav })]),
      g('Zoom', [B(Search20Regular, 'Zoom', () => setDialog('zoom')), B(DocumentOnePage16Regular, '100%', () => setZoom(100)), B(ZoomFit20Regular, 'Page\nWidth', () => setZoom(120))], true),
    ],
    Draw: [g('Tools', [B(Edit20Regular, 'Draw')], true)],
    Help: [g('Help', [B(QuestionCircle20Regular, 'Help', () => setDialog('help')), B(Comment20Regular, 'Feedback', () => toast({ appId: 'word', title: 'Thanks for your feedback', body: 'Your feedback was sent to Microsoft.' }))], true)],
  }

  const filenameButton = doc && (
    <div className="relative">
      <button
        data-agent="word-filename"
        aria-label="File name"
        onClick={() => {
          setNameDraft(stem)
          setRenaming((r) => !r)
        }}
        className="h-8 flex items-center gap-1 px-2 rounded hover:bg-white/15 text-[12px] max-w-[420px]"
      >
        <span className="truncate font-semibold">{stem}</span>
        <span className="opacity-90 whitespace-nowrap">• {saveState === 'saving' ? 'Saving...' : 'Saved to OneDrive'}</span>
        <ChevronDown12Regular className="shrink-0" />
      </button>
      {renaming && (
        <div className="absolute left-0 top-9 z-50 w-[340px] bg-white text-[#242424] rounded-[8px] shadow-[0_8px_16px_rgba(0,0,0,0.14),0_0_2px_rgba(0,0,0,0.12)] p-4" onPointerDown={(e) => e.stopPropagation()}>
          <label className="block text-[12px] font-semibold mb-1">File Name</label>
          <div className="flex items-center border border-[#D1D1D1] border-b-[#616161] rounded-[4px] focus-within:border-b-[#185ABD] focus-within:border-b-2 h-8 px-2">
            <input
              data-agent="word-title"
              aria-label="File Name"
              autoFocus={!isAgent}
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename()
                if (e.key === 'Escape') setRenaming(false)
              }}
              className="flex-1 outline-none text-[13px] bg-transparent"
            />
            <span className="text-[12px] text-[#616161]">.docx</span>
          </div>
          <label className="block text-[12px] font-semibold mt-3 mb-1">Location</label>
          <div className="flex items-center gap-2 text-[12.5px] text-[#424242]">
            <img src={logoUrl('onedrive')} className="w-4 h-4" alt="" />
            OneDrive - Northwind Global » Documents
          </div>
          <div className="mt-3 pt-3 border-t border-[#EDEBE9] flex items-center justify-between text-[12.5px]">
            <span className="text-[#185ABD]">Version History</span>
            <button onClick={commitRename} className="h-7 px-3 rounded-[4px] bg-[#185ABD] text-white text-[12px] font-semibold">Save</button>
          </div>
        </div>
      )}
    </div>
  )

  const st = doc ? proofStats(doc.paragraphs) : null
  const backstagePanes: Record<string, ReactNode> | undefined = doc
    ? {
        Info: (
          <div className="grid grid-cols-[1fr_280px] gap-10 text-[13px] max-w-[860px]">
            <div className="space-y-3">
              <div className="text-[18px]">{doc.name}</div>
              <div className="rounded-md border border-[#E1E1E1] p-4">
                <div className="font-semibold mb-1">Protect Document</div>
                <div className="text-[#616161] mb-2">{mode === 'viewing' ? 'This document is open for viewing only.' : 'Control what types of changes people can make to this document.'}</div>
                <button onClick={() => setMode(mode === 'viewing' ? 'editing' : 'viewing')} className="h-8 px-3 rounded border border-[#C7C7C7] hover:bg-[#F5F5F5] flex items-center gap-1.5">
                  <LockClosed20Regular className="w-4 h-4" /> {mode === 'viewing' ? 'Enable Editing' : 'Always Open Read-Only'}
                </button>
              </div>
              <div className="rounded-md border border-[#E1E1E1] p-4">
                <div className="font-semibold mb-1">Inspect Document</div>
                <div className="text-[#616161]">{comments.length} comments · {changes.length} tracked changes · {doc.paragraphs.filter((p) => p.style === 'table').length} tables</div>
              </div>
            </div>
            <div className="space-y-2 text-[12.5px]">
              <div className="font-semibold text-[13.5px]">Properties</div>
              {[
                ['Size', `${Math.max(12, Math.round(JSON.stringify(doc).length / 1024))} KB`],
                ['Pages', String(page[1])],
                ['Words', st?.words.toLocaleString() ?? '0'],
                ['Total Editing Time', `${Math.max(1, Math.round((Date.now() - new Date(doc.modified).getTime()) / 60000) % 240)} Minutes`],
                ['Title', doc.title ?? stem],
                ['Author', doc.author],
                ['Last Modified', new Date(doc.modified).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })],
              ].map(([k, v]) => (
                <div key={k} className="grid grid-cols-[120px_1fr]">
                  <span className="text-[#616161]">{k}</span>
                  <span>{v}</span>
                </div>
              ))}
            </div>
          </div>
        ),
        Print: (
          <div className="flex gap-10">
            <div className="w-[240px] space-y-3 text-[13px]">
              <Field label="Printer">
                <select className={inputCls}>
                  <option>NW-BOS-4F-MFP01 (Ready)</option>
                  <option>Microsoft Print to PDF</option>
                </select>
              </Field>
              <Field label="Pages">
                <select className={inputCls}>
                  <option>Print All Pages ({page[1]})</option>
                  <option>Print Current Page</option>
                </select>
              </Field>
              <button
                data-agent="word-print"
                onClick={() => toast({ appId: 'word', title: 'Sent to printer', body: `“${doc.name}” (${page[1]} page${page[1] === 1 ? '' : 's'}) sent to NW-BOS-4F-MFP01.` })}
                className="h-9 px-6 rounded text-white font-semibold"
                style={{ background: BLUE }}
              >
                Print
              </button>
            </div>
            <div className="bg-white shadow-[0_2px_10px_rgba(0,0,0,0.2)] p-8 overflow-hidden text-[8px] leading-[1.35]" style={{ width: landscape ? 440 : 340, height: landscape ? 340 : 440 }}>
              {doc.paragraphs.slice(0, 40).map((p) => (
                <div key={p.id} style={{ fontSize: p.style === 'title' ? 16 : p.style.startsWith('heading') ? 11 : 8, color: p.style.startsWith('heading') ? '#0F4761' : '#000', marginBottom: 3 }}>
                  {p.style === 'bullet' ? '• ' : ''}
                  {p.text}
                </div>
              ))}
            </div>
          </div>
        ),
        Export: (
          <div className="max-w-[520px] space-y-3">
            {[
              ['Download as PDF', 'pdf'],
              ['Download as ODT', 'odt'],
              ['Download as Plain Text', 'txt'],
            ].map(([l, ext]) => (
              <button key={ext} onClick={() => toast({ appId: 'word', title: 'Download complete', body: `${stem}.${ext} was saved to Downloads.` })} className="w-full h-14 px-4 rounded border border-[#E1E1E1] hover:bg-[#F5F5F5] text-left text-[13.5px]">
                {l}
              </button>
            ))}
          </div>
        ),
        'Save a Copy': (
          <SaveCopyPane
            initial={`${stem} - Copy`}
            onSave={(n) => {
              const id = uid('doc')
              db.insert(COL, { ...JSON.parse(JSON.stringify(doc)), id, name: `${n}.docx`, modified: new Date().toISOString(), author: ME.name, pinned: false, comments: [] })
              openDoc(id)
            }}
          />
        ),
        Account: (
          <div className="text-[13px] space-y-2">
            <div className="text-[15px] font-semibold">{ME.name}</div>
            <div className="text-[#616161]">{ME.email}</div>
            <div className="text-[#616161]">Microsoft 365 Apps for enterprise · Word for the web</div>
          </div>
        ),
        Options: (
          <div className="text-[13px] space-y-2">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={predictions} onChange={(e) => setPredictions(e.target.checked)} /> Text Predictions
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={marks} onChange={(e) => setMarks(e.target.checked)} /> Always show formatting marks
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={ruler} onChange={(e) => setRuler(e.target.checked)} /> Show ruler
            </label>
          </div>
        ),
      }
    : undefined

  const TEMPLATES: [string, string, [PStyle, string][]][] = [
    ['Welcome to Word', 'bg-gradient-to-b from-[#185ABD] to-[#2B7CD3]', [['title', 'Welcome to Word'], ['subtitle', 'Tips for getting started'], ['heading1', 'Write and format'], ['bullet', 'Use the Styles gallery to apply headings — they build your Navigation pane and table of contents.'], ['bullet', 'Select text and press Ctrl+B, Ctrl+I or Ctrl+U.'], ['heading1', 'Review together'], ['bullet', 'Turn on Track Changes on the Review tab, then share the document.'], ['bullet', 'Add comments with Review ▸ New Comment.'], ['normal', '']]],
    ['Single spaced (blank)', '', [['normal', '']]],
    ['Modern report', 'bg-[linear-gradient(#fff_55%,#1F3864_55%)]', [['title', 'Report title'], ['subtitle', 'Subtitle'], ['heading1', 'Executive summary'], ['normal', 'Summarize the key findings in two or three sentences.'], ['heading1', 'Findings'], ['heading2', 'Finding 1'], ['normal', ''], ['heading1', 'Recommendations'], ['number', '']]],
    ['Meeting notes', '', [['title', 'Meeting notes'], ['subtitle', new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })], ['heading2', 'Attendees'], ['bullet', ''], ['heading2', 'Agenda'], ['number', ''], ['heading2', 'Decisions'], ['bullet', ''], ['heading2', 'Action items'], ['bullet', '']]],
    ['Project plan', 'bg-[linear-gradient(#0F4761_22%,#fff_22%)]', [['title', 'Project plan'], ['heading1', 'Goals'], ['bullet', ''], ['heading1', 'Scope'], ['normal', ''], ['heading1', 'Milestones'], ['number', 'Kick-off'], ['number', 'Pilot'], ['number', 'Go-live'], ['heading1', 'Risks'], ['bullet', '']]],
  ]

  const showChrome = !focusMode && layout !== 'read' && layout !== 'immersive'

  return (
    <div className="relative flex-1 min-h-0 flex flex-col bg-[#F3F3F3] text-[#242424]" style={{ fontFamily: FONT }} onPointerDown={() => renaming && setRenaming(false)} onKeyDownCapture={onKeyCapture}>
      {showChrome && (
        <OfficeTitleBar
          app="word"
          color={BLUE}
          fileName={doc?.name ?? 'Word'}
          status="Saved"
          onSave={save}
          saveAgentId="word-save"
          saving={saveState === 'saving'}
          filenameButton={filenameButton}
          onUndo={undo}
          onRedo={redo}
          onSearch={(q) => {
            setNav(true)
            setNavQuery(q)
          }}
          onCopilot={() => setPane((p) => (p === 'copilot' ? null : 'copilot'))}
          onRibbonOptions={() => setMenu((m) => (m === 'ribbon' ? null : 'ribbon'))}
        />
      )}
      {menu === 'ribbon' && (
        <div className="absolute right-[150px] top-[40px] z-50">
          <PopMenu items={menus.ribbon} onClose={() => setMenu(null)} style={{ top: 0, marginTop: 0 }} free />
        </div>
      )}
      {view === 'backstage' ? (
        <Backstage
          app="word"
          color={BLUE}
          appName="Word"
          greeting="Good afternoon"
          canBack={!!doc}
          onBack={() => setView('doc')}
          onOpen={openDoc}
          recents={recents.map((d) => ({
            id: d.id,
            name: d.name,
            location: 'OneDrive - Northwind Global » Documents',
            modified: d.modified,
            agentId: `word-doc-${d.id}`,
            hworker: d.createdBy === 'hworker' || d.updatedBy === 'hworker',
            pinned: !!d.pinned,
            shared: d.author !== ME.name,
          }))}
          onPin={(id, pinned) => db.update(COL, id, { pinned })}
          panes={backstagePanes}
          onCommand={(l) => {
            if (l === 'Share' && doc) (setView('doc'), setDialog('share'))
            if (l === 'Close') {
              setDocId(null)
            }
            if (l === 'Feedback') toast({ appId: 'word', title: 'Feedback', body: 'Thanks — your feedback helps improve Word.' })
          }}
          newTiles={
            <>
              <button data-agent="word-new" aria-label="Blank document" onClick={() => createDoc()} className="group text-left">
                <div className="w-[148px] h-[190px] bg-white border border-[#D1D1D1] group-hover:border-[#185ABD] group-hover:shadow-md" />
                <div className="text-[13px] mt-2">Blank document</div>
              </button>
              {TEMPLATES.map(([l, bg, lines]) => (
                <button key={l} data-agent={`word-template-${l.toLowerCase().replace(/[^a-z]+/g, '-')}`} onClick={() => createDoc(lines, l === 'Single spaced (blank)' ? undefined : l)} className="group text-left">
                  <div className={`w-[148px] h-[190px] border border-[#D1D1D1] group-hover:border-[#185ABD] group-hover:shadow-md bg-white p-3 flex flex-col gap-1.5 ${bg}`}>
                    {!bg && (
                      <>
                        <span className="h-2.5 w-20 bg-[#0F4761]/70 rounded-sm" />
                        {Array.from({ length: 9 }, (_, i) => (
                          <span key={i} className="h-1 bg-[#C8C8C8] rounded-sm" style={{ width: `${70 + ((i * 37) % 30)}%` }} />
                        ))}
                      </>
                    )}
                  </div>
                  <div className="text-[13px] mt-2">{l}</div>
                </button>
              ))}
            </>
          }
        />
      ) : (
        <>
          {showChrome && (
            <RibbonTabs
              tabs={TABS}
              active={tab}
              accent={ACCENT}
              fileAgentId="word-file-tab"
              onFile={() => setView('backstage')}
              onTab={(t) => {
                setTab(t)
                setRibbonHidden(false)
              }}
              right={
                <>
                  <button data-agent="word-comments-button" onClick={() => setPane((p) => (p === 'comments' ? null : 'comments'))} className={`h-[28px] px-2.5 flex items-center gap-1.5 rounded-[4px] border border-[#D1D1D1] text-[12.5px] hover:bg-[#F5F5F5] ${pane === 'comments' ? 'bg-[#E8F0FB]' : 'bg-white'}`}><Comment20Regular className="w-4 h-4" /> Comments</button>
                  {mb('editing', menus.editing, <button data-agent="word-editing-mode" onClick={open('editing')} className="h-[28px] px-2.5 flex items-center gap-1.5 rounded-[4px] border border-[#D1D1D1] bg-white text-[12.5px] hover:bg-[#F5F5F5]"><Edit20Regular className="w-4 h-4" /> {mode === 'editing' ? 'Editing' : mode === 'reviewing' ? 'Reviewing' : 'Viewing'} <ChevronDown12Regular /></button>, 180)}
                  <div className="relative">
                    <button data-agent="word-share" onClick={(e) => ((e.target as HTMLElement).closest('[data-chev]') ? setMenu((m) => (m === 'share' ? null : 'share')) : setDialog('share'))} className="h-[28px] px-3 flex items-center gap-1.5 rounded-[4px] text-white text-[12.5px] font-semibold" style={{ background: BLUE }}><Share20Regular className="w-4 h-4" /> Share <span data-chev className="inline-flex"><ChevronDown12Regular /></span></button>
                    {menu === 'share' && <PopMenu items={menus.share} onClose={() => setMenu(null)} style={{ left: 'auto', right: 0 }} />}
                  </div>
                </>
              }
            />
          )}
          {showChrome && !ribbonHidden && (tab === 'Home' ? homeRibbon : <Ribbon>{sets[tab] ?? [g(tab, [B(Edit20Regular, tab)], true)]}</Ribbon>)}
          {showChrome && ruler && (
            <div className="h-[22px] shrink-0 bg-[#F3F3F3] flex justify-center">
              <div className="relative h-full bg-white border-x border-[#C8C8C8]" style={{ width: pageSetup.w * (zoom / 100) }}>
                <div className="absolute top-0 bottom-0 bg-[#E6E6E6]" style={{ left: 0, width: pageSetup.margin * (zoom / 100) }} />
                <div className="absolute top-0 bottom-0 bg-[#E6E6E6]" style={{ right: 0, width: pageSetup.margin * (zoom / 100) }} />
                {Array.from({ length: Math.floor(pageSetup.w / 48) }, (_, i) => (
                  <span key={i} className="absolute bottom-0 text-[9px] text-[#616161]" style={{ left: i * 48 * (zoom / 100) }}>
                    {i % 2 === 0 ? (
                      <>
                        <span className="block w-px h-[8px] bg-[#8A8A8A]" />
                        {i / 2}
                      </>
                    ) : (
                      <span className="block w-px h-[4px] bg-[#8A8A8A] mb-[10px]" />
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}
          {(selAll || painter || readOnly) && showChrome && (
            <div className="h-7 shrink-0 flex items-center gap-2 px-4 text-[12px] bg-[#FFF4CE] border-b border-[#F2E2A8]">
              {readOnly ? 'Viewing — this document is read-only. Switch to Editing to make changes.' : painter ? 'Format Painter: click a paragraph to copy the formatting to it.' : 'All paragraphs are selected — formatting applies to the whole document.'}
              <button onClick={() => (readOnly ? setMode('editing') : (setSelAll(false), setPainter(null)))} className="ml-auto font-semibold text-[#185ABD] hover:underline">
                {readOnly ? 'Edit' : 'Done'}
              </button>
            </div>
          )}
          {doc ? (
            <div className={`flex-1 min-h-0 flex ${flash ? 'flash-new' : ''}`}>
              {nav && <NavigationPane paragraphs={doc.paragraphs} query={navQuery} setQuery={setNavQuery} onGo={goTo} activeId={effActive?.id} onClose={() => (setNav(false), setNavQuery(''))} />}
              <div className="flex-1 min-w-0 flex flex-col" onPointerDown={() => selAll && setSelAll(false)}>
                <Editor key={doc.id} paragraphs={doc.paragraphs} activeId={activeId} setActive={setActiveId} onParagraphs={onParagraphs} onPage={(p, n) => setPage([p, n])} opts={editorOpts} />
              </div>
              {pane === 'comments' && (
                <CommentsPane
                  comments={comments}
                  paragraphs={doc.paragraphs}
                  activeId={effActive?.id}
                  draftFor={commentDraft}
                  onAdd={(pid, text) => {
                    patchDoc({ comments: [...comments, { id: uid('cmt'), pid, author: ME.id, text, at: new Date().toISOString(), quote: doc.paragraphs.find((p) => p.id === pid)?.text.slice(0, 80) }] })
                    setCommentDraft(null)
                  }}
                  onReply={(id, text) => patchDoc({ comments: comments.map((c) => (c.id === id ? { ...c, replies: [...(c.replies ?? []), { author: ME.id, text, at: new Date().toISOString() }] } : c)) })}
                  onResolve={(id) => patchDoc({ comments: comments.map((c) => (c.id === id ? { ...c, resolved: !c.resolved } : c)) })}
                  onDelete={(id) => patchDoc({ comments: comments.filter((c) => c.id !== id) })}
                  onGo={goTo}
                  onClose={() => (setPane(null), setCommentDraft(null))}
                />
              )}
              {pane === 'editor' && (
                <EditorPane
                  paragraphs={doc.paragraphs}
                  onGo={goTo}
                  onFix={(pid, from, to) => onParagraphs((ps) => ps.map((p) => (p.id === pid ? { ...p, text: p.text.replace(from, to) } : p)))}
                  onClose={() => setPane(null)}
                />
              )}
              {pane === 'copilot' && (
                <CopilotPane
                  agent="word-copilot-pane"
                  title="About this document"
                  placeholder="Ask about this document"
                  summary={docSummary(doc.paragraphs)}
                  suggestions={[
                    {
                      label: 'Summarize this document',
                      run: () => docSummary(doc.paragraphs).join(' '),
                    },
                    {
                      label: 'List the action items',
                      run: () => {
                        const items = doc.paragraphs.filter((p) => (p.style === 'bullet' || p.style === 'number') && /\b(owner|due|by|will|must|need|submit|send|review|complete)\b/i.test(p.text))
                        return items.length ? items.slice(0, 6).map((p) => `• ${p.text}`).join('\n') : 'I didn’t find explicit action items in this document.'
                      },
                    },
                    {
                      label: 'Add a summary section',
                      run: () => {
                        insertBlock([{ id: newPid(), style: 'heading1', text: 'Summary' }, ...docSummary(doc.paragraphs).slice(1).map((t) => ({ id: newPid(), style: 'bullet' as PStyle, text: t }))], 'start')
                        return 'Added a Summary section near the top of the document.'
                      },
                    },
                    {
                      label: 'Rewrite this paragraph more concisely',
                      run: () => {
                        if (!effActive || !isTextPara(effActive) || !effActive.text) return 'Place the cursor in a paragraph first.'
                        const t = effActive.text.replace(/\b(very|really|basically|actually|in order)\s/gi, '').replace(/\s{2,}/g, ' ').replace(/\butilize\b/gi, 'use')
                        onParagraphs((ps) => ps.map((p) => (p.id === effActive.id ? { ...p, text: t } : p)))
                        return t === effActive.text ? 'That paragraph is already concise.' : 'Done — removed filler words.'
                      },
                    },
                  ]}
                  onClose={() => setPane(null)}
                />
              )}
            </div>
          ) : (
            <div className="flex-1 bg-[#E6E6E6]" />
          )}
          {/* status bar */}
          {showChrome && (
            <div className="h-[26px] shrink-0 flex items-center px-3 text-[12px] text-[#424242] bg-[#F3F3F3] border-t border-[#E0E0E0] gap-4 select-none">
              <button onClick={() => setNav(true)} className="hover:bg-[#E0E0E0] rounded px-1 -mx-1">Page {page[0] + 1} of {page[1]}</button>
              <button data-agent="word-status-words" onClick={() => setDialog('wordCount')} className="hover:bg-[#E0E0E0] rounded px-1 -mx-1">{words.toLocaleString()} words</button>
              <button onClick={() => setPane('editor')} className="flex items-center hover:bg-[#E0E0E0] rounded" title="Editor"><TextGrammarCheckmark20Regular className="w-4 h-4" /></button>
              <span>English (United States)</span>
              <button onClick={() => setPredictions((v) => !v)} className="hover:bg-[#E0E0E0] rounded px-1 -mx-1">Text Predictions: {predictions ? 'On' : 'Off'}</button>
              <button onClick={() => setDialog('access')} className="flex items-center gap-1 hover:bg-[#E0E0E0] rounded px-1 -mx-1"><Accessibility16Regular /> Accessibility: {accessibilityIssues().length ? 'Investigate' : 'Good to go'}</button>
              {doc?.track && <span className="font-semibold text-[#C00000]">Track Changes: On</span>}
              {hworker && <HWorkerChip />}
              <span className="flex-1" />
              <button onClick={() => setFocusMode(true)} className="flex items-center gap-1 hover:bg-[#E0E0E0] rounded px-1"><Glasses16Regular /> Focus</button>
              <span className="flex items-center gap-0.5">
                <button className="w-7 h-[22px] flex items-center justify-center rounded hover:bg-[#E0E0E0]" title="Read Mode" onClick={() => (setLayout('read'), setReadPage(0))}><BookOpen16Regular /></button>
                <button className={`w-7 h-[22px] flex items-center justify-center rounded ${layout === 'print' ? 'bg-[#DADADA]' : 'hover:bg-[#E0E0E0]'}`} title="Print Layout" onClick={() => setLayout('print')}><DocumentOnePage16Regular /></button>
                <button className={`w-7 h-[22px] flex items-center justify-center rounded ${layout === 'web' ? 'bg-[#DADADA]' : 'hover:bg-[#E0E0E0]'}`} title="Web Layout" onClick={() => setLayout('web')}><Globe16Regular /></button>
              </span>
              <span className="flex items-center gap-1.5">
                <button aria-label="Zoom out" onClick={() => setZoom((z) => Math.max(10, z - 10))}><Subtract16Regular className="w-3.5 h-3.5" /></button>
                <span
                  className="relative w-[100px] h-[2px] bg-[#8A8A8A] cursor-pointer before:absolute before:-top-[6px] before:-bottom-[6px] before:inset-x-0"
                  onMouseDown={(e) => {
                    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
                    const t = (e.clientX - r.left) / r.width
                    setZoom(Math.round((t <= 0.5 ? 10 + t * 2 * 90 : 100 + (t - 0.5) * 2 * 400) / 10) * 10)
                  }}
                >
                  <span className="absolute -top-[6px] w-[4px] h-[14px] -ml-[2px] bg-[#424242] rounded-sm" style={{ left: `${zoom <= 100 ? ((zoom - 10) / 90) * 50 : 50 + ((zoom - 100) / 400) * 50}%` }} />
                </span>
                <button aria-label="Zoom in" onClick={() => setZoom((z) => Math.min(500, z + 10))}><Add16Regular className="w-3.5 h-3.5" /></button>
                <button className="w-9 text-right hover:underline" onClick={() => setDialog('zoom')}>{zoom}%</button>
              </span>
            </div>
          )}
        </>
      )}

      {/* Focus mode exit */}
      {focusMode && view === 'doc' && (
        <button onClick={() => setFocusMode(false)} className="absolute right-4 top-3 z-40 h-8 px-3 rounded bg-white/90 shadow text-[12.5px] hover:bg-white">
          Exit Focus (Esc)
        </button>
      )}

      {/* Read Mode */}
      {layout === 'read' && doc && view === 'doc' && <ReadMode doc={doc} page={readPage} setPage={setReadPage} onClose={() => setLayout('print')} />}
      {layout === 'immersive' && doc && view === 'doc' && <Immersive doc={doc} onClose={() => setLayout('print')} speak={speak} speaking={speaking} />}

      {/* dialogs */}
      {dialog === 'replace' && <ReplaceDialog initial={navQuery} onFind={findNext} onReplaceAll={replaceAll} onClose={() => setDialog(null)} />}
      {dialog === 'wordCount' && doc && <WordCountDialog paragraphs={doc.paragraphs} onClose={() => setDialog(null)} />}
      {dialog === 'share' && doc && (
        <ShareDialog
          prefix="word"
          accent={BLUE}
          name={doc.name}
          sharedWith={doc.sharedWith ?? []}
          onShare={(emails) => {
            patchDoc({ sharedWith: Array.from(new Set([...(doc.sharedWith ?? []), ...emails])) })
            toast({ appId: 'word', title: 'Link sent', body: `${emails.length} ${emails.length === 1 ? 'person' : 'people'} can now edit “${doc.name}”.` })
          }}
          onCopy={() => {
            navigator.clipboard?.writeText(`https://northwind-my.sharepoint.com/:w:/g/personal/alex/${doc.id}`).catch(() => {})
            toast({ appId: 'word', title: 'Link copied', body: 'Paste it anywhere to share this document.' })
          }}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'zoom' && <PromptDialog title="Zoom" label="Zoom to" options={['200%', '150%', '125%', '100%', '75%', '50%']} initial={`${zoom}%`} onOk={(v) => setZoom(parseInt(v) || 100)} onClose={() => setDialog(null)} />}
      {dialog === 'link' && (
        <PromptDialog
          title="Insert Link"
          label="Address"
          initial="https://"
          onOk={(v) => v && v !== 'https://' && insertAtCaret(selection()?.text ? ` (${v})` : v)}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'table' && <TableDialog onOk={(r, c) => insertBlock([{ id: newPid(), style: 'table', text: '', table: Array.from({ length: r }, (_, i) => Array.from({ length: c }, (_, j) => (i === 0 ? `Column ${j + 1}` : ''))) }, { id: newPid(), style: 'normal', text: '' }])} onClose={() => setDialog(null)} />}
      {dialog === 'access' && (
        <MessageDialog title="Accessibility Assistant" onClose={() => setDialog(null)}>
          {accessibilityIssues().length ? (
            <ul className="list-disc pl-4 space-y-1">
              {accessibilityIssues().map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          ) : (
            'No accessibility issues found. People with disabilities should not have difficulty reading this document.'
          )}
        </MessageDialog>
      )}
      {dialog === 'help' && (
        <MessageDialog title="Word Help" onClose={() => setDialog(null)}>
          <ul className="list-disc pl-4 space-y-1">
            <li>Ctrl+B / I / U — bold, italic, underline the current paragraph.</li>
            <li>Ctrl+E / L / R / J — center, left, right, justify.</li>
            <li>Ctrl+F opens the Navigation pane, Ctrl+H Find and Replace.</li>
            <li>Ctrl+Enter inserts a page break. Tab / Shift+Tab change a list level.</li>
            <li>Review ▸ Track Changes records edits so others can accept or reject them.</li>
          </ul>
        </MessageDialog>
      )}
    </div>
  )
}

function docSummary(ps: Para[]) {
  const title = ps.find((p) => p.style === 'title')?.text
  const heads = ps.filter((p) => p.style === 'heading1' && p.text.trim()).map((p) => p.text)
  const firstNormal = ps.find((p) => p.style === 'normal' && p.text.split(/\s+/).length > 8)?.text
  const out = [`${title ? `“${title}”` : 'This document'} has ${countWords(ps).toLocaleString()} words across ${heads.length || 'no'} main section${heads.length === 1 ? '' : 's'}.`]
  if (heads.length) out.push(`Sections: ${heads.slice(0, 6).join(', ')}${heads.length > 6 ? '…' : ''}.`)
  if (firstNormal) out.push(firstNormal.split(/(?<=[.!?])\s/)[0])
  const lists = ps.filter((p) => p.style === 'bullet' || p.style === 'number').length
  if (lists) out.push(`It contains ${lists} list item${lists === 1 ? '' : 's'}.`)
  return out
}

function SaveCopyPane({ initial, onSave }: { initial: string; onSave: (name: string) => void }) {
  const [n, setN] = useState(initial)
  return (
    <div className="flex items-center gap-2 max-w-[560px]">
      <input data-agent="word-save-copy-name" value={n} onChange={(e) => setN(e.target.value)} className="flex-1 h-9 px-2 rounded border border-[#C7C7C7] outline-none focus:border-[#185ABD] text-[13px]" />
      <span className="text-[13px] text-[#616161]">.docx</span>
      <button disabled={!n.trim()} onClick={() => onSave(n.trim())} className="h-9 px-4 rounded text-white text-[13px] font-semibold disabled:opacity-50" style={{ background: BLUE }}>
        Save
      </button>
    </div>
  )
}

function TableDialog({ onOk, onClose }: { onOk: (r: number, c: number) => void; onClose: () => void }) {
  const [r, setR] = useState(3)
  const [c, setC] = useState(3)
  return (
    <Modal
      title="Insert Table"
      width={320}
      onClose={onClose}
      footer={
        <>
          <Btn primary color={BLUE} onClick={() => (onOk(r, c), onClose())}>
            OK
          </Btn>
          <Btn onClick={onClose}>Cancel</Btn>
        </>
      }
    >
      <Field label="Number of columns">
        <input type="number" min={1} max={10} className={inputCls} value={c} onChange={(e) => setC(Math.max(1, Math.min(10, Number(e.target.value))))} />
      </Field>
      <Field label="Number of rows">
        <input type="number" min={1} max={40} className={inputCls} value={r} onChange={(e) => setR(Math.max(1, Math.min(40, Number(e.target.value))))} />
      </Field>
    </Modal>
  )
}

function ReadMode({ doc, page, setPage, onClose }: { doc: WordDoc; page: number; setPage: (n: number) => void; onClose: () => void }) {
  // two columns per screen, ~22 paragraphs per column
  const cols: Para[][] = []
  let cur: Para[] = []
  let weight = 0
  for (const p of doc.paragraphs) {
    const w = p.style === 'pagebreak' ? 99 : Math.ceil(Math.max(1, p.text.length) / 70) + (p.style.startsWith('heading') || p.style === 'title' ? 2 : 0)
    if (weight + w > 26 && cur.length) {
      cols.push(cur)
      cur = []
      weight = 0
    }
    if (p.style !== 'pagebreak') cur.push(p)
    weight += Math.min(w, 26)
  }
  if (cur.length) cols.push(cur)
  const screens = Math.max(1, Math.ceil(cols.length / 2))
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown') setPage(Math.min(screens - 1, page + 1))
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') setPage(Math.max(0, page - 1))
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [page, screens])
  return (
    <div className="absolute inset-0 z-[60] bg-[#F7F3EB] flex flex-col" data-agent="word-read-mode">
      <div className="h-10 shrink-0 flex items-center px-4 text-[13px] text-[#424242] border-b border-[#E6DFD3]">
        <span className="font-semibold">{doc.name.replace(/\.docx$/i, '')}</span>
        <span className="ml-auto mr-4">Screen {page + 1} of {screens}</span>
        <button onClick={onClose} className="h-7 px-3 rounded hover:bg-black/5">Edit Document</button>
      </div>
      <div className="flex-1 min-h-0 grid grid-cols-2 gap-16 px-24 py-10 overflow-hidden" style={{ fontFamily: "'Aptos', 'Segoe UI', sans-serif" }}>
        {[cols[page * 2], cols[page * 2 + 1]].map((col, i) => (
          <div key={i} className="text-[16px] leading-[1.6] text-[#262626] overflow-hidden">
            {(col ?? []).map((p) =>
              p.style === 'table' ? (
                <table key={p.id} className="text-[13px] border-collapse my-2">
                  <tbody>
                    {(p.table ?? []).map((row, r) => (
                      <tr key={r}>
                        {row.map((c, j) => (
                          <td key={j} className="border border-[#BFB8AA] px-2 py-0.5">
                            {c}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p key={p.id} className="mb-2" style={{ fontSize: p.style === 'title' ? 30 : p.style === 'heading1' ? 22 : p.style === 'heading2' ? 18 : undefined, color: p.style.startsWith('heading') ? '#0F4761' : undefined, paddingLeft: p.style === 'bullet' || p.style === 'number' ? 18 : 0, fontWeight: p.bold ? 700 : undefined, fontStyle: p.italic ? 'italic' : undefined }}>
                  {p.style === 'bullet' ? '• ' : ''}
                  {p.text}
                </p>
              ),
            )}
          </div>
        ))}
      </div>
      <button aria-label="Previous screen" disabled={page === 0} onClick={() => setPage(page - 1)} className="absolute left-3 top-1/2 w-10 h-16 rounded bg-black/5 hover:bg-black/10 disabled:opacity-30 text-[22px]">
        ‹
      </button>
      <button aria-label="Next screen" disabled={page >= screens - 1} onClick={() => setPage(page + 1)} className="absolute right-3 top-1/2 w-10 h-16 rounded bg-black/5 hover:bg-black/10 disabled:opacity-30 text-[22px]">
        ›
      </button>
    </div>
  )
}

function Immersive({ doc, onClose, speak, speaking }: { doc: WordDoc; onClose: () => void; speak: (t: string) => void; speaking: boolean }) {
  const [size, setSize] = useState(28)
  const [spacing, setSpacing] = useState(true)
  const [theme, setTheme] = useState<'light' | 'sepia' | 'dark'>('sepia')
  const bg = theme === 'dark' ? '#1F1F1F' : theme === 'sepia' ? '#F4ECD8' : '#FFFFFF'
  const fg = theme === 'dark' ? '#F3F3F3' : '#262626'
  return (
    <div className="absolute inset-0 z-[60] flex flex-col" style={{ background: bg, color: fg }} data-agent="word-immersive-reader">
      <div className="h-12 shrink-0 flex items-center gap-3 px-4 text-[13px] border-b border-black/10">
        <span className="font-semibold">Immersive Reader</span>
        <button onClick={() => setSize((s) => Math.max(16, s - 4))} className="w-8 h-8 rounded hover:bg-black/10">A−</button>
        <button onClick={() => setSize((s) => Math.min(48, s + 4))} className="w-8 h-8 rounded hover:bg-black/10">A+</button>
        <button onClick={() => setSpacing((s) => !s)} className="h-8 px-2 rounded hover:bg-black/10">{spacing ? 'Narrow spacing' : 'Wide spacing'}</button>
        {(['light', 'sepia', 'dark'] as const).map((t) => (
          <button key={t} onClick={() => setTheme(t)} className={`h-8 px-2 rounded capitalize ${theme === t ? 'bg-black/15' : 'hover:bg-black/10'}`}>
            {t}
          </button>
        ))}
        <button onClick={() => speak(doc.paragraphs.map((p) => p.text).join('. '))} className="h-8 px-3 rounded hover:bg-black/10">
          {speaking ? '■ Stop' : '▶ Read aloud'}
        </button>
        <button onClick={onClose} className="ml-auto h-8 px-3 rounded hover:bg-black/10">
          Close Immersive Reader
        </button>
      </div>
      <div className="flex-1 overflow-auto px-[12%] py-10" style={{ fontSize: size, lineHeight: spacing ? 2 : 1.5, letterSpacing: spacing ? 1.5 : 0, wordSpacing: spacing ? 6 : 0 }}>
        {doc.paragraphs
          .filter((p) => p.text.trim())
          .map((p) => (
            <p key={p.id} className="mb-6" style={{ fontWeight: p.style === 'title' || p.style.startsWith('heading') ? 600 : 400 }}>
              {p.text}
            </p>
          ))}
      </div>
    </div>
  )
}
