"use strict";
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.createTable("Reports", {
			id: {
				type: Sequelize.INTEGER,
				autoIncrement: true,
				primaryKey: true,
			},
			reporterId: {
				type: Sequelize.INTEGER,
				allowNull: false,
				references: { model: "Users", key: "id" },
				onDelete: "CASCADE",
			},
			targetType: {
				type: Sequelize.ENUM("comment", "word", "kanji"),
				allowNull: false,
			},
			targetId: {
				type: Sequelize.INTEGER,
				allowNull: false,
			},
			reason: {
				type: Sequelize.TEXT,
				allowNull: false,
			},
			status: {
				type: Sequelize.ENUM("pending", "reviewed", "resolved", "dismissed"),
				defaultValue: "pending",
			},
			resolvedBy: {
				type: Sequelize.INTEGER,
				allowNull: true,
				references: { model: "Users", key: "id" },
				onDelete: "SET NULL",
			},
			resolvedAt: {
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
		await queryInterface.dropTable("Reports");
	},
};
