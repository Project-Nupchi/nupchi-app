export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      farms: {
        Row: {
          created_at: string;
          id: string;
          name: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      tank_groups: {
        Row: {
          created_at: string;
          farm_id: string;
          id: string;
          name: string;
        };
        Insert: {
          created_at?: string;
          farm_id: string;
          id?: string;
          name: string;
        };
        Update: {
          created_at?: string;
          farm_id?: string;
          id?: string;
          name?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'tank_groups_farm_id_fkey';
            columns: ['farm_id'];
            isOneToOne: false;
            referencedRelation: 'farms';
            referencedColumns: ['id'];
          },
        ];
      };
      tanks: {
        Row: {
          active: boolean | null;
          code: string;
          created_at: string;
          farm_id: string;
          id: string;
          stocked_at: string | null;
          stocked_info: string | null;
          tank_group_id: string;
        };
        Insert: {
          active?: boolean;
          code: string;
          created_at?: string;
          farm_id: string;
          id?: string;
          stocked_at?: string | null;
          stocked_info?: string | null;
          tank_group_id: string;
        };
        Update: {
          active?: boolean;
          code?: string;
          created_at?: string;
          farm_id?: string;
          id?: string;
          stocked_at?: string | null;
          stocked_info?: string | null;
          tank_group_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'tanks_farm_id_fkey';
            columns: ['farm_id'];
            isOneToOne: false;
            referencedRelation: 'farms';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tanks_tank_group_id_fkey';
            columns: ['tank_group_id'];
            isOneToOne: false;
            referencedRelation: 'tank_groups';
            referencedColumns: ['id'];
          },
        ];
      };
      photos: {
        Row: {
          captured_at: string;
          daily_record_id: string | null;
          farm_id: string;
          id: string;
          storage_path: string;
          tank_id: string | null;
        };
        Insert: {
          captured_at?: string;
          daily_record_id?: string | null;
          farm_id: string;
          id?: string;
          storage_path: string;
          tank_id?: string | null;
        };
        Update: {
          captured_at?: string;
          daily_record_id?: string | null;
          farm_id?: string;
          id?: string;
          storage_path?: string;
          tank_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'photos_daily_record_id_fkey';
            columns: ['daily_record_id'];
            isOneToOne: false;
            referencedRelation: 'daily_records';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'photos_farm_id_fkey';
            columns: ['farm_id'];
            isOneToOne: false;
            referencedRelation: 'farms';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'photos_tank_id_fkey';
            columns: ['tank_id'];
            isOneToOne: false;
            referencedRelation: 'tanks';
            referencedColumns: ['id'];
          },
        ];
      };
      ai_results: {
        Row: {
          affected_ratio: number | null;
          created_at: string;
          detections: Json | null;
          diseases: Json | null;
          farm_id: string;
          fish: Json | null;
          fish_count: number | null;
          grade: string;
          id: string;
          model_version: string | null;
          photo_id: string;
          request_id: string | null;
          suspect_count: number | null;
          tank_id: string | null;
        };
        Insert: {
          affected_ratio?: number | null;
          created_at?: string;
          detections?: Json | null;
          diseases?: Json | null;
          farm_id: string;
          fish?: Json | null;
          fish_count?: number | null;
          grade: string;
          id?: string;
          model_version?: string | null;
          photo_id: string;
          request_id?: string | null;
          suspect_count?: number | null;
          tank_id?: string | null;
        };
        Update: {
          affected_ratio?: number | null;
          created_at?: string;
          detections?: Json | null;
          diseases?: Json | null;
          farm_id?: string;
          fish?: Json | null;
          fish_count?: number | null;
          grade?: string;
          id?: string;
          model_version?: string | null;
          photo_id?: string;
          request_id?: string | null;
          suspect_count?: number | null;
          tank_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'ai_results_farm_id_fkey';
            columns: ['farm_id'];
            isOneToOne: false;
            referencedRelation: 'farms';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ai_results_photo_id_fkey';
            columns: ['photo_id'];
            isOneToOne: true;
            referencedRelation: 'photos';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ai_results_tank_id_fkey';
            columns: ['tank_id'];
            isOneToOne: false;
            referencedRelation: 'tanks';
            referencedColumns: ['id'];
          },
        ];
      };
      daily_records: {
        Row: {
          farm_id: string;
          id: string;
          recorded_at: string;
          recorded_by: string;
          tank_id: string;
        };
        Insert: {
          farm_id: string;
          id?: string;
          recorded_at?: string;
          recorded_by: string;
          tank_id: string;
        };
        Update: {
          farm_id?: string;
          id?: string;
          recorded_at?: string;
          recorded_by?: string;
          tank_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'daily_records_farm_id_fkey';
            columns: ['farm_id'];
            isOneToOne: false;
            referencedRelation: 'farms';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'daily_records_tank_id_fkey';
            columns: ['tank_id'];
            isOneToOne: false;
            referencedRelation: 'tanks';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};

export type TableName = keyof Database['public']['Tables'];
export type TableRow<Name extends TableName> = Database['public']['Tables'][Name]['Row'];
export type TableInsert<Name extends TableName> = Database['public']['Tables'][Name]['Insert'];
export type TableUpdate<Name extends TableName> = Database['public']['Tables'][Name]['Update'];
