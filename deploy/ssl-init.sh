#!/usr/bin/env bash
# Issue Let's Encrypt SSL for my / account / api.nitajfx.online
# Run on the VPS from the project root:
#   bash deploy/ssl-init.sh
set -euo pipefail

cd "$(dirname "$0")/.."

EMAIL="${SSL_EMAIL:-admin@nitajfx.online}"
CERT_NAME="nitajfx"
LIVE_DIR="deploy/certbot/conf/live/${CERT_NAME}"

mkdir -p deploy/certbot/www deploy/certbot/conf

echo "==> Creating temporary self-signed cert (so nginx can start on :443)..."
if [[ ! -f "${LIVE_DIR}/fullchain.pem" ]]; then
  mkdir -p "${LIVE_DIR}"
  openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout "${LIVE_DIR}/privkey.pem" \
    -out "${LIVE_DIR}/fullchain.pem" \
    -subj "/CN=my.nitajfx.online" 2>/dev/null
  # Let's Encrypt also expects chain.pem / cert.pem in some setups
  cp "${LIVE_DIR}/fullchain.pem" "${LIVE_DIR}/cert.pem"
  cp "${LIVE_DIR}/fullchain.pem" "${LIVE_DIR}/chain.pem"
fi

echo "==> Starting stack..."
docker compose up -d --build

echo "==> Waiting for nginx..."
sleep 5

echo "==> Requesting Let's Encrypt certificate for:"
echo "    my.nitajfx.online"
echo "    account.nitajfx.online"
echo "    api.nitajfx.online"
echo "    Email: ${EMAIL}"

docker compose run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email "${EMAIL}" \
  --agree-tos \
  --no-eff-email \
  --cert-name "${CERT_NAME}" \
  -d my.nitajfx.online \
  -d account.nitajfx.online \
  -d api.nitajfx.online \
  --non-interactive \
  --force-renewal

echo "==> Reloading nginx..."
docker compose exec nginx nginx -s reload

echo ""
echo "SSL installed."
echo "Update .env to https and rebuild frontends:"
echo ""
echo "  WEB_ORIGIN=https://my.nitajfx.online"
echo "  API_PUBLIC_URL=https://api.nitajfx.online"
echo "  VITE_API_URL=https://api.nitajfx.online"
echo "  CORS_ORIGIN=https://my.nitajfx.online,https://account.nitajfx.online"
echo ""
echo "  docker compose up --build -d web admin api"
echo ""
echo "Open:"
echo "  https://my.nitajfx.online"
echo "  https://account.nitajfx.online"
echo "  https://api.nitajfx.online/health"
