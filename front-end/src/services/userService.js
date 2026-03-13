import axios from "../setup/axios";
const LoginUser = (data) => {
	return axios
		.post("/api/login", data)
		.then((response) => response)
		.catch((error) => {
			console.error(error);
		});
};

const CreateNewUser = (data) => {
	return axios
		.post("/api/create-new-user", data)
		.then((response) => response)
		.catch((error) => {
			console.error(error);
		});
};
const GetAllUser = (InputId) => {
	return axios
		.get(`/api/get-all-user?id=${InputId}`)
		.then((response) => response)
		.catch((err) => {
			console.log(err);
		});
};
const getUserAccount = () => {
	return axios.get("/api/account");
};
const LogOutUser = () => {
	return axios.post("/api/logout");
};
const EditUserService = (user_edit) => {
	return axios.put("/api/edit-user", user_edit);
};

const UpdateProfileService = (profileData) => {
	return axios.put("/api/update-profile", profileData);
};

const DeleteUser = (idUser) => {
	return axios.delete("/api/delete-user", { data: { id: idUser } });
};
const resetPassword = (email, newPassword) => {
	return axios
		.post("/api/reset-password", { email, newPassword })
		.then((response) => response)
		.catch((error) => {
			console.error(error);
		});
};
const sendResetOTP = async (email) => {
	try {
		const response = await axios.post("/api/reset-otp/send", { email });
		return response;
	} catch (error) {
		console.error(error);
	}
};

const verifyOTP = async (email, otp) => {
	try {
		const response = await axios.post("/api/reset-otp/verify", { email, otp });
		return response;
	} catch (error) {
		console.error(error);
	}
};

export {
	LoginUser,
	CreateNewUser,
	GetAllUser,
	getUserAccount,
	LogOutUser,
	EditUserService,
	UpdateProfileService,
	DeleteUser,
	resetPassword,
	sendResetOTP,
	verifyOTP,
};
