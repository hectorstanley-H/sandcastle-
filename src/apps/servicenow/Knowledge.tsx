import { useEffect, useState, type ReactNode } from 'react'
import { Search, BookOpen, ThumbsUp, ThumbsDown, ChevronRight, Eye, Link2 } from 'lucide-react'
import { db, useCollection, useRecord } from '@/db/db'
import { fmtSN, useFlash, copyText, btnCls } from './shared'

export type KbArticle = { id: string; number: string; title: string; kb: string; category: string; body: string; author: string; updated: string; views: number; helpful: number; notHelpful: number; state: string; votes?: Record<string, 'up' | 'down'> }

/** tiny renderer for the article markup (## headings, numbered/bullet lists, **bold**, `code`) */
function inline(t: string): ReactNode[] {
  return t.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((p, i) => (p.startsWith('**') ? <b key={i}>{p.slice(2, -2)}</b> : p.startsWith('`') ? <code key={i} className="px-1 rounded bg-[#EDEFF2] text-[13px]">{p.slice(1, -1)}</code> : p))
}
export function ArticleBody({ body }: { body: string }) {
  const out: ReactNode[] = []
  const lines = body.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]
    if (/^(\d+\.|-) /.test(l)) {
      const ordered = /^\d+\. /.test(l)
      const items: string[] = []
      while (i < lines.length && (ordered ? /^\d+\. /.test(lines[i]) : /^- /.test(lines[i]))) items.push(lines[i++].replace(/^(\d+\.|-) /, ''))
      i--
      out.push(ordered ? <ol key={i} className="list-decimal pl-6 my-2 space-y-1">{items.map((x, n) => <li key={n}>{inline(x)}</li>)}</ol> : <ul key={i} className="list-disc pl-6 my-2 space-y-1">{items.map((x, n) => <li key={n}>{inline(x)}</li>)}</ul>)
    } else if (l.startsWith('## ')) out.push(<h3 key={i} className="text-[17px] font-bold mt-5 mb-1">{l.slice(3)}</h3>)
    else if (l.trim()) out.push(<p key={i} className="my-2">{inline(l)}</p>)
  }
  return <div className="text-[15px] leading-[24px] text-[#2E3238]">{out}</div>
}

export function KnowledgeHome({ onOpen, initialQuery = '' }: { onOpen: (id: string) => void; initialQuery?: string }) {
  const kb = useCollection<KbArticle>('servicenow.kb')
  const [q, setQ] = useState(initialQuery)
  const [cat, setCat] = useState('')
  const [base, setBase] = useState('')
  const cats = Array.from(new Set(kb.map((a) => a.category))).sort()
  const bases = Array.from(new Set(kb.map((a) => a.kb)))
  const hits = kb.filter((a) => (!q || (a.title + ' ' + a.body + ' ' + a.number).toLowerCase().includes(q.toLowerCase())) && (!cat || a.category === cat) && (!base || a.kb === base))
  return (
    <div className="flex-1 min-h-0 overflow-auto bg-[#F6F7F8]" data-agent="sn-kb-home">
      <div className="bg-[#032D42] px-8 py-8 text-white">
        <div className="text-[13px] opacity-80 mb-1">Knowledge</div>
        <h1 className="text-[26px] font-bold mb-4">How can we help?</h1>
        <div className="relative max-w-[640px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5B616B]" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} data-agent="sn-kb-search" placeholder="Search Knowledge" aria-label="Search Knowledge" className="w-full h-11 pl-9 pr-3 rounded-[6px] text-[15px] text-[#1B1D21] outline-none" />
        </div>
      </div>
      <div className="px-8 py-6 flex gap-6 max-w-[1300px]">
        <div className="w-[220px] shrink-0">
          <div className="text-[13px] font-bold text-[#5B616B] uppercase mb-2">Knowledge bases</div>
          {['', ...bases].map((b) => <button key={b || 'all'} onClick={() => setBase(b)} className={`block w-full text-left px-2 py-1 rounded text-[14px] ${base === b ? 'bg-[#E1EDFA] font-bold text-[#0B4FA6]' : 'hover:bg-[#EDEFF2]'}`}>{b || 'All'} <span className="text-[#8A9099] font-normal">({kb.filter((a) => !b || a.kb === b).length})</span></button>)}
          <div className="text-[13px] font-bold text-[#5B616B] uppercase mt-5 mb-2">Categories</div>
          {['', ...cats].map((c) => <button key={c || 'all'} onClick={() => setCat(c)} className={`block w-full text-left px-2 py-1 rounded text-[14px] ${cat === c ? 'bg-[#E1EDFA] font-bold text-[#0B4FA6]' : 'hover:bg-[#EDEFF2]'}`}>{c || 'All categories'}</button>)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[14px] text-[#5B616B] mb-3">{hits.length} article{hits.length === 1 ? '' : 's'}{q ? ` for “${q}”` : ''}</div>
          <div className="space-y-2">
            {hits.map((a) => (
              <button key={a.id} data-agent={`sn-kb-${a.id}`} onClick={() => onOpen(a.id)} className="w-full text-left bg-white rounded-[8px] border border-[#DADDE2] p-4 hover:shadow-[0_4px_14px_rgba(0,0,0,0.08)] hover:border-[#8790A1] flex gap-3">
                <BookOpen size={20} className="text-[#032D42] shrink-0 mt-0.5" />
                <span className="min-w-0">
                  <span className="block text-[15px] font-bold text-[#1F6FB2]">{a.title}</span>
                  <span className="block text-[13px] text-[#5B616B] mt-0.5 line-clamp-2">{a.body.replace(/[#*`]/g, '').replace(/\n+/g, ' ').slice(0, 180)}…</span>
                  <span className="block text-[12px] text-[#8A9099] mt-1.5">{a.number} · {a.kb} › {a.category} · {a.views.toLocaleString()} views · Updated {fmtSN(a.updated).slice(0, 10)}</span>
                </span>
              </button>
            ))}
            {!hits.length && <div className="py-16 text-center text-[#5B616B]">No articles found. Try different keywords.</div>}
          </div>
        </div>
      </div>
    </div>
  )
}

export function KnowledgeArticle({ id, onBack }: { id: string; onBack: () => void }) {
  const a = useRecord<KbArticle>('servicenow.kb', id)
  const flash = useFlash()
  useEffect(() => {
    if (a) db.update('servicenow.kb', id, (r) => ({ views: (r.views ?? 0) + 1 }))
  }, [id])
  if (!a) return <div className="flex-1 p-8 text-[#5B616B]">Article not found</div>
  const mine = a.votes?.alex
  const vote = (v: 'up' | 'down') => {
    db.update('servicenow.kb', id, (r) => {
      const prev = r.votes?.alex
      const helpful = r.helpful + (v === 'up' ? 1 : 0) - (prev === 'up' ? 1 : 0)
      const notHelpful = r.notHelpful + (v === 'down' ? 1 : 0) - (prev === 'down' ? 1 : 0)
      return { helpful, notHelpful, votes: { ...(r.votes ?? {}), alex: v } }
    })
    flash('Thanks for your feedback')
  }
  const pct = Math.round((a.helpful / Math.max(1, a.helpful + a.notHelpful)) * 100)
  return (
    <div className="flex-1 min-h-0 overflow-auto bg-[#F6F7F8]" data-agent="sn-kb-article">
      <div className="px-8 pt-5 pb-10 max-w-[1100px]">
        <div className="text-[13px] text-[#5B616B] mb-3 flex items-center gap-1"><button className="text-[#1F6FB2] hover:underline" onClick={onBack}>Knowledge</button> <ChevronRight size={13} /> <span>{a.kb}</span> <ChevronRight size={13} /> <span>{a.category}</span></div>
        <div className="bg-white rounded-[8px] border border-[#DADDE2] p-8">
          <div className="text-[13px] text-[#5B616B]">{a.number}</div>
          <h1 className="text-[24px] font-bold text-[#1B1D21] mt-1">{a.title}</h1>
          <div className="flex items-center gap-4 mt-2 text-[13px] text-[#5B616B]">
            <span>{a.author}</span><span>Updated {fmtSN(a.updated).slice(0, 10)}</span><span className="flex items-center gap-1"><Eye size={13} /> {a.views.toLocaleString()} views</span><span>{pct}% found this helpful</span>
            <div className="flex-1" />
            <button className={btnCls + ' flex items-center gap-1.5'} onClick={() => { copyText(`https://northwind.service-now.com/kb_view.do?sysparm_article=${a.number}`); flash('Permalink copied to clipboard') }}><Link2 size={14} /> Copy permalink</button>
          </div>
          <div className="h-px bg-[#DADDE2] my-5" />
          <ArticleBody body={a.body} />
          <div className="h-px bg-[#DADDE2] my-6" />
          <div className="flex items-center gap-3 text-[14px]">
            <span className="font-bold">Was this article helpful?</span>
            <button aria-pressed={mine === 'up'} onClick={() => vote('up')} className={`h-8 px-3 rounded-[4px] border flex items-center gap-1.5 ${mine === 'up' ? 'bg-[#E1EDFA] border-[#0C66E4] text-[#0B4FA6]' : 'border-[#8790A1] hover:bg-[#F1F3F5]'}`}><ThumbsUp size={14} /> Yes ({a.helpful})</button>
            <button aria-pressed={mine === 'down'} onClick={() => vote('down')} className={`h-8 px-3 rounded-[4px] border flex items-center gap-1.5 ${mine === 'down' ? 'bg-[#FBE9E9] border-[#C9302C] text-[#A52A2A]' : 'border-[#8790A1] hover:bg-[#F1F3F5]'}`}><ThumbsDown size={14} /> No ({a.notHelpful})</button>
          </div>
        </div>
      </div>
    </div>
  )
}
