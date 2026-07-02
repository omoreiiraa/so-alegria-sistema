import type { Metadata } from "next";
import { requireColaborador } from "@/lib/auth";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LogoutButton } from "@/components/common/logout-button";
import { CARGO_LABEL } from "@/types/domain";
import { formatCPF } from "@/lib/utils/cpf";
import { formatPhone } from "@/lib/utils/phone";

export const metadata: Metadata = { title: "Perfil" };

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value || "—"}</span>
    </div>
  );
}

export default async function PerfilPage() {
  const { profile, email } = await requireColaborador();
  const endereco = [
    profile.logradouro && `${profile.logradouro}, ${profile.numero ?? "s/n"}`,
    profile.bairro,
    profile.cidade && profile.uf && `${profile.cidade}/${profile.uf}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-5">
      <PageHeader title="Meu perfil" />

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="font-display text-lg">
            {profile.nome_completo}
          </CardTitle>
          <Badge variant="secondary" className="bg-verde/10 text-verde-escuro">
            {CARGO_LABEL[profile.cargo]}
          </Badge>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          <Row label="E-mail" value={email} />
          <Row label="Celular" value={profile.celular ? formatPhone(profile.celular) : null} />
          <Row label="CPF" value={profile.cpf ? formatCPF(profile.cpf) : null} />
          <Row label="Endereço" value={endereco} />
          <Row label="Chave PIX" value={profile.chave_pix} />
        </CardContent>
      </Card>

      <p className="px-1 text-xs text-muted-foreground">
        Para alterar nome, RG, CPF ou cargo, fale com o escritório. Você pode
        editar celular, endereço, chave PIX e senha (em breve).
      </p>

      <div className="pt-2">
        <LogoutButton label="Sair da conta" />
      </div>
    </div>
  );
}
