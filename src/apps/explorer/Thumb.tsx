/** Deterministic pseudo-photo thumbnails for image files (Gallery + large icon views). */
function hash(s: string) {
  let h = 0
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return h
}

export function Thumb({ name, className = '' }: { name: string; className?: string }) {
  const h = hash(name)
  const n = name.toLowerCase()
  if (n.startsWith('screenshot') || n.includes('screen')) {
    const accent = ['#0F6CBD', '#107C41', '#C239B3', '#CA5010'][h % 4]
    return (
      <svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice" className={className}>
        <rect width="160" height="100" fill="#DCE6F2" />
        <rect x="10" y="8" width="140" height="84" rx="3" fill="#fff" />
        <rect x="10" y="8" width="140" height="10" rx="3" fill={accent} />
        <rect x="10" y="18" width="30" height="74" fill="#F3F3F3" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <rect key={i} x="46" y={24 + i * 10} width={60 + ((h >> i) % 40)} height="4" rx="2" fill="#D0D7E2" />
        ))}
        <rect x="112" y="24" width="32" height="26" rx="2" fill={accent} opacity=".25" />
      </svg>
    )
  }
  if (n.includes('floor plan')) {
    return (
      <svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice" className={className}>
        <rect width="160" height="100" fill="#F7F9FC" />
        <g stroke="#1F4E79" strokeWidth="1.6" fill="none">
          <rect x="12" y="10" width="136" height="80" />
          <path d="M60 10v45M60 70v20M100 10v30M100 55v35M12 50h30M60 50h40M120 40h28" />
        </g>
        <g fill="#9DC3E6">
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={18 + i * 9} y="62" width="6" height="22" />
          ))}
        </g>
        <text x="72" y="32" fontSize="7" fill="#1F4E79" fontFamily="Segoe UI">DOCK 3</text>
      </svg>
    )
  }
  if (n.includes('whiteboard')) {
    return (
      <svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice" className={className}>
        <rect width="160" height="100" fill="#B7A58E" />
        <rect x="14" y="10" width="132" height="74" fill="#F8F8F6" stroke="#9A9A9A" />
        <path d="M24 28h40M24 38h56M24 48h32" stroke="#1E5AA8" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M96 26l22 0 0 22-22 0z M100 60l30-14" stroke="#C0392B" strokeWidth="2" fill="none" />
        <circle cx="120" cy="66" r="7" stroke="#2E7D32" strokeWidth="2" fill="none" />
        <rect x="14" y="84" width="132" height="4" fill="#8D8D8D" />
      </svg>
    )
  }
  // landscape / people photo
  const skies = [
    ['#7FB8E8', '#D7ECFA'],
    ['#F6A96B', '#FBD9A6'],
    ['#5E8FC9', '#B8D5F0'],
    ['#9CC4E4', '#EAF3FB'],
    ['#E58D6A', '#F6C8A2'],
  ][h % 5]
  const ground = ['#4E7D3A', '#2F5F8A', '#7A6A4F', '#3E6E58', '#C9B27C'][(h >> 3) % 5]
  const sea = n.includes('cape') || (h >> 5) % 3 === 0
  return (
    <svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice" className={className}>
      <defs>
        <linearGradient id={`sky${h}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={skies[0]} />
          <stop offset="1" stopColor={skies[1]} />
        </linearGradient>
      </defs>
      <rect width="160" height="100" fill={`url(#sky${h})`} />
      <circle cx={30 + (h % 90)} cy={22 + (h % 12)} r="9" fill="#FFF3C4" opacity=".9" />
      {sea ? (
        <>
          <rect y="58" width="160" height="42" fill="#3D7EB5" />
          <path d="M0 62q20-4 40 0t40 0 40 0 40 0" stroke="#8FC1E8" strokeWidth="1.5" fill="none" />
          <path d="M0 80q30-10 80-6t80 8v18H0z" fill="#E7D3A8" />
        </>
      ) : (
        <>
          <path d={`M0 66 Q40 ${40 + (h % 14)} 80 60 T160 ${52 + (h % 10)} V100 H0z`} fill={ground} opacity=".75" />
          <path d={`M0 78 Q50 ${62 + (h % 9)} 100 74 T160 70 V100 H0z`} fill={ground} />
        </>
      )}
      {(h >> 2) % 2 === 0 &&
        [0, 1, 2].map((i) => (
          <g key={i} transform={`translate(${52 + i * 18} ${60 + (i % 2) * 2})`}>
            <circle cx="0" cy="0" r="4.2" fill="#F1C7A3" />
            <path d="M-6 22v-10a6 6 0 0 1 12 0v10z" fill={['#1F4E79', '#C0392B', '#2E7D32'][i]} />
          </g>
        ))}
    </svg>
  )
}
