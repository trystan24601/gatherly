import express from 'express'
import { healthHandler } from './handlers/health'

export const app = express()

app.use(express.json())

// Health check — no authentication required
app.get('/health', healthHandler)
