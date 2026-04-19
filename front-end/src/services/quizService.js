import axios from "../setup/axios";

const generateQuiz = ({ itemType, itemId, wordId, mode, quizMode = "Multiple_Choice" }) => {
	return axios
		.post("/api/quiz/generate", {
			itemType,
			itemId,
			wordId,
			mode,
			quizMode,
		})
		.then((res) => res)
		.catch((err) => {
			console.error("Generate quiz error:", err);
			return { errCode: 1, errMessage: "Generate quiz failed" };
		});
};

const evaluateQuizAnswer = ({ itemType, itemId, wordId, userAnswer, mode }) => {
	return axios
		.post("/api/quiz/evaluate", {
			itemType,
			itemId,
			wordId,
			userAnswer,
			mode,
		})
		.then((res) => res)
		.catch((err) => {
			console.error("Evaluate quiz error:", err);
			return { errCode: 1, errMessage: "Evaluate answer failed" };
		});
};

const getDueWords = (limit = 20) => {
	return axios
		.get(`/api/quiz/due-words?limit=${limit}`)
		.then((res) => res)
		.catch((err) => {
			console.error("Get due words error:", err);
			return { errCode: 1, errMessage: "Get due words failed", data: [] };
		});
};

const getSRSStats = () => {
	return axios
		.get("/api/quiz/stats")
		.then((res) => res)
		.catch((err) => {
			console.error("Get SRS stats error:", err);
			return { errCode: 1, errMessage: "Get SRS stats failed", data: null };
		});
};

export { generateQuiz, evaluateQuizAnswer, getDueWords, getSRSStats };
