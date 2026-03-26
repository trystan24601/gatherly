import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// FE-TEST-03: apiClient utility tests

describe('apiClient utility', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('apiClient.get makes a fetch call that includes the path', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: 'ok' }),
    })
    global.fetch = mockFetch

    const { apiClient } = await import('../api')
    await apiClient.get('/health')

    expect(mockFetch).toHaveBeenCalledOnce()
    const calledUrl = mockFetch.mock.calls[0][0] as string
    expect(calledUrl).toContain('/health')
  })

  it('apiClient.get resolves with parsed JSON on 2xx response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: 'ok', timestamp: '2026-01-01T00:00:00.000Z' }),
    })
    global.fetch = mockFetch

    const { apiClient } = await import('../api')
    const result = await apiClient.get('/health')

    expect(result).toEqual({ status: 'ok', timestamp: '2026-01-01T00:00:00.000Z' })
  })

  it('apiClient.get rejects with an error containing status code on non-2xx response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async () => ({ message: 'Not found' }),
    })
    global.fetch = mockFetch

    const { apiClient } = await import('../api')

    await expect(apiClient.get('/not-found')).rejects.toThrow('404')
  })

  it('apiClient.get rejects on 500 response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => ({ message: 'Internal error' }),
    })
    global.fetch = mockFetch

    const { apiClient } = await import('../api')

    await expect(apiClient.get('/fail')).rejects.toThrow('500')
  })

  it('apiClient.post sends a POST request with JSON body', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ id: 'new-item' }),
    })
    global.fetch = mockFetch

    const { apiClient } = await import('../api')
    await apiClient.post('/items', { name: 'test' })

    expect(mockFetch).toHaveBeenCalledOnce()
    const callArgs = mockFetch.mock.calls[0]
    expect(callArgs[1]).toMatchObject({
      method: 'POST',
      headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
    })
  })
})
