import React, { useEffect } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";

const Verify = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Helper to extract query parameters from the URL
  const getQueryParams = () => {
    const params = new URLSearchParams(location.search);
    return {
      orderId: params.get("orderId"),
      razorpay_payment_id: params.get("paymentId"),
      razorpay_order_id: params.get("orderRazorId"),
      razorpay_signature: params.get("signature"),
    };
  };

  // Function to verify payment
  const verifyPayment = async () => {
    const { orderId, razorpay_payment_id, razorpay_order_id, razorpay_signature } = getQueryParams();

    console.log("🔍 Verifying Payment with Data: ", {
      orderId,
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
    });

    // Validate all required parameters
    if (!orderId || !razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      toast.error("Missing payment details. Verification failed.");
      navigate("/cart");
      return;
    }

    try {
      // Send verification request to the backend
      const { data } = await axios.post("http://localhost:4000/api/order/verify", {
        orderId,
        razorpay_payment_id,
        razorpay_order_id,
        razorpay_signature,
      });

      // Handle verification response
      if (data.success) {
        toast.success("✅ Payment verified successfully!");
        navigate("/");
      } else {
        toast.error("❌ Payment verification failed.");
        navigate("/cart");
      }
    } catch (error) {
      console.error("❌ Verification Error:", error);
      toast.error("Error during payment verification. Try again.");
      navigate("/cart");
    }
  };

  useEffect(() => {
    verifyPayment();
  }, []);

  return <div>🔍 Verifying payment, please wait...</div>;
};

export default Verify;
