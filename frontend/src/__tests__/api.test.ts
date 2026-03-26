/**
 * FE-TEST-07: Tests for apiClient — credentials inclusion
 *
 * Verifies that all apiClient methods include credentials: 'include'
 * so the sid cookie is sent cross-origin.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { apiClient } from '../lib/api'

describe('apiClient — credentials: include', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fetchSpy: any

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )
  })

  afterEach(() => {
    fetchSpy.mockRestore()
  })

  it('apiClient.get includes credentials: include', async () => {
    await apiClient.get('/test')

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ credentials: 'include' })
    )
  })

  it('apiClient.post includes credentials: include', async () => {
    await apiClient.post('/test', { data: 1 })

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ credentials: 'include' })
    )
  })

  it('apiClient.put includes credentials: include', async () => {
    await apiClient.put('/test', { data: 1 })

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ credentials: 'include' })
    )
  })

  it('apiClient.delete includes credentials: include', async () => {
    await apiClient.delete('/test')

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ credentials: 'include' })
    )
  })

  it('apiClient throws a typed error with parsed body on non-ok response', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Invalid email or password.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    await expect(apiClient.get('/auth/me')).rejects.toMatchObject({
      status: 401,
      body: { error: 'Invalid email or password.' },
    })
  })
})
