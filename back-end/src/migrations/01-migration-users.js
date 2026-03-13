"use strict";
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.createTable("Users", {
			id: {
				type: Sequelize.INTEGER,
				autoIncrement: true,
				primaryKey: true,
			},
			username: {
				type: Sequelize.STRING(50),
				allowNull: false,
				unique: true,
			},
			email: {
				type: Sequelize.STRING(100),
				allowNull: false,
				unique: true,
			},
			passwordHash: {
				type: Sequelize.STRING(255),
				allowNull: false,
			},
			avatarUrl: {
				type: Sequelize.STRING(255),
				allowNull: true,
			},
			role: {
				type: Sequelize.ENUM("user", "moderator", "admin"),
				defaultValue: "user",
			},
			status: {
				type: Sequelize.ENUM("active", "banned", "suspended"),
				defaultValue: "active",
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
	async down(queryInterface) {
		await queryInterface.dropTable("Users");
	},
};
