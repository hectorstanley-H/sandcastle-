import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  ClipboardPaste24Regular,
  Cut20Regular,
  Copy20Regular,
  PaintBrush20Regular,
  TextBold20Regular,
  TextItalic20Regular,
  TextUnderline20Regular,
  TextStrikethrough20Regular,
  TextSubscript20Regular,
  TextSuperscript20Regular,
  TextColor20Regular,
  Highlight20Regular,
  TextClearFormatting20Regular,
  TextChangeCase20Regular,
  TextEffects20Regular,
  TextBulletListLtr20Regular,
  TextNumberListLtr20Regular,
  TextBulletListTree20Regular,
  TextIndentDecreaseLtr20Regular,
  TextIndentIncreaseLtr20Regular,
  TextSortAscending20Regular,
  TextParagraph20Regular,
  TextAlignLeft20Regular,
  TextAlignCenter20Regular,
  TextAlignRight20Regular,
  TextAlignJustify20Regular,
  TextLineSpacing20Regular,
  PaintBucket20Regular,
  BorderBottom20Regular,
  Search20Regular,
  ArrowSwap20Regular,
  Cursor20Regular,
  Mic24Regular,
  TextProofingTools24Regular,
  AppsAddIn24Regular,
  Comment20Regular,
  Edit20Regular,
  Share20Regular,
  ChevronDown12Regular,
  Accessibility16Regular,
  DocumentOnePage16Regular,
  BookOpen16Regular,
  Globe16Regular,
  Add16Regular,
  Subtract16Regular,
  TextGrammarCheckmark20Regular,
  Glasses16Regular,
  Image20Regular,
  Table20Regular,
  Shapes24Regular,
  DocumentAdd24Regular,
  TextColumnTwo20Regular,
  CommentMultiple20Regular,
  DocumentCopy20Regular,
  Textbox20Regular,
  ArrowUp16Regular,
  ArrowDown16Regular,
  DocumentText16Regular,
} from '@fluentui/react-icons'
import { logoUrl, type AppProps } from '@/os/registry'
import { useDesk, useWin } from '@/os/context'
import { db, useCollection } from '@/db/db'
import { ME } from '@/data/people'
import { OfficeTitleBar, RibbonTabs, Ribbon, Group, BigBtn, SmBtn, FakeSelect, Sep, Backstage, HWorkerChip, CopilotIcon, FONT } from './office'
import { Editor, STYLE_CSS, type Para, type PStyle } from './Editor'

const COL = 'word.docs'
const BLUE = '#185ABD'
const ACCENT = '#185ABD'

interface WordDoc {
  id: string
  name: string
  title?: string
  paragraphs: Para[]
  modified: string
  author: string
  createdBy?: string
  updatedBy?: string
}

const TABS = ['Home', 'Insert', 'Draw', 'Design', 'Layout', 'References', 'Mailings', 'Review', 'View', 'Help']

const GALLERY: { key: string; label: string; style?: PStyle; preview: React.CSSProperties; text?: string }[] = [
  { key: 'normal', label: '¶ Normal', style: 'normal', preview: { fontSize: 13 } },
  { key: 'nospacing', label: '¶ No Spac...', preview: { fontSize: 13 } },
  { key: 'heading1', label: 'Heading 1', style: 'heading1', preview: { fontSize: 15, color: '#0F4761', fontFamily: STYLE_CSS.heading1.font } },
  { key: 'heading2', label: 'Heading 2', style: 'heading2', preview: { fontSize: 13.5, color: '#0F4761', fontFamily: STYLE_CSS.heading2.font } },
  { key: 'title', label: 'Title', style: 'title', preview: { fontSize: 22, fontFamily: STYLE_CSS.title.font, letterSpacing: -0.5 }, text: 'AaBb' },
  { key: 'subtitle', label: 'Subtitle', style: 'subtitle', preview: { fontSize: 13, color: '#595959', letterSpacing: 0.6 } },
  { key: 'subtle', label: 'Subtle Em...', preview: { fontSize: 13, fontStyle: 'italic', color: '#404040' } },
  { key: 'emphasis', label: 'Emphasis', preview: { fontSize: 13, fontStyle: 'italic' } },
  { key: 'intense', label: 'Intense E...', preview: { fontSize: 13, fontStyle: 'italic', color: '#0F4761' } },
  { key: 'strong', label: 'Strong', preview: { fontSize: 13, fontWeight: 700 } },
]

function countWords(ps: Para[]) {
  return ps.reduce((n, p) => n + (p.text.trim() ? p.text.trim().split(/\s+/).length : 0), 0)
}

/* ───────────────────────── Ribbons ───────────────────────── */

function HomeRibbon({ activeStyle, apply, bold, setBold }: { activeStyle?: PStyle; apply: (s: PStyle) => void; bold: boolean; setBold: (b: boolean) => void }) {
  return (
    <Ribbon>
      <Group label="Clipboard">
        <BigBtn icon={<ClipboardPaste24Regular className="w-8 h-8" />} label="Paste" dropdown />
        <div className="flex flex-col gap-0.5 pt-0.5">
          <SmBtn icon={<Cut20Regular />} label="Cut" />
          <SmBtn icon={<Copy20Regular />} label="Copy" />
          <SmBtn icon={<PaintBrush20Regular />} label="Format Painter" />
        </div>
      </Group>
      <Group label="Font">
        <div className="flex flex-col gap-1.5 pt-1">
          <div className="flex items-center gap-1">
            <FakeSelect value={activeStyle === 'title' || activeStyle?.startsWith('heading') ? 'Aptos Display (Headings)' : 'Aptos (Body)'} width={150} title="Font" />
            <FakeSelect value={String(Math.round((STYLE_CSS[activeStyle ?? 'normal'].size * 3) / 4))} width={46} title="Font Size" />
            <SmBtn title="Increase Font Size" icon={<span className="text-[14px] font-medium">A<sup className="text-[8px]">^</sup></span>} />
            <SmBtn title="Decrease Font Size" icon={<span className="text-[12px] font-medium">A<sup className="text-[8px]">˅</sup></span>} />
            <SmBtn title="Change Case" icon={<TextChangeCase20Regular />} dropdown />
            <SmBtn title="Clear All Formatting" icon={<TextClearFormatting20Regular />} />
          </div>
          <div className="flex items-center gap-[1px]">
            <SmBtn agent="word-bold" title="Bold (Ctrl+B)" icon={<TextBold20Regular />} active={bold} onClick={() => setBold(!bold)} />
            <SmBtn title="Italic (Ctrl+I)" icon={<TextItalic20Regular />} />
            <SmBtn title="Underline (Ctrl+U)" icon={<TextUnderline20Regular />} dropdown />
            <SmBtn title="Strikethrough" icon={<TextStrikethrough20Regular />} />
            <SmBtn title="Subscript" icon={<TextSubscript20Regular />} />
            <SmBtn title="Superscript" icon={<TextSuperscript20Regular />} />
            <Sep />
            <SmBtn title="Text Effects and Typography" icon={<TextEffects20Regular className="text-[#2B7CD3]" />} dropdown />
            <SmBtn title="Text Highlight Color" icon={<span className="relative"><Highlight20Regular /><span className="absolute left-0.5 right-0.5 -bottom-0.5 h-[3px] bg-[#FFFF00]" /></span>} dropdown />
            <SmBtn title="Font Color" icon={<span className="relative"><TextColor20Regular /><span className="absolute left-0.5 right-0.5 -bottom-0.5 h-[3px] bg-[#C00000]" /></span>} dropdown />
          </div>
        </div>
      </Group>
      <Group label="Paragraph">
        <div className="flex flex-col gap-1.5 pt-1">
          <div className="flex items-center gap-[1px]">
            <SmBtn agent="word-style-bullet" title="Bullets" icon={<TextBulletListLtr20Regular />} dropdown active={activeStyle === 'bullet'} onClick={() => apply(activeStyle === 'bullet' ? 'normal' : 'bullet')} />
            <SmBtn agent="word-style-number" title="Numbering" icon={<TextNumberListLtr20Regular />} dropdown active={activeStyle === 'number'} onClick={() => apply(activeStyle === 'number' ? 'normal' : 'number')} />
            <SmBtn title="Multilevel List" icon={<TextBulletListTree20Regular />} dropdown />
            <Sep />
            <SmBtn title="Decrease Indent" icon={<TextIndentDecreaseLtr20Regular />} />
            <SmBtn title="Increase Indent" icon={<TextIndentIncreaseLtr20Regular />} />
            <Sep />
            <SmBtn title="Sort" icon={<TextSortAscending20Regular />} />
            <SmBtn title="Show/Hide ¶" icon={<TextParagraph20Regular />} />
          </div>
          <div className="flex items-center gap-[1px]">
            <SmBtn title="Align Left" icon={<TextAlignLeft20Regular />} active />
            <SmBtn title="Center" icon={<TextAlignCenter20Regular />} />
            <SmBtn title="Align Right" icon={<TextAlignRight20Regular />} />
            <SmBtn title="Justify" icon={<TextAlignJustify20Regular />} />
            <Sep />
            <SmBtn title="Line and Paragraph Spacing" icon={<TextLineSpacing20Regular />} dropdown />
            <Sep />
            <SmBtn title="Shading" icon={<PaintBucket20Regular />} dropdown />
            <SmBtn title="Borders" icon={<BorderBottom20Regular />} dropdown />
          </div>
        </div>
      </Group>
      <Group label="Styles" className="flex-1 min-w-[200px]">
        <div className="flex items-stretch h-[68px] min-w-0 w-full">
          <div className="flex-1 min-w-0 flex overflow-hidden border border-[#E0E0E0] rounded-[4px]">
            {GALLERY.map((g) => {
              const on = g.style && g.style === (activeStyle === 'bullet' || activeStyle === 'number' ? 'normal' : activeStyle)
              return (
                <button
                  key={g.key}
                  data-agent={g.style ? `word-style-${g.style}` : undefined}
                  aria-label={`Style: ${g.label.replace('¶ ', '')}`}
                  title={g.label.replace('¶ ', '')}
                  onClick={() => g.style && apply(g.style)}
                  className={`shrink-0 w-[74px] h-full flex flex-col items-center justify-center gap-1.5 border ${on ? 'border-[#8A8A8A] bg-[#EBEBEB]' : 'border-transparent hover:bg-[#F0F0F0] hover:border-[#D1D1D1]'}`}
                >
                  <span className="h-[26px] flex items-end leading-none whitespace-nowrap text-[#000]" style={{ fontFamily: STYLE_CSS.normal.font, ...g.preview }}>
                    {g.text ?? 'AaBbCcDd'}
                  </span>
                  <span className="text-[11px] text-[#242424] leading-none whitespace-nowrap">{g.label}</span>
                </button>
              )
            })}
          </div>
          <div className="w-[18px] flex flex-col border border-l-0 border-[#E0E0E0] rounded-r-[4px] text-[#616161]">
            <span className="flex-1 flex items-center justify-center hover:bg-[#F0F0F0]"><ArrowUp16Regular className="w-3 h-3" /></span>
            <span className="flex-1 flex items-center justify-center hover:bg-[#F0F0F0]"><ArrowDown16Regular className="w-3 h-3" /></span>
            <span className="flex-1 flex items-center justify-center hover:bg-[#F0F0F0]"><ChevronDown12Regular className="w-3 h-3" /></span>
          </div>
        </div>
      </Group>
      <Group label="Editing">
        <div className="flex flex-col gap-0.5 pt-0.5">
          <SmBtn icon={<Search20Regular />} label="Find" dropdown />
          <SmBtn icon={<ArrowSwap20Regular />} label="Replace" />
          <SmBtn icon={<Cursor20Regular />} label="Select" dropdown />
        </div>
      </Group>
      <Group label="Voice">
        <BigBtn icon={<Mic24Regular className="w-7 h-7" />} label="Dictate" dropdown />
      </Group>
      <Group label="Editor">
        <BigBtn icon={<TextProofingTools24Regular className="w-7 h-7 text-[#185ABD]" />} label="Editor" />
      </Group>
      <Group label="Add-ins">
        <BigBtn icon={<AppsAddIn24Regular className="w-7 h-7" />} label="Add-ins" />
      </Group>
      <Group label="Copilot" last>
        <BigBtn icon={<CopilotIcon size={30} />} label="Copilot" />
      </Group>
    </Ribbon>
  )
}

function GenericRibbon({ tab }: { tab: string }) {
  const g = (label: string, items: [ReactNode, string][]) => (
    <Group key={label} label={label}>
      {items.map(([i, l]) => (
        <BigBtn key={l} icon={i} label={l} dropdown={l.includes('▾')} aria={l} />
      ))}
    </Group>
  )
  const big = (I: any, cls = '') => <I className={`w-7 h-7 ${cls}`} />
  const sets: Record<string, ReactNode[]> = {
    Insert: [
      g('Pages', [[big(DocumentAdd24Regular), 'Cover\nPage'], [big(DocumentOnePage16Regular), 'Blank\nPage']]),
      g('Tables', [[big(Table20Regular), 'Table']]),
      g('Illustrations', [[big(Image20Regular), 'Pictures'], [big(Shapes24Regular), 'Shapes'], [big(TextColumnTwo20Regular), 'Chart']]),
      g('Comments', [[big(Comment20Regular), 'Comment']]),
      g('Text', [[big(Textbox20Regular), 'Text\nBox'], [big(TextEffects20Regular), 'WordArt']]),
    ],
    Layout: [
      g('Page Setup', [[big(DocumentOnePage16Regular), 'Margins'], [big(DocumentText16Regular), 'Orientation'], [big(DocumentCopy20Regular), 'Size'], [big(TextColumnTwo20Regular), 'Columns']]),
      g('Paragraph', [[big(TextLineSpacing20Regular), 'Spacing'], [big(TextIndentIncreaseLtr20Regular), 'Indent']]),
      g('Arrange', [[big(Image20Regular), 'Position'], [big(TextAlignJustify20Regular), 'Wrap\nText']]),
    ],
    Review: [
      g('Proofing', [[big(TextGrammarCheckmark20Regular), 'Spelling &\nGrammar'], [big(TextProofingTools24Regular, 'text-[#185ABD]'), 'Editor']]),
      g('Accessibility', [[big(Accessibility16Regular), 'Check\nAccessibility']]),
      g('Comments', [[big(Comment20Regular), 'New\nComment'], [big(CommentMultiple20Regular), 'Show\nComments']]),
      g('Tracking', [[big(Edit20Regular), 'Track\nChanges']]),
    ],
    View: [
      g('Views', [[big(BookOpen16Regular), 'Read\nMode'], [big(DocumentOnePage16Regular), 'Print\nLayout'], [big(Globe16Regular), 'Web\nLayout']]),
      g('Immersive', [[big(Glasses16Regular), 'Focus'], [big(BookOpen16Regular), 'Immersive\nReader']]),
      g('Zoom', [[big(Search20Regular), 'Zoom'], [big(DocumentOnePage16Regular), '100%']]),
    ],
  }
  const groups = sets[tab] ?? [g(tab, [[big(Edit20Regular), tab]])]
  return <Ribbon>{groups}</Ribbon>
}

/* ───────────────────────── App ───────────────────────── */

export default function Word({ win, params }: AppProps) {
  const { isAgent } = useDesk()
  const { setTitle } = useWin()
  const docs = useCollection<WordDoc>(COL)
  const [docId, setDocId] = useState<string | null>(null)
  const [view, setView] = useState<'doc' | 'backstage'>('doc')
  const [tab, setTab] = useState('Home')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [bold, setBold] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [saveState, setSaveState] = useState<'saved' | 'saving'>('saved')
  const [page, setPage] = useState<[number, number]>([0, 1])
  const [flash, setFlash] = useState(false)
  const saveTimer = useRef<number | undefined>(undefined)

  const doc = docs.find((d) => d.id === docId)
  const recents = useMemo(() => [...docs].sort((a, b) => b.modified.localeCompare(a.modified)), [docs])

  const createDoc = () => {
    const names = new Set(db.get<WordDoc>(COL).map((d) => d.name))
    let n = 1
    while (names.has(`Document${n}.docx`)) n++
    const id = `doc-${Date.now().toString(36)}`
    const t = `${id}-p1`
    const rec: WordDoc = {
      id,
      name: `Document${n}.docx`,
      paragraphs: [
        { id: t, style: 'title', text: '' },
        { id: `${id}-p2`, style: 'normal', text: '' },
      ],
      modified: new Date().toISOString(),
      author: ME.name,
      ...(isAgent ? { createdBy: 'hworker' } : {}),
    }
    db.insert(COL, rec)
    setDocId(id)
    setActiveId(t)
    setView('doc')
    setFlash(true)
  }

  const openDoc = (id: string) => {
    setDocId(id)
    setActiveId(null)
    setView('doc')
  }

  // deep links
  useEffect(() => {
    if (params?.newDoc) createDoc()
    else if (params?.docId && db.find(COL, params.docId)) openDoc(params.docId)
    else if (!docId) {
      const latest = [...db.get<WordDoc>(COL)].sort((a, b) => b.modified.localeCompare(a.modified))[0]
      if (latest) openDoc(latest.id)
      else setView('backstage')
    }
  }, [win.nonce])

  useEffect(() => {
    setTitle(doc ? `${doc.name} - Word` : 'Word')
  }, [doc?.name])

  useEffect(() => {
    if (!flash) return
    const t = window.setTimeout(() => setFlash(false), 2400)
    return () => window.clearTimeout(t)
  }, [flash])

  useEffect(() => () => window.clearTimeout(saveTimer.current), [])

  const markSaving = () => {
    setSaveState('saving')
    window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => setSaveState('saved'), 900)
  }

  const onParagraphs = (fn: (ps: Para[]) => Para[]) => {
    if (!docId) return
    const cur = db.find<WordDoc>(COL, docId)
    if (!cur) return
    db.update(COL, docId, { paragraphs: fn(cur.paragraphs), modified: new Date().toISOString(), ...(isAgent ? { updatedBy: 'hworker' } : {}) })
    markSaving()
  }

  const effActive = doc ? (doc.paragraphs.find((p) => p.id === activeId) ?? doc.paragraphs[doc.paragraphs.length - 1]) : undefined

  const apply = (s: PStyle) => {
    if (!effActive) return
    onParagraphs((ps) => ps.map((p) => (p.id === effActive.id ? { ...p, style: s } : p)))
  }

  const save = () => {
    if (!doc) return
    db.update(COL, doc.id, { modified: new Date().toISOString(), ...(isAgent ? { updatedBy: 'hworker' } : {}) })
    setSaveState('saving')
    window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => setSaveState('saved'), 700)
  }

  const commitRename = () => {
    if (!doc) return
    const v = nameDraft.trim()
    if (v) {
      const name = /\.docx$/i.test(v) ? v : `${v}.docx`
      db.update(COL, doc.id, { name, modified: new Date().toISOString(), ...(isAgent ? { updatedBy: 'hworker' } : {}) })
    }
    setRenaming(false)
  }

  const hworker = doc && (doc.createdBy === 'hworker' || doc.updatedBy === 'hworker')
  const words = doc ? countWords(doc.paragraphs) : 0
  const stem = doc?.name.replace(/\.docx$/i, '') ?? ''

  const filenameButton = doc && (
    <div className="relative">
      <button
        data-agent="word-filename"
        aria-label="File name"
        onClick={() => {
          setNameDraft(stem)
          setRenaming((r) => !r)
        }}
        className="h-8 flex items-center gap-1 px-2 rounded hover:bg-white/15 text-[12px] max-w-[420px]"
      >
        <span className="truncate font-semibold">{stem}</span>
        <span className="opacity-90 whitespace-nowrap">• {saveState === 'saving' ? 'Saving...' : 'Saved to OneDrive'}</span>
        <ChevronDown12Regular className="shrink-0" />
      </button>
      {renaming && (
        <div className="absolute left-0 top-9 z-50 w-[340px] bg-white text-[#242424] rounded-[8px] shadow-[0_8px_16px_rgba(0,0,0,0.14),0_0_2px_rgba(0,0,0,0.12)] p-4" onPointerDown={(e) => e.stopPropagation()}>
          <label className="block text-[12px] font-semibold mb-1">File Name</label>
          <div className="flex items-center border border-[#D1D1D1] border-b-[#616161] rounded-[4px] focus-within:border-b-[#185ABD] focus-within:border-b-2 h-8 px-2">
            <input
              data-agent="word-title"
              aria-label="File Name"
              autoFocus={!isAgent}
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename()
                if (e.key === 'Escape') setRenaming(false)
              }}
              className="flex-1 outline-none text-[13px] bg-transparent"
            />
            <span className="text-[12px] text-[#616161]">.docx</span>
          </div>
          <label className="block text-[12px] font-semibold mt-3 mb-1">Location</label>
          <div className="flex items-center gap-2 text-[12.5px] text-[#424242]">
            <img src={logoUrl('onedrive')} className="w-4 h-4" alt="" />
            OneDrive - Northwind Global » Documents
          </div>
          <div className="mt-3 pt-3 border-t border-[#EDEBE9] flex items-center justify-between text-[12.5px]">
            <span className="text-[#185ABD]">Version History</span>
            <button onClick={commitRename} className="h-7 px-3 rounded-[4px] bg-[#185ABD] text-white text-[12px] font-semibold">Save</button>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[#F3F3F3] text-[#242424]" style={{ fontFamily: FONT }} onPointerDown={() => renaming && setRenaming(false)}>
      <OfficeTitleBar
        app="word"
        color={BLUE}
        fileName={doc?.name ?? 'Word'}
        status="Saved"
        onSave={save}
        saveAgentId="word-save"
        saving={saveState === 'saving'}
        filenameButton={filenameButton}
      />
      {view === 'backstage' ? (
        <Backstage
          app="word"
          color={BLUE}
          appName="Word"
          greeting="Good afternoon"
          canBack={!!doc}
          onBack={() => setView('doc')}
          onOpen={openDoc}
          recents={recents.map((d) => ({
            id: d.id,
            name: d.name,
            location: 'OneDrive - Northwind Global » Documents',
            modified: d.modified,
            agentId: `word-doc-${d.id}`,
            hworker: d.createdBy === 'hworker' || d.updatedBy === 'hworker',
          }))}
          newTiles={
            <>
              <button data-agent="word-new" aria-label="Blank document" onClick={createDoc} className="group text-left">
                <div className="w-[148px] h-[190px] bg-white border border-[#D1D1D1] group-hover:border-[#185ABD] group-hover:shadow-md" />
                <div className="text-[13px] mt-2">Blank document</div>
              </button>
              {[
                ['Welcome to Word', 'bg-gradient-to-b from-[#185ABD] to-[#2B7CD3]'],
                ['Single spaced (blank)', ''],
                ['Modern report', 'bg-[linear-gradient(#fff_55%,#1F3864_55%)]'],
                ['Meeting notes', ''],
                ['Project plan', 'bg-[linear-gradient(#0F4761_22%,#fff_22%)]'],
              ].map(([l, bg]) => (
                <div key={l} className="text-left">
                  <div className={`w-[148px] h-[190px] border border-[#D1D1D1] bg-white p-3 flex flex-col gap-1.5 ${bg}`}>
                    {!bg && (
                      <>
                        <span className="h-2.5 w-20 bg-[#0F4761]/70 rounded-sm" />
                        {Array.from({ length: 9 }, (_, i) => (
                          <span key={i} className="h-1 bg-[#C8C8C8] rounded-sm" style={{ width: `${70 + ((i * 37) % 30)}%` }} />
                        ))}
                      </>
                    )}
                  </div>
                  <div className="text-[13px] mt-2">{l}</div>
                </div>
              ))}
            </>
          }
        />
      ) : (
        <>
          <RibbonTabs
            tabs={TABS}
            active={tab}
            accent={ACCENT}
            fileAgentId="word-file-tab"
            onFile={() => setView('backstage')}
            onTab={setTab}
            right={
              <>
                <button className="h-[28px] px-2.5 flex items-center gap-1.5 rounded-[4px] border border-[#D1D1D1] bg-white text-[12.5px] hover:bg-[#F5F5F5]"><Comment20Regular className="w-4 h-4" /> Comments</button>
                <button className="h-[28px] px-2.5 flex items-center gap-1.5 rounded-[4px] border border-[#D1D1D1] bg-white text-[12.5px] hover:bg-[#F5F5F5]"><Edit20Regular className="w-4 h-4" /> Editing <ChevronDown12Regular /></button>
                <button className="h-[28px] px-3 flex items-center gap-1.5 rounded-[4px] text-white text-[12.5px] font-semibold" style={{ background: BLUE }}><Share20Regular className="w-4 h-4" /> Share <ChevronDown12Regular /></button>
              </>
            }
          />
          {tab === 'Home' ? <HomeRibbon activeStyle={effActive?.style} apply={apply} bold={bold} setBold={setBold} /> : <GenericRibbon tab={tab} />}
          {doc ? (
            <div className={`flex-1 min-h-0 flex flex-col ${flash ? 'flash-new' : ''}`}>
              <Editor
                key={doc.id}
                paragraphs={doc.paragraphs}
                activeId={activeId}
                setActive={setActiveId}
                onParagraphs={onParagraphs}
                onPage={(p, n) => setPage([p, n])}
              />
            </div>
          ) : (
            <div className="flex-1 bg-[#E6E6E6]" />
          )}
          {/* status bar */}
          <div className="h-[26px] shrink-0 flex items-center px-3 text-[12px] text-[#424242] bg-[#F3F3F3] border-t border-[#E0E0E0] gap-4 select-none">
            <span>Page {page[0] + 1} of {page[1]}</span>
            <span>{words.toLocaleString()} words</span>
            <span className="flex items-center"><TextGrammarCheckmark20Regular className="w-4 h-4" /></span>
            <span>English (United States)</span>
            <span>Text Predictions: On</span>
            <span className="flex items-center gap-1"><Accessibility16Regular /> Accessibility: Good to go</span>
            {hworker && <HWorkerChip />}
            <span className="flex-1" />
            <span className="flex items-center gap-1"><Glasses16Regular /> Focus</span>
            <span className="flex items-center gap-0.5">
              <span className="w-7 h-[22px] flex items-center justify-center rounded hover:bg-[#E0E0E0]" title="Read Mode"><BookOpen16Regular /></span>
              <span className="w-7 h-[22px] flex items-center justify-center rounded bg-[#DADADA]" title="Print Layout"><DocumentOnePage16Regular /></span>
              <span className="w-7 h-[22px] flex items-center justify-center rounded hover:bg-[#E0E0E0]" title="Web Layout"><Globe16Regular /></span>
            </span>
            <span className="flex items-center gap-1.5">
              <Subtract16Regular className="w-3.5 h-3.5" />
              <span className="relative w-[100px] h-[2px] bg-[#8A8A8A]">
                <span className="absolute left-1/2 -top-[6px] w-[4px] h-[14px] -ml-[2px] bg-[#424242] rounded-sm" />
              </span>
              <Add16Regular className="w-3.5 h-3.5" />
              <span className="w-9 text-right">100%</span>
            </span>
          </div>
        </>
      )}
    </div>
  )
}
