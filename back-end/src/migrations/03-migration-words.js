"use strict";
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.createTable("Words", {
			id: {
				type: Sequelize.INTEGER,
				autoIncrement: true,
				primaryKey: true,
			},
			word: {
				type: Sequelize.STRING(100),
				allowNull: false,
			},
			reading: {
				type: Sequelize.STRING(100),
				allowNull: false,
			},
			romaji: {
				type: Sequelize.STRING(100),
				allowNull: true,
			},
			jlptLevel: {
				type: Sequelize.INTEGER,
				allowNull: true,
			},
			audioUrl: {
				type: Sequelize.STRING(255),
				allowNull: true,
			},
			isCommon: {
				type: Sequelize.BOOLEAN,
				defaultValue: false,
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

		// Indexes
		await queryInterface.addIndex("Words", ["word"], { name: "idx_word" });
		await queryInterface.addIndex("Words", ["reading"], { name: "idx_reading" });
	},
	async down(queryInterface) {
		await queryInterface.dropTable("Words");
	},
};
