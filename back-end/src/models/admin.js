"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
	class Admin extends Model {}
	Admin.init(
		{
			email: { type: DataTypes.STRING, unique: true, allowNull: false },
			password: { type: DataTypes.STRING, allowNull: false },
		},
		{
			sequelize,
			modelName: "Admin",
		}
	);
	return Admin;
};
