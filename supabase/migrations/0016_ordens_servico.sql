-- 0016_ordens_servico: Ordem de Serviço (ANEXO I) por colaborador escalado.
-- Uma OS por assignment: o modelo da CONTRATANTE tem função, cachê e aceite
-- individuais, então cada colaborador da festa tem o seu próprio número.

create type service_order_status as enum ('rascunho', 'enviada', 'aceita', 'recusada');
create type confirmation_method  as enum ('whatsapp', 'email', 'assinatura_fisica');

create table public.service_orders (
  id                   uuid primary key default gen_random_uuid(),
  party_assignment_id  uuid not null unique
                         references public.party_assignments(id) on delete cascade,
  ano                  smallint not null,
  numero               integer  not null,
  data_emissao         date     not null default (now() at time zone 'America/Sao_Paulo')::date,
  status               service_order_status not null default 'rascunho',
  enviada_em           timestamptz null,
  respondido_em        timestamptz null,
  meio_confirmacao     confirmation_method null,
  motivo_recusa        text null,
  arquivo_path         text null,
  observacoes          text null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint service_orders_numero_por_ano unique (ano, numero)
);

comment on table public.service_orders is
  'Ordem de Serviço (ANEXO I) emitida por colaborador escalado. Numeração sequencial por ano.';
comment on column public.service_orders.arquivo_path is
  'Caminho no bucket ordens-servico do .docx preenchido e devolvido pelo admin.';

create index service_orders_assignment_idx on public.service_orders (party_assignment_id);
create index service_orders_status_idx     on public.service_orders (status);

create trigger set_updated_at
  before update on public.service_orders
  for each row execute function public.set_updated_at();

-- Numeração sequencial por ano, à prova de corrida: o lock é por ano, então
-- duas emissões simultâneas não geram o mesmo número.
create or replace function public.create_service_order(p_assignment uuid)
returns public.service_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ano    smallint;
  v_numero integer;
  v_row    public.service_orders;
begin
  if not public.is_admin() then
    raise exception 'Sem permissão';
  end if;

  if not exists (select 1 from public.party_assignments where id = p_assignment) then
    raise exception 'Escalação não encontrada';
  end if;

  v_ano := extract(year from (now() at time zone 'America/Sao_Paulo'))::smallint;

  perform pg_advisory_xact_lock(hashtext('service_orders_' || v_ano::text));

  select coalesce(max(numero), 0) + 1 into v_numero
    from public.service_orders where ano = v_ano;

  insert into public.service_orders (party_assignment_id, ano, numero)
  values (p_assignment, v_ano, v_numero)
  returning * into v_row;

  return v_row;
end;
$$;

revoke execute on function public.create_service_order(uuid) from public, anon;
grant  execute on function public.create_service_order(uuid) to authenticated;

-- RLS
alter table public.service_orders enable row level security;

create policy service_orders_admin_all on public.service_orders
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Colaborador enxerga apenas a OS das próprias escalações (leitura).
create policy service_orders_owner_select on public.service_orders
  for select to authenticated
  using (
    exists (
      select 1 from public.party_assignments pa
      where pa.id = service_orders.party_assignment_id
        and pa.user_id = (select auth.uid())
    )
  );

-- Bucket privado do .docx preenchido
insert into storage.buckets (id, name, public)
values ('ordens-servico', 'ordens-servico', false)
on conflict (id) do nothing;

create policy "ordens_servico_admin_all" on storage.objects
  for all to authenticated
  using (bucket_id = 'ordens-servico' and public.is_admin())
  with check (bucket_id = 'ordens-servico' and public.is_admin());
