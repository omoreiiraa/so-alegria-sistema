# 00 — Visão Geral & Glossário

## Contexto

A **Só Alegria — Recreação e Discoteca** é uma empresa de recreação infantil que atende festas
(aniversários, eventos) com equipes de recreadores. Opera com ~50 freelancers e 3 pessoas no
escritório. Hoje toda a operação (escalas, confirmações, pagamentos) vive no WhatsApp, gerando
perda de informação e retrabalho. Este sistema centraliza tudo numa plataforma web.

## Objetivo do produto

- **Freelancer:** ver escala, confirmar/recusar festas, marcar disponibilidade, acompanhar pagamentos.
- **Admin:** gerir festas (kanban + calendário), colaboradores, pagamentos, frota, buffets parceiros e estoque.

## Não-objetivos (v1)

- Multi-empresa (é single-tenant).
- App nativo (é web responsivo/PWA).
- Nota fiscal, integração bancária, PIX automático.
- Chat interno.

## Personas

| Persona | Perfil | Dispositivo | Necessidade central |
|---|---|---|---|
| **Tio/Tia** (recreador) | `colaborador` | Celular | "Quais festas eu tenho? Confirmo? Quanto recebo segunda?" |
| **Coordenador** | `colaborador` (cargo coordenador) | Celular | Comanda a festa no local; mesmo fluxo, cachê maior |
| **Escritório** | `admin` | Desktop | Montar festas, escalar equipe, fechar pagamento, controlar frota/estoque |

## Glossário (vocabulário do domínio)

| Termo | Significado |
|---|---|
| **Recreador** | Colaborador freelancer que trabalha nas festas. |
| **Tio / Tia** | Como os recreadores são chamados nas festas. "Nome de tio" é o apelido usado (ex.: "Tio Léo"). Definido pelo admin. |
| **Cargo** | Nível do recreador: Trainee, Júnior, Experiente, Coordenador. Define o cachê base. |
| **Cachê** | Valor pago ao recreador por festa. Calculado por regras (ver [01](01-regras-de-negocio.md)). |
| **Coordenador** | Recreador que comanda a festa. Cargo de maior cachê. |
| **Escalar** | Admin atribui um recreador a uma festa (cria um *assignment*). |
| **Assignment** | Vínculo recreador↔festa, com status (pendente/confirmada/recusada/cancelada), modo de apresentação e cachê. |
| **Convite** | Assignment em status `pendente` aguardando resposta do recreador. |
| **Confirmar / Recusar** | Resposta do recreador ao convite. Recusa notifica o admin. |
| **Disponibilidade** | Datas que o recreador marca como livres para trabalhar. |
| **Modo de apresentação** | `na_empresa` (vai de van, chega na sede) ou `direto_no_local` (vai direto à festa). |
| **Viagem** | Festa fora da cidade → cachê duplicado. |
| **Motorista** | Recreador que dirige o carro da empresa → +R$20. |
| **Van** | Veículo rotativo da empresa; um motorista da empresa leva/busca equipes; atende várias festas/dia. |
| **Carro** | Veículo dirigido por um recreador escalado (que recebe o adicional de motorista). |
| **Rodízio** | Restrição de circulação de veículos em SP por dia da semana (só alerta visual na v1). |
| **Buffet parceiro** | Local cadastrado (endereço pronto) onde festas acontecem com frequência. |
| **Semana de pagamento** | Segunda a domingo. Paga-se na segunda seguinte. |
| **Baixa de estoque** | Reserva temporária de itens levados a uma festa; devolvidos após conferência. |

## Fluxos críticos (resumo)

1. **Cadastro → aprovação:** recreador se cadastra (status `pendente`) → admin aprova e define cargo → acesso liberado.
2. **Montagem → escala → confirmação:** admin cria festa → escala recreadores (convites) → recreadores confirmam/recusam.
3. **Realização → fechamento → pagamento:** festa vira `realizada` → função semanal agrega cachês confirmados → admin marca `pago` na segunda.
4. **Estoque:** admin vincula itens à festa (baixa temporária) → na realização, confere devolução → divergências ajustam o total.

Ver critérios de aceite na seção 12 do [PRD](../PRD-sistema-gestao-recreacao.md).
