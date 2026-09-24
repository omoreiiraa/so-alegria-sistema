-- 0036_motivo_da_perda: por que o cliente não fechou (ou desistiu).
--
-- Preenchido ao marcar a festa como perdida (status `cancelada`) — pela página
-- Perdidos ou pelo "Cancelar festa". Limpo quando a festa é recuperada.
-- Orçamento vencido sem resposta aparece em Perdidos mesmo sem motivo: é a
-- leitura da validade de 5 dias (ADR-0027), não uma linha gravada. Ver ADR-0028.
alter table public.parties
  add column if not exists motivo_perda text,
  add column if not exists motivo_perda_obs text,
  add column if not exists perdido_em timestamptz;

alter table public.parties
  drop constraint if exists parties_motivo_perda_check;
alter table public.parties
  add constraint parties_motivo_perda_check check (
    motivo_perda is null or motivo_perda in (
      'sem_resposta', 'preco', 'concorrente', 'data_indisponivel', 'desistiu', 'outro'
    )
  );

comment on column public.parties.motivo_perda is
  'Por que o cliente não fechou/desistiu: sem_resposta, preco, concorrente, data_indisponivel, desistiu, outro.';
comment on column public.parties.motivo_perda_obs is
  'Detalhe livre do motivo da perda, escrito pelo escritório.';
comment on column public.parties.perdido_em is
  'Quando a festa foi marcada como perdida.';
