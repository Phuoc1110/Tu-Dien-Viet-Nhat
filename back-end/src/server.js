import express from "express";
import bodyParser from "body-parser";
import initWebRouters from "./routes/web";
import cors from "cors";
import connectDB from "../src/config/connectDB";
import cookieParser from "cookie-parser";
import passport from "passport";
import http from "http";
import { initSocket } from "./socket/socket";
// import configSession from "../src/config/session";
// import LoginWithGoogle from "../src/controllers/social/googleController";
// import LoginWithFacebook from "./controllers/social/facebookController";
require("dotenv").config();

let app = express();
app.use(
	cors({
		credentials: true,
		origin: true,
		exposedHeaders: ["Authorization", , "X-User-Updated"],
	})
);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(cookieParser());
// configSession(app);
initWebRouters(app);

connectDB();
const server = http.createServer(app);
initSocket(server);

app.use((req, res) => {
	return res.send("404 Not Found");
});

let port = process.env.PORT || 6969;
server.listen(port, () => {
	console.log("Backend Nodejs is running on the port: " + port);
});
// app.use(passport.initialize());
// app.use(passport.session());
// LoginWithGoogle();
// LoginWithFacebook();
