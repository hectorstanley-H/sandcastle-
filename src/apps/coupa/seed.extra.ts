/**
 * Extra Coupa records (appended to the seed): requisitions from Alex's direct reports that are waiting
 * on Alex as approver, so the Approvals inbox has real work. Numbers stay below the seeded range
 * (4790+) so the next requisition number is unchanged.
 */
import type { Collections } from '@/db/db'
import { person } from '@/data/people'
import { daysAgo, isoDate } from '@/data/time'

export function seed(): Collections {
  const P = (id: string) => person(id).name
  const mk = (n: number, title: string, who: string, commodity: string, lines: [string, string, string, number, number, string][], days: number, justification: string, extra: any[] = []) => {
    const ls = lines.map(([itemId, name, supplier, qty, price, unit]) => ({ itemId, name, supplier, qty, price, unit }))
    const total = Math.round(ls.reduce((t, l) => t + l.qty * l.price, 0) * 100) / 100
    return {
      id: `creq-${n}`,
      number: String(n),
      title,
      requestedBy: P(who),
      shipTo: 'Northwind Global — Boston HQ, 1 Federal St, Boston, MA 02110',
      needBy: isoDate(daysAgo(-10)),
      commodity,
      costCenter: '6105 — Operations',
      justification,
      lines: ls,
      total,
      status: 'Pending Approval',
      submittedAt: daysAgo(days, 11, 20),
      approvals: [{ name: P('alex'), role: 'Manager approval', status: 'pending' }, ...extra],
    }
  }
  return {
    'coupa.requisitions': [
      mk(4784, 'Docking station + keyboard — Ben Carter', 'ben', 'IT Hardware', [
        ['cpi-wd19s', 'Dell Universal Dock — UD22 (USB-C, 96W)', 'Dell Technologies', 1, 239, 'EA'],
        ['cpi-km7321', 'Dell Premier Multi-Device Wireless Keyboard and Mouse — KM7321W', 'Dell Technologies', 1, 89.99, 'EA'],
      ], 0, 'Current dock is failing intermittently (USB-C power drops). Replacing with the standard UD22 and wireless set.', [{ name: P('grace'), role: 'IT Commodity Approver', status: 'waiting' }]),
      mk(4783, 'Notebooks + pens — ops onboarding kits', 'maya', 'Office Supplies', [
        ['cpi-notebook', 'Moleskine Classic Notebook, Large, Ruled, Black', 'Staples', 6, 22.5, 'EA'],
        ['cpi-pens', 'Pilot G2 Retractable Gel Pens, Fine Point, Black, 12/Pack', 'Staples', 3, 14.29, 'PK'],
      ], 1, 'Welcome kits for the three November Operations hires.'),
      mk(4782, 'Ergonomic chair — Jordan Ellis desk', 'maya', 'Facilities', [
        ['cpi-chair', 'Steelcase Series 2 Office Chair, Graphite', 'Staples', 1, 629, 'EA'],
      ], 2, 'Standard ergonomic chair for the new analyst desk on 4th floor.'),
    ],
  }
}
