"use strict";
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.createTable("WordRelations", {
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
			relatedWordId: {
				type: Sequelize.INTEGER,
				allowNull: false,
				references: { model: "Words", key: "id" },
				onDelete: "CASCADE",
			},
			relationType: {
				type: Sequelize.ENUM("synonym", "antonym", "related"),
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

		await queryInterface.addIndex("WordRelations", ["wordId", "relatedWordId", "relationType"], {
			unique: true,
			name: "unique_word_relation",
		});
	},
	async down(queryInterface) {
		await queryInterface.dropTable("WordRelations");
	},
};
