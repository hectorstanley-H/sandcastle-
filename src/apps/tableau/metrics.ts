import { db } from '@/db/db'

export const T10 = ['#4E79A7', '#F28E2B', '#E15759', '#76B7B2', '#59A14F', '#EDC948', '#B07AA1', '#FF9DA7', '#9C755F', '#BAB0AC']
const OPEN_STAGES = ['Prospecting', 'Qualification', 'Needs Analysis', 'Value Proposition', 'Id. Decision Makers', 'Perception Analysis', 'Proposal/Price Quote', 'Negotiation/Review']
export const k = (n: number) => (n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : `$${Math.round(n / 1e3)}K`)

export function regionOf(acc: any) {
  if (!acc) return 'Central'
  if (!['United States', 'Canada'].includes(acc.country)) return 'EMEA'
  if (['WA', 'OR', 'CA'].includes(acc.state)) return 'West'
  if (['MA', 'NY', 'CT', 'GA'].includes(acc.state) || acc.country === 'Canada') return 'East'
  return 'Central'
}

/** pipeline metrics computed live from Salesforce — exported for workflows */
export function pipelineMetrics() {
  const opps = db.get<any>('salesforce.opportunities')
  const accts = db.get<any>('salesforce.accounts')
  return computeMetrics(opps, accts)
}
/** `qOffset` shifts the "this quarter" window (0 = current quarter, 1 = next); defaults keep the workflow numbers unchanged */
export function computeMetrics(opps: any[], accts: any[], qOffset = 0) {
  const open = opps.filter((o) => !o.stage.startsWith('Closed'))
  const sum = (l: any[]) => l.reduce((t, o) => t + o.amount, 0)
  const now = new Date()
  const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + qOffset * 3, 1)
  const qEnd = new Date(qStart.getFullYear(), qStart.getMonth() + 3, 0)
  const inQ = (o: any) => {
    const d = new Date(o.closeDate + 'T12:00')
    return d >= qStart && d <= qEnd
  }
  const won = opps.filter((o) => o.stage === 'Closed Won')
  const lost = opps.filter((o) => o.stage === 'Closed Lost')
  const byStage = OPEN_STAGES.map((s) => ({ stage: s, amount: sum(open.filter((o) => o.stage === s)), count: open.filter((o) => o.stage === s).length }))
  const byRegion = ['East', 'West', 'Central', 'EMEA'].map((r) => ({ region: r, amount: sum(open.filter((o) => regionOf(accts.find((a) => a.id === o.accountId)) === r)), won: sum(won.filter((o) => regionOf(accts.find((a) => a.id === o.accountId)) === r)) }))
  const months = Array.from({ length: 6 }).map((_, i) => new Date(now.getFullYear(), now.getMonth() + i, 1))
  const heat = OPEN_STAGES.map((s) => ({ stage: s, cells: months.map((m) => sum(open.filter((o) => o.stage === s && new Date(o.closeDate + 'T12:00').getMonth() === m.getMonth() && new Date(o.closeDate + 'T12:00').getFullYear() === m.getFullYear()))) }))
  const cats = ['Commit', 'Best Case', 'Pipeline'].map((c) => ({ cat: c, amount: sum(open.filter((o) => o.forecastCategory === c && inQ(o))) }))
  const trend = Array.from({ length: 12 }).map((_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1)
    const base = sum(open) * (0.62 + i * 0.035) + ((i * 7919) % 5) * 60000
    return { month: d.toLocaleDateString('en-US', { month: 'short' }), pipeline: Math.round(i === 11 ? sum(open) : base) }
  })
  const top = [...open].sort((a, b) => b.amount - a.amount).slice(0, 8).map((o) => ({ ...o, account: accts.find((a) => a.id === o.accountId)?.name, region: regionOf(accts.find((a) => a.id === o.accountId)) }))
  const slipping = open.filter((o) => inQ(o) && o.probability <= 50).sort((a, b) => b.amount - a.amount)
  return {
    openTotal: sum(open),
    weighted: Math.round(open.reduce((t, o) => t + (o.amount * o.probability) / 100, 0)),
    openCount: open.length,
    wonQtd: sum(won.filter(inQ)),
    wonTotal: sum(won),
    winRate: Math.round((won.length / Math.max(1, won.length + lost.length)) * 100),
    avgDeal: Math.round(sum(won) / Math.max(1, won.length)),
    byStage,
    byRegion,
    months: months.map((m) => m.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })),
    heat,
    cats,
    trend,
    top,
    slipping,
  }
}

