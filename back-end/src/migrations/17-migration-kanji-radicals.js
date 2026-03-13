"use strict";
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.createTable("KanjiRadicals", {
			kanjiId: {
				type: Sequelize.INTEGER,
				allowNull: false,
				references: { model: "Kanjis", key: "id" },
				onDelete: "CASCADE",
				primaryKey: true,
			},
			radicalId: {
				type: Sequelize.INTEGER,
				allowNull: false,
				references: { model: "Radicals", key: "id" },
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
		await queryInterface.dropTable("KanjiRadicals");
	},
};
