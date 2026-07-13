import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, getToken, setToken } from './api'

export type AdminUser = {
  id: string
  email: string
  name: string
  role: 'USER' | 'ADMIN' | 'MANAGER' | 'EMPLOYEE'
  totpEnabled?: boolean
}

const STAFF = new Set(['ADMIN', 'MANAGER', 'EMPLOYEE'])

type AuthState = {
  user: AdminUser | null
  loading: boolean
  login: (
    email: string,
    password: string,
  ) => Promise<{ requires2fa?: boolean; tempToken?: string; error?: string } | null>
  verify2fa: (tempToken: string, code: string) => Promise<string | null>
  logout: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = getToken()
    if (!token) {
      setLoading(false)
      return
    }
    api<{ user: AdminUser }>('/api/auth/me')
      .then((r) => {
        if (!STAFF.has(r.user.role)) {
          setToken(null)
          setUser(null)
        } else setUser(r.user)
      })
      .catch(() => {
        setToken(null)
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const r = await api<{
        token?: string
        user?: AdminUser
        requires2fa?: boolean
        tempToken?: string
      }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      if (r.requires2fa && r.tempToken) {
        return { requires2fa: true, tempToken: r.tempToken }
      }
      if (!r.token || !r.user) return { error: 'Login failed' }
      if (!STAFF.has(r.user.role)) return { error: 'Staff access only (Admin / Manager / Employee)' }
      setToken(r.token)
      setUser(r.user)
      return null
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Login failed' }
    }
  }

  const verify2fa = async (tempToken: string, code: string) => {
    try {
      const r = await api<{ token: string; user: AdminUser }>('/api/auth/login/2fa', {
        method: 'POST',
        body: JSON.stringify({ tempToken, code }),
      })
      if (!STAFF.has(r.user.role)) return 'Staff access only (Admin / Manager / Employee)'
      setToken(r.token)
      setUser(r.user)
      return null
    } catch (e) {
      return e instanceof Error ? e.message : 'Invalid code'
    }
  }

  const logout = () => {
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, verify2fa, logout }}>{children}</AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth outside provider')
  return ctx
}
