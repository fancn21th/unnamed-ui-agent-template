"use client";

import dynamic from "next/dynamic";

const ChatPageClient = dynamic(() => import("./ChatPageClient"), {
  ssr: false,
  loading: () => <div className="h-screen bg-gray-50" />,
});

export default function ChatPageEntry() {
  return <ChatPageClient />;
}

