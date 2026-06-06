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
      booked_seats: {
        Row: {
          booking_id: string
          created_at: string
          departure_id: string | null
          departure_time: string
          id: string
          route_id: string
          seat_number: number
          travel_date: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          departure_id?: string | null
          departure_time: string
          id?: string
          route_id: string
          seat_number: number
          travel_date: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          departure_id?: string | null
          departure_time?: string
          id?: string
          route_id?: string
          seat_number?: number
          travel_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "booked_seats_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booked_seats_departure_id_fkey"
            columns: ["departure_id"]
            isOneToOne: false
            referencedRelation: "departures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booked_seats_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          booking_reference: string
          created_at: string | null
          departure_id: string | null
          departure_time: string
          driver_amount: number | null
          id: string
          next_of_kin_name: string | null
          next_of_kin_phone: string | null
          number_of_seats: number
          passenger_email: string
          passenger_name: string
          passenger_phone: string
          payment_status: string
          platform_commission: number | null
          route_id: string
          total_amount: number
          travel_date: string
        }
        Insert: {
          booking_reference: string
          created_at?: string | null
          departure_id?: string | null
          departure_time: string
          driver_amount?: number | null
          id?: string
          next_of_kin_name?: string | null
          next_of_kin_phone?: string | null
          number_of_seats: number
          passenger_email: string
          passenger_name: string
          passenger_phone: string
          payment_status?: string
          platform_commission?: number | null
          route_id: string
          total_amount: number
          travel_date: string
        }
        Update: {
          booking_reference?: string
          created_at?: string | null
          departure_id?: string | null
          departure_time?: string
          driver_amount?: number | null
          id?: string
          next_of_kin_name?: string | null
          next_of_kin_phone?: string | null
          number_of_seats?: number
          passenger_email?: string
          passenger_name?: string
          passenger_phone?: string
          payment_status?: string
          platform_commission?: number | null
          route_id?: string
          total_amount?: number
          travel_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_departure_id_fkey"
            columns: ["departure_id"]
            isOneToOne: false
            referencedRelation: "departures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      departures: {
        Row: {
          commission_amount: number
          created_at: string
          departure_time: string
          driver_id: string
          id: string
          park_id: string
          price: number
          route_id: string
          status: string
          total_seats: number
          travel_date: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          commission_amount?: number
          created_at?: string
          departure_time: string
          driver_id: string
          id?: string
          park_id: string
          price: number
          route_id: string
          status?: string
          total_seats: number
          travel_date: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          commission_amount?: number
          created_at?: string
          departure_time?: string
          driver_id?: string
          id?: string
          park_id?: string
          price?: number
          route_id?: string
          status?: string
          total_seats?: number
          travel_date?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "departures_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departures_park_id_fkey"
            columns: ["park_id"]
            isOneToOne: false
            referencedRelation: "parks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departures_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departures_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_applications: {
        Row: {
          address: string
          admin_notes: string | null
          bank_account_name: string
          bank_account_number: string
          bank_name: string
          city: string
          created_at: string
          drivers_license_url: string | null
          email: string | null
          full_name: string
          guarantor_address: string | null
          guarantor_name: string
          guarantor_phone: string
          guarantor_relationship: string | null
          id: string
          nin_url: string | null
          passport_photo_url: string | null
          phone: string
          roadworthiness_url: string | null
          state: string
          status: Database["public"]["Enums"]["driver_application_status"]
          updated_at: string
          vehicle_details: string | null
          vehicle_ownership: Database["public"]["Enums"]["vehicle_ownership_type"]
          vehicle_papers_url: string | null
          years_experience: number
        }
        Insert: {
          address: string
          admin_notes?: string | null
          bank_account_name: string
          bank_account_number: string
          bank_name: string
          city: string
          created_at?: string
          drivers_license_url?: string | null
          email?: string | null
          full_name: string
          guarantor_address?: string | null
          guarantor_name: string
          guarantor_phone: string
          guarantor_relationship?: string | null
          id?: string
          nin_url?: string | null
          passport_photo_url?: string | null
          phone: string
          roadworthiness_url?: string | null
          state: string
          status?: Database["public"]["Enums"]["driver_application_status"]
          updated_at?: string
          vehicle_details?: string | null
          vehicle_ownership: Database["public"]["Enums"]["vehicle_ownership_type"]
          vehicle_papers_url?: string | null
          years_experience?: number
        }
        Update: {
          address?: string
          admin_notes?: string | null
          bank_account_name?: string
          bank_account_number?: string
          bank_name?: string
          city?: string
          created_at?: string
          drivers_license_url?: string | null
          email?: string | null
          full_name?: string
          guarantor_address?: string | null
          guarantor_name?: string
          guarantor_phone?: string
          guarantor_relationship?: string | null
          id?: string
          nin_url?: string | null
          passport_photo_url?: string | null
          phone?: string
          roadworthiness_url?: string | null
          state?: string
          status?: Database["public"]["Enums"]["driver_application_status"]
          updated_at?: string
          vehicle_details?: string | null
          vehicle_ownership?: Database["public"]["Enums"]["vehicle_ownership_type"]
          vehicle_papers_url?: string | null
          years_experience?: number
        }
        Relationships: []
      }
      driver_earnings: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          driver_id: string
          id: string
          paid: boolean | null
          paid_at: string | null
          trip_id: string | null
          type: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          driver_id: string
          id?: string
          paid?: boolean | null
          paid_at?: string | null
          trip_id?: string | null
          type?: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          driver_id?: string
          id?: string
          paid?: boolean | null
          paid_at?: string | null
          trip_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_earnings_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_earnings_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "driver_trips"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_notifications: {
        Row: {
          created_at: string
          driver_id: string | null
          id: string
          message: string
          read: boolean | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          driver_id?: string | null
          id?: string
          message: string
          read?: boolean | null
          title: string
          type?: string
        }
        Update: {
          created_at?: string
          driver_id?: string | null
          id?: string
          message?: string
          read?: boolean | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_notifications_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_trips: {
        Row: {
          accepted_at: string | null
          completed_at: string | null
          created_at: string
          departure_time: string
          driver_id: string
          earnings: number | null
          id: string
          route_id: string
          status: string
          trip_date: string
        }
        Insert: {
          accepted_at?: string | null
          completed_at?: string | null
          created_at?: string
          departure_time: string
          driver_id: string
          earnings?: number | null
          id?: string
          route_id: string
          status?: string
          trip_date: string
        }
        Update: {
          accepted_at?: string | null
          completed_at?: string | null
          created_at?: string
          departure_time?: string
          driver_id?: string
          earnings?: number | null
          id?: string
          route_id?: string
          status?: string
          trip_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_trips_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_trips_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          application_id: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          phone: string
          profile_photo_url: string | null
          rating: number | null
          status: string
          total_trips: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          application_id?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          phone: string
          profile_photo_url?: string | null
          rating?: number | null
          status?: string
          total_trips?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          application_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string
          profile_photo_url?: string | null
          rating?: number | null
          status?: string
          total_trips?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drivers_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "driver_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      parks: {
        Row: {
          address: string | null
          city: string
          contact_phone: string | null
          created_at: string
          id: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          city: string
          contact_phone?: string | null
          created_at?: string
          id?: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string
          contact_phone?: string | null
          created_at?: string
          id?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          created_at: string
          default_commission_amount: number
          id: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_commission_amount?: number
          id?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_commission_amount?: number
          id?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      routes: {
        Row: {
          created_at: string | null
          destination: string
          id: string
          origin: string
          price: number
        }
        Insert: {
          created_at?: string | null
          destination: string
          id?: string
          origin: string
          price: number
        }
        Update: {
          created_at?: string | null
          destination?: string
          id?: string
          origin?: string
          price?: number
        }
        Relationships: []
      }
      seat_holds: {
        Row: {
          created_at: string
          departure_id: string
          expires_at: string
          id: string
          seat_number: number
          session_id: string
        }
        Insert: {
          created_at?: string
          departure_id: string
          expires_at?: string
          id?: string
          seat_number: number
          session_id: string
        }
        Update: {
          created_at?: string
          departure_id?: string
          expires_at?: string
          id?: string
          seat_number?: number
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seat_holds_departure_id_fkey"
            columns: ["departure_id"]
            isOneToOne: false
            referencedRelation: "departures"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          capacity: number
          color: string | null
          created_at: string
          driver_id: string
          id: string
          plate_number: string
          status: string
          updated_at: string
          vehicle_type: string
          year: number | null
        }
        Insert: {
          capacity: number
          color?: string | null
          created_at?: string
          driver_id: string
          id?: string
          plate_number: string
          status?: string
          updated_at?: string
          vehicle_type: string
          year?: number | null
        }
        Update: {
          capacity?: number
          color?: string | null
          created_at?: string
          driver_id?: string
          id?: string
          plate_number?: string
          status?: string
          updated_at?: string
          vehicle_type?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_transactions: {
        Row: {
          amount: number
          booking_reference: string | null
          created_at: string
          description: string | null
          id: string
          type: string
          wallet_id: string
        }
        Insert: {
          amount: number
          booking_reference?: string | null
          created_at?: string
          description?: string | null
          id?: string
          type: string
          wallet_id: string
        }
        Update: {
          amount?: number
          booking_reference?: string | null
          created_at?: string
          description?: string | null
          id?: string
          type?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance: number
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      available_seats_view: {
        Row: {
          departure_time: string | null
          route_id: string | null
          seat_number: number | null
          travel_date: string | null
        }
        Insert: {
          departure_time?: string | null
          route_id?: string | null
          seat_number?: number | null
          travel_date?: string | null
        }
        Update: {
          departure_time?: string | null
          route_id?: string | null
          seat_number?: number | null
          travel_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booked_seats_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      departure_taken_seats: {
        Row: {
          departure_id: string | null
          seat_number: number | null
          source: string | null
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
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user" | "driver"
      driver_application_status:
        | "pending"
        | "approved"
        | "rejected"
        | "suspended"
      vehicle_ownership_type: "own_sienna" | "own_sharon" | "partnership"
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
      app_role: ["admin", "user", "driver"],
      driver_application_status: [
        "pending",
        "approved",
        "rejected",
        "suspended",
      ],
      vehicle_ownership_type: ["own_sienna", "own_sharon", "partnership"],
    },
  },
} as const
