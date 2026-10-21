/**
 * Workflow registry. Each app group owns one file exporting `workflows: Workflow[]`.
 */
import type { Workflow } from '@/agent/types'
import { workflows as core } from './core'
import { workflows as m365 } from './m365'
import { workflows as finance } from './finance'
import { workflows as hr } from './hr'
import { workflows as sales } from './sales'
import { workflows as it } from './it'
import { workflows as system } from './system'
import { workflows as cross } from './cross'

export const WORKFLOWS: Workflow[] = [...cross, ...core, ...finance, ...hr, ...sales, ...it, ...m365, ...system]

export const getWorkflow = (id: string) => WORKFLOWS.find((w) => w.id === id)

/** Very small intent matcher for the free-text prompt box. */
export function matchWorkflows(prompt: string): { wf: Workflow; score: number }[] {
  const q = prompt.toLowerCase()
  const words = q.split(/[^a-z0-9]+/).filter((w) => w.length > 2)
  return WORKFLOWS.map((wf) => {
    let score = 0
    for (const k of wf.keywords) {
      const kk = k.toLowerCase()
      if (q.includes(kk)) score += kk.includes(' ') ? 4 : 2.5
      else if (words.some((w) => kk.startsWith(w) || w.startsWith(kk))) score += 1
    }
    for (const ex of wf.examples ?? []) {
      const exw = ex.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3)
      score += exw.filter((w) => words.includes(w)).length * 0.6
    }
    if (q.includes(wf.title.toLowerCase())) score += 6
    return { wf, score }
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
}
