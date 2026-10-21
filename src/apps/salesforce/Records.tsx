import { useState } from 'react'
import { db, uid, useCollection, useRecord } from '@/db/db'
import { useDesk } from '@/os/context'
import { Avatar } from '@/components/Avatar'
import { ME, person } from '@/data/people'
import { isoDate } from '@/data/time'
import { Btn, HWChip, Link, inputCls, labelCls, sfDate, sfDateTime, usd, useNav } from './ui'
import { DetailField, DetailSection, Highlights, Modal, Path, RelatedCard, TabsCard, ToastView, useToast, type FieldDef } from './record'
import { ActivityPanel } from './Activity'
import { ChatterFeed } from './Chatter'
import { NewOpportunityModal } from './ListView'

function useEditable(col: string, rec: any, show: (t: string) => void) {
  const { isAgent } = useDesk()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<any>({})
  return {
    editing,
    draft,
    setDraft,
    start: () => {
      setDraft({ ...rec })
      setEditing(true)
    },
    cancel: () => setEditing(false),
    save: () => {
      db.update(col, rec.id, { ...draft, name: draft.firstName ? `${draft.firstName} ${draft.lastName}` : draft.name, updatedBy: isAgent ? 'hworker' : undefined, lastModified: new Date().toISOString() })
      setEditing(false)
      show(`"${draft.name ?? rec.name}" was saved.`)
    },
  }
}

const owner = (id: string) => (
  <span className="inline-flex items-center gap-1.5">
    <Avatar id={id} size={20} /> <Link>{person(id).name}</Link>
  </span>
)

function Footer({ e }: { e: any }) {
  if (!e.editing) return null
  return (
    <div className="sticky bottom-0 -mx-3 -mb-3 mt-2 h-14 bg-[#F3F3F3] border-t border-[#C9C9C9] flex items-center justify-center gap-2">
      <Btn onClick={e.cancel}>Cancel</Btn>
      <Btn variant="brand" agent="sf-rec-save" onClick={e.save}>
        Save
      </Btn>
    </div>
  )
}

export function AccountPage({ id }: { id: string }) {
  const { go } = useNav()
  const a = useRecord<any>('salesforce.accounts', id)
  const contacts = useCollection<any>('salesforce.contacts').filter((c) => c.accountId === id)
  const opps = useCollection<any>('salesforce.opportunities').filter((o) => o.accountId === id)
  const [tab, setTab] = useState('Related')
  const [mode, setMode] = useState<any>(null)
  const [newOpp, setNewOpp] = useState(false)
  const { toast, show, hide } = useToast()
  const e = useEditable('salesforce.accounts', a, show)
  if (!a) return null
  const fields: FieldDef[] = [
    { key: 'ownerId', label: 'Account Owner', type: 'readonly', render: owner },
    { key: 'rating', label: 'Rating', type: 'select', options: ['Hot', 'Warm', 'Cold'] },
    { key: 'name', label: 'Account Name' },
    { key: 'phone', label: 'Phone' },
    { key: 'accountNumber', label: 'Account Number' },
    { key: 'website', label: 'Website', render: (v) => <Link>{v}</Link> },
    { key: 'type', label: 'Type', type: 'select', options: ['Prospect', 'Customer - Direct', 'Customer - Channel', 'Partner'] },
    { key: 'industry', label: 'Industry' },
    { key: 'annualRevenue', label: 'Annual Revenue', render: (v) => usd(v, false) },
    { key: 'employees', label: 'Employees', render: (v) => Number(v).toLocaleString() },
    { key: 'city', label: 'Billing Address', type: 'readonly', render: () => `${a.city}${a.state ? ', ' + a.state : ''}\n${a.country}` },
    { key: 'site', label: 'Account Site' },
    { key: 'description', label: 'Description', type: 'textarea', full: true },
  ]
  return (
    <div className="relative p-3 space-y-3">
      <ToastView toast={toast} hide={hide} />
      <Highlights
        object="Account"
        title={a.name}
        fields={[
          ['Type', a.type],
          ['Phone', a.phone],
          ['Website', <Link>{a.website}</Link>],
          ['Account Owner', owner(a.ownerId)],
          ['Account Site', a.site],
          ['Industry', a.industry],
        ]}
        actions={[{ label: 'New Contact' }, { label: 'New Opportunity', agent: 'sf-acc-new-opp', onClick: () => setNewOpp(true) }, { label: 'Edit', onClick: () => { e.start(); setTab('Details') } }]}
      />
      <div className="flex gap-3 items-start">
        <div className="flex-[2] min-w-0">
          <TabsCard tabs={['Related', 'Details', 'News']} active={tab} setActive={setTab} prefix="sf-acc">
            {tab === 'Related' && (
              <div className="p-3 space-y-3">
                <RelatedCard icon="Contact" title="Contacts" count={contacts.length}>
                  <table className="w-full text-[12.5px]">
                    <thead><tr className="text-left text-[#444]"><th className="font-normal py-1">Name</th><th className="font-normal">Title</th><th className="font-normal">Email</th><th className="font-normal">Phone</th></tr></thead>
                    <tbody>{contacts.map((c) => <tr key={c.id} className="border-t border-[#E5E5E5]"><td className="py-1.5"><Link onClick={() => go({ page: 'record', object: 'Contact', id: c.id })}>{c.name}</Link></td><td>{c.title}</td><td><Link>{c.email}</Link></td><td>{c.phone}</td></tr>)}</tbody>
                  </table>
                </RelatedCard>
                <RelatedCard icon="Opportunity" title="Opportunities" count={opps.length}>
                  <table className="w-full text-[12.5px]">
                    <thead><tr className="text-left text-[#444]"><th className="font-normal py-1">Opportunity Name</th><th className="font-normal">Stage</th><th className="font-normal">Amount</th><th className="font-normal">Close Date</th></tr></thead>
                    <tbody>{opps.map((o) => <tr key={o.id} className="border-t border-[#E5E5E5]"><td className="py-1.5"><Link onClick={() => go({ page: 'record', object: 'Opportunity', id: o.id })}>{o.name}</Link></td><td>{o.stage}</td><td>{usd(o.amount)}</td><td>{sfDate(o.closeDate)}</td></tr>)}</tbody>
                  </table>
                </RelatedCard>
                <RelatedCard icon="Event" title="Cases" count={0} />
              </div>
            )}
            {tab === 'Details' && (
              <div className="p-3">
                <DetailSection title="Account Information">{fields.map((f) => <DetailField key={f.key} f={f} rec={a} editing={e.editing} draft={e.draft} setDraft={e.setDraft} onEdit={e.start} prefix="sf-acc" />)}</DetailSection>
                <Footer e={e} />
              </div>
            )}
            {tab === 'News' && <div className="p-6 text-[13px] text-[#444]">{a.name} named a leader in the 2026 {a.industry} Digital Operations report. — Business Wire · 3d</div>}
          </TabsCard>
        </div>
        <div className="flex-1 min-w-[300px] max-w-[440px]">
          <TabsCard tabs={['Activity', 'Chatter']} active="Activity" setActive={() => {}} prefix="sf-acc-side">
            <ActivityPanel whatId={id} whatName={a.name} whatObject="Account" contacts={contacts} mode={mode} setMode={setMode} onToast={show} />
          </TabsCard>
        </div>
      </div>
      {newOpp && <NewOpportunityModal accountId={id} onClose={() => setNewOpp(false)} />}
    </div>
  )
}

export function ContactPage({ id }: { id: string }) {
  const { go } = useNav()
  const c = useRecord<any>('salesforce.contacts', id)
  const accounts = useCollection<any>('salesforce.accounts')
  const opps = useCollection<any>('salesforce.opportunities')
  const [tab, setTab] = useState('Details')
  const [mode, setMode] = useState<any>(null)
  const { toast, show, hide } = useToast()
  const e = useEditable('salesforce.contacts', c, show)
  if (!c) return null
  const acct = accounts.find((x) => x.id === c.accountId)
  const related = opps.filter((o) => o.contactRoles?.some((r: any) => r.contactId === id))
  const fields: FieldDef[] = [
    { key: 'ownerId', label: 'Contact Owner', type: 'readonly', render: owner },
    { key: 'phone', label: 'Phone' },
    { key: 'firstName', label: 'First Name' },
    { key: 'mobile', label: 'Mobile' },
    { key: 'lastName', label: 'Last Name' },
    { key: 'email', label: 'Email', render: (v) => <Link>{v}</Link> },
    { key: 'accountId', label: 'Account Name', type: 'readonly', render: () => <Link onClick={() => go({ page: 'record', object: 'Account', id: acct.id })}>{acct?.name}</Link> },
    { key: 'title', label: 'Title' },
    { key: 'leadSource', label: 'Lead Source', type: 'select', options: ['Web', 'Webinar', 'Trade Show', 'Partner Referral', 'Outbound'] },
    { key: 'city', label: 'Mailing Address' },
  ]
  return (
    <div className="relative p-3 space-y-3">
      <ToastView toast={toast} hide={hide} />
      <Highlights
        object="Contact"
        title={c.name}
        fields={[
          ['Title', c.title],
          ['Account Name', <Link onClick={() => go({ page: 'record', object: 'Account', id: acct.id })}>{acct?.name}</Link>],
          ['Phone (2)', c.phone],
          ['Email', <Link>{c.email}</Link>],
          ['Contact Owner', owner(c.ownerId)],
        ]}
        actions={[{ label: 'New Case' }, { label: 'New Note' }, { label: 'Edit', onClick: () => { e.start(); setTab('Details') } }]}
      />
      <div className="flex gap-3 items-start">
        <div className="flex-[2] min-w-0">
          <TabsCard tabs={['Related', 'Details']} active={tab} setActive={setTab} prefix="sf-con">
            {tab === 'Details' && (
              <div className="p-3">
                <DetailSection title="Contact Information">{fields.map((f) => <DetailField key={f.key} f={f} rec={c} editing={e.editing} draft={e.draft} setDraft={e.setDraft} onEdit={e.start} prefix="sf-con" />)}</DetailSection>
                <Footer e={e} />
              </div>
            )}
            {tab === 'Related' && (
              <div className="p-3 space-y-3">
                <RelatedCard icon="Opportunity" title="Opportunities" count={related.length}>
                  {related.map((o) => <div key={o.id} className="py-1.5 text-[12.5px]"><Link onClick={() => go({ page: 'record', object: 'Opportunity', id: o.id })}>{o.name}</Link><div className="text-[#444]">{o.stage} • {usd(o.amount)}</div></div>)}
                </RelatedCard>
                <RelatedCard icon="Campaign" title="Campaign History" count={1}><div className="py-1.5 text-[12.5px]"><Link>AI-Powered Operations Summit 2026</Link><div className="text-[#444]">Responded</div></div></RelatedCard>
              </div>
            )}
          </TabsCard>
        </div>
        <div className="flex-1 min-w-[300px] max-w-[440px]">
          <TabsCard tabs={['Activity']} active="Activity" setActive={() => {}} prefix="sf-con-side">
            <ActivityPanel whatId={related[0]?.id ?? id} whatName={related[0]?.name ?? c.name} whatObject="Opportunity" contacts={[c]} mode={mode} setMode={setMode} onToast={show} />
          </TabsCard>
        </div>
      </div>
    </div>
  )
}

const LEAD_STAGES = ['Open - Not Contacted', 'Working - Contacted']

export function LeadPage({ id }: { id: string }) {
  const { isAgent } = useDesk()
  const { go } = useNav()
  const l = useRecord<any>('salesforce.leads', id)
  const [tab, setTab] = useState('Details')
  const [mode, setMode] = useState<any>(null)
  const [convert, setConvert] = useState(false)
  const [oppName, setOppName] = useState('')
  const { toast, show, hide } = useToast()
  const e = useEditable('salesforce.leads', l, show)
  if (!l) return null
  const converted = l.status === 'Closed - Converted'
  const doConvert = () => {
    const accId = uid('001Hs')
    const conId = uid('003Hs')
    const oppId = uid('006Hs')
    const hw = isAgent ? 'hworker' : undefined
    db.insert('salesforce.accounts', { id: accId, name: l.company, type: 'Prospect', industry: l.industry, city: l.city, state: l.state, country: 'United States', employees: l.employees, annualRevenue: 0, ownerId: ME.id, website: '', phone: l.phone, rating: l.rating, accountNumber: '', site: '', description: '', createdDate: new Date().toISOString(), createdBy: hw })
    db.insert('salesforce.contacts', { id: conId, accountId: accId, firstName: l.firstName, lastName: l.lastName, name: l.name, title: l.title, email: l.email, phone: l.phone, mobile: '', city: l.city, ownerId: ME.id, leadSource: l.leadSource, createdDate: new Date().toISOString(), createdBy: hw })
    db.insert('salesforce.opportunities', { id: oppId, name: oppName || `${l.company}-`, accountId: accId, amount: 0, stage: 'Qualification', closeDate: isoDate(new Date(Date.now() + 60 * 86400000)), probability: 10, type: 'New Business', leadSource: l.leadSource, ownerId: ME.id, forecastCategory: 'Pipeline', seats: null, pricePerSeat: null, contractTerm: 12, contractStart: '', primaryContactId: conId, competitor: 'None', nextStep: '', description: l.description, createdDate: new Date().toISOString(), lastModified: new Date().toISOString(), products: [], contactRoles: [{ contactId: conId, role: 'Business User', primary: true }], quotes: [], files: [], stageHistory: [{ stage: 'Qualification', date: new Date().toISOString(), by: 'alex', hw: isAgent }], createdBy: hw })
    db.update('salesforce.leads', id, { status: 'Closed - Converted', convertedOpportunityId: oppId, convertedAccountId: accId, convertedContactId: conId, updatedBy: hw })
    setConvert(false)
    go({ page: 'record', object: 'Opportunity', id: oppId })
  }
  const fields: FieldDef[] = [
    { key: 'ownerId', label: 'Lead Owner', type: 'readonly', render: owner },
    { key: 'phone', label: 'Phone' },
    { key: 'name', label: 'Name', type: 'readonly' },
    { key: 'email', label: 'Email', render: (v) => <Link>{v}</Link> },
    { key: 'company', label: 'Company' },
    { key: 'rating', label: 'Rating', type: 'select', options: ['Hot', 'Warm', 'Cold'] },
    { key: 'title', label: 'Title' },
    { key: 'status', label: 'Lead Status', type: 'select', options: [...LEAD_STAGES, 'Closed - Converted', 'Closed - Not Converted'] },
    { key: 'leadSource', label: 'Lead Source' },
    { key: 'industry', label: 'Industry' },
    { key: 'employees', label: 'No. of Employees' },
    { key: 'createdDate', label: 'Created', type: 'readonly', render: (v) => sfDateTime(v) },
    { key: 'description', label: 'Description', type: 'textarea', full: true },
  ]
  return (
    <div className="relative p-3 space-y-3 min-h-full">
      <ToastView toast={toast} hide={hide} />
      <Highlights
        object="Lead"
        title={`${l.firstName} ${l.lastName}`}
        badge={l.updatedBy === 'hworker' ? <HWChip text="Converted by H-Worker" /> : null}
        fields={[['Title', l.title], ['Company', l.company], ['Phone (2)', l.phone], ['Email', <Link>{l.email}</Link>]]}
        actions={[{ label: 'Convert', agent: 'sf-lead-convert', onClick: () => { setOppName(`${l.company}-`); setConvert(true) } }, { label: 'Change Owner' }, { label: 'Edit', onClick: () => { e.start(); setTab('Details') } }]}
      />
      <Path
        stages={LEAD_STAGES}
        current={converted ? 'Converted' : l.status.startsWith('Closed') ? 'Unqualified' : l.status}
        closedWon={converted}
        closedLost={l.status === 'Closed - Not Converted'}
        closedLabel="Converted"
        onAction={(sel, kind) => {
          if (kind === 'closed') {
            setOppName(`${l.company}-`)
            setConvert(true)
          } else {
            db.update('salesforce.leads', id, { status: kind === 'complete' ? LEAD_STAGES[Math.min(LEAD_STAGES.indexOf(l.status) + 1, 1)] : sel })
            show('Status changed successfully.')
          }
        }}
      />
      <div className="flex gap-3 items-start">
        <div className="flex-[2] min-w-0">
          <TabsCard tabs={['Activity', 'Details', 'Chatter']} active={tab} setActive={setTab} prefix="sf-lead">
            {tab === 'Details' && (
              <div className="p-3">
                <DetailSection title="Lead Information">{fields.map((f) => <DetailField key={f.key} f={f} rec={l} editing={e.editing} draft={e.draft} setDraft={e.setDraft} onEdit={e.start} prefix="sf-lead" />)}</DetailSection>
                <Footer e={e} />
              </div>
            )}
            {tab === 'Activity' && <ActivityPanel whatId={id} whatName={l.name} whatObject="Lead" contacts={[{ id, name: l.name }]} mode={mode} setMode={setMode} onToast={show} />}
            {tab === 'Chatter' && <ChatterFeed parentId={id} parentName={l.name} />}
          </TabsCard>
        </div>
        <div className="flex-1 min-w-[300px] max-w-[420px] space-y-3">
          <RelatedCard icon="Campaign" title="Campaign History" count={l.leadSource === 'Webinar' ? 1 : 0}>
            <div className="py-1.5 text-[12.5px]"><Link>AI-Powered Operations Summit 2026</Link><div className="text-[#444]">Status: Responded</div></div>
          </RelatedCard>
          <RelatedCard icon="File" title="Files" count={0} />
        </div>
      </div>
      {convert && (
        <Modal title="Convert Lead" agent="sf-convert-modal" width={820} onClose={() => setConvert(false)} footer={<><Btn onClick={() => setConvert(false)}>Cancel</Btn><Btn variant="brand" agent="sf-convert-confirm" onClick={doConvert}>Convert</Btn></>}>
          <div className="p-5 space-y-3 text-[13px]">
            {[['Account', `Create New: ${l.company}`], ['Contact', `Create New: ${l.name}`]].map(([k, v]) => (
              <div key={k} className="grid grid-cols-[120px_1fr] items-center gap-4 border-b border-[#E5E5E5] pb-3">
                <div className="font-bold">{k}</div>
                <div className="flex items-center gap-2"><input type="radio" readOnly checked /> {v}</div>
              </div>
            ))}
            <div className="grid grid-cols-[120px_1fr] items-center gap-4">
              <div className="font-bold">Opportunity</div>
              <div>
                <label className={labelCls}>Opportunity Name</label>
                <input data-agent="sf-convert-opp-name" aria-label="Opportunity Name" value={oppName} onChange={(e2) => setOppName(e2.target.value)} className={inputCls} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div><label className={labelCls}>Record Owner</label><div className={`${inputCls} flex items-center`}>{ME.name}</div></div>
              <div><label className={labelCls}>Converted Status</label><div className={`${inputCls} flex items-center`}>Closed - Converted</div></div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
