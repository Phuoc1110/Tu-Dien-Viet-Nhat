import React, { useContext } from "react";
import { Switch, Route, Redirect } from "react-router-dom";
import HomePage from "../pages/Home/HomePage";
import Login from "../pages/Login/Login";
import Register from "../pages/Register/Register";
import DictionaryPage from "../pages/Dictionary/DictionaryPage";
import KanjiPage from "../pages/Kanji/KanjiPage";
import PrivateRoutes from "./PrivateRoutes";
import Profile from "../pages/Profile/Profile";
import { UserContext } from "../Context/UserProvider";

const ClientRoute = () => {
	const { user } = useContext(UserContext);

	return (
		<div>
			<Switch>
				<Route path="/" exact>
					<HomePage />
				</Route>
				<Route path="/login" component={Login} />
				<Route path="/register" component={Register} />
				<Route path="/dictionary" component={DictionaryPage} />
				<Route path="/kanji" component={KanjiPage} />
				<Route path="/search-word">
					<Redirect to="/" />
				</Route>
				<Route path="/profile" exact>
					{user?.isAuthenticated && user?.account?.id ? (
						<Redirect to={`/profile/${user.account.id}`} />
					) : (
						<Redirect to="/login" />
					)}
				</Route>
				<PrivateRoutes path="/profile/:id" component={Profile} />
				<Route path="*">404 Not Found</Route>
			</Switch>
		</div>
	);
};

export default ClientRoute;
