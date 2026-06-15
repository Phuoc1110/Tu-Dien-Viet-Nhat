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
	const [searchTerm, setSearchTerm] = useState("");
	const [activeFilter, setActiveFilter] = useState("All");

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

			<section className="notebook-hero">
				<div className="notebook-hero-main">
					<p className="hero-kicker">Notebook Workspace</p>
					<h1>Quản lý sổ tay học tập theo cách trực quan hơn</h1>
					<p className="hero-subtitle">
						Tạo sổ mới, theo dõi sổ của bạn, khám phá nội dung cộng đồng và học theo bộ sổ tay
						trong cùng một không gian thanh tịnh.
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
					<div className="stats-bar">
						<div className="stat">
							<div className="stat-ico">📚</div>
							<div className="stat-value">{overview.myNotebooks.length}</div>
							<div className="stat-label">Sổ tay</div>
						</div>
						<div className="stat">
							<div className="stat-ico">📝</div>
							<div className="stat-value">{overview.myNotebooks.reduce((s, n) => s + (n.itemsCount || 0), 0)}</div>
							<div className="stat-label">Tổng từ đã lưu</div>
						</div>
						<div className="stat">
							<div className="stat-ico">🎯</div>
							<div className="stat-value">
								{overview.myNotebooks.reduce((s, n) => s + (n.rememberedCount || 0), 0)}
							</div>
							<div className="stat-label">Từ đã thuộc</div>
						</div>
						<div className="stat">
							<div className="stat-ico">📈</div>
							<div className="stat-value">
								{(() => {
									const total = overview.myNotebooks.reduce((s, n) => s + (n.itemsCount || 0), 0);
									const rem = overview.myNotebooks.reduce((s, n) => s + (n.rememberedCount || 0), 0);
									return total > 0 ? Math.round((rem / total) * 100) : 0;
								})()}%
							</div>
							<div className="stat-label">Tiến độ</div>
						</div>
					</div>
				</div>
			</section>

			<div className="page-content-wrap">
				<section className="section-card">
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
					<div className="cards-grid">
						<button
							type="button"
							className="create-notebook-card"
							onClick={() => setIsCreateModalOpen(true)}
						>
							<PlusCircle size={24} />
							<span>Tạo sổ tay mới</span>
						</button>
						{myNotebooks.map((item, idx) => {
							const colorPalette = ["var(--da-accent-gold)", "var(--da-accent-red)", "var(--da-accent-blue)"];
							const accent = colorPalette[idx % colorPalette.length];
							const createdAt = item.createdAt ? new Date(item.createdAt) : null;
							const isNew = createdAt ? (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24) <= 7 : false;
							const reviewed = Number(item.rememberedCount ?? item.reviewedCount ?? 0);
							const total = item.itemsCount || 0;
							return (
								<button
									type="button"
									key={item.id}
									className="notebook-item-card"
									onClick={() => history.push(`/notebook/${item.id}`)}
									style={{ ["--card-accent"]: accent }}
								>
									<div className="card-top">
										<div className="card-icon">{item.icon || "🗒️"}</div>
										{isNew && <div className="badge-new">Mới</div>}
									</div>
									<h3>{item.name}</h3>
									<div className="card-meta-inline">
										<span>({total} từ)</span>
										<span>• {item.createdAt ? `${formatDate(item.createdAt)}` : item.owner?.username || "Ẩn danh"}</span>
									</div>
									<div className="card-progress">
										<div className="progress-bar">
											<div className="progress-fill" style={{ width: `${Math.round((reviewed / Math.max(total, 1)) * 100)}%` }} />
										</div>
										<div className="progress-label">Đã ôn {reviewed}/{total} từ</div>
									</div>
								</button>
							);
						})}

						{!loading && myNotebooks.length === 0 && (
							<div className="empty-card">Bạn chưa có sổ tay nào.</div>
						)}
					</div>
				</section>

				<section className="section-card">
					<div className="section-title-row">
						<h2>Khám phá cộng đồng</h2>
						<button type="button" className="view-more-btn" onClick={() => history.push("/notebook/explore")}>Xem thêm</button>
					</div>
					<div className="cards-grid">
						{discoverNotebooks.map((item, idx) => {
							const colorPalette = ["var(--da-accent-gold)", "var(--da-accent-red)", "var(--da-accent-blue)"];
							const accent = colorPalette[idx % colorPalette.length];
							const createdAt = item.createdAt ? new Date(item.createdAt) : null;
							const isNew = createdAt ? (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24) <= 7 : false;
							const reviewed = Number(item.rememberedCount ?? item.reviewedCount ?? 0);
							const total = item.itemsCount || 0;
							return (
								<button
									type="button"
									key={item.id}
									className="discover-item-card"
									onClick={() => history.push(`/notebook/${item.id}`, { fromExplore: true })}
									style={{ ["--card-accent"]: accent }}
								>
									<div className="card-top">
										<div className="card-icon">{item.icon || "🌸"}</div>
										{isNew && <div className="badge-new">Mới</div>}
									</div>
									<h3>{item.name}</h3>
									<div className="card-meta-inline">
										<span>({total} từ)</span>
										<span>• {item.createdAt ? `${formatDate(item.createdAt)}` : item.owner?.username || "Ẩn danh"}</span>
									</div>
									<div className="card-progress">
										<div className="progress-bar">
											<div className="progress-fill" style={{ width: `${Math.round((reviewed / Math.max(total, 1)) * 100)}%` }} />
										</div>
										<div className="progress-label">Đã ôn {reviewed}/{total} từ</div>
									</div>
								</button>
							);
						})}

						{!loading && discoverNotebooks.length === 0 && (
							<div className="empty-card">Chưa có sổ tay khám phá.</div>
						)}
					</div>
				</section>

				<section className="section-card">
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
					<div className="cards-grid">
						{curatedPreview.map((item, idx) => {
							const colorPalette = ["var(--da-accent-blue)", "var(--da-accent-red)", "var(--da-accent-gold)"];
							const accent = colorPalette[idx % colorPalette.length];
							const createdAt = item.createdAt ? new Date(item.createdAt) : null;
							const isNew = createdAt ? (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24) <= 7 : false;
							const reviewed = Number(item.rememberedCount ?? item.reviewedCount ?? 0);
							const total = item.itemsCount || 0;
							return (
								<button
									type="button"
									key={item.id}
									className="premium-item-card"
									onClick={() => history.push(`/notebook/${item.id}`)}
									style={{ ["--card-accent"]: accent }}
								>
									<div className="card-top">
										<div className="card-icon">{item.icon || "🗂️"}</div>
										{isNew && <div className="badge-new">Mới</div>}
									</div>
									<h3>{item.name}</h3>
									<div className="card-meta-inline" style={{ marginBottom: "0" }}>
										<span>{item.meta}</span>
									</div>
									<div className="card-meta-row compact" style={{ marginBottom: "auto" }}>
										<span>{item.owner}</span>
									</div>
									<div className="card-progress">
										<div className="progress-bar">
											<div className="progress-fill" style={{ width: `${Math.round((reviewed / Math.max(total, 1)) * 100)}%` }} />
										</div>
										<div className="progress-label">Đã ôn {reviewed}/{total} từ</div>
									</div>
								</button>
							);
						})}

						{!loading && curatedNotebooks.length === 0 && (
							<div className="empty-card curated-empty-state">
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
			<button type="button" className="fab-create" onClick={() => setIsCreateModalOpen(true)} aria-label="Tạo sổ tay mới">
				<PlusCircle size={28} />
			</button>
		</div>
	);
};

export default NotebookPage;