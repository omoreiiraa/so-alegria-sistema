-- 0023_delete_stock_item: remover item do estoque passa a refletir no banco.
--
-- Antes a remoção só marcava ativo = false: o item sumia da tela, mas
-- quantidade_total continuava lá, e o banco seguia afirmando que a empresa
-- tinha aquele patrimônio. Ver ADR-0020.
--
-- Devolve 'apagado' (nunca foi usado, saiu de vez) ou 'zerado' (tinha
-- movimentação, virou inativo com quantidade zero para o histórico sobreviver).

create or replace function public.delete_stock_item(p_item uuid)
returns text
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_nome    text;
  v_festas  int;
  v_movs    int;
begin
  if not public.is_admin() then
    raise exception 'Sem permissão' using errcode = '42501';
  end if;

  -- Trava a linha: duas remoções simultâneas não se atropelam.
  select nome into v_nome from public.stock_items where id = p_item for update;
  if v_nome is null then
    raise exception 'Item não encontrado' using errcode = 'P0002';
  end if;

  -- Em uso numa festa, remover apagaria o item da lista de materiais dela
  -- (a FK é ON DELETE CASCADE). Melhor barrar e mandar desvincular antes.
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
