import type { Database, Tables } from "@/types/database";

export type Profile = Tables<"profiles">;
export type Party = Tables<"parties">;
export type PartyAssignment = Tables<"party_assignments">;
export type Payment = Tables<"payments">;
export type Vehicle = Tables<"vehicles">;
export type Partner = Tables<"partners">;
export type StockItem = Tables<"stock_items">;
export type Notification = Tables<"notifications">;

export type CargoType = Database["public"]["Enums"]["cargo_type"];
export type UserRole = Database["public"]["Enums"]["user_role"];
export type PartyStatus = Database["public"]["Enums"]["party_status"];
export type AssignmentStatus = Database["public"]["Enums"]["assignment_status"];
export type PresenceMode = Database["public"]["Enums"]["presence_mode"];
export type VehicleType = Database["public"]["Enums"]["vehicle_type"];
export type VehicleStatus = Database["public"]["Enums"]["vehicle_status"];

/** Rótulos de exibição (pt-BR). A lógica de cachê vive no banco (docs/01). */
export const CARGO_LABEL: Record<CargoType, string> = {
  pendente: "Pendente",
  trainee: "Trainee",
  junior: "Júnior",
  experiente: "Experiente",
  coordenador: "Coordenador",
};

/** Cachê base por cargo — apenas para exibição informativa. Fonte da verdade: cache_base() no Postgres. */
export const CARGO_BASE: Record<CargoType, number | null> = {
  pendente: null,
  trainee: 60,
  junior: 80,
  experiente: 100,
  coordenador: 200,
};

export const PARTY_STATUS_LABEL: Record<PartyStatus, string> = {
  orcamento: "Orçamento",
  fechada: "Fechada",
  escalada: "Escalada",
  confirmada: "Confirmada",
  realizada: "Realizada",
  paga: "Paga",
  cancelada: "Cancelada",
};

export const ASSIGNMENT_STATUS_LABEL: Record<AssignmentStatus, string> = {
  pendente: "Convite pendente",
  confirmada: "Confirmada",
  recusada: "Recusada",
  cancelada: "Cancelada",
};

export const PRESENCE_MODE_LABEL: Record<PresenceMode, string> = {
  na_empresa: "Na empresa",
  direto_no_local: "Direto no local",
};

export const VEHICLE_TYPE_LABEL: Record<VehicleType, string> = {
  carro: "Carro",
  van: "Van",
};

export const VEHICLE_STATUS_LABEL: Record<VehicleStatus, string> = {
  disponivel: "Disponível",
  em_uso: "Em uso",
  manutencao: "Manutenção",
};

export const DIAS_SEMANA_CURTO = [
  "Dom",
  "Seg",
  "Ter",
  "Qua",
  "Qui",
  "Sex",
  "Sáb",
] as const;
