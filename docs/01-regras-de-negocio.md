# 01 — Regras de Negócio

> **Documento normativo.** Estas regras são implementadas em **funções Postgres** e validadas por
> testes. Qualquer divergência entre código e este documento é um bug. O cálculo de cachê **nunca**
> roda no client ou em JS de servidor — apenas no banco.

---

## 1. Cargos e cachê base

| Cargo (`cargo_type`) | Cachê base (até 4h) | Observação |
|---|---|---|
| `pendente` | — | Novo cadastro, sem cargo. Não pode ser escalado com cachê. |
| `trainee` | R$ 60,00 | |
| `junior` | R$ 80,00 | |
| `experiente` | R$ 100,00 | |
| `coordenador` | R$ 200,00 | Comanda a festa. |

Novo cadastro entra como `pendente` até o admin aprovar e atribuir cargo.

---

## 2. Cálculo do cachê — ordem de aplicação (CRÍTICO)

Implementado em `calc_cache(cargo, duracao_horas, is_viagem, is_driver) → numeric`.
A **ordem** importa. Aplicar exatamente assim:

1. **Base** — valor do cargo (tabela acima), referente a **até 4h** de festa.
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

Ao **confirmar** um assignment (`confirm_assignment`):
- Congela-se `cargo_snapshot` = cargo atual do colaborador.
- Congela-se `cache_calculado` = resultado de `calc_cache(...)` naquele momento.
- `cache_final` = `coalesce(cache_custom, cache_calculado)` (coluna gerada).

**Consequência:** mudar o cargo do colaborador depois **não** altera o cachê de festas já confirmadas.
(Critério de aceite 6.)

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
`fechada → escalada → confirmada → realizada → paga` (+ `cancelada`).
v1 pode iniciar o kanban com Fechada/Escalada/Confirmada/Realizada; colunas configuráveis.

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
3. Cachê de festa confirmada não muda quando o cargo muda depois.
4. `cache_custom` sempre vence o cálculo.
5. Item levado reduz "disponível"; devolução restaura; perda ajusta o total.
6. Um colaborador tem no máximo **um** assignment por festa (`unique (party_id, user_id)`).
7. Uma disponibilidade por (colaborador, data) (`unique (user_id, data)`).
