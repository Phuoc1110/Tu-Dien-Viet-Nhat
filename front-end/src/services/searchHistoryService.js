import axios from "../setup/axios";

const LAST_HISTORY_KEY = "mazii_last_history_write";

const shouldSkipDuplicateWrite = (word) => {
	if (typeof window === "undefined") {
		return false;
	}

	const normalizedWord = String(word || "").trim().toLowerCase();
	if (!normalizedWord) {
		return true;
	}

	try {
		const raw = sessionStorage.getItem(LAST_HISTORY_KEY);
		const last = raw ? JSON.parse(raw) : null;
		const now = Date.now();

		if (
			last &&
			last.word === normalizedWord &&
			Number.isFinite(last.ts) &&
			now - last.ts < 5000
		) {
			return true;
		}

		sessionStorage.setItem(
			LAST_HISTORY_KEY,
			JSON.stringify({
				word: normalizedWord,
				ts: now,
			})
		);
	} catch (error) {
		return false;
	}

	return false;
};

const getWordSearchHistory = async (limit = 80) => {
	return axios
		.get(`/api/dictionary/history?limit=${limit}`)
		.then((res) => {
			if (res && res.errCode === 0) {
				return res.history || [];
			}
			return [];
		})
		.catch((err) => {
			console.error("Get search history error:", err);
			return [];
		});
};

const getTopSearchKeywordsToday = async (limit = 8) => {
	return axios
		.get(`/api/dictionary/history/top-keywords?limit=${limit}`)
		.then((res) => {
			if (res && res.errCode === 0) {
				return res.keywords || [];
			}
			return [];
		})
		.catch((err) => {
			console.error("Get top search keywords error:", err);
			return [];
		});
};

const addWordSearchHistory = async (item) => {
	const word = String(item?.word || "").trim();
	if (!word) {
		return { errCode: 1, errMessage: "Missing word" };
	}

	if (shouldSkipDuplicateWrite(word)) {
		return { errCode: 0, errMessage: "Skipped duplicate" };
	}

	return axios
		.post("/api/dictionary/history", {
			searchTerm: word,
		})
		.then((res) => res)
		.catch((err) => {
			console.error("Add search history error:", err);
			return { errCode: 1, errMessage: "Add search history failed" };
		});
};

const clearWordSearchHistory = async () => {
	return axios
		.delete("/api/dictionary/history")
		.then((res) => res)
		.catch((err) => {
			console.error("Clear search history error:", err);
			return { errCode: 1, errMessage: "Clear search history failed" };
		});
};

export {
	getWordSearchHistory,
	getTopSearchKeywordsToday,
	addWordSearchHistory,
	clearWordSearchHistory,
};
