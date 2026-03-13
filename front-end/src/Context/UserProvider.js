import React, { createContext, useEffect, useState } from "react";
import { getUserAccount } from "../services/userService";
import { getAdminAccount } from "../services/adminService";
const UserContext = createContext({ name: "", auth: false });
const UserProvider = ({ children }) => {
	// User is the name of the "data" that gets stored in context
	const userDefault = {
		isLoading: true,
		isAuthenticated: false,
		token: "",
		account: {},
	};
	const [user, setUser] = useState(userDefault);
	const [admin, setAdmin] = useState(userDefault);
	// Login updates the user data with a name parameter
	const loginContext = (userData) => {
		setUser({ ...userData, isLoading: false });
	};
	const loginAdmin = (userData) => {
		setAdmin({ ...userData, isLoading: false });
	};
	const logoutContext = () => {
		setUser({ ...userDefault, isLoading: false });
	};
	const logoutAdminContext = () => {
		setAdmin({ ...userDefault, isLoading: false });
	};
	// Logout updates the user data to default
	const logout = () => {
		setUser((user) => ({
			name: "",
			auth: false,
		}));
	};

	const fetchUser = async () => {
		let response = await getUserAccount();
		if (response && response.errCode === 0) {
			let token = response.DT.access_token;
			let email = response.DT.email;
			let username = response.DT.username || response.DT.fullName;
			let id = response.DT.id;
			let role = response.DT.role;
			let createdAt = response.DT.createdAt;
			let avatarUrl = response.DT.avatarUrl || response.DT.profilePicture;
			let data = {
				isAuthenticated: true,
				token,
				account: {
					id,
					email,
					username,
					fullName: username,
					role,
					createdAt,
					avatarUrl,
					profilePicture: avatarUrl,
				},
				isLoading: false,
			};
			setUser(data);
		} else {
			setUser({ ...userDefault, isLoading: false });
		}
	};

	const fetchAdmin = async () => {
		let response = await getAdminAccount();
		if (response && response.errCode === 0) {
			let token = response.DT.access_token;
			let email = response.DT.email;
			let fullName = response.DT.fullName;
			let id = response.DT.id;
			let role = response.DT.role;
			let data = {
				isAuthenticated: true,
				token,
				account: { id, email, fullName, role },
				isLoading: false,
			};
			setAdmin(data);
		} else {
			setAdmin({ ...userDefault, isLoading: false });
		}
	};

	useEffect(() => {
		if (
			// window.location.pathname !== "/" &&
			window.location.pathname !== "/login_admin" &&
			window.location.pathname !== "/login" &&
			window.location.pathname !== "/register"
		) {
			fetchAdmin();
			fetchUser();
		} else {
			setUser({ ...user, isLoading: false });
			setAdmin({ ...admin, isLoading: false });
		}
	}, []);

	useEffect(() => {
		const handleStatusChange = () => {
			console.log("Sự kiện đổi trạng thái User được bắt!");
			fetchUser();
		};

		window.addEventListener("userStatusChanged", handleStatusChange);

		return () => {
			window.removeEventListener("userStatusChanged", handleStatusChange);
		};
	}, []);

	return (
		<UserContext.Provider
			value={{
				user,
				admin,
				loginContext,
				logout,
				logoutContext,
				loginAdmin,
				logoutAdminContext,
				fetchUser,
			}}
		>
			{children}
		</UserContext.Provider>
	);
};

export { UserProvider, UserContext };
