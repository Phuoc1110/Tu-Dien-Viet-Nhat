import axios from "../setup/axios";
const cancelFriendRequest = (userId, friendId) => {
	return axios
		.post(`/api/friend-request/cancel`, { userId, friendId })
		.then((res) => res)
		.catch((err) => {
			console.error("Cancel friend request error:", err);
			return { errCode: 1, errMessage: "Failed to cancel friend request" };
		});
};

const search = (query, userId) => {
	return axios
		.get(`/api/search?q=${encodeURIComponent(query)}&userId=${userId}`)
		.then((res) => res)
		.catch((err) => {
			console.error("Search error:", err);
			return { errCode: 1, errMessage: "Search failed", posts: [], people: [] };
		});
};

const sendFriendRequest = (userId, friendId, status) => {
	return axios
		.post(`/api/friend-request`, { userId, friendId, status })
		.then((res) => res)
		.catch((err) => {
			console.error("Send friend request error:", err);
			return { errCode: 1, errMessage: "Failed to send friend request" };
		});
};

const sendAddFriend = (userId, friendId) => {
	return axios
		.post(`/api/add-friend`, { userId, friendId })
		.then((res) => res)
		.catch((err) => {
			console.error("Add friend error:", err);
			return { errCode: 1, errMessage: "Failed to add friend" };
		});
};

const getFriendStatuses = (friendIds) => {
	// Accepts array of friendIds and returns map { id: status }
	return axios
		.post(`/api/friend-status/batch`, { friendIds })
		.then((res) => res)
		.catch((err) => {
			console.error("Get friend statuses error:", err);
			return {
				errCode: 1,
				errMessage: "Failed to fetch statuses",
				statuses: {},
			};
		});
};

const getAllFriendships = (userId) => {
	return axios
		.get(`/api/get-all-friendships?userId=${userId}`)
		.then((res) => res)
		.catch((err) => {
			console.error("Get all friendships error:", err);
			return { errCode: 1, errMessage: "Failed to get all friendships" };
		});
};

const getMessages = (userId1, userId2) => {
	return axios
		.get(`/api/messages?userId1=${userId1}&userId2=${userId2}`)
		.then((res) => res)
		.catch((err) => {
			console.error("Get messages error:", err);
			return { errCode: 1, errMessage: "Failed to get messages" };
		});
};

const editMessage = (messageId, newContent, userId) => {
	return axios
		.put(`/api/messages/edit`, { messageId, newContent, userId })
		.then((res) => res)
		.catch((err) => {
			console.error("Edit message error:", err);
			return { errCode: 1, errMessage: "Failed to edit message" };
		});
};

export {
	search,
	sendFriendRequest,
	getFriendStatuses,
	getAllFriendships,
	cancelFriendRequest,
	sendAddFriend,
	getMessages,
	editMessage,
};
