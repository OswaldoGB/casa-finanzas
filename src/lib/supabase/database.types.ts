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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          color: string
          created_at: string
          created_by: string
          credit_limit: number | null
          household_id: string
          icon: string
          id: string
          is_archived: boolean
          name: string
          opening_balance: number
          payment_due_day: number | null
          statement_closing_day: number | null
          type: Database["public"]["Enums"]["account_type"]
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          created_by: string
          credit_limit?: number | null
          household_id: string
          icon?: string
          id?: string
          is_archived?: boolean
          name: string
          opening_balance?: number
          payment_due_day?: number | null
          statement_closing_day?: number | null
          type: Database["public"]["Enums"]["account_type"]
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          created_by?: string
          credit_limit?: number | null
          household_id?: string
          icon?: string
          id?: string
          is_archived?: boolean
          name?: string
          opening_balance?: number
          payment_due_day?: number | null
          statement_closing_day?: number | null
          type?: Database["public"]["Enums"]["account_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_created_by_household_id_fkey"
            columns: ["created_by", "household_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "accounts_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      attachments: {
        Row: {
          created_at: string
          created_by: string
          household_id: string
          id: string
          mime_type: string
          size_bytes: number
          storage_path: string
          transaction_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          household_id: string
          id?: string
          mime_type: string
          size_bytes: number
          storage_path: string
          transaction_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          household_id?: string
          id?: string
          mime_type?: string
          size_bytes?: number
          storage_path?: string
          transaction_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachments_created_by_household_id_fkey"
            columns: ["created_by", "household_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "attachments_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_transaction_id_household_id_fkey"
            columns: ["transaction_id", "household_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id", "household_id"]
          },
        ]
      }
      budgets: {
        Row: {
          amount: number
          carry_over: boolean
          category_id: string
          created_at: string
          created_by: string
          household_id: string
          id: string
          month: string
          updated_at: string
        }
        Insert: {
          amount: number
          carry_over?: boolean
          category_id: string
          created_at?: string
          created_by: string
          household_id: string
          id?: string
          month: string
          updated_at?: string
        }
        Update: {
          amount?: number
          carry_over?: boolean
          category_id?: string
          created_at?: string
          created_by?: string
          household_id?: string
          id?: string
          month?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_category_id_household_id_fkey"
            columns: ["category_id", "household_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "budgets_created_by_household_id_fkey"
            columns: ["created_by", "household_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "budgets_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string
          created_at: string
          created_by: string
          household_id: string
          icon: string
          id: string
          is_archived: boolean
          name: string
          parent_id: string | null
          sort_order: number
          type: Database["public"]["Enums"]["category_type"]
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          created_by: string
          household_id: string
          icon?: string
          id?: string
          is_archived?: boolean
          name: string
          parent_id?: string | null
          sort_order?: number
          type: Database["public"]["Enums"]["category_type"]
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          created_by?: string
          household_id?: string
          icon?: string
          id?: string
          is_archived?: boolean
          name?: string
          parent_id?: string | null
          sort_order?: number
          type?: Database["public"]["Enums"]["category_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_created_by_household_id_fkey"
            columns: ["created_by", "household_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "categories_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_parent_id_household_id_fkey"
            columns: ["parent_id", "household_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id", "household_id"]
          },
        ]
      }
      households: {
        Row: {
          created_at: string
          currency: string
          id: string
          name: string
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          name: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          name?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      module_permissions: {
        Row: {
          created_at: string
          created_by: string
          household_id: string
          level: Database["public"]["Enums"]["permission_level"]
          module: Database["public"]["Enums"]["module_name"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          household_id: string
          level?: Database["public"]["Enums"]["permission_level"]
          module: Database["public"]["Enums"]["module_name"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          household_id?: string
          level?: Database["public"]["Enums"]["permission_level"]
          module?: Database["public"]["Enums"]["module_name"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_permissions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_permissions_user_id_household_id_fkey"
            columns: ["user_id", "household_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "household_id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          account_id: string | null
          created_at: string
          created_by: string
          household_id: string
          id: string
          is_archived: boolean
          name: string
          type: Database["public"]["Enums"]["payment_method_type"]
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          created_by: string
          household_id: string
          id?: string
          is_archived?: boolean
          name: string
          type: Database["public"]["Enums"]["payment_method_type"]
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          created_at?: string
          created_by?: string
          household_id?: string
          id?: string
          is_archived?: boolean
          name?: string
          type?: Database["public"]["Enums"]["payment_method_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_account_id_household_id_fkey"
            columns: ["account_id", "household_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "payment_methods_created_by_household_id_fkey"
            columns: ["created_by", "household_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "payment_methods_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          household_id: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name: string
          household_id: string
          id: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          household_id?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_rules: {
        Row: {
          account_id: string | null
          amount: number
          category_id: string | null
          created_at: string
          created_by: string
          description: string
          destination_account_id: string | null
          end_date: string | null
          frequency: Database["public"]["Enums"]["recurring_frequency"]
          household_id: string
          id: string
          interval_count: number
          is_active: boolean
          loan_id: string | null
          mode: Database["public"]["Enums"]["recurring_mode"]
          name: string
          next_run_date: string
          notes: string | null
          payment_method_id: string | null
          project_id: string | null
          savings_goal_id: string | null
          start_date: string
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          category_id?: string | null
          created_at?: string
          created_by: string
          description?: string
          destination_account_id?: string | null
          end_date?: string | null
          frequency: Database["public"]["Enums"]["recurring_frequency"]
          household_id: string
          id?: string
          interval_count?: number
          is_active?: boolean
          loan_id?: string | null
          mode?: Database["public"]["Enums"]["recurring_mode"]
          name: string
          next_run_date: string
          notes?: string | null
          payment_method_id?: string | null
          project_id?: string | null
          savings_goal_id?: string | null
          start_date: string
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          category_id?: string | null
          created_at?: string
          created_by?: string
          description?: string
          destination_account_id?: string | null
          end_date?: string | null
          frequency?: Database["public"]["Enums"]["recurring_frequency"]
          household_id?: string
          id?: string
          interval_count?: number
          is_active?: boolean
          loan_id?: string | null
          mode?: Database["public"]["Enums"]["recurring_mode"]
          name?: string
          next_run_date?: string
          notes?: string | null
          payment_method_id?: string | null
          project_id?: string | null
          savings_goal_id?: string | null
          start_date?: string
          type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_rules_account_id_household_id_fkey"
            columns: ["account_id", "household_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "recurring_rules_category_id_household_id_fkey"
            columns: ["category_id", "household_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "recurring_rules_created_by_household_id_fkey"
            columns: ["created_by", "household_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "recurring_rules_destination_account_id_household_id_fkey"
            columns: ["destination_account_id", "household_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "recurring_rules_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_rules_payment_method_id_household_id_fkey"
            columns: ["payment_method_id", "household_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id", "household_id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string | null
          amount: number
          category_id: string | null
          created_at: string
          created_by: string
          date: string
          description: string
          destination_account_id: string | null
          household_id: string
          id: string
          loan_id: string | null
          notes: string | null
          payment_method_id: string | null
          project_id: string | null
          recurring_rule_id: string | null
          savings_goal_id: string | null
          status: Database["public"]["Enums"]["transaction_status"]
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          category_id?: string | null
          created_at?: string
          created_by: string
          date: string
          description?: string
          destination_account_id?: string | null
          household_id: string
          id?: string
          loan_id?: string | null
          notes?: string | null
          payment_method_id?: string | null
          project_id?: string | null
          recurring_rule_id?: string | null
          savings_goal_id?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          category_id?: string | null
          created_at?: string
          created_by?: string
          date?: string
          description?: string
          destination_account_id?: string | null
          household_id?: string
          id?: string
          loan_id?: string | null
          notes?: string | null
          payment_method_id?: string | null
          project_id?: string | null
          recurring_rule_id?: string | null
          savings_goal_id?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_household_id_fkey"
            columns: ["account_id", "household_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "transactions_category_id_household_id_fkey"
            columns: ["category_id", "household_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "transactions_created_by_household_id_fkey"
            columns: ["created_by", "household_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "transactions_destination_account_id_household_id_fkey"
            columns: ["destination_account_id", "household_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "transactions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_payment_method_id_household_id_fkey"
            columns: ["payment_method_id", "household_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "transactions_recurring_rule_id_household_id_fkey"
            columns: ["recurring_rule_id", "household_id"]
            isOneToOne: false
            referencedRelation: "recurring_rules"
            referencedColumns: ["id", "household_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      account_balance_on: {
        Args: { p_account_id: string; p_date: string }
        Returns: number
      }
      account_balances: {
        Args: never
        Returns: {
          account_id: string
          balance: number
        }[]
      }
      analytics_snapshot: {
        Args: {
          p_from: string
          p_module: Database["public"]["Enums"]["module_name"]
          p_to: string
        }
        Returns: Json
      }
      budget_snapshot: {
        Args: {
          p_module?: Database["public"]["Enums"]["module_name"]
          p_month: string
        }
        Returns: Json
      }
      can_read_accounts: { Args: never; Returns: boolean }
      can_read_categories: { Args: never; Returns: boolean }
      can_read_payment_methods: { Args: never; Returns: boolean }
      card_statement_unpaid: {
        Args: { p_account_id: string; p_close: string; p_today: string }
        Returns: number
      }
      copy_previous_budgets: { Args: { p_month: string }; Returns: number }
      current_household_id: { Args: never; Returns: string }
      has_module_access: {
        Args: {
          requested_module: Database["public"]["Enums"]["module_name"]
          required_level: Database["public"]["Enums"]["permission_level"]
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      next_occurrence_date: {
        Args: {
          p_anchor: string
          p_current: string
          p_frequency: Database["public"]["Enums"]["recurring_frequency"]
          p_interval: number
        }
        Returns: string
      }
      projection_inputs: { Args: { p_months?: number }; Returns: Json }
    }
    Enums: {
      account_type:
        | "cash"
        | "checking"
        | "savings"
        | "credit_card"
        | "investment"
        | "other"
      app_role: "admin" | "member"
      category_type: "income" | "expense"
      module_name:
        | "dashboard"
        | "accounts"
        | "transactions"
        | "budgets"
        | "projections"
        | "reports"
        | "inventory"
        | "shopping"
        | "shopping_lists"
        | "projects"
        | "loans"
        | "savings"
      payment_method_type: "cash" | "debit" | "credit" | "transfer" | "other"
      permission_level: "none" | "view" | "edit"
      recurring_frequency: "weekly" | "biweekly" | "monthly" | "yearly"
      recurring_mode: "auto" | "confirm"
      transaction_status: "pending" | "posted"
      transaction_type:
        | "income"
        | "expense"
        | "transfer"
        | "loan_out"
        | "loan_repayment"
        | "goal_contribution"
        | "goal_withdrawal"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      account_type: [
        "cash",
        "checking",
        "savings",
        "credit_card",
        "investment",
        "other",
      ],
      app_role: ["admin", "member"],
      category_type: ["income", "expense"],
      module_name: [
        "dashboard",
        "accounts",
        "transactions",
        "budgets",
        "projections",
        "reports",
        "inventory",
        "shopping",
        "shopping_lists",
        "projects",
        "loans",
        "savings",
      ],
      payment_method_type: ["cash", "debit", "credit", "transfer", "other"],
      permission_level: ["none", "view", "edit"],
      recurring_frequency: ["weekly", "biweekly", "monthly", "yearly"],
      recurring_mode: ["auto", "confirm"],
      transaction_status: ["pending", "posted"],
      transaction_type: [
        "income",
        "expense",
        "transfer",
        "loan_out",
        "loan_repayment",
        "goal_contribution",
        "goal_withdrawal",
      ],
    },
  },
} as const
