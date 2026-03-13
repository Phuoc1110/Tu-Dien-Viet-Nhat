import React, { useContext } from "react";
import { Route, Redirect } from "react-router-dom/cjs/react-router-dom.min";
import { UserContext } from "../Context/UserProvider";

const PrivateRoutes = (props) => {
	const { user } = useContext(UserContext);
	if (user && user.isAuthenticated === true) {
		return (
			<div>
				<Route path={props.path} component={props.component} />
			</div>
		);
	} else {
		return <Redirect to="/login"></Redirect>;
	}
};

export default PrivateRoutes;
