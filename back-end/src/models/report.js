"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
	class Report extends Model {
		static associate(models) {
			Report.belongsTo(models.User, { foreignKey: "reporterId", as: "reporter" });
			Report.belongsTo(models.User, { foreignKey: "resolvedBy", as: "resolver" });
		}
	}
	Report.init(
		{
			reporterId: {
				type: DataTypes.INTEGER,
				allowNull: false,
			},
			targetType: {
				type: DataTypes.ENUM("comment", "word", "kanji"),
				allowNull: false,
			},
			targetId: {
				type: DataTypes.INTEGER,
				allowNull: false,
			},
			reason: {
				type: DataTypes.TEXT,
				allowNull: false,
			},
			status: {
				type: DataTypes.ENUM("pending", "reviewed", "resolved", "dismissed"),
				defaultValue: "pending",
			},
			resolvedBy: {
				type: DataTypes.INTEGER,
				allowNull: true,
			},
			resolvedAt: {
				type: DataTypes.DATE,
				allowNull: true,
			},
		},
		{
			sequelize,
			modelName: "Report",
		}
	);
	return Report;
};
