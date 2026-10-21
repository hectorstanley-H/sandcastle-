#!/usr/bin/env node
/**
 * Headless test harness.
 *
 *   node scripts/run-workflow.mjs <workflowId> [--port 5173] [--speed 8] [--shot out.png] [--timeout 180]
 *       Runs a workflow on a fresh demo (cleared localStorage) and prints the agent log.
 *       Exit code 0 when the run completes, 1 on error/timeout.
 *
 *   node scripts/run-workflow.mjs --screenshot "<path-and-query>" out.png [--port 5173] [--wait 2500]
 *       e.g. --screenshot "/?open=sap&max" sap.png   → screenshot of an app on the user's desktop.
 *
 * Requires a running dev server (npm run dev -- --port <port>).
 */
import { chromium } from 'playwright'

const args = process.argv.slice(2)
const opt = (name, def) => {
  const i = args.indexOf('--' + name)
  return i >= 0 ? args[i + 1] : def
}
const port = opt('port', '5173')
const base = `http://localhost:${port}`

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 })
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text())
})

if (args[0] === '--screenshot') {
  const path = args[1]
  const out = args[2] ?? 'shot.png'
  const url = base + (path.includes('?') ? path + '&skipLock=1' : path + '?skipLock=1')
  await page.goto(base + '/?skipLock=1')
  await page.evaluate(() => localStorage.clear())
  await page.goto(url)
  await page.waitForTimeout(Number(opt('wait', '2500')))
  await page.screenshot({ path: out })
  console.log('saved', out)
  if (errors.length) console.log('PAGE ERRORS:\n' + errors.join('\n'))
  await browser.close()
  process.exit(0)
}

const wf = args[0]
const speed = opt('speed', '8')
const shot = opt('shot')
const timeout = Number(opt('timeout', '180')) * 1000
let done = false
let failed = null
page.on('console', (m) => {
  const t = m.text()
  if (!t.startsWith('[HW]')) return
  console.log(t)
  if (t.startsWith('[HW] done')) done = true
  if (t.startsWith('[HW] error')) failed = t
})
await page.goto(base + '/?skipLock=1')
await page.evaluate(() => localStorage.clear())
await page.goto(`${base}/?skipLock=1&debug=1&max=1&autorun=${encodeURIComponent(wf)}&speed=${speed}`)
const t0 = Date.now()
while (!done && !failed && Date.now() - t0 < timeout) await page.waitForTimeout(250)
await page.waitForTimeout(600)
if (shot) {
  await page.screenshot({ path: shot })
  console.log('screenshot', shot)
}
if (errors.length) console.log('PAGE ERRORS:\n' + errors.slice(0, 20).join('\n'))
await browser.close()
if (done) {
  console.log(`PASS ${wf} in ${((Date.now() - t0) / 1000).toFixed(1)}s`)
  process.exit(0)
}
console.log(failed ? `FAIL ${wf}: ${failed}` : `TIMEOUT ${wf}`)
process.exit(1)
