'use client';

import { useState } from 'react';
import { VideoList } from '@/components/videos/video-list';
import { UserNav } from '@/components/auth/user-nav';
import { Button } from '@/components/ui/button';
import { Download, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function VideosPage() {
  const [selectedVideoIds, setSelectedVideoIds] = useState<string[]>([]);

  const handleSelectionChange = (videoIds: string[]) => {
    setSelectedVideoIds(videoIds);
  };

  const handleProcessSelected = () => {
    // This will be implemented in the next step
    // For now, just log the selected videos
    console.log('Processing videos:', selectedVideoIds);
    alert(`Selected ${selectedVideoIds.length} videos for processing. Audio extraction will be implemented next.`);
  };

  return (
    <main className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Video Library</h1>
            <p className="text-gray-600 mt-1">
              Manage and process your YouTube sermon videos
            </p>
          </div>
        </div>

        <UserNav />
      </div>

      {/* Video List */}
      <VideoList onSelectionChange={handleSelectionChange} />

      {/* Fixed action bar for selected videos */}
      {selectedVideoIds.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">
                  {selectedVideoIds.length} video{selectedVideoIds.length !== 1 ? 's' : ''} selected
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedVideoIds([])}
                >
                  Clear Selection
                </Button>
                <Button
                  onClick={handleProcessSelected}
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  Extract Audio ({selectedVideoIds.length})
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
