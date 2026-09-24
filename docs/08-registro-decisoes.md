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
**Decisão:** Usar Supabase Auth (e-mail/senha) com SMTP Resend. (Google e OTP removidos — ADR-0016.)
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

### ADR-0009 — Ordem de Serviço por colaborador escalado (não por festa)
**Data:** 2026-08-21
**Contexto:** O modelo ANEXO I fornecido pela CONTRATANTE traz "Função exercida pelo
CONTRATADO", "Valor do cachê" e o bloco "CONFIRMAÇÃO DO CONTRATADO(A)" — todos campos de
uma pessoa só. Além disso, cada colaborador precisa de um número de OS próprio para emitir
a NFS-e dele.
**Decisão:** Uma OS por `party_assignment`. Festa com 4 recreadores gera 4 OS.
Numeração sequencial **por ano** (`0001/2026`), gerada em `create_service_order()`
(SECURITY DEFINER, admin) com `pg_advisory_xact_lock` por ano — duas emissões simultâneas
não colidem no mesmo número.
**Consequência:** `service_orders.party_assignment_id` é UNIQUE. Excluir a escalação
remove a OS em cascata, e o número não é reaproveitado.

### ADR-0010 — Preenchimento do .docx por substituição de texto no XML
**Data:** 2026-08-21
**Contexto:** A OS precisa sair no modelo exato da CONTRATANTE, editável no Word — não
adianta gerar um PDF ou um documento novo "parecido".
**Decisão:** O `.docx` do modelo fica embutido em base64 (`src/lib/docx/modelo-os.ts`);
na geração ele é descompactado com `fflate`, o texto das linhas conhecidas é substituído em
`word/document.xml` e o zip é remontado. Preserva a formatação original.
**Premissa verificada:** neste modelo cada linha está num **único `<w:t>`**. O caso difícil
do OOXML (texto quebrado em vários runs) não ocorre aqui. **Se o modelo for trocado,
revalidar isso** — a substituição falha silenciosamente (deixa a linha intacta) em vez de
corromper o arquivo.
**Alternativa descartada:** `docxtemplater` — exigiria marcadores no documento, e o modelo
vem pronto da contratante.

### ADR-0011 — Aceite da OS registrado pelo admin
**Data:** 2026-08-21
**Contexto:** O aceite acontece por WhatsApp, e-mail ou assinatura física — canais fora do
sistema, como o próprio modelo prevê em "Meio de confirmação".
**Decisão:** Não há tela de aceite para o colaborador. O admin registra a resposta
(aceita/recusada), data-hora e meio de confirmação. A RLS já permite o colaborador **ler**
a OS das próprias escalações, deixando o caminho aberto caso o aceite in-app seja pedido
depois.

### ADR-0012 — Colaborador deixa de ser usuário do sistema
**Data:** 2026-08-25
**Contexto:** O colaborador tinha conta no Supabase Auth, senha/OTP e uma área própria
(`/app`) com escala, disponibilidade, pagamentos e perfil. Na prática o contato com o
tio/tia sempre foi por WhatsApp, e manter login para quem entra duas vezes por mês
custava suporte (senha esquecida, e-mail não confirmado) sem entregar nada em troca.
**Decisão:** O colaborador **não é mais usuário**. O admin cria a ficha e envia links
tokenizados por WhatsApp; fora deles, o colaborador não alcança nenhuma tela.
`profiles` ganhou `id` próprio e `user_id` virou opcional — só o admin tem conta.
**Consequência:** `/app` e o autocadastro foram removidos; as policies que liberavam
leitura ao dono viraram admin-only; `availability` foi apagada junto com a tela de
disponibilidade. A FK `profiles.user_id → auth.users` passou de `CASCADE` para
`SET NULL`, para apagar uma conta de admin não levar a ficha junto.
**Migração:** `0017_colaborador_sem_login`. As contas órfãs em `auth.users` ficam para
limpeza manual.

### ADR-0013 — Links tokenizados: hash no banco, validação no Postgres
**Data:** 2026-08-25
**Contexto:** Duas rotas passam a ser públicas (`/cadastro/[token]`, `/convite/[token]`) e
carregam dados pessoais e o cachê. Precisam ser seguras sem sessão.
**Decisão:** Token de 256 bits (`randomBytes(32)`, base64url). O banco guarda **apenas o
sha256** — um vazamento do dump não devolve links utilizáveis, e o token em claro só existe
no retorno da action que o cria. Expiração, uso único e revogação são checados **dentro do
RPC**, com `select … for update`, então dois cliques simultâneos não confirmam duas vezes.
Nenhuma policy nova para `anon`: as funções são concedidas só a `service_role` e chamadas do
servidor. Rate limit de 20 req/min por IP nas rotas de token, contra varredura.
**Consequência:** o admin não consegue reexibir um link já gerado — só gerar outro, o que
revoga o anterior. É o preço de não guardar o token.

### ADR-0014 — Remoção do trigger `prevent_sensitive_profile_update`
**Data:** 2026-08-25
**Contexto:** O trigger barrava alteração de `rg`, `cpf`, `cargo`, `role` e `aprovado` por
quem não fosse admin. Com o cadastro por token, a escrita acontece num RPC que roda **sem
`auth.uid()`** — o trigger bloquearia o próprio formulário que ele deveria proteger.
**Decisão:** Removido. A proteção virou redundante: só o admin escreve em `profiles` (via
RLS) e o RPC de cadastro, que valida o token antes.
**Consequência:** se algum dia o colaborador voltar a ter sessão, essa proteção precisa
ser reintroduzida — provavelmente como policy de coluna, não trigger.

### ADR-0015 — Envio do WhatsApp é manual
**Data:** 2026-08-25
**Contexto:** O convite e o cadastro precisam chegar no WhatsApp do colaborador.
**Decisão:** O sistema gera o link e abre o `wa.me` com a mensagem pronta; **quem envia é o
admin**, do próprio WhatsApp. Envio automático exigiria a WhatsApp Business API — conta Meta
aprovada, número dedicado, modelos homologados e custo por conversa — o que quebra o
princípio de operar em free tier na v1.
**Consequência:** nada é enviado sem alguém clicar. Se o volume crescer, a API entra como
substituição do botão, sem mudar o modelo de links.

### ADR-0016 — Só e-mail/senha, sem Google OAuth e sem página de apresentação
**Data:** 2026-08-26
**Contexto:** Com o colaborador fora do sistema (ADR-0012), sobraram três contas de
escritório. O botão "Entrar com Google" servia ao autocadastro, que não existe mais, e a
landing page `/` vendia o produto para um público que nunca vai chegar por ali.
**Decisão:** Removido o provedor Google do login (`components/auth/google-button.tsx`
apagado) e a landing page trocada por um `redirect("/login")`. As contas de admin são
criadas manualmente no painel do Supabase.
**Consequência:** o único caminho de entrada é e-mail/senha, o que reduz a superfície de
auth a uma coisa só. O provedor Google pode ser desabilitado também no painel do Supabase.
Quem já tem sessão continua caindo em `/admin`, porque o middleware redireciona `/login`.

### ADR-0017 — Exclusão de colaborador só sem histórico
**Data:** 2026-08-26
**Contexto:** Só havia "desativar". Faltava apagar de vez fichas criadas por engano ou
que nunca viraram nada. O risco: as três FKs para `profiles(id)` são `on delete cascade`,
então um `delete` cru levaria `party_assignments` e `payments` junto — histórico
financeiro sumindo em silêncio.
**Decisão:** RPC `delete_colaborador(uuid)` `SECURITY DEFINER`, só admin, que conta
escalas e pagamentos antes e **recusa a exclusão** se houver qualquer um, devolvendo a
contagem na mensagem. Sem histórico, apaga a ficha (os `colaborador_links` caem por
cascade). Quem tem histórico continua sendo desativado.
**Consequência:** o admin nunca consegue apagar histórico de pagamento pela UI. Se um dia
for preciso remover alguém com histórico (LGPD, por exemplo), o caminho é anonimizar os
campos pessoais mantendo a linha — não excluir.

### ADR-0018 — Link de cadastro reutilizável para atualização cadastral
**Data:** 2026-08-26
**Contexto:** O cadastro mudava só uma vez, no onboarding. Mas o colaborador troca de
número, de chave PIX e de endereço, e o escritório precisava de um jeito de corrigir isso.
**Decisão:** Dois caminhos, e nenhum deles é o colaborador ter login. (a) O admin edita a
ficha direto no painel — Server Action com whitelist de colunas cadastrais; `role`,
`cargo`, `aprovado` e `ativo` continuam só nas RPCs `SECURITY DEFINER`. (b) O admin gera
um link de cadastro novo mesmo com a ficha preenchida; `resolve_link` passou a devolver os
dados atuais, então o formulário abre preenchido e o colaborador só corrige o que mudou.
**Consequência:** o link de cadastro carrega dado pessoal (RG, CPF, endereço) na resposta.
É o dado do próprio titular, atrás de um token de 256 bits, de uso único e revogável — e
`resolve_link` só devolve o bloco `cadastro` enquanto o link vale: queimado, expirado ou
revogado, volta nulo. Ainda assim, um link vazado passa a expor mais do que antes; o
contrapeso é o admin revogar pelo painel.

### ADR-0019 — Contrato do evento montado na hora, sem converter o .docx
**Data:** 2026-08-27
**Contexto:** O contrato é o orçamento que o cliente preenche e devolve, mais a folha
"Dados da empresa" (depósito, PIX, cadastro de pessoa física e cláusula de cancelamento),
que o escritório mandava solta pelo WhatsApp. Duas decisões apareceram: como transformar
o .docx em página do PDF, e se o contrato pronto deve ser guardado.
**Decisão:** (a) A folha é **redesenhada com pdf-lib**, não convertida. Converter .docx
para PDF exige LibreOffice no servidor, que não roda no free tier da Vercel; redesenhar
ainda deixa a página no visual da marca e permite adiantar os campos que o sistema já
sabe (nome, endereço, data, horário, telefone), sobrando CPF e RG para o cliente. (b) O
contrato **não é guardado**: guarda-se só o arquivo devolvido pelo cliente, num bucket
privado, e o PDF final é montado a cada download.
**Consequência:** os dados bancários e a cláusula viram código (`lib/pdf/dados-empresa.ts`);
mudar de conta é mudar uma constante e publicar, não trocar um arquivo. Em compensação, o
contrato nunca fica desatualizado em relação à festa, e não há uma segunda cópia de dado
pessoal para gerenciar. Se algum dia for preciso provar o que foi enviado numa data, aí
sim será necessário arquivar o PDF gerado.

### ADR-0020 — Remover item do estoque zera a quantidade
**Data:** 2026-08-28
**Contexto:** `removerItem` só fazia `ativo = false`. O item sumia da tela, mas
`quantidade_total` continuava no banco — o sistema seguia afirmando que a empresa tinha
15 baldes que o escritório já tinha dado baixa. `quantidade_total` é patrimônio total (só
diminui em `perda`), então inativar sem zerar deixa o número errado para sempre.
**Decisão:** RPC `delete_stock_item(uuid)` `SECURITY DEFINER`, só admin, com `for update`
na linha. Se o item nunca foi usado (sem movimentações), **apaga de vez**. Se já tem
movimentação, **inativa e zera a quantidade**, preservando o histórico. Se está vinculado
a alguma festa, **recusa** e diz quantas — a FK é `on delete cascade` e apagar sumiria com
o item da lista de materiais da festa sem aviso.
**Consequência:** o total do estoque no banco passa a bater com o que a tela mostra. Item
com histórico deixa uma linha inativa de quantidade zero, que é o preço de não destruir
`stock_movements`. Os 11 itens removidos antes desta correção foram apagados manualmente
a pedido do dono, junto com as 32 movimentações que restavam.

### ADR-0021 — Emissão de PDF não pode depender de enfeite nem de anexo
**Data:** 2026-08-28
**Contexto:** Em produção, gerar o orçamento devolvia 500 com `SOI not found in JPEG`,
embora a base64 da logo estivesse íntegra no fonte e no bundle. Causa: o pdf-lib monta o
`DataView` a partir de `bytes.buffer` **ignorando o byteOffset**
(`JpegEmbedder.js:43`). Um `Buffer` do Node é uma janela sobre um pool compartilhado;
quando ele vem com offset — o que ocorre no runtime da Vercel, mas não no Node local —
o pdf-lib lê do começo do pool e não encontra o marcador do JPEG.
**Decisão:** (a) `bytesParaPdf()` copia para um `Uint8Array` próprio antes de qualquer
`embedJpg`/`embedPng`, garantindo offset 0. (b) A logo passou a ser opcional: falhar ao
embuti-la registra no log e o documento sai sem ela, porque enfeite não pode bloquear a
emissão. (c) O contrato deixou de exigir o arquivo devolvido pelo cliente — sem anexo,
a primeira página é o orçamento que o próprio sistema gera.
**Consequência:** a montagem dos dados da festa saiu de dentro da rota do orçamento para
`lib/pdf/festa-orcamento.ts`, compartilhada pelas duas rotas. Qualquer `embed` novo de
imagem precisa passar por `bytesParaPdf` — o bug não aparece em desenvolvimento, só no
runtime de produção, o que o torna especialmente traiçoeiro.

### ADR-0022 — Uma conta por pessoa do escritório, com papéis
**Data:** 2026-09-01
**Contexto:** O escritório inteiro entrava por `soalegria@admin.com`. Senha compartilhada
não diz quem fez o quê, não dá para tirar o acesso de uma pessoa sem tirar de todas, e
obriga a expor pagamento de colaborador a quem não tem nada com isso.
**Decisão:** `user_role` passa a ter `dona`, `gerente` e `funcionario` além dos `admin` e
`colaborador` que já existiam. Três helpers no Postgres traduzem papel em alcance:
`is_dona()` (proprietária), `is_gestao()` (dona + gerente) e `is_equipe()` (qualquer login
do escritório).

O corte é **equipe x gestão**, não "admin x resto": a operação inteira — festas, escala,
colaboradores, frota, parceiros, estoque — é da equipe; o que envolve **dinheiro**
(`payments`, `payment_weeks`) e **Ordem de Serviço** é da gestão. Papel de acesso é só da dona.

**Alternativas:** (a) tabela de permissões por módulo, com lookup nas policies: mais
flexível, mas troca um claim no JWT por uma subquery em toda linha de toda tabela, para um
escritório de quatro pessoas; (b) resolver o alcance só no front, deixando o banco binário:
a RLS deixaria de ser a fronteira, contra a ADR-0002.

**Consequência:**
- **`is_admin()` foi removido** (migration 0028). Enquanto o corte era "admin x resto" dava
  para viver com ele significando "gestão"; com o funcionário enxergando quase tudo, o nome
  passaria a mentir em toda policy onde aparecesse. O `drop function public.is_admin()` no fim
  da 0028, sem `if exists`, é a prova de que nenhuma policy ficou apontando para ele — se
  tivesse ficado, a migration inteira voltaria atrás.
- As policies estavam quebradas em quatro por tabela (select/insert/update/delete), herança de
  quando o SELECT tinha predicado próprio (o colaborador via só as festas dele). Esse predicado
  morreu na 0017; a 0028 recolheu cada tabela a uma policy `for all`.
- A equipe escreve em `profiles`, então o trigger `guard_profile_privileges` voltou a existir
  (o que a ADR-0014 tinha removido) para impedir que gerente ou funcionário se promova a dona.
  Desta vez ele deixa passar sessões sem JWT, que é o caso do cadastro por token.
- Quatro tabelas (`party_types`, `vehicles`, `partners`, `payment_weeks`) liberavam SELECT a
  qualquer autenticado, sobra de quando o colaborador tinha login. Com um papel de menor
  privilégio no sistema a brecha deixou de ser teórica: `payment_weeks` virou gestão e as
  outras três, equipe.
- **O funcionário vê cachê.** Pagamentos está fechado, mas `party_assignments.cache_final`
  aparece na tela da festa — é o que o escalador precisa para montar a equipe. Fechar isso
  exigiria esconder coluna, não tabela; ficou de fora por ora.
- Contas são provisionadas por `npm run usuarios` (Auth Admin API, service role), não por
  migration: senha e identidade são coisa do GoTrue, não do SQL.
- A conta única `soalegria@admin.com` continua de pé como `admin` até o escritório confirmar
  que cada uma entra com a sua. Ela é o oposto do que esta ADR decidiu — desativá-la é o
  último passo da migração, não um detalhe.

---

### ADR-0023 — Duas observações por festa, e condições fixas nos documentos do cliente

**Data:** 2026-09-04 · **Status:** aceita

**Contexto:** a festa tinha um único campo `observacoes`. Ele saía só na folha do dia — o
papel que a equipe leva para o evento — e nunca no orçamento. O escritório escrevia ali
combinados que o cliente precisava ler (o que está incluso, valor da hora adicional) e eles
não chegavam a lugar nenhum. Junto disso, as condições de contratação (forma de pagamento,
prazo, cancelamento, crédito) eram coladas à mão no WhatsApp a cada orçamento.

**Decisão:**
1. Separar em dois campos com públicos diferentes: `observacoes` continua sendo a **observação
   do evento**, escrita para a equipe, e sai na folha do dia; `observacoes_orcamento` é a
   **observação do orçamento**, escrita para o cliente, e sai no orçamento e no contrato
   (migration 0030).
2. As condições fixas viram texto versionado em `src/lib/pdf/condicoes.ts`, não um bloco
   digitado por festa. Mudou a regra, muda num arquivo e vale para os dois documentos.

**Alternativas:** (a) um campo só, marcado com uma flag "mostrar ao cliente": um texto não se
divide em dois públicos com um checkbox — a mesma frase que serve à equipe ("cliente é
chata, chegar 30min antes") não pode ir ao cliente; (b) guardar as condições numa tabela
editável pelo admin: são texto jurídico que muda de ano em ano, não dado de operação — cabe
em migration de código, não em CRUD.

**Consequência:**
- O contrato ganha a folha `pagina-condicoes.ts`, mas **só quando começa pelo arquivo que o
  cliente devolveu**. Quando começa pelo orçamento gerado aqui, as condições já estão nele e a
  folha repetiria o texto (ver `CondicoesDoContrato.incluirFolha`).
- Cores, medidas e os helpers `sanitize`/`wrap` estavam copiados em cada gerador de PDF;
  foram para `src/lib/pdf/estilo.ts`, com `wrapMultilinha` novo — a observação digitada pela
  gerente tem quebras de linha que não podem virar parágrafo corrido.
- As rotas `/api/festas/[id]/orcamento` e `/contrato` ainda exigiam o papel legado `admin`,
  o que deixava a dona e a gerente sem baixar documento nenhum desde a ADR-0022. Passaram a
  usar `eGestao()`.

---

### ADR-0024 — RG sem dígito verificador, CNPJ alfanumérico

**Data:** 2026-09-21 · **Status:** aceita

**Contexto:** uma colaboradora não conseguiu terminar o cadastro pelo link, em produção. O
validador de RG exigia exatamente 9 caracteres (8 base + 1 DV do algoritmo mód. 11 do RG-SP)
e o RG dela tem 10 dígitos. Na mesma revisão veio a segunda pendência: a Receita Federal
adotou o **CNPJ alfanumérico** (IN RFB nº 2.229/2024) e tanto o Zod quanto a constraint
`profiles_cnpj_formato` só aceitavam `^[0-9]{14}$`.

**Decisão:**
1. **RG: validar formato, não dígito verificador.** Aceita de 5 a 14 caracteres, dígitos com
   um X opcional só na última posição, recusando a sequência toda igual. `formatRG` continua
   com a máscara `00.000.000-0` e acomoda o RG mais longo como `00.000.000-00`.
2. **CNPJ: alfanumérico.** 12 primeiras posições em `[0-9A-Z]`, 2 dígitos verificadores
   numéricos. No mód. 11 cada caractere vale `ASCII − 48` — para CNPJ só de números a conta
   dá idêntica à antiga, então nada do que já está gravado deixa de valer. A constraint
   virou `^[0-9A-Z]{12}[0-9]{2}$` (migration 0031) e as Server Actions gravam com `onlyCnpj`,
   não mais `onlyDigits`, que apagaria as letras.

**Alternativas:** (a) manter o DV do RG-SP e só aumentar o limite de caracteres: o DV de SP
não vale para RG de outro estado — a conta bateria por acaso em 1 de cada 11 casos e barraria
os outros; (b) validar o RG por UV/estado: não existe tabela pública confiável de algoritmo
por estado, e o RG não carrega a UF emissora nos dígitos.

**Consequência:**
- O RG deixa de ter conferência automática. A conferência de verdade passa a ser o escritório
  olhando a foto do documento — que é o que já acontecia na prática, já que o DV de SP nunca
  provou que o número existe.
- Os campos de RG e CNPJ dos formulários passaram a `inputMode="text"` com
  `autoCapitalize="characters"`: com `numeric` o teclado do celular não oferece letras.

---

### ADR-0025 — RG opcional no cadastro pelo link

**Data:** 2026-09-22 · **Status:** aceita

**Contexto:** um colaborador travou no formulário público porque só tem CPF em mãos — não
tem RG, ou não tem o documento consigo na hora de preencher. O RG era obrigatório no
`cadastroColaboradorSchema`, então o cadastro inteiro ficava bloqueado por esse campo. A
coluna `profiles.rg` nunca foi `not null`, e a edição pelo admin já aceitava RG vazio: a
obrigatoriedade só existia no cadastro pelo link.

**Decisão:** o RG passa a ser opcional no cadastro, com a mesma regra que já vale para o
CNPJ — vazio passa, preenchido tem de ser válido (`vazioOu(isValidRG)`). O rótulo do campo
virou "RG (opcional)" e a RPC `submit_cadastro_by_token` grava `nullif(..., '')`
(migration 0032), para a ficha ficar com `null` e não com string vazia.

**Alternativas:** (a) deixar obrigatório e o escritório completar depois pelo painel: exige
um telefonema por cadastro e o colaborador nem consegue enviar o resto dos dados;
(b) exigir "RG ou CNPJ": CNPJ só vale para quem é MEI, e a maioria não é.

**Consequência:** ficha pode nascer sem RG. Quem lê o RG (ficha do admin, documentos) já
trata `null`, mostrando o campo vazio. O escritório pede o documento depois, pelo link de
atualização, quando precisar do número para contrato.

---

### ADR-0026 — O cachê é da festa, não do cargo do cadastro

**Data:** 2026-09-22 · **Status:** aceita

**Contexto:** a gerente não queria mais escolher entre Trainee/Júnior/Experiente/Coordenador
ao aprovar um colaborador. O motivo é operacional: a mesma pessoa vai como coordenadora numa
festa e como experiente na outra, e as festas têm valores diferentes entre si. Com o cachê
saindo de `cache_base(profiles.cargo)`, o cargo do cadastro estava decidindo o pagamento de
toda festa — e o único escape era digitar `cache_custom` em cada escalação.

**Decisão:** o cargo do cadastro vira só o nível geral da pessoa, sem valor nenhum. Quem
define o cachê passa a ser a função escolhida na escalação, gravada em
`party_assignments.cargo_snapshot` — coluna que já existia, mas só era preenchida no aceite,
copiando o cargo do perfil. Três consequências no banco (migration 0033):

1. `trg_assignment_cache` calcula `cache_calculado` já na escalação, para a gerente ver o
   valor antes de mandar o convite. A conta continua no Postgres (ADR-0001).
2. `responder_convite_by_token` deixa de carimbar o cargo do perfil por cima: só preenche
   `cargo_snapshot` se estiver vazio.
3. `calc_cache_preview(party_id)` devolve quanto rende cada função naquela festa, com e sem
   motorista, para a tela de escalação exibir sem duplicar a tabela de preços em JavaScript.
   Na mesma linha, `CARGO_BASE` saiu de `types/domain.ts`.

**Alternativas:** (a) exigir `cache_custom` digitado em toda escalação: dá liberdade total,
mas joga fora hora extra, viagem e motorista, que continuam sendo regra fixa e passariam a
depender da gerente lembrar de somar; (b) tirar a escolha de nível do cadastro de vez: ela
quis manter, é o que organiza a lista de colaboradores e vira a sugestão inicial da escalação.

**Consequência:**
- Escalações antigas não mudam: `cargo_snapshot` e `cache_calculado` já estavam gravados, e
  `cache_final` é coluna gerada sobre eles. Nada de festa paga é recalculado.
- Aprovar colaborador não mostra mais valor em R$ em lugar nenhum.
- A escalação ganhou um campo obrigatório (a função), e o cachê digitado continua sendo
  `cache_custom` — que segue vencendo o cálculo.

**Revisão (2026-09-22, migration 0034):** a gerente voltou atrás na parte de manter o nível
no cadastro — não quer escolher nada ao aprovar. Aprovar passou a ser só liberar a pessoa
(`approve_user(p_profile)`, sem cargo), e `set_user_cargo` foi removida junto com a tela que
a chamava. `profiles.cargo` continua na tabela como herança de quem já estava aprovado e
como fallback das escalações anteriores à 0033, mas nenhuma tela lê nem escreve nela; quem
pode ser escalado passou a ser "aprovado e ativo", não mais "cargo <> pendente" — sem isso
ninguém aprovado depois da 0034 apareceria na lista de escalação. Na escalação, a função
deixou de vir pré-selecionada: é a decisão de quanto a pessoa ganha naquela festa, então o
botão de enviar convite fica travado até o admin escolher uma das quatro.

---

### ADR-0027 — Orçamento vale 5 dias; vencido vai para Recuperação

**Data:** 2026-09-24 · **Status:** aceita

**Contexto:** o escritório manda o orçamento pelo WhatsApp e muitos clientes somem. Sem
prazo no documento, o cliente volta semanas depois cobrando o valor antigo, e os orçamentos
parados se misturavam com os que ainda estavam em negociação.

**Decisão:**
1. O orçamento tem validade de **5 dias corridos** a partir da emissão, impressa no PDF
   ("Emitido em" / "Válido até" + observação). Nova coluna `parties.orcamento_emitido_em`
   (migration 0035); vazia, conta de `created_at`.
2. A emissão é gravada ao gerar o PDF, **só** se não havia orçamento válido — reimprimir
   não estica o prazo sem querer. Devolver a festa para "Orçamento" (arrastando no kanban ou
   pelo controle de status) renova a emissão para hoje.
3. **Recuperação** é uma coluna calculada do kanban, não um valor de `party_status`: festa em
   `orcamento` com a validade vencida. A coluna não aceita card arrastado.
4. Festas pagas/canceladas há mais de 30 dias saem do kanban e ficam no histórico,
   alcançável pela busca e pelos filtros. Busca e filtros ficam na URL, para sobreviver a abrir
   uma festa e voltar.

**Alternativas:** (a) status `recuperacao` no enum: exigiria um job diário para mover as
festas na virada do prazo e deixaria o status mentir entre uma execução e outra; calculado na
leitura, ele está sempre certo. (b) validade contando sempre da última geração do PDF: uma
simples reimpressão estenderia o prazo sem a gerente perceber.

**Consequência:** o prazo é conta de data, não de dinheiro — fica em
`src/lib/orcamento-validade.ts` (com `America/Sao_Paulo`), sem violar a regra de cálculo no
banco. O contrato reaproveita o PDF do orçamento **sem** a faixa de validade.

---

### ADR-0028 — Vendidos e Perdidos: o cliente depois do funil

**Data:** 2026-09-24 · **Status:** aceita

**Contexto:** a gerente quer voltar a falar com quem já fez festa (no ano seguinte, perto
da mesma data) e com quem não fechou. O kanban é operacional e esconde as festas antigas
(ADR-0027); faltava um lugar para o cliente.

**Decisão:**
1. Duas páginas no menu, abaixo de Festas. **Não há tabela de clientes**: as duas leem
   `parties`. Vendidos agrupa por telefone (dígitos) ou, sem ele, pelo nome sem acento.
2. **Vendidos** = `realizada` ou `paga`, ordenado pela próxima repetição da data da última
   festa (29/02 cai em 28/02), com a idade que o aniversariante vai fazer.
3. **Perdidos** = `cancelada` + orçamento vencido sem resposta. O motivo fica em
   `parties.motivo_perda` (+ `motivo_perda_obs`, `perdido_em`; migration 0036), gravado pela
   action `marcarPerdido`. O vencido aparece como "Orçamento vencido" até alguém marcá-lo.
4. `mudarStatusFesta` limpa o motivo sempre que a festa sai de `cancelada`.

**Alternativas:** tabela `clientes` com vínculo em `parties` — organizaria melhor, mas exige
migrar e deduplicar o histórico e mudar o cadastro de festa. Fica para quando precisar de
dados do cliente que não são da festa (ex.: histórico de contatos de follow-up).

**Consequência:** o mesmo cliente escrito com telefones diferentes vira dois cartões em
Vendidos. Não há registro de "já chamei no WhatsApp" — próximo passo natural se o volume
crescer.

---

### ADR-0029 — Follow-ups da festa

**Data:** 2026-09-24 · **Status:** aceita

**Contexto:** o escritório conversa com o cliente pelo WhatsApp e não tinha onde anotar o
que foi combinado ("cobrei, manda amanhã"). O campo `observacoes` é para a equipe da festa,
não um histórico, e sobrescrever texto perde quem disse o quê e quando.

**Decisão:** tabela `party_follow_ups` (migration 0037), uma linha por anotação, com autor
e hora, exibida na página da festa logo abaixo de Informações, da mais nova para a mais
antiga. Sem edição: errou, apaga e escreve de novo. A policy de insert exige
`autor_id = current_profile_id()`, então ninguém registra em nome de outra pessoa; apagar é
do próprio autor ou da gestão.

**Consequência:** os follow-ups ficam presos à festa. Vendidos/Perdidos ainda não mostram o
último contato — próximo passo natural (ver ADR-0028).

---

### ADR-0030 — O kanban é só o que está em andamento

**Data:** 2026-09-24 · **Status:** substituída pela ADR-0031 · **Substitui** o item 4 da ADR-0027

**Contexto:** com o tempo as colunas Realizada e Paga (e as canceladas) enchiam o quadro. A
ADR-0027 escondia só as pagas/canceladas com mais de 30 dias; a gerente preferiu que o quadro
mostre apenas a operação viva, já que Vendidos e Perdidos (ADR-0028) guardam o resto.

**Decisão:** colunas Orçamento, Recuperação, Fechada, Escalada e Confirmada. Realizada, paga
e cancelada saem do kanban. No lugar das colunas, duas áreas de soltar no fim do quadro:
**Realizada** (muda o status; o cliente aparece em Vendidos) e **Perdido** (abre o diálogo de
motivo). O filtro "Mostrar histórico" deixou de existir. Em Perdidos, **Recuperar** está
sempre disponível e devolve a festa ao quadro em Orçamento; se a data já passou, abre a
edição da festa.

**Consequência:** achar uma festa antiga é por Vendidos/Perdidos (ou pelo calendário). A busca
do kanban aponta para lá com `?q=`. Marcar Paga passa a ser só pela página da festa.

---

### ADR-0031 — Realizada e Paga voltam ao quadro; fim do funil pelo card

**Data:** 2026-09-24 · **Status:** aceita · **Substitui** a ADR-0030

**Contexto:** tirar Realizada e Paga do kanban (ADR-0030) quebrou o controle dos pagamentos
da semana, e as áreas de soltar no fim do quadro não eram como a gerente queria marcar o
desfecho da festa.

**Decisão:**
1. Colunas Realizada e Paga de volta. Paga some do quadro 30 dias depois da data da festa
   (o cliente continua em Vendidos); cancelada continua fora (fica em Perdidos).
2. Sem áreas de soltar. O desfecho se marca no card: menu "⋯" no card do kanban
   (realizada / paga / perdido) e botões em destaque no card Status da página da festa
   (Marcar como realizada, Marcar como perdido, Marcar como paga, Recuperar).
3. Arrastar entre colunas continua funcionando como antes.
