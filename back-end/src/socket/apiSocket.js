import { getIO } from "./socket";
import db from "../models/index";
import { ReservationTable } from "../service/apiService";
import { GetNotificationsByUserId, GetNotificationUnreadCount } from "../service/apiService";
const handleUpdateTable = async (data) => {
	const io = getIO();

	if (data && data.table && data.status) {
		try {
			let res = await ReservationTable(data);
			io.emit("tableUpdated", {
				table: data.table,
				status: data.status,
				customer: data.customer || null,
				response: res,
			});
			console.log("Table updated successfully:", data);
		} catch (error) {
			console.error("Failed to update table in the database:", error);
		}
	} else {
		console.warn("Invalid table update data received:", data);
	}
};

const handleNewNotification = async (userId) => {
	const io = getIO();
	if (!userId) {
		console.warn("Invalid userId for notification:", userId);
		return;
	}
	try {
		const [fullList, unread] = await Promise.all([
			GetNotificationsByUserId(userId),
			GetNotificationUnreadCount(userId),
		]);

		// Client should have joined room `user_${userId}`
		io.to(`user_${userId}`).emit("notificationUpdated", {
			notifications: fullList,
			unread,
		});
	} catch (err) {
		console.warn("handleNewNotification failed:", err);
	}
};

export { handleUpdateTable, handleNewNotification };
