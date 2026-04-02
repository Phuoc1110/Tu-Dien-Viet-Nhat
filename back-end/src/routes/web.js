import express from "express";
import userController from "../controllers/userController";
import dictionaryController from "../controllers/dictionaryController";
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
	router.post("/api/logout", userController.HandleLogOut);
	router.post("/api/create-new-user", userController.HandleCreateNewUser);
	router.get("/api/account", userController.getUserAccount);
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
	router.get(
		"/api/dictionary/sentence/search",
		dictionaryController.HandleSearchSentences
	);

	return app.use("/", router);
};

module.exports = initWebRoutes;
