const db = require("../models/index");
const { Op } = require("sequelize");
const kuromoji = require("kuromoji");
const wanakana = require("wanakana");
const path = require("path");

const parseLimit = (limit, fallback = 12, max = 100) => {
	if (!Number.isFinite(+limit)) {
		return fallback;
	}
	return Math.max(1, Math.min(+limit, max));
};

const parseOffset = (offset, fallback = 0, max = 100000) => {
	if (!Number.isFinite(+offset)) {
		return fallback;
	}
	return Math.max(0, Math.min(+offset, max));
};

const VALID_LEVELS = new Set(["N5", "N4", "N3", "N2", "N1", "mixed"]);
const VALID_STATUS = new Set(["not_started", "in_progress", "completed"]);

const normalizeJlptLevel = (value) => {
	if (value === null || value === undefined) {
		return null;
	}

	const text = String(value).trim().toUpperCase();
	if (["N1", "N2", "N3", "N4", "N5"].includes(text)) {
		return text;
	}

	const numeric = Number(value);
	if (!Number.isFinite(numeric)) {
		return null;
	}

	if (numeric >= 1 && numeric <= 5) {
		return `N${numeric}`;
	}

	return null;
};

const normalizeStatus = (status) => {
	const value = String(status || "").trim();
	if (!VALID_STATUS.has(value)) {
		return "in_progress";
	}
	return value;
};

const mapPassage = (item, currentUserId = null) => {
	const plain = item.get ? item.get({ plain: true }) : item;
	const progress = Array.isArray(plain.progresses) && plain.progresses.length ? plain.progresses[0] : null;

	return {
		id: plain.id,
		title: plain.title,
		summary: plain.summary || "",
		content: plain.content,
		translation: plain.translation || "",
		level: plain.level,
		topic: plain.topic || "",
		estimatedMinutes: plain.estimatedMinutes,
		isActive: Boolean(plain.isActive),
		createdAt: plain.createdAt,
		updatedAt: plain.updatedAt,
		author: plain.createdByAdmin
			? {
				id: plain.createdByAdmin.id,
				username: plain.createdByAdmin.username,
			}
			: null,
		myProgress:
			currentUserId && progress
				? {
					status: progress.status,
					lastReadAt: progress.lastReadAt || null,
					completedAt: progress.completedAt || null,
				}
				: null,
	};
};

const getReadingPassages = async ({ userId, query = "", level = "", topic = "", limit = 12, offset = 0 }) => {
	const safeLimit = parseLimit(limit, 12, 60);
	const safeOffset = parseOffset(offset, 0, 100000);
	const where = { isActive: true };

	const q = String(query || "").trim();
	if (q) {
		where[Op.or] = [
			{ title: { [Op.like]: `%${q}%` } },
			{ summary: { [Op.like]: `%${q}%` } },
			{ topic: { [Op.like]: `%${q}%` } },
		];
	}

	if (VALID_LEVELS.has(level)) {
		where.level = level;
	}

	if (topic && String(topic).trim()) {
		where.topic = { [Op.like]: `%${String(topic).trim()}%` };
	}

	const { rows, count } = await db.ReadingPassage.findAndCountAll({
		where,
		include: [
			{
				model: db.User,
				as: "createdByAdmin",
				attributes: ["id", "username"],
				required: false,
			},
			{
				model: db.UserReadingProgress,
				as: "progresses",
				where: userId ? { userId } : undefined,
				required: false,
				attributes: ["status", "lastReadAt", "completedAt"],
			},
		],
		order: [["createdAt", "DESC"]],
		limit: safeLimit,
		offset: safeOffset,
		distinct: true,
	});

	return {
		items: rows.map((item) => mapPassage(item, userId)),
		total: count,
		pagination: {
			limit: safeLimit,
			offset: safeOffset,
			hasMore: safeOffset + rows.length < count,
		},
	};
};

const getReadingPassageDetail = async ({ id, userId }) => {
	const passage = await db.ReadingPassage.findOne({
		where: { id, isActive: true },
		include: [
			{
				model: db.User,
				as: "createdByAdmin",
				attributes: ["id", "username"],
				required: false,
			},
			{
				model: db.UserReadingProgress,
				as: "progresses",
				where: userId ? { userId } : undefined,
				required: false,
				attributes: ["status", "lastReadAt", "completedAt"],
			},
		],
	});

	if (!passage) {
		return null;
	}

	return mapPassage(passage, userId);
};

const createReadingPassage = async ({ authorId, payload }) => {
	const title = String(payload?.title || "").trim();
	const content = String(payload?.content || "").trim();
	if (!title || !content) {
		return { errCode: 1, errMessage: "Title and content are required" };
	}

	const created = await db.ReadingPassage.create({
		title,
		summary: String(payload?.summary || "").trim() || null,
		content,
		translation: String(payload?.translation || "").trim() || null,
		level: VALID_LEVELS.has(payload?.level) ? payload.level : "mixed",
		topic: String(payload?.topic || "").trim() || null,
		estimatedMinutes: Math.max(1, Math.min(Number(payload?.estimatedMinutes) || 5, 60)),
		isActive: payload?.isActive !== undefined ? Boolean(payload.isActive) : true,
		createdByAdminId: authorId,
	});

	return { errCode: 0, passage: created.get({ plain: true }) };
};

const updateReadingPassage = async ({ actorId, isAdmin, id, payload }) => {
	const passage = await db.ReadingPassage.findByPk(id);
	if (!passage) {
		return { errCode: 2, errMessage: "Reading passage not found" };
	}

	if (!isAdmin && Number(passage.createdByAdminId) !== Number(actorId)) {
		return { errCode: 3, errMessage: "No permission to edit this passage" };
	}

	const nextTitle = payload?.title !== undefined ? String(payload.title || "").trim() : passage.title;
	const nextContent = payload?.content !== undefined ? String(payload.content || "").trim() : passage.content;
	if (!nextTitle || !nextContent) {
		return { errCode: 1, errMessage: "Title and content are required" };
	}

	await passage.update({
		title: nextTitle,
		summary: payload?.summary !== undefined ? String(payload.summary || "").trim() || null : passage.summary,
		content: nextContent,
		translation:
			payload?.translation !== undefined
				? String(payload.translation || "").trim() || null
				: passage.translation,
		level: payload?.level !== undefined && VALID_LEVELS.has(payload.level) ? payload.level : passage.level,
		topic: payload?.topic !== undefined ? String(payload.topic || "").trim() || null : passage.topic,
		estimatedMinutes:
			payload?.estimatedMinutes !== undefined
				? Math.max(1, Math.min(Number(payload.estimatedMinutes) || 5, 60))
				: passage.estimatedMinutes,
		isActive: payload?.isActive !== undefined ? Boolean(payload.isActive) : passage.isActive,
	});

	return { errCode: 0, passage: passage.get({ plain: true }) };
};

const upsertReadingProgress = async ({ userId, passageId, status, lastReadAt, completedAt }) => {
	const passage = await db.ReadingPassage.findOne({ where: { id: passageId, isActive: true } });
	if (!passage) {
		return { errCode: 2, errMessage: "Reading passage not found" };
	}

	const nextStatus = normalizeStatus(status);
	const now = new Date();
	const parsedLastReadAt = lastReadAt ? new Date(lastReadAt) : null;
	const parsedCompletedAt = completedAt ? new Date(completedAt) : null;

	const nextLastReadAt =
		nextStatus === "not_started"
			? null
			: Number.isNaN(parsedLastReadAt?.getTime?.())
				? now
				: parsedLastReadAt;

	let nextCompletedAt = null;
	if (nextStatus === "completed") {
		nextCompletedAt = Number.isNaN(parsedCompletedAt?.getTime?.()) ? now : parsedCompletedAt;
	}

	const [progress, created] = await db.UserReadingProgress.findOrCreate({
		where: { userId, passageId },
		defaults: {
			status: nextStatus,
			lastReadAt: nextLastReadAt,
			completedAt: nextCompletedAt,
		},
	});

	if (!created) {
		await progress.update({
			status: nextStatus,
			lastReadAt: nextLastReadAt,
			completedAt: nextCompletedAt,
		});
	}

	return {
		errCode: 0,
		progress: {
			userId,
			passageId,
			status: progress.status,
			lastReadAt: progress.lastReadAt,
			completedAt: progress.completedAt,
		},
	};
};

const getMyReadingProgresses = async ({ userId, limit = 30, offset = 0 }) => {
	const safeLimit = parseLimit(limit, 30, 100);
	const safeOffset = parseOffset(offset, 0, 100000);

	const { rows, count } = await db.UserReadingProgress.findAndCountAll({
		where: { userId },
		include: [
			{
				model: db.ReadingPassage,
				as: "passage",
				attributes: ["id", "title", "summary", "level", "topic", "estimatedMinutes", "isActive"],
				required: false,
			},
		],
		order: [["updatedAt", "DESC"]],
		limit: safeLimit,
		offset: safeOffset,
	});

	return {
		items: rows.map((item) => {
			const plain = item.get({ plain: true });
			return {
				id: plain.id,
				status: plain.status,
				lastReadAt: plain.lastReadAt,
				completedAt: plain.completedAt,
				passage: plain.passage || null,
			};
		}),
		total: count,
		pagination: {
			limit: safeLimit,
			offset: safeOffset,
			hasMore: safeOffset + rows.length < count,
		},
	};
};

// Initialize kuromoji tokenizer with caching
let tokenizerPromise = null;
const getTokenizer = async () => {
	if (!tokenizerPromise) {
		const dictPath = path.join(__dirname, "../../node_modules/kuromoji/dict");
		tokenizerPromise = new Promise((resolve, reject) => {
			kuromoji.builder({ dicPath: dictPath }).build((err, tokenizer) => {
				if (err) {
					reject(err);
					return;
				}
				resolve(tokenizer);
			});
		});
	}
	return tokenizerPromise;
};

/**
 * Analyzes Japanese text and returns detailed token information
 * Including furigana, pronunciation, JLPT levels, meanings
 */
const analyzeJapaneseText = async (content) => {
	try {
		const tokenizer = await getTokenizer();
		const tokens = tokenizer.tokenize(content);
		
		const analyzedTokens = [];
		for (const token of tokens) {
			const surface = token.surface_form;
			const features = Array.isArray(token.parts_of_speech) ? token.parts_of_speech : [];
			
			// Skip whitespace and punctuation
			if (/^\s+$/.test(surface) || !surface.trim()) {
				analyzedTokens.push({
					type: "spacing",
					text: surface,
				});
				continue;
			}
			
			// Extract grammatical features
			const POS = token.pos || features[0] || ""; // Part of speech
			const POS1 = token.pos_detail_1 || features[1] || ""; // Subcategory 1
			const baseForm = token.basic_form && token.basic_form !== "*" ? token.basic_form : (features[6] || surface);
			const reading = token.reading && token.reading !== "*" ? token.reading : (features[7] || "");
			const pronunciation = token.pronunciation && token.pronunciation !== "*" ? token.pronunciation : (features[8] || "");
			
			// Convert katakana reading to hiragana if needed
			const hiraganaReading = wanakana.toHiragana(reading || pronunciation || "");
			
			// Check if it's kanji (contains kanji characters)
			const hasKanji = /[\u4E00-\u9FFF]/.test(surface);
			const isWord = POS === "名詞" || POS === "動詞" || POS === "形容詞" || POS === "副詞";
			const isGrammar = POS === "助詞" || POS === "助動詞" || POS === "接続詞";
			
			analyzedTokens.push({
				type: "word",
				text: surface,
				baseForm,
				reading: hiraganaReading,
				pos: POS,
				pos1: POS1,
				isKanji: hasKanji,
				isWord,
				isGrammar,
				meaning: null, // Will be filled from database lookup
				jlptLevel: null,
				grammarTag: null,
			});
		}
		
		return analyzedTokens;
	} catch (error) {
		console.error("Error analyzing Japanese text:", error);
		return [];
	}
};

/**
 * Links analyzed tokens to database information
 * Matches words/kanji/grammar with their database records
 */
const linkTokensToDatabase = async (tokens) => {
	const linkedTokens = [...tokens];
	
	// Extract words and kanji from tokens for batch lookup
	const lookupWords = new Map(); // key: surface, value: array of token indices
	const lookupKanji = new Map();
	
	for (let i = 0; i < linkedTokens.length; i++) {
		const token = linkedTokens[i];
		if (token.type !== "word") continue;
		
		// Store mapping of text to token indices for batch lookup
		if (token.isKanji && /[\u4E00-\u9FFF]/.test(token.text)) {
			if (!lookupKanji.has(token.text)) {
				lookupKanji.set(token.text, []);
			}
			lookupKanji.get(token.text).push(i);
		}
		
		if (!lookupWords.has(token.baseForm)) {
			lookupWords.set(token.baseForm, []);
		}
		lookupWords.get(token.baseForm).push(i);
		
		// Also check original text
		if (token.text !== token.baseForm && !lookupWords.has(token.text)) {
			lookupWords.set(token.text, []);
			lookupWords.get(token.text).push(i);
		}
	}
	
	try {
		// Batch lookup words in database
		if (lookupWords.size > 0) {
			const wordSearchTerms = Array.from(lookupWords.keys());
			const words = await db.Word.findAll({
				where: {
					[Op.or]: [
						{ word: { [Op.in]: wordSearchTerms } },
						{ reading: { [Op.in]: wordSearchTerms } },
					],
				},
				include: [
					{
						model: db.Meaning,
						as: "meanings",
					},
				],
				limit: 1000,
			});
			
			// Create lookup map
			const wordMap = new Map();
			words.forEach((word) => {
				const key = word.word;
				wordMap.set(key, word);
				if (word.reading) {
					wordMap.set(word.reading, word);
				}
			});
			
			// Link to tokens
			lookupWords.forEach((indices, searchTerm) => {
				const word = wordMap.get(searchTerm);
				if (word) {
					indices.forEach((idx) => {
						linkedTokens[idx].meaning = word.meanings?.[0]?.definition || word.meanings?.[0]?.meaning || word.meaningVN || "";
						linkedTokens[idx].jlptLevel = normalizeJlptLevel(word.jlptLevel);
						linkedTokens[idx].wordDatabaseId = word.id;
					});
				}
			});
		}
		
		// Batch lookup kanji in database
		if (lookupKanji.size > 0) {
			const kanjiChars = Array.from(lookupKanji.keys());
			const kanjis = await db.Kanji.findAll({
				where: {
					characterKanji: { [Op.in]: kanjiChars },
				},
				limit: 1000,
			});
			
			// Create lookup map
			const kanjiMap = new Map();
			kanjis.forEach((kanji) => {
				kanjiMap.set(kanji.characterKanji, kanji);
			});
			
			// Link to tokens
			lookupKanji.forEach((indices, character) => {
				const kanji = kanjiMap.get(character);
				if (kanji) {
					indices.forEach((idx) => {
						linkedTokens[idx].meaning = kanji.meaning || "";
						linkedTokens[idx].jlptLevel = normalizeJlptLevel(kanji.jlptLevel);
						linkedTokens[idx].kanjiDatabaseId = kanji.id;
						linkedTokens[idx].strokeCount = kanji.strokeCount;
						linkedTokens[idx].onyomi = kanji.onyomi;
						linkedTokens[idx].kunyomi = kanji.kunyomi;
					});
				}
			});
		}
		
		// Batch lookup grammar patterns
		const grammarTokens = linkedTokens.filter((t) => t.isGrammar && t.text.trim());
		if (grammarTokens.length > 0) {
			const grammarSearchTerms = grammarTokens.map((t) => t.text);
			const grammars = await db.Grammar.findAll({
				where: {
					title: { [Op.in]: grammarSearchTerms },
				},
				limit: 500,
			});
			
			const grammarMap = new Map();
			grammars.forEach((grammar) => {
				grammarMap.set(grammar.title, grammar);
			});
			
			grammarTokens.forEach((token) => {
				const grammar = grammarMap.get(token.text);
				if (grammar) {
					const idx = linkedTokens.indexOf(token);
					linkedTokens[idx].meaning = grammar.meaning || "";
					linkedTokens[idx].jlptLevel = normalizeJlptLevel(grammar.jlptLevel);
					linkedTokens[idx].grammarDatabaseId = grammar.id;
					linkedTokens[idx].grammarTag = `[${grammar.title}]`;
				}
			});
		}
	} catch (error) {
		console.error("Error linking tokens to database:", error);
	}
	
	return linkedTokens;
};

/**
 * Analyzes passage content and returns sentence-by-sentence analysis
 */
const analyzePassageContent = async (content) => {
	const tokens = await analyzeJapaneseText(content);
	const linkedTokens = await linkTokensToDatabase(tokens);
	
	// Group tokens into sentences
	const sentences = [];
	let currentSentence = [];
	let currentSentenceText = "";
	
	for (const token of linkedTokens) {
		if (token.type === "spacing" && /[\n。！？]/.test(token.text)) {
			if (currentSentenceText.trim()) {
				sentences.push({
					textOriginal: currentSentenceText.trim(),
					tokens: currentSentence,
				});
			}
			currentSentence = [];
			currentSentenceText = "";
		} else {
			currentSentence.push(token);
			if (token.type === "word") {
				currentSentenceText += token.text;
			}
		}
	}
	
	// Add remaining sentence
	if (currentSentenceText.trim()) {
		sentences.push({
			textOriginal: currentSentenceText.trim(),
			tokens: currentSentence,
		});
	}
	
	// Calculate passage statistics
	const wordTokens = linkedTokens.filter((t) => t.type === "word");
	const jlptLevelDistribution = {
		N5: 0,
		N4: 0,
		N3: 0,
		N2: 0,
		N1: 0,
		unknown: 0,
	};
	
	wordTokens.forEach((token) => {
		const level = normalizeJlptLevel(token.jlptLevel);
		if (level && jlptLevelDistribution.hasOwnProperty(level)) {
			jlptLevelDistribution[level]++;
		} else {
			jlptLevelDistribution.unknown++;
		}
	});
	
	return {
		sentences,
		analysis: {
			totalWords: wordTokens.length,
			uniqueWords: new Set(wordTokens.map((t) => t.text)).size,
			jlptLevelDistribution,
			estimatedDifficulty: calculateDifficulty(jlptLevelDistribution),
		},
	};
};

/**
 * Calculate overall passage difficulty based on vocabulary levels
 */
const calculateDifficulty = (distribution) => {
	const total = distribution.N5 + distribution.N4 + distribution.N3 + distribution.N2 + distribution.N1;
	if (total === 0) return "unknown";
	
	// Weight by JLPT level (higher level = harder)
	const score = (
		distribution.N5 * 1 +
		distribution.N4 * 2 +
		distribution.N3 * 3 +
		distribution.N2 * 4 +
		distribution.N1 * 5
	) / total;
	
	if (score < 1.5) return "N5";
	if (score < 2.5) return "N4";
	if (score < 3.5) return "N3";
	if (score < 4.5) return "N2";
	return "N1";
};

/**
 * Get full analysis for a passage (for API endpoint)
 */
const getPassageAnalysis = async (passageId) => {
	const passage = await db.ReadingPassage.findByPk(passageId);
	if (!passage) {
		return null;
	}
	
	const analysis = await analyzePassageContent(passage.content);
	return {
		passageId,
		passageTitle: passage.title,
		...analysis,
	};
};

module.exports = {
	getReadingPassages,
	getReadingPassageDetail,
	createReadingPassage,
	updateReadingPassage,
	upsertReadingProgress,
	getMyReadingProgresses,
	analyzePassageContent,
	getPassageAnalysis,
};
