"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
	class Meaning extends Model {
		static associate(models) {
			Meaning.belongsTo(models.Word, { foreignKey: "wordId", as: "word" });
		}
	}
	Meaning.init(
		{
			wordId: {
				type: DataTypes.INTEGER,
				allowNull: false,
			},
			partOfSpeech: {
				type: DataTypes.STRING(50),
				allowNull: true,
			},
			definition: {
				type: DataTypes.TEXT,
				allowNull: false,
			},
			language: {
				type: DataTypes.STRING(10),
				defaultValue: "vi",
			},
		},
		{
			sequelize,
			modelName: "Meaning",
		}
	);
	return Meaning;
};
