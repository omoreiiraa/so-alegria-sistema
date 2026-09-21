-- 0031_cnpj_alfanumerico: o CNPJ passa a aceitar letras.
--
-- A Receita Federal (IN RFB nº 2.229/2024) adotou o CNPJ alfanumérico: os 14
-- caracteres continuam, mas as 12 primeiras posições (raiz + ordem do
-- estabelecimento) podem trazer dígitos 0-9 ou letras maiúsculas A-Z. Só os
-- dois dígitos verificadores seguem numéricos.
--
-- A constraint antiga (`^[0-9]{14}$`) recusaria qualquer CNPJ novo. Os CNPJs
-- já gravados, todos numéricos, continuam passando no formato novo.

alter table public.profiles
  drop constraint if exists profiles_cnpj_formato;
alter table public.profiles
  add constraint profiles_cnpj_formato
  check (cnpj is null or cnpj ~ '^[0-9A-Z]{12}[0-9]{2}$');

comment on column public.profiles.cnpj is
  'CNPJ do colaborador (MEI), sem pontuação: 12 caracteres alfanuméricos '
  '(maiúsculos) + 2 dígitos verificadores. Opcional.';
