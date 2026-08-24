-- Novo status "Orçamento", anterior a "Fechada" no funil de festas.
-- Precisa ficar isolado: o Postgres não permite usar um valor de enum recém-criado
-- na mesma transação em que ele foi adicionado.
alter type party_status add value if not exists 'orcamento' before 'fechada';
