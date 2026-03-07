"use client";

import { useState, useEffect } from "react";
import { ClipboardCheck, Check, ChevronDown, ChevronUp } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { useT } from "@/lib/i18n";
import type { CheckInQuestion, CheckInAnswer } from "@/types";

interface CheckInTemplate {
  id: string;
  name: string;
  questions: CheckInQuestion[];
  frequency: string;
  isActive: boolean;
}

interface CheckIn {
  id: string;
  answers: CheckInAnswer[];
  submittedAt: string;
  coachNotes: string | null;
  template: { name: string; questions: CheckInQuestion[] };
}

export default function PortalCheckInsPage() {
  const t = useT();
  const [templates, setTemplates] = useState<CheckInTemplate[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null);

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

  async function handleSubmit(templateId: string) {
    setSubmitting(true);
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;

    const answerList = template.questions.map((q) => ({
      questionId: q.id,
      answer: answers[q.id] || "",
    }));

    const res = await fetch("/api/check-ins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateId, answers: answerList }),
    });

    if (res.ok) {
      setSubmitted(true);
      setActiveTemplate(null);
      setAnswers({});
      // Reload check-ins
      const updated = await fetch("/api/check-ins").then((r) => r.json());
      setCheckIns(updated);
    }
    setSubmitting(false);
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
      <h1 className="text-2xl font-bold text-gray-900">{t.portalCheckIns.title}</h1>
      <p className="mt-1 text-sm text-gray-500">
        {t.portalCheckIns.subtitle}
      </p>

      {submitted && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-700">
          <Check className="h-4 w-4" />
          {t.portalCheckIns.submittedSuccess}
        </div>
      )}

      {/* Available Templates */}
      {templates.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={ClipboardCheck}
            title={t.portalCheckIns.noCheckIns}
            description={t.portalCheckIns.noCheckInsDesc}
          />
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {templates
            .filter((t) => t.isActive !== false)
            .map((template) => {
              const isActive = activeTemplate === template.id;

              return (
                <div key={template.id} className="card">
                  <button
                    onClick={() =>
                      setActiveTemplate(isActive ? null : template.id)
                    }
                    className="flex w-full items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <ClipboardCheck className="h-5 w-5 text-brand-600" />
                      <div className="text-left">
                        <h3 className="font-semibold text-gray-900">
                          {template.name}
                        </h3>
                        <p className="text-xs text-gray-500 capitalize">
                          {template.frequency} &middot; {template.questions.length}{" "}
                          {t.portalCheckIns.questions}
                        </p>
                      </div>
                    </div>
                    <span className="btn-primary text-xs">{t.portalCheckIns.fillOut}</span>
                  </button>

                  {isActive && (
                    <div className="mt-4 space-y-4 border-t border-gray-100 pt-4">
                      {template.questions.map((q) => (
                        <div key={q.id}>
                          <label className="block text-sm font-medium text-gray-700">
                            {q.question}
                          </label>
                          {q.type === "rating" ? (
                            <div className="mt-2 flex gap-2">
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                                <button
                                  key={n}
                                  type="button"
                                  onClick={() =>
                                    setAnswers((prev) => ({
                                      ...prev,
                                      [q.id]: String(n),
                                    }))
                                  }
                                  className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                                    answers[q.id] === String(n)
                                      ? "bg-brand-600 text-white"
                                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                  }`}
                                >
                                  {n}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <textarea
                              rows={2}
                              className="input mt-1"
                              value={answers[q.id] || ""}
                              onChange={(e) =>
                                setAnswers((prev) => ({
                                  ...prev,
                                  [q.id]: e.target.value,
                                }))
                              }
                              placeholder={t.portalCheckIns.yourAnswer}
                            />
                          )}
                        </div>
                      ))}
                      <button
                        onClick={() => handleSubmit(template.id)}
                        disabled={submitting}
                        className="btn-primary w-full"
                      >
                        {submitting ? t.portalCheckIns.submitting : t.portalCheckIns.submit}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}

      {/* History */}
      {checkIns.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900">
            {t.portalCheckIns.previousResponses}
          </h2>
          <div className="mt-3 space-y-3">
            {checkIns.map((ci) => {
              const isExpanded = expandedHistory === ci.id;

              return (
                <div key={ci.id} className="card">
                  <button
                    onClick={() =>
                      setExpandedHistory(isExpanded ? null : ci.id)
                    }
                    className="flex w-full items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium">{ci.template.name}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(ci.submittedAt).toLocaleDateString()}
                      </p>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
                      {ci.template.questions.map((q) => {
                        const answer = ci.answers.find(
                          (a) => a.questionId === q.id
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
                      {ci.coachNotes && (
                        <div className="mt-2 rounded-lg bg-brand-50 p-3">
                          <p className="text-xs font-medium text-brand-700">
                            {t.portalCheckIns.coachFeedback}
                          </p>
                          <p className="text-sm text-brand-900">
                            {ci.coachNotes}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
