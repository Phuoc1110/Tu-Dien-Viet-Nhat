import React, { useEffect, useMemo, useState, useRef } from "react";
import { useLocation, useHistory } from "react-router-dom";
import { searchKanjis } from "../../services/dictionaryService";
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
				<div className="detail-section">
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
			<div className="detail-section">
				<h3>Hướng dẫn viết nét</h3>
				<div className="stroke-guide-container">
					<div className="stroke-guide-canvas">
						<div className="kanji-character-display">
							<h2>{kanjiDetail.characterKanji}</h2>
							<p>Số nét: {strokePaths.length}</p>
						</div>
						<svg viewBox="0 0 109 109" className="stroke-guide-svg" aria-label="Kanji stroke guide">
							<rect x="0" y="0" width="109" height="109" fill="#ffffff" stroke="#e2e8f0" strokeWidth="2" />
							<path d="M54.5 0V109" stroke="#f0f4f8" strokeWidth="1" />
							<path d="M0 54.5H109" stroke="#f0f4f8" strokeWidth="1" />
							{displayedStrokes.map((item, index) => {
								const isCurrentStroke = index === maxStrokeIndex;
								return (
									<path
										key={`stroke-guide-${index}`}
										d={item.d}
										fill="none"
										stroke={isCurrentStroke ? "#ef4444" : "#2563eb"}
										strokeWidth={isCurrentStroke ? "4" : "3"}
										strokeLinecap="round"
										strokeLinejoin="round"
										opacity={isCurrentStroke ? "1" : "0.7"}
									/>
								);
							})}
						</svg>
					</div>
					<div className="stroke-guide-controls">
						<div className="stroke-counter">
							<span className="current-stroke">{maxStrokeIndex + 1}</span>
							<span className="total-strokes">/ {strokePaths.length}</span>
						</div>
						<div className="stroke-navigation">
							<button
								className="nav-button prev-button"
								onClick={() => setCurrentStrokeIndex(Math.max(0, currentStrokeIndex - 1))}
								disabled={currentStrokeIndex === 0}
							>
								← Lùi
							</button>
							<button
								className="nav-button next-button"
								onClick={() => setCurrentStrokeIndex(Math.min(strokePaths.length, currentStrokeIndex + 1))}
								disabled={currentStrokeIndex >= strokePaths.length - 1}
							>
								Tiến →
							</button>
							<button
								className="nav-button reset-button"
								onClick={() => setCurrentStrokeIndex(0)}
							>
								↻ Bắt đầu lại
							</button>
						</div>
						<div className="current-stroke-info">
							{displayedStrokes[maxStrokeIndex] && (
								<p>Nét {displayedStrokes[maxStrokeIndex].order || maxStrokeIndex + 1}</p>
							)}
						</div>
					</div>
				</div>
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
						<button>Ngữ pháp</button>
						{/* <button>Nhật - Nhật</button> */}
					</div>
					{isDropdownOpen && searchInput.trim() && (
						<div className="mazii-dropdown">{renderDropdownBody()}</div>
					)}
				</div>

				<div className="mazii-content-grid detail-mode">
					<div className="detail-left">
						{loading && <div className="detail-card">Đang tải...</div>}
						{error && <div className="detail-card error">{error}</div>}
						{kanjiDetail && (
							<div className="detail-card">
								<div className="detail-head">
									<div>
										<h1>{kanjiDetail.characterKanji}</h1>
										<div className="detail-reading">{kanjiDetail.meaning}</div>
									</div>
									<div className="detail-actions">
										<button>+</button>
										<button>SVG</button>
									</div>
								</div>
								<div className="detail-meta">
									<span>Số nét: {kanjiDetail.strokeCount}</span>
									<span>JLPT: {kanjiDetail.jlptLevel ? `N${kanjiDetail.jlptLevel}` : "-"}</span>
									<span>Tần suất: #{kanjiDetail.frequencyRank}/2500</span>
								</div>
								<div className="detail-section">
									<h3>Kunyomi</h3>
									{kanjiDetail.kunyomi ? (
										<ul className="reading-list">
											{kanjiDetail.kunyomi.split(";").map((item, idx) => (
												<li key={idx}>{item.trim()}</li>
											))}
										</ul>
									) : (
										<p>-</p>
									)}
								</div>
								<div className="detail-section">
									<h3>Onyomi</h3>
									{kanjiDetail.onyomi ? (
										<ul className="reading-list">
											{kanjiDetail.onyomi.split(";").map((item, idx) => (
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
								{renderStrokeOrder()}
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
