-- 0025_cadastro_com_cnpj: o CNPJ entra no fluxo do link de cadastro.
--
-- `submit_cadastro_by_token` grava o campo novo e `resolve_link` passa a
-- devolvê-lo, para o formulário de atualização abrir preenchido (ADR-0018).

create or replace function public.submit_cadastro_by_token(p_token_hash text, p_dados jsonb)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare l public.colaborador_links;
begin
  select * into l from public.colaborador_links
   where token_hash = p_token_hash and tipo = 'cadastro'
     for update;
  if not found                 then raise exception 'Link inválido' using errcode = '42501'; end if;
  if l.revogado_em is not null then raise exception 'Link revogado' using errcode = '42501'; end if;
  if l.usado_em is not null    then raise exception 'Link já usado' using errcode = '42501'; end if;
  if l.expira_em is not null and l.expira_em <= now() then
    raise exception 'Link expirado' using errcode = '42501';
  end if;

  update public.profiles set
    nome_completo = coalesce(p_dados ->> 'nome_completo', nome_completo),
    rg            = p_dados ->> 'rg',
    cpf           = p_dados ->> 'cpf',
    -- string vazia vira null: o CNPJ é opcional e não pode gravar ''
    cnpj          = nullif(p_dados ->> 'cnpj', ''),
    email         = p_dados ->> 'email',
    celular       = p_dados ->> 'celular',
    cep           = p_dados ->> 'cep',
    logradouro    = p_dados ->> 'logradouro',
    numero        = p_dados ->> 'numero',
    complemento   = coalesce(p_dados ->> 'complemento', ''),
    bairro        = p_dados ->> 'bairro',
    cidade        = p_dados ->> 'cidade',
    uf            = upper(p_dados ->> 'uf'),
    chave_pix     = p_dados ->> 'chave_pix'
  where id = l.profile_id;

  update public.colaborador_links set usado_em = now() where id = l.id;
end $$;

revoke execute on function public.submit_cadastro_by_token(text, jsonb) from public, anon, authenticated;
grant  execute on function public.submit_cadastro_by_token(text, jsonb) to service_role;

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
      'cache_estimado', coalesce(
        a.cache_custom,
        public.calc_cache(v_prof.cargo, p.duracao_horas, p.is_viagem, a.is_driver)
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
