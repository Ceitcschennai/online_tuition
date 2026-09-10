import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PaymentGateway from "../components/PaymentGateway";
import "../styles/feePayment.css";

const FeePayment = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [className, setClassName] = useState(
    location.state?.className || "--"
  );

  const [monthlyFee, setMonthlyFee] = useState(
    Number(location.state?.monthlyFee || 0)
  );

  const [loading, setLoading] = useState(true);

  /* =========================================================
     LOAD CURRENT PAYMENT DETAILS
  ========================================================= */

  useEffect(() => {
    const loadCurrentPayment = async () => {
      try {
        const storedStudent = localStorage.getItem("user");

        if (!storedStudent) {
          console.error("Student data not found");
          setLoading(false);
          return;
        }

        const student = JSON.parse(storedStudent);

        const studentId =
          student._id ||
          student.id ||
          student.studentId;

        if (!studentId) {
          console.error("Student ID not found");
          setLoading(false);
          return;
        }

        const API_BASE_URL =
          process.env.REACT_APP_API_URL;

        const response = await fetch(
          `${API_BASE_URL}/api/payments/student/${studentId}/current`
        );

        const data = await response.json();
        console.log("CURRENT PAYMENT API RESPONSE:", data);

        if (!response.ok || !data.success) {
          console.error(
            "Failed to load current payment:",
            data.message
          );

          setLoading(false);
          return;
        }

        /* -----------------------------------------------------
           USE CURRENT CLASS FROM BACKEND
        ----------------------------------------------------- */

        if (data.student?.className) {
          setClassName(
            `Class ${data.student.className}`
          );
        }

        /* -----------------------------------------------------
           USE CURRENT PAYMENT FEE FROM BACKEND

           The paymentRoutes.js backend synchronizes
           the current unpaid payment with FeeStructure.
        ----------------------------------------------------- */

        if (data.fee?.monthlyFee !== undefined) {
  setMonthlyFee(
    Number(data.fee.monthlyFee)
  );
}

      } catch (error) {
        console.error(
          "Current payment error:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    loadCurrentPayment();
  }, []);

  /* =========================================================
     PAYMENT MONTH
  ========================================================= */
console.log("DEBUG FEE:", monthlyFee);
console.log("DEBUG CLASS:", className);
  const paymentMonth = new Date().toLocaleString(
    "en-US",
    {
      month: "long",
      year: "numeric"
    }
  );

  /* =========================================================
     PAYMENT SUCCESS
  ========================================================= */

  const handlePaymentSuccess = (paymentData) => {
    console.log(
      "Payment successful:",
      paymentData
    );

    alert("Payment successful!");

    navigate("/payments");
  };

  /* =========================================================
     PAYMENT FAILURE
  ========================================================= */

  const handlePaymentFailure = (error) => {
    alert(
      error?.error ||
        "Payment failed. Please try again."
    );
  };

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <div className="fee-payment-page">
        <div className="monthly-payment-container">
          <div
            style={{
              padding: "40px",
              textAlign: "center"
            }}
          >
            Loading payment details...
          </div>
        </div>
      </div>
    );
  }

  /* =========================================================
     PAYMENT PAGE
  ========================================================= */

  return (
    <div className="fee-payment-page">
      <div className="monthly-payment-container">
        <PaymentGateway
          amount={monthlyFee}
          className={className}
          paymentMonth={paymentMonth}
          paymentFor={`Monthly Tuition Fee - ${className} - ${paymentMonth}`}
          onPaymentSuccess={handlePaymentSuccess}
          onPaymentFailure={handlePaymentFailure}
          onBack={() => navigate("/payments")}
        />
      </div>
    </div>
  );
};

export default FeePayment;