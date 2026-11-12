import { useState } from 'react'
import { MagnifyingGlass, CaretDown, GearSix, SquaresFour, Plus, Check } from '@phosphor-icons/react'
import { db, uid, useCollection } from '@/db/db'
import { useDesk } from '@/os/context'
import { logoUrl } from '@/os/registry'
import { Card, PageHead } from './Admin'
import { addLog, AppLogo, appTarget, Btn, fmtOkta, fullName, inputCls, Menu, Modal, Notice, userTarget, type OktaApp, type OktaAssignment, type OktaUser, type Route } from './shared'
import { oktaId } from './seed'

/** Okta Integration Network entries that aren't in the org yet */
const CATALOG: { id: string; label: string; logo: string; signOn: string; provisioning?: boolean; category: string }[] = [
  { id: 'asana', label: 'Asana', logo: 'asana', signOn: 'SAML 2.0', provisioning: true, category: 'Productivity' },
  { id: 'trello', label: 'Trello', logo: 'trello', signOn: 'SAML 2.0', category: 'Productivity' },
  { id: 'miro', label: 'Miro', logo: 'miro', signOn: 'SAML 2.0', provisioning: true, category: 'Collaboration' },
  { id: 'notion', label: 'Notion', logo: 'notion', signOn: 'SAML 2.0', provisioning: true, category: 'Productivity' },
  { id: 'expensify', label: 'Expensify', logo: 'expensify', signOn: 'SAML 2.0', category: 'Finance' },
  { id: 'sharepoint', label: 'Microsoft SharePoint Online', logo: 'sharepoint', signOn: 'WS-Federation', category: 'Collaboration' },
  { id: 'onedrive', label: 'Microsoft OneDrive', logo: 'onedrive', signOn: 'WS-Federation', category: 'Storage' },
  { id: 'gmail', label: 'Google Workspace', logo: 'gmail', signOn: 'SAML 2.0', provisioning: true, category: 'Productivity' },
  { id: 'oracle', label: 'Oracle Fusion Cloud', logo: 'oracle', signOn: 'SAML 2.0', category: 'ERP' },
]

export function Applications({ go }: { go?: (r: Route) => void }) {
  const { isAgent, toast } = useDesk()
  const apps = useCollection<OktaApp>('okta.apps')
  const asg = useCollection<OktaAssignment>('okta.assignments')
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<'all' | 'ACTIVE' | 'INACTIVE'>('all')
  const [dlg, setDlg] = useState<null | 'create' | 'catalog' | 'assign'>(null)
  const [more, setMore] = useState(false)
  const [rowMenu, setRowMenu] = useState<string | null>(null)
  const [assignApp, setAssignApp] = useState<string>('')
  const [notice, setNotice] = useState('')
  const rows = apps.filter((a) => a.label.toLowerCase().includes(q.toLowerCase()) && (status === 'all' || (a.status ?? 'ACTIVE') === status))
  const nActive = apps.filter((a) => a.status !== 'INACTIVE').length
  const open = (a: OktaApp, tab?: string) => go?.({ area: 'admin', page: 'app', appId: a.id, tab })
  const setAppStatus = (a: OktaApp, st: 'ACTIVE' | 'INACTIVE') => {
    db.update('okta.apps', a.id, { status: st })
    addLog(isAgent, st === 'ACTIVE' ? 'application.lifecycle.activate' : 'application.lifecycle.deactivate', st === 'ACTIVE' ? 'Activate application' : 'Deactivate application', [appTarget(a)])
    setNotice(`${a.label} ${st === 'ACTIVE' ? 'activated' : 'deactivated'}.`)
  }
  const addApp = (c: { id: string; label: string; logo: string; signOn: string; provisioning?: boolean }) => {
    const id = apps.some((a) => a.id === c.id) ? uid(c.id) : c.id
    const rec = { id, label: c.label, logo: c.logo, signOn: c.signOn, provisioning: !!c.provisioning, status: 'ACTIVE', oktaId: oktaId(id, '0oa'), created: new Date().toISOString(), createdBy: isAgent ? 'hworker' : undefined }
    db.insert('okta.apps', rec)
    addLog(isAgent, 'application.lifecycle.create', 'Create application', [{ type: 'AppInstance', displayName: c.label, alternateId: id }])
    return id
  }
  return (
    <div>
      <PageHead
        title="Applications"
        actions={
          <>
            <Btn primary agent="okta-apps-create" label="Create App Integration" onClick={() => setDlg('create')}><Plus size={15} /> Create App Integration</Btn>
            <Btn agent="okta-apps-catalog" label="Browse App Catalog" onClick={() => setDlg('catalog')}><SquaresFour size={15} /> Browse App Catalog</Btn>
            <Btn agent="okta-apps-assign-users" label="Assign Users to App" onClick={() => (setAssignApp(''), setDlg('assign'))}>Assign Users to App</Btn>
            <div className="relative">
              <Btn label="More" onClick={() => setMore(!more)}>More <CaretDown size={13} /></Btn>
              {more && (
                <Menu
                  className="left-0 top-10"
                  onClose={() => setMore(false)}
                  items={[
                    { label: 'Self Service settings', onClick: () => go?.({ area: 'admin', page: 'selfservice' }) },
                    { label: 'Export application list (CSV)', onClick: () => toast({ appId: 'okta', title: 'Export started', body: `okta_applications.csv · ${apps.length} apps` }) },
                    { label: 'API Service Integrations', onClick: () => go?.({ area: 'admin', page: 'api' }) },
                  ]}
                />
              )}
            </div>
          </>
        }
      />
      <div className="px-8 pb-8">
        {notice && (
          <div className="mb-4">
            <Notice text={notice} onClose={() => setNotice('')} />
          </div>
        )}
        <Card pad={false}>
          <div className="flex items-center gap-3 p-4 border-b border-[#EBEBED]">
            <div className="flex items-center gap-2 h-9 w-[360px] rounded-[4px] border border-[#8C8C96] px-3">
              <MagnifyingGlass size={16} className="text-[#6E6E78]" />
              <input data-agent="okta-apps-search" aria-label="Search applications" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="flex-1 outline-none text-[14px]" />
            </div>
            <div className="text-[13px] text-[#6E6E78] flex items-center gap-1">
              STATUS ·{' '}
              <button onClick={() => setStatus(status === 'ACTIVE' ? 'all' : 'ACTIVE')} className={`px-1 rounded ${status === 'ACTIVE' ? 'bg-[#E6EEFC] text-[#1450B8] font-semibold' : 'hover:text-[#1662DD]'}`}>
                ACTIVE {nActive}
              </button>
              ·
              <button onClick={() => setStatus(status === 'INACTIVE' ? 'all' : 'INACTIVE')} className={`px-1 rounded ${status === 'INACTIVE' ? 'bg-[#E6EEFC] text-[#1450B8] font-semibold' : 'hover:text-[#1662DD]'}`}>
                INACTIVE {apps.length - nActive}
              </button>
            </div>
          </div>
          <table className="w-full text-[14px]">
            <thead>
              <tr className="text-left text-[12px] uppercase tracking-wide text-[#6E6E78] border-b border-[#EBEBED]">
                <th className="px-5 h-10 font-semibold">Application</th>
                <th className="font-semibold">Sign-on</th>
                <th className="font-semibold">Provisioning</th>
                <th className="font-semibold">Assigned</th>
                <th className="font-semibold w-16"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id} data-agent={`okta-app-${a.id}`} onClick={() => open(a)} className={`border-b border-[#F1F1F3] hover:bg-[#FAFAFA] cursor-pointer ${a.status === 'INACTIVE' ? 'opacity-60' : ''}`}>
                  <td className="px-5 h-[58px]">
                    <div className="flex items-center gap-3">
                      <span className="w-10 h-10 rounded border border-[#E1E1E6] bg-white flex items-center justify-center"><AppLogo id={a.logo} size={26} /></span>
                      <div>
                        <div className="font-semibold text-[#1662DD]">{a.label}</div>
                        <div className="text-[12px] text-[#6E6E78]">{a.oktaId}{a.status === 'INACTIVE' ? ' · Inactive' : ''}</div>
                      </div>
                    </div>
                  </td>
                  <td>{a.signOn}</td>
                  <td>{a.provisioning ? <span className="text-[#1E8A3A] font-medium">Push · Enabled</span> : <span className="text-[#6E6E78]">Not configured</span>}</td>
                  <td>{asg.filter((x) => x.appId === a.id).length} users</td>
                  <td className="relative" onClick={(e) => e.stopPropagation()}>
                    <button aria-label="Settings" onClick={() => setRowMenu(rowMenu === a.id ? null : a.id)} className="w-8 h-8 rounded border border-[#D7D7DC] flex items-center justify-center text-[#46464F] hover:bg-[#F4F4F4]"><GearSix size={16} /><CaretDown size={10} /></button>
                    {rowMenu === a.id && (
                      <Menu
                        className="right-4 top-12"
                        onClose={() => setRowMenu(null)}
                        items={[
                          { label: 'Assign to Users', onClick: () => (setAssignApp(a.id), setDlg('assign')) },
                          { label: 'Edit settings', onClick: () => open(a, 'general') },
                          { label: 'View assignments', onClick: () => open(a, 'assignments') },
                          a.status === 'INACTIVE' ? { label: 'Activate', onClick: () => setAppStatus(a, 'ACTIVE') } : { label: 'Deactivate', danger: true, onClick: () => setAppStatus(a, 'INACTIVE') },
                        ]}
                      />
                    )}
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-[#6E6E78]">
                    No applications match.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>
      {dlg === 'create' && (
        <CreateAppModal
          onClose={() => setDlg(null)}
          onCreate={(c) => {
            const id = addApp({ id: c.label.toLowerCase().replace(/[^a-z0-9]+/g, '-'), label: c.label, logo: 'okta', signOn: c.signOn })
            setDlg(null)
            setNotice(`${c.label} was created.`)
            go?.({ area: 'admin', page: 'app', appId: id, tab: 'general' })
          }}
        />
      )}
      {dlg === 'catalog' && (
        <CatalogModal
          existing={apps.map((a) => a.label)}
          onAdd={(c) => {
            addApp(c)
            setNotice(`${c.label} was added from the Okta Integration Network.`)
          }}
          onClose={() => setDlg(null)}
        />
      )}
      {dlg === 'assign' && <AssignUsersModal initialApp={assignApp} onClose={() => setDlg(null)} onDone={(m) => (setDlg(null), setNotice(m))} />}
    </div>
  )
}

function CreateAppModal({ onClose, onCreate }: { onClose: () => void; onCreate: (c: { label: string; signOn: string }) => void }) {
  const [method, setMethod] = useState('OIDC')
  const [label, setLabel] = useState('')
  const methods: [string, string, string][] = [
    ['OIDC', 'OIDC - OpenID Connect', 'Token-based OAuth 2.0 authentication for Single Sign-On through API endpoints.'],
    ['SAML 2.0', 'SAML 2.0', 'XML-based open standard for SSO. Use if the app documentation mentions SAML.'],
    ['SWA', 'SWA - Secure Web Authentication', 'Okta-specific SSO method. Use if your app doesn’t support OIDC or SAML.'],
    ['API Services', 'API Services', 'Interact with Okta APIs using scoped OAuth 2.0 access tokens for machine-to-machine authentication.'],
  ]
  return (
    <Modal
      title="Create a new app integration"
      onClose={onClose}
      width={640}
      footer={
        <>
          <Btn label="Cancel" onClick={onClose}>Cancel</Btn>
          <Btn primary agent="okta-create-app-next" label="Create" disabled={!label.trim()} onClick={() => onCreate({ label: label.trim(), signOn: method })}>Create</Btn>
        </>
      }
    >
      <div className="text-[13px] font-semibold mb-2">Sign-in method</div>
      <div className="space-y-2 mb-4">
        {methods.map(([v, t, d]) => (
          <label key={v} className={`flex gap-3 p-3 rounded-md border cursor-pointer ${method === v ? 'border-[#1662DD] bg-[#F3F7FE]' : 'border-[#E1E1E6]'}`}>
            <input type="radio" name="method" checked={method === v} onChange={() => setMethod(v)} className="mt-1 accent-[#1662DD]" />
            <span>
              <span className="block font-semibold">{t}</span>
              <span className="block text-[13px] text-[#6E6E78]">{d}</span>
            </span>
          </label>
        ))}
      </div>
      <label className="block">
        <span className="block text-[13px] font-semibold mb-1">App integration name</span>
        <input aria-label="App integration name" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Northwind Warehouse Portal" className={inputCls} />
      </label>
    </Modal>
  )
}

function CatalogModal({ existing, onAdd, onClose }: { existing: string[]; onAdd: (c: (typeof CATALOG)[number]) => void; onClose: () => void }) {
  const [q, setQ] = useState('')
  const rows = CATALOG.filter((c) => `${c.label} ${c.category}`.toLowerCase().includes(q.toLowerCase()))
  return (
    <Modal title="Browse App Integration Catalog" onClose={onClose} width={680} footer={<Btn primary label="Done" onClick={onClose}>Done</Btn>}>
      <div className="flex items-center gap-2 h-9 rounded-[4px] border border-[#8C8C96] px-3 mb-3">
        <MagnifyingGlass size={16} className="text-[#6E6E78]" />
        <input aria-label="Search the catalog" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the Okta Integration Network" className="flex-1 outline-none text-[14px]" autoFocus />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {rows.map((c) => {
          const added = existing.includes(c.label)
          return (
            <div key={c.id} className="flex items-center gap-3 p-3 rounded-md border border-[#E1E1E6]">
              <img src={logoUrl(c.logo)} className="w-9 h-9" alt="" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{c.label}</div>
                <div className="text-[12px] text-[#6E6E78]">
                  {c.signOn}
                  {c.provisioning ? ' · Provisioning' : ''} · {c.category}
                </div>
              </div>
              {added ? (
                <span className="text-[13px] font-semibold text-[#1B6E31] flex items-center gap-1">
                  <Check size={14} weight="bold" /> Added
                </span>
              ) : (
                <button data-agent={`okta-catalog-add-${c.id}`} onClick={() => onAdd(c)} className="h-8 px-3 rounded-[4px] text-[13px] font-semibold border border-[#1662DD] text-[#1662DD] hover:bg-[#E6EEFC]">
                  Add Integration
                </button>
              )}
            </div>
          )
        })}
      </div>
    </Modal>
  )
}

function AssignUsersModal({ initialApp, onClose, onDone }: { initialApp: string; onClose: () => void; onDone: (m: string) => void }) {
  const { isAgent } = useDesk()
  const apps = useCollection<OktaApp>('okta.apps')
  const users = useCollection<OktaUser>('okta.users')
  const asg = useCollection<OktaAssignment>('okta.assignments')
  const [appSel, setAppSel] = useState<string[]>(initialApp ? [initialApp] : [])
  const [userSel, setUserSel] = useState<string[]>([])
  const [q, setQ] = useState('')
  const people = users.filter((u) => u.status !== 'DEPROVISIONED' && `${fullName(u)} ${u.login}`.toLowerCase().includes(q.toLowerCase())).sort((a, b) => a.firstName.localeCompare(b.firstName))
  const go = () => {
    let n = 0
    for (const appId of appSel)
      for (const userId of userSel) {
        if (asg.some((x) => x.appId === appId && x.userId === userId)) continue
        const u = users.find((x) => x.id === userId)!
        const a = apps.find((x) => x.id === appId)!
        db.insert('okta.assignments', { id: uid('okta-as'), userId, appId, assignedAt: new Date().toISOString(), assignedBy: isAgent ? 'hworker' : 'alex', scope: 'USER', appUsername: u.login })
        addLog(isAgent, 'application.user_membership.add', 'Add user to application membership', [userTarget(u), appTarget(a)])
        n++
      }
    onDone(`${n} new assignment${n === 1 ? '' : 's'} created.`)
  }
  return (
    <Modal
      title="Assign Users to App"
      onClose={onClose}
      width={760}
      footer={
        <>
          <Btn label="Cancel" onClick={onClose}>Cancel</Btn>
          <Btn primary label="Confirm assignments" disabled={!appSel.length || !userSel.length} onClick={go}>Confirm assignments</Btn>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-[13px] font-semibold mb-1">1. Applications ({appSel.length})</div>
          <ul className="border border-[#E1E1E6] rounded-md divide-y divide-[#EBEBED] h-[340px] overflow-auto">
            {apps.map((a) => (
              <li key={a.id}>
                <label className="flex items-center gap-2.5 px-3 py-2 cursor-pointer">
                  <input type="checkbox" checked={appSel.includes(a.id)} onChange={(e) => setAppSel((s) => (e.target.checked ? [...s, a.id] : s.filter((x) => x !== a.id)))} className="accent-[#1662DD]" />
                  <img src={logoUrl(a.logo)} className="w-6 h-6" alt="" /> <span className="truncate">{a.label}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="text-[13px] font-semibold mb-1">2. People ({userSel.length})</div>
          <input aria-label="Search people" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search people" className={inputCls + ' mb-1'} />
          <ul className="border border-[#E1E1E6] rounded-md divide-y divide-[#EBEBED] h-[302px] overflow-auto">
            {people.map((u) => (
              <li key={u.id}>
                <label className="flex items-center gap-2.5 px-3 py-2 cursor-pointer">
                  <input type="checkbox" checked={userSel.includes(u.id)} onChange={(e) => setUserSel((s) => (e.target.checked ? [...s, u.id] : s.filter((x) => x !== u.id)))} className="accent-[#1662DD]" />
                  <span className="min-w-0">
                    <span className="block truncate">{fullName(u)}</span>
                    <span className="block text-[12px] text-[#6E6E78] truncate">{u.login}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Modal>
  )
}

/* ─────────────── Self Service ─────────────── */

export function SelfService({ go }: { go?: (r: Route) => void }) {
  const { isAgent } = useDesk()
  const reqs = useCollection<any>('okta.requests')
  const users = useCollection<OktaUser>('okta.users')
  const apps = useCollection<OktaApp>('okta.apps')
  const [notice, setNotice] = useState('')
  const pending = reqs.filter((r) => r.status === 'PENDING')
  const decide = (r: any, ok: boolean) => {
    const u = users.find((x) => x.id === r.userId)
    const a = apps.find((x) => x.id === r.appId)
    db.update('okta.requests', r.id, { status: ok ? 'APPROVED' : 'DENIED', decidedAt: new Date().toISOString(), decidedBy: isAgent ? 'hworker' : 'alex' })
    if (ok && u && a && !db.get<OktaAssignment>('okta.assignments').some((x) => x.userId === u.id && x.appId === a.id)) {
      db.insert('okta.assignments', { id: uid('okta-as'), userId: u.id, appId: a.id, assignedAt: new Date().toISOString(), assignedBy: isAgent ? 'hworker' : 'alex', scope: 'USER', appUsername: u.login })
      addLog(isAgent, 'application.user_membership.add', 'Add user to application membership', [userTarget(u), appTarget(a)])
    }
    if (u && a) addLog(isAgent, ok ? 'app.access_request.approver.approve' : 'app.access_request.approver.deny', ok ? 'Approve app access request' : 'Deny app access request', [userTarget(u), appTarget(a)])
    setNotice(`${ok ? 'Approved' : 'Denied'} ${u ? fullName(u) : 'request'} → ${a?.label ?? r.appId}.`)
  }
  return (
    <div>
      <PageHead title="Self Service" sub="Allow users to request and add apps from the End-User Dashboard." />
      <div className="px-8 pb-8 space-y-5">
        {notice && <Notice text={notice} onClose={() => setNotice('')} />}
        <div className="grid grid-cols-2 gap-5">
          <Card title="User App Requests"><div className="text-[14px] text-[#46464F]">Allow users to add unmanaged apps to their dashboard: <b>Enabled</b><br />Approval workflow: <b>Manager, then App Owner</b></div></Card>
          <Card title="Request Approvals"><div className="text-[14px] text-[#46464F]">{pending.length} pending access request{pending.length === 1 ? '' : 's'}{pending.length ? ` · ${[...new Set(pending.map((r) => apps.find((a) => a.id === r.appId)?.label ?? r.appId))].join(', ')}` : ''}</div></Card>
        </div>
        <Card title="Access requests" pad={false}>
          <table className="w-full text-[14px]">
            <thead>
              <tr className="text-left text-[12px] text-[#46464F] border-y border-[#E1E1E6] bg-[#FAFAFA]">
                <th className="px-5 py-2.5 font-semibold">Requester</th>
                <th className="px-3 py-2.5 font-semibold">Application</th>
                <th className="px-3 py-2.5 font-semibold">Justification</th>
                <th className="px-3 py-2.5 font-semibold">Requested</th>
                <th className="px-3 py-2.5 font-semibold w-[190px]">Status</th>
              </tr>
            </thead>
            <tbody>
              {[...reqs].sort((a, b) => (a.status === 'PENDING' ? -1 : 1) - (b.status === 'PENDING' ? -1 : 1) || (b.requestedAt ?? '').localeCompare(a.requestedAt ?? '')).map((r) => {
                const u = users.find((x) => x.id === r.userId)
                const a = apps.find((x) => x.id === r.appId)
                return (
                  <tr key={r.id} data-agent={`okta-request-${r.id}`} className="border-b border-[#EBEBED] last:border-0">
                    <td className="px-5 py-2.5">
                      <button onClick={() => u && go?.({ area: 'admin', page: 'user', userId: u.id, tab: 'applications' })} className="text-[#1662DD] font-semibold hover:underline">
                        {u ? fullName(u) : r.userId}
                      </button>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="flex items-center gap-2">
                        {a && <img src={logoUrl(a.logo)} className="w-5 h-5" alt="" />} {a?.label ?? r.appId}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-[13px] text-[#46464F]">{r.reason || '—'}</td>
                    <td className="px-3 py-2.5 text-[13px]">{fmtOkta(r.requestedAt)}</td>
                    <td className="px-3 py-2.5">
                      {r.status === 'PENDING' ? (
                        <div className="flex gap-2">
                          <Btn small primary label={`Approve ${a?.label}`} onClick={() => decide(r, true)}>Approve</Btn>
                          <Btn small label={`Deny ${a?.label}`} onClick={() => decide(r, false)}>Deny</Btn>
                        </div>
                      ) : (
                        <span className={`text-[13px] font-semibold ${r.status === 'APPROVED' ? 'text-[#1E8A3A]' : 'text-[#B42318]'}`}>{r.status === 'APPROVED' ? 'Approved' : 'Denied'}</span>
                      )}
                    </td>
                  </tr>
                )
              })}
              {!reqs.length && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-[#6E6E78]">
                    No access requests.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  )
}
