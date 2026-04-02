import db from "../models/index";
import { Op } from "sequelize";

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
						limit: 2,
					},
					{
						model: db.Example,
						as: "examples",
						attributes: ["id", "japaneseSentence", "vietnameseTranslation"],
						required: false,
						limit: 3,
					},
				],
				order: [
					["isCommon", "DESC"],
					["jlptLevel", "ASC"],
					["word", "ASC"],
				],
				limit: safeLimit,
			});

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

module.exports = {
	searchWords,
	searchKanjis,
	searchSentences,
};
