import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  TextEditStyle20Regular,
  Emoji20Regular,
  Gif20Regular,
  Sticker20Regular,
  Attach20Regular,
  Add20Regular,
  Send20Filled,
  TextBold20Regular,
  TextItalic20Regular,
  TextUnderline20Regular,
  TextStrikethrough20Regular,
  Highlight20Regular,
  TextColor20Regular,
  TextFontSize20Regular,
  TextBulletListLtr20Regular,
  TextNumberListLtr20Regular,
  TextQuote20Regular,
  Link20Regular,
  Code20Regular,
  Table20Regular,
  ArrowSync20Regular,
  Important16Filled,
  Dismiss16Regular,
  Folder20Regular,
  Document20Regular,
  ArrowUpload20Regular,
  Poll20Regular,
  Trophy20Regular,
  TaskListLtr20Regular,
  CheckmarkCircle20Regular,
} from '@fluentui/react-icons'
import { useCollection } from '@/db/db'
import { useDesk } from '@/os/context'
import { PEOPLE } from '@/data/people'
import { logoUrl } from '@/os/registry'
import { EMOJI_SET, GIFS, PURPLE, STICKERS, fmtSize, kindOf, useMenu, type Attachment } from './ui'

const FONT = 'var(--font-win)'

/* ───────────────────────────── rich text ───────────────────────────── */

/** light markdown: **bold**, _italic_, __underline__, ~~strike~~, ==highlight==, `code`, [link](url), URLs, @Mentions, bullets, numbers, > quotes, | tables */
export function RichText({ text }: { text: string }) {
  const names = PEOPLE.map((p) => p.name).concat(PEOPLE.map((p) => p.first))
  const inline = (s: string, k: number) => {
    const parts = s.split(/(\*\*[^*]+\*\*|(?<![A-Za-z0-9])__[^_\n]+__(?![A-Za-z0-9])|(?<![A-Za-z0-9_])_[^_\n]+_(?![A-Za-z0-9_])|~~[^~\n]+~~|==[^=\n]+==|\^\^[^^\n]+\^\^|!![^!\n]+!!|`[^`\n]+`|\[[^\]\n]+\]\([^)\s]+\)|https?:\/\/[^\s)]+|@[A-Z][a-zA-Z'’]+(?: [A-Z][a-zA-Z'’]+)?)/g)
    return parts.map((p, i) => {
      const key = `${k}-${i}`
      if (p.startsWith('**') && p.endsWith('**') && p.length > 4) return <strong key={key}>{p.slice(2, -2)}</strong>
      if (p.startsWith('__') && p.endsWith('__') && p.length > 4) return <u key={key}>{p.slice(2, -2)}</u>
      if (/^_[^_].*_$/.test(p)) return <em key={key}>{p.slice(1, -1)}</em>
      if (p.startsWith('~~') && p.endsWith('~~') && p.length > 4) return <s key={key}>{p.slice(2, -2)}</s>
      if (p.startsWith('==') && p.endsWith('==') && p.length > 4) return <mark key={key} className="bg-[#FFF100] px-0.5">{p.slice(2, -2)}</mark>
      if (p.startsWith('^^') && p.endsWith('^^') && p.length > 4) return <span key={key} className="text-[18px] font-semibold">{p.slice(2, -2)}</span>
      if (p.startsWith('!!') && p.endsWith('!!') && p.length > 4) return <span key={key} className="text-[#C4314B]">{p.slice(2, -2)}</span>
      if (p.startsWith('`') && p.endsWith('`') && p.length > 2) return <code key={key} className="px-1 rounded bg-[#F0F0F0] text-[12.5px] font-mono">{p.slice(1, -1)}</code>
      const md = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(p)
      if (md) return <span key={key} className="underline cursor-pointer" style={{ color: PURPLE }} title={md[2]}>{md[1]}</span>
      if (/^https?:\/\//.test(p)) return <span key={key} className="underline cursor-pointer break-all" style={{ color: PURPLE }}>{p}</span>
      if (p.startsWith('@') && names.some((n) => p.slice(1).startsWith(n))) return <span key={key} className="font-semibold" style={{ color: PURPLE }}>{p.slice(1)}</span>
      return <Fragment key={key}>{p}</Fragment>
    })
  }
  const lines = text.split('\n')
  const out: ReactNode[] = []
  let list: ReactNode[] = []
  let olist: ReactNode[] = []
  let table: string[][] = []
  const flush = () => {
    if (list.length) out.push(<ul key={`ul-${out.length}`} className="list-disc pl-5 my-0.5 space-y-0.5">{list}</ul>)
    if (olist.length) out.push(<ol key={`ol-${out.length}`} className="list-decimal pl-5 my-0.5 space-y-0.5">{olist}</ol>)
    if (table.length)
      out.push(
        <table key={`tb-${out.length}`} className="my-1 border-collapse text-[13px]">
          <tbody>
            {table.map((r, ri) => (
              <tr key={ri}>{r.map((c, ci) => <td key={ci} className={`border border-[#D1D1D1] px-2 py-0.5 ${ri === 0 ? 'font-semibold bg-[#F5F5F5]' : ''}`}>{inline(c, ri * 100 + ci)}</td>)}</tr>
            ))}
          </tbody>
        </table>,
      )
    list = []
    olist = []
    table = []
  }
  lines.forEach((l, i) => {
    const b = /^\s*[•\-*]\s+(.*)$/.exec(l)
    const n = /^\s*\d+[.)]\s+(.*)$/.exec(l)
    const q = /^>\s?(.*)$/.exec(l)
    if (/^\s*\|.*\|\s*$/.test(l)) {
      if (!/^\s*\|[\s|:-]+\|\s*$/.test(l)) table.push(l.trim().slice(1, -1).split('|').map((c) => c.trim()))
    } else if (b) list.push(<li key={i}>{inline(b[1], i)}</li>)
    else if (n) olist.push(<li key={i}>{inline(n[1], i)}</li>)
    else if (q) {
      flush()
      out.push(<div key={i} className="border-l-4 border-[#C7C7C7] pl-2 text-[#616161] my-0.5">{inline(q[1], i)}</div>)
    } else {
      flush()
      out.push(<div key={i} className={l.trim() ? '' : 'h-2'}>{inline(l, i)}</div>)
    }
  })
  flush()
  return <div className="leading-[1.45]">{out}</div>
}

/* ───────────────────────────── file card ───────────────────────────── */

export function FileGlyph({ kind, size = 20 }: { kind: string; size?: number }) {
  if (['xlsx', 'docx', 'pptx'].includes(kind)) return <img src={logoUrl(kind === 'xlsx' ? 'excel' : kind === 'docx' ? 'word' : 'powerpoint')} style={{ width: size, height: size }} alt="" />
  if (kind === 'pdf') return <Document20Regular className="text-[#C4314B]" />
  if (kind === 'zip') return <Folder20Regular />
  return <Document20Regular />
}

export function FileCard({ a, onRemove }: { a: Attachment; onRemove?: () => void }) {
  const { open, toast } = useDesk()
  return (
    <div className="flex items-center gap-2.5 h-12 pl-2.5 pr-2 rounded-md border border-[#E0E0E0] bg-white w-[260px] max-w-full">
      <button className="flex items-center gap-2.5 min-w-0 flex-1 text-left" onClick={() => (a.open ? open(a.open.appId, a.open.params) : toast({ appId: 'teams', title: a.name, body: 'Preview isn’t available for this file type.' }))}>
        <FileGlyph kind={a.kind} size={24} />
        <div className="min-w-0">
          <div className="text-[13px] truncate hover:underline">{a.name}</div>
          <div className="text-[11.5px] text-[#616161]">{a.size}</div>
        </div>
      </button>
      {onRemove && (
        <button className="w-6 h-6 rounded hover:bg-[#F0F0F0] flex items-center justify-center" aria-label={`Remove ${a.name}`} onClick={onRemove}>
          <Dismiss16Regular />
        </button>
      )}
    </div>
  )
}

/* ───────────────────────────── compose ───────────────────────────── */

export interface SendExtra {
  subject?: string
  important?: boolean
  attachments?: Attachment[]
  sticker?: string
  caption?: string
}

export function Compose({ placeholder, onSend, allowSubject, prefill }: { placeholder: string; onSend: (text: string, extra?: SendExtra) => void; allowSubject?: boolean; prefill?: { text: string; n: number } }) {
  const [text, setText] = useState('')
  const [format, setFormat] = useState(false)
  const [subject, setSubject] = useState('')
  const [important, setImportant] = useState(false)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const files = useCollection<any>('files')
  const ref = useRef<HTMLTextAreaElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const emoji = useMenu()
  const gif = useMenu()
  const sticker = useMenu()
  const attach = useMenu()
  const loop = useMenu()
  const apps = useMenu()
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(220, Math.max(22, el.scrollHeight)) + 'px'
  }, [text])
  useEffect(() => {
    if (prefill?.n) {
      setText(prefill.text)
      requestAnimationFrame(() => ref.current?.focus())
    }
  }, [prefill?.n])
  const send = () => {
    const t = text.trim()
    if (!t && !attachments.length) return
    const extra: SendExtra = {}
    if (allowSubject && format && subject.trim()) extra.subject = subject.trim()
    if (important) extra.important = true
    if (attachments.length) extra.attachments = attachments
    onSend(t, Object.keys(extra).length ? extra : undefined)
    setText('')
    setSubject('')
    setImportant(false)
    setAttachments([])
  }
  const sel = () => {
    const el = ref.current
    return { s: el?.selectionStart ?? text.length, e: el?.selectionEnd ?? text.length }
  }
  const restore = (pos: number, end = pos) =>
    requestAnimationFrame(() => {
      const el = ref.current
      if (!el) return
      el.focus()
      el.selectionStart = pos
      el.selectionEnd = end
    })
  const wrap = (pre: string, post = pre, placeholderText = 'text') => {
    const { s, e } = sel()
    const inner = text.slice(s, e) || placeholderText
    setText(text.slice(0, s) + pre + inner + post + text.slice(e))
    restore(s + pre.length, s + pre.length + inner.length)
  }
  const insert = (str: string) => {
    const { s, e } = sel()
    setText(text.slice(0, s) + str + text.slice(e))
    restore(s + str.length)
  }
  const prefixLines = (fn: (i: number) => string) => {
    const { s, e } = sel()
    const ls = text.lastIndexOf('\n', s - 1) + 1
    const block = text.slice(ls, Math.max(s, e))
    const out = block.split('\n').map((l, i) => fn(i) + l).join('\n')
    setText(text.slice(0, ls) + out + text.slice(Math.max(s, e)))
    restore(ls + out.length)
  }
  const addLocal = (list: FileList | null) => {
    if (!list?.length) return
    setAttachments((a) => [...a, ...Array.from(list).map((f) => ({ name: f.name, size: fmtSize(f.size), kind: kindOf(f.name) }))])
    attach.close()
  }
  const icon = 'w-8 h-8 rounded flex items-center justify-center text-[#424242] hover:bg-[#F0F0F0] hover:text-[#5B5FC7]'
  const fmtButtons: [any, string, () => void][] = [
    [TextBold20Regular, 'Bold', () => wrap('**')],
    [TextItalic20Regular, 'Italic', () => wrap('_')],
    [TextUnderline20Regular, 'Underline', () => wrap('__')],
    [TextStrikethrough20Regular, 'Strikethrough', () => wrap('~~')],
  ]
  const fmtButtons2: [any, string, () => void][] = [
    [Highlight20Regular, 'Highlight', () => wrap('==')],
    [TextColor20Regular, 'Font color', () => wrap('!!')],
    [TextFontSize20Regular, 'Font size', () => wrap('^^')],
  ]
  const fmtButtons3: [any, string, () => void][] = [
    [TextBulletListLtr20Regular, 'Bulleted list', () => prefixLines(() => '• ')],
    [TextNumberListLtr20Regular, 'Numbered list', () => prefixLines((i) => `${i + 1}. `)],
    [TextQuote20Regular, 'Quote', () => prefixLines(() => '> ')],
    [Link20Regular, 'Insert link', () => wrap('[', '](https://)', 'link text')],
    [Code20Regular, 'Code snippet', () => wrap('`')],
    [Table20Regular, 'Insert table', () => insert(`${text && !text.endsWith('\n') ? '\n' : ''}| Column 1 | Column 2 |\n| --- | --- |\n| | |\n`)],
  ]
  const pickerBtn = (m: ReturnType<typeof useMenu>, I: any, label: string, agent?: string) => (
    <button className={icon} aria-label={label} data-agent={agent} onClick={m.toggle} style={m.open ? { color: PURPLE } : undefined}>
      <I />
    </button>
  )
  return (
    <div className="px-5 pb-4 pt-1 shrink-0">
      <div className="rounded-md bg-white shadow-[0_0_2px_rgba(0,0,0,0.12),0_2px_4px_rgba(0,0,0,0.14)] border-b-2 border-transparent focus-within:border-[#5B5FC7]">
        {format && (
          <div className="flex items-center gap-0.5 px-2 h-10 border-b border-[#EDEBE9]">
            {fmtButtons.map(([I, l, fn], i) => (
              <button key={i} className={icon} aria-label={l} title={l} onClick={fn}>
                <I />
              </button>
            ))}
            <span className="w-px h-5 bg-[#E0E0E0] mx-1" />
            {fmtButtons2.map(([I, l, fn], i) => (
              <button key={i} className={icon} title={l} onClick={fn}>
                <I />
              </button>
            ))}
            <span className="w-px h-5 bg-[#E0E0E0] mx-1" />
            {fmtButtons3.map(([I, l, fn], i) => (
              <button key={i} className={icon} title={l} onClick={fn}>
                <I />
              </button>
            ))}
            <span className="text-[12.5px] text-[#616161] ml-2">Paragraph ▾</span>
            <div className="flex-1" />
            <button title="Mark as important" aria-pressed={important} onClick={() => setImportant((v) => !v)} className={`h-7 px-2 rounded flex items-center gap-1 text-[12.5px] ${important ? 'bg-[#FDE7E9] text-[#C4314B]' : 'text-[#424242] hover:bg-[#F0F0F0]'}`}>
              <Important16Filled /> Important
            </button>
          </div>
        )}
        {format && allowSubject && (
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Add a subject" aria-label="Subject" className="w-full h-10 px-3 text-[16px] font-semibold outline-none border-b border-[#EDEBE9]" />
        )}
        {important && !format && <div className="px-3 pt-1.5 text-[12px] text-[#C4314B] flex items-center gap-1"><Important16Filled /> Important</div>}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 px-3 pt-2">
            {attachments.map((a, i) => (
              <FileCard key={i} a={a} onRemove={() => setAttachments((x) => x.filter((_, j) => j !== i))} />
            ))}
          </div>
        )}
        <div className="flex items-end gap-1 pl-3 pr-1.5 py-1.5">
          <textarea
            ref={ref}
            data-agent="teams-compose"
            aria-label="Type a message"
            value={text}
            rows={1}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            placeholder={placeholder}
            className="flex-1 resize-none outline-none text-[14px] leading-[22px] py-[5px] bg-transparent placeholder:text-[#616161]"
            style={{ fontFamily: FONT }}
          />
          <div className="flex items-center shrink-0">
            <button className={icon} aria-label="Format" onClick={() => setFormat((f) => !f)} style={format ? { color: PURPLE } : undefined}>
              <TextEditStyle20Regular />
            </button>
            <div className="relative" ref={emoji.ref}>
              {pickerBtn(emoji, Emoji20Regular, 'Emoji')}
              {emoji.open && (
                <div className="absolute bottom-10 right-0 z-50 w-[300px] bg-white rounded-lg shadow-[0_8px_28px_rgba(0,0,0,0.2)] p-2">
                  <div className="text-[12px] font-semibold text-[#616161] px-1 pb-1">Emoji</div>
                  <div className="grid grid-cols-8 gap-0.5">
                    {EMOJI_SET.map((em) => (
                      <button key={em} className="h-8 rounded hover:bg-[#F0F0F0] text-[18px]" onClick={() => { insert(em); emoji.close() }}>{em}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="relative" ref={gif.ref}>
              {pickerBtn(gif, Gif20Regular, 'GIF')}
              {gif.open && (
                <div className="absolute bottom-10 right-0 z-50 w-[300px] bg-white rounded-lg shadow-[0_8px_28px_rgba(0,0,0,0.2)] p-2">
                  <div className="text-[12px] font-semibold text-[#616161] px-1 pb-1">Trending GIFs</div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {GIFS.map(([g, cap]) => (
                      <button key={cap} className="h-20 rounded-md bg-gradient-to-br from-[#E8EBFA] to-[#F5F5F5] hover:ring-2 hover:ring-[#5B5FC7] flex flex-col items-center justify-center" onClick={() => { onSend('', { sticker: g, caption: cap }); gif.close() }}>
                        <span className="text-[30px] animate-bounce">{g}</span>
                        <span className="text-[11px] text-[#424242]">{cap}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="relative" ref={sticker.ref}>
              {pickerBtn(sticker, Sticker20Regular, 'Sticker')}
              {sticker.open && (
                <div className="absolute bottom-10 right-0 z-50 w-[300px] bg-white rounded-lg shadow-[0_8px_28px_rgba(0,0,0,0.2)] p-2">
                  <div className="text-[12px] font-semibold text-[#616161] px-1 pb-1">Stickers</div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {STICKERS.map(([s, cap]) => (
                      <button key={cap} title={cap} className="h-16 rounded-md hover:bg-[#F0F0F0] flex flex-col items-center justify-center" onClick={() => { onSend('', { sticker: s, caption: cap }); sticker.close() }}>
                        <span className="text-[30px]">{s}</span>
                        <span className="text-[10.5px] text-[#616161]">{cap}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="relative" ref={attach.ref}>
              {pickerBtn(attach, Attach20Regular, 'Attach file')}
              {attach.open && (
                <div className="absolute bottom-10 right-0 z-50 w-[320px] bg-white rounded-lg shadow-[0_8px_28px_rgba(0,0,0,0.2)] py-1">
                  <div className="px-3 py-1.5 text-[12px] font-semibold text-[#616161]">OneDrive · Recent</div>
                  <div className="max-h-[260px] overflow-auto">
                    {[...files].sort((x, y) => +new Date(y.modified ?? 0) - +new Date(x.modified ?? 0)).slice(0, 30).map((f) => (
                      <button key={f.id} data-agent={`teams-attach-file-${f.id}`} className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-[#F5F5F5] text-left" onClick={() => { setAttachments((a) => [...a, { name: f.name, size: f.size, kind: f.kind, open: f.open }]); attach.close() }}>
                        <FileGlyph kind={f.kind} />
                        <div className="min-w-0">
                          <div className="text-[13px] truncate">{f.name}</div>
                          <div className="text-[11px] text-[#616161]">{f.folder} · {f.size}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="h-px bg-[#EDEBE9] my-1" />
                  <button className="w-full flex items-center gap-2 px-3 h-8 text-[13px] hover:bg-[#F5F5F5]" onClick={() => fileInput.current?.click()}><ArrowUpload20Regular /> Upload from this device</button>
                </div>
              )}
              <input ref={fileInput} type="file" multiple className="hidden" onChange={(e) => { addLocal(e.target.files); e.target.value = '' }} />
            </div>
            <div className="relative" ref={loop.ref}>
              {pickerBtn(loop, ArrowSync20Regular, 'Loop component')}
              {loop.open && (
                <div className="absolute bottom-10 right-0 z-50 w-[240px] bg-white rounded-lg shadow-[0_8px_28px_rgba(0,0,0,0.2)] py-1">
                  <div className="px-3 py-1.5 text-[12px] font-semibold text-[#616161]">Loop components</div>
                  {[
                    ['Checklist', '☐ \n☐ \n☐ '],
                    ['Bulleted list', '• \n• \n• '],
                    ['Numbered list', '1. \n2. \n3. '],
                    ['Table', '| Item | Owner | Status |\n| --- | --- | --- |\n| | | |'],
                    ['Task list', '| Task | Assigned to | Due |\n| --- | --- | --- |\n| | | |'],
                  ].map(([l, tpl]) => (
                    <button key={l} className="w-full flex items-center gap-2 px-3 h-8 text-[13px] hover:bg-[#F5F5F5]" onClick={() => { insert((text && !text.endsWith('\n') ? '\n' : '') + tpl); loop.close() }}>
                      <TaskListLtr20Regular className="text-[#424242]" /> {l}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="relative" ref={apps.ref}>
              {pickerBtn(apps, Add20Regular, 'Actions and apps')}
              {apps.open && (
                <div className="absolute bottom-10 right-0 z-50 w-[260px] bg-white rounded-lg shadow-[0_8px_28px_rgba(0,0,0,0.2)] py-1">
                  <div className="px-3 py-1.5 text-[12px] font-semibold text-[#616161]">Actions and apps</div>
                  {[
                    [Poll20Regular, 'Polls', '📊 **Quick poll:** <question>\n1. Option A\n2. Option B\n3. Option C\nReact with 👍 on your pick!'],
                    [CheckmarkCircle20Regular, 'Approvals', '✅ **Approval request:** <what needs approval>\nApprover: @\nDue: '],
                    [Trophy20Regular, 'Praise', '🏆 **Praise** for @ — thank you for '],
                    [TaskListLtr20Regular, 'Tasks by Planner', '📋 **New task:** \nAssigned to: @\nDue: '],
                  ].map(([I, l, tpl]: any) => (
                    <button key={l} className="w-full flex items-center gap-2 px-3 h-8 text-[13px] hover:bg-[#F5F5F5]" onClick={() => { insert((text && !text.endsWith('\n') ? '\n' : '') + tpl); apps.close() }}>
                      <I className="text-[#424242]" /> {l}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <span className="w-px h-5 bg-[#E0E0E0] mx-1" />
            <button data-agent="teams-send" aria-label="Send" onClick={send} className={`w-8 h-8 rounded flex items-center justify-center ${text.trim() || attachments.length ? 'text-[#5B5FC7] hover:bg-[#F0F0F0]' : 'text-[#BDBDBD]'}`}>
              <Send20Filled />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
