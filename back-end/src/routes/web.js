import express from "express";
import userController from "../controllers/userController";
import dictionaryController from "../controllers/dictionaryController";
import adminController from "../controllers/adminController";
import { checkUserJWT } from "../middleware/JWT_Action";
import {
	sendResetOTP,
	verifyResetOTP,
	resetPassword,
} from "../controllers/otpController.js";

let router = express.Router();

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
	router.put("/api/update-profile", userController.HandleUpdateProfile);
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

	return app.use("/", router);
};

module.exports = initWebRoutes;
