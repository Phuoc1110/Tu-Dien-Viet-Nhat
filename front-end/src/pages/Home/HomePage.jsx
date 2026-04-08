import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import "./HomePage.css";
import { searchWords } from "../../services/dictionaryService";
import { useHistory } from "react-router-dom";
import {
	clearWordSearchHistory,
	getWordSearchHistory,
} from "../../services/searchHistoryService";
import { getLatestWordContributions } from "../../services/wordContributionService";
import { UserContext } from "../../Context/UserProvider";
import KanjiDrawModal from "../../components/KanjiDrawModal/KanjiDrawModal";

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
	const [searchInput, setSearchInput] = useState("");
	const [loadingSearch, setLoadingSearch] = useState(false);
	const [searchError, setSearchError] = useState("");
	const [searchResults, setSearchResults] = useState([]);
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);
	const [isHistoryOpen, setIsHistoryOpen] = useState(false);
	const [isKanjiDrawOpen, setIsKanjiDrawOpen] = useState(false);
	const [historyItems, setHistoryItems] = useState([]);
	const [communityPosts, setCommunityPosts] = useState([]);
	const [communityExpanded, setCommunityExpanded] = useState(false);
	const searchWrapRef = useRef(null);
	const history = useHistory();
	const { user } = useContext(UserContext);
	const isLoggedIn = !!(user?.isAuthenticated && user?.account?.id);

	const hotKeywords = useMemo(
		() => ["健康", "期待", "求める", "表", "開く", "仕事", "検討", "役割"],
		[]
	);

	const feedbackItems = useMemo(
		() => [
			{ id: 1, jp: "御坊ちゃま", vi: "cậu ấm, cậu con trai nhỏ" },
			{ id: 2, jp: "青年", vi: "tuổi trẻ đầy hứa hẹn" },
			{ id: 3, jp: "挟まる", vi: "ở giữa, bị kẹp" },
			{ id: 4, jp: "目の肥えた", vi: "con mắt tinh tường" },
		],
		[]
	);

	useEffect(() => {
		if (!searchInput.trim()) {
			setSearchError("");
			setSearchResults([]);
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
			}
		};

		document.addEventListener("mousedown", handleOutsideClick);
		return () => document.removeEventListener("mousedown", handleOutsideClick);
	}, []);

	useEffect(() => {
		const syncLocalData = () => {
			if (isLoggedIn) {
				getWordSearchHistory(80).then((items) => {
					setHistoryItems(Array.isArray(items) ? items : []);
				});
			} else {
				setHistoryItems([]);
			}

			getLatestWordContributions(6).then((items) => {
				setCommunityPosts(Array.isArray(items) ? items : []);
			});
		};

		syncLocalData();

		window.addEventListener("focus", syncLocalData);
		window.addEventListener("storage", syncLocalData);

		return () => {
			window.removeEventListener("focus", syncLocalData);
			window.removeEventListener("storage", syncLocalData);
		};
	}, [isLoggedIn]);

	const handleSearch = (event) => {
		event.preventDefault();
		if (searchInput.trim()) {
			history.push(`/dictionary?q=${searchInput.trim()}`);
		}
	};

	const runWordSearch = async (keyword, limit = 12) => {
		const normalized = (keyword || "").trim();
		if (!normalized) {
			setSearchError("");
			setSearchResults([]);
			return;
		}

		setLoadingSearch(true);
		setSearchError("");

		const res = await searchWords(normalized, limit);
		if (res && res.errCode === 0) {
			setSearchResults(res.words || []);
		} else {
			setSearchResults([]);
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
		const selectedQuery = pickBestQueryToken(word, searchInput);
		history.push(`/dictionary?q=${encodeURIComponent(selectedQuery)}`);
	};

	const handleOpenCommunityPost = (post) => {
		if (!post?.word) {
			return;
		}
		history.push(`/dictionary?q=${post.word}`);
	};

	const openHistoryPopup = () => {
		if (!isLoggedIn) {
			history.push("/login");
			return;
		}
		getWordSearchHistory(80).then((items) => {
			setHistoryItems(Array.isArray(items) ? items : []);
			setIsHistoryOpen(true);
		});
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
		});
		getLatestWordContributions(6).then((items) => {
			setCommunityPosts(Array.isArray(items) ? items : []);
		});
	};

	const historyPreviewItems = historyItems.slice(0, 8);
	const displayedCommunityPosts = communityExpanded
		? communityPosts
		: communityPosts.slice(0, 6);

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
				{searchResults.map((word) => (
					<button
						type="button"
						key={word.id}
						className="dropdown-item"
						onClick={() => handleSelectWord(word)}
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
		<div className="mazii-home">
			<div className="mazii-shell">
				<header className="mazii-search-wrap" ref={searchWrapRef}>
					<form className="mazii-search-bar" onSubmit={handleSearch}>
						<span className="search-leading" aria-hidden="true">
							Search
						</span>
						<input
							type="text"
							value={searchInput}
							onFocus={() => setIsDropdownOpen(true)}
							onChange={(event) => setSearchInput(event.target.value)}
							placeholder="日本, nihon, Nhật Bản"
						/>
						<div className="search-actions">
							{/* <button type="button">↗</button> */}
							<button type="button" onClick={() => setIsKanjiDrawOpen(true)}>A文</button>
							{/* <button type="button">Mic</button> */}
							<button type="button" onClick={openHistoryPopup}>His</button>
						</div>
						<button className="lang-switch" type="submit">
							Nhật - Việt ▾
						</button>
					</form>

					<nav className="mazii-mode-tabs">
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
						{/* <button type="button">Nhật - Nhật</button> */}
					</nav>

					{isDropdownOpen && searchInput.trim() && (
						<div className="mazii-dropdown">{renderDropdownBody()}</div>
					)}
				</header>

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
							<div className="history-modal-list">
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
							</div>
						</div>
					</div>
				)}

				<main className={`mazii-content-grid`}>
					<>
						<section className="mazii-left-column">
							<article className="promo-card">
								<p>Mazii</p>
								<h2>Dịch bằng hình ảnh - Một chạm làm chủ tiếng Nhật</h2>
								<button type="button" onClick={() => applyHintAndSearch("景気")}>
									Thử với 景気
								</button>
							</article>

							<article className="tips-card">
								<h3>Tips</h3>
								<ul>
									<li>Đăng nhập để đồng bộ dữ liệu học trên nhiều thiết bị.</li>
									<li>Tra cứu katakana bằng cách viết hoa: BETONAMU.</li>
									<li>Dùng mẫu ngắn để có kết quả sát nghĩa hơn.</li>
								</ul>
							</article>

							<article className="chip-section">
								<div className="chip-header">
									<h3>Lịch sử</h3>
									<button type="button" onClick={openHistoryPopup}>Xem thêm</button>
								</div>
								<div className="chip-list">
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

							<article className="chip-section">
								<div className="chip-header">
									<h3>Từ khóa hot</h3>
									<button type="button">Xem thêm</button>
								</div>
								<div className="chip-list">
									{hotKeywords.map((word) => (
										<button key={word} type="button" onClick={() => applyHintAndSearch(word)}>
											{word}
										</button>
									))}
								</div>
							</article>

							<article className="chip-section jlpt-section">
								<h3>JLPT</h3>
								<div className="jlpt-list">
									<button type="button">N1</button>
									<button type="button">N2</button>
									<button type="button">N3</button>
									<button type="button">N4</button>
									<button type="button">N5</button>
								</div>
							</article>

							<section className="community-area">
								<div className="chip-header">
									<h3>Cộng đồng</h3>
									<button
										type="button"
										onClick={() => setCommunityExpanded((prev) => !prev)}
									>
										{communityExpanded ? "Thu gọn" : "Xem thêm"}
									</button>
								</div>
								<div className="community-grid">
									{displayedCommunityPosts.map((post, index) => (
										<button
											type="button"
											key={`${post.id}-${index}`}
											className="community-card"
											onClick={() => handleOpenCommunityPost(post)}
										>
											<h4>{post.word}</h4>
											<p className="author">
												{post.author || "Bạn"} • {new Date(post.createdAt).toLocaleString("vi-VN")}
											</p>
											<p>{post.content}</p>
										</button>
									))}
									{communityPosts.length === 0 && (
										<p className="community-empty">Chưa có comment nào từ cộng đồng.</p>
									)}
								</div>
							</section>
						</section>

						<aside className="mazii-right-column">
							<article className="lookup-panel">
								<h3>Kết quả tra cứu</h3>
								<p className="empty-panel">Tra một từ để xem chi tiết nhanh.</p>
							</article>

							<article className="lookup-panel">
								<h3>Các chữ kanji</h3>
								<p className="empty-panel">Kết quả chưa có kanji.</p>
							</article>

							<article className="lookup-panel">
								<h3>Góp ý</h3>
								<div className="feedback-list">
									{feedbackItems.map((item) => (
										<div key={item.id} className="feedback-item">
											<strong>{item.jp}</strong>
											<p>{item.vi}</p>
										</div>
									))}
								</div>
							</article>
						</aside>
					</>
				</main>
			</div>
		</div>
	);
};

export default HomePage;
