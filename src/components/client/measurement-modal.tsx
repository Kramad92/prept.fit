"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { useT } from "@/lib/i18n";
import { api } from "@/lib/api";

interface MeasurementModalProps {
  clientId: string;
  onClose: () => void;
  onSaved: () => void;
}

export function MeasurementModal({ clientId, onClose, onSaved }: MeasurementModalProps) {
  const [saving, setSaving] = useState(false);
  const { toastSuccess, toastError } = useToast();
  const t = useT();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const data: Record<string, string> = {};
    fd.forEach((v, k) => {
      if (v) data[k] = v as string;
    });

    try {
      await api.post(`/api/clients/${clientId}/measurements`, data);
      toastSuccess(t.measurements.saved);
      onSaved();
      onClose();
    } catch {
      toastError(t.measurements.failedToSave);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center">
      <div className="w-full max-w-md rounded-t-2xl bg-white p-6 md:rounded-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t.measurements.addMeasurement}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">{t.common.date}</label>
            <input
              type="date"
              name="date"
              defaultValue={new Date().toISOString().split("T")[0]}
              className="input mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">{t.measurements.weight} ({t.measurements.kg})</label>
              <input type="number" name="weight" step="0.1" className="input mt-1" placeholder="75.0" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">{t.measurements.bodyFat} (%)</label>
              <input type="number" name="bodyFat" step="0.1" className="input mt-1" placeholder="18.0" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">{t.measurements.chest} ({t.measurements.cm})</label>
              <input type="number" name="chest" step="0.1" className="input mt-1" placeholder="95.0" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">{t.measurements.waist} ({t.measurements.cm})</label>
              <input type="number" name="waist" step="0.1" className="input mt-1" placeholder="80.0" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">{t.measurements.hips} ({t.measurements.cm})</label>
              <input type="number" name="hips" step="0.1" className="input mt-1" placeholder="95.0" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">{t.measurements.arms} ({t.measurements.cm})</label>
              <input type="number" name="arms" step="0.1" className="input mt-1" placeholder="35.0" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">{t.measurements.thighs} ({t.measurements.cm})</label>
            <input type="number" name="thighs" step="0.1" className="input mt-1" placeholder="55.0" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">{t.common.notes}</label>
            <textarea name="notes" rows={2} className="input mt-1" placeholder={t.measurements.observations} />
          </div>
          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? t.common.saving : t.measurements.saveMeasurement}
          </button>
        </form>
      </div>
    </div>
  );
}
