import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// placing user order for frontend
const placeOrder = async (req, res) => {
  const frontend_url = "http://localhost:5173";
  try {
    const newOrder = new orderModel({
      userId: req.body.userId,
      items: req.body.items,
      amount: req.body.amount,
      address: req.body.address,
    });
    await newOrder.save();
    await userModel.findByIdAndUpdate(req.body.userId, { cartData: {} });

    const totalAmount = req.body.items.reduce((acc, item) => acc + item.price * item.quantity, 0) + 2;

    const options = {
      amount: totalAmount * 100, // Razorpay expects amount in paise
      currency: "INR",
      receipt: newOrder._id.toString(),
    };

    const order = await razorpay.orders.create(options);

    res.json({
      success: true,
      orderId: newOrder._id,
      razorpayOrderId: order.id,
      amount: totalAmount,
      currency: "INR",
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Error" });
  }
};

const verifyOrder = async (req, res) => {
  const crypto = await import("crypto");
  const { orderId, razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

  console.log("🔍 Incoming data: ", req.body);

  try {
    // Check if the order exists
    const order = await orderModel.findById(orderId);
    if (!order) {
      console.error("❌ Order not found for ID: ", orderId);
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // Validate all Razorpay parameters
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      console.error("❌ Missing Razorpay details");
      return res.status(400).json({ success: false, message: "Invalid Razorpay details" });
    }

    // Generate server-side signature
    const generated_signature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    console.log("✅ Generated signature: ", generated_signature);
    console.log("🔍 Received signature: ", razorpay_signature);

    // Compare generated and received signatures
    if (generated_signature !== razorpay_signature) {
      console.error("❌ Signature mismatch!");
      return res.status(400).json({ success: false, message: "Payment Verification Failed" });
    }

    // Update payment status if verified
    await orderModel.findByIdAndUpdate(orderId, { payment: true });
    return res.json({ success: true, message: "Payment Verified" });
  } catch (error) {
    console.error("❌ Error in verifyOrder: ", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// user orders for frontend
const userOrders = async (req, res) => {
  try {
    const orders = await orderModel.find({ userId: req.body.userId });
    res.json({ success: true, data: orders });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Error" });
  }
};

// Listing orders for admin panel
const listOrders = async (req, res) => {
  try {
    const userData = await userModel.findById(req.body.userId);
    if (userData && userData.role === "admin") {
      const orders = await orderModel.find({});
      res.json({ success: true, data: orders });
    } else {
      res.json({ success: false, message: "You are not an admin" });
    }
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Error" });
  }
};

// api for updating status
const updateStatus = async (req, res) => {
  try {
    const userData = await userModel.findById(req.body.userId);
    if (userData && userData.role === "admin") {
      await orderModel.findByIdAndUpdate(req.body.orderId, {
        status: req.body.status,
      });
      res.json({ success: true, message: "Status Updated Successfully" });
    } else {
      res.json({ success: false, message: "You are not an admin" });
    }
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Error" });
  }
};

export { placeOrder, verifyOrder, userOrders, listOrders, updateStatus };