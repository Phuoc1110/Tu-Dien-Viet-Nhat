import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import "./HomePage.css";
import { recognizeImageText, searchWords } from "../../services/dictionaryService";
import { useHistory, useLocation } from "react-router-dom";
import {
	clearWordSearchHistory,
	getWordSearchHistory,
	getWordSearchHistoryPage,
	getTopSearchKeywordsToday,
} from "../../services/searchHistoryService";
import {
	getLatestWordContributions,
	getLatestWordContributionsPage,
} from "../../services/wordContributionService";
import { UserContext } from "../../Context/UserProvider";
import KanjiDrawModal from "../../components/KanjiDrawModal/KanjiDrawModal";
import { normalizeSearchKeyword } from "../../utils/searchKeywordNormalizer";
import { Camera, Mic, PenTool, RefreshCcw, Sparkles, Wand2, Zap } from "lucide-react";

const splitVariants = (raw) =>
	String(raw || "")
		.split(/[;；,，、|/]+/)
		.map((item) => item.trim())
		.filter(Boolean);

const normalize = (raw) => String(raw || "").trim().toLowerCase();

const pickBestQueryToken = (entry, typedValue) => {
	const typed = normalize(typedValue);
	const variants = [
		...splitVariants(entry?.word),
		...splitVariants(entry?.reading),
		...splitVariants(entry?.romaji),
	];

	const exact = variants.find((token) => normalize(token) === typed);
	if (exact) {
		return exact;
	}

	const partial = variants.find((token) => normalize(token).includes(typed));
	if (partial) {
		return partial;
	}

	return splitVariants(entry?.word)[0] || entry?.word || "";
};

const HomePage = () => {
	const HISTORY_PAGE_SIZE = 20;
	const COMMUNITY_PAGE_SIZE = 20;

	const [searchInput, setSearchInput] = useState("");
	const [loadingSearch, setLoadingSearch] = useState(false);
	const [searchError, setSearchError] = useState("");
	const [searchResults, setSearchResults] = useState([]);
	const [highlightedDropdownIndex, setHighlightedDropdownIndex] = useState(-1);
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);
	const [isHistoryOpen, setIsHistoryOpen] = useState(false);
	const [isKanjiDrawOpen, setIsKanjiDrawOpen] = useState(false);
	const [historyItems, setHistoryItems] = useState([]);
	const [historyTotal, setHistoryTotal] = useState(0);
	const [historyOffset, setHistoryOffset] = useState(0);
	const [historyHasMore, setHistoryHasMore] = useState(true);
	const [historyLoadingMore, setHistoryLoadingMore] = useState(false);
	const [communityPosts, setCommunityPosts] = useState([]);
	const [communityTotal, setCommunityTotal] = useState(0);
	const [communityOffset, setCommunityOffset] = useState(0);
	const [communityHasMore, setCommunityHasMore] = useState(true);
	const [communityLoadingMore, setCommunityLoadingMore] = useState(false);
	const [hotKeywords, setHotKeywords] = useState([]);
	const [isImageUploading, setIsImageUploading] = useState(false);
	const searchWrapRef = useRef(null);
	const imageInputRef = useRef(null);
	const historyListRef = useRef(null);
	const communityListRef = useRef(null);
	const history = useHistory();
	const location = useLocation();
	const { user } = useContext(UserContext);
	const isLoggedIn = !!(user?.isAuthenticated && user?.account?.id);

	const defaultHotKeywords = useMemo(
		() => ["健康", "期待", "求める", "表", "開く", "仕事", "検討", "役割", "方法", "解決", "時間", "関係", "問題", "社会", "文化", "表現"],
		[]
	);

	useEffect(() => {
		if (!searchInput.trim()) {
			setSearchError("");
			setSearchResults([]);
			setHighlightedDropdownIndex(-1);
			return;
		}

		const debounce = setTimeout(() => {
			runWordSearch(searchInput.trim(), 8);
		}, 220);

		return () => clearTimeout(debounce);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [searchInput]);

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

	useEffect(() => {
		if (isDropdownOpen && highlightedDropdownIndex >= 0) {
			const dropdownList = searchWrapRef.current?.querySelector('.dropdown-list');
			const activeItem = dropdownList?.querySelector('.dropdown-item.active');
			if (activeItem) {
				activeItem.scrollIntoView({ block: "nearest" });
			}
		}
	}, [highlightedDropdownIndex, isDropdownOpen]);

	const loadHistoryPage = async (reset = false) => {
		if (!isLoggedIn || historyLoadingMore) {
			return;
		}

		if (!reset && !historyHasMore) {
			return;
		}

		setHistoryLoadingMore(true);
		const nextOffset = reset ? 0 : historyOffset;
		const response = await getWordSearchHistoryPage(HISTORY_PAGE_SIZE, nextOffset);
		const safeItems = Array.isArray(response?.items) ? response.items : [];
		setHistoryTotal(Number(response?.total) || 0);

		setHistoryItems((prev) => {
			if (reset) {
				return safeItems;
			}

			const seen = new Set(prev.map((item) => `${item.id}-${item.searchedAt}`));
			const merged = [...prev];
			safeItems.forEach((item) => {
				const key = `${item.id}-${item.searchedAt}`;
				if (!seen.has(key)) {
					seen.add(key);
					merged.push(item);
				}
			});
			return merged;
		});

		setHistoryOffset(nextOffset + safeItems.length);
		setHistoryHasMore(safeItems.length >= HISTORY_PAGE_SIZE);
		setHistoryLoadingMore(false);
	};

	const loadCommunityPage = async (reset = false) => {
		if (communityLoadingMore) {
			return;
		}

		if (!reset && !communityHasMore) {
			return;
		}

		setCommunityLoadingMore(true);
		const nextOffset = reset ? 0 : communityOffset;
		const response = await getLatestWordContributionsPage(COMMUNITY_PAGE_SIZE, nextOffset);
		const safeItems = Array.isArray(response?.items) ? response.items : [];
		setCommunityTotal(Number(response?.total) || 0);

		setCommunityPosts((prev) => {
			if (reset) {
				return safeItems;
			}

			const seen = new Set(prev.map((item) => `${item.id}-${item.createdAt}`));
			const merged = [...prev];
			safeItems.forEach((item) => {
				const key = `${item.id}-${item.createdAt}`;
				if (!seen.has(key)) {
					seen.add(key);
					merged.push(item);
				}
			});
			return merged;
		});

		setCommunityOffset(nextOffset + safeItems.length);
		setCommunityHasMore(safeItems.length >= COMMUNITY_PAGE_SIZE);
		setCommunityLoadingMore(false);
	};

	useEffect(() => {
		const syncLocalData = () => {
			if (isLoggedIn) {
				setHistoryOffset(0);
				setHistoryHasMore(true);
				loadHistoryPage(true);
			} else {
				setHistoryItems([]);
				setHistoryTotal(0);
				setHistoryOffset(0);
				setHistoryHasMore(false);
			}

			setCommunityOffset(0);
			setCommunityHasMore(true);
			loadCommunityPage(true);
		};

		syncLocalData();

		window.addEventListener("focus", syncLocalData);
		window.addEventListener("storage", syncLocalData);

		return () => {
			window.removeEventListener("focus", syncLocalData);
			window.removeEventListener("storage", syncLocalData);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isLoggedIn]);

	useEffect(() => {
		const loadTopKeywords = async () => {
			const items = await getTopSearchKeywordsToday(20);
			let fetchedWords = [];
			if (Array.isArray(items) && items.length > 0) {
				fetchedWords = items.map((item) => item.word).filter(Boolean);
			}
			
			// Pad with default keywords to ensure the lines are full
			if (fetchedWords.length < 20) {
				const defaultWordsToAdd = defaultHotKeywords.filter(w => !fetchedWords.includes(w));
				fetchedWords = [...fetchedWords, ...defaultWordsToAdd].slice(0, 20);
			}
			
			setHotKeywords(fetchedWords);
		};

		loadTopKeywords();
	}, [defaultHotKeywords]);

	const handleSearch = (event) => {
		event.preventDefault();
		if (searchInput.trim()) {
			const text = searchInput.trim();
			if (text.length > 25 || /[。、！？\n]/.test(text)) {
				history.push(`/analysis?text=${encodeURIComponent(text)}`);
				setIsDropdownOpen(false);
				setHighlightedDropdownIndex(-1);
				return;
			}
			const convertedKeyword = normalizeSearchKeyword(text);
			setSearchInput(convertedKeyword);
			history.push(`/dictionary?q=${encodeURIComponent(convertedKeyword)}&from=home`);
			setIsDropdownOpen(false);
			setHighlightedDropdownIndex(-1);
		}
	};

	const handleSearchInputChange = (event) => {
		const nextValue = event.target.value;
		setSearchInput(nextValue);
		setHighlightedDropdownIndex(-1);
	};

	const openImagePicker = () => {
		if (isImageUploading) {
			return;
		}
		imageInputRef.current?.click();
	};

	const handleImagePick = async (event) => {
		const file = event.target.files?.[0];
		event.target.value = "";

		if (!file) {
			return;
		}

		if (!file.type.startsWith("image/")) {
			setSearchError("Vui lòng chọn một file ảnh hợp lệ.");
			setIsDropdownOpen(true);
			return;
		}

		const formData = new FormData();
		formData.append("image", file);

		setIsImageUploading(true);
		setSearchError("");

		try {
			const response = await recognizeImageText(formData);
			if (response && response.errCode === 0) {
				const recognizedText = String(response.text || response.words?.join(" ") || "").trim();
				if (recognizedText) {
					setSearchInput(recognizedText);
					setIsDropdownOpen(true);
					setHighlightedDropdownIndex(-1);
					return;
				}

				setSearchError("Không nhận được chữ nào từ ảnh này.");
				setIsDropdownOpen(true);
				return;
			}

			setSearchError(response?.errMessage || "Không thể đọc ảnh lúc này.");
			setIsDropdownOpen(true);
		} catch (error) {
			console.error("Image OCR error:", error);
			setSearchError("Không thể đọc ảnh lúc này.");
			setIsDropdownOpen(true);
		} finally {
			setIsImageUploading(false);
		}
	};


	const handleSearchInputKeyDown = (event) => {
		if (event.key === "ArrowDown") {
			event.preventDefault();
			if (!searchResults.length) {
				return;
			}
			setIsDropdownOpen(true);
			setHighlightedDropdownIndex((prev) => {
				if (prev < 0) {
					return 0;
				}
				return (prev + 1) % searchResults.length;
			});
			return;
		}

		if (event.key === "ArrowUp") {
			event.preventDefault();
			if (!searchResults.length) {
				return;
			}
			setIsDropdownOpen(true);
			setHighlightedDropdownIndex((prev) => {
				if (prev < 0) {
					return searchResults.length - 1;
				}
				return (prev - 1 + searchResults.length) % searchResults.length;
			});
			return;
		}

		if (event.key === "Escape") {
			setIsDropdownOpen(false);
			setHighlightedDropdownIndex(-1);
			return;
		}

		if (
			event.key === "Enter" &&
			isDropdownOpen &&
			highlightedDropdownIndex >= 0 &&
			highlightedDropdownIndex < searchResults.length
		) {
			event.preventDefault();
			handleSelectWord(searchResults[highlightedDropdownIndex]);
		}
	};

	const runWordSearch = async (keyword, limit = 12) => {
		const normalized = (keyword || "").trim();
		if (!normalized) {
			setSearchError("");
			setSearchResults([]);
			return;
		}

		const convertedKeyword = normalizeSearchKeyword(normalized);

		setLoadingSearch(true);
		setSearchError("");

		const res = await searchWords(convertedKeyword, limit);
		if (res && res.errCode === 0) {
			setSearchResults(res.words || []);
			setHighlightedDropdownIndex(-1);
		} else {
			setSearchResults([]);
			setHighlightedDropdownIndex(-1);
			setSearchError((res && res.errMessage) || "Không thể tra từ lúc này.");
		}

		setLoadingSearch(false);
	};

	const applyHintAndSearch = async (keyword) => {
		setSearchInput(keyword);
		setIsDropdownOpen(true);
		await runWordSearch(keyword, 12);
	};

	const openDictionaryForWord = (word) => {
		const normalizedWord = normalizeSearchKeyword(String(word || "").trim());
		history.push(`/dictionary?q=${encodeURIComponent(normalizedWord)}`);
	};

	const handleSelectWord = (word) => {
		const selectedQuery = String(word?.word || "").trim() || pickBestQueryToken(word, searchInput);
		const convertedQuery = normalizeSearchKeyword(selectedQuery);
		setSearchInput(convertedQuery);
		history.push(`/dictionary?q=${encodeURIComponent(convertedQuery)}`);
		setIsDropdownOpen(false);
		setHighlightedDropdownIndex(-1);
	};

	const openHistoryPopup = () => {
		if (!isLoggedIn) {
			history.push("/login");
			return;
		}
		setHistoryOffset(0);
		setHistoryHasMore(true);
		setIsHistoryOpen(true);
		loadHistoryPage(true);
	};

	const handleSelectHistoryItem = (item) => {
		setIsHistoryOpen(false);
		history.push(`/dictionary?q=${item.word}`);
	};

	const handleClearHistory = () => {
		if (!isLoggedIn) {
			return;
		}
		clearWordSearchHistory().then(() => {
			setHistoryItems([]);
			setHistoryTotal(0);
			setHistoryOffset(0);
			setHistoryHasMore(false);
		});
		setCommunityOffset(0);
		setCommunityHasMore(true);
		loadCommunityPage(true);
	};

	const handleHistoryListScroll = () => {
		const el = historyListRef.current;
		if (!el || historyLoadingMore || !historyHasMore) {
			return;
		}

		const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
		if (nearBottom) {
			loadHistoryPage(false);
		}
	};

	const handleCommunityListScroll = () => {
		const el = communityListRef.current;
		if (!el || communityLoadingMore || !communityHasMore) {
			return;
		}

		const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
		if (nearBottom) {
			loadCommunityPage(false);
		}
	};

	useEffect(() => {
		if (!location.search) {
			return;
		}
		const params = new URLSearchParams(location.search);
		const textParam = params.get("text");
		if (textParam) {
			history.push(`/analysis?text=${encodeURIComponent(textParam)}`);
		}
	}, [history, location.search]);

	const historyPreviewItems = historyItems.slice(0, 20);

	const renderDropdownBody = () => {
		if (loadingSearch) {
			return <div className="dropdown-status">Đang tra cứu...</div>;
		}

		if (searchError) {
			return <div className="dropdown-status error">{searchError}</div>;
		}

		if (!searchResults.length) {
			return <div className="dropdown-status">Không có dữ liệu phù hợp.</div>;
		}

		return (
			<div className="dropdown-list">
				{searchResults.map((word, index) => (
					<button
						type="button"
						key={word.id}
						className={`dropdown-item ${highlightedDropdownIndex === index ? "active" : ""}`}
						onClick={() => handleSelectWord(word)}
						onMouseEnter={() => setHighlightedDropdownIndex(index)}
					>
						<div className="dropdown-item-main">
							<strong>{word.word}</strong>
							<span>{word.reading || "-"}</span>
						</div>
						<p>{word.meanings?.[0]?.definition || "Chưa có nghĩa"}</p>
					</button>
				))}
			</div>
		);
	};

	return (
		<div className="home-page">
			{/* HERO SECTION */}
			<section className="home-hero">
				<div className="home-hero-content">
					<p className="home-hero-kicker">Japanese Toolbox</p>
					<h1 className="home-hero-title">Tra cứu từ vựng theo cách nhanh và trực quan hơn</h1>
					
					<div className="home-search-wrap" ref={searchWrapRef}>
						<form className="home-search-bar" onSubmit={handleSearch}>
							<span className="search-leading" aria-hidden="true">辞</span>
							<input
								type="text"
								value={searchInput}
								onFocus={() => setIsDropdownOpen(true)}
								onChange={handleSearchInputChange}
								onKeyDown={handleSearchInputKeyDown}
								placeholder="Nhật, nihon, Nhật Bản"
								aria-label="Tìm kiếm từ"
							/>
							<div className="search-actions">
								<button type="button" className="action-btn" onClick={openImagePicker} title="Chụp ảnh để tra cứu" disabled={isImageUploading} aria-label="Chọn ảnh để tra cứu">
									<Camera size={16} />
									<span>{isImageUploading ? "Đang đọc" : "Ảnh"}</span>
								</button>
								<button type="button" className="action-btn" onClick={() => setIsKanjiDrawOpen(true)} title="Nhập chữ viết tay" aria-label="Mở trình viết tay">
									<PenTool size={16} />
									<span>Viết tay</span>
								</button>
								<button type="submit" className="action-btn primary" aria-label="Tra cứu">
									Tra cứu
								</button>
							</div>
						</form>
						
						<input
							ref={imageInputRef}
							type="file"
							accept="image/*"
							capture="environment"
							onChange={handleImagePick}
							style={{ display: "none" }}
						/>
						
						{isDropdownOpen && searchInput.trim() && (
							<div className="home-dropdown">{renderDropdownBody()}</div>
						)}
					</div>

					<nav className="home-mode-tabs" role="tablist" aria-label="Chế độ tra cứu">
						<button className="tab-active" type="button" aria-pressed="true" aria-label="Chế độ Từ vựng">
							Từ vựng
						</button>
						<button type="button" onClick={() => history.push(`/kanji?q=${searchInput.trim()}`)} aria-pressed="false" aria-label="Chế độ Hán tự">
							Hán tự
						</button>
						<button type="button" onClick={() => history.push(`/sentence?q=${searchInput.trim()}`)} aria-pressed="false" aria-label="Chế độ Mẫu câu">
							Mẫu câu
						</button>
						<button type="button" onClick={() => history.push(`/grammar?q=${searchInput.trim()}`)} aria-pressed="false" aria-label="Chế độ Ngữ pháp">
							Ngữ pháp
						</button>
						<button type="button" onClick={() => history.push(searchInput.trim() ? `/analysis?text=${searchInput.trim()}` : '/analysis')} aria-pressed="false" aria-label="Chế độ Phân tích">
							Phân tích đoạn văn
						</button>
					</nav>
				</div>
			</section>

			{/* MAIN CONTENT AREA */}
			<main className="home-main-content">
				<div className="home-left-col">
					<section className="home-section">
						<h2 className="home-section-title">Khám phá & Tiện ích</h2>
						<div className="card-grid">
							<div className="modern-card">
								<h3>
									<span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Zap size={18} color="var(--da-accent-gold)"/> Mẹo tra cứu nhanh</span>
								</h3>
								<ul className="tips-list">
									<li><Sparkles size={14} /> Gõ kana, romaji hoặc kanji đều được hệ thống gợi ý tức thì.</li>
									<li><Sparkles size={14} /> Đăng nhập để lưu lịch sử và tiếp tục học trên thiết bị khác.</li>
									<li><Sparkles size={14} /> Dùng từ ngắn trước, sau đó mở rộng bằng từ khóa liên quan.</li>
								</ul>
							</div>

							<div className="modern-card">
								<h3>
									<span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><RefreshCcw size={18} color="var(--da-accent-blue)"/> Lịch sử tra cứu ({isLoggedIn ? historyTotal : 0})</span>
									<button type="button" onClick={openHistoryPopup}>Xem tất cả</button>
								</h3>
								<div className="chip-cloud">
									{!isLoggedIn && <span className="empty-state" style={{padding: 0}}>Đăng nhập để xem lịch sử tra cứu</span>}
									{isLoggedIn && historyPreviewItems.length === 0 && <span className="empty-state" style={{padding: 0}}>Chưa có lịch sử tra cứu</span>}
									{historyPreviewItems.map((item, index) => (
										<button key={`${item.word}-${index}`} type="button" className="chip-modern" onClick={() => handleSelectHistoryItem(item)}>
											{item.word}
										</button>
									))}
								</div>
							</div>
						</div>
					</section>

					<section className="home-section">
						<div className="modern-card">
							<h3>
								<span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Zap size={18} color="var(--da-accent-red)"/> Từ khóa hot hôm nay</span>
							</h3>
							<div className="chip-cloud">
								{hotKeywords.map((word) => (
									<button key={word} type="button" className="chip-modern" onClick={() => openDictionaryForWord(word)}>
										{word}
									</button>
								))}
							</div>
						</div>
					</section>
				</div>

				<aside className="home-right-col">
					<section className="home-section">
						<h2 className="home-section-title">Góp ý cộng đồng ({communityTotal})</h2>
						<div className="modern-card" style={{ padding: '16px' }}>
							<div className="feedback-list" ref={communityListRef} onScroll={handleCommunityListScroll}>
								{communityPosts.length === 0 && (
									<p className="empty-state">Chưa có bình luận nào.</p>
								)}
								{communityPosts.map((item) => (
									<div key={`${item.id}-${item.createdAt}`} className="feedback-card">
										<strong>{item.word}</strong>
										<p>{item.meaning || item.content}</p>
										<small>{item.author || "Bạn"} • {new Date(item.createdAt).toLocaleString("vi-VN")}</small>
									</div>
								))}
								{communityLoadingMore && <p className="empty-state">Đang tải thêm...</p>}
								{!communityHasMore && communityPosts.length > 0 && (
									<p className="empty-state" style={{ fontSize: '0.8rem', padding: '10px' }}>Đã tải hết góp ý.</p>
								)}
							</div>
						</div>
					</section>
				</aside>
			</main>

			<KanjiDrawModal
				open={isKanjiDrawOpen}
				onClose={() => setIsKanjiDrawOpen(false)}
				anchorRef={searchWrapRef}
				onPick={(value) => {
					setSearchInput((prev) => `${prev || ""}${value}`);
					setIsDropdownOpen(true);
				}}
			/>

			{isHistoryOpen && (
				<div className="history-modal-overlay" onClick={() => setIsHistoryOpen(false)}>
					<div className="history-modal" onClick={(event) => event.stopPropagation()}>
						<div className="history-modal-head">
							<h3>Lịch sử của bạn</h3>
							<div className="history-modal-actions">
								<button type="button" onClick={handleClearHistory}>Xóa tất cả</button>
								<button type="button" onClick={() => setIsHistoryOpen(false)}>Đóng</button>
							</div>
						</div>
						<div className="history-modal-list" ref={historyListRef} onScroll={handleHistoryListScroll}>
							{historyItems.length === 0 && (
								<p className="empty-state">Chưa có từ nào trong lịch sử.</p>
							)}
							{historyItems.map((item, index) => (
								<button type="button" key={`${item.word}-${item.searchedAt}-${index}`} className="history-modal-item" onClick={() => handleSelectHistoryItem(item)}>
									<div className="history-item-main">
										<strong>{item.word}</strong>
										<small>{new Date(item.searchedAt).toLocaleString("vi-VN")}</small>
									</div>
									{item.meaning && <p>{item.meaning}</p>}
								</button>
							))}
							{historyLoadingMore && <p className="empty-state">Đang tải thêm...</p>}
							{!historyHasMore && historyItems.length > 0 && (
								<p className="empty-state">Đã tải hết lịch sử.</p>
							)}
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default HomePage;
