import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useHistory } from "react-router-dom";
import { Search, Filter } from "lucide-react";
import { getNotebookOverview } from "../../services/notebookService";
import "./ExploreNotebookPage.css";

const formatDate = (value) => {
	if (!value) {
		return "-";
	}
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return "-";
	}
	return date.toISOString().slice(0, 10);
};

const PAGE_SIZE = 16;

const ExploreNotebookPage = () => {
	const history = useHistory();
	const [loading, setLoading] = useState(true);
	const [discoverNotebooks, setDiscoverNotebooks] = useState([]);
	const [filteredNotebooks, setFilteredNotebooks] = useState([]);
	const [searchKeyword, setSearchKeyword] = useState("");
	const [message, setMessage] = useState("");
	const [currentPage, setCurrentPage] = useState(1);

	const loadExplore = useCallback(async () => {
		setLoading(true);
		const res = await getNotebookOverview(100);
		if (res && res.errCode === 0) {
			const notebooks = Array.isArray(res.discoverNotebooks) ? res.discoverNotebooks : [];
			setDiscoverNotebooks(notebooks);
			setFilteredNotebooks(notebooks);
			setMessage("");
			setCurrentPage(1);
		} else if (res?.errCode === -2) {
			history.push("/login");
			return;
		} else {
			setMessage(res?.errMessage || "Không tải được danh sách khám phá.");
		}
		setLoading(false);
	}, [history]);

	useEffect(() => {
		loadExplore();
	}, [loadExplore]);

	useEffect(() => {
		const keyword = searchKeyword.trim().toLowerCase();
		if (!keyword) {
			setFilteredNotebooks(discoverNotebooks);
			return;
		}
		const filtered = discoverNotebooks.filter((notebook) => {
			const name = String(notebook.name || "").toLowerCase();
			const ownerName = String(notebook.owner?.username || "").toLowerCase();
			return name.includes(keyword) || ownerName.includes(keyword);
		});
		setFilteredNotebooks(filtered);
	}, [searchKeyword, discoverNotebooks]);

	useEffect(() => {
		setCurrentPage(1);
	}, [searchKeyword, discoverNotebooks]);

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
		<div className="explore-notebook-page">
			<div className="explore-notebook-shell">
				<div className="explore-breadcrumb">
					<button type="button" className="breadcrumb-link-btn" onClick={() => history.push("/notebook")}>
						Từ của tôi
					</button>
					<span>/</span>
					<span>Khám phá</span>
				</div>

				<div className="explore-header">
					<h1>Khám phá Sổ tay</h1>
				</div>

				<div className="explore-tools">
					<div className="search-box">
						<Search size={18} />
						<input
							type="text"
							placeholder="Tìm kiếm sổ tay"
							value={searchKeyword}
							onChange={(event) => setSearchKeyword(event.target.value)}
						/>
						<button type="button" className="tiny-btn">
							<Filter size={16} />
						</button>
					</div>
				</div>

				{message && <div className="explore-message">{message}</div>}

				<div className="explore-list-body">
					{loading && <div className="explore-loading">Đang tải danh sách khám phá...</div>}

					{!loading && filteredNotebooks.length === 0 && (
						<div className="explore-empty">Không có sổ tay khám phá nào.</div>
					)}

					{!loading && filteredNotebooks.length > 0 && (
						<>
							<div className="explore-grid">
								{pagedNotebooks.map((notebook) => (
									<button
										type="button"
										key={notebook.id}
										className="explore-card"
										onClick={() => history.push(`/notebook/${notebook.id}`, { fromExplore: true })}
									>
										<h3>{notebook.name}</h3>
										<p className="card-count">({notebook.itemsCount || 0} từ)</p>
										<div className="card-meta">
											<span className="owner">{notebook.owner?.username || "Ẩn danh"}</span>
											<span className="date">Ngày tạo: {formatDate(notebook.createdAt)}</span>
										</div>
									</button>
								))}
							</div>

							{totalPages > 1 && (
								<div className="explore-pagination">
									<div className="explore-pagination-controls">
										<button
											type="button"
											className="explore-page-btn"
											onClick={gotoFirstPage}
											disabled={currentPageSafe === 1}
										>
											&laquo;
										</button>
										<button
											type="button"
											className="explore-page-btn"
											onClick={gotoPreviousPage}
											disabled={currentPageSafe === 1}
										>
											&lsaquo;
										</button>
										<span className="explore-page-number">
											{currentPageSafe}/{totalPages}
										</span>
										<button
											type="button"
											className="explore-page-btn"
											onClick={gotoNextPage}
											disabled={currentPageSafe >= totalPages}
										>
											&rsaquo;
										</button>
										<button
											type="button"
											className="explore-page-btn"
											onClick={gotoLastPage}
											disabled={currentPageSafe >= totalPages}
										>
											&raquo;
										</button>
									</div>
									<div className="explore-pagination-meta">
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

export default ExploreNotebookPage;
