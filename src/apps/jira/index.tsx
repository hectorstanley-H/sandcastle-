import { useEffect, useMemo, useState } from 'react'
import {
  Clock, Star, LayoutGrid, Map as MapIcon, ListTodo, Columns3, CalendarDays, List, FileText, BarChart2, Code2, Filter, LayoutDashboard, Users, ChevronDown, ChevronRight,
  MoreHorizontal, Search, X, Paperclip, Link2, Eye, Share2, ThumbsUp, Zap, GitBranch, Plus, Box, Rocket, UserPlus,
} from 'lucide-react'
import type { AppProps } from '@/os/registry'
import { useDesk, useWin } from '@/os/context'
import { db, useCollection } from '@/db/db'
import { ME, person, PEOPLE } from '@/data/people'
import { Avatar } from '@/components/Avatar'
import { ATL_FONT, TopNav, SideItem, Lozenge, HWBadge } from './atlassian'

export type Issue = {
  id: string; key: string; type: string; summary: string; description: string; status: string; priority: string; assignee: string; reporter: string
  labels: string[]; sprintId: string | null; points?: number; epic?: string; created: string; updated: string; comments: { id: string; author: string; body: string; date: string }[]; createdBy?: string
}
type Sprint = { id: string; name: string; state: string; start: string; end: string; goal: string }

const COLS = ['To Do', 'In Progress', 'In Review', 'Done']
const STATUS_TONE: Record<string, any> = { 'To Do': 'grey', 'In Progress': 'blue', 'In Review': 'blue', Done: 'green' }

export function TypeIcon({ type, size = 16 }: { type: string; size?: number }) {
  const c = type === 'Bug' ? '#E2483D' : type === 'Story' ? '#63BA3C' : type === 'Epic' ? '#904EE2' : '#4BADE8'
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" className="shrink-0" aria-label={type}>
      <rect width="16" height="16" rx="3" fill={c} />
      {type === 'Bug' && <circle cx="8" cy="8" r="3.4" fill="#fff" />}
      {type === 'Story' && <path d="M5 3.5h6v9l-3-2.2-3 2.2z" fill="#fff" />}
      {type === 'Task' && <path d="M4.5 8.3l2.3 2.2 4.7-5" stroke="#fff" strokeWidth="1.9" fill="none" strokeLinecap="round" strokeLinejoin="round" />}
      {type === 'Epic' && <path d="M9 3L5 9h3l-1 4 4-6H8z" fill="#fff" />}
    </svg>
  )
}
export function PriorityIcon({ p, size = 16 }: { p: string; size?: number }) {
  const map: Record<string, [string, string]> = {
    Highest: ['#C9372C', 'M3 9l5-4 5 4M3 13l5-4 5 4'],
    High: ['#E2483D', 'M3 11l5-5 5 5'],
    Medium: ['#E2B203', 'M3 6h10M3 10h10'],
    Low: ['#1868DB', 'M3 6l5 5 5-5'],
    Lowest: ['#1868DB', 'M3 3l5 4 5-4M3 7l5 4 5-4'],
  }
  const [c, d] = map[p] ?? map.Medium
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-label={`${p} priority`} className="shrink-0">
      <path d={d} stroke={c} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function UserAv({ id, size = 24 }: { id: string; size?: number }) {
  if (!id) return <span className="rounded-full bg-[#DDDEE1] flex items-center justify-center text-[#505258]" style={{ width: size, height: size }}><Users size={size * 0.55} /></span>
  return <Avatar id={id} size={size} />
}
const daysLeft = (iso: string) => Math.max(0, Math.ceil((+new Date(iso) - Date.now()) / 86400000))
const fmtD = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

/* ─────────────────────────── Board ─────────────────────────── */

function Card({ i, onOpen }: { i: Issue; onOpen: () => void }) {
  const fresh = i.createdBy === 'hworker' && Date.now() - +new Date(i.created) < 90000
  return (
    <button data-agent={`jira-card-${i.key}`} aria-label={`${i.key} ${i.summary}`} onClick={onOpen} className={`w-full text-left bg-white rounded-[8px] p-3 shadow-[0_1px_1px_#1E1F2140,0_0_1px_#1E1F214F] hover:bg-[#F8F8F8] ${fresh ? 'flash-new' : ''}`}>
      <div className="text-[14px] text-[#292A2E] leading-[20px]">{i.summary}</div>
      {(i.epic || i.labels.length > 0 || i.createdBy === 'hworker') && (
        <div className="flex flex-wrap gap-1 mt-2">
          {i.epic && <Lozenge tone="purple">{i.epic}</Lozenge>}
          {i.createdBy === 'hworker' && <HWBadge />}
        </div>
      )}
      <div className="flex items-center gap-1.5 mt-2.5">
        <TypeIcon type={i.type} />
        <span className={`text-[12px] font-medium text-[#505258] ${i.status === 'Done' ? 'line-through' : ''}`}>{i.key}</span>
        <div className="flex-1" />
        {i.points !== undefined && <span className="h-5 min-w-5 px-1.5 rounded-full bg-[#DDDEE1] text-[12px] text-[#292A2E] flex items-center justify-center">{i.points}</span>}
        <PriorityIcon p={i.priority} />
        <UserAv id={i.assignee} size={24} />
      </div>
    </button>
  )
}

function Board({ sprint, issues, onOpen }: { sprint?: Sprint; issues: Issue[]; onOpen: (k: string) => void }) {
  const [q, setQ] = useState('')
  const items = issues.filter((i) => i.sprintId === sprint?.id && i.type !== 'Epic' && (!q || i.summary.toLowerCase().includes(q.toLowerCase())))
  const assignees = Array.from(new Set(items.map((i) => i.assignee).filter(Boolean)))
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex items-center gap-2 px-6 py-3">
        <div className="relative">
          <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#505258]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search board" className="h-8 w-[180px] pl-7 pr-2 rounded-[4px] border border-[#8C8F97] text-[14px] outline-none focus:border-[#1868DB]" />
        </div>
        <div className="flex -space-x-1 ml-1">{assignees.map((a) => <span key={a} className="ring-2 ring-white rounded-full"><Avatar id={a} size={28} /></span>)}</div>
        {['Epic', 'Type', 'Label'].map((l) => <button key={l} className="h-8 px-2.5 rounded-[4px] text-[14px] text-[#505258] hover:bg-[#0515240F] flex items-center gap-1 font-medium">{l} <ChevronDown size={14} /></button>)}
        <div className="flex-1" />
        {sprint && <span className="text-[13px] text-[#505258] flex items-center gap-1"><Clock size={14} /> {daysLeft(sprint.end)} days remaining</span>}
        <button data-agent="jira-complete-sprint" className="h-8 px-3 rounded-[4px] bg-[#0515240F] hover:bg-[#0B120E24] text-[14px] font-medium text-[#292A2E]">Complete sprint</button>
        <button className="h-8 px-3 rounded-[4px] text-[14px] text-[#292A2E] hover:bg-[#0515240F] font-medium flex items-center gap-1">Group: None <ChevronDown size={14} /></button>
        <button className="w-8 h-8 rounded-[4px] hover:bg-[#0515240F] flex items-center justify-center"><MoreHorizontal size={16} /></button>
      </div>
      <div className="flex-1 min-h-0 overflow-auto px-6 pb-4">
        <div className="flex gap-2 min-h-full items-start">
          {COLS.map((c) => {
            const col = items.filter((i) => i.status === c)
            return (
              <div key={c} className="w-[272px] shrink-0 bg-[#F8F8F8] rounded-[8px] p-2 min-h-[400px]" data-agent={`jira-col-${c.toLowerCase().replace(/\s/g, '-')}`}>
                <div className="h-8 px-1.5 flex items-center gap-2 text-[12px] font-semibold text-[#505258] uppercase">
                  {c} <span className="font-normal">{col.length}</span>
                  {c === 'Done' && <span className="text-[#6A9A23]">✓</span>}
                </div>
                <div className="space-y-1.5">{col.map((i) => <Card key={i.id} i={i} onOpen={() => onOpen(i.key)} />)}</div>
                {c === 'To Do' && <button className="w-full h-8 mt-1 rounded-[4px] text-[14px] text-[#505258] hover:bg-[#0515240F] flex items-center gap-1.5 px-2 font-medium"><Plus size={15} /> Create</button>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────── Backlog ─────────────────────────── */

function Backlog({ sprints, issues, onOpen }: { sprints: Sprint[]; issues: Issue[]; onOpen: (k: string) => void }) {
  const groups: [string, Sprint | null][] = [...sprints.filter((s) => s.state !== 'closed').map((s) => [s.id, s] as [string, Sprint]), ['backlog', null]]
  return (
    <div className="flex-1 min-h-0 overflow-auto px-6 py-3 space-y-4">
      {groups.map(([id, s]) => {
        const rows = issues.filter((i) => i.type !== 'Epic' && (s ? i.sprintId === s.id : !i.sprintId))
        return (
          <div key={id} className="rounded-[8px] bg-[#F8F8F8] p-2">
            <div className="flex items-center gap-2 h-9 px-2">
              <ChevronDown size={16} />
              <span className="text-[14px] font-semibold">{s ? s.name : 'Backlog'}</span>
              {s && <span className="text-[13px] text-[#505258]">{fmtD(s.start)} – {fmtD(s.end)}</span>}
              <span className="text-[13px] text-[#505258]">({rows.length} work items)</span>
              <div className="flex-1" />
              <span className="flex gap-1">
                {(['To Do', 'In Progress', 'Done'] as const).map((st) => <span key={st} className={`h-5 min-w-6 px-1.5 rounded-full text-[12px] flex items-center justify-center ${st === 'Done' ? 'bg-[#BAF3DB] text-[#216E4E]' : st === 'In Progress' ? 'bg-[#CFE1FD] text-[#1558BC]' : 'bg-[#DDDEE1]'}`}>{rows.filter((r) => (st === 'In Progress' ? ['In Progress', 'In Review'].includes(r.status) : r.status === st)).reduce((a, r) => a + (r.points ?? 0), 0)}</span>)}
              </span>
              <button className="h-8 px-3 rounded-[4px] bg-[#0515240F] text-[14px] font-medium">{s?.state === 'active' ? 'Complete sprint' : s ? 'Start sprint' : 'Create sprint'}</button>
            </div>
            <div className="bg-white rounded-[4px] border border-[#0B120E24]">
              {rows.map((i) => (
                <button key={i.id} data-agent={`jira-row-${i.key}`} onClick={() => onOpen(i.key)} className="w-full h-10 flex items-center gap-2.5 px-3 border-b last:border-b-0 border-[#0B120E14] hover:bg-[#F8F8F8] text-left text-[14px]">
                  <TypeIcon type={i.type} />
                  <span className="text-[#505258] text-[13px] w-[64px]">{i.key}</span>
                  <span className="flex-1 truncate">{i.summary}</span>
                  {i.epic && <Lozenge tone="purple">{i.epic}</Lozenge>}
                  <Lozenge tone={STATUS_TONE[i.status]}>{i.status}</Lozenge>
                  <span className="h-5 min-w-5 px-1.5 rounded-full bg-[#DDDEE1] text-[12px] flex items-center justify-center">{i.points ?? '-'}</span>
                  <PriorityIcon p={i.priority} />
                  <UserAv id={i.assignee} size={24} />
                </button>
              ))}
              <div className="h-9 px-3 flex items-center gap-1.5 text-[14px] text-[#505258]"><Plus size={15} /> Create</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ─────────────────────────── List view ─────────────────────────── */

function ListView({ issues, onOpen, sprints }: { issues: Issue[]; onOpen: (k: string) => void; sprints: Sprint[] }) {
  const rows = [...issues].sort((a, b) => +new Date(b.created) - +new Date(a.created))
  return (
    <div className="flex-1 min-h-0 overflow-auto px-6 py-3">
      <table className="w-full text-[14px] border border-[#0B120E24]">
        <thead><tr className="h-9 bg-[#F8F8F8] text-left text-[12px] text-[#505258] font-semibold">{['Type', 'Key', 'Summary', 'Status', 'Assignee', 'Priority', 'Labels', 'Sprint', 'Created'].map((h) => <th key={h} className="px-2 font-semibold">{h}</th>)}</tr></thead>
        <tbody>
          {rows.map((i) => (
            <tr key={i.id} onClick={() => onOpen(i.key)} className="h-10 border-t border-[#0B120E14] hover:bg-[#F8F8F8] cursor-pointer">
              <td className="px-2"><TypeIcon type={i.type} /></td>
              <td className="px-2 text-[#1868DB]">{i.key}</td>
              <td className="px-2 max-w-[380px] truncate">{i.summary} {i.createdBy === 'hworker' && <HWBadge />}</td>
              <td className="px-2"><Lozenge tone={STATUS_TONE[i.status]}>{i.status}</Lozenge></td>
              <td className="px-2"><span className="flex items-center gap-2"><UserAv id={i.assignee} size={22} />{i.assignee ? person(i.assignee).name : 'Unassigned'}</span></td>
              <td className="px-2"><span className="flex items-center gap-1"><PriorityIcon p={i.priority} />{i.priority}</span></td>
              <td className="px-2">{i.labels.map((l) => <span key={l} className="mr-1 px-1 rounded-[3px] bg-[#0515240F] text-[12px]">{l}</span>)}</td>
              <td className="px-2 text-[13px]">{sprints.find((s) => s.id === i.sprintId)?.name ?? ''}</td>
              <td className="px-2 text-[13px] text-[#505258]">{fmtD(i.created)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ─────────────────────────── Issue detail ─────────────────────────── */

function IssueModal({ issueKey, onClose }: { issueKey: string; onClose: () => void }) {
  const issues = useCollection<Issue>('jira.issues')
  const sprints = useCollection<Sprint>('jira.sprints')
  const i = issues.find((x) => x.key === issueKey)
  const [statusOpen, setStatusOpen] = useState(false)
  const [comment, setComment] = useState('')
  if (!i) return null
  const upd = (p: Partial<Issue>) => db.update('jira.issues', i.id, { ...p, updated: new Date().toISOString() })
  const Row = ({ k, children }: { k: string; children: React.ReactNode }) => (
    <div className="flex items-start min-h-[36px] py-1.5 text-[14px]"><div className="w-[140px] shrink-0 text-[#505258] font-medium pt-0.5">{k}</div><div className="flex-1 min-w-0">{children}</div></div>
  )
  return (
    <div className="absolute inset-0 z-40 bg-[#050C1F]/50 flex items-start justify-center pt-10" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-[1080px] max-w-[94%] max-h-[88%] bg-white rounded-[12px] shadow-[0_8px_12px_#1E1F2126,0_0_1px_#1E1F214F] flex flex-col" data-agent="jira-issue-modal">
        <div className="h-[52px] shrink-0 flex items-center px-5 gap-2 text-[14px] text-[#505258]">
          {i.epic && <><span className="flex items-center gap-1.5"><TypeIcon type="Epic" size={14} />{i.epic}</span><span>/</span></>}
          <span className="flex items-center gap-1.5"><TypeIcon type={i.type} size={14} /><span className="text-[#292A2E]" data-agent="jira-issue-key">{i.key}</span></span>
          {i.createdBy === 'hworker' && <HWBadge />}
          <div className="flex-1" />
          {[Eye, ThumbsUp, Share2, MoreHorizontal].map((I, n) => <button key={n} className="w-8 h-8 rounded-[4px] hover:bg-[#0515240F] flex items-center justify-center"><I size={16} /></button>)}
          <button data-agent="jira-issue-close" aria-label="Close" onClick={onClose} className="w-8 h-8 rounded-[4px] hover:bg-[#0515240F] flex items-center justify-center"><X size={18} /></button>
        </div>
        <div className="flex-1 min-h-0 flex overflow-hidden">
          <div className="flex-1 min-w-0 overflow-auto px-8 pb-8">
            <h1 className="text-[24px] font-semibold text-[#292A2E] leading-tight" data-agent="jira-issue-summary">{i.summary}</h1>
            <div className="flex gap-1 mt-3">
              {[[Paperclip, 'Attach'], [GitBranch, 'Add child work item'], [Link2, 'Link work item']].map(([I, l]: any) => <button key={l} className="h-8 px-2.5 rounded-[4px] bg-[#0515240F] hover:bg-[#0B120E24] text-[14px] flex items-center gap-1.5 font-medium"><I size={15} /> {l}</button>)}
            </div>
            <div className="mt-6 text-[16px] font-semibold">Description</div>
            <div className="mt-2 text-[14px] leading-[22px] whitespace-pre-wrap text-[#292A2E]">{i.description || <span className="text-[#6B6E76]">Add a description…</span>}</div>
            <div className="mt-8 text-[16px] font-semibold">Activity</div>
            <div className="flex gap-1 mt-2 text-[14px]">
              {['All', 'Comments', 'History', 'Work log'].map((t, n) => <button key={t} className={`h-7 px-2 rounded-[4px] ${n === 1 ? 'bg-[#E9F2FE] text-[#1868DB] font-medium' : 'hover:bg-[#0515240F]'}`}>{t}</button>)}
            </div>
            <div className="flex gap-3 mt-4">
              <Avatar id={ME.id} size={32} />
              <div className="flex-1">
                <textarea data-agent="jira-comment-input" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment…" rows={comment ? 3 : 1} className="w-full px-3 py-2 rounded-[4px] border border-[#8C8F97] text-[14px] outline-none focus:border-[#1868DB] resize-none" />
                {comment ? (
                  <div className="flex gap-2 mt-2">
                    <button data-agent="jira-comment-save" onClick={() => { upd({ comments: [...i.comments, { id: `jc-${Date.now()}`, author: ME.id, body: comment, date: new Date().toISOString() }] }); setComment('') }} className="h-8 px-3 rounded-[4px] bg-[#1868DB] text-white text-[14px] font-medium">Save</button>
                    <button onClick={() => setComment('')} className="h-8 px-3 rounded-[4px] hover:bg-[#0515240F] text-[14px]">Cancel</button>
                  </div>
                ) : (
                  <div className="text-[12px] text-[#6B6E76] mt-1.5"><b>Pro tip:</b> press <kbd className="px-1 rounded bg-[#0515240F]">M</kbd> to comment</div>
                )}
              </div>
            </div>
            {[...i.comments].reverse().map((c) => (
              <div key={c.id} className="flex gap-3 mt-5">
                <Avatar id={c.author} size={32} />
                <div>
                  <div className="text-[14px]"><b className="font-semibold">{person(c.author).name}</b> <span className="text-[#505258] text-[13px] ml-1">{new Date(c.date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span></div>
                  <div className="text-[14px] mt-1 whitespace-pre-wrap">{c.body}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="w-[380px] shrink-0 overflow-auto pr-6 pb-8">
            <div className="flex items-center gap-2 relative">
              <button data-agent="jira-issue-status" onClick={() => setStatusOpen((o) => !o)} className={`h-8 px-3 rounded-[4px] text-[14px] font-medium flex items-center gap-1.5 ${i.status === 'Done' ? 'bg-[#BAF3DB] text-[#164B35]' : i.status === 'To Do' ? 'bg-[#0515240F] text-[#292A2E]' : 'bg-[#CFE1FD] text-[#09326C]'}`}>
                {i.status} <ChevronDown size={15} />
              </button>
              <button className="h-8 px-2.5 rounded-[4px] bg-[#0515240F] text-[14px] flex items-center gap-1.5"><Zap size={14} /> Improve work item</button>
              {statusOpen && (
                <div className="absolute top-9 left-0 z-10 w-[220px] bg-white rounded-[6px] shadow-[0_8px_12px_#1E1F2126,0_0_1px_#1E1F214F] py-1.5">
                  {COLS.map((s) => (
                    <button key={s} data-agent={`jira-status-${s.toLowerCase().replace(/\s/g, '-')}`} onClick={() => { upd({ status: s }); setStatusOpen(false) }} className="w-full text-left px-3 py-1.5 hover:bg-[#0515240F] flex items-center justify-between text-[14px]">
                      <Lozenge tone={STATUS_TONE[s]}>{s}</Lozenge>
                      {s === i.status && <span className="text-[#1868DB]">✓</span>}
                    </button>
                  ))}
                  <div className="border-t border-[#0B120E24] mt-1 pt-1 px-3 py-1.5 text-[14px] text-[#505258]">View workflow</div>
                </div>
              )}
            </div>
            <div className="mt-4 rounded-[6px] border border-[#0B120E24]">
              <div className="h-11 px-3 flex items-center justify-between border-b border-[#0B120E24] text-[14px] font-semibold">Details <ChevronDown size={15} /></div>
              <div className="px-3 py-2">
                <Row k="Assignee">
                  <select value={i.assignee} onChange={(e) => upd({ assignee: e.target.value })} className="w-full h-8 -ml-1 px-1 rounded-[4px] hover:bg-[#0515240F] outline-none bg-transparent">
                    <option value="">Unassigned</option>
                    {PEOPLE.filter((p) => !p.external).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </Row>
                <Row k="Reporter"><span className="flex items-center gap-2"><Avatar id={i.reporter} size={24} />{person(i.reporter).name}</span></Row>
                <Row k="Labels">{i.labels.length ? <span className="flex flex-wrap gap-1">{i.labels.map((l) => <span key={l} className="px-1.5 h-5 rounded-[3px] bg-[#0515240F] text-[12px] flex items-center">{l}</span>)}</span> : <span className="text-[#6B6E76]">None</span>}</Row>
                <Row k="Sprint"><span className="text-[#1868DB]">{sprints.find((s) => s.id === i.sprintId)?.name ?? 'None'}</span></Row>
                <Row k="Priority"><span className="flex items-center gap-1.5"><PriorityIcon p={i.priority} />{i.priority}</span></Row>
                <Row k="Story point estimate">{i.points ?? <span className="text-[#6B6E76]">None</span>}</Row>
                <Row k="Parent">{i.epic ? <span className="flex items-center gap-1.5"><TypeIcon type="Epic" size={14} />{i.epic}</span> : <span className="text-[#6B6E76]">None</span>}</Row>
                <Row k="Development"><span className="flex items-center gap-1.5 text-[#1868DB]"><GitBranch size={14} /> Create branch</span></Row>
              </div>
            </div>
            <div className="mt-3 text-[12px] text-[#6B6E76] leading-5">Created {new Date(i.created).toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}<br />Updated {new Date(i.updated).toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────── Create ─────────────────────────── */

function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: (key: string) => void }) {
  const { isAgent } = useDesk()
  const issues = useCollection<Issue>('jira.issues')
  const sprints = useCollection<Sprint>('jira.sprints')
  const active = sprints.find((s) => s.state === 'active')
  const [f, setF] = useState({ type: 'Task', summary: '', description: '', assignee: '', priority: 'Medium', labels: '', sprintId: active?.id ?? '', points: '', status: 'To Do' })
  const [err, setErr] = useState(false)
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }))
  const create = () => {
    if (!f.summary.trim()) return setErr(true)
    const n = Math.max(...issues.map((i) => Number(i.key.split('-')[1]))) + 1
    const key = `OPS-${n}`
    const now = new Date().toISOString()
    db.insert('jira.issues', {
      id: `ops-${n}`, key, type: f.type, summary: f.summary.trim(), description: f.description, status: f.status, priority: f.priority, assignee: f.assignee, reporter: ME.id,
      labels: f.labels.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean), sprintId: f.sprintId || null, points: f.points ? Number(f.points) : undefined,
      created: now, updated: now, comments: [], createdBy: isAgent ? 'hworker' : undefined,
    })
    onCreated(key)
  }
  const L = ({ t, req }: { t: string; req?: boolean }) => <div className="text-[12px] font-semibold text-[#505258] mb-1 mt-4">{t}{req && <span className="text-[#C9372C]"> *</span>}</div>
  const inp = 'w-full h-9 px-2 rounded-[4px] border border-[#8C8F97] text-[14px] outline-none focus:border-[#1868DB] focus:shadow-[0_0_0_1px_#1868DB] bg-white'
  return (
    <div className="absolute inset-0 z-50 bg-[#050C1F]/50 flex items-start justify-center pt-8">
      <div className="w-[720px] max-h-[90%] bg-white rounded-[12px] shadow-xl flex flex-col" data-agent="jira-create-modal">
        <div className="h-[60px] shrink-0 flex items-center px-6">
          <h2 className="text-[20px] font-semibold">Create</h2>
          <div className="flex-1" />
          <button className="w-8 h-8 rounded-[4px] hover:bg-[#0515240F] flex items-center justify-center"><MoreHorizontal size={16} /></button>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-[4px] hover:bg-[#0515240F] flex items-center justify-center"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-auto px-6 pb-4">
          <div className="text-[14px] text-[#505258]">Required fields are marked with an asterisk <span className="text-[#C9372C]">*</span></div>
          <L t="Space" req />
          <select className={inp + ' w-[340px]'} defaultValue="OPS"><option value="OPS">Operations Platform (OPS)</option></select>
          <L t="Work type" req />
          <select data-agent="jira-create-type" aria-label="Work type" value={f.type} onChange={(e) => set({ type: e.target.value })} className={inp + ' w-[340px]'}>
            {['Task', 'Story', 'Bug', 'Epic'].map((t) => <option key={t}>{t}</option>)}
          </select>
          <div className="h-px bg-[#0B120E24] my-5" />
          <L t="Status" />
          <select value={f.status} onChange={(e) => set({ status: e.target.value })} className={inp + ' w-[200px]'}>{COLS.map((c) => <option key={c}>{c}</option>)}</select>
          <L t="Summary" req />
          <input data-agent="jira-create-summary" aria-label="Summary" value={f.summary} onChange={(e) => { set({ summary: e.target.value }); setErr(false) }} className={`${inp} ${err ? 'border-[#C9372C]' : ''}`} />
          {err && <div className="text-[12px] text-[#AE2E24] mt-1">Summary is required</div>}
          <L t="Description" />
          <div className="rounded-[4px] border border-[#8C8F97] focus-within:border-[#1868DB]">
            <div className="h-9 flex items-center gap-3 px-2 border-b border-[#0B120E24] text-[13px] text-[#505258]"><span className="font-semibold">Aa ▾</span><b>B</b><i>I</i><span>•••</span><span>☰</span><span>🔗</span><span>@</span><span>😀</span></div>
            <textarea data-agent="jira-create-desc" aria-label="Description" value={f.description} onChange={(e) => set({ description: e.target.value })} rows={5} className="w-full px-2 py-2 text-[14px] outline-none resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-x-6">
            <div>
              <L t="Assignee" />
              <select data-agent="jira-create-assignee" aria-label="Assignee" value={f.assignee} onChange={(e) => set({ assignee: e.target.value })} className={inp}>
                <option value="">Automatic</option>
                {PEOPLE.filter((p) => !p.external).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <div className="text-[13px] text-[#1868DB] mt-1">Assign to me</div>
            </div>
            <div>
              <L t="Priority" />
              <select data-agent="jira-create-priority" aria-label="Priority" value={f.priority} onChange={(e) => set({ priority: e.target.value })} className={inp}>
                {['Highest', 'High', 'Medium', 'Low', 'Lowest'].map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <L t="Labels" />
              <input data-agent="jira-create-labels" aria-label="Labels" value={f.labels} onChange={(e) => set({ labels: e.target.value })} placeholder="Select label" className={inp} />
            </div>
            <div>
              <L t="Sprint" />
              <select data-agent="jira-create-sprint" aria-label="Sprint" value={f.sprintId} onChange={(e) => set({ sprintId: e.target.value })} className={inp}>
                <option value="">None (backlog)</option>
                {sprints.filter((s) => s.state !== 'closed').map((s) => <option key={s.id} value={s.id}>{s.name}{s.state === 'active' ? ' (active)' : ''}</option>)}
              </select>
            </div>
            <div>
              <L t="Story point estimate" />
              <input data-agent="jira-create-points" aria-label="Story points" value={f.points} onChange={(e) => set({ points: e.target.value.replace(/\D/g, '') })} className={inp} />
            </div>
            <div>
              <L t="Reporter" req />
              <div className={`${inp} flex items-center gap-2`}><Avatar id={ME.id} size={20} /> {ME.name}</div>
            </div>
          </div>
        </div>
        <div className="h-[64px] shrink-0 flex items-center px-6 gap-2 border-t border-[#0B120E24]">
          <label className="flex items-center gap-2 text-[14px]"><input type="checkbox" className="w-4 h-4" /> Create another</label>
          <div className="flex-1" />
          <button data-agent="jira-create-cancel" onClick={onClose} className="h-8 px-3 rounded-[4px] hover:bg-[#0515240F] text-[14px] font-medium">Cancel</button>
          <button data-agent="jira-create-submit" onClick={create} className="h-8 px-3 rounded-[4px] bg-[#1868DB] hover:bg-[#1558BC] text-white text-[14px] font-medium">Create</button>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────── App ─────────────────────────── */

type Tab = 'summary' | 'timeline' | 'backlog' | 'board' | 'calendar' | 'list'

export default function Jira({ win, params }: AppProps) {
  const { setUrl, setTitle } = useWin()
  const issues = useCollection<Issue>('jira.issues')
  const sprints = useCollection<Sprint>('jira.sprints')
  const [tab, setTab] = useState<Tab>('board')
  const [open, setOpen] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const active = sprints.find((s) => s.state === 'active')

  useEffect(() => {
    if (params?.issueKey) setOpen(params.issueKey)
    if (params?.view) setTab(params.view)
  }, [win.nonce])
  useEffect(() => {
    const i = open ? issues.find((x) => x.key === open) : undefined
    if (i) {
      setUrl(`https://northwind.atlassian.net/browse/${i.key}`)
      setTitle(`[${i.key}] ${i.summary} - Jira`)
    } else {
      setUrl(`https://northwind.atlassian.net/jira/software/projects/OPS/${tab === 'board' ? 'boards/12' : tab === 'backlog' ? 'boards/12/backlog' : tab}`)
      setTitle(`${tab === 'board' ? 'OPS board' : tab[0].toUpperCase() + tab.slice(1)} - Operations Platform - Jira`)
    }
  }, [open, tab])
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 9000)
    return () => clearTimeout(t)
  }, [toast])

  const tabs: [Tab, any, string][] = [['summary', LayoutGrid, 'Summary'], ['timeline', MapIcon, 'Timeline'], ['backlog', ListTodo, 'Backlog'], ['board', Columns3, 'Board'], ['calendar', CalendarDays, 'Calendar'], ['list', List, 'List']]
  const done = useMemo(() => issues.filter((i) => i.sprintId === active?.id && i.status === 'Done'), [issues, active])

  return (
    <div className="flex-1 min-h-0 flex flex-col relative text-[#292A2E] bg-white" style={{ fontFamily: ATL_FONT }}>
      <TopNav product="jira" onCreate={() => setCreating(true)} createAgent="jira-create" />
      <div className="flex-1 min-h-0 flex">
        <div className="w-[240px] shrink-0 border-r border-[#0B120E24] overflow-auto px-2 py-3 space-y-0.5">
          <SideItem icon={<UserPlus size={16} />} label="For you" />
          <SideItem icon={<Clock size={16} />} label="Recent" />
          <SideItem icon={<Star size={16} />} label="Starred" />
          <SideItem icon={<Box size={16} />} label="Apps" />
          <SideItem icon={<Rocket size={16} />} label="Plans" />
          <div className="pt-3 pb-1 px-2 text-[12px] font-semibold text-[#6B6E76] flex items-center justify-between">Spaces <Plus size={14} /></div>
          <SideItem icon={<span className="w-5 h-5 rounded-[4px] bg-[#FCA700] text-white text-[10px] font-bold flex items-center justify-center">OP</span>} label={<span className="flex items-center gap-1">Operations Platform</span>} active />
          <SideItem icon={<span className="w-5 h-5 rounded-[4px] bg-[#6A9A23] text-white text-[10px] font-bold flex items-center justify-center">VP</span>} label="Vendor Portal" />
          <SideItem icon={<span className="w-5 h-5 rounded-[4px] bg-[#AF59E1] text-white text-[10px] font-bold flex items-center justify-center">IT</span>} label="IT Service Desk" />
          <SideItem icon={<ChevronRight size={14} />} label="More spaces" />
          <div className="pt-3" />
          <SideItem icon={<Filter size={16} />} label="Filters" />
          <SideItem icon={<LayoutDashboard size={16} />} label="Dashboards" />
          <SideItem icon={<Users size={16} />} label="Teams" />
          <SideItem icon={<Code2 size={16} />} label="Development" />
          <SideItem icon={<FileText size={16} />} label="Confluence" />
          <SideItem icon={<BarChart2 size={16} />} label="Reports" />
        </div>
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="px-6 pt-4">
            <div className="text-[14px] text-[#505258]">Spaces</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-6 h-6 rounded-[4px] bg-[#FCA700] text-white text-[11px] font-bold flex items-center justify-center">OP</span>
              <h1 className="text-[20px] font-semibold">Operations Platform</h1>
              <button className="w-8 h-8 rounded-[4px] hover:bg-[#0515240F] flex items-center justify-center"><Users size={16} /></button>
              <button className="w-8 h-8 rounded-[4px] hover:bg-[#0515240F] flex items-center justify-center"><MoreHorizontal size={16} /></button>
              <div className="flex-1" />
              <button className="h-8 px-3 rounded-[4px] bg-[#0515240F] text-[14px] font-medium flex items-center gap-1.5"><Share2 size={14} /> Share</button>
              <button className="h-8 px-3 rounded-[4px] bg-[#0515240F] text-[14px] font-medium flex items-center gap-1.5"><Zap size={14} /> Automation</button>
            </div>
            <div className="flex items-end gap-1 mt-2 border-b-2 border-[#0B120E14]">
              {tabs.map(([id, I, l]) => (
                <button key={id} data-agent={`jira-tab-${id}`} onClick={() => setTab(id)} className={`relative h-10 px-2.5 flex items-center gap-1.5 text-[14px] font-medium -mb-[2px] border-b-2 ${tab === id ? 'border-[#1868DB] text-[#1868DB]' : 'border-transparent text-[#505258] hover:text-[#292A2E]'}`}>
                  <I size={15} /> {l}
                </button>
              ))}
              <button className="h-10 px-2 text-[#505258]"><Plus size={16} /></button>
            </div>
          </div>
          {tab === 'board' && (
            <>
              <div className="px-6 pt-3 flex items-baseline gap-3">
                <h2 className="text-[20px] font-semibold" data-agent="jira-sprint-name">{active?.name}</h2>
                <span className="text-[13px] text-[#505258]">{active && `${fmtD(active.start)} – ${fmtD(active.end)}`} · Goal: {active?.goal}</span>
              </div>
              <Board sprint={active} issues={issues} onOpen={setOpen} />
            </>
          )}
          {tab === 'backlog' && <Backlog sprints={sprints} issues={issues} onOpen={setOpen} />}
          {tab === 'list' && <ListView issues={issues.filter((i) => i.type !== 'Epic')} onOpen={setOpen} sprints={sprints} />}
          {(tab === 'summary' || tab === 'timeline' || tab === 'calendar') && (
            <div className="flex-1 overflow-auto px-6 py-5 grid grid-cols-4 gap-4 content-start">
              {[['Done this sprint', done.length, 'completed'], ['In progress', issues.filter((i) => i.sprintId === active?.id && ['In Progress', 'In Review'].includes(i.status)).length, 'being worked on'], ['Created', issues.filter((i) => Date.now() - +new Date(i.created) < 7 * 864e5).length, 'in the last 7 days'], ['Due soon', 3, 'in the next 7 days']].map(([a, b, c]) => (
                <div key={a as string} className="rounded-[8px] border border-[#0B120E24] p-4"><div className="text-[24px] font-semibold">{b}</div><div className="text-[14px] font-medium">{a}</div><div className="text-[13px] text-[#505258]">{c}</div></div>
              ))}
              <div className="col-span-4 rounded-[8px] border border-[#0B120E24] p-4">
                <div className="text-[16px] font-semibold mb-3">Status overview</div>
                {COLS.map((c) => {
                  const n = issues.filter((i) => i.status === c && i.type !== 'Epic').length
                  return <div key={c} className="flex items-center gap-3 mb-2 text-[14px]"><span className="w-[100px]">{c}</span><div className="flex-1 h-3 rounded bg-[#0515240F]"><div className="h-full rounded" style={{ width: `${n * 3}%`, background: c === 'Done' ? '#4BCE97' : c === 'To Do' ? '#8C8F97' : '#669DF1' }} /></div><span className="w-8 text-right">{n}</span></div>
                })}
              </div>
            </div>
          )}
        </div>
      </div>
      {open && <IssueModal issueKey={open} onClose={() => setOpen(null)} />}
      {creating && <CreateModal onClose={() => setCreating(false)} onCreated={(k) => { setCreating(false); setToast(k) }} />}
      {toast && (
        <div className="absolute left-6 bottom-6 z-50 w-[380px] bg-white rounded-[8px] shadow-[0_8px_12px_#1E1F2126,0_0_1px_#1E1F214F] p-4 flex gap-3" data-agent="jira-toast">
          <span className="w-6 h-6 rounded-full bg-[#22A06B] text-white flex items-center justify-center text-[13px] shrink-0">✓</span>
          <div className="flex-1">
            <div className="text-[14px] font-semibold"><span data-agent="jira-toast-key">{toast}</span> has been created</div>
            <button onClick={() => { setOpen(toast); setToast(null) }} className="text-[14px] text-[#1868DB] mt-1 hover:underline">View work item</button>
          </div>
          <button onClick={() => setToast(null)}><X size={16} /></button>
        </div>
      )}
    </div>
  )
}
