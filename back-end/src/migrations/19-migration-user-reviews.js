"use strict";
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.createTable("UserReviews", {
			id: {
				type: Sequelize.INTEGER,
				autoIncrement: true,
				primaryKey: true,
			},
			userId: {
				type: Sequelize.INTEGER,
				allowNull: false,
				references: { model: "Users", key: "id" },
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
			easeFactor: {
				type: Sequelize.FLOAT,
				defaultValue: 2.5,
			},
			intervalDays: {
				type: Sequelize.INTEGER,
				defaultValue: 1,
			},
			nextReviewAt: {
				type: Sequelize.DATE,
				allowNull: true,
			},
			lastReviewedAt: {
				type: Sequelize.DATE,
				allowNull: true,
			},
			reviewCount: {
				type: Sequelize.INTEGER,
				defaultValue: 0,
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

		await queryInterface.addIndex("UserReviews", ["userId", "itemType", "itemId"], {
			unique: true,
			name: "unique_user_review_item",
		});
		await queryInterface.addIndex("UserReviews", ["userId", "nextReviewAt"], {
			name: "idx_user_next_review",
		});
	},
	async down(queryInterface) {
		await queryInterface.dropTable("UserReviews");
	},
};
