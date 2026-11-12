import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ChevronDown, ChevronLeft, ChevronRight, LayoutGrid, List, Search, Trash2 } from 'lucide-react'
import { db, useCollection } from '@/db/db'
import { useDesk } from '@/os/context'
import { ME, person } from '@/data/people'
import { Field, HBtn, HLink, HWTag, Initials, Modal, hsDate, hsMoney, inputH, priorityStyle, Pill, useHNav } from './ui'
import { LEAD_STATUS, LIFECYCLE, STAGES, STAGE_PROB, csvDownload, setDealStage } from './store'
import { OWNERS } from './owners'

type Obj = 'contacts' | 'companies' | 'deals'
const statusColor: Record<string, string> = { New: '#00A4BD', Open: '#6A78D1', 'In Progress': '#F5C26B', 'Attempted to contact': '#F2547D', Connected: '#00BDA5' }

const VIEWS: Record<Obj, [string, (r: any) => boolean][]> = {
  contacts: [['All contacts', () => true], ['My contacts', (r) => r.ownerId === ME.id], ['New leads', (r) => r.leadStatus === 'New'], ['MQLs', (r) => r.lifecycleStage === 'Marketing Qualified Lead']],
  companies: [['All companies', () => true], ['My companies', (r) => r.ownerId === ME.id]],
  deals: [['All deals', () => true], ['My deals', (r) => r.ownerId === ME.id], ['Open deals', (r) => r.stage !== 'Closed Won' && r.stage !== 'Closed Lost'], ['Closing this quarter', (r) => r.stage !== 'Closed Lost' && new Date(r.closeDate) < new Date(Date.now() + 90 * 86400000)]],
}
const COLS: Record<Obj, [string, string][]> = {
  contacts: [['Name', 'name'], ['Email', 'email'], ['Phone number', 'phone'], ['Contact owner', 'owner'], ['Primary company', 'company'], ['Last activity date', 'lastActivity'], ['Lead status', 'leadStatus'], ['Create date', 'createDate']],
  companies: [['Company name', 'name'], ['Company owner', 'owner'], ['Create date', 'createDate'], ['Phone number', 'phone'], ['Last activity date', 'lastActivity'], ['City', 'city'], ['Country/Region', 'country'], ['Industry', 'industry']],
  deals: [['Deal name', 'name'], ['Deal stage', 'stage'], ['Close date', 'closeDate'], ['Deal owner', 'owner'], ['Amount', 'amount'], ['Priority', 'priority'], ['Create date', 'createDate']],
}
const sortVal = (r: any, k: string) => (k === 'name' ? (r.firstName ? `${r.firstName} ${r.lastName}` : r.name) : k === 'owner' ? person(r.ownerId).name : k === 'phone' ? r.phone ?? '' : r[k]) ?? ''

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className={`h-8 px-2 text-[13px] font-medium rounded border ${value ? 'border-[#00A4BD] bg-[#E5F5F8]' : 'border-transparent hover:bg-[#F5F8FA]'} text-[#33475B] outline-none`}>
      <option value="">{label}</option>
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  )
}

export function ObjectIndex({ object }: { object: Obj }) {
  const { go, open, toast } = useHNav()
  const src = useCollection<any>(`hubspot.${object}`)
  const companies = useCollection<any>('hubspot.companies')
  const [view, setView] = useState(0)
  const [q, setQ] = useState('')
  const [board, setBoard] = useState(object === 'deals')
  const [f1, setF1] = useState('')
  const [f2, setF2] = useState('')
  const [sort, setSort] = useState<{ k: string; dir: 1 | -1 } | null>(null)
  const [page, setPage] = useState(0)
  const [per, setPer] = useState(25)
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [drag, setDrag] = useState<string | null>(null)
  const [over, setOver] = useState<string | null>(null)
  const { isAgent } = useDesk()

  const rows = useMemo(() => {
    let r = src.filter(VIEWS[object][view][1])
    if (f1) r = r.filter((x) => x.ownerId === f1)
    if (f2) r = r.filter((x) => (object === 'contacts' ? x.leadStatus : object === 'companies' ? x.industry : x.stage) === f2)
    if (q) r = r.filter((x) => JSON.stringify([x.firstName, x.lastName, x.name, x.email, x.phone, x.company, x.companyName, x.city, x.industry, x.stage]).toLowerCase().includes(q.toLowerCase()))
    if (sort) r = [...r].sort((a, b) => { const x = sortVal(a, sort.k), y = sortVal(b, sort.k); return (x > y ? 1 : x < y ? -1 : 0) * sort.dir })
    return r
  }, [src, object, view, f1, f2, q, sort])
  const pages = Math.max(1, Math.ceil(rows.length / per))
  const pg = Math.min(page, pages - 1)
  const shown = board ? rows : rows.slice(pg * per, pg * per + per)
  const f2opts: [string, string][] = object === 'contacts' ? LEAD_STATUS.map((x) => [x, x]) : object === 'companies' ? Array.from(new Set(src.map((x) => x.industry))).map((x: any) => [x, x]) : STAGES.map((x) => [x, x])

  const companyId = (n: string) => companies.find((c) => c.name === n)?.id
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const allOn = shown.length > 0 && shown.every((r) => sel.has(r.id))
  const th = 'text-left text-[12px] font-semibold uppercase tracking-wide text-[#33475B] px-3 h-10 border-b border-r border-[#DFE3EB] bg-[#F5F8FA] whitespace-nowrap select-none'
  const td = 'px-3 h-11 border-b border-r border-[#DFE3EB] text-[13.5px] whitespace-nowrap truncate max-w-[260px]'
  const noun = object === 'contacts' ? 'contact' : object === 'companies' ? 'company' : 'deal'

  const bulkOwner = (ownerId: string) => { sel.forEach((id) => db.update(`hubspot.${object}`, id, { ownerId })); toast(`${sel.size} ${noun}${sel.size > 1 ? 's' : ''} reassigned to ${person(ownerId).name}.`); setSel(new Set()) }
  const bulkDelete = () => open(
    <Modal title={`Delete ${sel.size} ${noun}${sel.size > 1 ? 's' : ''}?`} onClose={() => open(null)} width={460} footer={<><HBtn variant="primary" small agent="hs-delete-confirm" onClick={() => { sel.forEach((id) => db.remove(`hubspot.${object}`, id)); toast(`${sel.size} record${sel.size > 1 ? 's' : ''} deleted.`); setSel(new Set()); open(null) }}>Delete</HBtn><HBtn variant="secondary" small onClick={() => open(null)}>Cancel</HBtn></>}>
      <div>This removes the selected records from your CRM and any lists they belong to. This can’t be undone in this demo.</div>
    </Modal>,
  )
  const exportCsv = () => csvDownload(`hubspot-${object}.csv`, rows.map((r) => (object === 'contacts' ? { 'First name': r.firstName, 'Last name': r.lastName, Email: r.email, Phone: r.phone, Company: r.company, 'Lifecycle stage': r.lifecycleStage, 'Lead status': r.leadStatus, Owner: person(r.ownerId).name } : object === 'companies' ? { Name: r.name, Domain: r.domain, Industry: r.industry, City: r.city, Employees: r.employees, Owner: person(r.ownerId).name } : { Name: r.name, Stage: r.stage, Amount: r.amount, 'Close date': r.closeDate, Owner: person(r.ownerId).name })))

  const dropOn = (stage: string) => { if (drag) setDealStage(drag, stage, isAgent ? 'hworker' : undefined); setDrag(null); setOver(null) }

  return (
    <div className="min-h-full bg-white">
      <div className="bg-white border-b border-[#DFE3EB]">
        <div className="flex items-center gap-3 px-6 pt-4">
          <span className="flex items-center gap-1.5 text-[22px] font-medium text-[#33475B]">{object === 'contacts' ? 'Contacts' : object === 'companies' ? 'Companies' : 'Deals'}</span>
          <span className="text-[13px] text-[#516F90] mt-1" data-agent="hs-record-count">{rows.length} records</span>
          <div className="flex-1" />
          <HBtn variant="ghost" small onClick={exportCsv}>Export</HBtn>
          <HBtn variant="primary" small agent={`hs-create-${noun}`} onClick={() => open(<CreateModal object={object} onDone={(id) => { open(null); go({ page: noun as any, id }) }} />)}>Create {noun}</HBtn>
        </div>
        <div className="flex items-end px-6 mt-3">
          {VIEWS[object].map(([x], i) => (
            <button key={x} onClick={() => { setView(i); setPage(0) }} className={`h-9 px-4 text-[13.5px] border border-b-0 rounded-t-[3px] -mr-px flex items-center gap-2 ${view === i ? 'bg-white border-[#CBD6E2] font-semibold text-[#33475B] relative top-px' : 'bg-[#F5F8FA] border-[#DFE3EB] text-[#516F90]'}`}>
              {x} <span className="text-[11.5px] text-[#7C98B6]">{src.filter(VIEWS[object][i][1]).length}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 px-6 py-3 bg-white border-b border-[#DFE3EB] flex-wrap">
        {object === 'deals' && (
          <div className="flex border border-[#CBD6E2] rounded-[3px] overflow-hidden mr-1">
            <button aria-label="List view" onClick={() => setBoard(false)} className={`w-9 h-8 flex items-center justify-center ${!board ? 'bg-[#EAF0F6]' : 'bg-white'}`}><List size={15} /></button>
            <button aria-label="Board view" onClick={() => setBoard(true)} className={`w-9 h-8 flex items-center justify-center border-l border-[#CBD6E2] ${board ? 'bg-[#EAF0F6]' : 'bg-white'}`}><LayoutGrid size={15} /></button>
          </div>
        )}
        <div className="flex items-center h-8 w-[260px] border border-[#CBD6E2] rounded-[3px] bg-white px-2 gap-1.5">
          <input data-agent="hs-index-search" aria-label="Search" value={q} onChange={(e) => { setQ(e.target.value); setPage(0) }} placeholder="Search name, phone, email..." className="flex-1 outline-none text-[13px] bg-transparent" />
          <Search size={14} className="text-[#7C98B6]" />
        </div>
        <Select label={object === 'contacts' ? 'Contact owner' : object === 'companies' ? 'Company owner' : 'Deal owner'} value={f1} onChange={(v) => { setF1(v); setPage(0) }} options={OWNERS.map((o) => [o.id, o.name])} />
        <Select label={object === 'contacts' ? 'Lead status' : object === 'companies' ? 'Industry' : 'Deal stage'} value={f2} onChange={(v) => { setF2(v); setPage(0) }} options={f2opts} />
        {(f1 || f2 || q) && <button className="h-8 px-2 text-[13px] font-medium text-[#0091AE]" onClick={() => { setF1(''); setF2(''); setQ('') }}>Clear filters</button>}
        <div className="flex-1" />
        {sel.size > 0 && (
          <div className="flex items-center gap-2 pl-3 border-l border-[#DFE3EB]" data-agent="hs-bulk-bar">
            <span className="text-[13px] font-semibold">{sel.size} selected</span>
            <select aria-label="Assign owner" value="" onChange={(e) => e.target.value && bulkOwner(e.target.value)} className="h-8 px-2 text-[13px] rounded border border-[#CBD6E2] bg-white"><option value="">Assign owner</option>{OWNERS.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select>
            {object === 'contacts' && <select aria-label="Set lead status" value="" onChange={(e) => { if (!e.target.value) return; sel.forEach((id) => db.update('hubspot.contacts', id, { leadStatus: e.target.value })); toast(`Lead status updated for ${sel.size} contacts.`); setSel(new Set()) }} className="h-8 px-2 text-[13px] rounded border border-[#CBD6E2] bg-white"><option value="">Lead status</option>{LEAD_STATUS.map((s) => <option key={s}>{s}</option>)}</select>}
            {object === 'contacts' && <HBtn variant="ghost" small onClick={() => open(<AddToList ids={[...sel]} onDone={() => { open(null); setSel(new Set()) }} />)}>Add to list</HBtn>}
            <button aria-label="Delete" onClick={bulkDelete} className="w-8 h-8 flex items-center justify-center rounded border border-[#CBD6E2] text-[#C93B44]"><Trash2 size={15} /></button>
          </div>
        )}
      </div>

      {object === 'deals' && board ? (
        <div className="flex gap-3 p-4 overflow-x-auto bg-[#F5F8FA] min-h-[600px]">
          {STAGES.map((s, si) => {
            const list = rows.filter((d) => d.stage === s)
            const total = list.reduce((t, d) => t + d.amount, 0)
            return (
              <div key={s} className="w-[250px] shrink-0 flex flex-col" onDragOver={(e) => { e.preventDefault(); setOver(s) }} onDragLeave={() => setOver((o) => (o === s ? null : o))} onDrop={() => dropOn(s)} data-agent={`hs-stage-${si}`}>
                <div className="h-11 px-3 flex items-center justify-between bg-white border border-[#DFE3EB] rounded-t-[3px]">
                  <span className="text-[12px] font-semibold uppercase tracking-wide truncate">{s}</span>
                  <span className="text-[12px] text-[#516F90] bg-[#EAF0F6] rounded-full px-2">{list.length}</span>
                </div>
                <div className={`flex-1 border-x border-[#DFE3EB] p-2 space-y-2 min-h-[120px] ${over === s ? 'bg-[#D6F0F5]' : 'bg-[#EAF0F6]/60'}`}>
                  {list.map((d) => (
                    <div key={d.id} draggable onDragStart={() => setDrag(d.id)} onDragEnd={() => { setDrag(null); setOver(null) }} className={`bg-white rounded-[3px] border border-[#DFE3EB] p-3 shadow-[0_1px_2px_rgba(45,62,80,0.12)] cursor-grab ${d.updatedBy === 'hworker' ? 'flash-new' : ''}`}>
                      <HLink agent={`hs-deal-card-${d.id}`} className="text-[13.5px]" onClick={() => go({ page: 'deal', id: d.id })}>{d.name}</HLink>
                      <div className="text-[12.5px] mt-1">Amount: <b>{hsMoney(d.amount)}</b></div>
                      <div className="text-[12.5px] text-[#516F90]">Close date: {hsDate(d.closeDate)}</div>
                      <div className="flex items-center gap-2 mt-2 text-[#7C98B6]">
                        <Initials name={person(d.ownerId).name} size={20} />
                        <Pill color={priorityStyle[d.priority]?.[0]} text={priorityStyle[d.priority]?.[1]}>{d.priority}</Pill>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="h-12 px-3 bg-white border border-[#DFE3EB] rounded-b-[3px] text-[12px] text-[#516F90] flex flex-col justify-center">
                  <span>Total amount: <b className="text-[#33475B]">{hsMoney(total)}</b></span>
                  <span>Weighted: {hsMoney(total * STAGE_PROB[si])}</span>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="overflow-auto">
          <table className="border-collapse min-w-full">
            <thead>
              <tr>
                <th className={`${th} w-10`}><input type="checkbox" aria-label="Select all" checked={allOn} onChange={() => setSel(allOn ? new Set() : new Set(shown.map((r) => r.id)))} /></th>
                {COLS[object].map(([h, k]) => (
                  <th key={h} className={`${th} cursor-pointer hover:bg-[#EAF0F6]`} onClick={() => setSort(sort?.k === k ? (sort.dir === 1 ? { k, dir: -1 } : null) : { k, dir: 1 })}>
                    <span className="inline-flex items-center gap-1">{h}{sort?.k === k && (sort.dir === 1 ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} className={`hover:bg-[#F5F8FA] ${sel.has(r.id) ? 'bg-[#E5F5F8]' : ''} ${r.updatedBy === 'hworker' ? 'flash-new' : ''}`}>
                  <td className={`${td} w-10`}><input type="checkbox" aria-label="Select row" checked={sel.has(r.id)} onChange={() => toggle(r.id)} /></td>
                  {object === 'contacts' ? (
                    <>
                      <td className={td}>
                        <span className="flex items-center gap-2">
                          <Initials name={`${r.firstName} ${r.lastName}`} size={26} />
                          <HLink agent={`hs-contact-row-${r.id}`} onClick={() => go({ page: 'contact', id: r.id })}>{r.firstName} {r.lastName}</HLink>
                          {r.sequences?.length > 0 && <HWTag text="Enrolled" />}
                        </span>
                      </td>
                      <td className={td}>{r.email}</td>
                      <td className={td}>{r.phone}</td>
                      <td className={td}>{person(r.ownerId).name}</td>
                      <td className={td}><HLink onClick={() => { const id = companyId(r.company); id && go({ page: 'company', id }) }}>{r.company}</HLink></td>
                      <td className={td}>{hsDate(r.lastActivity, true)}</td>
                      <td className={td}><span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: statusColor[r.leadStatus] ?? '#CBD6E2' }} />{r.leadStatus}</span></td>
                      <td className={td}>{hsDate(r.createDate, true)}</td>
                    </>
                  ) : object === 'companies' ? (
                    <>
                      <td className={td}><span className="flex items-center gap-2"><span className="w-6 h-6 rounded bg-[#EAF0F6] flex items-center justify-center text-[11px] font-bold text-[#516F90]">{r.name[0]}</span><HLink agent={`hs-company-row-${r.id}`} onClick={() => go({ page: 'company', id: r.id })}>{r.name}</HLink></span></td>
                      <td className={td}>{person(r.ownerId).name}</td>
                      <td className={td}>{hsDate(r.createDate, true)}</td>
                      <td className={td}>{r.phone ?? `+1 (617) 555-0${String(100 + (r.employees % 900)).slice(-3)}`}</td>
                      <td className={td}>{hsDate(r.lastActivity, true)}</td>
                      <td className={td}>{r.city}</td>
                      <td className={td}>{r.country}</td>
                      <td className={td}>{r.industry}</td>
                    </>
                  ) : (
                    <>
                      <td className={td}><HLink agent={`hs-deal-row-${r.id}`} onClick={() => go({ page: 'deal', id: r.id })}>{r.name}</HLink></td>
                      <td className={td}>{r.stage}</td>
                      <td className={td}>{hsDate(r.closeDate)}</td>
                      <td className={td}>{person(r.ownerId).name}</td>
                      <td className={td}>{hsMoney(r.amount)}</td>
                      <td className={td}><Pill color={priorityStyle[r.priority]?.[0]} text={priorityStyle[r.priority]?.[1]}>{r.priority}</Pill></td>
                      <td className={td}>{hsDate(r.createDate, true)}</td>
                    </>
                  )}
                </tr>
              ))}
              {!shown.length && <tr><td colSpan={9} className="text-center py-16 text-[#516F90]">No {object} match your filters.</td></tr>}
            </tbody>
          </table>
          <div className="flex items-center justify-center gap-3 py-4 text-[13px] text-[#516F90]">
            <button disabled={pg === 0} onClick={() => setPage(pg - 1)} className="flex items-center disabled:opacity-40"><ChevronLeft size={14} /> Prev</button>
            <span className="px-2 py-0.5 rounded bg-[#EAF0F6] text-[#33475B] font-semibold">{pg + 1}</span> of {pages}
            <button disabled={pg >= pages - 1} onClick={() => setPage(pg + 1)} className="flex items-center disabled:opacity-40">Next <ChevronRight size={14} /></button>
            <span className="ml-6 flex items-center gap-1">
              <select aria-label="Per page" value={per} onChange={(e) => { setPer(+e.target.value); setPage(0) }} className="h-7 border border-[#CBD6E2] rounded bg-white px-1">{[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n} per page</option>)}</select>
              <ChevronDown size={12} />
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

function AddToList({ ids, onDone }: { ids: string[]; onDone: () => void }) {
  const lists = useCollection<any>('hubspot.lists')
  const { toast } = useHNav()
  const [sel, setSel] = useState('')
  const statics = lists
  return (
    <Modal title={`Add ${ids.length} contact${ids.length > 1 ? 's' : ''} to list`} onClose={onDone} width={480} footer={<><HBtn variant="primary" small disabled={!sel} onClick={() => { db.update('hubspot.lists', sel, (l) => ({ contactIds: Array.from(new Set([...l.contactIds, ...ids])), updatedAt: new Date().toISOString() })); toast('Added to list.'); onDone() }}>Add to list</HBtn><HBtn variant="secondary" small onClick={onDone}>Cancel</HBtn></>}>
      <Field label="List"><select value={sel} onChange={(e) => setSel(e.target.value)} className={`${inputH} w-full`}><option value="">Select a list</option>{statics.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></Field>
    </Modal>
  )
}

function CreateModal({ object, onDone }: { object: Obj; onDone: (id: string) => void }) {
  const { isAgent } = useDesk()
  const { open, toast } = useHNav()
  const companies = useCollection<any>('hubspot.companies')
  const [v, setV] = useState<Record<string, string>>({ ownerId: ME.id, lifecycleStage: 'Lead', leadStatus: 'New', stage: STAGES[0], priority: 'Medium', amount: '', closeDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10) })
  const set = (k: string, val: string) => setV((x) => ({ ...x, [k]: val }))
  const now = new Date().toISOString()
  const valid = object === 'contacts' ? !!v.firstName && !!v.email : !!v.name
  const save = () => {
    const by = isAgent ? 'hworker' : undefined
    const id = String(Math.floor(10_000_000 + Math.random() * 80_000_000))
    if (object === 'contacts')
      db.insert('hubspot.contacts', { id, firstName: v.firstName, lastName: v.lastName ?? '', email: v.email, phone: v.phone ?? '', company: v.company ?? '', jobTitle: v.jobTitle ?? '', lifecycleStage: v.lifecycleStage, leadStatus: v.leadStatus, ownerId: v.ownerId, createDate: now, lastActivity: now, city: '', country: 'United States', webinarStatus: null, leadScore: 10, events: [{ type: 'note', title: 'Contact created', body: `Created by ${ME.name}`, date: now, by }], sequences: [], updatedBy: by }, { prepend: true })
    if (object === 'companies')
      db.insert('hubspot.companies', { id, name: v.name, domain: v.domain ?? '', industry: v.industry ?? 'Software', city: v.city ?? '', country: 'United States', employees: Number(v.employees) || 0, revenue: 0, ownerId: v.ownerId, lifecycleStage: 'Lead', createDate: now, lastActivity: now, events: [{ type: 'note', title: 'Company created', body: `Created by ${ME.name}`, date: now, by }], updatedBy: by }, { prepend: true })
    if (object === 'deals')
      db.insert('hubspot.deals', { id, name: v.name, amount: Number(v.amount) || 0, stage: v.stage, pipeline: 'Sales Pipeline', closeDate: v.closeDate, ownerId: v.ownerId, companyName: v.company ?? '', createDate: now, priority: v.priority, events: [{ type: 'note', title: 'Deal created', body: `Created by ${ME.name}`, date: now, by }], updatedBy: by }, { prepend: true })
    toast(`${object === 'contacts' ? 'Contact' : object === 'companies' ? 'Company' : 'Deal'} created.`)
    onDone(id)
  }
  const inp = (k: string, label: string, type = 'text') => <Field label={label}><input data-agent={`hs-new-${k}`} aria-label={label} type={type} value={v[k] ?? ''} onChange={(e) => set(k, e.target.value)} className={`${inputH} w-full`} /></Field>
  const owner = <Field label={object === 'deals' ? 'Deal owner' : object === 'contacts' ? 'Contact owner' : 'Company owner'}><select value={v.ownerId} onChange={(e) => set('ownerId', e.target.value)} className={`${inputH} w-full`}>{OWNERS.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></Field>
  const companyPick = <Field label="Company"><input list="hs-companies" value={v.company ?? ''} onChange={(e) => set('company', e.target.value)} className={`${inputH} w-full`} /><datalist id="hs-companies">{companies.map((c) => <option key={c.id} value={c.name} />)}</datalist></Field>
  return (
    <Modal title={`Create ${object === 'contacts' ? 'contact' : object === 'companies' ? 'company' : 'deal'}`} onClose={() => open(null)} agent="hs-create-modal" footer={<><HBtn variant="primary" small agent="hs-create-save" disabled={!valid} onClick={save}>Create</HBtn><HBtn variant="secondary" small onClick={() => open(null)}>Cancel</HBtn></>}>
      {object === 'contacts' && (
        <>
          <div className="grid grid-cols-2 gap-3">{inp('firstName', 'First name')}{inp('lastName', 'Last name')}</div>
          {inp('email', 'Email', 'email')}
          <div className="grid grid-cols-2 gap-3">{inp('phone', 'Phone number')}{inp('jobTitle', 'Job title')}</div>
          {companyPick}
          <div className="grid grid-cols-3 gap-3">
            {owner}
            <Field label="Lifecycle stage"><select value={v.lifecycleStage} onChange={(e) => set('lifecycleStage', e.target.value)} className={`${inputH} w-full`}>{LIFECYCLE.map((s) => <option key={s}>{s}</option>)}</select></Field>
            <Field label="Lead status"><select value={v.leadStatus} onChange={(e) => set('leadStatus', e.target.value)} className={`${inputH} w-full`}>{LEAD_STATUS.map((s) => <option key={s}>{s}</option>)}</select></Field>
          </div>
        </>
      )}
      {object === 'companies' && (
        <>
          {inp('name', 'Company name')}
          {inp('domain', 'Company domain name')}
          <div className="grid grid-cols-3 gap-3">{inp('industry', 'Industry')}{inp('city', 'City')}{inp('employees', 'Employees', 'number')}</div>
          {owner}
        </>
      )}
      {object === 'deals' && (
        <>
          {inp('name', 'Deal name')}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Deal stage"><select data-agent="hs-new-stage" value={v.stage} onChange={(e) => set('stage', e.target.value)} className={`${inputH} w-full`}>{STAGES.map((s) => <option key={s}>{s}</option>)}</select></Field>
            {inp('amount', 'Amount', 'number')}
          </div>
          <div className="grid grid-cols-2 gap-3">{inp('closeDate', 'Close date', 'date')}<Field label="Priority"><select value={v.priority} onChange={(e) => set('priority', e.target.value)} className={`${inputH} w-full`}>{['High', 'Medium', 'Low'].map((s) => <option key={s}>{s}</option>)}</select></Field></div>
          {companyPick}
          {owner}
        </>
      )}
    </Modal>
  )
}
