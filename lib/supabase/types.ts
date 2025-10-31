/**
 * Supabase Database TypeScript Types
 *
 * This file will be auto-generated after running database migrations.
 * To generate types, run:
 *   npx supabase gen types typescript --project-id cwiehstggqlxafglkkda > lib/supabase/types.ts
 *
 * For now, we use a placeholder type.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      // Tables will be auto-generated after migrations
      [key: string]: {
        Row: Record<string, any>
        Insert: Record<string, any>
        Update: Record<string, any>
      }
    }
    Views: {
      [key: string]: {
        Row: Record<string, any>
      }
    }
    Functions: {
      [key: string]: {
        Args: Record<string, any>
        Returns: any
      }
    }
    Enums: {
      [key: string]: string
    }
  }
}
