import { useState, type ReactNode } from 'react'
import { BookOpen, ChevronLeft, Eye, Plus, Search, ThumbsUp, Trash2 } from 'lucide-react'
import { db, uid, useCollection } from '@/db/db'
import { useDesk } from '@/os/context'
import { ME, person } from '@/data/people'
import { Avatar } from '@/components/Avatar'
import { Field, HBtn, HLink, HWTag, Modal, Pill, hsDate, inputH, selectH, useHNav } from './ui'
import { OWNER_IDS } from './owners'

const th = 'text-left text-[12px] font-semibold uppercase tracking-wide px-3 h-10 border-b border-[#DFE3EB] bg-[#F5F8FA] whitespace-nowrap'
const td = 'px-3 h-12 border-b border-[#DFE3EB] text-[13.5px] whitespace-nowrap'

const statusStyle: Record<string, [string, string]> = { Published: ['#E5F8F6', '#00826F'], Draft: ['#EAF0F6', '#516F90'] }

function PageTitle({ title, right, sub }: { title: string; right?: ReactNode; sub?: string }) {
  return (
    <div className="bg-white border-b border-[#DFE3EB] px-6 pt-5 pb-4 flex items-center gap-3">
      <div className="flex-1">
        <h1 className="text-[22px] font-medium">{title}</h1>
        {sub && <div className="text-[13px] text-[#516F90] mt-0.5">{sub}</div>}
      </div>
      {right}
    </div>
  )
}

const categoriesOf = (kb: any[]) => Array.from(new Set(kb.map((a) => a.category).filter(Boolean))).sort()

/* ───────────────────────── index ───────────────────────── */

export function KbIndex() {
  const { go } = useHNav()
  const kb = useCollection<any>('hubspot.kb')
  const [status, setStatus] = useState<'All' | 'Published' | 'Draft'>('All')
  const [category, setCategory] = useState('')
  const [q, setQ] = useState('')
  const cats = categoriesOf(kb)
  const published = kb.filter((a) => a.status === 'Published')
  const totalViews = kb.reduce((s, a) => s + (Number(a.views) || 0), 0)
  const rated = published.filter((a) => (Number(a.views) || 0) > 0)
  const avgHelpful = rated.length ? Math.round(rated.reduce((s, a) => s + (Number(a.helpful) || 0), 0) / rated.length) : 0
  const rows = kb
    .filter((a) => (status === 'All' || a.status === status) && (!category || a.category === category) && (!q || `${a.title} ${a.body}`.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))
  const count = (s: string) => (s === 'All' ? kb.length : kb.filter((a) => a.status === s).length)

  return (
    <div className="min-h-full bg-white">
      <PageTitle
        title="Knowledge base"
        sub="help.northwind.com · Customer help centre"
        right={<HBtn variant="primary" small agent="hs-kb-create" label="Create article" onClick={() => go({ page: 'kb-article', id: 'new' })}><Plus size={14} /> Create article</HBtn>}
      />
      <div className="grid grid-cols-3 border-b border-[#DFE3EB] bg-[#F5F8FA]">
        {[
          { label: 'Published articles', value: published.length.toLocaleString(), icon: BookOpen },
          { label: 'Total views', value: totalViews.toLocaleString(), icon: Eye },
          { label: 'Avg. helpfulness', value: rated.length ? `${avgHelpful}%` : '--', icon: ThumbsUp },
        ].map((k, i) => (
          <div key={k.label} className={`px-6 py-4 ${i ? 'border-l border-[#DFE3EB]' : ''}`} data-agent={`hs-kb-kpi-${i}`}>
            <div className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-[#516F90]"><k.icon size={13} /> {k.label}</div>
            <div className="text-[26px] font-light mt-1">{k.value}</div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4 px-6 border-b border-[#DFE3EB]" role="tablist">
        {(['All', 'Published', 'Draft'] as const).map((s) => (
          <button key={s} role="tab" aria-selected={status === s} data-agent={`hs-kb-tab-${s.toLowerCase()}`} onClick={() => setStatus(s)} className={`h-11 text-[14px] ${status === s ? 'font-semibold border-b-[3px] border-[#33475B]' : 'text-[#516F90] border-b-[3px] border-transparent'}`}>
            {s} <span className="text-[12px] text-[#516F90] font-normal">({count(s)})</span>
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 px-6 py-3">
        <div className="flex items-center h-8 w-[280px] border border-[#CBD6E2] rounded-[3px] px-2 gap-1.5">
          <input data-agent="hs-kb-search" aria-label="Search articles" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search articles" className="flex-1 outline-none text-[13px]" />
          <Search size={14} className="text-[#7C98B6]" />
        </div>
        <select data-agent="hs-kb-category-filter" aria-label="Filter by category" value={category} onChange={(e) => setCategory(e.target.value)} className={`${selectH} h-8 text-[13px]`}>
          <option value="">All categories</option>
          {cats.map((c) => <option key={c}>{c}</option>)}
        </select>
        <span className="ml-auto text-[13px] text-[#516F90]">{rows.length} article{rows.length === 1 ? '' : 's'}</span>
      </div>
      <table className="w-full border-collapse">
        <thead><tr>{['Title', 'Category', 'Status', 'Author', 'Views', 'Helpful', 'Last updated'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.map((a) => (
            <tr key={a.id} className={`hover:bg-[#F5F8FA] ${a.updatedBy === 'hworker' ? 'flash-new' : ''}`}>
              <td className={`${td} max-w-[380px]`}>
                <span className="flex items-center gap-2 min-w-0">
                  <HLink agent={`hs-kb-row-${a.id}`} className="truncate" onClick={() => go({ page: 'kb-article', id: a.id })}>{a.title || 'Untitled article'}</HLink>
                  {a.updatedBy === 'hworker' && <HWTag />}
                </span>
              </td>
              <td className={td}>{a.category || '--'}</td>
              <td className={td}><Pill color={statusStyle[a.status]?.[0]} text={statusStyle[a.status]?.[1]}>{a.status}</Pill></td>
              <td className={td}><span className="inline-flex items-center gap-2"><Avatar id={a.authorId} size={22} />{person(a.authorId).name}</span></td>
              <td className={td}>{(Number(a.views) || 0).toLocaleString()}</td>
              <td className={td}>{a.status === 'Published' && a.views ? `${a.helpful}%` : '--'}</td>
              <td className={td}>{hsDate(a.updatedAt, true)}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={7} className="px-6 py-14 text-center text-[14px] text-[#516F90]">
              <BookOpen size={34} className="mx-auto text-[#CBD6E2] mb-2" />
              No articles match these filters.
            </td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

/* ───────────────────────── article editor ───────────────────────── */

export function KbArticle({ id }: { id: string }) {
  return <KbEditor key={id} id={id} />
}

const NEW_CAT = '__new__'

function KbEditor({ id }: { id: string }) {
  const { go, open, toast } = useHNav()
  const { isAgent } = useDesk()
  const kb = useCollection<any>('hubspot.kb')
  const isNew = id === 'new'
  const rec = isNew ? undefined : kb.find((a) => a.id === id)
  const cats = categoriesOf(kb)
  const [v, setV] = useState(() => {
    const r = isNew ? undefined : db.find<any>('hubspot.kb', id)
    return { title: r?.title ?? '', body: r?.body ?? '', category: r?.category ?? cats[0] ?? 'General', status: r?.status ?? 'Draft', authorId: r?.authorId ?? ME.id }
  })
  const [newCat, setNewCat] = useState(false)
  const set = (k: keyof typeof v, x: string) => setV((s) => ({ ...s, [k]: x }))

  if (!isNew && !rec) {
    return (
      <div className="p-8 text-[14px]">
        Article not found. <HLink onClick={() => go({ page: 'kb' })}>Back to knowledge base</HLink>
      </div>
    )
  }

  const dirty = isNew ? !!(v.title || v.body) : rec && (['title', 'body', 'category', 'status', 'authorId'] as const).some((k) => (rec[k] ?? '') !== v[k])
  const authors = Array.from(new Set([...OWNER_IDS, ...kb.map((a) => a.authorId).filter(Boolean), v.authorId]))
  const by = isAgent ? 'hworker' : undefined

  const save = (patch: Partial<typeof v> = {}, msg?: string) => {
    const next = { ...v, ...patch, title: (patch.title ?? v.title).trim(), category: (patch.category ?? v.category).trim() || 'General' }
    if (!next.title) {
      toast('Add a title before saving.')
      return
    }
    const now = new Date().toISOString()
    setV(next)
    setNewCat(false)
    if (isNew) {
      const nid = uid('kb')
      db.insert('hubspot.kb', { id: nid, ...next, views: 0, helpful: 0, updatedAt: now, createdAt: now, updatedBy: by }, { prepend: true })
      toast(msg ?? 'Article created.')
      go({ page: 'kb-article', id: nid })
    } else {
      db.update('hubspot.kb', id, { ...next, updatedAt: now, updatedBy: by })
      toast(msg ?? 'Article saved.')
    }
  }

  const togglePublish = () => (v.status === 'Published' && !isNew ?save({ status: 'Draft' }, 'Article unpublished.') : save({ status: 'Published' }, 'Article published.'))

  const confirmDelete = () =>
    open(
      <Modal
        title="Delete article?"
        agent="hs-kb-delete-modal"
        onClose={() => open(null)}
        width={460}
        footer={
          <>
            <HBtn
              variant="primary"
              small
              agent="hs-kb-delete-confirm"
              className="!bg-[#D93F4C] !border-[#D93F4C]"
              onClick={() => {
                db.remove('hubspot.kb', id)
                open(null)
                toast('Article deleted.')
                go({ page: 'kb' })
              }}
            >
              Delete article
            </HBtn>
            <HBtn variant="secondary" small onClick={() => open(null)}>Cancel</HBtn>
          </>
        }
      >
        <p>“{rec?.title}” will be removed from the knowledge base and the help centre. This can’t be undone.</p>
      </Modal>,
    )

  return (
    <div className="min-h-full bg-[#F5F8FA]">
      <div className="bg-white border-b border-[#DFE3EB] px-6 pt-4 pb-3">
        <HLink agent="hs-kb-back" onClick={() => go({ page: 'kb' })} className="text-[13px]"><span className="inline-flex items-center gap-1"><ChevronLeft size={14} /> Knowledge base</span></HLink>
        <div className="flex items-center gap-3 mt-2">
          <h1 className="text-[20px] font-medium truncate">{isNew ? 'New article' : rec?.title || 'Untitled article'}</h1>
          <Pill color={statusStyle[v.status]?.[0]} text={statusStyle[v.status]?.[1]}>{v.status}</Pill>
          {dirty && <span className="text-[12px] text-[#9B6A00]">Unsaved changes</span>}
          <div className="flex-1" />
          {!isNew && <HBtn small variant="ghost" agent="hs-kb-delete" label="Delete article" onClick={confirmDelete}><Trash2 size={14} /> Delete</HBtn>}
          <HBtn small variant="secondary" agent="hs-kb-save" label="Save article" disabled={!v.title.trim() || (!isNew && !dirty)} onClick={() => save()}>Save</HBtn>
          <HBtn small variant="primary" agent="hs-kb-publish" label={v.status === 'Published' && !isNew ? 'Unpublish article' : 'Publish article'} disabled={!v.title.trim()} onClick={togglePublish}>
            {v.status === 'Published' && !isNew ? 'Unpublish' : 'Publish'}
          </HBtn>
        </div>
      </div>

      <div className="flex gap-5 p-5 items-start">
        {/* main editor */}
        <div className="flex-1 min-w-0 bg-white border border-[#DFE3EB] rounded-[4px] p-5 space-y-4">
          <Field label="Article title">
            <input data-agent="hs-kb-title" aria-label="Article title" value={v.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. How to reset your password" className={`${inputH} w-full h-10 text-[16px]`} />
          </Field>
          <Field label="Body" hint="Plain text. Separate paragraphs with a blank line; start lines with “1.”, “2.” for numbered steps or “-” for bullets.">
            <textarea data-agent="hs-kb-body" aria-label="Article body" value={v.body} onChange={(e) => set('body', e.target.value)} rows={18} placeholder="Write the article…" className="w-full p-3 rounded-[3px] border border-[#CBD6E2] bg-[#F5F8FA] outline-none focus:bg-white focus:border-[#00A4BD] text-[14px] leading-relaxed font-mono" />
          </Field>
          <div className="text-[12px] text-[#516F90]">{v.body.trim() ? v.body.trim().split(/\s+/).length : 0} words{!isNew && rec?.updatedAt && <> · Last saved {hsDate(rec.updatedAt, true)}</>}</div>
        </div>

        {/* settings + preview */}
        <div className="w-[340px] shrink-0 space-y-4">
          <div className="bg-white border border-[#DFE3EB] rounded-[4px] p-4 space-y-3">
            <div className="text-[14px] font-semibold">Settings</div>
            <Field label="Category">
              {newCat ? (
                <div className="flex gap-2">
                  <input data-agent="hs-kb-category-new" aria-label="New category name" autoFocus value={v.category} onChange={(e) => set('category', e.target.value)} placeholder="New category name" className={`${inputH} flex-1 min-w-0`} />
                  <HBtn small variant="ghost" onClick={() => { setNewCat(false); if (!cats.includes(v.category)) set('category', rec?.category ?? cats[0] ?? 'General') }}>Cancel</HBtn>
                </div>
              ) : (
                <select data-agent="hs-kb-category" aria-label="Category" value={v.category} onChange={(e) => (e.target.value === NEW_CAT ? (setNewCat(true), set('category', '')) : set('category', e.target.value))} className={`${selectH} w-full`}>
                  {Array.from(new Set([...cats, v.category])).filter(Boolean).map((c) => <option key={c}>{c}</option>)}
                  <option value={NEW_CAT}>+ New category…</option>
                </select>
              )}
            </Field>
            <Field label="Status">
              <select data-agent="hs-kb-status" aria-label="Status" value={v.status} onChange={(e) => set('status', e.target.value)} className={`${selectH} w-full`}>
                {['Draft', 'Published'].map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Author">
              <div className="flex items-center gap-2">
                <Avatar id={v.authorId} size={28} />
                <select data-agent="hs-kb-author" aria-label="Author" value={v.authorId} onChange={(e) => set('authorId', e.target.value)} className={`${selectH} flex-1 min-w-0`}>
                  {authors.map((a) => <option key={a} value={a}>{person(a).name}</option>)}
                </select>
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="border border-[#DFE3EB] rounded-[3px] p-2.5">
                <div className="text-[11.5px] uppercase tracking-wide text-[#516F90] flex items-center gap-1"><Eye size={12} /> Views</div>
                <div className="text-[20px] font-light">{(Number(rec?.views) || 0).toLocaleString()}</div>
              </div>
              <div className="border border-[#DFE3EB] rounded-[3px] p-2.5">
                <div className="text-[11.5px] uppercase tracking-wide text-[#516F90] flex items-center gap-1"><ThumbsUp size={12} /> Helpful</div>
                <div className="text-[20px] font-light">{rec?.views ? `${rec.helpful}%` : '--'}</div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#DFE3EB] rounded-[4px] overflow-hidden" data-agent="hs-kb-preview">
            <div className="px-4 py-2.5 border-b border-[#DFE3EB] flex items-center text-[14px] font-semibold">
              Preview <span className="ml-auto text-[11.5px] font-normal text-[#516F90]">help.northwind.com/kb/{isNew ? '…' : id}</span>
            </div>
            <div className="p-5">
              <div className="text-[11.5px] uppercase tracking-wide text-[#0091AE] font-semibold">{v.category || 'Uncategorised'}</div>
              <h2 className="text-[19px] font-semibold leading-snug mt-1">{v.title || 'Untitled article'}</h2>
              <div className="text-[12px] text-[#516F90] mt-1 mb-3">Written by {person(v.authorId).name} · Updated {hsDate(rec?.updatedAt ?? new Date().toISOString())}</div>
              <ArticleBody body={v.body} />
              <div className="mt-5 pt-3 border-t border-[#DFE3EB] text-[12.5px] text-[#516F90] flex items-center gap-2">
                Was this article helpful?
                <span className="h-6 px-2 rounded-[3px] border border-[#CBD6E2] inline-flex items-center">Yes</span>
                <span className="h-6 px-2 rounded-[3px] border border-[#CBD6E2] inline-flex items-center">No</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Render plain text the way the help centre does: blank-line paragraphs, "1." ordered lists, "-" bullet lists. */
function ArticleBody({ body }: { body: string }) {
  if (!body.trim()) return <p className="text-[13.5px] text-[#7C98B6] italic">Start writing to see a preview.</p>
  const blocks = body.split(/\n\s*\n/).map((b) => b.split('\n').filter((l) => l.trim()))
  const out: ReactNode[] = []
  blocks.forEach((lines, bi) => {
    let i = 0
    while (i < lines.length) {
      const l = lines[i].trim()
      if (/^\d+[.)]\s+/.test(l)) {
        const items: string[] = []
        while (i < lines.length && /^\d+[.)]\s+/.test(lines[i].trim())) items.push(lines[i++].trim().replace(/^\d+[.)]\s+/, ''))
        out.push(<ol key={`${bi}-${i}`} className="list-decimal pl-5 space-y-1 my-2">{items.map((t, k) => <li key={k}>{t}</li>)}</ol>)
      } else if (/^[-*•]\s+/.test(l)) {
        const items: string[] = []
        while (i < lines.length && /^[-*•]\s+/.test(lines[i].trim())) items.push(lines[i++].trim().replace(/^[-*•]\s+/, ''))
        out.push(<ul key={`${bi}-${i}`} className="list-disc pl-5 space-y-1 my-2">{items.map((t, k) => <li key={k}>{t}</li>)}</ul>)
      } else {
        const para: string[] = []
        while (i < lines.length && !/^(\d+[.)]|[-*•])\s+/.test(lines[i].trim())) para.push(lines[i++].trim())
        out.push(<p key={`${bi}-${i}`} className="my-2">{para.map((t, k) => <span key={k}>{k > 0 && <br />}{t}</span>)}</p>)
      }
    }
  })
  return <div className="text-[13.5px] leading-relaxed">{out}</div>
}
