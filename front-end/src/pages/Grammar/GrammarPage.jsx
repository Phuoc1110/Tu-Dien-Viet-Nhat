import React, { useEffect, useMemo, useRef, useState } from "react";
import { useHistory, useLocation } from "react-router-dom";
import { searchGrammars } from "../../services/dictionaryService";
import KanjiDrawModal from "../../components/KanjiDrawModal/KanjiDrawModal";
import NotebookPickerModal from "../../components/NotebookPickerModal/NotebookPickerModal";
import { SearchX } from "lucide-react";
import "./GrammarPage.css";

const GrammarPage = () => {
	const history = useHistory();
	const { search } = useLocation();
	const searchWrapRef = useRef(null);
	const [searchInput, setSearchInput] = useState("");
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);
	const [loadingDropdown, setLoadingDropdown] = useState(false);
	const [errorDropdown, setErrorDropdown] = useState("");
	const [dropdownResults, setDropdownResults] = useState([]);
	const [highlightedDropdownIndex, setHighlightedDropdownIndex] = useState(-1);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [grammars, setGrammars] = useState([]);
	const [defaultGrammars, setDefaultGrammars] = useState([]);
	const [activeGrammar, setActiveGrammar] = useState(null);
	const [isKanjiDrawOpen, setIsKanjiDrawOpen] = useState(false);
	const [isNotebookPickerOpen, setIsNotebookPickerOpen] = useState(false);
	const [notebookPickerItem, setNotebookPickerItem] = useState(null);

	const keyword = useMemo(() => {
		const params = new URLSearchParams(search);
		return params.get("q") || params.get("keyword") || "";
	}, [search]);
	const hasKeyword = keyword.trim().length > 0;

	useEffect(() => {
		setSearchInput(keyword);
	}, [keyword]);

	useEffect(() => {
		let mounted = true;

		const loadDefaultGrammars = async () => {
			setLoading(true);
			const seedWords = ["は", "です", "する", "ない", "よう", "ため", "ば", "ので"];
			const randomSeed = seedWords[Math.floor(Math.random() * seedWords.length)] || "は";
			const res = await searchGrammars(randomSeed, 24);

			if (!mounted) {
				return;
			}

			if (res && res.errCode === 0) {
				const shuffled = [...(res.grammars || [])]
					.sort(() => Math.random() - 0.5)
					.slice(0, 16);
				setDefaultGrammars(shuffled);
				if (!keyword.trim()) {
					setActiveGrammar(shuffled[0] || null);
				}
			} else {
				setDefaultGrammars([]);
			}
			setLoading(false);
		};

		loadDefaultGrammars();

		return () => {
			mounted = false;
		};
	}, [keyword]);

	useEffect(() => {
		const runSearch = async () => {
			if (!keyword.trim()) {
				setGrammars([]);
				setError("");
				return;
			}

			setLoading(true);
			setError("");
			const res = await searchGrammars(keyword.trim(), 20);
			if (res && res.errCode === 0) {
				const list = res.grammars || [];
				setGrammars(list);
				setActiveGrammar(list[0] || null);
				if (!list.length) {
					setError("Khong tim thay ngu phap phu hop");
				}
			} else {
				setGrammars([]);
				setActiveGrammar(null);
				setError((res && res.errMessage) || "Search failed");
			}
			setLoading(false);
		};

		runSearch();
	}, [keyword]);

	useEffect(() => {
		if (!hasKeyword && defaultGrammars.length && !activeGrammar) {
			setActiveGrammar(defaultGrammars[0]);
		}
	}, [hasKeyword, defaultGrammars, activeGrammar]);

	useEffect(() => {
		if (!searchInput.trim()) {
			setDropdownResults([]);
			setErrorDropdown("");
			setHighlightedDropdownIndex(-1);
			return;
		}

		const debounce = setTimeout(async () => {
			setLoadingDropdown(true);
			setErrorDropdown("");
			const res = await searchGrammars(searchInput.trim(), 8);
			if (res && res.errCode === 0) {
				setDropdownResults(res.grammars || []);
				setHighlightedDropdownIndex(-1);
			} else {
				setDropdownResults([]);
				setHighlightedDropdownIndex(-1);
				setErrorDropdown((res && res.errMessage) || "Search failed");
			}
			setLoadingDropdown(false);
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
				handleSelectGrammar(dropdownResults[highlightedDropdownIndex]);
				return;
			}

			const newKeyword = e.target.value;
			if (newKeyword.trim()) {
				if (newKeyword.trim().length > 25 || /[。、！？\n]/.test(newKeyword.trim())) {
					history.push(`/?text=${encodeURIComponent(newKeyword.trim())}`);
					return;
				}
				history.push(`/grammar?q=${newKeyword.trim()}`);
				setIsDropdownOpen(false);
				setHighlightedDropdownIndex(-1);
			}
		}
	};

	const handleSearchInputChange = (event) => {
		setSearchInput(event.target.value);
		setHighlightedDropdownIndex(-1);
	};

	const handleSelectGrammar = (item) => {
		history.push(`/grammar?q=${item.title}`);
		setIsDropdownOpen(false);
		setHighlightedDropdownIndex(-1);
	};

	const toBulletLines = (value) => {
		if (!value) {
			return [];
		}
		return value
			.split(/\n|;/)
			.map((line) => line.trim())
			.filter(Boolean);
	};

	const renderDropdownBody = () => {
		if (loadingDropdown) {
			return <div className="dropdown-status">Dang tra cuu...</div>;
		}

		if (errorDropdown) {
			return <div className="dropdown-status error">{errorDropdown}</div>;
		}

		if (!dropdownResults.length) {
			return <div className="dropdown-status">Khong co du lieu phu hop.</div>;
		}

		return (
			<div className="dropdown-list">
				{dropdownResults.map((item, index) => (
					<button
						type="button"
						key={item.id}
						className={`grammar-dropdown-item ${highlightedDropdownIndex === index ? "active" : ""}`}
						onClick={() => handleSelectGrammar(item)}
						onMouseEnter={() => setHighlightedDropdownIndex(index)}
					>
						<div className="dropdown-item-main">
							<strong>{item.title}</strong>
							<span>{item.jlptLevel ? `N${item.jlptLevel}` : "-"}</span>
						</div>
						<p>{item.meaning}</p>
					</button>
				))}
			</div>
		);
	};

	const displayedGrammars = hasKeyword ? grammars : defaultGrammars;

	return (
		<div className="mazii-home grammar-page">
			<div className="mazii-shell">
				<div className="mazii-search-wrap" ref={searchWrapRef}>
					<div className="mazii-search-bar">
						<div className="search-leading">Ngữ Pháp</div>
						<input
							type="text"
							placeholder="Tra ngu phap"
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
										history.push(`/grammar?q=${searchInput.trim()}`);
										setIsDropdownOpen(false);
										setHighlightedDropdownIndex(-1);
									}
								}}
							>
								🔍
							</button>
							<button type="button" onClick={() => setIsKanjiDrawOpen(true)}>A文</button>
						</div>
						<button className="lang-switch">Nhat - Viet</button>
					</div>
					<div className="mazii-mode-tabs">
						<button onClick={() => history.push(`/dictionary?q=${searchInput}`)}>
							Tu vung
						</button>
						<button onClick={() => history.push(`/kanji?q=${searchInput}`)}>
							Han tu
						</button>
						<button onClick={() => history.push(`/sentence?q=${searchInput}`)}>
							Mau cau
						</button>
						<button className="tab-active">Ngu phap</button>
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

				<div className="grammar-content-grid">
					{(!activeGrammar || loading || error) ? (
						<div className="detail-card grammar-detail-card empty-state-container" style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
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
									<h3 style={{ fontSize: "24px", fontWeight: "700", color: "#0f172a", marginBottom: "12px" }}>Không tìm thấy Ngữ pháp</h3>
									<p style={{ color: "#475569", fontSize: "16px", maxWidth: "420px", margin: "0 auto", lineHeight: "1.6" }}>
										Rất tiếc, không có kết quả nào phù hợp với từ khóa <strong style={{ color: "#0f172a" }}>"{keyword}"</strong>. Hãy kiểm tra lại chính tả hoặc thử một từ khóa khác.
									</p>
								</div>
							)}
							{!loading && !error && !activeGrammar && (
								<div className="empty-state-content" style={{ textAlign: "center", padding: "60px 20px" }}>
									<div className="empty-state-visual" style={{ fontSize: "64px", color: "#cbd5e1", marginBottom: "20px" }}>文</div>
									<h3 style={{ fontSize: "20px", color: "#1e293b", marginBottom: "8px" }}>Nhập một ngữ pháp để bắt đầu</h3>
								</div>
							)}
						</div>
					) : (
						<>
							<div className="grammar-left">
								<div className="detail-card grammar-detail-card">
									<div className="grammar-head">
										<div>
											<h1>{activeGrammar.title}</h1>
											<p>{activeGrammar.meaning}</p>
										</div>
										<button
											type="button"
											className="grammar-add-btn"
											onClick={() => {
												setNotebookPickerItem({
													type: "grammar",
													id: activeGrammar.id,
													label: activeGrammar.title,
													subtitle: activeGrammar.jlptLevel ? `N${activeGrammar.jlptLevel}` : "",
													meaning: activeGrammar.meaning,
												});
												setIsNotebookPickerOpen(true);
											}}
										>
											+
										</button>
									</div>

									<div className="detail-section">
										<span className="grammar-jlpt-badge">
											JLPT N{activeGrammar.jlptLevel || "?"}
										</span>
									</div>

									<div className="detail-section">
										<h3>Cau truc</h3>
										<ul className="grammar-dot-list">
											{toBulletLines(activeGrammar.formation).map((line, idx) => (
												<li key={idx}>{line}</li>
											))}
											{!toBulletLines(activeGrammar.formation).length && <li>-</li>}
										</ul>
									</div>

									<div className="detail-section">
										<h3>Nghia</h3>
										<ul className="grammar-dot-list">
											{toBulletLines(activeGrammar.usageNote || activeGrammar.meaning).map(
												(line, idx) => (
													<li key={idx}>{line}</li>
												)
											)}
										</ul>
									</div>

									<div className="detail-section">
										<h3>Vi du</h3>
										<div className="grammar-example-list">
											{(activeGrammar.examples || []).map((example) => (
												<div className="grammar-example-item" key={example.id}>
													<p className="grammar-example-jp">{example.japaneseSentence}</p>
													{example.readingSentence && (
														<p className="grammar-example-reading">{example.readingSentence}</p>
													)}
													<p className="grammar-example-vi">{example.vietnameseTranslation}</p>
												</div>
											))}
											{!(activeGrammar.examples || []).length && (
												<p>Chua co vi du</p>
											)}
										</div>
									</div>
								</div>
							</div>

							<div className="grammar-right">
								<div className="lookup-panel grammar-list-panel">
									{displayedGrammars.map((item) => (
										<button
											key={item.id}
											type="button"
											className={`grammar-list-item ${
												activeGrammar && activeGrammar.id === item.id ? "active" : ""
											}`}
											onClick={() => setActiveGrammar(item)}
										>
											<span className="grammar-list-jlpt">N{item.jlptLevel || "?"}</span>
											<strong>{item.title}</strong>
											<p>{item.meaning}</p>
										</button>
									))}
									{displayedGrammars.length === 0 && !loading && <p>Chua co du lieu ngu phap.</p>}
								</div>
							</div>
						</>
					)}
				</div>
			</div>
		</div>
	);
};

export default GrammarPage;
