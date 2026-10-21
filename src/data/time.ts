/** Time helpers. Seeds are generated relative to "now" at reset time, so the demo always looks fresh. */
const MIN = 60_000
const DAY = 86_400_000

export const minutesAgo = (m: number) => new Date(Date.now() - m * MIN).toISOString()
export const hoursAgo = (h: number) => new Date(Date.now() - h * 60 * MIN).toISOString()
/** n days ago at hh:mm local time */
export const daysAgo = (n: number, hh = 9, mm = 0) => {
  const d = new Date(Date.now() - n * DAY)
  d.setHours(hh, mm, 0, 0)
  return d.toISOString()
}
/** n days from now at hh:mm local time */
export const daysFromNow = (n: number, hh = 9, mm = 0) => daysAgo(-n, hh, mm)
/** today at hh:mm */
export const today = (hh = 9, mm = 0) => daysAgo(0, hh, mm)
/** n business days ago/ahead (skips weekends) */
export const businessDays = (n: number, hh = 9, mm = 0) => {
  const d = new Date()
  let left = Math.abs(n)
  const step = n >= 0 ? 1 : -1
  while (left > 0) {
    d.setDate(d.getDate() + step)
    if (d.getDay() !== 0 && d.getDay() !== 6) left--
  }
  d.setHours(hh, mm, 0, 0)
  return d.toISOString()
}
/** YYYY-MM-DD */
export const isoDate = (iso: string | Date) => {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
export const fmtDate = (iso: string, opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }) =>
  new Date(iso).toLocaleDateString('en-US', opts)
export const fmtDateShort = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })

/** Outlook-style: time if today, weekday if this week, else date */
export const fmtSmart = (iso: string) => {
  const d = new Date(iso)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) return fmtTime(iso)
  const diff = (now.getTime() - d.getTime()) / DAY
  if (diff < 6 && diff > 0) return d.toLocaleDateString('en-US', { weekday: 'short' }) + ' ' + fmtTime(iso)
  return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' })
}

export const relative = (iso: string) => {
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 45) return 'just now'
  if (s < 3600) return `${Math.round(s / 60)}m ago`
  if (s < 86400) return `${Math.round(s / 3600)}h ago`
  return `${Math.round(s / 86400)}d ago`
}

export const money = (n: number, currency = 'USD') =>
  n.toLocaleString('en-US', { style: 'currency', currency, minimumFractionDigits: 2 })
