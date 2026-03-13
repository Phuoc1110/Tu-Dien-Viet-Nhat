"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
	class AdminLog extends Model {
		static associate(models) {
			AdminLog.belongsTo(models.User, { foreignKey: "adminId", as: "admin" });
		}
	}
	AdminLog.init(
		{
			adminId: {
				type: DataTypes.INTEGER,
				allowNull: false,
			},
			actionType: {
				type: DataTypes.STRING(50),
				allowNull: false,
			},
			targetType: {
				type: DataTypes.STRING(50),
				allowNull: true,
			},
			targetId: {
				type: DataTypes.INTEGER,
				allowNull: true,
			},
			details: {
				type: DataTypes.TEXT,
				allowNull: true,
			},
		},
		{
			sequelize,
			modelName: "AdminLog",
		}
	);
	return AdminLog;
};
