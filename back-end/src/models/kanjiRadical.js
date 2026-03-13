"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
	class KanjiRadical extends Model {
		static associate(models) {
			// Associations handled by Kanji and Radical through belongsToMany
		}
	}
	KanjiRadical.init(
		{
			kanjiId: {
				type: DataTypes.INTEGER,
				allowNull: false,
				primaryKey: true,
			},
			radicalId: {
				type: DataTypes.INTEGER,
				allowNull: false,
				primaryKey: true,
			},
		},
		{
			sequelize,
			modelName: "KanjiRadical",
		}
	);
	return KanjiRadical;
};
