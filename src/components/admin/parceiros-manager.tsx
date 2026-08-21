"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Building2, Pencil, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/common/empty-state";
import { formatCEP, lookupCep } from "@/lib/utils/cep";
import { criarParceiro, atualizarParceiro, excluirParceiro } from "@/actions/parceiros";

export type Parceiro = {
  id: string;
  nome: string;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  contato: string | null;
  observacoes: string | null;
};

const EMPTY = {
  nome: "",
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
  contato: "",
  observacoes: "",
};

export function ParceirosManager({ parceiros }: { parceiros: Parceiro[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [buscandoCep, setBuscandoCep] = useState(false);

  const set = (k: keyof typeof EMPTY) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  function novo() {
    setEditId(null);
    setForm(EMPTY);
    setOpen(true);
  }

  function editar(p: Parceiro) {
    setEditId(p.id);
    setForm({
      nome: p.nome,
      cep: p.cep ?? "",
      logradouro: p.logradouro ?? "",
      numero: p.numero ?? "",
      complemento: p.complemento ?? "",
      bairro: p.bairro ?? "",
      cidade: p.cidade ?? "",
      uf: p.uf ?? "",
      contato: p.contato ?? "",
      observacoes: p.observacoes ?? "",
    });
    setOpen(true);
  }

  async function handleCep() {
    if (form.cep.replace(/\D/g, "").length !== 8) return;
    setBuscandoCep(true);
    const found = await lookupCep(form.cep);
    if (found) {
      setForm((f) => ({
        ...f,
        logradouro: found.logradouro || f.logradouro,
        bairro: found.bairro || f.bairro,
        cidade: found.cidade || f.cidade,
        uf: found.uf || f.uf,
      }));
    }
    setBuscandoCep(false);
  }

  function salvar() {
    startTransition(async () => {
      const res = editId
        ? await atualizarParceiro(editId, form)
        : await criarParceiro(form);
      if (res?.error) toast.error(res.error);
      else {
        toast.success(editId ? "Buffet atualizado." : "Buffet cadastrado.");
        setOpen(false);
        router.refresh();
      }
    });
  }

  function excluir() {
    if (!editId) return;
    startTransition(async () => {
      const res = await excluirParceiro(editId);
      if (res?.error) toast.error(res.error);
      else {
        toast.success("Buffet excluído.");
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={novo} className="bg-verde font-semibold text-white hover:bg-verde-escuro">
          <Plus className="size-4" /> Novo buffet
        </Button>
      </div>

      {parceiros.length === 0 ? (
        <EmptyState
          icon={<Building2 className="size-6" />}
          title="Nenhum buffet cadastrado"
          description="Cadastre buffets parceiros para selecionar rapidamente ao criar uma festa."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {parceiros.map((p) => (
            <Card key={p.id}>
              <CardContent className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="font-medium">{p.nome}</p>
                  {(p.logradouro || p.cidade) && (
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                      <MapPin className="size-3.5 shrink-0" />
                      <span className="truncate">
                        {[p.logradouro, p.numero, p.bairro, p.cidade && `${p.cidade}/${p.uf ?? ""}`]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    </p>
                  )}
                  {p.contato && (
                    <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Phone className="size-3.5" /> {p.contato}
                    </p>
                  )}
                </div>
                <button type="button" onClick={() => editar(p)} aria-label="Editar" className="text-muted-foreground hover:text-foreground">
                  <Pencil className="size-4" />
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar buffet" : "Novo buffet"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome do buffet</Label>
              <Input id="nome" value={form.nome} onChange={(e) => set("nome")(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cep">CEP</Label>
              <Input id="cep" inputMode="numeric" value={form.cep} onChange={(e) => set("cep")(formatCEP(e.target.value))} onBlur={handleCep} placeholder="00000-000" />
              {buscandoCep && <p className="text-xs text-muted-foreground">Buscando endereço…</p>}
            </div>
            <div className="grid grid-cols-[1fr_90px] gap-3">
              <Fld label="Logradouro" value={form.logradouro} onChange={set("logradouro")} />
              <Fld label="Número" value={form.numero} onChange={set("numero")} />
            </div>
            <div className="grid grid-cols-[1fr_1fr_70px] gap-3">
              <Fld label="Bairro" value={form.bairro} onChange={set("bairro")} />
              <Fld label="Cidade" value={form.cidade} onChange={set("cidade")} />
              <Fld label="UF" value={form.uf} maxLength={2} onChange={(v) => set("uf")(v.toUpperCase())} />
            </div>
            <Fld label="Contato (telefone/nome)" value={form.contato} onChange={set("contato")} />
            <div className="space-y-2">
              <Label htmlFor="obs">Observações</Label>
              <Textarea id="obs" value={form.observacoes} onChange={(e) => set("observacoes")(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            {editId ? (
              <Button variant="ghost" onClick={excluir} disabled={pending} className="text-vermelho hover:text-vermelho">
                Excluir
              </Button>
            ) : (
              <span />
            )}
            <Button onClick={salvar} disabled={pending || !form.nome.trim()} className="bg-verde font-semibold text-white hover:bg-verde-escuro">
              {pending ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Fld({
  label,
  value,
  onChange,
  ...props
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
} & Omit<React.ComponentProps<typeof Input>, "value" | "onChange">) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} {...props} />
    </div>
  );
}
