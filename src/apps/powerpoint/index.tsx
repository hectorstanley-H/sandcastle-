import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ClipboardPaste24Regular,
  Cut20Regular,
  Copy20Regular,
  PaintBrush20Regular,
  SlideAdd24Regular,
  SlideLayout20Regular,
  ArrowReset20Regular,
  TextBold20Regular,
  TextItalic20Regular,
  TextUnderline20Regular,
  TextStrikethrough20Regular,
  TextColor20Regular,
  TextBulletListLtr20Regular,
  TextNumberListLtr20Regular,
  TextAlignLeft20Regular,
  TextAlignCenter20Regular,
  TextAlignRight20Regular,
  TextAlignJustify20Regular,
  Shapes24Regular,
  Square20Regular,
  Circle20Regular,
  ArrowRight20Regular,
  Search20Regular,
  ArrowSwap20Regular,
  Mic24Regular,
  DesignIdeas24Regular,
  Comment20Regular,
  Share20Regular,
  ChevronDown12Regular,
  Record20Regular,
  Play20Regular,
  Notepad16Regular,
  Accessibility16Regular,
  Subtract16Regular,
  Add16Regular,
  ArrowFit16Regular,
  Grid16Regular,
  SlideMultiple16Regular,
  BookOpen16Regular,
  Desktop16Regular,
  Dismiss20Regular,
  ChevronLeft20Regular,
  ChevronRight20Regular,
  TabDesktop20Regular,
  ArrowSort20Regular,
} from '@fluentui/react-icons'
import type { AppProps } from '@/os/registry'
import { useDesk, useWin } from '@/os/context'
import { db, uid, useCollection, useRecord } from '@/db/db'
import { Backstage, BigBtn, CopilotIcon, Group, HWorkerChip, OfficeTitleBar, Ribbon, RibbonTabs, SmBtn, FakeSelect, Sep } from '@/apps/word/office'
import { SH, SW, SlideView, type Slide } from './Slide'

const ORANGE = '#C43E1C'
const COL = 'powerpoint.decks'
const TABS = ['Home', 'Insert', 'Draw', 'Design', 'Transitions', 'Animations', 'Slide Show', 'Record', 'Review', 'View', 'Help']

interface Deck {
  id: string
  name: string
  modified: string
  footer?: string
  slides: Slide[]
  createdBy?: string
  updatedBy?: string
}

const LAYOUTS: [Slide['layout'], string][] = [
  ['title', 'Title Slide'],
  ['titleContent', 'Title and Content'],
  ['section', 'Section Header'],
  ['twoContent', 'Two Content'],
  ['chart', 'Title and Chart'],
  ['closing', 'Closing'],
]

function useFit(ref: React.RefObject<HTMLDivElement | null>, pad = 48) {
  const [s, setS] = useState(0.8)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => setS(Math.max(0.2, Math.min((el.clientWidth - pad) / SW, (el.clientHeight - pad) / SH))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref, pad])
  return s
}

export default function PowerPoint({ win, params }: AppProps) {
  const { isAgent } = useDesk()
  const { setTitle } = useWin()
  const decks = useCollection<Deck>(COL)
  const [deckId, setDeckId] = useState<string | null>(null)
  const deck = useRecord<Deck>(COL, deckId)
  const [cur, setCur] = useState(0)
  const [view, setView] = useState<'deck' | 'backstage'>('deck')
  const [tab, setTab] = useState('Home')
  const [layoutMenu, setLayoutMenu] = useState(false)
  const [present, setPresent] = useState(false)
  const [saving, setSaving] = useState(false)
  const [fresh, setFresh] = useState<string[]>([])
  const canvasRef = useRef<HTMLDivElement>(null)
  const scale = useFit(canvasRef)

  const newDeck = () => {
    let k = 1
    while (db.get<Deck>(COL).some((d) => d.name === `Presentation${k}.pptx`)) k++
    const id = uid('deck')
    db.insert(COL, {
      id,
      name: `Presentation${k}.pptx`,
      modified: new Date().toISOString(),
      footer: 'Northwind Global',
      slides: [{ id: uid('sl'), layout: 'title', title: '', subtitle: '', bullets: [] }],
      ...(isAgent ? { createdBy: 'hworker' } : {}),
    })
    setDeckId(id)
    setCur(0)
    setView('deck')
  }

  useEffect(() => {
    const p = params ?? {}
    if (p.newDeck) newDeck()
    else if (p.deckId && db.find(COL, p.deckId)) {
      setDeckId(p.deckId)
      setCur(Number(p.slide ?? 0))
      setView('deck')
    } else if (!deckId) {
      const recent = [...db.get<Deck>(COL)].sort((a, b) => +new Date(b.modified) - +new Date(a.modified))[0]
      if (recent) setDeckId(recent.id)
      else setView('backstage')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [win.nonce])

  useEffect(() => {
    if (deck) setTitle(`${deck.name} - PowerPoint`)
  }, [deck?.name])

  const slides = deck?.slides ?? []
  const idx = Math.min(cur, Math.max(0, slides.length - 1))
  const slide = slides[idx]

  const patchDeck = (fn: (d: Deck) => Partial<Deck>) => {
    if (!deckId) return
    db.update(COL, deckId, (d) => ({ ...fn(d as Deck), modified: new Date().toISOString(), ...(isAgent ? { updatedBy: 'hworker' } : {}) }))
  }
  const patchSlide = (p: Partial<Slide>) => patchDeck((d) => ({ slides: d.slides.map((s, i) => (i === idx ? { ...s, ...p } : s)) }))

  const addSlide = (layout: Slide['layout'] = 'titleContent') => {
    const s: Slide = { id: uid('sl'), layout, title: '', subtitle: layout === 'title' || layout === 'section' || layout === 'closing' ? '' : undefined, bullets: [], ...(isAgent ? { createdBy: 'hworker', createdAt: new Date().toISOString() } : {}) }
    patchDeck((d) => ({ slides: [...d.slides.slice(0, idx + 1), s, ...d.slides.slice(idx + 1)] }))
    setCur(idx + 1)
    setFresh((f) => [...f, s.id])
    setLayoutMenu(false)
  }
  const deleteSlide = () => {
    if (slides.length < 2) return
    patchDeck((d) => ({ slides: d.slides.filter((_, i) => i !== idx) }))
    setCur(Math.max(0, idx - 1))
  }
  const save = () => {
    setSaving(true)
    patchDeck(() => ({}))
    setTimeout(() => setSaving(false), 900)
  }

  useEffect(() => {
    if (!present) return
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPresent(false)
      if (e.key === 'ArrowRight' || e.key === ' ') setCur((c) => Math.min(slides.length - 1, c + 1))
      if (e.key === 'ArrowLeft') setCur((c) => Math.max(0, c - 1))
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [present, slides.length])

  const recents = useMemo(() => [...decks].sort((a, b) => +new Date(b.modified) - +new Date(a.modified)), [decks])
  const hworker = deck && (deck.createdBy === 'hworker' || deck.updatedBy === 'hworker')
  const footer = deck?.footer ?? 'Northwind Global'

  return (
    <div className="relative flex-1 min-h-0 flex flex-col bg-[#F3F3F3] text-[#242424]" style={{ fontFamily: 'var(--font-win)' }}>
      <OfficeTitleBar app="powerpoint" color={ORANGE} fileName={deck?.name.replace(/\.pptx$/, '') ?? 'PowerPoint'} status="Saved to OneDrive" onSave={save} saveAgentId="ppt-save" saving={saving} />
      {view === 'backstage' || !deck ? (
        <Backstage
          app="powerpoint"
          color={ORANGE}
          appName="PowerPoint"
          greeting={new Date().getHours() < 12 ? 'Good morning' : 'Good afternoon'}
          canBack={!!deck}
          onBack={() => setView('deck')}
          onOpen={(id) => {
            setDeckId(id)
            setCur(0)
            setView('deck')
          }}
          recents={recents.map((d) => ({ id: d.id, name: d.name, location: 'OneDrive - Northwind Global » Documents', modified: d.modified, agentId: `ppt-deck-${d.id}`, hworker: d.createdBy === 'hworker' || d.updatedBy === 'hworker' }))}
          newTiles={
            <>
              <button data-agent="ppt-new-deck" aria-label="Blank Presentation" onClick={newDeck} className="group text-left">
                <div className="w-[200px] h-[113px] bg-white border border-[#D1D1D1] group-hover:border-[#C43E1C] flex items-center justify-center text-[13px] text-[#616161]">Click to add title</div>
                <div className="text-[13px] mt-2">Blank Presentation</div>
              </button>
              {[
                ['Welcome to PowerPoint', 'linear-gradient(135deg,#C43E1C,#ED6C47)'],
                ['Madison', 'linear-gradient(#14213D 60%,#E97132 60%)'],
                ['Atlas', 'linear-gradient(90deg,#156082 30%,#fff 30%)'],
                ['Gallery', 'linear-gradient(#fff 70%,#3B3838 70%)'],
              ].map(([l, bg]) => (
                <div key={l} className="text-left">
                  <div className="w-[200px] h-[113px] border border-[#D1D1D1]" style={{ background: bg }} />
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
            accent={ORANGE}
            fileAgentId="ppt-file-tab"
            onFile={() => setView('backstage')}
            onTab={setTab}
            right={
              <>
                <button className="h-[28px] px-2.5 flex items-center gap-1.5 rounded-[4px] border border-[#D1D1D1] bg-white text-[12.5px] hover:bg-[#F5F5F5]">
                  <Record20Regular className="w-4 h-4 text-[#C42B1C]" /> Record
                </button>
                <button data-agent="ppt-present" aria-label="Present" onClick={() => setPresent(true)} className="h-[28px] px-2.5 flex items-center gap-1.5 rounded-[4px] border border-[#D1D1D1] bg-white text-[12.5px] hover:bg-[#F5F5F5]">
                  <Play20Regular className="w-4 h-4" /> Present <ChevronDown12Regular />
                </button>
                <button className="h-[28px] px-2.5 flex items-center gap-1.5 rounded-[4px] border border-[#D1D1D1] bg-white text-[12.5px] hover:bg-[#F5F5F5]">
                  <Comment20Regular className="w-4 h-4" />
                </button>
                <button className="h-[28px] px-3 flex items-center gap-1.5 rounded-[4px] text-white text-[12.5px] font-semibold" style={{ background: ORANGE }}>
                  <Share20Regular className="w-4 h-4" /> Share <ChevronDown12Regular />
                </button>
              </>
            }
          />
          <Ribbon>
            {tab === 'Home' ? (
              <>
                <Group label="Clipboard">
                  <BigBtn icon={<ClipboardPaste24Regular className="w-8 h-8" />} label="Paste" dropdown />
                  <div className="flex flex-col">
                    <SmBtn icon={<Cut20Regular />} title="Cut" />
                    <SmBtn icon={<Copy20Regular />} title="Copy" dropdown />
                    <SmBtn icon={<PaintBrush20Regular />} title="Format Painter" />
                  </div>
                </Group>
                <Group label="Slides">
                  <BigBtn
                    icon={<SlideAdd24Regular className="w-8 h-8 text-[#C43E1C]" />}
                    label="New Slide"
                    agent="ppt-new-slide"
                    onClick={() => addSlide('titleContent')}
                    onDropdown={() => setLayoutMenu((m) => !m)}
                    dropdownAgent="ppt-new-slide-menu"
                  />
                  <div className="flex flex-col">
                    <SmBtn icon={<SlideLayout20Regular />} label="Layout" dropdown onClick={() => setLayoutMenu((m) => !m)} />
                    <SmBtn icon={<ArrowReset20Regular />} label="Reset" />
                    <SmBtn icon={<TabDesktop20Regular />} label="Section" dropdown />
                  </div>
                </Group>
                <Group label="Font">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1">
                      <FakeSelect value="Aptos (Body)" width={130} title="Font" />
                      <FakeSelect value="20" width={46} title="Font Size" />
                    </div>
                    <div className="flex items-center">
                      {[TextBold20Regular, TextItalic20Regular, TextUnderline20Regular, TextStrikethrough20Regular].map((I, i) => (
                        <SmBtn key={i} icon={<I />} title={['Bold', 'Italic', 'Underline', 'Strikethrough'][i]} agent={i === 0 ? 'ppt-bold' : undefined} />
                      ))}
                      <Sep />
                      <SmBtn icon={<TextColor20Regular />} title="Font Color" dropdown />
                    </div>
                  </div>
                </Group>
                <Group label="Paragraph">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center">
                      <SmBtn icon={<TextBulletListLtr20Regular />} title="Bullets" dropdown active />
                      <SmBtn icon={<TextNumberListLtr20Regular />} title="Numbering" dropdown />
                      <SmBtn icon={<ArrowSort20Regular />} title="Line Spacing" dropdown />
                    </div>
                    <div className="flex items-center">
                      {[TextAlignLeft20Regular, TextAlignCenter20Regular, TextAlignRight20Regular, TextAlignJustify20Regular].map((I, i) => (
                        <SmBtn key={i} icon={<I />} title={['Align Left', 'Center', 'Align Right', 'Justify'][i]} active={i === 0} />
                      ))}
                    </div>
                  </div>
                </Group>
                <Group label="Drawing">
                  <div className="grid grid-cols-4 gap-0.5 p-1 border border-[#E0E0E0] rounded h-[60px] w-[104px] content-start">
                    {[Square20Regular, Circle20Regular, ArrowRight20Regular, Square20Regular, Circle20Regular, ArrowRight20Regular, Square20Regular, Circle20Regular].map((I, i) => (
                      <I key={i} className="w-5 h-5 text-[#424242]" />
                    ))}
                  </div>
                  <BigBtn icon={<Shapes24Regular className="w-8 h-8" />} label={'Arrange'} dropdown />
                  <BigBtn icon={<PaintBrush20Regular className="w-7 h-7" />} label={'Quick\nStyles'} dropdown />
                </Group>
                <Group label="Editing">
                  <div className="flex flex-col">
                    <SmBtn icon={<Search20Regular />} label="Find" />
                    <SmBtn icon={<ArrowSwap20Regular />} label="Replace" dropdown />
                    <SmBtn icon={<Grid16Regular />} label="Select" dropdown />
                  </div>
                </Group>
                <Group label="Voice">
                  <BigBtn icon={<Mic24Regular className="w-8 h-8" />} label="Dictate" dropdown />
                </Group>
                <Group label="Designer">
                  <BigBtn icon={<DesignIdeas24Regular className="w-8 h-8 text-[#C43E1C]" />} label="Designer" />
                </Group>
                <Group label="Copilot" last>
                  <BigBtn icon={<CopilotIcon size={30} />} label="Copilot" />
                </Group>
              </>
            ) : (
              <Group label={tab} last>
                {(
                  {
                    Insert: ['New\nSlide', 'Table', 'Pictures', 'Shapes', 'Icons', 'SmartArt', 'Chart', 'Text\nBox', 'Header\n& Footer', 'Video', 'Audio'],
                    Design: ['Office\nTheme', 'Facet', 'Ion', 'Madison', 'Variants', 'Slide\nSize', 'Format\nBackground', 'Designer'],
                    Transitions: ['None', 'Morph', 'Fade', 'Push', 'Wipe', 'Split', 'Reveal', 'Effect\nOptions'],
                    Animations: ['None', 'Appear', 'Fade', 'Fly In', 'Float In', 'Split', 'Wipe', 'Animation\nPane'],
                    'Slide Show': ['From\nBeginning', 'From Current\nSlide', 'Present\nOnline', 'Rehearse\nTimings', 'Record'],
                  } as Record<string, string[]>
                )[tab]?.map((l) => <BigBtn key={l} icon={<SlideMultiple16Regular className="w-7 h-7 text-[#424242]" />} label={l} />) ?? <BigBtn icon={<SlideMultiple16Regular className="w-7 h-7" />} label={tab} />}
              </Group>
            )}
          </Ribbon>
          {layoutMenu && (
            <div className="absolute z-50 left-[150px] top-[176px] w-[430px] bg-white rounded-md border border-black/10 shadow-[0_8px_24px_rgba(0,0,0,0.2)] p-3" data-agent="ppt-layout-gallery">
              <div className="text-[12px] font-semibold text-[#616161] mb-2">Northwind Theme</div>
              <div className="grid grid-cols-3 gap-3">
                {LAYOUTS.map(([l, label]) => (
                  <button key={l} data-agent={`ppt-layout-${l}`} aria-label={label} onClick={() => addSlide(l)} className="text-center group">
                    <div className="relative w-[124px] h-[70px] border border-[#D1D1D1] group-hover:border-[#C43E1C] overflow-hidden">
                      <div className="absolute left-0 top-0 origin-top-left" style={{ transform: `scale(${124 / SW})`, width: SW, height: SH }}>
                        <SlideView slide={{ id: l, layout: l, title: label, subtitle: 'Subtitle', bullets: ['Text', 'Text'], chart: l === 'chart' ? { type: 'bar', data: [{ name: 'A', value: 3 }, { name: 'B', value: 5 }, { name: 'C', value: 4 }] } : undefined }} n={1} footer="" />
                      </div>
                    </div>
                    <div className="text-[11.5px] mt-1">{label}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex-1 min-h-0 flex" onMouseDown={() => layoutMenu && setLayoutMenu(false)}>
            {/* thumbnails */}
            <div className="w-[200px] shrink-0 overflow-auto py-2 pr-2" data-agent="ppt-thumbnails">
              {slides.map((s, i) => (
                <div key={s.id} className="flex items-start gap-1.5 mb-2.5 pl-1">
                  <span className="w-5 text-right text-[11.5px] text-[#424242] pt-0.5">{i + 1}</span>
                  <button
                    data-agent={`ppt-slide-${i}`}
                    aria-label={`Slide ${i + 1}: ${s.title || 'Untitled'}`}
                    onClick={() => setCur(i)}
                    className={`relative shrink-0 rounded-[4px] overflow-hidden bg-white ${i === idx ? 'outline outline-2 outline-[#C43E1C] outline-offset-1' : 'outline outline-1 outline-[#D1D1D1] hover:outline-[#A0A0A0]'} ${fresh.includes(s.id) ? 'flash-new' : ''}`}
                    style={{ width: 160, height: 90 }}
                  >
                    <div className="absolute left-0 top-0 origin-top-left pointer-events-none" style={{ transform: `scale(${160 / SW})`, width: SW, height: SH }}>
                      <SlideView slide={s} n={i + 1} footer={footer} />
                    </div>
                    {s.createdBy === 'hworker' && <span className="absolute right-1 bottom-1 w-2 h-2 rounded-full bg-[#430693]" title="Added by H-Worker" />}
                  </button>
                </div>
              ))}
            </div>

            {/* canvas + notes */}
            <div className="flex-1 min-w-0 flex flex-col">
              <div ref={canvasRef} className="flex-1 min-h-0 flex items-center justify-center bg-[#E6E6E6] rounded-tl-lg">
                {slide && (
                  <div style={{ width: SW * scale, height: SH * scale }} className="relative shadow-[0_2px_8px_rgba(0,0,0,0.18)]">
                    <div className="absolute left-0 top-0 origin-top-left" style={{ transform: `scale(${scale})`, width: SW, height: SH }} data-agent="ppt-canvas">
                      <SlideView
                        key={slide.id}
                        slide={slide}
                        n={idx + 1}
                        footer={footer}
                        edit={{ onTitle: (v) => patchSlide({ title: v }), onSubtitle: (v) => patchSlide({ subtitle: v }), onBullets: (v) => patchSlide({ bullets: v }) }}
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="h-[86px] shrink-0 bg-white border-t border-[#E0E0E0]">
                <textarea
                  data-agent="ppt-notes"
                  aria-label="Speaker notes"
                  value={slide?.notes ?? ''}
                  onChange={(e) => patchSlide({ notes: e.target.value })}
                  placeholder="Click to add notes"
                  className="w-full h-full resize-none outline-none px-5 py-3 text-[13px] leading-[1.5] placeholder:text-[#8A8886]"
                />
              </div>
            </div>
          </div>

          {/* status bar */}
          <div className="h-[26px] shrink-0 flex items-center px-3 text-[12px] text-[#424242] bg-[#F3F3F3] border-t border-[#E0E0E0] gap-4 select-none">
            <span>
              Slide {idx + 1} of {slides.length}
            </span>
            <span>English (United States)</span>
            <span className="flex items-center gap-1">
              <Accessibility16Regular /> Accessibility: Investigate
            </span>
            {hworker && <HWorkerChip />}
            <span className="flex-1" />
            <button onClick={deleteSlide} className="hidden" aria-label="Delete slide" />
            <span className="flex items-center gap-1">
              <Notepad16Regular /> Notes
            </span>
            <span className="flex items-center gap-1">
              <Desktop16Regular /> Display Settings
            </span>
            <span className="flex items-center gap-0.5">
              <span className="w-7 h-[22px] flex items-center justify-center rounded bg-[#DADADA]" title="Normal">
                <SlideMultiple16Regular />
              </span>
              <span className="w-7 h-[22px] flex items-center justify-center rounded hover:bg-[#E0E0E0]" title="Slide Sorter">
                <Grid16Regular />
              </span>
              <span className="w-7 h-[22px] flex items-center justify-center rounded hover:bg-[#E0E0E0]" title="Reading View">
                <BookOpen16Regular />
              </span>
            </span>
            <span className="flex items-center gap-1.5">
              <Subtract16Regular className="w-3.5 h-3.5" />
              <span className="relative w-[100px] h-[2px] bg-[#8A8A8A]">
                <span className="absolute -top-[6px] w-[4px] h-[14px] -ml-[2px] bg-[#424242] rounded-sm" style={{ left: `${Math.min(100, scale * 60)}%` }} />
              </span>
              <Add16Regular className="w-3.5 h-3.5" />
              <span className="w-9 text-right">{Math.round(scale * 100)}%</span>
              <ArrowFit16Regular />
            </span>
          </div>
        </>
      )}

      {present && slide && (
        <div className="absolute inset-0 z-[60] bg-black flex items-center justify-center" data-agent="ppt-slideshow" onClick={() => (idx < slides.length - 1 ? setCur(idx + 1) : setPresent(false))}>
          <PresentSlide slide={slide} n={idx + 1} footer={footer} />
          <div className="absolute left-4 bottom-4 flex items-center gap-2 opacity-60 hover:opacity-100" onClick={(e) => e.stopPropagation()}>
            <button aria-label="Previous" onClick={() => setCur(Math.max(0, idx - 1))} className="w-8 h-8 rounded-full bg-white/15 text-white flex items-center justify-center"><ChevronLeft20Regular /></button>
            <button aria-label="Next" onClick={() => setCur(Math.min(slides.length - 1, idx + 1))} className="w-8 h-8 rounded-full bg-white/15 text-white flex items-center justify-center"><ChevronRight20Regular /></button>
            <button data-agent="ppt-end-show" aria-label="End Slide Show" onClick={() => setPresent(false)} className="w-8 h-8 rounded-full bg-white/15 text-white flex items-center justify-center"><Dismiss20Regular /></button>
          </div>
        </div>
      )}
    </div>
  )
}

function PresentSlide({ slide, n, footer }: { slide: Slide; n: number; footer: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const s = useFit(ref, 0)
  return (
    <div ref={ref} className="absolute inset-0 flex items-center justify-center">
      <div style={{ width: SW * s, height: SH * s }} className="relative">
        <div className="absolute left-0 top-0 origin-top-left" style={{ transform: `scale(${s})`, width: SW, height: SH }}>
          <SlideView slide={slide} n={n} footer={footer} />
        </div>
      </div>
    </div>
  )
}
