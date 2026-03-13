"use strict";
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.createTable("GrammarExamples", {
			id: {
				type: Sequelize.INTEGER,
				autoIncrement: true,
				primaryKey: true,
			},
			grammarId: {
				type: Sequelize.INTEGER,
				allowNull: false,
				references: { model: "Grammars", key: "id" },
				onDelete: "CASCADE",
			},
			japaneseSentence: {
				type: Sequelize.TEXT,
				allowNull: false,
			},
			readingSentence: {
				type: Sequelize.TEXT,
				allowNull: true,
			},
			vietnameseTranslation: {
				type: Sequelize.TEXT,
				allowNull: false,
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
		await queryInterface.dropTable("GrammarExamples");
	},
};
