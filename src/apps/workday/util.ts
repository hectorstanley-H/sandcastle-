import { isoDate } from '@/data/time'

/** next Monday (at least 1 day from now) at 00:00 local */
export function nextMonday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 1)
  while (d.getDay() !== 1) d.setDate(d.getDate() + 1)
  return d
}

/** US company holidays for a year: iso → name */
export function holidays(year: number): Record<string, string> {
  const nth = (month: number, dow: number, n: number) => {
    const d = new Date(year, month, 1)
    while (d.getDay() !== dow) d.setDate(d.getDate() + 1)
    d.setDate(d.getDate() + 7 * (n - 1))
    return isoDate(d)
  }
  const last = (month: number, dow: number) => {
    const d = new Date(year, month + 1, 0)
    while (d.getDay() !== dow) d.setDate(d.getDate() - 1)
    return isoDate(d)
  }
  const thx = nth(10, 4, 4)
  const dayAfter = new Date(thx + 'T00:00:00')
  dayAfter.setDate(dayAfter.getDate() + 1)
  return {
    [`${year}-01-01`]: "New Year's Day",
    [nth(0, 1, 3)]: 'Martin Luther King Jr. Day',
    [last(4, 1)]: 'Memorial Day',
    [`${year}-06-19`]: 'Juneteenth',
    [`${year}-07-04`]: 'Independence Day',
    [nth(8, 1, 1)]: 'Labor Day',
    [thx]: 'Thanksgiving Day',
    [isoDate(dayAfter)]: 'Day after Thanksgiving',
    [`${year}-12-25`]: 'Christmas Day',
  }
}

export const holidayName = (iso: string) => holidays(Number(iso.slice(0, 4)))[iso]
export const isWeekend = (iso: string) => {
  const d = new Date(iso + 'T00:00:00').getDay()
  return d === 0 || d === 6
}
/** hours charged for a time-off day (0 on weekends and company holidays) */
export const chargeHours = (iso: string) => (isWeekend(iso) || holidayName(iso) ? 0 : 8)

export const fmtLong = (iso: string) => new Date(iso.length === 10 ? iso + 'T00:00:00' : iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
export const fmtMDY = (iso: string) => new Date(iso.length === 10 ? iso + 'T00:00:00' : iso).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
export const fmtDays = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(1)} ${n === 1 ? 'Day' : 'Days'}`

export const workerOf = (personId: string) => `wd-${personId}`
