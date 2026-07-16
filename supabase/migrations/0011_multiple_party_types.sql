-- 0011_multiple_party_types: Tabela de relacionamento N:N para múltiplos tipos de festa por festa
create table public.party_party_types (
  id             uuid primary key default gen_random_uuid(),
  party_id       uuid not null references public.parties(id) on delete cascade,
  party_type_id  uuid not null references public.party_types(id) on delete cascade,
  created_at     timestamptz not null default now(),
  unique (party_id, party_type_id)
);

-- Habilitar RLS
alter table public.party_party_types enable row level security;

-- Políticas de acesso RLS
create policy party_party_types_select on public.party_party_types
  for select using (auth.uid() is not null);

create policy party_party_types_admin_write on public.party_party_types
  for all using (public.is_admin()) with check (public.is_admin());

-- Migrar dados existentes da coluna `parties.party_type_id` para a nova tabela
insert into public.party_party_types (party_id, party_type_id)
select id, party_type_id 
from public.parties 
where party_type_id is not null
on conflict do nothing;
