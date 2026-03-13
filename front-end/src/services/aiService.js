import axios from "../setup/axios_AI";

const checkNSFWContent = (formData) => {
	return axios
		.post("/ai/predict", formData, {
			headers: {
				"Content-Type": "multipart/form-data",
			},
		})
		.then((response) => {
			return response;
		})
		.catch((err) => {
			console.log("NSFW Check Error:", err);
			throw err;
		});
};

const checkToxicComment = (commentText) => {
	return axios
		.post("/ai/toxicity", { text: commentText })
		.then((response) => {
			return response;
		})
		.catch((err) => {
			console.log("Toxic Comment Check Error:", err);
			throw err;
		});
};

const checkVideoViolence = (formData) => {
	return axios
		.post("/api/check-violence", formData, {
			headers: { "Content-Type": "multipart/form-data" },
		})
		.then((response) => response)
		.catch((err) => {
			console.log("Violence Check Error:", err);
			throw err;
		});
};

export { checkNSFWContent, checkToxicComment, checkVideoViolence };
