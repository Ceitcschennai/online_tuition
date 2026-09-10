import React, { useState } from "react";
import "../styles/paymentGateway.css";

const PaymentGateway = ({
  amount,
  onPaymentSuccess,
  onPaymentFailure,
  paymentFor,
  onBack,
  className = "--",
  paymentMonth = "",
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("card");

  const handlePayment = async () => {
    setIsProcessing(true);

    setTimeout(() => {
      const isSuccess = Math.random() > 0.1;

      if (isSuccess) {
        const paymentData = {
          transactionId: `TXN${Date.now()}`,
          amount,
          method: paymentMethod,
          status: "success",
          timestamp: new Date().toISOString(),
          paymentFor,
        };

        onPaymentSuccess(paymentData);
      } else {
        onPaymentFailure({
          error: "Payment failed. Please try again.",
          code: "PAYMENT_FAILED",
        });
      }

      setIsProcessing(false);
    }, 2000);
  };

  return (
    <div className="payment-page-wrapper">
      <div className="payment-card">

        {/* Back Button */}
        <div className="payment-top-bar">
          <button
            className="payment-back-btn"
            onClick={onBack}
            disabled={isProcessing}
          >
            ← Back to Fee Details
          </button>

          <div className="secure-badge">
            🔒 <span>Secure Payment</span>
          </div>
        </div>

        {/* Payment Header */}
        <div className="payment-main-header">
          <h1>Monthly Tuition Payment</h1>

          <p>Complete your payment securely</p>

          {/* Payment Summary */}
          <div className="payment-summary-box">

            <div className="amount-section">
              <span>Amount to Pay</span>

              <strong>
                ₹{Number(amount || 0).toLocaleString("en-IN")}
              </strong>
            </div>

            <div className="payment-details-row">

              <div className="payment-detail">
                <span>Class</span>
                <strong>{className}</strong>
              </div>

              <div className="payment-divider"></div>

              <div className="payment-detail">
                <span>Month</span>
                <strong>{paymentMonth}</strong>
              </div>

            </div>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="payment-method-section">

          <h2>Select Payment Method</h2>

          <div className="payment-method-options">

            {/* Card */}
            <label
              className={`payment-method-card ${
                paymentMethod === "card" ? "selected" : ""
              }`}
            >
              <input
                type="radio"
                name="paymentMethod"
                value="card"
                checked={paymentMethod === "card"}
                onChange={(e) => setPaymentMethod(e.target.value)}
              />

              <div className="payment-method-icon card-icon">
                💳
              </div>

              <div className="payment-method-info">
                <strong>Debit / Credit Card</strong>
                <span>Visa, Mastercard, RuPay</span>
              </div>
            </label>

            {/* UPI */}
            <label
              className={`payment-method-card ${
                paymentMethod === "upi" ? "selected" : ""
              }`}
            >
              <input
                type="radio"
                name="paymentMethod"
                value="upi"
                checked={paymentMethod === "upi"}
                onChange={(e) => setPaymentMethod(e.target.value)}
              />

              <div className="payment-method-icon">
                📱
              </div>

              <div className="payment-method-info">
                <strong>UPI</strong>
                <span>Google Pay, PhonePe, Paytm</span>
              </div>
            </label>

            {/* Net Banking */}
            <label
              className={`payment-method-card ${
                paymentMethod === "netbanking" ? "selected" : ""
              }`}
            >
              <input
                type="radio"
                name="paymentMethod"
                value="netbanking"
                checked={paymentMethod === "netbanking"}
                onChange={(e) => setPaymentMethod(e.target.value)}
              />

              <div className="payment-method-icon">
                🏦
              </div>

              <div className="payment-method-info">
                <strong>Net Banking</strong>
                <span>All major banks supported</span>
              </div>
            </label>

          </div>

          {/* Proceed Button */}
          <button
            className="proceed-payment-btn"
            onClick={handlePayment}
            disabled={isProcessing}
          >
            {isProcessing
              ? "Processing..."
              : "Proceed to Pay →"}
          </button>

          {/* Security */}
          <div className="payment-security">

            <div className="security-line"></div>

            <div className="security-content">
              <span className="security-icon">🔒</span>

              <div>
                <strong>Safe & Secure Payment</strong>
                <p>Your payment information is protected.</p>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Processing Overlay */}
      {isProcessing && (
        <div className="payment-processing-overlay">
          <div className="processing-box">
            <div className="payment-spinner"></div>
            <h3>Processing Payment</h3>
            <p>Please do not close this window.</p>
          </div>
        </div>
      )}

    </div>
  );
};

export default PaymentGateway;