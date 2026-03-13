import React, { useState } from "react";
import { Eye, EyeOff, Mail, Lock, User, Phone, UserPlus } from "lucide-react";
import { Link } from "react-router-dom";
import "./Register.css";
import { CreateNewUser } from "../../services/userService";
import { toast } from "react-toastify";
import { useHistory } from "react-router-dom";
const Register = () => {
	const [formData, setFormData] = useState({
		email: "",
		fullName: "",
		password: "",
		repassword: "",
		phone: "",
	});
	const [showPassword, setShowPassword] = useState(false);
	const [showRePassword, setShowRePassword] = useState(false);
	const [errors, setErrors] = useState({});
	const [isLoading, setIsLoading] = useState(false);
	const history = useHistory();
	const handleInputChange = (e) => {
		const { name, value } = e.target;
		setFormData((prev) => ({
			...prev,
			[name]: value,
		}));

		// Clear error when user starts typing
		if (errors[name]) {
			setErrors((prev) => ({
				...prev,
				[name]: "",
			}));
		}
	};

	const validateForm = () => {
		const newErrors = {};

		if (!formData.fullName.trim()) {
			newErrors.fullName = "Full name is required";
		} else if (formData.fullName.trim().length < 2) {
			newErrors.fullName = "Full name must be at least 2 characters";
		}

		if (!formData.email) {
			newErrors.email = "Email is required";
		} else if (!/\S+@\S+\.\S+/.test(formData.email)) {
			newErrors.email = "Please enter a valid email";
		}

		if (!formData.phone) {
			newErrors.phone = "Phone number is required";
		} else if (!/^\+?[\d\s-()]{10,}$/.test(formData.phone)) {
			newErrors.phone = "Please enter a valid phone number";
		}

		if (!formData.password) {
			newErrors.password = "Password is required";
		} else if (formData.password.length < 6) {
			newErrors.password = "Password must be at least 6 characters";
		}

		if (!formData.repassword) {
			newErrors.repassword = "Please confirm your password";
		} else if (formData.password !== formData.repassword) {
			newErrors.repassword = "Passwords do not match";
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e) => {
		e.preventDefault();

		if (!validateForm()) return;

		setIsLoading(true);

		try {
			const payload = {
				...formData,
				username: formData.fullName,
			};
			const response = await CreateNewUser(payload);
			if (response && response.errCode === 0) {
				toast.success("Success Register");
				history.push("/login");
			} else {
				toast.error(response.errMessage);
			}
		} catch (error) {
			console.error("Registration error: ", error);
			setErrors({ submit: "Registration failed. Please try again." });
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="register-container">
			<div className="register-card">
				{/* Header */}
				<div className="register-header">
					<h2 className="register-title">Create Account</h2>
					<p className="register-subtitle">Join our community today</p>
				</div>

				{/* Register Form */}
				<form className="register-form" onSubmit={handleSubmit}>
					{/* Full Name Field */}
					<div className="register-form-group">
						<label className="register-form-label">Full Name</label>
						<div className="register-input-wrapper">
							<User size={18} className="register-input-icon" />
							<input
								type="text"
								name="fullName"
								value={formData.fullName}
								onChange={handleInputChange}
								placeholder="Enter your full name"
								className={`register-form-input ${
									errors.fullName ? "register-error" : ""
								}`}
							/>
						</div>
						{errors.fullName && (
							<span className="register-error-message">{errors.fullName}</span>
						)}
					</div>

					{/* Email Field */}
					<div className="register-form-group">
						<label className="register-form-label">Email Address</label>
						<div className="register-input-wrapper">
							<Mail size={18} className="register-input-icon" />
							<input
								type="email"
								name="email"
								value={formData.email}
								onChange={handleInputChange}
								placeholder="Enter your email"
								className={`register-form-input ${
									errors.email ? "register-error" : ""
								}`}
							/>
						</div>
						{errors.email && (
							<span className="register-error-message">{errors.email}</span>
						)}
					</div>

					{/* Phone Number Field */}
					<div className="register-form-group">
						<label className="register-form-label">Phone Number</label>
						<div className="register-input-wrapper">
							<Phone size={18} className="register-input-icon" />
							<input
								type="tel"
								name="phone"
								value={formData.phone}
								onChange={handleInputChange}
								placeholder="Enter your phone number"
								className={`register-form-input ${
									errors.phone ? "register-error" : ""
								}`}
							/>
						</div>
						{errors.phone && (
							<span className="register-error-message">{errors.phone}</span>
						)}
					</div>

					{/* Password Field */}
					<div className="register-form-group">
						<label className="register-form-label">Password</label>
						<div className="register-input-wrapper">
							<Lock size={18} className="register-input-icon" />
							<input
								type={showPassword ? "text" : "password"}
								name="password"
								value={formData.password}
								onChange={handleInputChange}
								placeholder="Enter your password"
								className={`register-form-input ${
									errors.password ? "register-error" : ""
								}`}
							/>
							<button
								type="button"
								className="register-password-toggle"
								onClick={() => setShowPassword(!showPassword)}
							>
								{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
							</button>
						</div>
						{errors.password && (
							<span className="register-error-message">{errors.password}</span>
						)}
					</div>

					{/* Confirm Password Field */}
					<div className="register-form-group">
						<label className="register-form-label">Confirm Password</label>
						<div className="register-input-wrapper">
							<Lock size={18} className="register-input-icon" />
							<input
								type={showRePassword ? "text" : "password"}
								name="repassword"
								value={formData.repassword}
								onChange={handleInputChange}
								placeholder="Confirm your password"
								className={`register-form-input ${
									errors.repassword ? "register-error" : ""
								}`}
							/>
							<button
								type="button"
								className="register-password-toggle"
								onClick={() => setShowRePassword(!showRePassword)}
							>
								{showRePassword ? <EyeOff size={18} /> : <Eye size={18} />}
							</button>
						</div>
						{errors.repassword && (
							<span className="register-error-message">
								{errors.repassword}
							</span>
						)}
					</div>

					{/* Terms & Conditions */}
					<div className="register-terms">
						<label className="register-checkbox-label">
							<input type="checkbox" className="register-checkbox" required />
							<span className="register-checkbox-text">
								I agree to the{" "}
								<Link to="/terms" className="register-terms-link">
									Terms & Conditions
								</Link>{" "}
								and{" "}
								<Link to="/privacy" className="register-terms-link">
									Privacy Policy
								</Link>
							</span>
						</label>
					</div>

					{/* Submit Error */}
					{errors.submit && (
						<div className="register-submit-error">{errors.submit}</div>
					)}

					{/* Submit Button */}
					<button
						type="submit"
						className="register-button"
						disabled={isLoading}
					>
						{isLoading ? (
							<div className="register-loading-spinner"></div>
						) : (
							<>
								<UserPlus size={18} />
								Create Account
							</>
						)}
					</button>
				</form>

				{/* Footer */}
				<div className="register-footer">
					<p className="register-signin-text">
						Already have an account?
						<Link to="/login" className="register-signin-link">
							Sign in
						</Link>
					</p>
				</div>
			</div>
		</div>
	);
};

export default Register;
