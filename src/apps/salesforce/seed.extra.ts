/** Extra Salesforce demo data (appended to the DB seed). Only new collections / new records. */
import type { Collections } from '@/db/db'
import { SF_IDS } from '@/db/seeds/sales'

const daysAgo = (n: number, h = 10) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(h, 0, 0, 0)
  return d.toISOString()
}

export function seed(): Collections {
  return {
    'salesforce.cases': [
      { id: '500Hs00000CsA1', caseNumber: '00001021', subject: 'SSO login loop for Rotterdam plant users', status: 'Working', priority: 'High', origin: 'Email', type: 'Problem', reason: 'Performance', accountId: SF_IDS.ACC_CONTOSO, contactId: SF_IDS.CON_KATE, description: 'Users in the Rotterdam site are redirected back to the login page after Azure AD sign-in.', ownerId: 'aisha', createdDate: daysAgo(2, 9) },
      { id: '500Hs00000CsA2', caseNumber: '00001022', subject: 'Request: export work orders to Excel', status: 'New', priority: 'Medium', origin: 'Web', type: 'Feature Request', reason: 'Feedback', accountId: SF_IDS.ACC_CONTOSO, contactId: '', description: 'Supply chain team would like a scheduled export of open work orders.', ownerId: 'aisha', createdDate: daysAgo(5, 14) },
      { id: '500Hs00000CsA3', caseNumber: '00001023', subject: 'MES connector sandbox credentials', status: 'Closed', priority: 'Low', origin: 'Phone', type: 'Question', reason: 'Installation', accountId: SF_IDS.ACC_ADATUM, contactId: SF_IDS.CON_MARCO, description: 'Marco asked for sandbox credentials to test the MES connector ahead of the evaluation.', ownerId: 'alex', createdDate: daysAgo(12, 11) },
    ],
    'salesforce.notes': [
      { id: '002Hs00000Nt01', title: 'Adatum — buying committee', body: 'Elena (Head of Ops) is the champion. Marco (CIO) signs. Sanne (Rotterdam) needs to see the shift-handover workflow before she supports it.', parentId: SF_IDS.OPP_ADATUM, ownerId: 'alex', date: daysAgo(6, 16) },
    ],
  }
}
