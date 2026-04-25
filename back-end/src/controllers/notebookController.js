const notebookService = require("../service/notebookService");

const HandleGetNotebookOverview = async (req, res) => {
	try {
		const userId = req.user?.id;
		if (!userId) {
			return res.status(401).json({
				errCode: -2,
				errMessage: "Not Authenticated the user",
			});
		}

		const limit = Number(req.query.limit || 6);
		const data = await notebookService.getNotebookOverview(userId, limit);
		return res.status(200).json({
			errCode: 0,
			errMessage: "OK",
			...data,
		});
	} catch (error) {
		console.error("Error in HandleGetNotebookOverview:", error);
		return res.status(500).json({
			errCode: -1,
			errMessage: "Internal server error",
		});
	}
};

const HandleGetCuratedNotebookCollections = async (req, res) => {
	try {
		const limit = Number(req.query.limit || 12);
		const curatedNotebooks = await notebookService.getCuratedNotebookCollections(limit);
		return res.status(200).json({
			errCode: 0,
			errMessage: "OK",
			curatedNotebooks,
		});
	} catch (error) {
		console.error("Error in HandleGetCuratedNotebookCollections:", error);
		return res.status(500).json({
			errCode: -1,
			errMessage: "Internal server error",
			curatedNotebooks: [],
		});
	}
};

const HandleGetNotebookDetail = async (req, res) => {
	try {
		const userId = req.user?.id;
		if (!userId) {
			return res.status(401).json({
				errCode: -2,
				errMessage: "Not Authenticated the user",
			});
		}

		const notebookId = Number(req.params.id);
		const notebook = await notebookService.getNotebookDetail(notebookId, userId);
		if (!notebook) {
			return res.status(404).json({
				errCode: 1,
				errMessage: "Notebook not found",
			});
		}

		return res.status(200).json({
			errCode: 0,
			errMessage: "OK",
			notebook,
		});
	} catch (error) {
		console.error("Error in HandleGetNotebookDetail:", error);
		return res.status(500).json({
			errCode: -1,
			errMessage: "Internal server error",
		});
	}
};

const HandleCreateNotebook = async (req, res) => {
	try {
		const userId = req.user?.id;
		if (!userId) {
			return res.status(401).json({
				errCode: -2,
				errMessage: "Not Authenticated the user",
			});
		}

		const result = await notebookService.createNotebook(userId, req.body);
		if (result.errCode !== 0) {
			return res.status(400).json(result);
		}

		return res.status(200).json({
			errCode: 0,
			errMessage: "Notebook created",
			notebook: result.notebook,
		});
	} catch (error) {
		console.error("Error in HandleCreateNotebook:", error);
		return res.status(500).json({
			errCode: -1,
			errMessage: "Internal server error",
		});
	}
};

const HandleAddNotebookItem = async (req, res) => {
	try {
		const userId = req.user?.id;
		if (!userId) {
			return res.status(401).json({
				errCode: -2,
				errMessage: "Not Authenticated the user",
			});
		}

		const notebookId = Number(req.params.id);
		const result = await notebookService.addItemToNotebook(userId, notebookId, req.body);
		if (result.errCode !== 0) {
			return res.status(result.errCode === 3 ? 409 : 400).json(result);
		}

		return res.status(200).json({
			errCode: 0,
			errMessage: "Item added",
			item: result.item,
		});
	} catch (error) {
		console.error("Error in HandleAddNotebookItem:", error);
		return res.status(500).json({
			errCode: -1,
			errMessage: "Internal server error",
		});
	}
};

const HandleUpdateNotebook = async (req, res) => {
	try {
		const userId = req.user?.id;
		if (!userId) {
			return res.status(401).json({
				errCode: -2,
				errMessage: "Not Authenticated the user",
			});
		}

		const notebookId = Number(req.params.id);
		const result = await notebookService.updateNotebook(userId, notebookId, req.body);
		if (result.errCode !== 0) {
			return res.status(400).json(result);
		}

		return res.status(200).json({
			errCode: 0,
			errMessage: "Notebook updated",
			notebook: result.notebook,
		});
	} catch (error) {
		console.error("Error in HandleUpdateNotebook:", error);
		return res.status(500).json({
			errCode: -1,
			errMessage: "Internal server error",
		});
	}
};

const HandleDeleteNotebook = async (req, res) => {
	try {
		const userId = req.user?.id;
		if (!userId) {
			return res.status(401).json({
				errCode: -2,
				errMessage: "Not Authenticated the user",
			});
		}

		const notebookId = Number(req.params.id);
		const result = await notebookService.deleteNotebook(userId, notebookId);
		if (result.errCode !== 0) {
			return res.status(400).json(result);
		}

		return res.status(200).json({
			errCode: 0,
			errMessage: "Notebook deleted",
		});
	} catch (error) {
		console.error("Error in HandleDeleteNotebook:", error);
		return res.status(500).json({
			errCode: -1,
			errMessage: "Internal server error",
		});
	}
};

module.exports = {
	HandleGetNotebookOverview,
	HandleGetCuratedNotebookCollections,
	HandleGetNotebookDetail,
	HandleCreateNotebook,
	HandleAddNotebookItem,
	HandleUpdateNotebook,
	HandleDeleteNotebook,
};