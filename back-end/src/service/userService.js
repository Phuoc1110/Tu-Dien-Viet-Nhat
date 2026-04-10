import db from "../models/index";
import bcrypt from "bcryptjs";
import { CreateJWT } from "../middleware/JWT_Action";
import { Op } from "sequelize";
const cloudinary = require("cloudinary").v2;
require("dotenv").config();
const salt = bcrypt.genSaltSync(10);

const mapUserForClient = (user) => {
	if (!user) return user;
	return {
		...user,
		fullName: user.username,
		profilePicture: user.avatarUrl,
	};
};

let HandleUserLogin = (email, password) => {
	return new Promise(async (resolve, reject) => {
		try {
			let userData = {};
			let isExist = await CheckUserEmail(email);
			if (isExist) {
				let user = await db.User.findOne({
					where: { email: email },
					raw: true,
				});
				if (user) {
					if (user.status !== "active") {
						userData.errCode = 4;
						userData.errMessage = "Your account is not active";
						resolve(userData);
						return;
					}

					let check = await bcrypt.compareSync(password, user.passwordHash);
					if (check) {
						let payload = {
							id: user.id,
							email: user.email,
							username: user.username,
							role: user.role,
							status: user.status,
							createdAt: user.createdAt,
							avatarUrl: user.avatarUrl,
						};
						let token = CreateJWT(payload);
						userData.errCode = 0;
						userData.errMessage = `OK`;
						delete user.passwordHash;
						userData.user = mapUserForClient(user);
						userData.DT = {
							access_token: token,
						};
					} else {
						userData.errCode = 3;
						userData.errMessage = `Yours's Email or Password is incorrect!`;
					}
				} else {
					userData.errCode = 2;
					userData.errMessage = `User's not found`;
				}
			} else {
				userData.errCode = 1;
				userData.errMessage = `Yours's Email or Password is incorrect!`;
			}
			resolve(userData);
		} catch (e) {
			reject(e);
		}
	});
};

let CheckUserEmail = (userEmail) => {
	return new Promise(async (resolve, reject) => {
		try {
			let user = await db.User.findOne({
				where: { email: userEmail },
			});
			if (user) {
				resolve(true);
			} else {
				resolve(false);
			}
		} catch (e) {
			reject(e);
		}
	});
};

let getAllUser = (userId) => {
	return new Promise(async (resolve, reject) => {
		try {
			let users = "";
			if (userId === "ALL") {
				users = await db.User.findAll({
					attributes: {
						exclude: ["passwordHash"],
					},
				});
			}
			if (userId && userId !== "ALL") {
				users = await db.User.findOne({
					where: { id: userId },
					attributes: {
						exclude: ["passwordHash"],
					},
				});
			}
			resolve(users);
		} catch (e) {
			reject(e);
		}
	});
};
let CreateNewUser = (data) => {
	return new Promise(async (resolve, reject) => {
		try {
			if (!data.email || !data.password) {
				resolve({
					errCode: 1,
					errMessage: "Missing required parameters",
				});
				return;
			}

			const normalizedUsername = (data.username || data.fullName || "").trim();
			if (!normalizedUsername) {
				resolve({
					errCode: 1,
					errMessage: "Username is required",
				});
				return;
			}

			let check = await CheckUserEmail(data.email);
			if (check === true) {
				resolve({
					errCode: 1,
					errMessage: "Your email has exist",
				});
			} else {
				let usernameExisted = await db.User.findOne({
					where: { username: normalizedUsername },
				});
				if (usernameExisted) {
					resolve({
						errCode: 1,
						errMessage: "Your username has exist",
					});
					return;
				}

				let hashPasswordFromBcrypt = await hashUserPassword(data.password);
				let new_user = await db.User.create({
					username: normalizedUsername,
					email: data.email,
					passwordHash: hashPasswordFromBcrypt,
					avatarUrl: data.avatarUrl || data.profilePicture || null,
					role: "user",
					status: "active",
				});
				const safeUser = new_user.get({ plain: true });
				delete safeUser.passwordHash;
				resolve({
					errCode: 0,
					message: "Create success",
					user: mapUserForClient(safeUser),
				});
			}
		} catch (e) {
			reject(e);
		}
	});
};
let DeleteUser = (User_id) => {
	return new Promise(async (resolve, reject) => {
		try {
			let user = await db.User.findOne({
				where: { id: User_id },
			});
			if (user) {
				await db.User.destroy({
					where: { id: User_id },
				});
				resolve({
					errCode: 0,
					message: `The User is deleted`,
				});
			} else {
				resolve({
					errCode: 2,
					errMessage: `The user isn't exist`,
				});
			}
		} catch (e) {
			reject(e);
		}
	});
};
let updateUser = (data) => {
	return new Promise(async (resolve, reject) => {
		try {
			if (!data.id) {
				resolve({
					errCode: 2,
					errMessage: "Missing required parameter!",
				});
			}
			let user = await db.User.findOne({
				where: { id: data.id },
			});
			if (user) {
				let updateData = {};

				if (data.username !== undefined || data.fullName !== undefined) {
					updateData.username = (data.username || data.fullName || "").trim();
				}

				if (data.email !== undefined) {
					updateData.email = data.email;
				}

				if (data.password) {
					let hashPasswordFromBcrypt = await hashUserPassword(data.password);
					updateData.passwordHash = hashPasswordFromBcrypt;
				}

				if (data.avatarUrl !== undefined || data.profilePicture !== undefined) {
					updateData.avatarUrl = data.avatarUrl || data.profilePicture || null;
				}

				if (data.role !== undefined) {
					updateData.role = data.role;
				}

				if (data.status !== undefined) {
					updateData.status = data.status;
				}

				await db.User.update(
					updateData,
					{
						where: { id: data.id },
					}
				);
				let newUser = await db.User.findOne({
					where: { id: data.id },
					raw: true,
				});
				let payload = {
					id: newUser.id,
					email: newUser.email,
					username: newUser.username,
					role: newUser.role,
					status: newUser.status,
					avatarUrl: newUser.avatarUrl,
				};
				let token = CreateJWT(payload);
				delete newUser.passwordHash;
				resolve({
					errCode: 0,
					message: "Update User Success!",
					user: mapUserForClient(newUser),
					DT: {
						access_token: token,
					},
				});
			} else {
				resolve({
					errCode: 1,
					errMessage: "User Not Found!",
				});
			}
		} catch (e) {
			reject(e);
		}
	});
};

let updateUserProfile = (data, fileImage) => {
	return new Promise(async (resolve, reject) => {
		try {
			if (!data.id) {
				resolve({
					errCode: 2,
					errMessage: "Missing required parameter!",
				});
				return;
			}

			let user = await db.User.findOne({
				where: { id: data.id },
				raw: true,
			});

			if (user) {
				if (fileImage) {
					if (user.avatarUrl && user.avatarUrl.includes("/upload/")) {
						const uploadPart = user.avatarUrl.split("/upload/")[1];
						let parts = uploadPart.split("/");
						if (parts[0].startsWith("v")) {
							parts.shift();
						}
						const publicId = parts.join("/").split(".")[0];
						await cloudinary.uploader.destroy(publicId);
					}
				}
				// Prepare update object with only the fields we want to allow updating
				let updateFields = {};

				if (data.username !== undefined || data.fullName !== undefined) {
					updateFields.username = (data.username || data.fullName || "").trim();
				}

				if (data.avatarUrl !== undefined || data.image !== undefined) {
					updateFields.avatarUrl = data.avatarUrl || data.image || null;
				}
				if (fileImage) {
					updateFields.avatarUrl = fileImage.path;
				}

				if (data.country !== undefined) {
					updateFields.country = data.country || null;
				}

				if (data.level !== undefined) {
					updateFields.level = data.level || null;
				}

				// Update the user with only the specified fields
				await db.User.update(updateFields, {
					where: { id: data.id },
				});

				// Fetch the updated user data
				let updatedUser = await db.User.findOne({
					where: { id: data.id },
					raw: true,
				});

				// Create new JWT token with updated information
				let payload = {
					id: updatedUser.id,
					email: updatedUser.email,
					username: updatedUser.username,
					role: updatedUser.role,
					status: updatedUser.status,
					createdAt: updatedUser.createdAt,
					avatarUrl: updatedUser.avatarUrl,
				};
				let token = CreateJWT(payload);
				delete updatedUser.passwordHash;

				resolve({
					errCode: 0,
					user: mapUserForClient(updatedUser),
					DT: {
						access_token: token,
					},
				});
			} else {
				if (fileImage) {
					await cloudinary.uploader.destroy(fileImage.filename);
				}
				resolve({
					errCode: 1,
					errMessage: "User not found!",
				});
			}
		} catch (e) {
			if (fileImage) {
				await cloudinary.uploader.destroy(fileImage.filename);
			}
			reject(e);
		}
	});
};

let hashUserPassword = (password) => {
	return new Promise(async (resolve, reject) => {
		try {
			let hashPassword = await bcrypt.hashSync(password, salt);
			resolve(hashPassword);
		} catch (e) {
			reject(e);
		}
	});
};

let resetPassword = (email, newPassword) => {
	return new Promise(async (resolve, reject) => {
		try {
			let user = await db.User.findOne({ where: { email } });
			if (!user) {
				resolve({ errCode: 1, errMessage: "User not found" });
			} else {
				let hashPassword = await bcrypt.hashSync(newPassword, salt);
				await db.User.update(
					{ passwordHash: hashPassword },
					{ where: { email } }
				);
				resolve({ errCode: 0, message: "Password reset successful" });
			}
		} catch (e) {
			reject(e);
		}
	});
};

let getRecentCommentsByUser = (userId, limit = 10) => {
	return new Promise(async (resolve, reject) => {
		try {
			const normalizedUserId = Number(userId);
			const normalizedLimit = Math.min(Math.max(Number(limit) || 10, 1), 30);

			if (!normalizedUserId) {
				resolve([]);
				return;
			}

			const comments = await db.Comment.findAll({
				where: {
					userId: normalizedUserId,
					isHidden: false,
					targetType: {
						[Op.in]: ["word", "kanji", "grammar"],
					},
				},
				attributes: ["id", "targetType", "targetId", "content", "createdAt", "upvotes"],
				order: [["createdAt", "DESC"]],
				limit: normalizedLimit,
				raw: true,
			});

			const wordIds = comments
				.filter((item) => item.targetType === "word")
				.map((item) => item.targetId);
			const kanjiIds = comments
				.filter((item) => item.targetType === "kanji")
				.map((item) => item.targetId);
			const grammarIds = comments
				.filter((item) => item.targetType === "grammar")
				.map((item) => item.targetId);

			const [words, kanjis, grammars] = await Promise.all([
				wordIds.length
					? db.Word.findAll({
							where: { id: { [Op.in]: wordIds } },
							attributes: ["id", "word"],
							raw: true,
					  })
					: [],
				kanjiIds.length
					? db.Kanji.findAll({
							where: { id: { [Op.in]: kanjiIds } },
							attributes: ["id", "characterKanji"],
							raw: true,
					  })
					: [],
				grammarIds.length
					? db.Grammar.findAll({
							where: { id: { [Op.in]: grammarIds } },
							attributes: ["id", "title"],
							raw: true,
					  })
					: [],
			]);

			const wordMap = new Map(words.map((item) => [item.id, item.word]));
			const kanjiMap = new Map(
				kanjis.map((item) => [item.id, item.characterKanji])
			);
			const grammarMap = new Map(grammars.map((item) => [item.id, item.title]));

			const results = comments.map((item) => {
				let targetLabel = "";
				if (item.targetType === "word") targetLabel = wordMap.get(item.targetId) || "";
				if (item.targetType === "kanji") targetLabel = kanjiMap.get(item.targetId) || "";
				if (item.targetType === "grammar") {
					targetLabel = grammarMap.get(item.targetId) || "";
				}

				return {
					id: item.id,
					targetType: item.targetType,
					targetId: item.targetId,
					targetLabel,
					content: item.content,
					upvotes: item.upvotes || 0,
					createdAt: item.createdAt,
				};
			});

			resolve(results);
		} catch (e) {
			reject(e);
		}
	});
};

let changePasswordWithCurrent = (userId, currentPassword, newPassword) => {
	return new Promise(async (resolve, reject) => {
		try {
			if (!userId || !currentPassword || !newPassword) {
				resolve({
					errCode: 1,
					errMessage: "Missing required parameters",
				});
				return;
			}

			if (newPassword.length < 6) {
				resolve({
					errCode: 1,
					errMessage: "New password must be at least 6 characters",
				});
				return;
			}

			const user = await db.User.findOne({ where: { id: userId } });
			if (!user) {
				resolve({
					errCode: 1,
					errMessage: "User not found",
				});
				return;
			}

			const isValidCurrentPassword = bcrypt.compareSync(
				currentPassword,
				user.passwordHash
			);
			if (!isValidCurrentPassword) {
				resolve({
					errCode: 2,
					errMessage: "Current password is incorrect",
				});
				return;
			}

			const hashPassword = bcrypt.hashSync(newPassword, salt);
			await db.User.update(
				{ passwordHash: hashPassword },
				{ where: { id: userId } }
			);

			resolve({
				errCode: 0,
				message: "Password updated successfully",
			});
		} catch (e) {
			reject(e);
		}
	});
};

module.exports = {
	HandleUserLogin: HandleUserLogin,
	getAllUser: getAllUser,
	CreateNewUser: CreateNewUser,
	DeleteUser: DeleteUser,
	updateUser: updateUser,
	updateUserProfile: updateUserProfile,
	resetPassword: resetPassword,
	getRecentCommentsByUser: getRecentCommentsByUser,
	changePasswordWithCurrent: changePasswordWithCurrent,
	CheckUserEmail: CheckUserEmail,
};
