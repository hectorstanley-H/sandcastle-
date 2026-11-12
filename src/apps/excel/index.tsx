import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Save20Regular,
  ArrowUndo20Regular,
  ArrowRedo20Regular,
  ChevronDown12Regular,
  Search20Regular,
  Comment20Regular,
  Share20Regular,
  Sparkle20Regular,
  Add20Regular,
  ChevronLeft20Regular,
  ChevronRight20Regular,
  Dismiss16Regular,
  Checkmark16Regular,
  MoreVertical20Regular,
  Grid20Regular,
  DocumentMargins20Regular,
  Print20Regular,
  Subtract16Regular,
  Add16Regular,
  Cloud16Regular,
  Accessibility16Regular,
  Lightbulb20Regular,
  DataBarVertical20Regular,
  Dismiss20Regular,
  Filter12Regular,
  Cut20Regular,
  Copy20Regular,
  ClipboardPaste20Regular,
  TableInsertRow20Regular,
  TableDeleteRow20Regular,
  Eraser20Regular,
  ArrowSort20Regular,
  Filter20Regular,
  Comment16Regular,
  TableSimple20Regular,
  Link20Regular,
  ArrowSortDownLines16Regular,
  ArrowSortUpLines16Regular,
} from '@fluentui/react-icons'
import type { AppProps } from '@/os/registry'
import { logoUrl } from '@/os/registry'
import { WindowControls } from '@/os/Window'
import { useDesk, useWin } from '@/os/context'
import { db, uid, useCollection, useRecord } from '@/db/db'
import { Avatar } from '@/components/Avatar'
import { ME } from '@/data/people'
import { fmtSmart } from '@/data/time'
import type { Cell, CellFmt, Chart, Sheet, Workbook } from './seed'
import { COLS, NCOLS, NROWS, Evaluator, colIdx, currentRegion, formatValue, isErr, parseInput, parseRange, parseRef, refName, shiftFormula, FUNCTIONS, type Val } from './formula'
import { Ribbon, TABS, type RibbonTab, type RibbonActions } from './Ribbon'
import { ChartObject } from './Chart'
import type { CfRule, CfType, ChartType, XCell, XComment, XSheet, XWorkbook, InkStroke } from './types'
import { THEMES } from './types'
import { buildPivot, flashFill, hasHeader, parseDelimited, rgName, shiftSheets, sortRange, templateSheets, toTSV, workbookStats } from './ops'
import { PopMenu, Popover, type MenuItem } from './ui'
import {
  CF_STYLES,
  CfDialog,
  ConfirmDialog,
  FindReplaceDialog,
  FormatCellsDialog,
  GoalSeekDialog,
  ImportDialog,
  InsertFunctionDialog,
  MessageDialog,
  NameManagerDialog,
  PromptDialog,
  ShareDialog,
  SortDialog,
  TextToColumnsDialog,
  ValidationDialog,
} from './Dialogs'
import { CommentsPane, CopilotPane, FilterMenu, ScriptsPane } from './Panes'
import { Backstage } from './Backstage'

const GREEN = '#107C41'
const ROW_H = 20
const HEAD_H = 22
const ROWHEAD_W = 44
const DEFAULT_W = 72
const FONT = "'Aptos Narrow', Calibri, 'Segoe UI', var(--font-win)"

type Pos = { c: number; r: number }
type Sel = { c1: number; r1: number; c2: number; r2: number }
const norm = (a: Pos, b: Pos): Sel => ({ c1: Math.min(a.c, b.c), r1: Math.min(a.r, b.r), c2: Math.max(a.c, b.c), r2: Math.max(a.r, b.r) })
const rangeName = (s: Sel) => (s.c1 === s.c2 && s.r1 === s.r2 ? refName(s.c1, s.r1) : `${refName(s.c1, s.r1)}:${refName(s.c2, s.r2)}`)

const rawOf = (cell?: Cell) => (cell?.f ? cell.f : cell?.v === undefined ? '' : typeof cell.v === 'number' && cell.fmt === 'percent' ? `${+(cell.v * 100).toFixed(6)}%` : String(cell.v))

const qSheet = (name: string) => (/[^A-Za-z0-9_]/.test(name) ? `'${name.replace(/'/g, "''")}'` : name)
const FORMAT_KEYS: (keyof XCell)[] = ['bold', 'italic', 'underline', 'strike', 'fmt', 'fill', 'color', 'align', 'valign', 'wrap', 'indent', 'font', 'size', 'border', 'rotate']

/* ───────────────────────────── grid cell ───────────────────────────── */

type CellLook = {
  font?: string
  size?: number
  strike?: boolean
  valign?: 'top' | 'middle' | 'bottom'
  wrap?: boolean
  indent?: number
  rotate?: number
  border?: XCell['border']
  link?: boolean
  comment?: boolean
  bar?: number
  barColor?: string
  spark?: { vals: number[]; type: 'line' | 'column' | 'winloss' }
  spanW?: number
  grid?: boolean
  stickyLeft?: number
  filterActive?: boolean
}

function Sparkline({ vals, type, w }: { vals: number[]; type: 'line' | 'column' | 'winloss'; w: number }) {
  const W = w - 8
  const H = 14
  if (!vals.length) return null
  const max = Math.max(...vals.map((v) => Math.abs(v)), 1e-9)
  const min = Math.min(...vals)
  const hi = Math.max(...vals)
  if (type === 'line') {
    const pts = vals.map((v, i) => `${(i / Math.max(1, vals.length - 1)) * W},${H - ((v - min) / Math.max(1e-9, hi - min)) * H}`).join(' ')
    return (
      <svg width={W} height={H} className="absolute left-1 bottom-[3px]">
        <polyline points={pts} fill="none" stroke="#156082" strokeWidth={1.4} />
      </svg>
    )
  }
  const bw = W / vals.length
  return (
    <svg width={W} height={H} className="absolute left-1 bottom-[3px]">
      {vals.map((v, i) => {
        const h = type === 'winloss' ? H / 2 - 1 : Math.max(1, (Math.abs(v) / max) * H)
        const y = type === 'winloss' ? (v >= 0 ? 0 : H / 2 + 1) : H - h
        return <rect key={i} x={i * bw + 0.5} y={y} width={Math.max(1, bw - 1.5)} height={h} fill={v < 0 ? '#C00000' : '#156082'} />
      })}
    </svg>
  )
}

const CellView = memo(function CellView({
  refId,
  text,
  w,
  align,
  bold,
  italic,
  underline,
  fill,
  color,
  err,
  filterBtn,
  onDown,
  onEnter,
  onDouble,
  onFilter,
  onCtx,
  look,
}: {
  refId: string
  text: string
  w: number
  align: 'left' | 'center' | 'right'
  bold?: boolean
  italic?: boolean
  underline?: boolean
  fill?: string
  color?: string
  err?: boolean
  filterBtn?: boolean
  onDown: (ref: string, shift: boolean) => void
  onEnter: (ref: string, buttons: number) => void
  onDouble: (ref: string) => void
  onFilter?: (ref: string, el: HTMLElement) => void
  onCtx?: (ref: string, e: React.MouseEvent) => void
  look?: CellLook
}) {
  const L = look ?? {}
  const deco = [underline || L.link ? 'underline' : '', L.strike ? 'line-through' : ''].filter(Boolean).join(' ') || undefined
  const bd = '1px solid #000'
  const border: React.CSSProperties =
    L.border === 'all' || L.border === 'outside'
      ? { boxShadow: 'inset 0 0 0 1px #000' }
      : L.border === 'bottom'
        ? { borderBottom: bd }
        : L.border === 'thickBottom'
          ? { borderBottom: '2.5px solid #000' }
          : L.border === 'top'
            ? { borderTop: bd }
            : {}
  const span = L.spanW && L.spanW > w
  return (
    <div
      data-agent={`excel-cell-${refId}`}
      aria-label={`Cell ${refId}`}
      onMouseDown={(e) => e.button === 0 && onDown(refId, e.shiftKey)}
      onMouseEnter={(e) => onEnter(refId, e.buttons)}
      onDoubleClick={() => onDouble(refId)}
      onContextMenu={onCtx ? (e) => onCtx(refId, e) : undefined}
      className={`relative shrink-0 h-full ${L.grid === false ? '' : 'border-r border-b border-[#E1E1E1]'} px-[3px] flex pb-[1px] ${L.wrap ? 'overflow-hidden whitespace-normal leading-[1.15]' : 'overflow-visible whitespace-nowrap'} ${L.valign === 'top' ? 'items-start pt-[1px]' : L.valign === 'middle' ? 'items-center' : 'items-end'}`}
      style={{
        width: w,
        background: fill ?? (L.stickyLeft !== undefined ? '#fff' : undefined),
        justifyContent: align === 'right' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start',
        fontWeight: bold ? 700 : 400,
        fontStyle: italic ? 'italic' : undefined,
        textDecoration: deco,
        color: err ? '#C00000' : L.link && !color ? '#0563C1' : color,
        fontFamily: L.font ? `'${L.font}', ${FONT}` : undefined,
        fontSize: L.size ? `${(L.size / 11) * 100}%` : undefined,
        paddingLeft: L.indent ? 3 + L.indent * 9 : undefined,
        ...(L.stickyLeft !== undefined ? { position: 'sticky', left: L.stickyLeft, zIndex: 3 } : {}),
        ...border,
      }}
    >
      {L.bar !== undefined && L.bar > 0 && <span className="absolute left-[2px] top-[2px] bottom-[2px] pointer-events-none" style={{ width: `calc(${Math.min(1, L.bar) * 100}% - 4px)`, background: `linear-gradient(90deg, ${L.barColor ?? '#638EC6'}, ${L.barColor ?? '#638EC6'}33)` }} />}
      {L.spark && <Sparkline vals={L.spark.vals} type={L.spark.type} w={w} />}
      {span ? (
        <span className="absolute left-0 top-0 bottom-0 z-[2] flex items-end justify-center pb-[1px] px-[3px]" style={{ width: L.spanW, background: fill ?? '#fff', boxShadow: L.grid === false ? undefined : 'inset 0 -1px 0 #E1E1E1, inset -1px 0 0 #E1E1E1' }}>
          {text}
        </span>
      ) : (
        <span className={align === 'left' && !L.wrap ? 'relative z-[1]' : 'overflow-hidden relative'} style={L.rotate ? { transform: `rotate(${-L.rotate}deg)`, transformOrigin: 'left bottom', display: 'inline-block' } : undefined}>
          {text}
        </span>
      )}
      {L.comment && <span className="absolute right-0 top-0 w-0 h-0 border-l-[7px] border-l-transparent border-t-[7px] border-t-[#8B5CF6] z-[2]" />}
      {filterBtn && (
        <span
          data-agent={`excel-filter-btn-${refId}`}
          onMouseDown={(e) => {
            if (!onFilter) return
            e.stopPropagation()
            onFilter(refId, e.currentTarget as HTMLElement)
          }}
          className="absolute right-[2px] bottom-[2px] w-[15px] h-[15px] bg-white border border-[#ABABAB] flex items-center justify-center z-[2] cursor-pointer hover:bg-[#E6F2EA]"
        >
          {L.filterActive ? <Filter12Regular className="w-[10px] h-[10px] text-[#107C41]" /> : <ChevronDown12Regular className="w-[10px] h-[10px] text-[#444]" />}
        </span>
      )}
    </div>
  )
})

/* ───────────────────────────── app ───────────────────────────── */

type Dialog =
  | { kind: 'formatCells' }
  | { kind: 'find'; tab: 'find' | 'replace' }
  | { kind: 'share' }
  | { kind: 'insertFunction'; cat?: string }
  | { kind: 'prompt'; title: string; label: string; initial?: string; type?: 'text' | 'number'; options?: string[]; help?: string; onOk: (v: string) => void }
  | { kind: 'message'; title: string; body: React.ReactNode }
  | { kind: 'confirm'; title: string; body: React.ReactNode; okLabel?: string; onOk: () => void }
  | { kind: 'goalSeek' }
  | { kind: 'validation' }
  | { kind: 'textToColumns' }
  | { kind: 'import' }
  | { kind: 'names' }
  | { kind: 'cf'; type: CfType }
  | { kind: 'sort' }

type Ctx = { x: number; y: number; kind: 'cell' | 'row' | 'col' | 'sheet'; idx?: number }

export default function Excel({ win, params }: AppProps) {
  const { isAgent, toast } = useDesk()
  const { setTitle } = useWin()
  const workbooks = useCollection<Workbook>('excel.workbooks')
  const [wbId, setWbId] = useState<string | null>(null)
  const [backstage, setBackstage] = useState(false)
  const wb = useRecord<Workbook>('excel.workbooks', wbId) as XWorkbook | undefined
  const [si, setSi] = useState(0)
  const [active, setActive] = useState<Pos>({ c: 0, r: 0 })
  const [anchor, setAnchor] = useState<Pos>({ c: 0, r: 0 })
  const [editing, setEditing] = useState<{ value: string; src: 'cell' | 'bar' } | null>(null)
  const [tab, setTab] = useState<RibbonTab>('home')
  const [nameText, setNameText] = useState<string | null>(null)
  const [renaming, setRenaming] = useState<number | null>(null)
  const [renameText, setRenameText] = useState('')
  const [saveState, setSaveState] = useState<'saved' | 'saving'>('saved')
  const [fileMenu, setFileMenu] = useState(false)
  const [fileName, setFileName] = useState('')
  const [selChart, setSelChart] = useState<string | null>(null)
  const [freshCharts, setFreshCharts] = useState<string[]>([])
  const [analyze, setAnalyze] = useState(false)
  const [zoom, setZoom] = useState(100)
  const [pane, setPane] = useState<null | 'comments' | 'copilot' | 'scripts'>(null)
  const [commentDraft, setCommentDraft] = useState<string | null>(null)
  const [dialog, setDialog] = useState<Dialog | null>(null)
  const [ctx, setCtx] = useState<Ctx | null>(null)
  const [painter, setPainter] = useState<XCell | null>(null)
  const [view, setView] = useState<'normal' | 'pagebreak' | 'pagelayout'>('normal')
  const [filterOpen, setFilterOpen] = useState<{ range: string; col: number; x: number; y: number } | null>(null)
  const [validOpen, setValidOpen] = useState(false)
  const [trace, setTrace] = useState<Sel[] | null>(null)
  const [calcManual, setCalcManual] = useState(false)
  const [frozenCalc, setFrozenCalc] = useState<Map<string, Val> | null>(null)
  const [autoSave, setAutoSave] = useState(true)
  const [inkTool, setInkTool] = useState<null | 'pen0' | 'pen1' | 'highlighter' | 'eraser'>(null)
  const [inkShape, setInkShape] = useState(false)
  const [replay, setReplay] = useState(0)
  const [search, setSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [qatMenu, setQatMenu] = useState(false)
  const [shareMenu, setShareMenu] = useState(false)
  const [marquee, setMarquee] = useState<Sel | null>(null)
  const history = useRef<Sheet[][]>([])
  const future = useRef<Sheet[][]>([])
  const gridRef = useRef<HTMLDivElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const clip = useRef<{ cells: Record<string, XCell>; sel: Sel; cut: boolean; si: number; tsv: string } | null>(null)
  const pastePending = useRef(false)
  const findPos = useRef<{ si: number; c: number; r: number } | null>(null)
  const inkDraft = useRef<InkStroke | null>(null)
  const [, setInkTick] = useState(0)

  // deep links
  useEffect(() => {
    const p = params ?? {}
    if (p.workbookId) {
      setWbId(p.workbookId)
      setBackstage(false)
      const target = db.find<Workbook>('excel.workbooks', p.workbookId)
      let idx = 0
      if (target && p.sheet !== undefined) {
        idx = typeof p.sheet === 'number' ? p.sheet : Math.max(0, target.sheets.findIndex((s) => s.name === p.sheet))
      }
      setSi(idx)
      const pos = (p.cell && parseRef(p.cell)) || { c: 0, r: 0 }
      setActive(pos)
      setAnchor(pos)
    } else if (p.backstage) {
      setBackstage(true)
    } else if (!wbId) {
      const recent = [...db.get<Workbook>('excel.workbooks')].sort((a, b) => +new Date(b.modified) - +new Date(a.modified))[0]
      if (recent) setWbId(recent.id)
      else setBackstage(true)
    }
    setEditing(null)
  }, [win.nonce])

  useEffect(() => {
    if (wb) setTitle(`${wb.name} - Excel`)
  }, [wb?.name])

  const sheets = (wb?.sheets ?? []) as XSheet[]
  const sheet: XSheet | undefined = sheets[Math.min(si, Math.max(0, sheets.length - 1))]
  const ev = useMemo(() => new Evaluator(sheets as Sheet[], wb?.names), [sheets, wb?.names])
  const sel = norm(active, anchor)
  const activeRef = refName(active.c, active.r)
  const activeCell = sheet?.cells[activeRef] as XCell | undefined
  const theme = THEMES[wb?.theme ?? 'office'] ?? THEMES.office
  const HH = sheet?.showHeadings === false ? 0 : HEAD_H
  const RW = sheet?.showHeadings === false ? 0 : ROWHEAD_W

  /* ── filters: hidden rows ── */
  const hiddenRows = useMemo(() => {
    const out = new Set<number>()
    for (const [range, cols] of Object.entries(sheet?.filters ?? {})) {
      const rg = parseRange(range)
      if (!rg) continue
      for (const [off, vals] of Object.entries(cols)) {
        if (!vals.length) continue
        const c = rg.c1 + Number(off)
        for (let r = rg.r1 + 1; r <= rg.r2; r++) {
          const v = ev.value(si, c, r)
          if (vals.includes(v === null ? '' : formatValue(v, sheet?.cells[refName(c, r)]?.fmt))) out.add(r)
        }
      }
    }
    return out
  }, [sheet?.filters, ev, si])

  const widths = useMemo(() => Array.from({ length: NCOLS }, (_, c) => sheet?.colWidths?.[COLS[c]] ?? sheet?.defaultColWidth ?? DEFAULT_W), [sheet?.colWidths, sheet?.defaultColWidth])
  const lefts = useMemo(() => {
    const out = [RW]
    for (let c = 0; c < NCOLS; c++) out.push(out[c] + widths[c])
    return out
  }, [widths, RW])
  const heights = useMemo(() => Array.from({ length: NROWS }, (_, r) => (hiddenRows.has(r) ? 0 : (sheet?.rowHeights?.[r] ?? ROW_H))), [sheet?.rowHeights, hiddenRows])
  const tops = useMemo(() => {
    const out = [HH]
    for (let r = 0; r < NROWS; r++) out.push(out[r] + heights[r])
    return out
  }, [heights, HH])

  /* ── writes ── */
  const writeSheets = useCallback(
    (fn: (sheets: Sheet[]) => Sheet[], opts?: { noHistory?: boolean }) => {
      if (!wbId) return
      const cur = db.find<Workbook>('excel.workbooks', wbId)
      if (!cur) return
      if (!opts?.noHistory) {
        history.current.push(cur.sheets)
        if (history.current.length > 60) history.current.shift()
        future.current = []
      }
      db.update('excel.workbooks', wbId, { sheets: fn(cur.sheets), modified: new Date().toISOString(), ...(isAgent ? { updatedBy: 'hworker' } : {}) })
      setSaveState('saving')
      setTimeout(() => setSaveState('saved'), 700)
    },
    [wbId, isAgent],
  )
  const writeSheet = useCallback(
    (fn: (s: Sheet) => Sheet) => writeSheets((all) => all.map((s, i) => (i === si ? fn(s) : s))),
    [writeSheets, si],
  )
  const writeX = (fn: (s: XSheet) => XSheet) => writeSheet((s) => fn(s as XSheet) as Sheet)
  const protectedMsg = () =>
    setDialog({ kind: 'message', title: 'Microsoft Excel', body: 'The cell or chart you’re trying to change is on a protected sheet. To make a change, unprotect the sheet (Review ▸ Unprotect Sheet).' })
  const locked = () => {
    if (!sheet?.protected) return false
    protectedMsg()
    return true
  }
  const setCells = useCallback(
    (fn: (cells: Record<string, Cell>) => Record<string, Cell>) => {
      const cur = db.find<Workbook>('excel.workbooks', wbId ?? '')?.sheets[si] as XSheet | undefined
      if (cur?.protected) return protectedMsg()
      writeSheet((s) => ({ ...s, cells: fn({ ...s.cells }) }))
    },
    [writeSheet, wbId, si],
  )
  const forSel = (fn: (cell: XCell | undefined, ref: string) => XCell | undefined) =>
    setCells((cells) => {
      for (let r = sel.r1; r <= sel.r2; r++)
        for (let c = sel.c1; c <= sel.c2; c++) {
          const ref = refName(c, r)
          const next = fn(cells[ref] as XCell | undefined, ref)
          if (next && Object.keys(next).length) cells[ref] = next as Cell
          else delete cells[ref]
        }
      return cells
    })
  const patchSel = (patch: Partial<XCell>) =>
    forSel((c) => {
      const n: any = { ...(c ?? {}), ...patch }
      for (const k of Object.keys(patch)) if (n[k] === undefined) delete n[k]
      return n
    })

  const select = (p: Pos, extend = false) => {
    const q = { c: Math.max(0, Math.min(NCOLS - 1, p.c)), r: Math.max(0, Math.min(NROWS - 1, p.r)) }
    setActive(q)
    if (!extend) setAnchor(q)
    setSelChart(null)
  }
  const selectRange = (rg: Sel) => {
    setActive({ c: rg.c1, r: rg.r1 })
    setAnchor({ c: rg.c2, r: rg.r2 })
    setSelChart(null)
  }

  const commit = (value: string, move: 'down' | 'right' | 'none' = 'down') => {
    const ref = activeRef
    const vd = activeCell?.validation
    if (vd && value.trim() && !value.startsWith('=') && !vd.list.some((x) => x.toLowerCase() === value.trim().toLowerCase())) {
      setEditing(null)
      setDialog({ kind: 'message', title: 'Microsoft Excel', body: `This value doesn’t match the data validation restrictions defined for this cell. Allowed values: ${vd.list.join(', ')}.` })
      return
    }
    setCells((cells) => {
      const next = parseInput(value, cells[ref])
      if (Object.keys(next).length) cells[ref] = next
      else delete cells[ref]
      return cells
    })
    setEditing(null)
    if (move === 'down') select({ c: active.c, r: active.r + 1 })
    if (move === 'right') select({ c: active.c + 1, r: active.r })
  }

  const undo = () => {
    const prev = history.current.pop()
    if (!prev || !wbId) return
    future.current.push(db.find<Workbook>('excel.workbooks', wbId)!.sheets)
    db.update('excel.workbooks', wbId, { sheets: prev })
  }
  const redo = () => {
    const nxt = future.current.pop()
    if (!nxt || !wbId) return
    history.current.push(db.find<Workbook>('excel.workbooks', wbId)!.sheets)
    db.update('excel.workbooks', wbId, { sheets: nxt })
  }

  const save = () => {
    if (!wbId) return
    setSaveState('saving')
    db.update('excel.workbooks', wbId, { modified: new Date().toISOString(), ...(isAgent ? { updatedBy: 'hworker' } : {}) })
    setTimeout(() => setSaveState('saved'), 900)
  }
  const patchWb = (patch: Partial<XWorkbook>) => wbId && db.update('excel.workbooks', wbId, { ...patch, modified: new Date().toISOString() })

  /* ── grid events ── */
  const editRef = useRef(editing)
  editRef.current = editing
  const activeRefRef = useRef(activeRef)
  activeRefRef.current = activeRef
  const setCellsRef = useRef(setCells)
  setCellsRef.current = setCells
  const onDown = useCallback(
    (ref: string, shift: boolean) => {
      const p = parseRef(ref)
      if (!p) return
      const editing = editRef.current
      const setCells = setCellsRef.current
      if (editing) {
        // commit the pending edit first (Excel behaviour when clicking away)
        const v = editing.value
        const r0 = activeRefRef.current
        setCells((cells) => {
          const next = parseInput(v, cells[r0])
          if (Object.keys(next).length) cells[r0] = next
          else delete cells[r0]
          return cells
        })
        setEditing(null)
      }
      dragging.current = true
      setActive((a) => (shift ? a : p))
      if (shift) setActive(p)
      if (!shift) setAnchor(p)
      setSelChart(null)
      setCtx(null)
      setValidOpen(false)
      gridRef.current?.focus({ preventScroll: true })
    },
    [],
  )
  const onEnter = useCallback((ref: string, buttons: number) => {
    if (!dragging.current || !(buttons & 1)) return
    const p = parseRef(ref)
    if (p) setActive(p)
  }, [])
  const sheetRef = useRef(sheet)
  sheetRef.current = sheet
  const onDouble = useCallback(
    (ref: string) => {
      const p = parseRef(ref)
      if (!p) return
      setActive(p)
      setAnchor(p)
      const cur = sheetRef.current
      if (!cur) return
      if (cur.protected) return
      setEditing({ value: rawOf(cur.cells[ref] as Cell), src: 'cell' })
    },
    [],
  )
  const ctxOpen = useCallback((kind: Ctx['kind'], e: React.MouseEvent, idx?: number) => {
    e.preventDefault()
    const root = rootRef.current
    if (!root) return
    const r = root.getBoundingClientRect()
    const scale = r.width / root.offsetWidth || 1
    setCtx({ kind, idx, x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale })
  }, [])
  const selRef = useRef(sel)
  selRef.current = sel
  const onCellCtx = useCallback(
    (ref: string, e: React.MouseEvent) => {
      const p = parseRef(ref)
      const s = selRef.current
      if (p && !(p.c >= s.c1 && p.c <= s.c2 && p.r >= s.r1 && p.r <= s.r2)) {
        setActive(p)
        setAnchor(p)
      }
      ctxOpen('cell', e)
    },
    [ctxOpen],
  )
  const onFilterBtn = useCallback((ref: string, el: HTMLElement) => {
    const p = parseRef(ref)
    const s = sheetRef.current
    const root = rootRef.current
    if (!p || !s || !root) return
    const ranges = [...(s.tables ?? []).map((t) => t.range), ...(s.autoFilter ? [s.autoFilter] : [])]
    const range = ranges.find((r) => {
      const rg = parseRange(r)
      return rg && rg.r1 === p.r && p.c >= rg.c1 && p.c <= rg.c2
    })
    if (!range) return
    const rg = parseRange(range)!
    const rr = root.getBoundingClientRect()
    const scale = rr.width / root.offsetWidth || 1
    const b = el.getBoundingClientRect()
    setFilterOpen({ range, col: p.c - rg.c1, x: (b.left - rr.left) / scale, y: (b.bottom - rr.top) / scale + 2 })
  }, [])

  useEffect(() => {
    const up = () => {
      dragging.current = false
    }
    window.addEventListener('mouseup', up)
    return () => window.removeEventListener('mouseup', up)
  }, [])

  // Format Painter: apply on the next selection
  const painterRef = useRef(painter)
  painterRef.current = painter
  useEffect(() => {
    if (!painter) return
    const up = (e: MouseEvent) => {
      const p = painterRef.current
      if (!p) return
      if (!gridRef.current?.contains(e.target as Node)) return
      setTimeout(() => {
        const s = selRef.current
        setCellsRef.current((cells) => {
          for (let r = s.r1; r <= s.r2; r++)
            for (let c = s.c1; c <= s.c2; c++) {
              const ref = refName(c, r)
              const base: any = { ...(cells[ref] ?? {}) }
              for (const k of FORMAT_KEYS) delete base[k]
              cells[ref] = { ...base, ...p }
            }
          return cells
        })
        setPainter(null)
      })
    }
    const t = setTimeout(() => window.addEventListener('mouseup', up), 0)
    return () => {
      clearTimeout(t)
      window.removeEventListener('mouseup', up)
    }
  }, [painter])

  /* ── clipboard ── */
  const copySel = (cut: boolean) => {
    if (!sheet) return
    const cells: Record<string, XCell> = {}
    for (let r = sel.r1; r <= sel.r2; r++)
      for (let c = sel.c1; c <= sel.c2; c++) {
        const cell = sheet.cells[refName(c, r)]
        if (cell) cells[`${c - sel.c1},${r - sel.r1}`] = cell
      }
    const tsv = toTSV(sheet, sel, ev, si)
    clip.current = { cells, sel: { ...sel }, cut, si, tsv }
    setMarquee({ ...sel })
    navigator.clipboard?.writeText(tsv).catch(() => {})
  }
  const pasteInternal = (mode: 'all' | 'values' | 'formats' | 'formulas' | 'transpose' = 'all') => {
    const cb = clip.current
    if (!cb || !sheet || locked()) return
    const h = cb.sel.r2 - cb.sel.r1
    const w = cb.sel.c2 - cb.sel.c1
    writeSheets((all) =>
      all.map((s0, i) => {
        let s = s0 as XSheet
        if (cb.cut && i === cb.si) {
          const cells = { ...s.cells }
          for (let r = cb.sel.r1; r <= cb.sel.r2; r++) for (let c = cb.sel.c1; c <= cb.sel.c2; c++) delete cells[refName(c, r)]
          s = { ...s, cells }
        }
        if (i !== si) return s as Sheet
        const cells = { ...s.cells }
        for (let dr = 0; dr <= h; dr++)
          for (let dc = 0; dc <= w; dc++) {
            const src = cb.cells[`${dc},${dr}`]
            const [tc, tr] = mode === 'transpose' ? [active.c + dr, active.r + dc] : [active.c + dc, active.r + dr]
            if (tc >= NCOLS || tr >= NROWS) continue
            const ref = refName(tc, tr)
            if (!src) {
              if (mode === 'all' || mode === 'transpose') delete cells[ref]
              continue
            }
            const moved = src.f ? { ...src, f: cb.cut ? src.f : shiftFormula(src.f, tc - (cb.sel.c1 + dc), tr - (cb.sel.r1 + dr)) } : src
            if (mode === 'values') {
              const v = ev.value(cb.si, cb.sel.c1 + dc, cb.sel.r1 + dr)
              const base: any = { ...(cells[ref] ?? {}) }
              delete base.f
              cells[ref] = { ...base, v: v === null || isErr(v) || typeof v === 'boolean' ? (v === null ? undefined : formatValue(v)) : v }
            } else if (mode === 'formats') {
              const fm: any = {}
              for (const k of FORMAT_KEYS) if ((src as any)[k] !== undefined) fm[k] = (src as any)[k]
              cells[ref] = { ...(cells[ref] ?? {}), ...fm }
            } else if (mode === 'formulas') {
              cells[ref] = { ...(cells[ref] ?? {}), v: moved.v, f: moved.f } as Cell
            } else cells[ref] = { ...moved } as Cell
          }
        return { ...s, cells } as Sheet
      }),
    )
    selectRange(mode === 'transpose' ? { c1: active.c, r1: active.r, c2: active.c + h, r2: active.r + w } : { c1: active.c, r1: active.r, c2: active.c + w, r2: active.r + h })
    if (cb.cut) {
      clip.current = null
      setMarquee(null)
    }
  }
  const pasteText = (text: string) => {
    if (clip.current && text.replace(/\r/g, '') === clip.current.tsv) return pasteInternal()
    const rows = parseDelimited(text, '\t')
    if (!rows.length) return
    setCells((cells) => {
      rows.forEach((row, dr) =>
        row.forEach((v, dc) => {
          const c = active.c + dc
          const r = active.r + dr
          if (c >= NCOLS || r >= NROWS) return
          const ref = refName(c, r)
          const next = parseInput(v, cells[ref])
          if (Object.keys(next).length) cells[ref] = next
          else delete cells[ref]
        }),
      )
      return cells
    })
  }

  /* ── find ── */
  const findNext = (q: string, o: { matchCase: boolean; whole: boolean; all: boolean }) => {
    const norm2 = (s: string) => (o.matchCase ? s : s.toLowerCase())
    const needle = norm2(q)
    const sheetIdxs = o.all ? sheets.map((_, i) => i) : [si]
    const start = findPos.current && sheetIdxs.includes(findPos.current.si) ? findPos.current : { si, c: active.c, r: active.r }
    const order: { si: number; c: number; r: number }[] = []
    for (const s of [...sheetIdxs.slice(sheetIdxs.indexOf(start.si)), ...sheetIdxs.slice(0, sheetIdxs.indexOf(start.si))]) {
      const refs = Object.keys(sheets[s].cells)
        .map((k) => parseRef(k)!)
        .filter(Boolean)
        .sort((a, b) => a.r - b.r || a.c - b.c)
      for (const p of refs) order.push({ si: s, ...p })
    }
    const after = order.findIndex((x) => x.si === start.si && (x.r > start.r || (x.r === start.r && x.c > start.c)))
    const seq = after < 0 ? order : [...order.slice(after), ...order.slice(0, after)]
    for (const x of seq) {
      const v = ev.value(x.si, x.c, x.r)
      if (v === null) continue
      const t = norm2(formatValue(v, sheets[x.si].cells[refName(x.c, x.r)]?.fmt))
      const raw = norm2(rawOf(sheets[x.si].cells[refName(x.c, x.r)] as Cell))
      if (o.whole ? t === needle || raw === needle : t.includes(needle) || raw.includes(needle)) {
        findPos.current = x
        if (x.si !== si) setSi(x.si)
        select({ c: x.c, r: x.r })
        setTimeout(() => gridRef.current?.querySelector(`[data-agent="excel-cell-${refName(x.c, x.r)}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' }))
        return `Found in ${sheets[x.si].name}!${refName(x.c, x.r)}`
      }
    }
    return 'Microsoft Excel cannot find the data you’re searching for.'
  }
  const replaceIn = (q: string, rep: string, o: { matchCase: boolean; whole: boolean }, all: boolean) => {
    if (!sheet || locked()) return ''
    const re = new RegExp(o.whole ? `^${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$` : q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), o.matchCase ? 'g' : 'gi')
    let n = 0
    const targets = all ? Object.keys(sheet.cells) : [activeRef]
    setCells((cells) => {
      for (const ref of targets) {
        const c = cells[ref]
        if (!c || c.f || typeof c.v !== 'string') continue
        re.lastIndex = 0
        if (!re.test(c.v)) continue
        re.lastIndex = 0
        cells[ref] = { ...c, v: c.v.replace(re, rep) }
        n++
      }
      return cells
    })
    if (!all) findNext(q, { ...o, all: false })
    return all ? `All done. We made ${n} replacement${n === 1 ? '' : 's'}.` : n ? 'Replaced 1 cell.' : 'Microsoft Excel cannot find a match.'
  }

  /* ── structural ── */
  const wholeCols = sel.r1 === 0 && sel.r2 === NROWS - 1
  const wholeRows = sel.c1 === 0 && sel.c2 === NCOLS - 1
  const insertRows = (at = sel.r1, n = sel.r2 - sel.r1 + 1) => {
    if (locked()) return
    writeSheets((all) => shiftSheets(all as XSheet[], si, 'row', at, n) as Sheet[])
  }
  const deleteRows = (at = sel.r1, n = sel.r2 - sel.r1 + 1) => {
    if (locked()) return
    writeSheets((all) => shiftSheets(all as XSheet[], si, 'row', at, -n) as Sheet[])
  }
  const insertCols = (at = sel.c1, n = sel.c2 - sel.c1 + 1) => {
    if (locked()) return
    writeSheets((all) => shiftSheets(all as XSheet[], si, 'col', at, n) as Sheet[])
  }
  const deleteCols = (at = sel.c1, n = sel.c2 - sel.c1 + 1) => {
    if (locked()) return
    writeSheets((all) => shiftSheets(all as XSheet[], si, 'col', at, -n) as Sheet[])
  }
  const regionOf = () => (sel.r1 === sel.r2 && sel.c1 === sel.c2 && sheet ? currentRegion(sheet as Sheet, active.c, active.r) : sel)
  const doSort = (desc: boolean, col = active.c, rg0?: Sel, header?: boolean) => {
    if (!sheet || locked()) return
    const rg = rg0 ?? regionOf()
    const hdr = header ?? hasHeader(sheet, rg, ev, si)
    writeX((s) => sortRange(s, rg, Math.max(rg.c1, Math.min(rg.c2, col)), desc, hdr, ev, si))
  }
  const toggleFilter = () => {
    if (!sheet) return
    if (sheet.autoFilter) {
      writeX((s) => {
        const f = { ...(s.filters ?? {}) }
        delete f[s.autoFilter!]
        return { ...s, autoFilter: undefined, filters: f }
      })
    } else {
      const rg = regionOf()
      writeX((s) => ({ ...s, autoFilter: rgName(rg) }))
    }
  }
  const clearFilters = () => writeX((s) => ({ ...s, filters: {} }))

  const addCf = (rule: Omit<CfRule, 'id' | 'range'>, range = rangeName(sel)) => writeX((s) => ({ ...s, cf: [...(s.cf ?? []), { id: uid('cf'), range, ...rule }] }))

  const autoFitRows = (r1: number, r2: number) =>
    writeX((s) => {
      const rh = { ...(s.rowHeights ?? {}) }
      for (let r = r1; r <= r2; r++) {
        let lines = 1
        let size = 11
        for (let c = 0; c < NCOLS; c++) {
          const cell = s.cells[refName(c, r)]
          if (!cell) continue
          size = Math.max(size, cell.size ?? 11)
          if (!cell.wrap) continue
          const t = formatValue(ev.value(si, c, r), cell.fmt)
          const w = s.colWidths?.[COLS[c]] ?? s.defaultColWidth ?? DEFAULT_W
          lines = Math.max(lines, Math.ceil((t.length * 7 * ((cell.size ?? 11) / 11)) / Math.max(20, w - 8)))
        }
        const h = Math.round(lines * 17 * (size / 11) + 3)
        if (h === ROW_H && !s.rowHeights?.[r]) continue
        rh[r] = Math.max(ROW_H, h)
      }
      return { ...s, rowHeights: rh }
    })

  const insertChartOfType = (type: ChartType) => {
    if (!sheet) return
    const rg = regionOf()
    const id = uid('chart')
    const firstHeader = formatValue(ev.value(si, rg.c1 + 1, rg.r1))
    const chart = {
      id,
      type,
      range: rangeName(rg),
      title: rg.c2 - rg.c1 > 1 ? 'Chart Title' : firstHeader || 'Chart Title',
      col: Math.min(NCOLS - 6, Math.max(rg.c2, currentRegion(sheet as Sheet, rg.c1, rg.r1).c2) + 2),
      row: Math.max(0, rg.r1),
      w: type === 'pie' ? 440 : 600,
      h: 320,
      ...(isAgent ? { createdBy: 'hworker' } : {}),
    }
    writeX((s) => ({ ...s, charts: [...(s.charts ?? []), chart] }))
    setSelChart(id)
    setFreshCharts((f) => [...f, id])
  }

  const newPivot = (withChart = false, auto = false) => {
    if (!sheet || !wb) return
    const rg = regionOf()
    if (rg.r2 <= rg.r1) return setDialog({ kind: 'message', title: 'PivotTable', body: 'Select a cell inside a table of data with a header row, then try again.' })
    let byCol = active.c
    if (auto || typeof ev.value(si, byCol, rg.r1 + 1) === 'number') {
      // pick the text column with the most repeated values
      let best = -1
      let bestScore = -1
      for (let c = rg.c1; c <= rg.c2; c++) {
        const vals = new Set<string>()
        let text = 0
        for (let r = rg.r1 + 1; r <= rg.r2; r++) {
          const v = ev.value(si, c, r)
          if (typeof v === 'string' && v) (text++, vals.add(v))
        }
        const score = text && vals.size > 1 && vals.size < text ? text / vals.size : 0
        if (score > bestScore) (bestScore = score), (best = c)
      }
      if (best >= 0) byCol = best
    }
    let k = 1
    while (wb.sheets.some((s) => s.name === `PivotTable${k}`)) k++
    const pv = buildPivot(sheet as Sheet, rg, byCol, ev, si, `PivotTable${k}`)
    if (withChart) {
      const n = Object.keys(pv.cells).filter((x) => /^A\d+$/.test(x)).length - 2
      pv.charts = [{ id: uid('chart'), type: 'column', range: `A3:${COLS[Math.min(2, Object.keys(pv.cells).filter((x) => /^[A-Z]3$/.test(x)).length - 1)]}${3 + n}`, title: `${formatValue(ev.value(si, byCol, rg.r1))} summary`, col: 5, row: 2, w: 520, h: 300 }]
    }
    writeSheets((all) => [...all.slice(0, si + 1), pv as Sheet, ...all.slice(si + 1)])
    setSi(si + 1)
    select({ c: 0, r: 3 })
  }

  const addSparklines = (type: 'line' | 'column' | 'winloss') => {
    if (!sheet || locked()) return
    if (sel.c1 === sel.c2) return setDialog({ kind: 'message', title: 'Create Sparklines', body: 'Select a range of numbers across several columns (one row per sparkline) first.' })
    let target = sel.c2 + 1
    while (target < NCOLS - 1 && Array.from({ length: sel.r2 - sel.r1 + 1 }, (_, i) => sheet.cells[refName(target, sel.r1 + i)]).some(Boolean)) target++
    setCells((cells) => {
      for (let r = sel.r1; r <= sel.r2; r++) {
        const ref = refName(target, r)
        cells[ref] = { ...(cells[ref] ?? {}), spark: { range: `${refName(sel.c1, r)}:${refName(sel.c2, r)}`, type } } as Cell
      }
      return cells
    })
  }

  const goalSeek = (setRef: string, to: number, byRef: string) => {
    const sp = parseRef(setRef)
    const bp = parseRef(byRef)
    if (!sp || !bp || !sheet) return 'Enter valid cell references.'
    const bcell = sheet.cells[byRef]
    if (bcell?.f) return 'The “By changing cell” must contain a value, not a formula.'
    const evalWith = (x: number) => {
      const s2 = sheets.map((s, i) => (i === si ? { ...s, cells: { ...s.cells, [byRef]: { ...(s.cells[byRef] ?? {}), v: x } } } : s))
      const v = new Evaluator(s2 as Sheet[], wb?.names).value(si, sp.c, sp.r)
      return typeof v === 'number' ? v : NaN
    }
    let x0 = typeof bcell?.v === 'number' ? bcell.v : 0
    let x1 = x0 === 0 ? 1 : x0 * 1.1
    let f0 = evalWith(x0) - to
    let f1 = evalWith(x1) - to
    for (let i = 0; i < 60 && Math.abs(f1) > 1e-7; i++) {
      if (!Number.isFinite(f0) || !Number.isFinite(f1) || f1 === f0) break
      const x2 = x1 - (f1 * (x1 - x0)) / (f1 - f0)
      x0 = x1
      f0 = f1
      x1 = x2
      f1 = evalWith(x1) - to
    }
    if (!Number.isFinite(f1) || Math.abs(f1) > Math.max(1e-6, Math.abs(to) * 1e-6)) return `Goal Seeking with Cell ${setRef} may not have found a solution.`
    setCells((cells) => ({ ...cells, [byRef]: { ...(cells[byRef] ?? {}), v: Math.round(x1 * 1e6) / 1e6 } }))
    return `Goal Seeking with Cell ${setRef} found a solution. ${byRef} = ${formatValue(Math.round(x1 * 1e6) / 1e6)}`
  }

  const textToColumns = (delim: string) => {
    if (!sheet || locked()) return
    setCells((cells) => {
      for (let r = sel.r1; r <= sel.r2; r++) {
        const src = cells[refName(sel.c1, r)]
        if (!src || src.f || typeof src.v !== 'string') continue
        const parts = src.v.split(delim)
        parts.forEach((p, i) => {
          const c = sel.c1 + i
          if (c >= NCOLS) return
          const ref = refName(c, r)
          cells[ref] = { ...parseInput(p.trim(), i === 0 ? { ...src, v: undefined } : cells[ref]) }
        })
      }
      return cells
    })
  }

  const importData = (text: string, newSheet: boolean) => {
    if (!wb) return
    const rows = parseDelimited(text)
    const cells: Record<string, XCell> = {}
    const base = newSheet ? { c: 0, r: 0 } : active
    rows.forEach((row, r) =>
      row.forEach((v, c) => {
        if (base.c + c >= NCOLS || base.r + r >= NROWS) return
        const cell = parseInput(v)
        if (Object.keys(cell).length) cells[refName(base.c + c, base.r + r)] = r === 0 ? { ...cell, bold: true, fill: '#DDEBF7' } : cell
      }),
    )
    if (newSheet) {
      let k = 1
      while (wb.sheets.some((s) => s.name === `Query${k}`)) k++
      const ns: XSheet = { name: `Query${k}`, cells, tables: rows.length > 1 ? [{ range: `A1:${COLS[Math.min(NCOLS - 1, (rows[0]?.length ?? 1) - 1)]}${rows.length}`, style: 'TableStyleMedium2' }] : undefined }
      writeSheets((all) => [...all, ns as Sheet])
      setSi(wb.sheets.length)
      select({ c: 0, r: 0 })
    } else setCells((cur) => ({ ...cur, ...(cells as Record<string, Cell>) }))
  }

  const precedents = (): Sel[] => {
    const f = activeCell?.f
    if (!f) return []
    const out: Sel[] = []
    const re = /(?<![A-Za-z0-9_$.!'])(\$?[A-Z]{1,2}\$?\d{1,3})(?::(\$?[A-Z]{1,2}\$?\d{1,3}))?(?![\d(A-Za-z!])/g
    let m: RegExpExecArray | null
    while ((m = re.exec(f.split(/"(?:[^"]|"")*"/).join('""')))) {
      const rg = parseRange(m[0].replace(/\$/g, ''))
      if (rg) out.push(rg)
    }
    return out
  }

  const doCalcNow = () => {
    const m = new Map<string, Val>()
    sheets.forEach((s, i) => {
      for (const [ref, c] of Object.entries(s.cells)) {
        if (!c.f) continue
        const p = parseRef(ref)
        if (p) m.set(`${i}:${ref}`, ev.value(i, p.c, p.r))
      }
    })
    setFrozenCalc(m)
  }

  /* ── keyboard ── */
  const onGridKey = (e: React.KeyboardEvent) => {
    if (editing) return
    const k = e.key
    const mod = e.ctrlKey || e.metaKey
    const mv = (dc: number, dr: number) => {
      e.preventDefault()
      if (e.shiftKey) setActive((a) => ({ c: Math.max(0, Math.min(NCOLS - 1, a.c + dc)), r: Math.max(0, Math.min(NROWS - 1, a.r + dr)) }))
      else select({ c: active.c + dc, r: active.r + dr })
    }
    if (selChart && (k === 'Delete' || k === 'Backspace')) {
      e.preventDefault()
      const id = selChart
      setSelChart(null)
      return writeX((s) => ({ ...s, charts: (s.charts ?? []).filter((c) => c.id !== id) }))
    }
    if (mod && (k === 'ArrowDown' || k === 'ArrowUp' || k === 'ArrowLeft' || k === 'ArrowRight')) {
      // jump to the edge of the data region
      e.preventDefault()
      const dc = k === 'ArrowRight' ? 1 : k === 'ArrowLeft' ? -1 : 0
      const dr = k === 'ArrowDown' ? 1 : k === 'ArrowUp' ? -1 : 0
      const has = (c: number, r: number) => !!sheet?.cells[refName(c, r)]
      let c = active.c
      let r = active.r
      const inb = (c2: number, r2: number) => c2 >= 0 && r2 >= 0 && c2 < NCOLS && r2 < NROWS
      if (inb(c + dc, r + dr) && has(c, r) && has(c + dc, r + dr)) while (inb(c + dc, r + dr) && has(c + dc, r + dr)) (c += dc), (r += dr)
      else {
        c += dc
        r += dr
        while (inb(c, r) && !has(c, r) && inb(c + dc, r + dr)) (c += dc), (r += dr)
      }
      const q = { c: Math.max(0, Math.min(NCOLS - 1, c)), r: Math.max(0, Math.min(NROWS - 1, r)) }
      if (e.shiftKey) setActive(q)
      else select(q)
      return
    }
    if (k === 'ArrowDown' || k === 'Enter') return mv(0, 1)
    if (k === 'ArrowUp') return mv(0, -1)
    if (k === 'ArrowLeft') return mv(-1, 0)
    if (k === 'ArrowRight' || k === 'Tab') return mv(1, 0)
    if (k === 'PageDown') return mv(0, 20)
    if (k === 'PageUp') return mv(0, -20)
    if (k === 'Home') return (e.preventDefault(), select(mod ? { c: 0, r: 0 } : { c: 0, r: active.r }))
    if (k === 'Escape') {
      clip.current = null
      setMarquee(null)
      setPainter(null)
      setTrace(null)
      return
    }
    if (k === 'Delete' || k === 'Backspace') {
      e.preventDefault()
      return forSel((c) => (c ? { ...c, v: undefined, f: undefined } : undefined))
    }
    if (mod && k.toLowerCase() === 'z') return (e.preventDefault(), undo())
    if (mod && k.toLowerCase() === 'y') return (e.preventDefault(), redo())
    if (mod && k.toLowerCase() === 'b') return (e.preventDefault(), act.bold())
    if (mod && k.toLowerCase() === 'i') return (e.preventDefault(), act.italic())
    if (mod && k.toLowerCase() === 'u') return (e.preventDefault(), act.underline())
    if (mod && k.toLowerCase() === 'd') return (e.preventDefault(), act.fillDown())
    if (mod && k.toLowerCase() === 'r') return (e.preventDefault(), act.fillRight())
    if (mod && k.toLowerCase() === 's') return (e.preventDefault(), save())
    if (mod && k.toLowerCase() === 'a') return (e.preventDefault(), selectRange({ c1: 0, r1: 0, c2: NCOLS - 1, r2: NROWS - 1 }))
    if (mod && k.toLowerCase() === 'f') return (e.preventDefault(), setDialog({ kind: 'find', tab: 'find' }))
    if (mod && k.toLowerCase() === 'h') return (e.preventDefault(), setDialog({ kind: 'find', tab: 'replace' }))
    if (mod && k.toLowerCase() === 'k') return (e.preventDefault(), cmd('Link'))
    if (mod && k === '1') return (e.preventDefault(), setDialog({ kind: 'formatCells' }))
    if (mod && k.toLowerCase() === 'c') return copySel(false)
    if (mod && k.toLowerCase() === 'x') return copySel(true)
    if (mod && k.toLowerCase() === 'v') {
      // the native paste event (onPaste) normally handles this; fall back to the internal clipboard
      pastePending.current = true
      setTimeout(() => {
        if (pastePending.current) pasteInternal()
        pastePending.current = false
      }, 60)
      return
    }
    if (k === 'F2') return locked() ? undefined : setEditing({ value: rawOf(activeCell as Cell), src: 'cell' })
    if (k === 'F9') return (e.preventDefault(), doCalcNow())
    if (k.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault()
      if (locked()) return
      setEditing({ value: k, src: 'cell' })
    }
  }

  /* ── ribbon actions ── */
  const toggleProp = (prop: 'bold' | 'italic') => {
    const on = !activeCell?.[prop]
    forSel((c) => ({ ...(c ?? {}), [prop]: on || undefined }))
  }
  const toggleX = (prop: 'underline' | 'strike' | 'wrap') => {
    const on = !activeCell?.[prop]
    forSel((c) => ({ ...(c ?? {}), [prop]: on || undefined }))
    return on
  }
  const startFormula = (name: string) => {
    if (locked()) return
    setEditing({ value: `=${name}(`, src: 'bar' })
    setTimeout(() => (document.querySelector('[data-agent="excel-formula-bar"]') as HTMLInputElement | null)?.focus())
  }
  const fnMenu = (cat: string): MenuItem[] => [
    ...FUNCTIONS.filter((f) => (cat === 'recent' ? ['SUM', 'AVERAGE', 'IF', 'SUMIF', 'VLOOKUP', 'XLOOKUP', 'COUNT', 'MAX', 'MIN', 'ROUND'].includes(f.name) : f.cat === cat)).map((f) => ({ label: f.name, onClick: () => startFormula(f.name) })),
    { label: '', sep: true },
    { label: 'Insert Function…', onClick: () => setDialog({ kind: 'insertFunction', cat: cat === 'recent' ? undefined : cat }) },
  ]
  const colorMenu = (prop: 'fill' | 'color') => [{ label: prop === 'fill' ? 'No Fill' : 'Automatic', onClick: () => patchSel({ [prop]: undefined }) }, { label: '', sep: true }, ...['#FFFF00', '#FFC000', '#92D050', '#00B0F0', '#FFC7CE', '#C6EFCE', '#D9D9D9', '#C00000', '#0070C0', '#7030A0'].map((c) => ({ label: c, swatch: c, onClick: () => patchSel({ [prop]: c }) }))]

  const comments = sheet?.comments ?? []
  const cmd = (key: string) => {
    if (!sheet) return
    switch (key) {
      case 'Paste':
        return pasteInternal()
      case 'Cut':
        return copySel(true)
      case 'Copy':
        return copySel(false)
      case 'Format Painter': {
        if (painter) return setPainter(null)
        const fm: any = {}
        for (const k of FORMAT_KEYS) if ((activeCell as any)?.[k] !== undefined) fm[k] = (activeCell as any)[k]
        return setPainter(fm)
      }
      case 'Increase Font Size':
      case 'Decrease Font Size': {
        const sizes = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 36]
        const cur = activeCell?.size ?? 11
        const i = sizes.indexOf(cur)
        const next = key.startsWith('Inc') ? (sizes[i + 1] ?? cur) : (sizes[i - 1] ?? cur)
        return patchSel({ size: next === 11 ? undefined : next })
      }
      case 'Borders':
        return patchSel({ border: activeCell?.border === 'all' ? undefined : 'all' })
      case 'Top Align':
        return patchSel({ valign: 'top' })
      case 'Middle Align':
        return patchSel({ valign: 'middle' })
      case 'Bottom Align':
        return patchSel({ valign: undefined })
      case 'Wrap Text': {
        toggleX('wrap')
        return setTimeout(() => autoFitRows(sel.r1, sel.r2), 0)
      }
      case 'Decrease Indent':
        return forSel((c) => ({ ...(c ?? {}), indent: Math.max(0, (c?.indent ?? 0) - 1) || undefined }))
      case 'Increase Indent':
        return forSel((c) => ({ ...(c ?? {}), indent: Math.min(10, (c?.indent ?? 0) + 1), align: c?.align === 'right' ? undefined : c?.align }))
      case 'Merge & Center':
        if (activeCell?.mergeAcross) return patchSel({ mergeAcross: undefined })
        return setCells((cells) => {
          const span = sel.c2 - sel.c1
          if (!span) return cells
          for (let r = sel.r1; r <= sel.r2; r++) {
            const a = refName(sel.c1, r)
            cells[a] = { ...(cells[a] ?? {}), mergeAcross: span, align: 'center' } as Cell
            for (let c = sel.c1 + 1; c <= sel.c2; c++) delete cells[refName(c, r)]
          }
          return cells
        })
      case 'Row Height':
        return setDialog({ kind: 'prompt', title: 'Row Height', label: 'Row height (pixels):', type: 'number', initial: String(sheet.rowHeights?.[sel.r1] ?? ROW_H), onOk: (v) => writeX((s) => ({ ...s, rowHeights: { ...(s.rowHeights ?? {}), ...Object.fromEntries(Array.from({ length: sel.r2 - sel.r1 + 1 }, (_, i) => [sel.r1 + i, Math.max(4, Math.min(400, Number(v) || ROW_H))])) } })) })
      case 'AutoFit Row Height':
        return autoFitRows(sel.r1, sel.r2)
      case 'Column Width':
        return setDialog({ kind: 'prompt', title: 'Column Width', label: 'Column width (pixels):', type: 'number', initial: String(widths[sel.c1]), onOk: (v) => writeX((s) => ({ ...s, colWidths: { ...(s.colWidths ?? {}), ...Object.fromEntries(Array.from({ length: sel.c2 - sel.c1 + 1 }, (_, i) => [COLS[sel.c1 + i], Math.max(8, Math.min(600, Number(v) || DEFAULT_W))])) } })) })
      case 'Default Width':
        return setDialog({ kind: 'prompt', title: 'Standard Width', label: 'Standard column width (pixels):', type: 'number', initial: String(sheet.defaultColWidth ?? DEFAULT_W), onOk: (v) => writeX((s) => ({ ...s, defaultColWidth: Math.max(8, Math.min(600, Number(v) || DEFAULT_W)) })) })
      case 'Format Cells':
        return setDialog({ kind: 'formatCells' })
      case 'Fill Up':
        return setCells((cells) => {
          for (let c = sel.c1; c <= sel.c2; c++) {
            const src = cells[refName(c, sel.r2)]
            for (let r = sel.r1; r < sel.r2; r++) {
              const ref = refName(c, r)
              if (!src) delete cells[ref]
              else cells[ref] = src.f ? { ...src, f: shiftFormula(src.f, 0, r - sel.r2) } : { ...src }
            }
          }
          return cells
        })
      case 'Fill Left':
        return setCells((cells) => {
          for (let r = sel.r1; r <= sel.r2; r++) {
            const src = cells[refName(sel.c2, r)]
            for (let c = sel.c1; c < sel.c2; c++) {
              const ref = refName(c, r)
              if (!src) delete cells[ref]
              else cells[ref] = src.f ? { ...src, f: shiftFormula(src.f, c - sel.c2, 0) } : { ...src }
            }
          }
          return cells
        })
      case 'Series':
        return setCells((cells) => {
          const down = sel.r2 > sel.r1 || sel.c1 === sel.c2
          const n = down ? sel.r2 - sel.r1 + 1 : sel.c2 - sel.c1 + 1
          const lines = down ? sel.c2 - sel.c1 + 1 : sel.r2 - sel.r1 + 1
          for (let L = 0; L < lines; L++) {
            const at = (i: number) => (down ? refName(sel.c1 + L, sel.r1 + i) : refName(sel.c1 + i, sel.r1 + L))
            const a = cells[at(0)]?.v
            const b = cells[at(1)]?.v
            if (typeof a !== 'number') continue
            const step = typeof b === 'number' ? b - a : 1
            for (let i = 1; i < n; i++) cells[at(i)] = { ...(cells[at(i)] ?? {}), ...(cells[at(0)] ?? {}), v: a + step * i, f: undefined } as Cell
          }
          return cells
        })
      case 'Flash Fill': {
        const res = flashFill(sheet, active.c, ev, si)
        if (!res || !res.filled) return setDialog({ kind: 'message', title: 'Microsoft Excel', body: 'Flash Fill didn’t recognize a pattern. Type an example of the result you want next to your data (for example the first name from a full name), then try again.' })
        return setCells(() => res.cells as Record<string, Cell>)
      }
      case 'Copilot':
        return setPane((p) => (p === 'copilot' ? null : 'copilot'))
      case 'PivotTable':
        return newPivot()
      case 'Recommended PivotTables':
        return newPivot(false, true)
      case 'PivotChart':
        return newPivot(true, true)
      case 'Line Chart':
        return insertChartOfType('line')
      case 'Pie Chart':
        return insertChartOfType('pie')
      case 'Bar Chart':
        return insertChartOfType('bar')
      case 'Area Chart':
        return insertChartOfType('area')
      case 'Sparkline Line':
        return addSparklines('line')
      case 'Sparkline Column':
        return addSparklines('column')
      case 'Sparkline Win/Loss':
        return addSparklines('winloss')
      case 'Filter':
        return toggleFilter()
      case 'Sort':
        return setDialog({ kind: 'sort' })
      case 'Link':
        return setDialog({ kind: 'prompt', title: 'Insert Hyperlink', label: 'Address:', initial: activeCell?.link ?? 'https://', onOk: (v) => (v && v !== 'https://' ? patchSel({ link: v, ...(activeCell?.v === undefined && !activeCell?.f ? { v } : {}) } as any) : patchSel({ link: undefined })) })
      case 'New Comment':
        setPane('comments')
        return setCommentDraft(activeRef)
      case 'Show Comments':
        return setPane((p) => (p === 'comments' ? null : 'comments'))
      case 'Insert Function':
        return setDialog({ kind: 'insertFunction' })
      case 'AutoSum':
        return act.autosum()
      case 'Name Manager':
        return setDialog({ kind: 'names' })
      case 'Trace Precedents': {
        if (trace) return setTrace(null)
        const p = precedents()
        if (!p.length) return setDialog({ kind: 'message', title: 'Trace Precedents', body: 'The active cell doesn’t contain a formula that refers to cells on this sheet.' })
        return setTrace(p)
      }
      case 'Get Data':
      case 'From Text/CSV':
        return setDialog({ kind: 'import' })
      case 'From Table/ Range':
        return act.formatTable()
      case 'Refresh All':
        setFrozenCalc(null)
        doCalcNow()
        setFrozenCalc(null)
        setSaveState('saving')
        return setTimeout(() => setSaveState('saved'), 700)
      case 'Text to Columns':
        return setDialog({ kind: 'textToColumns' })
      case 'Data Validation':
        return setDialog({ kind: 'validation' })
      case 'Spelling': {
        const words = Object.values(sheet.cells).filter((c) => typeof c.v === 'string').length
        return setDialog({ kind: 'message', title: 'Spelling', body: `Spelling check complete for ${words} text cell${words === 1 ? '' : 's'} on “${sheet.name}”. You’re good to go!` })
      }
      case 'Workbook Statistics': {
        const st = workbookStats(wb as XWorkbook)
        const used = (() => {
          let mc = 0
          let mr = 0
          for (const k of Object.keys(sheet.cells)) {
            const p = parseRef(k)
            if (p) (mc = Math.max(mc, p.c)), (mr = Math.max(mr, p.r))
          }
          return refName(mc, mr)
        })()
        return setDialog({
          kind: 'message',
          title: 'Workbook Statistics',
          body: (
            <div className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-1">
              <b className="col-span-2">Current sheet: {sheet.name}</b>
              <span>End of sheet</span>
              <span>{used}</span>
              <span>Cells with data</span>
              <span>{Object.values(sheet.cells).filter((c) => c.v !== undefined || c.f).length}</span>
              <span>Tables</span>
              <span>{sheet.tables?.length ?? 0}</span>
              <span>Charts</span>
              <span>{sheet.charts?.length ?? 0}</span>
              <b className="col-span-2 mt-2">Workbook</b>
              <span>Sheets</span>
              <span>{st.sheets}</span>
              <span>Cells with data</span>
              <span>{st.cells}</span>
              <span>Formulas</span>
              <span>{st.formulas}</span>
              <span>Tables</span>
              <span>{st.tables}</span>
              <span>Charts</span>
              <span>{st.charts}</span>
              <span>Comments</span>
              <span>{st.comments}</span>
              <span>Defined names</span>
              <span>{st.names}</span>
            </div>
          ),
        })
      }
      case 'Check Accessibility': {
        const issues: string[] = []
        sheets.forEach((s) => {
          if (/^Sheet\d+$/.test(s.name) && Object.keys(s.cells).length) issues.push(`Default sheet name: “${s.name}” — give it a meaningful name.`)
          ;(s.charts ?? []).forEach((c) => c.title === 'Chart Title' && issues.push(`Chart on “${s.name}” has no descriptive title.`))
          if (Object.values(s.cells).some((c) => c.mergeAcross)) issues.push(`Merged cells on “${s.name}” can make navigation harder for screen readers.`)
        })
        return setDialog({ kind: 'message', title: 'Accessibility', body: issues.length ? <ul className="list-disc pl-4 space-y-1">{issues.map((i) => <li key={i}>{i}</li>)}</ul> : 'No accessibility issues found. People with disabilities should not have difficulty reading this workbook.' })
      }
      case 'Protect Sheet':
        return writeSheets((all) => all.map((s, i) => (i === si ? ({ ...s, protected: !(s as XSheet).protected } as Sheet) : s)), { noHistory: true })
      case 'Protect Workbook':
        return setDialog({ kind: 'message', title: 'Protect Workbook', body: 'Workbook structure protection is managed by your organisation’s sensitivity policy for files in OneDrive - Northwind Global.' })
      case 'Normal':
        return setView('normal')
      case 'Page Break Preview':
        return setView('pagebreak')
      case 'Page Layout':
        return setView('pagelayout')
      case 'Gridlines':
        return writeX((s) => ({ ...s, showGrid: s.showGrid === false ? undefined : false }))
      case 'Headings':
        return writeX((s) => ({ ...s, showHeadings: s.showHeadings === false ? undefined : false }))
      case 'Ruler':
        return setView((v) => (v === 'pagelayout' ? 'normal' : 'pagelayout'))
      case 'Zoom':
        return setDialog({ kind: 'prompt', title: 'Zoom', label: 'Magnification', options: ['200%', '150%', '125%', '100%', '75%', '50%'], initial: `${zoom}%`, onOk: (v) => setZoom(parseInt(v) || 100) })
      case '100%':
        return setZoom(100)
      case 'Zoom to Selection': {
        const box = gridRef.current
        if (!box) return
        const w = lefts[sel.c2 + 1] - lefts[sel.c1] + RW
        const h = tops[sel.r2 + 1] - tops[sel.r1] + HH
        const z = Math.round(Math.max(50, Math.min(200, Math.min(box.clientWidth / w, box.clientHeight / h) * 100)) / 10) * 10
        setZoom(z)
        return setTimeout(() => gridRef.current?.querySelector(`[data-agent="excel-cell-${refName(sel.c1, sel.r1)}"]`)?.scrollIntoView({ block: 'start', inline: 'start' }), 30)
      }
      case 'Bring Forward':
      case 'Send Backward': {
        if (!selChart) return setDialog({ kind: 'message', title: key, body: 'Select a chart first.' })
        return writeX((s) => {
          const list = [...(s.charts ?? [])]
          const i = list.findIndex((c) => c.id === selChart)
          const j = key === 'Bring Forward' ? Math.min(list.length - 1, i + 1) : Math.max(0, i - 1)
          ;[list[i], list[j]] = [list[j], list[i]]
          return { ...s, charts: list }
        })
      }
      case 'Print Area':
        return writeX((s) => ({ ...s, printArea: rangeName(sel) }))
      case 'New Script':
      case 'View Scripts':
        return setPane((p) => (p === 'scripts' ? null : 'scripts'))
      case 'Contact Support':
      case 'Feedback':
        return toast({ appId: 'excel', title: key === 'Feedback' ? 'Thanks for your feedback' : 'Microsoft 365 support', body: key === 'Feedback' ? 'Your feedback was sent to Microsoft.' : 'A support request was opened. An agent will reach out by email.' })
      case 'Help':
        return setDialog({
          kind: 'message',
          title: 'Excel Help',
          body: (
            <ul className="list-disc pl-4 space-y-1">
              <li>Start a formula with = — try =SUM(A1:A10), =XLOOKUP(…) or =IF(…).</li>
              <li>Right-click a cell, row or column header for Insert, Delete, Sort and Filter.</li>
              <li>Ctrl+C / Ctrl+X / Ctrl+V copy and move cells; formulas adjust automatically.</li>
              <li>Ctrl+F finds, Ctrl+H replaces, Ctrl+1 opens Format Cells.</li>
              <li>Drag a column header border to resize it; double-click to AutoFit.</li>
            </ul>
          ),
        })
      case 'Select':
        return setInkTool(null)
      case 'Eraser':
        return setInkTool((t) => (t === 'eraser' ? null : 'eraser'))
      case 'Pen 0':
        return setInkTool((t) => (t === 'pen0' ? null : 'pen0'))
      case 'Pen 1':
        return setInkTool((t) => (t === 'pen1' ? null : 'pen1'))
      case 'Highlighter':
        return setInkTool((t) => (t === 'highlighter' ? null : 'highlighter'))
      case 'Ink to Shape':
        return setInkShape((v) => !v)
      case 'Ink Replay':
        return setReplay((n) => n + 1)
      case 'Freeze Panes':
        return
      default:
        return
    }
  }

  const act: RibbonActions = {
    bold: () => toggleProp('bold'),
    italic: () => toggleProp('italic'),
    underline: () => {
      toggleX('underline')
    },
    fill: () => forSel((c) => ({ ...(c ?? {}), fill: c?.fill ? undefined : '#FFFF00' })),
    fontColor: () => forSel((c) => ({ ...(c ?? {}), color: c?.color ? undefined : '#C00000' })),
    align: (a) => forSel((c) => ({ ...(c ?? {}), align: c?.align === a ? undefined : a })),
    fmt: (f) => forSel((c) => ({ ...(c ?? {}), fmt: f === 'general' ? undefined : f })),
    decimals: (d) => forSel((c) => ({ ...(c ?? {}), fmt: d > 0 ? (c?.fmt === 'currency' ? 'currency2' : c?.fmt === 'int' ? 'number' : c?.fmt) : c?.fmt === 'currency2' ? 'currency' : c?.fmt === 'number' ? 'int' : c?.fmt })),
    autosum: () => {
      if (!sheet) return
      if (sel.r1 === sel.r2 && sel.c1 === sel.c2) {
        // sum the contiguous numbers above the active cell
        let r = active.r - 1
        while (r >= 0 && typeof ev.value(si, active.c, r) === 'number') r--
        const top = r + 1
        if (top <= active.r - 1) {
          setCells((cells) => ({ ...cells, [activeRef]: { ...(cells[activeRef] ?? {}), f: `=SUM(${refName(active.c, top)}:${refName(active.c, active.r - 1)})`, v: undefined } }))
        } else setEditing({ value: '=SUM()', src: 'bar' })
      } else {
        setCells((cells) => {
          for (let c = sel.c1; c <= sel.c2; c++) {
            const ref = refName(c, sel.r2 + 1)
            cells[ref] = { ...(cells[ref] ?? {}), f: `=SUM(${refName(c, sel.r1)}:${refName(c, sel.r2)})`, bold: true }
          }
          return cells
        })
      }
    },
    fillDown: () =>
      setCells((cells) => {
        for (let c = sel.c1; c <= sel.c2; c++) {
          const src = cells[refName(c, sel.r1)]
          for (let r = sel.r1 + 1; r <= sel.r2; r++) {
            const ref = refName(c, r)
            if (!src) delete cells[ref]
            else cells[ref] = src.f ? { ...src, f: shiftFormula(src.f, 0, r - sel.r1) } : { ...src }
          }
        }
        return cells
      }),
    fillRight: () =>
      setCells((cells) => {
        for (let r = sel.r1; r <= sel.r2; r++) {
          const src = cells[refName(sel.c1, r)]
          for (let c = sel.c1 + 1; c <= sel.c2; c++) {
            const ref = refName(c, r)
            if (!src) delete cells[ref]
            else cells[ref] = src.f ? { ...src, f: shiftFormula(src.f, c - sel.c1, 0) } : { ...src }
          }
        }
        return cells
      }),
    clear: () => forSel(() => undefined),
    autofit: () =>
      writeSheet((s) => {
        const cw = { ...(s.colWidths ?? {}) }
        for (let c = sel.c1; c <= sel.c2; c++) {
          let max = 0
          for (let r = 0; r < NROWS; r++) {
            const cell = s.cells[refName(c, r)]
            if (!cell) continue
            const t = formatValue(ev.value(si, c, r), cell.fmt)
            max = Math.max(max, t.length * (cell.bold ? 7.6 : 7.1) + (r === sel.r1 ? 30 : 16))
          }
          cw[COLS[c]] = Math.max(48, Math.round(max))
        }
        return { ...s, colWidths: cw }
      }),
    formatTable: () => {
      if (!sheet) return
      const rg = sel.r1 === sel.r2 && sel.c1 === sel.c2 ? currentRegion(sheet as Sheet, active.c, active.r) : sel
      writeSheet((s) => ({ ...s, tables: [...(s.tables ?? []).filter((t) => t.range !== rangeName(rg)), { range: rangeName(rg), style: 'TableStyleMedium2' }] }))
    },
    insertChart: () => {
      if (!sheet) return
      const rg = sel.r1 === sel.r2 && sel.c1 === sel.c2 ? currentRegion(sheet as Sheet, active.c, active.r) : sel
      const id = uid('chart')
      const firstHeader = formatValue(ev.value(si, rg.c1 + 1, rg.r1))
      const chart: Chart = {
        id,
        type: 'column',
        range: rangeName(rg),
        title: rg.c2 - rg.c1 > 1 ? 'Chart Title' : firstHeader || 'Chart Title',
        col: Math.min(NCOLS - 6, Math.max(rg.c2, currentRegion(sheet as Sheet, rg.c1, rg.r1).c2) + 2),
        row: Math.max(0, rg.r1),
        w: 600,
        h: 320,
        ...(isAgent ? { createdBy: 'hworker' } : {}),
      }
      writeSheet((s) => ({ ...s, charts: [...(s.charts ?? []), chart] }))
      setSelChart(id)
      setFreshCharts((f) => [...f, id])
    },
    insertRow: () => (wholeCols ? insertCols() : insertRows()),
    deleteRow: () => (wholeCols ? deleteCols() : deleteRows()),
    freeze: () => writeX((s) => ({ ...s, freezeRow: active.r || undefined, freezeCol: active.c || undefined })),
    analyze: () => setAnalyze((a) => !a),
    sort: () => doSort(false),
    state: {
      bold: !!activeCell?.bold,
      italic: !!activeCell?.italic,
      underline: !!activeCell?.underline,
      fmt: (activeCell?.fmt ?? 'general') as CellFmt,
      align: activeCell?.align,
      font: activeCell?.font,
      size: activeCell?.size,
      valign: activeCell?.valign,
      wrap: !!activeCell?.wrap,
    },
    cmd,
    setFont: (f) => patchSel({ font: f === 'Aptos Narrow' ? undefined : f }),
    setSize: (n) => patchSel({ size: n === 11 ? undefined : n }),
    on: {
      'Format Painter': !!painter,
      Copilot: pane === 'copilot',
      Normal: view === 'normal',
      'Page Break Preview': view === 'pagebreak',
      'Page Layout': view === 'pagelayout',
      Gridlines: sheet?.showGrid !== false,
      Headings: sheet?.showHeadings !== false,
      'Show Comments': pane === 'comments',
      'Protect Sheet': !!sheet?.protected,
      Filter: !!sheet?.autoFilter,
      'Trace Precedents': !!trace,
      'View Scripts': pane === 'scripts',
      'Pen 0': inkTool === 'pen0',
      'Pen 1': inkTool === 'pen1',
      Highlighter: inkTool === 'highlighter',
      Eraser: inkTool === 'eraser',
      Select: !inkTool,
      'Ink to Shape': inkShape,
      Ruler: view === 'pagelayout',
    },
    menus: {
      Paste: [
        { label: 'Paste', icon: ClipboardPaste20Regular, onClick: () => pasteInternal(), disabled: !clip.current },
        { label: 'Paste Values', onClick: () => pasteInternal('values'), disabled: !clip.current },
        { label: 'Paste Formulas', onClick: () => pasteInternal('formulas'), disabled: !clip.current },
        { label: 'Paste Formatting', onClick: () => pasteInternal('formats'), disabled: !clip.current },
        { label: 'Transpose', onClick: () => pasteInternal('transpose'), disabled: !clip.current },
      ],
      Underline: [
        { label: 'Underline', checked: !!activeCell?.underline, onClick: () => toggleX('underline') },
        { label: 'Strikethrough', checked: !!activeCell?.strike, onClick: () => toggleX('strike') },
      ],
      Borders: [
        { label: 'Bottom Border', onClick: () => patchSel({ border: 'bottom' }) },
        { label: 'Top Border', onClick: () => patchSel({ border: 'top' }) },
        { label: 'No Border', onClick: () => patchSel({ border: undefined }) },
        { label: 'All Borders', onClick: () => patchSel({ border: 'all' }) },
        { label: 'Outside Borders', onClick: () => patchSel({ border: 'outside' }) },
        { label: 'Thick Bottom Border', onClick: () => patchSel({ border: 'thickBottom' }) },
      ],
      'Fill Color': colorMenu('fill'),
      'Font Color': colorMenu('color'),
      Orientation: [
        { label: 'Angle Counterclockwise', onClick: () => patchSel({ rotate: 45 }) },
        { label: 'Rotate Text Up', onClick: () => patchSel({ rotate: 90 }) },
        { label: 'No Rotation', onClick: () => patchSel({ rotate: undefined }) },
      ],
      'Merge & Center': [
        { label: 'Merge & Center', onClick: () => cmd('Merge & Center') },
        { label: 'Merge Across', onClick: () => cmd('Merge & Center') },
        { label: 'Unmerge Cells', onClick: () => patchSel({ mergeAcross: undefined }) },
      ],
      'Conditional Formatting': [
        {
          label: 'Highlight Cells Rules',
          sub: [
            { label: 'Greater Than…', onClick: () => setDialog({ kind: 'cf', type: 'gt' }) },
            { label: 'Less Than…', onClick: () => setDialog({ kind: 'cf', type: 'lt' }) },
            { label: 'Equal To…', onClick: () => setDialog({ kind: 'cf', type: 'eq' }) },
            { label: 'Text that Contains…', onClick: () => setDialog({ kind: 'cf', type: 'text' }) },
            { label: 'Duplicate Values', onClick: () => addCf({ type: 'dup', style: 'red' }) },
          ],
        },
        {
          label: 'Top/Bottom Rules',
          sub: [
            { label: 'Top 10 Items', onClick: () => addCf({ type: 'top10', style: 'green' }) },
            { label: 'Bottom 10 Items', onClick: () => addCf({ type: 'bottom10', style: 'red' }) },
            { label: 'Above Average', onClick: () => addCf({ type: 'aboveAvg', style: 'green' }) },
            { label: 'Below Average', onClick: () => addCf({ type: 'belowAvg', style: 'red' }) },
          ],
        },
        {
          label: 'Data Bars',
          sub: [
            { label: 'Blue Data Bar', swatch: '#638EC6', onClick: () => addCf({ type: 'dataBar', color: '#638EC6' }) },
            { label: 'Green Data Bar', swatch: '#63BE7B', onClick: () => addCf({ type: 'dataBar', color: '#63BE7B' }) },
            { label: 'Red Data Bar', swatch: '#FF555A', onClick: () => addCf({ type: 'dataBar', color: '#FF555A' }) },
            { label: 'Orange Data Bar', swatch: '#FFB628', onClick: () => addCf({ type: 'dataBar', color: '#FFB628' }) },
          ],
        },
        { label: 'Color Scales', onClick: () => addCf({ type: 'colorScale' }) },
        { label: '', sep: true },
        { label: 'Clear Rules from Selected Cells', onClick: () => writeX((s) => ({ ...s, cf: (s.cf ?? []).filter((r) => r.range !== rangeName(sel)) })) },
        { label: 'Clear Rules from Entire Sheet', onClick: () => writeX((s) => ({ ...s, cf: [] })) },
      ],
      'Format as Table': Object.entries(THEMES).map(([k, t]) => ({ label: `${t.label} table style`, swatch: t.header, onClick: () => (patchWb({ theme: k }), act.formatTable()) })),
      'Cell Styles': [
        { label: 'Normal', onClick: () => patchSel({ fill: undefined, color: undefined, bold: undefined, italic: undefined, size: undefined, border: undefined }) },
        { label: 'Good', swatch: '#C6EFCE', onClick: () => patchSel({ fill: '#C6EFCE', color: '#006100' }) },
        { label: 'Bad', swatch: '#FFC7CE', onClick: () => patchSel({ fill: '#FFC7CE', color: '#9C0006' }) },
        { label: 'Neutral', swatch: '#FFEB9C', onClick: () => patchSel({ fill: '#FFEB9C', color: '#9C5700' }) },
        { label: 'Input', swatch: '#FFCC99', onClick: () => patchSel({ fill: '#FFCC99', color: '#3F3F76', border: 'all' }) },
        { label: 'Note', swatch: '#FFFFCC', onClick: () => patchSel({ fill: '#FFFFCC', border: 'all' }) },
        { label: '', sep: true },
        { label: 'Title', onClick: () => patchSel({ size: 18, bold: true, color: '#0E2841' }) },
        { label: 'Heading 1', onClick: () => patchSel({ size: 15, bold: true, color: '#0E2841', border: 'thickBottom' }) },
        { label: 'Heading 2', onClick: () => patchSel({ size: 13, bold: true, color: '#0E2841', border: 'bottom' }) },
        { label: 'Total', onClick: () => patchSel({ bold: true, border: 'top' }) },
      ],
      Insert: [
        { label: 'Insert Cells…', icon: TableInsertRow20Regular, onClick: () => insertRows() },
        { label: 'Insert Sheet Rows', onClick: () => insertRows() },
        { label: 'Insert Sheet Columns', onClick: () => insertCols() },
        { label: 'Insert Sheet', onClick: () => addSheet() },
      ],
      Delete: [
        { label: 'Delete Cells…', icon: TableDeleteRow20Regular, onClick: () => deleteRows() },
        { label: 'Delete Sheet Rows', onClick: () => deleteRows() },
        { label: 'Delete Sheet Columns', onClick: () => deleteCols() },
        { label: 'Delete Sheet', onClick: () => deleteSheet(si), disabled: sheets.length < 2 },
      ],
      AutoSum: (['SUM', 'AVERAGE', 'COUNT', 'MAX', 'MIN'] as const).map((fn) => ({
        label: fn === 'SUM' ? 'Sum' : fn === 'AVERAGE' ? 'Average' : fn === 'COUNT' ? 'Count Numbers' : fn === 'MAX' ? 'Max' : 'Min',
        onClick: () => {
          if (sel.r1 === sel.r2 && sel.c1 === sel.c2) {
            let r = active.r - 1
            while (r >= 0 && typeof ev.value(si, active.c, r) === 'number') r--
            if (r + 1 <= active.r - 1) setCells((cells) => ({ ...cells, [activeRef]: { ...(cells[activeRef] ?? {}), f: `=${fn}(${refName(active.c, r + 1)}:${refName(active.c, active.r - 1)})`, v: undefined } }))
            else startFormula(fn)
          } else
            setCells((cells) => {
              for (let c = sel.c1; c <= sel.c2; c++) {
                const ref = refName(c, sel.r2 + 1)
                cells[ref] = { ...(cells[ref] ?? {}), f: `=${fn}(${refName(c, sel.r1)}:${refName(c, sel.r2)})`, bold: true }
              }
              return cells
            })
        },
      })).concat([{ label: 'More Functions…', onClick: () => setDialog({ kind: 'insertFunction' }) }] as any),
      Clear: [
        { label: 'Clear All', icon: Eraser20Regular, onClick: () => forSel(() => undefined) },
        { label: 'Clear Formats', onClick: () => forSel((c) => (c ? { v: c.v, f: c.f, link: c.link, validation: c.validation } : undefined)) },
        { label: 'Clear Contents', onClick: () => forSel((c) => (c ? { ...c, v: undefined, f: undefined } : undefined)) },
        { label: 'Clear Comments and Notes', onClick: () => writeX((s) => ({ ...s, comments: (s.comments ?? []).filter((c) => { const p = parseRef(c.ref); return !p || p.c < sel.c1 || p.c > sel.c2 || p.r < sel.r1 || p.r > sel.r2 }) })) },
        { label: 'Clear Hyperlinks', onClick: () => patchSel({ link: undefined }) },
      ],
      'Sort & Filter': [
        { label: 'Sort A to Z', icon: ArrowSortDownLines16Regular, onClick: () => doSort(false) },
        { label: 'Sort Z to A', icon: ArrowSortUpLines16Regular, onClick: () => doSort(true) },
        { label: 'Custom Sort…', icon: ArrowSort20Regular, onClick: () => setDialog({ kind: 'sort' }) },
        { label: '', sep: true },
        { label: 'Filter', icon: Filter20Regular, checked: !!sheet?.autoFilter, onClick: toggleFilter },
        { label: 'Clear', onClick: clearFilters, disabled: !Object.values(sheet?.filters ?? {}).some((f) => Object.values(f).some((v) => v.length)) },
      ],
      'Find & Select': [
        { label: 'Find…', icon: Search20Regular, onClick: () => setDialog({ kind: 'find', tab: 'find' }) },
        { label: 'Replace…', onClick: () => setDialog({ kind: 'find', tab: 'replace' }) },
        { label: 'Go To…', onClick: () => setDialog({ kind: 'prompt', title: 'Go To', label: 'Reference:', initial: '', onOk: (v) => { const rg = parseRange(v) ?? (ev.nameRef(v) ? parseRange(ev.nameRef(v)!.split('!').pop()!.replace(/\$/g, '')) : null); if (rg) selectRange(rg) } }) },
        { label: '', sep: true },
        {
          label: 'Formulas',
          onClick: () => {
            const refs = Object.entries(sheet?.cells ?? {}).filter(([, c]) => c.f).map(([k]) => parseRef(k)!).filter(Boolean)
            if (!refs.length) return
            selectRange({ c1: Math.min(...refs.map((p) => p.c)), r1: Math.min(...refs.map((p) => p.r)), c2: Math.max(...refs.map((p) => p.c)), r2: Math.max(...refs.map((p) => p.r)) })
          },
        },
        { label: 'Comments', onClick: () => setPane('comments') },
      ],
      PivotTable: [
        { label: 'From Table/Range', onClick: () => newPivot() },
        { label: 'Recommended PivotTable', onClick: () => newPivot(false, true) },
      ],
      Icons: ['✓', '✗', '★', '⚠', '●', '▲', '▼', '→'].map((s) => ({ label: s, onClick: () => insertSymbol(s) })),
      Shapes: [
        { label: 'Arrow →', onClick: () => insertSymbol('→') },
        { label: 'Check box ☐', onClick: () => insertSymbol('☐') },
      ],
      Text: [
        { label: 'Header & Footer', onClick: () => setView('pagelayout') },
        { label: 'Signature Line', onClick: () => insertSymbol('________________') },
      ],
      Symbols: ['©', '®', '™', '€', '£', '¥', '°', '±', '×', '÷', '≤', '≥', '≠', '∑', '√', '∞', 'µ', '§'].map((s) => ({ label: s, onClick: () => insertSymbol(s) })),
      'Recently Used': fnMenu('recent'),
      Financial: fnMenu('Financial'),
      Logical: fnMenu('Logical'),
      'Date & Time': fnMenu('Date & Time'),
      'Lookup & Reference': fnMenu('Lookup & Reference'),
      'Math & Trig': fnMenu('Math & Trig'),
      'Calculation Options': [
        { label: 'Automatic', checked: !calcManual, onClick: () => (setCalcManual(false), setFrozenCalc(null)) },
        { label: 'Manual', checked: calcManual, onClick: () => (setCalcManual(true), doCalcNow()) },
        { label: '', sep: true },
        { label: 'Calculate Now', hint: 'F9', onClick: doCalcNow },
      ],
      'Freeze Panes': [
        { label: 'Freeze Panes', onClick: () => writeX((s) => ({ ...s, freezeRow: active.r || undefined, freezeCol: active.c || undefined })) },
        { label: 'Freeze Top Row', onClick: () => writeX((s) => ({ ...s, freezeRow: 1, freezeCol: undefined })) },
        { label: 'Freeze First Column', onClick: () => writeX((s) => ({ ...s, freezeCol: 1, freezeRow: undefined })) },
        { label: 'Unfreeze Panes', disabled: !sheet?.freezeRow && !sheet?.freezeCol, onClick: () => writeX((s) => ({ ...s, freezeRow: undefined, freezeCol: undefined })) },
      ],
      Themes: Object.entries(THEMES).map(([k, t]) => ({ label: t.label, swatch: t.header, checked: (wb?.theme ?? 'office') === k, onClick: () => patchWb({ theme: k }) })),
      Margins: (['normal', 'wide', 'narrow'] as const).map((m) => ({ label: m[0].toUpperCase() + m.slice(1), checked: (sheet?.pageSetup?.margins ?? 'normal') === m, onClick: () => writeX((s) => ({ ...s, pageSetup: { ...(s.pageSetup ?? {}), margins: m } })) })),
      Size: (['letter', 'a4', 'legal'] as const).map((m) => ({ label: m === 'a4' ? 'A4' : m[0].toUpperCase() + m.slice(1), checked: (sheet?.pageSetup?.size ?? 'letter') === m, onClick: () => writeX((s) => ({ ...s, pageSetup: { ...(s.pageSetup ?? {}), size: m } })) })),
      Sort: [
        { label: 'Sort A to Z', onClick: () => doSort(false) },
        { label: 'Sort Z to A', onClick: () => doSort(true) },
        { label: 'Custom Sort…', onClick: () => setDialog({ kind: 'sort' }) },
      ],
      'What-If Analysis': [
        { label: 'Goal Seek…', onClick: () => setDialog({ kind: 'goalSeek' }) },
      ],
      'Width: Automatic': [1, 0.75, 0.5].map((z) => ({ label: z === 1 ? 'Automatic' : `${z * 100}%`, onClick: () => setZoom(z * 100) })),
    },
  }
  // the Formulas "Text" category and the Page Layout "Orientation" use the same labels as Insert/Home buttons
  act.menus['Text'] = tab === 'formulas' ? fnMenu('Text') : act.menus['Text']
  act.menus['Orientation'] =
    tab === 'pagelayout'
      ? (['portrait', 'landscape'] as const).map((o) => ({ label: o[0].toUpperCase() + o.slice(1), checked: (sheet?.pageSetup?.orientation ?? 'portrait') === o, onClick: () => writeX((s) => ({ ...s, pageSetup: { ...(s.pageSetup ?? {}), orientation: o } })) }))
      : act.menus['Orientation']

  function insertSymbol(sym: string) {
    if (locked()) return
    const cur = activeCell?.f ? '' : String(activeCell?.v ?? '')
    setCells((cells) => ({ ...cells, [activeRef]: { ...(cells[activeRef] ?? {}), v: cur + sym, f: undefined } }))
  }

  /* ── sheets ── */
  const addSheet = () => {
    if (!wb) return
    let k = 1
    while (wb.sheets.some((s) => s.name === `Sheet${k}`)) k++
    const ns: Sheet = { name: `Sheet${k}`, cells: {} }
    writeSheets((all) => [...all.slice(0, si + 1), ns, ...all.slice(si + 1)])
    setSi(si + 1)
    select({ c: 0, r: 0 })
  }
  const commitRename = () => {
    if (renaming === null) return
    const name = renameText.trim().slice(0, 31)
    const idx = renaming
    setRenaming(null)
    if (!name) return
    writeSheets((all) => all.map((s, i) => (i === idx ? { ...s, name } : s)))
  }
  function deleteSheet(idx: number) {
    if (!wb || wb.sheets.length < 2) return
    const doDel = () => {
      writeSheets((all) => all.filter((_, i) => i !== idx))
      setSi((cur) => Math.max(0, cur >= idx ? cur - 1 : cur))
    }
    if (Object.keys(wb.sheets[idx].cells).length) setDialog({ kind: 'confirm', title: 'Delete Sheet', body: `Microsoft Excel will permanently delete “${wb.sheets[idx].name}”. Do you want to continue?`, okLabel: 'Delete', onOk: doDel })
    else doDel()
  }
  const duplicateSheet = (idx: number) => {
    if (!wb) return
    const src = wb.sheets[idx]
    let k = 2
    while (wb.sheets.some((s) => s.name === `${src.name} (${k})`)) k++
    const copy = JSON.parse(JSON.stringify(src)) as XSheet
    copy.name = `${src.name} (${k})`.slice(0, 31)
    copy.charts = (copy.charts ?? []).map((c) => ({ ...c, id: uid('chart') }))
    writeSheets((all) => [...all.slice(0, idx + 1), copy as Sheet, ...all.slice(idx + 1)])
    setSi(idx + 1)
  }
  const moveSheet = (idx: number, dir: -1 | 1) => {
    const j = idx + dir
    if (j < 0 || j >= sheets.length) return
    writeSheets((all) => {
      const a = [...all]
      ;[a[idx], a[j]] = [a[j], a[idx]]
      return a
    })
    setSi(j)
  }

  /* ── selection stats ── */
  const stats = useMemo(() => {
    if (!sheet) return null
    if (sel.c1 === sel.c2 && sel.r1 === sel.r2) return null
    let count = 0
    let sum = 0
    let n = 0
    let fmt: CellFmt | undefined
    const r2 = Math.min(sel.r2, NROWS - 1)
    for (let r = sel.r1; r <= r2; r++)
      for (let c = sel.c1; c <= sel.c2; c++) {
        if (!sheet.cells[refName(c, r)]) continue
        const v = ev.value(si, c, r)
        if (v === null || v === '') continue
        count++
        if (typeof v === 'number') {
          sum += v
          n++
          fmt = fmt ?? (sheet.cells[refName(c, r)]?.fmt as CellFmt | undefined)
        }
      }
    if (count < 2) return null
    return { count, sum: n ? formatValue(sum, fmt) : null, avg: n ? formatValue(sum / n, fmt === 'int' ? 'number' : fmt) : null }
  }, [sheet, sel.c1, sel.c2, sel.r1, sel.r2, ev, si])

  /* ── rendering helpers ── */
  const tableInfo = useMemo(() => {
    const m = new Map<string, { header: boolean; band: boolean; total: boolean }>()
    for (const t of sheet?.tables ?? []) {
      const rg = parseRange(t.range)
      if (!rg) continue
      for (let r = rg.r1; r <= rg.r2; r++)
        for (let c = rg.c1; c <= rg.c2; c++) {
          const first = String(formatValue(ev.value(si, rg.c1, r))).toLowerCase()
          m.set(refName(c, r), { header: r === rg.r1, band: (r - rg.r1) % 2 === 1, total: r === rg.r2 && first.startsWith('total') })
        }
    }
    return m
  }, [sheet?.tables, ev, si])

  const autoFilterHeads = useMemo(() => {
    const s = new Set<string>()
    const rg = sheet?.autoFilter ? parseRange(sheet.autoFilter) : null
    if (rg) for (let c = rg.c1; c <= rg.c2; c++) s.add(refName(c, rg.r1))
    return s
  }, [sheet?.autoFilter])
  const activeFilterHeads = useMemo(() => {
    const s = new Set<string>()
    for (const [range, cols] of Object.entries(sheet?.filters ?? {})) {
      const rg = parseRange(range)
      if (!rg) continue
      for (const [off, vals] of Object.entries(cols)) if (vals.length) s.add(refName(rg.c1 + Number(off), rg.r1))
    }
    return s
  }, [sheet?.filters])

  const cfInfo = useMemo(() => {
    const m = new Map<string, { fill?: string; color?: string; bar?: number; barColor?: string }>()
    for (const rule of sheet?.cf ?? []) {
      const rg = parseRange(rule.range)
      if (!rg) continue
      const cells: { ref: string; v: Val }[] = []
      for (let r = rg.r1; r <= Math.min(rg.r2, NROWS - 1); r++) for (let c = rg.c1; c <= rg.c2; c++) cells.push({ ref: refName(c, r), v: sheet!.cells[refName(c, r)] ? ev.value(si, c, r) : null })
      const nums = cells.map((x) => x.v).filter((v): v is number => typeof v === 'number')
      const st = CF_STYLES[rule.style ?? 'red']
      const hit = (ref: string) => m.set(ref, { ...(m.get(ref) ?? {}), fill: st.fill, color: st.color })
      const max = Math.max(...nums, 0)
      const min = Math.min(...nums, 0)
      const avg = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0
      const sorted = [...nums].sort((a, b) => b - a)
      const counts = new Map<string, number>()
      cells.forEach((x) => x.v !== null && x.v !== '' && counts.set(String(x.v), (counts.get(String(x.v)) ?? 0) + 1))
      const target = rule.value !== undefined && rule.value !== '' && !Number.isNaN(Number(rule.value)) ? Number(rule.value) : rule.value
      for (const { ref, v } of cells) {
        if (v === null || v === '') continue
        switch (rule.type) {
          case 'gt':
            if (typeof v === 'number' && typeof target === 'number' && v > target) hit(ref)
            break
          case 'lt':
            if (typeof v === 'number' && typeof target === 'number' && v < target) hit(ref)
            break
          case 'eq':
            if (String(v).toLowerCase() === String(target).toLowerCase()) hit(ref)
            break
          case 'text':
            if (String(v).toLowerCase().includes(String(target ?? '').toLowerCase())) hit(ref)
            break
          case 'dup':
            if ((counts.get(String(v)) ?? 0) > 1) hit(ref)
            break
          case 'top10':
            if (typeof v === 'number' && v >= (sorted[Math.min(9, sorted.length - 1)] ?? Infinity)) hit(ref)
            break
          case 'bottom10':
            if (typeof v === 'number' && v <= (sorted[Math.max(0, sorted.length - 10)] ?? -Infinity)) hit(ref)
            break
          case 'aboveAvg':
            if (typeof v === 'number' && v > avg) hit(ref)
            break
          case 'belowAvg':
            if (typeof v === 'number' && v < avg) hit(ref)
            break
          case 'dataBar':
            if (typeof v === 'number' && max > min) m.set(ref, { ...(m.get(ref) ?? {}), bar: (v - Math.min(0, min)) / (max - Math.min(0, min)), barColor: rule.color })
            break
          case 'colorScale':
            if (typeof v === 'number') {
              const lo = Math.min(...nums)
              const hi = Math.max(...nums)
              const t = hi > lo ? (v - lo) / (hi - lo) : 0.5
              const lerp = (a: number[], b: number[], k: number) => a.map((x, i) => Math.round(x + (b[i] - x) * k))
              const c = t < 0.5 ? lerp([248, 105, 107], [255, 235, 132], t * 2) : lerp([255, 235, 132], [99, 190, 123], (t - 0.5) * 2)
              m.set(ref, { ...(m.get(ref) ?? {}), fill: `rgb(${c.join(',')})` })
            }
            break
        }
      }
    }
    return m
  }, [sheet?.cf, sheet?.cells, ev, si])

  const commentRefs = useMemo(() => new Set((sheet?.comments ?? []).filter((c) => !c.resolved).map((c) => c.ref)), [sheet?.comments])

  if (backstage || !wb || !sheet) {
    const openWb = (id: string) => {
      setWbId(id)
      setSi(0)
      select({ c: 0, r: 0 })
      setBackstage(false)
    }
    return (
      <Backstage
        workbooks={workbooks as XWorkbook[]}
        current={wb}
        onBack={wb ? () => setBackstage(false) : undefined}
        onOpen={openWb}
        onNew={() => {
          let k = 1
          while (workbooks.some((w) => w.name === `Book${k}.xlsx`)) k++
          const id = uid('wb')
          db.insert('excel.workbooks', { id, name: `Book${k}.xlsx`, modified: new Date().toISOString(), author: ME.id, sheets: [{ name: 'Sheet1', cells: {} }], ...(isAgent ? { createdBy: 'hworker' } : {}) })
          setWbId(id)
          setSi(0)
          select({ c: 0, r: 0 })
          setBackstage(false)
        }}
        onTemplate={(kind) => {
          const t = templateSheets(kind)
          let name = `${t.name}.xlsx`
          let k = 2
          while (workbooks.some((w) => w.name === name)) name = `${t.name} ${k++}.xlsx`
          const id = uid('wb')
          db.insert('excel.workbooks', { id, name, modified: new Date().toISOString(), author: ME.id, sheets: t.sheets, ...(isAgent ? { createdBy: 'hworker' } : {}) })
          openWb(id)
        }}
        onSaveCopy={(name) => {
          if (!wb) return
          const id = uid('wb')
          db.insert('excel.workbooks', { ...JSON.parse(JSON.stringify(wb)), id, name: name.endsWith('.xlsx') ? name : `${name}.xlsx`, modified: new Date().toISOString(), author: ME.id, pinned: false, sharedWith: [] })
          openWb(id)
        }}
        onPin={(id, pinned) => db.update('excel.workbooks', id, { pinned })}
        onCloseWb={() => {
          setWbId(null)
          setBackstage(true)
        }}
        onShare={() => {
          setBackstage(false)
          setDialog({ kind: 'share' })
        }}
        toast={(title, body) => toast({ appId: 'excel', title, body })}
      />
    )
  }

  const barValue = editing ? editing.value : rawOf(activeCell as Cell)
  const totalW = lefts[NCOLS]
  const totalH = tops[NROWS]
  const selRect = { left: lefts[sel.c1], top: tops[sel.r1], width: lefts[sel.c2 + 1] - lefts[sel.c1], height: tops[sel.r2 + 1] - tops[sel.r1] }
  const actRect = { left: lefts[active.c], top: tops[active.r], width: widths[active.c], height: heights[active.r] || ROW_H }
  const multi = sel.c1 !== sel.c2 || sel.r1 !== sel.r2
  const freeze = sheet.freezeRow ?? 0
  const freezeC = sheet.freezeCol ?? 0
  const grid = sheet.showGrid !== false
  const ink = sheet.ink ?? []

  // page breaks for Page Layout / Page Break Preview
  const pageBreaks = (() => {
    if (view === 'normal') return { cols: [] as number[], rows: [] as number[] }
    const ps = sheet.pageSetup ?? {}
    const [pw, ph] = ps.size === 'a4' ? [794, 1123] : ps.size === 'legal' ? [816, 1344] : [816, 1056]
    const [W, H] = ps.orientation === 'landscape' ? [ph, pw] : [pw, ph]
    const m = ps.margins === 'wide' ? 96 : ps.margins === 'narrow' ? 24 : 67
    const cw = W - m * 2
    const chh = H - m * 2
    const cols: number[] = []
    let acc = 0
    for (let c = 0; c < NCOLS; c++) {
      if (acc + widths[c] > cw) (cols.push(c), (acc = 0))
      acc += widths[c]
    }
    const rows: number[] = []
    acc = 0
    for (let r = 0; r < NROWS; r++) {
      if (acc + heights[r] > chh) (rows.push(r), (acc = 0))
      acc += heights[r]
    }
    return { cols, rows }
  })()
  const printRg = sheet.printArea ? parseRange(sheet.printArea) : null

  const searchCommands: [string, () => void][] = [
    ['Sort A to Z', () => doSort(false)],
    ['Sort Z to A', () => doSort(true)],
    ['Filter', toggleFilter],
    ['Freeze Top Row', () => writeX((s) => ({ ...s, freezeRow: 1 }))],
    ['Insert Chart', act.insertChart],
    ['Insert PivotTable', () => newPivot()],
    ['Format Cells', () => setDialog({ kind: 'formatCells' })],
    ['Format as Table', act.formatTable],
    ['Find and Replace', () => setDialog({ kind: 'find', tab: 'replace' })],
    ['Insert Function', () => setDialog({ kind: 'insertFunction' })],
    ['Conditional Formatting: Data Bars', () => addCf({ type: 'dataBar', color: '#638EC6' })],
    ['Conditional Formatting: Color Scale', () => addCf({ type: 'colorScale' })],
    ['Insert Row', () => insertRows()],
    ['Insert Column', () => insertCols()],
    ['Delete Row', () => deleteRows()],
    ['AutoFit Column Width', act.autofit],
    ['Name Manager', () => setDialog({ kind: 'names' })],
    ['Goal Seek', () => setDialog({ kind: 'goalSeek' })],
    ['Data Validation', () => setDialog({ kind: 'validation' })],
    ['New Comment', () => cmd('New Comment')],
    ['Share', () => setDialog({ kind: 'share' })],
    ['Protect Sheet', () => cmd('Protect Sheet')],
    ['Workbook Statistics', () => cmd('Workbook Statistics')],
  ]
  const searchHits = search.trim() ? searchCommands.filter(([l]) => l.toLowerCase().includes(search.trim().toLowerCase())).slice(0, 6) : []

  const ctxItems = (): MenuItem[] => {
    if (!ctx) return []
    if (ctx.kind === 'sheet') {
      const i = ctx.idx ?? si
      return [
        { label: 'Insert', onClick: addSheet },
        { label: 'Delete', onClick: () => deleteSheet(i), disabled: sheets.length < 2 },
        {
          label: 'Rename',
          onClick: () => {
            setRenaming(i)
            setRenameText(sheets[i].name)
          },
        },
        { label: 'Duplicate', onClick: () => duplicateSheet(i) },
        { label: 'Move Left', onClick: () => moveSheet(i, -1), disabled: i === 0 },
        { label: 'Move Right', onClick: () => moveSheet(i, 1), disabled: i === sheets.length - 1 },
        {
          label: 'Tab Color',
          sub: [
            { label: 'No Color', onClick: () => writeSheets((all) => all.map((s, k) => (k === i ? { ...s, tabColor: undefined } : s))) },
            ...['#C00000', '#FFC000', '#107C41', '#0070C0', '#7030A0', '#ED7D31'].map((c) => ({ label: c, swatch: c, onClick: () => writeSheets((all) => all.map((s, k) => (k === i ? { ...s, tabColor: c } : s))) })),
          ],
        },
        { label: sheets[i]?.name && (sheets[i] as XSheet).protected ? 'Unprotect Sheet' : 'Protect Sheet', onClick: () => writeSheets((all) => all.map((s, k) => (k === i ? ({ ...s, protected: !(s as XSheet).protected } as Sheet) : s)), { noHistory: true }) },
      ]
    }
    const base: MenuItem[] = [
      { label: 'Cut', icon: Cut20Regular, hint: 'Ctrl+X', onClick: () => copySel(true) },
      { label: 'Copy', icon: Copy20Regular, hint: 'Ctrl+C', onClick: () => copySel(false) },
      { label: 'Paste', icon: ClipboardPaste20Regular, hint: 'Ctrl+V', disabled: !clip.current, onClick: () => pasteInternal() },
      { label: 'Paste Values', disabled: !clip.current, onClick: () => pasteInternal('values') },
      { label: '', sep: true },
    ]
    if (ctx.kind === 'row')
      return [
        ...base,
        { label: 'Insert', icon: TableInsertRow20Regular, onClick: () => insertRows() },
        { label: 'Delete', icon: TableDeleteRow20Regular, onClick: () => deleteRows() },
        { label: 'Clear Contents', onClick: () => forSel((c) => (c ? { ...c, v: undefined, f: undefined } : undefined)) },
        { label: '', sep: true },
        { label: 'Format Cells…', icon: TableSimple20Regular, onClick: () => setDialog({ kind: 'formatCells' }) },
        { label: 'Row Height…', onClick: () => cmd('Row Height') },
        { label: 'AutoFit Row Height', onClick: () => autoFitRows(sel.r1, sel.r2) },
      ]
    if (ctx.kind === 'col')
      return [
        ...base,
        { label: 'Insert', icon: TableInsertRow20Regular, onClick: () => insertCols() },
        { label: 'Delete', icon: TableDeleteRow20Regular, onClick: () => deleteCols() },
        { label: 'Clear Contents', onClick: () => forSel((c) => (c ? { ...c, v: undefined, f: undefined } : undefined)) },
        { label: '', sep: true },
        { label: 'Format Cells…', icon: TableSimple20Regular, onClick: () => setDialog({ kind: 'formatCells' }) },
        { label: 'Column Width…', onClick: () => cmd('Column Width') },
        { label: 'AutoFit Column Width', onClick: act.autofit },
      ]
    return [
      ...base,
      {
        label: 'Insert…',
        icon: TableInsertRow20Regular,
        sub: [
          { label: 'Entire row', onClick: () => insertRows() },
          { label: 'Entire column', onClick: () => insertCols() },
        ],
      },
      {
        label: 'Delete…',
        icon: TableDeleteRow20Regular,
        sub: [
          { label: 'Entire row', onClick: () => deleteRows() },
          { label: 'Entire column', onClick: () => deleteCols() },
        ],
      },
      { label: 'Clear Contents', onClick: () => forSel((c) => (c ? { ...c, v: undefined, f: undefined } : undefined)) },
      { label: '', sep: true },
      {
        label: 'Filter',
        icon: Filter20Regular,
        sub: [
          { label: sheet.autoFilter ? 'Remove Filter' : 'Filter by Selected Cell’s Value', onClick: () => {
            if (sheet.autoFilter) return toggleFilter()
            const rg = regionOf()
            const keep = formatValue(ev.value(si, active.c, active.r), activeCell?.fmt)
            const hidden: string[] = []
            for (let r = rg.r1 + 1; r <= rg.r2; r++) {
              const v = ev.value(si, active.c, r)
              const t = v === null ? '' : formatValue(v, sheet.cells[refName(active.c, r)]?.fmt)
              if (t !== keep && !hidden.includes(t)) hidden.push(t)
            }
            writeX((s) => ({ ...s, autoFilter: rgName(rg), filters: { ...(s.filters ?? {}), [rgName(rg)]: { [active.c - rg.c1]: hidden } } }))
          } },
          { label: 'Clear Filters', onClick: clearFilters },
        ],
      },
      {
        label: 'Sort',
        icon: ArrowSort20Regular,
        sub: [
          { label: 'Sort A to Z', onClick: () => doSort(false) },
          { label: 'Sort Z to A', onClick: () => doSort(true) },
          { label: 'Custom Sort…', onClick: () => setDialog({ kind: 'sort' }) },
        ],
      },
      { label: '', sep: true },
      { label: 'New Comment', icon: Comment16Regular, onClick: () => cmd('New Comment') },
      { label: 'Format Cells…', icon: TableSimple20Regular, hint: 'Ctrl+1', onClick: () => setDialog({ kind: 'formatCells' }) },
      { label: 'Pick From Drop-down List…', disabled: !activeCell?.validation, onClick: () => setValidOpen(true) },
      { label: 'Define Name…', onClick: () => setDialog({ kind: 'names' }) },
      { label: 'Link', icon: Link20Regular, hint: 'Ctrl+K', onClick: () => cmd('Link') },
    ]
  }

  // header interactions
  const resizeCol = (c: number, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const x0 = e.clientX
    const w0 = widths[c]
    const z = zoom / 100
    const mv = (ev2: MouseEvent) => {
      const w = Math.max(8, Math.round(w0 + (ev2.clientX - x0) / z))
      const el = gridRef.current?.querySelector(`[data-colhead="${c}"]`) as HTMLElement | null
      if (el) el.style.width = `${w}px`
    }
    const up = (ev2: MouseEvent) => {
      window.removeEventListener('mousemove', mv)
      window.removeEventListener('mouseup', up)
      const w = Math.max(8, Math.round(w0 + (ev2.clientX - x0) / z))
      if (w !== w0) writeX((s) => ({ ...s, colWidths: { ...(s.colWidths ?? {}), [COLS[c]]: w } }))
    }
    window.addEventListener('mousemove', mv)
    window.addEventListener('mouseup', up)
  }
  const resizeRow = (r: number, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const y0 = e.clientY
    const h0 = heights[r]
    const z = zoom / 100
    const up = (ev2: MouseEvent) => {
      window.removeEventListener('mouseup', up)
      const h = Math.max(4, Math.round(h0 + (ev2.clientY - y0) / z))
      if (h !== h0) writeX((s) => ({ ...s, rowHeights: { ...(s.rowHeights ?? {}), [r]: h } }))
    }
    window.addEventListener('mouseup', up)
  }
  const autofitCol = (c: number) => {
    let max = 0
    for (let r = 0; r < NROWS; r++) {
      const cell = sheet.cells[refName(c, r)]
      if (!cell) continue
      max = Math.max(max, formatValue(ev.value(si, c, r), cell.fmt).length * (cell.bold ? 7.6 : 7.1) * ((cell.size ?? 11) / 11) + 16)
    }
    writeX((s) => ({ ...s, colWidths: { ...(s.colWidths ?? {}), [COLS[c]]: Math.max(48, Math.round(max)) } }))
  }

  // ink drawing
  const inkPoint = (e: React.PointerEvent) => {
    const el = e.currentTarget as HTMLElement
    const r = el.getBoundingClientRect()
    const z = (r.width / el.offsetWidth) || 1
    return [(e.clientX - r.left) / z, (e.clientY - r.top) / z] as [number, number]
  }
  const finishInk = () => {
    const s = inkDraft.current
    inkDraft.current = null
    if (!s || s.pts.length < 2) return setInkTick((t) => t + 1)
    let stroke = s
    if (inkShape) {
      const xs = s.pts.map((p) => p[0])
      const ys = s.pts.map((p) => p[1])
      const [a, b] = [s.pts[0], s.pts[s.pts.length - 1]]
      const span = Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys))
      const closed = Math.hypot(a[0] - b[0], a[1] - b[1]) < span * 0.25
      stroke = closed
        ? { ...s, pts: [[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)], [Math.min(...xs), Math.max(...ys)], [Math.min(...xs), Math.min(...ys)]] }
        : { ...s, pts: [a, b] }
    }
    writeX((sh) => ({ ...sh, ink: [...(sh.ink ?? []), stroke] }))
  }

  return (
    <div ref={rootRef} className="relative flex-1 min-h-0 flex flex-col bg-[#F3F3F3] select-none" style={{ fontFamily: 'var(--font-win)' }}>
      {/* ── title bar ── */}
      <div data-drag-handle className="h-10 shrink-0 flex items-center text-white" style={{ background: GREEN }}>
        <div className="flex items-center gap-1 pl-3" data-no-drag>
          <span className="text-[12px] mr-1">AutoSave</span>
          <button aria-label={autoSave ? 'AutoSave On' : 'AutoSave Off'} onClick={() => setAutoSave((a) => !a)} className={`relative w-[38px] h-[18px] rounded-full mr-2 ${autoSave ? 'bg-white/95' : 'border border-white/90'}`}>
            <span className="absolute top-[3px] w-3 h-3 rounded-full transition-all" style={{ background: autoSave ? GREEN : '#fff', right: autoSave ? 3 : undefined, left: autoSave ? undefined : 3 }} />
            <span className="absolute top-[1px] text-[10px] font-semibold" style={{ color: autoSave ? GREEN : '#fff', left: autoSave ? 5 : undefined, right: autoSave ? undefined : 4 }}>
              {autoSave ? 'On' : 'Off'}
            </span>
          </button>
          <button data-agent="excel-save" aria-label="Save" onClick={save} className="w-8 h-8 rounded flex items-center justify-center hover:bg-white/15">
            <Save20Regular />
          </button>
          <button aria-label="Undo" onClick={undo} className="w-8 h-8 rounded flex items-center justify-center hover:bg-white/15">
            <ArrowUndo20Regular />
          </button>
          <button aria-label="Redo" onClick={redo} className="w-8 h-8 rounded flex items-center justify-center hover:bg-white/15 opacity-80">
            <ArrowRedo20Regular />
          </button>
          <div className="relative">
            <button aria-label="Customize Quick Access Toolbar" onClick={() => setQatMenu((m) => !m)} className="w-5 h-8 flex items-center justify-center hover:bg-white/15 rounded">
              <ChevronDown12Regular />
            </button>
            {qatMenu && (
              <PopMenu
                onClose={() => setQatMenu(false)}
                items={[
                  { label: 'AutoSave', checked: autoSave, onClick: () => setAutoSave((a) => !a) },
                  { label: 'Save', checked: true, onClick: save },
                  { label: 'Undo', checked: true, onClick: undo },
                  { label: 'Redo', checked: true, onClick: redo },
                  { label: '', sep: true },
                  { label: 'Sort Ascending', onClick: () => doSort(false) },
                  { label: 'Sort Descending', onClick: () => doSort(true) },
                ]}
              />
            )}
          </div>
        </div>
        <div className="relative ml-3" data-no-drag>
          <button
            data-agent="excel-filename-button"
            aria-label="File name"
            onClick={() => {
              setFileName(wb.name.replace(/\.xlsx$/i, ''))
              setFileMenu((m) => !m)
            }}
            className="flex items-center gap-1.5 h-8 px-2 rounded hover:bg-white/15 text-[12.5px]"
          >
            <span className="font-semibold">{wb.name.replace(/\.xlsx$/i, '')}</span>
            <span className="opacity-90">•</span>
            <span className="opacity-90">{saveState === 'saving' ? 'Saving…' : autoSave ? 'Saved to OneDrive' : 'Saved'}</span>
            <ChevronDown12Regular />
          </button>
          {fileMenu && (
            <div className="absolute z-50 left-0 top-9 w-[340px] bg-white text-[#242424] rounded-lg shadow-[0_8px_28px_rgba(0,0,0,0.24)] border border-black/5 p-4">
              <div className="text-[12px] font-semibold mb-1">File Name</div>
              <div className="flex items-center h-8 border border-[#C7C7C7] rounded px-2 focus-within:border-b-2 focus-within:border-b-[#107C41]">
                <input
                  data-agent="excel-filename"
                  aria-label="File Name"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const n = fileName.trim()
                      if (n) db.update('excel.workbooks', wb.id, { name: n.endsWith('.xlsx') ? n : `${n}.xlsx`, modified: new Date().toISOString() })
                      setFileMenu(false)
                    }
                    if (e.key === 'Escape') setFileMenu(false)
                  }}
                  className="flex-1 outline-none text-[13px]"
                />
                <span className="text-[12px] text-[#616161]">.xlsx</span>
              </div>
              <div className="text-[12px] font-semibold mt-3 mb-1">Location</div>
              <div className="flex items-center gap-2 h-8 px-2 rounded bg-[#F5F5F5] text-[12.5px]">
                <Cloud16Regular className="text-[#0F6CBD]" /> OneDrive - Northwind Global › Documents
              </div>
              <div className="mt-3 pt-3 border-t border-[#EDEBE9] text-[12px] text-[#616161] flex items-center justify-between">
                <span>Version History</span>
                <span>Last modified {fmtSmart(wb.modified)}</span>
              </div>
            </div>
          )}
        </div>
        <div className="flex-1 flex justify-center px-4" data-no-drag>
          <div className="relative w-full max-w-[440px]">
            <div className="flex items-center gap-2 w-full h-[30px] rounded-md bg-white/90 text-[#424242] px-2.5">
              <Search20Regular className="w-4 h-4" />
              <input
                aria-label="Search"
                placeholder="Search (Alt + Q)"
                data-agent="excel-search"
                value={search}
                onChange={(e) => (setSearch(e.target.value), setSearchOpen(true))}
                onFocus={() => setSearchOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && search.trim()) {
                    if (searchHits[0]) searchHits[0][1]()
                    else setDialog({ kind: 'message', title: 'Search', body: findNext(search.trim(), { matchCase: false, whole: false, all: true }) })
                    setSearchOpen(false)
                    setSearch('')
                  }
                  if (e.key === 'Escape') setSearchOpen(false)
                }}
                className="flex-1 bg-transparent outline-none text-[12.5px] placeholder:text-[#616161]"
              />
            </div>
            {searchOpen && search.trim() && (
              <Popover onClose={() => setSearchOpen(false)} style={{ width: '100%' }}>
                <div className="py-1 text-[12.5px]">
                  {searchHits.length > 0 && <div className="px-3 pt-1 pb-0.5 text-[11px] font-semibold text-[#616161]">Actions</div>}
                  {searchHits.map(([l, fn]) => (
                    <button key={l} onClick={() => (fn(), setSearchOpen(false), setSearch(''))} className="w-full text-left px-3 h-8 hover:bg-[#F0F0F0]">
                      {l}
                    </button>
                  ))}
                  <div className="px-3 pt-1 pb-0.5 text-[11px] font-semibold text-[#616161]">Find in workbook</div>
                  <button onClick={() => (setDialog({ kind: 'message', title: 'Search', body: findNext(search.trim(), { matchCase: false, whole: false, all: true }) }), setSearchOpen(false))} className="w-full text-left px-3 h-8 hover:bg-[#F0F0F0]">
                    Find “{search.trim()}”
                  </button>
                </div>
              </Popover>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 pr-1" data-no-drag>
          {wb.updatedBy === 'hworker' || wb.createdBy === 'hworker' ? (
            <span className="inline-flex items-center gap-1 h-[22px] px-2 rounded-full bg-white/95 text-[#430693] text-[11px] font-semibold mr-2">
              <img src={logoUrl('hworker')} className="w-3.5 h-3.5 rounded-sm" alt="" /> Edited by H-Worker
            </span>
          ) : null}
          <button onClick={() => cmd('Copilot')} className={`flex items-center gap-1.5 h-8 px-2 rounded hover:bg-white/15 text-[12.5px] ${pane === 'copilot' ? 'bg-white/20' : ''}`}>
            <Sparkle20Regular className="w-4 h-4" /> Copilot
          </button>
          <span className="text-[12.5px] mx-2">{ME.name}</span>
          <Avatar id={ME.id} size={26} />
          <button aria-label="Help" onClick={() => cmd('Help')} className="w-9 h-9 flex items-center justify-center hover:bg-white/15 rounded ml-1">
            <Lightbulb20Regular className="w-4 h-4" />
          </button>
        </div>
        <WindowControls dark height={40} />
      </div>

      {/* ── tabs ── */}
      <div className="h-9 shrink-0 flex items-center px-2 gap-0.5 text-[13px]">
        <button data-agent="excel-file-tab" onClick={() => setBackstage(true)} className="h-7 px-2.5 rounded hover:bg-[#E6E6E6] text-[#242424]">
          File
        </button>
        {TABS.map(([id, label]) => (
          <button key={id} data-agent={`excel-tab-${id}`} onClick={() => setTab(id)} className={`relative h-7 px-2.5 rounded hover:bg-[#E6E6E6] ${tab === id ? 'font-semibold' : 'text-[#424242]'}`} style={tab === id ? { color: GREEN } : undefined}>
            {label}
            {tab === id && <span className="absolute left-2.5 right-2.5 -bottom-[3px] h-[3px] rounded-full" style={{ background: GREEN }} />}
          </button>
        ))}
        <div className="flex-1" />
        <button data-agent="excel-comments-button" onClick={() => setPane((p) => (p === 'comments' ? null : 'comments'))} className={`flex items-center gap-1.5 h-7 px-2.5 rounded border border-[#C7C7C7] bg-white hover:bg-[#F5F5F5] text-[12.5px] ${pane === 'comments' ? 'bg-[#E6F2EA]' : ''}`}>
          <Comment20Regular className="w-4 h-4" /> Comments
        </button>
        <div className="relative">
          <button
            data-agent="excel-share-button"
            onClick={(e) => ((e.target as HTMLElement).closest('[data-chev]') ? setShareMenu((m) => !m) : setDialog({ kind: 'share' }))}
            className="flex items-center gap-1.5 h-7 pl-2.5 pr-1.5 rounded text-white text-[12.5px] font-semibold ml-1.5 mr-1"
            style={{ background: GREEN }}
          >
            <Share20Regular className="w-4 h-4" /> Share{' '}
            <span data-chev className="inline-flex">
              <ChevronDown12Regular className="ml-0.5" />
            </span>
          </button>
          {shareMenu && (
            <PopMenu
              style={{ left: 'auto', right: 0 }}
              onClose={() => setShareMenu(false)}
              items={[
                { label: 'Share', icon: Share20Regular, onClick: () => setDialog({ kind: 'share' }) },
                { label: 'Copy link', icon: Link20Regular, onClick: () => (navigator.clipboard?.writeText(`https://northwind-my.sharepoint.com/:x:/g/personal/alex/${wb.id}`).catch(() => {}), toast({ appId: 'excel', title: 'Link copied', body: `Anyone in Northwind Global with the link can edit “${wb.name}”.` })) },
                { label: 'Manage access', onClick: () => setDialog({ kind: 'share' }) },
              ]}
            />
          )}
        </div>
      </div>

      <Ribbon tab={tab} act={act} />

      {/* ── formula bar ── */}
      <div className="h-[30px] shrink-0 flex items-center gap-1 px-2 mt-1.5 mb-1">
        <div className="flex items-center h-[24px] w-[104px] bg-white border border-[#C7C7C7] rounded-sm">
          <input
            data-agent="excel-namebox"
            aria-label="Name Box"
            value={nameText ?? (multi && dragging.current ? `${sel.r2 - sel.r1 + 1}R x ${sel.c2 - sel.c1 + 1}C` : activeRef)}
            onMouseDown={() => setNameText('')}
            onClick={() => nameText === null && setNameText('')}
            onChange={(e) => setNameText(e.target.value)}
            onBlur={() => setNameText(null)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const typed = nameText ?? ''
                const named = !parseRange(typed) && ev.nameRef(typed) ? ev.nameRef(typed)!.split('!').pop()!.replace(/\$/g, '') : null
                const rg = parseRange(named ?? typed)
                if (rg) {
                  setEditing(null)
                  setActive({ c: rg.c1, r: rg.r1 })
                  setAnchor({ c: rg.c2, r: rg.r2 })
                  setSelChart(null)
                  // keep the active cell top-left like Excel
                  setTimeout(() => {
                    setActive({ c: rg.c1, r: rg.r1 })
                    setAnchor({ c: rg.c2, r: rg.r2 })
                  })
                  const el = gridRef.current?.querySelector(`[data-agent="excel-cell-${refName(rg.c1, rg.r1)}"]`) as HTMLElement | null
                  el?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
                } else if (/^[A-Za-z_][A-Za-z0-9_.]*$/.test(typed) && !/^[A-Za-z]{1,2}\d+$/.test(typed)) {
                  // typing a new name in the Name Box defines it for the current selection
                  patchWb({ names: [...(wb.names ?? []).filter((n) => n.name.toLowerCase() !== typed.toLowerCase()), { name: typed, ref: `${qSheet(sheet.name)}!$${COLS[sel.c1]}$${sel.r1 + 1}${multi ? `:$${COLS[sel.c2]}$${sel.r2 + 1}` : ''}` }] })
                }
                setNameText(null)
                ;(e.target as HTMLInputElement).blur()
              }
              if (e.key === 'Escape') setNameText(null)
            }}
            className="w-full min-w-0 h-full px-1.5 outline-none text-[12.5px] bg-transparent"
            style={{ fontFamily: FONT }}
          />
          <ChevronDown12Regular className="mr-1 text-[#616161] shrink-0" />
        </div>
        <MoreVertical20Regular className="w-4 h-4 text-[#9E9E9E] mx-0.5" />
        <button aria-label="Cancel" onClick={() => setEditing(null)} className={`w-6 h-6 flex items-center justify-center rounded hover:bg-[#E6E6E6] ${editing ? 'text-[#C42B1C]' : 'text-[#BDBDBD]'}`}>
          <Dismiss16Regular />
        </button>
        <button aria-label="Enter" onClick={() => editing && commit(editing.value, 'none')} className={`w-6 h-6 flex items-center justify-center rounded hover:bg-[#E6E6E6] ${editing ? 'text-[#107C41]' : 'text-[#BDBDBD]'}`}>
          <Checkmark16Regular />
        </button>
        <button aria-label="Insert Function" onClick={() => setDialog({ kind: 'insertFunction' })} className="w-7 h-6 flex items-center justify-center rounded hover:bg-[#E6E6E6] text-[#424242] italic font-serif text-[14px]">
          fx
        </button>
        <input
          data-agent="excel-formula-bar"
          aria-label="Formula Bar"
          value={barValue}
          onChange={(e) => setEditing({ value: e.target.value, src: 'bar' })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commit(editing ? editing.value : barValue, 'down')
            } else if (e.key === 'Tab') {
              e.preventDefault()
              commit(editing ? editing.value : barValue, 'right')
            } else if (e.key === 'Escape') setEditing(null)
          }}
          className="flex-1 min-w-0 h-[24px] bg-white border border-[#C7C7C7] rounded-sm px-2 outline-none text-[13px] focus:border-[#107C41]"
          style={{ fontFamily: FONT }}
        />
      </div>

      {/* ── grid + side pane ── */}
      <div className="flex-1 min-h-0 flex">
        <div
          ref={gridRef}
          tabIndex={0}
          onKeyDown={onGridKey}
          onCopy={(e) => {
            if (editing) return
            copySel(false)
            e.clipboardData.setData('text/plain', clip.current?.tsv ?? '')
            e.preventDefault()
          }}
          onCut={(e) => {
            if (editing) return
            copySel(true)
            e.clipboardData.setData('text/plain', clip.current?.tsv ?? '')
            e.preventDefault()
          }}
          onPaste={(e) => {
            if (editing) return
            pastePending.current = false
            e.preventDefault()
            const t = e.clipboardData.getData('text/plain')
            if (t) pasteText(t)
            else pasteInternal()
          }}
          data-agent="excel-grid"
          className="flex-1 min-w-0 overflow-auto bg-white outline-none relative"
          style={{ fontFamily: FONT, fontSize: 13.5, color: '#000', cursor: painter ? 'copy' : undefined }}
        >
          <div className="relative" style={{ width: totalW, height: totalH, ...(zoom !== 100 ? { zoom: zoom / 100 } : {}) }}>
            {/* column headers */}
            {HH > 0 && (
              <div className="sticky top-0 z-[8] flex" style={{ height: HH }}>
                <div
                  onMouseDown={() => selectRange({ c1: 0, r1: 0, c2: NCOLS - 1, r2: NROWS - 1 })}
                  title="Select All"
                  className="sticky left-0 z-[9] shrink-0 bg-[#F5F5F5] border-r border-b border-[#D4D4D4] relative cursor-pointer"
                  style={{ width: RW }}
                >
                  <span className="absolute right-[3px] bottom-[3px] w-0 h-0 border-l-[10px] border-l-transparent border-b-[10px] border-b-[#B7B7B7]" />
                </div>
                {widths.map((w, c) => {
                  const on = c >= sel.c1 && c <= sel.c2
                  return (
                    <div
                      key={c}
                      data-colhead={c}
                      onMouseDown={(e) => {
                        if (e.button !== 0) return
                        if (e.shiftKey) setActive({ c, r: NROWS - 1 })
                        else {
                          setAnchor({ c, r: 0 })
                          setActive({ c, r: NROWS - 1 })
                          setTimeout(() => {
                            setActive({ c, r: 0 })
                            setAnchor({ c, r: NROWS - 1 })
                          })
                        }
                        setSelChart(null)
                        gridRef.current?.focus({ preventScroll: true })
                      }}
                      onContextMenu={(e) => {
                        if (!(wholeCols && c >= sel.c1 && c <= sel.c2)) selectRange({ c1: c, r1: 0, c2: c, r2: NROWS - 1 })
                        ctxOpen('col', e, c)
                      }}
                      className={`relative shrink-0 flex items-center justify-center border-r border-b text-[12.5px] cursor-[s-resize] ${on ? 'bg-[#D3F0E0] text-[#0E5C2F] font-semibold border-b-[#107C41] border-b-2' : 'bg-[#F5F5F5] text-[#424242] border-[#D4D4D4]'}`}
                      style={{ width: w, fontFamily: 'var(--font-win)', ...(c < freezeC ? { position: 'sticky', left: lefts[c], zIndex: 9 } : {}) }}
                    >
                      {COLS[c]}
                      <span onMouseDown={(e) => resizeCol(c, e)} onDoubleClick={() => autofitCol(c)} className="absolute right-[-3px] top-0 bottom-0 w-[6px] cursor-col-resize z-[2]" />
                    </div>
                  )
                })}
              </div>
            )}
            {/* rows */}
            {Array.from({ length: NROWS }, (_, r) => {
              const on = r >= sel.r1 && r <= sel.r2
              const frozen = r < freeze
              if (heights[r] === 0) return <div key={r} className="hidden" />
              return (
                <div key={r} className={`flex ${frozen ? 'sticky z-[7] bg-white' : ''}`} style={{ height: heights[r], top: frozen ? tops[r] : undefined }}>
                  {RW > 0 && (
                    <div
                      onMouseDown={(e) => {
                        if (e.button !== 0) return
                        if (e.shiftKey) setActive({ c: NCOLS - 1, r })
                        else {
                          setActive({ c: 0, r })
                          setAnchor({ c: NCOLS - 1, r })
                        }
                        setSelChart(null)
                        gridRef.current?.focus({ preventScroll: true })
                      }}
                      onContextMenu={(e) => {
                        if (!(wholeRows && r >= sel.r1 && r <= sel.r2)) selectRange({ c1: 0, r1: r, c2: NCOLS - 1, r2: r })
                        ctxOpen('row', e, r)
                      }}
                      className={`sticky left-0 z-[5] shrink-0 flex items-center justify-center border-r border-b text-[12px] cursor-[e-resize] relative ${on ? 'bg-[#D3F0E0] text-[#0E5C2F] font-semibold border-r-[#107C41] border-r-2' : 'bg-[#F5F5F5] text-[#424242] border-[#D4D4D4]'} ${frozen && r === freeze - 1 ? 'border-b-[#9E9E9E]' : ''}`}
                      style={{ width: RW, fontFamily: 'var(--font-win)' }}
                    >
                      {r + 1}
                      <span onMouseDown={(e) => resizeRow(r, e)} className="absolute left-0 right-0 bottom-[-3px] h-[6px] cursor-row-resize z-[2]" />
                    </div>
                  )}
                  {widths.map((w, c) => {
                    const ref = refName(c, r)
                    const cell = sheet.cells[ref] as XCell | undefined
                    const t = tableInfo.get(ref)
                    const cf = cfInfo.get(ref)
                    let text = ''
                    let align: 'left' | 'center' | 'right' = 'left'
                    let err = false
                    if (cell) {
                      let v: Val = ev.value(si, c, r)
                      if (calcManual && frozenCalc && cell.f && frozenCalc.has(`${si}:${ref}`)) v = frozenCalc.get(`${si}:${ref}`)!
                      text = cell.spark ? '' : formatValue(v, cell.fmt)
                      err = isErr(v)
                      align = cell.align ?? (typeof v === 'number' && cell.fmt !== 'text' ? 'right' : typeof v === 'boolean' || err ? 'center' : 'left')
                    }
                    const fill = cf?.fill ?? (t ? (t.header ? theme.header : t.total ? undefined : t.band ? undefined : theme.band) : cell?.fill)
                    let spark: CellLook['spark']
                    if (cell?.spark) {
                      const rg = parseRange(cell.spark.range)
                      const vals: number[] = []
                      if (rg) for (let rr = rg.r1; rr <= rg.r2; rr++) for (let cc = rg.c1; cc <= rg.c2; cc++) {
                        const x = ev.value(si, cc, rr)
                        if (typeof x === 'number') vals.push(x)
                      }
                      spark = { vals, type: cell.spark.type }
                    }
                    const fancy = cell && (cell.font || cell.size || cell.strike || cell.valign || cell.wrap || cell.indent || cell.rotate || cell.border || cell.link || cell.mergeAcross)
                    const look: CellLook | undefined =
                      fancy || cf?.bar !== undefined || spark || commentRefs.has(ref) || !grid || c < freezeC || activeFilterHeads.has(ref)
                        ? {
                            font: cell?.font,
                            size: cell?.size,
                            strike: cell?.strike,
                            valign: cell?.valign,
                            wrap: cell?.wrap,
                            indent: cell?.indent,
                            rotate: cell?.rotate,
                            border: cell?.border,
                            link: !!cell?.link,
                            comment: commentRefs.has(ref),
                            bar: cf?.bar,
                            barColor: cf?.barColor,
                            spark,
                            spanW: cell?.mergeAcross ? lefts[Math.min(NCOLS, c + cell.mergeAcross + 1)] - lefts[c] : undefined,
                            grid,
                            stickyLeft: c < freezeC ? lefts[c] : undefined,
                            filterActive: activeFilterHeads.has(ref),
                          }
                        : undefined
                    return (
                      <CellView
                        key={c}
                        refId={ref}
                        text={text}
                        w={w}
                        align={align}
                        bold={cell?.bold || t?.header || t?.total}
                        italic={cell?.italic}
                        underline={cell?.underline}
                        fill={fill}
                        color={cf?.color ?? (t?.header ? '#FFFFFF' : cell?.color)}
                        err={err}
                        filterBtn={t?.header || autoFilterHeads.has(ref)}
                        onDown={onDown}
                        onEnter={onEnter}
                        onDouble={onDouble}
                        onFilter={onFilterBtn}
                        onCtx={onCellCtx}
                        look={look}
                      />
                    )
                  })}
                </div>
              )
            })}

            {/* page breaks */}
            {view !== 'normal' && (
              <>
                {pageBreaks.cols.map((c) => (
                  <div key={`pc${c}`} className="absolute pointer-events-none z-[4]" style={{ left: lefts[c] - 1, top: HH, height: totalH - HH, borderLeft: `${view === 'pagebreak' ? 2 : 1}px dashed ${view === 'pagebreak' ? '#2F5597' : '#7F7F7F'}` }} />
                ))}
                {pageBreaks.rows.map((r) => (
                  <div key={`pr${r}`} className="absolute pointer-events-none z-[4]" style={{ top: tops[r] - 1, left: RW, width: totalW - RW, borderTop: `${view === 'pagebreak' ? 2 : 1}px dashed ${view === 'pagebreak' ? '#2F5597' : '#7F7F7F'}` }} />
                ))}
                {view === 'pagebreak' &&
                  [0, ...pageBreaks.rows].slice(0, 6).flatMap((r0, i) =>
                    [0, ...pageBreaks.cols].slice(0, 4).map((c0, j) => (
                      <div key={`pl${i}-${j}`} className="absolute pointer-events-none z-[3] text-[44px] font-semibold text-[#BFBFBF]/60" style={{ left: lefts[c0] + 40, top: tops[r0] + 30 }}>
                        Page {i * 4 + j + 1}
                      </div>
                    )),
                  )}
                {printRg && <div className="absolute pointer-events-none z-[4]" style={{ left: lefts[printRg.c1], top: tops[printRg.r1], width: lefts[printRg.c2 + 1] - lefts[printRg.c1], height: tops[printRg.r2 + 1] - tops[printRg.r1], outline: '2px solid #2F5597' }} />}
              </>
            )}

            {/* selection overlays */}
            {multi && <div className="absolute pointer-events-none z-[4]" style={{ ...selRect, background: 'rgba(0,0,0,0.075)', outline: `2px solid ${GREEN}`, outlineOffset: -1 }} />}
            <div className="absolute pointer-events-none z-[4]" style={{ ...actRect, outline: multi ? undefined : `2px solid ${GREEN}`, outlineOffset: -1, background: multi ? '#fff' : undefined, mixBlendMode: multi ? 'multiply' : undefined }} />
            <div className="absolute pointer-events-none z-[4] w-[7px] h-[7px] border border-white" style={{ left: selRect.left + selRect.width - 4, top: selRect.top + selRect.height - 4, background: GREEN }} />
            {marquee && clip.current && clip.current.si === si && (
              <div
                className="absolute pointer-events-none z-[4]"
                style={{ left: lefts[marquee.c1], top: tops[marquee.r1], width: lefts[marquee.c2 + 1] - lefts[marquee.c1], height: tops[marquee.r2 + 1] - tops[marquee.r1], outline: `2px dashed ${GREEN}`, outlineOffset: -1 }}
              />
            )}
            {trace &&
              trace.map((rg, i) => (
                <div key={i}>
                  <div className="absolute pointer-events-none z-[5]" style={{ left: lefts[rg.c1], top: tops[rg.r1], width: lefts[rg.c2 + 1] - lefts[rg.c1], height: tops[rg.r2 + 1] - tops[rg.r1], outline: '2px solid #2F75FF', outlineOffset: -1 }} />
                  <svg className="absolute left-0 top-0 pointer-events-none z-[5]" width={totalW} height={totalH}>
                    <defs>
                      <marker id={`arr${i}`} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                        <path d="M0,0 L8,4 L0,8 z" fill="#2F75FF" />
                      </marker>
                    </defs>
                    <circle cx={lefts[rg.c1] + 6} cy={tops[rg.r1] + 6} r={3} fill="#2F75FF" />
                    <line x1={lefts[rg.c1] + 6} y1={tops[rg.r1] + 6} x2={actRect.left + 8} y2={actRect.top + actRect.height / 2} stroke="#2F75FF" strokeWidth={1.5} markerEnd={`url(#arr${i})`} />
                  </svg>
                </div>
              ))}

            {/* data validation dropdown */}
            {activeCell?.validation && !editing && (
              <div className="absolute z-[9]" style={{ left: actRect.left + actRect.width + 1, top: actRect.top }}>
                <button data-agent="excel-validation-dropdown" aria-label="Drop-down list" onMouseDown={(e) => (e.stopPropagation(), setValidOpen((v) => !v))} className="w-[17px] h-[19px] bg-white border border-[#ABABAB] flex items-center justify-center hover:bg-[#E6F2EA]">
                  <ChevronDown12Regular className="w-[10px] h-[10px]" />
                </button>
                {validOpen && (
                  <div className="absolute left-[-1px] top-[20px] min-w-[140px] bg-white border border-[#ABABAB] shadow-md py-0.5 text-[12.5px]" onMouseDown={(e) => e.stopPropagation()}>
                    {activeCell.validation.list.map((v) => (
                      <button
                        key={v}
                        onClick={() => {
                          setCells((cells) => ({ ...cells, [activeRef]: { ...(cells[activeRef] ?? {}), v, f: undefined } }))
                          setValidOpen(false)
                        }}
                        className={`w-full text-left px-2 h-[20px] hover:bg-[#D3F0E0] ${activeCell.v === v ? 'bg-[#E6F2EA]' : ''}`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* in-cell editor (also mirrors the formula bar while typing there) */}
            {editing && (
              <div className="absolute z-[9] bg-white flex items-end pb-[1px]" style={{ left: actRect.left, top: actRect.top, minWidth: actRect.width, height: actRect.height, outline: `2px solid ${GREEN}`, outlineOffset: -1 }}>
                {editing.src === 'cell' ? (
                  <input
                    autoFocus
                    data-agent="excel-cell-editor"
                    aria-label="Cell editor"
                    value={editing.value}
                    onChange={(e) => setEditing({ value: e.target.value, src: 'cell' })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        commit(editing.value, 'down')
                        gridRef.current?.focus({ preventScroll: true })
                      } else if (e.key === 'Tab') {
                        e.preventDefault()
                        commit(editing.value, 'right')
                        gridRef.current?.focus({ preventScroll: true })
                      } else if (e.key === 'Escape') {
                        setEditing(null)
                        gridRef.current?.focus({ preventScroll: true })
                      }
                    }}
                    className="w-full outline-none bg-transparent px-[3px]"
                    style={{ minWidth: actRect.width - 4, width: Math.max(actRect.width - 4, editing.value.length * 7.5 + 10) }}
                  />
                ) : (
                  <span className="px-[3px] whitespace-nowrap">
                    {editing.value}
                    <span className="inline-block w-px h-[14px] bg-black align-middle animate-pulse ml-px" />
                  </span>
                )}
              </div>
            )}

            {/* charts */}
            {(sheet.charts ?? []).map((ch) => (
              <ChartObject
                key={ch.id}
                chart={ch as Chart}
                sheet={sheet as Sheet}
                si={si}
                ev={ev}
                left={lefts[ch.col] + 8}
                top={tops[Math.min(NROWS - 1, ch.row)] + 6}
                selected={selChart === ch.id}
                fresh={freshCharts.includes(ch.id)}
                colors={theme.chart}
                onSelect={() => setSelChart(ch.id)}
                onTitle={(t) => writeSheet((s) => ({ ...s, charts: (s.charts ?? []).map((x) => (x.id === ch.id ? { ...x, title: t } : x)) }))}
                onType={(type) => writeX((s) => ({ ...s, charts: (s.charts ?? []).map((x) => (x.id === ch.id ? { ...x, type } : x)) }))}
                onDelete={() => {
                  setSelChart(null)
                  writeX((s) => ({ ...s, charts: (s.charts ?? []).filter((x) => x.id !== ch.id) }))
                }}
                onMove={(dx, dy) => {
                  const z = zoom / 100
                  const x = lefts[ch.col] + dx / z
                  const y = tops[Math.min(NROWS - 1, ch.row)] + dy / z
                  let col = 0
                  while (col < NCOLS - 1 && lefts[col + 1] <= x) col++
                  let row = 0
                  while (row < NROWS - 1 && tops[row + 1] <= y) row++
                  writeX((s) => ({ ...s, charts: (s.charts ?? []).map((c) => (c.id === ch.id ? { ...c, col, row } : c)) }))
                }}
              />
            ))}

            {/* ink layer */}
            {(ink.length > 0 || inkTool) && (
              <svg
                key={replay}
                className={`absolute left-0 top-0 z-[10] ${inkTool ? '' : 'pointer-events-none'}`}
                width={totalW}
                height={totalH}
                style={{ cursor: inkTool === 'eraser' ? 'cell' : inkTool ? 'crosshair' : undefined }}
                onPointerDown={(e) => {
                  if (!inkTool || inkTool === 'eraser') return
                  ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
                  const style = inkTool === 'highlighter' ? { color: '#FFFF00', width: 14, opacity: 0.45 } : inkTool === 'pen1' ? { color: '#C00000', width: 2.5, opacity: 1 } : { color: '#000000', width: 2, opacity: 1 }
                  inkDraft.current = { id: uid('ink'), ...style, pts: [inkPoint(e)] }
                  setInkTick((t) => t + 1)
                }}
                onPointerMove={(e) => {
                  if (!inkDraft.current) return
                  inkDraft.current.pts.push(inkPoint(e))
                  setInkTick((t) => t + 1)
                }}
                onPointerUp={finishInk}
              >
                {[...ink, ...(inkDraft.current ? [inkDraft.current] : [])].map((s) => {
                  const d = 'M' + s.pts.map((p) => p.map((n) => n.toFixed(1)).join(' ')).join(' L')
                  const len = s.pts.reduce((a, p, i) => (i ? a + Math.hypot(p[0] - s.pts[i - 1][0], p[1] - s.pts[i - 1][1]) : 0), 0)
                  return (
                    <path
                      key={s.id}
                      d={d}
                      fill="none"
                      stroke={s.color}
                      strokeWidth={s.width}
                      strokeOpacity={s.opacity}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      onPointerDown={(e) => {
                        if (inkTool !== 'eraser') return
                        e.stopPropagation()
                        writeX((sh) => ({ ...sh, ink: (sh.ink ?? []).filter((x) => x.id !== s.id) }))
                      }}
                      style={{ pointerEvents: inkTool === 'eraser' ? 'stroke' : 'none', ...(replay ? { strokeDasharray: len, strokeDashoffset: len, animation: `excel-ink-draw 1.2s ease forwards` } : {}) }}
                    />
                  )
                })}
                <style>{'@keyframes excel-ink-draw { to { stroke-dashoffset: 0 } }'}</style>
              </svg>
            )}
          </div>
        </div>
        {analyze && <AnalyzePane sheet={sheet as Sheet} onClose={() => setAnalyze(false)} onInsert={act.insertChart} />}
        {pane === 'comments' && (
          <CommentsPane
            comments={comments}
            activeRef={activeRef}
            draftFor={commentDraft}
            onAdd={(ref, text) => {
              writeX((s) => ({ ...s, comments: [...(s.comments ?? []), { id: uid('cmt'), ref, author: ME.id, text, at: new Date().toISOString() } as XComment] }))
              setCommentDraft(null)
            }}
            onReply={(id, text) => writeX((s) => ({ ...s, comments: (s.comments ?? []).map((c) => (c.id === id ? { ...c, replies: [...(c.replies ?? []), { author: ME.id, text, at: new Date().toISOString() }] } : c)) }))}
            onResolve={(id) => writeX((s) => ({ ...s, comments: (s.comments ?? []).map((c) => (c.id === id ? { ...c, resolved: !c.resolved } : c)) }))}
            onDelete={(id) => writeX((s) => ({ ...s, comments: (s.comments ?? []).filter((c) => c.id !== id) }))}
            onGo={(ref) => {
              const p = parseRef(ref)
              if (p) select(p)
            }}
            onClose={() => {
              setPane(null)
              setCommentDraft(null)
            }}
          />
        )}
        {pane === 'copilot' && <CopilotPane summary={copilotSummary()} suggestions={copilotSuggestions()} onClose={() => setPane(null)} />}
        {pane === 'scripts' && <ScriptsPane scripts={scripts()} onClose={() => setPane(null)} />}
      </div>

      {/* ── sheet tabs ── */}
      <div className="h-[30px] shrink-0 flex items-center bg-[#F3F3F3] border-t border-[#E1E1E1] text-[12.5px]">
        <button aria-label="Previous sheet" onClick={() => si > 0 && (setSi(si - 1), select({ c: 0, r: 0 }))} className={`w-7 h-full flex items-center justify-center hover:bg-[#E6E6E6] ${si > 0 ? 'text-[#424242]' : 'text-[#9E9E9E]'}`}>
          <ChevronLeft20Regular className="w-4 h-4" />
        </button>
        <button aria-label="Next sheet" onClick={() => si < sheets.length - 1 && (setSi(si + 1), select({ c: 0, r: 0 }))} className={`w-7 h-full flex items-center justify-center hover:bg-[#E6E6E6] ${si < sheets.length - 1 ? 'text-[#424242]' : 'text-[#9E9E9E]'}`}>
          <ChevronRight20Regular className="w-4 h-4" />
        </button>
        <div className="flex items-stretch h-full ml-1 min-w-0 overflow-hidden">
          {sheets.map((s, i) => {
            const on = i === si
            return (
              <div key={s.name + i} className="relative flex items-stretch">
                {renaming === i ? (
                  <input
                    autoFocus
                    data-agent="excel-sheet-rename"
                    aria-label="Sheet name"
                    value={renameText}
                    onChange={(e) => setRenameText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitRename()
                      if (e.key === 'Escape') setRenaming(null)
                    }}
                    onBlur={commitRename}
                    className="h-full px-2 w-[120px] bg-white outline-none font-semibold border-x border-[#D4D4D4]"
                    style={{ color: GREEN }}
                  />
                ) : (
                  <button
                    data-agent={`excel-sheet-${i}`}
                    aria-label={`Sheet ${s.name}`}
                    onClick={() => {
                      setEditing(null)
                      setSi(i)
                      select({ c: 0, r: 0 })
                    }}
                    onDoubleClick={() => {
                      setRenaming(i)
                      setRenameText(s.name)
                    }}
                    onContextMenu={(e) => ctxOpen('sheet', e, i)}
                    className={`relative h-full px-3.5 whitespace-nowrap ${on ? 'bg-white font-semibold shadow-[0_0_0_1px_#E1E1E1]' : 'text-[#424242] hover:bg-[#E6E6E6]'}`}
                    style={on ? { color: GREEN } : undefined}
                  >
                    {s.name}
                    {s.protected && <span className="ml-1 text-[10px]" title="Protected">🔒</span>}
                    {on && <span className="absolute left-2 right-2 bottom-[3px] h-[2px] rounded-full" style={{ background: GREEN }} />}
                    {!on && s.tabColor && <span className="absolute left-0 right-0 bottom-0 h-[3px]" style={{ background: s.tabColor }} />}
                  </button>
                )}
                <span className="w-px my-1.5 bg-[#D4D4D4]" />
              </div>
            )
          })}
          <button data-agent="excel-new-sheet" aria-label="New sheet" onClick={addSheet} className="w-8 h-full flex items-center justify-center text-[#424242] hover:bg-[#E6E6E6]">
            <Add20Regular className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 h-full flex items-center justify-end pr-2">
          <div
            className="w-[260px] h-[14px] rounded-sm bg-[#E6E6E6] relative cursor-pointer"
            onMouseDown={(e) => {
              const g = gridRef.current
              if (!g) return
              const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
              g.scrollLeft = ((e.clientX - r.left) / r.width) * (g.scrollWidth - g.clientWidth)
            }}
          >
            <div className="absolute left-0 top-[2px] bottom-[2px] w-[90px] rounded-sm bg-[#C2C2C2]" />
          </div>
        </div>
      </div>

      {/* ── status bar ── */}
      <div className="h-[24px] shrink-0 flex items-center px-3 bg-[#F3F3F3] text-[11.5px] text-[#424242] gap-4">
        <span>{painter ? 'Click a cell to paste formatting' : marquee && clip.current ? 'Select destination and press ENTER or choose Paste' : editing ? (editing.value.startsWith('=') ? 'Enter' : 'Enter') : 'Ready'}</span>
        {calcManual && <span className="font-semibold">Calculate</span>}
        {sheet.protected && <span>Protected sheet</span>}
        <span className="flex items-center gap-1">
          <Accessibility16Regular className="w-3.5 h-3.5" /> Accessibility: Good to go
        </span>
        <div className="flex-1" />
        {stats && (
          <span className="flex items-center gap-4" data-agent="excel-status-stats">
            {stats.avg !== null && <span>Average: {stats.avg}</span>}
            <span>Count: {stats.count}</span>
            {stats.sum !== null && <span>Sum: {stats.sum}</span>}
          </span>
        )}
        <span className="flex items-center gap-1">
          <button aria-label="Normal" onClick={() => setView('normal')} className={`w-6 h-5 rounded flex items-center justify-center ${view === 'normal' ? 'bg-[#DADADA]' : 'hover:bg-[#E6E6E6]'}`}>
            <Grid20Regular className="w-3.5 h-3.5" />
          </button>
          <button aria-label="Page Layout" onClick={() => setView('pagelayout')} className={`w-6 h-5 rounded flex items-center justify-center ${view === 'pagelayout' ? 'bg-[#DADADA]' : 'hover:bg-[#E6E6E6]'}`}>
            <DocumentMargins20Regular className="w-3.5 h-3.5" />
          </button>
          <button aria-label="Page Break Preview" onClick={() => setView('pagebreak')} className={`w-6 h-5 rounded flex items-center justify-center ${view === 'pagebreak' ? 'bg-[#DADADA]' : 'hover:bg-[#E6E6E6]'}`}>
            <Print20Regular className="w-3.5 h-3.5" />
          </button>
        </span>
        <span className="flex items-center gap-1.5">
          <button aria-label="Zoom out" onClick={() => setZoom((z) => Math.max(50, z - 10))} className="hover:bg-[#E6E6E6] rounded">
            <Subtract16Regular className="w-3.5 h-3.5" />
          </button>
          <span
            className="relative w-[100px] h-px bg-[#8A8A8A] cursor-pointer before:absolute before:-top-[6px] before:-bottom-[6px] before:left-0 before:right-0"
            onMouseDown={(e) => {
              const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
              setZoom(Math.round((50 + ((e.clientX - r.left) / r.width) * 150) / 10) * 10)
            }}
          >
            <span className="absolute top-[-6px] w-[3px] h-[12px] bg-[#424242] rounded-sm" style={{ left: `${((zoom - 50) / 150) * 100}%` }} />
            <span className="absolute left-1/2 top-[-3px] w-px h-[7px] bg-[#8A8A8A]" />
          </span>
          <button aria-label="Zoom in" onClick={() => setZoom((z) => Math.min(200, z + 10))} className="hover:bg-[#E6E6E6] rounded">
            <Add16Regular className="w-3.5 h-3.5" />
          </button>
          <button className="w-9 text-right hover:underline" onClick={() => cmd('Zoom')} aria-label="Zoom level">
            {zoom}%
          </button>
        </span>
      </div>

      {/* ── floating UI ── */}
      {ctx && (
        <div className="absolute z-[75]" style={{ left: ctx.x, top: ctx.y }}>
          <PopMenu items={ctxItems()} onClose={() => setCtx(null)} style={{ top: 0, marginTop: 0 }} width={240} free />
        </div>
      )}
      {filterOpen && sheet && (
        <div className="absolute z-[75]" style={{ left: filterOpen.x, top: filterOpen.y }}>
          <Popover onClose={() => setFilterOpen(null)} style={{ top: 0, marginTop: 0 }} free>
            {(() => {
              const rg = parseRange(filterOpen.range)!
              const c = rg.c1 + filterOpen.col
              const vals = new Set<string>()
              for (let r = rg.r1 + 1; r <= rg.r2; r++) {
                const v = ev.value(si, c, r)
                vals.add(v === null ? '' : formatValue(v, sheet.cells[refName(c, r)]?.fmt))
              }
              return (
                <FilterMenu
                  values={[...vals].sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))}
                  hidden={sheet.filters?.[filterOpen.range]?.[filterOpen.col] ?? []}
                  onApply={(h) => writeX((s) => ({ ...s, filters: { ...(s.filters ?? {}), [filterOpen.range]: { ...(s.filters?.[filterOpen.range] ?? {}), [filterOpen.col]: h } } }))}
                  onSort={(desc) => doSort(desc, c, rg, true)}
                  onClose={() => setFilterOpen(null)}
                />
              )
            })()}
          </Popover>
        </div>
      )}
      {dialog?.kind === 'formatCells' && <FormatCellsDialog cell={activeCell ?? {}} onApply={(p) => patchSel(p)} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'find' && (
        <FindReplaceDialog
          initialTab={dialog.tab}
          onFind={(q, o) => findNext(q, o)}
          onReplace={(q, r, o) => replaceIn(q, r, o, false)}
          onReplaceAll={(q, r, o) => replaceIn(q, r, o, true)}
          onClose={() => {
            setDialog(null)
            findPos.current = null
          }}
        />
      )}
      {dialog?.kind === 'share' && (
        <ShareDialog
          name={wb.name}
          sharedWith={wb.sharedWith ?? []}
          onShare={(emails) => {
            patchWb({ sharedWith: Array.from(new Set([...(wb.sharedWith ?? []), ...emails])) })
            toast({ appId: 'excel', title: 'Link sent', body: `${emails.length} ${emails.length === 1 ? 'person' : 'people'} can now edit “${wb.name}”.` })
          }}
          onCopy={() => {
            navigator.clipboard?.writeText(`https://northwind-my.sharepoint.com/:x:/g/personal/alex/${wb.id}`).catch(() => {})
            toast({ appId: 'excel', title: 'Link copied', body: 'Paste it anywhere to share this workbook.' })
          }}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === 'insertFunction' && <InsertFunctionDialog initialCat={dialog.cat} onPick={startFormula} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'prompt' && <PromptDialog {...dialog} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'message' && (
        <MessageDialog title={dialog.title} onClose={() => setDialog(null)}>
          {dialog.body}
        </MessageDialog>
      )}
      {dialog?.kind === 'confirm' && (
        <ConfirmDialog title={dialog.title} okLabel={dialog.okLabel} onOk={dialog.onOk} onClose={() => setDialog(null)}>
          {dialog.body}
        </ConfirmDialog>
      )}
      {dialog?.kind === 'goalSeek' && <GoalSeekDialog initialSet={activeCell?.f ? activeRef : ''} onRun={goalSeek} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'validation' && (
        <ValidationDialog initial={activeCell?.validation?.list ?? []} onOk={(list) => patchSel({ validation: { list } })} onClear={() => patchSel({ validation: undefined })} onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === 'textToColumns' && <TextToColumnsDialog onOk={textToColumns} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'import' && <ImportDialog onOk={importData} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'names' && (
        <NameManagerDialog names={wb.names ?? []} defaultRef={`${qSheet(sheet.name)}!$${COLS[sel.c1]}$${sel.r1 + 1}${multi ? `:$${COLS[sel.c2]}$${sel.r2 + 1}` : ''}`} onChange={(names) => patchWb({ names })} onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === 'cf' && <CfDialog type={dialog.type} onOk={(value, style) => addCf({ type: dialog.type, value, style: style as CfRule['style'] })} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'sort' &&
        (() => {
          const rg = regionOf()
          const hdr = hasHeader(sheet, rg, ev, si)
          const columns = Array.from({ length: rg.c2 - rg.c1 + 1 }, (_, i) => ({ idx: rg.c1 + i, label: hdr ? formatValue(ev.value(si, rg.c1 + i, rg.r1)) || `Column ${COLS[rg.c1 + i]}` : `Column ${COLS[rg.c1 + i]}` }))
          return <SortDialog columns={columns} initialCol={Math.max(rg.c1, Math.min(rg.c2, active.c))} onOk={(col, desc, header) => doSort(desc, col, rg, header)} onClose={() => setDialog(null)} />
        })()}
    </div>
  )

  /* ── Copilot + Office Scripts ── */
  function copilotSummary(): string[] {
    if (!sheet) return []
    const rg = currentRegion(sheet as Sheet, active.c, active.r)
    const rows = rg.r2 - rg.r1
    const out = [`“${sheet.name}” has data in ${rgName(rg)} (${rows} row${rows === 1 ? '' : 's'} below the header).`]
    for (let c = rg.c1; c <= rg.c2 && out.length < 4; c++) {
      let sum = 0
      let n = 0
      let best = -Infinity
      let bestRow = -1
      for (let r = rg.r1 + 1; r <= rg.r2; r++) {
        const v = ev.value(si, c, r)
        const label = String(ev.value(si, rg.c1, r) ?? '')
        if (typeof v === 'number' && !/^total/i.test(label)) {
          sum += v
          n++
          if (v > best) (best = v), (bestRow = r)
        }
      }
      if (n >= 2) {
        const fmt = sheet.cells[refName(c, rg.r1 + 1)]?.fmt
        out.push(`${formatValue(ev.value(si, c, rg.r1)) || `Column ${COLS[c]}`}: total ${formatValue(sum, fmt)}, highest is ${formatValue(ev.value(si, rg.c1, bestRow))} (${formatValue(best, fmt)}).`)
      }
    }
    return out
  }
  function copilotSuggestions() {
    const rg = sheet ? currentRegion(sheet as Sheet, active.c, active.r) : sel
    let numCol = -1
    for (let c = rg.c2; c >= rg.c1; c--) if (typeof ev.value(si, c, rg.r1 + 1) === 'number') (numCol = c), (c = -1)
    return [
      {
        label: 'Add a total row',
        run: () => {
          selectRange({ c1: rg.c1 + 1, r1: rg.r1 + 1, c2: rg.c2, r2: rg.r2 })
          setCells((cells) => {
            cells[refName(rg.c1, rg.r2 + 1)] = { v: 'Total', bold: true }
            for (let c = rg.c1 + 1; c <= rg.c2; c++) if (typeof ev.value(si, c, rg.r1 + 1) === 'number') cells[refName(c, rg.r2 + 1)] = { f: `=SUM(${refName(c, rg.r1 + 1)}:${refName(c, rg.r2)})`, bold: true, fmt: sheet?.cells[refName(c, rg.r1 + 1)]?.fmt as CellFmt | undefined }
            return cells
          })
          return `Added a Total row in row ${rg.r2 + 2} with SUM formulas.`
        },
      },
      {
        label: 'Highlight the top values',
        run: () => {
          if (numCol < 0) return 'I couldn’t find a numeric column to highlight.'
          addCf({ type: 'top10', style: 'green' }, `${refName(numCol, rg.r1 + 1)}:${refName(numCol, rg.r2)}`)
          return `Highlighted the top 10 values in ${formatValue(ev.value(si, numCol, rg.r1))} in green.`
        },
      },
      {
        label: 'Add data bars',
        run: () => {
          if (numCol < 0) return 'I couldn’t find a numeric column.'
          addCf({ type: 'dataBar', color: '#638EC6' }, `${refName(numCol, rg.r1 + 1)}:${refName(numCol, rg.r2)}`)
          return `Added data bars to ${formatValue(ev.value(si, numCol, rg.r1))}.`
        },
      },
      {
        label: 'Sort largest to smallest',
        run: () => {
          if (numCol < 0) return 'There’s no numeric column to sort by.'
          doSort(true, numCol, rg, true)
          return `Sorted ${rgName(rg)} by ${formatValue(ev.value(si, numCol, rg.r1))}, largest first.`
        },
      },
      {
        label: 'Create a PivotTable',
        run: () => {
          newPivot(false, true)
          return 'Created a PivotTable on a new sheet.'
        },
      },
    ]
  }
  function scripts() {
    const used = () => {
      let mc = 0
      let mr = 0
      for (const k of Object.keys(sheet?.cells ?? {})) {
        const p = parseRef(k)
        if (p) (mc = Math.max(mc, p.c)), (mr = Math.max(mr, p.r))
      }
      return { c1: 0, r1: 0, c2: mc, r2: mr }
    }
    return [
      {
        name: 'Highlight negative numbers',
        desc: 'Adds a red conditional format to every negative number on this sheet.',
        run: () => {
          addCf({ type: 'lt', value: 0, style: 'red' }, rgName(used()))
          return `Rule added to ${rgName(used())}.`
        },
      },
      {
        name: 'Remove blank rows',
        desc: 'Deletes empty rows inside the used range.',
        run: () => {
          const u = used()
          const blanks: number[] = []
          for (let r = u.r1; r <= u.r2; r++) if (!Array.from({ length: NCOLS }, (_, c) => sheet?.cells[refName(c, r)]).some((x) => x && (x.v !== undefined || x.f))) blanks.push(r)
          if (!blanks.length) return 'No blank rows found.'
          writeSheets((all) => blanks.reverse().reduce((acc, r) => shiftSheets(acc as XSheet[], si, 'row', r, -1) as Sheet[], all))
          return `Removed ${blanks.length} blank row${blanks.length === 1 ? '' : 's'}.`
        },
      },
      {
        name: 'Freeze header row',
        desc: 'Keeps row 1 visible while scrolling.',
        run: () => {
          writeX((s) => ({ ...s, freezeRow: 1 }))
          return 'Row 1 frozen.'
        },
      },
      {
        name: 'Timestamp active cell',
        desc: 'Writes the current date and time into the selected cell.',
        run: () => {
          const now = Date.now() / 86400000 + 25569 - new Date().getTimezoneOffset() / 1440
          setCells((cells) => ({ ...cells, [activeRef]: { ...(cells[activeRef] ?? {}), v: Math.round(now * 1e5) / 1e5, f: undefined, fmt: 'date' } }))
          return `Stamped ${activeRef}.`
        },
      },
      {
        name: 'Rename formula references check',
        desc: 'Counts formulas that currently return an error.',
        run: () => {
          let n = 0
          for (const [ref, c] of Object.entries(sheet?.cells ?? {})) {
            if (!c.f) continue
            const p = parseRef(ref)
            if (p && isErr(ev.value(si, p.c, p.r))) n++
          }
          return n ? `${n} formula${n === 1 ? '' : 's'} return an error.` : 'All formulas evaluate without errors.'
        },
      },
    ]
  }
}

/* ───────────────────────────── Analyze Data pane ───────────────────────────── */

function AnalyzePane({ sheet, onClose, onInsert }: { sheet: Sheet; onClose: () => void; onInsert: () => void }) {
  const cats = Object.entries(sheet.cells).filter(([k, v]) => /^B\d+$/.test(k) && typeof v.v === 'string' && k !== 'B1').length
  return (
    <div className="w-[300px] shrink-0 bg-white border-l border-[#E1E1E1] flex flex-col" data-agent="excel-analyze-pane">
      <div className="h-11 flex items-center px-4 border-b border-[#EDEBE9]">
        <span className="text-[15px] font-semibold flex-1">Analyze Data</span>
        <button aria-label="Close" onClick={onClose} className="w-7 h-7 rounded hover:bg-[#F0F0F0] flex items-center justify-center">
          <Dismiss20Regular />
        </button>
      </div>
      <div className="p-4 overflow-auto flex-1 space-y-3">
        <div className="h-8 flex items-center px-2.5 rounded border border-[#C7C7C7] text-[12.5px] text-[#8A8886]">Ask a question about your data</div>
        <div className="text-[12px] font-semibold text-[#616161]">Discover insights</div>
        {[
          ['Wide World Importers has noticeably higher Q3 Actual.', 'outlier'],
          ['Logistics & Freight has the highest total Q3 Actual.', 'rank'],
          [`Q3 Actual by Category — ${cats || 6} categories`, 'chart'],
        ].map(([t], i) => (
          <div key={i} className="rounded-md border border-[#E1E1E1] p-3">
            <div className="text-[12.5px] text-[#242424] mb-2">{t}</div>
            <div className="h-[92px] flex items-end gap-1.5 px-2">
              {[72, 38, 46, 24, 18, 12, 30].map((h, j) => (
                <div key={j} className="flex-1 rounded-t-sm" style={{ height: `${h + (i * 7 * (j % 3)) % 30}%`, background: j === 0 && i === 0 ? '#E97132' : '#156082' }} />
              ))}
            </div>
            <button onClick={onInsert} className="mt-2 text-[12px] text-[#107C41] font-semibold flex items-center gap-1 hover:underline">
              <DataBarVertical20Regular className="w-4 h-4" /> Insert PivotChart
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export { colIdx }
