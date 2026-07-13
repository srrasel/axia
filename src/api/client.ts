/**
 * Always call same-origin `/api/...`.
 * Web/admin nginx (and host nginx) proxy `/api` → backend.
 * Avoids NetworkError from wrong VITE_API_URL / CORS / SSL on api subdomain.
 */
const API_URL = ''

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

  const url = path.startsWith('/') ? path : `/${path}`

  let res: Response
  try {
    res = await fetch(url, { ...options, headers })
  } catch {
    throw new Error(
      `Cannot reach API at ${url}. Is the backend up, and is /api proxied on this host?`,
    )
  }

  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { error?: string }).error || res.statusText || 'Request failed')
  return data as T
}

export { API_URL }
