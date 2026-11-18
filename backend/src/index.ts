import dotenv from 'dotenv'
dotenv.config()

import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'

import { errorHandler } from './middleware/errorHandler.js'
import { authMiddleware, optionalAuthMiddleware } from './middleware/auth.js'
import { authRoutes } from './routes/auth.js'
import { habitRoutes } from './routes/habits.js'
import predictionRoutes from './routes/predictions.js'
import simulationRoutes from './routes/simulations.js'
import { profileRoutes } from './routes/profile.js'
import { healthRoutes } from './routes/health.js'
import { analyticsRoutes } from './routes/analytics.js'
import aiRoutes from './routes/ai.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}))

app.use(cors({
  origin: process.env.FRONTEND_URL ? [process.env.FRONTEND_URL, 'http://localhost:5173'] : true,
  credentials: true,
}))

app.use(morgan('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later' },
})
app.use('/api/', limiter)

app.use('/api/health', healthRoutes)
app.use('/health', healthRoutes)
app.use('/api/auth', authRoutes)
app.use('/auth', authRoutes)
app.use('/api/habits', authMiddleware, habitRoutes)
app.use('/habits', authMiddleware, habitRoutes)
app.use('/api/predictions', authMiddleware, predictionRoutes)
app.use('/predictions', authMiddleware, predictionRoutes)
app.use('/api/simulations', authMiddleware, simulationRoutes)
app.use('/simulations', authMiddleware, simulationRoutes)
app.use('/api/profile', authMiddleware, profileRoutes)
app.use('/profile', authMiddleware, profileRoutes)
app.use('/api/analytics', authMiddleware, analyticsRoutes)
app.use('/analytics', authMiddleware, analyticsRoutes)
app.use('/api/ai', optionalAuthMiddleware, aiRoutes)
app.use('/ai', optionalAuthMiddleware, aiRoutes)

app.use(errorHandler)

const isServerless = !!(process.env.VERCEL || process.env.NOW_REGION || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT)

if (!isServerless) {
  app.listen(PORT, () => {
    console.log(`🚀 Backend server running on http://localhost:${PORT}`)
  })
}

export default app