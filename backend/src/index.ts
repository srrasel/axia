import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { authRouter } from './routes/auth.js'
import { userRouter } from './routes/user.js'
import { adminRouter } from './routes/admin.js'
import { crmRouter } from './routes/crm.js'
import { paymentsRouter } from './routes/payments.js'
import { runMarketTick } from './tick.js'
import { ensureDefaultSettings } from './settings.js'

async function main() {
  const app = express()
  const port = Number(process.env.PORT || 4000)
  const origins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:5174')
    .split(',')
    .map((s) => s.trim())

  app.use(cors({ origin: origins, credentials: true }))
  app.use(express.json({ limit: '2mb' }))

  app.get('/health', (_req, res) => res.json({ ok: true, service: 'seekapa-api' }))
  app.use('/api/auth', authRouter)
  app.use('/api/payments', paymentsRouter)
  app.use('/api', userRouter)
  app.use('/api/admin', adminRouter)
  app.use('/api/admin/crm', crmRouter)

  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  })

  await ensureDefaultSettings()

  app.listen(port, () => {
    console.log(`NitajFX API listening on :${port}`)
  })

  setInterval(() => {
    void runMarketTick().catch((err) => console.error('tick failed', err))
  }, 3000)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
