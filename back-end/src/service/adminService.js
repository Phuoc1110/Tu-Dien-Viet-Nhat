import db from "../models/index";
import bcrypt from "bcryptjs";
import { Op, fn, col, literal } from "sequelize";
import { CreateJWT } from "../middleware/JWT_Action";
require("dotenv").config();

const mapRole = (role) => {
    if (role === "editor") {
        return "moderator";
    }
    return role;
};

const writeAuditLog = async ({ adminId, actionType, targetType, targetId, details }) => {
    if (!adminId) {
        return;
    }
    try {
        await db.AdminLog.create({
            adminId,
            actionType,
            targetType,
            targetId,
            details: details ? JSON.stringify(details) : null,
        });
    } catch (e) {
        console.warn("Skip audit log write:", e?.message || e);
    }
};

const HandleAdminLogin = async (email, password) => {
    try {
        const adminUser = await db.User.findOne({
            where: { email },
            raw: true,
        });

        if (!adminUser) {
            return {
                errCode: 1,
                errMessage: "Yours's Email or Password is incorrect!",
            };
        }

        const isPasswordValid = bcrypt.compareSync(password, adminUser.passwordHash);
        if (!isPasswordValid) {
            return {
                errCode: 1,
                errMessage: "Yours's Email or Password is incorrect!",
            };
        }

        if (adminUser.status !== "active") {
            return {
                errCode: 2,
                errMessage: "Your admin account is not active",
            };
        }

        if (adminUser.role !== "admin") {
            return {
                errCode: 3,
                errMessage: "Admin permission required",
            };
        }

        const token = CreateJWT({
            id: adminUser.id,
            email: adminUser.email,
            username: adminUser.username,
            role: "admin",
            status: adminUser.status,
        });

        return {
            errCode: 0,
            errMessage: "OK",
            user: {
                id: adminUser.id,
                email: adminUser.email,
                fullName: adminUser.username || "System Admin",
                role: "admin",
            },
            DT: { access_token: token },
        };
    } catch (e) {
        throw e;
    }
};

const getAdminDashboard = async () => {
    const startedAt = Date.now();

    const [totalWords, totalKanjis, totalGrammars, totalExamples, totalUsers] = await Promise.all([
        db.Word.count(),
        db.Kanji.count(),
        db.Grammar.count(),
        db.Example.count(),
        db.User.count(),
    ]);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    const newUsers = await db.User.findAll({
        attributes: [
            [fn("DATE", col("createdAt")), "date"],
            [fn("COUNT", col("id")), "count"],
        ],
        where: { createdAt: { [Op.gte]: sevenDaysAgo } },
        group: [fn("DATE", col("createdAt"))],
        order: [[literal("date"), "ASC"]],
        raw: true,
    });

    const topSearchTerms = await db.SearchHistory.findAll({
        attributes: ["searchTerm", [fn("COUNT", col("searchTerm")), "count"]],
        group: ["searchTerm"],
        order: [[literal("count"), "DESC"]],
        limit: 10,
        raw: true,
    });

    const topJlptLevelsRaw = await db.Word.findAll({
        attributes: ["jlptLevel", [fn("COUNT", col("id")), "count"]],
        where: { jlptLevel: { [Op.ne]: null } },
        group: ["jlptLevel"],
        order: [[literal("count"), "DESC"]],
        raw: true,
    });

    let dbStatus = "down";
    let dbLatencyMs = null;
    try {
        const dbStartedAt = Date.now();
        await db.sequelize.authenticate();
        dbLatencyMs = Date.now() - dbStartedAt;
        dbStatus = "up";
    } catch (_e) {
        dbStatus = "down";
    }

    const apiLatencyMs = Date.now() - startedAt;

    return {
        summary: {
            totalWords,
            totalKanjis,
            totalGrammars,
            totalExamples,
            totalUsers,
        },
        newUsersByDay: newUsers.map((item) => ({ date: item.date, count: Number(item.count) })),
        topSearchTerms: topSearchTerms.map((item) => ({ searchTerm: item.searchTerm, count: Number(item.count) })),
        topJlptLevels: topJlptLevelsRaw.map((item) => ({ jlptLevel: `N${item.jlptLevel}`, count: Number(item.count) })),
        health: {
            database: { status: dbStatus, latencyMs: dbLatencyMs },
            api: { status: "up", latencyMs: apiLatencyMs },
        },
    };
};

const getVocabularies = async ({ query = "", jlptLevel = "", page = 1, limit = 20 }) => {
    const safePage = Number.isFinite(+page) ? Math.max(1, +page) : 1;
    const safeLimit = Number.isFinite(+limit) ? Math.min(100, Math.max(1, +limit)) : 20;
    const offset = (safePage - 1) * safeLimit;

    const where = {};
    if (query) {
        where[Op.or] = [
            { word: { [Op.like]: `%${query}%` } },
            { reading: { [Op.like]: `%${query}%` } },
            { romaji: { [Op.like]: `%${query}%` } },
        ];
    }
    if (jlptLevel) {
        const normalized = String(jlptLevel).replace("N", "");
        where.jlptLevel = Number(normalized);
    }

    const { rows, count } = await db.Word.findAndCountAll({
        where,
        include: [
            {
                model: db.Meaning,
                as: "meanings",
                attributes: ["id", "partOfSpeech", "definition", "language"],
                required: false,
            },
        ],
        order: [["updatedAt", "DESC"]],
        limit: safeLimit,
        offset,
    });

    return {
        items: rows,
        pagination: {
            page: safePage,
            limit: safeLimit,
            totalItems: count,
            totalPages: Math.ceil(count / safeLimit),
        },
    };
};

const createVocabulary = async ({ adminId, payload }) => {
    const transaction = await db.sequelize.transaction();
    try {
        const word = await db.Word.create(
            {
                word: payload.word,
                reading: payload.reading,
                romaji: payload.romaji || null,
                jlptLevel: payload.jlptLevel ? Number(payload.jlptLevel) : null,
                isCommon: Boolean(payload.isCommon),
            },
            { transaction }
        );

        if (payload.definition) {
            await db.Meaning.create(
                {
                    wordId: word.id,
                    partOfSpeech: payload.partOfSpeech || null,
                    definition: payload.definition,
                    language: "vi",
                },
                { transaction }
            );
        }

        await transaction.commit();

        await writeAuditLog({
            adminId,
            actionType: "CREATE_VOCABULARY",
            targetType: "Word",
            targetId: word.id,
            details: payload,
        });

        return word;
    } catch (e) {
        await transaction.rollback();
        throw e;
    }
};

const updateVocabulary = async ({ adminId, id, payload }) => {
    const transaction = await db.sequelize.transaction();
    try {
        const word = await db.Word.findByPk(id, {
            include: [{ model: db.Meaning, as: "meanings", required: false }],
            transaction,
        });

        if (!word) {
            throw new Error("Vocabulary not found");
        }

        await word.update(
            {
                word: payload.word ?? word.word,
                reading: payload.reading ?? word.reading,
                romaji: payload.romaji ?? word.romaji,
                jlptLevel:
                    payload.jlptLevel !== undefined
                        ? payload.jlptLevel
                            ? Number(payload.jlptLevel)
                            : null
                        : word.jlptLevel,
                isCommon:
                    payload.isCommon !== undefined ? Boolean(payload.isCommon) : word.isCommon,
            },
            { transaction }
        );

        if (payload.definition !== undefined || payload.partOfSpeech !== undefined) {
            const firstMeaning = word.meanings?.[0];
            if (firstMeaning) {
                await firstMeaning.update(
                    {
                        definition: payload.definition ?? firstMeaning.definition,
                        partOfSpeech: payload.partOfSpeech ?? firstMeaning.partOfSpeech,
                    },
                    { transaction }
                );
            } else if (payload.definition) {
                await db.Meaning.create(
                    {
                        wordId: word.id,
                        definition: payload.definition,
                        partOfSpeech: payload.partOfSpeech || null,
                        language: "vi",
                    },
                    { transaction }
                );
            }
        }

        await transaction.commit();

        await writeAuditLog({
            adminId,
            actionType: "UPDATE_VOCABULARY",
            targetType: "Word",
            targetId: Number(id),
            details: payload,
        });

        return true;
    } catch (e) {
        await transaction.rollback();
        throw e;
    }
};

const deleteVocabulary = async ({ adminId, id }) => {
    const deleted = await db.Word.destroy({ where: { id } });
    if (!deleted) {
        throw new Error("Vocabulary not found");
    }

    await writeAuditLog({
        adminId,
        actionType: "DELETE_VOCABULARY",
        targetType: "Word",
        targetId: Number(id),
        details: null,
    });

    return true;
};

const updateVocabularyJlpt = async ({ adminId, id, jlptLevel }) => {
    const word = await db.Word.findByPk(id);
    if (!word) {
        throw new Error("Vocabulary not found");
    }
    const normalized = String(jlptLevel || "").replace("N", "");
    await word.update({ jlptLevel: Number(normalized) || null });

    await writeAuditLog({
        adminId,
        actionType: "UPDATE_VOCABULARY_JLPT",
        targetType: "Word",
        targetId: Number(id),
        details: { jlptLevel },
    });
};

const getUsers = async ({ query = "" }) => {
    const where = {};
    if (query) {
        where[Op.or] = [
            { username: { [Op.like]: `%${query}%` } },
            { email: { [Op.like]: `%${query}%` } },
        ];
    }

    return db.User.findAll({
        where,
        attributes: ["id", "username", "email", "role", "status", "createdAt", "updatedAt"],
        order: [["createdAt", "DESC"]],
        raw: true,
    });
};

const updateUserRole = async ({ adminId, userId, role }) => {
    const mappedRole = mapRole(role);
    if (!["admin", "moderator", "user"].includes(mappedRole)) {
        throw new Error("Invalid role");
    }
    const [affected] = await db.User.update({ role: mappedRole }, { where: { id: userId } });
    if (!affected) {
        throw new Error("User not found");
    }

    await writeAuditLog({
        adminId,
        actionType: "UPDATE_USER_ROLE",
        targetType: "User",
        targetId: Number(userId),
        details: { role: mappedRole },
    });
};

const updateUserStatus = async ({ adminId, userId, status }) => {
    if (!["active", "suspended", "banned"].includes(status)) {
        throw new Error("Invalid status");
    }
    const [affected] = await db.User.update({ status }, { where: { id: userId } });
    if (!affected) {
        throw new Error("User not found");
    }

    await writeAuditLog({
        adminId,
        actionType: "UPDATE_USER_STATUS",
        targetType: "User",
        targetId: Number(userId),
        details: { status },
    });
};

const resetUserPassword = async ({ adminId, userId, newPassword }) => {
    if (!newPassword || String(newPassword).trim().length < 6) {
        throw new Error("Password must be at least 6 characters");
    }
    const hash = bcrypt.hashSync(String(newPassword).trim(), 10);
    const [affected] = await db.User.update({ passwordHash: hash }, { where: { id: userId } });
    if (!affected) {
        throw new Error("User not found");
    }

    await writeAuditLog({
        adminId,
        actionType: "RESET_USER_PASSWORD",
        targetType: "User",
        targetId: Number(userId),
        details: { resetBy: adminId },
    });
};

const getAuditLogs = async ({ page = 1, limit = 50, actionType = "" }) => {
    const safePage = Number.isFinite(+page) ? Math.max(1, +page) : 1;
    const safeLimit = Number.isFinite(+limit) ? Math.min(200, Math.max(1, +limit)) : 50;
    const offset = (safePage - 1) * safeLimit;

    const where = {};
    if (actionType) {
        where.actionType = { [Op.like]: `%${String(actionType).trim()}%` };
    }

    const { rows, count } = await db.AdminLog.findAndCountAll({
        where,
        include: [
            {
                model: db.User,
                as: "admin",
                attributes: ["id", "username", "email"],
                required: false,
            },
        ],
        order: [["createdAt", "DESC"]],
        limit: safeLimit,
        offset,
        distinct: true,
    });

    return {
        items: rows,
        pagination: {
            page: safePage,
            limit: safeLimit,
            totalItems: count,
            totalPages: Math.max(1, Math.ceil(count / safeLimit)),
        },
    };
};

const getNotebookCollections = async ({ query = "", includeInactive = false } = {}) => {
    const where = {};
    if (!includeInactive) {
        where.isActive = true;
    }
    if (query) {
        where.title = { [Op.like]: `%${String(query).trim()}%` };
    }

    return db.AdminNotebookCollection.findAll({
        where,
        order: [["sortOrder", "ASC"], ["createdAt", "DESC"]],
        raw: true,
    });
};

const createNotebookCollection = async ({ adminId, payload }) => {
    const title = String(payload?.title || "").trim();
    if (!title) {
        throw new Error("Title is required");
    }

    const created = await db.AdminNotebookCollection.create({
        title,
        meta: String(payload?.meta || "").trim() || null,
        ownerName: String(payload?.ownerName || "").trim() || "Ban quan tri",
        views: Number(payload?.views) || 0,
        sortOrder: Number(payload?.sortOrder) || 0,
        isActive: payload?.isActive !== undefined ? Boolean(payload.isActive) : true,
        createdByAdminId: adminId || null,
    });

    await writeAuditLog({
        adminId,
        actionType: "CREATE_NOTEBOOK_COLLECTION",
        targetType: "AdminNotebookCollection",
        targetId: created.id,
        details: payload,
    });

    return created.get({ plain: true });
};

const updateNotebookCollection = async ({ adminId, id, payload }) => {
    const item = await db.AdminNotebookCollection.findByPk(id);
    if (!item) {
        throw new Error("Notebook collection not found");
    }

    const nextTitle = payload?.title !== undefined ? String(payload.title || "").trim() : item.title;
    if (!nextTitle) {
        throw new Error("Title is required");
    }

    await item.update({
        title: nextTitle,
        meta: payload?.meta !== undefined ? String(payload.meta || "").trim() || null : item.meta,
        ownerName:
            payload?.ownerName !== undefined
                ? String(payload.ownerName || "").trim() || "Ban quan tri"
                : item.ownerName,
        views: payload?.views !== undefined ? Number(payload.views) || 0 : item.views,
        sortOrder: payload?.sortOrder !== undefined ? Number(payload.sortOrder) || 0 : item.sortOrder,
        isActive: payload?.isActive !== undefined ? Boolean(payload.isActive) : item.isActive,
    });

    await writeAuditLog({
        adminId,
        actionType: "UPDATE_NOTEBOOK_COLLECTION",
        targetType: "AdminNotebookCollection",
        targetId: Number(id),
        details: payload,
    });

    return item.get({ plain: true });
};

const deleteNotebookCollection = async ({ adminId, id }) => {
    const deleted = await db.AdminNotebookCollection.destroy({ where: { id } });
    if (!deleted) {
        throw new Error("Notebook collection not found");
    }

    await writeAuditLog({
        adminId,
        actionType: "DELETE_NOTEBOOK_COLLECTION",
        targetType: "AdminNotebookCollection",
        targetId: Number(id),
        details: null,
    });

    return true;
};

module.exports = {
    HandleAdminLogin,
    getAdminDashboard,
    getVocabularies,
    createVocabulary,
    updateVocabulary,
    deleteVocabulary,
    updateVocabularyJlpt,
    getUsers,
    updateUserRole,
    updateUserStatus,
    resetUserPassword,
    getAuditLogs,
    getNotebookCollections,
    createNotebookCollection,
    updateNotebookCollection,
    deleteNotebookCollection,
};
