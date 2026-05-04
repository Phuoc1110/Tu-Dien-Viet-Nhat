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

const loadItemPreviews = async (items, userId = null) => {
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
	const reviewMap = new Map();

	if (userId && (items || []).length) {
		const reviewWhere = {
			userId,
			[Op.or]: (items || []).map((item) => ({
				itemType: item.itemType,
				itemId: item.itemId,
			})),
		};

		let reviews = [];
		if (db.UserFlashcardStatus) {
			try {
				reviews = await db.UserFlashcardStatus.findAll({
					where: reviewWhere,
					attributes: ["itemType", "itemId", "srs_stage", "isRemembered", "lastReviewedAt"],
				});
			} catch (error) {
				try {
					reviews = await db.UserFlashcardStatus.findAll({
						where: reviewWhere,
						attributes: ["itemType", "itemId", "srs_stage", "lastReviewedAt"],
					});
				} catch (fallbackError) {
					try {
						reviews = await db.UserFlashcardStatus.findAll({
							where: reviewWhere,
							attributes: ["itemType", "itemId", "isRemembered", "lastReviewedAt"],
						});
					} catch (finalError) {
						console.warn("Skip flashcard status lookup in notebookService.loadItemPreviews:", finalError?.message || fallbackError?.message || error?.message);
						reviews = [];
					}
				}
			}
		}

		for (const review of reviews) {
			const plain = review.get({ plain: true });
			reviewMap.set(`${plain.itemType}:${plain.itemId}`, plain);
		}
	}

	return (items || []).map((item) => {
		let preview = null;
		if (item.itemType === "word") {
			preview = wordMap.get(item.itemId) || null;
		} else if (item.itemType === "kanji") {
			preview = kanjiMap.get(item.itemId) || null;
		} else if (item.itemType === "grammar") {
			preview = grammarMap.get(item.itemId) || null;
		}

		const review = reviewMap.get(`${item.itemType}:${item.itemId}`) || null;
		const isRemembered =
			typeof review?.isRemembered === "boolean"
				? review.isRemembered
				: Number(review?.srs_stage || 0) > 0;

		return {
			id: item.id,
			notebookId: item.notebookId,
			itemType: item.itemType,
			itemId: item.itemId,
			addedAt: item.addedAt,
			item: preview,
			isRemembered,
			reviewState: isRemembered ? "remembered" : "unremembered",
		};
	});
};

const formatNotebook = async (notebook, itemLimit = null, userId = null) => {
	const plainNotebook = notebook.get({ plain: true });
	const items = Array.isArray(plainNotebook.items) ? plainNotebook.items : [];
	const selectedItems = typeof itemLimit === "number" ? items.slice(0, itemLimit) : items;
	const previewItems = await loadItemPreviews(selectedItems, userId);

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
	const normalizedLimit = Math.min(Math.max(Number(limit) || 6, 1), 200);

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
				{
					model: db.User,
					as: "user",
					attributes: ["id", "username", "avatarUrl", "role", "status"],
					required: true,
					where: {
						role: "user",
						status: "active",
					},
				},
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

const getCuratedNotebookCollections = async (limit = 12) => {
	const safeLimit = Math.min(Math.max(Number(limit) || 12, 1), 40);
	const rows = await db.Notebook.findAll({
		include: [
			{
				model: db.User,
				as: "user",
				attributes: ["id", "username", "role", "status"],
				required: true,
				where: {
					role: "admin",
					status: "active",
				},
			},
			{ model: db.NotebookItem, as: "items", required: false },
		],
		order: [["updatedAt", "DESC"], ["createdAt", "DESC"], ["id", "DESC"]],
		limit: safeLimit,
	});

	return rows.map((item) => {
		const plain = item.get({ plain: true });
		return {
			id: plain.id,
			name: plain.name,
			meta: plain.description || "",
			owner: plain.user?.username || "Ban quan tri",
			views: Array.isArray(plain.items) ? plain.items.length : 0,
		};
	});
};

const getNotebookDetail = async (notebookId, userId = null) => {
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

	return formatNotebook(notebook, null, userId);
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

const updateNotebook = async (userId, notebookId, data) => {
	const name = String(data?.name || "").trim();
	if (!name) {
		return { errCode: 1, errMessage: "Notebook name is required" };
	}

	const notebook = await db.Notebook.findOne({
		where: { id: notebookId, userId },
	});

	if (!notebook) {
		return { errCode: 2, errMessage: "Notebook not found" };
	}

	notebook.name = name;
	await notebook.save();

	return { errCode: 0, notebook: notebook.get({ plain: true }) };
};

const deleteNotebook = async (userId, notebookId) => {
	const notebook = await db.Notebook.findOne({
		where: { id: notebookId, userId },
	});

	if (!notebook) {
		return { errCode: 2, errMessage: "Notebook not found" };
	}

	await db.NotebookItem.destroy({
		where: { notebookId },
	});

	await db.Notebook.destroy({
		where: { id: notebookId },
	});

	return { errCode: 0 };
};

module.exports = {
	getNotebookOverview,
	getCuratedNotebookCollections,
	getNotebookDetail,
	createNotebook,
	addItemToNotebook,
	updateNotebook,
	deleteNotebook,
};