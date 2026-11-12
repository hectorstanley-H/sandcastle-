/** Rendered "PDF" pages for envelopes & templates. Pages are laid out at PAGE_W x PAGE_H px. */
import type { ReactNode } from 'react'
import { daysFromNow, fmtDate } from '@/data/time'

export const PAGE_W = 720
export const PAGE_H = 932

type DropFn = (type: 'signature' | 'name' | 'date' | 'title' | 'initial', label: string) => ReactNode

const titleFromFile = (name: string) =>
  name
    .replace(/\.pdf$/i, '')
    .replace(/_/g, ' ')
    .replace(/\bNDA\b/, 'Mutual Non-Disclosure Agreement')
    .replace(/\bMSA\b/, 'Master Services Agreement')
    .replace(/\bSOW\b/, 'Statement of Work')
    .replace(/\bDPA\b/, 'Data Processing Addendum')

function Letterhead({ right }: { right?: string }) {
  return (
    <div className="flex items-start justify-between pb-3 mb-5 border-b-2 border-[#1F3A5F]">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-[5px] bg-[#1F3A5F] text-white flex items-center justify-center font-bold text-[15px]">N</div>
        <div>
          <div className="text-[15px] font-bold tracking-tight text-[#1F3A5F] leading-none">Northwind Global</div>
          <div className="text-[8.5px] text-[#6B7280] mt-0.5">Northwind Global Inc. · 200 Clarendon St, Boston, MA 02116</div>
        </div>
      </div>
      {right && <div className="text-[9px] text-right text-[#6B7280] whitespace-pre-line">{right}</div>}
    </div>
  )
}

const P = ({ children }: { children: ReactNode }) => <p className="text-[9.5px] leading-[1.55] text-[#2B2B2B] mb-2 text-justify">{children}</p>

const LOREM = [
  'Each party shall hold the Confidential Information of the other party in strict confidence and shall not disclose such Confidential Information to any third party, except to its employees, contractors and advisors who have a need to know and are bound by obligations of confidentiality no less protective than those set forth herein.',
  'Fees are exclusive of all applicable taxes. Customer shall pay all undisputed invoices within thirty (30) days of the invoice date. Late payments may bear interest at the lesser of 1.0% per month or the maximum rate permitted by law.',
  'Northwind warrants that the Services will perform materially in accordance with the applicable Documentation. Customer’s exclusive remedy for breach of this warranty shall be the re-performance of the deficient Services or, if Northwind cannot remedy the deficiency, termination and a refund of prepaid fees for the affected period.',
  'Except for breaches of confidentiality or indemnification obligations, neither party’s aggregate liability arising out of or related to this Agreement shall exceed the total amounts paid or payable by Customer in the twelve (12) months preceding the event giving rise to the claim.',
  'This Agreement shall be governed by the laws of the Commonwealth of Massachusetts, without regard to its conflict of laws principles. The parties consent to the exclusive jurisdiction of the state and federal courts located in Suffolk County, Massachusetts.',
  'Either party may terminate this Agreement upon written notice if the other party materially breaches this Agreement and fails to cure such breach within thirty (30) days after receipt of such notice.',
]

function SigLine({ label, drop, type, value }: { label: string; drop?: DropFn; type: 'signature' | 'name' | 'date' | 'title'; value?: string }) {
  return (
    <div className="mb-3">
      <div className="h-[30px] border-b border-[#4B5563] relative flex items-end">
        {value && <span className="text-[10.5px] pb-0.5">{value}</span>}
        {drop && <div className="absolute left-0 bottom-[2px]">{drop(type, label)}</div>}
      </div>
      <div className="text-[8.5px] text-[#6B7280] mt-0.5">{label}</div>
    </div>
  )
}

function SignatureBlock({ drop, customer, contact }: { drop?: DropFn; customer: string; contact?: string }) {
  return (
    <div className="mt-4">
      <div className="text-[10px] font-bold text-[#1F3A5F] uppercase tracking-wide mb-2">Signatures</div>
      <P>IN WITNESS WHEREOF, the parties have caused this Order Form to be executed by their duly authorized representatives as of the Effective Date.</P>
      <div className="grid grid-cols-2 gap-8 mt-2">
        <div className="rounded border border-[#D1D5DB] p-3">
          <div className="text-[10px] font-bold mb-2">{customer}</div>
          <SigLine label="Signature" type="signature" drop={drop} />
          <SigLine label="Printed Name" type="name" drop={drop} value={drop ? undefined : undefined} />
          <SigLine label="Title" type="title" value={contact} />
          <SigLine label="Date" type="date" drop={drop} />
        </div>
        <div className="rounded border border-[#D1D5DB] p-3">
          <div className="text-[10px] font-bold mb-2">Northwind Global Inc.</div>
          <SigLine label="Signature" type="signature" />
          <SigLine label="Printed Name" type="name" value="Alex Morgan" />
          <SigLine label="Title" type="title" value="Operations Manager" />
          <SigLine label="Date" type="date" />
        </div>
      </div>
    </div>
  )
}

function Table({ head, rows, foot }: { head: string[]; rows: (string | number)[][]; foot?: [string, string][] }) {
  return (
    <table className="w-full text-[9.5px] border-collapse mb-3">
      <thead>
        <tr className="bg-[#1F3A5F] text-white">
          {head.map((h, i) => (
            <th key={h} className={`px-2 py-1.5 font-semibold ${i === 0 ? 'text-left' : 'text-right'}`}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className={i % 2 ? 'bg-[#F3F5F8]' : ''}>
            {r.map((c, j) => (
              <td key={j} className={`px-2 py-1.5 border-b border-[#E5E7EB] ${j === 0 ? 'text-left' : 'text-right'}`}>
                {c}
              </td>
            ))}
          </tr>
        ))}
        {foot?.map(([k, v]) => (
          <tr key={k}>
            <td colSpan={head.length - 1} className="px-2 py-1 text-right font-semibold">
              {k}
            </td>
            <td className="px-2 py-1 text-right font-bold">{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function OrderFormP1({ drop, renewal, file }: { drop?: DropFn; renewal: boolean; file: string }) {
  const customer = renewal || /contoso/i.test(file) ? 'Contoso Ltd' : /adatum/i.test(file) ? 'Adatum Corporation' : /alpine/i.test(file) ? 'Alpine Ski House' : 'Customer'
  const start = fmtDate(daysFromNow(41), { month: 'long', day: 'numeric', year: 'numeric' })
  return (
    <>
      <Letterhead right={`Order Form No. NWG-OF-2026-0418\nQuote valid until ${fmtDate(daysFromNow(30))}`} />
      <div className="text-[17px] font-bold text-[#111827] mb-0.5">{renewal ? 'Order Form — Subscription Renewal' : 'Order Form'}</div>
      <div className="text-[9.5px] text-[#6B7280] mb-4">This Order Form is governed by the Master Subscription Agreement dated March 14, 2023 between the parties (the “Agreement”).</div>
      <div className="grid grid-cols-2 gap-4 mb-4 text-[9.5px]">
        <div className="rounded bg-[#F3F5F8] p-2.5">
          <div className="font-bold text-[#1F3A5F] mb-1">CUSTOMER</div>
          <div>{customer}</div>
          <div>1200 Contoso Plaza, Seattle, WA 98101</div>
          <div>Contact: {customer === 'Contoso Ltd' ? 'Kate Sullivan, Procurement Director' : 'Authorized Signatory'}</div>
          <div>Billing: ap@{customer.split(' ')[0].toLowerCase()}.com</div>
        </div>
        <div className="rounded bg-[#F3F5F8] p-2.5">
          <div className="font-bold text-[#1F3A5F] mb-1">SUBSCRIPTION TERM</div>
          <div>Term: <b>36 months (3 years)</b></div>
          <div>Start date: {start}</div>
          <div>Billing: Annually in advance, Net 30</div>
          <div>Account Executive: Liam O’Connor</div>
        </div>
      </div>
      <Table
        head={['Product / Service', 'Qty', 'Unit (annual)', 'Annual total']}
        rows={[
          ['Northwind Global Enterprise subscription', '400 seats', '$720.00', '$288,000.00'],
          ['Premier Support (24×7, 1h P1 response)', '1', '$36,000.00', '$36,000.00'],
          ['Advanced Analytics add-on', '400 seats', '$60.00', '$24,000.00'],
          ['Multi-year commitment discount (−8%)', '', '', '−$27,840.00'],
        ]}
        foot={[
          ['Annual subscription fees', '$320,160.00'],
          ['Total contract value (3 years)', '$960,480.00'],
        ]}
      />
      <div className="text-[10px] font-bold text-[#1F3A5F] uppercase tracking-wide mb-1">Key terms</div>
      <ol className="list-decimal pl-4 text-[9.5px] leading-[1.5] text-[#2B2B2B] space-y-0.5 mb-1">
        <li>Pricing is fixed for the 3-year term; annual price increases are waived.</li>
        <li>Customer may add seats at the same per-seat rate, prorated to the anniversary date.</li>
        <li>Renewal thereafter: automatic 12-month terms unless either party gives 60 days’ notice.</li>
      </ol>
      <SignatureBlock drop={drop} customer={customer} />
    </>
  )
}

function OfferP1({ file, drop }: { file: string; drop?: DropFn }) {
  const who = /Jordan/.test(file) ? 'Jordan Ellis' : /Maya/.test(file) ? 'Maya Johnson' : '[Candidate Name]'
  return (
    <>
      <Letterhead right={fmtDate(new Date().toISOString(), { month: 'long', day: 'numeric', year: 'numeric' })} />
      <div className="text-[10px] mb-3">
        {who}
        <br />
        Boston, MA
      </div>
      <div className="text-[15px] font-bold mb-3">Offer of Employment</div>
      <P>Dear {who.split(' ')[0]},</P>
      <P>We are delighted to offer you the position of Operations Analyst at Northwind Global Inc., reporting to Alex Morgan, Operations Manager. This letter sets out the principal terms of your employment.</P>
      <Table head={['Term', 'Detail']} rows={[['Position', 'Operations Analyst'], ['Base salary', '$92,000 per year'], ['Target bonus', '10% of base salary'], ['Equity', '1,200 RSUs (4-year vesting)'], ['Location', 'Boston, MA (hybrid)']]} />
      {LOREM.slice(0, drop ? 1 : 3).map((t, i) => (
        <P key={i}>{t}</P>
      ))}
      {drop && (
        <div className="mt-3 w-[300px] rounded border border-[#D1D5DB] p-3">
          <div className="text-[10px] font-bold mb-2">Accepted by {who}</div>
          <SigLine label="Signature" type="signature" drop={drop} />
          <SigLine label="Printed Name" type="name" drop={drop} />
          <SigLine label="Date" type="date" drop={drop} />
        </div>
      )}
    </>
  )
}

function Generic({ file, page, drop }: { file: string; page: number; drop?: DropFn }) {
  return (
    <>
      <Letterhead right={`Page ${page}`} />
      {page === 1 && <div className="text-[16px] font-bold mb-4 text-center uppercase tracking-wide">{titleFromFile(file)}</div>}
      {Array.from({ length: page === 1 ? (drop ? 1 : 2) : 3 }).map((_, k) => (
        <div key={k}>
          <div className="text-[10px] font-bold text-[#1F3A5F] mb-1 mt-2">
            {page * 3 + k - 2}. {['Definitions', 'Confidentiality', 'Fees and Payment', 'Warranties', 'Limitation of Liability', 'Term and Termination', 'Governing Law'][(page * 3 + k) % 7]}
          </div>
          {LOREM.slice((page + k) % 3, ((page + k) % 3) + 3).map((t, i) => (
            <P key={i}>{t}</P>
          ))}
        </div>
      ))}
      {drop && page === 1 && (
        <div className="mt-4">
          <div className="text-[10px] font-bold text-[#1F3A5F] uppercase tracking-wide mb-2">Acknowledged and agreed</div>
          <div className="w-[300px] rounded border border-[#D1D5DB] p-3">
            <SigLine label="Signature" type="signature" drop={drop} />
            <SigLine label="Printed Name" type="name" drop={drop} />
            <SigLine label="Date" type="date" drop={drop} />
          </div>
        </div>
      )}
    </>
  )
}

export function DocPage({ file, page = 1, drop, children, renewal }: { file: string; page?: number; drop?: DropFn; children?: ReactNode; renewal?: boolean }) {
  const isOrder = /Order_Form/i.test(file)
  const isRenewal = renewal ?? /Renewal/i.test(file)
  const isOffer = /Offer_Letter/i.test(file)
  return (
    <div className="relative bg-white text-[#111827] shadow-[0_1px_4px_rgba(0,0,0,0.18)]" style={{ width: PAGE_W, height: PAGE_H, padding: '46px 56px', fontFamily: "'Open Sans', Arial, sans-serif" }}>
      {page === 1 && isOrder ? <OrderFormP1 drop={drop} renewal={isRenewal} file={file} /> : page === 1 && isOffer ? <OfferP1 file={file} drop={drop} /> : <Generic file={file} page={page} drop={drop} />}
      <div className="absolute bottom-5 left-14 right-14 flex justify-between text-[8px] text-[#9CA3AF]">
        <span>Northwind Global Inc. — Confidential</span>
        <span>Page {page}</span>
      </div>
      {children}
    </div>
  )
}

/** Scaled-down page used as a thumbnail. */
export function DocThumb({ file, width = 120, page = 1 }: { file: string; width?: number; page?: number }) {
  const s = width / PAGE_W
  return (
    <div className="overflow-hidden border border-[#E5E1EC] bg-white shrink-0" style={{ width, height: PAGE_H * s }}>
      <div style={{ transform: `scale(${s})`, transformOrigin: 'top left', width: PAGE_W, height: PAGE_H, pointerEvents: 'none' }}>
        <DocPage file={file} page={page} />
      </div>
    </div>
  )
}
