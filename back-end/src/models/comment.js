"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
	class Comment extends Model {
		static associate(models) {
			Comment.belongsTo(models.User, { foreignKey: "userId", as: "user" });
		}
	}
	Comment.init(
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
				allowNull: false,
			},
			content: {
				type: DataTypes.TEXT,
				allowNull: false,
			},
			upvotes: {
				type: DataTypes.INTEGER,
				defaultValue: 0,
			},
			isHidden: {
				type: DataTypes.BOOLEAN,
				defaultValue: false,
			},
		},
		{
			sequelize,
			modelName: "Comment",
			indexes: [
				{
					fields: ["targetType", "targetId"],
				},
			],
		}
	);
	return Comment;
};
