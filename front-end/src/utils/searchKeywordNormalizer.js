import { toHiragana, toKatakana } from "wanakana";

const ROMAJI_PATTERN = /^[A-Za-z\s'\-]+$/;

export const normalizeSearchKeyword = (rawKeyword) => {
	const keyword = String(rawKeyword || "").trim();
	if (!keyword) {
		return "";
	}

	const lettersOnly = keyword.replace(/[^A-Za-z]/g, "");
	if (!lettersOnly) {
		return keyword;
	}

	if (!ROMAJI_PATTERN.test(keyword)) {
		return keyword;
	}

	if (lettersOnly === lettersOnly.toLowerCase()) {
		return toHiragana(keyword);
	}

	if (lettersOnly === lettersOnly.toUpperCase()) {
		return toKatakana(toHiragana(keyword));
	}

	return keyword;
};
