"use strict";
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.createTable("Notebooks", {
			id: {
				type: Sequelize.INTEGER,
				autoIncrement: true,
				primaryKey: true,
			},
			userId: {
				type: Sequelize.INTEGER,
				allowNull: false,
				references: { model: "Users", key: "id" },
				onDelete: "CASCADE",
			},
			name: {
				type: Sequelize.STRING(100),
				allowNull: false,
			},
			description: {
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
		await queryInterface.dropTable("Notebooks");
	},
};
