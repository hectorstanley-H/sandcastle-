import { useState } from 'react'
import { Dismiss12Regular } from '@fluentui/react-icons'
import { PEOPLE, personByEmail } from '@/data/people'
import { Avatar } from '@/components/Avatar'

/** Outlook-style recipient "well": chips + autocomplete. Enter, comma, ; or blur commits. */
export function RecipientInput({
  value,
  onChange,
  agent,
  placeholder,
}: {
  value: string[]
  onChange: (v: string[]) => void
  agent: string
  placeholder?: string
}) {
  const [text, setText] = useState('')
  const [focus, setFocus] = useState(false)
  const q = text.trim().toLowerCase()
  const suggestions = q.length >= 2 ? PEOPLE.filter((p) => (p.name + ' ' + p.email).toLowerCase().includes(q) && !value.includes(p.email)).slice(0, 5) : []

  const commit = (raw?: string) => {
    const parts = (raw ?? text)
      .split(/[;,]/)
      .map((s) => s.trim())
      .filter(Boolean)
    if (!parts.length) return
    const resolved = parts.map((p) => {
      if (p.includes('@')) return p
      const hit = PEOPLE.find((x) => x.name.toLowerCase() === p.toLowerCase() || x.first.toLowerCase() === p.toLowerCase())
      return hit?.email ?? p
    })
    onChange([...value, ...resolved.filter((r) => !value.includes(r))])
    setText('')
  }

  return (
    <div className="relative flex-1 flex flex-wrap items-center gap-1 min-h-[30px] py-0.5">
      {value.map((e) => {
        const p = personByEmail(e)
        return (
          <span key={e} className="inline-flex items-center gap-1 h-6 pl-0.5 pr-1 rounded-full bg-[#EBF3FC] text-[12.5px] text-[#0F6CBD]">
            <Avatar email={e} name={p?.name ?? e} size={20} />
            <span className="px-0.5">{p?.name ?? e}</span>
            <button className="w-4 h-4 rounded-full hover:bg-black/10 flex items-center justify-center text-[#424242]" onClick={() => onChange(value.filter((x) => x !== e))}>
              <Dismiss12Regular />
            </button>
          </span>
        )
      })}
      <input
        data-agent={agent}
        aria-label={placeholder ?? 'Recipients'}
        value={text}
        onFocus={() => setFocus(true)}
        onBlur={() => {
          setTimeout(() => setFocus(false), 150)
          commit()
        }}
        onChange={(e) => {
          const v = e.target.value
          if (/[;,]$/.test(v)) commit(v)
          else setText(v)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === 'Tab') {
            if (text.trim()) {
              e.preventDefault()
              if (suggestions[0] && !text.includes('@')) {
                onChange([...value, suggestions[0].email])
                setText('')
              } else commit()
            }
          }
          if (e.key === 'Backspace' && !text && value.length) onChange(value.slice(0, -1))
        }}
        className="flex-1 min-w-[120px] h-6 outline-none text-[13px] bg-transparent"
      />
      {focus && suggestions.length > 0 && (
        <div className="absolute left-0 top-full mt-1 z-50 w-[340px] bg-white rounded-md shadow-[0_8px_24px_rgba(0,0,0,0.18)] border border-black/5 py-1">
          <div className="px-3 py-1 text-[11px] text-[#616161]">Suggested contacts</div>
          {suggestions.map((p) => (
            <button
              key={p.id}
              data-agent={`${agent}-suggest-${p.id}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange([...value, p.email])
                setText('')
              }}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-[#F5F5F5] text-left"
            >
              <Avatar id={p.id} size={28} />
              <div className="min-w-0">
                <div className="text-[13px] truncate">{p.name}</div>
                <div className="text-[11.5px] text-[#616161] truncate">{p.email}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
