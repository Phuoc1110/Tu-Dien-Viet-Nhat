import React, { useEffect, useMemo, useRef, useState } from "react";
import { useHistory, useLocation } from "react-router-dom";
import { searchSentences } from "../../services/dictionaryService";
import {
	getTopSearchKeywordsToday,
	getWordSearchHistoryPage,
} from "../../services/searchHistoryService";
import { getLatestWordContributions } from "../../services/wordContributionService";
import KanjiDrawModal from "../../components/KanjiDrawModal/KanjiDrawModal";
import "./SentencePage.css";

const SentencePage = () => {
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
	const [sentences, setSentences] = useState([]);
	const [isKanjiDrawOpen, setIsKanjiDrawOpen] = useState(false);
	const [recentHistory, setRecentHistory] = useState([]);
	const [topKeywords, setTopKeywords] = useState([]);
	const [latestContributions, setLatestContributions] = useState([]);

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
				setSentences([]);
				setError("");
				return;
			}

			setLoading(true);
			setError("");
			const res = await searchSentences(keyword.trim(), 20);
			if (res && res.errCode === 0) {
				setSentences(res.sentences || []);
				if (!res.sentences?.length) {
					setError("Không tìm thấy mẫu câu phù hợp");
				}
			} else {
				setSentences([]);
				setError((res && res.errMessage) || "Search failed");
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

		const debounce = setTimeout(async () => {
			setLoadingDropdown(true);
			setErrorDropdown("");
			const res = await searchSentences(searchInput.trim(), 8);
			if (res && res.errCode === 0) {
				setDropdownResults(res.sentences || []);
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
				handleSelectSentence(dropdownResults[highlightedDropdownIndex]);
				return;
			}

			const newKeyword = e.target.value;
			if (newKeyword.trim()) {
				history.push(`/sentence?q=${newKeyword.trim()}`);
				setIsDropdownOpen(false);
				setHighlightedDropdownIndex(-1);
			}
		}
	};

	const handleSearchInputChange = (event) => {
		setSearchInput(event.target.value);
		setHighlightedDropdownIndex(-1);
	};

	const handleSelectSentence = (item) => {
		history.push(`/sentence?q=${item.japaneseSentence}`);
		setIsDropdownOpen(false);
		setHighlightedDropdownIndex(-1);
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
						className={`dropdown-item ${highlightedDropdownIndex === index ? "active" : ""}`}
						onClick={() => handleSelectSentence(item)}
						onMouseEnter={() => setHighlightedDropdownIndex(index)}
					>
						<div className="dropdown-item-main">
							<strong>{item.japaneseSentence}</strong>
						</div>
						<p>{item.vietnameseTranslation}</p>
					</button>
				))}
			</div>
		);
	};

	return (
		<div className="mazii-home sentence-page">
			<div className="mazii-shell">
				<div className="mazii-search-wrap" ref={searchWrapRef}>
					<div className="mazii-search-bar">
						<div className="search-leading">Ví Dụ</div>
						<input
							type="text"
							placeholder="Tra mau cau"
							value={searchInput}
							onChange={handleSearchInputChange}
							onFocus={() => setIsDropdownOpen(true)}
							onKeyDown={handleSearch}
						/>
						<div className="search-actions">
							<button>🔍</button>
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
						<button className="tab-active">Mau cau</button>
						<button onClick={() => history.push(`/grammar?q=${searchInput}`)}>
							Ngu phap
						</button>
						{/* <button>Nhat - Nhat</button> */}
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

				<div className="sentence-results sentence-layout">
					<div className="sentence-card">
						<h2>
							Ket qua tra cuu mau cau cua <span>{keyword || "..."}</span>
						</h2>
						{!hasKeyword && (
							<p className="sentence-empty-tip">
								Nhap tu khoa de tim vi du. Ben phai la cac thong tin de ban thao tac nhanh.
							</p>
						)}
						{loading && <p>Dang tai...</p>}
						{error && <p className="sentence-error">{error}</p>}
						{!loading &&
							!error &&
							sentences.map((item) => (
								<div className="sentence-item" key={item.id}>
									<p className="sentence-jp">{item.japaneseSentence}</p>
									<p className="sentence-vi">{item.vietnameseTranslation}</p>
								</div>
							))}
					</div>

					{!hasKeyword && (
						<aside className="sentence-side-grid">
							<div className="sentence-side-card">
								<h3>Lich su gan day</h3>
								<div className="sentence-side-list">
									{recentHistory.slice(0, 6).map((item) => {
										const term = getTermLabel(item);
										if (!term) return null;
										return (
											<button
												type="button"
												key={item.id}
												onClick={() => history.push(`/sentence?q=${encodeURIComponent(term)}`)}
											>
												{term}
											</button>
										);
									})}
									{recentHistory.length === 0 && <p>Chua co lich su.</p>}
								</div>
							</div>

							<div className="sentence-side-card">
								<h3>Tu khoa hot</h3>
								<div className="sentence-chip-list">
									{topKeywords.slice(0, 8).map((item, index) => {
										const term = getTermLabel(item);
										if (!term) return null;
										return (
											<button
												type="button"
												key={`${term}-${index}`}
												onClick={() => history.push(`/sentence?q=${encodeURIComponent(term)}`)}
											>
												{term}
												<span>{getTermCount(item)}</span>
											</button>
										);
									})}
									{topKeywords.length === 0 && <p>Chua co du lieu hot.</p>}
								</div>
							</div>

							<div className="sentence-side-card">
								<h3>Gop y moi</h3>
								<div className="sentence-feedback-list">
									{latestContributions.slice(0, 4).map((item) => (
										<div key={item.id} className="sentence-feedback-item">
											<strong>{item.word || "Tu vung"}</strong>
											<p>{item.content}</p>
										</div>
									))}
									{latestContributions.length === 0 && <p>Chua co gop y.</p>}
								</div>
							</div>
						</aside>
					)}
				</div>
			</div>
		</div>
	);
};

export default SentencePage;
