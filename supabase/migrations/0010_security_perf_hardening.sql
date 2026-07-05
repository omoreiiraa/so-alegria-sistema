-- 0010_security_perf_hardening: responde aos advisors (security + performance)
--  1) índices em FKs sem cobertura
--  2) policies reescritas com (select ...) e consolidadas por ação (to authenticated)
--  3) revoga EXECUTE de funções de trigger e restringe RPCs a authenticated

-- 1) Índices de FKs -----------------------------------------------------------
create index if not exists idx_notifications_party    on public.notifications(party_id);
create index if not exists idx_parties_partner        on public.parties(partner_id);
create index if not exists idx_parties_type           on public.parties(party_type_id);
create index if not exists idx_assignments_vehicle    on public.party_assignments(vehicle_id);
create index if not exists idx_party_stock_item       on public.party_stock_items(stock_item_id);
create index if not exists idx_party_vehicles_vehicle on public.party_vehicles(vehicle_id);
create index if not exists idx_stock_movements_party  on public.stock_movements(party_id);

-- 2) Recria todas as policies do schema public --------------------------------
do $$
declare r record;
begin
  for r in select policyname, tablename from pg_policies where schemaname = 'public' loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- profiles
create policy profiles_select on public.profiles for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy profiles_update on public.profiles for update to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()))
  with check (user_id = (select auth.uid()) or (select public.is_admin()));
create policy profiles_admin_insert on public.profiles for insert to authenticated
  with check ((select public.is_admin()));
create policy profiles_admin_delete on public.profiles for delete to authenticated
  using ((select public.is_admin()));

-- availability
create policy availability_select on public.availability for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy availability_owner_insert on public.availability for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy availability_owner_update on public.availability for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy availability_owner_delete on public.availability for delete to authenticated
  using (user_id = (select auth.uid()));

-- party_types (referência: todo autenticado lê; admin escreve)
create policy party_types_select on public.party_types for select to authenticated using (true);
create policy party_types_admin_insert on public.party_types for insert to authenticated with check ((select public.is_admin()));
create policy party_types_admin_update on public.party_types for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy party_types_admin_delete on public.party_types for delete to authenticated using ((select public.is_admin()));

-- vehicles
create policy vehicles_select on public.vehicles for select to authenticated using (true);
create policy vehicles_admin_insert on public.vehicles for insert to authenticated with check ((select public.is_admin()));
create policy vehicles_admin_update on public.vehicles for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy vehicles_admin_delete on public.vehicles for delete to authenticated using ((select public.is_admin()));

-- partners
create policy partners_select on public.partners for select to authenticated using (true);
create policy partners_admin_insert on public.partners for insert to authenticated with check ((select public.is_admin()));
create policy partners_admin_update on public.partners for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy partners_admin_delete on public.partners for delete to authenticated using ((select public.is_admin()));

-- parties (colaborador vê só onde está escalado; is_assigned_to_party recebe id por linha)
create policy parties_select on public.parties for select to authenticated
  using ((select public.is_admin()) or public.is_assigned_to_party(id));
create policy parties_admin_insert on public.parties for insert to authenticated with check ((select public.is_admin()));
create policy parties_admin_update on public.parties for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy parties_admin_delete on public.parties for delete to authenticated using ((select public.is_admin()));

-- party_vehicles
create policy party_vehicles_select on public.party_vehicles for select to authenticated
  using ((select public.is_admin()) or public.is_assigned_to_party(party_id));
create policy party_vehicles_admin_insert on public.party_vehicles for insert to authenticated with check ((select public.is_admin()));
create policy party_vehicles_admin_update on public.party_vehicles for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy party_vehicles_admin_delete on public.party_vehicles for delete to authenticated using ((select public.is_admin()));

-- party_assignments (status muda só via funções; escrita direta é admin)
create policy assignments_select on public.party_assignments for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy assignments_admin_insert on public.party_assignments for insert to authenticated with check ((select public.is_admin()));
create policy assignments_admin_update on public.party_assignments for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy assignments_admin_delete on public.party_assignments for delete to authenticated using ((select public.is_admin()));

-- payment_weeks
create policy payment_weeks_select on public.payment_weeks for select to authenticated using (true);
create policy payment_weeks_admin_insert on public.payment_weeks for insert to authenticated with check ((select public.is_admin()));
create policy payment_weeks_admin_update on public.payment_weeks for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy payment_weeks_admin_delete on public.payment_weeks for delete to authenticated using ((select public.is_admin()));

-- payments
create policy payments_select on public.payments for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy payments_admin_insert on public.payments for insert to authenticated with check ((select public.is_admin()));
create policy payments_admin_update on public.payments for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy payments_admin_delete on public.payments for delete to authenticated using ((select public.is_admin()));

-- estoque + notificações (apenas admin)
create policy stock_items_admin on public.stock_items for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy party_stock_items_admin on public.party_stock_items for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy stock_movements_admin on public.stock_movements for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy notifications_admin on public.notifications for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- 3) Grants de execução -------------------------------------------------------
-- Funções de trigger: nunca chamáveis via API
revoke execute on function public.handle_new_user()                  from public, anon, authenticated;
revoke execute on function public.sync_user_role()                   from public, anon, authenticated;
revoke execute on function public.notify_new_signup()                from public, anon, authenticated;
revoke execute on function public.log_stock_movement()               from public, anon, authenticated;
revoke execute on function public.set_updated_at()                   from public, anon, authenticated;
revoke execute on function public.prevent_sensitive_profile_update() from public, anon, authenticated;

-- RPCs de negócio: somente usuários autenticados (as funções checam permissão internamente)
revoke execute on function public.confirm_assignment(uuid)          from public, anon;
revoke execute on function public.refuse_assignment(uuid, text)     from public, anon;
revoke execute on function public.cancel_assignment(uuid, text)     from public, anon;
revoke execute on function public.close_payment_week(date)          from public, anon;
revoke execute on function public.mark_payment_paid(uuid)           from public, anon;
revoke execute on function public.set_user_cargo(uuid, cargo_type)  from public, anon;
revoke execute on function public.set_user_role(uuid, user_role)    from public, anon;
revoke execute on function public.approve_user(uuid, cargo_type)    from public, anon;
revoke execute on function public.set_nome_tio(uuid, text)          from public, anon;
revoke execute on function public.set_user_active(uuid, boolean)    from public, anon;

grant execute on function public.confirm_assignment(uuid)         to authenticated;
grant execute on function public.refuse_assignment(uuid, text)    to authenticated;
grant execute on function public.cancel_assignment(uuid, text)    to authenticated;
grant execute on function public.close_payment_week(date)         to authenticated;
grant execute on function public.mark_payment_paid(uuid)          to authenticated;
grant execute on function public.set_user_cargo(uuid, cargo_type) to authenticated;
grant execute on function public.set_user_role(uuid, user_role)   to authenticated;
grant execute on function public.approve_user(uuid, cargo_type)   to authenticated;
grant execute on function public.set_nome_tio(uuid, text)         to authenticated;
grant execute on function public.set_user_active(uuid, boolean)   to authenticated;
