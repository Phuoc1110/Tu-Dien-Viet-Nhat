"use strict";

module.exports = {
	up: async (queryInterface, Sequelize) => {
		await queryInterface.createTable("ReadingPassages", {
			id: {
				type: Sequelize.INTEGER,
				autoIncrement: true,
				primaryKey: true,
				allowNull: false,
			},
			title: {
				type: Sequelize.STRING(160),
				allowNull: false,
			},
			summary: {
				type: Sequelize.STRING(255),
				allowNull: true,
			},
			content: {
				type: Sequelize.TEXT("long"),
				allowNull: false,
			},
			translation: {
				type: Sequelize.TEXT("long"),
				allowNull: true,
			},
			level: {
				type: Sequelize.ENUM("N5", "N4", "N3", "N2", "N1", "mixed"),
				allowNull: false,
				defaultValue: "mixed",
			},
			topic: {
				type: Sequelize.STRING(100),
				allowNull: true,
			},
			estimatedMinutes: {
				type: Sequelize.INTEGER,
				allowNull: false,
				defaultValue: 5,
			},
			isActive: {
				type: Sequelize.BOOLEAN,
				allowNull: false,
				defaultValue: true,
			},
			createdByAdminId: {
				type: Sequelize.INTEGER,
				allowNull: true,
				references: { model: "Users", key: "id" },
				onDelete: "SET NULL",
				onUpdate: "CASCADE",
			},
			createdAt: {
				type: Sequelize.DATE,
				allowNull: false,
				defaultValue: Sequelize.NOW,
			},
			updatedAt: {
				type: Sequelize.DATE,
				allowNull: false,
				defaultValue: Sequelize.NOW,
			},
		});

		await queryInterface.createTable("UserReadingProgresses", {
			id: {
				type: Sequelize.INTEGER,
				autoIncrement: true,
				primaryKey: true,
				allowNull: false,
			},
			userId: {
				type: Sequelize.INTEGER,
				allowNull: false,
				references: { model: "Users", key: "id" },
				onDelete: "CASCADE",
				onUpdate: "CASCADE",
			},
			passageId: {
				type: Sequelize.INTEGER,
				allowNull: false,
				references: { model: "ReadingPassages", key: "id" },
				onDelete: "CASCADE",
				onUpdate: "CASCADE",
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
				type: Sequelize.DATE,
				allowNull: false,
				defaultValue: Sequelize.NOW,
			},
			updatedAt: {
				type: Sequelize.DATE,
				allowNull: false,
				defaultValue: Sequelize.NOW,
			},
		});

		await queryInterface.addIndex("ReadingPassages", ["level"], { name: "idx_reading_passages_level" });
		await queryInterface.addIndex("ReadingPassages", ["isActive"], { name: "idx_reading_passages_active" });
		await queryInterface.addIndex("UserReadingProgresses", ["userId", "passageId"], {
			unique: true,
			name: "unique_user_reading_progress",
		});
	},

	down: async (queryInterface) => {
		await queryInterface.removeIndex("UserReadingProgresses", "unique_user_reading_progress");
		await queryInterface.removeIndex("ReadingPassages", "idx_reading_passages_active");
		await queryInterface.removeIndex("ReadingPassages", "idx_reading_passages_level");

		await queryInterface.dropTable("UserReadingProgresses");
		await queryInterface.dropTable("ReadingPassages");
	},
};
