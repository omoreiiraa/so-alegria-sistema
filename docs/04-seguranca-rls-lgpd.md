# 04 — Segurança, RLS & LGPD

## Princípio

A **RLS (Row Level Security) é a fronteira de segurança**, não o frontend. O client usa a anon key
e só enxerga o que a policy permite. Toda tabela tem RLS **habilitada** — inclusive as sem policy
(nega tudo por padrão).

## Papéis de acesso

Cada pessoa do escritório tem a sua conta (ADR-0022). O papel mora em `profiles.role` e é
espelhado em `app_metadata` por trigger — é esse custom claim que as policies leem, evitando
subquery recursiva dentro das policies de `profiles`.

| Papel | Quem | Alcance |
|---|---|---|
| `dona` | Camila | Tudo, inclusive definir o papel de acesso das outras |
| `gerente` | Paula | Tudo, menos papel de acesso |
| `funcionario` | Carol, Caio | A operação inteira **menos Pagamentos e Ordem de Serviço** |
| `admin` | conta única antiga | Papel legado; equivale a `dona` |
| `colaborador` | tio/tia | **Não tem login** (ADR-0012); sem acesso a nada |

A fronteira que importa não é "admin x resto", é **equipe x gestão**: quase tudo é da equipe,
e o que envolve dinheiro (`payments`, `payment_weeks`) ou Ordem de Serviço é da gestão.

## Helpers de permissão

```sql
create or replace function public.auth_role() returns text
language sql stable set search_path to 'public' as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '');
$$;

-- Proprietária: só ela define papel de acesso.
create or replace function public.is_dona()   returns boolean language sql stable as $$
  select public.auth_role() in ('dona', 'admin');
$$;
-- Gestão: dinheiro e Ordem de Serviço.
create or replace function public.is_gestao() returns boolean language sql stable as $$
  select public.auth_role() in ('dona', 'admin', 'gerente');
$$;
-- Equipe: qualquer login do escritório. Cobre a operação.
create or replace function public.is_equipe() returns boolean language sql stable as $$
  select public.auth_role() in ('dona', 'admin', 'gerente', 'funcionario');
$$;
```

> **`is_admin()` não existe mais** (removido na 0028). Com o funcionário enxergando quase tudo,
> o nome mentiria em toda policy onde aparecesse. Ao escrever policy nova, escolha entre
> `is_equipe()` e `is_gestao()` — nunca deixe uma tabela sem policy, que é negar tudo.

### Trava de escalonamento

`profiles` é escrita pela equipe inteira. Sem freio, a gerente — ou o funcionário — daria um
UPDATE na própria linha, viraria `dona` (o trigger `sync_user_role` levaria o claim junto) e o
modelo não valeria nada. O trigger `guard_profile_privileges` barra mudança de `role`/`user_id`
por quem não é dona. Sessões sem JWT (service role) passam: é por ali que correm os RPCs de
token e o provisionamento de contas (`npm run usuarios`).

## Matriz de acesso

Desde a migration 0017 **o colaborador não tem sessão** (ver ADR-0012): o acesso do tio/tia
acontece fora da RLS, por RPC validado por token. Nenhuma policy abre nada para `anon`.

| Tabela | `anon` / colaborador | `funcionario` | Gestão |
|---|---|---|---|
| `profiles` | **sem acesso** | ALL (`role` só a dona) | ALL (`role` só a dona) |
| `parties`, `party_assignments`, `party_vehicles` | **sem acesso** | ALL | ALL |
| `party_types`, `party_party_types` | **sem acesso** | ALL | ALL |
| `partners`, `vehicles` | **sem acesso** | ALL | ALL |
| `stock_items`, `stock_movements`, `party_stock_items` | **sem acesso** | ALL | ALL |
| `notifications`, `colaborador_links` | **sem acesso** | ALL | ALL |
| `payments`, `payment_weeks` | **sem acesso** | **sem acesso** | ALL |
| `service_orders` | **sem acesso** | **sem acesso** | ALL |
| Storage `estoque`, `contratos` | **sem acesso** | ALL | ALL |
| Storage `ordens-servico` | **sem acesso** | **sem acesso** | ALL |

A policy de SELECT de `profiles` carrega, além de `is_equipe()`, a cláusula
`user_id = auth.uid()`: é ela que sustenta o login, e continua valendo se algum dia entrar um
papel abaixo de `funcionario`.

### Funções e o papel que cada uma exige

| Guarda | Funções |
|---|---|
| `is_dona()` | `set_user_role` |
| `is_gestao()` | `close_payment_week`, `mark_payment_paid`, `create_service_order` |
| `is_equipe()` | `approve_user`, `set_user_cargo`, `set_nome_tio`, `set_user_active`, `delete_colaborador`, `delete_stock_item` |

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
   `SECURITY DEFINER` com checagem interna (`if not is_equipe()/is_gestao() then raise exception`)
   — e `set_user_role` exige `is_dona()`.
2. **Service role key** nunca no client; só em Server Actions/Edge Functions.
3. **Storage**: `estoque` e `contratos` são da equipe; `ordens-servico` é da gestão. Leitura preferencialmente por **signed URLs**.
4. O trigger `prevent_sensitive_profile_update` foi removido na 0017 (ver ADR-0014): ele
   bloquearia o próprio cadastro por token, que roda sem `auth.uid()`. A 0026 trouxe de volta
   o essencial dele como `guard_profile_privileges`, agora deixando passar quem não tem JWT —
   exatamente o caso do cadastro por token.

## Exemplo de policies (referência)

```sql
-- Operação: uma policy por tabela, `for all`, com o helper da equipe.
-- O `(select …)` faz o Postgres avaliar o helper uma vez por consulta, não por linha.
create policy parties_equipe on parties
  for all to authenticated
  using ((select is_equipe())) with check ((select is_equipe()));

-- Dinheiro: mesma forma, outro helper.
create policy payments_gestao on payments
  for all to authenticated
  using ((select is_gestao())) with check ((select is_gestao()));

-- profiles é a exceção: o SELECT também abre a própria linha, que é o que
-- sustenta o login.
create policy profiles_select on profiles
  for select to authenticated
  using ((select is_equipe()) or user_id = (select auth.uid()));
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
