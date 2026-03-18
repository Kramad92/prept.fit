"use client";

import { useEffect, useState, useRef } from "react";
import {
  Trash2,
  Plus,
  PartyPopper,
  X,
  ImagePlus,
  ChevronDown,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface PrankData {
  imageUrls: string[];
  message?: string | null;
  enabled: boolean;
  mode: "login" | "navigation";
}

interface PrankUser {
  id: string;
  email: string;
  name: string;
  role: string;
  prankPopup: PrankData;
}

interface UserOption {
  id: string;
  name: string;
  email: string;
  role: string;
}

// ─── Searchable user dropdown ───────────────────────────────────────────────

function UserPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (email: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [displayLabel, setDisplayLabel] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    fetch(`/api/admin/users?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setUsers(data);
      })
      .finally(() => setLoading(false));
  }, [search, open]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  const select = (user: UserOption) => {
    onChange(user.email);
    setDisplayLabel(`${user.name} (${user.email})`);
    setOpen(false);
    setSearch("");
  };

  const clear = () => {
    onChange("");
    setDisplayLabel("");
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-10 w-full items-center justify-between rounded-md border border-gray-200 bg-white px-3 text-sm transition-colors hover:bg-gray-50"
      >
        {value ? (
          <span className="truncate text-gray-900">{displayLabel}</span>
        ) : (
          <span className="text-gray-400">Select a user...</span>
        )}
        <div className="flex items-center gap-1">
          {value && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                clear();
              }}
              className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </div>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-gray-400"
            />
          </div>
          <div className="max-h-60 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
              </div>
            ) : users.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-400">
                No users found
              </p>
            ) : (
              users.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => select(user)}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-gray-50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-gray-900">
                      {user.name}
                    </p>
                    <p className="truncate text-xs text-gray-500">{user.email}</p>
                  </div>
                  <span
                    className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                      user.role === "COACH"
                        ? "bg-blue-100 text-blue-700"
                        : user.role === "ADMIN"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-green-100 text-green-700"
                    }`}
                  >
                    {user.role}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Toggle switch ──────────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-indigo-600" : "bg-gray-200"
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200",
          checked ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  );
}

// ─── Main page ──────────────────────────────────────────────────────────────

export default function AdminPranksPage() {
  const [users, setUsers] = useState<PrankUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([""]);
  const [message, setMessage] = useState("");
  const [mode, setMode] = useState<"login" | "navigation">("navigation");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchPranks = () => {
    setLoading(true);
    fetch("/api/admin/prank-popup")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setUsers(data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPranks();
  }, []);

  const addPrank = async () => {
    const validUrls = imageUrls.filter((u) => u.trim());
    if (!email || validUrls.length === 0) {
      setError("Select a user and add at least one image URL");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/prank-popup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          imageUrls: validUrls,
          message: message || undefined,
          mode,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to set prank");
        return;
      }
      setEmail("");
      setImageUrls([""]);
      setMessage("");
      setMode("navigation");
      fetchPranks();
    } catch {
      setError("Failed to set prank");
    } finally {
      setSaving(false);
    }
  };

  const toggleEnabled = async (userEmail: string, enabled: boolean) => {
    try {
      await fetch("/api/admin/prank-popup", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, enabled }),
      });
      fetchPranks();
    } catch {
      // ignore
    }
  };

  const toggleMode = async (
    userEmail: string,
    newMode: "login" | "navigation"
  ) => {
    try {
      await fetch("/api/admin/prank-popup", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, mode: newMode }),
      });
      fetchPranks();
    } catch {
      // ignore
    }
  };

  const removePrank = async (userEmail: string) => {
    try {
      await fetch(
        `/api/admin/prank-popup?email=${encodeURIComponent(userEmail)}`,
        { method: "DELETE" }
      );
      fetchPranks();
    } catch {
      // ignore
    }
  };

  const updateUrl = (index: number, value: string) => {
    setImageUrls((prev) => prev.map((u, i) => (i === index ? value : u)));
  };

  const addUrlField = () => {
    if (imageUrls.length < 10) setImageUrls((prev) => [...prev, ""]);
  };

  const removeUrlField = (index: number) => {
    if (imageUrls.length > 1) {
      setImageUrls((prev) => prev.filter((_, i) => i !== index));
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3">
        <PartyPopper className="h-7 w-7 text-indigo-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pranks</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Set pop-up images for users. Choose login-only or every navigation.
          </p>
        </div>
      </div>

      {/* ── Add new prank ──────────────────────────────────────────────── */}
      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-700">Add Prank</h2>
        <div className="mt-3 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Target user
            </label>
            <UserPicker value={email} onChange={setEmail} />
          </div>

          {/* Mode selector */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              When to show
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMode("login")}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                  mode === "login"
                    ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                    : "border-gray-200 text-gray-500 hover:bg-gray-50"
                )}
              >
                Login only
              </button>
              <button
                type="button"
                onClick={() => setMode("navigation")}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                  mode === "navigation"
                    ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                    : "border-gray-200 text-gray-500 hover:bg-gray-50"
                )}
              >
                Every navigation
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-500">
              Image URLs (paste links — a random one shows each time)
            </label>
            {imageUrls.map((url, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  placeholder={`Image URL ${i + 1} (https://...)`}
                  value={url}
                  onChange={(e) => updateUrl(i, e.target.value)}
                  className="flex-1"
                />
                {imageUrls.length > 1 && (
                  <button
                    onClick={() => removeUrlField(i)}
                    className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            {imageUrls.length < 10 && (
              <button
                onClick={addUrlField}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700"
              >
                <ImagePlus className="h-3.5 w-3.5" />
                Add another image
              </button>
            )}
          </div>

          <Input
            placeholder="Optional message (e.g. 'You've been pranked!')"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        {imageUrls.some((u) => u.trim()) && (
          <div className="mt-3">
            <p className="mb-1 text-xs text-gray-400">Preview:</p>
            <div className="flex flex-wrap gap-2">
              {imageUrls
                .filter((u) => u.trim())
                .map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt={`Preview ${i + 1}`}
                    className="h-24 w-24 rounded-lg border border-gray-100 object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ))}
            </div>
          </div>
        )}

        <button
          onClick={addPrank}
          disabled={saving}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          {saving ? "Setting..." : "Set Prank"}
        </button>
      </div>

      {/* ── Active pranks list ─────────────────────────────────────────── */}
      <div className="mt-6">
        <h2 className="text-sm font-semibold text-gray-700">All Pranks</h2>
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          </div>
        ) : users.length === 0 ? (
          <p className="mt-3 text-sm text-gray-400">
            No pranks yet. Add one above!
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {users.map((u) => {
              const p = u.prankPopup;
              const enabled = p.enabled !== false;
              return (
                <div
                  key={u.id}
                  className={cn(
                    "rounded-xl border bg-white p-4 transition-opacity",
                    enabled
                      ? "border-gray-200"
                      : "border-gray-100 opacity-60"
                  )}
                >
                  <div className="flex items-center gap-4">
                    {/* Thumbnails */}
                    <div className="flex flex-shrink-0 gap-1">
                      {p.imageUrls.slice(0, 3).map((url, i) => (
                        <img
                          key={i}
                          src={url}
                          alt="Prank"
                          className="h-14 w-14 rounded-lg object-cover"
                        />
                      ))}
                      {p.imageUrls.length > 3 && (
                        <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-gray-100 text-xs font-medium text-gray-500">
                          +{p.imageUrls.length - 3}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900">{u.name}</p>
                      <p className="truncate text-sm text-gray-500">
                        {u.email}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-400">
                        {p.imageUrls.length} image
                        {p.imageUrls.length !== 1 ? "s" : ""}
                        {p.message && (
                          <> &middot; &quot;{p.message}&quot;</>
                        )}
                      </p>
                    </div>

                    {/* Role badge */}
                    <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                      {u.role}
                    </span>
                  </div>

                  {/* Controls row */}
                  <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-gray-100 pt-3">
                    {/* Enable/disable toggle */}
                    <div className="flex items-center gap-2">
                      <Toggle
                        checked={enabled}
                        onChange={(v) => toggleEnabled(u.email, v)}
                      />
                      <span className="text-xs text-gray-500">
                        {enabled ? "Active" : "Paused"}
                      </span>
                    </div>

                    {/* Mode pills */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleMode(u.email, "login")}
                        className={cn(
                          "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                          (p.mode || "navigation") === "login"
                            ? "bg-indigo-100 text-indigo-700"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        )}
                      >
                        Login only
                      </button>
                      <button
                        onClick={() => toggleMode(u.email, "navigation")}
                        className={cn(
                          "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                          (p.mode || "navigation") === "navigation"
                            ? "bg-indigo-100 text-indigo-700"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        )}
                      >
                        Every nav
                      </button>
                    </div>

                    {/* Spacer + delete */}
                    <div className="ml-auto">
                      <button
                        onClick={() => removePrank(u.email)}
                        className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        title="Delete prank"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
