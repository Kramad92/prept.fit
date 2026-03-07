"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import { MessageBubble } from "./message-bubble";
import { ChatInput } from "./chat-input";
import { getPusherClient, getChatChannel } from "@/lib/pusher-client";
import { useT } from "@/lib/i18n";

interface Message {
  id: string;
  content: string;
  createdAt: string;
  isRead: boolean;
  attachmentUrl?: string | null;
  attachmentType?: string | null;
  attachmentName?: string | null;
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
  tenantId: string;
}

function formatDateSeparator(date: Date): string {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "EEEE, MMMM d, yyyy");
}

export function MessageThread({ clientId, currentUserId, tenantId }: MessageThreadProps) {
  const t = useT();
  const [messages, setMessages] = useState<Message[]>([]);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<NodeJS.Timeout>();
  const isAtBottomRef = useRef(true);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    bottomRef.current?.scrollIntoView({ behavior });
  }, []);

  const loadMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/messages/${clientId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch {
      // Silently fail — will retry on next poll
    }
  }, [clientId]);

  // Initial load
  useEffect(() => {
    loadMessages().finally(() => setLoading(false));
  }, [loadMessages]);

  // Scroll to bottom on initial load and new messages
  useEffect(() => {
    if (isAtBottomRef.current) {
      scrollToBottom(loading ? "instant" : "smooth");
    }
  }, [messages.length, loading, scrollToBottom]);

  // Track scroll position to avoid auto-scrolling when user scrolled up
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    function handleScroll() {
      const el = container!;
      isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    }
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  // Real-time via Pusher, fallback to polling
  useEffect(() => {
    const pusher = getPusherClient();

    if (pusher) {
      const channel = pusher.subscribe(getChatChannel(tenantId, clientId));
      channel.bind("new-message", (msg: Message) => {
        // Don't add our own messages (we already added them optimistically)
        if (msg.sender.id !== currentUserId) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
      });
      channel.bind("message-read", () => {
        // Mark all our sent messages as read
        setMessages((prev) =>
          prev.map((m) =>
            m.sender.id === currentUserId && !m.isRead ? { ...m, isRead: true } : m
          )
        );
      });

      return () => {
        channel.unbind_all();
        pusher.unsubscribe(getChatChannel(tenantId, clientId));
      };
    }

    // Fallback: poll every 3 seconds
    pollRef.current = setInterval(loadMessages, 3000);
    return () => clearInterval(pollRef.current);
  }, [clientId, currentUserId, tenantId, loadMessages]);

  async function handleSend(content: string, attachment?: { file: File; type: "image" | "file" }) {
    if (sending) return;
    setSending(true);

    try {
      let attachmentUrl: string | undefined;
      let attachmentType: string | undefined;
      let attachmentName: string | undefined;

      // Upload attachment first if present
      if (attachment) {
        const formData = new FormData();
        formData.append("file", attachment.file);
        formData.append("folder", "messages");

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) throw new Error("Upload failed");

        const { url } = await uploadRes.json();
        attachmentUrl = url;
        attachmentType = attachment.type;
        attachmentName = attachment.file.name;
      }

      // Optimistic message
      const optimisticId = `temp-${Date.now()}`;
      const optimisticMsg: Message = {
        id: optimisticId,
        content,
        createdAt: new Date().toISOString(),
        isRead: false,
        attachmentUrl: attachmentUrl || null,
        attachmentType: attachmentType || null,
        attachmentName: attachmentName || null,
        sender: { id: currentUserId, name: "", role: "", avatar: null },
      };
      setMessages((prev) => [...prev, optimisticMsg]);
      isAtBottomRef.current = true;

      const res = await fetch(`/api/messages/${clientId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          ...(attachmentUrl && { attachmentUrl, attachmentType, attachmentName }),
        }),
      });

      if (res.ok) {
        const msg = await res.json();
        // Replace optimistic message with real one
        setMessages((prev) => prev.map((m) => (m.id === optimisticId ? msg : m)));
      } else {
        // Remove optimistic message on failure
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      }
    } catch {
      // Remove any optimistic message
      setMessages((prev) => prev.filter((m) => !m.id.startsWith("temp-")));
    } finally {
      setSending(false);
    }
  }

  // Group messages by date for separators
  function renderMessages() {
    const elements: React.ReactNode[] = [];
    let lastDate: Date | null = null;

    messages.forEach((msg, i) => {
      const msgDate = new Date(msg.createdAt);
      const nextMsg = messages[i + 1];

      // Date separator
      if (!lastDate || !isSameDay(lastDate, msgDate)) {
        elements.push(
          <div key={`date-${msg.id}`} className="flex items-center gap-3 py-4 px-4">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs font-medium text-gray-400">
              {formatDateSeparator(msgDate)}
            </span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>
        );
        lastDate = msgDate;
      }

      // Show avatar if this is the last message from this sender in a group
      const showAvatar =
        !nextMsg ||
        nextMsg.sender.id !== msg.sender.id ||
        !isSameDay(new Date(nextMsg.createdAt), msgDate);

      elements.push(
        <MessageBubble
          key={msg.id}
          message={msg}
          isOwn={msg.sender.id === currentUserId}
          showAvatar={showAvatar}
        />
      );
    });

    return elements;
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Messages area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto pb-2"
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4">
            <div className="rounded-full bg-gray-100 p-4">
              <svg className="h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-sm text-gray-400">{t.messages.noMessages}</p>
          </div>
        ) : (
          <div className="space-y-1 py-2">
            {renderMessages()}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <ChatInput onSend={handleSend} disabled={sending} />
    </div>
  );
}
