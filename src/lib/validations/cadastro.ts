import { z } from "zod";
import { isValidCPF } from "@/lib/utils/cpf";
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
