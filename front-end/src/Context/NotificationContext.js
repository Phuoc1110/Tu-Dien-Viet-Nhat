// import React, { createContext, useEffect, useState, useContext } from "react";
// import { GetNotificationsByUserId } from "../services/apiService";
// import { UserContext } from "./UserProvider";
// import { io } from "socket.io-client";

// const NotificationContext = createContext({
// 	// make context safe even if used before provider mounts
// 	notifications: [],
// 	unread: 0,
// 	setNotifications: () => {},
// 	setUnread: () => {},
// });

// export const NotificationProvider = ({ children }) => {
// 	const { user } = useContext(UserContext);
// 	const [notifications, setNotifications] = useState([]);
// 	const [unread, setUnread] = useState(0);

// 	useEffect(() => {
// 		// Guard: need user id and token
// 		if (!user?.account?.id) return;

// 		// Fetch initial notifications
// 		const fetchData = async () => {
// 			try {
// 				const res = await GetNotificationsByUserId(user.account.id);
// 				// support both axios-like { data: {...} } and plain {...}
// 				const data = res?.data && typeof res.data === "object" ? res.data : res;

// 				if (data?.errCode === 0) {
// 					const list = Array.isArray(data.notifications)
// 						? data.notifications
// 						: [];
// 					const unreadCount = typeof data.unread === "number" ? data.unread : 0;
// 					setNotifications(list);
// 					setUnread(unreadCount);
// 				} else {
// 					setNotifications([]);
// 					setUnread(0);
// 				}
// 			} catch {
// 				setNotifications([]);
// 				setUnread(0);
// 			}
// 		};
// 		fetchData();

// 		// Initialize socket with token auth
// 		const socket = io(`${process.env.REACT_APP_API_URL}`, {
// 			auth: { token: user.token },
// 			transports: ["websocket", "polling"],
// 		});

// 		// Join user-specific room on connect
// 		socket.on("connect", () => {});
// 		socket.on("connect_error", (err) => {
// 			console.error("Socket connect_error (notifications):", err?.message);
// 		});

// 		// Listen for notifications updates { notifications, unread }
// 		socket.on("notificationReceived", (data) => {
// 			// Fix: check data.userId thay vì userId
// 			if (data?.userId !== user?.account?.id) return;
// 			fetchData();
// 		});

// 		return () => {
// 			socket.disconnect();
// 		};
// 	}, [user?.account?.id, user?.token]);

// 	return (
// 		<NotificationContext.Provider
// 			value={{ notifications, unread, setNotifications, setUnread }}
// 		>
// 			{children}
// 		</NotificationContext.Provider>
// 	);
// };

// export const useNotifications = () => useContext(NotificationContext);
