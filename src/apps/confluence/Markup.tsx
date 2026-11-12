import type { ReactNode } from 'react'
import { Info, AlertTriangle, CheckCircle2, StickyNote, Image as ImageIcon } from 'lucide-react'
import { logoUrl } from '@/os/registry'
import { Lozenge } from '../jira/atlassian'

/* ─────────────────────────── markup renderer ─────────────────────────── */

function inline(text: string, onLink: (id: string) => void, onIssue?: (key: string) => void): ReactNode[] {
  const out: ReactNode[] = []
  const re = /(\*\*[^*]+\*\*|\{status:[^}]+\}|!\[[^\]]*\]\([^)]*\)|\[[^\]]+\]\([^)]+\)|`[^`]+`|\bOPS-\d+\b|@\[[^\]]+\]|\+\+[^+]+\+\+|(?<![\w*])_[^_\n]+_(?!\w)|#[a-z][a-z0-9-]+)/g
  let last = 0
  let m: RegExpExecArray | null
  let k = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const t = m[0]
    if (t.startsWith('**')) out.push(<strong key={k++}>{t.slice(2, -2)}</strong>)
    else if (t.startsWith('{status:')) {
      const [, label, color] = t.slice(1, -1).split(':')
      out.push(<Lozenge key={k++} bold tone={(color as any) || 'grey'}>{label}</Lozenge>)
    } else if (t.startsWith('![')) {
      const mm = /!\[([^\]]*)\]\(([^)]*)\)/.exec(t)!
      out.push(
        <span key={k++} className="inline-flex items-center gap-2 my-1 px-3 py-6 w-full max-w-[520px] justify-center rounded-[4px] border border-dashed border-[#B7B9BE] bg-[#F8F8F8] text-[13px] text-[#505258] align-middle">
          <ImageIcon size={18} /> {mm[1] || 'image'}
        </span>,
      )
    } else if (t.startsWith('[')) {
      const mm = /\[([^\]]+)\]\(([^)]+)\)/.exec(t)!
      out.push(<button key={k++} onClick={() => onLink(mm[2])} className="text-[#1868DB] hover:underline">{mm[1]}</button>)
    } else if (t.startsWith('`')) out.push(<code key={k++} className="px-1 rounded bg-[#0515240F] text-[13px] font-mono">{t.slice(1, -1)}</code>)
    else if (t.startsWith('@[')) out.push(<span key={k++} className="px-1 rounded-full bg-[#0515240F] text-[#1868DB] text-[14px]">@{t.slice(2, -1)}</span>)
    else if (t.startsWith('++')) out.push(<u key={k++}>{t.slice(2, -2)}</u>)
    else if (t.startsWith('_')) out.push(<em key={k++}>{t.slice(1, -1)}</em>)
    else if (t.startsWith('OPS-'))
      out.push(
        <button key={k++} onClick={() => onIssue?.(t)} className="inline-flex items-center gap-1 h-5 px-1 rounded-[3px] bg-[#0515240F] text-[#1868DB] text-[13px] align-[1px] hover:underline">
          <img src={logoUrl('jira')} className="w-3 h-3" alt="" />{t}
        </button>,
      )
    else out.push(<span key={k++} className="text-[#1868DB]">{t}</span>)
    last = m.index + t.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

export function Markup({ body, onLink, onIssue }: { body: string; onLink: (id: string) => void; onIssue?: (key: string) => void }) {
  const lines = body.split('\n')
  const out: ReactNode[] = []
  let i = 0
  let key = 0
  const il = (t: string) => inline(t, onLink, onIssue)
  const panel: Record<string, [string, string, any]> = { info: ['#E9F2FE', '#1868DB', Info], note: ['#F3F0FF', '#8270DB', StickyNote], warning: ['#FFF7D6', '#B38600', AlertTriangle], success: ['#DCFFF1', '#1F845A', CheckCircle2], error: ['#FFECEB', '#C9372C', AlertTriangle] }
  while (i < lines.length) {
    const l = lines[i]
    if (l.startsWith(':::')) {
      const kind = l.slice(3).trim() || 'info'
      const buf: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith(':::')) buf.push(lines[i++])
      i++
      const [bg, fg, I] = panel[kind] ?? panel.info
      out.push(
        <div key={key++} className="flex gap-3 rounded-[4px] px-4 py-3 my-3" style={{ background: bg }}>
          <I size={18} style={{ color: fg }} className="shrink-0 mt-0.5" />
          <div className="text-[16px] leading-[26px]">{buf.map((b, n) => <div key={n}>{il(b)}</div>)}</div>
        </div>,
      )
      continue
    }
    if (l.startsWith('```')) {
      const buf: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) buf.push(lines[i++])
      i++
      out.push(<pre key={key++} className="my-3 px-4 py-3 rounded-[4px] bg-[#F8F8F8] border border-[#DCDFE4] text-[13px] font-mono overflow-x-auto">{buf.join('\n')}</pre>)
      continue
    }
    if (l.startsWith('|')) {
      const rows: string[][] = []
      while (i < lines.length && lines[i].startsWith('|')) {
        const cells = lines[i].split('|').slice(1, -1).map((c) => c.trim())
        if (!cells.every((c) => /^-+$/.test(c))) rows.push(cells)
        i++
      }
      out.push(
        <div key={key++} className="my-4 overflow-x-auto">
          <table className="border-collapse text-[14px] min-w-[60%]">
            <thead><tr>{rows[0]?.map((c, n) => <th key={n} className="border border-[#DCDFE4] bg-[#F8F8F8] px-3 py-2 text-left font-semibold">{il(c)}</th>)}</tr></thead>
            <tbody>{rows.slice(1).map((r, n) => <tr key={n}>{r.map((c, m) => <td key={m} className="border border-[#DCDFE4] px-3 py-2 align-top">{il(c)}</td>)}</tr>)}</tbody>
          </table>
        </div>,
      )
      continue
    }
    if (/^- \[[ x]\] /.test(l)) {
      const items: [boolean, string][] = []
      while (i < lines.length && /^- \[[ x]\] /.test(lines[i])) {
        items.push([lines[i][3] === 'x', lines[i].slice(6)])
        i++
      }
      out.push(<ul key={key++} className="my-2 space-y-1">{items.map(([done, t], n) => <li key={n} className="flex items-start gap-2 text-[16px] leading-[26px]"><input type="checkbox" checked={done} readOnly className="mt-[7px] w-4 h-4 accent-[#1868DB]" /><span className={done ? 'line-through text-[#6B6E76]' : ''}>{il(t)}</span></li>)}</ul>)
      continue
    }
    if (/^- /.test(l) || /^\d+\. /.test(l)) {
      const ordered = /^\d+\. /.test(l)
      const items: string[] = []
      while (i < lines.length && (ordered ? /^\d+\. /.test(lines[i]) : /^- /.test(lines[i]) && !/^- \[[ x]\] /.test(lines[i]))) items.push(lines[i++].replace(/^(- |\d+\. )/, ''))
      const Tag = ordered ? 'ol' : 'ul'
      out.push(<Tag key={key++} className={`${ordered ? 'list-decimal' : 'list-disc'} pl-7 my-2 text-[16px] leading-[28px]`}>{items.map((it, n) => <li key={n}>{il(it)}</li>)}</Tag>)
      continue
    }
    if (/^-{3,}$/.test(l.trim())) out.push(<hr key={key++} className="my-6 border-[#DCDFE4]" />)
    else if (l.startsWith('> ')) out.push(<blockquote key={key++} className="border-l-[3px] border-[#DCDFE4] pl-4 my-3 text-[16px] leading-[28px] text-[#505258]">{il(l.slice(2))}</blockquote>)
    else if (l.startsWith('### ')) out.push(<h3 key={key++} className="text-[18px] font-semibold mt-6 mb-1">{il(l.slice(4))}</h3>)
    else if (l.startsWith('## ')) out.push(<h2 key={key++} className="text-[22px] font-semibold mt-8 mb-2 tracking-[-0.2px]">{il(l.slice(3))}</h2>)
    else if (l.startsWith('# ')) out.push(<h1 key={key++} className="text-[28px] font-semibold mt-8 mb-2">{il(l.slice(2))}</h1>)
    else if (l.trim()) out.push(<p key={key++} className="text-[16px] leading-[28px] my-2">{il(l)}</p>)
    i++
  }
  return <>{out}</>
}

/** Templates offered by "Browse templates" and the Templates page */
export const TEMPLATES: { id: string; name: string; desc: string; color: string; parent?: string; title: string; body: string }[] = [
  { id: 'release-notes', name: 'Release notes', desc: 'Share product updates with your team', color: '#1868DB', parent: 'pg-releases', title: 'Release notes — ', body: '{status:DRAFT:grey}  Sprint · dates\n\n:::info\nSprint goal: \n:::\n## Highlights\n- \n\n## What shipped\n| Key | Summary | Type | Assignee | Points |\n| --- | --- | --- | --- | --- |\n|  |  |  |  |  |\n\n## Known issues\n- ' },
  { id: 'meeting-notes', name: 'Meeting notes', desc: 'Agenda, notes and action items', color: '#6A9A23', title: `Meeting notes — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`, body: '## Date\n' + new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) + '\n\n## Participants\n- @[Alex Morgan]\n\n## Goals\n- \n\n## Discussion topics\n| Time | Item | Presenter | Notes |\n| --- | --- | --- | --- |\n|  |  |  |  |\n\n## Action items\n- [ ] \n\n## Decisions\n- ' },
  { id: 'retro', name: 'Retrospective', desc: 'Reflect on what went well', color: '#AF59E1', title: 'Sprint retrospective', body: ':::info\nUse this page to reflect on the last sprint as a team.\n:::\n## What went well\n- \n\n## What could be improved\n- \n\n## Action items\n- [ ] ' },
  { id: 'how-to', name: 'How-to article', desc: 'Step-by-step instructions', color: '#E06C00', title: 'How to ', body: 'Use this page to explain how to complete a task.\n\n## Instructions\n1. \n2. \n3. \n\n:::note\nTip: add screenshots for each step.\n:::\n## Related articles\n- ' },
  { id: 'postmortem', name: 'Incident postmortem', desc: 'Learn from incidents', color: '#C9372C', title: 'Postmortem — ', body: '| Incident | Date | Severity | Owner |\n| --- | --- | --- | --- |\n|  |  | {status:P1:red} | @[Alex Morgan] |\n\n## Summary\n\n## Timeline\n| Time | Event |\n| --- | --- |\n|  |  |\n\n## Root cause\n\n## Corrective actions\n- [ ] ' },
  { id: 'project-plan', name: 'Project plan', desc: 'Goals, scope and milestones', color: '#FCA700', title: 'Project plan — ', body: '| Driver | Approver | Status | Target date |\n| --- | --- | --- | --- |\n| @[Alex Morgan] |  | {status:PLANNING:grey} |  |\n\n## Goals\n- \n\n## Scope\n| Must have | Nice to have | Not in scope |\n| --- | --- | --- |\n|  |  |  |\n\n## Milestones\n| Milestone | Date | Owner |\n| --- | --- | --- |\n|  |  |  |' },
]
