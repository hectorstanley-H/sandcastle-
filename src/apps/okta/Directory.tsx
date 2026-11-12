import { useMemo, useState } from 'react'
import { MagnifyingGlass, CaretDown, UserPlus, Key, ShieldCheck, Plus, UsersThree, ArrowsClockwise, CheckCircle, UserCircle } from '@phosphor-icons/react'
import { db, uid, useCollection } from '@/db/db'
import { useDesk } from '@/os/context'
import { logoUrl } from '@/os/registry'
import { Card, PageHead } from './Admin'
import { addLog, Btn, fullName, HWChip, Initials, inputCls, isFresh, Modal, Notice, StatusDot, STATUS, Toggle, useOktaSetting, userTarget, type OktaUser, type Route } from './shared'
import { fmtOkta } from './shared'
import { oktaId } from './seed'

const DEPTS = ['Operations', 'Finance', 'Sales', 'Engineering', 'IT', 'People', 'Customer Success', 'Marketing', 'Executive']
const DEPT_GROUP: Record<string, string> = { Operations: 'okta-g-ops', Finance: 'okta-g-finance', Sales: 'okta-g-sales', Engineering: 'okta-g-eng', IT: 'okta-g-it', People: 'okta-g-people', 'Customer Success': 'okta-g-cs', Marketing: 'okta-g-mkt', Executive: 'okta-g-exec' }

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

export function People({ go, initialFilter }: { go: (r: Route) => void; initialFilter?: string }) {
  const { isAgent } = useDesk()
  const users = useCollection<OktaUser>('okta.users')
  const [q, setQ] = useState('')
  const [f, setF] = useState(() => (initialFilter && FILTERS.some((x) => x[0] === initialFilter) ? initialFilter : 'all'))
  const [more, setMore] = useState(false)
  const [sel, setSel] = useState<string[]>([])
  const [notice, setNotice] = useState('')
  const [warn, setWarn] = useState('')
  const [dlg, setDlg] = useState<null | 'add' | 'csv' | 'pw' | 'mfa' | 'deactivate'>(null)
  const [adv, setAdv] = useState(false)
  const [af, setAf] = useState({ dept: 'all', title: '', source: 'all' })
  const pred = FILTERS.find((x) => x[0] === f)![2]
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return users
      .filter((u) => (s ? true : pred(u)))
      .filter((u) => !s || `${u.firstName} ${u.lastName} ${u.login} ${u.email}`.toLowerCase().includes(s))
      .filter((u) => !adv || ((af.dept === 'all' || u.department === af.dept) && (!af.title || (u.title ?? '').toLowerCase().includes(af.title.toLowerCase())) && (af.source === 'all' || (u.source ?? 'Okta') === af.source)))
      .sort((a, b) => a.firstName.localeCompare(b.firstName))
  }, [users, q, f, adv, af])
  const picked = users.filter((u) => sel.includes(u.id))
  const stamp = () => ({ updatedBy: isAgent ? 'hworker' : 'alex', updatedAt: new Date().toISOString() })
  /** run a bulk action on the selected people that are eligible for it */
  const bulk = (label: string, eligible: (u: OktaUser) => boolean, apply: (u: OktaUser) => void) => {
    if (!picked.length) {
      setWarn(`Select one or more people first, then choose “${label}”.`)
      return
    }
    const ok = picked.filter(eligible)
    ok.forEach(apply)
    setWarn('')
    setSel([])
    setNotice(`${label}: ${ok.length} ${ok.length === 1 ? 'person' : 'people'} updated${picked.length > ok.length ? ` · ${picked.length - ok.length} skipped (not eligible)` : ''}.`)
  }
  const activateU = (u: OktaUser) => {
    db.update('okta.users', u.id, { status: 'ACTIVE', activated: new Date().toISOString(), ...stamp() })
    addLog(isAgent, 'user.lifecycle.activate', 'Activate Okta user', [userTarget(u)])
  }
  const unlockU = (u: OktaUser) => {
    db.update('okta.users', u.id, { status: 'ACTIVE', ...stamp() })
    addLog(isAgent, 'user.account.unlock', 'Unlock user account', [userTarget(u)])
  }
  const deactivateU = (u: OktaUser) => {
    db.update('okta.users', u.id, { status: 'DEPROVISIONED', ...stamp() })
    addLog(isAgent, 'user.lifecycle.deactivate', 'Deactivate Okta user', [userTarget(u)])
  }
  const resetPw = (u: OktaUser) => {
    db.update('okta.users', u.id, { status: u.status === 'LOCKED_OUT' ? 'ACTIVE' : 'PASSWORD_EXPIRED', ...stamp() })
    addLog(isAgent, 'user.account.reset_password', 'Fired when the user’s Okta password is reset', [userTarget(u)])
  }
  const resetMfa = (u: OktaUser) => {
    db.update('okta.users', u.id, { mfa: [], ...stamp() })
    addLog(isAgent, 'user.mfa.factor.reset_all', 'Reset all factors for user', [userTarget(u)])
  }
  const live = (u: OktaUser) => ['ACTIVE', 'PASSWORD_EXPIRED', 'LOCKED_OUT'].includes(u.status)

  return (
    <div className="pb-8">
      <PageHead
        title="People"
        actions={
          <>
            <Btn primary label="Add person" agent="okta-people-add" onClick={() => setDlg('add')}><UserPlus size={16} weight="bold" /> Add person</Btn>
            <Btn label="Reset passwords" onClick={() => (picked.length ? setDlg('pw') : setWarn('Select one or more people first, then choose “Reset passwords”.'))}><Key size={16} /> Reset passwords</Btn>
            <Btn label="Reset multifactor" onClick={() => (picked.length ? setDlg('mfa') : setWarn('Select one or more people first, then choose “Reset multifactor”.'))}><ShieldCheck size={16} /> Reset multifactor</Btn>
            <div className="relative">
              <Btn label="More actions" onClick={() => setMore(!more)}>More actions <CaretDown size={13} /></Btn>
              {more && (
                <div className="absolute left-0 top-10 z-20 w-60 bg-white rounded-md border border-[#E1E1E6] shadow-[0_8px_24px_rgba(29,29,33,0.16)] py-1 text-[14px]">
                  {(
                    [
                      ['Import users from CSV', () => setDlg('csv')],
                      ['Activate users', () => bulk('Activate users', (u) => u.status === 'STAGED' || u.status === 'PROVISIONED', activateU)],
                      ['Deactivate users', () => (picked.length ? setDlg('deactivate') : setWarn('Select one or more people first, then choose “Deactivate users”.'))],
                      ['Unlock people', () => bulk('Unlock people', (u) => u.status === 'LOCKED_OUT', unlockU)],
                      [
                        'Send self-service registration',
                        () =>
                          bulk('Send self-service registration', (u) => u.status === 'STAGED' || u.status === 'PROVISIONED', (u) => {
                            db.update('okta.users', u.id, { status: 'PROVISIONED', ...stamp() })
                            addLog(isAgent, 'system.email.send_activation', 'Send user activation email', [userTarget(u)])
                          }),
                      ],
                    ] as [string, () => void][]
                  ).map(([x, fn]) => (
                    <button key={x} role="menuitem" onClick={() => (setMore(false), fn())} className="w-full text-left px-4 h-9 hover:bg-[#F4F4F4]">{x}</button>
                  ))}
                </div>
              )}
            </div>
          </>
        }
      />
      {(notice || warn) && (
        <div className="px-8 mb-4 space-y-2">
          {notice && <Notice text={notice} onClose={() => setNotice('')} />}
          {warn && (
            <div className="flex items-center gap-2 rounded-md bg-[#FEF3DF] border border-[#F5D69B] px-4 py-2.5 text-[14px] text-[#8A5300]">
              <span className="flex-1">{warn}</span>
              <button aria-label="Dismiss" onClick={() => setWarn('')} className="text-[16px] leading-none px-1">×</button>
            </div>
          )}
        </div>
      )}
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
            <span className="text-[13px] text-[#6E6E78]">{rows.length} {rows.length === 1 ? 'person' : 'people'}{sel.length ? ` · ${sel.length} selected` : ''}</span>
            <div className="flex-1" />
            <button onClick={() => setAdv(!adv)} className="text-[13px] text-[#1662DD] font-medium">{adv ? 'Hide advanced search' : 'Advanced search'}</button>
          </div>
          {adv && (
            <div className="px-4 pb-4 grid grid-cols-3 gap-3">
              <label>
                <span className="block text-[12px] font-semibold text-[#46464F] mb-1">Department</span>
                <select aria-label="Department filter" value={af.dept} onChange={(e) => setAf({ ...af, dept: e.target.value })} className={inputCls}>
                  <option value="all">Any</option>
                  {[...new Set(users.map((u) => u.department).filter(Boolean))].sort().map((d) => <option key={d}>{d}</option>)}
                </select>
              </label>
              <label>
                <span className="block text-[12px] font-semibold text-[#46464F] mb-1">Title contains</span>
                <input aria-label="Title filter" value={af.title} onChange={(e) => setAf({ ...af, title: e.target.value })} className={inputCls} />
              </label>
              <label>
                <span className="block text-[12px] font-semibold text-[#46464F] mb-1">Profile source</span>
                <select aria-label="Profile source filter" value={af.source} onChange={(e) => setAf({ ...af, source: e.target.value })} className={inputCls}>
                  <option value="all">Any</option>
                  {[...new Set(users.map((u) => u.source ?? 'Okta'))].sort().map((d) => <option key={d}>{d}</option>)}
                </select>
              </label>
            </div>
          )}
          <table className="w-full text-[14px]">
            <thead>
              <tr className="text-left text-[12px] text-[#46464F] border-y border-[#E1E1E6] bg-[#FAFAFA]">
                <th className="w-10 pl-4 py-2.5"><input type="checkbox" aria-label="Select all" checked={rows.length > 0 && rows.every((u) => sel.includes(u.id))} onChange={(e) => setSel(e.target.checked ? rows.map((u) => u.id) : [])} className="accent-[#1662DD]" /></th>
                <th className="px-3 py-2.5 font-semibold">Person &amp; username</th>
                <th className="px-3 py-2.5 font-semibold">Primary email</th>
                <th className="px-3 py-2.5 font-semibold w-[170px]">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id} className={`border-b border-[#EBEBED] last:border-0 hover:bg-[#FAFAFA] ${isFresh((u as any).updatedAt) ? 'flash-new' : ''}`}>
                  <td className="pl-4 py-2.5"><input type="checkbox" aria-label={`Select ${fullName(u)}`} checked={sel.includes(u.id)} onChange={(e) => setSel((s) => (e.target.checked ? [...s, u.id] : s.filter((x) => x !== u.id)))} className="accent-[#1662DD]" /></td>
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
      {dlg === 'add' && (
        <AddPersonModal
          onClose={() => setDlg(null)}
          onDone={(u, m) => {
            setDlg(null)
            setNotice(m)
            go({ area: 'admin', page: 'user', userId: u, tab: 'applications' })
          }}
        />
      )}
      {dlg === 'csv' && <CsvImportModal onClose={() => setDlg(null)} onDone={(m) => (setDlg(null), setNotice(m))} />}
      {(dlg === 'pw' || dlg === 'mfa' || dlg === 'deactivate') && (
        <Modal
          title={dlg === 'pw' ? 'Reset passwords' : dlg === 'mfa' ? 'Reset multifactor' : 'Deactivate users'}
          onClose={() => setDlg(null)}
          footer={
            <>
              <Btn label="Cancel" onClick={() => setDlg(null)}>Cancel</Btn>
              <Btn
                primary={dlg !== 'deactivate'}
                danger={dlg === 'deactivate'}
                label="Confirm"
                onClick={() => {
                  if (dlg === 'pw') bulk('Reset passwords', live, resetPw)
                  else if (dlg === 'mfa') bulk('Reset multifactor', (u) => u.mfa.length > 0, resetMfa)
                  else bulk('Deactivate users', (u) => u.status !== 'DEPROVISIONED', deactivateU)
                  setDlg(null)
                }}
              >
                {dlg === 'pw' ? 'Send reset emails' : dlg === 'mfa' ? 'Reset factors' : 'Deactivate'}
              </Btn>
            </>
          }
        >
          {dlg === 'pw' && <>Password reset emails will be sent to {picked.filter(live).length} of the {picked.length} selected people. Locked-out users are unlocked.</>}
          {dlg === 'mfa' && <>All enrolled authenticators will be reset for {picked.filter((u) => u.mfa.length > 0).length} of the {picked.length} selected people. They’ll enroll again at next sign-in.</>}
          {dlg === 'deactivate' && <>Deactivate {picked.filter((u) => u.status !== 'DEPROVISIONED').length} people? They’ll lose access to Okta and all assigned apps immediately.</>}
          <ul className="mt-3 text-[13px] text-[#46464F] max-h-[160px] overflow-auto">
            {picked.map((u) => (
              <li key={u.id}>• {fullName(u)} ({u.login})</li>
            ))}
          </ul>
        </Modal>
      )}
    </div>
  )
}

function AddPersonModal({ onClose, onDone }: { onClose: () => void; onDone: (userId: string, msg: string) => void }) {
  const { isAgent } = useDesk()
  const groups = useCollection<any>('okta.groups')
  const [f, setF] = useState({ type: 'User', firstName: '', lastName: '', login: '', email: '', title: '', department: 'Operations', group: '', activate: 'now' })
  const [err, setErr] = useState('')
  const set = (k: keyof typeof f) => (e: any) => {
    const v = e.target.value
    setErr('')
    setF((o) => {
      const n = { ...o, [k]: v }
      if ((k === 'firstName' || k === 'lastName') && (!o.login || o.login === autoLogin(o))) n.login = autoLogin(n)
      if (k === 'login' || ((k === 'firstName' || k === 'lastName') && (!o.email || o.email === o.login))) n.email = n.login
      return n
    })
  }
  const save = () => {
    if (!f.firstName.trim() || !f.lastName.trim()) return setErr('First name and last name are required.')
    if (!/^[^@\s]+@[^@\s]+\.[a-z]+$/i.test(f.login)) return setErr('Username must be an email address.')
    if (db.get<OktaUser>('okta.users').some((u) => u.login.toLowerCase() === f.login.toLowerCase())) return setErr('A person with this username already exists.')
    const id = uid('okta-u')
    const now = new Date().toISOString()
    const groupsFor = ['okta-g-everyone', DEPT_GROUP[f.department], f.group].filter(Boolean) as string[]
    const status = f.activate === 'now' ? 'PROVISIONED' : 'STAGED'
    const rec: OktaUser = {
      id,
      oktaId: oktaId(id),
      firstName: f.firstName.trim(),
      lastName: f.lastName.trim(),
      login: f.login.trim(),
      email: (f.email || f.login).trim(),
      title: f.title.trim(),
      department: f.department,
      manager: '',
      status,
      created: now,
      mfa: [],
      groups: [...new Set(groupsFor)],
      updatedBy: isAgent ? 'hworker' : 'alex',
      updatedAt: now,
    }
    db.insert('okta.users', rec)
    addLog(isAgent, 'user.lifecycle.create', 'Create Okta user', [userTarget(rec)])
    if (status === 'PROVISIONED') addLog(isAgent, 'system.email.send_activation', 'Send user activation email', [userTarget(rec)])
    onDone(id, `${fullName(rec)} was added${status === 'PROVISIONED' ? ` and an activation email was sent to ${rec.email}` : ' as Staged'}.`)
  }
  return (
    <Modal
      title="Add person"
      onClose={onClose}
      width={600}
      footer={
        <>
          <Btn label="Cancel" onClick={onClose}>Cancel</Btn>
          <Btn primary agent="okta-add-person-save" label="Save" onClick={save}>Save</Btn>
        </>
      }
    >
      {err && <div className="mb-3 rounded-md bg-[#FCE9E8] border border-[#F3C1BD] px-3 py-2 text-[13px] text-[#B42318]">{err}</div>}
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="block text-[13px] font-semibold mb-1">User type</span>
          <select aria-label="User type" value={f.type} onChange={set('type')} className={inputCls}>
            <option>User</option>
            <option>Contractor</option>
          </select>
        </label>
        <label className="block">
          <span className="block text-[13px] font-semibold mb-1">Department</span>
          <select aria-label="Department" value={f.department} onChange={set('department')} className={inputCls}>
            {DEPTS.map((d) => <option key={d}>{d}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="block text-[13px] font-semibold mb-1">First name</span>
          <input aria-label="First name" value={f.firstName} onChange={set('firstName')} className={inputCls} />
        </label>
        <label className="block">
          <span className="block text-[13px] font-semibold mb-1">Last name</span>
          <input aria-label="Last name" value={f.lastName} onChange={set('lastName')} className={inputCls} />
        </label>
        <label className="block col-span-2">
          <span className="block text-[13px] font-semibold mb-1">Username</span>
          <input aria-label="Username" value={f.login} onChange={set('login')} className={inputCls} />
        </label>
        <label className="block col-span-2">
          <span className="block text-[13px] font-semibold mb-1">Primary email</span>
          <input aria-label="Primary email" value={f.email} onChange={set('email')} className={inputCls} />
        </label>
        <label className="block">
          <span className="block text-[13px] font-semibold mb-1">Title</span>
          <input aria-label="Title" value={f.title} onChange={set('title')} className={inputCls} />
        </label>
        <label className="block">
          <span className="block text-[13px] font-semibold mb-1">Groups (optional)</span>
          <select aria-label="Group" value={f.group} onChange={set('group')} className={inputCls}>
            <option value="">None</option>
            {groups.filter((g) => g.type === 'OKTA_GROUP').map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </label>
        <label className="block col-span-2">
          <span className="block text-[13px] font-semibold mb-1">Activation</span>
          <select aria-label="Activation" value={f.activate} onChange={set('activate')} className={inputCls}>
            <option value="now">Activate now (send activation email)</option>
            <option value="later">Activate later (Staged)</option>
          </select>
        </label>
      </div>
    </Modal>
  )
}

const autoLogin = (o: { firstName: string; lastName: string }) => (o.firstName || o.lastName ? `${o.firstName.trim().toLowerCase()}.${o.lastName.trim().toLowerCase().replace(/[^a-z]/g, '')}@northwind.com` : '')

function CsvImportModal({ onClose, onDone }: { onClose: () => void; onDone: (m: string) => void }) {
  const { isAgent } = useDesk()
  const [text, setText] = useState('firstName,lastName,email,title,department\nRiley,Chen,riley.chen@northwind.com,Warehouse Associate,Operations')
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  const body = lines[0]?.toLowerCase().startsWith('firstname') ? lines.slice(1) : lines
  const parsed = body.map((l) => l.split(',').map((x) => x.trim())).filter((c) => c.length >= 3 && c[2].includes('@'))
  const run = () => {
    const existing = new Set(db.get<OktaUser>('okta.users').map((u) => u.login.toLowerCase()))
    let n = 0
    for (const [firstName, lastName, email, title = '', department = 'Operations'] of parsed) {
      if (existing.has(email.toLowerCase())) continue
      const id = uid('okta-u')
      const rec: OktaUser = { id, oktaId: oktaId(id), firstName, lastName, login: email, email, title, department, manager: '', status: 'STAGED', created: new Date().toISOString(), mfa: [], groups: ['okta-g-everyone', DEPT_GROUP[department]].filter(Boolean) as string[], updatedBy: isAgent ? 'hworker' : 'alex', updatedAt: new Date().toISOString() }
      db.insert('okta.users', rec)
      addLog(isAgent, 'user.lifecycle.create', 'Create Okta user (CSV import)', [userTarget(rec)])
      n++
    }
    onDone(`CSV import complete: ${n} ${n === 1 ? 'person' : 'people'} created as Staged${parsed.length > n ? `, ${parsed.length - n} skipped (already exist)` : ''}.`)
  }
  return (
    <Modal
      title="Import users from CSV"
      onClose={onClose}
      width={640}
      footer={
        <>
          <Btn label="Cancel" onClick={onClose}>Cancel</Btn>
          <Btn primary label="Import users" disabled={!parsed.length} onClick={run}>Import {parsed.length} {parsed.length === 1 ? 'user' : 'users'}</Btn>
        </>
      }
    >
      <p className="mb-2 text-[13px] text-[#6E6E78]">Paste rows as <span className="font-mono">firstName,lastName,email,title,department</span>. Imported people are created as Staged.</p>
      <textarea aria-label="CSV rows" value={text} onChange={(e) => setText(e.target.value)} className="w-full h-40 rounded-[4px] border border-[#8C8C96] p-2.5 font-mono text-[12.5px] outline-none focus:border-[#1662DD]" />
    </Modal>
  )
}

export function Groups({ go }: { go?: (r: Route) => void }) {
  const { isAgent } = useDesk()
  const groups = useCollection('okta.groups')
  const users = useCollection<OktaUser>('okta.users')
  const [q, setQ] = useState('')
  const [adding, setAdding] = useState(false)
  const [rulesOpen, setRulesOpen] = useState(false)
  const [nf, setNf] = useState({ name: '', description: '' })
  const [rules, setRules] = useOktaSetting<Record<string, boolean>>('group-rules', { ops: true, boston: true, contractors: true, mfa: false })
  const rows = groups.filter((g) => g.name.toLowerCase().includes(q.toLowerCase()))
  return (
    <div className="pb-8">
      <PageHead title="Groups" actions={<><Btn primary label="Add group" agent="okta-groups-add" onClick={() => setAdding(true)}><Plus size={16} weight="bold" /> Add group</Btn><Btn label="Rules" onClick={() => setRulesOpen(!rulesOpen)}>Rules</Btn></>} />
      {rulesOpen && (
        <div className="px-8 mb-4">
          <Card title="Group rules" right={<span className="text-[12px] text-[#6E6E78]">Rules add people to groups automatically based on profile attributes</span>}>
            {(
              [
                ['ops', 'Operations department', 'user.department == "Operations"', 'Dept - Operations'],
                ['boston', 'Boston office', 'user.city == "Boston"', 'Location - Boston HQ'],
                ['contractors', 'Contractors from Workday', 'user.userType == "Contractor"', 'Contractors'],
                ['mfa', 'Admins need phishing-resistant MFA', 'isMemberOfGroup("Okta Super Admins")', 'MFA - Phishing Resistant'],
              ] as const
            ).map(([k, n, expr, g]) => (
              <div key={k} className="flex items-center gap-4 py-2.5 border-t border-[#EBEBED] text-[14px]">
                <div className="flex-1">
                  <div className="font-semibold">{n}</div>
                  <div className="text-[12px] text-[#6E6E78]"><span className="font-mono">{expr}</span> → {g}</div>
                </div>
                <span className={`text-[12px] font-semibold ${rules[k] ? 'text-[#1E8A3A]' : 'text-[#6E6E78]'}`}>{rules[k] ? 'Active' : 'Inactive'}</span>
                <Toggle on={!!rules[k]} label={`Activate rule ${n}`} onChange={(on) => (setRules({ [k]: on }), addLog(isAgent, on ? 'group.rule.activate' : 'group.rule.deactivate', on ? 'Activate group rule' : 'Deactivate group rule', [{ type: 'GroupRule', displayName: n, alternateId: k }]))} />
              </div>
            ))}
          </Card>
        </div>
      )}
      {adding && (
        <Modal
          title="Add group"
          onClose={() => setAdding(false)}
          footer={
            <>
              <Btn label="Cancel" onClick={() => setAdding(false)}>Cancel</Btn>
              <Btn
                primary
                label="Save"
                disabled={!nf.name.trim() || groups.some((g) => g.name.toLowerCase() === nf.name.trim().toLowerCase())}
                onClick={() => {
                  const id = uid('okta-g')
                  db.insert('okta.groups', { id, name: nf.name.trim(), description: nf.description.trim(), type: 'OKTA_GROUP', apps: [] })
                  addLog(isAgent, 'group.lifecycle.create', 'Create Okta group', [{ type: 'UserGroup', displayName: nf.name.trim(), alternateId: id }])
                  setAdding(false)
                  setNf({ name: '', description: '' })
                  go?.({ area: 'admin', page: 'group', groupId: id })
                }}
              >
                Save
              </Btn>
            </>
          }
        >
          <label className="block mb-3">
            <span className="block text-[13px] font-semibold mb-1">Name</span>
            <input aria-label="Group name" value={nf.name} onChange={(e) => setNf({ ...nf, name: e.target.value })} className={inputCls} />
          </label>
          <label className="block">
            <span className="block text-[13px] font-semibold mb-1">Group description (optional)</span>
            <input aria-label="Group description" value={nf.description} onChange={(e) => setNf({ ...nf, description: e.target.value })} className={inputCls} />
          </label>
        </Modal>
      )}
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
                <tr key={g.id} data-agent={`okta-group-${g.id}`} onClick={() => go?.({ area: 'admin', page: 'group', groupId: g.id })} className="border-b border-[#EBEBED] last:border-0 hover:bg-[#FAFAFA] cursor-pointer">
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
  const { isAgent } = useDesk()
  const types = useCollection<any>('okta.usertypes')
  const [mapFor, setMapFor] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [nt, setNt] = useState({ name: '', variable: '' })
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
      <PageHead title="Profile Editor" sub="Customize user profiles and attribute mappings between Okta and your apps and directories." actions={<Btn primary label="Create Okta user type" onClick={() => setCreating(true)}><Plus size={16} weight="bold" /> Create Okta user type</Btn>} />
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
                  <td className="px-3 py-3 text-right"><Btn small label="Mappings" onClick={() => setMapFor(n)}>Mappings</Btn></td>
                </tr>
              ))}
              {types.map((t) => (
                <tr key={t.id} className="border-b border-[#EBEBED] last:border-0">
                  <td className="px-5 py-3"><div className="flex items-center gap-3"><img src={logoUrl('okta')} className="w-7 h-7" alt="" /><div><div className="text-[#1662DD] font-semibold">{t.name}</div><div className="text-[12px] text-[#6E6E78]">Okta</div></div></div></td>
                  <td className="px-3 py-3">Okta user type</td>
                  <td className="px-3 py-3 font-mono text-[12px] text-[#46464F]">{t.variable}</td>
                  <td className="px-3 py-3">34</td>
                  <td className="px-3 py-3 text-right"><Btn small label="Mappings" onClick={() => setMapFor(t.name)}>Mappings</Btn></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
      {mapFor && (
        <Modal title={`${mapFor} → Okta User mappings`} onClose={() => setMapFor(null)} width={640} footer={<Btn primary label="Close" onClick={() => setMapFor(null)}>Close</Btn>}>
          <table className="w-full text-[13px]">
            <thead><tr className="text-left text-[12px] text-[#46464F] border-b border-[#E1E1E6]"><th className="py-2 font-semibold">Source attribute</th><th className="py-2 font-semibold">Okta attribute</th><th className="py-2 font-semibold">Apply on</th></tr></thead>
            <tbody>
              {[['firstName', 'firstName'], ['lastName', 'lastName'], ['email', 'email'], ['title', 'title'], ['department', 'department'], ['managerId', 'managerId'], ['workPhone', 'primaryPhone'], ['employeeId', 'employeeNumber']].map(([a, b]) => (
                <tr key={a} className="border-b border-[#EBEBED] last:border-0">
                  <td className="py-2 font-mono">{mapFor.toLowerCase().includes('workday') ? `appuser.${a}` : `user.${b}`}</td>
                  <td className="py-2 font-mono">user.{b}</td>
                  <td className="py-2">Create and update</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Modal>
      )}
      {creating && (
        <Modal
          title="Create Okta user type"
          onClose={() => setCreating(false)}
          footer={
            <>
              <Btn label="Cancel" onClick={() => setCreating(false)}>Cancel</Btn>
              <Btn
                primary
                label="Create user type"
                disabled={!nt.name.trim()}
                onClick={() => {
                  const variable = nt.variable.trim() || nt.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_')
                  db.insert('okta.usertypes', { id: uid('okta-ut'), name: nt.name.trim(), variable })
                  addLog(isAgent, 'system.user_type.create', 'Create user type', [{ type: 'UserType', displayName: nt.name.trim(), alternateId: variable }])
                  setCreating(false)
                  setNt({ name: '', variable: '' })
                }}
              >
                Create user type
              </Btn>
            </>
          }
        >
          <label className="block mb-3">
            <span className="block text-[13px] font-semibold mb-1">Display name</span>
            <input aria-label="User type display name" value={nt.name} onChange={(e) => setNt({ ...nt, name: e.target.value })} placeholder="e.g. Contractor" className={inputCls} />
          </label>
          <label className="block">
            <span className="block text-[13px] font-semibold mb-1">Variable name</span>
            <input aria-label="User type variable name" value={nt.variable} onChange={(e) => setNt({ ...nt, variable: e.target.value })} placeholder="contractor" className={inputCls + ' font-mono'} />
          </label>
        </Modal>
      )}
    </div>
  )
}

export function DirectoryIntegrations({ go }: { go?: (r: Route) => void }) {
  const { isAgent } = useDesk()
  const users = useCollection<OktaUser>('okta.users')
  const [imp, setImp] = useOktaSetting<{ runs: { src: string; at: string; note: string }[] }>('directory-imports', { runs: [] })
  const [busy, setBusy] = useState<string | null>(null)
  const [addDir, setAddDir] = useState<null | 'LDAP' | 'Active Directory'>(null)
  const lastRun = (name: string) => imp.runs.filter((r) => r.src === name).slice(-1)[0]
  const runImport = (name: string) => {
    setBusy(name)
    addLog(isAgent, 'system.import.start', `Import started: ${name}`, [{ type: 'AppInstance', displayName: name, alternateId: name.toLowerCase() }])
    setTimeout(() => {
      const at = new Date().toISOString()
      setImp({ runs: [...imp.runs, { src: name, at, note: 'No changes' }] })
      addLog(isAgent, 'system.import.complete', `Import complete: ${name} (0 created, 0 updated)`, [{ type: 'AppInstance', displayName: name, alternateId: name.toLowerCase() }])
      setBusy(null)
    }, 1200)
  }
  return (
    <div className="pb-8">
      <PageHead title="Directory Integrations" actions={<><Btn primary label="Add LDAP Directory" onClick={() => setAddDir('LDAP')}><Plus size={16} weight="bold" /> Add LDAP Directory</Btn><Btn label="Add Active Directory" onClick={() => setAddDir('Active Directory')}>Add Active Directory</Btn></>} />
      {addDir && (
        <Modal title={`Add ${addDir}`} onClose={() => setAddDir(null)} footer={<><Btn label="Cancel" onClick={() => setAddDir(null)}>Cancel</Btn><Btn primary label="Go to Downloads" onClick={() => (setAddDir(null), go?.({ area: 'admin', page: 'downloads' }))}>Download agent</Btn></>}>
          <ol className="list-decimal pl-5 space-y-1.5 text-[14px]">
            <li>Install the Okta {addDir === 'LDAP' ? 'LDAP' : 'Active Directory'} Agent on a server in your network.</li>
            <li>Sign in to northwind-admin.okta.com from the agent installer to register it.</li>
            <li>Choose the OUs or base DN to import users and groups from.</li>
            <li>Run an import and review matches before activating users.</li>
          </ol>
        </Modal>
      )}
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
                <div className="text-[13px] text-[#6E6E78]">{d.type} · {d.users} users · Last import {lastRun(d.name) ? `${fmtOkta(lastRun(d.name)!.at)} — ${lastRun(d.name)!.note}` : `${d.last} — ${d.note}`}</div>
              </div>
              <span className="flex items-center gap-1.5 text-[13px] text-[#1E8A3A] font-semibold"><CheckCircle size={16} weight="fill" /> {d.status}</span>
              <Btn small label={`Import now from ${d.name}`} disabled={busy === d.name} onClick={() => runImport(d.name)}><ArrowsClockwise size={14} className={busy === d.name ? 'animate-spin' : ''} /> {busy === d.name ? 'Importing…' : 'Import now'}</Btn>
            </div>
          </Card>
        ))}
        <Card title="Recent imports">
          <table className="w-full text-[13px]">
            <tbody>
              {[...imp.runs].reverse().map((r, i) => (
                <tr key={`run-${i}`} className="border-b border-[#EBEBED] last:border-0">
                  <td className="py-2 flex items-center gap-2"><UserCircle size={16} className="text-[#6E6E78]" /> {r.src}</td>
                  <td className="py-2 text-[#6E6E78]">{fmtOkta(r.at)}</td>
                  <td className="py-2">{r.note}</td>
                  <td className="py-2"><StatusDot status="ACTIVE" /></td>
                </tr>
              ))}
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
