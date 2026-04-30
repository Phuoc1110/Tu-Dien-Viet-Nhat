import adminService from "../service/adminService";

const HandleAdminLogin = async (req, res) => {
	try {
		const { email, password } = req.body || {};
		if (!email || !password) {
			return res.status(400).json({ errcode: 1, message: "Missing inputs parameter!" });
		}

		const data = await adminService.HandleAdminLogin(email, password);
		if (data && data.errCode === 0 && data.DT?.access_token) {
			res.cookie("jwt2", data.DT.access_token, {
				httpOnly: true,
				maxAge: process.env.maxAgeCookie,
				secure: true,
				sameSite: "none",
			});
		}

		return res.status(200).json({
			errcode: data.errCode,
			message: data.errMessage,
			user: data.user || {},
			DT: data.DT,
		});
	} catch (e) {
		console.error("HandleAdminLogin error:", e);
		return res.status(500).json({ errcode: -1, message: "Internal server error" });
	}
};

const getAdminAccount = async (req, res) => {
	if (!req.admin) {
		return res.status(401).json({ errCode: -1, errMessage: "Not Authenticated the admin" });
	}
	return res.status(200).json({
		errCode: 0,
		errMessage: "Ok!",
		DT: {
			access_token: req.adminToken,
			id: req.admin.id,
			email: req.admin.email,
			fullName: req.admin.username || "System Admin",
			role: req.admin.role,
		},
	});
};

const HandleLogOutAdmin = async (_req, res) => {
	try {
		res.clearCookie("jwt2");
		return res.status(200).json({ errCode: 0, errMessage: "Clear cookie done" });
	} catch (e) {
		console.error("HandleLogOutAdmin error:", e);
		return res.status(500).json({ errCode: -1, errMessage: "Error from server" });
	}
};

const ensureAdmin = (req, res) => {
	if (!req.admin && req?.user?.role !== "admin") {
		res.status(403).json({ errCode: -1, errMessage: "Admin permission required" });
		return null;
	}
	return req.admin?.id || req.user?.id || null;
};

const getDashboard = async (req, res) => {
	try {
		if (!ensureAdmin(req, res)) return;
		const data = await adminService.getAdminDashboard();
		return res.status(200).json({ errCode: 0, errMessage: "OK", data });
	} catch (e) {
		console.error("getDashboard error:", e);
		return res.status(500).json({ errCode: -1, errMessage: e.message || "Internal server error" });
	}
};

const getVocabularies = async (req, res) => {
	try {
		if (!ensureAdmin(req, res)) return;
		const data = await adminService.getVocabularies(req.query || {});
		return res.status(200).json({ errCode: 0, errMessage: "OK", data });
	} catch (e) {
		console.error("getVocabularies error:", e);
		return res.status(500).json({ errCode: -1, errMessage: e.message || "Internal server error" });
	}
};

const createVocabulary = async (req, res) => {
	try {
		const adminId = ensureAdmin(req, res);
		if (!adminId) return;
		const created = await adminService.createVocabulary({ adminId, payload: req.body || {} });
		return res.status(200).json({ errCode: 0, errMessage: "Created", data: created });
	} catch (e) {
		console.error("createVocabulary error:", e);
		return res.status(400).json({ errCode: -1, errMessage: e.message || "Create failed" });
	}
};

const updateVocabulary = async (req, res) => {
	try {
		const adminId = ensureAdmin(req, res);
		if (!adminId) return;
		await adminService.updateVocabulary({ adminId, id: req.params.id, payload: req.body || {} });
		return res.status(200).json({ errCode: 0, errMessage: "Updated" });
	} catch (e) {
		console.error("updateVocabulary error:", e);
		return res.status(400).json({ errCode: -1, errMessage: e.message || "Update failed" });
	}
};

const deleteVocabulary = async (req, res) => {
	try {
		const adminId = ensureAdmin(req, res);
		if (!adminId) return;
		await adminService.deleteVocabulary({ adminId, id: req.params.id });
		return res.status(200).json({ errCode: 0, errMessage: "Deleted" });
	} catch (e) {
		console.error("deleteVocabulary error:", e);
		return res.status(400).json({ errCode: -1, errMessage: e.message || "Delete failed" });
	}
};

const updateVocabularyJlpt = async (req, res) => {
	try {
		const adminId = ensureAdmin(req, res);
		if (!adminId) return;
		await adminService.updateVocabularyJlpt({
			adminId,
			id: req.params.id,
			jlptLevel: req.body?.jlptLevel,
		});
		return res.status(200).json({ errCode: 0, errMessage: "Updated" });
	} catch (e) {
		console.error("updateVocabularyJlpt error:", e);
		return res.status(400).json({ errCode: -1, errMessage: e.message || "Update failed" });
	}
};

const getUsers = async (req, res) => {
	try {
		if (!ensureAdmin(req, res)) return;
		const data = await adminService.getUsers(req.query || {});
		return res.status(200).json({ errCode: 0, errMessage: "OK", data });
	} catch (e) {
		console.error("getUsers error:", e);
		return res.status(500).json({ errCode: -1, errMessage: e.message || "Internal server error" });
	}
};

const updateUserRole = async (req, res) => {
	try {
		const adminId = ensureAdmin(req, res);
		if (!adminId) return;
		await adminService.updateUserRole({
			adminId,
			userId: req.params.id,
			role: req.body?.role,
		});
		return res.status(200).json({ errCode: 0, errMessage: "Updated" });
	} catch (e) {
		console.error("updateUserRole error:", e);
		return res.status(400).json({ errCode: -1, errMessage: e.message || "Update failed" });
	}
};

const updateUserStatus = async (req, res) => {
	try {
		const adminId = ensureAdmin(req, res);
		if (!adminId) return;
		await adminService.updateUserStatus({
			adminId,
			userId: req.params.id,
			status: req.body?.status,
		});
		return res.status(200).json({ errCode: 0, errMessage: "Updated" });
	} catch (e) {
		console.error("updateUserStatus error:", e);
		return res.status(400).json({ errCode: -1, errMessage: e.message || "Update failed" });
	}
};

const resetUserPassword = async (req, res) => {
	try {
		const adminId = ensureAdmin(req, res);
		if (!adminId) return;
		await adminService.resetUserPassword({
			adminId,
			userId: req.params.id,
			newPassword: req.body?.newPassword,
		});
		return res.status(200).json({ errCode: 0, errMessage: "Password reset" });
	} catch (e) {
		console.error("resetUserPassword error:", e);
		return res.status(400).json({ errCode: -1, errMessage: e.message || "Reset failed" });
	}
};

const getAuditLogs = async (req, res) => {
	try {
		if (!ensureAdmin(req, res)) return;
		const data = await adminService.getAuditLogs(req.query || {});
		return res.status(200).json({ errCode: 0, errMessage: "OK", data });
	} catch (e) {
		console.error("getAuditLogs error:", e);
		return res.status(500).json({ errCode: -1, errMessage: e.message || "Internal server error" });
	}
};

const getNotebookCollections = async (req, res) => {
	try {
		if (!ensureAdmin(req, res)) return;
		const data = await adminService.getNotebookCollections(req.query || {});
		return res.status(200).json({ errCode: 0, errMessage: "OK", data });
	} catch (e) {
		console.error("getNotebookCollections error:", e);
		return res.status(500).json({ errCode: -1, errMessage: e.message || "Internal server error" });
	}
};

const createNotebookCollection = async (req, res) => {
	try {
		const adminId = ensureAdmin(req, res);
		if (!adminId) return;
		const data = await adminService.createNotebookCollection({ adminId, payload: req.body || {} });
		return res.status(200).json({ errCode: 0, errMessage: "Created", data });
	} catch (e) {
		console.error("createNotebookCollection error:", e);
		return res.status(400).json({ errCode: -1, errMessage: e.message || "Create failed" });
	}
};

const updateNotebookCollection = async (req, res) => {
	try {
		const adminId = ensureAdmin(req, res);
		if (!adminId) return;
		const data = await adminService.updateNotebookCollection({
			adminId,
			id: req.params.id,
			payload: req.body || {},
		});
		return res.status(200).json({ errCode: 0, errMessage: "Updated", data });
	} catch (e) {
		console.error("updateNotebookCollection error:", e);
		return res.status(400).json({ errCode: -1, errMessage: e.message || "Update failed" });
	}
};

const deleteNotebookCollection = async (req, res) => {
	try {
		const adminId = ensureAdmin(req, res);
		if (!adminId) return;
		await adminService.deleteNotebookCollection({ adminId, id: req.params.id });
		return res.status(200).json({ errCode: 0, errMessage: "Deleted" });
	} catch (e) {
		console.error("deleteNotebookCollection error:", e);
		return res.status(400).json({ errCode: -1, errMessage: e.message || "Delete failed" });
	}
};

const getAdminNotebooks = async (req, res) => {
	try {
		const adminId = ensureAdmin(req, res);
		if (!adminId) return;
		const data = await adminService.getAdminNotebooks({
			adminId,
			query: req.query?.query,
			jlptLevel: req.query?.jlptLevel,
			limit: req.query?.limit,
		});
		return res.status(200).json({ errCode: 0, errMessage: "OK", data });
	} catch (e) {
		console.error("getAdminNotebooks error:", e);
		return res.status(500).json({ errCode: -1, errMessage: e.message || "Internal server error" });
	}
};

const createAdminNotebook = async (req, res) => {
	try {
		const adminId = ensureAdmin(req, res);
		if (!adminId) return;
		const data = await adminService.createAdminNotebook({ adminId, payload: req.body || {} });
		return res.status(200).json({ errCode: 0, errMessage: "Created", data });
	} catch (e) {
		console.error("createAdminNotebook error:", e);
		return res.status(400).json({ errCode: -1, errMessage: e.message || "Create failed" });
	}
};

const addAdminNotebookItemsByJlpt = async (req, res) => {
	try {
		const adminId = ensureAdmin(req, res);
		if (!adminId) return;
		const data = await adminService.addAdminNotebookItemsByJlpt({
			adminId,
			notebookId: req.params.id,
			jlptLevel: req.body?.jlptLevel,
			limit: req.body?.limit,
		});
		return res.status(200).json({ errCode: 0, errMessage: "Updated", data });
	} catch (e) {
		console.error("addAdminNotebookItemsByJlpt error:", e);
		return res.status(400).json({ errCode: -1, errMessage: e.message || "Update failed" });
	}
};

module.exports = {
	HandleAdminLogin,
	getAdminAccount,
	HandleLogOutAdmin,
	getDashboard,
	getVocabularies,
	createVocabulary,
	updateVocabulary,
	deleteVocabulary,
	updateVocabularyJlpt,
	getUsers,
	updateUserRole,
	updateUserStatus,
	resetUserPassword,
	getAuditLogs,
	getNotebookCollections,
	createNotebookCollection,
	updateNotebookCollection,
	deleteNotebookCollection,
	getAdminNotebooks,
	createAdminNotebook,
	addAdminNotebookItemsByJlpt,
};
