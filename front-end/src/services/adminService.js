import axios from "../setup/axios";

const HandleAdminLogin = (data) => {
	return axios
		.post("/api/admin_login", data)
		.then((response) => {
			return response;
		})
		.catch((error) => {
			console.error(error);
		});
};

const getAdminAccount = () => {
	return axios.get("/api/accountAdmin");
};
const LogOutAdmin = () => {
	return axios.post("/api/logoutAdmin");
};

// User Management APIs
const getAllUsers = () => {
    return axios.get("/api/admin/get-all-users");
};

const suspendUser = (userId) => {
    return axios.post("/api/admin/suspend-user", { userId });
};

const activateUser = (userId) => {
    return axios.post("/api/admin/activate-user", { userId });
};

const deleteUser = (userId) => {
    return axios.delete("/api/admin/delete-user", { data: { userId } });
};

// Post Management APIs
const getAllPosts = () => {
    return axios.get("/api/admin/get-all-posts");
};

const blockPost = (postId) => {
    return axios.post("/api/admin/block-post", { postId });
};

const unblockPost = (postId) => {
    return axios.post("/api/admin/unblock-post", { postId });
};

const deletePost = (postId) => {
    return axios.delete("/api/admin/delete-post", { data: { postId } });
};

// Statistics API
const getStatistics = () => {
    return axios.get("/api/admin/statistics");
};

export {
    HandleAdminLogin,
    getAdminAccount,
    LogOutAdmin,
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