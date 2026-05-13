import React, { useEffect, useMemo, useRef, useState } from "react";
import { useHistory, useLocation } from "react-router-dom";
import { analyzeJapaneseParagraph, translateText } from "../../services/dictionaryService";
import KanjiDrawModal from "../../components/KanjiDrawModal/KanjiDrawModal";
import { Search, SearchX } from "lucide-react";
import { normalizeSearchKeyword } from "../../utils/searchKeywordNormalizer";
import "./Analysis.css";

const AnalysisPage = () => {
	const history = useHistory();
	const { search } = useLocation();
	const searchWrapRef = useRef(null);

	const [searchInput, setSearchInput] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [analyzedTokens, setAnalyzedTokens] = useState([]);
	const [matchedWords, setMatchedWords] = useState([]);
	const [translation, setTranslation] = useState("");
	const [translationLoading, setTranslationLoading] = useState(false);
	const [translationError, setTranslationError] = useState("");
	const [isKanjiDrawOpen, setIsKanjiDrawOpen] = useState(false);

	const keyword = useMemo(() => {
		const params = new URLSearchParams(search);
		return params.get("text") || params.get("q") || "";
	}, [search]);
	const hasKeyword = keyword.trim().length > 0;
	const displayKeyword = keyword.length > 18 ? `${keyword.slice(0, 18)}...` : keyword;

	useEffect(() => {
		setSearchInput(keyword);
	}, [keyword]);

	useEffect(() => {
		const runAnalysis = async () => {
			if (!keyword.trim()) {
				setAnalyzedTokens([]);
				setMatchedWords([]);
				setError("");
				return;
			}

			setLoading(true);
			setError("");
			const res = await analyzeJapaneseParagraph(keyword.trim(), 120);
			if (res && res.errCode === 0) {
				setAnalyzedTokens(Array.isArray(res.tokens) ? res.tokens : []);
				setMatchedWords(Array.isArray(res.matchedWords) ? res.matchedWords : []);
				if (!res.tokens?.length) {
					setError("Không thể phân tích đoạn văn này.");
				}
			} else {
				setAnalyzedTokens([]);
				setMatchedWords([]);
				setError((res && res.errMessage) || "Phân tích thất bại.");
			}
			setLoading(false);
		};

		runAnalysis();
	}, [keyword]);

	useEffect(() => {
		let cancelled = false;

		const runTranslation = async () => {
			if (!keyword.trim()) {
				setTranslation("");
				setTranslationError("");
				setTranslationLoading(false);
				return;
			}

			setTranslationLoading(true);
			setTranslationError("");
			const res = await translateText(keyword.trim(), "ja", "vi");
			if (cancelled) {
				return;
			}
			if (res && res.errCode === 0) {
				setTranslation(String(res.translation || "").trim());
			} else {
				setTranslation("");
				setTranslationError(res?.errMessage || "Dịch thất bại.");
			}
			setTranslationLoading(false);
		};

		runTranslation();

		return () => {
			cancelled = true;
		};
	}, [keyword]);

	const handleSearch = (event) => {
		if (event.key === "Enter") {
			event.preventDefault();
			const newKeyword = event.target.value.trim();
			if (newKeyword) {
				history.push(`/analysis?text=${encodeURIComponent(newKeyword)}`);
			}
		}
	};

	const handleSearchBtnClick = () => {
		if (searchInput.trim()) {
			history.push(`/analysis?text=${encodeURIComponent(searchInput.trim())}`);
		}
	};

	const handleSearchInputChange = (event) => {
		setSearchInput(event.target.value);
	};

	const handleTokenClick = (token) => {
		if (token.isMatched && token.matchedWord) {
			const convertedQuery = normalizeSearchKeyword(token.matchedWord);
			history.push(`/dictionary?q=${encodeURIComponent(convertedQuery)}`);
		}
	};

	const openRelatedWord = (word) => {
		const convertedQuery = normalizeSearchKeyword(word.word);
		history.push(`/dictionary?q=${encodeURIComponent(convertedQuery)}`);
	};

	const filteredTokens = analyzedTokens.filter(
		(token) => token.partOfSpeech !== "記号" && token.surface.trim() !== ""
	);

	return (
		<div className="mazii-home analysis-page">
			<div className="mazii-shell">
				<div className="mazii-search-wrap" ref={searchWrapRef}>
					<div className="mazii-search-bar">
						<div className="search-leading">Phân tích</div>
						<input
							type="text"
							placeholder="Nhập câu hoặc đoạn văn tiếng Nhật để phân tích"
							value={searchInput}
							onChange={handleSearchInputChange}
							onKeyDown={handleSearch}
						/>
						<div className="search-actions">
							<button type="button" onClick={handleSearchBtnClick} title="Phân tích">
								<Search size={15} />
							</button>
							<button type="button" onClick={() => setIsKanjiDrawOpen(true)}>
								A文
							</button>
						</div>
						<button className="lang-switch">Nhật - Việt</button>
					</div>
					<div className="mazii-mode-tabs">
						<button onClick={() => history.push(`/dictionary?q=${encodeURIComponent(searchInput)}`)}>
							Từ vựng
						</button>
						<button onClick={() => history.push(`/kanji?q=${encodeURIComponent(searchInput)}`)}>
							Hán tự
						</button>
						<button onClick={() => history.push(`/sentence?q=${encodeURIComponent(searchInput)}`)}>
							Mẫu câu
						</button>
						<button onClick={() => history.push(`/grammar?q=${encodeURIComponent(searchInput)}`)}>
							Ngữ pháp
						</button>
						<button className="tab-active">Phân tích</button>
					</div>
				</div>

				<KanjiDrawModal
					open={isKanjiDrawOpen}
					onClose={() => setIsKanjiDrawOpen(false)}
					anchorRef={searchWrapRef}
					onPick={(value) => {
						setSearchInput((prev) => `${prev || ""}${value}`);
					}}
				/>

				<div className="mazii-content-grid detail-mode">
					{!hasKeyword || loading || error ? (
						<div className="detail-card empty-state-container">
							{loading && <div className="analysis-loading">Đang phân tích dữ liệu...</div>}
							{error && !loading && (
								<div className="analysis-empty error">
									<div className="analysis-empty-visual">
										<SearchX size={38} />
									</div>
									<h3>Không thể phân tích đoạn văn</h3>
									<p>
										Rất tiếc, không có kết quả phù hợp cho từ khóa
										 <strong>"{keyword}"</strong>. Hãy thử một đoạn khác.
									</p>
								</div>
							)}
							{!hasKeyword && !loading && !error && (
								<div className="analysis-empty">
									<div className="analysis-empty-visual">文</div>
									<h3>Nhập đoạn văn tiếng Nhật để phân tích</h3>
									<p>Hệ thống sẽ tách từ, nhận diện từ loại và thể từ điển.</p>
								</div>
							)}
						</div>
					) : (
						<>
							<div className="detail-left">
								<div className="detail-card">
									<div className="detail-head-row">
										<h3>Kết quả phân tích</h3>
										<span className="detail-chip">{filteredTokens.length} từ</span>
									</div>
									<div className="analysis-token-list">
										{analyzedTokens.map((token, index) => (
											<button
												type="button"
												key={`${token.surface}-${index}`}
												className={`analysis-token-btn ${token.isMatched ? "matched" : "unmatched"}`}
												onClick={() => handleTokenClick(token)}
												title={token.isMatched ? `Tra từ: ${token.matchedWord}` : token.partOfSpeech}
											>
												{token.reading && token.reading !== token.surface && token.isMatched && (
													<span className="token-reading">{token.reading}</span>
												)}
												<span className="token-surface">{token.surface}</span>
											</button>
										))}
									</div>
									<div className="analysis-translation">
										<strong>Dịch tự động</strong>
										{translationLoading && <p>Đang dịch...</p>}
										{!translationLoading && translationError && (
											<p className="analysis-translate-error">{translationError}</p>
										)}
										{!translationLoading && !translationError && translation && <p>{translation}</p>}
										{!translationLoading && !translationError && !translation && (
											<p>Chưa có bản dịch. Vui lòng thử lại sau.</p>
										)}
									</div>
								</div>

								<div className="detail-card">
									<h3>Hỏi nhanh Mazii AI</h3>
									<div className="analysis-ai-list">
										<button type="button" className="analysis-ai-btn">
											<Search size={14} /> {displayKeyword} là gì?
										</button>
										<button type="button" className="analysis-ai-btn">
											<Search size={14} /> {displayKeyword} とは?
										</button>
									</div>
								</div>

								<div className="detail-card">
									<h3>{displayKeyword || "Đoạn văn"} có thể được phân tích như sau</h3>
									<div className="analysis-table-wrap">
										<table className="analysis-table">
											<thead>
												<tr>
													<th>Từ</th>
													<th>Từ loại</th>
													<th>Thể từ điển</th>
												</tr>
											</thead>
											<tbody>
												{filteredTokens.map((token, index) => (
													<tr key={`${token.surface}-${index}`}>
														<td><strong>{token.surface}</strong></td>
														<td>{token.partOfSpeech}</td>
														<td>{token.baseForm || token.surface}</td>
													</tr>
												))}
												{filteredTokens.length === 0 && (
													<tr>
														<td colSpan="3">Không có dữ liệu.</td>
													</tr>
												)}
											</tbody>
										</table>
									</div>
								</div>
							</div>

							<div className="detail-right">
								<div className="lookup-panel">
									<h3>Từ liên quan đến {displayKeyword}</h3>
									<div className="related-list">
										{matchedWords.map((word) => (
											<button type="button" key={word.id} onClick={() => openRelatedWord(word)}>
												<strong>{word.word}</strong>
												<span>{word.reading || "-"}</span>
												<p>{word.meanings?.[0]?.definition || "Chưa có nghĩa"}</p>
											</button>
										))}
										{matchedWords.length === 0 && (
											<p className="side-empty">Chưa tìm thấy từ liên quan.</p>
										)}
									</div>
								</div>
							</div>
						</>
					)}
				</div>
			</div>
		</div>
	);
};

export default AnalysisPage;
