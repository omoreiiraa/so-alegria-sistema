-- 0009_admin_colaborador_functions: ações do admin sobre colaboradores (SECURITY DEFINER)
-- nome de tio e ativar/desativar. Cargo e aprovação já têm approve_user / set_user_cargo.

create or replace function public.set_nome_tio(p_user uuid, p_nome text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  update public.profiles set nome_tio = nullif(trim(p_nome), '') where user_id = p_user;
end $$;

create or replace function public.set_user_active(p_user uuid, p_ativo boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  update public.profiles set ativo = p_ativo where user_id = p_user;
end $$;

revoke execute on function public.set_nome_tio(uuid, text)       from anon;
revoke execute on function public.set_user_active(uuid, boolean)  from anon;
