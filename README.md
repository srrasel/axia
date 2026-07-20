# SEEKAPA Trading Platform

Full-stack trading platform with **PostgreSQL**, **Docker**, trading web app, and **Admin panel**.

## Stack

| Service | Port | Description |
|---------|------|-------------|
| `web` | 3000 | Trading platform (React) |
| `admin` | 3001 | Admin panel (React) |
| `api` | 4000 | Express + Prisma API |
| `db` | 5432 | PostgreSQL 16 |

## Quick start (Docker)

```bash
# optional: set Twelve Data key
# TWELVE_DATA_API_KEY=your_key

docker compose up --build
```

- Trading app: http://localhost:3000  
- Admin panel: http://localhost:3001  
- API health: http://localhost:4000/health  

### Seed logins

| App | Email | Password |
|-----|-------|----------|
| Trading | `mohammed.naser@example.com` | `demo123` |
| Admin | `admin@nitajfx.online` | `admin123` |
| Manager | `manager@nitajfx.online` | `manager123` |
| Employee | `employee@nitajfx.online` | `employee123` |

## Local development (without Docker for frontends)

```bash
# 1) Start database
docker compose up -d db

# 2) API
cd backend
cp .env.example .env   # or use existing .env
npm install
npx prisma db push
npm run db:seed
npm run dev

# 3) Trading web (new terminal)
cd ..
npm install
# ensure .env has VITE_API_URL=http://localhost:4000
npm run dev

# 4) Admin (new terminal)
cd admin
npm install
npm run dev
```

Admin runs on http://localhost:5174 · Trading on http://localhost:5173

## Admin capabilities

- Dashboard stats (users, deposits, open trades, KYC)
- Create / disable users, reset passwords
- Adjust account balances
- View & force-close trades
- Review transactions
- Approve / reject KYC documents
- Platform settings

## Environment

**Backend** (`backend/.env`):

```env
DATABASE_URL=postgresql://seekapa:seekapa@localhost:5432/seekapa?schema=public
JWT_SECRET=seekapa-dev-secret-change-me
PORT=4000
TWELVE_DATA_API_KEY=your_api_key_here
CORS_ORIGIN=http://localhost:5173,http://localhost:5174,http://localhost:3000,http://localhost:3001
```

**Frontends**:

```env
VITE_API_URL=http://localhost:4000
```
