-- 0026_papeis_de_acesso: cada pessoa do escritório com o seu próprio login.
--
-- Antes o escritório inteiro entrava por uma conta só (soalegria@admin.com) e
-- `is_admin()` era um interruptor de duas posições: ou você era o admin, ou não
-- existia para o banco. Agora cada uma tem a sua conta e o `role` diz até onde ela vai.
-- Ver ADR-0022 e a matriz em docs/04-seguranca-rls-lgpd.md.
--
--   dona        — Camila. Tudo, inclusive definir o papel de acesso das outras.
--   gerente     — Paula. Toda a operação; não mexe em papel de acesso.
--   funcionario — Carol, Caio. Só o estoque (e a própria senha).
--   admin       — papel legado da conta única; segue valendo como `dona`.
--   colaborador — tio/tia. Não tem login (ADR-0012) e continua sem acesso nenhum.

-- ---------------------------------------------------------------------------
-- 1. Novos valores em user_role
-- ---------------------------------------------------------------------------
-- `alter type … add value` não permite gravar o valor novo na mesma transação,
-- e a migration roda inteira dentro de uma. Trocar o tipo resolve de uma vez.

drop function if exists public.set_user_role(uuid, user_role);
-- Postgres não deixa mexer no tipo de uma coluna citada em `update of role`.
drop trigger if exists trg_profiles_sync_role on public.profiles;

alter type public.user_role rename to user_role_legado;
create type public.user_role as enum
  ('admin', 'dona', 'gerente', 'funcionario', 'colaborador');

alter table public.profiles alter column role drop default;
alter table public.profiles
  alter column role type public.user_role using role::text::public.user_role;
alter table public.profiles alter column role set default 'colaborador';

drop type public.user_role_legado;

create trigger trg_profiles_sync_role
  after insert or update of role on public.profiles
  for each row execute function public.sync_user_role();

-- ---------------------------------------------------------------------------
-- 2. Helpers de permissão (leem o custom claim, sem subquery em profiles)
-- ---------------------------------------------------------------------------

create or replace function public.auth_role()
returns text language sql stable set search_path to 'public' as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '');
$$;

-- Proprietária: o único papel que cria conta e troca papel de acesso.
create or replace function public.is_dona()
returns boolean language sql stable set search_path to 'public' as $$
  select public.auth_role() in ('dona', 'admin');
$$;

-- Gestão = dona + gerente. O nome `is_admin` fica: são ~45 policies e uma dúzia
-- de funções SECURITY DEFINER chamando por ele. O que mudou foi o alcance.
create or replace function public.is_admin()
returns boolean language sql stable set search_path to 'public' as $$
  select public.auth_role() in ('dona', 'admin', 'gerente');
$$;

-- Qualquer pessoa do escritório com login. É o crachá do estoque.
create or replace function public.is_equipe()
returns boolean language sql stable set search_path to 'public' as $$
  select public.auth_role() in ('dona', 'admin', 'gerente', 'funcionario');
$$;

-- `create or replace` devolve EXECUTE ao public por padrão (a armadilha da 0018).
revoke execute on function public.auth_role()  from public;
revoke execute on function public.is_dona()    from public;
revoke execute on function public.is_admin()   from public;
revoke execute on function public.is_equipe()  from public;
grant  execute on function public.auth_role()  to anon, authenticated, service_role;
grant  execute on function public.is_dona()    to anon, authenticated, service_role;
grant  execute on function public.is_admin()   to anon, authenticated, service_role;
grant  execute on function public.is_equipe()  to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3. Trava de escalonamento de privilégio
-- ---------------------------------------------------------------------------
-- A policy `profiles_update` é da gestão inteira. Sem esta trava, a gerente
-- daria um UPDATE na própria linha, viraria `dona` (o trigger sync_user_role
-- levaria o claim junto) e o modelo de papéis não valeria nada.

create or replace function public.guard_profile_privileges()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  -- Sem JWT é o servidor falando (service role): por aí passam os RPCs de token
  -- e o provisionamento de contas. Quem tem sessão precisa ser a dona.
  if (select auth.uid()) is null or public.is_dona() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.role <> 'colaborador' then
      raise exception 'Só a proprietária cria conta de acesso' using errcode = '42501';
    end if;
  elsif new.role is distinct from old.role
     or new.user_id is distinct from old.user_id then
    raise exception 'Só a proprietária altera o perfil de acesso' using errcode = '42501';
  end if;

  return new;
end $$;

drop trigger if exists trg_profiles_guard_privileges on public.profiles;
create trigger trg_profiles_guard_privileges
  before insert or update on public.profiles
  for each row execute function public.guard_profile_privileges();

revoke execute on function public.guard_profile_privileges()
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Policies
-- ---------------------------------------------------------------------------

-- profiles: além da gestão, cada pessoa lê a própria linha — é o que o login usa
-- para saber quem entrou. Escrever, só a gestão (e `role` só a dona, via trigger).
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using ((select public.is_admin()) or user_id = (select auth.uid()));

-- Estoque: é o trabalho da funcionária. Item e movimento passam a ser da equipe.
drop policy if exists stock_items_admin on public.stock_items;
create policy stock_items_equipe on public.stock_items
  for all to authenticated
  using ((select public.is_equipe())) with check ((select public.is_equipe()));

drop policy if exists stock_movements_admin on public.stock_movements;
create policy stock_movements_equipe on public.stock_movements
  for all to authenticated
  using ((select public.is_equipe())) with check ((select public.is_equipe()));

-- Materiais da festa: a tela de estoque lê daqui para calcular o "em uso".
-- Vincular e conferir devolução continua sendo da gestão, na tela da festa.
drop policy if exists party_stock_items_admin on public.party_stock_items;
create policy party_stock_items_select on public.party_stock_items
  for select to authenticated using ((select public.is_equipe()));
create policy party_stock_items_admin_insert on public.party_stock_items
  for insert to authenticated with check ((select public.is_admin()));
create policy party_stock_items_admin_update on public.party_stock_items
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy party_stock_items_admin_delete on public.party_stock_items
  for delete to authenticated using ((select public.is_admin()));

-- Estas quatro liberavam SELECT a qualquer autenticado — sobra da época em que o
-- colaborador tinha login. Agora que existe login de menor privilégio, a brecha
-- deixou de ser teórica: voltam a ser da gestão, como docs/04 sempre descreveu.
drop policy if exists party_types_select on public.party_types;
create policy party_types_select on public.party_types
  for select to authenticated using ((select public.is_admin()));

drop policy if exists vehicles_select on public.vehicles;
create policy vehicles_select on public.vehicles
  for select to authenticated using ((select public.is_admin()));

drop policy if exists partners_select on public.partners;
create policy partners_select on public.partners
  for select to authenticated using ((select public.is_admin()));

drop policy if exists payment_weeks_select on public.payment_weeks;
create policy payment_weeks_select on public.payment_weeks
  for select to authenticated using ((select public.is_admin()));

-- Storage: as fotos do estoque acompanham quem mexe no estoque.
drop policy if exists estoque_admin_all on storage.objects;
create policy estoque_equipe_all on storage.objects
  for all to authenticated
  using (bucket_id = 'estoque' and (select public.is_equipe()))
  with check (bucket_id = 'estoque' and (select public.is_equipe()));

-- ---------------------------------------------------------------------------
-- 5. RPCs que mudam de guarda
-- ---------------------------------------------------------------------------

-- Remover item do estoque é trabalho de estoque (ver 0023 para o resto do corpo).
create or replace function public.delete_stock_item(p_item uuid)
returns text language plpgsql security definer set search_path to 'public' as $$
declare
  v_nome    text;
  v_festas  int;
  v_movs    int;
begin
  if not public.is_equipe() then
    raise exception 'Sem permissão' using errcode = '42501';
  end if;

  select nome into v_nome from public.stock_items where id = p_item for update;
  if v_nome is null then
    raise exception 'Item não encontrado' using errcode = 'P0002';
  end if;

  select count(*) into v_festas
    from public.party_stock_items where stock_item_id = p_item;
  if v_festas > 0 then
    raise exception 'O item está vinculado a % festa(s). Remova-o das festas antes.', v_festas
      using errcode = '23503';
  end if;

  select count(*) into v_movs
    from public.stock_movements where stock_item_id = p_item;

  if v_movs = 0 then
    delete from public.stock_items where id = p_item;
    return 'apagado';
  end if;

  update public.stock_items
     set ativo = false, quantidade_total = 0
   where id = p_item;
  return 'zerado';
end $$;

revoke execute on function public.delete_stock_item(uuid) from public, anon;
grant  execute on function public.delete_stock_item(uuid) to authenticated;

-- Definir papel de acesso é da dona, não da gestão inteira.
create or replace function public.set_user_role(p_profile uuid, p_role user_role)
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  if not public.is_dona() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  update public.profiles set role = p_role where id = p_profile;
end $$;

revoke execute on function public.set_user_role(uuid, user_role) from public, anon;
grant  execute on function public.set_user_role(uuid, user_role) to authenticated;
