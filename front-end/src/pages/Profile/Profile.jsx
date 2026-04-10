import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Mail,
  Shield,
  Activity,
  User,
  Lock,
  Edit2,
  Home,
  UserCircle,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
} from "lucide-react";
import "./Profile.css";
import { UserContext } from "../../Context/UserProvider";
import { useParams, useHistory } from "react-router-dom";
import {
  GetAllUser,
  UpdateProfileService,
  getRecentProfileComments,
  changePasswordWithCurrent,
} from "../../services/userService";

const TABS = [
  { key: "general", label: "Giới thiệu chung", icon: User },
  { key: "activity", label: "Hoạt động", icon: Activity },
  { key: "security", label: "Bảo mật", icon: Lock },
];

const Profile = () => {
  const { user } = useContext(UserContext);
  const { id } = useParams();
  const history = useHistory();

  const [activeTab, setActiveTab] = useState("general");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [editFileImage, setEditFileImage] = useState(null);

  const [isEditingGeneral, setIsEditingGeneral] = useState(false);
  const [generalForm, setGeneralForm] = useState({ username: "", country: "", level: "" });
  const [generalMsg, setGeneralMsg] = useState({ type: "", text: "" });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [passwordMsg, setPasswordMsg] = useState({ type: "", text: "" });
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [recentComments, setRecentComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);

  const [profileData, setProfileData] = useState({
    id: "",
    fullName: "",
    username: "",
    email: "",
    role: "user",
    status: "active",
    joinDate: "",
    profilePicture: null,
    country: "",
    level: "",
  });

  const targetProfileId = useMemo(() => {
    if (id) return id;
    if (user?.account?.id) return `${user.account.id}`;
    return "";
  }, [id, user?.account?.id]);

  const isMyProfile =
    `${user?.account?.id || ""}` === `${profileData.id || ""}`;

  const mapUserToProfile = (rawUser) => {
    const displayName = rawUser?.fullName || rawUser?.username || "";
    return {
      id: rawUser?.id,
      fullName: displayName,
      username: rawUser?.username || "",
      email: rawUser?.email || "",
      role: rawUser?.role || "user",
      status: rawUser?.status || "active",
      joinDate: rawUser?.createdAt
        ? new Date(rawUser.createdAt).toLocaleString("vi-VN", {
            month: "long",
            year: "numeric",
          })
        : "",
      profilePicture:
        rawUser?.avatarUrl || rawUser?.profilePicture || rawUser?.avatar || null,
      country: rawUser?.country || "",
      level: rawUser?.level || "",
    };
  };

  useEffect(() => {
    const fetchProfile = async () => {
      if (!targetProfileId) {
        setError("Không tìm thấy người dùng để hiển thị hồ sơ.");
        return;
      }
      setLoading(true);
      setError("");
      try {
        const res = await GetAllUser(targetProfileId);
        if (res && res.errCode === 0 && res.user) {
          const mapped = mapUserToProfile(res.user);
          setProfileData(mapped);
          setGeneralForm({
            username: res.user.username || "",
            country: res.user.country || "",
            level: res.user.level || "",
          });
        } else {
          setError("Không tìm thấy hồ sơ người dùng.");
        }
      } catch (e) {
        console.error("Profile fetch error:", e);
        setError("Lỗi mạng khi tải hồ sơ.");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [targetProfileId]);

  useEffect(() => {
    const fetchRecentComments = async () => {
      if (!targetProfileId || activeTab !== "activity") return;
      setLoadingComments(true);
      try {
        const res = await getRecentProfileComments(targetProfileId, 10);
        if (res && res.errCode === 0 && Array.isArray(res.DT)) {
          setRecentComments(res.DT);
        } else {
          setRecentComments([]);
        }
      } catch (e) {
        console.error("Recent comments fetch error:", e);
        setRecentComments([]);
      } finally {
        setLoadingComments(false);
      }
    };

    fetchRecentComments();
  }, [activeTab, targetProfileId]);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAvatarPreview(ev.target.result);
      setEditFileImage(file);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveGeneral = async () => {
    const username = generalForm.username.trim();
    setIsSaving(true);
    setGeneralMsg({ type: "", text: "" });
    try {
      const fd = new FormData();
      fd.append("id", user?.account?.id || targetProfileId);
      if (username) {
        fd.append("username", username);
        fd.append("fullName", username);
      }
      fd.append("country", generalForm.country || "");
      fd.append("level", generalForm.level || "");
      if (avatarPreview && editFileImage) fd.append("image", editFileImage);
      const res = await UpdateProfileService(fd);
      if (res && res.errCode === 0) {
        const refreshed = await GetAllUser(user?.account?.id || targetProfileId);
        if (refreshed && refreshed.errCode === 0 && refreshed.user) {
          const mapped = mapUserToProfile(refreshed.user);
          setProfileData(mapped);
          setGeneralForm({
            username: refreshed.user.username || "",
            country: refreshed.user.country || "",
            level: refreshed.user.level || "",
          });
        } else {
          const mapped = mapUserToProfile(res.user || {});
          setProfileData((prev) => ({ ...prev, ...mapped }));
        }
        setAvatarPreview(null);
        setEditFileImage(null);
        setIsEditingGeneral(false);
        setGeneralMsg({ type: "success", text: "Cập nhật hồ sơ thành công!" });
      } else if (res && res.errCode === -2) {
        history.push("/login");
      } else {
        setGeneralMsg({
          type: "error",
          text: res?.errMessage || "Cập nhật hồ sơ thất bại.",
        });
      }
    } catch (e) {
      console.error(e);
      setGeneralMsg({ type: "error", text: "Có lỗi xảy ra khi cập nhật." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelGeneral = () => {
    setIsEditingGeneral(false);
    setAvatarPreview(null);
    setEditFileImage(null);
    setGeneralForm({
      username: profileData.username || "",
      country: profileData.country || "",
      level: profileData.level || "",
    });
    setGeneralMsg({ type: "", text: "" });
  };

  const handleSavePassword = async () => {
    const { currentPassword, newPassword, confirmPassword } = passwordForm;
    if (!currentPassword) {
      setPasswordMsg({ type: "error", text: "Vui lòng nhập mật khẩu hiện tại." });
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setPasswordMsg({ type: "error", text: "Mật khẩu mới phải có ít nhất 6 ký tự." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: "error", text: "Xác nhận mật khẩu không khớp." });
      return;
    }
    setIsSavingPassword(true);
    setPasswordMsg({ type: "", text: "" });
    try {
      const res = await changePasswordWithCurrent(currentPassword, newPassword);
      if (res && res.errCode === 0) {
        setPasswordMsg({ type: "success", text: "Đổi mật khẩu thành công!" });
        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        setPasswordMsg({
          type: "error",
          text: res?.errMessage || res?.message || "Đổi mật khẩu thất bại.",
        });
      }
    } catch (e) {
      console.error(e);
      setPasswordMsg({ type: "error", text: "Có lỗi xảy ra khi đổi mật khẩu." });
    } finally {
      setIsSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="profile-state-screen">
        <UserCircle size={48} className="profile-state-icon" />
        <p>Đang tải hồ sơ...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="profile-state-screen">
        <Home size={48} className="profile-state-icon" />
        <p>{error}</p>
        <button onClick={() => history.push("/")}>Về trang chủ</button>
      </div>
    );
  }

  const avatarSrc = avatarPreview || profileData.profilePicture;

  return (
    <div className="profile-page">
      {/* ── Sidebar ── */}
      <aside className="profile-sidebar">
        <div className="sidebar-avatar-block">
          <div className="sidebar-avatar">
            {avatarSrc ? (
              <img src={avatarSrc} alt="avatar" />
            ) : (
              <span>{profileData.fullName?.[0]?.toUpperCase() || "U"}</span>
            )}
            {isMyProfile && isEditingGeneral && (
              <label className="avatar-edit-btn" title="Đổi ảnh">
                <Edit2 size={13} />
                <input type="file" accept="image/*" onChange={handleAvatarChange} />
              </label>
            )}
          </div>
          <p className="sidebar-username">
            {profileData.username ? `@${profileData.username}` : "-"}
          </p>
        </div>

        <nav className="sidebar-nav">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                className={`sidebar-tab${activeTab === tab.key ? " active" : ""}`}
                onClick={() => setActiveTab(tab.key)}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* ── Main panel ── */}
      <main className="profile-main">
        {/* ════ Giới thiệu chung ════ */}
        {activeTab === "general" && (
          <section className="profile-section">
            <div className="section-header">
              <h2>Thông tin cá nhân</h2>
              {isMyProfile && !isEditingGeneral && (
                <button
                  className="icon-btn"
                  title="Chỉnh sửa"
                  onClick={() => setIsEditingGeneral(true)}
                >
                  <Edit2 size={16} />
                </button>
              )}
            </div>
            <hr className="section-divider" />

            {generalMsg.text && (
              <div className={`profile-msg ${generalMsg.type}`}>
                {generalMsg.type === "success" ? (
                  <Check size={15} />
                ) : (
                  <AlertCircle size={15} />
                )}
                <span>{generalMsg.text}</span>
              </div>
            )}

            <div className="info-group">
              <div className="info-group-header">
                <User size={16} />
                <span>Thông tin cơ bản</span>
              </div>

              <div className="info-row">
                <span className="info-label">Username</span>
                {isEditingGeneral ? (
                  <input
                    className="info-input"
                    type="text"
                    value={generalForm.username}
                    onChange={(e) =>
                      setGeneralForm((p) => ({ ...p, username: e.target.value }))
                    }
                    placeholder="Nhập username"
                  />
                ) : (
                  <div className="info-row-right">
                    <span className="info-value">
                      {profileData.username ? `@${profileData.username}` : "-"}
                    </span>
                    {isMyProfile && (
                      <button
                        type="button"
                        className="row-edit-btn"
                        onClick={() => setIsEditingGeneral(true)}
                      >
                        Sửa
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="info-row">
                <span className="info-label">Trình độ</span>
                {isEditingGeneral ? (
                  <select
                    className="info-input"
                    value={generalForm.level}
                    onChange={(e) =>
                      setGeneralForm((p) => ({ ...p, level: e.target.value }))
                    }
                  >
                    <option value="">-</option>
                    {["N5", "N4", "N3", "N2", "N1"].map((lvl) => (
                      <option key={lvl} value={lvl}>{lvl}</option>
                    ))}
                  </select>
                ) : (
                  <div className="info-row-right">
                    {profileData.level ? (
                      <span className="info-badge badge-level">{profileData.level}</span>
                    ) : (
                      <span className="info-value">-</span>
                    )}
                    {isMyProfile && (
                      <button
                        type="button"
                        className="row-edit-btn"
                        onClick={() => setIsEditingGeneral(true)}
                      >
                        Sửa
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="info-row">
                <span className="info-label">Quốc gia</span>
                {isEditingGeneral ? (
                  <input
                    className="info-input"
                    type="text"
                    value={generalForm.country}
                    onChange={(e) =>
                      setGeneralForm((p) => ({ ...p, country: e.target.value }))
                    }
                    placeholder="Nhập quốc gia"
                  />
                ) : (
                  <div className="info-row-right">
                    <span className="info-value info-country">
                      {profileData.country || "-"}
                    </span>
                    {isMyProfile && (
                      <button
                        type="button"
                        className="row-edit-btn"
                        onClick={() => setIsEditingGeneral(true)}
                      >
                        Sửa
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="info-group">
              <div className="info-group-header">
                <Shield size={16} />
                <span>Thông tin chi tiết</span>
              </div>

              <div className="info-row">
                <span className="info-label">Vai trò</span>
                <span
                  className={`info-badge ${
                    profileData.role === "admin" ? "badge-admin" : "badge-user"
                  }`}
                >
                  {profileData.role === "admin" ? "Quản trị viên" : "Người dùng"}
                </span>
              </div>

              <div className="info-row">
                <span className="info-label">Trạng thái</span>
                <span
                  className={`info-badge ${
                    profileData.status === "active" ? "badge-active" : "badge-banned"
                  }`}
                >
                  {profileData.status === "active" ? "Hoạt động" : "Bị khóa"}
                </span>
              </div>

              <div className="info-row">
                <span className="info-label">Ngày tham gia</span>
                <span className="info-value info-date">
                  <Calendar size={13} />
                  {profileData.joinDate || "-"}
                </span>
              </div>
            </div>

            <div className="info-group">
              <div className="info-group-header">
                <Mail size={16} />
                <span>Thông tin liên hệ</span>
              </div>

              <div className="info-row">
                <span className="info-label">Email</span>
                <span className="info-value">{profileData.email || "-"}</span>
              </div>
            </div>

            {isMyProfile && isEditingGeneral && (
              <div className="edit-actions">
                <button className="btn-cancel" onClick={handleCancelGeneral}>
                  Hủy
                </button>
                <button
                  className="btn-save"
                  onClick={handleSaveGeneral}
                  disabled={isSaving}
                >
                  {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              </div>
            )}
          </section>
        )}

        {/* ════ Hoạt động ════ */}
        {activeTab === "activity" && (
          <section className="profile-section">
            <div className="section-header">
              <h2>Hoạt động</h2>
            </div>
            <hr className="section-divider" />

            <div className="info-group">
              <div className="info-group-header">
                <Activity size={16} />
                <span>Các bình luận gần đây</span>
              </div>
              {loadingComments ? (
                <div className="activity-empty">
                  <Activity size={36} />
                  <p>Đang tải hoạt động...</p>
                </div>
              ) : recentComments.length === 0 ? (
                <div className="activity-empty">
                  <Activity size={36} />
                  <p>Chưa có hoạt động nào.</p>
                  <span>Các bình luận gần đây sẽ hiển thị ở đây.</span>
                </div>
              ) : (
                <div className="activity-list">
                  {recentComments.map((item) => (
                    <div key={item.id} className="activity-item">
                      <div className="activity-item-top">
                        <span className={`activity-type type-${item.targetType}`}>
                          {item.targetType === "word"
                            ? "Từ vựng"
                            : item.targetType === "kanji"
                            ? "Kanji"
                            : "Ngữ pháp"}
                        </span>
                        <span className="activity-time">
                          {item.createdAt
                            ? new Date(item.createdAt).toLocaleString("vi-VN")
                            : ""}
                        </span>
                      </div>
                      <div className="activity-target">{item.targetLabel || "-"}</div>
                      <p className="activity-content">{item.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ════ Bảo mật ════ */}
        {activeTab === "security" && (
          <section className="profile-section">
            <div className="section-header">
              <h2>Bảo mật</h2>
            </div>
            <hr className="section-divider" />

            {isMyProfile ? (
              <div className="info-group">
                <div className="info-group-header">
                  <Lock size={16} />
                  <span>Đổi mật khẩu</span>
                </div>

                {passwordMsg.text && (
                  <div className={`profile-msg ${passwordMsg.type}`}>
                    {passwordMsg.type === "success" ? (
                      <Check size={15} />
                    ) : (
                      <AlertCircle size={15} />
                    )}
                    <span>{passwordMsg.text}</span>
                  </div>
                )}

                <div className="info-row stacked">
                  <label className="info-label">Mật khẩu hiện tại</label>
                  <div className="password-input-wrap">
                    <input
                      className="info-input"
                      type={showPasswords.current ? "text" : "password"}
                      value={passwordForm.currentPassword}
                      onChange={(e) =>
                        setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))
                      }
                      placeholder="Nhập mật khẩu hiện tại"
                    />
                    <button
                      className="password-eye"
                      type="button"
                      onClick={() =>
                        setShowPasswords((p) => ({ ...p, current: !p.current }))
                      }
                    >
                      {showPasswords.current ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="info-row stacked">
                  <label className="info-label">Mật khẩu mới</label>
                  <div className="password-input-wrap">
                    <input
                      className="info-input"
                      type={showPasswords.new ? "text" : "password"}
                      value={passwordForm.newPassword}
                      onChange={(e) =>
                        setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))
                      }
                      placeholder="Tối thiểu 6 ký tự"
                    />
                    <button
                      className="password-eye"
                      type="button"
                      onClick={() =>
                        setShowPasswords((p) => ({ ...p, new: !p.new }))
                      }
                    >
                      {showPasswords.new ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="info-row stacked">
                  <label className="info-label">Xác nhận mật khẩu mới</label>
                  <div className="password-input-wrap">
                    <input
                      className="info-input"
                      type={showPasswords.confirm ? "text" : "password"}
                      value={passwordForm.confirmPassword}
                      onChange={(e) =>
                        setPasswordForm((p) => ({
                          ...p,
                          confirmPassword: e.target.value,
                        }))
                      }
                      placeholder="Nhập lại mật khẩu mới"
                    />
                    <button
                      className="password-eye"
                      type="button"
                      onClick={() =>
                        setShowPasswords((p) => ({ ...p, confirm: !p.confirm }))
                      }
                    >
                      {showPasswords.confirm ? (
                        <EyeOff size={16} />
                      ) : (
                        <Eye size={16} />
                      )}
                    </button>
                  </div>
                </div>

                <div className="edit-actions">
                  <button
                    className="btn-save"
                    onClick={handleSavePassword}
                    disabled={isSavingPassword}
                  >
                    {isSavingPassword ? "Đang lưu..." : "Cập nhật mật khẩu"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="activity-empty">
                <Lock size={36} />
                <p>Chỉ chủ sở hữu mới có thể xem trang này.</p>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
};

export default Profile;
