# 04 — Segurança, RLS & LGPD

## Princípio

A **RLS (Row Level Security) é a fronteira de segurança**, não o frontend. O client usa a anon key
e só enxerga o que a policy permite. Toda tabela tem RLS **habilitada** — inclusive as sem policy
(nega tudo por padrão).

## Helper de admin

```sql
create or replace function public.is_admin() returns boolean
language sql stable as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin';
$$;
```

O `role` é gravado em `app_metadata` por trigger em `profiles` (custom claim), evitando subquery
recursiva dentro das policies de `profiles`.

## Matriz de acesso

Desde a migration 0017 **o colaborador não tem sessão** (ver ADR-0012): não existe papel
"colaborador" no banco. Toda policy é admin-only, e o acesso do tio/tia acontece fora da RLS,
por RPC validado por token.

| Tabela | `anon` / colaborador | Admin (`authenticated` + `is_admin()`) |
|---|---|---|
| `profiles` | **sem acesso** | ALL |
| `parties`, `party_assignments`, `party_vehicles` | **sem acesso** | ALL |
| `payments`, `payment_weeks` | **sem acesso** | ALL |
| `partners`, `vehicles`, `party_types` | **sem acesso** | ALL |
| `stock_items`, `party_stock_items`, `stock_movements` | **sem acesso** | ALL |
| `notifications` | **sem acesso** | ALL |
| `colaborador_links` | **sem acesso** | ALL |
| `service_orders` | **sem acesso** | ALL |

## Acesso público por token

As rotas `/cadastro/[token]` e `/convite/[token]` não têm sessão. O caminho é sempre o mesmo:

1. O servidor calcula o **sha256** do token da URL (o token em claro nunca vai ao banco).
2. Chama um RPC `SECURITY DEFINER` com o client de **service role** — `resolve_link` (leitura),
   `submit_cadastro_by_token` ou `responder_convite_by_token` (escrita).
3. O RPC valida expiração, uso e revogação com `select … for update` e **queima o link** na
   mesma transação, então duplo clique não confirma duas vezes.

Essas três funções são concedidas **apenas a `service_role`** — `anon` e `authenticated` têm
`EXECUTE` revogado, e nenhuma policy nova foi aberta para `anon`. O middleware aplica rate
limit de 20 req/min por IP nessas rotas.

> **Cuidado ao recriar funções:** `create or replace` devolve `EXECUTE` ao `public` por padrão.
> Toda migration que recria uma RPC precisa repetir os `revoke`/`grant` (foi o que a 0018
> corrigiu depois da 0017).

## Regras adicionais

1. **Nenhuma escrita direta** do client em `role`, `cargo`, `cache_*`, `payments`. Só via funções
   `SECURITY DEFINER` com checagem interna (`if not is_admin() then raise exception`).
2. **Service role key** nunca no client; só em Server Actions/Edge Functions.
3. **Storage** (bucket `estoque`): escrita **admin-only**; leitura preferencialmente por **signed URLs**.
4. O trigger `prevent_sensitive_profile_update` foi removido na 0017 (ver ADR-0014): ele
   bloquearia o próprio cadastro por token, que roda sem `auth.uid()`. Se o colaborador voltar
   a ter sessão, a proteção precisa ser reintroduzida.

## Exemplo de policies (referência)

```sql
-- Tudo admin-only. is_admin() lê o custom claim, sem subquery recursiva.
create policy profiles_select on profiles
  for select to authenticated using ((select is_admin()));
create policy profiles_update on profiles
  for update to authenticated
  using ((select is_admin())) with check ((select is_admin()));
```


## Rate limiting e proteção

- **Middleware Next + Upstash Redis:** limite por IP em rotas de auth/cadastro (ex.: 5/min) e APIs públicas.
- **Supabase Auth:** rate limits nativos (OTP, signup, login) habilitados.
- **Captcha Cloudflare Turnstile** (grátis) no cadastro público — recomendado.
- **Headers de segurança** (CSP, HSTS, X-Frame-Options) via `next.config`.
- **Validação dupla:** Zod (client+server) **e** constraints no banco (CPF DV, telefone E.164, CEP).

## LGPD / dados sensíveis

- **RG/CPF:** acesso restrito a admin + próprio dono (RLS). Avaliar `pgsodium` para criptografia em
  repouso (evolução futura; v1 usa constraint + RLS restrita).
- **Logs sem dados pessoais.**
- **Soft delete** de colaboradores (`ativo = false`) preservando histórico de pagamentos.
- Consentimento e finalidade documentados no cadastro público.

## Checklist de auditoria de segurança (Fase 5)

- [ ] `get_advisors` (security) sem erros críticos.
- [ ] Toda tabela com RLS habilitada e policies revisadas.
- [ ] Teste automatizado: `anon` não lê nada de nenhuma tabela nem executa as RPCs de token.
- [ ] Teste: cliente não consegue alterar `role`/`cargo`/`payments` (erro de policy).
- [ ] Service role nunca referenciada em código client (`NEXT_PUBLIC_*` não contém segredo).
- [ ] Storage bucket sem leitura pública indevida.
