/**
 * Supabase Database TypeScript Types
 * Generated from database schema migrations
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
      churches: {
        Row: {
          id: string
          name: string
          youtube_channel_id: string | null
          youtube_channel_name: string | null
          youtube_channel_thumbnail: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          youtube_channel_id?: string | null
          youtube_channel_name?: string | null
          youtube_channel_thumbnail?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          youtube_channel_id?: string | null
          youtube_channel_name?: string | null
          youtube_channel_thumbnail?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      oauth_tokens: {
        Row: {
          id: string
          church_id: string
          provider: string
          access_token: string
          refresh_token: string | null
          expires_at: string | null
          scope: string | null
          token_type: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          church_id: string
          provider: string
          access_token: string
          refresh_token?: string | null
          expires_at?: string | null
          scope?: string | null
          token_type?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          church_id?: string
          provider?: string
          access_token?: string
          refresh_token?: string | null
          expires_at?: string | null
          scope?: string | null
          token_type?: string
          created_at?: string
          updated_at?: string
        }
      }
      videos: {
        Row: {
          id: string
          church_id: string
          youtube_video_id: string
          title: string
          description: string | null
          thumbnail_url: string | null
          duration: number | null
          published_at: string | null
          status: string
          error_message: string | null
          caption_source: string | null
          has_embeddings: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          church_id: string
          youtube_video_id: string
          title: string
          description?: string | null
          thumbnail_url?: string | null
          duration?: number | null
          published_at?: string | null
          status?: string
          error_message?: string | null
          caption_source?: string | null
          has_embeddings?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          church_id?: string
          youtube_video_id?: string
          title?: string
          description?: string | null
          thumbnail_url?: string | null
          duration?: number | null
          published_at?: string | null
          status?: string
          error_message?: string | null
          caption_source?: string | null
          has_embeddings?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      transcripts: {
        Row: {
          id: string
          church_id: string
          video_id: string
          segment_index: number
          start_time: number
          end_time: number
          text: string
          language: string | null
          embedding: number[] | null
          created_at: string
        }
        Insert: {
          id?: string
          church_id: string
          video_id: string
          segment_index: number
          start_time: number
          end_time: number
          text: string
          language?: string | null
          embedding?: number[] | null
          created_at?: string
        }
        Update: {
          id?: string
          church_id?: string
          video_id?: string
          segment_index?: number
          start_time?: number
          end_time?: number
          text?: string
          language?: string | null
          embedding?: number[] | null
          created_at?: string
        }
      }
      processing_jobs: {
        Row: {
          id: string
          church_id: string
          video_id: string | null
          job_type: string
          status: string
          progress_message: string | null
          progress_percent: number
          error_message: string | null
          n8n_execution_id: string | null
          started_at: string | null
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          church_id: string
          video_id?: string | null
          job_type: string
          status?: string
          progress_message?: string | null
          progress_percent?: number
          error_message?: string | null
          n8n_execution_id?: string | null
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          church_id?: string
          video_id?: string | null
          job_type?: string
          status?: string
          progress_message?: string | null
          progress_percent?: number
          error_message?: string | null
          n8n_execution_id?: string | null
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      church_stats: {
        Row: {
          church_id: string
          church_name: string
          youtube_channel_name: string | null
          total_videos: number
          pending_videos: number
          processing_videos: number
          completed_videos: number
          indexed_videos: number
          failed_videos: number
          total_transcript_segments: number
          segments_with_embeddings: number
          embedding_coverage_percent: number
          church_created_at: string
          last_video_update: string | null
        }
      }
      embedding_stats: {
        Row: {
          total_transcripts: number
          transcripts_with_embeddings: number
          churches_with_embeddings: number
          videos_with_embeddings: number
          embedding_coverage_percent: number
        }
      }
    }
    Functions: {
      get_user_church_id: {
        Args: Record<string, never>
        Returns: string
      }
      is_token_expired: {
        Args: {
          token_expires_at: string
        }
        Returns: boolean
      }
      search_transcripts: {
        Args: {
          query_embedding: number[]
          match_church_id: string
          match_count?: number
        }
        Returns: {
          id: string
          video_id: string
          segment_index: number
          start_time: number
          end_time: number
          text: string
          language: string | null
          similarity: number
        }[]
      }
      rebuild_embedding_index: {
        Args: Record<string, never>
        Returns: string
      }
      get_tokens_needing_refresh: {
        Args: Record<string, never>
        Returns: {
          id: string
          church_id: string
          provider: string
          expires_at: string | null
        }[]
      }
      cleanup_old_processing_jobs: {
        Args: Record<string, never>
        Returns: number
      }
      get_video_processing_progress: {
        Args: {
          video_uuid: string
        }
        Returns: {
          video_id: string
          video_status: string
          current_job_type: string | null
          current_job_status: string | null
          current_progress_message: string | null
          current_progress_percent: number | null
          total_segments: number
          segments_with_embeddings: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
