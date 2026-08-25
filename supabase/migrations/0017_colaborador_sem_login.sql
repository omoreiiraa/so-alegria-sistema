-- 0017_colaborador_sem_login: o colaborador deixa de ser usuário do sistema.
--
-- Antes: todo colaborador tinha conta em auth.users, fazia login e navegava em /app.
-- Agora: o admin cria a ficha e envia dois tipos de link tokenizado por WhatsApp —
-- um de cadastro (uma vez, sem prazo) e um de convite de festa (expira em 24h).
--
-- O nó a desatar é profiles.user_id ser, ao mesmo tempo, chave primária e FK para
-- auth.users: isso tornava impossível existir colaborador sem conta de login.

-- ---------------------------------------------------------------------------
-- 1. profiles ganha identidade própria
-- ---------------------------------------------------------------------------

alter table public.profiles add column if not exists id uuid not null default gen_random_uuid();

-- Repontar as tabelas filhas para profiles.id antes de mexer na PK.
alter table public.party_assignments add column if not exists profile_id uuid;
alter table public.payments          add column if not exists profile_id uuid;

update public.party_assignments a
   set profile_id = p.id
  from public.profiles p
 where p.user_id = a.user_id and a.profile_id is null;

update public.payments pay
   set profile_id = p.id
  from public.profiles p
 where p.user_id = pay.user_id and pay.profile_id is null;

-- Policies que referenciam as colunas antigas precisam sair antes do drop.
drop policy if exists assignments_select on public.party_assignments;
drop policy if exists payments_select    on public.payments;
drop policy if exists profiles_select    on public.profiles;
drop policy if exists profiles_update    on public.profiles;
drop policy if exists parties_select     on public.parties;
drop policy if exists party_vehicles_select on public.party_vehicles;
drop policy if exists service_orders_owner_select on public.service_orders;

-- Funções que dependiam de auth.uid() do colaborador.
drop function if exists public.confirm_assignment(uuid);
drop function if exists public.refuse_assignment(uuid, text);
drop function if exists public.cancel_assignment(uuid, text);
drop function if exists public.is_assigned_to_party(uuid);

alter table public.party_assignments drop constraint if exists party_assignments_user_id_fkey;
alter table public.party_assignments drop constraint if exists party_assignments_party_id_user_id_key;
alter table public.payments          drop constraint if exists payments_user_id_fkey;
alter table public.payments          drop constraint if exists payments_payment_week_id_user_id_key;
drop index if exists public.idx_assignments_user;
drop index if exists public.idx_payments_user;

alter table public.party_assignments drop column user_id;
alter table public.payments          drop column user_id;

alter table public.party_assignments alter column profile_id set not null;
alter table public.payments          alter column profile_id set not null;

drop table if exists public.availability;

-- Troca da PK. A FK para auth.users vira opcional (só admin tem conta) e passa a
-- SET NULL: apagar a conta de auth não pode mais levar a ficha do colaborador junto.
alter table public.profiles drop constraint profiles_pkey cascade;
alter table public.profiles add primary key (id);
alter table public.profiles alter column user_id drop not null;
alter table public.profiles drop constraint if exists profiles_user_id_fkey;
alter table public.profiles
  add constraint profiles_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete set null;
create unique index if not exists profiles_user_id_key on public.profiles (user_id)
  where user_id is not null;

alter table public.party_assignments
  add constraint party_assignments_profile_id_fkey
  foreign key (profile_id) references public.profiles(id) on delete cascade,
  add constraint party_assignments_party_id_profile_id_key unique (party_id, profile_id);

alter table public.payments
  add constraint payments_profile_id_fkey
  foreign key (profile_id) references public.profiles(id) on delete cascade,
  add constraint payments_payment_week_id_profile_id_key unique (payment_week_id, profile_id);

create index idx_assignments_profile on public.party_assignments (profile_id);
create index idx_payments_profile     on public.payments (profile_id);

-- notifications.actor_user_id passa a guardar profiles.id (nunca teve FK).
alter table public.notifications rename column actor_user_id to actor_profile_id;

-- ---------------------------------------------------------------------------
-- 2. Some o que existia para o colaborador logado
-- ---------------------------------------------------------------------------

-- Sem autocadastro, não há o que notificar.
drop trigger if exists trg_profiles_notify_signup on public.profiles;
drop function if exists public.notify_new_signup();

-- Este trigger bloqueava rg/cpf/cargo para quem não é admin. Como o RPC de cadastro
-- roda sem auth.uid(), ele barraria o próprio formulário de cadastro por token. A
-- proteção ficou redundante: só o admin (via RLS) e os RPCs abaixo escrevem em profiles.
drop trigger if exists trg_profiles_prevent_sensitive on public.profiles;
drop function if exists public.prevent_sensitive_profile_update();

-- Só sincroniza o role no auth quando há conta ligada (admin).
create or replace function public.sync_user_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.user_id is not null then
    update auth.users
       set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
                               || jsonb_build_object('role', new.role::text)
     where id = new.user_id;
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Policies: tudo que era do colaborador vira admin-only
-- ---------------------------------------------------------------------------

create policy profiles_select on public.profiles
  for select to authenticated using ((select public.is_admin()));
create policy profiles_update on public.profiles
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy assignments_select on public.party_assignments
  for select to authenticated using ((select public.is_admin()));
create policy payments_select on public.payments
  for select to authenticated using ((select public.is_admin()));
create policy parties_select on public.parties
  for select to authenticated using ((select public.is_admin()));
create policy party_vehicles_select on public.party_vehicles
  for select to authenticated using ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- 4. Funções de admin passam a endereçar profiles.id
-- ---------------------------------------------------------------------------

drop function if exists public.approve_user(uuid, cargo_type);
drop function if exists public.set_user_cargo(uuid, cargo_type);
drop function if exists public.set_nome_tio(uuid, text);
drop function if exists public.set_user_active(uuid, boolean);
drop function if exists public.set_user_role(uuid, user_role);

create or replace function public.approve_user(p_profile uuid, p_cargo cargo_type)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  update public.profiles set aprovado = true, ativo = true, cargo = p_cargo where id = p_profile;
end $$;

create or replace function public.set_user_cargo(p_profile uuid, p_cargo cargo_type)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  update public.profiles set cargo = p_cargo where id = p_profile;
end $$;

create or replace function public.set_nome_tio(p_profile uuid, p_nome text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  update public.profiles set nome_tio = nullif(trim(p_nome), '') where id = p_profile;
end $$;

create or replace function public.set_user_active(p_profile uuid, p_ativo boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  update public.profiles set ativo = p_ativo where id = p_profile;
end $$;

create or replace function public.set_user_role(p_profile uuid, p_role user_role)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  update public.profiles set role = p_role where id = p_profile;
end $$;

create or replace function public.close_payment_week(p_semana_inicio date)
returns void language plpgsql security definer set search_path = public as $$
declare v_week_id uuid; v_fim date;
begin
  if not public.is_admin() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  v_fim := p_semana_inicio + 6;

  insert into public.payment_weeks (semana_inicio, semana_fim)
  values (p_semana_inicio, v_fim)
  on conflict (semana_inicio) do update set semana_fim = excluded.semana_fim
  returning id into v_week_id;

  insert into public.payments as pay (payment_week_id, profile_id, valor_total, qtd_festas, status)
  select v_week_id, a.profile_id, coalesce(sum(a.cache_final), 0), count(*), 'aberto'
    from public.party_assignments a
    join public.parties p on p.id = a.party_id
   where a.status = 'confirmada'
     and p.status = 'realizada'
     and p.data between p_semana_inicio and v_fim
   group by a.profile_id
  on conflict (payment_week_id, profile_id) do update
     set valor_total = excluded.valor_total,
         qtd_festas  = excluded.qtd_festas
   where pay.status = 'aberto';
end $$;

-- ---------------------------------------------------------------------------
-- 5. Links tokenizados
-- ---------------------------------------------------------------------------

do $$ begin
  create type link_tipo as enum ('cadastro', 'convite');
exception when duplicate_object then null; end $$;

create table public.colaborador_links (
  id                  uuid primary key default gen_random_uuid(),
  tipo                link_tipo not null,
  -- Guardamos só o sha256 do token. Um vazamento do banco não entrega links válidos.
  token_hash          text not null unique,
  profile_id          uuid not null references public.profiles(id) on delete cascade,
  party_assignment_id uuid references public.party_assignments(id) on delete cascade,
  expira_em           timestamptz,
  usado_em            timestamptz,
  revogado_em         timestamptz,
  created_at          timestamptz not null default now(),
  created_by          uuid references auth.users(id) on delete set null,
  constraint colaborador_links_forma check (
    (tipo = 'convite'  and party_assignment_id is not null and expira_em is not null) or
    (tipo = 'cadastro' and party_assignment_id is null)
  )
);

create index idx_colaborador_links_profile on public.colaborador_links (profile_id);
create index idx_colaborador_links_assignment on public.colaborador_links (party_assignment_id);
create index idx_colaborador_links_created_by on public.colaborador_links (created_by);

alter table public.colaborador_links enable row level security;

-- Só o admin enxerga os links pelo painel. O acesso público não toca a tabela:
-- passa pelos RPCs abaixo, chamados do servidor com service role.
create policy colaborador_links_admin on public.colaborador_links
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- 6. RPCs do fluxo público (validam e queimam o token na mesma transação)
-- ---------------------------------------------------------------------------

-- Lê o estado do link sem consumi-lo. Devolve o que a página pública precisa mostrar.
create or replace function public.resolve_link(p_token_hash text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  l      public.colaborador_links;
  v_prof public.profiles;
  a      public.party_assignments;
  p      public.parties;
  v_estado text;
begin
  select * into l from public.colaborador_links where token_hash = p_token_hash;
  if not found then return jsonb_build_object('estado', 'inexistente'); end if;

  if    l.revogado_em is not null                        then v_estado := 'revogado';
  elsif l.usado_em is not null                           then v_estado := 'usado';
  elsif l.expira_em is not null and l.expira_em <= now() then v_estado := 'expirado';
  else                                                        v_estado := 'valido';
  end if;

  select * into v_prof from public.profiles where id = l.profile_id;

  if l.tipo = 'cadastro' then
    return jsonb_build_object(
      'estado', v_estado,
      'tipo',   'cadastro',
      'colaborador', jsonb_build_object(
        'nome_completo', v_prof.nome_completo,
        'celular',       v_prof.celular
      )
    );
  end if;

  select * into a from public.party_assignments where id = l.party_assignment_id;
  select * into p from public.parties where id = a.party_id;

  -- Um convite já respondido não volta a ser válido nem dentro das 24h.
  if v_estado = 'valido' and a.status <> 'pendente' then v_estado := 'respondido'; end if;

  return jsonb_build_object(
    'estado', v_estado,
    'tipo',   'convite',
    'colaborador', jsonb_build_object('nome_completo', v_prof.nome_completo),
    'assignment', jsonb_build_object(
      'status',               a.status,
      'presence_mode',        a.presence_mode,
      'horario_apresentacao', a.horario_apresentacao,
      'is_driver',            a.is_driver,
      'cache_estimado', coalesce(
        a.cache_custom,
        public.calc_cache(v_prof.cargo, p.duracao_horas, p.is_viagem, a.is_driver)
      )
    ),
    'festa', jsonb_build_object(
      'data',        p.data,
      'hora_inicio', p.hora_inicio,
      'hora_fim',    p.hora_fim,
      'contratante', p.contratante_nome,
      'logradouro',  p.logradouro,
      'numero',      p.numero,
      'complemento', p.complemento,
      'bairro',      p.bairro,
      'cidade',      p.cidade,
      'uf',          p.uf,
      'is_viagem',   p.is_viagem
    )
  );
end $$;

-- Grava o cadastro do colaborador e queima o link.
create or replace function public.submit_cadastro_by_token(p_token_hash text, p_dados jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare l public.colaborador_links;
begin
  select * into l from public.colaborador_links
   where token_hash = p_token_hash and tipo = 'cadastro'
     for update;
  if not found                then raise exception 'Link inválido'  using errcode = '42501'; end if;
  if l.revogado_em is not null then raise exception 'Link revogado'  using errcode = '42501'; end if;
  if l.usado_em is not null    then raise exception 'Link já usado'  using errcode = '42501'; end if;
  if l.expira_em is not null and l.expira_em <= now() then
    raise exception 'Link expirado' using errcode = '42501';
  end if;

  update public.profiles set
    nome_completo = coalesce(p_dados ->> 'nome_completo', nome_completo),
    rg            = p_dados ->> 'rg',
    cpf           = p_dados ->> 'cpf',
    email         = p_dados ->> 'email',
    celular       = p_dados ->> 'celular',
    cep           = p_dados ->> 'cep',
    logradouro    = p_dados ->> 'logradouro',
    numero        = p_dados ->> 'numero',
    complemento   = coalesce(p_dados ->> 'complemento', ''),
    bairro        = p_dados ->> 'bairro',
    cidade        = p_dados ->> 'cidade',
    uf            = upper(p_dados ->> 'uf'),
    chave_pix     = p_dados ->> 'chave_pix'
  where id = l.profile_id;

  update public.colaborador_links set usado_em = now() where id = l.id;
end $$;

-- Aceita ou recusa o convite. O cachê continua sendo congelado pelo Postgres.
create or replace function public.responder_convite_by_token(
  p_token_hash text, p_aceita boolean, p_motivo text default null
) returns void language plpgsql security definer set search_path = public as $$
declare
  l        public.colaborador_links;
  a        public.party_assignments;
  v_cargo  cargo_type;
  v_nome   text;
  v_dur    numeric;
  v_viagem boolean;
begin
  select * into l from public.colaborador_links
   where token_hash = p_token_hash and tipo = 'convite'
     for update;
  if not found                 then raise exception 'Link inválido' using errcode = '42501'; end if;
  if l.revogado_em is not null then raise exception 'Link revogado' using errcode = '42501'; end if;
  if l.usado_em is not null    then raise exception 'Link já usado' using errcode = '42501'; end if;
  if l.expira_em <= now()      then raise exception 'Link expirado' using errcode = '42501'; end if;

  select * into a from public.party_assignments where id = l.party_assignment_id for update;
  if not found then raise exception 'Convite inexistente'; end if;
  if a.status <> 'pendente' then raise exception 'Convite já respondido'; end if;

  select p.cargo, p.nome_completo into v_cargo, v_nome
    from public.profiles p where p.id = a.profile_id;

  if p_aceita then
    select pt.duracao_horas, pt.is_viagem into v_dur, v_viagem
      from public.parties pt where pt.id = a.party_id;

    update public.party_assignments
       set status          = 'confirmada',
           cargo_snapshot  = v_cargo,
           cache_calculado = public.calc_cache(v_cargo, v_dur, v_viagem, a.is_driver),
           respondido_em   = now()
     where id = a.id;
  else
    update public.party_assignments
       set status = 'recusada', motivo_recusa = p_motivo, respondido_em = now()
     where id = a.id;

    insert into public.notifications (tipo, titulo, corpo, party_id, actor_profile_id)
    values ('recusa', 'Convite recusado',
            coalesce(v_nome, 'Colaborador') || ' recusou um convite de festa.'
              || case when p_motivo is not null then ' Motivo: ' || p_motivo else '' end,
            a.party_id, a.profile_id);
  end if;

  update public.colaborador_links set usado_em = now() where id = l.id;
end $$;

-- Os RPCs públicos só podem ser chamados pelo servidor (service role). O anon nunca
-- alcança nem a tabela de links nem estas funções.
revoke execute on function public.resolve_link(text)                          from public, anon, authenticated;
revoke execute on function public.submit_cadastro_by_token(text, jsonb)       from public, anon, authenticated;
revoke execute on function public.responder_convite_by_token(text, boolean, text) from public, anon, authenticated;
grant  execute on function public.resolve_link(text)                          to service_role;
grant  execute on function public.submit_cadastro_by_token(text, jsonb)       to service_role;
grant  execute on function public.responder_convite_by_token(text, boolean, text) to service_role;
