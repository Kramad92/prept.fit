"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import { api } from "@/lib/api";
import type { Measurement } from "@/types";

interface MeasurementModalProps {
  clientId: string;
  lastMeasurement?: Measurement | null;
  onClose: () => void;
  onSaved: () => void;
}

export function MeasurementModal({ clientId, lastMeasurement, onClose, onSaved }: MeasurementModalProps) {
  const [saving, setSaving] = useState(false);

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
      toast.success(t.measurements.saved);
      onSaved();
      onClose();
    } catch {
      toast.error(t.measurements.failedToSave);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto top-auto bottom-0 translate-y-0 rounded-t-2xl rounded-b-none md:top-[50%] md:translate-y-[-50%] md:bottom-auto md:rounded-xl">
        <DialogHeader>
          <DialogTitle>{t.measurements.addMeasurement}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">{t.common.date}</label>
            <Input
              type="date"
              name="date"
              defaultValue={new Date().toISOString().split("T")[0]}
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">{t.measurements.weight} ({t.measurements.kg})</label>
              <Input type="number" name="weight" step="0.1" className="mt-1" placeholder="75.0" defaultValue={lastMeasurement?.weight ?? undefined} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">{t.measurements.bodyFat} (%)</label>
              <Input type="number" name="bodyFat" step="0.1" className="mt-1" placeholder="18.0" defaultValue={lastMeasurement?.bodyFat ?? undefined} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">{t.measurements.chest} ({t.measurements.cm})</label>
              <Input type="number" name="chest" step="0.1" className="mt-1" placeholder="95.0" defaultValue={lastMeasurement?.chest ?? undefined} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">{t.measurements.waist} ({t.measurements.cm})</label>
              <Input type="number" name="waist" step="0.1" className="mt-1" placeholder="80.0" defaultValue={lastMeasurement?.waist ?? undefined} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">{t.measurements.hips} ({t.measurements.cm})</label>
              <Input type="number" name="hips" step="0.1" className="mt-1" placeholder="95.0" defaultValue={lastMeasurement?.hips ?? undefined} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">{t.measurements.arms} ({t.measurements.cm})</label>
              <Input type="number" name="arms" step="0.1" className="mt-1" placeholder="35.0" defaultValue={lastMeasurement?.arms ?? undefined} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">{t.measurements.thighs} ({t.measurements.cm})</label>
            <Input type="number" name="thighs" step="0.1" className="mt-1" placeholder="55.0" defaultValue={lastMeasurement?.thighs ?? undefined} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">{t.common.notes}</label>
            <Textarea name="notes" rows={2} className="mt-1" placeholder={t.measurements.observations} />
          </div>
          <Button type="submit" disabled={saving} className="w-full">
            {saving ? t.common.saving : t.measurements.saveMeasurement}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
