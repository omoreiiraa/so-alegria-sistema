-- 0032_rg_opcional_no_cadastro: o RG deixa de ser obrigatório no link de cadastro.
--
-- Colaborador que só tem CPF em mãos ficava travado no formulário público. A
-- coluna `profiles.rg` sempre foi nula, então aqui só ajustamos a RPC: string
-- vazia vira null, como já acontece com o CNPJ (0025). Sem isso a ficha
-- gravaria '' e as telas do admin mostrariam um RG "preenchido" em branco.

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
    -- string vazia vira null: RG e CNPJ são opcionais e não podem gravar ''
    rg            = nullif(p_dados ->> 'rg', ''),
    cpf           = p_dados ->> 'cpf',
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

-- `create or replace` devolve EXECUTE ao public por padrão (lição da 0018).
revoke execute on function public.submit_cadastro_by_token(text, jsonb) from public, anon, authenticated;
grant  execute on function public.submit_cadastro_by_token(text, jsonb) to service_role;

comment on column public.profiles.rg is
  'RG do colaborador, só dígitos e o X do verificador. Opcional: nem todo '
  'colaborador tem RG em mãos no cadastro.';
