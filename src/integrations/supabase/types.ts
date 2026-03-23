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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ads_data: {
        Row: {
          acos: number | null
          acos_direto: number | null
          classificacao: string | null
          cliques: number | null
          cliques_produto: number | null
          conversoes: number | null
          conversoes_diretas: number | null
          created_at: string | null
          ctr: number | null
          custo_por_conversao: number | null
          despesas: number | null
          gmv: number | null
          gmv_direto: number | null
          id: string
          importado_em: string | null
          impressoes: number | null
          impressoes_produto: number | null
          itens_vendidos: number | null
          itens_vendidos_diretos: number | null
          margem_contribuicao: number | null
          metodo_lance: string | null
          nome_produto_csv: string
          periodo_fim: string | null
          periodo_inicio: string | null
          posicao_importada: boolean | null
          posicao_media: number | null
          product_id: string | null
          roas: number | null
          roas_direto: number | null
          roas_empate: number | null
          shopee_product_id: string | null
          status_anuncio: string | null
          taxa_conversao: number | null
          user_id: string
        }
        Insert: {
          acos?: number | null
          acos_direto?: number | null
          classificacao?: string | null
          cliques?: number | null
          cliques_produto?: number | null
          conversoes?: number | null
          conversoes_diretas?: number | null
          created_at?: string | null
          ctr?: number | null
          custo_por_conversao?: number | null
          despesas?: number | null
          gmv?: number | null
          gmv_direto?: number | null
          id?: string
          importado_em?: string | null
          impressoes?: number | null
          impressoes_produto?: number | null
          itens_vendidos?: number | null
          itens_vendidos_diretos?: number | null
          margem_contribuicao?: number | null
          metodo_lance?: string | null
          nome_produto_csv: string
          periodo_fim?: string | null
          periodo_inicio?: string | null
          posicao_importada?: boolean | null
          posicao_media?: number | null
          product_id?: string | null
          roas?: number | null
          roas_direto?: number | null
          roas_empate?: number | null
          shopee_product_id?: string | null
          status_anuncio?: string | null
          taxa_conversao?: number | null
          user_id: string
        }
        Update: {
          acos?: number | null
          acos_direto?: number | null
          classificacao?: string | null
          cliques?: number | null
          cliques_produto?: number | null
          conversoes?: number | null
          conversoes_diretas?: number | null
          created_at?: string | null
          ctr?: number | null
          custo_por_conversao?: number | null
          despesas?: number | null
          gmv?: number | null
          gmv_direto?: number | null
          id?: string
          importado_em?: string | null
          impressoes?: number | null
          impressoes_produto?: number | null
          itens_vendidos?: number | null
          itens_vendidos_diretos?: number | null
          margem_contribuicao?: number | null
          metodo_lance?: string | null
          nome_produto_csv?: string
          periodo_fim?: string | null
          periodo_inicio?: string | null
          posicao_importada?: boolean | null
          posicao_media?: number | null
          product_id?: string | null
          roas?: number | null
          roas_direto?: number | null
          roas_empate?: number | null
          shopee_product_id?: string | null
          status_anuncio?: string | null
          taxa_conversao?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ads_data_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      ads_reports: {
        Row: {
          ads_data: Json
          id: string
          imported_at: string
          product_id: string | null
          report_period: string | null
          shop_name: string | null
          store_id: string
          user_id: string
        }
        Insert: {
          ads_data?: Json
          id?: string
          imported_at?: string
          product_id?: string | null
          report_period?: string | null
          shop_name?: string | null
          store_id: string
          user_id: string
        }
        Update: {
          ads_data?: Json
          id?: string
          imported_at?: string
          product_id?: string | null
          report_period?: string | null
          shop_name?: string | null
          store_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ads_reports_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ads_reports_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      banners: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          id: string
          image_url: string
          link_destino: string | null
          ordem: number | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          image_url: string
          link_destino?: string | null
          ordem?: number | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          image_url?: string
          link_destino?: string | null
          ordem?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      education_content: {
        Row: {
          content_data: Json
          content_type: string
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          title: string
          updated_at: string
        }
        Insert: {
          content_data?: Json
          content_type: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          title: string
          updated_at?: string
        }
        Update: {
          content_data?: Json
          content_type?: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      estoque_movimentacoes: {
        Row: {
          created_at: string
          id: string
          motivo: string | null
          quantidade: number
          tipo: string
          user_id: string
          variacao_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          motivo?: string | null
          quantidade: number
          tipo: string
          user_id: string
          variacao_id: string
        }
        Update: {
          created_at?: string
          id?: string
          motivo?: string | null
          quantidade?: number
          tipo?: string
          user_id?: string
          variacao_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "estoque_movimentacoes_variacao_id_fkey"
            columns: ["variacao_id"]
            isOneToOne: false
            referencedRelation: "estoque_variacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      estoque_produtos: {
        Row: {
          categoria: string | null
          created_at: string
          descricao: string | null
          id: string
          image_url: string | null
          nome: string
          sku_base: string | null
          tem_variacoes: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          image_url?: string | null
          nome: string
          sku_base?: string | null
          tem_variacoes?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          categoria?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          image_url?: string | null
          nome?: string
          sku_base?: string | null
          tem_variacoes?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      estoque_variacoes: {
        Row: {
          atributos: Json
          created_at: string
          id: string
          preco_custo: number
          produto_id: string
          quantidade: number
          quantidade_minima: number
          sku: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          atributos?: Json
          created_at?: string
          id?: string
          preco_custo?: number
          produto_id: string
          quantidade?: number
          quantidade_minima?: number
          sku?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          atributos?: Json
          created_at?: string
          id?: string
          preco_custo?: number
          produto_id?: string
          quantidade?: number
          quantidade_minima?: number
          sku?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "estoque_variacoes_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "estoque_produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      home_banners: {
        Row: {
          bg_class: string | null
          created_at: string | null
          cta_label: string | null
          cta_url: string | null
          display_order: number | null
          emoji: string | null
          id: string
          is_active: boolean | null
          subtitle: string | null
          text_class: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          bg_class?: string | null
          created_at?: string | null
          cta_label?: string | null
          cta_url?: string | null
          display_order?: number | null
          emoji?: string | null
          id?: string
          is_active?: boolean | null
          subtitle?: string | null
          text_class?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          bg_class?: string | null
          created_at?: string | null
          cta_label?: string | null
          cta_url?: string | null
          display_order?: number | null
          emoji?: string | null
          id?: string
          is_active?: boolean | null
          subtitle?: string | null
          text_class?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      price_history: {
        Row: {
          cost_price: number
          id: string
          product_id: string
          recorded_at: string
          sale_price: number
          user_id: string
        }
        Insert: {
          cost_price: number
          id?: string
          product_id: string
          recorded_at?: string
          sale_price: number
          user_id: string
        }
        Update: {
          cost_price?: number
          id?: string
          product_id?: string
          recorded_at?: string
          sale_price?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_ads_metrics: {
        Row: {
          acos: number | null
          avg_position: number | null
          clicks: number | null
          conv_rate: number | null
          cost_per_conv: number | null
          created_at: string | null
          ctr: number | null
          direct_acos: number | null
          direct_roas: number | null
          gmv: number | null
          id: string
          imported_at: string | null
          impressions: number | null
          items_sold: number | null
          period_end: string
          period_start: string
          product_id: string | null
          roas: number | null
          shopee_product_id: string | null
          shopee_product_name: string | null
          spend: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          acos?: number | null
          avg_position?: number | null
          clicks?: number | null
          conv_rate?: number | null
          cost_per_conv?: number | null
          created_at?: string | null
          ctr?: number | null
          direct_acos?: number | null
          direct_roas?: number | null
          gmv?: number | null
          id?: string
          imported_at?: string | null
          impressions?: number | null
          items_sold?: number | null
          period_end: string
          period_start: string
          product_id?: string | null
          roas?: number | null
          shopee_product_id?: string | null
          shopee_product_name?: string | null
          spend?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          acos?: number | null
          avg_position?: number | null
          clicks?: number | null
          conv_rate?: number | null
          cost_per_conv?: number | null
          created_at?: string | null
          ctr?: number | null
          direct_acos?: number | null
          direct_roas?: number | null
          gmv?: number | null
          id?: string
          imported_at?: string | null
          impressions?: number | null
          items_sold?: number | null
          period_end?: string
          period_start?: string
          product_id?: string | null
          roas?: number | null
          shopee_product_id?: string | null
          shopee_product_name?: string | null
          spend?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_ads_metrics_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          ads_cost: number | null
          ads_revenue: number | null
          attributes: Json | null
          category: string | null
          cost_price: number
          created_at: string
          description: string | null
          has_variations: boolean | null
          id: string
          image_url: string | null
          min_stock_quantity: number | null
          name: string
          outros_canais: Json | null
          packaging_cost: number | null
          sale_price: number
          shopee_acelera: string | null
          shopee_product_id: string | null
          stock_quantity: number | null
          store_id: string
          updated_at: string
          user_id: string
          variations: Json | null
        }
        Insert: {
          ads_cost?: number | null
          ads_revenue?: number | null
          attributes?: Json | null
          category?: string | null
          cost_price: number
          created_at?: string
          description?: string | null
          has_variations?: boolean | null
          id?: string
          image_url?: string | null
          min_stock_quantity?: number | null
          name: string
          outros_canais?: Json | null
          packaging_cost?: number | null
          sale_price: number
          shopee_acelera?: string | null
          shopee_product_id?: string | null
          stock_quantity?: number | null
          store_id: string
          updated_at?: string
          user_id: string
          variations?: Json | null
        }
        Update: {
          ads_cost?: number | null
          ads_revenue?: number | null
          attributes?: Json | null
          category?: string | null
          cost_price?: number
          created_at?: string
          description?: string | null
          has_variations?: boolean | null
          id?: string
          image_url?: string | null
          min_stock_quantity?: number | null
          name?: string
          outros_canais?: Json | null
          packaging_cost?: number | null
          sale_price?: number
          shopee_acelera?: string | null
          shopee_product_id?: string | null
          stock_quantity?: number | null
          store_id?: string
          updated_at?: string
          user_id?: string
          variations?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          payment_email: string | null
          payment_status: string | null
          push_subscription: Json | null
          status: string | null
          termos_aceitos_em: string | null
          trial_fim: string | null
          trial_inicio: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          payment_email?: string | null
          payment_status?: string | null
          push_subscription?: Json | null
          status?: string | null
          termos_aceitos_em?: string | null
          trial_fim?: string | null
          trial_inicio?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          payment_email?: string | null
          payment_status?: string | null
          push_subscription?: Json | null
          status?: string | null
          termos_aceitos_em?: string | null
          trial_fim?: string | null
          trial_inicio?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      stores: {
        Row: {
          affiliate_commission: number | null
          created_at: string
          desired_margin: number | null
          enable_ads: boolean | null
          enable_affiliate_commission: boolean | null
          enable_packaging: boolean | null
          enable_shopee_campaigns: boolean | null
          has_over_450_orders: boolean | null
          id: string
          is_cpf_seller: boolean | null
          name: string
          shopee_acelera: string | null
          shopee_campaigns: number | null
          shopee_fee_fixed: number | null
          shopee_fee_percent: number | null
          taxes: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          affiliate_commission?: number | null
          created_at?: string
          desired_margin?: number | null
          enable_ads?: boolean | null
          enable_affiliate_commission?: boolean | null
          enable_packaging?: boolean | null
          enable_shopee_campaigns?: boolean | null
          has_over_450_orders?: boolean | null
          id?: string
          is_cpf_seller?: boolean | null
          name: string
          shopee_acelera?: string | null
          shopee_campaigns?: number | null
          shopee_fee_fixed?: number | null
          shopee_fee_percent?: number | null
          taxes?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          affiliate_commission?: number | null
          created_at?: string
          desired_margin?: number | null
          enable_ads?: boolean | null
          enable_affiliate_commission?: boolean | null
          enable_packaging?: boolean | null
          enable_shopee_campaigns?: boolean | null
          has_over_450_orders?: boolean | null
          id?: string
          is_cpf_seller?: boolean | null
          name?: string
          shopee_acelera?: string | null
          shopee_campaigns?: number | null
          shopee_fee_fixed?: number | null
          shopee_fee_percent?: number | null
          taxes?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cakto_order_id: string | null
          cakto_subscription_id: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          email: string
          id: string
          plan: string
          status: string
          trial_end: string | null
          trial_start: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cakto_order_id?: string | null
          cakto_subscription_id?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          email: string
          id?: string
          plan?: string
          status?: string
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cakto_order_id?: string | null
          cakto_subscription_id?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          email?: string
          id?: string
          plan?: string
          status?: string
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_own_profile_protected: {
        Args: never
        Returns: {
          payment_email: string
          payment_status: string
          status: string
          trial_fim: string
          trial_inicio: string
        }[]
      }
      has_active_subscription: { Args: never; Returns: boolean }
      has_role: {
        Args: { _role: Database["public"]["Enums"]["app_role"] }
        Returns: boolean
      }
      update_subscription_status: {
        Args: {
          p_payment_email?: string
          p_payment_status?: string
          p_status: string
          p_trial_fim?: string
          p_user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
