import type { Database, Tables } from "@/types/database";

export type Profile = Tables<"profiles">;
export type Party = Tables<"parties">;
export type PartyAssignment = Tables<"party_assignments">;
export type Payment = Tables<"payments">;
export type Vehicle = Tables<"vehicles">;
export type Partner = Tables<"partners">;
export type StockItem = Tables<"stock_items">;
export type Notification = Tables<"notifications">;
export type ColaboradorLink = Tables<"colaborador_links">;

export type CargoType = Database["public"]["Enums"]["cargo_type"];
export type UserRole = Database["public"]["Enums"]["user_role"];
export type PartyStatus = Database["public"]["Enums"]["party_status"];
export type AssignmentStatus = Database["public"]["Enums"]["assignment_status"];
export type PresenceMode = Database["public"]["Enums"]["presence_mode"];
export type VehicleType = Database["public"]["Enums"]["vehicle_type"];
export type VehicleStatus = Database["public"]["Enums"]["vehicle_status"];
export type ServiceOrderStatus = Database["public"]["Enums"]["service_order_status"];
export type ConfirmationMethod = Database["public"]["Enums"]["confirmation_method"];
export type LinkTipo = Database["public"]["Enums"]["link_tipo"];

/** Estados possíveis de um link tokenizado, devolvidos por resolve_link(). */
export type EstadoLink =
  | "valido"
  | "usado"
  | "expirado"
  | "revogado"
  | "respondido"
  | "inexistente";

export type LinkColaboradorInfo = {
  nome_completo: string | null;
  celular: string | null;
};

/** Dados atuais do colaborador, para o link de cadastro abrir preenchido. */
export type CadastroAtual = {
  nome_completo: string | null;
  rg: string | null;
  cpf: string | null;
  cnpj: string | null;
  email: string | null;
  celular: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  chave_pix: string | null;
};

export type ConviteFestaInfo = {
  data: string;
  hora_inicio: string;
  hora_fim: string;
  contratante: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  is_viagem: boolean;
};

export type ConviteAssignmentInfo = {
  presence_mode: PresenceMode | null;
  horario_apresentacao: string | null;
  is_driver: boolean;
  cache_estimado: number | null;
};

/** Payload de resolve_link(). O `estado` discrimina o que mais vem junto. */
export type LinkResolvido =
  | {
      estado: "valido";
      tipo: "cadastro";
      /** true quando o cadastro já foi preenchido antes e este link é de atualização */
      atualizacao: boolean;
      colaborador: LinkColaboradorInfo;
      cadastro: CadastroAtual;
    }
  | {
      estado: "valido";
      tipo: "convite";
      colaborador: LinkColaboradorInfo;
      festa: ConviteFestaInfo;
      assignment: ConviteAssignmentInfo;
    }
  | { estado: Exclude<EstadoLink, "valido">; tipo?: LinkTipo };

// ---------------------------------------------------------------------------
// Papéis de acesso (ver ADR-0022 e a matriz em docs/04)
// ---------------------------------------------------------------------------
// Espelham os helpers do Postgres — `is_dona()`, `is_gestao()`, `is_equipe()`.
// Aqui eles só decidem o que aparece na tela; quem barra de verdade é a RLS.
// `admin` é o papel da conta única antiga e segue valendo como proprietária.

/** Proprietária: define papel de acesso das outras. */
export const PAPEIS_DONA: readonly UserRole[] = ["dona", "admin"];
/** Gestão: o que envolve dinheiro e Ordem de Serviço. */
export const PAPEIS_GESTAO: readonly UserRole[] = ["dona", "admin", "gerente"];
/** Escritório com login — a operação inteira. O colaborador não tem conta. */
export const PAPEIS_EQUIPE: readonly UserRole[] = [
  "dona",
  "admin",
  "gerente",
  "funcionario",
];

export const eDona = (role: UserRole) => PAPEIS_DONA.includes(role);
export const eGestao = (role: UserRole) => PAPEIS_GESTAO.includes(role);
export const eEquipe = (role: UserRole) => PAPEIS_EQUIPE.includes(role);

/**
 * Todo mundo entra pelo painel. O que muda por papel é o que aparece no menu:
 * Pagamentos e Ordem de Serviço só para a gestão.
 */
export const ROTA_INICIAL = "/admin";

export const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Administração",
  dona: "Proprietária",
  gerente: "Gerente",
  funcionario: "Funcionário",
  colaborador: "Colaborador",
};

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

export const SERVICE_ORDER_STATUS_LABEL: Record<ServiceOrderStatus, string> = {
  rascunho: "Rascunho",
  enviada: "Enviada",
  aceita: "Aceita",
  recusada: "Recusada",
};

export const CONFIRMATION_METHOD_LABEL: Record<ConfirmationMethod, string> = {
  whatsapp: "WhatsApp",
  email: "E-mail",
  assinatura_fisica: "Assinatura física",
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

/**
 * Categorias do estoque. Lista fechada, definida pelo escritório: alimenta o
 * filtro da tela e a seleção no cadastro do item, para o texto não variar.
 */
export const CATEGORIAS_ESTOQUE = [
  "OFICINA",
  "RECREAÇÃO",
  "BALADINHA KIDS BASICA",
  "BALADINHA KIDS SUPERIOR",
  "ESPAÇO KIDS DE MADEIRA",
  "ESPAÇO KIDS COLORIDO",
  "CAMA ELASTICA",
  "PISCINA DE BOLINHA BRANCA",
  "PISCINA DE BOLINHA COLORIDA",
  "SPA KIDS",
] as const;

export type CategoriaEstoque = (typeof CATEGORIAS_ESTOQUE)[number];

/** Itens antigos podem ter categoria fora da lista; elas continuam visíveis. */
export const eCategoriaEstoque = (c: string): c is CategoriaEstoque =>
  (CATEGORIAS_ESTOQUE as readonly string[]).includes(c);

export const DIAS_SEMANA_CURTO = [
  "Dom",
  "Seg",
  "Ter",
  "Qua",
  "Qui",
  "Sex",
  "Sáb",
] as const;
