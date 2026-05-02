import { Fragment, useContext } from "react";
import "./App.css";
import ClientRoute from "./Routes/ClientRoute";
import { Oval } from "react-loader-spinner";
import { UserContext } from "./Context/UserProvider";
import { BrowserRouter as Router } from "react-router-dom";
import { Bounce, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Navbar from "./components/Navbar/Navbar";
import Footer from "./components/Footer/Footer";
import SelectionLookup from "./components/SelectionLookup/SelectionLookup";

function App() {
	const { user } = useContext(UserContext);
	return (
		<Fragment>
			<Router>
				{user && user.isLoading ? (
					<div className="loading-container">
						<Oval
							visible={true}
							height="80"
							width="80"
							color="#4fa94d"
							ariaLabel="oval-loading"
							wrapperStyle={{}}
							wrapperClass=""
						/>
						<div>Loading...</div>
					</div>
				) : (
					<div className="app-layout">
						<Navbar />
						<main className="app-content">
							<ClientRoute />
						</main>
						<Footer />
					</div>
				)}
				<SelectionLookup />
			</Router>
			<ToastContainer
				position="top-right"
				autoClose={5000}
				hideProgressBar={false}
				newestOnTop={false}
				closeOnClick={false}
				rtl={false}
				pauseFocusLoss
				draggable
				pauseOnHover
				theme="dark"
				transition={Bounce}
			/>
		</Fragment>
	);
}

export default App;
