import { Router } from 'express'

const router = Router()

router.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  })
})

router.get('/ready', (_req, res) => {
  res.json({ status: 'ready' })
})

router.get('/live', (_req, res) => {
  res.json({ status: 'alive' })
})

export { router as healthRoutes }