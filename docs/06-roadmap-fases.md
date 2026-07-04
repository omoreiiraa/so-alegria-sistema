# 06 — Roadmap & Progresso

> Marque `[x]` ao concluir. Atualize a cada sessão. Fonte da verdade do "o que falta".

## Fase 0 — Fundação
- [x] Documentação (CLAUDE.md + docs/)
- [x] Projeto Supabase criado (`so-alegria`, sa-east-1)
- [x] Scaffold Next.js 16 + TS + Tailwind v4 + shadcn/ui (base-nova / Base UI)
- [x] Tema/tokens da marca (globals.css, fontes Baloo 2 / Figtree / JetBrains Mono)
- [x] Clients Supabase (browser/server/admin) + `.env`
- [x] Schema completo: enums, tabelas, generated columns
- [x] RLS em todas as tabelas + policies
- [x] Funções: `calc_cache`, `confirm/refuse/cancel`, `close_payment_week`, `set_*`, `is_admin`, triggers
- [x] Hardening de funções (search_path + revoke execute) — advisors
- [x] Seed (party_types) + bucket de estoque
- [x] Tipos TS gerados do schema
- [x] Auth: e-mail/senha + Google + custom claim `role` (guarda por layout)
- [x] Middleware: renovação de sessão + guarda de rotas /app e /admin
- [ ] Rate limit (Upstash) no middleware — pendente (chaves)
- [ ] OTP de e-mail via Resend (config SMTP no Supabase) — pendente (chaves)
- [x] Cascas de UI: landing, auth (login/cadastro/verificar/esqueci), shell colaborador (bottom tabs), shell admin (sidebar) + dashboard
- [ ] Repositório GitHub privado + deploy Vercel

## Fase 1 — Colaborador core
- [x] Cadastro público (Nome, RG-SP, CPF, e-mail, celular E.164, endereço via CEP, PIX, senha) + Zod
- [ ] Verificação de e-mail por OTP/Resend (hoje: confirmação por link; SMTP pendente)
- [x] Tela "aguardando aprovação" (status pendente)
- [x] Perfil: editar celular, endereço, PIX, senha (não editáveis: cargo, nome_tio, RG, CPF)
- [x] Disponibilidade (calendário editável, toque para marcar/desmarcar)
- [x] Minha Escala (lista com cartão de convite; visão de calendário pendente)

## Fase 2 — Admin core
- [x] CRUD de festas (form completo: tipo, local parceiro/CEP, veículos, viagem)
- [x] Kanban (colunas de status) + Calendário (mês) com toggle
- [x] CRUD colaboradores (lista, pendentes x equipe)
- [x] Aprovar cadastro, alterar cargo, definir nome de tio, desativar/reativar
- [x] Escalar colaboradores (busca, disponibilidade na data, alerta de outra festa no dia)
- [x] Definir por assignment: modo apresentação, horário, motorista, cachê custom
- [x] Fluxo convite → confirmar/recusar/cancelar (colaborador)
- [ ] Notificações painel (sino/badge) + e-mail (Resend) para recusa/cancelamento/novo cadastro

## Fase 3 — Pagamentos
- [x] `calc_cache` + snapshot na confirmação (valores verificados no banco)
- [x] Fechamento semanal (`close_payment_week`) com navegação por semana
- [x] Colaborador: "A receber" + "Recebidos" (detalhe por festa, abas)
- [x] Admin: visão por semana, tabela por colaborador (nº festas, total, PIX copiável)
- [x] Marcar pago (individual/lote) + registro data/hora
- [x] Export CSV da semana

## Fase 4 — Operação
- [x] Veículos: CRUD, rodízio (alerta visual), vínculo com festa (status automático pendente)
- [x] Parceiros/buffets: CRUD com CEP + seleção na festa (endereço automático)
- [x] Estoque: itens (foto + compressão), vínculo à festa (baixa), devolução/conferência com perdas

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
