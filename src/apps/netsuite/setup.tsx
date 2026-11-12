/** Setup, personalization and help pages. */
import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Btn, Banner, Card, F, PageHead, TH, inp, setPrefs, usePrefs, ROLES, type Go } from './ui'

export const DASH_PORTLETS: [string, string][] = [
  ['shortcuts', 'Navigation Shortcuts'], ['kpi', 'Key Performance Indicators'], ['meter', 'KPI Meter'], ['trend', 'Trend Graph'],
  ['recent', 'Recent Records'], ['quickadd', 'Quick Add'], ['tasks', 'Tasks'], ['announce', 'Announcements'],
]

export function Personalize({ go }: { go: Go }) {
  const prefs = usePrefs()
  const hidden = prefs.hidden ?? []
  const [saved, setSaved] = useState(false)
  const toggle = (k: string) => {
    setPrefs((p) => ({ hidden: (p.hidden ?? []).includes(k) ? (p.hidden ?? []).filter((x) => x !== k) : [...(p.hidden ?? []), k] }))
    setSaved(true)
  }
  return (
    <div>
      <PageHead kind="Personalize Dashboard" title="Home › Personalize" go={go}><Btn primary onClick={() => go({ v: 'home' })}>Done</Btn><Btn onClick={() => { setPrefs({ hidden: [], collapsed: [], layout: '3col' }); setSaved(true) }}>Reset to Default</Btn></PageHead>
      {saved && <Banner ok onClose={() => setSaved(false)}>Dashboard preferences saved.</Banner>}
      <div className="m-6 grid grid-cols-2 gap-4">
        <div className="bg-white border border-[#d5d5d5] rounded-[4px] p-4">
          <div className="text-[13px] font-bold text-[#24385b] uppercase mb-3">Portlets</div>
          <label className="flex items-center gap-2 text-[13px] py-1 text-[#888]"><input type="checkbox" checked disabled className="accent-[#3a75c4]" /> Reminders (required)</label>
          {DASH_PORTLETS.map(([k, l]) => (
            <label key={k} className="flex items-center gap-2 text-[13px] py-1"><input type="checkbox" checked={!hidden.includes(k)} onChange={() => toggle(k)} className="accent-[#3a75c4]" /> {l}</label>
          ))}
        </div>
        <div className="bg-white border border-[#d5d5d5] rounded-[4px] p-4">
          <div className="text-[13px] font-bold text-[#24385b] uppercase mb-3">Layout</div>
          {([['3col', 'Three Column'], ['2col', 'Two Column']] as const).map(([k, l]) => (
            <label key={k} className="flex items-center gap-2 text-[13px] py-1"><input type="radio" name="ns-layout" checked={(prefs.layout ?? '3col') === k} onChange={() => { setPrefs({ layout: k }); setSaved(true) }} className="accent-[#3a75c4]" /> {l}</label>
          ))}
          <div className="text-[13px] font-bold text-[#24385b] uppercase mt-5 mb-2">Role</div>
          <select className={`${inp} !w-[240px]`} value={prefs.role ?? 'Controller'} onChange={(e) => { setPrefs({ role: e.target.value }); setSaved(true) }} aria-label="Role">{ROLES.map((r) => <option key={r}>{r}</option>)}</select>
        </div>
      </div>
    </div>
  )
}

const COMPANY_DEFAULT: Record<string, string> = {
  name: 'Northwind Global Inc.', legal: 'Northwind Global, Inc.', taxId: '04-3318842', address: '1 Seaport Blvd, Boston, MA 02210', phone: '(617) 555-0100',
  currency: 'USD', fiscalStart: 'January', timezone: '(GMT-05:00) Eastern Time',
}
export function CompanyInfo({ go }: { go: Go }) {
  const prefs = usePrefs()
  const cur = { ...COMPANY_DEFAULT, ...(prefs.company ?? {}) }
  const [f, setF] = useState<Record<string, string> | null>(null)
  const [saved, setSaved] = useState(false)
  const fields: [string, string][] = [['name', 'Company Name'], ['legal', 'Legal Name'], ['taxId', 'Employer ID (EIN)'], ['phone', 'Phone'], ['address', 'Address'], ['currency', 'Base Currency'], ['fiscalStart', 'First Fiscal Month'], ['timezone', 'Time Zone']]
  return (
    <div>
      <PageHead kind="Company Information" title="Setup › Company › Company Information" go={go}>
        {f ? <><Btn primary onClick={() => { setPrefs({ company: f }); setF(null); setSaved(true) }}>Save</Btn><Btn onClick={() => setF(null)}>Cancel</Btn></> : <Btn primary onClick={() => setF(cur)}>Edit</Btn>}
      </PageHead>
      {saved && <Banner ok onClose={() => setSaved(false)}>Company information saved.</Banner>}
      <div className="m-6 bg-white border border-[#d5d5d5] rounded-[4px] p-5 grid grid-cols-4 gap-x-8 gap-y-3 text-[13px]">
        {fields.map(([k, l]) => (
          <div key={k} className={k === 'address' ? 'col-span-2' : ''}>
            <F label={l}>{f ? <input className={inp} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} aria-label={l} /> : <div className="h-[26px] flex items-center">{cur[k]}</div>}</F>
          </div>
        ))}
      </div>
    </div>
  )
}

const USERS: [string, string, string, string][] = [
  ['Alex Morgan', 'alex.morgan@northwind.com', 'Controller', 'Active'], ['Sofia Martinez', 'sofia.martinez@northwind.com', 'CFO', 'Active'],
  ['Priya Raman', 'priya.raman@northwind.com', 'A/P Clerk', 'Active'], ['Grace Kim', 'grace.kim@northwind.com', 'Administrator', 'Active'],
  ['H-Worker (service)', 'hworker@northwind.com', 'Controller (delegated)', 'Active'], ['Liam Carter', 'liam.carter@northwind.com', 'Sales Rep', 'Inactive'],
]
export function UsersRoles({ go }: { go: Go }) {
  return (
    <div>
      <PageHead kind="Users" title="Setup › Users/Roles › Manage Users" go={go} />
      <Card>
        <table className="w-full text-[13px]">
          <thead><tr className={TH}><th className="px-3 py-1.5">Name</th><th className="px-2">Email</th><th className="px-2">Role</th><th className="px-2">Status</th></tr></thead>
          <tbody>{USERS.map(([n, e, r, s]) => <tr key={e} className="h-[30px] border-b border-[#f0f0f0]"><td className="px-3 text-[#3a75c4]">{n}</td><td className="px-2">{e}</td><td className="px-2">{r}</td><td className="px-2">{s}</td></tr>)}</tbody>
        </table>
      </Card>
    </div>
  )
}

const ARTICLES: [string, string][] = [
  ['Matching bank data to account transactions', 'Open Transactions › Bank › Match Bank Data. Select one or more lines on the Bank Data side and the corresponding Account Transactions; when the difference is 0.00, click Match. Matched lines move to the Matched / Reconciled tab. Click Submit to reconcile them.'],
  ['Booking bank fees and interest', 'Use Transactions › Financial › Make Journal Entries. Debit 6810 Bank Service Charges and credit the bank account for fees; debit the bank account and credit 8100 Interest Income for interest. Saved entries route to your approver.'],
  ['Reconciling an account statement', 'Reconcile Account Statement shows the opening balance, statement ending balance and cleared balance. Items in transit (outstanding checks and deposits) are listed separately; any unexplained difference must be investigated before closing the period.'],
  ['Approving bills and journal entries', 'Bills and journal entries that need your approval appear in the Reminders portlet. Open the list, select records and click Approve or Reject.'],
  ['Saved searches and reports', 'Lists › Search › Saved Searches lists every search shared with your role. Results can be filtered and exported to CSV. Financial statements are under Reports › Financial.'],
]
export function Help({ go }: { go: Go }) {
  const [open, setOpen] = useState<number | null>(0)
  const [q, setQ] = useState('')
  const list = ARTICLES.map((a, i) => [a, i] as const).filter(([[t, b]]) => !q || `${t} ${b}`.toLowerCase().includes(q.toLowerCase()))
  return (
    <div>
      <PageHead kind="Help Center" title="SuiteAnswers · Oracle NetSuite Help" go={go}><input className={`${inp} !w-[300px]`} placeholder="Search help topics" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search help" /></PageHead>
      <Card>
        {list.map(([[t, b], i]) => (
          <div key={t} className="border-b border-[#f0f0f0]">
            <button onClick={() => setOpen(open === i ? null : i)} className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-[13.5px] text-[#3a75c4] hover:bg-[#f5f8fc]">
              {open === i ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />} {t}
            </button>
            {open === i && <div className="px-10 pb-3 text-[13px] text-[#444] leading-relaxed">{b}</div>}
          </div>
        ))}
        {list.length === 0 && <div className="h-14 flex items-center justify-center text-[13px] text-[#888]">No help topics match “{q}”.</div>}
      </Card>
    </div>
  )
}
