"use strict";

const normalizeTables = (tables) =>
	new Set(
		tables
			.map((table) => {
				if (typeof table === "string") {
					return table;
				}
				return table?.tableName || table?.name || "";
			})
			.filter(Boolean)
	);

module.exports = {
	up: async (queryInterface, Sequelize) => {
		const tables = await queryInterface.showAllTables();
		const tableSet = normalizeTables(tables);

		if (tableSet.has("UserReadingProgresses")) {
			await queryInterface.dropTable("UserReadingProgresses");
		}

		if (tableSet.has("UserContributions")) {
			await queryInterface.dropTable("UserContributions");
		}
	},

	down: async (queryInterface, Sequelize) => {
		const tables = await queryInterface.showAllTables();
		const tableSet = normalizeTables(tables);

		if (!tableSet.has("UserReadingProgresses")) {
			await queryInterface.createTable("UserReadingProgresses", {
				id: {
					allowNull: false,
					autoIncrement: true,
					primaryKey: true,
					type: Sequelize.INTEGER,
				},
				userId: {
					type: Sequelize.INTEGER,
					allowNull: false,
					references: { model: "Users", key: "id" },
					onDelete: "CASCADE",
				},
				passageId: {
					type: Sequelize.INTEGER,
					allowNull: false,
					references: { model: "ReadingPassages", key: "id" },
					onDelete: "CASCADE",
				},
				status: {
					type: Sequelize.ENUM("not_started", "in_progress", "completed"),
					allowNull: false,
					defaultValue: "not_started",
				},
				lastReadAt: {
					type: Sequelize.DATE,
					allowNull: true,
				},
				completedAt: {
					type: Sequelize.DATE,
					allowNull: true,
				},
				createdAt: {
					allowNull: false,
					type: Sequelize.DATE,
				},
				updatedAt: {
					allowNull: false,
					type: Sequelize.DATE,
				},
			});

			try {
				await queryInterface.addIndex("UserReadingProgresses", ["userId", "passageId"], {
					unique: true,
					name: "unique_user_reading_progress",
				});
			} catch (error) {
				// Index might already exist
			}
		}

		if (!tableSet.has("UserContributions")) {
			await queryInterface.createTable("UserContributions", {
				id: {
					allowNull: false,
					autoIncrement: true,
					primaryKey: true,
					type: Sequelize.INTEGER,
				},
				userId: {
					type: Sequelize.INTEGER,
					allowNull: false,
					references: { model: "Users", key: "id" },
					onDelete: "CASCADE",
				},
				targetType: {
					type: Sequelize.ENUM("word", "kanji", "grammar"),
					allowNull: false,
				},
				targetId: {
					type: Sequelize.INTEGER,
					allowNull: true,
				},
				proposedContent: {
					type: Sequelize.JSON,
					allowNull: false,
				},
				status: {
					type: Sequelize.ENUM("pending", "approved", "rejected"),
					defaultValue: "pending",
				},
				reviewedBy: {
					type: Sequelize.INTEGER,
					allowNull: true,
					references: { model: "Users", key: "id" },
					onDelete: "SET NULL",
				},
				reviewedAt: {
					type: Sequelize.DATE,
					allowNull: true,
				},
				createdAt: {
					allowNull: false,
					type: Sequelize.DATE,
				},
				updatedAt: {
					allowNull: false,
					type: Sequelize.DATE,
				},
			});
		}
	},
};
