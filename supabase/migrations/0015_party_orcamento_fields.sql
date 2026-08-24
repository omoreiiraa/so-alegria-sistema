-- Campos do orçamento da festa e novo status padrão.
alter table public.parties
  add column if not exists valor_festa      numeric(10,2),
  add column if not exists telefone_contato text,
  add column if not exists tema_festa       text,
  add column if not exists qtd_recreadores  smallint;

comment on column public.parties.valor_festa is
  'Valor combinado da festa em BRL.';
comment on column public.parties.telefone_contato is
  'Telefone de contato do cliente (E.164).';
comment on column public.parties.tema_festa is
  'Tema da festa (ex.: Homem-Aranha, Frozen).';
comment on column public.parties.qtd_recreadores is
  'Quantidade de recreadores/monitores prevista no orçamento.';

-- Festas novas nascem em "Orçamento"; registros existentes ficam como estão.
alter table public.parties
  alter column status set default 'orcamento'::party_status;
