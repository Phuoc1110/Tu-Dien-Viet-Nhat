import axios from "axios";

// Set config defaults when creating the instance
const instance = axios.create({
	baseURL: process.env.REACT_APP_API_URL,
});

instance.defaults.withCredentials = true;
// Alter defaults after instance has been created
// instance.defaults.headers.common["Authorization"] = AUTH_TOKEN;

instance.interceptors.request.use(
	function (config) {
		// Do something before request is sent
		return config;
	},
	function (error) {
		// Do something with request error
		return Promise.reject(error);
	}
);
// Add a response interceptor
instance.interceptors.response.use(
	function (response) {
		// Any status code that lie within the range of 2xx cause this function to trigger
		// Do something with response data
		if (response.headers["x-user-updated"] === "true") {
			// Optionally, you can handle any client-side updates here if needed
			const event = new CustomEvent("userStatusChanged");
			window.dispatchEvent(event);
		}
		return response.data;
	},
	function (err) {
		// Any status codes that falls outside the range of 2xx cause this function to trigger
		// Do something with response error
		const status = (err && err.response && err.response.status) || 500;
		switch (status) {
			// authentication (token related issues)
			case 401: {
				// if (err && err.response.data.errCode === -2) {
				// 	alert("Token has expired. Please log in again.");
				// 	window.location.href = "/login";
				// }
				return err.response.data;
			}

			// forbidden (permission related issues)
			case 403: {
				return err.response.data;
			}

			// bad request
			case 400: {
				return err.response.data;
			}

			// not found
			case 404: {
				return err.response.data;
			}

			// conflict
			case 409: {
				return err.response.data;
			}

			// unprocessable
			case 422: {
				return err.response.data;
			}

			// generic api error (server related) unexpected
			default: {
				if (err && err.response.data.errCode === -2) {
					alert("Token has expired. Please log in again.");
					window.location.href = "/login";
				}
				return err.response.data;
			}
		}
	}
);

export default instance;
