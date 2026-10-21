import { useMemo, useState } from 'react'
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, Columns3, Copy, FileText, Filter, LayoutGrid, List, Mail, MoreHorizontal, Pencil, Phone, Plus, Search, SlidersHorizontal, SquareCheck, StickyNote, Video, Zap } from 'lucide-react'
import { useCollection, useRecord } from '@/db/db'
import { person } from '@/data/people'
import { HBtn, HLink, HWTag, Initials, hsDate, hsMoney, useHNav } from './ui'

const STAGES = ['Appointment Scheduled', 'Qualified To Buy', 'Presentation Scheduled', 'Decision Maker Bought-In', 'Contract Sent', 'Closed Won', 'Closed Lost']

function IndexHeader({ title, count, create, views }: { title: string; count: number; create: string; views: string[] }) {
  const [v, setV] = useState(0)
  return (
    <div className="bg-white border-b border-[#DFE3EB]">
      <div className="flex items-center gap-3 px-6 pt-4">
        <button className="flex items-center gap-1.5 text-[22px] font-medium text-[#33475B]">
          {title} <ChevronDown size={18} />
        </button>
        <span className="text-[13px] text-[#516F90] mt-1">{count} records</span>
        <div className="flex-1" />
        <HBtn variant="ghost" small>Actions <ChevronDown size={14} /></HBtn>
        <HBtn variant="ghost" small>Import</HBtn>
        <HBtn variant="primary" small>{create}</HBtn>
      </div>
      <div className="flex items-end gap-0 px-6 mt-3">
        {views.map((x, i) => (
          <button key={x} onClick={() => setV(i)} className={`h-9 px-4 text-[13.5px] border border-b-0 rounded-t-[3px] -mr-px flex items-center gap-2 ${v === i ? 'bg-white border-[#CBD6E2] font-semibold text-[#33475B] relative top-px' : 'bg-[#F5F8FA] border-[#DFE3EB] text-[#516F90]'}`}>
            {x} {v === i && <span className="text-[#7C98B6]">×</span>}
          </button>
        ))}
        <button className="h-9 px-3 text-[13.5px] text-[#0091AE] flex items-center gap-1"><Plus size={14} /> Add view (3/50)</button>
        <div className="flex-1" />
        <button className="h-9 text-[13.5px] text-[#0091AE] flex items-center gap-1">All Views</button>
      </div>
    </div>
  )
}

function FilterBar({ q, setQ, filters, board, setBoard }: { q: string; setQ: (s: string) => void; filters: string[]; board?: boolean; setBoard?: (b: boolean) => void }) {
  return (
    <div className="flex items-center gap-2 px-6 py-3 bg-white border-b border-[#DFE3EB]">
      {setBoard && (
        <div className="flex border border-[#CBD6E2] rounded-[3px] overflow-hidden mr-1">
          <button onClick={() => setBoard(false)} className={`w-9 h-8 flex items-center justify-center ${!board ? 'bg-[#EAF0F6]' : 'bg-white'}`}><List size={15} /></button>
          <button onClick={() => setBoard(true)} className={`w-9 h-8 flex items-center justify-center border-l border-[#CBD6E2] ${board ? 'bg-[#EAF0F6]' : 'bg-white'}`}><LayoutGrid size={15} /></button>
        </div>
      )}
      <div className="flex items-center h-8 w-[260px] border border-[#CBD6E2] rounded-[3px] bg-white px-2 gap-1.5">
        <input data-agent="hs-index-search" aria-label="Search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, phone, email..." className="flex-1 outline-none text-[13px] bg-transparent" />
        <Search size={14} className="text-[#7C98B6]" />
      </div>
      {filters.map((f) => (
        <button key={f} className="h-8 px-2 text-[13px] font-medium text-[#33475B] flex items-center gap-1 hover:bg-[#F5F8FA] rounded">{f} <ChevronDown size={13} /></button>
      ))}
      <button className="h-8 px-2 text-[13px] font-medium text-[#0091AE] flex items-center gap-1"><Plus size={13} /> More</button>
      <button className="h-8 px-2 text-[13px] font-medium text-[#0091AE] flex items-center gap-1"><SlidersHorizontal size={13} /> Advanced filters</button>
      <div className="flex-1" />
      <HBtn variant="ghost" small><Columns3 size={14} /> Edit columns</HBtn>
      <HBtn variant="ghost" small><Filter size={14} /> Sort</HBtn>
      <HBtn variant="ghost" small>Export</HBtn>
    </div>
  )
}

const statusColor: Record<string, string> = { New: '#00A4BD', Open: '#6A78D1', 'In Progress': '#F5C26B', 'Attempted to contact': '#F2547D', Connected: '#00BDA5' }

export function ObjectIndex({ object }: { object: 'contacts' | 'companies' | 'deals' }) {
  const { go } = useHNav()
  const contacts = useCollection<any>('hubspot.contacts')
  const companies = useCollection<any>('hubspot.companies')
  const deals = useCollection<any>('hubspot.deals')
  const [q, setQ] = useState('')
  const [board, setBoard] = useState(object === 'deals')
  const rows = useMemo(() => {
    const src = object === 'contacts' ? contacts : object === 'companies' ? companies : deals
    return src.filter((r) => !q || JSON.stringify(r).toLowerCase().includes(q.toLowerCase()))
  }, [object, contacts, companies, deals, q])

  const th = 'text-left text-[12px] font-semibold uppercase tracking-wide text-[#33475B] px-3 h-10 border-b border-r border-[#DFE3EB] bg-[#F5F8FA] whitespace-nowrap'
  const td = 'px-3 h-11 border-b border-r border-[#DFE3EB] text-[13.5px] whitespace-nowrap truncate max-w-[260px]'
  return (
    <div className="min-h-full bg-white">
      <IndexHeader title={object === 'contacts' ? 'Contacts' : object === 'companies' ? 'Companies' : 'Deals'} count={rows.length} create={object === 'contacts' ? 'Create contact' : object === 'companies' ? 'Create company' : 'Create deal'} views={object === 'contacts' ? ['All contacts', 'My contacts', 'Unassigned contacts'] : object === 'companies' ? ['All companies', 'My companies'] : ['All deals', 'My deals']} />
      <FilterBar q={q} setQ={setQ} filters={object === 'contacts' ? ['Contact owner', 'Create date', 'Last activity date', 'Lead status'] : object === 'companies' ? ['Company owner', 'Create date', 'Last activity date'] : ['Deal owner', 'Create date', 'Close date', 'Last activity date']} board={board} setBoard={object === 'deals' ? setBoard : undefined} />
      {object === 'deals' && board ? (
        <div className="flex gap-3 p-4 overflow-x-auto bg-[#F5F8FA] min-h-[600px]">
          {STAGES.map((s) => {
            const list = rows.filter((d) => d.stage === s)
            const total = list.reduce((t, d) => t + d.amount, 0)
            return (
              <div key={s} className="w-[250px] shrink-0 flex flex-col">
                <div className="h-11 px-3 flex items-center justify-between bg-white border border-[#DFE3EB] rounded-t-[3px]">
                  <span className="text-[12px] font-semibold uppercase tracking-wide truncate">{s}</span>
                  <span className="text-[12px] text-[#516F90] bg-[#EAF0F6] rounded-full px-2">{list.length}</span>
                </div>
                <div className="flex-1 bg-[#EAF0F6]/60 border-x border-[#DFE3EB] p-2 space-y-2">
                  {list.map((d) => (
                    <div key={d.id} className="bg-white rounded-[3px] border border-[#DFE3EB] p-3 shadow-[0_1px_2px_rgba(45,62,80,0.12)]">
                      <HLink className="text-[13.5px]">{d.name}</HLink>
                      <div className="text-[12.5px] mt-1">Amount: <b>{hsMoney(d.amount)}</b></div>
                      <div className="text-[12.5px] text-[#516F90]">Close date: {hsDate(d.closeDate)}</div>
                      <div className="flex items-center gap-2 mt-2 text-[#7C98B6]">
                        <Initials name={person(d.ownerId).name} size={20} />
                        <span className="text-[11.5px]">{d.priority} priority</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="h-12 px-3 bg-white border border-[#DFE3EB] rounded-b-[3px] text-[12px] text-[#516F90] flex flex-col justify-center">
                  <span>Total amount: <b className="text-[#33475B]">{hsMoney(total)}</b></span>
                  <span>Weighted: {hsMoney(total * ((STAGES.indexOf(s) + 1) / 7))}</span>
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
                <th className={`${th} w-10`}><input type="checkbox" /></th>
                {(object === 'contacts' ? ['Name', 'Email', 'Phone number', 'Contact owner', 'Primary company', 'Last activity date', 'Lead status', 'Create date'] : object === 'companies' ? ['Company name', 'Company owner', 'Create date', 'Phone number', 'Last activity date', 'City', 'Country/Region', 'Industry'] : ['Deal name', 'Deal stage', 'Close date', 'Deal owner', 'Amount', 'Priority', 'Create date']).map((h) => (
                  <th key={h} className={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 50).map((r) => (
                <tr key={r.id} className={`hover:bg-[#F5F8FA] ${r.updatedBy === 'hworker' ? 'flash-new' : ''}`}>
                  <td className={`${td} w-10`}><input type="checkbox" /></td>
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
                      <td className={td}><HLink>{r.company}</HLink></td>
                      <td className={td}>{hsDate(r.lastActivity, true)}</td>
                      <td className={td}><span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: statusColor[r.leadStatus] ?? '#CBD6E2' }} />{r.leadStatus}</span></td>
                      <td className={td}>{hsDate(r.createDate, true)}</td>
                    </>
                  ) : object === 'companies' ? (
                    <>
                      <td className={td}><span className="flex items-center gap-2"><span className="w-6 h-6 rounded bg-[#EAF0F6] flex items-center justify-center text-[11px] font-bold text-[#516F90]">{r.name[0]}</span><HLink>{r.name}</HLink></span></td>
                      <td className={td}>{person(r.ownerId).name}</td>
                      <td className={td}>{hsDate(r.createDate, true)}</td>
                      <td className={td}>+1 (617) 555-0{String(100 + (r.employees % 900)).slice(-3)}</td>
                      <td className={td}>{hsDate(r.lastActivity, true)}</td>
                      <td className={td}>{r.city}</td>
                      <td className={td}>{r.country}</td>
                      <td className={td}>{r.industry}</td>
                    </>
                  ) : (
                    <>
                      <td className={td}><HLink>{r.name}</HLink></td>
                      <td className={td}>{r.stage}</td>
                      <td className={td}>{hsDate(r.closeDate)}</td>
                      <td className={td}>{person(r.ownerId).name}</td>
                      <td className={td}>{hsMoney(r.amount)}</td>
                      <td className={td}>{r.priority}</td>
                      <td className={td}>{hsDate(r.createDate, true)}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-center gap-3 py-4 text-[13px] text-[#516F90]">
            <ChevronLeft size={14} /> Prev <span className="px-2 py-0.5 rounded bg-[#EAF0F6] text-[#33475B] font-semibold">1</span> Next <ChevronRight size={14} />
            <span className="ml-6">25 per page <ChevronDown size={12} className="inline" /></span>
          </div>
        </div>
      )}
    </div>
  )
}

const evIcon: Record<string, any> = { webinar: Video, form: FileText, email: Mail, page: LayoutGrid, note: StickyNote, sequence: Zap, call: Phone }

export function ContactRecord({ id }: { id: string }) {
  const { go } = useHNav()
  const c = useRecord<any>('hubspot.contacts', id)
  const seqs = useCollection<any>('hubspot.sequences')
  const lists = useCollection<any>('hubspot.lists')
  const deals = useCollection<any>('hubspot.deals')
  const [tab, setTab] = useState('Overview')
  if (!c) return <div className="p-8">Contact not found</div>
  const name = `${c.firstName} ${c.lastName}`
  const inSeq = seqs.filter((s) => s.enrolled.some((e: any) => e.contactId === id))
  const inLists = lists.filter((l) => l.contactIds.includes(id))
  const myDeals = deals.filter((d) => d.companyName === c.company)
  const props: [string, string][] = [
    ['Email', c.email],
    ['Phone number', c.phone],
    ['Contact owner', person(c.ownerId).name],
    ['Job title', c.jobTitle],
    ['Lifecycle stage', c.lifecycleStage],
    ['Lead status', c.leadStatus],
    ['HubSpot score', String(c.leadScore)],
    ['Webinar attendance', c.webinarStatus ? `${c.webinarStatus} — AI-Powered Ops Summit` : '--'],
    ['City', c.city],
    ['Country/Region', c.country],
  ]
  return (
    <div className="flex min-h-full bg-[#F5F8FA]">
      {/* left */}
      <div className="w-[320px] shrink-0 bg-white border-r border-[#DFE3EB]">
        <div className="px-4 pt-3 flex items-center justify-between text-[13px]">
          <HLink onClick={() => go({ page: 'contacts' })}><span className="inline-flex items-center gap-1"><ChevronLeft size={14} /> Contacts</span></HLink>
          <button className="text-[#0091AE] font-medium flex items-center gap-1">Actions <ChevronDown size={13} /></button>
        </div>
        <div className="flex flex-col items-center px-4 pt-4 pb-4 border-b border-[#DFE3EB]">
          <div className="flex items-start gap-3 w-full">
            <Initials name={name} size={56} />
            <div className="min-w-0">
              <div className="text-[18px] font-semibold flex items-center gap-1.5">{name} <Pencil size={13} className="text-[#7C98B6]" /></div>
              <div className="text-[13px] text-[#516F90]">{c.jobTitle} at {c.company}</div>
              <div className="text-[13px] text-[#0091AE] flex items-center gap-1">{c.email} <Copy size={12} /></div>
            </div>
          </div>
          <div className="flex gap-4 mt-4">
            {[[StickyNote, 'Note'], [Mail, 'Email'], [Phone, 'Call'], [SquareCheck, 'Task'], [Calendar, 'Meeting'], [MoreHorizontal, 'More']].map(([I, l]: any) => (
              <div key={l} className="flex flex-col items-center gap-1">
                <button className="w-9 h-9 rounded-full border border-[#CBD6E2] bg-[#F5F8FA] flex items-center justify-center text-[#33475B] hover:bg-[#EAF0F6]"><I size={16} /></button>
                <span className="text-[11.5px]">{l}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[14px] font-semibold flex items-center gap-1"><ChevronDown size={14} /> About this contact</span>
            <span className="text-[12px] text-[#0091AE]">Actions ▾</span>
          </div>
          {props.map(([k, v]) => (
            <div key={k} className="py-2">
              <div className="text-[12px] text-[#516F90]">{k}</div>
              <div className="text-[14px] border-b border-transparent hover:border-[#CBD6E2]">{v || '--'}</div>
            </div>
          ))}
        </div>
      </div>
      {/* middle */}
      <div className="flex-1 min-w-0">
        <div className="bg-white border-b border-[#DFE3EB] flex gap-1 px-6">
          {['Overview', 'Activities', 'Intelligence'].map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`h-12 px-3 text-[14px] relative ${tab === t ? 'font-semibold text-[#33475B]' : 'text-[#516F90]'}`}>
              {t}
              {tab === t && <span className="absolute left-0 right-0 bottom-0 h-[3px] bg-[#33475B]" />}
            </button>
          ))}
        </div>
        <div className="p-5 space-y-4">
          {tab === 'Overview' && (
            <div className="bg-white border border-[#DFE3EB] rounded-[4px] p-4">
              <div className="text-[15px] font-semibold mb-3">Data highlights</div>
              <div className="grid grid-cols-4 gap-4 text-[13px]">
                {[['CREATE DATE', hsDate(c.createDate, true)], ['LIFECYCLE STAGE', c.lifecycleStage], ['LAST ACTIVITY DATE', hsDate(c.lastActivity, true)], ['HUBSPOT SCORE', c.leadScore]].map(([k, v]) => (
                  <div key={k as string}><div className="text-[11px] font-semibold text-[#516F90] tracking-wide">{k}</div><div className="mt-1">{v}</div></div>
                ))}
              </div>
            </div>
          )}
          <div className="bg-white border border-[#DFE3EB] rounded-[4px]">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[#DFE3EB]">
              <span className="text-[15px] font-semibold flex-1">Recent activities</span>
              <div className="flex items-center h-8 w-[200px] border border-[#CBD6E2] rounded-[3px] px-2 gap-1 text-[#7C98B6] text-[13px]"><Search size={13} /> Search activities</div>
              <button className="text-[13px] text-[#0091AE] font-medium">Collapse all</button>
            </div>
            <div className="px-4 py-3 space-y-3">
              {c.events.map((e: any, i: number) => {
                const I = evIcon[e.type] ?? FileText
                return (
                  <div key={i} className={`border border-[#DFE3EB] rounded-[4px] p-3 ${e.by === 'hworker' ? 'flash-new' : ''}`}>
                    <div className="flex items-center gap-2 text-[13px]">
                      <span className="w-7 h-7 rounded-full bg-[#EAF0F6] flex items-center justify-center text-[#516F90]"><I size={14} /></span>
                      <span className="font-semibold flex-1">{e.title}</span>
                      {e.by === 'hworker' && <HWTag />}
                      <span className="text-[12px] text-[#516F90]">{hsDate(e.date, true)}</span>
                    </div>
                    <div className="text-[13px] text-[#516F90] mt-1.5 pl-9">{e.body}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
      {/* right */}
      <div className="w-[320px] shrink-0 bg-white border-l border-[#DFE3EB] p-4 space-y-4">
        {[
          ['Companies', [c.company]],
          ['Deals', myDeals.map((d) => `${d.name} · ${hsMoney(d.amount)}`)],
          ['Lists', inLists.map((l) => l.name)],
          ['Sequences', inSeq.map((s) => s.name)],
          ['Tickets', []],
        ].map(([t, items]: any) => (
          <div key={t} className="border-b border-[#DFE3EB] pb-3" data-agent={`hs-assoc-${t.toLowerCase()}`}>
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-semibold flex items-center gap-1"><ChevronDown size={14} /> {t} ({items.length})</span>
              <button className="text-[13px] text-[#0091AE] font-medium">+ Add</button>
            </div>
            <div className="mt-2 space-y-1.5">
              {items.length ? items.map((x: string) => <div key={x} className="text-[13px] border border-[#DFE3EB] rounded p-2"><HLink>{x}</HLink></div>) : <div className="text-[13px] text-[#516F90]">See the {t.toLowerCase()} associated with this record.</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
