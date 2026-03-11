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
            act_assets: {
                Row: {
                    act_id: string
                    asset_name: string
                    asset_type: string
                    created_at: string | null
                    id: string
                    notes: string | null
                }
                Insert: {
                    act_id: string
                    asset_name: string
                    asset_type: string
                    created_at?: string | null
                    id?: string
                    notes?: string | null
                }
                Update: {
                    act_id?: string
                    asset_name?: string
                    asset_type?: string
                    created_at?: string | null
                    id?: string
                    notes?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "act_assets_act_id_fkey"
                        columns: ["act_id"]
                        isOneToOne: false
                        referencedRelation: "acts"
                        referencedColumns: ["id"]
                    },
                ]
            }
            act_participants: {
                Row: {
                    act_id: string
                    created_at: string | null
                    id: string
                    participant_id: string
                    role: string
                }
                Insert: {
                    act_id: string
                    created_at?: string | null
                    id?: string
                    participant_id: string
                    role?: string
                }
                Update: {
                    act_id?: string
                    created_at?: string | null
                    id?: string
                    participant_id?: string
                    role?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "act_participants_act_id_fkey"
                        columns: ["act_id"]
                        isOneToOne: false
                        referencedRelation: "acts"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "act_participants_participant_id_fkey"
                        columns: ["participant_id"]
                        isOneToOne: false
                        referencedRelation: "participants"
                        referencedColumns: ["id"]
                    },
                ]
            }
            act_requirements: {
                Row: {
                    act_id: string
                    created_at: string | null
                    description: string
                    file_url: string | null
                    fulfilled: boolean | null
                    id: string
                    requirement_type: string
                }
                Insert: {
                    act_id: string
                    created_at?: string | null
                    description: string
                    file_url?: string | null
                    fulfilled?: boolean | null
                    id?: string
                    requirement_type: string
                }
                Update: {
                    act_id?: string
                    created_at?: string | null
                    description?: string
                    file_url?: string | null
                    fulfilled?: boolean | null
                    id?: string
                    requirement_type?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "act_requirements_act_id_fkey"
                        columns: ["act_id"]
                        isOneToOne: false
                        referencedRelation: "acts"
                        referencedColumns: ["id"]
                    },
                ]
            }
            acts: {
                Row: {
                    arrival_status: string
                    created_at: string | null
                    duration_minutes: number
                    event_id: string
                    id: string
                    name: string
                    notes: string | null
                    setup_time_minutes: number
                }
                Insert: {
                    arrival_status?: string
                    created_at?: string | null
                    duration_minutes?: number
                    event_id: string
                    id?: string
                    name: string
                    notes?: string | null
                    setup_time_minutes?: number
                }
                Update: {
                    arrival_status?: string
                    created_at?: string | null
                    duration_minutes?: number
                    event_id?: string
                    id?: string
                    name?: string
                    notes?: string | null
                    setup_time_minutes?: number
                }
                Relationships: [
                    {
                        foreignKeyName: "acts_event_id_fkey"
                        columns: ["event_id"]
                        isOneToOne: false
                        referencedRelation: "events"
                        referencedColumns: ["id"]
                    },
                ]
            }
            event_members: {
                Row: {
                    created_at: string
                    event_id: string
                    id: string
                    role: string
                    user_id: string
                }
                Insert: {
                    created_at?: string
                    event_id: string
                    id?: string
                    role: string
                    user_id: string
                }
                Update: {
                    created_at?: string
                    event_id?: string
                    id?: string
                    role?: string
                    user_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "event_members_event_id_fkey"
                        columns: ["event_id"]
                        isOneToOne: false
                        referencedRelation: "events"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "event_members_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "user_profiles"
                        referencedColumns: ["id"]
                    }
                ]
            }
            events: {
                Row: {
                    created_at: string | null
                    end_date: string | null
                    id: string
                    name: string
                    organization_id: string
                    start_date: string | null
                    status: string
                }
                Insert: {
                    created_at?: string | null
                    end_date?: string | null
                    id?: string
                    name: string
                    organization_id: string
                    start_date?: string | null
                    status?: string
                }
                Update: {
                    created_at?: string | null
                    end_date?: string | null
                    id?: string
                    name?: string
                    organization_id?: string
                    start_date?: string | null
                    status?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "events_organization_id_fkey"
                        columns: ["organization_id"]
                        isOneToOne: false
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    },
                ]
            }
            lineup_items: {
                Row: {
                    act_id: string
                    created_at: string | null
                    id: string
                    scheduled_start_time: string
                    sort_order: number
                    stage_id: string
                }
                Insert: {
                    act_id: string
                    created_at?: string | null
                    id?: string
                    scheduled_start_time: string
                    sort_order?: number
                    stage_id: string
                }
                Update: {
                    act_id?: string
                    created_at?: string | null
                    id?: string
                    scheduled_start_time?: string
                    sort_order?: number
                    stage_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "lineup_items_act_id_fkey"
                        columns: ["act_id"]
                        isOneToOne: false
                        referencedRelation: "acts"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "lineup_items_stage_id_fkey"
                        columns: ["stage_id"]
                        isOneToOne: false
                        referencedRelation: "stages"
                        referencedColumns: ["id"]
                    },
                ]
            }
            organization_members: {
                Row: {
                    created_at: string | null
                    id: string
                    organization_id: string
                    role: string
                    user_id: string
                }
                Insert: {
                    created_at?: string | null
                    id?: string
                    organization_id: string
                    role?: string
                    user_id: string
                }
                Update: {
                    created_at?: string | null
                    id?: string
                    organization_id?: string
                    role?: string
                    user_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "organization_members_organization_id_fkey"
                        columns: ["organization_id"]
                        isOneToOne: false
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "organization_members_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "user_profiles"
                        referencedColumns: ["id"]
                    },
                ]
            }
            organizations: {
                Row: {
                    created_at: string | null
                    id: string
                    name: string
                }
                Insert: {
                    created_at?: string | null
                    id?: string
                    name: string
                }
                Update: {
                    created_at?: string | null
                    id?: string
                    name?: string
                }
                Relationships: []
            }
            participants: {
                Row: {
                    created_at: string | null
                    event_id: string
                    first_name: string
                    guardian_name: string | null
                    guardian_phone: string | null
                    id: string
                    last_name: string
                    notes: string | null
                }
                Insert: {
                    created_at?: string | null
                    event_id: string
                    first_name: string
                    guardian_name?: string | null
                    guardian_phone?: string | null
                    id?: string
                    last_name: string
                    notes?: string | null
                }
                Update: {
                    created_at?: string | null
                    event_id?: string
                    first_name?: string
                    guardian_name?: string | null
                    guardian_phone?: string | null
                    id?: string
                    last_name?: string
                    notes?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "participants_event_id_fkey"
                        columns: ["event_id"]
                        isOneToOne: false
                        referencedRelation: "events"
                        referencedColumns: ["id"]
                    },
                ]
            }
            stage_state: {
                Row: {
                    current_lineup_item_id: string | null
                    id: string
                    stage_id: string
                    status: string
                    updated_at: string | null
                }
                Insert: {
                    current_lineup_item_id?: string | null
                    id?: string
                    stage_id: string
                    status?: string
                    updated_at?: string | null
                }
                Update: {
                    current_lineup_item_id?: string | null
                    id?: string
                    stage_id?: string
                    status?: string
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "stage_state_current_lineup_item_id_fkey"
                        columns: ["current_lineup_item_id"]
                        isOneToOne: false
                        referencedRelation: "lineup_items"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "stage_state_stage_id_fkey"
                        columns: ["stage_id"]
                        isOneToOne: true
                        referencedRelation: "stages"
                        referencedColumns: ["id"]
                    },
                ]
            }
            stages: {
                Row: {
                    created_at: string | null
                    description: string | null
                    event_id: string
                    id: string
                    name: string
                }
                Insert: {
                    created_at?: string | null
                    description?: string | null
                    event_id: string
                    id?: string
                    name: string
                }
                Update: {
                    created_at?: string | null
                    description?: string | null
                    event_id?: string
                    id?: string
                    name?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "stages_event_id_fkey"
                        columns: ["event_id"]
                        isOneToOne: false
                        referencedRelation: "events"
                        referencedColumns: ["id"]
                    },
                ]
            }
            user_profiles: {
                Row: {
                    created_at: string | null
                    email: string | null
                    first_name: string | null
                    id: string
                    last_name: string | null
                }
                Insert: {
                    created_at?: string | null
                    email?: string | null
                    first_name?: string | null
                    id: string
                    last_name?: string | null
                }
                Update: {
                    created_at?: string | null
                    email?: string | null
                    first_name?: string | null
                    id?: string
                    last_name?: string | null
                }
                Relationships: []
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            assign_event_role: {
                Args: {
                    p_event_id: string
                    p_target_email: string
                    p_role: string
                }
                Returns: undefined
            }
            assign_org_role: {
                Args: {
                    p_org_id: string
                    p_target_email: string
                    p_role: string
                }
                Returns: undefined
            }
            get_effective_event_role: {
                Args: {
                    p_event_id: string
                    p_user_id: string
                }
                Returns: string
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
