import axios from "../setup/axios";

const getWordContributions = async ({ word, wordId }, limit = 100) => {
	const keyword = String(word || "").trim();
	const normalizedWordId = Number(wordId);
	if (!keyword && !normalizedWordId) {
		return [];
	}
	const query = normalizedWordId
		? `wordId=${normalizedWordId}`
		: `word=${encodeURIComponent(keyword)}`;

	return axios
		.get(
			`/api/dictionary/contributions?${query}&limit=${limit}`
		)
		.then((res) => {
			if (res && res.errCode === 0) {
				return res.contributions || [];
			}
			return [];
		})
		.catch((err) => {
			console.error("Get word contributions error:", err);
			return [];
		});
};

const getLatestWordContributions = async (limit = 6) => {
	return axios
		.get(`/api/dictionary/contributions/latest?limit=${limit}`)
		.then((res) => {
			if (res && res.errCode === 0) {
				return res.contributions || [];
			}
			return [];
		})
		.catch((err) => {
			console.error("Get latest contributions error:", err);
			return [];
		});
};

const addWordContribution = async ({ word, wordId, content }) => {
	const keyword = String(word || "").trim();
	const normalizedWordId = Number(wordId);
	const text = String(content || "").trim();

	if ((!keyword && !normalizedWordId) || !text) {
		return null;
	}

	return axios
		.post("/api/dictionary/contributions", {
			word: keyword,
			wordId: normalizedWordId || undefined,
			content: text,
		})
		.then((res) => {
			if (res && res.errCode === 0) {
				return res.contribution || null;
			}
			return null;
		})
		.catch((err) => {
			console.error("Add contribution error:", err);
			return null;
		});
};

export { getWordContributions, getLatestWordContributions, addWordContribution };
