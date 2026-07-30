#!/bin/sh
set -e

echo "[api] waiting for database at db:5432..."
node <<'NODE'
const net = require('net')
const tryOnce = () =>
  new Promise((resolve, reject) => {
    const s = net.connect(5432, 'db', () => {
      s.end()
      resolve()
    })
    s.on('error', reject)
    s.setTimeout(2000, () => {
      s.destroy()
      reject(new Error('timeout'))
    })
  })
;(async () => {
  for (let i = 0; i < 60; i++) {
    try {
      await tryOnce()
      console.log('[api] database port is open')
      process.exit(0)
    } catch {
      await new Promise((r) => setTimeout(r, 1000))
    }
  }
  console.error('[api] database not reachable')
  process.exit(1)
})()
NODE

echo "[api] applying schema (prisma db push)..."
# Unique indexes / enum upgrades need this flag on existing DBs
npx prisma db push --skip-generate --accept-data-loss

echo "[api] backfilling null crmNumbers (best-effort)..."
npx prisma db execute --stdin <<'SQL' || true
UPDATE "User" u
SET "crmNumber" = sub.n
FROM (
  SELECT id, 10000 + ROW_NUMBER() OVER (ORDER BY "createdAt") AS n
  FROM "User"
  WHERE "crmNumber" IS NULL AND role = 'USER'
) sub
WHERE u.id = sub.id;
SQL

echo "[api] seeding (best-effort)..."
npx tsx prisma/seed.ts || echo "[api] seed warning (non-fatal)"

echo "[api] starting server..."
exec node dist/index.js
