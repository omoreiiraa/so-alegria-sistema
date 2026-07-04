import { z } from "zod";
import { isValidPhone } from "@/lib/utils/phone";

export const perfilSchema = z.object({
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
export type PerfilInput = z.infer<typeof perfilSchema>;

export const senhaSchema = z
  .object({
    senha: z.string().min(8, "A senha deve ter ao menos 8 caracteres"),
    confirmar_senha: z.string(),
  })
  .refine((d) => d.senha === d.confirmar_senha, {
    message: "As senhas não conferem",
    path: ["confirmar_senha"],
  });
