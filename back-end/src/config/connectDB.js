const { Sequelize } = require("sequelize");
require("dotenv").config();
// import fs from "fs";
// import path from "path";
const sequelize = new Sequelize(
	process.env.DB_NAME,
	process.env.DB_USER,
	process.env.DB_PASSWORD,
	{
		host: process.env.DB_HOST,
		dialect: "mysql",
		port: process.env.DB_PORT,
		// dialectOptions: {
		// 	ssl: {
		// 		require: true,
		// 		rejectUnauthorized: true,
		// 	},
		// },
	}
);

let connectDB = async () => {
	try {
		await sequelize.authenticate();
		console.log("Connection has been established successfully.");
	} catch (error) {
		console.error("Unable to connect to the database:", error);
	}
};
module.exports = connectDB;
