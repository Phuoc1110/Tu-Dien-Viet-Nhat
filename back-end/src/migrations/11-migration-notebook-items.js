"use strict";
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.createTable("NotebookItems", {
			id: {
				type: Sequelize.INTEGER,
				autoIncrement: true,
				primaryKey: true,
			},
			notebookId: {
				type: Sequelize.INTEGER,
				allowNull: false,
				references: { model: "Notebooks", key: "id" },
				onDelete: "CASCADE",
			},
			itemType: {
				type: Sequelize.ENUM("word", "kanji", "grammar"),
				allowNull: false,
			},
			itemId: {
				type: Sequelize.INTEGER,
				allowNull: false,
			},
			addedAt: {
				type: Sequelize.DATE,
				defaultValue: Sequelize.NOW,
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

		// Unique constraint
		await queryInterface.addIndex("NotebookItems", ["notebookId", "itemType", "itemId"], {
			unique: true,
			name: "unique_notebook_item",
		});
	},
	async down(queryInterface) {
		await queryInterface.dropTable("NotebookItems");
	},
};
