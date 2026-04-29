import axios from "../setup/axios";

const stripTilde = (raw) => 
	String(raw || '')
		.replace(/[~～〜∼]/g, '')
		.trim();

const searchWords = (query, limit = 30) => {
	const cleanedQuery = stripTilde(query);
	return axios
		.get(`/api/dictionary/search?q=${encodeURIComponent(cleanedQuery)}&limit=${limit}`)
		.then((res) => res)
		.catch((err) => {
			console.error("Search words error:", err);
			return { errCode: 1, errMessage: "Search failed", words: [] };
		});
};

const searchKanjis = (query, limit = 30) => {
	const cleanedQuery = stripTilde(query);
	return axios
		.get(`/api/dictionary/kanji/search?q=${encodeURIComponent(cleanedQuery)}&limit=${limit}`)
		.then((res) => res)
		.catch((err) => {
			console.error("Search kanjis error:", err);
			return { errCode: 1, errMessage: "Search failed", kanjis: [] };
		});
};

const recognizeKanjiInk = ({ ink, width = 280, height = 280, numResults = 20 }) => {
	return axios
		.post(`/api/dictionary/kanji/recognize`, {
			ink,
			width,
			height,
			numResults,
		})
		.then((res) => res)
		.catch((err) => {
			console.error("Recognize kanji error:", err);
			return { errCode: 1, errMessage: "Recognize failed", candidates: [] };
		});
};

const recognizeImageText = (formData) => {
	return axios
		.post(`/api/dictionary/image-recognize`, formData, {
			headers: {
				"Content-Type": "multipart/form-data",
			},
		})
		.then((res) => res)
		.catch((err) => {
			console.error("Recognize image text error:", err);
			return { errCode: 1, errMessage: "Recognize failed", words: [], text: "" };
		});
};

const analyzeJapaneseParagraph = (text, limit = 100) => {
	const cleanedText = stripTilde(text);
	return axios
		.post(`/api/dictionary/paragraph/analyze`, { text: cleanedText, limit })
		.then((res) => res)
		.catch((err) => {
			console.error("Analyze paragraph error:", err);
			return { errCode: 1, errMessage: "Analyze failed", text: "", tokens: [], matchedWords: [] };
		});
};

const searchSentences = (query, limit = 20) => {
	const cleanedQuery = stripTilde(query);
	return axios
		.get(`/api/dictionary/sentence/search?q=${encodeURIComponent(cleanedQuery)}&limit=${limit}`)
		.then((res) => res)
		.catch((err) => {
			console.error("Search sentences error:", err);
			return { errCode: 1, errMessage: "Search failed", sentences: [] };
		});
};

const searchGrammars = (query, limit = 20) => {
	const cleanedQuery = stripTilde(query);
	return axios
		.get(`/api/dictionary/grammar/search?q=${encodeURIComponent(cleanedQuery)}&limit=${limit}`)
		.then((res) => res)
		.catch((err) => {
			console.error("Search grammars error:", err);
			return { errCode: 1, errMessage: "Search failed", grammars: [] };
		});
};

export {
	searchWords,
	searchKanjis,
	recognizeKanjiInk,
	recognizeImageText,
	analyzeJapaneseParagraph,
	searchSentences,
	searchGrammars,
};
