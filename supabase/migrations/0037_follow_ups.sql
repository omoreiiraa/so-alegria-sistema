-- 0037_follow_ups: registro de contatos com o cliente, por festa.
--
-- Cada linha é uma anotação do escritório ("cobrei, disse que manda amanhã").
-- Não se edita: errou, apaga e escreve de novo. O autor é sempre quem está
-- logado — a policy confere, então ninguém escreve em nome de outra pessoa.
-- Ver ADR-0029.
create table if not exists public.party_follow_ups (
  id          uuid primary key default gen_random_uuid(),
  party_id    uuid not null references public.parties(id) on delete cascade,
  autor_id    uuid references public.profiles(id) on delete set null,
  texto       text not null check (char_length(btrim(texto)) between 1 and 2000),
  created_at  timestamptz not null default now()
);

comment on table public.party_follow_ups is
  'Follow-ups do escritório com o cliente da festa (anotação livre, com autor e hora).';

create index if not exists party_follow_ups_party_idx
  on public.party_follow_ups (party_id, created_at desc);

alter table public.party_follow_ups enable row level security;

-- Perfil de quem está logado (null para quem não trabalha no escritório).
create or replace function public.current_profile_id()
returns uuid
language sql stable security definer set search_path = ''
as $$ select id from public.profiles where user_id = auth.uid() $$;
revoke all on function public.current_profile_id() from public, anon;
grant execute on function public.current_profile_id() to authenticated;

drop policy if exists follow_ups_select on public.party_follow_ups;
drop policy if exists follow_ups_insert on public.party_follow_ups;
drop policy if exists follow_ups_delete on public.party_follow_ups;

create policy follow_ups_select on public.party_follow_ups
  for select to authenticated
  using ((select public.is_equipe()));

create policy follow_ups_insert on public.party_follow_ups
  for insert to authenticated
  with check (
    (select public.is_equipe())
    and autor_id = (select public.current_profile_id())
  );

-- Apaga o próprio registro; a gestão apaga qualquer um.
create policy follow_ups_delete on public.party_follow_ups
  for delete to authenticated
  using (
    (select public.is_equipe())
    and (autor_id = (select public.current_profile_id()) or (select public.is_gestao()))
  );
