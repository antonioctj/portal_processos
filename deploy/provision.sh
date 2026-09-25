#!/usr/bin/env bash
# ProcessAI — Provisionamento completo em VPS Ubuntu (Hostinger)
#
# O que este script faz (idempotente — pode rodar mais de uma vez):
#   1. Instala Node.js 22, PostgreSQL, Nginx, Certbot, git
#   2. Cria usuário de sistema dedicado (processai) e diretório /opt/processai
#   3. Clona/atualiza o repositório e faz checkout do branch informado
#   4. Cria o banco e o usuário PostgreSQL com senha forte gerada automaticamente
#   5. Gera backend/.env com segredos aleatórios (JWT_SECRET, ENCRYPTION_KEY, DATABASE_URL)
#   6. Instala dependências, builda backend e frontend, roda as migrations do Prisma
#   7. Configura o serviço systemd do backend (porta 4000, somente localhost)
#   8. Configura o Nginx (processo.site) servindo o frontend e proxy para /api
#   9. Emite certificado SSL via Let's Encrypt (Certbot) para processo.site
#
# Uso (como root):
#   DOMAIN=processo.site EMAIL=antonio.actj@gmail.com REPO_URL=https://github.com/antonioctj/portal_processos.git BRANCH=main \
#     bash provision.sh
#
# Variáveis de ambiente aceitas (todas têm valor padrão sensato):
#   DOMAIN     (padrão: processo.site)
#   EMAIL      (padrão: antonio.actj@gmail.com)     — usado no certificado SSL
#   REPO_URL   (padrão: https://github.com/antonioctj/portal_processos.git)
#   BRANCH     (padrão: main)
#   APP_DIR    (padrão: /opt/processai)
#   NODE_MAJOR (padrão: 22)

set -euo pipefail

DOMAIN="${DOMAIN:-processo.site}"
EMAIL="${EMAIL:-antonio.actj@gmail.com}"
REPO_URL="${REPO_URL:-https://github.com/antonioctj/portal_processos.git}"
BRANCH="${BRANCH:-claude/processai-document-analysis-j5swuk}"
APP_DIR="${APP_DIR:-/opt/processai}"
NODE_MAJOR="${NODE_MAJOR:-22}"
APP_USER="processai"
DB_NAME="processai"
DB_USER="processai"
SECRETS_FILE="/root/.processai-secrets"

log() { echo -e "\n\033[1;32m==> $1\033[0m"; }

if [[ $EUID -ne 0 ]]; then
  echo "Rode este script como root (sudo -i && bash provision.sh)" >&2
  exit 1
fi

log "1/9 — Pacotes base"
apt-get update -y
apt-get install -y curl git ca-certificates gnupg ufw

log "2/9 — Node.js ${NODE_MAJOR}.x"
if ! command -v node >/dev/null || [[ "$(node -v | cut -d. -f1 | tr -d v)" != "$NODE_MAJOR" ]]; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y nodejs
fi
node -v
npm -v

log "3/9 — PostgreSQL"
apt-get install -y postgresql postgresql-contrib
systemctl enable --now postgresql

log "4/9 — Nginx + Certbot"
apt-get install -y nginx certbot python3-certbot-nginx
systemctl enable --now nginx

log "5/9 — Firewall (ufw)"
ufw allow OpenSSH >/dev/null 2>&1 || true
ufw allow "Nginx Full" >/dev/null 2>&1 || true
yes | ufw enable >/dev/null 2>&1 || true

log "6/9 — Usuário de sistema e diretório da aplicação"
id -u "$APP_USER" >/dev/null 2>&1 || useradd --system --create-home --shell /usr/sbin/nologin "$APP_USER"
mkdir -p "$APP_DIR"
if [[ -d "$APP_DIR/.git" ]]; then
  git -C "$APP_DIR" fetch origin
  git -C "$APP_DIR" checkout "$BRANCH"
  git -C "$APP_DIR" pull origin "$BRANCH"
else
  git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
fi
chown -R "$APP_USER":"$APP_USER" "$APP_DIR"

log "7/9 — Banco de dados PostgreSQL"
if [[ ! -f "$SECRETS_FILE" ]]; then
  DB_PASSWORD="$(openssl rand -hex 24)"
  JWT_SECRET="$(openssl rand -hex 32)"
  ENCRYPTION_KEY="$(openssl rand -hex 32)"
  umask 077
  cat > "$SECRETS_FILE" <<SECRETS
DB_PASSWORD=$DB_PASSWORD
JWT_SECRET=$JWT_SECRET
ENCRYPTION_KEY=$ENCRYPTION_KEY
SECRETS
  echo "Segredos gerados e salvos em $SECRETS_FILE (guarde este arquivo em local seguro)"
else
  log "Segredos já existentes em $SECRETS_FILE — reutilizando"
  # shellcheck disable=SC1090
  source "$SECRETS_FILE"
fi
# shellcheck disable=SC1090
source "$SECRETS_FILE"

DB_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'")
if [[ "$DB_EXISTS" != "1" ]]; then
  sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD' CREATEDB;"
  sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"
else
  sudo -u postgres psql -c "ALTER USER $DB_USER WITH PASSWORD '$DB_PASSWORD';"
fi

# Garante autenticação por senha via TCP local (idempotente)
PG_HBA=$(sudo -u postgres psql -tAc "SHOW hba_file;")
if ! grep -q "^host\s\+all\s\+all\s\+127.0.0.1/32\s\+md5" "$PG_HBA" 2>/dev/null; then
  echo "host    all             all             127.0.0.1/32            md5" >> "$PG_HBA"
  systemctl restart postgresql
fi

log "8/9 — Arquivo .env do backend"
BACKEND_ENV="$APP_DIR/backend/.env"
cat > "$BACKEND_ENV" <<ENV
PORT=4000
NODE_ENV=production
APP_URL=https://$DOMAIN
CORS_ORIGIN=https://$DOMAIN

DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@127.0.0.1:5432/$DB_NAME?schema=public"
REDIS_URL="redis://localhost:6379"

JWT_SECRET="$JWT_SECRET"
JWT_EXPIRES_IN="7d"

ENCRYPTION_KEY="$ENCRYPTION_KEY"

STORAGE_DRIVER="local"
STORAGE_LOCAL_PATH="./storage"
S3_ENDPOINT=""
S3_BUCKET=""
S3_ACCESS_KEY=""
S3_SECRET_KEY=""
S3_REGION="us-east-1"

# Preencha para habilitar envio de e-mail (convites de usuário, boas-vindas).
# Depois de editar, rode: systemctl restart processai-backend
SMTP_HOST=""
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASSWORD=""
SMTP_FROM="ProcessAI <no-reply@$DOMAIN>"

# As chaves de IA (OpenAI/Anthropic) são configuradas pelo próprio app, em
# Configurações → APIs de IA — não é necessário preenchê-las aqui.
OPENAI_API_KEY=""
ANTHROPIC_API_KEY=""
ENV
chown "$APP_USER":"$APP_USER" "$BACKEND_ENV"
chmod 600 "$BACKEND_ENV"

log "9/9 — Build e migrations"
sudo -u "$APP_USER" bash -c "cd $APP_DIR/backend && npm ci && npx prisma migrate deploy && npm run build"
mkdir -p "$APP_DIR/backend/storage"
chown -R "$APP_USER":"$APP_USER" "$APP_DIR/backend/storage"

sudo -u "$APP_USER" bash -c "cd $APP_DIR/frontend && npm ci && npm run build"

log "Serviço systemd"
cp "$APP_DIR/deploy/processai-backend.service" /etc/systemd/system/processai-backend.service
sed -i "s#__APP_DIR__#$APP_DIR#g; s#__APP_USER__#$APP_USER#g" /etc/systemd/system/processai-backend.service
systemctl daemon-reload
systemctl enable processai-backend
systemctl restart processai-backend

log "Nginx"
cp "$APP_DIR/deploy/nginx-processo.site.conf" "/etc/nginx/sites-available/$DOMAIN.conf"
sed -i "s#__DOMAIN__#$DOMAIN#g; s#__APP_DIR__#$APP_DIR#g" "/etc/nginx/sites-available/$DOMAIN.conf"
ln -sf "/etc/nginx/sites-available/$DOMAIN.conf" "/etc/nginx/sites-enabled/$DOMAIN.conf"
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

log "SSL (Let's Encrypt)"
certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos -m "$EMAIL" --redirect || \
  echo "AVISO: emissão de SSL falhou — confirme que o DNS de $DOMAIN já aponta para este servidor e rode novamente: certbot --nginx -d $DOMAIN -d www.$DOMAIN"

log "Concluído!"
echo "Backend:  systemctl status processai-backend"
echo "Logs:     journalctl -u processai-backend -f"
echo "Segredos: cat $SECRETS_FILE"
echo "Acesse:   https://$DOMAIN"
