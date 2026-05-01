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

const upsertReadingProgress = (id, status, lastReadAt, completedAt) => {
	return axios
		.post(`/api/reading/passages/${id}/progress`, {
			status,
			lastReadAt,
			completedAt,
		})
		.then((response) => response)
		.catch((error) => {
			console.error(error);
			return { errCode: 1, errMessage: "Khong cap nhat duoc tien do doc." };
		});
};

const getMyReadingProgresses = (params = {}) => {
	return axios
		.get("/api/reading/my-progresses", { params })
		.then((response) => response)
		.catch((error) => {
			console.error(error);
			return { errCode: 1, errMessage: "Khong tai duoc tien do doc cua ban", items: [] };
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

export {
	getReadingPassages,
	getReadingPassageDetail,
	upsertReadingProgress,
	getMyReadingProgresses,
	getPassageAnalysis,
};
