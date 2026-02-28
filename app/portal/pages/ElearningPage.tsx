import { useState, useEffect } from "react";
import { T } from "@shared/styles/tokens";
import { Icon, icons } from "@shared/components/Icon";
import { SectionLabel } from "@shared/components/SectionLabel";
import { supabase } from "@shared/lib/supabase";
import { type ClientOrg } from "../lib/api";

// Content items stored in the content JSONB array
interface TextContent {
  type: "text";
  title: string;
  body: string;
}

interface QuizContent {
  type: "quiz";
  question: string;
  options: string[];
  correct: number;
  explanation?: string;
}

type ContentItem = TextContent | QuizContent;

interface ElearningModule {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  duration_minutes: number;
  passing_score: number;
  sro_relevant: string[];
  content: ContentItem[];
  created_at: string;
}

interface ElearningProgress {
  module_id: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  score: number | null;
}

interface ElearningPageProps {
  org: ClientOrg | null;
}

export function ElearningPage({ org }: ElearningPageProps) {
  const [modules, setModules] = useState<ElearningModule[]>([]);
  const [progressMap, setProgressMap] = useState<Map<string, ElearningProgress>>(new Map());
  const [loading, setLoading] = useState(true);
  const [activeModule, setActiveModule] = useState<ElearningModule | null>(null);
  const [contentIndex, setContentIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!org) return;
    loadData();
  }, [org]);

  const loadData = async () => {
    if (!org) return;
    setLoading(true);
    setError(null);
    try {
      const [modulesRes, progressRes] = await Promise.all([
        supabase.from("elearning_modules").select("*").order("created_at"),
        supabase.from("elearning_progress").select("*").eq("organization_id", org.id),
      ]);

      if (modulesRes.error) throw modulesRes.error;
      // Note: progress query may return nothing for first-time users, that's OK

      setModules((modulesRes.data ?? []) as ElearningModule[]);
      const map = new Map<string, ElearningProgress>();
      (progressRes.data ?? []).forEach((p: ElearningProgress) => {
        map.set(p.module_id, p);
      });
      setProgressMap(map);
    } catch (err) {
      console.error("E-Learning load error:", err);
      setError("Schulungen konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  };

  const getSlides = (mod: ElearningModule): TextContent[] =>
    (mod.content ?? []).filter((c): c is TextContent => c.type === "text");

  const getQuizzes = (mod: ElearningModule): QuizContent[] =>
    (mod.content ?? []).filter((c): c is QuizContent => c.type === "quiz");

  const startModule = async (mod: ElearningModule) => {
    setActiveModule(mod);
    setContentIndex(0);
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizScore(null);

    // Track start via upsert — use user_id from auth
    if (!progressMap.has(mod.id)) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("elearning_progress").upsert(
            {
              user_id: user.id,
              organization_id: org!.id,
              module_id: mod.id,
              status: "in_progress",
              started_at: new Date().toISOString(),
            },
            { onConflict: "user_id,module_id" },
          );
          setProgressMap((prev) => {
            const next = new Map(prev);
            next.set(mod.id, { module_id: mod.id, status: "in_progress", started_at: new Date().toISOString(), completed_at: null, score: null });
            return next;
          });
        }
      } catch (err) {
        console.error("Progress tracking failed:", err);
      }
    }
  };

  const submitQuiz = async () => {
    if (!activeModule || !org) return;
    const questions = getQuizzes(activeModule);
    let correct = 0;
    questions.forEach((q, i) => {
      if (quizAnswers[i] === q.correct) correct++;
    });
    const score = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 100;
    setQuizScore(score);
    setQuizSubmitted(true);

    const passed = score >= activeModule.passing_score;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("elearning_progress").upsert(
          {
            user_id: user.id,
            organization_id: org.id,
            module_id: activeModule.id,
            status: passed ? "completed" : "failed",
            score,
            completed_at: passed ? new Date().toISOString() : null,
          },
          { onConflict: "user_id,module_id" },
        );
        if (passed) {
          setProgressMap((prev) => {
            const next = new Map(prev);
            next.set(activeModule.id, { ...prev.get(activeModule.id)!, status: "completed", completed_at: new Date().toISOString(), score });
            return next;
          });
        }
      }
    } catch (err) {
      console.error("Quiz save failed:", err);
    }
  };

  const handleCertificateDownload = () => {
    alert("Zertifikat-Download wird in einer zukünftigen Version verfügbar sein (jsPDF).");
  };

  const completedModules = [...progressMap.values()].filter((p) => p.completed_at).length;
  const totalModules = modules.length;

  if (loading) {
    return (
      <div style={{ padding: "40px 48px", textAlign: "center", color: T.ink3, fontFamily: T.sans }}>
        Schulungen werden geladen...
      </div>
    );
  }

  // Module player
  if (activeModule) {
    const slides = getSlides(activeModule);
    const questions = getQuizzes(activeModule);
    const allContent = activeModule.content ?? [];
    const currentItem = allContent[contentIndex];
    const isQuizItem = currentItem?.type === "quiz";
    const isLastItem = contentIndex >= allContent.length - 1;
    const progress = progressMap.get(activeModule.id);
    const isCompleted = !!progress?.completed_at;

    // Calculate quiz index for this specific quiz item
    const quizIndex = allContent.slice(0, contentIndex + 1).filter((c) => c.type === "quiz").length - 1;

    // Check if we're done with all content → show final quiz review
    const showQuizReview = contentIndex >= allContent.length;

    return (
      <div style={{ padding: "40px 48px", maxWidth: 800 }}>
        <button
          onClick={() => setActiveModule(null)}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", color: T.ink3, fontSize: 13, cursor: "pointer", fontFamily: T.sans, padding: 0, marginBottom: 16 }}
        >
          <Icon d={icons.back} size={14} color={T.ink3} />
          Zurück zur Übersicht
        </button>

        <h2 style={{ fontSize: 22, fontWeight: 700, color: T.ink, fontFamily: T.sans, margin: "0 0 4px" }}>
          {activeModule.title}
        </h2>
        <p style={{ fontSize: 13, color: T.ink3, fontFamily: T.sans, margin: "0 0 20px" }}>
          {activeModule.duration_minutes} Min. | Bestehensgrenze: {activeModule.passing_score}%
        </p>

        {!showQuizReview ? (
          <div style={{ background: "#fff", borderRadius: T.rLg, border: `1px solid ${T.border}`, boxShadow: T.shMd, marginBottom: 24 }}>
            {/* Progress header */}
            <div style={{ padding: "14px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: T.ink3, fontFamily: T.sans }}>
                {contentIndex + 1} von {allContent.length}
              </span>
              <div style={{ height: 3, flex: 1, marginLeft: 16, borderRadius: 2, background: T.s2 }}>
                <div style={{ height: 3, borderRadius: 2, background: T.accent, width: `${((contentIndex + 1) / allContent.length) * 100}%`, transition: "width 0.3s" }} />
              </div>
            </div>

            <div style={{ padding: "28px 32px" }}>
              {currentItem?.type === "text" && (
                <>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: T.ink, fontFamily: T.sans, margin: "0 0 14px" }}>
                    {(currentItem as TextContent).title}
                  </h3>
                  <div style={{ fontSize: 14, color: T.ink2, fontFamily: T.sans, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                    {(currentItem as TextContent).body}
                  </div>
                </>
              )}

              {currentItem?.type === "quiz" && (
                <>
                  <div style={{ fontSize: 10, fontWeight: 700, color: T.accent, background: T.accentS, padding: "2px 8px", borderRadius: 6, fontFamily: T.sans, textTransform: "uppercase", display: "inline-block", marginBottom: 12 }}>
                    Quizfrage
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: T.ink, fontFamily: T.sans, marginBottom: 14 }}>
                    {(currentItem as QuizContent).question}
                  </div>
                  {(currentItem as QuizContent).options.map((opt, oi) => {
                    const isSelected = quizAnswers[quizIndex] === oi;
                    return (
                      <div
                        key={oi}
                        onClick={() => setQuizAnswers((prev) => ({ ...prev, [quizIndex]: oi }))}
                        style={{
                          padding: "10px 14px", borderRadius: 8, marginBottom: 6,
                          border: `1.5px solid ${isSelected ? T.accent : T.border}`,
                          background: isSelected ? T.accentS : "#fff",
                          cursor: "pointer", fontSize: 13, color: T.ink, fontFamily: T.sans,
                          display: "flex", alignItems: "center", gap: 10,
                        }}
                      >
                        <div style={{
                          width: 18, height: 18, borderRadius: "50%", border: `2px solid ${isSelected ? T.accent : T.border}`,
                          background: isSelected ? T.accent : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                        }}>
                          {isSelected && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }} />}
                        </div>
                        {opt}
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            {/* Navigation */}
            <div style={{ padding: "12px 20px", borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between" }}>
              <button onClick={() => setContentIndex((i) => Math.max(0, i - 1))} disabled={contentIndex === 0}
                style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${T.border}`, background: "#fff", color: contentIndex === 0 ? T.ink4 : T.ink2, fontSize: 12, fontWeight: 600, cursor: contentIndex === 0 ? "default" : "pointer", fontFamily: T.sans }}>
                Zurück
              </button>
              {!isLastItem ? (
                <button onClick={() => setContentIndex((i) => i + 1)}
                  disabled={isQuizItem && quizAnswers[quizIndex] === undefined}
                  style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: (isQuizItem && quizAnswers[quizIndex] === undefined) ? T.s2 : T.accent, color: (isQuizItem && quizAnswers[quizIndex] === undefined) ? T.ink4 : "#fff", fontSize: 12, fontWeight: 600, cursor: (isQuizItem && quizAnswers[quizIndex] === undefined) ? "default" : "pointer", fontFamily: T.sans }}>
                  Weiter
                </button>
              ) : questions.length > 0 ? (
                <button onClick={() => { setContentIndex(allContent.length); submitQuiz(); }}
                  disabled={isQuizItem && quizAnswers[quizIndex] === undefined}
                  style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: T.primaryDeep, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: T.sans }}>
                  Auswertung
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          /* Quiz results */
          <div style={{ background: "#fff", borderRadius: T.rLg, border: `1px solid ${T.border}`, boxShadow: T.shMd, padding: "28px 32px", marginBottom: 24 }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: T.ink, fontFamily: T.sans, margin: "0 0 20px" }}>Ergebnis</h3>

            {/* Score display */}
            <div style={{ padding: "16px 20px", borderRadius: T.r, background: quizScore! >= activeModule.passing_score ? T.accentS : "#fef2f2", border: `1px solid ${quizScore! >= activeModule.passing_score ? `${T.accent}33` : "#dc262633"}`, marginBottom: 20 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: quizScore! >= activeModule.passing_score ? T.accent : "#dc2626", fontFamily: T.sans, marginBottom: 4 }}>
                {quizScore}%
              </div>
              <div style={{ fontSize: 13, color: quizScore! >= activeModule.passing_score ? T.accent : "#dc2626", fontFamily: T.sans }}>
                {quizScore! >= activeModule.passing_score ? "Bestanden! Sie haben den Test erfolgreich abgeschlossen." : `Nicht bestanden. Mindestens ${activeModule.passing_score}% erforderlich.`}
              </div>
            </div>

            {/* Show correct answers */}
            {questions.map((q, qi) => {
              const userAnswer = quizAnswers[qi];
              const isCorrect = userAnswer === q.correct;
              return (
                <div key={qi} style={{ marginBottom: 16, padding: "12px 16px", borderRadius: 8, background: isCorrect ? T.accentS : "#fef2f2", border: `1px solid ${isCorrect ? `${T.accent}22` : "#dc262622"}` }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, fontFamily: T.sans, marginBottom: 6 }}>
                    {qi + 1}. {q.question}
                  </div>
                  <div style={{ fontSize: 12, fontFamily: T.sans, color: isCorrect ? T.accent : "#dc2626" }}>
                    {isCorrect ? "Richtig" : `Falsch — Richtige Antwort: ${q.options[q.correct]}`}
                  </div>
                  {q.explanation && (
                    <div style={{ fontSize: 12, color: T.ink3, fontFamily: T.sans, marginTop: 4, fontStyle: "italic" }}>
                      {q.explanation}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Retry button if failed */}
            {quizScore! < activeModule.passing_score && (
              <button onClick={() => { setContentIndex(0); setQuizAnswers({}); setQuizSubmitted(false); setQuizScore(null); }}
                style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: T.accent, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: T.sans, marginTop: 8 }}>
                Erneut versuchen
              </button>
            )}
          </div>
        )}

        {/* Certificate download */}
        {isCompleted && (
          <button onClick={handleCertificateDownload}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 20px", borderRadius: 10, border: "none", background: T.primaryDeep, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: T.sans }}>
            <Icon d={icons.download} size={14} color="#fff" />
            Zertifikat herunterladen
          </button>
        )}
      </div>
    );
  }

  // Module catalog
  return (
    <div style={{ padding: "40px 48px", maxWidth: 900 }}>
      <SectionLabel text="AML Schulungen" />
      <h1 style={{ fontSize: 28, fontWeight: 700, color: T.ink, fontFamily: T.sans, margin: "0 0 4px", letterSpacing: "-0.5px" }}>
        AML Schulungen
      </h1>
      <p style={{ fontSize: 15, color: T.ink3, fontFamily: T.sans, margin: "0 0 28px" }}>
        Obligatorische und weiterführende Compliance-Schulungen für Ihr Team.
      </p>

      {error && (
        <div style={{ padding: "12px 16px", borderRadius: 8, background: "#fef2f2", border: "1px solid #dc262622", color: "#dc2626", fontSize: 13, fontFamily: T.sans, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Progress summary */}
      <div style={{ marginBottom: 28, background: "#fff", borderRadius: T.rLg, padding: "20px 24px", border: `1px solid ${T.border}`, boxShadow: T.shSm }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: T.ink, fontFamily: T.sans }}>Gesamtfortschritt</span>
          <span style={{ fontSize: 13, color: T.ink3, fontFamily: T.sans }}>{completedModules} von {totalModules} abgeschlossen</span>
        </div>
        <div style={{ height: 6, borderRadius: 3, background: T.s2 }}>
          <div style={{ height: 6, borderRadius: 3, background: T.accent, width: totalModules > 0 ? `${(completedModules / totalModules) * 100}%` : "0%", transition: "width 0.3s" }} />
        </div>
      </div>

      {/* Module cards */}
      {modules.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: T.ink3, fontFamily: T.sans, background: "#fff", borderRadius: T.rLg, border: `1px solid ${T.border}` }}>
          <Icon d={icons.sparkle} size={32} color={T.ink4} />
          <div style={{ fontSize: 14, fontWeight: 500, marginTop: 12 }}>Keine Schulungsmodule verfügbar.</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {modules.map((mod) => {
            const prog = progressMap.get(mod.id);
            const isCompleted = !!prog?.completed_at;
            const isStarted = !!prog?.started_at && !isCompleted;
            const statusLabel = isCompleted ? "Abgeschlossen" : isStarted ? "Begonnen" : "Nicht gestartet";
            const statusColor = isCompleted ? T.accent : isStarted ? "#d97706" : T.ink4;
            const statusBg = isCompleted ? T.accentS : isStarted ? "#fffbeb" : T.s2;
            const slideCount = getSlides(mod).length;
            const quizCount = getQuizzes(mod).length;

            return (
              <div
                key={mod.id}
                onClick={() => startModule(mod)}
                style={{
                  background: "#fff", borderRadius: T.rLg, border: `1px solid ${T.border}`,
                  boxShadow: T.shSm, cursor: "pointer", transition: "all 0.15s", overflow: "hidden",
                }}
                onMouseOver={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = T.shMd; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-1px)"; }}
                onMouseOut={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = T.shSm; (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; }}
              >
                <div style={{ padding: "20px 22px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: statusColor, background: statusBg, padding: "2px 8px", borderRadius: 6, fontFamily: T.sans, textTransform: "uppercase" }}>
                      {statusLabel}
                    </span>
                    {isCompleted && prog?.score != null && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: T.accent, background: T.accentS, padding: "2px 8px", borderRadius: 6, fontFamily: T.sans }}>
                        {prog.score}%
                      </span>
                    )}
                  </div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: T.ink, fontFamily: T.sans, margin: "0 0 6px" }}>{mod.title}</h3>
                  <p style={{ fontSize: 12.5, color: T.ink3, fontFamily: T.sans, margin: "0 0 12px", lineHeight: 1.4 }}>{mod.description}</p>
                  <div style={{ display: "flex", gap: 12, fontSize: 11, color: T.ink4, fontFamily: T.sans }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <Icon d={icons.clock} size={12} color={T.ink4} />
                      {mod.duration_minutes} Min.
                    </span>
                    <span>{slideCount} Folien, {quizCount} Fragen</span>
                  </div>
                </div>
                {isCompleted && (
                  <div style={{ padding: "8px 22px", borderTop: `1px solid ${T.border}`, background: T.accentS }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: T.accent, fontFamily: T.sans, display: "flex", alignItems: "center", gap: 4 }}>
                      <Icon d={icons.check} size={12} color={T.accent} />
                      Zertifikat verfügbar
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
