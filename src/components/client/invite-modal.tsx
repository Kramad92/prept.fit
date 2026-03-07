"use client";

import { useState } from "react";
import { Mail, Key, X } from "lucide-react";
import { useT } from "@/lib/i18n";

interface InviteModalProps {
  clientId: string;
  clientEmail: string;
  onClose: () => void;
  onResult: (msg: string) => void;
}

export function InviteModal({ clientId, clientEmail, onClose, onResult }: InviteModalProps) {
  const t = useT();
  const [method, setMethod] = useState<"email" | "password">("email");
  const [tempPassword, setTempPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleInvite() {
    setError("");
    setLoading(true);

    try {
      const body: Record<string, string> = { method };
      if (method === "password" && tempPassword) {
        body.password = tempPassword;
      }

      const res = await fetch(`/api/clients/${clientId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok) {
        if (data.method === "email") {
          onResult(data.message);
        } else {
          onResult(`${t.invite.portalCreated} ${data.tempPassword}`);
        }
      } else {
        setError(data.error);
      }
    } catch {
      setError(t.errors.somethingWentWrong);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="card w-full max-w-md">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">{t.invite.title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-2 text-sm text-gray-500">
          {t.invite.sendTo} <strong>{clientEmail}</strong> {t.invite.soTheyCanAccess}
        </p>

        {error && (
          <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="mt-4 space-y-3">
          <label
            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
              method === "email"
                ? "border-brand-500 bg-brand-50"
                : "border-gray-200 hover:bg-gray-50"
            }`}
          >
            <input
              type="radio"
              name="method"
              checked={method === "email"}
              onChange={() => setMethod("email")}
              className="mt-0.5"
            />
            <div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-900">
                  {t.invite.sendEmailInvite}
                </span>
                <span className="rounded bg-brand-100 px-1.5 py-0.5 text-xs font-medium text-brand-700">
                  {t.invite.recommended}
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {t.invite.emailInviteDesc}
              </p>
            </div>
          </label>

          <label
            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
              method === "password"
                ? "border-brand-500 bg-brand-50"
                : "border-gray-200 hover:bg-gray-50"
            }`}
          >
            <input
              type="radio"
              name="method"
              checked={method === "password"}
              onChange={() => setMethod("password")}
              className="mt-0.5"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-900">
                  {t.invite.setTempPassword}
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {t.invite.tempPasswordDesc}
              </p>
              {method === "password" && (
                <input
                  type="text"
                  value={tempPassword}
                  onChange={(e) => setTempPassword(e.target.value)}
                  placeholder={t.invite.leaveEmptyDefault}
                  className="input mt-2 text-sm"
                />
              )}
            </div>
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">
            {t.common.cancel}
          </button>
          <button
            onClick={handleInvite}
            disabled={loading}
            className="btn-primary"
          >
            {loading
              ? t.invite.sending
              : method === "email"
                ? t.invite.sendInviteEmail
                : t.invite.createAccess}
          </button>
        </div>
      </div>
    </div>
  );
}
