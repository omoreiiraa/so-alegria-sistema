-- 0004_business_functions: funções de negócio (SECURITY DEFINER) e triggers operacionais
-- Ver docs/01-regras-de-negocio.md §3-§8

-- Helper: usuário está escalado nesta festa? (bypassa RLS para uso em policies)
create or replace function public.is_assigned_to_party(p_party uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.party_assignments a
    where a.party_id = p_party and a.user_id = auth.uid()
  );
$$;

-- Colaborador confirma o convite: congela cargo_snapshot e cache_calculado (snapshot)
create or replace function public.confirm_assignment(p_assignment_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  a        public.party_assignments;
  v_cargo  cargo_type;
  v_dur    numeric;
  v_viagem boolean;
begin
  select * into a from public.party_assignments where id = p_assignment_id;
  if not found then raise exception 'Convite inexistente'; end if;
  if a.user_id <> auth.uid() then
    raise exception 'Sem permissão' using errcode = '42501';
  end if;
  if a.status <> 'pendente' then
    raise exception 'Convite não está pendente';
  end if;

  select p.cargo into v_cargo from public.profiles p where p.user_id = a.user_id;
  select pt.duracao_horas, pt.is_viagem into v_dur, v_viagem
    from public.parties pt where pt.id = a.party_id;

  update public.party_assignments
     set status         = 'confirmada',
         cargo_snapshot  = v_cargo,
         cache_calculado = public.calc_cache(v_cargo, v_dur, v_viagem, a.is_driver),
         respondido_em   = now()
   where id = p_assignment_id;
end $$;

-- Colaborador recusa o convite: registra motivo e notifica admin
create or replace function public.refuse_assignment(p_assignment_id uuid, p_motivo text default null)
returns void language plpgsql security definer set search_path = public as $$
declare a public.party_assignments; v_nome text;
begin
  select * into a from public.party_assignments where id = p_assignment_id;
  if not found then raise exception 'Convite inexistente'; end if;
  if a.user_id <> auth.uid() then raise exception 'Sem permissão' using errcode = '42501'; end if;

  update public.party_assignments
     set status = 'recusada', motivo_recusa = p_motivo, respondido_em = now()
   where id = p_assignment_id;

  select nome_completo into v_nome from public.profiles where user_id = a.user_id;
  insert into public.notifications (tipo, titulo, corpo, party_id, actor_user_id)
  values ('recusa', 'Convite recusado',
          coalesce(v_nome, 'Colaborador') || ' recusou um convite de festa.'
            || case when p_motivo is not null then ' Motivo: ' || p_motivo else '' end,
          a.party_id, a.user_id);
end $$;

-- Colaborador cancela uma confirmação anterior: notifica admin
create or replace function public.cancel_assignment(p_assignment_id uuid, p_motivo text default null)
returns void language plpgsql security definer set search_path = public as $$
declare a public.party_assignments; v_nome text;
begin
  select * into a from public.party_assignments where id = p_assignment_id;
  if not found then raise exception 'Convite inexistente'; end if;
  if a.user_id <> auth.uid() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  if a.status <> 'confirmada' then raise exception 'Só é possível cancelar uma confirmação'; end if;

  update public.party_assignments
     set status = 'cancelada', motivo_recusa = p_motivo, respondido_em = now()
   where id = p_assignment_id;

  select nome_completo into v_nome from public.profiles where user_id = a.user_id;
  insert into public.notifications (tipo, titulo, corpo, party_id, actor_user_id)
  values ('cancelamento', 'Confirmação cancelada',
          coalesce(v_nome, 'Colaborador') || ' cancelou uma confirmação de festa.'
            || case when p_motivo is not null then ' Motivo: ' || p_motivo else '' end,
          a.party_id, a.user_id);
end $$;

-- Admin: fechamento semanal (agrega cachês confirmados de festas realizadas seg–dom)
create or replace function public.close_payment_week(p_semana_inicio date)
returns void language plpgsql security definer set search_path = public as $$
declare v_week_id uuid; v_fim date;
begin
  if not public.is_admin() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  v_fim := p_semana_inicio + 6;

  insert into public.payment_weeks (semana_inicio, semana_fim)
  values (p_semana_inicio, v_fim)
  on conflict (semana_inicio) do update set semana_fim = excluded.semana_fim
  returning id into v_week_id;

  insert into public.payments as pay (payment_week_id, user_id, valor_total, qtd_festas, status)
  select v_week_id, a.user_id, coalesce(sum(a.cache_final), 0), count(*), 'aberto'
    from public.party_assignments a
    join public.parties p on p.id = a.party_id
   where a.status = 'confirmada'
     and p.status = 'realizada'
     and p.data between p_semana_inicio and v_fim
   group by a.user_id
  on conflict (payment_week_id, user_id) do update
     set valor_total = excluded.valor_total,
         qtd_festas  = excluded.qtd_festas
   where pay.status = 'aberto'; -- nunca sobrescreve pagamento já marcado como pago
end $$;

-- Admin: marcar pagamento como pago
create or replace function public.mark_payment_paid(p_payment_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  update public.payments
     set status = 'pago', pago_em = now(), pago_por = auth.uid()
   where id = p_payment_id and status = 'aberto';
end $$;

-- Admin: gestão de colaboradores
create or replace function public.set_user_cargo(p_user uuid, p_cargo cargo_type)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  update public.profiles set cargo = p_cargo where user_id = p_user;
end $$;

create or replace function public.set_user_role(p_user uuid, p_role user_role)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  update public.profiles set role = p_role where user_id = p_user;
end $$;

create or replace function public.approve_user(p_user uuid, p_cargo cargo_type)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  update public.profiles set aprovado = true, ativo = true, cargo = p_cargo where user_id = p_user;
end $$;

-- Notifica admins de novo cadastro pendente
create or replace function public.notify_new_signup()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (tipo, titulo, corpo, actor_user_id)
  values ('novo_cadastro', 'Novo cadastro',
          coalesce(new.nome_completo, new.email, 'Novo colaborador') || ' aguarda aprovação.',
          new.user_id);
  return new;
end $$;

create trigger trg_profiles_notify_signup
  after insert on public.profiles
  for each row when (new.role = 'colaborador')
  execute function public.notify_new_signup();

-- Registra movimentações de estoque a partir de party_stock_items
create or replace function public.log_stock_movement()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if new.qtd_levada > 0 then
      insert into public.stock_movements (stock_item_id, tipo, quantidade, party_id)
      values (new.stock_item_id, 'saida_festa', new.qtd_levada, new.party_id);
    end if;
  elsif tg_op = 'UPDATE' then
    if new.qtd_devolvida is distinct from old.qtd_devolvida and new.qtd_devolvida is not null then
      insert into public.stock_movements (stock_item_id, tipo, quantidade, party_id)
      values (new.stock_item_id, 'devolucao', new.qtd_devolvida, new.party_id);
    end if;
    if new.qtd_perdida > coalesce(old.qtd_perdida, 0) then
      insert into public.stock_movements (stock_item_id, tipo, quantidade, party_id)
      values (new.stock_item_id, 'perda', new.qtd_perdida - coalesce(old.qtd_perdida, 0), new.party_id);
      update public.stock_items
         set quantidade_total = greatest(0, quantidade_total - (new.qtd_perdida - coalesce(old.qtd_perdida, 0)))
       where id = new.stock_item_id;
    end if;
  end if;
  return new;
end $$;

create trigger trg_party_stock_movement
  after insert or update on public.party_stock_items
  for each row execute function public.log_stock_movement();
