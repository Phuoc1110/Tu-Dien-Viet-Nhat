"use strict";

module.exports = {
	async up(queryInterface) {
		const [constraints] = await queryInterface.sequelize.query(
			`
				SELECT CONSTRAINT_NAME
				FROM information_schema.KEY_COLUMN_USAGE
				WHERE TABLE_SCHEMA = DATABASE()
				  AND TABLE_NAME = 'Kanjis'
				  AND COLUMN_NAME = 'mainRadicalId'
				  AND REFERENCED_TABLE_NAME IS NOT NULL
			`
		);

		for (const constraint of constraints) {
			await queryInterface.removeConstraint("Kanjis", constraint.CONSTRAINT_NAME);
		}

		const kanjisTable = await queryInterface.describeTable("Kanjis");
		if (kanjisTable.mainRadicalId) {
			await queryInterface.removeColumn("Kanjis", "mainRadicalId");
		}

		await queryInterface.dropTable("KanjiRadicals");
		await queryInterface.dropTable("Radicals");
	},

	async down(queryInterface, Sequelize) {
		await queryInterface.createTable("Radicals", {
			id: {
				type: Sequelize.INTEGER,
				autoIncrement: true,
				primaryKey: true,
			},
			radical: {
				type: Sequelize.STRING(10),
				allowNull: false,
				unique: true,
			},
			strokeCount: {
				type: Sequelize.INTEGER,
				allowNull: false,
			},
			sinoVietnamese: {
				type: Sequelize.STRING(50),
				allowNull: true,
			},
			meaning: {
				type: Sequelize.STRING(255),
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

		await queryInterface.addColumn("Kanjis", "mainRadicalId", {
			type: Sequelize.INTEGER,
			allowNull: true,
			references: { model: "Radicals", key: "id" },
			onDelete: "SET NULL",
		});

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
};