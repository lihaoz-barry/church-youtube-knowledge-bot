import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/components/providers/query-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Church YouTube Knowledge Bot",
  description: "Transform your church's YouTube sermon library into an AI-powered knowledge base",
  keywords: ["church", "sermon", "youtube", "ai", "knowledge base", "telegram", "search"],
  authors: [{ name: "Church YouTube Knowledge Bot" }],
  openGraph: {
    title: "Church YouTube Knowledge Bot",
    description: "Transform your church's YouTube sermon library into an AI-powered knowledge base",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <QueryProvider>
          <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
            {children}
          </div>
        </QueryProvider>
      </body>
    </html>
  );
}
