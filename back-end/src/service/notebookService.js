const db = require("../models/index");
const { Op, fn, col } = require("sequelize");

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

const groupItemIds = (items) => {
	const grouped = {
		word: new Set(),
		kanji: new Set(),
		grammar: new Set(),
	};

	for (const item of items || []) {
		const type = item?.itemType;
		if (!grouped[type]) {
			continue;
		}
		const id = Number(item.itemId);
		if (Number.isFinite(id) && id > 0) {
			grouped[type].add(id);
		}
	}

	return {
		word: Array.from(grouped.word),
		kanji: Array.from(grouped.kanji),
		grammar: Array.from(grouped.grammar),
	};
};

const buildReviewWhere = (userId, groupedIds) => {
	if (!userId) {
		return null;
	}

	const conditions = [];
	if (groupedIds.word?.length) {
		conditions.push({ itemType: "word", itemId: { [Op.in]: groupedIds.word } });
	}
	if (groupedIds.kanji?.length) {
		conditions.push({ itemType: "kanji", itemId: { [Op.in]: groupedIds.kanji } });
	}
	if (groupedIds.grammar?.length) {
		conditions.push({ itemType: "grammar", itemId: { [Op.in]: groupedIds.grammar } });
	}

	if (!conditions.length) {
		return null;
	}

	return {
		userId,
		[Op.or]: conditions,
	};
};

const loadItemPreviews = async (items, userId = null) => {
	const groupedIds = groupItemIds(items);

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

	const reviewWhere = buildReviewWhere(userId, groupedIds);
	if (reviewWhere && (items || []).length) {
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

const formatNotebook = async (notebook, itemLimit = null, userId = null, options = {}) => {
	const plainNotebook = notebook.get({ plain: true });
	const items = Array.isArray(plainNotebook.items) ? plainNotebook.items : [];
	const selectedItems = typeof itemLimit === "number" ? items.slice(0, itemLimit) : items;
	const previewItems = await loadItemPreviews(selectedItems, userId);
	const includeRememberedCount = options?.includeRememberedCount !== false;

	// compute remembered count for all items (real data) when userId is provided
	let rememberedCount = null;
	if (userId && includeRememberedCount && items.length) {
		if (selectedItems.length === items.length) {
			rememberedCount = previewItems.reduce(
				(total, item) => total + (item?.isRemembered ? 1 : 0),
				0
			);
		} else {
			const groupedIds = groupItemIds(items);
			const reviewWhere = buildReviewWhere(userId, groupedIds);
			let allReviews = [];
			if (reviewWhere && db.UserFlashcardStatus) {
				try {
					allReviews = await db.UserFlashcardStatus.findAll({
						where: reviewWhere,
						attributes: ["itemType", "itemId", "isRemembered", "srs_stage"],
					});
				} catch (error) {
					try {
						allReviews = await db.UserFlashcardStatus.findAll({
							where: reviewWhere,
							attributes: ["itemType", "itemId", "srs_stage"],
						});
					} catch (err2) {
						try {
							allReviews = await db.UserFlashcardStatus.findAll({
								where: reviewWhere,
								attributes: ["itemType", "itemId", "isRemembered"],
							});
						} catch (err3) {
							console.warn("Skip full flashcard status lookup in formatNotebook:", err3?.message || err2?.message || error?.message);
							allReviews = [];
						}
					}
				}
			}

			let counted = 0;
			for (const r of allReviews) {
				const p = r.get ? r.get({ plain: true }) : r;
				const isRem = typeof p?.isRemembered === "boolean" ? p.isRemembered : Number(p?.srs_stage || 0) > 0;
				if (isRem) counted += 1;
			}
			rememberedCount = counted;
		}
	}

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
		rememberedCount,
		items: previewItems,
	};
};

const getNotebookItemsCountMap = async (notebookIds) => {
	const ids = (notebookIds || [])
		.map((id) => Number(id))
		.filter((id) => Number.isFinite(id));
	if (!ids.length) {
		return new Map();
	}

	const rows = await db.NotebookItem.findAll({
		where: { notebookId: { [Op.in]: ids } },
		attributes: ["notebookId", [fn("COUNT", col("id")), "count"]],
		group: ["notebookId"],
	});

	const countMap = new Map();
	for (const row of rows) {
		const plain = row.get({ plain: true });
		countMap.set(Number(plain.notebookId), Number(plain.count) || 0);
	}
	return countMap;
};

const getNotebookProgressMap = async (userId, notebookIds) => {
	const ids = (notebookIds || [])
		.map((id) => Number(id))
		.filter((id) => Number.isFinite(id));
	if (!ids.length) {
		return new Map();
	}

	if (!userId || !db.UserFlashcardStatus) {
		const itemsCountMap = await getNotebookItemsCountMap(ids);
		const progressMap = new Map();
		itemsCountMap.forEach((count, notebookId) => {
			progressMap.set(notebookId, { itemsCount: count, rememberedCount: null });
		});
		return progressMap;
	}

	const rows = await db.sequelize.query(
		`
			SELECT
				ni.notebookId AS notebookId,
				COUNT(ni.id) AS itemsCount,
				SUM(CASE WHEN ufs.isRemembered = 1 THEN 1 ELSE 0 END) AS rememberedCount
			FROM NotebookItems ni
			LEFT JOIN UserFlashcardStatuses ufs
				ON ufs.userId = :userId
				AND ufs.itemType = ni.itemType
				AND ufs.itemId = ni.itemId
			WHERE ni.notebookId IN (:ids)
			GROUP BY ni.notebookId
		`,
		{
			replacements: { userId, ids },
			type: db.Sequelize.QueryTypes.SELECT,
		}
	);

	const progressMap = new Map();
	for (const row of rows) {
		const notebookId = Number(row.notebookId);
		progressMap.set(notebookId, {
			itemsCount: Number(row.itemsCount) || 0,
			rememberedCount: Number(row.rememberedCount) || 0,
		});
	}

	return progressMap;
};

const buildNotebookOverviewItem = (notebook, progressMap) => {
	const plain = notebook.get({ plain: true });
	const notebookId = Number(plain.id);
	const progress = progressMap.get(notebookId) || { itemsCount: 0, rememberedCount: null };
	return {
		id: plain.id,
		userId: plain.userId,
		name: plain.name,
		description: plain.description || "",
		createdAt: plain.createdAt,
		updatedAt: plain.updatedAt,
		owner: plain.user
			? {
				id: plain.user.id,
				username: plain.user.username,
				avatarUrl: plain.user.avatarUrl || null,
			}
			: null,
		itemsCount: progress.itemsCount || 0,
		rememberedCount:
			typeof progress.rememberedCount === "number" ? progress.rememberedCount : null,
		items: [],
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
			],
		}),
	]);

	const shuffledDiscover = [...discoverRaw].sort(() => Math.random() - 0.5).slice(0, normalizedLimit);
	const overviewIds = [
		...mineRaw.map((item) => item.id),
		...shuffledDiscover.map((item) => item.id),
	];
	const progressMap = await getNotebookProgressMap(userId, overviewIds);

	const myNotebooks = mineRaw.map((notebook) => buildNotebookOverviewItem(notebook, progressMap));
	const discoverNotebooks = shuffledDiscover.map((notebook) =>
		buildNotebookOverviewItem(notebook, progressMap)
	);

	return {
		myNotebooks,
		discoverNotebooks,
	};
};

const getCuratedNotebookCollections = async (userId = null, limit = 12) => {
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
		],
		order: [["updatedAt", "DESC"], ["createdAt", "DESC"], ["id", "DESC"]],
		limit: safeLimit,
	});
	const curatedIds = rows.map((item) => item.id);
	const progressMap = await getNotebookProgressMap(userId, curatedIds);

	return rows.map((item) => {
		const plain = item.get({ plain: true });
		const progress = progressMap.get(Number(plain.id)) || { itemsCount: 0, rememberedCount: null };
		const itemsCount = progress.itemsCount || 0;
		return {
			id: plain.id,
			name: plain.name,
			meta: plain.description || "",
			owner: plain.user?.username || "Ban quan tri",
			views: itemsCount,
			itemsCount,
			rememberedCount:
				typeof progress.rememberedCount === "number" ? progress.rememberedCount : null,
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