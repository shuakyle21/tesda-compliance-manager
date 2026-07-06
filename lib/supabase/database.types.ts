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
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['tenants']['Insert']>;
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
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
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
