/**
 * Provisiona as contas de acesso do escritório.
 *
 *   npm run usuarios
 *
 * Só a Auth Admin API cria conta com senha do jeito certo (hash, identidade,
 * e-mail confirmado) — por isso isto é um script, e não uma migration. Roda com
 * a service role, então nunca no navegador: é o mesmo motivo pelo qual a chave
 * mora só no .env.local e na Vercel.
 *
 * É idempotente: rodar de novo reaplica a senha inicial e o papel de acesso de
 * quem já existe, sem duplicar ninguém.
 *
 * A senha é provisória (Nome#2026) e cada uma troca a sua em /admin/conta.
 */

import { createClient } from "@supabase/supabase-js";

const EQUIPE = [
  { nome: "Camila", nome_completo: "Camila",  role: "dona" },
  { nome: "Paula",  nome_completo: "Paula",   role: "gerente" },
  { nome: "Carol",  nome_completo: "Carol",   role: "funcionario" },
  { nome: "Caio",   nome_completo: "Caio",    role: "funcionario" },
];

const email = (nome) => `${nome.toLowerCase()}@soalegria.com`;
const senhaInicial = (nome) => `${nome}#2026`;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRole) {
  console.error(
    "Faltam NEXT_PUBLIC_SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Rode com: node --env-file=.env.local scripts/criar-usuarios.mjs",
  );
  process.exit(1);
}

const supabase = createClient(url, serviceRole, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/** Procura a conta pelo e-mail (a Admin API não tem busca direta). */
async function acharPorEmail(alvo) {
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const achado = data.users.find((u) => u.email?.toLowerCase() === alvo);
    if (achado) return achado;
    if (data.users.length < 200) return null;
  }
}

async function provisionar({ nome, nome_completo, role }) {
  const mail = email(nome);
  const password = senhaInicial(nome);

  let user = await acharPorEmail(mail);

  if (user) {
    const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
      user_metadata: { nome_completo },
    });
    if (error) throw error;
    user = data.user;
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: mail,
      password,
      email_confirm: true,
      user_metadata: { nome_completo },
    });
    if (error) throw error;
    user = data.user;
  }

  // O trigger handle_new_user já criou a ficha; aqui só carimbamos o papel.
  // Como isto roda com service role (sem auth.uid()), a trava de privilégio
  // da 0026 deixa passar — é exatamente o caminho previsto para provisionar.
  const { data: perfil, error: erroPerfil } = await supabase
    .from("profiles")
    .update({ role, nome_completo, email: mail, ativo: true, aprovado: true })
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();
  if (erroPerfil) throw erroPerfil;

  if (!perfil) {
    const { error } = await supabase
      .from("profiles")
      .insert({ user_id: user.id, role, nome_completo, email: mail, ativo: true, aprovado: true });
    if (error) throw error;
  }

  return { mail, role, password };
}

const linhas = [];
for (const pessoa of EQUIPE) {
  try {
    const r = await provisionar(pessoa);
    linhas.push(`  ✓ ${r.mail.padEnd(26)} ${r.role.padEnd(12)} senha: ${r.password}`);
  } catch (e) {
    linhas.push(`  ✗ ${email(pessoa.nome).padEnd(26)} ${e.message || JSON.stringify(e)}`);
    process.exitCode = 1;
  }
}

console.log("\nContas de acesso do escritório\n");
console.log(linhas.join("\n"));
console.log("\nSenhas provisórias: cada uma troca a sua em /admin/conta.\n");
