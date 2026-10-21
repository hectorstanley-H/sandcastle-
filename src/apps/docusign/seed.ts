/**
 * Docusign seed: envelopes + templates.
 *
 * docusign.envelopes: {
 *   id (GUID), subject, message, status: 'draft'|'sent'|'delivered'|'action'|'completed'|'declined'|'voided',
 *   templateId?, documents: [{ name, pages }],
 *   recipients: [{ name, email, role: 'signer'|'cc'|'inperson'|'viewer', status: 'created'|'sent'|'delivered'|'signed'|'completed'|'declined', order, at? }],
 *   sender (email), senderName, createdAt, sentAt?, completedAt?, expiresAt?, lastChange, voidReason?, declineReason?,
 *   fields?: [{ id, type, page, x, y, recipient }], history: [{ at, action, by, detail }], createdBy?: 'hworker', deleted?: boolean
 * }
 * docusign.templates: { id, name, description, documents, roles: [{ roleName, name, email, role }], subject, message, owner, folder, createdAt, updatedAt, shared, uses }
 */
import type { Collections, Rec } from '@/db/db'
import { daysAgo, daysFromNow, hoursAgo, minutesAgo } from '@/data/time'
import { ME, person } from '@/data/people'

/** deterministic Docusign-style envelope GUID */
export function guidFor(n: number) {
  let h = (n * 2654435761) >>> 0
  const hex = () => {
    h = (Math.imul(h ^ (h >>> 15), 2246822519) + 0x9e3779b9) >>> 0
    return h.toString(16).toUpperCase().padStart(8, '0')
  }
  const a = hex() + hex() + hex() + hex()
  return `${a.slice(0, 8)}-${a.slice(8, 12)}-${a.slice(12, 16)}-${a.slice(16, 20)}-${a.slice(20, 32)}`
}

type R = { id?: string; name?: string; email?: string; role?: string }
const ext = (name: string, email: string): R => ({ name, email })
const p = (id: string): R => ({ name: person(id).name, email: person(id).email })

interface EnvSpec {
  n: number
  subject: string
  message?: string
  status: string
  templateId?: string
  docs: [string, number][]
  /** signers in routing order (ME included where relevant) */
  signers: R[]
  cc?: R[]
  sender?: R
  created: string
  sent?: string
  completed?: string
  expires?: string
  /** how many signers have signed (for sent/delivered/action) */
  signed?: number
  /** whether the current signer has opened it */
  viewed?: boolean
  voidReason?: string
  declineReason?: string
}

const plusH = (iso: string, h: number) => new Date(new Date(iso).getTime() + h * 3600_000).toISOString()

function env(s: EnvSpec): Rec {
  const sender = s.sender ?? p('alex')
  const history: any[] = [{ at: s.created, action: 'Created', by: sender.name, detail: `Envelope created${s.templateId ? ' from template' : ''}` }]
  const recips: any[] = []
  let order = 1
  const sentAt = s.sent
  const nSigned = s.status === 'completed' ? s.signers.length : s.status === 'declined' ? (s.signed ?? 0) : (s.signed ?? 0)
  if (sentAt) history.push({ at: sentAt, action: 'Sent', by: sender.name, detail: `Envelope sent to ${s.signers.map((r) => r.name).join(', ')}` })
  let t = sentAt ?? s.created
  s.signers.forEach((r, i) => {
    let status = 'created'
    let at: string | undefined
    if (sentAt) {
      if (i < nSigned) {
        const deliveredAt = plusH(t, 0.4 + (i % 3) * 0.7)
        const signedAt = s.status === 'completed' && i === s.signers.length - 1 && s.completed ? s.completed : plusH(deliveredAt, 1.2 + (i % 2) * 3)
        history.push({ at: deliveredAt, action: 'Viewed', by: r.name, detail: `Viewed by ${r.name}` })
        history.push({ at: signedAt, action: 'Signed', by: r.name, detail: `Signed by ${r.name} (${r.email})` })
        status = s.status === 'completed' ? 'completed' : 'signed'
        at = signedAt
        t = signedAt
      } else if (i === nSigned) {
        if (s.status === 'declined') {
          const da = plusH(t, 5)
          history.push({ at: plusH(t, 2), action: 'Viewed', by: r.name, detail: `Viewed by ${r.name}` })
          history.push({ at: da, action: 'Declined', by: r.name, detail: s.declineReason ?? 'Declined to sign' })
          status = 'declined'
          at = da
        } else if (s.status !== 'voided') {
          status = s.viewed || s.status === 'delivered' ? 'delivered' : 'sent'
          if (status === 'delivered') {
            at = plusH(t, 1)
            history.push({ at, action: 'Viewed', by: r.name, detail: `Viewed by ${r.name}` })
          } else at = t
        } else status = 'sent'
      }
    }
    recips.push({ name: r.name, email: r.email, role: r.role ?? 'signer', status, order: order++, at })
  })
  for (const c of s.cc ?? []) recips.push({ name: c.name, email: c.email, role: 'cc', status: s.status === 'completed' ? 'completed' : sentAt ? 'sent' : 'created', order: order, at: s.completed })
  if (s.status === 'completed' && s.completed) history.push({ at: s.completed, action: 'Completed', by: 'Docusign System', detail: 'Envelope completed. Certificate of Completion generated.' })
  if (s.status === 'voided') history.push({ at: plusH(t, 26), action: 'Voided', by: sender.name, detail: s.voidReason ?? 'Voided by sender' })
  history.sort((a, b) => +new Date(a.at) - +new Date(b.at))
  const lastChange = history[history.length - 1].at
  return {
    id: guidFor(s.n),
    subject: s.subject,
    message: s.message ?? '',
    status: s.status,
    templateId: s.templateId,
    documents: s.docs.map(([name, pages]) => ({ name, pages })),
    recipients: recips,
    sender: sender.email,
    senderName: sender.name,
    createdAt: s.created,
    sentAt,
    completedAt: s.status === 'completed' ? s.completed : undefined,
    expiresAt: s.expires ?? (sentAt ? plusH(sentAt, 120 * 24) : undefined),
    lastChange,
    voidReason: s.voidReason,
    declineReason: s.declineReason,
    fields: [],
    history,
  }
}

const me = p('alex')

export const OFFER_LETTER_ENVELOPE_ID = guidFor(1)

export function seed(): Collections {
  const envelopes: Rec[] = [
    // ── Completed: offer letter for the new hire ─────────────────────────
    env({
      n: 1,
      subject: 'Offer Letter — Jordan Ellis',
      message: 'Hi Jordan, we are thrilled to offer you the Operations Analyst role at Northwind Global. Please review and sign your offer letter.',
      status: 'completed',
      templateId: 'tpl-offer-letter',
      docs: [['Offer_Letter_Jordan_Ellis.pdf', 3]],
      signers: [p('jordan'), p('nina')],
      cc: [p('james'), me],
      sender: p('james'),
      created: daysAgo(16, 10, 12),
      sent: daysAgo(16, 10, 20),
      completed: daysAgo(14, 16, 41),
    }),
    // ── Action required (sent to me) ─────────────────────────────────────
    env({
      n: 2,
      subject: 'Please DocuSign: Adatum_Data_Processing_Addendum_2026.pdf',
      message: 'Hi Alex, attached is the updated DPA reflecting the EU SCCs. Please countersign at your earliest convenience. Best, Elena',
      status: 'action',
      docs: [['Adatum_Data_Processing_Addendum_2026.pdf', 9]],
      signers: [p('elena'), me],
      sender: p('elena'),
      created: daysAgo(2, 8, 40),
      sent: daysAgo(2, 8, 47),
      signed: 1,
      expires: daysFromNow(5, 17, 0),
    }),
    env({
      n: 3,
      subject: 'Complete with Docusign: Remote_Work_Policy_Acknowledgement_FY27.pdf',
      message: 'All people managers are asked to acknowledge the updated Remote Work Policy by the end of the month.',
      status: 'action',
      templateId: 'tpl-handbook-ack',
      docs: [['Remote_Work_Policy_Acknowledgement_FY27.pdf', 2]],
      signers: [me],
      sender: p('james'),
      created: hoursAgo(20),
      sent: hoursAgo(19.5),
      expires: daysFromNow(9, 17, 0),
    }),
    // ── Waiting for others ×5 ────────────────────────────────────────────
    env({
      n: 4,
      subject: 'Complete with Docusign: Fabrikam_MSA_Amendment_No2.pdf',
      message: 'Mike, please review and sign Amendment No. 2 to our MSA (updated payment terms, Net 45).',
      status: 'delivered',
      templateId: 'tpl-msa',
      docs: [['Fabrikam_MSA_Amendment_No2.pdf', 4]],
      signers: [p('mike'), me],
      cc: [p('sofia')],
      created: daysAgo(6, 11, 5),
      sent: daysAgo(6, 11, 14),
      viewed: true,
      expires: daysFromNow(2, 23, 59),
    }),
    env({
      n: 5,
      subject: 'Complete with Docusign: Litware_SOW_Q4_Process_Automation.pdf',
      message: 'Hi Sam, attached is the Q4 Statement of Work for the process automation engagement.',
      status: 'sent',
      templateId: 'tpl-sow',
      docs: [['Litware_SOW_Q4_Process_Automation.pdf', 6]],
      signers: [p('sam'), p('priya')],
      created: daysAgo(3, 14, 2),
      sent: daysAgo(3, 14, 9),
      expires: daysFromNow(4, 23, 59),
    }),
    env({
      n: 6,
      subject: 'Complete with Docusign: Tailspin_Toys_Mutual_NDA.pdf',
      message: 'Please sign the mutual NDA ahead of our discovery workshop next week.',
      status: 'delivered',
      templateId: 'tpl-mutual-nda',
      docs: [['Tailspin_Toys_Mutual_NDA.pdf', 3]],
      signers: [ext('Rob Walters', 'rob.walters@tailspintoys.com'), me],
      created: daysAgo(1, 9, 30),
      sent: daysAgo(1, 9, 36),
      viewed: true,
    }),
    env({
      n: 7,
      subject: 'Complete with Docusign: Woodgrove_Bank_Vendor_Onboarding_Form.pdf',
      message: 'Dear Woodgrove team, please complete the vendor onboarding form including banking and tax details.',
      status: 'sent',
      templateId: 'tpl-vendor-onboarding',
      docs: [['Woodgrove_Bank_Vendor_Onboarding_Form.pdf', 5]],
      signers: [ext('Priscilla Grant', 'p.grant@woodgrovebank.com')],
      cc: [p('lucas')],
      created: daysAgo(4, 15, 20),
      sent: daysAgo(4, 15, 22),
    }),
    env({
      n: 8,
      subject: 'Complete with Docusign: Alpine_Ski_House_Change_Order_CO-0142.pdf',
      message: 'Change Order CO-0142 covering the additional 2 sites for the winter season rollout.',
      status: 'sent',
      templateId: 'tpl-change-order',
      docs: [['Alpine_Ski_House_Change_Order_CO-0142.pdf', 2]],
      signers: [ext('Kim Abercrombie', 'kim.abercrombie@alpineskihouse.com'), p('rachel')],
      created: hoursAgo(5),
      sent: hoursAgo(4.8),
    }),
    // ── Drafts ───────────────────────────────────────────────────────────
    env({
      n: 9,
      subject: 'Complete with Docusign: Proseware_Master_Services_Agreement.pdf',
      status: 'draft',
      templateId: 'tpl-msa',
      docs: [['Proseware_Master_Services_Agreement.pdf', 14]],
      signers: [ext('Dana Whitfield', 'dana.whitfield@proseware.com'), me],
      created: daysAgo(1, 16, 45),
    }),
    env({
      n: 10,
      subject: 'Complete with Docusign: Coho_Winery_Event_Services_Agreement.pdf',
      status: 'draft',
      docs: [['Coho_Winery_Event_Services_Agreement.pdf', 5]],
      signers: [ext('Ted Anderson', 'ted@cohowinery.com')],
      created: daysAgo(8, 10, 2),
    }),
    // ── Voided / Declined ────────────────────────────────────────────────
    env({
      n: 11,
      subject: 'Complete with Docusign: Contoso_Order_Form_Expansion_Q2.pdf',
      status: 'voided',
      templateId: 'tpl-order-form',
      docs: [['Contoso_Order_Form_Expansion_Q2.pdf', 3]],
      signers: [p('kate'), me],
      created: daysAgo(41, 10, 0),
      sent: daysAgo(41, 10, 8),
      voidReason: 'Pricing updated — replaced by revised order form.',
    }),
    env({
      n: 12,
      subject: 'Complete with Docusign: Fourth_Coffee_Supply_Agreement_2026.pdf',
      status: 'declined',
      docs: [['Fourth_Coffee_Supply_Agreement_2026.pdf', 7]],
      signers: [ext('Hugo Lambert', 'hugo.lambert@fourthcoffee.com'), me],
      created: daysAgo(12, 13, 10),
      sent: daysAgo(12, 13, 18),
      declineReason: 'Section 7.2 (exclusivity) needs to be revised before we can sign.',
    }),
    // ── Completed ────────────────────────────────────────────────────────
    ...(
      [
        [13, 'Complete with Docusign: Contoso_Mutual_NDA_2026.pdf', 'tpl-mutual-nda', 'Contoso_Mutual_NDA_2026.pdf', 3, [p('kate'), me], 9, 8],
        [14, 'Complete with Docusign: Adatum_Order_Form_FY27.pdf', 'tpl-order-form', 'Adatum_Order_Form_FY27.pdf', 4, [p('elena'), me], 21, 19],
        [15, 'Offer Letter — Maya Johnson', 'tpl-offer-letter', 'Offer_Letter_Maya_Johnson.pdf', 3, [p('maya'), p('nina')], 128, 126],
        [16, 'Complete with Docusign: Litware_MSA_Renewal_2026.pdf', 'tpl-msa', 'Litware_MSA_Renewal_2026.pdf', 12, [p('sam'), p('marcus')], 33, 30],
        [17, 'Employee Handbook Acknowledgement — Ben Carter', 'tpl-handbook-ack', 'Northwind_Employee_Handbook_2026.pdf', 2, [p('ben')], 46, 46],
        [18, 'Complete with Docusign: Fabrikam_Vendor_Onboarding_Form.pdf', 'tpl-vendor-onboarding', 'Fabrikam_Vendor_Onboarding_Form.pdf', 5, [p('mike')], 54, 52],
        [19, 'Complete with Docusign: Tailspin_Toys_SOW_Phase1.pdf', 'tpl-sow', 'Tailspin_Toys_SOW_Phase1.pdf', 6, [ext('Rob Walters', 'rob.walters@tailspintoys.com'), p('rachel')], 62, 58],
        [20, 'Complete with Docusign: Woodgrove_Bank_Mutual_NDA.pdf', 'tpl-mutual-nda', 'Woodgrove_Bank_Mutual_NDA.pdf', 3, [ext('Priscilla Grant', 'p.grant@woodgrovebank.com'), me], 70, 69],
        [21, 'Complete with Docusign: Alpine_Ski_House_Order_Form.pdf', 'tpl-order-form', 'Alpine_Ski_House_Order_Form.pdf', 4, [ext('Kim Abercrombie', 'kim.abercrombie@alpineskihouse.com'), p('rachel')], 77, 75],
        [22, 'Complete with Docusign: Proseware_Change_Order_CO-0131.pdf', 'tpl-change-order', 'Proseware_Change_Order_CO-0131.pdf', 2, [ext('Dana Whitfield', 'dana.whitfield@proseware.com'), me], 85, 84],
        [23, 'Complete with Docusign: Contoso_Order_Form_Renewal_2023.pdf', 'tpl-contoso-renewal', 'Contoso_Order_Form_Renewal_2023.pdf', 3, [p('kate'), me], 1080, 1076],
        [24, 'Contractor Agreement — Lucerne Publishing', 'tpl-contractor', 'Lucerne_Contractor_Agreement.pdf', 6, [ext('Ines Duarte', 'ines.duarte@lucernepublishing.com'), p('priya')], 97, 95],
        [25, 'Complete with Docusign: Margies_Travel_Corporate_Rates_2026.pdf', undefined, 'Margies_Travel_Corporate_Rates_2026.pdf', 4, [ext('Margie Shoop', 'margie@margiestravel.com'), me], 110, 107],
        [26, 'Employee Handbook Acknowledgement — Ryan Tanaka', 'tpl-handbook-ack', 'Northwind_Employee_Handbook_2026.pdf', 2, [p('ryan')], 140, 139],
        [27, 'Complete with Docusign: Wide_World_Importers_DPA.pdf', 'tpl-dpa', 'Wide_World_Importers_DPA.pdf', 8, [ext('Jon Morris', 'jon.morris@wideworldimporters.com'), me], 152, 147],
        [28, 'Complete with Docusign: Fabrikam_Change_Order_CO-0127.pdf', 'tpl-change-order', 'Fabrikam_Change_Order_CO-0127.pdf', 2, [p('mike'), me], 3, 2],
      ] as [number, string, string | undefined, string, number, R[], number, number][]
    ).map(([n, subject, templateId, doc, pages, signers, sentDays, doneDays]) =>
      env({
        n,
        subject,
        status: 'completed',
        templateId,
        docs: [[doc, pages]],
        signers,
        created: daysAgo(sentDays, 9 + (n % 6), (n * 7) % 60),
        sent: daysAgo(sentDays, 9 + (n % 6), ((n * 7) % 60) + 4 > 59 ? 59 : ((n * 7) % 60) + 4),
        completed: daysAgo(doneDays, 11 + (n % 6), (n * 13) % 60),
      }),
    ),
    env({
      n: 29,
      subject: 'Complete with Docusign: Northwind_Q3_Board_Consent.pdf',
      status: 'completed',
      docs: [['Northwind_Q3_Board_Consent.pdf', 2]],
      signers: [p('david'), p('marcus')],
      cc: [me],
      sender: p('priya'),
      created: daysAgo(24, 8, 10),
      sent: daysAgo(24, 8, 15),
      completed: daysAgo(23, 10, 2),
    }),
    env({
      n: 30,
      subject: 'Complete with Docusign: Contoso_Support_Addendum.pdf',
      status: 'completed',
      docs: [['Contoso_Support_Addendum.pdf', 2]],
      signers: [p('kate'), me],
      created: minutesAgo(60 * 30),
      sent: minutesAgo(60 * 30 - 6),
      completed: hoursAgo(26),
    }),
  ]

  const tpl = (
    id: string,
    name: string,
    description: string,
    docs: [string, number][],
    roles: { roleName: string; name?: string; email?: string; role?: string }[],
    owner: string,
    folder: string,
    updatedDays: number,
    uses: number,
    subject?: string,
    message?: string,
  ): Rec => ({
    id,
    name,
    description,
    documents: docs.map(([n, pg]) => ({ name: n, pages: pg })),
    roles: roles.map((r) => ({ name: '', email: '', role: 'signer', ...r })),
    subject: subject ?? `Complete with Docusign: ${docs[0][0]}`,
    message: message ?? '',
    owner,
    folder,
    createdAt: daysAgo(updatedDays + 120, 10, 0),
    updatedAt: daysAgo(updatedDays, 14, 20),
    shared: owner !== ME.name,
    uses,
  })

  const templates: Rec[] = [
    tpl(
      'tpl-contoso-renewal',
      'Contoso Order Form — Renewal',
      '3-year renewal of the Northwind Global Enterprise subscription for Contoso Ltd (400 seats), incl. pricing schedule and signature block.',
      [['Contoso_Order_Form_Renewal.pdf', 3]],
      [{ roleName: 'Customer Signer' }],
      ME.name,
      'Sales / Renewals',
      4,
      3,
      'Complete with Docusign: Contoso_Order_Form_Renewal.pdf',
      'Hi Kate, please review and sign the attached Order Form for the 3-year renewal of your Northwind Global Enterprise subscription (400 seats). Thank you!',
    ),
    tpl('tpl-mutual-nda', 'Mutual NDA', 'Standard two-way non-disclosure agreement (Legal approved, v4.2).', [['Northwind_Mutual_NDA.pdf', 3]], [{ roleName: 'Counterparty' }, { roleName: 'Northwind Signer', name: ME.name, email: ME.email }], 'Legal Ops', 'Legal', 18, 214),
    tpl('tpl-offer-letter', 'Offer Letter', 'Full-time offer letter with compensation, start date and at-will employment terms.', [['Northwind_Offer_Letter.pdf', 3]], [{ roleName: 'Candidate' }, { roleName: 'Chief People Officer', name: person('nina').name, email: person('nina').email }, { roleName: 'HR Partner', name: person('james').name, email: person('james').email, role: 'cc' }], 'James Whitaker', 'HR', 9, 87),
    tpl('tpl-msa', 'Master Services Agreement', 'Northwind standard MSA for enterprise customers (governing law: Massachusetts).', [['Northwind_MSA_2026.pdf', 14]], [{ roleName: 'Customer Signer' }, { roleName: 'Northwind Signer', name: person('marcus').name, email: person('marcus').email }], 'Legal Ops', 'Legal', 27, 61),
    tpl('tpl-sow', 'Statement of Work', 'Professional services SOW with milestones, deliverables and fee schedule.', [['Northwind_SOW_Template.pdf', 6]], [{ roleName: 'Client' }, { roleName: 'Services Lead', name: person('priya').name, email: person('priya').email }], ME.name, 'Operations', 12, 38),
    tpl('tpl-order-form', 'Standard Order Form', 'New-business order form referencing the MSA, with product schedule.', [['Northwind_Order_Form.pdf', 4]], [{ roleName: 'Customer Signer' }, { roleName: 'Northwind Signer', name: ME.name, email: ME.email }], 'Rachel Goldberg', 'Sales', 33, 142),
    tpl('tpl-vendor-onboarding', 'Vendor Onboarding Form', 'Supplier information, W-9 / W-8BEN, banking details and compliance attestations.', [['Vendor_Onboarding_Form.pdf', 5]], [{ roleName: 'Vendor Contact' }, { roleName: 'Procurement', name: person('lucas').name, email: person('lucas').email, role: 'cc' }], 'Lucas Moreau', 'Procurement', 40, 96),
    tpl('tpl-handbook-ack', 'Employee Handbook Acknowledgement', 'Acknowledgement of receipt of the 2026 Employee Handbook and Code of Conduct.', [['Northwind_Employee_Handbook_2026.pdf', 2]], [{ roleName: 'Employee' }], 'James Whitaker', 'HR', 52, 318),
    tpl('tpl-change-order', 'Change Order', 'Change order amending scope, timeline or fees of an existing SOW.', [['Northwind_Change_Order.pdf', 2]], [{ roleName: 'Client' }, { roleName: 'Northwind Signer', name: ME.name, email: ME.email }], ME.name, 'Operations', 21, 44),
    tpl('tpl-dpa', 'Data Processing Addendum', 'GDPR / CCPA data processing addendum with EU SCCs (Module 2).', [['Northwind_DPA_2026.pdf', 8]], [{ roleName: 'Customer' }, { roleName: 'Privacy Officer', name: person('grace').name, email: person('grace').email }], 'Legal Ops', 'Legal', 64, 57),
    tpl('tpl-contractor', 'Independent Contractor Agreement', 'Contractor agreement with IP assignment and confidentiality clauses.', [['Contractor_Agreement.pdf', 6]], [{ roleName: 'Contractor' }, { roleName: 'Hiring Manager' }], 'James Whitaker', 'HR', 75, 29),
    tpl('tpl-expense-policy', 'Travel & Expense Policy Acknowledgement', 'Annual acknowledgement of the travel & expense policy.', [['TE_Policy_2026.pdf', 2]], [{ roleName: 'Employee' }], 'Sofia Martinez', 'Finance', 90, 152),
  ]

  return { 'docusign.envelopes': envelopes, 'docusign.templates': templates }
}
