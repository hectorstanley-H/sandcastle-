/**
 * Windows 11 shell icons (folders, special folders, file types, drives) drawn as inline SVG.
 * Exported for reuse by other system apps (Acrobat home, Notepad, Edge downloads…).
 */
import { useId } from 'react'
import { logoUrl } from '@/os/registry'

type P = { size?: number; className?: string }

export function FolderIcon({ size = 20, className = '', zip }: P & { zip?: boolean }) {
  const id = useId().replace(/:/g, '')
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} aria-hidden>
      <defs>
        <linearGradient id={`fb${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F5B62E" />
          <stop offset="1" stopColor="#E29E17" />
        </linearGradient>
        <linearGradient id={`ff${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFE38A" />
          <stop offset="1" stopColor="#FFC93E" />
        </linearGradient>
      </defs>
      <path d="M3 11.5A3.5 3.5 0 0 1 6.5 8h11.1c.9 0 1.8.4 2.5 1l3 2.9H41.5A3.5 3.5 0 0 1 45 15.4V37a3.5 3.5 0 0 1-3.5 3.5h-35A3.5 3.5 0 0 1 3 37z" fill={`url(#fb${id})`} />
      <path d="M3 18.5A3.5 3.5 0 0 1 6.5 15h35a3.5 3.5 0 0 1 3.5 3.5V37a3.5 3.5 0 0 1-3.5 3.5h-35A3.5 3.5 0 0 1 3 37z" fill={`url(#ff${id})`} />
      {zip && (
        <g>
          <rect x="21" y="15" width="6" height="25.5" fill="#7A5A1E" opacity=".9" />
          {[17, 21, 25, 29].map((y) => (
            <rect key={y} x={y % 8 === 1 ? 21 : 24} y={y} width="3" height="2" fill="#F4D58D" />
          ))}
          <rect x="20.5" y="31" width="7" height="6" rx="1" fill="#C8C8C8" stroke="#7A7A7A" strokeWidth=".8" />
        </g>
      )}
    </svg>
  )
}

/* ─── special / known folders ─── */

export function DesktopIcon({ size = 20, className = '' }: P) {
  const id = useId().replace(/:/g, '')
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} aria-hidden>
      <defs>
        <linearGradient id={`d${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4FC3F7" />
          <stop offset="1" stopColor="#0A6ED1" />
        </linearGradient>
      </defs>
      <rect x="4" y="8" width="40" height="28" rx="3.5" fill={`url(#d${id})`} />
      <path d="M4 30c8-6 14-2 20-6s12-6 20-2v10.5a3.5 3.5 0 0 1-3.5 3.5h-33A3.5 3.5 0 0 1 4 32.5z" fill="#fff" opacity=".22" />
      <rect x="16" y="38" width="16" height="3" rx="1.5" fill="#6B7A8C" />
    </svg>
  )
}

export function DownloadsIcon({ size = 20, className = '' }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} aria-hidden>
      <circle cx="24" cy="24" r="19" fill="#17A34A" />
      <circle cx="24" cy="24" r="19" fill="url(#none)" />
      <path d="M24 13v18M16.5 24l7.5 7.5 7.5-7.5" stroke="#fff" strokeWidth="3.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function DocumentsIcon({ size = 20, className = '' }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} aria-hidden>
      <path d="M11 4h18l10 10v28a2 2 0 0 1-2 2H11a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" fill="#6E8FB8" />
      <path d="M29 4v8a2 2 0 0 0 2 2h8z" fill="#A9C2E2" />
      <path d="M15 22h18M15 28h18M15 34h12" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  )
}

export function PicturesIcon({ size = 20, className = '' }: P) {
  const id = useId().replace(/:/g, '')
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} aria-hidden>
      <defs>
        <linearGradient id={`p${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#58B7F5" />
          <stop offset="1" stopColor="#1B7BD6" />
        </linearGradient>
      </defs>
      <rect x="4" y="7" width="40" height="34" rx="4" fill={`url(#p${id})`} />
      <circle cx="33" cy="17" r="4" fill="#FFE36E" />
      <path d="M4 34l11-12 9 9 6-6 14 13v-1a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z" fill="#E8F4FF" />
    </svg>
  )
}

export function MusicIcon({ size = 20, className = '' }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} aria-hidden>
      <rect x="4" y="4" width="40" height="40" rx="9" fill="#F7630C" />
      <path d="M20 33V14l14-3v18" stroke="#fff" strokeWidth="2.8" fill="none" strokeLinejoin="round" />
      <ellipse cx="16.5" cy="33" rx="4.5" ry="3.8" fill="#fff" />
      <ellipse cx="30.5" cy="29" rx="4.5" ry="3.8" fill="#fff" />
    </svg>
  )
}

export function VideosIcon({ size = 20, className = '' }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} aria-hidden>
      <rect x="4" y="8" width="40" height="32" rx="4" fill="#8B44E6" />
      <path d="M4 15h40M4 33h40" stroke="#B98AF5" strokeWidth="1.5" />
      {[9, 17, 25, 33, 39].map((x) => (
        <g key={x}>
          <rect x={x - 1.5} y="10" width="3" height="3" rx=".6" fill="#D6BEFA" />
          <rect x={x - 1.5} y="35" width="3" height="3" rx=".6" fill="#D6BEFA" />
        </g>
      ))}
      <path d="M21 19.5v9l7.5-4.5z" fill="#fff" />
    </svg>
  )
}

export function HomeIcon({ size = 20, className = '' }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} aria-hidden>
      <path d="M24 6L5 21.5h5V41h28V21.5h5z" fill="#F7B53B" />
      <path d="M10 21.5L24 10l14 11.5V41H10z" fill="#FFD56B" />
      <rect x="19.5" y="28" width="9" height="13" rx="1" fill="#2C7BD6" />
      <path d="M3.5 22.5L24 5.5l20.5 17" stroke="#D9841C" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function GalleryIcon({ size = 20, className = '' }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} aria-hidden>
      <rect x="12" y="5" width="32" height="27" rx="3.5" fill="#9AD0F5" />
      <rect x="4" y="13" width="34" height="29" rx="4" fill="#1E88E5" />
      <circle cx="28" cy="21" r="3.5" fill="#FFE36E" />
      <path d="M4 36l9-10 8 8 5-5 12 11v-.5a2.5 2.5 0 0 1-2.5 2.5H7a3 3 0 0 1-3-3z" fill="#E3F2FD" />
    </svg>
  )
}

export function CloudIcon({ size = 20, className = '' }: P) {
  return <img src={logoUrl('onedrive')} width={size} height={size} className={`object-contain ${className}`} alt="" draggable={false} />
}

export function ThisPCIcon({ size = 20, className = '' }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} aria-hidden>
      <rect x="4" y="7" width="40" height="27" rx="3" fill="#2B2B2B" />
      <rect x="6.5" y="9.5" width="35" height="22" rx="1.5" fill="#3AA0F3" />
      <path d="M6.5 26c8-5 14-1 19-4.5s10-4 16-1.5V30a1.5 1.5 0 0 1-1.5 1.5H8A1.5 1.5 0 0 1 6.5 30z" fill="#fff" opacity=".25" />
      <path d="M18 34h12l2 6H16z" fill="#7B7B7B" />
      <rect x="13" y="39.5" width="22" height="2.5" rx="1.25" fill="#5B5B5B" />
    </svg>
  )
}

export function NetworkIcon({ size = 20, className = '' }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} aria-hidden>
      <rect x="6" y="5" width="36" height="22" rx="3" fill="#2B2B2B" />
      <rect x="8.5" y="7.5" width="31" height="17" rx="1.5" fill="#3AA0F3" />
      <path d="M24 27v7M10 40h28M24 34v6" stroke="#5E6B7A" strokeWidth="3" strokeLinecap="round" />
      <rect x="19" y="34" width="10" height="8" rx="1.5" fill="#1F8A4C" />
    </svg>
  )
}

export function RecycleIcon({ size = 20, className = '' }: P) {
  return <img src={logoUrl('recyclebin')} width={size} height={size} className={`object-contain ${className}`} alt="" draggable={false} />
}

export function DriveIcon({ size = 20, className = '', network, windows = true }: P & { network?: boolean; windows?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} aria-hidden>
      <path d="M6 28l4-14a3 3 0 0 1 2.9-2.2h22.2A3 3 0 0 1 38 14l4 14z" fill="#C9CDD2" />
      <rect x="6" y="27" width="36" height="12" rx="2.5" fill="#8C939B" />
      <rect x="9" y="31" width="20" height="2" rx="1" fill="#5D646C" />
      <circle cx="37" cy="33" r="1.6" fill={network ? '#3CC870' : '#3CC870'} />
      {windows && !network && (
        <g transform="translate(17 14.5) scale(.55)">
          <rect width="11" height="11" fill="#0078D4" />
          <rect x="12" width="11" height="11" fill="#0078D4" />
          <rect y="12" width="11" height="11" fill="#0078D4" />
          <rect x="12" y="12" width="11" height="11" fill="#0078D4" />
        </g>
      )}
      {network && <path d="M18 22h12M24 16v6" stroke="#4B5563" strokeWidth="2.2" strokeLinecap="round" />}
    </svg>
  )
}

/* ─── file types ─── */

export function extOf(name: string) {
  const m = /\.([a-z0-9]+)$/i.exec(name)
  return m ? m[1].toLowerCase() : ''
}

export function typeName(name: string, isFolder = false) {
  if (isFolder) return 'File folder'
  const e = extOf(name)
  const map: Record<string, string> = {
    pdf: 'Adobe Acrobat Document',
    docx: 'Microsoft Word Document',
    doc: 'Microsoft Word 97-2003 Document',
    xlsx: 'Microsoft Excel Worksheet',
    pptx: 'Microsoft PowerPoint Presentation',
    csv: 'Microsoft Excel Comma Separated Values File',
    zip: 'Compressed (zipped) Folder',
    jpg: 'JPG File',
    jpeg: 'JPEG File',
    png: 'PNG File',
    txt: 'Text Document',
    msi: 'Windows Installer Package',
    exe: 'Application',
    mp4: 'MP4 File',
    mp3: 'MP3 File',
    m4a: 'MPEG-4 Audio',
    wav: 'WAV File',
    lnk: 'Shortcut',
    ics: 'iCalendar File',
    eml: 'Outlook Item',
  }
  return map[e] ?? (e ? `${e.toUpperCase()} File` : 'File')
}

function Page({ size, children, fold = '#D6D6D6', fill = '#fff', stroke = '#BDBDBD' }: { size: number; children?: React.ReactNode; fold?: string; fill?: string; stroke?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <path d="M10 3.5h19.5L39.5 13.5V43a1.5 1.5 0 0 1-1.5 1.5H10A1.5 1.5 0 0 1 8.5 43V5A1.5 1.5 0 0 1 10 3.5z" fill={fill} stroke={stroke} strokeWidth="1" />
      <path d="M29.5 3.5v8.5a1.5 1.5 0 0 0 1.5 1.5h8.5" fill={fold} stroke={stroke} strokeWidth="1" />
      {children}
    </svg>
  )
}

/** Explorer-style file icon by name/kind. */
export function FileTypeIcon({ name, kind, size = 20, className = '' }: { name: string; kind?: string; size?: number; className?: string }) {
  const e = extOf(name) || kind || ''
  const wrap = (node: React.ReactNode) => (
    <span className={`relative inline-flex shrink-0 ${className}`} style={{ width: size, height: size }}>
      {node}
    </span>
  )
  const office = (logo: string) =>
    wrap(
      <>
        <Page size={size} />
        <img src={logoUrl(logo)} className="absolute object-contain" style={{ width: size * 0.62, height: size * 0.62, left: size * 0.02, bottom: size * 0.04 }} alt="" draggable={false} />
      </>,
    )
  if (e === 'docx' || e === 'doc') return office('word')
  if (e === 'xlsx' || e === 'csv') return office('excel')
  if (e === 'pptx') return office('powerpoint')
  if (e === 'pdf')
    return wrap(
      <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
        <path d="M10 3.5h19.5L39.5 13.5V43a1.5 1.5 0 0 1-1.5 1.5H10A1.5 1.5 0 0 1 8.5 43V5A1.5 1.5 0 0 1 10 3.5z" fill="#fff" stroke="#BDBDBD" />
        <path d="M29.5 3.5v8.5a1.5 1.5 0 0 0 1.5 1.5h8.5" fill="#E6E6E6" stroke="#BDBDBD" />
        <rect x="4" y="22" width="26" height="19" rx="3" fill="#B30B00" />
        <path
          d="M10.2 36.6c1.6-1.1 3.6-4.6 4.9-8.4.6-1.8.3-3-.4-3-.8 0-1.1 1.2-.8 3 .5 3.1 3.6 6.4 6.6 7.4 1.6.5 2.6.1 2.6-.6 0-.9-1.6-1.2-4-1-2.6.2-6 1.2-8.2 2.4-1.6.9-1.7 1.9-.7 2z"
          fill="none"
          stroke="#fff"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
      </svg>,
    )
  if (e === 'zip') return wrap(<FolderIcon size={size} zip />)
  if (e === 'txt' || e === 'log' || e === 'ini')
    return wrap(
      <Page size={size}>
        <path d="M14 20h20M14 25h20M14 30h20M14 35h13" stroke="#8A8A8A" strokeWidth="1.8" strokeLinecap="round" />
      </Page>,
    )
  if (['jpg', 'jpeg', 'png', 'img', 'gif', 'heic'].includes(e))
    return wrap(
      <Page size={size}>
        <rect x="12" y="18" width="24" height="19" rx="2" fill="#2B88D8" />
        <circle cx="30" cy="23" r="2.3" fill="#FFE36E" />
        <path d="M12 33l7-7 5 5 3.5-3 8.5 7.5V35a2 2 0 0 1-2 2H14a2 2 0 0 1-2-2z" fill="#DDEFFF" />
      </Page>,
    )
  if (['mp4', 'mov', 'avi', 'wmv'].includes(e))
    return wrap(
      <Page size={size}>
        <rect x="12" y="19" width="24" height="17" rx="2.5" fill="#8B44E6" />
        <path d="M21.5 23.5v8l6.5-4z" fill="#fff" />
      </Page>,
    )
  if (['mp3', 'm4a', 'wav', 'wma'].includes(e))
    return wrap(
      <Page size={size}>
        <path d="M21 35V22l10-2v12" stroke="#F7630C" strokeWidth="2.4" fill="none" strokeLinejoin="round" />
        <ellipse cx="18.5" cy="35" rx="3.2" ry="2.6" fill="#F7630C" />
        <ellipse cx="28.5" cy="32" rx="3.2" ry="2.6" fill="#F7630C" />
      </Page>,
    )
  if (e === 'msi' || e === 'exe')
    return wrap(
      <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
        <rect x="5" y="8" width="38" height="32" rx="3" fill="#fff" stroke="#9E9E9E" />
        <rect x="5" y="8" width="38" height="7" rx="3" fill="#0067C0" />
        <rect x="5" y="12" width="38" height="3" fill="#0067C0" />
        {e === 'msi' ? (
          <g>
            <rect x="15" y="20" width="18" height="15" rx="1.5" fill="#D8A24A" />
            <rect x="15" y="20" width="18" height="4" fill="#B98436" />
            <path d="M24 26v6M21 29.5l3 3 3-3" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          </g>
        ) : (
          <g>
            <rect x="14" y="21" width="20" height="13" rx="1.5" fill="#E8F1FB" stroke="#0067C0" strokeWidth="1.2" />
          </g>
        )}
      </svg>,
    )
  if (e === 'ics')
    return wrap(
      <Page size={size}>
        <rect x="13" y="19" width="22" height="18" rx="2" fill="#fff" stroke="#0F6CBD" strokeWidth="1.5" />
        <rect x="13" y="19" width="22" height="5" fill="#0F6CBD" />
      </Page>,
    )
  return wrap(<Page size={size} />)
}

/** icon for a known root folder path (Desktop, Downloads…), falling back to a yellow folder */
export function KnownFolderIcon({ path, size = 20, className = '' }: { path: string; size?: number; className?: string }) {
  switch (path) {
    case 'home':
      return <HomeIcon size={size} className={className} />
    case 'gallery':
      return <GalleryIcon size={size} className={className} />
    case 'OneDrive':
      return <CloudIcon size={size} className={className} />
    case 'Desktop':
      return <DesktopIcon size={size} className={className} />
    case 'Downloads':
      return <DownloadsIcon size={size} className={className} />
    case 'Documents':
      return <DocumentsIcon size={size} className={className} />
    case 'Pictures':
      return <PicturesIcon size={size} className={className} />
    case 'Music':
      return <MusicIcon size={size} className={className} />
    case 'Videos':
      return <VideosIcon size={size} className={className} />
    case 'thispc':
      return <ThisPCIcon size={size} className={className} />
    case 'network':
      return <NetworkIcon size={size} className={className} />
    case 'recycle':
      return <RecycleIcon size={size} className={className} />
    case 'C:':
      return <DriveIcon size={size} className={className} />
    default:
      return <FolderIcon size={size} className={className} />
  }
}
