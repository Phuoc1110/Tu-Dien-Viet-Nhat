import axios from "../setup/axios";

const HandleAdminLogin = (data) => {
	return axios
		.post("/api/admin_login", data)
		.then((response) => {
			return response;
		})
		.catch((error) => {
			console.error(error);
		});
};

const getAdminAccount = () => {
	return axios.get("/api/accountAdmin");
};
const LogOutAdmin = () => {
	return axios.post("/api/logoutAdmin");
};

const getAdminDashboard = () => axios.get("/api/admin/dashboard");

const getAdminVocabularies = (params = {}) =>
	axios.get("/api/admin/vocabularies", { params });

const createAdminVocabulary = (data) => axios.post("/api/admin/vocabularies", data);

const updateAdminVocabulary = (id, data) =>
	axios.put(`/api/admin/vocabularies/${id}`, data);

const deleteAdminVocabulary = (id) => axios.delete(`/api/admin/vocabularies/${id}`);

const updateAdminVocabularyJlpt = (id, jlptLevel) =>
	axios.patch(`/api/admin/vocabularies/${id}/jlpt`, { jlptLevel });

const getAdminUsers = (params = {}) => axios.get("/api/admin/users", { params });

const updateAdminUserRole = (id, role) =>
	axios.patch(`/api/admin/users/${id}/role`, { role });

const updateAdminUserStatus = (id, status) =>
	axios.patch(`/api/admin/users/${id}/status`, { status });

const resetAdminUserPassword = (id, newPassword) =>
	axios.post(`/api/admin/users/${id}/reset-password`, { newPassword });

const getAdminAuditLogs = (params = {}) =>
	axios.get("/api/admin/audit-logs", { params });

const getAdminNotebookCollections = (params = {}) =>
	axios.get("/api/admin/notebook-collections", { params });

const createAdminNotebookCollection = (data) =>
	axios.post("/api/admin/notebook-collections", data);

const updateAdminNotebookCollection = (id, data) =>
	axios.put(`/api/admin/notebook-collections/${id}`, data);

const deleteAdminNotebookCollection = (id) =>
	axios.delete(`/api/admin/notebook-collections/${id}`);

const getAdminNotebooks = (params = {}) =>
	axios.get("/api/admin/notebooks", { params });

const createAdminNotebook = (data) =>
	axios.post("/api/admin/notebooks", data);

const updateAdminNotebook = (id, data) =>
	axios.put(`/api/admin/notebooks/${id}`, data);

const deleteAdminNotebook = (id) =>
	axios.delete(`/api/admin/notebooks/${id}`);

const getAdminNotebookBulkSummary = (id, params = {}) =>
	axios.get(`/api/admin/notebooks/${id}/add-by-jlpt/summary`, { params });

const addAdminNotebookItemsByJlpt = (id, data) =>
	axios.post(`/api/admin/notebooks/${id}/add-by-jlpt`, data);

export {
    HandleAdminLogin,
    getAdminAccount,
    LogOutAdmin,
    getAdminDashboard,
    getAdminVocabularies,
    createAdminVocabulary,
    updateAdminVocabulary,
    deleteAdminVocabulary,
    updateAdminVocabularyJlpt,
    getAdminUsers,
    updateAdminUserRole,
    updateAdminUserStatus,
    resetAdminUserPassword,
    getAdminAuditLogs,
	getAdminNotebookCollections,
	createAdminNotebookCollection,
	updateAdminNotebookCollection,
	deleteAdminNotebookCollection,
	getAdminNotebooks,
	createAdminNotebook,
	updateAdminNotebook,
	deleteAdminNotebook,
	getAdminNotebookBulkSummary,
	addAdminNotebookItemsByJlpt,
};