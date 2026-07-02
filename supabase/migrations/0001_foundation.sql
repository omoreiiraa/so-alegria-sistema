-- 0001_foundation: extensões, enums, helpers de cálculo e utilitários
-- Ver docs/03-modelo-de-dados.md e docs/01-regras-de-negocio.md

create extension if not exists pgcrypto;

-- Enums (seção 7.1 do PRD)
create type user_role          as enum ('admin', 'colaborador');
create type cargo_type         as enum ('pendente', 'trainee', 'junior', 'experiente', 'coordenador');
create type party_status       as enum ('fechada', 'escalada', 'confirmada', 'realizada', 'paga', 'cancelada');
create type assignment_status  as enum ('pendente', 'confirmada', 'recusada', 'cancelada');
create type presence_mode      as enum ('na_empresa', 'direto_no_local');
create type vehicle_type       as enum ('carro', 'van');
create type vehicle_status     as enum ('disponivel', 'em_uso', 'manutencao');
create type payment_status     as enum ('aberto', 'pago');
create type stock_movement_type as enum ('entrada', 'saida_festa', 'devolucao', 'perda', 'ajuste');

-- updated_at automático
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- is_admin(): lê o role do JWT (app_metadata). Evita subquery recursiva nas policies.
create or replace function public.is_admin()
returns boolean language sql stable as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin';
$$;

-- cache_base: cachê base por cargo, referente a até 4h (regra 4.1)
create or replace function public.cache_base(p_cargo cargo_type)
returns numeric language sql immutable as $$
  select (case p_cargo
    when 'trainee'     then 60
    when 'junior'      then 80
    when 'experiente'  then 100
    when 'coordenador' then 200
    else null
  end)::numeric;
$$;

-- calc_cache: implementa a ordem da seção 4.1
--   base -> hora extra (>=5h59 => +20, uma vez) -> viagem (x2) -> motorista (+20)
create or replace function public.calc_cache(
  p_cargo         cargo_type,
  p_duracao_horas numeric,
  p_is_viagem     boolean,
  p_is_driver     boolean
) returns numeric language plpgsql immutable as $$
declare
  v_base numeric;
  v_sub  numeric;
begin
  v_base := public.cache_base(p_cargo);
  if v_base is null then
    return null; -- cargo pendente não possui cachê
  end if;
  -- hora extra: duração >= 5h59min soma +R$20 (uma única vez)
  v_sub := v_base + (case when p_duracao_horas >= (5 + 59.0/60.0) then 20 else 0 end);
  -- viagem: duplica o subtotal (base + hora extra)
  if coalesce(p_is_viagem, false) then
    v_sub := v_sub * 2;
  end if;
  -- motorista: soma +R$20 APÓS a duplicação de viagem
  v_sub := v_sub + (case when coalesce(p_is_driver, false) then 20 else 0 end);
  return v_sub;
end $$;
