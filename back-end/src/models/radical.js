"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
	class Radical extends Model {
		static associate(models) {
			// Main radical for Kanji
			Radical.hasMany(models.Kanji, { foreignKey: "mainRadicalId", as: "mainKanjis" });

			// Many-to-many with Kanji
			Radical.belongsToMany(models.Kanji, {
				through: models.KanjiRadical,
				foreignKey: "radicalId",
				otherKey: "kanjiId",
				as: "kanjis",
			});
		}
	}
	Radical.init(
		{
			radical: {
				type: DataTypes.STRING(10),
				allowNull: false,
				unique: true,
			},
			strokeCount: {
				type: DataTypes.INTEGER,
				allowNull: false,
			},
			sinoVietnamese: {
				type: DataTypes.STRING(50),
				allowNull: true,
			},
			meaning: {
				type: DataTypes.STRING(255),
				allowNull: true,
			},
		},
		{
			sequelize,
			modelName: "Radical",
		}
	);
	return Radical;
};
