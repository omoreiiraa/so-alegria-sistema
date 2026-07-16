-- 0012_driver_cache_increase: altera o bônus de motorista de +20 para +50 no cálculo de cachê
create or replace function public.calc_cache(
  p_cargo cargo_type, p_duracao_horas numeric, p_is_viagem boolean, p_is_driver boolean
) returns numeric language plpgsql immutable set search_path = public as $$
declare v_base numeric; v_sub numeric;
begin
  v_base := public.cache_base(p_cargo);
  if v_base is null then return null; end if;
  v_sub := v_base + (case when p_duracao_horas >= (5 + 59.0/60.0) then 20 else 0 end);
  if coalesce(p_is_viagem, false) then v_sub := v_sub * 2; end if;
  v_sub := v_sub + (case when coalesce(p_is_driver, false) then 50 else 0 end);
  return v_sub;
end $$;
