import nodemailer from "nodemailer";

// In‐memory store: email -> { otp, expires }
const otpStore = new Map();

const generateOTP = () => {
	return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendOtpEmail = async (email, otp) => {
	let transporter = nodemailer.createTransport({
		host: process.env.EMAIL_HOST,
		port: Number(process.env.EMAIL_PORT) || 587,
		secure: false,
		auth: {
			user: process.env.EMAIL_USER,
			pass: process.env.EMAIL_PASS,
		},
	});

	let mailOptions = {
		from: `Bot App <${process.env.EMAIL_USER}>`,
		to: email,
		subject: "Your OTP for Password Reset",
		html: `<div style="font-family: Arial, sans-serif; text-align: center;">
                <h2 style="color:#333;">Password Reset OTP</h2>
                <p>Your OTP code is <strong style="font-size: 24px; color: #007BFF;">${otp}</strong></p>
                <p style="color:#666;">This code will expire in 2 minutes.</p>
            </div>`,
	};

	return transporter.sendMail(mailOptions);
};

const sendOtp = async (email) => {
	const otp = generateOTP();
	const expires = Date.now() + 2 * 60 * 1000; // 2 minutes
	otpStore.set(email, { otp, expires });
	await sendOtpEmail(email, otp);
	return { message: "OTP sent successfully" };
};

const verifyOtp = (email, otp) => {
	const record = otpStore.get(email);
	if (!record) {
		return { valid: false, message: "OTP not found. Request a new one." };
	}
	if (Date.now() > record.expires) {
		otpStore.delete(email);
		return { valid: false, message: "OTP has expired. Request a new one." };
	}
	if (record.otp !== otp) {
		return { valid: false, message: "Invalid OTP code" };
	}
	// OTP verified; remove it
	otpStore.delete(email);
	return { valid: true, message: "OTP verified successfully" };
};

export { sendOtp, verifyOtp };
