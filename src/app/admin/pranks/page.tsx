"use client";

import { useEffect, useState } from "react";
import { Trash2, Plus, PartyPopper, X, ImagePlus } from "lucide-react";
import { Input } from "@/components/ui/input";

interface PrankUser {
  id: string;
  email: string;
  name: string;
  role: string;
  prankPopup: { imageUrls: string[]; message?: string | null };
}

export default function AdminPranksPage() {
  const [users, setUsers] = useState<PrankUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([""]);
  const [message, setMessage] = useState("");
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
      setError("Email and at least one image URL are required");
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
      fetchPranks();
    } catch {
      setError("Failed to set prank");
    } finally {
      setSaving(false);
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
            Set pop-up images that appear on every page navigation for a user.
            Multiple images rotate randomly.
          </p>
        </div>
      </div>

      {/* Add new prank */}
      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-700">Add Prank</h2>
        <div className="mt-3 space-y-3">
          <Input
            placeholder="User email (e.g. mirza.nikolic@gmail.com)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

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

        {/* Previews */}
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

      {/* Active pranks */}
      <div className="mt-6">
        <h2 className="text-sm font-semibold text-gray-700">Active Pranks</h2>
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          </div>
        ) : users.length === 0 ? (
          <p className="mt-3 text-sm text-gray-400">
            No active pranks. Add one above!
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {users.map((u) => (
              <div
                key={u.id}
                className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4"
              >
                <div className="flex flex-shrink-0 gap-1">
                  {u.prankPopup.imageUrls.slice(0, 3).map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt="Prank"
                      className="h-14 w-14 rounded-lg object-cover"
                    />
                  ))}
                  {u.prankPopup.imageUrls.length > 3 && (
                    <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-gray-100 text-xs font-medium text-gray-500">
                      +{u.prankPopup.imageUrls.length - 3}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900">{u.name}</p>
                  <p className="truncate text-sm text-gray-500">{u.email}</p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {u.prankPopup.imageUrls.length} image{u.prankPopup.imageUrls.length !== 1 ? "s" : ""}
                    {u.prankPopup.message && (
                      <> &middot; &quot;{u.prankPopup.message}&quot;</>
                    )}
                  </p>
                </div>
                <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                  {u.role}
                </span>
                <button
                  onClick={() => removePrank(u.email)}
                  className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                  title="Remove prank"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
