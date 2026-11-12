import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Add16Regular,
  Dismiss12Regular,
  Dismiss16Regular,
  Settings20Regular,
  Circle12Filled,
  ArrowLeft20Regular,
  ArrowUp16Regular,
  ArrowDown16Regular,
  ChevronRight12Regular,
  ChevronDown12Regular,
  ChevronUp16Regular,
  ChevronDown16Regular,
  TextFont20Regular,
  Color20Regular,
  TextWrap20Regular,
  Info20Regular,
  Options16Regular,
} from '@fluentui/react-icons'
import type { AppProps } from '@/os/registry'
import { logoUrl } from '@/os/registry'
import { WindowControls } from '@/os/Window'
import { useDesk, useWin } from '@/os/context'
import { db, uid, useCollection, useRecord, type Rec } from '@/db/db'
import { FileTypeIcon, FolderIcon, KnownFolderIcon, extOf } from '@/apps/explorer/icons'

/** notepad.notes: { id, name, content, saved, modified, path?, createdBy? } */
/** notepad.prefs: { id: 'prefs', theme, font, fontStyle, fontSize, wrap, status, spell, copilot, page } — remembered across sessions */

type MenuId = 'file' | 'edit' | 'view' | 'recent' | 'copilot' | null
type Dialog = null | 'open' | 'saveas' | 'goto' | 'font' | 'print' | 'page'
type MenuRow = [string, string?, (() => void)?, string?, boolean?]

const ROOTS = ['Desktop', 'Documents', 'Downloads', 'Pictures', 'Music', 'Videos', 'OneDrive']
const FONTS = ['Consolas', 'Cascadia Mono', 'Cascadia Code', 'Courier New', 'Lucida Console', 'Segoe UI', 'Arial', 'Calibri', 'Georgia', 'Times New Roman']
const STYLES = ['Regular', 'Italic', 'Bold', 'Bold Italic']
const SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72]
const PRINTERS = ['NW-BOS-3F-HP LaserJet', 'Microsoft Print to PDF', 'OneNote (Desktop)']

const THEMES: Record<'light' | 'dark', Record<string, string>> = {
  light: { '--n-bg': '#F3F3F3', '--n-strip': '#EEEEEE', '--n-tab': '#FBFBFB', '--n-tabh': 'rgba(255,255,255,0.6)', '--n-ed': '#FBFBFB', '--n-tx': '#1A1A1A', '--n-sub': '#6B6B6B', '--n-menu': '#F9F9F9', '--n-hov': 'rgba(0,0,0,0.05)', '--n-act': 'rgba(0,0,0,0.06)', '--n-line': 'rgba(0,0,0,0.08)', '--n-in': '#FFFFFF', '--n-acc': '#005FB8', '--n-card': '#FFFFFF' },
  dark: { '--n-bg': '#202020', '--n-strip': '#1C1C1C', '--n-tab': '#282828', '--n-tabh': 'rgba(255,255,255,0.05)', '--n-ed': '#282828', '--n-tx': '#FFFFFF', '--n-sub': '#B8B8B8', '--n-menu': '#2C2C2C', '--n-hov': 'rgba(255,255,255,0.07)', '--n-act': 'rgba(255,255,255,0.09)', '--n-line': 'rgba(255,255,255,0.1)', '--n-in': '#1F1F1F', '--n-acc': '#4CC2FF', '--n-card': '#2B2B2B' },
}

const DEFAULT_PREFS = { theme: 'light', font: 'Consolas', fontStyle: 'Regular', fontSize: 11, wrap: true, status: true, spell: false, copilot: true, page: { paper: 'Letter', orientation: 'Portrait', margins: '0.75', header: '&f', footer: 'Page &p' } }

export default function Notepad({ win, params }: AppProps) {
  const notes = useCollection('notepad.notes')
  const prefsRec = useRecord('notepad.prefs', 'prefs')
  const prefs = { ...DEFAULT_PREFS, ...(prefsRec ?? {}) } as typeof DEFAULT_PREFS
  const setPref = (p: Partial<typeof DEFAULT_PREFS>) => db.upsert('notepad.prefs', { id: 'prefs', ...prefs, ...p })
  const { isAgent, open, toast } = useDesk()
  const { setTitle, close } = useWin()
  const [tabs, setTabs] = useState<string[]>(() => [])
  const [active, setActive] = useState<string | null>(null)
  const [menu, setMenu] = useState<MenuId>(null)
  const [zoom, setZoom] = useState(100)
  const wrap = prefs.wrap
  const status = prefs.status
  const setWrap = (v: boolean) => setPref({ wrap: v })
  const setStatus = (v: boolean) => setPref({ status: v })
  const [caret, setCaret] = useState({ ln: 1, col: 1, sel: 0 })
  const [dialog, setDialog] = useState<Dialog>(null)
  const [settings, setSettings] = useState(false)
  const [find, setFind] = useState<null | { replace: boolean }>(null)
  const [findText, setFindText] = useState('')
  const [replaceText, setReplaceText] = useState('')
  const [matchCase, setMatchCase] = useState(false)
  const [wrapAround, setWrapAround] = useState(true)
  const [findOpts, setFindOpts] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const ta = useRef<HTMLTextAreaElement>(null)
  const findInput = useRef<HTMLInputElement>(null)
  const clip = useRef('')
  const hist = useRef<Record<string, { undo: string[]; redo: string[]; at: number }>>({})

  const newNote = (name?: string, content = '') => {
    const id = uid('n')
    const untitled = name ?? 'Untitled'
    db.insert('notepad.notes', { id, name: untitled, content, saved: name ? content : '', modified: new Date().toISOString(), untitled: !name, createdBy: isAgent ? 'hworker' : undefined })
    setTabs((t) => [...t, id])
    setActive(id)
    return id
  }
  const openNote = (id: string) => {
    setTabs((t) => (t.includes(id) ? t : [...t, id]))
    setActive(id)
    setSettings(false)
  }

  // deep links: {noteId} | {new: {name, content}}
  useEffect(() => {
    if (params?.noteId && db.find('notepad.notes', params.noteId)) {
      setTabs((t) => (t.includes(params.noteId) ? t : [...t, params.noteId]))
      setActive(params.noteId)
    } else if (params?.new) newNote(params.new.name, params.new.content ?? '')
    else if (!tabs.length) {
      const first = db.get('notepad.notes')[0]
      if (first) {
        setTabs([first.id])
        setActive(first.id)
      } else newNote()
    }
  }, [win.nonce])

  const note = notes.find((n) => n.id === active)
  const dirty = (n: any) => !!n && n.saved !== undefined && n.content !== n.saved
  useEffect(() => {
    if (note) setTitle(`${dirty(note) ? '*' : ''}${note.name} - Notepad`)
  }, [note?.name, note?.content, note?.saved])

  /* ── editing + undo ── */
  const record = (id: string, prev: string, group: boolean) => {
    const h = (hist.current[id] ??= { undo: [], redo: [], at: 0 })
    const now = Date.now()
    if (!group || now - h.at > 700 || !h.undo.length) h.undo.push(prev)
    if (h.undo.length > 200) h.undo.shift()
    h.redo = []
    h.at = now
  }
  const update = (content: string, group = true) => {
    if (!note) return
    record(note.id, note.content, group)
    db.update('notepad.notes', note.id, { content, saved: note.saved ?? note.content, updatedBy: isAgent ? 'hworker' : note.updatedBy })
  }
  const undo = (redo = false) => {
    setMenu(null)
    if (!note) return
    const h = hist.current[note.id]
    const from = redo ? h?.redo : h?.undo
    if (!h || !from?.length) return
    const prev = from.pop()!
    ;(redo ? h.undo : h.redo).push(note.content)
    h.at = 0
    db.update('notepad.notes', note.id, { content: prev, saved: note.saved ?? note.content })
  }

  /* ── files ── */
  const linkedFile = (id: string) => db.get('files').find((x) => x.open?.params?.noteId === id)
  const sizeOf = (s: string) => `${Math.max(1, Math.ceil(s.length / 1024))} KB`
  const save = () => {
    setMenu(null)
    if (!note) return
    let name = note.name
    if (note.untitled) name = (note.content.split(/\r?\n/)[0].trim().slice(0, 40) || 'Untitled') + '.txt'
    db.update('notepad.notes', note.id, { saved: note.content, name, untitled: false, modified: new Date().toISOString() })
    // keep the Explorer file in sync
    const f = db.get('files').find((x) => x.open?.params?.noteId === note.id)
    const size = `${Math.max(1, Math.ceil(note.content.length / 1024))} KB`
    if (f) db.update('files', f.id, { name, size, modified: new Date().toISOString() })
    else db.insert('files', { id: uid('f'), name, folder: note.path ?? 'Documents', kind: 'txt', size, modified: new Date().toISOString(), open: { appId: 'notepad', params: { noteId: note.id } }, createdBy: isAgent ? 'hworker' : undefined })
  }
  const saveAll = () => {
    setMenu(null)
    for (const id of tabs) {
      const n = db.find('notepad.notes', id)
      if (!n || (!dirty(n) && !n.untitled)) continue
      const name = n.untitled ? (n.content.split(/\r?\n/)[0].trim().slice(0, 40) || 'Untitled') + '.txt' : n.name
      db.update('notepad.notes', id, { saved: n.content, name, untitled: false, modified: new Date().toISOString() })
      const f = linkedFile(id)
      if (f) db.update('files', f.id, { name, size: sizeOf(n.content), modified: new Date().toISOString() })
      else db.insert('files', { id: uid('f'), name, folder: n.path ?? 'Documents', kind: 'txt', size: sizeOf(n.content), modified: new Date().toISOString(), open: { appId: 'notepad', params: { noteId: id } }, createdBy: isAgent ? 'hworker' : undefined })
    }
  }
  /** Save as: writes a new file; the original file keeps its last saved content */
  const saveAs = (folder: string, rawName: string) => {
    if (!note) return
    const name = /\.[a-z0-9]+$/i.test(rawName) ? rawName : rawName + '.txt'
    const now = new Date().toISOString()
    const f = linkedFile(note.id)
    if (f && !note.untitled) {
      const id = uid('n')
      db.insert('notepad.notes', { id, name, content: note.content, saved: note.content, modified: now, path: folder, createdBy: isAgent ? 'hworker' : undefined })
      db.update('notepad.notes', note.id, { content: note.saved ?? note.content })
      db.insert('files', { id: uid('f'), name, folder, kind: extOf(name) || 'txt', size: sizeOf(note.content), modified: now, open: { appId: 'notepad', params: { noteId: id } }, createdBy: isAgent ? 'hworker' : undefined })
      setTabs((t) => t.map((x) => (x === note.id ? id : x)))
      setActive(id)
    } else {
      db.update('notepad.notes', note.id, { name, path: folder, saved: note.content, untitled: false, modified: now })
      if (f) db.update('files', f.id, { name, folder, size: sizeOf(note.content), modified: now })
      else db.insert('files', { id: uid('f'), name, folder, kind: extOf(name) || 'txt', size: sizeOf(note.content), modified: now, open: { appId: 'notepad', params: { noteId: note.id } }, createdBy: isAgent ? 'hworker' : undefined })
    }
    setDialog(null)
  }
  const openFile = (f: Rec) => {
    setDialog(null)
    const nid = f.open?.appId === 'notepad' ? f.open.params?.noteId : null
    if (nid && db.find('notepad.notes', nid)) return openNote(nid)
    const id = uid('n')
    db.insert('notepad.notes', { id, name: f.name, content: '', saved: '', modified: new Date().toISOString(), path: f.folder })
    if (!f.open) db.update('files', f.id, { open: { appId: 'notepad', params: { noteId: id } } })
    openNote(id)
  }
  const closeTab = (id: string) => {
    const rest = tabs.filter((t) => t !== id)
    if (!rest.length) return close()
    setTabs(rest)
    if (active === id) setActive(rest[rest.length - 1])
  }

  /* ── clipboard ── */
  const selection = () => {
    const el = ta.current
    if (!el) return ''
    return el.value.slice(el.selectionStart, el.selectionEnd)
  }
  const copy = (cut = false) => {
    setMenu(null)
    const el = ta.current
    const s = selection()
    if (!el || !s) return
    clip.current = s
    navigator.clipboard?.writeText(s).catch(() => {})
    if (cut) {
      const a = el.selectionStart
      update(el.value.slice(0, a) + el.value.slice(el.selectionEnd), false)
      requestAnimationFrame(() => el.setSelectionRange(a, a))
    }
  }
  const paste = async () => {
    setMenu(null)
    let t = clip.current
    try {
      const sys = await navigator.clipboard?.readText()
      if (sys) t = sys
    } catch {}
    if (t) insert(t, false)
  }
  const del = () => {
    setMenu(null)
    const el = ta.current
    if (!el || el.selectionStart === el.selectionEnd) return
    const a = el.selectionStart
    update(el.value.slice(0, a) + el.value.slice(el.selectionEnd), false)
    requestAnimationFrame(() => el.setSelectionRange(a, a))
  }
  const insert = (text: string, group = true) => {
    const el = ta.current
    if (!el || !note) return
    const s = el.selectionStart
    const v = note.content.slice(0, s) + text + note.content.slice(el.selectionEnd)
    update(v, group)
    requestAnimationFrame(() => el.setSelectionRange(s + text.length, s + text.length))
  }
  const onCaret = () => {
    const el = ta.current
    if (!el) return
    const before = el.value.slice(0, el.selectionStart)
    const lines = before.split('\n')
    setCaret({ ln: lines.length, col: lines[lines.length - 1].length + 1, sel: Math.abs(el.selectionEnd - el.selectionStart) })
  }
  const chars = useMemo(() => (note?.content ?? '').replace(/\r/g, '').length, [note?.content])

  const timeDate = () => new Date().toLocaleString('en-US', { hour: 'numeric', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString('en-US')

  /* ── find / replace ── */
  const openFind = (replace: boolean) => {
    setMenu(null)
    setSettings(false)
    const s = selection()
    if (s && !s.includes('\n')) setFindText(s)
    setFind({ replace })
    setTimeout(() => findInput.current?.select(), 0)
  }
  const norm = (s: string) => (matchCase ? s : s.toLowerCase())
  const matches = useMemo(() => {
    if (!find || !findText || !note) return [] as number[]
    const hay = norm(note.content)
    const needle = norm(findText)
    const out: number[] = []
    for (let i = hay.indexOf(needle); i >= 0 && out.length < 9999; i = hay.indexOf(needle, i + Math.max(1, needle.length))) out.push(i)
    return out
  }, [find, findText, note?.content, matchCase])
  const findNext = (dir: 1 | -1 = 1, focusEditor = true) => {
    setMenu(null)
    const el = ta.current
    if (!el || !findText) {
      if (!find) openFind(false)
      return
    }
    const from = dir === 1 ? el.selectionEnd : el.selectionStart
    let idx = dir === 1 ? matches.find((m) => m >= from) : [...matches].reverse().find((m) => m + findText.length <= from && m < el.selectionStart)
    if (idx === undefined && wrapAround && matches.length) idx = dir === 1 ? matches[0] : matches[matches.length - 1]
    if (idx === undefined) {
      setNotFound(true)
      setTimeout(() => setNotFound(false), 1500)
      return
    }
    if (focusEditor) el.focus()
    el.setSelectionRange(idx, idx + findText.length)
    // scroll the match into view
    const line = el.value.slice(0, idx).split('\n').length
    const lh = parseFloat(getComputedStyle(el).lineHeight) || 20
    if (!wrap) el.scrollTop = Math.max(0, (line - 4) * lh)
    else {
      const ratio = idx / Math.max(1, el.value.length)
      if (el.scrollHeight > el.clientHeight) el.scrollTop = Math.max(0, ratio * el.scrollHeight - el.clientHeight / 3)
    }
    onCaret()
  }
  const replaceOne = () => {
    const el = ta.current
    if (!el || !note || !findText) return
    const sel = el.value.slice(el.selectionStart, el.selectionEnd)
    if (norm(sel) === norm(findText) && sel.length) {
      const a = el.selectionStart
      update(el.value.slice(0, a) + replaceText + el.value.slice(el.selectionEnd), false)
      requestAnimationFrame(() => {
        el.setSelectionRange(a + replaceText.length, a + replaceText.length)
        findNext(1)
      })
    } else findNext(1)
  }
  const replaceAll = () => {
    if (!note || !findText) return
    const re = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), matchCase ? 'g' : 'gi')
    update(note.content.replace(re, () => replaceText), false)
  }
  const goToLine = (n: number) => {
    const el = ta.current
    if (!el) return
    const lines = el.value.split('\n')
    const ln = Math.max(1, Math.min(lines.length, n))
    const pos = lines.slice(0, ln - 1).reduce((s, l) => s + l.length + 1, 0)
    el.focus()
    el.setSelectionRange(pos, pos)
    const lh = parseFloat(getComputedStyle(el).lineHeight) || 20
    el.scrollTop = Math.max(0, (ln - 3) * lh)
    onCaret()
    setDialog(null)
  }

  const searchBing = () => {
    setMenu(null)
    const q = selection().trim() || ((note?.content as string | undefined)?.split('\n').find((l: string) => l.trim()) ?? '').trim()
    if (q) open('edge', { q: q.slice(0, 120) })
  }

  const recent = useMemo(() => [...notes].filter((n) => !n.untitled).sort((a, b) => ((a.modified ?? '') < (b.modified ?? '') ? 1 : -1)).slice(0, 8), [notes])

  const menus: Record<string, MenuRow[]> = {
    file: [
      ['New tab', 'Ctrl+N', () => { setMenu(null); newNote() }, 'notepad-new-tab'],
      ['New window', 'Ctrl+Shift+N', () => { setMenu(null); newNote() }, 'notepad-new-window'],
      ['Open', 'Ctrl+O', () => { setMenu(null); setDialog('open') }, 'notepad-open'],
      ['Recent', '›', () => setMenu('recent'), 'notepad-recent'],
      ['-'],
      ['Save', 'Ctrl+S', save, 'notepad-save'],
      ['Save as', 'Ctrl+Shift+S', () => { setMenu(null); setDialog('saveas') }, 'notepad-save-as'],
      ['Save all', 'Ctrl+Alt+S', saveAll, 'notepad-save-all'],
      ['-'],
      ['Page setup', '', () => { setMenu(null); setDialog('page') }, 'notepad-page-setup'],
      ['Print', 'Ctrl+P', () => { setMenu(null); setDialog('print') }, 'notepad-print'],
      ['-'],
      ['Close tab', 'Ctrl+W', () => { setMenu(null); active && closeTab(active) }],
      ['Close window', 'Ctrl+Shift+W', () => close()],
      ['Exit', '', () => close()],
    ],
    edit: [
      ['Undo', 'Ctrl+Z', () => undo(), 'notepad-undo', !note || !hist.current[note.id]?.undo.length],
      ['-'],
      ['Cut', 'Ctrl+X', () => copy(true), 'notepad-cut'],
      ['Copy', 'Ctrl+C', () => copy(false), 'notepad-copy'],
      ['Paste', 'Ctrl+V', paste, 'notepad-paste'],
      ['Delete', 'Del', del, 'notepad-delete'],
      ['-'],
      ['Search with Bing', 'Ctrl+E', searchBing, 'notepad-bing'],
      ['Find', 'Ctrl+F', () => openFind(false), 'notepad-find'],
      ['Find next', 'F3', () => findNext(1)],
      ['Find previous', 'Shift+F3', () => findNext(-1)],
      ['Replace', 'Ctrl+H', () => openFind(true), 'notepad-replace'],
      ['Go to', 'Ctrl+G', () => { setMenu(null); setDialog('goto') }, 'notepad-goto'],
      ['-'],
      ['Select all', 'Ctrl+A', () => { setMenu(null); ta.current?.select() }],
      ['Time/Date', 'F5', () => { setMenu(null); insert(timeDate()) }, 'notepad-timedate'],
      ['-'],
      ['Font', '', () => { setMenu(null); setDialog('font') }, 'notepad-font'],
    ],
    view: [
      ['Zoom in', 'Ctrl+Plus', () => setZoom((z) => Math.min(500, z + 10))],
      ['Zoom out', 'Ctrl+Minus', () => setZoom((z) => Math.max(10, z - 10))],
      ['Restore default zoom', 'Ctrl+0', () => setZoom(100)],
      ['-'],
      [`${status ? '✓ ' : ''}Status bar`, '', () => setStatus(!status)],
      [`${wrap ? '✓ ' : ''}Word wrap`, '', () => setWrap(!wrap), 'notepad-wordwrap'],
    ],
  }

  const onEditorKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const mod = e.ctrlKey || e.metaKey
    const k = e.key.toLowerCase()
    if (mod && k === 's') {
      e.preventDefault()
      if (e.shiftKey) setDialog('saveas')
      else if (e.altKey) saveAll()
      else save()
    } else if (e.key === 'F5') {
      e.preventDefault()
      insert(timeDate())
    } else if (mod && k === 'z' && !e.shiftKey) {
      e.preventDefault()
      undo()
    } else if (mod && (k === 'y' || (k === 'z' && e.shiftKey))) {
      e.preventDefault()
      undo(true)
    } else if (mod && k === 'f') {
      e.preventDefault()
      openFind(false)
    } else if (mod && k === 'h') {
      e.preventDefault()
      openFind(true)
    } else if (mod && k === 'g') {
      e.preventDefault()
      setDialog('goto')
    } else if (mod && k === 'o') {
      e.preventDefault()
      setDialog('open')
    } else if (mod && k === 'p') {
      e.preventDefault()
      setDialog('print')
    } else if (mod && k === 'e') {
      e.preventDefault()
      searchBing()
    } else if (mod && k === 'n') {
      e.preventDefault()
      newNote()
    } else if (mod && k === 'w') {
      e.preventDefault()
      if (e.shiftKey) close()
      else if (active) closeTab(active)
    } else if (mod && (e.key === '=' || e.key === '+')) {
      e.preventDefault()
      setZoom((z) => Math.min(500, z + 10))
    } else if (mod && e.key === '-') {
      e.preventDefault()
      setZoom((z) => Math.max(10, z - 10))
    } else if (mod && e.key === '0') {
      e.preventDefault()
      setZoom(100)
    } else if (e.key === 'F3') {
      e.preventDefault()
      findNext(e.shiftKey ? -1 : 1)
    } else if (e.key === 'Escape' && find) setFind(null)
    else if (e.key === 'Tab') {
      e.preventDefault()
      insert('\t', false)
    }
  }

  const themeVars = THEMES[prefs.theme === 'dark' ? 'dark' : 'light'] as React.CSSProperties
  const fontPx = (prefs.fontSize * 96) / 72
  const fontCss = { fontFamily: `"${prefs.font}", Consolas, "Courier New", monospace`, fontStyle: /Italic/.test(prefs.fontStyle) ? 'italic' : 'normal', fontWeight: /Bold/.test(prefs.fontStyle) ? 700 : 400 } as const
  const menuItemCls = 'w-[calc(100%-8px)] mx-1 h-8 flex items-center px-3 rounded-[4px] text-[12.5px] hover:bg-[var(--n-hov)] text-left disabled:opacity-40 disabled:hover:bg-transparent'

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[var(--n-bg)] text-[var(--n-tx)] relative" style={{ fontFamily: 'var(--font-win)', ...themeVars }} onPointerDown={() => setMenu(null)}>
      {/* tab strip / title bar */}
      <div data-drag-handle className="h-[40px] shrink-0 flex items-end pl-1.5 bg-[var(--n-strip)]">
        <img src={logoUrl('notepad')} className="w-4 h-4 mx-2.5 mb-3" alt="" />
        {tabs.map((id) => {
          const n = notes.find((x) => x.id === id)
          if (!n) return null
          const on = id === active && !settings
          return (
            <div
              key={id}
              data-agent={`notepad-tab-${id}`}
              onClick={() => { setActive(id); setSettings(false) }}
              onAuxClick={(e) => e.button === 1 && closeTab(id)}
              className={`group relative h-[34px] w-[200px] flex items-center pl-3 pr-1.5 gap-2 rounded-t-[8px] text-[12px] ${on ? 'bg-[var(--n-tab)]' : 'hover:bg-[var(--n-tabh)]'}`}
            >
              <span className="flex-1 truncate">{n.name}</span>
              {dirty(n) ? (
                <span className="w-6 h-6 flex items-center justify-center group-hover:hidden">
                  <Circle12Filled className="w-2 h-2" />
                </span>
              ) : null}
              <button
                aria-label="Close tab"
                onClick={(e) => {
                  e.stopPropagation()
                  closeTab(id)
                }}
                className={`w-6 h-6 rounded items-center justify-center hover:bg-[var(--n-act)] ${dirty(n) ? 'hidden group-hover:flex' : 'flex'}`}
              >
                <Dismiss12Regular />
              </button>
            </div>
          )
        })}
        {settings && (
          <div className="relative h-[34px] w-[200px] flex items-center pl-3 pr-1.5 gap-2 rounded-t-[8px] text-[12px] bg-[var(--n-tab)]">
            <Settings20Regular className="w-4 h-4" />
            <span className="flex-1 truncate">Settings</span>
            <button aria-label="Close settings" onClick={() => setSettings(false)} className="w-6 h-6 rounded flex items-center justify-center hover:bg-[var(--n-act)]">
              <Dismiss12Regular />
            </button>
          </div>
        )}
        <button data-agent="notepad-new-tab" aria-label="Add new tab" onClick={() => { newNote(); setSettings(false) }} className="w-8 h-8 mb-[3px] ml-1 rounded flex items-center justify-center hover:bg-[var(--n-hov)]">
          <Add16Regular />
        </button>
        <div className="flex-1 h-full" />
        <WindowControls height={40} />
      </div>
      {/* menu bar */}
      <div className="h-[36px] shrink-0 flex items-center px-1.5 bg-[var(--n-tab)] relative" onPointerDown={(e) => e.stopPropagation()}>
        {(['file', 'edit', 'view'] as const).map((m) => (
          <div key={m} className="relative">
            <button data-agent={`notepad-menu-${m}`} onClick={() => setMenu(menu === m || (m === 'file' && menu === 'recent') ? null : m)} className={`h-7 px-2.5 rounded-[4px] text-[12.5px] capitalize ${menu === m || (m === 'file' && menu === 'recent') ? 'bg-[var(--n-act)]' : 'hover:bg-[var(--n-hov)]'}`}>
              {m}
            </button>
            {(menu === m || (m === 'file' && menu === 'recent')) && (
              <div className="absolute z-50 left-0 top-8 w-[260px] py-1 rounded-lg bg-[var(--n-menu)] border border-[var(--n-line)] shadow-[0_8px_16px_rgba(0,0,0,0.14)] menu-open">
                {menus[m].map(([l, k, fn, ag, dis], i) =>
                  l === '-' ? (
                    <div key={i} className="h-px bg-[var(--n-line)] my-1" />
                  ) : (
                    <button key={i} data-agent={ag} disabled={!!dis} onMouseEnter={() => m === 'file' && setMenu(l === 'Recent' ? 'recent' : 'file')} onClick={fn ?? (() => setMenu(null))} className={`${menuItemCls} ${l === 'Recent' && menu === 'recent' ? 'bg-[var(--n-hov)]' : ''}`}>
                      <span className="flex-1">{l}</span>
                      <span className="text-[11.5px] text-[var(--n-sub)]">{k}</span>
                    </button>
                  ),
                )}
                {m === 'file' && menu === 'recent' && (
                  <div className="absolute left-[256px] top-[100px] w-[300px] py-1 rounded-lg bg-[var(--n-menu)] border border-[var(--n-line)] shadow-[0_8px_16px_rgba(0,0,0,0.14)]">
                    {recent.length === 0 && <div className="px-4 h-8 flex items-center text-[12.5px] text-[var(--n-sub)]">No recent files</div>}
                    {recent.map((n) => (
                      <button key={n.id} data-agent={`notepad-recent-${n.id}`} onClick={() => { setMenu(null); openNote(n.id) }} className={menuItemCls}>
                        <span className="flex-1 truncate">{n.name}</span>
                        <span className="text-[11px] text-[var(--n-sub)] truncate max-w-[110px]">{n.path ?? 'Documents'}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        <div className="flex-1" />
        {prefs.copilot && (
          <div className="relative">
            <button aria-label="Copilot" onClick={() => setMenu(menu === 'copilot' ? null : 'copilot')} className={`h-7 px-2 rounded-[4px] flex items-center gap-1.5 text-[12.5px] ${menu === 'copilot' ? 'bg-[var(--n-act)]' : 'hover:bg-[var(--n-hov)]'}`}>
              <svg width="16" height="16" viewBox="0 0 24 24"><defs><linearGradient id="cpg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#2870EA" /><stop offset=".5" stopColor="#1B4AEF" /><stop offset="1" stopColor="#D23BC7" /></linearGradient></defs><path d="M8 3h6l-4 18H4z M14 3h6l-4 18h-6z" fill="url(#cpg)" opacity=".9" /></svg>
              <span className="text-[var(--n-sub)]">▾</span>
            </button>
            {menu === 'copilot' && (
              <div className="absolute z-50 right-0 top-8 w-[240px] py-1 rounded-lg bg-[var(--n-menu)] border border-[var(--n-line)] shadow-[0_8px_16px_rgba(0,0,0,0.14)] menu-open">
                <button data-agent="notepad-copilot-explain" onClick={searchBing} className={menuItemCls}>Explain with Copilot</button>
                <button data-agent="notepad-copilot-search" onClick={searchBing} className={menuItemCls}>Search with Bing</button>
                <div className="h-px bg-[var(--n-line)] my-1" />
                <button onClick={() => { setMenu(null); setPref({ copilot: false }) }} className={menuItemCls}>Hide Copilot in Notepad</button>
              </div>
            )}
          </div>
        )}
        <button data-agent="notepad-settings" aria-label="Settings" onClick={() => { setSettings(true); setFind(null) }} className={`w-8 h-7 rounded-[4px] flex items-center justify-center ${settings ? 'bg-[var(--n-act)]' : 'hover:bg-[var(--n-hov)]'}`}>
          <Settings20Regular />
        </button>
      </div>
      {/* editor */}
      <div className="relative flex-1 min-h-0 bg-[var(--n-ed)] border-t border-[var(--n-line)]">
        {settings ? (
          <SettingsPage prefs={prefs} setPref={setPref} back={() => setSettings(false)} openFont={() => setDialog('font')} />
        ) : (
          note && (
            <textarea
              ref={ta}
              data-agent="notepad-editor"
              aria-label="Text editor"
              spellCheck={!!prefs.spell}
              value={note.content.replace(/\r\n/g, '\n')}
              onChange={(e) => update(e.target.value)}
              onKeyUp={onCaret}
              onClick={onCaret}
              onSelect={onCaret}
              onKeyDown={onEditorKey}
              wrap={wrap ? 'soft' : 'off'}
              className="w-full h-full resize-none outline-none bg-transparent px-3 py-2 text-[var(--n-tx)] leading-[1.45] selection:bg-[#0078D4]/30"
              style={{ ...fontCss, fontSize: (fontPx * 0.987 * zoom) / 100, whiteSpace: wrap ? 'pre-wrap' : 'pre' }}
            />
          )
        )}
        {find && !settings && (
          <div className="absolute right-4 top-2 z-30 w-[400px] rounded-lg bg-[var(--n-menu)] border border-[var(--n-line)] shadow-[0_8px_16px_rgba(0,0,0,0.16)] p-1.5 text-[12.5px]" onPointerDown={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-1">
              <button aria-label={find.replace ? 'Hide replace' : 'Show replace'} onClick={() => setFind({ replace: !find.replace })} className="w-7 h-7 rounded flex items-center justify-center hover:bg-[var(--n-hov)]">
                {find.replace ? <ChevronDown12Regular /> : <ChevronRight12Regular />}
              </button>
              <div className={`flex-1 h-8 flex items-center rounded-[4px] bg-[var(--n-in)] border ${notFound ? 'border-[#C42B1C]' : 'border-[var(--n-line)]'} px-2`}>
                <input
                  ref={findInput}
                  data-agent="notepad-find-input"
                  aria-label="Find"
                  value={findText}
                  placeholder="Find"
                  onChange={(e) => setFindText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      findNext(e.shiftKey ? -1 : 1)
                    } else if (e.key === 'Escape') setFind(null)
                  }}
                  className="flex-1 min-w-0 bg-transparent outline-none text-[12.5px]"
                  style={{ fontSize: 12.5 }}
                />
                <span className="text-[11px] text-[var(--n-sub)] ml-1 shrink-0">{findText ? (matches.length ? `${matches.length} found` : 'No results') : ''}</span>
              </div>
              <button data-agent="notepad-find-prev" aria-label="Find previous" onClick={() => findNext(-1)} className="w-7 h-7 rounded flex items-center justify-center hover:bg-[var(--n-hov)]"><ArrowUp16Regular /></button>
              <button data-agent="notepad-find-next" aria-label="Find next" onClick={() => findNext(1)} className="w-7 h-7 rounded flex items-center justify-center hover:bg-[var(--n-hov)]"><ArrowDown16Regular /></button>
              <div className="relative">
                <button aria-label="Find options" onClick={() => setFindOpts(!findOpts)} className={`w-7 h-7 rounded flex items-center justify-center ${findOpts ? 'bg-[var(--n-act)]' : 'hover:bg-[var(--n-hov)]'}`}><Options16Regular /></button>
                {findOpts && (
                  <div className="absolute right-0 top-8 w-[170px] py-1 rounded-lg bg-[var(--n-menu)] border border-[var(--n-line)] shadow-lg z-40">
                    {([['Match case', matchCase, setMatchCase], ['Wrap around', wrapAround, setWrapAround]] as [string, boolean, (v: boolean) => void][]).map(([l, v, set]) => (
                      <label key={l} className="flex items-center gap-2 h-8 px-3 hover:bg-[var(--n-hov)] cursor-default">
                        <input type="checkbox" checked={v} onChange={() => set(!v)} className="accent-[var(--n-acc)]" /> {l}
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <button aria-label="Close find" onClick={() => setFind(null)} className="w-7 h-7 rounded flex items-center justify-center hover:bg-[var(--n-hov)]"><Dismiss16Regular /></button>
            </div>
            {find.replace && (
              <div className="flex items-center gap-1 mt-1 pl-8">
                <input
                  data-agent="notepad-replace-input"
                  aria-label="Replace"
                  value={replaceText}
                  placeholder="Replace"
                  onChange={(e) => setReplaceText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') replaceOne()
                    else if (e.key === 'Escape') setFind(null)
                  }}
                  className="flex-1 min-w-0 h-8 px-2 rounded-[4px] bg-[var(--n-in)] border border-[var(--n-line)] outline-none text-[12.5px]"
                  style={{ fontSize: 12.5 }}
                />
                <button data-agent="notepad-replace-one" onClick={replaceOne} className="h-8 px-3 rounded-[4px] border border-[var(--n-line)] hover:bg-[var(--n-hov)]">Replace</button>
                <button data-agent="notepad-replace-all" onClick={replaceAll} className="h-8 px-3 rounded-[4px] border border-[var(--n-line)] hover:bg-[var(--n-hov)]">Replace all</button>
              </div>
            )}
          </div>
        )}
      </div>
      {status && (
        <div className="h-[28px] shrink-0 flex items-center bg-[var(--n-bg)] border-t border-[var(--n-line)] text-[12px] text-[var(--n-tx)]">
          <span className="px-3" data-agent="notepad-caret">Ln {caret.ln}, Col {caret.col}</span>
          <span className="w-px h-4 bg-[var(--n-line)]" />
          <span className="px-3">{caret.sel ? `${caret.sel.toLocaleString()} of ${chars.toLocaleString()} characters` : `${chars.toLocaleString()} characters`}</span>
          {note?.updatedBy === 'hworker' && (
            <span className="ml-1 inline-flex items-center gap-1 h-[18px] pl-0.5 pr-1.5 rounded-full bg-[#430693] text-white text-[10px] font-semibold" style={{ fontFamily: 'var(--font-brand)' }}>
              <img src={logoUrl('hworker')} className="w-3.5 h-3.5 rounded-full" alt="" /> Edited by H-Worker
            </span>
          )}
          <div className="flex-1" />
          <span className="px-4 w-[70px]">{zoom}%</span>
          <span className="w-px h-4 bg-[var(--n-line)]" />
          <span className="px-4">Windows (CRLF)</span>
          <span className="w-px h-4 bg-[var(--n-line)]" />
          <span className="px-4">UTF-8</span>
        </div>
      )}

      {dialog === 'open' && <FileDialog mode="open" onClose={() => setDialog(null)} onOpen={openFile} />}
      {dialog === 'saveas' && note && <FileDialog mode="save" initialName={note.untitled ? (note.content.split(/\r?\n/)[0].trim().slice(0, 40) || '*') + '.txt' : note.name} initialFolder={note.path ?? 'Documents'} onClose={() => setDialog(null)} onSave={saveAs} selfId={note.id} />}
      {dialog === 'goto' && <GoToDialog max={(note?.content ?? '').split('\n').length} current={caret.ln} onGo={goToLine} onClose={() => setDialog(null)} />}
      {dialog === 'font' && <FontDialog prefs={prefs} onApply={(p) => { setPref(p); setDialog(null) }} onClose={() => setDialog(null)} />}
      {dialog === 'page' && <PageSetupDialog page={prefs.page} onApply={(page) => { setPref({ page }); setDialog(null) }} onClose={() => setDialog(null)} />}
      {dialog === 'print' && note && (
        <PrintDialog
          name={note.name}
          lines={note.content.split('\n').length}
          page={prefs.page}
          onClose={() => setDialog(null)}
          onPrint={(printer, copies) => {
            setDialog(null)
            if (printer === 'Microsoft Print to PDF') {
              const base = note.name.replace(/\.[^.]+$/, '')
              const taken = new Set(db.get('files').filter((f) => f.folder === 'Documents').map((f) => f.name.toLowerCase()))
              let name = `${base}.pdf`
              for (let i = 2; taken.has(name.toLowerCase()); i++) name = `${base} (${i}).pdf`
              db.insert('files', { id: uid('f'), name, folder: 'Documents', kind: 'pdf', size: `${Math.max(24, Math.ceil(note.content.length / 300))} KB`, modified: new Date().toISOString(), open: { appId: 'acrobat', params: { file: name } }, createdBy: isAgent ? 'hworker' : undefined })
              toast({ appId: 'notepad', title: 'Saved as PDF', body: `${name} was saved to Documents.`, action: { label: 'Open folder', appId: 'explorer', params: { path: 'Documents' } } })
            } else toast({ appId: 'notepad', title: `Printing ${note.name}`, body: `${copies} cop${copies > 1 ? 'ies' : 'y'} sent to ${printer}.` })
          }}
        />
      )}
    </div>
  )
}

/* ───────────────────────── dialogs ───────────────────────── */

function Modal({ title, children, onClose, width = 420 }: { title: string; children: React.ReactNode; onClose: () => void; width?: number }) {
  return (
    <div className="absolute inset-0 z-[60] bg-black/20 flex items-center justify-center" onPointerDown={(e) => e.stopPropagation()} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="rounded-lg bg-[var(--n-menu)] text-[var(--n-tx)] shadow-[0_16px_40px_rgba(0,0,0,0.3)] border border-[var(--n-line)] overflow-hidden" style={{ width }}>
        <div className="h-9 flex items-center pl-4 pr-1 text-[12px]">
          <span className="flex-1">{title}</span>
          <button aria-label="Close" onClick={onClose} className="w-9 h-8 rounded flex items-center justify-center hover:bg-[#C42B1C] hover:text-white"><Dismiss16Regular /></button>
        </div>
        {children}
      </div>
    </div>
  )
}
const btn = 'h-8 min-w-[90px] px-4 rounded-[4px] text-[13px] border border-[var(--n-line)] bg-[var(--n-card)] hover:bg-[var(--n-hov)] disabled:opacity-50'
const btnPrimary = 'h-8 min-w-[90px] px-4 rounded-[4px] text-[13px] bg-[#005FB8] hover:bg-[#1A6FC0] text-white disabled:opacity-50'
const field = 'h-8 px-2 rounded-[4px] bg-[var(--n-in)] border border-[var(--n-line)] border-b-[#8A8A8A] outline-none text-[13px] focus:border-b-[var(--n-acc)] focus:border-b-2'

function FileDialog({ mode, onClose, onOpen, onSave, initialName = '', initialFolder = 'Documents', selfId }: { mode: 'open' | 'save'; onClose: () => void; onOpen?: (f: Rec) => void; onSave?: (folder: string, name: string) => void; initialName?: string; initialFolder?: string; selfId?: string }) {
  const files = useCollection('files')
  const folders = useCollection('explorer.folders')
  const [folder, setFolder] = useState(initialFolder)
  const [name, setName] = useState(initialName === '*.txt' ? '' : initialName)
  const [type, setType] = useState<'txt' | 'all'>('txt')
  const [sel, setSel] = useState<string | null>(null)
  const [err, setErr] = useState('')
  const subs = folders.filter((f) => f.parent === folder).sort((a, b) => a.name.localeCompare(b.name))
  const isText = (n: string) => /\.(txt|log|csv|md|ini|json|xml|ics)$/i.test(n)
  const list = files.filter((f) => f.folder === folder && (type === 'all' || /\.txt$/i.test(f.name))).sort((a, b) => a.name.localeCompare(b.name))
  const crumbs = folder.split('/')
  const submit = () => {
    if (mode === 'open') {
      const f = list.find((x) => x.id === sel) ?? list.find((x) => x.name.toLowerCase() === name.trim().toLowerCase())
      if (!f) return setErr(name.trim() ? `Cannot find “${name.trim()}”. Check the file name and try again.` : 'Select a file to open.')
      if (!isText(f.name)) return setErr(`“${f.name}” isn’t a text file Notepad can open.`)
      onOpen?.(f)
    } else {
      const n = name.trim()
      if (!n) return setErr('Type a file name.')
      if (/[\\/:*?"<>|]/.test(n)) return setErr('A file name can’t contain any of the following characters: \\ / : * ? " < > |')
      const full = /\.[a-z0-9]+$/i.test(n) ? n : n + '.txt'
      const clash = files.find((f) => f.folder === folder && f.name.toLowerCase() === full.toLowerCase())
      if (clash && clash.open?.params?.noteId !== selfId) return setErr(`${full} already exists. Choose a different name.`)
      onSave?.(folder, n)
    }
  }
  return (
    <Modal title={mode === 'open' ? 'Open' : 'Save as'} onClose={onClose} width={680}>
      <div className="px-3 pb-2 flex items-center gap-1 text-[12.5px]">
        <button aria-label="Up" disabled={!folder.includes('/')} onClick={() => setFolder(folder.slice(0, folder.lastIndexOf('/')))} className="w-8 h-8 rounded flex items-center justify-center hover:bg-[var(--n-hov)] disabled:opacity-35"><ArrowUp16Regular /></button>
        <div className="flex-1 h-8 flex items-center gap-1 px-2 rounded-[4px] bg-[var(--n-in)] border border-[var(--n-line)]">
          <KnownFolderIcon path={ROOTS.includes(crumbs[0]) && crumbs.length === 1 ? crumbs[0] : 'folder'} size={16} />
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1">
              <ChevronRight12Regular className="text-[var(--n-sub)]" />
              <button onClick={() => setFolder(crumbs.slice(0, i + 1).join('/'))} className="px-1 rounded hover:bg-[var(--n-hov)]">{i === 0 && c === 'OneDrive' ? 'OneDrive - Northwind Global' : c}</button>
            </span>
          ))}
        </div>
      </div>
      <div className="flex h-[300px] border-y border-[var(--n-line)] bg-[var(--n-card)] text-[12.5px]">
        <div className="w-[170px] shrink-0 border-r border-[var(--n-line)] py-1 overflow-y-auto">
          {ROOTS.map((r) => (
            <button key={r} onClick={() => { setFolder(r); setSel(null) }} className={`w-full h-8 flex items-center gap-2 px-3 text-left ${folder === r ? 'bg-[var(--n-act)]' : 'hover:bg-[var(--n-hov)]'}`}>
              <KnownFolderIcon path={r} size={16} /> <span className="truncate">{r === 'OneDrive' ? 'OneDrive' : r}</span>
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="h-7 flex items-center px-3 text-[12px] text-[var(--n-sub)] border-b border-[var(--n-line)]">
            <span className="flex-1">Name</span>
            <span className="w-[140px]">Date modified</span>
          </div>
          {subs.map((f) => (
            <div key={f.id} role="row" onDoubleClick={() => { setFolder(`${folder}/${f.name}`); setSel(null) }} onClick={() => setSel(null)} className="h-7 flex items-center gap-2 px-3 hover:bg-[var(--n-hov)] cursor-default">
              <FolderIcon size={16} /> <span className="flex-1 truncate">{f.name}</span> <span className="w-[140px] text-[var(--n-sub)]">{new Date(f.created).toLocaleDateString('en-US')}</span>
            </div>
          ))}
          {list.map((f) => (
            <div
              key={f.id}
              role="row"
              data-agent={`notepad-dialog-file-${f.id}`}
              onClick={() => { setSel(f.id); setName(f.name); setErr('') }}
              onDoubleClick={() => (mode === 'open' ? (isText(f.name) ? onOpen?.(f) : setErr(`“${f.name}” isn’t a text file Notepad can open.`)) : (setName(f.name), setErr('')))}
              className={`h-7 flex items-center gap-2 px-3 cursor-default ${sel === f.id ? 'bg-[#CCE8FF] text-[#1A1A1A]' : 'hover:bg-[var(--n-hov)]'}`}
            >
              <FileTypeIcon name={f.name} kind={f.kind} size={16} /> <span className="flex-1 truncate">{f.name}</span> <span className="w-[140px] text-[var(--n-sub)]">{new Date(f.modified).toLocaleDateString('en-US')}</span>
            </div>
          ))}
          {!subs.length && !list.length && <div className="pt-8 text-center text-[var(--n-sub)]">No items match your search.</div>}
        </div>
      </div>
      <div className="px-4 py-3 space-y-2 text-[12.5px]">
        <div className="flex items-center gap-2">
          <span className="w-[90px] text-right">File name:</span>
          <input autoFocus data-agent="notepad-dialog-name" value={name} onChange={(e) => { setName(e.target.value); setErr('') }} onKeyDown={(e) => e.key === 'Enter' && submit()} className={`${field} flex-1`} style={{ fontSize: 13 }} />
          <select value={type} onChange={(e) => setType(e.target.value as any)} className={`${field} w-[180px]`} style={{ fontSize: 13 }}>
            <option value="txt">Text Documents (*.txt)</option>
            <option value="all">All files (*.*)</option>
          </select>
        </div>
        {err && <div className="text-[#C42B1C] pl-[98px]">{err}</div>}
        <div className="flex items-center justify-end gap-2 pt-1">
          <span className="mr-auto text-[var(--n-sub)]">Encoding: UTF-8</span>
          <button data-agent="notepad-dialog-ok" onClick={submit} className={btnPrimary}>{mode === 'open' ? 'Open' : 'Save'}</button>
          <button onClick={onClose} className={btn}>Cancel</button>
        </div>
      </div>
    </Modal>
  )
}

function GoToDialog({ max, current, onGo, onClose }: { max: number; current: number; onGo: (n: number) => void; onClose: () => void }) {
  const [v, setV] = useState(String(current))
  const n = parseInt(v, 10)
  const bad = !n || n < 1 || n > max
  return (
    <Modal title="Go To Line" onClose={onClose} width={340}>
      <div className="px-5 pb-4 text-[13px]">
        <label className="block mb-1">Line number:</label>
        <input autoFocus data-agent="notepad-goto-input" value={v} onChange={(e) => setV(e.target.value.replace(/\D/g, ''))} onFocus={(e) => e.target.select()} onKeyDown={(e) => e.key === 'Enter' && !bad && onGo(n)} className={`${field} w-full`} style={{ fontSize: 13 }} />
        {v && bad && <div className="text-[#C42B1C] text-[12px] mt-1">The line number is beyond the total number of lines ({max}).</div>}
        <div className="flex justify-end gap-2 mt-4">
          <button data-agent="notepad-goto-ok" disabled={bad} onClick={() => onGo(n)} className={btnPrimary}>Go To</button>
          <button onClick={onClose} className={btn}>Cancel</button>
        </div>
      </div>
    </Modal>
  )
}

function FontDialog({ prefs, onApply, onClose }: { prefs: typeof DEFAULT_PREFS; onApply: (p: Partial<typeof DEFAULT_PREFS>) => void; onClose: () => void }) {
  const [font, setFont] = useState(prefs.font)
  const [style, setStyle] = useState(prefs.fontStyle)
  const [size, setSize] = useState(prefs.fontSize)
  const List = ({ items, value, set, agent }: { items: (string | number)[]; value: string | number; set: (v: any) => void; agent: string }) => (
    <div className="h-[150px] overflow-y-auto rounded-[4px] border border-[var(--n-line)] bg-[var(--n-in)]">
      {items.map((i) => (
        <div key={i} data-agent={`${agent}-${String(i).toLowerCase().replace(/\s+/g, '-')}`} onClick={() => set(i)} className={`h-7 px-2 flex items-center cursor-default ${value === i ? 'bg-[#005FB8] text-white' : 'hover:bg-[var(--n-hov)]'}`}>
          {i}
        </div>
      ))}
    </div>
  )
  return (
    <Modal title="Font" onClose={onClose} width={520}>
      <div className="px-5 pb-4 text-[13px]">
        <div className="grid grid-cols-[1fr_130px_80px] gap-3">
          <div>
            <div className="mb-1">Font:</div>
            <List items={FONTS} value={font} set={setFont} agent="notepad-font-family" />
          </div>
          <div>
            <div className="mb-1">Font style:</div>
            <List items={STYLES} value={style} set={setStyle} agent="notepad-font-style" />
          </div>
          <div>
            <div className="mb-1">Size:</div>
            <List items={SIZES} value={size} set={setSize} agent="notepad-font-size" />
          </div>
        </div>
        <div className="mt-3 mb-1">Sample</div>
        <div className="h-[64px] rounded-[4px] border border-[var(--n-line)] bg-[var(--n-in)] flex items-center justify-center overflow-hidden" style={{ fontFamily: `"${font}", monospace`, fontSize: Math.min(36, (size * 96) / 72), fontStyle: /Italic/.test(style) ? 'italic' : 'normal', fontWeight: /Bold/.test(style) ? 700 : 400 }}>
          AaBbYyZz
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button data-agent="notepad-font-ok" onClick={() => onApply({ font, fontStyle: style, fontSize: size })} className={btnPrimary}>OK</button>
          <button onClick={onClose} className={btn}>Cancel</button>
        </div>
      </div>
    </Modal>
  )
}

function PageSetupDialog({ page, onApply, onClose }: { page: typeof DEFAULT_PREFS.page; onApply: (p: typeof DEFAULT_PREFS.page) => void; onClose: () => void }) {
  const [p, setP] = useState(page)
  const set = (k: keyof typeof page, v: string) => setP({ ...p, [k]: v })
  return (
    <Modal title="Page Setup" onClose={onClose} width={480}>
      <div className="px-5 pb-4 text-[13px] grid grid-cols-[1fr_120px] gap-4">
        <div className="space-y-3">
          <label className="block">
            <div className="mb-1">Paper size</div>
            <select value={p.paper} onChange={(e) => set('paper', e.target.value)} className={`${field} w-full`} style={{ fontSize: 13 }}>
              {['Letter', 'Legal', 'A4', 'A5', 'Executive'].map((o) => <option key={o}>{o}</option>)}
            </select>
          </label>
          <div>
            <div className="mb-1">Orientation</div>
            {['Portrait', 'Landscape'].map((o) => (
              <label key={o} className="inline-flex items-center gap-1.5 mr-4">
                <input type="radio" checked={p.orientation === o} onChange={() => set('orientation', o)} className="accent-[var(--n-acc)]" /> {o}
              </label>
            ))}
          </div>
          <label className="block">
            <div className="mb-1">Margins (inches)</div>
            <input value={p.margins} onChange={(e) => set('margins', e.target.value.replace(/[^\d.]/g, ''))} className={`${field} w-[90px]`} style={{ fontSize: 13 }} />
          </label>
          <label className="block">
            <div className="mb-1">Header</div>
            <input value={p.header} onChange={(e) => set('header', e.target.value)} className={`${field} w-full`} style={{ fontSize: 13 }} />
          </label>
          <label className="block">
            <div className="mb-1">Footer</div>
            <input value={p.footer} onChange={(e) => set('footer', e.target.value)} className={`${field} w-full`} style={{ fontSize: 13 }} />
          </label>
        </div>
        <div className="flex items-start justify-center pt-6">
          <div className="bg-white border border-[#999] shadow flex flex-col gap-1 p-2" style={p.orientation === 'Portrait' ? { width: 80, height: 104 } : { width: 104, height: 80 }}>
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-[3px] bg-[#C8C8C8]" style={{ width: `${60 + ((i * 23) % 40)}%` }} />)}
          </div>
        </div>
        <div className="col-span-2 flex justify-end gap-2">
          <button data-agent="notepad-page-ok" onClick={() => onApply(p)} className={btnPrimary}>OK</button>
          <button onClick={onClose} className={btn}>Cancel</button>
        </div>
      </div>
    </Modal>
  )
}

function PrintDialog({ name, lines, page, onPrint, onClose }: { name: string; lines: number; page: typeof DEFAULT_PREFS.page; onPrint: (printer: string, copies: number) => void; onClose: () => void }) {
  const [printer, setPrinter] = useState(PRINTERS[0])
  const [copies, setCopies] = useState(1)
  const pages = Math.max(1, Math.ceil(lines / (page.orientation === 'Portrait' ? 54 : 38)))
  return (
    <Modal title={`Print — ${name}`} onClose={onClose} width={440}>
      <div className="px-5 pb-4 text-[13px] space-y-3">
        <label className="block">
          <div className="mb-1">Printer</div>
          <select data-agent="notepad-print-printer" value={printer} onChange={(e) => setPrinter(e.target.value)} className={`${field} w-full`} style={{ fontSize: 13 }}>
            {PRINTERS.map((o) => <option key={o}>{o}</option>)}
          </select>
        </label>
        <label className="block">
          <div className="mb-1">Copies</div>
          <input type="number" min={1} max={99} value={copies} onChange={(e) => setCopies(Math.max(1, Math.min(99, Number(e.target.value) || 1)))} className={`${field} w-[90px]`} style={{ fontSize: 13 }} />
        </label>
        <div className="text-[var(--n-sub)]">
          {page.paper} · {page.orientation} · {pages} page{pages > 1 ? 's' : ''}
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button data-agent="notepad-print-ok" onClick={() => onPrint(printer, copies)} className={btnPrimary}>Print</button>
          <button onClick={onClose} className={btn}>Cancel</button>
        </div>
      </div>
    </Modal>
  )
}

/* ───────────────────────── settings page ───────────────────────── */

function SettingsPage({ prefs, setPref, back, openFont }: { prefs: typeof DEFAULT_PREFS; setPref: (p: Partial<typeof DEFAULT_PREFS>) => void; back: () => void; openFont: () => void }) {
  const [open, setOpen] = useState<string | null>('theme')
  const Sw = ({ on, set, agent }: { on: boolean; set: (v: boolean) => void; agent: string }) => (
    <button role="switch" aria-checked={on} data-agent={agent} onClick={() => set(!on)} className="flex items-center gap-3 text-[13px]">
      <span className="w-6 text-right">{on ? 'On' : 'Off'}</span>
      <span className={`relative w-10 h-5 rounded-full border ${on ? 'bg-[#005FB8] border-[#005FB8]' : 'border-[var(--n-sub)]'}`}>
        <span className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full ${on ? 'left-[22px] bg-white' : 'left-[3px] bg-[var(--n-sub)]'}`} />
      </span>
    </button>
  )
  const Row = ({ icon: I, title, sub, right, id, children }: { icon: any; title: string; sub?: string; right?: React.ReactNode; id?: string; children?: React.ReactNode }) => (
    <div className="rounded-[6px] bg-[var(--n-card)] border border-[var(--n-line)] mb-[3px]">
      <div className={`min-h-[64px] flex items-center gap-4 px-4 py-3 ${id ? 'cursor-default hover:bg-[var(--n-hov)]' : ''}`} onClick={() => id && setOpen(open === id ? null : id)}>
        <I className="shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-[14px]">{title}</div>
          {sub && <div className="text-[12px] text-[var(--n-sub)]">{sub}</div>}
        </div>
        {right}
        {id && (open === id ? <ChevronUp16Regular /> : <ChevronDown16Regular />)}
      </div>
      {id && open === id && <div className="px-14 pb-4 text-[13px]">{children}</div>}
    </div>
  )
  return (
    <div className="absolute inset-0 overflow-y-auto px-10 py-6" data-agent="notepad-settings-page">
      <div className="max-w-[760px] mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button aria-label="Back" onClick={back} className="w-8 h-8 rounded flex items-center justify-center hover:bg-[var(--n-hov)]"><ArrowLeft20Regular /></button>
          <h1 className="text-[28px] font-semibold">Settings</h1>
        </div>
        <div className="text-[14px] font-semibold mb-2">Appearance</div>
        <Row icon={Color20Regular} title="App theme" sub="Select which app theme to display" id="theme">
          {(['light', 'dark', 'system'] as const).map((t) => (
            <label key={t} className="flex items-center gap-2 h-8">
              <input type="radio" data-agent={`notepad-theme-${t}`} checked={prefs.theme === t} onChange={() => setPref({ theme: t })} className="accent-[var(--n-acc)]" />
              {t === 'system' ? 'Use system setting' : t === 'light' ? 'Light' : 'Dark'}
            </label>
          ))}
        </Row>
        <Row icon={TextFont20Regular} title="Font" sub={`${prefs.font}, ${prefs.fontStyle}, ${prefs.fontSize}`} right={<button data-agent="notepad-settings-font" onClick={openFont} className={btn}>Change</button>} />
        <div className="text-[14px] font-semibold mt-6 mb-2">Text formatting</div>
        <Row icon={TextWrap20Regular} title="Word wrap" sub="Fit text within the window by default" right={<Sw on={prefs.wrap} set={(v) => setPref({ wrap: v })} agent="notepad-settings-wrap" />} />
        <Row icon={TextFont20Regular} title="Spelling" sub="Show spelling errors in the editor" right={<Sw on={!!prefs.spell} set={(v) => setPref({ spell: v })} agent="notepad-settings-spell" />} />
        <Row icon={Info20Regular} title="Status bar" sub="Show line, column and character count" right={<Sw on={prefs.status} set={(v) => setPref({ status: v })} agent="notepad-settings-status" />} />
        <div className="text-[14px] font-semibold mt-6 mb-2">Copilot</div>
        <Row icon={Settings20Regular} title="Copilot in Notepad" sub="Show the Copilot menu in the toolbar" right={<Sw on={!!prefs.copilot} set={(v) => setPref({ copilot: v })} agent="notepad-settings-copilot" />} />
        <div className="text-[14px] font-semibold mt-6 mb-2">About this app</div>
        <div className="rounded-[6px] bg-[var(--n-card)] border border-[var(--n-line)] px-4 py-3 text-[13px] text-[var(--n-sub)]">
          Windows Notepad 11.2410.21.0
          <br />© 2026 Microsoft. All rights reserved.
        </div>
      </div>
    </div>
  )
}
