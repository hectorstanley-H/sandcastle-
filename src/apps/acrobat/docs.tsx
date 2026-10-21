/**
 * Rendered PDF documents for Acrobat. Each page is a 816×1056 (US Letter @96dpi) React tree.
 * <F k="…"> marks an annotatable field: data-agent="acrobat-field-<k>", highlightable, sticky-note anchor.
 */
import { createContext, useContext, type ReactNode } from 'react'
import { daysAgo } from '@/data/time'

export interface AnnoCtxT {
  highlights: Set<string>
  notes: Record<string, number>
  tool: string
  onField: (k: string, e: React.MouseEvent) => void
}
export const AnnoCtx = createContext<AnnoCtxT>({ highlights: new Set(), notes: {}, tool: 'select', onField: () => {} })

export function F({ k, children, className = '' }: { k: string; children: ReactNode; className?: string }) {
  const c = useContext(AnnoCtx)
  const hl = c.highlights.has(k)
  const n = c.notes[k]
  const armed = c.tool === 'highlight' || c.tool === 'comment'
  return (
    <span
      data-agent={`acrobat-field-${k}`}
      aria-label={`Field ${k}`}
      onClick={(e) => c.onField(k, e)}
      className={`relative ${armed ? 'cursor-text hover:outline hover:outline-1 hover:outline-[#1473E6]/60' : ''} ${className}`}
      style={hl ? { background: 'rgba(255, 230, 0, 0.55)', boxShadow: '0 0 0 2px rgba(255,230,0,0.55)' } : undefined}
    >
      {children}
      {n ? (
        <span className="absolute -top-3 -right-7 w-6 h-6 rounded-[3px] bg-[#FFD02B] border border-[#C9A100] shadow flex items-center justify-center" title="Comment">
          <svg width="14" height="14" viewBox="0 0 16 16"><path d="M2 2h12v9H7l-3 3v-3H2z" fill="#fff" stroke="#6B5300" strokeWidth="1" /></svg>
        </span>
      ) : null}
    </span>
  )
}

const d = (iso: string, opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }) => new Date(iso).toLocaleDateString('en-US', opts)
const addDays = (iso: string, n: number) => new Date(new Date(iso).getTime() + n * 86400000).toISOString()

function Page({ children, className = '', style }: { children: ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`w-[816px] h-[1056px] bg-white relative overflow-hidden text-[#111] ${className}`} style={{ fontFamily: 'Helvetica, Arial, sans-serif', ...style }}>
      {children}
    </div>
  )
}
const Foot = ({ left, n, of }: { left: string; n: number; of: number }) => (
  <div className="absolute bottom-10 left-16 right-16 flex justify-between text-[10px] text-[#777] border-t border-[#ddd] pt-2">
    <span>{left}</span>
    <span>Page {n} of {of}</span>
  </div>
)

/* ───────────────────────── receipts ───────────────────────── */

function Uber() {
  const day = daysAgo(2, 18, 42)
  return (
    <Page>
      <div className="px-16 pt-14">
        <div className="flex justify-between items-start">
          <div className="text-[34px] font-bold tracking-tight">Uber</div>
          <div className="text-right text-[12px] text-[#555]">
            <div>{d(day, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div>
            <div>Trip ID 6f2c9a1e-44b7-4c0a-9b1f-0d7e3a2b81c4</div>
          </div>
        </div>
        <div className="mt-10 text-[30px] font-bold leading-tight">Thanks for riding, Alex</div>
        <div className="text-[14px] text-[#555] mt-1">We hope you enjoyed your ride this evening.</div>
        <div className="mt-8 flex justify-between items-end border-b-2 border-black pb-3">
          <span className="text-[24px] font-bold">Total</span>
          <F k="total" className="text-[24px] font-bold">$48.20</F>
        </div>
        <div className="text-[14px] mt-3 space-y-2.5">
          {[
            ['Trip fare', '$39.75'],
            ['Booking Fee', '$3.45'],
          ].map(([a, b]) => (
            <div key={a} className="flex justify-between"><span>{a}</span><span>{b}</span></div>
          ))}
          <div className="flex justify-between border-t border-[#ddd] pt-2.5 font-semibold"><span>Subtotal</span><span>$43.20</span></div>
          <div className="flex justify-between"><span>Tip</span><span>$5.00</span></div>
        </div>
        <div className="mt-8 text-[18px] font-bold">Payments</div>
        <div className="flex justify-between items-center mt-3 text-[14px]">
          <div className="flex items-center gap-3">
            <span className="w-10 h-6 rounded bg-[#2E77BC] text-white text-[9px] font-bold flex items-center justify-center">AMEX</span>
            <div>
              <div>American Express ••••1007</div>
              <div className="text-[12px] text-[#666]">{d(day, { month: 'numeric', day: 'numeric', year: '2-digit' })} 7:21 PM</div>
            </div>
          </div>
          <span>$48.20</span>
        </div>
        <div className="mt-3 text-[12px] text-[#666]">Visit the trip page for more information, including invoices (where available).</div>
        <div className="mt-8 text-[18px] font-bold">You rode with Darnell</div>
        <div className="text-[13px] text-[#555] mt-1">4.94 ★ Rating · License Plate: 3LKX72 · Toyota Camry Hybrid</div>
        <div className="mt-6 flex gap-5">
          <div className="w-[300px] h-[170px] rounded bg-[#E8EEF3] relative overflow-hidden">
            <svg viewBox="0 0 300 170" className="absolute inset-0">
              <path d="M0 40h300M0 100h300M60 0v170M180 0v170M240 0v170" stroke="#fff" strokeWidth="7" />
              <path d="M0 140 C80 120 120 60 190 70 S270 30 300 20" stroke="#cdd7e0" strokeWidth="12" fill="none" />
              <path d="M40 132 C90 118 120 70 170 74 S230 50 262 36" stroke="#000" strokeWidth="3.5" fill="none" />
              <circle cx="40" cy="132" r="6" fill="#000" />
              <rect x="256" y="30" width="12" height="12" fill="#000" />
            </svg>
          </div>
          <div className="text-[13px] flex-1">
            <div className="text-[#666]">UberX · 11.4 miles · 37 min</div>
            <div className="mt-4 flex gap-3"><span className="mt-1 w-2.5 h-2.5 rounded-full bg-black" /><div><div className="font-semibold">6:42 PM</div><div className="text-[#555]">Logan International Airport, Terminal A, Boston, MA 02128</div></div></div>
            <div className="mt-4 flex gap-3"><span className="mt-1 w-2.5 h-2.5 bg-black" /><div><div className="font-semibold">7:19 PM</div><div className="text-[#555]">1 Federal St, Boston, MA 02110</div></div></div>
          </div>
        </div>
        <div className="absolute bottom-14 left-16 right-16 text-[10.5px] text-[#888] leading-relaxed">
          Fares are inclusive of applicable taxes and fees. Uber Technologies, Inc., 1725 3rd Street, San Francisco, CA 94158. This receipt was issued on behalf of the driver. Questions? help.uber.com
        </div>
      </div>
    </Page>
  )
}

function Marriott() {
  const arr = daysAgo(4, 15, 0)
  const dep = daysAgo(2, 11, 0)
  const rows: [string, string, string, string?][] = [
    [d(arr, { month: '2-digit', day: '2-digit', year: '2-digit' }), 'Room Charge — Deluxe King', '$229.00'],
    [d(arr, { month: '2-digit', day: '2-digit', year: '2-digit' }), 'MA State Occupancy Tax 5.7%', '$13.05'],
    [d(arr, { month: '2-digit', day: '2-digit', year: '2-digit' }), 'Boston City Occupancy Tax 6.5%', '$14.89'],
    [d(arr, { month: '2-digit', day: '2-digit', year: '2-digit' }), 'Convention Center Fee 2.75%', '$6.30'],
    [d(arr, { month: '2-digit', day: '2-digit', year: '2-digit' }), 'Destination Amenity Fee', '$10.96'],
    [d(arr, { month: '2-digit', day: '2-digit', year: '2-digit' }), 'In-Room Dining — Chk 20417', '$64.00'],
    [d(addDays(arr, 1), { month: '2-digit', day: '2-digit', year: '2-digit' }), 'Room Charge — Deluxe King', '$229.00'],
    [d(addDays(arr, 1), { month: '2-digit', day: '2-digit', year: '2-digit' }), 'MA State Occupancy Tax 5.7%', '$13.06'],
    [d(addDays(arr, 1), { month: '2-digit', day: '2-digit', year: '2-digit' }), 'Boston City Occupancy Tax 6.5%', '$14.88'],
    [d(addDays(arr, 1), { month: '2-digit', day: '2-digit', year: '2-digit' }), 'Convention Center Fee 2.75%', '$6.30'],
    [d(addDays(arr, 1), { month: '2-digit', day: '2-digit', year: '2-digit' }), 'Destination Amenity Fee', '$10.96'],
    [d(dep, { month: '2-digit', day: '2-digit', year: '2-digit' }), 'American Express ••••1007', '', '-$612.40'],
  ]
  return (
    <Page style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
      <div className="px-16 pt-12">
        <div className="flex justify-between items-center border-b-2 border-[#1C1C1C] pb-4">
          <div>
            <div className="text-[26px] tracking-[0.25em] font-semibold" style={{ fontFamily: 'Georgia, serif' }}>MARRIOTT</div>
            <div className="text-[10px] tracking-[0.4em] text-[#555]">HOTELS · BONVOY</div>
          </div>
          <div className="text-right text-[11.5px] leading-snug">
            <div className="font-semibold">Boston Marriott Copley Place</div>
            <div>110 Huntington Avenue, Boston, MA 02116</div>
            <div>T +1 617-236-5800 · marriott.com/boscp</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-10 mt-6 text-[12px]" style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}>
          <div className="space-y-1">
            <div className="font-semibold text-[13px]">MR ALEX MORGAN</div>
            <div>Northwind Global Inc.</div>
            <div>1 Federal St, Boston, MA 02110</div>
            <div className="mt-2">Marriott Bonvoy # •••••••4218 · Gold Elite</div>
          </div>
          <div className="grid grid-cols-2 gap-y-1">
            <span className="text-[#555]">Room</span><span>1412</span>
            <span className="text-[#555]">Arrival</span><F k="arrival">{d(arr, { month: '2-digit', day: '2-digit', year: '2-digit' })}</F>
            <span className="text-[#555]">Departure</span><F k="departure">{d(dep, { month: '2-digit', day: '2-digit', year: '2-digit' })}</F>
            <span className="text-[#555]">Nights</span><span>2</span>
            <span className="text-[#555]">Confirmation</span><F k="confirmation">84120577</F>
            <span className="text-[#555]">Folio No.</span><span>418827</span>
            <span className="text-[#555]">Rate</span><span>$229.00 · Corporate (NWG)</span>
          </div>
        </div>
        <table className="w-full mt-8 text-[12px]" style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}>
          <thead>
            <tr className="border-y border-[#1C1C1C] text-left">
              <th className="py-1.5 w-[90px]">Date</th>
              <th>Description</th>
              <th className="text-right w-[100px]">Charges</th>
              <th className="text-right w-[100px]">Credits</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([a, b, c, e], i) => (
              <tr key={i} className="border-b border-[#E5E5E5]">
                <td className="py-1.5">{a}</td>
                <td>{b}</td>
                <td className="text-right">{c}</td>
                <td className="text-right">{e}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex justify-end mt-4 text-[12.5px]" style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}>
          <div className="w-[300px] space-y-1">
            <div className="flex justify-between"><span>Room & Tax</span><span>$548.40</span></div>
            <div className="flex justify-between"><span>In-Room Dining</span><span>$64.00</span></div>
            <div className="flex justify-between font-bold border-t border-[#1C1C1C] pt-1"><span>Total Charges</span><F k="total">$612.40</F></div>
            <div className="flex justify-between"><span>Payments</span><span>-$612.40</span></div>
            <div className="flex justify-between font-bold"><span>Balance Due</span><span>$0.00</span></div>
          </div>
        </div>
        <div className="mt-12 text-[11px] text-[#555] leading-relaxed" style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}>
          I agree that my liability for this bill is not waived and I agree to be held personally liable in the event that the indicated person, company or association fails to pay any part or the full amount of these charges.
          <br />
          <br />
          Thank you for choosing Boston Marriott Copley Place. You earned 6,850 Marriott Bonvoy points on this stay.
        </div>
      </div>
    </Page>
  )
}

function Delta() {
  const out = daysAgo(5, 7, 5)
  const back = daysAgo(4, 17, 40)
  return (
    <Page>
      <div className="bg-[#003366] text-white px-16 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <svg width="44" height="30" viewBox="0 0 44 30"><path d="M22 0L44 30H0z" fill="#C8102E" /><path d="M22 8L36 28H8z" fill="#E31837" /><path d="M22 14l9 14H13z" fill="#003366" /></svg>
          <span className="text-[26px] font-bold tracking-[0.12em]">DELTA</span>
        </div>
        <div className="text-right text-[12px]">
          <div className="text-[18px] font-semibold">eTicket Receipt</div>
          <div>Issued {d(daysAgo(6, 8, 30))}</div>
        </div>
      </div>
      <div className="px-16 pt-7 text-[13px]">
        <div className="grid grid-cols-3 gap-6 border-b border-[#ccc] pb-5">
          <div><div className="text-[11px] text-[#666] uppercase">Passenger</div><div className="font-semibold mt-1">ALEX MORGAN</div><div className="text-[12px] text-[#555]">SkyMiles #••••7712 · Gold Medallion</div></div>
          <div><div className="text-[11px] text-[#666] uppercase">Confirmation #</div><F k="confirmation" className="font-bold text-[18px] mt-1 inline-block">GH7Q2K</F></div>
          <div><div className="text-[11px] text-[#666] uppercase">Ticket #</div><div className="font-semibold mt-1">0062 4419 83310</div></div>
        </div>
        <div className="mt-5 text-[15px] font-bold text-[#003366]">Flight Details</div>
        <table className="w-full mt-2 text-[12.5px]">
          <thead>
            <tr className="bg-[#F2F4F7] text-left text-[11px] uppercase text-[#444]">
              <th className="p-2">Date</th><th>Flight</th><th>Depart</th><th>Arrive</th><th>Class</th><th>Seat</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-[#e5e5e5]">
              <td className="p-2">{d(out, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</td>
              <td>DL 1188</td><td>BOSTON, MA (BOS) 7:05am</td><td>CHICAGO, IL (ORD) 8:58am</td><td>Main (V)</td><td>14C</td>
            </tr>
            <tr className="border-b border-[#e5e5e5]">
              <td className="p-2">{d(back, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</td>
              <td>DL 2301</td><td>CHICAGO, IL (ORD) 5:40pm</td><td>BOSTON, MA (BOS) 8:52pm</td><td>Main (V)</td><td>12D</td>
            </tr>
          </tbody>
        </table>
        <div className="mt-7 text-[15px] font-bold text-[#003366]">Fare Details</div>
        <div className="mt-2 w-[420px] space-y-1.5">
          {[
            ['Air Transportation Charges', '$412.56'],
            ['US Transportation Tax', '$43.74'],
            ['US Flight Segment Tax (2)', '$10.40'],
            ['September 11th Security Fee (2)', '$11.20'],
            ['Passenger Facility Charge (2)', '$9.00'],
          ].map(([a, b]) => (
            <div key={a} className="flex justify-between"><span>{a}</span><span>{b}</span></div>
          ))}
          <div className="flex justify-between font-semibold border-t border-[#ccc] pt-1.5"><span>Taxes, Fees & Charges</span><span>$74.34</span></div>
          <div className="flex justify-between font-bold text-[15px] pt-1"><span>Total</span><F k="total">$486.90</F></div>
        </div>
        <div className="mt-6 text-[12.5px]"><span className="text-[#666]">Form of payment:</span> American Express ending in 1007 · Corporate travel booking via Concur Travel (NWG-TRV-88213)</div>
        <div className="mt-10 text-[10.5px] text-[#777] leading-relaxed">
          This ticket is non-refundable unless the original ticket was purchased with a refundable fare. Changes to non-refundable tickets may be made in accordance with the fare rules. Baggage fees: first checked bag $35, second $45 on Main Cabin fares. Delta Air Lines, Inc. — P.O. Box 20980, Atlanta, GA 30320.
        </div>
      </div>
    </Page>
  )
}

function Dinner() {
  const day = daysAgo(3, 21, 41)
  const L = ({ a, b, bold }: { a: string; b: string; bold?: boolean }) => (
    <div className={`flex justify-between ${bold ? 'font-bold' : ''}`}><span>{a}</span><span>{b}</span></div>
  )
  return (
    <Page className="flex justify-center" style={{ background: '#fff' }}>
      <div className="w-[340px] mt-16 text-[12.5px] leading-[1.55]" style={{ fontFamily: '"Courier New", Courier, monospace' }}>
        <div className="text-center">
          <div className="text-[20px] font-bold tracking-wider" style={{ fontFamily: 'Georgia, serif' }}>OAK LONG BAR</div>
          <div className="tracking-[0.3em] text-[11px]">+ KITCHEN</div>
          <div className="mt-2">138 St James Ave</div>
          <div>Boston, MA 02116</div>
          <div>(617) 585-7222</div>
        </div>
        <div className="border-t border-dashed border-black my-3" />
        <L a="Check #4417" b="Table 12" />
        <L a="Server: Marisol" b="Guests: 4" />
        <L a={d(day, { month: '2-digit', day: '2-digit', year: 'numeric' })} b="9:41 PM" />
        <div className="border-t border-dashed border-black my-3" />
        {[
          ['1 Burrata & Heirloom Tomato', '18.00'],
          ['1 Yellowfin Tuna Crudo', '22.00'],
          ['1 Prime Steak Frites', '42.00'],
          ['1 Roasted Halibut', '38.00'],
          ['1 Truffle Fries', '8.00'],
          ['1 Crispy Brussels Sprouts', '14.00'],
          ['2 Sparkling Water (750ml)', '12.00'],
          ['2 Espresso', '6.00'],
        ].map(([a, b]) => (
          <L key={a} a={a} b={b} />
        ))}
        <div className="border-t border-dashed border-black my-3" />
        <L a="Food" b="142.00" />
        <L a="Beverage" b="18.00" />
        <L a="Subtotal" b="160.00" />
        <L a="Tax" b="11.45" />
        <L a="Tip" b="15.00" />
        <div className="border-t border-black my-2" />
        <div className="flex justify-between font-bold text-[15px]"><span>TOTAL</span><F k="total">$186.45</F></div>
        <div className="border-t border-dashed border-black my-3" />
        <L a="VISA ••••1007" b="186.45" />
        <div>Auth: 08231K  Entry: Contactless</div>
        <div className="mt-3">Note: <F k="note">Client dinner — Adatum Corporation (Elena Rossi, 2 guests)</F></div>
        <div className="text-center mt-6">Thank you for dining with us!</div>
        <div className="text-center text-[10.5px] mt-1">Powered by Toast · toasttab.com</div>
      </div>
    </Page>
  )
}

/* ───────────────────────── invoices ───────────────────────── */

function InvoiceShell({
  brand,
  color,
  from,
  no,
  date,
  due,
  po,
  terms,
  lines,
  subtotal,
  tax,
  total,
  remit,
  vendorNo,
  notes,
}: {
  brand: ReactNode
  color: string
  from: string[]
  no: string
  date: string
  due: string
  po: string
  terms: string
  lines: [string, string, string, string, string][]
  subtotal: string
  tax: string
  total: string
  remit: string[]
  vendorNo: string
  notes: string
}) {
  return (
    <Page>
      <div className="h-2" style={{ background: color }} />
      <div className="px-16 pt-10">
        <div className="flex justify-between items-start">
          <div>
            <F k="vendor">{brand}</F>
            <div className="mt-3 text-[11.5px] text-[#444] leading-[1.5]">
              {from.map((l) => (
                <div key={l}>{l}</div>
              ))}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[34px] font-light tracking-[0.2em]" style={{ color }}>INVOICE</div>
            <table className="ml-auto mt-3 text-[12px]">
              <tbody>
                <tr><td className="pr-4 text-[#666] text-left py-0.5">Invoice #</td><td className="font-semibold"><F k="invoiceNo">{no}</F></td></tr>
                <tr><td className="pr-4 text-[#666] text-left py-0.5">Invoice date</td><td><F k="invoiceDate">{date}</F></td></tr>
                <tr><td className="pr-4 text-[#666] text-left py-0.5">PO number</td><td className="font-semibold"><F k="po">{po}</F></td></tr>
                <tr><td className="pr-4 text-[#666] text-left py-0.5">Terms</td><td><F k="terms">{terms}</F></td></tr>
                <tr><td className="pr-4 text-[#666] text-left py-0.5">Due date</td><td className="font-semibold"><F k="dueDate">{due}</F></td></tr>
                <tr><td className="pr-4 text-[#666] text-left py-0.5">Customer ID</td><td>NWG-1010</td></tr>
              </tbody>
            </table>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-10 mt-8 text-[12px]">
          <div>
            <div className="text-[10.5px] font-bold uppercase tracking-wider mb-1.5" style={{ color }}>Bill to</div>
            <F k="billTo">
              <span className="block font-semibold">Northwind Global Inc.</span>
              <span className="block">Attn: Accounts Payable</span>
              <span className="block">1 Federal St, Floor 22</span>
              <span className="block">Boston, MA 02110</span>
              <span className="block">ap@northwind.com</span>
            </F>
          </div>
          <div>
            <div className="text-[10.5px] font-bold uppercase tracking-wider mb-1.5" style={{ color }}>Ship to / Service location</div>
            <div className="font-semibold">Northwind Global — Boston HQ</div>
            <div>1 Federal St, Floors 18–22</div>
            <div>Boston, MA 02110</div>
            <div>Requester: Alex Morgan</div>
          </div>
        </div>
        <table className="w-full mt-8 text-[12px]">
          <thead>
            <tr className="text-white text-left" style={{ background: color }}>
              <th className="py-2 px-2 w-[60px]">Item</th>
              <th className="px-2">Description</th>
              <th className="px-2 text-right w-[60px]">Qty</th>
              <th className="px-2 text-right w-[100px]">Unit price</th>
              <th className="px-2 text-right w-[110px]">Amount</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i} className={i % 2 ? 'bg-[#F7F7F7]' : ''}>
                <td className="py-2 px-2 text-[#555]">{l[0]}</td>
                <td className="px-2">{l[1]}</td>
                <td className="px-2 text-right">{l[2]}</td>
                <td className="px-2 text-right">{l[3]}</td>
                <td className="px-2 text-right">{l[4]}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex justify-between mt-6">
          <div className="w-[360px] text-[11px] text-[#555] leading-[1.55]">
            <div className="font-bold text-[#222] mb-1">Notes</div>
            {notes}
          </div>
          <div className="w-[260px] text-[12.5px] space-y-1.5">
            <div className="flex justify-between"><span>Subtotal</span><F k="subtotal">{subtotal}</F></div>
            <div className="flex justify-between"><span>Sales tax</span><span>{tax}</span></div>
            <div className="flex justify-between text-[16px] font-bold pt-2 border-t-2" style={{ borderColor: color }}><span>Amount due (USD)</span><F k="total">{total}</F></div>
          </div>
        </div>
        <div className="mt-10 p-4 rounded bg-[#F5F7FA] text-[11.5px] grid grid-cols-2 gap-6">
          <div>
            <div className="font-bold mb-1">Remit payment to</div>
            {remit.map((r) => (
              <div key={r}>{r}</div>
            ))}
          </div>
          <div>
            <div className="font-bold mb-1">Questions about this invoice?</div>
            <div>Vendor # {vendorNo} in your ERP</div>
            <div>Please reference the invoice number on all payments.</div>
            <div>Late payments are subject to a 1.5% monthly finance charge.</div>
          </div>
        </div>
      </div>
      <Foot left={`${no} · Thank you for your business.`} n={1} of={1} />
    </Page>
  )
}

function Fabrikam() {
  const inv = daysAgo(1, 9, 0)
  return (
    <InvoiceShell
      color="#0B5394"
      brand={
        <span className="flex items-center gap-2.5">
          <svg width="38" height="38" viewBox="0 0 38 38"><rect width="38" height="38" rx="6" fill="#0B5394" /><path d="M10 28V10h18v5H16v4h10v5H16v4z" fill="#fff" /></svg>
          <span className="block">
            <span className="block text-[22px] font-bold text-[#0B5394] leading-none">Fabrikam</span>
            <span className="block text-[11px] tracking-[0.3em] text-[#555] mt-1">SUPPLIES, INC.</span>
          </span>
        </span>
      }
      from={['4200 Commerce Street, Suite 300', 'Dallas, TX 75226', '+1 (214) 555-0100 · ar@fabrikam.com', 'Federal Tax ID 75-2849310']}
      no="INV-20931"
      date={d(inv)}
      due={d(addDays(inv, 30))}
      po="4500018234"
      terms="Net 30"
      lines={[
        ['FM-110', 'HVAC preventive maintenance — Boston HQ (October)', '1', '4,800.00', '4,800.00'],
        ['FM-205', 'Janitorial services — Boston HQ, 5 floors (October)', '1', '5,200.00', '5,200.00'],
        ['FM-318', 'Elevator inspection & service — passenger cars A/B', '2', '650.00', '1,300.00'],
        ['FM-402', 'Fire suppression system — quarterly test & certification', '1', '1,450.00', '1,450.00'],
        ['FM-517', 'Lighting retrofit — LED replacements, floor 20 (parts & labor)', '1', '1,500.00', '1,500.00'],
      ]}
      subtotal="$14,250.00"
      tax="$0.00"
      total="$14,250.00"
      remit={['Fabrikam Supplies, Inc.', 'Woodgrove Bank · ACH routing 111000025', 'Account ••••4471', 'or check to P.O. Box 660129, Dallas, TX 75266']}
      vendorNo="100482"
      notes="Services performed October 1–31 under Master Services Agreement FAB-MSA-2024-017. Facilities services are exempt from Massachusetts sales tax. Service tickets and technician logs are available on request."
    />
  )
}

function Litware() {
  const inv = hoursAgoDate(5)
  return (
    <InvoiceShell
      color="#6B2FA0"
      brand={
        <span className="flex items-center gap-2.5">
          <svg width="38" height="38" viewBox="0 0 38 38"><circle cx="19" cy="19" r="19" fill="#6B2FA0" /><path d="M12 10v18h14v-4h-9.5V10z" fill="#fff" /></svg>
          <span className="block text-[24px] font-semibold text-[#3B1A5A]">litware<span className="text-[#6B2FA0]">.</span></span>
        </span>
      }
      from={['1800 Larimer Street, 14th Floor', 'Denver, CO 80202', 'billing@litware.com · +1 (303) 555-0123']}
      no="LW-7781"
      date={d(inv)}
      due={d(addDays(inv, 45))}
      po="4500018390"
      terms="Net 45"
      lines={[
        ['LA-PRO', 'Litware Analytics Pro — Q4 license true-up (40 additional named users)', '40', '89.00', '3,560.00'],
        ['LA-SUP', 'Premium Support uplift — prorated Oct 15 – Dec 31', '40', '10.50', '420.00'],
      ]}
      subtotal="$3,980.00"
      tax="$0.00"
      total="$3,980.00"
      remit={['Litware Inc.', 'Woodgrove Bank · ACH routing 102000021', 'Account ••••9032']}
      vendorNo="100917"
      notes="True-up per Order Form LW-OF-2026-044, section 3.2 (quarterly reconciliation of named users). Subscription term ends December 31; renewal quote to follow separately."
    />
  )
}
const hoursAgoDate = (h: number) => new Date(Date.now() - h * 3600000).toISOString()

/* ───────────────────────── legal: Contoso MSA (redline) ───────────────────────── */

const Del = ({ children }: { children: ReactNode }) => <span className="text-[#C00000] line-through decoration-[#C00000]">{children}</span>
const Ins = ({ children }: { children: ReactNode }) => <span className="text-[#1F4FC1] underline decoration-[#1F4FC1]">{children}</span>

function Legal({ children, n, of, head }: { children: ReactNode; n: number; of: number; head?: boolean }) {
  return (
    <Page style={{ fontFamily: '"Times New Roman", Times, serif' }}>
      <div className="absolute top-6 right-10 text-[10px] text-[#C00000] font-sans">CONTOSO DRAFT {d(daysAgo(3), { month: '2-digit', day: '2-digit', year: 'numeric' })} — CONFIDENTIAL</div>
      <div className="px-[88px] pt-[72px] text-[13.5px] leading-[1.6] text-justify">
        {head && (
          <div className="text-center mb-6">
            <div className="text-[18px] font-bold tracking-wide">MASTER SERVICES AGREEMENT</div>
            <div className="text-[13px] mt-1">between Northwind Global Inc. and Contoso Ltd</div>
            <div className="text-[12px] mt-1">Agreement No. NWG-MSA-2026-0412</div>
          </div>
        )}
        {children}
      </div>
      <Foot left="Northwind / Contoso — Master Services Agreement" n={n} of={of} />
    </Page>
  )
}
const S = ({ t, children }: { t: string; children: ReactNode }) => (
  <div className="mb-4">
    <div className="font-bold mb-1">{t}</div>
    {children}
  </div>
)

function MSA1() {
  return (
    <Legal n={1} of={4} head>
      <p className="mb-4">
        This Master Services Agreement (the “<b>Agreement</b>”) is entered into as of the Effective Date by and between <b>Northwind Global Inc.</b>, a Delaware corporation with offices at 1 Federal St, Boston, MA 02110 (“<b>Northwind</b>”), and <b>Contoso Ltd</b>, a Washington corporation with offices at 500 Pine Street, Seattle, WA 98101 (“<b>Customer</b>”).
      </p>
      <S t="1. DEFINITIONS">
        <p>1.1 “Services” means the operations management services, subscriptions and related professional services described in one or more Order Forms executed under this Agreement. 1.2 “Order Form” means an ordering document referencing this Agreement and signed by both parties. 1.3 “Customer Data” means all data submitted by or on behalf of Customer to the Services.</p>
      </S>
      <S t="2. TERM AND RENEWAL">
        <p>
          2.1 This Agreement commences on the Effective Date and continues for an initial term of <F k="term"><Del>one (1) year</Del> <Ins>three (3) years</Ins> (the “Initial Term”). Thereafter it shall automatically renew for successive <Del>one-year</Del> <Ins>twelve (12) month</Ins> periods unless either party gives notice of non-renewal at least <Del>thirty (30)</Del> <Ins>ninety (90)</Ins> days before the end of the then-current term.</F>
        </p>
        <p className="mt-2">2.2 Each Order Form shall specify its own subscription term, which shall not extend this Agreement beyond its stated term except as necessary to complete the Order Form.</p>
      </S>
      <S t="3. FEES AND PAYMENT">
        <p>
          3.1 Customer shall pay all fees specified in each Order Form. Unless otherwise stated, fees are invoiced annually in advance and are due <Del>net thirty (30)</Del> <Ins>net forty-five (45)</Ins> days from the invoice date. 3.2 <Ins>Fees for the 400-seat Enterprise subscription are fixed for the Initial Term; thereafter any increase shall not exceed five percent (5%) per renewal term.</Ins> 3.3 Overdue amounts may accrue interest at the lesser of 1.0% per month or the maximum rate permitted by law.
        </p>
      </S>
      <S t="4. SERVICE LEVELS">
        <p>4.1 Northwind shall make the Services available 99.9% of the time in each calendar month, excluding scheduled maintenance announced at least 72 hours in advance. 4.2 If availability falls below the commitment, Customer shall be entitled to the service credits set out in Exhibit B, <Ins>which shall not exceed twenty-five percent (25%) of the monthly fees for the affected Services</Ins>.</p>
      </S>
    </Legal>
  )
}
function MSA2() {
  return (
    <Legal n={2} of={4}>
      <S t="5. CUSTOMER DATA AND SECURITY">
        <p>5.1 As between the parties, Customer owns all Customer Data. 5.2 Northwind shall maintain administrative, physical and technical safeguards consistent with ISO/IEC 27001 and SOC 2 Type II. 5.3 Northwind shall notify Customer of any Security Incident without undue delay and in any event within <Del>seventy-two (72)</Del> <Ins>forty-eight (48)</Ins> hours of becoming aware of it.</p>
      </S>
      <S t="6. CONFIDENTIALITY">
        <p>6.1 Each party shall protect the other party’s Confidential Information with at least the same degree of care it uses for its own, and no less than reasonable care. 6.2 These obligations survive for five (5) years following termination, and indefinitely for trade secrets.</p>
      </S>
      <S t="7. WARRANTIES">
        <p>7.1 Northwind warrants that the Services will perform materially in accordance with the Documentation. 7.2 EXCEPT AS EXPRESSLY PROVIDED HEREIN, NEITHER PARTY MAKES ANY WARRANTY OF ANY KIND, WHETHER EXPRESS, IMPLIED, STATUTORY OR OTHERWISE.</p>
      </S>
      <S t="8. INDEMNIFICATION">
        <p>8.1 Northwind shall defend Customer against any claim alleging that the Services infringe a third party’s intellectual property rights and indemnify Customer for resulting damages finally awarded. <Ins>8.2 Customer shall defend Northwind against claims arising from Customer Data or Customer’s use of the Services in violation of this Agreement.</Ins></p>
      </S>
      <S t="9. LIMITATION OF LIABILITY">
        <p>
          <F k="liability">9.1 EXCEPT FOR BREACHES OF SECTION 6 AND INDEMNIFICATION OBLIGATIONS, EACH PARTY’S AGGREGATE LIABILITY ARISING OUT OF THIS AGREEMENT SHALL NOT EXCEED THE FEES PAID OR PAYABLE BY CUSTOMER IN THE <Del>TWENTY-FOUR (24)</Del> <Ins>TWELVE (12)</Ins> MONTHS PRECEDING THE EVENT GIVING RISE TO THE CLAIM.</F>
        </p>
        <p className="mt-2">9.2 IN NO EVENT SHALL EITHER PARTY BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL OR PUNITIVE DAMAGES, OR LOSS OF PROFITS, REVENUE OR DATA, EVEN IF ADVISED OF THE POSSIBILITY THEREOF.</p>
      </S>
    </Legal>
  )
}
function MSA3() {
  return (
    <Legal n={3} of={4}>
      <S t="10. TERMINATION">
        <p>10.1 Either party may terminate this Agreement upon written notice if the other party materially breaches it and fails to cure within thirty (30) days of notice. 10.2 Upon termination, Northwind shall make Customer Data available for export for <Del>thirty (30)</Del> <Ins>sixty (60)</Ins> days, after which it shall be deleted in accordance with the Documentation.</p>
      </S>
      <S t="11. INSURANCE">
        <p>Northwind shall maintain commercial general liability insurance of not less than $2,000,000 per occurrence, cyber liability insurance of not less than <Ins>$10,000,000</Ins> <Del>$5,000,000</Del>, and workers’ compensation as required by law.</p>
      </S>
      <S t="12. GENERAL">
        <p>12.1 <b>Governing law.</b> This Agreement is governed by the laws of the <Del>Commonwealth of Massachusetts</Del> <Ins>State of New York</Ins>, without regard to its conflict of laws principles. 12.2 <b>Assignment.</b> Neither party may assign this Agreement without the other party’s prior written consent, except in connection with a merger or sale of substantially all assets. 12.3 <b>Notices.</b> Notices shall be in writing and delivered to the addresses set out above, with a copy to legal@northwind.com and legal@contoso.com. 12.4 <b>Entire agreement.</b> This Agreement, together with all Order Forms and Exhibits, constitutes the entire agreement between the parties.</p>
      </S>
      <S t="13. PUBLICITY">
        <p><Ins>Neither party shall use the other party’s name or logo in any marketing materials without prior written consent, which may be withdrawn at any time.</Ins></p>
      </S>
    </Legal>
  )
}
function MSA4() {
  const Sig = ({ party, name, title }: { party: string; name: string; title: string }) => (
    <div className="flex-1">
      <div className="font-bold mb-8">{party}</div>
      <div className="border-b border-black h-10" />
      <div className="mt-1 text-[12px]">Signature</div>
      <div className="mt-4 text-[12.5px]">Name: {name}</div>
      <div className="text-[12.5px]">Title: {title}</div>
      <div className="text-[12.5px]">Date: ____________________</div>
    </div>
  )
  return (
    <Legal n={4} of={4}>
      <p className="mb-8">IN WITNESS WHEREOF, the parties have caused this Agreement to be executed by their duly authorized representatives as of the Effective Date.</p>
      <div className="flex gap-16">
        <Sig party="NORTHWIND GLOBAL INC." name="Marcus Lee" title="Chief Financial Officer" />
        <Sig party="CONTOSO LTD" name="Kate Sullivan" title="Procurement Director" />
      </div>
      <div className="mt-16 font-bold">EXHIBIT B — SERVICE CREDITS</div>
      <table className="w-full mt-3 text-[12.5px] border border-black">
        <thead>
          <tr className="border-b border-black"><th className="p-1.5 text-left border-r border-black">Monthly availability</th><th className="p-1.5 text-left">Service credit</th></tr>
        </thead>
        <tbody>
          {[['99.0% – 99.9%', '5%'], ['98.0% – 99.0%', '10%'], ['95.0% – 98.0%', '15%'], ['Below 95.0%', '25%']].map(([a, b]) => (
            <tr key={a} className="border-b border-black/40"><td className="p-1.5 border-r border-black">{a}</td><td className="p-1.5">{b} of monthly fees</td></tr>
          ))}
        </tbody>
      </table>
    </Legal>
  )
}

/* ───────────────────────── Travel & Expense Policy ───────────────────────── */

function Policy({ children, n, cover }: { children: ReactNode; n: number; cover?: boolean }) {
  return (
    <Page>
      <div className="h-[6px] bg-[#0F6CBD]" />
      {!cover && (
        <div className="px-16 pt-8 flex justify-between text-[10.5px] text-[#666]">
          <span className="font-semibold text-[#0F6CBD]">NORTHWIND GLOBAL</span>
          <span>Travel & Expense Policy 2025 · POL-FIN-007 v4.1</span>
        </div>
      )}
      <div className="px-16 pt-6 text-[12.5px] leading-[1.6] text-[#222]">{children}</div>
      <Foot left="Internal — Northwind Global Inc." n={n} of={3} />
    </Page>
  )
}
const H = ({ children }: { children: ReactNode }) => <div className="text-[16px] font-bold text-[#0F3D6E] mt-5 mb-2">{children}</div>

function TP1() {
  return (
    <Policy n={1} cover>
      <div className="mt-24">
        <div className="text-[13px] font-semibold tracking-[0.25em] text-[#0F6CBD]">NORTHWIND GLOBAL</div>
        <div className="text-[40px] font-bold leading-tight text-[#0F3D6E] mt-3">Travel & Expense<br />Policy 2025</div>
        <div className="mt-4 text-[14px] text-[#555]">Applies to all employees and contractors of Northwind Global Inc. and its subsidiaries</div>
        <div className="mt-10 grid grid-cols-2 gap-y-2 w-[420px] text-[12.5px]">
          <span className="text-[#666]">Policy owner</span><span>Marcus Lee, Chief Financial Officer</span>
          <span className="text-[#666]">Policy ID</span><span>POL-FIN-007 · Version 4.1</span>
          <span className="text-[#666]">Effective</span><span>January 1, 2025</span>
          <span className="text-[#666]">Approved by</span><span>Finance Committee, Dec 12, 2024</span>
        </div>
        <H>1. Purpose</H>
        <p>This policy sets out how Northwind employees book business travel, which expenses are reimbursable, and how to submit them in SAP Concur. It is designed to keep employees safe and comfortable while managing company funds responsibly.</p>
        <H>2. Key principles</H>
        <ul className="list-disc pl-5 space-y-1">
          <li>Book all air, hotel and rail through Concur Travel at least 14 days in advance where possible.</li>
          <li>Use the Corporate American Express card for all business expenses.</li>
          <li>Submit expense reports within <b>30 days</b> of the expense date, with itemized receipts for any expense over <b>$25</b>.</li>
          <li>Expenses must be approved by your direct manager; reports over $5,000 also require VP approval.</li>
        </ul>
      </div>
    </Policy>
  )
}
function TP2() {
  return (
    <Policy n={2}>
      <H>3. Air travel</H>
      <p>Economy / Main Cabin is the standard class for flights under 6 hours. Premium economy is permitted for flights over 6 hours; business class requires COO approval for flights over 10 hours. Seat-selection fees up to $40 per segment are reimbursable.</p>
      <H>4. Lodging</H>
      <table className="w-full text-[12px] mt-2">
        <thead><tr className="bg-[#EBF3FC] text-left"><th className="p-1.5">City tier</th><th>Examples</th><th className="text-right pr-2">Nightly cap (excl. tax)</th></tr></thead>
        <tbody>
          {[['Tier 1', 'New York, San Francisco, Boston, London', '$275'], ['Tier 2', 'Chicago, Seattle, Austin, Milan', '$225'], ['Tier 3', 'All other locations', '$180']].map((r) => (
            <tr key={r[0]} className="border-b border-[#E5E5E5]"><td className="p-1.5">{r[0]}</td><td>{r[1]}</td><td className="text-right pr-2">{r[2]}</td></tr>
          ))}
        </tbody>
      </table>
      <H>5. Meals & entertainment</H>
      <p>
        <F k="meals">Individual meals while travelling are reimbursed up to a daily maximum of <b>$85</b> (breakfast $20, lunch $25, dinner $40). Client entertainment is reimbursable up to <b>$125 per attendee</b> including tax and tip; the names and companies of all attendees and the business purpose must be recorded on the expense.</F>
      </p>
      <p className="mt-2">Alcohol is reimbursable only as part of client entertainment and must not exceed 30% of the bill. Tips are reimbursable up to 20%.</p>
      <H>6. Ground transportation</H>
      <p>Use ride-share (UberX / Lyft standard), taxi or public transit. Premium ride-share tiers are not reimbursable. Personal car mileage is reimbursed at the IRS rate of $0.70 per mile. Airport parking is reimbursable at economy-lot rates.</p>
      <H>7. Non-reimbursable expenses</H>
      <ul className="list-disc pl-5 space-y-0.5">
        <li>In-room movies, minibar, spa and fitness charges</li>
        <li>Traffic or parking fines, lost-baggage fees</li>
        <li>Upgrades not approved in advance, airline club memberships</li>
        <li>Personal travel extensions and companion travel</li>
      </ul>
    </Policy>
  )
}
function TP3() {
  return (
    <Policy n={3}>
      <H>8. Submitting expenses</H>
      <ol className="list-decimal pl-5 space-y-1">
        <li>Forward receipts to <b>receipts@concur.com</b> from your work email, or upload them in the Concur mobile app.</li>
        <li>Create an expense report per trip, named “Trip — City — Month”.</li>
        <li>Allocate every line to an expense type and cost center (Operations: CC-4100).</li>
        <li>For client meals, list attendees with company names and the business purpose.</li>
        <li>Submit within 30 days. Late reports may be escalated to your VP.</li>
      </ol>
      <H>9. Approvals & audit</H>
      <p>Reports are approved by the employee’s manager and audited by Finance. Reports with missing receipts over $25 will be returned. Repeated policy exceptions are reported quarterly to the Finance Committee.</p>
      <H>10. Contacts</H>
      <table className="w-full text-[12px] mt-1">
        <tbody>
          {[['Expense questions', 'Emma Schultz, Accounts Payable', 'ap@northwind.com'], ['Policy exceptions', 'Sofia Martinez, Finance Manager', 'sofia.martinez@northwind.com'], ['Travel booking', 'Margie’s Travel (24/7)', '+1 (800) 555-0199']].map((r) => (
            <tr key={r[0]} className="border-b border-[#E5E5E5]"><td className="py-1.5 font-semibold w-[160px]">{r[0]}</td><td>{r[1]}</td><td className="text-[#0F6CBD]">{r[2]}</td></tr>
          ))}
        </tbody>
      </table>
      <div className="mt-10 p-4 bg-[#F5F7FA] rounded text-[11.5px] text-[#555]">Document history — v4.1 (Dec 2024): Tier 1 lodging cap raised to $275; client entertainment cap raised to $125 per attendee. v4.0 (Jan 2024): Concur mobile receipt capture made mandatory.</div>
    </Policy>
  )
}

/* ───────────────────────── generic fallback ───────────────────────── */

function Generic({ title }: { title: string }) {
  return (
    <Page>
      <div className="px-16 pt-16 text-[12.5px] leading-[1.7] text-[#222]">
        <div className="text-[11px] tracking-[0.25em] font-semibold text-[#0F6CBD]">NORTHWIND GLOBAL</div>
        <div className="text-[26px] font-bold mt-2">{title.replace(/\.pdf$/i, '')}</div>
        <div className="text-[#666] mt-1">Scanned document · {d(daysAgo(12))}</div>
        <div className="mt-8 space-y-3">
          {Array.from({ length: 14 }).map((_, i) => (
            <div key={i} className="h-2.5 rounded bg-[#E6E6E6]" style={{ width: `${70 + ((i * 37) % 30)}%` }} />
          ))}
        </div>
      </div>
    </Page>
  )
}

/* ───────────────────────── registry ───────────────────────── */

export interface DocDef {
  id: string
  name: string
  pages: (() => ReactNode)[]
  size: string
}

export const DOCS: Record<string, DocDef> = {
  'rcpt-uber': { id: 'rcpt-uber', name: 'Uber_Receipt_Oct.pdf', pages: [() => <Uber />], size: '84 KB' },
  'rcpt-marriott': { id: 'rcpt-marriott', name: 'Marriott_Folio_84120577.pdf', pages: [() => <Marriott />], size: '212 KB' },
  'rcpt-delta': { id: 'rcpt-delta', name: 'Delta_eTicket_GH7Q2K.pdf', pages: [() => <Delta />], size: '156 KB' },
  'rcpt-dinner': { id: 'rcpt-dinner', name: 'Receipt_OakLongBar_4417.pdf', pages: [() => <Dinner />], size: '48 KB' },
  'inv-fabrikam': { id: 'inv-fabrikam', name: 'INV-20931.pdf', pages: [() => <Fabrikam />], size: '128 KB' },
  'inv-litware': { id: 'inv-litware', name: 'LW-7781.pdf', pages: [() => <Litware />], size: '96 KB' },
  'contoso-msa': { id: 'contoso-msa', name: 'Contoso MSA - Redline.pdf', pages: [() => <MSA1 />, () => <MSA2 />, () => <MSA3 />, () => <MSA4 />], size: '1.1 MB' },
  'travel-policy': { id: 'travel-policy', name: 'Travel Policy 2025.pdf', pages: [() => <TP1 />, () => <TP2 />, () => <TP3 />], size: '420 KB' },
}

export function getDoc(id: string, fileName?: string): DocDef {
  return DOCS[id] ?? { id, name: fileName ?? `${id}.pdf`, pages: [() => <Generic title={fileName ?? id} />], size: '120 KB' }
}

/** fields the agent / workflows can read (invoice extraction) */
export function invoiceFields(id: 'inv-fabrikam' | 'inv-litware') {
  if (id === 'inv-fabrikam') {
    const inv = daysAgo(1, 9, 0)
    return { vendor: 'Fabrikam Supplies, Inc.', invoiceNo: 'INV-20931', po: '4500018234', amount: '$14,250.00', terms: 'Net 30', invoiceDate: d(inv), dueDate: d(addDays(inv, 30)) }
  }
  const inv = hoursAgoDate(5)
  return { vendor: 'Litware Inc.', invoiceNo: 'LW-7781', po: '4500018390', amount: '$3,980.00', terms: 'Net 45', invoiceDate: d(inv), dueDate: d(addDays(inv, 45)) }
}
