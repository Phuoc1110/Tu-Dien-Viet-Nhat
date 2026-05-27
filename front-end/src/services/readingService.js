import axios from "../setup/axios";

const getReadingPassages = (params = {}) => {
	return axios
		.get("/api/reading/passages", { params })
		.then((response) => response)
		.catch((error) => {
			console.error(error);
			return { errCode: 1, errMessage: "Khong tai duoc danh sach bai doc", items: [] };
		});
};

const getReadingPassageDetail = (id) => {
	return axios
		.get(`/api/reading/passages/${id}`)
		.then((response) => response)
		.catch((error) => {
			console.error(error);
			return { errCode: 1, errMessage: "Khong tai duoc chi tiet bai doc", passage: null };
		});
};

const createReadingPassage = (data = {}) => {
	return axios
		.post("/api/reading/passages", data)
		.then((response) => response)
		.catch((error) => {
			console.error(error);
			return { errCode: 1, errMessage: "Khong tao duoc bai doc", passage: null };
		});
};

const updateReadingPassage = (id, data = {}) => {
	return axios
		.put(`/api/reading/passages/${id}`, data)
		.then((response) => response)
		.catch((error) => {
			console.error(error);
			return { errCode: 1, errMessage: "Khong cap nhat duoc bai doc", passage: null };
		});
};


const getPassageAnalysis = (id) => {
	return axios
		.get(`/api/reading/passages/${id}/analysis`)
		.then((response) => response)
		.catch((error) => {
			console.error(error);
			return { errCode: 1, errMessage: "Khong phan tich duoc bai doc", analysis: null };
		});
};

const checkGrammar = (text) => {
	return axios
		.post("/api/reading/check-grammar", { text })
		.then((response) => response)
		.catch((error) => {
			console.error(error);
			return { errCode: 1, errMessage: "Loi kiem tra ngu phap", data: [] };
		});
};

export {
	getReadingPassages,
	getReadingPassageDetail,
	createReadingPassage,
	updateReadingPassage,
	getPassageAnalysis,
	checkGrammar,
};
