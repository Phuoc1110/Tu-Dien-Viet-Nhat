import React, { useState, useEffect, useContext } from "react";
import { UserPlus, Users, FileText, X, UserX, UserCheck } from "lucide-react";
import Post from "../../components/Post/Post";
import "./SearchResult.css";
import {
	search as searchService,
	sendFriendRequest,
	cancelFriendRequest,
	sendAddFriend,
} from "../../services/socialService";
import { UserContext } from "../../Context/UserProvider";
import { toast } from "react-toastify";
import {
	useLocation,
	useHistory,
} from "react-router-dom/cjs/react-router-dom.min";
import { HandleGetLikePost } from "../../services/apiService";
import { io } from "socket.io-client";

const SearchResult = () => {
	const [activeTab, setActiveTab] = useState("posts");
	const { search } = useLocation();
	const history = useHistory();
	const searchParams = new URLSearchParams(search);
	const queryParam = searchParams.get("q") || searchParams.get("query") || "";
	const [socket, setSocket] = useState(null);
	const { user } = useContext(UserContext);

	const [searchQuery, setSearchQuery] = useState(queryParam);
	const [searchResultPosts, setSearchResultPosts] = useState([]);
	const [people, setPeople] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);

	const handleUpdatePost = (updatedPost) => {
		// In-place update posts
		if (socket) {
			socket.emit("updatePost", updatedPost);
		}
		setSearchResultPosts((prev) =>
			prev.map((p) => (p.id === updatedPost.id ? updatedPost : p))
		);
	};

	function formatTimeAgo(dateString) {
		const date = new Date(dateString);
		const now = new Date();
		const diffMs = now - date;

		const diffMinutes = Math.floor(diffMs / (1000 * 60));
		const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
		// const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

		if (diffMinutes < 1) return "Just now";
		if (diffMinutes < 60) return `${diffMinutes}m ago`;
		if (diffHours < 24) return `${diffHours}h ago`;

		return date.toLocaleString("en-US", {
			day: "numeric",
			month: "short",
		});
	}

	const handleDeletePost = (postToDelete) => {
		if (socket) {
			socket.emit("deletePost", postToDelete);
		}
		setSearchResultPosts((prev) =>
			prev.filter((post) => post.id !== postToDelete.id)
		);
	};
	const fetchSearch = async (q) => {
		if (!q) {
			setSearchResultPosts([]);
			setPeople([]);
			return;
		}
		setLoading(true);
		setError(null);
		try {
			const res = await searchService(q, user.account.id);
			if (res && res.errCode === 0) {
				const formattedPosts = await Promise.all(
					res.posts.map(async (post) => ({
						...post,
						images: post.imageUrl,
						videoUrl: post.videoUrl || null,
						likes: await HandleGetLikePost(post.id).then((res) =>
							res && res.errCode === 0 ? res.likes.length : 0
						),
						islikedbyUser: await HandleGetLikePost(post.id).then((res) =>
							res && res.errCode === 0
								? res.likes.some((like) => like.userId === user.account.id)
								: false
						),
						comments: [],
						shares: 0,
						timestamp: post.updatedAt,
					}))
				);
				setSearchResultPosts(formattedPosts || []);
				const normalized = (res.people || []).map((p) => ({
					...p,
					friendshipStatus:
						p.friendshipStatus == null ? "none" : p.friendshipStatus,
				}));
				setPeople(normalized);
			} else {
				setError(res && res.errMessage ? res.errMessage : "Search failed");
			}
		} catch (e) {
			console.error(e);
			setError("Search failed");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		setSearchQuery(queryParam);
		fetchSearch(queryParam);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [queryParam]);

	useEffect(() => {
		if (!user || !user.token) {
			return;
		}

		const newSocket = io(`${process.env.REACT_APP_API_URL}`, {
			extraHeaders: {
				Authorization: `Bearer ${user.token}`,
			},
		});

		newSocket.on("connect", () => {});

		newSocket.on("postUpdated", (updatedPost) => {
			setSearchResultPosts((prev) =>
				prev.map((p) => (p.id === updatedPost.id ? updatedPost : p))
			);
		});

		newSocket.on("postDeleted", (postToDelete) => {
			setSearchResultPosts((prev) =>
				prev.filter((p) => p.id !== postToDelete.id)
			);
		});

		newSocket.on("friendRequestReceived", ({ toUserId, friendshipStatus }) => {
			if (toUserId === user.account.id) return;
			setPeople((prev) =>
				prev.map((p) => (p.id === toUserId ? { ...p, friendshipStatus } : p))
			);
		});

		newSocket.on("connect_error", (err) => {
			console.error("Connection error:", err.message);
		});

		newSocket.on("disconnect", (reason) => {
			console.warn("WebSocket disconnected:", reason);
		});

		setSocket(newSocket);

		return () => {
			newSocket.disconnect();
		};
	}, [user]);

	const renderPosts = () => {
		if (searchResultPosts.length === 0) {
			return (
				<div className="no-results">
					<FileText size={48} className="no-results-icon" />
					<h3>No posts found</h3>
					<p>Try searching for different keywords.</p>
				</div>
			);
		}

		return (
			<div className="search-posts">
				{searchResultPosts.map((post) => (
					<Post
						key={post.id}
						post={{ ...post, formatTimeAgo }}
						onUpdatePost={handleUpdatePost}
						onDeletePost={handleDeletePost}
					/>
				))}
			</div>
		);
	};
	const handleCancelFriendRequest = async (personId) => {
		const res = await cancelFriendRequest(user.account.id, personId);
		if (res && res.errCode === 0) {
			toast.success("Friend request canceled");
			socket.emit("sendFriendRequest", {
				toUserId: user.account.id,
				friendshipStatus: "none",
			});
			setPeople((prev) =>
				prev.map((p) =>
					p.id === personId ? { ...p, friendshipStatus: "none" } : p
				)
			);
		} else {
			toast.error(
				res && res.errMessage ? res.errMessage : "Failed to cancel request"
			);
		}
	};
	const HandleFriendRequest = async (personId, status) => {
		const res = await sendFriendRequest(user.account.id, personId, status);
		if (res && res.errCode === 0) {
			toast.success("Friend request updated");
			const newStatus =
				status === "accepted" ? "friends" : status === "reject" ? "none" : "";
			socket.emit("sendFriendRequest", {
				data: user.account,
				toUserId: user.account.id,
				friendshipStatus: newStatus,
			});
			setPeople((prev) =>
				prev.map((p) =>
					p.id === personId ? { ...p, friendshipStatus: newStatus } : p
				)
			);
		} else {
			toast.error(
				res && res.errMessage ? res.errMessage : "Failed to update request"
			);
		}
	};
	const handleAddFriend = async (personId) => {
		if (!user || !user.isAuthenticated) {
			toast.error("Please log in to add friends");
			return;
		}
		const res = await sendAddFriend(user.account.id, personId);
		if (res && res.errCode === 0) {
			toast.success("Friend request sent");
			socket.emit("sendFriendRequest", {
				data: user.account,
				toUserId: user.account.id,
				friendshipStatus: "they_sent_request",
			});
			setPeople((prev) =>
				prev.map((p) =>
					p.id === personId ? { ...p, friendshipStatus: "you_sent_request" } : p
				)
			);
		} else {
			toast.error(
				res && res.errMessage ? res.errMessage : "Failed to send request"
			);
			setPeople((prev) =>
				prev.map((p) =>
					p.id === personId ? { ...p, friendshipStatus: "none" } : p
				)
			);
		}
	};

	const renderPeople = () => {
		if (people.length === 0) {
			return (
				<div className="no-results">
					<Users size={48} className="no-results-icon" />
					<h3>No people found</h3>
					<p>Try searching for different names or usernames.</p>
				</div>
			);
		}

		return (
			<div className="search-people">
				{people.map((person) => (
					<div key={person.id} className="person-card">
						<div
							className="person-info"
							style={{ cursor: "pointer" }}
							onClick={() => history.push(`/profile/${person.id}`)}
						>
							<div
								className="person-avatar"
								style={{
									backgroundImage: person.profilePicture
										? `url(${person.profilePicture})`
										: "none",
									backgroundSize: "cover",
									backgroundPosition: "center",
								}}
							>
								{!person.profilePicture && (
									<span className="avatar-placeholder">
										{person.fullName.charAt(0)}
									</span>
								)}
							</div>
							<div className="person-details">
								<h3 className="person-name">{person.fullName}</h3>
								{person.bio && <p className="person-bio">{person.bio}</p>}
							</div>
						</div>
						{/* Button logic based on friendshipStatus */}
						{person.friendshipStatus === "none" &&
							user.account.id !== person.id && (
								<button
									className="add-friend-btn primary"
									style={{
										display: "flex",
										alignItems: "center",
										borderRadius: "8px",
										padding: "10px 20px",
										fontWeight: "600",
										background:
											"linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
										color: "#fff",
										border: "none",
										cursor: "pointer",
										marginTop: "8px",
										fontSize: "14px",
										transition: "all 0.3s ease",
										boxShadow: "0 2px 8px rgba(102, 126, 234, 0.3)",
									}}
									onClick={(e) => {
										e.stopPropagation();
										handleAddFriend(person.id);
									}}
									onMouseEnter={(e) => {
										e.target.style.transform = "translateY(-2px)";
										e.target.style.boxShadow =
											"0 4px 12px rgba(102, 126, 234, 0.4)";
									}}
									onMouseLeave={(e) => {
										e.target.style.transform = "translateY(0)";
										e.target.style.boxShadow =
											"0 2px 8px rgba(102, 126, 234, 0.3)";
									}}
								>
									<UserPlus size={16} style={{ marginRight: "8px" }} />
									Add Friend
								</button>
							)}
						{person.friendshipStatus === "you_sent_request" && (
							<button
								className="cancel-friend-btn danger"
								style={{
									display: "flex",
									alignItems: "center",
									borderRadius: "8px",
									padding: "10px 20px",
									fontWeight: "600",
									background:
										"linear-gradient(135deg, #f44336 0%, #d32f2f 100%)",
									color: "#fff",
									border: "none",
									cursor: "pointer",
									marginTop: "8px",
									fontSize: "14px",
									transition: "all 0.3s ease",
									boxShadow: "0 2px 8px rgba(244, 67, 54, 0.3)",
								}}
								onClick={(e) => {
									e.stopPropagation();
									handleCancelFriendRequest(person.id);
								}}
								onMouseEnter={(e) => {
									e.target.style.transform = "translateY(-2px)";
									e.target.style.boxShadow =
										"0 4px 12px rgba(244, 67, 54, 0.4)";
								}}
								onMouseLeave={(e) => {
									e.target.style.transform = "translateY(0)";
									e.target.style.boxShadow = "0 2px 8px rgba(244, 67, 54, 0.3)";
								}}
							>
								<X size={16} style={{ marginRight: "6px" }} />
								Cancel Request
							</button>
						)}
						{person.friendshipStatus === "they_sent_request" && (
							<div
								className="pending-actions"
								style={{ display: "flex", gap: "12px", marginTop: "8px" }}
							>
								<button
									className="accept-friend-btn primary"
									style={{
										display: "flex",
										alignItems: "center",
										borderRadius: "8px",
										padding: "10px 18px",
										fontWeight: "600",
										background:
											"linear-gradient(135deg, #4CAF50 0%, #45a049 100%)",
										color: "#fff",
										border: "none",
										cursor: "pointer",
										fontSize: "14px",
										transition: "all 0.3s ease",
										boxShadow: "0 2px 8px rgba(76, 175, 80, 0.3)",
									}}
									onClick={(e) => {
										e.stopPropagation();
										HandleFriendRequest(person.id, "accepted");
									}}
									onMouseEnter={(e) => {
										e.target.style.transform = "translateY(-2px)";
										e.target.style.boxShadow =
											"0 4px 12px rgba(76, 175, 80, 0.4)";
									}}
									onMouseLeave={(e) => {
										e.target.style.transform = "translateY(0)";
										e.target.style.boxShadow =
											"0 2px 8px rgba(76, 175, 80, 0.3)";
									}}
								>
									<UserCheck size={16} style={{ marginRight: "6px" }} />
									Accept
								</button>
								<button
									className="decline-friend-btn secondary"
									style={{
										display: "flex",
										alignItems: "center",
										borderRadius: "8px",
										padding: "10px 18px",
										fontWeight: "600",
										background:
											"linear-gradient(135deg, #f44336 0%, #d32f2f 100%)",
										color: "#fff",
										border: "none",
										cursor: "pointer",
										fontSize: "14px",
										transition: "all 0.3s ease",
										boxShadow: "0 2px 8px rgba(244, 67, 54, 0.3)",
									}}
									onClick={(e) => {
										e.stopPropagation();
										HandleFriendRequest(person.id, "reject");
									}}
									onMouseEnter={(e) => {
										e.target.style.transform = "translateY(-2px)";
										e.target.style.boxShadow =
											"0 4px 12px rgba(244, 67, 54, 0.4)";
									}}
									onMouseLeave={(e) => {
										e.target.style.transform = "translateY(0)";
										e.target.style.boxShadow =
											"0 2px 8px rgba(244, 67, 54, 0.3)";
									}}
								>
									<UserX size={16} style={{ marginRight: "6px" }} />
									Decline
								</button>
							</div>
						)}
						{person.friendshipStatus === "friends" && (
							<div
								className="friends-actions"
								style={{ display: "flex", gap: "12px", marginTop: "8px" }}
							>
								<button
									className="unfriend-btn danger"
									style={{
										display: "flex",
										alignItems: "center",
										borderRadius: "8px",
										padding: "10px 18px",
										fontWeight: "600",
										background:
											"linear-gradient(135deg, #ff9800 0%, #f57c00 100%)",
										color: "#fff",
										border: "none",
										cursor: "pointer",
										fontSize: "14px",
										transition: "all 0.3s ease",
										boxShadow: "0 2px 8px rgba(255, 152, 0, 0.3)",
									}}
									onClick={(e) => {
										e.stopPropagation();
										handleCancelFriendRequest(person.id);
									}}
									onMouseEnter={(e) => {
										e.target.style.transform = "translateY(-2px)";
										e.target.style.boxShadow =
											"0 4px 12px rgba(255, 152, 0, 0.4)";
									}}
									onMouseLeave={(e) => {
										e.target.style.transform = "translateY(0)";
										e.target.style.boxShadow =
											"0 2px 8px rgba(255, 152, 0, 0.3)";
									}}
								>
									<UserX size={16} style={{ marginRight: "6px" }} />
									Unfriend
								</button>
							</div>
						)}
						{/* Show profile button if current user is this person */}
						{user && user.account && user.account.id === person.id && (
							<button
								className="profile-btn"
								style={{
									display: "flex",
									alignItems: "center",
									borderRadius: "8px",
									padding: "10px 20px",
									fontWeight: "600",
									background:
										"linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)",
									color: "#fff",
									border: "none",
									cursor: "pointer",
									marginTop: "8px",
									fontSize: "14px",
									transition: "all 0.3s ease",
									boxShadow: "0 2px 8px rgba(255, 107, 107, 0.3)",
								}}
								onClick={() => (window.location.href = `/profile/${person.id}`)}
								onMouseEnter={(e) => {
									e.target.style.transform = "translateY(-2px)";
									e.target.style.boxShadow =
										"0 4px 12px rgba(255, 107, 107, 0.4)";
								}}
								onMouseLeave={(e) => {
									e.target.style.transform = "translateY(0)";
									e.target.style.boxShadow =
										"0 2px 8px rgba(255, 107, 107, 0.3)";
								}}
							>
								View Profile
							</button>
						)}
					</div>
				))}
			</div>
		);
	};

	// Poll friend statuses every 8s to detect acceptance
	// useEffect(() => {
	// 	let interval;
	// 	const startPolling = async () => {
	// 		if (people.length === 0) return;
	// 		const ids = people.map((p) => p.id);
	// 		const res = await getFriendStatuses(ids);
	// 		if (res && res.errCode === 0 && res.statuses) {
	// 			setPeople((prev) =>
	// 				prev.map((p) => ({
	// 					...p,
	// 					status: res.statuses[p.id] || p.status || "none",
	// 				}))
	// 			);
	// 		}
	// 	};
	// 	interval = setInterval(startPolling, 8000);
	// 	// run once immediately
	// 	startPolling();
	// 	return () => clearInterval(interval);
	// 	// stringify ids so effect updates when the list changes
	// }, [JSON.stringify(people.map((p) => p.id))]);

	return (
		<div className="search-result-container">
			{/* Search Header */}
			<div className="search-header">
				<h1 className="search-title">Search Results</h1>
				<p className="search-query">
					Showing results for "<span className="query-text">{searchQuery}</span>
					"
				</p>
			</div>

			{/* Search Tabs */}
			<div className="search-tabs">
				<button
					className={`tab-button ${activeTab === "posts" ? "active" : ""}`}
					style={{
						display: "flex",
						alignItems: "center",
						gap: "8px",
						padding: "12px 24px",
						border: "none",
						borderRadius: "8px",
						fontWeight: "600",
						fontSize: "14px",
						cursor: "pointer",
						transition: "all 0.3s ease",
						background:
							activeTab === "posts"
								? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
								: "#f8f9fa",
						color: activeTab === "posts" ? "#fff" : "#6c757d",
						boxShadow:
							activeTab === "posts"
								? "0 4px 12px rgba(102, 126, 234, 0.3)"
								: "0 2px 4px rgba(0,0,0,0.1)",
						marginRight: "12px",
					}}
					onClick={() => setActiveTab("posts")}
					onMouseEnter={(e) => {
						if (activeTab !== "posts") {
							e.target.style.background = "#e9ecef";
						}
					}}
					onMouseLeave={(e) => {
						if (activeTab !== "posts") {
							e.target.style.background = "#f8f9fa";
						}
					}}
				>
					<FileText size={18} />
					Posts ({searchResultPosts.length})
				</button>
				<button
					className={`tab-button ${activeTab === "people" ? "active" : ""}`}
					style={{
						display: "flex",
						alignItems: "center",
						gap: "8px",
						padding: "12px 24px",
						border: "none",
						borderRadius: "8px",
						fontWeight: "600",
						fontSize: "14px",
						cursor: "pointer",
						transition: "all 0.3s ease",
						background:
							activeTab === "people"
								? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
								: "#f8f9fa",
						color: activeTab === "people" ? "#fff" : "#6c757d",
						boxShadow:
							activeTab === "people"
								? "0 4px 12px rgba(102, 126, 234, 0.3)"
								: "0 2px 4px rgba(0,0,0,0.1)",
					}}
					onClick={() => setActiveTab("people")}
					onMouseEnter={(e) => {
						if (activeTab !== "people") {
							e.target.style.background = "#e9ecef";
						}
					}}
					onMouseLeave={(e) => {
						if (activeTab !== "people") {
							e.target.style.background = "#f8f9fa";
						}
					}}
				>
					<Users size={18} />
					People ({people.length})
				</button>
			</div>

			{/* Tab Content */}
			<div className="search-content">
				{loading && <div className="loading">Loading...</div>}
				{error && <div className="error">{error}</div>}
				{activeTab === "posts" ? renderPosts() : renderPeople()}
			</div>
		</div>
	);
};

export default SearchResult;
