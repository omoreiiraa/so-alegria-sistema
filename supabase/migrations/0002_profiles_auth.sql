-- 0002_profiles_auth: tabela profiles (1:1 auth.users), signup e custom claim de role
-- Ver docs/03-modelo-de-dados.md e docs/04-seguranca-rls-lgpd.md

create table public.profiles (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  role          user_role  not null default 'colaborador',
  cargo         cargo_type not null default 'pendente',
  nome_completo text,
  nome_tio      text,
  rg            text,
  cpf           text unique,
  email         text,
  celular       text,               -- E.164
  cep           text,
  logradouro    text,
  numero        text,
  complemento   text,
  bairro        text,
  cidade        text,
  uf            text,
  chave_pix     text,
  ativo         boolean not null default true,
  aprovado      boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger trg_profiles_updated
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Cria o profile automaticamente no signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, email, nome_completo)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'nome_completo',
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name'
    )
  )
  on conflict (user_id) do nothing;
  return new;
end $$;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Espelha o role em app_metadata (custom claim lido por is_admin() nas policies)
create or replace function public.sync_user_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update auth.users
     set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
                             || jsonb_build_object('role', new.role::text)
   where id = new.user_id;
  return new;
end $$;

create trigger trg_profiles_sync_role
  after insert or update of role on public.profiles
  for each row execute function public.sync_user_role();

-- Bloqueia alteração de campos restritos pelo próprio colaborador (só admin/funções)
create or replace function public.prevent_sensitive_profile_update()
returns trigger language plpgsql as $$
begin
  if not public.is_admin() then
    if new.role      is distinct from old.role
    or new.cargo     is distinct from old.cargo
    or new.nome_tio  is distinct from old.nome_tio
    or new.aprovado  is distinct from old.aprovado
    or new.rg        is distinct from old.rg
    or new.cpf       is distinct from old.cpf
    or new.user_id   is distinct from old.user_id then
      raise exception 'Alteração de campo restrito não permitida' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

create trigger trg_profiles_prevent_sensitive
  before update on public.profiles
  for each row execute function public.prevent_sensitive_profile_update();
