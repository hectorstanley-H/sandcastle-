import { useState, type ReactNode } from 'react'
import { Check, ChevronDown, ChevronLeft, Copy, Trophy, X } from 'lucide-react'
import { db, useCollection, useRecord } from '@/db/db'
import { useDesk } from '@/os/context'
import { ME, person } from '@/data/people'
import { Field, HBtn, HLink, Initials, Modal, Pill, hsDate, hsMoney, inputH, priorityStyle, useHNav } from './ui'
import { ActionBar, EditableProp, OwnerProp, Timeline } from './Activity'
import { LEAD_STATUS, LIFECYCLE, STAGES, STAGE_PROB, isOpenDeal, logActivity, quoteTotals, setDealStage, weighted } from './store'

function Shell({ left, main, right }: { left: ReactNode; main: ReactNode; right: ReactNode }) {
  return (
    <div className="flex min-h-full bg-[#F5F8FA]">
      <div className="w-[320px] shrink-0 bg-white border-r border-[#DFE3EB]">{left}</div>
      <div className="flex-1 min-w-0">{main}</div>
      <div className="w-[320px] shrink-0 bg-white border-l border-[#DFE3EB] p-4 space-y-4">{right}</div>
    </div>
  )
}

function Assoc({ title, items, agent, add }: { title: string; items: { key: string; node: ReactNode }[]; agent?: string; add?: () => void }) {
  return (
    <div className="border-b border-[#DFE3EB] pb-3" data-agent={agent ?? `hs-assoc-${title.toLowerCase()}`}>
      <div className="flex items-center justify-between">
        <span className="text-[14px] font-semibold flex items-center gap-1"><ChevronDown size={14} /> {title} ({items.length})</span>
        {add && <button onClick={add} className="text-[13px] text-[#0091AE] font-medium">+ Add</button>}
      </div>
      <div className="mt-2 space-y-1.5">
        {items.length ? items.map((x) => <div key={x.key} className="text-[13px] border border-[#DFE3EB] rounded p-2">{x.node}</div>) : <div className="text-[13px] text-[#516F90]">No {title.toLowerCase()} associated.</div>}
      </div>
    </div>
  )
}

function Tabs({ tabs, tab, setTab }: { tabs: string[]; tab: string; setTab: (t: string) => void }) {
  return (
    <div className="bg-white border-b border-[#DFE3EB] flex gap-1 px-6">
      {tabs.map((t) => (
        <button key={t} onClick={() => setTab(t)} className={`h-12 px-3 text-[14px] relative ${tab === t ? 'font-semibold text-[#33475B]' : 'text-[#516F90]'}`}>
          {t}{tab === t && <span className="absolute left-0 right-0 bottom-0 h-[3px] bg-[#33475B]" />}
        </button>
      ))}
    </div>
  )
}
const Card = ({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) => (
  <div className="bg-white border border-[#DFE3EB] rounded-[4px] p-4">
    <div className="flex items-center mb-3"><span className="text-[15px] font-semibold flex-1">{title}</span>{action}</div>
    {children}
  </div>
)
const Stat = ({ k, v }: { k: string; v: ReactNode }) => <div><div className="text-[11px] font-semibold text-[#516F90] tracking-wide">{k}</div><div className="mt-1 text-[13.5px]">{v}</div></div>

function TaskList({ filter }: { filter: (t: any) => boolean }) {
  const tasks = useCollection<any>('hubspot.tasks').filter(filter)
  return (
    <Card title={`Tasks (${tasks.filter((t) => t.status !== 'Completed').length} open)`}>
      <div className="space-y-2">
        {tasks.map((t) => (
          <div key={t.id} className="flex items-center gap-3 text-[13.5px]">
            <button aria-label="Complete task" onClick={() => db.update('hubspot.tasks', t.id, { status: t.status === 'Completed' ? 'Not started' : 'Completed' })} className={`w-5 h-5 rounded-[3px] border flex items-center justify-center ${t.status === 'Completed' ? 'bg-[#00BDA5] border-[#00BDA5] text-white' : 'border-[#7C98B6]'}`}>{t.status === 'Completed' && <Check size={13} />}</button>
            <span className={`flex-1 ${t.status === 'Completed' ? 'line-through text-[#7C98B6]' : ''}`}>{t.title}</span>
            <span className={`text-[12px] ${t.status !== 'Completed' && new Date(t.dueDate) < new Date() ? 'text-[#C93B44] font-semibold' : 'text-[#516F90]'}`}>{hsDate(t.dueDate)}</span>
          </div>
        ))}
        {!tasks.length && <div className="text-[13px] text-[#516F90]">No tasks yet — create one with the Task action.</div>}
      </div>
    </Card>
  )
}

/* ───────────────────────── Contact ───────────────────────── */
export function ContactRecord({ id }: { id: string }) {
  const { go, open, toast } = useHNav()
  const { isAgent } = useDesk()
  const c = useRecord<any>('hubspot.contacts', id)
  const seqs = useCollection<any>('hubspot.sequences')
  const lists = useCollection<any>('hubspot.lists')
  const deals = useCollection<any>('hubspot.deals')
  const companies = useCollection<any>('hubspot.companies')
  const tickets = useCollection<any>('hubspot.tickets')
  const [tab, setTab] = useState('Overview')
  if (!c) return <div className="p-8">Contact not found</div>
  const name = `${c.firstName} ${c.lastName}`
  const inSeq = seqs.filter((s) => s.enrolled.some((e: any) => e.contactId === id))
  const inLists = lists.filter((l) => l.contactIds.includes(id))
  const myDeals = deals.filter((d) => d.companyName === c.company)
  const co = companies.find((x) => x.name === c.company)
  const myTickets = tickets.filter((t) => t.contactId === id)
  const del = () => open(
    <Modal title="Delete contact?" width={440} onClose={() => open(null)} footer={<><HBtn variant="primary" small onClick={() => { db.remove('hubspot.contacts', id); open(null); toast('Contact deleted.'); go({ page: 'contacts' }) }}>Delete</HBtn><HBtn variant="secondary" small onClick={() => open(null)}>Cancel</HBtn></>}>
      Delete <b>{name}</b>? Their activity history will be removed.
    </Modal>,
  )
  const enroll = () => open(<EnrollModal contactId={id} name={name} onClose={() => open(null)} />)
  const addList = () => open(
    <Modal title="Add to list" width={460} onClose={() => open(null)}>
      <div className="space-y-1.5 max-h-[320px] overflow-auto">
        {lists.filter((l) => !l.contactIds.includes(id)).map((l) => (
          <button key={l.id} onClick={() => { db.update('hubspot.lists', l.id, (r) => ({ contactIds: [...r.contactIds, id], updatedAt: new Date().toISOString() })); logActivity('hubspot.contacts', id, { type: 'note', title: `Added to list: ${l.name}`, body: '', by: isAgent ? 'hworker' : undefined }); toast('Added to list.'); open(null) }} className="w-full text-left px-3 h-10 border border-[#DFE3EB] rounded hover:bg-[#F5F8FA]">{l.name}</button>
        ))}
      </div>
    </Modal>,
  )
  const score = c.leadScore as number
  return (
    <Shell
      left={
        <>
          <div className="px-4 pt-3 flex items-center justify-between text-[13px]">
            <HLink onClick={() => go({ page: 'contacts' })}><span className="inline-flex items-center gap-1"><ChevronLeft size={14} /> Contacts</span></HLink>
            <ActionsMenu items={[['Enroll in sequence', enroll], ['Add to list', addList], ['Delete', del]]} />
          </div>
          <div className="flex flex-col items-center px-4 pt-4 pb-4 border-b border-[#DFE3EB]">
            <div className="flex items-start gap-3 w-full">
              <Initials name={name} size={56} />
              <div className="min-w-0">
                <div className="text-[18px] font-semibold">{name}</div>
                <div className="text-[13px] text-[#516F90]">{c.jobTitle} at {c.company}</div>
                <button onClick={() => navigator.clipboard?.writeText(c.email)} className="text-[13px] text-[#0091AE] flex items-center gap-1">{c.email} <Copy size={12} /></button>
              </div>
            </div>
            <ActionBar col="hubspot.contacts" id={id} name={name} email={c.email} contactId={id} />
          </div>
          <div className="px-4 py-3">
            <div className="text-[14px] font-semibold flex items-center gap-1 mb-1"><ChevronDown size={14} /> About this contact</div>
            <EditableProp col="hubspot.contacts" id={id} field="email" label="Email" value={c.email} />
            <EditableProp col="hubspot.contacts" id={id} field="phone" label="Phone number" value={c.phone} />
            <OwnerProp col="hubspot.contacts" id={id} ownerId={c.ownerId} />
            <EditableProp col="hubspot.contacts" id={id} field="jobTitle" label="Job title" value={c.jobTitle} />
            <EditableProp col="hubspot.contacts" id={id} field="lifecycleStage" label="Lifecycle stage" value={c.lifecycleStage} options={LIFECYCLE} />
            <EditableProp col="hubspot.contacts" id={id} field="leadStatus" label="Lead status" value={c.leadStatus} options={LEAD_STATUS} />
            <EditableProp col="hubspot.contacts" id={id} field="leadScore" label="HubSpot score" value={c.leadScore} number type="number" />
            <EditableProp col="hubspot.contacts" id={id} field="webinarStatus" label="Webinar attendance" value={c.webinarStatus} readOnly format={(v) => (v ? `${v} — AI-Powered Ops Summit` : '--')} />
            <EditableProp col="hubspot.contacts" id={id} field="city" label="City" value={c.city} />
            <EditableProp col="hubspot.contacts" id={id} field="country" label="Country/Region" value={c.country} />
          </div>
        </>
      }
      main={
        <>
          <Tabs tabs={['Overview', 'Activities', 'Intelligence']} tab={tab} setTab={setTab} />
          <div className="p-5 space-y-4">
            {tab === 'Overview' && (
              <Card title="Data highlights">
                <div className="grid grid-cols-4 gap-4"><Stat k="CREATE DATE" v={hsDate(c.createDate, true)} /><Stat k="LIFECYCLE STAGE" v={c.lifecycleStage} /><Stat k="LAST ACTIVITY DATE" v={hsDate(c.lastActivity, true)} /><Stat k="HUBSPOT SCORE" v={c.leadScore} /></div>
              </Card>
            )}
            {tab === 'Intelligence' && (
              <>
                <Card title="Lead score breakdown">
                  <div className="flex items-center gap-4">
                    <div className="text-[34px] font-semibold" style={{ color: score >= 60 ? '#00A38D' : score >= 35 ? '#9B6A00' : '#516F90' }}>{score}</div>
                    <div className="flex-1"><div className="h-2 rounded-full bg-[#EAF0F6] overflow-hidden"><div className="h-full bg-[#FF5C35]" style={{ width: `${Math.min(100, score)}%` }} /></div><div className="text-[12.5px] text-[#516F90] mt-1">{score >= 60 ? 'Hot — ready for sales outreach' : score >= 35 ? 'Warm — keep nurturing' : 'Cold — early stage'}</div></div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mt-4"><Stat k="EMAIL ENGAGEMENT" v={`${c.events.filter((e: any) => e.type === 'email').length} touches`} /><Stat k="PAGE VIEWS" v={c.events.filter((e: any) => e.type === 'page').length} /><Stat k="FORM SUBMISSIONS" v={c.events.filter((e: any) => e.type === 'form').length} /></div>
                </Card>
                <Card title="Buying signals">
                  <ul className="text-[13.5px] space-y-1.5 list-disc pl-5 text-[#33475B]">
                    {c.webinarStatus === 'Attended' && <li>Attended the AI-Powered Ops Summit</li>}
                    <li>Visited pricing and platform pages recently</li>
                    {co && <li>{co.name} has {co.employees.toLocaleString()} employees in {co.industry}</li>}
                    {myDeals.length > 0 && <li>{myDeals.length} open deal{myDeals.length > 1 ? 's' : ''} at this company</li>}
                  </ul>
                </Card>
              </>
            )}
            {tab !== 'Intelligence' && <Timeline events={c.events} title={tab === 'Activities' ? 'All activities' : 'Recent activities'} />}
          </div>
        </>
      }
      right={
        <>
          <Assoc title="Companies" items={c.company ? [{ key: 'co', node: co ? <HLink onClick={() => go({ page: 'company', id: co.id })}>{co.name}</HLink> : <span>{c.company}</span> }] : []} />
          <Assoc title="Deals" items={myDeals.map((d) => ({ key: d.id, node: <div><HLink onClick={() => go({ page: 'deal', id: d.id })}>{d.name}</HLink><div className="text-[12px] text-[#516F90]">{hsMoney(d.amount)} · {d.stage}</div></div> }))} />
          <Assoc title="Lists" add={addList} items={inLists.map((l) => ({ key: l.id, node: <HLink onClick={() => go({ page: 'list', id: l.id })}>{l.name}</HLink> }))} />
          <Assoc title="Sequences" add={enroll} items={inSeq.map((s) => ({ key: s.id, node: <HLink onClick={() => go({ page: 'sequence', id: s.id })}>{s.name}</HLink> }))} />
          <Assoc title="Tickets" items={myTickets.map((t) => ({ key: t.id, node: <HLink onClick={() => go({ page: 'ticket', id: t.id })}>{t.subject}</HLink> }))} />
          <TaskList filter={(t) => t.contactId === id} />
        </>
      }
    />
  )
}

function ActionsMenu({ items }: { items: [string, () => void][] }) {
  const [o, setO] = useState(false)
  return (
    <div className="relative">
      <button data-agent="hs-actions-menu" onClick={() => setO(!o)} className="text-[#0091AE] font-medium flex items-center gap-1">Actions <ChevronDown size={13} /></button>
      {o && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setO(false)} />
          <div className="absolute right-0 top-7 z-20 w-[200px] bg-white border border-[#CBD6E2] rounded shadow-lg py-1">
            {items.map(([l, fn]) => <button key={l} onClick={() => { setO(false); fn() }} className="w-full text-left px-3 h-9 text-[13.5px] text-[#33475B] hover:bg-[#F5F8FA]">{l}</button>)}
          </div>
        </>
      )}
    </div>
  )
}

function EnrollModal({ contactId, name, onClose }: { contactId: string; name: string; onClose: () => void }) {
  const seqs = useCollection<any>('hubspot.sequences')
  const { isAgent } = useDesk()
  const { toast } = useHNav()
  const [sid, setSid] = useState('')
  const s = seqs.find((x) => x.id === sid)
  const go = () => {
    const at = new Date().toISOString()
    const by = isAgent ? 'hworker' : 'alex'
    db.update('hubspot.sequences', sid, (r) => ({ enrolled: [{ contactId, at, by, status: 'Active', step: 1 }, ...r.enrolled] }))
    db.update('hubspot.contacts', contactId, (r) => ({ sequences: [...(r.sequences ?? []), sid], leadStatus: 'In Progress', lastActivity: at, events: [{ type: 'sequence', title: `Enrolled in sequence: ${s.name}`, body: `By ${ME.name} · Step 1 of ${s.steps.length} scheduled for tomorrow 9:00 AM`, date: at, by: isAgent ? 'hworker' : undefined }, ...r.events] }))
    toast(`${name} enrolled.`)
    onClose()
  }
  return (
    <Modal title={`Enroll ${name} in sequence`} width={520} onClose={onClose} footer={<><HBtn variant="primary" small disabled={!s} onClick={go}>Enroll</HBtn><HBtn variant="secondary" small onClick={onClose}>Cancel</HBtn></>}>
      <Field label="Sequence">
        <select value={sid} onChange={(e) => setSid(e.target.value)} className={`${inputH} w-full`}>
          <option value="">Select a sequence</option>
          {seqs.filter((x) => !x.enrolled.some((e: any) => e.contactId === contactId)).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
        </select>
      </Field>
    </Modal>
  )
}

/* ───────────────────────── Company ───────────────────────── */
export function CompanyRecord({ id }: { id: string }) {
  const { go } = useHNav()
  const co = useRecord<any>('hubspot.companies', id)
  const contacts = useCollection<any>('hubspot.contacts')
  const deals = useCollection<any>('hubspot.deals')
  const [tab, setTab] = useState('Overview')
  if (!co) return <div className="p-8">Company not found</div>
  const people = contacts.filter((c) => c.company === co.name)
  const myDeals = deals.filter((d) => d.companyName === co.name || (d.companyName && co.name.startsWith(d.companyName)))
  const open$ = myDeals.filter(isOpenDeal)
  const won = myDeals.filter((d) => d.stage === 'Closed Won').reduce((t, d) => t + d.amount, 0)
  const events = [...(co.events ?? []), ...people.flatMap((p) => p.events.slice(0, 2).map((e: any) => ({ ...e, title: `${p.firstName} ${p.lastName}: ${e.title}` })))].sort((a, b) => +new Date(b.date) - +new Date(a.date))
  return (
    <Shell
      left={
        <>
          <div className="px-4 pt-3 text-[13px]"><HLink onClick={() => go({ page: 'companies' })}><span className="inline-flex items-center gap-1"><ChevronLeft size={14} /> Companies</span></HLink></div>
          <div className="px-4 pt-4 pb-4 border-b border-[#DFE3EB] flex flex-col items-center">
            <div className="flex items-start gap-3 w-full">
              <span className="w-14 h-14 rounded bg-[#EAF0F6] flex items-center justify-center text-[22px] font-bold text-[#516F90]">{co.name[0]}</span>
              <div className="min-w-0"><div className="text-[18px] font-semibold">{co.name}</div><div className="text-[13px] text-[#0091AE]">{co.domain}</div><div className="text-[13px] text-[#516F90]">{co.industry}</div></div>
            </div>
            <ActionBar col="hubspot.companies" id={id} name={co.name} />
          </div>
          <div className="px-4 py-3">
            <div className="text-[14px] font-semibold flex items-center gap-1 mb-1"><ChevronDown size={14} /> About this company</div>
            <EditableProp col="hubspot.companies" id={id} field="name" label="Company name" value={co.name} />
            <EditableProp col="hubspot.companies" id={id} field="domain" label="Company domain name" value={co.domain} />
            <OwnerProp col="hubspot.companies" id={id} ownerId={co.ownerId} />
            <EditableProp col="hubspot.companies" id={id} field="industry" label="Industry" value={co.industry} />
            <EditableProp col="hubspot.companies" id={id} field="employees" label="Number of employees" value={co.employees} number type="number" format={(v) => Number(v).toLocaleString()} />
            <EditableProp col="hubspot.companies" id={id} field="revenue" label="Annual revenue" value={co.revenue} number type="number" format={(v) => hsMoney(Number(v))} />
            <EditableProp col="hubspot.companies" id={id} field="city" label="City" value={co.city} />
            <EditableProp col="hubspot.companies" id={id} field="country" label="Country/Region" value={co.country} />
          </div>
        </>
      }
      main={
        <>
          <Tabs tabs={['Overview', 'Activities']} tab={tab} setTab={setTab} />
          <div className="p-5 space-y-4">
            <Card title="Data highlights"><div className="grid grid-cols-4 gap-4"><Stat k="CREATE DATE" v={hsDate(co.createDate, true)} /><Stat k="OPEN DEAL AMOUNT" v={hsMoney(open$.reduce((t, d) => t + d.amount, 0))} /><Stat k="CLOSED WON" v={hsMoney(won)} /><Stat k="CONTACTS" v={people.length} /></div></Card>
            <Card title={`Contacts (${people.length})`}>
              <table className="w-full text-[13.5px]"><tbody>{people.map((p) => <tr key={p.id} className="border-t border-[#DFE3EB]"><td className="py-2"><span className="flex items-center gap-2"><Initials name={`${p.firstName} ${p.lastName}`} size={24} /><HLink onClick={() => go({ page: 'contact', id: p.id })}>{p.firstName} {p.lastName}</HLink></span></td><td>{p.jobTitle}</td><td>{p.lifecycleStage}</td><td className="text-[#516F90]">{p.email}</td></tr>)}</tbody></table>
            </Card>
            <Timeline events={events} title={tab === 'Activities' ? 'All activities' : 'Recent activities'} />
          </div>
        </>
      }
      right={
        <>
          <Assoc title="Deals" items={myDeals.map((d) => ({ key: d.id, node: <div><HLink onClick={() => go({ page: 'deal', id: d.id })}>{d.name}</HLink><div className="text-[12px] text-[#516F90]">{hsMoney(d.amount)} · {d.stage}</div></div> }))} />
          <Assoc title="Contacts" items={people.map((p) => ({ key: p.id, node: <HLink onClick={() => go({ page: 'contact', id: p.id })}>{p.firstName} {p.lastName}</HLink> }))} />
          <TaskList filter={(t) => people.some((p) => p.id === t.contactId)} />
        </>
      }
    />
  )
}

/* ───────────────────────── Deal ───────────────────────── */
export function DealRecord({ id }: { id: string }) {
  const { go, open, toast } = useHNav()
  const { isAgent } = useDesk()
  const d = useRecord<any>('hubspot.deals', id)
  const contacts = useCollection<any>('hubspot.contacts')
  const companies = useCollection<any>('hubspot.companies')
  const quotes = useCollection<any>('hubspot.quotes')
  const [tab, setTab] = useState('Overview')
  if (!d) return <div className="p-8">Deal not found</div>
  const co = companies.find((c) => c.name === d.companyName || (d.companyName && c.name.startsWith(d.companyName)))
  const people = contacts.filter((c) => c.company === co?.name || c.company === d.companyName)
  const idx = STAGES.indexOf(d.stage)
  const closed = !isOpenDeal(d)
  const by = isAgent ? 'hworker' : undefined
  const move = (s: string) => { setDealStage(id, s, by); toast(`Deal moved to ${s}.`) }
  const del = () => open(
    <Modal title="Delete deal?" width={440} onClose={() => open(null)} footer={<><HBtn variant="primary" small onClick={() => { db.remove('hubspot.deals', id); open(null); go({ page: 'deals' }) }}>Delete</HBtn><HBtn variant="secondary" small onClick={() => open(null)}>Cancel</HBtn></>}>Delete <b>{d.name}</b>?</Modal>,
  )
  return (
    <Shell
      left={
        <>
          <div className="px-4 pt-3 flex items-center justify-between text-[13px]">
            <HLink onClick={() => go({ page: 'deals' })}><span className="inline-flex items-center gap-1"><ChevronLeft size={14} /> Deals</span></HLink>
            <ActionsMenu items={[['Create quote', () => go({ page: 'quote-new', dealId: id })], ['Mark as won', () => move('Closed Won')], ['Mark as lost', () => move('Closed Lost')], ['Delete', del]]} />
          </div>
          <div className="px-4 pt-4 pb-4 border-b border-[#DFE3EB]">
            <div className="text-[18px] font-semibold" data-agent="hs-deal-title">{d.name}</div>
            <div className="text-[22px] font-semibold mt-1">{hsMoney(d.amount)}</div>
            <div className="text-[13px] text-[#516F90]">Close date: {hsDate(d.closeDate)}</div>
            <ActionBar col="hubspot.deals" id={id} name={d.name} dealId={id} contactId={people[0]?.id} />
          </div>
          <div className="px-4 py-3">
            <div className="text-[14px] font-semibold flex items-center gap-1 mb-1"><ChevronDown size={14} /> About this deal</div>
            <EditableProp col="hubspot.deals" id={id} field="name" label="Deal name" value={d.name} />
            <EditableProp col="hubspot.deals" id={id} field="amount" label="Amount" value={d.amount} number type="number" format={(v) => hsMoney(Number(v))} />
            <EditableProp col="hubspot.deals" id={id} field="closeDate" label="Close date" value={d.closeDate?.slice(0, 10)} type="date" format={(v) => hsDate(v)} />
            <EditableProp col="hubspot.deals" id={id} field="priority" label="Priority" value={d.priority} options={['High', 'Medium', 'Low']} />
            <OwnerProp col="hubspot.deals" id={id} ownerId={d.ownerId} />
            <EditableProp col="hubspot.deals" id={id} field="pipeline" label="Pipeline" value={d.pipeline} readOnly />
          </div>
        </>
      }
      main={
        <>
          <Tabs tabs={['Overview', 'Activities']} tab={tab} setTab={setTab} />
          <div className="p-5 space-y-4">
            <div className="bg-white border border-[#DFE3EB] rounded-[4px] p-4">
              <div className="flex items-center gap-1" data-agent="hs-deal-stages">
                {STAGES.slice(0, 5).map((s, i) => (
                  <button key={s} aria-label={s} data-agent={`hs-deal-stage-${i}`} onClick={() => move(s)} className={`flex-1 h-9 text-[12.5px] font-medium px-2 truncate relative ${closed ? 'bg-[#EAF0F6] text-[#7C98B6]' : i <= idx ? 'bg-[#00A4BD] text-white' : 'bg-[#EAF0F6] text-[#516F90] hover:bg-[#D6E4EE]'} ${i === 0 ? 'rounded-l-full' : ''}`} style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%, 10px 50%)', marginLeft: i ? -6 : 0 }}>{s}</button>
                ))}
                <button onClick={() => move('Closed Won')} className={`h-9 px-3 text-[12.5px] font-medium rounded-r-full ml-1 flex items-center gap-1 ${d.stage === 'Closed Won' ? 'bg-[#00BDA5] text-white' : 'bg-[#E5F8F6] text-[#00826F] hover:bg-[#C9F0EA]'}`}><Trophy size={13} /> Won</button>
                <button onClick={() => move('Closed Lost')} className={`h-9 px-3 text-[12.5px] font-medium rounded-full flex items-center gap-1 ${d.stage === 'Closed Lost' ? 'bg-[#F2545B] text-white' : 'bg-[#FDEDEE] text-[#C93B44] hover:bg-[#FAD6D8]'}`}><X size={13} /> Lost</button>
              </div>
              <div className="grid grid-cols-4 gap-4 mt-4"><Stat k="DEAL STAGE" v={<Pill>{d.stage}</Pill>} /><Stat k="WIN PROBABILITY" v={`${Math.round(STAGE_PROB[idx] * 100)}%`} /><Stat k="WEIGHTED AMOUNT" v={hsMoney(weighted(d))} /><Stat k="PRIORITY" v={<Pill color={priorityStyle[d.priority]?.[0]} text={priorityStyle[d.priority]?.[1]}>{d.priority}</Pill>} /></div>
            </div>
            <Timeline events={d.events ?? []} title={tab === 'Activities' ? 'All activities' : 'Recent activities'} />
          </div>
        </>
      }
      right={
        <>
          <Assoc title="Companies" items={co ? [{ key: co.id, node: <HLink onClick={() => go({ page: 'company', id: co.id })}>{co.name}</HLink> }] : []} />
          <Assoc title="Contacts" items={people.map((p) => ({ key: p.id, node: <div><HLink onClick={() => go({ page: 'contact', id: p.id })}>{p.firstName} {p.lastName}</HLink><div className="text-[12px] text-[#516F90]">{p.jobTitle}</div></div> }))} />
          <Assoc
            title="Quotes"
            agent="hs-assoc-quotes"
            add={() => go({ page: 'quote-new', dealId: id })}
            items={quotes.filter((q) => q.dealId === id).map((q) => ({ key: q.id, node: <div className="flex items-center gap-2"><div className="flex-1 min-w-0"><HLink onClick={() => go({ page: 'quote', id: q.id })}>{q.number}</HLink><div className="text-[12px] text-[#516F90] truncate">{hsMoney(quoteTotals(q.lines).total)} · expires {hsDate(q.expires)}</div></div><Pill>{q.status}</Pill></div> }))}
          />
          <TaskList filter={(t) => t.dealId === id} />
          <div className="text-[12px] text-[#516F90] flex items-center gap-1.5"><Initials name={person(d.ownerId).name} size={18} /> Owned by {person(d.ownerId).name}</div>
        </>
      }
    />
  )
}
