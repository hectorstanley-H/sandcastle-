/** Word side panes and dialogs: Navigation, Comments, Editor (proofing), Find & Replace, Word Count. */
import { useMemo, useState } from 'react'
import { Search20Regular, CheckmarkCircle16Regular, Delete16Regular, TextGrammarCheckmark20Regular, ChevronRight12Regular } from '@fluentui/react-icons'
import { Avatar } from '@/components/Avatar'
import { ME, PEOPLE } from '@/data/people'
import { fmtSmart } from '@/data/time'
import { SidePane } from '@/apps/excel/Panes'
import { Btn, Field, Modal, inputCls } from '@/apps/excel/ui'
import type { Para } from './Editor'

const BLUE = '#185ABD'
const nameOf = (id: string) => PEOPLE.find((p) => p.id === id)?.name ?? id

export interface WordComment {
  id: string
  pid: string
  author: string
  text: string
  at: string
  quote?: string
  resolved?: boolean
  replies?: { author: string; text: string; at: string }[]
}

/* ───────────── Navigation pane ───────────── */

export function NavigationPane({ paragraphs, query, setQuery, onGo, onClose, activeId }: { paragraphs: Para[]; query: string; setQuery: (q: string) => void; onGo: (id: string) => void; onClose: () => void; activeId?: string }) {
  const [tab, setTab] = useState<'headings' | 'results'>(query ? 'results' : 'headings')
  const q = query.trim().toLowerCase()
  const hits = useMemo(() => (q ? paragraphs.filter((p) => p.text.toLowerCase().includes(q)) : []), [paragraphs, q])
  const count = useMemo(() => (q ? paragraphs.reduce((n, p) => n + (p.text.toLowerCase().split(q).length - 1), 0) : 0), [paragraphs, q])
  const heads = paragraphs.filter((p) => (p.style === 'heading1' || p.style === 'heading2' || p.style === 'heading3') && p.text.trim())
  return (
    <div className="w-[280px] shrink-0 bg-white border-r border-[#E0E0E0] flex flex-col" data-agent="word-navigation-pane">
      <div className="h-11 flex items-center px-4 shrink-0">
        <span className="text-[15px] font-semibold flex-1">Navigation</span>
        <button aria-label="Close navigation" onClick={onClose} className="w-7 h-7 rounded hover:bg-[#F0F0F0] text-[16px] leading-none">
          ×
        </button>
      </div>
      <div className="px-3">
        <div className="flex items-center gap-2 h-8 px-2 rounded border border-[#C7C7C7] focus-within:border-[#185ABD]">
          <Search20Regular className="w-4 h-4 text-[#616161]" />
          <input
            autoFocus
            data-agent="word-nav-search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setTab('results')
            }}
            placeholder="Search document"
            className="flex-1 outline-none text-[13px]"
          />
        </div>
        <div className="flex gap-4 mt-2 border-b border-[#E0E0E0] text-[13px]">
          {(['headings', 'results'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`pb-1.5 ${tab === t ? 'font-semibold border-b-2' : 'text-[#616161]'}`} style={tab === t ? { borderColor: BLUE } : undefined}>
              {t === 'headings' ? 'Headings' : 'Results'}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-auto p-2 text-[13px]">
        {tab === 'headings' &&
          (heads.length ? (
            heads.map((h) => (
              <button key={h.id} onClick={() => onGo(h.id)} className={`w-full text-left flex items-center gap-1 h-8 rounded px-2 hover:bg-[#F0F0F0] ${h.id === activeId ? 'bg-[#E8F0FB]' : ''}`} style={{ paddingLeft: h.style === 'heading2' ? 22 : h.style === 'heading3' ? 36 : 8 }}>
                <ChevronRight12Regular className="text-[#8A8886] shrink-0" />
                <span className="truncate">{h.text}</span>
              </button>
            ))
          ) : (
            <div className="text-[12.5px] text-[#616161] p-2">Create an interactive outline of your document by applying heading styles.</div>
          ))}
        {tab === 'results' && (
          <>
            {q && <div className="text-[12px] text-[#616161] px-2 pb-1">{count ? `${count} result${count === 1 ? '' : 's'}` : 'No results'}</div>}
            {hits.map((p) => {
              const i = p.text.toLowerCase().indexOf(q)
              const start = Math.max(0, i - 30)
              return (
                <button key={p.id} onClick={() => onGo(p.id)} className="w-full text-left rounded px-2 py-1.5 hover:bg-[#F0F0F0] text-[12.5px] leading-snug">
                  {start > 0 && '…'}
                  {p.text.slice(start, i)}
                  <mark className="bg-[#FFFF00]">{p.text.slice(i, i + q.length)}</mark>
                  {p.text.slice(i + q.length, i + q.length + 60)}
                  {i + q.length + 60 < p.text.length && '…'}
                </button>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}

/* ───────────── Comments ───────────── */

export function CommentsPane({
  comments,
  paragraphs,
  activeId,
  draftFor,
  onAdd,
  onReply,
  onResolve,
  onDelete,
  onGo,
  onClose,
}: {
  comments: WordComment[]
  paragraphs: Para[]
  activeId?: string
  draftFor: string | null
  onAdd: (pid: string, text: string) => void
  onReply: (id: string, text: string) => void
  onResolve: (id: string) => void
  onDelete: (id: string) => void
  onGo: (pid: string) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState('')
  const [reply, setReply] = useState<Record<string, string>>({})
  const order = new Map(paragraphs.map((p, i) => [p.id, i]))
  const list = [...comments].sort((a, b) => (order.get(a.pid) ?? 0) - (order.get(b.pid) ?? 0))
  const quoteOf = (pid: string) => paragraphs.find((p) => p.id === pid)?.text.slice(0, 60) ?? ''
  return (
    <SidePane title="Comments" onClose={onClose} agent="word-comments-pane" width={300}>
      <div className="p-3 space-y-3">
        {draftFor && (
          <div className="rounded-md border-2 p-2.5" style={{ borderColor: BLUE }}>
            <div className="flex items-center gap-2 mb-1">
              <Avatar id={ME.id} size={24} />
              <span className="text-[12.5px] font-semibold">{ME.name}</span>
            </div>
            <div className="text-[11.5px] text-[#616161] border-l-2 border-[#C8C8C8] pl-2 mb-2 truncate">{quoteOf(draftFor) || '(empty paragraph)'}</div>
            <textarea autoFocus data-agent="word-comment-input" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Start a conversation. Use @mention to notify someone." className="w-full h-[64px] resize-none outline-none text-[13px]" />
            <div className="flex justify-end">
              <button
                data-agent="word-comment-post"
                disabled={!draft.trim()}
                onClick={() => {
                  onAdd(draftFor, draft.trim())
                  setDraft('')
                }}
                className="h-7 px-3 rounded text-white text-[12.5px] font-semibold disabled:opacity-40"
                style={{ background: BLUE }}
              >
                Post
              </button>
            </div>
          </div>
        )}
        {list.map((c) => (
          <div key={c.id} onClick={() => onGo(c.pid)} className={`rounded-md border p-2.5 cursor-pointer ${c.pid === activeId ? 'border-[#185ABD] bg-[#F3F8FE]' : 'border-[#E1E1E1]'} ${c.resolved ? 'opacity-60' : ''}`}>
            <div className="flex items-center gap-2">
              <Avatar id={c.author} size={24} />
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] font-semibold truncate">{nameOf(c.author)}</div>
                <div className="text-[11px] text-[#616161]">{fmtSmart(c.at)}{c.resolved ? ' · Resolved' : ''}</div>
              </div>
              <button title={c.resolved ? 'Reopen' : 'Resolve thread'} aria-label="Resolve thread" onClick={(e) => (e.stopPropagation(), onResolve(c.id))} className="w-6 h-6 rounded hover:bg-[#F0F0F0] flex items-center justify-center text-[#424242]">
                <CheckmarkCircle16Regular />
              </button>
              <button title="Delete thread" aria-label="Delete thread" onClick={(e) => (e.stopPropagation(), onDelete(c.id))} className="w-6 h-6 rounded hover:bg-[#F0F0F0] flex items-center justify-center text-[#424242]">
                <Delete16Regular />
              </button>
            </div>
            {c.quote && <div className="text-[11.5px] text-[#616161] border-l-2 border-[#C8C8C8] pl-2 mt-1.5 truncate">{c.quote}</div>}
            <div className="text-[13px] mt-1.5 whitespace-pre-wrap">{c.text}</div>
            {(c.replies ?? []).map((r, i) => (
              <div key={i} className="mt-2 pl-3 border-l-2 border-[#E1E1E1]">
                <div className="text-[12px] font-semibold">
                  {nameOf(r.author)} <span className="font-normal text-[#616161]">· {fmtSmart(r.at)}</span>
                </div>
                <div className="text-[12.5px] whitespace-pre-wrap">{r.text}</div>
              </div>
            ))}
            {!c.resolved && (
              <input
                value={reply[c.id] ?? ''}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => setReply({ ...reply, [c.id]: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && reply[c.id]?.trim()) {
                    onReply(c.id, reply[c.id].trim())
                    setReply({ ...reply, [c.id]: '' })
                  }
                }}
                placeholder="Reply"
                className="mt-2 w-full h-7 px-2 rounded border border-[#E1E1E1] text-[12.5px] outline-none focus:border-[#185ABD]"
              />
            )}
          </div>
        ))}
        {!list.length && !draftFor && <div className="text-center text-[12.5px] text-[#616161] py-8">No comments yet. Place the cursor in a paragraph and choose New Comment.</div>}
      </div>
    </SidePane>
  )
}

/* ───────────── Editor (proofing) ───────────── */

function syllables(w: string) {
  const s = w.toLowerCase().replace(/[^a-z]/g, '')
  if (s.length <= 3) return 1
  return Math.max(1, (s.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '').match(/[aeiouy]{1,2}/g) ?? []).length)
}

export function proofStats(ps: Para[]) {
  const text = ps.filter((p) => p.style !== 'table' && p.style !== 'toc' && p.style !== 'pagebreak').map((p) => p.text).join('\n')
  const words = text.split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w))
  const sentences = text.split(/[.!?]+(?:\s|$)|\n/).filter((s) => s.trim().split(/\s+/).length > 1)
  const syl = words.reduce((n, w) => n + syllables(w), 0)
  const wps = sentences.length ? words.length / sentences.length : 0
  const flesch = words.length ? Math.round(206.835 - 1.015 * wps - 84.6 * (syl / Math.max(1, words.length))) : 0
  const grade = words.length ? Math.max(0, Math.round((0.39 * wps + 11.8 * (syl / Math.max(1, words.length)) - 15.59) * 10) / 10) : 0
  const issues: { pid: string; kind: string; text: string; fix?: [string, string] }[] = []
  for (const p of ps) {
    const rep = /\b(\w+)\s+\1\b/i.exec(p.text)
    if (rep) issues.push({ pid: p.id, kind: 'Repeated word', text: `“${rep[0]}”`, fix: [rep[0], rep[1]] })
    const dbl = /\S( {2,})\S/.exec(p.text)
    if (dbl) issues.push({ pid: p.id, kind: 'Extra spaces', text: 'Two or more spaces between words', fix: [dbl[1], ' '] })
    for (const s of p.text.split(/(?<=[.!?])\s+/)) if (s.split(/\s+/).length > 40) issues.push({ pid: p.id, kind: 'Clarity', text: `Long sentence (${s.split(/\s+/).length} words): “${s.slice(0, 50)}…”` })
    const passive = /\b(is|are|was|were|be|been|being)\s+\w+ed\b/i.exec(p.text)
    if (passive) issues.push({ pid: p.id, kind: 'Passive voice', text: `“${passive[0]}”` })
    const vague = /\b(very|really|basically|actually)\b/i.exec(p.text)
    if (vague) issues.push({ pid: p.id, kind: 'Conciseness', text: `Consider removing “${vague[0]}”`, fix: [`${vague[0]} `, ''] })
  }
  return {
    words: words.length,
    chars: text.replace(/\n/g, '').length,
    charsNoSpace: text.replace(/\s/g, '').length,
    paragraphs: ps.filter((p) => p.text.trim()).length,
    sentences: sentences.length,
    lines: ps.length,
    wps: Math.round(wps * 10) / 10,
    flesch,
    grade,
    readMin: Math.max(1, Math.round(words.length / 230)),
    issues,
  }
}

export function EditorPane({ paragraphs, onGo, onFix, onClose }: { paragraphs: Para[]; onGo: (pid: string) => void; onFix: (pid: string, from: string, to: string) => void; onClose: () => void }) {
  const st = proofStats(paragraphs)
  const score = Math.max(0, Math.min(100, 100 - st.issues.length * 4 - (st.flesch < 30 ? 10 : 0)))
  return (
    <SidePane title="Editor" onClose={onClose} agent="word-editor-pane" width={300}>
      <div className="p-4 space-y-4 text-[13px]">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-[18px] font-semibold text-white" style={{ background: score >= 80 ? '#107C10' : score >= 60 ? '#CA5010' : '#C42B1C' }}>
            {score}%
          </div>
          <div>
            <div className="font-semibold">Editor score</div>
            <div className="text-[12px] text-[#616161]">{st.issues.length ? `${st.issues.length} suggestion${st.issues.length === 1 ? '' : 's'}` : 'No suggestions — nice work'}</div>
          </div>
        </div>
        <div>
          <div className="text-[12px] font-semibold text-[#616161] mb-1">Suggestions</div>
          {st.issues.slice(0, 12).map((i, k) => (
            <div key={k} className="rounded-md border border-[#E1E1E1] p-2 mb-1.5 hover:bg-[#F7F7F7] cursor-pointer" onClick={() => onGo(i.pid)}>
              <div className="flex items-center gap-1.5 text-[12px] font-semibold">
                <TextGrammarCheckmark20Regular className="w-4 h-4 text-[#185ABD]" />
                {i.kind}
              </div>
              <div className="text-[12.5px] text-[#424242] mt-0.5">{i.text}</div>
              {i.fix && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onFix(i.pid, i.fix![0], i.fix![1])
                  }}
                  className="mt-1 text-[12px] font-semibold hover:underline"
                  style={{ color: BLUE }}
                >
                  {i.fix[1] ? `Change to “${i.fix[1]}”` : 'Remove'}
                </button>
              )}
            </div>
          ))}
        </div>
        <div>
          <div className="text-[12px] font-semibold text-[#616161] mb-1">Document stats</div>
          {[
            ['Words', st.words.toLocaleString()],
            ['Reading time', `${st.readMin} min`],
            ['Average sentence', `${st.wps} words`],
            ['Flesch reading ease', `${st.flesch}`],
            ['Flesch-Kincaid grade level', `${st.grade}`],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between h-6">
              <span className="text-[#616161]">{k}</span>
              <span>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </SidePane>
  )
}

/* ───────────── Find & Replace ───────────── */

export function ReplaceDialog({ initial, onReplaceAll, onFind, onClose }: { initial: string; onReplaceAll: (q: string, r: string, matchCase: boolean) => number; onFind: (q: string) => boolean; onClose: () => void }) {
  const [q, setQ] = useState(initial)
  const [r, setR] = useState('')
  const [mc, setMc] = useState(false)
  const [msg, setMsg] = useState('')
  return (
    <Modal
      title="Find and Replace"
      width={440}
      onClose={onClose}
      agent="word-replace-dialog"
      footer={
        <>
          <Btn color={BLUE} onClick={() => setMsg(onFind(q) ? '' : 'Word couldn’t find what you were looking for.')} disabled={!q}>
            Find Next
          </Btn>
          <Btn
            primary
            color={BLUE}
            agent="word-replace-all"
            disabled={!q}
            onClick={() => {
              const n = onReplaceAll(q, r, mc)
              setMsg(n ? `All done. We made ${n} replacement${n === 1 ? '' : 's'}.` : 'Word couldn’t find a match.')
            }}
          >
            Replace All
          </Btn>
          <Btn onClick={onClose}>Close</Btn>
        </>
      }
    >
      <Field label="Find what">
        <input autoFocus data-agent="word-find-what" className={inputCls} value={q} onChange={(e) => setQ(e.target.value)} />
      </Field>
      <Field label="Replace with">
        <input data-agent="word-replace-with" className={inputCls} value={r} onChange={(e) => setR(e.target.value)} />
      </Field>
      <label className="flex items-center gap-2 text-[12.5px]">
        <input type="checkbox" checked={mc} onChange={(e) => setMc(e.target.checked)} /> Match case
      </label>
      {msg && <div className="mt-3 text-[12.5px] bg-[#F5F5F5] rounded px-2 py-1.5">{msg}</div>}
    </Modal>
  )
}

export function WordCountDialog({ paragraphs, onClose }: { paragraphs: Para[]; onClose: () => void }) {
  const st = proofStats(paragraphs)
  return (
    <Modal title="Word Count" width={320} onClose={onClose} agent="word-count-dialog" footer={<Btn primary color={BLUE} onClick={onClose}>Close</Btn>}>
      <div className="text-[13px] space-y-1.5">
        {[
          ['Pages', ''],
          ['Words', st.words.toLocaleString()],
          ['Characters (no spaces)', st.charsNoSpace.toLocaleString()],
          ['Characters (with spaces)', st.chars.toLocaleString()],
          ['Paragraphs', st.paragraphs.toLocaleString()],
          ['Lines', st.lines.toLocaleString()],
        ]
          .filter(([, v]) => v)
          .map(([k, v]) => (
            <div key={k} className="flex justify-between">
              <span>{k}</span>
              <span>{v}</span>
            </div>
          ))}
      </div>
    </Modal>
  )
}
