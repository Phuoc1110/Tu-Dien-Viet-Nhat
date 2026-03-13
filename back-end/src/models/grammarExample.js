"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
	class GrammarExample extends Model {
		static associate(models) {
			GrammarExample.belongsTo(models.Grammar, { foreignKey: "grammarId", as: "grammar" });
		}
	}
	GrammarExample.init(
		{
			grammarId: {
				type: DataTypes.INTEGER,
				allowNull: false,
			},
			japaneseSentence: {
				type: DataTypes.TEXT,
				allowNull: false,
			},
			readingSentence: {
				type: DataTypes.TEXT,
				allowNull: true,
			},
			vietnameseTranslation: {
				type: DataTypes.TEXT,
				allowNull: false,
			},
		},
		{
			sequelize,
			modelName: "GrammarExample",
		}
	);
	return GrammarExample;
};
