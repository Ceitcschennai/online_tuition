import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../styles/paymentDetails.css";

const PaymentDetails = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [studentUpiId, setStudentUpiId] = useState("");
  const [upiIdError, setUpiIdError] = useState("");
  const [payNowLoading, setPayNowLoading] = useState(false);

  const className = location.state?.className || "--";
  const monthlyFee = Number(location.state?.monthlyFee || 0);
  const gstAmount = Number(location.state?.gstAmount || 0);
  const totalAmount = Number(location.state?.totalAmount || monthlyFee + gstAmount);
  const paymentMonth = location.state?.paymentMonth || new Date().toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });

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

  const handlePayNow = () => {
    const error = validateUpiId(studentUpiId);
    if (error) {
      setUpiIdError(error);
      return;
    }

    setPayNowLoading(true);
    setTimeout(() => {
      alert("Payment initiation not implemented yet. This is a placeholder for the next step.");
      setPayNowLoading(false);
    }, 1000);
  };

  const handleBack = () => {
    navigate("/fee-payment", { replace: true });
  };

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

          {/* =================================================
              ACTION BUTTONS
          ================================================= */}
          <div className="payment-actions">
            <button
              type="button"
              className="pay-now-btn"
              onClick={handlePayNow}
              disabled={payNowLoading}
            >
              {payNowLoading ? "Processing..." : "Pay Now"}
            </button>
            <button
              type="button"
              className="back-payment-btn"
              onClick={handleBack}
              disabled={payNowLoading}
            >
              Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentDetails;