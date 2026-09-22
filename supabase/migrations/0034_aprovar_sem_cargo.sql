-- 0034_aprovar_sem_cargo: aprovar colaborador não define mais função.
--
-- Continuação da 0033. Lá o cachê deixou de vir do cargo do cadastro; aqui a
-- escolha do cargo sai da tela de aprovação inteira. A gerente não quer decidir
-- nível nenhum ao aprovar — a mesma pessoa vai como coordenadora numa festa e
-- experiente na outra, e isso já é escolhido na escalação. Aprovar passa a ser
-- só liberar a pessoa para ser escalada.
--
-- `profiles.cargo` continua na tabela por dois motivos: é o fallback de
-- escalações criadas antes da 0033 (resolve_link e responder_convite fazem
-- coalesce nele) e guarda o nível de quem já estava aprovado. Ninguém mais
-- escreve nessa coluna, e nenhuma tela lê.

drop function if exists public.approve_user(uuid, cargo_type);

create or replace function public.approve_user(p_profile uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_equipe() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  update public.profiles set aprovado = true, ativo = true where id = p_profile;
end $$;

revoke execute on function public.approve_user(uuid) from public, anon;
grant  execute on function public.approve_user(uuid) to authenticated;

-- Não existe mais tela que troque o cargo do cadastro.
drop function if exists public.set_user_cargo(uuid, cargo_type);

comment on column public.profiles.cargo is
  'Herança: nível geral de quem foi aprovado antes da 0034. Não define cachê '
  'nem quem pode ser escalado — quem vale é party_assignments.cargo_snapshot, '
  'escolhido na escalação (ADR-0026). Nenhuma tela escreve aqui.';
