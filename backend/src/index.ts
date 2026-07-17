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
import { ensureBankAccounts } from './bankAccounts.js'

async function main() {
  const app = express()
  const port = Number(process.env.PORT || 4000)
  const origins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:5174')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  app.use(
    cors({
      origin: (origin, cb) => {
        // Same-origin / curl / server-to-server have no Origin
        if (!origin) return cb(null, true)
        if (origins.includes(origin) || origins.includes('*')) return cb(null, true)
        return cb(null, false)
      },
      credentials: true,
    }),
  )
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
  await ensureBankAccounts()

  app.listen(port, '0.0.0.0', () => {
    console.log(`NitajFX API listening on 0.0.0.0:${port}`)
  })

  setInterval(() => {
    void runMarketTick().catch((err) => console.error('tick failed', err))
  }, 3000)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
