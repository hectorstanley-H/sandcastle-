import { person } from '@/data/people'
export const OWNER_IDS = ['alex', 'hannah', 'liam', 'aisha']
export const OWNERS = OWNER_IDS.map((id) => ({ id, name: person(id).name }))
