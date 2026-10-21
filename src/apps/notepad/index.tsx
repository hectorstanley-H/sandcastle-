import { useEffect, useMemo, useRef, useState } from 'react'
import { Add16Regular, Dismiss12Regular, Settings20Regular, Circle12Filled } from '@fluentui/react-icons'
import type { AppProps } from '@/os/registry'
import { logoUrl } from '@/os/registry'
import { WindowControls } from '@/os/Window'
import { useDesk, useWin } from '@/os/context'
import { db, uid, useCollection } from '@/db/db'

/** notepad.notes: { id, name, content, saved, modified, path?, createdBy? } */

type MenuId = 'file' | 'edit' | 'view' | null

export default function Notepad({ win, params }: AppProps) {
  const notes = useCollection('notepad.notes')
  const { isAgent } = useDesk()
  const { setTitle, close } = useWin()
  const [tabs, setTabs] = useState<string[]>(() => [])
  const [active, setActive] = useState<string | null>(null)
  const [menu, setMenu] = useState<MenuId>(null)
  const [zoom, setZoom] = useState(100)
  const [wrap, setWrap] = useState(true)
  const [status, setStatus] = useState(true)
  const [caret, setCaret] = useState({ ln: 1, col: 1 })
  const ta = useRef<HTMLTextAreaElement>(null)

  const newNote = (name?: string, content = '') => {
    const id = uid('n')
    const untitled = name ?? 'Untitled'
    db.insert('notepad.notes', { id, name: untitled, content, saved: name ? content : '', modified: new Date().toISOString(), untitled: !name, createdBy: isAgent ? 'hworker' : undefined })
    setTabs((t) => [...t, id])
    setActive(id)
    return id
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

  const update = (content: string) => note && db.update('notepad.notes', note.id, { content, saved: note.saved ?? note.content, updatedBy: isAgent ? 'hworker' : note.updatedBy })
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
  const closeTab = (id: string) => {
    const rest = tabs.filter((t) => t !== id)
    if (!rest.length) return close()
    setTabs(rest)
    if (active === id) setActive(rest[rest.length - 1])
  }
  const insert = (text: string) => {
    const el = ta.current
    if (!el || !note) return
    const s = el.selectionStart
    const v = note.content.slice(0, s) + text + note.content.slice(el.selectionEnd)
    update(v)
    requestAnimationFrame(() => el.setSelectionRange(s + text.length, s + text.length))
  }
  const onCaret = () => {
    const el = ta.current
    if (!el) return
    const before = el.value.slice(0, el.selectionStart)
    const lines = before.split('\n')
    setCaret({ ln: lines.length, col: lines[lines.length - 1].length + 1 })
  }
  const chars = useMemo(() => (note?.content ?? '').replace(/\r/g, '').length, [note?.content])

  const timeDate = () => new Date().toLocaleString('en-US', { hour: 'numeric', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString('en-US')

  const menus: Record<string, [string, string?, (() => void)?, string?][]> = {
    file: [
      ['New tab', 'Ctrl+N', () => { setMenu(null); newNote() }, 'notepad-new-tab'],
      ['New window', 'Ctrl+Shift+N'],
      ['Open', 'Ctrl+O'],
      ['Recent'],
      ['-'],
      ['Save', 'Ctrl+S', save, 'notepad-save'],
      ['Save as', 'Ctrl+Shift+S', save],
      ['Save all', 'Ctrl+Alt+S', save],
      ['-'],
      ['Page setup'],
      ['Print', 'Ctrl+P'],
      ['-'],
      ['Close tab', 'Ctrl+W', () => { setMenu(null); active && closeTab(active) }],
      ['Close window', 'Ctrl+Shift+W', () => close()],
      ['Exit', '', () => close()],
    ],
    edit: [
      ['Undo', 'Ctrl+Z'],
      ['-'],
      ['Cut', 'Ctrl+X'],
      ['Copy', 'Ctrl+C'],
      ['Paste', 'Ctrl+V'],
      ['Delete', 'Del'],
      ['-'],
      ['Search with Bing', 'Ctrl+E'],
      ['Find', 'Ctrl+F'],
      ['Find next', 'F3'],
      ['Find previous', 'Shift+F3'],
      ['Replace', 'Ctrl+H'],
      ['Go to', 'Ctrl+G'],
      ['-'],
      ['Select all', 'Ctrl+A', () => { setMenu(null); ta.current?.select() }],
      ['Time/Date', 'F5', () => { setMenu(null); insert(timeDate()) }, 'notepad-timedate'],
      ['-'],
      ['Font'],
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

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[#F3F3F3] text-[#1A1A1A]" style={{ fontFamily: 'var(--font-win)' }} onPointerDown={() => setMenu(null)}>
      {/* tab strip / title bar */}
      <div data-drag-handle className="h-[40px] shrink-0 flex items-end pl-1.5 bg-[#EEEEEE]">
        <img src={logoUrl('notepad')} className="w-4 h-4 mx-2.5 mb-3" alt="" />
        {tabs.map((id) => {
          const n = notes.find((x) => x.id === id)
          if (!n) return null
          const on = id === active
          return (
            <div
              key={id}
              data-agent={`notepad-tab-${id}`}
              onClick={() => setActive(id)}
              className={`group relative h-[34px] w-[200px] flex items-center pl-3 pr-1.5 gap-2 rounded-t-[8px] text-[12px] ${on ? 'bg-[#FBFBFB]' : 'hover:bg-white/60'}`}
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
                className={`w-6 h-6 rounded items-center justify-center hover:bg-black/[0.06] ${dirty(n) ? 'hidden group-hover:flex' : 'flex'}`}
              >
                <Dismiss12Regular />
              </button>
            </div>
          )
        })}
        <button data-agent="notepad-new-tab" aria-label="Add new tab" onClick={() => newNote()} className="w-8 h-8 mb-[3px] ml-1 rounded flex items-center justify-center hover:bg-black/[0.05]">
          <Add16Regular />
        </button>
        <div className="flex-1 h-full" />
        <WindowControls height={40} />
      </div>
      {/* menu bar */}
      <div className="h-[36px] shrink-0 flex items-center px-1.5 bg-[#FBFBFB] relative" onPointerDown={(e) => e.stopPropagation()}>
        {(['file', 'edit', 'view'] as const).map((m) => (
          <div key={m} className="relative">
            <button data-agent={`notepad-menu-${m}`} onClick={() => setMenu(menu === m ? null : m)} className={`h-7 px-2.5 rounded-[4px] text-[12.5px] capitalize ${menu === m ? 'bg-black/[0.06]' : 'hover:bg-black/[0.05]'}`}>
              {m}
            </button>
            {menu === m && (
              <div className="absolute z-50 left-0 top-8 w-[260px] py-1 rounded-lg bg-[#F9F9F9] border border-black/[0.08] shadow-[0_8px_16px_rgba(0,0,0,0.14)] menu-open">
                {menus[m].map(([l, k, fn, ag], i) =>
                  l === '-' ? (
                    <div key={i} className="h-px bg-black/[0.08] my-1" />
                  ) : (
                    <button key={i} data-agent={ag} onClick={fn ?? (() => setMenu(null))} className="w-[calc(100%-8px)] mx-1 h-8 flex items-center px-3 rounded-[4px] text-[12.5px] hover:bg-black/[0.05] text-left">
                      <span className="flex-1">{l}</span>
                      <span className="text-[11.5px] text-[#6B6B6B]">{k}</span>
                    </button>
                  ),
                )}
              </div>
            )}
          </div>
        ))}
        <div className="flex-1" />
        <button aria-label="Copilot" className="h-7 px-2 rounded-[4px] hover:bg-black/[0.05] flex items-center gap-1.5 text-[12.5px]">
          <svg width="16" height="16" viewBox="0 0 24 24"><defs><linearGradient id="cpg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#2870EA" /><stop offset=".5" stopColor="#1B4AEF" /><stop offset="1" stopColor="#D23BC7" /></linearGradient></defs><path d="M8 3h6l-4 18H4z M14 3h6l-4 18h-6z" fill="url(#cpg)" opacity=".9" /></svg>
          <span className="text-[#6B6B6B]">▾</span>
        </button>
        <button aria-label="Settings" className="w-8 h-7 rounded-[4px] hover:bg-black/[0.05] flex items-center justify-center">
          <Settings20Regular />
        </button>
      </div>
      {/* editor */}
      <div className="flex-1 min-h-0 bg-[#FBFBFB] border-t border-black/[0.06]">
        {note && (
          <textarea
            ref={ta}
            data-agent="notepad-editor"
            aria-label="Text editor"
            spellCheck={false}
            value={note.content.replace(/\r\n/g, '\n')}
            onChange={(e) => update(e.target.value)}
            onKeyUp={onCaret}
            onClick={onCaret}
            onSelect={onCaret}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault()
                save()
              }
              if (e.key === 'F5') {
                e.preventDefault()
                insert(timeDate())
              }
            }}
            wrap={wrap ? 'soft' : 'off'}
            className="w-full h-full resize-none outline-none bg-transparent px-3 py-2 text-[#1A1A1A] leading-[1.45]"
            style={{ fontFamily: 'Consolas, "Cascadia Mono", "Courier New", monospace', fontSize: (14.5 * zoom) / 100, whiteSpace: wrap ? 'pre-wrap' : 'pre' }}
          />
        )}
      </div>
      {status && (
        <div className="h-[28px] shrink-0 flex items-center bg-[#F3F3F3] border-t border-black/[0.06] text-[12px] text-[#1A1A1A]">
          <span className="px-3" data-agent="notepad-caret">Ln {caret.ln}, Col {caret.col}</span>
          <span className="w-px h-4 bg-black/15" />
          <span className="px-3">{chars.toLocaleString()} characters</span>
          {note?.updatedBy === 'hworker' && (
            <span className="ml-1 inline-flex items-center gap-1 h-[18px] pl-0.5 pr-1.5 rounded-full bg-[#430693] text-white text-[10px] font-semibold" style={{ fontFamily: 'var(--font-brand)' }}>
              <img src={logoUrl('hworker')} className="w-3.5 h-3.5 rounded-full" alt="" /> Edited by H-Worker
            </span>
          )}
          <div className="flex-1" />
          <span className="px-4 w-[70px]">{zoom}%</span>
          <span className="w-px h-4 bg-black/15" />
          <span className="px-4">Windows (CRLF)</span>
          <span className="w-px h-4 bg-black/15" />
          <span className="px-4">UTF-8</span>
        </div>
      )}
    </div>
  )
}
