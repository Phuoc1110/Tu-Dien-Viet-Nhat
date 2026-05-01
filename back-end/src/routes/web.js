import express from "express";
import userController from "../controllers/userController";
import dictionaryController from "../controllers/dictionaryController";
import adminController from "../controllers/adminController";
import notebookController from "../controllers/notebookController";
import quizController from "../controllers/quizController";
import readingController from "../controllers/readingController";
import multer from "multer";
import { checkUserJWT } from "../middleware/JWT_Action";
import { uploadCloud } from "../middleware/Cloudinary_Multer";
import {
	sendResetOTP,
	verifyResetOTP,
	resetPassword,
} from "../controllers/otpController.js";

let router = express.Router();
const uploadImage = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 10 * 1024 * 1024 },
});

let initWebRoutes = (app) => {
	router.all("*", checkUserJWT);

	// Auth
	router.post("/api/login", userController.HandleLogin);
	router.post("/api/admin_login", adminController.HandleAdminLogin);
	router.post("/api/logout", userController.HandleLogOut);
	router.post("/api/logoutAdmin", adminController.HandleLogOutAdmin);
	router.post("/api/create-new-user", userController.HandleCreateNewUser);
	router.get("/api/account", userController.getUserAccount);
	router.get("/api/accountAdmin", adminController.getAdminAccount);
	router.get("/api/get-all-user", userController.HandleGetAllUser);
	router.put("/api/edit-user", userController.HandleEditUser);
	router.put(
		"/api/update-profile",
		uploadCloud.single("image"),
		userController.HandleUpdateProfile
	);
	router.get(
		"/api/profile/recent-comments",
		userController.HandleGetRecentComments
	);
	router.post(
		"/api/profile/change-password",
		userController.HandleChangePassword
	);
	router.delete("/api/delete-user", userController.HandleDeleteUser);

	// Reset password via OTP
	router.post("/api/reset-otp/send", sendResetOTP);
	router.post("/api/reset-otp/verify", verifyResetOTP);
	router.post("/api/reset-password", resetPassword);
	router.get("/api/dictionary/search", dictionaryController.HandleSearchWords);
	router.get(
		"/api/dictionary/kanji/search",
		dictionaryController.HandleSearchKanjis
	);
	router.post(
		"/api/dictionary/kanji/recognize",
		dictionaryController.HandleRecognizeKanji
	);
	router.post(
		"/api/dictionary/paragraph/analyze",
		dictionaryController.HandleAnalyzeJapaneseParagraph
	);
	router.post(
		"/api/dictionary/image-recognize",
		uploadImage.single("image"),
		dictionaryController.HandleRecognizeTextFromImage
	);
	router.get(
		"/api/dictionary/sentence/search",
		dictionaryController.HandleSearchSentences
	);
	router.get(
		"/api/dictionary/grammar/search",
		dictionaryController.HandleSearchGrammars
	);
	router.get(
		"/api/dictionary/history",
		dictionaryController.HandleGetSearchHistory
	);
	router.get(
		"/api/dictionary/history/top-keywords",
		dictionaryController.HandleGetTopSearchKeywordsToday
	);
	router.post(
		"/api/dictionary/history",
		dictionaryController.HandleAddSearchHistory
	);
	router.delete(
		"/api/dictionary/history",
		dictionaryController.HandleClearSearchHistory
	);
	router.get(
		"/api/dictionary/contributions",
		dictionaryController.HandleGetWordContributions
	);
	router.post(
		"/api/dictionary/contributions",
		dictionaryController.HandleAddWordContribution
	);
	router.get(
		"/api/dictionary/contributions/latest",
		dictionaryController.HandleGetLatestWordContributions
	);
	router.get("/api/notebooks/overview", notebookController.HandleGetNotebookOverview);
	router.get("/api/notebooks/curated", notebookController.HandleGetCuratedNotebookCollections);
	router.get("/api/notebooks/:id", notebookController.HandleGetNotebookDetail);
	router.post("/api/notebooks", notebookController.HandleCreateNotebook);
	router.post("/api/notebooks/:id/items", notebookController.HandleAddNotebookItem);
	router.put("/api/notebooks/:id", notebookController.HandleUpdateNotebook);
	router.delete("/api/notebooks/:id", notebookController.HandleDeleteNotebook);
	router.get("/api/reading/passages", readingController.HandleGetReadingPassages);
	router.get("/api/reading/passages/:id", readingController.HandleGetReadingPassageDetail);
	router.get("/api/reading/passages/:id/analysis", readingController.HandleGetPassageAnalysis);
	router.post("/api/reading/passages", readingController.HandleCreateReadingPassage);
	router.put("/api/reading/passages/:id", readingController.HandleUpdateReadingPassage);
	router.post("/api/reading/passages/:id/progress", readingController.HandleUpsertReadingProgress);
	router.get("/api/reading/progress", readingController.HandleGetMyReadingProgresses);

	// Quiz & SRS
	router.post("/api/quiz/generate", quizController.HandleGenerateQuiz);
	router.post("/api/quiz/evaluate", quizController.HandleEvaluateAnswer);
	router.post("/api/quiz/flashcard-review", quizController.HandleFlashcardReview);

	// Admin - Dashboard
	router.get("/api/admin/dashboard", adminController.getDashboard);

	// Admin - Vocabulary & Content
	router.get("/api/admin/vocabularies", adminController.getVocabularies);
	router.post("/api/admin/vocabularies", adminController.createVocabulary);
	router.put("/api/admin/vocabularies/:id", adminController.updateVocabulary);
	router.delete("/api/admin/vocabularies/:id", adminController.deleteVocabulary);
	router.patch(
		"/api/admin/vocabularies/:id/jlpt",
		adminController.updateVocabularyJlpt
	);

	// Admin - Users & Roles
	router.get("/api/admin/users", adminController.getUsers);
	router.patch("/api/admin/users/:id/role", adminController.updateUserRole);
	router.patch("/api/admin/users/:id/status", adminController.updateUserStatus);
	router.post(
		"/api/admin/users/:id/reset-password",
		adminController.resetUserPassword
	);

	// Admin - Audit logs
	router.get("/api/admin/audit-logs", adminController.getAuditLogs);
	router.get("/api/admin/notebook-collections", adminController.getNotebookCollections);
	router.post("/api/admin/notebook-collections", adminController.createNotebookCollection);
	router.put("/api/admin/notebook-collections/:id", adminController.updateNotebookCollection);
	router.delete("/api/admin/notebook-collections/:id", adminController.deleteNotebookCollection);
	router.get("/api/admin/notebooks", adminController.getAdminNotebooks);
	router.post("/api/admin/notebooks", adminController.createAdminNotebook);
	router.put("/api/admin/notebooks/:id", adminController.updateAdminNotebook);
	router.delete("/api/admin/notebooks/:id", adminController.deleteAdminNotebook);
	router.get("/api/admin/notebooks/:id/add-by-jlpt/summary", adminController.getAdminNotebookBulkSummary);
	router.post("/api/admin/notebooks/:id/add-by-jlpt", adminController.addAdminNotebookItemsByJlpt);

	return app.use("/", router);
};

module.exports = initWebRoutes;
