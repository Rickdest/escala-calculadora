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
      products: {
        Row: {
          ads_cost: number | null
          ads_revenue: number | null
          cost_price: number
          created_at: string
          has_variations: boolean | null
          id: string
          image_url: string | null
          name: string
          packaging_cost: number | null
          sale_price: number
          shopee_acelera: string | null
          stock_quantity: number | null
          store_id: string
          updated_at: string
          user_id: string
          variations: Json | null
        }
        Insert: {
          ads_cost?: number | null
          ads_revenue?: number | null
          cost_price: number
          created_at?: string
          has_variations?: boolean | null
          id?: string
          image_url?: string | null
          name: string
          packaging_cost?: number | null
          sale_price: number
          shopee_acelera?: string | null
          stock_quantity?: number | null
          store_id: string
          updated_at?: string
          user_id: string
          variations?: Json | null
        }
        Update: {
          ads_cost?: number | null
          ads_revenue?: number | null
          cost_price?: number
          created_at?: string
          has_variations?: boolean | null
          id?: string
          image_url?: string | null
          name?: string
          packaging_cost?: number | null
          sale_price?: number
          shopee_acelera?: string | null
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
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
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
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          email: string
          hotmart_subscription_id: string | null
          hotmart_transaction_id: string | null
          id: string
          plan: string
          status: string
          trial_end: string | null
          trial_start: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          email: string
          hotmart_subscription_id?: string | null
          hotmart_transaction_id?: string | null
          id?: string
          plan?: string
          status?: string
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          email?: string
          hotmart_subscription_id?: string | null
          hotmart_transaction_id?: string | null
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
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
