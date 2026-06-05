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
	MessageSquare,
	AlertTriangle,
} from "lucide-react";
import { toast } from "react-toastify";
import { useHistory } from "react-router-dom";
import { UserContext } from "../../Context/UserProvider";
import {
	LogOutAdmin,
	addAdminNotebookItemsByJlpt,
	createAdminNotebook,
	createAdminVocabulary,
	deleteAdminNotebook,
	deleteAdminUserNotebook,
	deleteAdminVocabulary,
	getAdminAuditLogs,
	getAdminNotebookDetail,
	getAdminDashboard,
	getAdminNotebookBulkSummary,
	getAdminNotebooks,
	getAdminUserNotebookDetail,
	getAdminUserNotebooks,
	getAdminUsers,
	getAdminVocabularies,
	resetAdminUserPassword,
	updateAdminUserNotebook,
	updateAdminNotebook,
	updateAdminUserRole,
	updateAdminUserStatus,
	updateAdminVocabulary,
	updateAdminVocabularyJlpt,
	getAdminReports,
	updateAdminReportStatus,
	getAdminComments,
	updateAdminCommentHide,
	deleteAdminComment,
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

const defaultNotebookForm = {
	name: "",
	description: "",
};

const AUDIT_PAGE_SIZE = 20;
const NOTEBOOK_DETAIL_PAGE_SIZE = 20;

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

	const [adminNotebooks, setAdminNotebooks] = useState([]);
	const [adminNotebookOptions, setAdminNotebookOptions] = useState([]);
	const [adminNotebookQuery, setAdminNotebookQuery] = useState("");
	const [adminNotebookJlpt, setAdminNotebookJlpt] = useState("");
	const [adminNotebookForm, setAdminNotebookForm] = useState(defaultNotebookForm);
	const [editingAdminNotebookId, setEditingAdminNotebookId] = useState(null);
	const [jlptTargetNotebookId, setJlptTargetNotebookId] = useState("");
	const [jlptBulkItemType, setJlptBulkItemType] = useState("word");
	const [jlptBulkLevel, setJlptBulkLevel] = useState("N5");
	const [jlptBulkLimitMode, setJlptBulkLimitMode] = useState("200");
	const [jlptBulkCustomLimit, setJlptBulkCustomLimit] = useState("300");
	const [bulkSummary, setBulkSummary] = useState(null);
	const [bulkSummaryLoading, setBulkSummaryLoading] = useState(false);

	const [userNotebooks, setUserNotebooks] = useState([]);
	const [userNotebookQuery, setUserNotebookQuery] = useState("");
	const [userNotebookOwnerQuery, setUserNotebookOwnerQuery] = useState("");
	const [userNotebookOwnerStatus, setUserNotebookOwnerStatus] = useState("");
	const [userNotebookPagination, setUserNotebookPagination] = useState({
		page: 1,
		limit: 20,
		totalItems: 0,
		totalPages: 1,
	});

	const [editingUserNotebookId, setEditingUserNotebookId] = useState(null);
	const [userNotebookForm, setUserNotebookForm] = useState(defaultNotebookForm);

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

	const [reports, setReports] = useState([]);
	const [reportStatusFilter, setReportStatusFilter] = useState("");
	const [reportPagination, setReportPagination] = useState({
		page: 1,
		limit: 20,
		totalItems: 0,
		totalPages: 1,
	});

	const [comments, setComments] = useState([]);
	const [commentTargetType, setCommentTargetType] = useState("");
	const [commentIsHidden, setCommentIsHidden] = useState("");
	const [commentPagination, setCommentPagination] = useState({
		page: 1,
		limit: 20,
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

	const loadAdminNotebookOptions = async () => {
		const res = await getAdminNotebooks({ limit: 1000 });
		if (res?.errCode === 0) {
			const items = res.data || [];
			setAdminNotebookOptions(items);
			if (!jlptTargetNotebookId && items.length) {
				setJlptTargetNotebookId(String(items[0].id));
			}
		}
	};

	const loadAdminNotebooks = async () => {
		const res = await getAdminNotebooks({
			query: adminNotebookQuery,
			jlptLevel: adminNotebookJlpt,
			limit: 100,
		});
		if (res?.errCode === 0) {
			const notebookItems = res.data || [];
			setAdminNotebooks(notebookItems);
			return;
		}
		toast.error(res?.errMessage || "Không thể tải danh sách notebook admin");
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

	const loadUserNotebooks = async (page = userNotebookPagination.page) => {
		const res = await getAdminUserNotebooks({
			query: userNotebookQuery,
			ownerQuery: userNotebookOwnerQuery,
			ownerStatus: userNotebookOwnerStatus,
			page,
			limit: 20,
		});

		if (res?.errCode === 0) {
			const items = res?.data?.items || [];
			setUserNotebooks(items);
			setUserNotebookPagination(
				res?.data?.pagination || {
					page,
					limit: 20,
					totalItems: 0,
					totalPages: 1,
				}
			);

			return;
		}

		toast.error(res?.errMessage || "Không thể tải notebook người dùng");
	};

	const loadReports = async (page = reportPagination.page) => {
		const res = await getAdminReports({ page, limit: 20, status: reportStatusFilter });
		if (res?.errCode === 0) {
			setReports(res.data?.items || []);
			setReportPagination(
				res.data?.pagination || { page, limit: 20, totalItems: 0, totalPages: 1 }
			);
			return;
		}
		toast.error(res?.errMessage || "Không thể tải báo cáo");
	};

	const loadComments = async (page = commentPagination.page) => {
		const res = await getAdminComments({
			page,
			limit: 20,
			targetType: commentTargetType,
			isHidden: commentIsHidden,
		});
		if (res?.errCode === 0) {
			setComments(res.data?.items || []);
			setCommentPagination(
				res.data?.pagination || { page, limit: 20, totalItems: 0, totalPages: 1 }
			);
			return;
		}
		toast.error(res?.errMessage || "Không thể tải bình luận");
	};

	const reloadCurrentTab = async () => {
		setLoading(true);
		try {
			if (tab === "dashboard") await loadDashboard();
			if (tab === "content") await loadVocabularies();
			if (tab === "admin_notebooks") {
				await loadAdminNotebookOptions();
				await loadAdminNotebooks();
			}
			if (tab === "user_notebooks") await loadUserNotebooks(1);
			if (tab === "users") await loadUsers();
			if (tab === "audit") await loadAuditLogs();
			if (tab === "reports") await loadReports(1);
			if (tab === "comments") await loadComments(1);
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
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [vocabularyQuery, vocabularyJlpt]);

	useEffect(() => {
		if (tab === "admin_notebooks") {
			loadAdminNotebooks();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [adminNotebookQuery, adminNotebookJlpt]);

	useEffect(() => {
		if (tab !== "user_notebooks") {
			return;
		}
		loadUserNotebooks(1);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [tab, userNotebookQuery, userNotebookOwnerQuery, userNotebookOwnerStatus]);

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

	useEffect(() => {
		if (tab === "reports") {
			loadReports(reportPagination.page);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [tab, reportStatusFilter, reportPagination.page]);

	useEffect(() => {
		if (tab === "comments") {
			loadComments(commentPagination.page);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [tab, commentTargetType, commentIsHidden, commentPagination.page]);

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

	const handleCreateAdminNotebook = async () => {
		if (!adminNotebookForm.name.trim()) {
			toast.error("Tên notebook là bắt buộc");
			return;
		}

		const payload = {
			name: adminNotebookForm.name.trim(),
			description: adminNotebookForm.description.trim(),
		};

		const res = editingAdminNotebookId
			? await updateAdminNotebook(editingAdminNotebookId, payload)
			: await createAdminNotebook(payload);

		if (res?.errCode === 0) {
			toast.success(editingAdminNotebookId ? "Đã cập nhật notebook admin" : "Đã tạo notebook admin");
			setAdminNotebookForm(defaultNotebookForm);
			setEditingAdminNotebookId(null);
			await loadAdminNotebooks();
			await loadAuditLogs();
			return;
		}

		toast.error(res?.errMessage || "Không thể lưu notebook admin");
	};

	const handleEditAdminNotebook = (item) => {
		setEditingAdminNotebookId(item.id);
		setAdminNotebookForm({
			name: item.name || "",
			description: item.description || "",
		});
	};

	const handleDeleteAdminNotebook = async (id) => {
		if (!window.confirm("Xóa notebook này?")) {
			return;
		}

		const res = await deleteAdminNotebook(id);
		if (res?.errCode === 0) {
			toast.success("Đã xóa notebook admin");
			if (editingAdminNotebookId === id) {
				setEditingAdminNotebookId(null);
				setAdminNotebookForm(defaultNotebookForm);
			}
			if (String(jlptTargetNotebookId) === String(id)) {
				setJlptTargetNotebookId("");
			}
			await loadAdminNotebooks();
			await loadAuditLogs();
			return;
		}

		toast.error(res?.errMessage || "Không thể xóa notebook admin");
	};

	const handleAddJlptGroup = async () => {
		if (!jlptTargetNotebookId) {
			toast.error("Chọn notebook trước khi thêm");
			return;
		}

		const resolvedLimit =
			jlptBulkLimitMode === "custom"
				? String(Math.max(1, Number(jlptBulkCustomLimit) || 1))
				: jlptBulkLimitMode;

		const res = await addAdminNotebookItemsByJlpt(jlptTargetNotebookId, {
			itemType: jlptBulkItemType,
			jlptLevel: jlptBulkLevel,
			limit: resolvedLimit,
		});

		if (res?.errCode === 0) {
			const inserted = res?.data?.insertedCount ?? 0;
			const skipped = res?.data?.skippedCount ?? 0;
			const typeLabelMap = { word: "từ vựng", kanji: "kanji", grammar: "ngữ pháp" };
			const typeLabel = typeLabelMap[jlptBulkItemType] || "mục";
			toast.success(`Đã thêm ${inserted} ${typeLabel}, bỏ qua ${skipped} mục trùng`);
			await loadAdminNotebooks();
			await loadBulkSummary();
			await loadAuditLogs();
			return;
		}

		toast.error(res?.errMessage || "Không thể thêm mục theo nhóm JLPT");
	};

	const handleEditUserNotebook = (item) => {
		setEditingUserNotebookId(item.id);
		setUserNotebookForm({
			name: item.name || "",
			description: item.description || "",
		});
	};

	const handleSaveUserNotebook = async () => {
		if (!editingUserNotebookId) {
			toast.error("Chọn notebook người dùng để sửa");
			return;
		}
		if (!userNotebookForm.name.trim()) {
			toast.error("Tên notebook là bắt buộc");
			return;
		}

		const res = await updateAdminUserNotebook(editingUserNotebookId, {
			name: userNotebookForm.name.trim(),
			description: userNotebookForm.description.trim(),
		});

		if (res?.errCode === 0) {
			toast.success("Đã cập nhật notebook người dùng");
			await loadUserNotebooks(userNotebookPagination.page);
			await loadAuditLogs();
			return;
		}

		toast.error(res?.errMessage || "Không thể cập nhật notebook người dùng");
	};

	const handleDeleteUserNotebook = async (id) => {
		if (!window.confirm("Xóa notebook người dùng này?")) {
			return;
		}

		const res = await deleteAdminUserNotebook(id);
		if (res?.errCode === 0) {
			toast.success("Đã xóa notebook người dùng");
			if (String(editingUserNotebookId) === String(id)) {
				setEditingUserNotebookId(null);
				setUserNotebookForm(defaultNotebookForm);
			}
			await loadUserNotebooks(userNotebookPagination.page);
			await loadAuditLogs();
			return;
		}

		toast.error(res?.errMessage || "Không thể xóa notebook người dùng");
	};

	const loadBulkSummary = async () => {
		if (!jlptTargetNotebookId) {
			setBulkSummary(null);
			return;
		}

		const resolvedLimit =
			jlptBulkLimitMode === "custom"
				? String(Math.max(1, Number(jlptBulkCustomLimit) || 1))
				: jlptBulkLimitMode;

		setBulkSummaryLoading(true);
		const res = await getAdminNotebookBulkSummary(jlptTargetNotebookId, {
			itemType: jlptBulkItemType,
			jlptLevel: jlptBulkLevel,
			limit: resolvedLimit,
		});

		if (res?.errCode === 0) {
			setBulkSummary(res.data || null);
		} else {
			setBulkSummary(null);
		}

		setBulkSummaryLoading(false);
	};

	useEffect(() => {
		if (tab !== "admin_notebooks") {
			return;
		}
		loadBulkSummary();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [tab, jlptTargetNotebookId, jlptBulkItemType, jlptBulkLevel, jlptBulkLimitMode, jlptBulkCustomLimit]);


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

	const handleUpdateReportStatus = async (id, status) => {
		const res = await updateAdminReportStatus(id, status);
		if (res?.errCode === 0) {
			toast.success("Đã cập nhật trạng thái báo cáo");
			await loadReports();
			return;
		}
		toast.error(res?.errMessage || "Không thể cập nhật báo cáo");
	};

	const handleToggleCommentVisibility = async (comment) => {
		const res = await updateAdminCommentHide(comment.id, !comment.isHidden);
		if (res?.errCode === 0) {
			toast.success("Đã cập nhật trạng thái bình luận");
			await loadComments();
			return;
		}
		toast.error(res?.errMessage || "Không thể cập nhật bình luận");
	};

	const handleDeleteComment = async (id) => {
		if (!window.confirm("Bạn có chắc chắn muốn xóa bình luận này vĩnh viễn?")) return;
		const res = await deleteAdminComment(id);
		if (res?.errCode === 0) {
			toast.success("Đã xóa bình luận");
			await loadComments();
			return;
		}
		toast.error(res?.errMessage || "Không thể xóa bình luận");
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
				<button className={tab === "admin_notebooks" ? "active" : ""} onClick={() => setTab("admin_notebooks")}>
					<ClipboardList size={16} /> Admin Notebooks
				</button>
				<button className={tab === "user_notebooks" ? "active" : ""} onClick={() => setTab("user_notebooks")}>
					<Users size={16} /> User Notebooks
				</button>
				<button className={tab === "users" ? "active" : ""} onClick={() => setTab("users")}>
					<UserCog size={16} /> Users & Roles
				</button>
				<button className={tab === "audit" ? "active" : ""} onClick={() => setTab("audit")}>
					<Shield size={16} /> Audit Logs
				</button>
				<button className={tab === "reports" ? "active" : ""} onClick={() => setTab("reports")}>
					<AlertTriangle size={16} /> Reports
				</button>
				<button className={tab === "comments" ? "active" : ""} onClick={() => setTab("comments")}>
					<MessageSquare size={16} /> Comments
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

				</div>
			)}

			{tab === "admin_notebooks" && (
				<div className="admin2-grid">
					<div className="admin2-panel">
						<h3>Tạo notebook biên soạn</h3>
						<div className="admin2-form-grid">
							<input
								placeholder="Tên notebook"
								value={adminNotebookForm.name}
								onChange={(e) =>
									setAdminNotebookForm((prev) => ({ ...prev, name: e.target.value }))
								}
							/>
							<textarea
								placeholder="Mô tả"
								value={adminNotebookForm.description}
								onChange={(e) =>
									setAdminNotebookForm((prev) => ({ ...prev, description: e.target.value }))
								}
							/>
						</div>
						<div className="admin2-actions">
							<button type="button" onClick={handleCreateAdminNotebook}>
								{editingAdminNotebookId ? "Lưu thay đổi" : "Tạo notebook"}
							</button>
							<button
								type="button"
								className="ghost"
								onClick={() => {
									setAdminNotebookForm(defaultNotebookForm);
									setEditingAdminNotebookId(null);
								}}
							>
								Làm mới
							</button>
						</div>
					</div>

					<div className="admin2-panel">
						<h3>Thêm mục theo nhóm JLPT</h3>
						<div className="admin2-form-grid">
							<select
								value={jlptTargetNotebookId}
								onChange={(e) => setJlptTargetNotebookId(e.target.value)}
							>
								<option value="">Chọn notebook đích</option>
								{adminNotebookOptions.map((item) => (
									<option key={item.id} value={item.id}>
										{item.name}
									</option>
								))}
							</select>
							<select value={jlptBulkItemType} onChange={(e) => setJlptBulkItemType(e.target.value)}>
								<option value="word">Từ vựng</option>
								<option value="kanji">Kanji</option>
								<option value="grammar">Ngữ pháp</option>
							</select>
							<select value={jlptBulkLevel} onChange={(e) => setJlptBulkLevel(e.target.value)}>
								<option value="N5">N5</option>
								<option value="N4">N4</option>
								<option value="N3">N3</option>
								<option value="N2">N2</option>
								<option value="N1">N1</option>
							</select>
							<select value={jlptBulkLimitMode} onChange={(e) => setJlptBulkLimitMode(e.target.value)}>
								<option value="50">50</option>
								<option value="100">100</option>
								<option value="200">200</option>
								<option value="500">500</option>
								<option value="1000">1000</option>
								<option value="custom">Tùy chỉnh...</option>
								<option value="all">All</option>
							</select>
							{jlptBulkLimitMode === "custom" && (
								<input
									type="number"
									min="1"
									placeholder="Nhập số lượng"
									value={jlptBulkCustomLimit}
									onChange={(e) => setJlptBulkCustomLimit(e.target.value)}
								/>
							)}
						</div>
						<div className="admin2-bulk-summary">
							{bulkSummaryLoading ? (
								<p>Đang tính thống kê dữ liệu...</p>
							) : bulkSummary ? (
								<>
									<p>
										Nguồn dữ liệu {bulkSummary.itemType} {bulkSummary.jlptLevel}: tổng {bulkSummary.totalPool} mục,
										trong notebook đã có {bulkSummary.alreadyInNotebookPool} mục, còn thêm được {bulkSummary.canAddPool} mục.
									</p>
									<p>
										Theo lựa chọn số lượng hiện tại ({String(bulkSummary.limit)}): duyệt {bulkSummary.selectedPool} mục,
										trùng {bulkSummary.selectedAlreadyInNotebook} mục, thêm mới được {bulkSummary.selectedCanAdd} mục.
									</p>
								</>
							) : (
								<p>Chọn notebook và bộ lọc để xem thống kê trước khi thêm.</p>
							)}
						</div>
						<div className="admin2-actions">
							<button type="button" onClick={handleAddJlptGroup}>Thêm theo JLPT</button>
						</div>
					</div>


					<div className="admin2-panel">
						<h3>Danh sách notebook admin</h3>
						<div className="admin2-filters">
							<input
								placeholder="Tìm theo tên notebook"
								value={adminNotebookQuery}
								onChange={(e) => setAdminNotebookQuery(e.target.value)}
							/>
							<select
								value={adminNotebookJlpt}
								onChange={(e) => setAdminNotebookJlpt(e.target.value)}
							>
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
										<th>Notebook</th>
										<th>Mô tả</th>
										<th>Số mục</th>
										<th>Cập nhật</th>
										<th>Hành động</th>
									</tr>
								</thead>
								<tbody>
									{adminNotebooks.map((item) => (
										<tr key={item.id}>
											<td>{item.name}</td>
											<td>{item.description || "-"}</td>
											<td>{item.itemsCount || 0}</td>
											<td>{new Date(item.updatedAt).toLocaleString("vi-VN")}</td>
											<td>
												<div className="row-actions">

													<button type="button" onClick={() => handleEditAdminNotebook(item)}>
														Sửa
													</button>
													<button
														type="button"
														className="danger"
														onClick={() => handleDeleteAdminNotebook(item.id)}
													>
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

			{tab === "user_notebooks" && (
				<div className="admin2-grid">
					<div className="admin2-panel">
						<h3>Sửa notebook người dùng</h3>
						<div className="admin2-form-grid">
							<input
								placeholder="Tên notebook"
								value={userNotebookForm.name}
								onChange={(e) => setUserNotebookForm((prev) => ({ ...prev, name: e.target.value }))}
							/>
							<textarea
								placeholder="Mô tả"
								value={userNotebookForm.description}
								onChange={(e) =>
									setUserNotebookForm((prev) => ({ ...prev, description: e.target.value }))
								}
							/>
						</div>
						<div className="admin2-actions">
							<button type="button" onClick={handleSaveUserNotebook}>
								Lưu notebook user
							</button>
							<button
								type="button"
								className="ghost"
								onClick={() => {
									setEditingUserNotebookId(null);
									setUserNotebookForm(defaultNotebookForm);
								}}
							>
								Làm mới
							</button>
						</div>
					</div>


					<div className="admin2-panel">
						<h3>Danh sách notebook người dùng</h3>
						<div className="admin2-filters">
							<input
								placeholder="Tìm theo tên notebook"
								value={userNotebookQuery}
								onChange={(e) => setUserNotebookQuery(e.target.value)}
							/>
							<input
								placeholder="Tìm theo username/email"
								value={userNotebookOwnerQuery}
								onChange={(e) => setUserNotebookOwnerQuery(e.target.value)}
							/>
							<select
								value={userNotebookOwnerStatus}
								onChange={(e) => setUserNotebookOwnerStatus(e.target.value)}
							>
								<option value="">Tất cả trạng thái user</option>
								<option value="active">active</option>
								<option value="suspended">suspended</option>
							</select>
						</div>
						<div className="admin2-table-wrap">
							<table className="admin2-table">
								<thead>
									<tr>
										<th>Notebook</th>
										<th>Chủ sở hữu</th>
										<th>Email</th>
										<th>Trạng thái</th>
										<th>Số mục</th>
										<th>Cập nhật</th>
										<th>Hành động</th>
									</tr>
								</thead>
								<tbody>
									{userNotebooks.map((item) => (
										<tr key={item.id}>
											<td>{item.name}</td>
											<td>{item.owner?.username || "Unknown"}</td>
											<td>{item.owner?.email || "-"}</td>
											<td>{item.owner?.status || "-"}</td>
											<td>{item.itemsCount || 0}</td>
											<td>{new Date(item.updatedAt).toLocaleString("vi-VN")}</td>
											<td>
												<div className="row-actions">

													<button type="button" onClick={() => handleEditUserNotebook(item)}>Sửa</button>
													<button
														type="button"
														className="danger"
														onClick={() => handleDeleteUserNotebook(item.id)}
													>
														Xóa
													</button>
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
						<div className="admin2-pagination">
							<button
								type="button"
								disabled={(userNotebookPagination.page || 1) <= 1}
								onClick={() =>
									loadUserNotebooks(Math.max(1, (userNotebookPagination.page || 1) - 1))
								}
							>
								Trước
							</button>
							<span>
								Trang {userNotebookPagination.page}/{userNotebookPagination.totalPages} •
								{userNotebookPagination.totalItems} notebook
							</span>
							<button
								type="button"
								disabled={(userNotebookPagination.page || 1) >= (userNotebookPagination.totalPages || 1)}
								onClick={() =>
									loadUserNotebooks(
										Math.min(
											userNotebookPagination.totalPages || 1,
											(userNotebookPagination.page || 1) + 1
										)
									)
								}
							>
								Sau
							</button>
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

			{tab === "reports" && (
				<div className="admin2-grid">
					<div className="admin2-panel">
						<h3>Quản lý báo cáo</h3>
						<div className="admin2-controls">
							<select
								value={reportStatusFilter}
								onChange={(e) => {
									setReportStatusFilter(e.target.value);
									setReportPagination((prev) => ({ ...prev, page: 1 }));
								}}
								className="admin2-input"
							>
								<option value="">Tất cả trạng thái</option>
								<option value="pending">Chờ xử lý</option>
								<option value="resolved">Đã giải quyết</option>
								<option value="dismissed">Bỏ qua</option>
							</select>
							<button onClick={() => loadReports(1)} className="admin2-btn primary">
								Tìm kiếm
							</button>
						</div>
						<div className="admin2-table-wrap">
							<table className="admin2-table">
								<thead>
									<tr>
										<th>Ngày báo cáo</th>
										<th>Người báo cáo</th>
										<th>Loại</th>
										<th>Target ID</th>
										<th>Lý do</th>
										<th>Trạng thái</th>
										<th>Thao tác</th>
									</tr>
								</thead>
								<tbody>
									{reports.map((r) => (
										<tr key={r.id}>
											<td>{new Date(r.createdAt).toLocaleString("vi-VN")}</td>
											<td>{r.reporter?.username || r.reporter?.email || "Unknown"}</td>
											<td>{r.targetType}</td>
											<td>{r.targetId}</td>
											<td>{r.reason}</td>
											<td>
												<span className={`status-badge ${r.status}`}>{r.status}</span>
											</td>
											<td>
												<div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
													<select
														value={r.status}
														onChange={(e) => handleUpdateReportStatus(r.id, e.target.value)}
														className="admin2-input"
													>
														<option value="pending">Pending</option>
														<option value="resolved">Resolved</option>
														<option value="dismissed">Dismissed</option>
													</select>
													{r.status === 'pending' && (
														<button
															type="button"
															className="admin2-btn primary"
															onClick={() => handleUpdateReportStatus(r.id, 'resolved')}
														>
															Hide
														</button>
													)}
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
						<div className="admin2-pagination">
							<button
								type="button"
								disabled={reportPagination.page <= 1}
								onClick={() => setReportPagination((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
							>
								Trước
							</button>
							<span>
								Trang {reportPagination.page}/{reportPagination.totalPages} • {reportPagination.totalItems} bản ghi
							</span>
							<button
								type="button"
								disabled={reportPagination.page >= reportPagination.totalPages}
								onClick={() =>
									setReportPagination((prev) => ({ ...prev, page: Math.min(reportPagination.totalPages, prev.page + 1) }))
								}
							>
								Sau
							</button>
						</div>
					</div>
				</div>
			)}

			{tab === "comments" && (
				<div className="admin2-grid">
					<div className="admin2-panel">
						<h3>Quản lý bình luận</h3>
						<div className="admin2-controls">
							<select
								value={commentTargetType}
								onChange={(e) => {
									setCommentTargetType(e.target.value);
									setCommentPagination((prev) => ({ ...prev, page: 1 }));
								}}
								className="admin2-input"
							>
								<option value="">Tất cả loại mục tiêu</option>
								<option value="word">Từ vựng</option>
								<option value="kanji">Kanji</option>
								<option value="grammar">Ngữ pháp</option>
							</select>
							<select
								value={commentIsHidden}
								onChange={(e) => {
									setCommentIsHidden(e.target.value);
									setCommentPagination((prev) => ({ ...prev, page: 1 }));
								}}
								className="admin2-input"
							>
								<option value="">Tất cả trạng thái ẩn/hiện</option>
								<option value="false">Đang hiện</option>
								<option value="true">Đã ẩn</option>
							</select>
							<button onClick={() => loadComments(1)} className="admin2-btn primary">
								Tìm kiếm
							</button>
						</div>
						<div className="admin2-table-wrap">
							<table className="admin2-table">
								<thead>
									<tr>
										<th>Ngày tạo</th>
										<th>Người dùng</th>
										<th>Loại mục tiêu</th>
										<th>Target ID</th>
										<th>Nội dung</th>
										<th>Ẩn/Hiện</th>
										<th>Thao tác</th>
									</tr>
								</thead>
								<tbody>
									{comments.map((c) => (
										<tr key={c.id} className={c.isHidden ? "text-muted" : ""}>
											<td>{new Date(c.createdAt).toLocaleString("vi-VN")}</td>
											<td>{c.user?.username || c.user?.email || "Unknown"}</td>
											<td>{c.targetType}</td>
											<td>{c.targetId}</td>
											<td style={{ maxWidth: "300px", wordBreak: "break-word" }}>{c.content}</td>
											<td>
												<span className={`status-badge ${c.isHidden ? "suspended" : "active"}`}>
													{c.isHidden ? "Hidden" : "Visible"}
												</span>
											</td>
											<td>
												<button
													className="admin2-btn secondary"
													onClick={() => handleToggleCommentVisibility(c)}
													style={{ marginRight: "8px" }}
												>
													{c.isHidden ? "Hiện" : "Ẩn"}
												</button>
												<button
													className="admin2-btn danger"
													onClick={() => handleDeleteComment(c.id)}
												>
													Xóa
												</button>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
						<div className="admin2-pagination">
							<button
								type="button"
								disabled={commentPagination.page <= 1}
								onClick={() => setCommentPagination((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
							>
								Trước
							</button>
							<span>
								Trang {commentPagination.page}/{commentPagination.totalPages} • {commentPagination.totalItems} bản ghi
							</span>
							<button
								type="button"
								disabled={commentPagination.page >= commentPagination.totalPages}
								onClick={() =>
									setCommentPagination((prev) => ({ ...prev, page: Math.min(commentPagination.totalPages, prev.page + 1) }))
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