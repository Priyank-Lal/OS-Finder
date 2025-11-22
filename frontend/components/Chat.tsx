"use client"

import React, { useState, useEffect, useRef } from 'react';
import { sendChatMessage } from '@/api/api';
import RepoCard from './RepoCard';
import RepoDetailCard from './RepoDetailCard';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Chat component that talks to the OS‑Finder multi‑agent backend.
 * It sends the user message to `/api/agent/chat` and displays the
 * formatted response returned by the supervisor.
 * Uses threadId for conversation persistence with MemorySaver.
 */
export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [threadId, setThreadId] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Generate a unique thread ID on component mount
  useEffect(() => {
    const newThreadId = `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setThreadId(newThreadId);
  }, []);

  // Scroll to the newest message when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg: Message = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const response = await sendChatMessage(
        userMsg.content,
        threadId // Send threadId for conversation persistence
      );
      const assistantMsg: Message = {
        role: 'assistant',
        content: response.response || 'No response',
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error('Chat error:', err);
      const errorMsg: Message = {
        role: 'assistant',
        content: err.response?.data?.error || '❌ Something went wrong. Please try again.',
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const MessageContent = ({ content }: { content: string }) => {
    // Try to parse as JSON for repo cards or detail view
    try {
      const trimmed = content.trim();
      
      // Handle JSON array (Finder results)
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        const data = JSON.parse(trimmed);
        if (Array.isArray(data) && data.length > 0 && data[0].id && data[0].name) {
          return (
            <div className="space-y-2 mt-2">
              {data.map((repo: any) => (
                <RepoCard key={repo.id} repo={repo} />
              ))}
            </div>
          );
        }
      }
      
      // Handle JSON object (Analyst detail)
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        const data = JSON.parse(trimmed);
        if (data.id && data.name) {
          return (
            <div className="mt-2">
              <RepoDetailCard repo={data} />
            </div>
          );
        }
      }
    } catch (e) {
      // Not JSON or invalid format, fall back to text rendering
    }

    // Parse and render formatted content (Markdown-like)
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeLines: string[] = [];

    lines.forEach((line, idx) => {
      // Code block detection
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          // End code block
          elements.push(
            <pre key={`code-${idx}`} className="bg-gray-900 p-2 rounded mt-2 mb-2 overflow-x-auto">
              <code className="text-xs text-green-400">{codeLines.join('\n')}</code>
            </pre>
          );
          codeLines = [];
          inCodeBlock = false;
        } else {
          // Start code block
          inCodeBlock = true;
        }
        return;
      }

      if (inCodeBlock) {
        codeLines.push(line);
        return;
      }

      // List items
      if (line.match(/^[\s]*[-*•]\s/)) {
        elements.push(
          <div key={idx} className="flex gap-2 my-1">
            <span className="text-indigo-400">•</span>
            <span>{line.replace(/^[\s]*[-*•]\s/, '')}</span>
          </div>
        );
        return;
      }

      // Numbered lists
      if (line.match(/^[\s]*\d+\.\s/)) {
        elements.push(
          <div key={idx} className="flex gap-2 my-1">
            <span className="text-indigo-400">{line.match(/^\d+/)?.[0]}.</span>
            <span>{line.replace(/^[\s]*\d+\.\s/, '')}</span>
          </div>
        );
        return;
      }

      // Links (markdown style)
      const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
      if (linkRegex.test(line)) {
        const parts = line.split(linkRegex);
        const rendered = parts.map((part, i) => {
          if (i % 3 === 1) return <span key={i} className="text-indigo-300 underline">{part}</span>;
          if (i % 3 === 2) return null; // Skip URLs
          return part;
        });
        elements.push(<p key={idx} className="my-1">{rendered}</p>);
        return;
      }

      // Bold text
      if (line.includes('**')) {
        const parts = line.split('**');
        const rendered = parts.map((part, i) => 
          i % 2 === 1 ? <strong key={i} className="font-bold">{part}</strong> : part
        );
        elements.push(<p key={idx} className="my-1">{rendered}</p>);
        return;
      }

      // Regular line
      if (line.trim()) {
        elements.push(<p key={idx} className="my-1">{line}</p>);
      } else {
        elements.push(<br key={idx} />);
      }
    });

    return <div className="whitespace-pre-wrap">{elements}</div>;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="px-4 py-3 flex items-center justify-between bg-gray-900/50 backdrop-blur-md border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="font-semibold text-sm">OS‑Finder Assistant</span>
        </div>
      </header>

      {/* Message list */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-2 opacity-50">
            <p className="text-sm">Ask me anything about open source repos!</p>
          </div>
        )}
        
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-indigo-600 text-white self-end ml-auto rounded-tr-none'
                : 'bg-gray-800 text-gray-200 self-start mr-auto rounded-tl-none border border-gray-700'
            }`}
          >
            <MessageContent content={msg.content} />
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 rounded-2xl rounded-tl-none p-3 border border-gray-700">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </main>

      {/* Input area */}
      <footer className="p-3 bg-gray-900/50 backdrop-blur-md border-t border-gray-800">
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="w-full rounded-xl pl-4 pr-12 py-3 bg-gray-900 text-sm text-white placeholder-gray-500 border border-gray-800 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="absolute right-2 p-1.5 bg-indigo-600 rounded-lg text-white hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
            </svg>
          </button>
        </div>
      </footer>
    </div>
  );
}
