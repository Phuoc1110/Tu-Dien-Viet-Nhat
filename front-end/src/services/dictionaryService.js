import axios from "../setup/axios";

const searchWords = (query, limit = 30) => {
	return axios
		.get(`/api/dictionary/search?q=${encodeURIComponent(query)}&limit=${limit}`)
		.then((res) => res)
		.catch((err) => {
			console.error("Search words error:", err);
			return { errCode: 1, errMessage: "Search failed", words: [] };
		});
};

const searchKanjis = (query, limit = 30) => {
	return axios
		.get(`/api/dictionary/kanji/search?q=${encodeURIComponent(query)}&limit=${limit}`)
		.then((res) => res)
		.catch((err) => {
			console.error("Search kanjis error:", err);
			return { errCode: 1, errMessage: "Search failed", kanjis: [] };
		});
};

const searchSentences = (query, limit = 20) => {
	return axios
		.get(`/api/dictionary/sentence/search?q=${encodeURIComponent(query)}&limit=${limit}`)
		.then((res) => res)
		.catch((err) => {
			console.error("Search sentences error:", err);
			return { errCode: 1, errMessage: "Search failed", sentences: [] };
		});
};

const searchGrammars = (query, limit = 20) => {
	return axios
		.get(`/api/dictionary/grammar/search?q=${encodeURIComponent(query)}&limit=${limit}`)
		.then((res) => res)
		.catch((err) => {
			console.error("Search grammars error:", err);
			return { errCode: 1, errMessage: "Search failed", grammars: [] };
		});
};

export { searchWords, searchKanjis, searchSentences, searchGrammars };
