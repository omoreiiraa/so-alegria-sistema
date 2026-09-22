-- 0033_cache_por_festa: o cachê deixa de vir do cargo do cadastro e passa a ser
-- decidido na escalação, festa a festa.
--
-- A gerente não quer mais escolher trainee/júnior/experiente/coordenador na hora
-- de aprovar o colaborador: a mesma pessoa vai como coordenadora numa festa e
-- como experiente na outra, e as festas têm valores diferentes. O cargo do
-- cadastro continua existindo como nível geral da pessoa, mas não vale dinheiro.
--
-- Quem passa a valer é `party_assignments.cargo_snapshot`, escolhido pelo admin
-- no momento de escalar. A coluna já existia — era preenchida só no aceite, com
-- o cargo do perfil. Agora nasce na escalação e o aceite respeita o que estiver
-- lá. Nada do que já foi pago muda: linhas antigas têm cargo_snapshot preenchido
-- e cache_final é coluna gerada sobre valores já gravados.

comment on column public.party_assignments.cargo_snapshot is
  'Função do colaborador NESTA festa, escolhida na escalação. É ela que define '
  'o cachê — não o cargo do cadastro (ADR-0026).';

-- ---------------------------------------------------------------------------
-- 1) cachê calculado já na escalação
-- ---------------------------------------------------------------------------
-- Antes o valor só existia depois do aceite, então a gerente escalava sem ver
-- quanto a pessoa ia receber. Como a decisão do valor agora é dela, na
-- escalação, o número tem de aparecer na hora. A conta continua sendo do
-- Postgres (ADR-0001): o app nunca calcula cachê.
create or replace function public.assignment_preenche_cache()
returns trigger language plpgsql set search_path = public as $$
declare v_dur numeric; v_viagem boolean;
begin
  if new.cargo_snapshot is null then
    return new;
  end if;
  select p.duracao_horas, p.is_viagem into v_dur, v_viagem
    from public.parties p where p.id = new.party_id;
  new.cache_calculado := public.calc_cache(
    new.cargo_snapshot, v_dur, v_viagem, coalesce(new.is_driver, false)
  );
  return new;
end $$;

drop trigger if exists trg_assignment_cache on public.party_assignments;
create trigger trg_assignment_cache
  before insert or update of cargo_snapshot, is_driver on public.party_assignments
  for each row execute function public.assignment_preenche_cache();

-- ---------------------------------------------------------------------------
-- 2) prévia dos valores para a tela de escalação
-- ---------------------------------------------------------------------------
-- Devolve, para uma festa, quanto dá cada função com e sem motorista. Serve só
-- para a gerente ver o valor antes de confirmar — mas vem do mesmo calc_cache
-- que grava, para não existir uma segunda tabela de preços no JavaScript.
create or replace function public.calc_cache_preview(p_party_id uuid)
returns jsonb language sql stable set search_path = public as $$
  select coalesce(
    jsonb_object_agg(c.cargo, jsonb_build_object(
      'normal',    public.calc_cache(c.cargo, p.duracao_horas, p.is_viagem, false),
      'motorista', public.calc_cache(c.cargo, p.duracao_horas, p.is_viagem, true)
    )),
    '{}'::jsonb
  )
  from public.parties p
  cross join (values
    ('trainee'::cargo_type), ('junior'), ('experiente'), ('coordenador')
  ) as c(cargo)
  where p.id = p_party_id;
$$;

revoke execute on function public.calc_cache_preview(uuid) from public, anon;
grant  execute on function public.calc_cache_preview(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 3) o aceite respeita a função escolhida na escalação
-- ---------------------------------------------------------------------------
-- Antes o aceite carimbava o cargo do perfil por cima, o que apagaria a escolha
-- da gerente. Agora só preenche se a escalação não tiver definido (linhas
-- criadas antes desta migration). O cache_calculado sai do trigger acima.
create or replace function public.responder_convite_by_token(
  p_token_hash text, p_aceita boolean, p_motivo text default null
) returns void language plpgsql security definer set search_path = public as $$
declare
  l        public.colaborador_links;
  a        public.party_assignments;
  v_cargo  cargo_type;
  v_nome   text;
begin
  select * into l from public.colaborador_links
   where token_hash = p_token_hash and tipo = 'convite'
     for update;
  if not found                 then raise exception 'Link inválido' using errcode = '42501'; end if;
  if l.revogado_em is not null then raise exception 'Link revogado' using errcode = '42501'; end if;
  if l.usado_em is not null    then raise exception 'Link já usado' using errcode = '42501'; end if;
  if l.expira_em <= now()      then raise exception 'Link expirado' using errcode = '42501'; end if;

  select * into a from public.party_assignments where id = l.party_assignment_id for update;
  if not found then raise exception 'Convite inexistente'; end if;
  if a.status <> 'pendente' then raise exception 'Convite já respondido'; end if;

  select p.cargo, p.nome_completo into v_cargo, v_nome
    from public.profiles p where p.id = a.profile_id;

  if p_aceita then
    update public.party_assignments
       set status         = 'confirmada',
           cargo_snapshot = coalesce(a.cargo_snapshot, v_cargo),
           respondido_em  = now()
     where id = a.id;
  else
    update public.party_assignments
       set status = 'recusada', motivo_recusa = p_motivo, respondido_em = now()
     where id = a.id;

    insert into public.notifications (tipo, titulo, corpo, party_id, actor_profile_id)
    values ('recusa', 'Convite recusado',
            coalesce(v_nome, 'Colaborador') || ' recusou um convite de festa.'
              || case when p_motivo is not null then ' Motivo: ' || p_motivo else '' end,
            a.party_id, a.profile_id);
  end if;

  update public.colaborador_links set usado_em = now() where id = l.id;
end $$;

revoke execute on function public.responder_convite_by_token(text, boolean, text) from public, anon, authenticated;
grant  execute on function public.responder_convite_by_token(text, boolean, text) to service_role;

-- ---------------------------------------------------------------------------
-- 4) o convite mostra o valor da função desta festa
-- ---------------------------------------------------------------------------
create or replace function public.resolve_link(p_token_hash text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  l      public.colaborador_links;
  v_prof public.profiles;
  a      public.party_assignments;
  p      public.parties;
  v_estado text;
begin
  select * into l from public.colaborador_links where token_hash = p_token_hash;
  if not found then return jsonb_build_object('estado', 'inexistente'); end if;

  if    l.revogado_em is not null                        then v_estado := 'revogado';
  elsif l.usado_em is not null                           then v_estado := 'usado';
  elsif l.expira_em is not null and l.expira_em <= now() then v_estado := 'expirado';
  else                                                        v_estado := 'valido';
  end if;

  select * into v_prof from public.profiles where id = l.profile_id;

  if l.tipo = 'cadastro' then
    return jsonb_build_object(
      'estado', v_estado,
      'tipo',   'cadastro',
      'atualizacao', v_prof.cpf is not null,
      'colaborador', jsonb_build_object(
        'nome_completo', v_prof.nome_completo,
        'celular',       v_prof.celular
      ),
      'cadastro', case when v_estado = 'valido' then jsonb_build_object(
        'nome_completo', v_prof.nome_completo,
        'rg',            v_prof.rg,
        'cpf',           v_prof.cpf,
        'cnpj',          v_prof.cnpj,
        'email',         v_prof.email,
        'celular',       v_prof.celular,
        'cep',           v_prof.cep,
        'logradouro',    v_prof.logradouro,
        'numero',        v_prof.numero,
        'complemento',   v_prof.complemento,
        'bairro',        v_prof.bairro,
        'cidade',        v_prof.cidade,
        'uf',            v_prof.uf,
        'chave_pix',     v_prof.chave_pix
      ) else null end
    );
  end if;

  select * into a from public.party_assignments where id = l.party_assignment_id;
  select * into p from public.parties where id = a.party_id;

  if v_estado = 'valido' and a.status <> 'pendente' then v_estado := 'respondido'; end if;

  return jsonb_build_object(
    'estado', v_estado,
    'tipo',   'convite',
    'colaborador', jsonb_build_object('nome_completo', v_prof.nome_completo),
    'assignment', jsonb_build_object(
      'status',               a.status,
      'presence_mode',        a.presence_mode,
      'horario_apresentacao', a.horario_apresentacao,
      'is_driver',            a.is_driver,
      -- o valor sai da função desta festa (cargo_snapshot), não do cargo do
      -- cadastro; linhas antigas, sem função escolhida, caem no cargo do perfil
      'cache_estimado', coalesce(
        a.cache_custom,
        a.cache_calculado,
        public.calc_cache(
          coalesce(a.cargo_snapshot, v_prof.cargo),
          p.duracao_horas, p.is_viagem, a.is_driver
        )
      )
    ),
    'festa', jsonb_build_object(
      'data',        p.data,
      'hora_inicio', p.hora_inicio,
      'hora_fim',    p.hora_fim,
      'contratante', p.contratante_nome,
      'logradouro',  p.logradouro,
      'numero',      p.numero,
      'complemento', p.complemento,
      'bairro',      p.bairro,
      'cidade',      p.cidade,
      'uf',          p.uf,
      'is_viagem',   p.is_viagem
    )
  );
end $$;

-- `create or replace` devolve EXECUTE ao public por padrão (lição da 0018).
revoke execute on function public.resolve_link(text) from public, anon, authenticated;
grant  execute on function public.resolve_link(text) to service_role;
