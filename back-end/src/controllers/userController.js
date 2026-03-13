import userService from "../service/userService"; 
// import apiService from "../service/apiService";
const cloudinary = require("cloudinary").v2;
require("dotenv").config();
let HandleLogin = async (req, res) => {
	let email = req.body.email;
	let pass = req.body.password;
	if (!email || !pass) {
		return res.status(500).json({
			errcode: 1,
			message: "Missing inputs parameter!",
		});
	}

	let userdata = await userService.HandleUserLogin(email, pass);
	if (userdata && userdata.DT && userdata.DT.access_token) {
		res.cookie("jwt", userdata.DT.access_token, {
			httpOnly: true,
			maxAge: process.env.maxAgeCookie,
			secure: true,
			sameSite: "none",
		});
	}
	return res.status(200).json({
		errcode: userdata.errCode,
		message: userdata.errMessage,
		user: userdata.user ? userdata.user : {},
		DT: userdata.DT,
	});
};

let HandleGetAllUser = async (req, res) => {
	let id = req.query.id;
	if (!id) {
		return res.status(200).json({
			errCode: 1,
			errMessage: "Missing required parameter",
			user: [],
		});
	}
	let user = await userService.getAllUser(id);
	return res.status(200).json({
		errCode: 0,
		errMessage: "OK",
		user: user,
	});
};
let HandleCreateNewUser = async (req, res) => {
	let message = await userService.CreateNewUser(req.body);
	return res.status(200).json(message);
};
let HandleEditUser = async (req, res) => {
	let data = req.body;
	let message = await userService.updateUser(data);
	if (message && message.DT && message.DT.access_token) {
		res.cookie("jwt", message.DT.access_token, {
			httpOnly: true,
			maxAge: 60 * 60 * 1000,
			sameSite: "none",
			secure: true,
		});
	}
	return res.status(200).json(message);
};

let HandleUpdateProfile = async (req, res) => {
	try {
		let data = req.body;
		let fileImage = req.file;
		let urlImage = data.url_image;
		// Validate that user ID is provided (either from request body or authenticated user)
		if (!data.id && !req.user?.id) {
			if (fileImage) {
				await cloudinary.uploader.destroy(fileImage.filename);
			}
			return res.status(400).json({
				errCode: 1,
				errMessage: "Missing user ID parameter!",
			});
		}

		// Use authenticated user's ID if not provided in body
		if (!data.id && req.user?.id) {
			data.id = req.user.id;
		}
		if (urlImage) {
			const uploadResponse = await cloudinary.uploader.upload(urlImage, {
				folder: "SocialMedia",
			});
			data.image = uploadResponse.secure_url;
		}
		let message = await userService.updateUserProfile(data, fileImage);

		if (message && message.DT && message.DT.access_token) {
			res.cookie("jwt", message.DT.access_token, {
				httpOnly: true,
				maxAge: process.env.maxAgeCookie,
				secure: true,
				sameSite: "none",
			});
		}

		return res.status(200).json(message);
	} catch (error) {
		console.error("Error in HandleUpdateProfile:", error);
		return res.status(500).json({
			errCode: -1,
			errMessage: "Internal server error",
		});
	}
};

// let HandleDeleteUser = async (req, res) => {
// 	if (!req.body.id) {
// 		return res.status(200).json({
// 			errCode: 1,
// 			errMessage: "Missing required parameters!",
// 		});
// 	}
// 	let car = await apiService.GetAllCar(`${req.body.id}`);
// 	car.forEach(async (cars) => {
// 		let ticket = await apiService.DeleteTicket(cars.id_car);
// 	});
// 	let result = await apiService.DeleteCar(req.body.id);
// 	let message = await userService.DeleteUser(req.body.id);
// 	return res.status(200).json({
// 		...message,
// 	});
// };
const getUserAccount = async (req, res) => {
	if (!req.user) {
		return res.status(401).json({
			errCode: -2,
			errMessage: "Not Authenticated the user",
		});
	}
	return res.status(200).json({
		errCode: 0,
		errMessage: "Ok!",
		DT: {
			access_token: req.token,
			id: req.user.id,
			username: req.user.username || req.user.fullName,
			fullName: req.user.username || req.user.fullName,
			email: req.user.email,
			role: req.user.role,
			status: req.user.status,
			avatarUrl: req.user.avatarUrl || req.user.profilePicture,
			profilePicture: req.user.avatarUrl || req.user.profilePicture,
			createdAt: req.user.createdAt,
		},
	});
};
const HandleLogOut = (req, res) => {
	try {
		res.clearCookie("jwt");
		return res.status(200).json({
			errCode: 0,
			errMessage: "Clear cookie done",
		});
	} catch (e) {
		console.log(e);
		return res.status(500).json({
			errCode: -1,
			errMessage: "Error from server",
		});
	}
};
let HandleDeleteUser = async (req, res) => {
	if (!req.body.id) {
		return res.status(200).json({
			errCode: 1,
			errMessage: "Missing required parameters!",
		});
	}
	let message = await userService.DeleteUser(req.body.id);
	return res.status(200).json({
		...message,
	});
};

module.exports = {
	HandleLogin: HandleLogin,
	HandleGetAllUser: HandleGetAllUser,
	HandleCreateNewUser: HandleCreateNewUser,
	HandleEditUser: HandleEditUser,
	HandleUpdateProfile: HandleUpdateProfile,
	HandleDeleteUser: HandleDeleteUser,
	getUserAccount,
	HandleLogOut: HandleLogOut,
};
