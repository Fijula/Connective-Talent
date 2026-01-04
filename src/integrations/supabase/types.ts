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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activity_feed: {
        Row: {
          action: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      assignments: {
        Row: {
          assigned_by: string
          created_at: string
          end_date: string | null
          id: string
          opportunity_id: string
          start_date: string | null
          status: string | null
          talent_profile_id: string
          updated_at: string
        }
        Insert: {
          assigned_by: string
          created_at?: string
          end_date?: string | null
          id?: string
          opportunity_id: string
          start_date?: string | null
          status?: string | null
          talent_profile_id: string
          updated_at?: string
        }
        Update: {
          assigned_by?: string
          created_at?: string
          end_date?: string | null
          id?: string
          opportunity_id?: string
          start_date?: string | null
          status?: string | null
          talent_profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_talent_profile_id_fkey"
            columns: ["talent_profile_id"]
            isOneToOne: false
            referencedRelation: "talent_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      managers: {
        Row: {
          avatar_url: string | null
          created_at: string
          domain: string | null
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          domain?: string | null
          email: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          domain?: string | null
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      match_feedback: {
        Row: {
          created_at: string
          feedback_text: string | null
          id: string
          match_id: string
          rating: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          feedback_text?: string | null
          id?: string
          match_id: string
          rating?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          feedback_text?: string | null
          id?: string
          match_id?: string
          rating?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_feedback_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          ai_explanation: string | null
          created_at: string
          id: string
          match_score: number | null
          opportunity_id: string
          talent_profile_id: string
        }
        Insert: {
          ai_explanation?: string | null
          created_at?: string
          id?: string
          match_score?: number | null
          opportunity_id: string
          talent_profile_id: string
        }
        Update: {
          ai_explanation?: string | null
          created_at?: string
          id?: string
          match_score?: number | null
          opportunity_id?: string
          talent_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_talent_profile_id_fkey"
            columns: ["talent_profile_id"]
            isOneToOne: false
            referencedRelation: "talent_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunities: {
        Row: {
          budget_max: number | null
          budget_min: number | null
          created_at: string
          created_by: string
          description: string | null
          end_date: string | null
          id: string
          location: string | null
          remote_allowed: boolean | null
          required_role: Database["public"]["Enums"]["talent_role"]
          start_date: string | null
          status: Database["public"]["Enums"]["opportunity_status"]
          title: string
          updated_at: string
        }
        Insert: {
          budget_max?: number | null
          budget_min?: number | null
          created_at?: string
          created_by: string
          description?: string | null
          end_date?: string | null
          id?: string
          location?: string | null
          remote_allowed?: boolean | null
          required_role: Database["public"]["Enums"]["talent_role"]
          start_date?: string | null
          status?: Database["public"]["Enums"]["opportunity_status"]
          title: string
          updated_at?: string
        }
        Update: {
          budget_max?: number | null
          budget_min?: number | null
          created_at?: string
          created_by?: string
          description?: string | null
          end_date?: string | null
          id?: string
          location?: string | null
          remote_allowed?: boolean | null
          required_role?: Database["public"]["Enums"]["talent_role"]
          start_date?: string | null
          status?: Database["public"]["Enums"]["opportunity_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      opportunity_skills: {
        Row: {
          created_at: string
          id: string
          is_required: boolean | null
          opportunity_id: string
          required_level: number | null
          skill_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_required?: boolean | null
          opportunity_id: string
          required_level?: number | null
          skill_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_required?: boolean | null
          opportunity_id?: string
          required_level?: number | null
          skill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_skills_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          domain: string | null
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          domain?: string | null
          email: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          domain?: string | null
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      skills: {
        Row: {
          category: Database["public"]["Enums"]["skill_category"]
          created_at: string
          description: string | null
          id: string
          name: string
          parent_skill_id: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["skill_category"]
          created_at?: string
          description?: string | null
          id?: string
          name: string
          parent_skill_id?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["skill_category"]
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          parent_skill_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "skills_parent_skill_id_fkey"
            columns: ["parent_skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
        talent_profiles: {
          Row: {
            availability_start_date: string | null
            avatar_url: string | null
            bio: string | null
            created_at: string
            current_project: string | null
            email: string
            talent_type: string | null
            first_name: string | null
            github_url: string | null
            // hourly_rate removed from UI; kept in types for backward compat
            id: string
            last_name: string | null
            linkedin_url: string | null
            location: string | null
            manager_id: string | null
            portfolio_url: string | null
            reporting_manager: string | null
            remote_preference: boolean | null
            skills: string[] | null
            source: string | null
            resume_url: string | null
            talent_role: Database["public"]["Enums"]["talent_role"]
            timezone: string | null
            updated_at: string
            years_experience: number | null
            education: string | null
            certifications: string | null
            work_experience: string | null
            prospect_status: string | null
          }
        Insert: {
          availability_start_date?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          current_project?: string | null
          email: string
          talent_type?: string | null
          first_name?: string | null
          github_url?: string | null
          hourly_rate?: number | null
          id?: string
          last_name?: string | null
          linkedin_url?: string | null
          location?: string | null
          manager_id?: string | null
          portfolio_url?: string | null
          reporting_manager?: string | null
          remote_preference?: boolean | null
          skills?: string[] | null
          source?: string | null
          resume_url?: string | null
          talent_role: Database["public"]["Enums"]["talent_role"]
          timezone?: string | null
          updated_at?: string
          years_experience?: number | null
          education?: string | null
          certifications?: string | null
          work_experience?: string | null
          prospect_status?: string | null
        }
        Update: {
          availability_start_date?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string
          talent_type?: string | null
          first_name?: string | null
          github_url?: string | null
          hourly_rate?: number | null
          id?: string
          last_name?: string | null
          linkedin_url?: string | null
          location?: string | null
          manager_id?: string | null
          portfolio_url?: string | null
          reporting_manager?: string | null
          remote_preference?: boolean | null
          skills?: string[] | null
          source?: string | null
          resume_url?: string | null
          talent_role?: Database["public"]["Enums"]["talent_role"]
          timezone?: string | null
          updated_at?: string
          years_experience?: number | null
          education?: string | null
          certifications?: string | null
          work_experience?: string | null
          prospect_status?: string | null
        }
        Relationships: []
      }
      employee_projects: {
        Row: {
          created_at: string
          id: string
          project_name: string
          reporting_manager: string
          talent_profile_id: string
          updated_at: string
          utilization_percentage: number
        }
        Insert: {
          created_at?: string
          id?: string
          project_name: string
          reporting_manager: string
          talent_profile_id: string
          updated_at?: string
          utilization_percentage: number
        }
        Update: {
          created_at?: string
          id?: string
          project_name?: string
          reporting_manager?: string
          talent_profile_id?: string
          updated_at?: string
          utilization_percentage?: number
        }
        Relationships: [
          {
            foreignKeyName: "employee_projects_talent_profile_id_fkey"
            columns: ["talent_profile_id"]
            isOneToOne: false
            referencedRelation: "talent_profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      talent_skills: {
        Row: {
          created_at: string
          id: string
          proficiency_level: number | null
          skill_id: string
          talent_profile_id: string
          years_experience: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          proficiency_level?: number | null
          skill_id: string
          talent_profile_id: string
          years_experience?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          proficiency_level?: number | null
          skill_id?: string
          talent_profile_id?: string
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "talent_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "talent_skills_talent_profile_id_fkey"
            columns: ["talent_profile_id"]
            isOneToOne: false
            referencedRelation: "talent_profiles"
            referencedColumns: ["id"]
          },
        ]
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
      user_preferences: {
        Row: {
          created_at: string
          email_notifications: boolean | null
          id: string
          language_preference: string | null
          notifications_enabled: boolean | null
          push_notifications: boolean | null
          theme_preference: string | null
          updated_at: string
          user_id: string
          walkthrough_completed: boolean | null
          walkthrough_completed_at: string | null
          walkthrough_skipped: boolean | null
        }
        Insert: {
          created_at?: string
          email_notifications?: boolean | null
          id?: string
          language_preference?: string | null
          notifications_enabled?: boolean | null
          push_notifications?: boolean | null
          theme_preference?: string | null
          updated_at?: string
          user_id: string
          walkthrough_completed?: boolean | null
          walkthrough_completed_at?: string | null
          walkthrough_skipped?: boolean | null
        }
        Update: {
          created_at?: string
          email_notifications?: boolean | null
          id?: string
          language_preference?: string | null
          notifications_enabled?: boolean | null
          push_notifications?: boolean | null
          theme_preference?: string | null
          updated_at?: string
          user_id?: string
          walkthrough_completed?: boolean | null
          walkthrough_completed_at?: string | null
          walkthrough_skipped?: boolean | null
        }
        Relationships: []
      }
      admin: {
        Row: {
          id: string
          email: string
          name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          id: string
          user_id: string | null
          email: string
          name: string | null
          first_name: string | null
          last_name: string | null
          avatar_url: string | null
          domain: string | null
          is_manager: boolean
          bio: string | null
          location: string | null
          education: string | null
          work_experience: string | null
          certifications: string | null
          skills: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          email: string
          name?: string | null
          first_name?: string | null
          last_name?: string | null
          avatar_url?: string | null
          domain?: string | null
          is_manager?: boolean
          bio?: string | null
          location?: string | null
          education?: string | null
          work_experience?: string | null
          certifications?: string | null
          skills?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          email?: string
          name?: string | null
          first_name?: string | null
          last_name?: string | null
          avatar_url?: string | null
          domain?: string | null
          is_manager?: boolean
          bio?: string | null
          location?: string | null
          education?: string | null
          work_experience?: string | null
          certifications?: string | null
          skills?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_profile: {
        Args: { _user_id: string }
        Returns: {
          avatar_url: string
          domain: string
          email: string
          first_name: string
          id: string
          last_name: string
          roles: Database["public"]["Enums"]["app_role"][]
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "user"
      opportunity_status: "open" | "filled" | "cancelled" | "on_hold"
      skill_category: "technical" | "soft" | "domain"
      talent_role: "engineer" | "designer" | "pm" | "qa" | "data_scientist"
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
      app_role: ["admin", "manager", "user"],
      opportunity_status: ["open", "filled", "cancelled", "on_hold"],
      skill_category: ["technical", "soft", "domain"],
      talent_role: ["engineer", "designer", "pm", "qa", "data_scientist"],
    },
  },
} as const
