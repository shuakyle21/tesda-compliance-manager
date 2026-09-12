/**
 * Generated-shape Supabase row types (RULES.md sec.3 rule 20).
 *
 * `platform_admins`, `qualifications`, `tenant_qualifications`, the six new
 * `tenants` columns and the `create_school` /
 * `current_user_is_platform_admin` functions were written by hand from
 * `supabase/migrations/20260906114735_add_school_registry_and_platform_admin.sql`.
 *
 * That migration is now APPLIED (2026-09-06), and these hand-written shapes
 * were checked field-by-field against `generate_typescript_types` run on the
 * live project. They match. Two deliberate divergences from the generator:
 * `create_school`'s nullable text parameters are typed `string | null` here
 * (the generator emits plain `string`, but every one of them is a nullable
 * `text` and the data layer passes null), and
 * `current_user_is_platform_admin`'s `Args` stays `Record<string, never>`
 * rather than the generator's `never`, matching this file's existing style.
 *
 * NOTE FOR A FUTURE CLEANUP: this file is hand-maintained and stubs every
 * table's `Relationships` as `[]`. That stub is what makes supabase-js unable
 * to infer embedded joins, which is the root of the four long-standing TS2352
 * casts in `activity.ts`, `batches.ts`, `tenancy.ts` and `users.ts`. Adopting
 * the generator's real `Relationships` arrays would very likely retire all
 * four. Out of scope here; worth doing deliberately.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ProfileRole = 'admin' | 'coordinator' | 'trainer' | 'viewer';
export type LifecycleStage =
  | 'aou'
  | 'ntp'
  | 'tip'
  | 'training'
  | 'assessment'
  | 'billing'
  | 'completed'
  | 'blocked';
export type BatchStatus = 'pending' | 'ongoing' | 'completed' | 'blocked';
export type DocumentStatus = 'missing' | 'pending' | 'submitted' | 'verified';
export type DocumentAudience = 'admin' | 'coordinator' | 'trainer' | 'viewer' | 'all';
export type AssessmentResult = 'competent' | 'not_yet_competent' | 'pending';
export type ActivityAction =
  | 'created'
  | 'updated'
  | 'uploaded'
  | 'verified'
  | 'submitted'
  | 'deleted'
  | 'system_note';

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string;
          code: string;
          name: string;
          region: string | null;
          school_type: string | null;
          tesda_provider_code: string | null;
          province: string | null;
          city_municipality: string | null;
          street_address: string | null;
          provider_type: string | null;
          provider_classification: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          region?: string | null;
          school_type?: string | null;
          tesda_provider_code?: string | null;
          province?: string | null;
          city_municipality?: string | null;
          street_address?: string | null;
          provider_type?: string | null;
          provider_classification?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['tenants']['Insert']>;
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          clerk_user_id: string;
          full_name: string | null;
          email: string | null;
          role: ProfileRole;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          clerk_user_id: string;
          full_name?: string | null;
          email?: string | null;
          role: ProfileRole;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
        Relationships: [];
      };
      profile_tenant_memberships: {
        Row: {
          id: string;
          tenant_id: string;
          profile_id: string;
          is_default: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          profile_id: string;
          is_default?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['profile_tenant_memberships']['Insert']>;
        Relationships: [];
      };
      platform_admins: {
        Row: {
          profile_id: string;
          note: string | null;
          created_at: string;
        };
        Insert: {
          profile_id: string;
          note?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['platform_admins']['Insert']>;
        Relationships: [];
      };
      qualifications: {
        Row: {
          id: string;
          code: string;
          title: string;
          nc_level: string | null;
          sector: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          title: string;
          nc_level?: string | null;
          sector?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['qualifications']['Insert']>;
        Relationships: [];
      };
      tenant_qualifications: {
        Row: {
          id: string;
          tenant_id: string;
          qualification_id: string;
          copr_number: string | null;
          registration_status: string | null;
          delivery_mode: string | null;
          valid_until: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          qualification_id: string;
          copr_number?: string | null;
          registration_status?: string | null;
          delivery_mode?: string | null;
          valid_until?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['tenant_qualifications']['Insert']>;
        Relationships: [];
      };
      scholarship_programs: {
        Row: {
          id: string;
          code: string;
          name: string;
          description: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['scholarship_programs']['Insert']>;
        Relationships: [];
      };
      program_document_requirements: {
        Row: {
          id: string;
          program_id: string;
          document_key: string;
          document_name: string;
          description: string | null;
          required_for_stage: LifecycleStage | null;
          audience: DocumentAudience;
          is_required: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          program_id: string;
          document_key: string;
          document_name: string;
          description?: string | null;
          required_for_stage?: LifecycleStage | null;
          audience?: DocumentAudience;
          is_required?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['program_document_requirements']['Insert']>;
        Relationships: [];
      };
      program_billing_rules: {
        Row: {
          id: string;
          program_id: string;
          progress_threshold_percent: number;
          label: string;
          description: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          program_id: string;
          progress_threshold_percent?: number;
          label?: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['program_billing_rules']['Insert']>;
        Relationships: [];
      };
      batches: {
        Row: {
          id: string;
          tenant_id: string;
          program_id: string;
          batch_code: string;
          batch_section: string | null;
          qualification_title: string;
          nc_level: string | null;
          trainer_profile_id: string | null;
          trainer_name: string | null;
          learner_count: number;
          start_date: string | null;
          end_date: string | null;
          current_stage: LifecycleStage;
          status: BatchStatus;
          progress_percent: number;
          billing_report_status: DocumentStatus;
          official_system_reference: string | null;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          program_id: string;
          batch_code: string;
          batch_section?: string | null;
          qualification_title: string;
          nc_level?: string | null;
          trainer_profile_id?: string | null;
          trainer_name?: string | null;
          learner_count?: number;
          start_date?: string | null;
          end_date?: string | null;
          current_stage?: LifecycleStage;
          status?: BatchStatus;
          progress_percent?: number;
          billing_report_status?: DocumentStatus;
          official_system_reference?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['batches']['Insert']>;
        Relationships: [];
      };
      learners: {
        Row: {
          id: string;
          tenant_id: string;
          batch_id: string;
          learner_no: string | null;
          uli: string | null;
          last_name: string;
          first_name: string;
          middle_name: string | null;
          extension_name: string | null;
          assessment_result: AssessmentResult;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          batch_id: string;
          learner_no?: string | null;
          uli?: string | null;
          last_name: string;
          first_name: string;
          middle_name?: string | null;
          extension_name?: string | null;
          assessment_result?: AssessmentResult;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['learners']['Insert']>;
        Relationships: [];
      };
      documents: {
        Row: {
          id: string;
          tenant_id: string;
          batch_id: string;
          requirement_id: string | null;
          document_key: string;
          document_name: string;
          status: DocumentStatus;
          audience: DocumentAudience;
          storage_path: string | null;
          external_url: string | null;
          notes: string | null;
          submitted_by: string | null;
          submitted_at: string | null;
          verified_by: string | null;
          verified_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          batch_id: string;
          requirement_id?: string | null;
          document_key: string;
          document_name: string;
          status?: DocumentStatus;
          audience?: DocumentAudience;
          storage_path?: string | null;
          external_url?: string | null;
          notes?: string | null;
          submitted_by?: string | null;
          submitted_at?: string | null;
          verified_by?: string | null;
          verified_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['documents']['Insert']>;
        Relationships: [];
      };
      lamr_reports: {
        Row: {
          id: string;
          tenant_id: string;
          batch_id: string;
          tvi_name: string;
          program_title: string;
          batch_section: string | null;
          module_title: string;
          schedule_text: string | null;
          prepared_by: string | null;
          approved_by: string | null;
          source_document_id: string | null;
          source_storage_path: string | null;
          source_external_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          batch_id: string;
          tvi_name: string;
          program_title: string;
          batch_section?: string | null;
          module_title: string;
          schedule_text?: string | null;
          prepared_by?: string | null;
          approved_by?: string | null;
          source_document_id?: string | null;
          source_storage_path?: string | null;
          source_external_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['lamr_reports']['Insert']>;
        Relationships: [];
      };
      lamr_outcomes: {
        Row: {
          id: string;
          tenant_id: string;
          lamr_report_id: string;
          outcome_code: string;
          outcome_title: string;
          hours: number | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          lamr_report_id: string;
          outcome_code: string;
          outcome_title: string;
          hours?: number | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['lamr_outcomes']['Insert']>;
        Relationships: [];
      };
      lamr_activities: {
        Row: {
          id: string;
          tenant_id: string;
          lamr_report_id: string;
          outcome_id: string;
          activity_code: string;
          activity_title: string;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          lamr_report_id: string;
          outcome_id: string;
          activity_code: string;
          activity_title: string;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['lamr_activities']['Insert']>;
        Relationships: [];
      };
      lamr_entries: {
        Row: {
          id: string;
          tenant_id: string;
          lamr_report_id: string;
          learner_id: string;
          activity_id: string;
          is_completed: boolean;
          assessment_result: AssessmentResult;
          notes: string | null;
          marked_by: string | null;
          marked_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          lamr_report_id: string;
          learner_id: string;
          activity_id: string;
          is_completed?: boolean;
          assessment_result?: AssessmentResult;
          notes?: string | null;
          marked_by?: string | null;
          marked_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['lamr_entries']['Insert']>;
        Relationships: [];
      };
      activity_log: {
        Row: {
          id: string;
          tenant_id: string;
          batch_id: string | null;
          profile_id: string | null;
          action: ActivityAction;
          entity_type: string;
          entity_id: string | null;
          summary: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          batch_id?: string | null;
          profile_id?: string | null;
          action: ActivityAction;
          entity_type: string;
          entity_id?: string | null;
          summary: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['activity_log']['Insert']>;
        Relationships: [];
      };
      trainer_credentials: {
        Row: {
          id: string;
          profile_id: string;
          credential_number: string | null;
          certified_nc_levels: string[];
          specialization: string | null;
          accreditation_expiry: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          credential_number?: string | null;
          certified_nc_levels?: string[];
          specialization?: string | null;
          accreditation_expiry?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['trainer_credentials']['Insert']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      ensure_profile_tenant_membership: {
        Args: {
          target_profile_id: string;
          target_tenant_id: string;
        };
        Returns: undefined;
      };
      current_user_is_platform_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      create_school: {
        Args: {
          p_code: string;
          p_name: string;
          p_region: string | null;
          p_school_type: string | null;
          p_tesda_provider_code: string | null;
          p_province: string | null;
          p_city_municipality: string | null;
          p_street_address: string | null;
          p_provider_type: string | null;
          p_provider_classification: string | null;
          p_qualifications: Json;
        };
        /** The new tenant's id. */
        Returns: string;
      };
    };
    Enums: {
      profile_role: ProfileRole;
      lifecycle_stage: LifecycleStage;
      batch_status: BatchStatus;
      document_status: DocumentStatus;
      document_audience: DocumentAudience;
      assessment_result: AssessmentResult;
      activity_action: ActivityAction;
    };
  };
}
