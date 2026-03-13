"use strict";
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.createTable("WordKanjis", {
			wordId: {
				type: Sequelize.INTEGER,
				allowNull: false,
				references: { model: "Words", key: "id" },
				onDelete: "CASCADE",
				primaryKey: true,
			},
			kanjiId: {
				type: Sequelize.INTEGER,
				allowNull: false,
				references: { model: "Kanjis", key: "id" },
				onDelete: "CASCADE",
				primaryKey: true,
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
		await queryInterface.dropTable("WordKanjis");
	},
};
