"use strict";
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.createTable("AdminLogs", {
			id: {
				type: Sequelize.INTEGER,
				autoIncrement: true,
				primaryKey: true,
			},
			adminId: {
				type: Sequelize.INTEGER,
				allowNull: false,
				references: { model: "Users", key: "id" },
				onDelete: "CASCADE",
			},
			actionType: {
				type: Sequelize.STRING(50),
				allowNull: false,
			},
			targetType: {
				type: Sequelize.STRING(50),
				allowNull: true,
			},
			targetId: {
				type: Sequelize.INTEGER,
				allowNull: true,
			},
			details: {
				type: Sequelize.TEXT,
				allowNull: true,
			},
			createdAt: {
				type: Sequelize.DATE,
				defaultValue: Sequelize.NOW,
			},
			updatedAt: {
				type: Sequelize.DATE,
				defaultValue: Sequelize.NOW,
			},
		});
	},
	async down(queryInterface) {
		await queryInterface.dropTable("AdminLogs");
	},
};
