-- 0021_resolve_link_prefill_cadastro: o link de cadastro vira também link de
-- atualização. Devolve os dados atuais do colaborador para o formulário abrir
-- preenchido — ele só corrige o que mudou, em vez de redigitar RG, CPF e endereço.
--
-- É dado pessoal saindo por um link, mas é o dado do próprio titular, atrás de um
-- token de 256 bits de uso único e revogável. Ver ADR-0018.

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
      -- true quando é atualização de um cadastro que já foi preenchido antes
      'atualizacao', v_prof.cpf is not null,
      'colaborador', jsonb_build_object(
        'nome_completo', v_prof.nome_completo,
        'celular',       v_prof.celular
      ),
      -- só vai junto quando o link ainda vale; link queimado não devolve dado pessoal
      'cadastro', case when v_estado = 'valido' then jsonb_build_object(
        'nome_completo', v_prof.nome_completo,
        'rg',            v_prof.rg,
        'cpf',           v_prof.cpf,
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
