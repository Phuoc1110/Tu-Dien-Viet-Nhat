"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
	class UserFlashcardStatus extends Model {
		static associate(models) {
			UserFlashcardStatus.belongsTo(models.User, { foreignKey: "userId", as: "user" });
		}
	}
	UserFlashcardStatus.init(
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
			srs_stage: {
				type: DataTypes.INTEGER,
				allowNull: false,
				defaultValue: 0,
				comment: "Internal storage: 0 = unremembered, 1 = remembered",
			},
			lastReviewedAt: {
				type: DataTypes.DATE,
				allowNull: true,
			},
		},
		{
			sequelize,
			modelName: "UserFlashcardStatus",
			tableName: "UserReviews",
			indexes: [
				{
					unique: true,
					fields: ["userId", "itemType", "itemId"],
				},
			],
		}
	);
	return UserFlashcardStatus;
};
