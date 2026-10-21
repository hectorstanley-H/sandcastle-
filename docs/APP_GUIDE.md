# H-Worker Desktop — App & Workflow Build Guide

This is a **fake Windows 11 desktop** (Vite + React 19 + TypeScript + Tailwind v4) used as an epic sales demo for
**H-Worker** (H Company's AI computer-use agent). The user opens H-Worker, deploys an agent, and a window opens
that shows *another* desktop where the agent drives real-looking enterprise apps with a virtual cursor —
clicking buttons and typing into inputs. Afterwards the user opens the same apps on their own desktop and sees
the results (sent emails, posted invoices, resolved tickets…). No backend: all data is a zustand store persisted
to localStorage, with a "Reset demo" button.

**The bar is: indistinguishable from the real product at a glance.** Real logos, real colour palettes, real
layouts (current 2025/2026 versions of each product), real navigation, dense believable data, every visible button
present. Nothing says "coming soon", nothing is empty. Secondary screens may be simpler but must look real.

## Architecture (read these files first)

| File | What |
| --- | --- |
| `src/os/registry.ts` | App registry (id, name, icon, frame, default URL…). **Already contains every app.** Don't edit — ask in your report if something must change. |
| `src/os/context.tsx` | `useDesk()` → `{ deskId, isAgent, open(appId, params), openOnMain, toast }`; `useWin()` → `{ win, setTitle, setUrl, close }` |
| `src/os/Window.tsx` | Window chrome. Export `WindowControls` (min/max/close) for apps with `frame: 'none'`. |
| `src/db/db.ts` | The data store: `useCollection(col)`, `useRecord(col,id)`, `useWhere`, and imperative `db.get/find/insert/update/upsert/remove`, `uid(prefix)` |
| `src/data/people.ts` | Shared people directory (`PEOPLE`, `ME` = Alex Morgan, `person(id)`, `personByEmail`) and `COMPANY` (Northwind Global). **Use these people everywhere.** |
| `src/data/time.ts` | `minutesAgo`, `hoursAgo`, `daysAgo(n,hh,mm)`, `daysFromNow`, `businessDays`, `today`, `isoDate`, `fmt*`, `money` |
| `src/components/Avatar.tsx` | Initials avatar for a person id / email / name |
| `src/agent/types.ts` | `Workflow` and `AgentAPI` types — **read fully** |
| `src/agent/runtime.ts` | How the agent clicks/types (DOM events on real elements) |
| `src/apps/outlook/*` | **Reference app**: study it for conventions (data-agent ids, deep-link params, isAgent badges) |
| `src/workflows/core.ts` | **Reference workflows** |
| `src/db/seeds/core.ts` | Reference seed (emails the workflows use) |

## Building an app

* Each app is `src/apps/<id>/index.tsx` with a default export `function App({ win, params }: AppProps)`.
  Split into more files inside that folder freely.
* `frame` (from the registry):
  * `'browser'` — SaaS apps. The window already draws a Microsoft Edge tab + address bar; you draw the web page.
    Call `const { setUrl, setTitle } = useWin()` and update them as the user navigates
    (e.g. `setUrl('https://northwind.lightning.force.com/lightning/r/Opportunity/006Hs00001AbCd/view')`,
    `setTitle('Contoso Renewal | Salesforce')`) inside a `useEffect` — the tab title/URL make it feel real.
  * `'native'` — a Windows title bar is drawn for you.
  * `'none'` — you draw the whole window including the title bar. Put `data-drag-handle` on your title bar
    element and render `<WindowControls />` (pass `dark` for dark title bars, `height={n}`) at its right end.
* Root element: `<div className="flex-1 min-h-0 flex flex-col …">` — the window body is a flex column.
  Use internal `overflow-auto` scroll areas; never let the whole app overflow.
* Windows can be ~1000–1900px wide. On agent desktops apps open **maximized at 1440×852**. Make that look great.
* Fonts: Microsoft apps `var(--font-win)`; SAP `var(--font-sap)`; Salesforce `var(--font-sf)`; others: Inter /
  system stacks that match the product (`'Lato'` and `'Open Sans'` are also loaded from Google Fonts).
* Icons: `@fluentui/react-icons` for Microsoft apps (e.g. `Mail20Regular`), `lucide-react` or
  `@phosphor-icons/react` for others. Logos: `logoUrl('<name>')` from the registry (files in `src/assets/logos/`;
  you may ADD new SVG logo files there, e.g. product-specific marks, prefixed with your app id).
* **Deep links**: apps receive `params` (also `win.params`) and `win.nonce` increments every time the app is
  re-opened with new params. Apply them in `useEffect(() => {...}, [win.nonce])`. Every record an agent creates
  must be deep-linkable (e.g. `{ reportId }`, `{ incidentId }`) so H-Worker's "View result" buttons can open it.
* **Agent provenance**: `const { isAgent } = useDesk()`. When an agent creates/changes a record, store
  `createdBy: 'hworker'` (or `updatedBy`) and show a subtle, product-styled indicator (e.g. a small purple
  `#430693` "H-Worker" chip with `logoUrl('hworker')`, or the product's own "via H-Worker (API user)" text) so the
  user can verify the agent's work in their own desktop. Also flash new rows (`className="flash-new"`).
* State: UI state in React state; business data in the db (so the user's desktop and agent desktops share it).
  **No module-level mutable state** (the same component is mounted on several desktops at once).

## Making an app agent-drivable

The agent finds elements by `data-agent` attributes, scoped to its own desktop. Conventions:

* Add `data-agent="<appid>-<thing>"` to every element a workflow needs: nav items, buttons, inputs, rows
  (`data-agent={\`concur-report-${r.id}\`}`), menu items, tabs, dropdown options.
* Also give them a good `aria-label` (used as the human-readable label in the agent's activity feed).
* Inputs must be real `<input>`, `<textarea>`, or `<select>` elements with React `onChange` (the agent sets the
  value with the native setter and fires `input`/`change` events). No contentEditable.
* `<input type="date">` works (agent sets the whole value). For custom dropdowns use clickable buttons/options with
  data-agent ids. Keyboard: the agent can `press('Enter')` → your `onKeyDown` gets it.
* `data-agent-insert="start"` on a textarea makes typed text go to the top (used for reply bodies above quotes).
* Avoid hover-only UI for things the agent must click (it can hover, but clicking is more reliable).
* Things the agent clicks must be visible (not `display:none`) — scroll containers are auto-scrolled.
* Don't open native `alert/confirm`. Use in-app modals.

## Data / seeds

* Your group owns `src/db/seeds/<group>.ts` → `export function seed(): Collections { return { 'concur.reports': [...], … } }`.
  Collection names are prefixed with your app id. Records need a string `id`.
* Generate dates relative to now with the time helpers (seed runs at reset time).
* Seed **plenty** of realistic data (dozens of rows) so lists look lived-in. Use the shared people + realistic
  vendors/customers (Contoso, Fabrikam, Adatum, Litware, Tailspin Toys, Wide World Importers, Northwind Traders,
  Alpine Ski House, Woodgrove Bank, Proseware, Coho Winery, Lucerne Publishing, Fourth Coffee, Margie's Travel…).
* The Outlook seed (`src/db/seeds/core.ts`) already contains emails your workflows can use — read it. If your
  workflow needs extra emails in Alex's inbox (or files in `files`, events in `outlook.events`), return them from
  **your** seed under the same collection name — arrays from all groups are concatenated. Follow the record shapes
  documented at the top of `core.ts`. Attachments can deep-link into your app: `open: { appId, params }`.

## Workflows

Your group owns `src/workflows/<group>.ts` → `export const workflows: Workflow[] = [...]`.

* A workflow = metadata (title, description, category, apps, timeSaved, keywords, examples, plan, optional inputs
  with defaults, optional `nudge`, `featured`) + `async run(a, inputs) → WorkflowResult`.
* Inside `run`: call `a.step(i)` as you start each plan item; `a.think('…')` for visible reasoning (1–3 per
  workflow, make them specific and smart, referencing real data); `a.open('app')`; `a.click('@data-agent-id', { label })`;
  `a.type('@id', text)`; `a.select('@id', value)`; `a.press('Enter')`; `a.wait(ms)`.
  Read data with `a.db.get('col')` to decide what to do (e.g. loop over unassigned incidents).
* Workflows should drive the UI for everything visible. Direct `a.db` writes only for invisible bookkeeping.
* Aim for 40–120 seconds at 1× speed: enough actions to be impressive, not tedious. Long texts are fine (typing is
  chunked automatically).
* Return `{ summary, outputs: [{ label, appId, params }], metrics: [{label, value}] }`. Outputs deep-link to the
  created records in the user's own desktop — **this is the "check the completion" moment of the demo, make it count**.
* Workflows may use **your group's apps + Outlook** (mail & calendar, ids in `src/apps/outlook/*`) only. Cross-group
  workflows will be written after integration.
* `nudge: () => string | null` shows a contextual suggestion on the H-Worker home ("2 vendor invoices waiting to be
  posted"). Make it return null once the work is done (check the db).

## Testing (do this — don't hand in untested work)

```bash
# your own dev server on your own port + cache dir (several builders work in parallel)
VITE_CACHE_DIR=node_modules/.vite-<group> npx vite --port <port> --strictPort   # run in background
npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep 'src/apps/<yourapp>\|src/workflows/<group>\|src/db/seeds/<group>'
node scripts/run-workflow.mjs <workflowId> --port <port> --speed 8 --shot /tmp/<group>-wf.png    # PASS/FAIL + log
node scripts/run-workflow.mjs --screenshot "/?open=<appId>&max" /tmp/<group>-app.png --port <port>
node scripts/run-workflow.mjs --screenshot '/?open=<appId>&max&params={"reportId":"..."}' /tmp/x.png --port <port>
```

Then **look at the PNGs with the Read tool** and iterate until it genuinely looks like the real product. Check
every view you built. Each workflow must PASS. Other groups are editing other files at the same time, so ignore
type errors outside your files, and if the app fails to load because of someone else's file, wait a bit and retry.

## Rules

* Only create/edit files you own: `src/apps/<your apps>/**`, `src/db/seeds/<group>.ts`, `src/workflows/<group>.ts`,
  new logo files `src/assets/logos/<yourapp>-*.svg`. Do not edit core files, other groups' files, package.json.
  If you need a core change, describe it in your final report.
* No git commits. No new npm dependencies (available: react 19, zustand, tailwind v4, lucide-react,
  @phosphor-icons/react, @fluentui/react-icons, recharts, motion).
* Final report: list of apps/views built, collections + deep-link params each app accepts, data-agent ids other
  groups might use, workflows (id + PASS time), and any core changes you need.
