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

module.exports = {
	searchWords,
};
