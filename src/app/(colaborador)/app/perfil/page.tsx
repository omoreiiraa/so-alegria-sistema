import type { Metadata } from "next";
import { requireColaborador } from "@/lib/auth";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LogoutButton } from "@/components/common/logout-button";
import { PerfilEditForm } from "@/components/colaborador/perfil-edit-form";
import { CARGO_LABEL } from "@/types/domain";
import { formatCPF } from "@/lib/utils/cpf";
import { formatRG } from "@/lib/utils/rg";

export const metadata: Metadata = { title: "Perfil" };

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value || "—"}</span>
    </div>
  );
}

export default async function PerfilPage() {
  const { profile, email } = await requireColaborador();

  return (
    <div className="space-y-5">
      <PageHeader title="Meu perfil" />

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="font-display text-lg">
            {profile.nome_completo}
            {profile.nome_tio && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {profile.nome_tio}
              </span>
            )}
          </CardTitle>
          <Badge variant="secondary" className="bg-verde/10 text-verde-escuro">
            {CARGO_LABEL[profile.cargo]}
          </Badge>
        </CardHeader>
        <CardContent className="divide-y divide-border pt-0">
          <Row label="E-mail" value={email} />
          <Row label="CPF" value={profile.cpf ? formatCPF(profile.cpf) : null} />
          <Row label="RG" value={profile.rg ? formatRG(profile.rg) : null} />
          <p className="pt-3 text-xs text-muted-foreground">
            Nome, RG, CPF e cargo só podem ser alterados pelo escritório.
          </p>
        </CardContent>
      </Card>

      <PerfilEditForm
        initial={{
          celular: profile.celular ?? "",
          cep: profile.cep ?? "",
          logradouro: profile.logradouro ?? "",
          numero: profile.numero ?? "",
          complemento: profile.complemento ?? "",
          bairro: profile.bairro ?? "",
          cidade: profile.cidade ?? "",
          uf: profile.uf ?? "",
          chave_pix: profile.chave_pix ?? "",
        }}
      />

      <div className="pt-1">
        <LogoutButton label="Sair da conta" />
      </div>
    </div>
  );
}
