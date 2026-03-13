import { raw } from "mysql2";
import db from "../models/index";
import bcrypt from "bcryptjs";
import { where } from "sequelize";
import { response } from "express";
import { CreateJWT } from "../middleware/JWT_Action";
require("dotenv").config();

let HandleAdminLogin = (email, password) => {
	return new Promise(async (resolve, reject) => {
		try {
			let userData = {};
			let isExist = await CheckAdminEmail(email);
			if (isExist) {
				let user = await db.Admin.findOne({
					where: { email: email },
					raw: true,
				});
				if (user) {
					let check = password === user.password;
					if (check) {
						let payload = {
							id: user.id,
							email: user.email,
							role: "admin",
						};
						let token = CreateJWT(payload);
						userData.errCode = 0;
						userData.errMessage = `OK`;
						delete user.password;
						userData.user = user;
						userData.DT = {
							access_token: token,
						};
					} else {
						userData.errCode = 3;
						userData.errMessage = `Yours's Email or Password is incorrect!`;
					}
				} else {
					userData.errCode = 2;
					userData.errMessage = `Admin's not found`;
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

let CheckAdminEmail = (userEmail) => {
	return new Promise(async (resolve, reject) => {
		try {
			let user = await db.Admin.findOne({
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

//Admin dashboard
const getAllUsers = async () => {
    try {
        const users = await db.User.findAll({
            attributes: [
                "id",
                "email",
                "fullName",
                "bio",
                "status",
                "createdAt",
                "updatedAt",
            ],
            order: [["createdAt", "DESC"]],
            raw: true,
        });
        return users;
    } catch (error) {
        console.log(error);
        throw error;
    }
};

const suspendUser = async (userId) => {
    try {
        const user = await db.User.findOne({
            where: { id: userId },
        });

        if (!user) {
            return {
                errCode: 2,
                errMessage: "User not found",
            };
        }

        await db.User.update(
            { status: "suspended" },
            { where: { id: userId } }
        );

        return {
            errCode: 0,
            errMessage: "User suspended successfully",
        };
    } catch (error) {
        console.log(error);
        return {
            errCode: -1,
            errMessage: "Error from server",
        };
    }
};

const activateUser = async (userId) => {
    try {
        const user = await db.User.findOne({
            where: { id: userId },
        });

        if (!user) {
            return {
                errCode: 2,
                errMessage: "User not found",
            };
        }

        await db.User.update(
            { status: "active" },
            { where: { id: userId } }
        );

        return {
            errCode: 0,
            errMessage: "User activated successfully",
        };
    } catch (error) {
        console.log(error);
        return {
            errCode: -1,
            errMessage: "Error from server",
        };
    }
};

const deleteUser = async (userId) => {
    try {
        const user = await db.User.findOne({
            where: { id: userId },
        });

        if (!user) {
            return {
                errCode: 2,
                errMessage: "User not found",
            };
        }

        // Delete related data first
        await db.Post.destroy({ where: { userId: userId } });
        await db.Comment.destroy({ where: { userId: userId } });
        await db.Like.destroy({ where: { userId: userId } });

        // Delete user
        await db.User.destroy({ where: { id: userId } });

        return {
            errCode: 0,
            errMessage: "User deleted successfully",
        };
    } catch (error) {
        console.log(error);
        return {
            errCode: -1,
            errMessage: "Error from server",
        };
    }
};

const getAllPosts = async () => {
    try {
        const posts = await db.Post.findAll({
            // where: {
            //     isDeleted: false,
            // },
            include: [
                {
                    model: db.User,
                    attributes: ["id", "fullName", "email"],
                },
            ],
            order: [["createdAt", "DESC"]],
        });

        // Format data
        const formattedPosts = posts.map((post) => {
            let images = [];
            try {
                if (typeof post.imageUrl === "string") {
                    images = JSON.parse(post.imageUrl);
                } else if (Array.isArray(post.imageUrl)) {
                    images = post.imageUrl;
                }
            } catch (err) {
                console.warn("Invalid imageUrl JSON:", post.imageUrl);
            }

            return {
                id: post.id,
                content: post.content,
                imageUrl: images,
                videoUrl: post.videoUrl || null,
                isDeleted: post.isDeleted || false,
                createdAt: post.createdAt,
                userId: post.User.id,
                userName: post.User.fullName,
                userEmail: post.User.email,
            };
        });

        return formattedPosts;
    } catch (error) {
        console.log(error);
        throw error;
    }
};

const blockPost = async (postId) => {
    try {
        const post = await db.Post.findOne({
            where: { id: postId },
        });

        if (!post) {
            return {
                errCode: 2,
                errMessage: "Post not found",
            };
        }

        await db.Post.update(
            { isDeleted: true }, 
            { where: { id: postId } }
        );

        return {
            errCode: 0,
            errMessage: "Post blocked successfully",
        };
    } catch (error) {
        console.log(error);
        return {
            errCode: -1,
            errMessage: "Error from server",
        };
    }
};

const unblockPost = async (postId) => {
    try {
        const post = await db.Post.findOne({
            where: { id: postId },
        });

        if (!post) {
            return {
                errCode: 2,
                errMessage: "Post not found",
            };
        }

        await db.Post.update(
            { isDeleted: false },
            { where: { id: postId } }
        );

        return {
            errCode: 0,
            errMessage: "Post unblocked successfully",
        };
    } catch (error) {
        console.log(error);
        return {
            errCode: -1,
            errMessage: "Error from server",
        };
    }
};

const deletePost = async (postId) => {
    try {
        const post = await db.Post.findOne({
            where: { id: postId },
        });

        if (!post) {
            return {
                errCode: 2,
                errMessage: "Post not found",
            };
        }

        // Delete related data first
        await db.Comment.destroy({ where: { postId: postId } });
        await db.Like.destroy({ where: { postId: postId } });

        // Delete post
        await db.Post.destroy({ where: { id: postId } });

        return {
            errCode: 0,
            errMessage: "Post deleted successfully",
        };
    } catch (error) {
        console.log(error);
        return {
            errCode: -1,
            errMessage: "Error from server",
        };
    }
};

const getStatistics = async () => {
    try {
        const totalUsers = await db.User.count();
        const activeUsers = await db.User.count({
            where: { status: "active" },
        });
        const totalPosts = await db.Post.count();
        const blockedPosts = await db.Post.count({
            where: { isDeleted: true },
        });

        return {
            totalUsers,
            activeUsers,
            totalPosts,
            pendingPosts: blockedPosts,
        };
    } catch (error) {
        console.log(error);
        throw error;
    }
};

module.exports = {
	HandleAdminLogin: HandleAdminLogin,
	getAllUsers,
    suspendUser,
    activateUser,
    deleteUser,
    getAllPosts,
    blockPost,
    unblockPost,
    deletePost,
    getStatistics,
};
