"use client";

import { Check, CheckCheck, Download, FileText } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface MessageData {
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

interface MessageBubbleProps {
  message: MessageData;
  isOwn: boolean;
  showAvatar: boolean;
}

export function MessageBubble({ message, isOwn, showAvatar }: MessageBubbleProps) {
  const hasText = message.content.trim().length > 0;
  const hasAttachment = !!message.attachmentUrl;
  const isImage = message.attachmentType === "image";

  return (
    <div className={cn("flex gap-2 px-4", isOwn ? "flex-row-reverse" : "flex-row")}>
      {/* Avatar spacer or actual avatar */}
      <div className="w-8 shrink-0">
        {showAvatar && (
          <Avatar name={message.sender.name} src={message.sender.avatar} size="sm" />
        )}
      </div>

      <div className={cn("flex max-w-[70%] flex-col", isOwn ? "items-end" : "items-start")}>
        {/* Attachment */}
        {hasAttachment && isImage && (
          <a
            href={message.attachmentUrl!}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "mb-1 block overflow-hidden rounded-2xl",
              hasText ? "rounded-b-lg" : ""
            )}
          >
            <img
              src={message.attachmentUrl!}
              alt={message.attachmentName || "Image"}
              className="max-h-64 max-w-full rounded-2xl object-cover"
              loading="lazy"
            />
          </a>
        )}
        {hasAttachment && !isImage && (
          <a
            href={message.attachmentUrl!}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "mb-1 flex items-center gap-2 rounded-2xl px-4 py-3 transition-opacity hover:opacity-80",
              isOwn ? "bg-brand-700 text-white" : "bg-gray-100 text-gray-900"
            )}
          >
            <FileText className="h-5 w-5 shrink-0" />
            <span className="min-w-0 truncate text-sm font-medium">
              {message.attachmentName || "File"}
            </span>
            <Download className="h-4 w-4 shrink-0 opacity-60" />
          </a>
        )}

        {/* Text bubble */}
        {hasText && (
          <div
            className={cn(
              "rounded-2xl px-4 py-2",
              isOwn
                ? "bg-brand-600 text-white"
                : "bg-gray-100 text-gray-900"
            )}
          >
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
          </div>
        )}

        {/* Timestamp + read status */}
        <div className={cn("mt-1 flex items-center gap-1", isOwn ? "flex-row-reverse" : "")}>
          <span className="text-[11px] text-gray-400">
            {new Date(message.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          {isOwn && (
            message.isRead ? (
              <CheckCheck className="h-3.5 w-3.5 text-brand-500" />
            ) : (
              <Check className="h-3.5 w-3.5 text-gray-300" />
            )
          )}
        </div>
      </div>
    </div>
  );
}
