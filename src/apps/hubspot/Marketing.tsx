import { useMemo, useState } from 'react'
import { ChevronDown, ChevronLeft, Clock, Folder, Mail, Phone, Plus, Search, SquareCheck, Trash2, X } from 'lucide-react'
import { db, uid, useCollection, useRecord } from '@/db/db'
import { useDesk } from '@/os/context'
import { ME, person } from '@/data/people'
import { Field, HBtn, HLink, HWTag, Initials, Modal, hsDate, inputH, useHNav } from './ui'
import { OWNERS } from './owners'
import { csvDownload } from './store'

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

const usedIn = (l: any) => l.usedIn ?? (l.id.length % 3)

/** small dropdown used by list/sequence pages */
function Menu({ label, items, agent, variant = 'ghost', active }: { label: React.ReactNode; items: [string, () => void][]; agent?: string; variant?: 'ghost' | 'plain'; active?: boolean }) {
  const [o, setO] = useState(false)
  return (
    <div className="relative">
      {variant === 'ghost' ? (
        <HBtn variant="ghost" small agent={agent} onClick={() => setO(!o)}>{label}</HBtn>
      ) : (
        <button data-agent={agent} onClick={() => setO(!o)} className={`h-8 px-2 text-[13px] font-medium flex items-center gap-1 rounded-[3px] ${active ? 'bg-[#EAF0F6] text-[#0091AE]' : ''}`}>{label}</button>
      )}
      {o && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setO(false)} />
          <div className="absolute left-0 top-9 z-40 min-w-[200px] bg-white border border-[#CBD6E2] rounded shadow-lg py-1">
            {items.map(([l, fn]) => <button key={l} onClick={() => { setO(false); fn() }} className="w-full text-left px-3 h-9 text-[13.5px] text-[#33475B] hover:bg-[#F5F8FA] whitespace-nowrap">{l}</button>)}
          </div>
        </>
      )}
    </div>
  )
}

function ImportListModal({ onClose }: { onClose: () => void }) {
  const { go, toast } = useHNav()
  const { isAgent } = useDesk()
  const contacts = useCollection<any>('hubspot.contacts')
  const [name, setName] = useState('Imported contacts')
  const [text, setText] = useState('')
  const emails = text.split(/[\s,;]+/).map((x) => x.trim().toLowerCase()).filter(Boolean)
  const matched = contacts.filter((c) => emails.includes(String(c.email).toLowerCase()))
  const save = () => {
    const id = uid('lst')
    const at = new Date().toISOString()
    db.insert('hubspot.lists', { id, name, type: 'Static', objectType: 'Contacts', contactIds: matched.map((c) => c.id), filters: `Imported ${matched.length} of ${emails.length} rows`, ownerId: ME.id, createdAt: at, updatedAt: at, folder: 'Web', createdBy: isAgent ? 'hworker' : undefined })
    toast(`Static list created with ${matched.length} contacts.`)
    onClose()
    go({ page: 'list', id })
  }
  return (
    <Modal title="Import a static list" onClose={onClose} width={560} agent="hs-list-import-modal" footer={<><HBtn variant="primary" small agent="hs-list-import-save" disabled={!matched.length} onClick={save}>Create list ({matched.length})</HBtn><HBtn small onClick={onClose}>Cancel</HBtn></>}>
      <Field label="List name"><input data-agent="hs-list-import-name" value={name} onChange={(e) => setName(e.target.value)} className={`${inputH} w-full`} /></Field>
      <Field label="Email addresses" hint="Paste one email per line (or comma separated). Rows are matched to existing contacts."><textarea data-agent="hs-list-import-emails" rows={6} value={text} onChange={(e) => setText(e.target.value)} className={`${inputH} h-auto py-2 w-full`} /></Field>
      <div className="text-[13px] text-[#516F90]">{emails.length} rows · {matched.length} matched to contacts</div>
    </Modal>
  )
}

export function ListsIndex() {
  const { go, open, toast } = useHNav()
  const lists = useCollection<any>('hubspot.lists')
  const deleted = useCollection<any>('hubspot.deletedLists')
  const [q, setQ] = useState('')
  const [view, setView] = useState('All lists')
  const [flt, setFlt] = useState<Record<string, string>>({})
  const setFilter = (k: string, v: string) => setFlt((f) => ({ ...f, [k]: v }))
  const shown = (view === 'Recently deleted' ? deleted : lists)
    .filter((l) => view !== 'Unused lists' || usedIn(l) === 0)
    .filter((l) => !q || l.name.toLowerCase().includes(q.toLowerCase()))
    .filter((l) => (!flt.Creator || l.ownerId === flt.Creator) && (!flt.Type || l.type === flt.Type) && (!flt.Object || l.objectType === flt.Object) && (!flt.Folder || l.folder === flt.Folder))
  const opts: Record<string, [string, string][]> = {
    Creator: OWNERS.map((o) => [o.name, o.id]),
    Type: [['Active', 'Active'], ['Static', 'Static']],
    Object: [['Contacts', 'Contacts'], ['Companies', 'Companies']],
    Folder: ['Events', 'Lifecycle', 'Newsletters', 'Web'].map((f) => [f, f]),
  }
  const restore = (l: any) => {
    const { deletedAt: _d, ...rest } = l
    db.insert('hubspot.lists', { ...rest, updatedAt: new Date().toISOString() })
    db.remove('hubspot.deletedLists', l.id)
    toast(`“${l.name}” restored.`)
  }
  return (
    <div className="min-h-full bg-white">
      <PageTitle title="Lists" right={<><HBtn variant="ghost" small agent="hs-list-import" onClick={() => open(<ImportListModal onClose={() => open(null)} />)}>Import</HBtn><HBtn variant="primary" small agent="hs-create-list" onClick={() => go({ page: 'list-new' })}>Create list</HBtn></>} />
      <div className="flex">
        <div className="w-[220px] shrink-0 border-r border-[#DFE3EB] py-3 text-[13.5px]">
          {['All lists', 'Unused lists', 'Recently deleted'].map((x) => <button key={x} data-agent={`hs-lists-view-${x.toLowerCase().replace(/\s+/g, '-')}`} onClick={() => { setView(x); setFilter('Folder', '') }} className={`w-full text-left px-5 py-2 ${view === x && !flt.Folder ? 'bg-[#EAF0F6] font-semibold border-l-[3px] border-[#33475B]' : 'hover:bg-[#F5F8FA]'}`}>{x}</button>)}
          <div className="px-5 pt-4 pb-1 text-[12px] font-semibold uppercase text-[#516F90]">Folders</div>
          {['Events', 'Lifecycle', 'Newsletters', 'Web'].map((f) => <button key={f} data-agent={`hs-lists-folder-${f.toLowerCase()}`} onClick={() => { setView('All lists'); setFilter('Folder', flt.Folder === f ? '' : f) }} className={`w-full text-left px-5 py-1.5 flex items-center gap-2 ${flt.Folder === f ? 'bg-[#EAF0F6] font-semibold' : 'hover:bg-[#F5F8FA]'}`}><Folder size={14} className="text-[#7C98B6]" /> {f}</button>)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 px-6 py-3">
            <div className="flex items-center h-8 w-[260px] border border-[#CBD6E2] rounded-[3px] px-2 gap-1.5"><input data-agent="hs-lists-search" aria-label="Search lists" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search lists" className="flex-1 outline-none text-[13px]" /><Search size={14} className="text-[#7C98B6]" /></div>
            {['Creator', 'Type', 'Object', 'Folder'].map((f) => <Menu key={f} variant="plain" active={!!flt[f]} agent={`hs-lists-filter-${f.toLowerCase()}`} label={<>{f} <ChevronDown size={13} /></>} items={[['All', () => setFilter(f, '')], ...opts[f].map(([l, v]) => [l, () => setFilter(f, v)] as [string, () => void])]} />)}
            {Object.entries(flt).filter(([, v]) => v).map(([k2, v]) => <span key={k2} className="h-6 px-2 rounded-full bg-[#EAF0F6] text-[12px] flex items-center gap-1">{k2}: {k2 === 'Creator' ? person(v).name : v}<button aria-label={`Clear ${k2}`} onClick={() => setFilter(k2, '')}><X size={11} /></button></span>)}
          </div>
          <table className="w-full border-collapse">
            <thead><tr>{['Name', 'Size', 'Type', 'Object', 'Last updated', 'Creator', 'Folder', view === 'Recently deleted' ? 'Deleted' : 'Used in'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
            <tbody>
              {view === 'Recently deleted' && !shown.length && <tr><td colSpan={8} className="px-6 py-10 text-center text-[13.5px] text-[#516F90]">No recently deleted lists.</td></tr>}
              {view === 'Recently deleted' && shown.map((l) => (
                <tr key={l.id} className="hover:bg-[#F5F8FA]">
                  <td className={td}>{l.name}</td><td className={td}>{l.contactIds.length}</td><td className={td}>{l.type}</td><td className={td}>{l.objectType}</td><td className={td}>{hsDate(l.updatedAt, true)}</td><td className={td}>{person(l.ownerId).name}</td><td className={td}>{l.folder ?? '--'}</td>
                  <td className={td}><span className="flex items-center gap-3">{hsDate(l.deletedAt)}<HLink agent={`hs-list-restore-${l.id}`} onClick={() => restore(l)}>Restore</HLink></span></td>
                </tr>
              ))}
              {view !== 'Recently deleted' && [...shown].sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)).map((l) => (
                <tr key={l.id} className={`hover:bg-[#F5F8FA] ${l.createdBy === 'hworker' ? 'flash-new' : ''}`}>
                  <td className={td}><span className="flex items-center gap-2"><HLink agent={`hs-list-row-${l.id}`} onClick={() => go({ page: 'list', id: l.id })}>{l.name}</HLink>{l.createdBy === 'hworker' && <HWTag />}</span></td>
                  <td className={td}>{l.contactIds.length}</td>
                  <td className={td}><span className="px-2 py-0.5 rounded-[3px] bg-[#EAF0F6] text-[12px]">{l.type === 'Active' ? 'Active' : 'Static'}</span></td>
                  <td className={td}>{l.objectType}</td>
                  <td className={td}>{hsDate(l.updatedAt, true)}</td>
                  <td className={td}>{person(l.ownerId).name}</td>
                  <td className={td}>{l.folder ?? '--'}</td>
                  <td className={td}>{usedIn(l)}</td>
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
  const { go, open } = useHNav()
  const preview = (c: any) =>
    open(
      <Modal title={`${c.firstName} ${c.lastName}`} onClose={() => open(null)} width={460} agent="hs-list-preview-contact">
        <div className="grid grid-cols-[130px_1fr] gap-y-2 text-[13.5px]">
          {[['Email', c.email], ['Company', c.company], ['Job title', c.jobTitle], ['Lifecycle stage', c.lifecycleStage], ['Lead status', c.leadStatus], ['Webinar', c.webinarStatus ?? '--'], ['Owner', person(c.ownerId).name]].map(([k2, v]) => <div key={k2} className="contents"><span className="text-[#516F90]">{k2}</span><span>{v}</span></div>)}
        </div>
      </Modal>,
    )
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
              <tbody>{matches.map((c) => <tr key={c.id}><td className={td}><span className="flex items-center gap-2"><Initials name={`${c.firstName} ${c.lastName}`} size={24} /><HLink onClick={() => preview(c)}>{c.firstName} {c.lastName}</HLink></span></td><td className={td}>{c.email}</td><td className={td}>{c.company}</td><td className={td}>{c.lifecycleStage}</td><td className={td}>{c.webinarStatus ?? '--'}</td></tr>)}</tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

export function ListDetail({ id }: { id: string }) {
  const { go, open, toast } = useHNav()
  const { isAgent } = useDesk()
  const l = useRecord<any>('hubspot.lists', id)
  const contacts = useCollection<any>('hubspot.contacts')
  if (!l) return <div className="p-8">List not found</div>
  const members = contacts.filter((c) => l.contactIds.includes(c.id))
  const actions: [string, () => void][] = [
    ['Rename', () => open(<RenameModal title="Rename list" value={l.name} onSave={(name) => { db.update('hubspot.lists', id, { name, updatedAt: new Date().toISOString() }); toast('List renamed.') }} />)],
    ['Clone', () => { const nid = uid('lst'); const at = new Date().toISOString(); db.insert('hubspot.lists', { ...l, id: nid, name: `${l.name} (clone)`, createdAt: at, updatedAt: at, ownerId: ME.id, createdBy: isAgent ? 'hworker' : undefined }); toast('List cloned.'); go({ page: 'list', id: nid }) }],
    ['Export', () => { csvDownload(`${l.name.replace(/[^\w]+/g, '_')}.csv`, members.map((c) => ({ 'First name': c.firstName, 'Last name': c.lastName, Email: c.email, Company: c.company, 'Lifecycle stage': c.lifecycleStage, 'Lead status': c.leadStatus }))); toast(`Exported ${members.length} contacts.`) }],
    ...(l.type === 'Active' ? [['Convert to static list', () => { db.update('hubspot.lists', id, { type: 'Static', updatedAt: new Date().toISOString() }); toast('List converted to static.') }] as [string, () => void]] : []),
    ['Delete', () => open(
      <Modal title="Delete list?" onClose={() => open(null)} width={460} footer={<><button data-agent="hs-list-delete-confirm" onClick={() => { db.insert('hubspot.deletedLists', { ...l, deletedAt: new Date().toISOString() }); db.remove('hubspot.lists', id); open(null); toast('List deleted. You can restore it from Recently deleted.'); go({ page: 'lists' }) }} className="h-8 px-3 rounded-[3px] bg-[#F2545B] border border-[#F2545B] text-white text-[13px] font-medium">Delete list</button><HBtn small onClick={() => open(null)}>Cancel</HBtn></>}>
        <div>“{l.name}” will be moved to Recently deleted. Contacts are not deleted.</div>
      </Modal>,
    )],
  ]
  return (
    <div className="min-h-full bg-white">
      <div className="bg-white border-b border-[#DFE3EB] px-6 pt-4 pb-4">
        <HLink onClick={() => go({ page: 'lists' })} className="text-[13px]"><span className="inline-flex items-center gap-1"><ChevronLeft size={14} /> Lists</span></HLink>
        <div className="flex items-center gap-3 mt-2">
          <h1 className="text-[22px] font-medium" data-agent="hs-list-title">{l.name}</h1>
          <span className="px-2 py-0.5 rounded-[3px] bg-[#EAF0F6] text-[12px]">{l.type} list</span>
          {l.createdBy === 'hworker' && <HWTag text="Created by H-Worker" />}
          <div className="flex-1" />
          <Menu agent="hs-list-actions" label={<>Actions <ChevronDown size={13} /></>} items={actions} />
          <HBtn variant="secondary" small agent="hs-list-edit-filters" onClick={() => open(<EditFiltersModal list={l} />)}>Edit filters</HBtn>
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
  const { go, open } = useHNav()
  const seqs = useCollection<any>('hubspot.sequences')
  const contacts = useCollection<any>('hubspot.contacts')
  const [tab, setTab] = useState('Sequences')
  return (
    <div className="min-h-full bg-white">
      <PageTitle title="Sequences" sub="Send a series of targeted, timed email templates and create tasks to follow up." right={<><HBtn variant="ghost" small agent="hs-seq-manage" onClick={() => setTab('Manage')}>Manage</HBtn><HBtn variant="primary" small agent="hs-seq-create" onClick={() => open(<SequenceModal />)}>Create sequence</HBtn></>} />
      <div className="flex gap-6 px-6 border-b border-[#DFE3EB] text-[14px]">
        {['Sequences', 'Scheduled', 'Analyze', 'Manage'].map((t) => <button key={t} data-agent={`hs-seqs-tab-${t.toLowerCase()}`} onClick={() => setTab(t)} className={`h-11 relative ${tab === t ? 'font-semibold' : 'text-[#516F90]'}`}>{t}{tab === t && <span className="absolute left-0 right-0 bottom-0 h-[3px] bg-[#33475B]" />}</button>)}
      </div>
      {tab === 'Scheduled' && <ScheduledSteps seqs={seqs} contacts={contacts} />}
      {tab === 'Analyze' && <AnalyzeSequences seqs={seqs} />}
      {tab === 'Manage' && <ManageSequences seqs={seqs} />}
      {tab === 'Sequences' && <table className="w-full border-collapse">
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
      </table>}
    </div>
  )
}

export function SequenceDetail({ id }: { id: string }) {
  const { go, open } = useHNav()
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
          <Menu agent="hs-seq-actions" label={<>Actions <ChevronDown size={13} /></>} items={[
            ['Clone', () => { const nid = uid('seq'); db.insert('hubspot.sequences', { ...s, id: nid, name: `${s.name} (clone)`, enrolled: [], stats: { sent: 0, openRate: 0, replyRate: 0, meetings: 0 }, ownerId: ME.id, createdAt: new Date().toISOString() }); go({ page: 'sequence', id: nid }) }],
            ['Export enrollments', () => csvDownload(`${s.name.replace(/[^\w]+/g, '_')}_enrollments.csv`, s.enrolled.map((e: any) => { const c = contacts.find((x) => x.id === e.contactId); return { Contact: c ? `${c.firstName} ${c.lastName}` : e.contactId, Email: c?.email ?? '', Enrolled: e.at, Status: e.status, Step: e.step ?? '' } }))],
            ['Unenroll all', () => { db.update('hubspot.sequences', id, (r) => ({ enrolled: r.enrolled.map((e: any) => (e.status === 'Active' ? { ...e, status: 'Unenrolled' } : e)) })); setToast('All active contacts were unenrolled.'); setTimeout(() => setToast(null), 4000) }],
          ]} />
          <HBtn variant="secondary" small agent="hs-seq-edit" onClick={() => open(<SequenceModal seq={s} />)}>Edit</HBtn>
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
  const { open } = useHNav()
  const mine = useCollection<any>('hubspot.marketingEmails')
  const [analyze, setAnalyze] = useState(false)
  const rows = [
    ['AI-Powered Ops Summit — recording + slides', 'Sent', 452, 58.2, 9.4],
    ['October product newsletter', 'Sent', 6120, 41.7, 4.1],
    ['Webinar reminder: tomorrow 11am ET', 'Sent', 438, 63.0, 12.8],
    ['Q4 Manufacturing ABM — touch 2', 'Scheduled', 1840, 0, 0],
    ['Customer Advisory Board invite', 'Draft', 0, 0, 0],
  ]
  return (
    <div className="min-h-full bg-white">
      <PageTitle title="Marketing Email" right={<><HBtn variant="ghost" small agent="hs-email-analyze" onClick={() => setAnalyze(!analyze)}>Analyze</HBtn><HBtn variant="primary" small agent="hs-email-create" onClick={() => open(<EmailModal />)}>Create email</HBtn></>} />
      {analyze && <EmailAnalytics rows={[...mine.map((m) => [m.name, m.status, m.recipients ?? 0, m.openRate ?? 0, m.clickRate ?? 0] as any[]), ...rows]} />}
      <table className="w-full border-collapse">
        <thead><tr>{['Name', 'Status', 'Recipients', 'Open rate', 'Click rate', 'Last updated'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
        <tbody>
        {mine.map((m) => <tr key={m.id} className={m.createdBy === 'hworker' ? 'flash-new' : ''}><td className={td}><span className="flex items-center gap-2"><Mail size={15} className="text-[#7C98B6]" /><HLink agent={`hs-email-row-${m.id}`} onClick={() => open(<EmailModal email={m} />)}>{m.name}</HLink></span></td><td className={td}>{m.status}</td><td className={td}>{Number(m.recipients ?? 0).toLocaleString()}</td><td className={td}>{m.openRate ?? 0}%</td><td className={td}>{m.clickRate ?? 0}%</td><td className={td}>{hsDate(m.updatedAt)}</td></tr>)}
        {rows.map(([n, s, r, o, c], i) => <tr key={n as string}><td className={td}><span className="flex items-center gap-2"><Mail size={15} className="text-[#7C98B6]" /><HLink onClick={() => open(<EmailStats name={n as string} status={s as string} recipients={r as number} open={o as number} click={c as number} />)}>{n}</HLink></span></td><td className={td}>{s}</td><td className={td}>{Number(r).toLocaleString()}</td><td className={td}>{o}%</td><td className={td}>{c}%</td><td className={td}>{hsDate(new Date(Date.now() - i * 3 * 86400000).toISOString())}</td></tr>)}
        </tbody>
      </table>
    </div>
  )
}

/* ───────────────────────── helpers for lists / sequences / emails ───────────────────────── */

function RenameModal({ title, value, onSave }: { title: string; value: string; onSave: (v: string) => void }) {
  const { open } = useHNav()
  const [v, setV] = useState(value)
  return (
    <Modal title={title} onClose={() => open(null)} width={460} agent="hs-rename-modal" footer={<><HBtn variant="primary" small agent="hs-rename-save" disabled={!v.trim()} onClick={() => { onSave(v.trim()); open(null) }}>Save</HBtn><HBtn small onClick={() => open(null)}>Cancel</HBtn></>}>
      <Field label="Name"><input data-agent="hs-rename-input" value={v} onChange={(e) => setV(e.target.value)} className={`${inputH} w-full`} /></Field>
    </Modal>
  )
}

function EditFiltersModal({ list }: { list: any }) {
  const { open, toast } = useHNav()
  const contacts = useCollection<any>('hubspot.contacts')
  const [filters, setFilters] = useState<ListFilter[]>(list.filterDefs ?? [])
  const matches = contacts.filter((c) => matchFilters(c, filters))
  const setF = (i: number, patch: Partial<ListFilter>) => setFilters(filters.map((f, j) => (j === i ? { ...f, ...patch, ...(patch.prop ? { value: PROPS[patch.prop].values(contacts)[0] } : {}) } : f)))
  const save = () => {
    db.update('hubspot.lists', list.id, { filterDefs: filters, filters: filters.length ? filters.map((f) => `${PROPS[f.prop].label} ${f.op} ${f.value}`).join(' AND ') : list.filters, contactIds: filters.length ? matches.map((c) => c.id) : list.contactIds, updatedAt: new Date().toISOString() })
    toast(`List updated — ${filters.length ? matches.length : list.contactIds.length} contacts.`)
    open(null)
  }
  return (
    <Modal title={`Edit filters — ${list.name}`} onClose={() => open(null)} width={620} agent="hs-list-filters-modal" footer={<><HBtn variant="primary" small agent="hs-list-filters-save" onClick={save}>Save filters</HBtn><HBtn small onClick={() => open(null)}>Cancel</HBtn></>}>
      {!list.filterDefs && <div className="text-[13px] text-[#516F90]">Current criteria: {list.filters}. Add filters below to replace them with editable filters.</div>}
      {filters.map((f, i) => (
        <div key={i} className="flex gap-2 items-center">
          {i > 0 && <span className="text-[12px] font-semibold text-[#516F90] w-8">AND</span>}
          <select aria-label="Property" value={f.prop} onChange={(e) => setF(i, { prop: e.target.value })} className={`${inputH} flex-1`}>{Object.entries(PROPS).map(([k, p]) => <option key={k} value={k}>{p.label}</option>)}</select>
          <select aria-label="Operator" value={f.op} onChange={(e) => setF(i, { op: e.target.value as any })} className={`${inputH} w-[130px]`}><option>is any of</option><option>is none of</option></select>
          <select aria-label="Value" value={f.value} onChange={(e) => setF(i, { value: e.target.value })} className={`${inputH} flex-1`}>{PROPS[f.prop].values(contacts).map((v) => <option key={v}>{v}</option>)}</select>
          <button aria-label="Remove filter" onClick={() => setFilters(filters.filter((_, j) => j !== i))} className="text-[#7C98B6]"><Trash2 size={14} /></button>
        </div>
      ))}
      <button data-agent="hs-list-filters-add" onClick={() => setFilters([...filters, { prop: 'lifecycleStage', op: 'is any of', value: 'Lead' }])} className="h-9 px-3 rounded-[3px] border border-dashed border-[#7C98B6] text-[13.5px] text-[#0091AE] font-medium flex items-center gap-1.5 w-full justify-center"><Plus size={14} /> Add filter</button>
      <div className="text-[13px] text-[#516F90]">{filters.length ? `${matches.length} contacts match` : `${list.contactIds.length} contacts (unchanged)`}</div>
    </Modal>
  )
}

type Step = { type: string; day: number; subject: string }

function SequenceModal({ seq }: { seq?: any }) {
  const { open, go, toast } = useHNav()
  const [name, setName] = useState(seq?.name ?? '')
  const [steps, setSteps] = useState<Step[]>(seq?.steps ?? [{ type: 'email', day: 1, subject: '' }])
  const setS = (i: number, p: Partial<Step>) => setSteps(steps.map((s, j) => (j === i ? { ...s, ...p } : s)))
  const save = () => {
    const clean = steps.map((s) => ({ ...s, day: Number(s.day) || 1, subject: s.subject || (s.type === 'email' ? 'Follow-up' : 'Task') })).sort((a, b) => a.day - b.day)
    if (seq) {
      db.update('hubspot.sequences', seq.id, { name, steps: clean })
      toast('Sequence saved.')
      open(null)
    } else {
      const id = uid('seq')
      db.insert('hubspot.sequences', { id, name, ownerId: ME.id, createdAt: new Date().toISOString(), steps: clean, enrolled: [], stats: { sent: 0, openRate: 0, replyRate: 0, meetings: 0 } })
      open(null)
      go({ page: 'sequence', id })
    }
  }
  return (
    <Modal title={seq ? 'Edit sequence' : 'Create sequence'} onClose={() => open(null)} width={640} agent="hs-seq-modal" footer={<><HBtn variant="primary" small agent="hs-seq-save" disabled={!name.trim() || !steps.length} onClick={save}>{seq ? 'Save' : 'Create'}</HBtn><HBtn small onClick={() => open(null)}>Cancel</HBtn></>}>
      <Field label="Sequence name"><input data-agent="hs-seq-name" value={name} onChange={(e) => setName(e.target.value)} className={`${inputH} w-full`} /></Field>
      <div className="text-[13px] font-semibold">Steps</div>
      {steps.map((s, i) => (
        <div key={i} className="flex gap-2 items-center">
          <span className="w-6 h-6 rounded-full bg-[#33475B] text-white text-[12px] flex items-center justify-center shrink-0">{i + 1}</span>
          <select aria-label="Step type" value={s.type} onChange={(e) => setS(i, { type: e.target.value })} className={`${inputH} w-[110px]`}><option value="email">Email</option><option value="task">Task</option><option value="call">Call</option></select>
          <span className="text-[12.5px] text-[#516F90]">Day</span>
          <input aria-label="Day" inputMode="numeric" value={s.day} onChange={(e) => setS(i, { day: Number(e.target.value.replace(/\D/g, '')) || 0 })} className={`${inputH} w-[60px]`} />
          <input data-agent={`hs-seq-step-${i}`} aria-label="Subject" value={s.subject} onChange={(e) => setS(i, { subject: e.target.value })} placeholder={s.type === 'email' ? 'Email subject' : 'Task title'} className={`${inputH} flex-1`} />
          <button aria-label="Remove step" onClick={() => setSteps(steps.filter((_, j) => j !== i))} className="text-[#7C98B6]"><Trash2 size={14} /></button>
        </div>
      ))}
      <button data-agent="hs-seq-add-step" onClick={() => setSteps([...steps, { type: 'email', day: (steps[steps.length - 1]?.day ?? 0) + 3, subject: '' }])} className="h-9 px-3 rounded-[3px] border border-dashed border-[#7C98B6] text-[13.5px] text-[#0091AE] font-medium flex items-center gap-1.5 w-full justify-center"><Plus size={14} /> Add step</button>
    </Modal>
  )
}

function ScheduledSteps({ seqs, contacts }: { seqs: any[]; contacts: any[] }) {
  const { go } = useHNav()
  const rows = seqs.flatMap((s) =>
    s.enrolled
      .filter((e: any) => e.status === 'Active')
      .map((e: any) => {
        const idx = Math.min((e.step ?? 1) - 1, s.steps.length - 1)
        const st = s.steps[idx]
        const due = new Date(+new Date(e.at) + (st?.day ?? 1) * 86400000)
        return { s, e, st, due, c: contacts.find((x) => x.id === e.contactId) }
      }),
  ).filter((r) => r.c && r.st).sort((a, b) => +a.due - +b.due)
  return (
    <table className="w-full border-collapse">
      <thead><tr>{['Contact', 'Sequence', 'Next step', 'Type', 'Scheduled for'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="hover:bg-[#F5F8FA]">
            <td className={td}><HLink onClick={() => go({ page: 'contact', id: r.c.id })}>{r.c.firstName} {r.c.lastName}</HLink></td>
            <td className={td}><HLink onClick={() => go({ page: 'sequence', id: r.s.id })}>{r.s.name}</HLink></td>
            <td className={td}>{r.st.subject}</td>
            <td className={td}>{r.st.type}</td>
            <td className={td}>{hsDate(r.due.toISOString(), true)}</td>
          </tr>
        ))}
        {!rows.length && <tr><td colSpan={5} className="px-6 py-10 text-center text-[13.5px] text-[#516F90]">Nothing scheduled. Enroll contacts in a sequence to see upcoming steps.</td></tr>}
      </tbody>
    </table>
  )
}

function AnalyzeSequences({ seqs }: { seqs: any[] }) {
  const max = Math.max(1, ...seqs.map((s) => s.stats.openRate))
  return (
    <div className="p-6 space-y-3 max-w-[900px]">
      <div className="grid grid-cols-4 gap-3">
        {[['Emails sent', seqs.reduce((t, s) => t + s.stats.sent, 0).toLocaleString()], ['Enrolled', String(seqs.reduce((t, s) => t + s.enrolled.length, 0))], ['Meetings booked', String(seqs.reduce((t, s) => t + s.stats.meetings, 0))], ['Avg. reply rate', `${Math.round(seqs.reduce((t, s) => t + s.stats.replyRate, 0) / Math.max(1, seqs.length))}%`]].map(([l, v]) => (
          <div key={l} className="border border-[#DFE3EB] rounded-[4px] px-4 py-3"><div className="text-[12px] font-semibold uppercase text-[#516F90]">{l}</div><div className="text-[22px] font-light">{v}</div></div>
        ))}
      </div>
      {seqs.map((s) => (
        <div key={s.id} className="flex items-center gap-3 text-[13px]">
          <span className="w-[300px] truncate">{s.name}</span>
          <div className="flex-1 h-4 bg-[#EAF0F6] rounded-[2px] relative"><div className="h-full bg-[#00A4BD] rounded-[2px]" style={{ width: `${(s.stats.openRate / max) * 100}%` }} /><div className="absolute top-0 left-0 h-full bg-[#FF7A59] rounded-[2px]" style={{ width: `${(s.stats.replyRate / max) * 100}%` }} /></div>
          <span className="w-[140px] text-right text-[#516F90]">{s.stats.openRate}% open · {s.stats.replyRate}% reply</span>
        </div>
      ))}
      <div className="flex gap-4 text-[12px] text-[#516F90]"><span className="flex items-center gap-1"><span className="w-3 h-3 bg-[#00A4BD]" /> Open rate</span><span className="flex items-center gap-1"><span className="w-3 h-3 bg-[#FF7A59]" /> Reply rate</span></div>
    </div>
  )
}

function ManageSequences({ seqs }: { seqs: any[] }) {
  const { open, toast } = useHNav()
  return (
    <table className="w-full border-collapse">
      <thead><tr>{['Name', 'Owner', 'Steps', 'Enrolled', ''].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
      <tbody>
        {seqs.map((s) => (
          <tr key={s.id} className="hover:bg-[#F5F8FA]">
            <td className={td}>{s.name}</td>
            <td className={td}>
              <select aria-label="Owner" value={s.ownerId} onChange={(e) => { db.update('hubspot.sequences', s.id, { ownerId: e.target.value }); toast('Owner updated.') }} className={`${inputH} h-8 text-[13px]`}>{OWNERS.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select>
            </td>
            <td className={td}>{s.steps.length}</td>
            <td className={td}>{s.enrolled.length}</td>
            <td className={td}>
              <span className="flex gap-3">
                <HLink onClick={() => open(<RenameModal title="Rename sequence" value={s.name} onSave={(name) => { db.update('hubspot.sequences', s.id, { name }); toast('Sequence renamed.') }} />)}>Rename</HLink>
                <HLink onClick={() => open(
                  <Modal title="Delete sequence?" onClose={() => open(null)} width={460} footer={<><button onClick={() => { db.remove('hubspot.sequences', s.id); open(null); toast('Sequence deleted.') }} className="h-8 px-3 rounded-[3px] bg-[#F2545B] border border-[#F2545B] text-white text-[13px] font-medium">Delete</button><HBtn small onClick={() => open(null)}>Cancel</HBtn></>}>
                    <div>“{s.name}” and its {s.enrolled.length} enrollments will be deleted.</div>
                  </Modal>,
                )}>Delete</HLink>
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function EmailModal({ email }: { email?: any }) {
  const { open, toast } = useHNav()
  const { isAgent } = useDesk()
  const lists = useCollection<any>('hubspot.lists')
  const [v, setV] = useState<any>(email ?? { name: '', subject: '', listId: lists[0]?.id ?? '', body: '', status: 'Draft' })
  const sent = email && email.status === 'Sent'
  const list = lists.find((l) => l.id === v.listId)
  const persist = (status: string, msg: string) => {
    const at = new Date().toISOString()
    const rec = { ...v, status, recipients: status === 'Sent' ? list?.contactIds.length ?? 0 : v.recipients ?? 0, openRate: status === 'Sent' ? 0 : v.openRate ?? 0, clickRate: v.clickRate ?? 0, updatedAt: at, ...(status === 'Sent' ? { sentAt: at } : {}) }
    if (email) db.update('hubspot.marketingEmails', email.id, rec)
    else db.insert('hubspot.marketingEmails', { ...rec, id: uid('mkt'), createdAt: at, createdBy: isAgent ? 'hworker' : undefined }, { prepend: true })
    toast(msg)
    open(null)
  }
  return (
    <Modal title={email ? v.name || 'Marketing email' : 'Create marketing email'} onClose={() => open(null)} width={640} agent="hs-email-modal" footer={sent ? <HBtn small onClick={() => open(null)}>Close</HBtn> : <><HBtn variant="primary" small agent="hs-email-send" disabled={!v.name || !v.subject || !list} onClick={() => persist('Sent', `Email sent to ${list?.contactIds.length ?? 0} contacts.`)}>Send now</HBtn><HBtn small agent="hs-email-schedule" disabled={!v.name || !v.subject} onClick={() => persist('Scheduled', 'Email scheduled for tomorrow 9:00 AM.')}>Schedule</HBtn><HBtn small variant="ghost" agent="hs-email-save" disabled={!v.name} onClick={() => persist('Draft', 'Draft saved.')}>Save draft</HBtn></>}>
      <Field label="Internal name"><input data-agent="hs-email-name" disabled={sent} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} className={`${inputH} w-full`} /></Field>
      <Field label="Subject line"><input data-agent="hs-email-subject" disabled={sent} value={v.subject} onChange={(e) => setV({ ...v, subject: e.target.value })} className={`${inputH} w-full`} /></Field>
      <Field label="Send to list"><select data-agent="hs-email-list" disabled={sent} value={v.listId} onChange={(e) => setV({ ...v, listId: e.target.value })} className={`${inputH} w-full`}>{lists.map((l) => <option key={l.id} value={l.id}>{l.name} ({l.contactIds.length})</option>)}</select></Field>
      <Field label="Body"><textarea data-agent="hs-email-body" disabled={sent} rows={6} value={v.body} onChange={(e) => setV({ ...v, body: e.target.value })} className={`${inputH} h-auto py-2 w-full`} /></Field>
      {sent && <div className="text-[13px] text-[#516F90]">Sent {hsDate(email.sentAt, true)} to {email.recipients} contacts.</div>}
    </Modal>
  )
}

function EmailStats({ name, status, recipients, open: o, click }: { name: string; status: string; recipients: number; open: number; click: number }) {
  const { open } = useHNav()
  return (
    <Modal title={name} onClose={() => open(null)} width={560} agent="hs-email-stats">
      <div className="text-[13px] text-[#516F90]">Status: {status}</div>
      <div className="grid grid-cols-4 gap-3">
        {[['Recipients', recipients.toLocaleString()], ['Opened', `${o}%`], ['Clicked', `${click}%`], ['Delivered', recipients ? '99.2%' : '--']].map(([l, v]) => <div key={l} className="border border-[#DFE3EB] rounded-[4px] px-3 py-2"><div className="text-[11.5px] font-semibold uppercase text-[#516F90]">{l}</div><div className="text-[20px] font-light">{v}</div></div>)}
      </div>
      {recipients > 0 && <div className="text-[13px]">{Math.round((recipients * o) / 100).toLocaleString()} opens · {Math.round((recipients * click) / 100).toLocaleString()} clicks</div>}
    </Modal>
  )
}

function EmailAnalytics({ rows }: { rows: any[][] }) {
  const sent = rows.filter((r) => r[1] === 'Sent')
  const rec = sent.reduce((t, r) => t + Number(r[2]), 0)
  const avg = (i: number) => (sent.length ? (sent.reduce((t, r) => t + Number(r[i]), 0) / sent.length).toFixed(1) : '0')
  return (
    <div className="grid grid-cols-4 gap-3 px-6 py-4 bg-[#F5F8FA] border-b border-[#DFE3EB]" data-agent="hs-email-analytics">
      {[['Emails sent', String(sent.length)], ['Recipients', rec.toLocaleString()], ['Avg. open rate', `${avg(3)}%`], ['Avg. click rate', `${avg(4)}%`]].map(([l, v]) => <div key={l} className="bg-white border border-[#DFE3EB] rounded-[4px] px-4 py-3"><div className="text-[12px] font-semibold uppercase text-[#516F90]">{l}</div><div className="text-[22px] font-light">{v}</div></div>)}
    </div>
  )
}
