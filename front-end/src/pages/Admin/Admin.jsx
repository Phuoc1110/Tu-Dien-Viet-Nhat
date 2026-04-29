import React, { useContext, useEffect, useMemo, useState } from "react";
import {
	Activity,
	BookOpen,
	ClipboardList,
	FileText,
	LogOut,
	Shield,
	UserCog,
	Users,
	Wrench,
} from "lucide-react";
import { toast } from "react-toastify";
import { useHistory } from "react-router-dom";
import { UserContext } from "../../Context/UserProvider";
import {
	LogOutAdmin,
	createAdminNotebookCollection,
	createAdminVocabulary,
	deleteAdminNotebookCollection,
	getAdminNotebookCollections,
	deleteAdminVocabulary,
	getAdminAuditLogs,
	getAdminDashboard,
	getAdminUsers,
	getAdminVocabularies,
	resetAdminUserPassword,
	updateAdminNotebookCollection,
	updateAdminUserRole,
	updateAdminUserStatus,
	updateAdminVocabulary,
	updateAdminVocabularyJlpt,
} from "../../services/adminService";
import "./Admin.css";

const defaultForm = {
	word: "",
	reading: "",
	romaji: "",
	definition: "",
	partOfSpeech: "",
	jlptLevel: "",
	isCommon: false,
};

const defaultCollectionForm = {
	title: "",
	meta: "",
	ownerName: "Ban quan tri",
	views: "0",
	sortOrder: "0",
	isActive: true,
};

const AUDIT_PAGE_SIZE = 20;

const Admin = () => {
	const history = useHistory();
	const { logoutAdminContext } = useContext(UserContext);

	const [tab, setTab] = useState("dashboard");
	const [loading, setLoading] = useState(false);

	const [dashboard, setDashboard] = useState(null);

	const [vocabularyQuery, setVocabularyQuery] = useState("");
	const [vocabularyJlpt, setVocabularyJlpt] = useState("");
	const [vocabularies, setVocabularies] = useState([]);
	const [editingVocabularyId, setEditingVocabularyId] = useState(null);
	const [vocabularyForm, setVocabularyForm] = useState(defaultForm);
	const [collections, setCollections] = useState([]);
	const [collectionForm, setCollectionForm] = useState(defaultCollectionForm);
	const [editingCollectionId, setEditingCollectionId] = useState(null);

	const [users, setUsers] = useState([]);
	const [userQuery, setUserQuery] = useState("");
	const [resetPasswordMap, setResetPasswordMap] = useState({});

	const [auditLogs, setAuditLogs] = useState([]);
	const [auditPage, setAuditPage] = useState(1);
	const [auditPagination, setAuditPagination] = useState({
		page: 1,
		limit: AUDIT_PAGE_SIZE,
		totalItems: 0,
		totalPages: 1,
	});

	const loadDashboard = async () => {
		const res = await getAdminDashboard();
		if (res?.errCode === 0) {
			setDashboard(res.data);
			return;
		}
		toast.error(res?.errMessage || "Không thể tải dashboard");
	};

	const loadVocabularies = async () => {
		const res = await getAdminVocabularies({
			query: vocabularyQuery,
			jlptLevel: vocabularyJlpt,
			limit: 30,
		});
		if (res?.errCode === 0) {
			setVocabularies(res.data?.items || []);
			return;
		}
		toast.error(res?.errMessage || "Không thể tải danh sách từ vựng");
	};

	const loadUsers = async () => {
		const res = await getAdminUsers({ query: userQuery });
		if (res?.errCode === 0) {
			setUsers(res.data || []);
			return;
		}
		toast.error(res?.errMessage || "Không thể tải danh sách người dùng");
	};

	const loadNotebookCollections = async () => {
		const res = await getAdminNotebookCollections({ includeInactive: true });
		if (res?.errCode === 0) {
			setCollections(res.data || []);
			return;
		}
		toast.error(res?.errMessage || "Không thể tải danh sách bộ sổ tay biên soạn");
	};

	const loadAuditLogs = async (page = auditPage) => {
		const res = await getAdminAuditLogs({ page, limit: AUDIT_PAGE_SIZE });
		if (res?.errCode === 0) {
			setAuditLogs(res.data?.items || []);
			setAuditPagination(
				res.data?.pagination || {
					page,
					limit: AUDIT_PAGE_SIZE,
					totalItems: 0,
					totalPages: 1,
				}
			);
			return;
		}
		toast.error(res?.errMessage || "Không thể tải audit logs");
	};

	const reloadCurrentTab = async () => {
		setLoading(true);
		try {
			if (tab === "dashboard") await loadDashboard();
			if (tab === "content") {
				await Promise.all([loadVocabularies(), loadNotebookCollections()]);
			}
			if (tab === "users") await loadUsers();
			if (tab === "audit") await loadAuditLogs();
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		reloadCurrentTab();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [tab]);

	useEffect(() => {
		if (tab === "content") {
			loadVocabularies();
			loadNotebookCollections();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [vocabularyQuery, vocabularyJlpt]);

	useEffect(() => {
		if (tab === "users") {
			loadUsers();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [userQuery]);

	useEffect(() => {
		if (tab === "audit") {
			loadAuditLogs(auditPage);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [auditPage]);

	const handleLogout = async () => {
		const res = await LogOutAdmin();
		logoutAdminContext();
		if (res?.errCode === 0) {
			history.push("/");
			toast.success("Đã đăng xuất admin");
			return;
		}
		toast.error(res?.errMessage || "Đăng xuất thất bại");
	};

	const handleSaveVocabulary = async () => {
		const payload = {
			...vocabularyForm,
			jlptLevel: vocabularyForm.jlptLevel || null,
		};

		if (!payload.word || !payload.reading) {
			toast.error("Từ vựng và cách đọc là bắt buộc");
			return;
		}

		const res = editingVocabularyId
			? await updateAdminVocabulary(editingVocabularyId, payload)
			: await createAdminVocabulary(payload);

		if (res?.errCode === 0) {
			toast.success(editingVocabularyId ? "Đã cập nhật từ vựng" : "Đã thêm từ vựng");
			setVocabularyForm(defaultForm);
			setEditingVocabularyId(null);
			await loadVocabularies();
			await loadAuditLogs();
			return;
		}

		toast.error(res?.errMessage || "Không thể lưu từ vựng");
	};

	const handleEditVocabulary = (item) => {
		setEditingVocabularyId(item.id);
		setVocabularyForm({
			word: item.word || "",
			reading: item.reading || "",
			romaji: item.romaji || "",
			definition: item.meanings?.[0]?.definition || "",
			partOfSpeech: item.meanings?.[0]?.partOfSpeech || "",
			jlptLevel: item.jlptLevel ? String(item.jlptLevel) : "",
			isCommon: Boolean(item.isCommon),
		});
	};

	const handleDeleteVocabulary = async (id) => {
		if (!window.confirm("Xóa từ vựng này?")) {
			return;
		}
		const res = await deleteAdminVocabulary(id);
		if (res?.errCode === 0) {
			toast.success("Đã xóa từ vựng");
			await loadVocabularies();
			await loadAuditLogs();
			return;
		}
		toast.error(res?.errMessage || "Không thể xóa từ vựng");
	};

	const handleUpdateJlpt = async (id, jlptLevel) => {
		const res = await updateAdminVocabularyJlpt(id, jlptLevel);
		if (res?.errCode === 0) {
			toast.success("Đã gắn nhãn JLPT");
			await loadVocabularies();
			await loadAuditLogs();
			return;
		}
		toast.error(res?.errMessage || "Không thể cập nhật JLPT");
	};

	const handleEditCollection = (item) => {
		setEditingCollectionId(item.id);
		setCollectionForm({
			title: item.title || "",
			meta: item.meta || "",
			ownerName: item.ownerName || "Ban quan tri",
			views: String(item.views ?? 0),
			sortOrder: String(item.sortOrder ?? 0),
			isActive: Boolean(item.isActive),
		});
	};

	const resetCollectionForm = () => {
		setEditingCollectionId(null);
		setCollectionForm(defaultCollectionForm);
	};

	const handleSaveCollection = async () => {
		if (!collectionForm.title.trim()) {
			toast.error("Tiêu đề bộ sổ tay là bắt buộc");
			return;
		}

		const payload = {
			title: collectionForm.title.trim(),
			meta: collectionForm.meta.trim(),
			ownerName: collectionForm.ownerName.trim() || "Ban quan tri",
			views: Number(collectionForm.views) || 0,
			sortOrder: Number(collectionForm.sortOrder) || 0,
			isActive: Boolean(collectionForm.isActive),
		};

		const res = editingCollectionId
			? await updateAdminNotebookCollection(editingCollectionId, payload)
			: await createAdminNotebookCollection(payload);

		if (res?.errCode === 0) {
			toast.success(editingCollectionId ? "Đã cập nhật bộ sổ tay" : "Đã tạo bộ sổ tay");
			resetCollectionForm();
			await loadNotebookCollections();
			await loadAuditLogs();
			return;
		}

		toast.error(res?.errMessage || "Không thể lưu bộ sổ tay");
	};

	const handleDeleteCollection = async (id) => {
		if (!window.confirm("Xóa bộ sổ tay này?")) {
			return;
		}
		const res = await deleteAdminNotebookCollection(id);
		if (res?.errCode === 0) {
			toast.success("Đã xóa bộ sổ tay");
			if (editingCollectionId === id) {
				resetCollectionForm();
			}
			await loadNotebookCollections();
			await loadAuditLogs();
			return;
		}
		toast.error(res?.errMessage || "Không thể xóa bộ sổ tay");
	};

	const handleToggleCollectionActive = async (item) => {
		const res = await updateAdminNotebookCollection(item.id, {
			isActive: !item.isActive,
		});
		if (res?.errCode === 0) {
			toast.success("Đã cập nhật trạng thái hiển thị");
			await loadNotebookCollections();
			await loadAuditLogs();
			return;
		}
		toast.error(res?.errMessage || "Không thể cập nhật trạng thái");
	};

	const handleUpdateRole = async (id, role) => {
		const res = await updateAdminUserRole(id, role);
		if (res?.errCode === 0) {
			toast.success("Đã cập nhật phân quyền");
			await loadUsers();
			await loadAuditLogs();
			return;
		}
		toast.error(res?.errMessage || "Không thể cập nhật quyền");
	};

	const handleToggleUserStatus = async (user) => {
		const nextStatus = user.status === "active" ? "suspended" : "active";
		const res = await updateAdminUserStatus(user.id, nextStatus);
		if (res?.errCode === 0) {
			toast.success("Đã cập nhật trạng thái người dùng");
			await loadUsers();
			await loadAuditLogs();
			return;
		}
		toast.error(res?.errMessage || "Không thể cập nhật trạng thái");
	};

	const handleResetPassword = async (userId) => {
		const newPassword = resetPasswordMap[userId] || "";
		if (newPassword.trim().length < 6) {
			toast.error("Mật khẩu mới cần ít nhất 6 ký tự");
			return;
		}
		const res = await resetAdminUserPassword(userId, newPassword.trim());
		if (res?.errCode === 0) {
			toast.success("Đã reset mật khẩu");
			setResetPasswordMap((prev) => ({ ...prev, [userId]: "" }));
			await loadAuditLogs();
			return;
		}
		toast.error(res?.errMessage || "Không thể reset mật khẩu");
	};

	const formatAuditDetails = (details) => {
		if (!details) {
			return "-";
		}
		try {
			const parsed = typeof details === "string" ? JSON.parse(details) : details;
			return JSON.stringify(parsed, null, 2);
		} catch (_e) {
			return String(details);
		}
	};

	const statsCards = useMemo(() => {
		const summary = dashboard?.summary || {};
		return [
			{ label: "Từ vựng", value: summary.totalWords || 0, icon: <BookOpen size={18} /> },
			{ label: "Kanji", value: summary.totalKanjis || 0, icon: <FileText size={18} /> },
			{ label: "Ngữ pháp", value: summary.totalGrammars || 0, icon: <ClipboardList size={18} /> },
			{ label: "Câu ví dụ", value: summary.totalExamples || 0, icon: <Activity size={18} /> },
		];
	}, [dashboard]);

	return (
		<div className="admin2-wrap">
			<div className="admin2-header">
				<div>
					<h1>Bảng điều khiển quản trị</h1>
					<p>Dashboard - Nội dung - Người dùng - Audit logs</p>
				</div>
				<button type="button" className="admin2-logout" onClick={handleLogout}>
					<LogOut size={16} /> Đăng xuất
				</button>
			</div>

			<div className="admin2-tabs">
				<button className={tab === "dashboard" ? "active" : ""} onClick={() => setTab("dashboard")}>
					<Wrench size={16} /> Dashboard
				</button>
				<button className={tab === "content" ? "active" : ""} onClick={() => setTab("content")}>
					<BookOpen size={16} /> Vocabulary & Content
				</button>
				<button className={tab === "users" ? "active" : ""} onClick={() => setTab("users")}>
					<UserCog size={16} /> Users & Roles
				</button>
				<button className={tab === "audit" ? "active" : ""} onClick={() => setTab("audit")}>
					<Shield size={16} /> Audit Logs
				</button>
			</div>

			{loading && <div className="admin2-loading">Đang tải dữ liệu...</div>}

			{tab === "dashboard" && (
				<div className="admin2-grid">
					<div className="admin2-cards">
						{statsCards.map((card) => (
							<div className="admin2-card" key={card.label}>
								<div className="icon">{card.icon}</div>
								<div>
									<strong>{card.value}</strong>
									<p>{card.label}</p>
								</div>
							</div>
						))}
					</div>

					<div className="admin2-panel">
						<h3>Người dùng đăng ký mới (7 ngày)</h3>
						<div className="admin2-bars">
							{(dashboard?.newUsersByDay || []).map((item) => (
								<div key={item.date} className="bar-row">
									<span>{item.date}</span>
									<div className="bar-track">
										<div className="bar-fill" style={{ width: `${Math.max(8, item.count * 14)}px` }} />
									</div>
									<em>{item.count}</em>
								</div>
							))}
						</div>
					</div>

					<div className="admin2-panel">
						<h3>Từ được tra cứu nhiều nhất</h3>
						<ul>
							{(dashboard?.topSearchTerms || []).map((item) => (
								<li key={item.searchTerm}>
									<span>{item.searchTerm}</span>
									<strong>{item.count}</strong>
								</li>
							))}
						</ul>
					</div>

					<div className="admin2-panel">
						<h3>Cấp độ JLPT phổ biến</h3>
						<ul>
							{(dashboard?.topJlptLevels || []).map((item) => (
								<li key={item.jlptLevel}>
									<span>{item.jlptLevel}</span>
									<strong>{item.count}</strong>
								</li>
							))}
						</ul>
					</div>

					<div className="admin2-panel">
						<h3>Sức khỏe hệ thống</h3>
						<p>
							DB: <b>{dashboard?.health?.database?.status || "unknown"}</b> • latency:
							 {dashboard?.health?.database?.latencyMs ?? "-"} ms
						</p>
						<p>
							API: <b>{dashboard?.health?.api?.status || "unknown"}</b> • latency:
							 {dashboard?.health?.api?.latencyMs ?? "-"} ms
						</p>
					</div>
				</div>
			)}

			{tab === "content" && (
				<div className="admin2-grid">
					<div className="admin2-panel">
						<h3>Thêm / sửa từ vựng</h3>
						<div className="admin2-form-grid">
							<input placeholder="Kanji/Từ" value={vocabularyForm.word} onChange={(e) => setVocabularyForm((p) => ({ ...p, word: e.target.value }))} />
							<input placeholder="Hiragana/Katakana" value={vocabularyForm.reading} onChange={(e) => setVocabularyForm((p) => ({ ...p, reading: e.target.value }))} />
							<input placeholder="Romaji" value={vocabularyForm.romaji} onChange={(e) => setVocabularyForm((p) => ({ ...p, romaji: e.target.value }))} />
							{/* <input placeholder="Từ loại" value={vocabularyForm.partOfSpeech} onChange={(e) => setVocabularyForm((p) => ({ ...p, partOfSpeech: e.target.value }))} /> */}
							<select value={vocabularyForm.jlptLevel} onChange={(e) => setVocabularyForm((p) => ({ ...p, jlptLevel: e.target.value }))}>
								<option value="">JLPT</option>
								<option value="5">N5</option>
								<option value="4">N4</option>
								<option value="3">N3</option>
								<option value="2">N2</option>
								<option value="1">N1</option>
							</select>
							<label className="inline-check">
								<input type="checkbox" checked={vocabularyForm.isCommon} onChange={(e) => setVocabularyForm((p) => ({ ...p, isCommon: e.target.checked }))} />
								Từ thông dụng
							</label>
							<textarea
								placeholder="Nghĩa tiếng Việt"
								value={vocabularyForm.definition}
								onChange={(e) => setVocabularyForm((p) => ({ ...p, definition: e.target.value }))}
							/>
						</div>
						<div className="admin2-actions">
							<button type="button" onClick={handleSaveVocabulary}>
								{editingVocabularyId ? "Cập nhật" : "Thêm từ"}
							</button>
							<button
								type="button"
								className="ghost"
								onClick={() => {
									setVocabularyForm(defaultForm);
									setEditingVocabularyId(null);
								}}
							>
								Làm mới
							</button>
						</div>
					</div>

					<div className="admin2-panel">
						<h3>Danh sách từ vựng</h3>
						<div className="admin2-filters">
							<input
								placeholder="Tìm từ / reading / romaji"
								value={vocabularyQuery}
								onChange={(e) => setVocabularyQuery(e.target.value)}
							/>
							<select value={vocabularyJlpt} onChange={(e) => setVocabularyJlpt(e.target.value)}>
								<option value="">Tất cả JLPT</option>
								<option value="N5">N5</option>
								<option value="N4">N4</option>
								<option value="N3">N3</option>
								<option value="N2">N2</option>
								<option value="N1">N1</option>
							</select>
						</div>

						<div className="admin2-table-wrap">
							<table className="admin2-table">
								<thead>
									<tr>
										<th>Từ</th>
										<th>Reading</th>
										<th>Romaji</th>
										<th>Nghĩa</th>
										<th>JLPT</th>
										<th>Hành động</th>
									</tr>
								</thead>
								<tbody>
									{vocabularies.map((item) => (
										<tr key={item.id}>
											<td>{item.word}</td>
											<td>{item.reading}</td>
											<td>{item.romaji || "-"}</td>
											<td>{item.meanings?.[0]?.definition || "-"}</td>
											<td>
												<select
													value={item.jlptLevel ? `N${item.jlptLevel}` : ""}
													onChange={(e) => handleUpdateJlpt(item.id, e.target.value)}
												>
													<option value="">-</option>
													<option value="N5">N5</option>
													<option value="N4">N4</option>
													<option value="N3">N3</option>
													<option value="N2">N2</option>
													<option value="N1">N1</option>
												</select>
											</td>
											<td>
												<div className="row-actions">
													<button type="button" onClick={() => handleEditVocabulary(item)}>Sửa</button>
													<button type="button" className="danger" onClick={() => handleDeleteVocabulary(item.id)}>Xóa</button>
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>

					<div className="admin2-panel">
						<h3>Bộ sổ tay biên soạn</h3>
						<div className="admin2-form-grid">
							<input
								placeholder="Tiêu đề"
								value={collectionForm.title}
								onChange={(e) => setCollectionForm((p) => ({ ...p, title: e.target.value }))}
							/>
							<input
								placeholder="Mô tả ngắn (meta)"
								value={collectionForm.meta}
								onChange={(e) => setCollectionForm((p) => ({ ...p, meta: e.target.value }))}
							/>
							<input
								placeholder="Tên đơn vị biên soạn"
								value={collectionForm.ownerName}
								onChange={(e) => setCollectionForm((p) => ({ ...p, ownerName: e.target.value }))}
							/>
							<input
								type="number"
								placeholder="Lượt xem"
								value={collectionForm.views}
								onChange={(e) => setCollectionForm((p) => ({ ...p, views: e.target.value }))}
							/>
							<input
								type="number"
								placeholder="Thứ tự hiển thị"
								value={collectionForm.sortOrder}
								onChange={(e) => setCollectionForm((p) => ({ ...p, sortOrder: e.target.value }))}
							/>
							<label className="inline-check">
								<input
									type="checkbox"
									checked={collectionForm.isActive}
									onChange={(e) =>
										setCollectionForm((p) => ({ ...p, isActive: e.target.checked }))
									}
								/>
								Hiển thị ngoài trang Notebook
							</label>
						</div>
						<div className="admin2-actions">
							<button type="button" onClick={handleSaveCollection}>
								{editingCollectionId ? "Cập nhật bộ sổ tay" : "Tạo bộ sổ tay"}
							</button>
							<button type="button" className="ghost" onClick={resetCollectionForm}>
								Làm mới
							</button>
						</div>

						<div className="admin2-table-wrap">
							<table className="admin2-table">
								<thead>
									<tr>
										<th>Tiêu đề</th>
										<th>Meta</th>
										<th>Đơn vị</th>
										<th>Views</th>
										<th>Sort</th>
										<th>Trạng thái</th>
										<th>Hành động</th>
									</tr>
								</thead>
								<tbody>
									{collections.map((item) => (
										<tr key={item.id}>
											<td>{item.title}</td>
											<td>{item.meta || "-"}</td>
											<td>{item.ownerName || "Ban quan tri"}</td>
											<td>{item.views || 0}</td>
											<td>{item.sortOrder || 0}</td>
											<td>
												<span className={`status ${item.isActive ? "active" : "suspended"}`}>
													{item.isActive ? "active" : "hidden"}
												</span>
											</td>
											<td>
												<div className="row-actions">
													<button type="button" onClick={() => handleEditCollection(item)}>
														Sửa
													</button>
													<button type="button" onClick={() => handleToggleCollectionActive(item)}>
														{item.isActive ? "Ẩn" : "Hiện"}
													</button>
													<button type="button" className="danger" onClick={() => handleDeleteCollection(item.id)}>
														Xóa
													</button>
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				</div>
			)}

			{tab === "users" && (
				<div className="admin2-grid">
					<div className="admin2-panel">
						<h3>Quản lý tài khoản & phân quyền</h3>
						<div className="admin2-filters">
							<input
								placeholder="Tìm theo username/email"
								value={userQuery}
								onChange={(e) => setUserQuery(e.target.value)}
							/>
						</div>
						<div className="admin2-table-wrap">
							<table className="admin2-table">
								<thead>
									<tr>
										<th>User</th>
										<th>Email</th>
										<th>Role</th>
										<th>Trạng thái</th>
										<th>Reset mật khẩu</th>
										<th>Hành động</th>
									</tr>
								</thead>
								<tbody>
									{users.map((user) => (
										<tr key={user.id}>
											<td>{user.username}</td>
											<td>{user.email}</td>
											<td>
												<select
													value={user.role === "moderator" ? "editor" : user.role}
													onChange={(e) => handleUpdateRole(user.id, e.target.value)}
												>
													<option value="admin">Admin</option>
													<option value="editor">Editor</option>
													<option value="user">User</option>
												</select>
											</td>
											<td>
												<span className={`status ${user.status}`}>{user.status}</span>
											</td>
											<td>
												<input
													type="password"
													placeholder="Mật khẩu mới"
													value={resetPasswordMap[user.id] || ""}
													onChange={(e) =>
														setResetPasswordMap((prev) => ({
															...prev,
															[user.id]: e.target.value,
														}))
													}
												/>
											</td>
											<td>
												<div className="row-actions">
													<button type="button" onClick={() => handleToggleUserStatus(user)}>
														{user.status === "active" ? "Khóa" : "Mở khóa"}
													</button>
													<button type="button" onClick={() => handleResetPassword(user.id)}>
														Reset mật khẩu
													</button>
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				</div>
			)}

			{tab === "audit" && (
				<div className="admin2-grid">
					<div className="admin2-panel">
						<h3>Lịch sử chỉnh sửa (Audit Logs)</h3>
						<div className="admin2-table-wrap">
							<table className="admin2-table">
								<thead>
									<tr>
										<th>Thời gian</th>
										<th>Admin</th>
										<th>Action</th>
										<th>Target</th>
										<th>Chi tiết</th>
									</tr>
								</thead>
								<tbody>
									{auditLogs.map((log) => (
										<tr key={log.id}>
											<td>{new Date(log.createdAt).toLocaleString("vi-VN")}</td>
											<td>{log.admin?.username || log.admin?.email || "Unknown"}</td>
											<td>{log.actionType}</td>
											<td>{log.targetType} #{log.targetId || "-"}</td>
											<td className="log-details">{formatAuditDetails(log.details)}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
						<div className="admin2-pagination">
							<button
								type="button"
								disabled={auditPagination.page <= 1}
								onClick={() => setAuditPage((prev) => Math.max(1, prev - 1))}
							>
								Trước
							</button>
							<span>
								Trang {auditPagination.page}/{auditPagination.totalPages} • {auditPagination.totalItems} bản ghi
							</span>
							<button
								type="button"
								disabled={auditPagination.page >= auditPagination.totalPages}
								onClick={() =>
									setAuditPage((prev) => Math.min(auditPagination.totalPages, prev + 1))
								}
							>
								Sau
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default Admin;