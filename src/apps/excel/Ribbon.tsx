import { useState, type ReactNode } from 'react'
import { PopMenu, type MenuItem } from './ui'
import {
  ClipboardPaste24Regular,
  Cut20Regular,
  Copy20Regular,
  PaintBrush20Regular,
  TextBold20Regular,
  TextItalic20Regular,
  TextUnderline20Regular,
  BorderAll20Regular,
  PaintBucket20Regular,
  TextColor20Regular,
  TextAlignLeft20Regular,
  TextAlignCenter20Regular,
  TextAlignRight20Regular,
  TextWrap20Regular,
  TableCellsMerge20Regular,
  AlignTop20Regular,
  AlignCenterVertical20Regular,
  AlignBottom20Regular,
  TextIndentIncrease20Regular,
  TextIndentDecrease20Regular,
  Money20Regular,
  TableInsertRow20Regular,
  TableDeleteRow20Regular,
  TableSettings20Regular,
  ArrowSort20Regular,
  Search20Regular,
  DataBarVertical24Regular,
  ChartMultiple24Regular,
  DataPie20Regular,
  DataLine20Regular,
  DataArea20Regular,
  DataBarVertical20Regular,
  Image20Regular,
  Shapes20Regular,
  Link20Regular,
  Filter20Regular,
  DecimalArrowLeft20Regular,
  DecimalArrowRight20Regular,
  ChevronDown12Regular,
  Sparkle20Regular,
  Eraser20Regular,
  ArrowDown20Regular,
  Table24Regular,
  TableAdd24Regular,
  FontIncrease20Regular,
  FontDecrease20Regular,
  Comment20Regular,
  TextFontSize20Regular,
  Lightbulb20Regular,
  TableFreezeRow20Regular,
  Mic20Regular,
  Grid20Regular,
  Print20Regular,
  DocumentMargins20Regular,
  Orientation20Regular,
  Ruler20Regular,
  Calculator20Regular,
  MathFormula20Regular,
  BookOpen20Regular,
  Database20Regular,
  ArrowSync20Regular,
  TextColumnTwo20Regular,
  Translate20Regular,
  LockClosed20Regular,
  Eye20Regular,
  ZoomIn20Regular,
  WindowNew20Regular,
  Code20Regular,
  Flash20Regular,
  QuestionCircle20Regular,
  ChatHelp20Regular,
  Pen20Regular,
  Highlight20Regular,
  ShapeIntersect20Regular,
  Icons20Regular,
  CubeTree20Regular,
  TableSimple20Regular,
  ChartPerson20Regular,
  TextT20Regular,
  Symbols20Regular,
  Checkmark20Regular,
} from '@fluentui/react-icons'
import type { CellFmt } from './seed'

export type RibbonTab = 'home' | 'insert' | 'draw' | 'pagelayout' | 'formulas' | 'data' | 'review' | 'view' | 'automate' | 'help'
export const TABS: [RibbonTab, string][] = [
  ['home', 'Home'],
  ['insert', 'Insert'],
  ['draw', 'Draw'],
  ['pagelayout', 'Page Layout'],
  ['formulas', 'Formulas'],
  ['data', 'Data'],
  ['review', 'Review'],
  ['view', 'View'],
  ['automate', 'Automate'],
  ['help', 'Help'],
]

export interface RibbonActions {
  bold: () => void
  italic: () => void
  underline: () => void
  fill: () => void
  fontColor: () => void
  align: (a: 'left' | 'center' | 'right') => void
  fmt: (f: CellFmt) => void
  decimals: (d: 1 | -1) => void
  autosum: () => void
  fillDown: () => void
  fillRight: () => void
  clear: () => void
  autofit: () => void
  formatTable: () => void
  insertChart: () => void
  insertRow: () => void
  deleteRow: () => void
  freeze: () => void
  analyze: () => void
  sort: () => void
  state: { bold: boolean; italic: boolean; underline: boolean; fmt: CellFmt; align?: string; font?: string; size?: number; valign?: string; wrap?: boolean; strike?: boolean }
  /** run a named ribbon command (label of the button) */
  cmd: (key: string) => void
  /** dropdown menus by command key */
  menus: Record<string, MenuItem[]>
  /** toggle states by command key */
  on: Record<string, boolean>
  setFont: (f: string) => void
  setSize: (n: number) => void
}

const Group = ({ label, children, last }: { label: string; children: ReactNode; last?: boolean }) => (
  <div className={`relative flex flex-col h-full shrink-0 px-1.5 ${last ? '' : 'after:absolute after:right-0 after:top-2 after:bottom-2 after:w-px after:bg-[#E1E1E1]'}`}>
    <div className="flex-1 flex items-start gap-0.5 pt-1">{children}</div>
    <div className="text-[11px] text-[#616161] text-center leading-none pb-1.5 whitespace-nowrap">{label}</div>
  </div>
)

function Big({ icon: I, label, agent, onClick, chevron, active, onChevron }: { icon: any; label: string; agent?: string; onClick?: () => void; chevron?: boolean; active?: boolean; onChevron?: () => void }) {
  return (
    <button
      data-agent={agent}
      aria-label={label.replace('\n', ' ')}
      onClick={(e) => {
        if (onChevron && (e.target as HTMLElement).closest?.('[data-chev]')) return onChevron()
        onClick?.()
      }}
      className={`flex flex-col items-center justify-start gap-0.5 min-w-[46px] max-w-[72px] h-[66px] px-1 pt-1 rounded hover:bg-[#EBEBEB] ${active ? 'bg-[#E0E0E0]' : ''}`}
    >
      <I className="w-7 h-7 shrink-0 text-[#424242]" style={{ fontSize: 28 }} />
      <span className="text-[11.5px] leading-[1.15] text-[#242424] text-center whitespace-pre-line">
        {label}
        {chevron && (
          <span data-chev className="inline-block">
            <ChevronDown12Regular className="inline ml-0.5 -mt-0.5 text-[#616161]" />
          </span>
        )}
      </span>
    </button>
  )
}

function Small({ icon: I, label, agent, onClick, active, chevron, iconOnly, color, onChevron }: { icon: any; label: string; agent?: string; onClick?: () => void; active?: boolean; chevron?: boolean; iconOnly?: boolean; color?: string; onChevron?: () => void }) {
  return (
    <button
      data-agent={agent}
      aria-label={label}
      title={label}
      onClick={(e) => {
        if (onChevron && (e.target as HTMLElement).closest?.('[data-chev]')) return onChevron()
        onClick?.()
      }}
      className={`flex items-center gap-1 h-[22px] rounded px-1 text-[12px] text-[#242424] whitespace-nowrap hover:bg-[#EBEBEB] ${active ? 'bg-[#D6D6D6] hover:bg-[#CFCFCF]' : ''}`}
    >
      <span className="relative inline-flex">
        <I className="w-[18px] h-[18px] text-[#424242]" />
        {color && <span className="absolute left-[2px] right-[2px] -bottom-[2px] h-[3px]" style={{ background: color }} />}
      </span>
      {!iconOnly && <span>{label}</span>}
      {chevron && (
        <span data-chev className="inline-flex">
          <ChevronDown12Regular className="text-[#616161]" />
        </span>
      )}
    </button>
  )
}

const Col = ({ children }: { children: ReactNode }) => <div className="flex flex-col gap-[1px]">{children}</div>
const Row = ({ children }: { children: ReactNode }) => <div className="flex items-center gap-[1px]">{children}</div>

function Menu({ items, onClose }: { items: { label: string; agent?: string; onClick: () => void; icon?: any }[]; onClose: () => void }) {
  return (
    <div className="absolute z-50 top-full left-0 mt-1 w-[220px] bg-white rounded-md border border-black/10 shadow-[0_8px_24px_rgba(0,0,0,0.18)] py-1">
      {items.map((it) => (
        <button
          key={it.label}
          data-agent={it.agent}
          aria-label={it.label}
          onClick={() => {
            it.onClick()
            onClose()
          }}
          className="w-full flex items-center gap-2.5 px-3 h-8 text-left text-[12.5px] hover:bg-[#F0F0F0]"
        >
          {it.icon ? <it.icon className="w-4 h-4 text-[#424242]" /> : <span className="w-4" />}
          {it.label}
        </button>
      ))}
    </div>
  )
}

const FMT_OPTIONS: [CellFmt, string][] = [
  ['general', 'General'],
  ['number', 'Number'],
  ['currency', 'Currency'],
  ['currency2', 'Accounting'],
  ['date', 'Short Date'],
  ['percent', 'Percentage'],
  ['int', 'Comma Style'],
]

/** a ribbon control with an attached dropdown menu (rendered from act.menus[key]) */
function WithMenu({ k, open, onClose, act, children, width }: { k: string; open: string | null; onClose: () => void; act: RibbonActions; children: ReactNode; width?: number }) {
  return (
    <div className="relative">
      {children}
      {open === k && act.menus[k] && <PopMenu items={act.menus[k]} onClose={onClose} width={width} />}
    </div>
  )
}

export function Ribbon({ tab, act }: { tab: RibbonTab; act: RibbonActions }) {
  const [menu, setMenu] = useState<string | null>(null)
  const toggle = (m: string) => setMenu((x) => (x === m ? null : m))
  const close = () => setMenu(null)
  /** button handler: open the command's menu if it has one, otherwise run it */
  const run = (k: string) => () => (act.menus[k] ? toggle(k) : act.cmd(k))

  let body: ReactNode
  if (tab === 'home') {
    body = (
      <>
        <Group label="Clipboard">
          <WithMenu k="Paste" open={menu} onClose={close} act={act}>
            <Big icon={ClipboardPaste24Regular} label={'Paste'} chevron agent="excel-paste" onClick={() => act.cmd('Paste')} onChevron={() => toggle('Paste')} />
          </WithMenu>
          <Col>
            <Small icon={Cut20Regular} label="Cut" agent="excel-cut" iconOnly onClick={() => act.cmd('Cut')} />
            <Small icon={Copy20Regular} label="Copy" agent="excel-copy" iconOnly chevron onClick={() => act.cmd('Copy')} />
            <Small icon={PaintBrush20Regular} label="Format Painter" agent="excel-format-painter" iconOnly active={act.on['Format Painter']} onClick={() => act.cmd('Format Painter')} />
          </Col>
        </Group>
        <Group label="Font">
          <Col>
            <Row>
              <select aria-label="Font" data-agent="excel-font-name" className="h-[22px] w-[124px] text-[12px] border border-[#C7C7C7] rounded-sm px-1 bg-white outline-none" value={act.state.font ?? 'Aptos Narrow'} onChange={(e) => act.setFont(e.target.value)}>
                {['Aptos Narrow', 'Aptos', 'Aptos Display', 'Calibri', 'Arial', 'Segoe UI', 'Times New Roman', 'Consolas', 'Georgia'].map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
              <select aria-label="Font size" data-agent="excel-font-size" className="h-[22px] w-[44px] text-[12px] border border-[#C7C7C7] rounded-sm px-0.5 bg-white outline-none ml-0.5" value={String(act.state.size ?? 11)} onChange={(e) => act.setSize(Number(e.target.value))}>
                {[8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 36].map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
              <Small icon={FontIncrease20Regular} label="Increase Font Size" iconOnly onClick={() => act.cmd('Increase Font Size')} />
              <Small icon={FontDecrease20Regular} label="Decrease Font Size" iconOnly onClick={() => act.cmd('Decrease Font Size')} />
            </Row>
            <Row>
              <Small icon={TextBold20Regular} label="Bold" agent="excel-bold" iconOnly active={act.state.bold} onClick={act.bold} />
              <Small icon={TextItalic20Regular} label="Italic" agent="excel-italic" iconOnly active={act.state.italic} onClick={act.italic} />
              <WithMenu k="Underline" open={menu} onClose={close} act={act}>
                <Small icon={TextUnderline20Regular} label="Underline" agent="excel-underline" iconOnly chevron active={act.state.underline} onClick={act.underline} onChevron={() => toggle('Underline')} />
              </WithMenu>
              <span className="w-px h-4 bg-[#E1E1E1] mx-0.5" />
              <WithMenu k="Borders" open={menu} onClose={close} act={act}>
                <Small icon={BorderAll20Regular} label="Borders" agent="excel-borders" iconOnly chevron onClick={() => act.cmd('Borders')} onChevron={() => toggle('Borders')} />
              </WithMenu>
              <WithMenu k="Fill Color" open={menu} onClose={close} act={act}>
                <Small icon={PaintBucket20Regular} label="Fill Color" agent="excel-fill-color" iconOnly chevron color="#FFFF00" onClick={act.fill} onChevron={() => toggle('Fill Color')} />
              </WithMenu>
              <WithMenu k="Font Color" open={menu} onClose={close} act={act}>
                <Small icon={TextColor20Regular} label="Font Color" agent="excel-font-color" iconOnly chevron color="#C00000" onClick={act.fontColor} onChevron={() => toggle('Font Color')} />
              </WithMenu>
            </Row>
          </Col>
        </Group>
        <Group label="Alignment">
          <Col>
            <Row>
              <Small icon={AlignTop20Regular} label="Top Align" iconOnly active={act.state.valign === 'top'} onClick={() => act.cmd('Top Align')} />
              <Small icon={AlignCenterVertical20Regular} label="Middle Align" iconOnly active={act.state.valign === 'middle'} onClick={() => act.cmd('Middle Align')} />
              <Small icon={AlignBottom20Regular} label="Bottom Align" iconOnly active={!act.state.valign || act.state.valign === 'bottom'} onClick={() => act.cmd('Bottom Align')} />
              <WithMenu k="Orientation" open={menu} onClose={close} act={act}>
                <Small icon={TextFontSize20Regular} label="Orientation" iconOnly chevron onClick={() => toggle('Orientation')} />
              </WithMenu>
              <Small icon={TextWrap20Regular} label="Wrap Text" agent="excel-wrap-text" active={act.state.wrap} onClick={() => act.cmd('Wrap Text')} />
            </Row>
            <Row>
              <Small icon={TextAlignLeft20Regular} label="Align Left" agent="excel-align-left" iconOnly active={act.state.align === 'left'} onClick={() => act.align('left')} />
              <Small icon={TextAlignCenter20Regular} label="Center" agent="excel-align-center" iconOnly active={act.state.align === 'center'} onClick={() => act.align('center')} />
              <Small icon={TextAlignRight20Regular} label="Align Right" agent="excel-align-right" iconOnly active={act.state.align === 'right'} onClick={() => act.align('right')} />
              <Small icon={TextIndentDecrease20Regular} label="Decrease Indent" iconOnly onClick={() => act.cmd('Decrease Indent')} />
              <Small icon={TextIndentIncrease20Regular} label="Increase Indent" iconOnly onClick={() => act.cmd('Increase Indent')} />
              <WithMenu k="Merge & Center" open={menu} onClose={close} act={act}>
                <Small icon={TableCellsMerge20Regular} label="Merge & Center" agent="excel-merge" chevron onClick={() => act.cmd('Merge & Center')} onChevron={() => toggle('Merge & Center')} />
              </WithMenu>
            </Row>
          </Col>
        </Group>
        <Group label="Number">
          <Col>
            <select
              data-agent="excel-number-format"
              aria-label="Number Format"
              value={act.state.fmt}
              onChange={(e) => act.fmt(e.target.value as CellFmt)}
              className="h-[22px] w-[132px] text-[12px] border border-[#C7C7C7] rounded-sm px-1 bg-white outline-none"
            >
              {FMT_OPTIONS.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
              {!FMT_OPTIONS.some(([v]) => v === act.state.fmt) && <option value={act.state.fmt}>More Number Formats…</option>}
            </select>
            <Row>
              <Small icon={Money20Regular} label="Accounting Number Format" agent="excel-fmt-currency" iconOnly chevron onClick={() => act.fmt('currency')} />
              <button data-agent="excel-fmt-percent" aria-label="Percent Style" title="Percent Style" onClick={() => act.fmt('percent')} className="h-[22px] w-[24px] rounded hover:bg-[#EBEBEB] text-[14px] font-semibold text-[#424242]">
                %
              </button>
              <button data-agent="excel-fmt-comma" aria-label="Comma Style" title="Comma Style" onClick={() => act.fmt('int')} className="h-[22px] w-[24px] rounded hover:bg-[#EBEBEB] text-[15px] font-bold text-[#424242] leading-none">
                ,
              </button>
              <Small icon={DecimalArrowRight20Regular} label="Increase Decimal" agent="excel-inc-decimal" iconOnly onClick={() => act.decimals(1)} />
              <Small icon={DecimalArrowLeft20Regular} label="Decrease Decimal" agent="excel-dec-decimal" iconOnly onClick={() => act.decimals(-1)} />
            </Row>
          </Col>
        </Group>
        <Group label="Styles">
          <WithMenu k="Conditional Formatting" open={menu} onClose={close} act={act} width={250}>
            <Big icon={TableSettings20Regular} label={'Conditional\nFormatting'} chevron agent="excel-conditional-formatting" onClick={() => toggle('Conditional Formatting')} />
          </WithMenu>
          <WithMenu k="Format as Table" open={menu} onClose={close} act={act}>
            <Big icon={Table24Regular} label={'Format as\nTable'} chevron agent="excel-format-table" onClick={act.formatTable} onChevron={() => toggle('Format as Table')} />
          </WithMenu>
          <WithMenu k="Cell Styles" open={menu} onClose={close} act={act}>
            <Big icon={PaintBrush20Regular} label={'Cell\nStyles'} chevron agent="excel-cell-styles" onClick={() => toggle('Cell Styles')} />
          </WithMenu>
        </Group>
        <Group label="Cells">
          <Col>
            <WithMenu k="Insert" open={menu} onClose={close} act={act}>
              <Small icon={TableInsertRow20Regular} label="Insert" agent="excel-insert-row" chevron onClick={act.insertRow} onChevron={() => toggle('Insert')} />
            </WithMenu>
            <WithMenu k="Delete" open={menu} onClose={close} act={act}>
              <Small icon={TableDeleteRow20Regular} label="Delete" agent="excel-delete-row" chevron onClick={act.deleteRow} onChevron={() => toggle('Delete')} />
            </WithMenu>
            <div className="relative">
              <Small icon={TableSimple20Regular} label="Format" agent="excel-format-menu" chevron onClick={() => toggle('format')} />
              {menu === 'format' && (
                <Menu
                  onClose={close}
                  items={[
                    { label: 'Row Height…', onClick: () => act.cmd('Row Height') },
                    { label: 'AutoFit Row Height', onClick: () => act.cmd('AutoFit Row Height') },
                    { label: 'Column Width…', onClick: () => act.cmd('Column Width') },
                    { label: 'AutoFit Column Width', agent: 'excel-autofit', onClick: act.autofit },
                    { label: 'Default Width…', onClick: () => act.cmd('Default Width') },
                    { label: 'Format Cells…', onClick: () => act.cmd('Format Cells') },
                  ]}
                />
              )}
            </div>
          </Col>
        </Group>
        <Group label="Editing">
          <Col>
            <Row>
              <div className="relative">
                <button
                  data-agent="excel-autosum"
                  aria-label="AutoSum"
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest?.('[data-chev]')) return toggle('AutoSum')
                    act.autosum()
                  }}
                  className="flex items-center gap-1 h-[22px] rounded px-1 text-[12px] hover:bg-[#EBEBEB]"
                >
                  <span className="w-[18px] text-center text-[15px] font-semibold text-[#424242] leading-none">Σ</span> AutoSum{' '}
                  <span data-chev className="inline-flex">
                    <ChevronDown12Regular className="text-[#616161]" />
                  </span>
                </button>
                {menu === 'AutoSum' && act.menus['AutoSum'] && <PopMenu items={act.menus['AutoSum']} onClose={close} width={200} />}
              </div>
            </Row>
            <div className="relative">
              <Small icon={ArrowDown20Regular} label="Fill" agent="excel-fill" chevron onClick={() => toggle('fill')} />
              {menu === 'fill' && (
                <Menu
                  onClose={close}
                  items={[
                    { label: 'Down', agent: 'excel-fill-down', onClick: act.fillDown, icon: ArrowDown20Regular },
                    { label: 'Right', agent: 'excel-fill-right', onClick: act.fillRight },
                    { label: 'Up', onClick: () => act.cmd('Fill Up') },
                    { label: 'Left', onClick: () => act.cmd('Fill Left') },
                    { label: 'Series…', onClick: () => act.cmd('Series') },
                    { label: 'Flash Fill', onClick: () => act.cmd('Flash Fill'), icon: Flash20Regular },
                  ]}
                />
              )}
            </div>
            <WithMenu k="Clear" open={menu} onClose={close} act={act}>
              <Small icon={Eraser20Regular} label="Clear" agent="excel-clear" chevron onClick={act.clear} onChevron={() => toggle('Clear')} />
            </WithMenu>
          </Col>
          <WithMenu k="Sort & Filter" open={menu} onClose={close} act={act}>
            <Big icon={ArrowSort20Regular} label={'Sort &\nFilter'} chevron agent="excel-sort" onClick={() => toggle('Sort & Filter')} />
          </WithMenu>
          <WithMenu k="Find & Select" open={menu} onClose={close} act={act}>
            <Big icon={Search20Regular} label={'Find &\nSelect'} chevron agent="excel-find-select" onClick={() => toggle('Find & Select')} />
          </WithMenu>
        </Group>
        <Group label="Analysis">
          <Big icon={ChartPerson20Regular} label={'Analyze\nData'} agent="excel-analyze" onClick={act.analyze} />
        </Group>
        <Group label="Copilot" last>
          <Big icon={Sparkle20Regular} label={'Copilot'} agent="excel-copilot" active={act.on['Copilot']} onClick={() => act.cmd('Copilot')} />
        </Group>
      </>
    )
  } else if (tab === 'insert') {
    body = (
      <>
        <Group label="Tables">
          <WithMenu k="PivotTable" open={menu} onClose={close} act={act}>
            <Big icon={CubeTree20Regular} label={'PivotTable'} chevron agent="excel-insert-pivot" onClick={() => act.cmd('PivotTable')} onChevron={() => toggle('PivotTable')} />
          </WithMenu>
          <Big icon={TableAdd24Regular} label={'Recommended\nPivotTables'} onClick={() => act.cmd('Recommended PivotTables')} />
          <Big icon={Table24Regular} label={'Table'} agent="excel-insert-table" onClick={act.formatTable} />
        </Group>
        <Group label="Illustrations">
          <Big icon={Image20Regular} label={'Pictures'} chevron onClick={() => act.cmd('Pictures')} />
          <Col>
            <WithMenu k="Shapes" open={menu} onClose={close} act={act}>
              <Small icon={Shapes20Regular} label="Shapes" chevron onClick={() => toggle('Shapes')} />
            </WithMenu>
            <WithMenu k="Icons" open={menu} onClose={close} act={act}>
              <Small icon={Icons20Regular} label="Icons" onClick={() => toggle('Icons')} />
            </WithMenu>
            <Small icon={ShapeIntersect20Regular} label="3D Models" chevron onClick={() => act.cmd('3D Models')} />
          </Col>
        </Group>
        <Group label="Charts">
          <Big icon={ChartMultiple24Regular} label={'Recommended\nCharts'} agent="excel-insert-chart" onClick={act.insertChart} />
          <Col>
            <Row>
              <Small icon={DataBarVertical20Regular} label="Insert Column or Bar Chart" agent="excel-insert-column-chart" iconOnly chevron onClick={act.insertChart} />
              <Small icon={DataLine20Regular} label="Insert Line or Area Chart" agent="excel-insert-line-chart" iconOnly chevron onClick={() => act.cmd('Line Chart')} />
              <Small icon={DataPie20Regular} label="Insert Pie or Doughnut Chart" agent="excel-insert-pie-chart" iconOnly chevron onClick={() => act.cmd('Pie Chart')} />
            </Row>
            <Row>
              <Small icon={DataBarVertical20Regular} label="Insert Hierarchy Chart" iconOnly chevron onClick={() => act.cmd('Bar Chart')} />
              <Small icon={DataArea20Regular} label="Insert Statistic Chart" iconOnly chevron onClick={() => act.cmd('Area Chart')} />
              <Small icon={DataLine20Regular} label="Insert Scatter Chart" iconOnly chevron onClick={() => act.cmd('Line Chart')} />
            </Row>
          </Col>
          <Big icon={DataBarVertical24Regular} label={'Maps'} chevron onClick={() => act.cmd('Maps')} />
          <Big icon={CubeTree20Regular} label={'PivotChart'} chevron onClick={() => act.cmd('PivotChart')} />
        </Group>
        <Group label="Sparklines">
          <Col>
            <Small icon={DataLine20Regular} label="Line" onClick={() => act.cmd('Sparkline Line')} />
            <Small icon={DataBarVertical20Regular} label="Column" onClick={() => act.cmd('Sparkline Column')} />
            <Small icon={DataArea20Regular} label="Win/Loss" onClick={() => act.cmd('Sparkline Win/Loss')} />
          </Col>
        </Group>
        <Group label="Filters">
          <Col>
            <Small icon={Filter20Regular} label="Slicer" onClick={() => act.cmd('Filter')} />
            <Small icon={Filter20Regular} label="Timeline" onClick={() => act.cmd('Timeline')} />
          </Col>
        </Group>
        <Group label="Links">
          <Big icon={Link20Regular} label={'Link'} chevron agent="excel-insert-link" onClick={() => act.cmd('Link')} />
        </Group>
        <Group label="Comments">
          <Big icon={Comment20Regular} label={'Comment'} agent="excel-insert-comment" onClick={() => act.cmd('New Comment')} />
        </Group>
        <Group label="Text">
          <WithMenu k="Text" open={menu} onClose={close} act={act}>
            <Big icon={TextT20Regular} label={'Text'} chevron onClick={() => toggle('Text')} />
          </WithMenu>
        </Group>
        <Group label="Symbols" last>
          <WithMenu k="Symbols" open={menu} onClose={close} act={act} width={180}>
            <Big icon={Symbols20Regular} label={'Symbols'} chevron onClick={() => toggle('Symbols')} />
          </WithMenu>
        </Group>
      </>
    )
  } else {
    const simple: Record<string, [string, [any, string][]][]> = {
      draw: [
        ['Tools', [[Pen20Regular, 'Select'], [Eraser20Regular, 'Eraser']]],
        ['Pens', [[Pen20Regular, 'Pen'], [Pen20Regular, 'Pen'], [Highlight20Regular, 'Highlighter']]],
        ['Convert', [[ShapeIntersect20Regular, 'Ink to\nShape'], [MathFormula20Regular, 'Ink to\nMath']]],
        ['Replay', [[ArrowSync20Regular, 'Ink\nReplay']]],
      ],
      pagelayout: [
        ['Themes', [[Grid20Regular, 'Themes']]],
        ['Page Setup', [[DocumentMargins20Regular, 'Margins'], [Orientation20Regular, 'Orientation'], [Ruler20Regular, 'Size'], [Print20Regular, 'Print\nArea'], [TextColumnTwo20Regular, 'Breaks']]],
        ['Scale to Fit', [[ZoomIn20Regular, 'Width:\nAutomatic']]],
        ['Sheet Options', [[Grid20Regular, 'Gridlines'], [TableSimple20Regular, 'Headings']]],
        ['Arrange', [[Shapes20Regular, 'Bring\nForward'], [Shapes20Regular, 'Send\nBackward'], [Shapes20Regular, 'Align']]],
      ],
      formulas: [
        ['Function Library', [[MathFormula20Regular, 'Insert\nFunction'], [Calculator20Regular, 'AutoSum'], [BookOpen20Regular, 'Recently\nUsed'], [Money20Regular, 'Financial'], [Lightbulb20Regular, 'Logical'], [TextT20Regular, 'Text'], [Calculator20Regular, 'Date &\nTime'], [Search20Regular, 'Lookup &\nReference'], [MathFormula20Regular, 'Math &\nTrig']]],
        ['Defined Names', [[TableSimple20Regular, 'Name\nManager']]],
        ['Formula Auditing', [[ArrowSort20Regular, 'Trace\nPrecedents'], [Eye20Regular, 'Watch\nWindow']]],
        ['Calculation', [[Calculator20Regular, 'Calculation\nOptions']]],
      ],
      data: [
        ['Get & Transform Data', [[Database20Regular, 'Get\nData'], [TextColumnTwo20Regular, 'From\nText/CSV'], [Link20Regular, 'From\nWeb'], [Table24Regular, 'From Table/\nRange']]],
        ['Queries & Connections', [[ArrowSync20Regular, 'Refresh\nAll']]],
        ['Data Types', [[CubeTree20Regular, 'Stocks'], [CubeTree20Regular, 'Currencies']]],
        ['Sort & Filter', [[ArrowSort20Regular, 'Sort'], [Filter20Regular, 'Filter']]],
        ['Data Tools', [[TextColumnTwo20Regular, 'Text to\nColumns'], [Flash20Regular, 'Flash\nFill'], [Checkmark20Regular, 'Data\nValidation']]],
        ['Forecast', [[DataLine20Regular, 'What-If\nAnalysis'], [DataLine20Regular, 'Forecast\nSheet']]],
      ],
      review: [
        ['Proofing', [[Checkmark20Regular, 'Spelling'], [BookOpen20Regular, 'Thesaurus'], [Calculator20Regular, 'Workbook\nStatistics']]],
        ['Accessibility', [[Eye20Regular, 'Check\nAccessibility']]],
        ['Language', [[Translate20Regular, 'Translate']]],
        ['Comments', [[Comment20Regular, 'New\nComment'], [Comment20Regular, 'Show\nComments']]],
        ['Protect', [[LockClosed20Regular, 'Protect\nSheet'], [LockClosed20Regular, 'Protect\nWorkbook']]],
      ],
      view: [
        ['Sheet View', [[Eye20Regular, 'Default']]],
        ['Workbook Views', [[Grid20Regular, 'Normal'], [Print20Regular, 'Page Break\nPreview'], [DocumentMargins20Regular, 'Page\nLayout']]],
        ['Show', [[Ruler20Regular, 'Ruler'], [Grid20Regular, 'Gridlines']]],
        ['Zoom', [[ZoomIn20Regular, 'Zoom'], [Search20Regular, '100%'], [ZoomIn20Regular, 'Zoom to\nSelection']]],
        ['Window', [[WindowNew20Regular, 'New\nWindow'], [TableFreezeRow20Regular, 'Freeze\nPanes']]],
        ['Macros', [[Code20Regular, 'Macros']]],
      ],
      automate: [
        ['Office Scripts', [[Code20Regular, 'New\nScript'], [Code20Regular, 'View\nScripts']]],
        ['Power Automate', [[Flash20Regular, 'Automate\nWork']]],
      ],
      help: [
        ['Help', [[QuestionCircle20Regular, 'Help'], [ChatHelp20Regular, 'Contact\nSupport'], [Comment20Regular, 'Feedback'], [Lightbulb20Regular, 'Show\nTraining']]],
        ['Voice', [[Mic20Regular, 'Dictate']]],
      ],
    }
    const groups = simple[tab] ?? []
    body = groups.map(([g, items], gi) => (
      <Group key={g} label={g} last={gi === groups.length - 1}>
        {items.map(([I, l], i) => {
          // the two "Pen" buttons on the Draw tab are different pens
          const k = l === 'Pen' ? `Pen ${i}` : l.replace(/\n/g, ' ')
          const hasMenu = !!act.menus[k]
          return (
            <WithMenu key={i} k={k} open={menu} onClose={close} act={act} width={hasMenu ? 230 : undefined}>
              <Big icon={I} label={l} chevron={hasMenu} active={act.on[k]} onClick={run(k)} />
            </WithMenu>
          )
        })}
      </Group>
    ))
  }

  return (
    <div className="h-[92px] shrink-0 mx-2 bg-white rounded-lg shadow-[0_0_2px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.14)] flex items-stretch px-1 relative z-20">
      {body}
    </div>
  )
}
