# 08 — Registro de Decisões (ADR)

> Uma entrada por decisão técnica relevante. Formato: contexto → decisão → consequência.
> Ordem cronológica. Não reescrever histórico; adicionar "Revisão" se mudar.

---

### ADR-0001 — Lógica de cachê e pagamentos no Postgres
**Data:** 2026-07-02
**Contexto:** O cálculo de cachê tem ordem específica (base → hora extra → viagem → motorista →
custom) e precisa de snapshot no momento da confirmação. Erros aqui têm impacto financeiro direto.
**Decisão:** Implementar `calc_cache` e o fechamento como **funções Postgres**; o app apenas chama
via RPC. Nunca calcular em JS.
**Consequência:** Uma única fonte da verdade, testável no banco, imune a divergência client/server.
Custo: lógica em SQL exige disciplina de migrations.

---

### ADR-0002 — RLS como fronteira de segurança + custom claim de role
**Data:** 2026-07-02
**Contexto:** Sistema com dados sensíveis (RG/CPF/PIX) e isolamento estrito entre colaboradores.
**Decisão:** RLS em todas as tabelas; `role` espelhado em `app_metadata` (custom claim) via trigger,
lido por `is_admin()` nas policies — evita subquery recursiva em `profiles`.
**Consequência:** Segurança no banco, não no front. Requer sincronizar claim ao mudar role.

---

### ADR-0003 — Supabase Auth na v1 (não backend próprio)
**Data:** 2026-07-02
**Contexto:** Free tier, time pequeno, prazo. PRD prevê evolução futura para backend próprio.
**Decisão:** Usar Supabase Auth (e-mail/senha, Google, OTP) com SMTP Resend.
**Consequência:** Rápido e barato. Migração futura possível (auth desacoplada por interface).

---

### ADR-0004 — Projeto Supabase em `sa-east-1` (São Paulo)
**Data:** 2026-07-02
**Contexto:** Empresa e usuários no Brasil; latência importa; regras de rodízio SP.
**Decisão:** Criar projeto `so-alegria` na região `sa-east-1`.
**Consequência:** Menor latência para usuários BR. Alinhado ao timezone `America/Sao_Paulo`.

---

### ADR-0005 — Marca com verde primário + laranja como accent
**Data:** 2026-07-02
**Contexto:** Logo multicolor (verde/vermelho/laranja/amarelo + xadrez). Risco de UI ruidosa.
**Decisão:** Verde = primária; laranja = gesto/CTA; vermelho = destrutivo/alerta; amarelo = realce
pontual. Faixa xadrez como assinatura discreta. App caloroso (creme), admin sóbrio (branco).
**Consequência:** Identidade reconhecível sem poluição visual; duas "peles" da mesma marca.

---

### ADR-0006 — Commits sem co-autoria de IA
**Data:** 2026-07-02
**Contexto:** Solicitação do dono do repositório.
**Decisão:** Mensagens de commit não incluem `Co-Authored-By` nem menção a ferramentas de IA.
Autoria é do dono do repo (config git local).
**Consequência:** Histórico atribuído ao dono. Documentado aqui para transparência do processo.

---

### ADR-0007 — shadcn/ui com estilo base-nova (Base UI, não Radix)
**Data:** 2026-07-02
**Contexto:** `shadcn init` (CLI v4) configurou o projeto com o estilo **base-nova**, que usa
**Base UI** (`@base-ui/react`) como biblioteca de primitivos, não Radix.
**Decisão:** Manter base-nova.
**Consequência (importante p/ devs):** a composição usa **`render={<Comp />}`**, não `asChild`.
Ex.: `<Button render={<Link href="/x" />}>Label</Button>`. Props seguem a API do Base UI
(ex.: Tooltip usa `delay`, não `delayDuration`). Ao adicionar componentes, seguir o padrão Base UI.

### ADR-0008 — Stack final: Next.js 16 + React 19 + Tailwind v4
**Data:** 2026-07-02
**Contexto:** `create-next-app` instalou Next 16 (Turbopack) + React 19 + Tailwind v4.
**Decisão:** Adotar. PRD pedia "Next 14+"; 16 atende e traz Turbopack por padrão.
**Consequência:** RSC/Server Actions modernos; `searchParams`/`params` são Promises (await).
Tokens de tema em CSS (`@theme inline`) — sem `tailwind.config`.

<!-- Novas decisões abaixo -->
