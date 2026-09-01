-- 0028_funcionario_ve_a_operacao: o funcionário passa a enxergar a operação
-- inteira; o que fica reservado à gestão é **dinheiro e OS**.
--
-- A 0026 tinha desenhado o funcionário como "só estoque". O escritório corrigiu:
-- Carol e Caio trabalham na operação — festas, escala, colaboradores, frota,
-- parceiros, estoque. Fora do alcance deles ficam só Pagamentos e Ordem de
-- Serviço. Ver ADR-0022 (revisada).
--
-- Com isso a fronteira útil deixou de ser "admin x resto" e virou
-- "equipe x gestão". `is_admin()` some: com o funcionário enxergando quase tudo,
-- o nome passaria a mentir feio numa policy — quem lê `is_admin()` numa cláusula
-- precisa saber, sem consultar nada, quem entra ali. Entra `is_gestao()`, e o
-- `drop` no fim da migration é a prova de que nenhuma policy ficou para trás.

-- ---------------------------------------------------------------------------
-- 1. O novo nome
-- ---------------------------------------------------------------------------

create or replace function public.is_gestao()
returns boolean language sql stable set search_path to 'public' as $$
  select public.auth_role() in ('dona', 'admin', 'gerente');
$$;

revoke execute on function public.is_gestao() from public;
grant  execute on function public.is_gestao() to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2. A operação: qualquer login do escritório
-- ---------------------------------------------------------------------------
-- As policies estavam quebradas por comando (insert/update/delete separados),
-- herança de quando o SELECT tinha predicado próprio — o colaborador via só as
-- festas dele. Esse predicado morreu na 0017; hoje as quatro dizem a mesma
-- coisa, então voltam a ser uma só por tabela.

drop policy if exists parties_select        on public.parties;
drop policy if exists parties_admin_insert  on public.parties;
drop policy if exists parties_admin_update  on public.parties;
drop policy if exists parties_admin_delete  on public.parties;
create policy parties_equipe on public.parties
  for all to authenticated
  using ((select public.is_equipe())) with check ((select public.is_equipe()));

drop policy if exists assignments_select       on public.party_assignments;
drop policy if exists assignments_admin_insert on public.party_assignments;
drop policy if exists assignments_admin_update on public.party_assignments;
drop policy if exists assignments_admin_delete on public.party_assignments;
create policy assignments_equipe on public.party_assignments
  for all to authenticated
  using ((select public.is_equipe())) with check ((select public.is_equipe()));

drop policy if exists party_vehicles_select       on public.party_vehicles;
drop policy if exists party_vehicles_admin_insert on public.party_vehicles;
drop policy if exists party_vehicles_admin_update on public.party_vehicles;
drop policy if exists party_vehicles_admin_delete on public.party_vehicles;
create policy party_vehicles_equipe on public.party_vehicles
  for all to authenticated
  using ((select public.is_equipe())) with check ((select public.is_equipe()));

drop policy if exists party_types_select       on public.party_types;
drop policy if exists party_types_admin_insert on public.party_types;
drop policy if exists party_types_admin_update on public.party_types;
drop policy if exists party_types_admin_delete on public.party_types;
create policy party_types_equipe on public.party_types
  for all to authenticated
  using ((select public.is_equipe())) with check ((select public.is_equipe()));

drop policy if exists party_party_types_admin on public.party_party_types;
create policy party_party_types_equipe on public.party_party_types
  for all to authenticated
  using ((select public.is_equipe())) with check ((select public.is_equipe()));

drop policy if exists vehicles_select       on public.vehicles;
drop policy if exists vehicles_admin_insert on public.vehicles;
drop policy if exists vehicles_admin_update on public.vehicles;
drop policy if exists vehicles_admin_delete on public.vehicles;
create policy vehicles_equipe on public.vehicles
  for all to authenticated
  using ((select public.is_equipe())) with check ((select public.is_equipe()));

drop policy if exists partners_select       on public.partners;
drop policy if exists partners_admin_insert on public.partners;
drop policy if exists partners_admin_update on public.partners;
drop policy if exists partners_admin_delete on public.partners;
create policy partners_equipe on public.partners
  for all to authenticated
  using ((select public.is_equipe())) with check ((select public.is_equipe()));

drop policy if exists colaborador_links_admin on public.colaborador_links;
create policy colaborador_links_equipe on public.colaborador_links
  for all to authenticated
  using ((select public.is_equipe())) with check ((select public.is_equipe()));

drop policy if exists notifications_admin on public.notifications;
create policy notifications_equipe on public.notifications
  for all to authenticated
  using ((select public.is_equipe())) with check ((select public.is_equipe()));

-- Materiais da festa: a 0026 tinha deixado o funcionário só ler, porque ele não
-- entrava na tela da festa. Agora entra — vincular e conferir devolução é dele.
drop policy if exists party_stock_items_select       on public.party_stock_items;
drop policy if exists party_stock_items_admin_insert on public.party_stock_items;
drop policy if exists party_stock_items_admin_update on public.party_stock_items;
drop policy if exists party_stock_items_admin_delete on public.party_stock_items;
create policy party_stock_items_equipe on public.party_stock_items
  for all to authenticated
  using ((select public.is_equipe())) with check ((select public.is_equipe()));

-- profiles fica com SELECT à parte: a cláusula da própria linha é o que sustenta
-- o login. Escrever continua sendo da equipe, e `role` segue só da dona
-- (trigger guard_profile_privileges, da 0026).
drop policy if exists profiles_select       on public.profiles;
drop policy if exists profiles_update       on public.profiles;
drop policy if exists profiles_admin_insert on public.profiles;
drop policy if exists profiles_admin_delete on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using ((select public.is_equipe()) or user_id = (select auth.uid()));
create policy profiles_equipe_insert on public.profiles
  for insert to authenticated with check ((select public.is_equipe()));
create policy profiles_equipe_update on public.profiles
  for update to authenticated
  using ((select public.is_equipe())) with check ((select public.is_equipe()));
create policy profiles_equipe_delete on public.profiles
  for delete to authenticated using ((select public.is_equipe()));

-- ---------------------------------------------------------------------------
-- 3. Dinheiro e Ordem de Serviço: só a gestão
-- ---------------------------------------------------------------------------

drop policy if exists payments_select       on public.payments;
drop policy if exists payments_admin_insert on public.payments;
drop policy if exists payments_admin_update on public.payments;
drop policy if exists payments_admin_delete on public.payments;
create policy payments_gestao on public.payments
  for all to authenticated
  using ((select public.is_gestao())) with check ((select public.is_gestao()));

drop policy if exists payment_weeks_select       on public.payment_weeks;
drop policy if exists payment_weeks_admin_insert on public.payment_weeks;
drop policy if exists payment_weeks_admin_update on public.payment_weeks;
drop policy if exists payment_weeks_admin_delete on public.payment_weeks;
create policy payment_weeks_gestao on public.payment_weeks
  for all to authenticated
  using ((select public.is_gestao())) with check ((select public.is_gestao()));

drop policy if exists service_orders_admin_all on public.service_orders;
create policy service_orders_gestao on public.service_orders
  for all to authenticated
  using ((select public.is_gestao())) with check ((select public.is_gestao()));

-- ---------------------------------------------------------------------------
-- 4. Storage
-- ---------------------------------------------------------------------------
-- O contrato é da festa, então acompanha a festa. O .docx da OS não.

drop policy if exists contratos_admin_all on storage.objects;
create policy contratos_equipe_all on storage.objects
  for all to authenticated
  using (bucket_id = 'contratos' and (select public.is_equipe()))
  with check (bucket_id = 'contratos' and (select public.is_equipe()));

drop policy if exists ordens_servico_admin_all on storage.objects;
create policy ordens_servico_gestao_all on storage.objects
  for all to authenticated
  using (bucket_id = 'ordens-servico' and (select public.is_gestao()))
  with check (bucket_id = 'ordens-servico' and (select public.is_gestao()));

-- ---------------------------------------------------------------------------
-- 5. Funções: mesma divisão
-- ---------------------------------------------------------------------------
-- Gerir colaborador é operação; fechar semana, dar baixa em pagamento e emitir
-- OS, não. Só a linha da guarda muda; o corpo é o que já estava rodando.

create or replace function public.approve_user(p_profile uuid, p_cargo cargo_type)
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  if not public.is_equipe() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  update public.profiles set aprovado = true, ativo = true, cargo = p_cargo where id = p_profile;
end $$;

create or replace function public.set_user_cargo(p_profile uuid, p_cargo cargo_type)
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  if not public.is_equipe() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  update public.profiles set cargo = p_cargo where id = p_profile;
end $$;

create or replace function public.set_nome_tio(p_profile uuid, p_nome text)
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  if not public.is_equipe() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  update public.profiles set nome_tio = nullif(trim(p_nome), '') where id = p_profile;
end $$;

create or replace function public.set_user_active(p_profile uuid, p_ativo boolean)
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  if not public.is_equipe() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  update public.profiles set ativo = p_ativo where id = p_profile;
end $$;

create or replace function public.delete_colaborador(p_profile uuid)
returns void language plpgsql security definer set search_path to 'public' as $$
declare
  v_role       user_role;
  v_escalas    int;
  v_pagamentos int;
begin
  if not public.is_equipe() then
    raise exception 'Sem permissão' using errcode = '42501';
  end if;

  select role into v_role from public.profiles where id = p_profile;
  if v_role is null then
    raise exception 'Colaborador não encontrado' using errcode = 'P0002';
  end if;
  if v_role <> 'colaborador' then
    raise exception 'Só colaboradores podem ser excluídos' using errcode = '42501';
  end if;

  select count(*) into v_escalas    from public.party_assignments where profile_id = p_profile;
  select count(*) into v_pagamentos from public.payments          where profile_id = p_profile;

  if v_escalas > 0 or v_pagamentos > 0 then
    raise exception
      'Colaborador tem histórico (% festa(s), % pagamento(s)). Desative em vez de excluir.',
      v_escalas, v_pagamentos
      using errcode = '23503';
  end if;

  -- colaborador_links cai por cascade; nada mais aponta para profiles.
  delete from public.profiles where id = p_profile;
end $$;

create or replace function public.close_payment_week(p_semana_inicio date)
returns void language plpgsql security definer set search_path to 'public' as $$
declare v_week_id uuid; v_fim date;
begin
  if not public.is_gestao() then raise exception 'Sem permissão' using errcode = '42501'; end if;
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

create or replace function public.mark_payment_paid(p_payment_id uuid)
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  if not public.is_gestao() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  update public.payments
     set status = 'pago', pago_em = now(), pago_por = auth.uid()
   where id = p_payment_id and status = 'aberto';
end $$;

create or replace function public.create_service_order(p_assignment uuid)
returns service_orders language plpgsql security definer set search_path to 'public' as $$
declare
  v_ano    smallint;
  v_numero integer;
  v_row    public.service_orders;
begin
  if not public.is_gestao() then
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
end $$;

-- ---------------------------------------------------------------------------
-- 6. Adeus, is_admin()
-- ---------------------------------------------------------------------------
-- Sem `if exists` de propósito: se alguma policy ainda depender dele, o drop
-- falha e a migration inteira volta atrás. É a checagem que eu quero.

drop function public.is_admin();
