"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n";
import { api } from "@/lib/api";

interface GroupOption {
  id: string;
  name: string;
}

interface NewSessionFormProps {
  groups: GroupOption[];
  onCreated: () => void;
  onCancel: () => void;
}

export function NewSessionForm({ groups, onCreated, onCancel }: NewSessionFormProps) {
  const t = useT();
  const [form, setForm] = useState({
    title: "",
    date: new Date().toISOString().slice(0, 10),
    startTime: "09:00",
    endTime: "10:00",
    location: "",
    notes: "",
    maxParticipants: "20",
    isOpen: false,
    groupId: "",
  });

  const update = (fields: Partial<typeof form>) => setForm({ ...form, ...fields });

  const handleSubmit = async () => {
    if (!form.title.trim()) return;
    await api.post("/api/group-sessions", {
      title: form.title.trim(),
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      location: form.location.trim() || null,
      notes: form.notes.trim() || null,
      maxParticipants: parseInt(form.maxParticipants) || 20,
      isOpen: form.isOpen,
      groupId: form.groupId || null,
    });
    onCreated();
  };

  return (
    <div className="card mb-6">
      <h3 className="mb-4 text-lg font-semibold">{t.groupTraining.newSession}</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-gray-700">{t.groupTraining.sessionTitle}</label>
          <input
            type="text"
            className="input"
            placeholder={t.groupTraining.sessionTitlePlaceholder}
            value={form.title}
            onChange={(e) => update({ title: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">{t.common.date}</label>
          <input type="date" className="input" value={form.date} onChange={(e) => update({ date: e.target.value })} />
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-gray-700">{t.schedule.startTime}</label>
            <input type="time" className="input" value={form.startTime} onChange={(e) => update({ startTime: e.target.value })} />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-gray-700">{t.schedule.endTime}</label>
            <input type="time" className="input" value={form.endTime} onChange={(e) => update({ endTime: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">{t.groupTraining.location}</label>
          <input
            type="text"
            className="input"
            placeholder={t.groupTraining.locationPlaceholder}
            value={form.location}
            onChange={(e) => update({ location: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">{t.groupTraining.maxParticipants}</label>
          <input type="number" className="input w-32" value={form.maxParticipants} onChange={(e) => update({ maxParticipants: e.target.value })} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">{t.groupTraining.linkedGroup}</label>
          <select className="input" value={form.groupId} onChange={(e) => update({ groupId: e.target.value })}>
            <option value="">{t.groupTraining.noGroup}</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 pt-6">
          <input
            type="checkbox"
            id="isOpen"
            checked={form.isOpen}
            onChange={(e) => update({ isOpen: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300"
          />
          <label htmlFor="isOpen" className="text-sm text-gray-700">{t.groupTraining.openSession}</label>
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-gray-700">{t.common.notes}</label>
          <textarea className="input" rows={2} placeholder={t.common.notesPlaceholder} value={form.notes} onChange={(e) => update({ notes: e.target.value })} />
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button onClick={handleSubmit} className="btn-primary">{t.common.create}</button>
        <button onClick={onCancel} className="btn-secondary">{t.common.cancel}</button>
      </div>
    </div>
  );
}
