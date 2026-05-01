const readingService = require("../service/readingService");

const resolveActor = (req) => {
	return {
		id: req.user?.id || req.admin?.id || null,
		isAdmin: req.user?.role === "admin" || req.admin?.role === "admin",
	};
};

const HandleGetReadingPassages = async (req, res) => {
	try {
		const actor = resolveActor(req);
		if (!actor.id) {
			return res.status(401).json({ errCode: -2, errMessage: "Not Authenticated the user", items: [] });
		}

		const data = await readingService.getReadingPassages({
			userId: actor.id,
			query: req.query.q || req.query.query || "",
			level: req.query.level || "",
			topic: req.query.topic || "",
			limit: req.query.limit || 12,
			offset: req.query.offset || 0,
		});

		return res.status(200).json({ errCode: 0, errMessage: "OK", ...data });
	} catch (error) {
		console.error("HandleGetReadingPassages error:", error);
		return res.status(500).json({ errCode: -1, errMessage: "Internal server error", items: [] });
	}
};

const HandleGetReadingPassageDetail = async (req, res) => {
	try {
		const actor = resolveActor(req);
		if (!actor.id) {
			return res.status(401).json({ errCode: -2, errMessage: "Not Authenticated the user", passage: null });
		}

		const id = Number(req.params.id);
		const passage = await readingService.getReadingPassageDetail({ id, userId: actor.id });
		if (!passage) {
			return res.status(404).json({ errCode: 1, errMessage: "Reading passage not found", passage: null });
		}

		return res.status(200).json({ errCode: 0, errMessage: "OK", passage });
	} catch (error) {
		console.error("HandleGetReadingPassageDetail error:", error);
		return res.status(500).json({ errCode: -1, errMessage: "Internal server error", passage: null });
	}
};

const HandleCreateReadingPassage = async (req, res) => {
	try {
		const actor = resolveActor(req);
		if (!actor.id) {
			return res.status(401).json({ errCode: -2, errMessage: "Not Authenticated the user" });
		}

		const result = await readingService.createReadingPassage({
			authorId: actor.id,
			payload: req.body || {},
		});

		if (result.errCode !== 0) {
			return res.status(400).json(result);
		}

		return res.status(200).json({ errCode: 0, errMessage: "Reading passage created", passage: result.passage });
	} catch (error) {
		console.error("HandleCreateReadingPassage error:", error);
		return res.status(500).json({ errCode: -1, errMessage: "Internal server error" });
	}
};

const HandleUpdateReadingPassage = async (req, res) => {
	try {
		const actor = resolveActor(req);
		if (!actor.id) {
			return res.status(401).json({ errCode: -2, errMessage: "Not Authenticated the user" });
		}

		const result = await readingService.updateReadingPassage({
			actorId: actor.id,
			isAdmin: actor.isAdmin,
			id: Number(req.params.id),
			payload: req.body || {},
		});

		if (result.errCode === 3) {
			return res.status(403).json(result);
		}
		if (result.errCode !== 0) {
			return res.status(400).json(result);
		}

		return res.status(200).json({ errCode: 0, errMessage: "Reading passage updated", passage: result.passage });
	} catch (error) {
		console.error("HandleUpdateReadingPassage error:", error);
		return res.status(500).json({ errCode: -1, errMessage: "Internal server error" });
	}
};

const HandleUpsertReadingProgress = async (req, res) => {
	try {
		const actor = resolveActor(req);
		if (!actor.id) {
			return res.status(401).json({ errCode: -2, errMessage: "Not Authenticated the user" });
		}

		const result = await readingService.upsertReadingProgress({
			userId: actor.id,
			passageId: Number(req.params.id),
			status: req.body?.status,
			lastReadAt: req.body?.lastReadAt,
			completedAt: req.body?.completedAt,
		});

		if (result.errCode !== 0) {
			return res.status(400).json(result);
		}

		return res.status(200).json({ errCode: 0, errMessage: "Progress updated", progress: result.progress });
	} catch (error) {
		console.error("HandleUpsertReadingProgress error:", error);
		return res.status(500).json({ errCode: -1, errMessage: "Internal server error" });
	}
};

const HandleGetMyReadingProgresses = async (req, res) => {
	try {
		const actor = resolveActor(req);
		if (!actor.id) {
			return res.status(401).json({ errCode: -2, errMessage: "Not Authenticated the user", items: [] });
		}

		const data = await readingService.getMyReadingProgresses({
			userId: actor.id,
			limit: req.query.limit || 30,
			offset: req.query.offset || 0,
		});

		return res.status(200).json({ errCode: 0, errMessage: "OK", ...data });
	} catch (error) {
		console.error("HandleGetMyReadingProgresses error:", error);
		return res.status(500).json({ errCode: -1, errMessage: "Internal server error", items: [] });
	}
};

const HandleGetPassageAnalysis = async (req, res) => {
	try {
		const actor = resolveActor(req);
		if (!actor.id) {
			return res.status(401).json({ errCode: -2, errMessage: "Not Authenticated the user", analysis: null });
		}

		const passageId = Number(req.params.id);
		const analysis = await readingService.getPassageAnalysis(passageId);
		
		if (!analysis) {
			return res.status(404).json({ errCode: 1, errMessage: "Reading passage not found", analysis: null });
		}

		return res.status(200).json({ errCode: 0, errMessage: "OK", analysis });
	} catch (error) {
		console.error("HandleGetPassageAnalysis error:", error);
		return res.status(500).json({ errCode: -1, errMessage: "Internal server error", analysis: null });
	}
};

module.exports = {
	HandleGetReadingPassages,
	HandleGetReadingPassageDetail,
	HandleCreateReadingPassage,
	HandleUpdateReadingPassage,
	HandleUpsertReadingProgress,
	HandleGetMyReadingProgresses,
	HandleGetPassageAnalysis,
};
