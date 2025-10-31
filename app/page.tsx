import { Youtube, MessageSquare, Zap, Search, Play } from "lucide-react";
import { YouTubeConnectCard } from "@/components/youtube/connect-card";
import { TelegramConnectCard } from "@/components/telegram/connect-card";
import { FeatureCard } from "@/components/feature-card";

export default function Home() {
  return (
    <main className="container mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Church YouTube Knowledge Bot
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Transform your sermon library into an AI-powered knowledge base. Connect → Process → Query.
        </p>
      </div>

      {/* Connection Cards */}
      <div className="grid md:grid-cols-2 gap-8 mb-16 max-w-5xl mx-auto">
        <YouTubeConnectCard />
        <TelegramConnectCard />
      </div>

      {/* Pipeline Visualization */}
      <div className="max-w-5xl mx-auto mb-16">
        <h2 className="text-2xl font-semibold text-center mb-8">
          Three-Stage Pipeline
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
              <Youtube className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">1. Connect</h3>
            <p className="text-gray-600 text-sm">
              Authorize YouTube channel access via OAuth
            </p>
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mb-4">
              <Zap className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">2. Process</h3>
            <p className="text-gray-600 text-sm">
              Generate transcripts and embeddings automatically
            </p>
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <MessageSquare className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">3. Query</h3>
            <p className="text-gray-600 text-sm">
              Ask questions via Telegram, get precise answers
            </p>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl font-semibold text-center mb-8">
          Features
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FeatureCard
            icon={<Play className="w-6 h-6" />}
            title="Auto-Sync Videos"
            description="Automatically fetches all videos from your YouTube channel daily"
          />
          <FeatureCard
            icon={<Search className="w-6 h-6" />}
            title="Semantic Search"
            description="Find sermon content by meaning, not just keywords"
          />
          <FeatureCard
            icon={<MessageSquare className="w-6 h-6" />}
            title="Telegram Bot"
            description="Answer questions from congregation members instantly"
          />
          <FeatureCard
            icon={<Zap className="w-6 h-6" />}
            title="Real-time Updates"
            description="See processing status update live in the dashboard"
          />
          <FeatureCard
            icon={<Youtube className="w-6 h-6" />}
            title="Timestamp Links"
            description="Every answer links to exact video moments"
          />
          <FeatureCard
            icon={<span className="text-2xl">🌍</span>}
            title="Multilingual"
            description="Supports Chinese and English throughout"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="text-center mt-16 text-sm text-gray-500">
        <p>Built with Next.js, Supabase, and OpenAI</p>
        <p className="mt-2">Multi-tenant • Secure • Scalable</p>
      </div>
    </main>
  );
}
