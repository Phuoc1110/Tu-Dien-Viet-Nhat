"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
	class Notebook extends Model {
		static associate(models) {
			Notebook.belongsTo(models.User, { foreignKey: "userId", as: "user" });
			Notebook.hasMany(models.NotebookItem, { foreignKey: "notebookId", as: "items" });
		}
	}
	Notebook.init(
		{
			userId: {
				type: DataTypes.INTEGER,
				allowNull: false,
			},
			name: {
				type: DataTypes.STRING(100),
				allowNull: false,
			},
			description: {
				type: DataTypes.TEXT,
				allowNull: true,
			},
		},
		{
			sequelize,
			modelName: "Notebook",
		}
	);
	return Notebook;
};
