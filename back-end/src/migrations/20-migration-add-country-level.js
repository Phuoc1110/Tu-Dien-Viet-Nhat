"use strict";
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.addColumn("Users", "country", {
			type: Sequelize.STRING(100),
			allowNull: true,
			defaultValue: null,
		});
		await queryInterface.addColumn("Users", "level", {
			type: Sequelize.ENUM("N5", "N4", "N3", "N2", "N1"),
			allowNull: true,
			defaultValue: "N5",
		});
	},
	async down(queryInterface) {
		await queryInterface.removeColumn("Users", "country");
		await queryInterface.removeColumn("Users", "level");
	},
};
