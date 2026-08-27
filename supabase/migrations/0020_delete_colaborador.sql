-- 0020_delete_colaborador: exclusão definitiva da ficha do colaborador.
--
-- As três FKs que apontam para profiles(id) são ON DELETE CASCADE, então um
-- delete cru levaria junto party_assignments e payments — apagando histórico
-- financeiro sem aviso. A função recusa a exclusão nesse caso e manda desativar.

create or replace function public.delete_colaborador(p_profile uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_role      user_role;
  v_escalas   int;
  v_pagamentos int;
begin
  if not public.is_admin() then
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

revoke execute on function public.delete_colaborador(uuid) from public, anon;
grant  execute on function public.delete_colaborador(uuid) to authenticated;
