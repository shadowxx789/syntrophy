/**
 * Supabase Database Types
 * 凝序 Syntropy - Phase 5: User System
 *
 * Auto-generated types for Supabase tables
 * Regenerate with: npx supabase gen types typescript --project-id YOUR_PROJECT_ID
 */

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      projects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          display_order: number;
          color: string | null;
          is_archived: boolean;
          version: number;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id: string;
          user_id: string;
          name: string;
          display_order?: number;
          color?: string | null;
          is_archived?: boolean;
          version?: number;
          created_at: string;
          updated_at: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          display_order?: number;
          color?: string | null;
          is_archived?: boolean;
          version?: number;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      tasks: {
        Row: {
          id: string;
          user_id: string;
          project_id: string;
          content: string;
          start_date: string | null;
          end_date: string | null;
          status: "pending" | "in_progress" | "completed" | "delayed";
          pic: string | null;
          completed_date: string | null;
          remark: string | null;
          raw_command: string | null;
          version: number;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id: string;
          user_id: string;
          project_id: string;
          content: string;
          start_date?: string | null;
          end_date?: string | null;
          status?: "pending" | "in_progress" | "completed" | "delayed";
          pic?: string | null;
          completed_date?: string | null;
          remark?: string | null;
          raw_command?: string | null;
          version?: number;
          created_at: string;
          updated_at: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          project_id?: string;
          content?: string;
          start_date?: string | null;
          end_date?: string | null;
          status?: "pending" | "in_progress" | "completed" | "delayed";
          pic?: string | null;
          completed_date?: string | null;
          remark?: string | null;
          raw_command?: string | null;
          version?: number;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      sync_metadata: {
        Row: {
          user_id: string;
          last_sync_at: string | null;
          device_id: string | null;
          sync_version: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          last_sync_at?: string | null;
          device_id?: string | null;
          sync_version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          last_sync_at?: string | null;
          device_id?: string | null;
          sync_version?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_changes_since: {
        Args: {
          p_user_id: string;
          p_since: string;
        };
        Returns: {
          entity_type: string;
          entity_id: string;
          data: Record<string, unknown>;
          is_deleted: boolean;
        }[];
      };
    };
    Enums: Record<string, never>;
  };
}

/**
 * Helper types for easier usage
 */
export type UserProfile = Database["public"]["Tables"]["user_profiles"]["Row"];
export type Project = Database["public"]["Tables"]["projects"]["Row"];
export type Task = Database["public"]["Tables"]["tasks"]["Row"];
export type SyncMetadata = Database["public"]["Tables"]["sync_metadata"]["Row"];

export type InsertProject = Database["public"]["Tables"]["projects"]["Insert"];
export type InsertTask = Database["public"]["Tables"]["tasks"]["Insert"];

export type UpdateProject = Database["public"]["Tables"]["projects"]["Update"];
export type UpdateTask = Database["public"]["Tables"]["tasks"]["Update"];
