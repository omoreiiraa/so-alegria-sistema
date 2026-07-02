# 03 — Modelo de Dados

> Convenções: toda tabela tem `id uuid default gen_random_uuid()` (exceto `profiles`, PK =
> `user_id`), `created_at timestamptz default now()`, `updated_at timestamptz default now()`
> (trigger de update). Enums nativos. Dinheiro em `numeric(10,2)`. RLS ligada em **todas**.

Migrations versionadas em [`supabase/migrations/`](../supabase/migrations/) e aplicadas via MCP
Supabase (`apply_migration`). Tipos TS gerados por `generate_typescript_types` → `src/types/database.ts`.

---

## Enums

```sql
create type user_role          as enum ('admin', 'colaborador');
create type cargo_type         as enum ('pendente', 'trainee', 'junior', 'experiente', 'coordenador');
create type party_status       as enum ('fechada', 'escalada', 'confirmada', 'realizada', 'paga', 'cancelada');
create type assignment_status  as enum ('pendente', 'confirmada', 'recusada', 'cancelada');
create type presence_mode      as enum ('na_empresa', 'direto_no_local');
create type vehicle_type       as enum ('carro', 'van');
create type vehicle_status     as enum ('disponivel', 'em_uso', 'manutencao');
create type payment_status     as enum ('aberto', 'pago');
create type stock_movement_type as enum ('entrada', 'saida_festa', 'devolucao', 'perda', 'ajuste');
```

---

## Tabelas

### `profiles` (1:1 com `auth.users`)
| Coluna | Tipo | Notas |
|---|---|---|
| `user_id` | uuid PK → auth.users | |
| `role` | user_role default `'colaborador'` | espelhado em `app_metadata` via trigger |
| `cargo` | cargo_type default `'pendente'` | |
| `nome_completo` | text | |
| `nome_tio` | text null | definido pelo admin |
| `rg`, `cpf` | text | `cpf` unique; validação de DV via constraint/trigger; sensível (LGPD) |
| `email`, `celular` | text | `celular` em E.164 |
| `cep, logradouro, numero, complemento, bairro, cidade, uf` | text | endereço |
| `chave_pix` | text | |
| `ativo` | boolean default true | soft delete |
| `aprovado` | boolean default false | liberação pelo admin |

### `availability`
`id`, `user_id → profiles`, `data date`, `periodo text default 'dia_inteiro'`. **unique (user_id, data)**.

### `partners` (buffets)
`id`, `nome`, campos de endereço (como profiles), `contato text null`, `observacoes text null`, `ativo boolean default true`.

### `vehicles`
`id`, `tipo vehicle_type`, `apelido text`, `placa text unique`, `dia_rodizio smallint null` (0=domingo … 6=sábado), `status vehicle_status default 'disponivel'`.

### `party_types`
`id`, `nome text unique`, `ativo boolean default true`. Seed: Recreação Básica, Discoteca Básica, Discoteca Completa, DJ, Camarim, Oficina.

### `parties`
| Coluna | Tipo | Notas |
|---|---|---|
| `id` | uuid | |
| `status` | party_status default `'fechada'` | |
| `data` | date | |
| `hora_inicio`, `hora_fim` | time | |
| `duracao_horas` | numeric **generated** | `hora_fim - hora_inicio`, +24h se vira a noite |
| `contratante_nome` | text | |
| `aniversariante_nome` | text null | |
| `aniversariante_idade` | smallint null | |
| `qtd_criancas` | smallint null | |
| `partner_id` | uuid → partners null | se buffet parceiro |
| `cep…uf` | text null | endereço livre (se não buffet) |
| `party_type_id` | uuid → party_types | |
| `observacoes` | text null | |
| `is_viagem` | boolean default false | |

### `party_vehicles` (N:N)
`id`, `party_id → parties`, `vehicle_id → vehicles`. **unique (party_id, vehicle_id)**.

### `party_assignments`
| Coluna | Tipo | Notas |
|---|---|---|
| `id` | uuid | |
| `party_id` | → parties | |
| `user_id` | → profiles | |
| `status` | assignment_status default `'pendente'` | |
| `presence_mode` | presence_mode null | |
| `horario_apresentacao` | time null | |
| `is_driver` | boolean default false | +R$20 |
| `vehicle_id` | → vehicles null | carro que dirige |
| `cargo_snapshot` | cargo_type null | congelado na confirmação |
| `cache_calculado` | numeric null | congelado na confirmação |
| `cache_custom` | numeric null | sobrescreve cálculo |
| `cache_final` | numeric **generated** | `coalesce(cache_custom, cache_calculado)` |
| `motivo_recusa` | text null | |
| `respondido_em` | timestamptz null | |

**unique (party_id, user_id)**.

### `payment_weeks`
`id`, `semana_inicio date` (segunda), `semana_fim date` (domingo). **unique (semana_inicio)**.

### `payments`
`id`, `payment_week_id → payment_weeks`, `user_id → profiles`, `valor_total numeric`, `qtd_festas smallint`, `status payment_status default 'aberto'`, `pago_em timestamptz null`, `pago_por uuid null`. **unique (payment_week_id, user_id)**. Gerado por `close_payment_week`.

### `stock_items`
`id`, `nome text`, `foto_url text null`, `quantidade_total int default 0`, `categoria text null`, `ativo boolean default true`.

### `party_stock_items`
`id`, `party_id → parties`, `stock_item_id → stock_items`, `qtd_levada int`, `qtd_devolvida int null`, `qtd_perdida int default 0`. **unique (party_id, stock_item_id)**.

### `stock_movements`
`id`, `stock_item_id → stock_items`, `tipo stock_movement_type`, `quantidade int`, `party_id → parties null`, `user_id uuid` (quem registrou), `observacao text null`.

### `notifications`
`id`, `tipo text`, `titulo text`, `corpo text`, `party_id null`, `actor_user_id null`, `lida boolean default false`. Destinada aos **admins** (central compartilhada).

---

## Funções Postgres (assinaturas)

| Função | Segurança | Papel |
|---|---|---|
| `cache_base(cargo cargo_type) → numeric` | stable | Tabela de cachê base por cargo |
| `calc_cache(cargo, duracao_horas, is_viagem, is_driver) → numeric` | immutable | Regra da seção 2 do [01](01-regras-de-negocio.md) |
| `confirm_assignment(assignment_id uuid)` | **definer** | Dono confirma; congela `cargo_snapshot` + `cache_calculado`; muda status |
| `refuse_assignment(assignment_id uuid, motivo text)` | **definer** | Dono recusa; insere notificação; enfileira e-mail |
| `cancel_assignment(assignment_id uuid, motivo text)` | **definer** | Dono cancela confirmação; notifica |
| `close_payment_week(semana_inicio date)` | **definer**, admin | Gera/atualiza `payments` da semana |
| `set_user_cargo(target uuid, novo cargo_type)` | **definer**, admin | Altera cargo |
| `set_user_role(target uuid, novo user_role)` | **definer**, admin | Altera role |
| `approve_user(target uuid, cargo cargo_type)` | **definer**, admin | Aprova cadastro + define cargo |
| `is_admin() → boolean` | stable | Lê `auth.jwt() -> app_metadata ->> 'role'` |

### Triggers
- `handle_new_user` em `auth.users` (after insert) → cria `profiles`.
- `sync_role_to_jwt` em `profiles` → grava `role` em `app_metadata` (custom claim).
- `set_updated_at` genérico em todas as tabelas.
- Trigger de estoque: mutações em `party_stock_items` geram `stock_movements` + ajustam disponibilidade.
- Validação de CPF (dígito verificador) via constraint/trigger.

---

## Ordem das migrations (sugerida)

1. `0001_extensions_enums` — extensões + enums.
2. `0002_profiles_and_auth` — profiles, trigger de signup, sync de role.
3. `0003_core_tables` — availability, partners, vehicles, party_types, parties, party_vehicles.
4. `0004_assignments` — party_assignments + generated column.
5. `0005_payments` — payment_weeks, payments.
6. `0006_stock` — stock_items, party_stock_items, stock_movements + triggers.
7. `0007_notifications` — notifications.
8. `0008_functions` — cache_base, calc_cache, confirm/refuse/cancel, close_payment_week, set_* , is_admin.
9. `0009_rls_policies` — RLS em todas as tabelas (ver [04](04-seguranca-rls-lgpd.md)).
10. `0010_seed` — party_types + dados de teste (dev).

> Cada migration deve rodar **e** ser salva em `supabase/migrations/` com o mesmo conteúdo aplicado.
