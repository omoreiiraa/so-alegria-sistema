-- 0018_reharden_admin_rpcs: restaura o endurecimento da 0010 nas funções de admin
-- recriadas pela 0017. `create or replace` devolve EXECUTE ao public/anon por
-- padrão; a 0010 tinha deixado essas RPCs acessíveis só a authenticated.

revoke execute on function public.approve_user(uuid, cargo_type)   from public, anon;
revoke execute on function public.set_user_cargo(uuid, cargo_type) from public, anon;
revoke execute on function public.set_nome_tio(uuid, text)         from public, anon;
revoke execute on function public.set_user_active(uuid, boolean)   from public, anon;
revoke execute on function public.set_user_role(uuid, user_role)   from public, anon;
revoke execute on function public.close_payment_week(date)         from public, anon;
revoke execute on function public.sync_user_role()                 from public, anon;

grant execute on function public.approve_user(uuid, cargo_type)   to authenticated;
grant execute on function public.set_user_cargo(uuid, cargo_type) to authenticated;
grant execute on function public.set_nome_tio(uuid, text)         to authenticated;
grant execute on function public.set_user_active(uuid, boolean)   to authenticated;
grant execute on function public.set_user_role(uuid, user_role)   to authenticated;
grant execute on function public.close_payment_week(date)         to authenticated;
