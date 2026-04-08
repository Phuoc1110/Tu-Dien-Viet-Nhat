import db from "../models/index";
import { Op } from "sequelize";
import axios from "axios";

const splitVariants = (raw) =>
	String(raw || "")
		.split(/[;；,，、|/]+/)
		.map((item) => item.trim())
		.filter(Boolean);

const buildWordExampleConditions = (word) => {
	const variants = [
		...splitVariants(word?.word),
		...splitVariants(word?.reading),
		...splitVariants(word?.romaji),
	].filter(Boolean);

	if (variants.length === 0) {
		return [];
	}

	return variants.map((variant) => ({
		japaneseSentence: { [Op.like]: `%${variant}%` },
	}));
};

const parseLimit = (limit, fallback = 20, max = 100) => {
	if (!Number.isFinite(+limit)) {
		return fallback;
	}
	return Math.max(1, Math.min(+limit, max));
};

const resolveWordByKeyword = async (rawWord) => {
	const keyword = String(rawWord || "").trim();
	if (!keyword) {
		return null;
	}

	const exactWord = await db.Word.findOne({
		where: { word: keyword },
		attributes: ["id", "word"],
		raw: true,
	});
	if (exactWord) {
		return exactWord;
	}

	const variants = splitVariants(keyword);
	for (const variant of variants) {
		const exactVariant = await db.Word.findOne({
			where: { word: variant },
			attributes: ["id", "word"],
			raw: true,
		});
		if (exactVariant) {
			return exactVariant;
		}
	}

	return db.Word.findOne({
		where: {
			[Op.or]: [{ word: { [Op.like]: `%${keyword}%` } }],
		},
		attributes: ["id", "word"],
		order: [["isCommon", "DESC"], ["id", "ASC"]],
		raw: true,
	});
};

const resolveWordTarget = async ({ wordId, word }) => {
	const normalizedWordId = Number(wordId);
	if (normalizedWordId) {
		const byId = await db.Word.findOne({
			where: { id: normalizedWordId },
			attributes: ["id", "word"],
			raw: true,
		});
		if (byId) {
			return byId;
		}
	}

	return resolveWordByKeyword(word);
};

const getFallbackExamplesForWord = async (word, limit = 5) => {
	const safeLimit = Number.isFinite(+limit) ? Math.max(1, Math.min(+limit, 10)) : 5;
	const conditions = buildWordExampleConditions(word);

	if (conditions.length === 0) {
		return [];
	}

	const examples = await db.Example.findAll({
		where: {
			[Op.or]: conditions,
		},
		attributes: ["id", "japaneseSentence", "vietnameseTranslation", "createdAt"],
		order: [["createdAt", "DESC"]],
		limit: safeLimit,
		raw: true,
	});

	const seen = new Set();
	return examples.filter((item) => {
		const key = `${item.japaneseSentence}__${item.vietnameseTranslation}`;
		if (seen.has(key)) {
			return false;
		}
		seen.add(key);
		return true;
	});
};

let searchWords = (query, limit = 30) => {
	return new Promise(async (resolve, reject) => {
		try {
			const keyword = (query || "").trim();
			const safeLimit = Number.isFinite(+limit)
				? Math.max(1, Math.min(+limit, 100))
				: 30;

			if (!keyword) {
				resolve([]);
				return;
			}

			const words = await db.Word.findAll({
				where: {
					[Op.or]: [
						{ word: { [Op.like]: `%${keyword}%` } },
						{ reading: { [Op.like]: `%${keyword}%` } },
						{ romaji: { [Op.like]: `%${keyword}%` } },
					],
				},
				include: [
					{
						model: db.Meaning,
						as: "meanings",
						attributes: ["id", "definition", "partOfSpeech", "language"],
						required: false,
					},
					{
						model: db.Example,
						as: "examples",
						attributes: ["id", "japaneseSentence", "vietnameseTranslation"],
						required: false,
					},
					{
						model: db.Kanji,
						as: "kanjis",
						attributes: ["id", "characterKanji", "meaning", "kunyomi", "onyomi", "jlptLevel", "strokeCount"],
						through: { attributes: [] },
						required: false,
					},
				],
				order: [
					["isCommon", "DESC"],
					["jlptLevel", "ASC"],
					["word", "ASC"],
				],
				limit: safeLimit,
			});

			for (const word of words) {
				const currentExamples = Array.isArray(word.examples) ? word.examples : [];
				if (currentExamples.length === 0) {
					word.examples = await getFallbackExamplesForWord(word, 5);
				} else {
					word.examples = currentExamples.slice(0, 5);
				}

				// Limit meanings and kanjis
				if (Array.isArray(word.meanings)) {
					word.meanings = word.meanings.slice(0, 2);
				}
				if (Array.isArray(word.kanjis)) {
					word.kanjis = word.kanjis.slice(0, 5);
				}
			}

			resolve(words);
		} catch (e) {
			reject(e);
		}
	});
};

let searchKanjis = (query, limit = 30) => {
	return new Promise(async (resolve, reject) => {
		try {
			const keyword = (query || "").trim();
			const safeLimit = Number.isFinite(+limit)
				? Math.max(1, Math.min(+limit, 100))
				: 30;

			if (!keyword) {
				resolve([]);
				return;
			}

			const kanjiChars = keyword.match(/[\u4e00-\u9faf\u3400-\u4dbf]/g) || [];

			if (kanjiChars.length > 0) {
				const kanjis = await db.Kanji.findAll({
					where: {
						characterKanji: {
							[Op.in]: [...new Set(kanjiChars)],
						},
					},
					include: [
						{
							model: db.Word,
							as: "words",
							attributes: ["id", "word", "reading", "romaji"],
							through: { attributes: [] },
							required: false,
							include: [
								{
									model: db.Meaning,
									as: "meanings",
									attributes: ["id", "definition", "partOfSpeech"],
									required: false,
									limit: 1,
								},
								{
									model: db.Example,
									as: "examples",
									attributes: ["id", "japaneseSentence", "vietnameseTranslation"],
									required: false,
									limit: 2,
								},
							],
						},
					],
					order: [
						["jlptLevel", "ASC"],
						["characterKanji", "ASC"],
					],
				});

				resolve(kanjis);
				return;
			}

			// Fallback for kana/meaning searches when query contains no Kanji.
			const kanjis = await db.Kanji.findAll({
				where: {
					[Op.or]: [
						{ characterKanji: { [Op.like]: `%${keyword}%` } },
						{ meaning: { [Op.like]: `%${keyword}%` } },
						{ kunyomi: { [Op.like]: `%${keyword}%` } },
						{ onyomi: { [Op.like]: `%${keyword}%` } },
					],
				},
				include: [
					{
						model: db.Word,
						as: "words",
						attributes: ["id", "word", "reading", "romaji"],
						through: { attributes: [] },
						required: false,
						include: [
							{
								model: db.Meaning,
								as: "meanings",
								attributes: ["id", "definition", "partOfSpeech"],
								required: false,
								limit: 1,
							},
							{
								model: db.Example,
								as: "examples",
								attributes: ["id", "japaneseSentence", "vietnameseTranslation"],
								required: false,
								limit: 2,
							},
						],
					},
				],
				order: [
					["jlptLevel", "ASC"],
					["characterKanji", "ASC"],
				],
				limit: safeLimit,
			});

			resolve(kanjis);
		} catch (e) {
			reject(e);
		}
	});
};

let searchSentences = (query, limit = 20) => {
	return new Promise(async (resolve, reject) => {
		try {
			const keyword = (query || "").trim();
			const safeLimit = Number.isFinite(+limit)
				? Math.max(1, Math.min(+limit, 100))
				: 20;

			if (!keyword) {
				resolve([]);
				return;
			}

			const examples = await db.Example.findAll({
				where: {
					[Op.or]: [
						{ japaneseSentence: { [Op.like]: `%${keyword}%` } },
						{ vietnameseTranslation: { [Op.like]: `%${keyword}%` } },
					],
				},
				include: [
					{
						model: db.Word,
						as: "word",
						attributes: ["id", "word", "reading", "romaji"],
						required: false,
					},
				],
				order: [["id", "DESC"]],
				// Pull a larger candidate set, then dedupe by sentence content.
				limit: Math.min(safeLimit * 5, 500),
			});

			const seen = new Set();
			const uniqueExamples = [];

			for (const item of examples) {
				const key = `${item.japaneseSentence}__${item.vietnameseTranslation}`;
				if (!seen.has(key)) {
					seen.add(key);
					uniqueExamples.push(item);
				}

				if (uniqueExamples.length >= safeLimit) {
					break;
				}
			}

			resolve(uniqueExamples);
		} catch (e) {
			reject(e);
		}
	});
};

let searchGrammars = (query, limit = 20) => {
	return new Promise(async (resolve, reject) => {
		try {
			const keyword = (query || "").trim();
			const safeLimit = Number.isFinite(+limit)
				? Math.max(1, Math.min(+limit, 100))
				: 20;

			if (!keyword) {
				resolve([]);
				return;
			}

			const grammars = await db.Grammar.findAll({
				where: {
					[Op.or]: [
						{ title: { [Op.like]: `%${keyword}%` } },
						{ meaning: { [Op.like]: `%${keyword}%` } },
						{ formation: { [Op.like]: `%${keyword}%` } },
						{ usageNote: { [Op.like]: `%${keyword}%` } },
					],
				},
				include: [
					{
						model: db.GrammarExample,
						as: "examples",
						attributes: [
							"id",
							"japaneseSentence",
							"readingSentence",
							"vietnameseTranslation",
						],
						required: false,
						limit: 6,
					},
				],
				order: [["jlptLevel", "ASC"], ["title", "ASC"]],
				limit: safeLimit,
			});

			resolve(grammars);
		} catch (e) {
			reject(e);
		}
	});
};

let addSearchHistory = async (userId, searchTerm) => {
	const normalizedUserId = Number(userId);
	const normalizedTerm = String(searchTerm || "").trim();

	if (!normalizedUserId || !normalizedTerm) {
		return null;
	}

	return db.SearchHistory.create({
		userId: normalizedUserId,
		searchTerm: normalizedTerm.slice(0, 100),
		searchedAt: new Date(),
	});
};

let getSearchHistory = async (userId, limit = 80) => {
	const normalizedUserId = Number(userId);
	if (!normalizedUserId) {
		return [];
	}

	const safeLimit = parseLimit(limit, 80, 200);

	const rows = await db.SearchHistory.findAll({
		where: { userId: normalizedUserId },
		attributes: ["id", "searchTerm", "searchedAt"],
		order: [["searchedAt", "DESC"], ["id", "DESC"]],
		limit: safeLimit,
		raw: true,
	});

	return rows.map((item) => ({
		id: item.id,
		word: item.searchTerm,
		meaning: "",
		searchedAt: item.searchedAt,
	}));
};

let clearSearchHistory = async (userId) => {
	const normalizedUserId = Number(userId);
	if (!normalizedUserId) {
		return 0;
	}

	const deleted = await db.SearchHistory.destroy({
		where: { userId: normalizedUserId },
	});

	return deleted;
};

let addWordContribution = async (userId, payload = {}) => {
	const normalizedUserId = Number(userId);
	const text = String(payload.content || "").trim();

	if (!normalizedUserId || !text) {
		return null;
	}

	const resolvedWord = await resolveWordTarget({
		wordId: payload.wordId,
		word: payload.word,
	});
	if (!resolvedWord) {
		return null;
	}

	const created = await db.Comment.create({
		userId: normalizedUserId,
		targetType: "word",
		targetId: resolvedWord.id,
		content: text,
	});

	const createdRow = await db.Comment.findOne({
		where: { id: created.id },
		attributes: ["id", "content", "upvotes", "createdAt"],
		include: [
			{
				model: db.User,
				as: "user",
				attributes: ["id", "username"],
				required: false,
			},
		],
		raw: true,
	});

	return {
		id: createdRow.id,
		word: resolvedWord.word,
		content: createdRow.content,
		author: createdRow["user.username"] || "Bạn",
		createdAt: createdRow.createdAt,
		upvotes: createdRow.upvotes || 0,
	};
};

let getWordContributions = async ({ word, wordId } = {}, limit = 100) => {
	const resolvedWord = await resolveWordTarget({ wordId, word });
	if (!resolvedWord) {
		return [];
	}

	const safeLimit = parseLimit(limit, 100, 200);
	const rows = await db.Comment.findAll({
		where: {
			targetType: "word",
			targetId: resolvedWord.id,
			isHidden: false,
		},
		attributes: ["id", "content", "upvotes", "createdAt"],
		include: [
			{
				model: db.User,
				as: "user",
				attributes: ["id", "username"],
				required: false,
			},
		],
		order: [["createdAt", "DESC"], ["id", "DESC"]],
		limit: safeLimit,
		raw: true,
	});

	return rows.map((item) => ({
		id: item.id,
		word: resolvedWord.word,
		content: item.content,
		author: item["user.username"] || "Bạn",
		createdAt: item.createdAt,
		upvotes: item.upvotes || 0,
	}));
};

let getLatestWordContributions = async (limit = 6) => {
	const safeLimit = parseLimit(limit, 6, 100);

	const rows = await db.Comment.findAll({
		where: {
			targetType: "word",
			isHidden: false,
		},
		attributes: ["id", "targetId", "content", "upvotes", "createdAt"],
		include: [
			{
				model: db.User,
				as: "user",
				attributes: ["id", "username"],
				required: false,
			},
		],
		order: [["createdAt", "DESC"], ["id", "DESC"]],
		limit: safeLimit,
		raw: true,
	});

	const wordIds = [...new Set(rows.map((item) => item.targetId).filter(Boolean))];
	const words = wordIds.length
		? await db.Word.findAll({
				where: { id: { [Op.in]: wordIds } },
				attributes: ["id", "word"],
				raw: true,
		  })
		: [];

	const wordMap = new Map(words.map((item) => [item.id, item.word]));

	return rows
		.map((item) => ({
			id: item.id,
			word: wordMap.get(item.targetId) || "",
			content: item.content,
			author: item["user.username"] || "Bạn",
			createdAt: item.createdAt,
			upvotes: item.upvotes || 0,
		}))
		.filter((item) => item.word);
};

let recognizeKanjiFromInk = async ({ ink, width = 280, height = 280, numResults = 8 }) => {
	const safeNumResults = parseLimit(numResults, 8, 20);
	const safeWidth = parseLimit(width, 280, 1000);
	const safeHeight = parseLimit(height, 280, 1000);

	if (!Array.isArray(ink) || ink.length === 0) {
		return [];
	}

	const requestPayload = {
		input_type: 0,
		requests: [
			{
				language: "ja",
				writing_guide: {
					writing_area_width: safeWidth,
					writing_area_height: safeHeight,
				},
				ink,
				num_results: safeNumResults,
			},
		],
	};

	const { data } = await axios.post(
		"https://inputtools.google.com/request?itc=ja-t-i0-handwrit&app=translate",
		requestPayload,
		{
			headers: { "Content-Type": "application/json" },
			timeout: 8000,
		}
	);

	if (!Array.isArray(data) || data[0] !== "SUCCESS") {
		return [];
	}

	const candidates = data?.[1]?.[0]?.[1];
	if (!Array.isArray(candidates)) {
		return [];
	}

	return candidates
		.map((item) => String(item || "").trim())
		.filter(Boolean)
		.slice(0, safeNumResults);
};

module.exports = {
	searchWords,
	searchKanjis,
	searchSentences,
	searchGrammars,
	recognizeKanjiFromInk,
	addSearchHistory,
	getSearchHistory,
	clearSearchHistory,
	addWordContribution,
	getWordContributions,
	getLatestWordContributions,
};
