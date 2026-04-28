import fs from "fs";
import os from "os";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import dictionaryService from "../service/dictionaryService";

const execFileAsync = promisify(execFile);
const AI_PYTHON_PATH = path.resolve(__dirname, "../../../AI/.venv/bin/python");
const AI_RUN_SCRIPT_PATH = path.resolve(__dirname, "../../../AI/Script/run.py");

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

let HandleRecognizeKanji = async (req, res) => {
	try {
		const ink = req.body?.ink;
		const width = req.body?.width || 280;
		const height = req.body?.height || 280;
		const numResults = req.body?.numResults || 20;

		if (!Array.isArray(ink) || ink.length === 0) {
			return res.status(200).json({
				errCode: 1,
				errMessage: "Missing ink data",
				candidates: [],
			});
		}

		const candidates = await dictionaryService.recognizeKanjiFromInk({
			ink,
			width,
			height,
			numResults,
		});

		return res.status(200).json({
			errCode: 0,
			errMessage: "OK",
			candidates,
		});
	} catch (e) {
		console.error("HandleRecognizeKanji error:", e);
		return res.status(500).json({
			errCode: -1,
			errMessage: "Internal server error",
			candidates: [],
		});
	}
};

let HandleRecognizeTextFromImage = async (req, res) => {
	const tempImagePath = req.file
		? path.join(
			os.tmpdir(),
			`ocr-${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(req.file.originalname || "") || ".png"}`
		)
		: "";
	try {
		if (!req.file?.buffer || !tempImagePath) {
			return res.status(200).json({
				errCode: 1,
				errMessage: "Missing image file",
				words: [],
				text: "",
			});
		}

		await fs.promises.writeFile(tempImagePath, req.file.buffer);

		const { stdout, stderr } = await execFileAsync(
			AI_PYTHON_PATH,
			[AI_RUN_SCRIPT_PATH, tempImagePath],
			{
				timeout: 120000,
				maxBuffer: 10 * 1024 * 1024,
			}
		);

		if (stderr) {
			console.log("OCR script stderr:", stderr);
		}

		let payload = { words: [], text: "", items: [] };
		const rawOutput = String(stdout || "").trim();
		if (rawOutput) {
			try {
				payload = JSON.parse(rawOutput);
			} catch (parseError) {
				console.error("Parse OCR output error:", parseError, rawOutput);
				return res.status(500).json({
					errCode: -1,
					errMessage: "Invalid OCR output",
					words: [],
					text: "",
				});
			}
		}

		return res.status(200).json({
			errCode: 0,
			errMessage: "OK",
			words: Array.isArray(payload.words) ? payload.words : [],
			text: String(payload.text || "").trim(),
			items: Array.isArray(payload.items) ? payload.items : [],
		});
	} catch (e) {
		console.error("HandleRecognizeTextFromImage error:", e);
		return res.status(500).json({
			errCode: -1,
			errMessage: "Internal server error",
			words: [],
			text: "",
		});
	} finally {
		if (tempImagePath) {
			try {
				await fs.promises.unlink(tempImagePath);
			} catch (unlinkError) {
				if (unlinkError && unlinkError.code !== "ENOENT") {
					console.error("Remove temp OCR image error:", unlinkError);
				}
			}
		}
	}
};

let HandleGetSearchHistory = async (req, res) => {
	try {
		if (!req.user?.id) {
			return res.status(401).json({
				errCode: -2,
				errMessage: "Not Authenticated the user",
				history: [],
			});
		}

		const limit = req.query.limit || 80;
		const offset = req.query.offset || 0;
		const [history, total] = await Promise.all([
			dictionaryService.getSearchHistory(req.user.id, limit, offset),
			dictionaryService.getSearchHistoryTotal(req.user.id),
		]);

		return res.status(200).json({
			errCode: 0,
			errMessage: "OK",
			history,
			total,
		});
	} catch (e) {
		console.error("HandleGetSearchHistory error:", e);
		return res.status(500).json({
			errCode: -1,
			errMessage: "Internal server error",
			history: [],
		});
	}
};

let HandleAddSearchHistory = async (req, res) => {
	try {
		if (!req.user?.id) {
			return res.status(401).json({
				errCode: -2,
				errMessage: "Not Authenticated the user",
			});
		}

		const searchTerm = req.body?.searchTerm || req.body?.word || "";
		if (!String(searchTerm || "").trim()) {
			return res.status(200).json({
				errCode: 1,
				errMessage: "Missing searchTerm",
			});
		}

		await dictionaryService.addSearchHistory(req.user.id, searchTerm);

		return res.status(200).json({
			errCode: 0,
			errMessage: "OK",
		});
	} catch (e) {
		console.error("HandleAddSearchHistory error:", e);
		return res.status(500).json({
			errCode: -1,
			errMessage: "Internal server error",
		});
	}
};

let HandleClearSearchHistory = async (req, res) => {
	try {
		if (!req.user?.id) {
			return res.status(401).json({
				errCode: -2,
				errMessage: "Not Authenticated the user",
			});
		}

		await dictionaryService.clearSearchHistory(req.user.id);

		return res.status(200).json({
			errCode: 0,
			errMessage: "OK",
		});
	} catch (e) {
		console.error("HandleClearSearchHistory error:", e);
		return res.status(500).json({
			errCode: -1,
			errMessage: "Internal server error",
		});
	}
};

let HandleGetTopSearchKeywordsToday = async (req, res) => {
	try {
		const limit = req.query.limit || 8;
		const keywords = await dictionaryService.getTopSearchKeywordsToday(limit);

		return res.status(200).json({
			errCode: 0,
			errMessage: "OK",
			keywords,
		});
	} catch (e) {
		console.error("HandleGetTopSearchKeywordsToday error:", e);
		return res.status(500).json({
			errCode: -1,
			errMessage: "Internal server error",
			keywords: [],
		});
	}
};

let HandleGetWordContributions = async (req, res) => {
	try {
		const word = req.query.word || req.query.q || "";
		const wordId = req.query.wordId || req.query.targetId || "";
		const limit = req.query.limit || 100;

		if (!String(word || "").trim() && !Number(wordId)) {
			return res.status(200).json({
				errCode: 1,
				errMessage: "Missing word/wordId",
				contributions: [],
			});
		}

		const contributions = await dictionaryService.getWordContributions(
			{ word, wordId },
			limit
		);

		return res.status(200).json({
			errCode: 0,
			errMessage: "OK",
			contributions,
		});
	} catch (e) {
		console.error("HandleGetWordContributions error:", e);
		return res.status(500).json({
			errCode: -1,
			errMessage: "Internal server error",
			contributions: [],
		});
	}
};

let HandleAddWordContribution = async (req, res) => {
	try {
		if (!req.user?.id) {
			return res.status(401).json({
				errCode: -2,
				errMessage: "Not Authenticated the user",
			});
		}

		const word = req.body?.word || "";
		const wordId = req.body?.wordId || req.body?.targetId || "";
		const content = req.body?.content || "";

		if ((!String(word || "").trim() && !Number(wordId)) || !String(content || "").trim()) {
			return res.status(200).json({
				errCode: 1,
				errMessage: "Missing word/wordId/content",
			});
		}

		const created = await dictionaryService.addWordContribution(req.user.id, {
			word,
			wordId,
			content,
		});

		if (!created) {
			return res.status(200).json({
				errCode: 2,
				errMessage: "Word not found or invalid payload",
			});
		}

		return res.status(200).json({
			errCode: 0,
			errMessage: "OK",
			contribution: created,
		});
	} catch (e) {
		console.error("HandleAddWordContribution error:", e);
		return res.status(500).json({
			errCode: -1,
			errMessage: "Internal server error",
		});
	}
};

let HandleGetLatestWordContributions = async (req, res) => {
	try {
		const limit = req.query.limit || 6;
		const offset = req.query.offset || 0;
		const [contributions, total] = await Promise.all([
			dictionaryService.getLatestWordContributions(limit, offset),
			dictionaryService.getLatestWordContributionsTotal(),
		]);

		return res.status(200).json({
			errCode: 0,
			errMessage: "OK",
			contributions,
			total,
		});
	} catch (e) {
		console.error("HandleGetLatestWordContributions error:", e);
		return res.status(500).json({
			errCode: -1,
			errMessage: "Internal server error",
			contributions: [],
		});
	}
};

module.exports = {
	HandleSearchWords,
	HandleSearchKanjis,
	HandleRecognizeKanji,
	HandleRecognizeTextFromImage,
	HandleSearchSentences,
	HandleSearchGrammars,
	HandleGetSearchHistory,
	HandleAddSearchHistory,
	HandleClearSearchHistory,
	HandleGetTopSearchKeywordsToday,
	HandleGetWordContributions,
	HandleAddWordContribution,
	HandleGetLatestWordContributions,
};
