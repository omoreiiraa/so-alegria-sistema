import type { Metadata } from "next";
import { lerLink } from "@/actions/links";
import { LinkInvalido } from "@/components/publico/link-invalido";
import { CadastroForm } from "@/components/publico/cadastro-form";
import type { EstadoLink } from "@/types/domain";

export const metadata: Metadata = {
  title: "Cadastro",
  robots: { index: false, follow: false },
};

export default async function CadastroPorLinkPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const link = await lerLink(token);

  if (link.estado !== "valido" || link.tipo !== "cadastro") {
    const estado: Exclude<EstadoLink, "valido"> =
      link.estado === "valido" ? "inexistente" : link.estado;
    return <LinkInvalido estado={estado} />;
  }

  const { colaborador } = link;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold">
          Olá{colaborador.nome_completo ? `, ${colaborador.nome_completo.split(" ")[0]}` : ""}!
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Preencha seus dados para entrar na equipe. É rápido, e você só precisa
          fazer isso uma vez.
        </p>
      </div>
      <CadastroForm
        token={token}
        nomeInicial={colaborador.nome_completo ?? ""}
        celularInicial={colaborador.celular ?? ""}
      />
    </div>
  );
}
