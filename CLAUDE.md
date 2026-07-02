# CLAUDE.md — Guia do Projeto Só Alegria

> Este arquivo orienta o Claude Code (e qualquer dev) ao trabalhar neste repositório.
> Leia-o por completo antes de qualquer alteração. As regras aqui são **normativas**.

---

## 1. O que é este projeto

**Sistema de Gestão de Recreação Infantil** para a empresa **Só Alegria — Recreação e Discoteca**.
Plataforma web single-tenant com dois perfis:

- **Colaborador** (`/app`) — freelancer ("tio/tia"). Mobile-first, PWA. Vê escala, confirma festas, marca disponibilidade e acompanha pagamentos.
- **Admin** (`/admin`) — escritório (3 pessoas). Desktop-first. Gere festas (kanban + calendário), colaboradores, pagamentos, frota, buffets e estoque.

A fonte da verdade do produto é [PRD-sistema-gestao-recreacao.md](PRD-sistema-gestao-recreacao.md).
As regras detalhadas estão em [docs/](docs/). **Sempre** consulte a doc relevante antes de implementar.

---

## 2. Documentação (leia conforme a tarefa)

| Doc | Quando ler |
|---|---|
| [docs/00-visao-geral.md](docs/00-visao-geral.md) | Contexto, glossário, personas |
| [docs/01-regras-de-negocio.md](docs/01-regras-de-negocio.md) | **Cachê, pagamentos, logística, estoque** — o coração do sistema |
| [docs/02-arquitetura.md](docs/02-arquitetura.md) | Stack, camadas, decisões técnicas |
| [docs/03-modelo-de-dados.md](docs/03-modelo-de-dados.md) | Tabelas, enums, funções Postgres, migrations |
| [docs/04-seguranca-rls-lgpd.md](docs/04-seguranca-rls-lgpd.md) | RLS, políticas, LGPD, dados sensíveis |
| [docs/05-design-system.md](docs/05-design-system.md) | Marca Só Alegria, tokens de cor/tipografia, UX |
| [docs/06-roadmap-fases.md](docs/06-roadmap-fases.md) | Fases, o que está pronto, próximos passos |
| [docs/07-convencoes-codigo.md](docs/07-convencoes-codigo.md) | Padrões de código, nomes, estrutura de pastas |
| [docs/08-registro-decisoes.md](docs/08-registro-decisoes.md) | Log de decisões (ADR) |

---

## 3. Stack

- **Next.js 14+** (App Router) · **TypeScript** · **Tailwind CSS** · **shadcn/ui**
- **Supabase**: Postgres, Auth, Storage, Edge Functions (projeto `so-alegria`, região `sa-east-1`)
- **Auth**: Supabase Auth (e-mail/senha + Google OAuth + OTP por e-mail via Resend)
- **E-mails**: Resend · **Rate limit**: Upstash Redis (middleware) · **CEP**: ViaCEP + BrasilAPI
- **Hospedagem**: Vercel (team MYRAI)
- **Mutações**: Server Actions + Postgres Functions. **Cálculo de cachê SEMPRE no banco.**

**Princípio de custo:** operar 100% em free tiers na v1.

---

## 4. Comandos

```bash
npm run dev          # ambiente local (http://localhost:3000)
npm run build        # build de produção
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npx shadcn@latest add <componente>   # adicionar componente shadcn/ui
```

Migrations de banco são aplicadas via **MCP do Supabase** (`apply_migration`) e versionadas em [supabase/migrations/](supabase/migrations/).

---

## 5. Regras de ouro (não violar)

1. **Cachê e pagamentos são calculados no Postgres**, nunca no client/server JS. Ver [docs/01](docs/01-regras-de-negocio.md).
2. **RLS obrigatório em TODAS as tabelas.** Nenhuma tabela pública sem policy. Ver [docs/04](docs/04-seguranca-rls-lgpd.md).
3. **`role`, `cargo`, `cache_*`, `payments`** só mudam via funções `SECURITY DEFINER` com checagem de permissão. Nunca UPDATE direto do client.
4. **Service role key nunca no client.** Só em Server Actions / Edge Functions.
5. **Snapshot de cachê:** ao confirmar assignment, congela-se `cargo_snapshot` e `cache_calculado`. Mudança de cargo não altera festas já confirmadas.
6. **Datas/horas em `America/Sao_Paulo`; valores em BRL.** Nunca renderizar UTC cru ao usuário.
7. **Validação dupla:** Zod (client+server) **e** constraints no banco (CPF, telefone E.164, CEP).
8. **Colaborador nunca edita** cargo, nome de tio, RG, CPF. Só admin, via função.

---

## 6. Estrutura de pastas

```
so-alegria/
├── CLAUDE.md                  # este arquivo
├── PRD-sistema-gestao-recreacao.md
├── docs/                      # documentação normativa
├── supabase/
│   └── migrations/            # SQL versionado (espelha o que roda no projeto)
├── src/
│   ├── app/
│   │   ├── (auth)/            # login, cadastro, verificação OTP
│   │   ├── (colaborador)/app/ # área do freelancer (mobile-first)
│   │   └── (admin)/admin/     # painel admin (desktop-first)
│   ├── components/
│   │   ├── ui/                # shadcn/ui
│   │   └── ...                # componentes de domínio
│   ├── lib/
│   │   ├── supabase/          # clients (browser, server, admin)
│   │   ├── validations/       # schemas Zod
│   │   └── utils/             # cep, telefone, datas, moeda
│   ├── actions/               # Server Actions
│   └── types/                 # tipos gerados do Supabase + domínio
└── middleware.ts              # auth guard + rate limit
```

---

## 7. Workflow de desenvolvimento

- Trabalhe **fase a fase** conforme [docs/06-roadmap-fases.md](docs/06-roadmap-fases.md). Ao concluir um item, marque-o lá.
- Registre decisões técnicas relevantes em [docs/08-registro-decisoes.md](docs/08-registro-decisoes.md).
- Toda alteração de schema = uma migration nova em `supabase/migrations/` **e** aplicada no projeto via MCP.
- Regenerar tipos após mudança de schema (`generate_typescript_types`).

### Commits (importante)
- Mensagens em português, no imperativo, com escopo. Ex.: `feat(escala): confirmar/recusar convite de festa`.
- **NÃO** adicionar trailers de co-autoria (`Co-Authored-By`) nem menção a ferramentas de IA. Os commits são de autoria do dono do repositório.
- Repositório é **privado**.

---

## 8. Ambiente & segredos

- `.env.local` (nunca commitado) guarda chaves. Ver `.env.example` para a lista.
- Chaves públicas: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable).
- Chaves privadas: `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `UPSTASH_*` — só no servidor / Vercel env.
