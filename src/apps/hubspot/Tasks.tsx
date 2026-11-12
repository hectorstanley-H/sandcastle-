import { useState } from 'react'
import { Calendar, Check, Mail, Phone, Plus, SquareCheck, Trash2 } from 'lucide-react'
import { db, useCollection } from '@/db/db'
import { ME, person } from '@/data/people'
import { Field, HBtn, HLink, Modal, Pill, hsDate, inputH, priorityStyle, useHNav } from './ui'
import { createTask } from './store'
import { OWNERS } from './owners'

const typeIcon: Record<string, any> = { 'To-do': SquareCheck, Call: Phone, Email: Mail }
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()

export function TasksPage() {
  const { go, open, toast } = useHNav()
  const tasks = useCollection<any>('hubspot.tasks')
  const contacts = useCollection<any>('hubspot.contacts')
  const [q, setQ] = useState('Due today')
  const [owner, setOwner] = useState(ME.id)
  const sod = startOfDay(new Date())
  const state = (t: any) => (t.status === 'Completed' ? 'done' : new Date(t.dueDate).getTime() < sod ? 'overdue' : startOfDay(new Date(t.dueDate)) === sod ? 'today' : 'upcoming')
  const mine = tasks.filter((t) => !owner || t.ownerId === owner)
  const QUEUES: [string, (t: any) => boolean][] = [
    ['All tasks', (t) => t.status !== 'Completed'],
    ['Due today', (t) => state(t) === 'today'],
    ['Overdue', (t) => state(t) === 'overdue'],
    ['Upcoming', (t) => state(t) === 'upcoming'],
    ['Completed', (t) => t.status === 'Completed'],
  ]
  const rows = mine.filter(QUEUES.find(([l]) => l === q)![1]).sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate))
  const th = 'text-left text-[12px] font-semibold uppercase tracking-wide px-3 h-10 border-b border-[#DFE3EB] bg-[#F5F8FA] whitespace-nowrap'
  const td = 'px-3 h-12 border-b border-[#DFE3EB] text-[13.5px]'
  return (
    <div className="min-h-full bg-white">
      <div className="px-6 pt-5 pb-3 border-b border-[#DFE3EB] flex items-center gap-3">
        <h1 className="text-[22px] font-medium flex-1">Tasks</h1>
        <select aria-label="Owner" value={owner} onChange={(e) => setOwner(e.target.value)} className={`${inputH} h-8`}><option value="">All owners</option>{OWNERS.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select>
        <HBtn variant="primary" small agent="hs-create-task" onClick={() => open(<NewTask onDone={() => { open(null); toast('Task created.') }} />)}><Plus size={14} /> Create task</HBtn>
      </div>
      <div className="flex gap-1 px-6 border-b border-[#DFE3EB]">
        {QUEUES.map(([l, fn]) => (
          <button key={l} data-agent={`hs-task-queue-${l.toLowerCase().replace(/\s+/g, '-')}`} onClick={() => setQ(l)} className={`h-11 px-3 text-[14px] relative flex items-center gap-2 ${q === l ? 'font-semibold' : 'text-[#516F90]'}`}>
            {l}<span className="text-[11.5px] px-1.5 rounded-full bg-[#EAF0F6]">{mine.filter(fn).length}</span>
            {q === l && <span className="absolute left-0 right-0 bottom-0 h-[3px] bg-[#33475B]" />}
          </button>
        ))}
      </div>
      <table className="w-full border-collapse">
        <thead><tr><th className={`${th} w-12`} />{['Title', 'Associated with', 'Type', 'Priority', 'Due date', 'Assigned to', ''].map((h, i) => <th key={i} className={th}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.map((t) => {
            const c = contacts.find((x) => x.id === t.contactId)
            const I = typeIcon[t.type] ?? SquareCheck
            const st = state(t)
            return (
              <tr key={t.id} className="hover:bg-[#F5F8FA]">
                <td className={td}><button data-agent={`hs-task-check-${t.id}`} aria-label="Complete task" onClick={() => db.update('hubspot.tasks', t.id, { status: t.status === 'Completed' ? 'Not started' : 'Completed' })} className={`w-5 h-5 rounded-[3px] border flex items-center justify-center ${t.status === 'Completed' ? 'bg-[#00BDA5] border-[#00BDA5] text-white' : 'border-[#7C98B6]'}`}>{t.status === 'Completed' && <Check size={13} />}</button></td>
                <td className={`${td} ${t.status === 'Completed' ? 'line-through text-[#7C98B6]' : 'font-medium'}`}>{t.title}</td>
                <td className={td}>{c ? <HLink onClick={() => go({ page: 'contact', id: c.id })}>{c.firstName} {c.lastName}</HLink> : '--'}</td>
                <td className={td}><span className="inline-flex items-center gap-1.5 text-[#516F90]"><I size={14} /> {t.type}</span></td>
                <td className={td}><Pill color={priorityStyle[t.priority]?.[0]} text={priorityStyle[t.priority]?.[1]}>{t.priority}</Pill></td>
                <td className={`${td} ${st === 'overdue' ? 'text-[#C93B44] font-semibold' : ''}`}><span className="inline-flex items-center gap-1.5"><Calendar size={13} /> {hsDate(t.dueDate, true)}</span></td>
                <td className={td}>{person(t.ownerId).name}</td>
                <td className={td}><button aria-label="Delete task" onClick={() => db.remove('hubspot.tasks', t.id)} className="text-[#7C98B6] hover:text-[#C93B44]"><Trash2 size={15} /></button></td>
              </tr>
            )
          })}
          {!rows.length && <tr><td colSpan={8} className="text-center py-16 text-[#516F90]">Nothing here — nice work!</td></tr>}
        </tbody>
      </table>
    </div>
  )
}

function NewTask({ onDone }: { onDone: () => void }) {
  const { open } = useHNav()
  const contacts = useCollection<any>('hubspot.contacts')
  const [title, setTitle] = useState('')
  const [type, setType] = useState('To-do')
  const [priority, setPriority] = useState('Medium')
  const [due, setDue] = useState(new Date().toISOString().slice(0, 10))
  const [contactId, setContactId] = useState('')
  const [ownerId, setOwnerId] = useState(ME.id)
  return (
    <Modal title="Create task" onClose={() => open(null)} agent="hs-task-modal" footer={<><HBtn variant="primary" small agent="hs-task-save" disabled={!title.trim()} onClick={() => { createTask({ title, type, priority, dueDate: new Date(due + 'T12:00').toISOString(), ownerId, contactId: contactId || undefined }); onDone() }}>Create</HBtn><HBtn variant="secondary" small onClick={() => open(null)}>Cancel</HBtn></>}>
      <Field label="Title"><input data-agent="hs-task-title" aria-label="Title" value={title} onChange={(e) => setTitle(e.target.value)} className={`${inputH} w-full`} /></Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Type"><select value={type} onChange={(e) => setType(e.target.value)} className={`${inputH} w-full`}>{['To-do', 'Call', 'Email'].map((o) => <option key={o}>{o}</option>)}</select></Field>
        <Field label="Priority"><select value={priority} onChange={(e) => setPriority(e.target.value)} className={`${inputH} w-full`}>{['High', 'Medium', 'Low'].map((o) => <option key={o}>{o}</option>)}</select></Field>
        <Field label="Due date"><input type="date" value={due} onChange={(e) => setDue(e.target.value)} className={`${inputH} w-full`} /></Field>
      </div>
      <Field label="Associated contact"><select value={contactId} onChange={(e) => setContactId(e.target.value)} className={`${inputH} w-full`}><option value="">None</option>{contacts.map((c) => <option key={c.id} value={c.id}>{c.firstName} {c.lastName} — {c.company}</option>)}</select></Field>
      <Field label="Assigned to"><select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className={`${inputH} w-full`}>{OWNERS.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></Field>
    </Modal>
  )
}
