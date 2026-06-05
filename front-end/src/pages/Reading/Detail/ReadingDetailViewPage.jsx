import React, { useContext, useEffect, useMemo, useState } from "react";
import { useHistory, useParams } from "react-router-dom";
import { ArrowLeft, PencilLine, CheckCircle } from "lucide-react";
import { UserContext } from "../../../Context/UserProvider";
import { getPassageAnalysis, getReadingPassageDetail, checkGrammar } from "../../../services/readingService";
import "./ReadingDetailViewPage.css";

function ReadingDetailViewPage() {
  const history = useHistory();
  const { id } = useParams();
  const { user, admin } = useContext(UserContext);

  const [passage, setPassage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [grammarCheckLoading, setGrammarCheckLoading] = useState(false);
  const [grammarErrors, setGrammarErrors] = useState(null);

  const actorId = user?.account?.id ?? admin?.account?.id;
  const canEditPassage = Boolean(
    passage?.author?.id && (admin?.isAuthenticated || Number(passage.author.id) === Number(actorId))
  );

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      const res = await getReadingPassageDetail(id);
      if (!mounted) return;
      if (res?.errCode === 0 && res?.passage) {
        setPassage(res.passage);
        setError("");
        const a = await getPassageAnalysis(id);
        if (!mounted) return;
        if (a?.errCode === 0) setAnalysis(a.analysis);
      } else if (res?.errCode === -2) {
        history.push("/login");
      } else {
        setError(res?.errMessage || "Không tải được bài đọc");
      }
      setLoading(false);
    }
    if (id) load();
    return () => (mounted = false);
  }, [id, history]);

  const relatedGrammars = useMemo(() => {
    if (!analysis?.sentences) return [];
    const map = new Map();
    analysis.sentences.forEach((s) => {
      (s.tokens || []).forEach((t) => {
        if (!t?.grammarDatabaseId && !t?.grammarTag) return;
        const title = String(t.grammarTag || "").replace(/[\[\]]/g, "").trim() || t.text;
        if (!title) return;
        const key = t.grammarDatabaseId ? `id-${t.grammarDatabaseId}` : `title-${title}`;
        if (!map.has(key)) map.set(key, { id: t.grammarDatabaseId || null, title, meaning: t.meaning || "", jlpt: t.jlptLevel || "" });
      });
    });
    return Array.from(map.values());
  }, [analysis]);

  const handleCheckGrammar = async () => {
    if (!passage?.content) return;
    setGrammarCheckLoading(true);
    setGrammarErrors(null);
    const res = await checkGrammar(passage.content);
    if (res && res.errCode === 0) {
      setGrammarErrors(res.data || []);
    } else {
      setGrammarErrors([]); // Handle API errors gracefully
    }
    setGrammarCheckLoading(false);
  };

  const vocabulary = useMemo(() => {
    if (!analysis?.sentences) return [];
    const map = new Map();
    analysis.sentences.forEach((s) => {
      (s.tokens || []).forEach((t) => {
        const word = t?.text || t?.surface || "";
        const meaning = t?.meaning || "";
        const reading = t?.reading || t?.kana || "";
        if (!word || (!meaning && !reading)) return;
        const key = word.trim();
        if (!key) return;
        if (!map.has(key)) map.set(key, { word: key, reading, meaning });
      });
    });
    return Array.from(map.values()).slice(0, 200);
  }, [analysis]);

  if (loading) {
    return (
      <div className="rd-page">
        <div className="rd-shell">
          <div className="rd-loading">Đang tải...</div>
        </div>
      </div>
    );
  }

  if (error || !passage) {
    return (
      <div className="rd-page">
        <div className="rd-shell">
          <div className="rd-error">{error || "Bài đọc không tồn tại"}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="rd-page">
      <div className="rd-shell">
        <header className="rd-header">
          <button className="rd-back" onClick={() => history.push("/reading")}>
            <ArrowLeft /> Trở về
          </button>
          <div className="rd-controls">
            {canEditPassage && (
              <button className="rd-edit" onClick={() => history.push(`/reading/${id}/edit`)}>
                <PencilLine /> Chỉnh sửa
              </button>
            )}
          </div>
        </header>

        <section className="rd-hero">
          <div className="rd-hero-left">
            <h1 className="rd-title">{passage.title}</h1>
            {passage.summary && <p className="rd-summary">{passage.summary}</p>}
            <div className="rd-meta">
              <span>{passage.level || "mixed"}</span>
              <span>{passage.topic || "general"}</span>
              <span>{new Date(passage.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </section>

        <main className="rd-main">
          <article className="rd-article">
            <div className="rd-content">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h3 style={{ margin: 0 }}>Văn bản &amp; Dịch</h3>
                <button
                  className="rd-edit"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", fontSize: "0.85rem", padding: "4px 12px" }}
                  onClick={handleCheckGrammar}
                  disabled={grammarCheckLoading}
                >
                  <CheckCircle size={14} style={{ marginRight: "6px" }} />
                  {grammarCheckLoading ? "Đang kiểm tra..." : "Kiểm tra ngữ pháp"}
                </button>
              </div>

              {grammarErrors !== null && (
                <div className="grammar-feedback-container" style={{ marginBottom: "20px", padding: "16px", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <h4 style={{ margin: "0 0 12px 0", fontSize: "1rem", color: grammarErrors.length > 0 ? "#ff9800" : "#4caf50" }}>
                    {grammarErrors.length > 0 ? `Phát hiện ${grammarErrors.length} vấn đề ngữ pháp/văn phong:` : "Tuyệt vời! Không phát hiện lỗi ngữ pháp nào."}
                  </h4>
                  {grammarErrors.length > 0 && (
                    <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: "1.6" }}>
                      {grammarErrors.map((err, idx) => (
                        <li key={idx} style={{ marginBottom: "8px" }}>
                          <strong>Dòng {err.line}, chữ thứ {err.column}:</strong> {err.message}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <div className="rd-text-card">
                <div className="rd-text">{passage.content}</div>
                <div className="rd-translation-inline">{passage.translation || "Chưa có bản dịch."}</div>
              </div>

              <h3>Từ vựng</h3>
              {vocabulary.length === 0 ? (
                <div className="rd-grammar-empty">Không tìm thấy từ vựng.</div>
              ) : (
                <div className="rd-vocab-list">
                  {vocabulary.map((v) => (
                    <div className="rd-vocab-item" key={v.word}>
                      <div className="rd-vocab-word">
                        {v.word}
                        {v.reading && <span className="rd-vocab-reading"> — {v.reading}</span>}
                      </div>
                      {v.meaning && <div className="rd-vocab-meaning">{v.meaning}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </article>

          <aside className="rd-aside">
            <div className="rd-card">
              <strong>Thông tin</strong>
              <div>Level: {passage.level || "mixed"}</div>
              <div>Topic: {passage.topic || "general"}</div>
              <div>Cập nhật: {new Date(passage.updatedAt).toLocaleDateString()}</div>
            </div>

            <div className="rd-card">
              <strong>Người tạo</strong>
              <div>{passage.author?.username || "Community"}</div>
            </div>

            <div className="rd-card rd-card-grammar">
              <strong>Ngữ pháp liên quan</strong>
              {relatedGrammars.length === 0 ? (
                <div className="rd-grammar-empty">Chưa có ngữ pháp được nhận diện.</div>
              ) : (
                <div className="rd-grammar-list">
                  {relatedGrammars.map((g) => (
                    <div className="rd-grammar-item" key={g.id || g.title}>
                      <div className="rd-grammar-head">
                        <div className="rd-grammar-title">{g.title}</div>
                        {g.jlpt && <div className="rd-grammar-level">{g.jlpt}</div>}
                      </div>
                      {g.meaning && <div className="rd-grammar-meaning">{g.meaning}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </main>

        <footer className="rd-footer">Tạo: {new Date(passage.createdAt).toLocaleDateString()}</footer>
      </div>
    </div>
  );
}

export default ReadingDetailViewPage;