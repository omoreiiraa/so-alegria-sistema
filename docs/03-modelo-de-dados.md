# 03 — Modelo de Dados

> Convenções: toda tabela tem `id uuid default gen_random_uuid()`, `created_at timestamptz default now()`, `updated_at timestamptz default now()`
> (trigger de update). Enums nativos. Dinheiro em `numeric(10,2)`. RLS ligada em **todas**.

Migrations versionadas em [`supabase/migrations/`](../supabase/migrations/) e aplicadas via MCP
Supabase (`apply_migration`). Tipos TS gerados por `generate_typescript_types` → `src/types/database.ts`.

---

## Enums

```sql
create type user_role          as enum ('admin', 'dona', 'gerente', 'funcionario', 'colaborador');
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

### `profiles` (identidade própria; `user_id` só para admin)
| Coluna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | identidade do colaborador; referenciada por assignments e payments |
| `user_id` | uuid null → auth.users (on delete set null) | **só o escritório tem**; colaborador não faz login |
| `role` | user_role default `'colaborador'` | papel de acesso; espelhado em `app_metadata` via trigger. Só a dona altera (RPC + trigger `guard_profile_privileges`) |
| `cargo` | cargo_type default `'pendente'` | |
| `nome_completo` | text | |
| `nome_tio` | text null | definido pelo admin |
| `rg`, `cpf` | text | `cpf` unique; validação de DV via constraint/trigger; sensível (LGPD) |
| `email`, `celular` | text | `celular` em E.164 |
| `cep, logradouro, numero, complemento, bairro, cidade, uf` | text | endereço |
| `chave_pix` | text | |
| `ativo` | boolean default true | soft delete |
| `aprovado` | boolean default false | liberação pelo admin |

### `colaborador_links`
`id`, `tipo link_tipo ('cadastro'|'convite')`, `token_hash text unique` (**sha256 do token —
nunca o token em claro**), `profile_id → profiles`, `party_assignment_id → party_assignments null`,
`expira_em timestamptz null` (obrigatório em `convite`, 24h), `usado_em`, `revogado_em`,
`created_at`, `created_by → auth.users null`. RLS admin-only; o acesso público passa só pelos
RPCs `resolve_link`, `submit_cadastro_by_token` e `responder_convite_by_token`, concedidos
apenas a `service_role`.

> `availability` foi removida na migration 0017 — a tela de disponibilidade do colaborador
> deixou de existir.

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
| `profile_id` | → profiles(id) | |
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

**unique (party_id, profile_id)**.

### `payment_weeks`
`id`, `semana_inicio date` (segunda), `semana_fim date` (domingo). **unique (semana_inicio)**.

### `payments`
`id`, `payment_week_id → payment_weeks`, `profile_id → profiles`, `valor_total numeric`, `qtd_festas smallint`, `status payment_status default 'aberto'`, `pago_em timestamptz null`, `pago_por uuid null`. **unique (payment_week_id, profile_id)**. Gerado por `close_payment_week`.

### `stock_items`
`id`, `nome text`, `foto_url text null`, `quantidade_total int default 0`, `categoria text null`, `ativo boolean default true`.

### `party_stock_items`
`id`, `party_id → parties`, `stock_item_id → stock_items`, `qtd_levada int`, `qtd_devolvida int null`, `qtd_perdida int default 0`. **unique (party_id, stock_item_id)**.

### `stock_movements`
`id`, `stock_item_id → stock_items`, `tipo stock_movement_type`, `quantidade int`, `party_id → parties null`, `user_id uuid` (quem registrou), `observacao text null`.

### `service_orders` (Ordem de Serviço — ANEXO I)
Uma OS por colaborador escalado. Ver [ADR-0009](08-registro-decisoes.md).

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | uuid | |
| `party_assignment_id` | → party_assignments **unique** | on delete cascade |
| `ano` | smallint | ano da emissão (America/Sao_Paulo) |
| `numero` | integer | sequencial dentro do ano; **unique (ano, numero)** |
| `data_emissao` | date default hoje | |
| `status` | service_order_status default `'rascunho'` | |
| `enviada_em` | timestamptz null | |
| `respondido_em` | timestamptz null | resposta do colaborador |
| `meio_confirmacao` | confirmation_method null | WhatsApp / e-mail / assinatura |
| `motivo_recusa` | text null | |
| `arquivo_path` | text null | .docx preenchido no bucket `ordens-servico` (privado) |
| `observacoes` | text null | |

Enums: `service_order_status ('rascunho','enviada','aceita','recusada')` e
`confirmation_method ('whatsapp','email','assinatura_fisica')`.

Função: `create_service_order(p_assignment uuid) → service_orders` — **definer**, admin;
numera com `pg_advisory_xact_lock` por ano.

### `notifications`
`id`, `tipo text`, `titulo text`, `corpo text`, `party_id null`, `actor_profile_id null`, `lida boolean default false`. Destinada aos **admins** (central compartilhada).

---

## Funções Postgres (assinaturas)

| Função | Segurança | Papel |
|---|---|---|
| `cache_base(cargo cargo_type) → numeric` | stable | Tabela de cachê base por cargo |
| `calc_cache(cargo, duracao_horas, is_viagem, is_driver) → numeric` | immutable | Regra da seção 2 do [01](01-regras-de-negocio.md) |
| `resolve_link(token_hash text) → jsonb` | **definer**, service_role | Lê o estado do link sem consumi-lo; se for cadastro válido, devolve os dados atuais para pré-preencher |
| `submit_cadastro_by_token(token_hash text, dados jsonb)` | **definer**, service_role | Grava o cadastro e queima o link |
| `responder_convite_by_token(token_hash text, aceita bool, motivo text)` | **definer**, service_role | Aceita/recusa; congela `cargo_snapshot` + `cache_calculado`; queima o link |
| `close_payment_week(semana_inicio date)` | **definer**, **gestão** | Gera/atualiza `payments` da semana |
| `set_user_cargo(target uuid, novo cargo_type)` | **definer**, equipe | Altera cargo |
| `set_user_role(target uuid, novo user_role)` | **definer**, **dona** | Altera o papel de acesso |
| `approve_user(target uuid, cargo cargo_type)` | **definer**, equipe | Aprova cadastro + define cargo |
| `set_user_active(target uuid, ativo bool)` | **definer**, equipe | Ativa/desativa sem apagar nada |
| `delete_colaborador(target uuid)` | **definer**, equipe | Exclui a ficha; **recusa** se houver festa ou pagamento |
| `is_gestao() → boolean` | stable | Gestão: `dona`, `admin` ou `gerente` — dinheiro e OS |
| `is_dona() → boolean` | stable | Proprietária: `dona` ou `admin` (papel legado) |
| `is_equipe() → boolean` | stable | Qualquer login do escritório — a operação inteira |
| `auth_role() → text` | stable | Lê `auth.jwt() -> app_metadata ->> 'role'`; base dos três acima |

**`profiles.cnpj`** — CNPJ do colaborador (MEI), só dígitos, opcional. Sem `UNIQUE`, ao
contrário do CPF: o CPF é a identidade da pessoa, o CNPJ é a empresa pela qual ela
fatura, e duas pessoas podem faturar pela mesma. Constraint de formato no banco
(`^[0-9]{14}$`); dígitos verificadores no Zod.

**`parties.orcamento_assinado_path`** — caminho no bucket privado `contratos` do
orçamento preenchido e devolvido pelo cliente. O contrato (orçamento + folha de dados
da empresa) é montado a cada download, não guardado. Ver ADR-0019.

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
