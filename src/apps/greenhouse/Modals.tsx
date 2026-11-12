/** Greenhouse dialogs shared by the dashboard, job pipeline and candidate profile. */
import { useState, type ReactNode } from 'react'
import { X, Check, VideoCamera, MapPin, ClipboardText } from '@phosphor-icons/react'
import { db, uid, useCollection } from '@/db/db'
import { useDesk } from '@/os/context'
import { ME, PEOPLE, person } from '@/data/people'
import { isoDate } from '@/data/time'
import { Avatar } from '@/components/Avatar'
import type { Activity, Candidate, Interview, Job, PlanInterview, Rating, Scorecard, Stage } from './types'
import { PIPELINE, STAGE_LABEL } from './types'
import { Btn, fmtWhen, LOCATION_LABEL, pname, RATING_LABEL, RatingIcon } from './shared'

const INTERNAL = PEOPLE.filter((p) => !p.external && p.id !== 'jordan')
export const fieldCls = 'w-full h-9 rounded-md border border-[#C9D0CD] px-2.5 text-[13.5px] bg-white outline-none focus:border-[#15372C]'
export const areaCls = 'w-full rounded-md border border-[#C9D0CD] p-2.5 text-[13.5px] outline-none focus:border-[#15372C] resize-none'

export function GhModal({ title, children, footer, onClose, width = 560, agent }: { title: ReactNode; children: ReactNode; footer?: ReactNode; onClose: () => void; width?: number; agent?: string }) {
  return (
    <div className="absolute inset-0 z-30 bg-[#15372C]/30 flex items-start justify-center pt-12" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div data-agent={agent} className="max-h-[calc(100%-70px)] flex flex-col bg-white rounded-lg shadow-[0_16px_40px_rgba(21,55,44,0.3)]" style={{ width }}>
        <div className="flex items-center justify-between px-6 h-14 border-b border-[#EDEFEE] shrink-0">
          <div className="text-[16px] font-semibold">{title}</div>
          <button aria-label="Close dialog" onClick={onClose} className="w-8 h-8 rounded hover:bg-[#F2F4F3] flex items-center justify-center">
            <X size={16} />
          </button>
        </div>
        <div className="p-6 overflow-auto min-h-0 text-[13.5px]">{children}</div>
        {footer && <div className="flex justify-end items-center gap-2 px-6 py-3 border-t border-[#EDEFEE] shrink-0">{footer}</div>}
      </div>
    </div>
  )
}

export function Field({ label, children, required }: { label: string; children: ReactNode; required?: boolean }) {
  return (
    <label className="block">
      <span className="block font-medium mb-1">
        {label}
        {required && <span className="text-[#C9302C]"> *</span>}
      </span>
      {children}
    </label>
  )
}

const Err = ({ text }: { text: string }) => (text ? <div className="rounded-md bg-[#FBEAEA] border border-[#F0C4C1] text-[#A3302A] px-3 py-2 mb-4 font-medium">{text}</div> : null)

/** prepend an activity entry to a candidate (and bump lastActivity) */
export function logActivity(cid: string, a: Omit<Activity, 'id' | 'at'> & { at?: string }, patch: Partial<Candidate> = {}) {
  const at = a.at ?? new Date().toISOString()
  db.update('greenhouse.candidates', cid, (r: any) => ({ ...patch, lastActivity: at, activity: [{ id: uid('act'), ...a, at }, ...(r.activity ?? [])] }))
}

const SOURCES = ['LinkedIn', 'Referral', 'Company Website', 'Indeed', 'Agency', 'Career Fair', 'Prospecting']

/* ───────────── Add candidate ───────────── */

export function AddCandidateModal({ jobId, onClose, onDone }: { jobId?: string; onClose: () => void; onDone: (candidateId: string) => void }) {
  const { isAgent } = useDesk()
  const jobs = useCollection<Job>('greenhouse.jobs').filter((j) => j.status !== 'closed')
  const [f, setF] = useState({ first: '', last: '', email: '', phone: '', company: '', title: '', location: '', source: 'LinkedIn', referrer: '', jobId: jobId ?? '' })
  const [err, setErr] = useState('')
  const set = (k: keyof typeof f) => (e: any) => (setF({ ...f, [k]: e.target.value }), setErr(''))
  const save = () => {
    if (!f.first.trim() || !f.last.trim()) return setErr('First and last name are required.')
    if (!f.jobId) return setErr('Select a job for this application.')
    if (f.source === 'Referral' && !f.referrer) return setErr('Select who referred this candidate.')
    const job = jobs.find((j) => j.id === f.jobId)!
    const now = new Date().toISOString()
    const id = uid('gh-cand')
    const name = `${f.first.trim()} ${f.last.trim()}`
    const rec: Candidate = {
      id,
      num: 40000000 + Math.floor(Math.random() * 9999999),
      appNum: 60000000 + Math.floor(Math.random() * 9999999),
      name,
      email: f.email.trim() || `${f.first.trim().toLowerCase()}.${f.last.trim().toLowerCase()}@example.com`,
      phone: f.phone.trim(),
      company: f.company.trim() || '—',
      title: f.title.trim() || '—',
      location: f.location.trim() || '—',
      source: f.source,
      referrer: f.source === 'Referral' ? f.referrer : undefined,
      jobId: f.jobId,
      stage: 'application_review',
      appliedAt: now,
      stageEnteredAt: now,
      lastActivity: now,
      tags: f.source === 'Referral' ? ['Referral'] : [],
      recruiter: job.recruiter,
      coordinator: job.coordinator,
      scorecards: [],
      activity: [{ id: uid('act'), at: now, kind: 'applied', by: ME.id, text: `Added ${name} to ${job.name}`, createdBy: isAgent ? 'hworker' : undefined }],
      resumeSummary: f.title ? `${f.title.trim()} at ${f.company.trim() || 'current employer'}.` : 'No resume on file yet.',
      experience: f.title ? [{ title: f.title.trim(), company: f.company.trim() || '—', years: 'Current' }] : [],
      education: '—',
      linkedin: '',
      updatedBy: isAgent ? 'hworker' : undefined,
    }
    db.insert('greenhouse.candidates', rec)
    onDone(id)
  }
  return (
    <GhModal
      title="Add a Candidate"
      onClose={onClose}
      width={620}
      agent="greenhouse-add-candidate-modal"
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn kind="primary" data-agent="greenhouse-add-candidate-save" onClick={save}>
            Add Candidate
          </Btn>
        </>
      }
    >
      <Err text={err} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="First name" required>
          <input aria-label="First name" value={f.first} onChange={set('first')} className={fieldCls} />
        </Field>
        <Field label="Last name" required>
          <input aria-label="Last name" value={f.last} onChange={set('last')} className={fieldCls} />
        </Field>
        <Field label="Email">
          <input aria-label="Email" value={f.email} onChange={set('email')} className={fieldCls} />
        </Field>
        <Field label="Phone">
          <input aria-label="Phone" value={f.phone} onChange={set('phone')} className={fieldCls} />
        </Field>
        <Field label="Current company">
          <input aria-label="Current company" value={f.company} onChange={set('company')} className={fieldCls} />
        </Field>
        <Field label="Current title">
          <input aria-label="Current title" value={f.title} onChange={set('title')} className={fieldCls} />
        </Field>
        <Field label="Location">
          <input aria-label="Location" value={f.location} onChange={set('location')} placeholder="City, State" className={fieldCls} />
        </Field>
        <Field label="Source">
          <select aria-label="Source" value={f.source} onChange={set('source')} className={fieldCls}>
            {SOURCES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        {f.source === 'Referral' && (
          <Field label="Referred by" required>
            <select aria-label="Referred by" value={f.referrer} onChange={set('referrer')} className={fieldCls}>
              <option value="">Select a colleague</option>
              {INTERNAL.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
        )}
        <div className="col-span-2">
          <Field label="Job" required>
            <select aria-label="Job" value={f.jobId} onChange={set('jobId')} className={fieldCls}>
              <option value="">Select a job</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.name} ({j.reqId})
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>
    </GhModal>
  )
}

/* ───────────── Create job ───────────── */

const DEPTS = ['Operations', 'Engineering', 'Sales', 'Marketing', 'Finance', 'Customer Success', 'People', 'IT']
const OFFICES = ['Boston, MA', 'New York, NY', 'Chicago, IL', 'San Jose, CA', 'Remote — US']

export function defaultPlan(hm: string): Job['plan'] {
  return {
    application_review: [],
    phone_screen: [
      { key: 'recruiter-screen', name: 'Recruiter Phone Screen', duration: 30, interviewers: ['james'] },
      { key: 'hm-screen', name: 'Hiring Manager Screen', duration: 45, interviewers: [hm] },
    ],
    onsite: [
      { key: 'onsite-panel', name: 'Onsite — Panel Interview', duration: 90, interviewers: [hm] },
      { key: 'hm-final', name: 'Hiring Manager Final', duration: 45, interviewers: [hm] },
    ],
    offer: [{ key: 'reference-check', name: 'Reference Check', duration: 30, interviewers: ['james'] }],
  }
}

export function CreateJobModal({ onClose, onDone }: { onClose: () => void; onDone: (jobId: string) => void }) {
  const { isAgent } = useDesk()
  const jobs = useCollection<Job>('greenhouse.jobs')
  const [f, setF] = useState({ name: '', department: 'Operations', office: 'Boston, MA', openings: '1', employmentType: 'Full-time', salaryRange: '', hiringManager: ME.id, description: '' })
  const [err, setErr] = useState('')
  const set = (k: keyof typeof f) => (e: any) => (setF({ ...f, [k]: e.target.value }), setErr(''))
  const save = () => {
    if (!f.name.trim()) return setErr('Job name is required.')
    const id = uid('gh-job')
    const prefix = f.department.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase()
    const job: Job = {
      id,
      num: 4100000 + Math.floor(Math.random() * 99999),
      reqId: `${prefix}-${1100 + jobs.length}`,
      name: f.name.trim(),
      department: f.department,
      office: f.office,
      openings: Math.max(1, Number(f.openings) || 1),
      filled: 0,
      hiringManager: f.hiringManager,
      recruiter: 'james',
      coordinator: 'james',
      status: 'draft',
      openedAt: new Date().toISOString(),
      employmentType: f.employmentType,
      salaryRange: f.salaryRange.trim() || undefined,
      plan: defaultPlan(f.hiringManager),
      hiringTeam: [...new Set([f.hiringManager, 'james', ME.id])],
      description: f.description.trim(),
      postStatus: 'offline',
      createdBy: isAgent ? 'hworker' : undefined,
    }
    db.insert('greenhouse.jobs', job)
    onDone(id)
  }
  return (
    <GhModal
      title="Create a Job"
      onClose={onClose}
      width={620}
      agent="greenhouse-create-job-modal"
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn kind="primary" data-agent="greenhouse-create-job-save" onClick={save}>
            Create Job &amp; Continue
          </Btn>
        </>
      }
    >
      <Err text={err} />
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Field label="Job name" required>
            <input aria-label="Job name" value={f.name} onChange={set('name')} placeholder="e.g. Warehouse Operations Supervisor" className={fieldCls} />
          </Field>
        </div>
        <Field label="Department">
          <select aria-label="Department" value={f.department} onChange={set('department')} className={fieldCls}>
            {DEPTS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </Field>
        <Field label="Office">
          <select aria-label="Office" value={f.office} onChange={set('office')} className={fieldCls}>
            {OFFICES.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </Field>
        <Field label="Openings">
          <input aria-label="Openings" type="number" min={1} value={f.openings} onChange={set('openings')} className={fieldCls} />
        </Field>
        <Field label="Employment type">
          <select aria-label="Employment type" value={f.employmentType} onChange={set('employmentType')} className={fieldCls}>
            {['Full-time', 'Part-time', 'Contract', 'Intern'].map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </Field>
        <Field label="Hiring manager">
          <select aria-label="Hiring manager" value={f.hiringManager} onChange={set('hiringManager')} className={fieldCls}>
            {INTERNAL.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Salary range">
          <input aria-label="Salary range" value={f.salaryRange} onChange={set('salaryRange')} placeholder="$90,000 – $110,000" className={fieldCls} />
        </Field>
        <div className="col-span-2">
          <Field label="Job description">
            <textarea aria-label="Job description" value={f.description} onChange={set('description')} className={areaCls + ' h-24'} />
          </Field>
        </div>
      </div>
      <div className="mt-3 text-[12.5px] text-[#5B6B66]">New jobs start as drafts with the standard interview plan (phone screens, onsite panel, reference check). Open the job when it’s approved.</div>
    </GhModal>
  )
}

/* ───────────── Send email ───────────── */

const TEMPLATES: Record<string, (c: Candidate, job?: Job) => { subject: string; body: string }> = {
  Custom: () => ({ subject: '', body: '' }),
  'Availability request': (c, job) => ({ subject: `Next steps for ${job?.name ?? 'your application'}`, body: `Hi ${c.name.split(' ')[0]},\n\nThanks for your time so far! Could you share your availability over the next week for the next round of interviews?\n\nBest,\n${ME.name}` }),
  'Interview confirmation': (c, job) => ({ subject: `Interview confirmation — ${job?.name ?? ''}`, body: `Hi ${c.name.split(' ')[0]},\n\nThis confirms your upcoming interview with the Northwind team. You’ll receive a calendar invite with the details.\n\nBest,\n${ME.name}` }),
  'Rejection — after interview': (c, job) => ({ subject: `Your application for ${job?.name ?? 'Northwind'}`, body: `Hi ${c.name.split(' ')[0]},\n\nThank you for interviewing with us. After careful consideration we’ve decided to move forward with other candidates. We appreciate your interest in Northwind and wish you the best.\n\nBest,\n${ME.name}` }),
  'Offer follow-up': (c) => ({ subject: 'Following up on your offer', body: `Hi ${c.name.split(' ')[0]},\n\nJust checking in on the offer — happy to answer any questions.\n\nBest,\n${ME.name}` }),
}

export function SendEmailModal({ c, job, onClose, onSent }: { c: Candidate; job?: Job; onClose: () => void; onSent?: (m: string) => void }) {
  const { isAgent } = useDesk()
  const [tpl, setTpl] = useState('Custom')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [err, setErr] = useState('')
  const pick = (t: string) => {
    setTpl(t)
    const v = TEMPLATES[t](c, job)
    setSubject(v.subject)
    setBody(v.body)
  }
  const send = () => {
    if (!subject.trim() || !body.trim()) return setErr('Subject and message are required.')
    logActivity(c.id, { kind: 'email', by: ME.id, text: `Emailed ${c.name}: “${subject.trim()}”`, body: body.trim(), createdBy: isAgent ? 'hworker' : undefined })
    onSent?.(`Email sent to ${c.email}.`)
    onClose()
  }
  return (
    <GhModal
      title={`Email ${c.name}`}
      onClose={onClose}
      width={620}
      agent="greenhouse-email-modal"
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn kind="primary" data-agent="greenhouse-email-send" onClick={send}>
            Send Email
          </Btn>
        </>
      }
    >
      <Err text={err} />
      <div className="space-y-3">
        <Field label="Template">
          <select aria-label="Email template" value={tpl} onChange={(e) => pick(e.target.value)} className={fieldCls}>
            {Object.keys(TEMPLATES).map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field label="To">
          <input aria-label="To" value={c.email} readOnly className={fieldCls + ' bg-[#F7F8F7]'} />
        </Field>
        <Field label="Subject">
          <input aria-label="Subject" value={subject} onChange={(e) => (setSubject(e.target.value), setErr(''))} className={fieldCls} />
        </Field>
        <Field label="Message">
          <textarea aria-label="Message" value={body} onChange={(e) => (setBody(e.target.value), setErr(''))} className={areaCls + ' h-40'} />
        </Field>
      </div>
    </GhModal>
  )
}

/* ───────────── Reject ───────────── */

const REASONS = ['Lacking skill(s)/qualification(s)', 'Not a culture add', 'Compensation expectations', 'Candidate withdrew', 'Candidate accepted another offer', 'Position filled', 'Other']

export function RejectModal({ c, job, onClose }: { c: Candidate; job?: Job; onClose: () => void }) {
  const { isAgent } = useDesk()
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [email, setEmail] = useState(true)
  const [err, setErr] = useState('')
  const reject = () => {
    if (!reason) return setErr('Select a rejection reason.')
    const actor = ME.id
    for (const iv of db.get<Interview>('greenhouse.interviews').filter((i) => i.candidateId === c.id && i.status === 'scheduled')) db.update('greenhouse.interviews', iv.id, { status: 'cancelled' })
    logActivity(c.id, { kind: 'reject', by: actor, text: `Rejected from ${STAGE_LABEL[c.stage]} — ${reason}`, body: notes.trim() || undefined, createdBy: isAgent ? 'hworker' : undefined }, { stage: 'rejected', rejectedFrom: c.stage, rejectReason: reason, stageEnteredAt: new Date().toISOString(), updatedBy: isAgent ? 'hworker' : undefined })
    if (email) logActivity(c.id, { kind: 'email', by: actor, text: `Sent rejection email to ${c.name}`, body: TEMPLATES['Rejection — after interview'](c, job).body, createdBy: isAgent ? 'hworker' : undefined })
    onClose()
  }
  return (
    <GhModal
      title={`Reject ${c.name}`}
      onClose={onClose}
      agent="greenhouse-reject-modal"
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn kind="danger" data-agent="greenhouse-reject-confirm" onClick={reject}>
            Reject Candidate
          </Btn>
        </>
      }
    >
      <Err text={err} />
      <div className="space-y-3">
        <Field label="Rejection reason" required>
          <select aria-label="Rejection reason" value={reason} onChange={(e) => (setReason(e.target.value), setErr(''))} className={fieldCls}>
            <option value="">Select a reason</option>
            {REASONS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </Field>
        <Field label="Notes">
          <textarea aria-label="Rejection notes" value={notes} onChange={(e) => setNotes(e.target.value)} className={areaCls + ' h-20'} />
        </Field>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={email} onChange={(e) => setEmail(e.target.checked)} className="w-4 h-4 accent-[#15372C]" /> Send rejection email to {c.email}
        </label>
        <div className="text-[12.5px] text-[#5B6B66]">Scheduled interviews for this candidate will be cancelled.</div>
      </div>
    </GhModal>
  )
}

/* ───────────── Scorecard ───────────── */

const RATINGS: Rating[] = ['strong_no', 'no', 'mixed', 'yes', 'strong_yes']
const ATTRS: Record<string, string[]> = {
  Skills: ['Operational rigor', 'Data & analytics', 'Problem solving'],
  Qualifications: ['Relevant experience', 'Domain knowledge'],
  'Personality traits': ['Communication', 'Ownership', 'Collaboration'],
}

export function ScorecardModal({ c, job, initialKey, onClose }: { c: Candidate; job?: Job; initialKey?: { stage: Stage; key: string }; onClose: () => void }) {
  const { isAgent } = useDesk()
  const options = PIPELINE.slice(0, Math.max(1, PIPELINE.indexOf(c.stage as any) + 1)).flatMap((s) => (job?.plan[s] ?? []).map((p) => ({ stage: s as Stage, p })))
  const [sel, setSel] = useState(initialKey ? `${initialKey.stage}|${initialKey.key}` : options[options.length - 1] ? `${options[options.length - 1].stage}|${options[options.length - 1].p.key}` : '')
  const [rating, setRating] = useState<Rating | ''>('')
  const [notes, setNotes] = useState('')
  const [attrs, setAttrs] = useState<Record<string, Rating>>({})
  const [err, setErr] = useState('')
  const submit = () => {
    const o = options.find((x) => `${x.stage}|${x.p.key}` === sel)
    if (!o) return setErr('Select the interview this scorecard is for.')
    if (!rating) return setErr('Select an overall recommendation.')
    if (!notes.trim()) return setErr('Key take-aways are required.')
    const sc: Scorecard = {
      id: uid('sc'),
      interviewer: ME.id,
      stage: o.stage,
      interview: o.p.name,
      planKey: o.p.key,
      rating,
      submittedAt: new Date().toISOString(),
      notes: notes.trim(),
      attributes: Object.entries(attrs).map(([name, r]) => ({ name, category: Object.entries(ATTRS).find(([, v]) => v.includes(name))?.[0] ?? 'Skills', rating: r })),
    }
    db.update('greenhouse.candidates', c.id, (r: any) => ({ scorecards: [...r.scorecards, sc] }))
    logActivity(c.id, { kind: 'scorecard', by: ME.id, text: `Submitted a scorecard for ${o.p.name}`, body: rating, createdBy: isAgent ? 'hworker' : undefined })
    onClose()
  }
  return (
    <GhModal
      title={`Scorecard · ${c.name}`}
      onClose={onClose}
      width={680}
      agent="greenhouse-scorecard-modal"
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn kind="primary" data-agent="greenhouse-scorecard-submit" onClick={submit}>
            Submit Scorecard
          </Btn>
        </>
      }
    >
      <Err text={err} />
      <div className="space-y-4">
        <Field label="Interview" required>
          <select aria-label="Scorecard interview" value={sel} onChange={(e) => (setSel(e.target.value), setErr(''))} className={fieldCls}>
            {options.map((o) => (
              <option key={`${o.stage}|${o.p.key}`} value={`${o.stage}|${o.p.key}`}>
                {STAGE_LABEL[o.stage]} · {o.p.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Key take-aways" required>
          <textarea aria-label="Key take-aways" value={notes} onChange={(e) => (setNotes(e.target.value), setErr(''))} className={areaCls + ' h-24'} />
        </Field>
        <div>
          <div className="font-medium mb-2">Attributes</div>
          {Object.entries(ATTRS).map(([cat, list]) => (
            <div key={cat} className="mb-2">
              <div className="text-[12px] uppercase tracking-wide font-semibold text-[#5B6B66] mb-1">{cat}</div>
              {list.map((a) => (
                <div key={a} className="flex items-center gap-3 py-1">
                  <span className="flex-1">{a}</span>
                  {RATINGS.map((r) => (
                    <button key={r} aria-label={`${a}: ${RATING_LABEL[r]}`} onClick={() => setAttrs({ ...attrs, [a]: r })} className={`w-8 h-7 rounded flex items-center justify-center border ${attrs[a] === r ? 'border-[#15372C] bg-[#E6F4EE]' : 'border-transparent hover:bg-[#F2F4F3]'}`}>
                      <RatingIcon rating={r} size={13} />
                    </button>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
        <div>
          <div className="font-medium mb-2">
            Overall recommendation <span className="text-[#C9302C]">*</span>
          </div>
          <div className="flex gap-2">
            {RATINGS.map((r) => (
              <button key={r} data-agent={`greenhouse-scorecard-rating-${r}`} onClick={() => (setRating(r), setErr(''))} className={`flex-1 h-14 rounded-md border flex flex-col items-center justify-center gap-1 text-[12px] ${rating === r ? 'border-[#15372C] bg-[#E6F4EE] font-semibold' : 'border-[#C9D0CD] hover:bg-[#F7F8F7]'}`}>
                <RatingIcon rating={r} size={16} />
                {RATING_LABEL[r]}
              </button>
            ))}
          </div>
        </div>
      </div>
    </GhModal>
  )
}

/* ───────────── Offer ───────────── */

export function OfferModal({ c, job, onClose }: { c: Candidate; job?: Job; onClose: () => void }) {
  const { isAgent } = useDesk()
  const o = c.offer
  const top = job?.salaryRange?.split('–')[1]?.trim().replace(/\s.*$/, '')
  const [salary, setSalary] = useState(o?.salary ?? top ?? '')
  const [start, setStart] = useState(o?.startDate ? isoDate(o.startDate) : isoDate(new Date(Date.now() + 21 * 864e5)))
  const [bonus, setBonus] = useState(o?.bonus ?? '10%')
  const [equity, setEquity] = useState(o?.equity ?? '')
  const [approvers, setApprovers] = useState<string[]>(o?.approvers ?? [job?.hiringManager ?? ME.id, 'priya'].filter((v, i, a) => a.indexOf(v) === i))
  const [err, setErr] = useState('')
  const save = () => {
    if (!salary.trim()) return setErr('Base salary is required.')
    if (!approvers.length) return setErr('Add at least one approver.')
    const [y, m, d] = start.split('-').map(Number)
    const offer = { salary: salary.trim(), startDate: new Date(y, m - 1, d, 9).toISOString(), bonus, equity, approvers, approvedBy: [], status: 'draft' as const, createdAt: new Date().toISOString() }
    logActivity(c.id, { kind: 'offer', by: ME.id, text: o ? `Updated the offer (${salary.trim()} base)` : `Created an offer (${salary.trim()} base)`, createdBy: isAgent ? 'hworker' : undefined }, { offer, updatedBy: isAgent ? 'hworker' : undefined })
    onClose()
  }
  return (
    <GhModal
      title={o ? 'Edit Offer' : 'Create Offer'}
      onClose={onClose}
      width={600}
      agent="greenhouse-offer-modal"
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn kind="primary" data-agent="greenhouse-offer-save" onClick={save}>
            Save Offer
          </Btn>
        </>
      }
    >
      <Err text={err} />
      <div className="text-[12.5px] text-[#5B6B66] mb-3">
        {job?.name} · {job?.salaryRange ? `Approved range ${job.salaryRange}` : 'No salary range on file'}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Base salary" required>
          <input aria-label="Base salary" value={salary} onChange={(e) => (setSalary(e.target.value), setErr(''))} placeholder="$120,000" className={fieldCls} />
        </Field>
        <Field label="Start date">
          <input type="date" aria-label="Start date" value={start} onChange={(e) => setStart(e.target.value)} className={fieldCls} />
        </Field>
        <Field label="Bonus target">
          <input aria-label="Bonus target" value={bonus} onChange={(e) => setBonus(e.target.value)} className={fieldCls} />
        </Field>
        <Field label="Equity">
          <input aria-label="Equity" value={equity} onChange={(e) => setEquity(e.target.value)} placeholder="e.g. 2,000 RSUs" className={fieldCls} />
        </Field>
      </div>
      <div className="mt-4">
        <div className="font-medium mb-1">Approval chain</div>
        <div className="flex flex-wrap gap-1.5">
          {INTERNAL.map((p) => {
            const on = approvers.includes(p.id)
            return (
              <button key={p.id} onClick={() => setApprovers((a) => (on ? a.filter((x) => x !== p.id) : [...a, p.id]))} className={`h-7 px-2 rounded-full text-[12.5px] border flex items-center gap-1 ${on ? 'bg-[#15372C] text-white border-[#15372C]' : 'border-[#C9D0CD] hover:bg-[#F2F4F3]'}`}>
                {on && <Check size={11} weight="bold" />} {p.name}
              </button>
            )
          })}
        </div>
      </div>
    </GhModal>
  )
}

/** advance an offer one approval step for the current user */
export function approveOffer(c: Candidate, isAgent: boolean) {
  const o = c.offer
  if (!o) return
  const approvedBy = [...new Set([...(o.approvedBy ?? []), ME.id])]
  const done = o.approvers.every((a) => approvedBy.includes(a))
  logActivity(c.id, { kind: 'offer', by: ME.id, text: done ? 'Approved the offer — all approvals complete' : 'Approved the offer', createdBy: isAgent ? 'hworker' : undefined }, { offer: { ...o, approvedBy, status: done ? 'approved' : 'pending_approval' } })
}

/* ───────────── Interview kit ───────────── */

const QUESTIONS: Record<string, string[]> = {
  'recruiter-screen': ['Walk me through your current role and team.', 'What are you looking for in your next move?', 'Compensation expectations and timeline?'],
  'hm-screen': ['Tell me about a process you redesigned end to end. What changed?', 'How do you prioritize when SLAs and cost targets conflict?', 'How do you build trust with a new team?'],
  'onsite-panel': ['Describe a peak-season failure and how you recovered.', 'How do you use data to run a daily operation?', 'Give an example of coaching an underperformer.'],
  'case-study': ['Present your analysis of the fulfillment case.', 'Which three levers would you pull first and why?'],
  'hm-final': ['What would your first 90 days look like?', 'What questions do you have for us?'],
  'reference-check': ['In what capacity did you work together?', 'What are their greatest strengths?', 'Would you hire them again?'],
}

export function InterviewKitModal({ iv, c, onClose, onScorecard }: { iv: Interview; c?: Candidate; onClose: () => void; onScorecard?: () => void }) {
  const qs = QUESTIONS[iv.planKey ?? ''] ?? ['Tell me about yourself.', 'Why Northwind?', 'Describe a challenge you overcame.']
  return (
    <GhModal
      title={`Interview Kit · ${iv.name}`}
      onClose={onClose}
      width={680}
      agent="greenhouse-interview-kit"
      footer={
        <>
          <Btn onClick={onClose}>Close</Btn>
          {onScorecard && (
            <Btn kind="primary" onClick={onScorecard}>
              <ClipboardText size={15} /> Fill Out Scorecard
            </Btn>
          )}
        </>
      }
    >
      <div className="flex items-center gap-4 mb-4">
        <span className="w-12 h-12 rounded-full bg-[#DDEFE7] text-[#15372C] text-[16px] font-semibold flex items-center justify-center">{c?.name.split(' ').map((x) => x[0]).join('')}</span>
        <div className="flex-1">
          <div className="text-[15px] font-semibold">{c?.name}</div>
          <div className="text-[#5B6B66]">
            {c?.title} at {c?.company}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-md bg-[#F7F8F7] p-3">
          <div className="text-[12px] text-[#5B6B66]">When</div>
          <div className="font-medium">{fmtWhen(iv.start)} · {iv.durationMin} min</div>
        </div>
        <div className="rounded-md bg-[#F7F8F7] p-3">
          <div className="text-[12px] text-[#5B6B66]">Where</div>
          <div className="font-medium flex items-center gap-1">
            {iv.location === 'onsite-boston' ? <MapPin size={14} /> : <VideoCamera size={14} />} {LOCATION_LABEL[iv.location]}
          </div>
        </div>
      </div>
      <div className="mb-4">
        <div className="text-[12px] uppercase tracking-wide font-semibold text-[#5B6B66] mb-1">Interviewers</div>
        <div className="flex items-center gap-2 flex-wrap">
          {iv.interviewers.map((p) => (
            <span key={p} className="flex items-center gap-1.5">
              <Avatar id={p} size={22} /> {pname(p)}
            </span>
          ))}
        </div>
      </div>
      <div className="mb-4">
        <div className="text-[12px] uppercase tracking-wide font-semibold text-[#5B6B66] mb-1">Resume summary</div>
        <div className="leading-relaxed">{c?.resumeSummary}</div>
      </div>
      <div>
        <div className="text-[12px] uppercase tracking-wide font-semibold text-[#5B6B66] mb-1">Interview questions</div>
        <ol className="list-decimal pl-5 space-y-1.5">
          {qs.map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ol>
      </div>
    </GhModal>
  )
}

/* ───────────── Edit candidate ───────────── */

export function EditCandidateModal({ c, onClose }: { c: Candidate; onClose: () => void }) {
  const { isAgent } = useDesk()
  const [f, setF] = useState({ email: c.email, phone: c.phone, title: c.title, company: c.company, location: c.location, source: c.source, tags: c.tags.join(', ') })
  const set = (k: keyof typeof f) => (e: any) => setF({ ...f, [k]: e.target.value })
  const save = () => {
    db.update('greenhouse.candidates', c.id, { ...f, tags: f.tags.split(',').map((t) => t.trim()).filter(Boolean), updatedBy: isAgent ? 'hworker' : c.updatedBy })
    onClose()
  }
  return (
    <GhModal
      title={`Edit ${c.name}`}
      onClose={onClose}
      width={600}
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn kind="primary" onClick={save}>
            Save
          </Btn>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Email">
          <input aria-label="Email" value={f.email} onChange={set('email')} className={fieldCls} />
        </Field>
        <Field label="Phone">
          <input aria-label="Phone" value={f.phone} onChange={set('phone')} className={fieldCls} />
        </Field>
        <Field label="Current title">
          <input aria-label="Current title" value={f.title} onChange={set('title')} className={fieldCls} />
        </Field>
        <Field label="Current company">
          <input aria-label="Current company" value={f.company} onChange={set('company')} className={fieldCls} />
        </Field>
        <Field label="Location">
          <input aria-label="Location" value={f.location} onChange={set('location')} className={fieldCls} />
        </Field>
        <Field label="Source">
          <select aria-label="Source" value={f.source} onChange={set('source')} className={fieldCls}>
            {[...new Set([f.source, ...SOURCES])].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <div className="col-span-2">
          <Field label="Tags (comma separated)">
            <input aria-label="Tags" value={f.tags} onChange={set('tags')} className={fieldCls} />
          </Field>
        </div>
      </div>
    </GhModal>
  )
}

/** One planned interview editor row used by Job Setup. */
export function newPlanItem(name: string, duration: number, interviewers: string[]): PlanInterview {
  return { key: `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${Math.random().toString(36).slice(2, 5)}`, name, duration, interviewers }
}
