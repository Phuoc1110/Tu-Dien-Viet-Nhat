"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
	class UserReview extends Model {
		static associate(models) {
			UserReview.belongsTo(models.User, { foreignKey: "userId", as: "user" });
		}
	}
	UserReview.init(
		{
			userId: {
				type: DataTypes.INTEGER,
				allowNull: false,
			},
			itemType: {
				type: DataTypes.ENUM("word", "kanji", "grammar"),
				allowNull: false,
			},
			itemId: {
				type: DataTypes.INTEGER,
				allowNull: false,
			},
			easeFactor: {
				type: DataTypes.FLOAT,
				defaultValue: 2.5,
			},
			intervalDays: {
				type: DataTypes.INTEGER,
				defaultValue: 1,
			},
			nextReviewAt: {
				type: DataTypes.DATE,
				allowNull: true,
			},
			lastReviewedAt: {
				type: DataTypes.DATE,
				allowNull: true,
			},
			reviewCount: {
				type: DataTypes.INTEGER,
				defaultValue: 0,
			},
			srs_stage: {
				type: DataTypes.INTEGER,
				allowNull: false,
				defaultValue: 0,
				comment: "SRS stage: 0 (new), 1-5 (learning), 6 (mastered)",
			},
			last_mode: {
				type: DataTypes.ENUM("reading", "meaning", "kanji"),
				allowNull: true,
				defaultValue: null,
				comment: "Last quiz type: reading, meaning, kanji",
			},
		},
		{
			sequelize,
			modelName: "UserReview",
			indexes: [
				{
					unique: true,
					fields: ["userId", "itemType", "itemId"],
				},
				{
					fields: ["userId", "nextReviewAt"],
				},
			],
		}
	);
	return UserReview;
};
