-- 0038_festa_arquivada: tirar a festa paga do quadro sem esperar os 30 dias.
--
-- A coluna Paga do kanban é o controle da semana; quando a gerente dá o
-- pagamento por encerrado, "Mover para Vendidos" grava `arquivada_em` e a
-- festa sai do quadro. O status continua `paga` — o cliente já aparece em
-- Vendidos por isso. Sair de `paga` limpa o campo. Ver ADR-0032.
alter table public.parties
  add column if not exists arquivada_em timestamptz;

comment on column public.parties.arquivada_em is
  'Quando a festa paga saiu do kanban para Vendidos. Vazio = segue no quadro (até 30 dias).';
