# 01 — Regras de Negócio

> **Documento normativo.** Estas regras são implementadas em **funções Postgres** e validadas por
> testes. Qualquer divergência entre código e este documento é um bug. O cálculo de cachê **nunca**
> roda no client ou em JS de servidor — apenas no banco.

---

## 1. Funções e cachê base

| Função (`cargo_type`) | Cachê base (até 4h) | Observação |
|---|---|---|
| `pendente` | — | Novo cadastro, sem função. Não pode ser escalado. |
| `trainee` | R$ 60,00 | |
| `junior` | R$ 80,00 | |
| `experiente` | R$ 100,00 | |
| `coordenador` | R$ 200,00 | Comanda a festa. |

Novo cadastro fica bloqueado até o admin aprovar. **Aprovar não escolhe função** —
só libera a pessoa para ser escalada (`aprovado` + `ativo`). Quem pode ser escalado é
quem está aprovado e ativo; `profiles.cargo` não entra nessa conta.

**A função é da festa, não da pessoa (ADR-0026).** Quem define o cachê é
`party_assignments.cargo_snapshot`, escolhido pelo admin a cada escalação — a mesma
pessoa vai como `coordenador` numa festa e `experiente` na outra. A escalação não
sugere função: o admin escolhe uma das quatro, sempre, e só então consegue enviar o
convite. `profiles.cargo` não é lido por tela nenhuma.

---

## 2. Cálculo do cachê — ordem de aplicação (CRÍTICO)

Implementado em `calc_cache(cargo, duracao_horas, is_viagem, is_driver) → numeric`.
A **ordem** importa. Aplicar exatamente assim:

1. **Base** — valor da função escolhida na escalação (tabela acima), referente a **até 4h** de festa.
2. **Hora extra** — se `duracao_horas ≥ 5h59min` (ou seja, ≥ 5,9833… h), soma **+R$ 20** (equivale a +2h). Aplicado **uma única vez**.
   - Regra de corte: festa de **5h58 NÃO** recebe; **5h59 recebe**.
3. **Viagem** — se `is_viagem`, o subtotal (base + hora extra) é **duplicado** (× 2).
4. **Motorista** — se `is_driver`, soma **+R$ 20** (aplicado **após** a duplicação de viagem).
5. **Cachê customizado (`cache_custom`)** — se o admin preencher, **sobrescreve todo o cálculo acima**
   (casos "a combinar": viagens longas, avião etc.). `cache_final = coalesce(cache_custom, cache_calculado)`.

### Pseudocódigo de referência
```
base        = cache_base(cargo)
subtotal    = base + (duracao_horas >= 5.9833 ? 20 : 0)   // hora extra
subtotal    = is_viagem ? subtotal * 2 : subtotal          // viagem duplica
cache_calc  = subtotal + (is_driver ? 20 : 0)              // motorista soma depois
cache_final = coalesce(cache_custom, cache_calc)
```

### Exemplos verificados (casos de aceite)

| Cenário | Conta | Resultado |
|---|---|---|
| Trainee, 4h, sem viagem, sem dirigir | 60 | **R$ 60** |
| Trainee, 6h, viagem, dirigindo | (60 + 20) × 2 + 20 | **R$ 180** |
| Coordenador, 6h, viagem, sem dirigir | (200 + 20) × 2 | **R$ 440** |
| Trainee, viagem (4h), sem dirigir | 60 × 2 | **R$ 120** |
| Coordenador, viagem (4h), sem dirigir | 200 × 2 | **R$ 400** |
| Festa 5h58 | sem adicional | base do cargo |
| Festa 5h59 | base + 20 | base + R$ 20 |
| Qualquer festa com `cache_custom = 350` | ignora cálculo | **R$ 350** |

> **Limite de hora extra:** o adicional de +R$20 é aplicado **uma vez só**, independente de a festa
> ter 6h ou 9h. Não é proporcional na v1.

### Duração da festa
- `duracao_horas = hora_fim - hora_inicio`.
- **Festa que vira a noite** (`hora_fim < hora_inicio`): somar 24h → `duracao = (hora_fim + 24h) - hora_inicio`.
- Calculada como coluna gerada em `parties` a partir de `hora_inicio`/`hora_fim`.

---

## 3. Snapshot (congelamento) do cachê

Ao **escalar** o colaborador:
- Grava-se `cargo_snapshot` = função escolhida pelo admin **para esta festa**.
- O trigger `trg_assignment_cache` grava `cache_calculado` = `calc_cache(...)` na hora,
  para o admin ver o valor antes de mandar o convite.
- `cache_final` = `coalesce(cache_custom, cache_calculado)` (coluna gerada).

Ao **aceitar** o convite, `cargo_snapshot` é preservado; só cai no cargo do perfil se a
escalação não tiver definido função (linhas anteriores à migration 0033).

**Consequência:** mudar o cargo do colaborador depois **não** altera o cachê de festa
nenhuma — nem das já confirmadas, nem das futuras. (Critério de aceite 6.)

---

## 4. Ciclo de pagamento

- **Semana de trabalho:** segunda a domingo.
- **Pagamento:** toda **segunda-feira**, referente à semana anterior (seg–dom).
- Exemplo: festas de seg/22, ter/23 e dom/28 → **pagas juntas na seg/29**.
- Entram no fechamento apenas assignments `confirmada` de festas `realizada`.
- Admin marca `pago` manualmente (PIX é feito fora do sistema). Registra-se data/hora.

### Função de fechamento
`close_payment_week(semana_inicio date)`:
- Agrega, por colaborador, os `cache_final` de assignments `confirmada` de festas `realizada` cuja
  `data` cai na semana `[semana_inicio, semana_inicio+6]`.
- Cria/atualiza linhas em `payments` (`valor_total`, `qtd_festas`, `status='aberto'`).
- Idempotente: recalcular a semana não duplica.

### Timezone
- A semana é calculada em `America/Sao_Paulo`. A `data` da festa é `date` (sem fuso), então o corte
  seg–dom usa a data local da festa.

---

## 5. Logística de apresentação

Cada assignment define **um** modo (`presence_mode`):
- `na_empresa` — horário para estar na **sede** (ex.: 10h30 para festa 13h–17h). Geralmente quem vai de van.
- `direto_no_local` — horário para estar no **local da festa** (ex.: 11h).

`horario_apresentacao` é o horário associado ao modo escolhido.

---

## 6. Veículos

| Tipo | Regra |
|---|---|
| **Van** | Rotativa. Motorista **da empresa** leva/busca equipes. Pode atender várias festas no dia. Não gera adicional a recreador. |
| **Carro** | Dirigido por **um colaborador escalado**, que recebe **+R$20** (flag `is_driver` no assignment). |

- Uma festa pode ter **van + carro** (N:N em `party_vehicles`).
- Ao vincular veículo à festa, seu `status` vira `em_uso` no período da festa (automático).
- **Rodízio SP:** se o `dia_rodizio` do veículo == dia da semana da festa → **alerta visual** ao vincular. Não bloqueia (v1).

---

## 7. Estoque / Materiais

- Itens têm `quantidade_total`. "Disponível" = total − em uso.
- Ao montar a festa, admin vincula itens + quantidades (`party_stock_items.qtd_levada`) → **baixa temporária** (movimento `saida_festa`).
- Ao marcar festa como `realizada` → fluxo de **devolução/conferência**:
  - Confirma `qtd_devolvida` por item (movimento `devolucao`).
  - Divergências (perda/dano) registradas em `qtd_perdida` (movimento `perda`) → ajustam o total real.
- Toda mudança gera linha em `stock_movements` (auditoria).
- Visão: disponível × em uso × total + histórico.

---

## 8. Notificações ao admin

Eventos que geram notificação **no painel** (tabela `notifications`) **+ e-mail** (Resend):
- Colaborador **recusou** convite de festa (com motivo opcional).
- Colaborador **cancelou** uma confirmação anterior.
- **Novo cadastro** de colaborador aguardando aprovação.

Meta de aceite: recusa gera e-mail ao admin em **até 1 min** + notificação no painel.

---

## 9. Estados

### Festa (`party_status`)
`orcamento → fechada → escalada → confirmada → realizada → paga` (+ `cancelada`).

### Validade do orçamento (ADR-0027)
- O orçamento vale **5 dias corridos** a partir da emissão (`parties.orcamento_emitido_em`;
  vazio = `created_at`). Emitido no dia 10, vale até o dia 15 inclusive.
- O PDF traz "Emitido em" / "Válido até" e uma observação dizendo que, após o prazo, perde a validade.
- Gerar o PDF de um orçamento **ainda válido** reimprime o mesmo prazo; de um **vencido** (ou
  que nunca saiu) grava emissão nova.
- **Recuperação:** festa em `orcamento` com a validade vencida. Não é status do banco — é
  uma coluna do kanban calculada. Sai dela ao ir para Fechada (cliente topou), ao voltar para
  Orçamento (renova os 5 dias) ou ao ser cancelada (cliente desistiu).

### Vendidos e Perdidos (ADR-0028)
- **Vendidos** (`/admin/vendidos`): clientes com festa `realizada` ou `paga`, agrupados por
  telefone (sem telefone, pelo nome). Ordenados pela próxima vez que a data da última festa
  se repete — a deixa do follow-up do ano seguinte —, com mensagem pronta no WhatsApp.
- **Perdidos** (`/admin/perdidos`): festas `cancelada` (com `motivo_perda`) + orçamentos
  vencidos sem resposta. Motivos: não respondeu, achou caro, fechou com outra empresa, data
  indisponível, desistiu, outro (exige detalhe).
- "Cancelar festa" pede o motivo. **Recuperar** devolve a festa ao kanban, em Orçamento
  (renova os 5 dias e limpa o motivo); se a data já passou, abre a edição para escolher outra.

### O que fica no kanban (ADR-0031)
- Colunas: Orçamento, Recuperação, Fechada, Escalada, Confirmada, **Realizada** e **Paga** —
  as duas últimas são o controle dos pagamentos da semana.
- **Paga** fica no quadro até a gerente clicar **Mover para Vendidos** (menu "⋯" do card ou
  página da festa) ou, no máximo, 30 dias depois da data da festa (ADR-0032). O cliente
  aparece em Vendidos desde que a festa é realizada. **Perdida** (`cancelada`) não fica no quadro: vai para Perdidos, e o
  "Recuperar" de lá a devolve em Orçamento.
- Marcar como **realizada**, **paga** ou **perdido**: pelo menu "⋯" do card ou pelos botões
  do card Status na página da festa. Perdido sempre pede o motivo.
- A busca do kanban avisa quantas festas achou fora do quadro (pagas antigas em Vendidos,
  perdidas em Perdidos), com link que abre a página já filtrada. O calendário mostra todas as
  festas, menos as perdidas.

### Assignment (`assignment_status`)
`pendente → confirmada | recusada | cancelada`.

### Transições relevantes
- Escalar colaborador → cria assignment `pendente` (convite).
- Colaborador confirma → `confirmada` (+ snapshot de cachê).
- Colaborador recusa → `recusada` (+ motivo + notificação).
- Colaborador cancela confirmação → `cancelada` (+ notificação).
- Festa realizada + todos confirmados → elegível a fechamento de pagamento.

---

## 10. Invariantes (o sistema deve garantir)

1. Colaborador A nunca lê dados de B (RLS).
2. Cliente nunca altera `role`, `cargo`, `cache_*`, `payments`.
3. Cachê de festa confirmada não muda quando o cargo do cadastro muda depois.
4. `cache_custom` sempre vence o cálculo.
5. Item levado reduz "disponível"; devolução restaura; perda ajusta o total.
6. Um colaborador tem no máximo **um** assignment por festa (`unique (party_id, user_id)`).
7. Uma disponibilidade por (colaborador, data) (`unique (user_id, data)`).
