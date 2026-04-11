import React, { useEffect, useMemo, useRef, useState } from "react";
import { useHistory, useLocation } from "react-router-dom";
import { searchGrammars } from "../../services/dictionaryService";
import KanjiDrawModal from "../../components/KanjiDrawModal/KanjiDrawModal";
import NotebookPickerModal from "../../components/NotebookPickerModal/NotebookPickerModal";
import "../Dictionary/DictionaryPage.css";
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
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [grammars, setGrammars] = useState([]);
	const [activeGrammar, setActiveGrammar] = useState(null);
	const [isKanjiDrawOpen, setIsKanjiDrawOpen] = useState(false);
	const [isNotebookPickerOpen, setIsNotebookPickerOpen] = useState(false);
	const [notebookPickerItem, setNotebookPickerItem] = useState(null);

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
				setGrammars([]);
				setActiveGrammar(null);
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
		if (!searchInput.trim() || searchInput === keyword) {
			setDropdownResults([]);
			setErrorDropdown("");
			return;
		}

		const debounce = setTimeout(async () => {
			setLoadingDropdown(true);
			setErrorDropdown("");
			const res = await searchGrammars(searchInput.trim(), 8);
			if (res && res.errCode === 0) {
				setDropdownResults(res.grammars || []);
			} else {
				setDropdownResults([]);
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
			}
		};

		document.addEventListener("mousedown", handleOutsideClick);
		return () => document.removeEventListener("mousedown", handleOutsideClick);
	}, []);

	const handleSearch = (e) => {
		if (e.key === "Enter") {
			const newKeyword = e.target.value;
			if (newKeyword.trim()) {
				history.push(`/grammar?q=${newKeyword.trim()}`);
				setIsDropdownOpen(false);
			}
		}
	};

	const handleSelectGrammar = (item) => {
		history.push(`/grammar?q=${item.title}`);
		setIsDropdownOpen(false);
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
				{dropdownResults.map((item) => (
					<button
						type="button"
						key={item.id}
						className="grammar-dropdown-item"
						onClick={() => handleSelectGrammar(item)}
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

	return (
		<div className="mazii-home">
			<div className="mazii-shell">
				<div className="mazii-search-wrap" ref={searchWrapRef}>
					<div className="mazii-search-bar">
						<div className="search-leading">Ngu phap</div>
						<input
							type="text"
							placeholder="Tra ngu phap"
							value={searchInput}
							onChange={(e) => setSearchInput(e.target.value)}
							onFocus={() => setIsDropdownOpen(true)}
							onKeyDown={handleSearch}
						/>
						<div className="search-actions">
							<button>Tim kiem</button>
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
					<div className="grammar-left">
						<div className="detail-card grammar-detail-card">
							{loading && <p>Dang tai...</p>}
							{error && <p className="sentence-error">{error}</p>}
							{activeGrammar && (
								<>
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

									<div className="detail-section contribution-box">
										<h3>Co 7 y kien dong gop</h3>
										<p>Ban co the them gop y hoac vi du de bo sung muc nay.</p>
									</div>
								</>
							)}
						</div>
					</div>

					<div className="grammar-right">
						<div className="lookup-panel grammar-list-panel">
							{grammars.map((item) => (
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
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default GrammarPage;
