"use client";

import { useState } from "react";
import { Youtube, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function YouTubeConnectCard() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleConnect = async () => {
    setIsLoading(true);
    // Simulate OAuth flow
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsConnected(true);
    setIsLoading(false);
  };

  return (
    <Card className="hover:shadow-xl transition-shadow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <Youtube className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <CardTitle>YouTube Channel</CardTitle>
              <CardDescription>Connect your sermon library</CardDescription>
            </div>
          </div>
          {isConnected && (
            <CheckCircle2 className="w-6 h-6 text-green-600" />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isConnected ? (
          <>
            <p className="text-sm text-gray-600">
              Authorize access to your YouTube channel to automatically sync sermon videos.
            </p>
            <ul className="text-sm text-gray-600 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Fetches all videos automatically</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Syncs daily at midnight</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Secure OAuth 2.0 authentication</span>
              </li>
            </ul>
            <Button
              onClick={handleConnect}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? "Connecting..." : "Connect YouTube"}
            </Button>
          </>
        ) : (
          <>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span className="font-medium text-green-900">Connected</span>
              </div>
              <p className="text-sm text-green-700">
                Connected as: <span className="font-medium">@YourChurchChannel</span>
              </p>
              <p className="text-xs text-green-600 mt-1">
                Last synced: Just now
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-2xl font-bold text-gray-900">47</div>
                <div className="text-xs text-gray-600">Videos</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-2xl font-bold text-blue-600">12</div>
                <div className="text-xs text-gray-600">Pending</div>
              </div>
            </div>
            <Button variant="outline" className="w-full">
              View Video Library →
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
