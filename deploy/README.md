# NitajFX — VPS deploy + SSL

## Domains
| Host | App | Docker port |
|------|-----|-------------|
| `https://my.nitajfx.online` | Trading | `3000` |
| `https://account.nitajfx.online` | Admin | `3001` |
| `https://api.nitajfx.online` | API | `4000` |

## Fix: `502 Bad Gateway nginx/1.18.0 (Ubuntu)`

Host Ubuntu nginx owns `:80`/`:443`. Docker is fine — host nginx is proxying to the wrong place (or `localhost` → IPv6).

### On the VPS
```bash
cd /opt/axiatrade   # your project path
docker compose up -d --build

# Verify Docker directly (should work):
curl -I http://127.0.0.1:3000
curl -I http://127.0.0.1:3001
curl http://127.0.0.1:4000/health

# Point host nginx at Docker:
chmod +x deploy/fix-host-nginx-502.sh
bash deploy/fix-host-nginx-502.sh
```

Or manually:
```bash
sudo cp deploy/host-nginx/nitajfx.conf /etc/nginx/sites-available/nitajfx
sudo ln -sf /etc/nginx/sites-available/nitajfx /etc/nginx/sites-enabled/nitajfx
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

Use **`127.0.0.1:3000`** in `proxy_pass`, not `localhost` (avoids `::1` → 502).

```bash
sudo tail -n 50 /var/log/nginx/error.log
```

Do **not** run `docker compose --profile gateway` while host nginx is using 80/443.

---

## Alternative: Docker nginx only

```bash
sudo systemctl stop nginx && sudo systemctl disable nginx
bash deploy/ssl-init.sh
docker compose --profile gateway up -d --build
```

## DNS + firewall
A records → VPS IP for `my` / `account` / `api`.  
`ufw allow 80,443` + OpenSSH.

## Env
```env
WEB_ORIGIN=https://my.nitajfx.online
API_PUBLIC_URL=https://api.nitajfx.online
VITE_API_URL=
CORS_ORIGIN=https://my.nitajfx.online,https://account.nitajfx.online
```

## Local Windows
```bash
docker compose up --build -d
```
