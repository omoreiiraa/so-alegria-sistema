-- 0024_profiles_cnpj: CNPJ do colaborador, opcional.
--
-- Muito tio trabalha como MEI e emite nota; o escritório precisa do CNPJ para
-- o pagamento. Fica opcional porque nem todos têm.
--
-- Sem UNIQUE, ao contrário do CPF: o CPF é a identidade da pessoa, enquanto o
-- CNPJ é a empresa pela qual ela fatura — dois colaboradores podem
-- legitimamente faturar pela mesma. Bloquear atrapalharia mais do que ajuda.

alter table public.profiles
  add column if not exists cnpj text;

comment on column public.profiles.cnpj is
  'CNPJ do colaborador (MEI), só dígitos. Opcional.';

-- Guarda de formato no banco, como manda a regra de validação dupla.
-- Os dígitos verificadores ficam com o Zod, no client e no servidor.
alter table public.profiles
  drop constraint if exists profiles_cnpj_formato;
alter table public.profiles
  add constraint profiles_cnpj_formato
  check (cnpj is null or cnpj ~ '^[0-9]{14}$');
