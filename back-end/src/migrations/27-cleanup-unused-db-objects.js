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
		const dialect = queryInterface.sequelize.getDialect();

		if (tableSet.has("Admins")) {
			await queryInterface.dropTable("Admins");
		}

		if (tableSet.has("Reports")) {
			await queryInterface.dropTable("Reports");
		}

		if (tableSet.has("WordRelations")) {
			await queryInterface.dropTable("WordRelations");
		}

		if (tableSet.has("Kanjis")) {
			const kanjiTable = await queryInterface.describeTable("Kanjis");
			if (kanjiTable.mainRadicalId) {
				if (dialect === "mysql" || dialect === "mariadb") {
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
				}

				await queryInterface.removeColumn("Kanjis", "mainRadicalId");
			}
		}

		if (tableSet.has("KanjiRadicals")) {
			await queryInterface.dropTable("KanjiRadicals");
		}

		if (tableSet.has("Radicals")) {
			await queryInterface.dropTable("Radicals");
		}

		const flashcardTable = tableSet.has("UserFlashcardStatuses")
			? "UserFlashcardStatuses"
			: tableSet.has("UserReviews")
				? "UserReviews"
				: null;

		if (flashcardTable) {
			const tableInfo = await queryInterface.describeTable(flashcardTable);
			const columnsToRemove = ["last_mode", "easeFactor", "intervalDays"];
			for (const columnName of columnsToRemove) {
				if (tableInfo[columnName]) {
					await queryInterface.removeColumn(flashcardTable, columnName);
				}
			}
		}
	},

	down: async (queryInterface, Sequelize) => {
		const tables = await queryInterface.showAllTables();
		const tableSet = normalizeTables(tables);

		if (!tableSet.has("Admins")) {
			await queryInterface.createTable("Admins", {
				id: {
					allowNull: false,
					autoIncrement: true,
					primaryKey: true,
					type: Sequelize.INTEGER,
				},
				email: {
					type: Sequelize.STRING,
					allowNull: false,
					unique: true,
				},
				password: {
					type: Sequelize.STRING,
					allowNull: false,
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

		if (!tableSet.has("Reports")) {
			await queryInterface.createTable("Reports", {
				id: {
					type: Sequelize.INTEGER,
					autoIncrement: true,
					primaryKey: true,
				},
				reporterId: {
					type: Sequelize.INTEGER,
					allowNull: false,
					references: { model: "Users", key: "id" },
					onDelete: "CASCADE",
				},
				targetType: {
					type: Sequelize.ENUM("comment", "word", "kanji"),
					allowNull: false,
				},
				targetId: {
					type: Sequelize.INTEGER,
					allowNull: false,
				},
				reason: {
					type: Sequelize.TEXT,
					allowNull: false,
				},
				status: {
					type: Sequelize.ENUM("pending", "reviewed", "resolved", "dismissed"),
					defaultValue: "pending",
				},
				resolvedBy: {
					type: Sequelize.INTEGER,
					allowNull: true,
					references: { model: "Users", key: "id" },
					onDelete: "SET NULL",
				},
				resolvedAt: {
					type: Sequelize.DATE,
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
		}

		if (!tableSet.has("WordRelations")) {
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

			try {
				await queryInterface.addIndex("WordRelations", ["wordId", "relatedWordId", "relationType"], {
					unique: true,
					name: "unique_word_relation",
				});
			} catch (error) {
				// Index may already exist depending on the database engine.
			}
		}

		if (!tableSet.has("Radicals")) {
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
		}

		if (tableSet.has("Kanjis")) {
			const kanjiTable = await queryInterface.describeTable("Kanjis");
			if (!kanjiTable.mainRadicalId) {
				await queryInterface.addColumn("Kanjis", "mainRadicalId", {
					type: Sequelize.INTEGER,
					allowNull: true,
					references: { model: "Radicals", key: "id" },
					onDelete: "SET NULL",
				});
			}
		}

		if (!tableSet.has("KanjiRadicals")) {
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
		}

		const flashcardTable = tableSet.has("UserFlashcardStatuses")
			? "UserFlashcardStatuses"
			: tableSet.has("UserReviews")
				? "UserReviews"
				: null;

		if (flashcardTable) {
			const tableInfo = await queryInterface.describeTable(flashcardTable);

			if (!tableInfo.last_mode) {
				await queryInterface.addColumn(flashcardTable, "last_mode", {
					type: Sequelize.ENUM("reading", "meaning", "kanji"),
					allowNull: true,
					defaultValue: null,
				});
			}

			if (!tableInfo.easeFactor) {
				await queryInterface.addColumn(flashcardTable, "easeFactor", {
					type: Sequelize.FLOAT,
					defaultValue: 2.5,
				});
			}

			if (!tableInfo.intervalDays) {
				await queryInterface.addColumn(flashcardTable, "intervalDays", {
					type: Sequelize.INTEGER,
					defaultValue: 1,
				});
			}
		}
	},
};
