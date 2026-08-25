# 02 — Arquitetura & Stack

## Visão em camadas

```
┌───────────────────────────────────────────────────────────┐
│  Cliente (browser / PWA)                                    │
│  Next.js App Router · React Server Components · shadcn/ui    │
└───────────────┬───────────────────────────┬────────────────┘
                │ Server Actions             │ Supabase JS (anon, RLS)
                ▼                             ▼
┌───────────────────────────┐   ┌────────────────────────────┐
│  Next.js (Vercel)          │   │  Supabase                   │
│  - Server Actions          │   │  - Postgres (RLS + funções) │
│  - middleware (auth + rate)│   │  - Auth (email/Google/OTP)  │
│  - route handlers          │   │  - Storage (fotos estoque)  │
└──────┬─────────────┬───────┘   │  - Edge Functions (webhooks)│
       │             │           └──────────────┬─────────────┘
       ▼             ▼                          ▼
  Upstash Redis   Resend                  Postgres Functions
  (rate limit)    (e-mails)               (calc_cache, close_week…)
```

## Princípios

1. **Lógica de negócio no banco.** Cachê, fechamento e mutações sensíveis são **funções Postgres**
   (`SECURITY DEFINER` quando precisam elevar privilégio). O app orquestra, não recalcula.
2. **RLS é a fronteira de segurança.** O client usa a **anon key** e só enxerga o que a RLS permite.
   Nunca confiamos em checagens só no front.
3. **Server Actions para mutações do app.** Formulários e ações usam Server Actions (Next), que:
   - validam com Zod,
   - chamam Supabase (respeitando a sessão do usuário) ou RPC de funções,
   - revalidam cache (`revalidatePath`).
4. **Service role só no servidor.** Operações administrativas que precisam furar RLS usam a service
   role key **exclusivamente** em Server Actions/Edge Functions, nunca exposta ao browser.
5. **Free tier first.** Nenhuma dependência paga na v1.

## Clientes Supabase (`src/lib/supabase/`)

| Client | Uso | Chave |
|---|---|---|
| `browser.ts` | Componentes client | anon (publishable) |
| `server.ts` | RSC / Server Actions (sessão do usuário via cookies) | anon (publishable) |
| `admin.ts` | Operações privilegiadas no servidor | **service role** (nunca no client) |

Usar `@supabase/ssr` para cookies/sessão no App Router.

## Auth

- **Quem tem conta:** só o admin. O colaborador não existe em `auth.users` (ADR-0012).
- **Provedores:** e-mail/senha e Google OAuth.
- **Custom claim `role`:** trigger grava `role` em `app_metadata` do usuário → lido via `auth.jwt()`
  nas policies (evita subquery recursiva). Ver [04](04-seguranca-rls-lgpd.md).
- **Guarda de rotas:** `middleware.ts` valida sessão e redireciona:
  - não logado em `/admin/*` → `/login`
  - logado sem `role = admin` → recusado no login e deslogado
  - `/cadastro/[token]` e `/convite/[token]` passam **sem sessão** (validação por token no
    banco), com rate limit de 20 req/min por IP

## Integrações

| Serviço | Papel | Free tier |
|---|---|---|
| **Resend** | OTP + notificações ao admin | 100/dia, 3.000/mês |
| **Upstash Redis** | Rate limit por IP (auth/cadastro) via middleware | Sim |
| **ViaCEP** (+ BrasilAPI fallback) | Autopreenchimento de endereço | Grátis |
| **libphonenumber-js** | Validação telefone (DDI+DDD, E.164) | Lib |
| **Cloudflare Turnstile** | Captcha no cadastro público (recomendado) | Grátis |

## Fluxo de e-mails/notificações

Inserção em `notifications` + **Database Webhook** (Supabase) em `party_assignments`/`profiles` →
**Edge Function** → chama Resend. Mantém o disparo desacoplado do request do usuário.

## Ambientes

| Ambiente | Onde | Banco |
|---|---|---|
| Local | `npm run dev` | projeto Supabase `so-alegria` (ou branch) |
| Preview | Vercel (PRs) | mesmo projeto (v1) |
| Produção | Vercel (main) | projeto `so-alegria` |

## Cache & datas

- Timezone fixo **`America/Sao_Paulo`** em toda formatação (util `lib/utils/date.ts`).
- Valores monetários formatados em **BRL** (`Intl.NumberFormat('pt-BR', { currency: 'BRL' })`).
- Guardar `numeric` para dinheiro; nunca `float`.

## Decisões técnicas registradas
Ver [08-registro-decisoes.md](08-registro-decisoes.md).
