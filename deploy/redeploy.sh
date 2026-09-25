#!/usr/bin/env bash
# ProcessAI — Atualiza o deploy existente com o código mais recente do branch.
# Uso (como root): APP_DIR=/opt/processai BRANCH=main bash redeploy.sh

set -euo pipefail

APP_DIR="${APP_DIR:-/opt/processai}"
BRANCH="${BRANCH:-claude/processai-document-analysis-j5swuk}"
APP_USER="processai"

echo "==> Atualizando código ($BRANCH)"
sudo -u "$APP_USER" git -C "$APP_DIR" fetch origin
sudo -u "$APP_USER" git -C "$APP_DIR" checkout "$BRANCH"
sudo -u "$APP_USER" git -C "$APP_DIR" pull origin "$BRANCH"

echo "==> Backend: instalando dependências, migrations e build"
sudo -u "$APP_USER" bash -c "cd $APP_DIR/backend && npm ci && npx prisma migrate deploy && npm run build"

echo "==> Frontend: build"
sudo -u "$APP_USER" bash -c "cd $APP_DIR/frontend && npm ci && npm run build"

echo "==> Reiniciando backend"
systemctl restart processai-backend
systemctl reload nginx

echo "==> Concluído. Status:"
systemctl status processai-backend --no-pager -l | head -15
