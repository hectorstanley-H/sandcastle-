import { useState, type ReactNode } from 'react'
import { Dismiss20Regular, Sparkle20Regular, CheckmarkCircle16Regular, Delete16Regular, Code20Regular, Play16Regular, ArrowSortDownLines16Regular, ArrowSortUpLines16Regular } from '@fluentui/react-icons'
import { Avatar } from '@/components/Avatar'
import { ME, PEOPLE } from '@/data/people'
import { fmtSmart } from '@/data/time'
import type { XComment } from './types'

export function SidePane({ title, children, onClose, agent, width = 300 }: { title: string; children: ReactNode; onClose: () => void; agent?: string; width?: number }) {
  return (
    <div className="shrink-0 bg-white border-l border-[#E1E1E1] flex flex-col" style={{ width }} data-agent={agent}>
      <div className="h-11 flex items-center px-4 border-b border-[#EDEBE9] shrink-0">
        <span className="text-[15px] font-semibold flex-1">{title}</span>
        <button aria-label="Close pane" onClick={onClose} className="w-7 h-7 rounded hover:bg-[#F0F0F0] flex items-center justify-center">
          <Dismiss20Regular />
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-auto">{children}</div>
    </div>
  )
}

const nameOf = (id: string) => PEOPLE.find((p) => p.id === id)?.name ?? id

export function CommentsPane({
  comments,
  activeRef,
  draftFor,
  onAdd,
  onReply,
  onResolve,
  onDelete,
  onGo,
  onClose,
}: {
  comments: XComment[]
  activeRef: string
  draftFor: string | null
  onAdd: (ref: string, text: string) => void
  onReply: (id: string, text: string) => void
  onResolve: (id: string) => void
  onDelete: (id: string) => void
  onGo: (ref: string) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState('')
  const [reply, setReply] = useState<Record<string, string>>({})
  const [showResolved, setShowResolved] = useState(false)
  const list = comments.filter((c) => showResolved || !c.resolved)
  return (
    <SidePane title="Comments" onClose={onClose} agent="excel-comments-pane">
      <div className="p-3 space-y-3">
        {draftFor && (
          <div className="rounded-md border-2 border-[#107C41] p-2.5">
            <div className="flex items-center gap-2 mb-2">
              <Avatar id={ME.id} size={24} />
              <span className="text-[12.5px] font-semibold">{ME.name}</span>
              <span className="ml-auto text-[11.5px] text-[#616161]">{draftFor}</span>
            </div>
            <textarea
              autoFocus
              data-agent="excel-comment-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Start a conversation. Use @mention to notify someone."
              className="w-full h-[64px] resize-none outline-none text-[13px]"
            />
            <div className="flex justify-end gap-2">
              <button
                data-agent="excel-comment-post"
                disabled={!draft.trim()}
                onClick={() => {
                  onAdd(draftFor, draft.trim())
                  setDraft('')
                }}
                className="h-7 px-3 rounded bg-[#107C41] text-white text-[12.5px] font-semibold disabled:opacity-40"
              >
                Post
              </button>
            </div>
          </div>
        )}
        {list.map((c) => (
          <div key={c.id} className={`rounded-md border p-2.5 ${c.ref === activeRef ? 'border-[#107C41] bg-[#F4FBF7]' : 'border-[#E1E1E1]'} ${c.resolved ? 'opacity-60' : ''}`} onClick={() => onGo(c.ref)}>
            <div className="flex items-center gap-2">
              <Avatar id={c.author} size={24} />
              <div className="min-w-0">
                <div className="text-[12.5px] font-semibold truncate">{nameOf(c.author)}</div>
                <div className="text-[11px] text-[#616161]">
                  {c.ref} · {fmtSmart(c.at)}
                </div>
              </div>
              <div className="ml-auto flex items-center gap-0.5">
                <button title={c.resolved ? 'Reopen' : 'Resolve thread'} aria-label="Resolve thread" onClick={(e) => (e.stopPropagation(), onResolve(c.id))} className="w-6 h-6 rounded hover:bg-[#F0F0F0] flex items-center justify-center text-[#424242]">
                  <CheckmarkCircle16Regular />
                </button>
                <button title="Delete thread" aria-label="Delete thread" onClick={(e) => (e.stopPropagation(), onDelete(c.id))} className="w-6 h-6 rounded hover:bg-[#F0F0F0] flex items-center justify-center text-[#424242]">
                  <Delete16Regular />
                </button>
              </div>
            </div>
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
                className="mt-2 w-full h-7 px-2 rounded border border-[#E1E1E1] text-[12.5px] outline-none focus:border-[#107C41]"
              />
            )}
          </div>
        ))}
        {!list.length && !draftFor && <div className="text-center text-[12.5px] text-[#616161] py-8">No comments yet. Select a cell and choose New Comment.</div>}
        {comments.some((c) => c.resolved) && (
          <button onClick={() => setShowResolved((s) => !s)} className="text-[12px] text-[#107C41] hover:underline">
            {showResolved ? 'Hide resolved' : 'Show resolved'}
          </button>
        )}
      </div>
    </SidePane>
  )
}

export interface CopilotSuggestion {
  label: string
  run: () => string
}

export function CopilotPane({ summary, suggestions, onClose, agent = 'excel-copilot-pane', title = 'About this sheet', placeholder = 'Ask about this data' }: { summary: string[]; suggestions: CopilotSuggestion[]; onClose: () => void; agent?: string; title?: string; placeholder?: string }) {
  const [log, setLog] = useState<{ q: string; a: string }[]>([])
  const [q, setQ] = useState('')
  const ask = (text: string) => {
    const s = suggestions.find((x) => text.toLowerCase().includes(x.label.toLowerCase().split(' ')[0].toLowerCase()))
    const a = s ? s.run() : `Here’s what I can see in this sheet: ${summary.join(' ')}`
    setLog((l) => [...l, { q: text, a }])
  }
  return (
    <SidePane title="Copilot" onClose={onClose} agent={agent} width={320}>
      <div className="p-3 space-y-3 text-[13px]">
        <div className="rounded-lg p-3 bg-gradient-to-br from-[#EEF6FF] to-[#F5EEFF]">
          <div className="flex items-center gap-1.5 font-semibold mb-1">
            <Sparkle20Regular className="w-4 h-4 text-[#744EC2]" /> {title}
          </div>
          <ul className="list-disc pl-4 space-y-0.5 text-[12.5px]">
            {summary.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
        {log.map((m, i) => (
          <div key={i} className="space-y-1.5">
            <div className="ml-8 rounded-lg bg-[#E6F2EA] px-3 py-2 text-[12.5px]">{m.q}</div>
            <div className="mr-4 rounded-lg border border-[#E1E1E1] px-3 py-2 text-[12.5px]">{m.a}</div>
          </div>
        ))}
        <div className="text-[12px] font-semibold text-[#616161]">Suggestions</div>
        <div className="flex flex-col gap-1.5">
          {suggestions.map((s) => (
            <button key={s.label} onClick={() => setLog((l) => [...l, { q: s.label, a: s.run() }])} className="text-left rounded-md border border-[#D1D1D1] px-3 py-2 text-[12.5px] hover:bg-[#F5F5F5]">
              {s.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 h-9 rounded-md border border-[#C7C7C7] px-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && q.trim()) {
                ask(q.trim())
                setQ('')
              }
            }}
            placeholder={placeholder}
            className="flex-1 outline-none text-[12.5px]"
          />
        </div>
        <div className="text-[11px] text-[#8A8886]">AI-generated content may be incorrect.</div>
      </div>
    </SidePane>
  )
}

export interface Script {
  name: string
  desc: string
  run: () => string
}

export function ScriptsPane({ scripts, onClose }: { scripts: Script[]; onClose: () => void }) {
  const [out, setOut] = useState<Record<string, string>>({})
  return (
    <SidePane title="Code Editor" onClose={onClose} agent="excel-scripts-pane" width={320}>
      <div className="p-3 space-y-2">
        <div className="text-[12px] text-[#616161]">Office Scripts automate repetitive tasks in this workbook.</div>
        {scripts.map((s) => (
          <div key={s.name} className="rounded-md border border-[#E1E1E1] p-2.5">
            <div className="flex items-center gap-2">
              <Code20Regular className="w-4 h-4 text-[#107C41]" />
              <span className="text-[13px] font-semibold flex-1">{s.name}</span>
              <button aria-label={`Run ${s.name}`} onClick={() => setOut({ ...out, [s.name]: s.run() })} className="h-7 px-2 rounded bg-[#107C41] text-white text-[12px] font-semibold flex items-center gap-1">
                <Play16Regular /> Run
              </button>
            </div>
            <div className="text-[12px] text-[#616161] mt-1">{s.desc}</div>
            {out[s.name] && <div className="mt-2 text-[12px] bg-[#F5F5F5] rounded px-2 py-1 font-mono">{out[s.name]}</div>}
          </div>
        ))}
      </div>
    </SidePane>
  )
}

/** AutoFilter dropdown for one column */
export function FilterMenu({
  values,
  hidden,
  onApply,
  onSort,
  onClose,
}: {
  values: string[]
  hidden: string[]
  onApply: (hidden: string[]) => void
  onSort: (desc: boolean) => void
  onClose: () => void
}) {
  const [h, setH] = useState<string[]>(hidden)
  const [q, setQ] = useState('')
  const shown = values.filter((v) => v.toLowerCase().includes(q.toLowerCase()))
  const all = h.length === 0
  return (
    <div className="w-[230px] p-2 text-[12.5px]" data-agent="excel-filter-menu">
      <button onClick={() => (onSort(false), onClose())} className="w-full flex items-center gap-2 h-7 px-1.5 rounded hover:bg-[#F0F0F0]">
        <ArrowSortDownLines16Regular /> Sort A to Z
      </button>
      <button onClick={() => (onSort(true), onClose())} className="w-full flex items-center gap-2 h-7 px-1.5 rounded hover:bg-[#F0F0F0]">
        <ArrowSortUpLines16Regular /> Sort Z to A
      </button>
      <div className="h-px bg-[#E1E1E1] my-1" />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="w-full h-7 px-2 rounded border border-[#C7C7C7] outline-none mb-1" />
      <div className="max-h-[180px] overflow-auto border border-[#E1E1E1] rounded p-1">
        <label className="flex items-center gap-2 h-6">
          <input type="checkbox" checked={all} onChange={() => setH(all ? [...values] : [])} /> (Select All)
        </label>
        {shown.map((v) => (
          <label key={v} className="flex items-center gap-2 h-6">
            <input type="checkbox" checked={!h.includes(v)} onChange={() => setH(h.includes(v) ? h.filter((x) => x !== v) : [...h, v])} /> <span className="truncate">{v || '(Blanks)'}</span>
          </label>
        ))}
      </div>
      <div className="flex justify-end gap-2 mt-2">
        <button onClick={() => (onApply(h), onClose())} className="h-7 px-3 rounded bg-[#107C41] text-white font-semibold">
          OK
        </button>
        <button onClick={onClose} className="h-7 px-3 rounded border border-[#C7C7C7]">
          Cancel
        </button>
      </div>
    </div>
  )
}
