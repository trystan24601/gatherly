import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import { healthHandler } from './handlers/health'
import { authRouter } from './handlers/auth'
import { organisationsRouter } from './handlers/organisations'
import { adminOrgsRouter } from './handlers/admin-organisations'
import { requireAuth, requireRole, requireApprovedOrg } from './middleware/auth.middleware'
import { resetLimiter } from './lib/rateLimiter'
import { orgEventsRouter } from './handlers/org-events'

export const app = express()

// CORS — allow the configured frontend origin to send cookies cross-origin
const allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:5173').split(',')

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. server-to-server, curl)
      if (!origin) {
        callback(null, true)
        return
      }
      if (allowedOrigins.some((o) => origin.startsWith(o.trim()))) {
        callback(null, true)
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`))
      }
    },
    credentials: true,
  })
)

app.use(express.json())
app.use(cookieParser())

// Health check — no authentication required
app.get('/health', healthHandler)

// Authentication routes
app.use('/auth', authRouter)

// Organisation registration (public)
app.use('/organisations', organisationsRouter)

// Admin organisation management (requires SUPER_ADMIN)
app.use('/admin/organisations', requireAuth, requireRole('SUPER_ADMIN'), adminOrgsRouter)

// Org Admin event management (requires approved ORG_ADMIN)
app.use(
  '/organisation/events',
  requireAuth,
  requireRole('ORG_ADMIN'),
  requireApprovedOrg,
  orgEventsRouter
)

// Test-only: reset in-memory rate limiter (non-production only)
if (process.env.NODE_ENV !== 'production') {
  app.post('/test/reset-rate-limiter', (_req, res) => {
    resetLimiter()
    res.status(204).send()
  })
}
