/**
 * System group seed: File Explorer (extra files + folders + Recycle Bin), Notepad notes, Acrobat annotations.
 *
 * files (shared, see core.ts): { id, name, folder, kind, size, modified, open?: { appId, params } }
 *   `folder` is a path: 'Downloads', 'Documents/Contracts', 'OneDrive/Attachments'…
 * explorer.folders: { id, name, parent, created }  — user-created sub folders (parent = path of the parent)
 * explorer.recycle: { id, name, kind, size, originalFolder, deleted, modified, isFolder?, file?: <original file record> }
 * notepad.notes: { id, name, content, saved, modified, path? }
 * acrobat.annotations: { id, doc, kind: 'note'|'highlight', field?: string, page, x?, y?, text?, author, date, createdBy? }
 */
import type { Collections } from '../db'
import { daysAgo, hoursAgo, minutesAgo } from '@/data/time'

const pdf = (doc: string) => ({ appId: 'acrobat', params: { doc } })

export function seed(): Collections {
  const shot = (n: number, hh: number, mm: number) => {
    const d = new Date(daysAgo(n, hh, mm))
    const p = (x: number) => String(x).padStart(2, '0')
    return `Screenshot ${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(hh)}${p(mm)}${p((n * 7) % 60)}.png`
  }
  const rec = (n: number, hh: number, mm: number) => {
    const d = new Date(daysAgo(n, hh, mm))
    const p = (x: number) => String(x).padStart(2, '0')
    return `Screen Recording ${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(hh)}${p(mm)}22.mp4`
  }

  const files = [
    // ── Downloads (messy on purpose: the organize workflow tidies it) ──
    { id: 'f-sys-marriott', name: 'Marriott_Folio_84120577.pdf', folder: 'Downloads', kind: 'pdf', size: '212 KB', modified: daysAgo(2, 11, 9), open: pdf('rcpt-marriott') },
    { id: 'f-sys-delta', name: 'eTicket_receipt (1).pdf', folder: 'Downloads', kind: 'pdf', size: '156 KB', modified: daysAgo(6, 8, 34), open: pdf('rcpt-delta') },
    { id: 'f-sys-dinner', name: 'Receipt_OakLongBar_4417.pdf', folder: 'Downloads', kind: 'pdf', size: '48 KB', modified: daysAgo(3, 21, 52), open: pdf('rcpt-dinner') },
    { id: 'f-sys-litware', name: 'LW-7781.pdf', folder: 'Downloads', kind: 'pdf', size: '96 KB', modified: hoursAgo(5), open: pdf('inv-litware') },
    { id: 'f-sys-vpn', name: 'NorthwindVPN-Setup-x64.msi', folder: 'Downloads', kind: 'msi', size: '48.6 MB', modified: daysAgo(5, 9, 12) },
    { id: 'f-sys-shot1', name: shot(1, 14, 32), folder: 'Downloads', kind: 'img', size: '1.1 MB', modified: daysAgo(1, 14, 32) },
    { id: 'f-sys-csv', name: 'Q3_vendor_spend_export.csv', folder: 'Downloads', kind: 'csv', size: '2.4 MB', modified: daysAgo(1, 16, 2), open: { appId: 'excel' } },
    { id: 'f-sys-zoom', name: 'ZoomInstallerFull.exe', folder: 'Downloads', kind: 'exe', size: '91.3 MB', modified: daysAgo(18, 10, 40) },
    { id: 'f-sys-ics', name: 'Ops review - Thursday.ics', folder: 'Downloads', kind: 'ics', size: '3 KB', modified: daysAgo(1, 9, 41) },

    // ── Desktop ──
    { id: 'f-sys-dt1', name: 'Q4 kickoff agenda.docx', folder: 'Desktop', kind: 'docx', size: '41 KB', modified: daysAgo(1, 17, 20), open: { appId: 'word' } },
    { id: 'f-sys-dt2', name: 'Expense tracker 2026.xlsx', folder: 'Desktop', kind: 'xlsx', size: '96 KB', modified: daysAgo(2, 8, 55), open: { appId: 'excel' } },
    { id: 'f-sys-dt3', name: 'todo.txt', folder: 'Desktop', kind: 'txt', size: '1 KB', modified: minutesAgo(55), open: { appId: 'notepad', params: { noteId: 'n-todo' } } },

    // ── Documents ──
    { id: 'f-sys-doc1', name: 'Ops review - talking points.txt', folder: 'Documents', kind: 'txt', size: '2 KB', modified: hoursAgo(3), open: { appId: 'notepad', params: { noteId: 'n-ops' } } },
    { id: 'f-sys-doc2', name: 'Vendor contacts.txt', folder: 'Documents', kind: 'txt', size: '2 KB', modified: daysAgo(6, 13, 2), open: { appId: 'notepad', params: { noteId: 'n-vendors' } } },
    { id: 'f-sys-doc3', name: 'Warehouse Lease - Chicago.pdf', folder: 'Documents/Contracts', kind: 'pdf', size: '2.2 MB', modified: daysAgo(64, 11, 0), open: pdf('contoso-msa') },
    { id: 'f-sys-doc4', name: 'Fabrikam MSA 2024 (signed).pdf', folder: 'Documents/Contracts', kind: 'pdf', size: '884 KB', modified: daysAgo(210, 15, 30), open: pdf('contoso-msa') },
    { id: 'f-sys-doc5', name: 'Litware Order Form Q4.pdf', folder: 'Documents/Contracts', kind: 'pdf', size: '312 KB', modified: daysAgo(30, 10, 5), open: pdf('inv-litware') },
    { id: 'f-sys-doc6', name: 'NDA - Adatum Corporation.docx', folder: 'Documents/Contracts', kind: 'docx', size: '64 KB', modified: daysAgo(21, 9, 30), open: { appId: 'word' } },
    { id: 'f-sys-doc7', name: 'Q2 Operations Review.pptx', folder: 'Documents/Ops Reviews', kind: 'pptx', size: '5.1 MB', modified: daysAgo(98, 17, 0), open: { appId: 'powerpoint' } },
    { id: 'f-sys-doc8', name: 'Q1 Operations Review.pptx', folder: 'Documents/Ops Reviews', kind: 'pptx', size: '4.6 MB', modified: daysAgo(190, 16, 0), open: { appId: 'powerpoint' } },
    { id: 'f-sys-doc9', name: 'Ops KPI baseline.xlsx', folder: 'Documents/Ops Reviews', kind: 'xlsx', size: '418 KB', modified: daysAgo(40, 12, 12), open: { appId: 'excel' } },
    { id: 'f-sys-doc10', name: 'Fabrikam INV-20544 (Sep).pdf', folder: 'Documents/Vendor Invoices', kind: 'pdf', size: '121 KB', modified: daysAgo(31, 9, 2), open: pdf('inv-fabrikam') },
    { id: 'f-sys-doc11', name: 'Fabrikam INV-20187 (Aug).pdf', folder: 'Documents/Vendor Invoices', kind: 'pdf', size: '119 KB', modified: daysAgo(62, 9, 4), open: pdf('inv-fabrikam') },
    { id: 'f-sys-doc12', name: 'Tailspin Toys - 77120.pdf', folder: 'Documents/Vendor Invoices', kind: 'pdf', size: '88 KB', modified: daysAgo(45, 14, 40), open: pdf('inv-litware') },
    { id: 'f-sys-doc13', name: 'Meeting notes template.docx', folder: 'Documents/Templates', kind: 'docx', size: '33 KB', modified: daysAgo(120, 10, 0), open: { appId: 'word' } },
    { id: 'f-sys-doc14', name: 'Weekly status template.xlsx', folder: 'Documents/Templates', kind: 'xlsx', size: '52 KB', modified: daysAgo(120, 10, 2), open: { appId: 'excel' } },
    { id: 'f-sys-doc15', name: 'Northwind letterhead.docx', folder: 'Documents/Templates', kind: 'docx', size: '118 KB', modified: daysAgo(300, 10, 2), open: { appId: 'word' } },

    // ── Pictures ──
    { id: 'f-sys-pic1', name: 'Boston office whiteboard.jpg', folder: 'Pictures', kind: 'img', size: '3.4 MB', modified: daysAgo(4, 15, 12) },
    { id: 'f-sys-pic2', name: 'Warehouse floor plan.png', folder: 'Pictures', kind: 'img', size: '842 KB', modified: daysAgo(11, 10, 31) },
    { id: 'f-sys-pic3', name: 'IMG_20260912_103344.jpg', folder: 'Pictures/Camera Roll', kind: 'img', size: '4.1 MB', modified: daysAgo(39, 10, 33) },
    { id: 'f-sys-pic4', name: 'IMG_20260912_103402.jpg', folder: 'Pictures/Camera Roll', kind: 'img', size: '3.9 MB', modified: daysAgo(39, 10, 34) },
    { id: 'f-sys-pic5', name: 'IMG_20261003_181507.jpg', folder: 'Pictures/Camera Roll', kind: 'img', size: '4.4 MB', modified: daysAgo(18, 18, 15) },
    { id: 'f-sys-pic6', name: 'IMG_20261003_181540.jpg', folder: 'Pictures/Camera Roll', kind: 'img', size: '4.0 MB', modified: daysAgo(18, 18, 15) },
    { id: 'f-sys-pic7', name: shot(2, 10, 4), folder: 'Pictures/Screenshots', kind: 'img', size: '612 KB', modified: daysAgo(2, 10, 4) },
    { id: 'f-sys-pic8', name: shot(5, 16, 47), folder: 'Pictures/Screenshots', kind: 'img', size: '1.3 MB', modified: daysAgo(5, 16, 47) },
    { id: 'f-sys-pic9', name: shot(9, 11, 20), folder: 'Pictures/Screenshots', kind: 'img', size: '944 KB', modified: daysAgo(9, 11, 20) },
    { id: 'f-sys-pic10', name: 'Team offsite - Cape Cod.jpg', folder: 'Pictures', kind: 'img', size: '5.2 MB', modified: daysAgo(12, 18, 3) },

    // ── Music / Videos ──
    { id: 'f-sys-mus1', name: 'HBR IdeaCast - Ep 912 Operations at scale.mp3', folder: 'Music', kind: 'mp3', size: '38.2 MB', modified: daysAgo(8, 7, 30) },
    { id: 'f-sys-mus2', name: 'Deep focus mix.m4a', folder: 'Music', kind: 'm4a', size: '61.0 MB', modified: daysAgo(33, 12, 0) },
    { id: 'f-sys-mus3', name: 'Northwind hold music.wav', folder: 'Music', kind: 'wav', size: '12.7 MB', modified: daysAgo(150, 9, 0) },
    { id: 'f-sys-vid1', name: rec(7, 10, 15), folder: 'Videos/Captures', kind: 'mp4', size: '84.1 MB', modified: daysAgo(7, 10, 15) },
    { id: 'f-sys-vid2', name: 'Q3 all-hands recording.mp4', folder: 'Videos', kind: 'mp4', size: '1.21 GB', modified: daysAgo(20, 16, 30) },
    { id: 'f-sys-vid3', name: 'Concur expense walkthrough.mp4', folder: 'Videos', kind: 'mp4', size: '146 MB', modified: daysAgo(44, 11, 5) },

    // ── OneDrive - Northwind Global ──
    { id: 'f-sys-od1', name: 'Ops KPI Dashboard.xlsx', folder: 'OneDrive', kind: 'xlsx', size: '1.8 MB', modified: hoursAgo(6), open: { appId: 'excel' } },
    { id: 'f-sys-od2', name: 'Northwind org chart.pptx', folder: 'OneDrive', kind: 'pptx', size: '2.2 MB', modified: daysAgo(15, 9, 45), open: { appId: 'powerpoint' } },
    { id: 'f-sys-od3', name: 'Vendor scorecard Q3.xlsx', folder: 'OneDrive', kind: 'xlsx', size: '734 KB', modified: daysAgo(3, 14, 1), open: { appId: 'excel' } },
    { id: 'f-sys-od4', name: 'FY26_Budget_Template.xlsx', folder: 'OneDrive/Attachments', kind: 'xlsx', size: '1.2 MB', modified: daysAgo(1, 15, 12), open: { appId: 'excel' } },
    { id: 'f-sys-od5', name: 'Contoso renewal pricing.xlsx', folder: 'OneDrive/Microsoft Teams Chat Files', kind: 'xlsx', size: '88 KB', modified: daysAgo(2, 13, 20), open: { appId: 'excel' } },
    { id: 'f-sys-od6', name: 'Travel Policy 2025.pdf', folder: 'OneDrive/Documents', kind: 'pdf', size: '420 KB', modified: daysAgo(9, 9, 0), open: pdf('travel-policy') },
    { id: 'f-sys-od7', name: 'Rollout plan - Milan & Rotterdam.docx', folder: 'OneDrive/Documents', kind: 'docx', size: '210 KB', modified: hoursAgo(1), open: { appId: 'word' } },
  ]

  const folders = [
    { id: 'fld-contracts', name: 'Contracts', parent: 'Documents', created: daysAgo(300, 10, 0) },
    { id: 'fld-opsrev', name: 'Ops Reviews', parent: 'Documents', created: daysAgo(200, 10, 0) },
    { id: 'fld-vinv', name: 'Vendor Invoices', parent: 'Documents', created: daysAgo(31, 9, 2) },
    { id: 'fld-templates', name: 'Templates', parent: 'Documents', created: daysAgo(300, 10, 2) },
    { id: 'fld-camera', name: 'Camera Roll', parent: 'Pictures', created: daysAgo(380, 9, 0) },
    { id: 'fld-shots', name: 'Screenshots', parent: 'Pictures', created: daysAgo(380, 9, 0) },
    { id: 'fld-captures', name: 'Captures', parent: 'Videos', created: daysAgo(380, 9, 0) },
    { id: 'fld-od-docs', name: 'Documents', parent: 'OneDrive', created: daysAgo(380, 9, 0) },
    { id: 'fld-od-att', name: 'Attachments', parent: 'OneDrive', created: daysAgo(380, 9, 0) },
    { id: 'fld-od-teams', name: 'Microsoft Teams Chat Files', parent: 'OneDrive', created: daysAgo(380, 9, 0) },
  ]

  const recycle = [
    { id: 'rb-1', name: 'Vendor Spend FY25 (old).xlsx', kind: 'xlsx', size: '598 KB', originalFolder: 'Documents', deleted: daysAgo(1, 16, 14), modified: daysAgo(12, 10, 0) },
    { id: 'rb-2', name: 'draft - ops review v1.pptx', kind: 'pptx', size: '4.2 MB', originalFolder: 'Documents/Ops Reviews', deleted: daysAgo(3, 9, 20), modified: daysAgo(6, 18, 0) },
    { id: 'rb-3', name: 'New Text Document.txt', kind: 'txt', size: '0 KB', originalFolder: 'Desktop', deleted: daysAgo(5, 12, 2), modified: daysAgo(5, 12, 1) },
    { id: 'rb-4', name: shot(14, 9, 18), kind: 'img', size: '1.0 MB', originalFolder: 'Pictures/Screenshots', deleted: daysAgo(8, 17, 45), modified: daysAgo(14, 9, 18) },
    { id: 'rb-5', name: 'Teams_windows_x64 (1).exe', kind: 'exe', size: '132 MB', originalFolder: 'Downloads', deleted: daysAgo(10, 11, 30), modified: daysAgo(10, 11, 28) },
  ]

  const notes = [
    {
      id: 'n-todo',
      name: 'todo.txt',
      path: 'Desktop',
      modified: minutesAgo(55),
      content:
        'TODO — this week\n\n[x] Send Adatum pricing + rollout timeline (Elena)\n[ ] Post Fabrikam INV-20931 against PO 4500018234\n[ ] Litware LW-7781 — confirm license true-up count with IT (Grace)\n[ ] Expense the Chicago trip (Delta, Marriott, Uber, Oak Long Bar dinner)\n[ ] FY26 budget — Operations tab to Sofia by Wed\n[ ] Jordan Ellis onboarding: laptop, access, first-week calendar\n[ ] Q3 vendor spend summary for Priya (Thu ops review)\n[ ] Clean up Downloads folder\n',
    },
    {
      id: 'n-ops',
      name: 'Ops review - talking points.txt',
      path: 'Documents',
      modified: hoursAgo(3),
      content:
        'Q3 OPS REVIEW — TALKING POINTS\n==============================\n\n1. Warehouse SLA\n   - 97.2% on-time in Sep (target 96%), 3 escalations, all closed\n   - Chicago DC still the bottleneck on Mondays -> propose 2nd shift pilot\n\n2. Vendor spend\n   - Facilities (Fabrikam) +6% vs budget: Oct maintenance surge, one-off\n   - Software (Litware) true-up: 40 extra seats, already approved by Grace\n   - Logistics flat; renegotiation with Tailspin saved ~$38k annualized\n\n3. Automation\n   - AP invoice intake now handled by H-Worker (avg 4 min -> 40 s per invoice)\n   - Next: expense reports + IT ticket triage\n\n4. Asks\n   - Headcount: 1 Operations Analyst (Jordan Ellis starts Monday)\n   - Budget: $120k FY26 for warehouse scanners\n',
    },
    {
      id: 'n-vendors',
      name: 'Vendor contacts.txt',
      path: 'Documents',
      modified: daysAgo(6, 13, 2),
      content:
        'VENDOR CONTACTS\n\nFabrikam Supplies (facilities)\n  Mike Harrington — Accounts Receivable\n  mike.harrington@fabrikam.com · +1 (214) 555-0188\n  Vendor # 100482 · Net 30 · ACH\n\nLitware Inc. (software licenses)\n  Sam Patel — Billing\n  sam.patel@litware.com · +1 (303) 555-0123\n  Vendor # 100917 · Net 45\n\nTailspin Toys (logistics)\n  Dispatch desk · dispatch@tailspintoys.com\n  Vendor # 101236 · Net 30\n\nContoso Ltd (customer, renewal)\n  Kate Sullivan — Procurement Director\n  kate.sullivan@contoso.com\n',
    },
  ]

  const annotations = [
    { id: 'an-msa-1', doc: 'contoso-msa', kind: 'note', field: 'liability', page: 2, text: 'Contoso wants the cap at 12 months of fees — we proposed 24. Legal OK to meet at 18?', author: 'Kate Sullivan', date: daysAgo(3, 15, 12) },
    { id: 'an-msa-2', doc: 'contoso-msa', kind: 'highlight', field: 'liability', page: 2, author: 'Kate Sullivan', date: daysAgo(3, 15, 11) },
    { id: 'an-msa-3', doc: 'contoso-msa', kind: 'note', field: 'term', page: 1, text: 'Renewal term: 3 years, auto-renew with 90-day notice. Matches the order form.', author: 'Alex Morgan', date: daysAgo(3, 16, 2) },
    { id: 'an-tp-1', doc: 'travel-policy', kind: 'highlight', field: 'meals', page: 2, author: 'Alex Morgan', date: daysAgo(9, 9, 30) },
  ]

  return {
    files,
    'explorer.folders': folders,
    'explorer.recycle': recycle,
    'notepad.notes': notes,
    'acrobat.annotations': annotations,
  }
}
