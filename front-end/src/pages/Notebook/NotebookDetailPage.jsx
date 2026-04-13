import React, { useContext, useEffect, useMemo, useState } from "react";
import { useHistory, useParams } from "react-router-dom";
import { Edit3, Trash2, Search, Filter, Volume2, PlusCircle, RotateCcw, Download, Play, Shuffle } from "lucide-react";
import { UserContext } from "../../Context/UserProvider";
import {
	deleteNotebook,
	getNotebookDetail,
	updateNotebook,
} from "../../services/notebookService";
import "./NotebookDetailPage.css";

const chunkItems = (items, chunkSize = 2) => {
	const result = [];
	for (let i = 0; i < items.length; i += chunkSize) {
		result.push(items.slice(i, i + chunkSize));
	}
	return result;
};

const NotebookDetailPage = () => {
	const history = useHistory();
	const { id } = useParams();
	const { user } = useContext(UserContext);
	const [loading, setLoading] = useState(true);
	const [notebook, setNotebook] = useState(null);
	const [message, setMessage] = useState("");
	const [searchKeyword, setSearchKeyword] = useState("");
	const [isEditingName, setIsEditingName] = useState(false);
	const [editingName, setEditingName] = useState("");

	const currentUserId = user?.account?.id;
	const isOwner = useMemo(() => {
		if (!notebook || !currentUserId) {
			return false;
		}
		return Number(notebook.userId) === Number(currentUserId);
	}, [notebook, currentUserId]);

	useEffect(() => {
		const load = async () => {
			setLoading(true);
			const res = await getNotebookDetail(id);
			if (res?.errCode === 0 && res.notebook) {
				setNotebook(res.notebook);
				setEditingName(res.notebook.name || "");
				setMessage("");
			} else if (res?.errCode === -2) {
				history.push("/login");
				return;
			} else {
				setMessage(res?.errMessage || "Không tải được sổ tay");
			}
			setLoading(false);
		};

		load();
	}, [history, id]);

	const filteredItems = useMemo(() => {
		const rawItems = notebook?.items || [];
		const keyword = searchKeyword.trim().toLowerCase();
		if (!keyword) {
			return rawItems;
		}
		return rawItems.filter((entry) => {
			const title = String(entry?.item?.title || "").toLowerCase();
			const meaning = String(entry?.item?.meaning || "").toLowerCase();
			return title.includes(keyword) || meaning.includes(keyword);
		});
	}, [notebook?.items, searchKeyword]);

	const twoColumnRows = useMemo(() => chunkItems(filteredItems, 2), [filteredItems]);

	const handleSaveNotebookName = async () => {
		const nextName = editingName.trim();
		if (!nextName) {
			setMessage("Tên sổ tay không được để trống");
			return;
		}
		const res = await updateNotebook(id, { name: nextName });
		if (res?.errCode === 0) {
			setNotebook((prev) => (prev ? { ...prev, name: nextName } : prev));
			setMessage("Đã cập nhật tên sổ tay");
			setIsEditingName(false);
		} else {
			setMessage(res?.errMessage || "Không thể cập nhật tên sổ tay");
		}
	};

	const handleDeleteNotebook = async () => {
		const accepted = window.confirm("Bạn có chắc muốn xóa sổ tay này?");
		if (!accepted) {
			return;
		}

		const res = await deleteNotebook(id);
		if (res?.errCode === 0) {
			history.push("/notebook");
			return;
		}
		setMessage(res?.errMessage || "Không thể xóa sổ tay");
	};

	return (
		<div className="notebook-detail-page">
			<div className="notebook-detail-shell">
				<div className="notebook-detail-breadcrumb">Từ của tôi / Danh sách sổ tay / {notebook?.name || "..."}</div>

				<div className="notebook-detail-main">
					<div className="notebook-detail-left">
						<div className="notebook-mode-tabs">
							<button type="button" className="active">FlashCard</button>
							<button type="button">Quizz</button>
							<button type="button">Luyện nói, viết</button>
							<button type="button">Mini Test</button>
						</div>

						<div className="notebook-word-panel">
							<div className="word-panel-tools">
								<div className="tool-left">
									<label><input type="checkbox" defaultChecked /> Từ vựng</label>
									<label><input type="checkbox" defaultChecked /> Phiên âm</label>
									<label><input type="checkbox" defaultChecked /> Nghĩa</label>
									<button type="button" className="tiny-btn" aria-label="note"><Edit3 size={14} /></button>
								</div>
								<div className="tool-right">
									<button type="button" className="tiny-btn"><RotateCcw size={16} /></button>
									<button type="button" className="tiny-btn"><Download size={16} /></button>
									<button type="button" className="tiny-btn"><PlusCircle size={16} /></button>
									<button type="button" className="tiny-btn"><Play size={16} /></button>
									<button type="button" className="tiny-btn"><Shuffle size={16} /></button>
								</div>
							</div>

							{loading && <div className="word-loading">Đang tải sổ tay...</div>}
							{message && !loading && <div className="word-message">{message}</div>}

							<div className="word-list-body">
								{twoColumnRows.map((row, index) => (
									<div key={`row-${index}`} className="word-row">
										{row.map((entry) => (
											<div key={entry.id} className="word-item-card">
												<div className="word-main-line">
													<Volume2 size={18} />
													<strong>{entry.item?.title || "-"}</strong>
												</div>
												<p className="word-sub">{entry.item?.subtitle || ""}</p>
												<p className="word-meaning">{entry.item?.meaning || "-"}</p>
												<button type="button" className="add-note-btn">+ Thêm ghi chú</button>
											</div>
										))}
										{row.length === 1 && <div className="word-item-card placeholder" />}
									</div>
								))}
								{!loading && filteredItems.length === 0 && (
									<div className="word-empty">Sổ tay này chưa có từ nào.</div>
								)}
							</div>
						</div>
					</div>

					<div className="notebook-detail-right">
						<div className="search-box">
							<Search size={18} />
							<input
								type="text"
								placeholder="Tìm kiếm"
								value={searchKeyword}
								onChange={(event) => setSearchKeyword(event.target.value)}
							/>
							<button type="button" className="tiny-btn"><Filter size={16} /></button>
						</div>

						<div className="notebook-info-card">
							{isEditingName ? (
								<div className="edit-name-row">
									<input
										type="text"
										value={editingName}
										onChange={(event) => setEditingName(event.target.value)}
									/>
									<button type="button" onClick={handleSaveNotebookName}>Lưu</button>
								</div>
							) : (
								<div className="name-row">
									<h3>{notebook?.name || "-"}</h3>
									<div className="name-actions">
										{isOwner && (
											<>
												<button type="button" className="tiny-btn" onClick={() => setIsEditingName(true)}><Edit3 size={16} /></button>
												<button type="button" className="tiny-btn danger" onClick={handleDeleteNotebook}><Trash2 size={16} /></button>
											</>
										)}
									</div>
								</div>
							)}
							<p>{notebook?.itemsCount || 0} từ</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default NotebookDetailPage;
