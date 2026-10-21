import type { Workflow } from '@/agent/types'
import { db } from '@/db/db'
import { person } from '@/data/people'
import { invoiceFields } from '@/apps/acrobat/docs'

const newestSent = (pred: (e: any) => boolean) =>
  db
    .get<any>('outlook.emails')
    .filter((e) => e.folder === 'sent' && pred(e))
    .sort((a, b) => +new Date(b.date) - +new Date(a.date))[0]?.id

const loosePdfs = () => db.get<any>('files').filter((f) => f.folder === 'Downloads' && /\.pdf$/i.test(f.name))
const isReceipt = (f: any) => String(f.open?.params?.doc ?? '').startsWith('rcpt-')
const isInvoice = (f: any) => String(f.open?.params?.doc ?? '').startsWith('inv-')

export const workflows: Workflow[] = [
  {
    id: 'explorer-organize-downloads',
    title: 'Organize my Downloads folder',
    description: 'Sorts loose PDFs in Downloads into Receipts and Invoices folders and gives cryptic files proper names.',
    category: 'Operations',
    apps: ['explorer'],
    timeSaved: '10 min',
    keywords: ['downloads', 'organize', 'tidy', 'clean up', 'folder', 'files', 'sort', 'receipts', 'invoices', 'file explorer', 'rename'],
    examples: ['Clean up my Downloads folder', 'Sort my receipts and invoices into folders'],
    nudge: () => {
      const n = loosePdfs().filter((f) => isReceipt(f) || isInvoice(f)).length
      return n >= 3 ? `${n} receipts and invoices are loose in your Downloads folder` : null
    },
    plan: ['Open File Explorer and review Downloads', 'Create Receipts and Invoices folders', 'Move receipts into Receipts', 'Move invoices into Invoices', 'Rename files with unclear names'],
    async run(a) {
      a.step(0)
      await a.open('explorer')
      await a.waitFor('@explorer-nav-downloads', 25000)
      await a.click('@explorer-nav-downloads', { label: 'Downloads' })
      const pdfs = loosePdfs()
      const receipts = pdfs.filter(isReceipt)
      const invoices = pdfs.filter(isInvoice)
      await a.think(
        `Downloads has ${db.get<any>('files').filter((f) => f.folder === 'Downloads').length} items. ${receipts.length} are travel & meal receipts (Uber, Marriott, Delta, Oak Long Bar) and ${invoices.length} are vendor invoices (Fabrikam, Litware) — I'll file them so they're easy to find at expense and AP time.`,
        2000,
      )

      a.step(1)
      for (const name of ['Receipts', 'Invoices']) {
        if (db.get<any>('explorer.folders').some((f) => f.parent === 'Downloads' && f.name === name)) continue
        await a.click('@explorer-new', { label: 'New' })
        await a.click('@explorer-new-folder', { label: 'Folder' })
        await a.type('@explorer-rename-input', name, { clear: true, label: 'folder name' })
        await a.press('Enter')
        await a.wait(300)
      }

      const move = async (list: any[], folder: string) => {
        await a.click(`@explorer-file-${list[0].id}`, { label: list[0].name })
        for (const f of list.slice(1)) await a.click(`@explorer-check-${f.id}`, { label: f.name })
        await a.click('@explorer-cut', { label: 'Cut' })
        await a.doubleClick(`@explorer-folder-${folder.toLowerCase()}`, { label: folder })
        await a.click('@explorer-paste', { label: 'Paste' })
        await a.wait(500)
      }

      a.step(2)
      await move(receipts, 'Receipts')
      await a.think(`${receipts.length} receipts filed. Back to Downloads for the invoices.`, 900)
      await a.click('@explorer-up', { label: 'Up to Downloads' })

      a.step(3)
      await move(invoices, 'Invoices')
      await a.click('@explorer-up', { label: 'Up to Downloads' })

      a.step(4)
      await a.doubleClick('@explorer-folder-receipts', { label: 'Receipts' })
      const vague = db.get<any>('files').find((f) => f.folder === 'Downloads/Receipts' && /\(\d+\)|^download|^receipt\b/i.test(f.name))
      let renamed = 0
      if (vague) {
        await a.think(`“${vague.name}” doesn’t say what it is — it’s the Delta eTicket receipt for BOS ⇄ ORD, confirmation GH7Q2K. Renaming it to match the other receipts.`, 1600)
        await a.click(`@explorer-file-${vague.id}`, { label: vague.name })
        await a.click('@explorer-rename', { label: 'Rename' })
        await a.type('@explorer-rename-input', 'Delta_eTicket_GH7Q2K.pdf', { clear: true, label: 'file name' })
        await a.press('Enter')
        renamed = 1
        await a.wait(500)
      }
      return {
        summary: `Created Receipts and Invoices in Downloads, filed ${receipts.length} receipts and ${invoices.length} invoices, and renamed ${renamed} unclear file.`,
        outputs: [
          { label: 'Open Downloads › Receipts', appId: 'explorer', params: { path: 'Downloads/Receipts' } },
          { label: 'Open Downloads › Invoices', appId: 'explorer', params: { path: 'Downloads/Invoices' } },
          { label: 'Open Downloads', appId: 'explorer', params: { path: 'Downloads' } },
        ],
        metrics: [
          { label: 'Files moved', value: String(receipts.length + invoices.length) },
          { label: 'Folders created', value: '2' },
          { label: 'Renamed', value: String(renamed) },
        ],
      }
    },
  },
  {
    id: 'acrobat-extract-invoice-data',
    title: 'Extract invoice data for AP',
    description: 'Opens the Fabrikam invoice PDF, checks the PO, amount and terms, annotates it in Acrobat, and sends Accounts Payable a clean summary.',
    category: 'Finance',
    apps: ['outlook', 'acrobat'],
    timeSaved: '15 min',
    featured: true,
    keywords: ['invoice', 'extract', 'pdf', 'acrobat', 'fabrikam', 'accounts payable', 'ap', 'emma', 'po', 'data entry', 'read invoice', 'attachment'],
    examples: ['Pull the details out of the Fabrikam invoice and send them to AP', 'Read the invoice PDF and email Emma the fields'],
    nudge: () => {
      const done = db.get<any>('outlook.emails').some((e) => e.folder === 'sent' && e.replyTo === 'em-invoice-fabrikam')
      return done ? null : 'Fabrikam invoice INV-20931 ($14,250.00) is waiting to go to Accounts Payable'
    },
    plan: ['Open the Fabrikam invoice email', 'Open the PDF attachment in Acrobat', 'Extract and verify vendor, PO, amount, terms and due date', 'Highlight key fields and add a review note', 'Send the extracted data to Emma in AP'],
    async run(a) {
      const f = invoiceFields('inv-fabrikam')
      const emma = person('emma')
      a.step(0)
      await a.open('outlook')
      await a.waitFor('@outlook-folder-inbox', 25000)
      await a.click('@outlook-folder-inbox', { label: 'Inbox' })
      await a.click('@outlook-email-em-invoice-fabrikam', { label: 'Invoice INV-20931 — Mike Harrington' })
      await a.think('Mike from Fabrikam sent INV-20931 for October facilities work against PO 4500018234. The body says $14,250.00, Net 30 — I’ll verify that against the PDF itself rather than trust the email.', 1700)

      a.step(1)
      await a.click('@outlook-attachment-em-invoice-fabrikam-0', { label: 'INV-20931.pdf' })
      await a.waitFor('@acrobat-page-1', 25000)
      await a.wait(800)

      a.step(2)
      await a.scrollTo('@acrobat-field-invoiceNo', { label: 'Invoice header' })
      await a.think(`Header: invoice ${f.invoiceNo}, dated ${f.invoiceDate}, PO ${f.po}, terms ${f.terms} → due ${f.dueDate}.`, 1500)
      await a.scrollTo('@acrobat-field-total', { label: 'Totals' })
      await a.think('Five line items: HVAC $4,800 + janitorial $5,200 + elevators 2 × $650 + fire suppression $1,450 + LED retrofit $1,500 = $14,250.00. Matches the amount due, no sales tax (services exempt).', 2000)

      a.step(3)
      await a.click('@acrobat-tool-highlight', { label: 'Highlight text' })
      for (const [k, l] of [
        ['invoiceNo', 'Invoice #'],
        ['po', 'PO number'],
        ['dueDate', 'Due date'],
        ['total', 'Amount due'],
      ]) {
        await a.click(`@acrobat-field-${k}`, { label: l })
      }
      await a.click('@acrobat-tool-comment', { label: 'Add a comment' })
      await a.click('@acrobat-field-po', { label: 'PO number' })
      await a.type('@acrobat-comment-input', `Reviewed by H-Worker for Alex: PO ${f.po} matches, line items sum to ${f.amount}, ${f.terms} → due ${f.dueDate}. Ready to post.`, { label: 'comment' })
      await a.click('@acrobat-comment-post', { label: 'Post' })
      await a.wait(600)

      a.step(4)
      await a.focus('outlook')
      await a.click('@outlook-email-em-invoice-fabrikam', { label: 'Invoice INV-20931' })
      await a.click('@outlook-forward', { label: 'Forward' })
      await a.type('@outlook-compose-to', emma.email, { fast: true, label: 'To' })
      await a.press('Enter')
      await a.type(
        '@outlook-compose-body',
        `Hi Emma,\n\nFabrikam’s invoice is attached — I checked the PDF against the PO and everything lines up. Fields for posting:\n\n• Vendor: ${f.vendor} (vendor # 100482)\n• Invoice #: ${f.invoiceNo}\n• Invoice date: ${f.invoiceDate}\n• PO number: ${f.po}\n• Amount due: ${f.amount} (no sales tax — services exempt)\n• Payment terms: ${f.terms}\n• Due date: ${f.dueDate}\n\nLine items: HVAC maintenance $4,800 · Janitorial $5,200 · Elevator service $1,300 · Fire suppression test $1,450 · LED retrofit $1,500 — they sum to the invoice total.\n\nKey fields are highlighted in the PDF with a review note. OK to post and schedule payment for ${f.dueDate}.\n`,
        { label: 'message body' },
      )
      await a.click('@outlook-send', { label: 'Send' })
      await a.wait(900)
      const id = newestSent((e) => e.replyTo === 'em-invoice-fabrikam')
      return {
        summary: `Verified Fabrikam invoice ${f.invoiceNo} (${f.amount}, PO ${f.po}, ${f.terms}, due ${f.dueDate}), annotated the PDF in Acrobat and forwarded the extracted fields to Emma Schultz in AP.`,
        outputs: [
          { label: 'View the email to Emma', appId: 'outlook', params: { view: 'mail', folder: 'sent', emailId: id } },
          { label: 'Open the annotated invoice in Acrobat', appId: 'acrobat', params: { doc: 'inv-fabrikam' } },
        ],
        metrics: [
          { label: 'Fields extracted', value: '7' },
          { label: 'Amount verified', value: f.amount },
          { label: 'Annotations', value: '5' },
        ],
      }
    },
  },
]
