import { unzipSync, zipSync, strToU8, strFromU8 } from "fflate";
import { MODELO_OS_BASE64 } from "./modelo-os";
import { fromISODate, formatTime } from "@/lib/utils/date";

/**
 * Preenche o modelo de Ordem de Serviço da CONTRATANTE (ANEXO I).
 *
 * O .docx é um zip; o texto vive em `word/document.xml`. Neste modelo cada
 * linha está num único `<w:t>`, então dá para substituir a linha inteira sem
 * mexer na formatação — o caso difícil (texto quebrado em vários runs) não
 * acontece aqui. Se o modelo for trocado, revalidar essa premissa.
 */

export type OrdemServicoData = {
  numero: number;
  ano: number;
  dataEmissao: string; // YYYY-MM-DD
  dataEvento: string; // YYYY-MM-DD
  horaChegada: string | null; // HH:MM
  horaTermino: string | null; // HH:MM
  localEvento: string;
  enderecoCompleto: string;
  clienteContratante: string;
};

const DIA_SEMANA_ORDINAL = ["7", "2", "3", "4", "5", "6", "sáb"] as const;

/** "1ª feira" não existe: domingo e sábado são escritos por extenso. */
function diaDaSemanaLabel(iso: string): string {
  const dia = fromISODate(iso).getDay(); // 0=domingo … 6=sábado
  if (dia === 0) return "domingo";
  if (dia === 6) return "sábado";
  return `${DIA_SEMANA_ORDINAL[dia]}ª feira`;
}

function partesData(iso: string) {
  const [ano, mes, dia] = iso.slice(0, 10).split("-");
  return { dia, mes, ano };
}

/** Escapa o que vai para dentro de um nó XML de texto. */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Troca o conteúdo de um `<w:t>` cujo texto atual começa com `prefixo`.
 * Deixa o XML intacto quando não encontra — o modelo pode mudar e um
 * documento sem um campo é melhor do que um documento corrompido.
 */
function substituirLinha(xml: string, prefixo: string, novaLinha: string): string {
  const prefixoXml = escapeXml(prefixo);
  const re = new RegExp(
    `(<w:t[^>]*>)${prefixoXml.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^<]*(</w:t>)`,
  );
  if (!re.test(xml)) return xml;
  return xml.replace(re, `$1${escapeXml(novaLinha)}$2`);
}

export function gerarOrdemServicoDocx(d: OrdemServicoData): Uint8Array {
  const zip = unzipSync(Buffer.from(MODELO_OS_BASE64, "base64"));
  const documentPath = "word/document.xml";
  const original = zip[documentPath];
  if (!original) {
    throw new Error("Modelo de OS inválido: word/document.xml não encontrado.");
  }

  let xml = strFromU8(original);

  const emissao = partesData(d.dataEmissao);
  const evento = partesData(d.dataEvento);
  const numeroFormatado = String(d.numero).padStart(4, "0");

  xml = substituirLinha(
    xml,
    "ORDEM DE SERVIÇO Nº",
    `ORDEM DE SERVIÇO Nº ${numeroFormatado}/${d.ano}`,
  );
  xml = substituirLinha(
    xml,
    "Data de emissão:",
    `Data de emissão: ${emissao.dia}/${emissao.mes}/${emissao.ano}`,
  );
  xml = substituirLinha(
    xml,
    "Data do evento:",
    `Data do evento: ${evento.dia}/${evento.mes}/${evento.ano} (${diaDaSemanaLabel(d.dataEvento)})`,
  );
  xml = substituirLinha(
    xml,
    "Horário de chegada do CONTRATADO:",
    `Horário de chegada do CONTRATADO: ${d.horaChegada ? `${formatTime(d.horaChegada)} h` : "____:____ h"}`,
  );
  xml = substituirLinha(
    xml,
    "Horário de término da prestação:",
    `Horário de término da prestação: ${d.horaTermino ? `${formatTime(d.horaTermino)} h` : "____:____ h"}`,
  );
  xml = substituirLinha(xml, "Local do evento:", `Local do evento: ${d.localEvento}`);
  xml = substituirLinha(
    xml,
    "Endereço completo:",
    `Endereço completo: ${d.enderecoCompleto}`,
  );
  xml = substituirLinha(
    xml,
    "Cliente / Contratante do evento:",
    `Cliente / Contratante do evento: ${d.clienteContratante}`,
  );

  zip[documentPath] = strToU8(xml);
  return zipSync(zip);
}

/** Nome do arquivo entregue ao admin. */
export function nomeArquivoOS(numero: number, ano: number, colaborador: string): string {
  const slug = colaborador
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return `OS-${String(numero).padStart(4, "0")}-${ano}${slug ? `-${slug}` : ""}.docx`;
}
