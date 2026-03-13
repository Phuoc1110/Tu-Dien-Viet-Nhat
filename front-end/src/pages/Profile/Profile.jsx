import React, { useContext, useEffect, useState } from "react";
import {
	Calendar,
	X,
	MessageSquare,
	UserX,
	AlertCircle,
	Home,
	UserPlus,
	UserCheck,
} from "lucide-react";
import Post from "../../components/Post/Post";
import "./Profile.css";
import { UserContext } from "../../Context/UserProvider";
import { useParams, useHistory } from "react-router-dom";
import {
	GetAllPost,
	HandleGetLikePost,
	GetLikedPostsByUserId,
} from "../../services/apiService";
import { GetAllUser, UpdateProfileService } from "../../services/userService";
import {
	search as searchService,
	sendFriendRequest,
	cancelFriendRequest,
	sendAddFriend,
} from "../../services/socialService";
import { toast } from "react-toastify";
import { io } from "socket.io-client";

const Profile = () => {
	const [activeTab, setActiveTab] = useState("posts");
	const [isEditModalOpen, setIsEditModalOpen] = useState(false);
	const [socket, setSocket] = useState(null);
	const { user } = useContext(UserContext);
	const { id } = useParams();
	const history = useHistory();
	const [friendshipStatus, setFriendshipStatus] = useState("none");
	const [profileData, setProfileData] = useState({
		fullName: "",
		username: "",
		bio: "",
		joinDate: "",
		posts: 0,
		profilePicture: null,
	});

	const [editForm, setEditForm] = useState({
		fullName: "",
		bio: "",
		profilePicture: null,
		fileImage: null,
	});

	const [avatarPreview, setAvatarPreview] = useState(null);
	const [userPosts, setUserPosts] = useState([]);
	const [likedPosts, setLikedPosts] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const [isSaving, setIsSaving] = useState(false);

	const formatTimeAgo = (dateString) => {
		const date = new Date(dateString);
		const now = new Date();
		const diffMs = now - date;
		const diffMinutes = Math.floor(diffMs / (1000 * 60));
		const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
		if (diffMinutes < 1) return "Just now";
		if (diffMinutes < 60) return `${diffMinutes}m ago`;
		if (diffHours < 24) return `${diffHours}h ago`;
		return date.toLocaleString("en-US", { day: "numeric", month: "short" });
	};

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
			setUserPosts((prev) =>
				prev.map((p) => (p.id === updatedPost.id ? updatedPost : p))
			);
		});

		newSocket.on("postDeleted", (postToDelete) => {
			setUserPosts((prev) => prev.filter((p) => p.id !== postToDelete.id));
		});

		newSocket.on("connect_error", (err) => {
			console.error("Connection error:", err.message);
		});

		newSocket.on("disconnect", (reason) => {});

		setSocket(newSocket);

		return () => {
			newSocket.disconnect();
		};
	}, [user]);

	useEffect(() => {
		const fetchLikedPosts = async () => {
			if (activeTab === "likes" && id) {
				try {
					const res = await GetLikedPostsByUserId(id);
					if (res && res.errCode === 0) {
						const formattedPosts = await Promise.all(
							res.posts.map(async (post) => {
								const likeRes = await HandleGetLikePost(post.id);
								const likesCount =
									likeRes && likeRes.errCode === 0 ? likeRes.likes.length : 0;
								const isLiked =
									likeRes && likeRes.errCode === 0
										? likeRes.likes.some((l) => l.userId === user?.account?.id)
										: false;
								return {
									id: post.id,
									User: {
										id: post.User.id,
										fullName: post.User.fullName,
										username:
											post.User.username ||
											(post.User.email
												? `@${post.User.email.split("@")[0]}`
												: ""),
										profilePicture: post.User.profilePicture || null,
									},
									content: post.content,
									images: post.imageUrl,
									likes: likesCount,
									islikedbyUser: isLiked,
									comments: [],
									shares: 0,
									timestamp: post.updatedAt || post.createdAt,
									formatTimeAgo,
								};
							})
						);
						setLikedPosts(formattedPosts);
					}
				} catch (e) {
					console.error("Error fetching liked posts", e);
				}
			}
		};
		fetchLikedPosts();
	}, [activeTab, id, user?.account?.id]);

	useEffect(() => {
		const fetchProfile = async () => {
			if (!id) {
				setError("User ID is required");
				return;
			}
			setLoading(true);
			setError(null);
			try {
				// Always fetch user data directly from user API to get the latest profile info
				const userRes = await GetAllUser(id);
				if (userRes && userRes.errCode === 0 && userRes.user) {
					const u = userRes.user;
					const joinDate = u.createdAt
						? new Date(u.createdAt).toLocaleString("en-US", {
								month: "long",
								year: "numeric",
						  })
						: "";
					const mappedProfile = {
						id: u.id,
						fullName: u.fullName || "",
						username:
							u.username || (u.email ? `@${u.email.split("@")[0]}` : ""),
						bio: u.bio || "",
						joinDate,
						posts: 0, // Will be updated when we fetch posts
						profilePicture: u.profilePicture || u.avatar || null,
					};
					setProfileData(mappedProfile);
					setEditForm({
						id: mappedProfile.id,
						fullName: mappedProfile.fullName,
						bio: mappedProfile.bio,
						profilePicture: mappedProfile.profilePicture,
					});

					// Fetch friendship status if viewing another user's profile
					if (user?.account?.id && u.id !== user.account.id) {
						try {
							const searchRes = await searchService(
								u.fullName,
								user.account.id
							);
							if (searchRes && searchRes.errCode === 0 && searchRes.people) {
								const person = searchRes.people.find((p) => p.id === u.id);
								if (person) {
									setFriendshipStatus(person.friendshipStatus || "none");
								}
							}
						} catch (err) {
							console.error("Failed to fetch friendship status", err);
						}
					}

					// Now fetch posts separately
					const res = await GetAllPost(id);
					if (res && res.errCode === 0) {
						const hasPosts = Array.isArray(res.post) && res.post.length > 0;
						if (hasPosts) {
							// Update posts count
							setProfileData((prev) => ({
								...prev,
								posts: res.post.length,
							}));

							const formattedPosts = await Promise.all(
								res.post.map(async (post) => {
									const likeRes = await HandleGetLikePost(post.id);
									const likesCount =
										likeRes && likeRes.errCode === 0 ? likeRes.likes.length : 0;
									const isLiked =
										likeRes && likeRes.errCode === 0
											? likeRes.likes.some(
													(l) => l.userId === user?.account?.id
											  )
											: false;
									return {
										id: post.id,
										User: {
											id: u.id,
											fullName: mappedProfile.fullName,
											username: mappedProfile.username,
											profilePicture: mappedProfile.profilePicture || null,
										},
										content: post.content,
										images: post.imageUrl,
										videoUrl: post.videoUrl || null,
										likes: likesCount,
										islikedbyUser: isLiked,
										comments: [],
										shares: 0,
										timestamp: post.updatedAt || post.createdAt,
										formatTimeAgo,
									};
								})
							);
							setUserPosts(formattedPosts);
						} else {
							setUserPosts([]);
						}
					} else {
						setUserPosts([]);
					}
				} else {
					setError(
						"User not found. This user might not exist or has been deleted."
					);
				}
			} catch (e) {
				console.error("Profile fetch error:", e);
				setError("Network error. Please check your connection and try again.");
			} finally {
				setLoading(false);
			}
		};
		fetchProfile();
	}, [id, user?.account?.id]);

	const handleAddFriend = async () => {
		if (!user || !user.isAuthenticated) {
			toast.error("Please log in to add friends");
			return;
		}
		const res = await sendAddFriend(user.account.id, id);
		if (res && res.errCode === 0) {
			toast.success("Friend request sent");
			if (socket) {
				socket.emit("sendFriendRequest", {
					data: user.account,
					toUserId: id,
					friendshipStatus: "they_sent_request",
				});
			}
			setFriendshipStatus("you_sent_request");
		} else {
			toast.error(res?.errMessage || "Failed to send request");
		}
	};

	const handleCancelFriendRequest = async () => {
		const res = await cancelFriendRequest(user.account.id, id);
		if (res && res.errCode === 0) {
			toast.success(
				friendshipStatus === "friends" ? "Unfriended" : "Request canceled"
			);
			if (socket) {
				socket.emit("sendFriendRequest", {
					toUserId: id,
					friendshipStatus: "none",
				});
			}
			setFriendshipStatus("none");
		} else {
			toast.error(res?.errMessage || "Failed to cancel request");
		}
	};

	const handleRespondFriendRequest = async (status) => {
		const res = await sendFriendRequest(user.account.id, id, status);
		if (res && res.errCode === 0) {
			toast.success(
				`Friend request ${status === "accepted" ? "accepted" : "declined"}`
			);
			const newStatus = status === "accepted" ? "friends" : "none";
			if (socket) {
				socket.emit("sendFriendRequest", {
					data: user.account,
					toUserId: id,
					friendshipStatus: newStatus,
				});
			}
			setFriendshipStatus(newStatus);
		} else {
			toast.error(res?.errMessage || "Failed to update request");
		}
	};

	const handleEditProfile = () => {
		setEditForm({
			fullName: profileData.fullName,
			bio: profileData.bio,
			profilePicture: profileData.profilePicture,
		});
		setAvatarPreview(null);
		setIsEditModalOpen(true);
	};

	const handleSaveProfile = async () => {
		setIsSaving(true);
		try {
			// Prepare the data to send to the API
			const profileUpdateData = new FormData();
			profileUpdateData.append("id", user?.account?.id || id);
			profileUpdateData.append("fullName", editForm.fullName.trim());
			profileUpdateData.append("bio", editForm.bio.trim());
			if (avatarPreview) {
				profileUpdateData.append("image", editForm.fileImage);
			}
			// Validate that we have a valid user ID
			if (!profileUpdateData.get("id")) {
				alert(
					"Cannot update profile: User ID is missing. Please try logging in again."
				);
				return;
			}

			const response = await UpdateProfileService(profileUpdateData);

			// Check if the response indicates an authentication error
			if (response && response.errCode === -2) {
				alert("Your session has expired. Please log in again.");
				window.location.href = "/login";
				return;
			}

			if (response && response.errCode === 0) {
				// Close the modal first
				setIsEditModalOpen(false);
				setAvatarPreview(null);

				// Reload the page to reflect all changes
				window.location.reload();
			} else {
				// Handle API error
				const errorMessage =
					response?.errMessage || response?.message || "Unknown error occurred";
				console.error("Failed to update profile:", errorMessage);
				alert(`Failed to update profile: ${errorMessage}`);
			}
		} catch (error) {
			console.error("Error updating profile:", error);

			if (error.response?.data?.errCode === -2) {
				alert("Your session has expired. Please log in again.");
				window.location.href = "/login";
			} else {
				const errorMessage =
					error.response?.data?.errMessage ||
					error.response?.data?.message ||
					error.message ||
					"An error occurred while updating profile";
				alert(`Error: ${errorMessage}`);
			}
		} finally {
			setIsSaving(false);
		}
	};

	const handleUpdatePost = (updatedPost) => {
		if (socket) {
			socket.emit("updatePost", updatedPost);
		}
		setUserPosts((prev) =>
			prev.map((post) => (post.id === updatedPost.id ? updatedPost : post))
		);
		setLikedPosts((prev) =>
			prev.map((post) => (post.id === updatedPost.id ? updatedPost : post))
		);
	};
	const handleDeletePost = (postToDelete) => {
		if (socket) {
			socket.emit("deletePost", postToDelete);
		}
		setUserPosts((prev) => prev.filter((post) => post.id !== postToDelete.id));
		setLikedPosts((prev) => prev.filter((post) => post.id !== postToDelete.id));
	};
	const handleAvatarChange = (e) => {
		const file = e.target.files[0];
		const checkfileFormat = file?.type.startsWith("image/");
		if (!checkfileFormat) {
			alert("Please select a valid image file (jpg, png, etc.)");
			return;
		}
		if (file) {
			const reader = new FileReader();
			reader.onload = (e) => {
				const imageUrl = e.target.result;
				setAvatarPreview(imageUrl);
				setEditForm((prev) => ({
					...prev,
					profilePicture: imageUrl,
					fileImage: file,
				}));
			};
			reader.readAsDataURL(file);
		}
	};

	const handleRemoveAvatar = () => {
		setAvatarPreview(null);
		setEditForm((prev) => ({
			...prev,
			profilePicture: null,
			fileImage: null,
		}));
	};

	const ErrorState = ({ error }) => {
		const getErrorDetails = (errorMsg) => {
			if (errorMsg.includes("not found") || errorMsg.includes("not exist")) {
				return {
					icon: UserX,
					title: "User Not Found",
					message: "This user doesn't exist or may have been deleted.",
					action: "Go Back to Home",
					actionFn: () => history.push("/"),
				};
			}
			if (
				errorMsg.includes("Network error") ||
				errorMsg.includes("connection")
			) {
				return {
					icon: AlertCircle,
					title: "Connection Error",
					message: "Please check your internet connection and try again.",
					action: "Retry",
					actionFn: () => window.location.reload(),
				};
			}
			return {
				icon: AlertCircle,
				title: "Something went wrong",
				message: errorMsg || "An unexpected error occurred.",
				action: "Go Back to Home",
				actionFn: () => history.push("/"),
			};
		};

		const {
			icon: ErrorIcon,
			title,
			message,
			action,
			actionFn,
		} = getErrorDetails(error);

		return (
			<div className="error-state">
				<div className="error-content">
					<ErrorIcon size={64} className="error-icon" />
					<h2 className="error-title">{title}</h2>
					<p className="error-message">{message}</p>
					<button className="error-action-btn" onClick={actionFn}>
						<Home size={16} />
						{action}
					</button>
				</div>
			</div>
		);
	};

	const renderPosts = () => {
		if (userPosts.length === 0) {
			return (
				<div className="no-posts">
					<MessageSquare size={48} className="no-posts-icon" />
					<h3>No posts yet</h3>
					<p>When you share posts, they'll appear here.</p>
				</div>
			);
		}

		return (
			<div className="profile-posts">
				{userPosts.map((post) => (
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

	const renderTabContent = () => {
		switch (activeTab) {
			case "posts":
				return renderPosts();
			case "media":
				return (
					<div className="no-posts">
						<MessageSquare size={48} className="no-posts-icon" />
						<h3>No media yet</h3>
						<p>Photos and videos shared will appear here.</p>
					</div>
				);
			case "likes":
				if (likedPosts.length === 0) {
					return (
						<div className="no-posts">
							<MessageSquare size={48} className="no-posts-icon" />
							<h3>No liked posts</h3>
							<p>Liked posts will appear here.</p>
						</div>
					);
				}
				return (
					<div className="profile-posts">
						{likedPosts.map((post) => (
							<Post
								key={post.id}
								post={{ ...post, formatTimeAgo }}
								onUpdatePost={handleUpdatePost}
								onDeletePost={handleDeletePost}
							/>
						))}
					</div>
				);
			default:
				return renderPosts();
		}
	};

	return (
		<div className="profile-container">
			{/* Profile Header - Only show if no error */}
			{!error && (
				<>
					<div className="profile-header">
						<div className="cover-photo"></div>
						<div className="profile-info">
							<div
								className="profile-avatar"
								style={{
									backgroundImage: profileData.profilePicture
										? `url(${profileData.profilePicture})`
										: "none",
									backgroundSize: "cover",
									backgroundPosition: "center",
								}}
							></div>
							<div className="profile-details">
								<h1 className="profile-name">{profileData.fullName}</h1>
								<p className="profile-username">{profileData.username}</p>
								<p className="profile-bio">{profileData.bio}</p>

								<div className="profile-meta">
									<div className="meta-item">
										<Calendar size={16} className="meta-icon" />
										<span>Joined {profileData.joinDate}</span>
									</div>
								</div>

								<div className="profile-actions">
									{user?.account?.id?.toString() === id?.toString() ? (
										<button
											className="edit-profile-btn"
											onClick={handleEditProfile}
										>
											Edit Profile
										</button>
									) : (
										<>
											{friendshipStatus === "none" && (
												<button
													className="action-btn primary"
													onClick={handleAddFriend}
												>
													<UserPlus size={18} />
													Add Friend
												</button>
											)}
											{friendshipStatus === "you_sent_request" && (
												<button
													className="action-btn danger"
													onClick={handleCancelFriendRequest}
												>
													<X size={18} />
													Cancel Request
												</button>
											)}
											{friendshipStatus === "they_sent_request" && (
												<>
													<button
														className="action-btn success"
														onClick={() =>
															handleRespondFriendRequest("accepted")
														}
													>
														<UserCheck size={18} />
														Accept
													</button>
													<button
														className="action-btn danger"
														onClick={() => handleRespondFriendRequest("reject")}
													>
														<UserX size={18} />
														Decline
													</button>
												</>
											)}
											{friendshipStatus === "friends" && (
												<button
													className="action-btn danger"
													onClick={handleCancelFriendRequest}
												>
													<UserX size={18} />
													Unfriend
												</button>
											)}
										</>
									)}
								</div>
							</div>
						</div>
					</div>

					{/* Profile Tabs - Only show if no error */}
					<div className="profile-tabs">
						<button
							className={`tab-button ${activeTab === "posts" ? "active" : ""}`}
							onClick={() => setActiveTab("posts")}
						>
							Posts
						</button>
						<button
							className={`tab-button ${activeTab === "media" ? "active" : ""}`}
							onClick={() => setActiveTab("media")}
						>
							Media
						</button>
						<button
							className={`tab-button ${activeTab === "likes" ? "active" : ""}`}
							onClick={() => setActiveTab("likes")}
						>
							Likes
						</button>
					</div>
				</>
			)}

			{/* Tab Content */}
			{loading ? (
				<div className="no-posts">
					<MessageSquare size={48} className="no-posts-icon" />
					<h3>Loading...</h3>
				</div>
			) : error ? (
				<ErrorState error={error} />
			) : (
				renderTabContent()
			)}

			{/* Edit Profile Modal */}
			{isEditModalOpen && (
				<div
					className="edit-modal-overlay"
					onClick={() => setIsEditModalOpen(false)}
				>
					<div
						className="edit-modal-content"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="edit-modal-header">
							<h2 className="edit-modal-title">Edit Profile</h2>
							<button
								className="close-btn"
								onClick={() => setIsEditModalOpen(false)}
							>
								<X size={24} />
							</button>
						</div>

						<div className="edit-modal-body">
							<form className="edit-form">
								<div className="form-group">
									<label className="form-label">Profile Picture</label>
									<div className="avatar-upload-section">
										<div
											className="avatar-preview"
											style={{
												backgroundImage:
													avatarPreview || editForm.profilePicture
														? `url(${avatarPreview || editForm.profilePicture})`
														: "none",
												backgroundSize: "cover",
												backgroundPosition: "center",
											}}
										>
											{!avatarPreview && !editForm.profilePicture && (
												<span className="avatar-placeholder">No Image</span>
											)}
										</div>
										<div className="avatar-controls">
											<input
												type="file"
												id="avatar-upload"
												accept="image/*"
												onChange={handleAvatarChange}
												className="avatar-input"
											/>
											<label htmlFor="avatar-upload" className="upload-btn">
												Choose Image
											</label>
											{(avatarPreview || editForm.profilePicture) && (
												<button
													type="button"
													onClick={handleRemoveAvatar}
													className="remove-avatar-btn"
												>
													Remove
												</button>
											)}
										</div>
									</div>
								</div>

								<div className="form-group">
									<label className="form-label">Name</label>
									<input
										type="text"
										className="form-input"
										value={editForm.fullName}
										onChange={(e) =>
											setEditForm((prev) => ({
												...prev,
												fullName: e.target.value,
											}))
										}
										placeholder="Your Name"
									/>
								</div>

								<div className="form-group">
									<label className="form-label">Bio</label>
									<textarea
										className="form-textarea"
										value={editForm.bio}
										onChange={(e) =>
											setEditForm((prev) => ({ ...prev, bio: e.target.value }))
										}
										placeholder="Tell us about yourself"
										maxLength={160}
									/>
								</div>
							</form>
						</div>

						<div className="edit-modal-footer">
							<button
								className="cancel-btn"
								onClick={() => setIsEditModalOpen(false)}
								disabled={isSaving}
							>
								Cancel
							</button>
							<button
								className="save-btn"
								onClick={handleSaveProfile}
								disabled={isSaving}
							>
								{isSaving ? "Saving..." : "Save Changes"}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default Profile;
