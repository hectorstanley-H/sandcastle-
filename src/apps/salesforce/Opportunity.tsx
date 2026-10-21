import { useState } from 'react'
import { FileText } from 'lucide-react'
import { db, useCollection, useRecord } from '@/db/db'
import { useDesk } from '@/os/context'
import { Avatar } from '@/components/Avatar'
import { person } from '@/data/people'
import { STAGES, STAGE_PROB, forecastFor } from '@/db/seeds/sales'
import { Btn, HWChip, Link, inputCls, sfDate, sfDateTime, usd, useNav } from './ui'
import { Confetti, DetailField, DetailSection, Highlights, Modal, Path, RelatedCard, TabsCard, ToastView, useToast, type FieldDef } from './record'
import { ActivityPanel } from './Activity'
import { ChatterFeed } from './Chatter'

const OPEN_STAGES = STAGES.slice(0, 8)

const GUIDANCE: Record<string, string> = {
  Prospecting: 'Research the account, identify a champion and confirm there is a real operations pain worth solving.',
  Qualification: 'Confirm budget, authority, need and timeline (BANT). Identify the economic buyer and agree on a mutual close plan.',
  'Needs Analysis': 'Document current process, number of sites/users, integrations (MES, ERP) and success criteria.',
  'Value Proposition': 'Present a tailored demo and ROI. Send pricing for the agreed seat count and confirm the decision process.',
  'Id. Decision Makers': 'Map every stakeholder on the buying committee and add them as Contact Roles.',
  'Perception Analysis': 'Validate that decision makers see Ops Cloud as the preferred option. Address objections.',
  'Proposal/Price Quote': 'Send the formal quote. Get Deal Desk approval on any discount over 10%.',
  'Negotiation/Review': 'Finalize terms with procurement and legal. Send the order form for signature.',
}

export function OpportunityPage({ id }: { id: string }) {
  const { isAgent } = useDesk()
  const { go } = useNav()
  const opp = useRecord<any>('salesforce.opportunities', id)
  const accounts = useCollection<any>('salesforce.accounts')
  const allContacts = useCollection<any>('salesforce.contacts')
  const [tab, setTab] = useState('Activity')
  const [mode, setMode] = useState<any>(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<any>({})
  const [closeModal, setCloseModal] = useState(false)
  const [closeStage, setCloseStage] = useState('Closed Won')
  const [confetti, setConfetti] = useState(false)
  const { toast, show, hide } = useToast()
  if (!opp) return <div className="p-6">Record not found.</div>
  const acct = accounts.find((a) => a.id === opp.accountId)
  const contacts = allContacts.filter((c) => c.accountId === opp.accountId)
  const by = isAgent ? { updatedBy: 'hworker' } : { updatedBy: undefined }

  const setStage = (stage: string) => {
    db.update('salesforce.opportunities', id, (r) => ({
      stage,
      probability: STAGE_PROB[stage],
      forecastCategory: forecastFor(stage),
      lastModified: new Date().toISOString(),
      stageHistory: [...(r.stageHistory ?? []), { stage, date: new Date().toISOString(), by: 'alex', hw: isAgent }],
      ...(stage === 'Closed Won' ? { contractStart: r.contractStart || r.closeDate } : {}),
      ...by,
    }))
  }

  const onPath = (sel: string, kind: 'complete' | 'current' | 'closed') => {
    if (kind === 'closed') {
      setCloseModal(true)
      return
    }
    if (kind === 'complete') {
      const next = OPEN_STAGES[OPEN_STAGES.indexOf(opp.stage) + 1]
      if (!next) {
        setCloseModal(true)
        return
      }
      setStage(next)
    } else setStage(sel)
    show('Stage changed successfully.')
  }

  const startEdit = () => {
    setDraft({ ...opp })
    setEditing(true)
    setTab('Details')
  }
  const save = () => {
    const amount = Number(String(draft.amount).replace(/[^0-9.]/g, '')) || 0
    const seats = draft.seats === '' || draft.seats == null ? null : Number(String(draft.seats).replace(/[^0-9.]/g, ''))
    const pricePerSeat = draft.pricePerSeat === '' || draft.pricePerSeat == null ? null : Number(String(draft.pricePerSeat).replace(/[^0-9.]/g, ''))
    const stageChanged = draft.stage !== opp.stage
    db.update('salesforce.opportunities', id, (r) => ({
      ...draft,
      amount,
      seats,
      pricePerSeat,
      contractTerm: Number(draft.contractTerm) || r.contractTerm,
      probability: stageChanged ? STAGE_PROB[draft.stage] : Number(String(draft.probability).replace('%', '')) || r.probability,
      forecastCategory: stageChanged ? forecastFor(draft.stage) : draft.forecastCategory,
      lastModified: new Date().toISOString(),
      stageHistory: stageChanged ? [...(r.stageHistory ?? []), { stage: draft.stage, date: new Date().toISOString(), by: 'alex', hw: isAgent }] : r.stageHistory,
      ...by,
    }))
    setEditing(false)
    show(`Opportunity "${opp.name}" was saved.`)
  }
  const saveClosed = () => {
    setStage(closeStage)
    setCloseModal(false)
    if (closeStage === 'Closed Won') {
      setConfetti(true)
      setTimeout(() => setConfetti(false), 4200)
    }
    show(`Stage changed successfully.`)
  }

  const ownerCell = (oid: string) => (
    <span className="inline-flex items-center gap-1.5">
      <Avatar id={oid} size={20} /> <Link>{person(oid).name}</Link>
    </span>
  )
  const modifiedBy = (
    <span className="inline-flex items-center gap-1.5 flex-wrap">
      <Avatar id="alex" size={20} /> <Link>Alex Morgan</Link>, {sfDateTime(opp.lastModified)} {opp.updatedBy === 'hworker' && <HWChip text="via H-Worker" />}
    </span>
  )

  const info: FieldDef[] = [
    { key: 'ownerId', label: 'Opportunity Owner', type: 'readonly', render: (v) => ownerCell(v) },
    { key: 'amount', label: 'Amount', type: 'currency', render: (v) => usd(v) },
    { key: 'name', label: 'Opportunity Name', required: true },
    { key: 'closeDate', label: 'Close Date', type: 'date', required: true, render: (v) => sfDate(v) },
    { key: 'accountId', label: 'Account Name', type: 'readonly', render: () => <Link onClick={() => go({ page: 'record', object: 'Account', id: acct.id })}>{acct?.name}</Link> },
    { key: 'nextStep', label: 'Next Step' },
    { key: 'type', label: 'Type', type: 'select', options: ['New Business', 'Existing Business - Upgrade', 'Existing Business - Renewal'] },
    { key: 'stage', label: 'Stage', type: 'select', options: STAGES, required: true },
    { key: 'leadSource', label: 'Lead Source', type: 'select', options: ['Web', 'Webinar', 'Trade Show', 'Partner Referral', 'Outbound', 'Existing Customer'] },
    { key: 'probability', label: 'Probability (%)', type: 'percent', render: (v) => `${v}%` },
    { key: 'competitor', label: 'Main Competitor', type: 'select', options: ['ServiceTitan', 'Monday.com', 'In-house build', 'Smartsheet', 'None'] },
    { key: 'forecastCategory', label: 'Forecast Category', type: 'select', options: ['Pipeline', 'Best Case', 'Commit', 'Closed', 'Omitted'] },
  ]
  const contract: FieldDef[] = [
    { key: 'seats', label: 'Contract Seats', type: 'number', render: (v) => (v == null ? '' : Number(v).toLocaleString('en-US')) },
    { key: 'contractStart', label: 'Contract Start Date', type: 'date', render: (v) => sfDate(v) },
    { key: 'pricePerSeat', label: 'Price per Seat (Annual)', type: 'currency', render: (v) => usd(v) },
    { key: 'contractTerm', label: 'Contract Term (months)', type: 'number' },
  ]
  const extra: FieldDef[] = [{ key: 'description', label: 'Description', type: 'textarea', full: true }]
  const sys: FieldDef[] = [
    { key: 'createdDate', label: 'Created By', type: 'readonly', render: (v) => <span className="inline-flex items-center gap-1.5"><Avatar id={opp.ownerId} size={20} /> <Link>{person(opp.ownerId).name}</Link>, {sfDateTime(v)}</span> },
    { key: 'lastModified', label: 'Last Modified By', type: 'readonly', render: () => modifiedBy },
  ]
  const field = (f: FieldDef) => <DetailField key={f.key} f={f} rec={opp} editing={editing} draft={draft} setDraft={setDraft} onEdit={startEdit} prefix="sf-opp" />
  const closed = opp.stage.startsWith('Closed')
  const products = opp.products ?? []

  return (
    <div className="relative p-3 space-y-3 min-h-full">
      {confetti && <Confetti />}
      <ToastView toast={toast} hide={hide} />
      <Highlights
        object="Opportunity"
        title={opp.name}
        badge={opp.updatedBy === 'hworker' ? <HWChip text="Updated by H-Worker" /> : null}
        fields={[
          ['Account Name', <Link onClick={() => go({ page: 'record', object: 'Account', id: acct.id })}>{acct?.name}</Link>],
          ['Close Date', sfDate(opp.closeDate)],
          ['Amount', <span data-agent="sf-opp-amount">{usd(opp.amount)}</span>],
          ['Opportunity Owner', ownerCell(opp.ownerId)],
        ]}
        actions={[
          { label: 'New Event', onClick: () => { setTab('Activity'); setMode('event') } },
          { label: 'New Task', agent: 'sf-opp-new-task', onClick: () => { setTab('Activity'); setMode('task') } },
          { label: 'Edit', agent: 'sf-opp-edit', onClick: startEdit },
        ]}
      />
      <Path
        stages={OPEN_STAGES}
        current={opp.stage}
        closedWon={opp.stage === 'Closed Won'}
        closedLost={opp.stage === 'Closed Lost'}
        onAction={onPath}
        guidance={GUIDANCE[opp.stage] ?? 'Congratulations! Make sure the contract fields are complete and hand over to Customer Success.'}
        keyFields={
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[13px]">
            <div><div className="text-[12px] text-[#444]">Amount</div>{usd(opp.amount)}</div>
            <div><div className="text-[12px] text-[#444]">Close Date</div>{sfDate(opp.closeDate)}</div>
            <div className="col-span-2"><div className="text-[12px] text-[#444]">Next Step</div>{opp.nextStep || ' '}</div>
          </div>
        }
      />
      <div className="flex gap-3 items-start">
        <div className="flex-[2] min-w-0">
          <TabsCard tabs={['Activity', 'Details', 'Chatter']} active={tab} setActive={setTab} prefix="sf-opp">
            {tab === 'Activity' && <ActivityPanel whatId={id} whatName={opp.name} whatObject="Opportunity" contacts={contacts} mode={mode} setMode={setMode} onToast={show} />}
            {tab === 'Details' && (
              <div className="p-3 relative">
                <DetailSection title="Opportunity Information">{info.map(field)}</DetailSection>
                <DetailSection title="Contract Details">{contract.map(field)}</DetailSection>
                <DetailSection title="Description Information">{extra.map(field)}</DetailSection>
                <DetailSection title="System Information">{sys.map(field)}</DetailSection>
                {editing && (
                  <div className="sticky bottom-0 -mx-3 -mb-3 mt-2 h-14 bg-[#F3F3F3] border-t border-[#C9C9C9] flex items-center justify-center gap-2">
                    <Btn agent="sf-opp-cancel" onClick={() => setEditing(false)}>Cancel</Btn>
                    <Btn variant="brand" agent="sf-opp-save" label="Save" onClick={save}>Save</Btn>
                  </div>
                )}
              </div>
            )}
            {tab === 'Chatter' && <ChatterFeed parentId={id} parentName={opp.name} onToast={show} />}
          </TabsCard>
        </div>
        <div className="flex-1 min-w-[300px] max-w-[420px] space-y-3">
          <div className="bg-white rounded-[4px] border border-[#C9C9C9] px-3 py-2 text-[13px]" style={{ boxShadow: '0 2px 2px 0 rgba(0,0,0,0.10)' }}>
            <div className="font-bold text-[14px] mb-1">Related List Quick Links</div>
            <div className="grid grid-cols-2 gap-y-1">
              {[['Contact Roles', opp.contactRoles.length, '#A094ED'], ['Products', products.length, '#B781D3'], ['Quotes', opp.quotes.length, '#88C651'], ['Notes & Attachments', opp.files.length, '#9DA4B1'], ['Stage History', opp.stageHistory.length, '#7F8DE1'], ['Partners', 0, '#57A3FD']].map(([l, n, c]) => (
                <span key={l as string} className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-[3px]" style={{ background: c as string }} />
                  <Link className="text-[13px]">{l} ({n})</Link>
                </span>
              ))}
            </div>
          </div>
          <RelatedCard icon="ContactRole" title="Contact Roles" count={opp.contactRoles.length}>
            {opp.contactRoles.map((cr: any) => {
              const c = allContacts.find((x) => x.id === cr.contactId)
              if (!c) return null
              return (
                <div key={cr.contactId} className="py-1.5 text-[12.5px]">
                  <Link className="text-[13px]" onClick={() => go({ page: 'record', object: 'Contact', id: c.id })}>{c.name}</Link>
                  {cr.primary && <span className="ml-1 text-[11px] text-[#444]">(Primary)</span>}
                  <div className="grid grid-cols-[60px_1fr] text-[12px]"><span className="text-[#444]">Role:</span><span>{cr.role}</span><span className="text-[#444]">Title:</span><span>{c.title}</span></div>
                </div>
              )
            })}
          </RelatedCard>
          <RelatedCard icon="Product" title="Products" count={products.length} agent="sf-opp-products">
            {products.map((p: any) => (
              <div key={p.name} className="py-1.5 text-[12px]">
                <Link className="text-[13px]">{p.name}</Link>
                <div className="grid grid-cols-[80px_1fr]"><span className="text-[#444]">Quantity:</span><span>{Number(p.qty).toLocaleString()}</span><span className="text-[#444]">Sales Price:</span><span>{usd(p.price)}</span><span className="text-[#444]">Total Price:</span><span>{usd(p.qty * p.price)}</span></div>
              </div>
            ))}
          </RelatedCard>
          <RelatedCard icon="Quote" title="Quotes" count={opp.quotes.length}>
            {opp.quotes.map((q: any) => (
              <div key={q.id} className="py-1.5 text-[12px]">
                <Link className="text-[13px]">{q.name}</Link>
                <div className="grid grid-cols-[80px_1fr]"><span className="text-[#444]">Status:</span><span>{q.status}</span><span className="text-[#444]">Total:</span><span>{usd(q.total)}</span><span className="text-[#444]">Expires:</span><span>{sfDate(q.expires)}</span></div>
              </div>
            ))}
          </RelatedCard>
          <RelatedCard icon="File" title="Files" count={opp.files.length}>
            {opp.files.map((f: any) => (
              <div key={f.name} className="flex items-center gap-2 py-1.5">
                <span className={`w-7 h-8 rounded-[3px] flex items-center justify-center text-white ${f.kind === 'pdf' ? 'bg-[#E65A5A]' : f.kind === 'pptx' ? 'bg-[#FF8B4C]' : 'bg-[#4A90E2]'}`}><FileText size={14} /></span>
                <div className="min-w-0">
                  <Link className="text-[13px] truncate block">{f.name}</Link>
                  <div className="text-[11.5px] text-[#444]">{sfDate(f.date)} • {f.size} • {f.kind}</div>
                </div>
              </div>
            ))}
          </RelatedCard>
          <RelatedCard icon="History" title="Stage History" count={opp.stageHistory.length}>
            {[...opp.stageHistory].reverse().slice(0, 4).map((h: any, i: number) => (
              <div key={i} className="py-1.5 text-[12px] grid grid-cols-[80px_1fr]">
                <span className="text-[#444]">Stage:</span><span className="flex items-center gap-1">{h.stage} {h.hw && <HWChip />}</span>
                <span className="text-[#444]">Modified:</span><span>{sfDateTime(h.date)}</span>
              </div>
            ))}
          </RelatedCard>
        </div>
      </div>
      {closeModal && (
        <Modal
          title="Close This Opportunity"
          agent="sf-close-modal"
          width={520}
          onClose={() => setCloseModal(false)}
          footer={
            <>
              <Btn onClick={() => setCloseModal(false)}>Cancel</Btn>
              <Btn variant="brand" agent="sf-close-save" label="Save" onClick={saveClosed}>Save</Btn>
            </>
          }
        >
          <div className="p-6">
            <label className="block text-[12px] text-[#444] mb-0.5"><abbr className="text-[#BA0517] no-underline mr-0.5">*</abbr>Stage</label>
            <select data-agent="sf-close-stage" aria-label="Stage" value={closeStage} onChange={(e) => setCloseStage(e.target.value)} className={inputCls}>
              <option>Closed Won</option>
              <option>Closed Lost</option>
            </select>
            {closed ? null : <p className="text-[12px] text-[#444] mt-3">Closing this opportunity sets the probability to {closeStage === 'Closed Won' ? '100%' : '0%'} and the forecast category to {closeStage === 'Closed Won' ? 'Closed' : 'Omitted'}.</p>}
          </div>
        </Modal>
      )}
    </div>
  )
}
