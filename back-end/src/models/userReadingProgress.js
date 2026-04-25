"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
	class UserReadingProgress extends Model {
		static associate(models) {
			UserReadingProgress.belongsTo(models.User, {
				foreignKey: "userId",
				as: "user",
			});
			UserReadingProgress.belongsTo(models.ReadingPassage, {
				foreignKey: "passageId",
				as: "passage",
			});
		}
	}

	UserReadingProgress.init(
		{
			userId: {
				type: DataTypes.INTEGER,
				allowNull: false,
			},
			passageId: {
				type: DataTypes.INTEGER,
				allowNull: false,
			},
			status: {
				type: DataTypes.ENUM("not_started", "in_progress", "completed"),
				allowNull: false,
				defaultValue: "not_started",
			},
			lastReadAt: {
				type: DataTypes.DATE,
				allowNull: true,
			},
			completedAt: {
				type: DataTypes.DATE,
				allowNull: true,
			},
		},
		{
			sequelize,
			modelName: "UserReadingProgress",
		}
	);

	return UserReadingProgress;
};
