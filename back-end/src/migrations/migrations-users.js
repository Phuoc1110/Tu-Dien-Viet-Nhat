"use strict";
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.createTable("Users", {
			id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
			fullName: { type: Sequelize.STRING },
			email: { type: Sequelize.STRING, unique: true },
			passwordHash: { type: Sequelize.STRING },
			profilePicture: { type: Sequelize.STRING },
			bio: { type: Sequelize.TEXT },
			trustScore: { type: Sequelize.INTEGER, defaultValue: 0 },
			role: { type: Sequelize.STRING, defaultValue: "user" },
			phone: { type: Sequelize.STRING },
			lastActive: { type: Sequelize.DATE },
			gender: { type: Sequelize.STRING },
			status: { type: Sequelize.STRING, defaultValue: "active" },
			blockedUntil: { type: Sequelize.DATE },
			suspendedUntil: { type: Sequelize.DATE },
			createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
			updatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
		});
	},
	async down(queryInterface, Sequelize) {
		await queryInterface.dropTable("Users");
	},
};
