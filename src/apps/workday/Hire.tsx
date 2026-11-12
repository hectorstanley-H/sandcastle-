import { useState } from 'react'
import { Check, CheckCircle2, ChevronLeft, ClipboardCheck, UserPlus } from 'lucide-react'
import { db, uid, useRecord } from '@/db/db'
import { useDesk } from '@/os/context'
import { ME, PEOPLE, person } from '@/data/people'
import { Avatar } from '@/components/Avatar'
import { Btn, Card, Field, HWorkerChip, Pill, AppIcon, Modal, inputCls, textareaCls } from './ui'
import type { Nav } from './index'
import { fmtLong, fmtMDY } from './util'

const POSITIONS = [
  { id: 'P-00487', label: 'P-00487 Operations Analyst (Unfilled)', title: 'Operations Analyst', profile: '41203 — Operations Analyst', grade: 'P3', range: [78000, 104000] },
  { id: 'P-00492', label: 'P-00492 Operations Coordinator II (Unfilled)', title: 'Operations Coordinator II', profile: '41188 — Operations Coordinator', grade: 'P1', range: [52000, 70000] },
]
const STEPS = ['Position', 'Hire Details', 'Compensation', 'Review'] as const

export function HirePage({ nav, workerId }: { nav: Nav; workerId: string }) {
  const onb = useRecord<any>('workday.onboarding', 'onb-' + workerId.replace('wd-', ''))
  const w = useRecord<any>('workday.workers', workerId)
  if (!onb || !w) return <div className="p-10 text-[14px]">No onboarding found.</div>
  return onb.hireDone ? <Onboarding nav={nav} onb={onb} w={w} /> : <HireSteps onb={onb} w={w} nav={nav} />
}

function HireSteps({ onb, w, nav }: { onb: any; w: any; nav: Nav }) {
  const { isAgent } = useDesk()
  const [step, setStep] = useState(0)
  // a person returning to a saved draft gets their entries back (agents always start from a clean form)
  const blank = { position: '', location: 'Boston, MA — One Federal', start: onb.startDate as string, reason: '', employeeType: 'Regular', timeType: 'Full time', base: '', frequency: 'Annual' }
  const [f, setF] = useState(() => (!isAgent && onb.hireDraft ? { ...blank, ...onb.hireDraft } : blank))
  const [err, setErr] = useState('')
  const [savedAt, setSavedAt] = useState<string | null>(!isAgent && onb.hireDraftAt ? onb.hireDraftAt : null)
  const saveForLater = () => {
    const at = new Date().toISOString()
    db.update('workday.onboarding', onb.id, { hireDraft: f, hireDraftAt: at })
    setSavedAt(at)
  }
  const pos = POSITIONS.find((p) => p.id === f.position)
  const set = (k: keyof typeof f) => (e: any) => {
    setF({ ...f, [k]: e.target.value })
    setErr('')
  }
  const next = () => {
    if (step === 0 && !f.position) return setErr('Position is required.')
    if (step === 1 && (!f.start || !f.reason)) return setErr('Hire Date and Reason are required.')
    if (step === 2 && !Number(String(f.base).replace(/[^0-9.]/g, ''))) return setErr('Amount is required.')
    setStep(step + 1)
  }
  const submit = () => {
    const base = Number(String(f.base).replace(/[^0-9.]/g, ''))
    db.update('workday.workers', w.id, {
      status: 'Hired',
      title: pos?.title ?? w.title,
      positionId: f.position,
      hireDate: f.start,
      employeeType: f.employeeType,
      timeType: f.timeType,
      employeeId: '1' + (21000 + Math.floor(Math.random() * 900)),
      compensation: { plan: 'Base Salary — US', grade: pos?.grade ?? 'P2', base, frequency: f.frequency, bonusTarget: 10, effective: f.start },
      balances: { vacation: 0, sick: 5, floating: 1 },
      updatedBy: isAgent ? 'hworker' : undefined,
    })
    db.update('workday.onboarding', onb.id, { hireDone: true, status: 'Onboarding', startDate: f.start, positionId: f.position, base, steps: { position: true, details: true, compensation: true }, updatedBy: isAgent ? 'hworker' : undefined, hiredAt: new Date().toISOString() })
    db.update('workday.tasks', 'wt-hire-jordan', { status: 'done', completedAt: new Date().toISOString(), outcome: 'Submitted', updatedBy: isAgent ? 'hworker' : undefined })
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 overflow-auto">
        <div className="max-w-[1180px] mx-auto px-10 py-7">
          <div className="flex items-start gap-4 mb-6">
            <AppIcon icon={<UserPlus size={22} />} color="#005CB9" size={48} />
            <div className="flex-1">
              <h1 className="text-[28px] font-bold leading-tight">Hire Employee</h1>
              <div className="text-[14px] text-[#5E6A75] mt-1 flex items-center gap-2">
                <Avatar id={w.personId} size={22} /> {w.name} (Pre-Hire) · Supervisory Organization: Operations (Alex Morgan)
              </div>
            </div>
            <Pill tone="orange">In Progress</Pill>
          </div>
          <div className="grid grid-cols-[240px_minmax(0,1fr)] gap-6">
            <div className="bg-white rounded-2xl border border-[#E8EBED] p-4 h-fit">
              <div className="text-[13px] font-bold text-[#5E6A75] uppercase tracking-wide px-2 mb-2">Steps</div>
              {STEPS.map((s, i) => (
                <div key={s} className={`flex items-center gap-3 px-2 h-11 rounded-xl ${i === step ? 'bg-[#D7EAFC]' : ''}`}>
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-bold ${i < step ? 'bg-[#319C4C] text-white' : i === step ? 'bg-[#0875E1] text-white' : 'bg-[#E8EBED] text-[#5E6A75]'}`}>{i < step ? <Check size={15} /> : i + 1}</span>
                  <span className={`text-[14px] ${i === step ? 'font-bold text-[#005CB9]' : 'text-[#333]'}`}>{s}</span>
                </div>
              ))}
              <div className="border-t border-[#E8EBED] mt-3 pt-3 px-2 text-[12.5px] text-[#5E6A75] leading-relaxed">
                Initiated by <b className="text-[#333]">James Whitaker</b> (HR Partner). Up next after submit: Onboarding, IT Provisioning, Benefits Event.
              </div>
            </div>
            <Card title={STEPS[step]} agent="workday-hire-form">
              <div className="px-6 pb-2">
                {err && <div className="rounded-lg border border-[#DE2E21] bg-[#FDE2E0] px-4 py-2.5 text-[13.5px] text-[#A31B12] font-medium mb-2">{err}</div>}
                {step === 0 && (
                  <>
                    <Field label="Supervisory Organization">
                      <div className="pt-2.5 text-[14px] font-medium">Operations (Alex Morgan)</div>
                    </Field>
                    <Field label="Position" required>
                      <select data-agent="workday-hire-position" aria-label="Position" value={f.position} onChange={set('position')} className={inputCls}>
                        <option value="">select one</option>
                        {POSITIONS.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Job Profile">
                      <div className="pt-2.5 text-[14px]">{pos?.profile ?? '—'}</div>
                    </Field>
                    <Field label="Location" required>
                      <select data-agent="workday-hire-location" aria-label="Location" value={f.location} onChange={set('location')} className={inputCls}>
                        {['Boston, MA — One Federal', 'New York, NY — Hudson Yards', 'Chicago, IL — Fulton Market', 'Remote — US'].map((l) => (
                          <option key={l}>{l}</option>
                        ))}
                      </select>
                    </Field>
                  </>
                )}
                {step === 1 && (
                  <>
                    <Field label="Hire Date" required hint="Workers can't be paid before the hire date.">
                      <input type="date" data-agent="workday-hire-start" aria-label="Hire Date" value={f.start} onChange={set('start')} className={inputCls} />
                    </Field>
                    <Field label="Reason" required>
                      <select data-agent="workday-hire-reason" aria-label="Reason" value={f.reason} onChange={set('reason')} className={inputCls}>
                        <option value="">select one</option>
                        <option value="fill">Hire Employee &gt; New Hire &gt; Fill Vacancy</option>
                        <option value="new">Hire Employee &gt; New Hire &gt; New Position</option>
                        <option value="rehire">Hire Employee &gt; Rehire</option>
                      </select>
                    </Field>
                    <Field label="Employee Type" required>
                      <select data-agent="workday-hire-type" aria-label="Employee Type" value={f.employeeType} onChange={set('employeeType')} className={inputCls}>
                        {['Regular', 'Temporary', 'Intern'].map((x) => (
                          <option key={x}>{x}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Time Type" required>
                      <select data-agent="workday-hire-timetype" aria-label="Time Type" value={f.timeType} onChange={set('timeType')} className={inputCls}>
                        {['Full time', 'Part time'].map((x) => (
                          <option key={x}>{x}</option>
                        ))}
                      </select>
                    </Field>
                  </>
                )}
                {step === 2 && (
                  <>
                    <Field label="Compensation Package">
                      <div className="pt-2.5 text-[14px]">Northwind Salaried — US</div>
                    </Field>
                    <Field label="Grade">
                      <div className="pt-2.5 text-[14px]">
                        {pos?.grade ?? 'P2'} · Range ${((pos?.range[0] ?? 62000) / 1000).toFixed(0)}K – ${((pos?.range[1] ?? 86000) / 1000).toFixed(0)}K
                      </div>
                    </Field>
                    <Field label="Base Pay Amount" required hint="USD">
                      <input data-agent="workday-hire-base" aria-label="Base Pay Amount" value={f.base} onChange={set('base')} placeholder="0.00" className={inputCls} />
                    </Field>
                    <Field label="Frequency" required>
                      <select data-agent="workday-hire-frequency" aria-label="Frequency" value={f.frequency} onChange={set('frequency')} className={inputCls}>
                        {['Annual', 'Monthly', 'Hourly'].map((x) => (
                          <option key={x}>{x}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Bonus Target">
                      <div className="pt-2.5 text-[14px]">10% · Annual Incentive Plan</div>
                    </Field>
                  </>
                )}
                {step === 3 && (
                  <div className="divide-y divide-[#F0F1F2] text-[14px] pb-4">
                    {[
                      ['Worker', w.name],
                      ['Position', pos?.label.replace(' (Unfilled)', '') ?? '—'],
                      ['Location', f.location],
                      ['Hire Date', f.start ? fmtLong(f.start) : '—'],
                      ['Employee Type / Time Type', `${f.employeeType} · ${f.timeType}`],
                      ['Base Pay', `$${Number(String(f.base).replace(/[^0-9.]/g, '')).toLocaleString('en-US')} ${f.frequency}`],
                      ['Manager', ME.name],
                    ].map(([k, v]) => (
                      <div key={k} className="grid grid-cols-[220px_1fr] py-2.5">
                        <span className="text-[#5E6A75]">{k}</span>
                        <b>{v}</b>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
      <div className="shrink-0 h-[68px] bg-white border-t border-[#DFE2E6] flex items-center gap-3 px-10">
        {step < 3 ? (
          <Btn variant="primary" agent="workday-hire-next" onClick={next}>
            Next
          </Btn>
        ) : (
          <Btn variant="primary" agent="workday-hire-submit" onClick={submit}>
            Submit
          </Btn>
        )}
        {step > 0 && <Btn onClick={() => setStep(step - 1)}>Back</Btn>}
        <Btn variant="tertiary" onClick={saveForLater}>Save for Later</Btn>
        {savedAt && (
          <span className="text-[13.5px] text-[#5E6A75] flex items-center gap-2">
            <CheckCircle2 size={16} className="text-[#319C4C]" /> Draft saved {new Date(savedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} ·
            <button onClick={() => nav({ page: 'inbox' })} className="font-bold text-[#0875E1] hover:underline">
              Back to My Tasks
            </button>
          </span>
        )}
      </div>
    </div>
  )
}

const ASSIGNEES = PEOPLE.filter((p) => !p.external && p.id !== 'jordan')

function Onboarding({ nav, onb, w }: { nav: Nav; onb: any; w: any }) {
  const { isAgent } = useDesk()
  const [saved, setSaved] = useState(false)
  const [adding, setAdding] = useState(false)
  const done = onb.tasks.filter((t: any) => t.status === 'Complete').length
  const toggleDone = (t: any) => {
    db.update('workday.onboarding', onb.id, (o) => ({ tasks: o.tasks.map((x: any) => (x.id === t.id ? { ...x, status: x.status === 'Complete' ? (x.assignee ? 'Assigned' : 'Not Started') : 'Complete', completedAt: x.status === 'Complete' ? undefined : new Date().toISOString() } : x)) }))
  }
  const assigned = onb.tasks.filter((t: any) => t.assignee).length
  const setAssignee = (tid: string, a: string) => {
    db.update('workday.onboarding', onb.id, (o) => ({ tasks: o.tasks.map((t: any) => (t.id === tid ? { ...t, assignee: a || null, status: a && t.status === 'Not Started' ? 'Assigned' : t.status, assignedBy: isAgent ? 'hworker' : 'alex' } : t)) }))
    setSaved(false)
  }
  const save = () => {
    for (const t of onb.tasks.filter((x: any) => x.status === 'Assigned' && x.assignee && x.assignee !== ME.id && !x.notified)) {
      db.insert('workday.tasks', { id: uid('wt'), assignee: t.assignee, title: `Onboarding: ${t.title} — ${w.name}`, process: 'Onboarding', step: t.title, fromId: ME.id, receivedAt: new Date().toISOString(), due: t.due, status: 'open', createdBy: isAgent ? 'hworker' : undefined })
    }
    db.update('workday.onboarding', onb.id, (o) => ({ tasks: o.tasks.map((t: any) => (t.assignee ? { ...t, notified: true } : t)), planSubmitted: true, updatedBy: isAgent ? 'hworker' : o.updatedBy }))
    setSaved(true)
  }
  const cats = Array.from(new Set(onb.tasks.map((t: any) => t.category))) as string[]

  return (
    <div className="max-w-[1180px] mx-auto px-10 py-7" data-agent="workday-onboarding">
      <button onClick={() => nav({ page: 'team' })} className="text-[14px] font-bold text-[#0875E1] hover:underline mb-3 flex items-center gap-1">
        <ChevronLeft size={16} /> My Team Management
      </button>
      {onb.hiredAt && Date.now() - +new Date(onb.hiredAt) < 120000 && (
        <div className="flex items-center gap-3 rounded-xl bg-[#EAF7EE] border border-[#CDEBD5] px-5 py-3 mb-5 text-[14px]" data-agent="workday-hire-success">
          <CheckCircle2 size={22} className="text-[#319C4C]" />
          <span>
            <b>Hire Employee</b> event submitted for {w.name}. Up next: Onboarding — assign the checklist below.
          </span>
        </div>
      )}
      <div className="flex items-start gap-4 mb-6">
        <AppIcon icon={<ClipboardCheck size={22} />} color="#C9227A" size={48} />
        <div className="flex-1">
          <h1 className="text-[28px] font-bold leading-tight">Onboarding: {w.name}</h1>
          <div className="text-[14px] text-[#5E6A75] mt-1 flex items-center gap-2 flex-wrap">
            {w.title} · Starts {fmtLong(onb.startDate)} · Manager {ME.name}
            {onb.updatedBy === 'hworker' && <HWorkerChip text="Set up by H-Worker" />}
          </div>
        </div>
        <Btn agent="workday-onb-profile" onClick={() => nav({ page: 'worker', workerId: w.id })}>
          View Worker Profile
        </Btn>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          ['Progress', `${done} of ${onb.tasks.length} complete`],
          ['Assigned', `${assigned} of ${onb.tasks.length} tasks`],
          ['Days until start', String(Math.max(0, Math.ceil((+new Date(onb.startDate + 'T09:00:00') - Date.now()) / 864e5)))],
        ].map(([k, v]) => (
          <div key={k} className="bg-white rounded-2xl border border-[#E8EBED] p-5">
            <div className="text-[13px] text-[#5E6A75] font-medium">{k}</div>
            <div className="text-[22px] font-bold mt-1">{v}</div>
          </div>
        ))}
      </div>
      <Card title="Onboarding Checklist">
        {cats.map((c) => (
          <div key={c}>
            <div className="px-6 h-9 flex items-center bg-[#F6F7F8] border-y border-[#E8EBED] text-[12.5px] font-bold text-[#5E6A75] uppercase tracking-wide">{c}</div>
            {onb.tasks
              .filter((t: any) => t.category === c)
              .map((t: any) => (
                <div key={t.id} data-agent={`workday-onb-task-${t.id}`} className={`grid grid-cols-[28px_minmax(0,1fr)_240px_110px_130px] gap-4 items-center px-6 py-3 border-b border-[#F0F1F2] ${t.assignedBy === 'hworker' ? 'flash-new' : ''}`}>
                  {t.status === 'Complete' ? (
                    <button aria-label={`Mark ${t.title} not complete`} onClick={() => toggleDone(t)} className="rounded-full">
                      <CheckCircle2 size={22} className="text-[#319C4C]" />
                    </button>
                  ) : t.assignee ? (
                    <button aria-label={`Mark ${t.title} complete`} title="Mark complete" onClick={() => toggleDone(t)} className="w-[22px] h-[22px] rounded-full border-2 border-[#A1AAB3] hover:border-[#319C4C] hover:bg-[#EAF7EE]" />
                  ) : (
                    <span className="w-[22px] h-[22px] rounded-full border-2 border-[#A1AAB3]" />
                  )}
                  <div className="min-w-0">
                    <div className="text-[14px] font-bold">{t.title}</div>
                    <div className="text-[12.5px] text-[#5E6A75] truncate">{t.desc}</div>
                  </div>
                  {t.status === 'Complete' || t.assignee === 'jordan' ? (
                    <div className="flex items-center gap-2 text-[13.5px]">
                      <Avatar id={t.assignee} size={24} /> {person(t.assignee).name}
                    </div>
                  ) : (
                    <select data-agent={`workday-onb-assignee-${t.id}`} aria-label={`Assignee for ${t.title}`} value={t.assignee ?? ''} onChange={(e) => setAssignee(t.id, e.target.value)} className="h-9 w-full px-2 rounded-md border border-[#A1AAB3] bg-white text-[13.5px] outline-none focus:border-[#0875E1]">
                      <option value="">Unassigned</option>
                      {ASSIGNEES.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} — {p.title}
                        </option>
                      ))}
                    </select>
                  )}
                  <div className="text-[13px] text-[#5E6A75]">Due {fmtMDY(t.due)}</div>
                  <div className="flex items-center gap-1.5">
                    <Pill tone={t.status === 'Complete' ? 'green' : t.status === 'Assigned' ? 'blue' : 'gray'}>{t.status}</Pill>
                  </div>
                </div>
              ))}
          </div>
        ))}
        <div className="flex items-center gap-3 px-6 py-4">
          <Btn variant="primary" agent="workday-onb-save" onClick={save}>
            Submit
          </Btn>
          <Btn agent="workday-onb-add-task" onClick={() => setAdding(true)}>Add Task</Btn>
          {saved && (
            <span className="text-[14px] text-[#1E6F34] font-bold flex items-center gap-1.5" data-agent="workday-onb-saved">
              <CheckCircle2 size={18} /> Onboarding plan submitted — assignees notified
            </span>
          )}
        </div>
      </Card>
      {adding && (
        <AddTaskModal
          cats={cats}
          onClose={() => setAdding(false)}
          onAdd={(t) => {
            db.update('workday.onboarding', onb.id, (o) => ({ tasks: [...o.tasks, { ...t, id: uid('ot'), status: t.assignee ? 'Assigned' : 'Not Started', assignedBy: isAgent ? 'hworker' : 'alex' }] }))
            setSaved(false)
            setAdding(false)
          }}
        />
      )}
    </div>
  )
}

function AddTaskModal({ cats, onClose, onAdd }: { cats: string[]; onClose: () => void; onAdd: (t: any) => void }) {
  const [f, setF] = useState({ title: '', desc: '', category: cats.includes('Team') ? 'Team' : cats[0] ?? 'Team', assignee: '', due: new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10) })
  const [err, setErr] = useState('')
  const set = (k: keyof typeof f) => (e: any) => (setF({ ...f, [k]: e.target.value }), setErr(''))
  return (
    <Modal
      title="Add Onboarding Task"
      onClose={onClose}
      footer={
        <>
          <Btn variant="primary" onClick={() => (f.title.trim() ? onAdd({ ...f, title: f.title.trim(), assignee: f.assignee || null }) : setErr('Task is required.'))}>
            OK
          </Btn>
          <Btn onClick={onClose}>Cancel</Btn>
        </>
      }
    >
      {err && <div className="rounded-lg border border-[#DE2E21] bg-[#FDE2E0] px-4 py-2.5 text-[13.5px] text-[#A31B12] font-medium mb-3">{err}</div>}
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <div className="text-[14px] font-medium mb-1.5">Task<span className="text-[#DE2E21]">*</span></div>
          <input aria-label="Task title" value={f.title} onChange={set('title')} className={inputCls + ' max-w-none'} />
        </div>
        <div className="col-span-2">
          <div className="text-[14px] font-medium mb-1.5">Description</div>
          <textarea aria-label="Task description" value={f.desc} onChange={set('desc')} className={textareaCls + ' h-20'} />
        </div>
        <div>
          <div className="text-[14px] font-medium mb-1.5">Category</div>
          <select aria-label="Task category" value={f.category} onChange={set('category')} className={inputCls}>
            {[...new Set([...cats, 'Team', 'IT', 'Facilities', 'Compliance'])].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <div className="text-[14px] font-medium mb-1.5">Due Date</div>
          <input type="date" aria-label="Task due date" value={f.due} onChange={set('due')} className={inputCls} />
        </div>
        <div className="col-span-2">
          <div className="text-[14px] font-medium mb-1.5">Assignee</div>
          <select aria-label="Task assignee" value={f.assignee} onChange={set('assignee')} className={inputCls}>
            <option value="">Unassigned</option>
            {ASSIGNEES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.title}
              </option>
            ))}
          </select>
        </div>
      </div>
    </Modal>
  )
}
