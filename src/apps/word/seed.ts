/**
 * Word seed — collection `word.docs`.
 * Record: { id, name, title?, paragraphs: { id, style, text }[], modified, author, createdBy?, updatedBy? }
 * Paragraph styles: 'title' | 'subtitle' | 'heading1' | 'heading2' | 'normal' | 'bullet' | 'number'
 */
import { daysAgo, hoursAgo, fmtDate, daysFromNow } from '@/data/time'

type Style = 'title' | 'subtitle' | 'heading1' | 'heading2' | 'normal' | 'bullet' | 'number'
type Line = [Style, string]

const T = (s: string): Line => ['title', s]
const S = (s: string): Line => ['subtitle', s]
const H1 = (s: string): Line => ['heading1', s]
const H2 = (s: string): Line => ['heading2', s]
const N = (s: string): Line => ['normal', s]
const B = (s: string): Line => ['bullet', s]
const O = (s: string): Line => ['number', s]

const doc = (id: string, name: string, author: string, modified: string, lines: Line[]) => ({
  id,
  name,
  title: lines.find((l) => l[0] === 'title')?.[1] ?? name.replace(/\.docx$/, ''),
  author,
  modified,
  paragraphs: lines.map(([style, text], i) => ({ id: `${id}-p${i + 1}`, style, text })),
})

export function wordSeed(): Record<string, any[]> {
  const start = fmtDate(daysFromNow(4), { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  return {
    'word.docs': [
      doc('doc-onboarding', 'Onboarding Checklist.docx', 'Alex Morgan', hoursAgo(3), [
        T('Operations Analyst Onboarding Plan'),
        S(`Northwind Global · Operations · New hire: Jordan Ellis · Start date: ${start}`),
        H1('Purpose'),
        N('This checklist gives Jordan a structured first 30 days on the Operations team. It lists the accounts, equipment, training and introductions needed to be productive quickly, and names an owner for every item so nothing falls through the cracks between IT, People and Operations.'),
        N('Manager: Alex Morgan, Operations Manager. Onboarding buddy: Ben Carter, Operations Analyst. HR partner: James Whitaker.'),
        H1('Before day one'),
        B('Laptop (Dell Latitude 7450) imaged and enrolled in Intune — owner: Oliver Brooks, IT Service Desk'),
        B('Microsoft 365 account, mailbox and Teams license provisioned via Okta — owner: IT'),
        B('Access requests submitted for SAP S/4HANA (MM display), ServiceNow (ITIL), Power BI Pro and Coupa (requester role)'),
        B('Badge photo and building access for Boston HQ, 4th floor — owner: Facilities'),
        B('Welcome email with first-week calendar sent to personal address — owner: Alex Morgan'),
        H1('Week 1 — Orientation'),
        O('Monday 9:00 AM: welcome breakfast with the Operations team and desk setup'),
        O('Complete Workday onboarding tasks: I-9 verification, benefits enrollment, direct deposit'),
        O('Security awareness and data handling training (Workday Learning, approx. 90 minutes)'),
        O('1:1 with Alex Morgan to review role expectations and the 30/60/90-day plan'),
        O('Shadow Ben Carter on the daily order-exception review and the warehouse SLA dashboard'),
        H1('Week 2 — Systems and processes'),
        B('Walk through the Ops Runbook v3 with Maya Johnson, including the P1 escalation path'),
        B('Power BI: Operations KPI workspace tour (on-time delivery, cycle time, cost per order)'),
        B('ServiceNow: shadow two incident handoffs between the Service Desk and the warehouse team'),
        B('Vendor management basics with Lucas Moreau: Coupa requisitions, POs and the vendor review cadence'),
        H1('Weeks 3–4 — First ownership'),
        N('By the end of the first month Jordan owns the weekly vendor-performance report and presents it in the Operations Review. Expect support from Ben for the first two cycles.'),
        H2('Success measures at 30 days'),
        B('All system access working, with no open access tickets'),
        B('Weekly vendor-performance report published two weeks in a row'),
        B('Can triage a warehouse SLA breach end to end using the runbook'),
        H1('Key contacts'),
        N('Alex Morgan (manager) · Ben Carter (buddy) · Maya Johnson (Ops coordinator) · Oliver Brooks (IT) · James Whitaker (HR) · Priya Raman (VP, Operations)'),
      ]),
      doc('doc-runbook', 'Ops Runbook v3.docx', 'Maya Johnson', daysAgo(2, 16, 40), [
        T('Operations Incident Runbook'),
        S('Version 3.2 · Owner: Maya Johnson · Approved by Priya Raman · Classification: Internal'),
        H1('1. Scope'),
        N('This runbook covers operational incidents affecting order fulfillment, warehouse throughput and carrier handoffs across the Boston, Chicago and Austin distribution centers. IT incidents (network, identity, end-user devices) follow the IT major incident process in ServiceNow and are out of scope except where noted.'),
        H1('2. Severity definitions'),
        B('P1 — Critical: a distribution center cannot ship, or more than 500 orders are at risk of missing their promised delivery date'),
        B('P2 — High: degraded throughput (below 70% of plan) for more than 2 hours, or a carrier pickup missed'),
        B('P3 — Medium: a single process or line is impacted and a workaround exists'),
        B('P4 — Low: cosmetic or reporting issues with no customer impact'),
        H1('3. First 15 minutes'),
        O('Acknowledge the alert in ServiceNow and assign yourself as incident owner'),
        O('Confirm impact: number of orders affected, sites affected, and customer-facing promise dates'),
        O('Open a bridge in Microsoft Teams (#ops-incident channel) and post the incident summary'),
        O('For P1/P2, page the on-call Operations Manager and notify Priya Raman'),
        O('Start the incident timeline in the ServiceNow work notes — every action, every time stamp'),
        H1('4. Common scenarios'),
        H2('4.1 Warehouse management system latency'),
        N('Symptoms: scanners time out, pick waves fail to release, or label printing queues back up. Check the WMS health dashboard first; if application response time exceeds 4 seconds, open a P2 with the IT application team and switch the affected zone to batch picking.'),
        H2('4.2 Missed carrier pickup'),
        N('Contact the carrier account manager directly (numbers in Appendix B). Re-tender loads to the secondary carrier if the pickup cannot be rescheduled within 3 hours. Update promise dates in SAP for affected sales orders and notify Customer Success.'),
        H2('4.3 Inventory discrepancy above threshold'),
        N('Freeze the affected bin locations, trigger a cycle count, and post the variance to the inventory controller. Do not adjust stock in SAP until the recount is complete and approved by Finance.'),
        H1('5. Communication'),
        B('Internal updates every 30 minutes for P1, every 60 minutes for P2'),
        B('Customer communication goes through Aisha Bello (Customer Success) — never directly from the bridge'),
        B('Executive summary to David Okafor within 2 hours of a P1 being declared'),
        H1('6. Closing the incident'),
        N('An incident is resolved when throughput is back to plan for 60 consecutive minutes. Within 3 business days, the owner publishes a post-incident review covering timeline, root cause, customer impact and corrective actions, and files follow-up tasks in Jira (project OPS).'),
        H1('Appendix A — Escalation contacts'),
        N('On-call Operations Manager: rotation in PagerDuty · VP, Operations: Priya Raman · IT Service Desk Lead: Oliver Brooks · Director of IT: Grace Kim'),
      ]),
      doc('doc-fabrikam', 'Vendor Review Notes - Fabrikam.docx', 'Lucas Moreau', daysAgo(5, 11, 15), [
        T('Vendor Review: Fabrikam Supplies'),
        S('Quarterly business review notes · Q3 FY25 · Prepared by Lucas Moreau'),
        H1('Attendees'),
        N('Northwind: Lucas Moreau (Procurement), Alex Morgan (Operations), Emma Schultz (Accounts Payable). Fabrikam: Mike Harrington (Accounts Receivable) and their regional account lead.'),
        H1('Performance summary'),
        B('On-time delivery: 91.4% against a contractual target of 95% (down from 94.2% in Q2)'),
        B('Invoice accuracy: 97.8% — three invoices disputed for pricing mismatches against PO'),
        B('Q3 spend: $412,600 across packaging, labels and warehouse consumables'),
        B('Open credit memos: $8,240 pending since August'),
        H1('Discussion'),
        N('Fabrikam attributed the delivery slip to a carrier change at their Dallas facility in July. They expect to be back above 95% by mid-November. We asked for a weekly OTD report until the target is met for four consecutive weeks.'),
        N('Emma raised the disputed invoices (INV-20931, INV-21007, INV-21044). Root cause is an outdated price list in Fabrikam\'s billing system; Mike committed to issuing corrected invoices within 10 business days.'),
        H1('Action items'),
        O('Fabrikam to send weekly on-time-delivery report every Monday — owner: Mike Harrington'),
        O('Issue corrected invoices and apply the $8,240 credit — owner: Fabrikam AR'),
        O('Evaluate a secondary packaging supplier as a contingency — owner: Lucas Moreau'),
        O('Revisit the contract SLA credits clause at renewal (March) — owner: Alex Morgan'),
      ]),
      doc('doc-q4-priorities', 'Q4 Ops Priorities.docx', 'Priya Raman', daysAgo(8, 14, 5), [
        T('Q4 FY25 Operations Priorities'),
        S('Draft for leadership review · Priya Raman, VP Operations'),
        H1('Context'),
        N('Q3 closed with on-time delivery at 96.2% and cost per order down to $4.12, but peak-season volume is forecast to run 18% above last year. Q4 priorities focus on protecting service levels through peak while locking in the cost gains.'),
        H1('Priorities'),
        O('Peak readiness: temporary labor plan for Chicago and Austin, carrier capacity commitments signed by October 31'),
        O('Automate order-exception triage so analysts spend time on root causes rather than data entry'),
        O('Vendor consolidation: reduce packaging suppliers from five to three without SLA risk'),
        O('Launch the Operations KPI scorecard in Power BI for every site manager'),
        H1('Targets'),
        B('On-time delivery ≥ 96% through peak'),
        B('Order cycle time ≤ 2.6 days'),
        B('Cost per order ≤ $4.05'),
        B('Zero P1 incidents lasting longer than 4 hours'),
        H1('Open questions'),
        N('Budget for the exception-triage automation pilot needs CFO sign-off (Marcus Lee). Alex to bring a one-page business case to the November Operations Review.'),
      ]),
      doc('doc-opsreview-notes', 'Meeting Notes - Ops Review.docx', 'Alex Morgan', daysAgo(1, 15, 30), [
        T('Weekly Operations Review'),
        S(`Meeting notes · ${fmtDate(daysAgo(1))} · Facilitator: Alex Morgan`),
        H1('Attendees'),
        N('Priya Raman, Alex Morgan, Ben Carter, Maya Johnson, Lucas Moreau, Oliver Brooks (for item 3)'),
        H1('Agenda'),
        O('KPI review: on-time delivery, cycle time, warehouse SLA'),
        O('Vendor performance: Fabrikam delivery slip'),
        O('Scanner refresh in the Chicago DC'),
        O('Peak-season staffing'),
        H1('Notes'),
        N('On-time delivery for the week was 96.8%, the best week of the quarter. Chicago cycle time is still above target at 3.1 days because of the scanner outages last Tuesday.'),
        N('Oliver confirmed the replacement scanners (Zebra TC58) ship Thursday; IT will image them on site over the weekend to avoid downtime.'),
        H1('Decisions'),
        B('Approve 40 temporary associates for Chicago from November 4'),
        B('Fabrikam stays on a weekly reporting cadence until they hit 95% OTD'),
        H1('Action items'),
        B('Ben — refresh the vendor scorecard with September data by Friday'),
        B('Maya — update the runbook section on scanner failover'),
        B('Alex — share the Q3 Operations Review deck with leadership'),
      ]),
    ],
  }
}
