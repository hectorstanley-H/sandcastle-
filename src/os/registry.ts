/**
 * App registry. Every app lives in src/apps/<id>/index.tsx (default export, receives AppProps).
 *
 * frame:
 *  - 'native'  → Windows 11 title bar (desktop apps: Outlook, Teams, Excel…)
 *  - 'browser' → Microsoft Edge window chrome with tab + address bar (SaaS apps: SAP, Workday…)
 *  - 'none'    → app draws its own chrome entirely (H-Worker, agent window)
 */
import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import type { Win } from './wm'

const LOGOS = import.meta.glob('../assets/logos/*.svg', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
const logo = (name: string) => LOGOS[`../assets/logos/${name}.svg`] ?? LOGOS['../assets/logos/windows.svg']

export interface AppProps {
  win: Win
  /** deep-link params (same as win.params) */
  params: any
}

export interface AppDef {
  id: string
  name: string
  icon: string
  component: LazyExoticComponent<ComponentType<AppProps>>
  size: [number, number]
  minSize?: [number, number]
  frame: 'native' | 'browser' | 'none'
  /** for browser frame: default URL shown in the address bar */
  url?: string
  /** title bar / tab colour hints */
  titleBarColor?: string
  titleBarText?: 'light' | 'dark'
  /** show on the desktop as an icon */
  desktop?: boolean
  /** pinned in the taskbar */
  pinned?: boolean
  /** allow multiple windows */
  multi?: boolean
  /** hide from start menu / search */
  hidden?: boolean
  /** open maximized on agent desktops (default true) */
  agentMaximized?: boolean
  category: string
  publisher?: string
  description?: string
}

const L = (loader: () => Promise<{ default: ComponentType<AppProps> }>) => lazy(loader)

export const APPS: AppDef[] = [
  // ── Core ───────────────────────────────────────────────────────────────
  { id: 'hworker', name: 'H-Worker', icon: logo('hworker'), component: L(() => import('@/apps/hworker')), size: [1240, 800], minSize: [900, 600], frame: 'none', desktop: true, pinned: true, category: 'AI', publisher: 'H Company', description: 'Deploy AI coworkers that operate your apps' },
  { id: 'agent', name: 'H-Worker Agent', icon: logo('hworker'), component: L(() => import('@/agent/AgentWindow')), size: [1260, 780], minSize: [800, 520], frame: 'none', multi: true, hidden: true, category: 'AI', publisher: 'H Company' },
  { id: 'outlook', name: 'Outlook', icon: logo('outlook'), component: L(() => import('@/apps/outlook')), size: [1280, 800], frame: 'none', desktop: true, pinned: true, category: 'Microsoft 365', publisher: 'Microsoft Corporation' },
  { id: 'explorer', name: 'File Explorer', icon: logo('explorer'), component: L(() => import('@/apps/explorer')), size: [1040, 660], frame: 'none', pinned: true, category: 'System', publisher: 'Microsoft Corporation' },
  { id: 'edge', name: 'Microsoft Edge', icon: logo('edge'), component: L(() => import('@/apps/edge')), size: [1200, 780], frame: 'browser', url: 'https://www.bing.com', pinned: true, desktop: true, category: 'System', publisher: 'Microsoft Corporation' },
  { id: 'settings', name: 'Settings', icon: logo('settings'), component: L(() => import('@/apps/settings')), size: [1000, 680], frame: 'native', category: 'System', publisher: 'Microsoft Corporation' },
  { id: 'notepad', name: 'Notepad', icon: logo('notepad'), component: L(() => import('@/apps/notepad')), size: [760, 520], frame: 'none', category: 'System', publisher: 'Microsoft Corporation' },
  { id: 'calculator', name: 'Calculator', icon: logo('calculator'), component: L(() => import('@/apps/calculator')), size: [340, 520], frame: 'native', agentMaximized: false, category: 'System', publisher: 'Microsoft Corporation' },

  // ── Microsoft 365 ──────────────────────────────────────────────────────
  { id: 'teams', name: 'Microsoft Teams', icon: logo('teams'), component: L(() => import('@/apps/teams')), size: [1260, 800], frame: 'none', desktop: true, pinned: true, category: 'Microsoft 365', publisher: 'Microsoft Corporation' },
  { id: 'excel', name: 'Excel', icon: logo('excel'), component: L(() => import('@/apps/excel')), size: [1240, 780], frame: 'none', desktop: true, pinned: true, multi: false, category: 'Microsoft 365', publisher: 'Microsoft Corporation' },
  { id: 'word', name: 'Word', icon: logo('word'), component: L(() => import('@/apps/word')), size: [1180, 800], frame: 'none', desktop: true, category: 'Microsoft 365', publisher: 'Microsoft Corporation' },
  { id: 'powerpoint', name: 'PowerPoint', icon: logo('powerpoint'), component: L(() => import('@/apps/powerpoint')), size: [1200, 780], frame: 'none', category: 'Microsoft 365', publisher: 'Microsoft Corporation' },
  { id: 'powerbi', name: 'Power BI', icon: logo('powerbi'), component: L(() => import('@/apps/powerbi')), size: [1280, 800], frame: 'browser', url: 'https://app.powerbi.com/groups/me/reports', desktop: true, category: 'Analytics', publisher: 'Microsoft Corporation' },

  // ── Finance & Procurement ──────────────────────────────────────────────
  { id: 'sap', name: 'SAP S/4HANA', icon: logo('sap'), component: L(() => import('@/apps/sap')), size: [1320, 820], frame: 'browser', url: 'https://my401273.s4hana.cloud.sap/ui#Shell-home', desktop: true, pinned: true, category: 'Finance', publisher: 'SAP SE' },
  { id: 'concur', name: 'SAP Concur', icon: logo('concur'), component: L(() => import('@/apps/concur')), size: [1280, 800], frame: 'browser', url: 'https://us2.concursolutions.com/nui/expense', desktop: true, category: 'Finance', publisher: 'SAP Concur' },
  { id: 'coupa', name: 'Coupa', icon: logo('coupa'), component: L(() => import('@/apps/coupa')), size: [1280, 800], frame: 'browser', url: 'https://northwind.coupahost.com/', desktop: true, category: 'Procurement', publisher: 'Coupa Software' },
  { id: 'netsuite', name: 'Oracle NetSuite', icon: logo('netsuite'), component: L(() => import('@/apps/netsuite')), size: [1300, 800], frame: 'browser', url: 'https://4820193.app.netsuite.com/app/center/card.nl', desktop: true, category: 'Finance', publisher: 'Oracle' },
  { id: 'acrobat', name: 'Adobe Acrobat', icon: logo('acrobat'), component: L(() => import('@/apps/acrobat')), size: [980, 760], frame: 'none', multi: false, category: 'Productivity', publisher: 'Adobe Inc.' },

  // ── People / HR ────────────────────────────────────────────────────────
  { id: 'workday', name: 'Workday', icon: logo('workday'), component: L(() => import('@/apps/workday')), size: [1280, 800], frame: 'browser', url: 'https://wd5.myworkday.com/northwind/d/home.htmld', desktop: true, pinned: true, category: 'HR', publisher: 'Workday, Inc.' },
  { id: 'docusign', name: 'Docusign', icon: logo('docusign'), component: L(() => import('@/apps/docusign')), size: [1240, 800], frame: 'browser', url: 'https://apps.docusign.com/send/home', desktop: true, category: 'Legal', publisher: 'Docusign, Inc.' },
  { id: 'greenhouse', name: 'Greenhouse', icon: logo('greenhouse'), component: L(() => import('@/apps/greenhouse')), size: [1240, 800], frame: 'browser', url: 'https://app.greenhouse.io/dashboard', desktop: true, category: 'HR', publisher: 'Greenhouse Software' },
  { id: 'okta', name: 'Okta', icon: logo('okta'), component: L(() => import('@/apps/okta')), size: [1200, 780], frame: 'browser', url: 'https://northwind.okta.com/app/UserHome', desktop: true, category: 'IT', publisher: 'Okta, Inc.' },

  // ── Sales & Marketing ──────────────────────────────────────────────────
  { id: 'salesforce', name: 'Salesforce', icon: logo('salesforce'), component: L(() => import('@/apps/salesforce')), size: [1320, 820], frame: 'browser', url: 'https://northwind.lightning.force.com/lightning/page/home', desktop: true, pinned: true, category: 'Sales', publisher: 'Salesforce, Inc.' },
  { id: 'hubspot', name: 'HubSpot', icon: logo('hubspot'), component: L(() => import('@/apps/hubspot')), size: [1280, 800], frame: 'browser', url: 'https://app.hubspot.com/contacts/4398211/objects/0-1/views/all/list', desktop: true, category: 'Marketing', publisher: 'HubSpot, Inc.' },
  { id: 'zoom', name: 'Zoom Workplace', icon: logo('zoom'), component: L(() => import('@/apps/zoom')), size: [1100, 720], frame: 'none', desktop: true, category: 'Communication', publisher: 'Zoom Video Communications' },
  { id: 'tableau', name: 'Tableau', icon: logo('tableau'), component: L(() => import('@/apps/tableau')), size: [1280, 800], frame: 'browser', url: 'https://prod-useast-b.online.tableau.com/#/site/northwind/home', category: 'Analytics', publisher: 'Salesforce, Inc.' },

  // ── IT, Support & Engineering ──────────────────────────────────────────
  { id: 'servicenow', name: 'ServiceNow', icon: logo('servicenow'), component: L(() => import('@/apps/servicenow')), size: [1300, 820], frame: 'browser', url: 'https://northwind.service-now.com/now/nav/ui/home', desktop: true, pinned: true, category: 'IT', publisher: 'ServiceNow' },
  { id: 'zendesk', name: 'Zendesk', icon: logo('zendesk'), component: L(() => import('@/apps/zendesk')), size: [1300, 800], frame: 'browser', url: 'https://northwind.zendesk.com/agent/dashboard', desktop: true, category: 'Support', publisher: 'Zendesk, Inc.' },
  { id: 'jira', name: 'Jira', icon: logo('jira'), component: L(() => import('@/apps/jira')), size: [1300, 800], frame: 'browser', url: 'https://northwind.atlassian.net/jira/software/projects/OPS/boards/12', desktop: true, category: 'Engineering', publisher: 'Atlassian' },
  { id: 'confluence', name: 'Confluence', icon: logo('confluence'), component: L(() => import('@/apps/confluence')), size: [1280, 800], frame: 'browser', url: 'https://northwind.atlassian.net/wiki/spaces/OPS/overview', desktop: true, category: 'Engineering', publisher: 'Atlassian' },
  { id: 'slack', name: 'Slack', icon: logo('slack'), component: L(() => import('@/apps/slack')), size: [1240, 780], frame: 'none', desktop: true, pinned: true, category: 'Communication', publisher: 'Slack Technologies' },
]

export const getApp = (id: string) => APPS.find((a) => a.id === id)
export const appIcon = (id: string) => getApp(id)?.icon ?? logo('windows')
export const logoUrl = logo
