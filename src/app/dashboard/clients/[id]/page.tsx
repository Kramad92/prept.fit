"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
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
  Sparkles,
  MoreVertical,
  Trash2,
  Archive,
  Power,
  Globe,
  GlobeLock,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import { ClientWorkoutTab } from "@/components/client/client-workout-tab";
import { ClientNutritionTab } from "@/components/client/client-nutrition-tab";
import { ClientPaymentsTab } from "@/components/client/client-payments-tab";
import { ClientPhotosTab } from "@/components/client/client-photos-tab";
import { ClientHabitsTab } from "@/components/client/client-habits-tab";
import { InviteModal } from "@/components/client/invite-modal";
import { MeasurementModal } from "@/components/client/measurement-modal";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { useT, useLocale, getDateLocale } from "@/lib/i18n";
import type { ClientDetail } from "@/types";

export default function ClientDetailPage() {
  const t = useT();
  const { locale } = useLocale();
  const dateLocale = getDateLocale(locale);
  const params = useParams();
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteResult, setInviteResult] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "overview" | "photos" | "workouts" | "nutrition" | "habits" | "payments" | "measurements"
  >("overview");
  const [showMeasurementForm, setShowMeasurementForm] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { toastSuccess, toastError } = useToast();
  const router = useRouter();

  const menuRef = useRef<HTMLDivElement>(null);

  const loadClient = useCallback(() => {
    api.get<ClientDetail>(`/api/clients/${params.id}`)
      .then(setClient)
      .catch(() => toastError(t.errors.failedToLoad));
  }, [params.id, toastError]);

  useEffect(() => {
    loadClient();
  }, [loadClient]);

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    if (showMenu) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showMenu]);

  async function handleStatusChange(status: string) {
    if (!client) return;
    try {
      await api.put(`/api/clients/${params.id}`, { name: client.name, status });
      toastSuccess(t.clients.statusUpdated);
      loadClient();
    } catch {
      toastError(t.errors.failedToSave);
    }
    setShowMenu(false);
  }

  async function handleArchive() {
    if (!client) return;
    try {
      await api.put(`/api/clients/${params.id}`, { name: client.name, status: "archived" });
      toastSuccess(t.clients.clientArchived);
      loadClient();
    } catch {
      toastError(t.errors.failedToSave);
    }
    setShowMenu(false);
  }

  async function handleDelete() {
    try {
      await api.delete(`/api/clients/${params.id}`);
      toastSuccess(t.clients.clientDeleted);
      router.push("/dashboard/clients");
    } catch {
      toastError(t.errors.failedToDelete);
    }
    setShowDeleteConfirm(false);
  }

  if (!client) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  const tabs = [
    { key: "overview" as const, label: t.clients.overview, icon: Edit },
    { key: "photos" as const, label: t.clients.photos, icon: Camera },
    { key: "workouts" as const, label: t.clients.workouts, icon: Dumbbell },
    { key: "nutrition" as const, label: t.clients.nutrition, icon: UtensilsCrossed },
    { key: "habits" as const, label: t.clients.habits, icon: Sparkles },
    { key: "payments" as const, label: t.clients.payments, icon: DollarSign },
    { key: "measurements" as const, label: t.clients.stats, icon: Ruler },
  ];

  return (
    <div>
      <Link
        href="/dashboard/clients"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        {t.clients.backToClients}
      </Link>

      {/* Client Header */}
      <div className="card mt-4 flex items-start gap-4">
        <Avatar name={client.name} size="lg" />
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900">{client.name}</h1>
            <StatusBadge status={client.status} />
            {client.userId && (
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                client.status === "active"
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-500"
              }`}>
                {client.status === "active" ? <Globe className="h-3 w-3" /> : <GlobeLock className="h-3 w-3" />}
                {client.status === "active" ? t.clients.portalConnected : t.clients.portalBlocked}
              </span>
            )}
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
        <div className="flex items-center gap-2">
          {!client.userId && client.email && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="btn-secondary"
            >
              <UserPlus className="mr-1 h-4 w-4" />
              {t.clients.inviteToPortal}
            </button>
          )}
          {client.status === "active" ? (
            <button
              onClick={() => handleStatusChange("inactive")}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              <Power className="mr-1 inline h-4 w-4" />
              {t.clients.deactivate}
            </button>
          ) : client.status !== "archived" ? (
            <button
              onClick={() => handleStatusChange("active")}
              className="rounded-lg border border-green-200 px-3 py-2 text-sm text-green-600 hover:bg-green-50"
            >
              <Power className="mr-1 inline h-4 w-4" />
              {t.clients.activate}
            </button>
          ) : null}
          <Link
            href={`/dashboard/clients/${client.id}/edit`}
            className="btn-secondary"
          >
            <Edit className="mr-1 h-4 w-4" />
            {t.common.edit}
          </Link>
          {/* Three-dot menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            {showMenu && (
              <div className="absolute right-0 z-10 mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                {client.status !== "active" && (
                  <button
                    onClick={() => handleStatusChange("active")}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Power className="h-4 w-4 text-green-500" />
                    {t.clients.activate}
                  </button>
                )}
                {client.status !== "paused" && client.status !== "archived" && (
                  <button
                    onClick={() => handleStatusChange("paused")}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Power className="h-4 w-4 text-yellow-500" />
                    {t.clients.paused}
                  </button>
                )}
                {client.status !== "archived" && (
                  <button
                    onClick={handleArchive}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Archive className="h-4 w-4 text-gray-400" />
                    {t.clients.archive}
                  </button>
                )}
                <div className="my-1 border-t border-gray-100" />
                <button
                  onClick={() => { setShowMenu(false); setShowDeleteConfirm(true); }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                  {t.clients.deleteClient}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">{t.clients.deleteClient}</h3>
            <p className="mt-2 text-sm text-gray-600">{t.clients.deleteClientConfirm}</p>
            <div className="mt-4 flex gap-3">
              <button onClick={handleDelete} className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
                {t.common.delete}
              </button>
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                {t.common.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

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
            {(client.allergies || client.dietaryPrefs || client.injuries || client.fitnessLevel || client.activityLevel || client.notes) && (
              <div className="card space-y-3">
                {(client.fitnessLevel || client.activityLevel) && (
                  <div className="flex flex-wrap gap-2">
                    {client.fitnessLevel && (
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700">
                        {t.clients.fitnessLevel}: {t.clients[client.fitnessLevel as "beginner" | "intermediate" | "advanced"] || client.fitnessLevel}
                      </span>
                    )}
                    {client.activityLevel && (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                        {t.clients.activityLevel}: {client.activityLevel}
                      </span>
                    )}
                  </div>
                )}
                {client.allergies && (
                  <div>
                    <h4 className="text-xs font-semibold text-red-600">{t.clients.allergies}</h4>
                    <p className="text-sm text-gray-600">{client.allergies}</p>
                  </div>
                )}
                {client.dietaryPrefs && (
                  <div>
                    <h4 className="text-xs font-semibold text-orange-600">{t.clients.dietaryPrefs}</h4>
                    <p className="text-sm text-gray-600">{client.dietaryPrefs}</p>
                  </div>
                )}
                {client.injuries && (
                  <div>
                    <h4 className="text-xs font-semibold text-amber-600">{t.clients.injuries}</h4>
                    <p className="text-sm text-gray-600">{client.injuries}</p>
                  </div>
                )}
                {client.notes && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-700">{t.common.notes}</h4>
                    <p className="whitespace-pre-wrap text-sm text-gray-600">{client.notes}</p>
                  </div>
                )}
              </div>
            )}
            <div className="card">
              <h3 className="text-sm font-semibold text-gray-700">
                {t.clients.upcomingSessions}
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                {t.clients.noUpcomingSessions}
              </p>
              <Link
                href="/dashboard/schedule"
                className="mt-3 inline-flex text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                <Calendar className="mr-1 h-4 w-4" />
                {t.clients.scheduleSession}
              </Link>
            </div>
          </div>
        )}

        {activeTab === "photos" && (
          <ClientPhotosTab clientId={client.id} photos={client.progressPhotos} onRefresh={loadClient} />
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

        {activeTab === "habits" && (
          <ClientHabitsTab clientId={client.id} />
        )}

        {activeTab === "payments" && (
          <ClientPaymentsTab clientId={client.id} />
        )}

        {activeTab === "measurements" && (
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">
                {t.measurements.title} ({client.measurements.length})
              </h3>
              <button
                onClick={() => setShowMeasurementForm(true)}
                className="btn-primary text-sm"
              >
                <Plus className="mr-1 h-4 w-4" />
                {t.measurements.addMeasurement}
              </button>
            </div>

            {client.measurements.length === 0 ? (
              <div className="card mt-4 flex flex-col items-center py-8 text-center">
                <Ruler className="h-10 w-10 text-gray-300" />
                <p className="mt-3 text-sm text-gray-500">
                  {t.measurements.noMeasurements}
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {client.measurements.map((m) => (
                  <div key={m.id} className="card">
                    <p className="text-sm font-medium text-gray-700">
                      {new Date(m.date).toLocaleDateString(dateLocale, {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm md:grid-cols-4">
                      {m.weight != null && (
                        <div>
                          <span className="text-gray-400">{t.measurements.weight}:</span>{" "}
                          <span className="font-medium">{m.weight}</span>
                        </div>
                      )}
                      {m.bodyFat != null && (
                        <div>
                          <span className="text-gray-400">{t.measurements.bodyFat}:</span>{" "}
                          <span className="font-medium">{m.bodyFat}%</span>
                        </div>
                      )}
                      {m.chest != null && (
                        <div>
                          <span className="text-gray-400">{t.measurements.chest}:</span>{" "}
                          <span className="font-medium">{m.chest}</span>
                        </div>
                      )}
                      {m.waist != null && (
                        <div>
                          <span className="text-gray-400">{t.measurements.waist}:</span>{" "}
                          <span className="font-medium">{m.waist}</span>
                        </div>
                      )}
                      {m.hips != null && (
                        <div>
                          <span className="text-gray-400">{t.measurements.hips}:</span>{" "}
                          <span className="font-medium">{m.hips}</span>
                        </div>
                      )}
                      {m.arms != null && (
                        <div>
                          <span className="text-gray-400">{t.measurements.arms}:</span>{" "}
                          <span className="font-medium">{m.arms}</span>
                        </div>
                      )}
                      {m.thighs != null && (
                        <div>
                          <span className="text-gray-400">{t.measurements.thighs}:</span>{" "}
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
                lastMeasurement={client.measurements[0] ?? null}
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
