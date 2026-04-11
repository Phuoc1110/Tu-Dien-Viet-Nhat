import React, { useEffect, useMemo, useState, useRef } from "react";
import { useLocation, useHistory } from "react-router-dom";
import { searchKanjis, searchSentences } from "../../services/dictionaryService";
import KanjiDrawModal from "../../components/KanjiDrawModal/KanjiDrawModal";
import NotebookPickerModal from "../../components/NotebookPickerModal/NotebookPickerModal";
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
	const searchWrapRef = useRef(null);
	const [activeKanji, setActiveKanji] = useState(null);
	const [currentStrokeIndex, setCurrentStrokeIndex] = useState(0);
	const [fallbackExamples, setFallbackExamples] = useState([]);
	const [isKanjiDrawOpen, setIsKanjiDrawOpen] = useState(false);
	const [isNotebookPickerOpen, setIsNotebookPickerOpen] = useState(false);
	const [notebookPickerItem, setNotebookPickerItem] = useState(null);

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

	useEffect(() => {
		setSearchInput(keyword);
	}, [keyword]);

	useEffect(() => {
		const runSearch = async () => {
			if (!keyword.trim()) {
				setKanjiDetail(null);
				setRelatedKanjis([]);
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
		if (!searchInput.trim() || searchInput === keyword) {
			setDropdownResults([]);
			setErrorDropdown("");
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
		} else {
			setDropdownResults([]);
			setErrorDropdown((res && res.errMessage) || "Search failed");
		}
		setLoadingDropdown(false);
	};

	const handleSearch = (e) => {
		if (e.key === "Enter") {
			const newKeyword = e.target.value;
			if (newKeyword.trim()) {
				history.push(`/kanji?q=${newKeyword.trim()}`);
				setIsDropdownOpen(false);
			}
		}
	};

	const handleSelectKanji = (kanji) => {
		history.push(`/kanji?q=${kanji.characterKanji}`);
		setIsDropdownOpen(false);
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
				{dropdownResults.map((item) => (
					<button
						type="button"
						key={item.id}
						className="kanji-dropdown-item"
						onClick={() => handleSelectKanji(item)}
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
		<div className="mazii-home">
			<div className="mazii-shell">
				<div className="mazii-search-wrap" ref={searchWrapRef}>
					<div className="mazii-search-bar">
						<div className="search-leading">Hán tự</div>
						<input
							type="text"
							placeholder="Tra Hán tự"
							value={searchInput}
							onChange={(e) => setSearchInput(e.target.value)}
							onFocus={() => setIsDropdownOpen(true)}
							onKeyDown={handleSearch}
						/>
						<div className="search-actions">
							<button>Tìm kiếm</button>
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
					<div className="detail-left">
						{loading && <div className="detail-card">Đang tải...</div>}
						{error && <div className="detail-card error">{error}</div>}
						{kanjiDetail && (
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
						)}
					</div>
					<div className="detail-right">
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
					</div>
				</div>
			</div>
		</div>
	);
};

export default KanjiPage;
