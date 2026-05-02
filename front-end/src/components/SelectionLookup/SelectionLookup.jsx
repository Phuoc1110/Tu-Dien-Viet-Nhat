import React, { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import lookupService from "../../services/lookupService";
import "./SelectionLookup.css";

const SelectionLookup = ({ containerSelector = "body" }) => {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [selectedText, setSelectedText] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("vocabulary");
  const iconRef = useRef(null);
  const popRef = useRef(null);

  const hasJapaneseChar = (value) => /[\u3040-\u30FF\u4E00-\u9FFF]/.test(String(value || ""));

  const getContainerElement = () => {
    if (typeof containerSelector !== "string" || !containerSelector.trim()) {
      return document.body;
    }

    return document.querySelector(containerSelector) || document.body;
  };

  useEffect(() => {
    const handleSelection = (e) => {
      const target = e.target;
      if (iconRef.current && iconRef.current.contains(target)) {
        return;
      }
      if (popRef.current && popRef.current.contains(target)) {
        return;
      }

      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) {
        setVisible(false);
        setIsPopoverOpen(false);
        setSelectedText("");
        return;
      }
      const text = sel.toString().trim();
      if (!text) {
        setVisible(false);
        setIsPopoverOpen(false);
        setSelectedText("");
        return;
      }

      const range = sel.getRangeAt(0);
      const container = getContainerElement();
      if (container && !container.contains(range.commonAncestorContainer)) {
        setVisible(false);
        setIsPopoverOpen(false);
        setSelectedText("");
        return;
      }

      const rect = range.getBoundingClientRect();
      if (!rect) {
        setVisible(false);
        setIsPopoverOpen(false);
        return;
      }

      if (!hasJapaneseChar(text)) {
        setVisible(false);
        setIsPopoverOpen(false);
        setSelectedText("");
        return;
      }

      // prefer showing above selection, fallback below
      const top = rect.top - 40;
      const left = rect.left + rect.width / 2;

      setPos({ top: Math.max(top + window.scrollY, 8), left: left + window.scrollX });
      setSelectedText(text);
      setVisible(true);
      setIsPopoverOpen(false);
      setActiveTab("vocabulary");
      setData(null);
    };

    document.addEventListener("mouseup", handleSelection);
    document.addEventListener("keyup", handleSelection);

    return () => {
      document.removeEventListener("mouseup", handleSelection);
      document.removeEventListener("keyup", handleSelection);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (iconRef.current && iconRef.current.contains(e.target)) return;
      if (popRef.current && popRef.current.contains(e.target)) return;
      // clicking elsewhere should hide icon and selection
      if (visible) {
        setVisible(false);
        setIsPopoverOpen(false);
        setSelectedText("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [visible]);

  const openLookup = async () => {
    if (!selectedText) return;
    setLoading(true);
    setIsPopoverOpen(true);
    setData(null);
    try {
      const res = await lookupService.lookup(selectedText);
      setData(res || null);
      setActiveTab(res?.bestTab || "vocabulary");
    } catch (err) {
      setData({ error: "Lỗi khi gọi API" });
    }
    setLoading(false);
  };

  if (!visible) return null;

  return (
    <div>
      <button
        ref={iconRef}
        className="selection-lookup-icon"
        style={{ top: pos.top, left: pos.left }}
        onClick={openLookup}
        title="Tra cứu"
      >
        <Search size={16} />
      </button>

      {/** Popover shown after clicking the icon */}
      {isPopoverOpen && (
        <div ref={popRef} className="selection-lookup-popover" style={{ top: pos.top + 36, left: pos.left }}>
          <div className="pop-header">
            <strong>{selectedText}</strong>
            <button className="pop-close" onClick={() => { setData(null); setVisible(false); setIsPopoverOpen(false); setSelectedText(""); }}>×</button>
          </div>
          <div className="pop-body">
            {loading && <div className="pop-loading">Đang tải...</div>}
            {!loading && data?.error && <div className="pop-error">{data.error}</div>}
            {!loading && !data?.error && (
              <div>
                <div className="selection-summary-line">
                  {data?.kanjiInfo ? <span>Hán tự</span> : null}
                  {data?.grammar ? <span>Ngữ pháp</span> : null}
                  {Array.isArray(data?.examples) && data.examples.length > 0 ? <span>{data.examples.length} ví dụ</span> : null}
                </div>

                <div className="selection-lookup-tabs">
                  <button
                    type="button"
                    className={activeTab === "vocabulary" ? "tab-btn active" : "tab-btn"}
                    onClick={() => setActiveTab("vocabulary")}
                  >
                    Từ vựng
                  </button>
                  {data?.kanjiInfo && (
                    <button
                      type="button"
                      className={activeTab === "kanji" ? "tab-btn active" : "tab-btn"}
                      onClick={() => setActiveTab("kanji")}
                    >
                      Hán tự
                    </button>
                  )}
                  {data?.grammar && (
                    <button
                      type="button"
                      className={activeTab === "grammar" ? "tab-btn active" : "tab-btn"}
                      onClick={() => setActiveTab("grammar")}
                    >
                      Ngữ pháp
                    </button>
                  )}
                  {Array.isArray(data?.examples) && data.examples.length > 0 && (
                    <button
                      type="button"
                      className={activeTab === "examples" ? "tab-btn active" : "tab-btn"}
                      onClick={() => setActiveTab("examples")}
                    >
                      Mẫu câu
                    </button>
                  )}
                </div>

                {activeTab === "vocabulary" && (
                  <div className="selection-lookup-panel">
                    <div className="panel-title-row">
                      <div className="pop-word">{data?.kanji || data?.text || selectedText}</div>
                      <div className="panel-subtitle">Thông tin từ vựng</div>
                    </div>
                    {data?.reading && (
                      <div className="detail-line">
                        <span>Cách đọc</span>
                        <strong>{data.reading}</strong>
                      </div>
                    )}
                    {data?.meaning && (
                      <div className="detail-line">
                        <span>Nghĩa</span>
                        <strong>{data.meaning}</strong>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "kanji" && data?.kanjiInfo && (
                  <div className="selection-lookup-panel pop-kanji-section">
                    <div className="kanji-meta-grid">
                      <div className="kanji-glyph">{data.kanjiInfo.characterKanji || data.kanji}</div>
                      <div className="kanji-meta-lines">
                        {data.kanjiInfo.meaning && <div><strong>Nghĩa:</strong> {data.kanjiInfo.meaning}</div>}
                        {data.kanjiInfo.onyomi && <div><strong>Âm Hán:</strong> {data.kanjiInfo.onyomi}</div>}
                        {data.kanjiInfo.kunyomi && <div><strong>Kun:</strong> {data.kanjiInfo.kunyomi}</div>}
                        {data.kanjiInfo.strokeCount && <div><strong>Nét:</strong> {data.kanjiInfo.strokeCount}</div>}
                        {data.kanjiInfo.jlptLevel && <div><strong>JLPT:</strong> N{data.kanjiInfo.jlptLevel}</div>}
                      </div>
                    </div>

                    {Array.isArray(data.kanjiInfo.relatedWords) && data.kanjiInfo.relatedWords.length > 0 && (
                      <div className="kanji-related-words">
                        <strong>Từ liên quan</strong>
                        <ul>
                          {data.kanjiInfo.relatedWords.map((item, idx) => (
                            <li key={`${item.word || item.reading || idx}`}>
                              <span>{item.word || "-"}</span>
                              {item.reading ? <em>{item.reading}</em> : null}
                              {item.meaning ? <p>{item.meaning}</p> : null}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "grammar" && data?.grammar && (
                  <div className="selection-lookup-panel">
                    <div className="panel-title-row">
                      <div className="panel-section-heading">Ngữ pháp</div>
                      {data.grammar.jlptLevel && <div className="panel-badge">JLPT N{data.grammar.jlptLevel}</div>}
                    </div>
                    {data.grammar.title && <div className="detail-line"><span>Mẫu</span><strong>{data.grammar.title}</strong></div>}
                    {data.grammar.meaning && <div className="detail-line"><span>Diễn giải</span><strong>{data.grammar.meaning}</strong></div>}
                    {data.grammar.formation && <div className="detail-line"><span>Cấu trúc</span><strong>{data.grammar.formation}</strong></div>}
                    {data.grammar.usageNote && <div className="detail-line"><span>Lưu ý</span><strong>{data.grammar.usageNote}</strong></div>}
                  </div>
                )}

                {activeTab === "examples" && Array.isArray(data?.examples) && data.examples.length > 0 && (
                  <div className="selection-lookup-panel">
                    <div className="panel-section-heading">Mẫu câu</div>
                    <div className="examples-stack">
                      {data.examples.slice(0, 5).map((example, idx) => (
                        <div className="example-card" key={idx}>
                          {typeof example === "string" ? (
                            <p>{example}</p>
                          ) : (
                            <>
                              {example.japaneseSentence && <p className="example-jp">{example.japaneseSentence}</p>}
                              {example.readingSentence && <p className="example-reading">{example.readingSentence}</p>}
                              {example.vietnameseTranslation && <p className="example-vi">{example.vietnameseTranslation}</p>}
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SelectionLookup;
