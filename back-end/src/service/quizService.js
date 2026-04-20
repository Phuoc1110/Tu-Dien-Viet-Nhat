import db from "../models/index";
import { Op } from "sequelize";

const VALID_ITEM_TYPES = ["word", "kanji", "grammar"];
const VALID_QUESTION_MODES = ["reading", "meaning", "kanji", "grammar"];
const VALID_QUIZ_MODES = ["Multiple_Choice", "Typing"];
const VALID_LAST_MODES = ["reading", "meaning", "kanji"];

const hasKanji = (word) => /[\u4E00-\u9FFF]/g.test(String(word || ""));

const isHiragana = (text) => {
	if (!text) return false;
	return /^[\u3040-\u309F\u3099-\u309C\s]+$/.test(text);
};

const isKatakana = (text) => {
	if (!text) return false;
	return /^[\u30A0-\u30FF\u31F0-\u31FF\s]+$/.test(text);
};

const normalizeAnswer = (text) => String(text || "").toLowerCase().trim().replace(/\s+/g, "");

const firstToken = (text) => String(text || "")
	.split(/[;；,、/\n\s]+/)
	.map((item) => item.trim())
	.filter(Boolean)[0] || "";

const uniqueTexts = (items = []) => {
	const seen = new Set();
	const result = [];
	for (const item of items) {
		const text = String(item || "").trim();
		if (!text) continue;
		const key = text.toLowerCase();
		if (!seen.has(key)) {
			seen.add(key);
			result.push(text);
		}
	}
	return result;
};

const shuffle = (list = []) => {
	const arr = [...list];
	for (let i = arr.length - 1; i > 0; i -= 1) {
		const j = Math.floor(Math.random() * (i + 1));
		[arr[i], arr[j]] = [arr[j], arr[i]];
	}
	return arr;
};

const buildOptions = (correctAnswer, distractors = [], total = 4) => {
	const choices = uniqueTexts([correctAnswer, ...distractors]).filter(Boolean);
	const fallbackPool = ["Không rõ", "Khác", "Không biết", "Đáp án khác"];
	for (const fallback of fallbackPool) {
		if (choices.length >= total) break;
		if (!choices.includes(fallback)) {
			choices.push(fallback);
		}
	}
	return shuffle(choices.slice(0, total));
};

const getDaysForStage = (stage) => {
	const stageToDays = {
		1: 1,
		2: 3,
		3: 7,
		4: 14,
		5: 30,
	};
	return stageToDays[stage] || 1;
};

const getDistractorWords = async (excludeId, jlptLevel, count = 3) => {
	const where = {
		id: { [Op.ne]: excludeId },
	};
	if (jlptLevel) {
		where.jlptLevel = jlptLevel;
	}
	return db.Word.findAll({
		where,
		include: [{ model: db.Meaning, as: "meanings", required: false, attributes: ["definition", "language"] }],
		attributes: ["id", "word", "reading", "jlptLevel"],
		order: db.sequelize.random(),
		limit: count,
		raw: false,
	});
};

const getDistractorKanjis = async (excludeId, jlptLevel, count = 3) => {
	const where = {
		id: { [Op.ne]: excludeId },
	};
	if (jlptLevel) {
		where.jlptLevel = jlptLevel;
	}
	return db.Kanji.findAll({
		where,
		attributes: ["id", "characterKanji", "meaning", "onyomi", "kunyomi", "jlptLevel"],
		order: db.sequelize.random(),
		limit: count,
		raw: true,
	});
};

const getDistractorGrammars = async (excludeId, jlptLevel, count = 3) => {
	const where = {
		id: { [Op.ne]: excludeId },
	};
	if (jlptLevel) {
		where.jlptLevel = jlptLevel;
	}
	return db.Grammar.findAll({
		where,
		attributes: ["id", "title", "meaning", "usageNote", "jlptLevel"],
		order: db.sequelize.random(),
		limit: count,
		raw: true,
	});
};

const resolveItemTypeAndId = ({ itemType, itemId, wordId }) => {
	const resolvedType = String(itemType || (wordId ? "word" : "")).trim().toLowerCase();
	const resolvedId = Number(itemId || wordId);
	if (!VALID_ITEM_TYPES.includes(resolvedType) || !resolvedId) {
		throw new Error("Invalid itemType/itemId. Supported itemType: word, kanji, grammar");
	}
	return { itemType: resolvedType, itemId: resolvedId };
};

const getWordMeaning = (word) => {
	const meanings = word?.meanings || [];
	const viMeaning = meanings.find((m) => m.language === "vi");
	return viMeaning?.definition || meanings[0]?.definition || "";
};

const loadQuizItem = async (itemType, itemId) => {
	if (itemType === "word") {
		const word = await db.Word.findByPk(itemId, {
			include: [{ model: db.Meaning, as: "meanings", required: false, attributes: ["definition", "language"] }],
			attributes: ["id", "word", "reading", "jlptLevel"],
		});
		if (!word) {
			throw new Error("Word not found");
		}
		const plain = word.get({ plain: true });
		return {
			itemType,
			itemId,
			title: plain.word || "",
			reading: plain.reading || "",
			meaning: getWordMeaning(plain),
			jlptLevel: plain.jlptLevel || null,
			raw: plain,
		};
	}

	if (itemType === "kanji") {
		const kanji = await db.Kanji.findByPk(itemId, {
			attributes: ["id", "characterKanji", "meaning", "onyomi", "kunyomi", "sinoVietnamese", "jlptLevel"],
		});
		if (!kanji) {
			throw new Error("Kanji not found");
		}
		const plain = kanji.get({ plain: true });
		const reading = firstToken(plain.onyomi) || firstToken(plain.kunyomi);
		return {
			itemType,
			itemId,
			title: plain.characterKanji || "",
			reading,
			meaning: String(plain.meaning || plain.sinoVietnamese || "").trim(),
			jlptLevel: plain.jlptLevel || null,
			raw: plain,
		};
	}

	const grammar = await db.Grammar.findByPk(itemId, {
		attributes: ["id", "title", "meaning", "usageNote", "formation", "jlptLevel"],
	});
	if (!grammar) {
		throw new Error("Grammar not found");
	}
	const plain = grammar.get({ plain: true });
	return {
		itemType,
		itemId,
		title: plain.title || "",
		reading: "",
		meaning: String(plain.meaning || plain.usageNote || "").trim(),
		jlptLevel: plain.jlptLevel || null,
		raw: plain,
	};
};

const getSupportedModesForItem = (quizItem) => {
	if (quizItem.itemType === "word") {
		const modes = ["meaning"];
		if (hasKanji(quizItem.title) && quizItem.reading) {
			modes.push("reading");
		}
		if (hasKanji(quizItem.title)) {
			modes.push("kanji");
		}
		return modes;
	}

	if (quizItem.itemType === "kanji") {
		const modes = ["meaning", "kanji"];
		if (quizItem.reading) {
			modes.push("reading");
		}
		return modes;
	}

	return ["meaning", "grammar"];
};

const selectQuestionMode = (requestedMode, supportedModes) => {
	if (requestedMode && supportedModes.includes(requestedMode)) {
		return requestedMode;
	}
	if (supportedModes.includes("meaning") && isKatakana(requestedMode)) {
		return "meaning";
	}
	return supportedModes[Math.floor(Math.random() * supportedModes.length)] || "meaning";
};

const generateWordQuestion = async (item, mode) => {
	if (mode === "reading") {
		const distractors = await getDistractorWords(item.itemId, item.jlptLevel, 4);
		const distractorReadings = distractors.map((d) => d.reading).filter(Boolean);
		return {
			questionText: `Cách đọc của "${item.title}" là gì? (Viết bằng hiragana)`,
			correctAnswer: item.reading,
			distractors: distractorReadings,
		};
	}

	if (mode === "kanji") {
		const distractors = await getDistractorWords(item.itemId, item.jlptLevel, 4);
		const distractorKanjis = distractors.map((d) => d.word).filter(Boolean);
		return {
			questionText: `Từ nào đúng với cách đọc/ý nghĩa "${item.reading || item.meaning}"?`,
			correctAnswer: item.title,
			distractors: distractorKanjis,
		};
	}

	const distractors = await getDistractorWords(item.itemId, item.jlptLevel, 4);
	const distractorMeanings = distractors
		.map((d) => getWordMeaning(d.get({ plain: true })))
		.filter(Boolean);
	return {
		questionText: `Nghĩa tiếng Việt của "${item.title || item.reading}" là gì?`,
		correctAnswer: item.meaning,
		distractors: distractorMeanings,
	};
};

const generateKanjiQuestion = async (item, mode) => {
	if (mode === "reading") {
		const distractors = await getDistractorKanjis(item.itemId, item.jlptLevel, 4);
		const distractorReadings = distractors
			.map((d) => firstToken(d.onyomi) || firstToken(d.kunyomi))
			.filter(Boolean);
		return {
			questionText: `Cách đọc phổ biến của kanji "${item.title}" là gì?`,
			correctAnswer: item.reading,
			distractors: distractorReadings,
		};
	}

	if (mode === "kanji") {
		const distractors = await getDistractorKanjis(item.itemId, item.jlptLevel, 4);
		const distractorChars = distractors.map((d) => d.characterKanji).filter(Boolean);
		return {
			questionText: `Kanji nào phù hợp với nghĩa "${item.meaning}"?`,
			correctAnswer: item.title,
			distractors: distractorChars,
		};
	}

	const distractors = await getDistractorKanjis(item.itemId, item.jlptLevel, 4);
	const distractorMeanings = distractors.map((d) => d.meaning || d.sinoVietnamese).filter(Boolean);
	return {
		questionText: `Nghĩa của kanji "${item.title}" là gì?`,
		correctAnswer: item.meaning,
		distractors: distractorMeanings,
	};
};

const generateGrammarQuestion = async (item, mode) => {
	if (mode === "grammar") {
		const distractors = await getDistractorGrammars(item.itemId, item.jlptLevel, 4);
		const distractorTitles = distractors.map((d) => d.title).filter(Boolean);
		return {
			questionText: `Mẫu ngữ pháp nào mang nghĩa "${item.meaning}"?`,
			correctAnswer: item.title,
			distractors: distractorTitles,
		};
	}

	const distractors = await getDistractorGrammars(item.itemId, item.jlptLevel, 4);
	const distractorMeanings = distractors.map((d) => d.meaning || d.usageNote).filter(Boolean);
	return {
		questionText: `Nghĩa của mẫu ngữ pháp "${item.title}" là gì?`,
		correctAnswer: item.meaning,
		distractors: distractorMeanings,
	};
};

const generateQuiz = async (itemIdOrPayload, mode = null, quizMode = "Multiple_Choice") => {
	try {
		let payload;
		if (typeof itemIdOrPayload === "object" && itemIdOrPayload !== null) {
			payload = {
				itemType: itemIdOrPayload.itemType,
				itemId: itemIdOrPayload.itemId,
				wordId: itemIdOrPayload.wordId,
				mode: itemIdOrPayload.mode,
				quizMode: itemIdOrPayload.quizMode || quizMode,
			};
		} else {
			payload = { wordId: itemIdOrPayload, mode, quizMode };
		}

		if (payload.mode && !VALID_QUESTION_MODES.includes(payload.mode)) {
			throw new Error("Invalid mode. Supported: reading, meaning, kanji, grammar");
		}
		if (!VALID_QUIZ_MODES.includes(payload.quizMode || "Multiple_Choice")) {
			throw new Error("Invalid quizMode. Supported: Multiple_Choice, Typing");
		}

		const { itemType, itemId } = resolveItemTypeAndId(payload);
		const item = await loadQuizItem(itemType, itemId);
		const supportedModes = getSupportedModesForItem(item);
		const selectedMode = selectQuestionMode(payload.mode || null, supportedModes);

		let generated;
		if (itemType === "word") {
			generated = await generateWordQuestion(item, selectedMode);
		} else if (itemType === "kanji") {
			generated = await generateKanjiQuestion(item, selectedMode);
		} else {
			generated = await generateGrammarQuestion(item, selectedMode);
		}

		if (!generated.correctAnswer) {
			throw new Error("Cannot generate quiz: missing correct answer");
		}

		const options = (payload.quizMode || "Multiple_Choice") === "Typing"
			? null
			: buildOptions(generated.correctAnswer, generated.distractors, 4);

		return {
			questionId: `${itemType}-${itemId}-${Date.now()}`,
			questionText: generated.questionText,
			options,
			correctAnswer: generated.correctAnswer,
			mode: selectedMode,
			quizMode: payload.quizMode || "Multiple_Choice",
			itemType,
			itemId,
			wordId: itemType === "word" ? itemId : null,
		};
	} catch (e) {
		console.error("generateQuiz error:", e);
		throw e;
	}
};

const getCorrectAnswerByMode = (item, mode) => {
	if (mode === "reading") {
		return item.reading || "";
	}
	if (mode === "kanji") {
		return item.title || "";
	}
	if (mode === "grammar") {
		return item.title || "";
	}
	return item.meaning || "";
};

const evaluateAnswer = async (userId, itemIdOrPayload, userAnswer, mode, itemType = "word") => {
	try {
		let payload;
		if (typeof itemIdOrPayload === "object" && itemIdOrPayload !== null) {
			payload = {
				itemType: itemIdOrPayload.itemType,
				itemId: itemIdOrPayload.itemId,
				wordId: itemIdOrPayload.wordId,
				userAnswer: itemIdOrPayload.userAnswer,
				mode: itemIdOrPayload.mode,
			};
		} else {
			payload = {
				itemType,
				itemId: itemIdOrPayload,
				wordId: itemType === "word" ? itemIdOrPayload : null,
				userAnswer,
				mode,
			};
		}

		if (!VALID_QUESTION_MODES.includes(payload.mode)) {
			throw new Error("Invalid mode. Supported: reading, meaning, kanji, grammar");
		}

		const { itemType: resolvedType, itemId: resolvedId } = resolveItemTypeAndId(payload);
		const item = await loadQuizItem(resolvedType, resolvedId);
		const correctAnswer = getCorrectAnswerByMode(item, payload.mode);

		if (!correctAnswer) {
			throw new Error("Cannot evaluate: missing correct answer for this mode");
		}

		const normalizedUserAnswer = normalizeAnswer(payload.userAnswer);
		const normalizedCorrectAnswer = normalizeAnswer(correctAnswer);
		const isCorrect = normalizedUserAnswer === normalizedCorrectAnswer;

		let userReview = await db.UserReview.findOne({
			where: {
				userId,
				itemType: resolvedType,
				itemId: resolvedId,
			},
		});

		const persistedMode = VALID_LAST_MODES.includes(payload.mode) ? payload.mode : "meaning";

		if (!userReview) {
			userReview = await db.UserReview.create({
				userId,
				itemType: resolvedType,
				itemId: resolvedId,
				srs_stage: 0,
				last_mode: persistedMode,
				nextReviewAt: new Date(),
			});
		}

		let newStage = userReview.srs_stage || 0;
		let nextReviewDate;

		if (isCorrect) {
			newStage = Math.min(newStage + 1, 6);
			if (newStage >= 6) {
				nextReviewDate = null;
			} else {
				nextReviewDate = new Date();
				nextReviewDate.setDate(nextReviewDate.getDate() + getDaysForStage(newStage));
			}
		} else {
			newStage = 0;
			nextReviewDate = new Date();
		}

		await userReview.update({
			srs_stage: newStage,
			last_mode: persistedMode,
			nextReviewAt: nextReviewDate,
			lastReviewedAt: new Date(),
			reviewCount: (userReview.reviewCount || 0) + 1,
		});

		return {
			isCorrect,
			newStage,
			nextReviewDate,
			correctAnswer,
			message: isCorrect ? `Chính xác! Stage tăng lên ${newStage}` : "Sai rồi, reset về stage 0",
		};
	} catch (e) {
		console.error("evaluateAnswer error:", e);
		throw e;
	}
};

export default {
	generateQuiz,
	evaluateAnswer,
	hasKanji,
	isHiragana,
	isKatakana,
};
