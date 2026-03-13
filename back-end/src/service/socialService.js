import { raw } from "mysql2";
import db, { Sequelize } from "../models/index";
import { Op, where } from "sequelize";
import { response } from "express";
import { getAllUser } from "../service/userService";
import { resolve } from "path";
import { rejects } from "assert";
const crypto = require("crypto");
const CryptoJS = require("crypto-js");
const moment = require("moment");
const qs = require("qs");
const axios = require("axios");
const cloudinary = require("cloudinary").v2;
require("dotenv").config();

let Search = (query, currentUserId) => {
	return new Promise(async (resolve, reject) => {
		try {
			let users = await db.User.findAll({
				where: {
					[Op.or]: [
						{
							fullName: {
								[Op.like]: `%${query}%`,
							},
						},
					],
				},
				attributes: [
					"id",
					"email",
					"fullName",
					"profilePicture",
					"bio",
					"phone",
					"gender",
				],
				include: [
					{
						model: db.Friendship,
						as: "SentRequests",
						required: false,
						attributes: ["status"],
						on: {
							userId: { [Op.eq]: currentUserId }, // người gửi
							friendId: { [Op.eq]: Sequelize.col("User.id") }, // người nhận
						},
					},
					{
						model: db.Friendship,
						as: "ReceivedRequests",
						required: false,
						attributes: ["status"],
						on: {
							friendId: { [Op.eq]: currentUserId }, // mình là người nhận
							userId: { [Op.eq]: Sequelize.col("User.id") }, // người kia gửi
						},
					},
				],
				subQuery: false,
			});
			const formattedUsers = users.map((u) => {
				let relationship = "none";
				const sent = u.SentRequests?.[0]?.status;
				const received = u.ReceivedRequests?.[0]?.status;
				if (sent === "pending") relationship = "you_sent_request";
				else if (received === "pending") relationship = "they_sent_request";
				else if (sent === "accepted" || received === "accepted")
					relationship = "friends";

				return {
					...u.toJSON(),
					friendshipStatus: relationship,
				};
			});
			let posts = await db.Post.findAll({
				where: {
					content: {
						[Op.like]: `%${query}%`,
					},
				},
				include: [
					{
						model: db.User,
						attributes: [
							"id",
							"email",
							"fullName",
							"profilePicture",
							"bio",
							"phone",
							"gender",
						],
					},
				],
			});
			const formattedPosts = posts.map((p) => {
				let images = [];
				try {
					if (typeof p.imageUrl === "string") {
						images = JSON.parse(p.imageUrl);
					} else if (Array.isArray(p.imageUrl)) {
						images = p.imageUrl;
					}
				} catch (err) {
					console.warn("Invalid imageUrl JSON:", p.imageUrl);
				}

				return {
					...p.toJSON(),
					imageUrl: images,
				};
			});
			resolve({
				errCode: 0,
				errMessage: "OK",
				users: formattedUsers,
				posts: formattedPosts,
			});
		} catch (e) {
			reject(e);
		}
	});
};

const getAllFriendships = async (currentUserId) => {
	try {
		const friendships = await db.Friendship.findAll({
			where: {
				[Op.or]: [{ userId: currentUserId }, { friendId: currentUserId }],
			},
			attributes: [
				"id",
				"userId",
				"friendId",
				"status",
				"createdAt",
				"updatedAt",
			],
			include: [
				{
					model: db.User,
					as: "Sender", // người gửi
					attributes: ["id", "fullName", "profilePicture", "email"],
				},
				{
					model: db.User,
					as: "Receiver", // người nhận
					attributes: ["id", "fullName", "profilePicture", "email"],
				},
			],
		});

		const relatedUsers = friendships
			.map((f) => {
				let targetUser;
				let friendshipStatus;

				if (f.userId === Number(currentUserId)) {
					// mình là người gửi
					targetUser = f.Receiver;
					friendshipStatus =
						f.status === "pending"
							? "you_sent_request"
							: f.status === "accepted"
							? "friends"
							: null;
				} else {
					// mình là người nhận
					targetUser = f.Sender;
					friendshipStatus =
						f.status === "pending"
							? "they_sent_request"
							: f.status === "accepted"
							? "friends"
							: null;
				}

				return friendshipStatus
					? {
							...targetUser?.toJSON(),
							friendshipStatus,
							createdAt: f.createdAt,
							updatedAt: f.updatedAt,
					  }
					: null;
			})
			.filter(Boolean); // bỏ mấy cái null nếu có

		return { errCode: 0, data: relatedUsers };
	} catch (e) {
		console.error(e);
		return { errCode: 1, errMessage: "Error fetching friendships" };
	}
};

let AddFriend = (userId, friendId) => {
	return new Promise(async (resolve, reject) => {
		try {
			if (userId === friendId) {
				resolve({
					errCode: 1,
					errMessage: "You cannot add yourself as a friend.",
				});
				return;
			}
			let existingFriendship = await db.Friendship.findOne({
				where: {
					[Op.or]: [
						{
							userId: userId,
							friendId: friendId,
						},
						{
							userId: friendId,
							friendId: userId,
						},
					],
				},
			});
			if (existingFriendship) {
				resolve({
					errCode: 1,
					errMessage:
						"Friend request already exists or you are already friends.",
				});
				return;
			}
			await db.Friendship.create({
				userId: userId,
				friendId: friendId,
				status: "pending",
			});

			// Create friend request notification
			try {
				const sender = await db.User.findByPk(userId, {
					attributes: ["fullName"],
				});
				await db.Notification.create({
					receiverId: friendId,
					senderId: userId,
					title: "New friend request",
					content: `${sender?.fullName || "Someone"} sent you a friend request`,
					url: `/profile/${userId}`,
					type: "FRIEND_REQUEST",
					isRead: false,
				});
			} catch (notifyErr) {
				console.warn("AddFriend notification failed:", notifyErr);
			}

			resolve({
				errCode: 0,
				errMessage: "Friend request sent successfully.",
			});
		} catch (e) {
			reject(e);
		}
	});
};

let UpdateFriendshipStatus = (userId, friendId, status) => {
	return new Promise(async (resolve, reject) => {
		try {
			let friendship = await db.Friendship.findOne({
				where: {
					userId: friendId,
					friendId: userId,
				},
			});
			if (!friendship) {
				resolve({
					errCode: 1,
					errMessage: "Friend request not found.",
				});
				return;
			}
			if (status === "accepted") {
				friendship.status = "accepted";
				await friendship.save();
				resolve({ errCode: 0, errMessage: "Accepted the friend request." });
			} else if (status === "reject") {
				await friendship.destroy();
				resolve({ errCode: 0, errMessage: "Rejected the friend request." });
			} else {
				resolve({ errCode: 2, errMessage: "Invalid action." });
			}
		} catch (e) {
			reject(e);
		}
	});
};

let DeleteFriendship = (userId, friendId) => {
	return new Promise(async (resolve, reject) => {
		try {
			let friendship = await db.Friendship.findOne({
				where: {
					[Op.or]: [
						{
							userId: userId,
							friendId: friendId,
						},
						{
							userId: friendId,
							friendId: userId,
						},
					],
				},
			});
			if (!friendship) {
				resolve({
					errCode: 1,
					errMessage: "Friendship not found.",
				});
				return;
			}
			await friendship.destroy();
			resolve({
				errCode: 0,
				errMessage: "Friendship deleted successfully.",
			});
		} catch (e) {
			reject(e);
		}
	});
};

const getOrCreateConversation = async (userId1, userId2) => {
	// Sort IDs to ensure consistency in conversation lookup
	const [userOne, userTwo] = [userId1, userId2].sort();

	let conversation = await db.Conversation.findOne({
		where: {
			userId1: userOne,
			userId2: userTwo,
		},
	});

	if (!conversation) {
		conversation = await db.Conversation.create({
			userId1: userOne,
			userId2: userTwo,
		});
	}

	return conversation;
};

const saveMessage = async (senderId, recipientId, content) => {
	try {
		const conversation = await getOrCreateConversation(senderId, recipientId);
		
		const message = await db.Message.create({
			conversationId: conversation.id,
			senderId: senderId,
			content: content.text,
			deliveredAt: new Date(),
		});
		
		return { errCode: 0, message };
	} catch (error) {
		console.error("Error saving message:", error);
		return { errCode: 1, errMessage: "Failed to save message" };
	}
};

const getMessages = async (userId1, userId2) => {
	try {
		const conversation = await getOrCreateConversation(userId1, userId2);
		if (!conversation) {
			return []; // No conversation, no messages
		}
		const messages = await db.Message.findAll({
			where: { conversationId: conversation.id },
			include: [
				{
					model: db.User,
					attributes: ["id", "fullName", "profilePicture"],
				},
			],
			order: [["createdAt", "ASC"]],
		});
		return messages;
	} catch (error) {
		console.error("Error getting messages:", error);
		throw error;
	}
};

const editMessage = async (messageId, newContent, userId) => {
	try {
		const message = await db.Message.findByPk(messageId);
		
		if (!message) {
			return { errCode: 1, errMessage: "Message not found" };
		}
		
		// Check if the user is the sender
		if (message.senderId !== userId) {
			return { errCode: 2, errMessage: "You can only edit your own messages" };
		}
		
		message.content = newContent;
		message.isEdited = true;
		await message.save();
		
		return { errCode: 0, message, errMessage: "Message edited successfully" };
	} catch (error) {
		console.error("Error editing message:", error);
		return { errCode: 1, errMessage: "Failed to edit message" };
	}
};

module.exports = {
	Search: Search,
	AddFriend: AddFriend,
	UpdateFriendshipStatus: UpdateFriendshipStatus,
	DeleteFriendship: DeleteFriendship,
	getAllFriendships: getAllFriendships,
	saveMessage,
	getMessages,
	editMessage,
};
