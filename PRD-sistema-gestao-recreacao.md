# PRD — Sistema de Gestão de Recreação Infantil

**Versão:** 1.0
**Data:** Julho/2026
**Status:** Aprovado para desenvolvimento

---

## 1. Visão Geral

### 1.1 Contexto
Empresa de recreação infantil com ~50 colaboradores freelancers e 3 pessoas no escritório (administradores). Hoje toda a operação (escalas, confirmações, pagamentos) é feita por WhatsApp, gerando perda de informação e retrabalho.

### 1.2 Objetivo
Centralizar em uma única plataforma web:
- **Para o freelancer:** escala, confirmação de festas, disponibilidade e acompanhamento de pagamentos.
- **Para o admin:** gestão de festas (kanban + calendário), colaboradores, pagamentos, frota, buffets parceiros e estoque de materiais.

### 1.3 Não-objetivos (v1)
- Multi-empresa (é single-tenant: uma empresa, dois perfis).
- App nativo (será web responsivo/PWA).
- Emissão de nota fiscal, integração bancária ou pagamento automático via PIX.
- Chat interno.

---

## 2. Stack Técnica

| Camada | Tecnologia | Observação |
|---|---|---|
| Frontend | Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui | Um único app com áreas `/app` (freelancer, mobile-first) e `/admin` (desktop-first) |
| Hospedagem | Vercel (free tier) | |
| Backend | Supabase: Postgres, Auth, Storage, Edge Functions | Sem servidor próprio na v1 |
| Auth | Supabase Auth: e-mail/senha + Google OAuth; OTP de verificação por e-mail | SMTP customizado via Resend |
| E-mails transacionais | Resend (free tier: 100/dia, 3.000/mês) | OTP, notificações ao admin |
| Rate limit | Upstash Redis (free tier) via middleware Vercel | Supabase Auth já possui rate limit nativo |
| CEP | ViaCEP com fallback BrasilAPI | Autopreenchimento de endereço |
| Telefone | `libphonenumber-js` | Validação DDI + DDD |
| Mutações | Server Actions (Next.js) + Postgres Functions | Lógica de cálculo de cachê SEMPRE no banco |

**Princípio de custo:** operar 100% em free tiers. Nenhuma dependência paga na v1. Preparado para evoluir (Redis já presente para rate limit; auth pode migrar para backend próprio no futuro).

---

## 3. Perfis e Permissões

### 3.1 Perfis
| Perfil | Descrição |
|---|---|
| `admin` | Escritório (3 pessoas). Acesso total ao painel administrativo. |
| `colaborador` | Freelancer. Acessa apenas seus próprios dados. |

### 3.2 Cargos do colaborador (definidos pelo admin, nunca pelo próprio usuário)
| Cargo | Cachê base (4h) |
|---|---|
| Trainee | R$ 60 |
| Júnior | R$ 80 |
| Experiente | R$ 100 |
| Coordenador | R$ 200 (comanda a festa) |

Novo cadastro entra sem cargo definido (`pendente`) até o admin aprovar e atribuir cargo.

---

## 4. Regras de Negócio — Cachê e Pagamentos

### 4.1 Cálculo do cachê (ordem de aplicação)
1. **Base** pelo cargo (tabela 3.2), referente a até 4h de festa.
2. **Hora extra:** festas com duração ≥ 5h59 → **+R$ 20** (equivale a +2h). Aplicado uma única vez.
3. **Viagem:** valor **duplicado** (após passo 2). Ex.: trainee em viagem = R$ 120; coordenador = R$ 400.
4. **Motorista:** colaborador que dirige o carro → **+R$ 20** (após duplicação de viagem).
5. **Cachê customizado (`cache_custom`):** para casos "a combinar" (viagens longas, avião etc.). Quando preenchido pelo admin, **sobrescreve todo o cálculo**.

O cálculo é feito por **função no Postgres** (nunca no client) e o valor é congelado no assignment no momento da confirmação (snapshot), para não mudar retroativamente se o cargo do colaborador mudar.

### 4.2 Ciclo de pagamento
- Semana de trabalho: **segunda a domingo**.
- Pagamento: **toda segunda-feira** referente à semana anterior.
- Ex.: festas feitas seg/22, ter/23 e dom/28 → pagas na seg/29, somadas.
- Apenas assignments com status `confirmada` e festa `realizada` entram no fechamento.
- Admin marca o pagamento como `pago` manualmente (transferência PIX é feita fora do sistema).

### 4.3 Logística de apresentação
Cada assignment define **um** dos dois modos:
- `na_empresa`: horário para estar na empresa (ex.: 10h30 para festa 13h–17h) — geralmente quem vai de van.
- `direto_no_local`: horário para estar no local da festa (ex.: 11h).

---

## 5. Funcionalidades — Área do Colaborador (`/app`)

Mobile-first (uso primário via celular). PWA instalável.

### 5.1 Cadastro e autenticação
- Cadastro público com: **Nome completo, RG, CPF, E-mail, Celular (DDI+DDD validado), Endereço (autopreenchido por CEP), Chave PIX, Senha**.
- Verificação de e-mail por OTP (Resend via Supabase).
- Login: e-mail/senha ou Google.
- Após cadastro, status `pendente` — mensagem informando que o admin irá aprovar e definir o cargo. Sem acesso às demais telas até aprovação.
- Colaborador pode editar: celular, endereço, chave PIX, senha. **Não pode editar:** cargo, nome de tio, RG, CPF (alteração via admin).

### 5.2 Minha Escala
- Lista + visão de calendário das festas em que está escalado.
- Cada festa exibe: data, horário da festa, horário de apresentação (na empresa ou no local), local/endereço, tipo de festa, veículo (se van/carro), se é viagem, cachê previsto.
- Festas com convite pendente destacadas com CTA **Confirmar / Recusar**.
- Ao recusar (ou cancelar uma confirmação anterior), campo opcional de motivo → dispara notificação ao admin (e-mail + painel).

### 5.3 Disponibilidade
- Calendário onde o colaborador marca datas (ou dia inteiro/período) em que está disponível para trabalhar.
- Editável a qualquer momento; admin visualiza ao escalar.

### 5.4 Pagamentos
- **A receber:** total da semana corrente/fechada, com lista das festas que compõem o valor (data, festa, cachê).
- **Recebidos:** histórico de semanas pagas, com detalhamento por festa.
- Regra visível na UI: "Pagamentos toda segunda-feira, referentes a seg–dom da semana anterior."

---

## 6. Funcionalidades — Painel Admin (`/admin`)

Desktop-first. Acesso restrito a `role = admin`.

### 6.1 Festas (Kanban + Calendário)
- **Kanban** com colunas de status: `Orçamento` → `Fechada` → `Escalada` → `Confirmada` → `Realizada` → `Paga` (colunas configuráveis via enum; v1 pode iniciar com Fechada/Escalada/Confirmada/Realizada).
- **Calendário** mensal/semanal com todas as festas.
- **Card da festa** (clique abre detalhe/modal): data, horário início/fim, nome da contratante, nome do aniversariante, idade, quantidade de crianças, local (endereço livre OU buffet parceiro), tipo de festa, observações, flag viagem, recreadores escalados (com status de confirmação de cada um), veículo(s) e motorista.
- **Criar/editar festa:** formulário com todos os campos acima. Tipos de festa: Recreação Básica, Discoteca Básica, Discoteca Completa, DJ, Camarim, Oficina, Outro (campo livre). Lista de tipos gerenciável.
- **Escalar colaboradores:** busca por nome/cargo, com indicador de disponibilidade na data e conflitos de horário. Definir por colaborador: modo de apresentação (empresa/local + horário), se é motorista, cachê custom (opcional).
- Ao escalar, colaborador recebe o convite na plataforma (e futuro e-mail).
- Recusa/cancelamento de colaborador gera **notificação por e-mail (Resend) + notificação no painel** (sino/badge).

### 6.2 Colaboradores
- Lista/grid de todos os cadastrados com filtros (cargo, status pendente/ativo).
- Card do colaborador → detalhe completo: todos os dados do cadastro, **disponibilidade**, **festas escaladas**, **valor a receber**.
- Ações do admin: aprovar cadastro, **alterar cargo** (trainee/júnior/experiente/coordenador), definir **nome de tio**, desativar colaborador.

### 6.3 Pagamentos
- Visão por semana (seletor de semana seg–dom).
- Tabela por colaborador: nome, nome de tio, **quantidade de festas na semana**, **valor total**, **chave PIX** (com botão copiar).
- Detalhamento expansível por festa.
- Ação: marcar como `pago` (individual ou em lote). Registro de data/hora do pagamento.
- Exportação CSV da semana (facilita conferência).

### 6.4 Veículos
- Cadastro da frota: tipo (**carro** ou **van**), modelo/apelido, **placa**, **dia de rodízio** (SP), status (`disponível` / `em uso em festa` / `manutenção`).
- Regras de uso:
  - **Van:** rotativa — motorista da empresa leva/busca equipes; pode atender várias festas no dia.
  - **Carro:** dirigido por um colaborador escalado (que recebe +R$20).
- Vinculação do veículo à festa no formulário de festa; status `em uso` atualizado automaticamente no período da festa.
- Alerta visual quando o veículo está em dia de rodízio na data da festa.

### 6.5 Parceiros (Buffets)
- Cadastro: nome do buffet, endereço completo (CEP autopreenchido), telefone/contato (opcional), observações.
- Ao criar festa, opção "Festa em buffet parceiro" → seleciona da lista e o endereço é preenchido automaticamente. Colaboradores vão direto ao buffet.

### 6.6 Estoque / Materiais
- Cadastro de itens: **foto** (Supabase Storage, compressão no upload), **nome**, **quantidade total**, categoria (opcional).
- **Vinculação a festas:** ao montar uma festa, admin seleciona itens e quantidades que serão levados → sistema dá **baixa temporária** (quantidade "em uso").
- Ao marcar festa como `realizada`, fluxo de **devolução/conferência**: confirmar quantidades devolvidas; divergências registradas (perda/dano) com ajuste do estoque.
- Visão de estoque: disponível × em uso × total, com histórico de movimentações.

### 6.7 Notificações (admin)
- Central de notificações no painel (badge no header) + e-mail via Resend para eventos críticos:
  - Colaborador **recusou** convite de festa.
  - Colaborador **cancelou** confirmação.
  - Novo cadastro de colaborador aguardando aprovação.

---

## 7. Modelo de Dados (Postgres / Supabase)

> Convenção: todas as tabelas com `id uuid default gen_random_uuid()`, `created_at`, `updated_at`. Enums nativos do Postgres.

### 7.1 Enums
```sql
create type user_role as enum ('admin', 'colaborador');
create type cargo_type as enum ('pendente', 'trainee', 'junior', 'experiente', 'coordenador');
create type party_status as enum ('fechada', 'escalada', 'confirmada', 'realizada', 'paga', 'cancelada');
create type assignment_status as enum ('pendente', 'confirmada', 'recusada', 'cancelada');
create type presence_mode as enum ('na_empresa', 'direto_no_local');
create type vehicle_type as enum ('carro', 'van');
create type vehicle_status as enum ('disponivel', 'em_uso', 'manutencao');
create type payment_status as enum ('aberto', 'pago');
create type stock_movement_type as enum ('entrada', 'saida_festa', 'devolucao', 'perda', 'ajuste');
```

### 7.2 Tabelas

**`profiles`** (1:1 com `auth.users`)
- `user_id uuid pk references auth.users`
- `role user_role default 'colaborador'`
- `cargo cargo_type default 'pendente'`
- `nome_completo text`, `nome_tio text`
- `rg text`, `cpf text unique` (validação de dígito verificador via constraint/trigger; avaliar criptografia com pgsodium)
- `email text`, `celular text` (E.164)
- `cep text`, `logradouro text`, `numero text`, `complemento text`, `bairro text`, `cidade text`, `uf text`
- `chave_pix text`
- `ativo boolean default true`
- `aprovado boolean default false`

**`availability`**
- `id`, `user_id fk profiles`, `data date`, `periodo text default 'dia_inteiro'`
- unique (`user_id`, `data`)

**`partners`** (buffets)
- `id`, `nome`, campos de endereço (mesma estrutura de profiles), `contato text`, `observacoes text`, `ativo boolean`

**`vehicles`**
- `id`, `tipo vehicle_type`, `apelido text`, `placa text unique`, `dia_rodizio smallint` (0–6 ou null), `status vehicle_status default 'disponivel'`

**`party_types`**
- `id`, `nome text unique`, `ativo boolean` — seed: Recreação Básica, Discoteca Básica, Discoteca Completa, DJ, Camarim, Oficina

**`parties`**
- `id`, `status party_status default 'fechada'`
- `data date`, `hora_inicio time`, `hora_fim time`
- `contratante_nome text`, `aniversariante_nome text`, `aniversariante_idade smallint`, `qtd_criancas smallint`
- `partner_id fk partners null` (se buffet) OU campos de endereço livres
- `party_type_id fk party_types`, `observacoes text`
- `is_viagem boolean default false`
- `duracao_horas numeric generated` (a partir de hora_inicio/fim; atenção a festas que viram a noite)

**`party_vehicles`**
- `id`, `party_id fk`, `vehicle_id fk` — N:N (uma festa pode ter van + carro)

**`party_assignments`**
- `id`, `party_id fk`, `user_id fk profiles`
- `status assignment_status default 'pendente'`
- `presence_mode presence_mode`, `horario_apresentacao time`
- `is_driver boolean default false`, `vehicle_id fk vehicles null` (carro que dirige)
- `cargo_snapshot cargo_type` (congelado na confirmação)
- `cache_calculado numeric`, `cache_custom numeric null`
- `cache_final numeric generated` → `coalesce(cache_custom, cache_calculado)`
- `motivo_recusa text null`, `respondido_em timestamptz`
- unique (`party_id`, `user_id`)

**`payment_weeks`**
- `id`, `semana_inicio date` (segunda), `semana_fim date` (domingo), unique (`semana_inicio`)

**`payments`**
- `id`, `payment_week_id fk`, `user_id fk profiles`
- `valor_total numeric`, `qtd_festas smallint`
- `status payment_status default 'aberto'`, `pago_em timestamptz null`, `pago_por uuid null`
- Gerado por função de fechamento semanal (agrega assignments confirmados de festas realizadas na semana)

**`stock_items`**
- `id`, `nome text`, `foto_url text`, `quantidade_total int`, `categoria text null`, `ativo boolean`

**`party_stock_items`**
- `id`, `party_id fk`, `stock_item_id fk`, `qtd_levada int`, `qtd_devolvida int null`, `qtd_perdida int default 0`

**`stock_movements`**
- `id`, `stock_item_id fk`, `tipo stock_movement_type`, `quantidade int`, `party_id fk null`, `user_id uuid` (quem registrou), `observacao text`

**`notifications`**
- `id`, `tipo text`, `titulo text`, `corpo text`, `party_id fk null`, `actor_user_id fk null`, `lida boolean default false`
- Destinada aos admins (todos veem a mesma central)

### 7.3 Funções principais (Postgres)
- `calc_cache(cargo, duracao_horas, is_viagem, is_driver) returns numeric` — implementa a ordem da seção 4.1.
- `confirm_assignment(assignment_id)` — SECURITY DEFINER; valida que `auth.uid()` é o dono; congela `cargo_snapshot` e `cache_calculado`.
- `refuse_assignment(assignment_id, motivo)` — idem + insere notificação + enfileira e-mail (via Edge Function/webhook).
- `close_payment_week(semana_inicio)` — gera/atualiza `payments` da semana.
- `set_user_cargo(user_id, cargo)` / `set_user_role(...)` — SECURITY DEFINER, apenas admin.
- Trigger em `auth.users` → cria `profiles` no signup.
- Trigger de custom claim: `role` gravado em `app_metadata` para uso nas RLS via JWT (evita subquery recursiva em policies).

---

## 8. Segurança

### 8.1 RLS (obrigatório em TODAS as tabelas)
Helper: `is_admin()` lê `auth.jwt() -> app_metadata ->> 'role' = 'admin'`.

| Tabela | Colaborador | Admin |
|---|---|---|
| `profiles` | SELECT/UPDATE apenas a própria linha; colunas sensíveis (`role`, `cargo`, `nome_tio`, `aprovado`, `rg`, `cpf`) bloqueadas para UPDATE via trigger/coluna-check | ALL |
| `availability` | ALL nas próprias linhas | SELECT |
| `parties` | SELECT apenas festas onde possui assignment | ALL |
| `party_assignments` | SELECT nas próprias; UPDATE de status apenas via funções `confirm/refuse` | ALL |
| `payments`, `payment_weeks` | SELECT nas próprias | ALL |
| `partners`, `vehicles`, `party_types` | SELECT limitado ao necessário (ex.: veículo vinculado à sua festa) | ALL |
| `stock_*` | sem acesso | ALL |
| `notifications` | sem acesso | ALL |

Regras adicionais:
- Nenhuma escrita direta do client em `role`, `cargo`, `cache_*`, `payments` — apenas via funções SECURITY DEFINER com checagem de permissão interna.
- Service role key **nunca** exposta no client; usada apenas em Server Actions/Edge Functions.
- Storage: bucket de fotos de estoque com policy admin-only para escrita; leitura pública apenas se necessário (preferir signed URLs).

### 8.2 Rate limiting e proteção
- Middleware Next.js + Upstash Redis: limite por IP em rotas de auth/cadastro (ex.: 5 tentativas/min) e APIs públicas.
- Supabase Auth: rate limits nativos habilitados (OTP, signup, login).
- Captcha (Cloudflare Turnstile, gratuito) no cadastro público — recomendado.
- Headers de segurança (CSP, HSTS) via `next.config`.
- Validação dupla: Zod no client/server + constraints no banco (CPF, telefone E.164, CEP).

### 8.3 LGPD / Dados sensíveis
- RG/CPF: acesso restrito (admin + próprio dono); avaliar `pgsodium` para criptografia em repouso.
- Logs sem dados pessoais.
- Soft delete de colaboradores (`ativo = false`) preservando histórico de pagamentos.

---

## 9. Notificações e E-mails (Resend)

| Evento | Canal | Destinatário |
|---|---|---|
| OTP verificação de e-mail | E-mail | Colaborador |
| Novo cadastro pendente | E-mail + painel | Admins |
| Colaborador recusou festa | E-mail + painel | Admins |
| Colaborador cancelou confirmação | E-mail + painel | Admins |
| Convite para festa (v1.1, opcional) | E-mail | Colaborador |

Implementação: inserção em `notifications` + Edge Function (database webhook em `party_assignments`/`profiles`) que dispara o Resend. Manter dentro do free tier (3.000/mês é folgado para 50 colaboradores).

---

## 10. UX / UI

- Design limpo e profissional; shadcn/ui + Tailwind; tema claro com cor primária da marca.
- **Colaborador:** mobile-first, PWA, navegação por bottom tabs: `Escala` · `Disponibilidade` · `Pagamentos` · `Perfil`. Ações de confirmar/recusar com no máximo 2 toques.
- **Admin:** sidebar com: `Festas` (kanban/calendário toggle) · `Colaboradores` · `Pagamentos` · `Veículos` · `Parceiros` · `Estoque`; sino de notificações no header.
- Estados vazios, loading skeletons e feedback de erro em todas as telas.
- Datas/horários sempre em `America/Sao_Paulo`; valores em BRL.

---

## 11. Fases de Desenvolvimento (roadmap para Claude Code)

**Fase 0 — Fundação**
Setup Next.js + Supabase + CI básico; schema completo + enums + RLS + funções; seed de dados de teste; auth (e-mail/senha, Google, OTP via Resend); middleware de rate limit.

**Fase 1 — Colaborador core**
Cadastro completo (CEP, telefone, validações) → aprovação pendente; perfil; disponibilidade; visualização de escala.

**Fase 2 — Admin core**
CRUD de festas + kanban + calendário; CRUD colaboradores (aprovar, cargo, nome de tio); escalação com verificação de disponibilidade; fluxo convite → confirmar/recusar; notificações painel + e-mail.

**Fase 3 — Pagamentos**
Função `calc_cache` + snapshot; fechamento semanal; telas de pagamento (admin e colaborador); marcar como pago; export CSV.

**Fase 4 — Operação**
Veículos (CRUD, rodízio, vínculo com festa, status automático); parceiros/buffets; estoque com fluxo levar → devolver → divergências.

**Fase 5 — Polimento**
PWA, testes E2E dos fluxos críticos (cadastro, confirmação, fechamento de pagamento, RLS), auditoria de segurança das policies, performance.

---

## 12. Critérios de Aceite (amostra dos fluxos críticos)

1. Colaborador A **não consegue** ler nenhum dado do colaborador B por nenhuma rota ou query direta (teste de RLS automatizado).
2. Trainee, festa de 6h, viagem, dirigindo: cachê = (60 + 20) × 2 + 20 = **R$ 180**. Coordenador mesma festa sem dirigir: (200 + 20) × 2 = **R$ 440**.
3. Festa 5h58 **não** recebe adicional; 5h59 recebe.
4. `cache_custom` preenchido ignora todo o cálculo.
5. Festas de seg/22, ter/23 e dom/28 aparecem somadas no pagamento da seg/29.
6. Mudança de cargo após confirmação **não** altera cachê de festas já confirmadas.
7. Recusa de festa gera e-mail ao admin em até 1 min e notificação no painel.
8. Item de estoque levado a uma festa reduz "disponível" e retorna após conferência; perdas registradas ajustam o total.
9. Cliente jamais consegue alterar `role`, `cargo` ou valores de pagamento (tentativas retornam erro de policy).
10. Veículo em dia de rodízio na data da festa exibe alerta ao ser vinculado.

---

## 13. Riscos e Decisões em Aberto

| Item | Decisão v1 | Evolução futura |
|---|---|---|
| Redis/queue | Só rate limit (Upstash) | Filas para e-mails/notificações |
| Auth | Supabase Auth | Backend próprio se escalar |
| Criptografia RG/CPF | Constraint + RLS restrita | pgsodium em repouso |
| Convite por e-mail ao colaborador | Fora da v1 (apenas in-app) | v1.1 |
| Festas que viram a noite (fim < início) | Tratar duração com +24h quando `hora_fim < hora_inicio` | — |
| Rodízio SP | Apenas alerta visual | Bloqueio configurável |
