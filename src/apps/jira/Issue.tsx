import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronDown, ChevronRight, MoreHorizontal, X, Paperclip, Link2, Eye, Share2, ThumbsUp, Zap, GitBranch, Plus, Star, Trash2, Copy, FileText, Clock } from 'lucide-react'
import { db, useCollection } from '@/db/db'
import { useDesk } from '@/os/context'
import { ME, person, PEOPLE } from '@/data/people'
import { Avatar } from '@/components/Avatar'
import { Lozenge, HWBadge, Pop, PopItem, PopHeading, Dialog, btnDefault, btnPrimary, btnSubtle, inputAtl, copyText } from './atlassian'
import { type Issue, type Sprint, COLS, STATUS_TONE, PRIORITIES, LINK_TYPES, INVERSE, TypeIcon, PriorityIcon, UserAv, updateIssue, nextKey, useJiraFlash, usePrefs, fmtDT, fmtD, ago } from './shared'

const statusCls = (s: string) => (s === 'Done' ? 'bg-[#BAF3DB] text-[#164B35]' : s === 'To Do' ? 'bg-[#0515240F] text-[#292A2E]' : 'bg-[#CFE1FD] text-[#09326C]')

function Row({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="flex items-start min-h-[36px] py-1.5 text-[14px]">
      <div className="w-[140px] shrink-0 text-[#505258] font-medium pt-1">{k}</div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}
const fieldSel = 'w-full h-8 -ml-1 px-1 rounded-[4px] hover:bg-[#0515240F] outline-none bg-transparent focus:bg-white focus:shadow-[0_0_0_1px_#1868DB]'

export function IssueModal({ issueKey, onClose, onOpenIssue }: { issueKey: string; onClose: () => void; onOpenIssue?: (key: string) => void }) {
  const { isAgent } = useDesk()
  const flash = useJiraFlash()
  const issues = useCollection<Issue>('jira.issues')
  const sprints = useCollection<Sprint>('jira.sprints')
  const { prefs, toggleIssue } = usePrefs()
  const i = issues.find((x) => x.key === issueKey)
  const [statusOpen, setStatusOpen] = useState(false)
  const [comment, setComment] = useState('')
  const [menu, setMenu] = useState<null | 'more' | 'improve' | 'branch' | 'watch'>(null)
  const [actTab, setActTab] = useState<'All' | 'Comments' | 'History' | 'Work log'>('Comments')
  const [editSummary, setEditSummary] = useState<string | null>(null)
  const [editDesc, setEditDesc] = useState<string | null>(null)
  const [editComment, setEditComment] = useState<{ id: string; body: string } | null>(null)
  const [child, setChild] = useState<string | null>(null)
  const [link, setLink] = useState<{ type: string; key: string } | null>(null)
  const [label, setLabel] = useState('')
  const [dialog, setDialog] = useState<null | 'delete' | 'workflow' | 'log'>(null)
  const [log, setLog] = useState({ time: '1h', note: '' })
  const [childrenOpen, setChildrenOpen] = useState(true)
  const fileRef = useRef<HTMLInputElement>(null)
  const commentRef = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    setEditSummary(null)
    setEditDesc(null)
    setChild(null)
    setLink(null)
    setMenu(null)
    setStatusOpen(false)
  }, [issueKey])
  if (!i) return null
  const upd = (p: Partial<Issue>) => updateIssue(i, p)
  const subtasks = issues.filter((x) => x.parent === i.key)
  const doneSub = subtasks.filter((x) => x.status === 'Done').length
  const epics = issues.filter((x) => x.type === 'Epic')
  const watchers = i.watchers ?? [i.reporter, ...(i.assignee && i.assignee !== i.reporter ? [i.assignee] : [])]
  const watching = watchers.includes(ME.id)
  const voted = (i.votes ?? []).includes(ME.id)
  const starred = prefs.starredIssues.includes(i.key)
  const logged = (i.worklog ?? []).reduce((a, w) => a + w.minutes, 0)
  const fmtMin = (m: number) => `${Math.floor(m / 60) ? Math.floor(m / 60) + 'h ' : ''}${m % 60 ? (m % 60) + 'm' : ''}`.trim() || '0m'

  const addComment = () => {
    if (!comment.trim()) return
    upd({ comments: [...i.comments, { id: `jc-${Date.now()}`, author: ME.id, body: comment, date: new Date().toISOString() }], watchers: Array.from(new Set([...watchers, ME.id])) })
    setComment('')
  }
  const createChild = () => {
    if (!child?.trim()) return
    const { key, id } = nextKey(issues)
    const now = new Date().toISOString()
    db.insert('jira.issues', { id, key, type: 'Subtask', summary: child.trim(), description: '', status: 'To Do', priority: i.priority, assignee: '', reporter: ME.id, labels: [], sprintId: i.sprintId, parent: i.key, created: now, updated: now, comments: [], createdBy: isAgent ? 'hworker' : undefined })
    setChild('')
    flash(`${key} created`)
  }
  const addLink = () => {
    if (!link) return
    const target = issues.find((x) => x.key.toLowerCase() === link.key.trim().toLowerCase())
    if (!target || target.key === i.key) return flash(`Work item ${link.key || '(empty)'} not found`)
    upd({ links: [...(i.links ?? []).filter((l) => !(l.key === target.key && l.type === link.type)), { type: link.type, key: target.key }] })
    db.update('jira.issues', target.id, (r) => ({ links: [...((r.links as any[]) ?? []).filter((l) => l.key !== i.key), { type: INVERSE[link.type] ?? 'relates to', key: i.key }] }))
    setLink(null)
  }
  const removeLink = (l: { type: string; key: string }) => {
    upd({ links: (i.links ?? []).filter((x) => !(x.key === l.key && x.type === l.type)) })
    const t = issues.find((x) => x.key === l.key)
    if (t) db.update('jira.issues', t.id, (r) => ({ links: ((r.links as any[]) ?? []).filter((x) => x.key !== i.key) }))
  }
  const onFiles = (files: FileList | null) => {
    if (!files?.length) return
    const now = new Date().toISOString()
    upd({ attachments: [...(i.attachments ?? []), ...Array.from(files).map((f, n) => ({ id: `att-${Date.now()}${n}`, name: f.name, size: f.size, date: now, by: ME.id }))] })
    flash(`${files.length} file${files.length === 1 ? '' : 's'} attached to ${i.key}`)
  }
  const clone = () => {
    const { key, id } = nextKey(issues)
    const now = new Date().toISOString()
    db.insert('jira.issues', { ...i, id, key, summary: `CLONE - ${i.summary}`, status: 'To Do', created: now, updated: now, comments: [], history: [], worklog: [], watchers: [ME.id], votes: [], links: [{ type: 'clones', key: i.key }], createdBy: isAgent ? 'hworker' : undefined, resolvedAt: undefined })
    upd({ links: [...(i.links ?? []), { type: 'is cloned by', key }] })
    setMenu(null)
    flash(`${key} has been created`)
    onOpenIssue?.(key)
  }
  const parseTime = (t: string) => {
    let m = 0
    for (const [, n, u] of t.matchAll(/(\d+(?:\.\d+)?)\s*([wdhm])/g)) m += Number(n) * (u === 'w' ? 2400 : u === 'd' ? 480 : u === 'h' ? 60 : 1)
    return Math.round(m)
  }

  const activity: { id: string; date: string; node: ReactNode }[] = []
  if (actTab === 'All' || actTab === 'Comments')
    for (const c of i.comments)
      activity.push({
        id: c.id,
        date: c.date,
        node: (
          <div className="flex gap-3 mt-5" key={c.id}>
            <Avatar id={c.author} size={32} />
            <div className="flex-1 min-w-0">
              <div className="text-[14px]"><b className="font-semibold">{person(c.author).name}</b> <span className="text-[#505258] text-[13px] ml-1">{new Date(c.date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}{c.edited ? ' · Edited' : ''}</span></div>
              {editComment?.id === c.id ? (
                <div className="mt-1">
                  <textarea value={editComment.body} onChange={(e) => setEditComment({ id: c.id, body: e.target.value })} rows={3} className="w-full px-3 py-2 rounded-[4px] border border-[#1868DB] text-[14px] outline-none resize-none" />
                  <div className="flex gap-2 mt-1"><button className={btnPrimary} onClick={() => { upd({ comments: i.comments.map((x) => (x.id === c.id ? { ...x, body: editComment.body, edited: new Date().toISOString() } : x)) }); setEditComment(null) }}>Save</button><button className={btnSubtle} onClick={() => setEditComment(null)}>Cancel</button></div>
                </div>
              ) : (
                <>
                  <div className="text-[14px] mt-1 whitespace-pre-wrap">{c.body}</div>
                  {c.author === ME.id && (
                    <div className="flex gap-3 mt-1 text-[13px] text-[#505258]">
                      <button className="hover:underline" onClick={() => setEditComment({ id: c.id, body: c.body })}>Edit</button>
                      <button className="hover:underline" onClick={() => upd({ comments: i.comments.filter((x) => x.id !== c.id) })}>Delete</button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ),
      })
  if (actTab === 'All' || actTab === 'History') {
    for (const h of i.history ?? [])
      activity.push({
        id: h.id,
        date: h.date,
        node: (
          <div className="flex gap-3 mt-4 text-[14px]" key={h.id}>
            <Avatar id={h.author} size={32} />
            <div><b className="font-semibold">{person(h.author).name}</b> changed the <b className="font-semibold">{h.field}</b> <span className="text-[#505258] text-[13px] ml-1">{ago(h.date)}</span>
              <div className="flex items-center gap-2 mt-1 text-[13px]"><span className="line-through text-[#6B6E76]">{h.from}</span><span>→</span><span>{h.to}</span></div>
            </div>
          </div>
        ),
      })
    activity.push({ id: 'created', date: i.created, node: <div className="flex gap-3 mt-4 text-[14px]" key="created"><Avatar id={i.reporter} size={32} /><div><b className="font-semibold">{person(i.reporter).name}</b> created the Work item <span className="text-[#505258] text-[13px] ml-1">{fmtDT(i.created)}</span></div></div> })
  }
  if (actTab === 'All' || actTab === 'Work log')
    for (const w of i.worklog ?? [])
      activity.push({ id: w.id, date: w.date, node: <div className="flex gap-3 mt-4 text-[14px]" key={w.id}><Avatar id={w.author} size={32} /><div><b className="font-semibold">{person(w.author).name}</b> logged <b>{fmtMin(w.minutes)}</b> <span className="text-[#505258] text-[13px] ml-1">{ago(w.date)}</span>{w.note && <div className="mt-1">{w.note}</div>}</div></div> })
  activity.sort((a, b) => +new Date(b.date) - +new Date(a.date))

  return (
    <div className="absolute inset-0 z-40 bg-[#050C1F]/50 flex items-start justify-center pt-10" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="w-[1080px] max-w-[94%] max-h-[88%] bg-white rounded-[12px] shadow-[0_8px_12px_#1E1F2126,0_0_1px_#1E1F214F] flex flex-col relative"
        data-agent="jira-issue-modal"
        onKeyDown={(e) => {
          const t = e.target as HTMLElement
          if (e.key.toLowerCase() === 'm' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) {
            e.preventDefault()
            setActTab('Comments')
            commentRef.current?.focus()
          }
        }}
        tabIndex={-1}
      >
        <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => { onFiles(e.target.files); e.target.value = '' }} />
        <div className="h-[52px] shrink-0 flex items-center px-5 gap-2 text-[14px] text-[#505258]">
          {i.epic && <><span className="flex items-center gap-1.5"><TypeIcon type="Epic" size={14} />{i.epic}</span><span>/</span></>}
          {i.parent && <><button onClick={() => onOpenIssue?.(i.parent!)} className="flex items-center gap-1.5 hover:underline"><TypeIcon type={issues.find((x) => x.key === i.parent)?.type ?? 'Story'} size={14} />{i.parent}</button><span>/</span></>}
          <span className="flex items-center gap-1.5"><TypeIcon type={i.type} size={14} /><span className="text-[#292A2E]" data-agent="jira-issue-key">{i.key}</span></span>
          {i.createdBy === 'hworker' && <HWBadge />}
          <div className="flex-1" />
          <span className="relative">
            <button data-atl-trigger aria-label={watching ? 'Stop watching' : 'Start watching'} title={watching ? 'You are watching this work item' : 'Watch'} onClick={() => setMenu(menu === 'watch' ? null : 'watch')} className={`h-8 px-2 rounded-[4px] hover:bg-[#0515240F] flex items-center gap-1 ${watching ? 'text-[#1868DB]' : ''}`}><Eye size={16} /> <span className="text-[13px]">{watchers.length}</span></button>
            {menu === 'watch' && (
              <Pop onClose={() => setMenu(null)} className="right-0 top-9 w-[240px]">
                <PopItem onClick={() => upd({ watchers: watching ? watchers.filter((w) => w !== ME.id) : [...watchers, ME.id] })}>{watching ? 'Stop watching' : 'Start watching'}</PopItem>
                <PopHeading>Watching this work item</PopHeading>
                {watchers.map((w) => <div key={w} className="px-3 py-1 flex items-center gap-2"><Avatar id={w} size={22} /> {person(w).name}</div>)}
              </Pop>
            )}
          </span>
          <button aria-label={voted ? 'Remove vote' : 'Vote for this work item'} aria-pressed={voted} onClick={() => upd({ votes: voted ? (i.votes ?? []).filter((v) => v !== ME.id) : [...(i.votes ?? []), ME.id] })} className={`h-8 px-2 rounded-[4px] hover:bg-[#0515240F] flex items-center gap-1 ${voted ? 'text-[#1868DB]' : ''}`}><ThumbsUp size={16} />{!!i.votes?.length && <span className="text-[13px]">{i.votes.length}</span>}</button>
          <button aria-label="Copy link" onClick={() => { copyText(`https://northwind.atlassian.net/browse/${i.key}`); flash('Link copied to clipboard') }} className="w-8 h-8 rounded-[4px] hover:bg-[#0515240F] flex items-center justify-center"><Share2 size={16} /></button>
          <span className="relative">
            <button data-atl-trigger aria-label="More actions" onClick={() => setMenu(menu === 'more' ? null : 'more')} className="w-8 h-8 rounded-[4px] hover:bg-[#0515240F] flex items-center justify-center"><MoreHorizontal size={16} /></button>
            {menu === 'more' && (
              <Pop onClose={() => setMenu(null)} className="right-0 top-9 w-[220px]" agent="jira-issue-more">
                <PopItem onClick={() => { toggleIssue(i.key); setMenu(null) }}><Star size={14} fill={starred ? '#E2B203' : 'none'} className={starred ? 'text-[#E2B203]' : ''} /> {starred ? 'Unstar' : 'Star'}</PopItem>
                <PopItem onClick={() => { setMenu(null); setDialog('log') }}><Clock size={14} /> Log work</PopItem>
                <PopItem onClick={clone}><Copy size={14} /> Clone</PopItem>
                <PopItem onClick={() => { copyText(i.key); setMenu(null); flash(`${i.key} copied`) }}><FileText size={14} /> Copy key</PopItem>
                <div className="h-px bg-[#0B120E24] my-1" />
                <PopItem danger onClick={() => { setMenu(null); setDialog('delete') }}><Trash2 size={14} /> Delete</PopItem>
              </Pop>
            )}
          </span>
          <button data-agent="jira-issue-close" aria-label="Close" onClick={onClose} className="w-8 h-8 rounded-[4px] hover:bg-[#0515240F] flex items-center justify-center"><X size={18} /></button>
        </div>
        <div className="flex-1 min-h-0 flex overflow-hidden">
          <div className="flex-1 min-w-0 overflow-auto px-8 pb-8">
            {editSummary !== null ? (
              <input
                autoFocus
                aria-label="Summary"
                value={editSummary}
                onChange={(e) => setEditSummary(e.target.value)}
                onBlur={() => { if (editSummary.trim() && editSummary.trim() !== i.summary) upd({ summary: editSummary.trim() }); setEditSummary(null) }}
                onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setEditSummary(null) }}
                className="w-full text-[24px] font-semibold text-[#292A2E] leading-tight px-1 -mx-1 rounded-[4px] border border-[#1868DB] outline-none"
              />
            ) : (
              <h1 className="text-[24px] font-semibold text-[#292A2E] leading-tight rounded-[4px] hover:bg-[#0515240F] cursor-text -mx-1 px-1" data-agent="jira-issue-summary" onClick={() => setEditSummary(i.summary)}>{i.summary}</h1>
            )}
            <div className="flex gap-1 mt-3">
              <button onClick={() => fileRef.current?.click()} className="h-8 px-2.5 rounded-[4px] bg-[#0515240F] hover:bg-[#0B120E24] text-[14px] flex items-center gap-1.5 font-medium"><Paperclip size={15} /> Attach</button>
              {i.type !== 'Subtask' && <button onClick={() => { setChild(''); setChildrenOpen(true) }} className="h-8 px-2.5 rounded-[4px] bg-[#0515240F] hover:bg-[#0B120E24] text-[14px] flex items-center gap-1.5 font-medium"><GitBranch size={15} /> Add child work item</button>}
              <button onClick={() => setLink({ type: 'relates to', key: '' })} className="h-8 px-2.5 rounded-[4px] bg-[#0515240F] hover:bg-[#0B120E24] text-[14px] flex items-center gap-1.5 font-medium"><Link2 size={15} /> Link work item</button>
            </div>
            <div className="mt-6 text-[16px] font-semibold">Description</div>
            {editDesc !== null ? (
              <div className="mt-2">
                <textarea autoFocus aria-label="Description" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={8} className="w-full px-3 py-2 rounded-[4px] border border-[#1868DB] text-[14px] leading-[22px] outline-none resize-y" />
                <div className="flex gap-2 mt-2"><button className={btnPrimary} onClick={() => { upd({ description: editDesc }); setEditDesc(null) }}>Save</button><button className={btnSubtle} onClick={() => setEditDesc(null)}>Cancel</button></div>
              </div>
            ) : (
              <div className="mt-2 text-[14px] leading-[22px] whitespace-pre-wrap text-[#292A2E] rounded-[4px] hover:bg-[#0515240F] cursor-text -mx-1 px-1 py-0.5" onClick={() => setEditDesc(i.description)}>{i.description || <span className="text-[#6B6E76]">Add a description…</span>}</div>
            )}

            {!!i.attachments?.length && (
              <>
                <div className="mt-6 text-[16px] font-semibold">Attachments <span className="text-[#6B6E76] font-normal text-[14px]">{i.attachments.length}</span></div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {i.attachments.map((a) => (
                    <div key={a.id} className="w-[180px] rounded-[6px] border border-[#0B120E24] p-2 text-[13px] group relative">
                      <FileText size={22} className="text-[#505258]" />
                      <div className="truncate mt-1 font-medium">{a.name}</div>
                      <div className="text-[12px] text-[#6B6E76]">{Math.max(1, Math.round(a.size / 1024))} KB · {fmtD(a.date)}</div>
                      <button aria-label={`Delete ${a.name}`} onClick={() => upd({ attachments: (i.attachments ?? []).filter((x) => x.id !== a.id) })} className="absolute top-1 right-1 w-6 h-6 rounded hover:bg-[#0515240F] items-center justify-center hidden group-hover:flex"><Trash2 size={13} /></button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {(subtasks.length > 0 || child !== null) && (
              <>
                <div className="mt-6 flex items-center gap-2">
                  <button onClick={() => setChildrenOpen((o) => !o)} className="flex items-center gap-1 text-[16px] font-semibold">{childrenOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />} Child work items</button>
                  {subtasks.length > 0 && <><div className="w-[120px] h-1.5 rounded bg-[#0515240F] overflow-hidden"><div className="h-full bg-[#22A06B]" style={{ width: `${(doneSub / subtasks.length) * 100}%` }} /></div><span className="text-[13px] text-[#505258]">{Math.round((doneSub / subtasks.length) * 100)}% Done</span></>}
                  <div className="flex-1" />
                  <button aria-label="Add child work item" onClick={() => setChild('')} className="w-7 h-7 rounded hover:bg-[#0515240F] flex items-center justify-center"><Plus size={15} /></button>
                </div>
                {childrenOpen && (
                  <div className="mt-2 rounded-[6px] border border-[#0B120E24]">
                    {subtasks.map((s) => (
                      <div key={s.id} className="h-10 flex items-center gap-2 px-3 border-b last:border-b-0 border-[#0B120E14] text-[14px]">
                        <TypeIcon type={s.type} />
                        <button onClick={() => onOpenIssue?.(s.key)} className="text-[#1868DB] hover:underline text-[13px]">{s.key}</button>
                        <span className={`flex-1 truncate ${s.status === 'Done' ? 'line-through text-[#6B6E76]' : ''}`}>{s.summary}</span>
                        <PriorityIcon p={s.priority} />
                        <UserAv id={s.assignee} size={22} />
                        <select aria-label={`Status of ${s.key}`} value={s.status} onChange={(e) => updateIssue(s, { status: e.target.value })} className={`h-6 px-1 rounded-[3px] text-[11px] font-semibold uppercase outline-none ${statusCls(s.status)}`}>
                          {COLS.map((c) => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                    ))}
                    {child !== null && (
                      <div className="flex items-center gap-2 p-2">
                        <TypeIcon type="Subtask" />
                        <input autoFocus aria-label="Child work item summary" value={child} onChange={(e) => setChild(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') createChild(); if (e.key === 'Escape') setChild(null) }} placeholder="What needs to be done?" className="flex-1 h-8 px-2 rounded-[4px] border border-[#1868DB] text-[14px] outline-none" />
                        <button className={btnPrimary} disabled={!child.trim()} onClick={createChild}>Create</button>
                        <button className={btnSubtle} onClick={() => setChild(null)}>Cancel</button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {(!!i.links?.length || link) && (
              <>
                <div className="mt-6 text-[16px] font-semibold">Linked work items</div>
                <div className="mt-2 rounded-[6px] border border-[#0B120E24]">
                  {Object.entries((i.links ?? []).reduce<Record<string, string[]>>((m, l) => ((m[l.type] = [...(m[l.type] ?? []), l.key]), m), {})).map(([type, keys]) => (
                    <div key={type}>
                      <div className="px-3 pt-2 text-[12px] font-semibold text-[#505258]">{type}</div>
                      {keys.map((k) => {
                        const t = issues.find((x) => x.key === k)
                        return (
                          <div key={k} className="h-10 flex items-center gap-2 px-3 text-[14px] group">
                            {t && <TypeIcon type={t.type} />}
                            <button onClick={() => onOpenIssue?.(k)} className="text-[#1868DB] hover:underline text-[13px]">{k}</button>
                            <span className="flex-1 truncate">{t?.summary ?? '(deleted)'}</span>
                            {t && <Lozenge tone={STATUS_TONE[t.status]}>{t.status}</Lozenge>}
                            <button aria-label={`Unlink ${k}`} onClick={() => removeLink({ type, key: k })} className="w-6 h-6 rounded hover:bg-[#0515240F] items-center justify-center hidden group-hover:flex"><X size={13} /></button>
                          </div>
                        )
                      })}
                    </div>
                  ))}
                  {link && (
                    <div className="flex items-center gap-2 p-2 border-t border-[#0B120E14]">
                      <select aria-label="Link type" value={link.type} onChange={(e) => setLink({ ...link, type: e.target.value })} className="h-8 px-1 rounded-[4px] border border-[#8C8F97] text-[14px]">{LINK_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
                      <input autoFocus aria-label="Work item key" list="jira-link-keys" value={link.key} onChange={(e) => setLink({ ...link, key: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && addLink()} placeholder="Search for work items, e.g. OPS-120" className="flex-1 h-8 px-2 rounded-[4px] border border-[#1868DB] text-[14px] outline-none" />
                      <datalist id="jira-link-keys">{issues.filter((x) => x.key !== i.key).map((x) => <option key={x.id} value={x.key}>{x.summary}</option>)}</datalist>
                      <button className={btnPrimary} onClick={addLink}>Link</button>
                      <button className={btnSubtle} onClick={() => setLink(null)}>Cancel</button>
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="mt-8 text-[16px] font-semibold">Activity</div>
            <div className="flex gap-1 mt-2 text-[14px]">
              {(['All', 'Comments', 'History', 'Work log'] as const).map((t) => <button key={t} onClick={() => setActTab(t)} className={`h-7 px-2 rounded-[4px] ${actTab === t ? 'bg-[#E9F2FE] text-[#1868DB] font-medium' : 'hover:bg-[#0515240F]'}`}>{t}</button>)}
            </div>
            {(actTab === 'Comments' || actTab === 'All') && (
              <div className="flex gap-3 mt-4">
                <Avatar id={ME.id} size={32} />
                <div className="flex-1">
                  <textarea ref={commentRef} data-agent="jira-comment-input" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment…" rows={comment ? 3 : 1} className="w-full px-3 py-2 rounded-[4px] border border-[#8C8F97] text-[14px] outline-none focus:border-[#1868DB] resize-none" />
                  {comment ? (
                    <div className="flex gap-2 mt-2">
                      <button data-agent="jira-comment-save" onClick={addComment} className="h-8 px-3 rounded-[4px] bg-[#1868DB] text-white text-[14px] font-medium">Save</button>
                      <button onClick={() => setComment('')} className="h-8 px-3 rounded-[4px] hover:bg-[#0515240F] text-[14px]">Cancel</button>
                    </div>
                  ) : (
                    <div className="text-[12px] text-[#6B6E76] mt-1.5"><b>Pro tip:</b> press <kbd className="px-1 rounded bg-[#0515240F]">M</kbd> to comment</div>
                  )}
                </div>
              </div>
            )}
            {actTab === 'Work log' && <button className={btnDefault + ' mt-4 flex items-center gap-1.5'} onClick={() => setDialog('log')}><Clock size={14} /> Log work</button>}
            {activity.map((a) => a.node)}
            {!activity.length && actTab !== 'Comments' && <div className="mt-4 text-[14px] text-[#6B6E76]">{actTab === 'Work log' ? 'No work has been logged yet.' : 'Nothing to show yet.'}</div>}
          </div>
          <div className="w-[380px] shrink-0 overflow-auto pr-6 pb-8">
            <div className="flex items-center gap-2 relative">
              <button data-agent="jira-issue-status" onClick={() => setStatusOpen((o) => !o)} className={`h-8 px-3 rounded-[4px] text-[14px] font-medium flex items-center gap-1.5 ${statusCls(i.status)}`}>
                {i.status} <ChevronDown size={15} />
              </button>
              <span className="relative">
                <button data-atl-trigger onClick={() => setMenu(menu === 'improve' ? null : 'improve')} className="h-8 px-2.5 rounded-[4px] bg-[#0515240F] text-[14px] flex items-center gap-1.5"><Zap size={14} /> Improve work item</button>
                {menu === 'improve' && (
                  <Pop onClose={() => setMenu(null)} className="left-0 top-9 w-[280px]">
                    <PopHeading>Atlassian Intelligence</PopHeading>
                    <PopItem disabled={/acceptance criteria/i.test(i.description)} onClick={() => { upd({ description: `${i.description}${i.description ? '\n\n' : ''}Acceptance criteria\n- ${i.summary}\n- Covered by automated tests\n- Documented in the Operations space` }); setMenu(null); flash('Acceptance criteria added to the description') }}>Suggest acceptance criteria</PopItem>
                    <PopItem disabled={i.type === 'Subtask'} onClick={() => { setMenu(null); setChild('') }}>Break down into child work items</PopItem>
                    <div className="px-3 py-2 text-[12px] text-[#6B6E76] border-t border-[#0B120E14] mt-1">
                      {i.comments.length ? `Summary: ${i.comments.length} comment${i.comments.length === 1 ? '' : 's'}; latest from ${person(i.comments[i.comments.length - 1].author).name}: “${i.comments[i.comments.length - 1].body.slice(0, 90)}${i.comments[i.comments.length - 1].body.length > 90 ? '…' : ''}”` : 'No comments to summarize yet.'}
                    </div>
                  </Pop>
                )}
              </span>
              {statusOpen && (
                <div className="absolute top-9 left-0 z-10 w-[220px] bg-white rounded-[6px] shadow-[0_8px_12px_#1E1F2126,0_0_1px_#1E1F214F] py-1.5">
                  {COLS.map((s) => (
                    <button key={s} data-agent={`jira-status-${s.toLowerCase().replace(/\s/g, '-')}`} onClick={() => { upd({ status: s }); setStatusOpen(false) }} className="w-full text-left px-3 py-1.5 hover:bg-[#0515240F] flex items-center justify-between text-[14px]">
                      <Lozenge tone={STATUS_TONE[s]}>{s}</Lozenge>
                      {s === i.status && <span className="text-[#1868DB]">✓</span>}
                    </button>
                  ))}
                  <button onClick={() => { setStatusOpen(false); setDialog('workflow') }} className="w-full text-left border-t border-[#0B120E24] mt-1 px-3 py-1.5 text-[14px] text-[#505258] hover:bg-[#0515240F]">View workflow</button>
                </div>
              )}
            </div>
            <div className="mt-4 rounded-[6px] border border-[#0B120E24]">
              <div className="h-11 px-3 flex items-center justify-between border-b border-[#0B120E24] text-[14px] font-semibold">Details <ChevronDown size={15} /></div>
              <div className="px-3 py-2">
                <Row k="Assignee">
                  <select value={i.assignee} onChange={(e) => upd({ assignee: e.target.value })} className={fieldSel} aria-label="Assignee">
                    <option value="">Unassigned</option>
                    {PEOPLE.filter((p) => !p.external).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  {i.assignee !== ME.id && <button className="text-[13px] text-[#1868DB] hover:underline" onClick={() => upd({ assignee: ME.id })}>Assign to me</button>}
                </Row>
                <Row k="Reporter">
                  <select value={i.reporter} onChange={(e) => upd({ reporter: e.target.value })} className={fieldSel} aria-label="Reporter">
                    {PEOPLE.filter((p) => !p.external).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </Row>
                <Row k="Labels">
                  <div className="flex flex-wrap gap-1 items-center">
                    {i.labels.map((l) => <span key={l} className="pl-1.5 pr-0.5 h-5 rounded-[3px] bg-[#0515240F] text-[12px] flex items-center gap-0.5">{l}<button aria-label={`Remove label ${l}`} onClick={() => upd({ labels: i.labels.filter((x) => x !== l) })} className="w-4 h-4 rounded hover:bg-[#0B120E24] flex items-center justify-center"><X size={10} /></button></span>)}
                    <input aria-label="Add label" value={label} onChange={(e) => setLabel(e.target.value.replace(/\s/g, '-'))} onKeyDown={(e) => { if (e.key === 'Enter' && label.trim()) { upd({ labels: Array.from(new Set([...i.labels, label.trim()])) }); setLabel('') } }} placeholder={i.labels.length ? '+' : 'Add labels'} className="flex-1 min-w-[70px] h-6 px-1 rounded-[3px] text-[13px] outline-none hover:bg-[#0515240F] focus:bg-white focus:shadow-[0_0_0_1px_#1868DB]" />
                  </div>
                </Row>
                <Row k="Sprint">
                  <select value={i.sprintId ?? ''} onChange={(e) => upd({ sprintId: e.target.value || null })} className={fieldSel + ' text-[#1868DB]'} aria-label="Sprint">
                    <option value="">None</option>
                    {sprints.filter((s) => s.state !== 'closed' || s.id === i.sprintId).map((s) => <option key={s.id} value={s.id}>{s.name}{s.state === 'active' ? ' (active)' : ''}</option>)}
                  </select>
                </Row>
                <Row k="Priority">
                  <span className="flex items-center gap-1.5"><PriorityIcon p={i.priority} />
                    <select value={i.priority} onChange={(e) => upd({ priority: e.target.value })} className={fieldSel} aria-label="Priority">{PRIORITIES.map((p) => <option key={p}>{p}</option>)}</select>
                  </span>
                </Row>
                <Row k="Story point estimate">
                  <input aria-label="Story point estimate" defaultValue={i.points ?? ''} key={`${i.key}-${i.points}`} onBlur={(e) => { const v = e.target.value.trim(); const n = v === '' ? undefined : Number(v); if (n === undefined || !isNaN(n)) { if (n !== i.points) upd({ points: n }) } }} onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} placeholder="None" className="w-full h-8 -ml-1 px-1 rounded-[4px] hover:bg-[#0515240F] outline-none focus:bg-white focus:shadow-[0_0_0_1px_#1868DB]" />
                </Row>
                {i.type !== 'Epic' && i.type !== 'Subtask' && (
                  <Row k="Parent">
                    <select value={i.epic ?? ''} onChange={(e) => upd({ epic: e.target.value || undefined })} className={fieldSel} aria-label="Parent">
                      <option value="">None</option>
                      {epics.map((e) => <option key={e.id} value={e.summary}>{e.summary}</option>)}
                    </select>
                  </Row>
                )}
                <Row k="Due date">
                  <input type="date" aria-label="Due date" value={i.due ? i.due.slice(0, 10) : ''} onChange={(e) => upd({ due: e.target.value ? new Date(e.target.value + 'T17:00:00').toISOString() : undefined })} className="w-full h-8 -ml-1 px-1 rounded-[4px] hover:bg-[#0515240F] outline-none bg-transparent" />
                </Row>
                <Row k="Time tracking">
                  <button onClick={() => setDialog('log')} className="w-full text-left">
                    <div className="h-1.5 rounded bg-[#0515240F] overflow-hidden mt-2"><div className="h-full bg-[#1868DB]" style={{ width: `${Math.min(100, (logged / Math.max(60, (i.points ?? 1) * 240)) * 100)}%` }} /></div>
                    <div className="text-[12px] text-[#505258] mt-1">{logged ? `${fmtMin(logged)} logged` : 'No time logged'}</div>
                  </button>
                </Row>
                <Row k="Development">
                  <span className="relative">
                    <button data-atl-trigger onClick={() => setMenu(menu === 'branch' ? null : 'branch')} className="flex items-center gap-1.5 text-[#1868DB] hover:underline"><GitBranch size={14} /> {i.branch ? '1 branch' : 'Create branch'}</button>
                    {menu === 'branch' && (
                      <Pop onClose={() => setMenu(null)} className="right-0 top-7 w-[340px] px-3 !py-3">
                        <div className="text-[13px] font-semibold mb-1">Create branch</div>
                        <div className="text-[12px] text-[#505258] mb-2">Copy the command and run it in your repository (northwind/ops-platform).</div>
                        {(() => {
                          const b = i.branch ?? `${i.key}-${i.summary.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40).replace(/-$/, '')}`
                          return (
                            <>
                              <code className="block text-[12px] bg-[#0515240F] rounded px-2 py-1.5 break-all">git checkout -b {b}</code>
                              <button className={btnPrimary + ' mt-2 w-full'} onClick={() => { copyText(`git checkout -b ${b}`); upd({ branch: b }); setMenu(null); flash('Branch command copied') }}>Copy command</button>
                            </>
                          )
                        })()}
                      </Pop>
                    )}
                  </span>
                </Row>
              </div>
            </div>
            <div className="mt-3 text-[12px] text-[#6B6E76] leading-5">Created {new Date(i.created).toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}<br />Updated {new Date(i.updated).toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</div>
          </div>
        </div>
        {dialog === 'delete' && (
          <Dialog
            title={<span className="flex items-center gap-2 text-[#AE2E24]">Delete {i.key}?</span>}
            onClose={() => setDialog(null)}
            footer={<><button className={btnSubtle} onClick={() => setDialog(null)}>Cancel</button><button className="h-8 px-3 rounded-[4px] bg-[#C9372C] hover:bg-[#AE2E24] text-white text-[14px] font-medium" onClick={() => { for (const s of subtasks) db.remove('jira.issues', s.id); db.remove('jira.issues', i.id); flash(`${i.key} was deleted`); onClose() }}>Delete</button></>}
          >
            You’re about to permanently delete this work item, its comments and attachments{subtasks.length ? `, and its ${subtasks.length} child work item${subtasks.length === 1 ? '' : 's'}` : ''}. If you’re not sure, you can resolve or close it instead.
          </Dialog>
        )}
        {dialog === 'workflow' && (
          <Dialog title="Workflow" onClose={() => setDialog(null)} width={640}>
            <div className="flex items-center justify-between gap-2 py-6">
              {COLS.map((c, n) => (
                <div key={c} className="flex items-center gap-2">
                  <span className={`px-3 h-8 rounded-[4px] flex items-center text-[13px] font-semibold uppercase ${statusCls(c)} ${c === i.status ? 'ring-2 ring-[#1868DB]' : ''}`}>{c}</span>
                  {n < COLS.length - 1 && <span className="text-[#6B6E76]">⇄</span>}
                </div>
              ))}
            </div>
            <div className="text-[13px] text-[#505258]">All transitions are allowed in this simplified team-managed workflow. The current status is highlighted.</div>
          </Dialog>
        )}
        {dialog === 'log' && (
          <Dialog
            title="Time tracking"
            onClose={() => setDialog(null)}
            footer={<><button className={btnSubtle} onClick={() => setDialog(null)}>Cancel</button><button className={btnPrimary} disabled={!parseTime(log.time)} onClick={() => { upd({ worklog: [...(i.worklog ?? []), { id: `wl-${Date.now()}`, author: ME.id, minutes: parseTime(log.time), date: new Date().toISOString(), note: log.note.trim() }] }); setDialog(null); setLog({ time: '1h', note: '' }); setActTab('Work log'); flash(`Logged ${log.time} on ${i.key}`) }}>Save</button></>}
          >
            <div className="text-[12px] font-semibold text-[#505258] mb-1">Time spent</div>
            <input autoFocus value={log.time} onChange={(e) => setLog({ ...log, time: e.target.value })} className={inputAtl} aria-label="Time spent" />
            <div className="text-[12px] text-[#6B6E76] mt-1">Use the format: 2w 4d 6h 45m{parseTime(log.time) ? ` · ${fmtMin(parseTime(log.time))}` : ''}</div>
            <div className="text-[12px] font-semibold text-[#505258] mb-1 mt-4">Work description</div>
            <textarea value={log.note} onChange={(e) => setLog({ ...log, note: e.target.value })} rows={3} className={inputAtl + ' h-auto py-2'} aria-label="Work description" />
          </Dialog>
        )}
      </div>
    </div>
  )
}
