import React, { useContext, useState } from "react";
import {
    User,
    Lock,
    Bell,
    Shield,
    Eye,
    Globe,
    Moon,
    Sun,
    ChevronRight,
    Mail,
    Smartphone,
    Languages,
    HelpCircle,
    LogOut,
    Trash2,
} from "lucide-react";
import "./Settings.css";
import { UserContext } from "../../Context/UserProvider";
import { LogOutUser } from "../../services/userService";
import { toast } from "react-toastify";
import { useHistory } from "react-router-dom";

const Settings = () => {
    const { user, logoutContext } = useContext(UserContext);
    const history = useHistory();
    const [activeSection, setActiveSection] = useState("account");
    const [settings, setSettings] = useState({
        // Account Settings
        email: user?.account?.email || "",
        phone: user?.account?.phone || "",
        language: "en",
        
        // Privacy Settings
        profileVisibility: "public",
        showEmail: false,
        showPhone: false,
        allowTagging: true,
        
        // Notification Settings
        emailNotifications: true,
        pushNotifications: true,
        messageNotifications: true,
        likeNotifications: true,
        commentNotifications: true,
        followNotifications: true,
        
        // Appearance
        theme: "dark",
        
        // Security
        twoFactorAuth: false,
    });

    const [passwordData, setPasswordData] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });

    const handleSettingChange = (key, value) => {
        setSettings((prev) => ({
            ...prev,
            [key]: value,
        }));
    };

    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswordData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleUpdatePassword = (e) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast.error("Passwords do not match!");
            return;
        }
        if (passwordData.newPassword.length < 6) {
            toast.error("Password must be at least 6 characters!");
            return;
        }
        // TODO: Call API to update password
        toast.success("Password updated successfully!");
        setPasswordData({
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
        });
    };

    const handleLogout = async () => {
        const data = await LogOutUser();
        logoutContext();
        if (data && data.errCode === 0) {
            history.push("/");
            toast.success("Logged out successfully");
        }
    };

    const handleDeactivateAccount = () => {
        if (window.confirm("Are you sure you want to deactivate your account?")) {
            // TODO: Call API to deactivate account
            toast.info("Account deactivation requested");
        }
    };

    const settingsSections = [
        { id: "account", icon: User, label: "Account" },
        { id: "privacy", icon: Shield, label: "Privacy" },
        { id: "notifications", icon: Bell, label: "Notifications" },
        { id: "appearance", icon: Moon, label: "Appearance" },
        { id: "security", icon: Lock, label: "Security" },
        { id: "help", icon: HelpCircle, label: "Help & Support" },
    ];

    return (
        <div className="settings-container">
            <div className="settings-header">
                <h1>Settings</h1>
                <p>Manage your account settings and preferences</p>
            </div>

            <div className="settings-layout">
                {/* Sidebar Navigation */}
                <div className="settings-sidebar">
                    {settingsSections.map((section) => {
                        const Icon = section.icon;
                        return (
                            <button
                                key={section.id}
                                className={`settings-nav-item ${
                                    activeSection === section.id ? "active" : ""
                                }`}
                                onClick={() => setActiveSection(section.id)}
                            >
                                <Icon size={20} />
                                <span>{section.label}</span>
                                <ChevronRight size={16} className="chevron" />
                            </button>
                        );
                    })}
                </div>

                {/* Content Area */}
                <div className="settings-content">
                    {/* Account Settings */}
                    {activeSection === "account" && (
                        <div className="settings-section">
                            <h2>Account Information</h2>
                            <div className="settings-group">
                                <div className="setting-item">
                                    <div className="setting-label">
                                        <Mail size={20} />
                                        <div>
                                            <h3>Email Address</h3>
                                            <p>{settings.email}</p>
                                        </div>
                                    </div>
                                    <button className="btn-secondary">Change</button>
                                </div>

                                <div className="setting-item">
                                    <div className="setting-label">
                                        <Smartphone size={20} />
                                        <div>
                                            <h3>Phone Number</h3>
                                            <p>{settings.phone || "Not set"}</p>
                                        </div>
                                    </div>
                                    <button className="btn-secondary">Change</button>
                                </div>

                                <div className="setting-item">
                                    <div className="setting-label">
                                        <Languages size={20} />
                                        <div>
                                            <h3>Language</h3>
                                            <p>English</p>
                                        </div>
                                    </div>
                                    <select
                                        value={settings.language}
                                        onChange={(e) =>
                                            handleSettingChange("language", e.target.value)
                                        }
                                        className="select-input"
                                    >
                                        <option value="en">English</option>
                                        <option value="vi">Tiếng Việt</option>
                                        <option value="fr">Français</option>
                                    </select>
                                </div>
                            </div>

                            <div className="danger-zone">
                                <h3>Danger Zone</h3>
                                <button
                                    className="btn-danger"
                                    onClick={handleDeactivateAccount}
                                >
                                    <Trash2 size={18} />
                                    Deactivate Account
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Privacy Settings */}
                    {activeSection === "privacy" && (
                        <div className="settings-section">
                            <h2>Privacy Settings</h2>
                            <div className="settings-group">
                                <div className="setting-item">
                                    <div className="setting-label">
                                        <Globe size={20} />
                                        <div>
                                            <h3>Profile Visibility</h3>
                                            <p>Who can see your profile</p>
                                        </div>
                                    </div>
                                    <select
                                        value={settings.profileVisibility}
                                        onChange={(e) =>
                                            handleSettingChange(
                                                "profileVisibility",
                                                e.target.value
                                            )
                                        }
                                        className="select-input"
                                    >
                                        <option value="public">Public</option>
                                        <option value="friends">Friends Only</option>
                                        <option value="private">Private</option>
                                    </select>
                                </div>

                                <div className="setting-item">
                                    <div className="setting-label">
                                        <Eye size={20} />
                                        <div>
                                            <h3>Show Email</h3>
                                            <p>Display email on profile</p>
                                        </div>
                                    </div>
                                    <label className="toggle-switch">
                                        <input
                                            type="checkbox"
                                            checked={settings.showEmail}
                                            onChange={(e) =>
                                                handleSettingChange("showEmail", e.target.checked)
                                            }
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>

                                <div className="setting-item">
                                    <div className="setting-label">
                                        <Eye size={20} />
                                        <div>
                                            <h3>Show Phone</h3>
                                            <p>Display phone number on profile</p>
                                        </div>
                                    </div>
                                    <label className="toggle-switch">
                                        <input
                                            type="checkbox"
                                            checked={settings.showPhone}
                                            onChange={(e) =>
                                                handleSettingChange("showPhone", e.target.checked)
                                            }
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>

                                <div className="setting-item">
                                    <div className="setting-label">
                                        <User size={20} />
                                        <div>
                                            <h3>Allow Tagging</h3>
                                            <p>Let others tag you in posts</p>
                                        </div>
                                    </div>
                                    <label className="toggle-switch">
                                        <input
                                            type="checkbox"
                                            checked={settings.allowTagging}
                                            onChange={(e) =>
                                                handleSettingChange("allowTagging", e.target.checked)
                                            }
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Notification Settings */}
                    {activeSection === "notifications" && (
                        <div className="settings-section">
                            <h2>Notification Preferences</h2>
                            <div className="settings-group">
                                <div className="setting-item">
                                    <div className="setting-label">
                                        <Mail size={20} />
                                        <div>
                                            <h3>Email Notifications</h3>
                                            <p>Receive notifications via email</p>
                                        </div>
                                    </div>
                                    <label className="toggle-switch">
                                        <input
                                            type="checkbox"
                                            checked={settings.emailNotifications}
                                            onChange={(e) =>
                                                handleSettingChange(
                                                    "emailNotifications",
                                                    e.target.checked
                                                )
                                            }
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>

                                <div className="setting-item">
                                    <div className="setting-label">
                                        <Bell size={20} />
                                        <div>
                                            <h3>Push Notifications</h3>
                                            <p>Receive push notifications</p>
                                        </div>
                                    </div>
                                    <label className="toggle-switch">
                                        <input
                                            type="checkbox"
                                            checked={settings.pushNotifications}
                                            onChange={(e) =>
                                                handleSettingChange(
                                                    "pushNotifications",
                                                    e.target.checked
                                                )
                                            }
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>

                                <h3 className="subsection-title">Activity Notifications</h3>

                                <div className="setting-item">
                                    <div className="setting-label">
                                        <div>
                                            <h3>Messages</h3>
                                            <p>New message notifications</p>
                                        </div>
                                    </div>
                                    <label className="toggle-switch">
                                        <input
                                            type="checkbox"
                                            checked={settings.messageNotifications}
                                            onChange={(e) =>
                                                handleSettingChange(
                                                    "messageNotifications",
                                                    e.target.checked
                                                )
                                            }
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>

                                <div className="setting-item">
                                    <div className="setting-label">
                                        <div>
                                            <h3>Likes</h3>
                                            <p>When someone likes your post</p>
                                        </div>
                                    </div>
                                    <label className="toggle-switch">
                                        <input
                                            type="checkbox"
                                            checked={settings.likeNotifications}
                                            onChange={(e) =>
                                                handleSettingChange(
                                                    "likeNotifications",
                                                    e.target.checked
                                                )
                                            }
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>

                                <div className="setting-item">
                                    <div className="setting-label">
                                        <div>
                                            <h3>Comments</h3>
                                            <p>When someone comments on your post</p>
                                        </div>
                                    </div>
                                    <label className="toggle-switch">
                                        <input
                                            type="checkbox"
                                            checked={settings.commentNotifications}
                                            onChange={(e) =>
                                                handleSettingChange(
                                                    "commentNotifications",
                                                    e.target.checked
                                                )
                                            }
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>

                                <div className="setting-item">
                                    <div className="setting-label">
                                        <div>
                                            <h3>New Followers</h3>
                                            <p>When someone follows you</p>
                                        </div>
                                    </div>
                                    <label className="toggle-switch">
                                        <input
                                            type="checkbox"
                                            checked={settings.followNotifications}
                                            onChange={(e) =>
                                                handleSettingChange(
                                                    "followNotifications",
                                                    e.target.checked
                                                )
                                            }
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Appearance Settings */}
                    {activeSection === "appearance" && (
                        <div className="settings-section">
                            <h2>Appearance</h2>
                            <div className="settings-group">
                                <div className="setting-item">
                                    <div className="setting-label">
                                        {settings.theme === "dark" ? (
                                            <Moon size={20} />
                                        ) : (
                                            <Sun size={20} />
                                        )}
                                        <div>
                                            <h3>Theme</h3>
                                            <p>Choose your preferred theme</p>
                                        </div>
                                    </div>
                                    <select
                                        value={settings.theme}
                                        onChange={(e) =>
                                            handleSettingChange("theme", e.target.value)
                                        }
                                        className="select-input"
                                    >
                                        <option value="light">Light</option>
                                        <option value="dark">Dark</option>
                                        <option value="auto">Auto</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Security Settings */}
                    {activeSection === "security" && (
                        <div className="settings-section">
                            <h2>Security</h2>

                            {/* Change Password */}
                            <div className="settings-group">
                                <h3>Change Password</h3>
                                <form onSubmit={handleUpdatePassword} className="password-form">
                                    <div className="form-group">
                                        <label>Current Password</label>
                                        <input
                                            type="password"
                                            name="currentPassword"
                                            value={passwordData.currentPassword}
                                            onChange={handlePasswordChange}
                                            placeholder="Enter current password"
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>New Password</label>
                                        <input
                                            type="password"
                                            name="newPassword"
                                            value={passwordData.newPassword}
                                            onChange={handlePasswordChange}
                                            placeholder="Enter new password"
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Confirm New Password</label>
                                        <input
                                            type="password"
                                            name="confirmPassword"
                                            value={passwordData.confirmPassword}
                                            onChange={handlePasswordChange}
                                            placeholder="Confirm new password"
                                            required
                                        />
                                    </div>
                                    <button type="submit" className="btn-primary">
                                        Update Password
                                    </button>
                                </form>
                            </div>

                            {/* Two-Factor Authentication */}
                            <div className="settings-group">
                                <div className="setting-item">
                                    <div className="setting-label">
                                        <Shield size={20} />
                                        <div>
                                            <h3>Two-Factor Authentication</h3>
                                            <p>Add an extra layer of security</p>
                                        </div>
                                    </div>
                                    <label className="toggle-switch">
                                        <input
                                            type="checkbox"
                                            checked={settings.twoFactorAuth}
                                            onChange={(e) =>
                                                handleSettingChange(
                                                    "twoFactorAuth",
                                                    e.target.checked
                                                )
                                            }
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>
                            </div>

                            {/* Logout */}
                            <div className="settings-group">
                                <button className="btn-logout" onClick={handleLogout}>
                                    <LogOut size={18} />
                                    Logout
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Help & Support */}
                    {activeSection === "help" && (
                        <div className="settings-section">
                            <h2>Help & Support</h2>
                            <div className="settings-group">
                                <a href="#" className="help-link">
                                    <HelpCircle size={20} />
                                    <div>
                                        <h3>Help Center</h3>
                                        <p>Find answers to common questions</p>
                                    </div>
                                    <ChevronRight size={16} />
                                </a>
                                <a href="#" className="help-link">
                                    <Mail size={20} />
                                    <div>
                                        <h3>Contact Support</h3>
                                        <p>Get help from our support team</p>
                                    </div>
                                    <ChevronRight size={16} />
                                </a>
                                <div className="app-info">
                                    <p>Version 1.0.0</p>
                                    <p>© 2024 Bird Social Media</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Settings;