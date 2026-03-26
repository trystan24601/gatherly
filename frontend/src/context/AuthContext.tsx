import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import { apiClient } from '../lib/api'

export interface AuthUser {
  userId: string
  email: string
  firstName: string
  lastName: string
  role: string
  orgId?: string
}

export interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  login: (credentials: { email: string; password: string }) => Promise<void>
  logout: () => Promise<void>
  /** Re-fetch the current user from GET /auth/me and update state */
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchCurrentUser = useCallback(async (): Promise<void> => {
    try {
      const data = await apiClient.get<AuthUser>('/auth/me')
      setUser(data)
    } catch {
      setUser(null)
    }
  }, [])

  useEffect(() => {
    fetchCurrentUser().finally(() => setLoading(false))
  }, [fetchCurrentUser])

  const login = useCallback(
    async (credentials: { email: string; password: string }): Promise<void> => {
      const data = await apiClient.post<AuthUser>('/auth/login', credentials)
      setUser(data)
    },
    []
  )

  const logout = useCallback(async (): Promise<void> => {
    await apiClient.post('/auth/logout', {})
    setUser(null)
  }, [])

  const refreshUser = useCallback(async (): Promise<void> => {
    await fetchCurrentUser()
  }, [fetchCurrentUser])

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>')
  }
  return ctx
}
