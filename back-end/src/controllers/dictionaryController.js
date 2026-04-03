import dictionaryService from "../service/dictionaryService";

let HandleSearchWords = async (req, res) => {
	try {
		let query = req.query.q || req.query.keyword || "";
		let limit = req.query.limit || 30;

		if (!query || !query.trim()) {
			return res.status(200).json({
				errCode: 1,
				errMessage: "Missing query",
				words: [],
			});
		}

		let words = await dictionaryService.searchWords(query, limit);

		return res.status(200).json({
			errCode: 0,
			errMessage: "OK",
			words,
		});
	} catch (e) {
		console.error("HandleSearchWords error:", e);
		return res.status(500).json({
			errCode: -1,
			errMessage: "Internal server error",
			words: [],
		});
	}
};

let HandleSearchKanjis = async (req, res) => {
	try {
		let query = req.query.q || req.query.keyword || "";
		let limit = req.query.limit || 30;

		if (!query || !query.trim()) {
			return res.status(200).json({
				errCode: 1,
				errMessage: "Missing query",
				kanjis: [],
			});
		}

		let kanjis = await dictionaryService.searchKanjis(query, limit);

		return res.status(200).json({
			errCode: 0,
			errMessage: "OK",
			kanjis,
		});
	} catch (e) {
		console.error("HandleSearchKanjis error:", e);
		return res.status(500).json({
			errCode: -1,
			errMessage: "Internal server error",
			kanjis: [],
		});
	}
};

let HandleSearchSentences = async (req, res) => {
	try {
		let query = req.query.q || req.query.keyword || "";
		let limit = req.query.limit || 20;

		if (!query || !query.trim()) {
			return res.status(200).json({
				errCode: 1,
				errMessage: "Missing query",
				sentences: [],
			});
		}

		let sentences = await dictionaryService.searchSentences(query, limit);

		return res.status(200).json({
			errCode: 0,
			errMessage: "OK",
			sentences,
		});
	} catch (e) {
		console.error("HandleSearchSentences error:", e);
		return res.status(500).json({
			errCode: -1,
			errMessage: "Internal server error",
			sentences: [],
		});
	}
};

let HandleSearchGrammars = async (req, res) => {
	try {
		let query = req.query.q || req.query.keyword || "";
		let limit = req.query.limit || 20;

		if (!query || !query.trim()) {
			return res.status(200).json({
				errCode: 1,
				errMessage: "Missing query",
				grammars: [],
			});
		}

		let grammars = await dictionaryService.searchGrammars(query, limit);

		return res.status(200).json({
			errCode: 0,
			errMessage: "OK",
			grammars,
		});
	} catch (e) {
		console.error("HandleSearchGrammars error:", e);
		return res.status(500).json({
			errCode: -1,
			errMessage: "Internal server error",
			grammars: [],
		});
	}
};

module.exports = {
	HandleSearchWords,
	HandleSearchKanjis,
	HandleSearchSentences,
	HandleSearchGrammars,
};
