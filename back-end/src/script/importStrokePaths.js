//https://github.com/obfusk/kanji-strokes
const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");

const DB_CONFIG = {
	host: process.env.DB_HOST || "localhost",
	user: process.env.DB_USER || "root",
	password: process.env.DB_PASSWORD || "",
	database: process.env.DB_NAME || "jp_dict",
};

const INPUT_PATH = process.argv[2]
	? path.resolve(process.argv[2])
	: path.join(__dirname, "data", "Kanji", "stroke_paths.json");

function normalizeStrokePaths(value) {
	if (!value) return [];

	if (Array.isArray(value)) {
		return value
			.map((item, index) => {
				if (typeof item === "string") {
					return { d: item, order: index + 1 };
				}
				if (item && typeof item === "object") {
					return {
						d: item.d || item.path || "",
						order: item.order || index + 1,
					};
				}
				return null;
			})
			.filter((item) => item && item.d);
	}

	if (typeof value === "object") {
		if (Array.isArray(value.paths)) {
			return normalizeStrokePaths(value.paths);
		}
	}

	return [];
}

function toEntries(raw) {
	if (Array.isArray(raw)) {
		return raw
			.map((item) => {
				if (!item || typeof item !== "object") return null;
				const kanji = item.kanji || item.characterKanji || item.character;
				const strokePaths = item.strokePaths || item.paths || item.strokes;
				if (!kanji) return null;
				return { kanji, strokePaths };
			})
			.filter(Boolean);
	}

	if (raw && typeof raw === "object") {
		return Object.entries(raw).map(([kanji, strokePaths]) => ({ kanji, strokePaths }));
	}

	return [];
}

async function importStrokePaths() {
	if (!fs.existsSync(INPUT_PATH)) {
		console.error(`Input file not found: ${INPUT_PATH}`);
		process.exit(1);
	}

	const rawText = fs.readFileSync(INPUT_PATH, "utf8");
	const rawJson = JSON.parse(rawText);
	const entries = toEntries(rawJson);

	if (!entries.length) {
		console.error("No entries found in stroke paths file.");
		process.exit(1);
	}

	const connection = await mysql.createConnection(DB_CONFIG);
	await connection.beginTransaction();

	let updated = 0;
	let skipped = 0;

	try {
		for (const entry of entries) {
			const normalized = normalizeStrokePaths(entry.strokePaths);
			if (!normalized.length) {
				skipped += 1;
				continue;
			}

			const [result] = await connection.execute(
				"UPDATE Kanjis SET strokePaths = ?, updatedAt = ? WHERE characterKanji = ?",
				[JSON.stringify(normalized), new Date(), entry.kanji]
			);

			if (result.affectedRows > 0) {
				updated += 1;
			} else {
				skipped += 1;
			}
		}

		await connection.commit();
		console.log(`Done. Updated: ${updated}, Skipped: ${skipped}`);
	} catch (error) {
		await connection.rollback();
		console.error("Import failed:", error);
		process.exit(1);
	} finally {
		await connection.end();
	}
}

importStrokePaths();
