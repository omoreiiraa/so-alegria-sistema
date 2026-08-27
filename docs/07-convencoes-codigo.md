# 07 — Convenções de Código

## Idioma
- **Domínio em português** (nomes de tabelas, colunas, rotas, labels): `festas`, `colaboradores`,
  `cachê`. Alinha com o vocabulário da empresa.
- **Palavras-chave técnicas em inglês** onde é idiomático (React/Next): `useState`, `Server Action`,
  props, etc.
- Comentários e docs em português.

## TypeScript
- `strict: true`. Sem `any` (use `unknown` + narrowing). Tipos do banco vêm de `src/types/database.ts`
  (gerado). Deriva tipos de domínio a partir dele.
- Componentes: função nomeada + export. Props tipadas com `type`, não `interface`, salvo extensão.

## Estrutura de pastas (App Router)
```
src/
├── app/
│   ├── (auth)/          login, cadastro, verificar-email
│   ├── (colaborador)/   layout theme-app + bottom tabs
│   │   └── app/         escala, disponibilidade, pagamentos, perfil
│   ├── (admin)/         layout theme-admin + sidebar
│   │   └── admin/       festas, colaboradores, pagamentos, veiculos, parceiros, estoque
│   └── globals.css
├── actions/             Server Actions por domínio (festas.ts, escala.ts, ...)
├── components/
│   ├── ui/              shadcn (não editar à mão além do necessário)
│   └── <dominio>/       PartyCard, InviteCard, KanbanBoard, ...
├── lib/
│   ├── supabase/        browser.ts, server.ts, admin.ts
│   ├── validations/     schemas Zod por entidade
│   └── utils/           cep.ts, telefone.ts, date.ts (America/Sao_Paulo), money.ts (BRL), cpf.ts
└── types/               database.ts (gerado), domain.ts
```

## Server Actions
- Uma pasta `actions/` por domínio. Toda action:
  1. `'use server'`
  2. valida input com Zod (nunca confie no client),
  3. usa client Supabase **do servidor** (sessão do usuário) ou **RPC** para funções,
  4. trata erro e retorna shape `{ ok, data?, error? }` ou lança para o boundary,
  5. `revalidatePath`/`revalidateTag` quando muta dados exibidos.
- **Nunca** recalcule cachê/pagamento em JS — chame a função Postgres via `rpc()`.

## Formulários
- `react-hook-form` + `zodResolver`. Mesmo schema Zod no client e reusado na Server Action.
- Componentes shadcn `Form`. Erros de campo inline; erro geral em `alert`/`toast`.

## Datas & dinheiro
- **Sempre** formatar via `lib/utils/date.ts` (timezone `America/Sao_Paulo`) e `lib/utils/money.ts`
  (`Intl.NumberFormat('pt-BR', {style:'currency',currency:'BRL'})`). Proibido `new Date().toLocaleString()` cru na UI.
- Guardar dinheiro como `numeric`/string; nunca `float` no client.

## Nomenclatura
- Arquivos de componente: `PascalCase.tsx`. Utils/actions: `kebab-case.ts` ou `camelCase` de função.
- Rotas: kebab-case em português (`/admin/veiculos`, `/admin/ordens-servico`).
- Colunas SQL: `snake_case` português.

## Estados de UI (obrigatório)
Toda tela com dados remotos implementa: **loading (skeleton)**, **vazio (EmptyState com CTA)**, **erro**.

## Acessibilidade
- Labels associadas, `aria-*` onde necessário, foco visível, alvos ≥44px no app, contraste AA.

## Git & commits
- Conventional Commits em pt-BR: `feat(escala): ...`, `fix(cache): ...`, `chore(deps): ...`, `docs: ...`.
- **Sem** `Co-Authored-By` e **sem** menção a IA nas mensagens. Autoria é do dono do repo.
- Commits pequenos e coesos por unidade de trabalho.

## Lint/format
- ESLint (config Next) + Prettier. `npm run lint` e `npm run typecheck` limpos antes de commitar.

## Migrations
- Uma migration por mudança, nome `NNNN_descricao.sql` em `supabase/migrations/`.
- Aplicar via MCP (`apply_migration`) e salvar o SQL idêntico no arquivo.
- Após mudança de schema: `generate_typescript_types` → atualizar `src/types/database.ts`.
