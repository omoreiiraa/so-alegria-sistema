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

| Tabela | Colaborador | Admin |
|---|---|---|
| `profiles` | SELECT/UPDATE **só a própria linha**; colunas `role, cargo, nome_tio, aprovado, rg, cpf` **bloqueadas** para UPDATE (trigger/coluna-check) | ALL |
| `availability` | ALL nas **próprias** linhas | SELECT |
| `parties` | SELECT **só festas onde tem assignment** | ALL |
| `party_assignments` | SELECT nas próprias; **UPDATE só via** `confirm/refuse/cancel` (funções) | ALL |
| `party_vehicles` | SELECT se pertence a festa sua | ALL |
| `payments`, `payment_weeks` | SELECT nas próprias | ALL |
| `partners`, `vehicles`, `party_types` | SELECT limitado ao necessário (ex.: veículo vinculado à sua festa) | ALL |
| `stock_items`, `party_stock_items`, `stock_movements` | **sem acesso** | ALL |
| `notifications` | **sem acesso** | ALL |

## Regras adicionais

1. **Nenhuma escrita direta** do client em `role`, `cargo`, `cache_*`, `payments`. Só via funções
   `SECURITY DEFINER` com checagem interna (`if not is_admin() then raise exception`).
2. **Colunas sensíveis de `profiles`** (role, cargo, nome_tio, aprovado, rg, cpf): trigger
   `prevent_sensitive_update` bloqueia alteração pelo próprio dono; só funções admin passam.
3. **Service role key** nunca no client; só em Server Actions/Edge Functions.
4. **Storage** (bucket `estoque`): escrita **admin-only**; leitura preferencialmente por **signed URLs**.
5. Funções que confirmam/recusam validam `auth.uid() = owner` antes de agir.

## Exemplo de policies (referência)

```sql
-- profiles: dono lê/edita a própria linha; admin tudo
create policy profiles_select_own on profiles
  for select using (user_id = auth.uid() or is_admin());
create policy profiles_update_own on profiles
  for update using (user_id = auth.uid() or is_admin());

-- parties: colaborador só vê festas onde está escalado
create policy parties_select_scoped on parties
  for select using (
    is_admin() or exists (
      select 1 from party_assignments a
      where a.party_id = parties.id and a.user_id = auth.uid()
    )
  );

-- party_assignments: dono lê a sua; escrita de status só via função (revogar update direto)
create policy assignments_select_own on party_assignments
  for select using (user_id = auth.uid() or is_admin());
```

> Colaborador **não** recebe policy de UPDATE em `party_assignments`: a mudança de status passa
> obrigatoriamente pelas funções `confirm/refuse/cancel_assignment` (definer), que checam ownership.

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
- [ ] Teste automatizado: colaborador A não lê nada de B (nenhuma rota/query).
- [ ] Teste: cliente não consegue alterar `role`/`cargo`/`payments` (erro de policy).
- [ ] Service role nunca referenciada em código client (`NEXT_PUBLIC_*` não contém segredo).
- [ ] Storage bucket sem leitura pública indevida.
