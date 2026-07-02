import { z } from "zod";
import { isValidCPF } from "@/lib/utils/cpf";
import { isValidPhone } from "@/lib/utils/phone";
import { isValidRG } from "@/lib/utils/rg";

export const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  senha: z.string().min(1, "Informe a senha"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const cadastroSchema = z
  .object({
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
    senha: z.string().min(8, "A senha deve ter ao menos 8 caracteres"),
    confirmar_senha: z.string(),
  })
  .refine((d) => d.senha === d.confirmar_senha, {
    message: "As senhas não conferem",
    path: ["confirmar_senha"],
  });
export type CadastroInput = z.infer<typeof cadastroSchema>;
