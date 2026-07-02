-- 0007_harden_functions: fixa search_path e restringe execução direta via API
-- Responde aos advisors de segurança (function_search_path_mutable / definer executable)

-- 1) search_path explícito nas funções que faltavam
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end $$;

create or replace function public.is_admin()
returns boolean language sql stable set search_path = public as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin';
$$;

create or replace function public.cache_base(p_cargo cargo_type)
returns numeric language sql immutable set search_path = public as $$
  select (case p_cargo
    when 'trainee'     then 60
    when 'junior'      then 80
    when 'experiente'  then 100
    when 'coordenador' then 200
    else null
  end)::numeric;
$$;

create or replace function public.calc_cache(
  p_cargo cargo_type, p_duracao_horas numeric, p_is_viagem boolean, p_is_driver boolean
) returns numeric language plpgsql immutable set search_path = public as $$
declare v_base numeric; v_sub numeric;
begin
  v_base := public.cache_base(p_cargo);
  if v_base is null then return null; end if;
  v_sub := v_base + (case when p_duracao_horas >= (5 + 59.0/60.0) then 20 else 0 end);
  if coalesce(p_is_viagem, false) then v_sub := v_sub * 2; end if;
  v_sub := v_sub + (case when coalesce(p_is_driver, false) then 20 else 0 end);
  return v_sub;
end $$;

create or replace function public.prevent_sensitive_profile_update()
returns trigger language plpgsql set search_path = public as $$
begin
  if not public.is_admin() then
    if new.role is distinct from old.role
    or new.cargo is distinct from old.cargo
    or new.nome_tio is distinct from old.nome_tio
    or new.aprovado is distinct from old.aprovado
    or new.rg is distinct from old.rg
    or new.cpf is distinct from old.cpf
    or new.user_id is distinct from old.user_id then
      raise exception 'Alteração de campo restrito não permitida' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

-- 2) Funções de trigger não devem ser chamáveis via API REST/RPC
revoke execute on function public.set_updated_at()                  from anon, authenticated;
revoke execute on function public.handle_new_user()                 from anon, authenticated;
revoke execute on function public.sync_user_role()                  from anon, authenticated;
revoke execute on function public.notify_new_signup()               from anon, authenticated;
revoke execute on function public.log_stock_movement()              from anon, authenticated;
revoke execute on function public.prevent_sensitive_profile_update() from anon, authenticated;

-- 3) RPCs de negócio: somente usuários autenticados (removendo anon)
revoke execute on function public.confirm_assignment(uuid)               from anon;
revoke execute on function public.refuse_assignment(uuid, text)          from anon;
revoke execute on function public.cancel_assignment(uuid, text)          from anon;
revoke execute on function public.close_payment_week(date)               from anon;
revoke execute on function public.mark_payment_paid(uuid)                from anon;
revoke execute on function public.set_user_cargo(uuid, cargo_type)       from anon;
revoke execute on function public.set_user_role(uuid, user_role)         from anon;
revoke execute on function public.approve_user(uuid, cargo_type)         from anon;

-- Observação: is_admin() e is_assigned_to_party() permanecem executáveis pelos roles
-- porque são usadas na avaliação das policies de RLS durante as consultas.
