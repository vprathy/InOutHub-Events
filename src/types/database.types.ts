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
            app_super_admins: {
                Row: {
                    created_at: string | null
                    user_id: string
                }
                Insert: {
                    created_at?: string | null
                    user_id: string
                }
                Update: {
                    created_at?: string | null
                    user_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "app_super_admins_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: true
                        referencedRelation: "user_profiles"
                        referencedColumns: ["id"]
                    },
                ]
            }
            asset_templates: {
                Row: {
                    act_id: string | null
                    asset_type: string | null
                    created_at: string
                    description: string | null
                    event_id: string | null
                    id: string
                    is_required: boolean | null
                    name: string
                    org_id: string | null
                    target_level: string | null
                }
                Insert: {
                    act_id?: string | null
                    asset_type?: string | null
                    created_at?: string
                    description?: string | null
                    event_id?: string | null
                    id?: string
                    is_required?: boolean | null
                    name: string
                    org_id?: string | null
                    target_level?: string | null
                }
                Update: {
                    act_id?: string | null
                    asset_type?: string | null
                    created_at?: string
                    description?: string | null
                    event_id?: string | null
                    id?: string
                    is_required?: boolean | null
                    name?: string
                    org_id?: string | null
                    target_level?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "asset_templates_act_id_fkey"
                        columns: ["act_id"]
                        isOneToOne: false
                        referencedRelation: "acts"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "asset_templates_event_id_fkey"
                        columns: ["event_id"]
                        isOneToOne: false
                        referencedRelation: "events"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "asset_templates_org_id_fkey"
                        columns: ["org_id"]
                        isOneToOne: false
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    },
                ]
            }
            audit_logs: {
                Row: {
                    changed_at: string | null
                    changed_by: string | null
                    id: string
                    new_data: Json | null
                    old_data: Json | null
                    operation: string
                    record_id: string
                    table_name: string
                }
                Insert: {
                    changed_at?: string | null
                    changed_by?: string | null
                    id?: string
                    new_data?: Json | null
                    old_data?: Json | null
                    operation: string
                    record_id: string
                    table_name: string
                }
                Update: {
                    changed_at?: string | null
                    changed_by?: string | null
                    id?: string
                    new_data?: Json | null
                    old_data?: Json | null
                    operation?: string
                    record_id?: string
                    table_name?: string
                }
                Relationships: []
            }
            auth_events: {
                Row: {
                    context_event_id: string | null
                    created_at: string
                    event_type: string
                    id: string
                    ip_address: string | null
                    metadata: Json | null
                    user_agent: string | null
                    user_id: string
                }
                Insert: {
                    context_event_id?: string | null
                    created_at?: string
                    event_type: string
                    id?: string
                    ip_address?: string | null
                    metadata?: Json | null
                    user_agent?: string | null
                    user_id?: string
                }
                Update: {
                    context_event_id?: string | null
                    created_at?: string
                    event_type?: string
                    id?: string
                    ip_address?: string | null
                    metadata?: Json | null
                    user_agent?: string | null
                    user_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "auth_events_context_event_id_fkey"
                        columns: ["context_event_id"]
                        isOneToOne: false
                        referencedRelation: "events"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "auth_events_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "user_profiles"
                        referencedColumns: ["id"]
                    },
                ]
            }
            event_members: {
                Row: {
                    created_at: string
                    event_id: string
                    grant_type: string
                    id: string
                    role: string
                    user_id: string
                }
                Insert: {
                    created_at?: string
                    event_id: string
                    grant_type?: string
                    id?: string
                    role: string
                    user_id: string
                }
                Update: {
                    created_at?: string
                    event_id?: string
                    grant_type?: string
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
                    },
                ]
            }
            pending_event_access: {
                Row: {
                    created_at: string
                    created_by: string | null
                    event_id: string
                    fulfilled_user_id: string | null
                    grant_type: string
                    id: string
                    normalized_email: string
                    organization_id: string
                    source_participant_id: string | null
                    source_type: string | null
                    status: string
                    target_role: string
                    updated_at: string
                }
                Insert: {
                    created_at?: string
                    created_by?: string | null
                    event_id: string
                    fulfilled_user_id?: string | null
                    grant_type?: string
                    id?: string
                    normalized_email: string
                    organization_id: string
                    source_participant_id?: string | null
                    source_type?: string | null
                    status?: string
                    target_role?: string
                    updated_at?: string
                }
                Update: {
                    created_at?: string
                    created_by?: string | null
                    event_id?: string
                    fulfilled_user_id?: string | null
                    grant_type?: string
                    id?: string
                    normalized_email?: string
                    organization_id?: string
                    source_participant_id?: string | null
                    source_type?: string | null
                    status?: string
                    target_role?: string
                    updated_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "pending_event_access_created_by_fkey"
                        columns: ["created_by"]
                        isOneToOne: false
                        referencedRelation: "user_profiles"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "pending_event_access_event_id_fkey"
                        columns: ["event_id"]
                        isOneToOne: false
                        referencedRelation: "events"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "pending_event_access_fulfilled_user_id_fkey"
                        columns: ["fulfilled_user_id"]
                        isOneToOne: false
                        referencedRelation: "user_profiles"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "pending_event_access_organization_id_fkey"
                        columns: ["organization_id"]
                        isOneToOne: false
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "pending_event_access_source_participant_id_fkey"
                        columns: ["source_participant_id"]
                        isOneToOne: false
                        referencedRelation: "participants"
                        referencedColumns: ["id"]
                    },
                ]
            }
            event_sources: {
                Row: {
                    config: Json
                    created_at: string | null
                    event_id: string
                    id: string
                    last_synced_at: string | null
                    name: string
                    type: string
                }
                Insert: {
                    config?: Json
                    created_at?: string | null
                    event_id: string
                    id?: string
                    last_synced_at?: string | null
                    name: string
                    type: string
                }
                Update: {
                    config?: Json
                    created_at?: string | null
                    event_id?: string
                    id?: string
                    last_synced_at?: string | null
                    name?: string
                    type?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "event_sources_event_id_fkey"
                        columns: ["event_id"]
                        isOneToOne: false
                        referencedRelation: "events"
                        referencedColumns: ["id"]
                    },
                ]
            }
            events: {
                Row: {
                    created_at: string | null
                    end_date: string | null
                    id: string
                    last_synced_at: string | null
                    name: string
                    organization_id: string
                    source_spreadsheet_id: string | null
                    source_url: string | null
                    start_date: string | null
                    status: string | null
                    timezone: string
                }
                Insert: {
                    created_at?: string | null
                    end_date?: string | null
                    id?: string
                    last_synced_at?: string | null
                    name: string
                    organization_id: string
                    source_spreadsheet_id?: string | null
                    source_url?: string | null
                    start_date?: string | null
                    status?: string | null
                    timezone?: string
                }
                Update: {
                    created_at?: string | null
                    end_date?: string | null
                    id?: string
                    last_synced_at?: string | null
                    name?: string
                    organization_id?: string
                    source_spreadsheet_id?: string | null
                    source_url?: string | null
                    start_date?: string | null
                    status?: string | null
                    timezone?: string
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
            internal_config: {
                Row: {
                    created_at: string | null
                    key: string
                    updated_at: string | null
                    value: Json
                }
                Insert: {
                    created_at?: string | null
                    key: string
                    updated_at?: string | null
                    value: Json
                }
                Update: {
                    created_at?: string | null
                    key?: string
                    updated_at?: string | null
                    value?: Json
                }
                Relationships: []
            }
            lineup_items: {
                Row: {
                    act_id: string
                    created_at: string | null
                    execution_status: string | null
                    id: string
                    scheduled_start_time: string
                    sort_order: number
                    stage_id: string
                }
                Insert: {
                    act_id: string
                    created_at?: string | null
                    execution_status?: string | null
                    id?: string
                    scheduled_start_time: string
                    sort_order?: number
                    stage_id: string
                }
                Update: {
                    act_id?: string
                    created_at?: string | null
                    execution_status?: string | null
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
            participant_assets: {
                Row: {
                    created_at: string | null
                    file_url: string
                    id: string
                    name: string
                    participant_id: string
                    review_notes: string | null
                    status: string | null
                    template_id: string | null
                    type: string
                }
                Insert: {
                    created_at?: string | null
                    file_url: string
                    id?: string
                    name: string
                    participant_id: string
                    review_notes?: string | null
                    status?: string | null
                    template_id?: string | null
                    type: string
                }
                Update: {
                    created_at?: string | null
                    file_url?: string
                    id?: string
                    name?: string
                    participant_id?: string
                    review_notes?: string | null
                    status?: string | null
                    template_id?: string | null
                    type?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "participant_assets_participant_id_fkey"
                        columns: ["participant_id"]
                        isOneToOne: false
                        referencedRelation: "participants"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "participant_assets_template_id_fkey"
                        columns: ["template_id"]
                        isOneToOne: false
                        referencedRelation: "asset_templates"
                        referencedColumns: ["id"]
                    },
                ]
            }
            participant_notes: {
                Row: {
                    author_id: string | null
                    category: string
                    content: string
                    created_at: string | null
                    id: string
                    is_resolved: boolean | null
                    participant_id: string
                    resolved_at: string | null
                    resolved_by: string | null
                }
                Insert: {
                    author_id?: string | null
                    category: string
                    content: string
                    created_at?: string | null
                    id?: string
                    is_resolved?: boolean | null
                    participant_id: string
                    resolved_at?: string | null
                    resolved_by?: string | null
                }
                Update: {
                    author_id?: string | null
                    category?: string
                    content?: string
                    created_at?: string | null
                    id?: string
                    is_resolved?: boolean | null
                    participant_id: string
                    resolved_at?: string | null
                    resolved_by?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "participant_notes_participant_id_fkey"
                        columns: ["participant_id"]
                        isOneToOne: false
                        referencedRelation: "participants"
                        referencedColumns: ["id"]
                    },
                ]
            }
            participants: {
                Row: {
                    age: number | null
                    created_at: string | null
                    event_id: string
                    first_name: string
                    guardian_name: string | null
                    guardian_phone: string | null
                    guardian_relationship: string | null
                    has_special_requests: boolean | null
                    id: string
                    identity_notes: string | null
                    identity_verified: boolean | null
                    is_minor: boolean | null
                    last_name: string
                    notes: string | null
                    source_anchor_type: string | null
                    source_anchor_value: string | null
                    source_imported_at: string | null
                    source_instance: string | null
                    source_last_seen_at: string | null
                    source_system: string | null
                    special_request_raw: string | null
                    special_request_source_column: string | null
                    src_raw: Json | null
                    status: Database["public"]["Enums"]["participant_status"] | null
                    sync_metadata: Json | null
                }
                Insert: {
                    age?: number | null
                    created_at?: string | null
                    event_id: string
                    first_name: string
                    guardian_name?: string | null
                    guardian_phone?: string | null
                    guardian_relationship?: string | null
                    has_special_requests?: boolean | null
                    id?: string
                    identity_notes?: string | null
                    identity_verified?: boolean | null
                    is_minor?: boolean | null
                    last_name: string
                    notes?: string | null
                    source_anchor_type?: string | null
                    source_anchor_value?: string | null
                    source_imported_at?: string | null
                    source_instance?: string | null
                    source_last_seen_at?: string | null
                    source_system?: string | null
                    special_request_raw?: string | null
                    special_request_source_column?: string | null
                    src_raw?: Json | null
                    status?: Database["public"]["Enums"]["participant_status"] | null
                    sync_metadata?: Json | null
                }
                Update: {
                    age?: number | null
                    created_at?: string | null
                    event_id?: string
                    first_name?: string
                    guardian_name?: string | null
                    guardian_phone?: string | null
                    guardian_relationship?: string | null
                    has_special_requests?: boolean | null
                    id?: string
                    identity_notes?: string | null
                    identity_verified?: boolean | null
                    is_minor?: boolean | null
                    last_name?: string
                    notes?: string | null
                    source_anchor_type?: string | null
                    source_anchor_value?: string | null
                    source_imported_at?: string | null
                    source_instance?: string | null
                    source_last_seen_at?: string | null
                    source_system?: string | null
                    special_request_raw?: string | null
                    special_request_source_column?: string | null
                    src_raw?: Json | null
                    status?: Database["public"]["Enums"]["participant_status"] | null
                    sync_metadata?: Json | null
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
            requirement_assignments: {
                Row: {
                    act_id: string | null
                    created_at: string
                    due_at: string | null
                    evidence_summary: Json
                    id: string
                    notes: string | null
                    owner_user_id: string | null
                    participant_id: string | null
                    policy_id: string
                    reviewed_at: string | null
                    reviewed_by: string | null
                    status: string
                    subject_type: string
                    submitted_at: string | null
                    updated_at: string
                    waived_at: string | null
                    waived_by: string | null
                }
                Insert: {
                    act_id?: string | null
                    created_at?: string
                    due_at?: string | null
                    evidence_summary?: Json
                    id?: string
                    notes?: string | null
                    owner_user_id?: string | null
                    participant_id?: string | null
                    policy_id: string
                    reviewed_at?: string | null
                    reviewed_by?: string | null
                    status?: string
                    subject_type: string
                    submitted_at?: string | null
                    updated_at?: string
                    waived_at?: string | null
                    waived_by?: string | null
                }
                Update: {
                    act_id?: string | null
                    created_at?: string
                    due_at?: string | null
                    evidence_summary?: Json
                    id?: string
                    notes?: string | null
                    owner_user_id?: string | null
                    participant_id?: string | null
                    policy_id?: string
                    reviewed_at?: string | null
                    reviewed_by?: string | null
                    status?: string
                    subject_type?: string
                    submitted_at?: string | null
                    updated_at?: string
                    waived_at?: string | null
                    waived_by?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "requirement_assignments_act_id_fkey"
                        columns: ["act_id"]
                        isOneToOne: false
                        referencedRelation: "acts"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "requirement_assignments_owner_user_id_fkey"
                        columns: ["owner_user_id"]
                        isOneToOne: false
                        referencedRelation: "user_profiles"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "requirement_assignments_participant_id_fkey"
                        columns: ["participant_id"]
                        isOneToOne: false
                        referencedRelation: "participants"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "requirement_assignments_policy_id_fkey"
                        columns: ["policy_id"]
                        isOneToOne: false
                        referencedRelation: "requirement_policies"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "requirement_assignments_reviewed_by_fkey"
                        columns: ["reviewed_by"]
                        isOneToOne: false
                        referencedRelation: "user_profiles"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "requirement_assignments_waived_by_fkey"
                        columns: ["waived_by"]
                        isOneToOne: false
                        referencedRelation: "user_profiles"
                        referencedColumns: ["id"]
                    },
                ]
            }
            requirement_policies: {
                Row: {
                    allow_bulk_approve: boolean
                    applies_when: Json
                    blocking_level: string
                    category: string
                    code: string
                    created_at: string
                    description: string | null
                    event_id: string | null
                    id: string
                    input_config: Json
                    input_type: string
                    is_active: boolean
                    is_required: boolean
                    label: string
                    organization_id: string | null
                    review_mode: string
                    sort_order: number
                    subject_type: string
                    updated_at: string
                }
                Insert: {
                    allow_bulk_approve?: boolean
                    applies_when?: Json
                    blocking_level?: string
                    category: string
                    code: string
                    created_at?: string
                    description?: string | null
                    event_id?: string | null
                    id?: string
                    input_config?: Json
                    input_type: string
                    is_active?: boolean
                    is_required?: boolean
                    label: string
                    organization_id?: string | null
                    review_mode?: string
                    sort_order?: number
                    subject_type: string
                    updated_at?: string
                }
                Update: {
                    allow_bulk_approve?: boolean
                    applies_when?: Json
                    blocking_level?: string
                    category?: string
                    code?: string
                    created_at?: string
                    description?: string | null
                    event_id?: string | null
                    id?: string
                    input_config?: Json
                    input_type?: string
                    is_active?: boolean
                    is_required?: boolean
                    label?: string
                    organization_id?: string | null
                    review_mode?: string
                    sort_order?: number
                    subject_type?: string
                    updated_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "requirement_policies_event_id_fkey"
                        columns: ["event_id"]
                        isOneToOne: false
                        referencedRelation: "events"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "requirement_policies_organization_id_fkey"
                        columns: ["organization_id"]
                        isOneToOne: false
                        referencedRelation: "organizations"
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
                    metadata: Json | null
                    phone_number: string | null
                    timezone_pref: string | null
                }
                Insert: {
                    created_at?: string | null
                    email?: string | null
                    first_name?: string | null
                    id: string
                    last_name?: string | null
                    metadata?: Json | null
                    phone_number?: string | null
                    timezone_pref?: string | null
                }
                Update: {
                    created_at?: string | null
                    email?: string | null
                    first_name?: string | null
                    id?: string
                    last_name?: string | null
                    metadata?: Json | null
                    phone_number?: string | null
                    timezone_pref?: string | null
                }
                Relationships: []
            }
            user_sessions: {
                Row: {
                    active_event_id: string | null
                    device_info: Json | null
                    ended_at: string | null
                    ended_reason: string | null
                    id: string
                    is_offline_mode: boolean
                    last_active_at: string
                    pwa_version: string | null
                    started_at: string
                    status: string
                    user_id: string
                }
                Insert: {
                    active_event_id?: string | null
                    device_info?: Json | null
                    ended_at?: string | null
                    ended_reason?: string | null
                    id?: string
                    is_offline_mode?: boolean
                    last_active_at?: string
                    pwa_version?: string | null
                    started_at?: string
                    status?: string
                    user_id?: string
                }
                Update: {
                    active_event_id?: string | null
                    device_info?: Json | null
                    ended_at?: string | null
                    ended_reason?: string | null
                    id?: string
                    is_offline_mode?: boolean
                    last_active_at?: string
                    pwa_version?: string | null
                    started_at?: string
                    status?: string
                    user_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "user_sessions_active_event_id_fkey"
                        columns: ["active_event_id"]
                        isOneToOne: false
                        referencedRelation: "events"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "user_sessions_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "user_profiles"
                        referencedColumns: ["id"]
                    },
                ]
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            assign_asset_template_bulk: {
                Args: {
                    p_target_id: string
                    p_target_level: string
                    p_template_id: string
                }
                Returns: undefined
            }
            assign_event_role: {
                Args: { p_event_id: string; p_role: string; p_target_email: string }
                Returns: Json
            }
            assign_org_role: {
                Args: { p_org_id: string; p_role: string; p_target_email: string }
                Returns: Json
            }
            auth_event_role: { Args: { p_event_id: string }; Returns: string }
            auth_is_super_admin: { Args: never; Returns: boolean }
            auth_org_role: { Args: { p_org_id: string }; Returns: string }
            can_manage_event_staff: { Args: { p_event_id: string }; Returns: boolean }
            create_organization_with_owner: {
                Args: { p_name: string }
                Returns: string
            }
            get_act_event_id: { Args: { p_act_id: string }; Returns: string }
            get_participant_event_id: {
                Args: { p_participant_id: string }
                Returns: string
            }
            get_effective_event_role: {
                Args: { p_event_id: string; p_user_id: string }
                Returns: string
            }
            map_legacy_act_requirement_code: {
                Args: { p_requirement_type: string }
                Returns: string
            }
            get_stage_event_id: { Args: { p_stage_id: string }; Returns: string }
            update_act_arrival_status: {
                Args: { p_act_id: string; p_status: string }
                Returns: undefined
            }
        }
        Enums: {
            participant_status:
            | "active"
            | "inactive"
            | "withdrawn"
            | "refunded"
            | "missing_from_source"
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
            participant_status: [
                "active",
                "inactive",
                "withdrawn",
                "refunded",
                "missing_from_source",
            ],
        },
    },
} as const
