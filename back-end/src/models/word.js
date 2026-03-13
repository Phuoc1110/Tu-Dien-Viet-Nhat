"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
	class Word extends Model {
		static associate(models) {
			// Meanings
			Word.hasMany(models.Meaning, { foreignKey: "wordId", as: "meanings" });

			// Examples
			Word.hasMany(models.Example, { foreignKey: "wordId", as: "examples" });

			// Kanji (many-to-many)
			Word.belongsToMany(models.Kanji, {
				through: models.WordKanji,
				foreignKey: "wordId",
				otherKey: "kanjiId",
				as: "kanjis",
			});

			// Word Relations
			Word.hasMany(models.WordRelation, { foreignKey: "wordId", as: "relations" });
			Word.hasMany(models.WordRelation, { foreignKey: "relatedWordId", as: "relatedFrom" });
		}
	}
	Word.init(
		{
			word: {
				type: DataTypes.STRING(100),
				allowNull: false,
			},
			reading: {
				type: DataTypes.STRING(100),
				allowNull: false,
			},
			romaji: {
				type: DataTypes.STRING(100),
				allowNull: true,
			},
			jlptLevel: {
				type: DataTypes.INTEGER,
				allowNull: true,
			},
			audioUrl: {
				type: DataTypes.STRING(255),
				allowNull: true,
			},
			isCommon: {
				type: DataTypes.BOOLEAN,
				defaultValue: false,
			},
		},
		{
			sequelize,
			modelName: "Word",
		}
	);
	return Word;
};
