import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  senha: z.string().min(1, "Informe a senha"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const senhaSchema = z
  .object({
    senha: z.string().min(8, "A senha deve ter ao menos 8 caracteres"),
    confirmar_senha: z.string(),
  })
  .refine((d) => d.senha === d.confirmar_senha, {
    message: "As senhas não conferem",
    path: ["confirmar_senha"],
  });
