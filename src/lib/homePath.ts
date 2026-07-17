/** Matches Tailwind `sm` breakpoint (640px). Below that is treated as mobile. */
const MOBILE_MQ = '(max-width: 639px)'

/** Default landing path after login / for `/` — Markets on mobile, Trading on desktop. */
export function homePath(): string {
  if (typeof window !== 'undefined' && window.matchMedia(MOBILE_MQ).matches) {
    return '/markets'
  }
  return '/member'
}
