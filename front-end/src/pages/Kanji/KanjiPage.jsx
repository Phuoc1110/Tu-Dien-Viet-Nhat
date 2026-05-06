import React, { useEffect, useMemo, useState, useRef } from "react";
import { useLocation, useHistory } from "react-router-dom";
import { searchKanjis, searchSentences } from "../../services/dictionaryService";
import {
	getTopSearchKeywordsToday,
	getWordSearchHistoryPage,
} from "../../services/searchHistoryService";
import { getLatestWordContributions } from "../../services/wordContributionService";
import KanjiDrawModal from "../../components/KanjiDrawModal/KanjiDrawModal";
import NotebookPickerModal from "../../components/NotebookPickerModal/NotebookPickerModal";
import { SearchX } from "lucide-react";
import "./KanjiPage.css";

const KanjiPage = () => {
	const { search } = useLocation();
	const history = useHistory();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [kanjiDetail, setKanjiDetail] = useState(null);
	const [relatedKanjis, setRelatedKanjis] = useState([]);
	const [searchInput, setSearchInput] = useState("");
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);
	const [dropdownResults, setDropdownResults] = useState([]);
	const [loadingDropdown, setLoadingDropdown] = useState(false);
	const [errorDropdown, setErrorDropdown] = useState("");
	const [highlightedDropdownIndex, setHighlightedDropdownIndex] = useState(-1);
	const searchWrapRef = useRef(null);
	const [activeKanji, setActiveKanji] = useState(null);
	const [currentStrokeIndex, setCurrentStrokeIndex] = useState(0);
	const [fallbackExamples, setFallbackExamples] = useState([]);
	const [isKanjiDrawOpen, setIsKanjiDrawOpen] = useState(false);
	const [isNotebookPickerOpen, setIsNotebookPickerOpen] = useState(false);
	const [notebookPickerItem, setNotebookPickerItem] = useState(null);
	const [recentHistory, setRecentHistory] = useState([]);
	const [topKeywords, setTopKeywords] = useState([]);
	const [latestContributions, setLatestContributions] = useState([]);

	const normalizeStrokePaths = (value) => {
		if (!value) return [];

		if (Array.isArray(value)) {
			return value
				.map((item, index) => {
					if (typeof item === "string") {
						return { d: item, order: index + 1 };
					}
					if (item && typeof item === "object") {
						return {
							d: item.d || item.path || "",
							order: item.order || index + 1,
						};
					}
					return null;
				})
				.filter((item) => item && item.d);
		}

		if (typeof value === "string") {
			try {
				return normalizeStrokePaths(JSON.parse(value));
			} catch (e) {
				return [];
			}
		}

		if (typeof value === "object" && Array.isArray(value.paths)) {
			return normalizeStrokePaths(value.paths);
		}

		return [];
	};

	const strokePaths = useMemo(
		() => normalizeStrokePaths(kanjiDetail?.strokePaths),
		[kanjiDetail]
	);

	useEffect(() => {
		setCurrentStrokeIndex(0);
	}, [kanjiDetail?.id, strokePaths.length]);

	useEffect(() => {
		if (!strokePaths.length) {
			return undefined;
		}

		const timer = setInterval(() => {
			setCurrentStrokeIndex((prev) =>
				prev >= strokePaths.length - 1 ? 0 : prev + 1
			);
		}, 900);

		return () => clearInterval(timer);
	}, [strokePaths]);

	const kanjiWords = useMemo(() => {
		if (!kanjiDetail?.words || !Array.isArray(kanjiDetail.words)) {
			return [];
		}

		return kanjiDetail.words.slice(0, 10);
	}, [kanjiDetail]);

	const kanjiExamples = useMemo(() => {
		if (!kanjiWords.length) {
			return [];
		}

		const seen = new Set();
		const examples = [];

		for (const word of kanjiWords) {
			for (const item of word.examples || []) {
				const key = `${item.japaneseSentence}__${item.vietnameseTranslation}`;
				if (!seen.has(key)) {
					seen.add(key);
					examples.push({ ...item, relatedWord: word.word });
				}
				if (examples.length >= 8) {
					return examples;
				}
			}
		}

		return examples;
	}, [kanjiWords]);

	const displayedKanjiExamples = useMemo(() => {
		if (kanjiExamples.length >= 5) {
			return kanjiExamples.slice(0, 5);
		}

		return kanjiExamples.concat(fallbackExamples).slice(0, 5);
	}, [kanjiExamples, fallbackExamples]);

	useEffect(() => {
		const runFallbackExamples = async () => {
			if (!kanjiDetail?.characterKanji) {
				setFallbackExamples([]);
				return;
			}

			if (kanjiExamples.length >= 5) {
				setFallbackExamples([]);
				return;
			}

			const query = kanjiDetail.characterKanji;
			const res = await searchSentences(query, 20);
			if (res && res.errCode === 0) {
				const seen = new Set();
				const sentences = (res.sentences || [])
					.filter((item) => {
						const key = `${item.japaneseSentence}__${item.vietnameseTranslation}`;
						if (seen.has(key)) return false;
						seen.add(key);
						return true;
					})
					.filter((item) => item.japaneseSentence?.includes(query) || item.vietnameseTranslation)
					.map((item) => ({
						...item,
						relatedWord: kanjiDetail.characterKanji,
					}));
				setFallbackExamples(sentences.slice(0, Math.max(0, 5 - kanjiExamples.length)));
			} else {
				setFallbackExamples([]);
			}
		};

		runFallbackExamples();
	}, [kanjiDetail?.characterKanji, kanjiExamples.length]);

	const keyword = useMemo(() => {
		const params = new URLSearchParams(search);
		return params.get("q") || params.get("keyword") || "";
	}, [search]);
	const hasKeyword = keyword.trim().length > 0;
	const getTermLabel = (item) => String(item?.word || item?.searchTerm || item?.keyword || "").trim();
	const getTermCount = (item) => Number(item?.count || item?.searchCount || 0) || 0;

	useEffect(() => {
		setSearchInput(keyword);
	}, [keyword]);

	useEffect(() => {
		let mounted = true;

		const loadSidebarData = async () => {
			const [historyRes, topRes, contributionRes] = await Promise.all([
				getWordSearchHistoryPage(8, 0),
				getTopSearchKeywordsToday(8),
				getLatestWordContributions(6, 0),
			]);

			if (!mounted) {
				return;
			}

			setRecentHistory(Array.isArray(historyRes?.items) ? historyRes.items : []);
			setTopKeywords(Array.isArray(topRes) ? topRes : []);
			setLatestContributions(Array.isArray(contributionRes) ? contributionRes : []);
		};

		loadSidebarData();

		return () => {
			mounted = false;
		};
	}, []);

	useEffect(() => {
		const runSearch = async () => {
			if (!keyword.trim()) {
				setKanjiDetail(null);
				setRelatedKanjis([]);
				setActiveKanji(null);
				setError("");
				return;
			}

			setLoading(true);
			setError("");
			const res = await searchKanjis(keyword.trim());

			if (res && res.errCode === 0 && res.kanjis && res.kanjis.length > 0) {
				setRelatedKanjis(res.kanjis);
				setActiveKanji(res.kanjis[0]);
				setKanjiDetail(res.kanjis[0]);
				setCurrentStrokeIndex(0);
			} else {
				setKanjiDetail(null);
				setRelatedKanjis([]);
				setActiveKanji(null);
				setError((res && res.errMessage) || "Kanji not found");
			}

			setLoading(false);
		};

		runSearch();
	}, [keyword]);

	useEffect(() => {
		if (!searchInput.trim()) {
			setDropdownResults([]);
			setErrorDropdown("");
			setHighlightedDropdownIndex(-1);
			return;
		}

		const debounce = setTimeout(() => {
			runDropdownSearch(searchInput.trim());
		}, 220);

		return () => clearTimeout(debounce);
	}, [searchInput, keyword]);

	useEffect(() => {
		const handleOutsideClick = (event) => {
			if (!searchWrapRef.current?.contains(event.target)) {
				setIsDropdownOpen(false);
				setHighlightedDropdownIndex(-1);
			}
		};

		document.addEventListener("mousedown", handleOutsideClick);
		return () => document.removeEventListener("mousedown", handleOutsideClick);
	}, []);

	const runDropdownSearch = async (query) => {
		setLoadingDropdown(true);
		setErrorDropdown("");
		const res = await searchKanjis(query, 8);
		if (res && res.errCode === 0) {
			setDropdownResults(res.kanjis || []);
			setHighlightedDropdownIndex(-1);
		} else {
			setDropdownResults([]);
			setHighlightedDropdownIndex(-1);
			setErrorDropdown((res && res.errMessage) || "Search failed");
		}
		setLoadingDropdown(false);
	};

	const handleSearch = (e) => {
		if (e.key === "ArrowDown") {
			e.preventDefault();
			if (!dropdownResults.length) {
				return;
			}
			setIsDropdownOpen(true);
			setHighlightedDropdownIndex((prev) => {
				if (prev < 0) return 0;
				return (prev + 1) % dropdownResults.length;
			});
			return;
		}

		if (e.key === "ArrowUp") {
			e.preventDefault();
			if (!dropdownResults.length) {
				return;
			}
			setIsDropdownOpen(true);
			setHighlightedDropdownIndex((prev) => {
				if (prev < 0) return dropdownResults.length - 1;
				return (prev - 1 + dropdownResults.length) % dropdownResults.length;
			});
			return;
		}

		if (e.key === "Escape") {
			setIsDropdownOpen(false);
			setHighlightedDropdownIndex(-1);
			return;
		}

		if (e.key === "Enter") {
			e.preventDefault();
			if (
				isDropdownOpen &&
				highlightedDropdownIndex >= 0 &&
				highlightedDropdownIndex < dropdownResults.length
			) {
				handleSelectKanji(dropdownResults[highlightedDropdownIndex]);
				return;
			}

			const newKeyword = e.target.value;
			if (newKeyword.trim()) {
				if (newKeyword.trim().length > 25 || /[。、！？\n]/.test(newKeyword.trim())) {
					history.push(`/?text=${encodeURIComponent(newKeyword.trim())}`);
					return;
				}
				history.push(`/kanji?q=${newKeyword.trim()}`);
				setIsDropdownOpen(false);
				setHighlightedDropdownIndex(-1);
			}
		}
	};

	const handleSearchInputChange = (event) => {
		setSearchInput(event.target.value);
		setHighlightedDropdownIndex(-1);
	};

	const handleSelectKanji = (kanji) => {
		history.push(`/kanji?q=${kanji.characterKanji}`);
		setIsDropdownOpen(false);
		setHighlightedDropdownIndex(-1);
	};

	const handleSelectRelatedKanji = (kanji) => {
		setActiveKanji(kanji);
		setKanjiDetail(kanji);
		setCurrentStrokeIndex(0);
		setIsDropdownOpen(false);
	};

	const getReadingItems = (value) => {
		if (!value) {
			return [];
		}

		return value
			.split(/[;；,、]/)
			.map((item) => item.trim())
			.filter(Boolean);
	};

	const renderDropdownBody = () => {
		if (loadingDropdown) {
			return <div className="dropdown-status">Đang tra cứu...</div>;
		}

		if (errorDropdown) {
			return <div className="dropdown-status error">{errorDropdown}</div>;
		}

		if (!dropdownResults.length) {
			return <div className="dropdown-status">Không có dữ liệu phù hợp.</div>;
		}

		return (
			<div className="dropdown-list">
				{dropdownResults.map((item, index) => (
					<button
						type="button"
						key={item.id}
						className={`kanji-dropdown-item ${highlightedDropdownIndex === index ? "active" : ""}`}
						onClick={() => handleSelectKanji(item)}
						onMouseEnter={() => setHighlightedDropdownIndex(index)}
					>
						<div className="dropdown-item-main">
							<strong>{item.characterKanji}</strong>
							<span>{item.sinoVietnamese}</span>
						</div>
						<p>{item.kunyomi}</p>
					</button>
				))}
			</div>
		);
	};

	const renderStrokeOrder = () => {
		if (!kanjiDetail) return null;

		if (!strokePaths.length) {
			return (
				<div className="stroke-side-card stroke-side-empty">
					<h3>Hướng dẫn viết nét</h3>
					<p className="stroke-empty">
						Chưa có dữ liệu nét vẽ cho kanji này. Bạn cần nạp `strokePaths` vào
						database để hiển thị thứ tự viết.
					</p>
				</div>
			);
		}

		const maxStrokeIndex = Math.min(currentStrokeIndex, strokePaths.length - 1);
		const displayedStrokes = strokePaths.slice(0, maxStrokeIndex + 1);

		return (
			<div className="stroke-side-card">
				<div className="stroke-side-toolbar">
					<span className="stroke-auto-badge">Nét vẽ</span>
					<span className="stroke-progress">Nét {maxStrokeIndex + 1}/{strokePaths.length}</span>
				</div>
				<svg viewBox="0 0 109 109" className="stroke-guide-svg" aria-label="Kanji stroke guide">
					<rect x="0" y="0" width="109" height="109" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="2" />
					<path d="M54.5 0V109" stroke="#dbe4ef" strokeWidth="1" />
					<path d="M0 54.5H109" stroke="#dbe4ef" strokeWidth="1" />
					{displayedStrokes.map((item, index) => {
						const isCurrentStroke = index === maxStrokeIndex;
						return (
							<path
								key={`stroke-guide-${index}`}
								d={item.d}
								fill="none"
								stroke={isCurrentStroke ? "#ef4444" : "#0ea5e9"}
								strokeWidth={isCurrentStroke ? "4" : "3"}
								strokeLinecap="round"
								strokeLinejoin="round"
								opacity={isCurrentStroke ? "1" : "0.55"}
							/>
						);
					})}
				</svg>
			</div>
		);
	};

	return (
		<div className="mazii-home kanji-page">
			<div className="mazii-shell">
				<div className="mazii-search-wrap" ref={searchWrapRef}>
					<div className="mazii-search-bar">
						<div className="search-leading">Hán tự</div>
						<input
							type="text"
							placeholder="Tra Hán tự"
							value={searchInput}
							onChange={handleSearchInputChange}
							onFocus={() => setIsDropdownOpen(true)}
							onKeyDown={handleSearch}
						/>
						<div className="search-actions">
							<button 
								type="button"
								onClick={() => {
									if (searchInput.trim()) {
										if (searchInput.trim().length > 25 || /[。、！？\n]/.test(searchInput.trim())) {
											history.push(`/?text=${encodeURIComponent(searchInput.trim())}`);
											return;
										}
										history.push(`/kanji?q=${searchInput.trim()}`);
										setIsDropdownOpen(false);
										setHighlightedDropdownIndex(-1);
									}
								}}
							>
								🔍
							</button>
							<button type="button" onClick={() => setIsKanjiDrawOpen(true)}>A文</button>
						</div>
						<button className="lang-switch">Nhật - Việt</button>
					</div>
					<div className="mazii-mode-tabs">
						<button onClick={() => history.push(`/dictionary?q=${searchInput}`)}>
							Từ vựng
						</button>
						<button className="tab-active">Hán tự</button>
						<button onClick={() => history.push(`/sentence?q=${searchInput}`)}>
							Mẫu câu
						</button>
						<button onClick={() => history.push(`/grammar?q=${searchInput}`)}>
							Ngữ pháp
						</button>
						{/* <button>Nhật - Nhật</button> */}
					</div>
					{isDropdownOpen && searchInput.trim() && (
						<div className="mazii-dropdown">{renderDropdownBody()}</div>
					)}
				</div>
				<KanjiDrawModal
					open={isKanjiDrawOpen}
					onClose={() => setIsKanjiDrawOpen(false)}
					anchorRef={searchWrapRef}
					onPick={(value) => {
						setSearchInput((prev) => `${prev || ""}${value}`);
						setIsDropdownOpen(true);
					}}
				/>
				<NotebookPickerModal
					open={isNotebookPickerOpen}
					onClose={() => {
						setIsNotebookPickerOpen(false);
						setNotebookPickerItem(null);
					}}
					item={notebookPickerItem}
				/>

				<div className="mazii-content-grid detail-mode">
					{(!kanjiDetail || loading || error) ? (
						<div className="detail-card empty-state-container" style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
							{loading && (
								<div className="empty-state-content" style={{ textAlign: "center", padding: "60px 20px" }}>
									<p style={{ color: "#64748b" }}>Đang tải...</p>
								</div>
							)}
							{error && !loading && (
								<div className="empty-state-content error-state" style={{ textAlign: "center", padding: "60px 20px" }}>
									<div className="empty-state-visual" style={{ margin: "0 auto 24px", width: "100px", height: "100px", borderRadius: "50%", background: "#f8fafc", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center" }}>
										<SearchX size={48} color="#64748b" />
									</div>
									<h3 style={{ fontSize: "24px", fontWeight: "700", color: "#0f172a", marginBottom: "12px" }}>Không tìm thấy Hán tự</h3>
									<p style={{ color: "#475569", fontSize: "16px", maxWidth: "420px", margin: "0 auto", lineHeight: "1.6" }}>
										Rất tiếc, không có kết quả nào phù hợp với từ khóa <strong style={{ color: "#0f172a" }}>"{keyword}"</strong>. Hãy kiểm tra lại chính tả hoặc thử một từ khóa khác.
									</p>
								</div>
							)}
							{!loading && !error && !kanjiDetail && (
								<div className="empty-state-content" style={{ textAlign: "center", padding: "60px 20px" }}>
									<div className="empty-state-visual" style={{ fontSize: "64px", color: "#cbd5e1", marginBottom: "20px" }}>漢</div>
									<h3 style={{ fontSize: "20px", color: "#1e293b", marginBottom: "8px" }}>Nhập một chữ kanji để bắt đầu</h3>
									<p style={{ color: "#64748b" }}>Bạn có thể tìm theo chữ kanji, âm hán việt hoặc vẽ kanji bằng nút A文.</p>
								</div>
							)}
						</div>
					) : (
						<>
							<div className="detail-left">
								<div className="detail-card">
								<div className="detail-overview-grid">
									<div>
										<div className="detail-head">
											<div>
												<h1>{kanjiDetail.characterKanji}</h1>
												<div className="detail-reading">{kanjiDetail.meaning}</div>
											</div>
											<div className="detail-actions">
												<button
													type="button"
													onClick={() => {
													setNotebookPickerItem({
														type: "kanji",
														id: kanjiDetail.id,
														label: kanjiDetail.characterKanji,
														subtitle: kanjiDetail.sinoVietnamese,
														meaning: kanjiDetail.meaning,
													});
													setIsNotebookPickerOpen(true);
												}}
												>
													+
												</button>
												<button>SVG</button>
											</div>
										</div>
										<div className="detail-meta">
											<div>Số nét: {kanjiDetail.strokeCount}</div>
											<div>JLPT: {kanjiDetail.jlptLevel ? `N${kanjiDetail.jlptLevel}` : "-"}</div>
											<div>Tần suất: #{kanjiDetail.frequencyRank}/2500</div>
										</div>
									</div>
									<div className="detail-stroke-wrap">
										{renderStrokeOrder()}
									</div>
								</div>
								<div className="detail-section">
									<h3>Kunyomi</h3>
									{getReadingItems(kanjiDetail.kunyomi).length ? (
										<ul className="reading-list">
											{getReadingItems(kanjiDetail.kunyomi).map((item, idx) => (
												<li key={idx}>{item.trim()}</li>
											))}
										</ul>
									) : (
										<p>-</p>
									)}
								</div>
								<div className="detail-section">
									<h3>Onyomi</h3>
									{getReadingItems(kanjiDetail.onyomi).length ? (
										<ul className="reading-list">
											{getReadingItems(kanjiDetail.onyomi).map((item, idx) => (
												<li key={idx}>{item.trim()}</li>
											))}
										</ul>
									) : (
										<p>-</p>
									)}
								</div>
								{kanjiDetail.components && (
									<div className="detail-section">
										<h3>Bộ - Kanji Breakdown</h3>
										<div className="kanji-components">
											<div className="component-item">
												<span className="component-symbol">+</span>
												<span className="component-name">{kanjiDetail.components}</span>
											</div>
										</div>
									</div>
								)}
								<div className="detail-section">
									<h3>Nghĩa</h3>
									<p>{kanjiDetail.meaning}</p>
								</div>
								{kanjiWords.length > 0 && (
									<div className="detail-section">
										<h3>Từ vựng chứa kanji này</h3>
										<div className="kanji-word-table-wrap">
											<table className="kanji-word-table">
												<thead>
													<tr>
														<th>Từ</th>
														<th>Đọc</th>
														<th>Nghĩa</th>
													</tr>
												</thead>
												<tbody>
													{kanjiWords.map((word) => (
														<tr key={word.id}>
															<td>{word.word}</td>
															<td>{word.reading || "-"}</td>
															<td>{word.meanings?.[0]?.definition || "-"}</td>
														</tr>
													))}
												</tbody>
											</table>
										</div>
									</div>
								)}
								{displayedKanjiExamples.length > 0 && (
									<div className="detail-section">
										<h3>Ví dụ</h3>
										<div className="kanji-example-list">
											{displayedKanjiExamples.map((example) => (
												<div className="kanji-example-item" key={example.id}>
													<p className="kanji-example-jp">{example.japaneseSentence}</p>
													<p className="kanji-example-vi">{example.vietnameseTranslation}</p>
													<small>Từ liên quan: {example.relatedWord}</small>
												</div>
											))}
										</div>
									</div>
								)}
							</div>
						</div>
					<div className="detail-right">
						{hasKeyword ? (
							<div className="lookup-panel">
								<h3>Kết quả tra cứu kanji</h3>
								<div className="related-list">
									{relatedKanjis.map((item) => (
										<button
											key={item.id}
											className={
												activeKanji && activeKanji.id === item.id
													? "related-active"
													: ""
											}
											onClick={() => handleSelectRelatedKanji(item)}
										>
											<strong>{item.characterKanji}</strong>
											<span>{item.sinoVietnamese}</span>
										</button>
									))}
								</div>
							</div>
						) : (
							<>
								<div className="lookup-panel">
									<h3>Lich su gan day</h3>
									<div className="related-list default-list">
										{recentHistory.slice(0, 6).map((item) => {
											const term = getTermLabel(item);
											if (!term) return null;
											return (
												<button
													type="button"
													key={item.id}
													onClick={() => history.push(`/kanji?q=${encodeURIComponent(term)}`)}
												>
													<strong>{term}</strong>
												</button>
											);
										})}
										{recentHistory.length === 0 && <p className="side-empty">Chua co lich su.</p>}
									</div>
								</div>

								<div className="lookup-panel">
									<h3>Tu khoa hot</h3>
									<div className="chip-list">
										{topKeywords.slice(0, 8).map((item, index) => {
											const term = getTermLabel(item);
											if (!term) return null;
											return (
												<button
													type="button"
													key={`${term}-${index}`}
													onClick={() => history.push(`/kanji?q=${encodeURIComponent(term)}`)}
												>
													{term}
													<span>{getTermCount(item)}</span>
												</button>
											);
										})}
										{topKeywords.length === 0 && <p className="side-empty">Chua co du lieu hot.</p>}
									</div>
								</div>

								<div className="lookup-panel">
									<h3>Gop y moi</h3>
									<div className="feedback-list">
										{latestContributions.slice(0, 4).map((item) => (
											<div key={item.id} className="feedback-item">
												<strong>{item.word || "Tu vung"}</strong>
												<p>{item.content}</p>
											</div>
										))}
										{latestContributions.length === 0 && <p className="side-empty">Chua co gop y.</p>}
									</div>
								</div>
							</>
						)}
					</div>
						</>
					)}
				</div>
			</div>
		</div>
	);
};

export default KanjiPage;
