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
	Search,
} from "lucide-react";
import { getReadingPassages } from "../../../services/readingService";
import "./ReadingListPage.css";

const LEVEL_OPTIONS = ["all", "N5", "N4", "N3", "N2", "N1"];
const ITEMS_PER_PAGE = 12;

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
			return "Đã đọc";
		case "in_progress":
			return "Đang đọc";
		case "not_started":
			return "Chưa đọc";
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
	const [currentPage, setCurrentPage] = useState(1);
	const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));

	const params = useMemo(() => {
		return {
			q: query.trim() || undefined,
			level: activeLevel === "all" ? undefined : activeLevel,
			limit: ITEMS_PER_PAGE,
			offset: (currentPage - 1) * ITEMS_PER_PAGE,
		};
	}, [query, activeLevel, currentPage]);

	useEffect(() => {
		setCurrentPage(1);
	}, [query, activeLevel]);

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

			const nextTotal = Number(res?.total) || 0;
			const nextPages = Math.max(1, Math.ceil(nextTotal / ITEMS_PER_PAGE));
			if (currentPage > nextPages) {
				setCurrentPage(nextPages);
			}

			setLoading(false);
		};

		loadData();

		return () => {
			cancelled = true;
		};
	}, [params, history, currentPage]);

	return (
		<div className="reading-list-page">
			<div className="reading-list-shell">
				<section className="reading-hero glass-panel">
					<div className="reading-hero-copy">
						<div className="reading-hero-kicker">
							<BookText size={16} />
							<span>Không gian đọc tiếng Nhật</span>
						</div>
						<h1>Đọc tiếng Nhật một cách hiệu quả với theo dõi tiến độ và phân tích.</h1>
						<p>
							Tìm kiếm bài đọc theo trình độ, chủ đề hoặc tiêu đề, sau đó mở để xem text gốc, bản dịch,
							tiến độ học tập và phân tích chi tiết.
						</p>

						<div className="reading-hero-search">
							<label htmlFor="reading-search">
								<Search size={16} />
							</label>
							<input
								id="reading-search"
								type="text"
								placeholder="Tìm kiếm theo tiêu đề, chủ đề hoặc tóm tắt"
								value={query}
								onChange={(event) => {
									setQuery(event.target.value);
									setCurrentPage(1);
								}}
							/>
						</div>

						<div className="reading-hero-pills">
							{LEVEL_OPTIONS.map((level) => (
								<button
									key={level}
									type="button"
									className={activeLevel === level ? "is-active" : ""}
									onClick={() => {
										setActiveLevel(level);
										setCurrentPage(1);
									}}
								>
									{level === "all" ? "Tất cả" : level}
								</button>
							))}
						</div>
					</div>

					<div className="reading-hero-side">
						<div className="reading-hero-stat">
							<span>Tổng bài đọc</span>
							<strong>{total}</strong>
						</div>
						<div className="reading-hero-stat">
							<span>Đang hiển thị</span>
							<strong>{items.length}</strong>
						</div>
						<div className="reading-hero-stat is-accent">
							<span>Hành động tiếp theo</span>
							<strong>Tạo bài đọc mới</strong>
							<button type="button" onClick={() => history.push("/reading/create") }>
								Mở trình soạn <ArrowRight size={14} />
							</button>
						</div>
					</div>
				</section>

				<section className="reading-toolbar glass-panel">
					<div className="reading-toolbar-title">
						<Filter size={14} />
						<span>Bộ lọc</span>
					</div>
					<div className="reading-toolbar-summary">
						<span>{activeLevel === "all" ? "Toàn bộ trình độ JLPT" : `Trình độ ${activeLevel}`}</span>
						<span>{query.trim() ? `Tìm kiếm: ${query.trim()}` : "Không có bộ lọc từ khóa"}</span>
					</div>
				</section>

				{error && <div className="reading-alert is-error glass-panel">{error}</div>}

				<section className="reading-grid-wrap">
					{loading && <div className="reading-state-box glass-panel">Đang tải thư viện đọc...</div>}
					{!loading && !error && !items.length && (
						<div className="reading-empty glass-panel">
							<div className="reading-empty-icon">
								<BookOpenCheck size={24} />
							</div>
							<h2>Không tìm thấy bài đọc</h2>
							<p>Thử một trình độ hoặc từ khóa khác, hoặc tạo một bài đọc mới từ đầu.</p>
							<button type="button" className="reading-primary-btn" onClick={() => history.push("/reading/create") }>
								<PlusCircle size={15} />
								<span>Tạo bài đọc</span>
							</button>
						</div>
					)}

					{!loading && !error && items.length > 0 && (
						<div className="reading-card-grid">
							{items.map((item) => {
								const statusLabel = getStatusLabel(item?.myProgress?.status);

								return (
									<button
										type="button"
										key={item.id}
										className="reading-card glass-panel"
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
											<span className="reading-card-label">Gốc</span>
											<p>{preview(item.content, 110) || "Chưa có text gốc."}</p>
										</div>
										<div className="reading-card-excerpt is-translation">
											<span className="reading-card-label">Dịch</span>
											<p>{preview(item.translation || item.summary, 100) || "Chưa có bản dịch."}</p>
										</div>

										<div className="reading-card-meta">
											<span>
												<Clock3 size={14} />
												{item.estimatedMinutes || 5} min
											</span>
											<span>
												<Languages size={14} />
												{item.topic || "Chung"}
											</span>
										</div>

										<div className="reading-card-footer">
											<span>{item.author?.username || "Cộng đồng"}</span>
											<ArrowRight size={16} />
										</div>
									</button>
								);
							})}
						</div>
					)}

					{!loading && !error && totalPages > 1 && (
						<div className="reading-pagination glass-panel">
							<button
								type="button"
								className="reading-page-btn"
								onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
								disabled={currentPage === 1}
							>
								Trang trước
							</button>
							<span className="reading-page-indicator">
								Trang {currentPage}/{totalPages}
							</span>
							<button
								type="button"
								className="reading-page-btn"
								onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
								disabled={currentPage === totalPages}
							>
								Trang sau
							</button>
						</div>
					)}
				</section>
			</div>
		</div>
	);
};

export default ReadingListPage;