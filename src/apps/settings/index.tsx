import { useEffect, useMemo, useState } from 'react'
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
  MoreHorizontal20Regular,
  Folder20Regular,
  Document20Regular,
  Delete20Regular,
  Laptop20Regular,
} from '@fluentui/react-icons'
import type { AppProps } from '@/os/registry'
import { APPS, logoUrl } from '@/os/registry'
import { useDesk, useWin } from '@/os/context'
import { Avatar } from '@/components/Avatar'
import { ME, COMPANY } from '@/data/people'
import { requestReset, requestLock } from '@/os/system'
import { BloomWallpaper } from '@/os/Wallpaper'
import { db, useCollection, useRecord } from '@/db/db'

/** settings.prefs: { id: 'prefs', [key]: value } — every toggle, dropdown and slider in Settings persists here */

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

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

/* ───────── persisted prefs ───────── */

function usePrefs() {
  const r = useRecord('settings.prefs', 'prefs')
  return {
    get: <T,>(k: string, d: T): T => (r && r[k] !== undefined ? (r[k] as T) : d),
    set: (k: string, v: any) => db.upsert('settings.prefs', { id: 'prefs', [k]: v }),
    setMany: (p: Record<string, any>) => db.upsert('settings.prefs', { id: 'prefs', ...p }),
  }
}
function usePref<T>(k: string, d: T): [T, (v: T) => void] {
  const p = usePrefs()
  return [p.get(k, d), (v: T) => p.set(k, v)]
}

const ACCENTS: [string, string, string][] = [
  ['Blue', '#005FB8', '#60CDFF'],
  ['Purple', '#744DA9', '#C5A5F0'],
  ['Red', '#C42B1C', '#FF99A4'],
  ['Orange', '#CA5010', '#FFB27A'],
  ['Green', '#107C10', '#6CCB5F'],
  ['Teal', '#038387', '#4FD1D5'],
  ['Pink', '#BF0077', '#F48FC8'],
  ['Slate', '#515C6B', '#B4BCC8'],
]
const PALETTE = {
  light: { '--s-bg': '#F3F3F3', '--s-card': '#FBFBFB', '--s-cardh': '#F6F6F6', '--s-bd': '#E5E5E5', '--s-tx': '#1A1A1A', '--s-sub': '#5D5D5D', '--s-hov': 'rgba(0,0,0,0.035)', '--s-act': 'rgba(0,0,0,0.055)', '--s-in': '#FFFFFF', '--s-inbd': '#E0E0E0', '--s-menu': '#F9F9F9', '--s-off': '#616161', '--s-acctx': '#FFFFFF' },
  dark: { '--s-bg': '#202020', '--s-card': '#2B2B2B', '--s-cardh': '#323232', '--s-bd': '#1D1D1D', '--s-tx': '#FFFFFF', '--s-sub': '#C5C5C5', '--s-hov': 'rgba(255,255,255,0.05)', '--s-act': 'rgba(255,255,255,0.08)', '--s-in': '#2D2D2D', '--s-inbd': '#3A3A3A', '--s-menu': '#2C2C2C', '--s-off': '#CFCFCF', '--s-acctx': '#000000' },
}

/* ───────── primitives ───────── */

function Toggle({ on, onChange, agent, label }: { on: boolean; onChange: (v: boolean) => void; agent?: string; label?: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[14px] text-[var(--s-tx)] w-6 text-right">{on ? 'On' : 'Off'}</span>
      <button
        role="switch"
        aria-checked={on}
        aria-label={label}
        data-agent={agent}
        onClick={(e) => {
          e.stopPropagation()
          onChange(!on)
        }}
        className={`relative w-10 h-5 rounded-full border transition-colors ${on ? 'bg-[var(--s-acc)] border-[var(--s-acc)]' : 'bg-transparent border-[var(--s-off)]'}`}
      >
        <span className={`absolute top-1/2 -translate-y-1/2 rounded-full transition-all ${on ? 'left-[22px] w-3 h-3 bg-[var(--s-acctx)]' : 'left-[3px] w-3 h-3 bg-[var(--s-off)]'}`} />
      </button>
    </div>
  )
}

function Card({ icon: I, title, sub, right, onClick, agent, children }: { icon?: any; title: string; sub?: string; right?: React.ReactNode; onClick?: () => void; agent?: string; children?: React.ReactNode; first?: boolean; last?: boolean }) {
  return (
    <div
      data-agent={agent}
      role={onClick ? 'button' : undefined}
      aria-label={title}
      onClick={onClick}
      className={`flex items-center gap-4 min-h-[68px] px-4 py-3 bg-[var(--s-card)] border border-[var(--s-bd)] ${onClick ? 'hover:bg-[var(--s-cardh)] cursor-default' : ''} rounded-[6px] mb-[3px]`}
    >
      {I && <I className="text-[var(--s-tx)] shrink-0" />}
      <div className="flex-1 min-w-0">
        <div className="text-[14px] text-[var(--s-tx)]">{title}</div>
        {sub && <div className="text-[12px] text-[var(--s-sub)] leading-snug">{sub}</div>}
        {children}
      </div>
      {right}
      {onClick && !right && <ChevronRight16Regular className="text-[var(--s-sub)]" />}
    </div>
  )
}
const Section = ({ t }: { t: string }) => <div className="text-[14px] font-semibold text-[var(--s-tx)] mt-6 mb-2">{t}</div>

function Dropdown({ value, options, agent, onChange }: { value: string; options: string[]; agent?: string; onChange?: (v: string) => void }) {
  return (
    <select
      data-agent={agent}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      className="h-8 min-w-[180px] px-3 rounded-[4px] bg-[var(--s-in)] text-[var(--s-tx)] border border-[var(--s-inbd)] border-b-[#C4C4C4] text-[14px] outline-none"
      style={{ fontSize: 14 }}
    >
      {options.map((o) => (
        <option key={o}>{o}</option>
      ))}
    </select>
  )
}

function Slider({ value, onChange, label = 'Brightness', min = 0, max = 100 }: { value: number; onChange: (n: number) => void; label?: string; min?: number; max?: number }) {
  return (
    <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-[200px] accent-[var(--s-acc)]" aria-label={label} />
      <span className="w-9 text-[13px] text-[var(--s-sub)] text-right">{value}</span>
    </div>
  )
}

const Btn = ({ children, onClick, disabled, agent, primary }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; agent?: string; primary?: boolean }) => (
  <button
    data-agent={agent}
    disabled={disabled}
    onClick={(e) => {
      e.stopPropagation()
      onClick?.()
    }}
    className={`h-8 px-4 rounded-[4px] text-[13px] whitespace-nowrap disabled:opacity-50 ${primary ? 'bg-[var(--s-acc)] text-[var(--s-acctx)] hover:opacity-90' : 'bg-[var(--s-in)] text-[var(--s-tx)] border border-[var(--s-inbd)] hover:bg-[var(--s-cardh)]'}`}
  >
    {children}
  </button>
)

/* ───────── declarative sub pages ───────── */

type It =
  | { t: 'section'; label: string }
  | { t: 'toggle'; k: string; title: string; sub?: string; def: boolean; icon?: any }
  | { t: 'select'; k: string; title: string; sub?: string; options: string[]; def: string; icon?: any }
  | { t: 'slider'; k: string; title: string; sub?: string; def: number; icon?: any }
  | { t: 'info'; title: string; sub?: string; value?: string; icon?: any }
  | { t: 'link'; title: string; sub?: string; to: string; icon?: any }
  | { t: 'open'; title: string; sub?: string; app: string; params?: any; icon?: any }
  | { t: 'action'; title: string; sub?: string; label: string; done: string; icon?: any; ms?: number; managed?: boolean }
  | { t: 'custom'; render: () => React.ReactNode }

const appToggles = (prefix: string, ids: string[], def = true): It[] =>
  ids.map((id) => {
    const a = APPS.find((x) => x.id === id)
    return { t: 'toggle', k: `${prefix}-${id}`, title: a?.name ?? id, def, icon: a ? () => <img src={a.icon} className="w-5 h-5" alt="" /> : Apps20Filled }
  })

const SUB: Record<string, { parent: string; title: string; items: () => It[] }> = {
  /* system */
  'system-sound': { parent: 'system', title: 'Sound', items: () => [
    { t: 'section', label: 'Output' },
    { t: 'select', k: 'sound-out', title: 'Choose where to play sound', options: ['Speakers (Realtek(R) Audio)', 'Surface Headphones 2+', 'NW-BOS-3F Surface Hub'], def: 'Speakers (Realtek(R) Audio)', icon: Speaker220Regular },
    { t: 'slider', k: 'sound-vol', title: 'Volume', def: 48, icon: Speaker220Regular },
    { t: 'toggle', k: 'sound-mono', title: 'Mono audio', sub: 'Combine left and right audio channels into one', def: false, icon: Headphones20Regular },
    { t: 'section', label: 'Input' },
    { t: 'select', k: 'sound-in', title: 'Choose a device for speaking or recording', options: ['Microphone Array (Realtek(R) Audio)', 'Surface Headphones 2+ Hands-Free'], def: 'Microphone Array (Realtek(R) Audio)', icon: Mic20Regular },
    { t: 'slider', k: 'sound-in-vol', title: 'Input volume', def: 72, icon: Mic20Regular },
    { t: 'action', title: 'Test your microphone', sub: 'Speak into your microphone after you start the test', label: 'Start test', done: 'Average result: 86% of total volume', icon: Mic20Regular, ms: 2400 },
  ] },
  'system-notifications': { parent: 'system', title: 'Notifications', items: () => [
    { t: 'toggle', k: 'notif-on', title: 'Notifications', sub: 'Get notifications from apps and other senders', def: true, icon: Alert20Regular },
    { t: 'toggle', k: 'notif-dnd', title: 'Do not disturb', sub: 'Notifications will be sent directly to notification center', def: false, icon: WeatherMoon20Regular },
    { t: 'select', k: 'notif-dnd-auto', title: 'Turn on do not disturb automatically', options: ['Never', 'During these times', 'When duplicating your display', 'When playing a game'], def: 'When duplicating your display', icon: Timer20Regular },
    { t: 'section', label: 'Notifications from apps and other senders' },
    ...appToggles('notif-app', ['outlook', 'teams', 'slack', 'hworker', 'servicenow', 'workday', 'zoom']),
  ] },
  'system-focus': { parent: 'system', title: 'Focus', items: () => [{ t: 'custom', render: () => <FocusSession /> }] },
  'system-power-battery': { parent: 'system', title: 'Power & battery', items: () => [
    { t: 'info', title: 'Battery level', sub: 'Estimated time remaining: 6 hours 14 minutes', value: '82%', icon: Battery820Regular },
    { t: 'section', label: 'Power' },
    { t: 'select', k: 'power-mode', title: 'Power mode', sub: 'Optimize your device based on power use and performance', options: ['Best power efficiency', 'Balanced', 'Best performance'], def: 'Balanced', icon: Battery820Regular },
    { t: 'select', k: 'power-screen', title: 'On battery power, turn off my screen after', options: ['1 minute', '3 minutes', '5 minutes', '10 minutes', '15 minutes', 'Never'], def: '3 minutes', icon: Desktop20Filled },
    { t: 'select', k: 'power-sleep', title: 'On battery power, put my device to sleep after', options: ['5 minutes', '10 minutes', '15 minutes', '30 minutes', '1 hour', 'Never'], def: '10 minutes', icon: Timer20Regular },
    { t: 'toggle', k: 'power-saver', title: 'Energy saver', sub: 'Extend battery life by limiting some notifications and background activity', def: false, icon: Lightbulb20Regular },
  ] },
  'system-storage': { parent: 'system', title: 'Storage', items: () => [{ t: 'custom', render: () => <StoragePage /> }] },
  'system-nearby-sharing': { parent: 'system', title: 'Nearby sharing', items: () => [
    { t: 'select', k: 'nearby', title: 'Nearby sharing', sub: 'Share files and links with nearby devices using Bluetooth and Wi-Fi', options: ['Off', 'My devices only', 'Everyone nearby'], def: 'Off', icon: Phone20Regular },
    { t: 'open', title: 'Save files I receive to', sub: 'C:\\Users\\alex.morgan\\Downloads', app: 'explorer', params: { path: 'Downloads' }, icon: Folder20Regular },
    { t: 'link', title: 'Make your device easier to find', sub: 'Rename your device', to: 'about', icon: Laptop20Regular },
  ] },
  'system-multitasking': { parent: 'system', title: 'Multitasking', items: () => [
    { t: 'toggle', k: 'mt-snap', title: 'Snap windows', sub: 'Arrange windows side by side', def: true, icon: Window20Regular },
    { t: 'toggle', k: 'mt-shake', title: 'Title bar window shake', sub: 'Minimize all other windows when I shake a title bar', def: false, icon: Window20Regular },
    { t: 'select', k: 'mt-desktops', title: 'Desktops', sub: 'On the taskbar, show all the open windows', options: ['Only on the desktop I’m using', 'On all desktops'], def: 'Only on the desktop I’m using', icon: Grid20Regular },
    { t: 'select', k: 'mt-alttab', title: 'Show tabs from apps when snapping or pressing Alt+Tab', options: ['20 most recent tabs', '5 most recent tabs', '3 most recent tabs', 'Don’t show tabs'], def: '3 most recent tabs', icon: Window20Regular },
  ] },
  'system-activation': { parent: 'system', title: 'Activation', items: () => [
    { t: 'info', title: 'Windows 11 Enterprise', sub: `Windows is activated with a digital license linked to ${COMPANY.name}`, value: 'Active', icon: CheckmarkCircle20Filled },
    { t: 'info', title: 'Subscription', sub: 'Microsoft 365 E5 · Renews automatically', icon: Briefcase20Regular },
    { t: 'action', title: 'Change product key', sub: 'Activation is managed by your organization', label: 'Change', done: '', icon: Key20Regular, managed: true },
  ] },
  'system-troubleshoot': { parent: 'system', title: 'Troubleshoot', items: () => [
    { t: 'select', k: 'ts-pref', title: 'Recommended troubleshooter preferences', options: ['Run automatically, then notify me', 'Ask me before running', 'Don’t run any'], def: 'Ask me before running', icon: WindowDevTools20Regular },
    { t: 'section', label: 'Other troubleshooters' },
    ...['Audio', 'Network and Internet', 'Printer', 'Windows Update', 'Camera', 'Bluetooth'].map((n) => ({ t: 'action', title: n, label: 'Run', done: 'No changes or updates were necessary', ms: 2200, icon: WindowDevTools20Regular }) as It),
  ] },
  'system-recovery': { parent: 'system', title: 'Recovery', items: () => [
    { t: 'action', title: 'Fix problems without resetting your PC', sub: 'Resetting can take a while — first, try resolving issues by running a troubleshooter', label: 'Troubleshoot', done: 'No issues found', ms: 1800, icon: WindowDevTools20Regular },
    { t: 'section', label: 'Recovery options' },
    { t: 'action', title: 'Reset this PC', sub: 'Choose to keep or remove your personal files, then reinstall Windows', label: 'Reset PC', done: '', icon: ArrowCounterclockwise20Regular, managed: true },
    { t: 'action', title: 'Advanced startup', sub: 'Restart your device to change startup settings, including starting from a disc or USB drive', label: 'Restart now', done: '', icon: ArrowSync20Filled, managed: true },
  ] },
  'system-clipboard': { parent: 'system', title: 'Clipboard', items: () => [
    { t: 'toggle', k: 'clip-history', title: 'Clipboard history', sub: 'Save multiple items to the clipboard to use later. Press Windows logo key + V to view your history', def: true, icon: Clipboard20Regular },
    { t: 'toggle', k: 'clip-sync', title: 'Clipboard history across your devices', sub: 'Paste text on your other devices when you sign in with your Microsoft account', def: false, icon: CloudArrowUp20Regular },
    { t: 'toggle', k: 'clip-suggest', title: 'Suggested actions', sub: 'Get suggestions for actions you can take with text you copy', def: true, icon: Lightbulb20Regular },
    { t: 'action', title: 'Clear clipboard data', sub: 'Clear everything (except pinned items) on this device and with Microsoft', label: 'Clear', done: 'Cleared', ms: 400, icon: Delete20Regular },
  ] },
  'display-multiple-displays': { parent: 'display', title: 'Multiple displays', items: () => [
    { t: 'select', k: 'disp-multi', title: 'Choose how to show your displays', options: ['Show only on 1', 'Duplicate these displays', 'Extend these displays'], def: 'Show only on 1', icon: Desktop20Filled },
    { t: 'toggle', k: 'disp-remember', title: 'Remember window locations based on monitor connection', def: true, icon: Window20Regular },
    { t: 'toggle', k: 'disp-minimize', title: 'Minimize windows when a monitor is disconnected', def: true, icon: Window20Regular },
    { t: 'action', title: 'Detect other display', label: 'Detect', done: 'We didn’t find another display', ms: 1600, icon: Desktop20Filled },
    { t: 'action', title: 'Connect to a wireless display', label: 'Connect', done: 'Searching found NW-BOS-3F Surface Hub — connect from Quick Settings', ms: 2000, icon: Wifi120Filled },
  ] },
  'display-advanced-display': { parent: 'display', title: 'Advanced display', items: () => [
    { t: 'info', title: 'Display 1: Built-in display', sub: 'Connected to Qualcomm(R) Adreno(TM) X1-85 GPU', icon: Desktop20Filled },
    { t: 'info', title: 'Desktop mode', value: '2496 × 1664', icon: Desktop20Filled },
    { t: 'info', title: 'Active signal mode', value: '2496 × 1664', icon: Desktop20Filled },
    { t: 'info', title: 'Bit depth', value: '8-bit', icon: Color20Regular },
    { t: 'info', title: 'Color format', value: 'RGB', icon: Color20Regular },
    { t: 'select', k: 'disp-refresh', title: 'Choose a refresh rate', sub: 'A higher rate gives smoother motion, but also uses more power', options: ['60 Hz', 'Dynamic (60 Hz or 120 Hz)', '120 Hz'], def: 'Dynamic (60 Hz or 120 Hz)', icon: ArrowSync20Filled },
  ] },
  'display-graphics': { parent: 'display', title: 'Graphics', items: () => [
    { t: 'toggle', k: 'gfx-autohdr', title: 'Auto HDR', sub: 'Get a richer gaming experience with HDR on supported games', def: false, icon: Color20Regular },
    { t: 'toggle', k: 'gfx-vrr', title: 'Variable refresh rate', sub: 'Reduce screen tearing in games', def: true, icon: Desktop20Filled },
    { t: 'section', label: 'Custom options for apps' },
    ...['teams', 'zoom', 'edge', 'powerbi'].map((id) => ({ t: 'select', k: `gfx-${id}`, title: APPS.find((a) => a.id === id)?.name ?? id, options: ['Let Windows decide (Power saving)', 'Power saving', 'High performance'], def: 'Let Windows decide (Power saving)', icon: () => <img src={logoUrl(id)} className="w-5 h-5" alt="" /> }) as It),
  ] },
  /* bluetooth */
  'bluetooth-printers-scanners': { parent: 'bluetooth', title: 'Printers & scanners', items: () => [
    { t: 'info', title: 'NW-BOS-3F-HP LaserJet', sub: 'Default · Ready · 12 jobs printed this week', icon: Print20Regular },
    { t: 'info', title: 'Microsoft Print to PDF', sub: 'Ready', icon: Print20Regular },
    { t: 'info', title: 'OneNote (Desktop)', sub: 'Ready', icon: Print20Regular },
    { t: 'section', label: 'Printer preferences' },
    { t: 'toggle', k: 'print-default', title: 'Let Windows manage my default printer', sub: 'When this is on, Windows sets your default printer to the one you used most recently at your current location', def: false, icon: Print20Regular },
    { t: 'toggle', k: 'print-metered', title: 'Download drivers and device software over metered connections', def: false, icon: Router20Regular },
  ] },
  'bluetooth-phone-link': { parent: 'bluetooth', title: 'Phone Link', items: () => [
    { t: 'toggle', k: 'phonelink', title: 'Phone Link', sub: 'Instantly access your mobile device’s photos, texts, and more', def: false, icon: Phone20Regular },
    { t: 'info', title: 'Linked devices', sub: 'No devices linked. Phone Link is restricted on managed devices.', icon: Phone20Regular },
  ] },
  'bluetooth-cameras': { parent: 'bluetooth', title: 'Cameras', items: () => [
    { t: 'info', title: 'Surface Camera Front', sub: 'Connected · Windows Hello face', icon: Camera20Regular },
    { t: 'toggle', k: 'cam-effects', title: 'Windows Studio Effects', sub: 'Background blur, eye contact and automatic framing', def: true, icon: Camera20Regular },
  ] },
  'bluetooth-mouse': { parent: 'bluetooth', title: 'Mouse', items: () => [
    { t: 'select', k: 'mouse-primary', title: 'Primary mouse button', options: ['Left', 'Right'], def: 'Left', icon: Mouse20Regular },
    { t: 'slider', k: 'mouse-speed', title: 'Mouse pointer speed', def: 50, icon: Mouse20Regular },
    { t: 'select', k: 'mouse-scroll', title: 'Roll the mouse wheel to scroll', options: ['Multiple lines at a time', 'One screen at a time'], def: 'Multiple lines at a time', icon: Mouse20Regular },
    { t: 'toggle', k: 'mouse-inactive', title: 'Scroll inactive windows when hovering over them', def: true, icon: Window20Regular },
  ] },
  'bluetooth-usb': { parent: 'bluetooth', title: 'USB', items: () => [
    { t: 'toggle', k: 'usb-notify', title: 'Connection notifications', sub: 'Show a notification if there are issues connecting to a USB device', def: true, icon: PlugConnected20Regular },
    { t: 'toggle', k: 'usb-saver', title: 'USB battery saver', sub: 'Stop USB devices from draining battery when the screen is off', def: true, icon: Battery820Regular },
  ] },
  /* network */
  'network-ethernet': { parent: 'network', title: 'Ethernet', items: () => [{ t: 'info', title: 'Ethernet', sub: 'Network cable unplugged', value: 'Not connected', icon: Router20Regular }] },
  'network-vpn': { parent: 'network', title: 'VPN', items: () => [{ t: 'custom', render: () => <VpnPage /> }] },
  'network-mobile-hotspot': { parent: 'network', title: 'Mobile hotspot', items: () => [
    { t: 'toggle', k: 'hotspot', title: 'Mobile hotspot', sub: 'Share my internet connection from NW-Corp', def: false, icon: Phone20Regular },
    { t: 'info', title: 'Properties', sub: 'Name: NW-LT-0142 9811 · Band: Any available', icon: Info20Regular },
  ] },
  'network-proxy': { parent: 'network', title: 'Proxy', items: () => [
    { t: 'toggle', k: 'proxy-auto', title: 'Automatically detect settings', def: true, icon: Globe20Regular },
    { t: 'info', title: 'Use setup script', sub: 'http://wpad.northwind.local/proxy.pac · Managed by your organization', value: 'On', icon: Globe20Regular },
    { t: 'info', title: 'Use a proxy server', value: 'Off', icon: Globe20Regular },
  ] },
  'network-advanced-network-settings': { parent: 'network', title: 'Advanced network settings', items: () => [
    { t: 'info', title: 'Wi-Fi', sub: 'NW-Corp · Qualcomm FastConnect 7800 Wi-Fi 7', value: 'Enabled', icon: Wifi120Filled },
    { t: 'info', title: 'Ethernet', sub: 'Surface Ethernet Adapter', value: 'Disconnected', icon: Router20Regular },
    { t: 'info', title: 'Data usage', sub: 'Wi-Fi: 38.2 GB in the last 30 days', icon: Storage20Regular },
    { t: 'action', title: 'Network reset', sub: 'Reset all network adapters to factory settings', label: 'Reset now', done: '', icon: ArrowCounterclockwise20Regular, managed: true },
  ] },
  /* personalization */
  'personalization-background': { parent: 'personalization', title: 'Background', items: () => [
    { t: 'select', k: 'bg-kind', title: 'Personalize your background', options: ['Picture', 'Solid color', 'Slideshow', 'Windows spotlight'], def: 'Solid color', icon: Image20Regular },
    { t: 'select', k: 'bg-fit', title: 'Choose a fit for your desktop image', options: ['Fill', 'Fit', 'Stretch', 'Tile', 'Center', 'Span'], def: 'Fill', icon: Image20Regular },
    { t: 'info', title: 'Background', sub: 'Your desktop background is managed by your organization', icon: Shield20Regular },
  ] },
  'personalization-colors': { parent: 'personalization', title: 'Colors', items: () => [{ t: 'custom', render: () => <ColorsPage /> }] },
  'personalization-themes': { parent: 'personalization', title: 'Themes', items: () => [{ t: 'custom', render: () => <ThemePicker /> }] },
  'personalization-dynamic-lighting': { parent: 'personalization', title: 'Dynamic Lighting', items: () => [
    { t: 'toggle', k: 'dl-on', title: 'Use Dynamic Lighting on my devices', def: true, icon: Lightbulb20Regular },
    { t: 'slider', k: 'dl-bright', title: 'Brightness', def: 80, icon: BrightnessHigh20Regular },
    { t: 'select', k: 'dl-effect', title: 'Effects', options: ['Solid color', 'Breathing', 'Rainbow', 'Wave', 'Wheel', 'Gradient'], def: 'Solid color', icon: Color20Regular },
  ] },
  'personalization-lock-screen': { parent: 'personalization', title: 'Lock screen', items: () => [
    { t: 'select', k: 'lock-kind', title: 'Personalize your lock screen', options: ['Windows spotlight', 'Picture', 'Slideshow'], def: 'Picture', icon: LockClosed20Regular },
    { t: 'select', k: 'lock-status', title: 'Lock screen status', options: ['None', 'Calendar', 'Mail', 'Weather and more'], def: 'Calendar', icon: Alert20Regular },
    { t: 'toggle', k: 'lock-bg-signin', title: 'Show the lock screen background picture on the sign-in screen', def: true, icon: Image20Regular },
    { t: 'custom', render: () => <LockNow /> },
  ] },
  'personalization-text-input': { parent: 'personalization', title: 'Text input', items: () => [
    { t: 'toggle', k: 'ti-emoji', title: 'Emoji and more', sub: 'Press Windows logo key + period (.)', def: true, icon: Keyboard20Regular },
    { t: 'toggle', k: 'ti-voice', title: 'Voice typing launcher', def: false, icon: Mic20Regular },
    { t: 'select', k: 'ti-keyboard', title: 'Touch keyboard theme', options: ['Default', 'Light', 'Dark', 'Coral reef', 'Ocean'], def: 'Default', icon: Keyboard20Regular },
  ] },
  'personalization-start': { parent: 'personalization', title: 'Start', items: () => [
    { t: 'select', k: 'start-layout', title: 'Layout', options: ['Default', 'More pins', 'More recommendations'], def: 'Default', icon: Grid20Regular },
    { t: 'toggle', k: 'start-recent-apps', title: 'Show recently added apps', def: true, icon: Apps20Filled },
    { t: 'toggle', k: 'start-recommended', title: 'Show recommended files in Start, recent files in File Explorer, and items in Jump Lists', def: true, icon: Document20Regular },
    { t: 'toggle', k: 'start-account', title: 'Show account-related notifications', def: true, icon: Person20Filled },
  ] },
  'personalization-taskbar': { parent: 'personalization', title: 'Taskbar', items: () => [
    { t: 'section', label: 'Taskbar items' },
    { t: 'select', k: 'tb-search', title: 'Search', options: ['Hide', 'Search icon only', 'Search icon and label', 'Search box'], def: 'Search box', icon: Search16Regular },
    { t: 'toggle', k: 'tb-taskview', title: 'Task view', def: true, icon: Window20Regular },
    { t: 'toggle', k: 'tb-widgets', title: 'Widgets', def: false, icon: Grid20Regular },
    { t: 'section', label: 'Taskbar behaviors' },
    { t: 'select', k: 'tb-align', title: 'Taskbar alignment', options: ['Center', 'Left'], def: 'Center', icon: Window20Regular },
    { t: 'toggle', k: 'tb-autohide', title: 'Automatically hide the taskbar', def: false, icon: Window20Regular },
    { t: 'toggle', k: 'tb-badges', title: 'Show badges on taskbar apps', def: true, icon: Alert20Regular },
  ] },
  'personalization-fonts': { parent: 'personalization', title: 'Fonts', items: () => [
    ...['Segoe UI Variable', 'Cascadia Code', 'Consolas', 'Calibri', 'Aptos', 'Arial', 'Georgia', 'Times New Roman', 'Courier New'].map((f) => ({ t: 'info', title: f, sub: `${f === 'Segoe UI Variable' ? '7' : '4'} font faces`, icon: TextFont20Regular }) as It),
  ] },
  'personalization-device-usage': { parent: 'personalization', title: 'Device usage', items: () => [
    ...[['Gaming', false], ['Family', false], ['Creativity', false], ['School', false], ['Entertainment', false], ['Business', true], ['Development', false]].map(([n, d]) => ({ t: 'toggle', k: `usage-${slug(n as string)}`, title: n as string, def: d as boolean, icon: Briefcase20Regular }) as It),
  ] },
  /* apps */
  'apps-installed-apps': { parent: 'apps', title: 'Installed apps', items: () => [{ t: 'custom', render: () => <InstalledApps /> }] },
  'apps-advanced-app-settings': { parent: 'apps', title: 'Advanced app settings', items: () => [
    { t: 'select', k: 'apps-source', title: 'Choose where to get apps', options: ['Anywhere', 'Anywhere, but let me know if there’s a comparable app in the Microsoft Store', 'The Microsoft Store only'], def: 'Anywhere', icon: Apps20Filled },
    { t: 'toggle', k: 'apps-share', title: 'Share across devices', sub: 'Continue app experiences on other devices', def: false, icon: Phone20Regular },
    { t: 'toggle', k: 'apps-archive', title: 'Archive apps', sub: 'Save storage space and internet bandwidth by archiving apps you don’t use often', def: true, icon: Storage20Regular },
  ] },
  'apps-default-apps': { parent: 'apps', title: 'Default apps', items: () => [
    ...([['.pdf', 'Adobe Acrobat', ['Adobe Acrobat', 'Microsoft Edge']], ['.txt', 'Notepad', ['Notepad', 'Microsoft Word']], ['.docx', 'Word', ['Word', 'Notepad']], ['.xlsx', 'Excel', ['Excel']], ['.pptx', 'PowerPoint', ['PowerPoint']], ['.csv', 'Excel', ['Excel', 'Notepad']], ['HTTPS', 'Microsoft Edge', ['Microsoft Edge']], ['MAILTO', 'Outlook', ['Outlook']]] as [string, string, string[]][]).map(
      ([ext, d, opts]) => ({ t: 'select', k: `default-${slug(ext)}`, title: ext, options: opts, def: d, icon: Document20Regular }) as It,
    ),
  ] },
  'apps-offline-maps': { parent: 'apps', title: 'Offline maps', items: () => [
    { t: 'action', title: 'Download maps', sub: 'Search for places and get directions even when you’re not connected to the internet', label: 'Download', done: 'United States – Massachusetts (412 MB) downloaded', ms: 2400, icon: Globe20Regular },
    { t: 'toggle', k: 'maps-metered', title: 'Metered connections', sub: 'Download maps over metered connections', def: false, icon: Router20Regular },
    { t: 'toggle', k: 'maps-update', title: 'Automatically update maps', def: true, icon: ArrowSync20Filled },
  ] },
  'apps-apps-for-websites': { parent: 'apps', title: 'Apps for websites', items: () => [...appToggles('web-app', ['teams', 'outlook', 'zoom', 'slack'])] },
  'apps-video-playback': { parent: 'apps', title: 'Video playback', items: () => [
    { t: 'toggle', k: 'video-enhance', title: 'Process video automatically to enhance it', def: true, icon: Video20Regular },
    { t: 'toggle', k: 'video-lowres', title: 'Play video at a lower resolution', def: false, icon: Video20Regular },
    { t: 'select', k: 'video-battery', title: 'Battery options', options: ['Optimize for battery life', 'Optimize for video quality'], def: 'Optimize for battery life', icon: Battery820Regular },
  ] },
  'apps-startup': { parent: 'apps', title: 'Startup', items: () => [{ t: 'info', title: 'Apps can be configured to start when you log in', sub: 'In most cases, apps will start minimized or may only start a background task', icon: Info20Regular }, ...appToggles('startup', ['teams', 'outlook', 'hworker', 'slack', 'zoom', 'edge'], true)] },
  /* accounts */
  'accounts-your-info': { parent: 'accounts', title: 'Your info', items: () => [
    { t: 'custom', render: () => <YourInfo /> },
    { t: 'open', title: 'Manage my accounts', sub: 'Open your Microsoft Entra profile', app: 'edge', params: { url: 'https://myaccount.microsoft.com/' }, icon: Person20Filled },
  ] },
  'accounts-email-accounts': { parent: 'accounts', title: 'Email & accounts', items: () => [
    { t: 'info', title: ME.email, sub: 'Work or school account · Email, calendar, and contacts', icon: Mail20Regular },
    { t: 'open', title: 'Open Outlook', sub: 'Accounts used by email, calendar, and contacts', app: 'outlook', icon: Mail20Regular },
  ] },
  'accounts-sign-in-options': { parent: 'accounts', title: 'Sign-in options', items: () => [
    { t: 'info', title: 'Facial recognition (Windows Hello)', sub: 'This option is currently available', value: 'Set up', icon: Camera20Regular },
    { t: 'info', title: 'Fingerprint recognition (Windows Hello)', sub: 'This option is currently unavailable', icon: Key20Regular },
    { t: 'info', title: 'PIN (Windows Hello)', sub: 'Sign in with a PIN (Recommended)', value: 'Set up', icon: Key20Regular },
    { t: 'info', title: 'Security key', sub: 'Sign in with a physical security key', icon: Key20Regular },
    { t: 'section', label: 'Additional settings' },
    { t: 'select', k: 'signin-away', title: 'If you’ve been away, when should Windows require you to sign in again?', options: ['Every time', '1 minute', '3 minutes', '5 minutes', '15 minutes'], def: 'Every time', icon: Timer20Regular },
    { t: 'toggle', k: 'signin-dynamic', title: 'Dynamic lock', sub: 'Automatically lock your device when you’re away', def: false, icon: LockClosed20Regular },
    { t: 'custom', render: () => <LockNow /> },
  ] },
  'accounts-access-work-or-school': { parent: 'accounts', title: 'Access work or school', items: () => [
    { t: 'info', title: `${COMPANY.name} · ${ME.email}`, sub: 'Connected by Microsoft Entra ID · Managed by Intune', icon: Briefcase20Regular },
    { t: 'action', title: 'Device sync status', sub: 'Last successful sync: Today, 8:02 AM', label: 'Sync', done: `Sync complete — ${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`, ms: 2000, icon: ArrowSync20Filled },
    { t: 'action', title: 'Export your management log files', sub: 'Your log files will be exported to C:\\Users\\Public\\Documents\\MDMDiagnostics', label: 'Export', done: 'Exported MDMDiagReport.html', ms: 1500, icon: Document20Regular },
  ] },
  'accounts-windows-backup': { parent: 'accounts', title: 'Windows backup', items: () => [
    { t: 'info', title: 'OneDrive folder syncing', sub: 'Desktop, Documents and Pictures are backed up to OneDrive - Northwind Global', value: 'On', icon: CloudArrowUp20Regular },
    { t: 'toggle', k: 'backup-apps', title: 'Remember my apps', def: true, icon: Apps20Filled },
    { t: 'toggle', k: 'backup-prefs', title: 'Remember my preferences', sub: 'Accessibility, passwords, language preferences and other Windows settings', def: true, icon: Settings20Regular },
    { t: 'action', title: 'Back up now', label: 'Back up', done: 'Your PC is backed up', ms: 2600, icon: CloudArrowUp20Regular },
  ] },
  'accounts-other-users': { parent: 'accounts', title: 'Other users', items: () => [
    { t: 'info', title: 'Other users', sub: 'Adding users is restricted by your organization', icon: People20Regular },
    { t: 'info', title: 'Set up a kiosk', sub: 'Turn this device into a kiosk to use as a digital sign, interactive display, or other things', icon: Desktop20Filled },
  ] },
  /* time */
  'time-date-time': { parent: 'time', title: 'Date & time', items: () => [
    { t: 'custom', render: () => <Clock /> },
    { t: 'toggle', k: 'time-auto', title: 'Set time automatically', def: true, icon: Clock20Filled },
    { t: 'select', k: 'time-zone', title: 'Time zone', options: ['(UTC-08:00) Pacific Time (US & Canada)', '(UTC-06:00) Central Time (US & Canada)', '(UTC-05:00) Eastern Time (US & Canada)', '(UTC+00:00) Dublin, Edinburgh, Lisbon, London', '(UTC+01:00) Amsterdam, Berlin, Rome, Stockholm', '(UTC+01:00) Brussels, Copenhagen, Madrid, Paris'], def: '(UTC-05:00) Eastern Time (US & Canada)', icon: Globe20Regular },
    { t: 'toggle', k: 'time-dst', title: 'Adjust for daylight saving time automatically', def: true, icon: Clock20Filled },
    { t: 'action', title: 'Sync now', sub: 'Last successful time synchronization: Today, 7:58 AM · time.windows.com', label: 'Sync now', done: 'Synced', ms: 1200, icon: ArrowSync20Filled },
  ] },
  'time-language-region': { parent: 'time', title: 'Language & region', items: () => [
    { t: 'select', k: 'lang-display', title: 'Windows display language', options: ['English (United States)', 'English (United Kingdom)', 'Français (France)', 'Deutsch (Deutschland)', 'Español (España)'], def: 'English (United States)', icon: Translate20Regular },
    { t: 'select', k: 'lang-region', title: 'Country or region', options: ['United States', 'United Kingdom', 'Canada', 'France', 'Germany', 'Netherlands'], def: 'United States', icon: Globe20Regular },
    { t: 'select', k: 'lang-format', title: 'Regional format', options: ['Recommended [English (United States)]', 'English (United Kingdom)', 'English (Canada)'], def: 'Recommended [English (United States)]', icon: Globe20Regular },
  ] },
  'time-typing': { parent: 'time', title: 'Typing', items: () => [
    { t: 'toggle', k: 'typing-autocorrect', title: 'Autocorrect misspelled words', def: true, icon: Keyboard20Regular },
    { t: 'toggle', k: 'typing-highlight', title: 'Highlight misspelled words', def: true, icon: Keyboard20Regular },
    { t: 'toggle', k: 'typing-suggest', title: 'Show text suggestions when typing on the physical keyboard', def: false, icon: Keyboard20Regular },
  ] },
  'time-speech': { parent: 'time', title: 'Speech', items: () => [
    { t: 'select', k: 'speech-lang', title: 'Speech language', options: ['English (United States)', 'English (United Kingdom)'], def: 'English (United States)', icon: Mic20Regular },
    { t: 'select', k: 'speech-voice', title: 'Voices', options: ['Microsoft Aria (Natural)', 'Microsoft Guy (Natural)', 'Microsoft Jenny (Natural)'], def: 'Microsoft Aria (Natural)', icon: Speaker220Regular },
    { t: 'slider', k: 'speech-speed', title: 'Voice speed', def: 50, icon: Speaker220Regular },
  ] },
  /* gaming */
  'gaming-game-bar': { parent: 'gaming', title: 'Game Bar', items: () => [
    { t: 'toggle', k: 'gamebar-controller', title: 'Allow your controller to open Game Bar', def: true, icon: Games20Filled },
    { t: 'info', title: 'Keyboard shortcut', sub: 'Open Game Bar', value: 'Win + G', icon: Keyboard20Regular },
  ] },
  'gaming-captures': { parent: 'gaming', title: 'Captures', items: () => [
    { t: 'open', title: 'Captures location', sub: 'C:\\Users\\alex.morgan\\Videos\\Captures', app: 'explorer', params: { path: 'Videos/Captures' }, icon: Folder20Regular },
    { t: 'toggle', k: 'cap-audio', title: 'Capture audio when recording a game', def: true, icon: Mic20Regular },
    { t: 'select', k: 'cap-fps', title: 'Video frame rate', options: ['30 fps', '60 fps'], def: '30 fps', icon: Video20Regular },
    { t: 'select', k: 'cap-quality', title: 'Video quality', options: ['Standard', 'High'], def: 'Standard', icon: Video20Regular },
  ] },
  /* accessibility */
  'accessibility-text-size': { parent: 'accessibility', title: 'Text size', items: () => [{ t: 'custom', render: () => <TextSize /> }] },
  'accessibility-visual-effects': { parent: 'accessibility', title: 'Visual effects', items: () => [
    { t: 'toggle', k: 'vfx-scrollbars', title: 'Always show scrollbars', def: false, icon: Eye20Regular },
    { t: 'toggle', k: 'vfx-transparency', title: 'Transparency effects', def: true, icon: Eye20Regular },
    { t: 'toggle', k: 'vfx-animation', title: 'Animation effects', def: true, icon: Eye20Regular },
    { t: 'select', k: 'vfx-dismiss', title: 'Dismiss notifications after this amount of time', options: ['5 seconds', '7 seconds', '15 seconds', '30 seconds', '1 minute', '5 minutes'], def: '5 seconds', icon: Alert20Regular },
  ] },
  'accessibility-mouse-pointer-and-touch': { parent: 'accessibility', title: 'Mouse pointer and touch', items: () => [
    { t: 'select', k: 'ptr-style', title: 'Mouse pointer style', options: ['White', 'Black', 'Inverted', 'Custom'], def: 'White', icon: Mouse20Regular },
    { t: 'slider', k: 'ptr-size', title: 'Size', def: 1, icon: Mouse20Regular },
    { t: 'toggle', k: 'ptr-touch', title: 'Touch indicator', def: true, icon: Mouse20Regular },
  ] },
  'accessibility-magnifier': { parent: 'accessibility', title: 'Magnifier', items: () => [
    { t: 'toggle', k: 'mag-on', title: 'Magnifier', sub: 'Press Windows logo key + Plus (+) to turn on', def: false, icon: ZoomIn20Regular },
    { t: 'select', k: 'mag-zoom', title: 'Zoom level', options: ['100%', '150%', '200%', '300%', '400%'], def: '200%', icon: ZoomIn20Regular },
    { t: 'select', k: 'mag-view', title: 'View', options: ['Full screen', 'Docked', 'Lens'], def: 'Full screen', icon: ZoomIn20Regular },
  ] },
  'accessibility-color-filters': { parent: 'accessibility', title: 'Color filters', items: () => [
    { t: 'toggle', k: 'cf-on', title: 'Color filters', def: false, icon: Color20Regular },
    { t: 'select', k: 'cf-kind', title: 'Filter', options: ['Red-green (green weak, deuteranopia)', 'Red-green (red weak, protanopia)', 'Blue-yellow (tritanopia)', 'Grayscale', 'Grayscale inverted', 'Inverted'], def: 'Red-green (green weak, deuteranopia)', icon: Color20Regular },
  ] },
  'accessibility-audio': { parent: 'accessibility', title: 'Audio', items: () => [
    { t: 'toggle', k: 'sound-mono', title: 'Mono audio', sub: 'Combine left and right audio channels into one', def: false, icon: Headphones20Regular },
    { t: 'select', k: 'audio-flash', title: 'Flash my screen during audio notifications', options: ['Don’t flash', 'Flash the title bar of the active window', 'Flash the active window', 'Flash the entire screen'], def: 'Don’t flash', icon: Alert20Regular },
  ] },
  'accessibility-captions': { parent: 'accessibility', title: 'Captions', items: () => [
    { t: 'toggle', k: 'cap-live', title: 'Live captions', sub: 'Press Windows logo key + Ctrl + L', def: false, icon: Mic20Regular },
    { t: 'select', k: 'cap-style', title: 'Caption style', options: ['White on black', 'Small caps', 'Large text', 'Yellow on blue'], def: 'White on black', icon: TextFont20Regular },
  ] },
  /* privacy */
  'privacy-windows-security': { parent: 'privacy', title: 'Windows Security', items: () => [
    { t: 'info', title: 'Virus & threat protection', sub: 'No actions needed · Managed by Northwind IT', value: '✓', icon: Shield20Regular },
    { t: 'info', title: 'Account protection', sub: 'No actions needed', value: '✓', icon: Person20Filled },
    { t: 'info', title: 'Firewall & network protection', sub: 'No actions needed', value: '✓', icon: Wifi120Filled },
    { t: 'info', title: 'App & browser control', sub: 'No actions needed', value: '✓', icon: Window20Regular },
    { t: 'info', title: 'Device security', sub: 'View status and manage hardware security features', value: '✓', icon: Laptop20Regular },
    { t: 'action', title: 'Quick scan', sub: 'Last scan: Today, 6:00 AM (quick scan) · 0 threats found', label: 'Scan now', done: 'No current threats. 48,211 files scanned.', ms: 3200, icon: Shield20Regular },
  ] },
  'privacy-find-my-device': { parent: 'privacy', title: 'Find my device', items: () => [
    { t: 'toggle', k: 'findmy', title: 'Find my device', sub: 'Use location to help find your device if you think you’ve lost it', def: true, icon: Location20Regular },
  ] },
  'privacy-device-encryption': { parent: 'privacy', title: 'Device encryption', items: () => [
    { t: 'info', title: 'Device encryption', sub: 'Helps protect the data on your device from unauthorized access · Managed by your organization', value: 'On', icon: Key20Regular },
    { t: 'info', title: 'BitLocker recovery key', sub: 'Backed up to Microsoft Entra ID', icon: Key20Regular },
  ] },
  'privacy-for-developers': { parent: 'privacy', title: 'For developers', items: () => [
    { t: 'toggle', k: 'dev-mode', title: 'Developer Mode', sub: 'Install apps from any source, including loose files', def: false, icon: WindowDevTools20Regular },
    { t: 'toggle', k: 'dev-ext', title: 'File Explorer: show file extensions', def: true, icon: Folder20Regular },
    { t: 'toggle', k: 'dev-path', title: 'File Explorer: show full path in title bar', def: false, icon: Folder20Regular },
  ] },
  'privacy-camera': { parent: 'privacy', title: 'Camera', items: () => [{ t: 'toggle', k: 'perm-camera', title: 'Camera access', sub: 'Anyone using this device can choose if their apps have camera access', def: true, icon: Camera20Regular }, { t: 'section', label: 'Let apps access your camera' }, ...appToggles('cam', ['teams', 'zoom', 'edge', 'slack'])] },
  'privacy-microphone': { parent: 'privacy', title: 'Microphone', items: () => [{ t: 'toggle', k: 'perm-mic', title: 'Microphone access', def: true, icon: Mic20Regular }, { t: 'section', label: 'Let apps access your microphone' }, ...appToggles('mic', ['teams', 'zoom', 'edge', 'slack'])] },
  'privacy-notifications': { parent: 'privacy', title: 'Notifications', items: () => [{ t: 'toggle', k: 'perm-notif', title: 'Notification access', def: true, icon: Alert20Regular }, { t: 'section', label: 'Let apps access your notifications' }, ...appToggles('pnotif', ['outlook', 'teams', 'hworker'])] },
  /* update */
  'update-update-history': { parent: 'update', title: 'Update history', items: () => [
    { t: 'section', label: 'Quality Updates' },
    { t: 'info', title: '2026-10 Cumulative Update for Windows 11 Version 24H2 for ARM64-based Systems (KB5048667)', sub: 'Successfully installed on 10/15/2026', icon: ArrowSync20Filled },
    { t: 'info', title: '2026-09 Cumulative Update for Windows 11 Version 24H2 for ARM64-based Systems (KB5046617)', sub: 'Successfully installed on 9/17/2026', icon: ArrowSync20Filled },
    { t: 'section', label: 'Definition Updates' },
    { t: 'info', title: 'Security Intelligence Update for Microsoft Defender Antivirus - KB2267602 (Version 1.421.112.0)', sub: 'Successfully installed today', icon: Shield20Regular },
    { t: 'section', label: 'Other Updates' },
    { t: 'info', title: 'Windows Malicious Software Removal Tool - v5.130 (KB890830)', sub: 'Successfully installed on 10/15/2026', icon: Shield20Regular },
  ] },
  'update-advanced-options': { parent: 'update', title: 'Advanced options', items: () => [
    { t: 'toggle', k: 'upd-other', title: 'Receive updates for other Microsoft products', def: true, icon: ArrowSync20Filled },
    { t: 'toggle', k: 'upd-fast', title: 'Get me up to date', sub: 'Restart as soon as possible (even during active hours) to finish updating', def: false, icon: ArrowSync20Filled },
    { t: 'toggle', k: 'upd-metered', title: 'Download updates over metered connections', def: false, icon: Router20Regular },
    { t: 'select', k: 'upd-hours', title: 'Active hours', sub: 'We won’t restart your device during these hours', options: ['Automatically (8:00 AM to 6:00 PM)', 'Manually (7:00 AM to 7:00 PM)'], def: 'Automatically (8:00 AM to 6:00 PM)', icon: Clock20Filled },
  ] },
  'update-windows-insider-program': { parent: 'update', title: 'Windows Insider Program', items: () => [
    { t: 'info', title: 'Windows Insider Program', sub: 'Your organization manages Insider builds on this device', icon: Globe20Regular },
  ] },
  'update-configured-policies': { parent: 'update', title: 'Configured update policies', items: () => [
    { t: 'info', title: 'Set deadlines for automatic updates and restarts', sub: 'Type: Device policy · Northwind IT', icon: Shield20Regular },
    { t: 'info', title: 'Select when Quality Updates are received', sub: 'Deferral: 7 days · Northwind IT', icon: Shield20Regular },
    { t: 'info', title: 'Select the target Feature Update version', sub: 'Windows 11, 24H2 · Northwind IT', icon: Shield20Regular },
  ] },
}
for (const [id, s] of Object.entries(SUB)) TITLES[id] = s.title

/* ───────── helpers & custom panels ───────── */

function ActionRow({ it }: { it: Extract<It, { t: 'action' }> }) {
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle')
  const run = () => {
    if (it.managed) return
    setState('busy')
    setTimeout(() => setState('done'), it.ms ?? 1200)
  }
  return (
    <Card
      icon={it.icon}
      title={it.title}
      sub={it.managed ? `${it.sub ? it.sub + ' · ' : ''}This option is managed by your organization` : state === 'done' ? it.done : it.sub}
      agent={`settings-action-${slug(it.title)}`}
      right={<Btn disabled={it.managed || state === 'busy'} onClick={run}>{state === 'busy' ? 'Working…' : it.label}</Btn>}
    />
  )
}

function SubPage({ id, go }: { id: string; go: (p: string) => void }) {
  const p = usePrefs()
  const { open } = useDesk()
  const items = SUB[id].items()
  return (
    <>
      {items.map((it, i) => {
        switch (it.t) {
          case 'section':
            return <Section key={i} t={it.label} />
          case 'toggle':
            return <Card key={i} icon={it.icon} title={it.title} sub={it.sub} agent={`settings-row-${slug(it.k)}`} right={<Toggle on={p.get(it.k, it.def)} onChange={(v) => p.set(it.k, v)} label={it.title} agent={`settings-toggle-${it.k}`} />} />
          case 'select':
            return <Card key={i} icon={it.icon} title={it.title} sub={it.sub} right={<Dropdown value={p.get(it.k, it.def)} options={it.options} onChange={(v) => p.set(it.k, v)} agent={`settings-select-${it.k}`} />} />
          case 'slider':
            return <Card key={i} icon={it.icon} title={it.title} sub={it.sub} right={<Slider value={p.get(it.k, it.def)} onChange={(v) => p.set(it.k, v)} label={it.title} />} />
          case 'info':
            return <Card key={i} icon={it.icon} title={it.title} sub={it.sub} right={it.value ? <span className="text-[13px] text-[var(--s-sub)]">{it.value}</span> : undefined} />
          case 'link':
            return <Card key={i} icon={it.icon} title={it.title} sub={it.sub} onClick={() => go(it.to)} />
          case 'open':
            return <Card key={i} icon={it.icon} title={it.title} sub={it.sub} agent={`settings-open-${slug(it.title)}`} onClick={() => open(it.app, it.params)} />
          case 'action':
            return <ActionRow key={i} it={it} />
          case 'custom':
            return <div key={i}>{it.render()}</div>
        }
      })}
    </>
  )
}

function DeviceName() {
  const [name] = usePref('device-name', 'NW-LT-0142')
  return <>{name}</>
}

function RenameDialog({ onClose }: { onClose: () => void }) {
  const [name, setName] = usePref('device-name', 'NW-LT-0142')
  const [v, setV] = useState(name)
  const ok = /^[A-Za-z0-9-]{1,15}$/.test(v)
  return (
    <div className="absolute inset-0 z-50 bg-black/30 flex items-center justify-center" onClick={onClose}>
      <div className="w-[460px] rounded-lg bg-[var(--s-menu)] text-[var(--s-tx)] shadow-[0_16px_40px_rgba(0,0,0,0.3)] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="text-[20px] font-semibold mb-2">Rename your PC</div>
          <div className="text-[13px] text-[var(--s-sub)] mb-3">Current PC name: {name}</div>
          <input autoFocus data-agent="settings-rename-input" value={v} onChange={(e) => setV(e.target.value)} className="w-full h-8 px-3 rounded-[4px] bg-[var(--s-in)] border border-[var(--s-inbd)] outline-none text-[14px]" style={{ fontSize: 14 }} />
          {!ok && <div className="text-[12px] text-[#C42B1C] mt-1">Use up to 15 letters, numbers and hyphens.</div>}
        </div>
        <div className="px-6 py-4 bg-[var(--s-bg)] flex justify-end gap-2">
          <Btn primary agent="settings-rename-ok" disabled={!ok} onClick={() => { setName(v); onClose() }}>Next</Btn>
          <Btn onClick={onClose}>Cancel</Btn>
        </div>
      </div>
    </div>
  )
}

function FocusSession() {
  const [mins, setMins] = usePref('focus-mins', 30)
  const [until, setUntil] = usePref<number | null>('focus-until', null)
  const [, tick] = useState(0)
  useEffect(() => {
    if (!until) return
    const t = setInterval(() => tick((n) => n + 1), 1000)
    return () => clearInterval(t)
  }, [until])
  const left = until ? Math.max(0, until - Date.now()) : 0
  const running = !!until && left > 0
  const mm = Math.floor(left / 60000)
  const ss = Math.floor((left % 60000) / 1000)
  return (
    <>
      <div className="rounded-[6px] bg-[var(--s-card)] border border-[var(--s-bd)] p-6 flex flex-col items-center mb-[3px]">
        {running ? (
          <>
            <div className="text-[48px] font-semibold tabular-nums" data-agent="settings-focus-timer">{String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}</div>
            <div className="text-[13px] text-[var(--s-sub)] mb-4">Focus session in progress · do not disturb is on</div>
            <Btn agent="settings-focus-stop" onClick={() => setUntil(null)}>Stop focus session</Btn>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-4">
              <button aria-label="Decrease" onClick={() => setMins(Math.max(5, mins - 5))} className="w-8 h-8 rounded-[4px] border border-[var(--s-inbd)] hover:bg-[var(--s-hov)]">−</button>
              <div className="text-[48px] font-semibold w-[110px] text-center">{mins}</div>
              <button aria-label="Increase" onClick={() => setMins(Math.min(240, mins + 5))} className="w-8 h-8 rounded-[4px] border border-[var(--s-inbd)] hover:bg-[var(--s-hov)]">+</button>
            </div>
            <div className="text-[13px] text-[var(--s-sub)] mb-4">mins</div>
            <Btn primary agent="settings-focus-start" onClick={() => setUntil(Date.now() + mins * 60000)}>Start focus session</Btn>
          </>
        )}
      </div>
      <SubPageToggles items={[
        { t: 'toggle', k: 'focus-timer', title: 'Show the timer in the Clock app', def: true, icon: Timer20Regular },
        { t: 'toggle', k: 'focus-badges', title: 'Hide badges on taskbar apps', def: true, icon: Alert20Regular },
        { t: 'toggle', k: 'focus-dnd', title: 'Turn on do not disturb', def: true, icon: WeatherMoon20Regular },
      ]} />
    </>
  )
}
function SubPageToggles({ items }: { items: Extract<It, { t: 'toggle' }>[] }) {
  const p = usePrefs()
  return (
    <>
      {items.map((it) => (
        <Card key={it.k} icon={it.icon} title={it.title} sub={it.sub} right={<Toggle on={p.get(it.k, it.def)} onChange={(v) => p.set(it.k, v)} label={it.title} agent={`settings-toggle-${it.k}`} />} />
      ))}
    </>
  )
}

const parseSize = (s?: string) => {
  const m = /([\d.]+)\s*(KB|MB|GB|B)/i.exec(s ?? '')
  if (!m) return 0
  return parseFloat(m[1]) * ({ B: 1, KB: 1e3, MB: 1e6, GB: 1e9 } as any)[m[2].toUpperCase()]
}
const fmtBytes = (b: number) => (b >= 1e9 ? `${(b / 1e9).toFixed(1)} GB` : b >= 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`)

function StoragePage() {
  const files = useCollection('files')
  const recycle = useCollection('explorer.recycle')
  const { open } = useDesk()
  const [sense, setSense] = usePref('storage-sense', true)
  const sum = (pred: (f: any) => boolean) => files.filter(pred).reduce((n, f) => n + parseSize(f.size), 0)
  const cats: [string, number, string | null, any][] = [
    ['Installed apps', 41.8e9, null, Apps20Filled],
    ['System & reserved', 26.2e9, null, Settings20Regular],
    ['Documents', sum((f) => f.folder === 'Documents' || f.folder.startsWith('Documents/')) + 2.1e9, 'Documents', Document20Regular],
    ['Pictures', sum((f) => f.folder.startsWith('Pictures')) + 3.4e9, 'Pictures', Image20Regular],
    ['Videos', sum((f) => f.folder.startsWith('Videos')) + 6.8e9, 'Videos', Video20Regular],
    ['Downloads', sum((f) => f.folder === 'Downloads' || f.folder.startsWith('Downloads/')), 'Downloads', Folder20Regular],
    ['Recycle Bin', recycle.reduce((n, r) => n + parseSize(r.size), 0), 'recycle', Delete20Regular],
  ]
  const total = 475e9
  const used = cats.reduce((n, c) => n + c[1], 0) + 211e9
  return (
    <>
      <div className="rounded-[6px] bg-[var(--s-card)] border border-[var(--s-bd)] p-4 mb-[3px]">
        <div className="flex items-center justify-between text-[14px] mb-2">
          <span className="font-semibold">Windows (C:) – {Math.round(total / 1e9)} GB</span>
          <span className="text-[var(--s-sub)]">{fmtBytes(used)} used · {fmtBytes(total - used)} free</span>
        </div>
        <div className="h-2 rounded-full bg-[var(--s-bd)] overflow-hidden">
          <div className="h-full bg-[var(--s-acc)]" style={{ width: `${(used / total) * 100}%` }} />
        </div>
      </div>
      {cats.map(([l, b, path, I]) => (
        <Card key={l} icon={I} title={l} sub={fmtBytes(b)} agent={`settings-storage-${slug(l)}`} onClick={path ? () => open('explorer', { path }) : undefined}>
          <div className="h-1 rounded-full bg-[var(--s-bd)] mt-1.5 w-[240px] overflow-hidden"><div className="h-full bg-[var(--s-acc)]" style={{ width: `${Math.min(100, (b / 45e9) * 100)}%` }} /></div>
        </Card>
      ))}
      <Section t="Storage management" />
      <Card icon={Storage20Regular} title="Storage Sense" sub="Automatically free up space, delete temporary files, and manage locally available cloud content" right={<Toggle on={sense} onChange={setSense} label="Storage Sense" agent="settings-toggle-storage-sense" />} />
    </>
  )
}

function VpnPage() {
  const [on, setOn] = usePref('vpn-connected', true)
  return (
    <>
      <Card icon={Shield20Regular} title="Northwind GlobalProtect" sub={on ? 'Connected · vpn-bos.northwind.com' : 'Not connected'} agent="settings-vpn" right={<Btn agent="settings-vpn-toggle" primary={!on} onClick={() => setOn(!on)}>{on ? 'Disconnect' : 'Connect'}</Btn>} />
      <SubPageToggles items={[
        { t: 'toggle', k: 'vpn-metered', title: 'Allow VPN over metered networks', def: true, icon: Router20Regular },
        { t: 'toggle', k: 'vpn-roaming', title: 'Allow VPN while roaming', def: true, icon: Globe20Regular },
      ]} />
    </>
  )
}

function ColorsPage() {
  const p = usePrefs()
  const mode = p.get<'light' | 'dark'>('mode', 'light')
  const accent = p.get('accent', 0)
  return (
    <>
      <Card icon={Color20Regular} title="Choose your mode" sub="Change the colors that appear in Windows and your apps" right={<Dropdown agent="settings-color-mode" value={mode === 'dark' ? 'Dark' : 'Light'} options={['Light', 'Dark']} onChange={(v) => p.set('mode', v === 'Dark' ? 'dark' : 'light')} />} />
      <Card icon={Eye20Regular} title="Transparency effects" sub="Windows and surfaces appear translucent" right={<Toggle on={p.get('transparency', true)} onChange={(v) => p.set('transparency', v)} label="Transparency effects" />} />
      <Card icon={Color20Regular} title="Accent color">
        <div className="flex flex-wrap gap-2 mt-3">
          {ACCENTS.map(([n, l, d], i) => (
            <button key={n} data-agent={`settings-accent-${slug(n)}`} aria-label={n} title={n} onClick={() => p.set('accent', i)} className={`w-10 h-10 rounded-[6px] border-2 ${accent === i ? 'border-[var(--s-tx)]' : 'border-transparent'}`} style={{ background: mode === 'dark' ? d : l }} />
          ))}
        </div>
      </Card>
      <Card icon={Window20Regular} title="Show accent color on title bars and window borders" right={<Toggle on={p.get('accent-titlebars', false)} onChange={(v) => p.set('accent-titlebars', v)} label="Accent on title bars" />} />
    </>
  )
}

const THEMES: [string, string, 'light' | 'dark'][] = [
  ['Windows (light)', '#B9D7F7', 'light'],
  ['Windows (dark)', '#0E2A5C', 'dark'],
  ['Glow', '#3A1C71', 'dark'],
  ['Captured Motion', '#1F3B2D', 'dark'],
  ['Sunrise', '#F6A96B', 'light'],
  ['Flow', '#7FB8E8', 'light'],
]
function ThemePicker({ agentPrefix = 'settings-theme' }: { agentPrefix?: string }) {
  const p = usePrefs()
  const theme = p.get('theme', 0)
  return (
    <div className="grid grid-cols-3 gap-2">
      {THEMES.map(([n, c, mode], i) => (
        <button
          key={n}
          data-agent={`${agentPrefix}-${i}`}
          aria-label={n}
          title={n}
          onClick={() => p.setMany({ theme: i, mode })}
          className={`h-[64px] rounded-[6px] relative overflow-hidden border-2 ${theme === i ? 'border-[var(--s-acc)]' : 'border-transparent'}`}
          style={{ background: `linear-gradient(135deg, ${c}, ${mode === 'dark' ? '#000' : '#fff'})` }}
        >
          <span className={`absolute bottom-1.5 right-1.5 w-7 h-4 rounded-sm ${mode === 'dark' ? 'bg-[#2B2B2B]' : 'bg-white'}`} />
        </button>
      ))}
    </div>
  )
}

function LockNow() {
  return <Card icon={LockClosed20Regular} title="Lock your PC" sub="Shortcut: Windows logo key + L" right={<Btn agent="settings-lock-now" onClick={() => requestLock()}>Lock</Btn>} />
}

function YourInfo() {
  return (
    <div className="rounded-[6px] bg-[var(--s-card)] border border-[var(--s-bd)] p-6 flex items-center gap-5 mb-[3px]">
      <Avatar id={ME.id} size={96} />
      <div>
        <div className="text-[20px] font-semibold">{ME.name}</div>
        <div className="text-[14px] text-[var(--s-sub)]">{ME.email}</div>
        <div className="text-[14px] text-[var(--s-sub)]">Administrator</div>
      </div>
    </div>
  )
}

function Clock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="rounded-[6px] bg-[var(--s-card)] border border-[var(--s-bd)] p-5 mb-[3px]">
      <div className="text-[34px] font-semibold tabular-nums">{now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' })}</div>
      <div className="text-[14px] text-[var(--s-sub)]">{now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div>
    </div>
  )
}

function TextSize() {
  const [size, setSize] = usePref('text-size', 100)
  return (
    <>
      <div className="rounded-[6px] bg-[var(--s-card)] border border-[var(--s-bd)] p-5 mb-[3px]">
        <div className="text-[12px] text-[var(--s-sub)] mb-2">Text size preview</div>
        <div style={{ fontSize: (14 * size) / 100 }} className="leading-snug">Drag the slider until the text here is easy for you to read, then click Apply.</div>
      </div>
      <Card icon={TextFont20Regular} title="Text size" sub="Text size throughout Windows and apps" right={<Slider value={size} onChange={setSize} label="Text size" min={100} max={225} />} />
    </>
  )
}

function InstalledApps() {
  const { open } = useDesk()
  const [q, setQ] = useState('')
  const [menu, setMenu] = useState<string | null>(null)
  const list = APPS.filter((a) => !a.hidden && a.name.toLowerCase().includes(q.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name))
  const size = (id: string) => `${((id.charCodeAt(0) * 37 + id.length * 113) % 900) + 40} MB`
  return (
    <div onClick={() => setMenu(null)}>
      <div className="flex items-center gap-3 mb-3">
        <input data-agent="settings-apps-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search apps" className="h-8 w-[300px] px-3 rounded-[4px] bg-[var(--s-in)] border border-[var(--s-inbd)] outline-none text-[14px]" style={{ fontSize: 14 }} />
        <span className="text-[13px] text-[var(--s-sub)]">{list.length} apps found</span>
      </div>
      {list.map((a) => (
        <div key={a.id} className="relative">
          <Card
            icon={() => <img src={a.icon} className="w-7 h-7 object-contain" alt="" />}
            title={a.name}
            sub={`${size(a.id)} · ${a.publisher ?? 'Unknown publisher'} · ${a.category}`}
            agent={`settings-app-${a.id}`}
            right={
              <button aria-label="More options" onClick={(e) => { e.stopPropagation(); setMenu(menu === a.id ? null : a.id) }} className="w-8 h-8 rounded-[4px] hover:bg-[var(--s-hov)] flex items-center justify-center">
                <MoreHorizontal20Regular />
              </button>
            }
          />
          {menu === a.id && (
            <div className="absolute right-4 top-14 z-20 w-[200px] py-1 rounded-lg bg-[var(--s-menu)] border border-black/10 shadow-lg text-[14px]" onClick={(e) => e.stopPropagation()}>
              <button data-agent={`settings-app-open-${a.id}`} onClick={() => { setMenu(null); open(a.id) }} className="w-full h-9 px-4 text-left hover:bg-[var(--s-hov)]">Open</button>
              <button disabled className="w-full h-9 px-4 text-left opacity-50" title="Managed by your organization">Modify</button>
              <button disabled className="w-full h-9 px-4 text-left opacity-50" title="Managed by your organization">Uninstall</button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
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

function DeviceHero({ go }: { go: (p: string) => void }) {
  const [rename, setRename] = useState(false)
  const [checked] = usePref('update-checked', 'Today, 8:14 AM')
  return (
    <div className="flex items-center gap-5 mb-5">
      <div className="w-[150px] h-[96px] rounded-[6px] overflow-hidden relative border-[5px] border-[#1F1F1F] shadow">
        <BloomWallpaper />
      </div>
      <div>
        <div className="text-[20px] font-semibold" data-agent="settings-device-name"><DeviceName /></div>
        <div className="text-[14px] text-[var(--s-sub)]">Surface Laptop 7</div>
        <button data-agent="settings-rename" onClick={() => setRename(true)} className="text-[14px] text-[var(--s-acc)] hover:underline mt-0.5">Rename</button>
      </div>
      <div className="flex-1" />
      <div className="flex gap-8 text-[13px]">
        <div className="flex items-center gap-2"><img src={logoUrl('microsoft')} className="w-6 h-6" alt="" /><div><div className="font-semibold">Microsoft 365</div><div className="text-[var(--s-sub)]">Business Premium</div></div></div>
        <button onClick={() => go('system-storage')} className="flex items-center gap-2 text-left"><img src={logoUrl('onedrive')} className="w-6 h-6" alt="" /><div><div className="font-semibold">OneDrive</div><div className="text-[var(--s-sub)]">412 GB of 1 TB used</div></div></button>
        <button onClick={() => go('update')} className="flex items-center gap-2 text-left"><ArrowSync20Filled className="text-[#0067C0]" /><div><div className="font-semibold">Windows Update</div><div className="text-[var(--s-sub)]">Last checked: {checked}</div></div></button>
      </div>
      {rename && <RenameDialog onClose={() => setRename(false)} />}
    </div>
  )
}

function SystemPage({ go }: { go: (p: string) => void }) {
  return (
    <>
      <DeviceHero go={go} />
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
        <Card key={t} icon={I} title={t} sub={s} agent={`settings-system-${t.toLowerCase().replace(/[^a-z]+/g, '-')}`} onClick={() => go(p ?? `system-${slug(t)}`)} />
      ))}
    </>
  )
}

function DisplayPage({ go }: { go: (p: string) => void }) {
  const [bright, setBright] = usePref('brightness', 72)
  const [night, setNight] = usePref('night-light', false)
  const [hdr, setHdr] = usePref('hdr', false)
  const [scale, setScale] = usePref('scale', '125% (Recommended)')
  const [res, setRes] = usePref('resolution', '2496 × 1664 (Recommended)')
  const [orient, setOrient] = usePref('orientation', 'Landscape')
  const [identify, setIdentify] = useState(false)
  const portrait = /Portrait/.test(orient)
  return (
    <>
      <div className="h-[150px] rounded-[6px] bg-[var(--s-card)] border border-[var(--s-bd)] flex items-center justify-center gap-6 mb-[3px] relative">
        <div
          className="rounded-[4px] bg-[#0067C0] text-white text-[28px] font-semibold flex items-center justify-center shadow-inner transition-all"
          style={{ width: portrait ? 74 : 110, height: portrait ? 110 : 74, filter: `brightness(${0.45 + bright / 180})${night ? ' sepia(0.55) saturate(1.4)' : ''}`, transform: /flipped/.test(orient) ? 'rotate(180deg)' : undefined }}
        >
          1
        </div>
        <div className="absolute right-4 bottom-3 flex gap-2">
          <Btn agent="settings-identify" onClick={() => { setIdentify(true); setTimeout(() => setIdentify(false), 1800) }}>Identify</Btn>
        </div>
        {identify && <div className="absolute left-4 top-3 w-12 h-14 rounded bg-black/80 text-white text-[32px] font-semibold flex items-center justify-center">1</div>}
      </div>
      <Section t="Brightness & color" />
      <Card icon={BrightnessHigh20Regular} title="Brightness" sub="Adjust the brightness of the built-in display" right={<Slider value={bright} onChange={setBright} />} />
      <Card icon={WeatherMoon20Regular} title="Night light" sub="Use warmer colors to help block blue light" right={<Toggle on={night} onChange={setNight} agent="settings-night-light" label="Night light" />} />
      <Card icon={Color20Regular} title="HDR" sub="More about HDR" right={<Toggle on={hdr} onChange={setHdr} label="HDR" />} />
      <Section t="Scale & layout" />
      <Card icon={ZoomIn20Regular} title="Scale" sub="Change the size of text, apps, and other items" right={<Dropdown value={scale} onChange={setScale} agent="settings-scale" options={['100%', '125% (Recommended)', '150%', '175%', '200%']} />} />
      <Card icon={Desktop20Filled} title="Display resolution" sub="Adjust the resolution to fit your connected display" right={<Dropdown value={res} onChange={setRes} options={['2496 × 1664 (Recommended)', '1920 × 1280', '1680 × 1120', '1280 × 854']} />} />
      <Card icon={ArrowSync20Filled} title="Display orientation" right={<Dropdown value={orient} onChange={setOrient} options={['Landscape', 'Portrait', 'Landscape (flipped)', 'Portrait (flipped)']} />} />
      <Card icon={Grid20Regular} title="Multiple displays" sub="Choose the presentation mode for your displays" onClick={() => go('display-multiple-displays')} />
      <Section t="Related settings" />
      <Card icon={Image20Regular} title="Advanced display" sub="Display information, refresh rate" onClick={() => go('display-advanced-display')} />
      <Card icon={Settings20Regular} title="Graphics" onClick={() => go('display-graphics')} />
    </>
  )
}

function PersonalizationPage({ go }: { go: (p: string) => void }) {
  const p = usePrefs()
  const theme = p.get('theme', 0)
  return (
    <>
      <div className="flex gap-6 mb-4">
        <div className="w-[330px] h-[190px] rounded-[8px] overflow-hidden relative border-[6px] border-[#1F1F1F] shadow-md">
          <BloomWallpaper variant={THEMES[theme][2] === 'dark' ? 'dark' : 'light'} />
          <div className={`absolute left-3 right-3 bottom-3 h-[42px] rounded-md backdrop-blur ${THEMES[theme][2] === 'dark' ? 'bg-[#202020]/85' : 'bg-white/85'}`} />
          <div className="absolute left-1/2 -translate-x-1/2 bottom-5 flex gap-1.5">
            {['outlook', 'explorer', 'edge', 'teams', 'excel'].map((l) => (
              <img key={l} src={logoUrl(l)} className="w-5 h-5" alt="" />
            ))}
          </div>
        </div>
        <div className="flex-1">
          <div className="text-[14px] mb-2">Select a theme to apply</div>
          <ThemePicker />
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
        <Card key={t} icon={I} title={t} sub={s} agent={`settings-personalization-${slug(t)}`} onClick={() => go(`personalization-${slug(t)}`)} />
      ))}
      <DemoCard />
    </>
  )
}

function AccountsPage({ go }: { go: (p: string) => void }) {
  return (
    <>
      <div className="flex items-center gap-5 mb-5">
        <Avatar id={ME.id} size={88} />
        <div className="flex-1">
          <div className="text-[20px] font-semibold">{ME.name}</div>
          <div className="text-[14px] text-[var(--s-sub)]">{ME.email}</div>
          <div className="text-[14px] text-[var(--s-sub)]">Administrator · Work account</div>
        </div>
        <div className="rounded-[6px] border border-[var(--s-bd)] bg-[var(--s-card)] p-4 w-[330px] flex items-center gap-3">
          <img src={logoUrl('microsoft')} className="w-8 h-8" alt="" />
          <div className="text-[13px]">
            <div className="font-semibold">Microsoft 365 Business Premium</div>
            <div className="text-[var(--s-sub)]">Managed by {COMPANY.name}</div>
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
        <Card key={t} icon={I} title={t} sub={s} agent={`settings-accounts-${t.toLowerCase().replace(/[^a-z]+/g, '-')}`} onClick={() => go(`accounts-${slug(t)}`)} />
      ))}
      <Section t="Work or school" />
      <Card icon={Briefcase20Regular} title={`${COMPANY.name} · ${ME.email}`} sub="Connected by Microsoft Entra ID · Device ID 6c1e2f0a-7d4b-4b7e-9a51-3b8f0c2d91e4 · Managed by Intune" right={<Btn agent="settings-work-info" onClick={() => go('accounts-access-work-or-school')}>Info</Btn>} />
    </>
  )
}

function UpdatePage({ go }: { go: (p: string) => void }) {
  const [state, setState] = useState<'idle' | 'checking' | 'done'>('idle')
  const [latest, setLatest] = usePref('update-latest', true)
  const [checked, setChecked] = usePref('update-checked', 'Today, 8:14 AM')
  const [pause, setPause] = usePref('update-pause', 'Pause for 1 week')
  const [paused, setPaused] = usePref<string | null>('update-paused-until', null)
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
          <div className="text-[20px] font-semibold" data-agent="settings-update-status">{state === 'checking' ? 'Checking for updates…' : paused ? `Updates paused until ${paused}` : 'You’re up to date'}</div>
          <div className="text-[14px] text-[var(--s-sub)]">Last checked: {checked}</div>
        </div>
        <button data-agent="settings-check-updates" disabled={state === 'checking'} onClick={check} className="h-8 px-4 rounded-[4px] bg-[#005FB8] hover:bg-[#1A6FC0] disabled:opacity-50 text-white text-[14px]">
          Check for updates
        </button>
      </div>
      <div className="flex items-center gap-2 text-[13px] text-[#C42B1C] mb-4">
        <Shield20Regular /> *Some settings are managed by your organization
        <button onClick={() => go('update-configured-policies')} className="text-[var(--s-acc)] hover:underline ml-1">View configured update policies</button>
      </div>
      <Card icon={Alert20Regular} title="Get the latest updates as soon as they’re available" sub="Be among the first to get the latest non-security updates, fixes, and improvements as they roll out." right={<Toggle on={latest} onChange={setLatest} label="Get the latest updates" />} />
      <Section t="More options" />
      <Card
        icon={Pause20Regular}
        title="Pause updates"
        sub={paused ? `Paused until ${paused}` : undefined}
        right={
          <div className="flex items-center gap-2">
            {paused ? (
              <Btn agent="settings-resume-updates" onClick={() => setPaused(null)}>Resume updates</Btn>
            ) : (
              <>
                <Dropdown value={pause} onChange={setPause} options={['Pause for 1 week', 'Pause for 2 weeks', 'Pause for 3 weeks', 'Pause for 4 weeks', 'Pause for 5 weeks']} />
                <Btn agent="settings-pause-updates" onClick={() => setPaused(new Date(Date.now() + Number(/\d/.exec(pause)?.[0] ?? 1) * 7 * 86400000).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }))}>Pause</Btn>
              </>
            )}
          </div>
        }
      />
      <Card icon={History20Regular} title="Update history" onClick={() => go('update-update-history')} />
      <Card icon={Settings20Regular} title="Advanced options" sub="Delivery optimization, optional updates, active hours, other update settings" onClick={() => go('update-advanced-options')} />
      <Card icon={Globe20Regular} title="Windows Insider Program" sub="Get preview builds of Windows to share feedback on new features and updates" onClick={() => go('update-windows-insider-program')} />
      <div className="mt-5 text-[13px] text-[var(--s-sub)] flex items-center gap-2">
        <Info20Regular /> Windows 11 Enterprise, version 24H2 (OS Build 26100.6899) · Windows Update for Business is managed by Northwind IT
      </div>
    </>
  )
}

function AboutPage() {
  const [name] = usePref('device-name', 'NW-LT-0142')
  const [rename, setRename] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const rows = [
    ['Device name', name],
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
  const copy = (t: string, r: string[][]) => {
    navigator.clipboard?.writeText(r.map(([a, b]) => `${a}\t${b}`).join('\n')).catch(() => {})
    setCopied(t)
    setTimeout(() => setCopied(null), 1500)
  }
  const Block = ({ t, r }: { t: string; r: string[][] }) => (
    <div className="rounded-[6px] border border-[var(--s-bd)] bg-[var(--s-card)] mb-3">
      <div className="px-4 h-12 flex items-center gap-3 text-[14px] font-semibold border-b border-[var(--s-bd)]">
        <Info20Regular /> <span className="flex-1">{t}</span>
        <Btn agent={`settings-copy-${slug(t)}`} onClick={() => copy(t, r)}>{copied === t ? 'Copied' : 'Copy'}</Btn>
      </div>
      <div className="px-14 py-3 grid grid-cols-[180px_1fr] gap-y-1.5 text-[13.5px]">
        {r.map(([a, b]) => (
          <div key={a} className="contents"><span className="text-[var(--s-sub)]">{a}</span><span>{b}</span></div>
        ))}
      </div>
    </div>
  )
  return (
    <>
      <div className="flex items-center gap-4 mb-4 rounded-[6px] border border-[var(--s-bd)] bg-[var(--s-card)] p-4">
        <Laptop20Regular />
        <div className="flex-1">
          <div className="text-[14px] font-semibold">{name}</div>
          <div className="text-[12px] text-[var(--s-sub)]">Surface Laptop 7</div>
        </div>
        <Btn agent="settings-about-rename" onClick={() => setRename(true)}>Rename this PC</Btn>
      </div>
      <Block t="Device specifications" r={rows} />
      <Block t="Windows specifications" r={win} />
      {rename && <RenameDialog onClose={() => setRename(false)} />}
    </>
  )
}

function HomePage({ go }: { go: (p: string) => void }) {
  const p = usePrefs()
  const { open } = useDesk()
  const bt = p.get('bt', true) && !p.get('airplane', false)
  const mode = p.get<string>('mode', 'light')
  return (
    <>
      <DeviceHero go={go} />
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-4">
          <div className="rounded-[8px] border border-[var(--s-bd)] bg-[var(--s-card)] p-4">
            <div className="text-[14px] font-semibold mb-3">Recommended settings</div>
            {[
              [Desktop20Filled, 'Display', 'display'],
              [Speaker220Regular, 'Sound', 'system-sound'],
              [ArrowSync20Filled, 'Windows Update', 'update'],
            ].map(([I, t, pg]: any) => (
              <div key={t} onClick={() => go(pg)} className="h-11 flex items-center gap-3 px-2 rounded hover:bg-[var(--s-hov)] text-[14px]">
                <I className="text-[#0067C0]" /> <span className="flex-1">{t}</span> <ChevronRight16Regular className="text-[var(--s-sub)]" />
              </div>
            ))}
          </div>
          <div className="rounded-[8px] border border-[var(--s-bd)] bg-[var(--s-card)] p-4">
            <div className="flex items-center mb-3">
              <div className="text-[14px] font-semibold flex-1">Bluetooth devices</div>
              <button onClick={() => go('bluetooth')} className="text-[13px] text-[var(--s-acc)] hover:underline">View all devices</button>
            </div>
            {[
              [Headphones20Regular, 'Surface Headphones 2+', '82%'],
              [Mouse20Regular, 'Surface Arc Mouse', '64%'],
              [Print20Regular, 'NW-BOS-3F-HP LaserJet', null],
            ].map(([I, t, s]: any) => (
              <div key={t} className="h-12 flex items-center gap-3 px-2 text-[14px]">
                <I /> <div className="flex-1"><div>{t}</div><div className="text-[12px] text-[var(--s-sub)]">{s ? (bt && p.get(`bt-dev-${slug(t)}`, true) ? `Connected · ${s}` : 'Not connected') : 'Ready'}</div></div>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-[8px] border border-[var(--s-bd)] bg-[var(--s-card)] p-4">
            <div className="text-[14px] font-semibold mb-3">Cloud storage</div>
            <div className="text-[13px] text-[var(--s-sub)] mb-2">You are using 41% of your 1 TB OneDrive - {COMPANY.name}</div>
            <div className="h-1.5 rounded-full bg-[var(--s-bd)]"><div className="h-full w-[41%] rounded-full bg-[var(--s-acc)]" /></div>
            <Btn agent="settings-onedrive-details" onClick={() => open('explorer', { path: 'OneDrive' })}>View details</Btn>
          </div>
          <div className="rounded-[8px] border border-[var(--s-bd)] bg-[var(--s-card)] p-4">
            <div className="text-[14px] font-semibold mb-1">Personalize your device</div>
            <div className="text-[13px] text-[var(--s-sub)] mb-3">Color mode: {mode === 'dark' ? 'Dark' : 'Light'}</div>
            <button onClick={() => go('personalization')} className="h-8 px-4 rounded-[4px] bg-[var(--s-in)] border border-[var(--s-inbd)] text-[13px]">Browse more backgrounds, colors, and themes</button>
          </div>
        </div>
      </div>
      <DemoCard />
    </>
  )
}

function ListPage({ items, go, base }: { items: [any, string, string, React.ReactNode?][]; go: (p: string) => void; base: string }) {
  return (
    <>
      {items.map(([I, t, s, r]) => {
        const to = `${base}-${slug(t)}`
        return <Card key={t} icon={I} title={t} sub={s} right={r} agent={`settings-${base}-${slug(t)}`} onClick={r ? undefined : SUB[to] ? () => go(to) : undefined} />
      })}
    </>
  )
}

function BluetoothDevice({ icon, name, kind }: { icon: any; name: string; kind: string }) {
  const p = usePrefs()
  const k = `bt-dev-${slug(name)}`
  const on = p.get(k, kind !== 'paired')
  const radio = p.get('bt', true) && !p.get('airplane', false)
  return (
    <Card
      icon={icon}
      title={name}
      sub={!radio ? 'Turn on Bluetooth to connect' : on ? (kind === 'audio' ? 'Connected voice, music · 82%' : kind === 'mouse' ? 'Connected · 64%' : 'Connected') : 'Paired'}
      agent={`settings-bt-${slug(name)}`}
      right={<Btn agent={`settings-bt-${slug(name)}-toggle`} disabled={!radio} onClick={() => p.set(k, !on)}>{on ? 'Disconnect' : 'Connect'}</Btn>}
    />
  )
}

function WifiNetworks() {
  const p = usePrefs()
  const wifi = p.get('wifi', true) && !p.get('airplane', false)
  const cur = p.get('wifi-net', 'NW-Corp')
  if (!wifi) return null
  return (
    <div className="ml-10 mb-2">
      {[['NW-Corp', 'Secured, 802.1X'], ['NW-Guest', 'Open'], ['BOS-3F-Printers', 'Secured'], ['xfinitywifi', 'Open']].map(([n, s]) => (
        <div key={n} className="flex items-center gap-3 h-11 px-3 rounded-[6px] hover:bg-[var(--s-hov)] text-[14px]">
          <Wifi120Filled className="text-[var(--s-sub)]" />
          <div className="flex-1">
            <div>{n}</div>
            <div className="text-[12px] text-[var(--s-sub)]">{n === cur ? `Connected, ${s.toLowerCase()}` : s}</div>
          </div>
          {n !== cur && <Btn agent={`settings-wifi-${slug(n)}`} onClick={() => p.set('wifi-net', n)}>Connect</Btn>}
        </div>
      ))}
    </div>
  )
}

/* ───────── shell ───────── */

export default function Settings({ win, params }: AppProps) {
  const { setTitle } = useWin()
  const p = usePrefs()
  const [page, setPage] = useState<string>((params?.page as PageId) ?? 'home')
  const [q, setQ] = useState('')
  const [bt, setBt] = [p.get('bt', true), (v: boolean) => p.set('bt', v)]
  const [wifi, setWifi] = [p.get('wifi', true), (v: boolean) => p.set('wifi', v)]
  const [airplane, setAirplane] = [p.get('airplane', false), (v: boolean) => p.set('airplane', v)]
  const [autoTz, setAutoTz] = [p.get('auto-tz', true), (v: boolean) => p.set('auto-tz', v)]
  const [gameMode, setGameMode] = [p.get('game-mode', true), (v: boolean) => p.set('game-mode', v)]
  const [location, setLocation] = [p.get('location', true), (v: boolean) => p.set('location', v)]
  const [narrator, setNarrator] = [p.get('narrator', false), (v: boolean) => p.set('narrator', v)]
  const [wifiOpen, setWifiOpen] = useState(false)

  useEffect(() => {
    if (params?.page) setPage(params.page)
  }, [win.nonce])
  useEffect(() => { setTitle("Settings") }, [])

  const parent: Record<string, string> = { display: 'system', about: 'system', ...Object.fromEntries(Object.entries(SUB).map(([id, s]) => [id, s.parent])) }
  const go = (pg: string) => setPage(pg)
  const chain: string[] = []
  for (let x: string | undefined = page; x; x = parent[x]) chain.unshift(x)
  const navActive = chain[0] ?? page

  const wifiOn = wifi && !airplane
  const btOn = bt && !airplane

  let body: React.ReactNode
  if (SUB[page]) body = <SubPage key={page} id={page} go={go} />
  else
    switch (page) {
      case 'home': body = <HomePage go={go} />; break
      case 'system': body = <SystemPage go={go} />; break
      case 'display': body = <DisplayPage go={go} />; break
      case 'personalization': body = <PersonalizationPage go={go} />; break
      case 'accounts': body = <AccountsPage go={go} />; break
      case 'update': body = <UpdatePage go={go} />; break
      case 'about': body = <AboutPage />; break
      case 'bluetooth':
        body = (
          <>
            <Card icon={Bluetooth20Filled} title="Bluetooth" sub={airplane ? 'Airplane mode is on' : `Discoverable as “${p.get('device-name', 'NW-LT-0142')}”`} right={<Toggle on={btOn} onChange={(v) => { if (airplane && v) setAirplane(false); setBt(v) }} label="Bluetooth" />} />
            <Section t="Devices" />
            <BluetoothDevice icon={Headphones20Regular} name="Surface Headphones 2+" kind="audio" />
            <BluetoothDevice icon={Mouse20Regular} name="Surface Arc Mouse" kind="mouse" />
            <BluetoothDevice icon={Keyboard20Regular} name="Logitech MX Keys" kind="paired" />
            <Section t="Device settings" />
            <ListPage go={go} base="bluetooth" items={[
              [Print20Regular, 'Printers & scanners', 'Preferences, troubleshoot'],
              [Phone20Regular, 'Phone Link', 'Instantly access your Android device’s photos, texts, and more'],
              [Camera20Regular, 'Cameras', 'Connected cameras, default image settings'],
              [Mouse20Regular, 'Mouse', 'Buttons, mouse pointer speed, scrolling'],
              [PlugConnected20Regular, 'USB', 'Notifications, USB battery saver'],
            ]} />
          </>
        )
        break
      case 'network':
        body = (
          <>
            <Card icon={Wifi120Filled} title="Wi-Fi" sub={wifiOn ? `${p.get('wifi-net', 'NW-Corp')} (802.1X) · Connected, secured` : airplane ? 'Airplane mode is on' : 'Not connected'} onClick={() => setWifiOpen(!wifiOpen)} agent="settings-network-wifi" right={<div className="flex items-center gap-3"><Toggle on={wifiOn} onChange={(v) => { if (airplane && v) setAirplane(false); setWifi(v) }} label="Wi-Fi" /><ChevronRight16Regular className={`text-[var(--s-sub)] transition-transform ${wifiOpen ? 'rotate-90' : ''}`} /></div>} />
            {wifiOpen && <WifiNetworks />}
            <ListPage go={go} base="network" items={[
              [Router20Regular, 'Ethernet', 'Not connected'],
              [Shield20Regular, 'VPN', `Northwind GlobalProtect · ${p.get('vpn-connected', true) && wifiOn ? 'Connected' : 'Not connected'}`],
              [Phone20Regular, 'Mobile hotspot', 'Share your internet connection'],
              [Globe20Regular, 'Airplane mode', 'Stop all wireless communication', <Toggle on={airplane} onChange={setAirplane} label="Airplane mode" />],
              [Globe20Regular, 'Proxy', 'Proxy server for Wi-Fi and Ethernet connections'],
              [Settings20Regular, 'Advanced network settings', 'View all network adapters, network reset'],
            ]} />
          </>
        )
        break
      case 'apps':
        body = <ListPage go={go} base="apps" items={[
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
        body = <ListPage go={go} base="time" items={[
          [Clock20Filled, 'Date & time', `Time zones, automatic clock settings, calendar display · ${new Date().toLocaleString('en-US', { weekday: 'long', hour: 'numeric', minute: '2-digit' })}`],
          [Globe20Regular, 'Set time zone automatically', p.get('time-zone', '(UTC-05:00) Eastern Time (US & Canada)'), <Toggle on={autoTz} onChange={setAutoTz} label="Set time zone automatically" />],
          [Translate20Regular, 'Language & region', `Windows and some apps format dates and time based on your region · ${p.get('lang-display', 'English (United States)')}`],
          [Keyboard20Regular, 'Typing', 'Spell check, autocorrect, text suggestions'],
          [Mic20Regular, 'Speech', 'Speech language, microphone setup, voices'],
        ]} />
        break
      case 'gaming':
        body = <ListPage go={go} base="gaming" items={[
          [Games20Filled, 'Game Bar', 'Controller and keyboard shortcuts'],
          [Video20Regular, 'Captures', 'Save location, recording preferences'],
          [Games20Filled, 'Game Mode', 'Optimize your PC for play', <Toggle on={gameMode} onChange={setGameMode} label="Game Mode" />],
        ]} />
        break
      case 'accessibility':
        body = <ListPage go={go} base="accessibility" items={[
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
        body = <ListPage go={go} base="privacy" items={[
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

  const crumb =
    chain.length > 1 ? (
      <>
        {chain.slice(0, -1).map((c) => (
          <span key={c} className="flex items-center">
            <button onClick={() => go(c)} className="text-[var(--s-sub)] hover:text-[var(--s-tx)]">{TITLES[c]}</button>
            <ChevronRight16Regular className="mx-2 text-[var(--s-sub)]" style={{ width: 20, height: 20 }} />
          </span>
        ))}
        <span>{TITLES[page]}</span>
      </>
    ) : (
      TITLES[page]
    )

  const results = useMemo(() => {
    if (!q) return [] as [string, string, any, string][]
    const ql = q.toLowerCase()
    const top = NAV.filter(([, l]) => l.toLowerCase().includes(ql)).map(([id, l, I, c]) => [id, l, I, c] as [string, string, any, string])
    const extra = [['display', 'Display'], ['about', 'About'], ...Object.entries(SUB).map(([id, s]) => [id, s.title])]
      .filter(([id, l]) => l.toLowerCase().includes(ql) && !top.some((t) => t[0] === id))
      .map(([id, l]) => [id, l, Settings20Regular, '#5A5A5A'] as [string, string, any, string])
    return [...top, ...extra].slice(0, 9)
  }, [q])

  const dark = p.get<string>('mode', 'light') === 'dark'
  const acc = ACCENTS[p.get('accent', 0)] ?? ACCENTS[0]
  const vars = { ...(dark ? PALETTE.dark : PALETTE.light), '--s-acc': dark ? acc[2] : acc[1] } as React.CSSProperties

  return (
    <div className="flex-1 min-h-0 flex bg-[var(--s-bg)] text-[var(--s-tx)] relative" style={{ fontFamily: 'var(--font-win)', ...vars }}>
      <div className="w-[300px] shrink-0 flex flex-col px-3 pt-2 overflow-y-auto">
        <div className="flex items-center gap-3 px-2 py-3 rounded-[6px] hover:bg-[var(--s-hov)] cursor-default" onClick={() => go('accounts-your-info')}>
          <Avatar id={ME.id} size={64} />
          <div className="min-w-0">
            <div className="text-[14px] font-semibold">{ME.name}</div>
            <div className="text-[12px] text-[var(--s-sub)] truncate">{ME.email}</div>
          </div>
        </div>
        <div className="relative mx-1 my-2">
          <input
            data-agent="settings-search"
            aria-label="Find a setting"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && results[0]) {
                go(results[0][0])
                setQ('')
              } else if (e.key === 'Escape') setQ('')
            }}
            placeholder="Find a setting"
            className="w-full h-8 pl-3 pr-8 rounded-[4px] bg-[var(--s-in)] text-[var(--s-tx)] border border-[var(--s-inbd)] border-b-[#868686] outline-none focus:border-b-[var(--s-acc)] focus:border-b-2"
            style={{ fontSize: 14 }}
          />
          <Search16Regular className="absolute right-2.5 top-2 text-[var(--s-sub)]" />
          {results.length > 0 && (
            <div className="absolute z-20 left-0 right-0 top-9 bg-[var(--s-menu)] border border-black/10 rounded-lg shadow-lg py-1">
              {results.map(([id, l, I, c]) => (
                <button key={id} data-agent={`settings-result-${id}`} onClick={() => { go(id); setQ('') }} className="w-full h-9 px-3 flex items-center gap-3 text-[14px] hover:bg-[var(--s-hov)] text-left">
                  <I style={{ color: c }} /> <span className="truncate">{l}</span>
                </button>
              ))}
            </div>
          )}
          {q && results.length === 0 && (
            <div className="absolute z-20 left-0 right-0 top-9 bg-[var(--s-menu)] border border-black/10 rounded-lg shadow-lg px-3 py-2 text-[13px] text-[var(--s-sub)]">No results found</div>
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
                className={`relative w-full h-9 flex items-center gap-4 px-3 rounded-[4px] text-[14px] text-left ${on ? 'bg-[var(--s-act)]' : 'hover:bg-[var(--s-hov)]'}`}
              >
                {on && <span className="absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-full bg-[var(--s-acc)]" />}
                <I style={{ color: c }} />
                {l}
              </button>
            )
          })}
        </div>
      </div>
      <div className="flex-1 min-w-0 overflow-y-auto pr-8 pl-4 pt-3 pb-10" data-agent="settings-content">
        <div className="max-w-[1000px]">
          <h1 className="text-[28px] font-semibold flex items-center flex-wrap mb-6 mt-2" data-agent="settings-page-title">{crumb}</h1>
          {body}
        </div>
      </div>
    </div>
  )
}
