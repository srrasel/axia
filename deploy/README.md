# NitajFX — VPS deploy + SSL

## Domains
| Host | App |
|------|-----|
| `https://my.nitajfx.online` | Trading |
| `https://account.nitajfx.online` | Admin |
| `https://api.nitajfx.online` | API |

## 1. DNS
A records → VPS IP:
- `my.nitajfx.online`
- `account.nitajfx.online`
- `api.nitajfx.online`

## 2. Firewall
```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## 3. Install Docker + clone project
```bash
# Docker install (Ubuntu) — see earlier steps, then:
cd /opt
sudo git clone YOUR_REPO axiatrade
cd axiatrade
cp .env.example .env
nano .env   # set JWT_SECRET, TWELVE_DATA_API_KEY, SSL_EMAIL
```

## 4. Install SSL (Let's Encrypt)
```bash
chmod +x deploy/ssl-init.sh deploy/ssl-renew.sh
bash deploy/ssl-init.sh
```

This will:
1. Create a temporary cert so nginx can listen on 443
2. Request a real certificate for all 3 domains
3. Reload nginx

## 5. Point app to HTTPS + rebuild
Edit `.env`:
```env
WEB_ORIGIN=https://my.nitajfx.online
API_PUBLIC_URL=https://api.nitajfx.online
VITE_API_URL=https://api.nitajfx.online
CORS_ORIGIN=https://my.nitajfx.online,https://account.nitajfx.online
```

```bash
docker compose up --build -d
```

## 6. Auto-renew (cron)
```bash
sudo crontab -e
```
Add:
```
0 3 1 * * cd /opt/axiatrade && bash deploy/ssl-renew.sh >> /var/log/nitajfx-ssl-renew.log 2>&1
```

## Troubleshooting
```bash
docker compose logs nginx
docker compose run --rm --entrypoint certbot certbot certificates
curl -I https://my.nitajfx.online
```

If cert fails: DNS must already point to this VPS, and ports 80/443 must be open.
