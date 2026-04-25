const db = require("../models/index");
const { Op } = require("sequelize");

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

module.exports = {
	getReadingPassages,
	getReadingPassageDetail,
	createReadingPassage,
	updateReadingPassage,
	upsertReadingProgress,
	getMyReadingProgresses,
};
