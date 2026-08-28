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
