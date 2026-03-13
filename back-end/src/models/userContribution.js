"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
	class UserContribution extends Model {
		static associate(models) {
			UserContribution.belongsTo(models.User, { foreignKey: "userId", as: "user" });
			UserContribution.belongsTo(models.User, { foreignKey: "reviewedBy", as: "reviewer" });
		}
	}
	UserContribution.init(
		{
			userId: {
				type: DataTypes.INTEGER,
				allowNull: false,
			},
			targetType: {
				type: DataTypes.ENUM("word", "kanji", "grammar"),
				allowNull: false,
			},
			targetId: {
				type: DataTypes.INTEGER,
				allowNull: true,
			},
			proposedContent: {
				type: DataTypes.JSON,
				allowNull: false,
			},
			status: {
				type: DataTypes.ENUM("pending", "approved", "rejected"),
				defaultValue: "pending",
			},
			reviewedBy: {
				type: DataTypes.INTEGER,
				allowNull: true,
			},
			reviewedAt: {
				type: DataTypes.DATE,
				allowNull: true,
			},
		},
		{
			sequelize,
			modelName: "UserContribution",
		}
	);
	return UserContribution;
};
