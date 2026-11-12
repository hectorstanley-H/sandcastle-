/**
 * Structural spreadsheet operations: insert/delete rows & columns (with reference fix-up), sort,
 * PivotTables, Flash Fill, CSV import and workbook templates.
 */
import { COLS, NCOLS, NROWS, colIdx, colName, currentRegion, formatValue, parseRange, parseRef, refName, shiftFormula, type Evaluator, type Val } from './formula'
import type { XCell, XSheet, XWorkbook } from './types'
import type { Sheet } from './seed'

type Axis = 'row' | 'col'
export type Rg = { c1: number; r1: number; c2: number; r2: number }

export const rgName = (s: Rg) => (s.c1 === s.c2 && s.r1 === s.r2 ? refName(s.c1, s.r1) : `${refName(s.c1, s.r1)}:${refName(s.c2, s.r2)}`)

/** Move a single index according to an insert (delta > 0) or delete (delta < 0) at `at`. Returns null if deleted. */
function moveIdx(i: number, at: number, delta: number): number | null {
  if (delta > 0) return i >= at ? i + delta : i
  const n = -delta
  if (i < at) return i
  if (i < at + n) return null
  return i - n
}

/**
 * Rewrite references in a formula after rows/columns were inserted/deleted on `sheetName`.
 * `own` = the formula lives on that same sheet (unqualified refs point to it).
 */
export function adjustFormula(f: string, axis: Axis, at: number, delta: number, sheetName: string, own: boolean): string {
  const quoted = sheetName.replace(/'/g, "''")
  return f
    .split(/("(?:[^"]|"")*")/)
    .map((part, i) => {
      if (i % 2 === 1) return part
      return part.replace(
        /(?<![A-Za-z0-9_$.])((?:'(?:[^']|'')+'|[A-Za-z_][A-Za-z0-9_.]*)!)?(\$?)([A-Z]{1,2})(\$?)(\d{1,3})(?::(\$?)([A-Z]{1,2})(\$?)(\d{1,3}))?(?![\d(A-Za-z])/g,
        (m, sq: string | undefined, d1, c1, d2, r1, d3, c2, d4, r2) => {
          const target = sq ? sq.slice(0, -1).replace(/^'|'$/g, '').replace(/''/g, "'") : null
          const applies = target ? target.toLowerCase() === sheetName.toLowerCase() : own
          if (!applies) return m
          const fix = (col: string, row: string, end: boolean) => {
            let c = colIdx(col)
            let r = Number(row) - 1
            if (axis === 'row') {
              const nr = moveIdx(r, at, delta)
              if (nr === null) {
                if (!r2) return null
                r = end ? at - 1 : at
              } else r = nr
            } else {
              const nc = moveIdx(c, at, delta)
              if (nc === null) {
                if (!c2) return null
                c = end ? at - 1 : at
              } else c = nc
            }
            return { c: Math.max(0, Math.min(NCOLS - 1, c)), r: Math.max(0, Math.min(NROWS - 1, r)) }
          }
          const a = fix(c1, r1, false)
          if (!a) return '#REF!'
          const pre = sq ? (target && /[^A-Za-z0-9_]/.test(target) ? `'${quoted}'!` : sq) : ''
          let out = `${pre}${d1}${colName(a.c)}${d2}${a.r + 1}`
          if (c2) {
            const b = fix(c2, r2, true)
            if (!b) return '#REF!'
            out += `:${d3}${colName(b.c)}${d4}${b.r + 1}`
          }
          return out
        },
      )
    })
    .join('')
}

/** shift a plain range string (tables, charts, CF, filters) */
export function adjustRange(range: string, axis: Axis, at: number, delta: number): string | null {
  const rg = parseRange(range)
  if (!rg) return range
  const lo = axis === 'row' ? rg.r1 : rg.c1
  const hi = axis === 'row' ? rg.r2 : rg.c2
  let nlo = moveIdx(lo, at, delta)
  let nhi = moveIdx(hi, at, delta)
  if (nlo === null && nhi === null) {
    // whole range deleted unless it spans beyond the deleted block
    if (lo >= at && hi < at - delta) return null
  }
  if (nlo === null) nlo = at
  if (nhi === null) nhi = at - 1
  if (nhi < nlo) return null
  const out = axis === 'row' ? { ...rg, r1: nlo, r2: nhi } : { ...rg, c1: nlo, c2: nhi }
  return rgName(out)
}

/** Insert (delta > 0) or delete (delta < 0) rows/columns at index `at` of sheet `si`. */
export function shiftSheets(sheets: XSheet[], si: number, axis: Axis, at: number, delta: number): XSheet[] {
  const name = sheets[si].name
  return sheets.map((s, i) => {
    const own = i === si
    const cells: Record<string, XCell> = {}
    for (const [ref, cell] of Object.entries(s.cells)) {
      const next = cell.f ? { ...cell, f: adjustFormula(cell.f, axis, at, delta, name, own) } : cell
      if (!own) {
        cells[ref] = next
        continue
      }
      const p = parseRef(ref)
      if (!p) continue
      const idx = axis === 'row' ? p.r : p.c
      const ni = moveIdx(idx, at, delta)
      if (ni === null || ni >= (axis === 'row' ? NROWS : NCOLS)) continue
      cells[axis === 'row' ? refName(p.c, ni) : refName(ni, p.r)] = next
    }
    if (!own) return { ...s, cells }
    const out: XSheet = { ...s, cells }
    const fixR = (r: string) => adjustRange(r, axis, at, delta)
    if (s.tables) out.tables = s.tables.map((t) => ({ ...t, range: fixR(t.range) ?? '' })).filter((t) => t.range)
    if (s.charts) out.charts = s.charts.map((c) => ({ ...c, range: fixR(c.range) ?? c.range }))
    if (s.cf) out.cf = s.cf.map((c) => ({ ...c, range: fixR(c.range) ?? '' })).filter((c) => c.range)
    if (s.autoFilter) out.autoFilter = fixR(s.autoFilter) ?? undefined
    if (s.comments)
      out.comments = s.comments
        .map((c) => {
          const p = parseRef(c.ref)
          if (!p) return null
          const ni = moveIdx(axis === 'row' ? p.r : p.c, at, delta)
          return ni === null ? null : { ...c, ref: axis === 'row' ? refName(p.c, ni) : refName(ni, p.r) }
        })
        .filter(Boolean) as XSheet['comments']
    if (axis === 'col' && s.colWidths) {
      const cw: Record<string, number> = {}
      for (const [k, w] of Object.entries(s.colWidths)) {
        const ni = moveIdx(colIdx(k), at, delta)
        if (ni !== null && ni < NCOLS) cw[COLS[ni]] = w
      }
      out.colWidths = cw
    }
    if (axis === 'row' && s.rowHeights) {
      const rh: Record<number, number> = {}
      for (const [k, h] of Object.entries(s.rowHeights)) {
        const ni = moveIdx(Number(k), at, delta)
        if (ni !== null && ni < NROWS) rh[ni] = h
      }
      out.rowHeights = rh
    }
    return out
  })
}

/** Does the first row of a region look like a header row? */
export function hasHeader(sheet: XSheet, rg: Rg, ev: Evaluator, si: number) {
  if (rg.r2 <= rg.r1) return false
  let textTop = 0
  let numBelow = 0
  for (let c = rg.c1; c <= rg.c2; c++) {
    const top = ev.value(si, c, rg.r1)
    if (typeof top === 'string') textTop++
    if (typeof ev.value(si, c, rg.r1 + 1) === 'number') numBelow++
    if (sheet.cells[refName(c, rg.r1)]?.bold) return true
  }
  return textTop === rg.c2 - rg.c1 + 1 && (numBelow > 0 || (sheet.tables ?? []).some((t) => parseRange(t.range)?.r1 === rg.r1))
}

const cmpVals = (a: Val, b: Val) => {
  const blankA = a === null || a === ''
  const blankB = b === null || b === ''
  if (blankA || blankB) return blankA === blankB ? 0 : blankA ? 1 : -1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  if (typeof a === 'number') return -1
  if (typeof b === 'number') return 1
  return String(a).localeCompare(String(b), 'en', { numeric: true, sensitivity: 'base' })
}

/** Sort the rows of `rg` (excluding a header row) by column `byCol`. Formulas are re-pointed to their new row. */
export function sortRange(sheet: XSheet, rg: Rg, byCol: number, desc: boolean, header: boolean, ev: Evaluator, si: number): XSheet {
  const top = header ? rg.r1 + 1 : rg.r1
  // keep a trailing "Total" row in place
  let bottom = rg.r2
  const last = ev.value(si, rg.c1, bottom)
  if (typeof last === 'string' && /^(grand )?total/i.test(last) && bottom > top) bottom--
  const rows: { r: number; key: Val }[] = []
  for (let r = top; r <= bottom; r++) rows.push({ r, key: ev.value(si, byCol, r) })
  rows.sort((a, b) => (desc ? -1 : 1) * cmpVals(a.key, b.key) || a.r - b.r)
  const cells = { ...sheet.cells }
  for (let c = rg.c1; c <= rg.c2; c++) for (let r = top; r <= bottom; r++) delete cells[refName(c, r)]
  rows.forEach(({ r: from }, i) => {
    const to = top + i
    for (let c = rg.c1; c <= rg.c2; c++) {
      const src = sheet.cells[refName(c, from)]
      if (!src) continue
      cells[refName(c, to)] = src.f ? { ...src, f: shiftFormula(src.f, 0, to - from) } : src
    }
  })
  return { ...sheet, cells }
}

/** Build a PivotTable sheet summarising `rg` of `src` grouped by column `byCol` (live SUMIF/COUNTIF formulas). */
export function buildPivot(src: Sheet, rg: Rg, byCol: number, ev: Evaluator, si: number, name: string): XSheet {
  const q = /[^A-Za-z0-9_]/.test(src.name) ? `'${src.name.replace(/'/g, "''")}'!` : `${src.name}!`
  const header = (c: number) => formatValue(ev.value(si, c, rg.r1)) || `Column ${COLS[c]}`
  const keys: string[] = []
  for (let r = rg.r1 + 1; r <= rg.r2; r++) {
    const v = ev.value(si, byCol, r)
    const k = v === null ? '' : formatValue(v)
    if (!k || /^(grand )?total/i.test(k)) continue
    if (!keys.includes(k)) keys.push(k)
  }
  keys.sort((a, b) => a.localeCompare(b))
  const numCols: number[] = []
  for (let c = rg.c1; c <= rg.c2; c++) {
    if (c === byCol) continue
    let n = 0
    for (let r = rg.r1 + 1; r <= rg.r2; r++) if (typeof ev.value(si, c, r) === 'number') n++
    if (n >= Math.max(1, (rg.r2 - rg.r1) / 2)) numCols.push(c)
  }
  const crit = `${q}$${COLS[byCol]}$${rg.r1 + 2}:$${COLS[byCol]}$${rg.r2 + 1}`
  const cells: Record<string, XCell> = {}
  cells.A1 = { v: `Source: ${src.name}!${rgName(rg)}`, italic: true, color: '#595959' }
  cells.A3 = { v: 'Row Labels', bold: true, fill: '#DDEBF7' }
  const vals = numCols.length ? numCols : [byCol]
  vals.forEach((c, i) => {
    cells[refName(i + 1, 2)] = { v: numCols.length ? `Sum of ${header(c)}` : `Count of ${header(c)}`, bold: true, fill: '#DDEBF7' }
  })
  keys.forEach((k, j) => {
    const r = 3 + j
    cells[refName(0, r)] = { v: k }
    vals.forEach((c, i) => {
      const fmt = src.cells[refName(c, rg.r1 + 1)]?.fmt
      cells[refName(i + 1, r)] = numCols.length
        ? { f: `=SUMIF(${crit},A${r + 1},${q}$${COLS[c]}$${rg.r1 + 2}:$${COLS[c]}$${rg.r2 + 1})`, ...(fmt ? { fmt } : {}) }
        : { f: `=COUNTIF(${crit},A${r + 1})` }
    })
  })
  const tr = 3 + keys.length
  cells[refName(0, tr)] = { v: 'Grand Total', bold: true, fill: '#DDEBF7' }
  vals.forEach((c, i) => {
    const fmt = src.cells[refName(c, rg.r1 + 1)]?.fmt
    cells[refName(i + 1, tr)] = { f: `=SUM(${refName(i + 1, 3)}:${refName(i + 1, Math.max(3, tr - 1))})`, bold: true, fill: '#DDEBF7', ...(fmt ? { fmt } : {}) }
  })
  const colWidths: Record<string, number> = { A: 190 }
  vals.forEach((_, i) => (colWidths[COLS[i + 1]] = 130))
  return { name, cells, colWidths, tabColor: '#107C41' }
}

/** Flash Fill: learn a simple transform from the first example in `col` (source = column left of it). */
export function flashFill(sheet: XSheet, col: number, ev: Evaluator, si: number): { cells: Record<string, XCell>; filled: number } | null {
  if (col === 0) return null
  const src = col - 1
  let exampleRow = -1
  for (let r = 0; r < NROWS; r++) {
    const s = ev.value(si, src, r)
    const e = sheet.cells[refName(col, r)]?.v
    if (typeof s === 'string' && s && typeof e === 'string' && e) {
      exampleRow = r
      break
    }
  }
  if (exampleRow < 0) return null
  const s0 = String(ev.value(si, src, exampleRow))
  const e0 = String(sheet.cells[refName(col, exampleRow)]!.v)
  const words = (s: string) => s.trim().split(/[\s,]+/).filter(Boolean)
  const candidates: ((s: string) => string)[] = [
    (s) => words(s)[0] ?? '',
    (s) => words(s).at(-1) ?? '',
    (s) => words(s)[1] ?? '',
    (s) => s.toUpperCase(),
    (s) => s.toLowerCase(),
    (s) => s.toLowerCase().replace(/(^|\s)\S/g, (m) => m.toUpperCase()),
    (s) => words(s).map((w) => w[0]).join('').toUpperCase(),
    (s) => (s.includes('@') ? s.split('@')[0] : ''),
    (s) => (s.includes('@') ? s.split('@')[1] : ''),
    (s) => s.replace(/\D/g, ''),
    (s) => `${words(s).at(-1) ?? ''}, ${words(s)[0] ?? ''}`,
  ]
  const fn = candidates.find((f) => f(s0) === e0 && e0 !== '')
  if (!fn) return null
  const cells = { ...sheet.cells }
  let filled = 0
  for (let r = exampleRow + 1; r < NROWS; r++) {
    const s = ev.value(si, src, r)
    if (s === null || s === '') break
    const ref = refName(col, r)
    if (cells[ref]?.v !== undefined || cells[ref]?.f) continue
    cells[ref] = { ...(cells[ref] ?? {}), v: fn(String(s)) }
    filled++
  }
  return { cells, filled }
}

/** Parse CSV / TSV text into rows. */
export function parseDelimited(text: string, delim?: string): string[][] {
  const d = delim ?? (text.includes('\t') ? '\t' : ',')
  const rows: string[][] = []
  let row: string[] = []
  let cur = ''
  let q = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (q) {
      if (ch === '"' && text[i + 1] === '"') {
        cur += '"'
        i++
      } else if (ch === '"') q = false
      else cur += ch
    } else if (ch === '"') q = true
    else if (ch === d) {
      row.push(cur)
      cur = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(cur)
      rows.push(row)
      row = []
      cur = ''
    } else cur += ch
  }
  if (cur || row.length) {
    row.push(cur)
    rows.push(row)
  }
  return rows.filter((r) => r.some((x) => x !== ''))
}

/** Workbook templates for the File ▸ New gallery. */
export function templateSheets(kind: string): { name: string; sheets: XSheet[] } {
  const hdr: XCell = { bold: true, fill: '#DDEBF7' }
  const put = (cells: Record<string, XCell>, ref: string, v: string | number, extra: XCell = {}) => {
    cells[ref] = typeof v === 'string' && v.startsWith('=') ? { f: v, ...extra } : { v, ...extra }
  }
  if (kind === 'Monthly budget') {
    const c: Record<string, XCell> = {}
    put(c, 'A1', 'Monthly budget', { bold: true, size: 18 })
    put(c, 'A3', 'Income', hdr)
    put(c, 'B3', 'Amount', hdr)
    ;[['Salary', 6200], ['Side projects', 850], ['Other', 120]].forEach(([l, v], i) => {
      put(c, `A${4 + i}`, l)
      put(c, `B${4 + i}`, v, { fmt: 'currency2' })
    })
    put(c, 'A7', 'Total income', { bold: true })
    put(c, 'B7', '=SUM(B4:B6)', { bold: true, fmt: 'currency2' })
    put(c, 'A9', 'Expenses', hdr)
    put(c, 'B9', 'Budget', hdr)
    put(c, 'C9', 'Actual', hdr)
    put(c, 'D9', 'Difference', hdr)
    ;[['Rent', 2100, 2100], ['Groceries', 650, 712], ['Utilities', 240, 221], ['Transport', 300, 268], ['Insurance', 180, 180], ['Entertainment', 250, 310], ['Savings', 1500, 1500]].forEach(([l, b, a], i) => {
      const r = 10 + i
      put(c, `A${r}`, l)
      put(c, `B${r}`, b, { fmt: 'currency2' })
      put(c, `C${r}`, a, { fmt: 'currency2' })
      put(c, `D${r}`, `=B${r}-C${r}`, { fmt: 'currency2' })
    })
    put(c, 'A17', 'Total expenses', { bold: true })
    put(c, 'B17', '=SUM(B10:B16)', { bold: true, fmt: 'currency2' })
    put(c, 'C17', '=SUM(C10:C16)', { bold: true, fmt: 'currency2' })
    put(c, 'D17', '=SUM(D10:D16)', { bold: true, fmt: 'currency2' })
    put(c, 'A19', 'Balance', { bold: true })
    put(c, 'B19', '=B7-C17', { bold: true, fmt: 'currency2', fill: '#E2EFDA' })
    return { name: 'Monthly budget', sheets: [{ name: 'Budget', cells: c, colWidths: { A: 160, B: 110, C: 110, D: 110 }, cf: [{ id: 'cf1', range: 'D10:D16', type: 'lt', value: 0, style: 'red' }] }] }
  }
  if (kind === 'Project tracker') {
    const c: Record<string, XCell> = {}
    ;['Task', 'Owner', 'Start', 'Due', 'Status', '% Done'].forEach((h, i) => put(c, `${COLS[i]}1`, h, hdr))
    const base = Math.floor(Date.now() / 86400000) + 25569
    ;[
      ['Kick-off meeting', 'Alex Morgan', 0, 1, 'Done', 1],
      ['Requirements sign-off', 'Priya Raman', 1, 6, 'Done', 1],
      ['Vendor shortlist', 'Lucas Moreau', 4, 12, 'In progress', 0.6],
      ['Pilot at Joliet DC', 'Ben Carter', 10, 24, 'In progress', 0.25],
      ['Training materials', 'Maya Johnson', 14, 28, 'Not started', 0],
      ['Go-live review', 'Alex Morgan', 30, 31, 'Not started', 0],
    ].forEach((row, i) => {
      const r = 2 + i
      put(c, `A${r}`, row[0] as string)
      put(c, `B${r}`, row[1] as string)
      put(c, `C${r}`, base + (row[2] as number), { fmt: 'date' })
      put(c, `D${r}`, base + (row[3] as number), { fmt: 'date' })
      put(c, `E${r}`, row[4] as string, { validation: { list: ['Not started', 'In progress', 'Done', 'Blocked'] } })
      put(c, `F${r}`, row[5] as number, { fmt: 'percent' })
    })
    put(c, 'A9', 'Overall', { bold: true })
    put(c, 'F9', '=AVERAGE(F2:F7)', { bold: true, fmt: 'percent' })
    return {
      name: 'Project tracker',
      sheets: [{ name: 'Tracker', cells: c, colWidths: { A: 180, B: 120, C: 86, D: 86, E: 100, F: 72 }, freezeRow: 1, tables: [{ range: 'A1:F7', style: 'TableStyleMedium2' }], cf: [{ id: 'cf1', range: 'F2:F7', type: 'dataBar', color: '#63BE7B' }] }],
    }
  }
  if (kind === 'Formula tutorial') {
    const c: Record<string, XCell> = {}
    put(c, 'A1', 'Formula tutorial', { bold: true, size: 18 })
    put(c, 'A2', 'Change the numbers in column B and watch the results update.', { italic: true, color: '#595959' })
    put(c, 'A4', 'Item', hdr)
    put(c, 'B4', 'Value', hdr)
    ;[['Apples', 50], ['Oranges', 20], ['Bananas', 60], ['Lemons', 40]].forEach(([l, v], i) => {
      put(c, `A${5 + i}`, l)
      put(c, `B${5 + i}`, v)
    })
    const ex: [string, string][] = [
      ['SUM', '=SUM(B5:B8)'],
      ['AVERAGE', '=AVERAGE(B5:B8)'],
      ['MAX', '=MAX(B5:B8)'],
      ['COUNTIF > 30', '=COUNTIF(B5:B8,">30")'],
      ['IF', '=IF(B5>B6,"More apples","More oranges")'],
      ['VLOOKUP Bananas', '=VLOOKUP("Bananas",A5:B8,2,FALSE)'],
      ['XLOOKUP Lemons', '=XLOOKUP("Lemons",A5:A8,B5:B8)'],
      ['CONCAT', '=CONCAT(A5," & ",A6)'],
    ]
    put(c, 'D4', 'Function', hdr)
    put(c, 'E4', 'Result', hdr)
    put(c, 'F4', 'Formula', hdr)
    ex.forEach(([l, f], i) => {
      put(c, `D${5 + i}`, l)
      put(c, `E${5 + i}`, f)
      c[`F${5 + i}`] = { v: f, color: '#595959', font: 'Consolas' }
    })
    return { name: 'Formula tutorial', sheets: [{ name: 'Tutorial', cells: c, colWidths: { A: 110, B: 70, C: 24, D: 130, E: 110, F: 260 } }] }
  }
  if (kind === 'Make your first PivotTable') {
    const c: Record<string, XCell> = {}
    ;['Region', 'Rep', 'Product', 'Units', 'Revenue'].forEach((h, i) => put(c, `${COLS[i]}1`, h, hdr))
    const regions = ['East', 'West', 'Central']
    const reps = ['Ben', 'Maya', 'Liam', 'Aisha']
    const prods = ['Fasteners', 'Packaging', 'Safety gear']
    for (let i = 0; i < 18; i++) {
      const r = 2 + i
      const units = 20 + ((i * 37) % 80)
      put(c, `A${r}`, regions[i % 3])
      put(c, `B${r}`, reps[i % 4])
      put(c, `C${r}`, prods[(i * 2) % 3])
      put(c, `D${r}`, units)
      put(c, `E${r}`, units * (18 + (i % 3) * 7), { fmt: 'currency' })
    }
    put(c, 'G1', 'Tip: select a cell in the Region column, then Insert ▸ PivotTable.', { italic: true, color: '#107C41' })
    return { name: 'PivotTable tutorial', sheets: [{ name: 'Sales', cells: c, colWidths: { A: 90, B: 80, C: 110, D: 70, E: 100 } }] }
  }
  // Welcome to Excel
  const c: Record<string, XCell> = {}
  put(c, 'A1', 'Welcome to Excel', { bold: true, size: 20, color: '#107C41' })
  ;[
    'Type in any cell and press Enter.',
    'Start a formula with = (try =SUM(B8:B10) in B11).',
    'Select cells and use Home ▸ AutoSum, Format as Table or Conditional Formatting.',
    'Right-click a row or column header to insert or delete.',
    'Insert ▸ Recommended Charts turns a selection into a chart.',
  ].forEach((t, i) => put(c, `A${3 + i}`, `${i + 1}. ${t}`))
  put(c, 'A8', 'Q1', { bold: true })
  put(c, 'B8', 120)
  put(c, 'A9', 'Q2', { bold: true })
  put(c, 'B9', 180)
  put(c, 'A10', 'Q3', { bold: true })
  put(c, 'B10', 150)
  return { name: 'Welcome to Excel', sheets: [{ name: 'Start', cells: c, colWidths: { A: 120 } }] }
}

/** TSV for the system clipboard */
export function toTSV(sheet: XSheet, rg: Rg, ev: Evaluator, si: number) {
  const lines: string[] = []
  for (let r = rg.r1; r <= rg.r2; r++) {
    const row: string[] = []
    for (let c = rg.c1; c <= rg.c2; c++) {
      const cell = sheet.cells[refName(c, r)]
      row.push(cell ? formatValue(ev.value(si, c, r), cell.fmt) : '')
    }
    lines.push(row.join('\t'))
  }
  return lines.join('\n')
}

/** Count everything for Review ▸ Workbook Statistics */
export function workbookStats(wb: XWorkbook) {
  let cells = 0
  let formulas = 0
  let tables = 0
  let charts = 0
  let comments = 0
  for (const s of wb.sheets) {
    for (const c of Object.values(s.cells)) {
      if (c.v !== undefined || c.f) cells++
      if (c.f) formulas++
    }
    tables += s.tables?.length ?? 0
    charts += s.charts?.length ?? 0
    comments += s.comments?.length ?? 0
  }
  return { sheets: wb.sheets.length, cells, formulas, tables, charts, comments, names: wb.names?.length ?? 0 }
}

export { currentRegion }
