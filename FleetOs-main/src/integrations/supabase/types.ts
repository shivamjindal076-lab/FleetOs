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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      "bookings table": {
        Row: {
          amount_collected: number | null
          country_code: string | null
          customer_name: string | null
          customer_phone: string | null
          driver_id: number | null
          driver_stay_required: boolean | null
          drop: string | null
          estimated_hours: number | null
          fare: number | null
          id: number
          notes: string | null
          number_of_days: number | null
          payment_confirmed_at: string | null
          payment_method: string | null
          pickup: string | null
          return_date: string | null
          scheduled_at: string
          source: string | null
          status: string | null
          stops: string | null
          trip_type: string | null
        }
        Insert: {
          amount_collected?: number | null
          country_code?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          driver_id?: number | null
          driver_stay_required?: boolean | null
          drop?: string | null
          estimated_hours?: number | null
          fare?: number | null
          id?: number
          notes?: string | null
          number_of_days?: number | null
          payment_confirmed_at?: string | null
          payment_method?: string | null
          pickup?: string | null
          return_date?: string | null
          scheduled_at?: string
          source?: string | null
          status?: string | null
          stops?: string | null
          trip_type?: string | null
        }
        Update: {
          amount_collected?: number | null
          country_code?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          driver_id?: number | null
          driver_stay_required?: boolean | null
          drop?: string | null
          estimated_hours?: number | null
          fare?: number | null
          id?: number
          notes?: string | null
          number_of_days?: number | null
          payment_confirmed_at?: string | null
          payment_method?: string | null
          pickup?: string | null
          return_date?: string | null
          scheduled_at?: string
          source?: string | null
          status?: string | null
          stops?: string | null
          trip_type?: string | null
        }
        Relationships: []
      }
      call_recordings: {
        Row: {
          called_at: string
          customer_phone: string | null
          driver_id: number | null
          duration_seconds: number | null
          id: number
          recording_url: string | null
          trip_id: number | null
        }
        Insert: {
          called_at?: string
          customer_phone?: string | null
          driver_id?: number | null
          duration_seconds?: number | null
          id?: number
          recording_url?: string | null
          trip_id?: number | null
        }
        Update: {
          called_at?: string
          customer_phone?: string | null
          driver_id?: number | null
          duration_seconds?: number | null
          id?: number
          recording_url?: string | null
          trip_id?: number | null
        }
        Relationships: []
      }
      Drivers: {
        Row: {
          created_at: string
          id: number
          location_lat: number | null
          location_lng: number | null
          name: string | null
          phone: string | null
          plate_number: string | null
          status: string | null
          vehicle_model: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          location_lat?: number | null
          location_lng?: number | null
          name?: string | null
          phone?: string | null
          plate_number?: string | null
          status?: string | null
          vehicle_model?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          location_lat?: number | null
          location_lng?: number | null
          name?: string | null
          phone?: string | null
          plate_number?: string | null
          status?: string | null
          vehicle_model?: string | null
        }
        Relationships: []
      }
      fixed_routes: {
        Row: {
          destination: string | null
          fixed_fare: number | null
          id: number
          origin: string | null
          per_km_rate: number | null
        }
        Insert: {
          destination?: string | null
          fixed_fare?: number | null
          id?: number
          origin?: string | null
          per_km_rate?: number | null
        }
        Update: {
          destination?: string | null
          fixed_fare?: number | null
          id?: number
          origin?: string | null
          per_km_rate?: number | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          country_code: string | null
          created_at: string
          customer_name: string | null
          customer_phone: string | null
          id: number
          query: string | null
          status: string | null
        }
        Insert: {
          country_code?: string | null
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          id?: number
          query?: string | null
          status?: string | null
        }
        Update: {
          country_code?: string | null
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          id?: number
          query?: string | null
          status?: string | null
        }
        Relationships: []
      }
      messages_log: {
        Row: {
          confidence: number | null
          created_at: string
          customer_phone: string | null
          escalated: boolean | null
          id: number
          intent: string | null
          message_in: string | null
          message_out: string | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          customer_phone?: string | null
          escalated?: boolean | null
          id?: number
          intent?: string | null
          message_in?: string | null
          message_out?: string | null
        }
        Update: {
          confidence?: number | null
          created_at?: string
          customer_phone?: string | null
          escalated?: boolean | null
          id?: number
          intent?: string | null
          message_in?: string | null
          message_out?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          booking_id: number | null
          comment: string | null
          created_at: string
          customer_phone: string | null
          id: number
          rating: number | null
        }
        Insert: {
          booking_id?: number | null
          comment?: string | null
          created_at?: string
          customer_phone?: string | null
          id?: number
          rating?: number | null
        }
        Update: {
          booking_id?: number | null
          comment?: string | null
          created_at?: string
          customer_phone?: string | null
          id?: number
          rating?: number | null
        }
        Relationships: []
      }
      trips: {
        Row: {
          booking_id: number | null
          created_at: string
          driver_id: number | null
          drop_lat: number | null
          drop_lng: number | null
          end_time: string | null
          id: number
          start_time: string | null
        }
        Insert: {
          booking_id?: number | null
          created_at?: string
          driver_id?: number | null
          drop_lat?: number | null
          drop_lng?: number | null
          end_time?: string | null
          id?: number
          start_time?: string | null
        }
        Update: {
          booking_id?: number | null
          created_at?: string
          driver_id?: number | null
          drop_lat?: number | null
          drop_lng?: number | null
          end_time?: string | null
          id?: number
          start_time?: string | null
        }
        Relationships: []
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
    }
    Views: {
      drivers_public: {
        Row: {
          id: number | null
          name: string | null
          status: string | null
          vehicle_model: string | null
        }
        Insert: {
          id?: number | null
          name?: string | null
          status?: string | null
          vehicle_model?: string | null
        }
        Update: {
          id?: number | null
          name?: string | null
          status?: string | null
          vehicle_model?: string | null
        }
        Relationships: []
      }
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
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
