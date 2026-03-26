import { describe, it, expect } from 'vitest'
import request from 'supertest'

// BE-TEST-06: /health handler tests
// These tests import from '../../app' which does NOT exist yet — all must FAIL

describe('GET /health', () => {
  it('returns HTTP 200', async () => {
    const { app } = await import('../../app')
    const response = await request(app).get('/health')
    expect(response.status).toBe(200)
  })

  it('returns {status: "ok"} in response body', async () => {
    const { app } = await import('../../app')
    const response = await request(app).get('/health')
    expect(response.body.status).toBe('ok')
  })

  it('response body contains a valid ISO 8601 timestamp', async () => {
    const { app } = await import('../../app')
    const response = await request(app).get('/health')
    const { timestamp } = response.body
    expect(typeof timestamp).toBe('string')
    // A valid ISO 8601 string round-trips through Date
    expect(new Date(timestamp).toISOString()).toBe(timestamp)
  })

  it('requires no authentication — returns 200 without any auth headers', async () => {
    const { app } = await import('../../app')
    const response = await request(app)
      .get('/health')
      .set({}) // no auth headers
    expect(response.status).toBe(200)
  })
})
