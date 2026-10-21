import { useMemo, useState } from 'react'
import { MagnifyingGlass, CaretDown, UserPlus, Key, ShieldCheck, Plus, UsersThree, ArrowsClockwise, CheckCircle, UserCircle } from '@phosphor-icons/react'
import { useCollection } from '@/db/db'
import { logoUrl } from '@/os/registry'
import { Card, PageHead } from './Admin'
import { Btn, fullName, HWChip, Initials, isFresh, StatusDot, STATUS, type OktaUser, type Route } from './shared'
import { fmtOkta } from './shared'

const FILTERS: [string, string, (u: OktaUser) => boolean][] = [
  ['all', 'Everyone', (u) => u.status !== 'DEPROVISIONED'],
  ['STAGED', 'Staged', (u) => u.status === 'STAGED'],
  ['PROVISIONED', 'Pending user action', (u) => u.status === 'PROVISIONED'],
  ['ACTIVE', 'Active', (u) => u.status === 'ACTIVE'],
  ['PASSWORD_EXPIRED', 'Password reset', (u) => u.status === 'PASSWORD_EXPIRED'],
  ['LOCKED_OUT', 'Locked out', (u) => u.status === 'LOCKED_OUT'],
  ['SUSPENDED', 'Suspended', (u) => u.status === 'SUSPENDED'],
  ['DEPROVISIONED', 'Deactivated', (u) => u.status === 'DEPROVISIONED'],
]

export function People({ go }: { go: (r: Route) => void }) {
  const users = useCollection<OktaUser>('okta.users')
  const [q, setQ] = useState('')
  const [f, setF] = useState('all')
  const [more, setMore] = useState(false)
  const pred = FILTERS.find((x) => x[0] === f)![2]
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return users
      .filter((u) => (s ? true : pred(u)))
      .filter((u) => !s || `${u.firstName} ${u.lastName} ${u.login} ${u.email}`.toLowerCase().includes(s))
      .sort((a, b) => a.firstName.localeCompare(b.firstName))
  }, [users, q, f])

  return (
    <div className="pb-8">
      <PageHead
        title="People"
        actions={
          <>
            <Btn primary label="Add person"><UserPlus size={16} weight="bold" /> Add person</Btn>
            <Btn label="Reset passwords"><Key size={16} /> Reset passwords</Btn>
            <Btn label="Reset multifactor"><ShieldCheck size={16} /> Reset multifactor</Btn>
            <div className="relative">
              <Btn label="More actions" onClick={() => setMore(!more)}>More actions <CaretDown size={13} /></Btn>
              {more && (
                <div className="absolute left-0 top-10 z-20 w-60 bg-white rounded-md border border-[#E1E1E6] shadow-[0_8px_24px_rgba(29,29,33,0.16)] py-1 text-[14px]">
                  {['Import users from CSV', 'Activate users', 'Deactivate users', 'Unlock people', 'Send self-service registration'].map((x) => (
                    <button key={x} onClick={() => setMore(false)} className="w-full text-left px-4 h-9 hover:bg-[#F4F4F4]">{x}</button>
                  ))}
                </div>
              )}
            </div>
          </>
        }
      />
      <div className="px-8 flex gap-5 items-start">
        {/* filters */}
        <div className="w-[200px] shrink-0 bg-white rounded-lg border border-[#E1E1E6] py-2">
          <div className="px-4 pt-1 pb-2 text-[12px] font-semibold text-[#6E6E78] uppercase tracking-wide">Filters</div>
          {FILTERS.map(([id, label, p]) => (
            <button
              key={id}
              data-agent={`okta-people-filter-${id.toLowerCase()}`}
              aria-label={`Filter ${label}`}
              onClick={() => setF(id)}
              className={`w-full flex items-center px-4 h-9 text-[14px] text-left ${f === id ? 'bg-[#E6EEFC] text-[#1450B8] font-semibold' : 'hover:bg-[#F4F4F4]'}`}
            >
              <span className="flex-1">{label}</span>
              <span className="text-[12px] text-[#6E6E78]">{users.filter(p).length}</span>
            </button>
          ))}
        </div>

        <div className="flex-1 min-w-0 bg-white rounded-lg border border-[#E1E1E6]">
          <div className="flex items-center gap-3 p-4">
            <div className="flex items-center gap-2 h-9 flex-1 max-w-[420px] rounded-[4px] border border-[#8C8C96] px-3 focus-within:border-[#1662DD] focus-within:shadow-[0_0_0_2px_#C4D7F7]">
              <MagnifyingGlass size={16} className="text-[#6E6E78]" />
              <input data-agent="okta-people-search" aria-label="Search people" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, username or email" className="flex-1 bg-transparent outline-none text-[14px]" />
            </div>
            <span className="text-[13px] text-[#6E6E78]">{rows.length} {rows.length === 1 ? 'person' : 'people'}</span>
            <div className="flex-1" />
            <button className="text-[13px] text-[#1662DD] font-medium">Advanced search</button>
          </div>
          <table className="w-full text-[14px]">
            <thead>
              <tr className="text-left text-[12px] text-[#46464F] border-y border-[#E1E1E6] bg-[#FAFAFA]">
                <th className="w-10 pl-4 py-2.5"><input type="checkbox" aria-label="Select all" className="accent-[#1662DD]" /></th>
                <th className="px-3 py-2.5 font-semibold">Person &amp; username</th>
                <th className="px-3 py-2.5 font-semibold">Primary email</th>
                <th className="px-3 py-2.5 font-semibold w-[170px]">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id} className={`border-b border-[#EBEBED] last:border-0 hover:bg-[#FAFAFA] ${isFresh((u as any).updatedAt) ? 'flash-new' : ''}`}>
                  <td className="pl-4 py-2.5"><input type="checkbox" aria-label={`Select ${fullName(u)}`} className="accent-[#1662DD]" /></td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-3">
                      <Initials name={fullName(u)} size={30} />
                      <div className="min-w-0">
                        <button
                          data-agent={`okta-user-${u.id}`}
                          aria-label={`Open ${fullName(u)}`}
                          onClick={() => go({ area: 'admin', page: 'user', userId: u.id, tab: 'applications' })}
                          className="text-[#1662DD] font-semibold hover:underline text-left"
                        >
                          {fullName(u)}
                        </button>
                        <div className="text-[12px] text-[#6E6E78] truncate">{u.login}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-[#46464F]">{u.email}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <StatusDot status={u.status} />
                      {u.updatedBy === 'hworker' && <HWChip />}
                    </div>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr><td colSpan={4} className="px-4 py-10 text-center text-[#6E6E78]">No people found matching “{q}”.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export function Groups() {
  const groups = useCollection('okta.groups')
  const users = useCollection<OktaUser>('okta.users')
  const [q, setQ] = useState('')
  const rows = groups.filter((g) => g.name.toLowerCase().includes(q.toLowerCase()))
  return (
    <div className="pb-8">
      <PageHead title="Groups" actions={<><Btn primary label="Add group"><Plus size={16} weight="bold" /> Add group</Btn><Btn label="Rules">Rules</Btn></>} />
      <div className="px-8">
        <div className="bg-white rounded-lg border border-[#E1E1E6]">
          <div className="p-4 flex items-center gap-3">
            <div className="flex items-center gap-2 h-9 w-[380px] rounded-[4px] border border-[#8C8C96] px-3">
              <MagnifyingGlass size={16} className="text-[#6E6E78]" />
              <input data-agent="okta-groups-search" aria-label="Search groups" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by group name" className="flex-1 bg-transparent outline-none text-[14px]" />
            </div>
            <span className="text-[13px] text-[#6E6E78]">{rows.length} groups</span>
          </div>
          <table className="w-full text-[14px]">
            <thead>
              <tr className="text-left text-[12px] text-[#46464F] border-y border-[#E1E1E6] bg-[#FAFAFA]">
                <th className="px-4 py-2.5 font-semibold">Name</th>
                <th className="px-3 py-2.5 font-semibold">Source</th>
                <th className="px-3 py-2.5 font-semibold w-[90px]">People</th>
                <th className="px-3 py-2.5 font-semibold w-[90px]">Apps</th>
                <th className="px-3 py-2.5 font-semibold w-[100px]">Directories</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((g) => (
                <tr key={g.id} data-agent={`okta-group-${g.id}`} className="border-b border-[#EBEBED] last:border-0 hover:bg-[#FAFAFA]">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-md bg-[#EEEEF0] flex items-center justify-center text-[#46464F]"><UsersThree size={18} /></span>
                      <div>
                        <div className="text-[#1662DD] font-semibold">{g.name}</div>
                        <div className="text-[12px] text-[#6E6E78]">{g.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    {g.source === 'Workday' ? <span className="flex items-center gap-1.5"><img src={logoUrl('workday')} className="w-4 h-4" alt="" /> Workday</span> : g.type === 'BUILT_IN' ? 'Okta (built-in)' : <span className="flex items-center gap-1.5"><img src={logoUrl('okta')} className="w-3.5 h-3.5" alt="" /> Okta</span>}
                  </td>
                  <td className="px-3 py-2.5">{users.filter((u) => u.groups.includes(g.id)).length}</td>
                  <td className="px-3 py-2.5">{g.apps.length}</td>
                  <td className="px-3 py-2.5">{g.source ? 1 : 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export function ProfileEditor() {
  const rows = [
    ['User (default)', 'Okta', 'okta', 'user', 34],
    ['Workday User', 'Workday', 'workday', 'workday', 58],
    ['Active Directory User', 'northwind.local', 'windows', 'active_directory', 41],
    ['Salesforce.com User', 'Salesforce.com', 'salesforce', 'salesforce', 27],
    ['Slack User', 'Slack', 'slack', 'slack', 19],
    ['Microsoft Office 365 User', 'Microsoft Office 365', 'outlook', 'office365', 46],
    ['ServiceNow UD User', 'ServiceNow UD', 'servicenow', 'servicenow_ud', 22],
    ['Zoom User', 'Zoom', 'zoom', 'zoomus', 14],
  ] as const
  return (
    <div className="pb-8">
      <PageHead title="Profile Editor" sub="Customize user profiles and attribute mappings between Okta and your apps and directories." actions={<Btn primary label="Create Okta user type"><Plus size={16} weight="bold" /> Create Okta user type</Btn>} />
      <div className="px-8">
        <Card pad={false}>
          <table className="w-full text-[14px]">
            <thead><tr className="text-left text-[12px] text-[#46464F] border-b border-[#E1E1E6] bg-[#FAFAFA]"><th className="px-5 py-2.5 font-semibold">Profile</th><th className="px-3 py-2.5 font-semibold">Type</th><th className="px-3 py-2.5 font-semibold">Variable name</th><th className="px-3 py-2.5 font-semibold">Attributes</th><th /></tr></thead>
            <tbody>
              {rows.map(([n, src, logo, v, c]) => (
                <tr key={n} className="border-b border-[#EBEBED] last:border-0">
                  <td className="px-5 py-3"><div className="flex items-center gap-3"><img src={logoUrl(logo)} className="w-7 h-7" alt="" /><div><div className="text-[#1662DD] font-semibold">{n}</div><div className="text-[12px] text-[#6E6E78]">{src}</div></div></div></td>
                  <td className="px-3 py-3">{src === 'Okta' ? 'Okta user type' : src === 'northwind.local' || src === 'Workday' ? 'Directory' : 'App'}</td>
                  <td className="px-3 py-3 font-mono text-[12px] text-[#46464F]">{v}</td>
                  <td className="px-3 py-3">{c}</td>
                  <td className="px-3 py-3 text-right"><Btn small label="Mappings">Mappings</Btn></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  )
}

export function DirectoryIntegrations() {
  const users = useCollection<OktaUser>('okta.users')
  return (
    <div className="pb-8">
      <PageHead title="Directory Integrations" actions={<><Btn primary label="Add LDAP Directory"><Plus size={16} weight="bold" /> Add LDAP Directory</Btn><Btn label="Add Active Directory">Add Active Directory</Btn></>} />
      <div className="px-8 space-y-4">
        {[
          { name: 'Workday', logo: 'workday', type: 'HR as a Source', status: 'Active', last: '19 hours ago', note: '1 user created, 3 updated', users: users.filter((u) => u.source === 'Workday').length },
          { name: 'northwind.local', logo: 'windows', type: 'Active Directory', status: 'Active', last: '42 minutes ago', note: '2 agents connected (NW-DC01, NW-DC02)', users: users.filter((u) => u.source === 'Active Directory').length },
        ].map((d) => (
          <Card key={d.name}>
            <div className="flex items-center gap-4 pt-4">
              <img src={logoUrl(d.logo)} className="w-10 h-10" alt="" />
              <div className="flex-1">
                <div className="text-[16px] font-semibold text-[#1662DD]">{d.name}</div>
                <div className="text-[13px] text-[#6E6E78]">{d.type} · {d.users} users · Last import {d.last} — {d.note}</div>
              </div>
              <span className="flex items-center gap-1.5 text-[13px] text-[#1E8A3A] font-semibold"><CheckCircle size={16} weight="fill" /> {d.status}</span>
              <Btn small label={`Import now from ${d.name}`}><ArrowsClockwise size={14} /> Import now</Btn>
            </div>
          </Card>
        ))}
        <Card title="Recent imports">
          <table className="w-full text-[13px]">
            <tbody>
              {[0, 1, 2, 3, 4].map((i) => (
                <tr key={i} className="border-b border-[#EBEBED] last:border-0">
                  <td className="py-2 flex items-center gap-2"><UserCircle size={16} className="text-[#6E6E78]" /> {i % 2 ? 'northwind.local' : 'Workday'}</td>
                  <td className="py-2 text-[#6E6E78]">{fmtOkta(new Date(Date.now() - (i * 0.5 + 0.8) * 86400000).toISOString())}</td>
                  <td className="py-2">{i === 0 ? '1 created · 3 updated' : `${i + 1} updated`}</td>
                  <td className="py-2"><StatusDot status="ACTIVE" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  )
}

export { STATUS }
