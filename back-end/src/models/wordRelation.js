"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
	class WordRelation extends Model {
		static associate(models) {
			WordRelation.belongsTo(models.Word, { foreignKey: "wordId", as: "word" });
			WordRelation.belongsTo(models.Word, { foreignKey: "relatedWordId", as: "relatedWord" });
		}
	}
	WordRelation.init(
		{
			wordId: {
				type: DataTypes.INTEGER,
				allowNull: false,
			},
			relatedWordId: {
				type: DataTypes.INTEGER,
				allowNull: false,
			},
			relationType: {
				type: DataTypes.ENUM("synonym", "antonym", "related"),
				allowNull: false,
			},
		},
		{
			sequelize,
			modelName: "WordRelation",
			indexes: [
				{
					unique: true,
					fields: ["wordId", "relatedWordId", "relationType"],
				},
			],
		}
	);
	return WordRelation;
};
