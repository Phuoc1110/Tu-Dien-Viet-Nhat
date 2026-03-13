import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
	createNewUser,
	getUsers,
	deleteUser,
} from "../../services/userService";

const initialState = {
	users: [],
	isLoading: false,
	error: null,
};

// Async thunk cho CRUD user
export const fetchUsers = createAsyncThunk(
	"user/fetchUsers",
	async (_, { rejectWithValue }) => {
		try {
			const response = await getUsers();
			return response.data;
		} catch (error) {
			return rejectWithValue(error.response.data);
		}
	}
);

export const createUser = createAsyncThunk(
	"user/createUser",
	async (data, { rejectWithValue }) => {
		try {
			const response = await createNewUser(data);
			return response.data;
		} catch (error) {
			return rejectWithValue(error.response.data);
		}
	}
);

export const removeUser = createAsyncThunk(
	"user/removeUser",
	async (id, { rejectWithValue }) => {
		try {
			await deleteUser(id);
			return id;
		} catch (error) {
			return rejectWithValue(error.response.data);
		}
	}
);

const userSlice = createSlice({
	name: "user",
	initialState,
	reducers: {},
	extraReducers: (builder) => {
		builder
			.addCase(fetchUsers.pending, (state) => {
				state.isLoading = true;
			})
			.addCase(fetchUsers.fulfilled, (state, action) => {
				state.isLoading = false;
				state.users = action.payload;
			})
			.addCase(fetchUsers.rejected, (state, action) => {
				state.isLoading = false;
				state.error = action.payload;
			})
			.addCase(createUser.pending, (state) => {
				state.isLoading = true;
			})
			.addCase(createUser.fulfilled, (state, action) => {
				state.isLoading = false;
				state.users.push(action.payload);
			})
			.addCase(createUser.rejected, (state, action) => {
				state.isLoading = false;
				state.error = action.payload;
			})
			.addCase(removeUser.fulfilled, (state, action) => {
				state.users = state.users.filter((user) => user.id !== action.payload);
			});
	},
});

export default userSlice.reducer;
