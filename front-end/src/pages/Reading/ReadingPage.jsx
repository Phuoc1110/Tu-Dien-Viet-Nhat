import React, { useEffect, useMemo, useState } from "react";
import { useHistory } from "react-router-dom";
import { BookOpenCheck, Clock3, RefreshCcw, Search } from "lucide-react";
import { getReadingPassages } from "../../services/readingService";
import "./ReadingPage.css";

const LEVEL_OPTIONS = ["all", "N5", "N4", "N3", "N2", "N1", "mixed"];

const ReadingPage = () => {
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
		<div className="jplt-page">
			<section className="jplt-hero">
				<div className="jplt-hero-copy">
					<div className="jplt-kicker">
						<BookOpenCheck size={16} />
						<span>Bai doc</span>
					</div>
					<h1>Thu vien bai doc tieng Nhat</h1>
					<p>
						Loc theo cap do va tu khoa de tim bai doc phu hop. Trang nay chi hien thi
						danh sach bai doc, chua gom chuc nang tao moi.
					</p>
					<div className="reading-search-wrap">
						<Search size={16} />
						<input
							type="text"
							placeholder="Tim theo tieu de, chu de..."
							value={query}
							onChange={(event) => setQuery(event.target.value)}
						/>
					</div>
				</div>
				<div className="jplt-hero-card">
					<h2>Thong ke</h2>
					<p>Tong bai doc: <strong>{total}</strong></p>
					<div className="reading-level-chips">
						{LEVEL_OPTIONS.map((level) => (
							<button
								key={level}
								type="button"
								className={activeLevel === level ? "active" : ""}
								onClick={() => setActiveLevel(level)}
							>
								{level === "all" ? "Tat ca" : level}
							</button>
						))}
					</div>
					<button type="button" className="reload-btn" onClick={() => window.location.reload()}>
						<RefreshCcw size={15} /> Lam moi
					</button>
				</div>
			</section>

			<section className="jplt-grid">
				{loading && <div className="reading-empty">Dang tai bai doc...</div>}
				{!loading && error && <div className="reading-empty error">{error}</div>}
				{!loading && !error && !items.length && (
					<div className="reading-empty">Chua co bai doc phu hop.</div>
				)}
				{!loading &&
					!error &&
					items.map((item) => (
						<article 
							className="jplt-card" 
							key={item.id}
							onClick={() => history.push(`/reading/${item.id}`)}
							style={{ cursor: "pointer" }}
						>
							<div className="jplt-card-top">
								<div className="jplt-card-icon">
									<BookOpenCheck size={20} />
								</div>
								<span>{item.level || "mixed"}</span>
							</div>
							<h3>{item.title}</h3>
							<p>{item.summary || "Khong co mo ta ngan."}</p>
							<div className="reading-meta-row">
								<span>{item.topic || "tong hop"}</span>
								<span><Clock3 size={14} /> {item.estimatedMinutes || 5} phut</span>
							</div>
						</article>
					))}
			</section>
		</div>
	);
};

export default ReadingPage;
