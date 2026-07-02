# 06 — Roadmap & Progresso

> Marque `[x]` ao concluir. Atualize a cada sessão. Fonte da verdade do "o que falta".

## Fase 0 — Fundação
- [x] Documentação (CLAUDE.md + docs/)
- [x] Projeto Supabase criado (`so-alegria`, sa-east-1)
- [ ] Scaffold Next.js + TS + Tailwind + shadcn/ui
- [ ] Tema/tokens da marca (globals.css, fontes)
- [ ] Clients Supabase (browser/server/admin) + `.env`
- [ ] Schema completo: enums, tabelas, generated columns
- [ ] RLS em todas as tabelas + policies
- [ ] Funções: `calc_cache`, `confirm/refuse/cancel`, `close_payment_week`, `set_*`, `is_admin`, triggers
- [ ] Seed (party_types + dados de teste dev)
- [ ] Auth: e-mail/senha, Google, OTP (Resend) + custom claim `role`
- [ ] Middleware: guarda de rotas + rate limit (Upstash)
- [ ] Repositório GitHub privado + deploy Vercel
- [ ] Tipos TS gerados do schema

## Fase 1 — Colaborador core
- [ ] Cadastro público (Nome, RG, CPF, e-mail, celular E.164, endereço via CEP, PIX, senha) + Zod
- [ ] Verificação de e-mail (OTP)
- [ ] Tela "aguardando aprovação" (status pendente)
- [ ] Perfil: editar celular, endereço, PIX, senha (não editáveis: cargo, nome_tio, RG, CPF)
- [ ] Disponibilidade (calendário editável)
- [ ] Minha Escala (lista + calendário, detalhe da festa)

## Fase 2 — Admin core
- [ ] CRUD de festas (form completo)
- [ ] Kanban (colunas de status) + Calendário (mês/semana)
- [ ] CRUD colaboradores (lista/filtros, detalhe)
- [ ] Aprovar cadastro, alterar cargo, definir nome de tio, desativar
- [ ] Escalar colaboradores (busca, disponibilidade na data, conflito de horário)
- [ ] Definir por assignment: modo apresentação, horário, motorista, cachê custom
- [ ] Fluxo convite → confirmar/recusar (colaborador)
- [ ] Notificações painel (sino/badge) + e-mail (Resend) para recusa/cancelamento/novo cadastro

## Fase 3 — Pagamentos
- [ ] `calc_cache` + snapshot na confirmação (testes dos casos de aceite)
- [ ] Fechamento semanal (`close_payment_week`)
- [ ] Colaborador: "A receber" + "Recebidos" (detalhe por festa)
- [ ] Admin: visão por semana, tabela por colaborador (nº festas, total, PIX copiável)
- [ ] Marcar pago (individual/lote) + registro data/hora
- [ ] Export CSV da semana

## Fase 4 — Operação
- [ ] Veículos: CRUD, rodízio (alerta), vínculo com festa, status automático
- [ ] Parceiros/buffets: CRUD + seleção na festa (endereço automático)
- [ ] Estoque: itens (foto/compressão), vínculo à festa (baixa), devolução/conferência, divergências, histórico

## Fase 5 — Polimento
- [ ] PWA instalável (manifest, service worker, offline básico)
- [ ] Testes E2E fluxos críticos (cadastro, confirmação, fechamento, RLS)
- [ ] Auditoria de segurança (advisors, policies, testes de isolamento)
- [ ] Performance (imagens, skeletons, cache)
- [ ] Acessibilidade (foco, contraste, reduced-motion)

## Critérios de aceite (do PRD §12) — checklist de verificação
- [ ] 1. Colaborador A não lê dados de B (RLS testado)
- [ ] 2. Trainee 6h viagem dirigindo = R$180; Coordenador mesma sem dirigir = R$440
- [ ] 3. 5h58 sem adicional; 5h59 com adicional
- [ ] 4. `cache_custom` ignora o cálculo
- [ ] 5. seg/22, ter/23, dom/28 somadas na seg/29
- [ ] 6. Mudança de cargo não altera cachê já confirmado
- [ ] 7. Recusa gera e-mail ao admin ≤1min + notificação no painel
- [ ] 8. Item levado reduz disponível; retorna após conferência; perda ajusta total
- [ ] 9. Cliente não altera role/cargo/pagamento (erro de policy)
- [ ] 10. Veículo em rodízio na data exibe alerta
