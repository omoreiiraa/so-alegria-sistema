# Só Alegria — Sistema de Gestão de Recreação

Plataforma web da **Só Alegria — Recreação e Discoteca** para gerir a operação de festas
infantis: escala, confirmação de festas, disponibilidade, pagamentos, frota, buffets parceiros
e estoque.

- **Colaborador** (`/app`) — freelancer, mobile-first (PWA): escala, confirmar/recusar, disponibilidade, pagamentos.
- **Admin** (`/admin`) — escritório, desktop-first: festas (kanban/calendário), colaboradores, pagamentos, veículos, parceiros, estoque.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui (Base UI) ·
Supabase (Postgres + Auth + Storage) · Vercel.

## Começando

```bash
cp .env.example .env.local   # preencha as chaves (ver abaixo)
npm install
npm run dev                  # http://localhost:3000
```

### Variáveis de ambiente
| Variável | Descrição |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave publishable (client) |
| `SUPABASE_SERVICE_ROLE_KEY` | Segredo — só no servidor (Server Actions/Edge) |
| `RESEND_API_KEY` / `RESEND_FROM` | E-mails transacionais |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | Rate limit (opcional em dev) |
| `NEXT_PUBLIC_SITE_URL` | URL pública (para redirects de auth) |

## Scripts

```bash
npm run dev        # desenvolvimento
npm run build      # build de produção
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
```

## Estrutura & documentação

A documentação normativa vive em [`docs/`](docs/) e o guia de desenvolvimento em
[`CLAUDE.md`](CLAUDE.md). Comece por:

- [docs/01-regras-de-negocio.md](docs/01-regras-de-negocio.md) — cachê, pagamentos, estoque
- [docs/03-modelo-de-dados.md](docs/03-modelo-de-dados.md) — schema e funções
- [docs/04-seguranca-rls-lgpd.md](docs/04-seguranca-rls-lgpd.md) — RLS e LGPD
- [docs/06-roadmap-fases.md](docs/06-roadmap-fases.md) — o que está pronto e o que falta

Migrations SQL versionadas em [`supabase/migrations/`](supabase/migrations/).

## Banco de dados

O schema é aplicado via migrations. A **lógica de cachê e pagamentos roda no Postgres**
(funções `calc_cache`, `close_payment_week`, etc.) e **RLS está ativa em todas as tabelas**.
Nunca calcule cachê no client.
