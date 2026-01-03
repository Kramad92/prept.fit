"use client";

import { useState, useEffect } from "react";
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
  X,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/status-badge";

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
    isActive: boolean;
    workoutPlan: { id: string; name: string };
  }>;
}

export default function ClientDetailPage() {
  const params = useParams();
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [inviteResult, setInviteResult] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "overview" | "photos" | "workouts" | "measurements"
  >("overview");
  const [showMeasurementForm, setShowMeasurementForm] = useState(false);
  const [savingMeasurement, setSavingMeasurement] = useState(false);

  useEffect(() => {
    fetch(`/api/clients/${params.id}`)
      .then((r) => r.json())
      .then(setClient)
      .catch(() => {});
  }, [params.id]);

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
              onClick={async () => {
                setInviting(true);
                try {
                  const res = await fetch(
                    `/api/clients/${client.id}/invite`,
                    {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({}),
                    }
                  );
                  const data = await res.json();
                  if (res.ok) {
                    setInviteResult(
                      `Portal access created! Temp password: ${data.tempPassword}`
                    );
                  } else {
                    setInviteResult(data.error);
                  }
                } finally {
                  setInviting(false);
                }
              }}
              disabled={inviting}
              className="btn-secondary"
            >
              <UserPlus className="mr-1 h-4 w-4" />
              {inviting ? "Inviting..." : "Invite to Portal"}
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
          <div>
            {client.assignedPlans.length === 0 ? (
              <div className="card flex flex-col items-center py-8 text-center">
                <Dumbbell className="h-10 w-10 text-gray-300" />
                <p className="mt-3 text-sm text-gray-500">
                  No workout plans assigned.
                </p>
                <Link
                  href="/dashboard/workouts"
                  className="btn-primary mt-4"
                >
                  Assign a Plan
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {client.assignedPlans.map((plan) => (
                  <Link
                    key={plan.id}
                    href={`/dashboard/workouts/${plan.workoutPlan.id}`}
                    className="card flex items-center gap-3 transition-shadow hover:shadow-md"
                  >
                    <Dumbbell className="h-5 w-5 text-brand-600" />
                    <span className="font-medium">{plan.workoutPlan.name}</span>
                    {plan.isActive && <StatusBadge status="active" />}
                  </Link>
                ))}
              </div>
            )}
          </div>
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

            {/* Add Measurement Modal */}
            {showMeasurementForm && (
              <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center">
                <div className="w-full max-w-md rounded-t-2xl bg-white p-6 md:rounded-2xl">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Add Measurement</h2>
                    <button
                      onClick={() => setShowMeasurementForm(false)}
                      className="rounded-lg p-1 hover:bg-gray-100"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <form
                    className="mt-4 space-y-4"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      setSavingMeasurement(true);
                      const fd = new FormData(e.currentTarget);
                      const data: Record<string, string> = {};
                      fd.forEach((v, k) => {
                        if (v) data[k] = v as string;
                      });

                      const res = await fetch(
                        `/api/clients/${client.id}/measurements`,
                        {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(data),
                        }
                      );

                      if (res.ok) {
                        // Reload client data
                        const updated = await fetch(
                          `/api/clients/${client.id}`
                        ).then((r) => r.json());
                        setClient(updated);
                        setShowMeasurementForm(false);
                      }
                      setSavingMeasurement(false);
                    }}
                  >
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Date
                      </label>
                      <input
                        type="date"
                        name="date"
                        defaultValue={new Date().toISOString().split("T")[0]}
                        className="input mt-1"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Weight (kg)
                        </label>
                        <input
                          type="number"
                          name="weight"
                          step="0.1"
                          className="input mt-1"
                          placeholder="75.0"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Body Fat (%)
                        </label>
                        <input
                          type="number"
                          name="bodyFat"
                          step="0.1"
                          className="input mt-1"
                          placeholder="18.0"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Chest (cm)
                        </label>
                        <input
                          type="number"
                          name="chest"
                          step="0.1"
                          className="input mt-1"
                          placeholder="95.0"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Waist (cm)
                        </label>
                        <input
                          type="number"
                          name="waist"
                          step="0.1"
                          className="input mt-1"
                          placeholder="80.0"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Hips (cm)
                        </label>
                        <input
                          type="number"
                          name="hips"
                          step="0.1"
                          className="input mt-1"
                          placeholder="95.0"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Arms (cm)
                        </label>
                        <input
                          type="number"
                          name="arms"
                          step="0.1"
                          className="input mt-1"
                          placeholder="35.0"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Thighs (cm)
                      </label>
                      <input
                        type="number"
                        name="thighs"
                        step="0.1"
                        className="input mt-1"
                        placeholder="55.0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Notes
                      </label>
                      <textarea
                        name="notes"
                        rows={2}
                        className="input mt-1"
                        placeholder="Any observations..."
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={savingMeasurement}
                      className="btn-primary w-full"
                    >
                      {savingMeasurement ? "Saving..." : "Save Measurement"}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
