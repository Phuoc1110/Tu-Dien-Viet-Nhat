"use strict";
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.createTable("Grammars", {
			id: {
				type: Sequelize.INTEGER,
				autoIncrement: true,
				primaryKey: true,
			},
			title: {
				type: Sequelize.STRING(255),
				allowNull: false,
			},
			meaning: {
				type: Sequelize.STRING(255),
				allowNull: false,
			},
			formation: {
				type: Sequelize.TEXT,
				allowNull: true,
			},
			usageNote: {
				type: Sequelize.TEXT,
				allowNull: true,
			},
			jlptLevel: {
				type: Sequelize.INTEGER,
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
		await queryInterface.dropTable("Grammars");
	},
};
