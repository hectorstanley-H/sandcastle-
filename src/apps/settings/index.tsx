import { useEffect, useState } from 'react'
import {
  Home20Filled,
  Desktop20Filled,
  Bluetooth20Filled,
  Wifi120Filled,
  PaintBrush20Filled,
  Apps20Filled,
  Person20Filled,
  Clock20Filled,
  Games20Filled,
  Accessibility20Filled,
  ShieldLock20Filled,
  ArrowSync20Filled,
  ChevronRight16Regular,
  Search16Regular,
  Speaker220Regular,
  Alert20Regular,
  Battery820Regular,
  Storage20Regular,
  Info20Regular,
  BrightnessHigh20Regular,
  WeatherMoon20Regular,
  Image20Regular,
  Color20Regular,
  Lightbulb20Regular,
  LockClosed20Regular,
  Keyboard20Regular,
  Grid20Regular,
  TextFont20Regular,
  Mail20Regular,
  Key20Regular,
  Briefcase20Regular,
  People20Regular,
  CloudArrowUp20Regular,
  Pause20Regular,
  History20Regular,
  Settings20Regular,
  Window20Regular,
  ArrowCounterclockwise20Regular,
  Clipboard20Regular,
  Phone20Regular,
  Print20Regular,
  Cursor20Regular as Mouse20Regular,
  Globe20Regular,
  PlugConnected20Regular,
  Shield20Regular,
  Location20Regular,
  Camera20Regular,
  Mic20Regular,
  Translate20Regular,
  Video20Regular,
  Eye20Regular,
  ZoomIn20Regular,
  Headphones20Regular,
  Router20Regular,
  WindowDevTools20Regular,
  Timer20Regular,
  CheckmarkCircle20Filled,
} from '@fluentui/react-icons'
import type { AppProps } from '@/os/registry'
import { logoUrl } from '@/os/registry'
import { useWin } from '@/os/context'
import { Avatar } from '@/components/Avatar'
import { ME, COMPANY } from '@/data/people'
import { requestReset } from '@/os/system'
import { BloomWallpaper } from '@/os/Wallpaper'

type PageId = 'home' | 'system' | 'display' | 'bluetooth' | 'network' | 'personalization' | 'apps' | 'accounts' | 'time' | 'gaming' | 'accessibility' | 'privacy' | 'update' | 'about'

const NAV: [PageId, string, any, string][] = [
  ['home', 'Home', Home20Filled, '#5A5A5A'],
  ['system', 'System', Desktop20Filled, '#0067C0'],
  ['bluetooth', 'Bluetooth & devices', Bluetooth20Filled, '#0067C0'],
  ['network', 'Network & internet', Wifi120Filled, '#0F7FD6'],
  ['personalization', 'Personalization', PaintBrush20Filled, '#D35400'],
  ['apps', 'Apps', Apps20Filled, '#4A5A6A'],
  ['accounts', 'Accounts', Person20Filled, '#2E8B57'],
  ['time', 'Time & language', Clock20Filled, '#0F7FD6'],
  ['gaming', 'Gaming', Games20Filled, '#5A5A5A'],
  ['accessibility', 'Accessibility', Accessibility20Filled, '#0F7FD6'],
  ['privacy', 'Privacy & security', ShieldLock20Filled, '#5A5A5A'],
  ['update', 'Windows Update', ArrowSync20Filled, '#0067C0'],
]

const TITLES: Record<string, string> = Object.fromEntries(NAV.map(([id, l]) => [id, l]))
TITLES.display = 'Display'
TITLES.about = 'About'

/* ───────── primitives ───────── */

function Toggle({ on, onChange, agent, label }: { on: boolean; onChange: (v: boolean) => void; agent?: string; label?: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[14px] text-[#1A1A1A] w-6 text-right">{on ? 'On' : 'Off'}</span>
      <button
        role="switch"
        aria-checked={on}
        aria-label={label}
        data-agent={agent}
        onClick={() => onChange(!on)}
        className={`relative w-10 h-5 rounded-full border transition-colors ${on ? 'bg-[#005FB8] border-[#005FB8]' : 'bg-transparent border-[#616161]'}`}
      >
        <span className={`absolute top-1/2 -translate-y-1/2 rounded-full transition-all ${on ? 'left-[22px] w-3 h-3 bg-white' : 'left-[3px] w-3 h-3 bg-[#5C5C5C]'}`} />
      </button>
    </div>
  )
}

function Card({ icon: I, title, sub, right, onClick, agent, children, first, last }: { icon?: any; title: string; sub?: string; right?: React.ReactNode; onClick?: () => void; agent?: string; children?: React.ReactNode; first?: boolean; last?: boolean }) {
  return (
    <div
      data-agent={agent}
      role={onClick ? 'button' : undefined}
      aria-label={title}
      onClick={onClick}
      className={`flex items-center gap-4 min-h-[68px] px-4 py-3 bg-[#FBFBFB] border border-[#E5E5E5] ${onClick ? 'hover:bg-[#F6F6F6] cursor-default' : ''} ${first !== false ? '' : ''} rounded-[6px] mb-[3px]`}
    >
      {I && <I className="text-[#1A1A1A] shrink-0" />}
      <div className="flex-1 min-w-0">
        <div className="text-[14px] text-[#1A1A1A]">{title}</div>
        {sub && <div className="text-[12px] text-[#5D5D5D] leading-snug">{sub}</div>}
        {children}
      </div>
      {right}
      {onClick && !right && <ChevronRight16Regular className="text-[#5D5D5D]" />}
    </div>
  )
}
const Section = ({ t }: { t: string }) => <div className="text-[14px] font-semibold text-[#1A1A1A] mt-6 mb-2">{t}</div>

function Dropdown({ value, options, agent, onChange }: { value: string; options: string[]; agent?: string; onChange?: (v: string) => void }) {
  return (
    <select
      data-agent={agent}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      className="h-8 min-w-[180px] px-3 rounded-[4px] bg-white border border-[#E0E0E0] border-b-[#C4C4C4] text-[14px] outline-none"
      style={{ fontSize: 14 }}
    >
      {options.map((o) => (
        <option key={o}>{o}</option>
      ))}
    </select>
  )
}

function Slider({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return <input type="range" min={0} max={100} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-[200px] accent-[#005FB8]" aria-label="Brightness" />
}

/* ───────── pages ───────── */

function DemoCard() {
  return (
    <div className="mt-6 rounded-[8px] border border-[#D9C8F2] bg-gradient-to-r from-[#F6F0FF] to-[#FBFBFB] p-5 flex items-center gap-5" data-agent="settings-demo-card">
      <img src={logoUrl('hworker')} className="w-12 h-12 rounded-xl" alt="" />
      <div className="flex-1">
        <div className="text-[15px] font-semibold text-[#1A1A1A]">H-Worker demo</div>
        <div className="text-[13px] text-[#5D5D5D] mt-0.5">Reset every app (Outlook, SAP, Workday, Explorer…) back to its starting data, close all windows and stop running agents.</div>
      </div>
      <button data-agent="settings-reset-demo" aria-label="Reset demo" onClick={() => requestReset()} className="h-9 px-5 rounded-[4px] bg-[#430693] hover:bg-[#5A12B8] text-white text-[14px] font-semibold flex items-center gap-2">
        <ArrowCounterclockwise20Regular /> Reset demo
      </button>
    </div>
  )
}

function DeviceHero() {
  return (
    <div className="flex items-center gap-5 mb-5">
      <div className="w-[150px] h-[96px] rounded-[6px] overflow-hidden relative border-[5px] border-[#1F1F1F] shadow">
        <BloomWallpaper />
      </div>
      <div>
        <div className="text-[20px] font-semibold">NW-LT-0142</div>
        <div className="text-[14px] text-[#5D5D5D]">Surface Laptop 7</div>
        <button className="text-[14px] text-[#005FB8] hover:underline mt-0.5">Rename</button>
      </div>
      <div className="flex-1" />
      <div className="flex gap-8 text-[13px]">
        <div className="flex items-center gap-2"><img src={logoUrl('microsoft')} className="w-6 h-6" alt="" /><div><div className="font-semibold">Microsoft 365</div><div className="text-[#5D5D5D]">Business Premium</div></div></div>
        <div className="flex items-center gap-2"><img src={logoUrl('onedrive')} className="w-6 h-6" alt="" /><div><div className="font-semibold">OneDrive</div><div className="text-[#5D5D5D]">412 GB of 1 TB used</div></div></div>
        <div className="flex items-center gap-2"><ArrowSync20Filled className="text-[#0067C0]" /><div><div className="font-semibold">Windows Update</div><div className="text-[#5D5D5D]">Last checked: 38 minutes ago</div></div></div>
      </div>
    </div>
  )
}

function SystemPage({ go }: { go: (p: PageId) => void }) {
  return (
    <>
      <DeviceHero />
      {[
        [Desktop20Filled, 'Display', 'Monitors, brightness, night light, display profile', 'display'],
        [Speaker220Regular, 'Sound', 'Volume levels, output, input, sound devices'],
        [Alert20Regular, 'Notifications', 'Alerts from apps and system, do not disturb'],
        [Timer20Regular, 'Focus', 'Reduce distractions'],
        [Battery820Regular, 'Power & battery', 'Sleep, battery usage, battery saver'],
        [Storage20Regular, 'Storage', 'Storage space, drives, configuration rules'],
        [Phone20Regular, 'Nearby sharing', 'Discoverability, received files location'],
        [Window20Regular, 'Multitasking', 'Snap windows, desktops, task switching'],
        [CheckmarkCircle20Filled, 'Activation', 'Activation state, subscriptions, product key'],
        [WindowDevTools20Regular, 'Troubleshoot', 'Recommended troubleshooters, preferences, history'],
        [ArrowCounterclockwise20Regular, 'Recovery', 'Reset, advanced startup, go back'],
        [Clipboard20Regular, 'Clipboard', 'Cut and copy history, sync, clear'],
        [Info20Regular, 'About', 'Device specifications, rename PC, Windows specifications', 'about'],
      ].map(([I, t, s, p]: any) => (
        <Card key={t} icon={I} title={t} sub={s} agent={`settings-system-${t.toLowerCase().replace(/[^a-z]+/g, '-')}`} onClick={() => p && go(p)} />
      ))}
    </>
  )
}

function DisplayPage() {
  const [bright, setBright] = useState(72)
  const [night, setNight] = useState(false)
  const [hdr, setHdr] = useState(false)
  const [scale, setScale] = useState('125% (Recommended)')
  return (
    <>
      <div className="h-[150px] rounded-[6px] bg-[#FBFBFB] border border-[#E5E5E5] flex items-center justify-center mb-[3px]">
        <div className="w-[110px] h-[74px] rounded-[4px] bg-[#0067C0] text-white text-[28px] font-semibold flex items-center justify-center shadow-inner">1</div>
      </div>
      <Section t="Brightness & color" />
      <Card icon={BrightnessHigh20Regular} title="Brightness" sub="Adjust the brightness of the built-in display" right={<Slider value={bright} onChange={setBright} />} />
      <Card icon={WeatherMoon20Regular} title="Night light" sub="Use warmer colors to help block blue light" right={<Toggle on={night} onChange={setNight} agent="settings-night-light" label="Night light" />} />
      <Card icon={Color20Regular} title="HDR" sub="More about HDR" right={<Toggle on={hdr} onChange={setHdr} label="HDR" />} />
      <Section t="Scale & layout" />
      <Card icon={ZoomIn20Regular} title="Scale" sub="Change the size of text, apps, and other items" right={<Dropdown value={scale} onChange={setScale} agent="settings-scale" options={['100%', '125% (Recommended)', '150%', '175%', '200%']} />} />
      <Card icon={Desktop20Filled} title="Display resolution" sub="Adjust the resolution to fit your connected display" right={<Dropdown value="2496 × 1664 (Recommended)" options={['2496 × 1664 (Recommended)', '1920 × 1280', '1680 × 1120', '1280 × 854']} />} />
      <Card icon={ArrowSync20Filled} title="Display orientation" right={<Dropdown value="Landscape" options={['Landscape', 'Portrait', 'Landscape (flipped)', 'Portrait (flipped)']} />} />
      <Card icon={Grid20Regular} title="Multiple displays" sub="Choose the presentation mode for your displays" onClick={() => {}} />
      <Section t="Related settings" />
      <Card icon={Image20Regular} title="Advanced display" sub="Display information, refresh rate" onClick={() => {}} />
      <Card icon={Settings20Regular} title="Graphics" onClick={() => {}} />
    </>
  )
}

function PersonalizationPage() {
  const themes = [
    ['Windows (light)', '#B9D7F7', 'light'],
    ['Windows (dark)', '#0E2A5C', 'dark'],
    ['Glow', '#3A1C71', 'dark'],
    ['Captured Motion', '#1F3B2D', 'dark'],
    ['Sunrise', '#F6A96B', 'light'],
    ['Flow', '#7FB8E8', 'light'],
  ]
  const [theme, setTheme] = useState(0)
  return (
    <>
      <div className="flex gap-6 mb-4">
        <div className="w-[330px] h-[190px] rounded-[8px] overflow-hidden relative border-[6px] border-[#1F1F1F] shadow-md">
          <BloomWallpaper variant={themes[theme][2] === 'dark' ? 'dark' : 'light'} />
          <div className="absolute left-3 right-3 bottom-3 h-[42px] rounded-md bg-white/85 backdrop-blur" />
          <div className="absolute left-1/2 -translate-x-1/2 bottom-5 flex gap-1.5">
            {['outlook', 'explorer', 'edge', 'teams', 'excel'].map((l) => (
              <img key={l} src={logoUrl(l)} className="w-5 h-5" alt="" />
            ))}
          </div>
        </div>
        <div className="flex-1">
          <div className="text-[14px] mb-2">Select a theme to apply</div>
          <div className="grid grid-cols-3 gap-2">
            {themes.map(([n, c, mode], i) => (
              <button
                key={n}
                data-agent={`settings-theme-${i}`}
                aria-label={n}
                title={n}
                onClick={() => setTheme(i)}
                className={`h-[64px] rounded-[6px] relative overflow-hidden border-2 ${theme === i ? 'border-[#005FB8]' : 'border-transparent'}`}
                style={{ background: `linear-gradient(135deg, ${c}, ${mode === 'dark' ? '#000' : '#fff'})` }}
              >
                <span className={`absolute bottom-1.5 right-1.5 w-7 h-4 rounded-sm ${mode === 'dark' ? 'bg-[#2B2B2B]' : 'bg-white'}`} />
              </button>
            ))}
          </div>
        </div>
      </div>
      {[
        [Image20Regular, 'Background', 'Background image, color, slideshow'],
        [Color20Regular, 'Colors', 'Accent color, transparency effects, color theme'],
        [PaintBrush20Filled, 'Themes', 'Install, create, manage'],
        [Lightbulb20Regular, 'Dynamic Lighting', 'Connected devices, effects, app settings'],
        [LockClosed20Regular, 'Lock screen', 'Lock screen images, apps, animations'],
        [Keyboard20Regular, 'Text input', 'Touch keyboard, voice typing, emoji and more, input method editor'],
        [Grid20Regular, 'Start', 'Recent apps and items, folders'],
        [Window20Regular, 'Taskbar', 'Taskbar behaviors, system pins'],
        [TextFont20Regular, 'Fonts', 'Install, manage'],
        [Briefcase20Regular, 'Device usage', 'Select all the ways you plan to use your device to get personalized tips, ads, and recommendations'],
      ].map(([I, t, s]: any) => (
        <Card key={t} icon={I} title={t} sub={s} onClick={() => {}} />
      ))}
      <DemoCard />
    </>
  )
}

function AccountsPage() {
  return (
    <>
      <div className="flex items-center gap-5 mb-5">
        <Avatar id={ME.id} size={88} />
        <div className="flex-1">
          <div className="text-[20px] font-semibold">{ME.name}</div>
          <div className="text-[14px] text-[#5D5D5D]">{ME.email}</div>
          <div className="text-[14px] text-[#5D5D5D]">Administrator · Work account</div>
        </div>
        <div className="rounded-[6px] border border-[#E5E5E5] bg-[#FBFBFB] p-4 w-[330px] flex items-center gap-3">
          <img src={logoUrl('microsoft')} className="w-8 h-8" alt="" />
          <div className="text-[13px]">
            <div className="font-semibold">Microsoft 365 Business Premium</div>
            <div className="text-[#5D5D5D]">Managed by {COMPANY.name}</div>
          </div>
        </div>
      </div>
      <Section t="Account settings" />
      {[
        [Person20Filled, 'Your info', 'Profile photo'],
        [Mail20Regular, 'Email & accounts', 'Accounts used by email, calendar, and contacts'],
        [Key20Regular, 'Sign-in options', 'Windows Hello (face, fingerprint, PIN), security key, password, dynamic lock'],
        [Briefcase20Regular, 'Access work or school', `Connected to ${COMPANY.name}’s Microsoft Entra ID`],
        [CloudArrowUp20Regular, 'Windows backup', 'Back up your files, apps, preferences to restore them across devices'],
        [People20Regular, 'Other users', 'Device access, work or school users, kiosk assigned access'],
      ].map(([I, t, s]: any) => (
        <Card key={t} icon={I} title={t} sub={s} agent={`settings-accounts-${t.toLowerCase().replace(/[^a-z]+/g, '-')}`} onClick={() => {}} />
      ))}
      <Section t="Work or school" />
      <Card icon={Briefcase20Regular} title={`${COMPANY.name} · ${ME.email}`} sub="Connected by Microsoft Entra ID · Device ID 6c1e2f0a-7d4b-4b7e-9a51-3b8f0c2d91e4 · Managed by Intune" right={<button className="h-8 px-4 rounded-[4px] bg-white border border-[#E0E0E0] text-[13px]">Info</button>} />
    </>
  )
}

function UpdatePage() {
  const [state, setState] = useState<'idle' | 'checking' | 'done'>('idle')
  const [latest, setLatest] = useState(true)
  const [checked, setChecked] = useState('Today, 8:14 AM')
  const check = () => {
    setState('checking')
    setTimeout(() => {
      setState('done')
      setChecked(`Today, ${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`)
    }, 2200)
  }
  return (
    <>
      <div className="flex items-center gap-5 mb-4">
        <div className="relative w-[72px] h-[72px] flex items-center justify-center">
          <ArrowSync20Filled className={`w-[64px] h-[64px] text-[#0067C0] ${state === 'checking' ? 'animate-spin' : ''}`} style={{ width: 64, height: 64 }} />
          {state !== 'checking' && <CheckmarkCircle20Filled className="absolute bottom-0 right-0 text-[#0F7B0F] bg-white rounded-full" style={{ width: 26, height: 26 }} />}
        </div>
        <div className="flex-1">
          <div className="text-[20px] font-semibold" data-agent="settings-update-status">{state === 'checking' ? 'Checking for updates…' : 'You’re up to date'}</div>
          <div className="text-[14px] text-[#5D5D5D]">Last checked: {checked}</div>
        </div>
        <button data-agent="settings-check-updates" disabled={state === 'checking'} onClick={check} className="h-8 px-4 rounded-[4px] bg-[#005FB8] hover:bg-[#1A6FC0] disabled:opacity-50 text-white text-[14px]">
          Check for updates
        </button>
      </div>
      <div className="flex items-center gap-2 text-[13px] text-[#C42B1C] mb-4">
        <Shield20Regular /> *Some settings are managed by your organization
        <button className="text-[#005FB8] hover:underline ml-1">View configured update policies</button>
      </div>
      <Card icon={Alert20Regular} title="Get the latest updates as soon as they’re available" sub="Be among the first to get the latest non-security updates, fixes, and improvements as they roll out." right={<Toggle on={latest} onChange={setLatest} label="Get the latest updates" />} />
      <Section t="More options" />
      <Card icon={Pause20Regular} title="Pause updates" right={<Dropdown value="Pause for 1 week" options={['Pause for 1 week', 'Pause for 2 weeks', 'Pause for 3 weeks', 'Pause for 4 weeks', 'Pause for 5 weeks']} />} />
      <Card icon={History20Regular} title="Update history" onClick={() => {}} />
      <Card icon={Settings20Regular} title="Advanced options" sub="Delivery optimization, optional updates, active hours, other update settings" onClick={() => {}} />
      <Card icon={Globe20Regular} title="Windows Insider Program" sub="Get preview builds of Windows to share feedback on new features and updates" onClick={() => {}} />
      <div className="mt-5 text-[13px] text-[#5D5D5D] flex items-center gap-2">
        <Info20Regular /> Windows 11 Enterprise, version 24H2 (OS Build 26100.6899) · Windows Update for Business is managed by Northwind IT
      </div>
    </>
  )
}

function AboutPage() {
  const rows = [
    ['Device name', 'NW-LT-0142'],
    ['Processor', 'Snapdragon(R) X Elite - X1E80100 - Qualcomm(R) Oryon(TM) CPU   3.42 GHz'],
    ['Installed RAM', '32.0 GB (31.6 GB usable)'],
    ['Device ID', '8F2E1C3A-6B7D-4E19-9C02-71A5D3E8B416'],
    ['Product ID', '00330-80000-00000-AA412'],
    ['System type', '64-bit operating system, ARM-based processor'],
    ['Pen and touch', 'Pen and touch support with 10 touch points'],
  ]
  const win = [
    ['Edition', 'Windows 11 Enterprise'],
    ['Version', '24H2'],
    ['Installed on', '3/14/2026'],
    ['OS build', '26100.6899'],
    ['Experience', 'Windows Feature Experience Pack 1000.26100.253.0'],
  ]
  const Block = ({ t, r }: { t: string; r: string[][] }) => (
    <div className="rounded-[6px] border border-[#E5E5E5] bg-[#FBFBFB] mb-3">
      <div className="px-4 h-12 flex items-center gap-3 text-[14px] font-semibold border-b border-[#EBEBEB]"><Info20Regular /> {t}</div>
      <div className="px-14 py-3 grid grid-cols-[180px_1fr] gap-y-1.5 text-[13.5px]">
        {r.map(([a, b]) => (
          <div key={a} className="contents"><span className="text-[#5D5D5D]">{a}</span><span>{b}</span></div>
        ))}
      </div>
    </div>
  )
  return (
    <>
      <Block t="Device specifications" r={rows} />
      <Block t="Windows specifications" r={win} />
    </>
  )
}

function HomePage({ go }: { go: (p: PageId) => void }) {
  return (
    <>
      <DeviceHero />
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-4">
          <div className="rounded-[8px] border border-[#E5E5E5] bg-[#FBFBFB] p-4">
            <div className="text-[14px] font-semibold mb-3">Recommended settings</div>
            {[
              [Desktop20Filled, 'Display', 'display'],
              [Speaker220Regular, 'Sound', 'system'],
              [ArrowSync20Filled, 'Windows Update', 'update'],
            ].map(([I, t, p]: any) => (
              <div key={t} onClick={() => go(p)} className="h-11 flex items-center gap-3 px-2 rounded hover:bg-black/[0.04] text-[14px]">
                <I className="text-[#0067C0]" /> <span className="flex-1">{t}</span> <ChevronRight16Regular className="text-[#5D5D5D]" />
              </div>
            ))}
          </div>
          <div className="rounded-[8px] border border-[#E5E5E5] bg-[#FBFBFB] p-4">
            <div className="text-[14px] font-semibold mb-3">Bluetooth devices</div>
            {[
              [Headphones20Regular, 'Surface Headphones 2+', 'Connected · 82%'],
              [Mouse20Regular, 'Surface Arc Mouse', 'Connected · 64%'],
              [Print20Regular, 'NW-BOS-3F-HP LaserJet', 'Ready'],
            ].map(([I, t, s]: any) => (
              <div key={t} className="h-12 flex items-center gap-3 px-2 text-[14px]">
                <I /> <div className="flex-1"><div>{t}</div><div className="text-[12px] text-[#5D5D5D]">{s}</div></div>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-[8px] border border-[#E5E5E5] bg-[#FBFBFB] p-4">
            <div className="text-[14px] font-semibold mb-3">Cloud storage</div>
            <div className="text-[13px] text-[#5D5D5D] mb-2">You are using 41% of your 1 TB OneDrive - {COMPANY.name}</div>
            <div className="h-1.5 rounded-full bg-[#E5E5E5]"><div className="h-full w-[41%] rounded-full bg-[#005FB8]" /></div>
            <button className="mt-3 h-8 px-4 rounded-[4px] bg-white border border-[#E0E0E0] text-[13px]">View details</button>
          </div>
          <div className="rounded-[8px] border border-[#E5E5E5] bg-[#FBFBFB] p-4">
            <div className="text-[14px] font-semibold mb-1">Personalize your device</div>
            <div className="text-[13px] text-[#5D5D5D] mb-3">Color mode: Light</div>
            <button onClick={() => go('personalization')} className="h-8 px-4 rounded-[4px] bg-white border border-[#E0E0E0] text-[13px]">Browse more backgrounds, colors, and themes</button>
          </div>
        </div>
      </div>
      <DemoCard />
    </>
  )
}

function ListPage({ items }: { items: [any, string, string, React.ReactNode?][] }) {
  return (
    <>
      {items.map(([I, t, s, r]) => (
        <Card key={t} icon={I} title={t} sub={s} right={r} onClick={r ? undefined : () => {}} />
      ))}
    </>
  )
}

/* ───────── shell ───────── */

export default function Settings({ win, params }: AppProps) {
  const { setTitle } = useWin()
  const [page, setPage] = useState<PageId>((params?.page as PageId) ?? 'home')
  const [q, setQ] = useState('')
  const [bt, setBt] = useState(true)
  const [wifi, setWifi] = useState(true)
  const [airplane, setAirplane] = useState(false)
  const [autoTz, setAutoTz] = useState(true)
  const [gameMode, setGameMode] = useState(true)
  const [location, setLocation] = useState(true)
  const [narrator, setNarrator] = useState(false)

  useEffect(() => {
    if (params?.page) setPage(params.page)
  }, [win.nonce])
  useEffect(() => { setTitle("Settings") }, [])

  const parent: Partial<Record<PageId, PageId>> = { display: 'system', about: 'system' }
  const go = (p: PageId) => setPage(p)
  const navActive = parent[page] ?? page

  let body: React.ReactNode
  switch (page) {
    case 'home': body = <HomePage go={go} />; break
    case 'system': body = <SystemPage go={go} />; break
    case 'display': body = <DisplayPage />; break
    case 'personalization': body = <PersonalizationPage />; break
    case 'accounts': body = <AccountsPage />; break
    case 'update': body = <UpdatePage />; break
    case 'about': body = <AboutPage />; break
    case 'bluetooth':
      body = <ListPage items={[
        [Bluetooth20Filled, 'Bluetooth', 'Discoverable as “NW-LT-0142”', <Toggle on={bt} onChange={setBt} label="Bluetooth" />],
        [Headphones20Regular, 'Surface Headphones 2+', 'Connected voice, music · 82%'],
        [Mouse20Regular, 'Surface Arc Mouse', 'Connected · 64%'],
        [Keyboard20Regular, 'Logitech MX Keys', 'Paired'],
        [Print20Regular, 'Printers & scanners', 'Preferences, troubleshoot'],
        [Phone20Regular, 'Phone Link', 'Instantly access your Android device’s photos, texts, and more'],
        [Camera20Regular, 'Cameras', 'Connected cameras, default image settings'],
        [Mouse20Regular, 'Mouse', 'Buttons, mouse pointer speed, scrolling'],
        [PlugConnected20Regular, 'USB', 'Notifications, USB battery saver'],
      ]} />
      break
    case 'network':
      body = <ListPage items={[
        [Wifi120Filled, 'Wi-Fi', 'NW-Corp (802.1X) · Connected, secured', <Toggle on={wifi} onChange={setWifi} label="Wi-Fi" />],
        [Router20Regular, 'Ethernet', 'Not connected'],
        [Shield20Regular, 'VPN', 'Northwind GlobalProtect · Connected'],
        [Phone20Regular, 'Mobile hotspot', 'Share your internet connection'],
        [Globe20Regular, 'Airplane mode', 'Stop all wireless communication', <Toggle on={airplane} onChange={setAirplane} label="Airplane mode" />],
        [Globe20Regular, 'Proxy', 'Proxy server for Wi-Fi and Ethernet connections'],
        [Settings20Regular, 'Advanced network settings', 'View all network adapters, network reset'],
      ]} />
      break
    case 'apps':
      body = <ListPage items={[
        [Apps20Filled, 'Installed apps', 'Uninstall and manage apps on your PC'],
        [Apps20Filled, 'Advanced app settings', 'Choose where to get apps, app execution aliases'],
        [Window20Regular, 'Default apps', 'Defaults for file and link types, other defaults'],
        [Desktop20Filled, 'Offline maps', 'Downloads, storage location, map updates'],
        [Globe20Regular, 'Apps for websites', 'Websites that can open in an app instead of a browser'],
        [Video20Regular, 'Video playback', 'Video adjustments, HDR streaming, battery options'],
        [Grid20Regular, 'Startup', 'Apps that start automatically when you sign in'],
      ]} />
      break
    case 'time':
      body = <ListPage items={[
        [Clock20Filled, 'Date & time', `Time zones, automatic clock settings, calendar display · ${new Date().toLocaleString('en-US', { weekday: 'long', hour: 'numeric', minute: '2-digit' })}`],
        [Globe20Regular, 'Set time zone automatically', '(UTC-05:00) Eastern Time (US & Canada)', <Toggle on={autoTz} onChange={setAutoTz} label="Set time zone automatically" />],
        [Translate20Regular, 'Language & region', 'Windows and some apps format dates and time based on your region · English (United States)'],
        [Keyboard20Regular, 'Typing', 'Spell check, autocorrect, text suggestions'],
        [Mic20Regular, 'Speech', 'Speech language, microphone setup, voices'],
      ]} />
      break
    case 'gaming':
      body = <ListPage items={[
        [Games20Filled, 'Game Bar', 'Controller and keyboard shortcuts'],
        [Video20Regular, 'Captures', 'Save location, recording preferences'],
        [Games20Filled, 'Game Mode', 'Optimize your PC for play', <Toggle on={gameMode} onChange={setGameMode} label="Game Mode" />],
      ]} />
      break
    case 'accessibility':
      body = <ListPage items={[
        [TextFont20Regular, 'Text size', 'Text size throughout Windows and apps'],
        [Eye20Regular, 'Visual effects', 'Scroll bars, transparency, animations, notification timeout'],
        [Mouse20Regular, 'Mouse pointer and touch', 'Mouse pointer color, size'],
        [ZoomIn20Regular, 'Magnifier', 'Magnifier zoom, reading'],
        [Color20Regular, 'Color filters', 'Colorblindness filters, grayscale, inverted'],
        [Speaker220Regular, 'Narrator', 'Voice, verbosity, keyboard, braille', <Toggle on={narrator} onChange={setNarrator} label="Narrator" />],
        [Headphones20Regular, 'Audio', 'Mono audio, audio notifications'],
        [Mic20Regular, 'Captions', 'Styles, live captions'],
      ]} />
      break
    case 'privacy':
      body = <ListPage items={[
        [Shield20Regular, 'Windows Security', 'Antivirus, browser, firewall, and network protection for your device · Managed by Northwind IT'],
        [Location20Regular, 'Location', 'Location services, location history', <Toggle on={location} onChange={setLocation} label="Location services" />],
        [Phone20Regular, 'Find my device', 'Track your device if you think you’ve lost it'],
        [Key20Regular, 'Device encryption', 'BitLocker device encryption is on'],
        [Settings20Regular, 'For developers', 'These settings are intended for development use only'],
        [Camera20Regular, 'Camera', 'Apps that can use your camera'],
        [Mic20Regular, 'Microphone', 'Apps that can use your microphone'],
        [Alert20Regular, 'Notifications', 'Apps that can access your notifications'],
      ]} />
      break
  }

  const crumb = parent[page] ? (
    <>
      <button onClick={() => go(parent[page]!)} className="text-[#5D5D5D] hover:text-[#1A1A1A]">{TITLES[parent[page]!]}</button>
      <ChevronRight16Regular className="mx-2 text-[#5D5D5D]" style={{ width: 20, height: 20 }} />
      <span>{TITLES[page]}</span>
    </>
  ) : (
    TITLES[page]
  )

  const results = q ? NAV.filter(([, l]) => l.toLowerCase().includes(q.toLowerCase())) : []

  return (
    <div className="flex-1 min-h-0 flex bg-[#F3F3F3] text-[#1A1A1A]" style={{ fontFamily: 'var(--font-win)' }}>
      <div className="w-[300px] shrink-0 flex flex-col px-3 pt-2 overflow-y-auto">
        <div className="flex items-center gap-3 px-2 py-3">
          <Avatar id={ME.id} size={64} />
          <div className="min-w-0">
            <div className="text-[14px] font-semibold">{ME.name}</div>
            <div className="text-[12px] text-[#5D5D5D] truncate">{ME.email}</div>
          </div>
        </div>
        <div className="relative mx-1 my-2">
          <input
            data-agent="settings-search"
            aria-label="Find a setting"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Find a setting"
            className="w-full h-8 pl-3 pr-8 rounded-[4px] bg-white border border-[#E5E5E5] border-b-[#868686] outline-none focus:border-b-[#005FB8] focus:border-b-2"
            style={{ fontSize: 14 }}
          />
          <Search16Regular className="absolute right-2.5 top-2 text-[#5D5D5D]" />
          {results.length > 0 && (
            <div className="absolute z-20 left-0 right-0 top-9 bg-[#F9F9F9] border border-black/10 rounded-lg shadow-lg py-1">
              {results.map(([id, l, I, c]) => (
                <button key={id} onClick={() => { go(id); setQ('') }} className="w-full h-9 px-3 flex items-center gap-3 text-[14px] hover:bg-black/[0.05]">
                  <I style={{ color: c }} /> {l}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="mt-1">
          {NAV.map(([id, l, I, c]) => {
            const on = navActive === id
            return (
              <button
                key={id}
                data-agent={`settings-nav-${id}`}
                aria-label={l}
                onClick={() => go(id)}
                className={`relative w-full h-9 flex items-center gap-4 px-3 rounded-[4px] text-[14px] text-left ${on ? 'bg-black/[0.055]' : 'hover:bg-black/[0.035]'}`}
              >
                {on && <span className="absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-full bg-[#005FB8]" />}
                <I style={{ color: c }} />
                {l}
              </button>
            )
          })}
        </div>
      </div>
      <div className="flex-1 min-w-0 overflow-y-auto pr-8 pl-4 pt-3 pb-10" data-agent="settings-content">
        <div className="max-w-[1000px]">
          <h1 className="text-[28px] font-semibold flex items-center mb-6 mt-2" data-agent="settings-page-title">{crumb}</h1>
          {body}
        </div>
      </div>
    </div>
  )
}
