-- 0005_rls_policies: RLS obrigatória em todas as tabelas + policies
-- Ver docs/04-seguranca-rls-lgpd.md (matriz de acesso)

alter table public.profiles          enable row level security;
alter table public.availability      enable row level security;
alter table public.partners          enable row level security;
alter table public.vehicles          enable row level security;
alter table public.party_types       enable row level security;
alter table public.parties           enable row level security;
alter table public.party_vehicles    enable row level security;
alter table public.party_assignments enable row level security;
alter table public.payment_weeks     enable row level security;
alter table public.payments          enable row level security;
alter table public.stock_items       enable row level security;
alter table public.party_stock_items enable row level security;
alter table public.stock_movements   enable row level security;
alter table public.notifications     enable row level security;

-- profiles: dono lê/edita a própria linha; admin tudo (campos restritos via trigger)
create policy profiles_select on public.profiles
  for select using (user_id = auth.uid() or public.is_admin());
create policy profiles_update on public.profiles
  for update using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());
create policy profiles_admin_insert on public.profiles
  for insert with check (public.is_admin());
create policy profiles_admin_delete on public.profiles
  for delete using (public.is_admin());

-- availability: colaborador ALL nas próprias; admin lê
create policy availability_owner_all on public.availability
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy availability_admin_select on public.availability
  for select using (public.is_admin());

-- party_types: qualquer autenticado lê (necessário nos formulários); admin escreve
create policy party_types_select on public.party_types
  for select using (auth.uid() is not null);
create policy party_types_admin_write on public.party_types
  for all using (public.is_admin()) with check (public.is_admin());

-- vehicles e partners: dados de referência não sensíveis; autenticado lê; admin escreve
create policy vehicles_select on public.vehicles
  for select using (auth.uid() is not null);
create policy vehicles_admin_write on public.vehicles
  for all using (public.is_admin()) with check (public.is_admin());

create policy partners_select on public.partners
  for select using (auth.uid() is not null);
create policy partners_admin_write on public.partners
  for all using (public.is_admin()) with check (public.is_admin());

-- parties: colaborador vê só festas onde está escalado; admin tudo
create policy parties_select on public.parties
  for select using (public.is_admin() or public.is_assigned_to_party(id));
create policy parties_admin_insert on public.parties
  for insert with check (public.is_admin());
create policy parties_admin_update on public.parties
  for update using (public.is_admin()) with check (public.is_admin());
create policy parties_admin_delete on public.parties
  for delete using (public.is_admin());

-- party_vehicles: visível a quem participa da festa; admin escreve
create policy party_vehicles_select on public.party_vehicles
  for select using (public.is_admin() or public.is_assigned_to_party(party_id));
create policy party_vehicles_admin_write on public.party_vehicles
  for all using (public.is_admin()) with check (public.is_admin());

-- party_assignments: dono lê a sua; escrita de status só via funções (confirm/refuse/cancel)
create policy assignments_select on public.party_assignments
  for select using (user_id = auth.uid() or public.is_admin());
create policy assignments_admin_insert on public.party_assignments
  for insert with check (public.is_admin());
create policy assignments_admin_update on public.party_assignments
  for update using (public.is_admin()) with check (public.is_admin());
create policy assignments_admin_delete on public.party_assignments
  for delete using (public.is_admin());

-- payment_weeks: períodos são públicos aos autenticados; admin escreve
create policy payment_weeks_select on public.payment_weeks
  for select using (auth.uid() is not null);
create policy payment_weeks_admin_write on public.payment_weeks
  for all using (public.is_admin()) with check (public.is_admin());

-- payments: dono lê os seus; admin tudo
create policy payments_select on public.payments
  for select using (user_id = auth.uid() or public.is_admin());
create policy payments_admin_write on public.payments
  for all using (public.is_admin()) with check (public.is_admin());

-- estoque e notificações: apenas admin (colaborador sem acesso => sem policy)
create policy stock_items_admin on public.stock_items
  for all using (public.is_admin()) with check (public.is_admin());
create policy party_stock_items_admin on public.party_stock_items
  for all using (public.is_admin()) with check (public.is_admin());
create policy stock_movements_admin on public.stock_movements
  for all using (public.is_admin()) with check (public.is_admin());
create policy notifications_admin on public.notifications
  for all using (public.is_admin()) with check (public.is_admin());
