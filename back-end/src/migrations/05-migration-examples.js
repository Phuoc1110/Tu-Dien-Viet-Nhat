"use strict";
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.createTable("Examples", {
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
			japaneseSentence: {
				type: Sequelize.TEXT,
				allowNull: false,
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
		await queryInterface.dropTable("Examples");
	},
};
