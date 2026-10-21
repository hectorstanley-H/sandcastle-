/**
 * Tiny spreadsheet formula engine: arithmetic, comparison, &, cell refs, ranges, cross-sheet refs,
 * and the functions SUM, AVERAGE, MIN, MAX, COUNT, COUNTA, ROUND, ABS, IF, IFERROR, SUMIF, COUNTIF, AVERAGEIF.
 */
import type { Cell, CellFmt, Sheet } from './seed'

export const COLS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
export const NCOLS = 26
export const NROWS = 100

export type Val = number | string | boolean | { err: string } | null
type Arr = { range: Val[][] }
type Any = Val | Arr

export const isErr = (v: any): v is { err: string } => !!v && typeof v === 'object' && 'err' in v
const isArr = (v: any): v is Arr => !!v && typeof v === 'object' && 'range' in v

export const colIdx = (letters: string) => letters.split('').reduce((n, ch) => n * 26 + (ch.charCodeAt(0) - 64), 0) - 1
export const colName = (i: number) => COLS[i] ?? 'A'
export const refName = (c: number, r: number) => `${colName(c)}${r + 1}`

export function parseRef(ref: string): { c: number; r: number } | null {
  const m = /^\$?([A-Za-z]{1,2})\$?(\d{1,3})$/.exec(ref.trim())
  if (!m) return null
  const c = colIdx(m[1].toUpperCase())
  const r = Number(m[2]) - 1
  if (c < 0 || c >= NCOLS || r < 0 || r >= NROWS) return null
  return { c, r }
}

export function parseRange(s: string): { c1: number; r1: number; c2: number; r2: number } | null {
  const [a, b] = s.trim().toUpperCase().split(':')
  const p = parseRef(a)
  if (!p) return null
  const q = b ? parseRef(b) : p
  if (!q) return null
  return { c1: Math.min(p.c, q.c), r1: Math.min(p.r, q.r), c2: Math.max(p.c, q.c), r2: Math.max(p.r, q.r) }
}

/* ───────── tokenizer ───────── */
type Tok =
  | { t: 'num'; v: number }
  | { t: 'str'; v: string }
  | { t: 'ref'; sheet?: string; a: string; b?: string } // b set for ranges; a/b may be column-only ("B")
  | { t: 'fn'; v: string }
  | { t: 'op'; v: string }
  | { t: 'bool'; v: boolean }

function tokenize(src: string): Tok[] {
  const out: Tok[] = []
  let i = 0
  const s = src
  while (i < s.length) {
    const ch = s[i]
    if (ch === ' ') {
      i++
      continue
    }
    if (ch === '"') {
      let j = i + 1
      let str = ''
      while (j < s.length) {
        if (s[j] === '"' && s[j + 1] === '"') {
          str += '"'
          j += 2
        } else if (s[j] === '"') break
        else str += s[j++]
      }
      out.push({ t: 'str', v: str })
      i = j + 1
      continue
    }
    if (/[0-9.]/.test(ch)) {
      const m = /^\d*\.?\d+(?:[eE][+-]?\d+)?/.exec(s.slice(i))!
      out.push({ t: 'num', v: Number(m[0]) })
      i += m[0].length
      continue
    }
    // sheet-qualified or plain reference / function / bool
    let sheet: string | undefined
    let rest = s.slice(i)
    let consumed = 0
    const q = /^'((?:[^']|'')+)'!/.exec(rest) || /^([A-Za-z_][A-Za-z0-9_ .]*?)!/.exec(rest)
    if (q) {
      sheet = q[1].replace(/''/g, "'")
      consumed = q[0].length
      rest = rest.slice(consumed)
    }
    const rng = /^(\$?[A-Za-z]{1,2}\$?\d{1,3}|\$?[A-Za-z]{1,2})(?::(\$?[A-Za-z]{1,2}\$?\d{1,3}|\$?[A-Za-z]{1,2}))?/.exec(rest)
    const fn = /^([A-Za-z][A-Za-z0-9.]*)\s*\(/.exec(rest)
    if (!sheet && fn) {
      out.push({ t: 'fn', v: fn[1].toUpperCase() })
      i += fn[0].length - 1 // leave "(" for the parser
      continue
    }
    if (!sheet && /^(TRUE|FALSE)\b/i.test(rest)) {
      const v = rest.slice(0, 4).toUpperCase() === 'TRUE'
      out.push({ t: 'bool', v })
      i += v ? 4 : 5
      continue
    }
    if (rng && (rng[2] || /\d/.test(rng[1]))) {
      out.push({ t: 'ref', sheet, a: rng[1].replace(/\$/g, '').toUpperCase(), b: rng[2]?.replace(/\$/g, '').toUpperCase() })
      i += consumed + rng[0].length
      continue
    }
    const two = s.slice(i, i + 2)
    if (two === '<>' || two === '<=' || two === '>=') {
      out.push({ t: 'op', v: two })
      i += 2
      continue
    }
    if ('+-*/^&=<>(),%:'.includes(ch)) {
      out.push({ t: 'op', v: ch })
      i++
      continue
    }
    throw new Error('#NAME?')
  }
  return out
}

/* ───────── evaluator ───────── */
export class Evaluator {
  private cache = new Map<string, Val>()
  private stack = new Set<string>()
  private sheets: Sheet[]
  constructor(sheets: Sheet[]) {
    this.sheets = sheets
  }

  private sheetIdx(name?: string, cur = 0) {
    if (!name) return cur
    const i = this.sheets.findIndex((s) => s.name.toLowerCase() === name.toLowerCase())
    return i
  }

  value(si: number, c: number, r: number): Val {
    const key = `${si}:${c}:${r}`
    if (this.cache.has(key)) return this.cache.get(key)!
    const cell = this.sheets[si]?.cells[refName(c, r)]
    let v: Val
    if (!cell) v = null
    else if (cell.f) {
      if (this.stack.has(key)) return { err: '#CIRC!' }
      this.stack.add(key)
      try {
        v = this.evalFormula(cell.f, si)
      } catch (e: any) {
        const m = String(e?.message ?? '')
        v = { err: m.startsWith('#') ? m : '#VALUE!' }
      }
      this.stack.delete(key)
    } else v = cell.v ?? null
    this.cache.set(key, v)
    return v
  }

  evalFormula(f: string, si: number): Val {
    const toks = tokenize(f.replace(/^=/, ''))
    let p = 0
    const peek = () => toks[p]
    const isOp = (v: string) => {
      const t = toks[p]
      return t && t.t === 'op' && t.v === v
    }
    const expect = (v: string) => {
      if (!isOp(v)) throw new Error('#VALUE!')
      p++
    }

    const rangeOf = (tok: Extract<Tok, { t: 'ref' }>): Arr | Val => {
      const s = this.sheetIdx(tok.sheet, si)
      if (s < 0) return { err: '#REF!' }
      const pa = parseRef(tok.a)
      if (!tok.b) {
        if (!pa) return { err: '#REF!' }
        return this.value(s, pa.c, pa.r)
      }
      let c1, r1, c2, r2
      if (/^\D+$/.test(tok.a) && /^\D+$/.test(tok.b)) {
        c1 = colIdx(tok.a)
        c2 = colIdx(tok.b)
        r1 = 0
        r2 = NROWS - 1
      } else {
        const pb = parseRef(tok.b)
        if (!pa || !pb) return { err: '#REF!' }
        ;[c1, r1, c2, r2] = [Math.min(pa.c, pb.c), Math.min(pa.r, pb.r), Math.max(pa.c, pb.c), Math.max(pa.r, pb.r)]
      }
      const rows: Val[][] = []
      for (let r = r1; r <= r2; r++) {
        const row: Val[] = []
        for (let c = c1; c <= c2; c++) row.push(this.value(s, c, r))
        rows.push(row)
      }
      return { range: rows }
    }

    const primary = (): Any => {
      const t = peek()
      if (!t) throw new Error('#VALUE!')
      p++
      if (t.t === 'num') return t.v
      if (t.t === 'str') return t.v
      if (t.t === 'bool') return t.v
      if (t.t === 'ref') return rangeOf(t)
      if (t.t === 'fn') {
        expect('(')
        const args: Any[] = []
        if (!isOp(')')) {
          args.push(comparison())
          while (isOp(',')) {
            p++
            args.push(comparison())
          }
        }
        expect(')')
        return callFn(t.v, args)
      }
      if (t.t === 'op' && t.v === '(') {
        const v = comparison()
        expect(')')
        return v
      }
      if (t.t === 'op' && t.v === '-') return -num(postfix())
      if (t.t === 'op' && t.v === '+') return num(postfix())
      throw new Error('#VALUE!')
    }
    const postfix = (): Any => {
      let v = primary()
      while (isOp('%')) {
        p++
        v = num(v) / 100
      }
      return v
    }
    const power = (): Any => {
      let v = postfix()
      while (isOp('^')) {
        p++
        v = Math.pow(num(v), num(postfix()))
      }
      return v
    }
    const mul = (): Any => {
      let v = power()
      while (isOp('*') || isOp('/')) {
        const op = (toks[p++] as any).v
        const r = num(power())
        if (op === '/' && r === 0) throw new Error('#DIV/0!')
        v = op === '*' ? num(v) * r : num(v) / r
      }
      return v
    }
    const add = (): Any => {
      let v = mul()
      while (isOp('+') || isOp('-')) {
        const op = (toks[p++] as any).v
        const r = num(mul())
        v = op === '+' ? num(v) + r : num(v) - r
      }
      return v
    }
    const concat = (): Any => {
      let v = add()
      while (isOp('&')) {
        p++
        v = str(v) + str(add())
      }
      return v
    }
    const comparison = (): Any => {
      let v = concat()
      while (['=', '<>', '<', '>', '<=', '>='].some((o) => isOp(o))) {
        const op = (toks[p++] as any).v
        const r = scalar(concat())
        v = compare(scalar(v), r, op)
      }
      return v
    }

    const result = comparison()
    if (p < toks.length) throw new Error('#VALUE!')
    const s = scalar(result)
    return s
  }
}

/* ───────── helpers ───────── */
function scalar(v: Any): Val {
  if (isArr(v)) return v.range[0]?.[0] ?? null
  return v
}
function num(v: Any): number {
  const s = scalar(v)
  if (isErr(s)) throw new Error(s.err)
  if (s === null || s === '') return 0
  if (typeof s === 'boolean') return s ? 1 : 0
  if (typeof s === 'number') return s
  const n = Number(String(s).replace(/[$,]/g, ''))
  if (Number.isNaN(n)) throw new Error('#VALUE!')
  return n
}
function str(v: Any): string {
  const s = scalar(v)
  if (isErr(s)) throw new Error(s.err)
  if (s === null) return ''
  if (typeof s === 'boolean') return s ? 'TRUE' : 'FALSE'
  return String(s)
}
function flat(args: Any[]): Val[] {
  const out: Val[] = []
  for (const a of args) {
    if (isArr(a)) for (const row of a.range) out.push(...row)
    else out.push(a)
  }
  return out
}
function nums(args: Any[]): number[] {
  const out: number[] = []
  for (const a of args) {
    if (isArr(a)) {
      for (const row of a.range)
        for (const v of row) {
          if (isErr(v)) throw new Error(v.err)
          if (typeof v === 'number') out.push(v)
        }
    } else out.push(num(a))
  }
  return out
}
function compare(a: Val, b: Val, op: string): boolean {
  const na = typeof a === 'number' || a === null ? (a ?? 0) : a
  const nb = typeof b === 'number' || b === null ? (b ?? 0) : b
  let cmp: number
  if (typeof na === 'number' && typeof nb === 'number') cmp = na - nb
  else cmp = String(na).toLowerCase().localeCompare(String(nb).toLowerCase())
  switch (op) {
    case '=':
      return cmp === 0
    case '<>':
      return cmp !== 0
    case '<':
      return cmp < 0
    case '>':
      return cmp > 0
    case '<=':
      return cmp <= 0
    default:
      return cmp >= 0
  }
}
function criteria(crit: Val): (v: Val) => boolean {
  const c = crit === null ? '' : String(crit)
  const m = /^(<>|<=|>=|=|<|>)?(.*)$/.exec(c)!
  const op = m[1] ?? '='
  const raw = m[2]
  const target: Val = raw !== '' && !Number.isNaN(Number(raw)) ? Number(raw) : raw
  return (v) => compare(v, target, op)
}

function callFn(name: string, args: Any[]): Val {
  switch (name) {
    case 'SUM':
      return nums(args).reduce((s, n) => s + n, 0)
    case 'AVERAGE': {
      const n = nums(args)
      if (!n.length) throw new Error('#DIV/0!')
      return n.reduce((s, x) => s + x, 0) / n.length
    }
    case 'MIN':
      return nums(args).length ? Math.min(...nums(args)) : 0
    case 'MAX':
      return nums(args).length ? Math.max(...nums(args)) : 0
    case 'COUNT':
      return flat(args).filter((v) => typeof v === 'number').length
    case 'COUNTA':
      return flat(args).filter((v) => v !== null && v !== '').length
    case 'ROUND': {
      const d = args[1] !== undefined ? num(args[1]) : 0
      const f = Math.pow(10, d)
      return Math.round(num(args[0]) * f) / f
    }
    case 'ABS':
      return Math.abs(num(args[0]))
    case 'IF': {
      const c = scalar(args[0])
      const truthy = typeof c === 'string' ? c.length > 0 : !!c
      return truthy ? scalar(args[1] ?? true) : scalar(args[2] ?? false)
    }
    case 'IFERROR': {
      const v = scalar(args[0])
      return isErr(v) ? scalar(args[1]) : v
    }
    case 'SUMIF':
    case 'COUNTIF':
    case 'AVERAGEIF': {
      const rng = args[0]
      const test = criteria(scalar(args[1]))
      const sumR = args[2] ?? args[0]
      if (!isArr(rng)) return name === 'COUNTIF' ? (test(scalar(rng)) ? 1 : 0) : 0
      const a = rng.range.flat()
      const b = isArr(sumR) ? sumR.range.flat() : a
      let s = 0
      let n = 0
      a.forEach((v, i) => {
        if (test(v)) {
          n++
          const x = b[i]
          if (typeof x === 'number') s += x
        }
      })
      if (name === 'COUNTIF') return n
      if (name === 'AVERAGEIF') {
        if (!n) throw new Error('#DIV/0!')
        return s / n
      }
      return s
    }
    case 'TODAY':
      return Math.floor(Date.now() / 86400000) + 25569
    default:
      throw new Error('#NAME?')
  }
}

/* ───────── formatting ───────── */
export function formatValue(v: Val, fmt?: CellFmt): string {
  if (v === null || v === undefined) return ''
  if (isErr(v)) return v.err
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE'
  if (typeof v === 'string') return v
  if (!Number.isFinite(v)) return '#NUM!'
  switch (fmt) {
    case 'currency':
      return (v < 0 ? '-$' : '$') + Math.abs(Math.round(v)).toLocaleString('en-US')
    case 'currency2':
      return (v < 0 ? '-$' : '$') + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    case 'percent':
      return (v * 100).toFixed(1) + '%'
    case 'number':
      return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    case 'int':
      return Math.round(v).toLocaleString('en-US')
    default: {
      if (Number.isInteger(v)) return String(v)
      const s = Number(v.toPrecision(10)).toString()
      return s.length > 11 ? v.toFixed(Math.max(0, 9 - String(Math.trunc(v)).length)) : s
    }
  }
}

/** Shift relative references in a formula by (dc, dr) — used by Fill Down / Fill Right / paste. */
export function shiftFormula(f: string, dc: number, dr: number): string {
  // split out string literals so we never touch their contents
  return f
    .split(/("(?:[^"]|"")*")/)
    .map((part, i) => {
      if (i % 2 === 1) return part
      return part.replace(/(?<![A-Za-z0-9_])(\$?)([A-Z]{1,2})(\$?)(\d{1,3})(?![\d(A-Za-z])/g, (_m, dcol, col, drow, row) => {
        const c = dcol ? col : colName(Math.max(0, Math.min(NCOLS - 1, colIdx(col) + dc)))
        const r = drow ? row : String(Math.max(1, Number(row) + dr))
        return `${dcol}${c}${drow}${r}`
      })
    })
    .join('')
}

/** parse what the user typed into a cell */
export function parseInput(raw: string, prev?: Cell): Cell {
  const keep: Cell = { ...(prev ?? {}) }
  delete keep.v
  delete keep.f
  const s = raw
  if (s.startsWith('=') && s.length > 1) return { ...keep, f: normalizeFormula(s.trim()) }
  if (s.trim() === '') return keep
  const t = s.trim()
  const pct = /^-?\d+(\.\d+)?%$/.test(t)
  if (pct) return { ...keep, v: Number(t.slice(0, -1)) / 100, fmt: keep.fmt ?? 'percent' }
  const cur = /^-?\$[\d,]+(\.\d+)?$/.test(t)
  if (cur) return { ...keep, v: Number(t.replace(/[$,]/g, '')), fmt: keep.fmt ?? 'currency' }
  if (/^-?[\d,]*\.?\d+$/.test(t) && !/^0\d/.test(t)) return { ...keep, v: Number(t.replace(/,/g, '')) }
  return { ...keep, v: s }
}

/** upper-case everything outside string literals (Excel shows functions & refs upper-case) */
function normalizeFormula(s: string) {
  return s
    .split(/("(?:[^"]|"")*"|'(?:[^']|'')*')/)
    .map((part, i) => (i % 2 === 1 ? part : part.toUpperCase()))
    .join('')
}

/** contiguous non-empty block around (c,r) — Excel's "current region" */
export function currentRegion(sheet: Sheet, c: number, r: number) {
  const has = (cc: number, rr: number) => {
    const x = sheet.cells[refName(cc, rr)]
    return !!x && (x.v !== undefined && x.v !== '' ? true : !!x.f)
  }
  let c1 = c,
    c2 = c,
    r1 = r,
    r2 = r
  let grew = true
  while (grew) {
    grew = false
    const rowHas = (rr: number) => {
      for (let cc = Math.max(0, c1 - 1); cc <= Math.min(NCOLS - 1, c2 + 1); cc++) if (has(cc, rr)) return true
      return false
    }
    const colHas = (cc: number) => {
      for (let rr = Math.max(0, r1 - 1); rr <= Math.min(NROWS - 1, r2 + 1); rr++) if (has(cc, rr)) return true
      return false
    }
    if (r1 > 0 && rowHas(r1 - 1)) (r1--, (grew = true))
    if (r2 < NROWS - 1 && rowHas(r2 + 1)) (r2++, (grew = true))
    if (c1 > 0 && colHas(c1 - 1)) (c1--, (grew = true))
    if (c2 < NCOLS - 1 && colHas(c2 + 1)) (c2++, (grew = true))
  }
  return { c1, r1, c2, r2 }
}
