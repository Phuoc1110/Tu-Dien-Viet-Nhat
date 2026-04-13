import React, { useContext } from "react";
import { Switch, Route, Redirect } from "react-router-dom";
import HomePage from "../pages/Home/HomePage";
import Login from "../pages/Login/Login";
import Register from "../pages/Register/Register";
import DictionaryPage from "../pages/Dictionary/DictionaryPage";
import KanjiPage from "../pages/Kanji/KanjiPage";
import SentencePage from "../pages/Sentence/SentencePage";
import GrammarPage from "../pages/Grammar/GrammarPage";
import NotebookPage from "../pages/Notebook/NotebookPage";
import NotebookDetailPage from "../pages/Notebook/NotebookDetailPage";
import JpltPage from "../pages/Jplt/JpltPage";
import PrivateRoutes from "./PrivateRoutes";
import PrivateRoutesRole from "./PrivateRoutesRole";
import Profile from "../pages/Profile/Profile";
import LoginAdmin from "../pages/Admin/Login/LoginAdmin";
import Admin from "../pages/Admin/Admin";
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
				<Route path="/login_admin" component={LoginAdmin} />
				<Route path="/admin_login" component={LoginAdmin} />
				<PrivateRoutesRole path="/admin" role="admin" component={Admin} />
				<Route path="/dictionary" component={DictionaryPage} />
				<Route path="/kanji" component={KanjiPage} />
				<Route path="/sentence" component={SentencePage} />
				<Route path="/grammar" component={GrammarPage} />
				<Route path="/notebook" exact component={NotebookPage} />
				<Route path="/notebook/:id" component={NotebookDetailPage} />
				<Route path={["/jplt", "/jlpt"]} component={JpltPage} />
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
