"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
	class SearchHistory extends Model {
		static associate(models) {
			SearchHistory.belongsTo(models.User, { foreignKey: "userId", as: "user" });
		}
	}
	SearchHistory.init(
		{
			userId: {
				type: DataTypes.INTEGER,
				allowNull: false,
			},
			searchTerm: {
				type: DataTypes.STRING(100),
				allowNull: false,
			},
			searchedAt: {
				type: DataTypes.DATE,
				defaultValue: DataTypes.NOW,
			},
		},
		{
			sequelize,
			modelName: "SearchHistory",
		}
	);
	return SearchHistory;
};
