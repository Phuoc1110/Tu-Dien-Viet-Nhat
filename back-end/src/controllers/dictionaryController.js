import fs from "fs";
import os from "os";
import path from "path";
import dictionaryService from "../service/dictionaryService";
import textlintService from "../service/textlintService";
import fetch from "node-fetch";
import FormData from "form-data";

// OCR Server configuration
const OCR_SERVER_URL = process.env.OCR_SERVER_URL || "http://127.0.0.1:5001";
const OCR_ENDPOINT = `${OCR_SERVER_URL}/ocr`;

const normalizeTranslateUrl = (value) => {
	const trimmed = String(value || "").trim();
	if (!trimmed) {
		return "";
	}
	if (trimmed.endsWith("/translate")) {
		return trimmed;
	}
	return `${trimmed.replace(/\/+$/, "")}/translate`;
};

const splitTranslateUrls = (raw) =>
	String(raw || "")
		.split(",")
		.map((item) => normalizeTranslateUrl(item))
		.filter(Boolean);

const DEFAULT_TRANSLATE_URLS = [
	"https://translate.argosopentech.com/translate",
	"https://libretranslate.de/translate",
	"https://libretranslate.com/translate",
];

const TRANSLATE_API_URLS = Array.from(
	new Set([...splitTranslateUrls(process.env.TRANSLATE_API_URL), ...DEFAULT_TRANSLATE_URLS])
);
const TRANSLATE_API_KEY = process.env.TRANSLATE_API_KEY || "";
const DEFAULT_TRANSLATE_SOURCE = process.env.TRANSLATE_SOURCE || "ja";
const DEFAULT_TRANSLATE_TARGET = process.env.TRANSLATE_TARGET || "vi";

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

let HandleAnalyzeJapaneseParagraph = async (req, res) => {
	try {
		const text = req.body?.text || req.body?.paragraph || req.body?.content || "";
		const limit = req.body?.limit || req.query?.limit || 100;

		if (!String(text || "").trim()) {
			return res.status(200).json({
				errCode: 1,
				errMessage: "Missing text",
				text: "",
				tokens: [],
				matchedWords: [],
			});
		}

		const result = await dictionaryService.analyzeJapaneseParagraph(text, limit);

		return res.status(200).json({
			errCode: 0,
			errMessage: "OK",
			text: result.text,
			tokens: result.tokens,
			matchedWords: result.matchedWords,
		});
	} catch (e) {
		console.error("HandleAnalyzeJapaneseParagraph error:", e);
		return res.status(500).json({
			errCode: -1,
			errMessage: "Internal server error",
			text: "",
			tokens: [],
			matchedWords: [],
		});
	}
};

let HandleTranslateText = async (req, res) => {
	try {
		const text = req.body?.text || req.body?.q || "";
		const source = req.body?.source || DEFAULT_TRANSLATE_SOURCE;
		const target = req.body?.target || DEFAULT_TRANSLATE_TARGET;

		if (!String(text || "").trim()) {
			return res.status(200).json({
				errCode: 1,
				errMessage: "Missing text",
				translation: "",
			});
		}

		let lastError = "Translate failed";

		// 1. Try Google Translate API (Free, robust extension API)
		try {
			const gtExtUrl = `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=${source}&tl=${target}&q=${encodeURIComponent(String(text).trim())}`;
			const response = await fetch(gtExtUrl, { timeout: 15000 });
			if (response.ok) {
				const data = await response.json();
				if (Array.isArray(data) && data.length > 0) {
					let translation = "";
					if (typeof data[0] === "string") {
						translation = data.join("").trim();
					} else if (data[0] && typeof data[0][0] === "string") {
						translation = data.map((item) => item[0]).join("").trim();
					}
					if (translation) {
						return res.status(200).json({ errCode: 0, errMessage: "OK", translation });
					}
				}
			}
		} catch (error) {
			console.error("Google Translate Ext request error:", error.message);
		}

		// 2. Try Google Translate API (GTX)
		try {
			const gtUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${source}&tl=${target}&dt=t&q=${encodeURIComponent(String(text).trim())}`;
			const response = await fetch(gtUrl, { timeout: 15000 });
			if (response.ok) {
				const data = await response.json();
				if (data && Array.isArray(data[0])) {
					const translation = data[0].map(item => item[0]).join("").trim();
					if (translation) {
						return res.status(200).json({ errCode: 0, errMessage: "OK", translation });
					}
				}
			}
		} catch (error) {
			console.error("Google Translate request error:", error.message);
		}

		// 3. Try MyMemory API (Free)
		try {
			const myMemoryUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(String(text).trim())}&langpair=${source}|${target}`;
			const response = await fetch(myMemoryUrl, { timeout: 15000 });
			if (response.ok) {
				const data = await response.json();
				if (data?.responseData?.translatedText) {
					const translation = String(data.responseData.translatedText).trim();
					if (translation && !translation.includes("MYMEMORY WARNING")) {
						return res.status(200).json({ errCode: 0, errMessage: "OK", translation });
					}
				}
			}
		} catch (error) {
			console.error("MyMemory request error:", error.message);
		}

		// 4. Fallback to LibreTranslate endpoints
		const payload = {
			q: String(text).trim(),
			source,
			target,
			format: "text",
		};

		if (TRANSLATE_API_KEY) {
			payload.api_key = TRANSLATE_API_KEY;
		}

		for (const endpoint of TRANSLATE_API_URLS) {
			try {
				const response = await fetch(endpoint, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Accept: "application/json",
					},
					body: JSON.stringify(payload),
					timeout: 15000,
				});

				const rawText = await response.text();
				let data = null;
				try {
					data = rawText ? JSON.parse(rawText) : null;
				} catch (parseError) {
					console.error("Translate response parse error for endpoint", endpoint, ":", parseError.message);
					lastError = "Translate server returned invalid response";
					continue;
				}

				if (!response.ok) {
					console.error(
						`Translate server error for ${endpoint}: ${response.status} ${response.statusText}`
					);
					lastError = data?.error || data?.message || "Translate server error";
					continue;
				}

				const translation = String(
					data?.translatedText || data?.translation || data?.text || ""
				).trim();

				if (!translation) {
					lastError = "Translate server returned empty translation";
					continue;
				}

				return res.status(200).json({
					errCode: 0,
					errMessage: "OK",
					translation,
				});
			} catch (error) {
				console.error("Translate request error for", endpoint, ":", error.message);
				lastError = error?.message || "Translate request failed";
			}
		}

		return res.status(200).json({
			errCode: 2,
			errMessage: lastError,
			translation: "",
		});
	} catch (e) {
		console.error("HandleTranslateText error:", e);
		return res.status(200).json({
			errCode: -1,
			errMessage: e?.message || "Internal server error",
			translation: "",
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
	try {
		if (!req.file?.buffer) {
			return res.status(200).json({
				errCode: 1,
				errMessage: "Missing image file",
				words: [],
				text: "",
				items: [],
			});
		}

		// Create FormData to send image to OCR server
		const formData = new FormData();
		formData.append("image", req.file.buffer, {
			filename: req.file.originalname || "image.png",
			contentType: req.file.mimetype || "image/png",
		});

		// Send request to OCR server
		const response = await fetch(OCR_ENDPOINT, {
			method: "POST",
			body: formData,
			headers: formData.getHeaders?.() || {},
			timeout: 120000,
		});

		if (!response.ok) {
			console.error(`OCR Server error: ${response.status} ${response.statusText}`);
			return res.status(500).json({
				errCode: -1,
				errMessage: "OCR Server error",
				words: [],
				text: "",
				items: [],
			});
		}

		const payload = await response.json();

		return res.status(200).json({
			errCode: payload.errCode || 0,
			errMessage: payload.errMessage || "OK",
			words: Array.isArray(payload.words) ? payload.words : [],
			text: String(payload.text || "").trim(),
			items: Array.isArray(payload.items) ? payload.items : [],
		});
	} catch (e) {
		console.error("HandleRecognizeTextFromImage error:", e);
		return res.status(500).json({
			errCode: -1,
			errMessage: `Internal server error: ${e.message}`,
			words: [],
			text: "",
			items: [],
		});
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
		const targetType = req.query.targetType || "word";
		const limit = req.query.limit || 100;

		if (!String(word || "").trim() && !Number(wordId)) {
			return res.status(200).json({
				errCode: 1,
				errMessage: "Missing word/wordId",
				contributions: [],
			});
		}

		const contributions = await dictionaryService.getWordContributions({ word, wordId, targetType }, limit);

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
		const targetType = req.body?.targetType || "word";
		const parentId = req.body?.parentId || null;

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
			targetType,
			parentId,
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

let HandleCorrectOcrText = async (req, res) => {
	try {
		const text = req.body?.text || "";
		if (!String(text).trim()) {
			return res.status(200).json({ errCode: 1, errMessage: "Missing text", correctedText: "" });
		}
		
		const corrected = await textlintService.fixOcrText(text);
		
		return res.status(200).json({
			errCode: 0,
			errMessage: "OK",
			correctedText: corrected
		});
	} catch (e) {
		console.error("HandleCorrectOcrText error:", e);
		return res.status(500).json({ errCode: -1, errMessage: e.message, correctedText: "" });
	}
};

module.exports = {
	HandleSearchWords,
	HandleSearchKanjis,
	HandleRecognizeKanji,
	HandleAnalyzeJapaneseParagraph,
	HandleTranslateText,
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
	HandleCorrectOcrText,
};
