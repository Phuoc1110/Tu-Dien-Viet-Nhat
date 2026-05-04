import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useHistory } from "react-router-dom";
import { Filter, PlusCircle, Search, X } from "lucide-react";
import { createNotebook, getNotebookOverview } from "../../services/notebookService";
import "./NotebookListPage.css";

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

// Keep 16 tiles per page including the create-new card.
const PAGE_SIZE = 15;

const NotebookListPage = () => {
	const history = useHistory();
	const [loading, setLoading] = useState(true);
	const [overview, setOverview] = useState({ myNotebooks: [] });
	const [pageMessage, setPageMessage] = useState("");
	const [searchValue, setSearchValue] = useState("");
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
	const [createNotebookName, setCreateNotebookName] = useState("");
	const [createLoading, setCreateLoading] = useState(false);
	const [currentPage, setCurrentPage] = useState(1);

	const loadOverview = useCallback(async () => {
		setLoading(true);
		const res = await getNotebookOverview(40);
		if (res && res.errCode === 0) {
			setOverview({
				myNotebooks: Array.isArray(res.myNotebooks) ? res.myNotebooks : [],
			});
			setPageMessage("");
		} else if (res?.errCode === -2) {
			history.push("/login");
			return;
		} else {
			setPageMessage(res?.errMessage || "Không tải được sổ tay.");
		}
		setLoading(false);
	}, [history]);

	useEffect(() => {
		loadOverview();
	}, [loadOverview]);

	const handleCreateNotebook = async () => {
		const name = createNotebookName.trim();
		if (!name) {
			setPageMessage("Nhập tên sổ tay trước khi tạo.");
			return;
		}

		setCreateLoading(true);
		const created = await createNotebook({ name });
		if (created && created.errCode === 0 && created.notebook) {
			setCreateNotebookName("");
			setIsCreateModalOpen(false);
			setPageMessage("Đã tạo sổ tay mới.");
			await loadOverview();
		} else {
			setPageMessage(created?.errMessage || "Không tạo được sổ tay.");
		}
		setCreateLoading(false);
	};

	const myNotebooks = useMemo(() => {
		const keyword = searchValue.trim().toLowerCase();
		if (!keyword) {
			return overview.myNotebooks;
		}
		return overview.myNotebooks.filter((item) =>
			String(item?.name || "").toLowerCase().includes(keyword)
		);
	}, [overview.myNotebooks, searchValue]);

	useEffect(() => {
		setCurrentPage(1);
	}, [searchValue, overview.myNotebooks]);

	const totalPages = useMemo(() => {
		const total = Math.ceil(myNotebooks.length / PAGE_SIZE);
		return Math.max(total, 1);
	}, [myNotebooks.length]);

	const currentPageSafe = Math.min(currentPage, totalPages);

	useEffect(() => {
		setCurrentPage((page) => Math.min(page, totalPages));
	}, [totalPages]);

	const pagedNotebooks = useMemo(() => {
		const startIndex = (currentPageSafe - 1) * PAGE_SIZE;
		return myNotebooks.slice(startIndex, startIndex + PAGE_SIZE);
	}, [myNotebooks, currentPageSafe]);

	const paginationSummary = useMemo(() => {
		if (!myNotebooks.length) {
			return { start: 0, end: 0, total: 0 };
		}
		const start = (currentPageSafe - 1) * PAGE_SIZE + 1;
		const end = Math.min(currentPageSafe * PAGE_SIZE, myNotebooks.length);
		return { start, end, total: myNotebooks.length };
	}, [myNotebooks.length, currentPageSafe]);

	const gotoFirstPage = useCallback(() => setCurrentPage(1), []);
	const gotoPreviousPage = useCallback(() => setCurrentPage((page) => Math.max(1, page - 1)), []);
	const gotoNextPage = useCallback(
		() => setCurrentPage((page) => Math.min(totalPages, page + 1)),
		[totalPages]
	);
	const gotoLastPage = useCallback(() => setCurrentPage(totalPages), [totalPages]);

	return (
		<div className="notebook-list-page">
			{isCreateModalOpen && (
				<div className="create-modal-overlay" onMouseDown={() => setIsCreateModalOpen(false)}>
					<div className="create-modal" onMouseDown={(event) => event.stopPropagation()}>
						<div className="create-modal-head">
							<h3>Tạo sổ tay mới</h3>
							<button type="button" onClick={() => setIsCreateModalOpen(false)}>
								<X size={18} />
							</button>
						</div>
						<div className="create-modal-body">
							<input
								type="text"
								placeholder="Nhập tên sổ tay"
								value={createNotebookName}
								onChange={(event) => setCreateNotebookName(event.target.value)}
							/>
						</div>
						<div className="create-modal-actions">
							<button type="button" className="btn-cancel" onClick={() => setIsCreateModalOpen(false)}>
								Hủy
							</button>
							<button type="button" className="btn-save" onClick={handleCreateNotebook} disabled={createLoading}>
								{createLoading ? "Đang lưu..." : "Lưu"}
							</button>
						</div>
					</div>
				</div>
			)}

			<div className="notebook-list-shell">
				<div className="breadcrumb-row">
					<button type="button" className="breadcrumb-link-btn" onClick={() => history.push("/notebook")}>Từ của tôi</button>
					<span>/</span>
					<span className="breadcrumb-link-btn current">Danh sách sổ tay</span>
				</div>

				<section className="list-hero bento-surface">
					<div className="list-hero-main">
						<p className="list-kicker">My Learning Collection</p>
						<h1>Tất cả sổ tay của bạn trong một màn hình</h1>
						<p>
							Lọc nhanh theo tên, tạo sổ mới và mở từng bộ từ vựng chỉ với một cú nhấp.
						</p>
						<div className="list-topbar">
							<div className="search-box">
								<Search size={18} />
								<input
									type="text"
									placeholder="Tìm kiếm tên sổ tay"
									value={searchValue}
									onChange={(event) => setSearchValue(event.target.value)}
								/>
								<button type="button" className="tiny-btn" title="Bộ lọc nâng cao"><Filter size={16} /></button>
							</div>
							<button
								type="button"
								className="create-inline-btn"
								onClick={() => setIsCreateModalOpen(true)}
							>
								<PlusCircle size={16} />
								Tạo sổ mới
							</button>
						</div>
					</div>
					<div className="list-hero-stats">
						<div className="list-stat-card bento-tile">
							<span>Tổng sổ tay</span>
							<strong>{overview.myNotebooks.length}</strong>
						</div>
						<div className="list-stat-card bento-tile">
							<span>Sổ đang hiển thị</span>
							<strong>{myNotebooks.length}</strong>
						</div>
					</div>
				</section>

				{pageMessage && <div className="notebook-message">{pageMessage}</div>}

				<section className="section-card bento-surface">
					<div className="section-title-row">
						<h2>Danh sách sổ tay</h2>
						<button
							type="button"
							className="view-more-btn"
							onClick={() => history.push("/notebook/explore")}
						>
							Xem thêm
						</button>
					</div>
					<div className="cards-grid my-grid">
						<button
							type="button"
							className="create-notebook-card"
							onClick={() => setIsCreateModalOpen(true)}
						>
							<PlusCircle size={18} />
							<span>Tạo sổ tay mới</span>
						</button>

						{pagedNotebooks.map((item) => (
							<button type="button" key={item.id} className="notebook-item-card" onClick={() => history.push(`/notebook/${item.id}`)}>
								<h3>{item.name}</h3>
								<p>({item.itemsCount || 0} từ)</p>
								<div className="card-meta-date">Ngày tạo: {formatDate(item.createdAt)}</div>
							</button>
						))}

						{!loading && myNotebooks.length === 0 && (
							<div className="empty-card">Bạn chưa có sổ tay nào.</div>
						)}
					</div>

					{!loading && myNotebooks.length > 0 && totalPages > 1 && (
						<div className="notebook-list-pagination">
							<div className="notebook-list-pagination-controls">
								<button
									type="button"
									className="notebook-page-btn"
									onClick={gotoFirstPage}
									disabled={currentPageSafe === 1}
								>
									&laquo;
								</button>
								<button
									type="button"
									className="notebook-page-btn"
									onClick={gotoPreviousPage}
									disabled={currentPageSafe === 1}
								>
									&lsaquo;
								</button>
								<span className="notebook-page-number">
									{currentPageSafe}/{totalPages}
								</span>
								<button
									type="button"
									className="notebook-page-btn"
									onClick={gotoNextPage}
									disabled={currentPageSafe >= totalPages}
								>
									&rsaquo;
								</button>
								<button
									type="button"
									className="notebook-page-btn"
									onClick={gotoLastPage}
									disabled={currentPageSafe >= totalPages}
								>
									&raquo;
								</button>
							</div>
							<div className="notebook-list-pagination-meta">
								<span>
									Hiển thị {paginationSummary.start}-{paginationSummary.end} / {paginationSummary.total}
								</span>
							</div>
						</div>
					)}
				</section>
			</div>
		</div>
	);
};

export default NotebookListPage;
