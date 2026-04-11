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

const addNotebookItem = (notebookId, data) => {
	return axios
		.post(`/api/notebooks/${notebookId}/items`, data)
		.then((response) => response)
		.catch((error) => {
			console.error(error);
			return { errCode: 1, errMessage: "Không thêm được mục vào sổ tay" };
		});
};

export {
	getNotebookOverview,
	getNotebookDetail,
	createNotebook,
	addNotebookItem,
};