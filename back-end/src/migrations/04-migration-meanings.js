"use strict";
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.createTable("Meanings", {
			id: {
				type: Sequelize.INTEGER,
				autoIncrement: true,
				primaryKey: true,
			},
			wordId: {
				type: Sequelize.INTEGER,
				allowNull: false,
				references: { model: "Words", key: "id" },
				onDelete: "CASCADE",
			},
			partOfSpeech: {
				type: Sequelize.STRING(50),
				allowNull: true,
			},
			definition: {
				type: Sequelize.TEXT,
				allowNull: false,
			},
			language: {
				type: Sequelize.STRING(10),
				defaultValue: "vi",
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
		await queryInterface.dropTable("Meanings");
	},
};
