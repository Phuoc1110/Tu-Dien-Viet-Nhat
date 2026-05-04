import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useHistory } from "react-router-dom";
import { Eye, PlusCircle, X } from "lucide-react";
import {
	createNotebook,
	getCuratedNotebookCollections,
	getNotebookOverview,
} from "../../services/notebookService";
import "./NotebookPage.css";

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

const NotebookPage = () => {
	const history = useHistory();
	const [loading, setLoading] = useState(true);
	const [overview, setOverview] = useState({ myNotebooks: [], discoverNotebooks: [] });
	const [curatedNotebooks, setCuratedNotebooks] = useState([]);
	const [pageMessage, setPageMessage] = useState("");
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
	const [createNotebookName, setCreateNotebookName] = useState("");
	const [createLoading, setCreateLoading] = useState(false);

	const loadOverview = useCallback(async () => {
		setLoading(true);
		const [overviewRes, curatedRes] = await Promise.all([
			getNotebookOverview(8),
			getCuratedNotebookCollections(12),
		]);

		if (overviewRes?.errCode === -2 || curatedRes?.errCode === -2) {
			history.push("/login");
			return;
		}

		if (overviewRes && overviewRes.errCode === 0) {
			setOverview({
				myNotebooks: Array.isArray(overviewRes.myNotebooks) ? overviewRes.myNotebooks : [],
				discoverNotebooks: Array.isArray(overviewRes.discoverNotebooks) ? overviewRes.discoverNotebooks : [],
			});
		} else {
			setOverview({ myNotebooks: [], discoverNotebooks: [] });
		}

		if (curatedRes && curatedRes.errCode === 0) {
			setCuratedNotebooks(Array.isArray(curatedRes.curatedNotebooks) ? curatedRes.curatedNotebooks : []);
		} else {
			setCuratedNotebooks([]);
		}

		if (overviewRes?.errCode === 0 && curatedRes?.errCode === 0) {
			setPageMessage("");
		} else {
			setPageMessage(overviewRes?.errMessage || curatedRes?.errMessage || "Không tải được sổ tay.");
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
			.slice(0, 7);
	}, [overview.myNotebooks]);
	const curatedPreview = useMemo(() => curatedNotebooks.slice(0, 8), [curatedNotebooks]);
	const discoverNotebooks = useMemo(
		() => overview.discoverNotebooks.slice(0, 4),
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

			<section className="notebook-hero bento-surface">
				<div className="notebook-hero-main bento-tile bento-tile-main">
					<p className="hero-kicker">Notebook Workspace</p>
					<h1>Quản lý sổ tay học tập theo cách trực quan hơn</h1>
					<p>
						Tạo sổ mới, theo dõi sổ của bạn, khám phá nội dung cộng đồng và học theo bộ sổ tay
						trong cùng một không gian.
					</p>
					<div className="hero-actions">
						<button type="button" className="hero-primary" onClick={() => setIsCreateModalOpen(true)}>
							Tạo sổ tay mới
						</button>
						<button type="button" className="hero-secondary" onClick={() => history.push("/notebook/explore")}>
							Khám phá ngay
						</button>
					</div>
				</div>
				<div className="notebook-hero-stats">
					<div className="hero-stat-card bento-tile">
						<span>Sổ tay của tôi</span>
						<strong>{overview.myNotebooks.length}</strong>
					</div>
					<div className="hero-stat-card bento-tile">
						<span>Sổ khám phá</span>
						<strong>{overview.discoverNotebooks.length}</strong>
					</div>
					<div className="hero-stat-card bento-tile">
						<span>Bộ biên soạn</span>
						<strong>{curatedNotebooks.length}</strong>
					</div>
				</div>
			</section>

			<section className="section-card bento-surface">
				<div className="section-title-row">
					<h2>Sổ tay của tôi</h2>
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
						className="create-notebook-card bento-tile"
						onClick={() => setIsCreateModalOpen(true)}
					>
						<PlusCircle size={18} />
						<span>Tạo sổ tay mới</span>
					</button>

					{myNotebooks.map((item) => (
						<button type="button" key={item.id} className="notebook-item-card bento-tile" onClick={() => history.push(`/notebook/${item.id}`)}>
							<h3>{item.name}</h3>
							<p>({item.itemsCount || 0} từ)</p>
							<div className="card-meta-date">Ngày tạo: {formatDate(item.createdAt)}</div>
						</button>
					))}

					{!loading && myNotebooks.length === 0 && (
						<div className="empty-card bento-tile">Bạn chưa có sổ tay nào.</div>
					)}
				</div>
			</section>

			<section className="section-card bento-surface">
				<div className="section-title-row">
					<h2>Khám phá cộng đồng</h2>
					<button type="button" className="view-more-btn" onClick={() => history.push("/notebook/explore")}>Xem thêm</button>
				</div>
				<div className="cards-grid discover-grid">
					{discoverNotebooks.map((item) => (
						<button
							type="button"
							key={item.id}
							className="discover-item-card bento-tile"
							onClick={() => history.push(`/notebook/${item.id}`, { fromExplore: true })}
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
						<div className="empty-card bento-tile">Chưa có sổ tay khám phá.</div>
					)}
				</div>
			</section>

			<section className="section-card premium-section bento-surface">
				<div className="section-title-row">
					<h2>Bộ sổ tay biên soạn</h2>
					{curatedNotebooks.length > 8 && (
						<button
							type="button"
							className="view-more-btn"
							onClick={() => history.push("/notebook/curated")}
						>
							Xem thêm
						</button>
					)}
				</div>
				<div className="cards-grid premium-grid">
					{curatedPreview.map((item) => (
						<button
							type="button"
							key={item.id}
							className="premium-item-card bento-tile"
							onClick={() => history.push(`/notebook/${item.id}`)}
						>
							<h3>{item.name}</h3>
							<p>({item.meta})</p>
							<div className="card-meta-row">
								<span>{item.owner}</span>
								<span className="views"><Eye size={14} /> {item.views}</span>
							</div>
						</button>
					))}

					{!loading && curatedNotebooks.length === 0 && (
						<div className="empty-card bento-tile curated-empty-state">
							<div className="empty-illustration" aria-hidden="true">
								<div className="planet"></div>
								<div className="ring"></div>
							</div>
							<div className="empty-content">
								<h3>Không gian biên soạn đang trống</h3>
								<p>Chưa có bộ sổ tay biên soạn nào.</p>
							</div>
						</div>
					)}
				</div>
			</section>
		</div>
	);
};

export default NotebookPage;