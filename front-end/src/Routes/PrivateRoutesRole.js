import React, { useContext } from "react";
import { Route, Redirect } from "react-router-dom";
import { UserContext } from "../Context/UserProvider";

const PrivateRoutesRole = ({ component: Component, role, ...rest }) => {
	const { user, admin } = useContext(UserContext);
	return (
		<Route
			{...rest}
			render={(props) =>
				(user && user.isAuthenticated && user.account.role === role) ||
				admin.isAuthenticated ? (
					<Component {...props} />
				) : (
					<Redirect
						to={{
							pathname: user.account.role,
							state: { from: props.location },
						}}
					/>
				)
			}
		/>
	);
};

export default PrivateRoutesRole;
