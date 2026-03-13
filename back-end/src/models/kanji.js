"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
	class Kanji extends Model {
		static associate(models) {
			// Main Radical
			Kanji.belongsTo(models.Radical, { foreignKey: "mainRadicalId", as: "mainRadical" });

			// Many-to-many with Radicals
			Kanji.belongsToMany(models.Radical, {
				through: models.KanjiRadical,
				foreignKey: "kanjiId",
				otherKey: "radicalId",
				as: "radicals",
			});

			// Many-to-many with Words
			Kanji.belongsToMany(models.Word, {
				through: models.WordKanji,
				foreignKey: "kanjiId",
				otherKey: "wordId",
				as: "words",
			});
		}
	}
	Kanji.init(
		{
			characterKanji: {
				type: DataTypes.STRING(10),
				allowNull: false,
				unique: true,
			},
			sinoVietnamese: {
				type: DataTypes.STRING(50),
				allowNull: true,
			},
			meaning: {
				type: DataTypes.STRING(255),
				allowNull: true,
			},
			onyomi: {
				type: DataTypes.STRING(255),
				allowNull: true,
			},
			kunyomi: {
				type: DataTypes.STRING(255),
				allowNull: true,
			},
			strokeCount: {
				type: DataTypes.INTEGER,
				allowNull: true,
			},
			jlptLevel: {
				type: DataTypes.INTEGER,
				allowNull: true,
			},
			mainRadicalId: {
				type: DataTypes.INTEGER,
				allowNull: true,
			},
			strokePaths: {
				type: DataTypes.JSON,
				allowNull: true,
			},
			components: {
				type: DataTypes.STRING(100),
				allowNull: true,
			},
		},
		{
			sequelize,
			modelName: "Kanji",
		}
	);
	return Kanji;
};
