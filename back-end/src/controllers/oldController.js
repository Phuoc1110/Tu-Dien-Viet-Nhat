import { or } from "sequelize";
import oldService from "../service/oldService";
const cloudinary = require("cloudinary").v2;

let HandleUpdateDiscounts = async (req, res) => {
    let data = req.body;
    if (!data) {
        return res.status(200).json({
            errCode: 1,
            errMessage: "Missing required parameter",
        });
    }
    let result = await apiService.UpdateDiscounts(data);
    return res.status(200).json({
        errCode: result.errCode,
        errMessage: result.errMessage,
        discount: result.discount,
    });
};

let HandleDeleteDiscount = async (req, res) => {
    let id = req.body.id;
    if (!id) {
        return res.status(200).json({
            errCode: 1,
            errMessage: "Missing required parameter",
        });
    }
    let result = await apiService.DeleteDiscount(id);
    return res.status(200).json({
        errCode: result.errCode,
        errMessage: result.errMessage,
    });
};

let HandleGetAllTable = async (req, res) => {
    let id = req.query.id;
    if (!id) {
        return res.status(200).json({
            errCode: 1,
            errMessage: "Missing required parameter",
            table: [],
        });
    }
    let table = await apiService.GetAllTable(id);
    return res.status(200).json({
        errCode: 0,
        errMessage: "OK",
        table: table,
    });
};

let HandleCreateTable = async (req, res) => {
    let data = req.body;
    if (!data) {
        return res.status(200).json({
            errCode: 1,
            errMessage: "Missing required parameter",
        });
    }
    let result = await apiService.CreateNewTable(data);
    return res.status(200).json({
        errCode: result.errCode,
        errMessage: result.errMessage,
        table: result.table,
    });
};

let HandleUpdateTable = async (req, res) => {
    let data = req.body;
    if (!data) {
        return res.status(200).json({
            errCode: 1,
            errMessage: "Missing required parameter",
        });
    }
    let result = await apiService.UpdateTable(data);
    return res.status(200).json({
        errCode: result.errCode,
        errMessage: result.errMessage,
        table: result.table,
    });
};

let HandleDeleteTable = async (req, res) => {
    let id = req.body.id;
    if (!id) {
        return res.status(200).json({
            errCode: 1,
            errMessage: "Missing required parameter",
        });
    }
    let result = await apiService.DeleteTable(id);
    return res.status(200).json({
        errCode: result.errCode,
        errMessage: result.errMessage,
    });
};

let HandleGetAllOrder = async (req, res) => {
    let id = req.query.id;
    if (!id) {
        return res.status(200).json({
            errCode: 1,
            errMessage: "Missing required parameter",
            order: [],
        });
    }
    let order = await apiService.GetAllOrder(id);
    return res.status(200).json({
        errCode: 0,
        errMessage: "OK",
        order: order,
    });
};

let HandleGetAllOrderDetail = async (req, res) => {
    let id = req.query.id;
    if (!id) {
        return res.status(200).json({
            errCode: 1,
            errMessage: "Missing required parameter",
            orderDetail: [],
        });
    }
    let orderDetail = await apiService.GetAllOrderDetail(id);
    return res.status(200).json({
        errCode: 0,
        errMessage: "OK",
        orderDetail: orderDetail,
    });
};

let HandleGetAllOrderPending = async (req, res) => {
    let order = await apiService.GetOrderPending();
    return res.status(200).json({
        errCode: 0,
        errMessage: "OK",
        order: order,
    });
};

let HandleGetAllReservation = async (req, res) => {
    let id = req.query.id;
    if (!id) {
        return res.status(200).json({
            errCode: 1,
            errMessage: "Missing required parameter",
            order: [],
        });
    }
    let reservation = await apiService.GetAllReservation(id);
    return res.status(200).json({
        errCode: 0,
        errMessage: "OK",
        Reservation: reservation,
    });
};

let HandleCreateNewCustomer = async (req, res) => {
    let customer = req.body;
    if (!customer) {
        return res.status(200).json({
            errCode: 1,
            errMessage: "Missing required parameter",
        });
    }
    let result = await apiService.CreateNewCustomer(customer);
    return res.status(200).json({
        errCode: result.errCode,
        errMessage: result.errMessage,
        customer: result.customer,
    });
};

let HandleCheckCustomer = async (req, res) => {
    let phoneNumber = req.body.phoneNumber;
    if (!phoneNumber) {
        return res.status(200).json({
            errCode: 1,
            errMessage: "Missing required parameter",
        });
    }
    let customer = await apiService.CheckCustomer(phoneNumber);
    return res.status(200).json({
        errCode: customer.errCode,
        errMessage: customer.errMessage,
        customer: customer.customer,
    });
};

let HandleGetAllCustomer = async (req, res) => {
    let id = req.query.id;
    if (!id) {
        return res.status(200).json({
            errCode: 1,
            errMessage: "Missing required parameter",
            customer: [],
        });
    }
    let customer = await apiService.GetAllCustomer(id);
    return res.status(200).json({
        errCode: 0,
        errMessage: "OK",
        customer: customer,
    });
};

let HandleEditCustomer = async (req, res) => {
    let data = req.body;
    if (!data) {
        return res.status(200).json({
            errCode: 1,
            errMessage: "Missing required parameter",
        });
    }
    let result = await apiService.EditCustomer(data);
    return res.status(200).json({
        errCode: result.errCode,
        errMessage: result.errMessage,
        customer: result.customer,
    });
};

let HandleDeleteCustomer = async (req, res) => {
    let id = req.body.id;
    if (!id) {
        return res.status(200).json({
            errCode: 1,
            errMessage: "Missing required parameter",
        });
    }
    let result = await apiService.DeleteCustomer(id);
    return res.status(200).json({
        errCode: result.errCode,
        errMessage: result.errMessage,
    });
};

let HandleCreateNewOrder = async (req, res) => {
    let data = req.body;
    if (!data) {
        return res.status(200).json({
            errCode: 1,
            errMessage: "Missing required parameter",
        });
    }
    let result = await apiService.CreateOrder(data);
    return res.status(200).json({
        errCode: 0,
        errMessage: "OK",
        order: result.order,
    });
};

let HandleUpdateOrder = async (req, res) => {
    let data = req.body;
    if (!data) {
        return res.status(200).json({
            errCode: 1,
            errMessage: "Missing required parameter",
        });
    }
    let result = await apiService.updateOrder(data);
    return res.status(200).json({
        errCode: result.errCode,
        errMessage: result.errMessage,
        order: result.order,
    });
};

let HandleCreateOrderDetail = async (req, res) => {
    let { orderId, dishList } = req.body;
    if (!orderId || !dishList || !Array.isArray(dishList)) {
        return res.status(200).json({
            errCode: 1,
            errMessage: "Missing required parameter",
        });
    }
    let result = await apiService.CreateOrderDetail(orderId, dishList);
    return res.status(200).json({
        errCode: result.errCode,
        errMessage: result.errMessage,
        orderDetail: result.orderDetail,
    });
};

let HandleUpdateOrderDetail = async (req, res) => {
    let { dishId, orderSession, idOrder } = req.body;
    if (!dishId || !orderSession || !idOrder) {
        return res.status(200).json({
            errCode: 1,
            errMessage: "Missing required parameter",
        });
    }
    let result = await apiService.updateOrderDetail(
        dishId,
        orderSession,
        idOrder
    );
    return res.status(200).json({
        errCode: result.errCode,
        errMessage: result.errMessage,
        orderDetail: result.orderDetail,
    });
};

let HandleCreateInvoice = async (req, res) => {
    let data = req.body;
    if (!data) {
        return res.status(200).json({
            errCode: 1,
            errMessage: "Missing required parameter",
        });
    }
    let result = await apiService.CreateInvoice(data);
    return res.status(200).json({
        errCode: result.errCode,
        errMessage: result.errMessage,
        invoice: result.invoice,
    });
};

let HandleGetInvoice = async (req, res) => {
    let id = req.query.id;
    if (!id) {
        return res.status(200).json({
            errCode: 1,
            errMessage: "Missing required parameter",
            invoice: [],
        });
    }
    let invoice = await apiService.GetInvoice(id);
    return res.status(200).json({
        errCode: invoice.errCode,
        errMessage: invoice.errMessage,
        invoice: invoice.invoice,
        total: invoice.total,
    });
};
let HandleGetAllInvoice = async (req, res) => {
    let id = req.query.id;
    if (!id) {
        return res.status(200).json({
            errCode: 1,
            errMessage: "Missing required parameter",
            invoice: [],
        });
    }
    let invoice = await apiService.GetAllInvoice(id);
    return res.status(200).json({
        errCode: invoice.errCode,
        errMessage: invoice.errMessage,
        invoice: invoice.invoices,
    });
};

let HandleUpdateCustomer = async (req, res) => {
    let data = req.body;
    if (!data) {
        return res.status(200).json({
            errCode: 1,
            errMessage: "Missing required parameter",
        });
    }
    let result = await apiService.UpdateCustomer(data);
    return res.status(200).json({
        errCode: result.errCode,
        errMessage: result.errMessage,
        customer: result.customer,
    });
};

let HandleUpdateDiscount = async (req, res) => {
    let data = req.body;
    if (!data) {
        return res.status(200).json({
            errCode: 1,
            errMessage: "Missing required parameter",
        });
    }
    let result = await apiService.updateCustomerDiscount(data);
    return res.status(200).json({
        errCode: result.errCode,
        errMessage: result.errMessage,
        customer: result.customer,
    });
};

let HandleGetAllDiscount = async (req, res) => {
    let discount = await apiService.GetAllDiscount();
    return res.status(200).json({
        errCode: 0,
        errMessage: "OK",
        discount: discount,
    });
};

let handlePaymentZaloPay = async (req, res) => {
    try {
        const paymentResult = await apiService.createZaloPayOrder(req.body);
        return res.status(200).json(paymentResult);
    } catch (error) {
        console.error("ZaloPay error:", error);
        return res.status(500).json({
            message: "An error occurred during ZaloPay processing",
            error: error.message,
        });
    }
};

let handleCheckZaloPay = async (req, res) => {
    try {
        const { app_trans_id } = req.body;
        const paymentResult = await apiService.checkZaloPayOrderStatus(
            app_trans_id
        );
        return res.status(200).json(paymentResult);
    } catch (error) {
        console.error("ZaloPay error:", error);
        return res.status(500).json({
            message: "An error occurred during ZaloPay processing",
            error: error.message,
        });
    }
};

let handleCallBackZaloPay = async (req, res) => {
    try {
        const paymentResult = await apiService.callbackZaloPayOrder(req.body);
        return res.status(200).json(paymentResult);
    } catch (error) {
        console.error("ZaloPay error:", error);
        return res.status(500).json({
            message: "An error occurred during ZaloPay processing",
            error: error.message,
        });
    }
};

let HandleCancelOrderDetail = async (req, res) => {
    let data = req.body;
    if (!data || !data.dishData || !data.reason) {
        return res.status(200).json({
            errCode: 1,
            errMessage: "Missing required parameter",
        });
    }
    let result = await apiService.CancelOrderDetail(data);
    return res.status(200).json({
        errCode: result.errCode,
        errMessage: result.errMessage,
    });
};

let HandleGetCancellationsByOrderId = async (req, res) => {
    let orderId = req.query.orderId;
    if (!orderId) {
        return res.status(200).json({
            errCode: 1,
            errMessage: "Missing required parameter",
        });
    }
    let cancellations = await apiService.GetCancellationsByOrderId(orderId);
    return res.status(200).json({
        errCode: 0,
        errMessage: "OK",
        cancellations: cancellations,
    });
};

module.exports = {
	HandleGetAllTable,
	HandleCreateTable,
	HandleUpdateTable,
	HandleDeleteTable,
	HandleGetAllOrderPending,
	HandleCreateNewCustomer,
	HandleCheckCustomer,
	HandleGetAllCustomer,
	HandleEditCustomer,
	HandleDeleteCustomer,
	HandleCreateNewOrder,
	HandleUpdateCustomer,
	HandleGetAllOrder,
	HandleGetAllReservation,
	HandleCreateOrderDetail,
	HandleGetAllOrderDetail,
	HandleUpdateOrderDetail,
	HandleUpdateOrder,
	HandleCreateInvoice,
	HandleGetAllInvoice,
	HandleGetInvoice,
	HandleUpdateDiscount,
	HandleGetAllDiscount,
	HandleUpdateDiscounts,
	HandleDeleteDiscount,
	handlePaymentZaloPay,
	handleCheckZaloPay,
	handleCallBackZaloPay,
	HandleCancelOrderDetail,
	HandleGetCancellationsByOrderId,
};