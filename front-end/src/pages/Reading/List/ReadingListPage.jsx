import React, { useEffect, useMemo, useState } from "react";
import { useHistory } from "react-router-dom";
import {
	ArrowRight,
	BookOpenCheck,
	BookText,
	Clock3,
	Filter,
	Languages,
	PlusCircle,
	RefreshCcw,
	Search,
	Sparkles,
} from "lucide-react";
import { getReadingPassages } from "../../../services/readingService";
import "./ReadingListPage.css";

const LEVEL_OPTIONS = ["all", "N5", "N4", "N3", "N2", "N1"];

const preview = (text, maxLength = 150) => {
	const value = String(text || "").trim();
	if (!value) {
		return "";
	}
	if (value.length <= maxLength) {
		return value;
	}
	return `${value.slice(0, maxLength).trim()}...`;
};

const getStatusLabel = (status) => {
	switch (status) {
		case "completed":
			return "Completed";
		case "in_progress":
			return "Reading";
		case "not_started":
			return "Not started";
		default:
			return null;
	}
};

const ReadingListPage = () => {
	const history = useHistory();
	const [query, setQuery] = useState("");
	const [activeLevel, setActiveLevel] = useState("all");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [items, setItems] = useState([]);
	const [total, setTotal] = useState(0);
	const [reloadSeed, setReloadSeed] = useState(0);

	const params = useMemo(() => {
		return {
			q: query.trim() || undefined,
			level: activeLevel === "all" ? undefined : activeLevel,
			limit: 24,
			offset: 0,
		};
	}, [query, activeLevel]);

	const featuredItem = items[0] || null;

	useEffect(() => {
		let cancelled = false;

		const loadData = async () => {
			setLoading(true);
			const res = await getReadingPassages(params);

			if (cancelled) {
				return;
			}

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

		return () => {
			cancelled = true;
		};
	}, [params, history, reloadSeed]);

	return (
		<div className="reading-list-page">
			<div className="reading-list-shell">
				<header className="reading-topbar glass-panel">
					<div className="reading-brand">
						<div className="reading-brand-mark">
							<Sparkles size={16} />
						</div>
						<div>
							<p>Yomu Studio</p>
							<span>Reading catalog</span>
						</div>
					</div>
					<div className="reading-topbar-actions">
						<button type="button" className="reading-secondary-btn" onClick={() => setReloadSeed((value) => value + 1)}>
							<RefreshCcw size={15} />
							<span>Refresh</span>
						</button>
						<button type="button" className="reading-primary-btn" onClick={() => history.push("/reading/create") }>
							<PlusCircle size={15} />
							<span>Create passage</span>
						</button>
					</div>
				</header>

				<section className="reading-hero glass-panel">
					<div className="reading-hero-copy">
						<div className="reading-hero-kicker">
							<BookText size={16} />
							<span>Editorial reading space</span>
						</div>
						<h1>Reading content that feels like a living magazine, not a plain list.</h1>
						<p>
							Search passages by level, topic, or title, then open a piece with clear original text, translation,
							progress tracking, and analysis.
						</p>

						<div className="reading-hero-search">
							<label htmlFor="reading-search">
								<Search size={16} />
							</label>
							<input
								id="reading-search"
								type="text"
								placeholder="Search by title, topic, or summary"
								value={query}
								onChange={(event) => setQuery(event.target.value)}
							/>
						</div>

						<div className="reading-hero-pills">
							{LEVEL_OPTIONS.map((level) => (
								<button
									key={level}
									type="button"
									className={activeLevel === level ? "is-active" : ""}
									onClick={() => setActiveLevel(level)}
								>
									{level === "all" ? "All levels" : level}
								</button>
							))}
						</div>
					</div>

					<div className="reading-hero-side">
						<div className="reading-hero-stat">
							<span>Total passages</span>
							<strong>{total}</strong>
						</div>
						<div className="reading-hero-stat">
							<span>Visible now</span>
							<strong>{items.length}</strong>
						</div>
						<div className="reading-hero-stat is-accent">
							<span>Next action</span>
							<strong>Write a new passage</strong>
							<button type="button" onClick={() => history.push("/reading/create") }>
								Open editor <ArrowRight size={14} />
							</button>
						</div>
					</div>
				</section>

				<section className="reading-toolbar glass-panel">
					<div className="reading-toolbar-title">
						<Filter size={14} />
						<span>Filters</span>
					</div>
					<div className="reading-toolbar-summary">
						<span>{activeLevel === "all" ? "All JLPT levels" : `Level ${activeLevel}`}</span>
						<span>{query.trim() ? `Search: ${query.trim()}` : "No keyword filter"}</span>
					</div>
				</section>

				{error && <div className="reading-alert is-error glass-panel">{error}</div>}

				<section className="reading-grid-wrap">
					{loading && <div className="reading-state-box glass-panel">Loading reading catalog...</div>}
					{!loading && !error && !items.length && (
						<div className="reading-empty glass-panel">
							<div className="reading-empty-icon">
								<BookOpenCheck size={24} />
							</div>
							<h2>No passages found</h2>
							<p>Try a different level or keyword, or create a new passage from scratch.</p>
							<button type="button" className="reading-primary-btn" onClick={() => history.push("/reading/create") }>
								<PlusCircle size={15} />
								<span>Create passage</span>
							</button>
						</div>
					)}

					{!loading && !error && items.length > 0 && (
						<div className="reading-card-grid">
							{items.map((item, index) => {
								const statusLabel = getStatusLabel(item?.myProgress?.status);

								return (
									<button
										type="button"
										key={item.id}
										className={`reading-card glass-panel ${index === 0 ? "is-featured" : ""}`}
										onClick={() => history.push(`/reading/${item.id}`)}
									>
										<div className="reading-card-top">
											<div className="reading-card-icon">
												<BookText size={18} />
											</div>
											<div className="reading-card-badges">
												<span className="reading-level-chip">{item.level || "mixed"}</span>
												{statusLabel && <span className="reading-progress-chip">{statusLabel}</span>}
											</div>
										</div>

										<h3>{item.title}</h3>
										<p className="reading-card-summary">{preview(item.summary || item.translation || item.content)}</p>
										<div className="reading-card-excerpt">
											<span className="reading-card-label">Original</span>
											<p>{preview(item.content, 110) || "No original text yet."}</p>
										</div>
										<div className="reading-card-excerpt is-translation">
											<span className="reading-card-label">Translation</span>
											<p>{preview(item.translation || item.summary, 100) || "No translation yet."}</p>
										</div>

										<div className="reading-card-meta">
											<span>
												<Clock3 size={14} />
												{item.estimatedMinutes || 5} min
											</span>
											<span>
												<Languages size={14} />
												{item.topic || "general"}
											</span>
										</div>

										<div className="reading-card-footer">
											<span>{item.author?.username || "Community"}</span>
											<ArrowRight size={16} />
										</div>
									</button>
								);
							})}
						</div>
					)}
				</section>

				{featuredItem && !loading && !error && (
					<section className="reading-featured glass-panel">
						<div className="reading-featured-copy">
							<p className="reading-section-kicker">Featured passage</p>
							<h2>{featuredItem.title}</h2>
							<p>{preview(featuredItem.summary || featuredItem.translation || featuredItem.content, 220)}</p>
							<div className="reading-featured-actions">
								<button type="button" className="reading-secondary-btn" onClick={() => history.push(`/reading/${featuredItem.id}`)}>
									Open passage
								</button>
								<button type="button" className="reading-primary-btn" onClick={() => history.push("/reading/create") }>
									<PlusCircle size={15} />
									<span>Create your own</span>
								</button>
							</div>
						</div>
						<div className="reading-featured-meta">
							<div className="reading-mini-card">
								<span>Level</span>
								<strong>{featuredItem.level || "mixed"}</strong>
							</div>
							<div className="reading-mini-card">
								<span>Time</span>
								<strong>{featuredItem.estimatedMinutes || 5} min</strong>
							</div>
							<div className="reading-mini-card">
								<span>Topic</span>
								<strong>{featuredItem.topic || "general"}</strong>
							</div>
						</div>
					</section>
				)}
			</div>
		</div>
	);
};

export default ReadingListPage;