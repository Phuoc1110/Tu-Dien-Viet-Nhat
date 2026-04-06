const STORAGE_KEY = "mazii_word_contributions";

const safeParse = (raw) => {
	try {
		const parsed = JSON.parse(raw);
		return parsed && typeof parsed === "object" ? parsed : {};
	} catch (error) {
		return {};
	}
};

const normalizeWordKey = (word) => String(word || "").trim().toLowerCase();

const readAll = () => {
	if (typeof window === "undefined") {
		return {};
	}
	return safeParse(localStorage.getItem(STORAGE_KEY) || "{}");
};

const writeAll = (value) => {
	if (typeof window === "undefined") {
		return;
	}
	localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
};

const getWordContributions = (word) => {
	const key = normalizeWordKey(word);
	if (!key) {
		return [];
	}
	const all = readAll();
	return Array.isArray(all[key]) ? all[key] : [];
};

const getLatestWordContributions = (limit = 6) => {
	const safeLimit = Number.isFinite(+limit)
		? Math.max(1, Math.min(+limit, 100))
		: 6;
	const all = readAll();

	return Object.entries(all)
		.flatMap(([wordKey, items]) => {
			if (!Array.isArray(items)) {
				return [];
			}
			return items.map((item) => ({
				...item,
				word: wordKey,
			}));
		})
		.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
		.slice(0, safeLimit);
};

const addWordContribution = ({ word, content, author = "Bạn" }) => {
	const key = normalizeWordKey(word);
	const text = String(content || "").trim();
	if (!key || !text) {
		return null;
	}

	const all = readAll();
	const current = Array.isArray(all[key]) ? all[key] : [];
	const nextItem = {
		id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
		content: text,
		author,
		createdAt: new Date().toISOString(),
		upvotes: 0,
		downvotes: 0,
	};

	all[key] = [nextItem, ...current].slice(0, 100);
	writeAll(all);
	return nextItem;
};

export { getWordContributions, getLatestWordContributions, addWordContribution };
