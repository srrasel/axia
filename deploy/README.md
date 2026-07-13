# NitajFX — nginx Docker domains

## Domains
| Host | App | Direct port |
|------|-----|-------------|
| `my.nitajfx.online` | Trading web | also `:3000` |
| `account.nitajfx.online` | Admin CRM | also `:3001` |
| `api.nitajfx.online` | API | also `:4000` |

Postgres stays on `:5432`.

## DNS
Point these A records to your server IP:
- `my.nitajfx.online`
- `account.nitajfx.online`
- `api.nitajfx.online`

## Run
```bash
cp .env.example .env
# edit .env — if no SSL yet, use http:// URLs for WEB_ORIGIN / API_PUBLIC_URL / VITE_API_URL

docker compose up --build -d
```

Open:
- http://my.nitajfx.online
- http://account.nitajfx.online
- http://api.nitajfx.online/health
- http://SERVER_IP:4000/health (direct API)

## HTTPS later
Put Certbot / Cloudflare / another TLS terminator in front of port 80, or add a `443` listener with certificates under `deploy/nginx/certs/`.
