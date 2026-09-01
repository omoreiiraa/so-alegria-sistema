# 05 — Design System · Marca Só Alegria

> A marca é alegre, festiva e infantil ("Só Alegria" = só alegria). O logo traz um personagem verde
> sorridente com boné vermelho, caixas de som laranja, notas musicais e um piso quadriculado
> (discoteca). Traduzimos isso num sistema **caloroso e enérgico** para o app do recreador, e uma
> versão **contida e profissional** da mesma marca para o painel admin.

---

## 1. Paleta

Extraída do logo (verde, vermelho, laranja/amarelo, piso xadrez preto/branco).

| Token | Hex | Papel |
|---|---|---|
| `--verde` (primária) | `#1FA24C` | Cor-núcleo da marca (personagem, "AL", "Recreação"). Botões primários, marca. |
| `--verde-escuro` | `#137A38` | Hover/estados de verde, texto sobre claro. |
| `--laranja` (accent) | `#F7911E` | Energia/CTA no app, destaques, ícones. |
| `--vermelho` | `#E23B2E` | Festivo/alerta, destrutivo, badge de recusa. |
| `--amarelo` | `#FFC42E` | Realce, estrelas, badges de destaque. |
| `--tinta` | `#16211C` | Texto principal (quase-preto esverdeado). |
| `--creme` | `#FFF9F0` | Fundo caloroso do app (mobile). |
| `--nuvem` | `#FFFFFF` | Superfícies/cards, fundo do admin. |
| `--cinza-*` | escala neutra | Bordas, texto secundário, muted. |

**Semântica shadcn (mapeamento):**
- `primary` → verde · `accent`/CTA festivo → laranja · `destructive` → vermelho · `warning` → amarelo.
- Páginas públicas de link: `background` = creme. Admin (`/admin`): branco/cinza-50 (mais sóbrio).

**Regra de uso:** verde é a base; **laranja é o gesto** (uma cor de destaque por tela). Vermelho só
para ação destrutiva/negativa e notificações. Amarelo em doses pequenas (badges). Nunca os quatro
saturados juntos com o mesmo peso — isso vira ruído. "Antes de sair, tire um acessório."

## 1.1 Aplicação da marca

O logo **já traz "SÓ ALEGRIA · Recreação e Discoteca" desenhado dentro dele**. Por isso ele
aparece sozinho, sem texto ao lado: escrever o nome de novo duplicava a marca e espremia a
arte. Componente único: `components/brand/logo.tsx` (`<Logo />`).

Tamanhos em uso: 72px na barra lateral (centralizado), 96px no login, 56px no menu mobile,
44px no topo das páginas públicas, 36px no cabeçalho mobile do painel. Abaixo de ~36px a
arte fica ilegível — não usar.

## 2. Tipografia

| Papel | Fonte | Uso |
|---|---|---|
| **Display** | **Baloo 2** (rounded, bold) | Títulos, marca, headings do app. Bubbly, casa com o logo. **Com restrição** — só títulos. |
| **Corpo / UI** | **Figtree** | Texto, labels, tabelas, formulários. Limpa e amigável. |
| **Dados / mono** | **JetBrains Mono** (ou Geist Mono) | Placas de veículo, valores monetários tabulares, IDs. |

Carregar via `next/font/google`. Números monetários com `font-variant-numeric: tabular-nums`.

Escala de tipo (base 16px): 12 · 14 · 16 · 18 · 20 · 24 · 30 · 36 · 48. Títulos display em pesos 600/700.

## 3. Layout & superfícies

- **Raio:** `--radius: 14px` (cards/botões arredondados, coerente com o logo redondinho). Admin pode
  usar 10px para densidade.
- **Sombra:** suave e colorida sutil (ex.: sombra verde levíssima em cards do app). Admin: sombra neutra discreta.
- **Espaçamento:** escala 4px. App generoso (toques ≥ 44px); admin compacto.

## 4. Signature (elemento memorável)

- ~~**Faixa xadrez**~~ — *removida em 28/08/2026, a pedido do dono: poluía o rodapé.* A classe
  `.checker-strip` saiu do `globals.css`; se um dia voltar, recuperar do histórico do git.
- **Card de convite de festa** (app): o momento-herói. Card grande, arredondado, com o tipo de festa,
  data/hora, cachê previsto em destaque, e dois botões claros **Confirmar** / **Recusar** (≤ 2 toques).

## 5. Duas peles da mesma marca

| | Páginas de link (recreador) | Admin `/admin` (escritório) |
|---|---|---|
| Densidade | Espaçoso, 1 coluna, mobile-first | Denso, tabelas/kanban |
| Fundo | Creme quente | Branco/cinza-50 |
| Cor | Verde + laranja vivos | Verde contido, muito neutro, accents pontuais |
| Navegação | **Nenhuma** — o colaborador entra pelo link, resolve e sai | Sidebar: Festas · Colaboradores · Pagamentos · Veículos · Parceiros · Estoque |
| Tom | Festivo, acolhedor ("Léo, você foi escalado!") | Operacional, direto |

## 6. Componentes-chave (shadcn/ui)

Base: `button, card, input, form, label, select, dialog, sheet, dropdown-menu, badge, avatar,
table, tabs, calendar, popover, toast (sonner), skeleton, alert, separator, switch, checkbox,
tooltip, command, scroll-area`.

De domínio: `PartyCard`, `InviteCard` (confirmar/recusar), `KanbanBoard`, `AvailabilityCalendar`,
`CachePill` (valor BRL), `StatusBadge`, `VehicleRodizioAlert`, `NotificationBell`, `EmptyState`,
`BottomTabBar`, `AdminSidebar`.

## 7. Qualidade não-negociável (chão de qualidade)

- Responsivo até 320px. `max-width` em imagens. Nada de scroll horizontal na página.
- **Foco de teclado visível** em tudo interativo.
- `prefers-reduced-motion` respeitado.
- Estados **vazio / carregando (skeleton) / erro** em toda tela.
- Contraste AA (verde/laranja sobre branco: usar `--verde-escuro`/`--laranja` com texto escuro ou
  branco conforme contraste; validar).
- Copy: português do Brasil, voz ativa, sentence case, sem jargão de sistema. "Salvar", não "Submeter".

## 8. Tokens no código

Definir em `src/app/globals.css` como CSS variables (HSL/OKLCH) mapeadas ao tema shadcn, com um
override de tokens por área (`.theme-app` no layout do recreador, `.theme-admin` no layout do admin).
Manter esta doc como fonte da verdade; ao mudar um token, atualizar aqui.
