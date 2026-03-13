"use strict";
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.createTable("UserContributions", {
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
			targetType: {
				type: Sequelize.ENUM("word", "kanji", "grammar"),
				allowNull: false,
			},
			targetId: {
				type: Sequelize.INTEGER,
				allowNull: true,
			},
			proposedContent: {
				type: Sequelize.JSON,
				allowNull: false,
			},
			status: {
				type: Sequelize.ENUM("pending", "approved", "rejected"),
				defaultValue: "pending",
			},
			reviewedBy: {
				type: Sequelize.INTEGER,
				allowNull: true,
				references: { model: "Users", key: "id" },
				onDelete: "SET NULL",
			},
			reviewedAt: {
				type: Sequelize.DATE,
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
		await queryInterface.dropTable("UserContributions");
	},
};
