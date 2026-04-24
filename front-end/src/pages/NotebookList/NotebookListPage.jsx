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

const NotebookListPage = () => {
	const history = useHistory();
	const [loading, setLoading] = useState(true);
	const [overview, setOverview] = useState({ myNotebooks: [] });
	const [pageMessage, setPageMessage] = useState("");
	const [searchValue, setSearchValue] = useState("");
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
	const [createNotebookName, setCreateNotebookName] = useState("");
	const [createLoading, setCreateLoading] = useState(false);

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

				<section className="list-hero">
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
								<button type="button" className="tiny-btn"><Filter size={16} /></button>
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
						<div className="list-stat-card">
							<span>Tổng sổ tay</span>
							<strong>{overview.myNotebooks.length}</strong>
						</div>
						<div className="list-stat-card">
							<span>Sổ đang hiển thị</span>
							<strong>{myNotebooks.length}</strong>
						</div>
					</div>
				</section>

				{pageMessage && <div className="notebook-message">{pageMessage}</div>}

				<section className="section-card">
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

						{myNotebooks.map((item) => (
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
				</section>
			</div>
		</div>
	);
};

export default NotebookListPage;
