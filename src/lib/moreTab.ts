/** Persist More page filter tab for back navigation */
export const MORE_TAB_KEY = 'nitajfx_more_tab'

export type MoreFilterKey =
  | 'popular'
  | 'tools'
  | 'rewards'
  | 'education'
  | 'funding'
  | 'platform'
  | 'support'

const VALID: MoreFilterKey[] = [
  'popular',
  'tools',
  'rewards',
  'education',
  'funding',
  'platform',
  'support',
]

export function parseMoreTab(value: string | null | undefined): MoreFilterKey {
  if (value && VALID.includes(value as MoreFilterKey)) return value as MoreFilterKey
  return 'popular'
}

export function readStoredMoreTab(): MoreFilterKey {
  try {
    return parseMoreTab(sessionStorage.getItem(MORE_TAB_KEY))
  } catch {
    return 'popular'
  }
}

export function storeMoreTab(tab: MoreFilterKey) {
  try {
    sessionStorage.setItem(MORE_TAB_KEY, tab)
  } catch {
    /* ignore */
  }
}

/** Path back to More with last active tab */
export function morePathWithTab(tab?: MoreFilterKey) {
  const t = tab ?? readStoredMoreTab()
  return t === 'popular' ? '/more' : `/more?tab=${t}`
}
