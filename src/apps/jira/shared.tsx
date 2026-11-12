import { createContext, useContext } from 'react'
import { Users } from 'lucide-react'
import { db, useCollection, useRecord } from '@/db/db'
import { ME, person } from '@/data/people'
import { Avatar } from '@/components/Avatar'

export type Comment = { id: string; author: string; body: string; date: string; edited?: string }
export type HistoryEntry = { id: string; author: string; date: string; field: string; from: string; to: string }
export type Issue = {
  id: string; key: string; type: string; summary: string; description: string; status: string; priority: string; assignee: string; reporter: string
  labels: string[]; sprintId: string | null; points?: number; epic?: string; created: string; updated: string; comments: Comment[]; createdBy?: string
  /* optional fields added by the app at runtime */
  parent?: string
  watchers?: string[]
  votes?: string[]
  links?: { type: string; key: string }[]
  attachments?: { id: string; name: string; size: number; date: string; by: string }[]
  history?: HistoryEntry[]
  worklog?: { id: string; author: string; minutes: number; date: string; note: string }[]
  due?: string
  resolvedAt?: string
  branch?: string
}
export type Sprint = { id: string; name: string; state: string; start: string; end: string; goal: string; completedAt?: string; committed?: number; completedPoints?: number }

export const COLS = ['To Do', 'In Progress', 'In Review', 'Done']
export const STATUS_TONE: Record<string, any> = { 'To Do': 'grey', 'In Progress': 'blue', 'In Review': 'blue', Done: 'green' }
export const PRIORITIES = ['Highest', 'High', 'Medium', 'Low', 'Lowest']
export const TYPES = ['Task', 'Story', 'Bug', 'Epic']
export const LINK_TYPES = ['blocks', 'is blocked by', 'relates to', 'duplicates', 'is duplicated by', 'clones']
export const INVERSE: Record<string, string> = { blocks: 'is blocked by', 'is blocked by': 'blocks', 'relates to': 'relates to', duplicates: 'is duplicated by', 'is duplicated by': 'duplicates', clones: 'is cloned by', 'is cloned by': 'clones' }

export const daysLeft = (iso: string) => Math.max(0, Math.ceil((+new Date(iso) - Date.now()) / 86400000))
export const fmtD = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
export const fmtDT = (iso: string) => new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
export const ago = (iso: string) => {
  const m = (Date.now() - +new Date(iso)) / 60000
  if (m < 1) return 'just now'
  if (m < 60) return `${Math.round(m)} minutes ago`
  if (m < 1440) return `${Math.round(m / 60)} hours ago`
  const d = Math.round(m / 1440)
  return d === 1 ? 'yesterday' : `${d} days ago`
}

export function TypeIcon({ type, size = 16 }: { type: string; size?: number }) {
  const c = type === 'Bug' ? '#E2483D' : type === 'Story' ? '#63BA3C' : type === 'Epic' ? '#904EE2' : '#4BADE8'
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" className="shrink-0" aria-label={type}>
      <rect width="16" height="16" rx="3" fill={c} />
      {type === 'Bug' && <circle cx="8" cy="8" r="3.4" fill="#fff" />}
      {type === 'Story' && <path d="M5 3.5h6v9l-3-2.2-3 2.2z" fill="#fff" />}
      {type === 'Task' && <path d="M4.5 8.3l2.3 2.2 4.7-5" stroke="#fff" strokeWidth="1.9" fill="none" strokeLinecap="round" strokeLinejoin="round" />}
      {type === 'Epic' && <path d="M9 3L5 9h3l-1 4 4-6H8z" fill="#fff" />}
      {type === 'Subtask' && <><rect x="3.5" y="3.5" width="5" height="5" rx="1" fill="none" stroke="#fff" strokeWidth="1.5" /><rect x="7.5" y="7.5" width="5" height="5" rx="1" fill="#fff" /></>}
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
export function UserAv({ id, size = 24 }: { id: string; size?: number }) {
  if (!id) return <span className="rounded-full bg-[#DDDEE1] flex items-center justify-center text-[#505258] shrink-0" style={{ width: size, height: size }} aria-label="Unassigned"><Users size={size * 0.55} /></span>
  return <Avatar id={id} size={size} />
}

/** flags (bottom-left confirmations) */
export const JiraFlash = createContext<(msg: string) => void>(() => {})
export const useJiraFlash = () => useContext(JiraFlash)

const LABEL: Record<string, string> = { status: 'Status', assignee: 'Assignee', priority: 'Priority', sprintId: 'Sprint', points: 'Story point estimate', labels: 'Labels', summary: 'Summary', description: 'Description', epic: 'Parent', due: 'Due date', type: 'Work type', reporter: 'Reporter' }
const show = (k: string, v: any, sprints: Sprint[]) => {
  if (v === undefined || v === null || v === '') return 'None'
  if (k === 'assignee' || k === 'reporter') return person(v).name
  if (k === 'sprintId') return sprints.find((s) => s.id === v)?.name ?? 'None'
  if (k === 'labels') return (v as string[]).join(', ') || 'None'
  if (k === 'description') return String(v).slice(0, 80) + (String(v).length > 80 ? '…' : '')
  if (k === 'due') return fmtD(v)
  return String(v)
}

/** Update an issue and record the change in its history (like Jira's History tab). */
export function updateIssue(i: Issue, patch: Partial<Issue>) {
  const now = new Date().toISOString()
  const sprints = db.get<Sprint>('jira.sprints')
  const hist: HistoryEntry[] = []
  for (const [k, v] of Object.entries(patch)) {
    if (!(k in LABEL)) continue
    const before = (i as any)[k]
    if (JSON.stringify(before ?? null) === JSON.stringify(v ?? null)) continue
    hist.push({ id: `h-${Date.now()}-${k}`, author: ME.id, date: now, field: LABEL[k], from: show(k, before, sprints), to: show(k, v, sprints) })
  }
  const extra: Partial<Issue> = {}
  if (patch.status === 'Done' && i.status !== 'Done') extra.resolvedAt = now
  if (patch.status && patch.status !== 'Done' && i.status === 'Done') extra.resolvedAt = undefined
  db.update('jira.issues', i.id, (r) => ({ ...patch, ...extra, updated: now, history: [...hist, ...((r.history as HistoryEntry[]) ?? [])] }))
}

export function nextKey(issues: Issue[]) {
  const n = Math.max(...issues.map((i) => Number(i.key.split('-')[1]) || 0)) + 1
  return { n, key: `OPS-${n}`, id: `ops-${n}` }
}

/** per-user Jira preferences (starred items, saved filters) */
export type JiraPrefs = { id: string; starredIssues: string[]; starredFilters: string[]; automation?: Record<string, boolean> }
export function usePrefs() {
  const p = useRecord<JiraPrefs>('jira.prefs', ME.id)
  const prefs: JiraPrefs = { id: ME.id, starredIssues: [], starredFilters: ['f-mine'], automation: {}, ...(p ?? {}) }
  const set = (patch: Partial<JiraPrefs>) => db.upsert('jira.prefs', { ...prefs, ...patch })
  const toggleIssue = (key: string) => set({ starredIssues: prefs.starredIssues.includes(key) ? prefs.starredIssues.filter((k) => k !== key) : [...prefs.starredIssues, key] })
  const toggleFilter = (id: string) => set({ starredFilters: prefs.starredFilters.includes(id) ? prefs.starredFilters.filter((k) => k !== id) : [...prefs.starredFilters, id] })
  return { prefs, set, toggleIssue, toggleFilter }
}

export type SavedFilter = { id: string; name: string; jql: string; owner: string; builtIn?: boolean }
export const BUILTIN_FILTERS: SavedFilter[] = [
  { id: 'f-mine', name: 'My open work items', jql: 'assignee = currentUser() AND status != Done ORDER BY priority DESC', owner: 'alex', builtIn: true },
  { id: 'f-reported', name: 'Reported by me', jql: 'reporter = currentUser() ORDER BY created DESC', owner: 'alex', builtIn: true },
  { id: 'f-all', name: 'All work items', jql: 'project = OPS ORDER BY created DESC', owner: 'alex', builtIn: true },
  { id: 'f-open-bugs', name: 'Open bugs', jql: 'type = Bug AND status != Done ORDER BY priority DESC', owner: 'alex', builtIn: true },
  { id: 'f-done', name: 'Done work items', jql: 'status = Done ORDER BY updated DESC', owner: 'alex', builtIn: true },
  { id: 'f-recent', name: 'Created recently', jql: 'created >= -7d ORDER BY created DESC', owner: 'alex', builtIn: true },
  { id: 'f-sprint', name: 'Current sprint', jql: 'sprint in openSprints() ORDER BY rank', owner: 'alex', builtIn: true },
]
export function useFilters() {
  const saved = useCollection<SavedFilter>('jira.filters')
  return [...BUILTIN_FILTERS, ...saved]
}

/* ─────────────────────────── JQL-lite ─────────────────────────── */

const FIELD_ALIASES: Record<string, string> = { issuetype: 'type', type: 'type', status: 'status', priority: 'priority', assignee: 'assignee', reporter: 'reporter', labels: 'labels', label: 'labels', sprint: 'sprint', epic: 'epic', parent: 'epic', text: 'text', summary: 'summary', description: 'description', project: 'project', key: 'key', created: 'created', updated: 'updated', points: 'points', 'story points': 'points' }

export type JqlResult = { ok: true; rows: Issue[] } | { ok: false; error: string }

function personMatch(v: string, id: string) {
  if (v === 'currentuser()') return id === ME.id
  if (v === 'empty' || v === 'null' || v === 'unassigned') return !id
  if (!id) return false
  const p = person(id)
  return p.id === v || p.name.toLowerCase() === v || p.first.toLowerCase() === v || p.email.toLowerCase() === v
}
function relDate(v: string): number | null {
  const m = /^-?(\d+)([dwh])$/.exec(v.replace(/^-/, '-'))
  if (m) return Date.now() - Number(m[1]) * (m[2] === 'w' ? 7 * 864e5 : m[2] === 'h' ? 36e5 : 864e5)
  const t = Date.parse(v)
  return isNaN(t) ? null : t
}

export function runJql(jql: string, issues: Issue[], sprints: Sprint[]): JqlResult {
  const src = jql.trim()
  if (!src) return { ok: true, rows: issues }
  const [where, order] = src.split(/\s+order\s+by\s+/i)
  const clauses = where.trim() ? where.split(/\s+and\s+/i) : []
  const tests: ((i: Issue) => boolean)[] = []
  for (const raw of clauses) {
    const c = raw.trim()
    const m = /^([a-z ]+?)\s*(!=|>=|<=|=|~|!~|>|<|\bnot in\b|\bin\b|\bis not\b|\bis\b)\s*(.+)$/i.exec(c)
    if (!m) return { ok: false, error: `Error in the JQL query: unable to parse “${c}”.` }
    const field = FIELD_ALIASES[m[1].trim().toLowerCase()]
    if (!field) return { ok: false, error: `Field '${m[1].trim()}' does not exist or you do not have permission to view it.` }
    const op = m[2].toLowerCase()
    let val = m[3].trim()
    const list = /^\(.*\)$/.test(val) ? val.slice(1, -1).split(',').map((x) => x.trim().replace(/^["']|["']$/g, '').toLowerCase()) : null
    val = val.replace(/^["']|["']$/g, '').toLowerCase()
    const eq = (a: string) => (list ? list.includes(a.toLowerCase()) : a.toLowerCase() === val)
    let t: (i: Issue) => boolean
    const neg = op === '!=' || op === 'not in' || op === 'is not' || op === '!~'
    switch (field) {
      case 'project': t = () => val === 'ops' || val === 'operations platform' || !!list?.includes('ops'); break
      case 'type': t = (i) => eq(i.type); break
      case 'status': t = (i) => eq(i.status); break
      case 'priority': t = (i) => eq(i.priority); break
      case 'key': t = (i) => eq(i.key); break
      case 'assignee': t = (i) => (list ? list.some((v) => personMatch(v, i.assignee)) : personMatch(val, i.assignee)); break
      case 'reporter': t = (i) => (list ? list.some((v) => personMatch(v, i.reporter)) : personMatch(val, i.reporter)); break
      case 'labels': t = (i) => (val === 'empty' ? !i.labels.length : i.labels.some((l) => eq(l))); break
      case 'epic': t = (i) => (val === 'empty' ? !i.epic : !!i.epic && (eq(i.epic) || i.epic.toLowerCase().includes(val))); break
      case 'points': {
        const n = Number(val)
        t = (i) => (op === '>' ? (i.points ?? 0) > n : op === '<' ? (i.points ?? 0) < n : op === '>=' ? (i.points ?? 0) >= n : op === '<=' ? (i.points ?? 0) <= n : (i.points ?? -1) === n)
        break
      }
      case 'sprint':
        t = (i) => {
          if (val === 'opensprints()') return !!sprints.find((s) => s.id === i.sprintId && s.state !== 'closed')
          if (val === 'closedsprints()') return !!sprints.find((s) => s.id === i.sprintId && s.state === 'closed')
          if (val === 'empty') return !i.sprintId
          const s = sprints.find((x) => x.id === i.sprintId)
          return !!s && (eq(s.name) || s.name.toLowerCase().endsWith(' ' + val))
        }
        break
      case 'created':
      case 'updated': {
        const at = relDate(val)
        if (at === null) return { ok: false, error: `Date value '${m[3]}' for field '${field}' is invalid. Use e.g. -7d or 2025-01-31.` }
        t = (i) => {
          const v = +new Date(field === 'created' ? i.created : i.updated)
          return op === '<' || op === '<=' ? v <= at : v >= at
        }
        break
      }
      default: {
        // text ~ "foo"
        const hay = (i: Issue) => (field === 'summary' ? i.summary : field === 'description' ? i.description : `${i.summary} ${i.description} ${i.comments.map((c) => c.body).join(' ')} ${i.key}`).toLowerCase()
        t = (i) => hay(i).includes(val)
      }
    }
    tests.push(neg && !['created', 'updated', 'points'].includes(field) ? (i) => !t(i) : t)
  }
  let rows = issues.filter((i) => tests.every((t) => t(i)))
  if (order) {
    const [f, dir] = order.trim().split(/\s+/)
    const k = f.toLowerCase()
    const desc = (dir ?? '').toLowerCase() === 'desc'
    const pr = (p: string) => PRIORITIES.indexOf(p)
    const val = (i: Issue): any =>
      k === 'priority' ? -pr(i.priority) : k === 'created' ? +new Date(i.created) : k === 'updated' ? +new Date(i.updated) : k === 'key' || k === 'rank' ? Number(i.key.split('-')[1]) : k === 'status' ? COLS.indexOf(i.status) : k === 'assignee' ? person(i.assignee).name : (i as any)[k] ?? ''
    rows = [...rows].sort((a, b) => {
      const x = val(a)
      const y = val(b)
      return (x < y ? -1 : x > y ? 1 : 0) * (desc ? -1 : 1)
    })
  }
  return { ok: true, rows }
}

export const sortIssues = (rows: Issue[]) => [...rows].sort((a, b) => Number(a.key.split('-')[1]) - Number(b.key.split('-')[1]))
