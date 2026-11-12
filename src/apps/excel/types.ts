/**
 * Extended (optional) fields the Excel clone stores on top of the seed's Workbook / Sheet / Cell shapes.
 * Every field is optional so seeded workbooks keep working unchanged.
 */
import type { Cell, Chart, Sheet, Workbook } from './seed'

export type XFmt = 'general' | 'number' | 'int' | 'currency' | 'currency2' | 'percent' | 'date' | 'longdate' | 'time' | 'scientific' | 'fraction' | 'text'

export interface XCell extends Omit<Cell, 'fmt'> {
  fmt?: XFmt
  underline?: boolean
  strike?: boolean
  font?: string
  size?: number
  valign?: 'top' | 'middle' | 'bottom'
  wrap?: boolean
  indent?: number
  rotate?: number
  border?: 'all' | 'outside' | 'bottom' | 'thickBottom' | 'top'
  link?: string
  mergeAcross?: number
  validation?: { list: string[] }
  spark?: { range: string; type: 'line' | 'column' | 'winloss' }
}

export type ChartType = 'column' | 'bar' | 'line' | 'area' | 'pie'
export interface XChart extends Omit<Chart, 'type'> {
  type: ChartType
}

export type CfType = 'gt' | 'lt' | 'eq' | 'text' | 'dup' | 'top10' | 'bottom10' | 'aboveAvg' | 'belowAvg' | 'dataBar' | 'colorScale'
export interface CfRule {
  id: string
  range: string
  type: CfType
  value?: string | number
  style?: 'red' | 'yellow' | 'green' | 'redText' | 'redBorder'
  color?: string
}

export interface XComment {
  id: string
  ref: string
  author: string
  text: string
  at: string
  resolved?: boolean
  replies?: { author: string; text: string; at: string }[]
}

export interface InkStroke {
  id: string
  color: string
  width: number
  opacity: number
  pts: [number, number][]
}

export interface XSheet extends Omit<Sheet, 'cells' | 'charts'> {
  cells: Record<string, XCell>
  charts?: XChart[]
  rowHeights?: Record<number, number>
  defaultColWidth?: number
  freezeCol?: number
  cf?: CfRule[]
  comments?: XComment[]
  autoFilter?: string
  /** hidden values per filtered range: { 'A1:E20': { 2: ['Logistics'] } } (key = column offset in range) */
  filters?: Record<string, Record<number, string[]>>
  protected?: boolean
  showGrid?: boolean
  showHeadings?: boolean
  printArea?: string
  pageSetup?: { orientation?: 'portrait' | 'landscape'; margins?: 'normal' | 'wide' | 'narrow'; size?: 'letter' | 'a4' | 'legal' }
  ink?: InkStroke[]
}

export interface XWorkbook extends Omit<Workbook, 'sheets'> {
  sheets: XSheet[]
  names?: { name: string; ref: string }[]
  theme?: string
  sharedWith?: string[]
  pinned?: boolean
}

export const THEMES: Record<string, { label: string; header: string; band: string; chart: string[] }> = {
  office: { label: 'Office', header: '#156082', band: '#C0E6F5', chart: ['#156082', '#E97132', '#196B24', '#0F9ED5', '#A02B93', '#4EA72E'] },
  green: { label: 'Green', header: '#107C41', band: '#D3F0E0', chart: ['#107C41', '#8CBF26', '#00A0B0', '#E3A21A', '#5C2D91', '#C0504D'] },
  blueWarm: { label: 'Blue Warm', header: '#2E4E7E', band: '#DCE6F2', chart: ['#2E4E7E', '#E2A33B', '#4E8542', '#9B57A0', '#3F9AD0', '#CB5D50'] },
  violet: { label: 'Violet', header: '#5C2D91', band: '#E6DDF2', chart: ['#5C2D91', '#E3008C', '#0078D4', '#FFB900', '#00B294', '#E81123'] },
  orange: { label: 'Orange', header: '#C55A11', band: '#FBE5D6', chart: ['#C55A11', '#2F5597', '#548235', '#7030A0', '#BF9000', '#C00000'] },
}

export const PALETTE = ['#000000', '#FFFFFF', '#E7E6E6', '#44546A', '#4472C4', '#ED7D31', '#A5A5A5', '#FFC000', '#5B9BD5', '#70AD47', '#C00000', '#FF0000', '#FFC7CE', '#FFFF00', '#92D050', '#00B050', '#00B0F0', '#0070C0', '#002060', '#7030A0']
