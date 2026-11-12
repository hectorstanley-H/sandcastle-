import { useState } from 'react'
import { db, useCollection, useRecord } from '@/db/db'
import { Btn, ObjectStatus, Table, usd, sapDate, MessageStrip, Field } from './ui'
import { ListReport, ObjectPage, Panel, FormGrid } from './ListReport'
import { supplierFields } from './MasterData'
import type { Go } from './index'

export function SupplierList({ go }: { go: Go }) {
  const rows = useCollection<any>('sap.suppliers')
  return (
    <ListReport
      title="Display Supplier List"
      tableTitle="Suppliers"
      agentPrefix="sap-sup"
      rows={rows}
      searchKeys={(r) => `${r.id} ${r.name} ${r.city}`}
      filters={[
        { label: 'Supplier Category', key: 'category', options: [...new Set(rows.map((r) => r.category))].sort() },
        { label: 'Region', key: 'region', options: [...new Set(rows.map((r) => r.region))].sort() },
      ]}
      onOpen={(r) => go({ app: 'supplier', id: r.id })}
      actions={<Btn kind="transparent" data-agent="sap-sup-create" onClick={() => go({ app: 'createSupplier' })}>Create Business Partner</Btn>}
      cols={[
        { label: 'Supplier', render: (r) => <span className="text-[#0064d9] font-semibold">{r.id}</span>, sort: (r) => r.id },
        { label: 'Name', render: (r) => r.name, sort: (r) => r.name },
        { label: 'City', render: (r) => `${r.city}, ${r.region}`, sort: (r) => r.city },
        { label: 'Country', render: () => 'United States' },
        { label: 'Category', render: (r) => r.category, sort: (r) => r.category },
        { label: 'Payment Terms', render: (r) => r.paymentTerms, sort: (r) => r.paymentTerms },
        { label: 'Central Posting Block', render: (r) => <ObjectStatus status={r.blocked ? 'Blocked' : 'Active'} /> },
      ]}
    />
  )
}

export function SupplierObject({ id, go }: { id: string; go: Go }) {
  const s = useRecord<any>('sap.suppliers', id)
  const invoices = useCollection<any>('sap.invoices').filter((i) => i.supplierId === id)
  const pos = useCollection<any>('sap.pos').filter((p) => p.supplierId === id)
  const [edit, setEdit] = useState<any | null>(null)
  const [note, setNote] = useState<string | null>(null)
  if (!s) return <div className="p-8 text-[14px]">Supplier {id} not found.</div>
  const open = invoices.filter((i) => i.status === 'Posted' || i.status === 'Blocked for Payment').reduce((t, i) => t + i.gross, 0)
  const save = () => {
    const { id: _id, ...patch } = edit
    db.update('sap.suppliers', s.id, { ...patch, changedOn: new Date().toISOString() })
    setEdit(null)
    setNote(`Business partner ${s.id} was saved.`)
  }
  return (
    <ObjectPage
      crumbs={[{ label: 'Display Supplier List', onClick: () => go({ app: 'suppliers' }) }]}
      title={s.name}
      subtitle={`Supplier ${s.id} · ${s.category}`}
      status={<ObjectStatus status={s.blocked ? 'Blocked' : 'Active'} inverted large />}
      actions={
        edit ? (
          <><Btn kind="emph" data-agent="sap-sup-save" onClick={save}>Save</Btn><Btn kind="transparent" onClick={() => setEdit(null)}>Discard Draft</Btn></>
        ) : (
          <>
            <Btn kind="default" data-agent="sap-sup-edit" onClick={() => setEdit({ ...s })}>Edit Business Partner</Btn>
            <Btn
              kind={s.blocked ? 'accept' : 'default'}
              onClick={() => {
                db.update('sap.suppliers', s.id, { blocked: !s.blocked })
                setNote(s.blocked ? `Central posting block removed for ${s.name}.` : `${s.name} is now blocked for posting and purchasing.`)
              }}
            >
              {s.blocked ? 'Remove Posting Block' : 'Set Posting Block'}
            </Btn>
            <Btn kind="default" onClick={() => go({ app: 'supplierBalances' })}>Display Balances</Btn>
          </>
        )
      }
      facets={[
        { label: 'Open Payables', value: <span className="text-[20px] font-light">{usd(open)} <span className="text-[14px] text-[#556b82]">USD</span></span> },
        { label: 'Purchase Orders', value: pos.length },
        { label: 'Payment Terms', value: `${s.paymentTerms} (${s.termsText})` },
        { label: 'Email', value: <span className="text-[#0064d9]">{s.email}</span> },
      ]}
      sections={[
        ...(edit || note
          ? [{
              title: edit ? 'Edit General Data' : 'Messages',
              body: edit ? (
                <Panel><div className="p-5 grid grid-cols-3 gap-x-10 gap-y-4">{supplierFields(edit, (p) => setEdit({ ...edit, ...p })).map(([k, v]) => <Field key={k} label={k}>{v}</Field>)}</div></Panel>
              ) : (
                <MessageStrip type="success" onClose={() => setNote(null)}>{note}</MessageStrip>
              ),
            }]
          : []),
        { title: 'Address', body: <Panel><div className="p-5"><FormGrid items={[['Street', s.street], ['City', `${s.city}, ${s.region} ${s.postal}`], ['Country', 'United States'], ['Telephone', s.phone], ['Tax Number (EIN)', s.taxNumber], ['Created On', sapDate(s.createdOn)]]} /></div></Panel> },
        { title: 'Payment Data', body: <Panel><div className="p-5"><FormGrid items={[['Bank Account', s.bank], ['Reconciliation Account', '211000'], ['Payment Methods', 'T (ACH), C (Check)'], ['Account Group', s.accountGroup], ['Purchasing Org.', s.purchOrg], ['Order Currency', 'USD']]} /></div></Panel> },
        {
          title: 'Purchase Orders',
          body: (
            <Panel>
              <Table cols={[{ label: 'Purchase Order' }, { label: 'Short Text' }, { label: 'Created On' }, { label: 'Net Value', align: 'right' }, { label: 'Status' }]}>
                {pos.length === 0 && <tr><td colSpan={5} className="h-12 text-center text-[#556b82]">No purchase orders</td></tr>}
                {pos.slice(0, 12).map((p) => (
                  <tr key={p.id} className="h-[33px] border-b border-[#e5e5e5] hover:bg-[#eaecee] cursor-pointer" onClick={() => go({ app: 'po', id: p.id })}>
                    <td className="px-2 text-[#0064d9]">{p.id}</td><td className="px-2">{p.items[0]?.description}</td><td className="px-2">{sapDate(p.docDate)}</td><td className="px-2 text-right">{usd(p.netAmount)} USD</td><td className="px-2"><ObjectStatus status={p.status} /></td>
                  </tr>
                ))}
              </Table>
            </Panel>
          ),
        },
        {
          title: 'Supplier Invoices',
          body: (
            <Panel>
              <Table cols={[{ label: 'Supplier Invoice' }, { label: 'Reference' }, { label: 'Date' }, { label: 'Gross Amount', align: 'right' }, { label: 'Status' }]}>
                {invoices.slice(0, 12).map((i) => (
                  <tr key={i.id} className="h-[33px] border-b border-[#e5e5e5] hover:bg-[#eaecee] cursor-pointer" onClick={() => go({ app: 'invoice', id: i.id })}>
                    <td className="px-2 text-[#0064d9]">{i.id}</td><td className="px-2">{i.reference}</td><td className="px-2">{sapDate(i.invoiceDate)}</td><td className="px-2 text-right">{usd(i.gross)} USD</td><td className="px-2"><ObjectStatus status={i.status} /></td>
                  </tr>
                ))}
              </Table>
            </Panel>
          ),
        },
      ]}
    />
  )
}
