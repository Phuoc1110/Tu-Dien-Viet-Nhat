"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		const tables = await queryInterface.showAllTables();
		const hasOldTable = tables.includes("UserReviews");
		const hasNewTable = tables.includes("UserFlashcardStatuses");

		if (hasOldTable && !hasNewTable) {
			await queryInterface.renameTable("UserReviews", "UserFlashcardStatuses");
		}

		const tableName = hasNewTable || hasOldTable ? "UserFlashcardStatuses" : "UserFlashcardStatuses";
		const tableInfo = await queryInterface.describeTable(tableName);

		const columnsToRemove = ["srs_stage", "last_mode", "easeFactor", "intervalDays"];
		for (const columnName of columnsToRemove) {
			if (tableInfo[columnName]) {
				await queryInterface.removeColumn(tableName, columnName);
			}
		}

		if (!tableInfo.isRemembered) {
			await queryInterface.addColumn(tableName, "isRemembered", {
				type: Sequelize.BOOLEAN,
				allowNull: false,
				defaultValue: false,
			});
		}

		if (!tableInfo.lastReviewedAt) {
			await queryInterface.addColumn(tableName, "lastReviewedAt", {
				type: Sequelize.DATE,
				allowNull: true,
			});
		}

		try {
			await queryInterface.addIndex(tableName, ["userId", "itemType", "itemId"], {
				unique: true,
				name: "unique_user_flashcard_status_item",
			});
		} catch (error) {
			// Index may already exist depending on the database engine.
		}
	},

	async down(queryInterface, Sequelize) {
		const tables = await queryInterface.showAllTables();
		const hasNewTable = tables.includes("UserFlashcardStatuses");
		const hasOldTable = tables.includes("UserReviews");

		if (hasNewTable && !hasOldTable) {
			await queryInterface.renameTable("UserFlashcardStatuses", "UserReviews");
		}

		const tableName = hasOldTable || hasNewTable ? "UserReviews" : "UserReviews";
		const tableInfo = await queryInterface.describeTable(tableName);

		if (tableInfo.isRemembered) {
			await queryInterface.removeColumn(tableName, "isRemembered");
		}

		if (!tableInfo.srs_stage) {
			await queryInterface.addColumn(tableName, "srs_stage", {
				type: Sequelize.INTEGER,
				allowNull: false,
				defaultValue: 0,
				comment: "SRS stage kept for backward compatibility",
			});
		}

		if (!tableInfo.last_mode) {
			await queryInterface.addColumn(tableName, "last_mode", {
				type: Sequelize.ENUM("reading", "meaning", "kanji"),
				allowNull: true,
				defaultValue: null,
			});
		}
	},
};