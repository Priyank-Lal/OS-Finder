"use client"

import React, { useState } from 'react';
import { MessageSquare, X } from 'lucide-react';
import Chat from '@/components/Chat';

/**
 * Floating chat widget that appears as a circular button in the bottom‑right corner.
 * Clicking the button opens a modal containing the full Chat component.
 */
export default function ChatWidget() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className={`fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-2xl transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
          open 
            ? 'bg-gray-800 rotate-90' 
            : 'bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500'
        }`}
        aria-label={open ? "Close chat" : "Open chat assistant"}
        title="Chat with OS‑Finder"
      >
        {open ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
      </button>

      {/* Chat Panel */}
      <div
        className={`fixed bottom-24 right-6 z-40 w-[400px] max-w-[calc(100vw-3rem)] h-[600px] max-h-[calc(100vh-8rem)] bg-gray-950 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ease-in-out origin-bottom-right ${
          open
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-95 translate-y-4 pointer-events-none'
        }`}
      >
        <Chat />
      </div>
    </>
  );
}
