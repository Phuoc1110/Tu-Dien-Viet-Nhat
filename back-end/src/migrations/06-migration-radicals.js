"use strict";
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.createTable("Radicals", {
			id: {
				type: Sequelize.INTEGER,
				autoIncrement: true,
				primaryKey: true,
			},
			radical: {
				type: Sequelize.STRING(10),
				allowNull: false,
				unique: true,
			},
			strokeCount: {
				type: Sequelize.INTEGER,
				allowNull: false,
			},
			sinoVietnamese: {
				type: Sequelize.STRING(50),
				allowNull: true,
			},
			meaning: {
				type: Sequelize.STRING(255),
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
		await queryInterface.dropTable("Radicals");
	},
};
