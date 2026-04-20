import quizService from "../service/quizService";

/**
 * Handler: Sinh câu hỏi quiz
 * POST /api/quiz/generate
 * Body: { itemType?, itemId?, wordId?, mode?, quizMode? }
 */
let HandleGenerateQuiz = async (req, res) => {
	try {
		const { itemType, itemId, wordId, mode, quizMode } = req.body;
		const resolvedItemId = itemId || wordId;
		const resolvedItemType = itemType || (wordId ? "word" : null);

		if (!resolvedItemId || !resolvedItemType) {
			return res.status(400).json({
				errCode: 1,
				errMessage: "Missing required fields: itemType/itemId (or wordId)",
			});
		}

		const quiz = await quizService.generateQuiz({
			itemType: resolvedItemType,
			itemId: resolvedItemId,
			wordId,
			mode,
			quizMode,
		});

		return res.status(200).json({
			errCode: 0,
			errMessage: "OK",
			data: {
				questionId: quiz.questionId,
				questionText: quiz.questionText,
				options: quiz.options,
				mode: quiz.mode,
				quizMode: quiz.quizMode,
				itemType: quiz.itemType,
				itemId: quiz.itemId,
				wordId: quiz.wordId,
			},
		});
	} catch (e) {
		console.error("HandleGenerateQuiz error:", e);
		return res.status(500).json({
			errCode: -1,
			errMessage: e.message || "Internal server error",
		});
	}
};

/**
 * Handler: Đánh giá câu trả lời
 * POST /api/quiz/evaluate
 * Body: { itemType?, itemId?, wordId?, userAnswer, mode }
 */
let HandleEvaluateAnswer = async (req, res) => {
	try {
		const userId = req.user?.id; // From JWT middleware
		const { itemType, itemId, wordId, userAnswer, mode } = req.body;
		const resolvedItemId = itemId || wordId;
		const resolvedItemType = itemType || (wordId ? "word" : null);

		if (!userId || !resolvedItemId || !resolvedItemType || !userAnswer || !mode) {
			return res.status(400).json({
				errCode: 1,
				errMessage: "Missing required fields: userId, itemType/itemId (or wordId), userAnswer, mode",
			});
		}

		const result = await quizService.evaluateAnswer(userId, {
			itemType: resolvedItemType,
			itemId: resolvedItemId,
			wordId,
			userAnswer,
			mode,
		});

		return res.status(200).json({
			errCode: 0,
			errMessage: result.message,
			data: {
				isCorrect: result.isCorrect,
				isRemembered: result.isRemembered,
				correctAnswer: result.correctAnswer,
			},
		});
	} catch (e) {
		console.error("HandleEvaluateAnswer error:", e);
		return res.status(500).json({
			errCode: -1,
			errMessage: e.message || "Internal server error",
		});
	}
};

/**
 * Handler: Cập nhật trạng thái flashcard (đã thuộc / chưa thuộc)
 * POST /api/quiz/flashcard-review
 * Body: { itemType?, itemId?, wordId?, action }
 */
let HandleFlashcardReview = async (req, res) => {
	try {
		const userId = req.user?.id;
		const { itemType, itemId, wordId, action } = req.body;
		const resolvedItemId = itemId || wordId;
		const resolvedItemType = itemType || (wordId ? "word" : null);

		if (!userId || !resolvedItemId || !resolvedItemType || !action) {
			return res.status(400).json({
				errCode: 1,
				errMessage: "Missing required fields: userId, itemType/itemId (or wordId), action",
			});
		}

		const result = await quizService.updateFlashcardReview(userId, {
			itemType: resolvedItemType,
			itemId: resolvedItemId,
			wordId,
			action,
		});

		return res.status(200).json({
			errCode: 0,
			errMessage: result.message,
			data: {
				action: result.action,
				isRemembered: result.isRemembered,
			},
		});
	} catch (e) {
		console.error("HandleFlashcardReview error:", e);
		return res.status(500).json({
			errCode: -1,
			errMessage: e.message || "Internal server error",
		});
	}
};

export default {
	HandleGenerateQuiz,
	HandleEvaluateAnswer,
	HandleFlashcardReview,
};
