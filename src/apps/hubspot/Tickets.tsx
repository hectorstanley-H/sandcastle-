import { useState } from 'react'
import { ChevronLeft, LayoutGrid, List, Lock, Plus, Search } from 'lucide-react'
import { db, uid, useCollection, useRecord } from '@/db/db'
import { useDesk } from '@/os/context'
import { ME, person } from '@/data/people'
import { Field, HBtn, HLink, HWTag, Initials, Modal, Pill, hsDate, inputH, priorityStyle, useHNav } from './ui'
import { TICKET_CATEGORY, TICKET_STATUS, runWorkflows } from './store'
import { OWNERS } from './owners'

const stColor: Record<string, [string, string]> = { New: ['#E5F5F8', '#007A8C'], 'Waiting on contact': ['#FFF4DC', '#9B6A00'], 'Waiting on us': ['#FDEDEE', '#C93B44'], Closed: ['#E5F8F6', '#00826F'] }

export function TicketsIndex() {
  const { go, open, toast } = useHNav()
  const tickets = useCollection<any>('hubspot.tickets')
  const contacts = useCollection<any>('hubspot.contacts')
  const [board, setBoard] = useState(true)
  const [q, setQ] = useState('')
  const [mine, setMine] = useState(false)
  const [drag, setDrag] = useState<string | null>(null)
  const rows = tickets.filter((t) => (!mine || t.ownerId === ME.id) && (!q || `${t.subject} ${t.number}`.toLowerCase().includes(q.toLowerCase()))).sort((a, b) => +new Date(b.createDate) - +new Date(a.createDate))
  const contact = (id: string) => contacts.find((c) => c.id === id)
  const th = 'text-left text-[12px] font-semibold uppercase tracking-wide px-3 h-10 border-b border-[#DFE3EB] bg-[#F5F8FA] whitespace-nowrap'
  const td = 'px-3 h-12 border-b border-[#DFE3EB] text-[13.5px] whitespace-nowrap'
  return (
    <div className="min-h-full bg-white">
      <div className="px-6 pt-5 pb-3 border-b border-[#DFE3EB] flex items-center gap-3">
        <h1 className="text-[22px] font-medium">Tickets</h1>
        <span className="text-[13px] text-[#516F90] mt-1">{tickets.filter((t) => t.status !== 'Closed').length} open</span>
        <div className="flex-1" />
        <HBtn variant="primary" small agent="hs-create-ticket" onClick={() => open(<NewTicket onDone={(id) => { open(null); toast('Ticket created.'); go({ page: 'ticket', id }) }} />)}><Plus size={14} /> Create ticket</HBtn>
      </div>
      <div className="flex items-center gap-2 px-6 py-3 border-b border-[#DFE3EB]">
        <div className="flex border border-[#CBD6E2] rounded-[3px] overflow-hidden">
          <button aria-label="Board" onClick={() => setBoard(true)} className={`w-9 h-8 flex items-center justify-center ${board ? 'bg-[#EAF0F6]' : ''}`}><LayoutGrid size={15} /></button>
          <button aria-label="List" onClick={() => setBoard(false)} className={`w-9 h-8 flex items-center justify-center border-l border-[#CBD6E2] ${!board ? 'bg-[#EAF0F6]' : ''}`}><List size={15} /></button>
        </div>
        <div className="flex items-center h-8 w-[260px] border border-[#CBD6E2] rounded-[3px] px-2 gap-1.5"><input aria-label="Search tickets" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tickets" className="flex-1 outline-none text-[13px]" /><Search size={14} className="text-[#7C98B6]" /></div>
        <label className="flex items-center gap-2 text-[13px] ml-2"><input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} /> My tickets</label>
      </div>
      {board ? (
        <div className="flex gap-3 p-4 overflow-x-auto bg-[#F5F8FA] min-h-[520px]">
          {TICKET_STATUS.map((s) => {
            const list = rows.filter((t) => t.status === s)
            return (
              <div key={s} className="w-[280px] shrink-0" onDragOver={(e) => e.preventDefault()} onDrop={() => { if (drag) { db.update('hubspot.tickets', drag, { status: s, lastUpdated: new Date().toISOString() }); setDrag(null) } }}>
                <div className="h-11 px-3 flex items-center justify-between bg-white border border-[#DFE3EB] rounded-t-[3px]"><span className="text-[12px] font-semibold uppercase tracking-wide">{s}</span><span className="text-[12px] bg-[#EAF0F6] rounded-full px-2">{list.length}</span></div>
                <div className="bg-[#EAF0F6]/60 border border-t-0 border-[#DFE3EB] p-2 space-y-2 min-h-[160px]">
                  {list.map((t) => (
                    <div key={t.id} draggable onDragStart={() => setDrag(t.id)} className="bg-white rounded-[3px] border border-[#DFE3EB] p-3 cursor-grab shadow-[0_1px_2px_rgba(45,62,80,0.12)]">
                      <HLink agent={`hs-ticket-card-${t.id}`} className="text-[13.5px]" onClick={() => go({ page: 'ticket', id: t.id })}>{t.subject}</HLink>
                      <div className="text-[12px] text-[#516F90] mt-1">#{t.number} · {contact(t.contactId)?.company}</div>
                      <div className="flex items-center gap-2 mt-2"><Initials name={person(t.ownerId).name} size={20} /><Pill color={priorityStyle[t.priority]?.[0]} text={priorityStyle[t.priority]?.[1]}>{t.priority}</Pill></div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <table className="w-full border-collapse">
          <thead><tr>{['Ticket', 'Status', 'Priority', 'Contact', 'Category', 'Owner', 'Created', 'Last updated'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
          <tbody>{rows.map((t) => (
            <tr key={t.id} className="hover:bg-[#F5F8FA]">
              <td className={td}><HLink agent={`hs-ticket-row-${t.id}`} onClick={() => go({ page: 'ticket', id: t.id })}>{t.subject}</HLink></td>
              <td className={td}><Pill color={stColor[t.status][0]} text={stColor[t.status][1]}>{t.status}</Pill></td>
              <td className={td}><Pill color={priorityStyle[t.priority]?.[0]} text={priorityStyle[t.priority]?.[1]}>{t.priority}</Pill></td>
              <td className={td}>{contact(t.contactId)?.firstName} {contact(t.contactId)?.lastName}</td>
              <td className={td}>{t.category}</td><td className={td}>{person(t.ownerId).name}</td><td className={td}>{hsDate(t.createDate)}</td><td className={td}>{hsDate(t.lastUpdated, true)}</td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </div>
  )
}

function NewTicket({ onDone }: { onDone: (id: string) => void }) {
  const { open } = useHNav()
  const contacts = useCollection<any>('hubspot.contacts')
  const tickets = useCollection<any>('hubspot.tickets')
  const [v, setV] = useState({ subject: '', content: '', contactId: '', priority: 'Medium', category: TICKET_CATEGORY[0], ownerId: ME.id })
  const set = (k: string, x: string) => setV((s) => ({ ...s, [k]: x }))
  const save = () => {
    const id = uid('hstk')
    const now = new Date().toISOString()
    db.insert('hubspot.tickets', { id, number: 4100 + tickets.length * 7 + 3, subject: v.subject, category: v.category, priority: v.priority, status: 'New', contactId: v.contactId, ownerId: v.ownerId, source: 'Manual', createDate: now, lastUpdated: now, replies: v.content ? [{ kind: 'customer', by: v.contactId, body: v.content, date: now }] : [] }, { prepend: true })
    runWorkflows('ticket_created', id)
    onDone(id)
  }
  return (
    <Modal title="Create ticket" onClose={() => open(null)} footer={<><HBtn variant="primary" small agent="hs-ticket-save" disabled={!v.subject || !v.contactId} onClick={save}>Create</HBtn><HBtn variant="secondary" small onClick={() => open(null)}>Cancel</HBtn></>}>
      <Field label="Ticket name"><input data-agent="hs-ticket-subject" aria-label="Ticket name" value={v.subject} onChange={(e) => set('subject', e.target.value)} className={`${inputH} w-full`} /></Field>
      <Field label="Description"><textarea value={v.content} onChange={(e) => set('content', e.target.value)} rows={4} className="w-full p-3 rounded-[3px] border border-[#CBD6E2] bg-[#F5F8FA] outline-none text-[14px]" /></Field>
      <Field label="Contact"><select value={v.contactId} onChange={(e) => set('contactId', e.target.value)} className={`${inputH} w-full`}><option value="">Select a contact</option>{contacts.map((c) => <option key={c.id} value={c.id}>{c.firstName} {c.lastName} — {c.company}</option>)}</select></Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Priority"><select value={v.priority} onChange={(e) => set('priority', e.target.value)} className={`${inputH} w-full`}>{['High', 'Medium', 'Low'].map((o) => <option key={o}>{o}</option>)}</select></Field>
        <Field label="Category"><select value={v.category} onChange={(e) => set('category', e.target.value)} className={`${inputH} w-full`}>{TICKET_CATEGORY.map((o) => <option key={o}>{o}</option>)}</select></Field>
        <Field label="Owner"><select value={v.ownerId} onChange={(e) => set('ownerId', e.target.value)} className={`${inputH} w-full`}>{OWNERS.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></Field>
      </div>
    </Modal>
  )
}

export function TicketRecord({ id }: { id: string }) {
  const { go, toast } = useHNav()
  const { isAgent } = useDesk()
  const t = useRecord<any>('hubspot.tickets', id)
  const contacts = useCollection<any>('hubspot.contacts')
  const [mode, setMode] = useState<'reply' | 'note'>('reply')
  const [body, setBody] = useState('')
  if (!t) return <div className="p-8">Ticket not found</div>
  const c = contacts.find((x) => x.id === t.contactId)
  const send = () => {
    const now = new Date().toISOString()
    db.update('hubspot.tickets', id, (r) => ({ lastUpdated: now, status: mode === 'reply' && r.status !== 'Closed' ? 'Waiting on contact' : r.status, replies: [...r.replies, { kind: mode, by: isAgent ? 'hworker' : ME.id, body, date: now }] }))
    setBody('')
    toast(mode === 'reply' ? 'Reply sent.' : 'Note added.')
  }
  const set = (patch: any) => db.update('hubspot.tickets', id, { ...patch, lastUpdated: new Date().toISOString() })
  return (
    <div className="flex min-h-full bg-[#F5F8FA]">
      <div className="w-[320px] shrink-0 bg-white border-r border-[#DFE3EB] p-4">
        <HLink onClick={() => go({ page: 'tickets' })} className="text-[13px]"><span className="inline-flex items-center gap-1"><ChevronLeft size={14} /> Tickets</span></HLink>
        <h1 className="text-[18px] font-semibold mt-3" data-agent="hs-ticket-title">{t.subject}</h1>
        <div className="text-[13px] text-[#516F90]">Ticket #{t.number} · via {t.source}</div>
        <div className="mt-4 space-y-3 text-[13.5px]">
          <Field label="Ticket status"><select data-agent="hs-ticket-status" aria-label="Ticket status" value={t.status} onChange={(e) => set({ status: e.target.value })} className={`${inputH} w-full`}>{TICKET_STATUS.map((s) => <option key={s}>{s}</option>)}</select></Field>
          <Field label="Priority"><select value={t.priority} onChange={(e) => set({ priority: e.target.value })} className={`${inputH} w-full`}>{['High', 'Medium', 'Low'].map((s) => <option key={s}>{s}</option>)}</select></Field>
          <Field label="Category"><select value={t.category} onChange={(e) => set({ category: e.target.value })} className={`${inputH} w-full`}>{TICKET_CATEGORY.map((s) => <option key={s}>{s}</option>)}</select></Field>
          <Field label="Ticket owner"><select value={t.ownerId} onChange={(e) => set({ ownerId: e.target.value })} className={`${inputH} w-full`}>{OWNERS.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></Field>
          <div className="text-[12px] text-[#516F90]">Created {hsDate(t.createDate, true)}</div>
        </div>
      </div>
      <div className="flex-1 min-w-0 p-5 space-y-3">
        <div className="bg-white border border-[#DFE3EB] rounded-[4px]">
          <div className="px-4 py-3 border-b border-[#DFE3EB] text-[15px] font-semibold">Conversation</div>
          <div className="p-4 space-y-3">
            {t.replies.map((r: any, i: number) => {
              const mineMsg = r.kind !== 'customer'
              const who = mineMsg ? person(r.by === 'hworker' ? 'alex' : r.by).name : c ? `${c.firstName} ${c.lastName}` : 'Customer'
              return (
                <div key={i} className={`flex gap-3 ${r.kind === 'note' ? 'bg-[#FFF8E5] border border-[#F5C26B]' : mineMsg ? 'bg-[#EAF5F8]' : 'bg-[#F5F8FA]'} rounded-[4px] p-3 ${r.by === 'hworker' ? 'flash-new' : ''}`}>
                  <Initials name={who} size={30} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] flex items-center gap-2"><b>{who}</b>{r.kind === 'note' && <span className="inline-flex items-center gap-1 text-[11.5px] text-[#9B6A00]"><Lock size={11} /> Internal note</span>}{r.by === 'hworker' && <HWTag />}<span className="ml-auto text-[12px] text-[#516F90]">{hsDate(r.date, true)}</span></div>
                    <div className="text-[13.5px] mt-1 whitespace-pre-wrap">{r.body}</div>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="border-t border-[#DFE3EB] p-4">
            <div className="flex gap-4 mb-2 text-[13.5px]">{(['reply', 'note'] as const).map((m) => <button key={m} onClick={() => setMode(m)} className={mode === m ? 'font-semibold border-b-2 border-[#FF5C35]' : 'text-[#516F90]'}>{m === 'reply' ? 'Reply' : 'Internal note'}</button>)}</div>
            <textarea data-agent="hs-ticket-reply" aria-label="Reply" value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder={mode === 'reply' ? `Reply to ${c?.firstName ?? 'customer'}…` : 'Leave a note for your team…'} className="w-full p-3 rounded-[3px] border border-[#CBD6E2] bg-[#F5F8FA] outline-none focus:bg-white text-[14px]" />
            <div className="mt-2 flex gap-2"><HBtn variant="primary" small agent="hs-ticket-send" disabled={!body.trim()} onClick={send}>{mode === 'reply' ? 'Send' : 'Add note'}</HBtn>{t.status !== 'Closed' && <HBtn variant="ghost" small onClick={() => set({ status: 'Closed' })}>Close ticket</HBtn>}</div>
          </div>
        </div>
      </div>
      <div className="w-[300px] shrink-0 bg-white border-l border-[#DFE3EB] p-4">
        <div className="text-[14px] font-semibold mb-2">Contact</div>
        {c && (
          <div className="border border-[#DFE3EB] rounded p-3 text-[13px]">
            <div className="flex items-center gap-2"><Initials name={`${c.firstName} ${c.lastName}`} size={28} /><HLink onClick={() => go({ page: 'contact', id: c.id })}>{c.firstName} {c.lastName}</HLink></div>
            <div className="text-[#516F90] mt-2">{c.jobTitle}</div><div className="text-[#516F90]">{c.company}</div><div className="text-[#0091AE] mt-1">{c.email}</div>
          </div>
        )}
      </div>
    </div>
  )
}
