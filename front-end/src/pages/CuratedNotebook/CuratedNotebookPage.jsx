import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useHistory } from "react-router-dom";
import { Eye, Filter, Search } from "lucide-react";
import { getCuratedNotebookCollections } from "../../services/notebookService";
import "./CuratedNotebookPage.css";

const PAGE_SIZE = 16;

const CuratedNotebookPage = () => {
	const history = useHistory();
	const [loading, setLoading] = useState(true);
	const [curatedNotebooks, setCuratedNotebooks] = useState([]);
	const [filteredNotebooks, setFilteredNotebooks] = useState([]);
	const [searchKeyword, setSearchKeyword] = useState("");
	const [message, setMessage] = useState("");
	const [currentPage, setCurrentPage] = useState(1);

	const loadCurated = useCallback(async () => {
		setLoading(true);
		const res = await getCuratedNotebookCollections(40);
		if (res && res.errCode === 0) {
			const notebooks = Array.isArray(res.curatedNotebooks) ? res.curatedNotebooks : [];
			setCuratedNotebooks(notebooks);
			setFilteredNotebooks(notebooks);
			setMessage("");
			setCurrentPage(1);
		} else if (res?.errCode === -2) {
			history.push("/login");
			return;
		} else {
			setMessage(res?.errMessage || "Không tải được bộ sổ tay biên soạn.");
		}
		setLoading(false);
	}, [history]);

	useEffect(() => {
		loadCurated();
	}, [loadCurated]);

	useEffect(() => {
		const keyword = searchKeyword.trim().toLowerCase();
		if (!keyword) {
			setFilteredNotebooks(curatedNotebooks);
			return;
		}
		const filtered = curatedNotebooks.filter((notebook) => {
			const name = String(notebook.name || "").toLowerCase();
			const ownerName = String(notebook.owner || "").toLowerCase();
			const meta = String(notebook.meta || "").toLowerCase();
			return name.includes(keyword) || ownerName.includes(keyword) || meta.includes(keyword);
		});
		setFilteredNotebooks(filtered);
	}, [searchKeyword, curatedNotebooks]);

	useEffect(() => {
		setCurrentPage(1);
	}, [searchKeyword, curatedNotebooks]);

	const totalPages = useMemo(() => {
		const total = Math.ceil(filteredNotebooks.length / PAGE_SIZE);
		return Math.max(total, 1);
	}, [filteredNotebooks.length]);

	const currentPageSafe = Math.min(currentPage, totalPages);

	useEffect(() => {
		setCurrentPage((page) => Math.min(page, totalPages));
	}, [totalPages]);

	const pagedNotebooks = useMemo(() => {
		const startIndex = (currentPageSafe - 1) * PAGE_SIZE;
		return filteredNotebooks.slice(startIndex, startIndex + PAGE_SIZE);
	}, [filteredNotebooks, currentPageSafe]);

	const paginationSummary = useMemo(() => {
		if (!filteredNotebooks.length) {
			return { start: 0, end: 0, total: 0 };
		}
		const start = (currentPageSafe - 1) * PAGE_SIZE + 1;
		const end = Math.min(currentPageSafe * PAGE_SIZE, filteredNotebooks.length);
		return { start, end, total: filteredNotebooks.length };
	}, [filteredNotebooks.length, currentPageSafe]);

	const gotoFirstPage = useCallback(() => setCurrentPage(1), []);
	const gotoPreviousPage = useCallback(() => setCurrentPage((page) => Math.max(1, page - 1)), []);
	const gotoNextPage = useCallback(
		() => setCurrentPage((page) => Math.min(totalPages, page + 1)),
		[totalPages]
	);
	const gotoLastPage = useCallback(() => setCurrentPage(totalPages), [totalPages]);

	return (
		<div className="curated-notebook-page">
			<div className="curated-notebook-shell">
				<div className="curated-breadcrumb">
					<button type="button" className="breadcrumb-link-btn" onClick={() => history.push("/notebook")}>
						Từ của tôi
					</button>
					<span>/</span>
					<span>Bộ sổ tay biên soạn</span>
				</div>

				<div className="curated-header">
					<h1>Bộ sổ tay biên soạn</h1>
				</div>

				<div className="curated-tools">
					<div className="search-box">
						<Search size={18} />
						<input
							type="text"
							placeholder="Tìm kiếm bộ sổ tay"
							value={searchKeyword}
							onChange={(event) => setSearchKeyword(event.target.value)}
						/>
						<button type="button" className="tiny-btn">
							<Filter size={16} />
						</button>
					</div>
				</div>

				{message && <div className="curated-message">{message}</div>}

				<div className="curated-list-body">
					{loading && <div className="curated-loading">Đang tải bộ sổ tay biên soạn...</div>}

					{!loading && filteredNotebooks.length === 0 && (
						<div className="curated-empty">Chưa có bộ sổ tay biên soạn nào.</div>
					)}

					{!loading && filteredNotebooks.length > 0 && (
						<>
							<div className="curated-grid">
								{pagedNotebooks.map((notebook, idx) => {
									const colorPalette = [
										"#8e44ad",
										"#c0392b",
										"#2b8fd6",
										"#f0c040",
										"#27ae60",
										"#f39c12",
									];
									const accent = colorPalette[idx % colorPalette.length];
									const createdAt = notebook.createdAt ? new Date(notebook.createdAt) : null;
									const isNew = createdAt
										? (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24) <= 7
										: false;
									const reviewed = Number(
										notebook.rememberedCount ??
										notebook.reviewedCount ??
										0
									);
									const total = notebook.itemsCount || 0;
									const views = Number(notebook.views ?? total);
									return (
										<button
											type="button"
											key={notebook.id}
											className="premium-item-card bento-tile"
											onClick={() => history.push(`/notebook/${notebook.id}`, { fromCurated: true })}
											style={{ ["--card-accent"]: accent }}
										>
											<div className="card-top">
												<div className="card-icon" style={{ background: accent + "22" }}>
													{notebook.icon || "🗂️"}
												</div>
												{isNew && <div className="badge-new">Mới</div>}
											</div>
											<h3>{notebook.name}</h3>
											<div className="card-meta-inline">
												<span>{notebook.meta || "Chưa có mô tả"}</span>
											</div>
											<div className="card-meta-row compact">
												<span>{notebook.owner || "Ban quan tri"}</span>
											</div>
											<div className="card-progress">
												<div className="progress-bar">
													<div
														className="progress-fill"
														style={{
															width: `${Math.round((reviewed / Math.max(total, 1)) * 100)}%`,
														}}
													/>
												</div>
												<div className="progress-label">Đã ôn {reviewed}/{total} từ</div>
											</div>
										</button>
									);
								})}
							</div>

							{totalPages > 1 && (
								<div className="curated-pagination">
									<div className="curated-pagination-controls">
										<button
											type="button"
											className="curated-page-btn"
											onClick={gotoFirstPage}
											disabled={currentPageSafe === 1}
										>
											&laquo;
										</button>
										<button
											type="button"
											className="curated-page-btn"
											onClick={gotoPreviousPage}
											disabled={currentPageSafe === 1}
										>
											&lsaquo;
										</button>
										<span className="curated-page-number">
											{currentPageSafe}/{totalPages}
										</span>
										<button
											type="button"
											className="curated-page-btn"
											onClick={gotoNextPage}
											disabled={currentPageSafe >= totalPages}
										>
											&rsaquo;
										</button>
										<button
											type="button"
											className="curated-page-btn"
											onClick={gotoLastPage}
											disabled={currentPageSafe >= totalPages}
										>
											&raquo;
										</button>
									</div>
									<div className="curated-pagination-meta">
										<span>
											Hiển thị {paginationSummary.start}-{paginationSummary.end} / {paginationSummary.total}
										</span>
									</div>
								</div>
							)}
						</>
					)}
				</div>
			</div>
		</div>
	);
};

export default CuratedNotebookPage;
