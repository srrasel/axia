#!/usr/bin/env bash
# Fix Ubuntu host nginx 502 by proxying to Docker ports 3000/3001/4000.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/deploy/host-nginx/nitajfx.conf"
DEST=/etc/nginx/sites-available/nitajfx

echo "==> Checking Docker apps on 3000 / 3001 / 4000..."
curl -fsS -o /dev/null -w "web  :%{http_code}\n" http://127.0.0.1:3000/ || {
  echo "FAIL: web not reachable on 127.0.0.1:3000 — run: docker compose up -d"
  exit 1
}
curl -fsS -o /dev/null -w "admin:%{http_code}\n" http://127.0.0.1:3001/ || {
  echo "FAIL: admin not reachable on 127.0.0.1:3001"
  exit 1
}
curl -fsS -o /dev/null -w "api  :%{http_code}\n" http://127.0.0.1:4000/health || {
  echo "FAIL: api not reachable on 127.0.0.1:4000"
  exit 1
}

sudo mkdir -p /var/www/certbot

install_http_bootstrap() {
  sudo tee "$DEST" >/dev/null <<'EOF'
upstream nitaj_web { server 127.0.0.1:3000; }
upstream nitaj_admin { server 127.0.0.1:3001; }
upstream nitaj_api { server 127.0.0.1:4000; }

server {
  listen 80;
  listen [::]:80;
  server_name my.nitajfx.online;
  location /.well-known/acme-challenge/ { root /var/www/certbot; }
  location /api/ {
    proxy_pass http://nitaj_api;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
  location / {
    proxy_pass http://nitaj_web;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}

server {
  listen 80;
  listen [::]:80;
  server_name account.nitajfx.online;
  location /.well-known/acme-challenge/ { root /var/www/certbot; }
  location /api/ {
    proxy_pass http://nitaj_api;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
  location / {
    proxy_pass http://nitaj_admin;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}

server {
  listen 80;
  listen [::]:80;
  server_name api.nitajfx.online;
  location /.well-known/acme-challenge/ { root /var/www/certbot; }
  location / {
    proxy_pass http://nitaj_api;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
EOF
}

echo "==> Installing host nginx site..."
sudo ln -sf "$DEST" /etc/nginx/sites-enabled/nitajfx
sudo rm -f /etc/nginx/sites-enabled/default

if [[ -f /etc/letsencrypt/live/my.nitajfx.online/fullchain.pem ]]; then
  sudo cp "$SRC" "$DEST"
else
  echo "==> SSL certs missing — installing HTTP proxy (stops 502)..."
  install_http_bootstrap
  sudo nginx -t
  sudo systemctl reload nginx

  if command -v certbot >/dev/null 2>&1; then
    EMAIL="${SSL_EMAIL:-admin@nitajfx.online}"
    echo "==> Requesting Let's Encrypt certs..."
    sudo certbot certonly --webroot -w /var/www/certbot \
      -d my.nitajfx.online -d account.nitajfx.online -d api.nitajfx.online \
      --email "$EMAIL" --agree-tos --non-interactive || true
  else
    echo "Optional: sudo apt install -y certbot python3-certbot-nginx"
  fi

  if [[ -f /etc/letsencrypt/live/my.nitajfx.online/fullchain.pem ]]; then
    sudo cp "$SRC" "$DEST"
    # certbot often stores one multi-SAN cert under the first domain name
    if [[ ! -f /etc/letsencrypt/live/account.nitajfx.online/fullchain.pem ]]; then
      echo "==> Using multi-domain cert under my.nitajfx.online/..."
      sudo sed -i \
        -e 's|/etc/letsencrypt/live/account.nitajfx.online/|/etc/letsencrypt/live/my.nitajfx.online/|g' \
        -e 's|/etc/letsencrypt/live/api.nitajfx.online/|/etc/letsencrypt/live/my.nitajfx.online/|g' \
        "$DEST"
    fi
  else
    echo "WARN: certs still missing — HTTP proxy is active (Docker → no more 502)."
    echo "      Later: sudo certbot --nginx -d my.nitajfx.online -d account.nitajfx.online -d api.nitajfx.online"
    exit 0
  fi
fi

sudo nginx -t
sudo systemctl reload nginx
echo "==> Done. Host nginx proxies to Docker on 127.0.0.1:3000/3001/4000"
