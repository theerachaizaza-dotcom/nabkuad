export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          role: 'admin' | 'staff';
          location_id: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          role?: 'admin' | 'staff';
          location_id?: string | null;
          created_at?: string;
        };
        Update: {
          full_name?: string | null;
          role?: 'admin' | 'staff';
          location_id?: string | null;
          created_at?: string;
        };
      };
      categories: {
        Row: {
          id: string;
          name: string;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      locations: {
        Row: {
          id: string;
          name: string;
          code: string | null;
          sort_order: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          code?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          name?: string;
          code?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
      };
      products: {
        Row: {
          id: string;
          category_id: string | null;
          name: string;
          sku: string | null;
          capacity_ml: number;
          count_mode: 'fractional' | 'unit';
          units_per_pack: number | null;
          price_per_unit: string | null;
          unit: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          category_id?: string | null;
          name: string;
          sku?: string | null;
          capacity_ml: number;
          count_mode?: 'fractional' | 'unit';
          units_per_pack?: number | null;
          price_per_unit?: string | null;
          unit?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          category_id?: string | null;
          name?: string;
          sku?: string | null;
          capacity_ml?: number;
          count_mode?: 'fractional' | 'unit';
          units_per_pack?: number | null;
          price_per_unit?: string | null;
          unit?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      count_sessions: {
        Row: {
          id: string;
          name: string;
          count_date: string;
          status: 'open' | 'closed';
          note: string | null;
          created_by: string | null;
          created_at: string;
          closed_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          count_date?: string;
          status?: 'open' | 'closed';
          note?: string | null;
          created_by?: string | null;
          created_at?: string;
          closed_at?: string | null;
        };
        Update: {
          name?: string;
          count_date?: string;
          status?: 'open' | 'closed';
          note?: string | null;
          created_by?: string | null;
          created_at?: string;
          closed_at?: string | null;
        };
      };
      location_submissions: {
        Row: {
          id: string;
          session_id: string;
          location_id: string;
          status: 'pending' | 'submitted';
          submitted_at: string | null;
          submitted_by: string | null;
        };
        Insert: {
          id?: string;
          session_id: string;
          location_id: string;
          status?: 'pending' | 'submitted';
          submitted_at?: string | null;
          submitted_by?: string | null;
        };
        Update: {
          session_id?: string;
          location_id?: string;
          status?: 'pending' | 'submitted';
          submitted_at?: string | null;
          submitted_by?: string | null;
        };
      };
      count_lines: {
        Row: {
          id: string;
          session_id: string;
          location_id: string;
          product_id: string;
          full_bottles: number;
          leftover_ml: number;
          capacity_ml_snapshot: number;
          net_bottles: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          location_id: string;
          product_id: string;
          full_bottles?: number;
          leftover_ml?: number;
          capacity_ml_snapshot: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          session_id?: string;
          location_id?: string;
          product_id?: string;
          full_bottles?: number;
          leftover_ml?: number;
          capacity_ml_snapshot?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
