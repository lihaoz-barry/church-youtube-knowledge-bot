"use client";

import { useState } from "react";
import { MessageSquare, CheckCircle2, Lock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function TelegramConnectCard() {
  const [isConnected, setIsConnected] = useState(false);

  return (
    <Card className="hover:shadow-xl transition-shadow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <MessageSquare className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <CardTitle>Telegram Bot</CardTitle>
              <CardDescription>Enable AI-powered Q&A</CardDescription>
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
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-2">
              <Lock className="w-4 h-4 text-yellow-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-900">Prerequisites Required</p>
                <p className="text-yellow-700 mt-1">
                  Connect YouTube and process at least one video first.
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              Create a Telegram bot via @BotFather and connect it here to enable Q&A.
            </p>
            <ul className="text-sm text-gray-600 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-purple-600 mt-0.5">•</span>
                <span>Answer questions based on sermons</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 mt-0.5">•</span>
                <span>Provide video timestamp links</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 mt-0.5">•</span>
                <span>Multi-language support</span>
              </li>
            </ul>
            <Button disabled className="w-full">
              Connect Telegram Bot (Coming Soon)
            </Button>
          </>
        ) : (
          <>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span className="font-medium text-green-900">Bot Active</span>
              </div>
              <p className="text-sm text-green-700">
                Bot: <span className="font-medium">@YourChurchBot</span>
              </p>
              <p className="text-xs text-green-600 mt-1">
                Ready to answer questions
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-2xl font-bold text-gray-900">156</div>
                <div className="text-xs text-gray-600">Queries</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-2xl font-bold text-purple-600">2.3s</div>
                <div className="text-xs text-gray-600">Avg Response</div>
              </div>
            </div>
            <Button variant="outline" className="w-full">
              View Analytics →
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
