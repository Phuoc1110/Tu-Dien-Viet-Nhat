"use strict";
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.createTable("Comments", {
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
			targetType: {
				type: Sequelize.ENUM("word", "kanji", "grammar"),
				allowNull: false,
			},
			targetId: {
				type: Sequelize.INTEGER,
				allowNull: false,
			},
			content: {
				type: Sequelize.TEXT,
				allowNull: false,
			},
			upvotes: {
				type: Sequelize.INTEGER,
				defaultValue: 0,
			},
			isHidden: {
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

		await queryInterface.addIndex("Comments", ["targetType", "targetId"], {
			name: "idx_comment_target",
		});
	},
	async down(queryInterface) {
		await queryInterface.dropTable("Comments");
	},
};
