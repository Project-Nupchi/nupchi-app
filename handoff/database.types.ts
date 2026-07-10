// Supabase Database 타입 — supabase gen types 포맷.
// 소스: supabase/schema.sql + migrations/20260710020000_frontend_contract_v2.sql (2026-07-10 적용분).
// 스키마 변경 시 이 파일도 갱신할 것. (공식 재생성: npx supabase gen types typescript --project-id <ref>)

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
      farms: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
        }
        Relationships: []
      }
      farm_members: {
        Row: {
          farm_id: string
          user_id: string
          role: string
        }
        Insert: {
          farm_id: string
          user_id: string
          role: string
        }
        Update: {
          farm_id?: string
          user_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "farm_members_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      tank_groups: {
        Row: {
          id: string
          farm_id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          farm_id: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          farm_id?: string
          name?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tank_groups_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      tanks: {
        Row: {
          id: string
          tank_group_id: string
          farm_id: string
          code: string
          stocked_at: string | null
          stocked_info: string | null
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          tank_group_id: string
          farm_id: string
          code: string
          stocked_at?: string | null
          stocked_info?: string | null
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          tank_group_id?: string
          farm_id?: string
          code?: string
          stocked_at?: string | null
          stocked_info?: string | null
          active?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tanks_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tanks_tank_group_id_fkey"
            columns: ["tank_group_id"]
            isOneToOne: false
            referencedRelation: "tank_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      photos: {
        Row: {
          id: string
          farm_id: string
          tank_id: string
          storage_path: string
          captured_at: string
        }
        Insert: {
          id?: string
          farm_id: string
          tank_id: string
          storage_path: string
          captured_at?: string
        }
        Update: {
          id?: string
          farm_id?: string
          tank_id?: string
          storage_path?: string
          captured_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "photos_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_tank_id_fkey"
            columns: ["tank_id"]
            isOneToOne: false
            referencedRelation: "tanks"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_results: {
        Row: {
          id: string
          farm_id: string
          tank_id: string
          photo_id: string
          request_id: string
          grade: string
          fish_count: number
          suspect_count: number
          affected_ratio: number
          fish: Json
          model_version: string
          created_at: string
        }
        Insert: {
          id?: string
          farm_id: string
          tank_id: string
          photo_id: string
          request_id: string
          grade: string
          fish_count: number
          suspect_count: number
          affected_ratio: number
          fish: Json
          model_version: string
          created_at?: string
        }
        Update: {
          id?: string
          farm_id?: string
          tank_id?: string
          photo_id?: string
          request_id?: string
          grade?: string
          fish_count?: number
          suspect_count?: number
          affected_ratio?: number
          fish?: Json
          model_version?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_results_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_results_tank_id_fkey"
            columns: ["tank_id"]
            isOneToOne: false
            referencedRelation: "tanks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_results_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: true
            referencedRelation: "photos"
            referencedColumns: ["id"]
          },
        ]
      }
      guidance_docs: {
        Row: {
          id: string
          source: string
          title: string
          content: string
          embedding: string | null
        }
        Insert: {
          id?: string
          source: string
          title: string
          content: string
          embedding?: string | null
        }
        Update: {
          id?: string
          source?: string
          title?: string
          content?: string
          embedding?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      tank_latest_grade: {
        Row: {
          tank_id: string | null
          farm_id: string | null
          tank_group_id: string | null
          tank_code: string | null
          active: boolean | null
          grade: string | null
          suspect_count: number | null
          fish_count: number | null
          affected_ratio: number | null
          ai_result_id: string | null
          diagnosed_at: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      app_is_farm_member: {
        Args: { target_farm: string }
        Returns: boolean
      }
      match_guidance_docs: {
        Args: { query_embedding: string; match_count?: number }
        Returns: {
          source: string
          title: string
          content: string
          similarity: number
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

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"]
export type Views<T extends keyof Database["public"]["Views"]> =
  Database["public"]["Views"][T]["Row"]
