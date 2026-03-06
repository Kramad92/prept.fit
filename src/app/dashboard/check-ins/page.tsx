"use client";

import { useState, useEffect } from "react";
import { Plus, ClipboardCheck, MessageSquare, Copy, Pencil, Trash2, X, Check } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { useT } from "@/lib/i18n";

interface CheckInTemplate {
  id: string;
  name: string;
  questions: Array<{ id: string; question: string; type: string }>;
  frequency: string;
  isActive: boolean;
}

interface CheckIn {
  id: string;
  answers: Array<{ questionId: string; answer: string }>;
  submittedAt: string;
  coachNotes: string | null;
  template: { name: string; questions: Array<{ id: string; question: string; type: string }> };
  client: { name: string };
}

export default function CheckInsPage() {
  const t = useT();
  const [templates, setTemplates] = useState<CheckInTemplate[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [coachNote, setCoachNote] = useState("");
  const [duplicating, setDuplicating] = useState<string | null>(null);

  // Edit template state
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editFrequency, setEditFrequency] = useState("weekly");
  const [editQuestions, setEditQuestions] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/check-ins/templates").then((r) => r.json()),
      fetch("/api/check-ins").then((r) => r.json()),
    ])
      .then(([t, c]) => {
        setTemplates(t);
        setCheckIns(c);
      })
      .finally(() => setLoading(false));
  }, []);

  async function createTemplate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const questionTexts = (formData.get("questions") as string)
      .split("\n")
      .filter((q) => q.trim());

    const data = {
      name: formData.get("name"),
      frequency: formData.get("frequency"),
      questions: questionTexts.map((q, i) => ({
        id: `q${i}`,
        question: q.trim(),
        type: "text",
      })),
    };

    const res = await fetch("/api/check-ins/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      const template = await res.json();
      setTemplates((prev) => [template, ...prev]);
      setShowCreate(false);
    }
  }

  async function handleDuplicate(id: string) {
    setDuplicating(id);
    const res = await fetch(`/api/check-ins/templates/${id}/duplicate`, { method: "POST" });
    if (res.ok) {
      const copy = await res.json();
      setTemplates((prev) => [copy, ...prev]);
    }
    setDuplicating(null);
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/check-ins/templates/${id}`, { method: "DELETE" });
    if (res.ok) {
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    }
  }

  function startEdit(t: CheckInTemplate) {
    setEditingTemplate(t.id);
    setEditName(t.name);
    setEditFrequency(t.frequency);
    setEditQuestions((t.questions as any[]).map((q: any) => q.question).join("\n"));
  }

  async function saveEdit(id: string) {
    setSavingEdit(true);
    const questionTexts = editQuestions.split("\n").filter((q) => q.trim());

    const res = await fetch(`/api/check-ins/templates/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editName,
        frequency: editFrequency,
        questions: questionTexts.map((q, i) => ({
          id: `q${i}`,
          question: q.trim(),
          type: "text",
        })),
      }),
    });

    if (res.ok) {
      setTemplates((prev) =>
        prev.map((t) =>
          t.id === id
            ? {
                ...t,
                name: editName,
                frequency: editFrequency,
                questions: questionTexts.map((q, i) => ({
                  id: `q${i}`,
                  question: q.trim(),
                  type: "text",
                })),
              }
            : t
        )
      );
      setEditingTemplate(null);
    }
    setSavingEdit(false);
  }

  async function saveCoachNote(checkInId: string) {
    await fetch(`/api/check-ins/${checkInId}/notes`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ coachNotes: coachNote }),
    });

    setCheckIns((prev) =>
      prev.map((c) =>
        c.id === checkInId ? { ...c, coachNotes: coachNote } : c
      )
    );
    setRespondingTo(null);
    setCoachNote("");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.checkIns.title}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {t.checkIns.subtitle}
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus className="h-4 w-4 md:mr-2" />
          <span className="hidden md:inline">{t.checkIns.newTemplate}</span>
        </button>
      </div>

      {/* Templates */}
      {templates.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-gray-700">{t.checkIns.templates}</h2>
          <div className="mt-2 grid gap-3 md:grid-cols-2">
            {templates.map((tmpl) => (
              <div key={tmpl.id} className="card">
                {editingTemplate === tmpl.id ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="input"
                      placeholder={t.checkIns.templateName}
                    />
                    <select
                      value={editFrequency}
                      onChange={(e) => setEditFrequency(e.target.value)}
                      className="input"
                    >
                      <option value="weekly">{t.checkIns.weekly}</option>
                      <option value="biweekly">{t.checkIns.biweekly}</option>
                      <option value="monthly">{t.checkIns.monthly}</option>
                    </select>
                    <textarea
                      value={editQuestions}
                      onChange={(e) => setEditQuestions(e.target.value)}
                      rows={4}
                      className="input"
                      placeholder={t.checkIns.oneQuestionPerLine}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(tmpl.id)}
                        disabled={savingEdit}
                        className="btn-primary text-xs"
                      >
                        <Check className="mr-1 h-3 w-3" />
                        {savingEdit ? t.common.saving : t.common.save}
                      </button>
                      <button
                        onClick={() => setEditingTemplate(null)}
                        className="btn-secondary text-xs"
                      >
                        {t.common.cancel}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-gray-900">{tmpl.name}</h3>
                      <div className="flex items-center gap-1">
                        <span className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-600 capitalize">
                          {t.checkIns[tmpl.frequency as keyof typeof t.checkIns] || tmpl.frequency}
                        </span>
                        <button
                          onClick={() => startEdit(tmpl)}
                          className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          title={t.common.edit}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDuplicate(tmpl.id)}
                          disabled={duplicating === tmpl.id}
                          className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          title={t.workouts.duplicate}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(tmpl.id)}
                          className="rounded-lg p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                          title={t.common.delete}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {(tmpl.questions as any[]).length} {t.portalCheckIns.questions}
                    </p>
                    <div className="mt-2 space-y-0.5">
                      {(tmpl.questions as any[]).slice(0, 3).map((q: any, i: number) => (
                        <p key={i} className="text-xs text-gray-400 truncate">
                          {i + 1}. {q.question}
                        </p>
                      ))}
                      {(tmpl.questions as any[]).length > 3 && (
                        <p className="text-xs text-gray-300">
                          +{(tmpl.questions as any[]).length - 3} {t.checkIns.more}
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Check-Ins */}
      <div className="mt-8">
        <h2 className="text-sm font-semibold text-gray-700">
          {t.checkIns.recentSubmissions}
        </h2>
        {checkIns.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              icon={ClipboardCheck}
              title={t.checkIns.noCheckIns}
              description={t.checkIns.noCheckInsDesc}
            />
          </div>
        ) : (
          <div className="mt-3 space-y-4">
            {checkIns.map((ci) => {
              const questions = ci.template.questions as any[];
              const answers = ci.answers as any[];

              return (
                <div key={ci.id} className="card">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar name={ci.client.name} size="sm" />
                      <div>
                        <p className="text-sm font-medium">{ci.client.name}</p>
                        <p className="text-xs text-gray-400">
                          {ci.template.name} &middot;{" "}
                          {new Date(ci.submittedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 space-y-2">
                    {questions.map((q: any) => {
                      const answer = answers.find(
                        (a: any) => a.questionId === q.id
                      );
                      return (
                        <div key={q.id}>
                          <p className="text-xs font-medium text-gray-500">
                            {q.question}
                          </p>
                          <p className="text-sm text-gray-900">
                            {answer?.answer || "—"}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {ci.coachNotes && (
                    <div className="mt-3 rounded-lg bg-brand-50 p-3">
                      <p className="text-xs font-medium text-brand-700">
                        {t.checkIns.yourResponse}
                      </p>
                      <p className="text-sm text-brand-900">{ci.coachNotes}</p>
                    </div>
                  )}

                  {respondingTo === ci.id ? (
                    <div className="mt-3 space-y-2">
                      <textarea
                        value={coachNote}
                        onChange={(e) => setCoachNote(e.target.value)}
                        placeholder={t.checkIns.writeFeedback}
                        rows={2}
                        className="input"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveCoachNote(ci.id)}
                          className="btn-primary text-xs"
                        >
                          {t.common.save}
                        </button>
                        <button
                          onClick={() => setRespondingTo(null)}
                          className="btn-secondary text-xs"
                        >
                          {t.common.cancel}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setRespondingTo(ci.id);
                        setCoachNote(ci.coachNotes || "");
                      }}
                      className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      {ci.coachNotes ? t.checkIns.editResponse : t.checkIns.respond}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Template Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center">
          <div className="w-full max-w-md rounded-t-2xl bg-white p-6 md:rounded-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{t.checkIns.newCheckInTemplate}</h2>
              <button onClick={() => setShowCreate(false)} className="rounded-lg p-1 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={createTemplate} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t.checkIns.templateName}
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  className="input mt-1"
                  placeholder={t.checkIns.templateNamePlaceholder}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t.checkIns.frequency}
                </label>
                <select name="frequency" className="input mt-1">
                  <option value="weekly">{t.checkIns.weekly}</option>
                  <option value="biweekly">{t.checkIns.biweekly}</option>
                  <option value="monthly">{t.checkIns.monthly}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t.checkIns.questionsPerLine}
                </label>
                <textarea
                  name="questions"
                  rows={5}
                  required
                  className="input mt-1"
                  placeholder={t.checkIns.questionsPlaceholder}
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn-primary flex-1">
                  {t.checkIns.createTemplate}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="btn-secondary"
                >
                  {t.common.cancel}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
