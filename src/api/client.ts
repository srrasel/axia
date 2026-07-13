/**
 * Empty / unset VITE_API_URL → same-origin `/api/...` (via nginx proxy).
 * Set VITE_API_URL only if you must call the API on another host.
 */
const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

const TOKEN_KEY = 'seekapa_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  const url = `${API_URL}${path.startsWith('/') ? path : `/${path}`}`

  let res: Response
  try {
    res = await fetch(url, { ...options, headers })
  } catch {
    throw new Error(
      'Cannot reach API. Check that the backend is running and you are using the correct site URL.',
    )
  }

  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { error?: string }).error || res.statusText || 'Request failed')
  return data as T
}

export { API_URL }
