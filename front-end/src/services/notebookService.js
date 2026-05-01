import axios from "../setup/axios";

const getNotebookOverview = (limit = 6) => {
	return axios
		.get(`/api/notebooks/overview?limit=${limit}`)
		.then((response) => response)
		.catch((error) => {
			console.error(error);
			return { errCode: 1, errMessage: "Không tải được sổ tay", myNotebooks: [], discoverNotebooks: [] };
		});
};

const getNotebookDetail = (id) => {
	return axios
		.get(`/api/notebooks/${id}`)
		.then((response) => response)
		.catch((error) => {
			console.error(error);
			return { errCode: 1, errMessage: "Không tải được sổ tay", notebook: null };
		});
};

const createNotebook = (data) => {
	return axios
		.post("/api/notebooks", data)
		.then((response) => response)
		.catch((error) => {
			console.error(error);
			return { errCode: 1, errMessage: "Không tạo được sổ tay" };
		});
};

const getCuratedNotebookCollections = (limit = 12) => {
	return axios
		.get(`/api/notebooks/curated?limit=${limit}`)
		.then((response) => response)
		.catch((error) => {
			console.error(error);
			return { errCode: 1, errMessage: "Không tải được bộ sổ tay biên soạn", curatedNotebooks: [] };
		});
};

const addNotebookItem = (notebookId, data) => {
	return axios
		.post(`/api/notebooks/${notebookId}/items`, data)
		.then((response) => response)
		.catch((error) => {
			console.error(error);
			return { errCode: 1, errMessage: "Không thêm được mục vào sổ tay" };
		});
};

	const updateNotebook = (notebookId, data) => {
		return axios
			.put(`/api/notebooks/${notebookId}`, data)
			.then((response) => response)
			.catch((error) => {
				console.error(error);
				return { errCode: 1, errMessage: "Không sửa được sổ tay" };
			});
	};

	const deleteNotebook = (notebookId) => {
		return axios
			.delete(`/api/notebooks/${notebookId}`)
			.then((response) => response)
			.catch((error) => {
				console.error(error);
				return { errCode: 1, errMessage: "Không xóa được sổ tay" };
			});
	};

export {
	getNotebookOverview,
	getNotebookDetail,
	createNotebook,
	getCuratedNotebookCollections,
	addNotebookItem,
	updateNotebook,
	deleteNotebook,
};