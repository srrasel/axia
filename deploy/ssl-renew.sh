#!/usr/bin/env bash
# Renew Let's Encrypt certs and reload nginx
# Cron example (monthly):
#   0 3 1 * * cd /opt/axiatrade && bash deploy/ssl-renew.sh >> /var/log/ssl-renew.log 2>&1
set -euo pipefail

cd "$(dirname "$0")/.."

docker compose run --rm certbot renew --webroot -w /var/www/certbot
docker compose exec nginx nginx -s reload

echo "Renew done: $(date -Is)"
