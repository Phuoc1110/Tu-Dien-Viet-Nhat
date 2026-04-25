"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
	class ReadingPassage extends Model {
		static associate(models) {
			ReadingPassage.belongsTo(models.User, {
				foreignKey: "createdByAdminId",
				as: "createdByAdmin",
			});
			ReadingPassage.hasMany(models.UserReadingProgress, {
				foreignKey: "passageId",
				as: "progresses",
			});
		}
	}

	ReadingPassage.init(
		{
			title: {
				type: DataTypes.STRING(160),
				allowNull: false,
			},
			summary: {
				type: DataTypes.STRING(255),
				allowNull: true,
			},
			content: {
				type: DataTypes.TEXT("long"),
				allowNull: false,
			},
			translation: {
				type: DataTypes.TEXT("long"),
				allowNull: true,
			},
			level: {
				type: DataTypes.ENUM("N5", "N4", "N3", "N2", "N1", "mixed"),
				allowNull: false,
				defaultValue: "mixed",
			},
			topic: {
				type: DataTypes.STRING(100),
				allowNull: true,
			},
			estimatedMinutes: {
				type: DataTypes.INTEGER,
				allowNull: false,
				defaultValue: 5,
			},
			isActive: {
				type: DataTypes.BOOLEAN,
				allowNull: false,
				defaultValue: true,
			},
			createdByAdminId: {
				type: DataTypes.INTEGER,
				allowNull: true,
			},
		},
		{
			sequelize,
			modelName: "ReadingPassage",
		}
	);

	return ReadingPassage;
};
