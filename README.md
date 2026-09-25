# ProcessAI — Inteligência para Processos de Negócio

Plataforma web para análise inteligente de documentos de processos de negócio, detecção de
gaps e oportunidades, e modelagem visual de processos (BPMN 2.0) através de um assistente de
IA conversacional. Domínio alvo: **processo.site**.

Este repositório contém o **MVP funcional** descrito na seção 37 da especificação do produto:
cadastro/login, dashboard, cadastro de processos, upload e análise de documentos por IA,
extração estruturada (entradas, atividades, responsáveis, decisões, saídas, regras, gaps,
oportunidades), chat com IA, geração e edição visual de BPMN, refinamento do BPMN via chat,
configuração de provedores de IA (OpenAI/Anthropic), versionamento e exportação (BPMN XML e
relatório executivo em PDF).

## Arquitetura

```text
/backend   → API REST em Node.js + TypeScript + Express + Prisma (PostgreSQL)
/frontend  → SPA em React + TypeScript + Vite + Tailwind CSS
```

Estrutura interna do backend (seção 36 da especificação):

```text
backend/src
├── ai/              # Camada abstrata "AI Provider" (OpenAI, Anthropic, Local) + prompts internos versionados
│   ├── providers/
│   └── prompts/
├── api/
│   ├── routes/       # Rotas REST
│   └── middleware/    # Autenticação, tratamento de erros
├── auth/             # Registro, login, JWT
├── audit/            # Log de auditoria
├── bpmn/              # Geração/serialização de XML BPMN 2.0 e sincronização estrutural
├── documents/         # Upload, storage (adaptador local/S3-compatível) e parsers (PDF/DOCX/XLSX/CSV/TXT/OCR)
├── notifications/      # Envio de e-mail (SMTP via nodemailer)
├── reports/           # Geração de relatório executivo em PDF
└── config/            # Env, logger, Prisma client
```

### Camada de IA (multi-provider)

Implementada conforme a seção 21 da especificação: uma interface `AIProvider` única
(`analyzeDocument`, `extractProcess`, `identifyGaps`, `identifyOpportunities`, `generateProcess`,
`generateBPMN`, `refineBPMN`, `analyzeBPMN`, `generateReport`) com três implementações:

- `OpenAIProvider` — usa a API oficial da OpenAI (`openai` SDK)
- `AnthropicProvider` — usa a API oficial da Anthropic (`@anthropic-ai/sdk`)
- `LocalProvider` — fallback heurístico **sem dependência externa**, usado automaticamente
  quando nenhuma chave de IA está configurada, para que o sistema seja sempre funcional
  (útil em desenvolvimento/demonstração e como ponto de extensão para modelos locais)

As chaves de API são armazenadas **criptografadas** (AES-256-GCM) no banco, nunca retornadas
por completo ao frontend (apenas os últimos 4 dígitos), e o teste de conexão nunca loga a chave.

### Banco de dados

Schema Prisma completo (seção 23) com todas as entidades: `users`, `organizations`, `projects`,
`processes`, `process_versions`, `process_elements`, `process_connections`, `documents`,
`document_chunks`, `analysis_results`, `gaps`, `opportunities`, `actions`, `ai_providers`,
`ai_models`, `ai_usage`, `conversations`, `messages`, `bpmn_versions`, `audit_logs`.

## Rodando localmente

### Pré-requisitos

- Node.js 20+
- PostgreSQL 14+
- (Opcional) Redis — reservado para filas futuras, não é requisito do MVP atual

### Backend

```bash
cd backend
cp .env.example .env
# edite .env: DATABASE_URL, JWT_SECRET, ENCRYPTION_KEY (32 bytes em hex — use `openssl rand -hex 32`)
npm install
npx prisma migrate dev
npm run dev   # http://localhost:4000
```

### Frontend

```bash
cd frontend
npm install
npm run dev   # http://localhost:5173 (proxy /api → localhost:4000)
```

Acesse `http://localhost:5173`, crie uma conta (isso cria a organização automaticamente) e
comece a usar. Sem nenhum provedor de IA configurado, o sistema funciona com o `LocalProvider`
heurístico; para IA generativa real, configure OpenAI e/ou Anthropic em
**Configurações → APIs de IA**.

## O que está implementado (MVP)

- [x] Autenticação (registro/login com JWT, multi-organização) + e-mail de boas-vindas
- [x] Dashboard com indicadores reais (processos, gaps, oportunidades, automação, saúde média)
- [x] CRUD de processos + criação assistida por IA a partir de uma descrição
- [x] Upload de documentos (PDF, DOCX, XLSX, CSV, TXT, imagens com OCR) com extração de texto
- [x] Pipeline de análise por IA com progresso em tempo real (Server-Sent Events) pelas 13 etapas
      da seção 5 da especificação
- [x] Extração estruturada com rastreabilidade (evidência textual) e nível de confiança
      (alta/média/baixa), nunca inventando informação ausente
- [x] Detecção de gaps e oportunidades persistida e gerenciável (status, responsável, prazo)
- [x] Assistente de IA conversacional por processo, com histórico persistido
- [x] Geração de BPMN 2.0 por IA e construção incremental via chat (nunca altera o BPMN
      silenciosamente — toda ação é explicitada na conversa)
- [x] Editor visual BPMN (bpmn-js) com paleta completa, zoom, propriedades por elemento
- [x] "Analisar BPMN com IA" — saúde do processo (0–100) com critérios explicados
- [x] Versionamento de processos (AS-IS/TO-BE, restaurar versão anterior)
- [x] Exportação BPMN XML e relatório executivo em PDF
- [x] Configuração de provedores de IA com mascaramento de chave e teste de conexão
- [x] Auditoria (ações, usuário, processo) e painel de consumo de IA (tokens/custo estimado)
- [x] Gestão de usuários da organização com convite por e-mail

## Próximos passos sugeridos (pós-MVP)

- Comparação AS-IS x TO-BE lado a lado (dados já modelados via `ProcessVersion`; falta a UI)
- Simulação de processo (volume, SLA, gargalos)
- Painel de "Perguntas da IA" dedicado (hoje as perguntas aparecem como mensagens no chat)
- Motor de regras estruturado (hoje as regras são extraídas como texto)
- Suporte a Google/Azure OpenAI na fábrica de providers (interface já preparada)
- Filas assíncronas (Redis/BullMQ) para análises de documentos muito grandes
- Testes automatizados (unitários e E2E)
