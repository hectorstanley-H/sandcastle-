import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  ClipboardPaste24Regular,
  Cut20Regular,
  Copy20Regular,
  PaintBrush20Regular,
  SlideAdd24Regular,
  SlideLayout20Regular,
  ArrowReset20Regular,
  TextBold20Regular,
  TextItalic20Regular,
  TextUnderline20Regular,
  TextStrikethrough20Regular,
  TextColor20Regular,
  TextBulletListLtr20Regular,
  TextNumberListLtr20Regular,
  TextAlignLeft20Regular,
  TextAlignCenter20Regular,
  TextAlignRight20Regular,
  TextAlignJustify20Regular,
  Shapes24Regular,
  Square20Regular,
  Circle20Regular,
  ArrowRight20Regular,
  Search20Regular,
  ArrowSwap20Regular,
  Mic24Regular,
  DesignIdeas24Regular,
  Comment20Regular,
  Share20Regular,
  ChevronDown12Regular,
  Record20Regular,
  Play20Regular,
  Notepad16Regular,
  Accessibility16Regular,
  Subtract16Regular,
  Add16Regular,
  ArrowFit16Regular,
  Grid16Regular,
  SlideMultiple16Regular,
  BookOpen16Regular,
  Desktop16Regular,
  Dismiss20Regular,
  ChevronLeft20Regular,
  ChevronRight20Regular,
  TabDesktop20Regular,
  ArrowSort20Regular,
  Triangle20Regular,
  Star20Regular,
  Textbox20Regular,
  Table20Regular,
  Image20Regular,
  Icons20Regular,
  DataBarVertical20Regular,
  DocumentHeaderFooter20Regular,
  Video20Regular,
  ColorBackground20Regular,
  SlideSize20Regular,
  SlideTransition20Regular,
  SlidePlay20Regular,
  SlideHide20Regular,
  Timer20Regular,
  Presenter20Regular,
  ShareScreenStart20Regular,
  CommentAdd20Regular,
  CommentMultiple20Regular,
  TextGrammarCheckmark20Regular,
  SlideGrid20Regular,
  SlideText20Regular,
  Ruler20Regular,
  Grid20Regular,
  QuestionCircle20Regular,
  Sparkle20Regular,
  Eye20Regular,
  Delete16Regular,
  CheckmarkCircle16Regular,
} from '@fluentui/react-icons'
import type { AppProps } from '@/os/registry'
import { useDesk, useWin } from '@/os/context'
import { db, uid, useCollection, useRecord } from '@/db/db'
import { Avatar } from '@/components/Avatar'
import { ME, PEOPLE } from '@/data/people'
import { fmtSmart } from '@/data/time'
import { Backstage, BigBtn, CopilotIcon, Group, HWorkerChip, OfficeTitleBar, Ribbon, RibbonTabs, SmBtn, Sep, OfficeSelect } from '@/apps/word/office'
import { PopMenu, type MenuItem, Modal, Btn, Field, inputCls } from '@/apps/excel/ui'
import { ShareDialog, MessageDialog } from '@/apps/excel/Dialogs'
import { CopilotPane, SidePane } from '@/apps/excel/Panes'
import { SH, SW, SlideView, THEMES, type Shape, type Slide, type TextFmt } from './Slide'

const ORANGE = '#C43E1C'
const COL = 'powerpoint.decks'
const TABS = ['Home', 'Insert', 'Draw', 'Design', 'Transitions', 'Animations', 'Slide Show', 'Record', 'Review', 'View', 'Help']

interface Deck {
  id: string
  name: string
  modified: string
  footer?: string
  slides: Slide[]
  createdBy?: string
  updatedBy?: string
  theme?: string
  author?: string
  showNumbers?: boolean
  showFooter?: boolean
  sharedWith?: string[]
  pinned?: boolean
}

const LAYOUTS: [Slide['layout'], string][] = [
  ['title', 'Title Slide'],
  ['titleContent', 'Title and Content'],
  ['section', 'Section Header'],
  ['twoContent', 'Two Content'],
  ['chart', 'Title and Chart'],
  ['closing', 'Closing'],
]
const TRANSITIONS = ['None', 'Morph', 'Fade', 'Push', 'Wipe', 'Split', 'Reveal']
const ANIMATIONS = ['None', 'Appear', 'Fade', 'Fly In', 'Float In', 'Split', 'Wipe']
const FONTS = ['Aptos', 'Aptos Display', 'Calibri', 'Arial', 'Georgia', 'Segoe UI', 'Trebuchet MS', 'Century Gothic']
const SIZES = ['12', '14', '16', '18', '20', '24', '28', '32', '36', '40', '44', '54', '60']
const FILLS = ['#156082', '#E97132', '#196B24', '#0F9ED5', '#A02B93', '#C00000', '#FFC000', '#262626', '#FFFFFF']

/** CSS keyframes for slide transitions / previews */
const TRANSITION_CSS = `
@keyframes ppt-fade { from { opacity: 0 } to { opacity: 1 } }
@keyframes ppt-push { from { transform: translateY(100%) } to { transform: none } }
@keyframes ppt-wipe { from { clip-path: inset(0 100% 0 0) } to { clip-path: inset(0 0 0 0) } }
@keyframes ppt-split { from { clip-path: inset(0 50% 0 50%) } to { clip-path: inset(0 0 0 0) } }
@keyframes ppt-reveal { from { opacity: 0; transform: scale(1.06) } to { opacity: 1; transform: none } }
@keyframes ppt-morph { from { opacity: .3; filter: blur(6px) } to { opacity: 1; filter: none } }
`
const transAnim = (t?: string) =>
  t === 'Fade' ? 'ppt-fade .7s ease' : t === 'Push' ? 'ppt-push .6s ease' : t === 'Wipe' ? 'ppt-wipe .7s ease' : t === 'Split' ? 'ppt-split .7s ease' : t === 'Reveal' ? 'ppt-reveal .8s ease' : t === 'Morph' ? 'ppt-morph .8s ease' : undefined

function useFit(ref: React.RefObject<HTMLDivElement | null>, pad = 48, key: unknown = 0) {
  const [s, setS] = useState(0.8)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => el.clientWidth > 0 && setS(Math.max(0.2, Math.min((el.clientWidth - pad) / SW, (el.clientHeight - pad) / SH))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref, pad, key])
  return s
}

export default function PowerPoint({ win, params }: AppProps) {
  const { isAgent, toast } = useDesk()
  const { setTitle } = useWin()
  const decks = useCollection<Deck>(COL)
  const [deckId, setDeckId] = useState<string | null>(null)
  const deck = useRecord<Deck>(COL, deckId)
  const [cur, setCur] = useState(0)
  const [view, setView] = useState<'deck' | 'backstage'>('deck')
  const [tab, setTab] = useState('Home')
  const [layoutMenu, setLayoutMenu] = useState<false | 'add' | 'change'>(false)
  const [present, setPresent] = useState(false)
  const [saving, setSaving] = useState(false)
  const [fresh, setFresh] = useState<string[]>([])
  const [menu, setMenu] = useState<string | null>(null)
  const [box, setBox] = useState<'title' | 'subtitle' | 'body'>('body')
  const [shapeSel, setShapeSel] = useState<string | null>(null)
  const [mode, setMode] = useState<'normal' | 'sorter' | 'outline' | 'reading' | 'notesPage'>('normal')
  const [notesOpen, setNotesOpen] = useState(true)
  const [pane, setPane] = useState<null | 'comments' | 'designer' | 'copilot' | 'animation'>(null)
  const [dialog, setDialog] = useState<null | 'share' | 'replace' | 'headerFooter' | 'help' | 'spelling'>(null)
  const [zoomOverride, setZoomOverride] = useState<number | null>(null)
  const [gridlines, setGridlines] = useState(false)
  const [ruler, setRuler] = useState(false)
  const [preview, setPreview] = useState(0)
  const [presenterView, setPresenterView] = useState(false)
  const [rehearse, setRehearse] = useState(false)
  const [showStart, setShowStart] = useState(0)
  const [tick, setTick] = useState(0)
  const [build, setBuild] = useState(0)
  const [black, setBlack] = useState<null | 'black' | 'white'>(null)
  const [ctx, setCtx] = useState<{ x: number; y: number; i: number } | null>(null)
  const [dragFrom, setDragFrom] = useState<number | null>(null)
  const [painter, setPainter] = useState<Pick<Slide, 'fmt' | 'bg'> | null>(null)
  const [commentDraft, setCommentDraft] = useState('')
  const canvasRef = useRef<HTMLDivElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const fit = useFit(canvasRef, 48, `${view}:${mode}:${deckId ?? ''}:${notesOpen}:${pane ?? ''}:${ruler}`)
  const scale = zoomOverride ?? fit
  const clip = useRef<Slide | null>(null)
  const history = useRef<Slide[][]>([])
  const future = useRef<Slide[][]>([])
  const lastPush = useRef(0)

  const newDeck = (slides?: Slide[], name?: string, theme?: string) => {
    let k = 1
    while (db.get<Deck>(COL).some((d) => d.name === `Presentation${k}.pptx`)) k++
    const id = uid('deck')
    db.insert(COL, {
      id,
      name: name ? `${name}.pptx` : `Presentation${k}.pptx`,
      modified: new Date().toISOString(),
      footer: 'Northwind Global',
      slides: slides ?? [{ id: uid('sl'), layout: 'title', title: '', subtitle: '', bullets: [] }],
      ...(theme ? { theme } : {}),
      ...(isAgent ? { createdBy: 'hworker' } : {}),
    })
    setDeckId(id)
    setCur(0)
    setView('deck')
  }

  useEffect(() => {
    const p = params ?? {}
    if (p.newDeck) newDeck()
    else if (p.deckId && db.find(COL, p.deckId)) {
      setDeckId(p.deckId)
      setCur(Number(p.slide ?? 0))
      setView('deck')
    } else if (!deckId) {
      const recent = [...db.get<Deck>(COL)].sort((a, b) => +new Date(b.modified) - +new Date(a.modified))[0]
      if (recent) setDeckId(recent.id)
      else setView('backstage')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [win.nonce])

  useEffect(() => {
    if (deck) setTitle(`${deck.name} - PowerPoint`)
  }, [deck?.name])

  const slides = deck?.slides ?? []
  const idx = Math.min(cur, Math.max(0, slides.length - 1))
  const slide = slides[idx]
  const theme = THEMES[deck?.theme ?? 'northwind'] ?? THEMES.northwind

  const patchDeck = (fn: (d: Deck) => Partial<Deck>) => {
    if (!deckId) return
    const curDeck = db.find<Deck>(COL, deckId)
    if (curDeck) {
      const now = Date.now()
      const next = fn(curDeck)
      if (next.slides && (now - lastPush.current > 800 || next.slides.length !== curDeck.slides.length)) {
        history.current.push(curDeck.slides)
        if (history.current.length > 80) history.current.shift()
        future.current = []
      }
      if (next.slides) lastPush.current = now
    }
    db.update(COL, deckId, (d) => ({ ...fn(d as Deck), modified: new Date().toISOString(), ...(isAgent ? { updatedBy: 'hworker' } : {}) }))
  }
  const patchSlide = (p: Partial<Slide>) => patchDeck((d) => ({ slides: d.slides.map((s, i) => (i === idx ? { ...s, ...p } : s)) }))
  const patchSlideAt = (i: number, p: Partial<Slide>) => patchDeck((d) => ({ slides: d.slides.map((s, k) => (k === i ? { ...s, ...p } : s)) }))
  const undo = () => {
    const prev = history.current.pop()
    if (!prev || !deckId) return
    future.current.push(db.find<Deck>(COL, deckId)!.slides)
    lastPush.current = 0
    db.update(COL, deckId, { slides: prev, modified: new Date().toISOString() })
  }
  const redo = () => {
    const nxt = future.current.pop()
    if (!nxt || !deckId) return
    history.current.push(db.find<Deck>(COL, deckId)!.slides)
    lastPush.current = 0
    db.update(COL, deckId, { slides: nxt, modified: new Date().toISOString() })
  }

  const addSlide = (layout: Slide['layout'] = 'titleContent') => {
    const s: Slide = { id: uid('sl'), layout, title: '', subtitle: layout === 'title' || layout === 'section' || layout === 'closing' ? '' : undefined, bullets: [], ...(isAgent ? { createdBy: 'hworker', createdAt: new Date().toISOString() } : {}) }
    patchDeck((d) => ({ slides: [...d.slides.slice(0, idx + 1), s, ...d.slides.slice(idx + 1)] }))
    setCur(idx + 1)
    setFresh((f) => [...f, s.id])
    setLayoutMenu(false)
  }
  const insertSlides = (ss: Slide[], at = idx + 1) => {
    patchDeck((d) => ({ slides: [...d.slides.slice(0, at), ...ss, ...d.slides.slice(at)] }))
    setCur(at + ss.length - 1)
    setFresh((f) => [...f, ...ss.map((s) => s.id)])
  }
  const deleteSlide = (at = idx) => {
    if (slides.length < 2) return
    patchDeck((d) => ({ slides: d.slides.filter((_, i) => i !== at) }))
    setCur(Math.max(0, at - 1))
  }
  const duplicateSlide = (at = idx) => {
    const src = slides[at]
    if (!src) return
    insertSlides([{ ...JSON.parse(JSON.stringify(src)), id: uid('sl'), createdBy: undefined, createdAt: undefined }], at + 1)
  }
  const moveSlide = (from: number, to: number) => {
    if (from === to || to < 0 || to >= slides.length) return
    patchDeck((d) => {
      const a = [...d.slides]
      const [m] = a.splice(from, 1)
      a.splice(to, 0, m)
      return { slides: a }
    })
    setCur(to)
  }
  const save = () => {
    setSaving(true)
    patchDeck(() => ({}))
    setTimeout(() => setSaving(false), 900)
  }

  /* ── text formatting on the focused placeholder ── */
  const curFmt: TextFmt = slide?.fmt?.[box] ?? {}
  const setFmt = (patch: Partial<TextFmt>) => {
    if (!slide) return
    const next: any = { ...(slide.fmt?.[box] ?? {}), ...patch }
    for (const k of Object.keys(patch)) if (next[k] === undefined) delete next[k]
    patchSlide({ fmt: { ...(slide.fmt ?? {}), [box]: next } })
  }
  const toggleFmt = (k: 'bold' | 'italic' | 'underline' | 'strike') => {
    if (shapeSel) return
    setFmt({ [k]: curFmt[k] ? undefined : true })
  }
  const selShape = slide?.shapes?.find((s) => s.id === shapeSel)
  const patchShape = (id: string, p: Partial<Shape>) => patchDeck((d) => ({ slides: d.slides.map((s, i) => (i === idx ? { ...s, shapes: (s.shapes ?? []).map((x) => (x.id === id ? { ...x, ...p } : x)) } : s)) }))
  const addShape = (kind: Shape['kind'], extra: Partial<Shape> = {}) => {
    if (!slide) return
    const sh: Shape = { id: uid('shp'), kind, x: SW / 2 - 90 + ((slide.shapes?.length ?? 0) % 5) * 20, y: SH / 2 - 60 + ((slide.shapes?.length ?? 0) % 5) * 20, w: kind === 'text' ? 280 : 180, h: kind === 'text' ? 60 : 120, fill: kind === 'text' ? undefined : theme.teal, ...extra }
    patchSlide({ shapes: [...(slide.shapes ?? []), sh] })
    setShapeSel(sh.id)
  }
  const removeShape = (id: string) => {
    patchSlide({ shapes: (slide?.shapes ?? []).filter((s) => s.id !== id) })
    setShapeSel(null)
  }

  /* ── slide show ── */
  const visible = slides.map((s, i) => ({ s, i })).filter((x) => !x.s.hidden)
  const startShow = (from: number, opts?: { rehearse?: boolean; presenter?: boolean }) => {
    setCur(from)
    setBuild(0)
    setBlack(null)
    setRehearse(!!opts?.rehearse)
    setPresenterView(!!opts?.presenter)
    setShowStart(Date.now())
    setPresent(true)
  }
  const bullets = (slide?.bullets ?? []).length
  const advance = () => {
    if (slide?.animation && slide.animation !== 'None' && build < bullets) return setBuild((b) => b + 1)
    const next = visible.find((x) => x.i > idx)
    if (next) {
      setCur(next.i)
      setBuild(0)
    } else setPresent(false)
  }
  const back = () => {
    if (build > 0) return setBuild((b) => b - 1)
    const prev = [...visible].reverse().find((x) => x.i < idx)
    if (prev) {
      setCur(prev.i)
      setBuild(slides[prev.i].animation && slides[prev.i].animation !== 'None' ? slides[prev.i].bullets.length : 0)
    }
  }
  useEffect(() => {
    if (!present) return
    const t = setInterval(() => setTick((x) => x + 1), 1000)
    return () => clearInterval(t)
  }, [present])
  const advRef = useRef(advance)
  advRef.current = advance
  const backRef = useRef(back)
  backRef.current = back
  const numBuf = useRef('')
  useEffect(() => {
    if (!present) return
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPresent(false)
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown' || e.key === 'ArrowDown' || e.key === 'n') advRef.current()
      if (e.key === 'ArrowLeft' || e.key === 'PageUp' || e.key === 'ArrowUp' || e.key === 'p' || e.key === 'Backspace') backRef.current()
      if (e.key === 'Home') (setCur(visible[0]?.i ?? 0), setBuild(0))
      if (e.key === 'End') (setCur(visible[visible.length - 1]?.i ?? 0), setBuild(0))
      if (e.key === 'b' || e.key === '.') setBlack((b) => (b === 'black' ? null : 'black'))
      if (e.key === 'w' || e.key === ',') setBlack((b) => (b === 'white' ? null : 'white'))
      if (/^\d$/.test(e.key)) numBuf.current += e.key
      if (e.key === 'Enter' && numBuf.current) {
        const n = Number(numBuf.current) - 1
        numBuf.current = ''
        if (n >= 0 && n < slides.length) (setCur(n), setBuild(0))
      }
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [present, slides.length, visible.length])

  /* ── keyboard in normal view ── */
  const onRootKey = (e: React.KeyboardEvent) => {
    if (present || view !== 'deck') return
    const t = e.target as HTMLElement
    const typing = t.tagName === 'TEXTAREA' || t.tagName === 'INPUT' || t.isContentEditable
    const mod = e.ctrlKey || e.metaKey
    if (mod && e.key.toLowerCase() === 'z' && !typing) return (e.preventDefault(), undo())
    if (mod && e.key.toLowerCase() === 'y' && !typing) return (e.preventDefault(), redo())
    if (mod && e.key.toLowerCase() === 's') return (e.preventDefault(), save())
    if (mod && e.key.toLowerCase() === 'm') return (e.preventDefault(), addSlide('titleContent'))
    if (e.key === 'F5') return (e.preventDefault(), startShow(e.shiftKey ? idx : (visible[0]?.i ?? 0)))
    if (typing) return
    if (shapeSel && (e.key === 'Delete' || e.key === 'Backspace')) return (e.preventDefault(), removeShape(shapeSel))
    if (mod && e.key.toLowerCase() === 'd') return (e.preventDefault(), duplicateSlide())
    if (mod && e.key.toLowerCase() === 'c') return (clip.current = slide ? JSON.parse(JSON.stringify(slide)) : null)
    if (mod && e.key.toLowerCase() === 'x') return ((clip.current = slide ? JSON.parse(JSON.stringify(slide)) : null), deleteSlide())
    if (mod && e.key.toLowerCase() === 'v' && clip.current) return insertSlides([{ ...clip.current, id: uid('sl') }])
    if (t.closest('[data-agent="ppt-thumbnails"]') || t.closest('[data-agent="ppt-sorter"]')) {
      if (e.key === 'Delete' || e.key === 'Backspace') return (e.preventDefault(), deleteSlide())
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') return (e.preventDefault(), setCur(Math.min(slides.length - 1, idx + 1)))
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') return (e.preventDefault(), setCur(Math.max(0, idx - 1)))
    }
  }

  const recents = useMemo(() => [...decks].sort((a, b) => +new Date(b.modified) - +new Date(a.modified)), [decks])
  const hworker = deck && (deck.createdBy === 'hworker' || deck.updatedBy === 'hworker')
  const footer = deck?.showFooter === false ? '' : (deck?.footer ?? 'Northwind Global')
  const num = (n: number) => (deck?.showNumbers === false ? 0 : n)

  const findSlide = (q: string) => {
    if (!q) return false
    const ql = q.toLowerCase()
    for (let k = 1; k <= slides.length; k++) {
      const i = (idx + k) % slides.length
      const s = slides[i]
      if ([s.title, s.subtitle ?? '', ...s.bullets, ...(s.bullets2 ?? []), s.notes ?? '', ...(s.shapes ?? []).map((x) => x.text ?? '')].some((t) => t.toLowerCase().includes(ql))) {
        setCur(i)
        setMode((m) => (m === 'sorter' ? 'normal' : m))
        return true
      }
    }
    return false
  }
  const replaceAll = (q: string, r: string) => {
    const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
    let n = 0
    const rep = (t: string) => {
      const m = t.match(re)
      if (m) n += m.length
      return t.replace(re, r)
    }
    patchDeck((d) => ({ slides: d.slides.map((s) => ({ ...s, title: rep(s.title), subtitle: s.subtitle !== undefined ? rep(s.subtitle) : undefined, bullets: s.bullets.map(rep), bullets2: s.bullets2?.map(rep), notes: s.notes !== undefined ? rep(s.notes) : undefined })) }))
    return n
  }

  const menuItem = (id: string, items: MenuItem[], node: ReactNode, width?: number) => (
    <div className="relative" key={id}>
      {node}
      {menu === id && <PopMenu items={items} onClose={() => setMenu(null)} width={width} />}
    </div>
  )
  const open = (id: string) => () => setMenu((m) => (m === id ? null : id))
  const colorItems = (on: (c: string | undefined) => void, none = 'Automatic'): MenuItem[] => [{ label: none, onClick: () => on(undefined) }, { label: '', sep: true }, ...['#000000', '#FFFFFF', '#C00000', '#E97132', '#FFC000', '#196B24', '#156082', '#0F9ED5', '#7030A0', '#595959'].map((c) => ({ label: c, swatch: c, onClick: () => on(c) }))]
  const shapeItems: MenuItem[] = [
    { label: 'Rectangle', icon: Square20Regular, onClick: () => addShape('rect') },
    { label: 'Rounded Rectangle', onClick: () => addShape('roundRect') },
    { label: 'Oval', icon: Circle20Regular, onClick: () => addShape('ellipse') },
    { label: 'Triangle', icon: Triangle20Regular, onClick: () => addShape('triangle') },
    { label: 'Right Arrow', icon: ArrowRight20Regular, onClick: () => addShape('arrow') },
    { label: 'Star', icon: Star20Regular, onClick: () => addShape('star', { fill: '#FFC000' }) },
    { label: 'Text Box', icon: Textbox20Regular, onClick: () => addShape('text') },
  ]
  const ctxItems = (i: number): MenuItem[] => [
    { label: 'New Slide', onClick: () => (setCur(i), setTimeout(() => addSlide('titleContent'))) },
    { label: 'Duplicate Slide', onClick: () => duplicateSlide(i) },
    { label: 'Delete Slide', disabled: slides.length < 2, onClick: () => deleteSlide(i) },
    { label: '', sep: true },
    { label: 'Copy', onClick: () => (clip.current = JSON.parse(JSON.stringify(slides[i]))) },
    { label: 'Paste', disabled: !clip.current, onClick: () => clip.current && insertSlides([{ ...clip.current, id: uid('sl') }], i + 1) },
    { label: '', sep: true },
    { label: slides[i]?.hidden ? 'Unhide Slide' : 'Hide Slide', onClick: () => patchSlideAt(i, { hidden: !slides[i]?.hidden }) },
    { label: 'Add Section', onClick: () => patchSlideAt(i, { section: slides[i]?.section ?? 'Untitled Section' }) },
    { label: 'Move Up', disabled: i === 0, onClick: () => moveSlide(i, i - 1) },
    { label: 'Move Down', disabled: i === slides.length - 1, onClick: () => moveSlide(i, i + 1) },
    { label: 'New Comment', onClick: () => (setCur(i), setPane('comments')) },
  ]

  /* ── ribbons ── */
  const big = (I: any, cls = 'text-[#424242]') => <I className={`w-7 h-7 ${cls}`} />
  const B = (I: any, l: string, onClick?: () => void, o: { active?: boolean; agent?: string; menuId?: string; items?: MenuItem[]; dropdown?: boolean } = {}) => {
    const btn = <BigBtn key={l} icon={big(I)} label={l} aria={l.replace('\n', ' ')} agent={o.agent} active={o.active} dropdown={o.dropdown || !!o.menuId} onClick={o.menuId ? open(o.menuId) : onClick} />
    return o.menuId && o.items ? menuItem(o.menuId, o.items, btn, 230) : btn
  }
  const G = (label: string, items: ReactNode[], last?: boolean) => (
    <Group key={label} label={label} last={last}>
      {items}
    </Group>
  )
  const applyTransition = (t: string, all = false) => {
    patchDeck((d) => ({ slides: d.slides.map((s, i) => (all || i === idx ? { ...s, transition: t === 'None' ? undefined : t } : s)) }))
    setPreview((p) => p + 1)
  }
  const applyAnimation = (a: string) => {
    patchSlide({ animation: a === 'None' ? undefined : a })
    setPreview((p) => p + 1)
  }
  const tabRibbon: Record<string, ReactNode[]> = {
    Insert: [
      G('Slides', [B(SlideAdd24Regular, 'New\nSlide', () => addSlide('titleContent'))]),
      G('Tables', [B(Table20Regular, 'Table')]),
      G('Images', [B(Image20Regular, 'Pictures')]),
      G('Illustrations', [B(Shapes24Regular, 'Shapes', undefined, { menuId: 'shapes', items: shapeItems, agent: 'ppt-insert-shapes' }), B(Icons20Regular, 'Icons', undefined, { menuId: 'icons', items: ['✓', '★', '⚠', '→', '●', '♦', '☎', '✉'].map((c) => ({ label: c, onClick: () => addShape('text', { text: c, size: 64, w: 120, h: 100, color: theme.teal }) })) }), B(SlideText20Regular, 'SmartArt'), B(DataBarVertical20Regular, 'Chart', () => insertSlides([{ id: uid('sl'), layout: 'chart', title: 'Chart title', bullets: ['Key takeaway'], chart: { type: 'bar', series: ['Series 1'], data: [{ name: 'Q1', value: 42 }, { name: 'Q2', value: 55 }, { name: 'Q3', value: 61 }, { name: 'Q4', value: 48 }] } }]))]),
      G('Text', [B(Textbox20Regular, 'Text\nBox', () => addShape('text'), { agent: 'ppt-insert-textbox' }), B(DocumentHeaderFooter20Regular, 'Header\n& Footer', () => setDialog('headerFooter'))]),
      G('Media', [B(Video20Regular, 'Video'), B(Record20Regular, 'Audio')], true),
    ],
    Draw: [G('Tools', [B(PaintBrush20Regular, 'Draw')], true)],
    Design: [
      G('Themes', Object.entries(THEMES).map(([k, t]) => B(DesignIdeas24Regular, t.name.replace(' Theme', '\nTheme'), () => patchDeck(() => ({ theme: k })), { active: (deck?.theme ?? 'northwind') === k }))),
      G('Variants', [B(ColorBackground20Regular, 'Variants', undefined, { menuId: 'variants', items: Object.entries(THEMES).map(([k, t]) => ({ label: t.name, swatch: t.accent, checked: (deck?.theme ?? 'northwind') === k, onClick: () => patchDeck(() => ({ theme: k })) })) })]),
      G('Customize', [
        B(SlideSize20Regular, 'Slide\nSize'),
        B(ColorBackground20Regular, 'Format\nBackground', undefined, {
          menuId: 'bg',
          items: [...colorItems((c) => patchSlide({ bg: c }), 'Reset Background'), { label: '', sep: true }, { label: 'Apply to All', onClick: () => patchDeck((d) => ({ slides: d.slides.map((s) => ({ ...s, bg: slide?.bg })) })) }],
        }),
      ]),
      G('Designer', [B(DesignIdeas24Regular, 'Designer', () => setPane((p) => (p === 'designer' ? null : 'designer')), { active: pane === 'designer' })], true),
    ],
    Transitions: [
      G('Preview', [B(Play20Regular, 'Preview', () => setPreview((p) => p + 1))]),
      G('Transition to This Slide', TRANSITIONS.map((t) => B(SlideTransition20Regular, t, () => applyTransition(t), { active: (slide?.transition ?? 'None') === t }))),
      G('Timing', [B(SlideMultiple16Regular, 'Apply\nTo All', () => applyTransition(slide?.transition ?? 'None', true))], true),
    ],
    Animations: [
      G('Preview', [B(Play20Regular, 'Preview', () => setPreview((p) => p + 1))]),
      G('Animation', ANIMATIONS.map((a) => B(Sparkle20Regular, a, () => applyAnimation(a), { active: (slide?.animation ?? 'None') === a }))),
      G('Advanced Animation', [B(SlideText20Regular, 'Animation\nPane', () => setPane((p) => (p === 'animation' ? null : 'animation')), { active: pane === 'animation' })], true),
    ],
    'Slide Show': [
      G('Start Slide Show', [
        B(SlidePlay20Regular, 'From\nBeginning', () => startShow(visible[0]?.i ?? 0), { agent: 'ppt-from-beginning' }),
        B(Play20Regular, 'From Current\nSlide', () => startShow(idx)),
        B(ShareScreenStart20Regular, 'Present\nOnline', () => toast({ appId: 'powerpoint', title: 'Present Online', body: `A link to watch “${deck?.name}” was created and copied. Share it in Teams to present.` })),
      ]),
      G('Set Up', [B(SlideHide20Regular, 'Hide\nSlide', () => patchSlide({ hidden: !slide?.hidden }), { active: !!slide?.hidden }), B(Timer20Regular, 'Rehearse\nTimings', () => startShow(idx, { rehearse: true })), B(Presenter20Regular, 'Presenter\nView', () => startShow(idx, { presenter: true }))]),
      G('Record', [B(Record20Regular, 'Record')], true),
    ],
    Record: [G('Record', [B(Record20Regular, 'From\nBeginning'), B(Record20Regular, 'From Current\nSlide')], true)],
    Review: [
      G('Proofing', [B(TextGrammarCheckmark20Regular, 'Spelling', () => setDialog('spelling'))]),
      G('Accessibility', [B(Accessibility16Regular, 'Check\nAccessibility', () => setDialog('spelling'))]),
      G('Comments', [B(CommentAdd20Regular, 'New\nComment', () => setPane('comments')), B(CommentMultiple20Regular, 'Show\nComments', () => setPane((p) => (p === 'comments' ? null : 'comments')), { active: pane === 'comments' })], true),
    ],
    View: [
      G('Presentation Views', [
        B(SlideMultiple16Regular, 'Normal', () => setMode('normal'), { active: mode === 'normal' }),
        B(SlideText20Regular, 'Outline\nView', () => setMode('outline'), { active: mode === 'outline', agent: 'ppt-outline-view' }),
        B(SlideGrid20Regular, 'Slide\nSorter', () => setMode('sorter'), { active: mode === 'sorter', agent: 'ppt-slide-sorter' }),
        B(Notepad16Regular, 'Notes\nPage', () => setMode('notesPage'), { active: mode === 'notesPage' }),
        B(BookOpen16Regular, 'Reading\nView', () => setMode('reading'), { active: mode === 'reading' }),
      ]),
      G('Show', [B(Ruler20Regular, 'Ruler', () => setRuler((r) => !r), { active: ruler }), B(Grid20Regular, 'Gridlines', () => setGridlines((g) => !g), { active: gridlines }), B(Notepad16Regular, 'Notes', () => setNotesOpen((n) => !n), { active: notesOpen })]),
      G('Zoom', [B(Search20Regular, 'Zoom', undefined, { menuId: 'zoom', items: [2, 1.5, 1, 0.75, 0.5].map((z) => ({ label: `${Math.round(z * 100)}%`, onClick: () => setZoomOverride(z) })) }), B(ArrowFit16Regular, 'Fit to\nWindow', () => setZoomOverride(null))], true),
    ],
    Help: [G('Help', [B(QuestionCircle20Regular, 'Help', () => setDialog('help')), B(Comment20Regular, 'Feedback', () => toast({ appId: 'powerpoint', title: 'Thanks for your feedback', body: 'Your feedback was sent to Microsoft.' }))], true)],
  }

  const sizeOf = (b: typeof box) => (b === 'title' ? (slide?.layout === 'title' || slide?.layout === 'closing' ? 46 : slide?.layout === 'section' ? 40 : 32) : b === 'subtitle' ? 18 : slide?.layout === 'chart' ? 16 : slide?.layout === 'twoContent' ? 17 : slide?.layout === 'kpis' ? 19 : 22)
  const backstagePanes: Record<string, ReactNode> | undefined = deck
    ? {
        Info: (
          <div className="text-[13px] space-y-2 max-w-[640px]">
            <div className="text-[18px]">{deck.name}</div>
            {[
              ['Slides', String(slides.length)],
              ['Hidden slides', String(slides.filter((s) => s.hidden).length)],
              ['Theme', theme.name],
              ['Author', deck.author ?? ME.name],
              ['Last Modified', fmtSmart(deck.modified)],
              ['Shared with', deck.sharedWith?.length ? deck.sharedWith.map((e) => PEOPLE.find((p) => p.email === e)?.name ?? e).join(', ') : 'Only you'],
            ].map(([k, v]) => (
              <div key={k} className="grid grid-cols-[140px_1fr]">
                <span className="text-[#616161]">{k}</span>
                <span>{v}</span>
              </div>
            ))}
          </div>
        ),
        Print: (
          <div className="flex gap-8">
            <div className="w-[220px] space-y-3 text-[13px]">
              <Field label="Printer">
                <select className={inputCls}>
                  <option>NW-BOS-4F-MFP01 (Ready)</option>
                  <option>Microsoft Print to PDF</option>
                </select>
              </Field>
              <Field label="Layout">
                <select className={inputCls}>
                  <option>Full Page Slides</option>
                  <option>Notes Pages</option>
                  <option>3 Slides (Handouts)</option>
                </select>
              </Field>
              <button onClick={() => toast({ appId: 'powerpoint', title: 'Sent to printer', body: `${visible.length} slides of “${deck.name}” sent to NW-BOS-4F-MFP01.` })} className="h-9 px-6 rounded text-white font-semibold" style={{ background: ORANGE }}>
                Print
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {visible.slice(0, 6).map(({ s, i }) => (
                <div key={s.id} className="relative overflow-hidden border border-[#D1D1D1]" style={{ width: 192, height: 108 }}>
                  <div className="absolute left-0 top-0 origin-top-left" style={{ transform: `scale(${192 / SW})`, width: SW, height: SH }}>
                    <SlideView slide={s} n={num(i + 1)} footer={footer} theme={theme} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ),
        Export: (
          <div className="max-w-[520px] space-y-3">
            {[
              ['Download as PDF', 'pdf'],
              ['Download as Images (PNG)', 'zip'],
              ['Download as ODP', 'odp'],
            ].map(([l, ext]) => (
              <button key={ext} onClick={() => toast({ appId: 'powerpoint', title: 'Download complete', body: `${deck.name.replace(/\.pptx$/i, '')}.${ext} was saved to Downloads.` })} className="w-full h-14 px-4 rounded border border-[#E1E1E1] hover:bg-[#F5F5F5] text-left text-[13.5px]">
                {l}
              </button>
            ))}
          </div>
        ),
        'Save a Copy': (
          <SaveCopy
            initial={`${deck.name.replace(/\.pptx$/i, '')} - Copy`}
            onSave={(n) => {
              const id = uid('deck')
              db.insert(COL, { ...JSON.parse(JSON.stringify(deck)), id, name: `${n}.pptx`, modified: new Date().toISOString(), pinned: false, sharedWith: [] })
              setDeckId(id)
              setCur(0)
              setView('deck')
            }}
          />
        ),
        Account: (
          <div className="text-[13px] space-y-1">
            <div className="text-[15px] font-semibold">{ME.name}</div>
            <div className="text-[#616161]">{ME.email}</div>
            <div className="text-[#616161]">Microsoft 365 Apps for enterprise · PowerPoint for the web</div>
          </div>
        ),
      }
    : undefined

  const showTime = Math.max(0, Math.floor((Date.now() - showStart) / 1000))
  void tick
  const nextVisible = visible.find((x) => x.i > idx)
  const comments = slide?.comments ?? []

  return (
    <div ref={rootRef} className="relative flex-1 min-h-0 flex flex-col bg-[#F3F3F3] text-[#242424]" style={{ fontFamily: 'var(--font-win)' }} onKeyDown={onRootKey}>
      <style>{TRANSITION_CSS}</style>
      <OfficeTitleBar
        app="powerpoint"
        color={ORANGE}
        fileName={deck?.name.replace(/\.pptx$/, '') ?? 'PowerPoint'}
        status="Saved to OneDrive"
        onSave={save}
        saveAgentId="ppt-save"
        saving={saving}
        onUndo={undo}
        onRedo={redo}
        onSearch={(q) => !findSlide(q) && toast({ appId: 'powerpoint', title: 'Search', body: `No slides contain “${q}”.` })}
        onCopilot={() => setPane((p) => (p === 'copilot' ? null : 'copilot'))}
      />
      {view === 'backstage' || !deck ? (
        <Backstage
          app="powerpoint"
          color={ORANGE}
          appName="PowerPoint"
          greeting={new Date().getHours() < 12 ? 'Good morning' : 'Good afternoon'}
          canBack={!!deck}
          onBack={() => setView('deck')}
          onOpen={(id) => {
            setDeckId(id)
            setCur(0)
            setView('deck')
          }}
          recents={recents.map((d) => ({ id: d.id, name: d.name, location: 'OneDrive - Northwind Global » Documents', modified: d.modified, agentId: `ppt-deck-${d.id}`, hworker: d.createdBy === 'hworker' || d.updatedBy === 'hworker', pinned: !!d.pinned, shared: !!d.author && d.author !== ME.name }))}
          onPin={(id, pinned) => db.update(COL, id, { pinned })}
          panes={backstagePanes}
          onCommand={(l) => {
            if (l === 'Share' && deck) (setView('deck'), setDialog('share'))
            if (l === 'Close') setDeckId(null)
            if (l === 'Feedback' || l === 'Options') toast({ appId: 'powerpoint', title: l, body: l === 'Feedback' ? 'Thanks — your feedback helps improve PowerPoint.' : 'PowerPoint options are managed by Northwind Global IT.' })
          }}
          newTiles={
            <>
              <button data-agent="ppt-new-deck" aria-label="Blank Presentation" onClick={() => newDeck()} className="group text-left">
                <div className="w-[200px] h-[113px] bg-white border border-[#D1D1D1] group-hover:border-[#C43E1C] flex items-center justify-center text-[13px] text-[#616161]">Click to add title</div>
                <div className="text-[13px] mt-2">Blank Presentation</div>
              </button>
              {(
                [
                  ['Welcome to PowerPoint', 'linear-gradient(135deg,#C43E1C,#ED6C47)', 'office'],
                  ['Madison', 'linear-gradient(#14213D 60%,#E97132 60%)', 'madison'],
                  ['Atlas', 'linear-gradient(90deg,#156082 30%,#fff 30%)', 'ion'],
                  ['Gallery', 'linear-gradient(#fff 70%,#3B3838 70%)', 'facet'],
                ] as const
              ).map(([l, bg, th]) => (
                <button
                  key={l}
                  data-agent={`ppt-template-${l.toLowerCase().replace(/[^a-z]+/g, '-')}`}
                  onClick={() =>
                    newDeck(
                      l === 'Welcome to PowerPoint'
                        ? [
                            { id: uid('sl'), layout: 'title', title: 'Welcome to PowerPoint', subtitle: '5 tips for a simpler way to work', bullets: [] },
                            { id: uid('sl'), layout: 'titleContent', title: 'Design with Designer', bullets: ['Choose Design ▸ Designer for layout ideas', 'Pick a theme on the Design tab'], notes: 'Designer suggests professional layouts.' },
                            { id: uid('sl'), layout: 'titleContent', title: 'Bring slides to life', bullets: ['Add Transitions and Animations', 'Press F5 to present from the beginning'] },
                            { id: uid('sl'), layout: 'closing', title: 'Thank you', subtitle: 'Questions?', bullets: [] },
                          ]
                        : [{ id: uid('sl'), layout: 'title', title: l, subtitle: 'Subtitle', bullets: [] }, { id: uid('sl'), layout: 'titleContent', title: 'Agenda', bullets: [''] }],
                      l === 'Welcome to PowerPoint' ? 'Welcome to PowerPoint' : undefined,
                      th,
                    )
                  }
                  className="group text-left"
                >
                  <div className="w-[200px] h-[113px] border border-[#D1D1D1] group-hover:border-[#C43E1C]" style={{ background: bg }} />
                  <div className="text-[13px] mt-2">{l}</div>
                </button>
              ))}
            </>
          }
        />
      ) : (
        <>
          <RibbonTabs
            tabs={TABS}
            active={tab}
            accent={ORANGE}
            fileAgentId="ppt-file-tab"
            onFile={() => setView('backstage')}
            onTab={setTab}
            right={
              <>
                <button onClick={() => startShow(idx, { rehearse: true })} className="h-[28px] px-2.5 flex items-center gap-1.5 rounded-[4px] border border-[#D1D1D1] bg-white text-[12.5px] hover:bg-[#F5F5F5]">
                  <Record20Regular className="w-4 h-4 text-[#C42B1C]" /> Record
                </button>
                <div className="relative">
                  <button
                    data-agent="ppt-present"
                    aria-label="Present"
                    onClick={(e) => ((e.target as HTMLElement).closest?.('[data-chev]') ? setMenu((m) => (m === 'present' ? null : 'present')) : setPresent(true))}
                    className="h-[28px] px-2.5 flex items-center gap-1.5 rounded-[4px] border border-[#D1D1D1] bg-white text-[12.5px] hover:bg-[#F5F5F5]"
                  >
                    <Play20Regular className="w-4 h-4" /> Present{' '}
                    <span data-chev className="inline-flex">
                      <ChevronDown12Regular />
                    </span>
                  </button>
                  {menu === 'present' && (
                    <PopMenu
                      style={{ left: 'auto', right: 0 }}
                      onClose={() => setMenu(null)}
                      items={[
                        { label: 'From Beginning', hint: 'F5', onClick: () => startShow(visible[0]?.i ?? 0) },
                        { label: 'From Current Slide', hint: 'Shift+F5', onClick: () => startShow(idx) },
                        { label: 'Presenter View', onClick: () => startShow(idx, { presenter: true }) },
                        { label: 'Rehearse Timings', onClick: () => startShow(idx, { rehearse: true }) },
                      ]}
                    />
                  )}
                </div>
                <button aria-label="Comments" onClick={() => setPane((p) => (p === 'comments' ? null : 'comments'))} className={`h-[28px] px-2.5 flex items-center gap-1.5 rounded-[4px] border border-[#D1D1D1] text-[12.5px] hover:bg-[#F5F5F5] ${pane === 'comments' ? 'bg-[#FBE9E4]' : 'bg-white'}`}>
                  <Comment20Regular className="w-4 h-4" />
                </button>
                <button data-agent="ppt-share" onClick={() => setDialog('share')} className="h-[28px] px-3 flex items-center gap-1.5 rounded-[4px] text-white text-[12.5px] font-semibold" style={{ background: ORANGE }}>
                  <Share20Regular className="w-4 h-4" /> Share <ChevronDown12Regular />
                </button>
              </>
            }
          />
          <Ribbon>
            {tab === 'Home' ? (
              <>
                <Group label="Clipboard">
                  <BigBtn icon={<ClipboardPaste24Regular className="w-8 h-8" />} label="Paste" dropdown onClick={() => clip.current && insertSlides([{ ...clip.current, id: uid('sl') }])} />
                  <div className="flex flex-col">
                    <SmBtn icon={<Cut20Regular />} title="Cut" onClick={() => slide && ((clip.current = JSON.parse(JSON.stringify(slide))), deleteSlide())} />
                    <SmBtn icon={<Copy20Regular />} title="Copy" dropdown onClick={() => slide && (clip.current = JSON.parse(JSON.stringify(slide)))} />
                    <SmBtn icon={<PaintBrush20Regular />} title="Format Painter" active={!!painter} onClick={() => setPainter(painter ? null : slide ? { fmt: slide.fmt, bg: slide.bg } : null)} />
                  </div>
                </Group>
                <Group label="Slides">
                  <BigBtn
                    icon={<SlideAdd24Regular className="w-8 h-8 text-[#C43E1C]" />}
                    label="New Slide"
                    agent="ppt-new-slide"
                    onClick={() => addSlide('titleContent')}
                    onDropdown={() => setLayoutMenu((m) => (m ? false : 'add'))}
                    dropdownAgent="ppt-new-slide-menu"
                  />
                  <div className="flex flex-col">
                    <SmBtn icon={<SlideLayout20Regular />} label="Layout" dropdown onClick={() => setLayoutMenu((m) => (m ? false : 'change'))} />
                    <SmBtn icon={<ArrowReset20Regular />} label="Reset" onClick={() => patchSlide({ fmt: undefined, bg: undefined })} />
                    {menuItem(
                      'section',
                      [
                        { label: 'Add Section', onClick: () => patchSlide({ section: slide?.section ?? 'Untitled Section' }) },
                        { label: 'Rename Section', disabled: !slide?.section, onClick: () => setMenu('renameSection') },
                        { label: 'Remove Section', disabled: !slide?.section, onClick: () => patchSlide({ section: undefined }) },
                      ],
                      <SmBtn icon={<TabDesktop20Regular />} label="Section" dropdown onClick={open('section')} />,
                    )}
                  </div>
                </Group>
                <Group label="Font">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1">
                      <OfficeSelect agent="ppt-font" value={curFmt.font ?? 'Aptos (Body)'} width={130} title="Font" options={FONTS} onChange={(v) => setFmt({ font: v })} />
                      <OfficeSelect agent="ppt-font-size" value={String(curFmt.size ?? sizeOf(box))} width={46} title="Font Size" options={SIZES} onChange={(v) => (selShape ? patchShape(selShape.id, { size: Number(v) }) : setFmt({ size: Number(v) }))} />
                    </div>
                    <div className="flex items-center">
                      {([TextBold20Regular, TextItalic20Regular, TextUnderline20Regular, TextStrikethrough20Regular] as const).map((I, i) => {
                        const k = (['bold', 'italic', 'underline', 'strike'] as const)[i]
                        return <SmBtn key={i} icon={<I />} title={['Bold', 'Italic', 'Underline', 'Strikethrough'][i]} agent={i === 0 ? 'ppt-bold' : undefined} active={!!curFmt[k]} onClick={() => toggleFmt(k)} />
                      })}
                      <Sep />
                      {menuItem('fontColor', colorItems((c) => (selShape ? patchShape(selShape.id, { color: c }) : setFmt({ color: c }))), <SmBtn icon={<TextColor20Regular />} title="Font Color" dropdown onClick={open('fontColor')} />, 180)}
                    </div>
                  </div>
                </Group>
                <Group label="Paragraph">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center">
                      <SmBtn icon={<TextBulletListLtr20Regular />} title="Bullets" dropdown active={(slide?.fmt?.body?.list ?? 'bullet') === 'bullet'} onClick={() => { setBox('body'); patchSlide({ fmt: { ...(slide?.fmt ?? {}), body: { ...(slide?.fmt?.body ?? {}), list: (slide?.fmt?.body?.list ?? 'bullet') === 'bullet' ? 'none' : 'bullet' } } }) }} />
                      <SmBtn icon={<TextNumberListLtr20Regular />} title="Numbering" dropdown active={slide?.fmt?.body?.list === 'number'} onClick={() => { setBox('body'); patchSlide({ fmt: { ...(slide?.fmt ?? {}), body: { ...(slide?.fmt?.body ?? {}), list: slide?.fmt?.body?.list === 'number' ? 'bullet' : 'number' } } }) }} />
                      {menuItem('lineSpacing', [1, 1.2, 1.55, 2, 2.5].map((v) => ({ label: v === 1.55 ? '1.5 (default)' : String(v), checked: (curFmt.lineSpacing ?? 1.55) === v, onClick: () => setFmt({ lineSpacing: v === 1.55 ? undefined : v }) })), <SmBtn icon={<ArrowSort20Regular />} title="Line Spacing" dropdown onClick={open('lineSpacing')} />, 160)}
                    </div>
                    <div className="flex items-center">
                      {[TextAlignLeft20Regular, TextAlignCenter20Regular, TextAlignRight20Regular, TextAlignJustify20Regular].map((I, i) => {
                        const a = (['left', 'center', 'right', 'justify'] as const)[i]
                        return <SmBtn key={i} icon={<I />} title={['Align Left', 'Center', 'Align Right', 'Justify'][i]} active={(curFmt.align ?? 'left') === a} onClick={() => setFmt({ align: a === 'left' ? undefined : a })} />
                      })}
                    </div>
                  </div>
                </Group>
                <Group label="Drawing">
                  <div className="grid grid-cols-4 gap-0.5 p-1 border border-[#E0E0E0] rounded h-[60px] w-[104px] content-start">
                    {(
                      [
                        [Square20Regular, 'rect', 'Rectangle'],
                        [Circle20Regular, 'ellipse', 'Oval'],
                        [ArrowRight20Regular, 'arrow', 'Arrow'],
                        [Square20Regular, 'roundRect', 'Rounded Rectangle'],
                        [Circle20Regular, 'ellipse', 'Circle'],
                        [ArrowRight20Regular, 'arrow', 'Block Arrow'],
                        [Triangle20Regular, 'triangle', 'Triangle'],
                        [Textbox20Regular, 'text', 'Text Box'],
                      ] as [any, Shape['kind'], string][]
                    ).map(([I, k, l], i) => (
                      <button key={i} title={l} aria-label={`Insert ${l}`} onClick={() => addShape(k)} className="w-5 h-5 rounded hover:bg-[#F0F0F0] flex items-center justify-center">
                        <I className="w-5 h-5 text-[#424242]" />
                      </button>
                    ))}
                  </div>
                  {menuItem(
                    'arrange',
                    [
                      { label: 'Bring to Front', disabled: !selShape, onClick: () => selShape && patchSlide({ shapes: [...(slide?.shapes ?? []).filter((s) => s.id !== selShape.id), selShape] }) },
                      { label: 'Send to Back', disabled: !selShape, onClick: () => selShape && patchSlide({ shapes: [selShape, ...(slide?.shapes ?? []).filter((s) => s.id !== selShape.id)] }) },
                      { label: 'Align Center', disabled: !selShape, onClick: () => selShape && patchShape(selShape.id, { x: Math.round((SW - selShape.w) / 2) }) },
                      { label: 'Align Middle', disabled: !selShape, onClick: () => selShape && patchShape(selShape.id, { y: Math.round((SH - selShape.h) / 2) }) },
                      { label: 'Delete Shape', disabled: !selShape, onClick: () => selShape && removeShape(selShape.id) },
                    ],
                    <BigBtn icon={<Shapes24Regular className="w-8 h-8" />} label={'Arrange'} dropdown onClick={open('arrange')} />,
                    200,
                  )}
                  {menuItem('quickStyles', [...FILLS.map((c) => ({ label: c, swatch: c, onClick: () => selShape && patchShape(selShape.id, { fill: c, color: c === '#FFFFFF' || c === '#FFC000' ? '#262626' : undefined }) })), { label: 'Outline only', onClick: () => selShape && patchShape(selShape.id, { fill: 'transparent', line: theme.teal, color: theme.teal }) }], <BigBtn icon={<PaintBrush20Regular className="w-7 h-7" />} label={'Quick\nStyles'} dropdown onClick={open('quickStyles')} />, 180)}
                </Group>
                <Group label="Editing">
                  <div className="flex flex-col">
                    <SmBtn icon={<Search20Regular />} label="Find" onClick={() => setDialog('replace')} />
                    <SmBtn icon={<ArrowSwap20Regular />} label="Replace" dropdown onClick={() => setDialog('replace')} />
                    {menuItem(
                      'select',
                      [
                        { label: 'Select All Text', onClick: () => { const ta = document.querySelector<HTMLTextAreaElement>('[data-agent="ppt-slide-bullets"]'); ta?.focus(); ta?.select() } },
                        ...(slide?.shapes ?? []).map((s) => ({ label: `${s.kind === 'text' ? 'Text Box' : s.kind} ${s.text ? `“${s.text.slice(0, 16)}”` : ''}`, onClick: () => setShapeSel(s.id) })),
                      ],
                      <SmBtn icon={<Grid16Regular />} label="Select" dropdown onClick={open('select')} />,
                    )}
                  </div>
                </Group>
                <Group label="Voice">
                  <BigBtn icon={<Mic24Regular className="w-8 h-8" />} label="Dictate" dropdown />
                </Group>
                <Group label="Designer">
                  <BigBtn icon={<DesignIdeas24Regular className="w-8 h-8 text-[#C43E1C]" />} label="Designer" agent="ppt-designer" active={pane === 'designer'} onClick={() => setPane((p) => (p === 'designer' ? null : 'designer'))} />
                </Group>
                <Group label="Copilot" last>
                  <BigBtn icon={<CopilotIcon size={30} />} label="Copilot" agent="ppt-copilot" active={pane === 'copilot'} onClick={() => setPane((p) => (p === 'copilot' ? null : 'copilot'))} />
                </Group>
              </>
            ) : (
              tabRibbon[tab] ?? <Group label={tab} last><BigBtn icon={<SlideMultiple16Regular className="w-7 h-7" />} label={tab} /></Group>
            )}
          </Ribbon>
          {layoutMenu && (
            <div className="absolute z-50 left-[150px] top-[176px] w-[430px] bg-white rounded-md border border-black/10 shadow-[0_8px_24px_rgba(0,0,0,0.2)] p-3" data-agent="ppt-layout-gallery">
              <div className="text-[12px] font-semibold text-[#616161] mb-2">{theme.name} Theme{layoutMenu === 'change' ? ' — change layout' : ''}</div>
              <div className="grid grid-cols-3 gap-3">
                {LAYOUTS.map(([l, label]) => (
                  <button
                    key={l}
                    data-agent={`ppt-layout-${l}`}
                    aria-label={label}
                    onClick={() => {
                      if (layoutMenu === 'change') {
                        patchSlide({ layout: l, subtitle: slide?.subtitle ?? (l === 'title' || l === 'section' || l === 'closing' ? '' : undefined) })
                        setLayoutMenu(false)
                      } else addSlide(l)
                    }}
                    className={`text-center group ${layoutMenu === 'change' && slide?.layout === l ? 'opacity-100' : ''}`}
                  >
                    <div className={`relative w-[124px] h-[70px] border group-hover:border-[#C43E1C] overflow-hidden ${layoutMenu === 'change' && slide?.layout === l ? 'border-[#C43E1C] border-2' : 'border-[#D1D1D1]'}`}>
                      <div className="absolute left-0 top-0 origin-top-left" style={{ transform: `scale(${124 / SW})`, width: SW, height: SH }}>
                        <SlideView slide={{ id: l, layout: l, title: label, subtitle: 'Subtitle', bullets: ['Text', 'Text'], chart: l === 'chart' ? { type: 'bar', data: [{ name: 'A', value: 3 }, { name: 'B', value: 5 }, { name: 'C', value: 4 }] } : undefined }} n={1} footer="" theme={theme} />
                      </div>
                    </div>
                    <div className="text-[11.5px] mt-1">{label}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
          {menu === 'renameSection' && slide?.section !== undefined && (
            <div className="absolute z-50 left-[200px] top-[176px] bg-white rounded-md border border-black/10 shadow-lg p-3 w-[260px]">
              <div className="text-[12px] font-semibold mb-1">Section name</div>
              <input
                autoFocus
                defaultValue={slide.section}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    patchSlide({ section: (e.target as HTMLInputElement).value || 'Untitled Section' })
                    setMenu(null)
                  }
                  if (e.key === 'Escape') setMenu(null)
                }}
                onBlur={(e) => {
                  patchSlide({ section: e.target.value || 'Untitled Section' })
                  setMenu(null)
                }}
                className={inputCls}
              />
            </div>
          )}

          <div className="flex-1 min-h-0 flex" onMouseDown={() => layoutMenu && setLayoutMenu(false)}>
            {mode === 'sorter' ? (
              <div className="flex-1 overflow-auto p-6 bg-[#E6E6E6]" data-agent="ppt-sorter" tabIndex={0}>
                <div className="flex flex-wrap gap-6">
                  {slides.map((s, i) => (
                    <div key={s.id} className="flex flex-col items-center gap-1">
                      {s.section && (slides[i - 1]?.section !== s.section) && <div className="self-start text-[12px] font-semibold text-[#424242]">{s.section}</div>}
                      <button
                        draggable
                        onDragStart={() => setDragFrom(i)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => (dragFrom !== null && moveSlide(dragFrom, i), setDragFrom(null))}
                        onClick={() => setCur(i)}
                        onDoubleClick={() => (setCur(i), setMode('normal'))}
                        onContextMenu={(e) => {
                          e.preventDefault()
                          const r = rootRef.current!.getBoundingClientRect()
                          setCtx({ x: e.clientX - r.left, y: e.clientY - r.top, i })
                        }}
                        className={`relative rounded overflow-hidden bg-white ${i === idx ? 'outline outline-[3px] outline-[#C43E1C]' : 'outline outline-1 outline-[#C8C8C8]'} ${s.hidden ? 'opacity-50' : ''}`}
                        style={{ width: 224, height: 126 }}
                        aria-label={`Slide ${i + 1}: ${s.title || 'Untitled'}`}
                      >
                        <div className="absolute left-0 top-0 origin-top-left pointer-events-none" style={{ transform: `scale(${224 / SW})`, width: SW, height: SH }}>
                          <SlideView slide={s} n={num(i + 1)} footer={footer} theme={theme} />
                        </div>
                      </button>
                      <div className="text-[12px] text-[#424242] flex items-center gap-1">
                        {s.hidden ? <span className="line-through">{i + 1}</span> : i + 1}
                        {s.transition && <SlideTransition20Regular className="w-3.5 h-3.5 text-[#616161]" />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : mode === 'reading' ? (
              <div className="flex-1 min-w-0 flex flex-col bg-[#262626]" data-agent="ppt-reading-view">
                <div ref={canvasRef} className="flex-1 min-h-0 flex items-center justify-center" onClick={advance}>
                  {slide && (
                    <div key={slide.id + preview} style={{ width: SW * fit, height: SH * fit, animation: transAnim(slide.transition) }} className="relative">
                      <div className="absolute left-0 top-0 origin-top-left" style={{ transform: `scale(${fit})`, width: SW, height: SH }}>
                        <SlideView slide={slide} n={num(idx + 1)} footer={footer} theme={theme} build={slide.animation ? { shown: build, effect: slide.animation } : undefined} />
                      </div>
                    </div>
                  )}
                </div>
                <div className="h-9 shrink-0 flex items-center justify-center gap-3 text-white/80 text-[12.5px]">
                  <button aria-label="Previous slide" onClick={back} className="w-7 h-7 rounded hover:bg-white/10 flex items-center justify-center"><ChevronLeft20Regular /></button>
                  Slide {idx + 1} of {slides.length}
                  <button aria-label="Next slide" onClick={advance} className="w-7 h-7 rounded hover:bg-white/10 flex items-center justify-center"><ChevronRight20Regular /></button>
                  <button onClick={() => setMode('normal')} className="ml-6 h-7 px-3 rounded hover:bg-white/10">Exit Reading View</button>
                </div>
              </div>
            ) : (
              <>
                {/* thumbnails / outline */}
                {mode === 'outline' ? (
                  <div className="w-[280px] shrink-0 overflow-auto py-2 px-3 bg-white border-r border-[#E0E0E0]" data-agent="ppt-outline">
                    {slides.map((s, i) => (
                      <div key={s.id} className={`mb-3 rounded p-1.5 ${i === idx ? 'bg-[#FBE9E4]' : ''}`} onClick={() => setCur(i)}>
                        <div className="flex items-start gap-2">
                          <span className="text-[12px] text-[#616161] w-4 text-right pt-[3px]">{i + 1}</span>
                          <SlideMultiple16Regular className="mt-[3px] text-[#616161] shrink-0" />
                          <input value={s.title} placeholder="Click to add title" onChange={(e) => patchSlideAt(i, { title: e.target.value })} className="flex-1 min-w-0 text-[13px] font-semibold outline-none bg-transparent" />
                        </div>
                        <textarea
                          value={s.bullets.join('\n')}
                          placeholder="Add text"
                          onChange={(e) => patchSlideAt(i, { bullets: e.target.value.split('\n') })}
                          rows={Math.max(1, s.bullets.length)}
                          className="ml-[46px] w-[calc(100%-46px)] resize-none outline-none bg-transparent text-[12.5px] leading-[1.5] text-[#424242]"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="w-[200px] shrink-0 overflow-auto py-2 pr-2" data-agent="ppt-thumbnails" tabIndex={-1}>
                    {slides.map((s, i) => (
                      <div key={s.id}>
                        {s.section && slides[i - 1]?.section !== s.section && <div className="pl-3 pb-1 text-[11.5px] font-semibold text-[#424242] truncate">▾ {s.section}</div>}
                        <div
                          className="flex items-start gap-1.5 mb-2.5 pl-1"
                          draggable
                          onDragStart={() => setDragFrom(i)}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => (dragFrom !== null && moveSlide(dragFrom, i), setDragFrom(null))}
                        >
                          <span className={`w-5 text-right text-[11.5px] text-[#424242] pt-0.5 ${s.hidden ? 'line-through' : ''}`}>{i + 1}</span>
                          <button
                            data-agent={`ppt-slide-${i}`}
                            aria-label={`Slide ${i + 1}: ${s.title || 'Untitled'}`}
                            onClick={() => {
                              setCur(i)
                              setShapeSel(null)
                              if (painter) {
                                patchSlideAt(i, { fmt: painter.fmt, bg: painter.bg })
                                setPainter(null)
                              }
                            }}
                            onContextMenu={(e) => {
                              e.preventDefault()
                              setCur(i)
                              const r = rootRef.current!.getBoundingClientRect()
                              setCtx({ x: e.clientX - r.left, y: e.clientY - r.top, i })
                            }}
                            className={`relative shrink-0 rounded-[4px] overflow-hidden bg-white ${i === idx ? 'outline outline-2 outline-[#C43E1C] outline-offset-1' : 'outline outline-1 outline-[#D1D1D1] hover:outline-[#A0A0A0]'} ${fresh.includes(s.id) ? 'flash-new' : ''} ${s.hidden ? 'opacity-50' : ''}`}
                            style={{ width: 160, height: 90 }}
                          >
                            <div className="absolute left-0 top-0 origin-top-left pointer-events-none" style={{ transform: `scale(${160 / SW})`, width: SW, height: SH }}>
                              <SlideView slide={s} n={num(i + 1)} footer={footer} theme={theme} />
                            </div>
                            {s.createdBy === 'hworker' && <span className="absolute right-1 bottom-1 w-2 h-2 rounded-full bg-[#430693]" title="Added by H-Worker" />}
                            {(s.comments?.length ?? 0) > 0 && <span className="absolute left-1 top-1 w-3 h-3 rounded-sm bg-[#C43E1C] text-white text-[8px] leading-3 text-center" title="Comments">{s.comments!.length}</span>}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* canvas + notes */}
                <div className="flex-1 min-w-0 flex flex-col">
                  {ruler && mode === 'normal' && (
                    <div className="h-[18px] shrink-0 bg-white border-b border-[#E0E0E0] flex justify-center overflow-hidden">
                      <div className="relative h-full" style={{ width: SW * scale }}>
                        {Array.from({ length: 21 }, (_, i) => (
                          <span key={i} className="absolute bottom-0 text-[9px] text-[#616161]" style={{ left: (i / 20) * SW * scale }}>
                            <span className="block w-px h-[6px] bg-[#8A8A8A]" />
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div ref={canvasRef} className={`flex-1 min-h-0 flex items-center justify-center bg-[#E6E6E6] rounded-tl-lg ${zoomOverride ? 'overflow-auto' : ''}`}>
                    {slide && mode === 'notesPage' ? (
                      <div className="bg-white shadow-[0_2px_8px_rgba(0,0,0,0.18)] p-6 flex flex-col gap-4" style={{ width: SW * fit * 0.62 + 48, maxHeight: '96%' }}>
                        <div className="relative" style={{ width: SW * fit * 0.62, height: SH * fit * 0.62 }}>
                          <div className="absolute left-0 top-0 origin-top-left" style={{ transform: `scale(${fit * 0.62})`, width: SW, height: SH }}>
                            <SlideView slide={slide} n={num(idx + 1)} footer={footer} theme={theme} />
                          </div>
                        </div>
                        <textarea value={slide.notes ?? ''} onChange={(e) => patchSlide({ notes: e.target.value })} placeholder="Click to add text" className="flex-1 min-h-[120px] resize-none outline-none text-[14px] leading-[1.6]" />
                      </div>
                    ) : (
                      slide && (
                        <div key={slide.id + ':' + preview} style={{ width: SW * scale, height: SH * scale, animation: preview ? transAnim(slide.transition) : undefined }} className="relative shrink-0 shadow-[0_2px_8px_rgba(0,0,0,0.18)]">
                          <div className="absolute left-0 top-0 origin-top-left" style={{ transform: `scale(${scale})`, width: SW, height: SH }} data-agent="ppt-canvas">
                            <SlideView
                              key={slide.id}
                              slide={slide}
                              n={num(idx + 1)}
                              footer={footer}
                              theme={theme}
                              build={preview && slide.animation ? { shown: bullets, effect: slide.animation } : undefined}
                              edit={{
                                onTitle: (v) => patchSlide({ title: v }),
                                onSubtitle: (v) => patchSlide({ subtitle: v }),
                                onBullets: (v) => patchSlide({ bullets: v }),
                                onFocusBox: (b) => {
                                  setBox(b)
                                  setShapeSel(null)
                                },
                                selected: shapeSel,
                                onSelectShape: setShapeSel,
                                onShape: patchShape,
                                scale,
                              }}
                            />
                            {gridlines && (
                              <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#0000001A 1px, transparent 1px), linear-gradient(90deg, #0000001A 1px, transparent 1px)', backgroundSize: '48px 48px' }}>
                                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-[#C43E1C]/40" />
                                <div className="absolute top-1/2 left-0 right-0 h-px bg-[#C43E1C]/40" />
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                  {notesOpen && mode !== 'notesPage' && (
                    <div className="h-[86px] shrink-0 bg-white border-t border-[#E0E0E0]">
                      <textarea
                        data-agent="ppt-notes"
                        aria-label="Speaker notes"
                        value={slide?.notes ?? ''}
                        onChange={(e) => patchSlide({ notes: e.target.value })}
                        placeholder="Click to add notes"
                        className="w-full h-full resize-none outline-none px-5 py-3 text-[13px] leading-[1.5] placeholder:text-[#8A8886]"
                      />
                    </div>
                  )}
                </div>
              </>
            )}

            {/* side panes */}
            {pane === 'comments' && slide && (
              <SidePane title="Comments" onClose={() => setPane(null)} agent="ppt-comments-pane" width={290}>
                <div className="p-3 space-y-3 text-[13px]">
                  <div className="text-[12px] text-[#616161]">Slide {idx + 1}{slide.title ? ` · ${slide.title}` : ''}</div>
                  {comments.map((c) => (
                    <div key={c.id} className={`rounded-md border border-[#E1E1E1] p-2.5 ${c.resolved ? 'opacity-60' : ''}`}>
                      <div className="flex items-center gap-2">
                        <Avatar id={c.author} size={22} />
                        <span className="text-[12.5px] font-semibold flex-1 truncate">{PEOPLE.find((p) => p.id === c.author)?.name ?? c.author}</span>
                        <button aria-label="Resolve" onClick={() => patchSlide({ comments: comments.map((x) => (x.id === c.id ? { ...x, resolved: !x.resolved } : x)) })} className="w-6 h-6 rounded hover:bg-[#F0F0F0] flex items-center justify-center"><CheckmarkCircle16Regular /></button>
                        <button aria-label="Delete" onClick={() => patchSlide({ comments: comments.filter((x) => x.id !== c.id) })} className="w-6 h-6 rounded hover:bg-[#F0F0F0] flex items-center justify-center"><Delete16Regular /></button>
                      </div>
                      <div className="text-[11px] text-[#616161] mt-0.5">{fmtSmart(c.at)}</div>
                      <div className="mt-1 whitespace-pre-wrap">{c.text}</div>
                    </div>
                  ))}
                  <div className="rounded-md border-2 p-2" style={{ borderColor: ORANGE }}>
                    <textarea data-agent="ppt-comment-input" value={commentDraft} onChange={(e) => setCommentDraft(e.target.value)} placeholder="Start a conversation" className="w-full h-[56px] resize-none outline-none text-[13px]" />
                    <div className="flex justify-end">
                      <button
                        data-agent="ppt-comment-post"
                        disabled={!commentDraft.trim()}
                        onClick={() => {
                          patchSlide({ comments: [...comments, { id: uid('cmt'), author: ME.id, text: commentDraft.trim(), at: new Date().toISOString() }] })
                          setCommentDraft('')
                        }}
                        className="h-7 px-3 rounded text-white text-[12.5px] font-semibold disabled:opacity-40"
                        style={{ background: ORANGE }}
                      >
                        Post
                      </button>
                    </div>
                  </div>
                </div>
              </SidePane>
            )}
            {pane === 'designer' && slide && (
              <SidePane title="Designer" onClose={() => setPane(null)} agent="ppt-designer-pane" width={260}>
                <div className="p-3 space-y-3">
                  <div className="text-[12px] text-[#616161]">Design ideas for slide {idx + 1}</div>
                  {Object.entries(THEMES).map(([k, t]) => (
                    <button key={k} onClick={() => patchDeck(() => ({ theme: k }))} className={`block w-full rounded overflow-hidden border-2 ${(deck?.theme ?? 'northwind') === k ? 'border-[#C43E1C]' : 'border-transparent hover:border-[#E0B4A8]'}`}>
                      <div className="relative" style={{ width: 228, height: 128 }}>
                        <div className="absolute left-0 top-0 origin-top-left pointer-events-none" style={{ transform: `scale(${228 / SW})`, width: SW, height: SH }}>
                          <SlideView slide={slide} n={num(idx + 1)} footer={footer} theme={t} />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </SidePane>
            )}
            {pane === 'animation' && slide && (
              <SidePane title="Animation Pane" onClose={() => setPane(null)} agent="ppt-animation-pane" width={260}>
                <div className="p-3 text-[13px] space-y-2">
                  {slide.animation ? (
                    slide.bullets.filter((b) => b.trim()).map((b, i) => (
                      <div key={i} className="flex items-center gap-2 h-8 px-2 rounded border border-[#E1E1E1]">
                        <span className="text-[11px] text-[#616161] w-4">{i + 1}</span>
                        <Sparkle20Regular className="w-4 h-4 text-[#2E7D32]" />
                        <span className="truncate flex-1">{b}</span>
                        <span className="text-[11px] text-[#616161]">{slide.animation}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-[#616161]">No animations on this slide. Choose an effect on the Animations tab.</div>
                  )}
                  <button onClick={() => setPreview((p) => p + 1)} className="h-8 px-3 rounded border border-[#C7C7C7] hover:bg-[#F5F5F5] flex items-center gap-1.5">
                    <Play20Regular className="w-4 h-4" /> Play
                  </button>
                </div>
              </SidePane>
            )}
            {pane === 'copilot' && deck && (
              <CopilotPane
                agent="ppt-copilot-pane"
                title="About this presentation"
                placeholder="Ask about this presentation"
                summary={[
                  `${slides.length} slides${slides.some((s) => s.hidden) ? ` (${slides.filter((s) => s.hidden).length} hidden)` : ''} using the ${theme.name} theme.`,
                  `Covers: ${slides.filter((s) => s.title && s.layout !== 'title').slice(0, 6).map((s) => s.title).join(' · ')}.`,
                  `${slides.filter((s) => !s.notes?.trim()).length} slides have no speaker notes.`,
                ]}
                suggestions={[
                  {
                    label: 'Add an agenda slide',
                    run: () => {
                      const titles = slides.filter((s, i) => i > 0 && s.title && s.layout !== 'closing' && !/agenda/i.test(s.title)).map((s) => s.title)
                      insertSlides([{ id: uid('sl'), layout: 'titleContent', title: 'Agenda', bullets: titles.slice(0, 8) }], 1)
                      return `Added an agenda slide after the title with ${Math.min(8, titles.length)} topics.`
                    },
                  },
                  {
                    label: 'Write speaker notes for this slide',
                    run: () => {
                      if (!slide) return 'Select a slide first.'
                      const pts = [...slide.bullets, ...(slide.bullets2 ?? [])].filter((b) => b.trim())
                      const notes = pts.length ? `In this slide we cover ${slide.title.toLowerCase()}. ${pts.map((b, i) => `${i === 0 ? 'First' : i === pts.length - 1 ? 'Finally' : 'Next'}, ${b.replace(/\.$/, '')}.`).join(' ')}` : `Introduce “${slide.title}” and pause for questions.`
                      patchSlide({ notes: slide.notes?.trim() ? `${slide.notes}\n${notes}` : notes })
                      return 'Added speaker notes to the current slide.'
                    },
                  },
                  {
                    label: 'Summarize this presentation',
                    run: () => slides.filter((s) => s.title).map((s, i) => `${i + 1}. ${s.title}${s.bullets[0] ? ` — ${s.bullets[0]}` : ''}`).join('\n'),
                  },
                  {
                    label: 'Add a closing slide',
                    run: () => {
                      insertSlides([{ id: uid('sl'), layout: 'closing', title: 'Thank you', subtitle: 'Questions and discussion', bullets: [] }], slides.length)
                      return 'Added a closing slide at the end.'
                    },
                  },
                ]}
                onClose={() => setPane(null)}
              />
            )}
          </div>

          {/* status bar */}
          <div className="h-[26px] shrink-0 flex items-center px-3 text-[12px] text-[#424242] bg-[#F3F3F3] border-t border-[#E0E0E0] gap-4 select-none">
            <span>
              Slide {idx + 1} of {slides.length}
            </span>
            <span>English (United States)</span>
            <button onClick={() => setDialog('spelling')} className="flex items-center gap-1 hover:bg-[#E0E0E0] rounded px-1 -mx-1">
              <Accessibility16Regular /> Accessibility: Investigate
            </button>
            {hworker && <HWorkerChip />}
            <span className="flex-1" />
            <button onClick={() => deleteSlide()} className="hidden" aria-label="Delete slide" />
            <button onClick={() => setNotesOpen((n) => !n)} className={`flex items-center gap-1 rounded px-1 ${notesOpen ? 'bg-[#E0E0E0]' : 'hover:bg-[#E0E0E0]'}`}>
              <Notepad16Regular /> Notes
            </button>
            <button onClick={() => setPane((p) => (p === 'comments' ? null : 'comments'))} className="flex items-center gap-1 hover:bg-[#E0E0E0] rounded px-1">
              <Comment20Regular className="w-4 h-4" /> Comments
            </button>
            <span className="flex items-center gap-1">
              <Desktop16Regular /> Display Settings
            </span>
            <span className="flex items-center gap-0.5">
              <button className={`w-7 h-[22px] flex items-center justify-center rounded ${mode === 'normal' ? 'bg-[#DADADA]' : 'hover:bg-[#E0E0E0]'}`} title="Normal" onClick={() => setMode('normal')}>
                <SlideMultiple16Regular />
              </button>
              <button className={`w-7 h-[22px] flex items-center justify-center rounded ${mode === 'sorter' ? 'bg-[#DADADA]' : 'hover:bg-[#E0E0E0]'}`} title="Slide Sorter" onClick={() => setMode('sorter')}>
                <Grid16Regular />
              </button>
              <button className={`w-7 h-[22px] flex items-center justify-center rounded ${mode === 'reading' ? 'bg-[#DADADA]' : 'hover:bg-[#E0E0E0]'}`} title="Reading View" onClick={() => (setMode('reading'), setBuild(0))}>
                <BookOpen16Regular />
              </button>
              <button className="w-7 h-[22px] flex items-center justify-center rounded hover:bg-[#E0E0E0]" title="Slide Show" onClick={() => startShow(idx)}>
                <Eye20Regular className="w-4 h-4" />
              </button>
            </span>
            <span className="flex items-center gap-1.5">
              <button aria-label="Zoom out" onClick={() => setZoomOverride(Math.max(0.2, Math.round((scale - 0.1) * 10) / 10))}>
                <Subtract16Regular className="w-3.5 h-3.5" />
              </button>
              <span className="relative w-[100px] h-[2px] bg-[#8A8A8A]">
                <span className="absolute -top-[6px] w-[4px] h-[14px] -ml-[2px] bg-[#424242] rounded-sm" style={{ left: `${Math.min(100, scale * 60)}%` }} />
              </span>
              <button aria-label="Zoom in" onClick={() => setZoomOverride(Math.min(3, Math.round((scale + 0.1) * 10) / 10))}>
                <Add16Regular className="w-3.5 h-3.5" />
              </button>
              <span className="w-9 text-right">{Math.round(scale * 100)}%</span>
              <button aria-label="Fit slide to current window" title="Fit slide to current window" onClick={() => setZoomOverride(null)}>
                <ArrowFit16Regular />
              </button>
            </span>
          </div>
        </>
      )}

      {ctx && (
        <div className="absolute z-[75]" style={{ left: ctx.x, top: ctx.y }}>
          <PopMenu items={ctxItems(ctx.i)} onClose={() => setCtx(null)} style={{ top: 0, marginTop: 0 }} width={200} free />
        </div>
      )}

      {present && slide && (
        <div className="absolute inset-0 z-[60] bg-black flex items-center justify-center" data-agent="ppt-slideshow" onClick={advance}>
          {presenterView ? (
            <div className="absolute inset-0 flex bg-[#1F1F1F] text-white" onClick={(e) => e.stopPropagation()}>
              <div className="flex-[3] flex flex-col p-4 gap-3">
                <div className="text-[13px] text-white/70">
                  Slide {idx + 1} of {slides.length} · {String(Math.floor(showTime / 60)).padStart(2, '0')}:{String(showTime % 60).padStart(2, '0')}
                </div>
                <div className="relative flex-1" onClick={advance}>
                  <PresentSlide slide={slide} n={num(idx + 1)} footer={footer} theme={theme} build={slide.animation ? { shown: build, effect: slide.animation } : undefined} />
                </div>
              </div>
              <div className="flex-[2] flex flex-col p-4 gap-3 border-l border-white/10">
                <div className="text-[13px] text-white/70">Next slide</div>
                <div className="relative h-[180px]">{nextVisible ? <PresentSlide slide={nextVisible.s} n={num(nextVisible.i + 1)} footer={footer} theme={theme} /> : <div className="h-full flex items-center justify-center text-white/50 text-[13px]">End of slide show</div>}</div>
                <div className="text-[13px] text-white/70">Notes</div>
                <div className="flex-1 overflow-auto text-[16px] leading-[1.5] whitespace-pre-wrap" data-agent="ppt-presenter-notes">{slide.notes || <span className="text-white/40">No notes for this slide.</span>}</div>
              </div>
            </div>
          ) : (
            <div key={slide.id} className="absolute inset-0" style={{ animation: transAnim(slide.transition) }}>
              <PresentSlide slide={slide} n={num(idx + 1)} footer={footer} theme={theme} build={slide.animation ? { shown: build, effect: slide.animation } : undefined} />
            </div>
          )}
          {black && <div className="absolute inset-0" style={{ background: black }} />}
          {rehearse && (
            <div className="absolute left-1/2 -translate-x-1/2 top-3 bg-black/70 text-white text-[14px] rounded px-3 py-1 font-mono" onClick={(e) => e.stopPropagation()}>
              {String(Math.floor(showTime / 60)).padStart(2, '0')}:{String(showTime % 60).padStart(2, '0')}
            </div>
          )}
          <div className="absolute left-4 bottom-4 flex items-center gap-2 opacity-60 hover:opacity-100" onClick={(e) => e.stopPropagation()}>
            <button aria-label="Previous" onClick={back} className="w-8 h-8 rounded-full bg-white/15 text-white flex items-center justify-center"><ChevronLeft20Regular /></button>
            <button aria-label="Next" onClick={advance} className="w-8 h-8 rounded-full bg-white/15 text-white flex items-center justify-center"><ChevronRight20Regular /></button>
            <button aria-label="Presenter view" title="Presenter view" onClick={() => setPresenterView((v) => !v)} className="w-8 h-8 rounded-full bg-white/15 text-white flex items-center justify-center"><Presenter20Regular /></button>
            <button aria-label="Black screen" title="Black screen (B)" onClick={() => setBlack((b) => (b ? null : 'black'))} className="w-8 h-8 rounded-full bg-white/15 text-white flex items-center justify-center text-[11px] font-semibold">B</button>
            <button data-agent="ppt-end-show" aria-label="End Slide Show" onClick={() => setPresent(false)} className="w-8 h-8 rounded-full bg-white/15 text-white flex items-center justify-center"><Dismiss20Regular /></button>
          </div>
        </div>
      )}

      {/* dialogs */}
      {dialog === 'share' && deck && (
        <ShareDialog
          prefix="ppt"
          accent={ORANGE}
          name={deck.name}
          sharedWith={deck.sharedWith ?? []}
          onShare={(emails) => {
            patchDeck((d) => ({ sharedWith: Array.from(new Set([...(d.sharedWith ?? []), ...emails])) }))
            toast({ appId: 'powerpoint', title: 'Link sent', body: `${emails.length} ${emails.length === 1 ? 'person' : 'people'} can now edit “${deck.name}”.` })
          }}
          onCopy={() => {
            navigator.clipboard?.writeText(`https://northwind-my.sharepoint.com/:p:/g/personal/alex/${deck.id}`).catch(() => {})
            toast({ appId: 'powerpoint', title: 'Link copied', body: 'Paste it anywhere to share this presentation.' })
          }}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'replace' && <ReplaceDialog onFind={findSlide} onReplaceAll={replaceAll} onClose={() => setDialog(null)} />}
      {dialog === 'headerFooter' && deck && (
        <HeaderFooterDialog
          footer={deck.footer ?? 'Northwind Global'}
          showFooter={deck.showFooter !== false}
          showNumbers={deck.showNumbers !== false}
          onOk={(f, sf, sn) => patchDeck(() => ({ footer: f, showFooter: sf, showNumbers: sn }))}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'spelling' && (
        <MessageDialog title="Check Accessibility" onClose={() => setDialog(null)}>
          {(() => {
            const issues: string[] = []
            slides.forEach((s, i) => {
              if (!s.title.trim()) issues.push(`Slide ${i + 1} is missing a title.`)
              if (s.layout === 'chart' && s.chart && !s.notes) issues.push(`Slide ${i + 1}: the chart has no description (add speaker notes or alt text).`)
              if ((s.shapes ?? []).some((x) => x.kind !== 'text' && !x.text)) issues.push(`Slide ${i + 1}: a shape has no text alternative.`)
            })
            const dup = slides.map((s) => s.title).filter((t, i, a) => t && a.indexOf(t) !== i)
            if (dup.length) issues.push(`Duplicate slide titles: ${Array.from(new Set(dup)).join(', ')}.`)
            return issues.length ? <ul className="list-disc pl-4 space-y-1">{issues.map((x) => <li key={x}>{x}</li>)}</ul> : 'No accessibility issues found. Spelling check complete.'
          })()}
        </MessageDialog>
      )}
      {dialog === 'help' && (
        <MessageDialog title="PowerPoint Help" onClose={() => setDialog(null)}>
          <ul className="list-disc pl-4 space-y-1">
            <li>Ctrl+M adds a new slide, Ctrl+D duplicates the selected slide.</li>
            <li>F5 presents from the beginning; Shift+F5 from the current slide.</li>
            <li>During a slide show: arrows / space to move, B for a black screen, a number + Enter to jump.</li>
            <li>Drag thumbnails to reorder slides; right-click for more options.</li>
          </ul>
        </MessageDialog>
      )}
    </div>
  )
}

function PresentSlide({ slide, n, footer, theme, build }: { slide: Slide; n: number; footer: string; theme?: (typeof THEMES)[string]; build?: { shown: number; effect: string } }) {
  const ref = useRef<HTMLDivElement>(null)
  const s = useFit(ref, 0)
  return (
    <div ref={ref} className="absolute inset-0 flex items-center justify-center">
      <div style={{ width: SW * s, height: SH * s }} className="relative">
        <div className="absolute left-0 top-0 origin-top-left" style={{ transform: `scale(${s})`, width: SW, height: SH }}>
          <SlideView slide={slide} n={n} footer={footer} theme={theme} build={build} />
        </div>
      </div>
    </div>
  )
}

function SaveCopy({ initial, onSave }: { initial: string; onSave: (n: string) => void }) {
  const [n, setN] = useState(initial)
  return (
    <div className="flex items-center gap-2 max-w-[560px]">
      <input value={n} onChange={(e) => setN(e.target.value)} className="flex-1 h-9 px-2 rounded border border-[#C7C7C7] outline-none focus:border-[#C43E1C] text-[13px]" />
      <span className="text-[13px] text-[#616161]">.pptx</span>
      <button disabled={!n.trim()} onClick={() => onSave(n.trim())} className="h-9 px-4 rounded text-white text-[13px] font-semibold disabled:opacity-50" style={{ background: ORANGE }}>
        Save
      </button>
    </div>
  )
}

function ReplaceDialog({ onFind, onReplaceAll, onClose }: { onFind: (q: string) => boolean; onReplaceAll: (q: string, r: string) => number; onClose: () => void }) {
  const [q, setQ] = useState('')
  const [r, setR] = useState('')
  const [msg, setMsg] = useState('')
  return (
    <Modal
      title="Replace"
      width={420}
      onClose={onClose}
      agent="ppt-replace-dialog"
      footer={
        <>
          <Btn disabled={!q} onClick={() => setMsg(onFind(q) ? '' : 'PowerPoint couldn’t find that text.')}>
            Find Next
          </Btn>
          <Btn primary color={ORANGE} disabled={!q} onClick={() => { const n = onReplaceAll(q, r); setMsg(n ? `${n} replacement${n === 1 ? '' : 's'} made.` : 'PowerPoint couldn’t find that text.') }}>
            Replace All
          </Btn>
          <Btn onClick={onClose}>Close</Btn>
        </>
      }
    >
      <Field label="Find what">
        <input autoFocus className={inputCls} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && q && setMsg(onFind(q) ? '' : 'PowerPoint couldn’t find that text.')} />
      </Field>
      <Field label="Replace with">
        <input className={inputCls} value={r} onChange={(e) => setR(e.target.value)} />
      </Field>
      {msg && <div className="text-[12.5px] bg-[#F5F5F5] rounded px-2 py-1.5">{msg}</div>}
    </Modal>
  )
}

function HeaderFooterDialog({ footer, showFooter, showNumbers, onOk, onClose }: { footer: string; showFooter: boolean; showNumbers: boolean; onOk: (f: string, sf: boolean, sn: boolean) => void; onClose: () => void }) {
  const [f, setF] = useState(footer)
  const [sf, setSf] = useState(showFooter)
  const [sn, setSn] = useState(showNumbers)
  return (
    <Modal
      title="Header and Footer"
      width={420}
      onClose={onClose}
      footer={
        <>
          <Btn primary color={ORANGE} onClick={() => (onOk(f, sf, sn), onClose())}>
            Apply to All
          </Btn>
          <Btn onClick={onClose}>Cancel</Btn>
        </>
      }
    >
      <label className="flex items-center gap-2 text-[13px] mb-2">
        <input type="checkbox" checked={sn} onChange={(e) => setSn(e.target.checked)} /> Slide number
      </label>
      <label className="flex items-center gap-2 text-[13px] mb-2">
        <input type="checkbox" checked={sf} onChange={(e) => setSf(e.target.checked)} /> Footer
      </label>
      <input className={inputCls} value={f} disabled={!sf} onChange={(e) => setF(e.target.value)} />
    </Modal>
  )
}
