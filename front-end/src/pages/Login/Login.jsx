import React, { useContext, useState } from "react";
import { Eye, EyeOff, Mail, Lock, LogIn } from "lucide-react";
import { Link } from "react-router-dom";
import "./Login.css";
import { toast } from "react-toastify";
import { UserContext } from "../../Context/UserProvider";
import { LoginUser } from "../../services/userService";
import { useHistory } from "react-router-dom/cjs/react-router-dom.min";

const Login = () => {
	const { loginContext } = useContext(UserContext);
	const history = useHistory();
	const [formData, setFormData] = useState({
		email: "",
		password: "",
	});
	const [showPassword, setShowPassword] = useState(false);
	const [errors, setErrors] = useState({});
	const [isLoading, setIsLoading] = useState(false);

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

		if (!formData.email) {
			newErrors.email = "Email is required";
		} else if (!/\S+@\S+\.\S+/.test(formData.email)) {
			newErrors.email = "Please enter a valid email";
		}

		if (!formData.password) {
			newErrors.password = "Password is required";
		} else if (formData.password.length < 6) {
			newErrors.password = "Password must be at least 6 characters";
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e) => {
		e.preventDefault();

		if (!validateForm()) return;

		setIsLoading(true);

		try {
			const response = await LoginUser(formData);
			if (response && response.errcode === 0) {
				toast.success("Success Login");
				let token = response.DT.access_token;
				let data = {
					isAuthenticated: true,
					token: token,
					id: response.user.id,
					account: response.user,
				};
				loginContext(data);
				history.push(`/`);
			} else {
				toast.error(response.message);
			}
		} catch (error) {
			console.error("Login error:", error);
			setErrors({ submit: "Login failed. Please try again." });
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="login-container">
			<div className="login-card">
				{/* Header */}
				<div className="login-header">
					<h2 className="login-title">Welcome Back</h2>
					<p className="login-subtitle">Sign in to your account to continue</p>
				</div>

				{/* Login Form */}
				<form className="login-form" onSubmit={handleSubmit}>
					{/* Email Field */}
					<div className="login-form-group">
						<label className="login-form-label">Email Address</label>
						<div className="login-input-wrapper">
							<Mail size={18} className="login-input-icon" />
							<input
								type="email"
								name="email"
								value={formData.email}
								onChange={handleInputChange}
								placeholder="Enter your email"
								className={`login-form-input ${
									errors.email ? "login-error" : ""
								}`}
							/>
						</div>
						{errors.email && (
							<span className="login-error-message">{errors.email}</span>
						)}
					</div>

					{/* Password Field */}
					<div className="login-form-group">
						<label className="login-form-label">Password</label>
						<div className="login-input-wrapper">
							<Lock size={18} className="login-input-icon" />
							<input
								type={showPassword ? "text" : "password"}
								name="password"
								value={formData.password}
								onChange={handleInputChange}
								placeholder="Enter your password"
								className={`login-form-input ${
									errors.password ? "login-error" : ""
								}`}
							/>
							<button
								type="button"
								className="login-password-toggle"
								onClick={() => setShowPassword(!showPassword)}
							>
								{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
							</button>
						</div>
						{errors.password && (
							<span className="login-error-message">{errors.password}</span>
						)}
					</div>

					{/* Remember Me & Forgot Password */}
					<div className="login-form-options">
						<label className="login-checkbox-label">
							<input type="checkbox" className="login-checkbox" />
							<span className="login-checkbox-text">Remember me</span>
						</label>
						<Link to="/forgot-password" className="login-forgot-link">
							Forgot Password?
						</Link>
					</div>

					{/* Submit Error */}
					{errors.submit && (
						<div className="login-submit-error">{errors.submit}</div>
					)}

					{/* Submit Button */}
					<button type="submit" className="login-button" disabled={isLoading}>
						{isLoading ? (
							<div className="login-loading-spinner"></div>
						) : (
							<>
								<LogIn size={18} />
								Sign In
							</>
						)}
					</button>
				</form>

				{/* Footer */}
				<div className="login-footer">
					<p className="login-signup-text">
						Don't have an account?
						<Link to="/register" className="login-signup-link">
							Sign up
						</Link>
					</p>
				</div>
			</div>
		</div>
	);
};

export default Login;
