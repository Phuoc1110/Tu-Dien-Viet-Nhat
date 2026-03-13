import React from "react";
import { Switch, Route } from "react-router-dom";
import HomePage from "../pages/Home/HomePage";
import Login from "../pages/Login/Login";
import Register from "../pages/Register/Register";
import PrivateRoutes from "./PrivateRoutes";

const ClientRoute = () => {
	return (
		<div>
			<Switch>
				<Route path="/" exact>
					<HomePage />
				</Route>
				<Route path="/login" component={Login} />
				<Route path="/register" component={Register} />
				<Route path="*">404 Not Found</Route>
			</Switch>
		</div>
	);
};

export default ClientRoute;
