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
      applications: {
        Row: {
          artist_id: string
          availability_end_date: string | null
          availability_preference:
            | Database["public"]["Enums"]["availability_preference"]
            | null
          availability_specific_dates: string[] | null
          availability_start_date: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          lineup_preference:
            | Database["public"]["Enums"]["lineup_preference"]
            | null
          message: string | null
          payment_preference:
            | Database["public"]["Enums"]["payment_preference"]
            | null
          status: Database["public"]["Enums"]["application_status"] | null
          updated_at: string | null
          venue_listing_id: string
        }
        Insert: {
          artist_id: string
          availability_end_date?: string | null
          availability_preference?:
            | Database["public"]["Enums"]["availability_preference"]
            | null
          availability_specific_dates?: string[] | null
          availability_start_date?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          lineup_preference?:
            | Database["public"]["Enums"]["lineup_preference"]
            | null
          message?: string | null
          payment_preference?:
            | Database["public"]["Enums"]["payment_preference"]
            | null
          status?: Database["public"]["Enums"]["application_status"] | null
          updated_at?: string | null
          venue_listing_id: string
        }
        Update: {
          artist_id?: string
          availability_end_date?: string | null
          availability_preference?:
            | Database["public"]["Enums"]["availability_preference"]
            | null
          availability_specific_dates?: string[] | null
          availability_start_date?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          lineup_preference?:
            | Database["public"]["Enums"]["lineup_preference"]
            | null
          message?: string | null
          payment_preference?:
            | Database["public"]["Enums"]["payment_preference"]
            | null
          status?: Database["public"]["Enums"]["application_status"] | null
          updated_at?: string | null
          venue_listing_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_venue_listing_id_fkey"
            columns: ["venue_listing_id"]
            isOneToOne: false
            referencedRelation: "venue_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_favorites: {
        Row: {
          artist_id: string
          created_at: string
          id: string
          venue_listing_id: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          id?: string
          venue_listing_id: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          id?: string
          venue_listing_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "artist_favorites_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artist_favorites_venue_listing_id_fkey"
            columns: ["venue_listing_id"]
            isOneToOne: false
            referencedRelation: "venue_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_profiles: {
        Row: {
          apple_music_link: string | null
          band_name: string | null
          bandsintown_link: string | null
          bio: string | null
          created_at: string | null
          facebook_link: string | null
          featured_samples: string[] | null
          genre: string | null
          id: string
          instagram_link: string | null
          location: string | null
          past_gigs: string[] | null
          pictures: string[] | null
          press_links: string[] | null
          soundcloud_link: string | null
          spotify_link: string | null
          tiktok_link: string | null
          updated_at: string | null
          user_id: string
          youtube_link: string | null
        }
        Insert: {
          apple_music_link?: string | null
          band_name?: string | null
          bandsintown_link?: string | null
          bio?: string | null
          created_at?: string | null
          facebook_link?: string | null
          featured_samples?: string[] | null
          genre?: string | null
          id?: string
          instagram_link?: string | null
          location?: string | null
          past_gigs?: string[] | null
          pictures?: string[] | null
          press_links?: string[] | null
          soundcloud_link?: string | null
          spotify_link?: string | null
          tiktok_link?: string | null
          updated_at?: string | null
          user_id: string
          youtube_link?: string | null
        }
        Update: {
          apple_music_link?: string | null
          band_name?: string | null
          bandsintown_link?: string | null
          bio?: string | null
          created_at?: string | null
          facebook_link?: string | null
          featured_samples?: string[] | null
          genre?: string | null
          id?: string
          instagram_link?: string | null
          location?: string | null
          past_gigs?: string[] | null
          pictures?: string[] | null
          press_links?: string[] | null
          soundcloud_link?: string | null
          spotify_link?: string | null
          tiktok_link?: string | null
          updated_at?: string | null
          user_id?: string
          youtube_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "artist_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gig_listings: {
        Row: {
          application_id: string | null
          artist_id: string
          created_at: string
          gig_date: string
          hold_priority: number | null
          id: string
          is_confirmed: boolean
          manual_artist_name: string | null
          manual_location: string | null
          manual_venue_name: string | null
          notes: string | null
          openers: Json | null
          show_time: string | null
          updated_at: string
          venue_listing_id: string
        }
        Insert: {
          application_id?: string | null
          artist_id: string
          created_at?: string
          gig_date: string
          hold_priority?: number | null
          id?: string
          is_confirmed?: boolean
          manual_artist_name?: string | null
          manual_location?: string | null
          manual_venue_name?: string | null
          notes?: string | null
          openers?: Json | null
          show_time?: string | null
          updated_at?: string
          venue_listing_id: string
        }
        Update: {
          application_id?: string | null
          artist_id?: string
          created_at?: string
          gig_date?: string
          hold_priority?: number | null
          id?: string
          is_confirmed?: boolean
          manual_artist_name?: string | null
          manual_location?: string | null
          manual_venue_name?: string | null
          notes?: string | null
          openers?: Json | null
          show_time?: string | null
          updated_at?: string
          venue_listing_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gig_listings_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachments: Json | null
          content: string
          created_at: string | null
          id: string
          is_read: boolean | null
          is_starred: boolean | null
          receiver_id: string
          sender_id: string
          subject: string | null
          thread_id: string
        }
        Insert: {
          attachments?: Json | null
          content: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          is_starred?: boolean | null
          receiver_id: string
          sender_id: string
          subject?: string | null
          thread_id: string
        }
        Update: {
          attachments?: Json | null
          content?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          is_starred?: boolean | null
          receiver_id?: string
          sender_id?: string
          subject?: string | null
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          first_name: string
          id: string
          last_name: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          first_name: string
          id: string
          last_name: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Relationships: []
      }
      venue_application_favorites: {
        Row: {
          application_id: string
          created_at: string
          id: string
          venue_user_id: string
        }
        Insert: {
          application_id: string
          created_at?: string
          id?: string
          venue_user_id: string
        }
        Update: {
          application_id?: string
          created_at?: string
          id?: string
          venue_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_application_favorites_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_application_favorites_venue_user_id_fkey"
            columns: ["venue_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_listings: {
        Row: {
          backline_info: string | null
          bio: string | null
          capacity: number | null
          created_at: string | null
          genres: string[] | null
          house_rules: string | null
          id: string
          is_published: boolean
          location: string | null
          pictures: string[] | null
          room_name: string | null
          updated_at: string | null
          venue_name: string
          venue_profile_id: string
        }
        Insert: {
          backline_info?: string | null
          bio?: string | null
          capacity?: number | null
          created_at?: string | null
          genres?: string[] | null
          house_rules?: string | null
          id?: string
          is_published?: boolean
          location?: string | null
          pictures?: string[] | null
          room_name?: string | null
          updated_at?: string | null
          venue_name: string
          venue_profile_id: string
        }
        Update: {
          backline_info?: string | null
          bio?: string | null
          capacity?: number | null
          created_at?: string | null
          genres?: string[] | null
          house_rules?: string | null
          id?: string
          is_published?: boolean
          location?: string | null
          pictures?: string[] | null
          room_name?: string | null
          updated_at?: string | null
          venue_name?: string
          venue_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_listings_venue_profile_id_fkey"
            columns: ["venue_profile_id"]
            isOneToOne: false
            referencedRelation: "venue_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_profiles: {
        Row: {
          bio: string | null
          created_at: string | null
          event_types: string[] | null
          id: string
          location: string | null
          picture: string | null
          updated_at: string | null
          user_id: string
          venue_name: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string | null
          event_types?: string[] | null
          id?: string
          location?: string | null
          picture?: string | null
          updated_at?: string | null
          user_id: string
          venue_name?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string | null
          event_types?: string[] | null
          id?: string
          location?: string | null
          picture?: string | null
          updated_at?: string | null
          user_id?: string
          venue_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "venue_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
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
      send_welcome_message: {
        Args: {
          p_role: Database["public"]["Enums"]["user_role"]
          p_user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      application_status: "in_progress" | "accepted" | "archived"
      availability_preference: "date_range" | "specific_dates" | "flexible"
      lineup_preference:
        | "co_acts_needed"
        | "co_acts_confirmed"
        | "solo_performer"
        | "no_preference"
      payment_preference:
        | "door_split"
        | "bar_split"
        | "tip_based"
        | "flat_fee"
        | "rental"
        | "no_preference"
      user_role: "artist" | "venue" | "both"
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
      application_status: ["in_progress", "accepted", "archived"],
      availability_preference: ["date_range", "specific_dates", "flexible"],
      lineup_preference: [
        "co_acts_needed",
        "co_acts_confirmed",
        "solo_performer",
        "no_preference",
      ],
      payment_preference: [
        "door_split",
        "bar_split",
        "tip_based",
        "flat_fee",
        "rental",
        "no_preference",
      ],
      user_role: ["artist", "venue", "both"],
    },
  },
} as const
