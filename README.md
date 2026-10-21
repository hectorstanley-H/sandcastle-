# H-Worker · Enterprise Desktop Demo

A fake Windows 11 desktop, running entirely in the browser, with 25+ enterprise applications (SAP S/4HANA, SAP Concur,
Workday, Salesforce, ServiceNow, Outlook, Teams, Excel, Slack, Jira…) and **H-Worker**, H Company's AI coworker.

Open H-Worker from the desktop, from the system-tray icon, or press **Alt+H** / **Ctrl+Space**, pick a workflow or describe
a task, and deploy an agent. A new window opens showing the agent's own desktop, where it operates the same apps with
a virtual cursor — clicking, typing, navigating — while the side panel shows its plan and live activity. When it
finishes, click **Review result** to open what it did in your own apps (the sent email, the posted SAP invoice, the
submitted Concur report…).

* No backend, no database — all state lives in `localStorage`.
* **Reset the demo** from H-Worker → Settings, Start menu → user → Reset demo, the Start power button, or right-click the desktop.

## Develop

```bash
npm install
npm run dev
```

Useful URL parameters: `?skipLock=1` (skip the lock screen), `?open=<appId>&max` (open an app),
`?autorun=<workflowId>&speed=4` (start a workflow immediately).

Headless checks (needs a running dev server): `node scripts/run-workflow.mjs <workflowId> --port 5173 --speed 8`.

## Deploy

It's a static Vite app. On Vercel: import the repo — framework preset **Vite**, build `npm run build`, output `dist`.

## Structure

* `src/os` — desktop shell, window manager, taskbar, start menu, lock screen
* `src/agent` — agent runtime (drives real DOM elements), run state, agent window
* `src/apps/<id>` — every application
* `src/workflows` — agent workflows, grouped by domain
* `src/db` — the localStorage-backed data store and seeds
* `docs/APP_GUIDE.md` — conventions for building apps and workflows
