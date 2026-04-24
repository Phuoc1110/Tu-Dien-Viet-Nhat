import db from "../models/index";
import { Op } from "sequelize";

const splitVariants = (raw) =>
	String(raw || "")
		.split(/[;；,，、|/]+/)
		.map((item) => item.trim())
		.filter(Boolean);

const buildWordExampleConditions = (word) => {
	const variants = [
		...splitVariants(word?.word),
		...splitVariants(word?.reading),
		...splitVariants(word?.romaji),
	].filter(Boolean);

	if (variants.length === 0) {
		return [];
	}

	return variants.map((variant) => ({
		japaneseSentence: { [Op.like]: `%${variant}%` },
	}));
};

const parseLimit = (limit, fallback = 20, max = 100) => {
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

const clamp01 = (value) => Math.max(0, Math.min(1, value));

const kanjiStrokeCache = new Map();

const toPoint = (x, y) => ({ x: Number(x), y: Number(y) });

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

const normalizeInkPayload = (ink) => {
	if (!Array.isArray(ink)) {
		return [];
	}

	return ink
		.map((stroke) => {
			if (!Array.isArray(stroke) || stroke.length < 2) {
				return [];
			}

			const xs = Array.isArray(stroke[0]) ? stroke[0] : [];
			const ys = Array.isArray(stroke[1]) ? stroke[1] : [];
			const size = Math.min(xs.length, ys.length);
			const points = [];

			for (let i = 0; i < size; i += 1) {
				const p = toPoint(xs[i], ys[i]);
				if (Number.isFinite(p.x) && Number.isFinite(p.y)) {
					points.push(p);
				}
			}

			return points;
		})
		.filter((stroke) => stroke.length >= 2);
};

const flattenStrokePaths = (value, out = []) => {
	if (!value) {
		return out;
	}

	if (typeof value === "string") {
		const trimmed = value.trim();
		if (!trimmed) {
			return out;
		}

		try {
			return flattenStrokePaths(JSON.parse(trimmed), out);
		} catch (error) {
			out.push(trimmed);
			return out;
		}
	}

	if (Array.isArray(value)) {
		for (const item of value) {
			flattenStrokePaths(item, out);
		}
		return out;
	}

	if (typeof value === "object") {
		if (typeof value.d === "string") {
			out.push(value.d);
			return out;
		}
		if (typeof value.path === "string") {
			out.push(value.path);
			return out;
		}
		if (Array.isArray(value.paths)) {
			flattenStrokePaths(value.paths, out);
			return out;
		}

		for (const nested of Object.values(value)) {
			flattenStrokePaths(nested, out);
		}
	}

	return out;
};

const lerpPoint = (a, b, t) => ({
	x: a.x + (b.x - a.x) * t,
	y: a.y + (b.y - a.y) * t,
});

const sampleLine = (start, end, segments = 10) => {
	const pts = [];
	for (let i = 0; i <= segments; i += 1) {
		pts.push(lerpPoint(start, end, i / segments));
	}
	return pts;
};

const sampleQuadratic = (start, control, end, segments = 14) => {
	const pts = [];
	for (let i = 0; i <= segments; i += 1) {
		const t = i / segments;
		const u = 1 - t;
		pts.push({
			x: u * u * start.x + 2 * u * t * control.x + t * t * end.x,
			y: u * u * start.y + 2 * u * t * control.y + t * t * end.y,
		});
	}
	return pts;
};

const sampleCubic = (start, c1, c2, end, segments = 18) => {
	const pts = [];
	for (let i = 0; i <= segments; i += 1) {
		const t = i / segments;
		const u = 1 - t;
		pts.push({
			x:
				u * u * u * start.x +
				3 * u * u * t * c1.x +
				3 * u * t * t * c2.x +
				t * t * t * end.x,
			y:
				u * u * u * start.y +
				3 * u * u * t * c1.y +
				3 * u * t * t * c2.y +
				t * t * t * end.y,
		});
	}
	return pts;
};

const svgPathToPoints = (d) => {
	const tokens = String(d || "").match(/[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) || [];
	if (!tokens.length) {
		return [];
	}

	let idx = 0;
	let cmd = "";
	let cur = { x: 0, y: 0 };
	let subStart = { x: 0, y: 0 };
	let prevCubicControl = null;
	let prevQuadControl = null;
	const points = [];

	const read = () => {
		const n = Number(tokens[idx]);
		idx += 1;
		return Number.isFinite(n) ? n : 0;
	};

	const pushPoints = (strokePts) => {
		if (!Array.isArray(strokePts) || !strokePts.length) {
			return;
		}
		if (!points.length) {
			points.push(...strokePts);
			return;
		}
		const last = points[points.length - 1];
		const first = strokePts[0];
		if (Math.abs(last.x - first.x) < 1e-7 && Math.abs(last.y - first.y) < 1e-7) {
			points.push(...strokePts.slice(1));
			return;
		}
		points.push(...strokePts);
	};

	while (idx < tokens.length) {
		const tk = tokens[idx];
		if (/^[a-zA-Z]$/.test(tk)) {
			cmd = tk;
			idx += 1;
		} else if (!cmd) {
			break;
		}

		switch (cmd) {
			case "M":
			case "m": {
				let first = true;
				while (idx < tokens.length && !/^[a-zA-Z]$/.test(tokens[idx])) {
					const x = read();
					const y = read();
					const next = cmd === "m" ? { x: cur.x + x, y: cur.y + y } : { x, y };
					if (first) {
						cur = next;
						subStart = next;
						points.push({ ...next });
						first = false;
					} else {
						pushPoints(sampleLine(cur, next));
						cur = next;
					}
				}
				prevCubicControl = null;
				prevQuadControl = null;
				break;
			}
			case "L":
			case "l": {
				while (idx < tokens.length && !/^[a-zA-Z]$/.test(tokens[idx])) {
					const x = read();
					const y = read();
					const next = cmd === "l" ? { x: cur.x + x, y: cur.y + y } : { x, y };
					pushPoints(sampleLine(cur, next));
					cur = next;
				}
				prevCubicControl = null;
				prevQuadControl = null;
				break;
			}
			case "H":
			case "h": {
				while (idx < tokens.length && !/^[a-zA-Z]$/.test(tokens[idx])) {
					const x = read();
					const next = cmd === "h" ? { x: cur.x + x, y: cur.y } : { x, y: cur.y };
					pushPoints(sampleLine(cur, next));
					cur = next;
				}
				prevCubicControl = null;
				prevQuadControl = null;
				break;
			}
			case "V":
			case "v": {
				while (idx < tokens.length && !/^[a-zA-Z]$/.test(tokens[idx])) {
					const y = read();
					const next = cmd === "v" ? { x: cur.x, y: cur.y + y } : { x: cur.x, y };
					pushPoints(sampleLine(cur, next));
					cur = next;
				}
				prevCubicControl = null;
				prevQuadControl = null;
				break;
			}
			case "C":
			case "c": {
				while (idx < tokens.length && !/^[a-zA-Z]$/.test(tokens[idx])) {
					const c1 = cmd === "c" ? { x: cur.x + read(), y: cur.y + read() } : { x: read(), y: read() };
					const c2 = cmd === "c" ? { x: cur.x + read(), y: cur.y + read() } : { x: read(), y: read() };
					const end = cmd === "c" ? { x: cur.x + read(), y: cur.y + read() } : { x: read(), y: read() };
					pushPoints(sampleCubic(cur, c1, c2, end));
					cur = end;
					prevCubicControl = c2;
					prevQuadControl = null;
				}
				break;
			}
			case "S":
			case "s": {
				while (idx < tokens.length && !/^[a-zA-Z]$/.test(tokens[idx])) {
					const c1 = prevCubicControl
						? { x: cur.x * 2 - prevCubicControl.x, y: cur.y * 2 - prevCubicControl.y }
						: { ...cur };
					const c2 = cmd === "s" ? { x: cur.x + read(), y: cur.y + read() } : { x: read(), y: read() };
					const end = cmd === "s" ? { x: cur.x + read(), y: cur.y + read() } : { x: read(), y: read() };
					pushPoints(sampleCubic(cur, c1, c2, end));
					cur = end;
					prevCubicControl = c2;
					prevQuadControl = null;
				}
				break;
			}
			case "Q":
			case "q": {
				while (idx < tokens.length && !/^[a-zA-Z]$/.test(tokens[idx])) {
					const c = cmd === "q" ? { x: cur.x + read(), y: cur.y + read() } : { x: read(), y: read() };
					const end = cmd === "q" ? { x: cur.x + read(), y: cur.y + read() } : { x: read(), y: read() };
					pushPoints(sampleQuadratic(cur, c, end));
					cur = end;
					prevQuadControl = c;
					prevCubicControl = null;
				}
				break;
			}
			case "T":
			case "t": {
				while (idx < tokens.length && !/^[a-zA-Z]$/.test(tokens[idx])) {
					const c = prevQuadControl
						? { x: cur.x * 2 - prevQuadControl.x, y: cur.y * 2 - prevQuadControl.y }
						: { ...cur };
					const end = cmd === "t" ? { x: cur.x + read(), y: cur.y + read() } : { x: read(), y: read() };
					pushPoints(sampleQuadratic(cur, c, end));
					cur = end;
					prevQuadControl = c;
					prevCubicControl = null;
				}
				break;
			}
			case "A":
			case "a": {
				while (idx < tokens.length && !/^[a-zA-Z]$/.test(tokens[idx])) {
					read();
					read();
					read();
					read();
					read();
					const x = read();
					const y = read();
					const end = cmd === "a" ? { x: cur.x + x, y: cur.y + y } : { x, y };
					pushPoints(sampleLine(cur, end));
					cur = end;
				}
				prevCubicControl = null;
				prevQuadControl = null;
				break;
			}
			case "Z":
			case "z": {
				pushPoints(sampleLine(cur, subStart));
				cur = { ...subStart };
				prevCubicControl = null;
				prevQuadControl = null;
				break;
			}
			default:
				idx += 1;
				break;
		}
	}

	if (points.length < 2) {
		return [];
	}

	const deduped = [points[0]];
	for (let i = 1; i < points.length; i += 1) {
		const prev = deduped[deduped.length - 1];
		const curPoint = points[i];
		if (Math.abs(prev.x - curPoint.x) > 1e-6 || Math.abs(prev.y - curPoint.y) > 1e-6) {
			deduped.push(curPoint);
		}
	}

	return deduped.length >= 2 ? deduped : [];
};

const normalizeStrokes = (strokes) => {
	if (!Array.isArray(strokes) || !strokes.length) {
		return [];
	}

	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;

	for (const stroke of strokes) {
		for (const p of stroke) {
			minX = Math.min(minX, p.x);
			minY = Math.min(minY, p.y);
			maxX = Math.max(maxX, p.x);
			maxY = Math.max(maxY, p.y);
		}
	}

	if (!Number.isFinite(minX)) {
		return [];
	}

	const cx = (minX + maxX) / 2;
	const cy = (minY + maxY) / 2;
	const size = Math.max(maxX - minX, maxY - minY, 1);

	return strokes
		.map((stroke) => stroke.map((p) => ({ x: (p.x - cx) / size + 0.5, y: (p.y - cy) / size + 0.5 })))
		.filter((stroke) => stroke.length >= 2);
};

const resampleStroke = (stroke, count = 20) => {
	if (!Array.isArray(stroke) || stroke.length < 2) {
		return [];
	}

	const cumulative = [0];
	let total = 0;
	for (let i = 1; i < stroke.length; i += 1) {
		total += distance(stroke[i - 1], stroke[i]);
		cumulative.push(total);
	}

	if (total <= 1e-8) {
		return Array.from({ length: count }, () => ({ ...stroke[0] }));
	}

	const result = [];
	const step = total / Math.max(1, count - 1);
	let seg = 1;

	for (let k = 0; k < count; k += 1) {
		const target = Math.min(total, k * step);
		while (seg < cumulative.length && cumulative[seg] < target) {
			seg += 1;
		}

		if (seg >= cumulative.length) {
			result.push({ ...stroke[stroke.length - 1] });
			continue;
		}

		const prevLen = cumulative[seg - 1];
		const nextLen = cumulative[seg];
		const ratio = nextLen > prevLen ? (target - prevLen) / (nextLen - prevLen) : 0;
		const a = stroke[seg - 1];
		const b = stroke[seg];
		result.push({ x: a.x + (b.x - a.x) * ratio, y: a.y + (b.y - a.y) * ratio });
	}

	return result;
};

const scoreStrokePair = (leftStroke, rightStroke) => {
	const left = resampleStroke(leftStroke, 20);
	const right = resampleStroke(rightStroke, 20);
	if (!left.length || !right.length) {
		return 0;
	}

	let total = 0;
	for (let i = 0; i < left.length; i += 1) {
		total += distance(left[i], right[i]);
	}

	const mean = total / left.length;
	return clamp01(1 - mean / 0.55);
};

const greedyScore = (userStrokes, refStrokes) => {
	if (!userStrokes.length || !refStrokes.length) {
		return 0;
	}

	const pairs = [];
	for (let i = 0; i < userStrokes.length; i += 1) {
		for (let j = 0; j < refStrokes.length; j += 1) {
			pairs.push({ i, j, score: scoreStrokePair(userStrokes[i], refStrokes[j]) });
		}
	}

	pairs.sort((a, b) => b.score - a.score);
	const usedLeft = new Set();
	const usedRight = new Set();
	let sum = 0;
	let matched = 0;

	for (const pair of pairs) {
		if (usedLeft.has(pair.i) || usedRight.has(pair.j)) {
			continue;
		}
		usedLeft.add(pair.i);
		usedRight.add(pair.j);
		sum += pair.score;
		matched += 1;
		if (matched === Math.min(userStrokes.length, refStrokes.length)) {
			break;
		}
	}

	if (!matched) {
		return 0;
	}

	const coveragePenalty =
		Math.abs(userStrokes.length - refStrokes.length) /
		Math.max(userStrokes.length, refStrokes.length, 1);

	return clamp01((sum / matched) * (1 - coveragePenalty * 0.35));
};

const buildPointCloud = (strokes, perStroke = 10, maxPoints = 220) => {
	if (!Array.isArray(strokes) || !strokes.length) {
		return [];
	}

	const cloud = [];
	for (const stroke of strokes) {
		const samples = resampleStroke(stroke, perStroke);
		for (const point of samples) {
			cloud.push(point);
			if (cloud.length >= maxPoints) {
				return cloud;
			}
		}
	}

	return cloud;
};

const oneWayNearestAverage = (fromPoints, toPoints) => {
	if (!fromPoints.length || !toPoints.length) {
		return Infinity;
	}

	let total = 0;
	for (const point of fromPoints) {
		let best = Infinity;
		for (const target of toPoints) {
			const d = distance(point, target);
			if (d < best) {
				best = d;
			}
		}
		total += best;
	}

	return total / fromPoints.length;
};

const cloudSimilarity = (leftCloud, rightCloud) => {
	if (!leftCloud.length || !rightCloud.length) {
		return 0;
	}

	const forward = oneWayNearestAverage(leftCloud, rightCloud);
	const backward = oneWayNearestAverage(rightCloud, leftCloud);
	const chamfer = (forward + backward) / 2;
	return clamp01(1 - chamfer / 0.26);
};

const getKanjiReference = (record) => {
	const cacheKey = record?.id || record?.characterKanji;
	if (!cacheKey) {
		return null;
	}

	if (kanjiStrokeCache.has(cacheKey)) {
		return kanjiStrokeCache.get(cacheKey);
	}

	const paths = flattenStrokePaths(record?.strokePaths);
	const rawStrokes = paths.map((item) => svgPathToPoints(item)).filter((stroke) => stroke.length >= 2);
	const strokes = normalizeStrokes(rawStrokes);

	if (!strokes.length) {
		kanjiStrokeCache.set(cacheKey, null);
		return null;
	}

	const reference = {
		kanji: String(record?.characterKanji || "").trim(),
		strokeCount: Number(record?.strokeCount) || strokes.length,
		strokes,
		cloud: buildPointCloud(strokes, 10, 220),
	};

	kanjiStrokeCache.set(cacheKey, reference);
	return reference;
};

const resolveWordByKeyword = async (rawWord) => {
	const keyword = String(rawWord || "").trim();
	if (!keyword) {
		return null;
	}

	const exactWord = await db.Word.findOne({
		where: { word: keyword },
		attributes: ["id", "word"],
		raw: true,
	});
	if (exactWord) {
		return exactWord;
	}

	const variants = splitVariants(keyword);
	for (const variant of variants) {
		const exactVariant = await db.Word.findOne({
			where: { word: variant },
			attributes: ["id", "word"],
			raw: true,
		});
		if (exactVariant) {
			return exactVariant;
		}
	}

	return db.Word.findOne({
		where: {
			[Op.or]: [{ word: { [Op.like]: `%${keyword}%` } }],
		},
		attributes: ["id", "word"],
		order: [["isCommon", "DESC"], ["id", "ASC"]],
		raw: true,
	});
};

const resolveWordTarget = async ({ wordId, word }) => {
	const normalizedWordId = Number(wordId);
	if (normalizedWordId) {
		const byId = await db.Word.findOne({
			where: { id: normalizedWordId },
			attributes: ["id", "word"],
			raw: true,
		});
		if (byId) {
			return byId;
		}
	}

	return resolveWordByKeyword(word);
};

const getFallbackExamplesForWord = async (word, limit = 5) => {
	const safeLimit = Number.isFinite(+limit) ? Math.max(1, Math.min(+limit, 10)) : 5;
	const conditions = buildWordExampleConditions(word);

	if (conditions.length === 0) {
		return [];
	}

	const examples = await db.Example.findAll({
		where: {
			[Op.or]: conditions,
		},
		attributes: ["id", "japaneseSentence", "vietnameseTranslation", "createdAt"],
		order: [["createdAt", "DESC"]],
		limit: safeLimit,
		raw: true,
	});

	const seen = new Set();
	return examples.filter((item) => {
		const key = `${item.japaneseSentence}__${item.vietnameseTranslation}`;
		if (seen.has(key)) {
			return false;
		}
		seen.add(key);
		return true;
	});
};

let searchWords = (query, limit = 30) => {
	return new Promise(async (resolve, reject) => {
		try {
			const keyword = (query || "").trim();
			const safeLimit = Number.isFinite(+limit)
				? Math.max(1, Math.min(+limit, 100))
				: 30;

			if (!keyword) {
				resolve([]);
				return;
			}

			const words = await db.Word.findAll({
				where: {
					[Op.or]: [
						{ word: { [Op.like]: `%${keyword}%` } },
						{ reading: { [Op.like]: `%${keyword}%` } },
						{ romaji: { [Op.like]: `%${keyword}%` } },
					],
				},
				include: [
					{
						model: db.Meaning,
						as: "meanings",
						attributes: ["id", "definition", "partOfSpeech", "language"],
						required: false,
					},
					{
						model: db.Example,
						as: "examples",
						attributes: ["id", "japaneseSentence", "vietnameseTranslation"],
						required: false,
					},
					{
						model: db.Kanji,
						as: "kanjis",
						attributes: ["id", "characterKanji", "meaning", "kunyomi", "onyomi", "jlptLevel", "strokeCount"],
						through: { attributes: [] },
						required: false,
					},
				],
				order: [
					["isCommon", "DESC"],
					["jlptLevel", "ASC"],
					["word", "ASC"],
				],
				limit: safeLimit,
			});

			for (const word of words) {
				const currentExamples = Array.isArray(word.examples) ? word.examples : [];
				if (currentExamples.length === 0) {
					word.examples = await getFallbackExamplesForWord(word, 5);
				} else {
					word.examples = currentExamples.slice(0, 5);
				}

				// Limit meanings and kanjis
				if (Array.isArray(word.meanings)) {
					word.meanings = word.meanings.slice(0, 2);
				}
				if (Array.isArray(word.kanjis)) {
					word.kanjis = word.kanjis.slice(0, 5);
				}
			}

			resolve(words);
		} catch (e) {
			reject(e);
		}
	});
};

let searchKanjis = (query, limit = 30) => {
	return new Promise(async (resolve, reject) => {
		try {
			const keyword = (query || "").trim();
			const safeLimit = Number.isFinite(+limit)
				? Math.max(1, Math.min(+limit, 100))
				: 30;

			if (!keyword) {
				resolve([]);
				return;
			}

			const kanjiChars = keyword.match(/[\u4e00-\u9faf\u3400-\u4dbf]/g) || [];

			if (kanjiChars.length > 0) {
				const kanjis = await db.Kanji.findAll({
					where: {
						characterKanji: {
							[Op.in]: [...new Set(kanjiChars)],
						},
					},
					include: [
						{
							model: db.Word,
							as: "words",
							attributes: ["id", "word", "reading", "romaji"],
							through: { attributes: [] },
							required: false,
							include: [
								{
									model: db.Meaning,
									as: "meanings",
									attributes: ["id", "definition", "partOfSpeech"],
									required: false,
									limit: 1,
								},
								{
									model: db.Example,
									as: "examples",
									attributes: ["id", "japaneseSentence", "vietnameseTranslation"],
									required: false,
									limit: 2,
								},
							],
						},
					],
					order: [
						["jlptLevel", "ASC"],
						["characterKanji", "ASC"],
					],
				});

				resolve(kanjis);
				return;
			}

			// Fallback for kana/meaning searches when query contains no Kanji.
			const kanjis = await db.Kanji.findAll({
				where: {
					[Op.or]: [
						{ characterKanji: { [Op.like]: `%${keyword}%` } },
						{ meaning: { [Op.like]: `%${keyword}%` } },
						{ kunyomi: { [Op.like]: `%${keyword}%` } },
						{ onyomi: { [Op.like]: `%${keyword}%` } },
					],
				},
				include: [
					{
						model: db.Word,
						as: "words",
						attributes: ["id", "word", "reading", "romaji"],
						through: { attributes: [] },
						required: false,
						include: [
							{
								model: db.Meaning,
								as: "meanings",
								attributes: ["id", "definition", "partOfSpeech"],
								required: false,
								limit: 1,
							},
							{
								model: db.Example,
								as: "examples",
								attributes: ["id", "japaneseSentence", "vietnameseTranslation"],
								required: false,
								limit: 2,
							},
						],
					},
				],
				order: [
					["jlptLevel", "ASC"],
					["characterKanji", "ASC"],
				],
				limit: safeLimit,
			});

			resolve(kanjis);
		} catch (e) {
			reject(e);
		}
	});
};

let searchSentences = (query, limit = 20) => {
	return new Promise(async (resolve, reject) => {
		try {
			const keyword = (query || "").trim();
			const safeLimit = Number.isFinite(+limit)
				? Math.max(1, Math.min(+limit, 100))
				: 20;

			if (!keyword) {
				resolve([]);
				return;
			}

			const examples = await db.Example.findAll({
				where: {
					[Op.or]: [
						{ japaneseSentence: { [Op.like]: `%${keyword}%` } },
						{ vietnameseTranslation: { [Op.like]: `%${keyword}%` } },
					],
				},
				include: [
					{
						model: db.Word,
						as: "word",
						attributes: ["id", "word", "reading", "romaji"],
						required: false,
					},
				],
				order: [["id", "DESC"]],
				// Pull a larger candidate set, then dedupe by sentence content.
				limit: Math.min(safeLimit * 5, 500),
			});

			const seen = new Set();
			const uniqueExamples = [];

			for (const item of examples) {
				const key = `${item.japaneseSentence}__${item.vietnameseTranslation}`;
				if (!seen.has(key)) {
					seen.add(key);
					uniqueExamples.push(item);
				}

				if (uniqueExamples.length >= safeLimit) {
					break;
				}
			}

			resolve(uniqueExamples);
		} catch (e) {
			reject(e);
		}
	});
};

let searchGrammars = (query, limit = 20) => {
	return new Promise(async (resolve, reject) => {
		try {
			const keyword = (query || "").trim();
			const safeLimit = Number.isFinite(+limit)
				? Math.max(1, Math.min(+limit, 100))
				: 20;

			if (!keyword) {
				resolve([]);
				return;
			}

			const grammars = await db.Grammar.findAll({
				where: {
					[Op.or]: [
						{ title: { [Op.like]: `%${keyword}%` } },
						{ meaning: { [Op.like]: `%${keyword}%` } },
						{ formation: { [Op.like]: `%${keyword}%` } },
						{ usageNote: { [Op.like]: `%${keyword}%` } },
					],
				},
				include: [
					{
						model: db.GrammarExample,
						as: "examples",
						attributes: [
							"id",
							"japaneseSentence",
							"readingSentence",
							"vietnameseTranslation",
						],
						required: false,
						limit: 6,
					},
				],
				order: [["jlptLevel", "ASC"], ["title", "ASC"]],
				limit: safeLimit,
			});

			resolve(grammars);
		} catch (e) {
			reject(e);
		}
	});
};

let addSearchHistory = async (userId, searchTerm) => {
	const normalizedUserId = Number(userId);
	const normalizedTerm = String(searchTerm || "").trim();

	if (!normalizedUserId || !normalizedTerm) {
		return null;
	}

	return db.SearchHistory.create({
		userId: normalizedUserId,
		searchTerm: normalizedTerm.slice(0, 100),
		searchedAt: new Date(),
	});
};

let getSearchHistory = async (userId, limit = 80, offset = 0) => {
	const normalizedUserId = Number(userId);
	if (!normalizedUserId) {
		return [];
	}

	const safeLimit = parseLimit(limit, 80, 200);
	const safeOffset = parseOffset(offset, 0, 200000);

	const rows = await db.SearchHistory.findAll({
		where: { userId: normalizedUserId },
		attributes: ["id", "searchTerm", "searchedAt"],
		order: [["searchedAt", "DESC"], ["id", "DESC"]],
		limit: safeLimit,
		offset: safeOffset,
		raw: true,
	});

	return rows.map((item) => ({
		id: item.id,
		word: item.searchTerm,
		meaning: "",
		searchedAt: item.searchedAt,
	}));
};

let getSearchHistoryTotal = async (userId) => {
	const normalizedUserId = Number(userId);
	if (!normalizedUserId) {
		return 0;
	}

	const total = await db.SearchHistory.count({
		where: { userId: normalizedUserId },
	});

	return Number(total) || 0;
};

let clearSearchHistory = async (userId) => {
	const normalizedUserId = Number(userId);
	if (!normalizedUserId) {
		return 0;
	}

	const deleted = await db.SearchHistory.destroy({
		where: { userId: normalizedUserId },
	});

	return deleted;
};

let getTopSearchKeywordsToday = async (limit = 8) => {
	const safeLimit = parseLimit(limit, 8, 50);

	const startOfDay = new Date();
	startOfDay.setHours(0, 0, 0, 0);

	const endOfDay = new Date();
	endOfDay.setHours(23, 59, 59, 999);

	const rows = await db.SearchHistory.findAll({
		where: {
			searchedAt: {
				[Op.between]: [startOfDay, endOfDay],
			},
		},
		attributes: [
			"searchTerm",
			[db.Sequelize.fn("COUNT", db.Sequelize.col("searchTerm")), "searchCount"],
		],
		group: ["searchTerm"],
		order: [
			[db.Sequelize.literal("searchCount"), "DESC"],
			["searchTerm", "ASC"],
		],
		limit: safeLimit,
		raw: true,
	});

	return rows.map((item) => ({
		word: item.searchTerm,
		count: Number(item.searchCount) || 0,
	}));
};

let addWordContribution = async (userId, payload = {}) => {
	const normalizedUserId = Number(userId);
	const text = String(payload.content || "").trim();

	if (!normalizedUserId || !text) {
		return null;
	}

	const resolvedWord = await resolveWordTarget({
		wordId: payload.wordId,
		word: payload.word,
	});
	if (!resolvedWord) {
		return null;
	}

	const created = await db.Comment.create({
		userId: normalizedUserId,
		targetType: "word",
		targetId: resolvedWord.id,
		content: text,
	});

	const createdRow = await db.Comment.findOne({
		where: { id: created.id },
		attributes: ["id", "content", "upvotes", "createdAt"],
		include: [
			{
				model: db.User,
				as: "user",
				attributes: ["id", "username"],
				required: false,
			},
		],
		raw: true,
	});

	return {
		id: createdRow.id,
		word: resolvedWord.word,
		content: createdRow.content,
		author: createdRow["user.username"] || "Bạn",
		createdAt: createdRow.createdAt,
		upvotes: createdRow.upvotes || 0,
	};
};

let getWordContributions = async ({ word, wordId } = {}, limit = 100) => {
	const resolvedWord = await resolveWordTarget({ wordId, word });
	if (!resolvedWord) {
		return [];
	}

	const safeLimit = parseLimit(limit, 100, 200);
	const rows = await db.Comment.findAll({
		where: {
			targetType: "word",
			targetId: resolvedWord.id,
			isHidden: false,
		},
		attributes: ["id", "content", "upvotes", "createdAt"],
		include: [
			{
				model: db.User,
				as: "user",
				attributes: ["id", "username"],
				required: false,
			},
		],
		order: [["createdAt", "DESC"], ["id", "DESC"]],
		limit: safeLimit,
		raw: true,
	});

	return rows.map((item) => ({
		id: item.id,
		word: resolvedWord.word,
		content: item.content,
		author: item["user.username"] || "Bạn",
		createdAt: item.createdAt,
		upvotes: item.upvotes || 0,
	}));
};

let getLatestWordContributions = async (limit = 6, offset = 0) => {
	const safeLimit = parseLimit(limit, 6, 100);
	const safeOffset = parseOffset(offset, 0, 200000);

	const rows = await db.Comment.findAll({
		where: {
			targetType: "word",
			isHidden: false,
		},
		attributes: ["id", "targetId", "content", "upvotes", "createdAt"],
		include: [
			{
				model: db.User,
				as: "user",
				attributes: ["id", "username"],
				required: false,
			},
		],
		order: [["createdAt", "DESC"], ["id", "DESC"]],
		limit: safeLimit,
		offset: safeOffset,
		raw: true,
	});

	const wordIds = [...new Set(rows.map((item) => item.targetId).filter(Boolean))];
	const words = wordIds.length
		? await db.Word.findAll({
				where: { id: { [Op.in]: wordIds } },
				attributes: ["id", "word"],
				raw: true,
		  })
		: [];

	const wordMap = new Map(words.map((item) => [item.id, item.word]));

	return rows
		.map((item) => ({
			id: item.id,
			word: wordMap.get(item.targetId) || "",
			content: item.content,
			author: item["user.username"] || "Bạn",
			createdAt: item.createdAt,
			upvotes: item.upvotes || 0,
		}))
		.filter((item) => item.word);
};

let getLatestWordContributionsTotal = async () => {
	const total = await db.Comment.count({
		where: {
			targetType: "word",
			isHidden: false,
		},
	});

	return Number(total) || 0;
};

let recognizeKanjiFromInk = async ({ ink, width = 280, height = 280, numResults = 20 }) => {
	const safeNumResults = parseLimit(numResults, 20, 30);
	const userRawStrokes = normalizeInkPayload(ink);

	if (!userRawStrokes.length) {
		return [];
	}

	const userStrokes = normalizeStrokes(userRawStrokes);
	if (!userStrokes.length) {
		return [];
	}
	const userCloud = buildPointCloud(userStrokes, 10, 220);
	const userStrokeCount = userStrokes.length;
	const primaryStrokeGap = 3;
	const secondaryStrokeGap = 6;
	const maxCandidatesForScoring = 260;

	const baseWhere = {
		strokePaths: {
			[Op.ne]: null,
		},
	};

	let kanjiRows = await db.Kanji.findAll({
		where: {
			...baseWhere,
			strokeCount: {
				[Op.between]: [Math.max(1, userStrokeCount - primaryStrokeGap), userStrokeCount + primaryStrokeGap],
			},
		},
		attributes: ["id", "characterKanji", "strokeCount", "strokePaths"],
		raw: true,
	});

	if (kanjiRows.length < Math.max(40, safeNumResults * 8)) {
		kanjiRows = await db.Kanji.findAll({
			where: {
				...baseWhere,
				strokeCount: {
					[Op.between]: [Math.max(1, userStrokeCount - secondaryStrokeGap), userStrokeCount + secondaryStrokeGap],
				},
			},
			attributes: ["id", "characterKanji", "strokeCount", "strokePaths"],
			raw: true,
		});
	}

	if (kanjiRows.length > maxCandidatesForScoring) {
		kanjiRows = kanjiRows
			.sort((a, b) => {
				const aGap = Math.abs((Number(a.strokeCount) || userStrokeCount) - userStrokeCount);
				const bGap = Math.abs((Number(b.strokeCount) || userStrokeCount) - userStrokeCount);
				if (aGap !== bGap) {
					return aGap - bGap;
				}
				return String(a.characterKanji || "").localeCompare(String(b.characterKanji || ""));
			})
			.slice(0, maxCandidatesForScoring);
	}

	const scored = [];
	for (const row of kanjiRows) {
		const ref = getKanjiReference(row);
		if (!ref?.kanji || !ref.strokes?.length) {
			continue;
		}
		if (Math.abs(userStrokes.length - ref.strokeCount) > secondaryStrokeGap) {
			continue;
		}

		const shapeScore = greedyScore(userStrokes, ref.strokes);
		const cloudScore = cloudSimilarity(userCloud, ref.cloud || []);
		const countScore = clamp01(
			1 - Math.abs(userStrokes.length - ref.strokeCount) / Math.max(userStrokes.length, ref.strokeCount, 1)
		);
		const finalScore = cloudScore * 0.62 + shapeScore * 0.18 + countScore * 0.20;

		if (!Number.isFinite(finalScore)) {
			continue;
		}

		scored.push({ kanji: ref.kanji, score: finalScore, strokeCount: ref.strokeCount });
	}

	return scored
		.sort((a, b) => {
			if (b.score !== a.score) {
				return b.score - a.score;
			}
			if (a.strokeCount !== b.strokeCount) {
				return a.strokeCount - b.strokeCount;
			}
			return a.kanji.localeCompare(b.kanji);
		})
		.map((item) => item.kanji)
		.filter(Boolean)
		.slice(0, safeNumResults);
};

module.exports = {
	searchWords,
	searchKanjis,
	searchSentences,
	searchGrammars,
	recognizeKanjiFromInk,
	addSearchHistory,
	getSearchHistory,
	getSearchHistoryTotal,
	getTopSearchKeywordsToday,
	clearSearchHistory,
	addWordContribution,
	getWordContributions,
	getLatestWordContributions,
	getLatestWordContributionsTotal,
};
