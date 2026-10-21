/**
 * Power BI seed.
 *
 * powerbi.workspaces: { id, name, slug, guid, color, description, capacity, members: string[] (person ids) }
 *
 * powerbi.reports: {
 *   id, guid, name, workspace (workspace name), type: 'report'|'dashboard'|'semanticModel'|'dataflow',
 *   owner (person id), lastRefreshed (ISO), nextRefresh?: ISO, refreshedBy?: 'hworker',
 *   lastOpened?: ISO, favorite?: boolean, endorsement?: 'Promoted'|'Certified', sensitivity: 'General'|'Confidential'|...,
 *   description?, pages?: string[], reportId?: (semantic model/dashboard → report whose data it mirrors)
 *   // ops-report data (rpt-ops-kpi)
 *   kpis, prevKpis, targets, pendingKpis?, pendingData?, fiscalWeek, weekRange,
 *   weekly: {week, orders, onTime, ordersLY}[], byRegion: {region, dc, city, lat, lon, orders, prevOrders, onTime, sla,
 *   cycleDays, backorders, costPerOrder, pickAccuracy, dockToStockHrs}[], byCarrier: {carrier, orders, onTime, transitDays,
 *   costPerShipment}[], backorderCats: {category, units}[], cycleStages: {stage, days}[],
 *   vendors: {vendor, category, spend, prevSpend, pos, onTime}[], spendMonthly: {month, spend, budget}[],
 *   // generic report data (other reports)
 *   generic?: { cards: {label, value, fmt, prev?, target?}[], line, bars, donut, table }
 *   sharedWith?: string[] (emails), sharedBy?: 'hworker', shareMessage?, history?: {id,start,end,type,status,error?,by?}[],
 *   exports?: {format, at, by?}[]
 * }
 */
import { daysAgo, daysFromNow, hoursAgo, minutesAgo } from '@/data/time'

export interface Kpis {
  onTimeDelivery: number
  orderCycleTimeDays: number
  warehouseSla: number
  costPerOrder: number
  ordersShipped: number
  backorders: number
  returnsRate: number
  openIncidents?: number
}

const REGIONS = [
  { region: 'Northeast', dc: 'DC-01 Newark', city: 'Newark, NJ', lat: 40.73, lon: -74.17, share: 0.24, ot: 1.1, sla: 0.6, cyc: -0.2, cost: -0.12, pick: 99.6, dock: 5.2 },
  { region: 'Southeast', dc: 'DC-02 Atlanta', city: 'Atlanta, GA', lat: 33.75, lon: -84.39, share: 0.19, ot: -2.3, sla: -1.4, cyc: 0.5, cost: 0.21, pick: 98.9, dock: 7.9 },
  { region: 'Midwest', dc: 'DC-03 Joliet', city: 'Joliet, IL', lat: 41.53, lon: -88.08, share: 0.18, ot: 0.6, sla: 0.4, cyc: -0.1, cost: -0.05, pick: 99.4, dock: 5.8 },
  { region: 'South Central', dc: 'DC-04 Dallas', city: 'Dallas, TX', lat: 32.78, lon: -96.8, share: 0.15, ot: -0.8, sla: -0.3, cyc: 0.2, cost: 0.08, pick: 99.1, dock: 6.6 },
  { region: 'West', dc: 'DC-05 Ontario', city: 'Ontario, CA', lat: 34.06, lon: -117.65, share: 0.14, ot: 1.5, sla: 0.8, cyc: -0.3, cost: 0.02, pick: 99.7, dock: 4.9 },
  { region: 'Northwest', dc: 'DC-06 Kent', city: 'Kent, WA', lat: 47.38, lon: -122.23, share: 0.1, ot: -0.2, sla: 0.1, cyc: 0.1, cost: 0.14, pick: 99.2, dock: 6.1 },
]

const CARRIERS = [
  { carrier: 'UPS', share: 0.34, ot: 0.9, transit: 2.1, cost: 9.84 },
  { carrier: 'FedEx', share: 0.27, ot: 0.4, transit: 2.3, cost: 10.42 },
  { carrier: 'XPO Logistics', share: 0.16, ot: -1.8, transit: 3.4, cost: 18.7 },
  { carrier: 'Old Dominion', share: 0.12, ot: -0.6, transit: 3.1, cost: 21.15 },
  { carrier: 'USPS', share: 0.07, ot: -2.9, transit: 3.8, cost: 6.12 },
  { carrier: 'OnTrac', share: 0.04, ot: 0.2, transit: 1.9, cost: 8.35 },
]

const r1 = (n: number) => Math.round(n * 10) / 10
const r2 = (n: number) => Math.round(n * 100) / 100

function split(total: number, shares: number[]) {
  const out = shares.map((s) => Math.round(total * s))
  out[out.length - 1] += total - out.reduce((a, b) => a + b, 0)
  return out
}

function opsBreakdown(k: Kpis, prevOrders: number[], dockAdj = 0) {
  const orders = split(k.ordersShipped, REGIONS.map((r) => r.share))
  const back = split(k.backorders, [0.17, 0.31, 0.14, 0.18, 0.08, 0.12])
  const byRegion = REGIONS.map((r, i) => ({
    region: r.region,
    dc: r.dc,
    city: r.city,
    lat: r.lat,
    lon: r.lon,
    orders: orders[i],
    prevOrders: prevOrders[i],
    onTime: r1(Math.min(99.6, k.onTimeDelivery + r.ot)),
    sla: r1(Math.min(99.9, k.warehouseSla + r.sla)),
    cycleDays: r1(k.orderCycleTimeDays + r.cyc),
    backorders: back[i],
    costPerOrder: r2(k.costPerOrder + r.cost),
    pickAccuracy: r1(Math.min(99.9, r.pick + (k.warehouseSla - 97.2) * 0.2)),
    dockToStockHrs: r1(r.dock + dockAdj),
  }))
  const corders = split(k.ordersShipped, CARRIERS.map((c) => c.share))
  const byCarrier = CARRIERS.map((c, i) => ({
    carrier: c.carrier,
    orders: corders[i],
    onTime: r1(Math.min(99.5, k.onTimeDelivery + c.ot)),
    transitDays: r1(c.transit + (k.orderCycleTimeDays - 3.1) * 0.4),
    costPerShipment: r2(c.cost + (k.costPerOrder - 4.31) * 1.6),
  }))
  const cats = split(k.backorders, [0.29, 0.22, 0.18, 0.14, 0.1, 0.07])
  const backorderCats = ['Packaging supplies', 'Industrial fasteners', 'Safety equipment', 'Janitorial', 'Office products', 'Electrical'].map(
    (category, i) => ({ category, units: cats[i] }),
  )
  const c = k.orderCycleTimeDays
  const cycleStages = [
    { stage: 'Order to release', days: r1(c * 0.18) },
    { stage: 'Pick & pack', days: r1(c * 0.27) },
    { stage: 'Ship to carrier', days: r1(c * 0.12) },
    { stage: 'In transit', days: r1(c - r1(c * 0.18) - r1(c * 0.27) - r1(c * 0.12)) },
  ]
  return { byRegion, byCarrier, backorderCats, cycleStages }
}

function weekRangeLabel(endIso: string) {
  const end = new Date(endIso)
  const start = new Date(end.getTime() - 6 * 86400000)
  const f = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${f(start)} – ${f(end)}, ${end.getFullYear()}`
}

function opsReport() {
  const kpis: Kpis = { onTimeDelivery: 94.1, orderCycleTimeDays: 3.1, warehouseSla: 97.2, costPerOrder: 4.31, ordersShipped: 18240, backorders: 412, returnsRate: 2.4, openIncidents: 7 }
  const prevKpis: Kpis = { onTimeDelivery: 93.6, orderCycleTimeDays: 3.3, warehouseSla: 96.8, costPerOrder: 4.38, ordersShipped: 17905, backorders: 455, returnsRate: 2.5, openIncidents: 9 }
  const pendingKpis: Kpis = { onTimeDelivery: 96.4, orderCycleTimeDays: 2.7, warehouseSla: 98.3, costPerOrder: 4.08, ordersShipped: 19612, backorders: 287, returnsRate: 2.1, openIncidents: 4 }
  const targets: Partial<Kpis> = { onTimeDelivery: 95, orderCycleTimeDays: 3.0, warehouseSla: 98, costPerOrder: 4.25, ordersShipped: 18500, backorders: 350, returnsRate: 2.5, openIncidents: 5 }

  const weeklyRaw: [number, number, number][] = [
    [16820, 92.8, 15910], [17150, 93.4, 16240], [16590, 91.9, 16020], [17410, 93.1, 16580], [17880, 94.0, 16710], [17320, 92.6, 16890],
    [17640, 93.3, 16950], [18010, 94.4, 17120], [17560, 93.0, 17040], [17720, 93.2, 17290], [17905, 93.6, 17310], [18240, 94.1, 17460],
  ]
  const weekly = weeklyRaw.map(([orders, onTime, ordersLY], i) => ({ week: `W${31 + i}`, orders, onTime, ordersLY }))

  const prevOrders = split(prevKpis.ordersShipped, REGIONS.map((r) => r.share)).map((n, i) => n + [-60, 85, -40, 30, -55, 40][i])
  const cur = opsBreakdown(kpis, prevOrders, 0.4)
  const pend = opsBreakdown(pendingKpis, cur.byRegion.map((r) => r.orders), -0.5)

  const vendors = [
    ['Wide World Importers', 'Freight & logistics', 412800, 398200, 38, 96.1],
    ['Fabrikam Supplies', 'Packaging', 286400, 301900, 64, 93.4],
    ['Contoso Ltd', 'Warehouse equipment', 198300, 176500, 12, 98.2],
    ['Litware Inc.', 'Software & services', 154900, 154900, 4, 100],
    ['Tailspin Toys', 'Seasonal inventory', 132700, 98400, 27, 91.7],
    ['Adatum Corporation', 'Contract labor', 121500, 126800, 9, 97.5],
    ['Proseware, Inc.', 'MRO supplies', 88200, 91300, 41, 95.0],
    ['Northwind Traders', 'Packaging', 64100, 59800, 33, 94.2],
    ['Alpine Ski House', 'Seasonal inventory', 41900, 22600, 8, 89.6],
    ['Fourth Coffee', 'Facilities', 18600, 19200, 14, 99.1],
  ].map(([vendor, category, spend, prevSpend, pos, onTime]) => ({ vendor, category, spend, prevSpend, pos, onTime }))
  const spendMonthly = [
    ['Nov', 1.31, 1.35], ['Dec', 1.52, 1.45], ['Jan', 1.18, 1.3], ['Feb', 1.22, 1.3], ['Mar', 1.36, 1.35], ['Apr', 1.29, 1.35],
    ['May', 1.41, 1.4], ['Jun', 1.38, 1.4], ['Jul', 1.47, 1.42], ['Aug', 1.44, 1.42], ['Sep', 1.49, 1.45], ['Oct', 1.52, 1.45],
  ].map(([month, spend, budget]) => ({ month, spend, budget }))

  const lastRefreshed = daysAgo(3, 6, 2)
  return {
    id: 'rpt-ops-kpi',
    guid: 'b41e7d22-9c63-4f1a-8e0b-3d5a6c7f9e12',
    name: 'Operations KPI — Weekly',
    workspace: 'Operations Analytics',
    type: 'report',
    owner: 'priya',
    description: 'Weekly operations scorecard: delivery performance, fulfillment, warehouse SLA and vendor spend across all Northwind distribution centers.',
    pages: ['Executive Summary', 'Fulfillment', 'Warehouse SLA', 'Vendor Spend'],
    endorsement: 'Certified',
    sensitivity: 'General',
    favorite: true,
    lastOpened: hoursAgo(20),
    lastRefreshed,
    nextRefresh: daysFromNow(1, 6, 0),
    semanticModel: 'Operations KPI — Weekly',
    fiscalWeek: 42,
    weekRange: weekRangeLabel(daysAgo(3, 6, 0)),
    kpis,
    prevKpis,
    targets,
    pendingKpis,
    pendingData: {
      fiscalWeek: 43,
      weekRange: weekRangeLabel(daysAgo(0, 6, 0)),
      week: { week: 'W43', orders: pendingKpis.ordersShipped, onTime: pendingKpis.onTimeDelivery, ordersLY: 17580 },
      ...pend,
    },
    weekly,
    ...cur,
    vendors,
    spendMonthly,
    sharedWith: ['priya.raman@northwind.com', 'ben.carter@northwind.com'],
    history: [
      { id: 'h4', start: hoursAgo(5), end: hoursAgo(4.98), type: 'Scheduled', status: 'Failed', error: 'The on-premises data gateway is offline or could not be reached. (DM_GWPipeline_Gateway_DataSourceAccessError)' },
      { id: 'h3', start: daysAgo(1, 6, 0), end: daysAgo(1, 6, 1), type: 'Scheduled', status: 'Failed', error: 'The on-premises data gateway is offline or could not be reached. (DM_GWPipeline_Gateway_DataSourceAccessError)' },
      { id: 'h2', start: daysAgo(2, 6, 0), end: daysAgo(2, 6, 1), type: 'Scheduled', status: 'Failed', error: 'The on-premises data gateway is offline or could not be reached. (DM_GWPipeline_Gateway_DataSourceAccessError)' },
      { id: 'h1', start: daysAgo(3, 6, 0), end: lastRefreshed, type: 'Scheduled', status: 'Completed' },
      { id: 'h0', start: daysAgo(4, 6, 0), end: daysAgo(4, 6, 2), type: 'Scheduled', status: 'Completed' },
    ],
  }
}

const gen = (g: any) => g

export function powerbiSeed(): Record<string, any[]> {
  const workspaces = [
    { id: 'ws-ops', name: 'Operations Analytics', slug: 'operations-analytics', guid: '7f3c2a91-4d1e-4b8a-9c2e-1a5f6b7c8d90', color: '#118DFF', description: 'Operations reporting for distribution, fulfillment and warehouse performance.', capacity: 'Fabric F64', members: ['priya', 'alex', 'ben', 'maya', 'david'] },
    { id: 'ws-fin', name: 'Finance', slug: 'finance', guid: '2a9d4e17-6b3f-4c8e-a1d0-5e7f8b9c0a21', color: '#12239E', description: 'Corporate finance, AP/AR and spend analytics.', capacity: 'Fabric F64', members: ['marcus', 'sofia', 'emma', 'lucas', 'alex'] },
    { id: 'ws-sales', name: 'Sales Ops', slug: 'sales-ops', guid: '9c1b3f52-8e4a-4d7b-b2c6-0f1e2d3c4b56', color: '#E66C37', description: 'Pipeline, bookings and forecast reporting.', capacity: 'Premium per user', members: ['rachel', 'liam', 'aisha', 'alex'] },
    { id: 'ws-people', name: 'People Analytics', slug: 'people-analytics', guid: '5e8f1a23-3c7d-4b9e-8f0a-6d2c4b1e9a78', color: '#6B007B', description: 'Headcount, hiring and attrition.', capacity: 'Premium per user', members: ['nina', 'james', 'alex'] },
    { id: 'ws-me', name: 'My workspace', slug: 'my-workspace', guid: 'me', color: '#744EC2', description: 'Your personal workspace.', capacity: 'Pro', members: ['alex'] },
  ]

  const ops = opsReport()

  const reports: any[] = [
    ops,
    {
      id: 'sm-ops-kpi', guid: 'c52f8e33-0d74-4a2b-9f1c-4e6b7d8a0f23', name: 'Operations KPI — Weekly', workspace: 'Operations Analytics', type: 'semanticModel',
      owner: 'priya', reportId: 'rpt-ops-kpi', endorsement: 'Certified', sensitivity: 'General', lastOpened: daysAgo(6, 10, 12),
      lastRefreshed: ops.lastRefreshed, nextRefresh: ops.nextRefresh, storage: 'Import · 412 MB', gateway: 'NW-GW-BOS-01 (on-premises)',
      tables: ['Fact Orders', 'Fact Shipments', 'Fact Warehouse Tasks', 'Fact PO Spend', 'Dim Date', 'Dim Region', 'Dim Distribution Center', 'Dim Carrier', 'Dim Vendor', 'Dim Product'],
    },
    {
      id: 'rpt-wh-sla', guid: 'd63a9f44-1e85-4b3c-8a2d-5f7c8e9b1a34', name: 'Warehouse SLA Monitor', workspace: 'Operations Analytics', type: 'report', owner: 'ben',
      endorsement: 'Promoted', sensitivity: 'General', lastOpened: daysAgo(1, 14, 40), lastRefreshed: hoursAgo(2.2), nextRefresh: daysFromNow(0, 23, 30),
      pages: ['SLA Overview', 'Dock-to-stock', 'Exceptions'],
      generic: gen({
        cards: [
          { label: 'Warehouse SLA %', value: 97.8, fmt: 'pct', prev: 97.4, target: 98 },
          { label: 'Lines picked', value: 214380, fmt: 'int', prev: 208112 },
          { label: 'Pick accuracy %', value: 99.4, fmt: 'pct', prev: 99.3, target: 99.5 },
          { label: 'Dock-to-stock (hrs)', value: 6.1, fmt: 'dec', prev: 6.6, target: 6, lowerBetter: true },
          { label: 'Late shipments', value: 318, fmt: 'int', prev: 342, lowerBetter: true },
        ],
        line: { title: 'SLA % by day', a: 'SLA %', b: 'Target', data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((x, i) => ({ x, a: [97.1, 97.9, 98.2, 97.4, 98.6, 97.2, 98.0][i], b: 98 })) },
        bars: { title: 'Late shipments by DC', data: [['Atlanta', 96], ['Dallas', 64], ['Newark', 52], ['Kent', 41], ['Joliet', 38], ['Ontario', 27]].map(([name, v]) => ({ name, v })) },
        donut: { title: 'Exceptions by reason', data: [['Short pick', 38], ['Carrier late', 27], ['Damaged', 14], ['Address', 11], ['Other', 10]].map(([name, v]) => ({ name, v })) },
        table: { title: 'Shift performance', cols: ['Shift', 'Lines', 'SLA %', 'Accuracy %'], rows: [['1st (6a–2p)', '92,410', '98.4', '99.6'], ['2nd (2p–10p)', '81,220', '97.6', '99.3'], ['3rd (10p–6a)', '40,750', '96.9', '99.1']] },
      }),
    },
    {
      id: 'db-exec-ops', guid: 'e74b0a55-2f96-4c4d-9b3e-6a8d9f0c2b45', name: 'Exec Ops Dashboard', workspace: 'Operations Analytics', type: 'dashboard', owner: 'david',
      reportId: 'rpt-ops-kpi', sensitivity: 'General', favorite: true, lastOpened: daysAgo(2, 8, 15), lastRefreshed: ops.lastRefreshed,
    },
    {
      id: 'df-carrier', guid: 'f85c1b66-3a07-4d5e-8c4f-7b9e0a1d3c56', name: 'Carrier Tracking Feed', workspace: 'Operations Analytics', type: 'dataflow', owner: 'ben',
      sensitivity: 'General', lastOpened: daysAgo(9, 11, 0), lastRefreshed: hoursAgo(1.4), nextRefresh: minutesAgo(-46), storage: 'Dataflow Gen2 · 6 tables',
    },
    {
      id: 'sm-wh-sla', guid: 'a96d2c77-4b18-4e6f-9d50-8c0f1b2e4d67', name: 'Warehouse SLA Monitor', workspace: 'Operations Analytics', type: 'semanticModel', owner: 'ben',
      reportId: 'rpt-wh-sla', endorsement: 'Promoted', sensitivity: 'General', lastOpened: daysAgo(12, 9, 0), lastRefreshed: hoursAgo(2.2), nextRefresh: daysFromNow(0, 23, 30),
      storage: 'Import · 188 MB', gateway: 'NW-GW-BOS-01 (on-premises)', tables: ['Fact Warehouse Tasks', 'Fact Exceptions', 'Dim Date', 'Dim Distribution Center', 'Dim Shift'],
    },
    {
      id: 'rpt-vendor-spend', guid: '1b7e3d88-5c29-4f70-ae61-9d1a2c3f5e78', name: 'Vendor Spend Analysis', workspace: 'Finance', type: 'report', owner: 'sofia',
      endorsement: 'Certified', sensitivity: 'Confidential', favorite: true, lastOpened: daysAgo(1, 9, 20), lastRefreshed: hoursAgo(9), nextRefresh: daysFromNow(1, 5, 0),
      pages: ['Spend Overview', 'By Category', 'Vendor Detail', 'Maverick Spend'],
      generic: gen({
        cards: [
          { label: 'YTD spend', value: 16.42, fmt: 'mm', prev: 15.1 },
          { label: 'Active vendors', value: 412, fmt: 'int', prev: 398 },
          { label: 'PO coverage %', value: 91.3, fmt: 'pct', prev: 89.8, target: 95 },
          { label: 'Maverick spend %', value: 4.7, fmt: 'pct', prev: 5.2, lowerBetter: true },
          { label: 'Savings captured', value: 1.18, fmt: 'mm', prev: 0.96 },
        ],
        line: { title: 'Spend vs budget by month ($M)', a: 'Spend', b: 'Budget', data: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'].map((x, i) => ({ x, a: [1.48, 1.52, 1.71, 1.6, 1.66, 1.58, 1.73, 1.69, 1.62, 1.83][i], b: 1.65 })) },
        bars: { title: 'Top vendors by spend ($K)', data: [['Wide World Importers', 2412], ['Fabrikam Supplies', 1986], ['Contoso Ltd', 1733], ['Litware Inc.', 1204], ['Tailspin Toys', 982], ['Adatum Corp', 811]].map(([name, v]) => ({ name, v })) },
        donut: { title: 'Spend by category', data: [['Logistics', 31], ['Packaging', 22], ['Equipment', 17], ['IT & software', 14], ['Services', 16]].map(([name, v]) => ({ name, v })) },
        table: { title: 'Spend by business unit', cols: ['Business unit', 'Spend', 'Budget', 'Var %'], rows: [['Operations', '$8.91M', '$8.60M', '+3.6%'], ['Sales', '$2.14M', '$2.30M', '-7.0%'], ['IT', '$2.87M', '$2.75M', '+4.4%'], ['G&A', '$2.50M', '$2.62M', '-4.6%']] },
      }),
    },
    {
      id: 'rpt-ap-aging', guid: '2c8f4e99-6d3a-4081-bf72-0e2b3d4a6f89', name: 'Finance — AP Aging', workspace: 'Finance', type: 'report', owner: 'emma',
      endorsement: 'Promoted', sensitivity: 'Confidential', lastOpened: daysAgo(4, 15, 2), lastRefreshed: hoursAgo(6), nextRefresh: daysFromNow(0, 18, 0),
      pages: ['Aging Summary', 'By Vendor', 'Payment Run'],
      generic: gen({
        cards: [
          { label: 'Open payables', value: 4.86, fmt: 'mm', prev: 5.02, lowerBetter: true },
          { label: 'Past due %', value: 11.8, fmt: 'pct', prev: 13.1, lowerBetter: true },
          { label: 'DPO (days)', value: 47.2, fmt: 'dec', prev: 46.1, target: 45 },
          { label: 'Invoices on hold', value: 37, fmt: 'int', prev: 44, lowerBetter: true },
          { label: 'Early-pay discounts', value: 0.064, fmt: 'mm', prev: 0.051 },
        ],
        line: { title: 'Open payables by week ($M)', a: 'Current', b: 'Past due', data: ['W35', 'W36', 'W37', 'W38', 'W39', 'W40', 'W41', 'W42'].map((x, i) => ({ x, a: [4.1, 4.3, 4.2, 4.45, 4.38, 4.5, 4.43, 4.29][i], b: [0.71, 0.66, 0.74, 0.69, 0.62, 0.66, 0.59, 0.57][i] })) },
        bars: { title: 'Aging bucket ($K)', data: [['Current', 4288], ['1–30', 341], ['31–60', 152], ['61–90', 54], ['90+', 25]].map(([name, v]) => ({ name, v })) },
        donut: { title: 'Payables by entity', data: [['US', 62], ['Canada', 14], ['UK', 13], ['DE', 11]].map(([name, v]) => ({ name, v })) },
        table: { title: 'Largest past-due vendors', cols: ['Vendor', 'Past due', 'Oldest', 'Status'], rows: [['Fabrikam Supplies', '$84,210', '47 days', 'Dispute'], ['Proseware, Inc.', '$41,880', '33 days', 'On hold'], ['Tailspin Toys', '$22,940', '28 days', 'Scheduled'], ['Coho Winery', '$9,320', '61 days', 'Review']] },
      }),
    },
    {
      id: 'sm-finance', guid: '3d9a5f0a-7e4b-4192-80c3-1f3c4e5b7a90', name: 'Finance Model', workspace: 'Finance', type: 'semanticModel', owner: 'sofia',
      reportId: 'rpt-vendor-spend', endorsement: 'Certified', sensitivity: 'Confidential', lastOpened: daysAgo(14, 10, 0), lastRefreshed: hoursAgo(6), nextRefresh: daysFromNow(0, 18, 0),
      storage: 'Direct Lake · 2.1 GB', gateway: 'n/a (cloud)', tables: ['Fact GL', 'Fact AP Invoices', 'Fact PO Lines', 'Dim Vendor', 'Dim Account', 'Dim Entity', 'Dim Date'],
    },
    {
      id: 'rpt-pipeline', guid: '4e0b6a1b-8f5c-42a3-91d4-2a4d5f6c8b01', name: 'Sales Pipeline', workspace: 'Sales Ops', type: 'report', owner: 'rachel',
      endorsement: 'Promoted', sensitivity: 'Confidential', lastOpened: daysAgo(5, 16, 30), lastRefreshed: hoursAgo(1.1), nextRefresh: minutesAgo(-58),
      pages: ['Pipeline', 'Forecast', 'Win/Loss'],
      generic: gen({
        cards: [
          { label: 'Open pipeline', value: 38.6, fmt: 'mm', prev: 36.9 },
          { label: 'Weighted pipeline', value: 14.2, fmt: 'mm', prev: 13.5 },
          { label: 'Win rate %', value: 27.4, fmt: 'pct', prev: 26.1, target: 30 },
          { label: 'Avg deal size', value: 0.184, fmt: 'mm', prev: 0.171 },
          { label: 'Sales cycle (days)', value: 68, fmt: 'int', prev: 72, lowerBetter: true },
        ],
        line: { title: 'Bookings vs quota by month ($M)', a: 'Bookings', b: 'Quota', data: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'].map((x, i) => ({ x, a: [2.1, 2.4, 3.6, 2.6, 2.9, 4.1, 2.7, 3.0, 4.4, 2.2][i], b: [2.5, 2.5, 3.5, 2.8, 2.8, 3.8, 3.0, 3.0, 4.0, 3.1][i] })) },
        bars: { title: 'Pipeline by stage ($M)', data: [['Qualify', 12.4], ['Develop', 9.8], ['Propose', 8.1], ['Negotiate', 5.6], ['Commit', 2.7]].map(([name, v]) => ({ name, v })) },
        donut: { title: 'Pipeline by segment', data: [['Enterprise', 54], ['Mid-market', 31], ['SMB', 15]].map(([name, v]) => ({ name, v })) },
        table: { title: 'Top open opportunities', cols: ['Opportunity', 'Owner', 'Amount', 'Stage'], rows: [['Adatum — Enterprise renewal', 'Liam O’Connor', '$1.42M', 'Negotiate'], ['Contoso — Expansion', 'Liam O’Connor', '$860K', 'Propose'], ['Woodgrove Bank — New', 'Aisha Bello', '$640K', 'Develop'], ['Fabrikam — Upsell', 'Rachel Goldberg', '$410K', 'Commit']] },
      }),
    },
    {
      id: 'sm-sales', guid: '5f1c7b2c-9a6d-43b4-a2e5-3b5e6a7d9c12', name: 'Sales Pipeline', workspace: 'Sales Ops', type: 'semanticModel', owner: 'rachel',
      reportId: 'rpt-pipeline', sensitivity: 'Confidential', lastOpened: daysAgo(20, 10, 0), lastRefreshed: hoursAgo(1.1), nextRefresh: minutesAgo(-58),
      storage: 'Import · 640 MB', gateway: 'Salesforce connector (cloud)', tables: ['Fact Opportunities', 'Fact Bookings', 'Dim Account', 'Dim Owner', 'Dim Stage', 'Dim Date'],
    },
    {
      id: 'rpt-headcount', guid: '6a2d8c3d-0b7e-44c5-b3f6-4c6f7b8e0d23', name: 'Headcount & Attrition', workspace: 'People Analytics', type: 'report', owner: 'nina',
      sensitivity: 'Highly Confidential', lastOpened: daysAgo(8, 13, 10), lastRefreshed: daysAgo(1, 4, 0), nextRefresh: daysFromNow(0, 4, 0),
      pages: ['Headcount', 'Attrition', 'Hiring'],
      generic: gen({
        cards: [
          { label: 'Headcount', value: 2846, fmt: 'int', prev: 2811 },
          { label: 'Open reqs', value: 94, fmt: 'int', prev: 101 },
          { label: 'Attrition (TTM) %', value: 11.2, fmt: 'pct', prev: 11.9, lowerBetter: true },
          { label: 'Regretted attrition %', value: 4.1, fmt: 'pct', prev: 4.6, lowerBetter: true },
          { label: 'Time to fill (days)', value: 41, fmt: 'int', prev: 44, lowerBetter: true },
        ],
        line: { title: 'Headcount by month', a: 'Headcount', b: 'Plan', data: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'].map((x, i) => ({ x, a: 2700 + i * 16 + (i % 3) * 4, b: 2710 + i * 15 })) },
        bars: { title: 'Headcount by department', data: [['Operations', 1184], ['Sales', 486], ['Engineering', 412], ['Finance', 228], ['Customer Success', 302], ['People', 96], ['IT', 138]].map(([name, v]) => ({ name, v })) },
        donut: { title: 'Headcount by location', data: [['Boston', 38], ['Chicago', 19], ['Austin', 16], ['New York', 14], ['San Francisco', 13]].map(([name, v]) => ({ name, v })) },
        table: { title: 'Attrition by department', cols: ['Department', 'Leavers', 'Attrition %', 'Regretted'], rows: [['Operations', '148', '12.5%', '41'], ['Sales', '62', '12.8%', '24'], ['Engineering', '31', '7.5%', '17'], ['Customer Success', '29', '9.6%', '9']] },
      }),
    },
    {
      id: 'rpt-ops-scratch', guid: '7b3e9d4e-1c8f-45d6-84a7-5d7a8c9f1e34', name: 'Ops weekly — scratch', workspace: 'My workspace', type: 'report', owner: 'alex',
      sensitivity: 'General', lastOpened: daysAgo(3, 17, 45), lastRefreshed: daysAgo(10, 8, 30),
      pages: ['Page 1'],
      generic: gen({
        cards: [
          { label: 'Orders shipped', value: 17320, fmt: 'int', prev: 17880 },
          { label: 'On-time %', value: 92.6, fmt: 'pct', prev: 94.0, target: 95 },
          { label: 'Backorders', value: 498, fmt: 'int', prev: 441, lowerBetter: true },
        ],
        line: { title: 'Orders by week', a: 'Orders', b: 'LY', data: ['W30', 'W31', 'W32', 'W33', 'W34', 'W35', 'W36'].map((x, i) => ({ x, a: [16400, 16820, 17150, 16590, 17410, 17880, 17320][i], b: [15700, 15910, 16240, 16020, 16580, 16710, 16890][i] })) },
        bars: { title: 'Backorders by DC', data: [['Atlanta', 154], ['Dallas', 90], ['Newark', 85], ['Kent', 60], ['Joliet', 69], ['Ontario', 40]].map(([name, v]) => ({ name, v })) },
        donut: { title: 'Orders by channel', data: [['EDI', 46], ['Web', 33], ['Inside sales', 21]].map(([name, v]) => ({ name, v })) },
        table: { title: 'Notes', cols: ['Item', 'Owner', 'Status'], rows: [['Atlanta OT dip', 'Ben Carter', 'Investigating'], ['XPO rate change', 'Maya Johnson', 'Open'], ['Q4 peak staffing', 'Alex Morgan', 'Planned']] },
      }),
    },
  ]

  return { 'powerbi.workspaces': workspaces, 'powerbi.reports': reports }
}
