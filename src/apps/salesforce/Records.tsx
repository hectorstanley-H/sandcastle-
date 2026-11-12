import { useState } from 'react'
import { db, uid, useCollection, useRecord } from '@/db/db'
import { useDesk } from '@/os/context'
import { Avatar } from '@/components/Avatar'
import { ME, person } from '@/data/people'
import { isoDate } from '@/data/time'
import { Btn, HWChip, Link, inputCls, labelCls, sfDate, sfDateTime, usd, useNav } from './ui'
import { DetailField, DetailSection, Highlights, Modal, Path, PersonLink, RelatedCard, TabsCard, ToastView, useToast, type FieldDef } from './record'
import { ActivityPanel } from './Activity'
import { ChatterFeed } from './Chatter'
import { NewOpportunityModal } from './ListView'
import { useActions } from './forms'
import { FilePreview, NotesList, UploadModal } from './related'

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
      show(`"${draft.name ?? rec.name ?? draft.caseNumber ?? ''}" was saved.`)
    },
  }
}

const owner = (id: string) => (
  <span className="inline-flex items-center gap-1.5">
    <Avatar id={id} size={20} /> <PersonLink id={id} />
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
  const cases = useCollection<any>('salesforce.cases').filter((c) => c.accountId === id)
  const notes = useCollection<any>('salesforce.notes').filter((n) => n.parentId === id)
  const [tab, setTab] = useState('Related')
  const [side, setSide] = useState('Activity')
  const [mode, setMode] = useState<any>(null)
  const [newOpp, setNewOpp] = useState(false)
  const { toast, show, hide } = useToast()
  const { run } = useActions()
  const { open: openApp } = useDesk()
  const e = useEditable('salesforce.accounts', a, show)
  if (!a) return null
  const mail = (to: string) => to && openApp('outlook', { compose: { to: [to] } })
  const fields: FieldDef[] = [
    { key: 'ownerId', label: 'Account Owner', type: 'readonly', render: owner },
    { key: 'rating', label: 'Rating', type: 'select', options: ['Hot', 'Warm', 'Cold'] },
    { key: 'name', label: 'Account Name' },
    { key: 'phone', label: 'Phone' },
    { key: 'accountNumber', label: 'Account Number' },
    { key: 'website', label: 'Website', render: (v) => <Link onClick={() => v && openApp('edge', { url: `https://${String(v).replace(/^https?:\/\//, '')}` })}>{v}</Link> },
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
        recordId={id}
        more={[
          { label: 'New Case', onClick: () => run({ kind: 'new', object: 'Case', defaults: { accountId: id } }) },
          { label: 'New Note', onClick: () => run({ kind: 'new', object: 'Note', defaults: { parentId: id }, stay: true }) },
          { label: 'Log a Call', onClick: () => { setSide('Activity'); setMode('call') } },
          { divider: true, label: '' },
          { label: 'Change Owner', onClick: () => run({ kind: 'owner', object: 'Account', ids: [id] }) },
          { label: 'Clone', onClick: () => run({ kind: 'clone', object: 'Account', id }) },
          { label: 'Delete', onClick: () => run({ kind: 'delete', object: 'Account', id, name: a.name, after: () => go({ page: 'list', object: 'Account' }) }) },
        ]}
        fields={[
          ['Type', a.type],
          ['Phone', a.phone],
          ['Website', <Link onClick={() => a.website && openApp('edge', { url: `https://${String(a.website).replace(/^https?:\/\//, '')}` })}>{a.website}</Link>],
          ['Account Owner', owner(a.ownerId)],
          ['Account Site', a.site],
          ['Industry', a.industry],
        ]}
        actions={[{ label: 'New Contact', onClick: () => run({ kind: 'new', object: 'Contact', defaults: { accountId: id } }) }, { label: 'New Opportunity', agent: 'sf-acc-new-opp', onClick: () => setNewOpp(true) }, { label: 'Edit', onClick: () => { e.start(); setTab('Details') } }]}
      />
      <div className="flex gap-3 items-start">
        <div className="flex-[2] min-w-0">
          <TabsCard tabs={['Related', 'Details', 'News']} active={tab} setActive={setTab} prefix="sf-acc">
            {tab === 'Related' && (
              <div className="p-3 space-y-3">
                <RelatedCard icon="Contact" title="Contacts" count={contacts.length} onNew={() => run({ kind: 'new', object: 'Contact', defaults: { accountId: id } })}>
                  <table className="w-full text-[12.5px]">
                    <thead><tr className="text-left text-[#444]"><th className="font-normal py-1">Name</th><th className="font-normal">Title</th><th className="font-normal">Email</th><th className="font-normal">Phone</th></tr></thead>
                    <tbody>{contacts.map((c) => <tr key={c.id} className="border-t border-[#E5E5E5]"><td className="py-1.5"><Link onClick={() => go({ page: 'record', object: 'Contact', id: c.id })}>{c.name}</Link></td><td>{c.title}</td><td><Link onClick={() => mail(c.email)}>{c.email}</Link></td><td>{c.phone}</td></tr>)}</tbody>
                  </table>
                </RelatedCard>
                <RelatedCard icon="Opportunity" title="Opportunities" count={opps.length} onNew={() => setNewOpp(true)}>
                  <table className="w-full text-[12.5px]">
                    <thead><tr className="text-left text-[#444]"><th className="font-normal py-1">Opportunity Name</th><th className="font-normal">Stage</th><th className="font-normal">Amount</th><th className="font-normal">Close Date</th></tr></thead>
                    <tbody>{opps.map((o) => <tr key={o.id} className="border-t border-[#E5E5E5]"><td className="py-1.5"><Link onClick={() => go({ page: 'record', object: 'Opportunity', id: o.id })}>{o.name}</Link></td><td>{o.stage}</td><td>{usd(o.amount)}</td><td>{sfDate(o.closeDate)}</td></tr>)}</tbody>
                  </table>
                </RelatedCard>
                <RelatedCard icon="Case" title="Cases" count={cases.length} onNew={() => run({ kind: 'new', object: 'Case', defaults: { accountId: id } })}>
                  <table className="w-full text-[12.5px]">
                    <thead><tr className="text-left text-[#444]"><th className="font-normal py-1">Case Number</th><th className="font-normal">Subject</th><th className="font-normal">Status</th><th className="font-normal">Priority</th></tr></thead>
                    <tbody>{cases.map((c) => <tr key={c.id} className="border-t border-[#E5E5E5]"><td className="py-1.5"><Link onClick={() => go({ page: 'record', object: 'Case', id: c.id })}>{c.caseNumber}</Link></td><td>{c.subject}</td><td>{c.status}</td><td>{c.priority}</td></tr>)}</tbody>
                  </table>
                </RelatedCard>
                <RelatedCard icon="Note" title="Notes" count={notes.length} onNew={() => run({ kind: 'new', object: 'Note', defaults: { parentId: id }, stay: true })} newLabel="New Note">
                  <NotesList parentId={id} />
                </RelatedCard>
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
          <TabsCard tabs={['Activity', 'Chatter']} active={side} setActive={setSide} prefix="sf-acc-side">
            {side === 'Activity' ? <ActivityPanel whatId={id} whatName={a.name} whatObject="Account" contacts={contacts} mode={mode} setMode={setMode} onToast={show} /> : <ChatterFeed parentId={id} parentName={a.name} onToast={show} />}
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
  const { run } = useActions()
  const { open: openApp } = useDesk()
  const cases = useCollection<any>('salesforce.cases').filter((x) => x.contactId === id)
  const notes = useCollection<any>('salesforce.notes').filter((n) => n.parentId === id)
  const e = useEditable('salesforce.contacts', c, show)
  if (!c) return null
  const mail = () => c.email && openApp('outlook', { compose: { to: [c.email] } })
  const acct = accounts.find((x) => x.id === c.accountId)
  const related = opps.filter((o) => o.contactRoles?.some((r: any) => r.contactId === id))
  const fields: FieldDef[] = [
    { key: 'ownerId', label: 'Contact Owner', type: 'readonly', render: owner },
    { key: 'phone', label: 'Phone' },
    { key: 'firstName', label: 'First Name' },
    { key: 'mobile', label: 'Mobile' },
    { key: 'lastName', label: 'Last Name' },
    { key: 'email', label: 'Email', render: (v) => <Link onClick={mail}>{v}</Link> },
    { key: 'accountId', label: 'Account Name', type: 'readonly', render: () => <Link onClick={() => acct && go({ page: 'record', object: 'Account', id: acct.id })}>{acct?.name}</Link> },
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
        recordId={id}
        more={[
          { label: 'Log a Call', onClick: () => setMode('call') },
          { label: 'New Task', onClick: () => setMode('task') },
          { label: 'New Event', onClick: () => setMode('event') },
          { label: 'Send Email', onClick: mail },
          { divider: true, label: '' },
          { label: 'Change Owner', onClick: () => run({ kind: 'owner', object: 'Contact', ids: [id] }) },
          { label: 'Clone', onClick: () => run({ kind: 'clone', object: 'Contact', id }) },
          { label: 'Delete', onClick: () => run({ kind: 'delete', object: 'Contact', id, name: c.name, after: () => go({ page: 'list', object: 'Contact' }) }) },
        ]}
        fields={[
          ['Title', c.title],
          ['Account Name', <Link onClick={() => acct && go({ page: 'record', object: 'Account', id: acct.id })}>{acct?.name}</Link>],
          ['Phone (2)', c.phone],
          ['Email', <Link onClick={mail}>{c.email}</Link>],
          ['Contact Owner', owner(c.ownerId)],
        ]}
        actions={[{ label: 'New Case', onClick: () => run({ kind: 'new', object: 'Case', defaults: { accountId: c.accountId, contactId: id } }) }, { label: 'New Note', onClick: () => { setTab('Related'); run({ kind: 'new', object: 'Note', defaults: { parentId: id }, stay: true }) } }, { label: 'Edit', onClick: () => { e.start(); setTab('Details') } }]}
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
                <RelatedCard icon="Opportunity" title="Opportunities" count={related.length} onNew={() => run({ kind: 'new', object: 'Opportunity', defaults: { accountId: c.accountId } })}>
                  {related.map((o) => <div key={o.id} className="py-1.5 text-[12.5px]"><Link onClick={() => go({ page: 'record', object: 'Opportunity', id: o.id })}>{o.name}</Link><div className="text-[#444]">{o.stage} • {usd(o.amount)}</div></div>)}
                </RelatedCard>
                <RelatedCard icon="Case" title="Cases" count={cases.length} onNew={() => run({ kind: 'new', object: 'Case', defaults: { accountId: c.accountId, contactId: id } })}>
                  {cases.map((x) => <div key={x.id} className="py-1.5 text-[12.5px]"><Link onClick={() => go({ page: 'record', object: 'Case', id: x.id })}>{x.caseNumber} — {x.subject}</Link><div className="text-[#444]">{x.status} • {x.priority}</div></div>)}
                </RelatedCard>
                <RelatedCard icon="Note" title="Notes" count={notes.length} onNew={() => run({ kind: 'new', object: 'Note', defaults: { parentId: id }, stay: true })} newLabel="New Note">
                  <NotesList parentId={id} />
                </RelatedCard>
                <RelatedCard icon="Campaign" title="Campaign History" count={1 + (c.campaigns?.filter((k: any) => !k.name.startsWith('AI-Powered')).length ?? 0)}>
                  <div className="py-1.5 text-[12.5px]"><Link onClick={() => go({ page: 'list', object: 'Campaign' })}>AI-Powered Operations Summit 2026</Link><div className="text-[#444]">Responded</div></div>
                  {(c.campaigns ?? []).filter((k: any) => !k.name.startsWith('AI-Powered')).map((k: any) => <div key={k.name} className="py-1.5 text-[12.5px]"><Link onClick={() => go({ page: 'list', object: 'Campaign' })}>{k.name}</Link><div className="text-[#444]">{k.status}</div></div>)}
                </RelatedCard>
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
  const [noOpp, setNoOpp] = useState(false)
  const [acctMode, setAcctMode] = useState<'new' | 'existing'>('new')
  const [existingAcct, setExistingAcct] = useState('')
  const [rel, setRel] = useState<null | 'upload' | { f: any }>(null)
  const accounts = useCollection<any>('salesforce.accounts')
  const { toast, show, hide } = useToast()
  const { run } = useActions()
  const { open: openApp } = useDesk()
  const e = useEditable('salesforce.leads', l, show)
  if (!l) return null
  const mail = () => l.email && openApp('outlook', { compose: { to: [l.email] } })
  const matchAcct = accounts.find((x) => x.name.toLowerCase() === String(l.company).toLowerCase())
  const converted = l.status === 'Closed - Converted'
  const doConvert = () => {
    const useExisting = acctMode === 'existing' && !!existingAcct
    const accId = useExisting ? existingAcct : uid('001Hs')
    const conId = uid('003Hs')
    const oppId = uid('006Hs')
    const hw = isAgent ? 'hworker' : undefined
    if (!useExisting) db.insert('salesforce.accounts', { id: accId, name: l.company, type: 'Prospect', industry: l.industry, city: l.city, state: l.state, country: 'United States', employees: l.employees, annualRevenue: 0, ownerId: ME.id, website: '', phone: l.phone, rating: l.rating, accountNumber: '', site: '', description: '', createdDate: new Date().toISOString(), createdBy: hw })
    db.insert('salesforce.contacts', { id: conId, accountId: accId, firstName: l.firstName, lastName: l.lastName, name: l.name, title: l.title, email: l.email, phone: l.phone, mobile: '', city: l.city, ownerId: ME.id, leadSource: l.leadSource, createdDate: new Date().toISOString(), createdBy: hw })
    if (noOpp) {
      db.update('salesforce.leads', id, { status: 'Closed - Converted', convertedAccountId: accId, convertedContactId: conId, updatedBy: hw })
      setConvert(false)
      go({ page: 'record', object: 'Contact', id: conId })
      return
    }
    db.insert('salesforce.opportunities', { id: oppId, name: oppName || `${l.company}-`, accountId: accId, amount: 0, stage: 'Qualification', closeDate: isoDate(new Date(Date.now() + 60 * 86400000)), probability: 10, type: 'New Business', leadSource: l.leadSource, ownerId: ME.id, forecastCategory: 'Pipeline', seats: null, pricePerSeat: null, contractTerm: 12, contractStart: '', primaryContactId: conId, competitor: 'None', nextStep: '', description: l.description, createdDate: new Date().toISOString(), lastModified: new Date().toISOString(), products: [], contactRoles: [{ contactId: conId, role: 'Business User', primary: true }], quotes: [], files: [], stageHistory: [{ stage: 'Qualification', date: new Date().toISOString(), by: 'alex', hw: isAgent }], createdBy: hw })
    db.update('salesforce.leads', id, { status: 'Closed - Converted', convertedOpportunityId: oppId, convertedAccountId: accId, convertedContactId: conId, updatedBy: hw })
    setConvert(false)
    go({ page: 'record', object: 'Opportunity', id: oppId })
  }
  const fields: FieldDef[] = [
    { key: 'ownerId', label: 'Lead Owner', type: 'readonly', render: owner },
    { key: 'phone', label: 'Phone' },
    { key: 'name', label: 'Name', type: 'readonly' },
    { key: 'email', label: 'Email', render: (v) => <Link onClick={mail}>{v}</Link> },
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
        recordId={id}
        fields={[['Title', l.title], ['Company', l.company], ['Phone (2)', l.phone], ['Email', <Link onClick={mail}>{l.email}</Link>]]}
        actions={[{ label: 'Convert', agent: 'sf-lead-convert', onClick: () => { if (converted) { show('This lead has already been converted.'); return } setOppName(`${l.company}-`); setConvert(true) } }, { label: 'Change Owner', onClick: () => run({ kind: 'owner', object: 'Lead', ids: [id] }) }, { label: 'Edit', onClick: () => { e.start(); setTab('Details') } }]}
        more={[
          { label: 'Log a Call', onClick: () => { setTab('Activity'); setMode('call') } },
          { label: 'New Task', onClick: () => { setTab('Activity'); setMode('task') } },
          { label: 'Send Email', onClick: mail },
          { label: 'Add to Campaign', onClick: () => { db.update('salesforce.leads', id, (r) => ({ campaigns: [...(r.campaigns ?? []).filter((x: any) => x.name !== 'Q4 Manufacturing ABM'), { name: 'Q4 Manufacturing ABM', status: 'Sent', date: new Date().toISOString() }] })); show('Lead was added to "Q4 Manufacturing ABM".') } },
          { divider: true, label: '' },
          { label: 'Clone', onClick: () => run({ kind: 'clone', object: 'Lead', id }) },
          { label: 'Delete', onClick: () => run({ kind: 'delete', object: 'Lead', id, name: l.name, after: () => go({ page: 'list', object: 'Lead' }) }) },
        ]}
      />
      <Path
        stages={LEAD_STAGES}
        current={converted ? 'Converted' : l.status.startsWith('Closed') ? 'Unqualified' : l.status}
        closedWon={converted}
        closedLost={l.status === 'Closed - Not Converted'}
        closedLabel="Converted"
        onAction={(sel, kind) => {
          if (kind === 'closed') {
            if (converted) {
              show('This lead has already been converted.')
              return
            }
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
            {tab === 'Chatter' && <ChatterFeed parentId={id} parentName={l.name} onToast={show} />}
          </TabsCard>
        </div>
        <div className="flex-1 min-w-[300px] max-w-[420px] space-y-3">
          <RelatedCard icon="Campaign" title="Campaign History" count={(l.leadSource === 'Webinar' ? 1 : 0) + (l.campaigns?.length ?? 0)}>
            {l.leadSource === 'Webinar' && <div className="py-1.5 text-[12.5px]"><Link onClick={() => go({ page: 'list', object: 'Campaign' })}>AI-Powered Operations Summit 2026</Link><div className="text-[#444]">Status: Responded</div></div>}
            {(l.campaigns ?? []).map((k: any) => <div key={k.name} className="py-1.5 text-[12.5px]"><Link onClick={() => go({ page: 'list', object: 'Campaign' })}>{k.name}</Link><div className="text-[#444]">Status: {k.status}</div></div>)}
          </RelatedCard>
          <RelatedCard icon="File" title="Files" count={l.files?.length ?? 0} onNew={() => setRel('upload')} newLabel="Upload Files">
            {(l.files ?? []).map((f: any, i: number) => <div key={f.name + i} className="py-1.5 text-[12.5px]"><Link onClick={() => setRel({ f })}>{f.name}</Link><div className="text-[#444]">{sfDate(f.date)} • {f.size}</div></div>)}
          </RelatedCard>
          {rel === 'upload' && <UploadModal col="salesforce.leads" id={id} onClose={() => setRel(null)} />}
          {rel && typeof rel === 'object' && <FilePreview f={rel.f} onClose={() => setRel(null)} />}
        </div>
      </div>
      {convert && (
        <Modal title="Convert Lead" agent="sf-convert-modal" width={820} onClose={() => setConvert(false)} footer={<><Btn onClick={() => setConvert(false)}>Cancel</Btn><Btn variant="brand" agent="sf-convert-confirm" onClick={doConvert}>Convert</Btn></>}>
          <div className="p-5 space-y-3 text-[13px]">
            <div className="grid grid-cols-[120px_1fr] items-start gap-4 border-b border-[#E5E5E5] pb-3">
              <div className="font-bold pt-1">Account</div>
              <div className="space-y-2">
                <label className="flex items-center gap-2"><input type="radio" checked={acctMode === 'new'} onChange={() => setAcctMode('new')} /> Create New: {l.company}</label>
                <label className="flex items-center gap-2"><input type="radio" checked={acctMode === 'existing'} onChange={() => { setAcctMode('existing'); setExistingAcct(existingAcct || matchAcct?.id || accounts[0]?.id) }} /> Choose Existing{matchAcct ? ' (1 Account Match)' : ''}</label>
                {acctMode === 'existing' && (
                  <select aria-label="Existing account" value={existingAcct} onChange={(e2) => setExistingAcct(e2.target.value)} className={inputCls}>
                    {accounts.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                  </select>
                )}
              </div>
            </div>
            <div className="grid grid-cols-[120px_1fr] items-center gap-4 border-b border-[#E5E5E5] pb-3">
              <div className="font-bold">Contact</div>
              <div className="flex items-center gap-2"><input type="radio" readOnly checked /> Create New: {l.name}</div>
            </div>
            <div className="grid grid-cols-[120px_1fr] items-center gap-4">
              <div className="font-bold">Opportunity</div>
              <div>
                <label className={labelCls}>Opportunity Name</label>
                <input data-agent="sf-convert-opp-name" aria-label="Opportunity Name" value={oppName} disabled={noOpp} onChange={(e2) => setOppName(e2.target.value)} className={`${inputCls} disabled:bg-[#F3F3F3]`} />
                <label className="flex items-center gap-2 mt-2 text-[12.5px]"><input type="checkbox" checked={noOpp} onChange={(e2) => setNoOpp(e2.target.checked)} /> Don’t create an opportunity upon conversion</label>
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

const CASE_STAGES = ['New', 'Working', 'Escalated']

export function CasePage({ id }: { id: string }) {
  const { go } = useNav()
  const cs = useRecord<any>('salesforce.cases', id)
  const accounts = useCollection<any>('salesforce.accounts')
  const contacts = useCollection<any>('salesforce.contacts')
  const [tab, setTab] = useState('Details')
  const [comment, setComment] = useState('')
  const { toast, show, hide } = useToast()
  const { run } = useActions()
  const { isAgent } = useDesk()
  const e = useEditable('salesforce.cases', cs, show)
  if (!cs) return <div className="p-6">This record was deleted or you don’t have access to it.</div>
  const acct = accounts.find((x) => x.id === cs.accountId)
  const con = contacts.find((x) => x.id === cs.contactId)
  const fields: FieldDef[] = [
    { key: 'caseNumber', label: 'Case Number', type: 'readonly' },
    { key: 'ownerId', label: 'Case Owner', type: 'readonly', render: owner },
    { key: 'status', label: 'Status', type: 'select', options: ['New', 'Working', 'Escalated', 'Closed'] },
    { key: 'priority', label: 'Priority', type: 'select', options: ['High', 'Medium', 'Low'] },
    { key: 'origin', label: 'Case Origin', type: 'select', options: ['Phone', 'Email', 'Web'] },
    { key: 'type', label: 'Type', type: 'select', options: ['Question', 'Problem', 'Feature Request'] },
    { key: 'accountId', label: 'Account Name', type: 'readonly', render: () => (acct ? <Link onClick={() => go({ page: 'record', object: 'Account', id: acct.id })}>{acct.name}</Link> : '') },
    { key: 'contactId', label: 'Contact Name', type: 'readonly', render: () => (con ? <Link onClick={() => go({ page: 'record', object: 'Contact', id: con.id })}>{con.name}</Link> : '') },
    { key: 'subject', label: 'Subject', full: true },
    { key: 'description', label: 'Description', type: 'textarea', full: true },
    { key: 'createdDate', label: 'Date/Time Opened', type: 'readonly', render: (v) => sfDateTime(v) },
  ]
  const closed = cs.status === 'Closed'
  return (
    <div className="relative p-3 space-y-3 min-h-full">
      <ToastView toast={toast} hide={hide} />
      <Highlights
        object="Case"
        title={`${cs.caseNumber} — ${cs.subject}`}
        recordId={id}
        fields={[['Priority', cs.priority], ['Status', cs.status], ['Case Number', cs.caseNumber], ['Account Name', acct?.name ?? ''], ['Case Owner', owner(cs.ownerId)]]}
        actions={[
          { label: 'Close Case', onClick: () => { db.update('salesforce.cases', id, { status: 'Closed', closedDate: new Date().toISOString() }); show('Case was closed.') } },
          { label: 'Change Owner', onClick: () => run({ kind: 'owner', object: 'Case', ids: [id] }) },
          { label: 'Edit', onClick: () => { e.start(); setTab('Details') } },
        ]}
        more={[{ label: 'Delete', onClick: () => run({ kind: 'delete', object: 'Case', id, name: cs.caseNumber, after: () => go({ page: 'list', object: 'Case' }) }) }]}
      />
      <Path
        stages={CASE_STAGES}
        current={closed ? 'Closed' : cs.status}
        closedWon={closed}
        onAction={(sel, kind) => {
          if (kind === 'closed') {
            db.update('salesforce.cases', id, { status: closed ? 'Working' : 'Closed', closedDate: closed ? undefined : new Date().toISOString() })
            show(closed ? 'Case was reopened.' : 'Case was closed.')
          } else {
            db.update('salesforce.cases', id, { status: kind === 'complete' ? CASE_STAGES[Math.min(CASE_STAGES.indexOf(cs.status) + 1, CASE_STAGES.length - 1)] : sel })
            show('Status changed successfully.')
          }
        }}
      />
      <div className="flex gap-3 items-start">
        <div className="flex-[2] min-w-0">
          <TabsCard tabs={['Details', 'Feed']} active={tab} setActive={setTab} prefix="sf-case">
            {tab === 'Details' && (
              <div className="p-3">
                <DetailSection title="Case Information">{fields.map((f) => <DetailField key={f.key} f={f} rec={cs} editing={e.editing} draft={e.draft} setDraft={e.setDraft} onEdit={e.start} prefix="sf-case" />)}</DetailSection>
                <Footer e={e} />
              </div>
            )}
            {tab === 'Feed' && (
              <div className="p-4 space-y-3">
                <div className="flex gap-2">
                  <input value={comment} onChange={(x) => setComment(x.target.value)} placeholder="Write a case comment..." className={inputCls} aria-label="Case comment" />
                  <Btn
                    variant="brand"
                    disabled={!comment.trim()}
                    onClick={() => {
                      db.update('salesforce.cases', id, (r) => ({ comments: [{ authorId: ME.id, body: comment.trim(), date: new Date().toISOString(), hw: isAgent }, ...(r.comments ?? [])] }))
                      setComment('')
                    }}
                  >
                    Comment
                  </Btn>
                </div>
                {(cs.comments ?? []).map((c: any, i: number) => (
                  <div key={i} className="flex gap-2 text-[13px] border-t border-[#E5E5E5] pt-2">
                    <Avatar id={c.authorId} size={28} />
                    <div>
                      <div className="font-bold">{person(c.authorId).name} <span className="font-normal text-[12px] text-[#444]">{sfDateTime(c.date)}</span></div>
                      <div>{c.body}</div>
                    </div>
                  </div>
                ))}
                {!(cs.comments ?? []).length && <div className="text-[13px] text-[#444]">No comments yet.</div>}
              </div>
            )}
          </TabsCard>
        </div>
        <div className="flex-1 min-w-[300px] max-w-[420px] space-y-3">
          <RelatedCard icon="Contact" title="Contact Details" count={con ? 1 : 0}>
            {con && <div className="py-1.5 text-[12.5px]"><Link onClick={() => go({ page: 'record', object: 'Contact', id: con.id })}>{con.name}</Link><div className="text-[#444]">{con.title} • {con.email}</div></div>}
          </RelatedCard>
        </div>
      </div>
    </div>
  )
}
