import { z } from "zod";

const HORA = /^\d{2}:\d{2}$/;

export const festaSchema = z.object({
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data"),
  hora_inicio: z.string().regex(HORA, "Hora de início inválida"),
  hora_fim: z.string().regex(HORA, "Hora de fim inválida"),
  party_type_ids: z.array(z.string().uuid()).min(1, "Selecione pelo menos um tipo de festa"),
  contratante_nome: z.string().trim().optional().default(""),
  aniversariante_nome: z.string().trim().optional().default(""),
  aniversariante_idade: z.number().int().min(0).max(120).nullable().optional(),
  qtd_criancas: z.number().int().min(0).max(2000).nullable().optional(),
  is_viagem: z.boolean().optional().default(false),
  observacoes: z.string().trim().optional().default(""),
  // Local: buffet parceiro OU endereço livre
  partner_id: z.preprocess(
    (val) => (val === "" ? null : val),
    z.string().uuid().nullable().optional()
  ),
  cep: z.string().trim().optional().default(""),
  logradouro: z.string().trim().optional().default(""),
  numero: z.string().trim().optional().default(""),
  complemento: z.string().trim().optional().default(""),
  bairro: z.string().trim().optional().default(""),
  cidade: z.string().trim().optional().default(""),
  uf: z.string().trim().optional().default(""),
  vehicle_ids: z.array(z.string().uuid()).optional().default([]),
});
export type FestaInput = z.infer<typeof festaSchema>;

export const escalaSchema = z.object({
  party_id: z.string().uuid(),
  user_id: z.string().uuid(),
  presence_mode: z.enum(["na_empresa", "direto_no_local"]),
  horario_apresentacao: z.string().regex(HORA, "Horário inválido").nullable().optional(),
  is_driver: z.boolean().optional().default(false),
  vehicle_id: z.preprocess(
    (val) => (val === "" ? null : val),
    z.string().uuid().nullable().optional()
  ),
  cache_custom: z.number().min(0).max(100000).nullable().optional(),
});
export type EscalaInput = z.infer<typeof escalaSchema>;
