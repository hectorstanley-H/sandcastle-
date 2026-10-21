import { useMemo, useState } from 'react'
import { ChevronDown, ChevronLeft, Clock, Folder, Mail, Phone, Plus, Search, SquareCheck, Trash2, X } from 'lucide-react'
import { db, uid, useCollection, useRecord } from '@/db/db'
import { useDesk } from '@/os/context'
import { ME, person } from '@/data/people'
import { HBtn, HLink, HWTag, Initials, hsDate, inputH, useHNav } from './ui'

const PROPS: Record<string, { label: string; values: (cs: any[]) => string[] }> = {
  webinarStatus: { label: 'Webinar attendance status', values: () => ['Attended', 'Registered'] },
  lifecycleStage: { label: 'Lifecycle stage', values: () => ['Subscriber', 'Lead', 'Marketing Qualified Lead', 'Sales Qualified Lead', 'Opportunity', 'Customer'] },
  leadStatus: { label: 'Lead status', values: () => ['New', 'Open', 'In Progress', 'Attempted to contact', 'Connected'] },
  country: { label: 'Country/Region', values: (cs) => Array.from(new Set(cs.map((c) => c.country))) },
}
export type ListFilter = { prop: string; op: 'is any of' | 'is none of'; value: string }
export const matchFilters = (c: any, fs: ListFilter[]) => fs.every((f) => (f.op === 'is any of' ? c[f.prop] === f.value : c[f.prop] !== f.value))

const th = 'text-left text-[12px] font-semibold uppercase tracking-wide px-3 h-10 border-b border-[#DFE3EB] bg-[#F5F8FA] whitespace-nowrap'
const td = 'px-3 h-12 border-b border-[#DFE3EB] text-[13.5px] whitespace-nowrap'

function PageTitle({ title, right, sub }: { title: string; right?: React.ReactNode; sub?: string }) {
  return (
    <div className="bg-white border-b border-[#DFE3EB] px-6 pt-5 pb-4 flex items-center gap-3">
      <div className="flex-1">
        <h1 className="text-[22px] font-medium">{title}</h1>
        {sub && <div className="text-[13px] text-[#516F90] mt-0.5">{sub}</div>}
      </div>
      {right}
    </div>
  )
}

export function ListsIndex() {
  const { go } = useHNav()
  const lists = useCollection<any>('hubspot.lists')
  return (
    <div className="min-h-full bg-white">
      <PageTitle title="Lists" right={<><HBtn variant="ghost" small>Import</HBtn><HBtn variant="primary" small agent="hs-create-list" onClick={() => go({ page: 'list-new' })}>Create list</HBtn></>} />
      <div className="flex">
        <div className="w-[220px] shrink-0 border-r border-[#DFE3EB] py-3 text-[13.5px]">
          {['All lists', 'Unused lists', 'Recently deleted'].map((x, i) => <div key={x} className={`px-5 py-2 ${i === 0 ? 'bg-[#EAF0F6] font-semibold border-l-[3px] border-[#33475B]' : ''}`}>{x}</div>)}
          <div className="px-5 pt-4 pb-1 text-[12px] font-semibold uppercase text-[#516F90]">Folders</div>
          {['Events', 'Lifecycle', 'Newsletters', 'Web'].map((f) => <div key={f} className="px-5 py-1.5 flex items-center gap-2"><Folder size={14} className="text-[#7C98B6]" /> {f}</div>)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 px-6 py-3">
            <div className="flex items-center h-8 w-[260px] border border-[#CBD6E2] rounded-[3px] px-2 gap-1.5"><input placeholder="Search lists" className="flex-1 outline-none text-[13px]" /><Search size={14} className="text-[#7C98B6]" /></div>
            {['Creator', 'Type', 'Object', 'Folder'].map((f) => <button key={f} className="h-8 px-2 text-[13px] font-medium flex items-center gap-1">{f} <ChevronDown size={13} /></button>)}
          </div>
          <table className="w-full border-collapse">
            <thead><tr>{['Name', 'Size', 'Type', 'Object', 'Last updated', 'Creator', 'Folder', 'Used in'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
            <tbody>
              {[...lists].sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)).map((l) => (
                <tr key={l.id} className={`hover:bg-[#F5F8FA] ${l.createdBy === 'hworker' ? 'flash-new' : ''}`}>
                  <td className={td}><span className="flex items-center gap-2"><HLink agent={`hs-list-row-${l.id}`} onClick={() => go({ page: 'list', id: l.id })}>{l.name}</HLink>{l.createdBy === 'hworker' && <HWTag />}</span></td>
                  <td className={td}>{l.contactIds.length}</td>
                  <td className={td}><span className="px-2 py-0.5 rounded-[3px] bg-[#EAF0F6] text-[12px]">{l.type === 'Active' ? 'Active' : 'Static'}</span></td>
                  <td className={td}>{l.objectType}</td>
                  <td className={td}>{hsDate(l.updatedAt, true)}</td>
                  <td className={td}>{person(l.ownerId).name}</td>
                  <td className={td}>{l.folder ?? '--'}</td>
                  <td className={td}>{l.usedIn ?? (l.id.length % 3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export function ListBuilder() {
  const { go } = useHNav()
  const { isAgent } = useDesk()
  const contacts = useCollection<any>('hubspot.contacts')
  const [name, setName] = useState('')
  const [filters, setFilters] = useState<ListFilter[]>([])
  const matches = useMemo(() => contacts.filter((c) => matchFilters(c, filters)), [contacts, filters])
  const setF = (i: number, patch: Partial<ListFilter>) => setFilters(filters.map((f, j) => (j === i ? { ...f, ...patch, ...(patch.prop ? { value: PROPS[patch.prop].values(contacts)[0] } : {}) } : f)))
  const save = () => {
    const id = uid('lst')
    db.insert('hubspot.lists', {
      id,
      name: name || 'Untitled list',
      type: 'Active',
      objectType: 'Contacts',
      contactIds: matches.map((c) => c.id),
      filters: filters.map((f) => `${PROPS[f.prop].label} ${f.op} ${f.value}`).join(' AND '),
      filterDefs: filters,
      ownerId: ME.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      folder: 'Events',
      createdBy: isAgent ? 'hworker' : undefined,
    })
    go({ page: 'list', id })
  }
  return (
    <div className="min-h-full flex flex-col bg-white">
      <div className="h-14 bg-[#213343] text-white flex items-center px-6 gap-4">
        <button onClick={() => go({ page: 'lists' })} className="flex items-center gap-1 text-[14px]"><ChevronLeft size={16} /> Back</button>
        <input data-agent="hs-list-name" aria-label="List name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Unnamed list" className="flex-1 h-9 bg-transparent border-b border-dashed border-[#7C98B6] outline-none text-[17px] font-medium placeholder:text-[#CBD6E2]" />
        <span className="text-[13px] text-[#CBD6E2]">Active list · Contacts</span>
        <HBtn variant="primary" small agent="hs-list-save" onClick={save}>Save list</HBtn>
      </div>
      <div className="flex-1 flex min-h-0">
        <div className="w-[440px] shrink-0 border-r border-[#DFE3EB] p-5 bg-[#F5F8FA]">
          <div className="text-[16px] font-semibold mb-1">Filters</div>
          <div className="text-[13px] text-[#516F90] mb-4">Contacts that match all of these filters will be in this list and kept up to date.</div>
          <div className="space-y-3">
            {filters.map((f, i) => (
              <div key={i}>
                {i > 0 && <div className="text-[12px] font-semibold text-[#516F90] my-2 pl-2">AND</div>}
                <div className="bg-white border border-[#CBD6E2] rounded-[4px] p-3 space-y-2 relative">
                  <button className="absolute top-2 right-2 text-[#7C98B6]" onClick={() => setFilters(filters.filter((_, j) => j !== i))}><Trash2 size={14} /></button>
                  <select data-agent={`hs-filter-prop-${i}`} aria-label="Property" value={f.prop} onChange={(e) => setF(i, { prop: e.target.value })} className={`${inputH} w-[85%]`}>
                    {Object.entries(PROPS).map(([k, p]) => <option key={k} value={k}>{p.label}</option>)}
                  </select>
                  <div className="flex gap-2">
                    <select data-agent={`hs-filter-op-${i}`} aria-label="Operator" value={f.op} onChange={(e) => setF(i, { op: e.target.value as any })} className={`${inputH} w-[140px]`}>
                      <option>is any of</option>
                      <option>is none of</option>
                    </select>
                    <select data-agent={`hs-filter-value-${i}`} aria-label="Value" value={f.value} onChange={(e) => setF(i, { value: e.target.value })} className={`${inputH} flex-1`}>
                      {PROPS[f.prop].values(contacts).map((v) => <option key={v}>{v}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            ))}
            <button data-agent="hs-list-add-filter" onClick={() => setFilters([...filters, { prop: 'webinarStatus', op: 'is any of', value: 'Attended' }])} className="h-9 px-3 rounded-[3px] border border-dashed border-[#7C98B6] text-[13.5px] text-[#0091AE] font-medium flex items-center gap-1.5 bg-white w-full justify-center">
              <Plus size={14} /> {filters.length ? 'Add filter (AND)' : 'Add filter'}
            </button>
          </div>
        </div>
        <div className="flex-1 min-w-0 p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[16px] font-semibold" data-agent="hs-list-preview-count">{filters.length ? `${matches.length} records` : 'Add a filter to see matching records'}</span>
          </div>
          {filters.length > 0 && (
            <table className="w-full border-collapse border border-[#DFE3EB]">
              <thead><tr>{['Name', 'Email', 'Company', 'Lifecycle stage', 'Webinar'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
              <tbody>{matches.map((c) => <tr key={c.id}><td className={td}><span className="flex items-center gap-2"><Initials name={`${c.firstName} ${c.lastName}`} size={24} /><HLink>{c.firstName} {c.lastName}</HLink></span></td><td className={td}>{c.email}</td><td className={td}>{c.company}</td><td className={td}>{c.lifecycleStage}</td><td className={td}>{c.webinarStatus ?? '--'}</td></tr>)}</tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

export function ListDetail({ id }: { id: string }) {
  const { go } = useHNav()
  const l = useRecord<any>('hubspot.lists', id)
  const contacts = useCollection<any>('hubspot.contacts')
  if (!l) return <div className="p-8">List not found</div>
  const members = contacts.filter((c) => l.contactIds.includes(c.id))
  return (
    <div className="min-h-full bg-white">
      <div className="bg-white border-b border-[#DFE3EB] px-6 pt-4 pb-4">
        <HLink onClick={() => go({ page: 'lists' })} className="text-[13px]"><span className="inline-flex items-center gap-1"><ChevronLeft size={14} /> Lists</span></HLink>
        <div className="flex items-center gap-3 mt-2">
          <h1 className="text-[22px] font-medium" data-agent="hs-list-title">{l.name}</h1>
          <span className="px-2 py-0.5 rounded-[3px] bg-[#EAF0F6] text-[12px]">{l.type} list</span>
          {l.createdBy === 'hworker' && <HWTag text="Created by H-Worker" />}
          <div className="flex-1" />
          <HBtn variant="ghost" small>Actions <ChevronDown size={13} /></HBtn>
          <HBtn variant="secondary" small>Edit filters</HBtn>
        </div>
        <div className="flex gap-8 mt-3 text-[13px]">
          <div><div className="text-[#516F90] text-[12px]">LIST SIZE</div><div className="text-[18px] font-semibold">{members.length}</div></div>
          <div><div className="text-[#516F90] text-[12px]">FILTERS</div><div className="max-w-[640px]">{l.filters}</div></div>
          <div><div className="text-[#516F90] text-[12px]">LAST UPDATED</div><div>{hsDate(l.updatedAt, true)}</div></div>
        </div>
      </div>
      <table className="w-full border-collapse">
        <thead><tr>{['Name', 'Email', 'Company', 'Lifecycle stage', 'Lead status', 'Contact owner', 'Sequences'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
        <tbody>{members.map((c) => <tr key={c.id} className="hover:bg-[#F5F8FA]"><td className={td}><span className="flex items-center gap-2"><Initials name={`${c.firstName} ${c.lastName}`} size={24} /><HLink onClick={() => go({ page: 'contact', id: c.id })}>{c.firstName} {c.lastName}</HLink></span></td><td className={td}>{c.email}</td><td className={td}>{c.company}</td><td className={td}>{c.lifecycleStage}</td><td className={td}>{c.leadStatus}</td><td className={td}>{person(c.ownerId).name}</td><td className={td}>{c.sequences?.length ? <span className="text-[#00A38D] font-medium">Enrolled ({c.sequences.length})</span> : '--'}</td></tr>)}</tbody>
      </table>
    </div>
  )
}

const stepIcon = { email: Mail, task: SquareCheck, call: Phone } as Record<string, any>

export function SequencesIndex() {
  const { go } = useHNav()
  const seqs = useCollection<any>('hubspot.sequences')
  return (
    <div className="min-h-full bg-white">
      <PageTitle title="Sequences" sub="Send a series of targeted, timed email templates and create tasks to follow up." right={<><HBtn variant="ghost" small>Manage</HBtn><HBtn variant="primary" small>Create sequence</HBtn></>} />
      <div className="flex gap-6 px-6 border-b border-[#DFE3EB] text-[14px]">
        {['Sequences', 'Scheduled', 'Analyze', 'Manage'].map((t, i) => <button key={t} className={`h-11 relative ${i === 0 ? 'font-semibold' : 'text-[#516F90]'}`}>{t}{i === 0 && <span className="absolute left-0 right-0 bottom-0 h-[3px] bg-[#33475B]" />}</button>)}
      </div>
      <table className="w-full border-collapse">
        <thead><tr>{['Name', 'Steps', 'Total enrolled', 'Active', 'Reply rate', 'Meeting rate', 'Owner', 'Created'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
        <tbody>
          {seqs.map((s) => {
            const active = s.enrolled.filter((e: any) => e.status === 'Active').length
            return (
              <tr key={s.id} className="hover:bg-[#F5F8FA]">
                <td className={td}><span className="flex items-center gap-2"><HLink agent={`hs-seq-row-${s.id}`} onClick={() => go({ page: 'sequence', id: s.id })}>{s.name}</HLink>{s.enrolled.some((e: any) => e.by === 'hworker') && <HWTag />}</span></td>
                <td className={td}>{s.steps.length}</td>
                <td className={td}>{s.enrolled.length}</td>
                <td className={td}>{active}</td>
                <td className={td}>{s.stats.replyRate}%</td>
                <td className={td}>{s.enrolled.length ? Math.round((s.stats.meetings / Math.max(1, s.stats.sent / s.steps.length)) * 100) : 0}%</td>
                <td className={td}>{person(s.ownerId).name}</td>
                <td className={td}>{hsDate(s.createdAt)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function SequenceDetail({ id }: { id: string }) {
  const { go } = useHNav()
  const { isAgent } = useDesk()
  const s = useRecord<any>('hubspot.sequences', id)
  const lists = useCollection<any>('hubspot.lists')
  const contacts = useCollection<any>('hubspot.contacts')
  const [tab, setTab] = useState('Steps')
  const [enroll, setEnroll] = useState(false)
  const [listId, setListId] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  if (!s) return <div className="p-8">Sequence not found</div>
  const enrolledIds = new Set(s.enrolled.map((e: any) => e.contactId))
  const selList = lists.find((l) => l.id === listId)
  const candidates = selList ? contacts.filter((c) => selList.contactIds.includes(c.id) && !enrolledIds.has(c.id)) : []
  const doEnroll = () => {
    const at = new Date().toISOString()
    const by = isAgent ? 'hworker' : 'alex'
    db.update('hubspot.sequences', id, (r) => ({ enrolled: [...candidates.map((c) => ({ contactId: c.id, at, by, status: 'Active', step: 1 })), ...r.enrolled] }))
    for (const c of candidates)
      db.update('hubspot.contacts', c.id, (r) => ({
        sequences: [...(r.sequences ?? []), id],
        leadStatus: 'In Progress',
        updatedBy: isAgent ? 'hworker' : undefined,
        lastActivity: at,
        events: [{ type: 'sequence', title: `Enrolled in sequence: ${s.name}`, body: `By ${ME.name} · Sending from ${ME.email} · Step 1 of ${s.steps.length} scheduled for tomorrow 9:00 AM`, date: at, by: isAgent ? 'hworker' : undefined }, ...r.events],
      }))
    setEnroll(false)
    setTab('Enrollments')
    setToast(`${candidates.length} contacts enrolled in “${s.name}”.`)
    setTimeout(() => setToast(null), 4000)
  }
  return (
    <div className="min-h-full bg-white relative">
      {toast && <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 px-5 py-3 rounded-[4px] bg-[#00BDA5] text-white text-[14px] font-medium shadow-lg" data-agent="hs-toast">{toast}</div>}
      <div className="px-6 pt-4 pb-3 border-b border-[#DFE3EB]">
        <HLink onClick={() => go({ page: 'sequences' })} className="text-[13px]"><span className="inline-flex items-center gap-1"><ChevronLeft size={14} /> Sequences</span></HLink>
        <div className="flex items-center gap-3 mt-2">
          <h1 className="text-[22px] font-medium flex-1">{s.name}</h1>
          <HBtn variant="ghost" small>Actions <ChevronDown size={13} /></HBtn>
          <HBtn variant="secondary" small>Edit</HBtn>
          <HBtn variant="primary" small agent="hs-seq-enroll" onClick={() => setEnroll(true)}>Enroll</HBtn>
        </div>
        <div className="flex gap-8 mt-3 text-[13px]">
          {[['ENROLLED', s.enrolled.length], ['ACTIVE', s.enrolled.filter((e: any) => e.status === 'Active').length], ['OPEN RATE', `${s.stats.openRate}%`], ['REPLY RATE', `${s.stats.replyRate}%`], ['MEETINGS BOOKED', s.stats.meetings]].map(([k, v]) => (
            <div key={k as string}><div className="text-[12px] text-[#516F90]">{k}</div><div className="text-[18px] font-semibold" data-agent={k === 'ENROLLED' ? 'hs-seq-enrolled-count' : undefined}>{v}</div></div>
          ))}
        </div>
      </div>
      <div className="flex gap-6 px-6 border-b border-[#DFE3EB] text-[14px]">
        {['Steps', 'Enrollments', 'Performance', 'Settings'].map((t) => (
          <button key={t} data-agent={`hs-seq-tab-${t.toLowerCase()}`} onClick={() => setTab(t)} className={`h-11 relative ${tab === t ? 'font-semibold' : 'text-[#516F90]'}`}>{t}{tab === t && <span className="absolute left-0 right-0 bottom-0 h-[3px] bg-[#33475B]" />}</button>
        ))}
      </div>
      {tab === 'Steps' && (
        <div className="max-w-[760px] mx-auto py-6">
          {s.steps.map((st: any, i: number) => {
            const I = stepIcon[st.type]
            return (
              <div key={i}>
                {i > 0 && <div className="flex items-center gap-2 pl-[22px] py-2 text-[12.5px] text-[#516F90]"><span className="w-px h-6 bg-[#CBD6E2]" /><Clock size={13} /> Wait {st.day - s.steps[i - 1].day} business days</div>}
                <div className="border border-[#CBD6E2] rounded-[4px] bg-white">
                  <div className="flex items-center gap-3 px-4 h-11 bg-[#F5F8FA] border-b border-[#DFE3EB] text-[13.5px] font-semibold">
                    <span className="w-6 h-6 rounded-full bg-[#33475B] text-white text-[12px] flex items-center justify-center">{i + 1}</span>
                    <I size={15} /> {st.type === 'email' ? (i === 0 ? 'Automated email' : 'Automated email (thread reply)') : st.type === 'task' ? 'Task' : 'Call task'}
                    <span className="ml-auto text-[12px] font-normal text-[#516F90]">Day {st.day}</span>
                  </div>
                  <div className="px-4 py-3 text-[14px]">{st.subject}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}
      {tab === 'Enrollments' && (
        <table className="w-full border-collapse">
          <thead><tr>{['Contact', 'Company', 'Enrolled by', 'Enrolled', 'Current step', 'Status'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
          <tbody>
            {s.enrolled.map((e: any) => {
              const c = contacts.find((x) => x.id === e.contactId)
              if (!c) return null
              return (
                <tr key={e.contactId} className={e.by === 'hworker' ? 'flash-new' : ''}>
                  <td className={td}><span className="flex items-center gap-2"><Initials name={`${c.firstName} ${c.lastName}`} size={24} /><HLink onClick={() => go({ page: 'contact', id: c.id })}>{c.firstName} {c.lastName}</HLink></span></td>
                  <td className={td}>{c.company}</td>
                  <td className={td}><span className="flex items-center gap-1.5">{e.by === 'hworker' ? <><span>Alex Morgan</span><HWTag /></> : person(e.by).name}</span></td>
                  <td className={td}>{hsDate(e.at, true)}</td>
                  <td className={td}>Step {e.step ?? s.steps.length} of {s.steps.length}</td>
                  <td className={td}><span className={`px-2 py-0.5 rounded-[3px] text-[12px] ${e.status === 'Active' ? 'bg-[#E5F8F6] text-[#00A38D]' : 'bg-[#EAF0F6]'}`}>{e.status}</span></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
      {(tab === 'Performance' || tab === 'Settings') && <div className="p-10 text-center text-[#516F90]">{tab === 'Performance' ? `${s.stats.sent} emails sent · ${s.stats.openRate}% opened · ${s.stats.replyRate}% replied` : 'Send emails on business days only · Unenroll contacts when they reply or book a meeting.'}</div>}
      {enroll && (
        <div className="absolute inset-0 z-50 bg-[#213343]/60 flex items-start justify-center pt-12" data-agent="hs-enroll-modal">
          <div className="w-[720px] bg-white rounded-[4px] shadow-2xl overflow-hidden">
            <div className="h-14 bg-gradient-to-r from-[#00BDA5] to-[#00A4BD] text-white flex items-center px-6 text-[18px] font-medium">
              Enroll in sequence <button className="ml-auto" onClick={() => setEnroll(false)} aria-label="Close"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4 text-[14px]">
              <div className="text-[13px] text-[#516F90]">Sequence: <b className="text-[#33475B]">{s.name}</b></div>
              <div>
                <label className="block text-[13px] font-semibold mb-1">Send from</label>
                <select className={`${inputH} w-full`}><option>{ME.name} ({ME.email})</option></select>
              </div>
              <div>
                <label className="block text-[13px] font-semibold mb-1">Add contacts from a list</label>
                <select data-agent="hs-enroll-list" aria-label="Contact list" value={listId} onChange={(e) => setListId(e.target.value)} className={`${inputH} w-full`}>
                  <option value="">Select a list</option>
                  {lists.map((l) => <option key={l.id} value={l.id}>{l.name} ({l.contactIds.length})</option>)}
                </select>
              </div>
              {selList && (
                <div className="border border-[#DFE3EB] rounded-[4px] max-h-[220px] overflow-auto">
                  {candidates.map((c) => (
                    <div key={c.id} className="flex items-center gap-3 px-3 h-10 border-b border-[#DFE3EB] last:border-0">
                      <input type="checkbox" checked readOnly className="accent-[#FF5C35]" />
                      <Initials name={`${c.firstName} ${c.lastName}`} size={22} />
                      <span className="flex-1">{c.firstName} {c.lastName} <span className="text-[#516F90] text-[12.5px]">· {c.email}</span></span>
                      <span className="text-[12px] text-[#516F90]">{c.company}</span>
                    </div>
                  ))}
                  {!candidates.length && <div className="p-4 text-[13px] text-[#516F90]">Everyone on this list is already enrolled.</div>}
                </div>
              )}
              <div className="flex items-center gap-2 text-[13px] text-[#516F90]"><Clock size={14} /> Step 1 sends tomorrow at 9:00 AM in each contact’s time zone</div>
            </div>
            <div className="px-6 py-4 border-t border-[#DFE3EB] flex gap-2">
              <HBtn variant="primary" small agent="hs-enroll-confirm" disabled={!candidates.length} onClick={doEnroll}>Enroll {candidates.length || ''} contacts</HBtn>
              <HBtn variant="secondary" small onClick={() => setEnroll(false)}>Cancel</HBtn>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function EmailsIndex() {
  const rows = [
    ['AI-Powered Ops Summit — recording + slides', 'Sent', 452, 58.2, 9.4],
    ['October product newsletter', 'Sent', 6120, 41.7, 4.1],
    ['Webinar reminder: tomorrow 11am ET', 'Sent', 438, 63.0, 12.8],
    ['Q4 Manufacturing ABM — touch 2', 'Scheduled', 1840, 0, 0],
    ['Customer Advisory Board invite', 'Draft', 0, 0, 0],
  ]
  return (
    <div className="min-h-full bg-white">
      <PageTitle title="Marketing Email" right={<><HBtn variant="ghost" small>Analyze</HBtn><HBtn variant="primary" small>Create email</HBtn></>} />
      <table className="w-full border-collapse">
        <thead><tr>{['Name', 'Status', 'Recipients', 'Open rate', 'Click rate', 'Last updated'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
        <tbody>{rows.map(([n, s, r, o, c], i) => <tr key={n as string}><td className={td}><span className="flex items-center gap-2"><Mail size={15} className="text-[#7C98B6]" /><HLink>{n}</HLink></span></td><td className={td}>{s}</td><td className={td}>{Number(r).toLocaleString()}</td><td className={td}>{o}%</td><td className={td}>{c}%</td><td className={td}>{hsDate(new Date(Date.now() - i * 3 * 86400000).toISOString())}</td></tr>)}</tbody>
      </table>
    </div>
  )
}
