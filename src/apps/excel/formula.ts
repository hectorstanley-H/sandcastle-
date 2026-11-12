/**
 * Tiny spreadsheet formula engine: arithmetic, comparison, &, cell refs, ranges, cross-sheet refs,
 * and the functions SUM, AVERAGE, MIN, MAX, COUNT, COUNTA, ROUND, ABS, IF, IFERROR, SUMIF, COUNTIF, AVERAGEIF,
 * plus an extended library (lookup, text, logical, date, financial, statistical — see FUNCTIONS) and defined names.
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
  | { t: 'name'; v: string }

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
    const ident = !sheet ? /^[A-Za-z_][A-Za-z0-9_.]*/.exec(rest) : null
    if (rng && (rng[2] || /\d/.test(rng[1])) && (!ident || rng[0].length >= ident[0].length)) {
      out.push({ t: 'ref', sheet, a: rng[1].replace(/\$/g, '').toUpperCase(), b: rng[2]?.replace(/\$/g, '').toUpperCase() })
      i += consumed + rng[0].length
      continue
    }
    if (ident) {
      // defined name (Name Manager)
      out.push({ t: 'name', v: ident[0].toUpperCase() })
      i += ident[0].length
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
  private names: Record<string, string>
  constructor(sheets: Sheet[], names?: { name: string; ref: string }[]) {
    this.sheets = sheets
    this.names = Object.fromEntries((names ?? []).map((n) => [n.name.toUpperCase(), n.ref]))
  }

  /** resolve a defined name to the sheet-qualified range it refers to */
  nameRef(name: string): string | undefined {
    return this.names[name.toUpperCase()]
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
      if (t.t === 'name') {
        const ref = this.names[t.v]
        if (!ref) throw new Error('#NAME?')
        const inner = tokenize(ref.replace(/^=/, ''))
        if (inner.length !== 1 || inner[0].t !== 'ref') throw new Error('#REF!')
        return rangeOf(inner[0])
      }
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
    default: {
      const v = moreFn(name, args)
      if (v === undefined) throw new Error('#NAME?')
      return v
    }
  }
}

/* ───────── extended function library ───────── */
const serialToDate = (n: number) => new Date(Math.round((n - 25569) * 86400000))
const dateToSerial = (d: Date) => Math.floor(d.getTime() / 86400000) + 25569
const arr2 = (a: Any): Val[][] => (isArr(a) ? a.range : [[scalar(a)]])
const truthy = (v: Val) => (typeof v === 'string' ? v.toUpperCase() === 'TRUE' || (v.length > 0 && v.toUpperCase() !== 'FALSE') : !!v)
const eqVal = (a: Val, b: Val) => compare(a, b, '=')

/** functions beyond the core set; returns undefined for unknown names */
function moreFn(name: string, args: Any[]): Val | undefined {
  switch (name) {
    /* math */
    case 'PRODUCT':
      return nums(args).reduce((s, n) => s * n, 1)
    case 'MEDIAN': {
      const n = nums(args).sort((a, b) => a - b)
      if (!n.length) throw new Error('#NUM!')
      const m = Math.floor(n.length / 2)
      return n.length % 2 ? n[m] : (n[m - 1] + n[m]) / 2
    }
    case 'ROUNDUP':
    case 'ROUNDDOWN': {
      const d = args[1] !== undefined ? num(args[1]) : 0
      const f = Math.pow(10, d)
      const x = num(args[0]) * f
      return (name === 'ROUNDUP' ? Math.sign(x) * Math.ceil(Math.abs(x)) : Math.sign(x) * Math.floor(Math.abs(x))) / f
    }
    case 'INT':
      return Math.floor(num(args[0]))
    case 'MOD': {
      const d = num(args[1])
      if (d === 0) throw new Error('#DIV/0!')
      const n = num(args[0])
      return n - d * Math.floor(n / d)
    }
    case 'POWER':
      return Math.pow(num(args[0]), num(args[1]))
    case 'SQRT': {
      const n = num(args[0])
      if (n < 0) throw new Error('#NUM!')
      return Math.sqrt(n)
    }
    case 'PI':
      return Math.PI
    case 'RAND':
      return Math.random()
    case 'RANDBETWEEN': {
      const lo = Math.ceil(num(args[0]))
      const hi = Math.floor(num(args[1]))
      return lo + Math.floor(Math.random() * (hi - lo + 1))
    }
    case 'SUMPRODUCT': {
      const as = args.map((a) => arr2(a).flat())
      const len = as[0]?.length ?? 0
      let s = 0
      for (let i = 0; i < len; i++) s += as.reduce((p, a) => p * (typeof a[i] === 'number' ? (a[i] as number) : 0), 1)
      return s
    }
    case 'COUNTBLANK':
      return flat(args).filter((v) => v === null || v === '').length
    case 'LARGE':
    case 'SMALL': {
      const n = nums([args[0]]).sort((a, b) => (name === 'LARGE' ? b - a : a - b))
      const k = num(args[1])
      if (k < 1 || k > n.length) throw new Error('#NUM!')
      return n[k - 1]
    }
    case 'RANK':
    case 'RANK.EQ': {
      const x = num(args[0])
      const n = nums([args[1]])
      const asc = args[2] !== undefined && num(args[2]) !== 0
      return n.filter((v) => (asc ? v < x : v > x)).length + 1
    }
    case 'SUMIFS':
    case 'COUNTIFS':
    case 'AVERAGEIFS': {
      const hasSum = name !== 'COUNTIFS'
      const sumR = hasSum ? arr2(args[0]).flat() : null
      const pairs: [Val[], (v: Val) => boolean][] = []
      for (let i = hasSum ? 1 : 0; i + 1 < args.length; i += 2) pairs.push([arr2(args[i]).flat(), criteria(scalar(args[i + 1]))])
      const len = (sumR ?? pairs[0]?.[0] ?? []).length
      let s = 0
      let n = 0
      for (let i = 0; i < len; i++) {
        if (!pairs.every(([r, t]) => t(r[i] ?? null))) continue
        n++
        const x = sumR?.[i]
        if (typeof x === 'number') s += x
      }
      if (name === 'COUNTIFS') return n
      if (name === 'AVERAGEIFS') {
        if (!n) throw new Error('#DIV/0!')
        return s / n
      }
      return s
    }
    /* logical */
    case 'AND':
      return flat(args).every((v) => truthy(v))
    case 'OR':
      return flat(args).some((v) => truthy(v))
    case 'NOT':
      return !truthy(scalar(args[0]))
    case 'XOR':
      return flat(args).filter((v) => truthy(v)).length % 2 === 1
    case 'IFS': {
      for (let i = 0; i + 1 < args.length; i += 2) if (truthy(scalar(args[i]))) return scalar(args[i + 1])
      throw new Error('#N/A')
    }
    case 'IFNA': {
      const v = scalar(args[0])
      return isErr(v) && v.err === '#N/A' ? scalar(args[1]) : v
    }
    case 'ISBLANK': {
      const v = scalar(args[0])
      return v === null || v === ''
    }
    case 'ISNUMBER':
      return typeof scalar(args[0]) === 'number'
    case 'ISTEXT':
      return typeof scalar(args[0]) === 'string'
    case 'ISERROR':
      return isErr(scalar(args[0]))
    /* text */
    case 'CONCAT':
    case 'CONCATENATE':
      return flat(args).map((v) => str(v)).join('')
    case 'TEXTJOIN': {
      const sep = str(args[0])
      const skip = truthy(scalar(args[1]))
      return flat(args.slice(2))
        .filter((v) => !skip || (v !== null && v !== ''))
        .map((v) => str(v))
        .join(sep)
    }
    case 'LEFT':
      return str(args[0]).slice(0, args[1] !== undefined ? num(args[1]) : 1)
    case 'RIGHT': {
      const s = str(args[0])
      const n = args[1] !== undefined ? num(args[1]) : 1
      return n <= 0 ? '' : s.slice(-n)
    }
    case 'MID':
      return str(args[0]).substr(Math.max(0, num(args[1]) - 1), num(args[2]))
    case 'LEN':
      return str(args[0]).length
    case 'UPPER':
      return str(args[0]).toUpperCase()
    case 'LOWER':
      return str(args[0]).toLowerCase()
    case 'PROPER':
      return str(args[0]).toLowerCase().replace(/(^|[^a-z])([a-z])/g, (_m, a, b) => a + b.toUpperCase())
    case 'TRIM':
      return str(args[0]).trim().replace(/\s+/g, ' ')
    case 'SUBSTITUTE':
      return str(args[0]).split(str(args[1])).join(str(args[2]))
    case 'REPT':
      return str(args[0]).repeat(Math.max(0, num(args[1])))
    case 'FIND':
    case 'SEARCH': {
      const hay = name === 'SEARCH' ? str(args[1]).toLowerCase() : str(args[1])
      const needle = name === 'SEARCH' ? str(args[0]).toLowerCase() : str(args[0])
      const at = hay.indexOf(needle, args[2] !== undefined ? num(args[2]) - 1 : 0)
      if (at < 0) throw new Error('#VALUE!')
      return at + 1
    }
    case 'VALUE':
      return num(args[0])
    case 'TEXT': {
      const v = num(args[0])
      const f = str(args[1])
      if (/%/.test(f)) return (v * 100).toFixed((f.split('.')[1] ?? '').replace(/[^0]/g, '').length) + '%'
      if (/[dmy]/i.test(f)) return formatValue(v, 'date')
      const dec = (f.split('.')[1] ?? '').replace(/[^0#]/g, '').length
      const s = Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec, useGrouping: f.includes(',') })
      return (v < 0 ? '-' : '') + (f.includes('$') ? '$' : '') + s
    }
    /* date & time */
    case 'NOW':
      return Date.now() / 86400000 + 25569 - new Date().getTimezoneOffset() / 1440
    case 'DATE':
      return dateToSerial(new Date(Date.UTC(num(args[0]), num(args[1]) - 1, num(args[2]))))
    case 'YEAR':
      return serialToDate(num(args[0])).getUTCFullYear()
    case 'MONTH':
      return serialToDate(num(args[0])).getUTCMonth() + 1
    case 'DAY':
      return serialToDate(num(args[0])).getUTCDate()
    case 'WEEKDAY':
      return serialToDate(num(args[0])).getUTCDay() + 1
    case 'EOMONTH': {
      const d = serialToDate(num(args[0]))
      return dateToSerial(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + num(args[1]) + 1, 0)))
    }
    case 'EDATE': {
      const d = serialToDate(num(args[0]))
      return dateToSerial(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + num(args[1]), d.getUTCDate())))
    }
    case 'DAYS':
      return Math.round(num(args[0]) - num(args[1]))
    case 'NETWORKDAYS': {
      let a = Math.round(num(args[0]))
      const b = Math.round(num(args[1]))
      const step = a <= b ? 1 : -1
      let n = 0
      for (; step > 0 ? a <= b : a >= b; a += step) {
        const wd = serialToDate(a).getUTCDay()
        if (wd !== 0 && wd !== 6) n++
      }
      return n * step
    }
    /* lookup & reference */
    case 'VLOOKUP':
    case 'HLOOKUP': {
      const key = scalar(args[0])
      const tbl = arr2(args[1])
      const idx = num(args[2]) - 1
      const exact = args[3] !== undefined && !truthy(scalar(args[3]))
      const rows = name === 'VLOOKUP' ? tbl : tbl[0]?.map((_, c) => tbl.map((r) => r[c])) ?? []
      let hit = -1
      if (exact) hit = rows.findIndex((r) => eqVal(r[0], key))
      else
        rows.forEach((r, i) => {
          if (r[0] !== null && compare(r[0], key, '<=')) hit = i
        })
      if (hit < 0 || idx < 0) throw new Error('#N/A')
      if (idx >= (rows[hit]?.length ?? 0)) throw new Error('#REF!')
      return rows[hit][idx]
    }
    case 'XLOOKUP': {
      const key = scalar(args[0])
      const look = arr2(args[1]).flat()
      const ret = arr2(args[2]).flat()
      const i = look.findIndex((v) => eqVal(v, key))
      if (i < 0) {
        if (args[3] !== undefined) return scalar(args[3])
        throw new Error('#N/A')
      }
      return ret[i] ?? null
    }
    case 'MATCH': {
      const key = scalar(args[0])
      const look = arr2(args[1]).flat()
      const mode = args[2] !== undefined ? num(args[2]) : 1
      if (mode === 0) {
        const i = look.findIndex((v) => eqVal(v, key))
        if (i < 0) throw new Error('#N/A')
        return i + 1
      }
      let hit = -1
      look.forEach((v, i) => {
        if (v !== null && compare(v, key, mode > 0 ? '<=' : '>=')) hit = i
      })
      if (hit < 0) throw new Error('#N/A')
      return hit + 1
    }
    case 'INDEX': {
      const tbl = arr2(args[0])
      let r = args[1] !== undefined ? num(args[1]) : 1
      let c = args[2] !== undefined ? num(args[2]) : 1
      if (tbl.length === 1 && args[2] === undefined) {
        c = r
        r = 1
      }
      const v = tbl[r - 1]?.[c - 1]
      if (v === undefined) throw new Error('#REF!')
      return v
    }
    case 'CHOOSE': {
      const i = num(args[0])
      if (i < 1 || i >= args.length) throw new Error('#VALUE!')
      return scalar(args[i])
    }
    case 'ROWS':
      return arr2(args[0]).length
    case 'COLUMNS':
      return arr2(args[0])[0]?.length ?? 0
    /* financial */
    case 'PMT':
    case 'PV':
    case 'FV': {
      const rate = num(args[0])
      const nper = num(args[1])
      const third = num(args[2])
      const fourth = args[3] !== undefined ? num(args[3]) : 0
      const type = args[4] !== undefined ? num(args[4]) : 0
      if (name === 'PMT') {
        const pv = third
        const fv = fourth
        if (rate === 0) return -(pv + fv) / nper
        const f = Math.pow(1 + rate, nper)
        return (-(pv * f + fv) * rate) / ((1 + rate * type) * (f - 1))
      }
      if (name === 'FV') {
        const pmt = third
        const pv = fourth
        if (rate === 0) return -(pv + pmt * nper)
        const f = Math.pow(1 + rate, nper)
        return -(pv * f + (pmt * (1 + rate * type) * (f - 1)) / rate)
      }
      const pmt = third
      const fv = fourth
      if (rate === 0) return -(fv + pmt * nper)
      const f = Math.pow(1 + rate, nper)
      return -(fv + (pmt * (1 + rate * type) * (f - 1)) / rate) / f
    }
    case 'NPV': {
      const rate = num(args[0])
      return nums(args.slice(1)).reduce((s, v, i) => s + v / Math.pow(1 + rate, i + 1), 0)
    }
    case 'STDEV':
    case 'STDEV.S':
    case 'VAR':
    case 'VAR.S': {
      const n = nums(args)
      if (n.length < 2) throw new Error('#DIV/0!')
      const m = n.reduce((s, x) => s + x, 0) / n.length
      const v = n.reduce((s, x) => s + (x - m) ** 2, 0) / (n.length - 1)
      return name.startsWith('VAR') ? v : Math.sqrt(v)
    }
    default:
      return undefined
  }
}

/** Function catalogue used by Insert Function and the Formulas ribbon. */
export const FUNCTIONS: { name: string; cat: 'Financial' | 'Logical' | 'Text' | 'Date & Time' | 'Lookup & Reference' | 'Math & Trig' | 'Statistical'; syntax: string; desc: string }[] = [
  { name: 'SUM', cat: 'Math & Trig', syntax: 'SUM(number1, [number2], ...)', desc: 'Adds all the numbers in a range of cells.' },
  { name: 'SUMIF', cat: 'Math & Trig', syntax: 'SUMIF(range, criteria, [sum_range])', desc: 'Adds the cells specified by a given condition or criteria.' },
  { name: 'SUMIFS', cat: 'Math & Trig', syntax: 'SUMIFS(sum_range, criteria_range1, criteria1, ...)', desc: 'Adds the cells specified by a given set of conditions or criteria.' },
  { name: 'SUMPRODUCT', cat: 'Math & Trig', syntax: 'SUMPRODUCT(array1, [array2], ...)', desc: 'Returns the sum of the products of corresponding ranges or arrays.' },
  { name: 'ROUND', cat: 'Math & Trig', syntax: 'ROUND(number, num_digits)', desc: 'Rounds a number to a specified number of digits.' },
  { name: 'ROUNDUP', cat: 'Math & Trig', syntax: 'ROUNDUP(number, num_digits)', desc: 'Rounds a number up, away from zero.' },
  { name: 'ROUNDDOWN', cat: 'Math & Trig', syntax: 'ROUNDDOWN(number, num_digits)', desc: 'Rounds a number down, toward zero.' },
  { name: 'ABS', cat: 'Math & Trig', syntax: 'ABS(number)', desc: 'Returns the absolute value of a number.' },
  { name: 'INT', cat: 'Math & Trig', syntax: 'INT(number)', desc: 'Rounds a number down to the nearest integer.' },
  { name: 'MOD', cat: 'Math & Trig', syntax: 'MOD(number, divisor)', desc: 'Returns the remainder after a number is divided by a divisor.' },
  { name: 'POWER', cat: 'Math & Trig', syntax: 'POWER(number, power)', desc: 'Returns the result of a number raised to a power.' },
  { name: 'SQRT', cat: 'Math & Trig', syntax: 'SQRT(number)', desc: 'Returns a positive square root.' },
  { name: 'PRODUCT', cat: 'Math & Trig', syntax: 'PRODUCT(number1, [number2], ...)', desc: 'Multiplies all the numbers given as arguments.' },
  { name: 'RANDBETWEEN', cat: 'Math & Trig', syntax: 'RANDBETWEEN(bottom, top)', desc: 'Returns a random number between the numbers you specify.' },
  { name: 'AVERAGE', cat: 'Statistical', syntax: 'AVERAGE(number1, [number2], ...)', desc: 'Returns the average (arithmetic mean) of its arguments.' },
  { name: 'AVERAGEIF', cat: 'Statistical', syntax: 'AVERAGEIF(range, criteria, [average_range])', desc: 'Finds the average for the cells specified by a given condition.' },
  { name: 'AVERAGEIFS', cat: 'Statistical', syntax: 'AVERAGEIFS(average_range, criteria_range1, criteria1, ...)', desc: 'Finds the average for the cells specified by a set of conditions.' },
  { name: 'COUNT', cat: 'Statistical', syntax: 'COUNT(value1, [value2], ...)', desc: 'Counts the number of cells in a range that contain numbers.' },
  { name: 'COUNTA', cat: 'Statistical', syntax: 'COUNTA(value1, [value2], ...)', desc: 'Counts the number of cells in a range that are not empty.' },
  { name: 'COUNTBLANK', cat: 'Statistical', syntax: 'COUNTBLANK(range)', desc: 'Counts the number of empty cells in a range.' },
  { name: 'COUNTIF', cat: 'Statistical', syntax: 'COUNTIF(range, criteria)', desc: 'Counts the number of cells within a range that meet the given condition.' },
  { name: 'COUNTIFS', cat: 'Statistical', syntax: 'COUNTIFS(criteria_range1, criteria1, ...)', desc: 'Counts the number of cells specified by a given set of conditions.' },
  { name: 'MAX', cat: 'Statistical', syntax: 'MAX(number1, [number2], ...)', desc: 'Returns the largest value in a set of values.' },
  { name: 'MIN', cat: 'Statistical', syntax: 'MIN(number1, [number2], ...)', desc: 'Returns the smallest number in a set of values.' },
  { name: 'MEDIAN', cat: 'Statistical', syntax: 'MEDIAN(number1, [number2], ...)', desc: 'Returns the median of the given numbers.' },
  { name: 'LARGE', cat: 'Statistical', syntax: 'LARGE(array, k)', desc: 'Returns the k-th largest value in a data set.' },
  { name: 'SMALL', cat: 'Statistical', syntax: 'SMALL(array, k)', desc: 'Returns the k-th smallest value in a data set.' },
  { name: 'RANK.EQ', cat: 'Statistical', syntax: 'RANK.EQ(number, ref, [order])', desc: 'Returns the rank of a number in a list of numbers.' },
  { name: 'STDEV.S', cat: 'Statistical', syntax: 'STDEV.S(number1, [number2], ...)', desc: 'Estimates standard deviation based on a sample.' },
  { name: 'IF', cat: 'Logical', syntax: 'IF(logical_test, [value_if_true], [value_if_false])', desc: 'Checks whether a condition is met, and returns one value if TRUE and another if FALSE.' },
  { name: 'IFS', cat: 'Logical', syntax: 'IFS(logical_test1, value_if_true1, ...)', desc: 'Checks whether one or more conditions are met and returns a value for the first TRUE condition.' },
  { name: 'IFERROR', cat: 'Logical', syntax: 'IFERROR(value, value_if_error)', desc: 'Returns value_if_error if the expression is an error, otherwise the value of the expression.' },
  { name: 'IFNA', cat: 'Logical', syntax: 'IFNA(value, value_if_na)', desc: 'Returns the value you specify if the expression resolves to #N/A.' },
  { name: 'AND', cat: 'Logical', syntax: 'AND(logical1, [logical2], ...)', desc: 'Checks whether all arguments are TRUE.' },
  { name: 'OR', cat: 'Logical', syntax: 'OR(logical1, [logical2], ...)', desc: 'Checks whether any of the arguments are TRUE.' },
  { name: 'NOT', cat: 'Logical', syntax: 'NOT(logical)', desc: 'Changes FALSE to TRUE, or TRUE to FALSE.' },
  { name: 'XOR', cat: 'Logical', syntax: 'XOR(logical1, [logical2], ...)', desc: 'Returns a logical Exclusive Or of all arguments.' },
  { name: 'CONCAT', cat: 'Text', syntax: 'CONCAT(text1, [text2], ...)', desc: 'Concatenates a list or range of text strings.' },
  { name: 'TEXTJOIN', cat: 'Text', syntax: 'TEXTJOIN(delimiter, ignore_empty, text1, ...)', desc: 'Concatenates text with a delimiter.' },
  { name: 'LEFT', cat: 'Text', syntax: 'LEFT(text, [num_chars])', desc: 'Returns the specified number of characters from the start of a text string.' },
  { name: 'RIGHT', cat: 'Text', syntax: 'RIGHT(text, [num_chars])', desc: 'Returns the specified number of characters from the end of a text string.' },
  { name: 'MID', cat: 'Text', syntax: 'MID(text, start_num, num_chars)', desc: 'Returns the characters from the middle of a text string.' },
  { name: 'LEN', cat: 'Text', syntax: 'LEN(text)', desc: 'Returns the number of characters in a text string.' },
  { name: 'UPPER', cat: 'Text', syntax: 'UPPER(text)', desc: 'Converts text to uppercase.' },
  { name: 'LOWER', cat: 'Text', syntax: 'LOWER(text)', desc: 'Converts text to lowercase.' },
  { name: 'PROPER', cat: 'Text', syntax: 'PROPER(text)', desc: 'Capitalizes the first letter in each word of a text value.' },
  { name: 'TRIM', cat: 'Text', syntax: 'TRIM(text)', desc: 'Removes extra spaces from text.' },
  { name: 'SUBSTITUTE', cat: 'Text', syntax: 'SUBSTITUTE(text, old_text, new_text)', desc: 'Substitutes new text for old text in a text string.' },
  { name: 'FIND', cat: 'Text', syntax: 'FIND(find_text, within_text, [start_num])', desc: 'Finds one text value within another (case-sensitive).' },
  { name: 'SEARCH', cat: 'Text', syntax: 'SEARCH(find_text, within_text, [start_num])', desc: 'Finds one text value within another (not case-sensitive).' },
  { name: 'TEXT', cat: 'Text', syntax: 'TEXT(value, format_text)', desc: 'Formats a number and converts it to text.' },
  { name: 'VALUE', cat: 'Text', syntax: 'VALUE(text)', desc: 'Converts a text argument to a number.' },
  { name: 'TODAY', cat: 'Date & Time', syntax: 'TODAY()', desc: 'Returns the current date formatted as a date.' },
  { name: 'NOW', cat: 'Date & Time', syntax: 'NOW()', desc: 'Returns the current date and time.' },
  { name: 'DATE', cat: 'Date & Time', syntax: 'DATE(year, month, day)', desc: 'Returns the number that represents the date.' },
  { name: 'YEAR', cat: 'Date & Time', syntax: 'YEAR(serial_number)', desc: 'Returns the year of a date.' },
  { name: 'MONTH', cat: 'Date & Time', syntax: 'MONTH(serial_number)', desc: 'Returns the month of a date, a number from 1 to 12.' },
  { name: 'DAY', cat: 'Date & Time', syntax: 'DAY(serial_number)', desc: 'Returns the day of the month, a number from 1 to 31.' },
  { name: 'WEEKDAY', cat: 'Date & Time', syntax: 'WEEKDAY(serial_number)', desc: 'Returns a number from 1 to 7 identifying the day of the week.' },
  { name: 'EOMONTH', cat: 'Date & Time', syntax: 'EOMONTH(start_date, months)', desc: 'Returns the last day of the month before or after a number of months.' },
  { name: 'EDATE', cat: 'Date & Time', syntax: 'EDATE(start_date, months)', desc: 'Returns the date that is the indicated number of months before or after the start date.' },
  { name: 'NETWORKDAYS', cat: 'Date & Time', syntax: 'NETWORKDAYS(start_date, end_date)', desc: 'Returns the number of whole workdays between two dates.' },
  { name: 'DAYS', cat: 'Date & Time', syntax: 'DAYS(end_date, start_date)', desc: 'Returns the number of days between two dates.' },
  { name: 'VLOOKUP', cat: 'Lookup & Reference', syntax: 'VLOOKUP(lookup_value, table_array, col_index_num, [range_lookup])', desc: 'Looks for a value in the leftmost column of a table, and returns a value in the same row from a column you specify.' },
  { name: 'HLOOKUP', cat: 'Lookup & Reference', syntax: 'HLOOKUP(lookup_value, table_array, row_index_num, [range_lookup])', desc: 'Looks for a value in the top row of a table and returns the value in the same column from a row you specify.' },
  { name: 'XLOOKUP', cat: 'Lookup & Reference', syntax: 'XLOOKUP(lookup_value, lookup_array, return_array, [if_not_found])', desc: 'Searches a range for a match and returns the corresponding item from a second range.' },
  { name: 'INDEX', cat: 'Lookup & Reference', syntax: 'INDEX(array, row_num, [column_num])', desc: 'Returns a value from a table or range by row and column.' },
  { name: 'MATCH', cat: 'Lookup & Reference', syntax: 'MATCH(lookup_value, lookup_array, [match_type])', desc: 'Returns the relative position of an item in an array that matches a specified value.' },
  { name: 'CHOOSE', cat: 'Lookup & Reference', syntax: 'CHOOSE(index_num, value1, [value2], ...)', desc: 'Chooses a value from a list of values based on an index number.' },
  { name: 'ROWS', cat: 'Lookup & Reference', syntax: 'ROWS(array)', desc: 'Returns the number of rows in a reference or array.' },
  { name: 'PMT', cat: 'Financial', syntax: 'PMT(rate, nper, pv, [fv], [type])', desc: 'Calculates the payment for a loan based on constant payments and a constant interest rate.' },
  { name: 'PV', cat: 'Financial', syntax: 'PV(rate, nper, pmt, [fv], [type])', desc: 'Returns the present value of an investment.' },
  { name: 'FV', cat: 'Financial', syntax: 'FV(rate, nper, pmt, [pv], [type])', desc: 'Returns the future value of an investment.' },
  { name: 'NPV', cat: 'Financial', syntax: 'NPV(rate, value1, [value2], ...)', desc: 'Returns the net present value of an investment based on a discount rate and future cash flows.' },
]

/* ───────── formatting ───────── */
export function formatValue(v: Val, fmt?: CellFmt | string): string {
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
    case 'date': {
      const d = new Date(Math.round((v - 25569) * 86400000))
      return `${d.getUTCMonth() + 1}/${d.getUTCDate()}/${d.getUTCFullYear()}`
    }
    case 'longdate':
      return new Date(Math.round((v - 25569) * 86400000)).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
    case 'time':
      return new Date(Math.round((v - 25569) * 86400000)).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', timeZone: 'UTC' })
    case 'scientific':
      return v.toExponential(2).toUpperCase().replace(/E([+-])(\d)$/, 'E$10$2')
    case 'fraction': {
      const whole = Math.trunc(v)
      const frac = Math.abs(v - whole)
      if (frac < 1e-9) return String(whole)
      let best = [0, 1]
      for (let d = 1; d <= 9; d++) {
        const n = Math.round(frac * d)
        if (Math.abs(frac - n / d) < Math.abs(frac - best[0] / best[1])) best = [n, d]
      }
      return `${whole ? whole + ' ' : v < 0 ? '-' : ''}${best[0]}/${best[1]}`
    }
    case 'text':
      return String(v)
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
