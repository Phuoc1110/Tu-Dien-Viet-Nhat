import React, { useEffect, useMemo, useState } from "react";
import { useHistory } from "react-router-dom";
import {
	BookOpenCheck,
	BookText,
	Clock3,
	Filter,
	Languages,
	RefreshCcw,
	Search,
	Sparkles,
} from "lucide-react";
import { getReadingPassages } from "../../../services/readingService";
import "./ReadingListPage.css";

const LEVEL_OPTIONS = ["all", "N5", "N4", "N3", "N2", "N1"];

const preview = (text, maxLength = 120) => {
	const value = String(text || "").trim();
	if (!value) {
		return "";
	}
	if (value.length <= maxLength) {
		return value;
	}
	return `${value.slice(0, maxLength).trim()}...`;
};

const ReadingListPage = () => {
	const history = useHistory();
	const [query, setQuery] = useState("");
	const [activeLevel, setActiveLevel] = useState("all");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [items, setItems] = useState([]);
	const [total, setTotal] = useState(0);

	const params = useMemo(() => {
		return {
			q: query.trim() || undefined,
			level: activeLevel === "all" ? undefined : activeLevel,
			limit: 24,
			offset: 0,
		};
	}, [query, activeLevel]);

	useEffect(() => {
		const loadData = async () => {
			setLoading(true);
			const res = await getReadingPassages(params);
			if (res?.errCode === 0) {
				setItems(Array.isArray(res.items) ? res.items : []);
				setTotal(Number(res.total) || 0);
				setError("");
			} else if (res?.errCode === -2) {
				history.push("/login");
				return;
			} else {
				setItems([]);
				setTotal(0);
				setError(res?.errMessage || "Khong tai duoc danh sach bai doc");
			}
			setLoading(false);
		};

		loadData();
	}, [params, history]);

	return (
		<div className="reading-list-page">
			<div className="reading-top-nav glass-panel">
				<div className="reading-brand">
					<Sparkles size={16} />
					<span>Yomu Studio</span>
				</div>
				<div className="reading-nav-links">
					<button type="button" className="is-current">Library</button>
					<button type="button">Progress</button>
					<button type="button">Vocabulary</button>
				</div>
			</div>

			<section className="reading-hero glass-panel">
				<div className="reading-hero-left">
					<div className="reading-list-kicker">
						<BookText size={16} />
						<span>Reading Library</span>
					</div>
					<h1>Thu vien bai doc tieng Nhat hien dai</h1>
					<p>
						Kham pha bai doc theo JLPT, doc nhanh doan goc tieng Nhat va doi chieu ban dich ngay tren tung the.
					</p>
					<div className="reading-search-box">
						<label htmlFor="reading-search">
							<Search size={16} />
						</label>
						<input
							id="reading-search"
							type="text"
							placeholder="Tim theo tieu de, chu de, noi dung..."
							value={query}
							onChange={(event) => setQuery(event.target.value)}
						/>
					</div>
				</div>

				<div className="reading-hero-right">
					<div className="reading-total-row">
						<span>Tong bai doc</span>
						<strong>{total}</strong>
					</div>
					<div className="reading-mini-stat">
						<Clock3 size={16} />
						<span>{items.length} bai dang hien thi</span>
					</div>
					<div className="reading-mini-stat">
						<Languages size={16} />
						<span>Filter linh hoat theo JLPT</span>
					</div>
				</div>
			</section>

			<section className="reading-filter-row glass-panel">
				<div className="reading-filter-title">
					<Filter size={14} />
					<span>Muc do JLPT</span>
				</div>
				<div className="reading-level-pills">
					{LEVEL_OPTIONS.map((level) => (
						<button
							key={level}
							type="button"
							className={activeLevel === level ? "is-active" : ""}
							onClick={() => setActiveLevel(level)}
						>
							{level === "all" ? "Tat ca" : level}
						</button>
					))}
				</div>
				<button
					type="button"
					className="reading-refresh-btn"
					onClick={() => window.location.reload()}
				>
					<RefreshCcw size={15} />
					<span>Lam moi</span>
				</button>
			</section>

			<section className="reading-card-grid">
				{loading && <div className="reading-state-box">Dang tai bai doc...</div>}
				{!loading && error && <div className="reading-state-box is-error">{error}</div>}
				{!loading && !error && !items.length && (
					<div className="reading-state-box">Khong tim thay bai doc phu hop.</div>
				)}
				{!loading &&
					!error &&
					items.map((item) => (
						<article
							className="reading-card glass-panel"
							key={item.id}
							onClick={() => history.push(`/reading/${item.id}`)}
						>
							<div className="reading-card-head">
								<div className="reading-card-icon">
									<BookOpenCheck size={18} />
								</div>
								<span className="reading-level-tag">{item.level}</span>
							</div>

							<h3>{item.title}</h3>

							<div className="reading-card-preview japanese-preview">
								<p>{preview(item.content, 120) || "Chua co noi dung."}</p>
							</div>

							<div className="reading-card-preview translation-preview">
								<p>{preview(item.translation || item.summary, 120) || "Chua co ban dich."}</p>
							</div>

							<div className="reading-card-meta">
								<span className="reading-topic-chip">#{item.topic || "tong-hop"}</span>
								<span className="reading-time-chip">
									<Clock3 size={14} /> {item.estimatedMinutes || 5} phut
								</span>
							</div>
						</article>
					))}
			</section>
		</div>
	);
};

export default ReadingListPage;
