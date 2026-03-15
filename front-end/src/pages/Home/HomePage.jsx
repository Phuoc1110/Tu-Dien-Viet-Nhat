import React, { useContext, useMemo, useState } from "react";
import "./HomePage.css";
import { useHistory } from "react-router-dom/cjs/react-router-dom.min";
import { UserContext } from "../../Context/UserProvider";

const HomePage = () => {
	const { user } = useContext(UserContext);
	const history = useHistory();
	const [searchInput, setSearchInput] = useState("");

	const isAuthenticated = !!user?.isAuthenticated;
	const displayName = user?.account?.username || user?.account?.fullName || "bạn";

	const quickFeatures = useMemo(
		() => [
			{
				title: "Tra từ vựng",
				description: "Tìm theo Kanji, Hiragana, Katakana hoặc Romaji.",
				tag: "Word",
			},
			{
				title: "Tra Kanji",
				description: "Xem Onyomi, Kunyomi, bộ thủ và số nét.",
				tag: "Kanji",
			},
			{
				title: "Ngữ pháp JLPT",
				description: "Ôn mẫu ngữ pháp theo cấp độ N5 đến N1.",
				tag: "Grammar",
			},
			{
				title: "Sổ tay học tập",
				description: "Lưu từ, Kanji và ngữ pháp để ôn mỗi ngày.",
				tag: "Notebook",
			},
		],
		[]
	);

	const popularSamples = useMemo(
		() => [
			{ jp: "食べる", reading: "たべる", vi: "ăn" },
			{ jp: "勉強", reading: "べんきょう", vi: "học tập" },
			{ jp: "大丈夫", reading: "だいじょうぶ", vi: "ổn, không sao" },
			{ jp: "一緒に", reading: "いっしょに", vi: "cùng nhau" },
		],
		[]
	);

	const handleSearch = (event) => {
		event.preventDefault();
		if (!searchInput.trim()) return;

		if (!isAuthenticated) {
			history.push("/login");
			return;
		}

		history.push(`/search?keyword=${encodeURIComponent(searchInput.trim())}`);
	};

	const handleOpenProfile = () => {
		const currentUserId = user?.account?.id;
		if (!currentUserId) {
			history.push("/login");
			return;
		}

		history.push(`/profile/${currentUserId}`);
	};

	return (
		<div className="dictionary-home">
			<div className="home-bg-glow glow-1" />
			<div className="home-bg-glow glow-2" />
			<section className="dictionary-hero">
				<div className="hero-content">
					<span className="hero-badge">日本語 Dictionary</span>
					<h1 className="hero-title">
						{isAuthenticated
							? `Xin chào ${displayName}, hôm nay học gì nào?`
							: "Tra cứu tiếng Nhật nhanh, rõ và dễ học mỗi ngày"}
					</h1>
					<p className="hero-description">
						Tra từ vựng, Kanji, ngữ pháp và lưu lại để ôn tập theo tiến độ của bạn.
					</p>

					<form className="hero-search" onSubmit={handleSearch}>
						<input
							type="text"
							value={searchInput}
							onChange={(event) => setSearchInput(event.target.value)}
							placeholder="Nhập từ, Kanji, Hiragana hoặc Romaji..."
						/>
						<button type="submit">Tra cứu</button>
					</form>

					<div className="hero-search-hints">
						<button type="button" onClick={() => setSearchInput("ありがとう")}>
							ありがとう
						</button>
						<button type="button" onClick={() => setSearchInput("学生")}>
							学生
						</button>
						<button type="button" onClick={() => setSearchInput("N5 grammar")}>
							N5 grammar
						</button>
					</div>

					<div className="hero-actions">
						{isAuthenticated ? (
							<button type="button" onClick={handleOpenProfile}>Mở hồ sơ học tập</button>
						) : (
							<>
								<button type="button" onClick={() => history.push("/login")}>Đăng nhập</button>
								<button type="button" className="secondary" onClick={() => history.push("/register")}>
									Tạo tài khoản
								</button>
							</>
						)}
					</div>

					<p className="hero-footnote">
						{isAuthenticated
							? "Mẹo: dùng từ khóa ngắn để ra kết quả chính xác hơn."
							: "Đăng nhập để lưu từ, đồng bộ tiến trình và ôn tập hằng ngày."}
					</p>
				</div>

				<div className="hero-stats">
					<div>
						<strong>50K+</strong>
						<span>Từ vựng mở rộng</span>
					</div>
					<div>
						<strong>2K+</strong>
						<span>Kanji thông dụng</span>
					</div>
					<div>
						<strong>N5 → N1</strong>
						<span>Ngữ pháp theo cấp</span>
					</div>
				</div>
			</section>

			<section className="dictionary-section">
				<div className="section-header">
					<h2>Công cụ học nhanh</h2>
					<p>Các mục chính bạn sẽ dùng hằng ngày trong từ điển.</p>
				</div>
				<div className="feature-grid">
					{quickFeatures.map((feature) => (
						<article key={feature.title} className="feature-card">
							<span className="feature-tag">{feature.tag}</span>
							<h3>{feature.title}</h3>
							<p>{feature.description}</p>
							<button type="button" className="feature-link">
								Khám phá
							</button>
						</article>
					))}
				</div>
			</section>

			<section className="dictionary-section">
				<div className="section-header">
					<h2>Từ phổ biến hôm nay</h2>
					<p>Gợi ý nhỏ để bắt đầu học ngay trong 5 phút.</p>
				</div>
				<div className="sample-grid">
					{popularSamples.map((item) => (
						<div className="sample-card" key={item.jp}>
							<h3>{item.jp}</h3>
							<p>{item.reading}</p>
							<span>{item.vi}</span>
						</div>
					))}
				</div>
			</section>
		</div>
	);
};

export default HomePage;
