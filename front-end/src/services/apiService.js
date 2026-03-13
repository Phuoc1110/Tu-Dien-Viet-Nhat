import axios from "../setup/axios";

const GetAllPost = (InputId) => {
	return axios
		.get(`/api/getAllPost?id=${InputId}`)
		.then((response) => {
			return response;
		})
		.catch((err) => {
			console.log(err);
		});
};

const CreateNewPost = (data) => {
	return axios
		.post("/api/create-new-post", data)
		.then((response) => {
			return response;
		})
		.catch((err) => {
			console.log(err);
		});
};

const UpdatePost = (data) => {
	console.log("Updating post with data:", data);
	return axios
		.post("/api/update-post", data)
		.then((response) => {
			return response;
		})
		.catch((err) => {
			console.log(err);
		});
};

const DeletePostConfirm = (id) => {
	return axios
		.post("/api/delete-post", { id })
		.then((response) => response)
		.catch((err) => {
			console.log(err);
		});
};

const GetAllComment = (postId) => {
	return axios
		.get(`/api/getAllComment?postId=${postId}`)
		.then((response) => {
			return response;
		})
		.catch((err) => {
			console.log(err);
		});
};
const CreateComment = (data) => {
	return axios
		.post("/api/create-comment", data)
		.then((response) => {
			return response;
		})
		.catch((err) => {
			console.log(err);
		});
};
const CreateLike = (data) => {
	return axios.post("/api/handle-like-post", data).then((response) => {
		return response;
	});
};
const HandleGetLikePost = (postId) => {
	return axios.get(`/api/get-post-like?postId=${postId}`).then((response) => {
		return response;
	});
};
const GetNotificationsByUserId = (userId) => {
	return axios
		.get(`/api/get-notifications-by-user-id?userId=${userId}`)
		.then((response) => response)
		.catch((err) => {
			console.log(err);
		});
};
const UpdateComment = (data) => {
	return axios
		.post("/api/update-comment", data)
		.then((response) => response)
		.catch((err) => {
			console.log(err);
		});
};
const DeleteComment = (id) => {
	return axios
		.post("/api/delete-comment", { id })
		.then((response) => response)
		.catch((err) => {
			console.log(err);
		});
};
const GetPostByPostId = (postId) => {
	return axios
		.get(`/api/get-post-by-id?postId=${postId}`)
		.then((response) => {
			return response;
		})
		.catch((err) => {
			console.log(err);
		});
};
const GetLikedPostsByUserId = (userId) => {
	return axios
		.get(`/api/get-liked-posts?userId=${userId}`)
		.then((response) => {
			return response;
		})
		.catch((err) => {
			console.log(err);
		});
};
const UpdateNotificationReadStatus = (id, isRead = true) => {
	return axios
		.post("/api/update-notification-read-status", { id, isRead })
		.then((response) => response)
		.catch((err) => {
			console.log(err);
		});
};

export {
	HandleGetLikePost,
	GetAllPost,
	CreateNewPost,
	CreateLike,
	UpdatePost,
	DeletePostConfirm,
	GetAllComment,
	CreateComment,
	GetNotificationsByUserId,
	UpdateComment,
	DeleteComment,
	GetPostByPostId,
	UpdateNotificationReadStatus,
	GetLikedPostsByUserId,
};
