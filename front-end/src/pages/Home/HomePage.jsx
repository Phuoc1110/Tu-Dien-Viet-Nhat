import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import "./HomePage.css";
import { recognizeImageText, searchWords } from "../../services/dictionaryService";
import { useHistory } from "react-router-dom";
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
	const { user } = useContext(UserContext);
	const isLoggedIn = !!(user?.isAuthenticated && user?.account?.id);

	const defaultHotKeywords = useMemo(
		() => ["健康", "期待", "求める", "表", "開く", "仕事", "検討", "役割"],
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
			const items = await getTopSearchKeywordsToday(8);
			if (Array.isArray(items) && items.length > 0) {
				setHotKeywords(items.map((item) => item.word).filter(Boolean));
				return;
			}
			setHotKeywords(defaultHotKeywords);
		};

		loadTopKeywords();
	}, [defaultHotKeywords]);

	const handleSearch = (event) => {
		event.preventDefault();
		if (searchInput.trim()) {
			const convertedKeyword = normalizeSearchKeyword(searchInput.trim());
			setSearchInput(convertedKeyword);
			history.push(`/dictionary?q=${encodeURIComponent(convertedKeyword)}`);
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

	const historyPreviewItems = historyItems.slice(0, 8);

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
			<div className="home-shell">
				<header className="home-search-wrap bento-surface" ref={searchWrapRef}>
					<div className="home-search-head">
						<p className="home-search-kicker">Japanese Toolbox</p>
						<h1>Tra cứu từ vựng theo cách nhanh và trực quan hơn</h1>
					</div>
					<div className="home-search-input-zone">
						<form className="home-search-bar" onSubmit={handleSearch}>
							<span className="search-leading" aria-hidden="true">辞</span>
							<input
								type="text"
								value={searchInput}
								onFocus={() => setIsDropdownOpen(true)}
								onChange={handleSearchInputChange}
								onKeyDown={handleSearchInputKeyDown}
								placeholder="Nhật, nihon, Nhật Bản"
							/>
							<div className="search-actions">
								<button type="button" onClick={openImagePicker} title="Chụp ảnh để tra cứu" disabled={isImageUploading}>
									<Camera size={15} />
									<span>{isImageUploading ? "Đang đọc" : "Ảnh"}</span>
								</button>
								<button type="button" onClick={() => setIsKanjiDrawOpen(true)} title="Nhập chữ viết tay">
									<PenTool size={15} />
									<span>Write</span>
								</button>
								{/* <button type="button" title="Tìm kiếm giọng nói">
									<Mic size={15} />
									<span>Voice</span>
								</button> */}
								<button type="button" onClick={openHistoryPopup}>
									<RefreshCcw size={15} />
									His
								</button>
							</div>
							<button className="lang-switch" type="submit">
								Nhật - Việt ▾
							</button>
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

					<nav className="home-mode-tabs">
						<button className="tab-active" type="button">
							Từ vựng
						</button>
						<button
							type="button"
							onClick={() => history.push(`/kanji?q=${searchInput.trim()}`)}
						>
							Hán tự
						</button>
						<button
							type="button"
							onClick={() => history.push(`/sentence?q=${searchInput.trim()}`)}
						>
							Mẫu câu
						</button>
						<button
							type="button"
							onClick={() => history.push(`/grammar?q=${searchInput.trim()}`)}
						>
							Ngữ pháp
						</button>
					</nav>

				</header>

				<section className="home-hero-grid">
					<article className="home-hero-main bento-surface">
						<p className="hero-kicker">Dashboard Spotlight</p>
						<h2>Kết hợp tra từ, lịch sử học và góp ý cộng đồng trên cùng một dashboard.</h2>
						<p>
							Bắt đầu từ một từ khóa, sau đó mở rộng sang câu, ngữ pháp và kanji chỉ bằng vài cú nhấp.
						</p>
						<div className="hero-actions">
							<button type="button" onClick={() => applyHintAndSearch("景気")}>
								<Wand2 size={14} />
								Thử từ 景気
							</button>
							<button type="button" onClick={() => applyHintAndSearch("健康")}>
								<Zap size={14} />
								Thử từ 健康
							</button>
						</div>
					</article>

					<div className="home-hero-stats">
						<div className="hero-stat-card bento-tile">
							<span>Tài khoản</span>
							<strong>{isLoggedIn ? "Đã đăng nhập" : "Chưa đăng nhập"}</strong>
						</div>
						<div className="hero-stat-card bento-tile">
							<span>Lịch sử gần đây</span>
							<strong>{historyTotal}</strong>
						</div>
						<div className="hero-stat-card bento-tile">
							<span>Từ khóa hot</span>
							<strong>{hotKeywords.length}</strong>
						</div>
						<div className="hero-stat-card bento-tile">
							<span>Góp ý cộng đồng</span>
							<strong>{communityTotal}</strong>
						</div>
					</div>
				</section>

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
						<div
							className="history-modal"
							onClick={(event) => event.stopPropagation()}
						>
							<div className="history-modal-head">
								<h3>Lịch sử</h3>
								<div className="history-modal-actions">
									<button type="button" onClick={handleClearHistory}>Xóa</button>
									<button type="button" onClick={() => setIsHistoryOpen(false)}>
										✕
									</button>
								</div>
							</div>
							<div className="history-modal-list" ref={historyListRef} onScroll={handleHistoryListScroll}>
								{historyItems.length === 0 && (
									<p className="history-empty">Chưa có từ nào trong lịch sử.</p>
								)}
								{historyItems.map((item, index) => (
									<button
										type="button"
										key={`${item.word}-${item.searchedAt}-${index}`}
										className="history-modal-item"
										onClick={() => handleSelectHistoryItem(item)}
									>
										<div className="history-item-main">
											<strong>{item.word}</strong>
											<small>
												{new Date(item.searchedAt).toLocaleString("vi-VN")}
											</small>
										</div>
										{item.meaning && <p>{item.meaning}</p>}
									</button>
								))}
								{historyLoadingMore && <p className="history-loading-more">Đang tải thêm...</p>}
								{!historyHasMore && historyItems.length > 0 && (
									<p className="history-loading-more">Đã tải hết lịch sử.</p>
								)}
							</div>
						</div>
					</div>
				)}

				<main className="home-content-grid">
					<section className="home-main-column">
						<article className="surface-panel tips-panel bento-surface">
							<h3>Mẹo tra cứu nhanh</h3>
							<ul>
								<li><Sparkles size={14} /> Gõ kana, romaji hoặc kanji đều được hệ thống gợi ý tức thì.</li>
								<li><Sparkles size={14} /> Đăng nhập để lưu lịch sử và tiếp tục học trên thiết bị khác.</li>
								<li><Sparkles size={14} /> Dùng từ ngắn trước, sau đó mở rộng bằng từ khóa liên quan.</li>
							</ul>
						</article>

						<article className="surface-panel bento-surface">
							<div className="panel-head">
								<h3>Từ khóa hot hôm nay</h3>
								<button type="button" onClick={() => setSearchInput("")}>
									<RefreshCcw size={13} />
									Làm mới
								</button>
							</div>
							<div className="chip-list">
								{hotKeywords.map((word) => (
									<button key={word} type="button" onClick={() => applyHintAndSearch(word)}>
										{word}
									</button>
								))}
							</div>
						</article>

						<article className="surface-panel bento-surface">
							<div className="panel-head">
								<h3>Lịch sử tra cứu</h3>
								<button type="button" onClick={openHistoryPopup}>
									Xem tất cả
								</button>
							</div>
							<div className="chip-list">
								{/* {isLoggedIn && historyTotal > 0 && (
									<p className="history-preview-empty">Tổng: {historyTotal}</p>
								)} */}
								{!isLoggedIn && (
									<p className="history-preview-empty">Đăng nhập để xem lịch sử tra cứu</p>
								)}
								{historyPreviewItems.map((item, index) => (
									<button
										key={`${item.word}-${index}`}
										type="button"
										onClick={() => handleSelectHistoryItem(item)}
									>
										{item.word}
									</button>
								))}
								{isLoggedIn && historyPreviewItems.length === 0 && (
									<p className="history-preview-empty">Chưa có lịch sử tra cứu</p>
								)}
							</div>
						</article>

						{/* <article className="surface-panel jlpt-panel">
							<h3>JLPT Quick Start</h3>
							<div className="jlpt-list">
								<button type="button" onClick={() => applyHintAndSearch("経済")}>N1</button>
								<button type="button" onClick={() => applyHintAndSearch("期待")}>N2</button>
								<button type="button" onClick={() => applyHintAndSearch("仕事")}>N3</button>
								<button type="button" onClick={() => applyHintAndSearch("便利")}>N4</button>
								<button type="button" onClick={() => applyHintAndSearch("学校")}>N5</button>
							</div>
						</article> */}
					</section>

					<aside className="home-side-column">
						<article className="surface-panel community-panel bento-surface">
							<h3>Góp ý cộng đồng </h3>
							<div className="feedback-list" ref={communityListRef} onScroll={handleCommunityListScroll}>
								{communityPosts.map((item) => (
									<div key={`${item.id}-${item.createdAt}`} className="feedback-item">
										<strong>{item.word}</strong>
										<p>{item.meaning || item.content}</p>
										<small className="feedback-meta">
											{item.author || "Bạn"} • {new Date(item.createdAt).toLocaleString("vi-VN")}
										</small>
									</div>
								))}
								{communityPosts.length === 0 && (
									<p className="feedback-empty">Chưa có bình luận nào.</p>
								)}
								{communityLoadingMore && <p className="feedback-empty">Đang tải thêm...</p>}
								{!communityHasMore && communityPosts.length > 0 && (
									<p className="feedback-empty">Đã tải hết góp ý.</p>
								)}
							</div>
						</article>
					</aside>
				</main>
			</div>
		</div>
	);
};

export default HomePage;
