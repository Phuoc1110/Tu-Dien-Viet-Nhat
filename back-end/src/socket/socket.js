import { Server } from "socket.io";
import { handleUpdateTable } from "./apiSocket.js";
import { verifySocketToken } from "../middleware/JWT_Action.js";
import { saveMessage } from "../service/socialService.js";
let io;

const initSocket = (server) => {
	io = new Server(server, {
		cors: {
			origin: "*",
			methods: ["GET", "POST"],
		},
	});

	console.log("Socket server initialized and listening for connections");

	io.use(verifySocketToken);

	io.on("connection", (socket) => {
		// console.log("Client connected:", socket.id, "User:", socket.user);

		// Join a room based on user ID
		if (socket.user && socket.user.id) {
			socket.join(socket.user.id.toString());
			// console.log(
			// 	`User ${socket.user.id} with socket ID ${socket.id} joined room ${socket.user.id}`
			// );
		}

		socket.on("sendMessage", async ({ recipientId, message }) => {
			// console.log(
			// 	`Received message from ${socket.user.id} to ${recipientId}:`,
			// 	message
			// );
			const result = await saveMessage(socket.user.id, recipientId, message);
			
			if (result.errCode === 0) {
				// Emit to recipient with the saved message data including real ID
				io.to(recipientId.toString()).emit("receiveMessage", {
					senderId: socket.user.id,
					messageId: result.message.id,
					...message,
				});
				
				// Send acknowledgment back to sender with real message ID
				socket.emit("messageSaved", {
					tempId: message.tempId,
					realId: result.message.id,
					message: result.message,
				});
			}
		});

		// Join a room based on user ID
		if (socket.user && socket.user.id) {
			socket.join(socket.user.id.toString());
			console.log(
				`User ${socket.user.id} with socket ID ${socket.id} joined room ${socket.user.id}`
			);
		}

		socket.on("sendMessage", async ({ recipientId, message }) => {
			console.log(
				`Received message from ${socket.user.id} to ${recipientId}:`,
				message
			);
			await saveMessage(socket.user.id, recipientId, message);
			io.to(recipientId.toString()).emit("receiveMessage", {
				senderId: socket.user.id,
				...message,
			});
		});

		socket.on("updatePost", (updatedPost) => {
			io.emit("postUpdated", updatedPost);
		});

		socket.on("deletePost", (postToDelete) => {
			io.emit("postDeleted", postToDelete);
		});

		socket.on("sendFriendRequest", ({ data, toUserId, friendshipStatus }) => {
			io.emit("friendRequestReceived", { data, toUserId, friendshipStatus });
		});

		socket.on("notification", ({ userId }) => {
			io.emit("notificationReceived", { userId });
		});

		// =============== WebRTC signaling events ===============
		// Client A initiates a call to userId 'to'
		socket.on("call:init", ({ to, callType }) => {
			if (!to) return;
			const fromId = socket.user?.id;
			if (!fromId) return;
			console.log(`Call init from ${fromId} to ${to} type=${callType}`);
			io.to(to.toString()).emit("call:incoming", {
				from: fromId,
				callType: callType || "video",
				caller: {
					id: fromId,
					name:
						socket.user?.fullName ||
						socket.user?.name ||
						socket.user?.email ||
						`${fromId}`,
					avatar: socket.user?.profilePicture || null,
				},
			});
		});

		// Exchange SDP / ICE candidates
		socket.on("call:signal", ({ to, signal }) => {
			if (!to || !signal) return;
			const fromId = socket.user?.id;
			io.to(to.toString()).emit("call:signal", { from: fromId, signal });
		});

		socket.on("call:mode-change", ({ to, mode }) => {
			io.to(to.toString()).emit("call:mode-change", { mode });
		});

		// Mic toggle notification
		socket.on("call:mic-toggle", ({ to, muted }) => {
			if (!to) return;
			io.to(to.toString()).emit("call:mic-toggle", { muted });
		});

		// Video toggle notification
		socket.on("call:video-toggle", ({ to, videoOff }) => {
			if (!to) return;
			io.to(to.toString()).emit("call:video-toggle", { videoOff });
		});

		// Callee accepts
		socket.on("call:accept", ({ to, callType }) => {
			if (!to) return;
			const fromId = socket.user?.id;
			console.log(`Call accepted by ${fromId} for ${to}`);
			io.to(to.toString()).emit("call:accepted", {
				from: fromId,
				callType: callType || "video",
			});
		});

		// Callee rejects
		socket.on("call:reject", ({ to }) => {
			if (!to) return;
			const fromId = socket.user?.id;
			console.log(`Call rejected by ${fromId} for ${to}`);
			io.to(to.toString()).emit("call:rejected", { from: fromId });
		});

		// Either party ends call
		socket.on("call:end", ({ to }) => {
			if (!to) return;
			const fromId = socket.user?.id;
			console.log(`Call end from ${fromId} to ${to}`);
			io.to(to.toString()).emit("call:ended", { from: fromId });
		});
		// ========================================================

		socket.on("joinRoom", (roomId) => {
			socket.join(roomId);
			console.log(`User joined room ${roomId}`);
		});

		socket.on("disconnect", (reason) => {
			// console.log(`Client disconnected: ${socket.id}, Reason: ${reason}`);
		});
		
		socket.on("editMessage", ({ messageId, newContent, recipientId }) => {
			console.log(`Message ${messageId} edited by ${socket.user.id}, notifying ${recipientId}`);
			io.to(recipientId.toString()).emit("messageEdited", {
				messageId,
				newContent,
				senderId: socket.user.id,
			});
		});
	});
};

const getIO = () => {
	if (!io) throw new Error("Socket has not been initialized!");
	return io;
};

export { initSocket, getIO };
