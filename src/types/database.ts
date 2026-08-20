export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      availability: {
        Row: {
          created_at: string
          data: string
          id: string
          periodo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data: string
          id?: string
          periodo?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: string
          id?: string
          periodo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_user_id: string | null
          corpo: string | null
          created_at: string
          id: string
          lida: boolean
          party_id: string | null
          tipo: string
          titulo: string
        }
        Insert: {
          actor_user_id?: string | null
          corpo?: string | null
          created_at?: string
          id?: string
          lida?: boolean
          party_id?: string | null
          tipo: string
          titulo: string
        }
        Update: {
          actor_user_id?: string | null
          corpo?: string | null
          created_at?: string
          id?: string
          lida?: boolean
          party_id?: string | null
          tipo?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
        ]
      }
      parties: {
        Row: {
          aniversariante_idade: number | null
          aniversariante_nome: string | null
          bairro: string | null
          cep: string | null
          cidade: string | null
          complemento: string | null
          contratante_nome: string | null
          created_at: string
          data: string
          duracao_horas: number | null
          fechada_por: string | null
          hora_fim: string
          hora_inicio: string
          id: string
          is_viagem: boolean
          logradouro: string | null
          numero: string | null
          observacoes: string | null
          partner_id: string | null
          party_type_id: string | null
          qtd_criancas: number | null
          qtd_recreadores: number | null
          status: Database["public"]["Enums"]["party_status"]
          telefone_contato: string | null
          tema_festa: string | null
          uf: string | null
          updated_at: string
          valor_festa: number | null
        }
        Insert: {
          aniversariante_idade?: number | null
          aniversariante_nome?: string | null
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          contratante_nome?: string | null
          created_at?: string
          data: string
          duracao_horas?: number | null
          fechada_por?: string | null
          hora_fim: string
          hora_inicio: string
          id?: string
          is_viagem?: boolean
          logradouro?: string | null
          numero?: string | null
          observacoes?: string | null
          partner_id?: string | null
          party_type_id?: string | null
          qtd_criancas?: number | null
          qtd_recreadores?: number | null
          status?: Database["public"]["Enums"]["party_status"]
          telefone_contato?: string | null
          tema_festa?: string | null
          uf?: string | null
          updated_at?: string
          valor_festa?: number | null
        }
        Update: {
          aniversariante_idade?: number | null
          aniversariante_nome?: string | null
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          contratante_nome?: string | null
          created_at?: string
          data?: string
          duracao_horas?: number | null
          fechada_por?: string | null
          hora_fim?: string
          hora_inicio?: string
          id?: string
          is_viagem?: boolean
          logradouro?: string | null
          numero?: string | null
          observacoes?: string | null
          partner_id?: string | null
          party_type_id?: string | null
          qtd_criancas?: number | null
          qtd_recreadores?: number | null
          status?: Database["public"]["Enums"]["party_status"]
          telefone_contato?: string | null
          tema_festa?: string | null
          uf?: string | null
          updated_at?: string
          valor_festa?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "parties_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parties_party_type_id_fkey"
            columns: ["party_type_id"]
            isOneToOne: false
            referencedRelation: "party_types"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          ativo: boolean
          bairro: string | null
          cep: string | null
          cidade: string | null
          complemento: string | null
          contato: string | null
          created_at: string
          id: string
          logradouro: string | null
          nome: string
          numero: string | null
          observacoes: string | null
          uf: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          contato?: string | null
          created_at?: string
          id?: string
          logradouro?: string | null
          nome: string
          numero?: string | null
          observacoes?: string | null
          uf?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          contato?: string | null
          created_at?: string
          id?: string
          logradouro?: string | null
          nome?: string
          numero?: string | null
          observacoes?: string | null
          uf?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      party_assignments: {
        Row: {
          cache_calculado: number | null
          cache_custom: number | null
          cache_final: number | null
          cargo_snapshot: Database["public"]["Enums"]["cargo_type"] | null
          created_at: string
          horario_apresentacao: string | null
          id: string
          is_driver: boolean
          motivo_recusa: string | null
          party_id: string
          presence_mode: Database["public"]["Enums"]["presence_mode"] | null
          respondido_em: string | null
          status: Database["public"]["Enums"]["assignment_status"]
          updated_at: string
          user_id: string
          vehicle_id: string | null
        }
        Insert: {
          cache_calculado?: number | null
          cache_custom?: number | null
          cache_final?: number | null
          cargo_snapshot?: Database["public"]["Enums"]["cargo_type"] | null
          created_at?: string
          horario_apresentacao?: string | null
          id?: string
          is_driver?: boolean
          motivo_recusa?: string | null
          party_id: string
          presence_mode?: Database["public"]["Enums"]["presence_mode"] | null
          respondido_em?: string | null
          status?: Database["public"]["Enums"]["assignment_status"]
          updated_at?: string
          user_id: string
          vehicle_id?: string | null
        }
        Update: {
          cache_calculado?: number | null
          cache_custom?: number | null
          cache_final?: number | null
          cargo_snapshot?: Database["public"]["Enums"]["cargo_type"] | null
          created_at?: string
          horario_apresentacao?: string | null
          id?: string
          is_driver?: boolean
          motivo_recusa?: string | null
          party_id?: string
          presence_mode?: Database["public"]["Enums"]["presence_mode"] | null
          respondido_em?: string | null
          status?: Database["public"]["Enums"]["assignment_status"]
          updated_at?: string
          user_id?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "party_assignments_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "party_assignments_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      party_party_types: {
        Row: {
          created_at: string
          id: string
          party_id: string
          party_type_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          party_id: string
          party_type_id: string
        }
        Update: {
          created_at?: string
          id?: string
          party_id?: string
          party_type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "party_party_types_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_party_types_party_type_id_fkey"
            columns: ["party_type_id"]
            isOneToOne: false
            referencedRelation: "party_types"
            referencedColumns: ["id"]
          },
        ]
      }
      party_stock_items: {
        Row: {
          created_at: string
          id: string
          party_id: string
          qtd_devolvida: number | null
          qtd_levada: number
          qtd_perdida: number
          stock_item_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          party_id: string
          qtd_devolvida?: number | null
          qtd_levada?: number
          qtd_perdida?: number
          stock_item_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          party_id?: string
          qtd_devolvida?: number | null
          qtd_levada?: number
          qtd_perdida?: number
          stock_item_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "party_stock_items_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_stock_items_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
        ]
      }
      party_types: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      party_vehicles: {
        Row: {
          created_at: string
          id: string
          party_id: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          party_id: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          id?: string
          party_id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "party_vehicles_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_vehicles_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_weeks: {
        Row: {
          created_at: string
          id: string
          semana_fim: string
          semana_inicio: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          semana_fim: string
          semana_inicio: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          semana_fim?: string
          semana_inicio?: string
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          created_at: string
          id: string
          pago_em: string | null
          pago_por: string | null
          payment_week_id: string
          qtd_festas: number
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
          user_id: string
          valor_total: number
        }
        Insert: {
          created_at?: string
          id?: string
          pago_em?: string | null
          pago_por?: string | null
          payment_week_id: string
          qtd_festas?: number
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          user_id: string
          valor_total?: number
        }
        Update: {
          created_at?: string
          id?: string
          pago_em?: string | null
          pago_por?: string | null
          payment_week_id?: string
          qtd_festas?: number
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          user_id?: string
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "payments_payment_week_id_fkey"
            columns: ["payment_week_id"]
            isOneToOne: false
            referencedRelation: "payment_weeks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          aprovado: boolean
          ativo: boolean
          bairro: string | null
          cargo: Database["public"]["Enums"]["cargo_type"]
          celular: string | null
          cep: string | null
          chave_pix: string | null
          cidade: string | null
          complemento: string | null
          cpf: string | null
          created_at: string
          email: string | null
          logradouro: string | null
          nome_completo: string | null
          nome_tio: string | null
          numero: string | null
          rg: string | null
          role: Database["public"]["Enums"]["user_role"]
          uf: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          aprovado?: boolean
          ativo?: boolean
          bairro?: string | null
          cargo?: Database["public"]["Enums"]["cargo_type"]
          celular?: string | null
          cep?: string | null
          chave_pix?: string | null
          cidade?: string | null
          complemento?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          logradouro?: string | null
          nome_completo?: string | null
          nome_tio?: string | null
          numero?: string | null
          rg?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          uf?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          aprovado?: boolean
          ativo?: boolean
          bairro?: string | null
          cargo?: Database["public"]["Enums"]["cargo_type"]
          celular?: string | null
          cep?: string | null
          chave_pix?: string | null
          cidade?: string | null
          complemento?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          logradouro?: string | null
          nome_completo?: string | null
          nome_tio?: string | null
          numero?: string | null
          rg?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          uf?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      stock_items: {
        Row: {
          ativo: boolean
          categoria: string | null
          created_at: string
          foto_url: string | null
          id: string
          nome: string
          quantidade_total: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria?: string | null
          created_at?: string
          foto_url?: string | null
          id?: string
          nome: string
          quantidade_total?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria?: string | null
          created_at?: string
          foto_url?: string | null
          id?: string
          nome?: string
          quantidade_total?: number
          updated_at?: string
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          created_at: string
          id: string
          observacao: string | null
          party_id: string | null
          quantidade: number
          stock_item_id: string
          tipo: Database["public"]["Enums"]["stock_movement_type"]
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          observacao?: string | null
          party_id?: string | null
          quantidade: number
          stock_item_id: string
          tipo: Database["public"]["Enums"]["stock_movement_type"]
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          observacao?: string | null
          party_id?: string | null
          quantidade?: number
          stock_item_id?: string
          tipo?: Database["public"]["Enums"]["stock_movement_type"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          apelido: string
          created_at: string
          dia_rodizio: number | null
          id: string
          placa: string | null
          status: Database["public"]["Enums"]["vehicle_status"]
          tipo: Database["public"]["Enums"]["vehicle_type"]
          updated_at: string
        }
        Insert: {
          apelido: string
          created_at?: string
          dia_rodizio?: number | null
          id?: string
          placa?: string | null
          status?: Database["public"]["Enums"]["vehicle_status"]
          tipo: Database["public"]["Enums"]["vehicle_type"]
          updated_at?: string
        }
        Update: {
          apelido?: string
          created_at?: string
          dia_rodizio?: number | null
          id?: string
          placa?: string | null
          status?: Database["public"]["Enums"]["vehicle_status"]
          tipo?: Database["public"]["Enums"]["vehicle_type"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_user: {
        Args: {
          p_cargo: Database["public"]["Enums"]["cargo_type"]
          p_user: string
        }
        Returns: undefined
      }
      cache_base: {
        Args: { p_cargo: Database["public"]["Enums"]["cargo_type"] }
        Returns: number
      }
      calc_cache: {
        Args: {
          p_cargo: Database["public"]["Enums"]["cargo_type"]
          p_duracao_horas: number
          p_is_driver: boolean
          p_is_viagem: boolean
        }
        Returns: number
      }
      cancel_assignment: {
        Args: { p_assignment_id: string; p_motivo?: string }
        Returns: undefined
      }
      close_payment_week: {
        Args: { p_semana_inicio: string }
        Returns: undefined
      }
      confirm_assignment: {
        Args: { p_assignment_id: string }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      is_assigned_to_party: { Args: { p_party: string }; Returns: boolean }
      mark_payment_paid: { Args: { p_payment_id: string }; Returns: undefined }
      refuse_assignment: {
        Args: { p_assignment_id: string; p_motivo?: string }
        Returns: undefined
      }
      set_nome_tio: {
        Args: { p_nome: string; p_user: string }
        Returns: undefined
      }
      set_user_active: {
        Args: { p_ativo: boolean; p_user: string }
        Returns: undefined
      }
      set_user_cargo: {
        Args: {
          p_cargo: Database["public"]["Enums"]["cargo_type"]
          p_user: string
        }
        Returns: undefined
      }
      set_user_role: {
        Args: {
          p_role: Database["public"]["Enums"]["user_role"]
          p_user: string
        }
        Returns: undefined
      }
    }
    Enums: {
      assignment_status: "pendente" | "confirmada" | "recusada" | "cancelada"
      cargo_type:
        | "pendente"
        | "trainee"
        | "junior"
        | "experiente"
        | "coordenador"
      party_status:
        | "orcamento"
        | "fechada"
        | "escalada"
        | "confirmada"
        | "realizada"
        | "paga"
        | "cancelada"
      payment_status: "aberto" | "pago"
      presence_mode: "na_empresa" | "direto_no_local"
      stock_movement_type:
        | "entrada"
        | "saida_festa"
        | "devolucao"
        | "perda"
        | "ajuste"
      user_role: "admin" | "colaborador"
      vehicle_status: "disponivel" | "em_uso" | "manutencao"
      vehicle_type: "carro" | "van"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      assignment_status: ["pendente", "confirmada", "recusada", "cancelada"],
      cargo_type: [
        "pendente",
        "trainee",
        "junior",
        "experiente",
        "coordenador",
      ],
      party_status: [
        "orcamento",
        "fechada",
        "escalada",
        "confirmada",
        "realizada",
        "paga",
        "cancelada",
      ],
      payment_status: ["aberto", "pago"],
      presence_mode: ["na_empresa", "direto_no_local"],
      stock_movement_type: [
        "entrada",
        "saida_festa",
        "devolucao",
        "perda",
        "ajuste",
      ],
      user_role: ["admin", "colaborador"],
      vehicle_status: ["disponivel", "em_uso", "manutencao"],
      vehicle_type: ["carro", "van"],
    },
  },
} as const
