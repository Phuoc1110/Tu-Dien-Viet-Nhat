"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
	class Grammar extends Model {
		static associate(models) {
			Grammar.hasMany(models.GrammarExample, { foreignKey: "grammarId", as: "examples" });
		}
	}
	Grammar.init(
		{
			title: {
				type: DataTypes.STRING(255),
				allowNull: false,
			},
			meaning: {
				type: DataTypes.STRING(255),
				allowNull: false,
			},
			formation: {
				type: DataTypes.TEXT,
				allowNull: true,
			},
			usageNote: {
				type: DataTypes.TEXT,
				allowNull: true,
			},
			jlptLevel: {
				type: DataTypes.INTEGER,
				allowNull: true,
			},
		},
		{
			sequelize,
			modelName: "Grammar",
		}
	);
	return Grammar;
};
