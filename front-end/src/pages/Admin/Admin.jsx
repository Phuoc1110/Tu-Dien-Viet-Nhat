import React, { useState, useEffect } from "react";
import {
	Users,
	FileText,
	TrendingUp,
	AlertCircle,
	Search,
	Trash2,
	Ban,
	CheckCircle,
	LogOut,
} from "lucide-react";
import "./Admin.css";
import {
	getAllUsers,
	suspendUser,
	activateUser,
	deleteUser,
	getAllPosts,
	blockPost,
	unblockPost,
	deletePost,
	getStatistics,
	LogOutAdmin,
} from "../../services/adminService";
import { toast } from "react-toastify";
import { useHistory } from "react-router-dom/cjs/react-router-dom.min";
import { useContext } from "react";
import { UserContext } from "../../Context/UserProvider";

const Admin = () => {
	const [activeTab, setActiveTab] = useState("users");
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState("all");
	const [selectedUserId, setSelectedUserId] = useState(null);
	const [users, setUsers] = useState([]);
	const [posts, setPosts] = useState([]);
	const [stats, setStats] = useState({
		totalUsers: 0,
		activeUsers: 0,
		totalPosts: 0,
		pendingPosts: 0,
	});
	const [loading, setLoading] = useState(false);
	const [currentUserPage, setCurrentUserPage] = useState(1);
	const [currentPostPage, setCurrentPostPage] = useState(1);
	const usersPerPage = 5;
	const postsPerPage = 9;
	const history = useHistory();
	const { logoutContext } = useContext(UserContext);

	// Fetch data on component mount
	useEffect(() => {
		fetchAllData();
	}, []);

	const fetchAllData = async () => {
		setLoading(true);
		try {
			await Promise.all([fetchUsers(), fetchPosts(), fetchStatistics()]);
		} catch (error) {
			console.error("Error loading data:", error);
			toast.error("Error loading data");
		} finally {
			setLoading(false);
		}
	};

	const fetchUsers = async () => {
		try {
			const response = await getAllUsers();
			if (response && response.errCode === 0) {
				setUsers(response.data || []);
			} else {
				console.error("Error fetching users:", response?.errMessage);
				toast.error(response?.errMessage || "Failed to fetch users");
			}
		} catch (error) {
			console.error("Error fetching users:", error);
			toast.error("Error fetching users");
		}
	};

	const fetchPosts = async () => {
		try {
			const response = await getAllPosts();
			if (response && response.errCode === 0) {
				setPosts(response.data || []);
			} else {
				console.error("Error fetching posts:", response?.errMessage);
				toast.error(response?.errMessage || "Failed to fetch posts");
			}
		} catch (error) {
			console.error("Error fetching posts:", error);
			toast.error("Error fetching posts");
		}
	};

	const fetchStatistics = async () => {
		try {
			const response = await getStatistics();
			if (response && response.errCode === 0) {
				setStats(
					response.data || {
						totalUsers: 0,
						activeUsers: 0,
						totalPosts: 0,
						pendingPosts: 0,
					}
				);
			} else {
				console.error("Error fetching statistics:", response?.errMessage);
			}
		} catch (error) {
			console.error("Error fetching statistics:", error);
		}
	};

	// User actions
	const handleSuspendUser = async (userId) => {
		try {
			const response = await suspendUser(userId);
			if (response && response.errCode === 0) {
				toast.success("User suspended successfully");
				await fetchUsers();
				await fetchStatistics();
			} else {
				toast.error(response?.errMessage || "Failed to suspend user");
			}
		} catch (error) {
			console.error("Error suspending user:", error);
			toast.error("Error suspending user");
		}
	};

	const handleActivateUser = async (userId) => {
		try {
			const response = await activateUser(userId);
			if (response && response.errCode === 0) {
				toast.success("User activated successfully");
				await fetchUsers();
				await fetchStatistics();
			} else {
				toast.error(response?.errMessage || "Failed to activate user");
			}
		} catch (error) {
			console.error("Error activating user:", error);
			toast.error("Error activating user");
		}
	};

	const handleDeleteUser = async (userId) => {
		if (window.confirm("Are you sure you want to delete this user?")) {
			try {
				const response = await deleteUser(userId);
				if (response && response.errCode === 0) {
					toast.success("User deleted successfully");
					await fetchUsers();
					await fetchStatistics();
				} else {
					toast.error(response?.errMessage || "Failed to delete user");
				}
			} catch (error) {
				console.error("Error deleting user:", error);
				toast.error("Error deleting user");
			}
		}
	};

	// Post actions
	const handleToggleBlockPost = async (postId, isDeleted) => {
		try {
			// Nếu đang deleted (blocked) → gọi unblock, ngược lại → gọi block
			const response = isDeleted
				? await unblockPost(postId)
				: await blockPost(postId);

			if (response && response.errCode === 0) {
				toast.success(
					`Post ${isDeleted ? "unblocked" : "blocked"} successfully`
				);
				await fetchPosts();
				await fetchStatistics();
			} else {
				toast.error(
					response?.errMessage ||
						`Failed to ${isDeleted ? "unblock" : "block"} post`
				);
			}
		} catch (error) {
			console.error("Error updating post:", error);
			toast.error("Error updating post");
		}
	};

	const handleLogout = async () => {
		let data = await LogOutAdmin();
		logoutContext();
		if (data && data.errCode === 0) {
			history.push("/");
			toast.success("Log out success");
		} else {
			toast.error(data.errMessage);
		}
	};

	const handleDeletePost = async (postId) => {
		if (window.confirm("Are you sure you want to delete this post?")) {
			try {
				const response = await deletePost(postId);
				if (response && response.errCode === 0) {
					toast.success("Post deleted successfully");
					await fetchPosts();
					await fetchStatistics();
				} else {
					toast.error(response?.errMessage || "Failed to delete post");
				}
			} catch (error) {
				console.error("Error deleting post:", error);
				toast.error("Error deleting post");
			}
		}
	};

	// View user's posts
	const handleViewUserPosts = (userId) => {
		setSelectedUserId(userId);
		setActiveTab("posts");
		setSearchQuery("");
		setCurrentPostPage(1);
	};

	// Clear selected user filter
	const handleClearUserFilter = () => {
		setSelectedUserId(null);
		setCurrentPostPage(1);
	};

	// Filter data based on search
	const filteredUsers = users.filter((user) => {
		const matchesSearch =
			user.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
			user.email?.toLowerCase().includes(searchQuery.toLowerCase());

		const matchesStatus =
			statusFilter === "all" || user.status === statusFilter;

		return matchesSearch && matchesStatus;
	});

	const filteredPosts = posts.filter((post) => {
		const matchesUser = selectedUserId ? post.userId === selectedUserId : true;

		const matchesSearch =
			post.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
			post.content?.toLowerCase().includes(searchQuery.toLowerCase());

		return matchesUser && matchesSearch;
	});

	const selectedUser = selectedUserId
		? users.find((u) => u.id === selectedUserId)
		: null;

	// Pagination logic for users
	const indexOfLastUser = currentUserPage * usersPerPage;
	const indexOfFirstUser = indexOfLastUser - usersPerPage;
	const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
	const totalUserPages = Math.ceil(filteredUsers.length / usersPerPage);

	// Pagination logic for posts
	const indexOfLastPost = currentPostPage * postsPerPage;
	const indexOfFirstPost = indexOfLastPost - postsPerPage;
	const currentPosts = filteredPosts.slice(indexOfFirstPost, indexOfLastPost);
	const totalPostPages = Math.ceil(filteredPosts.length / postsPerPage);

	// Pagination handlers
	const handleUserPageChange = (pageNumber) => {
		setCurrentUserPage(pageNumber);
	};

	const handlePostPageChange = (pageNumber) => {
		setCurrentPostPage(pageNumber);
	};

	// Reset to page 1 when search or filter changes
	useEffect(() => {
		setCurrentUserPage(1);
	}, [searchQuery, statusFilter]);

	useEffect(() => {
		setCurrentPostPage(1);
	}, [searchQuery, selectedUserId]);

	if (loading) {
		return (
			<div className="admin-dashboard">
				<div className="loading-container">
					<div className="spinner"></div>
					<p>Loading...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="admin-dashboard">
			<div className="admin-header">
				<div>
					<h1>Admin Dashboard</h1>
					<p>Manage users and posts</p>
				</div>
				<button className="logout-btn" onClick={() => handleLogout()}>
					<LogOut size={20} />
					Logout
				</button>
			</div>

			{/* Statistics Cards */}
			<div className="stats-grid">
				<div className="stat-card">
					<div className="stat-icon users">
						<Users size={24} />
					</div>
					<div className="stat-info">
						<h3>{stats.totalUsers}</h3>
						<p>Total Users</p>
					</div>
				</div>

				<div className="stat-card">
					<div className="stat-icon active">
						<TrendingUp size={24} />
					</div>
					<div className="stat-info">
						<h3>{stats.activeUsers}</h3>
						<p>Active Users</p>
					</div>
				</div>

				<div className="stat-card">
					<div className="stat-icon posts">
						<FileText size={24} />
					</div>
					<div className="stat-info">
						<h3>{stats.totalPosts}</h3>
						<p>Total Posts</p>
					</div>
				</div>

				<div className="stat-card">
					<div className="stat-icon pending">
						<AlertCircle size={24} />
					</div>
					<div className="stat-info">
						<h3>{stats.pendingPosts}</h3>
						<p>Blocked Posts</p>
					</div>
				</div>
			</div>

			{/* Tabs */}
			<div className="admin-tabs">
				<button
					className={`tab-btn ${activeTab === "users" ? "active" : ""}`}
					onClick={() => {
						setActiveTab("users");
						handleClearUserFilter();
						setSearchQuery("");
						setCurrentUserPage(1);
					}}
				>
					<Users size={18} />
					Users Management
				</button>
				<button
					className={`tab-btn ${activeTab === "posts" ? "active" : ""}`}
					onClick={() => {
						setActiveTab("posts");
						setSearchQuery("");
						setCurrentPostPage(1);
					}}
				>
					<FileText size={18} />
					Posts Management
				</button>
			</div>

			{/* Search Bar and Filters */}
			<div className="search-section">
				<div className="search-bar">
					<Search size={20} />
					<input
						type="text"
						placeholder={`Search ${activeTab}...`}
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
					/>
				</div>
				{activeTab === "users" && (
					<div className="filter-buttons">
						<button
							className={`filter-btn ${statusFilter === "all" ? "active" : ""}`}
							onClick={() => setStatusFilter("all")}
						>
							All
						</button>
						<button
							className={`filter-btn ${
								statusFilter === "active" ? "active" : ""
							}`}
							onClick={() => setStatusFilter("active")}
						>
							Active
						</button>
						<button
							className={`filter-btn ${
								statusFilter === "suspended" ? "active" : ""
							}`}
							onClick={() => setStatusFilter("suspended")}
						>
							Suspended
						</button>
					</div>
				)}
			</div>

			{/* Content */}
			{activeTab === "users" ? (
				<div className="users-table-container">
					{filteredUsers.length === 0 ? (
						<div className="no-data-message">
							<Users size={48} />
							<p>No users found</p>
						</div>
					) : (
						<table className="admin-table">
							<thead>
								<tr>
									<th>ID</th>
									<th>Name</th>
									<th>Email</th>
									<th>Status</th>
									<th>Bio</th>
									<th>Joined</th>
									<th>View Posts</th>
									<th>Actions</th>
								</tr>
						</thead>
						<tbody>
							{currentUsers.map((user) => (
								<tr key={user.id}>
									<td>{user.id}</td>
									<td>
										<div className="user-info-cell">
											<div className="user-avatar-small">
												{user.fullName?.charAt(0) || "?"}
											</div>
											<span>{user.fullName || "Unknown"}</span>
										</div>
									</td>
										<td>{user.email}</td>
										<td>
											<span className={`status-badge ${user.status}`}>
												{user.status || "unknown"}
											</span>
										</td>
										<td>{user.bio || "N/A"}</td>
										<td>{new Date(user.createdAt).toLocaleDateString()}</td>
										<td>
											<button
												className="action-btn view"
												onClick={() => handleViewUserPosts(user.id)}
												title="View User's Posts"
											>
												<FileText size={16} />
											</button>
										</td>
										<td>
											<div className="action-buttons">
												{user.status === "active" ? (
													<button
														className="action-btn suspend"
														onClick={() => handleSuspendUser(user.id)}
														title="Suspend User"
													>
														<Ban size={16} />
													</button>
												) : (
													<button
														className="action-btn activate"
														onClick={() => handleActivateUser(user.id)}
														title="Activate User"
													>
														<CheckCircle size={16} />
													</button>
												)}
												<button
													className="action-btn delete"
													onClick={() => handleDeleteUser(user.id)}
													title="Delete User"
												>
													<Trash2 size={16} />
												</button>
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					)}
					{filteredUsers.length > 0 && totalUserPages > 1 && (
						<div className="pagination">
							<button
								className="pagination-btn"
								onClick={() => handleUserPageChange(currentUserPage - 1)}
								disabled={currentUserPage === 1}
							>
								← Previous
							</button>
							<div className="pagination-numbers">
								{Array.from({ length: totalUserPages }, (_, i) => i + 1).map(
									(page) => (
										<button
											key={page}
											className={`pagination-number ${
												page === currentUserPage ? "active" : ""
											}`}
											onClick={() => handleUserPageChange(page)}
										>
											{page}
										</button>
									)
								)}
							</div>
							<button
								className="pagination-btn"
								onClick={() => handleUserPageChange(currentUserPage + 1)}
								disabled={currentUserPage === totalUserPages}
							>
								Next →
							</button>
						</div>
					)}
				</div>
			) : (
				<div className="posts-section">
					{selectedUser && (
						<div className="posts-filter-info">
							<div className="filter-user-info">
								<span>
									Showing posts by: <strong>{selectedUser.fullName}</strong>
								</span>
							</div>
							<button
								className="clear-filter-btn"
								onClick={handleClearUserFilter}
							>
								✕ Clear Filter
							</button>
						</div>
					)}
					<div className="posts-grid">
						{filteredPosts.length === 0 ? (
							<div className="no-data-message">
								<FileText size={48} />
								<p>No posts found</p>
							</div>
						) : (
							currentPosts.map((post) => (
								<div key={post.id} className="admin-post-card">
									<div className="post-header">
										<div className="post-user">
											<div className="user-avatar-small">
												{post.userName?.charAt(0) || "?"}
											</div>
											<div>
												<p className="user-name">
													{post.userName || "Unknown User"}
												</p>
												<p className="post-date">
													{new Date(post.createdAt).toLocaleDateString()}
												</p>
											</div>
										</div>
										<span
											className={`status-badge ${
												post.isDeleted ? "blocked" : "active"
											}`}
										>
											{post.isDeleted ? "Blocked" : "Active"}
										</span>
									</div>
									<div className="post-content">
										<p>{post.content}</p>
										{post.imageUrl && post.imageUrl.length > 0 && (
											<div className="post-image">
												<img src={post.imageUrl[0]} alt="Post" />
											</div>
										)}
										{post.videoUrl && (
											<div className="post-video">
												<video
													src={post.videoUrl}
													controls
													style={{ width: "100%", borderRadius: 8 }}
												/>
											</div>
										)}
									</div>

									<div className="post-actions">
										<button
											className={`action-btn ${
												post.isDeleted ? "activate" : "suspend"
											}`}
											onClick={() =>
												handleToggleBlockPost(post.id, post.isDeleted)
											}
										>
											{post.isDeleted ? (
												<>
													<CheckCircle size={16} />
													Unblock
												</>
											) : (
												<>
													<Ban size={16} />
													Block
												</>
											)}
										</button>
										<button
											className="action-btn delete"
											onClick={() => handleDeletePost(post.id)}
										>
											<Trash2 size={16} />
											Delete
										</button>
									</div>
								</div>
							))
						)}
					</div>
					{filteredPosts.length > 0 && totalPostPages > 1 && (
						<div className="pagination">
							<button
								className="pagination-btn"
								onClick={() => handlePostPageChange(currentPostPage - 1)}
								disabled={currentPostPage === 1}
							>
								← Previous
							</button>
							<div className="pagination-numbers">
								{Array.from({ length: totalPostPages }, (_, i) => i + 1).map(
									(page) => (
										<button
											key={page}
											className={`pagination-number ${
												page === currentPostPage ? "active" : ""
											}`}
											onClick={() => handlePostPageChange(page)}
										>
											{page}
										</button>
									)
								)}
							</div>
							<button
								className="pagination-btn"
								onClick={() => handlePostPageChange(currentPostPage + 1)}
								disabled={currentPostPage === totalPostPages}
							>
								Next →
							</button>
						</div>
					)}
				</div>
			)}
		</div>
	);
};

export default Admin;
