import React, { useState } from "react";
import "./LoginAdmin.css";
import { HandleAdminLogin } from "../../../services/adminService";
import { toast } from "react-toastify";
import { useHistory } from "react-router-dom/cjs/react-router-dom.min";
import { useContext } from "react";
import { UserContext } from "../../../Context/UserProvider";

const LoginAdmin = () => {
	const [formData, setFormData] = useState({
		email: "",
		password: "",
	});

	const handleChange = (e) => {
		setFormData({
			...formData,
			[e.target.name]: e.target.value,
		});
	};
	const history = useHistory();
	const { loginAdmin } = useContext(UserContext);

	const handleSubmit = async (e) => {
		e.preventDefault();
		try {
			const response = await HandleAdminLogin(formData);
			if (response && response.errcode === 0) {
				toast.success("Success Login");
				let userWithRole = { ...response.user, role: "admin" };
				let token = response.DT.access_token;
				let data = {
					isAuthenticated: true,
					token: token,
					id: response.user.id,
					account: userWithRole,
				};
				loginAdmin(data);
				history.push(`/admin`);
			} else {
				toast.error(response.message);
			}
		} catch (e) {
			toast.error("Login failed. Please try again.");
		}
	};

	return (
		<div className="admin-login-container">
			<div className="admin-login-card">
				<div className="admin-login-header">
					<h1>Admin Login</h1>
					<p>Sign in to admin dashboard</p>
				</div>

				<form onSubmit={handleSubmit} className="admin-login-form">
					<div className="admin-form-group">
						<label htmlFor="email">Email</label>
						<input
							type="email"
							id="email"
							name="email"
							value={formData.email}
							onChange={handleChange}
							placeholder="admin@example.com"
							required
						/>
					</div>

					<div className="admin-form-group">
						<label htmlFor="password">Password</label>
						<input
							type="password"
							id="password"
							name="password"
							value={formData.password}
							onChange={handleChange}
							placeholder="••••••••"
							required
						/>
					</div>

					<button type="submit" className="admin-login-button">
						Sign In
					</button>
				</form>
			</div>
		</div>
	);
};

export default LoginAdmin;
