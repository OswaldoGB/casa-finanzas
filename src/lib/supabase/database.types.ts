// Temporal: reemplazar con `npm run db:types` una vez enlazado el proyecto de Supabase.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Timestamps = { created_at: string; updated_at: string };

export type Database = {
  public: {
    Tables: {
      households: {
        Row: { id: string; name: string; currency: string; timezone: string } & Timestamps;
        Insert: { id?: string; name: string; currency?: string; timezone?: string } & Partial<Timestamps>;
        Update: Partial<{ name: string; currency: string; timezone: string }>;
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          household_id: string;
          full_name: string;
          avatar_url: string | null;
          role: Database["public"]["Enums"]["app_role"];
        } & Timestamps;
        Insert: {
          id: string;
          household_id: string;
          full_name: string;
          avatar_url?: string | null;
          role?: Database["public"]["Enums"]["app_role"];
        } & Partial<Timestamps>;
        Update: Partial<{ full_name: string; avatar_url: string | null }>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      current_household_id: { Args: Record<string, never>; Returns: string };
      is_admin: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: { app_role: "admin" | "member" };
    CompositeTypes: { [_ in never]: never };
  };
};
