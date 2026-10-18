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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      atribuicoes: {
        Row: {
          atribuido_por: string
          fim_em: string | null
          id: string
          inicio_em: string
          lead_id: string
          loja_id: number
          responsavel_id: string
        }
        Insert: {
          atribuido_por: string
          fim_em?: string | null
          id?: string
          inicio_em?: string
          lead_id: string
          loja_id: number
          responsavel_id: string
        }
        Update: {
          atribuido_por?: string
          fim_em?: string | null
          id?: string
          inicio_em?: string
          lead_id?: string
          loja_id?: number
          responsavel_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "atribuicoes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atribuicoes_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          criado_em: string
          id: string
          instagram: string | null
          nome: string
          telefone_normalizado: string
          telefone_original: string
        }
        Insert: {
          criado_em?: string
          id?: string
          instagram?: string | null
          nome: string
          telefone_normalizado: string
          telefone_original: string
        }
        Update: {
          criado_em?: string
          id?: string
          instagram?: string | null
          nome?: string
          telefone_normalizado?: string
          telefone_original?: string
        }
        Relationships: []
      }
      interacoes: {
        Row: {
          acordo_remarcacao_confirmado: boolean
          autor_id: string
          canal: string
          contato_efetivo: boolean
          id: string
          lead_id: string
          loja_id: number
          ocorreu_em: string
          resultado: string
          resumo: string
        }
        Insert: {
          acordo_remarcacao_confirmado?: boolean
          autor_id: string
          canal: string
          contato_efetivo: boolean
          id?: string
          lead_id: string
          loja_id: number
          ocorreu_em?: string
          resultado: string
          resumo: string
        }
        Update: {
          acordo_remarcacao_confirmado?: boolean
          autor_id?: string
          canal?: string
          contato_efetivo?: boolean
          id?: string
          lead_id?: string
          loja_id?: number
          ocorreu_em?: string
          resultado?: string
          resumo?: string
        }
        Relationships: [
          {
            foreignKeyName: "interacoes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      itens_venda: {
        Row: {
          descricao: string
          id: string
          quantidade: number
          valor_unitario_centavos: number
          venda_id: string
        }
        Insert: {
          descricao: string
          id?: string
          quantidade: number
          valor_unitario_centavos: number
          venda_id: string
        }
        Update: {
          descricao?: string
          id?: string
          quantidade?: number
          valor_unitario_centavos?: number
          venda_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "itens_venda_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          arquivado_em: string | null
          atualizado_em: string
          cliente_id: string
          criado_em: string
          criado_por: string
          id: string
          loja_id: number
          motivo_perda: string | null
          observacao_perda: string | null
          origem: string
          request_id: string | null
          responsavel_id: string
          status: Database["public"]["Enums"]["lead_status"]
          status_antes_perda: Database["public"]["Enums"]["lead_status"] | null
          versao_arquivamento: number
        }
        Insert: {
          arquivado_em?: string | null
          atualizado_em?: string
          cliente_id: string
          criado_em?: string
          criado_por: string
          id?: string
          loja_id: number
          motivo_perda?: string | null
          observacao_perda?: string | null
          origem: string
          request_id?: string | null
          responsavel_id: string
          status: Database["public"]["Enums"]["lead_status"]
          status_antes_perda?: Database["public"]["Enums"]["lead_status"] | null
          versao_arquivamento?: number
        }
        Update: {
          arquivado_em?: string | null
          atualizado_em?: string
          cliente_id?: string
          criado_em?: string
          criado_por?: string
          id?: string
          loja_id?: number
          motivo_perda?: string | null
          observacao_perda?: string | null
          origem?: string
          request_id?: string | null
          responsavel_id?: string
          status?: Database["public"]["Enums"]["lead_status"]
          status_antes_perda?: Database["public"]["Enums"]["lead_status"] | null
          versao_arquivamento?: number
        }
        Relationships: [
          {
            foreignKeyName: "leads_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      lojas: {
        Row: {
          ativa: boolean
          id: number
          nome: string
        }
        Insert: {
          ativa?: boolean
          id: number
          nome: string
        }
        Update: {
          ativa?: boolean
          id?: number
          nome?: string
        }
        Relationships: []
      }
      ocorrencias_arquivamento: {
        Row: {
          autor_id: string
          id: string
          justificativa: string | null
          lead_id: string
          ocorreu_em: string
          operacao: string
          versao: number
        }
        Insert: {
          autor_id: string
          id?: string
          justificativa?: string | null
          lead_id: string
          ocorreu_em?: string
          operacao: string
          versao: number
        }
        Update: {
          autor_id?: string
          id?: string
          justificativa?: string | null
          lead_id?: string
          ocorreu_em?: string
          operacao?: string
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "ocorrencias_arquivamento_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos_interesse: {
        Row: {
          categoria: string
          criado_em: string
          id: string
          lead_id: string
          loja_id: number
          observacao: string | null
          porte: string
          responsavel_id: string
        }
        Insert: {
          categoria: string
          criado_em?: string
          id?: string
          lead_id: string
          loja_id: number
          observacao?: string | null
          porte: string
          responsavel_id: string
        }
        Update: {
          categoria?: string
          criado_em?: string
          id?: string
          lead_id?: string
          loja_id?: number
          observacao?: string | null
          porte?: string
          responsavel_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "produtos_interesse_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      proximas_acoes: {
        Row: {
          concluida_em: string | null
          criada_em: string
          criada_por: string
          descricao: string
          encerrada_em: string | null
          encerrada_por: string | null
          encerramento: string | null
          id: string
          interacao_id: string | null
          lead_id: string
          motivo_encerramento: string | null
          prevista_para: string | null
        }
        Insert: {
          concluida_em?: string | null
          criada_em?: string
          criada_por: string
          descricao: string
          encerrada_em?: string | null
          encerrada_por?: string | null
          encerramento?: string | null
          id?: string
          interacao_id?: string | null
          lead_id: string
          motivo_encerramento?: string | null
          prevista_para?: string | null
        }
        Update: {
          concluida_em?: string | null
          criada_em?: string
          criada_por?: string
          descricao?: string
          encerrada_em?: string | null
          encerrada_por?: string | null
          encerramento?: string | null
          id?: string
          interacao_id?: string | null
          lead_id?: string
          motivo_encerramento?: string | null
          prevista_para?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proximas_acoes_interacao_id_fkey"
            columns: ["interacao_id"]
            isOneToOne: false
            referencedRelation: "interacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proximas_acoes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      transicoes: {
        Row: {
          autor_id: string
          id: string
          lead_id: string
          loja_id: number
          motivo_perda: string | null
          observacao_perda: string | null
          ocorreu_em: string
          origem_fato: string
          responsavel_id: string
          status_anterior: Database["public"]["Enums"]["lead_status"] | null
          status_novo: Database["public"]["Enums"]["lead_status"]
        }
        Insert: {
          autor_id: string
          id?: string
          lead_id: string
          loja_id: number
          motivo_perda?: string | null
          observacao_perda?: string | null
          ocorreu_em?: string
          origem_fato: string
          responsavel_id: string
          status_anterior?: Database["public"]["Enums"]["lead_status"] | null
          status_novo: Database["public"]["Enums"]["lead_status"]
        }
        Update: {
          autor_id?: string
          id?: string
          lead_id?: string
          loja_id?: number
          motivo_perda?: string | null
          observacao_perda?: string | null
          ocorreu_em?: string
          origem_fato?: string
          responsavel_id?: string
          status_anterior?: Database["public"]["Enums"]["lead_status"] | null
          status_novo?: Database["public"]["Enums"]["lead_status"]
        }
        Relationships: [
          {
            foreignKeyName: "transicoes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      usuarios: {
        Row: {
          ativo: boolean
          id: string
          login: string
          loja_id: number | null
          nome: string
        }
        Insert: {
          ativo?: boolean
          id: string
          login: string
          loja_id?: number | null
          nome: string
        }
        Update: {
          ativo?: boolean
          id?: string
          login?: string
          loja_id?: number | null
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      vendas: {
        Row: {
          id: string
          lead_id: string
          loja_id: number
          registrada_por: string
          responsavel_id: string
          valor_total_centavos: number
          vendida_em: string
        }
        Insert: {
          id?: string
          lead_id: string
          loja_id: number
          registrada_por: string
          responsavel_id: string
          valor_total_centavos: number
          vendida_em?: string
        }
        Update: {
          id?: string
          lead_id?: string
          loja_id?: number
          registrada_por?: string
          responsavel_id?: string
          valor_total_centavos?: number
          vendida_em?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendas_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: true
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_dias_uteis: { Args: { base: string; n?: number }; Returns: string }
      arquivar_lead: {
        Args: { _arquivar: boolean; _justificativa?: string; _lead: string }
        Returns: undefined
      }
      cancelar_acao: {
        Args: { _lead: string; _motivo: string }
        Returns: undefined
      }
      consultar_cliente: { Args: { _telefone: string }; Returns: Json }
      criar_lead: { Args: { p: Json }; Returns: string }
      ctx: { Args: never; Returns: Record<string, unknown> }
      definir_acao: {
        Args: {
          _descricao: string
          _lead: string
          _motivo?: string
          _prevista: string
        }
        Returns: undefined
      }
      distribuir_lead: {
        Args: { _destino: string; _lead: string }
        Returns: undefined
      }
      e_gestor_do_lead: { Args: { _lead: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      lead_visivel_ou_erro: {
        Args: { _lead: string }
        Returns: {
          arquivado_em: string | null
          atualizado_em: string
          cliente_id: string
          criado_em: string
          criado_por: string
          id: string
          loja_id: number
          motivo_perda: string | null
          observacao_perda: string | null
          origem: string
          request_id: string | null
          responsavel_id: string
          status: Database["public"]["Enums"]["lead_status"]
          status_antes_perda: Database["public"]["Enums"]["lead_status"] | null
          versao_arquivamento: number
        }
        SetofOptions: {
          from: "*"
          to: "leads"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      listar_equipe: {
        Args: { _loja?: number }
        Returns: {
          id: string
          loja_id: number
          loja_nome: string
          nome: string
          perfil: Database["public"]["Enums"]["app_role"]
        }[]
      }
      listar_leads: {
        Args: {
          _arquivados?: boolean
          _fila?: string
          _responsavel?: string
          _status?: string
        }
        Returns: {
          acao_descricao: string
          acao_prevista: string
          arquivado: boolean
          cliente_nome: string
          criado_em: string
          id: string
          loja_nome: string
          origem: string
          responsavel_id: string
          responsavel_nome: string
          status: Database["public"]["Enums"]["lead_status"]
          telefone: string
          tem_acao: boolean
        }[]
      }
      listar_lojas: {
        Args: never
        Returns: {
          id: number
          nome: string
        }[]
      }
      me: { Args: never; Returns: Json }
      normalizar_telefone: { Args: { t: string }; Returns: string }
      obter_lead: { Args: { _id: string }; Returns: Json }
      painel: {
        Args: {
          _fim: string
          _inicio: string
          _loja?: number
          _vendedor?: string
        }
        Returns: Json
      }
      pode_ver_lead: { Args: { _lead: string }; Returns: boolean }
      reabrir_lead: { Args: { _lead: string }; Returns: undefined }
      registrar_interacao: {
        Args: {
          _acordo?: boolean
          _canal: string
          _lead: string
          _nova_descricao?: string
          _nova_prevista?: string
          _resultado: string
          _resumo: string
        }
        Returns: undefined
      }
      registrar_perda: {
        Args: { _lead: string; _motivo: string; _obs?: string }
        Returns: undefined
      }
      registrar_venda: {
        Args: { _itens: Json; _lead: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "VENDEDOR" | "GERENTE" | "SUPERVISOR" | "DIRETOR" | "MARKETING"
      lead_status: "NOVO" | "DISTRIBUIDO" | "NEGOCIACAO" | "GANHO" | "PERDIDO"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["VENDEDOR", "GERENTE", "SUPERVISOR", "DIRETOR", "MARKETING"],
      lead_status: ["NOVO", "DISTRIBUIDO", "NEGOCIACAO", "GANHO", "PERDIDO"],
    },
  },
} as const
