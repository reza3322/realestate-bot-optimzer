export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      activities: {
        Row: {
          created_at: string
          description: string
          id: string
          target_id: string | null
          target_type: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          target_id?: string | null
          target_type?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          target_id?: string | null
          target_type?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      automations: {
        Row: {
          active: boolean | null
          config: Json
          created_at: string
          id: string
          name: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean | null
          config?: Json
          created_at?: string
          id?: string
          name: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean | null
          config?: Json
          created_at?: string
          id?: string
          name?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          ai_response: string
          created_at: string
          id: string
          session_id: string
          user_id: string
          user_message: string
        }
        Insert: {
          ai_response: string
          created_at?: string
          id?: string
          session_id: string
          user_id: string
          user_message: string
        }
        Update: {
          ai_response?: string
          created_at?: string
          id?: string
          session_id?: string
          user_id?: string
          user_message?: string
        }
        Relationships: []
      }
      chatbot_conversations: {
        Row: {
          conversation_id: string | null
          created_at: string
          id: string
          message: string
          response: string
          user_id: string
          visitor_id: string | null
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          id?: string
          message: string
          response: string
          user_id: string
          visitor_id?: string | null
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          id?: string
          message?: string
          response?: string
          user_id?: string
          visitor_id?: string | null
        }
        Relationships: []
      }
      chatbot_settings: {
        Row: {
          created_at: string | null
          id: string
          settings: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          settings?: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          settings?: Json
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      chatbot_training_data: {
        Row: {
          answer: string
          category: string | null
          content_type: string
          created_at: string | null
          id: string
          priority: number | null
          question: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          answer: string
          category?: string | null
          content_type: string
          created_at?: string | null
          id?: string
          priority?: number | null
          question: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          answer?: string
          category?: string | null
          content_type?: string
          created_at?: string | null
          id?: string
          priority?: number | null
          question?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      chatbot_training_files: {
        Row: {
          category: string | null
          content_type: string
          created_at: string | null
          extracted_text: string
          id: string
          priority: number | null
          processing_status: string | null
          source_file: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          content_type: string
          created_at?: string | null
          extracted_text: string
          id?: string
          priority?: number | null
          processing_status?: string | null
          source_file: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          content_type?: string
          created_at?: string | null
          extracted_text?: string
          id?: string
          priority?: number | null
          processing_status?: string | null
          source_file?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      integrations: {
        Row: {
          active: boolean | null
          config: Json
          created_at: string
          id: string
          provider: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean | null
          config?: Json
          created_at?: string
          id?: string
          provider: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean | null
          config?: Json
          created_at?: string
          id?: string
          provider?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "integrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          budget: number | null
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          notes: string | null
          phone: string | null
          property_interest: string | null
          source: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          budget?: number | null
          created_at?: string
          email: string
          first_name: string
          id?: string
          last_name: string
          notes?: string | null
          phone?: string | null
          property_interest?: string | null
          source?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          budget?: number | null
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          notes?: string | null
          phone?: string | null
          property_interest?: string | null
          source?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_user_id_fkey"
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
          company: string | null
          created_at: string
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          plan: string
          role: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          first_name?: string | null
          id: string
          last_name?: string | null
          phone?: string | null
          plan?: string
          role?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          plan?: string
          role?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string | null
          bathrooms: number | null
          bedrooms: number | null
          city: string | null
          created_at: string
          description: string | null
          featured: boolean | null
          garage_area: number | null
          has_pool: boolean | null
          id: string
          images: Json | null
          living_area: number | null
          plot_area: number | null
          price: number
          size: number | null
          state: string | null
          status: string | null
          terrace: number | null
          title: string
          type: string | null
          updated_at: string
          user_id: string
          zip: string | null
        }
        Insert: {
          address?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string | null
          created_at?: string
          description?: string | null
          featured?: boolean | null
          garage_area?: number | null
          has_pool?: boolean | null
          id?: string
          images?: Json | null
          living_area?: number | null
          plot_area?: number | null
          price: number
          size?: number | null
          state?: string | null
          status?: string | null
          terrace?: number | null
          title: string
          type?: string | null
          updated_at?: string
          user_id: string
          zip?: string | null
        }
        Update: {
          address?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string | null
          created_at?: string
          description?: string | null
          featured?: boolean | null
          garage_area?: number | null
          has_pool?: boolean | null
          id?: string
          images?: Json | null
          living_area?: number | null
          plot_area?: number | null
          price?: number
          size?: number | null
          state?: string | null
          status?: string | null
          terrace?: number | null
          title?: string
          type?: string | null
          updated_at?: string
          user_id?: string
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      property_imports: {
        Row: {
          created_at: string | null
          id: string
          log: Json | null
          records_failed: number | null
          records_imported: number | null
          records_total: number
          source: string
          source_name: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          log?: Json | null
          records_failed?: number | null
          records_imported?: number | null
          records_total?: number
          source: string
          source_name?: string | null
          status: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          log?: Json | null
          records_failed?: number | null
          records_imported?: number | null
          records_total?: number
          source?: string
          source_name?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      scrape_history: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          log: Json | null
          properties_found: number | null
          properties_imported: number | null
          status: string
          user_id: string
          website_id: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          log?: Json | null
          properties_found?: number | null
          properties_imported?: number | null
          status: string
          user_id: string
          website_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          log?: Json | null
          properties_found?: number | null
          properties_imported?: number | null
          status?: string
          user_id?: string
          website_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scrape_history_website_id_fkey"
            columns: ["website_id"]
            isOneToOne: false
            referencedRelation: "user_websites"
            referencedColumns: ["id"]
          },
        ]
      }
      user_websites: {
        Row: {
          api_available: boolean | null
          created_at: string
          id: string
          last_scraped_at: string | null
          updated_at: string
          user_id: string
          website_url: string
        }
        Insert: {
          api_available?: boolean | null
          created_at?: string
          id?: string
          last_scraped_at?: string | null
          updated_at?: string
          user_id: string
          website_url: string
        }
        Update: {
          api_available?: boolean | null
          created_at?: string
          id?: string
          last_scraped_at?: string | null
          updated_at?: string
          user_id?: string
          website_url?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_chatbot_settings_table_if_not_exists: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      generate_chatbot_script:
        | {
            Args: {
              user_uuid: string
            }
            Returns: string
          }
        | {
            Args: {
              user_uuid: string
              client_origin?: string
            }
            Returns: string
          }
      get_auth_user_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      search_properties_by_style: {
        Args: {
          user_id_param: string
          style_query: string
          max_results?: number
        }
        Returns: {
          id: string
          title: string
          description: string
          price: number
          bedrooms: number
          bathrooms: number
          city: string
          state: string
          status: string
          url: string
          living_area: number
          plot_area: number
          garage_area: number
          terrace: number
          has_pool: boolean
          relevance: number
        }[]
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

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
