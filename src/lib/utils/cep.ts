/** Consulta de CEP: ViaCEP com fallback BrasilAPI. Ver docs/02-arquitetura.md. */

export type Endereco = {
  cep: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
};

export function onlyDigitsCep(v: string): string {
  return (v ?? "").replace(/\D/g, "").slice(0, 8);
}

export function formatCEP(v: string): string {
  const c = onlyDigitsCep(v);
  return c.replace(/(\d{5})(\d)/, "$1-$2");
}

async function fromViaCep(cep: string): Promise<Endereco | null> {
  const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
  if (!res.ok) return null;
  const data = await res.json();
  if (data.erro) return null;
  return {
    cep,
    logradouro: data.logradouro ?? "",
    bairro: data.bairro ?? "",
    cidade: data.localidade ?? "",
    uf: data.uf ?? "",
  };
}

async function fromBrasilApi(cep: string): Promise<Endereco | null> {
  const res = await fetch(`https://brasilapi.com.br/api/cep/v1/${cep}`);
  if (!res.ok) return null;
  const data = await res.json();
  return {
    cep,
    logradouro: data.street ?? "",
    bairro: data.neighborhood ?? "",
    cidade: data.city ?? "",
    uf: data.state ?? "",
  };
}

/** Retorna o endereço do CEP ou null se não encontrado. */
export async function lookupCep(input: string): Promise<Endereco | null> {
  const cep = onlyDigitsCep(input);
  if (cep.length !== 8) return null;
  try {
    return (await fromViaCep(cep)) ?? (await fromBrasilApi(cep));
  } catch {
    try {
      return await fromBrasilApi(cep);
    } catch {
      return null;
    }
  }
}
