import { useState } from 'react'
import { Search, Plus, Pencil, Trash2, ChevronRight, ThumbsUp, Eye, Users, Building2 } from 'lucide-react'
import { db, useCollection, useRecord } from '@/db/db'
import { ME, person } from '@/data/people'
import { type Ticket, type Macro, type CustomView, STATUS, waiting, ago, Badge, ReqAvatar, ZModal, zBtn, zPrimary, zInput, useZFlash, AGENTS, GROUPS, RichText } from './shared'
import { ViewEditor } from './Views'

/* ─────────────────────────── Home ─────────────────────────── */

export function HomePage({ onOpen, onView }: { onOpen: (id: string) => void; onView: (v: string) => void }) {
  const tickets = useCollection<Ticket>('zendesk.tickets')
  const [tab, setTab] = useState<'mine' | 'group' | 'all'>('mine')
  const unsolved = tickets.filter((t) => !['solved', 'closed'].includes(t.status))
  const stats: [string, string | number, string][] = [['Open tickets (current)', unsolved.length, 'all-unsolved'], ['Waiting > 24h', tickets.filter(waiting).length, 'waiting'], ['Solved this week', tickets.filter((t) => t.status === 'solved').length, 'solved'], ['Good / bad rating', '94%', '']]
  const updates = [...tickets]
    .filter((t) => (tab === 'mine' ? t.assignee === ME.id || t.followers?.includes(ME.id) : tab === 'group' ? ['Support', 'Billing'].includes(t.group) : true))
    .sort((a, b) => +new Date(b.updated) - +new Date(a.updated))
    .slice(0, 10)
  return (
    <div className="flex-1 overflow-auto bg-white px-8 py-6" data-agent="zd-home">
      <div className="grid grid-cols-4 gap-4 mb-6">
        {stats.map(([k, v, view]) => (
          <button key={k} disabled={!view} onClick={() => view && onView(view)} className="text-left rounded-[8px] border border-[#D8DCDE] p-4 hover:border-[#1F73B7] disabled:hover:border-[#D8DCDE]"><div className="text-[13px] text-[#68737D]">{k}</div><div className="text-[30px] font-semibold text-[#2F3941]">{v}</div></button>
        ))}
      </div>
      <div className="flex items-center gap-4 mb-2">
        <h2 className="text-[18px] font-semibold">Updates to your tickets</h2>
        <div className="flex gap-1 text-[13px]">
          {([['mine', 'Your tickets'], ['group', 'Your groups'], ['all', 'All']] as const).map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`h-7 px-3 rounded-full ${tab === k ? 'bg-[#2F3941] text-white' : 'hover:bg-[#F8F9F9] text-[#68737D]'}`}>{l}</button>)}
        </div>
      </div>
      {updates.map((t) => (
        <button key={t.id} onClick={() => onOpen(t.id)} className="w-full text-left flex items-center gap-3 py-2.5 border-b border-[#E9EBED] text-[14px] hover:bg-[#F8F9F9]">
          <Badge s={t.status} small /><span className="text-[#68737D] w-[64px]">#{t.number}</span><span className="font-semibold truncate">{t.subject}</span><span className="text-[#68737D] truncate">{t.requester.name}</span><span className="text-[#68737D] ml-auto whitespace-nowrap">{ago(t.updated)}</span>
        </button>
      ))}
      {!updates.length && <div className="py-10 text-center text-[#68737D] text-[14px]">No recent updates.</div>}
    </div>
  )
}

/* ─────────────────────────── Customers / Organizations ─────────────────────────── */

export function PeoplePage({ kind, onOpenCustomer, onOpenOrg }: { kind: 'customers' | 'orgs'; onOpenCustomer: (email: string) => void; onOpenOrg: (org: string) => void }) {
  const tickets = useCollection<Ticket>('zendesk.tickets')
  const [q, setQ] = useState('')
  const allMine = tickets.filter((t) => t.assignee === ME.id && !['solved', 'closed'].includes(t.status)).length
  const rows = Array.from(new Map(tickets.map((t) => [kind === 'orgs' ? t.requester.org : t.requester.email, t])).values()).filter((t) => !q || (t.requester.name + ' ' + t.requester.email + ' ' + t.requester.org).toLowerCase().includes(q.toLowerCase()))
  return (
    <div className="flex-1 overflow-auto bg-white px-8 py-6">
      <div className="flex items-center gap-3 mb-4">
        <h1 className="text-[22px] font-semibold text-[#2F3941] flex-1">{kind === 'customers' ? 'Customers' : 'Organizations'}</h1>
        <div className="relative"><Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#68737D]" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${kind === 'customers' ? 'customers' : 'organizations'}`} aria-label="Search" className="h-8 w-[260px] pl-8 pr-2 rounded-[4px] border border-[#C2C8CC] text-[14px] outline-none focus:border-[#1F73B7]" /></div>
      </div>
      <table className="w-full text-[14px] text-[#2F3941]">
        <thead><tr className="h-10 border-b border-[#D8DCDE] text-left text-[13px] text-[#68737D]"><th>Name</th><th>{kind === 'orgs' ? 'Domain' : 'Email'}</th><th>Organization</th><th>Tickets</th><th>Last updated</th></tr></thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.id} className="h-11 border-b border-[#E9EBED] hover:bg-[#EDF7FF] cursor-pointer" onClick={() => (kind === 'orgs' ? onOpenOrg(t.requester.org) : onOpenCustomer(t.requester.email))}>
              <td><span className="inline-flex items-center gap-2"><ReqAvatar name={t.requester.name} size={24} />{kind === 'orgs' ? t.requester.org : t.requester.name}</span></td>
              <td className="text-[#1F73B7]">{kind === 'orgs' ? t.requester.email.split('@')[1] : t.requester.email}</td>
              <td>{t.requester.org}</td>
              <td>{tickets.filter((x) => (kind === 'orgs' ? x.requester.org === t.requester.org : x.requester.email === t.requester.email)).length}</td>
              <td className="text-[#68737D]">{ago(t.updated)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="text-[13px] text-[#68737D] mt-3">{allMine} tickets assigned to you</div>
    </div>
  )
}

export function CustomerProfile({ email, org, onOpen, onBack, onOpenCustomer }: { email?: string; org?: string; onOpen: (id: string) => void; onBack: () => void; onOpenCustomer: (email: string) => void }) {
  const tickets = useCollection<Ticket>('zendesk.tickets')
  const user = useRecord<{ id: string; notes?: string; details?: string }>('zendesk.users', email ?? `org:${org}`)
  const mine = tickets.filter((t) => (email ? t.requester.email === email : t.requester.org === org)).sort((a, b) => +new Date(b.updated) - +new Date(a.updated))
  const who = mine[0]?.requester
  const members = org ? Array.from(new Map(mine.map((t) => [t.requester.email, t.requester])).values()) : []
  if (!who) return <div className="p-10 text-[#68737D]">Not found</div>
  return (
    <div className="flex-1 min-h-0 flex" data-agent="zd-profile">
      <div className="w-[300px] shrink-0 border-r border-[#D8DCDE] bg-[#F8F9F9] px-5 py-5 overflow-auto">
        <button onClick={onBack} className="text-[13px] text-[#1F73B7] hover:underline mb-3">← Back</button>
        <div className="flex items-center gap-3">
          {org ? <span className="w-12 h-12 rounded-[8px] bg-[#03363D] text-white flex items-center justify-center"><Building2 size={22} /></span> : <ReqAvatar name={who.name} size={48} />}
          <div className="min-w-0"><div className="text-[18px] font-semibold truncate">{org ?? who.name}</div><div className="text-[13px] text-[#68737D] truncate">{org ? who.email.split('@')[1] : who.org}</div></div>
        </div>
        <div className="mt-4 space-y-2 text-[13px]">
          {(org ? [['Domain', who.email.split('@')[1]], ['Members', String(members.length)], ['Tickets', String(mine.length)]] : [['Email', who.email], ['Organization', who.org], ['Role', 'End user'], ['Language', 'English (United States)'], ['Tickets', String(mine.length)]]).map(([k, v]) => <div key={k} className="flex"><span className="w-[100px] text-[#68737D]">{k}</span><span className="truncate">{v}</span></div>)}
        </div>
        <div className="mt-4 text-[13px] font-semibold mb-1">Notes</div>
        <textarea key={email ?? org} defaultValue={user?.notes ?? ''} onBlur={(e) => db.upsert('zendesk.users', { id: email ?? `org:${org}`, notes: e.target.value })} rows={4} placeholder="Add notes" className="w-full px-2 py-1.5 rounded-[4px] border border-[#C2C8CC] text-[13px] outline-none focus:border-[#1F73B7] resize-none bg-white" aria-label="Notes" />
        {org && (
          <>
            <div className="mt-4 text-[13px] font-semibold mb-1">Users</div>
            {members.map((m) => <button key={m.email} onClick={() => onOpenCustomer(m.email)} className="w-full flex items-center gap-2 py-1 text-[13px] text-left hover:underline"><ReqAvatar name={m.name} size={20} />{m.name}</button>)}
          </>
        )}
      </div>
      <div className="flex-1 min-w-0 overflow-auto px-8 py-6">
        <h2 className="text-[18px] font-semibold mb-3">Tickets ({mine.length})</h2>
        <table className="w-full text-[14px]">
          <thead><tr className="h-10 border-b border-[#D8DCDE] text-left text-[13px] text-[#68737D]"><th>Status</th><th>ID</th><th>Subject</th>{org && <th>Requester</th>}<th>Requested</th><th>Updated</th><th>Assignee</th></tr></thead>
          <tbody>
            {mine.map((t) => (
              <tr key={t.id} onClick={() => onOpen(t.id)} className="h-11 border-b border-[#E9EBED] hover:bg-[#EDF7FF] cursor-pointer">
                <td><Badge s={t.status} small /></td><td className="text-[#68737D]">#{t.number}</td><td className="font-semibold max-w-[320px] truncate">{t.subject}</td>{org && <td>{t.requester.name}</td>}<td className="text-[#68737D]">{ago(t.created)}</td><td className="text-[#68737D]">{ago(t.updated)}</td><td>{t.assignee ? person(t.assignee).name : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ─────────────────────────── Reporting (Explore) ─────────────────────────── */

export function ReportingPage({ onView }: { onView: (v: string) => void }) {
  const tickets = useCollection<Ticket>('zendesk.tickets')
  const days = Array.from({ length: 14 }, (_, n) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - 13 + n); return d })
  const created = days.map((d) => tickets.filter((t) => new Date(t.created).toDateString() === d.toDateString()).length)
  const solved = days.map((d) => tickets.filter((t) => ['solved', 'closed'].includes(t.status) && new Date(t.updated).toDateString() === d.toDateString()).length)
  const peak = Math.max(1, ...created, ...solved)
  const firstReply = tickets.map((t) => { const c = t.comments.find((x) => x.author !== 'requester' && x.public); return c ? (+new Date(c.date) - +new Date(t.created)) / 3600e3 : null }).filter((x): x is number => x !== null && x >= 0)
  const avgFr = firstReply.length ? firstReply.reduce((a, b) => a + b, 0) / firstReply.length : 0
  const bar = (rows: [string, number, string?][], view?: (k: string) => string) => {
    const m = Math.max(1, ...rows.map((r) => r[1]))
    return rows.map(([k, n, c]) => (
      <button key={k} onClick={() => view && onView(view(k))} className="w-full flex items-center gap-3 mb-2 text-[13px] text-left">
        <span className="w-[110px] truncate capitalize">{k}</span>
        <span className="flex-1 h-4 rounded-[3px] bg-[#E9EBED] overflow-hidden"><span className="block h-full" style={{ width: `${(n / m) * 100}%`, background: c ?? '#1F73B7' }} /></span>
        <span className="w-8 text-right font-semibold">{n}</span>
      </button>
    ))
  }
  return (
    <div className="flex-1 overflow-auto bg-[#F8F9F9] px-8 py-6" data-agent="zd-reporting">
      <div className="text-[13px] text-[#68737D]">Explore</div>
      <h1 className="text-[22px] font-semibold text-[#2F3941] mb-4">Support overview</h1>
      <div className="grid grid-cols-4 gap-4 mb-4">
        {[['Tickets created (14d)', created.reduce((a, b) => a + b, 0)], ['Tickets solved (14d)', solved.reduce((a, b) => a + b, 0)], ['Avg first reply time', `${avgFr.toFixed(1)} h`], ['SLA breaches (open)', tickets.filter(waiting).length]].map(([k, v]) => <div key={k as string} className="rounded-[8px] border border-[#D8DCDE] bg-white p-4"><div className="text-[13px] text-[#68737D]">{k}</div><div className="text-[28px] font-semibold">{v}</div></div>)}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-[8px] border border-[#D8DCDE] bg-white p-4">
          <div className="text-[15px] font-semibold mb-3">Created vs solved</div>
          <div className="flex items-end gap-1.5 h-[140px]">
            {days.map((d, n) => (
              <div key={n} className="flex-1 flex flex-col items-center gap-1" title={`${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: ${created[n]} created, ${solved[n]} solved`}>
                <div className="w-full flex items-end justify-center gap-[2px] h-[120px]"><span className="w-[45%] bg-[#1F73B7] rounded-t-[2px]" style={{ height: `${(created[n] / peak) * 100}%` }} /><span className="w-[45%] bg-[#038153] rounded-t-[2px]" style={{ height: `${(solved[n] / peak) * 100}%` }} /></div>
                <span className="text-[10px] text-[#87929D]">{d.getDate()}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-4 mt-2 text-[12px] text-[#68737D]"><span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-[#1F73B7]" /> Created</span><span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-[#038153]" /> Solved</span></div>
        </div>
        <div className="rounded-[8px] border border-[#D8DCDE] bg-white p-4">
          <div className="text-[15px] font-semibold mb-3">Tickets by status</div>
          {bar(Object.entries(STATUS).map(([k, s]) => [s.label, tickets.filter((t) => t.status === k).length, s.bg]), (k) => (k === 'Pending' ? 'pending' : k === 'Solved' ? 'solved' : 'all-unsolved'))}
        </div>
        <div className="rounded-[8px] border border-[#D8DCDE] bg-white p-4">
          <div className="text-[15px] font-semibold mb-3">Unsolved by group</div>
          {bar(GROUPS.map((g) => [g, tickets.filter((t) => t.group === g && !['solved', 'closed'].includes(t.status)).length]), (k) => (k === 'Billing' ? 'billing' : 'all-unsolved'))}
        </div>
        <div className="rounded-[8px] border border-[#D8DCDE] bg-white p-4">
          <div className="text-[15px] font-semibold mb-3">Tickets by channel</div>
          {bar(['email', 'web', 'chat', 'phone'].map((c) => [c, tickets.filter((t) => t.channel === c).length]))}
        </div>
        <div className="rounded-[8px] border border-[#D8DCDE] bg-white p-4 col-span-2">
          <div className="text-[15px] font-semibold mb-3">Agent activity</div>
          <table className="w-full text-[13px]">
            <thead><tr className="text-left text-[#68737D] border-b border-[#E9EBED]"><th className="py-1.5">Agent</th><th>Assigned unsolved</th><th>Public replies</th><th>Internal notes</th><th>Solved</th></tr></thead>
            <tbody>{AGENTS.map((a) => <tr key={a} className="border-b border-[#F3F4F5]"><td className="py-1.5"><span className="flex items-center gap-2"><ReqAvatar name={a} size={20} />{person(a).name}</span></td><td>{tickets.filter((t) => t.assignee === a && !['solved', 'closed'].includes(t.status)).length}</td><td>{tickets.reduce((n, t) => n + t.comments.filter((c) => c.author === a && c.public).length, 0)}</td><td>{tickets.reduce((n, t) => n + t.comments.filter((c) => c.author === a && !c.public).length, 0)}</td><td>{tickets.filter((t) => t.assignee === a && t.status === 'solved').length}</td></tr>)}</tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────── Admin Center ─────────────────────────── */

function MacroEditor({ macro, onClose }: { macro?: Macro; onClose: () => void }) {
  const flash = useZFlash()
  const [m, setM] = useState<Macro>(macro ?? { id: `mac-${Date.now().toString(36)}`, title: '', body: 'Hi {{first_name}},\n\n', status: '', tags: [], category: 'General' })
  const [tags, setTags] = useState((macro?.tags ?? []).join(' '))
  return (
    <ZModal
      title={macro ? 'Edit macro' : 'Create macro'}
      onClose={onClose}
      width={620}
      agent="zd-macro-editor"
      footer={<><button className={zBtn} onClick={onClose}>Cancel</button><button className={zPrimary} disabled={!m.title.trim()} onClick={() => { db.upsert('zendesk.macros', { ...m, title: m.title.trim(), status: m.status || undefined, tags: tags.split(/[,\s]+/).map((x) => x.trim()).filter(Boolean) }); flash(macro ? 'Macro updated' : 'Macro created'); onClose() }}>Save</button></>}
    >
      <div className="text-[13px] font-semibold mb-1">Macro name</div>
      <input autoFocus value={m.title} onChange={(e) => setM({ ...m, title: e.target.value, category: e.target.value.includes('::') ? e.target.value.split('::')[0] : m.category })} className={zInput} placeholder="Category::Name" aria-label="Macro name" />
      <div className="text-[12px] text-[#68737D] mt-1">Use “::” to group macros, e.g. Billing::Refund issued</div>
      <div className="text-[13px] font-semibold mb-1 mt-4">Actions</div>
      <div className="grid grid-cols-2 gap-3 text-[12px] text-[#68737D]">
        <label>Set status<select value={m.status ?? ''} onChange={(e) => setM({ ...m, status: e.target.value })} className={zInput}><option value="">– Don’t change –</option>{['open', 'pending', 'hold', 'solved'].map((s) => <option key={s} value={s}>{STATUS[s].label}</option>)}</select></label>
        <label>Add tags<input value={tags} onChange={(e) => setTags(e.target.value)} className={zInput} placeholder="tag1 tag2" /></label>
      </div>
      <div className="text-[13px] font-semibold mb-1 mt-4">Comment</div>
      <textarea value={m.body} onChange={(e) => setM({ ...m, body: e.target.value })} rows={7} className="w-full px-2.5 py-2 rounded-[4px] border border-[#C2C8CC] text-[14px] outline-none focus:border-[#1F73B7]" aria-label="Comment" />
      <div className="text-[12px] text-[#68737D] mt-1">Placeholders: {'{{first_name}}'}</div>
    </ZModal>
  )
}

export function AdminPage({ initialTab = 'macros' }: { initialTab?: 'macros' | 'views' | 'team' }) {
  const flash = useZFlash()
  const macros = useCollection<Macro>('zendesk.macros')
  const views = useCollection<CustomView>('zendesk.views')
  const tickets = useCollection<Ticket>('zendesk.tickets')
  const [tab, setTab] = useState(initialTab)
  const [edit, setEdit] = useState<Macro | null | 'new'>(null)
  const [viewEdit, setViewEdit] = useState<CustomView | null | 'new'>(null)
  const [q, setQ] = useState('')
  return (
    <div className="flex-1 min-h-0 flex" data-agent="zd-admin">
      <div className="w-[240px] shrink-0 border-r border-[#D8DCDE] bg-[#F8F9F9] px-3 py-5">
        <div className="px-2 text-[12px] font-semibold uppercase text-[#68737D] mb-2">Admin Center</div>
        {([['macros', 'Macros'], ['views', 'Views'], ['team', 'Team members & groups']] as const).map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`w-full text-left h-9 px-3 rounded-[4px] text-[14px] ${tab === k ? 'bg-[#D8DCDE]/70 font-semibold' : 'hover:bg-[#E9EBED]'}`}>{l}</button>)}
      </div>
      <div className="flex-1 min-w-0 overflow-auto px-8 py-6">
        {tab === 'macros' && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <h1 className="text-[22px] font-semibold flex-1">Macros</h1>
              <div className="relative"><Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#68737D]" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search macros" aria-label="Search macros" className="h-8 w-[220px] pl-8 pr-2 rounded-[4px] border border-[#C2C8CC] text-[14px] outline-none focus:border-[#1F73B7]" /></div>
              <button data-agent="zd-macro-create" className={zPrimary + ' flex items-center gap-1.5'} onClick={() => setEdit('new')}><Plus size={14} /> Create macro</button>
            </div>
            <table className="w-full text-[14px]">
              <thead><tr className="h-10 border-b border-[#D8DCDE] text-left text-[13px] text-[#68737D]"><th>Title</th><th>Sets status</th><th>Adds tags</th><th className="w-[90px]" /></tr></thead>
              <tbody>
                {macros.filter((m) => !q || m.title.toLowerCase().includes(q.toLowerCase())).map((m) => (
                  <tr key={m.id} className="h-11 border-b border-[#E9EBED] group">
                    <td>{m.title.split('::').map((p, i, a) => <span key={i} className={i < a.length - 1 ? 'text-[#68737D]' : 'font-semibold'}>{p}{i < a.length - 1 ? ' › ' : ''}</span>)}</td>
                    <td>{m.status ? <Badge s={m.status} small /> : '-'}</td>
                    <td className="text-[13px]">{m.tags?.join(', ') || '-'}</td>
                    <td className="text-right">
                      <button aria-label={`Edit ${m.title}`} onClick={() => setEdit(m)} className="w-8 h-8 rounded hover:bg-[#F8F9F9] inline-flex items-center justify-center text-[#68737D]"><Pencil size={14} /></button>
                      <button aria-label={`Delete ${m.title}`} onClick={() => { db.remove('zendesk.macros', m.id); flash(`Macro “${m.title}” deleted`) }} className="w-8 h-8 rounded hover:bg-[#FFF0F1] inline-flex items-center justify-center text-[#68737D] hover:text-[#CC3340]"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
        {tab === 'views' && (
          <>
            <div className="flex items-center gap-3 mb-4"><h1 className="text-[22px] font-semibold flex-1">Views</h1><button className={zPrimary + ' flex items-center gap-1.5'} onClick={() => setViewEdit('new')}><Plus size={14} /> Add view</button></div>
            <div className="text-[13px] text-[#68737D] mb-3">8 shared system views plus your personal views.</div>
            <table className="w-full text-[14px]">
              <thead><tr className="h-10 border-b border-[#D8DCDE] text-left text-[13px] text-[#68737D]"><th>Title</th><th>Conditions</th><th>Owner</th><th className="w-[90px]" /></tr></thead>
              <tbody>
                {views.map((v) => (
                  <tr key={v.id} className="h-11 border-b border-[#E9EBED]">
                    <td className="font-semibold">{v.name}</td>
                    <td className="text-[13px] text-[#68737D]">{[v.statuses.length ? `Status: ${v.statuses.map((s) => STATUS[s].label).join(', ')}` : '', v.group && `Group: ${v.group}`, v.assignee && `Assignee: ${v.assignee === 'me' ? 'Current user' : 'Unassigned'}`, v.priority && `Priority: ${v.priority}`, v.tag && `Tags contain: ${v.tag}`].filter(Boolean).join(' · ')}</td>
                    <td>{person(v.owner).name}</td>
                    <td className="text-right">
                      <button aria-label={`Edit ${v.name}`} onClick={() => setViewEdit(v)} className="w-8 h-8 rounded hover:bg-[#F8F9F9] inline-flex items-center justify-center text-[#68737D]"><Pencil size={14} /></button>
                      <button aria-label={`Delete ${v.name}`} onClick={() => { db.remove('zendesk.views', v.id); flash('View deleted') }} className="w-8 h-8 rounded hover:bg-[#FFF0F1] inline-flex items-center justify-center text-[#68737D] hover:text-[#CC3340]"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
                {!views.length && <tr><td colSpan={4} className="py-8 text-center text-[#68737D]">No personal views yet.</td></tr>}
              </tbody>
            </table>
          </>
        )}
        {tab === 'team' && (
          <>
            <h1 className="text-[22px] font-semibold mb-4">Team members & groups</h1>
            <div className="grid grid-cols-3 gap-4 mb-6">
              {GROUPS.map((g) => <div key={g} className="rounded-[8px] border border-[#D8DCDE] p-4"><div className="font-semibold flex items-center gap-2"><Users size={15} /> {g}</div><div className="text-[13px] text-[#68737D] mt-1">{tickets.filter((t) => t.group === g && !['solved', 'closed'].includes(t.status)).length} unsolved tickets</div></div>)}
            </div>
            <table className="w-full text-[14px]">
              <thead><tr className="h-10 border-b border-[#D8DCDE] text-left text-[13px] text-[#68737D]"><th>Name</th><th>Email</th><th>Role</th><th>Assigned unsolved</th></tr></thead>
              <tbody>{AGENTS.map((a) => <tr key={a} className="h-11 border-b border-[#E9EBED]"><td><span className="flex items-center gap-2"><ReqAvatar name={a} size={24} />{person(a).name}</span></td><td className="text-[13px]">{person(a).email}</td><td>{a === 'aisha' ? 'Admin' : 'Agent'}</td><td>{tickets.filter((t) => t.assignee === a && !['solved', 'closed'].includes(t.status)).length}</td></tr>)}</tbody>
            </table>
          </>
        )}
      </div>
      {edit && <MacroEditor macro={edit === 'new' ? undefined : edit} onClose={() => setEdit(null)} />}
      {viewEdit && <ViewEditor view={viewEdit === 'new' ? undefined : viewEdit} onClose={() => setViewEdit(null)} />}
    </div>
  )
}

/* ─────────────────────────── Guide (Help Center) ─────────────────────────── */

export function GuidePage() {
  const articles = useCollection<any>('zendesk.articles')
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const [voted, setVoted] = useState<Set<string>>(new Set())
  const a = articles.find((x) => x.id === open)
  const sections = Array.from(new Set(articles.map((x) => x.section)))
  if (a)
    return (
      <div className="flex-1 overflow-auto bg-white px-10 py-6" data-agent="zd-guide-article">
        <div className="text-[13px] text-[#68737D] flex items-center gap-1 mb-3"><button onClick={() => setOpen(null)} className="text-[#1F73B7] hover:underline">Help Center</button><ChevronRight size={13} />{a.section}</div>
        <h1 className="text-[26px] font-semibold text-[#2F3941]">{a.title}</h1>
        <div className="text-[13px] text-[#68737D] mt-1 flex items-center gap-3"><span>{person(a.author).name}</span><span>Updated {ago(a.updated)}</span><span className="flex items-center gap-1"><Eye size={13} /> {a.views.toLocaleString()}</span></div>
        <div className="mt-5 text-[15px] leading-[1.7] text-[#2F3941] whitespace-pre-wrap max-w-[760px]"><RichText text={a.body} /></div>
        <div className="mt-8 flex items-center gap-3 text-[14px]">Was this article helpful?<button aria-pressed={voted.has(a.id)} onClick={() => { if (!voted.has(a.id)) { db.update('zendesk.articles', a.id, { votes: a.votes + 1 }); setVoted(new Set([...voted, a.id])) } }} className={`${zBtn} flex items-center gap-1.5 ${voted.has(a.id) ? 'border-[#1F73B7] text-[#1F73B7]' : ''}`}><ThumbsUp size={14} /> Yes ({a.votes})</button></div>
      </div>
    )
  const hits = articles.filter((x) => !q || (x.title + ' ' + x.body).toLowerCase().includes(q.toLowerCase()))
  return (
    <div className="flex-1 overflow-auto bg-white" data-agent="zd-guide">
      <div className="bg-[#03363D] px-10 py-8 text-white">
        <h1 className="text-[26px] font-semibold mb-3">Northwind Help Center</h1>
        <div className="relative max-w-[560px]"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#68737D]" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search articles" aria-label="Search articles" className="w-full h-10 pl-9 pr-3 rounded-[6px] text-[15px] text-[#2F3941] outline-none" /></div>
      </div>
      <div className="px-10 py-6 grid grid-cols-2 gap-6">
        {sections.map((s) => (
          <div key={s}>
            <div className="text-[16px] font-semibold mb-2">{s}</div>
            {hits.filter((x) => x.section === s).map((x) => <button key={x.id} onClick={() => { setOpen(x.id); db.update('zendesk.articles', x.id, { views: x.views + 1 }) }} className="block text-left text-[14px] text-[#1F73B7] hover:underline py-1">{x.title}</button>)}
            {!hits.some((x) => x.section === s) && <div className="text-[13px] text-[#68737D]">No matching articles</div>}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─────────────────────────── Search ─────────────────────────── */

export function SearchPage({ initial, onOpen, onCustomer }: { initial: string; onOpen: (id: string) => void; onCustomer: (email: string) => void }) {
  const tickets = useCollection<Ticket>('zendesk.tickets')
  const [q, setQ] = useState(initial)
  const [tab, setTab] = useState<'tickets' | 'users'>('tickets')
  const ql = q.trim().toLowerCase().replace(/^#/, '')
  const tHits = ql ? tickets.filter((t) => String(t.number).includes(ql) || (t.subject + ' ' + t.requester.name + ' ' + t.requester.email + ' ' + t.tags.join(' ') + ' ' + t.comments.map((c) => c.body).join(' ')).toLowerCase().includes(ql)) : []
  const users = ql ? Array.from(new Map(tickets.filter((t) => (t.requester.name + ' ' + t.requester.email + ' ' + t.requester.org).toLowerCase().includes(ql)).map((t) => [t.requester.email, t.requester])).values()) : []
  return (
    <div className="flex-1 overflow-auto bg-white px-8 py-6" data-agent="zd-search">
      <div className="relative max-w-[640px] mb-4"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#68737D]" /><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tickets, users and organizations" aria-label="Search Zendesk" className="w-full h-10 pl-9 pr-3 rounded-[6px] border border-[#C2C8CC] text-[15px] outline-none focus:border-[#1F73B7]" /></div>
      <div className="flex gap-1 mb-3 border-b border-[#D8DCDE]">
        {([['tickets', `Tickets (${tHits.length})`], ['users', `Users (${users.length})`]] as const).map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`h-9 px-3 text-[14px] -mb-px border-b-2 ${tab === k ? 'border-[#1F73B7] text-[#1F73B7] font-semibold' : 'border-transparent text-[#68737D]'}`}>{l}</button>)}
      </div>
      {tab === 'tickets'
        ? tHits.map((t) => (
            <button key={t.id} onClick={() => onOpen(t.id)} className="w-full text-left flex items-center gap-3 py-2.5 border-b border-[#E9EBED] hover:bg-[#F8F9F9] text-[14px]">
              <Badge s={t.status} small /><span className="text-[#68737D] w-[64px]">#{t.number}</span><span className="font-semibold truncate flex-1">{t.subject}</span><span className="text-[#68737D]">{t.requester.name}</span><span className="text-[#68737D] w-[110px] text-right">{ago(t.updated)}</span>
            </button>
          ))
        : users.map((u) => (
            <button key={u.email} onClick={() => onCustomer(u.email)} className="w-full text-left flex items-center gap-3 py-2.5 border-b border-[#E9EBED] hover:bg-[#F8F9F9] text-[14px]"><ReqAvatar name={u.name} size={28} /><span className="font-semibold">{u.name}</span><span className="text-[#68737D]">{u.email}</span><span className="text-[#68737D] ml-auto">{u.org}</span></button>
          ))}
      {ql && !(tab === 'tickets' ? tHits : users).length && <div className="py-12 text-center text-[#68737D]">No results for “{q}”.</div>}
      {!ql && <div className="py-12 text-center text-[#68737D]">Type to search by ticket number, subject, requester, tag or comment text.</div>}
    </div>
  )
}

void zInput
