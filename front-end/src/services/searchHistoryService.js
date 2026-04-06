const WORD_HISTORY_KEY = "mazii_word_search_history";
const WORD_HISTORY_LIMIT = 80;

const safeParse = (rawValue) => {
	try {
		const parsed = JSON.parse(rawValue);
		return Array.isArray(parsed) ? parsed : [];
	} catch (error) {
		return [];
	}
};

const normalizeItem = (item) => {
	if (!item || !item.word) {
		return null;
	}

	return {
		word: String(item.word).trim(),
		meaning: item.meaning ? String(item.meaning).trim() : "",
		searchedAt: item.searchedAt || new Date().toISOString(),
	};
};

const getWordSearchHistory = () => {
	if (typeof window === "undefined") {
		return [];
	}

	const rawValue = localStorage.getItem(WORD_HISTORY_KEY);
	if (!rawValue) {
		return [];
	}

	return safeParse(rawValue)
		.map(normalizeItem)
		.filter((item) => item && item.word);
};

const addWordSearchHistory = (item) => {
	if (typeof window === "undefined") {
		return;
	}

	const normalized = normalizeItem(item);
	if (!normalized || !normalized.word) {
		return;
	}

	const currentItems = getWordSearchHistory();
	const nextItems = [
		normalized,
		...currentItems.filter((entry) => entry.word !== normalized.word),
	].slice(0, WORD_HISTORY_LIMIT);

	localStorage.setItem(WORD_HISTORY_KEY, JSON.stringify(nextItems));
};

const clearWordSearchHistory = () => {
	if (typeof window === "undefined") {
		return;
	}

	localStorage.removeItem(WORD_HISTORY_KEY);
};

export { getWordSearchHistory, addWordSearchHistory, clearWordSearchHistory };
