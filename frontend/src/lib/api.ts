const getBaseUrl = (): string =>
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:3001'

/**
 * Typed API error — thrown by apiClient on non-ok responses.
 * The `body` field contains the parsed JSON response body (if any).
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown
  ) {
    super(`HTTP ${status}`)
    this.name = 'ApiError'
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${getBaseUrl()}${path}`
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
  })

  if (!response.ok) {
    let body: unknown = {}
    try {
      body = await response.json()
    } catch {
      // Non-JSON error body — leave as empty object
    }
    throw new ApiError(response.status, body)
  }

  // 204 No Content — return undefined rather than trying to parse an empty body
  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

export const apiClient = {
  get<T>(path: string): Promise<T> {
    return request<T>(path, { method: 'GET' })
  },

  post<T>(path: string, body: unknown): Promise<T> {
    return request<T>(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  },

  put<T>(path: string, body: unknown): Promise<T> {
    return request<T>(path, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  },

  patch<T>(path: string, body: unknown): Promise<T> {
    return request<T>(path, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  },

  delete<T>(path: string): Promise<T> {
    return request<T>(path, { method: 'DELETE' })
  },
}
