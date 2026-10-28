export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      bids: {
        Row: {
          amount: number
          bidder_id: string
          created_at: string
          id: string
          is_proxy_bid: boolean
          listing_id: string
          max_proxy_amount: number | null
        }
        Insert: {
          amount: number
          bidder_id: string
          created_at?: string
          id?: string
          is_proxy_bid?: boolean
          listing_id: string
          max_proxy_amount?: number | null
        }
        Update: {
          amount?: number
          bidder_id?: string
          created_at?: string
          id?: string
          is_proxy_bid?: boolean
          listing_id?: string
          max_proxy_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bids_bidder_id_fkey"
            columns: ["bidder_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bids_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          category: string
          condition: string
          created_at: string
          current_price: number
          description: string | null
          end_time: string
          handover_completed_at: string | null
          handover_location: string | null
          handover_status: string
          highest_bidder_id: string | null
          id: string
          images: string[]
          min_bid_increment: number
          reserve_price: number
          seller_id: string
          seller_notes: string | null
          start_time: string
          starting_price: number
          status: string
          title: string
          updated_at: string
          view_count: number
          winning_bid_id: string | null
        }
        Insert: {
          category: string
          condition?: string
          created_at?: string
          current_price: number
          description?: string | null
          end_time: string
          handover_completed_at?: string | null
          handover_location?: string | null
          handover_status?: string
          highest_bidder_id?: string | null
          id?: string
          images?: string[]
          min_bid_increment?: number
          reserve_price?: number
          seller_id: string
          seller_notes?: string | null
          start_time?: string
          starting_price: number
          status?: string
          title: string
          updated_at?: string
          view_count?: number
          winning_bid_id?: string | null
        }
        Update: {
          category?: string
          condition?: string
          created_at?: string
          current_price?: number
          description?: string | null
          end_time?: string
          handover_completed_at?: string | null
          handover_location?: string | null
          handover_status?: string
          highest_bidder_id?: string | null
          id?: string
          images?: string[]
          min_bid_increment?: number
          reserve_price?: number
          seller_id?: string
          seller_notes?: string | null
          start_time?: string
          starting_price?: number
          status?: string
          title?: string
          updated_at?: string
          view_count?: number
          winning_bid_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_listings_winning_bid"
            columns: ["winning_bid_id"]
            isOneToOne: false
            referencedRelation: "bids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_highest_bidder_id_fkey"
            columns: ["highest_bidder_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          listing_id: string | null
          message: string
          metadata: Json
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          listing_id?: string | null
          message: string
          metadata?: Json
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          listing_id?: string | null
          message?: string
          metadata?: Json
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          hostel_block: string | null
          id: string
          phone_number: string | null
          rating: number
          role: string
          room_number: string | null
          student_id: string | null
          total_ratings: number
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          hostel_block?: string | null
          id: string
          phone_number?: string | null
          rating?: number
          role?: string
          room_number?: string | null
          student_id?: string | null
          total_ratings?: number
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          hostel_block?: string | null
          id?: string
          phone_number?: string | null
          rating?: number
          role?: string
          room_number?: string | null
          student_id?: string | null
          total_ratings?: number
          updated_at?: string
        }
        Relationships: []
      }
      proxy_bids: {
        Row: {
          bidder_id: string
          created_at: string
          id: string
          is_active: boolean
          listing_id: string
          max_amount: number
          updated_at: string
        }
        Insert: {
          bidder_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          listing_id: string
          max_amount: number
          updated_at?: string
        }
        Update: {
          bidder_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          listing_id?: string
          max_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proxy_bids_bidder_id_fkey"
            columns: ["bidder_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proxy_bids_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          answer: string | null
          answered_at: string | null
          created_at: string
          id: string
          listing_id: string
          question: string
          updated_at: string
          user_id: string
        }
        Insert: {
          answer?: string | null
          answered_at?: string | null
          created_at?: string
          id?: string
          listing_id: string
          question: string
          updated_at?: string
          user_id: string
        }
        Update: {
          answer?: string | null
          answered_at?: string | null
          created_at?: string
          id?: string
          listing_id?: string
          question?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wishlist_alerts: {
        Row: {
          category: string | null
          created_at: string
          id: string
          is_active: boolean
          keyword: string | null
          max_price: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          keyword?: string | null
          max_price?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          keyword?: string | null
          max_price?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      complete_handover: {
        Args: { p_listing_id: string; p_user_id: string }
        Returns: Json
      }
      place_bid_atomic: {
        Args: {
          p_amount: number
          p_bidder_id: string
          p_listing_id: string
          p_max_proxy_amount?: number
        }
        Returns: Json
      }
      resolve_closing_auctions: { Args: never; Returns: Json }
      seller_resolve_auction: {
        Args: {
          p_approve: boolean
          p_handover_location?: string
          p_listing_id: string
          p_notes?: string
          p_seller_id: string
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
