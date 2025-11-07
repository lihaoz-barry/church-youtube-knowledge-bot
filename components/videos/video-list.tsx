'use client';

import { useState, useEffect } from 'react';
import { Play, Clock, Calendar, CheckSquare, Square, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

interface Video {
  id: string;
  youtube_video_id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  duration: number;
  published_at: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
}

interface VideoListProps {
  onSelectionChange?: (selectedVideoIds: string[]) => void;
}

export function VideoList({ onSelectionChange }: VideoListProps) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Fetch videos from database
  const fetchVideos = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/videos/list');

      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error || 'Failed to fetch videos');
      }

      const { videos: fetchedVideos } = await response.json();
      setVideos(fetchedVideos);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load videos');
    } finally {
      setIsLoading(false);
    }
  };

  // Sync videos from YouTube
  const handleSyncVideos = async () => {
    try {
      setIsSyncing(true);
      setSyncMessage(null);
      setError(null);

      const response = await fetch('/api/videos/sync', {
        method: 'POST',
      });

      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error || 'Failed to sync videos');
      }

      const { message, synced } = await response.json();
      setSyncMessage(message);

      // Refresh video list after sync
      await fetchVideos();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync videos');
    } finally {
      setIsSyncing(false);
    }
  };

  // Toggle video selection
  const toggleVideoSelection = (videoId: string) => {
    setSelectedVideos(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(videoId)) {
        newSelection.delete(videoId);
      } else {
        newSelection.add(videoId);
      }

      // Notify parent component of selection change
      onSelectionChange?.(Array.from(newSelection));

      return newSelection;
    });
  };

  // Select all videos
  const selectAll = () => {
    const allVideoIds = videos.map(v => v.id);
    setSelectedVideos(new Set(allVideoIds));
    onSelectionChange?.(allVideoIds);
  };

  // Deselect all videos
  const deselectAll = () => {
    setSelectedVideos(new Set());
    onSelectionChange?.([]);
  };

  // Format duration (seconds to HH:MM:SS)
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Format date
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Load videos on mount
  useEffect(() => {
    fetchVideos();
  }, []);

  return (
    <div className="space-y-4">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-semibold">Your Videos</h2>
          {videos.length > 0 && (
            <span className="text-sm text-gray-500">
              {selectedVideos.size} of {videos.length} selected
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {videos.length > 0 && (
            <>
              {selectedVideos.size === videos.length ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={deselectAll}
                >
                  <Square className="w-4 h-4 mr-2" />
                  Deselect All
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAll}
                >
                  <CheckSquare className="w-4 h-4 mr-2" />
                  Select All
                </Button>
              )}
            </>
          )}

          <Button
            onClick={handleSyncVideos}
            disabled={isSyncing}
            size="sm"
          >
            {isSyncing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync from YouTube
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Success message */}
      {syncMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">{syncMessage}</p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : videos.length === 0 ? (
        /* Empty state */
        <div className="text-center py-12 border border-dashed border-gray-300 rounded-lg">
          <Play className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No videos yet</h3>
          <p className="text-sm text-gray-500 mb-4">
            Sync your YouTube videos to get started
          </p>
          <Button onClick={handleSyncVideos} disabled={isSyncing}>
            {isSyncing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync from YouTube
              </>
            )}
          </Button>
        </div>
      ) : (
        /* Video list */
        <div className="space-y-3">
          {videos.map(video => (
            <div
              key={video.id}
              className={`flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors ${
                selectedVideos.has(video.id)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200'
              }`}
              onClick={() => toggleVideoSelection(video.id)}
            >
              {/* Checkbox */}
              <div className="flex items-center pt-1">
                <Checkbox
                  checked={selectedVideos.has(video.id)}
                  onCheckedChange={() => toggleVideoSelection(video.id)}
                  onClick={e => e.stopPropagation()}
                />
              </div>

              {/* Thumbnail */}
              {video.thumbnail_url && (
                <img
                  src={video.thumbnail_url}
                  alt={video.title}
                  className="w-32 h-20 object-cover rounded flex-shrink-0"
                />
              )}

              {/* Video info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 mb-1 line-clamp-2">
                  {video.title}
                </h3>

                {video.description && (
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                    {video.description}
                  </p>
                )}

                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDuration(video.duration)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(video.published_at)}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    video.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : video.status === 'processing'
                      ? 'bg-blue-100 text-blue-800'
                      : video.status === 'failed'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {video.status.charAt(0).toUpperCase() + video.status.slice(1)}
                  </span>
                </div>
              </div>

              {/* YouTube link */}
              <a
                href={`https://www.youtube.com/watch?v=${video.youtube_video_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 p-2 text-gray-400 hover:text-blue-600 transition-colors"
                onClick={e => e.stopPropagation()}
              >
                <Play className="w-5 h-5" />
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
