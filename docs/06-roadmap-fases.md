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
- [x] Auth: e-mail/senha + custom claim `role` (guarda por layout)
- [x] Middleware: renovação de sessão + guarda de /admin e rate limit das rotas de token
- [ ] Rate limit (Upstash) no middleware — pendente (chaves)
- [ ] OTP de e-mail via Resend (config SMTP no Supabase) — pendente (chaves)
- [x] Cascas de UI: landing, auth (login/esqueci), shell admin (sidebar) + dashboard
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
- [x] Escalar colaboradores (busca, alerta de outra festa no dia)
- [x] Definir por assignment: modo apresentação, horário, motorista, cachê custom
- [x] Fluxo convite → confirmar/recusar/cancelar (colaborador)
- [x] Notificações no painel (sino/badge + marcar lida); e-mail (Resend) pendente

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
- [x] PWA instalável (manifest, ícone, service worker network-first)
- [x] Central de notificações no admin (sino/badge)
- [x] Performance (região gru1 colada ao Supabase, cache() de sessão, loading skeletons)
- [x] Rate limit por IP nas rotas de auth (código pronto; requer chaves Upstash)
- [x] Auditoria de segurança: advisors revisados; FK indexes; policies com `(select …)`
      consolidadas `to authenticated`; funções de trigger sem EXECUTE público;
      RPCs restritas a authenticated. RLS confirmada nas 14 tabelas.
- [x] Acessibilidade: `prefers-reduced-motion` respeitado; foco visível (shadcn)
- [x] Testes E2E de fumaça (Playwright): landing, login, cadastro e guarda de rotas
- [ ] Testes E2E autenticados (cadastro→confirmar→fechar) — requer contas de teste
- [ ] E-mail (Resend SMTP) — adiado
- [ ] Ligar leaked-password protection no painel Auth (Supabase)

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

## Fase 7 — Colaborador sem login (concluída em 2026-08-25)

- [x] `profiles` desacoplada de `auth.users` (`id` próprio; `user_id` só para admin)
- [x] Área `/app`, autocadastro e disponibilidade removidos
- [x] Tabela `colaborador_links` + RPCs de token (`resolve`, `cadastro`, `convite`)
- [x] Páginas públicas `/cadastro/[token]` e `/convite/[token]`
- [x] Painel: criar colaborador, gerar/copiar link e abrir WhatsApp
- [x] Convite de 24h gerado junto com a escalação
- [x] Página `/admin/conta` para troca de senha do admin

**Fora de escopo (decidido):** disponibilidade do colaborador e envio automático de WhatsApp
(ver ADR-0015 — depende da Business API, com custo por conversa).

**Pendências:** limpar as contas órfãs em `auth.users` que não são de admin.

## Fase 8 — Login por pessoa (concluída em 2026-09-01)

- [x] `user_role` com `dona`, `gerente` e `funcionario` (migration 0026)
- [x] Helpers `is_dona()` / `is_gestao()` / `is_equipe()`; `is_admin()` removido (0028)
- [x] Corte equipe x gestão: a operação é da equipe; Pagamentos e OS, da gestão
- [x] Uma policy `for all` por tabela, no lugar das quatro por comando
- [x] Trigger `guard_profile_privileges`: ninguém se promove a dona
- [x] `party_types`, `vehicles`, `partners` e `payment_weeks` deixaram de ser legíveis
      por qualquer autenticado
- [x] Guards do app por papel (`requireEquipe` / `requireGestao` / `requireDona`)
- [x] Menu esconde Pagamentos e OS de quem não é gestão
- [x] `npm run usuarios` provisiona as contas (Camila, Paula, Carol, Caio)
- [x] Correção de bagagem: `handle_new_user` fazia `on conflict` num índice parcial e
      quebrava toda criação de conta desde a 0017 (migration 0027)

**Pendências:**
- [ ] Desativar `soalegria@admin.com` depois que cada uma entrar com a sua conta
- [ ] Tela para a dona criar/editar conta do escritório (hoje é o script)
- [ ] Trocar as senhas provisórias (`Nome#2026`) na primeira entrada
- [ ] Decidir se o cachê da escala deve sumir para o funcionário (ver ADR-0022)
