import React, { useContext, useState } from "react";
import {
	Settings,
	LogOut,
	LogIn,
	ChevronDown,
	Crown,
	BookOpen,
	NotebookText,
	BookText,
} from "lucide-react";
import "./Navbar.css";
import { UserContext } from "../../Context/UserProvider";
// import { useNotifications } from "../../Context/NotificationContext";
import {
	useHistory,
	useLocation,
} from "react-router-dom/cjs/react-router-dom.min";
import { LogOutUser } from "../../services/userService";
import { toast } from "react-toastify";
// import Notification from "../Notification/Notification";
import logo from "../../assets/images/JP_Dict_Logo.jpg";

const Navbar = ({ title = "HomePage" }) => {
	const [showUserMenu, setShowUserMenu] = useState(false);
	// const [showNotifications, setShowNotifications] = useState(false);
	const [searchValue, setSearchValue] = useState("");
	const { user, logoutContext } = useContext(UserContext);
	// const { notifications = [], unread = 0 } = useNotifications();
	const history = useHistory();
	const location = useLocation();
	// const handleNotificationToggle = () => {
	// 	setShowNotifications((prev) => !prev);
	// 	setShowUserMenu(false); // Close user menu when opening notifications
	// };
	const handleUserMenuToggle = () => {
		setShowUserMenu(!showUserMenu);
		// setShowNotifications(false); // Close notifications when opening user menu
	};

	const handleSearch = (e) => {
		if (e.key === "Enter") {
			if (searchValue.trim()) {
				history.push(`/dictionary?q=${searchValue.trim()}`);
			}
		}
	};

	const handleLogout = async () => {
		let data = await LogOutUser();
		logoutContext();
		if (data && data.errCode === 0) {
			history.push("/");
			toast.success("Log out success");
		} else {
			toast.error(data.errMessage);
		}
	};

	if (
		location.pathname === "/reset-password" ||
		location.pathname === "/login_admin" ||
		location.pathname === "/login" ||
		location.pathname === "/register" ||
		location.pathname === "/admin"
	) {
		return null;
	}

	return (
		<div className="navbar">
			<div className="navbar-content">
				{/* Logo/Brand Section */}
				<div className="navbar-brand" onClick={() => history.push("/")}>
					<div className="brand-logo">
						<img src={logo} alt="SocialHub Logo" className="logo-image" />
					</div>
					<span className="brand-name">JP_DICT</span>
				</div>

				<div className="navbar-shortcuts">
					<button
						type="button"
						className="navbar-shortcut"
						onClick={() => history.push("/")}
					>
						<BookOpen size={16} />
						<span>Dictionary</span>
					</button>
					<button
						type="button"
						className="navbar-shortcut"
						onClick={() => history.push("/notebook")}
					>
						<NotebookText size={16} />
						<span>Notebook</span>
					</button>
					<button
						type="button"
						className="navbar-shortcut"
						onClick={() => history.push("/reading")}
					>
						<BookText size={16} />
						<span>Reading</span>
					</button>
				</div>

				{/* Search Bar */}
				{/* <form className="navbar-search" onSubmit={handleSearch}>
					<div className="search-container">
						<Search size={18} className="search-icon" />
						<input
							type="text"
							placeholder="Search people, posts..."
							value={searchValue}
							onChange={(e) => setSearchValue(e.target.value)}
							className="search-input"
						/>
					</div>
				</form> */}

				{/* Right Actions */}
				{user && user.isAuthenticated ? (
					<div className="navbar-actions">
						{Boolean(user?.account?.isPremium) === true && (
							<div
								style={{
									display: "flex",
									alignItems: "center",
									background:
										"linear-gradient(135deg, #FFD700 0%, #FFA500 100%)",
									padding: "6px 12px",
									borderRadius: "20px",
									marginRight: "12px",
									boxShadow: "0 2px 8px rgba(255, 215, 0, 0.3)",
								}}
							>
								<Crown size={16} style={{ marginRight: 4, color: "#000" }} />
								<span
									style={{ fontSize: "13px", fontWeight: "700", color: "#000" }}
								>
									Premium
								</span>
							</div>
						)}
						{/* <div className="notification-container">
							<button
								className="navbar-button notification-btn"
								onMouseDown={(e) => e.stopPropagation()}
								onClick={handleNotificationToggle}
							>
								<Bell size={20} />
								{unread > 0 && (
									<span className="notification-badge">{unread}</span>
								)}
							</button>

							{showNotifications && (
								<Notification
									isOpen={showNotifications}
									onClose={() => setShowNotifications(false)}
								/>
							)}
						</div> */}

						<div className="user-menu-container">
							<button
								className="user-avatar-btn"
								onClick={handleUserMenuToggle}
							>
								<div className="navbar-avatar">
									{user?.account?.profilePicture ? (
										<img
											src={user.account.profilePicture}
											alt="avatar"
											style={{
												width: "100%",
												height: "100%",
												borderRadius: "50%",
												objectFit: "cover",
											}}
										/>
									) : (
										<span>
											{user?.account?.fullName?.charAt(0)?.toUpperCase() || "U"}
										</span>
									)}
								</div>
								<span className="user-menu-name">
									{user?.account?.fullName?.split(" ").pop()}
									{Boolean(user?.account?.isPremium) === true && (
										<Crown
											size={14}
											style={{
												marginLeft: 4,
												color: "#FFD700",
												display: "inline",
											}}
										/>
									)}
								</span>
								<ChevronDown size={16} className="user-menu-icon" />
							</button>

							{showUserMenu && (
								<div className="user-dropdown">
									<div className="user-info">
										<div className="user-avatar-large">
											{user?.account?.profilePicture ? (
												<img
													src={user.account.profilePicture}
													alt="avatar"
													style={{
														width: "100%",
														height: "100%",
														borderRadius: "50%",
														objectFit: "cover",
													}}
												/>
											) : (
												<span>
													{user?.account?.fullName?.charAt(0)?.toUpperCase() ||
														"U"}
												</span>
											)}
										</div>
										<div className="user-details">
											<p className="user-name">
												{user?.account?.fullName}
												{Boolean(user?.account?.isPremium) === true && (
													<Crown
														size={16}
														style={{
															marginLeft: 6,
															color: "#FFD700",
															display: "inline",
															verticalAlign: "middle",
														}}
													/>
												)}
											</p>
											<p className="user-email">{user?.account?.email}</p>
											{Boolean(user?.account?.isPremium) === true && (
												<div
													style={{
														display: "inline-block",
														background:
															"linear-gradient(135deg, #FFD700 0%, #FFA500 100%)",
														padding: "4px 10px",
														borderRadius: "12px",
														marginTop: "6px",
														fontSize: "11px",
														fontWeight: "700",
														color: "#000",
													}}
												>
													<Crown
														size={12}
														style={{
															marginRight: 4,
															display: "inline",
															verticalAlign: "middle",
														}}
													/>
													PREMIUM MEMBER
												</div>
											)}
										</div>
									</div>
									<div className="dropdown-divider"></div>
									<a
										href={`/profile/${user.account.id}`}
										className="dropdown-item-1"
									>
										<Settings size={16} />
										<span>Profile</span>
									</a>
									<div
										onClick={handleLogout}
										className="dropdown-item-1 logout"
										style={{ cursor: "pointer" }}
									>
										<LogOut size={16} />
										<span>Logout</span>
									</div>
								</div>
							)}
						</div>
					</div>
				) : (
					<div
						onClick={() => {
							history.push("/login");
						}}
						className="navbar-button login-btn"
					>
						<LogIn size={18} />
						<span>Login</span>
					</div>
				)}
			</div>
		</div>
	);
};

export default Navbar;
