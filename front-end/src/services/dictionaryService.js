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

export { searchWords, searchKanjis };
