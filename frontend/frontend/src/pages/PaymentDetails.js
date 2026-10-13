import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import API_BASE_URL from "../config/api";
import "../styles/paymentDetails.css";

const PaymentDetails = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [className, setClassName] = useState(
    location.state?.className || "--"
  );
  const [monthlyFee, setMonthlyFee] = useState(
    Number(location.state?.monthlyFee || 0)
  );
  const [payment, setPayment] = useState(
    location.state?.payment || null
  );
  const [studentUpiId, setStudentUpiId] = useState("");
  const [upiIdError, setUpiIdError] = useState("");
  const [transactionReference, setTransactionReference] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [payNowLoading, setPayNowLoading] = useState(false);

  const gstAmount = 0;
  const totalAmount = monthlyFee + gstAmount;

  const paymentMonth = new Date().toLocaleString(
    "en-US",
    {
      month: "long",
      year: "numeric",
    }
  );

  /* =========================================================
     LOAD CURRENT PAYMENT FROM BACKEND
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

        const token = localStorage.getItem("token");

        const response = await fetch(
          `${API_BASE_URL}/api/payments/student/${studentId}/current`,
          {
            headers: {
              ...(token
                ? { Authorization: `Bearer ${token}` }
                : {}),
            },
          }
        );

        const data = await response.json();

        console.log(
          "CURRENT PAYMENT API RESPONSE:",
          data
        );

        if (!response.ok || !data.success) {
          console.error(
            "Failed to load current payment:",
            data.message
          );

          setLoading(false);
          return;
        }

        if (data.student?.className) {
          setClassName(
            `Class ${data.student.className}`
          );
        }

        if (data.fee?.monthlyFee !== undefined) {
          setMonthlyFee(
            Number(data.fee.monthlyFee)
          );
        }

        if (data.payment) {
          setPayment(data.payment);
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
     VALIDATE UPI ID
  ========================================================= */

  const validateUpiId = (upiId) => {
    if (!upiId || !upiId.trim()) {
      return "Please enter your UPI ID";
    }
    const trimmed = upiId.trim();
    const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
    if (!upiRegex.test(trimmed)) {
      return "Enter a valid UPI ID (e.g., yourname@bank)";
    }
    return "";
  };

  const handleStudentUpiIdChange = (event) => {
    const value = event.target.value;
    setStudentUpiId(value);
    if (upiIdError) {
      setUpiIdError(validateUpiId(value));
    }
  };

  const handleBlurUpiId = () => {
    if (studentUpiId.trim()) {
      setUpiIdError(validateUpiId(studentUpiId));
    }
  };

  /* =========================================================
     PAY NOW - CALL BACKEND FOR UPI URI
  ========================================================= */

  const handlePayNow = async () => {
    const error = validateUpiId(studentUpiId);
    if (error) {
      setUpiIdError(error);
      return;
    }

    setPayNowLoading(true);

    try {
      const storedStudent = localStorage.getItem("user");

      if (!storedStudent) {
        alert("Student data not found.");
        return;
      }

      const student = JSON.parse(storedStudent);

      const studentId =
        student._id ||
        student.id ||
        student.studentId;

      if (!studentId) {
        alert("Student ID not found.");
        return;
      }

      const token = localStorage.getItem("token");

      const response = await fetch(
        `${API_BASE_URL}/api/payments/student/${studentId}/upi-link`,
        {
          headers: {
            ...(token
              ? { Authorization: `Bearer ${token}` }
              : {}),
          },
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to generate UPI payment link");
      }

      // Open the UPI URI
      window.location.href = data.upiUri;

      // Show fallback message for desktop users
      setTimeout(() => {
        alert(
          "If the UPI app did not open, please use the QR code on the fee payment page or manually enter the amount in your UPI app.\n\nAmount: ₹" +
            data.amount.toLocaleString("en-IN") +
            "\nNote: " +
            data.upiUri.split("tn=")[1]?.split("&")[0] || ""
        );
      }, 500);
    } catch (error) {
      console.error("UPI payment initiation error:", error);
      alert(error.message || "Failed to initiate payment. Please try again.");
    } finally {
      setPayNowLoading(false);
    }
  };

  /* =========================================================
     SUBMIT PAYMENT (UTR)
  ========================================================= */

  const handleSubmitPayment = async () => {
    if (!transactionReference.trim()) {
      alert(
        "Please enter the transaction reference / UTR number."
      );
      return;
    }

    if (monthlyFee <= 0) {
      alert("Invalid payment amount.");
      return;
    }

    setSubmitting(true);

    const storedStudent = localStorage.getItem("user");

    if (!storedStudent) {
      alert("Student data not found.");
      setSubmitting(false);
      return;
    }

    const student = JSON.parse(storedStudent);

    const studentId =
      student._id ||
      student.id ||
      student.studentId;

    if (!studentId) {
      alert("Student ID not found.");
      setSubmitting(false);
      return;
    }

    const token = localStorage.getItem("token");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/payments/student/${studentId}/submit`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",

            ...(token
              ? { Authorization: `Bearer ${token}` }
              : {}),
          },

          body: JSON.stringify({
            transactionReference:
              transactionReference.trim(),
          }),
        }
      );

      const data = await response.json();

      console.log(
        "PAYMENT SUBMISSION RESPONSE:",
        data
      );

      if (!response.ok || !data.success) {
        alert(
          data.message ||
            "Payment submission failed."
        );

        return;
      }

      alert(
        "Payment submitted successfully! Admin will verify your payment."
      );

      navigate("/payments");
    } catch (error) {
      console.error(
        "Payment submission error:",
        error
      );

      alert(
        "Something went wrong while submitting the payment."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    navigate("/payments", { replace: true });
  };

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <div className="payment-details-page">
        <div className="monthly-payment-container">
          <div className="payment-loading">
            Loading payment details...
          </div>
        </div>
      </div>
    );
  }

  /* =========================================================
     PAYMENT ALREADY SUBMITTED
  ========================================================= */

  if (payment?.status === "Submitted") {
    return (
      <div className="payment-details-page">
        <div className="monthly-payment-container">
          <div className="payment-card">
            <div className="payment-header">
              <h2>
                Monthly Tuition Fee
              </h2>
              <p>
                {className} • {paymentMonth}
              </p>
            </div>

            <div className="fee-breakdown-section">
              <h3>
                Fee Summary
              </h3>
              <div className="fee-breakdown-table">
                <div className="fee-breakdown-row">
                  <span className="fee-breakdown-label">
                    Tuition Fee
                  </span>
                  <span className="fee-breakdown-value">
                    ₹{monthlyFee.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="fee-breakdown-row">
                  <span className="fee-breakdown-label">
                    GST (0%)
                  </span>
                  <span className="fee-breakdown-value">
                    ₹{gstAmount.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="fee-breakdown-row fee-breakdown-total">
                  <span className="fee-breakdown-label">
                    Total Amount
                  </span>
                  <span className="fee-breakdown-value">
                    ₹{totalAmount.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </div>

            <div className="payment-status-message submitted">
              <strong>
                Payment Submitted
              </strong>
              <p>
                Your payment has already been submitted
                and is waiting for admin verification.
              </p>
            </div>

            <button
              type="button"
              className="back-payment-btn"
              onClick={() => navigate("/payments")}
            >
              Back to Payments
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* =========================================================
     PAYMENT ALREADY PAID
  ========================================================= */

  if (payment?.status === "Paid") {
    return (
      <div className="payment-details-page">
        <div className="monthly-payment-container">
          <div className="payment-card">
            <div className="payment-header">
              <h2>
                Monthly Tuition Fee
              </h2>
              <p>
                {className} • {paymentMonth}
              </p>
            </div>

            <div className="fee-breakdown-section">
              <h3>
                Fee Summary
              </h3>
              <div className="fee-breakdown-table">
                <div className="fee-breakdown-row">
                  <span className="fee-breakdown-label">
                    Tuition Fee
                  </span>
                  <span className="fee-breakdown-value">
                    ₹{monthlyFee.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="fee-breakdown-row">
                  <span className="fee-breakdown-label">
                    GST (0%)
                  </span>
                  <span className="fee-breakdown-value">
                    ₹{gstAmount.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="fee-breakdown-row fee-breakdown-total">
                  <span className="fee-breakdown-label">
                    Total Amount
                  </span>
                  <span className="fee-breakdown-value">
                    ₹{totalAmount.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </div>

            <div className="payment-status-message paid">
              <strong>
                Payment Completed
              </strong>
              <p>
                This month's tuition fee has already
                been paid.
              </p>
            </div>

            <button
              type="button"
              className="back-payment-btn"
              onClick={() => navigate("/payments")}
            >
              Back to Payments
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* =========================================================
     MAIN PAYMENT PAGE
  ========================================================= */

  return (
    <div className="payment-details-page">
      <div className="monthly-payment-container">
        <div className="payment-card">
          {/* =================================================
              HEADER
          ================================================= */}
          <div className="payment-header">
            <h2>
              Complete Your Payment
            </h2>
            <p>
              {className} • {paymentMonth}
            </p>
          </div>

          {/* =================================================
              FEE BREAKDOWN
          ================================================= */}
          <div className="fee-breakdown-section">
            <h3>
              Fee Summary
            </h3>
            <div className="fee-breakdown-table">
              <div className="fee-breakdown-row">
                <span className="fee-breakdown-label">
                  Tuition Fee
                </span>
                <span className="fee-breakdown-value">
                  ₹{monthlyFee.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="fee-breakdown-row">
                <span className="fee-breakdown-label">
                  GST (0%)
                </span>
                <span className="fee-breakdown-value">
                  ₹{gstAmount.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="fee-breakdown-row fee-breakdown-total">
                <span className="fee-breakdown-label">
                  Total Amount
                </span>
                <span className="fee-breakdown-value">
                  ₹{totalAmount.toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </div>

          {/* =================================================
              STUDENT UPI ID INPUT
          ================================================= */}
          <div className="payment-details-section">
            <h3>
              Your UPI ID
            </h3>
            <p className="upi-description">
              Enter your UPI ID (Virtual Payment Address) to receive the payment request.
            </p>
            <div className="form-group">
              <label htmlFor="studentUpiId">
                UPI ID
              </label>
              <input
                id="studentUpiId"
                type="text"
                value={studentUpiId}
                onChange={handleStudentUpiIdChange}
                onBlur={handleBlurUpiId}
                placeholder="e.g., yourname@bank"
                autoComplete="off"
                disabled={payNowLoading}
              />
              {upiIdError && (
                <div className="form-error">
                  {upiIdError}
                </div>
              )}
            </div>
          </div>

          {/* =========================================================
              PAY NOW BUTTON
          ========================================================= */}
          <div className="payment-actions">
            <button
              type="button"
              className="pay-now-btn"
              onClick={handlePayNow}
              disabled={payNowLoading}
            >
              {payNowLoading ? "Processing..." : "Pay Now"}
            </button>
          </div>

          {/* =========================================================
              TRANSACTION REFERENCE / UTR
          ========================================================= */}
          <div className="payment-submission-section">
            <h3>
              Payment Details
            </h3>

            <div className="form-group">
              <label htmlFor="transactionReference">
                Transaction Reference / UTR
              </label>
              <input
                id="transactionReference"
                type="text"
                value={transactionReference}
                onChange={(event) =>
                  setTransactionReference(
                    event.target.value
                  )
                }
                placeholder="Enter UTR / Transaction ID"
                autoComplete="off"
                disabled={submitting}
              />
            </div>

            <button
              type="button"
              className="submit-payment-btn"
              onClick={handleSubmitPayment}
              disabled={submitting || monthlyFee <= 0}
            >
              {submitting
                ? "Submitting..."
                : "Submit Payment"}
            </button>
          </div>

          {/* =================================================
              BACK BUTTON
          ================================================= */}
          <button
            type="button"
            className="back-payment-btn"
            onClick={handleBack}
            disabled={submitting || payNowLoading}
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentDetails;