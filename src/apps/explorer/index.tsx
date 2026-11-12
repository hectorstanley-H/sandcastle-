import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import {
  AddCircle20Regular,
  Add16Regular,
  AppsList20Regular,
  ArrowClockwise20Regular,
  ArrowCounterclockwise20Regular,
  ArrowLeft20Regular,
  ArrowRight20Regular,
  ArrowSort20Regular,
  ArrowUp20Regular,
  ChevronDown12Regular,
  ChevronRight12Regular,
  ClipboardPaste20Regular,
  Copy20Regular,
  Cut20Regular,
  Delete20Regular,
  DeleteDismiss20Regular,
  Dismiss12Regular,
  Filter20Regular,
  Grid20Regular,
  Info20Regular,
  MoreHorizontal20Regular,
  PanelRight20Regular,
  Pin16Regular,
  Rename20Regular,
  Search16Regular,
  Share20Regular,
  Checkmark12Filled,
  CloudCheckmark16Regular,
  CheckmarkCircle16Filled,
  ListBar20Regular,
} from '@fluentui/react-icons'
import type { AppProps } from '@/os/registry'
import { WindowControls } from '@/os/Window'
import { useDesk, useWin } from '@/os/context'
import { db, uid, useCollection, useRecord, type Rec } from '@/db/db'
import { AnnoCtx, getDoc } from '@/apps/acrobat/docs'
import { fmtDateShort, fmtTime } from '@/data/time'
import { logoUrl } from '@/os/registry'
import {
  DriveIcon,
  FileTypeIcon,
  FolderIcon,
  KnownFolderIcon,
  ThisPCIcon,
  NetworkIcon,
  typeName,
  extOf,
} from './icons'
import { Thumb } from './Thumb'

/* ───────────────────────── model ───────────────────────── */

const ROOTS = ['Desktop', 'Downloads', 'Documents', 'Pictures', 'Music', 'Videos'] as const
const SPECIAL = ['home', 'gallery', 'thispc', 'network', 'recycle'] as const

const ROOT_NAMES: Record<string, string> = {
  home: 'Home',
  gallery: 'Gallery',
  thispc: 'This PC',
  network: 'Network',
  recycle: 'Recycle Bin',
  OneDrive: 'OneDrive - Northwind Global',
  'C:': 'Windows (C:)',
}

/** static tree for the C: drive (not stored in the db) */
const CTREE: Record<string, string[]> = {
  'C:': ['PerfLogs', 'Program Files', 'Program Files (x86)', 'Users', 'Windows'],
  'C:/Program Files': ['Adobe', 'Common Files', 'H Company', 'Microsoft Office', 'Microsoft Update Health Tools', 'Windows Defender', 'Windows Mail', 'WindowsApps', 'Zoom'],
  'C:/Program Files (x86)': ['Common Files', 'Microsoft', 'Microsoft Edge', 'Windows Kits', 'Windows Photo Viewer'],
  'C:/Users': ['alex.morgan', 'Public'],
  'C:/Users/Public': ['Public Desktop', 'Public Documents', 'Public Downloads', 'Public Music', 'Public Pictures', 'Public Videos'],
  'C:/Windows': ['Boot', 'Fonts', 'Logs', 'Media', 'System32', 'SysWOW64', 'Temp', 'WinSxS'],
  'C:/Program Files/H Company': ['H-Worker'],
  'C:/Program Files/Adobe': ['Acrobat DC'],
  'C:/Program Files/Microsoft Office': ['root', 'Updates'],
  'C:/Users/alex.morgan/AppData': ['Local', 'LocalLow', 'Roaming'],
  'C:/Users/alex.morgan/AppData/Local': ['Microsoft', 'Packages', 'Temp'],
  'C:/Users/alex.morgan/AppData/Roaming': ['Microsoft', 'H Company'],
}
/** C:\Users\alex.morgan links to the user's known folders */
const USER_LINKS = ['Desktop', 'Documents', 'Downloads', 'Music', 'OneDrive', 'Pictures', 'Videos']

export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const lastSeg = (p: string) => p.split('/').pop() ?? p
export const displayName = (p: string) => ROOT_NAMES[p] ?? lastSeg(p)
const isStatic = (p: string) => p === 'C:' || p.startsWith('C:/')
const isWritable = (p: string) => !SPECIAL.includes(p as any) && !isStatic(p)
const winPath = (p: string) => {
  if (isStatic(p)) return p.replace('C:', 'C:\\').replace(/\//g, '\\').replace('\\\\', '\\')
  if (p.startsWith('OneDrive')) return 'C:\\Users\\alex.morgan\\OneDrive - Northwind Global' + p.slice(8).replace(/\//g, '\\')
  return 'C:\\Users\\alex.morgan\\' + p.replace(/\//g, '\\')
}
const prettyLoc = (p: string) => (p.startsWith('OneDrive') ? 'OneDrive - Northwind Global' + p.slice(8).replace(/\//g, '\\') : p.replace(/\//g, '\\'))

const fmtWhen = (iso?: string) => (iso ? `${fmtDateShort(iso)} ${fmtTime(iso)}` : '')
const parseSize = (s?: string) => {
  if (!s) return 0
  const m = /([\d.]+)\s*(KB|MB|GB|B)/i.exec(s)
  if (!m) return 0
  const n = parseFloat(m[1])
  return n * ({ B: 1, KB: 1e3, MB: 1e6, GB: 1e9 } as any)[m[2].toUpperCase()]
}
const fmtSize = (bytes: number) => (bytes >= 1e9 ? `${(bytes / 1e9).toFixed(1)} GB` : bytes >= 1e6 ? `${(bytes / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1e3))} KB`)

interface Item {
  key: string
  kind: 'file' | 'folder' | 'link' | 'static'
  id: string
  name: string
  modified?: string
  type: string
  size: string
  path?: string // for folders/links: the path they open
  file?: Rec
  folder?: Rec
  hidden?: boolean
}

interface Tab {
  id: string
  history: string[]
  index: number
}

const STATIC_DATE = (i: number) => new Date(2026, 3 + (i % 5), 2 + i * 3, 9 + (i % 7), (i * 17) % 60).toISOString()

type ViewMode = 'details' | 'large' | 'medium' | 'tiles' | 'xl' | 'small' | 'list' | 'content'
type GroupBy = 'none' | 'name' | 'modified' | 'type' | 'size'
const VIEW_LABEL: Record<ViewMode, string> = { xl: 'Extra large icons', large: 'Large icons', medium: 'Medium icons', small: 'Small icons', list: 'List', details: 'Details', tiles: 'Tiles', content: 'Content' }
const VIEW_ORDER: ViewMode[] = ['xl', 'large', 'medium', 'small', 'list', 'details', 'tiles', 'content']

/** Kind filters offered by the Filter button while searching */
const KINDS: [string, (it: Item) => boolean][] = [
  ['Folders', (it) => it.kind !== 'file'],
  ['Documents', (it) => /\.(docx?|pdf|txt|rtf|odt)$/i.test(it.name)],
  ['Spreadsheets', (it) => /\.(xlsx?|csv)$/i.test(it.name)],
  ['Presentations', (it) => /\.(pptx?)$/i.test(it.name)],
  ['Pictures', (it) => /\.(jpe?g|png|gif|bmp)$/i.test(it.name)],
  ['Music', (it) => /\.(mp3|m4a|wav)$/i.test(it.name)],
  ['Videos', (it) => /\.(mp4|mov|avi)$/i.test(it.name)],
  ['PDF', (it) => /\.pdf$/i.test(it.name)],
]

function dateGroup(iso?: string) {
  if (!iso) return 'A long time ago'
  const d = new Date(iso)
  const now = new Date()
  const day = 86400000
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const t = d.getTime()
  if (t >= startToday) return 'Today'
  if (t >= startToday - day) return 'Yesterday'
  const dow = (now.getDay() + 6) % 7
  if (t >= startToday - dow * day) return 'Earlier this week'
  if (t >= startToday - (dow + 7) * day) return 'Last week'
  if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) return 'Earlier this month'
  const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  if (d.getFullYear() === lm.getFullYear() && d.getMonth() === lm.getMonth()) return 'Last month'
  if (d.getFullYear() === now.getFullYear()) return 'Earlier this year'
  return 'A long time ago'
}
const DATE_ORDER = ['Today', 'Yesterday', 'Earlier this week', 'Last week', 'Earlier this month', 'Last month', 'Earlier this year', 'A long time ago']
function groupItems(items: Item[], by: GroupBy): { label: string; items: Item[] }[] {
  if (by === 'none') return [{ label: '', items }]
  const key = (it: Item) => {
    if (by === 'type') return it.type || 'File'
    if (by === 'modified') return dateGroup(it.modified)
    if (by === 'size') {
      if (it.kind !== 'file') return 'Unspecified'
      const b = parseSize(it.size)
      return b === 0 ? 'Empty (0 KB)' : b < 16e3 ? 'Tiny (0 – 16 KB)' : b < 1e6 ? 'Small (16 KB – 1 MB)' : b < 128e6 ? 'Medium (1 – 128 MB)' : 'Large (128 MB – 1 GB)'
    }
    const c = it.name[0]?.toUpperCase() ?? '#'
    return /[A-H]/.test(c) ? 'A – H' : /[I-P]/.test(c) ? 'I – P' : /[Q-Z]/.test(c) ? 'Q – Z' : '0 – 9'
  }
  const map = new Map<string, Item[]>()
  for (const it of items) {
    const k = key(it)
    if (!map.has(k)) map.set(k, [])
    map.get(k)!.push(it)
  }
  const out = [...map.entries()].map(([label, items]) => ({ label, items }))
  if (by === 'modified') out.sort((a, b) => DATE_ORDER.indexOf(a.label) - DATE_ORDER.indexOf(b.label))
  else out.sort((a, b) => a.label.localeCompare(b.label))
  return out
}

/** "C:\Users\alex.morgan\Downloads", "Downloads", "This PC"… → internal path */
function parseAddress(raw: string, known: (p: string) => boolean): string | null {
  const s = raw.trim().replace(/[\\/]+$/, '')
  if (!s) return null
  const lower = s.toLowerCase()
  for (const [k, v] of Object.entries(ROOT_NAMES)) if (v.toLowerCase() === lower || k.toLowerCase() === lower) return k
  if (lower === 'shell:recyclebinfolder') return 'recycle'
  const user = /^c:[\\/]users[\\/]alex\.morgan(?:[\\/](.*))?$/i.exec(s)
  if (user) {
    if (!user[1]) return 'C:/Users/alex.morgan'
    let rest = user[1].replace(/\\/g, '/')
    if (/^onedrive - northwind global/i.test(rest)) rest = 'OneDrive' + rest.slice('OneDrive - Northwind Global'.length)
    return known(rest) ? rest : CTREE[`C:/Users/alex.morgan/${rest}`] || /^appdata/i.test(rest) ? `C:/Users/alex.morgan/${rest}` : null
  }
  if (/^c:/i.test(s)) {
    const p = 'C:' + s.slice(2).replace(/\\/g, '/')
    return p === 'C:' || CTREE[p] || Object.values(CTREE).some((l) => l.some((n) => p.endsWith('/' + n))) ? p : null
  }
  const rel = s.replace(/\\/g, '/')
  return known(rel) ? rel : null
}

/* ───────────────────────── small UI bits ───────────────────────── */

function CmdBtn({ icon: I, label, onClick, disabled, agent, text, chevron, active }: any) {
  return (
    <button
      data-agent={agent}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`h-8 flex items-center gap-1.5 rounded-[4px] text-[12px] text-[#1A1A1A] disabled:opacity-40 disabled:hover:bg-transparent ${text ? 'px-2' : 'w-8 justify-center'} ${active ? 'bg-black/[0.06]' : 'hover:bg-black/[0.05]'}`}
    >
      <I className="text-[#1A1A1A] shrink-0" />
      {text && <span>{text}</span>}
      {chevron && <ChevronDown12Regular className="text-[#5F5F5F] -ml-0.5" />}
    </button>
  )
}

function Menu({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`absolute z-50 min-w-[220px] py-1 rounded-lg bg-[#F9F9F9]/[0.98] border border-black/[0.08] shadow-[0_8px_16px_rgba(0,0,0,0.14)] menu-open ${className}`}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  )
}
function MenuItem({ icon, label, onClick, agent, check, hint, disabled }: any) {
  return (
    <button
      data-agent={agent}
      disabled={disabled}
      onClick={onClick}
      className="w-[calc(100%-8px)] mx-1 h-8 flex items-center gap-3 px-2.5 rounded-[4px] text-[12px] text-left hover:bg-black/[0.05] disabled:opacity-40"
    >
      <span className="w-5 flex items-center justify-center shrink-0">{check ? <Checkmark12Filled /> : icon}</span>
      <span className="flex-1">{label}</span>
      {hint && <span className="text-[11px] text-[#6B6B6B]">{hint}</span>}
    </button>
  )
}
const MenuSep = () => <div className="h-px bg-black/[0.08] my-1 mx-0" />

/** a menu row that opens a fly-out sub menu to its right (hover or click) */
function SubMenu({ label, icon, open, setOpen, disabled, children }: { label: string; icon?: React.ReactNode; open: boolean; setOpen: (o: boolean) => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <div className="relative" onMouseEnter={() => !disabled && setOpen(true)}>
      <MenuItem icon={icon} label={label} hint="›" disabled={disabled} onClick={() => setOpen(!open)} />
      {open && !disabled && <Menu className="left-[calc(100%-6px)] -top-1 w-[220px]">{children}</Menu>}
    </div>
  )
}

function CrumbChevron({ id, open, toggle, children_, navigate }: { id: string; open: boolean; toggle: () => void; children_: { label: string; path: string }[]; navigate: (p: string) => void }) {
  return (
    <span className="relative flex items-center shrink-0">
      <button
        aria-label="Show subfolders"
        data-agent={`explorer-crumb-chevron-${id}`}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={toggle}
        className={`w-4 h-6 rounded-[3px] flex items-center justify-center text-[#5F5F5F] ${open ? 'bg-black/[0.06]' : 'hover:bg-black/[0.05]'}`}
      >
        {open ? <ChevronDown12Regular /> : <ChevronRight12Regular />}
      </button>
      {open && (
        <Menu className="left-0 top-7 w-[240px] max-h-[360px] overflow-y-auto">
          {children_.length === 0 && <div className="px-4 h-8 flex items-center text-[12px] text-[#6B6B6B]">No subfolders</div>}
          {children_.map((c) => (
            <MenuItem key={c.path} icon={<KnownFolderIcon path={SPECIAL.includes(c.path as any) || ['C:', 'OneDrive', ...ROOTS].includes(c.path) ? c.path : 'folder'} size={16} />} label={c.label} onClick={() => navigate(c.path)} />
          ))}
        </Menu>
      )}
    </span>
  )
}

function CheckBox({ on, agent, onClick, visible }: { on: boolean; agent: string; onClick: (e: React.MouseEvent) => void; visible: boolean }) {
  return (
    <span
      role="checkbox"
      aria-checked={on}
      aria-label="Select"
      data-agent={agent}
      onClick={(e) => {
        e.stopPropagation()
        onClick(e)
      }}
      onDoubleClick={(e) => e.stopPropagation()}
      className={`w-[14px] h-[14px] shrink-0 rounded-[3px] border flex items-center justify-center transition-opacity ${on ? 'bg-[#005FB8] border-[#005FB8] text-white opacity-100' : 'bg-white border-[#8A8A8A] ' + (visible ? 'opacity-0 group-hover:opacity-100' : 'opacity-0')}`}
    >
      {on && <Checkmark12Filled className="w-[10px] h-[10px]" />}
    </span>
  )
}

/* ───────────────────────── Explorer ───────────────────────── */

export default function Explorer({ win, params }: AppProps) {
  const { open, isAgent } = useDesk()
  const { setTitle } = useWin()
  const files = useCollection('files')
  const folders = useCollection('explorer.folders')
  const recycle = useCollection('explorer.recycle')

  const [tabs, setTabs] = useState<Tab[]>(() => [{ id: 't1', history: [params?.path ?? 'home'], index: 0 }])
  const [activeTab, setActiveTab] = useState('t1')
  const tab = tabs.find((t) => t.id === activeTab) ?? tabs[0]
  const path = tab.history[tab.index]

  const [sel, setSel] = useState<string[]>([])
  const [clip, setClip] = useState<{ mode: 'cut' | 'copy'; keys: string[]; items: Item[] } | null>(null)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [renameVal, setRenameVal] = useState('')
  const [menu, setMenu] = useState<null | 'new' | 'sort' | 'view' | 'more'>(null)
  const [ctx, setCtx] = useState<{ x: number; y: number; key?: string } | null>(null)
  const [sort, setSort] = useState<{ key: 'name' | 'modified' | 'type' | 'size'; dir: 1 | -1 }>({ key: 'name', dir: 1 })
  const [view, setView] = useState<ViewMode>('details')
  const [detailsPane, setDetailsPaneRaw] = useState(false)
  const [previewPane, setPreviewPane] = useState(false)
  const setDetailsPane = (v: boolean) => {
    setDetailsPaneRaw(v)
    if (v) setPreviewPane(false)
  }
  const [navPane, setNavPane] = useState(true)
  const [compact, setCompact] = useState(false)
  const [hiddenItems, setHiddenItems] = useState(false)
  const [groupBy, setGroupBy] = useState<GroupBy>('none')
  const [kindFilter, setKindFilter] = useState<string | null>(null)
  const [sub, setSub] = useState<null | 'group' | 'filter' | 'prev' | 'openwith' | 'ctx-view' | 'ctx-sort' | 'ctx-group' | 'classic' | { crumb: string }>(null)
  const [propsFor, setPropsFor] = useState<null | { kind: 'item'; key: string } | { kind: 'folder'; path: string } | { kind: 'recycle'; id: string }>(null)
  const [options, setOptions] = useState(false)
  const [addrEdit, setAddrEdit] = useState<string | null>(null)
  const [addrErr, setAddrErr] = useState(false)
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  const pins = useCollection('explorer.pins')
  const favorites = useCollection('explorer.favorites')
  const undoStack = useRef<{ label: string; run: () => void }[]>([])
  const pushUndo = (label: string, run: () => void) => {
    undoStack.current.push({ label, run })
    if (undoStack.current.length > 30) undoStack.current.shift()
  }
  const [checkboxes, setCheckboxes] = useState(true)
  const [showExt, setShowExt] = useState(true)
  const [query, setQuery] = useState('')
  const [confirm, setConfirm] = useState<null | { title: string; body: string; ok: () => void }>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ OneDrive: false, thispc: false })
  const [flash, setFlash] = useState<string[]>([])
  const [toast, setToast] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  /* deep links */
  useEffect(() => {
    if (!params) return
    if (params.path) navigate(params.path)
    if (params.select) setTimeout(() => setSel([`f:${params.select}`]), 50)
  }, [win.nonce])

  useEffect(() => {
    setTitle(`${displayName(path)} - File Explorer`)
  }, [path])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2200)
    return () => clearTimeout(t)
  }, [toast])

  function navigate(p: string) {
    setTabs((ts) =>
      ts.map((t) => {
        if (t.id !== activeTab) return t
        if (t.history[t.index] === p) return t
        const h = [...t.history.slice(0, t.index + 1), p]
        return { ...t, history: h, index: h.length - 1 }
      }),
    )
    setSel([])
    setRenaming(null)
    setQuery('')
    setMenu(null)
    setSub(null)
    setAddrEdit(null)
    setKindFilter(null)
  }
  const go = (delta: number) => {
    setTabs((ts) => ts.map((t) => (t.id === activeTab ? { ...t, index: Math.max(0, Math.min(t.history.length - 1, t.index + delta)) } : t)))
    setSel([])
  }
  const parentOf = (p: string): string | null => {
    if (SPECIAL.includes(p as any)) return p === 'home' ? null : p === 'thispc' ? null : 'home'
    if (p === 'C:') return 'thispc'
    if (p.includes('/')) return p.slice(0, p.lastIndexOf('/'))
    return 'home'
  }

  /* ── items for the current folder ── */
  const items: Item[] = useMemo(() => {
    const out: Item[] = []
    if (isStatic(path)) {
      if (path === 'C:/Users/alex.morgan') {
        USER_LINKS.forEach((l, i) =>
          out.push({ key: `l:${l}`, kind: 'link', id: l, name: displayName(l), modified: STATIC_DATE(i), type: 'File folder', size: '', path: l }),
        )
        if (hiddenItems) out.push({ key: 's:C:/Users/alex.morgan/AppData', kind: 'static', id: 'C:/Users/alex.morgan/AppData', name: 'AppData', modified: STATIC_DATE(3), type: 'File folder', size: '', path: 'C:/Users/alex.morgan/AppData', hidden: true })
      } else
        (CTREE[path] ?? []).forEach((n, i) =>
          out.push({ key: `s:${path}/${n}`, kind: 'static', id: `${path}/${n}`, name: n, modified: STATIC_DATE(i + n.length), type: 'File folder', size: '', path: `${path}/${n}` }),
        )
      return out
    }
    if (!isWritable(path)) return out
    const recursive = !!query
    for (const f of folders) {
      const inside = recursive ? (f.parent === path || f.parent.startsWith(path + '/')) : f.parent === path
      if (!inside) continue
      const p = `${f.parent}/${f.name}`
      out.push({ key: `d:${f.id}`, kind: 'folder', id: f.id, name: f.name, modified: lastModifiedIn(p, f.created), type: 'File folder', size: '', path: p, folder: f })
    }
    for (const f of files) {
      const inside = recursive ? f.folder === path || f.folder.startsWith(path + '/') : f.folder === path
      if (!inside) continue
      out.push({ key: `f:${f.id}`, kind: 'file', id: f.id, name: f.name, modified: f.modified, type: typeName(f.name), size: f.size, file: f })
    }
    return out
  }, [path, files, folders, query, hiddenItems])

  function lastModifiedIn(p: string, fallback: string) {
    let best = fallback
    for (const f of files) if (f.folder === p && f.modified > best) best = f.modified
    return best
  }

  const shown = useMemo(() => {
    let l = items
    if (query) {
      const q = query.toLowerCase()
      l = l.filter((i) => i.name.toLowerCase().includes(q))
      const kf = KINDS.find(([k]) => k === kindFilter)
      if (kf) l = l.filter(kf[1])
    }
    const dir = sort.dir
    const cmp = (a: Item, b: Item) => {
      const fa = a.kind === 'file' ? 1 : 0
      const fb = b.kind === 'file' ? 1 : 0
      if (fa !== fb) return fa - fb
      switch (sort.key) {
        case 'modified':
          return dir * ((a.modified ?? '') < (b.modified ?? '') ? -1 : 1)
        case 'type':
          return dir * a.type.localeCompare(b.type) || a.name.localeCompare(b.name)
        case 'size':
          return dir * (parseSize(a.size) - parseSize(b.size))
        default:
          return dir * a.name.localeCompare(b.name, undefined, { numeric: true })
      }
    }
    return [...l].sort(cmp)
  }, [items, query, sort, kindFilter])

  /* ── actions ── */
  const selItems = shown.filter((i) => sel.includes(i.key))
  const canEdit = isWritable(path)

  const flashKeys = (keys: string[]) => {
    setFlash(keys)
    setTimeout(() => setFlash([]), 1600)
  }

  const uniqueName = (base: string, folderPath: string, isFolder: boolean) => {
    const taken = new Set([
      ...files.filter((f) => f.folder === folderPath).map((f) => f.name.toLowerCase()),
      ...folders.filter((f) => f.parent === folderPath).map((f) => f.name.toLowerCase()),
    ])
    if (!taken.has(base.toLowerCase())) return base
    const ext = isFolder ? '' : extOf(base) ? '.' + extOf(base) : ''
    const stem = ext ? base.slice(0, -ext.length) : base
    for (let i = 2; ; i++) {
      const n = `${stem} (${i})${ext}`
      if (!taken.has(n.toLowerCase())) return n
    }
  }

  const newFolder = () => {
    setMenu(null)
    if (!canEdit) return
    const id = uid('fld')
    const name = uniqueName('New folder', path, true)
    db.insert('explorer.folders', { id, name, parent: path, created: new Date().toISOString(), createdBy: isAgent ? 'hworker' : undefined })
    pushUndo('New folder', () => {
      const f = db.find('explorer.folders', id)
      if (!f) return
      const p = `${f.parent}/${f.name}`
      if (db.get('files').some((x) => x.folder === p || x.folder.startsWith(p + '/')) || db.get('explorer.folders').some((x) => x.parent === p)) return
      db.remove('explorer.folders', id)
    })
    setSel([`d:${id}`])
    setRenaming(`d:${id}`)
    setRenameVal(name)
    flashKeys([`d:${id}`])
  }

  const newFile = (ext: string, label: string, appId?: string) => {
    setMenu(null)
    if (!canEdit) return
    const id = uid('f')
    const name = uniqueName(`New ${label}.${ext}`, path, false)
    let open: any = appId ? { appId } : undefined
    if (ext === 'txt') {
      const nid = uid('n')
      db.insert('notepad.notes', { id: nid, name, content: '', saved: '', modified: new Date().toISOString(), path })
      open = { appId: 'notepad', params: { noteId: nid } }
    }
    db.insert('files', { id, name, folder: path, kind: ext === 'png' ? 'img' : ext, size: ext === 'txt' ? '0 KB' : '12 KB', modified: new Date().toISOString(), open, createdBy: isAgent ? 'hworker' : undefined })
    setSel([`f:${id}`])
    setRenaming(`f:${id}`)
    setRenameVal(name)
    flashKeys([`f:${id}`])
  }

  const startRename = (key?: string) => {
    const k = key ?? sel[0]
    const it = shown.find((i) => i.key === k)
    if (!it || (it.kind !== 'file' && it.kind !== 'folder')) return
    setCtx(null)
    setRenaming(k)
    setRenameVal(it.name)
  }

  /** rewrite every folder/file path under `from` to `to` */
  const movePrefix = (from: string, to: string) => {
    for (const f of db.get('explorer.folders')) {
      if (f.parent === from || f.parent.startsWith(from + '/')) db.update('explorer.folders', f.id, { parent: to + f.parent.slice(from.length) })
    }
    for (const f of db.get('files')) {
      if (f.folder === from || f.folder.startsWith(from + '/')) db.update('files', f.id, { folder: to + f.folder.slice(from.length) })
    }
  }

  const commitRename = () => {
    if (!renaming) return
    const k = renaming
    setRenaming(null)
    const it = shown.find((i) => i.key === k) ?? items.find((i) => i.key === k)
    const name = renameVal.trim()
    if (!it || !name || name === it.name) return
    if (it.kind === 'file') {
      db.update('files', it.id, { name, modified: it.file?.modified, updatedBy: isAgent ? 'hworker' : undefined })
      const f = it.file
      if (f?.open?.appId === 'notepad' && f.open.params?.noteId) db.update('notepad.notes', f.open.params.noteId, { name })
      const oldName = it.name
      pushUndo('Rename', () => {
        if (!db.find('files', it.id)) return
        db.update('files', it.id, { name: oldName })
        if (f?.open?.appId === 'notepad' && f.open.params?.noteId) db.update('notepad.notes', f.open.params.noteId, { name: oldName })
      })
    } else if (it.kind === 'folder') {
      const old = it.path!
      db.update('explorer.folders', it.id, { name, updatedBy: isAgent ? 'hworker' : undefined })
      movePrefix(old, `${it.folder!.parent}/${name}`)
      const oldName = it.name
      pushUndo('Rename', () => {
        const fr = db.find('explorer.folders', it.id)
        if (!fr) return
        db.update('explorer.folders', it.id, { name: oldName })
        movePrefix(`${fr.parent}/${fr.name}`, `${fr.parent}/${oldName}`)
      })
    }
    flashKeys([k])
  }

  /** rename from the Properties dialog (same effect as an inline rename) */
  const applyRename = (it: Item, raw: string) => {
    const name = raw.trim()
    if (!name || name === it.name) return
    if (it.kind === 'file') {
      db.update('files', it.id, { name, updatedBy: isAgent ? 'hworker' : undefined })
      const f = it.file
      if (f?.open?.appId === 'notepad' && f.open.params?.noteId) db.update('notepad.notes', f.open.params.noteId, { name })
      pushUndo('Rename', () => db.find('files', it.id) && db.update('files', it.id, { name: it.name }))
    } else if (it.kind === 'folder') {
      const old = it.path!
      db.update('explorer.folders', it.id, { name, updatedBy: isAgent ? 'hworker' : undefined })
      movePrefix(old, `${it.folder!.parent}/${name}`)
      pushUndo('Rename', () => {
        if (!db.find('explorer.folders', it.id)) return
        db.update('explorer.folders', it.id, { name: it.name })
        movePrefix(`${it.folder!.parent}/${name}`, old)
      })
    }
    flashKeys([it.key])
  }

  const cut = (mode: 'cut' | 'copy' = 'cut') => {
    setCtx(null)
    const its = selItems.filter((i) => i.kind === 'file' || i.kind === 'folder')
    if (!its.length) return
    setClip({ mode, keys: its.map((i) => i.key), items: its })
  }

  const paste = () => {
    setCtx(null)
    if (!clip || !canEdit) return
    const moved: string[] = []
    const undos: (() => void)[] = []
    for (const it of clip.items) {
      if (it.kind === 'file') {
        const f = db.find('files', it.id)
        if (!f) continue
        if (clip.mode === 'cut') {
          if (f.folder === path) continue
          db.update('files', f.id, { folder: path, name: uniqueName(f.name, path, false), movedBy: isAgent ? 'hworker' : undefined })
          undos.push(() => db.find('files', f.id) && db.update('files', f.id, { folder: f.folder, name: f.name, movedBy: f.movedBy }))
          moved.push(`f:${f.id}`)
        } else {
          const id = uid('f')
          db.insert('files', { ...f, id, folder: path, name: uniqueName(f.folder === path ? f.name.replace(/(\.[^.]+)$/, ' - Copy$1') : f.name, path, false), modified: new Date().toISOString() })
          moved.push(`f:${id}`)
        }
      } else if (it.kind === 'folder') {
        const f = db.find('explorer.folders', it.id)
        if (!f) continue
        const old = `${f.parent}/${f.name}`
        if (path === old || path.startsWith(old + '/') || (f.parent === path && clip.mode === 'cut')) continue
        if (clip.mode === 'cut') {
          const name = uniqueName(f.name, path, true)
          db.update('explorer.folders', f.id, { parent: path, name })
          movePrefix(old, `${path}/${name}`)
          undos.push(() => {
            if (!db.find('explorer.folders', f.id)) return
            db.update('explorer.folders', f.id, { parent: f.parent, name: f.name })
            movePrefix(`${path}/${name}`, old)
          })
          moved.push(`d:${f.id}`)
        } else {
          // copy a whole folder tree
          const name = uniqueName(f.folder === path ? `${f.name} - Copy` : f.name, path, true)
          const dest = `${path}/${name}`
          const nid = uid('fld')
          db.insert('explorer.folders', { id: nid, name, parent: path, created: new Date().toISOString(), createdBy: isAgent ? 'hworker' : undefined })
          for (const sf of db.get('explorer.folders').filter((x) => x.parent === old || x.parent.startsWith(old + '/')))
            db.insert('explorer.folders', { ...sf, id: uid('fld'), parent: dest + sf.parent.slice(old.length), created: new Date().toISOString() })
          for (const ff of db.get('files').filter((x) => x.folder === old || x.folder.startsWith(old + '/')))
            db.insert('files', { ...ff, id: uid('f'), folder: dest + ff.folder.slice(old.length), modified: new Date().toISOString() })
          moved.push(`d:${nid}`)
        }
      }
    }
    if (undos.length) pushUndo('Move', () => undos.forEach((u) => u()))
    if (clip.mode === 'cut') setClip(null)
    setSel(moved)
    flashKeys(moved)
  }

  const del = () => {
    setCtx(null)
    if (path === 'recycle') {
      if (!sel.length) return
      setConfirm({
        title: sel.length > 1 ? 'Delete Multiple Items' : 'Delete File',
        body: sel.length > 1 ? `Are you sure you want to permanently delete these ${sel.length} items?` : 'Are you sure you want to permanently delete this file?',
        ok: () => {
          sel.forEach((k) => db.remove('explorer.recycle', k.slice(2)))
          setSel([])
        },
      })
      return
    }
    const its = selItems.filter((i) => i.kind === 'file' || i.kind === 'folder')
    const rbIds: string[] = []
    for (const it of its) {
      if (it.kind === 'file') {
        const f = it.file!
        db.remove('files', f.id)
        const rid = uid('rb')
        rbIds.push(rid)
        db.insert('explorer.recycle', { id: rid, name: f.name, kind: f.kind, size: f.size, originalFolder: f.folder, deleted: new Date().toISOString(), modified: f.modified, file: f }, { prepend: true })
      } else {
        const root = it.path!
        const subFolders = db.get('explorer.folders').filter((f) => f.id === it.id || f.parent === root || f.parent.startsWith(root + '/'))
        const subFiles = db.get('files').filter((f) => f.folder === root || f.folder.startsWith(root + '/'))
        subFolders.forEach((f) => db.remove('explorer.folders', f.id))
        subFiles.forEach((f) => db.remove('files', f.id))
        const rid = uid('rb')
        rbIds.push(rid)
        db.insert('explorer.recycle', { id: rid, name: it.name, kind: 'folder', isFolder: true, size: '', originalFolder: it.folder!.parent, deleted: new Date().toISOString(), modified: it.modified, payload: { folders: subFolders, files: subFiles } }, { prepend: true })
      }
    }
    if (rbIds.length) pushUndo('Delete', () => restore(rbIds))
    setSel([])
  }

  const restore = (ids: string[]) => {
    for (const id of ids) {
      const r = db.find('explorer.recycle', id)
      if (!r) continue
      if (r.isFolder && r.payload) {
        db.insert('explorer.folders', r.payload.folders)
        db.insert('files', r.payload.files)
      } else if (r.file) db.insert('files', r.file)
      else db.insert('files', { id: uid('f'), name: r.name, folder: r.originalFolder, kind: r.kind, size: r.size, modified: r.modified })
      db.remove('explorer.recycle', id)
    }
    setSel([])
  }

  const openItem = (it: Item) => {
    if (it.kind === 'folder' || it.kind === 'static' || it.kind === 'link') return navigate(it.path!)
    const f = it.file!
    if (f.open?.appId) return open(f.open.appId, f.open.params)
    const e = extOf(f.name)
    if (e === 'pdf') return open('acrobat', { file: f.name })
    if (e === 'txt') return open('notepad', { new: { name: f.name, content: '' } })
    setToast(`No app is associated with “${f.name}”`)
  }

  /** open a file with a specific app ("Open with") */
  const openWith = (it: Item, app: string) => {
    setCtx(null)
    setSub(null)
    const f = it.file
    if (!f) return
    if (app === 'acrobat') return open('acrobat', f.open?.appId === 'acrobat' && f.open.params ? f.open.params : { file: f.name })
    if (app === 'notepad') {
      if (f.open?.appId === 'notepad' && f.open.params?.noteId) return open('notepad', f.open.params)
      return open('notepad', { new: { name: f.name, content: '' } })
    }
    if (app === 'edge') return open('edge', { q: f.name })
    open(app)
  }
  const openWithApps = (it?: Item): [string, string][] => {
    if (!it || it.kind !== 'file') return []
    const e = extOf(it.name)
    const base: [string, string][] =
      e === 'pdf' ? [['acrobat', 'Adobe Acrobat'], ['edge', 'Microsoft Edge']]
      : e === 'txt' || e === 'csv' || e === 'ics' ? [['notepad', 'Notepad'], ['excel', 'Excel'], ['word', 'Word']]
      : e === 'docx' ? [['word', 'Word'], ['notepad', 'Notepad']]
      : e === 'xlsx' ? [['excel', 'Excel']]
      : e === 'pptx' ? [['powerpoint', 'PowerPoint']]
      : [['notepad', 'Notepad'], ['edge', 'Microsoft Edge']]
    return base
  }
  const isPinned = (p: string) => pins.some((x) => x.path === p) || [...ROOTS, 'Documents/Contracts'].includes(p as any)
  const togglePin = (p: string) => {
    setMenu(null)
    setCtx(null)
    const ex = pins.find((x) => x.path === p)
    if (ex) db.remove('explorer.pins', ex.id)
    else if (!isPinned(p)) db.insert('explorer.pins', { id: uid('pin'), path: p, at: new Date().toISOString() })
  }
  const pinTarget = () => {
    const f = selItems.find((i) => i.kind === 'folder' || i.kind === 'link' || i.kind === 'static')
    return f?.path ?? (isWritable(path) || isStatic(path) ? path : null)
  }
  const addFavorite = () => {
    setCtx(null)
    for (const it of selItems) if (it.kind === 'file' && !favorites.some((f) => f.fileId === it.id)) db.insert('explorer.favorites', { id: uid('xfav'), fileId: it.id })
    setToast(selItems.length > 1 ? `${selItems.length} items added to Favorites` : 'Added to Favorites')
  }
  const copyAsPath = () => {
    setCtx(null)
    const paths = selItems.map((it) => `"${it.kind === 'file' ? winPath(it.file!.folder) + '\\' + it.name : winPath(it.path!)}"`).join('\n')
    navigator.clipboard?.writeText(paths).catch(() => {})
    setToast('Path copied to the clipboard')
  }
  const compressZip = () => {
    setCtx(null)
    if (!canEdit || !selItems.length) return
    const first = selItems[0]
    const base = selItems.length > 1 ? displayName(path) : first.name.replace(/\.[^.]+$/, '')
    const name = uniqueName(`${base}.zip`, path, false)
    const total = selItems.reduce((n, i) => n + (i.kind === 'file' ? parseSize(i.size) : 2e5), 0)
    const id = uid('f')
    db.insert('files', { id, name, folder: path, kind: 'zip', size: fmtSize(total * 0.62), modified: new Date().toISOString(), createdBy: isAgent ? 'hworker' : undefined })
    setSel([`f:${id}`])
    flashKeys([`f:${id}`])
  }
  const newShortcut = () => {
    setMenu(null)
    if (!canEdit) return
    const id = uid('f')
    const name = uniqueName('New shortcut.url', path, false)
    db.insert('files', { id, name, folder: path, kind: 'url', size: '1 KB', modified: new Date().toISOString(), open: { appId: 'edge', params: { url: 'https://www.bing.com/' } }, createdBy: isAgent ? 'hworker' : undefined })
    setSel([`f:${id}`])
    setRenaming(`f:${id}`)
    setRenameVal(name)
    flashKeys([`f:${id}`])
  }
  const sendTo = (dest: string) => {
    setCtx(null)
    setSub(null)
    for (const it of selItems) {
      if (it.kind !== 'file') continue
      const f = it.file!
      db.insert('files', { ...f, id: uid('f'), folder: dest, name: uniqueName(f.name, dest, false), modified: new Date().toISOString() })
    }
    setToast(`Copied ${selItems.length} item${selItems.length > 1 ? 's' : ''} to ${displayName(dest)}`)
  }
  /** drag & drop: move dragged items into a folder path */
  const dropInto = (dest: string, keys: string[]) => {
    setDropTarget(null)
    if (!isWritable(dest)) return
    const its = keys.map((k) => items.find((i) => i.key === k)).filter(Boolean) as Item[]
    if (!its.length) return
    const prevClip = clip
    const undos: (() => void)[] = []
    for (const it of its) {
      if (it.kind === 'file') {
        const f = db.find('files', it.id)
        if (!f || f.folder === dest) continue
        db.update('files', f.id, { folder: dest, name: uniqueName(f.name, dest, false), movedBy: isAgent ? 'hworker' : undefined })
        undos.push(() => db.find('files', f.id) && db.update('files', f.id, { folder: f.folder, name: f.name }))
      } else if (it.kind === 'folder') {
        const f = db.find('explorer.folders', it.id)
        if (!f) continue
        const old = `${f.parent}/${f.name}`
        if (dest === old || dest.startsWith(old + '/') || f.parent === dest) continue
        const name = uniqueName(f.name, dest, true)
        db.update('explorer.folders', f.id, { parent: dest, name })
        movePrefix(old, `${dest}/${name}`)
        undos.push(() => {
          if (!db.find('explorer.folders', f.id)) return
          db.update('explorer.folders', f.id, { parent: f.parent, name: f.name })
          movePrefix(`${dest}/${name}`, old)
        })
      }
    }
    if (undos.length) pushUndo('Move', () => undos.forEach((u) => u()))
    setClip(prevClip)
    setSel([])
  }
  const undo = () => {
    const u = undoStack.current.pop()
    if (u) u.run()
  }

  const clickItem = (it: Item, e: React.MouseEvent) => {
    setCtx(null)
    setMenu(null)
    if (renaming && renaming !== it.key) commitRename()
    if (e.ctrlKey || e.metaKey) setSel((s) => (s.includes(it.key) ? s.filter((x) => x !== it.key) : [...s, it.key]))
    else if (e.shiftKey && sel.length) {
      const a = shown.findIndex((x) => x.key === sel[sel.length - 1])
      const b = shown.findIndex((x) => x.key === it.key)
      const [lo, hi] = a < b ? [a, b] : [b, a]
      setSel(shown.slice(lo, hi + 1).map((x) => x.key))
    } else setSel([it.key])
  }
  const toggle = (key: string) => setSel((s) => (s.includes(key) ? s.filter((x) => x !== key) : [...s, key]))

  const onKey = (e: React.KeyboardEvent) => {
    if ((e.target as HTMLElement).tagName === 'INPUT') return
    const mod = e.ctrlKey || e.metaKey
    if (e.altKey && e.key === 'Enter') {
      e.preventDefault()
      if (selItems[0]) setPropsFor({ kind: 'item', key: selItems[0].key })
      else if (isWritable(path)) setPropsFor({ kind: 'folder', path })
      return
    }
    if (mod && e.shiftKey && /^Digit[1-8]$/.test(e.code)) {
      e.preventDefault()
      setView(VIEW_ORDER[Number(e.code.slice(5)) - 1])
      return
    }
    if (mod && e.shiftKey && e.key.toLowerCase() === 'n') {
      e.preventDefault()
      newFolder()
      return
    }
    if (mod && !e.shiftKey && e.key.toLowerCase() === 'z') {
      e.preventDefault()
      undo()
      return
    }
    if (e.altKey && e.key === 'ArrowLeft') return go(-1)
    if (e.altKey && e.key === 'ArrowRight') return go(1)
    if (e.altKey && e.key === 'ArrowUp') {
      const p = parentOf(path)
      if (p) navigate(p)
      return
    }
    if (e.altKey && e.key.toLowerCase() === 'p') {
      e.preventDefault()
      setPreviewPane(!previewPane)
      if (!previewPane) setDetailsPaneRaw(false)
      return
    }
    if (e.key === 'F5') {
      e.preventDefault()
      setSel([])
      return
    }
    if ((mod && e.key.toLowerCase() === 'f') || e.key === 'F3') {
      e.preventDefault()
      ;(rootRef.current?.querySelector('[data-agent="explorer-search"]') as HTMLInputElement | null)?.focus()
      return
    }
    if (mod && e.key.toLowerCase() === 't') {
      e.preventDefault()
      newTab()
      return
    }
    if (mod && e.key.toLowerCase() === 'w') {
      e.preventDefault()
      closeTab(activeTab)
      return
    }
    if (e.key === 'Delete') del()
    else if (e.key === 'F2') startRename()
    else if (e.key === 'Enter' && selItems[0]) openItem(selItems[0])
    else if (e.key === 'Backspace') go(-1)
    else if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
      e.preventDefault()
      setSel(shown.map((i) => i.key))
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'x') cut('cut')
    else if ((e.ctrlKey || e.metaKey) && e.key === 'c') cut('copy')
    else if ((e.ctrlKey || e.metaKey) && e.key === 'v') paste()
  }

  /* ── tabs ── */
  const newTab = () => {
    const id = uid('tab')
    setTabs((t) => [...t, { id, history: ['home'], index: 0 }])
    setActiveTab(id)
    setSel([])
  }
  const closeTab = (id: string) => {
    if (tabs.length === 1) return
    const idx = tabs.findIndex((t) => t.id === id)
    const rest = tabs.filter((t) => t.id !== id)
    setTabs(rest)
    if (id === activeTab) setActiveTab(rest[Math.max(0, idx - 1)].id)
  }

  /** sub-locations listed by the breadcrumb chevrons */
  const childrenOf = (p: string): { label: string; path: string }[] => {
    if (p === '__root') return [...['home', 'gallery', 'OneDrive'], ...ROOTS, 'thispc', 'network', 'recycle'].map((x) => ({ label: displayName(x), path: x }))
    if (p === 'home') return ROOTS.map((x) => ({ label: x, path: x }))
    if (p === 'thispc') return [{ label: 'Windows (C:)', path: 'C:' }, ...ROOTS.map((x) => ({ label: x, path: x }))]
    if (isStatic(p)) return p === 'C:/Users/alex.morgan' ? USER_LINKS.map((l) => ({ label: displayName(l), path: l })) : (CTREE[p] ?? []).map((n) => ({ label: n, path: `${p}/${n}` }))
    return folders.filter((f) => f.parent === p).sort((a, b) => a.name.localeCompare(b.name)).map((f) => ({ label: f.name, path: `${p}/${f.name}` }))
  }

  /* ── crumbs ── */
  const crumbs: { label: string; path: string }[] = useMemo(() => {
    if (SPECIAL.includes(path as any)) return [{ label: displayName(path), path }]
    if (isStatic(path)) {
      const parts = path.split('/')
      const out = [{ label: 'This PC', path: 'thispc' }]
      parts.forEach((_, i) => {
        const p = parts.slice(0, i + 1).join('/')
        out.push({ label: displayName(p), path: p })
      })
      return out
    }
    const parts = path.split('/')
    return parts.map((_, i) => {
      const p = parts.slice(0, i + 1).join('/')
      return { label: displayName(p), path: p }
    })
  }, [path])

  const rootKey = SPECIAL.includes(path as any) ? path : isStatic(path) ? (path === 'C:' ? 'C:' : 'folder') : path.includes('/') ? 'folder' : path

  /* ── status ── */
  const count = path === 'home' ? null : path === 'recycle' ? recycle.length : path === 'thispc' ? 3 : path === 'network' ? 4 : path === 'gallery' ? files.filter((f) => /\.(jpe?g|png)$/i.test(f.name)).length : shown.length
  const selSize = selItems.reduce((n, i) => n + parseSize(i.size), 0)

  const searchPlaceholder = `Search ${displayName(path)}`

  /* ── render ── */
  return (
    <div
      ref={rootRef}
      className="flex-1 min-h-0 flex flex-col bg-[#EEF1F7] text-[#1A1A1A] select-none"
      style={{ fontFamily: 'var(--font-win)' }}
      onPointerDown={() => {
        setMenu(null)
        setCtx(null)
        setSub(null)
      }}
    >
      {/* title bar with tabs */}
      <div data-drag-handle className="h-[42px] shrink-0 flex items-end pl-2 gap-0">
        {tabs.map((t) => {
          const p = t.history[t.index]
          const act = t.id === activeTab
          return (
            <div
              key={t.id}
              data-agent={`explorer-tab-${t.id}`}
              onClick={() => {
                setActiveTab(t.id)
                setSel([])
              }}
              className={`relative group h-[34px] w-[236px] flex items-center gap-2.5 pl-3 pr-1.5 rounded-t-[8px] text-[12px] cursor-default ${act ? 'bg-[#F9F9FB] shadow-[0_-1px_0_rgba(0,0,0,0.04)]' : 'hover:bg-white/50'}`}
            >
              <KnownFolderIcon path={SPECIAL.includes(p as any) || ['C:', 'OneDrive', ...ROOTS].includes(p) ? p : 'folder'} size={16} />
              <span className="flex-1 truncate">{displayName(p)}</span>
              <button
                aria-label="Close tab"
                onClick={(e) => {
                  e.stopPropagation()
                  closeTab(t.id)
                }}
                className="w-6 h-6 rounded flex items-center justify-center hover:bg-black/[0.06] text-[#3B3B3B]"
              >
                <Dismiss12Regular />
              </button>
              {!act && <span className="absolute right-0 top-2.5 bottom-2.5 w-px bg-black/10" />}
            </div>
          )
        })}
        <button data-agent="explorer-tab-new" aria-label="Add new tab" onClick={newTab} className="w-8 h-8 mb-[3px] ml-1 rounded-[4px] flex items-center justify-center hover:bg-black/[0.05]">
          <Add16Regular />
        </button>
        <div className="flex-1 h-full" />
        <WindowControls height={42} />
      </div>

      {/* nav + address bar */}
      <div className="shrink-0 bg-[#F9F9FB] flex items-center h-[48px] px-2 gap-1">
        <button data-agent="explorer-back" aria-label="Back" disabled={tab.index === 0} onClick={() => go(-1)} className="w-8 h-8 rounded flex items-center justify-center hover:bg-black/[0.05] disabled:opacity-35 disabled:hover:bg-transparent">
          <ArrowLeft20Regular />
        </button>
        <button data-agent="explorer-forward" aria-label="Forward" disabled={tab.index >= tab.history.length - 1} onClick={() => go(1)} className="w-8 h-8 rounded flex items-center justify-center hover:bg-black/[0.05] disabled:opacity-35 disabled:hover:bg-transparent">
          <ArrowRight20Regular />
        </button>
        <button
          data-agent="explorer-up"
          aria-label="Up"
          disabled={!parentOf(path)}
          onClick={() => {
            const p = parentOf(path)
            if (p) navigate(p)
          }}
          className="w-8 h-8 rounded flex items-center justify-center hover:bg-black/[0.05] disabled:opacity-35 disabled:hover:bg-transparent"
        >
          <ArrowUp20Regular />
        </button>
        <button data-agent="explorer-refresh" aria-label="Refresh" onClick={() => setSel([])} className="w-8 h-8 rounded flex items-center justify-center hover:bg-black/[0.05] mr-1">
          <ArrowClockwise20Regular />
        </button>
        <div data-agent="explorer-address" title={winPath(path)} className={`relative flex-1 min-w-0 h-8 flex items-center gap-0.5 pl-2 pr-1 rounded-[4px] bg-white border ${addrEdit !== null ? (addrErr ? 'border-[#C42B1C]' : 'border-[#E5E5E5] border-b-[#005FB8] border-b-2') : 'border-[#E5E5E5] border-b-[#D0D0D0]'}`}>
          {addrEdit !== null ? (
            <input
              autoFocus
              data-agent="explorer-address-input"
              aria-label="Address"
              value={addrEdit}
              onChange={(e) => { setAddrEdit(e.target.value); setAddrErr(false) }}
              onFocus={(e) => e.target.select()}
              onBlur={() => setAddrEdit(null)}
              onKeyDown={(e) => {
                e.stopPropagation()
                if (e.key === 'Escape') setAddrEdit(null)
                if (e.key === 'Enter') {
                  const known = (p: string) => (ROOTS as readonly string[]).includes(p) || p === 'OneDrive' || folders.some((f) => `${f.parent}/${f.name}` === p)
                  const target = parseAddress(addrEdit, known)
                  if (target) navigate(target)
                  else setAddrErr(true)
                }
              }}
              style={{ fontSize: 12 }}
              className="flex-1 min-w-0 outline-none bg-transparent text-[12px] select-text"
            />
          ) : (
            <>
              <KnownFolderIcon path={rootKey === 'folder' ? 'folder' : rootKey} size={16} className="mr-1 shrink-0" />
              <CrumbChevron id="root" open={sub !== null && typeof sub === 'object' && sub.crumb === '__root'} toggle={() => setSub(typeof sub === 'object' && sub?.crumb === '__root' ? null : { crumb: '__root' })} children_={childrenOf('__root')} navigate={navigate} />
              {crumbs.map((c, i) => (
                <span key={c.path} className="relative flex items-center min-w-0">
                  <button data-agent={`explorer-crumb-${i}`} onClick={() => navigate(c.path)} className="h-6 px-1.5 rounded-[3px] hover:bg-black/[0.05] text-[12px] truncate">
                    {c.label}
                  </button>
                  {i < crumbs.length - 1 && <CrumbChevron id={String(i)} open={typeof sub === 'object' && sub?.crumb === c.path} toggle={() => setSub(typeof sub === 'object' && sub?.crumb === c.path ? null : { crumb: c.path })} children_={childrenOf(c.path)} navigate={navigate} />}
                </span>
              ))}
              <div className="flex-1 h-full cursor-text" data-agent="explorer-address-blank" onClick={() => { setAddrEdit(SPECIAL.includes(path as any) ? displayName(path) : winPath(path)); setSub(null) }} />
            </>
          )}
          <button aria-label="Previous locations" onPointerDown={(e) => e.stopPropagation()} onClick={() => setSub(sub === 'prev' ? null : 'prev')} className="w-6 h-6 rounded flex items-center justify-center hover:bg-black/[0.05] text-[#5F5F5F]">
            <ChevronDown12Regular />
          </button>
          {sub === 'prev' && (
            <Menu className="right-0 top-9 w-[320px]">
              {[...new Set([...tab.history].reverse())].slice(0, 10).map((h) => (
                <MenuItem key={h} icon={<KnownFolderIcon path={SPECIAL.includes(h as any) || ['C:', 'OneDrive', ...ROOTS].includes(h) ? h : 'folder'} size={16} />} label={displayName(h)} hint={h.includes('/') ? prettyLoc(h.slice(0, h.lastIndexOf('/'))) : ''} onClick={() => { setSub(null); navigate(h) }} />
              ))}
            </Menu>
          )}
        </div>
        <div className="w-[260px] h-8 flex items-center rounded-[4px] bg-white border border-[#E5E5E5] border-b-[#D0D0D0] pl-3 pr-2 ml-1">
          <input
            data-agent="explorer-search"
            aria-label={searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && setQuery('')}
            placeholder={searchPlaceholder}
            style={{ fontSize: 12 }}
            className="flex-1 min-w-0 outline-none bg-transparent text-[12px] placeholder:text-[#6B6B6B]"
          />
          {query ? (
            <button onClick={() => setQuery('')} className="w-5 h-5 flex items-center justify-center rounded hover:bg-black/5"><Dismiss12Regular /></button>
          ) : (
            <Search16Regular className="text-[#5F5F5F]" />
          )}
        </div>
      </div>

      {/* command bar */}
      <div className="shrink-0 bg-[#F9F9FB] border-b border-[#E5E5E5] flex items-center h-[46px] px-3 gap-0.5 relative">
        <div className="relative" onPointerDown={(e) => e.stopPropagation()}>
          <CmdBtn icon={AddCircle20Regular} text="New" chevron label="New" agent="explorer-new" disabled={!canEdit} onClick={() => setMenu(menu === 'new' ? null : 'new')} active={menu === 'new'} />
          {menu === 'new' && (
            <Menu className="left-0 top-9 w-[290px]">
              <MenuItem agent="explorer-new-folder" icon={<FolderIcon size={16} />} label="Folder" onClick={newFolder} />
              <MenuItem icon={<span className="w-4 h-4 rounded-[2px] border border-[#5F5F5F] text-[9px] flex items-center justify-center">↗</span>} label="Shortcut" agent="explorer-new-shortcut" onClick={newShortcut} />
              <MenuSep />
              <MenuItem icon={<FileTypeIcon name="x.png" size={16} />} label="Bitmap image" onClick={() => newFile('png', 'Bitmap image')} />
              <MenuItem agent="explorer-new-docx" icon={<img src={logoUrl('word')} className="w-4 h-4" alt="" />} label="Microsoft Word Document" onClick={() => newFile('docx', 'Microsoft Word Document', 'word')} />
              <MenuItem icon={<img src={logoUrl('powerpoint')} className="w-4 h-4" alt="" />} label="Microsoft PowerPoint Presentation" onClick={() => newFile('pptx', 'Microsoft PowerPoint Presentation', 'powerpoint')} />
              <MenuItem agent="explorer-new-xlsx" icon={<img src={logoUrl('excel')} className="w-4 h-4" alt="" />} label="Microsoft Excel Worksheet" onClick={() => newFile('xlsx', 'Microsoft Excel Worksheet', 'excel')} />
              <MenuItem agent="explorer-new-txt" icon={<FileTypeIcon name="x.txt" size={16} />} label="Text Document" onClick={() => newFile('txt', 'Text Document')} />
              <MenuItem icon={<FolderIcon size={16} zip />} label="Compressed (zipped) Folder" onClick={() => newFile('zip', 'Compressed (zipped) Folder')} />
            </Menu>
          )}
        </div>
        <span className="w-px h-6 bg-black/10 mx-1.5" />
        <CmdBtn icon={Cut20Regular} label="Cut" agent="explorer-cut" disabled={!canEdit || !selItems.length} onClick={() => cut('cut')} />
        <CmdBtn icon={Copy20Regular} label="Copy" agent="explorer-copy" disabled={!canEdit || !selItems.length} onClick={() => cut('copy')} />
        <CmdBtn icon={ClipboardPaste20Regular} label="Paste" agent="explorer-paste" disabled={!canEdit || !clip} onClick={paste} />
        <CmdBtn icon={Rename20Regular} label="Rename" agent="explorer-rename" disabled={!canEdit || selItems.length !== 1} onClick={() => startRename()} />
        <CmdBtn icon={Share20Regular} label="Share" agent="explorer-share" disabled={!selItems.some((i) => i.kind === 'file')} onClick={() => setToast('Nearby sharing is turned off. Use Outlook or Teams to share files.')} />
        <CmdBtn icon={Delete20Regular} label="Delete" agent="explorer-delete" disabled={(!canEdit && path !== 'recycle') || !sel.length} onClick={del} />
        <span className="w-px h-6 bg-black/10 mx-1.5" />
        <div className="relative" onPointerDown={(e) => e.stopPropagation()}>
          <CmdBtn icon={ArrowSort20Regular} text="Sort" chevron label="Sort" agent="explorer-sort" onClick={() => setMenu(menu === 'sort' ? null : 'sort')} active={menu === 'sort'} />
          {menu === 'sort' && (
            <Menu className="left-0 top-9">
              {(['name', 'modified', 'type', 'size'] as const).map((k) => (
                <MenuItem key={k} agent={`explorer-sort-${k}`} check={sort.key === k} label={{ name: 'Name', modified: 'Date modified', type: 'Type', size: 'Size' }[k]} onClick={() => { setSort({ key: k, dir: sort.dir }); setMenu(null) }} />
              ))}
              <MenuSep />
              <MenuItem check={sort.dir === 1} label="Ascending" onClick={() => { setSort({ ...sort, dir: 1 }); setMenu(null) }} />
              <MenuItem check={sort.dir === -1} label="Descending" onClick={() => { setSort({ ...sort, dir: -1 }); setMenu(null) }} />
              <MenuSep />
              <div className="relative" onMouseEnter={() => setSub('group')}>
                <MenuItem agent="explorer-group-by" label="Group by" hint={`(${groupBy === 'none' ? 'None' : { name: 'Name', modified: 'Date modified', type: 'Type', size: 'Size' }[groupBy]}) ›`} onClick={() => setSub(sub === 'group' ? null : 'group')} />
                {sub === 'group' && (
                  <Menu className="left-[calc(100%-6px)] top-0 w-[180px]">
                    {(['name', 'modified', 'type', 'size', 'none'] as GroupBy[]).map((g) => (
                      <MenuItem key={g} agent={`explorer-group-${g}`} check={groupBy === g} label={{ name: 'Name', modified: 'Date modified', type: 'Type', size: 'Size', none: '(None)' }[g]} onClick={() => { setGroupBy(g); setSub(null); setMenu(null) }} />
                    ))}
                  </Menu>
                )}
              </div>
            </Menu>
          )}
        </div>
        <div className="relative" onPointerDown={(e) => e.stopPropagation()}>
          <CmdBtn icon={AppsList20Regular} text="View" chevron label="View" agent="explorer-view" onClick={() => setMenu(menu === 'view' ? null : 'view')} active={menu === 'view'} />
          {menu === 'view' && (
            <Menu className="left-0 top-9 w-[250px]">
              <MenuItem icon={<Grid20Regular />} label="Extra large icons" hint="Ctrl+Shift+1" check={view === 'xl'} onClick={() => { setView('xl'); setMenu(null) }} />
              <MenuItem agent="explorer-view-large" icon={<Grid20Regular />} label="Large icons" hint="Ctrl+Shift+2" check={view === 'large'} onClick={() => { setView('large'); setMenu(null) }} />
              <MenuItem icon={<Grid20Regular />} label="Medium icons" hint="Ctrl+Shift+3" check={view === 'medium'} onClick={() => { setView('medium'); setMenu(null) }} />
              <MenuItem icon={<Grid20Regular />} label="Small icons" hint="Ctrl+Shift+4" check={view === 'small'} onClick={() => { setView('small'); setMenu(null) }} />
              <MenuItem icon={<ListBar20Regular />} label="List" hint="Ctrl+Shift+5" check={view === 'list'} onClick={() => { setView('list'); setMenu(null) }} />
              <MenuItem agent="explorer-view-details" icon={<ListBar20Regular />} label="Details" hint="Ctrl+Shift+6" check={view === 'details'} onClick={() => { setView('details'); setMenu(null) }} />
              <MenuItem icon={<AppsList20Regular />} label="Tiles" hint="Ctrl+Shift+7" check={view === 'tiles'} onClick={() => { setView('tiles'); setMenu(null) }} />
              <MenuItem icon={<AppsList20Regular />} label="Content" hint="Ctrl+Shift+8" check={view === 'content'} onClick={() => { setView('content'); setMenu(null) }} />
              <MenuSep />
              <MenuItem label="Compact view" check={compact} onClick={() => { setCompact(!compact); setMenu(null) }} />
              <div className="px-3 pt-1.5 pb-0.5 text-[11px] text-[#6B6B6B]">Show</div>
              <MenuItem label="Navigation pane" check={navPane} onClick={() => { setNavPane(!navPane); setMenu(null) }} />
              <MenuItem label="Details pane" check={detailsPane} onClick={() => { setDetailsPane(!detailsPane); setMenu(null) }} />
              <MenuItem agent="explorer-preview-pane" label="Preview pane" hint="Alt+P" check={previewPane} onClick={() => { setPreviewPane(!previewPane); if (!previewPane) setDetailsPaneRaw(false); setMenu(null) }} />
              <MenuItem label="Item check boxes" check={checkboxes} onClick={() => { setCheckboxes(!checkboxes); setMenu(null) }} />
              <MenuItem label="File name extensions" check={showExt} onClick={() => { setShowExt(!showExt); setMenu(null) }} />
              <MenuItem label="Hidden items" check={hiddenItems} onClick={() => { setHiddenItems(!hiddenItems); setMenu(null) }} />
            </Menu>
          )}
        </div>
        <div className="relative" onPointerDown={(e) => e.stopPropagation()}>
          <CmdBtn icon={Filter20Regular} text="Filter" chevron label="Filter" disabled={!query} active={sub === 'filter' || !!kindFilter} onClick={() => setSub(sub === 'filter' ? null : 'filter')} />
          {sub === 'filter' && query && (
            <Menu className="left-0 top-9 w-[200px]">
              <div className="px-3 pt-1.5 pb-0.5 text-[11px] text-[#6B6B6B]">Kind</div>
              {KINDS.map(([k]) => (
                <MenuItem key={k} agent={`explorer-filter-${k.toLowerCase()}`} check={kindFilter === k} label={k} onClick={() => { setKindFilter(kindFilter === k ? null : k); setSub(null) }} />
              ))}
              <MenuSep />
              <MenuItem label="Clear filter" disabled={!kindFilter} onClick={() => { setKindFilter(null); setSub(null) }} />
            </Menu>
          )}
        </div>
        {path === 'recycle' && (
          <>
            <span className="w-px h-6 bg-black/10 mx-1.5" />
            <CmdBtn
              icon={DeleteDismiss20Regular}
              text="Empty Recycle Bin"
              label="Empty Recycle Bin"
              agent="explorer-empty-recycle"
              disabled={!recycle.length}
              onClick={() =>
                setConfirm({
                  title: 'Delete Multiple Items',
                  body: `Are you sure you want to permanently delete these ${recycle.length} items?`,
                  ok: () => recycle.forEach((r) => db.remove('explorer.recycle', r.id)),
                })
              }
            />
            <CmdBtn icon={ArrowCounterclockwise20Regular} text={sel.length ? 'Restore the selected items' : 'Restore all items'} label="Restore" agent={sel.length ? 'explorer-restore' : 'explorer-restore-all'} disabled={!recycle.length} onClick={() => restore(sel.length ? sel.map((k) => k.slice(2)) : recycle.map((r) => r.id))} />
          </>
        )}
        <div className="relative" onPointerDown={(e) => e.stopPropagation()}>
          <CmdBtn icon={MoreHorizontal20Regular} label="See more" agent="explorer-more" onClick={() => setMenu(menu === 'more' ? null : 'more')} active={menu === 'more'} />
          {menu === 'more' && (
            <Menu className="left-0 top-9 w-[240px]">
              <MenuItem icon={<Pin16Regular />} agent="explorer-pin" label="Pin to Quick access" disabled={!pinTarget() || isPinned(pinTarget()!)} onClick={() => { const t = pinTarget(); if (t) togglePin(t) }} />
              {pinTarget() && pins.some((x) => x.path === pinTarget()) && <MenuItem agent="explorer-unpin" label="Unpin from Quick access" onClick={() => togglePin(pinTarget()!)} />}
              <MenuItem agent="explorer-select-all" label="Select all" hint="Ctrl+A" onClick={() => { setSel(shown.map((i) => i.key)); setMenu(null) }} />
              <MenuItem label="Select none" onClick={() => { setSel([]); setMenu(null) }} />
              <MenuItem label="Invert selection" onClick={() => { setSel(shown.filter((i) => !sel.includes(i.key)).map((i) => i.key)); setMenu(null) }} />
              <MenuSep />
              <MenuItem icon={<Info20Regular />} label="Properties" hint="Alt+Enter" onClick={() => { setDetailsPane(true); setMenu(null) }} />
              <MenuItem agent="explorer-options" label="Options" onClick={() => { setMenu(null); setOptions(true) }} />
            </Menu>
          )}
        </div>
        <div className="flex-1" />
        <CmdBtn icon={PanelRight20Regular} text="Details" label="Details" agent="explorer-details-pane" active={detailsPane} onClick={() => setDetailsPane(!detailsPane)} />
      </div>

      {/* body */}
      <div className="flex-1 min-h-0 flex bg-white">
        {navPane && <NavPane path={path} navigate={navigate} expanded={expanded} setExpanded={setExpanded} folders={folders} pins={pins} dropTarget={dropTarget} setDropTarget={setDropTarget} onDrop={dropInto} unpin={(id) => db.remove('explorer.pins', id)} />}
        <div
          className="flex-1 min-w-0 flex flex-col outline-none"
          tabIndex={0}
          onKeyDown={onKey}
          data-agent="explorer-content"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSel([])
          }}
        >
          {path === 'home' ? (
            <HomeView files={files} navigate={navigate} openFile={(f) => openItem({ key: `f:${f.id}`, kind: 'file', id: f.id, name: f.name, type: '', size: f.size, file: f })} sel={sel} setSel={setSel} pins={pins} favorites={favorites} />
          ) : path === 'thispc' ? (
            <ThisPCView navigate={navigate} sel={sel} setSel={setSel} />
          ) : path === 'gallery' ? (
            <GalleryView files={files} />
          ) : path === 'network' ? (
            <NetworkView sel={sel} setSel={setSel} onOpen={(n) => (n === 'NW-FS01' ? navigate('C:/Users/Public') : setToast(`Windows can’t access \\\\${n}. Check the spelling of the name, or contact your network administrator.`))} />
          ) : path === 'recycle' ? (
            <RecycleView items={recycle} sel={sel} setSel={setSel} toggle={toggle} checkboxes={checkboxes} sort={sort} setSort={setSort} onOpen={(id) => setPropsFor({ kind: 'recycle', id })} />
          ) : (
            <FolderView
              path={path}
              items={shown}
              view={view}
              sel={sel}
              clip={clip}
              flash={flash}
              renaming={renaming}
              renameVal={renameVal}
              setRenameVal={setRenameVal}
              commitRename={commitRename}
              cancelRename={() => setRenaming(null)}
              clickItem={clickItem}
              toggle={toggle}
              openItem={openItem}
              checkboxes={checkboxes}
              showExt={showExt}
              sort={sort}
              setSort={setSort}
              query={query}
              groupBy={groupBy}
              compact={compact}
              dropTarget={dropTarget}
              setDropTarget={setDropTarget}
              onDrop={dropInto}
              clearSel={() => setSel([])}
              onContext={(e, key) => {
                e.preventDefault()
                const r = rootRef.current!.getBoundingClientRect()
                const scale = r.width / rootRef.current!.offsetWidth || 1
                if (key && !sel.includes(key)) setSel([key])
                setCtx({ x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale, key })
              }}
            />
          )}
        </div>
        {detailsPane && <DetailsPane item={selItems[0]} count={selItems.length} path={path} />}
        {previewPane && !detailsPane && <PreviewPane item={selItems[0]} count={selItems.length} openItem={openItem} />}
      </div>

      {/* status bar */}
      <div className="h-[26px] shrink-0 bg-white flex items-center px-3 text-[12px] text-[#1A1A1A] gap-3 border-t border-transparent">
        {count !== null && <span data-agent="explorer-status-count">{count} item{count === 1 ? '' : 's'}</span>}
        {sel.length > 0 && (
          <>
            <span className="w-px h-3.5 bg-black/15" />
            <span>
              {sel.length} item{sel.length > 1 ? 's' : ''} selected{selSize ? `  ${fmtSize(selSize)}` : ''}
            </span>
          </>
        )}
        {clip && clip.mode === 'cut' && (
          <>
            <span className="w-px h-3.5 bg-black/15" />
            <span className="text-[#5F5F5F]">{clip.items.length} item{clip.items.length > 1 ? 's' : ''} on the clipboard</span>
          </>
        )}
        <div className="flex-1" />
        <button aria-label="Details view" onClick={() => setView('details')} className={`w-6 h-5 rounded-[3px] flex items-center justify-center ${view === 'details' ? 'bg-black/[0.07]' : 'hover:bg-black/5'}`}>
          <ListBar20Regular className="w-4 h-4" />
        </button>
        <button aria-label="Large icons view" onClick={() => setView('large')} className={`w-6 h-5 rounded-[3px] flex items-center justify-center ${view === 'large' ? 'bg-black/[0.07]' : 'hover:bg-black/5'}`}>
          <Grid20Regular className="w-4 h-4" />
        </button>
      </div>

      {/* context menu (Windows 11 style) */}
      {ctx && (
        <div
          className="absolute z-50 w-[260px] rounded-lg bg-[#F9F9F9] border border-black/[0.08] shadow-[0_8px_16px_rgba(0,0,0,0.14)] py-1 menu-open"
          style={{ left: Math.min(ctx.x, (rootRef.current?.offsetWidth ?? 1000) - 270), top: Math.min(ctx.y, (rootRef.current?.offsetHeight ?? 700) - 300) }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {ctx.key ? (
            <>
              <div className="flex items-center justify-around px-2 pb-1 mb-1 border-b border-black/[0.08]">
                {[
                  [Cut20Regular, 'Cut', () => cut('cut')],
                  [Copy20Regular, 'Copy', () => cut('copy')],
                  [Rename20Regular, 'Rename', () => startRename(ctx.key)],
                  [Share20Regular, 'Share', () => { setCtx(null); setToast('Nearby sharing is turned off. Use Outlook or Teams to share files.') }],
                  [Delete20Regular, 'Delete', del],
                ].map(([I, l, fn]: any) => (
                  <button key={l} aria-label={l} title={l} onClick={fn} className="w-9 h-9 rounded flex items-center justify-center hover:bg-black/[0.05]">
                    <I />
                  </button>
                ))}
              </div>
              <MenuItem label="Open" hint="Enter" onClick={() => { setCtx(null); const it = shown.find((i) => i.key === ctx.key); if (it) openItem(it) }} />
              <SubMenu label="Open with" open={sub === 'openwith'} setOpen={(o) => setSub(o ? 'openwith' : null)} disabled={!openWithApps(shown.find((i) => i.key === ctx.key)).length}>
                {openWithApps(shown.find((i) => i.key === ctx.key)).map(([app, name]) => (
                  <MenuItem key={app} agent={`explorer-openwith-${app}`} icon={<img src={logoUrl(app)} className="w-4 h-4" alt="" />} label={name} onClick={() => { const it = shown.find((i) => i.key === ctx.key); if (it) openWith(it, app) }} />
                ))}
              </SubMenu>
              <MenuItem icon={<Pin16Regular />} label="Pin to Quick access" disabled={!selItems.some((i) => i.kind !== 'file')} onClick={() => { const f = selItems.find((i) => i.kind !== 'file'); if (f?.path) togglePin(f.path); else setCtx(null) }} />
              <MenuItem label="Add to Favorites" disabled={!selItems.some((i) => i.kind === 'file')} onClick={addFavorite} />
              <MenuItem label="Compress to ZIP file" disabled={!canEdit} onClick={compressZip} />
              <MenuItem label="Copy as path" hint="Ctrl+Shift+C" onClick={copyAsPath} />
              <MenuItem icon={<Info20Regular />} label="Properties" hint="Alt+Enter" onClick={() => { setDetailsPane(true); setCtx(null) }} />
              <MenuSep />
              <MenuItem label="Show more options" onClick={() => setSub(sub === 'classic' ? null : 'classic')} />
              {sub === 'classic' && (
                <div className="border-t border-black/[0.08] mt-1 pt-1">
                  <MenuItem label="Create shortcut" disabled={!canEdit} onClick={() => {
                    setCtx(null)
                    setSub(null)
                    for (const it of selItems) {
                      const target = it.kind === 'file' ? it.file!.open : { appId: 'explorer', params: { path: it.path } }
                      db.insert('files', { id: uid('f'), name: uniqueName(`${it.name.replace(/\.[^.]+$/, '')} - Shortcut.lnk`, path, false), folder: path, kind: 'lnk', size: '1 KB', modified: new Date().toISOString(), open: target, createdBy: isAgent ? 'hworker' : undefined })
                    }
                  }} />
                  <MenuItem label="Send to › Desktop" disabled={!selItems.some((i) => i.kind === 'file')} onClick={() => sendTo('Desktop')} />
                  <MenuItem label="Send to › Documents" disabled={!selItems.some((i) => i.kind === 'file')} onClick={() => sendTo('Documents')} />
                  <MenuItem label="Properties…" onClick={() => { setCtx(null); setSub(null); if (ctx.key) setPropsFor({ kind: 'item', key: ctx.key }) }} />
                </div>
              )}
            </>
          ) : (
            <>
              <SubMenu icon={<AppsList20Regular />} label="View" open={sub === 'ctx-view'} setOpen={(o) => setSub(o ? 'ctx-view' : null)}>
                {VIEW_ORDER.map((v) => (
                  <MenuItem key={v} check={view === v} label={VIEW_LABEL[v]} onClick={() => { setView(v); setCtx(null); setSub(null) }} />
                ))}
              </SubMenu>
              <SubMenu icon={<ArrowSort20Regular />} label="Sort by" open={sub === 'ctx-sort'} setOpen={(o) => setSub(o ? 'ctx-sort' : null)}>
                {(['name', 'modified', 'type', 'size'] as const).map((k) => (
                  <MenuItem key={k} check={sort.key === k} label={{ name: 'Name', modified: 'Date modified', type: 'Type', size: 'Size' }[k]} onClick={() => { setSort({ key: k, dir: sort.dir }); setCtx(null); setSub(null) }} />
                ))}
                <MenuSep />
                <MenuItem check={sort.dir === 1} label="Ascending" onClick={() => { setSort({ ...sort, dir: 1 }); setCtx(null); setSub(null) }} />
                <MenuItem check={sort.dir === -1} label="Descending" onClick={() => { setSort({ ...sort, dir: -1 }); setCtx(null); setSub(null) }} />
              </SubMenu>
              <SubMenu label="Group by" open={sub === 'ctx-group'} setOpen={(o) => setSub(o ? 'ctx-group' : null)}>
                {(['name', 'modified', 'type', 'size', 'none'] as GroupBy[]).map((g) => (
                  <MenuItem key={g} check={groupBy === g} label={{ name: 'Name', modified: 'Date modified', type: 'Type', size: 'Size', none: '(None)' }[g]} onClick={() => { setGroupBy(g); setCtx(null); setSub(null) }} />
                ))}
              </SubMenu>
              <MenuSep />
              <MenuItem icon={<ClipboardPaste20Regular />} label="Paste" disabled={!clip} onClick={paste} />
              <MenuItem icon={<AddCircle20Regular />} label="New folder" disabled={!canEdit} onClick={() => { setCtx(null); newFolder() }} />
              <MenuItem icon={<Info20Regular />} label="Properties" onClick={() => { setCtx(null); if (isWritable(path)) setPropsFor({ kind: 'folder', path }) }} />
              <MenuSep />
              <MenuItem label="Show more options" onClick={() => setSub(sub === 'classic' ? null : 'classic')} />
              {sub === 'classic' && (
                <div className="border-t border-black/[0.08] mt-1 pt-1">
                  <MenuItem label="Refresh" onClick={() => { setCtx(null); setSub(null); setSel([]) }} />
                  <MenuItem label="Undo" hint="Ctrl+Z" disabled={!undoStack.current.length} onClick={() => { setCtx(null); setSub(null); undo() }} />
                  <MenuItem label="New › Text Document" disabled={!canEdit} onClick={() => { setCtx(null); setSub(null); newFile('txt', 'Text Document') }} />
                  <MenuItem label="Open in new tab" onClick={() => { setCtx(null); setSub(null); const id = uid('tab'); setTabs((t) => [...t, { id, history: [path], index: 0 }]); setActiveTab(id) }} />
                </div>
              )}
            </>
          )}
        </div>
      )}

      {toast && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-md bg-[#2B2B2B] text-white text-[12px] shadow-lg toast-in">{toast}</div>
      )}

      {propsFor && (
        <PropertiesDialog
          target={propsFor}
          item={propsFor.kind === 'item' ? items.find((i) => i.key === propsFor.key) ?? shown.find((i) => i.key === propsFor.key) : undefined}
          files={files}
          folders={folders}
          recycle={recycle}
          close={() => setPropsFor(null)}
          rename={(it, name) => applyRename(it, name)}
          restore={(id) => restore([id])}
        />
      )}
      {options && (
        <OptionsDialog
          close={() => setOptions(false)}
          values={{ showExt, checkboxes, hiddenItems, compact, navPane, previewPane }}
          apply={(v) => {
            setShowExt(v.showExt)
            setCheckboxes(v.checkboxes)
            setHiddenItems(v.hiddenItems)
            setCompact(v.compact)
            setNavPane(v.navPane)
            setPreviewPane(v.previewPane)
            if (v.previewPane) setDetailsPaneRaw(false)
            setOptions(false)
          }}
          clearHistory={() => setTabs((ts) => ts.map((t) => ({ ...t, history: [t.history[t.index]], index: 0 })))}
        />
      )}

      {confirm && (
        <div className="absolute inset-0 z-50 bg-black/20 flex items-center justify-center" onPointerDown={(e) => e.stopPropagation()}>
          <div className="w-[440px] rounded-lg bg-white shadow-[0_16px_40px_rgba(0,0,0,0.3)] overflow-hidden">
            <div className="h-8 flex items-center px-3 text-[12px]">{confirm.title}</div>
            <div className="px-6 pt-3 pb-6 flex gap-4 text-[13px]">
              <img src={logoUrl('recyclebin')} className="w-10 h-10" alt="" />
              <div className="pt-2">{confirm.body}</div>
            </div>
            <div className="bg-[#F3F3F3] px-6 py-4 flex justify-end gap-2 border-t border-black/5">
              <button
                data-agent="explorer-confirm-yes"
                onClick={() => {
                  confirm.ok()
                  setConfirm(null)
                }}
                className="h-8 min-w-[100px] px-4 rounded-[4px] bg-[#005FB8] hover:bg-[#1A6FC0] text-white text-[13px]"
              >
                Yes
              </button>
              <button data-agent="explorer-confirm-no" onClick={() => setConfirm(null)} className="h-8 min-w-[100px] px-4 rounded-[4px] bg-[#FBFBFB] border border-black/10 hover:bg-[#F5F5F5] text-[13px]">
                No
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ───────────────────────── navigation pane ───────────────────────── */

function NavPane({ path, navigate, expanded, setExpanded, folders, pins, dropTarget, setDropTarget, onDrop, unpin }: { path: string; navigate: (p: string) => void; expanded: Record<string, boolean>; setExpanded: (f: any) => void; folders: Rec[]; pins: Rec[]; dropTarget: string | null; setDropTarget: (p: string | null) => void; onDrop: (dest: string, keys: string[]) => void; unpin: (id: string) => void }) {
  const row = ({ id, p, label, icon, pin, chevron, depth = 0, pinId }: { id: string; p: string; label: string; icon: React.ReactNode; pin?: boolean; chevron?: boolean; depth?: number; pinId?: string }) => {
    const active = path === p
    const isOpen = expanded[p]
    const droppable = isWritable(p)
    return (
      <div
        key={id}
        role="treeitem"
        data-agent={`explorer-nav-${id}`}
        aria-label={label}
        onClick={() => navigate(p)}
        onDragOver={(e) => {
          if (!droppable || !e.dataTransfer.types.includes('application/x-explorer-items')) return
          e.preventDefault()
          if (dropTarget !== p) setDropTarget(p)
        }}
        onDragLeave={() => dropTarget === p && setDropTarget(null)}
        onDrop={(e) => {
          e.preventDefault()
          const keys = e.dataTransfer.getData('application/x-explorer-items')
          if (keys) onDrop(p, JSON.parse(keys))
        }}
        className={`group relative h-8 mx-1 flex items-center gap-2 pr-2 rounded-[4px] text-[12px] cursor-default ${dropTarget === p ? 'bg-[#CCE8FF] outline outline-1 outline-[#99D1FF]' : active ? 'bg-[#E5EBF5]' : 'hover:bg-black/[0.04]'}`}
        style={{ paddingLeft: 6 + depth * 16 }}
      >
        <span
          className={`w-4 h-4 flex items-center justify-center text-[#5F5F5F] ${chevron ? '' : 'invisible'}`}
          onClick={(e) => {
            e.stopPropagation()
            setExpanded((x: any) => ({ ...x, [p]: !x[p] }))
          }}
        >
          {isOpen ? <ChevronDown12Regular /> : <ChevronRight12Regular />}
        </span>
        {icon}
        <span className="flex-1 truncate">{label}</span>
        {pin && !pinId && <Pin16Regular className="w-[14px] h-[14px] text-[#6B6B6B] opacity-80" />}
        {pinId && (
          <button
            aria-label="Unpin from Quick access"
            title="Unpin from Quick access"
            onClick={(e) => {
              e.stopPropagation()
              unpin(pinId)
            }}
            className="w-5 h-5 rounded flex items-center justify-center text-[#6B6B6B] hover:bg-black/[0.08]"
          >
            <Pin16Regular className="w-[14px] h-[14px] opacity-80" />
          </button>
        )}
      </div>
    )
  }
  const odSub = folders.filter((f) => f.parent === 'OneDrive')
  const staticKids = (p: string, depth: number): React.ReactNode =>
    expanded[p]
      ? (CTREE[p] ?? []).map((n) => {
          const cp = `${p}/${n}`
          return (
            <Fragment key={cp}>
              {row({ id: `c-${slug(cp)}`, p: cp, label: n, icon: <FolderIcon size={16} />, depth, chevron: !!CTREE[cp] })}
              {staticKids(cp, depth + 1)}
            </Fragment>
          )
        })
      : null
  return (
    <div className="w-[214px] shrink-0 overflow-y-auto overflow-x-hidden py-1.5 border-r border-[#EDEDED] bg-white">
      {row({ id: 'home', p: 'home', label: 'Home', icon: <KnownFolderIcon path="home" size={16} /> })}
      {row({ id: 'gallery', p: 'gallery', label: 'Gallery', icon: <KnownFolderIcon path="gallery" size={16} /> })}
      {row({ id: 'onedrive', p: 'OneDrive', label: 'OneDrive - Northwind Global', icon: <KnownFolderIcon path="OneDrive" size={16} />, chevron: true })}
      {expanded.OneDrive && odSub.map((f) => row({ id: `onedrive-${slug(f.name)}`, p: `OneDrive/${f.name}`, label: f.name, icon: <FolderIcon size={16} />, depth: 1 }))}
      <div className="h-px bg-[#E8E8E8] mx-3 my-1.5" />
      {ROOTS.map((r) => row({ id: r.toLowerCase(), p: r, label: r, icon: <KnownFolderIcon path={r} size={16} />, pin: true }))}
      {pins
        .filter((x) => !(ROOTS as readonly string[]).includes(x.path))
        .map((x) => row({ id: `pin-${slug(x.path)}`, p: x.path, label: displayName(x.path), icon: <KnownFolderIcon path={x.path === 'OneDrive' || x.path === 'C:' ? x.path : 'folder'} size={16} />, pin: true, pinId: x.id }))}
      <div className="h-px bg-[#E8E8E8] mx-3 my-1.5" />
      {row({ id: 'thispc', p: 'thispc', label: 'This PC', icon: <ThisPCIcon size={16} />, chevron: true })}
      {expanded.thispc && (
        <>
          {row({ id: 'drive-c', p: 'C:', label: 'Windows (C:)', icon: <DriveIcon size={16} />, depth: 1, chevron: true })}
          {staticKids('C:', 2)}
          {row({ id: 'drive-s', p: 'C:/Users/Public', label: 'Shared (\\\\nw-fs01) (S:)', icon: <DriveIcon size={16} network />, depth: 1, chevron: true })}
          {staticKids('C:/Users/Public', 2)}
        </>
      )}
      {row({ id: 'network', p: 'network', label: 'Network', icon: <NetworkIcon size={16} />, chevron: true })}
      {expanded.network && ['NW-FS01', 'NW-LT-0142', 'NW-BOS-PRT-SRV'].map((n) => row({ id: `net-${slug(n)}`, p: n === 'NW-FS01' ? 'C:/Users/Public' : 'network', label: n, icon: <NetworkIcon size={16} />, depth: 1 }))}
    </div>
  )
}

/* ───────────────────────── folder (details / icons) view ───────────────────────── */

function Header({ label, k, sort, setSort, w, flex }: any) {
  const on = sort.key === k
  return (
    <div
      role="columnheader"
      onClick={() => setSort({ key: k, dir: on ? -sort.dir : 1 })}
      className={`relative h-full flex items-center px-2 hover:bg-black/[0.04] cursor-default ${flex ? 'flex-1 min-w-0' : ''}`}
      style={flex ? undefined : { width: w }}
    >
      <span className="truncate">{label}</span>
      {on && <span className="absolute top-0 left-1/2 -translate-x-1/2 text-[8px] text-[#6B6B6B] leading-none">{sort.dir === 1 ? '▲' : '▼'}</span>}
      <span className="absolute right-0 top-1.5 bottom-1.5 w-px bg-[#E5E5E5]" />
    </div>
  )
}

function FolderView(props: {
  path: string
  items: Item[]
  view: string
  sel: string[]
  clip: { mode: string; keys: string[] } | null
  flash: string[]
  renaming: string | null
  renameVal: string
  setRenameVal: (v: string) => void
  commitRename: () => void
  cancelRename: () => void
  clickItem: (it: Item, e: React.MouseEvent) => void
  toggle: (k: string) => void
  openItem: (it: Item) => void
  checkboxes: boolean
  showExt: boolean
  sort: any
  setSort: any
  query: string
  groupBy: GroupBy
  compact: boolean
  dropTarget: string | null
  setDropTarget: (p: string | null) => void
  onDrop: (dest: string, keys: string[]) => void
  clearSel: () => void
  onContext: (e: React.MouseEvent, key?: string) => void
}) {
  const { items, view, sel, clip, renaming, path } = props
  const od = path.startsWith('OneDrive')
  const nameOf = (it: Item) => (props.showExt || it.kind !== 'file' ? it.name : it.name.replace(/\.[^.]+$/, ''))
  const agentOf = (it: Item) => (it.kind === 'file' ? `explorer-file-${it.id}` : `explorer-folder-${slug(it.name)}`)
  const checkAgent = (it: Item) => (it.kind === 'file' ? `explorer-check-${it.id}` : `explorer-check-folder-${slug(it.name)}`)
  const icon = (it: Item, size: number) =>
    it.kind === 'link' ? (
      <KnownFolderIcon path={it.path!} size={size} />
    ) : it.kind !== 'file' ? (
      <FolderIcon size={size} />
    ) : size > 40 && /\.(jpe?g|png)$/i.test(it.name) ? (
      <Thumb name={it.name} className="rounded-[3px] shadow-[0_0_0_1px_rgba(0,0,0,0.1)]" />
    ) : (
      <FileTypeIcon name={it.name} kind={it.file?.kind} size={size} />
    )

  const renameInput = (it: Item, className = '') => (
    <input
      autoFocus
      data-agent="explorer-rename-input"
      aria-label="Rename"
      value={props.renameVal}
      onChange={(e) => props.setRenameVal(e.target.value)}
      onFocus={(e) => {
        const v = e.target.value
        const dot = it.kind === 'file' ? v.lastIndexOf('.') : -1
        e.target.setSelectionRange(0, dot > 0 ? dot : v.length)
      }}
      onKeyDown={(e) => {
        e.stopPropagation()
        if (e.key === 'Enter') props.commitRename()
        if (e.key === 'Escape') props.cancelRename()
      }}
      onBlur={() => props.commitRename()}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      style={{ fontSize: 12 }}
      className={`h-[22px] px-1 outline-none border border-[#005FB8] bg-white text-[12px] select-text ${className}`}
    />
  )

  if (!items.length)
    return (
      <div className="flex-1 flex flex-col" onContextMenu={(e) => props.onContext(e)}>
        {view === 'details' && <DetailsHeader {...props} od={od} />}
        <div className="pt-6 text-center text-[12px] text-[#6B6B6B]">{props.query ? 'No items match your search.' : 'This folder is empty.'}</div>
      </div>
    )

  /** drag & drop: files/folders can be dragged onto folders (here or in the navigation pane) */
  const dnd = (it: Item) => ({
    draggable: (it.kind === 'file' || it.kind === 'folder') && renaming !== it.key,
    onDragStart: (e: React.DragEvent) => {
      const keys = sel.includes(it.key) ? sel : [it.key]
      e.dataTransfer.setData('application/x-explorer-items', JSON.stringify(keys))
      e.dataTransfer.effectAllowed = 'move'
    },
    onDragEnd: () => props.setDropTarget(null),
    ...(it.kind === 'folder'
      ? {
          onDragOver: (e: React.DragEvent) => {
            if (!e.dataTransfer.types.includes('application/x-explorer-items')) return
            e.preventDefault()
            if (props.dropTarget !== it.path) props.setDropTarget(it.path!)
          },
          onDragLeave: () => props.dropTarget === it.path && props.setDropTarget(null),
          onDrop: (e: React.DragEvent) => {
            e.preventDefault()
            const keys = e.dataTransfer.getData('application/x-explorer-items')
            if (keys) props.onDrop(it.path!, (JSON.parse(keys) as string[]).filter((k) => k !== it.key))
          },
        }
      : {}),
  })
  const isDrop = (it: Item) => it.kind === 'folder' && props.dropTarget === it.path
  const groups = groupItems(items, props.groupBy)
  const groupHeader = (label: string, n: number) =>
    props.groupBy !== 'none' && (
      <div className="flex items-center gap-2 h-8 mx-1 mt-1 px-1.5 text-[12px] text-[#1A1A1A]" data-agent={`explorer-grouphdr-${slug(label)}`}>
        <span className="font-semibold text-[#003E92]">{label}</span>
        <span className="text-[#6B6B6B]">({n})</span>
        <span className="flex-1 h-px bg-[#E5E5E5]" />
      </div>
    )
  const badge = (it: Item) =>
    (it.file?.createdBy === 'hworker' || it.file?.movedBy === 'hworker' || it.file?.updatedBy === 'hworker' || it.folder?.createdBy === 'hworker') && (
      <span className="shrink-0 inline-flex items-center gap-1 h-[18px] pl-0.5 pr-1.5 rounded-full bg-[#430693] text-white text-[10px] font-semibold" title="Organized by H-Worker" style={{ fontFamily: 'var(--font-brand)' }}>
        <img src={logoUrl('hworker')} className="w-3.5 h-3.5 rounded-full" alt="" /> H-Worker
      </span>
    )
  const common = (it: Item) => {
    const on = sel.includes(it.key)
    return {
      on,
      cutting: clip?.mode === 'cut' && clip.keys.includes(it.key),
      attrs: {
        'data-agent': agentOf(it),
        'aria-label': it.name,
        'aria-selected': on,
        onClick: (e: React.MouseEvent) => props.clickItem(it, e),
        onDoubleClick: () => props.openItem(it),
        onContextMenu: (e: React.MouseEvent) => props.onContext(e, it.key),
        ...dnd(it),
      },
    }
  }

  if (view === 'small' || view === 'list' || view === 'content') {
    const rowH = props.compact ? 22 : 26
    const cell = (it: Item) => {
      const { on, cutting, attrs } = common(it)
      if (view === 'content')
        return (
          <div key={it.key} role="row" {...attrs} className={`group flex items-center gap-3 mx-1 px-2 ${props.compact ? 'h-[46px]' : 'h-[58px]'} border-b border-[#F0F0F0] rounded-[4px] text-[12px] ${on || isDrop(it) ? 'bg-[#CCE8FF]' : 'hover:bg-[#E5F3FF]'} ${props.flash.includes(it.key) ? 'flash-new' : ''} ${cutting || it.hidden ? 'opacity-50' : ''}`}>
            {props.checkboxes && <CheckBox on={on} agent={checkAgent(it)} onClick={() => props.toggle(it.key)} visible />}
            <span className="w-10 h-10 shrink-0 flex items-center justify-center">{icon(it, 36)}</span>
            <div className="flex-1 min-w-0">
              {renaming === it.key ? renameInput(it, 'w-full') : <div className="truncate flex items-center gap-2">{nameOf(it)} {badge(it)}</div>}
              <div className="text-[#6B6B6B] truncate">{it.type}</div>
            </div>
            <div className="w-[200px] text-right text-[#6B6B6B] shrink-0">
              <div>Date modified: {fmtWhen(it.modified)}</div>
              {it.size && <div>Size: {it.size}</div>}
            </div>
          </div>
        )
      return (
        <div key={it.key} role="option" {...attrs} className={`group flex items-center gap-2 px-1.5 rounded-[4px] border text-[12px] ${on || isDrop(it) ? 'bg-[#CCE8FF] border-[#99D1FF]' : 'border-transparent hover:bg-[#E5F3FF]'} ${props.flash.includes(it.key) ? 'flash-new' : ''} ${cutting || it.hidden ? 'opacity-50' : ''}`} style={{ height: rowH }}>
          {props.checkboxes && <CheckBox on={on} agent={checkAgent(it)} onClick={() => props.toggle(it.key)} visible />}
          <span className="shrink-0 flex">{icon(it, 16)}</span>
          {renaming === it.key ? renameInput(it, 'flex-1 min-w-0') : <span className="truncate">{nameOf(it)}</span>}
        </div>
      )
    }
    return (
      <div className="flex-1 overflow-auto p-1" onClick={(e) => e.target === e.currentTarget && props.clearSel()} onContextMenu={(e) => e.target === e.currentTarget && props.onContext(e)} data-agent="explorer-list">
        {view === 'list' && props.groupBy === 'none' ? (
          <div className="h-full" style={{ display: 'grid', gridAutoFlow: 'column', gridTemplateRows: `repeat(auto-fill, ${rowH}px)`, gridAutoColumns: '240px', columnGap: 4 }} onClick={(e) => e.target === e.currentTarget && props.clearSel()}>
            {items.map(cell)}
          </div>
        ) : (
          groups.map((g) => (
            <div key={g.label || 'all'}>
              {groupHeader(g.label, g.items.length)}
              <div className={view === 'content' ? '' : 'grid gap-x-1 grid-cols-[repeat(auto-fill,minmax(220px,1fr))]'}>{g.items.map(cell)}</div>
            </div>
          ))
        )}
      </div>
    )
  }

  if (view !== 'details') {
    const xl = view === 'xl'
    const big = view === 'large'
    const tiles = view === 'tiles'
    return (
      <div className="flex-1 overflow-auto p-2" onClick={(e) => e.target === e.currentTarget && props.clearSel()} onContextMenu={(e) => e.target === e.currentTarget && props.onContext(e)}>
        {groups.map((g) => (
          <div key={g.label || 'all'}>
            {groupHeader(g.label, g.items.length)}
            <div className={`grid ${props.compact ? 'gap-0' : 'gap-1'} ${tiles ? 'grid-cols-[repeat(auto-fill,minmax(250px,1fr))]' : xl ? 'grid-cols-[repeat(auto-fill,150px)]' : big ? 'grid-cols-[repeat(auto-fill,108px)]' : 'grid-cols-[repeat(auto-fill,84px)]'}`}>
              {g.items.map((it) => {
                const { on, cutting, attrs } = common(it)
                return (
                  <div
                    key={it.key}
                    role="option"
                    {...attrs}
                    className={`group relative rounded-[4px] border ${on || isDrop(it) ? 'bg-[#CCE8FF] border-[#99D1FF]' : 'border-transparent hover:bg-[#E5F3FF]'} ${props.flash.includes(it.key) ? 'flash-new' : ''} ${cutting || it.hidden ? 'opacity-50' : ''} ${tiles ? 'flex items-center gap-3 p-2 h-[64px]' : 'flex flex-col items-center p-1.5 pt-2'}`}
                  >
                    {props.checkboxes && (
                      <span className="absolute left-1 top-1">
                        <CheckBox on={on} agent={checkAgent(it)} onClick={() => props.toggle(it.key)} visible />
                      </span>
                    )}
                    <span className={`flex items-center justify-center ${tiles ? 'w-12 h-12' : xl ? 'w-[136px] h-[120px]' : big ? 'w-[88px] h-[72px]' : 'w-12 h-12'}`}>{icon(it, tiles ? 44 : xl ? 120 : big ? 72 : 44)}</span>
                    {renaming === it.key ? (
                      renameInput(it, 'w-full mt-1 text-center')
                    ) : tiles ? (
                      <div className="min-w-0 text-[12px]">
                        <div className="truncate">{nameOf(it)}</div>
                        <div className="text-[#6B6B6B] truncate">{it.type}</div>
                        <div className="text-[#6B6B6B]">{it.size}</div>
                      </div>
                    ) : (
                      <span className="mt-1 text-[12px] text-center leading-[15px] line-clamp-2 break-words w-full">{nameOf(it)}</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <DetailsHeader {...props} od={od} />
      <div className="flex-1 overflow-auto pb-6" onClick={(e) => e.target === e.currentTarget && props.clearSel()} onContextMenu={(e) => e.target === e.currentTarget && props.onContext(e)} data-agent="explorer-list">
        {groups.map((g) => (
          <Fragment key={g.label || 'all'}>
            {groupHeader(g.label, g.items.length)}
            {g.items.map((it) => {
              const { on, cutting, attrs } = common(it)
              return (
                <div
                  key={it.key}
                  role="row"
                  {...attrs}
                  className={`group flex items-center ${props.compact ? 'h-[24px]' : 'h-[30px]'} mx-1 rounded-[4px] text-[12px] border ${on || isDrop(it) ? 'bg-[#CCE8FF] border-[#CCE8FF]' : 'border-transparent hover:bg-[#E5F3FF]'} ${props.flash.includes(it.key) ? 'flash-new' : ''}`}
                >
                  <div className={`flex-1 min-w-0 flex items-center gap-2 pl-1.5 pr-2 ${cutting || it.hidden ? 'opacity-50' : ''}`}>
                    {props.checkboxes && <CheckBox on={on} agent={checkAgent(it)} onClick={() => props.toggle(it.key)} visible />}
                    <span className="shrink-0 flex">{icon(it, 18)}</span>
                    {renaming === it.key ? renameInput(it, 'flex-1 min-w-0 -ml-1') : <span className="truncate">{nameOf(it)}</span>}
                    {badge(it)}
                  </div>
                  {od && (
                    <div className="w-[70px] px-2 flex items-center text-[#107C10]">{it.kind === 'file' && parseSize(it.size) > 1e6 ? <CloudCheckmark16Regular className="text-[#0F6CBD]" /> : <CheckmarkCircle16Filled />}</div>
                  )}
                  <div className="w-[160px] px-2 text-[#5F5F5F] truncate">{fmtWhen(it.modified)}</div>
                  <div className="w-[190px] px-2 text-[#5F5F5F] truncate">{it.type}</div>
                  <div className="w-[90px] px-2 text-[#5F5F5F] text-right truncate">{it.size}</div>
                </div>
              )
            })}
          </Fragment>
        ))}
      </div>
    </div>
  )
}

function DetailsHeader({ sort, setSort, od }: any) {
  return (
    <div className="h-[30px] shrink-0 flex items-center mx-1 text-[12px] text-[#3B3B3B] border-b border-transparent">
      <Header label="Name" k="name" sort={sort} setSort={setSort} flex />
      {od && <div className="w-[70px] px-2 h-full flex items-center relative">Status<span className="absolute right-0 top-1.5 bottom-1.5 w-px bg-[#E5E5E5]" /></div>}
      <Header label="Date modified" k="modified" sort={sort} setSort={setSort} w={160} />
      <Header label="Type" k="type" sort={sort} setSort={setSort} w={190} />
      <Header label="Size" k="size" sort={sort} setSort={setSort} w={90} />
    </div>
  )
}

/* ───────────────────────── Home ───────────────────────── */

function SectionHeader({ label, open, onToggle }: { label: string; open: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className="flex items-center gap-2 h-8 px-1 text-[14px] font-semibold text-[#1A1A1A] hover:bg-black/[0.03] rounded">
      {open ? <ChevronDown12Regular /> : <ChevronRight12Regular />}
      {label}
    </button>
  )
}

function HomeView({ files, navigate, openFile, sel, setSel, pins, favorites }: { files: Rec[]; navigate: (p: string) => void; openFile: (f: Rec) => void; sel: string[]; setSel: (s: string[]) => void; pins: Rec[]; favorites: Rec[] }) {
  const [openQ, setOpenQ] = useState(true)
  const [openF, setOpenF] = useState(true)
  const [openR, setOpenR] = useState(true)
  const base = [...ROOTS, 'Documents/Contracts'] as string[]
  const quick = [...base, ...pins.map((p) => p.path).filter((p) => !base.includes(p))]
  const recent = [...files].sort((a, b) => (a.modified < b.modified ? 1 : -1)).slice(0, 14)
  const favs = [...files.filter((f) => ['f-1', 'f-sys-od1', 'f-5'].includes(f.id)), ...favorites.map((x) => files.find((f) => f.id === x.fileId)).filter((f): f is Rec => !!f && !['f-1', 'f-sys-od1', 'f-5'].includes(f.id))]
  const Row = ({ f, i }: { f: Rec; i: number }) => {
    const k = `f:${f.id}`
    const on = sel.includes(k)
    return (
      <div
        role="row"
        data-agent={`explorer-file-${f.id}`}
        aria-label={f.name}
        onClick={() => setSel([k])}
        onDoubleClick={() => openFile(f)}
        className={`flex items-center h-[30px] rounded-[4px] text-[12px] border ${on ? 'bg-[#CCE8FF] border-[#CCE8FF]' : 'border-transparent hover:bg-[#E5F3FF]'}`}
        key={i}
      >
        <div className="flex-1 min-w-0 flex items-center gap-2 px-2">
          <FileTypeIcon name={f.name} kind={f.kind} size={18} />
          <span className="truncate">{f.name}</span>
        </div>
        <div className="w-[170px] px-2 text-[#5F5F5F] truncate">{fmtWhen(f.modified)}</div>
        <div className="w-[300px] px-2 text-[#5F5F5F] truncate">{prettyLoc(f.folder)}</div>
      </div>
    )
  }
  return (
    <div className="flex-1 overflow-auto px-5 py-3">
      <SectionHeader label="Quick access" open={openQ} onToggle={() => setOpenQ(!openQ)} />
      {openQ && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-1 mt-1 mb-4">
          {quick.map((q) => (
            <div
              key={q}
              role="option"
              data-agent={`explorer-quick-${slug(q)}`}
              aria-label={displayName(q)}
              onDoubleClick={() => navigate(q)}
              onClick={() => navigate(q)}
              className="flex items-center gap-3 h-[66px] px-3 rounded-[6px] hover:bg-[#E5F3FF] cursor-default"
            >
              <KnownFolderIcon path={q.includes('/') ? 'folder' : q} size={40} />
              <div className="min-w-0">
                <div className="text-[12px] truncate">{displayName(q)}</div>
                <div className="text-[11.5px] text-[#6B6B6B] flex items-center gap-1">
                  {q.includes('/') ? displayName(q.slice(0, q.lastIndexOf('/'))) : q.startsWith('OneDrive') ? 'OneDrive - Northwind Global' : 'Stored locally'} <Pin16Regular className="w-3 h-3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <SectionHeader label="Favorites" open={openF} onToggle={() => setOpenF(!openF)} />
      {openF && (
        <div className="mt-1 mb-4">
          {favs.map((f, i) => (
            <Row key={f.id} f={f} i={i} />
          ))}
        </div>
      )}
      <SectionHeader label="Recent" open={openR} onToggle={() => setOpenR(!openR)} />
      {openR && (
        <div className="mt-1">
          <div className="flex items-center h-[30px] text-[12px] text-[#3B3B3B]">
            <div className="flex-1 px-2">Name</div>
            <div className="w-[170px] px-2">Date modified</div>
            <div className="w-[300px] px-2">Location</div>
          </div>
          {recent.map((f, i) => (
            <Row key={f.id} f={f} i={i} />
          ))}
        </div>
      )}
    </div>
  )
}

/* ───────────────────────── This PC ───────────────────────── */

function ThisPCView({ navigate, sel, setSel }: { navigate: (p: string) => void; sel: string[]; setSel: (s: string[]) => void }) {
  const drives = [
    { id: 'C:', name: 'Windows (C:)', free: 182, total: 475, path: 'C:', icon: <DriveIcon size={44} /> },
    { id: 'S:', name: 'Shared (\\\\nw-fs01) (S:)', free: 1.42, total: 4, unit: 'TB', path: 'C:/Users/Public', icon: <DriveIcon size={44} network /> },
    { id: 'H:', name: 'alex.morgan (\\\\nw-fs01\\home) (H:)', free: 38.6, total: 50, path: 'Documents', icon: <DriveIcon size={44} network /> },
  ]
  return (
    <div className="flex-1 overflow-auto px-5 py-3">
      <div className="flex items-center gap-2 h-8 px-1 text-[14px] font-semibold">
        <ChevronDown12Regular /> Devices and drives
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(270px,300px))] gap-2 mt-1 mb-5">
        {drives.slice(0, 1).map((d) => (
          <Drive key={d.id} d={d} on={sel.includes(d.id)} onClick={() => setSel([d.id])} onOpen={() => navigate(d.path)} />
        ))}
      </div>
      <div className="flex items-center gap-2 h-8 px-1 text-[14px] font-semibold">
        <ChevronDown12Regular /> Network locations
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(270px,300px))] gap-2 mt-1">
        {drives.slice(1).map((d) => (
          <Drive key={d.id} d={d} on={sel.includes(d.id)} onClick={() => setSel([d.id])} onOpen={() => navigate(d.path)} />
        ))}
      </div>
    </div>
  )
}

function Drive({ d, on, onClick, onOpen }: any) {
  const used = 1 - d.free / d.total
  const unit = d.unit ?? 'GB'
  return (
    <div
      role="option"
      data-agent={`explorer-drive-${d.id[0].toLowerCase()}`}
      aria-label={d.name}
      onClick={onClick}
      onDoubleClick={onOpen}
      className={`flex items-center gap-3 p-2.5 rounded-[6px] border ${on ? 'bg-[#CCE8FF] border-[#99D1FF]' : 'border-transparent hover:bg-[#E5F3FF]'}`}
    >
      {d.icon}
      <div className="flex-1 min-w-0">
        <div className="text-[12px] truncate">{d.name}</div>
        <div className="h-[13px] mt-1 bg-[#E6E6E6] border border-[#BCBCBC]">
          <div className={`h-full ${used > 0.9 ? 'bg-[#DA2626]' : 'bg-[#26A0DA]'}`} style={{ width: `${used * 100}%` }} />
        </div>
        <div className="text-[11.5px] text-[#6B6B6B] mt-1">
          {d.free} {unit} free of {d.total} {unit}
        </div>
      </div>
    </div>
  )
}

/* ───────────────────────── Gallery ───────────────────────── */

function GalleryView({ files }: { files: Rec[] }) {
  const [coll, setColl] = useState<string>('All collections')
  const [menuOpen, setMenuOpen] = useState(false)
  const [view, setView] = useState<string | null>(null)
  const COLLS: [string, (f: Rec) => boolean][] = [
    ['All collections', () => true],
    ['Pictures', (f) => f.folder === 'Pictures'],
    ['Camera Roll', (f) => f.folder === 'Pictures/Camera Roll'],
    ['Screenshots', (f) => f.folder === 'Pictures/Screenshots' || f.name.startsWith('Screenshot')],
    ['Downloads', (f) => f.folder.startsWith('Downloads')],
  ]
  const pred = COLLS.find(([n]) => n === coll)?.[1] ?? (() => true)
  const imgs = files.filter((f) => /\.(jpe?g|png)$/i.test(f.name) && pred(f)).sort((a, b) => (a.modified < b.modified ? 1 : -1))
  const groups: Record<string, Rec[]> = {}
  for (const f of imgs) {
    const k = new Date(f.modified).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    ;(groups[k] ??= []).push(f)
  }
  const idx = view ? imgs.findIndex((f) => f.id === view) : -1
  const cur = idx >= 0 ? imgs[idx] : null
  return (
    <div className="relative flex-1 min-h-0 flex flex-col">
    <div className="flex-1 overflow-auto px-5 py-3">
      <div className="flex items-center gap-2 mb-2 relative">
        <button data-agent="explorer-gallery-collection" onPointerDown={(e) => e.stopPropagation()} onClick={() => setMenuOpen(!menuOpen)} className="h-8 px-3 rounded-[4px] border border-black/10 bg-white text-[12px] flex items-center gap-2 hover:bg-[#F5F5F5]">
          Collection: {coll} <ChevronDown12Regular />
        </button>
        {menuOpen && (
          <Menu className="left-0 top-9 w-[220px]">
            {COLLS.map(([n]) => (
              <MenuItem key={n} check={coll === n} label={n} onClick={() => { setColl(n); setMenuOpen(false) }} />
            ))}
          </Menu>
        )}
        <span className="text-[12px] text-[#6B6B6B]">{imgs.length} item{imgs.length === 1 ? '' : 's'}</span>
      </div>
      {!imgs.length && <div className="pt-8 text-center text-[12px] text-[#6B6B6B]">No photos in this collection.</div>}
      {Object.entries(groups).map(([k, list]) => (
        <div key={k} className="mb-5">
          <div className="text-[14px] font-semibold mb-2">{k}</div>
          <div className="flex flex-wrap gap-1.5">
            {list.map((f) => (
              <div key={f.id} data-agent={`explorer-gallery-${f.id}`} title={f.name} onDoubleClick={() => setView(f.id)} className="h-[150px] rounded-[4px] overflow-hidden hover:ring-2 hover:ring-[#005FB8] cursor-pointer" style={{ width: f.name.startsWith('Screenshot') ? 240 : 200 }}>
                <Thumb name={f.name} className="w-full h-full" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
      {cur && (
        <div className="absolute inset-0 z-40 bg-black/85 flex flex-col" onKeyDown={(e) => { if (e.key === 'Escape') setView(null); if (e.key === 'ArrowRight' && idx < imgs.length - 1) setView(imgs[idx + 1].id); if (e.key === 'ArrowLeft' && idx > 0) setView(imgs[idx - 1].id) }} tabIndex={-1} ref={(el) => el?.focus()}>
          <div className="h-10 flex items-center px-4 text-white text-[12px] gap-3">
            <span className="flex-1 truncate">{cur.name}</span>
            <span className="text-white/70">{idx + 1} of {imgs.length} · {cur.size} · {fmtWhen(cur.modified)}</span>
            <button aria-label="Close" onClick={() => setView(null)} className="w-8 h-8 rounded hover:bg-white/15 flex items-center justify-center"><Dismiss12Regular /></button>
          </div>
          <div className="flex-1 min-h-0 flex items-center justify-center gap-4 px-4 pb-6">
            <button aria-label="Previous" disabled={idx === 0} onClick={() => setView(imgs[idx - 1].id)} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 flex items-center justify-center"><ArrowLeft20Regular /></button>
            <div className="flex-1 h-full max-w-[900px] rounded overflow-hidden"><Thumb name={cur.name} className="w-full h-full" /></div>
            <button aria-label="Next" disabled={idx === imgs.length - 1} onClick={() => setView(imgs[idx + 1].id)} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 flex items-center justify-center"><ArrowRight20Regular /></button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ───────────────────────── Network ───────────────────────── */

function NetworkView({ sel, setSel, onOpen }: { sel: string[]; setSel: (s: string[]) => void; onOpen: (n: string) => void }) {
  const groups = [
    { name: 'Computer', items: ['NW-FS01', 'NW-LT-0142', 'NW-BOS-PRT-SRV'] },
    { name: 'Media Devices', items: ['BOS-3F-Conference Room (Surface Hub)'] },
  ]
  return (
    <div className="flex-1 overflow-auto px-5 py-3">
      {groups.map((g) => (
        <div key={g.name} className="mb-4">
          <div className="flex items-center gap-2 h-8 px-1 text-[14px] font-semibold">
            <ChevronDown12Regular /> {g.name} ({g.items.length})
          </div>
          <div className="flex flex-wrap gap-1">
            {g.items.map((n) => (
              <div key={n} data-agent={`explorer-network-${slug(n)}`} onClick={() => setSel([n])} onDoubleClick={() => onOpen(n)} className={`w-[260px] flex items-center gap-3 p-2 rounded-[6px] border ${sel.includes(n) ? 'bg-[#CCE8FF] border-[#99D1FF]' : 'border-transparent hover:bg-[#E5F3FF]'}`}>
                <NetworkIcon size={36} />
                <span className="text-[12px] truncate">{n}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ───────────────────────── Recycle Bin ───────────────────────── */

function RecycleView({ items, sel, setSel, toggle, checkboxes, sort, setSort, onOpen }: { items: Rec[]; sel: string[]; setSel: (s: string[]) => void; toggle: (k: string) => void; checkboxes: boolean; sort: any; setSort: any; onOpen: (id: string) => void }) {
  const list = [...items].sort((a, b) => {
    if (sort.key === 'name') return sort.dir * a.name.localeCompare(b.name)
    if (sort.key === 'size') return sort.dir * (parseSize(a.size) - parseSize(b.size))
    return sort.dir * (a.deleted < b.deleted ? 1 : -1)
  })
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="h-[30px] shrink-0 flex items-center mx-1 text-[12px] text-[#3B3B3B]">
        <Header label="Name" k="name" sort={sort} setSort={setSort} flex />
        <div className="w-[220px] px-2">Original location</div>
        <Header label="Date deleted" k="modified" sort={sort} setSort={setSort} w={160} />
        <Header label="Size" k="size" sort={sort} setSort={setSort} w={80} />
        <div className="w-[170px] px-2">Item type</div>
      </div>
      <div className="flex-1 overflow-auto">
        {list.length === 0 && <div className="pt-6 text-center text-[12px] text-[#6B6B6B]">This folder is empty.</div>}
        {list.map((r) => {
          const k = `r:${r.id}`
          const on = sel.includes(k)
          return (
            <div
              key={r.id}
              role="row"
              data-agent={`explorer-recycle-${r.id}`}
              aria-label={r.name}
              onClick={(e) => (e.ctrlKey || e.metaKey ? toggle(k) : setSel([k]))}
              onDoubleClick={() => onOpen(r.id)}
              className={`group flex items-center h-[30px] mx-1 rounded-[4px] text-[12px] border ${on ? 'bg-[#CCE8FF] border-[#CCE8FF]' : 'border-transparent hover:bg-[#E5F3FF]'}`}
            >
              <div className="flex-1 min-w-0 flex items-center gap-2 pl-1.5 pr-2">
                {checkboxes && <CheckBox on={on} agent={`explorer-check-${r.id}`} onClick={() => toggle(k)} visible />}
                {r.isFolder ? <FolderIcon size={18} /> : <FileTypeIcon name={r.name} kind={r.kind} size={18} />}
                <span className="truncate">{r.name}</span>
              </div>
              <div className="w-[220px] px-2 text-[#5F5F5F] truncate">{winPath(r.originalFolder)}</div>
              <div className="w-[160px] px-2 text-[#5F5F5F] truncate">{fmtWhen(r.deleted)}</div>
              <div className="w-[80px] px-2 text-[#5F5F5F] text-right">{r.size}</div>
              <div className="w-[170px] px-2 text-[#5F5F5F] truncate">{typeName(r.name, r.isFolder)}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ───────────────────────── details pane ───────────────────────── */

function DetailsPane({ item, count, path }: { item?: Item; count: number; path: string }) {
  return (
    <div className="w-[300px] shrink-0 border-l border-[#EDEDED] bg-white overflow-auto p-4 text-[12px]">
      {!item ? (
        <div className="flex flex-col items-center text-center pt-10 text-[#5F5F5F]">
          <KnownFolderIcon path={ROOTS.includes(path as any) || SPECIAL.includes(path as any) ? path : 'folder'} size={96} />
          <div className="mt-3 text-[14px] text-[#1A1A1A]">{displayName(path)}</div>
          <div className="mt-6">{count ? `${count} items selected` : 'Select a single file to get more information and share your cloud content.'}</div>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-4">
            {item.kind === 'file' ? <FileTypeIcon name={item.name} size={20} /> : <FolderIcon size={20} />}
            <span className="text-[14px] font-semibold truncate">{item.name}</span>
          </div>
          <div className="h-[170px] rounded-[6px] bg-[#F3F3F3] flex items-center justify-center mb-4 overflow-hidden">
            {item.kind === 'file' && /\.(jpe?g|png)$/i.test(item.name) ? <Thumb name={item.name} className="w-full h-full" /> : item.kind === 'file' ? <FileTypeIcon name={item.name} size={96} /> : <FolderIcon size={96} />}
          </div>
          <div className="font-semibold mb-2">Properties</div>
          {[
            ['Type', item.type],
            ['Size', item.size || '—'],
            ['File location', winPath(item.kind === 'file' ? item.file!.folder : item.folder?.parent ?? path)],
            ['Date modified', fmtWhen(item.modified)],
            ['Date created', fmtWhen(item.file?.modified ?? item.folder?.created)],
          ].map(([k, v]) => (
            <div key={k} className="mb-2.5">
              <div className="text-[#6B6B6B]">{k}</div>
              <div className="break-words">{v}</div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}

/* ───────────────────────── preview pane ───────────────────────── */

function PreviewPane({ item, count, openItem }: { item?: Item; count: number; openItem: (it: Item) => void }) {
  const f = item?.kind === 'file' ? item.file : undefined
  const note = useRecord('notepad.notes', f?.open?.appId === 'notepad' ? f.open.params?.noteId : undefined)
  const docId = f?.open?.appId === 'acrobat' ? f.open.params?.doc : undefined
  const pdf = f && /\.pdf$/i.test(f.name) ? getDoc(docId ?? `file:${f.name}`, docId ? undefined : f.name) : null
  let body: React.ReactNode
  if (!item) body = <div className="pt-16 text-center text-[#6B6B6B]">{count > 1 ? `${count} items selected` : 'Select a file to preview.'}</div>
  else if (item.kind !== 'file') body = <div className="pt-16 flex flex-col items-center text-[#6B6B6B]"><FolderIcon size={96} /><div className="mt-3">{item.name}</div></div>
  else if (/\.(jpe?g|png)$/i.test(item.name)) body = <div className="rounded-[6px] overflow-hidden h-[220px]"><Thumb name={item.name} className="w-full h-full" /></div>
  else if (note) body = <pre className="whitespace-pre-wrap break-words text-[11.5px] leading-[1.45] text-[#1A1A1A]" style={{ fontFamily: 'Consolas, "Courier New", monospace' }}>{note.content || '(empty)'}</pre>
  else if (pdf)
    body = (
      <AnnoCtx.Provider value={{ highlights: new Set(), notes: {}, tool: 'select', onField: () => {}, noAgent: true }}>
        <div className="flex flex-col items-center gap-3">
          {pdf.pages.slice(0, 3).map((P, i) => (
            <div key={i} className="w-[245px] h-[317px] overflow-hidden bg-white shadow-[0_1px_4px_rgba(0,0,0,0.25)] cursor-pointer" onDoubleClick={() => openItem(item)}>
              <div className="origin-top-left pointer-events-none" style={{ transform: 'scale(0.3)' }}>{P()}</div>
            </div>
          ))}
          {pdf.pages.length > 3 && <div className="text-[#6B6B6B]">+{pdf.pages.length - 3} more pages</div>}
        </div>
      </AnnoCtx.Provider>
    )
  else
    body = (
      <div className="pt-16 flex flex-col items-center text-[#6B6B6B] text-center">
        <FileTypeIcon name={item.name} kind={f?.kind} size={96} />
        <div className="mt-3 text-[#1A1A1A]">{item.name}</div>
        <div className="mt-2">No preview available.</div>
      </div>
    )
  return (
    <div className="w-[300px] shrink-0 border-l border-[#EDEDED] bg-white overflow-auto p-4 text-[12px]" data-agent="explorer-preview">
      {body}
    </div>
  )
}

/* ───────────────────────── properties / options dialogs ───────────────────────── */

function Dialog({ title, icon, children, footer, close, width = 380 }: { title: string; icon?: React.ReactNode; children: React.ReactNode; footer: React.ReactNode; close: () => void; width?: number }) {
  return (
    <div className="absolute inset-0 z-50 bg-black/20 flex items-center justify-center" onPointerDown={(e) => e.stopPropagation()} onKeyDown={(e) => e.key === 'Escape' && close()}>
      <div className="rounded-lg bg-[#F3F3F3] shadow-[0_16px_40px_rgba(0,0,0,0.3)] overflow-hidden border border-black/10" style={{ width }}>
        <div className="h-8 flex items-center gap-2 pl-3 text-[12px]">
          {icon}
          <span className="flex-1 truncate">{title}</span>
          <button aria-label="Close" onClick={close} className="w-11 h-8 flex items-center justify-center hover:bg-[#C42B1C] hover:text-white"><Dismiss12Regular /></button>
        </div>
        <div className="mx-3 mb-3 rounded-[4px] bg-white border border-black/[0.08] p-4 text-[12px]">{children}</div>
        <div className="px-3 pb-3 flex justify-end gap-2">{footer}</div>
      </div>
    </div>
  )
}
const dlgBtn = 'h-8 min-w-[80px] px-4 rounded-[4px] bg-[#FBFBFB] border border-black/10 hover:bg-[#F5F5F5] text-[12px] disabled:opacity-40'
const dlgPrimary = 'h-8 min-w-[80px] px-4 rounded-[4px] bg-[#005FB8] hover:bg-[#1A6FC0] text-white text-[12px]'
const PropRow = ({ k, v }: { k: string; v: React.ReactNode }) => (
  <div className="flex py-1">
    <div className="w-[110px] shrink-0 text-[#1A1A1A]">{k}:</div>
    <div className="flex-1 min-w-0 break-words text-[#1A1A1A]">{v}</div>
  </div>
)

function PropertiesDialog({ target, item, files, folders, recycle, close, rename, restore }: {
  target: { kind: 'item'; key: string } | { kind: 'folder'; path: string } | { kind: 'recycle'; id: string }
  item?: Item
  files: Rec[]
  folders: Rec[]
  recycle: Rec[]
  close: () => void
  rename: (it: Item, name: string) => void
  restore: (id: string) => void
}) {
  const folderPath = target.kind === 'folder' ? target.path : item && item.kind !== 'file' ? item.path! : null
  const [name, setName] = useState(item?.name ?? (folderPath ? displayName(folderPath) : ''))
  const [readOnly, setReadOnly] = useState(!!item?.file?.readOnly)
  if (target.kind === 'recycle') {
    const r = recycle.find((x) => x.id === target.id)
    if (!r) return null
    return (
      <Dialog title={`${r.name} Properties`} icon={<FileTypeIcon name={r.name} size={14} />} close={close} footer={<><button data-agent="explorer-props-restore" onClick={() => { restore(r.id); close() }} className={dlgBtn}>Restore</button><button onClick={close} className={dlgPrimary}>OK</button></>}>
        <div className="flex items-center gap-3 pb-3 mb-2 border-b border-black/10">{r.isFolder ? <FolderIcon size={32} /> : <FileTypeIcon name={r.name} kind={r.kind} size={32} />}<span className="text-[13px]">{r.name}</span></div>
        <PropRow k="Origin" v={winPath(r.originalFolder)} />
        <PropRow k="Type" v={typeName(r.name, r.isFolder)} />
        <PropRow k="Size" v={r.size || '—'} />
        <PropRow k="Deleted" v={fmtWhen(r.deleted)} />
        <PropRow k="Modified" v={fmtWhen(r.modified)} />
      </Dialog>
    )
  }
  const isFile = item?.kind === 'file'
  const f = item?.file
  const within = folderPath ? { files: files.filter((x) => x.folder === folderPath || x.folder.startsWith(folderPath + '/')), folders: folders.filter((x) => x.parent === folderPath || x.parent.startsWith(folderPath + '/')) } : null
  const bytes = isFile ? parseSize(f!.size) : within ? within.files.reduce((n, x) => n + parseSize(x.size), 0) : 0
  const editable = !!item && (item.kind === 'file' || item.kind === 'folder')
  const apply = () => {
    if (item && editable && name.trim() && name.trim() !== item.name) rename(item, name)
    if (f && readOnly !== !!f.readOnly) db.update('files', f.id, { readOnly })
  }
  const opener = f?.open?.appId ? APP_NAMES[f.open.appId] ?? f.open.appId : /\.pdf$/i.test(f?.name ?? '') ? 'Adobe Acrobat' : /\.txt$/i.test(f?.name ?? '') ? 'Notepad' : 'Pick an app'
  return (
    <Dialog title={`${item?.name ?? displayName(folderPath ?? '')} Properties`} icon={isFile ? <FileTypeIcon name={item!.name} size={14} /> : <FolderIcon size={14} />} close={close} footer={<><button data-agent="explorer-props-ok" onClick={() => { apply(); close() }} className={dlgPrimary}>OK</button><button onClick={close} className={dlgBtn}>Cancel</button><button onClick={apply} className={dlgBtn}>Apply</button></>}>
      <div className="flex items-center gap-3 pb-3 mb-2 border-b border-black/10">
        {isFile ? <FileTypeIcon name={item!.name} kind={f?.kind} size={32} /> : <FolderIcon size={32} />}
        <input data-agent="explorer-props-name" disabled={!editable} value={name} onChange={(e) => setName(e.target.value)} className="flex-1 h-7 px-2 border border-black/15 rounded-[3px] outline-none focus:border-[#005FB8] disabled:bg-[#F5F5F5]" style={{ fontSize: 12 }} />
      </div>
      <PropRow k="Type of file" v={isFile ? `${item!.type} (.${extOf(item!.name)})` : 'File folder'} />
      {isFile && <PropRow k="Opens with" v={opener} />}
      <div className="h-px bg-black/10 my-2" />
      <PropRow k="Location" v={winPath(isFile ? f!.folder : folderPath!.includes('/') ? folderPath!.slice(0, folderPath!.lastIndexOf('/')) : folderPath!)} />
      <PropRow k="Size" v={`${fmtSize(bytes)} (${Math.round(bytes).toLocaleString()} bytes)`} />
      <PropRow k="Size on disk" v={`${fmtSize(Math.ceil(bytes / 4096) * 4096 || 4096)}`} />
      {within && <PropRow k="Contains" v={`${within.files.length} Files, ${within.folders.length} Folders`} />}
      <div className="h-px bg-black/10 my-2" />
      <PropRow k="Created" v={fmtWhen(isFile ? f!.modified : item?.folder?.created ?? item?.modified)} />
      <PropRow k="Modified" v={fmtWhen(item?.modified ?? new Date().toISOString())} />
      <PropRow k="Accessed" v={fmtWhen(new Date().toISOString())} />
      <div className="h-px bg-black/10 my-2" />
      <div className="flex items-center gap-4 py-1">
        <span className="w-[110px]">Attributes:</span>
        <label className="flex items-center gap-1.5"><input type="checkbox" disabled={!isFile} checked={readOnly} onChange={(e) => setReadOnly(e.target.checked)} /> Read-only</label>
      </div>
    </Dialog>
  )
}

const APP_NAMES: Record<string, string> = { acrobat: 'Adobe Acrobat', notepad: 'Notepad', word: 'Word', excel: 'Excel', powerpoint: 'PowerPoint', edge: 'Microsoft Edge', explorer: 'File Explorer' }

function OptionsDialog({ close, values, apply, clearHistory }: { close: () => void; values: { showExt: boolean; checkboxes: boolean; hiddenItems: boolean; compact: boolean; navPane: boolean; previewPane: boolean }; apply: (v: typeof values) => void; clearHistory: () => void }) {
  const [v, setV] = useState(values)
  const [tab, setTab] = useState<'General' | 'View'>('View')
  const [cleared, setCleared] = useState(false)
  const box = (k: keyof typeof values, label: string) => (
    <label key={k} className="flex items-center gap-2 py-1">
      <input type="checkbox" data-agent={`explorer-option-${k}`} checked={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.checked })} /> {label}
    </label>
  )
  return (
    <Dialog title="Folder Options" icon={<FolderIcon size={14} />} close={close} width={420} footer={<><button data-agent="explorer-options-ok" onClick={() => apply(v)} className={dlgPrimary}>OK</button><button onClick={close} className={dlgBtn}>Cancel</button><button onClick={() => apply(v)} className={dlgBtn}>Apply</button></>}>
      <div className="flex gap-1 -mt-1 mb-3 border-b border-black/10">
        {(['General', 'View'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`h-7 px-3 -mb-px border-b-2 ${tab === t ? 'border-[#005FB8] font-semibold' : 'border-transparent hover:bg-black/[0.04]'}`}>{t}</button>
        ))}
      </div>
      {tab === 'View' ? (
        <>
          <div className="font-semibold mb-1">Advanced settings</div>
          {box('showExt', 'Show file name extensions')}
          {box('checkboxes', 'Use check boxes to select items')}
          {box('hiddenItems', 'Show hidden files, folders, and drives')}
          {box('compact', 'Decrease space between items (compact view)')}
          {box('navPane', 'Show navigation pane')}
          {box('previewPane', 'Show preview handlers in preview pane')}
        </>
      ) : (
        <>
          <div className="font-semibold mb-1">Privacy</div>
          <div className="flex items-center gap-3 py-1">
            <span className="flex-1">Clear File Explorer history</span>
            <button data-agent="explorer-options-clear" onClick={() => { clearHistory(); setCleared(true) }} className={dlgBtn}>{cleared ? 'Cleared' : 'Clear'}</button>
          </div>
        </>
      )}
    </Dialog>
  )
}
