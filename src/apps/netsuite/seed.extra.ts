/**
 * Extra NetSuite records (appended to the demo DB by src/db/seeds/extras.ts).
 * netsuite.vendors        { id, name, category, terms, email, phone, address, taxId, contact }
 * netsuite.customers      { id, name, terms, email, phone, salesRep, creditLimit }
 * netsuite.invoices       { id, number, customer, date, dueDate, amount, status: 'Open'|'Paid In Full', memo }
 * netsuite.purchaseOrders { id, number, vendor, date, amount, memo, status: 'Pending Supervisor Approval'|'Pending Receipt'|'Rejected', requestor }
 * netsuite.vendorReturns  { id, number, vendor, date, amount, memo, status }
 * netsuite.tasks          { id, title, due, priority, status: 'Not Started'|'In Progress'|'Completed', assignedTo, related? }
 */
import type { Collections } from '@/db/db'
import { daysAgo, daysFromNow } from '@/data/time'

export function seed(): Collections {
  const V: [string, string, string, string, string, string][] = [
    ['Fabrikam Supplies', 'Facilities', 'Net 30', 'ar@fabrikam.com', '(617) 555-0142', 'Mike Harrington'],
    ['Litware Inc.', 'Software', 'Net 45', 'billing@litware.com', '(206) 555-0177', 'Sam Okafor'],
    ['Contoso Ltd', 'Professional Services', 'Net 30', 'ap@contoso.com', '(312) 555-0199', 'Kate Sullivan'],
    ['Relecloud', 'Cloud Hosting', 'Net 30', 'invoices@relecloud.com', '(425) 555-0110', 'Dana Whitfield'],
    ['City Power & Light', 'Utilities', 'Due on receipt', 'billing@cpandl.com', '(617) 555-0101', 'Customer Service'],
    ['A. Datum Logistics', 'Freight', 'Net 30', 'freight@adatum.com', '(773) 555-0163', 'Raj Patel'],
    ['Proseware, Inc.', 'Software', 'Net 30', 'ar@proseware.com', '(415) 555-0135', 'Lena Fischer'],
    ['Northwind Traders', 'Office Supplies', 'Net 15', 'orders@northwindtraders.com', '(617) 555-0188', 'Tom Becker'],
    ['Humongous Insurance', 'Insurance', 'Net 30', 'premiums@humongous.com', '(860) 555-0150', 'Grace Liu'],
    ['Consolidated Messenger', 'Freight', 'Net 30', 'billing@consolidatedmessenger.com', '(212) 555-0122', 'Owen Price'],
    ['Trey Research', 'Professional Services', 'Net 45', 'finance@treyresearch.net', '(617) 555-0171', 'Mia Novak'],
    ['Fourth Coffee', 'Office Supplies', 'Net 15', 'catering@fourthcoffee.com', '(617) 555-0109', 'Jules Martin'],
  ]
  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  const vendors = V.map(([name, category, terms, email, phone, contact], i) => ({
    id: `nsv-${slug(name)}`, name, category, terms, email, phone, contact,
    address: `${100 + i * 37} ${['Main', 'Congress', 'Summer', 'Atlantic', 'Boylston', 'State'][i % 6]} St, Boston, MA 021${String(10 + i).padStart(2, '0')}`,
    taxId: `${20 + i}-${String(5510000 + i * 4231).slice(0, 7)}`,
  }))

  const C: [string, string, number][] = [
    ['Contoso Ltd', 'Liam Carter', 750000], ['Adatum Corporation', 'Elena Rossi', 400000], ['Tailspin Toys', 'Noah Kim', 150000],
    ['Wide World Importers', 'Ava Brooks', 250000], ['Woodgrove Bank', 'Ethan Shaw', 500000], ['Alpine Ski House', 'Zoe Hart', 80000],
  ]
  const customers = C.map(([name, salesRep, creditLimit], i) => ({
    id: `nsc-${slug(name)}`, name, salesRep, creditLimit, terms: 'Net 30', email: `ap@${slug(name).replace(/-/g, '')}.com`, phone: `(617) 555-02${String(10 + i)}`,
  }))

  const inv: [string, number, number][] = [
    ['Contoso Ltd', 72, 38400], ['Adatum Corporation', 64, 12650], ['Tailspin Toys', 58, 4320.5], ['Wide World Importers', 51, 18990],
    ['Alpine Ski House', 47, 2875], ['Contoso Ltd', 41, 26100], ['Woodgrove Bank', 36, 9400], ['Adatum Corporation', 22, 15200],
    ['Tailspin Toys', 14, 6110], ['Wide World Importers', 6, 11480],
  ]
  const invoices = inv.map(([customer, days, amount], i) => ({
    id: `nsi-${10490 + i}`, number: `INV-${10490 + i}`, customer, date: daysAgo(days), dueDate: daysAgo(days - 30), amount, status: 'Open', memo: 'Northwind Global Enterprise subscription',
  }))

  const purchaseOrders = [
    ['PO-6621', 'Northwind Traders', 3, 2480, 'Ergonomic chairs — Ops hires', 'Pending Supervisor Approval', 'James Wilson'],
    ['PO-6624', 'Relecloud', 2, 18600, 'Reserved instances — Q1 commit', 'Pending Supervisor Approval', 'Grace Kim'],
    ['PO-6625', 'Trey Research', 2, 9750, 'Market study — EMEA expansion', 'Pending Supervisor Approval', 'Priya Raman'],
    ['PO-6627', 'A. Datum Logistics', 1, 3340, 'Freight — November replenishment', 'Pending Supervisor Approval', 'James Wilson'],
    ['PO-6610', 'Fabrikam Supplies', 9, 14250, 'Facilities services — October', 'Pending Receipt', 'Alex Morgan'],
    ['PO-6602', 'Litware Inc.', 14, 3980, 'Analytics Pro license true-up', 'Pending Receipt', 'Grace Kim'],
  ].map(([number, vendor, days, amount, memo, status, requestor]) => ({ id: `nsp-${String(number).slice(3)}`, number, vendor, date: daysAgo(days as number), amount, memo, status, requestor }))

  const vendorReturns = [
    { id: 'nsr-118', number: 'VRA-118', vendor: 'Northwind Traders', date: daysAgo(3), amount: 412.8, memo: 'Damaged toner cartridges (6)', status: 'Pending Approval' },
    { id: 'nsr-112', number: 'VRA-112', vendor: 'Proseware, Inc.', date: daysAgo(21), amount: 1200, memo: 'Unused seats — credit', status: 'Credited' },
  ]

  const tasks = [
    ['Review October accruals', 1, 'High', 'In Progress', 'Alex Morgan'],
    ['Woodgrove ••••4410 bank rec', 2, 'High', 'Not Started', 'Alex Morgan'],
    ['Approve pending journal entries', 2, 'Medium', 'Not Started', 'Sofia Martinez'],
    ['Fixed asset roll-forward', 4, 'Medium', 'Not Started', 'Alex Morgan'],
    ['Intercompany reconciliation — EMEA', 5, 'Low', 'Not Started', 'Alex Morgan'],
    ['Vendor 1099 review', -3, 'Low', 'Completed', 'Alex Morgan'],
  ].map(([title, d, priority, status, assignedTo], i) => ({ id: `nst-${i + 1}`, title, due: daysFromNow(d as number), priority, status, assignedTo }))

  return {
    'netsuite.vendors': vendors,
    'netsuite.customers': customers,
    'netsuite.invoices': invoices,
    'netsuite.purchaseOrders': purchaseOrders,
    'netsuite.vendorReturns': vendorReturns,
    'netsuite.tasks': tasks,
  }
}
