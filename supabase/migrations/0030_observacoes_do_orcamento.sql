-- 0030_observacoes_do_orcamento: separa as duas observações da festa.
--
-- `observacoes` continua sendo a observação do evento — a que sai na folha do
-- dia, escrita para a equipe. A nova `observacoes_orcamento` é escrita para o
-- cliente e sai no orçamento e no contrato.
alter table public.parties
  add column if not exists observacoes_orcamento text;

comment on column public.parties.observacoes is
  'Observação do evento: vai para a folha do dia, lida pela equipe.';
comment on column public.parties.observacoes_orcamento is
  'Observação do orçamento: sai no PDF do orçamento e no contrato, lida pelo cliente.';
