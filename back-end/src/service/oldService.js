import { raw } from "mysql2";
import db, { Sequelize } from "../models/index";
import { Op, where } from "sequelize";
import { response } from "express";
import { getAllUser } from "../service/userService";
import { resolve } from "path";
import { rejects } from "assert";
const crypto = require("crypto");
const CryptoJS = require("crypto-js");
const moment = require("moment");
const qs = require("qs");
const axios = require("axios");
const cloudinary = require("cloudinary").v2;
require("dotenv").config();




let GetAllTable = (tableid) => {
    return new Promise(async (resolve, reject) => {
        try {
            let tables = "";
            if (tableid === "ALL") {
                tables = await db.Table.findAll({});
            }
            if (tableid && tableid !== "ALL") {
                tables = await db.Table.findAll({
                    where: { id: tableid },
                });
            }
            resolve(tables);
        } catch (e) {
            reject(e);
        }
    });
};

let CreateNewTable = (data) => {
    return new Promise(async (resolve, reject) => {
        try {
            let check = await db.Table.findOne({
                where: { tableNumber: data.tableNumber },
            });
            if (check) {
                resolve({
                    errCode: 1,
                    errMessage: "The table number already exists",
                });
            } else {
                let newTable = await db.Table.create({
                    id: data.tableNumber,
                    tableNumber: data.tableNumber,
                    status: data.status,
                });
                resolve({
                    errCode: 0,
                    errMessage: "Create new table successfully",
                    table: newTable,
                });
            }
        } catch (e) {
            reject(e);
        }
    });
};

let UpdateTable = (data) => {
    return new Promise(async (resolve, reject) => {
        try {
            let duplicate = await db.Table.findOne({
                where: { tableNumber: data.tableNumber },
            });
            if (duplicate && duplicate.id !== data.id) {
                return resolve({
                    errCode: 1,
                    errMessage: "The table number already exists",
                });
            }
            let check = await db.Table.findOne({
                where: { id: data.id },
            });
            if (check) {
                // Using a raw query to force update the primary key "id"
                await db.sequelize.query(
                    "UPDATE `Tables` SET id = ?, tableNumber = ?, status = ? WHERE id = ?",
                    {
                        replacements: [
                            data.tableNumber,
                            data.tableNumber,
                            data.status,
                            data.id,
                        ],
                    }
                );
                // Fetch the updated record using the new id value
                let updatedTable = await db.Table.findOne({
                    where: { id: data.tableNumber },
                });
                resolve({
                    errCode: 0,
                    errMessage: "Update table successfully",
                    table: updatedTable,
                });
            } else {
                resolve({
                    errCode: 1,
                    errMessage: "Table not found",
                });
            }
        } catch (e) {
            reject(e);
        }
    });
};

let DeleteTable = (tableId) => {
    return new Promise(async (resolve, reject) => {
        try {
            let check = await db.Table.findOne({
                where: { id: tableId },
            });
            if (check) {
                await db.Table.destroy({
                    where: { id: tableId },
                });
                resolve({
                    errCode: 0,
                    errMessage: "Delete table successfully",
                });
            } else {
                resolve({
                    errCode: 1,
                    errMessage: "Table not found",
                });
            }
        } catch (e) {
            reject(e);
        }
    });
};

let GetAllOrder = (orderid) => {
    return new Promise(async (resolve, reject) => {
        try {
            let orders = "";
            if (orderid === "ALL") {
                orders = await db.Order.findAll({
                    include: [
                        {
                            model: db.User,
                            attributes: ["id", "fullName", "email", "role"],
                        },
                        {
                            model: db.Table,
                            attributes: ["id", "tableNumber"],
                        },
                        {
                            model: db.Customer,
                            attributes: ["id", "name", "phone"],
                        },
                    ],
                });
            }
            if (orderid && orderid !== "ALL") {
                orders = await db.Order.findAll({
                    where: { id: orderid },
                    include: [
                        {
                            model: db.User,
                            attributes: ["id", "fullName", "email", "role"],
                        },
                        {
                            model: db.Table,
                            attributes: ["id", "tableNumber"],
                        },
                        {
                            model: db.Customer,
                            attributes: ["id", "name", "phone"],
                        },
                    ],
                });
            }
            resolve(orders);
        } catch (e) {
            reject(e);
        }
    });
};

let GetOrderPending = () => {
    return new Promise(async (resolve, reject) => {
        try {
            let orders = await db.Order.findAll({
                where: { status: "PENDING" },
                include: [
                    {
                        model: db.User,
                        attributes: ["id", "fullName", "email", "role"],
                    },
                    {
                        model: db.Customer,
                        attributes: ["id", "name", "phone"],
                    },
                    {
                        model: db.Table,
                        attributes: ["id", "tableNumber"],
                    },
                    {
                        model: db.OrderDetail,
                        attributes: [
                            "id",
                            "dishId",
                            "quantity",
                            "status",
                            "orderSession",
                            "createdAt",
                        ],
                        include: [
                            {
                                model: db.Dish,
                                attributes: ["name", "Category"],
                            },
                        ],
                    },
                ],
            });
            resolve(orders);
        } catch (e) {
            reject(e);
        }
    });
};

let GetAllOrderDetail = (orderId) => {
    return new Promise(async (resolve, reject) => {
        try {
            let orderDetails = "";
            if (orderId === "ALL") {
                orderDetails = await db.OrderDetail.findAll({
                    include: [
                        {
                            model: db.Order,
                            attributes: ["id", "tableId", "status", "customerId"],
                            include: [
                                {
                                    model: db.Customer,
                                    attributes: ["name", "phone"],
                                },
                            ],
                        },
                        {
                            model: db.Dish,
                            attributes: ["id", "name", "price", "Category", "pic_link"],
                        },
                    ],
                });
            } else if (orderId && orderId !== "ALL") {
                orderDetails = await db.OrderDetail.findAll({
                    where: { orderId: orderId },
                    include: [
                        {
                            model: db.Order,
                            attributes: ["id", "tableId", "status", "customerId"],
                            include: [
                                {
                                    model: db.Customer,
                                    attributes: ["name", "phone"],
                                },
                            ],
                        },
                        {
                            model: db.Dish,
                            attributes: ["id", "name", "price", "Category", "pic_link"],
                        },
                    ],
                });
            }
            resolve(orderDetails);
        } catch (e) {
            reject(e);
        }
    });
};

let GetAllCustomer = (customerId) => {
    return new Promise(async (resolve, reject) => {
        try {
            let customers = "";
            if (customerId === "ALL") {
                customers = await db.Customer.findAll({
                    attributes: ["id", "name", "phone", "points"],
                });
            }
            if (customerId && customerId !== "ALL") {
                customers = await db.Customer.findAll({
                    where: { id: customerId },
                    attributes: ["id", "name", "phone", "points"],
                });
            }
            resolve(customers);
        } catch (e) {
            reject(e);
        }
    });
};

let CreateNewCustomer = (data) => {
    return new Promise(async (resolve, reject) => {
        try {
            let check = await db.Customer.findOne({
                where: { phone: data.phone },
            });
            if (check) {
                resolve({
                    errCode: 1,
                    errMessage: "The phone number is already registered",
                });
            } else {
                let newCustomer = await db.Customer.create({
                    name: data.name,
                    phone: data.phone,
                });
                let customer = {
                    id: newCustomer.id,
                    name: data.name,
                    phone: data.phone,
                    points: 0,
                };
                resolve({
                    errCode: 0,
                    errMessage: "Create new customer successfully",
                    customer: customer,
                });
            }
        } catch (e) {
            reject(e);
        }
    });
};

let EditCustomer = (data) => {
    return new Promise(async (resolve, reject) => {
        try {
            let check = await db.Customer.findOne({
                where: { id: data.id },
            });
            if (check) {
                let checkPhone = await db.Customer.findOne({
                    where: {
                        phone: data.phone,
                        id: { [Op.ne]: data.id },
                    },
                });
                if (checkPhone) {
                    resolve({
                        errCode: 1,
                        errMessage: "The phone number is already registered",
                    });
                    return;
                }
                await check.update({
                    name: data.name,
                    phone: data.phone,
                    points: data.points,
                });
                resolve({
                    errCode: 0,
                    errMessage: "Update customer successfully",
                    customer: check,
                });
            } else {
                resolve({
                    errCode: 1,
                    errMessage: "Customer not found",
                });
            }
        } catch (e) {
            reject(e);
        }
    });
};

let DeleteCustomer = (customerId) => {
    return new Promise(async (resolve, reject) => {
        try {
            let check = await db.Customer.findOne({
                where: { id: customerId },
            });
            if (check) {
                await db.Customer.destroy({
                    where: { id: customerId },
                });
                resolve({
                    errCode: 0,
                    errMessage: "Delete customer successfully",
                });
            } else {
                resolve({
                    errCode: 1,
                    errMessage: "Customer not found",
                });
            }
        } catch (e) {
            reject(e);
        }
    });
};

let CheckCustomer = (phone) => {
    return new Promise(async (resolve, reject) => {
        try {
            let check = await db.Customer.findOne({
                where: { phone: phone },
            });
            if (check) {
                resolve({
                    errCode: 0,
                    errMessage: "Customer exists",
                    customer: check,
                });
            } else {
                resolve({
                    errCode: 1,
                    errMessage: "Customer does not exist",
                });
            }
        } catch (e) {
            reject(e);
        }
    });
};

let UpdateCustomer = (data) => {
    return new Promise(async (resolve, reject) => {
        try {
            let check = await db.Customer.findOne({
                where: { id: data.customerId },
            });
            if (check) {
                let rewardPoints = Math.floor(data.totalAmount / 10000);
                let updatedPoints = (check.points || 0) + rewardPoints;

                await check.update({
                    points: updatedPoints,
                });

                resolve({
                    errCode: 0,
                    errMessage: "Update customer successfully",
                    customer: check,
                });
            }
            if (!check) {
                resolve({
                    errCode: 1,
                    errMessage: "Customer does not exist",
                });
            }
        } catch (e) {
            reject(e);
        }
    });
};

let updateCustomerDiscount = (data) => {
    return new Promise(async (resolve, reject) => {
        try {
            let check = await db.Customer.findOne({
                where: { id: data.customerId },
            });
            if (check) {
                let updatedPoints = check.points - data.discount;
                if (updatedPoints < 0) {
                    resolve({
                        errCode: 1,
                        errMessage: "Not enough points",
                    });
                    return;
                }
                await check.update({
                    points: updatedPoints,
                });
                resolve({
                    errCode: 0,
                    errMessage: "Update customer successfully",
                    customer: check,
                });
            } else {
                resolve({
                    errCode: 1,
                    errMessage: "Customer does not exist",
                });
            }
        } catch (e) {
            reject(e);
        }
    });
};

let GetAllReservation = (reservationId) => {
    return new Promise(async (resolve, reject) => {
        try {
            let reservations = "";
            if (reservationId === "ALL") {
                reservations = await db.Reservation.findAll({
                    include: [
                        {
                            model: db.Customer,
                            attributes: ["id", "name", "phone", "points"],
                        },
                        {
                            model: db.Table,
                            attributes: ["id", "tableNumber"],
                        },
                    ],
                });
            }
            if (reservationId && reservationId !== "ALL") {
                reservations = await db.Reservation.findOne({
                    where: { id: reservationId },
                    include: [
                        {
                            model: db.Customer,
                            attributes: ["id", "name", "phone", "points"],
                        },
                        {
                            model: db.Table,
                            attributes: ["id", "tableNumber"],
                        },
                    ],
                });
            }
            resolve(reservations);
        } catch (e) {
            reject(e);
        }
    });
};

let ReservationTable = (data) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (data.status === "Cancelled") {
                await db.Table.update(
                    { status: "AVAILABLE" },
                    { where: { tableNumber: data.table.tableNumber } }
                );
                await db.Reservation.destroy({
                    where: {
                        tableId: data.table.id,
                        status: "PENDING",
                    },
                });
                resolve({
                    errCode: 0,
                    errMessage: "Reservation cancelled and table is now available",
                });
                return;
            }
            let existingReservation = await db.Reservation.findOne({
                where: {
                    tableId: data.table.id,
                    status: "PENDING",
                },
            });

            await db.Table.update(
                { status: data.status },
                { where: { tableNumber: data.table.tableNumber } }
            );
            if (existingReservation && data.status === "AVAILABLE") {
                let newReservation = await existingReservation.update({
                    status: "Confirmed",
                });
                resolve({
                    errCode: 0,
                    errMessage: "Reservation confirmed",
                    reservation: newReservation,
                });
                return;
            }
            if (existingReservation) {
                if (existingReservation.customerId) {
                    resolve({
                        errCode: 0,
                        errMessage: "Reservation already exists",
                        reservation: existingReservation,
                    });
                    return;
                }

                await existingReservation.update({
                    customerId: data.customer?.id || null,
                    reservationTime: new Date(),
                });

                resolve({
                    errCode: 0,
                    errMessage: "Customer information updated",
                    reservation: existingReservation,
                });
                return;
            }

            let newReservation = await db.Reservation.create({
                customerId: data.customer?.id || null,
                tableId: data.table.id,
            });
            let findNewReservation = await db.Reservation.findOne({
                where: { id: newReservation.id },
                include: [
                    {
                        model: db.Customer,
                        attributes: ["id", "name", "phone", "points"],
                    },
                    {
                        model: db.Table,
                        attributes: ["id", "tableNumber"],
                    },
                ],
            });
            resolve({
                errCode: 0,
                errMessage: "Reservation created successfully",
                reservation: findNewReservation,
            });
        } catch (error) {
            reject({
                errCode: 1,
                errMessage: "Error creating/updating reservation",
            });
        }
    });
};

let updateOrder = (data) => {
    return new Promise(async (resolve, reject) => {
        try {
            let order = await db.Order.findOne({
                where: { id: data.order.id },
            });
            if (order) {
                await order.update({
                    status: data.status,
                });
                resolve({
                    errCode: 0,
                    errMessage: "Update order successfully",
                    order: order,
                });
            } else {
                resolve({
                    errCode: 1,
                    errMessage: "Order not found",
                });
            }
        } catch (e) {
            console.log(e);
            reject({
                errCode: 1,
                errMessage: "Error creating/updating order",
            });
        }
    });
};

let CreateOrderDetail = (orderId, dishList) => {
    return new Promise(async (resolve, reject) => {
        try {
            let latestSession = await db.OrderDetail.max("orderSession", {
                where: { orderId: orderId },
            });

            let newSession = latestSession ? latestSession + 1 : 1;

            let dataToCreate = dishList.map((dish) => ({
                orderId: orderId,
                dishId: dish.id,
                quantity: dish.quantity,
                orderSession: newSession,
            }));

            let createdItems = await db.OrderDetail.bulkCreate(dataToCreate);

            let findNewOrderDetail = await db.OrderDetail.findAll({
                where: { orderSession: newSession, orderId: orderId },
                include: [
                    {
                        model: db.Order,
                        attributes: ["id", "tableId", "status"],
                    },
                    {
                        model: db.Dish,
                        attributes: ["id", "name", "price", "Category", "pic_link"],
                    },
                ],
            });
            resolve({
                errCode: 0,
                errMessage: "Create new order detail successfully",
                orderDetail: findNewOrderDetail,
            });
        } catch (e) {
            console.log(e);
            reject({
                errCode: 1,
                errMessage: "Error creating/updating order detail",
            });
        }
    });
};

let updateOrderDetail = (dishId, orderSession, orderId) => {
    return new Promise(async (resolve, reject) => {
        try {
            let orderDetail = await db.OrderDetail.findOne({
                where: { dishId: dishId, orderSession: orderSession, orderId: orderId },
            });
            if (orderDetail) {
                await orderDetail.update({
                    status: !orderDetail.status,
                });
                resolve({
                    errCode: 0,
                    errMessage: "Update order detail successfully",
                    orderDetail: orderDetail,
                });
            } else {
                resolve({
                    errCode: 1,
                    errMessage: "Order detail not found",
                });
            }
        } catch (e) {
            console.log(e);
            reject({
                errCode: 1,
                errMessage: "Error creating/updating order detail",
            });
        }
    });
};

let CreateInvoice = (data) => {
    return new Promise(async (resolve, reject) => {
        try {
            let order_invoice = await db.Invoice.findOne({
                where: { orderId: data.order?.id || data.orderId },
                include: [
                    {
                        model: db.Order,
                        attributes: ["id", "tableId"],
                    },
                ],
            });

            if (order_invoice) {
                if (order_invoice.paymentMethod) {
                    return resolve({
                        errCode: 1,
                        errMessage: "The invoice already exists",
                    });
                }

                await order_invoice.update({
                    paymentMethod: data.paymentMethod,
                    totalAmount: data.totalAmount,
                    discountId: data.discountId,
                });

                return resolve({
                    errCode: 0,
                    errMessage: "Update invoice successfully",
                    invoice: order_invoice,
                });
            }
            let invoice = await db.Invoice.create({
                orderId: data.order.id,
                tableId: data.order.tableId,
                totalAmount: data.totalAmount,
                paymentMethod: data.paymentMethod || null,
                appliedPoints: data.appliedPoints || 0,
            });

            let newInvoice = await db.Invoice.findOne({
                where: { id: invoice.id },
                include: [
                    {
                        model: db.Order,
                        attributes: ["id", "tableId"],
                    },
                ],
            });

            return resolve({
                errCode: 0,
                errMessage: "Create invoice successfully",
                invoice: newInvoice,
            });
        } catch (e) {
            console.log(e);
            return reject({
                errCode: 1,
                errMessage: "Error creating invoice",
            });
        }
    });
};

let GetInvoice = (id_table) => {
    return new Promise(async (resolve, reject) => {
        try {
            let invoice = await db.Invoice.findOne({
                where: { tableId: id_table, paymentMethod: null },
            });
            if (invoice) {
                let orderMenu = await GetAllOrderDetail(invoice.orderId);
                resolve({
                    errCode: 0,
                    errMessage: "Get invoice successfully",
                    invoice: orderMenu,
                    total: invoice.totalAmount,
                });
            } else {
                resolve({
                    errCode: 1,
                    errMessage: "Invoice not found",
                });
            }
        } catch (e) {
            console.log(e);
            reject({
                errCode: 1,
                errMessage: "Error creating/updating invoice",
            });
        }
    });
};

let GetAllInvoice = (invoiceId) => {
    return new Promise(async (resolve, reject) => {
        try {
            let invoices = "";
            if (invoiceId === "ALL") {
                invoices = await db.Invoice.findAll({
                    include: [
                        {
                            model: db.Discount,
                            attributes: ["id", "discount_percentage", "type"],
                        },
                    ],
                });
            }
            if (invoiceId && invoiceId !== "ALL") {
                invoices = await db.Invoice.findAll({
                    where: { id: invoiceId },
                    include: [
                        {
                            model: db.Discount,
                            attributes: ["id", "discount_percentage", "type"],
                        },
                    ],
                });
            }
            resolve({
                errCode: 0,
                errMessage: "Get all invoices successfully",
                invoices: invoices,
            });
        } catch (e) {
            reject(e);
        }
    });
};

let GetAllDiscount = () => {
    return new Promise(async (resolve, reject) => {
        try {
            let discounts = await db.Discount.findAll({
                attributes: ["id", "discount_percentage", "type"],
                order: [["discount_percentage", "ASC"]],
            });
            resolve(discounts);
        } catch (e) {
            reject(e);
        }
    });
};

let CreateDiscount = (data) => {
    return new Promise(async (resolve, reject) => {
        try {
            let check = await db.Discount.findOne({
                where: {
                    discount_percentage: data.discount_percentage,
                    type: data.type,
                },
            });
            if (check) {
                resolve({
                    errCode: 1,
                    errMessage: "The discount percentage already exists",
                });
            } else {
                let newDiscount = await db.Discount.create({
                    discount_percentage: data.discount_percentage,
                    type: data.type,
                });
                resolve({
                    errCode: 0,
                    errMessage: "Create new discount successfully",
                    discount: newDiscount,
                });
            }
        } catch (e) {
            reject({
                errCode: 1,
                errMessage: "Error creating discount",
            });
        }
    });
};

let UpdateDiscounts = (data) => {
    return new Promise(async (resolve, reject) => {
        try {
            let check = await db.Discount.findOne({
                where: { id: data.id },
            });
            if (check) {
                let check2 = await db.Discount.findOne({
                    where: {
                        discount_percentage: data.discount_percentage,
                        type: data.type,
                    },
                });
                if (check2 && check2.id !== data.id) {
                    return resolve({
                        errCode: 1,
                        errMessage: "The discount percentage already exists",
                    });
                }
                await check.update({
                    discount_percentage: data.discount_percentage,
                    type: data.type,
                });
                resolve({
                    errCode: 0,
                    errMessage: "Update discount successfully",
                    discount: check,
                });
            } else {
                resolve({
                    errCode: 1,
                    errMessage: "Discount not found",
                });
            }
        } catch (e) {
            reject({
                errCode: 1,
                errMessage: "Error updating discount",
            });
        }
    });
};
let DeleteDiscount = (discountId) => {
    return new Promise(async (resolve, reject) => {
        try {
            let check = await db.Discount.findOne({
                where: { id: discountId },
            });
            if (check) {
                await db.Discount.destroy({
                    where: { id: discountId },
                });
                resolve({
                    errCode: 0,
                    errMessage: "Delete discount successfully",
                });
            } else {
                resolve({
                    errCode: 1,
                    errMessage: "Discount not found",
                });
            }
        } catch (e) {
            reject({
                errCode: 1,
                errMessage: "Error deleting discount",
            });
        }
    });
};

let PaymentMoMo = (amount) => {
	const accessKey = "F8BBA842ECF85";
	const secretKey = "K951B6PE1waDMi640xX08PD3vg6EkVlz";
	const partnerCode = "MOMO";
	const redirectUrl =
		"https://webhook.site/b3088a6a-2d17-4f8d-a383-71389a6c600b";
	const ipnUrl = "https://webhook.site/b3088a6a-2d17-4f8d-a383-71389a6c600b";
	const requestType = "payWithMethod";
	return new Promise((resolve, reject) => {
		const orderId = partnerCode + new Date().getTime();
		const requestId = orderId;
		const extraData = "";
		const orderInfo = "pay with MoMo";
		const paymentCode =
			"T8Qii53fAXyUftPV3m9ysyRhEanUs9KlOPfHgpMR0ON50U10Bh+vZdpJU7VY4z+Z2y77fJHkoDc69scwwzLuW5MzeUKTwPo3ZMaB29imm6YulqnWfTkgzqRaion+EuD7FN9wZ4aXE1+mRt0gHsU193y+yxtRgpmY7SDMU9hCKoQtYyHsfFR5FUAOAKMdw2fzQqpToei3rnaYvZuYaxolprm9+/+WIETnPUDlxCYOiw7vPeaaYQQH0BF0TxyU3zu36ODx980rJvPAgtJzH1gUrlxcSS1HQeQ9ZaVM1eOK/jl8KJm6ijOwErHGbgf/hVymUQG65rHU2MWz9U8QUjvDWA==";
		// Tạo raw signature
		const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;
		const signature = crypto
			.createHmac("sha256", secretKey)
			.update(rawSignature)
			.digest("hex");

		// Tạo body yêu cầu JSON
		const requestBody = {
			partnerCode,
			partnerName: "Test",
			storeId: "MomoTestStore",
			requestId,
			amount,
			orderId,
			orderInfo,
			redirectUrl,
			ipnUrl,
			lang: "vi",
			requestType,
			autoCapture: true,
			extraData,
			orderGroupId: "",
			signature,
		};

		// Gọi API với axios
		axios
			.post("https://test-payment.momo.vn/v2/gateway/api/create", requestBody, {
				headers: {
					"Content-Type": "application/json",
				},
			})
			.then((response) => {
				resolve(response.data);
			})
			.catch((error) => {
				reject(error);
			});
	});
};

const createZaloPayOrder = async (orderDetails) => {
	console.log("Creating ZaloPay order with details:", orderDetails);
	let tableId = orderDetails.table ? orderDetails.table.id : null;
	let discountId = orderDetails.discountId ? orderDetails.discountId : null;
	const embed_data = {
		redirecturl: `http://localhost:3000/receptionist?tableId=${tableId}&discountId=${discountId}`,
	};
	const config = {
		app_id: "2553",
		key1: "PcY4iZIKFCIdgZvA6ueMcMHHUbRLYjPL",
		key2: "kLtgPl8HHhfvMuDHPwKfgfsY4Ydm9eIz",
		endpoint: "https://sb-openapi.zalopay.vn/v2/create",
	};
	const transID = Math.floor(Math.random() * 1000000);
	const order = {
		app_id: config.app_id,
		app_trans_id: `${moment().format("YYMMDD")}_${transID}`,
		app_user: orderDetails.customerInfo?.name
			? orderDetails.customerInfo.name
			: "user123",
		app_time: Date.now(),
		item: JSON.stringify(orderDetails.items || []),
		embed_data: JSON.stringify(embed_data),
		amount: orderDetails.totalAmount || 50000,
		callback_url:
			"https://2479-2001-ee0-4b7e-7ad0-48bb-d977-1d61-ba45.ngrok-free.app/callback",
		description: `ZaloPay - Payment for the order #${transID} - customer: ${
			orderDetails.customerInfo?.name
				? orderDetails.customerInfo.name
				: "user123"
		}`,
		lang: "vn",
		bank_code: "",
	};

	const data = `${config.app_id}|${order.app_trans_id}|${order.app_user}|${order.amount}|${order.app_time}|${order.embed_data}|${order.item}`;
	order.mac = CryptoJS.HmacSHA256(data, config.key1).toString();

	try {
		const result = await axios.post(config.endpoint, null, { params: order });
		return result.data;
	} catch (error) {
		console.log(error);
		throw error;
	}
};
const callbackZaloPayOrder = async (body) => {
	const config = {
		app_id: "2553",
		key1: "PcY4iZIKFCIdgZvA6ueMcMHHUbRLYjPL",
		key2: "kLtgPl8HHhfvMuDHPwKfgfsY4Ydm9eIz",
	};
	let result = {};
	let dataStr = body.data;
	let reqMac = body.mac;
	let mac = CryptoJS.HmacSHA256(dataStr, config.key2).toString();
	console.log("mac =", mac);

	if (reqMac !== mac) {
		// Callback không hợp lệ
		result.return_code = -1;
		result.return_message = "mac not equal";
	} else {
		let dataJson = JSON.parse(dataStr);
		console.log(
			"update order's status = success where app_trans_id =",
			dataJson["app_trans_id"]
		);

		result.return_code = 1;
		result.return_message = "success";
	}

	return result;
};
const checkZaloPayOrderStatus = async (app_trans_id) => {
	const config = {
		app_id: "2553",
		key1: "PcY4iZIKFCIdgZvA6ueMcMHHUbRLYjPL",
		key2: "kLtgPl8HHhfvMuDHPwKfgfsY4Ydm9eIz",
		endpoint: "https://sb-openapi.zalopay.vn/v2/query",
	};

	let postData = {
		app_id: config.app_id,
		app_trans_id: app_trans_id,
	};

	let data = postData.app_id + "|" + postData.app_trans_id + "|" + config.key1; // appid|app_trans_id|key1
	postData.mac = CryptoJS.HmacSHA256(data, config.key1).toString();
	let postConfig = {
		method: "post",
		url: config.endpoint,
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
		},
		data: qs.stringify(postData),
	};
	try {
		const response = await axios(postConfig);
		return response.data;
	} catch (error) {
		console.error("Error checking order status:", error);
		throw error;
	}
};

let CancelOrderDetail = (data) => {
	return new Promise(async (resolve, reject) => {
		try {
			// Find the OrderDetail to be deleted
			let orderDetail = await db.OrderDetail.findOne({
				where: {
					dishId: data.dishData.id,
					orderSession: data.dishData.orderSession,
					orderId: data.orderId,
				},
				include: [
					{
						model: db.Dish,
						attributes: ["id", "name", "price"],
					},
				],
			});

			if (!orderDetail) {
				return resolve({
					errCode: 1,
					errMessage: "Order detail not found",
				});
			}

			// Insert into CancelledOrderDetails
			await db.CancelledOrderDetail.create({
				orderId: orderDetail.orderId,
				dishId: orderDetail.dishId,
				quantity: orderDetail.quantity,
				reason: data.reason,
				description: data.description || null,
			});

			// Delete the OrderDetail
			await orderDetail.destroy();

			resolve({
				errCode: 0,
				errMessage: "Order detail cancelled successfully",
			});
		} catch (e) {
			console.log(e);
			reject({
				errCode: 1,
				errMessage: "Error cancelling order detail",
			});
		}
	});
};

let GetCancellationsByOrderId = (orderId) => {
	return new Promise(async (resolve, reject) => {
		try {
			let cancellations = await db.CancelledOrderDetail.findAll({
				where: { orderId: orderId },
				include: [
					{
						model: db.Dish,
						attributes: ["name", "price"],
					},
				],
			});
			resolve(cancellations);
		} catch (e) {
			reject(e);
		}
	});
};



module.exports = {
	GetAllTable,
	GetAllOrder,
	GetAllOrderDetail,
	GetAllReservation,
	GetAllCustomer,
	CreateNewCustomer,
	EditCustomer,
	DeleteCustomer,
	CheckCustomer,
	UpdateCustomer,
	ReservationTable,
	updateOrder,
	CreateOrderDetail,
	updateOrderDetail,
	CreateInvoice,
	GetInvoice,
	GetAllInvoice,
	PaymentMoMo,
	createZaloPayOrder,
	checkZaloPayOrderStatus,
	callbackZaloPayOrder,
	updateCustomerDiscount,
	GetOrderPending,
	CreateNewTable,
	UpdateTable,
	DeleteTable,
	GetAllDiscount,
	CreateDiscount,
	UpdateDiscounts,
	DeleteDiscount,
	CancelOrderDetail,
	GetCancellationsByOrderId,
};