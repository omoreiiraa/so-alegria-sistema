import type { Metadata } from "next";
import { lerLink } from "@/actions/links";
import { LinkInvalido } from "@/components/publico/link-invalido";
import { ConviteResposta } from "@/components/publico/convite-resposta";
import type { EstadoLink } from "@/types/domain";

export const metadata: Metadata = {
  title: "Convite de festa",
  robots: { index: false, follow: false },
};

export default async function ConvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const link = await lerLink(token);

  if (link.estado !== "valido" || link.tipo !== "convite") {
    const estado: Exclude<EstadoLink, "valido"> =
      link.estado === "valido" ? "inexistente" : link.estado;
    return <LinkInvalido estado={estado} />;
  }

  return (
    <ConviteResposta
      token={token}
      nome={link.colaborador.nome_completo ?? ""}
      festa={link.festa}
      assignment={link.assignment}
    />
  );
}
