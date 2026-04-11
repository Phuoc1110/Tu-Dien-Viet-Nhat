const db = require("../models/index");
const { Op } = require("sequelize");

const buildWordPreview = (word) => ({
	id: word.id,
	type: "word",
	title: word.word,
	subtitle: word.reading || "",
	meaning: word.meanings?.[0]?.definition || "",
	jlptLevel: word.jlptLevel || null,
});

const buildKanjiPreview = (kanji) => ({
	id: kanji.id,
	type: "kanji",
	title: kanji.characterKanji,
	subtitle: kanji.sinoVietnamese || "",
	meaning: kanji.meaning || "",
	jlptLevel: kanji.jlptLevel || null,
});

const buildGrammarPreview = (grammar) => ({
	id: grammar.id,
	type: "grammar",
	title: grammar.title,
	subtitle: grammar.usageNote || "",
	meaning: grammar.meaning || "",
	jlptLevel: grammar.jlptLevel || null,
});

const loadItemPreviews = async (items) => {
	const groupedIds = {
		word: [],
		kanji: [],
		grammar: [],
	};

	for (const item of items || []) {
		if (groupedIds[item.itemType]) {
			groupedIds[item.itemType].push(item.itemId);
		}
	}

	const [words, kanjis, grammars] = await Promise.all([
		groupedIds.word.length
			? db.Word.findAll({
				where: { id: { [Op.in]: groupedIds.word } },
				include: [{ model: db.Meaning, as: "meanings", required: false }],
			})
			: Promise.resolve([]),
		groupedIds.kanji.length
			? db.Kanji.findAll({
				where: { id: { [Op.in]: groupedIds.kanji } },
			})
			: Promise.resolve([]),
		groupedIds.grammar.length
			? db.Grammar.findAll({
				where: { id: { [Op.in]: groupedIds.grammar } },
			})
			: Promise.resolve([]),
	]);

	const wordMap = new Map(words.map((item) => [item.id, buildWordPreview(item.get({ plain: true }))]));
	const kanjiMap = new Map(kanjis.map((item) => [item.id, buildKanjiPreview(item.get({ plain: true }))]));
	const grammarMap = new Map(
		grammars.map((item) => [item.id, buildGrammarPreview(item.get({ plain: true }))])
	);

	return (items || []).map((item) => {
		let preview = null;
		if (item.itemType === "word") {
			preview = wordMap.get(item.itemId) || null;
		} else if (item.itemType === "kanji") {
			preview = kanjiMap.get(item.itemId) || null;
		} else if (item.itemType === "grammar") {
			preview = grammarMap.get(item.itemId) || null;
		}

		return {
			id: item.id,
			notebookId: item.notebookId,
			itemType: item.itemType,
			itemId: item.itemId,
			addedAt: item.addedAt,
			item: preview,
		};
	});
};

const formatNotebook = async (notebook, itemLimit = null) => {
	const plainNotebook = notebook.get({ plain: true });
	const items = Array.isArray(plainNotebook.items) ? plainNotebook.items : [];
	const selectedItems = typeof itemLimit === "number" ? items.slice(0, itemLimit) : items;
	const previewItems = await loadItemPreviews(selectedItems);

	return {
		id: plainNotebook.id,
		userId: plainNotebook.userId,
		name: plainNotebook.name,
		description: plainNotebook.description || "",
		createdAt: plainNotebook.createdAt,
		updatedAt: plainNotebook.updatedAt,
		owner: plainNotebook.user
			? {
				id: plainNotebook.user.id,
				username: plainNotebook.user.username,
				avatarUrl: plainNotebook.user.avatarUrl || null,
			}
			: null,
		itemsCount: items.length,
		items: previewItems,
	};
};

const getNotebookOverview = async (userId, limit = 6) => {
	const normalizedLimit = Math.min(Math.max(Number(limit) || 6, 1), 12);

	const [mineRaw, discoverRaw] = await Promise.all([
		db.Notebook.findAll({
			where: { userId },
			order: [["createdAt", "DESC"]],
			include: [
				{ model: db.User, as: "user", attributes: ["id", "username", "avatarUrl"] },
				{ model: db.NotebookItem, as: "items", order: [["addedAt", "DESC"]] },
			],
		}),
		db.Notebook.findAll({
			where: { userId: { [Op.ne]: userId } },
			order: [["createdAt", "DESC"]],
			include: [
				{ model: db.User, as: "user", attributes: ["id", "username", "avatarUrl"] },
				{ model: db.NotebookItem, as: "items", order: [["addedAt", "DESC"]] },
			],
		}),
	]);

	const shuffledDiscover = [...discoverRaw].sort(() => Math.random() - 0.5).slice(0, normalizedLimit);

	const myNotebooks = [];
	for (const notebook of mineRaw) {
		myNotebooks.push(await formatNotebook(notebook, 3));
	}

	const discoverNotebooks = [];
	for (const notebook of shuffledDiscover) {
		discoverNotebooks.push(await formatNotebook(notebook, 3));
	}

	return {
		myNotebooks,
		discoverNotebooks,
	};
};

const getNotebookDetail = async (notebookId) => {
	const notebook = await db.Notebook.findOne({
		where: { id: notebookId },
		include: [
			{ model: db.User, as: "user", attributes: ["id", "username", "avatarUrl"] },
			{ model: db.NotebookItem, as: "items", order: [["addedAt", "DESC"]] },
		],
	});

	if (!notebook) {
		return null;
	}

	return formatNotebook(notebook);
};

const createNotebook = async (userId, data) => {
	const name = String(data?.name || "").trim();
	const description = String(data?.description || "").trim();

	if (!name) {
		return { errCode: 1, errMessage: "Notebook name is required" };
	}

	const created = await db.Notebook.create({
		userId,
		name,
		description: description || null,
	});

	return { errCode: 0, notebook: created.get({ plain: true }) };
};

const addItemToNotebook = async (userId, notebookId, data) => {
	const itemType = String(data?.itemType || "").trim();
	const itemId = Number(data?.itemId);

	if (!["word", "kanji", "grammar"].includes(itemType) || !itemId) {
		return { errCode: 1, errMessage: "Invalid notebook item" };
	}

	const notebook = await db.Notebook.findOne({
		where: { id: notebookId, userId },
	});

	if (!notebook) {
		return { errCode: 2, errMessage: "Notebook not found" };
	}

	const exists = await db.NotebookItem.findOne({
		where: { notebookId, itemType, itemId },
	});

	if (exists) {
		return { errCode: 3, errMessage: "Item already exists in this notebook" };
	}

	const createdItem = await db.NotebookItem.create({
		notebookId,
		itemType,
		itemId,
	});

	return { errCode: 0, item: createdItem.get({ plain: true }) };
};

module.exports = {
	getNotebookOverview,
	getNotebookDetail,
	createNotebook,
	addItemToNotebook,
};