import React, { useEffect, useMemo, useRef, useState } from "react";
import "./HomePage.css";
import { searchWords } from "../../services/dictionaryService";
import { useHistory } from "react-router-dom";

const HomePage = () => {
	const [searchInput, setSearchInput] = useState("");
	const [loadingSearch, setLoadingSearch] = useState(false);
	const [searchError, setSearchError] = useState("");
	const [searchResults, setSearchResults] = useState([]);
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);
	const searchWrapRef = useRef(null);
	const history = useHistory();

	const historyWords = useMemo(
		() => ["こない", "きりで", "景気", "経営", "作業", "次位", "返し", "看る"],
		[]
	);

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

	const communityPosts = useMemo(
		() => [
			{
				id: 1,
				title: "mua sổ nách rồ chi?",
				author: "ăng",
				content: "mua sổ nách rồ à, buồn ngủ quàaaa...",
			},
			{
				id: 2,
				title: "Giám đốc lôi cả bố mẹ ra làm ví dụ",
				author: "Cửu trăng",
				content: "Cuộc sống hằng ngày ở Nhật Bản có gì cần lưu ý?",
			},
		],
		[]
	);

	const resultCountLabel = `${searchResults.length} kết quả`;

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
		history.push(`/dictionary?q=${word.word}`);
	};

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
							<button type="button">↗</button>
							<button type="button">A文</button>
							<button type="button">Mic</button>
							<button type="button">His</button>
						</div>
						<button className="lang-switch" type="submit">
							Nhật - Việt ▾
						</button>
					</form>

					<nav className="mazii-mode-tabs">
						<button className="tab-active" type="button">
							Từ vựng
						</button>
						<button type="button">Hán tự</button>
						<button type="button">Mẫu câu</button>
						<button type="button">Ngữ pháp</button>
						<button type="button">Nhật - Nhật</button>
					</nav>

					{isDropdownOpen && searchInput.trim() && (
						<div className="mazii-dropdown">{renderDropdownBody()}</div>
					)}
				</header>

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
									<button type="button">Xem thêm</button>
								</div>
								<div className="chip-list">
									{historyWords.map((word) => (
										<button key={word} type="button" onClick={() => applyHintAndSearch(word)}>
											{word}
										</button>
									))}
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
									<button type="button">Xem thêm</button>
								</div>
								<div className="community-grid">
									{communityPosts.map((post) => (
										<article key={post.id} className="community-card">
											<h4>{post.title}</h4>
											<p className="author">{post.author}</p>
											<p>{post.content}</p>
										</article>
									))}
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
