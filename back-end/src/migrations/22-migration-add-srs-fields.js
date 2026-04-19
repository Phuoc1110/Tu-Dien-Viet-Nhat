"use strict";
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.addColumn("UserReviews", "srs_stage", {
			type: Sequelize.INTEGER,
			allowNull: false,
			defaultValue: 0,
			comment: "SRS stage: 0 (new), 1-5 (learning), 6 (mastered)",
		});

		await queryInterface.addColumn("UserReviews", "last_mode", {
			type: Sequelize.ENUM("reading", "meaning", "kanji"),
			allowNull: true,
			defaultValue: null,
			comment: "Last quiz type: reading (cách đọc), meaning (ý nghĩa), kanji (mặt chữ)",
		});
	},

	async down(queryInterface) {
		await queryInterface.removeColumn("UserReviews", "srs_stage");
		await queryInterface.removeColumn("UserReviews", "last_mode");
	},
};
