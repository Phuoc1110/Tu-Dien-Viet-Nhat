"use strict";
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.createTable("Kanjis", {
			id: {
				type: Sequelize.INTEGER,
				autoIncrement: true,
				primaryKey: true,
			},
			characterKanji: {
				type: Sequelize.STRING(10),
				allowNull: false,
				unique: true,
			},
			sinoVietnamese: {
				type: Sequelize.STRING(50),
				allowNull: true,
			},
			meaning: {
				type: Sequelize.STRING(255),
				allowNull: true,
			},
			onyomi: {
				type: Sequelize.STRING(255),
				allowNull: true,
			},
			kunyomi: {
				type: Sequelize.STRING(255),
				allowNull: true,
			},
			strokeCount: {
				type: Sequelize.INTEGER,
				allowNull: true,
			},
			jlptLevel: {
				type: Sequelize.INTEGER,
				allowNull: true,
			},
			mainRadicalId: {
				type: Sequelize.INTEGER,
				allowNull: true,
				references: { model: "Radicals", key: "id" },
				onDelete: "SET NULL",
			},
			strokePaths: {
				type: Sequelize.JSON,
				allowNull: true,
			},
			components: {
				type: Sequelize.STRING(100),
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

		await queryInterface.addIndex("Kanjis", ["characterKanji"], {
			name: "idx_kanji_character",
		});
	},
	async down(queryInterface) {
		await queryInterface.dropTable("Kanjis");
	},
};
