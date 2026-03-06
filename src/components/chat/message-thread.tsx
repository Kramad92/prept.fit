"use client";

import { useState, useEffect, useRef } from "react";
import { Send } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

interface Message {
  id: string;
  content: string;
  createdAt: string;
  isRead: boolean;
  sender: {
    id: string;
    name: string;
    role: string;
    avatar: string | null;
  };
}

interface MessageThreadProps {
  clientId: string;
  currentUserId: string;
}

export function MessageThread({ clientId, currentUserId }: MessageThreadProps) {
  const t = useT();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<NodeJS.Timeout>();

  async function loadMessages() {
    try {
      const res = await fetch(`/api/messages/${clientId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch {}
  }

  useEffect(() => {
    loadMessages().finally(() => setLoading(false));

    // Poll for new messages every 5 seconds
    pollRef.current = setInterval(loadMessages, 5000);
    return () => clearInterval(pollRef.current);
  }, [clientId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const res = await fetch(`/api/messages/${clientId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newMessage }),
      });

      if (res.ok) {
        const msg = await res.json();
        setMessages((prev) => [...prev, msg]);
        setNewMessage("");
      }
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-8">
            {t.messages.noMessages}
          </p>
        )}
        {messages.map((msg) => {
          const isOwn = msg.sender.id === currentUserId;
          return (
            <div
              key={msg.id}
              className={cn("flex gap-2", isOwn && "flex-row-reverse")}
            >
              <Avatar name={msg.sender.name} src={msg.sender.avatar} size="sm" />
              <div
                className={cn(
                  "max-w-[75%] rounded-2xl px-4 py-2",
                  isOwn
                    ? "bg-brand-600 text-white"
                    : "bg-gray-100 text-gray-900"
                )}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                <p
                  className={cn(
                    "mt-1 text-xs",
                    isOwn ? "text-white/60" : "text-gray-400"
                  )}
                >
                  {new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="border-t border-gray-200 bg-white p-4"
      >
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={t.messages.typeMessage}
            className="input flex-1"
            autoFocus
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="btn-primary !p-2.5"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
