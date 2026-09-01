import { z } from "zod";
import { isValidCPF } from "@/lib/utils/cpf";
import { isValidCNPJ } from "@/lib/utils/cnpj";
import { isValidPhone } from "@/lib/utils/phone";
import { isValidRG } from "@/lib/utils/rg";

/**
 * Cadastro que o colaborador preenche pelo link enviado no WhatsApp.
 * É o antigo autocadastro sem senha nem confirmação — ele não tem login.
 */
export const cadastroColaboradorSchema = z.object({
  nome_completo: z.string().min(3, "Informe seu nome completo"),
  rg: z.string().refine(isValidRG, "RG inválido (verifique o dígito)"),
  cpf: z.string().refine(isValidCPF, "CPF inválido"),
  // Opcional: nem todo tio é MEI. Se preencher, tem de ser um CNPJ válido.
  cnpj: z
    .string()
    .trim()
    .optional()
    .default("")
    .refine((v) => v === "" || isValidCNPJ(v), "CNPJ inválido"),
  email: z.string().email("E-mail inválido"),
  celular: z.string().refine((v) => isValidPhone(v), "Celular inválido (com DDD)"),
  cep: z.string().min(8, "CEP inválido"),
  logradouro: z.string().min(2, "Informe o logradouro"),
  numero: z.string().min(1, "Informe o número"),
  complemento: z.string().optional().default(""),
  bairro: z.string().min(2, "Informe o bairro"),
  cidade: z.string().min(2, "Informe a cidade"),
  uf: z.string().length(2, "UF inválida"),
  chave_pix: z.string().min(3, "Informe sua chave PIX"),
});
export type CadastroColaboradorInput = z.infer<typeof cadastroColaboradorSchema>;

/** Dados mínimos para o admin abrir a ficha antes de mandar o link. */
export const novoColaboradorSchema = z.object({
  nome_completo: z.string().min(3, "Informe o nome completo"),
  celular: z.string().refine((v) => isValidPhone(v), "Celular inválido (com DDD)"),
});
export type NovoColaboradorInput = z.infer<typeof novoColaboradorSchema>;

/** Aceita vazio (campo ainda não preenchido) ou exige que o valor seja válido. */
const vazioOu = (check: (v: string) => boolean, msg: string) =>
  z.string().trim().refine((v) => v === "" || check(v), msg);

/**
 * Edição manual pelo admin — o colaborador liga pedindo para trocar o telefone,
 * a chave PIX ou o endereço. Diferente do cadastro pelo link, aqui quase tudo é
 * opcional: dá para corrigir um campo só numa ficha ainda incompleta.
 */
export const editarColaboradorSchema = z.object({
  nome_completo: z.string().trim().min(3, "Informe o nome completo"),
  nome_tio: z.string().trim().optional().default(""),
  rg: vazioOu(isValidRG, "RG inválido (verifique o dígito)"),
  cpf: vazioOu(isValidCPF, "CPF inválido"),
  cnpj: vazioOu(isValidCNPJ, "CNPJ inválido"),
  email: vazioOu((v) => z.string().email().safeParse(v).success, "E-mail inválido"),
  celular: vazioOu((v) => isValidPhone(v), "Celular inválido (com DDD)"),
  cep: vazioOu((v) => v.replace(/\D/g, "").length === 8, "CEP inválido"),
  logradouro: z.string().trim().optional().default(""),
  numero: z.string().trim().optional().default(""),
  complemento: z.string().trim().optional().default(""),
  bairro: z.string().trim().optional().default(""),
  cidade: z.string().trim().optional().default(""),
  uf: vazioOu((v) => v.length === 2, "UF inválida"),
  chave_pix: z.string().trim().optional().default(""),
});
export type EditarColaboradorInput = z.infer<typeof editarColaboradorSchema>;
