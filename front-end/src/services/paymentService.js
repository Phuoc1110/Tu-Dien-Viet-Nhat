import axios from "../setup/axios";

export const createZaloPayOrder = async ({
	userId,
	type,
	postId,
	amount,
	duration,
}) => {
	const payload = { userId, type, postId, amount, duration };
	return axios.post("/payment/ZaloPay", payload);
};

export const checkZaloPayOrderStatus = async ({ app_trans_id }) => {
	return axios.post("/payment/ZaloPay/check", { app_trans_id });
};
