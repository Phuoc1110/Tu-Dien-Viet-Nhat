"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
	class Example extends Model {
		static associate(models) {
			Example.belongsTo(models.Word, { foreignKey: "wordId", as: "word" });
		}
	}
	Example.init(
		{
			wordId: {
				type: DataTypes.INTEGER,
				allowNull: false,
			},
			japaneseSentence: {
				type: DataTypes.TEXT,
				allowNull: false,
			},
			vietnameseTranslation: {
				type: DataTypes.TEXT,
				allowNull: false,
			},
		},
		{
			sequelize,
			modelName: "Example",
		}
	);
	return Example;
};
