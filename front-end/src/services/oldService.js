import axios from "../setup/axios";

const GetAllTable = (InputId) => {
    return axios
        .get(`/api/get-all-table?id=${InputId}`)
        .then((response) => {
            return response;
        })
        .catch((err) => {
            console.log(err);
        });
};

const GetAllOrder = (InputId) => {
    return axios
        .get(`/api/get-all-order?id=${InputId}`)
        .then((response) => {
            return response;
        })
        .catch((err) => {
            console.log(err);
        });
};

const GetAllOrderPeding = () => {
    return axios
        .get("/api/get-all-orderPending")
        .then((response) => {
            return response;
        })
        .catch((err) => {
            console.log(err);
        });
};

const GetAllReservation = (InputId) => {
    return axios
        .get(`/api/get-all-reservation?id=${InputId}`)
        .then((response) => {
            return response;
        })
        .catch((err) => {
            console.log(err);
        });
};

const CreateNewCustomer = (customer) => {
    return axios
        .post("/api/create-new-customer", customer)
        .then((response) => {
            return response;
        })
        .catch((err) => {
            console.log(err);
        });
};

const GetAllCustomer = (id) => {
    return axios.get(`/api/get-all-customer?id=${id}`).then((response) => {
        return response;
    });
};

const EditCustomer = (data) => {
    return axios
        .post("/api/edit-customer", data)
        .then((response) => {
            return response;
        })
        .catch((err) => {
            console.log(err);
        });
};

const DeleteCustomer = (id) => {
    return axios
        .post("/api/delete-customer", { id })
        .then((response) => response)
        .catch((err) => {
            console.log(err);
        });
};

const CheckCustomer = (phoneNumber) => {
    return axios
        .post("/api/check-customer", { phoneNumber })
        .then((response) => {
            return response;
        })
        .catch((err) => {
            console.log(err);
        });
};

const CreateNewOrder = (data) => {
    return axios
        .post("/api/create-new-order", data, {
            headers: { "Content-Type": "multipart/form-data" },
        })
        .then((response) => {
            return response;
        })
        .catch((err) => {
            console.log(err);
        });
};

const CreateNewOrderDetail = (data) => {
    return axios
        .post("/api/create-new-orderDetail", data)
        .then((response) => {
            return response;
        })
        .catch((err) => {
            console.log(err);
        });
};

const GetAllOrderDetail = (InputId) => {
    return axios
        .get(`/api/get-all-orderDetail?id=${InputId}`)
        .then((response) => {
            return response;
        })
        .catch((err) => {
            console.log(err);
        });
};

const UpdateOrderDetail = (data) => {
    return axios
        .post("/api/update-order-status", data)
        .then((response) => {
            return response;
        })
        .catch((err) => {
            console.log(err);
        });
};

const UpdateOrder = (data) => {
    return axios
        .post("/api/order-status", data)
        .then((response) => {
            return response;
        })
        .catch((err) => {
            console.log(err);
        });
};

const GetInvoice = (InputId) => {
    return axios
        .get(`/api/get-invoice?id=${InputId}`)
        .then((response) => {
            return response;
        })
        .catch((err) => {
            console.log(err);
        });
};

const UpdateCustomer = (data) => {
    return axios
        .post("/api/update-customer", data)
        .then((response) => {
            return response;
        })
        .catch((err) => {
            console.log(err);
        });
};

const UpdateDiscount = (data) => {
    return axios
        .post("/api/update-discount", data)
        .then((response) => {
            return response;
        })
        .catch((err) => {
            console.log(err);
        });
};

const PaymentZaloPay = async (user) => {
    return axios.post("/payment/ZaloPay", user);
};

const CheckPayment = async (apptransid) => {
    return axios.post("/payment/CheckZaloPay", { app_trans_id: apptransid });
};

const CreateNewTable = (data) => {
	return axios
		.post("/api/create-new-table", data)
		.then((response) => {
			return response;
		})
		.catch((err) => {
			console.log(err);
		});
};

const UpdateTable = (data) => {
	return axios
		.post("/api/update-table", data)
		.then((response) => {
			return response;
		})
		.catch((err) => {
			console.log(err);
		});
};

const DeleteTable = (data) => {
	return axios
		.post("/api/delete-table", data)
		.then((response) => {
			return response;
		})
		.catch((err) => {
			console.log(err);
		});
};

const GetAllInvoice = (InputId) => {
	return axios
		.get(`/api/get-all-invoice?id=${InputId}`)
		.then((response) => {
			return response;
		})
		.catch((err) => {
			console.log(err);
		});
};

const GetAllDiscounts = () => {
	return axios
		.get("/api/getAllDiscounts")
		.then((response) => {
			return response;
		})
		.catch((err) => {
			console.log(err);
		});
};

const UpdateDiscounts = (data) => {
	return axios
		.post("/api/update-discounts", data)
		.then((response) => {
			return response;
		})
		.catch((err) => {
			console.log(err);
		});
};

const CreateDiscount = (data) => {
	return axios
		.post("/api/create-discount", data)
		.then((response) => {
			return response;
		})
		.catch((err) => {
			console.log(err);
		});
};

const DeleteDiscount = (id) => {
	return axios
		.post("/api/delete-discount", { id })
		.then((response) => response)
		.catch((err) => {
			console.log(err);
		});
};

const CancelOrderDetail = (data) => {
	return axios.post("/api/cancel-order-detail", data).then((response) => {
		return response;
	});
};

const GetCancellationsByOrderId = (orderId) => {
	return axios
		.get(`/api/get-cancellations-by-order-id?orderId=${orderId}`)
		.then((response) => {
			return response;
		});
};