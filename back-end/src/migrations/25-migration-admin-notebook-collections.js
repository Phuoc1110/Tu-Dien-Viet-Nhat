"use strict";

module.exports = {
	up: async (queryInterface, Sequelize) => {
		await queryInterface.createTable("AdminNotebookCollections", {
			id: {
				type: Sequelize.INTEGER,
				autoIncrement: true,
				primaryKey: true,
				allowNull: false,
			},
			title: {
				type: Sequelize.STRING(120),
				allowNull: false,
			},
			meta: {
				type: Sequelize.STRING(255),
				allowNull: true,
			},
			ownerName: {
				type: Sequelize.STRING(100),
				allowNull: false,
				defaultValue: "Ban quan tri",
			},
			views: {
				type: Sequelize.INTEGER,
				allowNull: false,
				defaultValue: 0,
			},
			sortOrder: {
				type: Sequelize.INTEGER,
				allowNull: false,
				defaultValue: 0,
			},
			isActive: {
				type: Sequelize.BOOLEAN,
				allowNull: false,
				defaultValue: true,
			},
			createdByAdminId: {
				type: Sequelize.INTEGER,
				allowNull: true,
			},
			createdAt: {
				allowNull: false,
				type: Sequelize.DATE,
			},
			updatedAt: {
				allowNull: false,
				type: Sequelize.DATE,
			},
		});
	},

	down: async (queryInterface) => {
		await queryInterface.dropTable("AdminNotebookCollections");
	},
};
