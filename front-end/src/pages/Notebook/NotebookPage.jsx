import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useHistory } from "react-router-dom";
import { Eye, PlusCircle, X } from "lucide-react";
import { createNotebook, getNotebookOverview } from "../../services/notebookService";
import "./NotebookPage.css";

const premiumSeed = [
	{ id: "p-1", name: "Từ vựng trung thu", meta: "30 từ", owner: "Mazii Customer Support", views: 3297 },
	{ id: "p-2", name: "50 bài Minna no Nihongo - N5", meta: "2037 từ / 50 bài", owner: "Mazii Customer Support", views: 107 },
	{ id: "p-3", name: "50 bài Minna no Nihongo", meta: "2052 từ / 50 bài", owner: "Mazii Customer Support", views: 101 },
	{ id: "p-4", name: "Từ vựng tiếng nhật chuyên ngành", meta: "85 từ / 3 bài", owner: "Mazii Customer Support", views: 14 },
	{ id: "p-5", name: "Từ vựng tiếng nhật chuyên ngành y", meta: "81 từ / 2 bài", owner: "Mazii Customer Support", views: 4 },
	{ id: "p-6", name: "Mimi Kara Oboeru N3", meta: "875 từ / 12 bài", owner: "Mazii Customer Support", views: 3 },
	{ id: "p-7", name: "Từ vựng tiếng nhật chuyên ngành IT", meta: "66 từ / 3 bài", owner: "Mazii Customer Support", views: 2 },
	{ id: "p-8", name: "Ngữ pháp JLPT N2", meta: "74 từ / 4 bài", owner: "Mazii Customer Support", views: 1 },
];

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

const pseudoViews = (id) => {
	const text = String(id || "0");
	let total = 0;
	for (let i = 0; i < text.length; i += 1) {
		total += text.charCodeAt(i);
	}
	return 12000 + total * 7;
};

const NotebookPage = () => {
	const history = useHistory();
	const [loading, setLoading] = useState(true);
	const [overview, setOverview] = useState({ myNotebooks: [], discoverNotebooks: [] });
	const [pageMessage, setPageMessage] = useState("");
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
	const [createNotebookName, setCreateNotebookName] = useState("");
	const [createLoading, setCreateLoading] = useState(false);

	const loadOverview = useCallback(async () => {
		setLoading(true);
		const res = await getNotebookOverview(8);
		if (res && res.errCode === 0) {
			setOverview({
				myNotebooks: Array.isArray(res.myNotebooks) ? res.myNotebooks : [],
				discoverNotebooks: Array.isArray(res.discoverNotebooks) ? res.discoverNotebooks : [],
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
		} else if (created?.errCode === -2) {
			history.push("/login");
			return;
		} else {
			setPageMessage(created?.errMessage || "Không tạo được sổ tay.");
		}
		setCreateLoading(false);
	};

	const myNotebooks = useMemo(() => {
		return [...overview.myNotebooks]
			.sort((a, b) => (b.itemsCount || 0) - (a.itemsCount || 0))
			.slice(0, 5);
	}, [overview.myNotebooks]);
	const discoverNotebooks = useMemo(
		() => overview.discoverNotebooks.slice(0, 8),
		[overview.discoverNotebooks]
	);

	return (
		<div className="notebook-page overview-only">
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

			{pageMessage && <div className="notebook-message">{pageMessage}</div>}

			<section className="section-card">
				<div className="section-title-row">
					<h2>Sổ tay</h2>
					<button
						type="button"
						className="view-more-btn"
						onClick={() => history.push("/notebook/list")}
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

			<section className="section-card">
				<div className="section-title-row">
					<h2>Khám phá</h2>
					<button type="button" className="view-more-btn">Xem thêm</button>
				</div>
				<div className="cards-grid discover-grid">
					{discoverNotebooks.map((item) => (
						<button
							type="button"
							key={item.id}
							className="discover-item-card"
							onClick={() => history.push(`/notebook/${item.id}`)}
						>
							<h3>{item.name}</h3>
							<p>({item.itemsCount || 0} từ)</p>
							<div className="card-meta-row">
								<span>{item.owner?.username || "Ẩn danh"}</span>
								{/* <span className="views"><Eye size={14} /> {pseudoViews(item.id)}</span> */}
							</div>
						</button>
					))}

					{!loading && discoverNotebooks.length === 0 && (
						<div className="empty-card">Chưa có sổ tay khám phá.</div>
					)}
				</div>
			</section>

			<section className="section-card premium-section">
				<div className="section-title-row">
					<h2>Prenium</h2>
					<button type="button" className="view-more-btn">Xem thêm</button>
				</div>
				<div className="cards-grid premium-grid">
					{premiumSeed.map((item) => (
						<div key={item.id} className="premium-item-card">
							<h3>{item.name}</h3>
							<p>({item.meta})</p>
							<div className="card-meta-row">
								<span>{item.owner}</span>
								<span className="views"><Eye size={14} /> {item.views}</span>
							</div>
						</div>
					))}
				</div>
			</section>
		</div>
	);
};

export default NotebookPage;
