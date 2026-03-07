"use client";

import { useState, useRef, useCallback } from "react";
import { Send, Smile, Paperclip, X, Image as ImageIcon, FileText } from "lucide-react";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

interface Attachment {
  file: File;
  preview?: string;
  type: "image" | "file";
}

interface ChatInputProps {
  onSend: (content: string, attachment?: { file: File; type: "image" | "file" }) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const t = useT();
  const [message, setMessage] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = message.trim();
    if ((!trimmed && !attachment) || disabled) return;

    onSend(
      trimmed,
      attachment ? { file: attachment.file, type: attachment.type } : undefined
    );
    setMessage("");
    setAttachment(null);
    setShowEmoji(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const att: Attachment = { file, type: isImage ? "image" : "file" };

    if (isImage) {
      att.preview = URL.createObjectURL(file);
    }

    setAttachment(att);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeAttachment() {
    if (attachment?.preview) URL.revokeObjectURL(attachment.preview);
    setAttachment(null);
  }

  return (
    <div className="border-t border-gray-200 bg-white">
      {/* Attachment preview */}
      {attachment && (
        <div className="px-4 pt-3">
          <div className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
            {attachment.type === "image" && attachment.preview ? (
              <img
                src={attachment.preview}
                alt="Preview"
                className="h-12 w-12 rounded object-cover"
              />
            ) : (
              <FileText className="h-5 w-5 text-gray-500" />
            )}
            <span className="max-w-[200px] truncate text-sm text-gray-700">
              {attachment.file.name}
            </span>
            <button
              type="button"
              onClick={removeAttachment}
              className="rounded-full p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-end gap-2 p-3">
        {/* File upload */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
          onChange={handleFileSelect}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          title="Attach file"
        >
          <Paperclip className="h-5 w-5" />
        </button>

        {/* Emoji picker */}
        <div className="relative" ref={emojiRef}>
          <button
            type="button"
            onClick={() => setShowEmoji(!showEmoji)}
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors",
              showEmoji
                ? "bg-brand-100 text-brand-600"
                : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            )}
            title="Emoji"
          >
            <Smile className="h-5 w-5" />
          </button>
          {showEmoji && (
            <div className="absolute bottom-12 left-0 z-50">
              <EmojiPicker
                theme={Theme.LIGHT}
                width={320}
                height={400}
                onEmojiClick={(emoji) => {
                  setMessage((prev) => prev + emoji.emoji);
                  textareaRef.current?.focus();
                }}
                searchPlaceHolder="Search emoji..."
                previewConfig={{ showPreview: false }}
              />
            </div>
          )}
        </div>

        {/* Message input */}
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              adjustHeight();
            }}
            onKeyDown={handleKeyDown}
            placeholder={t.messages.typeMessage}
            rows={1}
            className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-brand-300 focus:bg-white focus:ring-1 focus:ring-brand-300"
            style={{ maxHeight: 120 }}
          />
        </div>

        {/* Send button */}
        <button
          type="submit"
          disabled={(!message.trim() && !attachment) || disabled}
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all",
            message.trim() || attachment
              ? "bg-brand-600 text-white shadow-sm hover:bg-brand-700"
              : "bg-gray-100 text-gray-300"
          )}
        >
          <Send className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
}
