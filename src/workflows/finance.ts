import type { Workflow } from '@/agent/types'
import { db } from '@/db/db'
import { isoDate, daysAgo } from '@/data/time'
import { person } from '@/data/people'
import { newestEmail } from './core'
import { PENDING_SAP_INVOICES } from '@/apps/sap/data'

const longDate = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
const plusDays = (iso: string, n: number) => new Date(new Date(iso).getTime() + n * 86400000)

async function sendMail(a: any, to: string, subject: string, body: string) {
  await a.click('@outlook-new-mail', { label: 'New mail' })
  await a.type('@outlook-compose-to', to, { fast: true, label: 'To' })
  await a.press('Enter')
  await a.type('@outlook-compose-subject', subject, { label: 'Subject', fast: true })
  await a.type('@outlook-compose-body', body, { label: 'message body', fast: true })
  await a.click('@outlook-send', { label: 'Send' })
  await a.wait(900)
}

export const workflows: Workflow[] = [
  /* ───────────────────────── Concur ───────────────────────── */
  {
    id: 'concur-expense-report',
    title: 'File my expense report in Concur',
    description: 'Finds your trip receipts in Outlook, builds a policy-compliant Concur report from the matching Amex transactions, and submits it to your manager.',
    category: 'Finance',
    apps: ['outlook', 'concur'],
    timeSaved: '35 min',
    featured: true,
    keywords: ['expense', 'expenses', 'expense report', 'concur', 'receipts', 'reimbursement', 'trip', 'amex', 'travel'],
    examples: ['Do my expense report for last week’s trip', 'Expense my receipts in Concur', 'Submit my Chicago trip expenses'],
    inputs: [
      { key: 'reportName', label: 'Report name', type: 'text', default: 'Chicago Client Visit — Oct' },
      { key: 'purpose', label: 'Business purpose', type: 'text', default: 'Adatum Corporation client visit & operations walkthrough' },
    ],
    nudge: () => {
      const n = db.get<any>('concur.transactions').filter((t) => t.status === 'available').length
      return n ? `${n} receipts in your inbox haven’t been expensed yet` : null
    },
    plan: ['Collect the trip receipts from Outlook', 'Create the expense report in Concur', 'Add the 4 Amex card transactions', { text: 'Code each expense to policy (types, attendees, itemization)', via: 'cua', model: 'large', why: 'Policy judgement — hotel itemization, per-night caps, client-dinner attendees — routed to the large model.' }, 'Submit the report to Priya for approval', 'Let Priya know it’s in her queue'],
    async run(a, inp) {
      a.step(0)
      await a.open('outlook')
      await a.waitFor('@outlook-search', 20000)
      await a.type('@outlook-search', '1007', { label: 'Search', clear: true })
      await a.press('Enter')
      await a.wait(600)
      for (const id of ['em-rcpt-dinner', 'em-rcpt-marriott']) {
        if (a.exists(`@outlook-email-${id}`)) {
          await a.click(`@outlook-email-${id}`)
          await a.wait(400)
        }
      }
      await a.think('Four receipts on the corporate card ••••1007: Delta BOS⇄ORD $486.90, Marriott Copley 2 nights $612.40, Oak Long Bar client dinner $186.45, Uber from Logan $48.20 — $1,333.95 in total.', 1600)

      a.step(1)
      await a.open('concur')
      await a.click('@concur-create-report', { label: 'Create New Report' })
      await a.type('@concur-report-name', inp.reportName)
      await a.type('@concur-report-purpose', inp.purpose)
      await a.click('@concur-create-submit', { label: 'Create Report' })

      a.step(2)
      await a.click('@concur-add-expense', { label: 'Add Expense' })
      await a.click('@concur-add-select-all', { label: 'Select all available expenses' })
      await a.think('All four card transactions are here with e-receipts already attached — no manual receipt uploads needed.', 1000)
      await a.click('@concur-add-to-report', { label: 'Add To Report' })
      await a.wait(500)

      a.step(3)
      await a.think('Delta was auto-coded to Airfare and Uber to Taxi/Rideshare — both clean. The hotel and the dinner need work.', 1100)
      // Hotel
      await a.click('@concur-exp-row-ctx-marriott', { label: 'Boston Marriott Copley Place $612.40' })
      await a.think('Hotel needs itemization: 2 nights, room + tax $548.40 ($274.20/night, under the $325 cap) plus $64.00 in-room dining.', 1400)
      await a.type('@concur-exp-checkin', isoDate(daysAgo(4)), { label: 'Check-in Date' })
      await a.type('@concur-exp-checkout', isoDate(daysAgo(2)), { label: 'Check-out Date' })
      await a.type('@concur-exp-comment', 'Folio #84120577: room & tax $548.40 (2 nights) + in-room dining $64.00.', { fast: true })
      await a.click('@concur-exp-save', { label: 'Save Expense' })
      // Dinner
      await a.click('@concur-exp-row-ctx-oak', { label: 'Oak Long Bar + Kitchen $186.45' })
      await a.think('The card feed coded the dinner as Individual Meals, which would breach the $75 limit. The receipt shows a client dinner for 4 with Adatum — it’s a Business Meal with Elena and her colleague.', 1800)
      await a.click('@concur-exp-type', { label: 'Expense Type' })
      await a.click('@concur-exp-type-opt-business-meals', { label: 'Business Meals' })
      await a.type('@concur-exp-purpose', 'Client dinner — Adatum Corporation', { fast: true })
      await a.type('@concur-attendee-search', 'Elena', { label: 'Attendees' })
      await a.click('@concur-attendee-opt-elena', { label: 'Elena Rossi (Adatum Corporation)' })
      await a.type('@concur-attendee-search', 'Marco Bianchi', { label: 'Attendees' })
      await a.click('@concur-attendee-new', { label: 'Add Business Guest “Marco Bianchi”' })
      await a.type('@concur-exp-comment', 'Dinner with Adatum after the operations walkthrough. Check #4417.', { fast: true })
      await a.click('@concur-exp-save', { label: 'Save Expense' })

      a.step(4)
      await a.think('No alerts left on any line. Report total $1,333.95, all on the company card — nothing due to me.', 1200)
      await a.click('@concur-submit', { label: 'Submit Report' })
      await a.click('@concur-accept-submit', { label: 'Accept & Submit' })
      await a.wait(800)
      await a.click('@concur-submitted-close', { label: 'Close' })
      const rep = db.get<any>('concur.reports').filter((r) => r.name === inp.reportName).sort((x, y) => +new Date(y.createdAt) - +new Date(x.createdAt))[0]

      a.step(5)
      await a.open('outlook')
      await sendMail(
        a,
        person('priya').email,
        `Expense report submitted: ${inp.reportName}`,
        `Hi Priya,\n\nI’ve submitted my Concur report “${inp.reportName}” ($1,333.95) — it’s in your approval queue.\n\n• Airfare — Delta BOS⇄ORD: $486.90\n• Hotel — Marriott Copley, 2 nights: $612.40 (itemized)\n• Business meal — Adatum client dinner: $186.45\n• Taxi — Uber from Logan: $48.20\n\nEverything is on the corporate card with e-receipts attached and within policy.\n\nThanks!\nAlex`,
      )
      const mail = newestEmail((e) => e.folder === 'sent' && e.subject.startsWith('Expense report submitted'))
      return {
        summary: `Created “${inp.reportName}” in Concur with 4 card expenses ($1,333.95), recoded the dinner as a Business Meal with Adatum attendees, itemized the hotel, and submitted it to Priya Raman.`,
        outputs: [
          { label: 'Open the report in Concur', appId: 'concur', params: { reportId: rep?.id } },
          { label: 'View the note to Priya', appId: 'outlook', params: { view: 'mail', folder: 'sent', emailId: mail } },
        ],
        metrics: [
          { label: 'Expenses filed', value: '4' },
          { label: 'Report total', value: '$1,333.95' },
          { label: 'Policy alerts fixed', value: '2' },
        ],
      }
    },
  },

  /* ───────────────────────── SAP ───────────────────────── */
  {
    id: 'sap-post-supplier-invoice',
    title: 'Post supplier invoices in SAP',
    description: 'Reads vendor invoices from your inbox, 3-way matches them to the purchase orders in SAP S/4HANA, posts them and confirms the payment date to each supplier.',
    category: 'Finance',
    apps: ['outlook', 'acrobat', 'sap'],
    timeSaved: '40 min',
    featured: true,
    keywords: ['invoice', 'invoices', 'sap', 'supplier', 'vendor', 'post', 'accounts payable', 'ap', 'fabrikam', 'litware', 'purchase order', 'three-way match'],
    examples: ['Post the Fabrikam invoice in SAP', 'Process the vendor invoices in my inbox', 'Enter supplier invoices into S/4HANA'],
    nudge: () => {
      const n = PENDING_SAP_INVOICES.filter((p) => !db.get<any>('sap.invoices').some((i) => i.supplierId === p.supplierId && i.reference === p.reference)).length
      return n ? `${n} vendor invoices in your inbox are waiting to be posted in SAP` : null
    },
    plan: [
      { text: 'Pull new vendor invoices from the AP inbox', via: 'api', why: 'Microsoft Graph is connected — listing mail and attachments needs no screen.' },
      { text: 'Read the Fabrikam invoice PDF', via: 'cua', model: 'large', why: 'Free-form supplier PDF with line items and terms — the hardest read in the task, so it goes to the large model.' },
      { text: 'Fetch the POs and goods receipts from SAP', via: 'api', why: 'SAP OData is read-enabled for this tenant — exact data in milliseconds.' },
      { text: '3-way match invoice ↔ PO ↔ receipt', via: 'code', why: 'Comparing amounts and quantities is arithmetic — plain code, no model, no guesswork.' },
      { text: 'Post the Fabrikam invoice against PO 4500018234', via: 'cua', model: 'small', why: 'Invoice posting isn’t exposed by API here, so the agent uses the Fiori app — same path and controls as a person. Routine screens → small model.' },
      { text: 'Post the Litware invoice against PO 4500018390', via: 'cua', model: 'small', why: 'Same screens as the previous step — the small model handles it.' },
      { text: 'Confirm payment dates to the suppliers', via: 'cua', model: 'small', why: 'Replies inside the original Outlook threads so suppliers keep the context.' },
    ],
    async run(a) {
      const posted: Record<string, string> = {}
      const jobs = [
        { emailId: 'em-invoice-fabrikam', supplier: 'Fabrikam', supplierId: '10300045', ref: 'INV-20931', amount: '14250.00', po: '4500018234', days: 30 },
        { emailId: 'em-invoice-litware', supplier: 'Litware', supplierId: '10300112', ref: 'LW-7781', amount: '3980.00', po: '4500018390', days: 45 },
      ].filter((j) => !db.get<any>('sap.invoices').some((i) => i.supplierId === j.supplierId && i.reference === j.ref))
      const invDate = isoDate(daysAgo(1))

      a.step(0)
      await a.api(
        "GET /graph/v1.0/me/mailFolders/inbox/messages?$filter=hasAttachments eq true and contains(subject,'Invoice')",
        () => ['em-invoice-fabrikam', 'em-invoice-litware'].map((id) => db.find<any>('outlook.emails', id)).filter(Boolean),
        { appId: 'outlook', result: (r) => `${r.length} vendor invoices with PDF attachments: Fabrikam INV-20931, Litware LW-7781` },
      )

      a.step(1)
      await a.open('outlook')
      await a.waitFor('@outlook-search', 20000)
      await a.click('@outlook-folder-inbox', { label: 'Inbox' })
      await a.click('@outlook-email-em-invoice-fabrikam', { label: 'Invoice INV-20931 — Mike Harrington' })
      await a.click('@outlook-attachment-em-invoice-fabrikam-0', { label: 'INV-20931.pdf' })
      await a.wait(1600)
      await a.think('INV-20931 from Fabrikam Supplies: $14,250.00 for October facilities services under PO 4500018234 — maintenance $9,500, HVAC visit $3,250, janitorial supplies $1,500. No sales tax; terms Net 30.', 2000)
      await a.close('acrobat')

      a.step(2)
      const pos = await a.api(
        "GET /sap/opu/odata/sap/API_PURCHASEORDER_PROCESS_SRV/A_PurchaseOrder?$filter=PurchaseOrder eq '4500018234' or PurchaseOrder eq '4500018390'&$expand=to_PurchaseOrderItem",
        () => ['4500018234', '4500018390'].map((id) => db.find<any>('sap.pos', id)).filter(Boolean),
        { appId: 'sap', result: (r) => `${r.length} purchase orders, ${r.reduce((n: number, p: any) => n + (p.items?.length ?? 0), 0)} line items` },
      )
      await a.api(
        "GET /sap/opu/odata/sap/API_MATERIAL_DOCUMENT_SRV/A_MaterialDocumentItem?$filter=PurchaseOrder in ('4500018234','4500018390')",
        () => pos,
        { appId: 'sap', result: () => 'Goods receipts / service entry sheets posted for every PO line' },
      )

      a.step(3)
      const invoices = [
        { ref: 'INV-20931', po: '4500018234', amount: 14250 },
        { ref: 'LW-7781', po: '4500018390', amount: 3980 },
      ]
      await a.code(
        'match(invoice.gross, po.net, receipt.qty) — tolerance ±0.5%',
        () => invoices.map((inv) => {
          const po = pos.find((p: any) => p.id === inv.po)
          const net = po?.netAmount ?? inv.amount
          return { ...inv, variance: Math.round((inv.amount - net) * 100) / 100 }
        }),
        { result: (r) => `${r.filter((x) => Math.abs(x.variance) < 0.01).length}/${r.length} matched · variance $${r.reduce((n, x) => n + Math.abs(x.variance), 0).toFixed(2)} · no exceptions` },
      )

      for (const j of jobs) {
        const step = j.supplierId === '10300045' ? 4 : 5
        a.step(step)
        await a.open('sap')
        if (a.exists('@sap-home')) await a.click('@sap-home', { label: 'Home' })
        await a.click('@sap-app-create-invoice', { label: 'Create Supplier Invoice' })
        await a.type('@sap-ci-supplier', j.supplier, { label: 'Invoicing Party' })
        await a.click(`@sap-ci-supplier-opt-${j.supplierId}`)
        await a.type('@sap-ci-invoice-date', invDate, { label: 'Invoice Date' })
        await a.type('@sap-ci-reference', j.ref, { label: 'Reference' })
        await a.type('@sap-ci-gross', j.amount, { label: 'Gross Invoice Amount' })
        await a.type('@sap-ci-po', j.po, { label: 'Purchase Order' })
        await a.press('Enter')
        await a.wait(700)
        const po = db.find<any>('sap.pos', j.po)
        await a.think(
          j.po === '4500018234'
            ? `PO ${j.po} loaded 3 items totalling $14,250.00; service entry sheets are posted for all of them. Balance is 0.00 — the invoice matches PO and receipt exactly.`
            : `PO ${j.po}: 20 Analytics Pro licenses × $199.00 = $${po?.netAmount?.toLocaleString('en-US', { minimumFractionDigits: 2 })}. Balance 0.00, terms ${'NT45'} — matches LW-7781.`,
          1600,
        )
        if (step === 4) {
          await a.click('@sap-ci-simulate', { label: 'Simulate' })
          await a.wait(900)
          await a.think('Simulation: credit Fabrikam (vendor 10300045) $14,250.00, debit GR/IR clearing 211100 on three lines. No errors.', 1300)
          await a.click('@sap-ci-simulate-close', { label: 'Close' })
        }
        await a.click('@sap-ci-post', { label: 'Post' })
        await a.waitFor('@sap-ci-docnum')
        posted[j.ref] = a.text('@sap-ci-docnum')
        a.log(`Posted supplier invoice ${posted[j.ref]} for ${j.ref}`, 'success')
        await a.click('@sap-ci-display', { label: 'Display Supplier Invoice' })
        await a.wait(900)
      }

      a.step(6)
      const fab = db.get<any>('sap.invoices').find((i) => i.reference === 'INV-20931')
      const lit = db.get<any>('sap.invoices').find((i) => i.reference === 'LW-7781')
      const payFab = longDate(plusDays(daysAgo(1), 30))
      const payLit = longDate(plusDays(daysAgo(1), 45))
      await a.think(`Net 30 from the ${new Date(daysAgo(1)).toLocaleDateString('en-US')} invoice date puts Fabrikam’s payment on ${payFab}; Litware (Net 45) on ${payLit}.`, 1300)
      await a.open('outlook')
      await a.click('@outlook-email-em-invoice-fabrikam', { label: 'Invoice INV-20931' })
      await a.click('@outlook-reply', { label: 'Reply' })
      await a.type(
        '@outlook-compose-body',
        `Hi Mike,\n\nThanks — invoice INV-20931 ($14,250.00) has been matched to PO 4500018234 and posted in SAP as document ${fab?.id ?? posted['INV-20931']}.\n\nPer your Net 30 terms it is scheduled for payment by ACH on ${payFab}.\n\nBest,\nAlex`,
        { label: 'message body' },
      )
      await a.click('@outlook-send', { label: 'Send' })
      await a.wait(900)
      if (lit) {
        await a.click('@outlook-email-em-invoice-litware', { label: 'Litware Inc. — Invoice LW-7781' })
        await a.click('@outlook-reply', { label: 'Reply' })
        await a.type('@outlook-compose-body', `Hi Sam,\n\nInvoice LW-7781 ($3,980.00) is posted against PO 4500018390 as SAP document ${lit.id}. Payment is scheduled for ${payLit} (Net 45).\n\nThanks,\nAlex`, { label: 'message body', fast: true })
        await a.click('@outlook-send', { label: 'Send' })
        await a.wait(900)
      }
      const reply = newestEmail((e) => e.folder === 'sent' && e.replyTo === 'em-invoice-fabrikam')
      return {
        summary: `Posted ${Object.keys(posted).length || 2} supplier invoices in SAP S/4HANA after a clean 3-way match: Fabrikam INV-20931 ($14,250.00) as ${fab?.id}${lit ? ` and Litware LW-7781 ($3,980.00) as ${lit.id}` : ''}. Confirmed payment dates to both suppliers.`,
        outputs: [
          { label: `Open supplier invoice ${fab?.id ?? ''} in SAP`, appId: 'sap', params: { invoiceId: fab?.id } },
          ...(lit ? [{ label: `Open supplier invoice ${lit.id} in SAP`, appId: 'sap', params: { invoiceId: lit.id } }] : []),
          { label: 'View the reply to Mike', appId: 'outlook', params: { view: 'mail', folder: 'sent', emailId: reply } },
        ],
        metrics: [
          { label: 'Invoices posted', value: String(lit ? 2 : 1) },
          { label: 'Amount posted', value: lit ? '$18,230.00' : '$14,250.00' },
          { label: 'Match exceptions', value: '0' },
        ],
      }
    },
  },

  /* ───────────────────────── Coupa ───────────────────────── */
  {
    id: 'coupa-purchase-requisition',
    title: 'Order laptops for new hires in Coupa',
    description: 'Shops the Dell punchout at contract prices, builds the requisition with the right commodity, cost center and justification, and routes it for approval.',
    category: 'Procurement',
    apps: ['outlook', 'coupa'],
    timeSaved: '20 min',
    keywords: ['coupa', 'requisition', 'purchase', 'buy', 'order', 'laptop', 'laptops', 'monitor', 'new hire', 'hardware', 'procurement', 'dell'],
    examples: ['Order 3 laptops and monitors for the new hires', 'Raise a Coupa requisition for Dell laptops'],
    inputs: [{ key: 'qty', label: 'Number of new hires', type: 'number', default: 3 }],
    nudge: () => (db.get<any>('coupa.requisitions').some((r) => r.createdBy === 'hworker') ? null : 'James asked for laptops for 3 new Ops hires'),
    plan: ['Read James’s hardware request', 'Shop the Dell punchout for the standard kit', 'Fill the requisition (ship-to, need-by, cost center)', 'Submit for approval and reply to James'],
    async run(a, inp) {
      const qty = String(inp.qty ?? 3)
      a.step(0)
      await a.open('outlook')
      await a.waitFor('@outlook-search', 20000)
      await a.click('@outlook-folder-inbox', { label: 'Inbox' })
      await a.click('@outlook-email-em-james-laptops', { label: 'Hardware for the November Ops hires' })
      await a.think(`Standard kit for ${qty} Operations Analysts: Dell Latitude 7450 + 27" UltraSharp. Jordan starts Monday, the other two Nov 3 — need-by must be before Monday.`, 1600)

      a.step(1)
      await a.open('coupa')
      await a.click('@coupa-punchout-dell', { label: 'Dell Premier punchout' })
      await a.type('@coupa-qty-cpi-lat7450', qty, { clear: true, label: 'Quantity' })
      await a.click('@coupa-add-cpi-lat7450', { label: 'Add Latitude 7450 to cart' })
      await a.type('@coupa-qty-cpi-u2724d', qty, { clear: true, label: 'Quantity' })
      await a.click('@coupa-add-cpi-u2724d', { label: 'Add UltraSharp U2724D to cart' })
      await a.click('@coupa-cart', { label: 'Cart' })
      const total = Number(qty) * (1689 + 449.99)
      await a.think(`Cart total $${total.toLocaleString('en-US', { minimumFractionDigits: 2 })} at Dell contract pricing. Over $5,000, so Finance will be added to the approval chain after Priya and IT.`, 1500)

      a.step(2)
      await a.click('@coupa-checkout', { label: 'Checkout' })
      await a.type('@coupa-req-title', `New hire laptops + monitors — Operations (${qty})`)
      const needBy = new Date()
      needBy.setDate(needBy.getDate() + ((8 - needBy.getDay()) % 7 || 7) - 3)
      await a.type('@coupa-req-needby', isoDate(needBy), { label: 'Need-by date' })
      await a.select('@coupa-req-commodity', 'IT Hardware', { label: 'Commodity' })
      await a.select('@coupa-req-costcenter', '6105 — Operations', { label: 'Cost center' })
      await a.type('@coupa-req-justification', `Standard IT kit for ${qty} new Operations Analysts (Jordan Ellis, starting Monday, plus two hires starting Nov 3). IT-approved standard configuration: Dell Latitude 7450 + Dell UltraSharp 27" U2724D. Budgeted in the FY26 Ops headcount plan.`)

      a.step(3)
      await a.click('@coupa-req-submit', { label: 'Submit for Approval' })
      await a.wait(900)
      const req = db.get<any>('coupa.requisitions').find((r) => r.createdBy === 'hworker')
      await a.open('outlook')
      await a.click('@outlook-email-em-james-laptops')
      await a.click('@outlook-reply', { label: 'Reply' })
      await a.type('@outlook-compose-body', `Hi James,\n\nDone — Coupa requisition #${req?.number} for ${qty} × Latitude 7450 + ${qty} × UltraSharp 27" ($${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}) is submitted and with Priya → Grace → Sofia for approval. Requested delivery to Boston HQ by ${needBy.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}.\n\nAlex`, { label: 'message body', fast: true })
      await a.click('@outlook-send', { label: 'Send' })
      await a.wait(800)
      return {
        summary: `Submitted Coupa requisition #${req?.number} for ${qty} Dell Latitude 7450 laptops and ${qty} UltraSharp monitors ($${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}), routed to Priya Raman, Grace Kim and Sofia Martinez.`,
        outputs: [{ label: `Open requisition #${req?.number} in Coupa`, appId: 'coupa', params: { requisitionId: req?.id } }],
        metrics: [{ label: 'Line items', value: '2' }, { label: 'Total', value: `$${Math.round(total).toLocaleString('en-US')}` }, { label: 'Approvers', value: String(req?.approvals?.length ?? 3) }],
      }
    },
  },

  /* ───────────────────────── NetSuite ───────────────────────── */
  {
    id: 'netsuite-bank-reconciliation',
    title: 'Reconcile the operating bank account in NetSuite',
    description: 'Matches the Woodgrove bank feed to NetSuite transactions, books the fees and interest that hit the bank, and explains the remaining variance to Finance.',
    category: 'Finance',
    apps: ['outlook', 'netsuite'],
    timeSaved: '1h 15m',
    keywords: ['netsuite', 'bank', 'reconcile', 'reconciliation', 'month end', 'close', 'journal entry', 'bank feed', 'match', 'accrual'],
    examples: ['Do the October bank rec in NetSuite', 'Reconcile the operating account', 'Help with month-end close'],
    nudge: () => (db.get<any>('netsuite.bankLines').some((b) => b.status !== 'reconciled') ? 'Sofia needs the Woodgrove bank rec for the October close' : null),
    plan: ['Read Sofia’s close request', 'Match bank lines to NetSuite transactions', 'Book bank fees and interest with a journal entry', 'Match the new entries and submit the reconciliation', 'Send Sofia the variance summary'],
    async run(a) {
      a.step(0)
      await a.open('outlook')
      await a.waitFor('@outlook-search', 20000)
      await a.click('@outlook-folder-inbox', { label: 'Inbox' })
      await a.click('@outlook-email-em-sofia-bankrec', { label: 'October close — Woodgrove operating account rec' })

      a.step(1)
      await a.open('netsuite')
      await a.waitFor('@ns-reminder-bank', 20000)
      await a.click('@ns-reminder-bank', { label: 'Bank Account Lines to Reconcile' })
      await a.think('11 bank lines vs. 11 register transactions. Matching on amount and date first.', 1200)
      const pairs = [['nbl-1', 'nbt-1'], ['nbl-2', 'nbt-2'], ['nbl-3', 'nbt-3'], ['nbl-4', 'nbt-4'], ['nbl-5', 'nbt-5'], ['nbl-6', 'nbt-6'], ['nbl-7', 'nbt-7'], ['nbl-9', 'nbt-9']]
      for (const [b, t] of pairs) {
        if (db.find<any>('netsuite.bankLines', b)?.status !== 'unmatched') continue
        await a.click(`@ns-bank-${b}`)
        await a.click(`@ns-txn-${t}`)
        await a.click('@ns-match', { label: 'Match' })
      }
      await a.think('Tailspin Toys: bank shows $7,980.00, NetSuite has $7,890.00. A $90.00 difference that divides evenly by 9 is a classic transposition — the payment was probably keyed wrong. Leaving it unmatched for Sofia.', 2200)
      await a.think('Two bank-only items: $85.00 monthly service fee and $312.47 interest credit — neither is booked yet. Check 10240 ($2,316.40) and deposit DEP-0921 ($5,400.00) are simply in transit.', 1800)

      a.step(2)
      await a.click('@ns-tab-transactions', { label: 'Transactions' })
      await a.click('@ns-menu-make-je', { label: 'Make Journal Entries' })
      await a.type('@ns-je-memo-header', 'October bank fees & interest — Woodgrove ••••4410')
      const lines: [string, string, string, string][] = [
        ['6810 Bank Service Charges', '85.00', '', 'Woodgrove monthly service fee — Oct'],
        ['1010 Woodgrove Operating Checking', '', '85.00', 'Woodgrove monthly service fee — Oct'],
        ['1010 Woodgrove Operating Checking', '312.47', '', 'Interest credit — Oct'],
        ['8100 Interest Income', '', '312.47', 'Interest credit — Oct'],
      ]
      for (const [acc, dr, cr, memo] of lines) {
        await a.select('@ns-je-account', acc, { label: 'Account' })
        if (dr) await a.type('@ns-je-debit', dr, { label: 'Debit', fast: true })
        if (cr) await a.type('@ns-je-credit', cr, { label: 'Credit', fast: true })
        await a.type('@ns-je-memo', memo, { label: 'Memo', fast: true })
        await a.click('@ns-je-line-add', { label: 'Add' })
      }
      await a.click('@ns-je-save', { label: 'Save' })
      await a.waitFor('@ns-je-title')
      const je = db.get<any>('netsuite.journals').find((j) => j.createdBy === 'hworker')
      a.log(`Saved journal ${je?.number} ($397.47, in balance)`, 'success')

      a.step(3)
      await a.click('@ns-tab-transactions', { label: 'Transactions' })
      await a.click('@ns-menu-match', { label: 'Match Bank Data' })
      const newTx = db.get<any>('netsuite.bookTxns').filter((t) => t.number === je?.number)
      const fee = newTx.find((t) => t.amount < 0)
      const int = newTx.find((t) => t.amount > 0)
      if (fee) {
        await a.click('@ns-bank-nbl-10')
        await a.click(`@ns-txn-${fee.id}`)
        await a.click('@ns-match', { label: 'Match' })
      }
      if (int) {
        await a.click('@ns-bank-nbl-11')
        await a.click(`@ns-txn-${int.id}`)
        await a.click('@ns-match', { label: 'Match' })
      }
      await a.click('@ns-match-submit', { label: 'Submit' })
      await a.waitFor('@ns-recon-summary')
      const diff = a.text('@ns-recon-diff')
      await a.think(`10 of 11 bank lines reconciled. Remaining unexplained difference: ${diff} — the Tailspin transposition.`, 1400)

      a.step(4)
      await a.open('outlook')
      await sendMail(
        a,
        person('sofia').email,
        'Woodgrove ••••4410 — October bank rec done (1 variance)',
        `Hi Sofia,\n\nThe Woodgrove operating account is reconciled in NetSuite through yesterday:\n\n• 10 of 11 bank lines matched and submitted\n• Booked ${je?.number} (pending your approval): $85.00 bank service fee and $312.47 interest income\n• In transit (no action): check 10240 to City Power & Light $2,316.40 and deposit DEP-0921 $5,400.00\n\nOPEN VARIANCE — $90.00\nTailspin Toys paid $7,980.00 (INV-10477) but the customer payment PYMT1851 was recorded as $7,890.00. The $90 difference divides by 9, so it looks like a transposition when the payment was keyed. Suggest correcting PYMT1851 rather than booking a write-off.\n\nAlex`,
      )
      const mail = newestEmail((e) => e.folder === 'sent' && e.subject.startsWith('Woodgrove'))
      return {
        summary: `Reconciled 10 of 11 Woodgrove bank lines in NetSuite, booked ${je?.number} for $85.00 fees and $312.47 interest, and flagged a $90.00 Tailspin Toys transposition to Sofia.`,
        outputs: [
          { label: 'Open the reconciliation in NetSuite', appId: 'netsuite', params: { view: 'recon' } },
          { label: `Open journal ${je?.number}`, appId: 'netsuite', params: { journalId: je?.id } },
          { label: 'View the summary to Sofia', appId: 'outlook', params: { view: 'mail', folder: 'sent', emailId: mail } },
        ],
        metrics: [{ label: 'Lines matched', value: '10/11' }, { label: 'Journal booked', value: '$397.47' }, { label: 'Variance explained', value: '$90.00' }],
      }
    },
  },
]
