-- 0008_signup_profile_fields: handle_new_user copia todos os campos do cadastro
-- (enviados em raw_user_meta_data no signUp) para o profile. Ver docs/05 §5.1.

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
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
  on conflict (user_id) do nothing;
  return new;
end $$;
