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
			isRemembered: {
				type: DataTypes.BOOLEAN,
				allowNull: false,
				defaultValue: false,
			},
			lastReviewedAt: {
				type: DataTypes.DATE,
				allowNull: true,
			},
		},
		{
			sequelize,
			modelName: "UserFlashcardStatus",
			tableName: "UserFlashcardStatuses",
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
