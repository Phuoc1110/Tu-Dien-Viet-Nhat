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

const reviewFlashcard = ({ itemType, itemId, wordId, action }) => {
	return axios
		.post("/api/quiz/flashcard-review", {
			itemType,
			itemId,
			wordId,
			action,
		})
		.then((res) => res)
		.catch((err) => {
			console.error("Flashcard review error:", err);
			return { errCode: 1, errMessage: "Flashcard review failed" };
		});
};

export { generateQuiz, evaluateQuizAnswer, reviewFlashcard };
