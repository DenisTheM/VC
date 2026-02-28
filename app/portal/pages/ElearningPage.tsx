import { useState, useEffect } from "react";
import { T } from "@shared/styles/tokens";
import { Icon, icons } from "@shared/components/Icon";
import { SectionLabel } from "@shared/components/SectionLabel";
import { supabase } from "@shared/lib/supabase";
import { type ClientOrg } from "../lib/api";

interface ElearningModule {
  id: string;
  title: string;
  description: string;
  duration_minutes: number;
  passing_score: number;
  slides: { title: string; content: string }[];
  quiz_questions: { question: string; options: string[]; correct_index: number }[];
  sort_order: number;
}

interface ElearningProgress {
  module_id: string;
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
  const [slideIndex, setSlideIndex] = useState(0);
  const [quizMode, setQuizMode] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState<number | null>(null);

  useEffect(() => {
    if (!org) return;
    loadData();
  }, [org]);

  const loadData = async () => {
    if (!org) return;
    setLoading(true);
    try {
      const [modulesRes, progressRes] = await Promise.all([
        supabase.from("elearning_modules").select("*").order("sort_order"),
        supabase.from("elearning_progress").select("*").eq("organization_id", org.id),
      ]);

      if (modulesRes.error) throw modulesRes.error;
      if (progressRes.error) throw progressRes.error;

      setModules((modulesRes.data ?? []) as ElearningModule[]);
      const map = new Map<string, ElearningProgress>();
      (progressRes.data ?? []).forEach((p: ElearningProgress) => {
        map.set(p.module_id, p);
      });
      setProgressMap(map);
    } catch (err) {
      console.error("E-Learning load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const startModule = async (mod: ElearningModule) => {
    if (!org) return;
    setActiveModule(mod);
    setSlideIndex(0);
    setQuizMode(false);
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizScore(null);

    // Track start
    if (!progressMap.has(mod.id)) {
      try {
        await supabase.from("elearning_progress").upsert(
          { organization_id: org.id, module_id: mod.id, started_at: new Date().toISOString() },
          { onConflict: "organization_id,module_id" },
        );
        setProgressMap((prev) => {
          const next = new Map(prev);
          next.set(mod.id, { module_id: mod.id, started_at: new Date().toISOString(), completed_at: null, score: null });
          return next;
        });
      } catch (err) {
        console.error("Progress tracking failed:", err);
      }
    }
  };

  const submitQuiz = async () => {
    if (!activeModule || !org) return;
    const questions = activeModule.quiz_questions ?? [];
    let correct = 0;
    questions.forEach((q, i) => {
      if (quizAnswers[i] === q.correct_index) correct++;
    });
    const score = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 100;
    setQuizScore(score);
    setQuizSubmitted(true);

    const passed = score >= activeModule.passing_score;
    try {
      await supabase.from("elearning_progress").upsert(
        {
          organization_id: org.id,
          module_id: activeModule.id,
          score,
          completed_at: passed ? new Date().toISOString() : null,
        },
        { onConflict: "organization_id,module_id" },
      );
      if (passed) {
        setProgressMap((prev) => {
          const next = new Map(prev);
          next.set(activeModule.id, { ...prev.get(activeModule.id)!, completed_at: new Date().toISOString(), score });
          return next;
        });
      }
    } catch (err) {
      console.error("Quiz save failed:", err);
    }
  };

  const handleCertificateDownload = () => {
    // Placeholder for jsPDF certificate generation
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

  // Module player modal
  if (activeModule) {
    const slides = activeModule.slides ?? [];
    const questions = activeModule.quiz_questions ?? [];
    const progress = progressMap.get(activeModule.id);
    const isCompleted = !!progress?.completed_at;

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

        {!quizMode ? (
          <>
            {/* Slide content */}
            {slides.length > 0 && (
              <div style={{ background: "#fff", borderRadius: T.rLg, border: `1px solid ${T.border}`, boxShadow: T.shMd, marginBottom: 24 }}>
                <div style={{ padding: "14px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: T.ink3, fontFamily: T.sans }}>
                    Folie {slideIndex + 1} von {slides.length}
                  </span>
                  <div style={{ height: 3, flex: 1, marginLeft: 16, borderRadius: 2, background: T.s2 }}>
                    <div style={{ height: 3, borderRadius: 2, background: T.accent, width: `${((slideIndex + 1) / slides.length) * 100}%`, transition: "width 0.3s" }} />
                  </div>
                </div>
                <div style={{ padding: "28px 32px" }}>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: T.ink, fontFamily: T.sans, margin: "0 0 14px" }}>
                    {slides[slideIndex]?.title}
                  </h3>
                  <div style={{ fontSize: 14, color: T.ink2, fontFamily: T.sans, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                    {slides[slideIndex]?.content}
                  </div>
                </div>
                <div style={{ padding: "12px 20px", borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between" }}>
                  <button onClick={() => setSlideIndex((i) => Math.max(0, i - 1))} disabled={slideIndex === 0}
                    style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${T.border}`, background: "#fff", color: slideIndex === 0 ? T.ink4 : T.ink2, fontSize: 12, fontWeight: 600, cursor: slideIndex === 0 ? "default" : "pointer", fontFamily: T.sans }}>
                    Zurück
                  </button>
                  {slideIndex < slides.length - 1 ? (
                    <button onClick={() => setSlideIndex((i) => i + 1)}
                      style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: T.accent, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: T.sans }}>
                      Weiter
                    </button>
                  ) : questions.length > 0 ? (
                    <button onClick={() => setQuizMode(true)}
                      style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: T.primaryDeep, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: T.sans }}>
                      Quiz starten
                    </button>
                  ) : null}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Quiz */}
            <div style={{ background: "#fff", borderRadius: T.rLg, border: `1px solid ${T.border}`, boxShadow: T.shMd, padding: "28px 32px", marginBottom: 24 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: T.ink, fontFamily: T.sans, margin: "0 0 20px" }}>Wissenstest</h3>
              {questions.map((q, qi) => (
                <div key={qi} style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: T.ink, fontFamily: T.sans, marginBottom: 10 }}>
                    {qi + 1}. {q.question}
                  </div>
                  {q.options.map((opt, oi) => {
                    const isSelected = quizAnswers[qi] === oi;
                    const isCorrect = quizSubmitted && oi === q.correct_index;
                    const isWrong = quizSubmitted && isSelected && oi !== q.correct_index;
                    return (
                      <div
                        key={oi}
                        onClick={() => { if (!quizSubmitted) setQuizAnswers((prev) => ({ ...prev, [qi]: oi })); }}
                        style={{
                          padding: "10px 14px", borderRadius: 8, marginBottom: 6,
                          border: `1.5px solid ${isCorrect ? T.accent : isWrong ? T.red : isSelected ? T.accent : T.border}`,
                          background: isCorrect ? T.accentS : isWrong ? T.redS : isSelected ? T.accentS : "#fff",
                          cursor: quizSubmitted ? "default" : "pointer", fontSize: 13, color: T.ink, fontFamily: T.sans,
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
                </div>
              ))}

              {!quizSubmitted ? (
                <button onClick={submitQuiz} disabled={Object.keys(quizAnswers).length < questions.length}
                  style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: Object.keys(quizAnswers).length >= questions.length ? T.accent : T.s2, color: Object.keys(quizAnswers).length >= questions.length ? "#fff" : T.ink4, fontSize: 13, fontWeight: 700, cursor: Object.keys(quizAnswers).length >= questions.length ? "pointer" : "default", fontFamily: T.sans }}>
                  Auswertung
                </button>
              ) : (
                <div style={{ padding: "16px 20px", borderRadius: T.r, background: quizScore! >= activeModule.passing_score ? T.accentS : T.redS, border: `1px solid ${quizScore! >= activeModule.passing_score ? `${T.accent}33` : `${T.red}33`}` }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: quizScore! >= activeModule.passing_score ? T.accent : T.red, fontFamily: T.sans, marginBottom: 4 }}>
                    {quizScore}%
                  </div>
                  <div style={{ fontSize: 13, color: quizScore! >= activeModule.passing_score ? T.accent : T.red, fontFamily: T.sans }}>
                    {quizScore! >= activeModule.passing_score ? "Bestanden! Sie haben den Test erfolgreich abgeschlossen." : `Nicht bestanden. Mindestens ${activeModule.passing_score}% erforderlich.`}
                  </div>
                </div>
              )}
            </div>
          </>
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
                    <span>Bestehensgrenze: {mod.passing_score}%</span>
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
