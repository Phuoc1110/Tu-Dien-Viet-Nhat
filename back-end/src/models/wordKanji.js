"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
	class WordKanji extends Model {
		static associate(models) {
			// Associations handled by Word and Kanji through belongsToMany
		}
	}
	WordKanji.init(
		{
			wordId: {
				type: DataTypes.INTEGER,
				allowNull: false,
				primaryKey: true,
			},
			kanjiId: {
				type: DataTypes.INTEGER,
				allowNull: false,
				primaryKey: true,
			},
		},
		{
			sequelize,
			modelName: "WordKanji",
		}
	);
	return WordKanji;
};
