import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { loginUser, registerUser } from "../../services/userService";

const initialState = {
	user: null,
	isLoading: false,
	isAuthenticated: false,
	error: null,
};

// Async thunk cho login
export const login = createAsyncThunk(
	"auth/login",
	async (formValues, { rejectWithValue }) => {
		try {
			const response = await loginUser(formValues);
			return response.data;
		} catch (error) {
			return rejectWithValue(error.response.data);
		}
	}
);

// Async thunk cho register
export const register = createAsyncThunk(
	"auth/register",
	async (formValues, { rejectWithValue }) => {
		try {
			const response = await registerUser(formValues);
			return response.data;
		} catch (error) {
			return rejectWithValue(error.response.data);
		}
	}
);

const authSlice = createSlice({
	name: "auth",
	initialState,
	reducers: {
		logout: (state) => {
			state.user = null;
			state.isAuthenticated = false;
		},
	},
	extraReducers: (builder) => {
		builder
			.addCase(login.pending, (state) => {
				state.isLoading = true;
				state.error = null;
			})
			.addCase(login.fulfilled, (state, action) => {
				state.isLoading = false;
				state.isAuthenticated = true;
				state.user = action.payload;
			})
			.addCase(login.rejected, (state, action) => {
				state.isLoading = false;
				state.error = action.payload;
			})
			.addCase(register.pending, (state) => {
				state.isLoading = true;
				state.error = null;
			})
			.addCase(register.fulfilled, (state, action) => {
				state.isLoading = false;
				state.isAuthenticated = true;
				state.user = action.payload;
			})
			.addCase(register.rejected, (state, action) => {
				state.isLoading = false;
				state.error = action.payload;
			});
	},
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;
