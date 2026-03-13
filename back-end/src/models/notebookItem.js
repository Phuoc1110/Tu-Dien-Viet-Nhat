"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
	class NotebookItem extends Model {
		static associate(models) {
			NotebookItem.belongsTo(models.Notebook, { foreignKey: "notebookId", as: "notebook" });
		}
	}
	NotebookItem.init(
		{
			notebookId: {
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
			addedAt: {
				type: DataTypes.DATE,
				defaultValue: DataTypes.NOW,
			},
		},
		{
			sequelize,
			modelName: "NotebookItem",
			indexes: [
				{
					unique: true,
					fields: ["notebookId", "itemType", "itemId"],
				},
			],
		}
	);
	return NotebookItem;
};
