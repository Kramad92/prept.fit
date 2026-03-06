"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Camera,
  Calendar,
  Dumbbell,
  Ruler,
  Edit,
  UserPlus,
  Plus,
  UtensilsCrossed,
  DollarSign,
  Mail,
  Key,
  X,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import { ClientWorkoutTab } from "@/components/client/client-workout-tab";
import { ClientNutritionTab } from "@/components/client/client-nutrition-tab";
import { ClientPaymentsTab } from "@/components/client/client-payments-tab";
import { MeasurementModal } from "@/components/client/measurement-modal";
import { useToast } from "@/components/ui/toast";
import type { Food } from "@/types";

interface ClientDetail {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  gender: string | null;
  goals: string | null;
  notes: string | null;
  status: string;
  userId: string | null;
  createdAt: string;
  progressPhotos: Array<{
    id: string;
    url: string;
    caption: string | null;
    takenAt: string;
    category: string | null;
  }>;
  measurements: Array<{
    id: string;
    date: string;
    weight: number | null;
    bodyFat: number | null;
    chest: number | null;
    waist: number | null;
    hips: number | null;
    arms: number | null;
    thighs: number | null;
    notes: string | null;
  }>;
  assignedPlans: Array<{
    id: string;
    customName: string | null;
    notes: string | null;
    isActive: boolean;
    startDate: string | null;
    endDate: string | null;
    workoutPlan: {
      id: string;
      name: string;
      description: string | null;
      sourceTemplate: { id: string; name: string } | null;
      exercises: Array<{
        id: string;
        name: string;
        sets: number | null;
        reps: string | null;
        weight: string | null;
        restSeconds: number | null;
        notes: string | null;
        orderIndex: number;
        videoUrl: string | null;
      }>;
    };
    clientExercises: Array<{
      id: string;
      name: string;
      sets: number | null;
      reps: string | null;
      weight: string | null;
      restSeconds: number | null;
      notes: string | null;
      orderIndex: number;
      videoUrl: string | null;
    }>;
  }>;
  assignedMealPlans: Array<{
    id: string;
    customName: string | null;
    notes: string | null;
    isActive: boolean;
    mealPlan: {
      id: string;
      name: string;
      description: string | null;
      targetCalories: number | null;
      targetProtein: number | null;
      targetCarbs: number | null;
      targetFat: number | null;
      sourceTemplate: { id: string; name: string } | null;
      meals: Array<{
        id: string;
        name: string;
        time: string | null;
        foods: Food[];
        orderIndex: number;
      }>;
    };
    clientMeals: Array<{
      id: string;
      name: string;
      time: string | null;
      foods: Food[];
      orderIndex: number;
      notes: string | null;
    }>;
  }>;
}

export default function ClientDetailPage() {
  const params = useParams();
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteResult, setInviteResult] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "overview" | "photos" | "workouts" | "nutrition" | "payments" | "measurements"
  >("overview");
  const [showMeasurementForm, setShowMeasurementForm] = useState(false);
  const { toastError } = useToast();

  const loadClient = useCallback(() => {
    fetch(`/api/clients/${params.id}`)
      .then((r) => r.json())
      .then(setClient)
      .catch(() => toastError("Failed to load client"));
  }, [params.id, toastError]);

  useEffect(() => {
    loadClient();
  }, [loadClient]);

  if (!client) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  const tabs = [
    { key: "overview" as const, label: "Overview", icon: Edit },
    { key: "photos" as const, label: "Photos", icon: Camera },
    { key: "workouts" as const, label: "Workouts", icon: Dumbbell },
    { key: "nutrition" as const, label: "Nutrition", icon: UtensilsCrossed },
    { key: "payments" as const, label: "Payments", icon: DollarSign },
    { key: "measurements" as const, label: "Stats", icon: Ruler },
  ];

  return (
    <div>
      <Link
        href="/dashboard/clients"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to clients
      </Link>

      {/* Client Header */}
      <div className="card mt-4 flex items-start gap-4">
        <Avatar name={client.name} size="lg" />
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900">{client.name}</h1>
            <StatusBadge status={client.status} />
          </div>
          {client.email && (
            <p className="mt-0.5 text-sm text-gray-500">{client.email}</p>
          )}
          {client.phone && (
            <p className="text-sm text-gray-500">{client.phone}</p>
          )}
          {client.goals && (
            <p className="mt-2 text-sm text-gray-700">{client.goals}</p>
          )}
        </div>
        <div className="flex gap-2">
          {!client.userId && client.email && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="btn-secondary"
            >
              <UserPlus className="mr-1 h-4 w-4" />
              Invite to Portal
            </button>
          )}
          {client.userId && (
            <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
              Portal Active
            </span>
          )}
          <Link
            href={`/dashboard/clients/${client.id}/edit`}
            className="btn-secondary"
          >
            <Edit className="mr-1 h-4 w-4" />
            Edit
          </Link>
        </div>
      </div>

      {inviteResult && (
        <div className="mt-3 rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
          {inviteResult}
        </div>
      )}

      {showInviteModal && (
        <InviteModal
          clientId={client.id}
          clientEmail={client.email!}
          onClose={() => setShowInviteModal(false)}
          onResult={(msg) => {
            setInviteResult(msg);
            setShowInviteModal(false);
            loadClient();
          }}
        />
      )}

      {/* Tabs */}
      <div className="mt-6 flex gap-1 overflow-x-auto border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "border-brand-600 text-brand-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === "overview" && (
          <div className="space-y-4">
            {client.notes && (
              <div className="card">
                <h3 className="text-sm font-semibold text-gray-700">Notes</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600">
                  {client.notes}
                </p>
              </div>
            )}
            <div className="card">
              <h3 className="text-sm font-semibold text-gray-700">
                Upcoming Sessions
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                No upcoming sessions.
              </p>
              <Link
                href="/dashboard/schedule"
                className="mt-3 inline-flex text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                <Calendar className="mr-1 h-4 w-4" />
                Schedule a session
              </Link>
            </div>
          </div>
        )}

        {activeTab === "photos" && (
          <div>
            {client.progressPhotos.length === 0 ? (
              <div className="card flex flex-col items-center py-8 text-center">
                <Camera className="h-10 w-10 text-gray-300" />
                <p className="mt-3 text-sm text-gray-500">
                  No progress photos yet.
                </p>
                <button className="btn-primary mt-4">
                  <Camera className="mr-2 h-4 w-4" />
                  Upload Photo
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {client.progressPhotos.map((photo) => (
                  <div
                    key={photo.id}
                    className="relative aspect-square overflow-hidden rounded-lg"
                  >
                    <img
                      src={photo.url}
                      alt={photo.caption || "Progress photo"}
                      className="h-full w-full object-cover"
                    />
                    {photo.category && (
                      <span className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
                        {photo.category}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "workouts" && (
          <ClientWorkoutTab
            clientId={client.id}
            assignedPlans={client.assignedPlans}
            onRefresh={loadClient}
          />
        )}

        {activeTab === "nutrition" && (
          <ClientNutritionTab
            clientId={client.id}
            assignedMealPlans={client.assignedMealPlans}
            onRefresh={loadClient}
          />
        )}

        {activeTab === "payments" && (
          <ClientPaymentsTab clientId={client.id} />
        )}

        {activeTab === "measurements" && (
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">
                Measurements ({client.measurements.length})
              </h3>
              <button
                onClick={() => setShowMeasurementForm(true)}
                className="btn-primary text-sm"
              >
                <Plus className="mr-1 h-4 w-4" />
                Add Measurement
              </button>
            </div>

            {client.measurements.length === 0 ? (
              <div className="card mt-4 flex flex-col items-center py-8 text-center">
                <Ruler className="h-10 w-10 text-gray-300" />
                <p className="mt-3 text-sm text-gray-500">
                  No measurements recorded yet.
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {client.measurements.map((m) => (
                  <div key={m.id} className="card">
                    <p className="text-sm font-medium text-gray-700">
                      {new Date(m.date).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm md:grid-cols-4">
                      {m.weight != null && (
                        <div>
                          <span className="text-gray-400">Weight:</span>{" "}
                          <span className="font-medium">{m.weight}</span>
                        </div>
                      )}
                      {m.bodyFat != null && (
                        <div>
                          <span className="text-gray-400">Body Fat:</span>{" "}
                          <span className="font-medium">{m.bodyFat}%</span>
                        </div>
                      )}
                      {m.chest != null && (
                        <div>
                          <span className="text-gray-400">Chest:</span>{" "}
                          <span className="font-medium">{m.chest}</span>
                        </div>
                      )}
                      {m.waist != null && (
                        <div>
                          <span className="text-gray-400">Waist:</span>{" "}
                          <span className="font-medium">{m.waist}</span>
                        </div>
                      )}
                      {m.hips != null && (
                        <div>
                          <span className="text-gray-400">Hips:</span>{" "}
                          <span className="font-medium">{m.hips}</span>
                        </div>
                      )}
                      {m.arms != null && (
                        <div>
                          <span className="text-gray-400">Arms:</span>{" "}
                          <span className="font-medium">{m.arms}</span>
                        </div>
                      )}
                      {m.thighs != null && (
                        <div>
                          <span className="text-gray-400">Thighs:</span>{" "}
                          <span className="font-medium">{m.thighs}</span>
                        </div>
                      )}
                    </div>
                    {m.notes && (
                      <p className="mt-2 text-sm italic text-gray-400">
                        {m.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {showMeasurementForm && (
              <MeasurementModal
                clientId={client.id}
                onClose={() => setShowMeasurementForm(false)}
                onSaved={loadClient}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function InviteModal({
  clientId,
  clientEmail,
  onClose,
  onResult,
}: {
  clientId: string;
  clientEmail: string;
  onClose: () => void;
  onResult: (msg: string) => void;
}) {
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
          onResult(`Portal access created! Temp password: ${data.tempPassword}`);
        }
      } else {
        setError(data.error);
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="card w-full max-w-md">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Invite to Portal</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-2 text-sm text-gray-500">
          Send an invite to <strong>{clientEmail}</strong> so they can access
          their portal.
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
                  Send email invite
                </span>
                <span className="rounded bg-brand-100 px-1.5 py-0.5 text-xs font-medium text-brand-700">
                  Recommended
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Client receives an email with a link to set their own password.
                Link expires in 48 hours.
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
                  Set a temporary password
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                You set a password and share it with your client manually.
              </p>
              {method === "password" && (
                <input
                  type="text"
                  value={tempPassword}
                  onChange={(e) => setTempPassword(e.target.value)}
                  placeholder="Leave empty for 'changeme123'"
                  className="input mt-2 text-sm"
                />
              )}
            </div>
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button
            onClick={handleInvite}
            disabled={loading}
            className="btn-primary"
          >
            {loading
              ? "Sending..."
              : method === "email"
                ? "Send Invite Email"
                : "Create Access"}
          </button>
        </div>
      </div>
    </div>
  );
}
