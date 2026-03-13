import { sendOtp, verifyOtp } from "../service/otpService.js";
import userService from "../service/userService"; // new import

const sendResetOTP = async (req, res) => {
	const { email } = req.body;
	if (!email) {
		return res.status(400).json({
			errCode: 1,
			errMessage: "Email is required",
		});
	}
	// Use service to check if email exists
	const exists = await userService.CheckUserEmail(email);
	if (!exists) {
		return res.status(400).json({
			errCode: 2,
			errMessage: "Email does not exist",
		});
	}
	try {
		const result = await sendOtp(email);
		return res.status(200).json({
			errCode: 0,
			errMessage: result.message,
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({
			errCode: -1,
			errMessage: "Error sending OTP",
		});
	}
};

const verifyResetOTP = (req, res) => {
	try {
		const { email, otp } = req.body;
		if (!email || !otp) {
			return res
				.status(400)
				.json({ errCode: 1, errMessage: "Email and OTP are required" });
		}
		const result = verifyOtp(email, otp);
		if (!result.valid) {
			return res.status(400).json({ errCode: 1, errMessage: result.message });
		}
		return res.status(200).json({ errCode: 0, errMessage: result.message });
	} catch (error) {
		console.error(error);
		return res
			.status(500)
			.json({ errCode: -1, errMessage: "Internal server error" });
	}
};

const resetPassword = async (req, res) => {
	// Validate input
	const { email, newPassword } = req.body;
	if (!email || !newPassword) {
		return res
			.status(400)
			.json({ errCode: 1, errMessage: "Missing parameters" });
	}
	try {
		const result = await userService.resetPassword(email, newPassword);
		if (result.errCode !== 0) {
			return res.status(400).json(result);
		}
		return res.status(200).json(result);
	} catch (error) {
		console.error(error);
		return res
			.status(500)
			.json({ errCode: -1, errMessage: "Internal server error" });
	}
};

export { sendResetOTP, verifyResetOTP, resetPassword };
