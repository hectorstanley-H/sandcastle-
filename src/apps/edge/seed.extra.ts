import type { Collections } from '@/db/db'

/**
 * edge.favorites: { id, title, url, bar?: boolean }   — favourites (bar = shown on the favourites bar)
 * edge.history:   { id, title, url, at }              — browsing history (written as you browse)
 * edge.downloads: { id, name, url, size, at, fileId } — downloads (written as you download)
 */
export function seed(): Collections {
  return {
    'edge.favorites': [
      { id: 'fav-intranet', title: 'Northwind intranet', url: 'https://northwind.sharepoint.com/sites/intranet', bar: true },
      { id: 'fav-workday', title: 'Workday', url: 'https://wd5.myworkday.com/northwind/d/home.htmld', bar: true },
      { id: 'fav-servicenow', title: 'IT Service Portal', url: 'https://northwind.service-now.com/now/nav/ui/home', bar: true },
      { id: 'fav-concur', title: 'Concur Expense', url: 'https://us2.concursolutions.com/nui/expense', bar: true },
      { id: 'fav-net30', title: 'Net 30: What It Means and How It Works', url: 'https://www.investopedia.com/terms/n/net30.asp', bar: false },
    ],
  }
}
