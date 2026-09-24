-- 0035_validade_do_orcamento: o orçamento vale 5 dias a partir da emissão.
--
-- `orcamento_emitido_em` marca quando o orçamento foi mandado ao cliente. É
-- gravado ao gerar o PDF (se ainda não havia um válido) e ao devolver a festa
-- para "Orçamento". Enquanto está vazio, a validade conta de `created_at`.
--
-- Não existe status novo: "Recuperação" é só a leitura de uma festa em
-- `orcamento` cuja validade passou sem resposta. Ver ADR-0027.
alter table public.parties
  add column if not exists orcamento_emitido_em timestamptz;

comment on column public.parties.orcamento_emitido_em is
  'Quando o orçamento foi emitido ao cliente. Vale 5 dias; vazio = conta de created_at.';

-- Orçamentos em aberto herdam a data de criação, para já entrarem na conta.
update public.parties
   set orcamento_emitido_em = created_at
 where status = 'orcamento'
   and orcamento_emitido_em is null;
