# Deploy do ProcessAI no VPS Hostinger (processo.site)

Scripts para provisionar o VPS do zero (Ubuntu) com PostgreSQL, Node.js, Nginx e SSL
(Let's Encrypt), e para atualizar o deploy depois.

## Pré-requisitos

1. **DNS**: crie um registro **A** apontando `processo.site` (e `www.processo.site`, opcional
   mas recomendado) para o IP do VPS (`212.85.21.101`). A emissão do certificado SSL só
   funciona depois que o DNS propagar — pode levar de minutos a algumas horas.
2. Acesso root via SSH ao VPS.

## Primeiro deploy

Conecte no VPS e rode:

```bash
ssh root@212.85.21.101
curl -fsSL https://raw.githubusercontent.com/antonioctj/portal_processos/claude/processai-document-analysis-j5swuk/deploy/provision.sh -o provision.sh
bash provision.sh
```

Ou, se preferir clonar o repositório primeiro:

```bash
ssh root@212.85.21.101
git clone --branch claude/processai-document-analysis-j5swuk https://github.com/antonioctj/portal_processos.git /opt/processai
bash /opt/processai/deploy/provision.sh
```

O script é **idempotente** (pode rodar de novo sem quebrar nada) e faz tudo sozinho:
instala Node 22, PostgreSQL, Nginx e Certbot; cria o usuário de sistema `processai`; cria o
banco `processai` com senha forte gerada automaticamente; gera `backend/.env` com
`JWT_SECRET`/`ENCRYPTION_KEY` aleatórios; builda backend e frontend; roda as migrations do
Prisma; sobe o backend como serviço systemd (`processai-backend`, porta 4000 só em
localhost); configura o Nginx servindo o frontend e fazendo proxy de `/api`; e emite o
certificado SSL para `processo.site`.

Os segredos gerados (senha do banco, JWT secret, chave de criptografia) ficam salvos em
`/root/.processai-secrets` — guarde uma cópia em local seguro.

Ao final, acesse **https://processo.site**, crie sua conta (isso cria a organização) e
configure os provedores de IA em **Configurações → APIs de IA**.

## Variáveis opcionais

```bash
DOMAIN=processo.site \
EMAIL=seu-email@dominio.com \
BRANCH=claude/processai-document-analysis-j5swuk \
bash provision.sh
```

## Atualizando depois de novos commits

```bash
bash /opt/processai/deploy/redeploy.sh
```

Isso puxa o branch configurado, reinstala dependências se necessário, roda migrations
pendentes, rebuilda backend e frontend, e reinicia o serviço.

## Comandos úteis

```bash
systemctl status processai-backend      # status do backend
journalctl -u processai-backend -f      # logs em tempo real
systemctl restart processai-backend     # reiniciar após editar backend/.env
nginx -t && systemctl reload nginx      # validar e recarregar config do Nginx
sudo -u postgres psql processai         # acessar o banco diretamente
```

## Quando migrar para o branch `main`

Este deploy usa o branch de desenvolvimento `claude/processai-document-analysis-j5swuk`
por padrão, pois o repositório ainda não tem um branch `main`. Quando o código for
revisado e você quiser torná-lo a versão estável, crie/atualize o `main` a partir dele e
rode `BRANCH=main bash redeploy.sh` (ajustando `BRANCH` no systemd/redeploy conforme
necessário).
