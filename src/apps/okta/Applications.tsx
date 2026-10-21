import { useState } from 'react'
import { MagnifyingGlass, CaretDown, GearSix, SquaresFour, Plus } from '@phosphor-icons/react'
import { useCollection } from '@/db/db'
import { Card, PageHead } from './Admin'
import { AppLogo, Btn, type OktaApp, type OktaAssignment } from './shared'

export function Applications() {
  const apps = useCollection<OktaApp>('okta.apps')
  const asg = useCollection<OktaAssignment>('okta.assignments')
  const [q, setQ] = useState('')
  const rows = apps.filter((a) => a.label.toLowerCase().includes(q.toLowerCase()))
  return (
    <div>
      <PageHead
        title="Applications"
        actions={
          <>
            <Btn primary><Plus size={15} /> Create App Integration</Btn>
            <Btn><SquaresFour size={15} /> Browse App Catalog</Btn>
            <Btn>Assign Users to App</Btn>
            <Btn>More <CaretDown size={13} /></Btn>
          </>
        }
      />
      <div className="px-8 pb-8">
        <Card pad={false}>
          <div className="flex items-center gap-3 p-4 border-b border-[#EBEBED]">
            <div className="flex items-center gap-2 h-9 w-[360px] rounded-[4px] border border-[#8C8C96] px-3">
              <MagnifyingGlass size={16} className="text-[#6E6E78]" />
              <input data-agent="okta-apps-search" aria-label="Search applications" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="flex-1 outline-none text-[14px]" />
            </div>
            <div className="text-[13px] text-[#6E6E78]">STATUS · ACTIVE {apps.length} · INACTIVE 0</div>
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
                <tr key={a.id} data-agent={`okta-app-${a.id}`} className="border-b border-[#F1F1F3] hover:bg-[#FAFAFA]">
                  <td className="px-5 h-[58px]">
                    <div className="flex items-center gap-3">
                      <span className="w-10 h-10 rounded border border-[#E1E1E6] bg-white flex items-center justify-center"><AppLogo id={a.logo} size={26} /></span>
                      <div>
                        <div className="font-semibold text-[#1662DD]">{a.label}</div>
                        <div className="text-[12px] text-[#6E6E78]">{a.oktaId}</div>
                      </div>
                    </div>
                  </td>
                  <td>{a.signOn}</td>
                  <td>{a.provisioning ? <span className="text-[#1E8A3A] font-medium">Push · Enabled</span> : <span className="text-[#6E6E78]">Not configured</span>}</td>
                  <td>{asg.filter((x) => x.appId === a.id).length} users</td>
                  <td><button aria-label="Settings" className="w-8 h-8 rounded border border-[#D7D7DC] flex items-center justify-center text-[#46464F]"><GearSix size={16} /><CaretDown size={10} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  )
}

export function SelfService() {
  return (
    <div>
      <PageHead title="Self Service" sub="Allow users to request and add apps from the End-User Dashboard." />
      <div className="px-8 pb-8 grid grid-cols-2 gap-5">
        <Card title="User App Requests"><div className="text-[14px] text-[#46464F]">Allow users to add unmanaged apps to their dashboard: <b>Enabled</b><br />Approval workflow: <b>Manager, then App Owner</b></div></Card>
        <Card title="Request Approvals"><div className="text-[14px] text-[#46464F]">3 pending access requests · Salesforce.com (2), Tableau Cloud (1)</div></Card>
      </div>
    </div>
  )
}
