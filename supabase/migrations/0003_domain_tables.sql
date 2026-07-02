-- 0003_domain_tables: tabelas de domínio (festas, assignments, pagamentos, estoque, notificações)
-- Ver docs/03-modelo-de-dados.md

create table public.availability (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(user_id) on delete cascade,
  data       date not null,
  periodo    text not null default 'dia_inteiro',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, data)
);
create index idx_availability_user on public.availability(user_id);
create index idx_availability_data on public.availability(data);

create table public.partners (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  cep         text, logradouro text, numero text, complemento text, bairro text, cidade text, uf text,
  contato     text,
  observacoes text,
  ativo       boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.vehicles (
  id          uuid primary key default gen_random_uuid(),
  tipo        vehicle_type not null,
  apelido     text not null,
  placa       text unique,
  dia_rodizio smallint check (dia_rodizio between 0 and 6),
  status      vehicle_status not null default 'disponivel',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.party_types (
  id         uuid primary key default gen_random_uuid(),
  nome       text unique not null,
  ativo      boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.parties (
  id                   uuid primary key default gen_random_uuid(),
  status               party_status not null default 'fechada',
  data                 date not null,
  hora_inicio          time not null,
  hora_fim             time not null,
  -- duração em horas; trata festas que viram a noite (fim < início => +24h)
  duracao_horas        numeric generated always as (
    ((extract(epoch from hora_fim) - extract(epoch from hora_inicio))
      + case when hora_fim < hora_inicio then 86400 else 0 end) / 3600.0
  ) stored,
  contratante_nome     text,
  aniversariante_nome  text,
  aniversariante_idade smallint,
  qtd_criancas         smallint,
  partner_id           uuid references public.partners(id) on delete set null,
  cep text, logradouro text, numero text, complemento text, bairro text, cidade text, uf text,
  party_type_id        uuid references public.party_types(id) on delete set null,
  observacoes          text,
  is_viagem            boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index idx_parties_data   on public.parties(data);
create index idx_parties_status on public.parties(status);

create table public.party_vehicles (
  id         uuid primary key default gen_random_uuid(),
  party_id   uuid not null references public.parties(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (party_id, vehicle_id)
);

create table public.party_assignments (
  id                   uuid primary key default gen_random_uuid(),
  party_id             uuid not null references public.parties(id) on delete cascade,
  user_id              uuid not null references public.profiles(user_id) on delete cascade,
  status               assignment_status not null default 'pendente',
  presence_mode        presence_mode,
  horario_apresentacao time,
  is_driver            boolean not null default false,
  vehicle_id           uuid references public.vehicles(id) on delete set null,
  cargo_snapshot       cargo_type,
  cache_calculado      numeric,
  cache_custom         numeric,
  cache_final          numeric generated always as (coalesce(cache_custom, cache_calculado)) stored,
  motivo_recusa        text,
  respondido_em        timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (party_id, user_id)
);
create index idx_assignments_user   on public.party_assignments(user_id);
create index idx_assignments_party  on public.party_assignments(party_id);
create index idx_assignments_status on public.party_assignments(status);

create table public.payment_weeks (
  id            uuid primary key default gen_random_uuid(),
  semana_inicio date not null unique,
  semana_fim    date not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.payments (
  id              uuid primary key default gen_random_uuid(),
  payment_week_id uuid not null references public.payment_weeks(id) on delete cascade,
  user_id         uuid not null references public.profiles(user_id) on delete cascade,
  valor_total     numeric not null default 0,
  qtd_festas      smallint not null default 0,
  status          payment_status not null default 'aberto',
  pago_em         timestamptz,
  pago_por        uuid,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (payment_week_id, user_id)
);
create index idx_payments_user on public.payments(user_id);

create table public.stock_items (
  id               uuid primary key default gen_random_uuid(),
  nome             text not null,
  foto_url         text,
  quantidade_total int not null default 0,
  categoria        text,
  ativo            boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table public.party_stock_items (
  id            uuid primary key default gen_random_uuid(),
  party_id      uuid not null references public.parties(id) on delete cascade,
  stock_item_id uuid not null references public.stock_items(id) on delete cascade,
  qtd_levada    int not null default 0,
  qtd_devolvida int,
  qtd_perdida   int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (party_id, stock_item_id)
);

create table public.stock_movements (
  id            uuid primary key default gen_random_uuid(),
  stock_item_id uuid not null references public.stock_items(id) on delete cascade,
  tipo          stock_movement_type not null,
  quantidade    int not null,
  party_id      uuid references public.parties(id) on delete set null,
  user_id       uuid,
  observacao    text,
  created_at    timestamptz not null default now()
);
create index idx_stock_movements_item on public.stock_movements(stock_item_id);

create table public.notifications (
  id            uuid primary key default gen_random_uuid(),
  tipo          text not null,
  titulo        text not null,
  corpo         text,
  party_id      uuid references public.parties(id) on delete set null,
  actor_user_id uuid,
  lida          boolean not null default false,
  created_at    timestamptz not null default now()
);
create index idx_notifications_lida on public.notifications(lida);

-- updated_at triggers
create trigger trg_availability_updated       before update on public.availability       for each row execute function public.set_updated_at();
create trigger trg_partners_updated           before update on public.partners           for each row execute function public.set_updated_at();
create trigger trg_vehicles_updated           before update on public.vehicles           for each row execute function public.set_updated_at();
create trigger trg_party_types_updated        before update on public.party_types        for each row execute function public.set_updated_at();
create trigger trg_parties_updated            before update on public.parties            for each row execute function public.set_updated_at();
create trigger trg_assignments_updated        before update on public.party_assignments  for each row execute function public.set_updated_at();
create trigger trg_payment_weeks_updated      before update on public.payment_weeks      for each row execute function public.set_updated_at();
create trigger trg_payments_updated           before update on public.payments           for each row execute function public.set_updated_at();
create trigger trg_stock_items_updated        before update on public.stock_items        for each row execute function public.set_updated_at();
create trigger trg_party_stock_items_updated  before update on public.party_stock_items  for each row execute function public.set_updated_at();
