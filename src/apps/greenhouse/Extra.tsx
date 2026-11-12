/** Greenhouse: Job Board & posts, Configure, CRM (prospects) and Integrations. */
import { useState } from 'react'
import { Megaphone, GearSix, AddressBook, PlugsConnected, Copy, Check, Plus, CaretDown, CaretRight, MagnifyingGlass } from '@phosphor-icons/react'
import { db, uid, useCollection } from '@/db/db'
import { useDesk } from '@/os/context'
import { logoUrl } from '@/os/registry'
import { ME, PEOPLE } from '@/data/people'
import type { Candidate, Job } from './types'
import { Btn, Card, daysSince, type Go, pname } from './shared'
import { activeCount } from './data'
import { postStatusOf } from './Pipeline'
import { Field, fieldCls, GhModal } from './Modals'

/* ───────────── Job board & posts ───────────── */

export function JobPosts({ go }: { go: Go }) {
  const jobs = useCollection<Job>('greenhouse.jobs')
  const cands = useCollection<Candidate>('greenhouse.candidates')
  const [copied, setCopied] = useState<string | null>(null)
  const list = jobs.filter((j) => j.status !== 'closed').sort((a, b) => a.name.localeCompare(b.name))
  const live = list.filter((j) => postStatusOf(j) === 'live').length
  return (
    <div className="flex-1 min-h-0 overflow-auto">
      <div className="max-w-[1100px] mx-auto px-8 py-7">
        <div className="flex items-end justify-between mb-5">
          <div>
            <h1 className="text-[24px] font-semibold flex items-center gap-2">
              <Megaphone size={24} /> Job Board &amp; Posts
            </h1>
            <div className="text-[13.5px] text-[#5B6B66] mt-0.5">Northwind Careers · boards.greenhouse.io/northwind · {live} live posts</div>
          </div>
        </div>
        <Card>
          <table className="w-full text-[13.5px]">
            <thead>
              <tr className="text-left text-[11.5px] uppercase tracking-wide text-[#5B6B66] border-b border-[#E1E4E2] bg-[#FAFBFA]">
                <th className="px-5 py-2.5 font-semibold">Job post</th>
                <th className="font-semibold">Location</th>
                <th className="font-semibold">Applications</th>
                <th className="font-semibold">Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.map((j) => {
                const st = postStatusOf(j)
                const url = `https://boards.greenhouse.io/northwind/jobs/${j.num}`
                return (
                  <tr key={j.id} data-agent={`greenhouse-post-${j.id}`} className="border-b border-[#EDEFEE] last:border-0">
                    <td className="px-5 py-3">
                      <button onClick={() => go({ page: 'job', jobId: j.id, tab: 'setup' })} className="font-semibold hover:underline text-left">
                        {j.name}
                      </button>
                      <div className="text-[12px] text-[#5B6B66]">
                        {j.reqId} · {j.status === 'draft' ? 'Draft job' : `Opened ${daysSince(j.openedAt)} days ago`}
                      </div>
                    </td>
                    <td>{j.office}</td>
                    <td>{cands.filter((c) => c.jobId === j.id).length} total · {activeCount(j.id, cands)} active</td>
                    <td>
                      <span className={`inline-flex items-center gap-1.5 h-[22px] px-2 rounded text-[12px] font-medium ${st === 'live' ? 'bg-[#E3F5EC] text-[#11734B]' : 'bg-[#EEF1EF] text-[#3E4F49]'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${st === 'live' ? 'bg-[#24A47F]' : 'bg-[#A7B1AD]'}`} />
                        {st === 'live' ? 'Live' : 'Not live'}
                      </span>
                    </td>
                    <td className="pr-5">
                      <div className="flex justify-end gap-2">
                        <Btn
                          aria-label={`Copy link for ${j.name}`}
                          disabled={st !== 'live'}
                          onClick={() => {
                            navigator.clipboard?.writeText(url).catch(() => {})
                            setCopied(j.id)
                            setTimeout(() => setCopied((c) => (c === j.id ? null : c)), 2000)
                          }}
                        >
                          {copied === j.id ? <Check size={14} weight="bold" /> : <Copy size={14} />} {copied === j.id ? 'Copied' : 'Copy link'}
                        </Btn>
                        <Btn kind={st === 'live' ? 'secondary' : 'primary'} disabled={j.status !== 'open'} onClick={() => db.update('greenhouse.jobs', j.id, { postStatus: st === 'live' ? 'offline' : 'live' })}>
                          {st === 'live' ? 'Take down' : 'Publish'}
                        </Btn>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>
        <div className="text-[12.5px] text-[#5B6B66] mt-3">Draft jobs must be opened before their post can go live.</div>
      </div>
    </div>
  )
}

/* ───────────── Configure ───────────── */

const SETTINGS: [string, string, string][] = [
  ['autoAdvance', 'Auto-advance after phone screen scorecards', 'Move candidates to Onsite when all phone-screen scorecards are “Yes” or better.'],
  ['scorecardReminders', 'Scorecard reminders', 'Remind interviewers 4 hours after an interview if their scorecard is missing.'],
  ['anonymize', 'Anonymize candidate names for interviewers', 'Interviewers see initials until their scorecard is submitted.'],
  ['offerApprovals', 'Require offer approvals', 'Offers must be approved by the hiring manager and HR before they can be sent.'],
  ['calendarSync', 'Sync interviews to Outlook calendar', 'Scheduled interviews create calendar invites from the organizer’s mailbox.'],
]
const DEFAULTS: Record<string, boolean> = { autoAdvance: false, scorecardReminders: true, anonymize: false, offerApprovals: true, calendarSync: true }

export function Configure() {
  const prefs = useCollection<any>('greenhouse.prefs').find((p) => p.id === 'org-settings')
  const v = { ...DEFAULTS, ...(prefs?.values ?? {}) }
  const set = (k: string, on: boolean) => db.upsert('greenhouse.prefs', { id: 'org-settings', values: { ...v, [k]: on } })
  const users = PEOPLE.filter((p) => !p.external)
  return (
    <div className="flex-1 min-h-0 overflow-auto">
      <div className="max-w-[1000px] mx-auto px-8 py-7 space-y-6">
        <h1 className="text-[24px] font-semibold flex items-center gap-2">
          <GearSix size={24} /> Configure
        </h1>
        <Card title="Organization settings">
          {SETTINGS.map(([k, t, d]) => (
            <div key={k} className="flex items-center gap-4 px-5 py-3.5 border-b border-[#EDEFEE] last:border-0">
              <div className="flex-1">
                <div className="text-[14px] font-medium">{t}</div>
                <div className="text-[12.5px] text-[#5B6B66]">{d}</div>
              </div>
              <button role="switch" aria-checked={v[k]} aria-label={t} data-agent={`greenhouse-setting-${k}`} onClick={() => set(k, !v[k])} className={`w-11 h-6 rounded-full relative transition-colors ${v[k] ? 'bg-[#24A47F]' : 'bg-[#C9D0CD]'}`}>
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${v[k] ? 'left-[22px]' : 'left-0.5'}`} />
              </button>
            </div>
          ))}
        </Card>
        <Card title="Users & permissions" action={<span className="text-[13px] text-[#5B6B66]">{users.length} users</span>}>
          <div className="max-h-[320px] overflow-auto">
            {users.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-5 py-2 border-b border-[#EDEFEE] last:border-0 text-[13.5px]">
                <span className="flex-1 font-medium">{p.name}</span>
                <span className="text-[#5B6B66] w-[220px] truncate">{p.title}</span>
                <span className="w-[150px] text-[12.5px]">{p.id === ME.id || p.id === 'james' ? 'Site Admin' : p.dept === 'People' ? 'Job Admin: Standard' : 'Interviewer'}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

/* ───────────── CRM ───────────── */

const POOLS = ['Ops leaders — Northeast', 'Silver medalists 2026', 'Supply chain meetup Boston', 'University recruiting — MIT / BU']
const SEED_PROSPECTS: { name: string; title: string; company: string; pool: string }[] = [
  { name: 'Hannah Whitfield', title: 'Director of Fulfillment', company: 'Contoso Ltd', pool: POOLS[0] },
  { name: 'Diego Ramos', title: 'Senior Ops Manager', company: 'Fabrikam, Inc.', pool: POOLS[0] },
  { name: 'Lena Park', title: 'Operations Analyst', company: 'Adventure Works', pool: POOLS[1] },
  { name: 'Tomás Rivera', title: 'Logistics Lead', company: 'Litware, Inc.', pool: POOLS[2] },
  { name: 'Ava Chen', title: 'MS Supply Chain candidate', company: 'MIT', pool: POOLS[3] },
]

export function Crm({ go }: { go: Go }) {
  const { isAgent } = useDesk()
  const stored = useCollection<any>('greenhouse.prospects')
  const all = [...SEED_PROSPECTS.map((p, i) => ({ ...p, id: `seed-${i}`, owner: 'james' })), ...stored]
  const [openPool, setOpenPool] = useState<string | null>(POOLS[0])
  const [adding, setAdding] = useState(false)
  const [q, setQ] = useState('')
  const [f, setF] = useState({ name: '', title: '', company: '', pool: POOLS[0] })
  const filtered = all.filter((p) => !q || `${p.name} ${p.title} ${p.company}`.toLowerCase().includes(q.toLowerCase()))
  return (
    <div className="flex-1 min-h-0 overflow-auto">
      <div className="max-w-[1000px] mx-auto px-8 py-7">
        <div className="flex items-center gap-3 mb-5">
          <h1 className="text-[24px] font-semibold flex items-center gap-2 flex-1">
            <AddressBook size={24} /> CRM
          </h1>
          <div className="flex items-center gap-2 h-9 w-[260px] rounded-md border border-[#C9D0CD] bg-white px-2.5">
            <MagnifyingGlass size={15} className="text-[#5B6B66]" />
            <input aria-label="Search prospects" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search prospects" className="flex-1 outline-none text-[13.5px]" />
          </div>
          <Btn kind="primary" data-agent="greenhouse-crm-add" onClick={() => setAdding(true)}>
            <Plus size={15} weight="bold" /> Add Prospect
          </Btn>
        </div>
        <Card>
          {POOLS.map((pool) => {
            const rows = filtered.filter((p) => p.pool === pool)
            const open = openPool === pool || !!q
            return (
              <div key={pool} className="border-b border-[#EDEFEE] last:border-0">
                <button onClick={() => setOpenPool(openPool === pool ? null : pool)} className="w-full flex items-center gap-2 px-5 h-12 text-left text-[14px] font-medium hover:bg-[#FAFBFA]">
                  {open ? <CaretDown size={13} /> : <CaretRight size={13} />}
                  <span className="flex-1">{pool}</span>
                  <span className="text-[12.5px] text-[#5B6B66]">{rows.length} prospects</span>
                </button>
                {open &&
                  rows.map((p) => (
                    <div key={p.id} className="flex items-center gap-3 pl-12 pr-5 py-2 text-[13.5px] border-t border-[#F2F4F3]">
                      <span className="w-[200px] font-medium">{p.name}</span>
                      <span className="flex-1 text-[#5B6B66] truncate">
                        {p.title} at {p.company}
                      </span>
                      <span className="text-[12px] text-[#5B6B66]">Owner: {pname(p.owner ?? ME.id)}</span>
                    </div>
                  ))}
              </div>
            )
          })}
        </Card>
        <button onClick={() => go({ page: 'candidates' })} className="mt-4 text-[13.5px] text-[#1B7F62] font-medium hover:underline">
          View all candidates
        </button>
      </div>
      {adding && (
        <GhModal
          title="Add Prospect"
          onClose={() => setAdding(false)}
          footer={
            <>
              <Btn onClick={() => setAdding(false)}>Cancel</Btn>
              <Btn
                kind="primary"
                disabled={!f.name.trim()}
                onClick={() => {
                  db.insert('greenhouse.prospects', { id: uid('gh-pros'), ...f, name: f.name.trim(), owner: ME.id, createdAt: new Date().toISOString(), createdBy: isAgent ? 'hworker' : undefined })
                  setOpenPool(f.pool)
                  setF({ name: '', title: '', company: '', pool: POOLS[0] })
                  setAdding(false)
                }}
              >
                Add Prospect
              </Btn>
            </>
          }
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Field label="Name" required>
                <input aria-label="Prospect name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={fieldCls} />
              </Field>
            </div>
            <Field label="Title">
              <input aria-label="Prospect title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} className={fieldCls} />
            </Field>
            <Field label="Company">
              <input aria-label="Prospect company" value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} className={fieldCls} />
            </Field>
            <div className="col-span-2">
              <Field label="Prospect pool">
                <select aria-label="Prospect pool" value={f.pool} onChange={(e) => setF({ ...f, pool: e.target.value })} className={fieldCls}>
                  {POOLS.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </Field>
            </div>
          </div>
        </GhModal>
      )}
    </div>
  )
}

/* ───────────── Integrations ───────────── */

const INTEGRATIONS: [string, string, string][] = [
  ['workday', 'Workday', 'HRIS sync — hires export to Workday as Pre-Hires'],
  ['okta', 'Okta', 'Single sign-on and user provisioning'],
  ['docusign', 'Docusign', 'Offer letters sent for e-signature'],
  ['outlook', 'Microsoft Outlook', 'Calendar sync for interviews'],
  ['zoom', 'Zoom', 'Video interviews'],
  ['teams', 'Microsoft Teams', 'Video interviews and notifications'],
  ['slack', 'Slack', 'Hiring team notifications'],
  ['linkedin', 'LinkedIn Recruiter', 'Sourcing and InMail sync'],
]

export function Integrations() {
  const { isAgent } = useDesk()
  const recs = useCollection<any>('greenhouse.integrations')
  const isOn = (id: string) => recs.find((r) => r.id === `int-${id}`)?.connected ?? !['slack', 'linkedin'].includes(id)
  return (
    <div className="flex-1 min-h-0 overflow-auto">
      <div className="max-w-[1000px] mx-auto px-8 py-7">
        <h1 className="text-[24px] font-semibold flex items-center gap-2 mb-5">
          <PlugsConnected size={24} /> Integrations
        </h1>
        <Card>
          {INTEGRATIONS.map(([id, name, desc]) => {
            const on = isOn(id)
            return (
              <div key={id} className="flex items-center gap-4 px-5 py-3.5 border-b border-[#EDEFEE] last:border-0">
                {id === 'linkedin' ? <span className="w-8 h-8 rounded bg-[#0A66C2] text-white text-[13px] font-bold flex items-center justify-center">in</span> : <img src={logoUrl(id)} alt="" className="w-8 h-8" />}
                <div className="flex-1">
                  <div className="text-[14px] font-medium">{name}</div>
                  <div className="text-[12.5px] text-[#5B6B66]">{desc}</div>
                </div>
                <span className={`text-[12.5px] font-medium ${on ? 'text-[#11734B]' : 'text-[#7A8884]'}`}>{on ? 'Connected' : 'Not connected'}</span>
                <Btn kind={on ? 'secondary' : 'primary'} data-agent={`greenhouse-integration-${id}`} onClick={() => db.upsert('greenhouse.integrations', { id: `int-${id}`, connected: !on, updatedAt: new Date().toISOString(), updatedBy: isAgent ? 'hworker' : undefined })}>
                  {on ? 'Disconnect' : 'Connect'}
                </Btn>
              </div>
            )
          })}
        </Card>
      </div>
    </div>
  )
}
