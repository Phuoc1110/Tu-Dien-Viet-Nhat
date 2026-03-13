"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
	class User extends Model {
		static associate(models) {
			// Admin Logs
			User.hasMany(models.AdminLog, { foreignKey: "adminId", as: "adminLogs" });

			// Notebooks
			User.hasMany(models.Notebook, { foreignKey: "userId", as: "notebooks" });

			// Search History
			User.hasMany(models.SearchHistory, { foreignKey: "userId", as: "searchHistories" });

			// Comments
			User.hasMany(models.Comment, { foreignKey: "userId", as: "comments" });

			// Reports (as reporter)
			User.hasMany(models.Report, { foreignKey: "reporterId", as: "reports" });
			User.hasMany(models.Report, { foreignKey: "resolvedBy", as: "resolvedReports" });

			// Contributions
			User.hasMany(models.UserContribution, { foreignKey: "userId", as: "contributions" });
			User.hasMany(models.UserContribution, { foreignKey: "reviewedBy", as: "reviewedContributions" });

			// SRS Reviews
			User.hasMany(models.UserReview, { foreignKey: "userId", as: "reviews" });
		}
	}
	User.init(
		{
			username: {
				type: DataTypes.STRING(50),
				allowNull: false,
				unique: true,
			},
			email: {
				type: DataTypes.STRING(100),
				allowNull: false,
				unique: true,
			},
			passwordHash: {
				type: DataTypes.STRING(255),
				allowNull: false,
			},
			avatarUrl: {
				type: DataTypes.STRING(255),
				allowNull: true,
			},
			role: {
				type: DataTypes.ENUM("user", "moderator", "admin"),
				defaultValue: "user",
			},
			status: {
				type: DataTypes.ENUM("active", "banned", "suspended"),
				defaultValue: "active",
			},
		},
		{
			sequelize,
			modelName: "User",
		}
	);
	return User;
};
