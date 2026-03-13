const path = require("path");

require("dotenv").config({
	path: path.resolve(__dirname, "../../.env"),
});
// const useSSL = process.env.DB_SSL === "true";
// const rejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false";

// const dialectOptions = useSSL
// 	? {
// 			ssl: {
// 				require: true,
// 				rejectUnauthorized,
// 			},
// 	  }
// 	: {};

module.exports = {
	development: {
		username: process.env.DB_USER,
		password: process.env.DB_PASSWORD,
		database: process.env.DB_NAME,
		host: process.env.DB_HOST,
		dialect: "mysql",
		port: process.env.DB_PORT,
		// dialectOptions,
	},
	production: {
		username: process.env.DB_USER,
		password: process.env.DB_PASSWORD,
		database: process.env.DB_NAME,
		host: process.env.DB_HOST,
		dialect: "mysql",
		port: process.env.DB_PORT,
		// dialectOptions,
	},
};
