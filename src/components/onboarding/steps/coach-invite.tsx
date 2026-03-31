"use client";

import { useState } from "react";
import { UserPlus, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { StepProps } from "../onboarding-wizard";

export function CoachInvite({ data, onUpdate }: StepProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleInvite() {
    if (!name.trim() || !email.trim()) return;
    setSending(true);
    setError("");

    try {
      const createRes = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });

      if (!createRes.ok) {
        const err = await createRes.json();
        throw new Error(err.error || "Failed to create client");
      }

      const client = await createRes.json();

      const inviteRes = await fetch(`/api/clients/${client.id}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "email" }),
      });

      if (!inviteRes.ok) throw new Error("Failed to send invite");

      setSent(true);
      onUpdate({ invitedClient: { name: name.trim(), email: email.trim() } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center py-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20">
          <Check className="h-6 w-6 text-green-400" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-card-foreground">Invite Sent!</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {name} will receive an email at {email} with instructions to join.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-green-500/10">
          <UserPlus className="h-5 w-5 text-green-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-card-foreground">Invite Your First Client</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Send an invite so your client can access their portal. You can always add more clients later.
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-card-foreground">Client Name</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Smith"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-card-foreground">Email Address</label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="john@example.com"
          />
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <Button
          onClick={handleInvite}
          disabled={sending || !name.trim() || !email.trim()}
          className="w-full"
        >
          {sending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <UserPlus className="mr-2 h-4 w-4" />
              Send Invite
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
