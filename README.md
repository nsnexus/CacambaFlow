# CaçambaFlow — Monorepo

Sistema SaaS de gestão operacional de locação de caçambas.

## Estrutura do Projeto

```
/apps
  /web        → Painel web (Next.js 14 + TypeScript)
  /mobile     → App motorista (React Native + Expo)
/packages
  /types      → Tipos TypeScript compartilhados
  /validation → Schemas de validação (Zod)
  /ui         → Componentes compartilhados
  /sync-engine → Motor de sincronização offline
/supabase
  /migrations → Migrations do banco de dados PostgreSQL
  /functions  → Edge Functions
  /seed       → Dados de seed para desenvolvimento
/docs
  /adr        → Architecture Decision Records
```

## Pré-requisitos

- Node.js >= 20.x
- npm >= 10.x
- Conta no [Supabase](https://supabase.com)
- Para o app mobile: [Expo CLI](https://docs.expo.dev/get-started/installation/)

## Primeiros Passos

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente do painel web

```bash
cp apps/web/.env.example apps/web/.env.local
# Edite apps/web/.env.local com os dados do seu projeto Supabase
```

### 3. Rodar as migrations no Supabase

Acesse o **SQL Editor** do seu projeto Supabase e execute os arquivos em ordem:
- `supabase/migrations/001_tenants_and_users.sql`

### 4. Rodar o painel web em desenvolvimento

```bash
npm run dev --workspace=apps/web
# ou
npx turbo run dev --filter=@cacambaflow/web
```

Acesse: http://localhost:3000

### 5. Rodar o app mobile

```bash
cd apps/mobile
npx expo start --android
```

## Fases de Desenvolvimento

Consulte o [Plano Subdividido](../../.gemini/antigravity-ide/brain/42d29df4-8c30-4b3f-8c8b-4867a482005c/plano_subdividido.md) para acompanhar o progresso.

| Fase | Status |
|------|--------|
| 0 — Descoberta | ✅ Concluído |
| 1 — Fundação | 🔄 Em andamento |
| 2 — Cadastros | ⏳ Pendente |
| 3 — Pedidos/Atendimentos | ⏳ Pendente |
| 4 — App Móvel Básico | ⏳ Pendente |
| 5 — Offline/Sincronização | ⏳ Pendente |
| 6 — Mapa/Localização | ⏳ Pendente |
| 7 — Evidências/Documentos | ⏳ Pendente |
| 8 — QR Code e OCR | ⏳ Pendente |
| 9 — Piloto | ⏳ Pendente |

## Stack Tecnológica

- **Web:** Next.js 14 (App Router) + React + TypeScript
- **Mobile:** React Native + Expo (Android)
- **Backend:** Supabase (PostgreSQL + Auth + Realtime + Storage)
- **Offline:** SQLite + Outbox Pattern
- **Monorepo:** Turborepo + npm Workspaces
