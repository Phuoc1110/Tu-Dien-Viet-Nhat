"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		const tableInfo = await queryInterface.describeTable("UserReviews");

		try {
			await queryInterface.removeIndex("UserReviews", ["userId", "nextReviewAt"]);
		} catch (error) {
			// Index may already be absent in some environments.
		}

		if (tableInfo.nextReviewAt) {
			await queryInterface.removeColumn("UserReviews", "nextReviewAt");
		}

		if (tableInfo.reviewCount) {
			await queryInterface.removeColumn("UserReviews", "reviewCount");
		}
	},

	async down(queryInterface, Sequelize) {
		const tableInfo = await queryInterface.describeTable("UserReviews");

		if (!tableInfo.nextReviewAt) {
			await queryInterface.addColumn("UserReviews", "nextReviewAt", {
				type: Sequelize.DATE,
				allowNull: true,
			});
		}

		if (!tableInfo.reviewCount) {
			await queryInterface.addColumn("UserReviews", "reviewCount", {
				type: Sequelize.INTEGER,
				defaultValue: 0,
			});
		}

		await queryInterface.addIndex("UserReviews", ["userId", "nextReviewAt"], {
			name: "user_reviews_user_id_next_review_at",
		});
	},
};