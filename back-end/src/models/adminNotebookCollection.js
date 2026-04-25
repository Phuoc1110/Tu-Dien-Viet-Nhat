"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
	class AdminNotebookCollection extends Model {
		static associate(models) {
			if (models.User) {
				AdminNotebookCollection.belongsTo(models.User, {
					foreignKey: "createdByAdminId",
					as: "creator",
				});
			}
		}
	}

	AdminNotebookCollection.init(
		{
			title: {
				type: DataTypes.STRING(120),
				allowNull: false,
			},
			meta: {
				type: DataTypes.STRING(255),
				allowNull: true,
			},
			ownerName: {
				type: DataTypes.STRING(100),
				allowNull: false,
				defaultValue: "Ban quan tri",
			},
			views: {
				type: DataTypes.INTEGER,
				allowNull: false,
				defaultValue: 0,
			},
			sortOrder: {
				type: DataTypes.INTEGER,
				allowNull: false,
				defaultValue: 0,
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
			modelName: "AdminNotebookCollection",
		}
	);

	return AdminNotebookCollection;
};
