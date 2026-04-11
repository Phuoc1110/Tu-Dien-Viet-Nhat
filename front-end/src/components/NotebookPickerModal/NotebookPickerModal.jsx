import React, { useEffect, useMemo, useState } from "react";
import { useHistory } from "react-router-dom";
import { FolderPlus, Loader2, NotebookPen, Plus, X } from "lucide-react";
import {
	addNotebookItem,
	createNotebook,
	getNotebookOverview,
} from "../../services/notebookService";
import "./NotebookPickerModal.css";

const NotebookPickerModal = ({ open, onClose, item }) => {
	const history = useHistory();
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [notebooks, setNotebooks] = useState([]);
	const [selectedNotebookId, setSelectedNotebookId] = useState(null);
	const [createMode, setCreateMode] = useState(false);
	const [newNotebookName, setNewNotebookName] = useState("");
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");

	const itemLabel = useMemo(() => {
		if (!item) {
			return "";
		}
		return item.label || item.title || item.word || item.characterKanji || item.grammar || "";
	}, [item]);

	useEffect(() => {
		if (!open) {
			return;
		}

		const load = async () => {
			setLoading(true);
			setError("");
			setSuccess("");
			const res = await getNotebookOverview(12);
			if (res && res.errCode === 0) {
				const list = Array.isArray(res.myNotebooks) ? res.myNotebooks : [];
				setNotebooks(list);
				setSelectedNotebookId(list[0]?.id || null);
				setCreateMode(list.length === 0);
				setNewNotebookName(list.length === 0 ? "" : "");
			} else {
				if (res?.errCode === -2) {
					history.push("/login");
					return;
				}
				setError(res?.errMessage || "Không tải được danh sách sổ tay");
			}
			setLoading(false);
		};

		load();
	}, [history, open]);

	const handleCreateAndAdd = async () => {
		const name = newNotebookName.trim();
		if (!name) {
			setError("Nhập tên sổ tay trước khi lưu.");
			return;
		}

		setSaving(true);
		setError("");

		const created = await createNotebook({ name });
		if (created && created.errCode === 0 && created.notebook?.id) {
			await handleAddToNotebook(created.notebook.id);
			return;
		}

		if (created?.errCode === -2) {
			history.push("/login");
			return;
		}

		setError(created?.errMessage || "Không tạo được sổ tay");
		setSaving(false);
	};

	const handleAddToNotebook = async (notebookId = selectedNotebookId) => {
		if (!item || !notebookId) {
			setError("Chọn sổ tay để thêm mục.");
			return;
		}

		setSaving(true);
		setError("");
		setSuccess("");

		const res = await addNotebookItem(notebookId, {
			itemType: item.type,
			itemId: item.id,
		});

		if (res && res.errCode === 0) {
			setSuccess("Đã thêm vào sổ tay.");
			setSaving(false);
			setTimeout(() => {
				onClose?.();
			}, 350);
			return;
		}

		if (res?.errCode === -2) {
			history.push("/login");
			return;
		}

		if (res?.errCode === 3) {
			setError("Mục này đã có trong sổ tay đã chọn.");
		} else {
			setError(res?.errMessage || "Không thêm được vào sổ tay");
		}
		setSaving(false);
	};

	if (!open) {
		return null;
	}

	return (
		<div className="notebook-picker-backdrop" onMouseDown={onClose}>
			<div className="notebook-picker-modal" onMouseDown={(event) => event.stopPropagation()}>
				<div className="notebook-picker-head">
					<div>
						<h3>Thêm vào sổ tay</h3>
						<p>{itemLabel || "Mục đang chọn"}</p>
					</div>
					<button type="button" className="picker-close-btn" onClick={onClose}>
						<X size={18} />
					</button>
				</div>

				<div className="notebook-picker-body">
					{loading ? (
						<div className="picker-loading">
							<Loader2 size={18} className="spin" />
							<span>Đang tải sổ tay...</span>
						</div>
					) : (
						<>
							{notebooks.length > 0 && !createMode && (
								<div className="picker-list">
									{notebooks.map((notebook) => (
										<button
											type="button"
											key={notebook.id}
											className={`picker-notebook-card ${selectedNotebookId === notebook.id ? "active" : ""}`}
											onClick={() => setSelectedNotebookId(notebook.id)}
										>
											<div className="picker-notebook-top">
												<NotebookPen size={16} />
												<strong>{notebook.name}</strong>
											</div>
											<p>{notebook.description || "Chưa có mô tả"}</p>
											<small>{notebook.itemsCount || 0} mục</small>
										</button>
									))}
								</div>
							)}

							<div className="picker-create-row">
								{createMode ? (
									<div className="picker-create-form">
										<input
											type="text"
											placeholder="Nhập tên sổ tay"
											value={newNotebookName}
											onChange={(event) => setNewNotebookName(event.target.value)}
										/>
										<button type="button" onClick={handleCreateAndAdd} disabled={saving}>
											<FolderPlus size={16} />
											<span>{saving ? "Đang lưu..." : "Tạo sổ tay mới"}</span>
										</button>
									</div>
								) : (
									<button type="button" className="picker-toggle-create" onClick={() => setCreateMode(true)}>
										<Plus size={16} />
										<span>Tạo sổ tay mới</span>
									</button>
								)}
							</div>
						</>
					)}

					{error && <div className="picker-message error">{error}</div>}
					{success && <div className="picker-message success">{success}</div>}
				</div>

				<div className="notebook-picker-actions">
					<button type="button" className="picker-cancel" onClick={onClose}>
						Hủy
					</button>
					<button
						type="button"
						className="picker-save"
						onClick={() => handleAddToNotebook(selectedNotebookId)}
						disabled={saving || createMode || !selectedNotebookId}
					>
						{saving ? "Đang lưu..." : "Lưu"}
					</button>
				</div>
			</div>
		</div>
	);
};

export default NotebookPickerModal;