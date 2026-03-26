import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import { healthHandler } from './handlers/health'
import { authRouter } from './handlers/auth'

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
