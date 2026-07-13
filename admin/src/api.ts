const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

export function getToken() {
  return localStorage.getItem('seekapa_admin_token')
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem('seekapa_admin_token', token)
  else localStorage.removeItem('seekapa_admin_token')
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${API_URL}${path}`, { ...options, headers })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || res.statusText || 'Request failed')
  return data as T
}
