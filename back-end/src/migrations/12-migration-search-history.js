"use strict";
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.createTable("SearchHistories", {
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
			searchTerm: {
				type: Sequelize.STRING(100),
				allowNull: false,
			},
			searchedAt: {
				type: Sequelize.DATE,
				defaultValue: Sequelize.NOW,
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

		await queryInterface.addIndex("SearchHistories", ["userId"], {
			name: "idx_search_history_user",
		});
	},
	async down(queryInterface) {
		await queryInterface.dropTable("SearchHistories");
	},
};
