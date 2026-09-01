-- 0027_handle_new_user_indice_parcial: destravar a criação de contas.
--
-- A 0017 tirou `user_id` da chave primária e o guardou num índice único
-- **parcial** (`where user_id is not null`). O `on conflict (user_id)` do
-- handle_new_user, porém, ficou como estava: sem repetir o predicado, o
-- Postgres não encontra índice que sirva à inferência e devolve 42P10.
--
-- Ninguém tinha esbarrado nisso porque, desde a 0017, nenhuma conta nova havia
-- sido criada — o escritório inteiro entrava pela conta única. Ao provisionar
-- os logins da 0026, toda chamada a /admin/users voltava 500.

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare m jsonb;
begin
  m := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  insert into public.profiles (
    user_id, email, nome_completo, rg, cpf, celular,
    cep, logradouro, numero, complemento, bairro, cidade, uf, chave_pix
  )
  values (
    new.id,
    new.email,
    coalesce(m ->> 'nome_completo', m ->> 'full_name', m ->> 'name'),
    m ->> 'rg',
    m ->> 'cpf',
    m ->> 'celular',
    m ->> 'cep',
    m ->> 'logradouro',
    m ->> 'numero',
    m ->> 'complemento',
    m ->> 'bairro',
    m ->> 'cidade',
    m ->> 'uf',
    m ->> 'chave_pix'
  )
  -- O predicado é obrigatório: sem ele o índice parcial não é inferível.
  on conflict (user_id) where user_id is not null do nothing;
  return new;
end $$;
