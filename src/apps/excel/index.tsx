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
  ArrowLeft20Regular,
  Home20Regular,
  DocumentAdd20Regular,
  FolderOpen20Regular,
  Info20Regular,
  SaveCopy20Regular,
  Share20Filled,
  ArrowExportUp20Regular,
  Dismiss20Regular,
  Person20Regular,
  Settings20Regular,
  Pin16Regular,
  Cloud16Regular,
  Accessibility16Regular,
  Lightbulb20Regular,
  DataBarVertical20Regular,
} from '@fluentui/react-icons'
import type { AppProps } from '@/os/registry'
import { logoUrl } from '@/os/registry'
import { WindowControls } from '@/os/Window'
import { useDesk, useWin } from '@/os/context'
import { db, uid, useCollection, useRecord } from '@/db/db'
import { Avatar } from '@/components/Avatar'
import { ME, person } from '@/data/people'
import { fmtSmart } from '@/data/time'
import type { Cell, CellFmt, Chart, Sheet, Workbook } from './seed'
import { COLS, NCOLS, NROWS, Evaluator, colIdx, currentRegion, formatValue, isErr, parseInput, parseRange, parseRef, refName, shiftFormula, type Val } from './formula'
import { Ribbon, TABS, type RibbonTab, type RibbonActions } from './Ribbon'
import { ChartObject } from './Chart'

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

/* ───────────────────────────── grid cell ───────────────────────────── */

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
}) {
  return (
    <div
      data-agent={`excel-cell-${refId}`}
      aria-label={`Cell ${refId}`}
      onMouseDown={(e) => onDown(refId, e.shiftKey)}
      onMouseEnter={(e) => onEnter(refId, e.buttons)}
      onDoubleClick={() => onDouble(refId)}
      className="relative shrink-0 h-full border-r border-b border-[#E1E1E1] px-[3px] flex items-end pb-[1px] overflow-visible whitespace-nowrap"
      style={{
        width: w,
        background: fill,
        justifyContent: align === 'right' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start',
        fontWeight: bold ? 700 : 400,
        fontStyle: italic ? 'italic' : undefined,
        textDecoration: underline ? 'underline' : undefined,
        color: err ? '#C00000' : color,
      }}
    >
      <span className={align === 'left' ? 'relative z-[1]' : 'overflow-hidden'}>{text}</span>
      {filterBtn && (
        <span className="absolute right-[2px] bottom-[2px] w-[15px] h-[15px] bg-white border border-[#ABABAB] flex items-center justify-center z-[2]">
          <ChevronDown12Regular className="w-[10px] h-[10px] text-[#444]" />
        </span>
      )}
    </div>
  )
})

/* ───────────────────────────── app ───────────────────────────── */

export default function Excel({ win, params }: AppProps) {
  const { isAgent } = useDesk()
  const { setTitle } = useWin()
  const workbooks = useCollection<Workbook>('excel.workbooks')
  const [wbId, setWbId] = useState<string | null>(null)
  const [backstage, setBackstage] = useState(false)
  const wb = useRecord<Workbook>('excel.workbooks', wbId)
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
  const history = useRef<Sheet[][]>([])
  const future = useRef<Sheet[][]>([])
  const gridRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

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

  const sheets = wb?.sheets ?? []
  const sheet: Sheet | undefined = sheets[Math.min(si, Math.max(0, sheets.length - 1))]
  const ev = useMemo(() => new Evaluator(sheets), [sheets])
  const sel = norm(active, anchor)
  const activeRef = refName(active.c, active.r)
  const activeCell = sheet?.cells[activeRef]

  const widths = useMemo(() => Array.from({ length: NCOLS }, (_, c) => sheet?.colWidths?.[COLS[c]] ?? DEFAULT_W), [sheet?.colWidths])
  const lefts = useMemo(() => {
    const out = [ROWHEAD_W]
    for (let c = 0; c < NCOLS; c++) out.push(out[c] + widths[c])
    return out
  }, [widths])

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
  const setCells = useCallback(
    (fn: (cells: Record<string, Cell>) => Record<string, Cell>) => writeSheet((s) => ({ ...s, cells: fn({ ...s.cells }) })),
    [writeSheet],
  )
  const forSel = (fn: (cell: Cell | undefined, ref: string) => Cell | undefined) =>
    setCells((cells) => {
      for (let r = sel.r1; r <= sel.r2; r++)
        for (let c = sel.c1; c <= sel.c2; c++) {
          const ref = refName(c, r)
          const next = fn(cells[ref], ref)
          if (next && Object.keys(next).length) cells[ref] = next
          else delete cells[ref]
        }
      return cells
    })

  const select = (p: Pos, extend = false) => {
    const q = { c: Math.max(0, Math.min(NCOLS - 1, p.c)), r: Math.max(0, Math.min(NROWS - 1, p.r)) }
    setActive(q)
    if (!extend) setAnchor(q)
    setSelChart(null)
  }

  const commit = (value: string, move: 'down' | 'right' | 'none' = 'down') => {
    const ref = activeRef
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
      setEditing({ value: rawOf(cur.cells[ref]), src: 'cell' })
    },
    [],
  )
  useEffect(() => {
    const up = () => (dragging.current = false)
    window.addEventListener('mouseup', up)
    return () => window.removeEventListener('mouseup', up)
  }, [])

  const onGridKey = (e: React.KeyboardEvent) => {
    if (editing) return
    const k = e.key
    const mv = (dc: number, dr: number) => {
      e.preventDefault()
      if (e.shiftKey) setActive((a) => ({ c: Math.max(0, Math.min(NCOLS - 1, a.c + dc)), r: Math.max(0, Math.min(NROWS - 1, a.r + dr)) }))
      else select({ c: active.c + dc, r: active.r + dr })
    }
    if (k === 'ArrowDown' || k === 'Enter') return mv(0, 1)
    if (k === 'ArrowUp') return mv(0, -1)
    if (k === 'ArrowLeft') return mv(-1, 0)
    if (k === 'ArrowRight' || k === 'Tab') return mv(1, 0)
    if (k === 'Delete' || k === 'Backspace') {
      e.preventDefault()
      return forSel((c) => (c ? { ...c, v: undefined, f: undefined } : undefined))
    }
    if ((e.ctrlKey || e.metaKey) && k.toLowerCase() === 'z') return (e.preventDefault(), undo())
    if ((e.ctrlKey || e.metaKey) && k.toLowerCase() === 'y') return (e.preventDefault(), redo())
    if ((e.ctrlKey || e.metaKey) && k.toLowerCase() === 'b') return (e.preventDefault(), act.bold())
    if ((e.ctrlKey || e.metaKey) && k.toLowerCase() === 'd') return (e.preventDefault(), act.fillDown())
    if ((e.ctrlKey || e.metaKey) && k.toLowerCase() === 's') return (e.preventDefault(), save())
    if (k === 'F2') return setEditing({ value: rawOf(activeCell), src: 'cell' })
    if (k.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault()
      setEditing({ value: k, src: 'cell' })
    }
  }

  /* ── ribbon actions ── */
  const toggleProp = (prop: 'bold' | 'italic') => {
    const on = !activeCell?.[prop]
    forSel((c) => ({ ...(c ?? {}), [prop]: on || undefined }))
  }
  const act: RibbonActions = {
    bold: () => toggleProp('bold'),
    italic: () => toggleProp('italic'),
    underline: () => {},
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
      const rg = sel.r1 === sel.r2 && sel.c1 === sel.c2 ? currentRegion(sheet, active.c, active.r) : sel
      writeSheet((s) => ({ ...s, tables: [...(s.tables ?? []).filter((t) => t.range !== rangeName(rg)), { range: rangeName(rg), style: 'TableStyleMedium2' }] }))
    },
    insertChart: () => {
      if (!sheet) return
      const rg = sel.r1 === sel.r2 && sel.c1 === sel.c2 ? currentRegion(sheet, active.c, active.r) : sel
      const id = uid('chart')
      const firstHeader = formatValue(ev.value(si, rg.c1 + 1, rg.r1))
      const chart: Chart = {
        id,
        type: 'column',
        range: rangeName(rg),
        title: rg.c2 - rg.c1 > 1 ? 'Chart Title' : firstHeader || 'Chart Title',
        col: Math.min(NCOLS - 6, Math.max(rg.c2, currentRegion(sheet, rg.c1, rg.r1).c2) + 2),
        row: Math.max(0, rg.r1),
        w: 600,
        h: 320,
        ...(isAgent ? { createdBy: 'hworker' } : {}),
      }
      writeSheet((s) => ({ ...s, charts: [...(s.charts ?? []), chart] }))
      setSelChart(id)
      setFreshCharts((f) => [...f, id])
    },
    insertRow: () => {},
    deleteRow: () => {},
    freeze: () => {},
    analyze: () => setAnalyze((a) => !a),
    sort: () => {},
    state: { bold: !!activeCell?.bold, italic: !!activeCell?.italic, underline: false, fmt: activeCell?.fmt ?? 'general', align: activeCell?.align },
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

  /* ── selection stats ── */
  const stats = useMemo(() => {
    if (!sheet) return null
    if (sel.c1 === sel.c2 && sel.r1 === sel.r2) return null
    let count = 0
    let sum = 0
    let n = 0
    let fmt: CellFmt | undefined
    for (let r = sel.r1; r <= sel.r2; r++)
      for (let c = sel.c1; c <= sel.c2; c++) {
        const v = ev.value(si, c, r)
        if (v === null || v === '') continue
        count++
        if (typeof v === 'number') {
          sum += v
          n++
          fmt = fmt ?? sheet.cells[refName(c, r)]?.fmt
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

  if (backstage || !wb || !sheet) {
    return (
      <Backstage
        workbooks={workbooks}
        onBack={wb ? () => setBackstage(false) : undefined}
        onOpen={(id) => {
          setWbId(id)
          setSi(0)
          select({ c: 0, r: 0 })
          setBackstage(false)
        }}
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
      />
    )
  }

  const barValue = editing ? editing.value : rawOf(activeCell)
  const totalW = lefts[NCOLS]
  const selRect = { left: lefts[sel.c1], top: HEAD_H + sel.r1 * ROW_H, width: lefts[sel.c2 + 1] - lefts[sel.c1], height: (sel.r2 - sel.r1 + 1) * ROW_H }
  const actRect = { left: lefts[active.c], top: HEAD_H + active.r * ROW_H, width: widths[active.c], height: ROW_H }
  const multi = sel.c1 !== sel.c2 || sel.r1 !== sel.r2
  const freeze = sheet.freezeRow ?? 0

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[#F3F3F3] select-none" style={{ fontFamily: 'var(--font-win)' }}>
      {/* ── title bar ── */}
      <div data-drag-handle className="h-10 shrink-0 flex items-center text-white" style={{ background: GREEN }}>
        <div className="flex items-center gap-1 pl-3" data-no-drag>
          <span className="text-[12px] mr-1">AutoSave</span>
          <button aria-label="AutoSave On" className="relative w-[38px] h-[18px] rounded-full bg-white/95 mr-2">
            <span className="absolute right-[3px] top-[3px] w-3 h-3 rounded-full" style={{ background: GREEN }} />
            <span className="absolute left-[5px] top-[1px] text-[10px] font-semibold" style={{ color: GREEN }}>
              On
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
          <button aria-label="Customize Quick Access Toolbar" className="w-5 h-8 flex items-center justify-center hover:bg-white/15 rounded">
            <ChevronDown12Regular />
          </button>
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
            <span className="opacity-90">{saveState === 'saving' ? 'Saving…' : 'Saved to OneDrive'}</span>
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
          <div className="flex items-center gap-2 w-full max-w-[440px] h-[30px] rounded-md bg-white/90 text-[#424242] px-2.5">
            <Search20Regular className="w-4 h-4" />
            <input aria-label="Search" placeholder="Search (Alt + Q)" className="flex-1 bg-transparent outline-none text-[12.5px] placeholder:text-[#616161]" />
          </div>
        </div>
        <div className="flex items-center gap-1 pr-1" data-no-drag>
          {wb.updatedBy === 'hworker' || wb.createdBy === 'hworker' ? (
            <span className="inline-flex items-center gap-1 h-[22px] px-2 rounded-full bg-white/95 text-[#430693] text-[11px] font-semibold mr-2">
              <img src={logoUrl('hworker')} className="w-3.5 h-3.5 rounded-sm" alt="" /> Edited by H-Worker
            </span>
          ) : null}
          <button className="flex items-center gap-1.5 h-8 px-2 rounded hover:bg-white/15 text-[12.5px]">
            <Sparkle20Regular className="w-4 h-4" /> Copilot
          </button>
          <span className="text-[12.5px] mx-2">{ME.name}</span>
          <Avatar id={ME.id} size={26} />
          <button className="w-9 h-9 flex items-center justify-center hover:bg-white/15 rounded ml-1">
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
        <button className="flex items-center gap-1.5 h-7 px-2.5 rounded border border-[#C7C7C7] bg-white hover:bg-[#F5F5F5] text-[12.5px]">
          <Comment20Regular className="w-4 h-4" /> Comments
        </button>
        <button className="flex items-center gap-1.5 h-7 pl-2.5 pr-1.5 rounded text-white text-[12.5px] font-semibold ml-1.5 mr-1" style={{ background: GREEN }}>
          <Share20Regular className="w-4 h-4" /> Share <ChevronDown12Regular className="ml-0.5" />
        </button>
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
                const rg = parseRange(nameText ?? '')
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
        <button aria-label="Insert Function" className="w-7 h-6 flex items-center justify-center rounded hover:bg-[#E6E6E6] text-[#424242] italic font-serif text-[14px]">
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
          data-agent="excel-grid"
          className="flex-1 min-w-0 overflow-auto bg-white outline-none relative"
          style={{ fontFamily: FONT, fontSize: 13.5 * (zoom / 100), color: '#000' }}
        >
          <div className="relative" style={{ width: totalW, height: HEAD_H + NROWS * ROW_H }}>
            {/* column headers */}
            <div className="sticky top-0 z-[8] flex" style={{ height: HEAD_H }}>
              <div className="sticky left-0 z-[9] shrink-0 bg-[#F5F5F5] border-r border-b border-[#D4D4D4] relative" style={{ width: ROWHEAD_W }}>
                <span className="absolute right-[3px] bottom-[3px] w-0 h-0 border-l-[10px] border-l-transparent border-b-[10px] border-b-[#B7B7B7]" />
              </div>
              {widths.map((w, c) => {
                const on = c >= sel.c1 && c <= sel.c2
                return (
                  <div
                    key={c}
                    className={`shrink-0 flex items-center justify-center border-r border-b text-[12.5px] ${on ? 'bg-[#D3F0E0] text-[#0E5C2F] font-semibold border-b-[#107C41] border-b-2' : 'bg-[#F5F5F5] text-[#424242] border-[#D4D4D4]'}`}
                    style={{ width: w, fontFamily: 'var(--font-win)' }}
                  >
                    {COLS[c]}
                  </div>
                )
              })}
            </div>
            {/* rows */}
            {Array.from({ length: NROWS }, (_, r) => {
              const on = r >= sel.r1 && r <= sel.r2
              const frozen = r < freeze
              return (
                <div key={r} className={`flex ${frozen ? 'sticky z-[7] bg-white' : ''}`} style={{ height: ROW_H, top: frozen ? HEAD_H + r * ROW_H : undefined }}>
                  <div
                    className={`sticky left-0 z-[5] shrink-0 flex items-center justify-center border-r border-b text-[12px] ${on ? 'bg-[#D3F0E0] text-[#0E5C2F] font-semibold border-r-[#107C41] border-r-2' : 'bg-[#F5F5F5] text-[#424242] border-[#D4D4D4]'} ${frozen && r === freeze - 1 ? 'border-b-[#9E9E9E]' : ''}`}
                    style={{ width: ROWHEAD_W, fontFamily: 'var(--font-win)' }}
                  >
                    {r + 1}
                  </div>
                  {widths.map((w, c) => {
                    const ref = refName(c, r)
                    const cell = sheet.cells[ref]
                    const t = tableInfo.get(ref)
                    let text = ''
                    let align: 'left' | 'center' | 'right' = 'left'
                    let err = false
                    if (cell) {
                      const v: Val = ev.value(si, c, r)
                      text = formatValue(v, cell.fmt)
                      err = isErr(v)
                      align = cell.align ?? (typeof v === 'number' ? 'right' : typeof v === 'boolean' || err ? 'center' : 'left')
                    }
                    const fill = t ? (t.header ? '#156082' : t.total ? undefined : t.band ? undefined : '#C0E6F5') : cell?.fill
                    return (
                      <CellView
                        key={c}
                        refId={ref}
                        text={text}
                        w={w}
                        align={align}
                        bold={cell?.bold || t?.header || t?.total}
                        italic={cell?.italic}
                        fill={fill}
                        color={t?.header ? '#FFFFFF' : cell?.color}
                        err={err}
                        filterBtn={t?.header}
                        onDown={onDown}
                        onEnter={onEnter}
                        onDouble={onDouble}
                      />
                    )
                  })}
                </div>
              )
            })}

            {/* selection overlays */}
            {multi && <div className="absolute pointer-events-none z-[4]" style={{ ...selRect, background: 'rgba(0,0,0,0.075)', outline: `2px solid ${GREEN}`, outlineOffset: -1 }} />}
            <div className="absolute pointer-events-none z-[4]" style={{ ...actRect, outline: multi ? undefined : `2px solid ${GREEN}`, outlineOffset: -1, background: multi ? '#fff' : undefined, mixBlendMode: multi ? 'multiply' : undefined }} />
            <div className="absolute pointer-events-none z-[4] w-[7px] h-[7px] border border-white" style={{ left: selRect.left + selRect.width - 4, top: selRect.top + selRect.height - 4, background: GREEN }} />

            {/* in-cell editor (also mirrors the formula bar while typing there) */}
            {editing && (
              <div className="absolute z-[9] bg-white flex items-end pb-[1px]" style={{ left: actRect.left, top: actRect.top, minWidth: actRect.width, height: ROW_H, outline: `2px solid ${GREEN}`, outlineOffset: -1 }}>
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
                chart={ch}
                sheet={sheet}
                si={si}
                ev={ev}
                left={lefts[ch.col] + 8}
                top={HEAD_H + ch.row * ROW_H + 6}
                selected={selChart === ch.id}
                fresh={freshCharts.includes(ch.id)}
                onSelect={() => setSelChart(ch.id)}
                onTitle={(t) => writeSheet((s) => ({ ...s, charts: (s.charts ?? []).map((x) => (x.id === ch.id ? { ...x, title: t } : x)) }))}
              />
            ))}
          </div>
        </div>
        {analyze && <AnalyzePane sheet={sheet} onClose={() => setAnalyze(false)} onInsert={act.insertChart} />}
      </div>

      {/* ── sheet tabs ── */}
      <div className="h-[30px] shrink-0 flex items-center bg-[#F3F3F3] border-t border-[#E1E1E1] text-[12.5px]">
        <button aria-label="Previous sheet" className="w-7 h-full flex items-center justify-center text-[#9E9E9E] hover:bg-[#E6E6E6]">
          <ChevronLeft20Regular className="w-4 h-4" />
        </button>
        <button aria-label="Next sheet" className="w-7 h-full flex items-center justify-center text-[#9E9E9E] hover:bg-[#E6E6E6]">
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
                    className={`relative h-full px-3.5 whitespace-nowrap ${on ? 'bg-white font-semibold shadow-[0_0_0_1px_#E1E1E1]' : 'text-[#424242] hover:bg-[#E6E6E6]'}`}
                    style={on ? { color: GREEN } : undefined}
                  >
                    {s.name}
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
          <div className="w-[260px] h-[14px] rounded-sm bg-[#E6E6E6] relative">
            <div className="absolute left-0 top-[2px] bottom-[2px] w-[90px] rounded-sm bg-[#C2C2C2]" />
          </div>
        </div>
      </div>

      {/* ── status bar ── */}
      <div className="h-[24px] shrink-0 flex items-center px-3 bg-[#F3F3F3] text-[11.5px] text-[#424242] gap-4">
        <span>{editing ? (editing.value.startsWith('=') ? 'Enter' : 'Enter') : 'Ready'}</span>
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
          <button aria-label="Normal" className="w-6 h-5 rounded flex items-center justify-center bg-[#DADADA]">
            <Grid20Regular className="w-3.5 h-3.5" />
          </button>
          <button aria-label="Page Layout" className="w-6 h-5 rounded flex items-center justify-center hover:bg-[#E6E6E6]">
            <DocumentMargins20Regular className="w-3.5 h-3.5" />
          </button>
          <button aria-label="Page Break Preview" className="w-6 h-5 rounded flex items-center justify-center hover:bg-[#E6E6E6]">
            <Print20Regular className="w-3.5 h-3.5" />
          </button>
        </span>
        <span className="flex items-center gap-1.5">
          <button aria-label="Zoom out" onClick={() => setZoom((z) => Math.max(50, z - 10))} className="hover:bg-[#E6E6E6] rounded">
            <Subtract16Regular className="w-3.5 h-3.5" />
          </button>
          <span className="relative w-[100px] h-px bg-[#8A8A8A]">
            <span className="absolute top-[-6px] w-[3px] h-[12px] bg-[#424242] rounded-sm" style={{ left: `${((zoom - 50) / 150) * 100}%` }} />
            <span className="absolute left-1/2 top-[-3px] w-px h-[7px] bg-[#8A8A8A]" />
          </span>
          <button aria-label="Zoom in" onClick={() => setZoom((z) => Math.min(200, z + 10))} className="hover:bg-[#E6E6E6] rounded">
            <Add16Regular className="w-3.5 h-3.5" />
          </button>
          <span className="w-9 text-right">{zoom}%</span>
        </span>
      </div>
    </div>
  )
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

/* ───────────────────────────── Backstage ───────────────────────────── */

function Backstage({ workbooks, onOpen, onNew, onBack }: { workbooks: Workbook[]; onOpen: (id: string) => void; onNew: () => void; onBack?: () => void }) {
  const [pivot, setPivot] = useState<'recent' | 'pinned' | 'shared'>('recent')
  const hour = new Date().getHours()
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const list = [...workbooks].sort((a, b) => +new Date(b.modified) - +new Date(a.modified))
  const nav: [any, string, string?][] = [
    [Home20Regular, 'Home'],
    [DocumentAdd20Regular, 'New', 'excel-backstage-new'],
    [FolderOpen20Regular, 'Open'],
    [Info20Regular, 'Info'],
    [SaveCopy20Regular, 'Save a Copy'],
    [Print20Regular, 'Print'],
    [Share20Filled, 'Share'],
    [ArrowExportUp20Regular, 'Export'],
    [Dismiss20Regular, 'Close'],
  ]
  return (
    <div className="flex-1 min-h-0 flex bg-white" style={{ fontFamily: 'var(--font-win)' }}>
      <div className="w-[208px] shrink-0 flex flex-col text-white" style={{ background: '#0E5C2F' }}>
        <div data-drag-handle className="h-10 flex items-center">
          {onBack && (
            <button aria-label="Back" onClick={onBack} data-agent="excel-backstage-back" className="w-10 h-10 flex items-center justify-center hover:bg-white/10" data-no-drag>
              <ArrowLeft20Regular />
            </button>
          )}
          <img src={logoUrl('excel')} className="w-5 h-5 ml-3" alt="" />
          <span className="ml-2 text-[13px] font-semibold">Excel</span>
        </div>
        <div className="mt-2 flex flex-col">
          {nav.map(([I, l, agent], i) => (
            <button key={l} data-agent={agent} onClick={l === 'New' ? onNew : l === 'Close' && onBack ? onBack : undefined} className={`flex items-center gap-3 h-10 px-5 text-[13.5px] text-left ${i === 0 ? 'bg-white/15' : 'hover:bg-white/10'}`}>
              <I className="w-[18px] h-[18px]" /> {l}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        {[
          [Person20Regular, 'Account'],
          [Comment20Regular, 'Feedback'],
          [Settings20Regular, 'Options'],
        ].map(([I, l]: any) => (
          <button key={l} className="flex items-center gap-3 h-10 px-5 text-[13.5px] hover:bg-white/10">
            <I className="w-[18px] h-[18px]" /> {l}
          </button>
        ))}
        <div className="h-3" />
      </div>
      <div className="flex-1 min-w-0 flex flex-col">
        <div data-drag-handle className="h-10 shrink-0 flex items-center justify-end">
          <span className="text-[12.5px] text-[#424242] mr-2">{ME.name}</span>
          <Avatar id={ME.id} size={26} className="mr-2" />
          <WindowControls height={40} />
        </div>
        <div className="flex-1 overflow-auto px-12 pb-10">
          <h1 className="text-[28px] font-semibold text-[#242424] mt-2">{greet}</h1>
          <div className="flex items-center gap-2 mt-6 mb-3">
            <div className="text-[15px] font-semibold">New</div>
          </div>
          <div className="flex gap-5">
            <button data-agent="excel-new-workbook" onClick={onNew} className="group text-left">
              <div className="w-[150px] h-[110px] border border-[#D1D1D1] group-hover:border-[#107C41] bg-white relative overflow-hidden">
                <div className="absolute inset-0 grid grid-cols-5 grid-rows-6">
                  {Array.from({ length: 30 }).map((_, i) => (
                    <div key={i} className="border-r border-b border-[#EDEDED]" />
                  ))}
                </div>
                <div className="absolute left-[30px] top-[18px] w-[31px] h-[19px] border-2 border-[#107C41]" />
              </div>
              <div className="text-[12.5px] mt-1.5">Blank workbook</div>
            </button>
            {[
              ['Welcome to Excel', '#107C41'],
              ['Formula tutorial', '#185C37'],
              ['Make your first PivotTable', '#21A366'],
              ['Monthly budget', '#33C481'],
              ['Project tracker', '#0E5C2F'],
            ].map(([t, c]) => (
              <div key={t} className="text-left">
                <div className="w-[150px] h-[110px] border border-[#D1D1D1] relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${c} 0 38%, #fff 38%)` }}>
                  <div className="absolute right-3 bottom-3 left-[44%] top-[44%] grid grid-cols-3 gap-[3px]">
                    {Array.from({ length: 9 }).map((_, i) => (
                      <div key={i} className="bg-[#E6F2EA] rounded-[1px]" />
                    ))}
                  </div>
                  <div className="absolute left-3 top-3 text-white text-[11px] font-semibold w-[60px] leading-tight">{t}</div>
                </div>
                <div className="text-[12.5px] mt-1.5 w-[150px] truncate">{t}</div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-end mt-2 text-[12.5px] font-semibold" style={{ color: GREEN }}>
            More templates →
          </div>
          <div className="mt-4 flex items-center gap-2 h-9 max-w-[640px] rounded-md border border-[#C7C7C7] px-3 text-[13px] text-[#8A8886]">
            <Search20Regular className="w-4 h-4" /> Search
          </div>
          <div className="flex items-center gap-6 mt-6 border-b border-[#E1E1E1] text-[13.5px]">
            {(['recent', 'pinned', 'shared'] as const).map((p) => (
              <button key={p} onClick={() => setPivot(p)} className={`relative h-9 ${pivot === p ? 'font-semibold' : 'text-[#424242]'}`}>
                {p === 'recent' ? 'Recent' : p === 'pinned' ? 'Pinned' : 'Shared with Me'}
                {pivot === p && <span className="absolute left-0 right-0 bottom-0 h-[3px] rounded-full" style={{ background: GREEN }} />}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-[1fr_260px_160px] text-[12px] text-[#616161] h-9 items-center px-2">
            <span>Name</span>
            <span>Location</span>
            <span>Date modified</span>
          </div>
          {list
            .filter((w) => (pivot === 'pinned' ? w.id === 'wb-vendor-spend' : pivot === 'shared' ? w.author !== ME.id : true))
            .map((w) => (
              <button key={w.id} data-agent={`excel-workbook-${w.id}`} onClick={() => onOpen(w.id)} className="w-full grid grid-cols-[1fr_260px_160px] items-center h-12 px-2 rounded hover:bg-[#F5F5F5] text-left">
                <span className="flex items-center gap-3 min-w-0">
                  <img src={logoUrl('excel')} className="w-6 h-6" alt="" />
                  <span className="min-w-0">
                    <span className="block text-[13.5px] truncate">
                      {w.name}
                      {w.id === 'wb-vendor-spend' && <Pin16Regular className="inline ml-1.5 text-[#616161] w-3.5 h-3.5" />}
                    </span>
                    <span className="block text-[11.5px] text-[#616161]">{w.author === ME.id ? 'You' : person(w.author).name} {w.updatedBy === 'hworker' ? '· edited by H-Worker' : ''}</span>
                  </span>
                </span>
                <span className="text-[12.5px] text-[#616161] truncate">OneDrive - Northwind Global › Documents</span>
                <span className="text-[12.5px] text-[#616161]">{fmtSmart(w.modified)}</span>
              </button>
            ))}
        </div>
      </div>
    </div>
  )
}

export { colIdx }
